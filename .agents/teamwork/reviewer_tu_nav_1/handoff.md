# Review and Verification Report: Milestone 2 (R1 & R2 Focus)

## 1. Observation
1. **Navigation Menu & RBAC (`src/lib/navigation.ts`)**:
   - `getConsolidatedMenuItems({ role: 'tata_usaha' })` (lines 179–188) strictly returns an array of 6 menu items:
     ```typescript
     if (normRole === 'tatausaha') {
       return [
         { id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi TU', dataTour: 'view-guru-presensi' },
         { id: 'view-guru-jurnal', icon: 'fa-book-open', label: 'Jurnal Kegiatan', dataTour: 'view-guru-jurnal' },
         { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Asesmen', dataTour: 'view-gradebook' },
         { id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor', dataTour: 'view-rapor' },
         { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi Sekolah', dataTour: 'view-informasi' },
         { id: 'view-pengaturan-akun', icon: 'fa-user-gear', label: 'Pengaturan Akun', dataTour: 'view-pengaturan-akun' }
       ];
     }
     ```
   - Canonical aliases in `VIEW_ALIASES` (lines 26, 29, 32):
     - `'view-presensi-tu'`: `{ view: 'view-guru-presensi' }`
     - `'view-jurnal-kegiatan'`: `{ view: 'view-guru-jurnal', tab: 'input' }`
     - `'view-asesmen'`: `{ view: 'view-gradebook', tab: 'gradebook' }`
   - Route and tab access control in `evaluateTabRBAC` (lines 243–247, 254–268):
     - Rapor subtab explicitly allowed for TU: `if (viewId === 'view-gradebook' && tabId === 'rapor') { if (!isWali && !isAdmin && !isTataUsaha) ... }`.
     - Permitted view whitelist strictly checked: `['view-guru-presensi', 'view-guru-jurnal', 'view-gradebook', 'view-rapor', 'view-informasi', 'view-home', 'view-pengaturan-akun']`.
     - Explicit denial for unauthorized views: returns `{ allowed: false, fallbackTab: 'view-guru-presensi', reason: 'Role Tata Usaha tidak memiliki izin akses ke modul ini.' }`.
     - Dedicated early gate (line 231): `if (isTataUsaha && viewId === 'view-dokumen')` returns `{ allowed: false, fallbackTab: 'view-guru-presensi', reason: 'Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.' }`.

2. **App Shell, Routing, & AST Invariant (`src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`)**:
   - In `src/components/AppScreen.tsx`:
     - Default landing view set to `view-guru-presensi` (lines 195, 234, 822):
       `if (isTataUsaha) return 'view-guru-presensi';`
     - `handleNavigation` intercepts `view-pengaturan-akun` to trigger `setIsAccountModalOpen(true)` (lines 482–486).
     - Component routing for `currentView === 'view-rapor'` permits `isTataUsaha` (lines 1279–1281).
     - Component routing for `currentView === 'view-admin-data'` strictly excludes `isTataUsaha` (lines 1381–1385), rendering the "Akses Ditolak" error card if bypassed.
     - AST preservation comment preserved verbatim at line 1018:
       `{/* AST preservation: data-tour={item.id} */}`
     - Quick action buttons (Pengaturan Akun, Tutorial, Interactive Tour) suppressed for TU (`{!isTataUsaha && ...}`) (lines 1033, 1043, 1053).
   - In `src/components/ClaySidebar.tsx`:
     - AST preservation comment preserved verbatim at line 223:
       `{/* AST preservation: data-tour={item.id} */}`
     - Click handler intercepts `view-pengaturan-akun` to invoke `onOpenAccountSettings()` (lines 229–232).
     - Sidebar quick action buttons suppressed when `isTU` is true (lines 274, 290, 307).

3. **Read-Only Asesmen (`src/components/GradebookView.tsx`)**:
   - Role identification & all-teacher selector:
     - `const isTataUsaha = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';` (line 279).
     - `const canSelectAllTeachers = isAdmin || isTataUsaha;` (line 280).
     - `const canAccessRapor = isAdmin || isSuperadmin || isWaliKelas || isTataUsaha;` (line 288).
   - In `useEffect` `verifyGuruPengampu`:
     - `if (isAdmin || isTataUsaha) { setIsGuruPengampu(false); return; }` (lines 1125–1128).
   - UI Indicators & Action controls:
     - Badge rendered: `<span ...>Mode Tinjau TU (Read-Only)</span>` (lines 2775–2779).
     - Admin "Bobot" button hidden for TU: `{isAdmin && !isTataUsaha && (` (line 2816).
     - Table grade cells render static `<span>` instead of inputs:
       `{isAdmin || !isGuruPengampu ? (<span ...>{sGrades[...] ?? '-'}</span>) : (<input ... />)}` (lines 4221–4226, 4263–4268, 4307–4312).
     - Save handler guard: `if (isAdmin || isTataUsaha) { return; }` in `handleSaveGrades` (line 1809).

