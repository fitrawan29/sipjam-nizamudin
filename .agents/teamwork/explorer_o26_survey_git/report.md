# LAPORAN AUDIT KOMPARATIF GIT HISTORY: KONSOLIDASI MENU & FITUR SIPJAM-APP
### Hasil Penyelidikan Explorer 1 (Git History Auditor) — Milestone Survey & Discovery

---

## RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Berdasarkan audit komparatif git history mendalam terhadap repositori `sipjam-app` antara versi sebelum konsolidasi menu (baseline commit: `9dbd26d` / `4f9df9f`, 29 Oktober 2026) dan versi terkini (`HEAD`: `a6de638`, 4 November 2026), proses konsolidasi menu diimplementasikan melalui rangkaian commit **Milestone 1 hingga 4** (`b81fb17` s.d. `ad537b8`) pada 29–30 Oktober 2026.

Meskipun konsolidasi berhasil menyederhanakan jumlah menu sidebar dari 15 menu menjadi 6–8 menu per peran melalui pola *Claymorphism Tab Navigation*, audit ini mengungkap sejumlah **regresi fungsional kritis, pemotongan elemen cetak (tanda tangan & footer), serta pemblokiran aturan bisnis (RBAC lockout)**:
1. **Regresi Tanda Tangan & Footer Cetak (`AdminRekapView.tsx`):** Blok `<PrintSignature>` beserta footer sekuriti GPS dihapus dari Sub-Tab 2 (`activeTab === 'tabel'`). Saat admin/kepsek menekan tombol "Cetak Halaman" pada tabel rekap guru, dokumen tercetak **tanpa tanda tangan dan tanpa footer GPS**. Sementara pada Sub-Tab 3 (`activeTab === 'cetak'`), terjadi pencetakan `<PrintHeader>` ganda (*duplicate kop*).
2. **Hilangnya Riwayat Jurnal Guru & Catatan Verifikasi Admin (`HistoryView.tsx`):** Saat `view-history` dilebur ke dalam `GuruPresensi.tsx`, tab `'jurnal'` pada `HistoryView` dipotong paksa (`onlyTab="presensi"`, `hideTabSwitch={true}`). Di saat bersamaan, `GuruJurnal.tsx` hanya menyematkan `RekapJurnalView.tsx` (tabel bulanan), yang **tidak memiliki tampilan `catatan_admin` (alasan penolakan/revisi jurnal)** dan thumbnail foto kegiatan. Guru tidak lagi dapat melihat feedback penolakan jurnal dari admin.
3. **Pemblokiran Akses Supervisi Kepala Sekolah (RBAC Lockout):** Pada `src/lib/navigation.ts` (`evaluateTabRBAC` baris 181–186), akses ke `view-guru-jurnal?tab=supervisi-kelas` hanya mengizinkan `isWali || isAdmin`. Kepala Sekolah (`user.role === 'kepalasekolah'`) yang sebelumnya berwenang memantau seluruh jurnal kelas binaan kini **terblokir dengan alert "Akses Ditolak"**.
4. **Hilangnya Menu Informasi bagi Administrator:** Menu `view-informasi` dihilangkan sepenuhnya dari daftar navigasi Admin (`menuItemsAdmin` pada `src/lib/navigation.ts`), dan tidak disediakan tombol navigasi alternatif di `HomeViewAdmin.tsx`. Admin sekolah kehilangan akses antarmuka untuk menerbitkan dan mengelola pengumuman.
5. **Pemotongan Akses Pengawas Dinas Pendidikan:** Peran Pengawas Dinas kehilangan akses ke `view-rekap-siswa` (Presensi Siswa) dan `view-jurnal-kelas` (Jurnal Kelas), padahal sub-tab pengganti pada `AdminRekapView` tidak pernah diimplementasikan.
6. **Penyempitan Layout Cetak Dokumen Rekap Jurnal:** `RekapJurnalView.tsx` saat disematkan di dalam `GuruJurnal.tsx` dibungkus dalam kontainer `section.max-w-4xl`. Saat mencetak rekapitulasi jurnal 10/13 kolom dalam orientasi landscape, lebar dokumen terkompresi ke batas 896px dan kolom tabel menyempit tidak wajar.

---

## 1. IDENTIFIKASI COMMIT & KRONOLOGI KONSOLIDASI MENU

