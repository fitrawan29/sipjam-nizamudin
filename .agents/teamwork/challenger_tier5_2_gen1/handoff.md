# Challenger 2 Handoff Report: Tier 5 Adversarial Coverage Hardening

## 1. Observation

### Verification Commands & Results
- `npx tsx tests/adversarial_tier5_lifecycle_scoping_challenger_2.test.ts`:
  ```
  ▶ Area 1: URL Aliasing & Boundary Parameter Stress (9 tests, 2.65ms) - PASSED
  ▶ Area 2: Cross-Tenant & Regional Scoping (7 tests, 2.67ms) - PASSED
  ▶ Area 3: Rapid State Transitions & Asynchronous Race Conditions (4 tests, 0.84ms) - PASSED
  ▶ Area 4: Automated Tour & DOM Spotlight Alignment (4 tests, 0.88ms) - PASSED
  ℹ tests 24 | pass 24 | fail 0 | duration_ms 17.78ms
  ```
- `npx tsx tests/navigation_consolidation_verification.test.ts`:
  ```
  Total Test Assertions Executed : 150
  Passed                         : 150
  Failed                         : 0
  Pass Rate                      : 100.0%
  VERDICT: PASS - 100% OF ASSERTIONS PASSED (Tiers 1-4 Complete)!
  ```
- `npx tsc --noEmit`: Exited with code 0 (zero type errors).
- `npm test`: Exited with code 0 (all 41 test suites passed).

### Concrete Code Observations & Empirical Findings

1. **Unpartitioned Journal Draft Key**:
   - `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md` Line 644 specifies:
     > "- **Draf Jurnal KBM:** Dipartisi per ID guru dan sekolah: `sipjam_jurnal_autosave_${user.id}_${user.sekolah_id}` (bukan global `sipjam_jurnal_autosave`)."
   - `PROJECT.md` Line 15 specifies:
     > "- Partitioned `localStorage` keys using `${userId}_${sekolahId}` to prevent cross-tenant cache bleeding."
   - However, in `src/utils/draftStorage.ts` Line 6:
     ```ts
     export const JURNAL_DRAFT_KEY = 'sipjam_jurnal_autosave';
     ```
   - And in `src/components/GuruJurnal.tsx` Lines 200, 262, 270:
     ```ts
     const saved = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('sipjam_jurnal_autosave') : null;
     localStorage.setItem('sipjam_jurnal_autosave', JSON.stringify(draft));
     localStorage.removeItem('sipjam_jurnal_autosave');
     ```
   - While Gradebook drafts are properly partitioned via `getGradebookDraftKey(sekolahId, mapel, kelas, tpId)`, KBM Journal autosaves are stored in a global static key.

2. **Dinas Satellite School Filter Leak for Unassigned Region**:
   - In `src/components/ClaySidebar.tsx` Lines 95-99:
     ```tsx
     const availableSchools = isDinas
       ? satelliteSchools.filter((s) => {
           const userRegion = (user?.kota_kabupaten || '').trim().toLowerCase();
           const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
           return userRegion && schoolRegion && userRegion === schoolRegion;
         })
       : satelliteSchools;
     ```
   - In `src/components/AppScreen.tsx` Line 683 and Line 817:
     ```tsx
     (isDinas
       ? satelliteSchools.filter(s => (s.kota_kabupaten || '').trim().toLowerCase() === (user?.kota_kabupaten || '').trim().toLowerCase())
       : satelliteSchools
     )
     ```
   - If an unassigned Dinas user has `user.kota_kabupaten = null` (evaluating to `""`), any satellite school that also has `s.kota_kabupaten = null` evaluates `"" === ""`, leaking unassigned schools to unassigned Dinas users in the AppScreen header and mobile dropdown.

3. **Pre-Trim Order in Literal Null Check**:
   - In `src/lib/navigation.ts` Lines 48-53:
     ```ts
     export function resolveCanonicalRoute(rawView: string | null | undefined, rawTab?: string | null): RouteResolution {
       if (!rawView || rawView.trim() === '' || rawView === 'undefined' || rawView === 'null') {
         return { canonicalView: 'view-home', isLegacyAlias: false };
       }
       const cleanView = rawView.trim();
     ```
   - When an adversarial URL contains padded literal `"   null   "`, `rawView === 'null'` evaluates to `false` because the untrimmed string has leading/trailing spaces. `cleanView` becomes `"null"`, returning `{ canonicalView: 'null', defaultTab: undefined, isLegacyAlias: false }` instead of falling back to `'view-home'`.

