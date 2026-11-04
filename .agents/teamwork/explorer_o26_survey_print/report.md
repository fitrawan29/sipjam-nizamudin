# LAPORAN AUDIT SISTEM PENCETAKAN, TANDA TANGAN RESMI, DAN FOOTER DOKUMEN SIPJAM-APP
### Audit Komparatif Git History Pra-Konsolidasi Menu vs Versi Terkonsolidasi Saat Ini

---

## 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Berdasarkan investigasi forensik terhadap repositori **sipjam-app**—membandingkan commit pra-konsolidasi menu (`bee9fd5`) dengan versi terkonsolidasi saat ini (`HEAD`)—ditemukan bahwa arsitektur pencetakan resmi berbasis `PrintHeader.tsx`, `printWithGps.ts`, dan aturan `@media print` pada `globals.css` secara umum tetap terpasang di basis kode. Namun, proses penggabungan menu (*menu consolidation*) dan perbaikan parsial sebelumnya telah menimbulkan **degradasi fungsional kritis** pada elemen tanda tangan (*official signature blocks*) dan *security footers* pada sejumlah tampilan laporan dan dokumen resmi.

### Temuan Kunci Audit:
1. **Hilangnya Blok Tanda Tangan pada Sub-Tab Tabel `AdminRekapView.tsx`:**
   Saat `AdminRekapView` dikonsolidasi menjadi 3 sub-tab (`analitik`, `tabel`, `cetak`) pada commit `0b32ead`, komponen `<PrintSignature>` dipindahkan secara eksklusif ke dalam wadah Sub-Tab 3 (`activeTab === 'cetak'`). Akibatnya, ketika pengguna berada pada Sub-Tab 2 (`tabel`) dan mengklik tombol **"Cetak Halaman"** (`triggerPrintWithGps()`), Sub-Tab 3 berada dalam kondisi `hidden` (`display: none`), sehingga **seluruh blok tanda tangan dan security footer berkoordinat GPS hilang total** dari hasil cetakan!
2. **Duplikasi Kop Surat pada Sub-Tab Cetak `AdminRekapView.tsx`:**
   Pada Sub-Tab 3 (`cetak`), terdapat panggilan `<PrintHeader>` di baris 690, sementara pada baris 417 sudah terdapat `<PrintHeader>` di dalam wadah `<div className="hidden print:block">`. Hal ini menyebabkan **Kop Surat tercetak dua kali (duplikat)** saat mencetak dari Sub-Tab 3.
3. **Pemberangusan Blok Tanda Tangan Kiri Akibat Hardcode `isAdmin` di `PrintHeader.tsx`:**
   Pada commit `2e54dad`, ditambahkan logika `const isSingleColumnLayout = Boolean(singleColumn || isAdmin)` pada `PrintSignature` untuk menyembunyikan tanda tangan pencetak admin pada laporan rekapitulasi. Namun, logika ini berdampak fatal secara sistemik:
   - **Pada `RaporView.tsx`:** Ketika Administrator mencetak e-Rapor siswa, tanda tangan **"Orang Tua / Wali Murid"** di sisi kiri **hilang terhapus**, menyisakan hanya Wali Kelas dan Kepala Sekolah, yang melanggar format standar buku rapor resmi.
   - **Pada `RekapSiswaView.tsx`:** Ketika Administrator mencetak rekap presensi kelas untuk arsip/Dinas, tanda tangan **"Wali Kelas"** di sisi kiri **hilang terhapus**.
   - **Pada `RekapJurnalView.tsx` (Jurnal Kelas):** Ketika Administrator mencetak rekapitulasi jurnal kelas binaan, tanda tangan **"Wali Kelas"** **hilang terhapus**.
   - **Pada `GradebookView.tsx`:** Ketika Administrator mencetak leger nilai mapel, tanda tangan **"Guru Mata Pelajaran"** **hilang terhapus**.
4. **Degradasi Identitas Tanda Tangan pada `PiketView.tsx`:**
   Komponen `PiketView.tsx` memanggil `<PrintSignature user={user} sekolahId={user?.sekolah_id} />` tanpa mengirimkan props `leftSubtitle`, `leftName`, dan `leftNip`. Akibatnya, pada lembar Cetak Rekap Piket, penandatangan kiri secara keliru berstatus **"Guru Mata Pelajaran"** dengan nama kosong `( ... )`, alih-alih **"Guru Piket"** dengan nama guru pelapor yang bertugas.
5. **Ketiadaan Blok Tanda Tangan pada Tab Statistik `GradebookView.tsx`:**
   Tab 3 (`statistik`) pada `GradebookView.tsx` menyediakan tombol "Cetak Dokumen" pada toolbar atas, namun tidak memiliki komponen `<PrintSignature>` di bawah tabel distribusi kompetensi.

