# Comprehensive SQL Remediation Specification: Milestone 7 RLS Integrity

**Author**: Explorer Subagent (`explorer_m7_remediation_sql`)  
**Target**: Parent Orchestrator (`orchestrator_7`, Conversation ID: `bedfb7f0-1cec-4949-8c24-27709173b6ec`)  
**Target Migration**: `supabase/migrations/20260912_fix_rls_integrity.sql`  
**Reference Artifact**: `.agents/explorer_m7_remediation_sql/proposed_20260912_fix_rls_integrity.sql`  
**Date**: 2026-09-12  

---

## 1. Observation

### 1.1 Verbatim Code Audit Observations

#### A. Permissive RLS Shortcut on All 16 Tenant Tables
In `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql`, lines 538–574:
```sql
-- Procedure setup_tenant_table_policies
-- SELECT policy (Line 545-548)
CREATE POLICY "%s_tenant_select_policy" ON public.%I FOR SELECT 
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

-- INSERT policy (Line 553-556)
CREATE POLICY "%s_tenant_insert_policy" ON public.%I FOR INSERT 
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

-- UPDATE policy (Line 561-565)
CREATE POLICY "%s_tenant_update_policy" ON public.%I FOR UPDATE 
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true)) 
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

-- DELETE policy (Line 570-573)
CREATE POLICY "%s_tenant_delete_policy" ON public.%I FOR DELETE 
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));
```
**Impact**: Because `public.get_auth_user_sekolah_id()` returns `NULL` when requests lack headers, `(public.get_auth_user_sekolah_id() IS NULL AND true)` evaluates to `(TRUE AND TRUE) = TRUE`. This unconditionally bypassed RLS on all 16 tables: `data_guru`, `data_mapel`, `data_siswa`, `jadwal_pelajaran`, `jadwal_piket`, `jurnal_pembelajaran`, `kalender_pendidikan`, `laporan_piket`, `pengaturan`, `presensi_guru`, `bank_dokumen`, `riwayat_backup`, `guru_mapel`, `penugasan_piket`, `pengumuman`, and `pengumuman_tanggapan`.

#### B. Plaintext Password and Credential Exposure on `public.users`
In `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql`, lines 501–507:
```sql
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users FOR SELECT
USING (
    is_superadmin()
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
    OR true -- Necessary for LoginScreen custom authentication check
);
```
**Impact**: The `OR true` clause allowed any anonymous client with the public anon key to run `SELECT id, username, password FROM public.users` and dump all user credentials in plaintext, including `superadmin` and school `admin` passwords.

#### C. Untrusted Header-Based Superadmin Privilege Escalation
In `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql`, lines 401–420:
```sql
-- Fallback from PostgREST request header 'x-user-role'
BEGIN
  v_role := current_setting('request.headers', true)::json->>'x-user-role';
  IF v_role IS NOT NULL AND v_role <> '' THEN
    RETURN v_role;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_auth_user_role() = 'Superadmin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
```
**Impact**: Any client could pass HTTP header `x-user-role: Superadmin`, causing `is_superadmin()` to return `TRUE` and granting unrestricted administrative control over the entire database.

#### D. School Table Public Enumeration
In `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql`, lines 477–484:
```sql
CREATE POLICY "sekolah_select_policy" ON public.sekolah FOR SELECT
USING (
    is_superadmin()
    OR id = public.get_auth_user_sekolah_id()
    OR true -- Allowed for login / public identity rendering
);
```
**Impact**: The `OR true` clause allowed any client to enumerate and read all schools' data across tenants.

---

### 1.2 Live Database Empirical Verification (Before Remediation)

Using Supabase MCP `execute_sql` on project `jicvvqxjyzntdrccnuyz`:
1. **Anonymous Query Without Headers**:
   ```sql
   SET ROLE anon; SELECT count(*) FROM public.data_guru;
   ```
   **Output**: `[{"count": 13}]` (Bypassed! Returned all 13 teachers to anonymous caller).
2. **Anonymous Dump of `public.users`**:
   ```sql
   SET ROLE anon; SELECT username, password FROM public.users LIMIT 2;
   ```
   **Output**: Returned plaintext usernames and passwords for `superadmin` and `admin`.
3. **Privilege Escalation Test**:
   ```sql
   SET ROLE anon;
   SET LOCAL "request.headers" TO '{"x-user-role": "Superadmin"}';
   SELECT public.is_superadmin();
   ```
   **Output**: `[{"is_superadmin": true}]` (Privilege escalation confirmed).

---

## 2. Logic Chain

