# Review Report — Milestone 1: RBAC, Data Layer, & Superadmin Regional Assignment

**Verdict**: REQUEST_CHANGES

---

## 1. Observation

1. **Build & Type Checking**:
   - `npx tsc --noEmit` exited with code 0 (zero TypeScript errors).
   - `npm run build` exited with code 0 (successful production build).
2. **Existing Test Suite Execution (`npm test`)**:
   - `npm test` failed with code 1 in `tests/adversarial_superadmin_cleanup_reviewer.test.ts` (15 passed, 4 failed out of 19):
     - `✖ [R1-02] FAIL: activeTab state still types legacy tabs` (expected strictly `'overview' | 'jaringan'`; found `'overview' | 'jaringan' | 'dinas'`).
     - `✖ [R5-01] FAIL: SuperadminViewProps does not strictly constrain tab parameters` (expected `initialTab?: 'overview' | 'jaringan'`; found `initialTab?: 'overview' | 'jaringan' | 'dinas'`).
     - `✖ [R6-01] FAIL: SuperadminView contains active runtime queries referencing public.users table` (queries to `public.users` on lines 128, 429, 550, 595).
     - `✖ [R6-03] FAIL: switchTab function signature allows loose or unconstrained tab string` (expected `(tab: 'overview' | 'jaringan') => void`; found `(tab: 'overview' | 'jaringan' | 'dinas') => void`).
3. **Client-Side Read-Only Mutation Guard**:
   - In `src/lib/supabaseClient.ts:385` and `src/lib/supabaseClient.ts:472`:
     ```ts
     if (roleNorm === 'dinaspendidikan' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
       if (!requestUrlStr.includes('/rpc/verify_login')) {
         return new Response(JSON.stringify({ error: 'Role dinas_pendidikan is read-only. Data mutation prohibited.' }), { status: 403, ... });
       }
     }
     ```
   - Running `dynamicTenantFetch('https://example.com/rest/v1/data', { method: 'POST' })` returns status `403`.
   - Running `dynamicTenantFetch('https://example.com/rest/v1/data?query=/rpc/verify_login', { method: 'POST' })` completely bypasses the 403 guard and returns status `405` (sent to network).
4. **Target School Regional Scoping**:
   - In `src/lib/supabaseClient.ts:198-208`:
     `getActiveTargetSchool()` validates that `targetSchool.kota_kabupaten` matches `user.kota_kabupaten`.
     However, `targetSchool` is deserialized directly from `localStorage.getItem('sipjam_active_target_school')`.
     An attacker setting `{ id: 'foreign-school-id', nama: 'SMK Foreign', kota_kabupaten: 'Kota Kotamobagu' }` in `localStorage` successfully causes `getActiveTargetSchool()` to return `foreign-school-id`, and `dynamicTenantFetch` injects `x-sekolah-id: foreign-school-id`.
5. **Database RLS Policies**:
   - `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql` only updates `users_select_policy` and `verify_login`.
   - `public.sekolah` RLS policy (`sekolah_select_policy` in `20260912_fix_rls_integrity.sql:277`) requires `is_superadmin() OR id = public.get_auth_user_sekolah_id()`.
   - `public.sekolah_registry` RLS policy (`20261016_fix_sekolah_registry_schema_cache.sql:58`) requires `is_superadmin()`.
   - For `dinas_pendidikan` users, `sekolah_id` is `NULL` and `is_superadmin()` is `FALSE`. Consequently, Postgres RLS will return 0 rows for any query to `public.sekolah` or `public.sekolah_registry`.
6. **Integrity Assessment**:
   - No hardcoded test outputs or dummy facade implementations were found. Worker implemented real business logic, state handling, and database integration.

---

## 2. Logic Chain

1. **Security Vulnerability (Mutation Bypass)**:
   - Based on Observation 3, the condition `!requestUrlStr.includes('/rpc/verify_login')` performs an unanchored substring search across the full URL string including query parameters and fragments.
   - Any client request appending `?param=/rpc/verify_login` bypasses the 403 guard. Moreover, once authenticated as `dinas_pendidikan`, a session has no valid reason to execute `/rpc/verify_login`. This represents a high-severity bypass of the read-only requirement.
