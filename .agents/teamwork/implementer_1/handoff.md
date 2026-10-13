> [!WARNING] **Skepticism Disclaimer**
> High confidence (99%) — all obsolete Superadmin tabs and legacy modals/handlers were completely stripped, Overview tab aligned with satellite network data, and all 22 test suites (over 300 tests) passed cleanly alongside strict TypeScript and production build checks.

## 1. What I changed
- `src/components/AppScreen.tsx`:
  - Removed `view-superadmin-sekolah` ('Kelola Sekolah') and `view-superadmin-admins` ('Admin Sekolah') from `menuItemsSuperadmin`.
  - Streamlined `initialTab` and `onNavigateTab` props passed to `SuperadminView` to toggle strictly between `overview` and `jaringan`.
- `src/components/SuperadminView.tsx`:
  - Stripped obsolete tabs: "Kelola Sekolah" (`sekolah`) and "Admin Sekolah" (`admins`) from tab navigation bar and JSX body.
  - Removed legacy local school modals and handlers: `handleOpenAddSchoolModal`, `handleEditSchool`, `handleToggleSchoolStatus`, `handleDeleteSchool`.
  - Removed legacy local admin modals and handlers: `handleOpenAddAdminModal`, `handleEditAdmin`, `handleDeleteAdmin`.
  - Removed unused state and filter variables: `sekolahList`, `sekolahSearch`, `cityFilter`, `statusFilter`, `adminList`, `adminSearch`, `schoolNameMap`, `uniqueCities`, `filteredSekolah`, `filteredAdmins`.
  - Aligned tab **Overview** (`overview`) with satellite network data: KPI cards now show total satellite schools, online database count (with pulse indicator), total teachers, and total students across the entire satellite network.
  - Aligned Overview quick action buttons: replaced "Buat Akun Admin Sekolah" and "Kelola Daftar Sekolah" with direct shortcuts to "Tambah Sekolah Satelit" and "Periksa Status Live Database".
  - Replaced legacy schools overview summary table with live "Jaringan Sekolah Satelit Terbaru" showing real-time database status badges and teacher/student counts.
- `src/components/Tutorial/tutorialData.ts`:
  - Replaced obsolete tutorial entries for `superadmin-sekolah` and `superadmin-admins` with unified tutorial item for `superadmin-jaringan` (Jaringan Sekolah Satelit).

## 2. Why
- To complete the architectural transition to **Jaringan Sekolah Satelit & Multi-School Switcher**, removing redundant and confusing legacy local school and admin management features from the Superadmin role while keeping satellite network monitoring and management fully functional.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `npx tsc --noEmit`: Exited with code 0 (zero TypeScript errors).
  - Ran `npm test`: All 22 test suites passed cleanly with 0 failures (including `portal_induk_jaringan_multi_sekolah.test.ts` (47/47 passed), `presensi_siswa_sync_and_superadmin.test.ts` (11/11 passed), `adversarial_presensi_sync_reviewer.test.ts` (12/12 passed), `adversarial_presensi_sync_reviewer_r2.test.ts` (10/10 passed), `adversarial_presensi_sync_reviewer_r3.test.ts` (12/12 passed), etc.).
  - Ran `npm run build`: Production Next.js build compiled and generated static and dynamic routes cleanly with code 0.
- **Shallow Verification (manual run only):** Eyeballed JSX structure for responsiveness and dark mode compatibility on the simplified 2-tab layout.
- **Unverified aspects:** End-to-end interactive browser session in live production environment with real remote Supabase satellites (relying on passing automated mock/contract suites and build verification).

## 4. Known Issues
- `None` (verified with full test suite, build, and static type checks).

## 5. Untested Edge Cases & Next Step
- Reviewers should verify that clicking the school switcher dropdown in the Superadmin header or Overview quick actions transitions smoothly to satellite target mode and back to master scope.
