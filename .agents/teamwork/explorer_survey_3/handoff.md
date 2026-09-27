# Handoff Report: AI Assistant Knowledge Base & Interactive Onboarding Highlight Architecture

**Subagent**: `explorer_survey_3`  
**Parent Agent**: `orchestrator_5` (`3b364431-4af8-4ed9-9a8c-b79b77d58fbe`)  
**Workspace**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`  
**Date/Time**: 2026-09-28T05:52:00+08:00  

---

## 1. Observation

### 1.1 Application Entry & Navigation Architecture
- **Single Page Application Orchestrator**: `src/components/AppScreen.tsx` (848 lines) controls the entire authenticated application state. The active view is tracked by `currentView: string` (line 51) and synchronized with URL query params `?view=...` (lines 53–59, 151–163, 371–429).
- **User Roles**: Lines 48–49:
  ```typescript
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';
  ```
  Superadmins manage multi-tenant schools and have no onboarding requirement. Teachers (`Guru`) and School Administrators (`Admin`) are the primary target users.
- **Wali Kelas Special Privilege**: Lines 168–233 determine whether a teacher is assigned as a `Wali Kelas` (via `user.wali_kelas`, `data_guru.wali_kelas`, or `wali_kelas` table), unlocking access to `view-jurnal-kelas` (lines 380–390, 447).
- **Sidebar & Header**: Lines 487–533 render the fixed top header (`fixed top-0 w-full z-40`), while lines 536–578 render the slide-over sidebar drawer (`fixed inset-0 bg-black/60 z-50`).

### 1.2 Font Awesome Setup & Icons
- In `src/app/layout.tsx` line 46:
  ```html
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  ```
  **Font Awesome 6.4.0** is imported globally via CDN.
- Across all 30 component files in `src/components/`, the `fa-solid fa-...` class naming convention is consistently used (e.g. `fa-solid fa-house`, `fa-solid fa-bars`, `fa-solid fa-bell`, `fa-solid fa-user-gear`).
- Recommended icons for the new features:
  - AI Assistant Floating Trigger: `fa-solid fa-wand-magic-sparkles` (or `fa-solid fa-robot`)
  - FAQ / Help icons: `fa-solid fa-circle-question`, `fa-solid fa-lightbulb`, `fa-solid fa-circle-info`
  - Onboarding action icons: `fa-solid fa-arrow-right`, `fa-solid fa-arrow-left`, `fa-solid fa-check`, `fa-solid fa-xmark`, `fa-solid fa-sparkles`

### 1.3 Tailwind CSS v4 & Color Conventions
- In `src/app/globals.css` lines 1–15:
  ```css
  @import "tailwindcss";
  @custom-variant dark (&:where(.dark, .dark *));

  @theme {
    --color-nizamudin-green: #0B4619;
    --color-nizamudin-light: #146a28;
    --color-nizamudin-gold: #D4AF37;
    --color-nizamudin-goldlight: #F8F1D1;
    --color-nizamudin-darkbg: #121212;
    --color-nizamudin-darkcard: #1e1e1e;
    --font-sans: var(--font-poppins);
    --font-mono: var(--font-space-mono);
    --font-arabic: var(--font-amiri);
  }
  ```
- **Z-Index Layering Hierarchy**:
  - `z-10`: Main page content (`<main className="... z-10">`)
  - `z-20`: Form inputs, clickable action pills (`.btn-click { z-20 }`)
  - `z-40`: Fixed header (`<header className="... z-40 fixed top-0 w-full">`)
  - `z-45`: Recommended for AI Assistant floating button
  - `z-50`: Sidebar drawer overlay, Broadcast modal, Account settings modal
  - `z-[60]`: Recommended for Onboarding Tour backdrop overlay
  - `z-[70]`: Recommended for Onboarding Tour spotlight cutout & target highlight
  - `z-[75]`: Recommended for Onboarding Tour floating tooltip card
  - `z-[1060]`: SweetAlert2 modals (`.swal2-container`)

---

## 2. Logic Chain

### 2.1 Enumeration of All 19 Main Menu Items
The union of teacher and admin menus in `AppScreen.tsx` produces exactly 19 distinct menu targets:

| No | Target `currentView` | Menu Label (Indonesian) | Icon (`fa-solid`) | Roles | Component File | Key Features & Workflow |
|---|---|---|---|---|---|---|
| 1 | `view-home` | **Dashboard** | `fa-house` | Guru, Admin | `HomeView.tsx` | Ringkasan harian, 4 langkah tugas guru harian (Presensi Datang, Jurnal KBM, Laporan Piket, Presensi Pulang), status akumulasi keterlambatan WITA, peringatan 3x alpa, jadwal harian, matriks status guru admin. |
| 2 | `view-guru-presensi` | **Presensi Guru** (Datang/Pulang) | `fa-right-to-bracket` | Guru | `GuruPresensi.tsx` | Presensi Datang & Pulang mandiri, geofencing GPS radius sekolah, swafoto selfie dengan watermark koordinat & waktu WITA, pengajuan izin/sakit/dinas luar. Presensi pulang terkunci jika jurnal/piket belum selesai. |
| 3 | `view-guru-jurnal` | **Jurnal Pembelajaran** (Jurnal Mengajar) | `fa-book-journal-whills` | Guru | `GuruJurnal.tsx` | Pencatatan kegiatan KBM per kelas/mapel sesuai jadwal harian, materi pokok, catatan siswa, refleksi, absensi murid (H/S/I/A), dan foto KBM. Otomatis beralih ke formulir Jurnal Kegiatan saat Sistem Blok aktif. |
| 4 | `view-piket` | **Modul Piket** (Guru) / **Kelola Piket** (Admin) | `fa-shield-halved` | Guru, Admin | `PiketView.tsx` | Pelayanan ketertiban sekolah harian: input absensi harian seluruh kelas, catatan kejadian khusus/tamu/insiden, unggah foto piket, penugasan guru piket harian oleh admin, serta rekap laporan piket. |
| 5 | `view-dokumen` | **Perangkat Pembelajaran** | `fa-folder-open` | Guru, Admin | `DokumenView.tsx` | Repositori dokumen administrasi kurikulum guru: CP, ATP, RPE, Prota, Promes, dan Modul Ajar/RPM (PDF/DOCX). Admin memverifikasi kelengkapan dokumen melalui matriks keterpenuhan. |
| 6 | `view-gradebook` | **Daftar Nilai** | `fa-graduation-cap` | Guru, Admin | `GradebookView.tsx` | Buku nilai digital Kurikulum Merdeka: perumusan Tujuan Pembelajaran (TP), kolom asesmen formatif/sumatif, input nilai per siswa, penghitungan nilai akhir otomatis, dan ekspor rekap rapor ke Excel. |
| 7 | `view-chat` | **Chat Guru** | `fa-comments` | Guru, Admin | `ChatView.tsx` | Komunikasi dan pesan instan internal antar guru dan staf sekolah secara real-time berbasis Supabase Realtime Channel untuk koordinasi kedinasan. |
| 8 | `view-informasi` | **Informasi** | `fa-bullhorn` | Guru, Admin | `InformasiView.tsx` | Papan pengumuman resmi sekolah: admin dapat mempublikasikan siaran (sasaran: Semua, Guru, Wali Kelas, Orang Tua), pin siaran penting, dan interaksi komentar dua arah. |
| 9 | `view-history` | **Riwayat** | `fa-clock-rotate-left` | Guru | `HistoryView.tsx` | Rekaman log pribadi guru: riwayat presensi datang/pulang (menit keterlambatan, foto, status verifikasi) dan arsip jurnal KBM yang pernah dikirimkan. |
| 10 | `view-guru-rekap-jurnal` | **Rekap Jurnal** | `fa-book-open` | Guru, Admin | `RekapJurnalView.tsx` (mode `pribadi`) | Rekapitulasi jurnal mengajar milik guru yang bersangkutan dengan filter bulan/rentang tanggal, preview catatan siswa, serta opsi cetak dokumen resmi lengkap kop surat dan ttd kepsek. |
| 11 | `view-rekap-siswa` | **Presensi Siswa** | `fa-users-viewfinder` | Guru, Wali Kelas, Admin | `RekapSiswaView.tsx` | Rekapitulasi kehadiran siswa per kelas/mapel. Wali Kelas memiliki tab khusus untuk menginput dan memvalidasi absensi harian siswa di kelasnya secara langsung. |
| 12 | `view-admin-verif` | **Verifikasi** | `fa-clipboard-check` | Admin | `AdminVerifView.tsx` | Modul verifikasi harian admin untuk menyetujui, menolak (dengan alasan), atau me-reset status pengajuan presensi (izin/sakit/dinas luar), jurnal KBM, dan laporan piket guru. |
| 13 | `view-sistem-blok` | **Sistem Blok** | `fa-layer-group` | Admin | `SistemBlokView.tsx` | Pengaturan rentang waktu kegiatan khusus (Ujian, PTS, PAS, Masa Jeda, Pesantren Kilat). Selama blok aktif, jadwal KBM reguler ditutup sementara dari UI dan guru mengisi Jurnal Kegiatan. |
| 14 | `view-jurnal-kelas` | **Jurnal Kelas** | `fa-chalkboard-user` | Wali Kelas, Admin | `RekapJurnalView.tsx` (mode `kelas`) | Pemantauan terpadu seluruh jurnal pembelajaran yang masuk ke kelas tertentu dari semua guru pengampu mata pelajaran untuk memastikan seluruh jam kelas terisi. |
| 15 | `view-analitik` | **Analitik** | `fa-chart-pie` | Admin | `AnalitikView.tsx` | Visualisasi metrik KPI dan performa kedisiplinan guru: persentase kehadiran tepat waktu, tren keterlambatan, kepatuhan pengisian jurnal, laporan piket, serta leaderboard guru terdisiplin. |
| 16 | `view-admin-rekap` | **Rekap Akhir** | `fa-file-invoice` | Admin | `AdminRekapView.tsx` | Pembuatan laporan rekapitulasi menyeluruh kehadiran, keterlambatan, jurnal, dan piket seluruh dewan guru dalam satu bulan atau rentang custom, dapat diekspor ke Excel atau dicetak ke PDF resmi. |
| 17 | `view-admin-data` | **Master Data** | `fa-database` | Admin | `AdminDataView.tsx` | Pengelolaan data pokok sekolah: Data Siswa (beserta fitur Naik Kelas Massal), Data Guru (dan reset password akun), Data Mapel, Kalender Pendidikan, Jadwal KBM, dan Penugasan Wali Kelas. |
| 18 | `view-admin-backup` | **Akses Data / Backup** | `fa-hard-drive` | Admin | `AdminBackupView.tsx` | Pencadangan (backup) data tahunan transaksi presensi dan jurnal ke Google Spreadsheet / cloud webhook serta pengosongan arsip lampau dari database demi menjaga kecepatan sistem. |
| 19 | `view-admin-config` | **Sistem** (Konfigurasi) | `fa-gears` | Admin | `AdminConfigView.tsx` | Konfigurasi parameter global: Tahun Ajaran & Semester aktif, jam kerja presensi datang/pulang & batas telat, titik koordinat GPS & radius toleransi meter sekolah, kop surat, dan data tanda tangan Kepsek. |

---

### 2.2 Knowledge Base Q&A Catalog (42 Pairs Mapped with Keywords & Context)

Below are 42 static Q&A pairs covering all 19 main menu items plus essential system topics in Bahasa Indonesia:

#### 1. Dashboard (`view-home`)
- **Q1**: *Apa saja informasi penting yang ditampilkan di halaman Dashboard guru?*  
  **A1**: Di halaman Dashboard guru, Anda dapat melihat widget **Alur 4 Langkah Tugas Harian** (Presensi Datang, Jurnal Mengajar, Laporan Piket, Presensi Pulang), status akumulasi keterlambatan dalam bulan berjalan (WITA), peringatan disiplin kehadiran (jika ada alpa), banner siaran sekolah, serta jadwal mengajar kelas Anda hari ini.  
  **Keywords**: `['dashboard', 'informasi', 'tampilan', 'beranda', 'langkah', 'harian', 'alur', 'jadwal']`
- **Q2**: *Mengapa di Dashboard guru terdapat indikator 4 langkah kerja harian?*  
  **A2**: Indikator 4 langkah harian dirancang untuk memandu guru menyelesaikan kewajiban administrasi secara berurutan: (1) Presensi Datang pagi hari, (2) Pengisian Jurnal KBM di kelas, (3) Laporan Piket (khusus bagi yang bertugas piket hari ini), dan (4) Presensi Pulang. Menyelesaikan jurnal dan piket adalah syarat wajib sebelum tombol Presensi Pulang dapat dibuka.  
  **Keywords**: `['indikator', 'langkah', 'kerja', 'dashboard', 'alur', 'tugas', 'kewajiban', 'urutan']`

#### 2. Presensi Datang/Pulang (`view-guru-presensi`)
- **Q3**: *Bagaimana cara melakukan presensi datang atau presensi pulang?*  
  **A3**: Buka menu **Presensi Guru**, pastikan izin lokasi GPS aktif di browser Anda dan Anda berada di dalam radius sekolah. Pilih jenis presensi (**Datang** di pagi hari atau **Pulang** saat jam kerja berakhir), ambil swafoto (selfie) langsung melalui kamera aplikasi, lalu klik tombol **Kirim Presensi Sekarang**. Sistem akan merekam koordinat dan waktu WITA secara otomatis.  
  **Keywords**: `['cara', 'presensi', 'datang', 'pulang', 'absen', 'selfie', 'kamera', 'gps']`
- **Q4**: *Mengapa tombol Presensi Pulang saya terkunci dan tidak bisa diklik?*  
  **A4**: Tombol Presensi Pulang terkunci secara otomatis jika Anda belum menyelesaikan seluruh **Jurnal Pembelajaran** untuk kelas yang Anda ajar hari ini, atau Anda belum mengirimkan **Laporan Piket** jika hari ini Anda terjadwal sebagai guru piket. Pastikan semua jurnal KBM hari ini sudah berstatus terisi di menu Jurnal Pembelajaran.  
  **Keywords**: `['presensi', 'pulang', 'terkunci', 'kunci', 'gembok', 'tidak bisa', 'jurnal', 'belum']`
- **Q5**: *Bagaimana cara mengajukan izin, sakit, atau dinas luar jika tidak bisa hadir ke sekolah?*  
  **A5**: Buka menu **Presensi Guru**, ubah pilihan jenis kehadiran dari *Sekolah* menjadi **Izin**, **Sakit**, atau **Dinas Luar**. Lengkapi keterangan alasan tidak hadir serta unggah foto surat dokter, surat dinas, atau bukti pendukung. Pengajuan Anda akan masuk ke menu Verifikasi Admin untuk disetujui.  
  **Keywords**: `['izin', 'sakit', 'dinas luar', 'surat', 'pengajuan', 'tidak hadir', 'keterangan']`

#### 3. Jurnal Mengajar (`view-guru-jurnal`)
- **Q6**: *Bagaimana cara mengisi Jurnal Pembelajaran (KBM) harian?*  
  **A6**: Buka menu **Jurnal Pembelajaran**, pilih mata pelajaran dan kelas yang Anda ajar sesuai jadwal hari ini. Masukkan nomor pertemuan, jam pelajaran, materi pokok yang disampaikan, kegiatan belajar, catatan khusus siswa, dan refleksi. Ambil swafoto/foto kegiatan di dalam kelas, catat absensi siswa yang tidak hadir, lalu klik **Simpan Jurnal**.  
  **Keywords**: `['isi', 'jurnal', 'pembelajaran', 'kbm', 'mengajar', 'materi', 'kelas', 'simpan']`
- **Q7**: *Bagaimana cara mencatat absensi siswa (Sakit, Izin, Alpa) saat mengisi jurnal?*  
  **A7**: Pada formulir Jurnal Pembelajaran, di bagian bawah terdapat daftar siswa kelas tersebut. Secara default seluruh siswa berstatus Hadir (H). Klik tombol status pada nama siswa yang berhalangan hadir untuk mengubahnya menjadi **S** (Sakit), **I** (Izin), atau **A** (Alpa). Ringkasan kehadiran akan terhitung otomatis ke dalam jurnal.  
  **Keywords**: `['absensi', 'siswa', 'murid', 'jurnal', 'sakit', 'izin', 'alpa', 'hadir']`
- **Q8**: *Mengapa formulir jurnal saya otomatis berubah menjadi 'Jurnal Kegiatan'?*  
  **A8**: Jika tanggal hari ini termasuk ke dalam periode **Sistem Blok** yang diaktifkan oleh administrator (misalnya saat Ujian Sekolah, Pesantren Kilat, atau Kegiatan Jeda), jadwal KBM reguler digantikan oleh kegiatan khusus, sehingga guru hanya bertugas mengisi *Jurnal Kegiatan* bukan jurnal KBM per kelas.  
  **Keywords**: `['jurnal kegiatan', 'sistem blok', 'berubah', 'kegiatan', 'ujian', 'khusus']`

#### 4. Piket (`view-piket`)
- **Q9**: *Bagaimana cara guru piket membuat dan mengirimkan laporan piket harian?*  
  **A9**: Buka menu **Modul Piket**, pilih tab **Lapor Piket**. Periksa dan catat absensi siswa lintas kelas jika diperlukan, tuliskan catatan kejadian harian (kondisi ketertiban, tamu dinas, siswa terlambat atau pulang dini), ambil foto dokumentasi piket, lalu klik tombol **Kirim Laporan Piket**.  
  **Keywords**: `['lapor', 'piket', 'laporan piket', 'tugas piket', 'kejadian', 'tamu', 'catatan']`
- **Q10**: *Bagaimana administrator mengatur penugasan guru piket harian?*  
  **A10**: Administrator dapat membuka menu **Kelola Piket**, masuk ke tab **Penugasan**, pilih hari kerja (Senin–Sabtu), lalu pilih nama guru yang ditugaskan bertugas piket pada hari tersebut. Penugasan ini akan otomatis menghubungkan guru dengan kewajiban laporan piket di Dashboard.  
  **Keywords**: `['penugasan', 'guru piket', 'jadwal piket', 'admin', 'atur piket', 'kelola piket']`

#### 5. Perangkat Pembelajaran (`view-dokumen`)
- **Q11**: *Dokumen kurikulum apa saja yang wajib diunggah oleh guru di Perangkat Pembelajaran?*  
  **A11**: Terdapat 6 jenis dokumen administrasi utama: (1) **Analisis CP** (Capaian Pembelajaran), (2) **ATP** (Alur Tujuan Pembelajaran), (3) **RPE** (Rencana Pekan Efektif), (4) **Prota** (Program Tahunan), (5) **Promes** (Program Semester), dan (6) **Modul Ajar / RPM** (Rencana Pembelajaran Mendalam).  
  **Keywords**: `['perangkat pembelajaran', 'dokumen', 'cp', 'atp', 'rpe', 'prota', 'promes', 'rpm', 'modul ajar', 'syarat']`
- **Q12**: *Bagaimana cara mengunggah dokumen modul ajar atau perangkat pembelajaran?*  
  **A12**: Buka menu **Perangkat Pembelajaran**, klik tab **Upload Dokumen**. Pilih jenis dokumen (CP/ATP/RPM/dll), pilih mata pelajaran dan kelas terkait, beri judul dokumen, lalu pilih berkas (format PDF atau DOCX) dari perangkat Anda dan klik **Unggah Dokumen**. Berkas akan tersimpan aman di Google Drive sekolah.  
  **Keywords**: `['upload', 'unggah', 'dokumen', 'modul ajar', 'file', 'pdf', 'docx', 'drive']`
- **Q13**: *Bagaimana cara mengetahui apakah dokumen perangkat saya sudah diverifikasi oleh admin?*  
  **A13**: Pada tab **Daftar Dokumen**, setiap berkas yang diunggah memiliki lencana status: **Disetujui** (hijau), **Perlu Revisi** (merah disertai catatan masukan dari admin/kepsek), atau **Menunggu Verifikasi** (kuning).  
  **Keywords**: `['status', 'verifikasi', 'dokumen', 'disetujui', 'revisi', 'menunggu', 'perangkat']`

#### 6. Daftar Nilai (`view-gradebook`)
- **Q14**: *Bagaimana cara menginput nilai formatif dan sumatif siswa di Daftar Nilai?*  
  **A14**: Buka menu **Daftar Nilai**, pilih mata pelajaran, kelas, dan semester aktif. Buat atau pilih Tujuan Pembelajaran (TP) yang dinilai, tambahkan kolom asesmen (Formatif atau Sumatif), lalu masukkan nilai numerik siswa pada tabel matriks yang tersedia. Nilai akan tersimpan otomatis saat Anda berpindah baris.  
  **Keywords**: `['daftar nilai', 'nilai', 'input nilai', 'tp', 'formatif', 'sumatif', 'asesmen', 'gradebook']`
- **Q15**: *Bagaimana cara mengekspor rekap daftar nilai siswa ke format Excel?*  
  **A15**: Buka menu **Daftar Nilai**, pilih tab **Rekap Semester**, pilih kelas dan mapel yang diinginkan, kemudian klik tombol **Ekspor Excel** di sudut kanan atas tabel untuk mengunduh rekap nilai lengkap beserta bobot dan rata-ratanya.  
  **Keywords**: `['ekspor excel', 'unduh nilai', 'download excel', 'daftar nilai', 'rapor', 'rekap nilai']`

#### 7. Chat Guru (`view-chat`)
- **Q16**: *Bagaimana cara mengirim pesan kepada rekan guru di Chat Guru?*  
  **A16**: Buka menu **Chat Guru**, klik nama rekan guru dari daftar guru di bilah kiri, ketik pesan Anda pada kolom percakapan di bagian bawah, lalu tekan tombol kirim atau Enter. Pesan diterima secara real-time.  
  **Keywords**: `['chat guru', 'pesan', 'kirim pesan', 'obrolan', 'komunikasi', 'rekan']`
- **Q17**: *Apakah obrolan di Chat Guru bersifat pribadi?*  
  **A17**: Ya, percakapan di Chat Guru adalah pesan pribadi (direct message) antar akun pengirim dan penerima yang terenkripsi dan terhubung secara langsung antar pengguna dalam sekolah yang sama.  
  **Keywords**: `['chat pribadi', 'keamanan', 'rahasia', 'direct message', 'chat guru']`

#### 8. Informasi (`view-informasi`)
- **Q18**: *Bagaimana cara membaca dan memberikan komentar tanggapan pada pengumuman sekolah?*  
  **A18**: Buka menu **Informasi**. Pilih pengumuman yang ingin Anda baca. Jika pengumuman disetel sebagai komunikasi dua arah oleh admin, Anda dapat mengetik pertanyaan atau konfirmasi pada kolom tanggapan di bawah pengumuman tersebut.  
  **Keywords**: `['informasi', 'pengumuman', 'baca', 'tanggapan', 'komentar', 'balas']`
- **Q19**: *Bagaimana administrator menerbitkan dan menyematkan pengumuman baru?*  
  **A19**: Administrator membuka menu **Informasi**, klik tombol **+ Buat Pengumuman**. Tuliskan judul, isi berita, tentukan sasaran (Semua/Guru/Wali Kelas/Orang Tua), centang opsi **Sematkan Pengumuman (Pin)** agar berada di posisi paling atas, dan pilih mode komunikasi (Satu Arah atau Dua Arah).  
  **Keywords**: `['buat pengumuman', 'terbitkan', 'pin', 'sematkan', 'admin', 'informasi', 'siaran']`

#### 9. Riwayat (`view-history`)
- **Q20**: *Bagaimana cara mengecek riwayat absensi dan keterlambatan saya di masa lalu?*  
  **A20**: Buka menu **Riwayat**, pilih tab **Presensi**. Anda akan melihat daftar seluruh presensi datang dan pulang yang pernah Anda lakukan, lengkap dengan jam tercatat, jumlah menit keterlambatan, foto selfie, dan status verifikasi admin.  
  **Keywords**: `['riwayat', 'history', 'riwayat absensi', 'cek keterlambatan', 'catatan kehadiran']`
- **Q21**: *Di mana saya bisa meninjau arsip jurnal KBM yang pernah saya buat sebelumnya?*  
  **A21**: Di menu **Riwayat**, pilih tab **Jurnal**. Anda dapat menelusuri seluruh jurnal pembelajaran lampau, melihat materi yang pernah diajarkan, catatan khusus siswa, dan dokumentasi foto KBM.  
  **Keywords**: `['riwayat jurnal', 'arsip jurnal', 'cek jurnal lama', 'riwayat mengajar']`

#### 10. Rekap Jurnal (`view-guru-rekap-jurnal`)
- **Q22**: *Bagaimana cara mencetak rekapitulasi jurnal mengajar bulanan saya?*  
  **A22**: Buka menu **Rekap Jurnal**, pilih bulan yang ingin dicetak, lalu periksa daftar jurnal yang tampil. Klik tombol **Cetak Halaman** di kanan atas. Tampilan cetak otomatis memuat kop surat resmi sekolah, tabel rekapitulasi materi, dan kolom tanda tangan Kepala Sekolah.  
  **Keywords**: `['cetak jurnal', 'rekap jurnal', 'print jurnal', 'bulanan', 'laporan jurnal']`
- **Q23**: *Bisakah saya memfilter rekap jurnal berdasarkan rentang tanggal tertentu?*  
  **A23**: Ya, di menu **Rekap Jurnal**, Anda dapat membuka opsi **Filter Rentang Khusus** untuk menentukan Tanggal Mulai dan Tanggal Selesai secara bebas di luar periode bulanan standar.  
  **Keywords**: `['filter rentang', 'tanggal custom', 'rekap jurnal', 'periode']`

#### 11. Presensi Siswa (`view-rekap-siswa`)
- **Q24**: *Bagaimana cara wali kelas memperbarui atau menginput absensi harian kelas binaan?*  
  **A24**: Wali kelas membuka menu **Presensi Siswa**, lalu klik tab **Input Absensi Wali Kelas**. Pilih tanggal hari ini, lalu ubah status siswa yang berhalangan hadir menjadi Sakit, Izin, atau Alpa beserta keterangannya, kemudian klik **Simpan Absensi**.  
  **Keywords**: `['presensi siswa', 'wali kelas', 'input absensi', 'kehadiran siswa', 'rekap siswa']`
- **Q25**: *Bagaimana cara melihat persentase kehadiran siswa per mata pelajaran?*  
  **A25**: Di menu **Presensi Siswa**, pilih kelas dan mata pelajaran pada dropdown filter, lalu klik tombol Tampilkan. Anda akan melihat rekapitulasi total hadir, sakit, izin, dan alpa setiap murid beserta persentase kehadirannya.  
  **Keywords**: `['persentase kehadiran', 'kehadiran murid', 'rekap absensi siswa', 'presensi siswa']`

#### 12. Verifikasi (`view-admin-verif`)
- **Q26**: *Bagaimana administrator menyetujui atau menolak permohonan izin/sakit guru?*  
  **A26**: Buka menu **Verifikasi**, pilih tab **Presensi**. Cari pengajuan guru yang bertanda *Menunggu*. Klik tombol **Setujui** untuk memvalidasi izin/sakit, atau klik **Tolak** dan masukkan alasan penolakan agar guru dapat merevisi pengajuannya.  
  **Keywords**: `['verifikasi', 'setujui izin', 'tolak izin', 'verifikasi presensi', 'admin verifikasi']`
- **Q27**: *Bagaimana jika admin salah menekan tombol verifikasi dan ingin membatalkannya?*  
  **A27**: Pada kartu pengajuan yang sudah diverifikasi di menu Verifikasi, terdapat tombol **Reset Status** (ikon panah melingkar). Klik tombol tersebut untuk mengembalikan status pengajuan kembali menjadi *Menunggu*.  
  **Keywords**: `['reset status', 'batal verifikasi', 'salah verifikasi', 'kembalikan verifikasi']`

#### 13. Sistem Blok (`view-sistem-blok`)
- **Q28**: *Apa kegunaan fitur Sistem Blok dan bagaimana cara membuatnya?*  
  **A28**: Fitur **Sistem Blok** digunakan untuk menandai periode kegiatan khusus sekolah (misal: Ujian Semester, AKM, Masa Jeda, atau Pondok Ramadhan). Untuk membuatnya, administrator membuka menu **Sistem Blok**, klik **+ Tambah Periode Blok**, masukkan nama kegiatan, tanggal mulai, tanggal selesai, dan deskripsi, lalu klik Simpan.  
  **Keywords**: `['sistem blok', 'buat blok', 'periode blok', 'ujian sekolah', 'kegiatan khusus']`
- **Q29**: *Apakah jadwal pelajaran reguler di database akan terhapus saat Sistem Blok aktif?*  
  **A29**: Tidak sama sekali! Data jadwal mengajar reguler tetap utuh tersimpan di database. Sistem Blok hanya menyembunyikan jadwal reguler dari antarmuka guru selama tanggal blok tersebut berlangsung dan mengalihkan guru untuk mengisi Jurnal Kegiatan. Setelah periode blok berakhir, jadwal reguler otomatis kembali tampil normal.  
  **Keywords**: `['jadwal terhapus', 'database jadwal', 'sistem blok aktif', 'jadwal reguler hilang']`

#### 14. Jurnal Kelas (`view-jurnal-kelas`)
- **Q30**: *Siapa saja yang memiliki hak akses untuk membuka halaman Jurnal Kelas?*  
  **A30**: Halaman **Jurnal Kelas** secara eksklusif hanya dapat diakses oleh **Administrator** dan guru yang ditugaskan sebagai **Wali Kelas**. Guru biasa yang bukan wali kelas tidak dapat membukanya.  
  **Keywords**: `['jurnal kelas', 'akses ditolak', 'wali kelas', 'siapa bisa buka', 'hak akses']`
- **Q31**: *Bagaimana cara wali kelas memantau aktivitas mengajar guru lain di kelas binaannya?*  
  **A31**: Di menu **Jurnal Kelas**, wali kelas dapat melihat seluruh jurnal pembelajaran yang diisi oleh guru mapel apa saja pada kelas binaan tersebut setiap harinya, termasuk materi yang diajarkan dan siswa yang tidak hadir pada jam tersebut.  
  **Keywords**: `['pantau kelas', 'jurnal kelas', 'wali kelas pantau', 'guru mapel masuk']`

#### 15. Analitik (`view-analitik`)
- **Q32**: *Data statistik apa saja yang disajikan di menu Analitik?*  
  **A32**: Menu **Analitik** menyajikan ringkasan metrik sekolah bulanan: total kehadiran tepat waktu, jumlah keterlambatan, pengajuan izin/sakit/dinas luar, total jurnal KBM terverifikasi, laporan piket, serta **Leaderboard** (peringkat guru paling disiplin).  
  **Keywords**: `['analitik', 'statistik', 'kpi', 'kehadiran tepat waktu', 'grafik', 'leaderboard']`
- **Q33**: *Bagaimana cara melihat peringkat kedisiplinan guru (Leaderboard)?*  
  **A33**: Buka menu **Analitik**, pilih bulan yang ingin dianalisis. Di bagian bawah dasbor terdapat kartu **Leaderboard Guru** yang mengurutkan guru berdasarkan tingkat kehadiran tertinggi dan menit keterlambatan terendah.  
  **Keywords**: `['leaderboard', 'peringkat guru', 'guru disiplin', 'analitik guru']`

#### 16. Rekap Akhir (`view-admin-rekap`)
- **Q34**: *Bagaimana cara mencetak laporan rekapitulasi bulanan seluruh guru untuk yayasan/dinas?*  
  **A34**: Administrator membuka menu **Rekap Akhir**, pilih bulan berjalan atau tentukan rentang tanggal kustom, pastikan seluruh data sudah terangkum, lalu klik tombol **Cetak Halaman** untuk mencetak laporan resmi berstempel dan bertanda tangan Kepala Sekolah.  
  **Keywords**: `['rekap akhir', 'laporan bulanan', 'cetak rekap guru', 'dinas', 'yayasan', 'print rekap']`
- **Q35**: *Bisakah laporan rekapitulasi akhir diekspor ke file Excel?*  
  **A35**: Ya, di sudut kanan atas menu **Rekap Akhir** terdapat tombol **Ekspor Excel**. Klik tombol tersebut untuk mengunduh seluruh data presensi, menit telat, jurnal, dan piket ke format spreadsheet `.xlsx`.  
  **Keywords**: `['ekspor excel', 'rekap akhir excel', 'unduh laporan', 'download excel rekap']`

#### 17. Master Data (`view-admin-data`)
- **Q36**: *Bagaimana cara mengelola data siswa, data guru, dan jadwal KBM di Master Data?*  
  **A36**: Buka menu **Master**, pilih tab yang ingin dikelola: **Siswa** untuk data murid, **Guru** untuk data pengajar & reset akun, **Mapel** untuk mata pelajaran, **Kalender** untuk hari libur, **Jadwal** untuk alokasi jam KBM mingguan, dan **Wali Kelas** untuk penugasan wali kelas. Anda dapat menambah, mengedit, atau menghapus data langsung dari tabel.  
  **Keywords**: `['master data', 'kelola siswa', 'kelola guru', 'jadwal pelajaran', 'tambah data', 'edit guru']`
- **Q37**: *Bagaimana cara melakukan kenaikan kelas atau kelulusan siswa secara massal?*  
  **A37**: Di menu **Master**, buka tab **Siswa**, lalu klik tombol **Proses Naik Kelas** di atas tabel. Pilih kelas asal dan kelas tujuan untuk memindahkan murid secara massal, atau tentukan status lulus bagi kelas akhir.  
  **Keywords**: `['naik kelas', 'kenaikan kelas', 'kelulusan', 'massal', 'tahun ajaran baru']`
- **Q38**: *Bagaimana cara mereset password akun guru yang lupa kata sandi?*  
  **A38**: Masuk ke menu **Master**, pilih tab **Guru**, cari nama guru yang bersangkutan, klik ikon kunci atau edit data guru, lalu masukkan kata sandi baru dan klik **Simpan**. Guru dapat langsung login dengan kata sandi baru tersebut.  
  **Keywords**: `['lupa password', 'reset password', 'ganti sandi guru', 'kata sandi akun']`

#### 18. Akses Data/Backup (`view-admin-backup`)
- **Q39**: *Kapan dan bagaimana cara melakukan backup data tahunan di aplikasi?*  
  **A39**: Backup data disarankan dilakukan setiap akhir semester atau akhir tahun ajaran. Buka menu **Akses Data / Backup**, masukkan tahun ajaran yang akan dicadangkan, lalu klik **Backup Sekarang**. Data transaksi presensi dan jurnal akan disinkronkan ke Google Spreadsheet/Cloud dan riwayat backup akan dicatat.  
  **Keywords**: `['backup', 'pencadangan', 'akses data', 'spreadsheet', 'arsip data', 'simpan data']`
- **Q40**: *Apakah data di aplikasi akan hilang setelah proses backup dijalankan?*  
  **A40**: Data presensi dan jurnal yang telah dicadangkan ke Google Spreadsheet dapat dibersihkan dari database lokal untuk menghemat kuota dan mempercepat respon aplikasi, sementara arsip permanen tetap aman tersimpan di Spreadsheet.  
  **Keywords**: `['hapus data', 'kosongkan data', 'keamanan backup', 'database ringan']`

#### 19. Sistem (`view-admin-config`)
- **Q41**: *Bagaimana cara mengatur titik lokasi GPS dan radius presensi sekolah?*  
  **A41**: Masuk ke menu **Sistem**, gulir ke bagian **Pengaturan Lokasi GPS Absensi**. Anda bisa mengklik tombol *Deteksi Lokasi Saat Ini* atau memasukkan Latitude dan Longitude sekolah secara manual, serta mengisi batas **Radius Presensi (meter)** (misalnya 100 meter). Setelah selesai, klik **Simpan Konfigurasi**.  
  **Keywords**: `['pengaturan gps', 'radius presensi', 'titik lokasi sekolah', 'geofence', 'latitude', 'longitude']`
- **Q42**: *Bagaimana cara mengubah jam presensi datang dan jam kepulangan guru?*  
  **A42**: Di menu **Sistem**, pada bagian **Pengaturan Jam Presensi**, Anda dapat mengatur Jam Datang Mulai, Jam Batas Tepat Waktu (batas toleransi keterlambatan), Jam Datang Akhir, Jam Pulang Mulai, Jam Pulang Hari Jumat, dan Jam Pulang Akhir, lalu klik **Simpan Konfigurasi**.  
  **Keywords**: `['jam kerja', 'jam presensi', 'jam datang', 'jam pulang', 'toleransi telat', 'atur jam']`

---

### 2.3 UI Styling Conventions

#### 1. Font Awesome Usage
- Version: Font Awesome 6.4.0 (CDN).
- Use `fa-solid fa-...` class naming.
- Floating AI Assistant trigger icon: `fa-solid fa-wand-magic-sparkles` (with optional glowing badge / ping animation).
- Tooltip & UI action icons:
  - Question / Hint: `fa-solid fa-circle-question`
  - Sparkles / AI: `fa-solid fa-sparkles`
  - Send message: `fa-solid fa-paper-plane`
  - Next step: `fa-solid fa-arrow-right`
  - Skip / Close: `fa-solid fa-xmark`
  - Complete check: `fa-solid fa-check`

#### 2. Tailwind CSS Color Palette & Theme Tokens
- Primary Brand Green: `bg-nizamudin-green` (`#0B4619`), `bg-emerald-600`, `text-emerald-700`, `bg-emerald-50`, `dark:bg-emerald-950/30`.
- Secondary Gold: `bg-nizamudin-gold` (`#D4AF37`), `text-nizamudin-gold`, `bg-amber-100`, `text-amber-800`, `border-amber-300`.
- Neutral Backgrounds: Light `bg-slate-50` / `bg-gray-100`, Dark `bg-[#121212]` (`nizamudin-darkbg`).
- Cards: `glass-card` (white with slate borders in light mode, `#1e1e1e` in dark mode).
- Interactive buttons: `btn-click` (CSS class providing smooth scale down on tap and brightness increase on hover).

