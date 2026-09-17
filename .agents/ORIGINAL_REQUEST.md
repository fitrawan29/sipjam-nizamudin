# Original User Request

## 2026-09-11T07:26:30Z

Use a very large team of agents. 
A comprehensive UI/UX audit and refactoring of the application. The focus is on implementing a clean, simple, mobile-first design with pleasing icons, and enforcing strict font color contrast rules across light and dark modes, strictly through CSS/Tailwind class modifications.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Strict Light/Dark Mode Typography Contrast
Audit all components and enforce strict contrast adaptability. All text elements must use pure black (or highly legible dark equivalents) in light mode, and pure white (`dark:text-white`) in dark mode. Do not leave any hardcoded dark colors that lack dark-mode variants. This must be accomplished strictly by adjusting Tailwind CSS classes, without altering React component logic or application state.

### R2. Mobile-First Simplicity & Iconography
Simplify the layout for an intuitive, mobile-first experience. Ensure icons are consistently sized, aesthetically pleasing, and comfortable for the eyes. Avoid overly harsh color palettes for UI elements, ensuring a harmonious look across both themes.

## Acceptance Criteria

### CSS & Contrast Validation (Agent-as-Judge)
- [ ] An independent reviewing agent confirms that all modified files successfully implement the `dark:text-white` (or equivalent) rule for text elements, with no unreadable text combinations in dark mode.
- [ ] An independent reviewing agent confirms that NO core React functionality or component logic was modified (only CSS/className changes).

### Layout & Design Validation (Agent-as-Judge)
- [ ] An independent reviewing agent confirms that the components render in a single-column or flex-wrap layout suitable for mobile viewports without causing horizontal overflow.
- [ ] An independent reviewing agent verifies that icons are consistently styled and sized across the modified views.

## 2026-09-11T08:31:24Z

Use a very large team of agents. 
A comprehensive functional audit and repair of UI buttons across the Admin and Guru interfaces. The specific focus is to replace any remaining dummy functions with actual Supabase database operations, particularly within the Verification views (Presensi, Jurnal, Piket) and Recap features.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Functionalize Verification Buttons
Ensure all action buttons in the Admin verification views (such as approving or rejecting Presensi, Jurnal, and Piket) are fully operational. They must execute actual updates to the `status_verifikasi` (or equivalent) fields in the Supabase database.

### R2. Repair Recap Features
Ensure all filter, search, and action buttons in the Recap views properly fetch, calculate, and display real data according to the selected parameters, abandoning any hardcoded dummy data logic.

### R3. Global Button Audit
Systematically scan the remaining views across the application. Identify any buttons that are inactive, unresponsive, or using mock functionality, and wire them up to their intended real system operations.

## Acceptance Criteria

### Functional Validation (Agent-as-Judge)
- [ ] An independent reviewing agent confirms that the `onClick` handlers for modified verification buttons execute valid, mutating Supabase API queries (e.g., `supabase.from(...).update(...)`) rather than mock logic or empty functions.
- [ ] An independent reviewing agent confirms that the Recap features correctly utilize Supabase fetch queries based on the UI's filter states.
- [ ] An independent reviewing agent confirms that any newly wired global buttons function accurately in accordance with their visual labels and intended purposes.

## 2026-09-11T12:54:07Z

Use a very large team of agents. 
Apply targeted UI/UX and database schema improvements, specifically enforcing Light Mode as default, correcting Google Drive image rendering, ensuring KBM journal mapel/kelas drop-downs are dynamically filtered per teacher, strictly standardizing print document headers, and conducting a broad quality-of-life audit.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Default Theme & Image Rendering
Make "Light Mode" the default theme for the application. Implement a URL transformer or regex to convert standard Google Drive share links into direct-renderable image URLs (e.g., `drive.google.com/uc?id=`) so images display correctly within the application's UI.

### R2. Dynamic KBM Journal Filtering
Update the "Guru Jurnal" submission form so the "Mata Pelajaran" and "Kelas" dropdowns only display the specific subjects and classes assigned to the currently logged-in teacher. The team is explicitly authorized to create and manage new relational tables in the Supabase database to support this mapping if the current schema is insufficient.

### R3. Strict Print Formatting
Enforce strict CSS print constraints on the `PrintHeader` component:
- The school address line must remain on a single horizontal line (`white-space: nowrap`). If it overlaps with the left/right logos, its font size must dynamically shrink.
- The line spacing (`line-height`) for the header text must be exactly `1`.
- In the signature block, append the dynamic string "[Kabupaten/Kota], [Date]" immediately above the "Kepala Sekolah" designation (pulling the region dynamically from settings if available).

