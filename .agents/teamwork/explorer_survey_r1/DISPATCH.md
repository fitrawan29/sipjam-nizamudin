## 2026-11-11T03:05:12Z
You are an Explorer agent for SIPJAM app codebase.
Your state folder is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Read the original user request at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Your task is to investigate Requirement R1 thoroughly:
"R1. Penyesuaian di Pengaturan Admin Kebijakan Guru untuk Guru dan Staf TU Tanpa Jam KBM
Periksa kembali dan sesuaikan pengaturan di menu pengaturan admin kebijakan guru. Pastikan kebijakan bagi guru yang hadir sesuai KBM dan hadir setiap hari teratur dengan jelas di sini, sehingga guru dan staf TU yang tidak memiliki jam KBM tidak terbaca bebas presensi; mereka tetap harus melakukan presensi datang, mengisi laporan piket (jika bertugas piket), mengisi jurnal kegiatan, dan melakukan presensi pulang."

Investigate:
1. Where the admin settings menu for teacher attendance policy is located (look in `src/components/`, `src/app/`, etc. for "kebijakan guru", "pengaturan", etc.).
2. How the policy "hadir sesuai KBM" vs "hadir setiap hari" is stored in the database (`pengaturan` table or similar) and how it is edited/saved by admin.
3. Where and how "bebas presensi" is computed or displayed in the codebase (search for "bebas presensi", "Bebas Presensi", schedule checks, KBM checks, `jadwal_pelajaran`, etc.).
4. What happens when a teacher or TU staff has no KBM on a given day (or has no KBM at all). Why do they get marked or treated as "bebas presensi"?
5. What exact changes are required in the admin policy settings UI and in the presensi workflow so that:
   a. The admin settings page clearly defines/regulates attendance rules for teachers and TU staff without KBM.
   b. Teachers and TU staff without KBM are NOT treated as "bebas presensi", but are required to perform:
      - Presensi datang
      - Laporan piket (if scheduled/assigned as piket)
      - Jurnal kegiatan (check what "jurnal kegiatan" means in this codebase vs "jurnal KBM/pembelajaran")
      - Presensi pulang
6. Document all relevant files, component names, line numbers, database tables/columns, functions, and a proposed minimal code change plan.

Write your complete findings and verified evidence to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1\handoff.md
Update your progress in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1\progress.md.
When finished, send a brief message to the orchestrator referencing the handoff path.