### 1.1. Titik Batas Baseline (Sebelum Konsolidasi)
- **Commit Baseline Kode Terakhir:** `9dbd26d` (`dff8850` / `9dbd26d`)
  - **Tanggal:** Kamis, 29 Oktober 2026, 17:58:32 WITA
  - **Kondisi:** Seluruh 24 view mandiri terdaftar pada `src/components/AppScreen.tsx`. Menu sidebar belum mengenal konsep *Sub-Tab Claymorphism* terintegrasi.
- **Commit Dokumentasi Perencanaan:** `a684f1e` s.d. `4f9df9f` (29 Oktober 2026, 18:05–18:52 WITA)
  - Penyusunan dokumen arsitektur: `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`.

### 1.2. Rangkaian Commit Implementasi Konsolidasi (Milestone 1–4)

| No | Commit Hash | Waktu (WITA) | Tipe | Deskripsi Commit | File Utama yang Diubah |
|:---:|:---:|:---:|:---:|---|---|
| 1 | `7aa6afd` | 29 Okt 2026 19:42 | Test | `feat(test): add comprehensive E2E test suite for SIPJAM menu and feature consolidation (Tiers 1-4)` | `tests/navigation_consolidation_verification.test.ts` |
| 2 | **`b81fb17`** | 29 Okt 2026 19:57 | **Feat (M1)** | `feat: complete Milestone 1 foundation and sub-tab normalization across ClayTabs, GuruJurnal, GuruPresensi, AdminRekapView, and AppScreen` | `src/components/ClayTabs.tsx` (baru), `GuruJurnal.tsx`, `GuruPresensi.tsx`, `AdminRekapView.tsx`, `AppScreen.tsx` |
| 3 | **`0b32ead`** | 29 Okt 2026 20:42 | **Feat (M2)** | `feat(consolidation): complete milestone 2 functional consolidation across clusters 3-7 and AppScreen` | `AdminConfigView.tsx`, `AdminDataView.tsx`, `AdminRekapView.tsx`, `AdminVerifView.tsx`, `GradebookView.tsx`, `RekapSiswaView.tsx` |
| 4 | **`1595c93`** | 30 Okt 2026 00:33 | **Feat (M3)** | `feat: complete Milestone 3 navigation restructuring, aliasing, and tour compatibility` | `src/lib/navigation.ts` (baru), `ClaySidebar.tsx`, `AppScreen.tsx` |
| 5 | **`5cc36af`** | 30 Okt 2026 01:05 | **Feat (M4)** | `feat: resolve Tier 5 adversarial hardening gaps (partitioned draft storage, regional scoping, URL sanitization)` | `draftStorage.ts`, `GuruJurnal.tsx`, `AppScreen.tsx`, `navigation.ts` |
| 6 | `ad537b8` | 30 Okt 2026 01:24 | Chore | `chore(teamwork): finalize consolidation metadata and handoff reports` | Metadata teamwork pengesahan swe_39 |

### 1.3. Titik Evaluasi HEAD Saat Ini
- **Commit HEAD:** `a6de638` (Selasa, 4 November 2026, 12:12 WITA)
- Seluruh modifikasi kode konsolidasi menu tetap bertahan dan aktif pada commit `HEAD`.

---

## 2. INVENTARISASI KOMPARATIF STRUKTUR MENU BERDASARKAN PERAN PENGGUNA

### 2.1. Guru Reguler (Pengurangan dari 8 Menu menjadi 6 Menu)

