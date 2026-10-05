# PANDUAN LENGKAP PENGGUNAAN SIPJAM
## Dokumentasi Tutorial Fitur Berdasarkan Peran Pengguna (Guru, Administrator, Superadmin)

Dokumentasi ini mencakup seluruh 28 menu dan fitur aplikasi SIPJAM secara terperinci.

---

### TABEL MENU DAN HAK AKSES PERAN

| No | Nama Menu | View ID | Peran Akses | Keterangan & Syarat Akses |
|---|---|---|---|---|
| 1 | Dashboard Guru | `view-home` | Guru | Ringkasan 4 langkah kerja harian & jadwal mengajar |
| 2 | Presensi Guru | `view-guru-presensi` | Guru | Presensi selfie potret 1:1, GPS geofence, izin/sakit |
| 3 | Jurnal Pembelajaran | `view-guru-jurnal` | Guru | Jurnal KBM 10 field, Guru Inval, Sistem Blok |
| 4 | Jurnal Kelas | `view-jurnal-kelas` | Guru / Admin | Khusus Wali Kelas & Administrator |
| 5 | Modul Piket Guru | `view-piket` | Guru | Khusus guru dengan jadwal piket hari ini |
| 6 | Perangkat Pembelajaran | `view-dokumen` | Guru / Admin | Repositori administrasi ajar (CP, ATP, Modul Ajar) |
| 7 | Daftar Nilai | `view-gradebook` | Guru / Admin | Buku nilai asesmen formatif & sumatif per TP |
| 8 | Informasi & Siaran | `view-informasi` | Guru / Admin | Pengumuman sekolah & diskusi interaktif |
| 9 | Riwayat Aktivitas | `view-history` | Guru | Arsip presensi & log jurnal KBM masa lalu |
| 10 | Rekap Jurnal Guru | `view-guru-rekap-jurnal` | Guru | Cetak rekap jurnal bulanan resmi format 10 kolom |
| 11 | Presensi Siswa | `view-rekap-siswa` | Guru / Admin | Khusus Wali Kelas & Administrator |
| 12 | Dashboard Administrator | `view-home` | Admin | Statistik kehadiran & keterlambatan real-time |
| 13 | Pusat Verifikasi | `view-admin-verif` | Admin | Persetujuan izin/sakit/terlambat & telaah perangkat |
| 14 | Manajemen Sistem Blok | `view-sistem-blok` | Admin | Periode kegiatan khusus pengganti KBM reguler |
| 15 | Kelola Piket | `view-piket` | Admin | Penjadwalan piket Senin-Sabtu & pengawasan presensi |
| 16 | Analitik Kedisiplinan | `view-analitik` | Admin | Grafik keterlambatan & Leaderboard Guru Terdisiplin |
| 17 | Rekap Akhir Bulanan | `view-admin-rekap` | Admin | Master rekapitulasi kehadiran dinas/yayasan (Cetak/Excel) |
| 18 | Master Data Sekolah | `view-admin-data` | Admin | Kelola Siswa, Guru, Mapel, Libur, Jadwal, Wali Kelas |
| 19 | Akses Data & Backup | `view-admin-backup` | Admin | Cadangkan data & integrasi Google Spreadsheet |
| 20 | Sistem Konfigurasi | `view-admin-config` | Admin | Atur jam kerja, geofence GPS, dan profil sekolah |
| 21 | Ringkasan Platform | `view-superadmin-overview` | Superadmin | Statistik ekosistem multi-tenant platform |
| 22 | Kelola Sekolah | `view-superadmin-sekolah` | Superadmin | Daftarkan sekolah, atur lisensi & kebijakan fitur |
| 23 | Admin Sekolah | `view-superadmin-admins` | Superadmin | Buat & kelola akun Administrator sekolah |

---

## I. PANDUAN PENGGUNA: ROLE GURU

### 1. Dashboard (`view-home`)
- **Tujuan**: Memantau aktivitas harian dan jadwal mengajar.
- **Langkah-langkah**:
  1. Periksa kartu **4 Langkah Kerja Harian**:
     - *Presensi Datang*: Muncul centang hijau jika Anda sudah melakukan absensi datang.
     - *Jurnal Pembelajaran*: Muncul centang hijau jika Anda telah mengisi jurnal KBM hari ini.
     - *Laporan Piket*: Muncul jika Anda terjadwal sebagai guru piket hari ini.
     - *Presensi Pulang*: Tombol menjadi aktif setelah jam pulang sekolah tiba.
  2. Periksa kartu **Akumulasi Keterlambatan** untuk memantau kedisiplinan jam datang bulan berjalan.
  3. Tinjau tabel **Jadwal Mengajar Hari Ini** untuk melihat kelas dan mata pelajaran yang harus diajarkan.

