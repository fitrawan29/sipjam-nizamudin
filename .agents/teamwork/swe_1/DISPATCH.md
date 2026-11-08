# Dispatch Log

## 2026-11-06T06:36:20Z
This is a single self-contained fix; keep it small and focused. Memperbaiki proses unggah data siswa dari berkas CSV template yang di-download dari aplikasi sesuai data master yang telah diisi agar data berhasil dimuat dan ditampilkan pada tabel master data siswa, tanpa mengubah fitur dan logika lain yang ada di aplikasi yang tidak terdampak.

Integrity mode: development

## Requirements

### R1. Perbaikan Pemrosesan dan Pemuatan Berkas CSV Siswa
Sistem harus memastikan berkas CSV template yang di-download dari aplikasi sesuai dengan data master, serta dapat membaca, memvalidasi, dan mengimpor data dari berkas CSV template siswa yang diunggah (termasuk menangani field opsional seperti nomor telepon yang kosong dan format nilai pada contoh dataset) ke dalam database master siswa, serta memastikan data langsung termuat dan ditampilkan pada tabel master siswa tanpa pesan atau status "tabel ini kosong dan data belum bisa dimuat".

### R2. Preservasi Fitur Eksisting (Zero Regression)
Perbaikan harus terisolasi pada alur unggah dan pemuatan data siswa. Fitur serta logika lain di dalam aplikasi yang tidak terdampak tidak boleh diubah atau mengalami regresi fungsional.

## Acceptance Criteria

### Fungsionalitas Unggah dan Tampilan Master Siswa
- [ ] Berkas CSV template yang di-download dari aplikasi sesuai data master dan diisi (termasuk dataset contoh 200+ siswa yang diberikan pengguna) berhasil diunggah tanpa error pemrosesan.
- [ ] Seluruh baris data siswa yang valid tersimpan ke dalam database dan ditampilkan pada tabel master data siswa.
- [ ] Tabel master data siswa menampilkan data hasil unggahan dan tidak menampilkan status "tabel ini kosong dan data belum bisa dimuat".

### Verifikasi & Preservasi Sistem
- [ ] Pengujian otomatis memverifikasi bahwa template CSV siswa yang diunduh sesuai data master dan penguraian (parsing) serta pemuatan data siswa dari contoh CSV berhasil secara menyeluruh.
- [ ] Seluruh pengujian otomatis proyek yang ada tetap berjalan sukses (passing) tanpa regresi pada modul aplikasi lainnya.


## 2026-11-08T14:11:15Z
This is a single self-contained fix; keep it small and focused. Penambahan fitur admin untuk menentukan kepala sekolah dengan status Plt, Plh, atau Definitif pada aplikasi sipjam-app untuk kebutuhan produksi, di mana selain status definitif, awalan status ditambahkan di depan tulisan kepala sekolah ("Plt. Kepala Sekolah" atau "Plh. Kepala Sekolah") pada seluruh tampilan terkait tanpa mengubah atau mempengaruhi logika dan fitur eksisting.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Konfigurasi Status Kepala Sekolah oleh Admin
Admin dapat mengatur dan menentukan status jabatan Kepala Sekolah melalui antarmuka admin atau pengaturan sekolah dengan tiga pilihan status: Definitif, Plt (Pelaksana Tugas), atau Plh (Pelaksana Harian). Pilihan status ini harus tersimpan secara persisten pada sistem/basis data.

### R2. Penyesuaian Tampilan Label Kepala Sekolah
Pada seluruh tampilan antarmuka dan dokumen cetak yang memuat tulisan "Kepala Sekolah" (termasuk Informasi/Profil Sekolah, cetak dokumen rapor, rekapitulasi presensi, dan lembar tanda tangan):
- Jika status adalah Plt, tampilkan teks: "Plt. Kepala Sekolah".
- Jika status adalah Plh, tampilkan teks: "Plh. Kepala Sekolah".
- Jika status adalah Definitif, tetap tampilkan teks: "Kepala Sekolah" tanpa penambahan status di depan tulisan.

### R3. Preservasi Logika dan Fungsionalitas Eksisting
Perubahan ini tidak boleh merusak, mengubah, atau mendegradasi logika alur kerja dan fungsionalitas yang sudah ada pada aplikasi sipjam-app. Semua fitur eksisting harus tetap berfungsi normal.

### R4. Pengujian Otomatis
Implementasi harus disertai pengujian otomatis (automated unit/integration tests) menggunakan infrastruktur test eksisting di proyek yang memverifikasi:
- Penyimpanan dan pembaruan status kepala sekolah oleh admin.
- Format teks label kepala sekolah untuk status Definitif, Plt, dan Plh pada komponen tampilan dan cetak.
- Integritas fungsionalitas untuk memastikan tidak ada regresi pada modul lain di aplikasi.

## Acceptance Criteria

### Pengaturan Admin Status Kepala Sekolah
- [ ] Tersedia kontrol pemilihan status Kepala Sekolah dengan pilihan Definitif, Plt, dan Plh pada halaman pengaturan/admin.
- [ ] Admin dapat memilih dan menyimpan status Kepala Sekolah, dan nilai status tersimpan secara persisten di database/sistem.

### Format Tampilan Label Kepala Sekolah
- [ ] Ketika status adalah Plt, seluruh tampilan label yang relevan (halaman informasi sekolah, cetak rapor, rekap presensi, dokumen tanda tangan) menampilkan teks "Plt. Kepala Sekolah".
- [ ] Ketika status adalah Plh, seluruh tampilan label yang relevan menampilkan teks "Plh. Kepala Sekolah".
- [ ] Ketika status adalah Definitif, teks label tetap ditampilkan sebagai "Kepala Sekolah" tanpa awalan status tambahan.

### Integritas dan Pengujian Otomatis
- [ ] Automated tests dijalankan dan lulus 100%, memverifikasi logika penentuan status kepala sekolah dan pemformatan teks label.
- [ ] Seluruh test suite eksisting di proyek tetap lulus tanpa kegagalan atau regresi fungsional.
