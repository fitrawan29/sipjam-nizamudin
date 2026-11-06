# Original User Request

## Initial Request — 2026-11-05T23:50:25Z

Menambahkan sub menu Kelas pada menu master data untuk role admin serta memusatkan penentuan/alokasi kelas siswa di menu ini. Menyelaraskan seluruh template master data (Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, Wali Kelas) dengan skema database agar berkas CSV yang diunduh dan diunggah dapat terbaca serta tersimpan dengan tepat, tanpa mengubah logika atau fitur lain yang tidak terdampak.

Integrity mode: development

## Requirements

### R1. Sub Menu Kelas dan Pemusatan Penentuan Kelas Siswa
Pada role admin di menu master data, sediakan sub menu Kelas yang menampilkan daftar kelas dan memusatkan pengelolaan alokasi/penentuan kelas dari setiap siswa di menu ini. Pengguna admin dapat mengelola kelas serta menetapkan atau memindahkan siswa ke kelas tertentu secara terpusat dari sub menu ini.

### R2. Penyelarasan Template Master Data dengan Skema Database
Seluruh template master data yang memiliki fitur unduh dan unggah (Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, dan Wali Kelas) harus diselaraskan secara presisi dengan skema database yang berlaku. Header kolom dan format data pada template harus sesuai dengan definisi kolom tabel target sehingga berkas hasil unduhan template siap diisi dan diunggah.

### R3. Pemrosesan dan Kompatibilitas Unggah CSV
Mekanisme pembacaan dan impor berkas CSV master data harus memproses berkas template yang diisi pengguna secara akurat ke database yang ada. Validasi data dan feedback proses unggah harus memastikan data tersimpan dengan benar tanpa ada kegagalan pembacaan kolom maupun kesalahan pemetaan field.

### R4. Batasan Non-Regresi (Preservasi Fitur Eksisting)
Penambahan fitur maupun perubahan kode pada master data tidak boleh mengubah atau merusak fitur dan logika lain yang tidak terdampak dalam aplikasi. Fungsionalitas eksisting pada modul admin, guru, jadwal, presensi, serta alur kerja yang sudah berjalan harus tetap berfungsi normal.

## Acceptance Criteria

### Sub Menu Kelas & Manajemen Siswa
- [ ] Sub menu Kelas dapat diakses oleh role admin pada menu master data.
- [ ] Daftar kelas ditampilkan dan terdapat mekanisme untuk menetapkan atau memperbarui kelas siswa langsung dari sub menu ini.
- [ ] Data penentuan kelas siswa yang diperbarui tersimpan dengan konsisten pada database dan terefleksi di aplikasi.

### Template Master Data & Impor CSV
- [ ] Tersedia opsi unduh template CSV untuk entitas Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, dan Wali Kelas yang strukturnya sesuai skema database.
- [ ] Berkas CSV dari seluruh template master data berhasil diunggah, diparsing, dan disimpan ke tabel database terkait tanpa kegagalan pemetaan kolom.
- [ ] Seluruh dataset uji / sampel CSV yang valid dapat terbaca dan terimpor dengan benar.

### Integritas Sistem & Preservasi Fitur (Zero Regression)
- [ ] Penambahan fitur dan perubahan yang dilakukan tidak merubah fitur lain dan logika lain yang tidak terdampak pada perubahan ini.
- [ ] Seluruh pengujian otomatis proyek yang ada (`npm test`) tetap lulus tanpa adanya kegagalan regresi (zero regression).
