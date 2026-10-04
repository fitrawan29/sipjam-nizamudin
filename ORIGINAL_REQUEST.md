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

## 2026-09-18T07:34:50Z

Implement several feature enhancements to the SIPJAM application, including real-time chat, strict live camera enforcement for attendance/journals, Web Push Notifications, role-based access, and admin configuration adjustments.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Pengaturan Tahun Ajaran & Daftar Nilai
- Pada akun guru, Tahun Ajaran harus disinkronkan dengan pengaturan yang ditetapkan oleh admin di tabel pengaturan/konfigurasi.
- Pada antarmuka admin, daftar nilai dikunci menjadi view-only dan hanya memiliki opsi untuk dicetak.
- Input dan manajemen Tujuan Pembelajaran (TP) hanya dapat diakses melalui akun guru pengampu.

### R2. Sistem Notifikasi & Chat Real-time
- Implementasikan UI ikon bel notifikasi di navbar untuk pemberitahuan siaran (broadcast). Ikon harus memiliki animasi bergetar dan indikator merah jika ada unread broadcast.
- Kembangkan fitur chat real-time antar guru menggunakan Supabase Realtime.
- Integrasikan sistem Web Push Notifications (menggunakan Service Worker & VAPID keys) untuk memberikan peringatan otomatis kepada guru yang belum melakukan presensi, mengisi jurnal, atau piket.

### R3. Hak Akses Jurnal Kelas
- Modifikasi middleware atau routing agar Jurnal Kelas secara eksklusif hanya dapat dibuka oleh role Admin dan Wali Kelas dari kelas yang bersangkutan.

### R4. Pengaturan Kehadiran & Jadwal (Admin)
- Tambahkan konfigurasi di sisi Admin untuk mendefinisikan pengecualian kehadiran guru (hadir khusus hari mengajar). Guru tanpa pengecualian diwajibkan hadir setiap hari kerja.
- Tambahkan konfigurasi jam presensi pulang spesifik untuk hari Jumat di panel Admin.

### R5. Integrasi & Aturan Kamera Langsung
- Presensi pulang, Jurnal, dan Laporan Piket wajib menggunakan input kamera langsung melalui browser (`navigator.mediaDevices`).
- Opsi untuk upload file gambar (dari galeri) harus ditiadakan pada form-form tersebut.
- Kamera harus mendukung pergantian antara kamera depan (user) dan kamera belakang (environment).

## Acceptance Criteria

### Verifikasi Manual & UI
- [ ] Login sebagai Guru -> Tahun Ajaran sesuai dengan data di panel admin.
- [ ] Login sebagai Admin -> Fitur edit pada daftar nilai tidak muncul, hanya tampil tombol "Cetak".
- [ ] Ikon bel notifikasi memicu animasi getar ketika ada baris baru di tabel broadcast dengan status unread untuk user tersebut.
- [ ] Chat antar guru dapat dilakukan secara dua arah, pesan baru muncul tanpa perlu me-refresh halaman.
- [ ] Dialog izin "Kirim Notifikasi (Push)" muncul di browser, dan notifikasi simulasi dari sistem berhasil masuk.
- [ ] Login sebagai Guru biasa -> Akses ke menu Jurnal Kelas terblokir atau disembunyikan.
- [ ] Login sebagai Admin -> Terdapat antarmuka untuk memilih guru yang "Hanya wajib hadir saat hari mengajar" dan antarmuka untuk mengatur "Jam Pulang Hari Jumat".
- [ ] Form Presensi Pulang, Jurnal, dan Piket -> Menampilkan viewfinder kamera langsung, terdapat tombol toggle kamera depan/belakang, dan fitur `<input type="file">` telah dihilangkan.

## 2026-09-19T01:13:28Z

Implement a series of 11 UI/UX improvements, feature additions, and bug fixes for the Next.js sipjam-app, focusing on document management, print layouts, and camera location features.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Print Layout & Document UI Adjustments
- Remove forced portrait/landscape CSS/JS settings; the print layout should rely purely on the user's browser print settings.
- Ensure tables in print preview fit the page responsively without getting cut off before the page is filled.
- Fix the left and right logos on the letterhead (kop surat) to render correctly and be readable.

