# Handoff Report: Milestone 1 (R1 & R2) Implementation

**Agent:** `worker_m1`  
**Milestone:** Milestone 1 (R1 & R2)  
**Date:** 2026-10-04  
**Working Directory:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1`  

---

## 1. Observation

### 1.1. Context & Starting State
- **R1 (Akses Modul Piket Sesuai Jadwal):**
  - In `src/lib/workflow.ts:345-358`, `getGuruDailyState` previously only queried `jadwal_piket` without querying the primary `penugasan_piket` table. If `jadwal_piket` was not synced, `state.isPiket` could evaluate to `false` even if the teacher was assigned.
  - In `src/components/AppScreen.tsx:474`, the sidebar menu item `{ id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' }` was rendered unconditionally for all teachers.
  - In `src/components/AppScreen.tsx:440-444`, `handleNavigation` only checked whether `presensiDatang` was done or `isIzinSakit` was set, but did not check `isPiketHariIni` or `state.isPiket`.
  - In `src/components/AppScreen.tsx:653`, `currentView === 'view-piket'` rendered `<PiketView user={user} />` directly without an access guard.
  - In `src/components/PiketView.tsx:1153`, non-assigned teachers opening `PiketView` were presented with all tabs (Beranda, Scan QR, Rekap) without a blocked access barrier.
- **R2 (Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel):**
  - In `src/components/AppScreen.tsx:480`, `{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }` was displayed to all teachers, regardless of `isWaliKelas`.
  - In `src/components/AppScreen.tsx:406-460`, `handleNavigation` had no check blocking non-wali-kelas teachers from navigating to `view-rekap-siswa`.
  - In `src/components/AppScreen.tsx:681`, `<RekapSiswaView user={user} />` was rendered without passing `assignedKelas` and without an access guard.
  - In `src/components/RekapSiswaView.tsx:8`, the component did not accept `assignedKelas` prop.
  - In `src/components/RekapSiswaView.tsx:1136-1140`, Tab 2 (Rekap Absen Siswa) displayed all classes in `kelasList.map` in a standard selectable dropdown, allowing any teacher to inspect attendance across other classes in the school.
  - In `src/components/RekapSiswaView.tsx:355-400`, `tarikRekap` executed queries using whatever class was selected in `kelas`, with no restriction to the teacher's assigned class.
  - In `src/components/GuruJurnal.tsx:396-440`, subject attendance is loaded independently per teaching session (`jadwal_pelajaran` -> `absensi` and `data_siswa`) and does not rely on `RekapSiswaView`.

---

## 2. Logic Chain

### 2.1. R1: Akses Modul Piket Sesuai Jadwal
1. **Primary Assignment Query in Workflow:**
   - In `src/lib/workflow.ts`, inside `getGuruDailyState`, we query `penugasan_piket` directly where `hari = selectedHari` and `tipe_petugas = 'Guru'` scoped to `sekolah_id`.
   - Matching is verified with `isTeacherPiketMatch`: checking `userId === p.guru_id`, normalized NIP match `username === p.guru_nip`, and bidirectional normalized string token matching for `namaGuru` and `cleanTeacherName`.
   - If matched, `state.isPiket = true`.
   - If not found in `penugasan_piket`, we maintain backward-compatibility by checking `jadwal_piket` via `isGuruDiPiket(piketHariIni.daftar_guru, namaGuru)`.
2. **AppScreen Access Control & Navigation Guards:**
   - In `src/components/AppScreen.tsx`, added `isPiketHariIni` state, initialized to `isAdmin || isSuperadmin`.
   - An asynchronous effect invokes `getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id)` to resolve `isPiketHariIni` dynamically for teachers.
   - `menuItemsGuru` conditionally includes `{ id: 'view-piket', ... }` only when `isPiketHariIni === true`.
   - In `handleNavigation`, if `targetId === 'view-piket'`, non-admin teachers without picket duty today (`!isAdmin && !isSuperadmin && !isPiketHariIni`) are immediately blocked with a warning dialog (`Akses Terblokir: Modul Piket hanya dapat diakses oleh Guru yang bertugas piket pada hari ini.`).
   - In the view rendering section, `currentView === 'view-piket'` renders `<PiketView user={user} />` only if `isAdmin || isSuperadmin || isPiketHariIni`. Otherwise, it renders an informative "Akses Terblokir" lock card with a "Kembali ke Dashboard" button.
3. **PiketView Component-Level Defense:**
   - In `src/components/PiketView.tsx`, if `isGuru && dailyState && !dailyState.isPiket && !isAdmin`, the component renders a prominent "Bukan Jadwal Piket Hari Ini" card, ensuring direct access via deep links or component re-renders is safeguarded.

### 2.2. R2: Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel
1. **Sidebar Menu & Navigation Guard in AppScreen:**
   - In `src/components/AppScreen.tsx`, `menuItemsGuru` conditionally includes `{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }` only when `isWaliKelas === true`.
   - In `handleNavigation`, navigation to `view-rekap-siswa` is blocked with a warning dialog for non-admin and non-wali-kelas users.
   - In the view rendering section, `currentView === 'view-rekap-siswa'` passes `assignedKelas={assignedKelas}` to `<RekapSiswaView user={user} assignedKelas={assignedKelas} />`, and renders an "Akses Terblokir" lock card if the user is neither Admin nor Wali Kelas.
2. **RekapSiswaView Class Locking & Defense-in-Depth:**
   - `RekapSiswaView` accepts prop `assignedKelas?: string | null;`.
   - If `masterLoaded && !isWaliKelasUser`, it renders an access blocked screen.
   - Allowed classes are computed via `allowedClasses = (isAdmin || user?.role === 'Admin') ? kelasList : Array.from(new Set([propAssignedKelas, user?.penugasan?.kelas_binaan, user?.wali_kelas, ...waliKelasList.map(w => w.kelas)].filter(Boolean)))`.
   - In Tab 2 (Rekap Absen Siswa), if the user is not Admin, the class dropdown is locked/disabled strictly to the teacher's assigned class (`allowedClasses`), preventing access to other classes.
   - In `tarikRekap`, `targetKelas` is clamped to `allowedClasses` when not Admin. Any request outside assigned classes is rejected with an error dialog.
3. **Independent Subject Attendance for Subject Teachers:**
   - Verified in `src/components/GuruJurnal.tsx`: teachers' live student attendance during teaching sessions operates on `jadwal_pelajaran` and `absensi` for the specific class taught. Subject teachers retain 100% full attendance management capability during KBM.

---

## 3. Caveats

- **Admin Bypasses:** Admins and Superadmins always retain 24/7 access to all picket modules and all student attendance recaps across all classes.
- **Multiple Class Assignments:** If a teacher is assigned as Wali Kelas for more than one class, `allowedClasses` and the dropdown allow switching between their assigned classes, but never to other classes in the school.
- **No Schema Changes:** All requirements were achieved without adding database migrations or breaking existing multi-tenant constraints.

---

## 4. Conclusion

Milestone 1 (R1 & R2) is fully implemented with genuine, robust logic across all 4 owned files:
- `src/lib/workflow.ts`
- `src/components/AppScreen.tsx`
- `src/components/PiketView.tsx`
- `src/components/RekapSiswaView.tsx`

All acceptance criteria are satisfied:
1. Teachers without picket duty today cannot see or access the Picket module.
2. Teachers with picket duty today can access the Picket module normally.
3. Non-wali-kelas teachers cannot see or access the Student Attendance Recap module.
4. Wali Kelas teachers have access strictly locked to their assigned class.
5. Subject teachers retain full attendance management during KBM in `GuruJurnal`.
6. Admins retain full global access.

---

## 5. Verification Method

### 5.1. Automated Verification Commands
1. **Type Checking:**
   ```powershell
   npx tsc --noEmit
   ```
   *Result:* Exit code 0, 0 errors.

2. **Milestone Test Suites:**
   ```powershell
   npx tsx tests/m4_wali_kelas_guru_sync.test.ts
   npx tsx tests/m3_piket_scanner_kiosk.test.ts
   npx tsx tests/app_screen_integration.test.ts
   npx tsx tests/m6_4_piket_perangkat_broadcast.test.ts
   ```
   *Result:* All tests passed cleanly (100%).

3. **Full Test Suite:**
   ```powershell
   npm test
   ```
   *Result:* All 19 test files passed with 0 failures.

4. **Production Build:**
   ```powershell
   npm run build
   ```
   *Result:* Production build compiled successfully with Turbopack and static page generation.
