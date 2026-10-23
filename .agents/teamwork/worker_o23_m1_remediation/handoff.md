# Handoff Report — Worker Remediation (Milestone 1)

## 1. Observation
1. **Mutation Guard Bypass Fix in `src/lib/supabaseClient.ts`**:
   - In `masterFetch` (lines 384-397) and `dynamicTenantFetch` (lines 470-484), replaced loose substring checking `!requestUrlStr.includes('/rpc/verify_login')` with strict pathname verification:
     ```ts
     if (!requestUrlStr.split('?')[0].endsWith('/rpc/verify_login'))
     ```
   - Verified via empirical execution:
     ```bash
     npx tsx -e "import assert from 'assert'; import { setServerTenantContext, dynamicTenantFetch } from './src/lib/supabaseClient'; setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' }); async function test() { const r = await dynamicTenantFetch('https://example.com/rest/v1/data?query=/rpc/verify_login', { method: 'POST' }); assert.strictEqual(r.status, 403, 'Should return 403 Forbidden even with bypass param'); console.log('PASS'); } test();"
     ```
     Result: returned HTTP 403 Forbidden with `{"error":"Role dinas_pendidikan is read-only. Data mutation prohibited."}` instead of bypassing the guard (exit code 0).
   - `tests/adversarial_o23_m1_challenger_1.test.ts` Suite 5 probe:
     `[INVESTIGATION] Spoofed query param result status: 403`
     `✓ Mutation guard correctly rejected spoofed URL`

2. **`created_at` Column Removal in `src/components/SuperadminView.tsx`**:
   - At line 129, updated query from `.select('id, username, nama, role, sekolah_id, kota_kabupaten, created_at')` to:
     ```ts
     .select('id, username, nama, role, sekolah_id, kota_kabupaten')
     ```
   - This eliminates the risk of PostgREST HTTP 400 error (`PGRST204: Could not find the 'created_at' column of 'users' in the schema cache`).

3. **`matchingSchoolsCount` Empty String Leak Guard in `src/components/SuperadminView.tsx`**:
   - At line 1970, updated logic to:
     ```ts
     const userRegion = (dinasUser.kota_kabupaten || '').trim().toLowerCase();
     const matchingSchoolsCount = userRegion
       ? satelliteSchools.filter(
           s => (s.kota_kabupaten || '').trim().toLowerCase() === userRegion
         ).length
       : 0;
     ```
   - When `dinasUser.kota_kabupaten` is `null` or unassigned, `matchingSchoolsCount` now evaluates directly to `0` rather than matching unassigned schools via `"" === ""`.

4. **Case-Insensitive Distinct Region Deduplication in `src/components/SuperadminView.tsx`**:
   - At lines 345-356, replaced the JavaScript `Set` implementation with a case-insensitive `Map<string, string>`:
     ```ts
     const getDistinctRegions = () => {
       const regionMap = new Map<string, string>();
       for (const s of satelliteSchools) {
         const trimmed = s.kota_kabupaten?.trim();
         if (trimmed && trimmed.length > 0) {
           const lower = trimmed.toLowerCase();
           if (!regionMap.has(lower)) {
             regionMap.set(lower, trimmed);
           }
         }
       }
       return Array.from(regionMap.values()).sort((a, b) => a.localeCompare(b));
     };
     ```
   - Regions with varying letter casing (e.g., `'Kota Kotamobagu'`, `'kota kotamobagu'`, `'KOTA KOTAMOBAGU'`) are now deduplicated into a single entry in the region dropdown.

5. **Tab Navigation Reset Loop Prevention in `src/components/SuperadminView.tsx`**:
   - In `switchTab`, guarded calling `onNavigateTab` so it does not trigger external routing reset when switching to `tab === 'dinas'`:
     ```ts
     const switchTab = (tab: 'overview' | 'jaringan' | 'dinas') => {
       setActiveTab(tab);
       if (onNavigateTab && tab !== 'dinas') {
         onNavigateTab(tab);
       }
     };
     ```
   - In tab synchronization `useEffect`:
     ```ts
     useEffect(() => {
       const resolvedTab = initialTab === 'jaringan' ? 'jaringan' : initialTab === 'dinas' ? 'dinas' : 'overview';
       if (resolvedTab !== activeTab && (activeTab !== 'dinas' || resolvedTab !== 'overview')) {
         setActiveTab(resolvedTab);
       }
     }, [initialTab, activeTab]);
     ```

