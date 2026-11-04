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