### R4. Broad Quality-of-Life Audit
Conduct a systematic sweep of the application to identify and resolve any other UI/UX flaws, missing states, or visual inconsistencies not explicitly mentioned above to polish the application.

## Acceptance Criteria

### Technical & UI Validation (Agent-as-Judge)
- [ ] An independent reviewing agent confirms theme contexts default to light mode, and a URL parser actively converts Google Drive links in image tags.
- [ ] An independent reviewing agent confirms that Supabase queries in the Jurnal KBM form dynamically filter Mapel/Kelas based on the user's identity (validating any newly created schema relations).
- [ ] An independent reviewing agent confirms the Print CSS explicitly uses `white-space: nowrap` and flexible text shrinking for the address, `line-height: 1` for the header, and correctly formats the signature date line.
- [ ] An independent reviewing agent confirms the general sweep introduced no breaking changes and the Next.js application builds cleanly.

## 2026-09-11T22:35:46Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Delegate to teamwork_preview
> Requested team: Full Team

Memperbaiki tata letak cetak dokumen sesuai standar persuratan (Kop Surat & Tanda Tangan), mengubah Jurnal KBM menjadi tabel 8 kolom (termasuk migrasi DB dan pembaruan Form), menampilkan jadwal mapel harian di dashboard, serta melakukan bug hunting menyeluruh. Gunakan tim berskala penuh (Full Team) untuk mengeksekusi berbagai perubahan ini secara simultan.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyesuaian Format Cetak Kop Surat & Tanda Tangan
- Tambahkan input "Nama Kota/Kabupaten" pada halaman Pengaturan Admin dan simpan konfigurasinya ke Supabase.
- Pada style cetak (print): set line-height ke 1 untuk jarak spasi.
- Teks alamat kop surat wajib 1 baris. Gunakan teknik CSS (misal: white-space nowrap dan penyesuaian font-size otomatis) agar teks tidak terpotong atau membungkus (wrap) ke baris baru.
- Letakkan logo yayasan (kiri) dan logo dinas (kanan) bersumber dari tabel pengaturan.
- Format tanda tangan: Letakkan seluruh blok tanggal dan tanda tangan di rata kanan (align right).
- Baris pertama tanda tangan menggunakan format "[Kota/Kabupaten dari Pengaturan], [DD Bulan YYYY]". Diikuti dengan "Kepala Sekolah", nama, dan NIP.

### R2. Modifikasi Struktur Database & Form Jurnal KBM
- Tambahkan kolom-kolom baru ke tabel `jurnal_pembelajaran` di Supabase untuk menampung data: pertemuan_ke, jam_ke, tujuan_pembelajaran, materi_pembelajaran, kehadiran_murid, catatan_refleksi, foto_kegiatan (sesuaikan kolom yang belum ada).
- Perbarui UI `GuruJurnal.tsx` dengan field input baru agar guru dapat mengisi kelengkapan data tersebut.

### R3. Rekonstruksi Tabel Rekap Jurnal Pembelajaran
- Pada tampilan `RekapJurnalView.tsx` dan saat dicetak, gunakan tata letak tabel dengan tepat 8 kolom ini:
  1. Hari, tanggal bulan tahun
  2. Kelas, pertemuan dan jam ke-
  3. Tujuan pembelajaran
  4. Materi pembelajaran
  5. Kegiatan pembelajaran
  6. Kehadiran murid
  7. Catatan refleksi
  8. Foto kegiatan

### R4. Menampilkan Jadwal Mengajar Harian
- Tambahkan informasi/widget jadwal mata pelajaran khusus guru yang bersangkutan pada halaman dashboard utama mereka (HomeView), disesuaikan dengan hari berjalan.

### R5. Bug Hunting & Stabilisasi
- Eksplorasi seluruh komponen aplikasi, perbaiki bug yang ditemukan (UI glitch, logic errors, null references).
- Lakukan pengecekan ketat pada kode yang diubah.

## Acceptance Criteria

### Verifikasi Database & TypeScript
- [ ] Menjalankan `npx tsc --noEmit` menghasilkan exit code 0 tanpa error tipe data baru.
- [ ] Kueri ke Supabase `information_schema.columns` memverifikasi bahwa kolom-kolom baru pada `jurnal_pembelajaran` telah berhasil ditambahkan.