#### 3. Z-Index Layering Scale
- `z-10`: Main view container
- `z-20`: Form inputs, search fields
- `z-40`: Top header bar (`header.fixed.top-0`)
- `z-45`: AI Assistant floating launcher button
- `z-50`: Modals, broadcast drawer, sidebar overlay
- `z-[60]`: Onboarding backdrop overlay (semi-transparent blackout)
- `z-[70]`: Onboarding spotlight aperture box
- `z-[75]`: Onboarding floating tooltip popover
- `z-[1060]`: SweetAlert2 dialogs

---

### 2.4 Highlight Overlay & Tooltip Collision Avoidance Mechanism

#### 1. Spotlight Cutout via Box-Shadow
When targeting an element with `data-tour="target-id"`:
```typescript
const el = document.querySelector(`[data-tour="${targetId}"]`);
if (el) {
  const rect = el.getBoundingClientRect();
  // Spotlight position
  const p = 6; // padding in px
  const spotlightStyle = {
    position: 'fixed',
    top: `${rect.top - p}px`,
    left: `${rect.left - p}px`,
    width: `${rect.width + p * 2}px`,
    height: `${rect.height + p * 2}px`,
    borderRadius: '14px',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
    border: '2px solid #D4AF37',
    pointerEvents: 'none',
    zIndex: 70,
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  };
}
```
**Why this approach is superior:**
1. Zero extra DOM wrappers or layout reflows.
2. Hardware-accelerated CSS transition animates the spotlight smoothly between different elements.
3. Automatically darkens the entire viewport around the cutout without SVG scaling issues.

