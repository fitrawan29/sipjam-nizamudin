> [!WARNING] **Skepticism Disclaimer**
> Confidence is high based on verified execution across all 43 assertions in `tests/kepsek_pengawas_rbac.test.ts` and 100% pass across all 36+ test suites in `npm test`. Multi-tenant isolation and route guards have been tested programmatically.

## 1. What the prior attempt got wrong

### Issue 1: Direct URL Bypass of Administrative Views in `AppScreen.tsx`
- **Input:** A non-admin user (e.g. regular teacher or Kepala Sekolah) directly visits the URL `?view=view-admin-config`, `?view=view-admin-data`, or `?view=view-admin-backup`.
- **Expected:** Access is blocked with an "Akses Terblokir" screen, preventing unauthorized viewing or manipulation of school configuration or database records.
- **Actual:** While `handleNavigation` (clicking drawer items) restricted navigation, the JSX conditional rendering block in `AppScreen.tsx` rendered `<AdminConfigView />`, `<AdminDataView />`, and `<AdminBackupView />` directly without validating `isAdmin || isSuperadmin`.
- **Root Cause:** Missing JSX role guards around administrative view elements in `AppScreen.tsx`.

### Issue 2: Cross-Tenant Data Leakage in `AnalitikView.tsx`
- **Input:** Administrator or Kepala Sekolah of School A accesses the Analytics dashboard (`view-analitik`).
- **Expected:** Attendance statistics, journal totals, picket metrics, and the top 10 performance leaderboard reflect exclusively School A's data (`sekolah_id = user.sekolah_id`).
- **Actual:** Database queries on `presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket` omitted the `sekolah_id` filter, aggregating data and scores across all schools in a multi-tenant database.
- **Root Cause:** Missing `.eq('sekolah_id', user.sekolah_id)` scoping in `AnalitikView.tsx`.

### Issue 3: Homeroom Teacher (Wali Kelas) Name Collision in Monitored Class Reports
- **Input:** Kepala Sekolah or Administrator views/prints class attendance (`RekapSiswaView`) or class KBM journal (`RekapJurnalView`) for an assigned class (e.g. "VII-A") where they are not the homeroom teacher.
- **Expected:** The left signature block identifies the class's designated homeroom teacher (`activeWaliKelas.nama_guru` / `waliKelasMap[kelas].nama_guru`), with the right signature block identifying the Kepala Sekolah.
- **Actual:** In `RekapJurnalView`, if `isWaliKelas` was true (e.g. the Kepala Sekolah was assigned to class IX-B), their own name was rendered as the Wali Kelas of VII-A. In `RekapSiswaView`, `leftName` was hardcoded to `user?.nama`, duplicating the Kepala Sekolah's name on both sides of the report.
- **Root Cause:** Components failed to resolve the class's designated Wali Kelas record when the active viewer was an inspecting principal or admin.

### Issue 4: Multi-Tenant Scoping Omissions on `<PrintHeader />` Call Sites
- **Input:** Multi-school environment where user prints reports from `AdminRekapView`, `PiketView`, `RekapJurnalView`, or `RekapSiswaView`.
- **Expected:** `<PrintHeader />` explicitly receives `user={user}` and `sekolahId={user?.sekolah_id}` to prevent configuration fallback ambiguities or cross-tenant leakage.
- **Actual:** `<PrintHeader />` was rendered with zero props in `AdminRekapView.tsx`, `PiketView.tsx`, `RekapJurnalView.tsx`, and `RekapSiswaView.tsx`.
- **Root Cause:** Props were omitted at these call sites.

### Issue 5: Missing Multi-Tenant Scoping in `GradebookView.tsx` Print Blocks
- **Input:** Teacher or administrator prints gradebook summaries from Tab 1 (TP Matrix) or Tab 2 (Rekap Semester).
- **Expected:** `<PrintSignature />` scopes school settings and headmaster information to `user` and `sekolahId`.
- **Actual:** Both `<PrintSignature />` call sites in `GradebookView.tsx` omitted `user` and `sekolahId`.
- **Root Cause:** Missing prop delegation in `GradebookView.tsx`.

