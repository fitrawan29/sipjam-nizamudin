# Handoff Report — Challenger 2 (Milestone 1)
**Verdict**: **REQUEST_CHANGES**

## 1. Observation

1. **Non-existent Column `created_at` in PostgREST Query**:
   - In `src/components/SuperadminView.tsx:127-132`:
     ```ts
     const { data, error } = await masterSupabase
       .from('users')
       .select('id, username, nama, role, sekolah_id, kota_kabupaten, created_at')
       .ilike('role', '%dinas%')
       .order('nama', { ascending: true });
     ```
   - In `src/types/database.ts:1640-1650` (and PostgreSQL schema across all migrations):
     ```ts
     Row: {
       avatar: string | null
       id: string
       kota_kabupaten: string | null
       nama: string | null
       password: string | null
       role: string | null
       sekolah_id: string | null
       session_token: string | null
       username: string | null
     }
     ```
     The `public.users` table does NOT contain a `created_at` column. `created_at` is not used in the UI rendering in `SuperadminView.tsx:1950-2035`.
   - Result: In live Supabase PostgREST execution, querying an unknown column triggers HTTP 400 (`PGRST204: Could not find the 'created_at' column of 'users' in the schema cache`), causing `fetchDinasUsers()` to fail and leave `dinasUsers` empty.

2. **Unassigned Dinas User School Count Leak (Empty String Match)**:
   - In `src/components/SuperadminView.tsx:1967-1970`:
     ```ts
     const userRegion = (dinasUser.kota_kabupaten || '').trim().toLowerCase();
     const matchingSchoolsCount = satelliteSchools.filter(
       s => (s.kota_kabupaten || '').trim().toLowerCase() === userRegion
     ).length;
     ```
   - Empirical test execution in `tests/adversarial_superadmin_dinas_m1.test.ts` (Suite 4):
     When `dinasUser.kota_kabupaten` is `null` (unassigned user: "Belum Ditugaskan"), `userRegion` is `""`. For any school in `satelliteSchools` that has `null` or `""` for `kota_kabupaten`, `(s.kota_kabupaten || '').trim().toLowerCase()` is also `""`. The expression `"" === ""` evaluates to `true`.
     As verified in `adversarial_superadmin_dinas_m1.test.ts`, matching returned `2` instead of `0`.
   - Result: In the Superadmin table, an unassigned dinas user is displayed as having schools under their jurisdiction ("N Sekolah") rather than "0 Sekolah".

3. **Case-Sensitive Duplicate Regions in Dropdown**:
   - In `src/components/SuperadminView.tsx:345-353`:
     ```ts
     const getDistinctRegions = () => {
       return Array.from(
         new Set(
           satelliteSchools
             .map(s => s.kota_kabupaten?.trim())
             .filter((r): r is string => Boolean(r && r.length > 0))
         )
       ).sort((a, b) => a.localeCompare(b));
     };
     ```
   - Empirical test execution in `tests/adversarial_superadmin_dinas_m1.test.ts` (Suite 3):
     For schools with `['Kota Kotamobagu', 'kota kotamobagu', 'KOTA KOTAMOBAGU']`, `new Set` does not deduplicate because `Set` performs strict case-sensitive identity checks.
     Result: `getDistinctRegions()` returned `['KOTA KOTAMOBAGU', 'Kota Kotamobagu', 'kota kotamobagu']`, causing duplicate entries in the region dropdown.

4. **AppScreen Navigation Reset Loop with Tab `'dinas'`**:
   - In `src/components/AppScreen.tsx:741-748`:
     ```tsx
     onNavigateTab={(tab) => {
       if (tab === 'jaringan') {
         window.history.pushState(null, '', '?view=view-superadmin-jaringan');
         setCurrentView('view-superadmin-jaringan');
       } else {
         window.history.pushState(null, '', '?view=view-superadmin-overview');
         setCurrentView('view-superadmin-overview');
       }
     }}
     ```
   - When Superadmin clicks "Akun Dinas Pendidikan", `SuperadminView` calls `onNavigateTab('dinas')`. In `AppScreen.tsx`, since `tab !== 'jaringan'`, it falls into `else` and triggers `setCurrentView('view-superadmin-overview')`, passing `initialTab: 'overview'`. `SuperadminView`'s `useEffect([initialTab])` detects `resolvedTab !== activeTab` and immediately resets `activeTab` back to `'overview'`.
   - Result: Clicking the tab resets the UI back to Overview. (Note: `AppScreen.tsx` is scheduled for Milestone 2, but this contract mismatch must be remediated or coordinated).

