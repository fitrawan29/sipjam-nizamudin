# Handoff Report: Requirement R3, Cross-Cutting Concerns & Verification Setup

## 1. Observation

### 1.1 Project Setup, Build Commands & Testing Tools
Direct examination of `package.json`, TypeScript configuration, and runtime execution confirmed:
- **Runtime & Framework**: Next.js `16.3.4` (Turbopack), React `19.2.8`, Node TypeScript execution via `tsx` (`^4.23.13`), TypeScript `^5`.
- **TypeScript Typecheck Command**:
  ```bash
  npx tsc --noEmit
  ```
  Execution output: Exited with code `0` (clean, zero type errors).
- **Linter Command**:
  ```bash
  npm run lint
  ```
  Execution output: Exited with code `0` (`0 errors, 223 warnings`).
- **Production Build Command**:
  ```bash
  npm run build
  ```
  Execution output: Exited with code `0` (Turbopack successfully compiled and generated static & dynamic routes).
- **Unit / Integration Test Execution**:
  Individual tests are run directly using `npx tsx tests/<test_name>.test.ts`.
  Example verified tests:
  - `npx tsx tests/tu_refinements_and_admin_rekap.test.ts` -> `82 passed, 0 failed`.
  - `npx tsx tests/pulang_cepat_guru_bk_tu.test.ts` -> `3 passed, 0 failed`.
  - `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts` -> `20 passed, 0 failed`.
- **Full Test Suite**: `npm test` runs 85+ chained test scripts in sequence; `npm run test:e2e` runs Playwright/end-to-end tests via `tsx tests/e2e/run_all_e2e.ts`.

### 1.2 Role Definitions, Permissions & Guru vs Staff TU Differentiation
- **Type Definitions (`src/types/user.ts:1, 7` & `src/types/database.ts:2177`)**:
  - `UserRole = 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | 'tata_usaha' | 'bk' | 'guru_bk' | string;`
  - `RoleUser = "Superadmin" | "Admin" | "Guru" | "dinas_pendidikan" | "Dinas Pendidikan" | "tata_usaha" | "Tata Usaha" | "bk" | "guru_bk" | "Guru BK" | "BK";`
- **Role Detection Pattern Across App**:
  Direct observation of `src/components/AppScreen.tsx:97-99` and `src/components/HomeView.tsx:27`:
  ```ts
  const isTataUsaha =
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha' ||
    (baseUser?.mata_pelajaran || '').toLowerCase().includes('tata usaha');
  ```
- **Staff TU in Master Data (`data_guru`)**:
  In `src/components/AdminPenggunaView.tsx:213-285` (`handleToggleTuAssignment`) and `326-360` (`handleCreateTuUser`), TU staff members are persisted in **both** tables:
  1. `users.role = 'tata_usaha'`
  2. `data_guru.mata_pelajaran = 'Tata Usaha (Administrasi)'`
  When admin switches a teacher to TU, `users.role` is updated to `'tata_usaha'` and `data_guru.mata_pelajaran` is updated to `'Tata Usaha (Administrasi)'`.
- **Navigation & RBAC for TU (`src/lib/navigation.ts:140-160, 256-340`)**:
  Role `'tata_usaha'` is strictly granted 7 consolidated menu items:
  1. `view-home` (Dashboard)
  2. `view-guru-presensi` (Presensi TU)
  3. `view-guru-jurnal` (Jurnal Kegiatan)
  4. `view-gradebook` (Asesmen - Read Only)
  5. `view-rapor` (Rapor - Read Only)
  6. `view-informasi` (Informasi Sekolah)
  7. `view-pengaturan-akun` (Pengaturan Akun)
  Navigation aliases exist: `view-presensi-tu` -> `view-guru-presensi`, `view-jurnal-kegiatan` -> `view-guru-jurnal`, `view-asesmen` -> `view-gradebook`.
- **PostgREST Interception Security (`src/lib/supabaseClient.ts:245-265`)**:
  `checkMasterDataMutationGuard` strictly enforces HTTP 403 Forbidden (code `42501`) if `tata_usaha` attempts mutations on assessment tables (`capaian_pembelajaran`, `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`), ensuring read-only compliance.