### R2. Admin - Perangkat Pembelajaran & UI Fixes
- Implement CRUD operations for document types and formats that teachers must upload per subject.
- Create a view for admins to see documents per teacher per subject, and track completeness progress based on required documents per subject.
- Display the teacher's document progress using minimalist cards that can be clicked to open for details.
- Fix the teacher daily status matrix on the admin dashboard to display accurate and correct data.

### R3. Teacher Dashboard & Camera Location
- Reorder the teacher dashboard to show: (1) Personal data statistics, (2) Today's task status, (3) Teaching schedule. Remove any other sections.
- When taking front and back camera photos for presensi, jurnal, and laporan piket, fetch and append the location name formatted as `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]`. Use OpenStreetMap (Nominatim) for reverse geocoding.
- Fix the student attendance percentage calculation to accurately reflect real data.

### R4. User Prompts & Feedback Flows
- Add a PWA install prompt at the application start (assume PWA manifest/service worker is already configured). The prompt should not appear again if the app is already installed or dismissed.
- When an admin rejects presensi, jurnal, or laporan piket, provide a required feedback text column to store the reason for rejection.

## Acceptance Criteria

### Print Layout & Document UI Adjustments
- [ ] Browser print preview does not force orientation.
- [ ] Tables do not overflow or cut off horizontally/vertically in print preview mode.
- [ ] Both logos on the letterhead load successfully and do not overlap text.

### Admin - Perangkat Pembelajaran & UI Fixes
- [ ] Admin can create, read, update, and delete document requirements per subject.
- [ ] Admin can view a grid of minimalist cards showing document completeness per teacher per subject.
- [ ] Clicking a card expands or navigates to the detailed document view.
- [ ] The teacher daily status matrix accurately reflects the aggregated daily data from the database.

### Teacher Dashboard & Camera Location
- [ ] Teacher dashboard top three sections are strictly: Personal Data Stats, Task Status, Teaching Schedule, in that order, with no extraneous widgets.
- [ ] Uploaded photos for presensi/jurnal/piket contain a location string matching the format `[Desa, Kecamatan, Kota, Provinsi]`, successfully fetched from Nominatim.
- [ ] The student attendance percentage formula equals `(total_present / total_students) * 100` and displays correctly on the UI.

### User Prompts & Feedback Flows
- [ ] PWA install prompt is displayed once. If accepted or already installed (e.g., matching a local storage flag or `window.matchMedia('(display-mode: standalone)')`), it is hidden.
- [ ] Admin rejection flow blocks submission until the feedback text area is populated, and the feedback is saved to the backend.

## 2026-09-27T11:26:31Z

This is a single self-contained fix; keep it small and focused.
Identifikasi dan perbaiki bug login untuk akun super admin dan guru, serta perbaiki masalah sinkronisasi data yang tidak update (tidak sesuai dengan database) setelah sesi dibiarkan idle/tidak login dalam waktu lama. Terapkan prinsip Ponytail (pilih solusi paling sederhana dan minimal, utamakan fitur bawaan framework tanpa dependensi baru).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Perbaikan Login (Super Admin & Guru)
Baca dan pahami alur autentikasi yang ada saat ini. Identifikasi penyebab gagal login untuk role 'super admin' dan 'guru', lalu terapkan perbaikan yang paling sederhana dan minimal (Ponytail mode).

### R2. Perbaikan Sinkronisasi Data (Stale Data)
Selidiki akar masalah mengapa data yang ditampilkan tidak sesuai dengan database setelah pengguna dibiarkan idle/tidak login dalam waktu lama. Terapkan mekanisme yang tepat (misalnya pembersihan cache, invalidasi state, atau penanganan token expired) dengan memanfaatkan fitur bawaan framework.

## Acceptance Criteria