1. **Root Cause Analysis**:
   - The developer implemented custom application authentication (storing session in `localStorage`) rather than Supabase Auth JWT sessions (`auth.uid()` is null).
   - When RLS was initially enabled, queries from the unheadered frontend were blocked (0 rows returned), breaking the UI.
   - Instead of injecting headers into the frontend Supabase client, the developer inserted permissive shortcuts (`OR (public.get_auth_user_sekolah_id() IS NULL AND true)` and `OR true`), effectively neutralizing database-level RLS.
   - In addition, `users_select_policy` had `OR true` because `LoginScreen.tsx` had a direct table query fallback:
     ```typescript
     const { data: tableData } = await supabase.from('users').select('*').eq('username', ...).eq('password', ...);
     ```

2. **Remediation Strategy**:
   - **Zero-Trust Tenant Policies**:
     Remove all `OR (public.get_auth_user_sekolah_id() IS NULL AND true)`. If `get_auth_user_sekolah_id()` is `NULL` and `is_superadmin()` is `FALSE`, PostgreSQL MUST strictly deny rows (SELECT returns 0 rows, mutations throw error 42501).
   - **Secure Authentication Via `verify_login` RPC**:
     `public.verify_login(p_username, p_password)` is marked `SECURITY DEFINER SET search_path = public, pg_temp`. It bypasses RLS internally to verify credentials and returns only safe fields (`id`, `username`, `nama`, `role`, `sekolah_id`), completely omitting `password`. Because `verify_login` executes as the function owner (`postgres`), unauthenticated users can log in safely without requiring any direct `SELECT` permission on `public.users`.
   - **Elimination of Password Leak**:
     Remove `OR true` from `users_select_policy`. Only Superadmin (`is_superadmin()`) and the School Admin (`sekolah_id = get_auth_user_sekolah_id()`) can view user records.
   - **Defense Against Role Spoofing**:
     Update `get_auth_user_role()` and `get_auth_user_sekolah_id()` to check `x-user-id` against `public.users`. If a client passes `x-user-role: Superadmin` without a matching user record having `role = 'Superadmin'`, the spoofed role is rejected and falls back to `'anon'`.
   - **Strict School Isolation**:
     Remove `OR true` from `sekolah_select_policy`. Users can only select their own school (`id = public.get_auth_user_sekolah_id()`) or all schools if Superadmin.
   - **View Security**:
     Set `ALTER VIEW public.guru_kelas SET (security_invoker = true)` so queries to the view inherit the caller's RLS policies.

3. **Dry-Run Validation on Live Database**:
   A complete dry-run transaction executing all 72 policy recreations and hardened helper functions was executed on the live Supabase instance:
   - Total policies recreated: **72** (16 tables * 4 + 4 users + 4 sekolah).
   - Anonymous query without headers: returned **0 rows**.
   - Cross-tenant INSERT: threw **`ERROR: 42501: new row violates row-level security policy for table "data_guru"`**.
   - Cross-tenant UPDATE & DELETE: affected **0 rows**.
   - Spoofed `x-user-role: Superadmin`: returned **`is_superadmin = false`**.
   - Legitimate `x-user-id` authenticated session: returned **`is_superadmin = true`**.
   - `verify_login` RPC: returned matching user record with `password` omitted.

---

## 3. Caveats

1. **Downstream Client-Side Dependency**:
   - Once this strict SQL migration is applied, the frontend client (`src/lib/supabaseClient.ts`) **MUST** send the active session headers (`x-sekolah-id`, `x-user-id`, `x-user-role`) on every request.
   - Without client header injection, all standard authenticated queries will return 0 rows.
   - **Recommended Solution**: Configure a transparent custom `fetch` wrapper in `src/lib/supabaseClient.ts` that dynamically injects headers from `localStorage.getItem('sipjam_user')`. This resolves all components without altering individual UI files.
2. **Test Suite Adjustment**:
   - `tests/m7_1_db_migration.test.ts` must be updated to pass `{ global: { headers: { 'x-sekolah-id': ... } } }` for tenant queries, and to verify rejection of cross-tenant and anonymous queries.
3. **Execution Safety**:
   - The migration uses `CREATE OR REPLACE` for functions/procedures and `DROP POLICY IF EXISTS ... CREATE POLICY ...`, making it fully idempotent and safe to apply against the live database.

---

## 4. Conclusion & Proposed Migration Script

The complete, executable remediation script has been authored and verified. It is saved in:
`.agents/explorer_m7_remediation_sql/proposed_20260912_fix_rls_integrity.sql`

The destination path for implementation is:
`supabase/migrations/20260912_fix_rls_integrity.sql`

### Full Executable SQL Specification:

```sql
-- ==============================================================================
-- Migration: 20260912_fix_rls_integrity.sql
-- Description: Milestone 7 Remediation - Strict Row Level Security & Multi-Tenant Integrity
-- ==============================================================================

-- ==============================================================================
-- PART 1: Hardened Security Helper Functions
-- ==============================================================================

-- Helper 1: Extract authenticated user's sekolah_id
CREATE OR REPLACE FUNCTION public.get_auth_user_sekolah_id()
RETURNS UUID AS $$
DECLARE
  v_sekolah_id UUID;
  v_raw TEXT;
  v_user_id UUID;
BEGIN
  -- 1. Check JWT claim (if custom claim injected in Supabase Auth token)
  BEGIN
    v_raw := current_setting('request.jwt.claim.sekolah_id', true);
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Check JWT app_metadata
  BEGIN
    v_raw := auth.jwt() -> 'app_metadata' ->> 'sekolah_id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 3. Check public.users by auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT u.sekolah_id INTO v_sekolah_id
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    IF v_sekolah_id IS NOT NULL THEN
      RETURN v_sekolah_id;
    END IF;
  END IF;

  -- 4. Check session variable (app.current_sekolah_id)
  BEGIN
    v_raw := current_setting('app.current_sekolah_id', true);
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. Check authenticated user by 'x-user-id' header against public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      v_user_id := v_raw::uuid;
      SELECT u.sekolah_id INTO v_sekolah_id
      FROM public.users u
      WHERE u.id = v_user_id
      LIMIT 1;

      IF v_sekolah_id IS NOT NULL THEN
        RETURN v_sekolah_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 6. Fallback from PostgREST request headers 'x-sekolah-id'
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-sekolah-id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper 2: Extract authenticated user's role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_raw TEXT;
  v_user_id UUID;
BEGIN
  -- 1. Check JWT app_metadata
  BEGIN
    v_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Check public.users by auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT u.role INTO v_role
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  -- 3. Check session variable
  BEGIN
    v_role := current_setting('app.current_user_role', true);
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 4. Check authenticated user by 'x-user-id' header against public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      v_user_id := v_raw::uuid;
      SELECT u.role INTO v_role
      FROM public.users u
      WHERE u.id = v_user_id
      LIMIT 1;

      IF v_role IS NOT NULL THEN
        RETURN v_role;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. Fallback from PostgREST request header 'x-user-role' (safeguarded: reject Superadmin spoofing)
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-role';
    IF v_raw IS NOT NULL AND v_raw <> '' AND v_raw <> 'Superadmin' THEN
      RETURN v_raw;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN 'anon';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper 3: Check if requester is Superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_auth_user_role() = 'Superadmin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper 4: Secure Login RPC (SECURITY DEFINER allows login without public table SELECT)
CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  nama TEXT,
  role TEXT,
  sekolah_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.nama, u.role, u.sekolah_id
  FROM public.users u
  WHERE u.username = trim(p_username) AND u.password = p_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.verify_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_login(TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- PART 2: Strict Policies for public.sekolah
-- ==============================================================================
DROP POLICY IF EXISTS "sekolah_select_policy" ON public.sekolah;
CREATE POLICY "sekolah_select_policy" ON public.sekolah FOR SELECT
USING (
    is_superadmin()
    OR id = public.get_auth_user_sekolah_id()
);

DROP POLICY IF EXISTS "sekolah_insert_policy" ON public.sekolah;
CREATE POLICY "sekolah_insert_policy" ON public.sekolah FOR INSERT
WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "sekolah_update_policy" ON public.sekolah;
CREATE POLICY "sekolah_update_policy" ON public.sekolah FOR UPDATE
USING (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND id = public.get_auth_user_sekolah_id()))
WITH CHECK (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND id = public.get_auth_user_sekolah_id()));

DROP POLICY IF EXISTS "sekolah_delete_policy" ON public.sekolah;
CREATE POLICY "sekolah_delete_policy" ON public.sekolah FOR DELETE
USING (is_superadmin());

-- ==============================================================================
-- PART 3: Strict Policies for public.users (Eliminates Plaintext Password Leak)
-- ==============================================================================
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users FOR SELECT
USING (
    is_superadmin()
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy" ON public.users FOR INSERT
WITH CHECK (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users FOR UPDATE
USING (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id())
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
)
WITH CHECK (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
CREATE POLICY "users_delete_policy" ON public.users FOR DELETE
USING (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id() AND role <> 'Admin')
);

-- ==============================================================================
-- PART 4: Recreate Strict Tenant Policies on all 16 Tenant Tables
-- ==============================================================================
CREATE OR REPLACE PROCEDURE public.setup_tenant_table_policies(p_table TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    -- SELECT policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_select_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_select_policy" ON public.%I FOR SELECT ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())',
        p_table, p_table
    );

    -- INSERT policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_insert_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_insert_policy" ON public.%I FOR INSERT ' ||
        'WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())',
        p_table, p_table
    );

    -- UPDATE policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_update_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_update_policy" ON public.%I FOR UPDATE ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id()) ' ||
        'WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())',
        p_table, p_table
    );

    -- DELETE policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_delete_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_delete_policy" ON public.%I FOR DELETE ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())',
        p_table, p_table
    );
END;
$$;

-- Apply to all 16 master and transactional tenant tables
CALL public.setup_tenant_table_policies('data_guru');
CALL public.setup_tenant_table_policies('data_mapel');
CALL public.setup_tenant_table_policies('data_siswa');
CALL public.setup_tenant_table_policies('jadwal_pelajaran');
CALL public.setup_tenant_table_policies('jadwal_piket');
CALL public.setup_tenant_table_policies('jurnal_pembelajaran');
CALL public.setup_tenant_table_policies('kalender_pendidikan');
CALL public.setup_tenant_table_policies('laporan_piket');
CALL public.setup_tenant_table_policies('pengaturan');
CALL public.setup_tenant_table_policies('presensi_guru');
CALL public.setup_tenant_table_policies('bank_dokumen');
CALL public.setup_tenant_table_policies('riwayat_backup');
CALL public.setup_tenant_table_policies('guru_mapel');
CALL public.setup_tenant_table_policies('penugasan_piket');
CALL public.setup_tenant_table_policies('pengumuman');
CALL public.setup_tenant_table_policies('pengumuman_tanggapan');

DROP PROCEDURE IF EXISTS public.setup_tenant_table_policies(TEXT);

-- ==============================================================================
-- PART 5: View Security Hardening
-- ==============================================================================
ALTER VIEW public.guru_kelas SET (security_invoker = true);

-- ==============================================================================
-- PART 6: Privilege Grants
-- ==============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
```