### Issue 6: Missing `isKepalaSekolah` Propagation for Personal Rekap Jurnal View
- **Input:** A teacher appointed as Kepala Sekolah in the database navigates to "Rekap Jurnal" (`view-guru-rekap-jurnal`) in `AppScreen.tsx`.
- **Expected:** `isKepalaSekolah` prop is passed down to `<RekapJurnalView />`.
- **Actual:** `<RekapJurnalView user={user} />` was rendered without `isKepalaSekolah={isKepalaSekolah}`, relying only on a synchronous fallback that cannot detect database-appointed principals if not in the initial JWT.
- **Root Cause:** Missing prop in `AppScreen.tsx`.

## 2. What I changed

- **`src/components/AppScreen.tsx`**:
  - Added JSX route guards for `view-admin-config`, `view-admin-data`, and `view-admin-backup` restricting rendering strictly to `isAdmin || isSuperadmin`.
  - Added JSX route guards for `view-admin-verif` and `view-admin-rekap` restricting rendering strictly to `isAdmin || isSuperadmin || isKepalaSekolah`.
  - Propagated `isKepalaSekolah={isKepalaSekolah}` to `view-guru-rekap-jurnal` and `view-admin-rekap`.
- **`src/components/AnalitikView.tsx`**:
  - Added `user?.sekolah_id` filter to `presensiQuery`, `jurnalQuery`, and `piketQuery` for strict tenant isolation.
- **`src/components/AdminRekapView.tsx`**:
  - Added `isKepalaSekolah?: boolean` prop.
  - Passed `user={user}` and `sekolahId={user?.sekolah_id}` to `<PrintHeader />`.
  - Set `leftName={isKepalaSekolah ? '( ........................................ )' : user?.nama}` and `leftNip={isKepalaSekolah ? '-' : user?.nip}` on `<PrintSignature />` to avoid self-signing as both Admin and Principal.
- **`src/components/PiketView.tsx`**:
  - Passed `user={user}` and `sekolahId={user?.sekolah_id}` to `<PrintHeader />`.
- **`src/components/RekapJurnalView.tsx`**:
  - Maintained `waliKelasMap` state to record homeroom assignments for all school classes.
  - Updated `<PrintHeader />` to receive `user={user}` and `sekolahId={user?.sekolah_id}`.
  - Resolved signer name and NIP dynamically in `<PrintSignature />` so monitored class journals accurately display the assigned Wali Kelas.
- **`src/components/RekapSiswaView.tsx`**:
  - Updated `<PrintHeader />` to receive `user={user}` and `sekolahId={user?.sekolah_id}`.
  - Resolved `leftName` and `leftNip` in `<PrintSignature />` to use `activeWaliKelas?.nama_guru` and `activeWaliKelas?.nip` when a non-assigned user (principal or admin) inspects a class.
- **`src/components/GradebookView.tsx`**:
  - Added `user={user}` and `sekolahId={sekolahId || undefined}` to both `<PrintSignature />` instances.
- **`tests/kepsek_pengawas_rbac.test.ts`**:
  - Added Section 5 test specs (R5.1 through R5.8) verifying all adversarial route guards, tenant isolation, and signature identity resolutions.

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/kepsek_pengawas_rbac.test.ts`: 43/43 assertions passed (100%).
  - `npx tsx tests/m22_automated_verification.test.ts`: 63/63 assertions passed (100%).
  - `npm test`: 36+ test files executed and passed with exit code 0.
- **Shallow Verification (manual only):**
  - Inspected component JSX tree, props, and conditional guard structures.
- **Unverified aspects:**
  - Physical thermal printer output formatting on non-standard receipt paper widths.

## 4. Known Issues

- `Minor Robustness Risk` — Very narrow paper widths (58mm/80mm thermal receipt printers) will wrap the 3-column signature block vertically unless printed in standard A4/F4 portrait or landscape orientation.

## 5. Remaining risk & next step

- All requirements (R1, R2, R3) and adversarial edge cases (route security, tenant isolation, homeroom signer collisions, read-only UI controls, Pengawas Bina toggle and identity synchronization) are fully implemented and verified with 100% test pass. The task is complete.
