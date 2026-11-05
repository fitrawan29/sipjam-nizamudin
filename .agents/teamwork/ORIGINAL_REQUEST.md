# Original User Request

## Initial Request — 2026-11-04T01:58:33Z

Identifikasi seluruh fitur dan peraturan/validasi bisnis yang hilang akibat penggabungan menu dari versi sebelumnya, serta integrasikan kembali seluruh fitur tersebut (khususnya tanda tangan dan footer pencetakan) ke dalam versi terbaru sipjam-app tanpa merusak struktur konsolidasi menu saat ini.

Integrity mode: development

## Requirements

### R1. Audit dan Identifikasi Fitur serta Peraturan yang Hilang
Lakukan audit komparatif terhadap git history antara versi sebelum penggabungan menu dan versi saat ini untuk menginventarisasi seluruh fitur yang hilang, aturan/validasi bisnis yang tidak terbawa, serta template atau elemen cetak yang hilang.

### R2. Pemulihan Tanda Tangan dan Footer Pencetakan
Sertakan kembali elemen tanda tangan dan footer pencetakan pada seluruh tampilan cetak, laporan, dan rekap di mana elemen tersebut sebelumnya ada sebelum penggabungan menu, dengan memastikan format cetak dan layout tampil sesuai standar pencetakan versi sebelumnya.

### R3. Integrasi Aturan Bisnis dan Fitur ke Menu Konsolidasi
Terapkan kembali seluruh fitur dan peraturan bisnis yang ada pada versi sebelum penggabungan ke dalam menu-menu konsolidasi saat ini, sehingga fungsionalitas dan logika bisnis versi sebelumnya tetap terpenuhi tanpa menghilangkan penyederhanaan menu yang sudah berjalan.

## Acceptance Criteria

### Audit Komparatif
- [ ] Tersedia inventaris lengkap mengenai fitur, aturan bisnis, dan elemen cetak yang ada di commit sebelum penggabungan menu namun belum ada di versi konsolidasi saat ini.

### Tanda Tangan dan Footer Pencetakan
- [ ] Seluruh halaman atau view cetak, laporan, dan rekapitulasi yang sebelumnya memiliki tanda tangan dan footer pencetakan menampilkan kembali elemen tanda tangan dan footer tersebut saat mode cetak/ekspor aktif.
- [ ] Layout pencetakan mencakup nama, jabatan/peran penandatangan, tanggal, dan format footer yang konsisten sesuai versi sebelum penggabungan.

### Aturan Bisnis dan Fitur Terkonsolidasi
- [ ] Seluruh aturan dan validasi bisnis dari versi sebelum penggabungan berfungsi kembali di dalam antarmuka menu yang telah digabungkan.
- [ ] Navigasi dan penggabungan menu yang sudah diterapkan tidak rusak atau mengalami regresi fungsional.

### Verifikasi dan Kualitas
- [ ] Seluruh automated regression test suite yang dibuat untuk memverifikasi fitur, aturan, dan elemen cetak yang dipulihkan berhasil lolos tanpa kegagalan.
- [ ] Tidak ada error saat proses build dan pengujian aplikasi.

## Follow-up — 2026-11-04T02:51:17Z

This is a single self-contained fix; keep it small and focused. Fix the error when importing master data guru from CSV in sipjam-app where "sekolah_id" is null and violates the not-null constraint on the "data_guru" table.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. CSV Import Validation for Data Guru
Update the master data guru CSV import in sipjam-app to require and explicitly validate that `sekolah_id` is present and non-null before attempting database insertion into `data_guru`. Rows missing `sekolah_id` must be caught with a clear validation error rather than triggering an unhandled database constraint violation (PostgreSQL ERROR 23502).

### R2. Minimal Implementation
Apply the simplest, most minimal fix (ponytail approach) to resolve the root cause directly in the CSV import flow without unnecessary complexity or dependencies.

## Acceptance Criteria

### Functional Validation
- [ ] CSV import explicitly checks for the presence of `sekolah_id` prior to database insertion.
- [ ] Importing CSV data with missing `sekolah_id` returns a clear validation error and does not produce PostgreSQL error 23502.
- [ ] Importing valid CSV data containing `sekolah_id` successfully inserts records into `data_guru`.
- [ ] An automated test or verification script verifies both the validation failure on missing `sekolah_id` and successful import when `sekolah_id` is provided.

## Follow-up — 2026-11-05T14:39:25Z

Penyesuaian dan perbaikan fungsionalitas serta tampilan pada role admin di aplikasi Sipjam untuk lingkungan produksi. Pembaruan mencakup perbaikan visual, penyelarasan alur verifikasi presensi/piket/perangkat/jurnal KBM, konfigurasi bobot raport, konsistensi master data, dan pengelolaan akun.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Dashboard Operasional
Pada menu dashboard operasional, perbaiki tampilan teks admin [nama sekolah] agar tidak muncul ganda. Selain itu, hilangkan tampilan bagian pusat informasi dari dashboard operasional.

