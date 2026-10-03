## 2026-10-03T21:13:50Z
Scope: Milestone 4 (M4) — Laporan Wali Kelas & Sinkronisasi Guru Mapel
1. In `src/components/RekapSiswaView.tsx` (Laporan Wali Kelas):
   - Add a dedicated panel/tab for "Presensi Gerbang Piket" displaying daily gate check-in records from `presensi_siswa`.
   - Multi-tenant isolation: strictly scope queries by `sekolah_id = user.sekolah_id`.
   - For Wali Kelas: automatic filter for their assigned class (`penugasan.kelas_binaan` or `wali_kelas`).
   - For Admin: class selector dropdown.
   - Date picker (default today) to view gate attendance for selected date.
   - Summary cards: Total Siswa, Hadir Datang, Pulang, Belum Scan.
   - Table of students with NISN, Nama, Jam Datang, Jam Pulang, and status badges.
2. In `src/components/GuruJurnal.tsx` (Sinkronisasi Guru Mapel):
   - When a teacher opens the journal and selects a class for today's teaching schedule:
     - Query `presensi_siswa` where `sekolah_id = user.sekolah_id`, `tanggal = today`, `kelas = selectedKelas`, `status = 'datang'`.
     - In the student attendance list ("Live Absensi Murid"), display a gate attendance indicator badge next to each student:
       - `✓ Hadir di Sekolah (Piket ${jam})` (green badge) for students who checked in with Piket
       - `Belum Scan Piket` (gray/amber badge) for students who have not checked in with Piket
     - Add helper button / action "Terapkan Presensi Piket" so teachers can quickly mark gate-present students as 'Hadir' in lesson attendance while retaining ability to make manual adjustments.
   - Multi-tenant isolation: ensure all queries filter by `sekolah_id = user.sekolah_id`.
3. Verification:
   - Run `npx tsc --noEmit` (must pass with 0 errors).
   - Run `npm test` (all test suites must pass).
   - Run `npm run build` (Turbopack production build must pass).
4. Per GEMINI.md:
   a. git status
   b. git add .
   c. git commit -m "feat(attendance): add Wali Kelas gate attendance report and sync to GuruJurnal"
   d. git push origin main
5. Write handoff report to:
   c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m4\handoff.md
6. Use send_message to report completion back to parent.