### 2. Presensi Guru (`view-guru-presensi`)
- **Tujuan**: Mencatat kehadiran harian atau mengajukan izin resmi.
- **Langkah-langkah**:
  1. Pastikan izin akses Lokasi (GPS) dan Kamera telah aktif pada peramban/smartphone Anda.
  2. Buka menu **Presensi Guru**.
  3. Pilih status kehadiran:
     - **Hadir Datang**: Ambil foto selfie tegak (kamera potret 1:1 tanpa zoom) saat berada di lingkungan sekolah (dalam radius GPS geofence).
     - **Hadir Pulang**: Ambil foto selfie kepulangan setelah batas jam pulang sekolah tercapai.
     - **Izin / Sakit / Dinas Luar**: Unggah foto surat keterangan atau surat tugas dan ketikkan keterangan alasan.
     - **Izin Terlambat**: Masukkan alasan darurat keterlambatan untuk diverifikasi Administrator.
  4. Klik tombol **Kirim Presensi**.
  - *Catatan Offline*: Jika jaringan internet terputus, sistem akan menyimpan rekaman presensi ke antrean lokal browser dan menyinkronkannya otomatis saat online kembali.

### 3. Jurnal Pembelajaran (`view-guru-jurnal`)
- **Tujuan**: Mencatat materi dan proses KBM setiap sesi pelajaran.
- **Langkah-langkah**:
  1. Buka menu **Jurnal Pembelajaran**.
  2. Lengkapi 10 field formulir terstandarisasi:
     - *No. Pertemuan & Hari/Tanggal*: Terisi otomatis.
     - *Tujuan Pembelajaran (TP)*: Wajib diisi.
     - *KKTP*: Kriteria Ketercapaian Tujuan Pembelajaran (Wajib diisi).
     - *Konten*: Materi ajar yang disampaikan (Wajib diisi).
     - *Kegiatan Pembelajaran*: Ringkasan alur aktivitas kelas (Wajib diisi).
     - *Mata Pelajaran & Kelas*: Pilih mapel dan kelas yang diajar.
     - *Absensi Murid*: Beri tanda Hadir, Sakit, Izin, atau Alpa (H/I/S/A) per nama siswa.
     - *Lokasi KBM*: Tempat KBM berlangsung (misal: "Ruang Kelas 7B").
     - *Dokumentasi KBM*: Ambil foto kegiatan kelas dengan kamera mode lanskap.
     - *Catatan / Refleksi*: Catatan pembelajaran (opsional).
  3. Klik **Simpan Jurnal**.
  - *Mode Guru Inval*: Jika menggantikan guru lain, aktifkan toggle *"Saya sebagai Guru Inval"*, pilih nama guru yang digantikan, maka mata pelajaran dan kelas otomatis mengikuti penugasan guru tersebut.

### 4. Jurnal Kelas (`view-jurnal-kelas` - Wali Kelas)
- **Tujuan**: Memantau seluruh jurnal pelajaran di kelas binaan.
- **Langkah-langkah**:
  1. Buka menu **Jurnal Kelas** (khusus tampil untuk akun Wali Kelas).
  2. Tinjau seluruh catatan guru mata pelajaran yang mengajar di kelas Anda untuk hari yang dipilih.
  3. Deteksi apakah ada siswa yang alpa di jam pelajaran tertentu.

### 5. Modul Piket Guru (`view-piket`)
- **Tujuan**: Mengelola presensi siswa dan ketertiban sekolah saat bertugas piket.
- **Langkah-langkah**:
  1. Menu ini hanya aktif jika nama Anda terjadwal piket pada hari ini.
  2. **Presensi Siswa via QR**: Arahkan kartu QR siswa ke kamera atau sambungkan scanner USB barcode scanner eksternal (hingga 10 unit bersamaan).
  3. **Presensi Siswa Manual**: Gunakan pencarian nama siswa lalu klik tombol *Tandai Datang* atau *Tandai Pulang*.
  4. Isi **Buku Tamu** dan **Catatan Kejadian**.
  5. Ambil foto dokumentasi kegiatan piket lalu kirim **Laporan Piket Harian**.