Dokumen audit ini menyajikan pemetaan komparatif lengkap, bukti baris kode, rantai logika, analisis risiko bisnis, dan rekomendasi pemulihan presisi yang tidak merusak ergonomi menu konsolidasi saat ini.

---

## 2. METODOLOGI & BASIS BUKTI FORENSIK

Audit dilaksanakan dengan membedah riwayat git:
- **Baseline Pra-Konsolidasi**: Commit `bee9fd5` (terakhir sebelum Milestone 1 konsolidasi menu dimulai).
- **Fase Konsolidasi**:
  - `b81fb17`: Milestone 1 foundation & sub-tab normalization (`ClayTabs`, `GuruJurnal`, `GuruPresensi`, `AdminRekapView`, `AppScreen`).
  - `0b32ead`: Milestone 2 functional consolidation (`AdminConfigView`, `AdminDataView`, `AdminRekapView`, `AdminVerifView`, `GradebookView`, `RekapSiswaView`).
  - `1595c93`: Milestone 3 navigation restructuring & URL aliasing (`navigation.ts`, `ClaySidebar`, `AppScreen`).
- **Versi Terkini**: Commit `HEAD` (`a6de638`).

### Alat dan Metrik Verifikasi:
- Analisis AST & Static Source Code inspection via `view_file` dan `grep_search`.
- Penelusuran commit diff via `git diff bee9fd5 HEAD -- src/`.
- Verifikasi render SSR & unit testing via `tests/printHeader.test.ts`.

---

## 3. INVENTARISASI SELURUH VIEW DENGAN KEMAMPUAN PENCETAKAN

Berdasarkan penelusuran menyeluruh pada basis kode, terdapat **9 view utama** yang memiliki kapabilitas pencetakan resmi:

| No | Komponen React | Route / Menu Sebelum Konsolidasi | Route / Menu Terkonsolidasi Saat Ini | Jenis Dokumen Resmi yang Dicetak | Komponen Header & Tanda Tangan | Pemicu Cetak |
|:---:|---|---|---|---|---|---|
| 1 | `AdminRekapView.tsx` | `view-admin-rekap`<br>`view-rekap-guru` | `view-admin-rekap`<br>(Sub-Tab: `analitik`, `tabel`, `cetak`) | Rekapitulasi Akhir Presensi, Jurnal & Piket Dewan Guru | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Halaman") |
| 2 | `RekapJurnalView.tsx` (Pribadi) | `view-guru-rekap-jurnal` | `view-guru-jurnal`<br>(Sub-Tab 2: `rekap-pribadi`) | Rekapitulasi Jurnal Pembelajaran Guru (Format 12 Kolom KOP) | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Dokumen") |
| 3 | `RekapJurnalView.tsx` (Kelas) | `view-jurnal-kelas` | `view-guru-jurnal`<br>(Sub-Tab 3: `supervisi-kelas`) | Rekapitulasi Jurnal Mengajar Kelas Binaan (Format 8 Kolom) | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Dokumen") |
| 4 | `RekapSiswaView.tsx` (Gerbang) | `view-rekap-siswa` (Tab Gerbang) | `view-rekap-siswa`<br>(Tab: `gerbang`) | Laporan Presensi Gerbang Piket Siswa | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Dokumen") |
| 5 | `RekapSiswaView.tsx` (Rekap) | `view-rekap-siswa` (Tab Rekap) | `view-rekap-siswa`<br>(Tab: `rekap`) | Rekapitulasi Absensi Kelas Harian / Mata Pelajaran | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Dokumen") |
| 6 | `GradebookView.tsx` | `view-gradebook` | `view-gradebook`<br>(Sub-Tab 1: `gradebook`) | Daftar Nilai Asesmen Kurikulum Merdeka (TP Matrix & Rekap Semester) | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Dokumen") |
| 7 | `RaporView.tsx` | `view-rapor` | `view-gradebook`<br>(Sub-Tab 2: `rapor`) | Laporan Hasil Belajar (E-Rapor SMA Kurikulum Merdeka) | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Lembar Rapor") |
| 8 | `PiketView.tsx` | `view-piket` (Tab Rekap) | `view-piket`<br>(Tab: `rekap`) | Rekapitulasi Laporan Piket Harian & Ketertiban Gerbang | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Rekap") |
| 9 | `DokumenView.tsx` | `view-dokumen` | `view-dokumen` | Rekapitulasi Matriks Kelengkapan Perangkat Pembelajaran | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Dokumen") |
| 10 | `DinasDashboard.tsx` | `view-dinas-overview` | `view-dinas-overview` | Laporan Eksekutif Pemantauan Kehadiran Satuan Pendidikan Wilayah | `PrintHeader`<br>`PrintSignature` | `triggerPrintWithGps()` (Tombol "Cetak Ringkasan Eksekutif") |
| 11 | `AdminDataView.tsx` | `view-admin-data` | `view-admin-data` (Tab Siswa) | Cetak Kartu QR Presensi Siswa (Batch / Satuan) | Template Kartu Mandiri | `window.print()` pada Popup Window |