### Verifikasi Fungsional (Agent-as-judge)
- [ ] Agen memverifikasi bahwa login sebagai 'super admin' berhasil dilakukan setelah perbaikan.
- [ ] Agen memverifikasi bahwa login sebagai 'guru' berhasil dilakukan setelah perbaikan.
- [ ] Agen memverifikasi bahwa setelah sesi berakhir atau di-simulate idle dalam waktu lama, aplikasi mengambil data terbaru dari database (tidak menampilkan data lama dari cache).
- [ ] Perbaikan dievaluasi berdasarkan kesederhanaan (tidak ada boilerplate berlebihan atau dependensi baru).

## 2026-09-27T14:28:20Z

Fitur Sistem Blok: Membuat fitur manajemen sistem blok waktu. Rentang waktu yang diblokir akan menandakan bahwa tidak ada jadwal mengajar reguler, melainkan digantikan oleh kegiatan khusus. Selama periode ini, guru hanya bertugas mengisi jurnal kegiatan.
Ini adalah tugas yang relatif terisolasi, gunakan tim kecil yang fokus.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Halaman Manajemen Sistem Blok (CRUD)
Buat halaman (UI) untuk mengelola (menambah, mengedit, menghapus) periode sistem blok. Data yang disimpan minimal mencakup tanggal mulai, tanggal selesai, dan nama/deskripsi kegiatan.

### R2. Penyesuaian Tampilan Jadwal
Modifikasi tampilan jadwal mengajar. Jika suatu rentang waktu masuk dalam periode sistem blok yang aktif, jadwal reguler di database tidak boleh dihapus, namun di UI jadwal tersebut harus disembunyikan/ditutupi dan diganti dengan informasi kegiatan blok.

### R3. Jurnal Kegiatan Guru
Selama rentang waktu sistem blok, alur pengisian jurnal guru harus disesuaikan. Guru hanya perlu/bisa mengisi "jurnal kegiatan" untuk periode tersebut, bukan jurnal absensi/mengajar kelas reguler.

### R4. Batasan Implementasi
Gunakan komponen UI dan styling yang sudah ada di dalam project (jangan install library eksternal baru). Ikuti prinsip minimalis (hanya buat apa yang benar-benar dibutuhkan agar fitur ini jalan).

## Acceptance Criteria

### Manajemen Blok (R1)
- [ ] Terdapat form untuk menambahkan periode blok baru yang menyimpan data ke database.
- [ ] Daftar periode blok yang sudah dibuat dapat dilihat dan dihapus/diedit.

### Tampilan Jadwal (R2)
- [ ] Jadwal mengajar reguler yang bertabrakan dengan tanggal blok tidak ditampilkan seperti biasa.
- [ ] Halaman jadwal menampilkan informasi kegiatan blok pada tanggal-tanggal yang terpengaruh.
- [ ] Data jadwal asli di database terbukti tidak terhapus.

### Jurnal Kegiatan (R3)
- [ ] Terdapat form atau penyesuaian UI agar guru dapat mengisi jurnal kegiatan (bukan jurnal reguler) pada hari yang masuk dalam periode blok.

## 2026-09-27T21:46:18Z

Tambahkan dua fitur ke aplikasi SIPJAM (Next.js 16 + Supabase, `c:\Users\Fitra\OneDrive\Documents\sipjam-app`):
1. **AI Assistant rule-based** — tombol chatbot terapung yang muncul di semua halaman setelah login, menjawab pertanyaan user berdasarkan halaman aktif dan kata kunci dengan jawaban statis (Bahasa Indonesia).
2. **Tutorial onboarding interaktif** — highlight overlay step-by-step yang muncul otomatis saat login pertama untuk akun admin dan akun guru (masing-masing punya alur berbeda). Status "sudah lihat" disimpan di `localStorage`. User bisa membuka ulang tutorial dari sidebar atau menu bantuan.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. AI Assistant (Chatbot FAQ Rule-Based)
Tambahkan komponen floating button (ikon tanda tanya / bintang AI) yang muncul di semua halaman setelah login. Saat diklik, muncul panel chat kecil. User mengetik pertanyaan; sistem mencocokkan kata kunci dengan basis pengetahuan statis (hard-coded) yang mencakup semua halaman utama aplikasi (Dashboard, Presensi, Jurnal, Piket, Dokumen, Daftar Nilai, Chat, Informasi, Rekap, Admin Verifikasi, Master Data, dll). Tidak boleh menggunakan API eksternal atau library AI — murni string matching / keyword lookup. Jawaban dalam Bahasa Indonesia. Jika tidak ada jawaban yang cocok, tampilkan pesan ramah dan daftar topik yang tersedia.

