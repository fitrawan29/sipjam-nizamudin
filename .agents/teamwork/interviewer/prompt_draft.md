Penyesuaian dan perbaikan fungsionalitas serta tampilan pada role admin di aplikasi Sipjam untuk lingkungan produksi. Pembaruan mencakup perbaikan visual, penyelarasan alur verifikasi presensi/piket/perangkat/jurnal KBM, konfigurasi bobot raport, konsistensi master data, dan pengelolaan akun.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Dashboard Operasional
Pada menu dashboard operasional, perbaiki tampilan teks admin [nama sekolah] agar tidak muncul ganda. Selain itu, hilangkan tampilan bagian pusat informasi dari dashboard operasional.

### R2. Pusat Verifikasi dan Revisi
Pada menu pusat verifikasi dan revisi, hilangkan tampilan pedoman kebijakan dan SOP sipjam. Pada sub menu presensi, urutkan tampilan daftar riwayat dari waktu terbaru ke terlama, tampilkan keterangan "bebas hadir" (tanpa keterangan lainnya) untuk guru yang masuk kategori wajib hadir pada jadwal KBM, serta pastikan status izin sakit dan kategori presensi lainnya tertulis dengan jelas. Pada sub menu piket, guru yang memiliki jadwal piket namun tidak membuat laporan piket langsung ditandai "tidak membuat laporan piket" tanpa perlu konfirmasi lagi dari admin maupun sistem. Pada sub menu perangkat pembelajaran, batasi pengunggahan perangkat pembelajaran untuk setiap mata pelajaran hanya satu kali untuk kelas paralel pada tingkat yang sama. Untuk guru yang telah melakukan presensi dengan status sakit, izin, atau dinas luar dan memiliki jadwal KBM pada hari tersebut (sehingga tidak mengisi jurnal KBM), pastikan keterangan status tersebut (sakit, izin, dinas luar) otomatis diisikan pada jurnal KBM-nya sesuai presensi.

### R3. Laporan Analitik Kerja
Pada sub tabel rekapitulasi di menu laporan analitik kerja, perbaiki tampilan nama guru "Ade Fitrawan Ibrahim" yang muncul ganda: hilangkan entri yang tidak memiliki gelar, dan pada entri yang memiliki gelar, hilangkan gelarnya sehingga hanya tersisa satu entri nama tanpa gelar.

### R4. Asesmen dan Raport Sekolah
Pada menu asesmen dan raport sekolah, tampilkan semester dan tahun pelajaran yang sedang berjalan secara default sesuai dengan pengaturan admin. Sediakan konfigurasi form dinamis pada pengaturan bobot nilai (khususnya kehadiran) agar admin dapat menyesuaikan nilai poin untuk setiap status kehadiran per pertemuan (misalnya hadir 100, sakit/izin/terlambat 75, dan alpa 0).

### R5. Master Data, Kalender, Pengaturan Sistem & Database, dan Pengaturan Akun
Pada menu master data dan kalender, sesuaikan setiap template data yang tersedia dengan skema database agar proses unggah data berjalan lancar tanpa error. Pada menu pengaturan sistem dan database, pastikan setiap perubahan konfigurasi pada setiap sub menunya tersimpan secara persisten ke database dan sistem. Pada menu pengaturan akun, hilangkan fitur atau bidang penambahan gelar.

## Acceptance Criteria

### Dashboard Operasional
- [ ] Teks admin [nama sekolah] pada dashboard operasional tidak terduplikasi.
- [ ] Bagian pusat informasi pada dashboard operasional tidak ditampilkan.

### Pusat Verifikasi dan Revisi
- [ ] Pedoman kebijakan dan SOP sipjam tidak muncul di menu pusat verifikasi dan revisi.
- [ ] Riwayat presensi pada sub presensi berurutan dari waktu terbaru ke terlama.
- [ ] Guru kategori wajib hadir KBM berstatus "bebas hadir" pada presensi tanpa teks tambahan.
- [ ] Status izin sakit dan kategori presensi lainnya tercantum secara jelas pada presensi.
- [ ] Jurnal KBM guru yang berstatus izin, sakit, atau dinas luar pada hari ada jadwal KBM otomatis terisi sesuai keterangan presensinya.
- [ ] Guru piket yang tidak membuat laporan langsung berstatus "tidak membuat laporan piket" tanpa konfirmasi dari admin atau sistem.
- [ ] Pengunggahan perangkat pembelajaran dibatasi maksimal satu kali per mata pelajaran untuk kelas paralel bertingkat sama.

### Laporan Analitik Kerja
- [ ] Tabel rekapitulasi hanya menampilkan satu baris untuk nama guru "Ade Fitrawan Ibrahim" tanpa gelar.

### Asesmen dan Raport Sekolah
- [ ] Semester dan tahun ajaran yang aktif terpilih secara default di menu raport sesuai pengaturan admin.
- [ ] Form pengaturan bobot kehadiran memungkinkan penentuan bobot spesifik per status kehadiran pertemuan.

### Master Data, Pengaturan Sistem, dan Akun
- [ ] File template data pada master data selaras dengan database dan berhasil diunggah tanpa error.
- [ ] Perubahan konfigurasi pada seluruh sub menu pengaturan sistem dan database tersimpan persisten ke sistem dan database.
- [ ] Input/penambahan gelar pada menu pengaturan akun ditiadakan.

### Validasi Sistem
- [ ] Proyek berhasil dikompilasi (build) dan lulus pemeriksaan lint tanpa error regresi.
