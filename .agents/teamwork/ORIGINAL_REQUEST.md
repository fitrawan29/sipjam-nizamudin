# Original User Request

## Approved Task Prompt — 2026-11-07T21:45:14Z

Penyesuaian fungsionalitas dan navigasi pada role Tata Usaha (TU), pengelolaan penugasan/pembuatan akun TU oleh Admin, serta pemisahan rekapitulasi presensi per halaman antara Guru dan TU pada role Admin di sipjam-app untuk kebutuhan produksi, menggunakan pendekatan /ponytail (solusi paling ringkas, sederhana, dan tepat guna tanpa over-engineering).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyesuaian Menu Navigasi Role TU
Menu navigasi untuk role Tata Usaha (TU) harus dibatasi dan hanya terdiri dari:
1. Presensi TU
2. Jurnal Kegiatan
3. Asesmen (mode read-only)
4. Rapor (mode read-only)
5. Informasi Sekolah
6. Pengaturan Akun
Menu navigasi lain di luar daftar tersebut tidak boleh ditampilkan untuk role TU.

### R2. Hak Akses Read-Only Asesmen dan Rapor untuk TU
Pengguna dengan role TU dapat melihat dan meninjau data asesmen dan rapor untuk semua tingkatan kelas dan semua guru. Seluruh elemen aksi yang memodifikasi, menambah, mengubah, atau menghapus nilai dan data rapor/asesmen dinonaktifkan atau disembunyikan bagi role TU sehingga murni read-only.

### R3. Pemisahan Halaman Rekap Presensi Guru dan TU pada Role Admin
Ketika Admin menarik atau mencetak rekapitulasi presensi:
1. Daftar presensi antara Guru dan TU disajikan terpisah pada tampilan tabel antarmuka.
2. Saat dokumen dicetak atau diekspor ke PDF/kertas, terdapat pemisah halaman (page-break) yang memastikan daftar Guru dan daftar TU tercetak pada halaman terpisah.

### R4. Pengelolaan dan Penugasan Akun TU oleh Admin
Admin dapat mengelola penugasan akun TU dengan dua mekanisme:
1. Menunjuk akun TU dari data guru yang sudah ada.
2. Membuat akun baru khusus role TU. Untuk pembuatan akun baru TU, formulir pendaftaran wajib mengisi data: NIP, nama lengkap, nomor HP, dan email aktif.

### R5. Preservasi Logika dan Fungsionalitas Eksisting
Perubahan pada role TU dan Admin tidak boleh mempengaruhi, merusak, atau mengubah fungsionalitas dan logika fitur lain yang sudah berjalan di aplikasi.

### R6. Pengujian dan Verifikasi Otomatis
Implementasi harus diverifikasi dengan pengujian otomatis (automated unit/integration tests) yang menguji batasan menu role TU, hak akses read-only asesmen/rapor, alur penunjukan/pembuatan akun baru TU, dan pemisahan rekap presensi guru dan TU.

## Acceptance Criteria

### Navigasi Role TU
- [ ] Pengguna login dengan role TU hanya melihat menu: Presensi TU, Jurnal Kegiatan, Asesmen, Rapor, Informasi Sekolah, dan Pengaturan Akun di navigasi aplikasi.
- [ ] Menu yang diperuntukkan bagi peran lain tidak muncul pada akun TU.

### Hak Akses Read-Only Asesmen & Rapor Role TU
- [ ] Role TU dapat mengakses tampilan Asesmen untuk seluruh tingkatan kelas dan guru tanpa tombol simpan/edit nilai yang aktif.
- [ ] Role TU dapat mengakses tampilan Rapor untuk seluruh tingkatan kelas dan guru dalam mode lihat (read-only) tanpa tombol manipulasi data rapor.

### Pengelolaan Akun Role TU oleh Admin
- [ ] Admin dapat menunjuk TU dari data guru yang ada.
- [ ] Admin dapat membuat akun baru role TU dengan formulir yang mewajibkan input NIP, nama lengkap, nomor HP, dan email aktif.
- [ ] Validasi form pembuatan akun baru TU memastikan keempat field wajib terisi sebelum data tersimpan.

### Rekap Presensi Admin (Guru vs TU)
- [ ] Pada rekap presensi admin, data guru dan data TU terpisah secara visual dalam tabel atau seksi masing-masing.
- [ ] Saat rekap presensi dicetak (print view / print preview), daftar guru dan daftar TU tercetak pada halaman yang terpisah (terdapat page-break yang memisahkan kedua kelompok).

### Integritas dan Pengujian
- [ ] Automated test (misalnya skrip pengujian berbasis Vitest/Jest) dijalankan dan lulus 100%, memverifikasi struktur menu role TU, read-only mode, form/penugasan akun TU, dan pemisahan rekap admin.
- [ ] Fitur presensi, jurnal guru, dan alur aplikasi eksisting lainnya tetap berfungsi normal tanpa regresi.
