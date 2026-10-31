# Original User Request

## Initial Request — 2026-10-31T05:22:33Z

This is a single self-contained fix; keep it small and focused. Perbarui sistem jurnal guru pada sipjam-app agar mendukung opsi upload foto pada jurnal KBM dan jurnal kegiatan, mengizinkan alur presensi pulang tanpa kewajiban mengisi jurnal dengan tetap mematuhi aturan jam pulang, serta menetapkan catatan/keterangan otomatis pada rekap jurnal yang tidak diisi.

Integrity mode: development

## Requirements

### R1. Opsi Upload Foto pada Jurnal KBM dan Jurnal Kegiatan
Sediakan opsi bagi guru untuk mengunggah foto dari penyimpanan perangkat (upload file) selain opsi pengambilan foto langsung via kamera live pada penginputan jurnal KBM dan jurnal kegiatan, di mana pilihan metode pengambilan/pengunggahan foto dikembalikan kepada masing-masing guru.

### R2. Fleksibilitas Presensi Tanpa Kewajiban Mengisi Jurnal
Izinkan pengisian jurnal dilewati sehingga guru yang telah melakukan presensi datang dapat langsung melakukan presensi pulang tanpa harus mengisi jurnal KBM, jurnal kegiatan, maupun jurnal piket terlebih dahulu, dengan tetap mematuhi ketentuan dan validasi aturan jam pulang yang berlaku.

### R3. Catatan Keterangan Otomatis pada Rekap Jurnal
Tampilkan catatan dan keterangan otomatis pada rekap jurnal untuk entri yang tidak diisi oleh guru:
- Pada rekap jurnal piket yang tidak diisi, berikan keterangan baku "tidak membuat laporan piket".
- Pada rekap jurnal KBM yang tidak diisi, berikan keterangan "tidak masuk kelas".
- Pada rekap jurnal kegiatan yang tidak diisi, berikan keterangan "tidak melaksanakan kegiatan apapun".

## Acceptance Criteria

### Penginputan Foto Jurnal
- [ ] Antarmuka penginputan jurnal KBM menyediakan pilihan antara menggunakan kamera langsung (live camera) dan mengunggah berkas foto (upload foto).
- [ ] Antarmuka penginputan jurnal kegiatan menyediakan pilihan antara menggunakan kamera langsung (live camera) dan mengunggah berkas foto (upload foto).
- [ ] Foto hasil unggahan tersimpan dan dapat dimuat serta ditampilkan dengan benar pada detail maupun riwayat jurnal.

### Alur Presensi
- [ ] Guru yang telah tercatat presensi datang dapat melakukan presensi pulang tanpa diwajibkan mengisi jurnal KBM, jurnal kegiatan, atau laporan piket terlebih dahulu.
- [ ] Validasi jam pulang tetap berlaku aktif: guru tidak dapat melakukan presensi pulang mendahului jam/jadwal pulang yang telah ditetapkan sistem.

### Keterangan Rekap Jurnal
- [ ] Rekap jurnal piket secara baku menampilkan keterangan "tidak membuat laporan piket" jika guru piket tidak mengisi laporan/jurnal piket pada hari bersangkutan.
- [ ] Rekap jurnal KBM menampilkan keterangan "tidak masuk kelas" untuk jam pelajaran atau kelas yang tidak diisi jurnalnya.
- [ ] Rekap jurnal kegiatan menampilkan keterangan "tidak melaksanakan kegiatan apapun" jika guru tidak mengisi jurnal kegiatan.

### Verifikasi & Integritas Sistem
- [ ] Tim menyusun skenario verifikasi/uji terprogram atau pengujian fungsional untuk membuktikan alur upload foto, bypass pengisian jurnal pada presensi pulang dengan tetap mematuhi jam pulang, dan penulisan teks otomatis pada rekap jurnal bekerja dengan benar.
- [ ] Aplikasi dapat di-build atau dijalankan tanpa error/regresi pada fitur-fitur terkait.