### 1.3 `jurnal_kegiatan` vs `jurnal_pembelajaran` Definition & Implementation
- **Database Table**:
  There is **no** independent table named `jurnal_kegiatan` in the PostgreSQL schema. Both KBM and non-KBM activities are stored within `public.jurnal_pembelajaran`.
- **Data Shape Distinction**:
  In `src/components/GuruJurnal.tsx:1041-1074` and `src/lib/attendanceAlpa.ts:656-661`:
  - **Jurnal KBM**: Contains class and subject data (`mapel: <subject>`, `kelas: <class>`, `pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `kktp`, `materi: finalKonten`, `kegiatan`, `absensi_siswa`, `kehadiran_murid`).
  - **Jurnal Kegiatan**:
    - `mapel: '-'`
    - `kelas: '-'`
    - `keterangan: 'Jurnal Kegiatan'` (or includes 'Jurnal Kegiatan')
    - `pertemuan_ke: '-'`
    - `jam_ke: '-'`
    - `tujuan_pembelajaran: '-'`
    - `materi: <nama_kegiatan>`
    - `kegiatan: <deskripsi_kegiatan>`
    - `link_bukti_foto: <foto_url>`
- **Automatic Form Selection**:
  In `src/components/GuruJurnal.tsx:551-576`:
  ```ts
  if (state.isBlok) {
    setTipeJurnal('Jurnal Kegiatan');
  } else if (state.isDinasLuar) {
    setTipeJurnal('Jurnal Kegiatan');
  } else if (state.jadwalKBM && state.jadwalKBM.length > 0) {
    setTipeJurnal('Jurnal KBM');
  } else {
    setTipeJurnal('Jurnal Kegiatan');
  }
  ```
  If a teacher has no teaching schedule on the day (`state.jadwalKBM.length === 0`), or is a TU staff member, `tipeJurnal` automatically switches to `'Jurnal Kegiatan'`.
- **Fulfillment of Duties in Workflow**:
  In `src/lib/workflow.ts:1758-1761` and `1835-1840`:
  ```ts
  if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {
    if (state.jurnalKegiatan) isJurnalDone = true;
    if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;
    if (state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;
  }
  ```
  And in `canTeacherPresensiPulang` (`src/lib/workflow.ts:1836`):
  `if (state.jurnalKegiatan) return true;`
  Filing a `jurnalKegiatan` completely satisfies the journal requirement and unlocks checkout (`canPresensiPulang`) for teachers without KBM hours, during Sistem Blok, and for TU staff.

### 1.4 Root Cause of "Bebas Presensi" for Guru & TU without KBM (Requirement R1)
Direct inspection of `AdminConfigView.tsx:720-750`, `src/lib/workflow.ts:1505-1528`, and `src/lib/attendanceAlpa.ts:403-413` revealed:
1. In `AdminConfigView.tsx`:
   - Tab 4 "Kebijakan Guru" sets `aturan_kehadiran_guru` (`'Semua_Hari'` vs `'Hari_Mengajar_Saja'`).
   - The bulk button "Set Semua Hanya Hari KBM" executes:
     `onClick={() => setExemptTeacherIds(guruList.map(g => g.id).filter(Boolean))}`
     Since `guruList` loads all records from `data_guru`, including TU staff (`mata_pelajaran: 'Tata Usaha (Administrasi)'`) and teachers without KBM assignments, it marks ALL of them as `wajib_hadir_hanya_mengajar = true`.
2. In `src/lib/workflow.ts:1506-1514`:
   ```ts
   if (isTeacherExempt) {
     if (!hasTeachingObligation) {
       state.isNonTeachingDay = true;
       state.bebasAlpa = true;
       state.isAlpa = false;
       state.lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).';
       return state;
     }
   ```
   Because TU staff and non-KBM teachers have no KBM schedule (`hasTeachingObligation === false`), `workflow.ts` marks them with `isNonTeachingDay = true`, `bebasAlpa = true`, and sets `lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'`.
3. In `HomeViewGuru.tsx:420-424, 1056-1065`:
   The UI reads `dailyState.isNonTeachingDay` and displays "Bebas Presensi" / "Bebas Kehadiran & Jurnal", locking them out of regular checkout and activity logging.
4. In `src/lib/attendanceAlpa.ts:410-413`:
   Auto-alpa skips any teacher where `isTeacherExempt` is true and `!hasTeachingToday && !inPenugasan`, meaning they are never audited for daily attendance.

### 1.5 Current State of Jurnal KBM Edit & Delete for Role Guru (Requirement R2)
- Direct inspection of `src/components/RekapJurnalView.tsx:1425-1555`:
  - In `tabMode === 'pribadi'` (used in `GuruJurnal.tsx` under tab `'rekap-pribadi'`), each row of `filteredJurnal` only has a view-only action: `<button onClick={() => setSelectedJurnal(j)}> Detail </button>`.
  - There is currently **no Edit button** and **no Delete button** for teachers on their journals.
  - In `GuruJurnal.tsx:1094`, deletion of `jurnal_pembelajaran` only occurs internally when re-submitting rejected journals (`.delete().in('id', matchingIds)`).
  - Backend/PostgREST permissions: `jurnal_pembelajaran` has no mutation block for role `guru` in `checkMasterDataMutationGuard`. Updating and deleting from `jurnal_pembelajaran` via `supabase.from('jurnal_pembelajaran').update(...)` and `.delete().eq('id', ...)` is permitted.

---

## 2. Logic Chain

1. **Premise 1 (Staff TU Role & Identity)**: Staff TU have user role `'tata_usaha'` and are registered in `data_guru` with `mata_pelajaran: 'Tata Usaha (Administrasi)'`. Their menu offers `view-guru-presensi` ("Presensi TU") and `view-guru-jurnal` ("Jurnal Kegiatan"). They do not teach classes and never have schedules in `jadwal_pelajaran`.
2. **Premise 2 (Why TU & Non-KBM Teachers were flagged Bebas Presensi)**:
   - In `AdminConfigView.tsx`, the exemption list (`exemptTeacherIds`, persisted to `wajib_hadir_hanya_mengajar`) treated all entries in `data_guru` identically.
   - When the school configured `Hari_Mengajar_Saja` or toggled "Set Semua Hanya Hari KBM", TU staff and teachers with 0 KBM hours were flagged as exempt (`isTeacherExempt = true`).
   - In `workflow.ts`, any exempt person with 0 KBM hours was classified as `isNonTeachingDay = true` with `lockedReason: 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'`.
3. **Premise 3 (Preserving Daily Attendance for Non-KBM Teachers & TU Staff)**:
   - Staf TU and teachers who must attend daily must have `wajib_hadir_hanya_mengajar = false` (or be protected from KBM-only exemption).
   - In `AdminConfigView.tsx`, the UI must clearly delineate "Guru Hadir Sesuai KBM" vs "Tenaga TU & Guru Wajib Hadir Setiap Hari", ensuring Staff TU and non-KBM staff are never set to "Hanya Hari KBM".
   - In `workflow.ts` and `attendanceAlpa.ts`, Staff TU (role `tata_usaha` or `mata_pelajaran` containing 'tata usaha') must never be marked `isNonTeachingDay` or exempted from daily attendance.
4. **Premise 4 (Implementation Path for R2 - Edit/Delete Jurnal KBM)**:
   - In `src/components/RekapJurnalView.tsx` (or `GuruJurnal.tsx`), role Guru needs:
     a) An "Edit" button and a "Hapus" button per journal entry owned by the teacher (`j.user_id === user.id || j.nama_guru === user.nama`).
     b) A SweetAlert2 confirmation dialog for deletion (`supabase.from('jurnal_pembelajaran').delete().eq('id', j.id)`).
     c) An edit modal or inline editing interface allowing updates to `materi`, `kegiatan`, `tujuan_pembelajaran`, `kktp`, `pertemuan_ke`, `jam_ke`, `catatan_khusus_siswa`, `refleksi`, `link_bukti_foto`, `absensi_siswa`, and `kehadiran_murid`.
     d) Execution without arbitrary time limits ("tanpa batasan waktu khusus"), updating the DB and triggering `tarikRekap()` to refresh the UI immediately.