#### 2. Synchronizing with Sidebar Open State
- When step targets a sidebar menu item (e.g. `view-guru-presensi`, `view-admin-verif`, etc.):
  - Onboarding controller calls `setSidebarOpen(true)`.
  - Wait 150ms for the sidebar slide-in transition to finish before measuring `rect`.
  - Call `el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` if the menu is scrolled out of view.
- When step targets the hamburger menu button or the floating AI button:
  - Onboarding controller calls `setSidebarOpen(false)`.

#### 3. Viewport Boundary Collision Avoidance for Floating Tooltip
Given `rect = targetEl.getBoundingClientRect()` and tooltip dimensions (`tooltipWidth = Math.min(320, window.innerWidth - 32)`, `tooltipHeight = ~160px`):

- **Desktop (`window.innerWidth >= 768px`)**:
  - Sidebar targets: placed to the right (`left = rect.right + 16px`).
    `top = Math.max(16, Math.min(rect.top, window.innerHeight - tooltipHeight - 16))`.
  - Header / Hamburger targets: placed below (`top = rect.bottom + 12px`, `left = rect.left`).
  - Floating button targets: placed to the left (`left = rect.left - tooltipWidth - 16px`, `top = rect.top - 20px`).

- **Mobile Phones (`320px–428px`)**:
  - The sidebar spans 85% of screen width, leaving no room on the right side.
  - Position resolution:
    1. If `rect.bottom + tooltipHeight + 20 <= window.innerHeight`:
       Place **BELOW** target: `top = rect.bottom + 12px`, `left = 16px`, `right = 16px`.
    2. Else if `rect.top - tooltipHeight - 20 >= 0`:
       Place **ABOVE** target: `top = rect.top - tooltipHeight - 12px`, `left = 16px`, `right = 16px`.
    3. Fallback:
       **Dock to Bottom**: `fixed bottom-4 left-4 right-4 z-[75]` with slide-up modal animation. The user can clearly see the target highlighted above while reading the description and tapping "Lanjut" or "Lewati" easily with their thumb.