| No | Menu Sebelum Konsolidasi (`9dbd26d`) | View ID Lama | Status di Versi Terkini (`HEAD`) | Wadah / Sub-Tab Terkonsolidasi | Keterangan & Catatan Dampak |
|:---:|---|---|---|---|---|
| 1 | Dashboard | `view-home` | **Tetap** | `view-home` | Menampilkan ringkasan presensi & jadwal harian. |
| 2 | Presensi Guru | `view-guru-presensi` | **Terkonsolidasi** | `view-guru-presensi?tab=live` | Tab 1: Form selfie & geofence presensi live. |
| 3 | Jurnal Pembelajaran | `view-guru-jurnal` | **Terkonsolidasi** | `view-guru-jurnal?tab=input` | Tab 1: Form pengisian KBM harian. |
| 4 | Perangkat Pembelajaran | `view-dokumen` | **Tetap** | `view-dokumen` | Repositori modul ajar / RPP. |
| 5 | Daftar Nilai | `view-gradebook` | **Terkonsolidasi** | `view-gradebook?tab=gradebook` | Tab 1: Penilaian formatif & sumatif TP. |
| 6 | Informasi | `view-informasi` | **Tetap** | `view-informasi` | Feed pengumuman sekolah. |
| 7 | Riwayat | `view-history` | **Dihapus dari Sidebar** | `view-guru-presensi?tab=riwayat` | Sub-Tab 2 di Presensi Guru. **Catatan:** Tab Jurnal pada HistoryView terpotong! |
| 8 | Rekap Jurnal | `view-guru-rekap-jurnal` | **Dihapus dari Sidebar** | `view-guru-jurnal?tab=rekap-pribadi` | Sub-Tab 2 di Jurnal Pembelajaran (RekapJurnalView mode pribadi). |

### 2.2. Guru Wali Kelas (Pengurangan dari 11 Menu menjadi 7 Menu)

| No | Menu Tambahan Wali Kelas (Sebelumnya) | View ID Lama | Status Terkini | Wadah / Sub-Tab Terkonsolidasi | Catatan Dampak |
|:---:|---|---|---|---|---|
| 1 | Jurnal Kelas | `view-jurnal-kelas` | **Dihapus dari Sidebar** | `view-guru-jurnal?tab=supervisi-kelas` | Sub-Tab 3 pada Jurnal Pembelajaran (hanya muncul bagi Wali Kelas/Admin). |
| 2 | Rapor | `view-rapor` | **Dihapus dari Sidebar** | `view-gradebook?tab=rapor` | Sub-Tab 2 pada Asesmen & Rapor (RaporView terintegrasi). |
| 3 | Presensi Siswa | `view-rekap-siswa` | **Tetap sebagai Menu ke-7** | `view-rekap-siswa` | Memiliki 2 sub-tab internal: Tab `'gerbang'` dan Tab `'rekap'`. |

### 2.3. Guru Piket (Maksimal 8 Menu Dinamis)
- Modul Piket (`view-piket`) tetap muncul secara kondisional saat `isPiketHariIni === true` atau peran Admin.

### 2.4. Administrator Sekolah (Pengurangan dari 15 Menu menjadi 8 Menu)

| No | Menu Sebelum Konsolidasi (`9dbd26d`) | View ID Lama | Status di Versi Terkini (`HEAD`) | Posisi / Sub-Tab Baru | Dampak & Masalah yang Ditemukan |
|:---:|---|---|---|---|---|
| 1 | Dashboard | `view-home` | **Tetap** | `view-home` | Dashboard operasional. |
| 2 | Verifikasi | `view-admin-verif` | **Terkonsolidasi** | `view-admin-verif` | Tab: Presensi, Jurnal, Piket, **+ Dokumen** (integrasi DokumenView). |
| 3 | Sistem Blok | `view-sistem-blok` | **Dihapus dari Sidebar** | `view-admin-data?tab=blok` | Dipindahkan menjadi sub-tab di Master Data (`AdminDataView.tsx`). |
| 4 | Jurnal Kelas | `view-jurnal-kelas` | **Dihapus dari Sidebar** | `view-guru-jurnal?tab=supervisi-kelas` | Diakses via alias router atau sub-tab jurnal. |
| 5 | Kelola Piket | `view-piket` | **Tetap** | `view-piket` | Pengelolaan jadwal & laporan piket. |
| 6 | Perangkat Pembelajaran | `view-dokumen` | **Dihapus dari Sidebar Admin** | `view-admin-verif?tab=dokumen` | Admin memantau kurikulum via Pusat Verifikasi. |
| 7 | Daftar Nilai | `view-gradebook` | **Terkonsolidasi** | `view-gradebook?tab=gradebook` | Sub-Tab 1 Buku Nilai. |
| 8 | Rapor | `view-rapor` | **Dihapus dari Sidebar** | `view-gradebook?tab=rapor` | Sub-Tab 2 Rapor Sekolah. |
| 9 | **Informasi** | `view-informasi` | ❌ **HILANG DARI SIDEBAR** | **Tidak ada akses UI** | **Regresi Kritis:** Admin kehilangan menu navigasi untuk mengelola pengumuman sekolah! |
| 10 | Analitik | `view-analitik` | **Dihapus dari Sidebar** | `view-admin-rekap?tab=analitik` | Disederhanakan menjadi Sub-Tab 1 pada AdminRekapView. |
| 11 | Rekap Akhir | `view-admin-rekap` | **Terkonsolidasi** | `view-admin-rekap` | Tab: Analitik, Tabel, Cetak. **Tanda tangan hilang di Tab Tabel!** |
| 12 | Presensi Siswa | `view-rekap-siswa` | **Tetap** | `view-rekap-siswa` | Tab: Gerbang & Rekap. |
| 13 | Master | `view-admin-data` | **Terkonsolidasi** | `view-admin-data` | Menampung data master + Kalender + Sistem Blok. |
| 14 | Akses Data / Backup | `view-admin-backup` | **Dihapus dari Sidebar** | `view-admin-config?tab=backup` | Dipindahkan menjadi Tab 5 di Pengaturan Sistem (`AdminConfigView.tsx`). |
| 15 | Sistem | `view-admin-config` | **Terkonsolidasi** | `view-admin-config` | Tab: Umum, Jam Kerja/GPS, KOP & Pejabat, Kehadiran, Backup. |

