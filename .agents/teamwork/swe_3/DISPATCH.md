## 2026-09-27T14:28:20Z

You are the SWE Light Orchestrator (teamwork_preview_swe).

Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_3
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Read the user request from: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section under ## 2026-09-27T14:28:20Z).

User Request Details:
Fitur Sistem Blok: Membuat fitur manajemen sistem blok waktu. Rentang waktu yang diblokir akan menandakan bahwa tidak ada jadwal mengajar reguler, melainkan digantikan oleh kegiatan khusus. Selama periode ini, guru hanya bertugas mengisi jurnal kegiatan.
Ini adalah tugas yang relatif terisolasi, gunakan tim kecil yang fokus.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

Requirements:
- R1. Halaman Manajemen Sistem Blok (CRUD):
  Buat halaman (UI) untuk mengelola (menambah, mengedit, menghapus) periode sistem blok. Data yang disimpan minimal mencakup tanggal mulai, tanggal selesai, dan nama/deskripsi kegiatan.
- R2. Penyesuaian Tampilan Jadwal:
  Modifikasi tampilan jadwal mengajar. Jika suatu rentang waktu masuk dalam periode sistem blok yang aktif, jadwal reguler di database tidak boleh dihapus, namun di UI jadwal tersebut harus disembunyikan/ditutupi dan diganti dengan informasi kegiatan blok.
- R3. Jurnal Kegiatan Guru:
  Selama rentang waktu sistem blok, alur pengisian jurnal guru harus disesuaikan. Guru hanya perlu/bisa mengisi "jurnal kegiatan" untuk periode tersebut, bukan jurnal absensi/mengajar kelas reguler.
- R4. Batasan Implementasi:
  Gunakan komponen UI dan styling yang sudah ada di dalam project (jangan install library eksternal baru). Ikuti prinsip minimalis (hanya buat apa yang benar-benar dibutuhkan agar fitur ini jalan).

Acceptance Criteria:
- Manajemen Blok (R1):
  - [ ] Terdapat form untuk menambahkan periode blok baru yang menyimpan data ke database.
  - [ ] Daftar periode blok yang sudah dibuat dapat dilihat dan dihapus/diedit.
- Tampilan Jadwal (R2):
  - [ ] Jadwal mengajar reguler yang bertabrakan dengan tanggal blok tidak ditampilkan seperti biasa.
  - [ ] Halaman jadwal menampilkan informasi kegiatan blok pada tanggal-tanggal yang terpengaruh.
  - [ ] Data jadwal asli di database terbukti tidak terhapus.
- Jurnal Kegiatan (R3):
  - [ ] Terdapat form atau penyesuaian UI agar guru dapat mengisi jurnal kegiatan (bukan jurnal reguler) pada hari yang masuk dalam periode blok.

Special Instructions:
- Follow the Git Workflow Rule defined in GEMINI.md: Whenever completing file modifications/additions/deletions, check git status, stage changes (git add .), commit with a descriptive message, and push to the active origin branch automatically.
- Maintain progress.md and BRIEFING.md in your working directory.
- When complete, write your handoff.md and send a completion message back with the handoff path and summary.