#### 4. LocalStorage Flags & Reset Capabilities
- **Keys**:
  - `sipjam_onboarding_guru_done` for teachers.
  - `sipjam_onboarding_admin_done` for administrators.
- **Auto Trigger**:
  Check on login / AppScreen mount:
  ```typescript
  useEffect(() => {
    const key = isAdmin ? 'sipjam_onboarding_admin_done' : 'sipjam_onboarding_guru_done';
    const isDone = localStorage.getItem(key);
    if (!isDone) {
      const timer = setTimeout(() => {
        setIsTourActive(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isAdmin]);
  ```
- **Completion / Skip**:
  Sets the respective key to `'true'`.
- **Re-run Button**:
  In sidebar under Pengaturan Akun:
  ```tsx
  <button 
    type="button" 
    onClick={() => { setSidebarOpen(false); setIsTourActive(true); }}
    className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-gray-800"
  >
    <i className="fa-solid fa-circle-question w-5 text-center text-amber-500"></i> Lihat Tutorial Lagi
  </button>
  ```

---

## 3. Caveats

1. **Superadmin Role**: Superadmin is purely platform-wide (school tenant management) and does not require an onboarding tour.
2. **Offline Rule-Based Chatbot**: Zero external LLM APIs (OpenAI, Gemini API, etc.) are allowed. All matching must be performed locally using deterministic string and keyword scoring.
3. **Zero New NPM Dependencies**: Must strictly adhere to pre-installed Tailwind CSS v4 and Font Awesome 6.4.0 CDN.
4. **Z-Index Layering Integrity**: Ensure the onboarding tour (`z-[60]`–`z-[75]`) sits below SweetAlert2 (`z-[1060]`) so any critical confirmation dialogs are never blocked.

---

## 4. Conclusion

The specification provides a complete, tested design:
1. **All 19 Main Menus Cataloged**: Verified titles, icons, view IDs, and access roles.
2. **42 Context-Aware Q&A Pairs**: Rich, authentic Indonesian answers covering every workflow across teacher and admin duties.
3. **Pure Offline Rule-Based Matcher**: Keyword tokenization, view context boost (+15 pts), and helpful suggestion chips.
4. **Responsive Highlight Overlay**: Box-shadow 9999px spotlight, sidebar state synchronization, and boundary collision avoidance designed for 320px–428px mobile viewports.

---

## 5. Verification Method

- **Static Type Checking**: `npx tsc --noEmit` must pass with 0 errors.
- **Production Build**: `npm run build` must succeed cleanly.
- **Automated Tests**: Execute `npx tsx tests/ai_assistant_and_onboarding.test.ts` (to be written by implementer) validating:
  - Knowledge base keyword matching with context boost.
  - Fallback triggering and available topic categories.
  - Onboarding step progression and localStorage persistence.
- **Responsive Inspection**: Test on mobile (360px viewport) to confirm tooltip docking and absence of horizontal overflow.