---

## 3. Caveats

1. **Database RLS / Schema Constraints**:
   - `jurnal_pembelajaran` mutations succeed via the standard Supabase client. If Supabase RLS is enabled on `jurnal_pembelajaran`, policies must allow `UPDATE` and `DELETE` where `auth.uid() = user_id` or service role.
2. **`AdminMonitorView.tsx`**:
   - The user dispatch mentioned `AdminMonitorView.tsx`. Direct filesystem inspection confirmed this file does not exist in the codebase. Active admin views are `AdminRekapView.tsx`, `AdminVerifView.tsx`, `AdminConfigView.tsx`, `AdminPenggunaView.tsx`, `AdminDataView.tsx`, and `AdminBackupView.tsx`.
3. **AST Preservation**:
   - Existing AST markers (e.g. `{/* AST preservation: data-tour={item.id} */}` in `ClaySidebar.tsx` and `AppScreen.tsx`, and comments in `teacherUserSync.ts`) must remain untouched to avoid regression failures on existing test suites.

---

## 4. Conclusion

1. **Verification commands ready**:
   - Typecheck: `npx tsc --noEmit`
   - Lint: `npm run lint`
   - Build: `npm run build`
   - Unit test execution: `npx tsx tests/<test_name>.test.ts`
2. **Requirement R1 Architecture**:
   - In `AdminConfigView.tsx`: Adjust the "Kebijakan Guru" tab to clearly organize attendance rules for teachers with KBM vs Staff TU & teachers without KBM. Prevent Staff TU and non-KBM teachers from being categorized into "Hanya Hari KBM", defaulting/locking them to "Wajib Hadir Setiap Hari".
   - In `workflow.ts` and `attendanceAlpa.ts`: Protect Staff TU and teachers with `wajib_hadir_hanya_mengajar: false` so they are never flagged as `isNonTeachingDay` or "Bebas Kehadiran". Once they clock in with `presensiDatang`, they can submit `jurnalKegiatan` and complete `presensiPulang` normally.