### R2. Tutorial Onboarding — Akun Guru
Saat guru pertama kali login (belum ada flag `sipjam_onboarding_guru_done` di localStorage), tampilkan tutorial overlay step-by-step yang menyoroti elemen UI nyata di layar: (1) tombol hamburger menu, (2) menu Presensi Datang, (3) menu Jurnal Mengajar, (4) menu Piket, (5) tombol AI Assistant. Setiap step memiliki tooltip/callout dengan teks penjelasan singkat. User bisa skip atau klik "Lanjut" antar step. Setelah selesai, set flag `sipjam_onboarding_guru_done = true` di localStorage. Ada tombol "Lihat Tutorial Lagi" di sidebar.

### R3. Tutorial Onboarding — Akun Admin
Saat admin pertama kali login (belum ada flag `sipjam_onboarding_admin_done` di localStorage), tampilkan tutorial overlay terpisah khusus admin yang menyoroti: (1) menu Verifikasi, (2) menu Sistem Blok, (3) menu Master Data, (4) menu Analitik, (5) menu Sistem (Konfigurasi), (6) tombol AI Assistant. Format dan behavior sama dengan tutorial guru (skip, lanjut, flag localStorage).

### R4. Integrasi Halus
Tidak boleh memodifikasi logika bisnis yang ada (workflow presensi, jurnal, dll). Komponen AI Assistant dan tutorial overlay ditambahkan sebagai lapisan UI baru di `AppScreen.tsx` atau sebagai komponen terpisah yang dimount di sana. Gunakan Tailwind CSS dan Font Awesome yang sudah ada — tidak boleh menambahkan dependency npm baru.

## Acceptance Criteria

### AI Assistant
- [ ] Floating button AI tampil di semua halaman setelah login (guru maupun admin)
- [ ] Panel chatbot terbuka saat button diklik dan bisa ditutup
- [ ] Setidaknya 30 pertanyaan/jawaban mencakup semua menu utama tersedia di knowledge base
- [ ] Jawaban berubah relevan sesuai konteks halaman aktif (misal: jika di halaman Presensi, topik presensi diprioritaskan)
- [ ] Jika tidak ada jawaban cocok, muncul pesan ramah + daftar topik tersedia
- [ ] Tidak ada API call eksternal sama sekali; bisa berjalan offline

### Tutorial Onboarding Guru
- [ ] Tutorial muncul otomatis saat guru pertama login (localStorage flag belum ada)
- [ ] Tutorial punya minimal 5 step dengan highlight overlay pada elemen UI nyata
- [ ] User bisa skip keseluruhan atau klik "Lanjut" per step
- [ ] Setelah selesai/skip, flag `sipjam_onboarding_guru_done` tersimpan di localStorage
- [ ] Tutorial bisa dibuka ulang melalui sidebar

### Tutorial Onboarding Admin
- [ ] Tutorial muncul otomatis saat admin pertama login (localStorage flag belum ada)
- [ ] Tutorial punya minimal 6 step dengan highlight overlay pada elemen UI nyata admin
- [ ] User bisa skip keseluruhan atau klik "Lanjut" per step
- [ ] Setelah selesai/skip, flag `sipjam_onboarding_admin_done` tersimpan di localStorage
- [ ] Tutorial bisa dibuka ulang melalui sidebar

