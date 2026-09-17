# Handoff Report — reviewer_m7_2 (Security & Database Review)

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Direct Observations & Evidence Chain

#### Observation 1: Broken Access Control & IDOR in `public.update_user_profile` (CRITICAL)
- **File**: `supabase/migrations/20260917_comprehensive_features.sql`, lines 188–227:
  ```sql
  CREATE OR REPLACE FUNCTION public.update_user_profile(
      p_user_id UUID,
      p_avatar TEXT DEFAULT NULL,
      p_username TEXT DEFAULT NULL,
      p_password TEXT DEFAULT NULL,
      p_nama TEXT DEFAULT NULL
  )
  RETURNS JSON AS $$
  DECLARE
      v_existing_id UUID;
  BEGIN
      -- Verify user exists
      IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
          RETURN json_build_object('success', false, 'message', 'Pengguna tidak ditemukan.');
      END IF;
      ...
      UPDATE public.users
      SET 
          avatar = COALESCE(NULLIF(p_avatar, ''), avatar),
          username = CASE WHEN p_username IS NOT NULL AND p_username <> '' THEN p_username ELSE username END,
          password = CASE WHEN p_password IS NOT NULL AND p_password <> '' THEN p_password ELSE password END,
          nama = CASE WHEN p_nama IS NOT NULL AND p_nama <> '' THEN p_nama ELSE nama END
      WHERE id = p_user_id;

      RETURN json_build_object('success', true, 'message', 'Profil berhasil diperbarui.');
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
  ```
- Line 354:
  ```sql
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
  ```
- **Tool Result**: Executed empirical test in `tests/reviewer_m7_2_security_audit.ts`:
  ```
  🔍 Adversarial Check: Calling update_user_profile with another user's UUID across schools...
  ⚠️ WARNING / FINDING: IDOR / Broken Access Control in update_user_profile -> update_user_profile has NO caller validation! Guru Alpha successfully modified Admin Beta's password across schools!
  🚨 VULNERABILITY CONFIRMED: Arbitrary user password overwrite confirmed in public.users!
  ```
- **Observation Detail**: Because the RPC is `SECURITY DEFINER`, it bypasses RLS on `public.users`. It neither checks `auth.uid() = p_user_id`, nor checks `request.headers ->> 'x-user-id' = p_user_id`, nor requires a current password verification (`p_current_password`), nor restricts execution to `authenticated`. Any unauthenticated or cross-tenant client knowing a UUID can overwrite that user's password and username, resulting in platform-wide account takeover.

---

#### Observation 2: Production Build Failure Due to Node.js Built-in Dependency Leak (`npm run build`) (CRITICAL)
- **Tool Command**: `npm run build`
- **Verbatim Error Output**:
  ```
  ▲ Next.js 16.3.4 (Turbopack)
  Creating an optimized production build ...
  > Build error occurred
  Error: Turbopack build failed with 3 errors:
  ./node_modules/agent-base/dist/index.js:30:26
  Error: Module not found: Can't resolve 'net'
  ./node_modules/https-proxy-agent/dist/index.js:30:26
  Error: Module not found: Can't resolve 'net'
  ./node_modules/https-proxy-agent/dist/index.js:31:26
  Error: Module not found: Can't resolve 'tls'

  Import traces:
    Client Component Browser:
      ./node_modules/web-push/src/index.js [Client Component Browser]
      ./src/lib/vapid.ts [Client Component Browser]
      ./src/lib/pushClient.ts [Client Component Browser]
      ./src/components/AccountSettingsModal.tsx [Client Component Browser]
  ```
- **Observation Detail**: `src/lib/pushClient.ts` line 1 imports `urlBase64ToUint8Array` from `src/lib/vapid.ts`. `src/lib/vapid.ts` line 1 imports `web-push`. Because `src/components/AccountSettingsModal.tsx` is a Client Component (`'use client'`), Turbopack bundles `web-push` for the browser, causing missing module errors for Node's `net` and `tls`. The production build completely fails with exit code 1.

---

#### Observation 3: Plaintext Password Exposure via `users_select_policy` (MAJOR)
- **File**: `supabase/migrations/20260912_fix_rls_integrity.sql`, lines 299–304:
  ```sql
  DROP POLICY IF EXISTS "users_select_policy" ON public.users;
  CREATE POLICY "users_select_policy" ON public.users FOR SELECT
  USING (
      is_superadmin()
      OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
  );
  ```