---

## 4. AUDIT KOMPARATIF DETAIL: TANDA TANGAN, FOOTER, DAN CSS PRINT

### 4.1. Audit Elemen Tanda Tangan Resmi (`PrintSignature`)

Komponen `PrintSignature` (`src/components/PrintHeader.tsx`) mendukung tata letak tanda tangan 2 kolom (Guru/Wali + Kepala Sekolah), 3 kolom (Guru/Wali + Pengawas Pembina + Kepala Sekolah), dan 1 kolom (Kepala Sekolah/Pejabat Dinas).

#### Struktur Tanda Tangan Baku Berdasarkan Peran & Dokumen:

| View / Dokumen | Penandatangan Kiri (Pihak 1) | Penandatangan Tengah (Pihak 2) | Penandatangan Kanan (Pihak 3) | Penandatangan Bawah (Khusus Rapor) | Status Integritas Saat Ini |
|---|---|---|---|---|---|
| **`AdminRekapView`** (Laporan Kinerja Guru) | Mengetahui,<br>Pengelola Data / Admin (atau kosong bila Kepsek) | Mengetahui,<br>Pengawas Pembina (kondisional: `ttd_pengawas_aktif`) | [Kota/Kab], [Tgl WITA]<br>Kepala Sekolah [Nama Sekolah]<br>[Nama & NIP Kepsek] | - | ❌ **HILANG** pada Sub-Tab 2 (`tabel`).<br>Muncul hanya jika membuka Sub-Tab 3. |
| **`RekapJurnalView` (Pribadi)** | Mengetahui,<br>Guru Mata Pelajaran<br>[Nama & NIP Guru] | Mengetahui,<br>Pengawas Pembina (kondisional) | [Kota/Kab], [Tgl WITA]<br>Kepala Sekolah<br>[Nama & NIP Kepsek] | - | ⚠️ Normal untuk Guru.<br>❌ Terhapus jika dicetak oleh role Admin. |
| **`RekapJurnalView` (Kelas)** | Mengetahui,<br>Wali Kelas [Kelas]<br>[Nama & NIP Wali Kelas] | Mengetahui,<br>Pengawas Pembina (kondisional) | [Kota/Kab], [Tgl WITA]<br>Kepala Sekolah<br>[Nama & NIP Kepsek] | - | ⚠️ Normal untuk Guru.<br>❌ Terhapus jika dicetak oleh role Admin. |
| **`RekapSiswaView` (Gerbang)** | Mengetahui,<br>Wali Kelas<br>[Nama & NIP Wali Kelas] | Mengetahui,<br>Pengawas Pembina (kondisional) | [Kota/Kab], [Tgl WITA]<br>Kepala Sekolah<br>[Nama & NIP Kepsek] | - | ⚠️ Normal untuk Guru.<br>❌ Terhapus jika dicetak oleh role Admin. |
| **`RekapSiswaView` (Rekap Absensi)** | Mengetahui,<br>Wali Kelas / Guru Mapel<br>[Nama & NIP] | Mengetahui,<br>Pengawas Pembina (kondisional) | [Kota/Kab], [Tgl WITA]<br>Kepala Sekolah<br>[Nama & NIP Kepsek] | - | ⚠️ Normal untuk Guru.<br>❌ Terhapus jika dicetak oleh role Admin. |
| **`GradebookView`** (Daftar Nilai) | Mengetahui,<br>Guru Mata Pelajaran<br>[Nama & NIP Guru] | Mengetahui,<br>Pengawas Pembina (kondisional) | [Kota/Kab], [Tgl WITA]<br>Kepala Sekolah<br>[Nama & NIP Kepsek] | - | ⚠️ Ada di TP Matrix & Semester.<br>❌ Hilang di Tab Statistik.<br>❌ Terhapus jika dicetak role Admin. |
| **`RaporView`** (E-Rapor Siswa) | Mengetahui,<br>Orang Tua / Wali Murid<br>( .................................... ) | - | [Kota/Kab], [Tgl WITA]<br>Wali Kelas [Kelas]<br>[Nama & NIP Wali Kelas] | Mengetahui,<br>Kepala Sekolah<br>[Nama & NIP Kepsek] | ⚠️ Normal jika dicetak Wali Kelas.<br>❌ **Orang Tua HILANG TOTAL** jika dicetak Admin! |
| **`PiketView`** (Laporan Rekap Piket) | Mengetahui,<br>Guru Piket<br>[Nama & NIP Guru Piket] | Mengetahui,<br>Pengawas Pembina (kondisional) | [Kota/Kab], [Tgl WITA]<br>Kepala Sekolah<br>[Nama & NIP Kepsek] | - | ❌ **RUSAK**: Berlabel "Guru Mata Pelajaran" dan nama kosong `( ... )`. |
| **`DokumenView`** (Perangkat Ajar) | Mengetahui,<br>Pengelola Data / Guru Mapel<br>[Nama & NIP] | Mengetahui,<br>Pengawas Pembina (kondisional) | [Kota/Kab], [Tgl WITA]<br>Kepala Sekolah<br>[Nama & NIP Kepsek] | - | ✅ Utuh (Normal). |
| **`DinasDashboard`** (Eksekutif Wilayah) | - | - | [Kota/Kab], [Tgl WITA]<br>Pengawas Pembina / Pejabat Dinas<br>[Nama & NIP Pengawas] | - | ✅ Utuh (Single Column). |