### Integrasi & Kualitas
- [ ] Tidak ada dependency npm baru di package.json
- [ ] Tidak ada error TypeScript baru (tsc --noEmit lulus)
- [ ] Tidak ada regresi pada fitur yang sudah ada (build berhasil: npm run build)
- [ ] Semua teks UI dalam Bahasa Indonesia
- [ ] Tampilan responsif di mobile (lebar 320px-428px) dan desktop

## Konteks Teknis Penting

- Stack: Next.js 16.3.4, React 19, TypeScript, Tailwind CSS, Font Awesome 6 (CDN), SweetAlert2, Supabase
- Roles: superadmin, admin, guru. Superadmin tidak perlu tutorial.
- File kunci: `src/components/AppScreen.tsx` (848 baris) — orkestrasi utama, mount semua view, sidebar navigasi, header
- Menu guru: Dashboard, Presensi Datang/Pulang, Jurnal Mengajar, Piket, Perangkat Pembelajaran, Daftar Nilai, Chat Guru, Informasi, Riwayat, Rekap Jurnal, Presensi Siswa
- Menu admin: semua menu guru + Verifikasi, Sistem Blok, Jurnal Kelas, Analitik, Rekap Akhir, Master Data, Akses Data/Backup, Sistem
- Sidebar di AppScreen sudah ada, pakai `data-tour` attribute untuk targeting elemen dari tutorial overlay
- Git workflow: setelah selesai, wajib `git add . && git commit -m "..." && git push origin main`
- AGENTS.md: baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js apapun

## 2026-10-01T10:56:44Z

Implementasi perbaikan bug dan penambahan fitur pada aplikasi Sipjam, meliputi: perbaikan data pengguna ganda, perbaikan upload avatar, penambahan izin terlambat, opsi upload foto jurnal, pembatasan edit username, dan pengaturan fitur per-sekolah oleh superadmin. Menerapkan prinsip *Ponytail* (solusi paling sederhana dan efisien).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo
Verification Resources: Agent-as-judge (Gunakan Acceptance Criteria di bawah sebagai rubrik objektif)

## Requirements

### R1. Perbaikan Data Ganda (Merge Account)
Gunakan script SQL satu kali jalan (one-off) untuk menggabungkan data akun "Ade Fitrawan Ibrahim" dan "Ade Fitrawan Ibrahim, M.Pd., Gr" secara langsung di database. Pertahankan akun dengan riwayat transaksi (presensi, jurnal, dll) terbanyak, dan re-assign data dari akun duplikat ke akun utama sebelum menghapus akun duplikat.

### R2. Perbaikan Avatar
Pastikan fitur pemilihan avatar berfungsi dengan benar: saat avatar dipilih/diubah, gambar profil harus langsung diperbarui dan terlihat pada UI akun pengguna.

### R3. Izin Datang Terlambat (Guru)
Tambahkan opsi status "Izin Terlambat" pada pilihan/tombol absensi yang sudah ada di halaman presensi guru.

### R4. Upload Foto Jurnal Pembelajaran
Sediakan opsi tambahan pada Jurnal Pembelajaran untuk mengunggah foto dari file/galeri. Sistem harus menangkap lokasi dari GPS device (melalui browser) saat upload dilakukan, dan menyimpan data lokasi beserta waktu upload ke database untuk ditampilkan di UI.

### R5. Pembatasan Pengaturan Username
Kunci kemampuan untuk mengubah username milik guru di aplikasi; pastikan hanya pengguna dengan role Admin yang dapat melakukan perubahan ini.

### R6. Pengaturan Fitur Per-Sekolah (Superadmin)
Tambahkan opsi (checkbox/dropdown) langsung di halaman "Edit Sekolah" yang sudah ada, agar Superadmin dapat mengatur mode Jurnal Pembelajaran ("Live Camera Langsung" saja, atau "Live Camera + Upload Foto"). Pastikan pengaturan ini diaplikasikan saat guru di sekolah tersebut membuka halaman jurnal.

## Acceptance Criteria

### Verifikasi R1 (Merge Account)
- [ ] Terdapat file script SQL (misal: `merge_accounts.sql`) yang berisi query UPDATE untuk memindahkan foreign keys dan query DELETE untuk menghapus akun duplikat.