### 2.5. Kepala Sekolah (Pengurangan dari 13–15 Menu menjadi 7 Menu)

| No | Menu Sebelum Konsolidasi | Status Terkini | Posisi Baru | Masalah / Regresi |
|:---:|---|---|---|---|
| 1 | Dashboard (`view-home`) | Tetap | `view-home` | Normal. |
| 2 | Verifikasi (`view-admin-verif`) | Tetap | `view-admin-verif` | Normal. |
| 3 | Rekap Presensi (`view-admin-rekap`) | Tetap | `view-admin-rekap` | Tanda tangan hilang saat cetak dari tab tabel. |
| 4 | Analitik (`view-analitik`) | Terkonsolidasi | `view-admin-rekap?tab=analitik` | Normal. |
| 5 | Presensi Siswa (`view-rekap-siswa`) | Tetap | `view-rekap-siswa` | Normal. |
| 6 | Jurnal Kelas (`view-jurnal-kelas`) | Terkonsolidasi | `view-guru-jurnal?tab=supervisi-kelas` | ❌ **TERKUNCI:** Kepsek diblokir oleh `evaluateTabRBAC`! |
| 7 | Presensi Guru (`view-guru-presensi`) | Tetap | `view-guru-presensi` | Normal. |
| 8 | Jurnal Pembelajaran (`view-guru-jurnal`) | Tetap | `view-guru-jurnal` | Normal. |
| 9 | Informasi (`view-informasi`) | Tetap | `view-informasi` | Normal. |
| 10 | Perangkat Ajar, Daftar Nilai, Rapor, Piket, Riwayat, Rekap Jurnal | Dihapus / Terkonsolidasi | Dilebur ke dalam tab modul terkait | Kepsek kehilangan tombol langsung di sidebar. |

### 2.6. Pengawas Dinas Pendidikan (Pengurangan dari 4 Menu menjadi 2 Menu)

| No | Menu Sebelum Konsolidasi | Status Terkini | Kondisi Aktual |
|:---:|---|---|---|
| 1 | Dashboard Eksekutif (`view-dinas-overview`) | **Tetap** | Normal. |
| 2 | Rekap Guru Satelit (`view-rekap-guru`) | Terkonsolidasi ke `view-admin-rekap` | Menampilkan rekap presensi guru sekolah satelit (Read-Only). |
| 3 | **Presensi Siswa Satelit (`view-rekap-siswa`)** | ❌ **HILANG** | Dihapus dari navigasi Dinas, tidak ada sub-tab pengganti. |
| 4 | **Jurnal Kelas Satelit (`view-jurnal-kelas`)** | ❌ **HILANG** | Dihapus dari navigasi Dinas, tidak ada sub-tab pengganti. |

---

## 3. AUDIT MENDALAM: FITUR, ELEMEN CETAK, DAN ATURAN BISNIS YANG HILANG / RUSAK

### 3.1. Audit Elemen Cetak (KOP Header, Tanda Tangan, dan Footer Sekuriti GPS)

