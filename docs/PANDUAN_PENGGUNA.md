# PANDUAN PENGGUNA LENGKAP SIPJAM
### Sistem Informasi Presensi, Jurnal, dan Aktivitas Mengajar

---

## DAFTAR ISI
1. [Tentang SIPJAM](#1-tentang-sipjam)
2. [Hak Akses dan Peran Pengguna](#2-hak-akses-dan-peran-pengguna)
3. [Panduan Operasional Guru (11 Menu)](#3-panduan-operasional-guru)
   - 3.1. [Dashboard Guru](#31-dashboard-guru)
   - 3.2. [Presensi Guru (Datang & Pulang)](#32-presensi-guru)
   - 3.3. [Jurnal Pembelajaran (KBM & Guru Inval)](#33-jurnal-pembelajaran)
   - 3.4. [Jurnal Kelas (Khusus Wali Kelas)](#34-jurnal-kelas-wali-kelas)
   - 3.5. [Modul Piket Guru](#35-modul-piket-guru)
   - 3.6. [Perangkat Pembelajaran](#36-perangkat-pembelajaran)
   - 3.7. [Daftar Nilai (Gradebook)](#37-daftar-nilai-gradebook)
   - 3.8. [Informasi & Siaran Sekolah](#38-informasi--siaran-sekolah)
   - 3.9. [Riwayat Aktivitas](#39-riwayat-aktivitas)
   - 3.10. [Rekap Jurnal Guru](#310-rekap-jurnal-guru)
   - 3.11. [Presensi Siswa (Khusus Wali Kelas)](#311-presensi-siswa-wali-kelas)
4. [Panduan Operasional Administrator (14 Menu)](#4-panduan-operasional-administrator)
   - 4.1. [Dashboard Administrator](#41-dashboard-administrator)
   - 4.2. [Pusat Verifikasi](#42-pusat-verifikasi)
   - 4.3. [Manajemen Sistem Blok](#43-manajemen-sistem-blok)
   - 4.4. [Supervisi Jurnal Kelas](#44-supervisi-jurnal-kelas)
   - 4.5. [Kelola & Pantau Piket](#45-kelola--pantau-piket)
   - 4.6. [Supervisi Perangkat Pembelajaran](#46-supervisi-perangkat-pembelajaran)
   - 4.7. [Monitoring Daftar Nilai](#47-monitoring-daftar-nilai)
   - 4.8. [Manajemen Informasi](#48-manajemen-informasi)
   - 4.9. [Analitik Kedisiplinan & Leaderboard](#49-analitik-kedisiplinan--leaderboard)
   - 4.10. [Rekap Akhir & Laporan Bulanan](#410-rekap-akhir--laporan-bulanan)
   - 4.11. [Rekap Presensi Siswa Seluruh Kelas](#411-rekap-presensi-siswa-seluruh-kelas)
   - 4.12. [Master Data Sekolah](#412-master-data-sekolah)
   - 4.13. [Akses Data & Pencadangan](#413-akses-data--pencadangan)
   - 4.14. [Konfigurasi Sistem Sekolah](#414-konfigurasi-sistem-sekolah)
5. [Panduan Operasional Superadmin (3 Menu)](#5-panduan-operasional-superadmin)
   - 5.1. [Ringkasan Platform Multi-Tenant](#51-ringkasan-platform-multi-tenant)
   - 5.2. [Kelola Sekolah & Lisensi](#52-kelola-sekolah--lisensi)
   - 5.3. [Manajemen Akun Admin Sekolah](#53-manajemen-akun-admin-sekolah)
6. [Fitur Bantuan, Profil, dan Navigasi](#6-fitur-bantuan-profil-dan-navigasi)
7. [Tanya Jawab & Pemecahan Masalah (FAQ / Troubleshooting)](#7-tanya-jawab--pemecahan-masalah)

---

## 1. TENTANG SIPJAM
**SIPJAM** (Sistem Informasi Presensi, Jurnal, dan Aktivitas Mengajar) adalah platform digital terpadu berbasis web (PWA - Progressive Web App) yang dirancang untuk mendigitalkan administrasi pendidik, presensi berbasis geofencing GPS, pencatatan jurnal KBM harian, pengelolaan piket, dan tata kelola sekolah Kurikulum Merdeka secara real-time, akurat, dan transparan.

### Fitur Unggulan Sistem:
1. **Multi-Tenant Architecture**: Satu aplikasi dapat melayani banyak sekolah secara mandiri dan aman dengan isolasi data per sekolah (`sekolah_id`).
2. **Geofenced Selfie Attendance**: Presensi guru tervalidasi radius koordinat GPS sekolah dengan kamera potret 1:1 anti-zoom.
3. **Structured Lesson Journaling**: Formulir 10 field standar Kurikulum Merdeka dengan fitur auto-save lokal, mode Guru Inval (pengganti), serta deteksi otomatis Sistem Blok kegiatan khusus.
4. **Multi-Method Student Attendance**: Presensi siswa berbasis QR Code (kamera browser atau hardware USB HID hingga 10 unit scanner bersamaan) dan checklist manual.
5. **Print-Friendly Official Reports**: Cetak dokumen resmi ber-KOP sekolah, tanda tangan kepala sekolah, ramah kertas, dan bersih dari elemen antarmuka tombol (print CSS).

---

## 2. HAK AKSES DAN PERAN PENGGUNA
SIPJAM membagi hak akses ke dalam 3 tingkatan peran utama:

| Peran (Role) | Ruang Lingkup | Deskripsi Hak Akses |
|---|---|---|
| **Guru** | Tingkat Sekolah | Melakukan presensi mandiri, mengisi jurnal KBM harian, mengunggah perangkat ajar, mengisi nilai siswa, dan mengoperasikan modul piket (bila bertugas). Guru yang ditugaskan sebagai **Wali Kelas** mendapatkan akses tambahan ke menu *Jurnal Kelas* dan *Presensi Siswa*. |
| **Administrator** | Tingkat Sekolah | Mengelola operasional penuh satu sekolah: verifikasi izin/jurnal/perangkat, mengatur Sistem Blok, supervisi KBM seluruh kelas, mengelola Master Data (Siswa, Guru, Jadwal, Kalender), melihat analitik & rekap bulanan, serta mengatur konfigurasi jam kerja dan geofence GPS. |
| **Superadmin** | Tingkat Platform | Mengelola seluruh ekosistem multi-tenant: mendaftarkan sekolah baru, mengaktifkan lisensi, membuat akun Administrator sekolah, dan mengatur kebijakan global per-sekolah. |

---

## 3. PANDUAN OPERASIONAL GURU

### 3.1. Dashboard Guru (`view-home`)
- **Fungsi**: Halaman utama yang menampilkan ringkasan aktivitas kerja harian guru.
- **Komponen Utama**:
  1. **Kartu 4 Langkah Kerja Harian**:
     - Langkah 1: Presensi Datang (centang hijau jika selesai)
     - Langkah 2: Jurnal Pembelajaran (centang hijau jika terisi)
     - Langkah 3: Laporan Piket (hanya aktif jika terjadwal piket hari ini)
     - Langkah 4: Presensi Pulang (aktif setelah jam kepulangan tiba)
  2. **Statistik Kedisiplinan Bulan Berjalan**: Total hari hadir, jumlah menit keterlambatan, dan status kehadiran hari ini.
  3. **Jadwal Mengajar Hari Ini**: Daftar kelas, mata pelajaran, dan jam mengajar guru untuk hari yang bersangkutan.
  4. **Siaran Pengumuman Sekolah**: Informasi penting dari pihak sekolah yang disematkan di bagian atas.

### 3.2. Presensi Guru (`view-guru-presensi`)
- **Fungsi**: Pencatatan kehadiran mandiri guru harian atau pengajuan perizinan.
- **Pilihan Status Presensi**:
  1. **Hadir Datang**: Dilakukan saat tiba di sekolah. Wajib dalam radius GPS geofence sekolah dan mengambil foto selfie wajah tegak (potret 1:1).
  2. **Hadir Pulang**: Dilakukan saat selesai jam kerja sekolah (tombol aktif setelah batas jam pulang tercapai).
  3. **Izin / Sakit**: Digunakan saat berhalangan hadir. Wajib menyertakan foto surat keterangan (dokter/instansi) dan alasan tertulis. Status awal: *Menunggu Verifikasi Admin*.
  4. **Izin Terlambat**: Digunakan jika guru terlambat karena kendala darurat. Wajib menyertakan alasan. Status masuk ke tab Verifikasi Admin sebelum disahkan.
  5. **Dinas Luar**: Digunakan saat menjalankan tugas resmi di luar sekolah dengan melampirkan foto surat tugas.
- **Fitur Khusus**:
  - **Offline Queue Fallback**: Jika koneksi internet mati saat menekan tombol kirim presensi, data dan foto disimpan secara aman di penyimpanan browser (`localStorage`) dan otomatis disinkronkan saat koneksi internet tersambung kembali (`window online event`).

### 3.3. Jurnal Pembelajaran (`view-guru-jurnal`)
- **Fungsi**: Mengisi catatan pelaksanaan Kegiatan Belajar Mengajar (KBM) harian.
- **Urutan 10 Field Formulir Jurnal KBM**:
  1. **No. Pertemuan & Hari/Tanggal**: Terisi otomatis sesuai kalender hari ini (format: DD-MM-YYYY).
  2. **Tujuan Pembelajaran**: Tuliskan capaian tujuan pembelajaran sesi KBM (Wajib).
  3. **KKTP (Kriteria Ketercapaian)**: Kriteria indikator keberhasilan materi (Wajib).
  4. **Konten Materi**: Pokok materi bahasan yang diajarkan (Wajib).
  5. **Kegiatan Pembelajaran**: Uraian aktivitas pembelajaran siswa di kelas (Wajib).
  6. **Mata Pelajaran & Kelas**: Pilihan mapel dan rombel yang diajar.
  7. **Absensi Murid (H/I/S/A)**: Tandai status kehadiran per siswa di kelas tersebut secara live (terkoneksi ke database absensi siswa).
  8. **Lokasi KBM**: Tempat pelaksanaan kegiatan (contoh: "Ruang Kelas 7A", "Lab IPA") (Wajib).
  9. **Dokumentasi KBM**: Pengambilan foto kegiatan pembelajaran dengan kamera lanskap.
  10. **Catatan / Refleksi**: Catatan tindak lanjut atau evaluasi pembelajaran (Opsional).
- **Fitur Khusus**:
  - **Mode Guru Inval (Guru Pengganti)**: Jika Anda menggantikan guru lain yang berhalangan hadir, aktifkan toggle *"Saya sebagai Guru Inval"*, pilih nama guru yang digantikan, maka daftar mapel dan kelas akan disesuaikan otomatis dengan jadwal guru tersebut. Catatan jurnal otomatis ditandai `[INVAL - Menggantikan: {Nama Guru}]`.
  - **Sistem Blok Adaptif**: Jika sekolah sedang dalam periode Sistem Blok (ujian/kegiatan khusus), formulir otomatis berganti menjadi formulir *Jurnal Kegiatan Khusus* tanpa mewajibkan absensi kelas reguler.
  - **Auto-Save Lokal**: Formulir otomatis tersimpan di penyimpanan browser saat diketik sehingga data tidak hilang jika tab tidak sengaja tertutup.

### 3.4. Jurnal Kelas (Wali Kelas) (`view-jurnal-kelas`)
- **Fungsi**: Supervisi keterisian jurnal mengajar khusus pada kelas binaan Anda.
- **Akses**: Hanya terbuka bagi guru yang ditugaskan sebagai Wali Kelas.
- **Langkah Penggunaan**: Pilih tanggal KBM, tinjau apakah seluruh guru mapel yang terjadwal di kelas Anda sudah mengisi jurnal, serta pantau siswa yang tercatat absen di jam-jam tertentu.

### 3.5. Modul Piket Guru (`view-piket`)
- **Fungsi**: Pengelolaan presensi siswa dan ketertiban sekolah oleh guru yang bertugas piket hari ini.
- **Akses**: Menu otomatis muncul dan hanya dapat dibuka pada hari di mana nama Anda terdaftar dalam jadwal piket sekolah.
- **Komponen Utama**:
  1. **Presensi Siswa via Scan QR Code**: Menggunakan kamera laptop/HP atau scanner barcode USB HID eksternal (mendukung hingga 10 scanner bersamaan). Siswa yang discan langsung tercatat datang/pulang.
  2. **Presensi Siswa Manual Checklist**: Pencarian siswa per kelas dengan tombol *Tandai Datang* / *Tandai Pulang*. Daftar siswa tetap utuh setelah ditandai.
  3. **Buku Tamu Digital**: Pencatatan identitas tamu sekolah, instansi, keperluan, dan nomor kontak.
  4. **Catatan Kejadian / Ketertiban**: Pencatatan pelanggaran atau peristiwa khusus selama jam sekolah.
  5. **Submit Laporan Piket**: Pengambilan foto kegiatan piket (kamera lanskap) dan pengiriman laporan rekap ke Administrator.

### 3.6. Perangkat Pembelajaran (`view-dokumen`)
- **Fungsi**: Mengunggah berkas administrasi kurikulum guru.
- **Jenis Berkas yang Didukung**: Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), Rencana Pekan Efektif (RPE), Program Tahunan (Prota), Program Semester (Promes), dan Modul Ajar / RPP.
- **Alur Kerja**: Pilih jenis dokumen, pilih kelas & mapel, unggah berkas (format PDF), lalu kirim. Pantau status persetujuan (*Menunggu*, *Disetujui*, atau *Perlu Revisi* dengan catatan dari Admin).

### 3.7. Daftar Nilai / Gradebook (`view-gradebook`)
- **Fungsi**: Buku nilai digital Kurikulum Merdeka untuk asesmen formatif dan sumatif.
- **Alur Kerja**: Pilih kelas, mapel, dan semester. Tentukan TP (Tujuan Pembelajaran), lalu masukkan nilai siswa. Sistem otomatis menghitung nilai rata-rata, nilai akhir, dan predikat. Klik tombol *Ekspor Excel (.xlsx)* untuk mengunduh rekap nilai.

### 3.8. Informasi & Siaran Sekolah (`view-informasi`)
- **Fungsi**: Membaca pengumuman resmi dan agenda kegiatan dari pihak sekolah.
- **Interaksi**: Klik judul pengumuman untuk membaca isi dan mengunduh lampiran. Jika pengumuman diatur sebagai diskusi dua arah, guru dapat memberikan komentar di kolom yang tersedia. Lonceng bergetar di header menandakan adanya pengumuman baru yang belum dibaca.

### 3.9. Riwayat Aktivitas (`view-history`)
- **Fungsi**: Melihat arsip riwayat presensi (jam datang, jam pulang, foto selfie, catatan keterlambatan) serta arsip seluruh jurnal pembelajaran yang pernah dibuat di masa lalu.

### 3.10. Rekap Jurnal Guru (`view-guru-rekap-jurnal`)
- **Fungsi**: Mencetak rekapitulasi jurnal mengajar bulanan resmi berformat tabel 10 kolom standar dengan KOP sekolah dan tanda tangan Kepala Sekolah. Format cetak bersih dari tombol antarmuka dan siap dicetak langsung (`Ctrl+P`) atau disimpan sebagai PDF.

### 3.11. Presensi Siswa / Rekap Wali Kelas (`view-rekap-siswa`)
- **Fungsi**: Rekapitulasi kehadiran siswa harian dan bulanan khusus kelas binaan Wali Kelas.
- **Akses**: Terkunci khusus untuk kelas binaan wali kelas demi menjaga kerahasiaan dan privasi data murid kelas lain. Wali kelas dapat mengoreksi absensi jika ada kesalahan input dari guru mapel atau guru piket.

---

## 4. PANDUAN OPERASIONAL ADMINISTRATOR

### 4.1. Dashboard Administrator (`view-home`)
- **Fungsi**: Monitoring operasional sekolah real-time.
- **Komponen**: Statistik kehadiran guru hari ini (tepat waktu, terlambat, izin, alpa), daftar guru yang belum presensi atau belum mengisi jurnal, grafik tren kedisiplinan mingguan, dan jalan pintas ke menu Verifikasi Cepat.

### 4.2. Pusat Verifikasi (`view-admin-verif`)
- **Fungsi**: Persetujuan permohonan guru yang tertunda.
- **Menu Sub-Verifikasi**:
  1. **Presensi / Izin**: Verifikasi surat Izin, Sakit, Dinas Luar, dan Izin Terlambat. Klik *Setujui* untuk mengesahkan atau *Tolak* disertai alasan penolakan.
  2. **Jurnal Mengajar**: Tinjau dan sahkan jurnal KBM guru.
  3. **Perangkat Pembelajaran**: Telaah berkas kurikulum guru, berikan status *Disetujui* atau *Perlu Revisi* beserta catatan revisi teknis.
  - Tersedia opsi *Reset Status* jika admin perlu membatalkan keputusan sebelumnya.

### 4.3. Manajemen Sistem Blok (`view-sistem-blok`)
- **Fungsi**: Pengaturan periode kegiatan khusus (PTS, PAS, Ujian Madrasah, Pesantren Kilat, Classmeeting).
- **Alur Kerja**: Klik *Tambah Periode Blok*, masukkan Nama Kegiatan, Tanggal Mulai, dan Tanggal Selesai. Selama rentang tanggal blok aktif:
  - Jadwal KBM reguler di UI guru disembunyikan dan dialihkan ke pengisian Jurnal Kegiatan khusus.
  - Guru yang diatur wajib hadir hanya saat mengajar akan dibebaskan presensi jika tidak memiliki jadwal pada hari tersebut.
  - Data jadwal pelajaran asli di database tidak terhapus.

### 4.4. Supervisi Jurnal Kelas (`view-jurnal-kelas`)
- **Fungsi**: Pemantauan keterisian jurnal KBM seluruh kelas dan rombel di sekolah. Admin dapat memantau kelas mana saja yang kosong atau guru yang belum mengisi jurnal pada jam tertentu.

### 4.5. Kelola & Pantau Piket (`view-piket`)
- **Fungsi**: Pengaturan jadwal penugasan guru piket mingguan (Senin–Sabtu), memantau laporan ketertiban dan buku tamu yang masuk, serta mengawasi presensi siswa. Admin memiliki hak akses penuh membuka modul ini kapan saja.

### 4.6. Supervisi Perangkat Pembelajaran (`view-dokumen`)
- **Fungsi**: Repositori seluruh dokumen administrasi ajar dewan guru. Admin kurikulum dapat mengunduh berkas, memberikan umpan balik revisi, dan menyetujui perangkat untuk supervisi akademik.

### 4.7. Monitoring Daftar Nilai (`view-gradebook`)
- **Fungsi**: Supervisi progres keterisian nilai siswa oleh dewan guru sebelum pembagian rapor, serta ekspor seluruh kumpulan nilai ke format Excel (.xlsx).

### 4.8. Manajemen Informasi (`view-informasi`)
- **Fungsi**: Membuat dan menyiarkan pengumuman resmi sekolah.
- **Pengaturan Pengumuman**: Judul, isi, lampiran berkas/foto, target sasaran (*Semua*, *Khusus Guru*, atau *Khusus Wali Kelas*), sematkan di atas (Pin), dan jenis diskusi (1 arah tanpa komentar atau 2 arah interaktif).

### 4.9. Analitik Kedisiplinan & Leaderboard (`view-analitik`)
- **Fungsi**: Evaluasi kinerja dan disiplin dewan guru. Menampilkan grafik jam kedatangan, total menit keterlambatan bulanan, rasio keterisian jurnal, dan daftar *Leaderboard Guru Terdisiplin* bulanan.

### 4.10. Rekap Akhir & Laporan Bulanan (`view-admin-rekap`)
- **Fungsi**: Rekapitulasi bulanan resmi seluruh guru untuk yayasan atau dinas pendidikan. Menampilkan total hari kerja, hadir, terlambat, izin, sakit, alpa, dan realisasi jam mengajar. Dilengkapi tombol *Cetak Dokumen Resmi* dan *Ekspor Excel (.xlsx)*.

### 4.11. Rekap Presensi Siswa Seluruh Kelas (`view-rekap-siswa`)
- **Fungsi**: Rekapitulasi absensi siswa menyeluruh seluruh rombel di sekolah, filter per tanggal/kelas, dan pencetakan laporan presensi kesiswaan.

### 4.12. Master Data Sekolah (`view-admin-data`)
- **Fungsi**: Pengelolaan basis data inti sekolah:
  1. **Data Siswa**: Tambah/edit siswa, cetak kartu presensi ber-QR code (PDF/gambar), dan fitur *Naik Kelas Massal* di akhir tahun ajaran.
  2. **Data Guru**: Tambah/edit data pendidik, ubah *username* akun guru (guru dikunci dari mengubah username sendiri), dan reset kata sandi akun guru ke default.
  3. **Mata Pelajaran & Jadwal**: Penugasan guru, jadwal mengajar per hari, jam ke-, dan rombel kelas.
  4. **Kalender Libur**: Penetapan hari libur nasional atau libur khusus sekolah agar sistem tidak menandai guru alpa.
  5. **Penetapan Wali Kelas**: Menautkan guru ke rombel kelas binaan tertentu.

### 4.13. Akses Data & Pencadangan (`view-admin-backup`)
- **Fungsi**: Pencadangan data presensi, jurnal, dan master data sekolah ke format JSON/CSV offline atau integrasi sinkronisasi otomatis ke Google Spreadsheet.

### 4.14. Konfigurasi Sistem Sekolah (`view-admin-config`)
- **Fungsi**: Menentukan aturan operasional sekolah:
  1. **Profil Sekolah**: Nama resmi sekolah, NPSN, alamat, nama Kepala Sekolah, NIP, dan unggah logo resmi.
  2. **Jam Operasional**: Jam buka presensi datang, batas toleransi terlambat, jam kepulangan reguler (Senin–Kamis), dan jam kepulangan khusus hari Jumat.
  3. **Geofence GPS**: Titik koordinat Latitude, Longitude, dan radius toleransi jarak (misal 50–100 meter).
  4. **Mode Kamera Jurnal**: Kebijakan pengambilan foto jurnal KBM (Live Camera Langsung saja, atau Live Camera + Upload Galeri).

---

## 5. PANDUAN OPERASIONAL SUPERADMIN

### 5.1. Ringkasan Platform Multi-Tenant (`view-superadmin-overview`)
- **Fungsi**: Dasbor global penyedia platform SIPJAM untuk memantau metrik seluruh sekolah: total sekolah terdaftar, sekolah aktif vs non-aktif, total akun administrator, jumlah total dewan guru, dan total siswa.

### 5.2. Kelola Sekolah & Lisensi (`view-superadmin-sekolah`)
- **Fungsi**: Pendaftaran institusi sekolah baru ke dalam sistem, pengaturan status lisensi langganan (Aktif / Non-aktif), masa berlaku, serta konfigurasi per-sekolah seperti mode upload foto jurnal KBM.

### 5.3. Manajemen Akun Admin Sekolah (`view-superadmin-admins`)
- **Fungsi**: Pembuatan kredensial akun Administrator sekolah baru, penautan akun ke sekolah terkait, reset kata sandi admin yang terkunci/lupa password, dan monitoring aktivitas akun.

---

## 6. FITUR BANTUAN, PROFIL, DAN NAVIGASI

### 6.1. Kartu Profil Pengguna di Sidebar
- Terletak di bagian atas menu navigasi samping (sidebar).
- Menampilkan foto avatar pengguna dengan indikator status online hijau.
- Menampilkan nama lengkap akun pengguna.
- Menampilkan badge peran dengan warna khusus:
  - **Superadmin**: Badge Ungu dengan ikon mahkota (`fa-crown`).
  - **Administrator**: Badge Biru dengan ikon perisai (`fa-user-shield`).
  - **Guru (Wali Kelas)**: Badge Teal dengan ikon guru (`fa-chalkboard-user`).
  - **Guru**: Badge Emerald dengan ikon guru (`fa-chalkboard-user`).
  - Menampilkan Username / NIP akun.

### 6.2. Panduan & Tutorial Lengkap (In-App Modal)
- Dapat diakses kapan saja melalui tombol *"Panduan & Tutorial Lengkap"* di sidebar.
- Menyediakan tab filter peran (*Semua*, *Guru*, *Admin*, *Superadmin*).
- Fitur pencarian kata kunci real-time (mencakup judul, rangkuman, langkah operasional, dan tips kunci).
- Tombol navigasi langsung *"Buka Menu"* untuk melompat langsung ke halaman yang ingin dipelajari.

### 6.3. Tur Interaktif Onboarding (Spotlight Tour)
- Muncul otomatis saat pertama kali masuk ke akun Guru atau Admin.
- Menyoroti elemen antarmuka nyata di layar secara bertahap.
- Dapat diulang kapan saja dengan menekan tombol *"Lihat Tutorial Lagi"* di menu sidebar.

### 6.4. Asisten AI Cerdas (Chatbot FAQ Offline)
- Tombol melayang berikon robot di sudut kanan bawah antarmuka.
- Menjawab pertanyaan umum secara otomatis berdasarkan halaman yang sedang dibuka tanpa memerlukan koneksi internet ke API eksternal.

---

## 7. TANYA JAWAB & PEMECAHAN MASALAH (FAQ / TROUBLESHOOTING)

#### Q1: Mengapa saat presensi muncul pesan "Di luar radius sekolah"?
- **Penyebab**: Perangkat Anda berada di luar radius koordinat GPS sekolah yang telah dikonfigurasi di menu Sistem Konfigurasi, atau akurasi GPS pada perangkat Anda sedang rendah.
- **Solusi**:
  1. Pastikan fitur Lokasi (GPS) pada smartphone/laptop aktif dalam mode *Akurasi Tinggi*.
  2. Keluar ke area terbuka agar perangkat mendapatkan sinyal satelit GPS yang baik.
  3. Hubungi Admin Sekolah jika titik koordinat sekolah perlu disesuaikan.

#### Q2: Mengapa kamera tidak muncul saat hendak mengambil foto presensi atau jurnal?
- **Penyebab**: Browser belum diberi izin (permission) untuk mengakses kamera.
- **Solusi**:
  1. Klik ikon gembok/setelan di bilah alamat browser (URL bar).
  2. Pastikan izin Kamera diatur ke *Izinkan (Allow)*.
  3. Muat ulang (refresh) halaman aplikasi.

#### Q3: Bagaimana jika jaringan internet mati saat sedang presensi?
- **Solusi**: SIPJAM memiliki fitur *Offline Queue Fallback*. Tekan tombol kirim seperti biasa. Aplikasi akan menyimpan data dan foto di penyimpanan lokal perangkat dan secara otomatis mengirimkannya ke server begitu koneksi internet terhubung kembali.

#### Q4: Mengapa menu Piket atau Jurnal Kelas tidak muncul di sidebar saya?
- **Penyebab**:
  - Menu *Modul Piket* hanya muncul jika nama Anda terjadwal piket pada hari ini.
  - Menu *Jurnal Kelas* dan *Presensi Siswa* hanya muncul jika Anda ditugaskan sebagai Wali Kelas aktif.

#### Q5: Bagaimana cara guru pengganti (Inval) mengisi jurnal KBM?
- **Solusi**: Buka menu *Jurnal Pembelajaran*, centang toggle *"Saya sebagai Guru Inval"*, lalu pilih nama guru yang Anda gantikan. Sistem otomatis memuat jadwal dan kelas guru tersebut.

---
*Dokumen Panduan Pengguna SIPJAM Versi 2.4 — Disusun untuk seluruh dewan guru dan tenaga kependidikan.*