### Verifikasi R2 (Avatar)
- [ ] Terdapat kode di komponen profil yang memperbarui state (React/Vue dll) segera setelah respon sukses dari upload avatar, sehingga gambar langsung berubah tanpa reload halaman.

### Verifikasi R3 (Izin Terlambat)
- [ ] Tombol/opsi absensi memiliki pilihan bernilai "Izin Terlambat".
- [ ] Backend endpoint presensi dapat menerima dan menyimpan status "Izin Terlambat".

### Verifikasi R4 (Upload Jurnal GPS)
- [ ] Terdapat penggunaan API `navigator.geolocation.getCurrentPosition` pada fungsi upload jurnal via galeri.
- [ ] Payload request ke backend menyertakan latitude dan longitude.

### Verifikasi R5 (Username Edit Limit)
- [ ] Terdapat pengecekan kondisi `role === 'admin'` (atau setara) sebelum form edit username dirender di UI ATAU sebelum update dieksekusi di backend.

### Verifikasi R6 (Pengaturan Sekolah)
- [ ] UI form Edit Sekolah memiliki input untuk mode Jurnal (Live Camera / Camera + Upload).
- [ ] Halaman Jurnal membaca konfigurasi sekolah pengguna yang sedang login dan merender input file upload HANYA JIKA konfigurasinya mengizinkan.

## 2026-10-01T18:10:59Z

This is a single self-contained set of fixes; keep it small and focused.
Penyesuaian lanjutan pada aplikasi Sipjam: perhitungan dan penggabungan presisi untuk data ganda, pengubahan alur izin terlambat agar memerlukan konfirmasi admin, dan penghapusan kolom username pada profil guru.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo
Verification Resources: Agent-as-judge (Gunakan Acceptance Criteria di bawah sebagai rubrik objektif)

## Requirements

### R1. Penggabungan Data Ganda Terukur
Buatkan skrip TypeScript/Node.js (misal `scripts/merge_accounts.ts`) yang menggunakan Supabase Client untuk mengambil, menghitung, dan mencetak jumlah pasti riwayat (presensi, jurnal, piket) dari akun "Ade Fitrawan Ibrahim, M.Pd., Gr." di terminal. Setelah dihitung, skrip harus mengeksekusi perpindahan data ke akun "Ade Fitrawan Ibrahim" dan menghapus akun duplikat.

### R2. Alur Konfirmasi Izin Terlambat
Ubah logika presensi "Izin Terlambat". Saat guru memilih status ini, data tidak boleh langsung disahkan sebagai "Hadir". Data harus masuk ke halaman verifikasi Admin (`AdminVerifView` atau setara) dengan status awal "Menunggu Verifikasi" (sama seperti proses pengajuan Sakit/Izin), sehingga Admin dapat mengonfirmasi atau menolaknya.

### R3. Penghapusan Input Username Guru
Pada antarmuka pengaturan akun (`AccountSettingsModal`), hilangkan sepenuhnya elemen form input *username* jika pengguna yang login adalah *Guru*. Pastikan form untuk mengubah *password* tetap dipertahankan dan berfungsi normal tanpa *username*.

## Acceptance Criteria

### Verifikasi R1 (Merge Data Script)
- [ ] Terdapat file skrip `scripts/merge_accounts.ts` yang dapat dieksekusi.
- [ ] Skrip memiliki kode yang secara eksplisit melakukan query `COUNT` atau mengambil jumlah data dari tabel presensi, jurnal, dan piket, lalu mencetaknya ke konsol (`console.log`).
- [ ] Skrip memiliki logika perpindahan *foreign keys* dan penghapusan *user/data_guru* lama di Supabase.

### Verifikasi R2 (Izin Terlambat Verifikasi)
- [ ] Pengiriman presensi "Izin Terlambat" menghasilkan status database yang dikenali oleh UI Admin sebagai *pending* (misal: "Menunggu" atau masuk ke *tab* Verifikasi).
- [ ] Terdapat tombol persetujuan/penolakan (Terima/Tolak) untuk status "Izin Terlambat" di antarmuka verifikasi Admin.