#### Kasus 1: `AdminRekapView.tsx` — Hilangnya Blok Tanda Tangan & Footer pada Tab Utama
- **Observasi Kode Sebelum Konsolidasi (`9dbd26d:src/components/AdminRekapView.tsx` baris 453):**
  Sebelum konsolidasi, blok `<PrintSignature>` berada tepat di bawah tabel rekapitulasi guru dan di atas tombol "Cetak Halaman" / "Excel":
  ```tsx
  <PrintSignature
    leftTitle="Mengetahui,"
    leftSubtitle="Pengelola Data / Admin"
    leftName={isKepalaSekolah ? '( ........................................ )' : user?.nama}
    leftNip={isKepalaSekolah ? '-' : user?.nip}
    user={user}
    sekolahId={user?.sekolah_id}
  />
  ```
- **Kondisi Setelah Konsolidasi (`HEAD:src/components/AdminRekapView.tsx`):**
  Pada `b81fb17` dan `0b32ead`, komponen dipecah menjadi 3 sub-tab: `analitik`, `tabel`, dan `cetak`.
  - Pada Sub-Tab 2 (`activeTab === 'tabel'`, baris 485–683), `<PrintSignature>` **DIHAPUS**. Namun tombol `<button onClick={() => triggerPrintWithGps()}>Cetak Halaman</button>` tetap diletakkan di tab ini (baris 680).
  - `<PrintSignature>` hanya dipasang di Sub-Tab 3 (`activeTab === 'cetak'`, baris 743).
- **Dampak Nyata:**
  1. Ketika admin atau kepala sekolah membuka tab Tabel (default view saat menarik rekap) lalu menekan tombol "Cetak Halaman" atau `Ctrl+P`, tabel tercetak **tanpa blok tanda tangan dan tanpa footer koordinat GPS/WITA**.
  2. Jika pengguna beralih ke Sub-Tab 3 (`cetak`), terjadi anomali **Double KOP Surat**: baris 417 (`<div className="hidden print:block"><PrintHeader .../></div>`) tercetak bersamaan dengan baris 690 (`<PrintHeader .../>`), menghasilkan dua KOP surat bertumpuk pada satu lembar dokumen.

#### Kasus 2: `GuruJurnal.tsx` — Penyempitan Batas Lebar Cetak (*Landscape Layout Clipping*)
- **Observasi:**
  Sebelum konsolidasi, `RekapJurnalView.tsx` berdiri sendiri dengan `<section id="view-guru-rekap-jurnal" className="view-section fade-in">` yang melebar penuh 100% pada kertas A4 Landscape.
- **Kondisi Pasca-Konsolidasi:**
  Di dalam `GuruJurnal.tsx` (baris 1162), seluruh view dibungkus oleh:
  `<section id="view-guru-jurnal" className="view-section fade-in max-w-4xl mx-auto space-y-4">`
- **Dampak Nyata:**
  Class `max-w-4xl` (56rem = 896px) tidak di-reset oleh media query cetak `globals.css`. Akibatnya, saat mencetak laporan 10/13 kolom KOP rekap bulanan guru, tabel terkompresi paksa ke lebar 896px alih-alih memanfaatkan lebar penuh kertas cetak landscape.

---

### 3.2. Audit Riwayat Jurnal Guru & Umpan Balik Verifikasi Admin (`HistoryView.tsx`)

- **Observasi Kode Sebelum Konsolidasi:**
  Pada menu `view-history` (`HistoryView.tsx`), terdapat dua tab fungsional:
  1. Tab `'presensi'`: Riwayat kehadiran guru harian, status izin sakit/dinas, dan lampiran surat bukti.
  2. Tab `'jurnal'`: Feed kartu riwayat pengisian KBM guru yang memuat:
     - Badge status verifikasi: "Menunggu", "Disetujui", "Ditolak".
     - Catatan feedback verifikator (`item.catatan_admin`): pesan koreksi dari admin jika jurnal ditolak (misal: "Foto blur", "Materi belum lengkap").
     - Thumbnail foto kegiatan belajar mengajar dengan tautan ke Google Drive.