4. **Read-Only Rapor (`src/components/RaporView.tsx`)**:
   - Role identification: `const isTataUsaha = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';` (line 42).
   - Homeroom lock bypass: `if (!isAdmin && !isTataUsaha && assignedKelas && selectedKelas !== assignedKelas) { setSelectedKelas(assignedKelas); }` (lines 162–165).
   - Class selector dropdown enabled for TU:
     `{isAdmin || isSuperadmin ? (...) : isTataUsaha ? (<select value={selectedKelas} ...>{classList.map(...)}</select>) : (...)}` (lines 1150–1160).
   - "Simpan Rapor" button hidden for TU: `{!isTataUsaha && (<button ...>Simpan Rapor</button>)}` (lines 1124–1135).
   - Mutation handlers guarded: `if (isTataUsaha || !selectedKelas) return false;` in `saveCatatanToSupabase` (line 804) & `saveDlToSupabase` (line 839), and `if (isTataUsaha) return;` in `handleManualSave` (line 914).
   - Notes & Deep Learning observations rendered as read-only formatted text for TU (`${isTataUsaha ? 'block' : 'hidden print:block'}`).
   - Print signature sanitization:
     `rightName={assignedWaliInfo?.nama_guru || (!isAdmin && !isTataUsaha ? user?.nama : '') || '...........................................'}`
     ensures TU user's own identity is never printed as homeroom teacher.

5. **PostgREST Client Interceptor (`src/lib/supabaseClient.ts`)**:
   - `ASSESSMENT_TABLES`: `['capaian_pembelajaran', 'tujuan_pembelajaran', 'asesmen_kolom', 'nilai_siswa']`.
   - `isAssessmentEndpoint`: Accurately parses query strings, URL parameters, schema prefixes, and origin hosts.
   - `checkMasterDataMutationGuard`:
     ```typescript
     if (normRole === 'tatausaha' && isAssessmentEndpoint(requestUrlStr)) {
       return new Response(
         JSON.stringify({
           code: '42501',
           status: 403,
           error: 'Forbidden: Hak akses Tata Usaha pada Asesmen dan Rapor adalah read-only (tinjau saja).',
           ...
         }),
         { status: 403, statusText: 'Forbidden', headers: { 'Content-Type': 'application/json' } }
       );
     }
     ```
   - Permits `GET` requests (returns `null`), while returning 403 with Postgres error code `42501` for `POST`, `PUT`, `PATCH`, `DELETE`.

6. **Execution of Automated Test Commands**:
   - `npx tsc --noEmit` -> Exited with code 0 (clean compilation).
   - `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts` -> Exited with code 0 (87/87 tests passed).
   - `npx tsx tests/tu_refinements_and_admin_rekap.test.ts` -> Exited with code 0 (81/81 tests passed).
   - `npm test` -> Exited with code 0 (all 65+ project test suites passed, 0 failures).

## 2. Logic Chain
1. *Requirements R1*: Mandates that role TU navigation is restricted strictly to 6 items (Presensi TU, Jurnal Kegiatan, Asesmen, Rapor, Informasi Sekolah, Pengaturan Akun), landing by default on Presensi TU.
   - *Observation 1 & 2*: `getConsolidatedMenuItems` returns exactly these 6 items; `AppScreen.tsx` sets initial, popstate, and default views to `view-guru-presensi`; and redundant quick actions are hidden. `evaluateTabRBAC` acts as a second-line defense denying access to non-TU modules. Therefore, R1 is completely fulfilled.
2. *Requirement R2*: Mandates that role TU can review assessment and rapor across all teachers and classes, but all mutation buttons, input fields, and save triggers must be disabled/hidden, enforcing strict read-only mode.
   - *Observation 3 & 4*: In `GradebookView`, setting `canSelectAllTeachers = isAdmin || isTataUsaha` and `isGuruPengampu = false` for TU allows querying any teacher while universally rendering static spans instead of grade inputs, hiding save/bobot buttons, and blocking save routines. In `RaporView`, bypassing homeroom lock allows TU to select any class from the dropdown, while hiding the save button, rendering observation notes as read-only text, guarding backend save handlers, and preventing signature impersonation.
   - *Observation 5*: Network-level interceptor in `supabaseClient.ts` blocks any direct mutating HTTP request (`POST`, `PUT`, `PATCH`, `DELETE`) with HTTP 403 and SQL state 42501. Therefore, R2 is thoroughly implemented and defended across UI, component state, and PostgREST client layers.
3. *Integrity & Quality*:
   - Checked for hardcoded test mocks, dummy facades, shortcuts, and fake outputs. None found. Real Supabase queries, real component bindings, and real regex parsing are employed.
   - AST preservation comment `{/* AST preservation: data-tour={item.id} */}` remains untouched in both `AppScreen.tsx` and `ClaySidebar.tsx`.
   - Full test suite passed without regression.

## 3. Caveats
- No caveats. All required items for R1 and R2 have been thoroughly verified through both static AST code review and dynamic automated testing.

## 4. Conclusion
**Verdict**: **APPROVE**
The implementation of Milestone 2 (R1 TU Navigation & RBAC, R2 Read-Only Asesmen & Rapor) is exemplary, fully compliant with `/ponytail` design principles (0 duplicated components, 0 new external dependencies, maximum reuse of existing pipelines), free of integrity violations, and passes all verification gates with 100% success.

## 5. Verification Method
To independently reproduce:
```bash
# 1. Typecheck
npx tsc --noEmit

# 2. TU RBAC & Isolation Suite
npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts

# 3. Dedicated Milestone 2 TU Refinements Suite
npx tsx tests/tu_refinements_and_admin_rekap.test.ts

# 4. Full Application Regression Suite
npm test
```
All commands exit cleanly with code 0.