- **Tool Result**: Executed query with a standard teacher account:
  ```javascript
  s.from('users').select('id, username, password, role').eq('username', 'admin')
  ```
  Returned:
  ```json
  [
    {
      "id": "d23141e4-2116-4946-8094-895ef21a50e5",
      "username": "admin",
      "password": "QWerty1334#",
      "role": "Admin"
    }
  ]
  ```
- **Observation Detail**: Any authenticated teacher or client supplying `x-sekolah-id` can dump the plaintext passwords of all other users in their school, including the school Admin.

---

#### Observation 4: Superadmin Push Subscription Exposure in `push_subscriptions` (MAJOR)
- **File**: `supabase/migrations/20260917_comprehensive_features.sql`, lines 332–348:
  ```sql
  CREATE POLICY "push_subscriptions_tenant_select_policy" ON public.push_subscriptions FOR SELECT
  USING (is_superadmin() OR sekolah_id IS NULL OR sekolah_id = public.get_auth_user_sekolah_id());
  ```
- **Tool Result**: Tested in `tests/reviewer_m7_2_security_audit.ts`:
  Admin Alpha was able to query and retrieve push subscriptions where `sekolah_id IS NULL` (Superadmin's subscription endpoint).
- **Observation Detail**: The clause `OR sekolah_id IS NULL` allows any tenant user or anonymous caller to read, modify, or delete platform-level Superadmin push subscriptions.

---

#### Observation 5: Missing Role Check on `public.wali_kelas` Mutation Policies (MAJOR)
- **File**: `supabase/migrations/20260917_comprehensive_features.sql`, lines 246–258:
  ```sql
  CREATE POLICY "wali_kelas_tenant_insert_policy" ON public.wali_kelas FOR INSERT
  WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

  CREATE POLICY "wali_kelas_tenant_update_policy" ON public.wali_kelas FOR UPDATE
  USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
  WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());
  ```
- **Tool Result**: Tested in `tests/reviewer_m7_2_security_audit.ts`:
  Guru Alpha (`role = 'Guru'`) successfully inserted a homeroom teacher assignment record into `public.wali_kelas` for class `XII-ROGUE`.
- **Observation Detail**: While the UI restricts homeroom assignment to Admin, the database RLS policies only check `sekolah_id`, omitting `public.get_auth_user_role() = 'Admin'`.

---

#### Observation 6: Verified Passing Systems (STRENGTHS)
- **Multi-Tenant Data Isolation**: Verified on `wali_kelas`, `absensi`, `tujuan_pembelajaran`, `asesmen_kolom`, and `nilai_siswa`. Tested across two isolated tenants (School Alpha and School Beta):
  - Cross-tenant SELECT: 0 records leaked.
  - Cross-tenant INSERT: Blocked by RLS `WITH CHECK`.
  - Cross-tenant UPDATE: 0 records altered.
  - Cross-tenant DELETE: 0 records deleted.
- **Trigger `trg_sync_absensi_to_jurnal` & `sync_absensi_to_jurnal()`**:
  - Updating attendance in School Alpha automatically synchronized to School Alpha's journal session for the class and date.
  - Updating attendance in School Alpha had ZERO effect on School Beta's journal session for the exact same class name and date.
  - Special characters (quotes, backslashes) in student NISN were safely escaped by `jsonb_build_object` without JSON syntax errors.
  - Function uses `SECURITY DEFINER SET search_path = public, pg_temp` protecting against search path hijacking.
- **SQL Injection Defense**: All API routes and database functions use parameterized queries and plpgsql variable binding.

---

## 2. Logic Chain

1. **Premise 1 (Integrity & Security Standard)**: A multi-tenant school management system must ensure that users cannot compromise other accounts or escalate privileges, that cross-tenant data is completely isolated, and that the code compiles cleanly in production.
2. **Step 2 (Analysis of `update_user_profile`)**: Based on Observation 1, `public.update_user_profile` executes as `SECURITY DEFINER` with public execute privileges for `anon`. It modifies `password` and `username` for any given `p_user_id` without verifying the caller's identity or requiring the previous password.
3. **Inference 2**: Any caller who knows or guesses a target UUID (e.g. an Admin's UUID) can set the target account's password to an arbitrary string. This allows account takeover of school administrators and platform superadministrators. This is a critical security vulnerability (CWE-639 / CWE-285).
4. **Step 3 (Analysis of `npm run build`)**: Based on Observation 2, `npm run build` fails because `pushClient.ts` imports a helper from `vapid.ts`, which imports `web-push`. `web-push` relies on Node.js core modules (`net`, `tls`), which cannot be bundled into client-side browser bundles.
5. **Inference 3**: The software cannot be deployed or built for production in its current state.
6. **Step 4 (Analysis of `push_subscriptions` policy)**: Based on Observation 4, `sekolah_id IS NULL` is included in the SELECT/UPDATE/DELETE policies for `push_subscriptions`. Because Superadmin records have `sekolah_id = NULL`, any tenant user can read or tamper with Superadmin push subscriptions.
7. **Step 5 (Analysis of `wali_kelas` policies)**: Based on Observation 5, requirement R1 specifies that only Admins assign homeroom teachers. Because the database RLS policy lacks a role check (`role = 'Admin'`), teachers can bypass the UI and mutate `wali_kelas` directly.
8. **Conclusion**: Because of the two Critical findings (arbitrary account takeover via `update_user_profile` and production build failure in `npm run build`) and three Major findings, the work product cannot be approved. The verdict must be **REQUEST_CHANGES**.

---

## 3. Caveats

- **External Push Gateways**: The actual delivery of push notifications over the internet depends on client browsers having active network connectivity to push services (`fcm.googleapis.com`, `push.services.mozilla.com`).
- **Database Extension Deployment**: The migration SQL was evaluated against the active Supabase instance where `public.get_auth_user_sekolah_id()` and `public.is_superadmin()` were deployed in previous migrations.
- **Client Password Validation**: `AccountSettingsModal.tsx` contains client-side password matching logic; however, client-side validation does not protect against direct API calls to the vulnerable database RPC.

---

## 4. Conclusion & Actionable Remediation Plan

### Verdict: **REQUEST_CHANGES**

### Required Action Items:

1. **Harden `public.update_user_profile` RPC (CRITICAL)**:
   - Modify `public.update_user_profile` to enforce that:
     `auth.uid() = p_user_id OR current_setting('request.headers', true)::json->>'x-user-id' = p_user_id::text OR is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_user_id AND u.sekolah_id = public.get_auth_user_sekolah_id()))`
   - When updating `p_password`, require verifying `p_current_password` against the existing password in `public.users`.
   - Revoke public execution: `REVOKE EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;` and grant only to `authenticated, service_role`.

2. **Fix Client/Server Separation for `web-push` to Fix `npm run build` (CRITICAL)**:
   - Move client-safe helper `urlBase64ToUint8Array` out of `src/lib/vapid.ts` and directly into `src/lib/pushClient.ts` (or `src/lib/pushUtils.ts`).
   - Ensure `src/lib/vapid.ts` is only imported by Route Handlers (`src/app/api/push/...`) and never by Client Components.

3. **Remediate `push_subscriptions` RLS Policy (MAJOR)**:
   - Change:
     `USING (is_superadmin() OR (sekolah_id IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id()))`
   - Disallow non-Superadmin users from selecting or mutating rows where `sekolah_id IS NULL`.

4. **Harden `wali_kelas` RLS Policies (MAJOR)**:
   - Enforce Admin role check on INSERT, UPDATE, and DELETE:
     `WITH CHECK (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id()))`

5. **Protect Plaintext Passwords in `public.users` (MAJOR)**:
   - Introduce a PostgreSQL VIEW or column masking so that regular tenant SELECT queries on `public.users` do not return the `password` column, or restrict `password` column access to the user themselves.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Production Build Failure**:
   ```powershell
   npm run build
   ```
   *Expected result*: Exits with code 1 due to `Can't resolve 'net'` and `Can't resolve 'tls'` traced to `pushClient.ts -> vapid.ts -> web-push`.

2. **Verify TypeScript Typechecks**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exits with code 0 (all TypeScript types are internally consistent).

3. **Verify Empirical Multi-Tenant Isolation & IDOR Vulnerability**:
   ```powershell
   npx tsx tests/reviewer_m7_2_security_audit.ts
   ```
   *Expected result*:
   - Passes all 37 multi-tenant isolation and trigger checks.
   - Emits confirmation of `IDOR / Broken Access Control in update_user_profile`.
   - Emits confirmation of `push_subscriptions Policy Allows Reading NULL sekolah_id`.
   - Emits confirmation of `wali_kelas Insert Policy Lacks Role Check`.

4. **Verify Attendance Sync**:
   ```powershell
   npx tsx scripts/test-attendance-sync.ts
   ```
   *Expected result*: Exits with code 0.
