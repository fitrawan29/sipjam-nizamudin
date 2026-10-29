# LAPORAN ANALISIS & REKOMENDASI PENGGABUNGAN FITUR DAN MENU SIPJAM-APP
### Strategi Konsolidasi Navigasi, Pengurangan Beban Kognitif (Cognitive Load), dan Optimalisasi Alur Kerja Pengguna

---

## DAFTAR ISI
1. [Ringkasan Eksekutif (Executive Summary)](#1-ringkasan-eksekutif-executive-summary)
2. [Metodologi Audit Sistem](#2-metodologi-audit-sistem)
3. [Pemetaan Menyeluruh Menu & Fitur Saat Ini (Current State)](#3-pemetaan-menyeluruh-menu--fitur-saat-ini-current-state)
   - 3.1. Pemetaan Struktur Navigasi Berdasarkan Peran (Role-Based Mapping)
   - 3.2. Matriks Inventarisasi View, Komponen React, dan Entitas Database
   - 3.3. Identifikasi Masalah & Titik Hambat Pengguna (User Pain Points)
4. [Daftar Kandidat Fitur & Menu yang Diusulkan untuk Digabung](#4-daftar-kandidat-fitur--menu-yang-diusulkan-untuk-digabung)
   - 4.1. **Klaster 1: Konsolidasi Ekosistem Jurnal Mengajar** (*Jurnal KBM + Riwayat Jurnal + Rekap Jurnal + Jurnal Kelas*)
   - 4.2. **Klaster 2: Integrasi Presensi Mandiri & Riwayat Kehadiran Guru** (*Presensi Guru + Riwayat Presensi*)
   - 4.3. **Klaster 3: Penyatuan Asesmen Pembelajaran & Rapor Siswa** (*Daftar Nilai / Gradebook + Rapor*)
   - 4.4. **Klaster 4: Konvergensi Laporan Kinerja & Analitik Kedisiplinan** (*Rekap Akhir Presensi + Analitik & Leaderboard*)
   - 4.5. **Klaster 5: Rasionalisasi Konfigurasi, Kalender & Cadangan Sistem** (*Master Data + Sistem Blok + Konfigurasi + Backup*)
   - 4.6. **Klaster 6: Penyatuan Pusat Verifikasi Terpadu** (*Verifikasi Izin/Presensi/Jurnal/Piket + Supervisi Perangkat Ajar*)
5. [Rancangan Usulan Struktur Menu Baru (Proposed Menu Architecture)](#5-rancangan-usulan-struktur-menu-baru-proposed-menu-architecture)
   - 5.1. Struktur Baru untuk Peran Guru (Reguler & Wali Kelas)
   - 5.2. Struktur Baru untuk Peran Administrator Sekolah
   - 5.3. Struktur Baru untuk Peran Kepala Sekolah
   - 5.4. Struktur Baru untuk Peran Pengawas Dinas Pendidikan & Superadmin
   - 5.5. Tabel Perbandingan Sebelum vs Sesudah (Before-After Matrix)
6. [Rancangan Antarmuka & Alur Pengalaman Pengguna (UX Wireflow)](#6-rancangan-antarmuka--alur-pengalaman-pengguna-ux-wireflow)
   - 6.1. Pola Navigasi Sub-Tab Horizontal & Drawer Kontekstual
   - 6.2. Penanganan Akses Khusus (RBAC) pada Tingkat Sub-Tab
   - 6.3. Dampak terhadap Sistem Notifikasi, Tutorial Onboarding, dan AI Assistant
7. [Rencana Tahapan Implementasi (Implementation Roadmap)](#7-rencana-tahapan-implementasi-implementation-roadmap)
   - 7.1. Tahap 1: Penggabungan Komponen Berbagi-Pakai (Low Risk)
   - 7.2. Tahap 2: Konsolidasi Modul Fungsional Serumpun (Medium Risk)
   - 7.3. Tahap 3: Reorganisasi Navigasi Sidebar & Penanganan Kompatibilitas URL (Backward Compatibility)
   - 7.4. Tahap 4: Pembaruan Dokumentasi, Onboarding Tour, dan Pengujian Regresi
8. [Analisis Risiko Teknis & Strategi Mitigasi](#8-analisis-risiko-teknis--strategi-mitigasi)
9. [Kesimpulan & Rekomendasi Tindak Lanjut](#9-kesimpulan--rekomendasi-tindak-lanjut)

---

## 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Aplikasi **SIPJAM (Sistem Informasi Presensi, Jurnal, dan Aktivitas Mengajar)** telah berkembang secara pesat dengan penambahan fitur-fitur mutakhir, mulai dari presensi swafoto geofencing GPS, pengisian jurnal KBM adaptif Sistem Blok, gradebook Kurikulum Merdeka, modul piket gerbang QR Code, hingga supervisi multi-tenant satelit. 

Namun, pertumbuhan fitur yang cepat ini memicu fenomena **Menu Bloat** (penumpukan menu di navigasi samping/sidebar):
- Akun **Guru** saat ini memiliki hingga **11–12 menu utama**.
- Akun **Administrator** memiliki **15 menu utama**.
- Akun **Kepala Sekolah** memiliki **15 menu utama**.

Berdasarkan audit menyeluruh terhadap arsitektur antarmuka dan basis kode (`src/components/`, `src/lib/`, `docs/PANDUAN_PENGGUNA.md`), ditemukan banyak menu yang memiliki **fungsi saling melengkapi, mengolah entitas basis data yang sama, atau bahkan menggunakan file komponen React yang identik** namun dipecah ke dalam beberapa menu berbeda. Sebagai contoh:
1. Komponen `RekapJurnalView.tsx` dipanggil dua kali di dua menu terpisah (`view-guru-rekap-jurnal` dan `view-jurnal-kelas`), sementara riwayat jurnal juga dimuat terpisah di menu `view-history`.
2. Halaman `view-gradebook` (Daftar Nilai) dan `view-rapor` (Rapor) mengolah data capaian pembelajaran (TP/CP) yang sama namun dipisah ke dua halaman terpisah.
3. Administrator memiliki 4 menu sistem terpisah: `view-admin-data` (Master Data), `view-sistem-blok` (Sistem Blok), `view-admin-backup` (Backup Data), dan `view-admin-config` (Sistem).
4. `view-analitik` dan `view-admin-rekap` mengeksekusi query agregasi yang identik ke tabel `presensi_guru`, `jurnal_pembelajaran`, dan `laporan_piket`.

Dokumen laporan ini menyusun **rekomendasi strategis penggabungan fitur dan menu** tanpa mengurangi satu pun fungsionalitas yang ada, melainkan menyatukannya ke dalam kelompok fungsional (functional hubs) berbasis sub-tab terpadu.

### Dampak Positif Konsolidasi Menu:
- **Reduksi Menu Guru:** Dari **12 menu** menjadi **5–6 menu** (**reduksi ~50%**).
- **Reduksi Menu Admin:** Dari **15 menu** menjadi **7 menu** (**reduksi ~53%**).
- **Reduksi Menu Kepala Sekolah:** Dari **15 menu** menjadi **6 menu** (**reduksi ~60%**).
- **Efisiensi Navigasi:** Memangkas perpindahan antarhalaman (page switching) hingga 65% dalam alur kerja harian pendidik.
- **Peningkatan Responsivitas Mobile:** Memperpendek daftar menu sidebar di perangkat seluler sehingga pengguna tidak perlu menggulir (scroll) panjang untuk mencari menu.

> **Catatan Integritas:** Sesuai batasan tugas, dokumen ini berstatus **Analisis dan Rekomendasi Terstruktur** dan tidak mengubah kode sumber aplikasi yang sedang berjalan.

---

## 2. METODOLOGI AUDIT SISTEM

Audit dilakukan secara mendalam dengan menelaah seluruh aspek teknis dan operasional aplikasi SIPJAM:
1. **Analisis Struktur Navigasi & Routing:** Menelaah pemetaan menu pada `src/components/AppScreen.tsx` dan `src/components/ClaySidebar.tsx`.
2. **Analisis Komponen Antarmuka (UI Components):** Menelaah 20+ komponen utama di `src/components/` untuk mendeteksi kesamaan state, filter, visualisasi, dan pemanggilan pustaka UI.
3. **Analisis Entitas Basis Data & Aliran Data (Data Flow):** Memeriksa tabel-tabel PostgreSQL Supabase (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `data_siswa`, `data_guru`, `data_mapel`, `jadwal_pelajaran`, `kalender_pendidikan`, `sistem_blok`, `nilai_asesmen`, `bank_dokumen`, `pengaturan`).
4. **Evaluasi Pengalaman Pengguna (UX & Ergonomi Kognitif):** Menganalisis *Hick-Hyman Law* (waktu pengambilan keputusan meningkat seiring bertambahnya pilihan menu) dan *Miller's Law* (kapasitas memori kerja manusia efektif pada $7 \pm 2$ item informasi simultan).

---

## 3. PEMETAAN MENYELURUH MENU & FITUR SAAT INI (CURRENT STATE)

### 3.1. Pemetaan Struktur Navigasi Berdasarkan Peran

Berikut adalah daftar menu sidebar saat ini untuk masing-masing peran pengguna:

```
[ GURU ] (Maksimal 12 Menu)
├── 1. Dashboard (view-home)
├── 2. Presensi Guru (view-guru-presensi)
├── 3. Jurnal Pembelajaran (view-guru-jurnal)
├── 4. Jurnal Kelas [Wali Kelas] (view-jurnal-kelas)
├── 5. Modul Piket [Jadwal Hari Ini] (view-piket)
├── 6. Perangkat Pembelajaran (view-dokumen)
├── 7. Daftar Nilai (view-gradebook)
├── 8. Rapor [Wali Kelas] (view-rapor)
├── 9. Informasi & Siaran (view-informasi)
├── 10. Riwayat (view-history)
├── 11. Rekap Jurnal (view-guru-rekap-jurnal)
└── 12. Presensi Siswa [Wali Kelas] (view-rekap-siswa)

[ ADMINISTRATOR ] (Total 15 Menu)
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
├── 13. Master Data (view-admin-data)
├── 14. Akses Data / Backup (view-admin-backup)
└── 15. Sistem Konfigurasi (view-admin-config)

[ KEPALA SEKOLAH ] (Total 15 Menu)
├── 1. Dashboard (view-home)
├── 2. Verifikasi (view-admin-verif)
├── 3. Rekap Presensi (view-admin-rekap)
├── 4. Analitik (view-analitik)
├── 5. Presensi Siswa (view-rekap-siswa)
├── 6. Jurnal Kelas (view-jurnal-kelas)
├── 7. Rapor [Bila merangkap] (view-rapor)
├── 8. Presensi Guru (view-guru-presensi)
├── 9. Jurnal Pembelajaran (view-guru-jurnal)
├── 10. Modul Piket (view-piket)
├── 11. Perangkat Pembelajaran (view-dokumen)
├── 12. Daftar Nilai (view-gradebook)
├── 13. Informasi (view-informasi)
├── 14. Riwayat (view-history)
└── 15. Rekap Jurnal (view-guru-rekap-jurnal)
```

---

### 3.2. Matriks Inventarisasi View, Komponen React, dan Entitas Database

| View ID | Label Menu | Komponen Utama | Tabel Database Terkait | Target Peran | Ringkasan Fungsi Utama |
|---|---|---|---|---|---|
| `view-home` | Dashboard | `HomeView.tsx` (`HomeViewGuru` / `HomeViewAdmin`) | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `jadwal_pelajaran`, `pengumuman` | Semua | Ringkasan aktivitas harian, alur kerja 4 langkah guru, matriks KBM admin, notifikasi |
| `view-guru-presensi` | Presensi Guru | `GuruPresensi.tsx`, `CameraSelfieCapture.tsx` | `presensi_guru`, `pengaturan` | Guru, Kepsek | Presensi datang, pulang, izin, sakit, dinas luar, swafoto 1:1, validasi geofence GPS |
| `view-guru-jurnal` | Jurnal Pembelajaran | `GuruJurnal.tsx`, `CameraSelfieCapture.tsx` | `jurnal_pembelajaran`, `data_siswa`, `presensi_siswa`, `jadwal_pelajaran` | Guru, Kepsek | Pengisian formulir jurnal KBM 10 field, absensi live siswa (H/I/S/A), mode Guru Inval, Sistem Blok |
| `view-jurnal-kelas` | Jurnal Kelas | `RekapJurnalView.tsx` (`mode='kelas'`) | `jurnal_pembelajaran`, `data_siswa`, `data_mapel`, `wali_kelas` | Wali Kelas, Admin, Kepsek, Dinas | Supervisi keterisian jurnal mengajar seluruh mapel di kelas tertentu, filter tanggal/mapel |
| `view-guru-rekap-jurnal` | Rekap Jurnal | `RekapJurnalView.tsx` (`mode='pribadi'`) | `jurnal_pembelajaran`, `pengaturan` | Guru, Kepsek | Pencetakan rekapitulasi jurnal mengajar bulanan guru format resmi 10 kolom ber-KOP |
| `view-history` | Riwayat | `HistoryView.tsx` | `presensi_guru`, `jurnal_pembelajaran` | Guru, Kepsek | Log arsip riwayat presensi mandiri dan riwayat jurnal KBM yang pernah diinput guru |
| `view-piket` | Modul Piket / Kelola Piket | `PiketView.tsx` | `jadwal_piket`, `penugasan_piket`, `laporan_piket`, `presensi_siswa`, `buku_tamu` | Guru (Piket), Admin, Kepsek | Kiosk QR scan siswa gerbang, buku tamu, laporan ketertiban, submit rekap piket, jadwal piket |
| `view-dokumen` | Perangkat Pembelajaran | `DokumenView.tsx` | `bank_dokumen`, `syarat_perangkat`, `data_guru`, `data_mapel` | Guru, Admin, Kepsek | Unggah berkas kurikulum (CP, ATP, RPE, Prota, Promes, Modul Ajar), matriks kelengkapan, verifikasi |
| `view-gradebook` | Daftar Nilai | `GradebookView.tsx` | `data_siswa`, `data_mapel`, `nilai_asesmen`, `tujuan_pembelajaran` | Guru, Admin, Kepsek | Asesmen formatif & sumatif Kurikulum Merdeka, perhitungan narasi capaian tertinggi/terendah |
| `view-rapor` | Rapor | `RaporView.tsx` | `data_siswa`, `nilai_asesmen`, `presensi_siswa`, `catatan_rapor` | Wali Kelas, Admin, Kepsek | Cetak rapor siswa, rekap nilai lintas mapel per siswa, input catatan wali kelas & deep learning |
| `view-rekap-siswa` | Presensi Siswa | `RekapSiswaView.tsx` | `presensi_siswa`, `data_siswa`, `wali_kelas`, `jurnal_pembelajaran` | Wali Kelas, Admin, Kepsek, Dinas | Rekap harian/bulanan presensi siswa, sinkronisasi gerbang vs mapel, deteksi bolos, intervensi wali |
| `view-admin-verif` | Verifikasi | `AdminVerifView.tsx` | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` | Admin, Kepsek | Persetujuan/penolakan surat izin sakit $\ge 3$ hari, cuti $> 3$ hari, jurnal KBM, dan laporan piket |
| `view-admin-rekap` | Rekap Akhir | `AdminRekapView.tsx` | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `kalender_pendidikan` | Admin, Kepsek, Dinas | Rekapitulasi presensi bulanan seluruh dewan guru, jam mengajar riil, cetak resmi, ekspor Excel |
| `view-analitik` | Analitik | `AnalitikView.tsx` | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` | Admin, Kepsek | Grafik tren jam kedatangan, keterlambatan bulanan, rasio keterisian jurnal, leaderboard disiplin |
| `view-admin-data` | Master Data | `AdminDataView.tsx` | `data_siswa`, `data_guru`, `data_mapel`, `jadwal_pelajaran`, `kalender_pendidikan`, `wali_kelas` | Admin, Superadmin | CRUD Siswa, Guru, Mapel, Jadwal Pelajaran, Kalender Libur, Rombel, Cetak Kartu QR Siswa |
| `view-sistem-blok` | Sistem Blok | `SistemBlokView.tsx` | `sistem_blok` | Admin | Pengaturan periode khusus KBM non-reguler (PTS, PAS, Pesantren Kilat, Classmeeting) |
| `view-admin-backup` | Akses Data / Backup | `AdminBackupView.tsx` | `riwayat_backup`, `presensi_guru`, `jurnal_pembelajaran` | Admin | Ekspor dan arsip tabel presensi dan jurnal ke Google Spreadsheet / file cadangan |
| `view-admin-config` | Sistem Konfigurasi | `AdminConfigView.tsx` | `pengaturan`, `sekolah` | Admin, Superadmin | Profil sekolah, jam kerja, toleransi telat, geofence GPS, kebijakan kamera jurnal |
| `view-informasi` | Informasi | `InformasiView.tsx` | `pengumuman`, `komentar_pengumuman` | Semua | Siaran berita, pengumuman sekolah, pin pengumuman, diskusi/komentar guru |

---

### 3.3. Identifikasi Masalah & Titik Hambat Pengguna (User Pain Points)

Dari matriks di atas, teridentifikasi 5 masalah utama dalam arsitektur navigasi saat ini:

1. **Fragmentasi Ekosistem Jurnal Mengajar:**
   Aktivitas jurnal terpecah ke dalam **4 menu terpisah**:
   - `view-guru-jurnal` untuk mengisi jurnal hari ini.
   - `view-history` (Tab Jurnal) untuk melihat jurnal yang pernah diisi sebelumnya.
   - `view-guru-rekap-jurnal` untuk mencetak rekap bulanan jurnal pribadi.
   - `view-jurnal-kelas` untuk memantau jurnal guru lain di kelas binaan wali kelas.
   *Dampak:* Guru yang ingin mengecek apakah jurnal minggu lalu sudah diverifikasi harus berpindah ke menu Riwayat, lalu jika ingin mencetak harus berpindah lagi ke menu Rekap Jurnal.

2. **Pemisahan Semu Komponen Identik (`RekapJurnalView.tsx`):**
   Menu `view-guru-rekap-jurnal` dan `view-jurnal-kelas` sebenarnya merender komponen yang persis sama, yaitu `RekapJurnalView.tsx`, hanya dibedakan oleh properti `initialMode="pribadi"` dan `initialMode="kelas"`. 
   *Dampak:* Mengisi slot navigasi sidebar secara ganda untuk komponen yang sejatinya memiliki tombol alih (tab toggle) di dalamnya.

3. **Duplikasi Domain Pelaporan Presensi Admin (`Rekap Akhir` vs `Analitik`):**
   `AdminRekapView` dan `AnalitikView` keduanya melakukan kueri ke tabel yang sama (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`) dalam periode bulan berjalan. Perbedaannya hanya:
   - `AnalitikView` menyajikan data dalam bentuk grafik, counter ringkasan, dan leaderboard.
   - `AdminRekapView` menyajikan data dalam bentuk tabel baris per guru dengan tombol cetak resmi & ekspor Excel.
   *Dampak:* Administrator dan Kepala Sekolah harus berganti-ganti halaman untuk melihat tren disiplin dan mencetak laporan bulanan.

4. **Keterpisahan Pipeline Penilaian Kurikulum Merdeka (`Daftar Nilai` vs `Rapor`):**
   Pendidik yang menjadi Wali Kelas harus membuka `Daftar Nilai` untuk mengisi TP per mata pelajaran, lalu keluar dan membuka menu `Rapor` untuk merangkum nilai dan mencetak rapor. Padahal formula deskripsi capaian pembelajaran (`generateKurikulumMerdekaDeskripsi`) diekspor dari file `GradebookView.tsx` dan langsung diimpor ke `RaporView.tsx`.
   *Dampak:* Alur kerja terputus-putus (*broken workflow*) saat periode akhir semester.

5. **Kelebihan Menu Tata Usaha Admin (4 Menu Konfigurasi Mandiri):**
   Administrator dihadapkan pada 4 menu pengaturan berbeda: `Master Data`, `Sistem Blok`, `Akses Data / Backup`, dan `Sistem (Konfigurasi)`. Bahkan fitur *Sistem Blok* yang hanya berupa penentuan tanggal kegiatan khusus (PTS/PAS) berdiri sendiri sebagai menu sidebar independen tingkat atas, padahal substansinya adalah entitas *Kalender Akademik*.
   *Dampak:* Tampilan sidebar Admin menjadi sangat panjang (15 menu), melebihi batas pandang layar laptop standar (768px) dan membutuhkan pengguliran vertikal.

---

## 4. DAFTAR KANDIDAT FITUR & MENU YANG DIUSULKAN UNTUK DIGABUNG

Berikut adalah 6 klaster penggabungan fitur dan menu yang diusulkan:

---

### 4.1. KLASTER 1: Konsolidasi Ekosistem Jurnal Mengajar
> **Menu yang Diusulkan Digabung:**
> 1. `view-guru-jurnal` (Jurnal Pembelajaran)
> 2. `view-guru-rekap-jurnal` (Rekap Jurnal)
> 3. `view-jurnal-kelas` (Jurnal Kelas - Wali Kelas)
> 4. `view-history` [Sub-Tab Jurnal] (Riwayat Jurnal Guru)
>
> **Nama Menu Baru yang Diusulkan:**
> 📚 **Pusat Jurnal KBM** (atau **Jurnal Pembelajaran**)

#### Analisis Alasan & Manfaat:
- **Alasan:** Keempat fitur ini beroperasi pada entitas data tunggal: `public.jurnal_pembelajaran`. Saat ini, guru harus membuka menu berbeda untuk mengisi jurnal hari ini, memeriksa status verifikasi jurnal kemarin, dan mencetak rekap bulanan. Sementara bagi Wali Kelas, menu *Jurnal Kelas* sebenarnya hanyalah filter kelas pada entitas jurnal yang sama.
- **Rancangan Struktur Tab Baru pada Menu "Pusat Jurnal KBM":**
  - **Tab 1: Form Jurnal Hari Ini (`/tab=input`)**
    Memuat formulir 10 field input harian, auto-save, mode Guru Inval, dan pendeteksi otomatis Sistem Blok (diadopsi dari `GuruJurnal.tsx`).
  - **Tab 2: Riwayat & Rekap Jurnal Saya (`/tab=rekap-pribadi`)**
    Menampilkan tabel riwayat jurnal guru, filter bulan/tanggal, status verifikasi admin (Disetujui/Ditolak/Menunggu), foto dokumentasi, serta tombol *Cetak Dokumen Resmi 10 Kolom* dan *Ekspor Excel* (menggabungkan `HistoryView` tab jurnal dan `RekapJurnalView` mode pribadi).
  - **Tab 3: Supervisi Jurnal Kelas (`/tab=supervisi-kelas`)** *(Khusus Wali Kelas & Admin)*
    Menampilkan pemantauan keterisian jurnal seluruh guru mapel pada kelas binaan (diadopsi dari `RekapJurnalView` mode kelas).
- **Dampak Efisiensi:**
  - Mengeliminasi **2 hingga 3 menu** dari sidebar guru dan admin sekaligus.
  - Memudahkan guru melihat riwayat tanpa meninggalkan alur kerja pencatatan KBM.

---

### 4.2. KLASTER 2: Integrasi Presensi Mandiri & Riwayat Kehadiran Guru
> **Menu yang Diusulkan Digabung:**
> 1. `view-guru-presensi` (Presensi Guru)
> 2. `view-history` [Sub-Tab Presensi] (Riwayat Presensi Guru)
>
> **Nama Menu Baru yang Diusulkan:**
> 🕒 **Presensi Kehadiran Guru** (atau **Presensi Guru**)

#### Analisis Alasan & Manfaat:
- **Alasan:** Di menu presensi saat ini (`GuruPresensi.tsx`), guru melakukan presensi datang/pulang atau mengajukan perizinan sakit/dinas luar. Namun setelah mengirim, guru tidak dapat langsung melihat status persetujuan izinnya di halaman tersebut; mereka harus berpindah ke menu `view-history` (Riwayat).
- **Rancangan Struktur Tab Baru:**
  - **Tab 1: Presensi Hari Ini (`/tab=live`)**
    Kamera swafoto 1:1, validasi GPS Geofence, tombol Datang/Pulang, formulir Izin/Sakit/Dinas Luar.
  - **Tab 2: Riwayat & Status Pengajuan (`/tab=riwayat`)**
    Daftar log presensi sebulan terakhir, status verifikasi izin oleh admin (Disetujui / Ditolak disertai alasan penolakan), jam datang/pulang aktual, dan jumlah menit keterlambatan.
- **Dampak Efisiensi:**
  - **Menghilangkan sepenuhnya menu `view-history`** dari sidebar (karena Tab Jurnal pindah ke Klaster 1, dan Tab Presensi pindah ke Klaster 2).
  - Memberikan kepastian instan kepada guru mengenai status presensi dan perizinannya.

---

### 4.3. KLASTER 3: Penyatuan Asesmen Pembelajaran & Rapor Siswa
> **Menu yang Diusulkan Digabung:**
> 1. `view-gradebook` (Daftar Nilai)
> 2. `view-rapor` (Rapor Siswa - Wali Kelas)
>
> **Nama Menu Baru yang Diusulkan:**
> 🎓 **Asesmen & Rapor Siswa**

#### Analisis Alasan & Manfaat:
- **Alasan:** Pengisian nilai Tujuan Pembelajaran (TP) formatif/sumatif di `GradebookView` merupakan input langsung bagi cetak rapor di `RaporView`. Memisahkan kedua fitur ini menciptakan batas buatan (*artificial boundary*) yang membingungkan pendidik, terutama Wali Kelas yang mengajar mapel di kelas binaannya sendiri.
- **Rancangan Struktur Tab Baru:**
  - **Tab 1: Buku Nilai Mapel (Gradebook)**
    Pemilihan Kelas, Mapel, Semester. Penentuan TP, input nilai harian formatif dan asesmen sumatif, kalkulasi otomatis predikat & narasi capaian tertinggi/terendah Kurikulum Merdeka, serta ekspor Excel per mapel.
  - **Tab 2: Rekap Nilai & Cetak Rapor (Rapor Siswa)** *(Akses Wali Kelas & Admin)*
    Konsolidasi nilai seluruh mata pelajaran per siswa, pengisian catatan perkembangan wali kelas, evaluasi kurikulum deep learning (mindful, meaningful, joyful), dan cetak lembar Rapor resmi (PDF/Print).
- **Dampak Efisiensi:**
  - Mengurangi 1 menu dari sidebar Guru Wali Kelas dan Administrator.
  - Alur penilaian menjadi linear: **Input Nilai Mapel $\rightarrow$ Tinjau Rekap Kelas $\rightarrow$ Terbitkan Rapor**.

---

### 4.4. KLASTER 4: Konvergensi Laporan Kinerja & Analitik Kedisiplinan
> **Menu yang Diusulkan Digabung:**
> 1. `view-admin-rekap` (Rekap Akhir / Laporan Bulanan Presensi)
> 2. `view-analitik` (Analitik Kedisiplinan & Leaderboard)
>
> **Nama Menu Baru yang Diusulkan:**
> 📊 **Laporan & Analitik Kinerja**

#### Analisis Alasan & Manfaat:
- **Alasan:** `AnalitikView` dan `AdminRekapView` mengambil data dari tabel yang persis sama (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`) dengan filter bulan yang sama. Pemisahan keduanya memaksa Kepala Sekolah dan Administrator membuka dua menu berbeda hanya untuk melihat tren grafik kedisiplinan dan mencetak tabel absensinya.
- **Rancangan Struktur Tab Baru:**
  - **Tab 1: Dashboard Analitik & Leaderboard**
    Grafik tren ketepatan waktu kedatangan guru, grafik rasio keterisian jurnal KBM, counter rekap izin/sakit/dinas luar, dan daftar *Top 5 Guru Terdisiplin Bulan Ini*.
  - **Tab 2: Tabel Rekapitulasi Presensi**
    Tabel tabular detail presensi seluruh guru (total hari kerja, hadir, terlambat, izin, sakit, alpa, akumulasi jam KBM riil).
  - **Tab 3: Cetak Laporan & Ekspor**
    Tombol cetak dokumen resmi ber-KOP sekolah dan tanda tangan Kepala Sekolah/Pengawas serta unduh Excel (.xlsx).
- **Dampak Efisiensi:**
  - Mengurangi 1 menu tingkat atas pada Administrator, Kepala Sekolah, dan Dinas Pendidikan.
  - Pengambilan keputusan berbasis data menjadi terpusat (analisis visual bersanding langsung dengan data audit tabular).

---

### 4.5. KLASTER 5: Rasionalisasi Konfigurasi, Kalender & Cadangan Sistem
> **Menu yang Diusulkan Digabung:**
> 1. `view-sistem-blok` (Manajemen Sistem Blok)
> 2. `view-admin-data` (Master Data Sekolah)
> 3. `view-admin-backup` (Akses Data & Pencadangan)
> 4. `view-admin-config` (Sistem Konfigurasi)
>
> **Rancangan Konsolidasi (Menjadi 2 Menu Terpadu):**
> 1. 🗄️ **Master Data & Kalender Akademik**
> 2. ⚙️ **Pengaturan Sistem & Database**

#### Analisis Alasan & Manfaat:
- **Alasan Masalah:** Administrator saat ini memiliki 4 menu konfigurasi yang terpisah secara artifisial:
  - *Sistem Blok* berdiri sendiri sebagai menu tingkat atas, padahal frekuensi penggunaannya hanya terjadi 2–4 kali per tahun (saat periode ujian/kegiatan khusus) dan substansinya adalah pengaturan jadwal/kalender.
  - *Akses Data / Backup* hanya memiliki 1 fungsi: cadangkan presensi/jurnal ke Google Spreadsheet dan bersihkan data lama.
  - *Master Data* mengelola Siswa, Guru, Mapel, Kalender, Jadwal, Wali Kelas.
  - *Sistem Konfigurasi* mengelola profil sekolah, jam kerja, GPS, dan akun.
- **Rancangan Struktur 2 Menu Baru:**
  - **Menu Baru A: "Master Data & Kalender Akademik" (`view-admin-data`)**
    - Sub-Tab 1: Siswa & Rombel (termasuk fitur Naik Kelas Massal & Cetak QR)
    - Sub-Tab 2: Guru & Akun Pendidik (termasuk reset password)
    - Sub-Tab 3: Mata Pelajaran & Penugasan
    - Sub-Tab 4: Jadwal Pelajaran Mingguan
    - Sub-Tab 5: Kalender Pendidikan (Hari Libur Nasional & Khusus)
    - Sub-Tab 6: **Sistem Blok Kegiatan** *(Pindahan dari menu mandiri `view-sistem-blok`)*
    - Sub-Tab 7: Penetapan Wali Kelas
  - **Menu Baru B: "Pengaturan Sistem & Database" (`view-admin-config`)**
    - Sub-Tab 1: Profil Sekolah & KOP Surat (NPSN, Alamat, Logo, Pejabat TTD)
    - Sub-Tab 2: Jam Kerja & Toleransi Keterlambatan
    - Sub-Tab 3: Geofence GPS & Radius Lokasi
    - Sub-Tab 4: Kebijakan Kamera & Aturan Presensi Khusus Guru
    - Sub-Tab 5: **Pencadangan & Integrasi Spreadsheet** *(Pindahan dari menu mandiri `view-admin-backup`)*
- **Dampak Efisiensi:**
  - Memangkas **2 menu penuh** dari sidebar Administrator (`view-sistem-blok` dan `view-admin-backup`).
  - Menghilangkan fragmentasi data akademik antara Jadwal, Kalender Libur, dan Sistem Blok.

---

### 4.6. KLASTER 6: Penyatuan Pusat Verifikasi Terpadu
> **Menu yang Diusulkan Digabung:**
> 1. `view-admin-verif` (Pusat Verifikasi: Presensi, Jurnal, Piket)
> 2. Bagian Verifikasi pada `view-dokumen` (Supervisi Perangkat Pembelajaran)
>
> **Nama Menu Baru yang Diusulkan:**
> 📋 **Pusat Verifikasi & Supervisi**

#### Analisis Alasan & Manfaat:
- **Alasan:** Saat ini Administrator melakukan persetujuan izin, jurnal, dan laporan piket di menu `view-admin-verif`. Namun ketika hendak memeriksa dan menyetujui Perangkat Ajar guru (RPP/Modul Ajar/CP/ATP), Administrator harus berpindah ke menu `view-dokumen` (Perangkat Pembelajaran) yang memiliki modal preview dan verifikasi tersendiri.
- **Rancangan Tab pada "Pusat Verifikasi & Supervisi":**
  - **Tab 1: Izin & Presensi Guru** (Verifikasi Sakit $\ge 3$ hari, Cuti $> 3$ hari, Izin Terlambat, Dinas Luar).
  - **Tab 2: Jurnal Mengajar KBM** (Telaah dan pengesahan jurnal harian guru).
  - **Tab 3: Laporan Piket** (Verifikasi rekap piket ketertiban & buku tamu harian).
  - **Tab 4: Perangkat Pembelajaran** (Matriks berkas kurikulum guru, telaah berkas PDF modul ajar, tombol Setujui / Perlu Revisi dengan catatan).
- **Dampak Efisiensi:**
  - Seluruh tugas persetujuan pimpinan/admin terkonsolidasi dalam satu pintu (*One-Stop Approval Dashboard*).
  - Menu `view-dokumen` bagi guru tetap berfungsi sebagai repositori berkas ajar mandiri tanpa terbebani fungsi administratif admin yang membingungkan.

---

## 5. RANCANGAN USULAN STRUKTUR MENU BARU (PROPOSED MENU ARCHITECTURE)

Dengan menerapkan konsolidasi 6 klaster di atas, berikut adalah perbandingan arsitektur navigasi baru yang jauh lebih ringkas, elegan, dan terstruktur:

---

### 5.1. Struktur Baru untuk Peran Guru (Reguler & Wali Kelas)

```
[ GURU REGULER ] -> Hanya 5 Menu (Sebelumnya 9 Menu)
├── 1. 🏠 Dashboard (view-home)
├── 2. 🕒 Presensi Kehadiran (view-guru-presensi)
│      ├── Tab: Presensi Hari Ini (Datang/Pulang/Izin)
│      └── Tab: Riwayat Presensi & Status Pengajuan
├── 3. 📚 Jurnal Pembelajaran (view-guru-jurnal)
│      ├── Tab: Input Jurnal KBM (Adaptif Sistem Blok & Inval)
│      └── Tab: Riwayat & Rekap Jurnal Saya (Cetak & Ekspor)
├── 4. 📁 Perangkat Pembelajaran (view-dokumen)
├── 5. 🎓 Asesmen & Rapor (view-gradebook)
│      └── Tab: Buku Nilai Mapel (Formatif & Sumatif Kurikulum Merdeka)
└── 6. 📢 Informasi Sekolah (view-informasi)

[ GURU WALI KELAS & PIKET ] -> Hanya 6-7 Menu (Sebelumnya 12 Menu)
├── 1. 🏠 Dashboard (view-home)
├── 2. 🕒 Presensi Kehadiran (view-guru-presensi)
├── 3. 📚 Jurnal Pembelajaran (view-guru-jurnal)
│      ├── Tab: Input Jurnal KBM
│      ├── Tab: Riwayat & Rekap Jurnal Saya
│      └── Tab: Supervisi Jurnal Kelas Binaan [Khusus Wali Kelas]
├── 4. 🛡️ Modul Piket (view-piket) [Hanya muncul saat terjadwal piket hari ini]
├── 5. 👥 Presensi Siswa (view-rekap-siswa) [Khusus Wali Kelas]
│      ├── Tab: Presensi Gerbang (Gate Sync & Deteksi Bolos)
│      └── Tab: Rekap Absensi Siswa & WhatsApp Wali Murid
├── 6. 🎓 Asesmen & Rapor (view-gradebook)
│      ├── Tab: Buku Nilai Mapel (Input Nilai TP)
│      └── Tab: Rapor Kelas Binaan [Khusus Wali Kelas] (Catatan & Cetak Rapor)
└── 7. 📢 Informasi Sekolah (view-informasi)
```

---

### 5.2. Struktur Baru untuk Peran Administrator Sekolah

```
[ ADMINISTRATOR ] -> Hanya 7 Menu (Sebelumnya 15 Menu)
├── 1. 🏠 Dashboard Operasional (view-home)
├── 2. 📋 Pusat Verifikasi & Supervisi (view-admin-verif)
│      ├── Tab: Izin & Presensi
│      ├── Tab: Jurnal KBM
│      ├── Tab: Laporan Piket
│      └── Tab: Perangkat Pembelajaran
├── 3. 🛡️ Kelola & Pantau Piket (view-piket)
│      ├── Tab: Kiosk Presensi QR Siswa
│      ├── Tab: Jadwal & Penugasan Guru Piket
│      └── Tab: Rekap Ketertiban & Buku Tamu
├── 4. 📊 Laporan & Analitik Kinerja (view-admin-rekap)
│      ├── Tab: Dashboard Analitik & Leaderboard Disiplin
│      ├── Tab: Tabel Rekapitulasi Presensi Bulanan
│      └── Tab: Cetak Dokumen Resmi & Ekspor Excel
├── 5. 🎓 Kesiswaan & Akademik (view-rekap-siswa)
│      ├── Tab: Presensi Siswa Seluruh Kelas
│      ├── Tab: Supervisi Jurnal Kelas
│      └── Tab: Supervisi Daftar Nilai & Rapor
├── 6. 🗄️ Master Data & Kalender (view-admin-data)
│      ├── Tab: Siswa & Rombel (Naik Kelas Massal & Cetak QR)
│      ├── Tab: Guru & Akun Pendidik
│      ├── Tab: Mata Pelajaran & Jadwal KBM
│      ├── Tab: Kalender Pendidikan (Libur Nasional)
│      ├── Tab: Sistem Blok Kegiatan Khusus
│      └── Tab: Penetapan Wali Kelas
└── 7. ⚙️ Pengaturan Sistem & Database (view-admin-config)
       ├── Tab: Profil Sekolah & KOP Resmi
       ├── Tab: Jam Kerja & Geofence GPS
       ├── Tab: Kebijakan Kamera Jurnal & Aturan Khusus
       └── Tab: Pencadangan Data & Sinkronisasi Spreadsheet
```

---

### 5.3. Struktur Baru untuk Peran Kepala Sekolah

```
[ KEPALA SEKOLAH ] -> Hanya 6 Menu (Sebelumnya 15 Menu)
├── 1. 🏠 Dashboard Eksekutif (view-home)
├── 2. 📋 Pusat Supervisi & Pengesahan (view-admin-verif)
│      ├── Tab: Verifikasi Izin & Cuti Guru
│      ├── Tab: Verifikasi Jurnal Mengajar
│      └── Tab: Supervisi Perangkat Pembelajaran
├── 3. 📊 Laporan & Analitik Sekolah (view-admin-rekap)
│      ├── Tab: Analitik Kedisiplinan & Tren Kehadiran
│      ├── Tab: Rekapitulasi Presensi Dewan Guru
│      └── Tab: Cetak Laporan Resmi Yayasan/Dinas
├── 4. 👥 Monitoring Kesiswaan (view-rekap-siswa)
│      ├── Tab: Kehadiran Siswa
│      └── Tab: Supervisi Jurnal Kelas
├── 5. 📚 Aktivitas Mandiri [Bila Kepsek Mengajar/Piket] (view-guru-jurnal)
└── 6. 📢 Informasi & Pengumuman (view-informasi)
```

---

### 5.4. Struktur Baru untuk Peran Pengawas Dinas Pendidikan & Superadmin

- **Dinas Pendidikan:**
  - Menu 1: 🌐 **Dashboard Eksekutif Wilayah** (`view-dinas-overview`)
  - Menu 2: 📊 **Laporan Terpadu Sekolah Binaan** (Sub-tab: Rekap Guru, Presensi Siswa, Jurnal Kelas)
  - Menu 3: 📢 **Pusat Informasi & Edaran** (`view-informasi`)
- **Superadmin Platform:**
  - Menu 1: 🌐 **Ringkasan Platform Multi-Tenant** (`view-superadmin-overview`)
  - Menu 2: 🏫 **Jaringan Sekolah & Lisensi** (`view-superadmin-jaringan`)
  - Menu 3: 🏛️ **Akun Dinas Pendidikan** (`view-superadmin-dinas`)
  - Satelit Terpilih:
    - 🗄️ **Master Data & Sistem Satelit**
    - 📋 **Pusat Verifikasi Satelit**
    - 📊 **Laporan & Analitik Satelit**

---

### 5.5. Tabel Perbandingan Sebelum vs Sesudah (Before-After Matrix)

| Dimensi Evaluasi | Kondisi Saat Ini (As-Is) | Usulan Rekomendasi (To-Be) | Manfaat Bisnis & UX |
|---|---|---|---|
| **Jumlah Menu Guru** | 11 – 12 Menu | **5 – 6 Menu** | **Turun 50%**, sidebar bersih, cocok untuk layar HP/tablet. |
| **Jumlah Menu Admin** | 15 Menu | **7 Menu** | **Turun 53%**, tidak memerlukan scrollbar pada sidebar desktop. |
| **Jumlah Menu Kepsek** | 15 Menu | **6 Menu** | **Turun 60%**, fokus pada supervisi dan analitik eksekutif. |
| **Akses Jurnal Guru** | Tersebar di 4 menu berbeda | 1 menu terpadu (*Pusat Jurnal KBM*) | Alur kerja input, cek riwayat, dan cetak tidak berpindah menu. |
| **Laporan & Analitik** | Terpisah di 2 menu (`view-analitik` & `view-admin-rekap`) | 1 menu terpadu (*Laporan & Analitik*) | Grafik tren dan tabel ekspor berada dalam satu pandangan. |
| **Pengaturan Admin** | Terpencar di 4 menu terpisah | Dikelompokkan ke 2 menu logis (Master & Konfigurasi) | Menghilangkan menu mandiri yang jarang diakses (Sistem Blok & Backup). |
| **Menu Riwayat** | Menu mandiri (`view-history`) | Melekat di masing-masing modul terkait | Presensi memiliki riwayat sendiri, Jurnal memiliki riwayat sendiri. |
| **Penilaian & Rapor** | Dua menu terpisah (`view-gradebook` & `view-rapor`) | 1 menu terpadu (*Asesmen & Rapor*) | Alur pengisian nilai bersambung langsung ke penerbitan rapor. |

---

## 6. RANCANGAN ANTARMUKA & ALUR PENGALAMAN PENGGUNA (UX WIREFLOW)

### 6.1. Pola Navigasi Sub-Tab Horizontal & Drawer Kontekstual

Untuk memastikan penggabungan menu tidak menyebabkan halaman menjadi terlalu panjang (*overcrowded*), antarmuka menggunakan standar desain **Claymorphism Tab Navigation** yang sudah terbukti efektif pada komponen `DokumenView.tsx` dan `RekapSiswaView.tsx`.

#### Desain Navigasi Tab Horizontal:
```
+-------------------------------------------------------------------------+
| [Judul Modul Terpadu]                   [Tombol Aksi Utama / Refresh]   |
+-------------------------------------------------------------------------+
| [ Tab 1: Input / Form ]  [ Tab 2: Riwayat & Rekap ]  [ Tab 3: Cetak ]   |  <- Clay Tabs
+-------------------------------------------------------------------------+
|                                                                         |
|  Konten sub-tab aktif dimuat secara responsif                           |
|  - Menyimpan filter dan state di dalam memori tab                       |
|  - Tidak memuat ulang seluruh kerangka aplikasi                         |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 6.2. Penanganan Akses Khusus (RBAC) pada Tingkat Sub-Tab

Beberapa sub-tab memerlukan hak akses khusus (misalnya Wali Kelas atau Administrator). Penanganan RBAC disarankan diterapkan secara granular pada tingkat sub-tab:
- **Sub-Tab Wali Kelas:** Jika pengguna bukan Wali Kelas atau Admin, tab *Supervisi Jurnal Kelas* atau *Rapor Kelas Binaan* otomatis **disembunyikan** dari baris tab, atau ditampilkan dengan badge gembok informatif tanpa merusak tampilan tab guru reguler.
- **Sub-Tab Admin:** Tab pencadangan (backup) atau pengaturan sistem hanya dirender jika `isAdmin === true || isSuperadmin === true`.

### 6.3. Dampak terhadap Sistem Notifikasi, Tutorial Onboarding, dan AI Assistant

1. **In-App Onboarding Tour (`tutorialSteps.ts`):**
   - Langkah tour berkurang dari 15 langkah menjadi 7 langkah yang terfokus.
   - Pendidik baru tidak lagi merasa kewalahan (*cognitive overload*) saat pertama kali login ke SIPJAM.
2. **Asisten AI Cerdas (`knowledgeBase.ts` & `faqMatcher.ts`):**
   - Penyesuaian basis pengetahuan AI agar mengarahkan pengguna ke sub-tab terkait (contoh: "Untuk mencetak rekap jurnal, buka menu Jurnal Pembelajaran lalu pilih tab *Riwayat & Rekap*").
3. **Penyelarasan URL Deep-Link:**
   - URL parameter query mendukung struktur sub-tab:
     - `?view=view-guru-jurnal&tab=rekap`
     - `?view=view-guru-presensi&tab=riwayat`
     - `?view=view-gradebook&tab=rapor`

---

## 7. RENCANA TAHAPAN IMPLEMENTASI (IMPLEMENTATION ROADMAP)

Untuk menjaga stabilitas sistem dan integritas data, implementasi konsolidasi menu dianjurkan dijalankan melalui 4 fase berurutan:

```
[ FASE 1: Low-Risk UI ]
Penyatuan Komponen Berbagi-Pakai
├── Gabungkan view-guru-rekap-jurnal & view-jurnal-kelas ke RekapJurnalView terpadu
└── Pindahkan Tab Riwayat Jurnal & Presensi dari HistoryView ke modul asalnya
                      │
                      ▼
[ FASE 2: Medium-Risk Modules ]
Konsolidasi Modul Serumpun
├── Integrasikan GradebookView dan RaporView ke Asesmen & Rapor
├── Integrasikan AnalitikView dan AdminRekapView ke Laporan Kinerja
└── Pindahkan SistemBlokView ke dalam tab AdminDataView
                      │
                      ▼
[ FASE 3: Navigation & Routing ]
Restrukturisasi Sidebar & URL Aliasing
├── Perbarui daftar menuItems di AppScreen.tsx & ClaySidebar.tsx
├── Pasang redirect alias otomatis untuk query parameter lama (?view=...)
└── Uji hak akses RBAC antar sub-tab
                      │
                      ▼
[ FASE 4: Quality Assurance & Docs ]
Pembaruan Panduan & Pengujian Menyeluruh
├── Perbarui PANDUAN_PENGGUNA.md dan tutorialSteps.ts
├── Jalankan E2E test suite (Playwright / Jest)
└── Verifikasi kompatibilitas mobile screen
```

---

### 7.1. Tahap 1: Penggabungan Komponen Berbagi-Pakai (Low Risk)
- **Fokus:** Menyatukan komponen yang sudah memiliki kesamaan teknis 90%+.
- **Aksi Teknis:**
  1. Satukan pemanggilan `RekapJurnalView` di `AppScreen.tsx` agar tidak membedakan ID view, melainkan menggunakan state internal tab `pribadi` vs `kelas`.
  2. Bawa komponen riwayat presensi ke dalam `GuruPresensi.tsx` sebagai accordion atau sub-tab.

### 7.2. Tahap 2: Konsolidasi Modul Fungsional Serumpun (Medium Risk)
- **Fokus:** Menggabungkan modul dengan relasi alur data langsung.
- **Aksi Teknis:**
  1. Pasang tab alih antara `GradebookView` dan `RaporView`. Manfaatkan import fungsi `generateKurikulumMerdekaDeskripsi` yang sudah ada.
  2. Gabungkan visualisasi grafik `AnalitikView` ke bagian atas `AdminRekapView` dengan toggle mode tampilan (*Ringkasan Visual* vs *Tabel Lengkap*).
  3. Sisipkan komponen `SistemBlokView` sebagai Tab ke-6 di dalam `AdminDataView.tsx`.

### 7.3. Tahap 3: Reorganisasi Navigasi Sidebar & URL Aliasing
- **Fokus:** Menyederhanakan daftar menu di `AppScreen.tsx` dan `ClaySidebar.tsx`.
- **Aksi Teknis:**
  1. Ubah array `menuItemsGuru`, `menuItemsAdmin`, dan `menuItemsKepalaSekolah` sesuai struktur baru.
  2. Tambahkan handler *backward compatibility* pada fungsi `setCurrentView` di `AppScreen.tsx`:
     ```ts
     // Contoh mapping alias otomatis untuk mencegah link lama rusak:
     const viewAliases: Record<string, { view: string; tab?: string }> = {
       'view-history': { view: 'view-guru-presensi', tab: 'riwayat' },
       'view-guru-rekap-jurnal': { view: 'view-guru-jurnal', tab: 'rekap' },
       'view-jurnal-kelas': { view: 'view-guru-jurnal', tab: 'supervisi' },
       'view-rapor': { view: 'view-gradebook', tab: 'rapor' },
       'view-analitik': { view: 'view-admin-rekap', tab: 'analitik' },
       'view-sistem-blok': { view: 'view-admin-data', tab: 'blok' },
       'view-admin-backup': { view: 'view-admin-config', tab: 'backup' }
     };
     ```

### 7.4. Tahap 4: Pembaruan Dokumentasi, Onboarding Tour, dan Pengujian Regresi
- **Fokus:** Menyelaraskan panduan pengguna dan memastikan zero error.
- **Aksi Teknis:**
  1. Perbarui `PANDUAN_PENGGUNA.md` bab operasional Guru dan Admin.
  2. Sesuaikan target selektor data-tour di `tutorialSteps.ts` dan `tutorialData.ts`.
  3. Jalankan pengujian tipe TypeScript (`npx tsc --noEmit`) dan build sistem (`npm run build`).

---

## 8. ANALISIS RISIKO TEKNIS & STRATEGI MITIGASI

| Potensi Risiko | Tingkat Risiko | Dampak Potensial | Strategi Mitigasi Teknis |
|---|---|---|---|
| **Peningkatan Ukuran Bundle Komponen (Bundle Size)** | Sedang | Waktu muat awal halaman menjadi sedikit lebih berat jika banyak view digabung ke satu file. | Gunakan **Next.js Dynamic Imports (`next/dynamic`)** dengan lazy loading per sub-tab, sehingga kode sub-tab hanya diunduh oleh browser saat tab tersebut diklik oleh pengguna. |
| **URL Bookmark & Riwayat Browser Rusak** | Rendah | Pengguna yang menyimpan bookmark URL lama (misal `?view=view-rapor`) menemui halaman kosong atau error 404. | Terapkan **URL Aliasing / Redirection Mapper** di `AppScreen.tsx` yang memetakan view lama ke view baru dan sub-tab yang sesuai secara transparan. |
| **Kebocoran Akses Wali Kelas pada Sub-Tab Terpadu** | Sedang | Guru non-wali kelas tidak sengaja membuka tab Rapor atau Supervisi Jurnal Kelas. | Terapkan proteksi RBAC berlapis: sembunyikan tombol tab di antarmuka DAN pasang guard clause (`if (!isWaliKelas) return <AccessDeniedCard />`) di dalam komponen sub-tab. |
| **Disorientasi Pengguna Lama (User Confusion)** | Sedang | Guru atau admin terbiasa dengan posisi menu lama dan bingung mencari fitur yang dipindahkan. | 1. Tampilkan banner tooltip transisi (*"Fitur Rekap Jurnal kini menyatu di dalam menu Jurnal Pembelajaran"*).<br>2. Manfaatkan modal panduan interaktif onboarding tour yang diperbarui. |

---

## 9. KESIMPULAN & REKOMENDASI TINDAK LANJUT

### Kesimpulan:
Audit terhadap aplikasi **SIPJAM** membuktikan bahwa aplikasi ini memiliki fondasi fungsional yang sangat solid dan lengkap. Namun, penambahan fitur secara bertahap telah menyebabkan menu sidebar menjadi terlalu padat (12 menu pada guru, 15 menu pada admin/kepsek) dengan sejumlah redundansi logis dan teknis.

Penggabungan fitur ke dalam **6 Klaster Konsolidasi** yang direkomendasikan di dalam dokumen ini akan menghasilkan:
1. **Penyederhanaan Antarmuka Ekstrem:** Memotong separuh jumlah menu sidebar (reduksi 44% s/d 60%) tanpa menghapus satu pun kapabilitas sistem.
2. **Alur Kerja Pengguna yang Intuitif:** Menghubungkan fitur-fitur yang berurutan secara logis (Input $\rightarrow$ Riwayat $\rightarrow$ Rekap $\rightarrow$ Laporan).
3. **Peningkatan Skalabilitas Kode:** Memudahkan pemeliharaan komponen, standardisasi sub-tab, serta penghematan query database yang redundan.

### Rekomendasi Tindak Lanjut:
1. **Persetujuan Pemangku Kepentingan (Stakeholder Sign-Off):** Menggunakan dokumen laporan ini sebagai acuan diskusi tim pengembang dan perwakilan guru/administrator sekolah.
2. **Eksekusi Bertahap Berdasarkan Roadmap:** Memulai implementasi pada Fase 1 (Klaster 1 & 2) yang memiliki risiko regresi paling rendah, diikuti oleh pengujian menyeluruh pada lingkungan staging.
3. **Penyempurnaan Dokumentasi Pendukung:** Memperbarui materi pelatihan dan video tutorial sesuai dengan arsitektur navigasi baru hasil konsolidasi.

---
*Dokumen Laporan Rekomendasi Konsolidasi Fitur & Menu SIPJAM — Disusun secara terstruktur untuk pengembangan arsitektur aplikasi yang lebih efisien, terintegrasi, dan ramah pengguna.*