2. **Security Vulnerability (Regional Isolation & Missing RLS)**:
   - Based on Observation 4 and 5, client-side target school checking trusts the `kota_kabupaten` property in `localStorage` without validating the school ID against a verified registry.
   - More critically, in PostgreSQL, `public.sekolah` and `public.sekolah_registry` have RLS policies restricting SELECT to `is_superadmin()` or `id = public.get_auth_user_sekolah_id()`. Because `dinas_pendidikan` has `sekolah_id IS NULL` and is not `is_superadmin()`, any PostgREST query by a Dinas user to list schools in their region will return empty results under PostgreSQL RLS.
3. **Regression in Existing Automated Test Suite**:
   - Based on Observation 2, `npm test` fails with 4 assertion errors in `tests/adversarial_superadmin_cleanup_reviewer.test.ts`.
   - The project requirements state: *"Seluruh test suite eksisting (npm test) tetap lulus 100%"* and *"Existing automated test suite (npm test) passes with 0 failures"*. Introducing `'dinas'` into `SuperadminView.tsx` without reconciling `adversarial_superadmin_cleanup_reviewer.test.ts` violates this requirement.

---

## 3. Caveats

- TypeScript compilation and Next.js production builds both succeed without errors.
- The UI implementation in `SuperadminView.tsx` for adding, editing, and deleting Dinas Pendidikan accounts is visually well-structured with SweetAlert2 and handles custom region inputs correctly.
- The issues identified are focused on security robustness (URL query bypass and RLS coverage) and test suite compatibility.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 1 cannot be approved in its current state due to two critical security flaws and one test suite regression:

### Critical Findings:
1. **[CRITICAL / SECURITY] Mutation Guard Bypass via Query String**:
   - **Location**: `src/lib/supabaseClient.ts:385` and `src/lib/supabaseClient.ts:472`
   - **Fix**: Remove the `/rpc/verify_login` exemption for active `dinaspendidikan` roles, or strictly test against `new URL(requestUrlStr).pathname.endsWith('/rpc/verify_login')`.
2. **[CRITICAL / SECURITY] Missing RLS Policy for Dinas Pendidikan on Schools**:
   - **Location**: `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`
   - **Fix**: Update RLS policies for `public.sekolah` and `public.sekolah_registry` to allow SELECT for users with role `dinas_pendidikan` where `lower(trim(kota_kabupaten)) = lower(trim(user.kota_kabupaten))`.

### Major Findings:
3. **[MAJOR / REGRESSION] `npm test` Regression in `adversarial_superadmin_cleanup_reviewer.test.ts`**:
   - **Location**: `src/components/SuperadminView.tsx` & `tests/adversarial_superadmin_cleanup_reviewer.test.ts`
   - **Fix**: Reconcile the tab typing and user query expectations in `adversarial_superadmin_cleanup_reviewer.test.ts` so that `npm test` passes 100%.
4. **[MAJOR / SECURITY] Client-Side LocalStorage Region Spoofing**:
   - **Location**: `src/lib/supabaseClient.ts:198-208`
   - **Fix**: Do not trust `school.kota_kabupaten` from localStorage alone without verifying that `school.id` is truly registered in `user.kota_kabupaten`.

---

## 5. Verification Method

1. **Verify TypeScript & Production Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   Both must exit with code 0.
2. **Reproduce Mutation Guard Bypass**:
   ```bash
   npx tsx -e "import assert from 'assert'; import { setServerTenantContext, dynamicTenantFetch } from './src/lib/supabaseClient'; setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' }); async function test() { const r = await dynamicTenantFetch('https://example.com/rest/v1/data?query=/rpc/verify_login', { method: 'POST' }); assert.strictEqual(r.status, 403, 'Should return 403 Forbidden even with bypass param'); console.log('PASS'); } test();"
   ```
   Expected fix: must return 403 instead of 405.
3. **Verify Existing Test Suite**:
   ```bash
   npm test
   ```
   Expected fix: must pass 100% with 0 failures.