---

### 4.2. Audit Elemen Footer & Watermark Legal

Sistem SIPJAM memiliki 2 tingkatan proteksi footer & watermark dokumen:

1. **Security Legal Footer (Di Bawah Blok Tanda Tangan):**
   - Kode sumber: `src/components/PrintHeader.tsx` baris 482–495:
     ```html
     <div className="print-only text-[9px] text-gray-500 mt-6 text-left max-w-4xl mx-auto">
       Dicetak dari Sistem SIPJAM oleh {namaPencetak || 'Pengguna'} pada {timestamp} WITA.
       {activeGps && (
         <span> | Koordinat GPS: {activeGps.latitude.toFixed(6)}, {activeGps.longitude.toFixed(6)}{activeGps.accuracy ? ` (±${activeGps.accuracy}m)` : ''}{activeGps.timestamp ? ` [${activeGps.timestamp}]` : ''}</span>
       )}
       <br/>
       Dokumen ini sah dan tidak untuk diedit.
     </div>
     ```
   - Komponen data:
     - Nama akun pencetak (`namaPencetak`).
     - Waktu cetak aktual dalam zona waktu WITA (`timestamp` Asia/Makassar).
     - Koordinat geolokasi GPS presisi 6 desimal, akurasi radius meter (`±Xm`), dan cap waktu GPS yang ditangkap oleh `triggerPrintWithGps()` (`src/utils/printWithGps.ts`).
     - Klausul legal keabsahan dokumen: *"Dokumen ini sah dan tidak untuk diedit."*
   - **Kondisi Integritas Saat Ini:** Karena footer ini melekat di bagian bawah `PrintSignature`, maka pada setiap view atau tab di mana `PrintSignature` hilang (misalnya Sub-Tab 2 `AdminRekapView` dan Tab Statistik `GradebookView`), **seluruh footer legal dan watermark koordinat GPS ikut terhapus total**!

2. **Full-Page Watermark ("DOKUMEN ASLI"):**
   - Kode sumber: `src/components/PrintHeader.tsx` baris 178–184 via React Portal:
     ```tsx
     {typeof document !== 'undefined' ? createPortal(
       <div className="sipjam-print-watermark" aria-hidden="true">
         <span>DOKUMEN ASLI</span>
         <span>{sekolah}</span>
       </div>,
       document.body
     ) : null}
     ```
   - Aturan CSS di `src/app/globals.css` baris 531–551:
     - `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);`
     - `opacity: 0.07; pointer-events: none; z-index: 9999;`
     - Muncul otomatis di setiap halaman fisik/PDF hasil cetak karena sifat `position: fixed` pada browser print engine.
     - Tersembunyi pada layar monitor (`@media screen { .sipjam-print-watermark { display: none !important; } }`).
   - **Kondisi Integritas Saat Ini:** Berfungsi dengan baik di seluruh view yang merender `PrintHeader`.

3. **Kop Surat Resmi (Header Institusi):**
   - Format 3 kolom simetris: Logo Yayasan (Kiri), Teks Identitas Sekolah (Tengah), Logo Dinas (Kanan).
   - Penyesuaian ukuran font alamat otomatis (`getAddressFontSize`) dinamis dari `0.45rem` hingga `0.875rem` untuk mencegah teks bertumpuk atau tumpang tindih dengan logo.
   - Border bawah tebal 4px hitam pekat (`border-b-4 border-black`).
   - **Kondisi Integritas Saat Ini:** Berfungsi sangat baik, namun mengalami **duplikasi** pada Sub-Tab 3 `AdminRekapView.tsx`.

