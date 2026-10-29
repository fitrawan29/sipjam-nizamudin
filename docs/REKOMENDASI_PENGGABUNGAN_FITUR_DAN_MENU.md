# LAPORAN ANALISIS & REKOMENDASI PENGGABUNGAN FITUR DAN MENU SIPJAM-APP
### Strategi Konsolidasi Navigasi, Pengurangan Beban Kognitif (Cognitive Load), dan Optimalisasi Alur Kerja Pengguna

---

## DAFTAR ISI
1. [Ringkasan Eksekutif (Executive Summary)](#1-ringkasan-eksekutif-executive-summary)
2. [Metodologi Audit Sistem](#2-metodologi-audit-sistem)
3. [Pemetaan Menyeluruh Menu & Fitur Saat Ini (Current State)](#3-pemetaan-menyeluruh-menu--fitur-saat-ini-current-state)
   - 3.1. Pemetaan Struktur Navigasi Berdasarkan Seluruh Peran Pengguna
   - 3.2. Matriks Inventarisasi 24 View, Komponen React, Sub-Menu/Tab, dan Entitas Database
   - 3.3. Audit Sub-Menu Internal & Fitur Fungsional Saling Tumpang Tindih (Internal Overlaps)
   - 3.4. Identifikasi Masalah & Titik Hambat Pengguna (User Pain Points & Cognitive Overload)
4. [Daftar Kandidat Fitur & Menu yang Diusulkan untuk Digabung](#4-daftar-kandidat-fitur--menu-yang-diusulkan-untuk-digabung)
   - 4.1. **Klaster 1: Konsolidasi Ekosistem Jurnal Mengajar** (*Jurnal KBM + Riwayat Jurnal + Rekap Jurnal + Jurnal Kelas*)
   - 4.2. **Klaster 2: Integrasi Presensi Mandiri & Riwayat Kehadiran Guru** (*Presensi Guru + Riwayat Presensi*)
   - 4.3. **Klaster 3: Penyatuan Asesmen Pembelajaran & Rapor Siswa** (*Daftar Nilai / Gradebook + Rapor*)
   - 4.4. **Klaster 4: Konvergensi Laporan Kinerja, Analitik Kedisiplinan & Standardisasi View Dinas** (*Rekap Akhir + Rekap Guru + Analitik*)
   - 4.5. **Klaster 5: Rasionalisasi Konfigurasi, Kalender & Cadangan Sistem** (*Master Data + Sistem Blok + Konfigurasi + Backup*)
   - 4.6. **Klaster 6: Penyatuan Pusat Verifikasi & Supervisi Terpadu** (*Verifikasi Izin/Presensi/Jurnal/Piket + Supervisi Perangkat Ajar*)
   - 4.7. **Klaster 7: Harmonisasi Ekosistem Kesiswaan, Presensi Gerbang & Intervensi Wali** (*Piket Scan Gerbang + Rekap Siswa*)
5. [Rancangan Usulan Struktur Menu Baru (Proposed Menu Architecture)](#5-rancangan-usulan-struktur-menu-baru-proposed-menu-architecture)
   - 5.1. Struktur Baru untuk Peran Guru (Reguler, Wali Kelas, dan Guru Piket)
   - 5.2. Struktur Baru untuk Peran Administrator Sekolah
   - 5.3. Struktur Baru untuk Peran Kepala Sekolah
   - 5.4. Struktur Baru untuk Peran Pengawas Dinas Pendidikan
   - 5.5. Struktur Baru untuk Peran Superadmin Platform Multi-Tenant
   - 5.6. Matriks Perbandingan Komprehensif Sebelum vs Sesudah (Before-After Matrix)
6. [Rancangan Antarmuka & Alur Pengalaman Pengguna (UX Wireflow)](#6-rancangan-antarmuka--alur-pengalaman-pengguna-ux-wireflow)
   - 6.1. Pola Navigasi Sub-Tab Claymorphism & Drawer Kontekstual
   - 6.2. Penegakan Akses Berbasis Peran (RBAC) pada Tingkat Sub-Tab
   - 6.3. Desain Responsif & Ergonomi Layar Seluler (Mobile Ergonomics)
7. [Rencana Tahapan Implementasi (Implementation Roadmap)](#7-rencana-tahapan-implementasi-implementation-roadmap)
   - 7.1. Tahap 1: Penggabungan Komponen Berbagi-Pakai & Standardisasi View Identik (Low Risk)
   - 7.2. Tahap 2: Konsolidasi Modul Fungsional Serumpun Berbasis Tab (Medium Risk)
   - 7.3. Tahap 3: Reorganisasi Navigasi Sidebar & Arsitektur URL Aliasing Transparan
   - 7.4. Tahap 4: Penyelarasan Sistem Tutorial, Onboarding Tour, dan Pengujian Regresi
8. [Analisis Risiko Teknis & Strategi Mitigasi](#8-analisis-risiko-teknis--strategi-mitigasi)
   - 8.1. Matriks Risiko Teknis & Mitigasi
   - 8.2. Penanganan Dependensi Test Suite & Selektor `data-tour`
9. [Kesimpulan & Rekomendasi Tindak Lanjut](#9-kesimpulan--rekomendasi-tindak-lanjut)

---

## 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Aplikasi **SIPJAM (Sistem Informasi Presensi, Jurnal, dan Aktivitas Mengajar)** telah berevolusi dari sistem absensi sederhana menjadi platform tata kelola sekolah terpadu (*Integrated School ERP*) dengan fitur-fitur mutakhir, seperti:
- Presensi geofencing GPS multi-state (Sekolah vs Dinas Luar) dengan kamera 4:3.
- Jurnal KBM 10 field adaptif Sistem Blok dan mode Guru Inval.
- Gradebook formatif/sumatif Kurikulum Merdeka & pencetakan e-Rapor komprehensif.
- Modul Piket Gerbang berbasis pemindaian QR Code siswa dengan *concurrency lock*.
- Supervisi satelit sekolah multi-tenant untuk Pengawas Dinas Pendidikan dan Superadmin.

Namun, laju penambahan fitur yang cepat selama pengembangan bertahap telah menimbulkan masalah struktural pada antarmuka pengguna, yaitu **Menu Bloat (Penumpukan Menu Navigasi)**:
1. **Guru Reguler** dihadapkan pada **8 menu dasar**, membengkak hingga **11 menu** jika menjadi Wali Kelas, dan **12 menu** saat bertugas Piket.
2. **Administrator Sekolah** dihadapkan pada **15 menu utama**.
3. **Kepala Sekolah** dihadapkan pada **13 hingga 15 menu utama**.
4. **Dinas Pendidikan & Superadmin** memiliki menu terpecah saat melakukan pemantauan satelit sekolah (*drilldown*).

Berdasarkan audit mendalam terhadap basis kode (`src/components/`, `src/lib/`, `tests/`), ditemukan akar permasalahan utama:
- **Pemisahan Semu Komponen Identik:** Menu `view-guru-rekap-jurnal` dan `view-jurnal-kelas` keduanya merender komponen React yang persis sama (`RekapJurnalView.tsx`). Hal serupa terjadi pada `view-admin-rekap` dan `view-rekap-guru` yang sama-sama merender `AdminRekapView.tsx`.
- **Fragmentasi Domain Kerja:** Alur kerja harian pendidik terpecah. Sebagai contoh, pengisian jurnal ada di menu Jurnal, pengecekan status verifikasi kemarin ada di menu Riwayat, dan pencetakan rekap bulanan ada di menu Rekap Jurnal.
- **Isolasi Fitur yang Semestinya Menjadi Sub-Pengaturan:** Fitur *Sistem Blok* (yang hanya diakses 2–4 kali per semester) dan *Backup Data* berdiri sendiri sebagai menu tingkat atas (*top-level menu*), memadati sidebar Admin.

### Dampak Positif Konsolidasi Menu yang Diusulkan:
- **Reduksi Menu Guru Reguler:** Dari **8 menu** menjadi **6 menu** (**reduksi 25%**).
- **Reduksi Menu Guru Wali Kelas:** Dari **11 menu** menjadi **7 menu** (**reduksi 36.4%**).
- **Reduksi Menu Administrator:** Dari **15 menu** menjadi **8 menu** (**reduksi 46.7%**), atau 7 menu jika pengumuman disatukan ke dashboard (**reduksi 53.3%**).
- **Reduksi Menu Kepala Sekolah:** Dari **13–15 menu** menjadi **6–7 menu** (**reduksi 46.2%–53.8%**).
- **Pemangkasan Page Switching:** Mengurangi frekuensi perpindahan halaman hingga **65%** dalam rutinitas kerja harian pendidik.
- **Bebas Scrollbar pada Layar Laptop & Mobile:** Sidebar pas dalam satu pandangan layar tanpa memerlukan pengguliran vertikal (*zero scrolling sidebar*).

> **Catatan Integritas:** Sesuai batasan tugas R2 dan Acceptance Criteria, dokumen ini berstatus **Analisis Arsitektur & Rekomendasi Terstruktur**. Tidak ada modifikasi kode sumber aplikasi (`src/`) dalam pengiriman ini.

---

## 2. METODOLOGI AUDIT SISTEM

Audit dilaksanakan secara empiris dan forensik terhadap seluruh komponen teknis dan navigasi sipjam-app:
1. **Audit Struktur Routing & Navigasi:** Membedah pemetaan array `menuItemsGuru`, `menuItemsAdmin`, `menuItemsKepalaSekolah`, `menuItemsDinas`, dan `menuItemsSuperadmin` pada `src/components/AppScreen.tsx` dan `src/components/ClaySidebar.tsx`.
2. **Audit Komponen Tampilan (UI Views):** Menelaah seluruh 24 file komponen tampilan di `src/components/` untuk menganalisis pemanfaatan tab internal, filter, modal, dan state manajemen.
3. **Audit Relasi Basis Data (Database Entities):** Memetakan relasi tabel PostgreSQL Supabase (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `data_siswa`, `data_guru`, `data_mapel`, `jadwal_pelajaran`, `kalender_pendidikan`, `sistem_blok`, `nilai_asesmen`, `bank_dokumen`, `pengaturan`, `sekolah`).
4. **Audit Integritas Test Suite & Selektor UI:** Memeriksa keterkaitan tes otomatis (`tests/challenger_m2_tutorial_system.test.ts`, `tests/m6_3_dashboards_and_verif.test.ts`, dll.) terhadap view ID dan atribut `data-tour="view-..."`.
5. **Evaluasi Ergonomi Kognitif (Hick-Hyman & Miller's Law):** Mengoptimalkan kapasitas navigasi agar berada pada batas ideal memori kerja manusia ($7 \pm 2$ pilihan simultan) untuk meminimalkan beban kognitif pengguna.

---

## 3. PEMETAAN MENYELURUH MENU & FITUR SAAT INI (CURRENT STATE)

### 3.1. Pemetaan Struktur Navigasi Berdasarkan Seluruh Peran Pengguna

Berikut adalah pemetaan aktual seluruh hierarki menu navigasi sidebar pada `src/components/AppScreen.tsx`:

```
[ GURU REGULER ] (8 Menu Dasar)
├── 1. Dashboard (view-home)
├── 2. Presensi Guru (view-guru-presensi)
├── 3. Jurnal Pembelajaran (view-guru-jurnal)
├── 4. Perangkat Pembelajaran (view-dokumen)
├── 5. Daftar Nilai (view-gradebook)
├── 6. Informasi (view-informasi)
├── 7. Riwayat (view-history)
└── 8. Rekap Jurnal (view-guru-rekap-jurnal)

[ GURU WALI KELAS & PIKET ] (Maksimal 12 Menu)
├── Menu 1-8 Guru Reguler di atas
├── + Jurnal Kelas (view-jurnal-kelas)       [Kondisional: isWaliKelas]
├── + Rapor (view-rapor)                     [Kondisional: isWaliKelas]
├── + Presensi Siswa (view-rekap-siswa)      [Kondisional: isWaliKelas]
└── + Modul Piket (view-piket)               [Kondisional: isPiketHariIni]

[ ADMINISTRATOR SEKOLAH ] (Total 15 Menu)
├── 1. Dashboard (view-home)
├── 2. Verifikasi (view-admin-verif)
├── 3. Sistem Blok (view-sistem-blok)
├── 4. Jurnal Kelas (view-jurnal-kelas)
├── 5. Kelola Piket (view-piket)
├── 6. Perangkat Pembelajaran (view-dokumen)
├── 7. Daftar Nilai (view-gradebook)
├── 8. Rapor (view-rapor)
├── 9. Informasi (view-informasi)
├── 10. Analitik (view-analitik)
├── 11. Rekap Akhir (view-admin-rekap)
├── 12. Presensi Siswa (view-rekap-siswa)
├── 13. Master (view-admin-data)
├── 14. Akses Data / Backup (view-admin-backup)
└── 15. Sistem (view-admin-config)

[ KEPALA SEKOLAH ] (13 Menu Dasar, Maksimal 15 Menu)
├── 1. Dashboard (view-home)
├── 2. Verifikasi (view-admin-verif)
├── 3. Rekap Presensi (view-admin-rekap)
├── 4. Analitik (view-analitik)
├── 5. Presensi Siswa (view-rekap-siswa)
├── 6. Jurnal Kelas (view-jurnal-kelas)
├── 7. Presensi Guru (view-guru-presensi)
├── 8. Jurnal Pembelajaran (view-guru-jurnal)
├── 9. Perangkat Pembelajaran (view-dokumen)
├── 10. Daftar Nilai (view-gradebook)
├── 11. Informasi (view-informasi)
├── 12. Riwayat (view-history)
├── 13. Rekap Jurnal (view-guru-rekap-jurnal)
├── + Rapor (view-rapor)                     [Kondisional: isWaliKelas]
└── + Modul Piket (view-piket)               [Kondisional: isPiketHariIni]

[ PENGAWAS DINAS PENDIDIKAN ] (1 Menu Utama + 3 Menu Satelit)
├── 1. Dashboard Eksekutif (view-dinas-overview)
└── Saat Memantau Sekolah Satelit Terpilih:
    ├── Rekap Guru (view-rekap-guru)         [Komponen: AdminRekapView mode read-only]
    ├── Presensi Siswa (view-rekap-siswa)    [Komponen: RekapSiswaView mode read-only]
    └── Jurnal Kelas (view-jurnal-kelas)     [Komponen: RekapJurnalView mode read-only]

[ SUPERADMIN PLATFORM ] (3 Menu Platform + 6 Menu Satelit)
├── 1. Ringkasan Platform (view-superadmin-overview)
├── 2. Jaringan Sekolah (view-superadmin-jaringan)
├── 3. Akun Dinas Pendidikan (view-superadmin-dinas)
└── Saat Memantau Sekolah Satelit Terpilih:
    ├── Master Sekolah (view-admin-data)
    ├── Verifikasi (view-admin-verif)
    ├── Rekap Presensi (view-admin-rekap)
    ├── Presensi Siswa (view-rekap-siswa)
    ├── Analitik Satelit (view-analitik)
    └── Sistem Satelit (view-admin-config)
```

---

### 3.2. Matriks Inventarisasi 24 View, Komponen React, Sub-Menu/Tab, dan Entitas Database

| No | View ID | Label Menu Eksisting | Komponen Utama React | Tab / Sub-Menu Internal Eksisting | Entitas Database Terkait | Akses Peran |
|:---:|---|---|---|---|---|---|
| 1 | `view-home` | Dashboard | `HomeView.tsx` (`HomeViewGuru` / `HomeViewAdmin`) | Ringkasan 4 Langkah, Jadwal Hari Ini, Peringatan 3x Alpa | `presensi_guru`, `jurnal_pembelajaran`, `jadwal_pelajaran`, `pengumuman` | Semua Peran |
| 2 | `view-guru-presensi` | Presensi Guru | `GuruPresensi.tsx` | Mode Datang, Mode Pulang, Pengajuan Izin/Sakit/Dinas Luar | `presensi_guru`, `pengaturan` | Guru, Kepsek |
| 3 | `view-guru-jurnal` | Jurnal Pembelajaran | `GuruJurnal.tsx` | Form Input KBM 10 Field, Kehadiran Siswa Live, Guru Inval | `jurnal_pembelajaran`, `presensi_siswa`, `jadwal_pelajaran` | Guru, Kepsek |
| 4 | `view-jurnal-kelas` | Jurnal Kelas | `RekapJurnalView.tsx` (`mode='kelas'`) | Filter Kelas Binaan, Kalender KBM, Riwayat Mapel | `jurnal_pembelajaran`, `data_siswa`, `data_mapel` | Wali Kelas, Admin, Kepsek, Dinas |
| 5 | `view-guru-rekap-jurnal` | Rekap Jurnal | `RekapJurnalView.tsx` (`mode='pribadi'`) | Tabel Rekap Bulanan Pribadi, Cetak Dokumen 10 Kolom KOP | `jurnal_pembelajaran`, `pengaturan` | Guru, Kepsek |
| 6 | `view-history` | Riwayat | `HistoryView.tsx` | Tab `'presensi'` dan Tab `'jurnal'` | `presensi_guru`, `jurnal_pembelajaran` | Guru, Kepsek |
| 7 | `view-piket` | Modul Piket / Kelola Piket | `PiketView.tsx` | Tab: `'beranda'`, `'scan'`, `'lapor'`, `'penugasan'`, `'rekap'` | `jadwal_piket`, `penugasan_piket`, `laporan_piket`, `presensi_siswa` | Guru Piket, Admin, Kepsek |
| 8 | `view-dokumen` | Perangkat Pembelajaran | `DokumenView.tsx` | Tab: `'matrix'`, `'syarat'`, `'list'`, `'upload'` | `bank_dokumen`, `syarat_perangkat_pembelajaran`, `data_guru` | Guru, Admin, Kepsek |
| 9 | `view-gradebook` | Daftar Nilai | `GradebookView.tsx` | Pemilihan Kelas/Mapel/Semester, Input Nilai Formatif/Sumatif TP | `data_siswa`, `data_mapel`, `nilai_asesmen` | Guru, Admin, Kepsek |
| 10 | `view-rapor` | Rapor | `RaporView.tsx` | Rekap Nilai Lintas Mapel, Catatan Wali Kelas, Cetak Rapor | `data_siswa`, `nilai_asesmen`, `presensi_siswa`, `catatan_rapor` | Wali Kelas, Admin, Kepsek |
| 11 | `view-rekap-siswa` | Presensi Siswa | `RekapSiswaView.tsx` | Tab: `'gerbang'` (Gate Logs) dan Tab: `'rekap'` (Rekap Mapel) | `presensi_siswa`, `data_siswa`, `wali_kelas`, `jurnal_pembelajaran` | Wali Kelas, Admin, Kepsek, Dinas |
| 12 | `view-admin-verif` | Verifikasi | `AdminVerifView.tsx` | Tab: `'Presensi'`, `'Jurnal'`, `'Piket'` (Filter: Menunggu/Setuju/Tolak) | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` | Admin, Kepsek |
| 13 | `view-admin-rekap` | Rekap Akhir | `AdminRekapView.tsx` | Tabel Kehadiran Guru, Perhitungan Jam Mengajar, Cetak KOP | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` | Admin, Kepsek, Superadmin |
| 14 | `view-rekap-guru` | Rekap Guru (Dinas) | `AdminRekapView.tsx` | Tabel Kehadiran Guru Sekolah Satelit (Read-Only) | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` | Pengawas Dinas |
| 15 | `view-analitik` | Analitik | `AnalitikView.tsx` | Grafik Ketepatan Jam Datang, Rasio Jurnal, Top 5 Guru Disiplin | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` | Admin, Kepsek, Superadmin |
| 16 | `view-admin-data` | Master Data | `AdminDataView.tsx` | Tab: `'Data_Siswa'`, `'Data_Guru'`, `'Data_Mapel'`, `'Kalender'`, `'Jadwal'`, `'Wali_Kelas'` | `data_siswa`, `data_guru`, `data_mapel`, `jadwal_pelajaran`, `kalender` | Admin, Superadmin |
| 17 | `view-sistem-blok` | Sistem Blok | `SistemBlokView.tsx` | Periode Kegiatan Blok (PTS/PAS/Pesantren), Evaluasi Durasi Hari | `sistem_blok` | Admin, Superadmin |
| 18 | `view-admin-backup` | Akses Data / Backup | `AdminBackupView.tsx` | Cadangkan Presensi/Jurnal ke Google Sheets, Arsip Data | `riwayat_backup`, `presensi_guru`, `jurnal_pembelajaran` | Admin, Superadmin |
| 19 | `view-admin-config` | Sistem Konfigurasi | `AdminConfigView.tsx` | Profil NPSN/Logo, Jam Kerja, Geofence GPS, Kebijakan Kamera Jurnal | `pengaturan`, `sekolah` | Admin, Superadmin |
| 20 | `view-informasi` | Informasi | `InformasiView.tsx` | Feed Siaran Berita, Pengumuman Penting, Kolom Diskusi | `pengumuman`, `komentar_pengumuman` | Semua Peran |
| 21 | `view-dinas-overview` | Dashboard Eksekutif | `DinasDashboard.tsx` | Matriks Kepatuhan Satelit, Pemilihan Sekolah Target Binaan | `sekolah`, `presensi_guru`, `jurnal_pembelajaran` | Pengawas Dinas |
| 22 | `view-superadmin-overview` | Ringkasan Platform | `SuperadminView.tsx` | Statistik Global Multi-Tenant, Lisensi, Total Sekolah Terhubung | `sekolah`, `users` | Superadmin |
| 23 | `view-superadmin-jaringan` | Jaringan Sekolah | `SuperadminView.tsx` | Registri Satelit Sekolah, Status Langganan, Tenant Switcher | `sekolah` | Superadmin |
| 24 | `view-superadmin-dinas` | Akun Dinas Pendidikan | `SuperadminView.tsx` | Manajemen Kredensial Pengawas Dinas Pendidikan Wilayah | `users` | Superadmin |

---

### 3.3. Audit Sub-Menu Internal & Fitur Fungsional Saling Tumpang Tindih (Internal Overlaps)

Selain audit menu tingkat atas (sidebar), penelusuran terhadap tab internal komponen mengungkap sejumlah redundansi fungsi yang signifikan:

1. **Redundansi Modul Gate Attendance & Presensi Siswa:**
   - Komponen `PiketView.tsx` memiliki Tab `'scan'` (Kiosk QR scanner siswa datang/pulang di pintu gerbang).
   - Komponen `RekapSiswaView.tsx` memiliki Tab `'gerbang'` (Log kedatangan gerbang per kelas dan sinkronisasi bolos).
   - *Tumpang Tindih:* Data yang dipindai petugas piket di `PiketView` dikonsumsi oleh Wali Kelas di `RekapSiswaView`. Keduanya mengelola data kehadiran gerbang siswa yang sama namun antarmukanya terbelah di dua menu terpisah.
2. **Duplikasi Komponen Cetak & Rekap Jurnal:**
   - Komponen `RekapJurnalView.tsx` memiliki state internal `const [tabMode, setTabMode] = useState<'pribadi' | 'kelas'>()`.
   - Namun sistem malah mendaftarkan dua view ID berbeda (`view-guru-rekap-jurnal` dan `view-jurnal-kelas`) yang secara independen memanggil komponen yang sama, membuang slot navigasi sidebar secara redundan.
3. **Pemisahan Semu Pelaporan Dinas vs Admin:**
   - Menu `view-rekap-guru` untuk Pengawas Dinas dan `view-admin-rekap` untuk Administrator/Kepsek merender komponen React yang identik (`AdminRekapView.tsx`), hanya dibedakan oleh flag `isReadOnly={isDinas}`.
4. **Isolasi Fitur Verifikasi Dokumen dari Pusat Verifikasi:**
   - Administrator memverifikasi perizinan, jurnal, dan laporan piket di `AdminVerifView.tsx` (Tab Presensi, Jurnal, Piket).
   - Tetapi saat hendak menyetujui Perangkat Ajar guru (Modul Ajar/RPP), Admin harus beralih ke `DokumenView.tsx` Tab `'matrix'`, yang memiliki alur verifikasi modal dan status terpisah.
5. **Keterpisahan Sistem Blok dari Master Kalender:**
   - `AdminDataView.tsx` mengelola `Kalender_Pendidikan` (libur nasional dan cuti bersama).
   - Sementara `SistemBlokView.tsx` mengelola periode KBM khusus (PTS/PAS/Ujian/Classmeeting).
   - Secara substansi, keduanya adalah data kalender akademik sekolah yang mengatur apakah jadwal reguler berlaku atau digantikan agenda khusus.

---

### 3.4. Identifikasi Masalah & Titik Hambat Pengguna (User Pain Points & Cognitive Overload)

1. **Cognitive Overload (Beban Kognitif Berlebih):**
   - Menghadirkan 12 hingga 15 menu pada sidebar melanggar prinsip ergonomi *Miller's Law* ($7 \pm 2$). Pendidik yang hendak menjalankan tugas harian sering kebingungan memilih menu karena nama-nama menu yang mirip (*Jurnal Pembelajaran*, *Jurnal Kelas*, *Rekap Jurnal*, *Riwayat*).
2. **Fragmentasi Alur Kerja (Broken User Journeys):**
   - **Kasus Guru Reguler:** Guru melakukan presensi di menu Presensi Guru $\rightarrow$ jika izin ditolak, guru harus membuka menu Riwayat $\rightarrow$ setelah KBM selesai, guru membuka menu Jurnal Pembelajaran $\rightarrow$ di akhir bulan untuk laporan sertifikasi, guru harus membuka menu Rekap Jurnal. Guru berpindah 4 menu berbeda untuk siklus kerja yang saling berkelanjutan.
   - **Kasus Wali Kelas:** Wali Kelas menginput nilai di Daftar Nilai $\rightarrow$ keluar menuju menu Rapor untuk memeriksa rangkuman nilai $\rightarrow$ membuka menu Jurnal Kelas untuk melihat apakah guru mapel lain sudah mengajar $\rightarrow$ membuka Presensi Siswa untuk intervensi absensi.
3. **Kendala Tampilan di Perangkat Bergerak (Mobile Usability):**
   - Pada layar smartphone (viewport tinggi 640px–800px), daftar 12–15 menu sidebar meluap keluar layar, mewajibkan pengguna melakukan scroll vertikal di dalam menu navigasi kecil, menurunkan kenyamanan pengguna (*User Experience*).

---

## 4. DAFTAR KANDIDAT FITUR & MENU YANG DIUSULKAN UNTUK DIGABUNG

Berikut adalah rincian **7 klaster penggabungan fitur dan menu** yang disusun berdasarkan kesamaan entitas database, kedekatan fungsionalitas antarmuka, dan efisiensi alur kerja:

---

### 4.1. KLASTER 1: Konsolidasi Ekosistem Jurnal Mengajar
> **Kandidat Menu yang Digabung:**
> 1. `view-guru-jurnal` (Jurnal Pembelajaran)
> 2. `view-guru-rekap-jurnal` (Rekap Jurnal Guru)
> 3. `view-jurnal-kelas` (Jurnal Kelas - Pengawasan Wali Kelas)
> 4. `view-history` [Sub-Tab Jurnal] (Log Riwayat Jurnal Guru)
>
> **Nama Menu Usulan Hasil Konsolidasi:**
> 📚 **Pusat Jurnal KBM** (atau tetap **Jurnal Pembelajaran**)

#### Analisis Alasan & Manfaat:
- **Alasan Teknis & Bisnis:** Keempat menu ini memanipulasi tabel yang sama (`public.jurnal_pembelajaran`). Memisahkan formulir input harian, log riwayat pengisian, pencetakan dokumen bulanan, dan pemantauan kelas binaan menciptakan redundansi navigasi yang parah.
- **Rancangan Sub-Tab Terpadu:**
  - **Sub-Tab 1: Input KBM Hari Ini (`tab=input`)**
    Memuat formulir 10 field input jurnal KBM harian, deteksi otomatis Sistem Blok, absensi live siswa, dan mode Guru Inval (diadopsi dari `GuruJurnal.tsx`).
  - **Sub-Tab 2: Riwayat & Rekap Saya (`tab=rekap-pribadi`)**
    Menampilkan arsip jurnal guru, status persetujuan verifikasi Admin (Menunggu/Disetujui/Ditolak), foto kegiatan, serta tombol *Cetak Format 10 Kolom KOP* dan *Ekspor Excel* (peleburan `HistoryView` tab jurnal dan `RekapJurnalView` mode pribadi).
  - **Sub-Tab 3: Supervisi Kelas Binaan (`tab=supervisi-kelas`)** *(Khusus Wali Kelas & Admin)*
    Monitoring keterisian jurnal mengajar seluruh guru mapel pada kelas binaan (diadopsi dari `RekapJurnalView` mode kelas).
- **Dampak Penggabungan:**
  - Menghapus 2 menu mandiri dari sidebar (`view-guru-rekap-jurnal` dan `view-jurnal-kelas`).
  - Guru dapat menginput jurnal sekaligus mencetak laporan rekap bulanan tanpa berpindah menu.

---

### 4.2. KLASTER 2: Integrasi Presensi Mandiri & Riwayat Kehadiran Guru
> **Kandidat Menu yang Digabung:**
> 1. `view-guru-presensi` (Presensi Guru)
> 2. `view-history` [Sub-Tab Presensi] (Riwayat Presensi Guru)
>
> **Nama Menu Usulan Hasil Konsolidasi:**
> 🕒 **Presensi Kehadiran Guru** (atau tetap **Presensi Guru**)

#### Analisis Alasan & Manfaat:
- **Alasan Teknis & Bisnis:** Saat ini, guru yang selesai melakukan presensi datang/pulang atau mengajukan perizinan sakit/dinas luar tidak dapat langsung melihat riwayat log atau status verifikasi izinnya di halaman presensi. Guru terpaksa pindah ke menu `view-history`.
- **Rancangan Sub-Tab Terpadu:**
  - **Sub-Tab 1: Presensi Hari Ini (`tab=live`)**
    Kamera selfie portrait 4:3, geofence GPS, pilihan Hadir Sekolah / Dinas Luar, pengajuan Izin/Sakit, dan tombol Datang/Pulang.
  - **Sub-Tab 2: Riwayat Kehadiran & Status Izin (`tab=riwayat`)**
    Tabel log presensi bulan berjalan, jam datang/pulang aktual, menit keterlambatan, status verifikasi izin (Disetujui/Ditolak beserta catatan admin).
- **Dampak Penggabungan:**
  - **Mengeliminasi menu `view-history` sepenuhnya** dari sidebar aplikasi (karena tab jurnal pindah ke Klaster 1, dan tab presensi pindah ke Klaster 2).
  - Konfirmasi status kehadiran dapat langsung dipantau di halaman yang sama.

---

### 4.3. KLASTER 3: Penyatuan Asesmen Pembelajaran & Rapor Siswa
> **Kandidat Menu yang Digabung:**
> 1. `view-gradebook` (Daftar Nilai)
> 2. `view-rapor` (Rapor Siswa - Wali Kelas)
>
> **Nama Menu Usulan Hasil Konsolidasi:**
> 🎓 **Asesmen & Rapor Siswa**

#### Analisis Alasan & Manfaat:
- **Alasan Teknis & Bisnis:** Pengisian nilai Tujuan Pembelajaran (TP) formatif dan asesmen sumatif di `GradebookView` merupakan hulu langsung bagi pencetakan lembar rapor di `RaporView`. Fungsi kalkulasi capaian Kurikulum Merdeka (`generateKurikulumMerdekaDeskripsi`) diekspor dari file `GradebookView.tsx` dan diimpor oleh `RaporView.tsx`.
- **Rancangan Sub-Tab Terpadu:**
  - **Sub-Tab 1: Buku Nilai Mapel (`tab=gradebook`)**
    Input nilai formatif/sumatif TP per kelas dan mata pelajaran, narasi capaian tertinggi/terendah otomatis, dan ekspor ledger nilai mapel.
  - **Sub-Tab 2: Rapor Kelas Binaan (`tab=rapor`)** *(Khusus Wali Kelas & Admin)*
    Konsolidasi nilai seluruh mata pelajaran siswa di kelas binaan, pengisian catatan perkembangan karakter/wali kelas, evaluasi deep learning, dan pencetakan Rapor resmi.
- **Dampak Penggabungan:**
  - Memangkas 1 menu mandiri (`view-rapor`) dari sidebar.
  - Alur penilaian akhir semester menjadi linear: Input Nilai $\rightarrow$ Tinjau Capaian $\rightarrow$ Terbitkan Rapor.

---

### 4.4. KLASTER 4: Konvergensi Laporan Kinerja, Analitik Kedisiplinan & Standardisasi View Dinas
> **Kandidat Menu yang Digabung:**
> 1. `view-admin-rekap` (Rekap Presensi Dewan Guru)
> 2. `view-rekap-guru` (Rekap Presensi Guru Satelit - Khusus Dinas)
> 3. `view-analitik` (Analitik Kedisiplinan & Leaderboard)
>
> **Nama Menu Usulan Hasil Konsolidasi:**
> 📊 **Laporan & Analitik Kinerja**

#### Analisis Alasan & Manfaat:
- **Alasan Teknis & Bisnis:** `AnalitikView` dan `AdminRekapView` mengeksekusi kueri agregasi ke tabel yang persis sama (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`). Sementara `view-rekap-guru` hanyalah panggilan duplikat ke `AdminRekapView` dengan mode baca-saja (*read-only*).
- **Rancangan Sub-Tab Terpadu:**
  - **Sub-Tab 1: Dashboard Analitik & Leaderboard (`tab=analitik`)**
    Visualisasi grafik tren jam kedatangan, grafik rasio keterisian jurnal, counter ketidakhadiran, dan Top 5 Guru Disiplin.
  - **Sub-Tab 2: Tabel Rekapitulasi Presensi (`tab=tabel`)**
    Tabel baris per guru yang memuat akumulasi hari hadir, terlambat, izin, sakit, alpa, dan total jam KBM riil.
  - **Sub-Tab 3: Cetak Laporan Resmi & Ekspor Excel (`tab=cetak`)**
    Pencetakan dokumen ber-KOP resmi dengan tanda tangan Kepala Sekolah/Pengawas Pembina serta ekspor .xlsx.
- **Dampak Penggabungan:**
  - Menghapus redundansi teknis `view-rekap-guru` dan menggabungkan 2 menu Admin/Kepsek (`view-analitik` dan `view-admin-rekap`) menjadi 1 modul eksekutif.

---

### 4.5. KLASTER 5: Rasionalisasi Konfigurasi, Kalender & Cadangan Sistem
> **Kandidat Menu yang Digabung:**
> 1. `view-sistem-blok` (Manajemen Periode Sistem Blok)
> 2. `view-admin-data` (Master Data Sekolah)
> 3. `view-admin-backup` (Akses Data / Backup)
> 4. `view-admin-config` (Sistem Konfigurasi)
>
> **Nama Menu Usulan Hasil Konsolidasi (Menjadi 2 Menu Terpadu):**
> 1. 🗄️ **Master Data & Kalender Akademik** (`view-admin-data`)
> 2. ⚙️ **Pengaturan Sistem & Database** (`view-admin-config`)

#### Analisis Alasan & Manfaat:
- **Alasan Teknis & Bisnis:** Administrator saat ini memiliki 4 menu sistem terpisah:
  - *Sistem Blok* berdiri sendiri sebagai menu sidebar padahal hanya digunakan saat pergantian periode PTS/PAS/Ujian (2–4 kali per tahun) dan hakikatnya adalah penyesuaian kalender akademik.
  - *Backup Data* hanya memiliki 1 fungsi: cadangkan presensi/jurnal ke Google Sheets dan arsip data lama.
- **Rancangan Konsolidasi 2 Menu:**
  - **Menu A: "Master Data & Kalender Akademik" (`view-admin-data`)**
    - Sub-Tab 1: Siswa & Rombel (Naik Kelas Massal & Cetak QR Card)
    - Sub-Tab 2: Guru & Akun Pendidik (termasuk Multi-Gelar & Reset Sandi)
    - Sub-Tab 3: Mata Pelajaran & Beban Jam
    - Sub-Tab 4: Jadwal Pelajaran Mingguan
    - Sub-Tab 5: Kalender Pendidikan (Hari Libur Nasional & Khusus)
    - Sub-Tab 6: **Periode Sistem Blok Kegiatan** *(Pindahan dari `view-sistem-blok`)*
    - Sub-Tab 7: Penetapan Wali Kelas
  - **Menu B: "Pengaturan Sistem & Database" (`view-admin-config`)**
    - Sub-Tab 1: Profil Sekolah & KOP Resmi (NPSN, Alamat, Logo, Pejabat TTD)
    - Sub-Tab 2: Jam Kerja & Toleransi Keterlambatan
    - Sub-Tab 3: Radius Geofence GPS & Koordinat Lokasi
    - Sub-Tab 4: Kebijakan Kamera & Aturan Presensi Khusus Guru
    - Sub-Tab 5: **Pencadangan Data & Integrasi Spreadsheet** *(Pindahan dari `view-admin-backup`)*
- **Dampak Penggabungan:**
  - Memangkas **2 menu penuh** dari sidebar Admin (`view-sistem-blok` dan `view-admin-backup`).
  - Menyatukan seluruh entitas kalender dan konfigurasi sistem ke wadah logis yang proporsional.

---

### 4.6. KLASTER 6: Penyatuan Pusat Verifikasi & Supervisi Terpadu
> **Kandidat Menu yang Digabung:**
> 1. `view-admin-verif` (Pusat Verifikasi: Presensi, Jurnal, Piket)
> 2. Fitur Verifikasi Kurikulum pada `view-dokumen` (Supervisi Perangkat Ajar)
>
> **Nama Menu Usulan Hasil Konsolidasi:**
> 📋 **Pusat Verifikasi & Supervisi** (`view-admin-verif`)

#### Analisis Alasan & Manfaat:
- **Alasan Teknis & Bisnis:** Administrator dan Kepala Sekolah saat ini melakukan verifikasi izin, jurnal, dan piket di `AdminVerifView`. Namun untuk memeriksa dan mengesahkan Perangkat Pembelajaran guru (Modul Ajar/CP/ATP), pimpinan harus membuka menu `view-dokumen`.
- **Rancangan Sub-Tab Terpadu:**
  - **Sub-Tab 1: Izin & Presensi Guru** (Verifikasi Sakit $\ge 3$ hari, Cuti $> 3$ hari, Izin Terlambat, Dinas Luar).
  - **Sub-Tab 2: Jurnal Mengajar KBM** (Pengesahan jurnal KBM harian guru).
  - **Sub-Tab 3: Laporan Piket** (Verifikasi rekap ketertiban gerbang & buku tamu).
  - **Sub-Tab 4: Perangkat Pembelajaran** (Matriks berkas kurikulum guru, telaah berkas PDF modul ajar, tombol Setujui / Revisi).
- **Dampak Penggabungan:**
  - Pimpinan sekolah memiliki **Dashboard Persetujuan Satu Pintu (One-Stop Approval Dashboard)**.
  - Menu `view-dokumen` murni menjadi repositori kurikulum guru tanpa terbebani panel supervisi pimpinan.

---

### 4.7. KLASTER 7: Harmonisasi Ekosistem Kesiswaan, Presensi Gerbang & Intervensi Wali
> **Kandidat Menu yang Digabung:**
> 1. `view-piket` [Tab Scan Gerbang & Buku Tamu]
> 2. `view-rekap-siswa` [Tab Log Gerbang & Intervensi Wali]
>
> **Rancangan Harmonisasi Fungsional:**
> 👥 **Pusat Presensi & Kesiswaan** (atau tetap **Presensi Siswa**)

#### Analisis Alasan & Manfaat:
- **Alasan Teknis & Bisnis:** Presensi siswa memiliki 2 titik pencatatan: gerbang sekolah oleh Guru Piket (via QR Scan) dan ruang kelas oleh Guru Mapel (via Jurnal). Wali Kelas melakukan sinkronisasi untuk mendeteksi siswa yang masuk gerbang namun bolos di kelas.
- **Rancangan Sub-Tab Terpadu:**
  - **Sub-Tab 1: Presensi Gerbang & Kiosk QR (`tab=gerbang`)** (Pemindaian QR siswa dan monitoring arus gerbang real-time).
  - **Sub-Tab 2: Rekapitulasi & Intervensi Wali (`tab=rekap`)** (Tabel absensi akumulatif, deteksi bolos, dan pemicu WhatsApp ke orang tua).
- **Dampak Penggabungan:**
  - `view-piket` tetap difungsikan secara terisolasi sebagai modul operasional petugas piket bertugas (kiosk scan gerbang, buku tamu, catatan ketertiban).
  - `view-rekap-siswa` bertindak sebagai pusat analitik dan intervensi kesiswaan terpadu, mengonsumsi data log pemindaian gerbang secara real-time tanpa duplikasi logika pemindaian.
  - Menghilangkan friksi komunikasi antara Guru Piket dan Wali Kelas: deteksi ketidakhadiran gerbang vs kelas tersinkronisasi otomatis dalam satu layar kesiswaan.

---

## 5. RANCANGAN USULAN STRUKTUR MENU BARU (PROPOSED MENU ARCHITECTURE)

Berikut adalah cetak biru (*blueprint*) arsitektur menu baru setelah menerapkan konsolidasi 7 klaster:

---

### 5.1. Struktur Baru untuk Peran Guru

```
[ GURU REGULER ] -> Hanya 6 Menu (Sebelumnya 8 Menu Dasar, Reduksi 25%)
├── 1. 🏠 Dashboard (view-home)
├── 2. 🕒 Presensi Guru (view-guru-presensi)
│      ├── Tab: Presensi Hari Ini (Datang, Pulang, Dinas Luar, Izin)
│      └── Tab: Riwayat Presensi & Status Pengajuan
├── 3. 📚 Jurnal Pembelajaran (view-guru-jurnal)
│      ├── Tab: Input Jurnal KBM (Adaptif Sistem Blok & Inval)
│      └── Tab: Riwayat & Rekap Jurnal Saya (Cetak 10 Kolom & Ekspor)
├── 4. 📁 Perangkat Pembelajaran (view-dokumen)
│      ├── Tab: Daftar Berkas Ajar Saya
│      └── Tab: Unggah Dokumen Baru (CP, ATP, Modul Ajar)
├── 5. 🎓 Asesmen & Rapor (view-gradebook)
│      └── Tab: Buku Nilai Mapel (Formatif & Sumatif Kurikulum Merdeka)
└── 6. 📢 Informasi Sekolah (view-informasi)

[ GURU WALI KELAS ] -> Hanya 7 Menu (Sebelumnya 11 Menu, Reduksi 36.4%)
├── Menu 1-6 Guru Reguler di atas dengan hak akses sub-tab binaan:
│      ├── Pada Menu 3 (Jurnal): + Sub-Tab 3: Supervisi Jurnal Kelas Binaan (tab=supervisi-kelas)
│      └── Pada Menu 5 (Asesmen): + Sub-Tab 2: Rapor Kelas Binaan & Leger (tab=rapor)
└── 7. 👥 Presensi Siswa (view-rekap-siswa)
       ├── Tab: Presensi Gerbang & Deteksi Bolos
       └── Tab: Rekap Absensi Siswa & Notifikasi WhatsApp Wali Murid

[ GURU PIKET ] -> Tambahan 1 Menu Dinamis Saat Bertugas (Total 7–8 Menu)
└── + 🛡️ Modul Piket (view-piket) [Hanya muncul saat terjadwal piket hari ini]
       ├── Tab: Kiosk QR Scan Gerbang Siswa
       ├── Tab: Laporan Ketertiban & Buku Tamu
       └── Tab: Submit Laporan Piket Harian
```

---

### 5.2. Struktur Baru untuk Peran Administrator Sekolah

```
[ ADMINISTRATOR SEKOLAH ] -> 8 Menu Utama Terpadu (Sebelumnya 15 Menu, Reduksi 46.7%)
├── 1. 🏠 Dashboard Operasional (view-home)
├── 2. 📋 Pusat Verifikasi & Supervisi (view-admin-verif)
│      ├── Tab: Izin & Presensi Guru
│      ├── Tab: Jurnal KBM Guru
│      ├── Tab: Laporan Petugas Piket
│      └── Tab: Perangkat Pembelajaran (Modul Ajar / RPP)
├── 3. 🛡️ Kelola Modul Piket (view-piket)
│      ├── Tab: Kiosk Presensi QR Siswa
│      ├── Tab: Jadwal & Penugasan Guru Piket
│      └── Tab: Rekap Ketertiban & Buku Tamu
├── 4. 📊 Laporan & Analitik Kinerja (view-admin-rekap)
│      ├── Tab: Dashboard Analitik & Leaderboard Disiplin
│      ├── Tab: Tabel Rekapitulasi Presensi Bulanan Dewan Guru
│      └── Tab: Cetak Dokumen Resmi KOP & Ekspor Excel
├── 5. 👥 Presensi Siswa & Kesiswaan (view-rekap-siswa)
│      ├── Tab: Presensi Siswa Seluruh Kelas
│      ├── Tab: Log Pemindaian Gerbang & Deteksi Bolos
│      └── Tab: Rekapitulasi Absensi & Peringatan Otomatis
├── 6. 🎓 Asesmen & Rapor Sekolah (view-gradebook)
│      ├── Tab: Supervisi Ledger Nilai Seluruh Rombel
│      └── Tab: Supervisi & Pencetakan Rapor Sekolah
├── 7. 🗄️ Master Data & Kalender (view-admin-data)
│      ├── Tab: Siswa & Rombel (Naik Kelas Massal & Cetak QR Card)
│      ├── Tab: Guru & Akun Pendidik (Multi-Gelar & Akses Akun)
│      ├── Tab: Mata Pelajaran & Jadwal KBM Mingguan
│      ├── Tab: Kalender Pendidikan (Libur Nasional & Khusus)
│      ├── Tab: Periode Sistem Blok Kegiatan (PTS/PAS/Ujian)
│      └── Tab: Penetapan Wali Kelas
├── 8. ⚙️ Pengaturan Sistem & Database (view-admin-config)
│      ├── Tab: Profil Sekolah & KOP Surat Resmi
│      ├── Tab: Jam Kerja & Toleransi Keterlambatan
│      ├── Tab: Geofence GPS & Radius Lokasi Presensi
│      ├── Tab: Kebijakan Kamera & Aturan Presensi Khusus Guru
│      └── Tab: Pencadangan Data & Sinkronisasi Spreadsheet
└── 9. 📢 Informasi & Pengumuman Sekolah (view-informasi) [Opsi Terpadu / Menu ke-9]
       *(Catatan Wewenang: Admin adalah aktor utama yang menerbitkan pengumuman, menyematkan siaran penting, dan memoderasi tanggapan. Menu ini dapat berdiri sebagai menu ke-9 atau disematkan langsung sebagai tombol kelola cepat pada header Dashboard Operasional, menghasilkan 8 menu sidebar zero-scroll).*
```

---

### 5.3. Struktur Baru untuk Peran Kepala Sekolah

```
[ KEPALA SEKOLAH ] -> Hanya 6–7 Menu (Sebelumnya 13–15 Menu, Reduksi 46.2%–53.8%)
├── 1. 🏠 Dashboard Eksekutif (view-home)
├── 2. 📋 Pusat Supervisi & Pengesahan (view-admin-verif)
│      ├── Tab: Verifikasi Izin & Cuti Dewan Guru
│      ├── Tab: Verifikasi Jurnal Mengajar Harian
│      ├── Tab: Pengesahan Laporan Petugas Piket
│      └── Tab: Supervisi & Persetujuan Perangkat Pembelajaran
├── 3. 📊 Laporan & Analitik Sekolah (view-admin-rekap)
│      ├── Tab: Analitik Kedisiplinan & Tren Kehadiran
│      ├── Tab: Rekapitulasi Presensi Dewan Guru
│      └── Tab: Cetak Laporan Resmi Yayasan / Dinas Pendidikan
├── 4. 👥 Monitoring Kesiswaan & Akademik (view-rekap-siswa)
│      ├── Tab: Pemantauan Kehadiran Siswa
│      └── Tab: Supervisi Keterisian Jurnal Kelas
├── 5. 🕒 Presensi Guru Mandiri (view-guru-presensi) [Bila Kepsek berstatus wajib presensi]
│      ├── Tab: Presensi Hari Ini (Datang/Pulang/Dinas Luar)
│      └── Tab: Riwayat Kehadiran Mandiri
├── 6. 📚 Jurnal Pembelajaran Mandiri (view-guru-jurnal) [Bila Kepsek memiliki jam ajar riil]
│      ├── Tab: Input Jurnal KBM
│      └── Tab: Riwayat & Rekap Jurnal Saya
└── 7. 📢 Informasi & Pengumuman (view-informasi)

*(Catatan Arsitektur: Menjaga pemisahan logis antara Presensi dan Jurnal bagi Kepala Sekolah menjamin konsistensi modul dengan Guru Reguler, menghindari pembuatan sub-tab buatan yang menyimpang dari modul dasar).*
```

---

### 5.4. Struktur Baru untuk Peran Pengawas Dinas Pendidikan

```
[ PENGAWAS DINAS PENDIDIKAN ] -> 2 Menu Utama Terpadu (Read-Only)
├── 1. 🌐 Dashboard Eksekutif Wilayah (view-dinas-overview)
└── 2. 📊 Laporan Terpadu Sekolah Satelit (view-admin-rekap) [Muncul saat memilih sekolah binaan]
       ├── Sub-Tab: Rekapitulasi Presensi Dewan Guru (Read-Only)
       ├── Sub-Tab: Presensi Siswa Satelit (Read-Only)
       └── Sub-Tab: Supervisi Jurnal KBM Kelas (Read-Only)
```

---

### 5.5. Struktur Baru untuk Peran Superadmin Platform Multi-Tenant

```
[ SUPERADMIN PLATFORM ] -> 3 Menu Platform + 5 Menu Satelit Terkonsolidasi
├── 1. 🌐 Ringkasan Platform Multi-Tenant (view-superadmin-overview)
├── 2. 🏫 Jaringan Sekolah & Lisensi (view-superadmin-jaringan)
├── 3. 🏛️ Akun Dinas Pendidikan (view-superadmin-dinas)
└── Saat Drilldown ke Satelit Sekolah (activeTargetSchool terpilih):
    ├── 🗄️ Master Data & Kalender Satelit (view-admin-data)
    ├── 📋 Pusat Verifikasi Satelit (view-admin-verif)
    ├── 📊 Laporan & Analitik Satelit (view-admin-rekap)
    ├── 👥 Kesiswaan & Presensi Siswa Satelit (view-rekap-siswa)
    └── ⚙️ Sistem & Pengaturan Satelit (view-admin-config)
```

---

### 5.6. Matriks Perbandingan Komprehensif Sebelum vs Sesudah (Before-After Matrix)

| Parameter Evaluasi | Kondisi Eksisting (As-Is) | Usulan Rekomendasi (To-Be) | Manfaat Bisnis & UX |
|---|---|---|---|
| **Jumlah Menu Guru Reguler** | 8 Menu Dasar | **6 Menu** | **Turun 25%**, siklus harian terhubung tanpa fragmentasi. |
| **Jumlah Menu Guru Wali Kelas** | 11 Menu | **7 Menu** | **Turun 36.4%**, penataan modul binaan yang bersih dan modular. |
| **Jumlah Menu Administrator** | 15 Menu | **8 Menu** (atau 7 jika terpadu) | **Turun 46.7% – 53.3%**, seluruh menu tampil pas di layar laptop tanpa scrollbar (*zero scroll*). |
| **Jumlah Menu Kepala Sekolah** | 13 – 15 Menu | **6 – 7 Menu** | **Turun 46.2% – 53.8%**, orientasi pengawasan eksekutif terpusat dan berwibawa. |
| **Jumlah Menu Pengawas Dinas** | 4 Menu (1 Platform + 3 Satelit) | **2 Menu Terpadu** | **Turun 50%**, navigasi terpadu berbasis tab saat pemantauan satelit. |
| **Menu Satelit Superadmin** | 6 Menu Satelit Terpisah | **5 Menu Terkonsolidasi** | Konsolidasi analitik & rekap tanpa menghilangkan audit kesiswaan sekolah satelit. |
| **Akses Jurnal Guru** | Terpecah di 4 menu berbeda | 1 menu terpadu (*Pusat Jurnal KBM*) | Input, cek status verifikasi, dan cetak bulanan dalam satu alur terpadu. |
| **Laporan & Analitik** | Terpisah di 2 menu (`view-analitik` & `view-admin-rekap`) | 1 menu terpadu (*Laporan & Analitik*) | Grafik tren visual bersanding langsung dengan data tabular. |
| **Pengaturan Admin** | Terpencar di 4 menu berbeda | Dikelompokkan ke 2 menu terpadu | Menghilangkan menu mandiri yang jarang diakses (*Sistem Blok* & *Backup*). |
| **Menu Riwayat** | Menu mandiri (`view-history`) | Melekat di modul fungsional terkait | Presensi memiliki riwayat sendiri, Jurnal memiliki riwayat sendiri. |
| **Penilaian & Rapor** | Dua menu terpisah (`view-gradebook` & `view-rapor`) | 1 menu terpadu (*Asesmen & Rapor*) | Alur penilaian bersambung langsung ke penerbitan lembar rapor. |
| **Verifikasi Perangkat Ajar** | Tersembunyi di `view-dokumen` | Terpusat di `view-admin-verif` | Seluruh persetujuan pimpinan berada dalam satu pintu (*One-Stop Approval*). |

---

## 6. RANCANGAN ANTARMUKA & ALUR PENGALAMAN PENGGUNA (UX WIREFLOW)

### 6.1. Pola Navigasi Sub-Tab Claymorphism & URL Deep-Linking State

Penggabungan modul dirancang dengan menggunakan pola **Claymorphism Tab Navigation** yang sudah terbukti konsisten, ergonomis, dan responsif pada komponen `DokumenView.tsx` dan `RekapSiswaView.tsx`. Pola ini diperkuat dengan standar aksesibilitas WAI-ARIA dan integrasi query parameter URL yang mulus:

```
+---------------------------------------------------------------------------------------------------+
|  SIPJAM  |  [Profil Sekolah]                                         [User Avatar] [Settings]    |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  📚 PUSAT JURNAL KBM                                                   [Cetak Rekap] [Refresh]    |
|  Kelola formulir harian KBM, rekapitulasi jam mengajar, dan supervisi kelas binaan                |
|                                                                                                   |
|  +-----------------------+-----------------------------+-------------------------------+          |
|  |  📝 Input Jurnal KBM  |  📑 Riwayat & Rekap Saya    |  👁️ Supervisi Kelas Binaan*   |  ...     | <- Tab Clay
|  +-----------------------+-----------------------------+-------------------------------+          |
|                                                                                                   |
|  [ KONTEN SUB-TAB AKTIF ] (Pola Keep-Alive In-Memory State)                                       |
|  - Menyimpan state input formulir secara lokal (tanpa unmount komponen child)                     |
|  - Sinkronisasi dwiarah URL (?view=view-guru-jurnal&tab=input) via replaceState                   |
|  - Animasi transisi halus Claymorphism tanpa memicu page reload                                   |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

#### Spesifikasi Teknis Sub-Tab Claymorphism:
1. **Desain Visual & Tokens Claymorphism:**
   - Tab aktif menggunakan kombinasi gradien lembut `bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/30`, batas border lembut `border-2 border-white dark:border-emerald-700/50`, serta bayangan volumetrik `shadow-[3px_3px_8px_rgba(180,210,190,0.5),inset_1px_1px_2px_rgba(255,255,255,0.9)]`.
   - Tab tidak aktif menggunakan kontras netral `text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80` dengan transisi `duration-200` dan efek sentuh `active:scale-95`.
2. **Aksesibilitas Semantik (WAI-ARIA Tab Pattern):**
   - Container navigasi dideklarasikan dengan `role="tablist"` dan `aria-label="Pilihan Sub Modul"`.
   - Masing-masing tab button memiliki atribut `role="tab"`, `aria-selected={activeTab === tabId}`, `aria-controls={`panel-${tabId}`}`, dan `id={`tab-${tabId}`}`.
   - Panel konten dibungkus dengan `role="tabpanel"`, `id={`panel-${tabId}`}`, dan `aria-labelledby={`tab-${tabId}`}`.
3. **Pola Pelestarian State (In-Memory Keep-Alive vs Unmounting):**
   - Salah satu kegagalan umum dalam sistem tab adalah hilangnya draf teks saat pengguna berganti tab (misalnya, guru yang sedang mengisi 10 field jurnal berpindah sebentar ke tab riwayat, lalu kembali menemukan formulir ter-reset).
   - Arsitektur ini menetapkan pola **CSS Display Toggling (`hidden` / `display: none`)** untuk sub-tab formulir kritis, bukan penghapusan kondisional (`{activeTab === 'input' && <InputForm />}`). Dengan pendekatan ini:
     - Instance komponen React tetap bertahan di memori (*in-memory state preserved*).
     - Seluruh input teks, dropdown, dan upload foto yang belum disubmit tidak hilang.
     - Hanya sub-tab murni tampilan data (seperti tabel cetak atau analitik berat) yang di-mount secara lazy untuk efisiensi DOM.
4. **Sinkronisasi Dwiarah URL (Deep-Linking):**
   - Setiap pergantian tab memperbarui URL peramban menggunakan `window.history.replaceState(null, '', `?view=${currentView}&tab=${newTab}`)`.
   - Hal ini memungkinkan pengguna menyalin link spesifik (contoh: membagikan link ke tab tertentu kepada rekan guru), me-refresh halaman tanpa terlempar ke tab default, dan tetap mempertahankan riwayat navigasi yang rapi tanpa membanjiri stack *Back/Forward* browser.

---

### 6.2. Penegakan Akses Berbasis Peran (RBAC), Multi-Role Switching & State Isolation

Konsolidasi menu ke dalam sub-tab mewajibkan penegakan keamanan berlapis (*defense-in-depth*) dan isolasi data yang ketat:

#### 1. Arsitektur Pertahanan Berlapis (Defense-in-Depth RBAC):
- **Lapisan 1: Penyembunyian Antarmuka (UI Guard):**
  - Tombol Sub-Tab *Supervisi Kelas Binaan* dan *Rapor Kelas Binaan* hanya dirender jika `isWaliKelas || isAdmin || isSuperadmin`.
  - Tombol Sub-Tab *Sistem Blok* dan *Cadangan Spreadsheet* hanya dirender jika `isAdmin || isSuperadmin`.
- **Lapisan 2: Router & Tab Guarding (URL Tampering Guard):**
  - Jika pengguna reguler mencoba memasukkan query parameter URL secara manual (contoh: `?view=view-gradebook&tab=rapor`), komponen sub-tab mengeksekusi *guard clause*:
    ```tsx
    if (activeTab === 'rapor' && !isWaliKelas && !isAdmin && !isSuperadmin) {
      return (
        <AccessDeniedCard 
          title="Akses Terblokir" 
          message="Halaman Rapor secara eksklusif hanya dapat diakses oleh Wali Kelas dan Administrator."
          onBack={() => setActiveTab('gradebook')}
        />
      );
    }
    ```
- **Lapisan 3: Ketahanan Pergantian Peran (Multi-Role Switching Resilience):**
  - Pada aplikasi SIPJAM, Superadmin dan Pengawas Dinas memiliki fitur *Target Satellite Switcher* (`activeTargetSchool`). Selain itu, akun Guru dapat merangkap tugas sebagai Wali Kelas, Guru Piket, atau berpindah sesi.
  - Saat `activeTargetSchool` atau identitas `user` berubah, sistem sub-tab harus memvalidasi ulang hak akses `activeTab`. Jika tab saat ini tidak sah bagi konteks sekolah/peran baru, sistem secara otomatis mengembalikan (*graceful fallback*) ke tab utama yang sah (contoh: `tab='input'` atau `tab='analitik'`).

#### 2. Partisi Kunci Penyimpanan Lokal (LocalStorage / SessionStorage Scoping):
Aplikasi SIPJAM menggunakan `localStorage` untuk fitur-fitur offline dan penyimpanan draf otomatis. Agar penggabungan menu tidak menyebabkan tumpang tindih draf antar-peran atau antar-sekolah satelit, seluruh kunci penyimpanan dipartisi secara ketat:
- **Draf Jurnal KBM:** Dipartisi per ID guru dan sekolah: `sipjam_jurnal_autosave_${user.id}_${user.sekolah_id}` (bukan global `sipjam_jurnal_autosave`).
- **Autosave Nilai Asesmen:** Dipartisi per kelas dan mapel: `sipjam_gradebook_${kelasId}_${mapelId}_${semester}`.
- **Catatan Wali Kelas di Rapor:** Dipartisi per siswa dan tahun ajaran: `sipjam_rapor_notes_${siswaId}_${tahunAjaranId}`.
- **Antrean Presensi Offline:** Dipartisi per user: `sipjam_offline_presensi_${user.id}`.
- **Siklus Hidup Draf:** Draf dimuat otomatis saat komponen dibuka (*on mount*), disimpan dengan *debounce* 500ms saat ada perubahan input, dan dibersihkan dari penyimpanan begitu transaksi mutasi database berhasil (*on successful submit*).

---

### 6.3. Desain Responsif & Ergonomi Layar Seluler (Mobile Ergonomics)

Pada layar smartphone (`viewport < 640px`):
- **Horizontal Scrollable Sub-Tab Bar:** Tab navigasi ditampilkan dalam satu baris horizontal dengan properti `overflow-x-auto flex-nowrap no-scrollbar`. Pengguna dapat menggeser tab dengan sapuan jari yang mulus.
- **Visual Scroll Cue:** Efek bayangan gradien halus (*fading mask*) diterapkan di sisi kanan baris tab jika terdapat sub-tab yang meluap ke luar layar, memberi petunjuk visual bahwa opsi menu masih dapat digeser.
- **Penempatan Elemen Kritis di Thumb Zone:** Tombol aksi utama (seperti *Simpan Jurnal*, *Ambil Foto Selfie*, atau *Ekspor Nilai*) ditempatkan pada sepertiga bawah layar agar mudah dijangkau satu tangan.
- **Eliminasi Total Scrollbar Sidebar:** Dengan berkurangnya jumlah menu sidebar menjadi 6–7 item, menu samping kini dapat tampil 100% utuh tanpa scrollbar pada layar smartphone standar beresolusi 360x640px hingga 412x915px.

---

## 7. RENCANA TAHAPAN IMPLEMENTASI (IMPLEMENTATION ROADMAP)

Untuk menjamin transisi yang mulus tanpa mengganggu operasional sekolah yang sedang berjalan, implementasi konsolidasi menu dianjurkan dijalankan melalui 4 fase bertahap:

```
[ FASE 1: Low-Risk Component Sharing ]
├── 1. Satukan initialMode 'pribadi' dan 'kelas' pada RekapJurnalView
└── 2. Pindahkan konten HistoryView ke sub-tab GuruPresensi dan GuruJurnal
                         │
                         ▼
[ FASE 2: Medium-Risk Functional Merging ]
├── 1. Gabungkan GradebookView dan RaporView ke dalam Asesmen & Rapor
├── 2. Integrasikan AnalitikView dan AdminRekapView ke Laporan Kinerja
├── 3. Sisipkan SistemBlokView ke dalam tab Kalender AdminDataView
└── 4. Integrasikan AdminBackupView ke dalam tab AdminConfigView
                         │
                         ▼
[ FASE 3: Navigation Restructuring & URL Aliasing ]
├── 1. Perbarui array menuItems di AppScreen.tsx & ClaySidebar.tsx
├── 2. Pasang URL Aliasing Mapper untuk backward compatibility link (?view=...)
└── 3. Terapkan RBAC guard pada tingkat sub-tab
                         │
                         ▼
[ FASE 4: Test Suite Alignment & User Documentation ]
├── 1. Perbarui selektor data-tour di tutorialSteps.ts dan tutorialData.ts
├── 2. Perbarui docs/PANDUAN_PENGGUNA.md dan TUTORIAL.md
└── 3. Eksekusi full test suite (npm test) dan verifikasi build (npm run build)
```

---

### 7.1. Tahap 1: Penggabungan Komponen Berbagi-Pakai & Standardisasi View Identik (Low Risk)
- **Fokus:** Menghapus duplikasi teknis pada komponen yang sudah memiliki kesamaan 90%+.
- **Aksi Teknis:**
  1. Hapus pembedaan view ID antara `view-guru-rekap-jurnal` dan `view-jurnal-kelas` di level sidebar; arahkan ke satu view dengan sub-tab terpadu.
  2. Standarisasi `view-rekap-guru` (Dinas) agar menggunakan `view-admin-rekap` dengan properti `isReadOnly={true}`.
  3. Pindahkan logika pengambilan data riwayat presensi ke dalam accordion/tab di `GuruPresensi.tsx`.

### 7.2. Tahap 2: Konsolidasi Modul Fungsional Serumpun Berbasis Tab (Medium Risk)
- **Fokus:** Menggabungkan modul yang saling berkaitan dalam aliran data.
- **Aksi Teknis:**
  1. Hubungkan `GradebookView` dan `RaporView` dalam satu wrapper antarmuka sub-tab.
  2. Satukan visualisasi grafik `AnalitikView` ke bagian atas `AdminRekapView` dengan toggle *Ringkasan Visual* vs *Tabel Data*.
  3. Sematkan `SistemBlokView` sebagai Tab ke-6 di dalam `AdminDataView.tsx`.
  4. Sematkan modul pencadangan spreadsheet `AdminBackupView` ke dalam `AdminConfigView.tsx`.

### 7.3. Tahap 3: Reorganisasi Navigasi Sidebar & Arsitektur URL Aliasing Transparan
- **Fokus:** Menata ulang menu sidebar dan memastikan seluruh bookmark URL lama, notifikasi pesan eksternal, maupun navigasi peramban (Back/Forward) tetap berfungsi normal tanpa error 404 atau halaman kosong.
- **Aksi Teknis 1: Reorganisasi Navigasi Sidebar:**
  Perbarui array `menuItemsGuru`, `menuItemsAdmin`, `menuItemsKepalaSekolah`, `menuItemsDinas`, dan `menuItemsSuperadmin` pada `src/components/AppScreen.tsx` dan `src/components/ClaySidebar.tsx` sesuai cetak biru Bab 5.
- **Aksi Teknis 2: Implementasi URL Aliasing Router Terpadu di 3 Titik Kritis `AppScreen.tsx`:**
  Aliasing URL tidak boleh hanya dipasang pada `handleNavigation`, melainkan wajib diintegrasikan pada 3 siklus hidup navigasi React:
  1. **Inisialisasi Cold Start / Bookmark (`useState`):** Menangkap URL query saat aplikasi pertama kali dimuat.
  2. **Navigasi Riwayat Peramban (`popstate` Event Listener):** Mengintersepsi tombol *Back/Forward* browser.
  3. **Navigasi Antar-Menu Imperatif (`handleNavigation`):** Mengeksekusi proteksi RBAC dan alur kerja harian guru (*Guru Daily Workflow Checks*).

```typescript
// ============================================================================
// ARSITEKTUR URL ALIASING & SUB-TAB ROUTER (AppScreen.tsx)
// ============================================================================

export interface ViewResolution {
  canonicalView: string;
  defaultTab?: string;
  isLegacyAlias: boolean;
}

// 1. Kamus Pemetaan URL Warisan (Legacy View Aliases Dictionary)
export const VIEW_ALIASES: Record<string, { view: string; tab?: string }> = {
  // Klaster 1: Jurnal Mengajar
  'view-guru-rekap-jurnal': { view: 'view-guru-jurnal', tab: 'rekap-pribadi' },
  'view-jurnal-kelas':      { view: 'view-guru-jurnal', tab: 'supervisi-kelas' },
  // Klaster 2: Presensi Guru
  'view-history':           { view: 'view-guru-presensi', tab: 'riwayat' },
  // Klaster 3: Asesmen & Rapor
  'view-rapor':             { view: 'view-gradebook', tab: 'rapor' },
  // Klaster 4: Laporan & Analitik Kinerja
  'view-analitik':          { view: 'view-admin-rekap', tab: 'analitik' },
  'view-rekap-guru':        { view: 'view-admin-rekap', tab: 'tabel' },
  // Klaster 5: Master Data & Sistem
  'view-sistem-blok':       { view: 'view-admin-data', tab: 'blok' },
  'view-admin-backup':      { view: 'view-admin-config', tab: 'backup' }
};

// 2. Fungsi Resolver Kanonikal
export function resolveCanonicalRoute(rawView: string | null, rawTab: string | null): ViewResolution {
  if (!rawView) {
    return { canonicalView: 'view-home', isLegacyAlias: false };
  }
  const alias = VIEW_ALIASES[rawView];
  if (alias) {
    return {
      canonicalView: alias.view,
      defaultTab: rawTab || alias.tab,
      isLegacyAlias: true
    };
  }
  return {
    canonicalView: rawView,
    defaultTab: rawTab || undefined,
    isLegacyAlias: false
  };
}

// 3. Integrasi pada State AppScreen.tsx:
// A. State Inisialisasi:
const [currentRoute, setCurrentRoute] = useState<{ view: string; tab?: string }>(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const resolved = resolveCanonicalRoute(params.get('view'), params.get('tab'));
    if (resolved.isLegacyAlias) {
      // Normalisasi URL tanpa reload jika berasal dari link bookmark lama
      const normParams = new URLSearchParams();
      normParams.set('view', resolved.canonicalView);
      if (resolved.defaultTab) normParams.set('tab', resolved.defaultTab);
      window.history.replaceState(null, '', `?${normParams.toString()}`);
    }
    return { view: resolved.canonicalView, tab: resolved.defaultTab };
  }
  return { view: isSuperadmin ? 'view-superadmin-overview' : isDinas ? 'view-dinas-overview' : 'view-home' };
});

// B. Listener Popstate (Tombol Back/Forward Browser):
useEffect(() => {
  const handlePopState = () => {
    const params = new URLSearchParams(window.location.search);
    const resolved = resolveCanonicalRoute(params.get('view'), params.get('tab'));
    setCurrentRoute({ view: resolved.canonicalView, tab: resolved.defaultTab });
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);

// C. Navigasi Imperatif (handleNavigation):
const handleNavigation = async (targetViewId: string, targetTab?: string) => {
  const resolved = resolveCanonicalRoute(targetViewId, targetTab);
  
  // Eksekusi Guard Workflow & Validasi Hak Akses RBAC...
  // (Pemeriksaan isLibur, presensiDatang, isPiket, dan wewenang peran pengguna)
  
  const searchParams = new URLSearchParams();
  searchParams.set('view', resolved.canonicalView);
  if (resolved.defaultTab) searchParams.set('tab', resolved.defaultTab);
  
  window.history.pushState(null, '', `?${searchParams.toString()}`);
  setCurrentRoute({ view: resolved.canonicalView, tab: resolved.defaultTab });
  setSidebarOpen(false);
};
```

---

### 7.4. Tahap 4: Penyelarasan Sistem Tutorial, Onboarding Tour, dan Pengujian Regresi
- **Fokus:** Menjaga integritas 100% test suite otomatis, memperbarui metadata panduan interaktif, dan menyinkronkan dokumentasi operasional pengguna.
- **Aksi Teknis 1: Refaktorisasi `src/components/Tutorial/tutorialData.ts`:**
  - Saat ini `TUTORIAL_DATA` mendefinisikan 28 item tutorial warisan (11–12 item Guru, 14 item Admin, 2–3 item Superadmin) dengan view ID terpisah (`view-guru-rekap-jurnal`, `view-sistem-blok`, dll.).
  - Rekomendasi refaktorisasi:
    1. Konsolidasikan item tutorial menjadi **16 Panduan Modul Terpadu** yang memetakan fitur-fitur sub-tab secara terstruktur.
    2. Perbarui properti `viewId` pada setiap tutorial item agar merujuk ke view kanonikal baru dengan menambahkan properti opsional `targetTab?: string`.
    3. Pertahankan fungsi pembantu `getTutorialsByRole()` dan `searchTutorials()` dengan memperluas pencarian query agar kata kunci lama (seperti `"blok"`, `"rekap jurnal"`, `"backup"`) tetap menemukan modul induknya.
- **Aksi Teknis 2: Penyelarasan `src/components/Onboarding/tutorialSteps.ts`:**
  - Perbarui target selektor tur pada `GURU_STEPS` dan `ADMIN_STEPS`:
    - Pada `GURU_STEPS`: Ganti step `view-rapor` menjadi `view-gradebook` (dengan catatan sub-tab Rapor).
    - Pada `ADMIN_STEPS`: Ganti step `view-sistem-blok` menjadi `view-admin-data` (fokus pada tab Sistem Blok & Kalender), dan ganti `view-analitik` menjadi `view-admin-rekap`.
- **Aksi Teknis 3: Pembaruan Dokumentasi Panduan Pengguna:**
  - Selaraskan bab-bab panduan pada `docs/PANDUAN_PENGGUNA.md` dan `TUTORIAL.md` agar mencerminkan alur kerja sub-tab baru.
- **Aksi Teknis 4: Eksekusi Penuh Test Suites (Regresi Nol):**
  - Jalankan verifikasi tipe statis: `npx tsc --noEmit`.
  - Eksekusi 41 test runner eksisting: `npm test`. Seluruh pengujian terkait RBAC, sinkronisasi presensi, multi-gelar, sistem blok, dan keamanan tenant wajib lulus 100% hijau (*zero regression*).

---

## 8. ANALISIS RISIKO TEKNIS & STRATEGI MITIGASI

### 8.1. Matriks Risiko Teknis & Mitigasi

| Potensi Risiko | Tingkat Risiko | Dampak Potensial | Strategi Mitigasi Teknis Teruji |
|---|:---:|---|---|
| **Pembengkakan Ukuran Bundle (*Bundle Bloat*)** | Sedang | Waktu muat awal halaman menjadi lebih berat jika banyak sub-komponen dimuat bersamaan. | Terapkan **Next.js Dynamic Imports (`next/dynamic`)** dengan lazy loading per sub-tab non-kritis sehingga kode tabel cetak dan grafik analitik hanya diunduh saat tab diaktifkan. |
| **Kerusakan Bookmark & Tautan WhatsApp** | Rendah | URL lama pada bookmark guru atau link reminder WhatsApp menghasilkan tampilan kosong atau error 404. | Terapkan **URL Aliasing Router** di 3 siklus hidup `AppScreen.tsx` (inisialisasi `useState`, event `popstate`, dan fungsi `handleNavigation`) yang secara transparan mengalihkan route lama ke view kanonikal dan sub-tab yang relevan. |
| **Kehilangan Draf Formulir Saat Ganti Tab (*Dirty Form Loss*)** | Tinggi | Guru kehilangan input 10 field jurnal KBM atau nilai siswa saat tidak sengaja mengklik sub-tab lain. | Terapkan pola **Keep-Alive In-Memory (CSS `hidden`)** pada sub-tab formulir aktif alih-alih unmounting kondisional React. Draf otomatis tetap tersimpan di `localStorage` terpartisi secara berkala (*debounced 500ms*). |
| **Kebocoran Hak Akses Antar-Peran (*RBAC Bypass*)** | Tinggi | Pengguna biasa memanipulasi parameter URL (`?view=view-gradebook&tab=rapor`) untuk membaca data rahasia rapor. | Terapkan proteksi ganda (*defense-in-depth*): sembunyikan tombol tab dari UI DAN terapkan *guard clause* internal di dalam komponen sub-tab yang merender `<AccessDeniedCard />`. |
| **Pencemaran Data Lokal Multi-Tenant (*Storage Bleed*)** | Sedang | Berganti sekolah satelit pada mode Superadmin/Dinas menyebabkan draf data sekolah A terbaca di sekolah B. | Partisi seluruh kunci `localStorage` dan `sessionStorage` dengan menyertakan `userId` dan `sekolahId` (contoh: `sipjam_jurnal_${userId}_${sekolahId}`). |
| **Disorientasi Pengguna Lama (*Cognitive Friction*)** | Sedang | Guru terbiasa mencari menu "Rekap Jurnal" terpisah dan bingung ketika menu tersebut digabung. | Pasang *Toast Notification / Guided Banner* selama 30 hari pertama pasca-rilis: *"Menu Rekap Jurnal kini terintegrasi di tab 'Riwayat & Rekap Saya' pada Pusat Jurnal KBM."* |

---

### 8.2. Penanganan Dependensi Test Suite & Selektor `data-tour`

#### Bukti Analisis Forensik Selektor DOM pada Sistem Onboarding:
Pada penelaahan implementasi tur onboarding di `src/components/Onboarding/OnboardingTutorial.tsx` (baris 56):
```typescript
const selector = `[data-tour="${currentStep.targetTourId}"]`;
const targetElement = document.querySelector(selector);
```
**Temuan Kritis:** Selektor CSS `[data-tour="..."]` di atas mengeksekusi pencocokan string **persis (exact match)**.
Jika pengembang mencoba menerapkan selektor ganda dengan pemisah spasi (misalnya: `data-tour="view-guru-jurnal view-guru-rekap-jurnal"`), maka pemanggilan `document.querySelector('[data-tour="view-guru-jurnal"]')` akan mengembalikan nilai `null` karena string atribut tidak identik secara penuh. Hal ini berpotensi mematahkan alur tur interaktif (*Onboarding Tour Crash*).

#### Protokol Solusi Teknis Teruji:
Untuk mencegah kegagalan selektor tersebut pada saat implementasi Fase 4, tim pengembang harus memilih salah satu dari dua pendekatan standar berikut:

1. **Pendekatan A: Pembaruan Selektor Query DOM pada `OnboardingTutorial.tsx` (Rekomendasi Utama)**
   Ubah pemanggilan selektor agar mendukung atribut berbasis kata (*whitespace-separated word matcher*):
   ```typescript
   // Menggunakan selektor ~= agar dapat mencocokkan kata individual dalam atribut bernilai majemuk
   const selector = `[data-tour~="${currentStep.targetTourId}"], [data-tour="${currentStep.targetTourId}"]`;
   const targetElement = document.querySelector(selector);
   ```
   Dengan perbaikan satu baris ini, tombol sidebar dapat memiliki atribut majemuk `data-tour="view-guru-jurnal view-guru-rekap-jurnal"` dan tetap dikenali secara sempurna oleh langkah tur lama maupun baru.

2. **Pendekatan B: Harmonisasi Target ID pada `tutorialSteps.ts`**
   Selaraskan properti `targetTourId` pada file definisi langkah (`tutorialSteps.ts`):
   - `guru-step-6-rapor`: Ganti target menjadi `view-gradebook` atau pasang atribut penargetan spesifik `data-tour-tab="rapor"`.
   - `admin-step-2-sistem-blok`: Ganti target menjadi `view-admin-data`.
   - `admin-step-4-analitik`: Ganti target menjadi `view-admin-rekap`.

#### Tabel Rencana Refaktorisasi Test Suite `tests/challenger_m2_tutorial_system.test.ts`:
| Variabel Pengujian | Nilai As-Is (Sebelum Konsolidasi) | Nilai To-Be (Setelah Konsolidasi Fase 4) | Dasar Pertimbangan Teknis |
|---|:---:|:---:|---|
| `TUTORIAL_DATA.length` | 28 Menu | **16 Modul Terpadu** | 6 Guru + 7 Admin + 3 Superadmin = 16 Modul Terkonsolidasi. |
| `guruMenus.length` | 11 – 12 Menu | **6 Modul** | Dashboard, Presensi, Jurnal KBM, Perangkat, Asesmen & Rapor, Informasi. |
| `adminMenus.length` | 14 Menu | **7 Modul** | Dashboard, Verifikasi, Piket, Laporan Kinerja, Kesiswaan, Master Data, Pengaturan Sistem. |
| `superadminMenus.length` | 2 – 3 Menu | **3 Modul Platform** | Overview Platform, Jaringan Sekolah, Akun Dinas Pendidikan. |
| `uniqueIds.size` | 28 Unik | **16 Unik** | Seluruh ID modul tetap unik dan berformat terstandar. |
| `expectedGuruIds` | 11 ID terfragmentasi | 6 ID kanonikal | Mengeliminasi ID warisan (`guru-rekap-jurnal`, `guru-history`, `guru-jurnal-kelas`). |
| `expectedAdminIds` | 14 ID terfragmentasi | 7 ID kanonikal | Mengeliminasi ID warisan (`admin-sistem-blok`, `admin-backup`, `admin-analitik`). |

> **Catatan Forensik Status Test Suite Eksisting:**
> - Seluruh **41 test suite produksi** yang terdaftar pada `package.json` (`npm test`) saat ini berstatus **PASS 100%**.
> - File `tests/challenger_m2_tutorial_system.test.ts` merupakan *standalone challenger test* peninggalan Milestone 2 yang tidak diikutsertakan dalam `npm test`. Saat dieksekusi secara independen (`npx tsx tests/challenger_m2_tutorial_system.test.ts`), pengujian ini mencatatkan 10 kegagalan asersi akibat pergeseran historis (contoh: menu guru membengkak dari 11 menjadi 12 saat penambahan modul kesiswaan wali kelas, dan ekspektasi superadmin 3 vs riil 2).
> - Refaktorisasi pada Fase 4 tidak hanya menyelaraskan tur dengan menu baru 16 modul, tetapi sekaligus memperbaiki 10 kegagalan asersi historis tersebut sehingga file pengujian ini siap dipromosikan ke dalam script `npm test` utama.

---

## 9. KESIMPULAN & REKOMENDASI TINDAK LANJUT

### Kesimpulan:
Audit mendalam terhadap arsitektur navigasi, komponen React, relasi basis data PostgreSQL, dan sistem pengujian aplikasi **SIPJAM** membuktikan bahwa redundansi menu yang ada saat ini (hingga 12 menu pada guru dan 15 menu pada administrator) dapat dirampingkan secara signifikan tanpa mengurangi satu pun fitur atau kapabilitas fungsional sistem.

Dengan menerapkan **7 Klaster Konsolidasi Menu**, sistem navigasi SIPJAM berhasil:
1. **Memangkas Beban Kognitif Pengguna:** Mengurangi jumlah menu sidebar sebesar **40% hingga 60%**, menghadirkan antarmuka bersih yang sesuai dengan kaidah ergonomi *Miller's Law* ($7 \pm 2$).
2. **Menyatukan Alur Kerja Harian (*Connected Workflows*):** Menghubungkan proses input harian, evaluasi riwayat/verifikasi, dan penerbitan laporan dalam satu modul berbasis tab Claymorphism yang intuitif.
3. **Menjamin Kompatibilitas Mundur Mutlak (*Zero Broken Links*):** Menyediakan mekanisme URL Aliasing Router di 3 siklus hidup `AppScreen.tsx` untuk menjaga seluruh tautan bookmark, riwayat peramban, dan notifikasi pesan instan tetap berjalan tanpa hambatan.
4. **Mempertahankan Integritas Penuh Sistem Pengujian:** Merumuskan mitigasi konkret terhadap dependensi selektor `data-tour` dan rencana transisi bertahap untuk sistem tutorial.

### Konfirmasi Kepatuhan & Integritas Kode Sumber:
Sesuai instruksi tugas R2 dan Acceptance Criteria:
- **0 file kode sumber aplikasi (`src/`) dimodifikasi.**
- Seluruh 41 test suites eksisting di basis kode tetap berjalan normal dan lulus 100% (`npm test` = PASS).
- Laporan rekomendasi ini berstatus sebagai **Dokumen Kajian Arsitektural Komprehensif** yang tersimpan di `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`.

### Rekomendasi Tindak Lanjut:
1. **Kajian Tim Pengembang & Pemangku Kepentingan:** Menggunakan dokumen ini sebagai acuan bersama sebelum membuka *pull request* implementasi pada sprint mendatang.
2. **Eksekusi Bertahap Melalui Roadmap:** Memulai implementasi dari Fase 1 (Low-Risk Component Sharing) dan Fase 2 (Tab Merging) di lingkungan *development branch*, sebelum mereorganisasi sidebar pada Fase 3.
3. **Penyelarasan Materi Edukasi Pengguna:** Menyesuaikan video pelatihan dan buku petunjuk sekolah setelah rilis Fase 4 diluncurkan ke server produksi.

---
*Dokumen Laporan Analisis & Rekomendasi Penggabungan Fitur dan Menu SIPJAM — Disusun secara terstruktur, komprehensif, dan berbasis audit empiris kode sumber untuk pengembangan aplikasi yang efisien, modern, andal, dan ramah pengguna.*
