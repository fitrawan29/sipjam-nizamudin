# Original User Request

## Initial Request — 2026-11-02T12:24:20Z

Sesuaikan fitur sistem blok pada aplikasi Sipjam untuk kebutuhan produksi agar lebih fleksibel, dengan menyediakan opsi target pemblokiran per aturan (keseluruhan sekolah, per angkatan, per kelas, atau per guru) serta opsi rentang hari dan rentang jam.

Integrity mode: development

## Requirements

### R1. Fleksibilitas Pilihan Target Pemblokiran
Menyediakan pilihan cakupan target pemblokiran pada setiap aturan sistem blok, di mana pengguna dapat memilih salah satu tipe target:
- Keseluruhan sekolah
- Angkatan tertentu
- Kelas tertentu
- Guru tertentu

### R2. Fleksibilitas Pengaturan Rentang Hari dan Jam
Mendukung pengaturan rentang tanggal (tanggal mulai s/d selesai) serta opsi pembatasan rentang jam tertentu pada pemblokiran. Apabila rentang jam tidak dibatasi, pemblokiran berlaku penuh sepanjang hari secara default.

### R3. Dampak Pemblokiran pada Jadwal dan Jurnal
Jadwal pelajaran yang berada dalam rentang target dan waktu yang diblok harus di-masking / ditandai sebagai kegiatan blok, dan guru yang terdampak mengisi jurnal kegiatan blok sesuai alur kerja sistem blok yang ada.

## Verification Resources
- Test suite yang sudah ada: `tests/sistem_blok_verification.test.ts`. Perluas dan jalankan test suite ini untuk memverifikasi fungsionalitas target (kelas, angkatan, guru, keseluruhan) dan rentang jam baru.

## Acceptance Criteria

### Konfigurasi Target Blok
- [ ] Pengguna dapat membuat dan memperbarui aturan blok dengan memilih salah satu tipe target: Keseluruhan Sekolah, per Angkatan, per Kelas, atau per Guru.
- [ ] Penyimpanan data sistem blok berhasil menyimpan atribut target pemblokiran yang dipilih.

### Pengaturan Waktu Pemblokiran
- [ ] Pengguna dapat menentukan tanggal mulai dan tanggal selesai pemblokiran.
- [ ] Pengguna dapat menentukan rentang jam pemblokiran tertentu.
- [ ] Pemblokiran tanpa batasan jam berlaku penuh sepanjang hari pada rentang tanggal tersebut.

### Integrasi Jadwal & Jurnal
- [ ] Jadwal pelajaran yang terdampak oleh pemblokiran (sesuai kelas, angkatan, guru, atau keseluruhan sekolah pada rentang hari dan jam yang aktif) tertutupi/di-masking sebagai kegiatan blok.
- [ ] Jadwal di luar target atau di luar rentang jam yang diblok tetap berjalan normal dan tidak terpengaruh.
- [ ] Guru yang terdampak oleh aturan blok dapat mengisi jurnal kegiatan blok.

### Verifikasi Otomatis
- [ ] Script pengujian `tests/sistem_blok_verification.test.ts` diperbarui untuk mencakup skenario pengujian baru (pemblokiran per kelas, per angkatan, per guru, keseluruhan, serta rentang jam).
- [ ] Seluruh skenario pengujian dalam `tests/sistem_blok_verification.test.ts` berjalan dan lulus tanpa kegagalan (0 failed).