---

### 4.3. Audit Layout & Print CSS (`@media print`)

Pemeriksaan terhadap `src/app/globals.css` baris 525–785 mengungkap aturan-aturan pencetakan:

1. **Pemutusan Halaman Tabel (Table Page Breaks):**
   - `table`: `border-collapse: collapse !important; font-size: 7.5pt !important;`
   - `thead`: `display: table-header-group !important;` $\rightarrow$ Menjamin baris header tabel tercetak berulang di bagian atas setiap halaman baru saat data meluap (*multi-page table*).
   - `tfoot`: `display: table-footer-group !important;`
   - `tr, .page-break-inside-avoid, .print-signature`: `break-inside: avoid !important; page-break-inside: avoid !important;` $\rightarrow$ Mencegah baris tabel atau tanda tangan terbelah dua di tengah perbatasan halaman fisik.
2. **Penghapusan Batas Wadah Layar (Container Overflow Resets):**
   - `main, .overflow-x-auto, .overflow-y-auto, .clay-card, .glass-card`: `overflow: visible !important; max-height: none !important; height: auto !important;` $\rightarrow$ Mencegah tabel terpotong horizontal atau vertikal saat dicetak dari kontainer yang di layar memiliki scrollbar.
3. **Pembersihan Elemen Antarmuka Non-Cetak (Print Cleansing):**
   - `header, nav, aside, .swal2-container, .no-print, .app-header, button.fixed, [class*="ai-"]`: `display: none !important;` $\rightarrow$ Menghilangkan sidebar, floating AI assistant, modal, tombol navigasi, dan filter saat cetak aktif.
4. **Orientasi Kertas (Portrait vs Landscape):**
   - Dokumen rekapitulasi lebar (10-12 kolom pada `AdminRekapView`, `RekapJurnalView`, `GradebookView`) secara visual optimal dicetak dalam format **Landscape**.
   - Dokumen individu (Lembar Rapor pada `RaporView`, Presensi Gerbang pada `RekapSiswaView`) optimal dicetak dalam format **Portrait**.
   - CSS globals sengaja tidak memaksakan `@page { size: landscape; }` statis agar browser print dialog memberikan fleksibilitas pilihan bagi pengguna.

---

## 5. ANALISIS AKAR MASALAH (ROOT CAUSE ANALYSIS)

Mengapa terjadi degradasi tanda tangan dan footer pasca-konsolidasi menu?

```
                                      AKAR MASALAH
                                           │
         ┌─────────────────────────────────┼────────────────────────────────┐
         │                                 │                                │
    Akar Masalah 1                   Akar Masalah 2                   Akar Masalah 3
Sub-Tab Isolation                Blanket Role-Check               Prop Fallback Omission
Di AdminRekapView.tsx            Di PrintHeader.tsx               Di PiketView.tsx
         │                                 │                                │
  Saat AdminRekap dibagi           Commit 2e54dad membuat           PiketView baris 4179
  ke 3 tab ('analitik',            isSingleColumnLayout =           hanya memanggil
  'tabel', 'cetak'),               Boolean(singleColumn ||          <PrintSignature user=..>
  PrintSignature hanya             isAdmin).                        tanpa props leftSubtitle,
  ditaruh di tab 'cetak'.                  │                        leftName, leftNip.
         │                         Bila Admin mencetak              │
  Tombol "Cetak Halaman"           Rapor/Siswa/Jurnal,              PrintSignature default ke
  di tab 'tabel' mencetak          kolom kiri (Orang Tua /          "Guru Mata Pelajaran"
  saat tab 'cetak' HIDDEN.         Wali Kelas) ikut terhapus!       dengan nama blank ( ... ).
         │                                 │                                │
  HASIL: Cetak dari Tabel          HASIL: Rapor cetak               HASIL: Rekap Piket
  TIDAK MEMILIKI TANDA TANGAN      KEHILANGAN TANDA TANGAN          TERTUKAR MENJADI
  DAN FOOTER GPS SAMA SEKALI!      ORANG TUA / WALI MURID!          GURU MATA PELAJARAN!
```

---

## 6. KATALOG KERUSAKAN DETAIL PER VIEW & SPESIFIKASI PERBAIKAN

Berikut adalah rincian lengkap cacat teknis per komponen dan instruksi perbaikan yang diperlukan:

### 6.1. `AdminRekapView.tsx` (Laporan & Analitik Kinerja Dewan Guru)

