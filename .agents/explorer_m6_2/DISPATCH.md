## 2026-09-12T04:38:39Z

Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md (specifically section ## 2026-09-12T04:36:57Z).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m6_2\

Investigate:
1. R2. Teacher Dashboard & Interface:
   - Locate teacher dashboard page and components (e.g. src/app/guru/dashboard or similar).
   - Locate where "Aktivitas Utama" component currently lives so it can be removed.
   - Locate personal attendance stats (H, TL, Izin, Sakit) queries and components.
   - Locate jadwal_pelajaran table structure and queries: how to calculate dynamic target journal ratio today ("Jurnal terisi vs Total target yang harus diisi hari ini", where total target is calculated dynamically from number of assigned classes today in jadwal_pelajaran).
   - Locate student attendance calculation per subject taught by the teacher.
   - Locate subject document completion list (perangkat pembelajaran status: uploaded vs not uploaded per subject for this teacher).
2. R3. Admin Dashboard & Verification:
   - Locate admin dashboard page and components (e.g. src/app/admin/dashboard or similar).
   - How to build the daily status matrix mapping each teacher: presensi datang, pengisian jurnal, laporan piket, presensi pulang.
   - Locate Verification page (e.g. src/app/admin/verifikasi or similar).
   - How to add reactive dropdown filters for "Sudah" and "Belum" completing tasks without page reload/flicker.

Deliver a comprehensive report to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m6_2\handoff.md
Maintain progress.md in your working directory.
When done, notify orchestrator via send_message with a summary and report path.
