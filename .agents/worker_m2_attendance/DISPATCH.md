## 2026-09-17T10:44:38Z

You are worker_m2_attendance, a specialized feature implementation worker.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m2_attendance

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md before starting work.
Also read PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md and survey reports at:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r1r2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1_db\handoff.md

FILE WRITE OWNERSHIP:
You exclusively own:
- src/components/AdminDataView.tsx (Wali Kelas tab/modal and assignment logic)
- src/components/RekapSiswaView.tsx (Wali Kelas attendance input for Izin/Sakit)
- src/components/GuruJurnal.tsx (Attendance synchronization integration)
- src/components/PiketView.tsx (Piket attendance synchronization integration)
- scripts/test-attendance-sync.ts (Automated test script for attendance sync and log_perubahan)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

YOUR MISSION (Milestone 2 - Attendance Synchronization & Wali Kelas):
1. Admin Wali Kelas Assignment in src/components/AdminDataView.tsx:
   - Add a Wali Kelas tab in AdminDataView.tsx.
   - Enable Admin to assign a teacher (data_guru) as Wali Kelas for each class (kelas).
   - Store assignments in public.wali_kelas (sekolah_id, kelas, guru_id, 
ama_guru, 
ip, 	ahun_ajaran).
   - Provide card listing showing each class, the assigned Wali Kelas, and action to Edit/Change or Remove.
2. Wali Kelas Attendance Input in src/components/RekapSiswaView.tsx:
   - If logged in user is a Wali Kelas (check public.wali_kelas where guru_id = user.id or 
ama_guru = user.nama), allow them to input student attendance for their assigned class for any chosen date.
   - Input options: Hadir, Izin, Sakit, Alpa, plus optional notes/keterangan.
   - Save directly to public.absensi setting sumber_perubahan = 'Wali Kelas', diubah_oleh = user.nama, and appending to log_perubahan ([Timestamp] Diubah ke [Status] oleh [User] (Wali Kelas). Keterangan: ...).
3. Absolute Attendance Synchronization in src/components/GuruJurnal.tsx and src/components/PiketView.tsx:
   - In GuruJurnal.tsx: When loading student attendance for a class & date, query public.absensi first so any status previously recorded by Wali Kelas or Piket is automatically populated as the default.
   - When Mapel teacher submits the journal or changes student attendance, upsert into public.absensi with sumber_perubahan = 'Guru Mapel', diubah_oleh = user.nama, and append to log_perubahan.
   - In PiketView.tsx: When Piket records student attendance, upsert into public.absensi with sumber_perubahan = 'Piket', diubah_oleh = user.nama, and append to log_perubahan.
   - The PostgreSQL trigger 	rg_sync_absensi_to_jurnal created in M1 will automatically update all existing jurnal_pembelajaran records for (sekolah_id, tanggal, kelas).
4. Automated Test Script in scripts/test-attendance-sync.ts:
   - Creates/uses a test student and journal session.
   - Updates student attendance (e.g. simulating Piket marking student as Sakit).
   - Verifies that public.absensi record is updated and log_perubahan accurately logs user name and timestamp.
   - Verifies that jurnal_pembelajaran.absensi_siswa JSON is automatically updated with the new status.
   - Cleans up test artifacts and exits with code 0.
5. Verify TypeScript compilation (
px tsc --noEmit) and run the test script (
px tsx scripts/test-attendance-sync.ts).
6. Execute Git workflow (commit & push per GEMINI.md), write handoff.md, and message orchestrator_9.