- **Kondisi Pasca-Konsolidasi:**
  1. Pada `GuruPresensi.tsx` (baris 1128–1134), `HistoryView` dipasang dengan properti:
     `<HistoryView user={user} initialTab="presensi" onlyTab="presensi" hideTabSwitch={true} hideSectionWrapper={true} />`
     Tab `'jurnal'` pada `HistoryView` dimatikan secara total!
  2. Pada `GuruJurnal.tsx` (baris 1806–1820), Sub-Tab 2 (`rekap-pribadi`) menyematkan `RekapJurnalView.tsx`.
     Namun `RekapJurnalView.tsx` adalah tabel agregasi bulanan untuk pencetakan dokumen KOP resmi — file ini **sama sekali tidak memiliki penanganan field `catatan_admin`** (`grep_search` pada `RekapJurnalView.tsx` untuk `catatan_admin` menghasilkan 0 match).
- **Aturan Bisnis yang Hilang:**
  Guru yang jurnal mengajarnya ditolak oleh admin/kepala sekolah **kehilangan akses untuk membaca alasan penolakan (`catatan_admin`)**. Guru tidak mengetahui apa yang harus direvisi sebelum mengajukan ulang jurnal.

---

### 3.3. Audit Hak Akses & Aturan Bisnis RBAC Kepala Sekolah (`src/lib/navigation.ts`)

- **Observasi Kode Sebelum Konsolidasi (`9dbd26d:src/components/AppScreen.tsx`):**
  Sebelum konsolidasi, Kepala Sekolah memiliki menu mandiri `view-jurnal-kelas` (menu ke-6) untuk memantau keterisian materi ajar di setiap rombel.
- **Kondisi Pasca-Konsolidasi:**
  Pada Milestone 3 (`1595c93`), `src/lib/navigation.ts` membuat fungsi keamanan `evaluateTabRBAC`:
  ```ts
  // Cluster 1: Jurnal Mengajar (src/lib/navigation.ts baris 181-186)
  if (viewId === 'view-guru-jurnal' && tabId === 'supervisi-kelas') {
    if (!isWali && !isAdmin) {
      return { allowed: false, fallbackTab: 'input', reason: 'Hanya Wali Kelas & Admin yang dapat mengakses supervisi kelas.' };
    }
  }
  ```
  Pada `src/components/AppScreen.tsx` baris 499:
  ```ts
  const rbacCheck = evaluateTabRBAC(targetId, targetTab || '', { role: user?.role, isWaliKelas });
  if (!rbacCheck.allowed) {
    Swal.fire({
      icon: 'warning',
      title: 'Akses Ditolak',
      text: rbacCheck.reason || 'Anda tidak memiliki hak akses untuk membuka sub-tab ini.',
      confirmButtonColor: '#0B4619'
    });
    return;
  }
  ```
- **Aturan Bisnis yang Rusak:**
  Variabel `isWali` bernilai `false` dan `isAdmin` bernilai `false` untuk user dengan role `kepalasekolah`.
  Meskipun komponen `GuruJurnal.tsx` secara internal mengizinkan (`canAccessSupervisi = isAdmin || isKepalaSekolah ...`), lapisan guard `AppScreen.tsx` memotong navigasi di depan.
  Kepala Sekolah **terkunci di luar modul supervisi kelas binaan** dengan pesan kesalahan *Akses Ditolak*.

---

### 3.4. Audit Pengelolaan Informasi Sekolah oleh Administrator

- **Observasi:**
  Komponen `InformasiView.tsx` baris 33 secara tegas menyatakan:
  `const isAdmin = user?.role === 'Admin';`
  Hanya Administrator yang memiliki wewenang untuk:
  - Membuat pengumuman baru (`showModal`, mode `create`).
  - Mengedit dan menghapus pengumuman (`edit`, `delete`).
  - Menyematkan pengumuman prioritas (*pinning*).
  - Memilih sasaran siaran (*Semua*, *Guru*, *Wali Kelas*, *Orang Tua*).
- **Kondisi Pasca-Konsolidasi:**
  Pada `src/lib/navigation.ts` baris 125–136 (`getConsolidatedMenuItems` untuk `isAdmin`), array menu hanya memuat 8 item. `view-informasi` **dihapus tanpa ada entri menu alternatif**.
  Selain itu, `HomeViewAdmin.tsx` tidak memiliki tombol atau tautan cepat menuju `view-informasi`.
- **Dampak:**
  Fitur publikasi pengumuman sekolah menjadi *orphaned feature* bagi aktor utamanya (Admin).