### 6. Perangkat Pembelajaran (`view-dokumen`)
- **Tujuan**: Mengunggah berkas administrasi ajar guru.
- **Langkah-langkah**:
  1. Buka menu **Perangkat Pembelajaran**.
  2. Pilih jenis berkas: CP, ATP, RPE, Prota, Promes, atau Modul Ajar/RPP.
  3. Tentukan kelas dan mata pelajaran, unggah dokumen format PDF.
  4. Pantau status penelaahan dari kurikulum (*Menunggu*, *Disetujui*, atau *Perlu Revisi*).

### 7. Daftar Nilai (`view-gradebook`)
- **Tujuan**: Pencatatan asesmen nilai Kurikulum Merdeka.
- **Langkah-langkah**:
  1. Pilih kelas, mapel, dan semester.
  2. Tentukan Tujuan Pembelajaran (TP) yang dinilai.
  3. Masukkan nilai formatif dan sumatif siswa.
  4. Unduh laporan nilai dalam format spreadsheet Excel (.xlsx).

### 8. Informasi & Siaran (`view-informasi`)
- **Tujuan**: Membaca pengumuman sekolah dan berdiskusi.
- **Langkah-langkah**:
  1. Buka menu **Informasi** untuk membaca siaran sekolah.
  2. Kirimkan tanggapan di kolom komentar jika pengumuman membuka forum interaktif dua arah.

### 9. Riwayat (`view-history`)
- **Tujuan**: Memeriksa arsip presensi dan jurnal masa lalu.
- **Langkah-langkah**:
  1. Buka menu **Riwayat**.
  2. Pilih tab *Riwayat Presensi* atau *Riwayat Jurnal*.
  3. Gunakan filter bulan/tahun untuk melihat rekaman historis Anda.

### 10. Rekap Jurnal Guru (`view-guru-rekap-jurnal`)
- **Tujuan**: Mencetak rekapitulasi jurnal mengajar bulanan resmi.
- **Langkah-langkah**:
  1. Buka menu **Rekap Jurnal**.
  2. Tentukan rentang bulan/tanggal pelaporan.
  3. Klik tombol **Cetak Dokumen** (`Ctrl+P`). Format cetak secara otomatis bersih tanpa elemen tombol aplikasi, menampilkan KOP dan tanda tangan resmi.

### 11. Presensi Siswa (`view-rekap-siswa` - Wali Kelas)
- **Tujuan**: Memantau rekap absensi bulanan siswa kelas binaan.
- **Langkah-langkah**:
  1. Buka menu **Presensi Siswa** (terkunci khusus untuk kelas binaan wali kelas).
  2. Tinjau persentase kehadiran dan lakukan koreksi jika ada status yang salah input.

---

## II. PANDUAN PENGGUNA: ROLE ADMINISTRATOR

### 1. Dashboard Administrator (`view-home`)
- Pantau kehadiran seluruh dewan guru secara real-time.
- Deteksi cepat guru yang belum presensi datang atau belum mengisi jurnal KBM hari ini.

### 2. Pusat Verifikasi (`view-admin-verif`)
- Tinjau permohonan perizinan (*Izin*, *Sakit*, *Izin Terlambat*, *Dinas Luar*).
- Periksa bukti dokumen pendukung, lalu klik tombol **Setujui** atau **Tolak**.
- Sahkan jurnal KBM dan perangkat pembelajaran yang diunggah guru.

### 3. Manajemen Sistem Blok (`view-sistem-blok`)
- Klik **Tambah Periode Blok** untuk memasukkan agenda kegiatan khusus sekolah (Ujian, PTS, Pesantren Kilat).
- Jadwal KBM reguler di UI guru akan disembunyikan dan digantikan informasi blok tanpa menghapus data asli di basis data.

### 4. Supervisi Jurnal Kelas (`view-jurnal-kelas`)
- Pantau keterisian seluruh kelas dan rombel untuk memastikan tidak ada jam kosong tanpa guru.

### 5. Kelola Piket (`view-piket`)
- Atur penugasan guru piket harian untuk hari Senin sampai Sabtu pada tab pengaturan.
- Pantau laporan ketertiban dan absensi siswa yang tercatat oleh tim piket.

### 6. Supervisi Perangkat Pembelajaran (`view-dokumen`)
- Tinjau dan unduh berkas administrasi ajar guru.
- Berikan catatan telaah revisi atau berikan status disetujui untuk akreditasi dan supervisi.