### Verifikasi Fungsional & UI
- [ ] Komponen admin (Pengaturan) berhasil menyimpan data `kota_kabupaten`.
- [ ] Elemen alamat kop surat (print-only) dikonfigurasi dengan CSS agar tidak membungkus (`whitespace-nowrap`) dengan skala font yang dapat menyusut (jika menggunakan text-wrap styling).
- [ ] Blok tanda tangan (PrintSignature) memiliki CSS flex/grid yang memaksanya merapat ke kanan (`justify-end`).
- [ ] Tabel rekap jurnal menggunakan tag `<table>` yang secara eksplisit memiliki 8 header `<th>` sesuai urutan yang diminta.
- [ ] Halaman dashboard guru (HomeView) merender daftar mata pelajaran/jadwal spesifik untuk guru tersebut di hari itu berdasarkan tabel `jadwal_pelajaran`.

## 2026-09-12T04:36:57Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Delegate to teamwork_preview
> Requested team: Full Team

Melakukan perombakan masif pada dashboard Guru dan Admin, mendesain ulang format cetak dokumen dengan dukungan sakelar orientasi cetak, mengubah sistem manajemen piket dan perangkat pembelajaran, membangun fungsionalitas broadcast pengumuman, serta menambahkan transisi UI yang halus.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyesuaian Cetak Dokumen (Rekap Jurnal, Rekap Akhir, Presensi Siswa)
- Buat tombol interaktif di antarmuka cetak agar pengguna dapat memilih orientasi (Landscape/Portrait), dan ubah injeksi CSS `@page` berdasarkan pilihan tersebut.
- Sembunyikan menu bar aplikasi (navbar/sidebar) saat pencetakan dilakukan.
- Blok tanda tangan (Kabupaten, tanggal, jabatan, nama, NIP) diatur rata kiri-kanan (justify) di dalam kontainernya, memastikan setiap elemen memiliki baris sendiri dan tidak tergulung ke bawah.
- Cetak header keterangan rentang waktu data yang ditarik secara dinamis dari filter aplikasi (misal: "Periode: September 2026").
- Pastikan resolusi foto kegiatan pada jurnal dapat dirender dan dicetak dengan jelas tanpa terpotong batas kertas.
- Tabel untuk Presensi Siswa dan Rekap Akhir wajib didesain dengan garis tepi, padding, dan struktur tabel yang sangat profesional.

### R2. Perombakan Dashboard & Antarmuka Guru
- Hapus komponen lama "Aktivitas Utama".
- Bangun kartu statistik Presensi pribadi (H, TL, Izin, Sakit).
- Tampilkan rasio "Jurnal terisi vs Total target yang harus diisi hari ini" (Total target ini dihitung secara dinamis dari jumlah kelas yang ditugaskan hari ini di jadwal_pelajaran).
- Tampilkan persentase kehadiran siswa pada setiap mata pelajaran yang diampu.
- Tampilkan list/daftar status kelengkapan dokumen yang sudah atau belum diupload untuk setiap mata pelajaran.

### R3. Perombakan Dashboard & Verifikasi Admin
- Dashboard Admin: Muat rekapitulasi data hari berjalan yang memetakan status setiap guru: presensi datang, pengisian jurnal, laporan piket, dan presensi pulang.
- Halaman Verifikasi: Tambahkan filter dropdown reaktif untuk menyortir dan menampilkan hanya guru yang "Sudah" maupun "Belum" menyelesaikan tugas (presensi, jurnal, piket).

### R4. Manajemen Piket & Perangkat Pembelajaran (Admin)
- Kelola Piket: Hapus tab "Isi Laporan". Sebagai gantinya, buat fungsionalitas "Penugasan Piket" untuk mengatur penjadwalan/penetapan guru dan siswa piket (tambahkan tabel Supabase baru jika dibutuhkan).
- Perangkat Pembelajaran: Hapus tab "Upload Baru". Ubah tata letak daftar dokumen menjadi sistem kartu matriks per guru (menampilkan mapel mereka beserta indikator dokumen mana yang belum/sudah diunggah).

### R5. Sistem Informasi (Broadcast) & Transisi UI
- Hapus menu "Pantauan Harian".
- Bangun menu fungsional "Informasi": Sistem pengumuman (broadcast) dua arah/satu arah, lengkap dengan tabel database baru untuk menyampaikan informasi dari admin kepada guru, wali kelas, dan orang tua.
- Integrasikan transisi animasi yang halus (CSS smooth transitions) pada hover tombol, pergantian state komponen, dan navigasi seluruh halaman agar terkesan modern.

## Acceptance Criteria

### Verifikasi Database & Backend
- [ ] Tersedia migrasi Supabase untuk tabel "Pengumuman/Informasi" dan "Penugasan Piket".
- [ ] Kueri perhitungan "Target Jurnal" di dashboard guru mengambil data jadwal hari ini dengan presisi absolut.
- [ ] Backend aman tanpa TypeScript/tipe error.