---

### 3.5. Audit Pengawasan Wilayah oleh Pengawas Dinas Pendidikan

- **Observasi Dokumen Perencanaan (`REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md` Bagian 5.4):**
  Dinas dijadwalkan menerima menu `Laporan Terpadu Satelit` (`view-admin-rekap`) dengan 3 sub-tab:
  1. Rekapitulasi Presensi Dewan Guru (Read-Only)
  2. Presensi Siswa Satelit (Read-Only)
  3. Supervisi Jurnal KBM Kelas (Read-Only)
- **Kondisi Implementasi Nyata:**
  Pengembang Milestone 1 & 2 hanya menyatukan `view-analitik` dan `view-admin-rekap`. Sub-tab untuk Presensi Siswa dan Jurnal Kelas untuk Dinas **tidak pernah diimplementasikan**.
  Sebaliknya, pada Milestone 3, `view-rekap-siswa` dan `view-jurnal-kelas` langsung dihapus dari `menuItemsDinas`.
- **Dampak:**
  Pengawas Dinas kehilangan kemampuan inspeksi kehadiran murid dan pemantauan jurnal di sekolah binaan secara permanen.

---

## 4. MATRIKS INVENTARISASI REKAPITULASI VIEW & KOMPONEN

| View ID Asli | Komponen Utama | Peran Pemilik Asli | Status Konsolidasi | Elemen / Fitur yang Terpotong / Butuh Pemulihan |
|---|---|---|---|---|
| `view-home` | `HomeViewAdmin.tsx` / `HomeViewGuru.tsx` | Semua | Tetap | Tidak ada link pintasan ke `view-informasi` pada `HomeViewAdmin`. |
| `view-guru-presensi` | `GuruPresensi.tsx` | Guru, Kepsek | Menggabungkan `view-history` tab presensi | Berfungsi, namun tab jurnal di `HistoryView` dimatikan total. |
| `view-guru-jurnal` | `GuruJurnal.tsx` | Guru, Kepsek | Menggabungkan `view-guru-rekap-jurnal` & `view-jurnal-kelas` | 1. Tidak menampilkan `catatan_admin` alasan penolakan jurnal.<br>2. Terpotong `max-w-4xl` saat cetak landscape.<br>3. RBAC memblokir Kepala Sekolah pada tab supervisi. |
| `view-guru-rekap-jurnal` | `RekapJurnalView.tsx` (`mode='pribadi'`) | Guru, Kepsek | Dialihkan ke sub-tab `rekap-pribadi` | Tanda tangan dan KOP ada, namun terkurung dalam container sempit `GuruJurnal`. |
| `view-jurnal-kelas` | `RekapJurnalView.tsx` (`mode='kelas'`) | Wali Kelas, Admin, Kepsek, Dinas | Dialihkan ke sub-tab `supervisi-kelas` | Hilang dari Dinas Pendidikan; Terblokir untuk Kepala Sekolah. |
| `view-history` | `HistoryView.tsx` | Guru, Kepsek | Dihapus dari top-level, tab presensi masuk `GuruPresensi` | Tab jurnal kartu riwayat + `catatan_admin` tereliminasi tanpa pengganti. |
| `view-gradebook` | `GradebookView.tsx` | Guru, Admin, Kepsek | Menggabungkan `view-rapor` sebagai sub-tab | Berfungsi baik; Cetak di `tp-matrix` dan `rekap-semester` memiliki PrintSignature. |
| `view-rapor` | `RaporView.tsx` | Wali Kelas, Admin, Kepsek | Dialihkan ke sub-tab `rapor` di `GradebookView` | Cetak KOP & 3 kolom tanda tangan lengkap; Kepsek terblokir di tingkat router jika bukan wali kelas. |
| `view-admin-rekap` | `AdminRekapView.tsx` | Admin, Kepsek, Superadmin, Dinas | Menggabungkan `view-analitik` | ❌ **REGRESI CETAK UTAMA:**<br>1. Sub-Tab `tabel` kehilangan `<PrintSignature>` & security footer GPS saat cetak.<br>2. Sub-Tab `cetak` mencetak KOP surat ganda (*duplicate PrintHeader*). |
| `view-analitik` | `AnalitikView.tsx` | Admin, Kepsek, Superadmin | Dilebur ke dalam tab `analitik` pada `AdminRekapView` | Komponen `AnalitikView.tsx` menjadi file yatim (*orphaned*); logika peringkat disederhanakan di rekap. |
| `view-admin-verif` | `AdminVerifView.tsx` | Admin, Kepsek, Superadmin | Menambah tab `Dokumen` (`DokumenView`) | Berfungsi baik sebagai One-Stop Approval. |
| `view-dokumen` | `DokumenView.tsx` | Guru, Admin, Kepsek | Tetap untuk Guru; Dihapus dari sidebar Admin | Berfungsi; Admin mengakses via tab Dokumen di Verifikasi. |
| `view-admin-data` | `AdminDataView.tsx` | Admin, Superadmin | Menambah tab `sistem_blok` (`SistemBlokView`) | Berfungsi baik; Master data terpusat. |
| `view-sistem-blok` | `SistemBlokView.tsx` | Admin, Superadmin | Dialihkan ke sub-tab Master Data | Berfungsi normal di dalam tab. |
| `view-admin-config` | `AdminConfigView.tsx` | Admin, Superadmin | Menambah tab `backup` (`AdminBackupView`) | Berfungsi baik; Terbagi atas 5 sub-tab Clay. |
| `view-admin-backup` | `AdminBackupView.tsx` | Admin, Superadmin | Dialihkan ke sub-tab Pengaturan Sistem | Berfungsi normal di dalam tab. |
| `view-rekap-siswa` | `RekapSiswaView.tsx` | Wali Kelas, Admin, Kepsek | Tetap (Tab Gerbang & Rekap) | Lengkap dengan PrintHeader dan PrintSignature pada kedua tab. Hilang dari akses Dinas. |
| `view-piket` | `PiketView.tsx` | Guru Piket, Admin, Kepsek | Tetap | Lengkap dengan PrintHeader dan PrintSignature. |
| `view-informasi` | `InformasiView.tsx` | Semua | Dihapus dari sidebar Admin | Admin tidak bisa membuat/mengedit pengumuman dari navigasi utama. |
| `view-dinas-overview` | `DinasDashboard.tsx` | Pengawas Dinas | Tetap | Lengkap dengan KOP dan tanda tangan pengawas. |