3. **Requirement R2 Architecture**:
   - In `RekapJurnalView.tsx`: Provide Edit and Delete actions for entries created by the logged-in teacher (`j.user_id === user.id || j.nama_guru === user.nama`), with confirmation prompt on delete, full field updating on edit, and reactive state refresh.
4. **Requirement R3 & Git Workflow Compliance**:
   - Changes must remain strictly localized to R1 and R2 without altering unrelated modules.
   - Upon completion, execute `git status`, `git add .`, `git commit -m "..."`, and `git push origin main` as mandated by `GEMINI.md`.

---

## 5. Verification Method

### 5.1 Verification Commands
The implementing worker should run these exact commands in order:
```bash
# 1. Type correctness check
npx tsc --noEmit

# 2. Linting check
npm run lint

# 3. Existing TU and attendance regression test suites
npx tsx tests/tu_refinements_and_admin_rekap.test.ts
npx tsx tests/pulang_cepat_guru_bk_tu.test.ts
npx tsx tests/jurnal_r1_r2_r3_verification.test.ts

# 4. New dedicated verification test for R1 & R2
npx tsx tests/kebijakan_kehadiran_dan_edit_jurnal.test.ts

# 5. Full Next.js production build
npm run build
```

### 5.2 Specific Files to Inspect
1. `src/components/AdminConfigView.tsx`: Tab "kehadiran" (Kebijakan Guru) - clear separation of KBM teachers vs Staff TU / non-KBM teachers.
2. `src/lib/workflow.ts`: Lines 1110-1205 & 1505-1535 - ensure Staff TU and non-KBM daily attendees are never locked out with `isNonTeachingDay: true`.
3. `src/lib/attendanceAlpa.ts`: Lines 377-430 - ensure Staff TU and non-KBM daily attendees are not skipped from daily attendance tracking.
4. `src/components/RekapJurnalView.tsx`: Lines 1425-1555 - presence of Edit and Delete buttons for teacher's own Jurnal KBM entries, with functional delete call and edit modal.

### 5.3 Invalidation Conditions
- Any occurrence of `lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'` for a Staff TU user or a teacher with `wajib_hadir_hanya_mengajar = false`.
- Any ability for a teacher to edit or delete another teacher's journal entry.
- Build failure (`npm run build` non-zero exit) or TypeScript errors (`npx tsc --noEmit` non-zero exit).
