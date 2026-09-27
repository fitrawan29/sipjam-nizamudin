## 2026-09-27T11:26:31Z

You are the SWE Light Orchestrator (teamwork_preview_swe).

Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_2
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Read the user request from: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section under ## 2026-09-27T11:26:31Z).

User Request Details:
This is a single self-contained fix; keep it small and focused.
Identifikasi dan perbaiki bug login untuk akun super admin dan guru, serta perbaiki masalah sinkronisasi data yang tidak update (tidak sesuai dengan database) setelah sesi dibiarkan idle/tidak login dalam waktu lama. Terapkan prinsip Ponytail (pilih solusi paling sederhana dan minimal, utamakan fitur bawaan framework tanpa dependensi baru).

Requirements:
- R1. Perbaikan Login (Super Admin & Guru):
  Baca dan pahami alur autentikasi yang ada saat ini. Identifikasi penyebab gagal login untuk role 'super admin' dan 'guru', lalu terapkan perbaikan yang paling sederhana dan minimal (Ponytail mode).
- R2. Perbaikan Sinkronisasi Data (Stale Data):
  Selidiki akar masalah mengapa data yang ditampilkan tidak sesuai dengan database setelah pengguna dibiarkan idle/tidak login dalam waktu lama. Terapkan mekanisme yang tepat (misalnya pembersihan cache, invalidasi state, atau penanganan token expired) dengan memanfaatkan fitur bawaan framework.

Acceptance Criteria:
- [ ] Verifikasi login sebagai 'super admin' berhasil dilakukan setelah perbaikan.
- [ ] Verifikasi login sebagai 'guru' berhasil dilakukan setelah perbaikan.
- [ ] Verifikasi setelah sesi berakhir atau di-simulate idle dalam waktu lama, aplikasi mengambil data terbaru dari database (tidak menampilkan data lama dari cache).
- [ ] Perbaikan dievaluasi berdasarkan kesederhanaan (tidak ada boilerplate berlebihan atau dependensi baru).

Special Instructions:
- Follow the Git Workflow Rule defined in GEMINI.md: Whenever completing file modifications/additions/deletions, check git status, stage changes (git add .), commit with a descriptive message, and push to the active origin branch automatically.
- Maintain progress.md and BRIEFING.md in your working directory.
- When complete, write your handoff.md and send a completion message back with the handoff path and summary.
