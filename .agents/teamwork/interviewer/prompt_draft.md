Tambahkan role Tata Usaha (TU) serta susun perintilannya untuk aplikasi SIPJAM dengan pendekatan /ponytail (solusi paling ringkas, sederhana, dan tepat guna tanpa over-engineering) untuk kebutuhan operasional production.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penambahan Role Tata Usaha
Sistem mendukung role `tata_usaha` pada autentikasi, otorisasi, dan manajemen pengguna aplikasi.

### R2. Cakupan Akses dan Navigasi Tata Usaha
Role Tata Usaha memiliki akses operasional hanya untuk mengelola Data Siswa dan Data Guru, serta tidak memiliki akses ke Bank Dokumen / Persuratan, pengaturan konfigurasi sistem, maupun akun superadmin.

### R3. Pendekatan Sederhana dan Minimalis (/ponytail)
Implementasi perintilan dan alur kerja role Tata Usaha harus memanfaatkan struktur dan komponen yang sudah ada di basis kode, tanpa dependensi baru atau abstraksi berlebihan yang tidak perlu.

### R4. Preservasi Fitur dan Logika Eksisting
Perubahan ini tidak boleh mempengaruhi fitur dan logika yang ada pada aplikasi. Seluruh alur kerja untuk role lain (superadmin, admin, guru, dinas_pendidikan, siswa) harus tetap berfungsi secara normal tanpa regresi.

## Verification Resources
- Test suite otomatis yang ada di repository (`npm test` / Vitest).

## Acceptance Criteria

### Autentikasi dan Otorisasi Role
- [ ] Pengguna dengan role `tata_usaha` berhasil login dan diidentifikasi sesuai role dalam sesi aplikasi.
- [ ] Menu navigasi untuk role `tata_usaha` hanya menampilkan akses operasional ke Data Siswa dan Data Guru (tanpa Bank Dokumen / Persuratan).
- [ ] Pengguna dengan role `tata_usaha` ditolak atau dibatasi dari mengakses Bank Dokumen / Persuratan, pengaturan konfigurasi sistem, dan akun superadmin.

### Preservasi dan Integritas Sistem Eksisting
- [ ] Perubahan ini tidak mempengaruhi fitur dan logika yang ada pada aplikasi; seluruh alur kerja untuk role lain tetap berfungsi normal.
- [ ] Automated test suite di repository (`npm test`) berjalan sukses tanpa regresi.
- [ ] Terdapat automated test yang memverifikasi hak akses navigasi dan otorisasi role `tata_usaha`.