### Verifikasi Tampilan & Fungsi
- [ ] Sakelar orientasi cetak langsung mengubah properti dokumen cetak secara nyata.
- [ ] Filter pada halaman Verifikasi memilah daftar komponen tanpa reload/flicker.
- [ ] Semua komponen antarmuka yang dirombak merespons animasi transisi dengan mulus.

## 2026-09-12T09:49:49Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team (karena ini adalah refactor arsitektur database berskala besar)

Mengubah aplikasi presensi dan jurnal sekolah (SIPJAM) yang saat ini bersifat *single-tenant* menjadi sistem perangkat lunak sebagai layanan (*SaaS*) multi-sekolah. Mengimplementasikan hierarki pengguna dengan peran **Superadmin** (untuk mendaftarkan sekolah dan membuat akun admin sekolahnya) dan **Admin** sekolah. Memastikan isolasi data antar sekolah secara ketat dan sangat efisien menggunakan Row Level Security (RLS) pada tingkat database Supabase, serta mengurutkan data dari tanggal terkecil ke terbesar pada semua rekap dan hasil cetak dokumen.

Working directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
Integrity mode: benchmark

## Requirements

### R1. Multi-Tenant Database Architecture & RLS
Buat tabel baru untuk entitas `sekolah`. Modifikasi skema seluruh tabel transaksional dan master yang ada (seperti `data_guru`, `data_siswa`, `presensi_guru`, `jurnal_pembelajaran`, `pengaturan`, dll) untuk menyertakan `sekolah_id`. Aktifkan **Row Level Security (RLS)** bawaan Supabase pada tabel-tabel tersebut agar kueri data otomatis terfilter di level database. Hal ini penting untuk mengoptimalkan performa Vercel & Supabase tanpa harus memfilter data di level memori aplikasi.

### R2. Superadmin & Admin Hierarchy
Buat antarmuka (dashboard) khusus untuk pengguna dengan peran "Superadmin". Superadmin bertugas mendaftarkan data sekolah baru ke sistem, lalu membuatkan akun dengan peran "Admin" yang terikat (link) dengan `sekolah_id` tersebut. Pastikan saat "Admin" sekolah login, seluruh tampilan aplikasi hanya akan merender dan mengelola data untuk sekolahnya saja.

### R3. Ascending Date Sorting
Ubah logika pada fitur penarikan data rekapitulasi (khususnya Rekap Jurnal, Rekap Siswa, dan halaman hasil Cetak Dokumen) agar selalu mengurutkan (*sorting*) berdasarkan data tanggal dari yang terkecil (terlama) ke yang terbesar (terbaru).

## Acceptance Criteria

### Data Security & Isolation
- [ ] Pengujian kueri RLS Supabase memastikan bahwa *session* untuk Admin/Guru dari Sekolah A tidak dapat membaca (SELECT), menambah (INSERT), memperbarui (UPDATE), atau menghapus (DELETE) baris data milik Sekolah B.

### Role Hierarchy Workflow
- [ ] Tersedia halaman di mana Superadmin dapat menambahkan entri sekolah baru.
- [ ] Tersedia fitur di mana Superadmin dapat membuat akun Admin baru yang direlasikan ke sebuah sekolah.

### Data Ordering
- [ ] Hasil pencetakan (Cetak Dokumen) pada Rekap Jurnal dan Rekap Presensi secara visual menampilkan baris tabel dari tanggal awal bulan hingga tanggal akhir bulan (ascending).

## 2026-09-17T10:29:39Z

# Teamwork Project Prompt - Draft

> Status: Launched
> Goal: Delegated to teamwork_preview
> Requested team: Full teamwork (skala besar)

Implement comprehensive feature additions and enhancements for the SIPJAM multi-tenant application. Key implementations include attendance synchronization across roles, gradebook management, selfie-based attendance with auto-watermarks, native VAPID PWA push notifications, and extensive administrative controls.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Sinkronisasi Kehadiran & Wali Kelas
- Admin dapat menetapkan guru sebagai Wali Kelas untuk kelas tertentu.
- Wali kelas dapat menginput status Izin/Sakit untuk siswa di kelasnya.
- Sinkronisasi absolut: Jika status kehadiran siswa diubah (menjadi Hadir, Izin, Sakit, atau Alpa) oleh Wali Kelas, Piket, atau Guru Mapel, maka status siswa tersebut akan berubah secara global untuk hari tersebut di semua catatan sesi mapel lainnya. 
- Sistem harus tetap menyimpan log/keterangan (*audit trail*) mengenai siapa yang terakhir melakukan perubahan status tersebut.