### R2. Pusat Verifikasi dan Revisi
Pada menu pusat verifikasi dan revisi, hilangkan tampilan pedoman kebijakan dan SOP sipjam. Pada sub menu presensi, urutkan tampilan daftar riwayat dari waktu terbaru ke terlama, tampilkan keterangan "bebas hadir" (tanpa keterangan lainnya) untuk guru yang masuk kategori wajib hadir pada jadwal KBM, serta pastikan status izin sakit dan kategori presensi lainnya tertulis dengan jelas. Pada sub menu piket, guru yang memiliki jadwal piket namun tidak membuat laporan piket langsung ditandai "tidak membuat laporan piket" tanpa perlu konfirmasi lagi dari admin maupun sistem. Pada sub menu perangkat pembelajaran, batasi pengunggahan perangkat pembelajaran untuk setiap mata pelajaran hanya satu kali untuk kelas paralel pada tingkat yang sama. Untuk guru yang telah melakukan presensi dengan status sakit, izin, atau dinas luar dan memiliki jadwal KBM pada hari tersebut (sehingga tidak mengisi jurnal KBM), pastikan keterangan status tersebut (sakit, izin, dinas luar) otomatis diisikan pada jurnal KBM-nya sesuai presensi.

### R3. Laporan Analitik Kerja
Pada sub tabel rekapitulasi di menu laporan analitik kerja, perbaiki tampilan nama guru "Ade Fitrawan Ibrahim" yang muncul ganda: hilangkan entri yang tidak memiliki gelar, dan pada entri yang memiliki gelar, hilangkan gelarnya sehingga hanya tersisa satu entri nama tanpa gelar.

### R4. Asesmen dan Raport Sekolah
Pada menu asesmen dan raport sekolah, tampilkan semester dan tahun pelajaran yang sedang berjalan secara default sesuai dengan pengaturan admin. Sediakan konfigurasi form dinamis pada pengaturan bobot nilai (khususnya kehadiran) agar admin dapat menyesuaikan nilai poin untuk setiap status kehadiran per pertemuan (misalnya hadir 100, sakit/izin/terlambat 75, dan alpa 0).

### R5. Master Data, Kalender, Pengaturan Sistem & Database, dan Pengaturan Akun
Pada menu master data dan kalender, sesuaikan setiap template data yang tersedia dengan skema database agar proses unggah data berjalan lancar tanpa error. Pada menu pengaturan sistem dan database, pastikan setiap perubahan konfigurasi pada setiap sub menunya tersimpan secara persisten ke database dan sistem. Pada menu pengaturan akun, hilangkan fitur atau bidang penambahan gelar.

## Acceptance Criteria

### Dashboard Operasional
- [ ] Teks admin [nama sekolah] pada dashboard operasional tidak terduplikasi.
- [ ] Bagian pusat informasi pada dashboard operasional tidak ditampilkan.

### Pusat Verifikasi dan Revisi
- [ ] Pedoman kebijakan dan SOP sipjam tidak muncul di menu pusat verifikasi dan revisi.
- [ ] Riwayat presensi pada sub presensi berurutan dari waktu terbaru ke terlama.
- [ ] Guru kategori wajib hadir KBM berstatus "bebas hadir" pada presensi tanpa teks tambahan.
- [ ] Status izin sakit dan kategori presensi lainnya tercantum secara jelas pada presensi.
- [ ] Jurnal KBM guru yang berstatus izin, sakit, atau dinas luar pada hari ada jadwal KBM otomatis terisi sesuai keterangan presensinya.
- [ ] Guru piket yang tidak membuat laporan langsung berstatus "tidak membuat laporan piket" tanpa konfirmasi dari admin atau sistem.
- [ ] Pengunggahan perangkat pembelajaran dibatasi maksimal satu kali per mata pelajaran untuk kelas paralel bertingkat sama.

### Laporan Analitik Kerja
- [ ] Tabel rekapitulasi hanya menampilkan satu baris untuk nama guru "Ade Fitrawan Ibrahim" tanpa gelar.

### Asesmen dan Raport Sekolah
- [ ] Semester dan tahun ajaran yang aktif terpilih secara default di menu raport sesuai pengaturan admin.
- [ ] Form pengaturan bobot kehadiran memungkinkan penentuan bobot spesifik per status kehadiran pertemuan.

### Master Data, Pengaturan Sistem, dan Akun
- [ ] File template data pada master data selaras dengan database dan berhasil diunggah tanpa error.
- [ ] Perubahan konfigurasi pada seluruh sub menu pengaturan sistem dan database tersimpan persisten ke sistem dan database.
- [ ] Input/penambahan gelar pada menu pengaturan akun ditiadakan.

### Validasi Sistem
- [ ] Proyek berhasil dikompilasi (build) dan lulus pemeriksaan lint tanpa error regresi.
