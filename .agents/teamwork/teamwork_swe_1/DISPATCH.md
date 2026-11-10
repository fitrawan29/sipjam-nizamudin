# Dispatch History

## 2026-11-10T01:11:53Z

This is a single self-contained fix; keep it small and focused. Tambahkan fitur export data berformat CSV pada setiap tab Master Data yang ada (Siswa, Kelas, Mapel, Guru, Jadwal Pelajaran, Wali Kelas, Pengguna, Kalender Pendidikan, dan Sistem Blok) pada aplikasi SIPJAM tanpa mempengaruhi fungsionalitas dan logika eksisting.

Integrity mode: demo
The team must NOT: use pre-built libraries or frameworks for core functionality

## Requirements

### R1. Fitur Export Data CSV pada Master Data
Menambahkan fitur export data berformat CSV (.csv) untuk seluruh data pada setiap tab Master Data yang aktif (Siswa, Kelas, Mapel, Guru, Jadwal Pelajaran, Wali Kelas, Pengguna, Kalender Pendidikan, dan Sistem Blok). Pengguna yang berwenang dapat mengunduh data dalam bentuk file CSV dengan struktur kolom yang sesuai dan nama file yang deskriptif.

### R2. Preservasi Fungsionalitas Eksisting & Zero Regression
Perubahan ini tidak boleh mempengaruhi fitur, alur kerja, validasi, dan logika yang sudah ada pada aplikasi SIPJAM (seperti penambahan data, pengubahan, penghapusan, filter, pencarian, import data, dan hak akses).

### R3. Implementasi Minimal dan Tanpa Dependensi Tambahan (/ponytail)
Implementasi fitur export harus seringkas dan seminimal mungkin dengan memanfaatkan fitur native browser (seperti Blob/URL/CSV generator sederhana) atau utilitas yang sudah ada di codebase. Dilarang menambahkan dependensi/library pihak ketiga baru ke dalam proyek.

## Acceptance Criteria

### Fungsionalitas Export CSV
- [ ] Tersedia tombol atau opsi export CSV yang jelas dan mudah diakses pada setiap tampilan tab Master Data (Siswa, Kelas, Mapel, Guru, Jadwal Pelajaran, Wali Kelas, Pengguna, Kalender Pendidikan, dan Sistem Blok).
- [ ] Mengklik tombol export memicu download file berformat `.csv` dengan header kolom yang sesuai dengan data pada tab tersebut.
- [ ] Data baris pada file CSV terisi lengkap dan akurat sesuai data yang ada pada tab terkait, dengan penanganan karakter khusus (seperti koma dan tanda kutip) yang tepat.

### Preservasi Fungsionalitas & Non-Regresi
- [ ] Seluruh fungsi master data eksisting (tambah, edit, hapus, filter, pencarian, import) tetap berjalan normal tanpa error atau degradasi fungsi.
- [ ] Tidak ada penambahan package/dependensi baru pada `package.json`.

### Verifikasi Otomatis
- [ ] Tersedia skrip automated test mandiri yang memverifikasi pembentukan data export CSV pada masing-masing tab Master Data.
- [ ] Seluruh automated test berjalan sukses (pass) tanpa menyebabkan kegagalan pada pengujian regresi eksisting.