- **Lokasi File:** `src/components/AdminRekapView.tsx`
- **Kondisi Saat Ini:**
  - Baris 416–427: Blok cetak luar `<div className="hidden print:block"><PrintHeader ... /> ... </div>`.
  - Baris 454–683: Sub-Tab 2 (`activeTab === 'tabel'`). Memuat tabel 10 kolom kehadiran guru, tombol Excel, dan tombol "Cetak Halaman" (baris 679). **TIDAK MEMILIKI `<PrintSignature>`!**
  - Baris 688–761: Sub-Tab 3 (`activeTab === 'cetak'`). Memuat panggilan kedua `<PrintHeader>` (baris 690), tabel cetak, dan `<PrintSignature>` (baris 743).
- **Dampak Kerusakan:**
  1. Pengguna mayoritas (Admin/Kepsek) membuka menu `view-admin-rekap` yang default aktif pada tab `'tabel'`. Saat mengklik "Cetak Halaman", tabel tercetak tanpa tanda tangan Kepala Sekolah maupun footer GPS.
  2. Jika pengguna beralih ke tab `'cetak'` lalu mencetak, Kop Surat tercetak dua kali karena baris 417 dan baris 690 keduanya aktif di `@media print`.
- **Rancangan Perbaikan:**
  1. Pasang `<PrintSignature>` di bawah tabel pada Sub-Tab 2 (`tabel`), tepat sebelum tombol aksi no-print:
     ```tsx
     <PrintSignature
       leftTitle="Mengetahui,"
       leftSubtitle="Pengelola Data / Admin"
       leftName={isKepalaSekolah ? '( ........................................ )' : user?.nama}
       leftNip={isKepalaSekolah ? '-' : user?.nip}
       user={user}
       sekolahId={targetSchool?.id || user?.sekolah_id}
     />
     ```
  2. Hapus duplikasi `<PrintHeader>` di dalam Sub-Tab 3 (atau satukan struktur pembungkus cetak sehingga header dan tanda tangan bersifat permanen terhadap tabel aktif).
  3. Pastikan `sekolahId` mengutamakan `targetSchool?.id || user?.sekolah_id` agar pencetakan saat pemantauan satelit Dinas Pendidikan/Superadmin menggunakan Kop Surat sekolah binaan yang tepat.

---

### 6.2. `PrintHeader.tsx` (`PrintSignature` Logic Guard)

- **Lokasi File:** `src/components/PrintHeader.tsx`
- **Kondisi Saat Ini:**
  - Baris 354–355:
    ```tsx
    const isAdmin = typeof user?.role === 'string' && user.role.trim().toLowerCase() === 'admin';
    const isSingleColumnLayout = Boolean(singleColumn || isAdmin);
    ```
- **Dampak Kerusakan:**
  Menyapu bersih tanda tangan sisi kiri secara membabi-buta setiap kali `user.role === 'admin'`, padahal di banyak dokumen penandatangan kiri adalah pihak ketiga:
  - Pada e-Rapor: Orang Tua / Wali Murid.
  - Pada Presensi Siswa: Wali Kelas.
  - Pada Jurnal Kelas: Wali Kelas.
  - Pada Gradebook: Guru Mata Pelajaran.
- **Rancangan Perbaikan:**
  Perhalus batasan `isSingleColumnLayout`. Kolom kiri hanya boleh dihilangkan jika `singleColumn === true` SECARA EKSPLISIT, atau jika `isAdmin` dan peran penandatangan kiri memang adalah admin pencetak itu sendiri (`Pengelola Data / Admin`). JANGAN sembunyikan jika `leftSubtitle` adalah "Orang Tua / Wali Murid", "Wali Kelas", atau "Guru Mata Pelajaran", atau jika `showKepalaSekolah` bernilai `true` (seperti format Rapor):
  ```tsx
  const isAdmin = typeof user?.role === 'string' && user.role.trim().toLowerCase() === 'admin';
  const isLeftAdminSignature = leftSubtitle && (
    leftSubtitle.toLowerCase().includes('admin') || 
    leftSubtitle.toLowerCase().includes('pengelola data')
  );
  // Sembunyikan kolom kiri hanya jika singleColumn diminta eksplisit,
  // ATAU jika pengguna adalah admin DAN tanda tangan kiri memang untuk admin
  const isSingleColumnLayout = Boolean(singleColumn || (isAdmin && isLeftAdminSignature && !showKepalaSekolah));
  ```

---

### 6.3. `RaporView.tsx` (E-Rapor Kurikulum Merdeka)