---

## 5. KESIMPULAN & REKOMENDASI TINDAK LANJUT UNTUK ARSITEK & IMPLEMENTER

### 5.1. Kesimpulan Temuan Audit
1. **Konsolidasi Berhasil Secara Arsitektur, Mengalami Defisit Pada Detail Implementasi:**
   Pola penggabungan 7 klaster berhasil mereduksi cognitive load dan menghilangkan scrollbar sidebar. Namun, pemindahan komponen ke dalam sub-tab dilakukan tanpa mempertahankan seluruh kelengkapan cetak dan hak akses multi-peran dari versi sebelumnya.
2. **Prioritas Utama Perbaikan Sesuai Permintaan Asli User:**
   - **Pemulihan Tanda Tangan & Footer (`R2`):** Kembalikan `<PrintSignature>` pada Sub-Tab `tabel` di `AdminRekapView.tsx`, hilangkan KOP ganda pada Sub-Tab `cetak`, dan pastikan layout cetak landscape pada `GuruJurnal.tsx` / `RekapJurnalView.tsx` tidak terpotong oleh `max-w-4xl`.
   - **Pemulihan Alasan Penolakan Jurnal Admin (`R1` & `R3`):** Tampilkan `catatan_admin` pada riwayat jurnal guru agar transparansi verifikasi tetap terjaga seperti pada `HistoryView`.
   - **Harmonisasi Akses Kepala Sekolah & Admin (`R3`):** Buka izin `evaluateTabRBAC` agar Kepala Sekolah dapat mengakses `supervisi-kelas` dan kembalikan akses menu / tombol kelola `view-informasi` untuk Administrator.
   - **Pemulihan Hak Pemantauan Satelit Dinas Pendidikan (`R3`):** Kembalikan akses monitoring siswa dan jurnal bagi pengawas wilayah.

---
*Laporan ini disusun secara independen dan objektif oleh Explorer 1 (Git History Auditor) berdasarkan bukti forensik commit git dan kode sumber riil proyek SIPJAM.*
