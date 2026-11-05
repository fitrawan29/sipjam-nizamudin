# Original User Request

## Initial Request — 2026-11-05T21:44:53Z

This is a single self-contained fix; keep it small and focused. Pada role admin, pada menu master data dan kalender, tambahkan sub menu pengguna untuk mengatur username dan password setiap akun guru yang ditarik otomatis dari data guru yang ada, dengan username NIP dan password default NIP27.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Sub Menu Pengguna pada Menu Master Data dan Kalender
Pada navigasi role admin di bawah menu master data dan kalender, tambahkan sub menu "Pengguna" yang hanya dapat diakses oleh admin.

### R2. Penarikan Otomatis Akun dari Data Guru
Data akun pada sub menu pengguna ditarik secara otomatis dari data guru yang ada di sistem dengan role pengguna sebagai guru. Setiap akun guru memiliki username awal berupa NIP dan password default berupa NIP27.

### R3. Manajemen Kredensial Pengguna oleh Admin
Admin dapat mengelola, melihat daftar, serta memperbarui username dan password setiap akun guru melalui antarmuka sub menu pengguna.

### R4. Integritas dan Non-Regresi Fitur Eksisting
Penyesuaian ini tidak mempengaruhi fitur dan logika lain yang tidak terdampak; seluruh modul dan alur kerja aplikasi yang sudah ada tetap berfungsi normal.

## Acceptance Criteria

### Navigasi dan Hak Akses
- [ ] Sub menu Pengguna muncul di bawah menu Master Data dan Kalender saat login sebagai admin.
- [ ] Sub menu Pengguna tidak dapat diakses atau dilihat oleh role non-admin.

### Sinkronisasi Akun Otomatis dan Kredensial Default
- [ ] Seluruh data guru yang ada di sistem otomatis terdaftar sebagai akun pengguna dengan role guru.
- [ ] Akun guru baru yang ditambahkan memiliki username sesuai NIP dan password default NIP27.

### Manajemen Kredensial oleh Admin
- [ ] Admin dapat memperbarui username dan password akun guru melalui antarmuka sub menu Pengguna.
- [ ] Kredensial baru yang diperbarui berhasil disimpan ke database dan dapat digunakan untuk autentikasi login.
- [ ] Automated tests (unit/integration) dan verifikasi fungsional untuk fitur sub menu pengguna berhasil dijalankan tanpa error.

### Integritas Sistem dan Non-Regresi
- [ ] Penyesuaian ini tidak mempengaruhi fitur dan logika lain yang tidak terdampak; seluruh fitur yang sudah ada sebelumnya tetap berfungsi normal tanpa regresi.
- [ ] Seluruh automated test suite yang sudah ada sebelumnya tetap lolos (pass) tanpa error.