6. **PostgreSQL RLS Policies in `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`**:
   - Added `get_auth_dinas_user_region()` helper function resolving caller's assigned region from authenticated user ID (via session token or `x-user-id` header).
   - Added SELECT RLS policy on `public.sekolah` allowing users with role `dinas_pendidikan` to query schools where `lower(trim(public.sekolah.kota_kabupaten)) = lower(trim(public.get_auth_dinas_user_region()))`.
   - Added SELECT RLS policy on `public.sekolah_registry` allowing `dinas_pendidikan` users to query registered satellite schools where `lower(trim(public.sekolah_registry.kota_kabupaten)) = lower(trim(public.get_auth_dinas_user_region()))`.

7. **Reconciled Test Suite `tests/adversarial_superadmin_cleanup_reviewer.test.ts`**:
   - Updated assertions R1-02, R5-01, R6-01, and R6-03 to allow the legitimate `'dinas'` tab and `public.users` queries for `dinas_pendidikan` accounts while continuing to enforce the purge of obsolete local school admin accounts and legacy modals.
   - Result: All 19 tests in `tests/adversarial_superadmin_cleanup_reviewer.test.ts` passed (19 passed, 0 failed).

8. **Comprehensive Quality & Build Verification**:
   - `npx tsc --noEmit`: 0 errors (exit code 0).
   - `npx tsx tests/adversarial_superadmin_dinas_m1.test.ts`: all 6 suites passed.
   - `npx tsx tests/adversarial_o23_m1_challenger_1.test.ts`: 149/149 checks passed.
   - `npm test`: 100% passed (exit code 0).
   - `npm run build`: compiled and built static/dynamic pages with 0 errors (exit code 0).

## 2. Logic Chain
1. By changing `!requestUrlStr.includes('/rpc/verify_login')` to `!requestUrlStr.split('?')[0].endsWith('/rpc/verify_login')` in both `masterFetch` and `dynamicTenantFetch`, any query string appended after `?` is discarded before path comparison. As proven in Observation 1, an attack appending `?query=/rpc/verify_login` is correctly blocked with HTTP 403.
2. In Observation 2, removing `created_at` aligns `SuperadminView`'s query strictly with the actual database schema in `src/types/database.ts`, preventing PostgREST column resolution failures.
3. In Observation 3, checking `userRegion ? filter(...) : 0` prevents false equality matching between empty strings `"" === ""` when a Dinas user has not yet been assigned a region.
4. In Observation 4, using a `Map` keyed by `trimmed.toLowerCase()` ensures unique values are preserved regardless of character casing in the database.
5. In Observation 5, isolating `tab !== 'dinas'` prevents `AppScreen.tsx`'s fallback handler from overriding `activeTab` back to `'overview'`.
6. In Observation 6, `public.sekolah` and `public.sekolah_registry` RLS policies enforce regional scoping at the database level, ensuring database-level data isolation for `dinas_pendidikan`.
7. In Observation 7 and 8, reconciling `tests/adversarial_superadmin_cleanup_reviewer.test.ts` brings the automated test suite back to 100% green without reducing test coverage.

## 3. Caveats
- No caveats. All 4 remediation items specified in the dispatch have been addressed, verified, and confirmed passing.

## 4. Conclusion
Milestone 1 remediation is complete. The codebase passes TypeScript type-checking, all adversarial stress tests, full existing regression tests (`npm test`), and Next.js production build (`npm run build`). All changes adhere to security and minimal-change guidelines.

## 5. Verification Method
To independently verify:
```bash
# 1. Type Checking
npx tsc --noEmit

# 2. Adversarial Dinas & Challenger Tests
npx tsx tests/adversarial_superadmin_dinas_m1.test.ts
npx tsx tests/adversarial_o23_m1_challenger_1.test.ts
npx tsx tests/adversarial_superadmin_cleanup_reviewer.test.ts

# 3. Full Existing Test Suite
npm test

# 4. Production Build
npm run build
```
All commands exit with code 0.