4. **Trailing Slash on Alias URLs**:
   - Visiting `?view=view-rapor/` results in `cleanView = 'view-rapor/'`, which is not an exact key in `VIEW_ALIASES`. The route falls through to unrecognized rather than auto-resolving to `view-gradebook&tab=rapor`.

5. **Robust Invariants Verified**:
   - All 8 legacy aliases resolve accurately to their canonical views and default sub-tabs.
   - SQL injection, XSS, and buffer overflow payloads in `view` and `tab` parameters do not crash the app or execute dangerous code.
   - 100 rapid tab-switch cycles preserve form dirty states across both `GuruJurnal` and `GradebookView`.
   - Realtime channel cleanup in both `RekapSiswaView` (`realtime-presensi-siswa-${sekolahId}-${gerbangKelas}`) and `AppScreen` (`school-config-${schoolId}`) unsubscribes cleanly upon unmount and parameter changes.
   - Tour DOM selectors (`[data-tour~="..."]`) align across all 7 roles, and missing conditional elements (such as `view-piket` for non-duty teachers) are handled gracefully by centering the spotlight card with `targetRect = null`.

---

## 2. Logic Chain

1. **From Observation 1 to Cross-Tenant Draft Isolation Risk**:
   - Specification in `PROJECT.md` and `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md` specifically requires partitioned localStorage keys `sipjam_jurnal_autosave_${user.id}_${user.sekolah_id}`.
   - Direct inspection of `GuruJurnal.tsx` and `draftStorage.ts` confirms the storage key is static string `'sipjam_jurnal_autosave'`.
   - When Teacher A at School 1 drafts a journal and closes the browser on a shared computer, Teacher B at School 2 logging into the same browser will read Teacher A's draft on mount (`localStorage.getItem('sipjam_jurnal_autosave')`), causing cross-tenant and cross-user data bleeding on shared devices.

2. **From Observation 2 to Scoping Inconsistency**:
   - `ClaySidebar.tsx` properly guards with `userRegion && schoolRegion && userRegion === schoolRegion`.
   - `AppScreen.tsx` omits the truthiness check for `userRegion` and `schoolRegion`, comparing `"" === ""` for unassigned entities.
   - Consequently, an unassigned Dinas user sees unassigned satellite schools in the header switcher despite having no assigned district.

3. **From Observation 3 to URL Routing Sanitization**:
   - `rawView === 'null'` is checked before `rawView.trim()`.
   - URL encoding often pads parameters (e.g. `%20null%20`).
   - The failure to trim before checking literal string representations causes `resolveCanonicalRoute` to return `'null'` as the view ID, leaving the screen blank.

---

## 3. Caveats

- Physical camera and GPS hardware permissions on native Android/iOS mobile devices during rapid view transitions were tested via simulated software mocks rather than on physical hardware.
- Supabase realtime network disconnects were simulated via mock WebSocket unsubscribe callbacks.

---

## 4. Conclusion

- **Overall Status**: **Gaps found (3 Actionable Gaps identified & verified empirically)**:
  1. `[HIGH]` `GuruJurnal.tsx` & `draftStorage.ts`: KBM journal draft key is unpartitioned (`sipjam_jurnal_autosave` vs `sipjam_jurnal_autosave_${userId}_${sekolahId}`).
  2. `[HIGH]` `AppScreen.tsx`: Satellite school filter allows unassigned Dinas users to see unassigned schools (`"" === ""`).
  3. `[MEDIUM]` `src/lib/navigation.ts`: `resolveCanonicalRoute` checks literal `'null'` and `'undefined'` before trimming.
- **Robustness Status**: The core navigation consolidation architecture (all 8 legacy aliases, AST data-tour preservation, 100-cycle rapid sub-tab state persistence, and Supabase channel unmount lifecycles) is otherwise solid and passed all 150 verification assertions and 24 adversarial tests.

---

## 5. Verification Method

To independently verify all findings and test suites:

1. **Run Challenger 2 Test Harness**:
   ```bash
   npx tsx tests/adversarial_tier5_lifecycle_scoping_challenger_2.test.ts
   ```
2. **Run Comprehensive Consolidation Suite**:
   ```bash
   npx tsx tests/navigation_consolidation_verification.test.ts
   ```
3. **Run Typecheck & Entire Project Test Suite**:
   ```bash
   npx tsc --noEmit
   npm test
   ```
4. **Code Inspection**:
   - Inspect `src/utils/draftStorage.ts:6` and `src/components/GuruJurnal.tsx:200` to confirm unpartitioned `sipjam_jurnal_autosave`.
   - Inspect `src/components/AppScreen.tsx:683,817` to confirm `===` comparison on empty strings.
   - Inspect `src/lib/navigation.ts:49` to confirm pre-trim order of `rawView === 'null'`.
