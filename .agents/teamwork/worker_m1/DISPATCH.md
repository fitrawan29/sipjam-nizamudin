## 2026-10-04T07:25:38Z
You are Worker 1 (worker_m1).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1

Read ORIGINAL_REQUEST.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest request at the bottom, 2026-10-04T07:11:46Z).

Read PROJECT.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_13\PROJECT.md

Read the survey handoff from explorer_survey_1 at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\handoff.md

Your exclusive write ownership files (YOU OWN ONLY THESE FILES):
- `src/lib/workflow.ts`
- `src/components/AppScreen.tsx`
- `src/components/PiketView.tsx`
- `src/components/RekapSiswaView.tsx`
DO NOT write to any other source files.

Task: Implement Milestone 1 (R1 & R2):
1. R1: Akses Modul Piket Sesuai Jadwal
   - In `src/lib/workflow.ts`: in `getGuruDailyState`, add check for `penugasan_piket` (query `.from('penugasan_piket').select('*').eq('hari', selectedHari).eq('tipe_petugas', 'Guru')`, filter `sekolah_id` if present, match `guru_id`, `guru_nama`, or `guru_nip`), with fallback to `jadwal_piket`. If matched, set `state.isPiket = true`.
   - In `src/components/AppScreen.tsx`: add state `isPiketHariIni` (Admin & Superadmin = true, Guru checked via `getGuruDailyState`).
   - In `menuItemsGuru`: `{ id: 'view-piket', ... }` only included if `isPiketHariIni === true`.
   - In `handleNavigation`: if `targetId === 'view-piket'`, block non-admin and non-piket teachers with warning Swal.
   - In `currentView === 'view-piket'`: if non-admin and `!isPiketHariIni`, render informative "Akses Terblokir" card.
   - In `src/components/PiketView.tsx`: if `isGuru && dailyState && !dailyState.isPiket && !isAdmin`, render blocked banner / card.

2. R2: Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel
   - In `src/components/AppScreen.tsx`:
     - In `menuItemsGuru`: `{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }` only included if `isWaliKelas === true`.
     - In `handleNavigation`: block `view-rekap-siswa` if non-admin and `!isWaliKelas`.
     - In `currentView === 'view-rekap-siswa'`: pass `assignedKelas={assignedKelas}` to `<RekapSiswaView user={user} assignedKelas={assignedKelas} />`, and block access with UI card if non-admin and non-wali-kelas.
   - In `src/components/RekapSiswaView.tsx`:
     - Accept prop `assignedKelas?: string | null;`
     - If non-admin and non-wali-kelas, render access blocked screen.
     - In Tab 2 (Rekap Absen Siswa): lock the class dropdown! If not Admin, disable/lock the dropdown strictly to the teacher's assigned class (`assignedKelas` / `waliKelasList`), so teachers CANNOT select other classes.
     - In `tarikRekap`: ensure class query is restricted to assigned class when non-admin.
   - Verify `src/components/GuruJurnal.tsx`: ensure teacher's subject attendance during teaching session remains 100% functional and unhindered.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Acceptance verification:
Run `npx tsc --noEmit` and relevant tests. Make sure there are 0 TypeScript errors.
Document all changes and test outputs in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\handoff.md`.
Send a message to parent when completed.
