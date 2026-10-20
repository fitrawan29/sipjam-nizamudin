# Reviewer 1 Handoff Report

> [!WARNING] **Skepticism Disclaimer**
> Confidence is high based on empirical test execution (35/35 test assertions passing and 36+ test files passing in `npm test`), though live hardware interaction with a physical printer device remains unverified.

## 1. What the prior attempt got wrong

### Issue 1: Dual-Role Lockout in `RekapSiswaView`
- **Input:** A teacher assigned as Wali Kelas for class "VII-A" who is simultaneously designated as Kepala Sekolah accesses `view-rekap-siswa`.
- **Expected:** The user should be able to mark status, fill remarks, and save attendance for their own homeroom class ("VII-A"), while viewing other classes ("VII-B", "VIII-A") in read-only monitoring mode.
- **Actual:** `AppScreen` passed `isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}` which was `true`. In `RekapSiswaView`, `isReadOnly` unconditionally disabled student status buttons, quick mark buttons, remarks, and the save button. The teacher was blocked with "Mode Monitoring" when trying to save attendance for their own class.
- **Root Cause:** `RekapSiswaView.tsx` lacked evaluation of whether the active viewed class matches the teacher's assigned homeroom class (`isOwnHomeroomClass`), applying global read-only lock to all classes indiscriminately.

### Issue 2: Kepala Sekolah Lockout from Jurnal Kelas in `RekapJurnalView`
- **Input:** Kepala Sekolah accesses `view-jurnal-kelas` to monitor school-wide KBM journals.
- **Expected:** Kepala Sekolah can select any class or "Semua Kelas" and monitor KBM journals across all classes in read-only mode.
- **Actual:** `RekapJurnalView` evaluated `!isAdmin && !isWaliKelas && waliClasses.length === 0` to `true`, causing `tarikRekap()` to immediately clear data (`setJurnalData([])`) and return. Furthermore, the class dropdown was populated from empty `waliClasses`, rendering zero selectable classes.
- **Root Cause:** `RekapJurnalView.tsx` had no parameter or check for `isKepalaSekolah`, treating the principal as an unauthorized regular teacher when accessing classroom mode.

### Issue 3: Incoherent Rapor Menu in `menuItemsKepalaSekolah`
- **Input:** Kepala Sekolah who is not a homeroom teacher (not Wali Kelas) clicks "Rapor" (`view-rapor`) from the navigation drawer.
- **Expected:** Menu item should only appear if the user is assigned as a Wali Kelas (per R1).
- **Actual:** "Rapor" appeared unconditionally in `menuItemsKepalaSekolah`, but clicking it triggered an "Akses Terblokir" popup from `handleNavigation` line 391 (`if (!isKepalaSekolah || targetId === 'view-rapor')` with `!isWaliKelas`).
- **Root Cause:** In `AppScreen.tsx`, `menuItemsKepalaSekolah` hardcoded `view-rapor` without checking `isWaliKelas`.

### Issue 4: Clearing/Unassigning Kepala Sekolah in `AdminConfigView`
- **Input:** Administrator unselects the designated teacher by choosing "-- Pilih Guru yang Ditunjuk sebagai Kepala Sekolah --" (value `""`) and saves.
- **Expected:** `sekolah.kepala_sekolah_id` is cleared to `null` and `data_guru.is_kepala_sekolah` is reset to `false`.
- **Actual:** The code checked `if (saveConfig.kepala_sekolah_id)` before updating. Since `""` was falsy, the update was skipped, leaving the previously assigned teacher as `is_kepala_sekolah: true` in `data_guru` and keeping the old ID in `sekolah`.
- **Root Cause:** Missing reset/clear logic when `saveConfig.kepala_sekolah_id` was falsy or empty.

### Issue 5: Missing Multi-Tenant Scoping on `PrintSignature`
- **Input:** `AdminRekapView`, `RekapSiswaView` (Gerbang & Rekap tabs), and `PiketView` invoked `<PrintSignature />` without passing `user` or `sekolahId`.
- **Expected:** `PrintSignature` scopes database queries for school configuration (`pengaturan`) strictly to the active school tenant.
- **Actual:** `PrintSignature` queried `pengaturan` without a `sekolah_id` filter when props were omitted, risking cross-tenant configuration contamination.
- **Root Cause:** Missing `user={user}` and `sekolahId={user?.sekolah_id}` on `<PrintSignature />` call sites.

## 2. What I changed
- **`src/components/AppScreen.tsx`**:
  - In `menuItemsKepalaSekolah`, conditioned `view-rapor` on `isWaliKelas`: `...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])`.
  - Passed `isKepalaSekolah={isKepalaSekolah}` to `<RekapJurnalView />`.
  - Restricted `view-rapor` rendering to `isAdmin || isSuperadmin || isWaliKelas`.
- **`src/components/RekapJurnalView.tsx`**:
  - Added `isKepalaSekolah?: boolean` prop and imported `checkIsKepalaSekolah`.
  - In `fetchMaster`, `tarikRekap`, `handleTabChange`, and class dropdown, granted Kepala Sekolah access to view all classes and all teachers' journals without RBAC blocking.
- **`src/components/RekapSiswaView.tsx`**:
  - Split read-only into `isGlobalReadOnly` and dynamic `isReadOnly = isGlobalReadOnly && !isOwnHomeroomClass`.
  - Allowed teachers who are both Wali Kelas and Kepala Sekolah to mark attendance and save for their own class, while preserving read-only protection for other classes.
  - Added `user={user}` and `sekolahId={user?.sekolah_id}` to both `<PrintSignature />` calls.
- **`src/components/AdminConfigView.tsx`**:
  - In `handleSave`, explicitly set `updatePayload.kepala_sekolah_id = saveConfig.kepala_sekolah_id || null`, and reset `data_guru.is_kepala_sekolah: false` for all teachers when unassigning.
- **`src/components/AdminRekapView.tsx`**:
  - Passed `user={user}` and `sekolahId={user?.sekolah_id}` to `<PrintSignature />`.
- **`src/components/PiketView.tsx`**:
  - Passed `user={user}` and `sekolahId={user?.sekolah_id}` to `<PrintSignature />`.
- **`tests/kepsek_pengawas_rbac.test.ts`**:
  - Added Section 4 adversarial tests (R4.1 to R4.6) covering Rapor conditional visibility, Jurnal Kelas access for Kepala Sekolah, dual-role editing, multi-tenant PrintSignature scoping, and headmaster clearance.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/kepsek_pengawas_rbac.test.ts`: 35/35 assertions passed (100%).
  - `npm test`: 36+ test files passed (100%).
- **Shallow Verification (manual only):**
  - Verified component syntax and JSX structure.
- **Unverified aspects:**
  - Physical paper printer output on hardware devices.

## 4. Known Issues
- `Minor Robustness Risk` — Narrow thermal receipt printers (58mm/80mm) may wrap 3-column signature blocks unless printed in landscape or standard A4/Folio portrait.

## 5. Remaining risk & next step
- Implementation is complete, hardened against dual roles, multi-tenant isolated, and regression-proofed. Task is ready for final delivery.