### R2. Presensi Guru Selfie & Integrasi Google Drive
- Presensi Datang dan Dinas Luar wajib menggunakan antarmuka foto selfie menggunakan kamera perangkat.
- Pada preview foto, sistem merender *watermark/stamp* (berisi tanggal, lokasi koordinat, dan waktu) di posisi tengah bawah foto.
- Pengguna dapat memilih untuk foto ulang atau menyimpan.
- Foto diunggah menggunakan sistem *webhook* Google Apps Script (GAS) yang sudah pernah dibuat sebelumnya.
- Jika guru Datang dengan status "Dinas Luar", saat presensi Pulang, sistem memberikan opsi antara "Di Sekolah" atau "Dinas Luar".

### R3. Daftar Nilai (Gradebook)
- Guru dapat melakukan CRUD pada entitas Daftar Nilai.
- Kategori asesmen didesain dinamis: Asesmen Diagnostik (1 per TP), Asesmen Formatif (jumlah disesuaikan per TP), dan Asesmen Sumatif (jumlah disesuaikan per TP).

### R4. PWA Push Notifications & Pengaturan Akun
- Implementasikan Push Notifikasi berbasis Web Push API standar (VAPID) yang tidak bergantung pada pihak ketiga (bukan Firebase), terhubung langsung ke *service worker*.
- Menu Pengaturan Guru & Admin: Izinkan ganti avatar (dari sekumpulan opsi gambar *default* yang keren), ganti username, dan ganti password.
- Admin dapat mengatur opsi kehadiran guru: "Wajib Hadir Setiap Hari" vs "Wajib Hadir Hanya di Hari Mengajar". Kalkulasi sistem Alpa/Terlambat menyesuaikan opsi ini.
- Admin dapat mengubah alamat email tujuan untuk tempat integrasi upload file.

### R5. Master Data & Administrasi Lanjutan
- Tambahkan antarmuka *Edit* pada seluruh Master Data (Guru, Siswa, Kelas, dll).
- Tambahkan fitur "Naik Kelas" untuk siswa (bisa dipilih secara perorangan, per kelas, atau satu angkatan sekaligus) yang mengubah tingkat kelas mereka di database.
- Tampilkan "Rekapan Jurnal Per Kelas": Berupa tabel kompilasi dari isian semua guru yang mengajar di kelas tersebut (No, Nama Guru, Tanggal & Waktu, Mapel, Jam KBM, Materi, Foto, Keterangan kehadiran guru).

### R6. Perbaikan UI
- Format cetak variabel "Kepala [Nama Sekolah]" harus terformat menjadi *Capitalize Each Word* di seluruh fungsi cetak dokumen.
- Pada halaman Perangkat Pembelajaran Guru, dokumen harus dikelompokkan berdasarkan mata pelajaran yang diampu, dengan indikator status jelas (Sudah / Belum di-upload).

## Acceptance Criteria

### Attendance Synchronization (R1)
- [ ] Terdapat pengujian terprogram (*test script*) yang memvalidasi bahwa memperbarui status kehadiran seorang siswa di tabel absensi (misal via Piket) akan memicu *trigger* atau fungsi logika yang mensinkronkan status tersebut ke absensi Mapel lain pada hari yang sama, dan kolom *log_perubahan* mencatat nama *user* pengubahnya.

### Selfie Watermark & Storage (R2)
- [ ] Aplikasi merender elemen <canvas> yang berhasil menggabungkan aliran video (kamera) dengan teks *watermark* koordinat geolokasi tanpa bergantung pada API server (diproses di *client-side*).
- [ ] Transmisi unggahan foto membidik *endpoint webhook* GAS secara asinkron tanpa memblokir UI utama.

### Gradebook Schema (R3)
- [ ] Database Supabase (via skrip migrasi SQL) memiliki tabel nilai yang berelasi dengan Tujuan Pembelajaran (TP) dan mendukung pencatatan nilai terpisah untuk Diagnostik, Formatif, dan Sumatif secara fleksibel.

### Push Notifications & VAPID (R4)
- [ ] *Service worker* (sw.js) mendengarkan *event push* dan mampu menampilkan self.registration.showNotification. Backend Next.js menyediakan rute API validasi *subscription* web push menggunakan pustaka web-push.

### Administrative Rules (R4-R5)
- [ ] Skrip fungsi getGuruDailyState() memiliki percabangan logika yang membebaskan perhitungan "Alpa" pada hari-hari tanpa jadwal mengajar jika guru ditandai sebagai "Wajib Hadir Hanya di Hari Mengajar".
- [ ] Logika "Naik Kelas" berhasil memperbarui kolom kelas pada entitas data_siswa dalam operasi *batch/bulk update*.

