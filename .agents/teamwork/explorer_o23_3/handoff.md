# Handoff Report: School Drilldown, Print System, & Test Infrastructure (`dinas_pendidikan`)

**Agent**: `explorer_o23_3`  
**Date**: 2026-10-23  
**Report Type**: Hard Handoff (Investigation Complete)  
**Detailed Report**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_3\report.md`

---

## 1. Observation

1. **`getActiveTargetSchool` in `src/lib/supabaseClient.ts` (lines 172-177)**:
   ```typescript
   export function getActiveTargetSchool(): SatelliteSchool | null {
     const tenant = getActiveTenantContext();
     const roleNorm = (tenant.role || '').toLowerCase().replace(/\s+/g, '');
     if (roleNorm !== 'superadmin') {
       return null;
     }
   ```
   Directly observed: `getActiveTargetSchool()` currently restricts active target school switching exclusively to `superadmin`. Local Admin and Guru roles unconditionally receive `null`.

2. **Session Safety in `src/lib/supabaseClient.ts` (lines 151-165, 198-201)**:
   `setActiveTargetSchool(school)` and `clearActiveTargetSchool()` only store/clear `sipjam_active_target_school` in `localStorage` and `serverActiveTargetSchool` in memory. Neither function alters `sipjam_user` or the active `session_token`.

3. **Effective User Scope Injection in `src/components/AppScreen.tsx` (lines 82-89)**:
   ```typescript
   const effectiveUser: AppUser = (isSuperadmin && activeTargetSchool)
     ? {
         ...baseUser,
         sekolah_id: activeTargetSchool.id,
         sekolah_nama: activeTargetSchool.nama
       }
     : baseUser;
   const user = effectiveUser;
   ```
   Child views (`AdminRekapView`, `RekapSiswaView`, `RekapJurnalView`) rely on `user.sekolah_id` to query data.

4. **Existing Print Framework (`src/components/PrintHeader.tsx`, `src/utils/printWithGps.ts`, `src/app/globals.css`)**:
   - `PrintHeader` (lines 97-176) renders the official Kop Surat with dynamic address font size scaling (`getAddressFontSize()`, lines 84-93).
   - `PrintSignature` (lines 354-477) renders 2-column or 3-column signatures (with Pengawas Bina support) and legal footer with GPS coordinates (`window.__SIPJAM_PRINT_GPS__`) and timestamp.
   - `triggerPrintWithGps()` (lines 31-106) captures device GPS coordinates and opens the print dialog.
   - `globals.css` (lines 570-650, 780-813) hides navigation, buttons, and sidebars (`@media print { header, nav, aside, .no-print { display: none !important; } }`) while displaying `.print-only` elements.

5. **Existing Test Infrastructure (`package.json`, `tests/`)**:
   - `package.json` line 10 uses `tsx` (`"test": "tsx tests/... && tsx ..."`).
   - `vitest` is NOT installed in `package.json`. Running `npx vitest` prompts an unprompted download.
   - Standalone test `npx tsx tests/kepsek_pengawas_rbac.test.ts` ran and passed in 6 seconds (47 tests passed, 0 failures) without compilation errors.
   - `tests/portal_induk_jaringan_multi_sekolah.test.ts` and `tests/whatsapp_parent_notify_and_autosave.test.ts` demonstrate in-memory `localStorage` mocking and `setServerTenantContext()` harnesses.

---

## 2. Logic Chain

1. **From Observation 1 & 3 to Target School Switching for `dinas_pendidikan`**:
   Because `getActiveTargetSchool()` currently limits access to `roleNorm === 'superadmin'`, updating the condition to allow `dinaspendidikan` (alongside `superadmin`) enables the dynamic switcher for Dinas users.
   Because `effectiveUser` in `AppScreen.tsx` overrides `sekolah_id` with `activeTargetSchool.id`, extending this to `(isSuperadmin || isDinas) && activeTargetSchool` allows all existing drilldown views (`AdminRekapView`, `RekapSiswaView`, `RekapJurnalView`) to automatically query the target school's database without altering their internal query logic.

2. **From Observation 2 to Session Integrity**:
   Because `setActiveTargetSchool` and `clearActiveTargetSchool` only modify `sipjam_active_target_school` and never modify `sipjam_user` or `session_token`, a Dinas user can select a school to drill down and clear the selection to return to the dashboard without corrupting their authentication state or losing session context.

3. **From Observation 1 & Anti-Tampering Constraint**:
   Because a Dinas user must be strictly restricted to schools in their assigned region (`kota_kabupaten`), adding a validation check in `getActiveTargetSchool()` (verifying `targetSchool.kota_kabupaten === user.kota_kabupaten`) prevents client-side localStorage tampering from breaching regional isolation.

4. **From Observation 4 to Print System Reuse**:
   Because `PrintHeader` and `PrintSignature` dynamically resolve school Kop Surat and signatures based on `sekolahId` (which receives `user.sekolah_id`), drilldown views opened by `dinas_pendidikan` automatically print official documents for the target school with zero modifications to the print engine.
   For the executive dashboard, using `triggerPrintWithGps()` and a `.print-only` regional table seamlessly adheres to SIPJAM's existing `@media print` styling.

5. **From Observation 5 to Test Runner Specification**:
   Because the repository relies on `tsx` for all 112+ test files and `vitest` is not installed, writing `tests/dinas_pendidikan_monitoring.test.ts` to run via `npx tsx tests/dinas_pendidikan_monitoring.test.ts` strictly complies with the repository's test infrastructure, avoids unnecessary npm package installations (preserving Ponytail principles), and satisfies Requirement R4 and Acceptance Criteria.

---

## 3. Caveats

- **Regional Name Normalization**: School records in `sekolah` or `sekolah_registry` may contain formatting variations in `kota_kabupaten` (e.g. `"Kab. Boltim"` vs `"Kabupaten Bolaang Mongondow Timur"` or differing case). The regional filter must perform trimmed, case-insensitive, and prefix-tolerant matching.
- **External Satellite Supabase Instances**: If a target school has external Supabase credentials (`supabase_url` and `supabase_anon_key`), `dynamicTenantFetch` will dynamically route fetch requests to that satellite instance. The read-only restriction for Dinas must be preserved across both master and satellite targets.
- **No other caveats.**

---

## 4. Conclusion

1. **School Drilldown**: `getActiveTargetSchool` in `supabaseClient.ts` and `effectiveUser` in `AppScreen.tsx` provide the exact, battle-tested mechanism needed for school drilldown. By updating the RBAC check to allow `dinaspendidikan` with an assigned `kota_kabupaten` boundary check, Dinas users can inspect teacher attendance, student attendance, and class journals in read-only mode without risking global session corruption.
2. **Printing Infrastructure**: `PrintHeader`, `PrintSignature`, and `triggerPrintWithGps` are completely reusable out-of-the-box. Drilldown views automatically print target school reports, while the new Dinas overview can leverage `triggerPrintWithGps` to produce official regional summary reports.
3. **Automated Test Infrastructure**: `tests/dinas_pendidikan_monitoring.test.ts` must be written as a standalone `tsx` test suite following the patterns in `portal_induk_jaringan_multi_sekolah.test.ts` and `kepsek_pengawas_rbac.test.ts`, covering regional assignment, zero-leak isolation, read-only RBAC, aggregate metrics, drilldown lifecycle, and print access.

---

## 5. Verification Method

To independently verify the observations and architectural recommendations:

1. **Verify Existing Target School RBAC & Session Logic**:
   ```bash
   npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts
   ```
   Inspect lines 80-125 where `getActiveTargetSchool()` returns non-null for Superadmin and unconditionally returns null for Guru and Admin.

2. **Verify Test Runner & Execution Performance**:
   ```bash
   npx tsx tests/kepsek_pengawas_rbac.test.ts
   ```
   Verifies that `tsx` runs test suites natively and outputs ANSI test summaries with 0 errors.

3. **Inspect Print Styling & Classes**:
   View `src/components/PrintHeader.tsx` (lines 11-187, 214-495) and `src/app/globals.css` (lines 570-650, 780-813) to confirm `@media print` rules, `.print-only`, and signature layouts.

4. **Invalidation Condition**:
   The findings would be invalidated if `getActiveTargetSchool()` required user re-authentication or if clearing target school wiped the `sipjam_user` session token. Both were proven false by direct source inspection.