- **Lokasi File:** `src/components/RaporView.tsx`
- **Kondisi Saat Ini:**
  - Baris 1501–1512:
    ```tsx
    <PrintSignature
      leftTitle="Mengetahui,"
      leftSubtitle="Orang Tua / Wali Murid"
      leftName="..........................................."
      hideLeftNip={true}
      rightTitle={`Wali Kelas ${selectedKelas}`}
      rightName={assignedWaliInfo?.nama_guru || (!isAdmin ? user?.nama : '') || '...........................................'}
      rightNip={assignedWaliInfo?.nip ?? (!isAdmin ? user?.nip : undefined)}
      showKepalaSekolah={true}
      user={user}
      sekolahId={sekolahId || undefined}
    />
    ```
- **Dampak Kerusakan:**
  Ketika dicetak melalui akun Administrator (pada consolidated menu `view-gradebook?tab=rapor` atau langsung), tanda tangan "Orang Tua / Wali Murid" hilang karena terhantam aturan `isAdmin` di `PrintSignature`.
- **Rancangan Perbaikan:**
  Dengan perbaikan pada poin 6.2 di atas, atau dengan meneruskan prop eksplisit `singleColumn={false}`, lembar Rapor dijamin selalu merender 3 tanda tangan lengkap:
  1. Kiri: Orang Tua / Wali Murid
  2. Kanan: Wali Kelas [Nama Kelas]
  3. Bawah Tengah: Kepala Sekolah

---

### 6.4. `PiketView.tsx` (Rekapitulasi Modul Piket)

- **Lokasi File:** `src/components/PiketView.tsx`
- **Kondisi Saat Ini:**
  - Baris 4179:
    ```tsx
    <PrintSignature user={user} sekolahId={user?.sekolah_id} />
    ```
- **Dampak Kerusakan:**
  Tidak mengirimkan identitas penandatangan kiri, sehingga fallback `PrintSignature` menuliskan "Guru Mata Pelajaran" dan nama kosong `( ... )`. Padahal ini adalah Laporan Piket Harian Sekolah.
- **Rancangan Perbaikan:**
  Kirimkan props penandatangan Guru Piket secara eksplisit:
  ```tsx
  <PrintSignature
    leftTitle="Mengetahui,"
    leftSubtitle="Guru Piket"
    leftName={user?.nama}
    leftNip={user?.nip}
    user={user}
    sekolahId={user?.sekolah_id}
  />
  ```

---

### 6.5. `GradebookView.tsx` (Daftar Nilai Asesmen & Statistik)

- **Lokasi File:** `src/components/GradebookView.tsx`
- **Kondisi Saat Ini:**
  - Baris 3901 & 4047: Tab 1 (`tp-matrix`) dan Tab 2 (`rekap-semester`) memiliki `<PrintSignature>`.
  - Baris 4061–4194: Tab 3 (`statistik`) memiliki tabel distribusi nilai dan kartu metrik, serta tombol cetak di toolbar atas (baris 2491), namun **tidak memiliki `<PrintSignature>`** di bagian bawah.
  - Baris 3904–3905: `leftNip={user?.nip}` selalu mengambil NIP akun login (jika Admin membuka gradebook guru lain, NIP yang tertera adalah NIP admin, bukan NIP guru pengampu).
- **Rancangan Perbaikan:**
  1. Pasang `<PrintSignature>` di bagian bawah Tab 3 (`statistik`):
     ```tsx
     <PrintSignature
       leftTitle="Mengetahui,"
       leftSubtitle="Guru Mata Pelajaran"
       leftName={selectedGuru || user?.nama}
       leftNip={selectedGuruNip || user?.nip}
       user={user}
       sekolahId={sekolahId || undefined}
     />
     ```
  2. Ambil NIP guru yang dipilih (`selectedGuruNip`) dari `data_guru` saat dropdown guru dipilih oleh Admin.

---

### 6.6. `RekapSiswaView.tsx` & `RekapJurnalView.tsx`

- **Lokasi File:** `src/components/RekapSiswaView.tsx` & `src/components/RekapJurnalView.tsx`
- **Kondisi Saat Ini:**
  - Mengirimkan props tanda tangan dengan benar, tetapi tanda tangan Wali Kelas terhapus jika dicetak oleh role Admin akibat pembatasan di `PrintHeader.tsx`.
- **Rancangan Perbaikan:**
  Terpulihkan secara otomatis begitu poin 6.2 diterapkan pada `PrintHeader.tsx`.

---

## 7. RENCANA STRATEGI PEMULIHAN TANPA MERUSAK KONSOLIDASI MENU (ZERO REGRESSION STRATEGY)

