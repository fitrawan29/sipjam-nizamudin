# Original User Request

## Initial Request — 2026-11-09T05:08:18Z

Implementasikan role BK (Bimbingan Konseling) dan fitur jurnal khusus BK yang tidak terikat kelas ke dalam aplikasi SIPJAM untuk kebutuhan produksi, dengan memastikan integritas sistem dan tidak merubah fitur atau logika lain yang tidak terdampak.

Integrity mode: development

## Requirements

### R1. Role BK (Bimbingan Konseling) & Kontrol Akses
Sediakan role BK dalam sistem SIPJAM dengan hak akses khusus ke fitur bimbingan konseling. Akses terhadap data jurnal BK dibatasi hanya untuk role BK dan Admin / Kepala Sekolah, dan tidak dapat diakses oleh role guru reguler atau pengguna lain tanpa izin.

### R2. Fitur Jurnal Khusus BK (Tidak Terikat Kelas)
Sediakan fitur jurnal khusus untuk BK yang beroperasi secara independen tanpa terikat pada jadwal pelajaran, mata pelajaran, atau rombel kelas tertentu. Jurnal BK memungkinkan pencatatan aktivitas layanan konseling siswa sesuai alur standar BK sekolah (mencakup siswa terkait, tanggal/waktu kegiatan, jenis layanan/bimbingan, catatan, dan tindak lanjut).

### R3. Non-Regresi Fitur Eksisting
Pastikan penambahan role BK dan fitur jurnal BK ini tidak merubah fitur dan logika lain yang tidak terdampak oleh perubahan ini, termasuk fitur jurnal pembelajaran guru mapel, jadwal pelajaran, presensi/piket, dan otorisasi role lainnya.

## Acceptance Criteria

### Role BK & Akses Kontrol
- [ ] Pengguna dapat memiliki role BK dan dapat login serta mengakses modul atau menu khusus BK.
- [ ] Data jurnal BK hanya dapat diakses dan dikelola oleh role BK dan Admin / Kepala Sekolah, serta terlindungi dari akses oleh guru reguler atau akun lain.

### Fungsionalitas Jurnal BK
- [ ] Pengguna role BK dapat membuat, melihat, memperbarui, dan menghapus (CRUD) entri jurnal BK tanpa memerlukan relasi ke jadwal pelajaran atau jam kelas reguler.
- [ ] Entri jurnal BK dapat mencatat data konseling siswa dengan field informasi standar (identitas siswa, tanggal/waktu bimbingan, jenis/bidang layanan bimbingan, catatan kasus/konseling, dan rencana tindak lanjut).
- [ ] Daftar entri jurnal BK dapat ditampilkan dan dicari/difilter berdasarkan tanggal atau nama siswa.

### Non-Regresi & Kualitas Kode
- [ ] Fitur jurnal pembelajaran guru mapel yang sudah ada tetap berfungsi normal dan tetap terikat jadwal/kelas masing-masing tanpa gangguan.
- [ ] Alur dan fitur eksisting lainnya (jadwal pelajaran, presensi/piket, manajemen user/guru) tetap berjalan normal tanpa error fungsional.
- [ ] Seluruh proses verifikasi standar repo (lint, type-check, dan build) berhasil dijalankan tanpa error.
