# Dispatch Log

## 2026-09-12T04:38:05Z
You are the Project Orchestrator (orchestrator_6).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_6
The project workspace is: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md (see section ## 2026-09-12T04:36:57Z).

The user has requested Milestone 6 with Full Team:
"Melakukan perombakan masif pada dashboard Guru dan Admin, mendesain ulang format cetak dokumen dengan dukungan sakelar orientasi cetak, mengubah sistem manajemen piket dan perangkat pembelajaran, membangun fungsionalitas broadcast pengumuman, serta menambahkan transisi UI yang halus."

Requirements:
1. R1. Penyesuaian Cetak Dokumen (Rekap Jurnal, Rekap Akhir, Presensi Siswa)
- Buat tombol interaktif di antarmuka cetak agar pengguna dapat memilih orientasi (Landscape/Portrait), dan ubah injeksi CSS @page berdasarkan pilihan tersebut.
- Sembunyikan menu bar aplikasi (navbar/sidebar) saat pencetakan dilakukan.
- Blok tanda tangan (Kabupaten, tanggal, jabatan, nama, NIP) diatur rata kiri-kanan (justify) di dalam kontainernya, memastikan setiap elemen memiliki baris sendiri dan tidak tergulung ke bawah.
- Cetak header keterangan rentang waktu data yang ditarik secara dinamis dari filter aplikasi (misal: "Periode: September 2026").
- Pastikan resolusi foto kegiatan pada jurnal dapat dirender dan dicetak dengan jelas tanpa terpotong batas kertas.
- Tabel untuk Presensi Siswa dan Rekap Akhir wajib didesain dengan garis tepi, padding, dan struktur tabel yang sangat profesional.

2. R2. Perombakan Dashboard & Antarmuka Guru
- Hapus komponen lama "Aktivitas Utama".
- Bangun kartu statistik Presensi pribadi (H, TL, Izin, Sakit).
- Tampilkan rasio "Jurnal terisi vs Total target yang harus diisi hari ini" (Total target ini dihitung secara dinamis dari jumlah kelas yang ditugaskan hari ini di jadwal_pelajaran).
- Tampilkan persentase kehadiran siswa pada setiap mata pelajaran yang diampu.
- Tampilkan list/daftar status kelengkapan dokumen yang sudah atau belum diupload untuk setiap mata pelajaran.

3. R3. Perombakan Dashboard & Verifikasi Admin
- Dashboard Admin: Muat rekapitulasi data hari berjalan yang memetakan status setiap guru: presensi datang, pengisian jurnal, laporan piket, dan presensi pulang.
- Halaman Verifikasi: Tambahkan filter dropdown reaktif untuk menyortir dan menampilkan hanya guru yang "Sudah" maupun "Belum" menyelesaikan tugas (presensi, jurnal, piket).

4. R4. Manajemen Piket & Perangkat Pembelajaran (Admin)
- Kelola Piket: Hapus tab "Isi Laporan". Sebagai gantinya, buat fungsionalitas "Penugasan Piket" untuk mengatur penjadwalan/penetapan guru dan siswa piket (tambahkan tabel Supabase baru jika dibutuhkan).
- Perangkat Pembelajaran: Hapus tab "Upload Baru". Ubah tata letak daftar dokumen menjadi sistem kartu matriks per guru (menampilkan mapel mereka beserta indikator dokumen mana yang belum/sudah diunggah).

5. R5. Sistem Informasi (Broadcast) & Transisi UI
- Hapus menu "Pantauan Harian".
- Bangun menu fungsional "Informasi": Sistem pengumuman (broadcast) dua arah/satu arah, lengkap dengan tabel database baru untuk menyampaikan informasi dari admin kepada guru, wali kelas, dan orang tua.
- Integrasikan transisi animasi yang halus (CSS smooth transitions) pada hover tombol, pergantian state komponen, dan navigasi seluruh halaman agar terkesan modern.

Acceptance Criteria:
- Verifikasi Database & Backend:
  * Tersedia migrasi Supabase untuk tabel "Pengumuman/Informasi" dan "Penugasan Piket".
  * Kueri perhitungan "Target Jurnal" di dashboard guru mengambil data jadwal hari ini dengan presisi absolut.
  * Backend aman tanpa TypeScript/tipe error.
- Verifikasi Tampilan & Fungsi:
  * Sakelar orientasi cetak langsung mengubah properti dokumen cetak secara nyata.
  * Filter pada halaman Verifikasi memilah daftar komponen tanpa reload/flicker.
  * Semua komponen antarmuka yang dirombak merespons animasi transisi dengan mulus.

MANDATORY RULES:
1. GEMINI.md Git Workflow Rule: commit and push automatically after changes.
2. AGENTS.md: Next.js conventions, tsc verify.
3. Subagent Management: Create proper directories under `.agents/` for subagents, maintain `plan.md`, `progress.md`, and `handoff.md`.
4. Report back with `send_message` when all tasks are complete and verified.