### Verifikasi R3 (Hapus Input Username)
- [ ] Tidak ada elemen `<input>` atau teks untuk *username* yang dirender (atau dirender secara kasat mata) saat *state* `user.role` bernilai non-admin/Guru.
- [ ] Elemen form ganti *password* (input kata sandi lama & baru) tetap bisa diakses dan tidak mengalami *error* validasi meskipun input *username* dihilangkan.




## 2026-10-02T08:30:41Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.

Tiga perbaikan bug/fitur kecil: (1) Pengecualian presensi/jurnal/piket untuk guru saat sistem blok berdasarkan jadwal mengajar, (2) Penyesuaian ukuran foto pada hasil cetak dokumen agar memenuhi kolom, (3) Pembaruan format tanggal dashboard menjadi [hari, tanggal-bulan-tahun] yang responsif.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

## Requirements

### R1. Pengecualian Sistem Blok
Guru yang diatur wajib hadir hanya pada hari mengajar tidak perlu melakukan presensi, mengisi jurnal, dan laporan piket saat sistem blok aktif, kecuali jika mereka memang memiliki jadwal pada hari tersebut.

### R2. Ukuran Foto Dokumen Cetak
Foto kegiatan pada hasil cetak dokumen harus mengisi penuh kolom yang tersedia tanpa terdistorsi atau memiliki tinggi absolut (fixed height) yang merusak layout.

### R3. Format Tanggal Dashboard
Tanggal di dashboard harus berformat `[hari, tanggal-bulan-tahun]` (contoh: Jumat, 02-10-2026) dan tampilannya harus rapi (responsif) tanpa terpotong baik di desktop maupun mobile.

## Acceptance Criteria

### Verifikasi Fitur
- [ ] Sistem tidak memblokir atau memaksa presensi bagi guru pengecualian di hari tanpa jadwal, meskipun periode blok aktif (mereka akan terbaca bebas presensi, bebas jurnal, dan bebas piket).
- [ ] Foto di mode cetak (`print` CSS) memenuhi kolom (`w-full` dan `h-auto` atau setara) tanpa merusak baris.
- [ ] Tanggal di dashboard menampilkan hari dan tanggal penuh (misal: DD-MM-YYYY) dan menyesuaikan ruang di mobile (bisa wrap jika perlu, tapi tidak `truncate`).

## 2026-10-03T02:56:59Z

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: small focused team

This is a single self-contained fix; keep it small and focused.
Ubah logo Asisten AI menjadi robot dan pastikan fitur notifikasi push (Web Push) berfungsi dengan baik agar muncul di gawai pengguna.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Logo Robot AI
Ubah ikon Asisten AI dari `fa-wand-magic-sparkles` (atau ikon terkait) menjadi `fa-robot` di `src/components/AIAssistant/AIAssistant.tsx`.

### R2. Audit & Perbaikan Notifikasi
Sistem saat ini sudah memiliki `/sw.js` dan `src/lib/pushClient.ts`. Verifikasi dan pastikan bahwa notifikasi push (`push` event di service worker) tidak memiliki error logika yang mencegah notifikasi muncul ke perangkat. Perbaiki jika ditemukan bug.

## Acceptance Criteria

### Kode dan Fungsionalitas
- [ ] Di dalam `AIAssistant.tsx`, ikon yang digunakan adalah `fa-robot`.
- [ ] Logika `self.addEventListener('push')` dan `showNotification` pada `sw.js` telah diaudit/diperbaiki, dan tidak ada pemanggilan yang memblokir notifikasi tampil.


## 2026-10-04T01:12:11Z

Tambahkan konfigurasi mode presensi siswa per-sekolah yang dapat diatur oleh Superadmin di SIPJAM (Next.js + Supabase, multi-tenant): setiap sekolah dapat memilih antara mode **QR Code** (scan QR piket seperti yang baru diimplementasikan) atau mode **Manual** (guru piket cek hadir/tidak satu per satu dari daftar siswa). Mode yang dipilih otomatis mengubah tampilan modul Piket dan seluruh alur presensi siswa sekolah tersebut.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