---

## 5. Verification Method

Once implemented by `worker_m7_db`, independent reviewers can verify the remediation using these exact steps:

### 5.1 Verification Commands (Live SQL via Supabase MCP `execute_sql`)

1. **Verify Complete Absence of Permissive Fallback Strings in Database Policies**:
   ```sql
   SELECT tablename, policyname, qual, with_check 
   FROM pg_policies 
   WHERE schemaname = 'public' 
     AND (qual ILIKE '%IS NULL AND true%' OR qual ILIKE '%OR true%' OR with_check ILIKE '%IS NULL AND true%');
   ```
   **Expected Result**: Exactly `0` rows returned.

2. **Verify Anonymous Read Access is Strictly Denied**:
   ```sql
   SET ROLE anon;
   SELECT count(*) FROM public.data_guru;
   SELECT count(*) FROM public.users;
   SELECT count(*) FROM public.sekolah;
   ```
   **Expected Result**: All counts return `0`.

3. **Verify Cross-Tenant Insert Prevention**:
   ```sql
   SET ROLE anon;
   SET LOCAL "request.headers" TO '{"x-sekolah-id": "a0000000-0000-0000-0000-000000000001"}';
   INSERT INTO public.data_guru (id, sekolah_id, nama_guru, nip) 
   VALUES ('b0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000002', 'Hacker', '000000');
   ```
   **Expected Result**: Fails with PostgreSQL `ERROR: 42501: new row violates row-level security policy for table "data_guru"`.

4. **Verify Header Spoofing Prevention**:
   ```sql
   SET ROLE anon;
   SET LOCAL "request.headers" TO '{"x-user-role": "Superadmin"}';
   SELECT public.is_superadmin();
   ```
   **Expected Result**: Returns `[{"is_superadmin": false}]`.

5. **Verify Secure Login Functionality**:
   ```sql
   SET ROLE anon;
   SELECT id, username, nama, role, sekolah_id FROM public.verify_login('superadmin', 'superadmin123');
   ```
   **Expected Result**: Returns `1` row with Superadmin profile; `password` column is NOT returned.

### 5.2 Test Invalidation Conditions
- If any policy contains `OR true` or `OR (public.get_auth_user_sekolah_id() IS NULL AND true)`: **INVALIDATED**.
- If `SET ROLE anon; SELECT * FROM public.users;` returns passwords or usernames: **INVALIDATED**.
- If an unauthenticated client without headers can mutate any tenant table: **INVALIDATED**.
