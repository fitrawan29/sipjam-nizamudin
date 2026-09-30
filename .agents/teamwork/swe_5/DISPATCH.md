# DISPATCH — 2026-09-29T04:04:50Z

You are the SWE Light Orchestrator (teamwork_preview_swe).

Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_5
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Read the user request from: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section under ## 2026-09-29T04:04:50Z).

User Request Details:
Tambahkan fitur opsional "Guru Inval" (substitute teacher) pada form Jurnal Pembelajaran agar guru pengganti dapat mengajar di luar jadwalnya dengan memilih guru yang digantikan.
This is a single self-contained feature; keep it small and focused.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

Requirements:
- R1. UI Mode Guru Inval:
  Pada `src/components/GuruJurnal.tsx`, tambahkan toggle/checkbox "Saya sebagai Guru Inval".
- R2. Pilihan Guru yang Digantikan & Data Dinamis:
  Jika mode Inval aktif, munculkan dropdown yang berisi daftar semua guru (diambil dari tabel `data_guru`). Ketika seorang guru dipilih, ambil jadwal mapel & kelas dari guru tersebut (melalui tabel `guru_mapel`) dan tampilkan di pilihan Mapel & Kelas, menimpa pilihan default guru yang sedang login.
- R3. Penyimpanan Tanpa Migrasi (Ponytail Style):
  Saat form disubmit dalam mode Inval, sisipkan teks `[INVAL - Menggantikan: {Nama Guru}] ` di bagian awal kolom `keterangan` (atau di bagian deskripsi jika `keterangan` digabung). JANGAN membuat kolom baru di database atau melakukan migrasi skema.

Acceptance Criteria:
- [ ] Toggle Inval berhasil memunculkan dropdown berisi daftar nama guru dari sekolah yang sama.
- [ ] Memilih nama guru di dropdown akan mengubah opsi Mapel dan Kelas sesuai dengan jadwal guru yang dipilih.
- [ ] Jika mode Inval dimatikan, opsi Mapel dan Kelas kembali ke jadwal asli guru yang sedang login.
- [ ] Data berhasil tersimpan ke tabel `jurnal_pembelajaran` dengan format keterangan yang mengandung teks `[INVAL - Menggantikan: ...]`.
- [ ] Verifikasi Objektif (Forcing Function): Agen verifikator harus dapat login sebagai seorang Guru, mengaktifkan toggle Inval, memilih guru lain, mensubmit jurnal, dan memverifikasi secara langsung (lewat query Supabase atau UI) bahwa baris baru di `jurnal_pembelajaran` memiliki awalan `[INVAL - Menggantikan:` pada keterangannya.

Special Instructions & Constraints:
- Respect GEMINI.md git workflow rule: Whenever completing file modifications/additions/deletions, check git status, stage changes (git add .), commit with a descriptive message, and push to the active origin branch automatically.
- Respect AGENTS.md rules for Next.js.
- Maintain progress.md and BRIEFING.md in your working directory.
- Dispatch one implementer (teamwork_preview_implementer) on the whole task, then repeated reviewer rounds (teamwork_preview_reviewer) with automated test verification.
- When done, write handoff.md in your working directory and notify the sentinel with the completion summary and handoff path.