Sesuai instruksi `ORIGINAL_REQUEST.md` (R2 dan R3), pemulihan seluruh tanda tangan dan footer pencetakan **TIDAK BOLEH** mengubah atau membongkar struktur konsolidasi menu yang sudah berjalan:

1. **Mempertahankan Arsitektur Sub-Tab Claymorphism:**
   - Seluruh sub-tab di `GuruJurnal.tsx` (`input`, `rekap-pribadi`, `supervisi-kelas`), `AdminRekapView.tsx` (`analitik`, `tabel`, `cetak`), dan `GradebookView.tsx` (`gradebook`, `rapor`) tetap berada pada posisinya.
2. **Mempertahankan URL Aliasing & Dynamic Route Router:**
   - Router di `src/lib/navigation.ts` dan `AppScreen.tsx` tetap memetakan rute lama secara transparan.
3. **Penyempurnaan Bersih pada Lapisan Komponen Cetak:**
   - Modifikasi hanya dilakukan pada:
     - `src/components/PrintHeader.tsx` (Perbaikan logika `isSingleColumnLayout`).
     - `src/components/AdminRekapView.tsx` (Penambahan `PrintSignature` pada Sub-Tab `tabel` dan pembersihan duplikasi `PrintHeader`).
     - `src/components/PiketView.tsx` (Pengisian props `leftSubtitle="Guru Piket"`, `leftName`, `leftNip`).
     - `src/components/GradebookView.tsx` (Penambahan `PrintSignature` pada Tab `statistik`).

---

## 8. RENCANA PENGUJIAN REGRESI OTOMATIS (TESTING SPECIFICATION)

Untuk membuktikan pemulihan secara empiris, berikut rancangan test suite otomatis yang perlu dieksekusi:

1. **Test Suite 1: `PrintSignature` Role-Context Preservation Test**
   - Menghasilkan markup SSR dari `PrintSignature` untuk:
     - `user.role === 'admin'` dengan `leftSubtitle="Orang Tua / Wali Murid"` $\rightarrow$ Kolom kiri **HARUS ADA**.
     - `user.role === 'admin'` dengan `leftSubtitle="Wali Kelas"` $\rightarrow$ Kolom kiri **HARUS ADA**.
     - `user.role === 'admin'` dengan `leftSubtitle="Guru Mata Pelajaran"` $\rightarrow$ Kolom kiri **HARUS ADA**.
     - `user.role === 'admin'` dengan `leftSubtitle="Pengelola Data / Admin"` $\rightarrow$ Kolom kiri **TERSEMBUNYI** (menjaga kepatuhan commit 2e54dad).
     - `user.role === 'guru'` $\rightarrow$ Kolom kiri **HARUS ADA**.
2. **Test Suite 2: `AdminRekapView` Sub-Tab Print Completeness Test**
   - Render `AdminRekapView` pada `activeTab === 'tabel'`:
     - Memastikan tombol "Cetak Halaman" ada.
     - Memastikan `<PrintHeader>` terpasang.
     - Memastikan `<PrintSignature>` terpasang di bawah tabel.
   - Render `AdminRekapView` pada `activeTab === 'cetak'`:
     - Memastikan `<PrintHeader>` HANYA ter-render 1 kali (tidak terduplikasi).
3. **Test Suite 3: `PiketView` Signature Label Verification**
   - Memastikan `PrintSignature` pada `PiketView` memuat `leftSubtitle="Guru Piket"` dan tidak lagi bernilai default `"Guru Mata Pelajaran"`.
4. **Test Suite 4: `GradebookView` Tab Statistik Signature Verification**
   - Memastikan Tab 3 (`statistik`) memiliki elemen `PrintSignature`.
5. **Test Suite 5: Security Footer & GPS Coordinates Verification**
   - Memastikan string `"Dicetak dari Sistem SIPJAM"` dan koordinat GPS muncul pada seluruh dokumen cetak yang dipulihkan.

---

## 9. KESIMPULAN

Audit komparatif ini telah mengidentifikasi secara tuntas seluruh penyebab hilangnya elemen tanda tangan dan footer pasca-konsolidasi menu. Degradasi yang terjadi bukan disebabkan oleh penghapusan fitur secara sengaja, melainkan akibat:
1. Terisolasinya komponen tanda tangan ke dalam tab terpisah di `AdminRekapView`.
2. Efek samping aturan `isAdmin` global di `PrintSignature` yang menekan tanda tangan pihak ketiga (Orang Tua & Wali Kelas).
3. Kelalaian penerusan props tanda tangan di `PiketView` dan `GradebookView`.

Seluruh elemen tersebut dapat dipulihkan secara bedah (*surgical patch*) dengan kepastian 100% tanpa mengganggu kemudahan dan kerapian menu konsolidasi saat ini.