### 7. Monitoring Daftar Nilai (`view-gradebook`)
- Supervisi pengisian nilai asesmen sebelum batas akhir rapor dan ekspor data nilai sekolah ke format Excel.

### 8. Manajemen Informasi (`view-informasi`)
- Terbitkan pengumuman baru dengan menentukan sasaran (*Semua*, *Guru*, atau *Wali Kelas*).
- Sematkan pengumuman (Pin) dan atur mode komentar satu arah atau dua arah.

### 9. Analitik Kedisiplinan (`view-analitik`)
- Tinjau grafik keterlambatan kedatangan guru, rasio pemenuhan jurnal, dan Leaderboard Guru Terdisiplin bulanan.

### 10. Rekap Akhir Bulanan (`view-admin-rekap`)
- Susun laporan master bulanan kehadiran guru untuk yayasan/dinas.
- Cetak laporan resmi ber-KOP sekolah atau ekspor ke file Excel (.xlsx).

### 11. Presensi Siswa Seluruh Kelas (`view-rekap-siswa`)
- Tinjau absensi siswa seluruh rombel sekolah untuk bimbingan konseling dan kesiswaan.

### 12. Master Data Sekolah (`view-admin-data`)
- **Siswa**: Tambah/edit data murid, cetak kartu QR siswa, dan jalankan proses kenaikan kelas massal.
- **Guru**: Tambah/edit data pendidik, kelola username akun guru, dan reset password jika guru lupa sandi.
- **Mata Pelajaran & Jadwal**: Penugasan mapel, rombel, dan jam mengajar guru.
- **Kalender Libur**: Tetapkan hari libur agar guru tidak terhitung alpa.
- **Wali Kelas**: Tentukan guru pembina untuk setiap rombel.

### 13. Akses Data & Backup (`view-admin-backup`)
- Buat cadangan arsip data (JSON/CSV) atau hubungkan sinkronisasi otomatis ke Google Spreadsheet.

### 14. Sistem Konfigurasi (`view-admin-config`)
- Sesuaikan nama resmi sekolah, NPSN, nama Kepala Sekolah, dan unggah logo resmi.
- Atur batas jam presensi datang, batas toleransi terlambat, dan jam pulang.
- Tetapkan koordinat geofence GPS sekolah dan radius toleransi meter.

---

## III. PANDUAN PENGGUNA: ROLE SUPERADMIN

### 1. Ringkasan Platform (`view-superadmin-overview`)
- Monitor metrik kesehatan ekosistem SIPJAM: jumlah sekolah aktif, total administrator, total guru, dan total siswa di seluruh penyewa platform.

### 2. Kelola Sekolah & Lisensi (`view-superadmin-sekolah`)
- Daftarkan instansi sekolah baru ke dalam sistem.
- Atur status keaktifan lisensi dan masa berlaku.
- Sesuaikan kebijakan fitur per-sekolah (contoh: mode kamera jurnal live saja vs upload galeri).

### 3. Admin Sekolah (`view-superadmin-admins`)
- Buat akun Administrator baru dan tautkan ke sekolah yang ditunjuk.
- Reset kata sandi administrator jika diperlukan.

---

## IV. FITUR BANTUAN DAN PANDUAN TERINTEGRASI

1. **User Profile Card di Sidebar**:
   - Selalu terlihat di bagian atas drawer menu sidebar.
   - Menampilkan avatar dengan titik status online aktif, nama pengguna lengkap, badge peran berwarna (*Superadmin* - Ungu, *Administrator* - Biru, *Guru Wali Kelas* - Teal, *Guru* - Hijau), dan NIP/Username.
2. **Modal Panduan & Tutorial Lengkap**:
   - Klik tombol *"Panduan & Tutorial Lengkap"* di menu samping untuk membuka ringkasan operasional 28 menu dengan pencarian kata kunci dan tombol navigasi langsung ke menu terkait.
3. **Tur Onboarding Interaktif (Spotlight)**:
   - Muncul otomatis saat login pertama dan dapat diulang kapan saja melalui tombol *"Lihat Tutorial Lagi"* di menu samping.
4. **Asisten AI (Chatbot Offline)**:
   - Tombol robot melayang di kanan bawah untuk konsultasi cepat petunjuk penggunaan fitur.

---
*SIPJAM Documentation Guide — 2026.*