5. **Type Safety & Empirical Test Pass**:
   - `npx tsc --noEmit` exited with code 0.
   - `tests/adversarial_superadmin_dinas_m1.test.ts` ran with `npx tsx` and all 6 suites passed.
   - `tests/adversarial_o23_m1_challenger_1.test.ts` passed 149/149 checks.

## 2. Logic Chain

1. From Observation 1, `masterSupabase` is instantiated without generic database types (`SupabaseClient` instead of `SupabaseClient<Database>`). Therefore, TypeScript does not catch the inclusion of `created_at` in the query string. In PostgreSQL / PostgREST, selecting a non-existent column causes a 400 Bad Request error (`PGRST204`). Because `created_at` does not exist on `users`, `fetchDinasUsers()` will fail in production.
2. From Observation 2, `userRegion` defaults to `""` for null or empty `kota_kabupaten`. When comparing against `satelliteSchools`, any school whose `kota_kabupaten` is also null or empty matches on `"" === ""`. This causes unassigned dinas accounts to display an incorrect non-zero school count.
3. From Observation 3, JavaScript `Set` is case-sensitive. While `.trim()` cleans whitespace, casing differences like `"Kota Kotamobagu"` vs `"kota kotamobagu"` are not deduplicated, producing duplicate options in the dropdown.
4. From Observation 4, `AppScreen.tsx` currently only handles `tab === 'jaringan'`, routing all other tabs to `'overview'`. This triggers an instant tab reset cycle whenever `onNavigateTab('dinas')` fires.
5. Therefore, changes are requested to remediate Observation 1, 2, and 3 in `SuperadminView.tsx` before advancing to Milestone 2.

## 3. Caveats

- `tests/adversarial_superadmin_cleanup_reviewer.test.ts` fails because it was written for an older requirement that asserted `SuperadminView` strictly only has 2 tabs (`'overview' | 'jaringan'`) and zero queries to `public.users`. The new requirement explicitly mandates adding the 3rd tab `'dinas'` and managing dinas users in `public.users`. This test will need updating or archiving during test consolidation.
- `AppScreen.tsx` is formally assigned to Milestone 2 according to `PROJECT.md`. However, updating `onNavigateTab` in `AppScreen.tsx` or making `SuperadminView.tsx` resilient against unhandled tab callbacks will prevent broken tab navigation.

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

Required changes in `src/components/SuperadminView.tsx`:
1. **Remove `created_at` from `.select()`**: Change line 129 in `SuperadminView.tsx` to:
   ```ts
   .select('id, username, nama, role, sekolah_id, kota_kabupaten')
   ```
2. **Fix `matchingSchoolsCount` empty string leak**: Change line 1968 in `SuperadminView.tsx` to:
   ```ts
   const userRegion = (dinasUser.kota_kabupaten || '').trim().toLowerCase();
   const matchingSchoolsCount = userRegion
     ? satelliteSchools.filter(
         s => (s.kota_kabupaten || '').trim().toLowerCase() === userRegion
       ).length
     : 0;
   ```
3. **Case-insensitive deduplication for `getDistinctRegions`**: Change lines 345-353 in `SuperadminView.tsx` to use case-insensitive map deduplication:
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

## 5. Verification Method

1. Run the empirical adversarial stress test:
   ```bash
   npx tsx tests/adversarial_superadmin_dinas_m1.test.ts
   ```
   Expected: All 6 suites pass without errors.
2. Run TypeScript check:
   ```bash
   npx tsc --noEmit
   ```
   Expected: Exit code 0, 0 errors.
3. Verify that querying `users` table via `select('id, username, nama, role, sekolah_id, kota_kabupaten')` succeeds without column errors.