## Requirements

### R1. Kolom Konfigurasi di Tabel Sekolah
Tambahkan kolom `mode_presensi_siswa` (enum atau TEXT dengan constraint: `'qr'` atau `'manual'`, default `'qr'`) pada tabel `public.sekolah` di Supabase via migration SQL. Kolom ini adalah sumber kebenaran tunggal mode presensi untuk setiap sekolah.

### R2. UI Pengaturan di Superadmin
Superadmin dapat mengubah `mode_presensi_siswa` per sekolah melalui panel kelola sekolah di `SuperadminView.tsx` — berupa toggle atau dropdown "Mode Presensi Siswa: QR Code / Manual". Perubahan langsung tersimpan ke DB.

### R3. Mode Manual — Daftar Hadir Satu per Satu di Piket
Ketika sekolah menggunakan mode `'manual'`, modul Piket (`PiketView.tsx`) menampilkan daftar seluruh siswa (per kelas, dapat difilter) dengan tombol/checkbox hadir datang dan hadir pulang yang dicentang satu per satu oleh guru piket — menggantikan tampilan tab scanner QR. Data tetap disimpan ke tabel `presensi_siswa` yang sama dengan kolom yang sama.

### R4. Mode QR — Tetap Seperti Sekarang
Ketika sekolah menggunakan mode `'qr'`, modul Piket tetap menampilkan tab scanner QR (kamera + USB HID) seperti yang sudah diimplementasikan. Tidak ada perubahan perilaku untuk mode ini.

### R5. Propagasi Mode ke Seluruh Alur Terkait
Komponen lain yang membaca/menampilkan data presensi siswa (`RekapSiswaView.tsx`, `GuruJurnal.tsx`) tidak perlu berubah perilaku — keduanya hanya membaca tabel `presensi_siswa` yang sama. Cukup pastikan tidak ada hardcode asumsi mode QR di luar `PiketView`.

## Acceptance Criteria

### Konfigurasi DB & Superadmin
- [ ] Migration SQL menambahkan kolom `mode_presensi_siswa` ke `public.sekolah`
- [ ] Superadmin dapat mengubah mode sekolah A ke `'manual'` dan sekolah B ke `'qr'` — perubahan tersimpan di DB
- [ ] Nilai default `'qr'` berlaku untuk sekolah yang belum dikonfigurasi

### Mode Manual di Piket
- [ ] Sekolah dengan mode `'manual'`: PiketView menampilkan daftar siswa + tombol/checkbox hadir (bukan scanner QR)
- [ ] Guru piket bisa tandai datang/pulang satu per satu, data tersimpan ke `presensi_siswa`
- [ ] Filter per kelas berfungsi

### Mode QR di Piket
- [ ] Sekolah dengan mode `'qr'`: PiketView tetap menampilkan scanner seperti sebelumnya
- [ ] Scanner kamera dan USB HID tetap berfungsi

### Build & Isolasi
- [ ] `tsc --noEmit` 0 error
- [ ] `npm run build` lulus
- [ ] Data multi-tenant terisolasi per `sekolah_id` — sekolah A tidak bocor ke B


## 2026-10-04T22:19:58Z

# Teamwork Project Prompt

> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.
Guru presensi. Kamera khusus mode portrait. Gambar tidak auto-zoom saat diambil.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Kamera Portrait
Pastikan kamera hanya menggunakan mode portrait saat guru melakukan presensi.

### R2. Nonaktifkan Auto-zoom
Pastikan gambar yang diambil tidak mengalami auto-zoom secara otomatis.

## Acceptance Criteria

### Verifikasi Manual User
- [ ] Fitur presensi guru membuka kamera dalam orientasi portrait.
- [ ] Hasil jepretan kamera sama persis dengan preview, tanpa zoom atau pemotongan (crop) otomatis.
