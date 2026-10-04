# Handoff Report: Survey R3 — Penyesuaian Format Cetak Dokumen Guru & Hapus "Robot" (Kecuali Watermark)

## 1. Observation

### 1.1 Elemen "Robot" dan Floating UI pada Saat Print
1. **Komponen `AIAssistant.tsx` (`src/components/AIAssistant/AIAssistant.tsx`)**:
   - Baris 170–184: Tombol floating AI dirender dengan:
     ```tsx
     <button
       type="button"
       data-tour="ai-assistant-btn"
       aria-label="Buka Asisten AI SIPJAM"
       title="Tanya Asisten AI SIPJAM"
       onClick={() => setIsOpen(prev => !prev)}
       className="fixed bottom-5 right-5 z-[45] w-14 h-14 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white shadow-xl shadow-emerald-900/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-emerald-400/50"
     >
       <i className="fa-solid fa-robot text-2xl text-amber-300 drop-shadow group-hover:rotate-12 transition-transform duration-300"></i>
       <span className="hidden sm:block absolute right-16 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
         🤖 Bantuan AI SIPJAM
       </span>
     </button>
     ```
   - Baris 188–192: Dialog panel chat dirender dengan:
     ```tsx
     {isOpen && (
       <div
         role="dialog"
         aria-label="Panel Asisten AI SIPJAM"
         className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[75vh] h-[480px] z-[45] flex flex-col bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
       >
     ```
   - **Fakta:** Baik tag `<button>` maupun `<div>` modal tersebut sama sekali tidak memiliki class `no-print` atau `print:hidden`.

2. **Aturan CSS `@media print` yang Ada di `src/app/globals.css`**:
   - Baris 311–320:
     ```css
     /* Hide non-printable elements */
     header, nav, aside, .swal2-container, .no-print { display: none !important; }
     #gemini-chat, #antigravity, #sidecar, [class*="ai-"], [id*="ai-"], [id*="gemini-"] { display: none !important; }
     header, nav, aside, .swal2-container, .no-print,
     .app-header, .page-transition > .no-print {
       display: none !important;
       visibility: hidden !important;
       height: 0 !important;
       overflow: hidden !important;
     }
     ```
   - **Penyebab Gagal Sembunyi:**
     - Selector `[class*="ai-"]` hanya mencocokkan elemen yang class-nya mengandung substring `"ai-"`.
     - Class pada button `AIAssistant` adalah `fixed bottom-5 right-5 z-[45] w-14 h-14 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 ...` (tidak ada token yang mengandung `"ai-"`).
     - Komponen memiliki attribute `data-tour="ai-assistant-btn"` dan `aria-label="Buka Asisten AI SIPJAM"`, tetapi selector CSS di `globals.css` tidak menyasar `data-tour` atau `aria-label`.
     - Ikon robot menggunakan class Font Awesome `fa-solid fa-robot` yang juga tidak cocok dengan `[class*="ai-"]`.
     - Akibatnya, tombol robot floating dan chat panel tetap ikut tercetak saat cetak / print preview berlangsung.

3. **Floating UI Lain yang Belum Memiliki `no-print`**:
   - `src/components/TeacherReminderManager.tsx` (baris 327):
     `<div className="fixed bottom-20 left-4 sm:left-6 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-96 ...">` (tidak ada `no-print`).
   - `src/components/Onboarding/OnboardingTutorial.tsx` (baris 314 & 329):
     Spotlight box (`fixed pointer-events-none z-[70] ...`) dan Floating Tooltip Popover Card (tidak ada `no-print`).
   - `src/components/NotificationPermissionModal.tsx` (baris 113):
     `<div className="fixed bottom-4 right-4 z-50 ...">` (tidak ada `no-print`).
   - `src/components/PushNotificationPrompt.tsx` (baris 92):
     `<div className="fixed inset-0 z-[99999] ...">` (tidak ada `no-print`).

---

### 1.2 Watermark Sekolah (Definisi, Render, & Proteksi)
1. **Definisi Watermark di `src/components/PrintHeader.tsx`**:
   - Baris 177–185:
     ```tsx
     {/* Watermark cetak — CSS defined in globals.css, muncul di setiap halaman print */}
     {typeof document !== 'undefined' ? createPortal(
       <div className="sipjam-print-watermark" aria-hidden="true">
         <span>DOKUMEN ASLI</span>
         <span>{sekolah}</span>
       </div>,
       document.body
     ) : null}
     ```
   - Dibuat menggunakan React Portal (`createPortal`) langsung ke `document.body`.

2. **Styling Watermark di `src/app/globals.css`**:
   - Baris 271–291:
     ```css
     /* Watermark — position:fixed repeats on every printed page */
     .sipjam-print-watermark {
       display: flex !important;
       position: fixed;
       top: 50%;
       left: 50%;
       transform: translate(-50%, -50%) rotate(-45deg);
       opacity: 0.07;
       pointer-events: none;
       z-index: 9999;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       text-align: center;
       color: #000;
       white-space: nowrap;
       line-height: 1.2;
       font-weight: 900;
     }
     .sipjam-print-watermark span:first-child { font-size: 5rem; }
     .sipjam-print-watermark span:last-child  { font-size: 3rem; }
     ```
3. **Mekanisme Paged Media & Proteksi**:
   - Sesuai spesifikasi W3C CSS Paged Media, elemen dengan `position: fixed` pada `@media print` akan dirender berulang pada setiap halaman kertas yang dicetak.
   - Karena opacity diset `0.07`, ia tampil samar di latar belakang ("DOKUMEN ASLI" + Nama Sekolah).
   - **Kondisi Kritis:** Jika CSS `@media print` menyembunyikan elemen floating secara global (misal `button.fixed, div.fixed`), kelas `.sipjam-print-watermark` **WAJIB** dikecualikan (`:not(.sipjam-print-watermark)`), jika tidak maka watermark sekolah akan ikut tersembunyi!
   - **Kondisi Porting:** Watermark HANYA ada jika modul merender komponen `<PrintHeader />`. Jika suatu view tidak memanggil `<PrintHeader />`, watermark tidak akan pernah ter-portal ke `document.body`.

---

### 1.3 Perbandingan Format Cetak Dokumen Admin vs Guru

#### A. Dokumen Admin Standar (Benchmark: `AdminRekapView.tsx`)
Struktur cetak Admin yang sudah rapi dan mapan:
1. **Kop Surat Resmi (`<PrintHeader />`)**:
   - Sisi kiri: Logo Yayasan (w-20 h-20, object-contain).
   - Tengah: Nama Yayasan, Nama Sekolah (uppercase bold), Alamat lengkap (dengan container clamp & dynamic font sizing agar muat 1 baris), NPSN.
   - Sisi kanan: Logo Dinas (w-20 h-20, simetris).
   - Garis pemisah ganda (border-b-4 border-black).
2. **Subheader Dokumen Cetak (baris 244–252)**:
   ```tsx
   <div className="text-center my-3 print:my-2">
     <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
       Rekapitulasi Akhir Presensi, Jurnal &amp; Piket Guru
     </h3>
     <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex flex-wrap justify-center gap-3 sm:gap-6 font-medium">
       <span><strong>{formatPeriodHeader(bulan, startDate, endDate)}</strong></span>
       <span>Dicetak Oleh: <strong>{user?.nama || 'Administrator'}</strong></span>
     </div>
   </div>
   ```
3. **Kontrol Orientasi Kertas (`PrintOrientationToggle`)**:
   - Menyuntikkan style `@page { margin: 8mm 10mm; }` (Landscape) atau `12mm 15mm` (Portrait).
4. **Tabel Cetak Standar (baris 335–351)**:
   - Wrapper: `overflow-x-auto w-full my-4 rounded-xl border border-gray-300 dark:border-gray-700 print:border-black print:overflow-visible shadow-sm`.
   - Table: `w-full text-left text-xs border-collapse border border-gray-300 dark:border-gray-700 print:border-black print:text-[8pt]`.
   - Header (`thead tr`): `bg-gray-100 dark:bg-gray-800 ... print:bg-gray-100 print:text-black print:border-black`.
   - Sel (`th`, `td`): `px-2 py-1.5 border border-gray-300 print:border-black text-center font-bold`.
5. **Blok Tanda Tangan (`<PrintSignature />`) (baris 398–403)**:
   - Kolom Kiri: "Mengetahui, Pengelola Data / Admin", Nama, NIP.
   - Kolom Kanan: Kota/Kabupaten & Tanggal, Kepala Sekolah, Nama Kepsek, NIP.
   - Catatan Keamanan Otentisitas: "Dicetak dari Sistem SIPJAM oleh ... pada ... WITA. Dokumen ini sah dan tidak untuk diedit."
6. **Tombol Aksi**:
   - Tombol "Excel" dan "Cetak Halaman" (`window.print()`) dibungkus dalam kontainer berkelas `no-print`.

---

#### B. Dokumen Guru 1: Rekap Jurnal (`RekapJurnalView.tsx`)
Komponen ini sudah memiliki sebagian besar struktur standar, namun terdapat beberapa diskrepansi tata letak dibanding Admin:
1. **Padding Sel Tabel Terlalu Besar**:
   - `AdminRekapView`: Sel memakai `px-2 py-1.5` (4-6px padding).
   - `RekapJurnalView`: Sel memakai `p-2` (8px padding).
   - Pada tabel Jurnal Pribadi (`tabMode === 'pribadi'`) yang memiliki **12 kolom** (No, Hari/Tanggal, TP, KKTP, Konten, Kegiatan, Kelas, Mapel, Absensi Siswa, Lokasi KBM, Foto Dokumentasi, Catatan Refleksi), padding 8px menyebabkan teks terdesak dan terpotong ke bawah secara berlebihan.
2. **Warna Background Header Tabel**:
   - `AdminRekapView`: `print:bg-gray-100`.
   - `RekapJurnalView`: `print:bg-gray-200` (terlihat lebih gelap dan tidak seragam).
3. **Pencetakan Lokasi Geotag Koordinat Mentah**:
   - Pada `tabMode === 'kelas'` baris 662–668:
     ```tsx
     {(j.lokasi || (j.latitude && j.longitude)) && (
       <div className="text-[8px] print:text-[6pt] text-gray-500 ...">
         <i className="fa-solid fa-location-dot text-red-500 text-[8px]"></i>
         <span>{j.lokasi || `${j.latitude?.toFixed(5)}, ${j.longitude?.toFixed(5)}`}</span>
       </div>
     )}
     ```
     Elemen ini tidak diberi `no-print`, sehingga teks koordinat GPS mentah (misal `-5.14321, 119.41234`) ikut tercetak di bawah foto pada rekap cetak kelas.
4. **Nama Penandatangan Wali Kelas Belum Terisi Otomatis**:
   - Baris 835–836:
     ```tsx
     leftName={tabMode === 'kelas' ? '( ........................................ )' : user?.nama}
     leftNip={tabMode === 'kelas' ? '-' : user?.nip}
     ```
     Jika seorang Guru yang bertindak sebagai Wali Kelas membuka dan mencetak Rekap Jurnal Kelas binaannya, namanya tidak muncul (tetap garis titik-titik kosong).

---

#### C. Dokumen Guru 2: Perangkat Pembelajaran (`DokumenView.tsx`) — Kesenjangan Utama (Major Gap)
Komponen `DokumenView.tsx` adalah modul yang **sama sekali belum memiliki integrasi cetak**:
1. **Tidak Ada Kop Surat & Watermark**:
   - Tidak memanggil `<PrintHeader />`, sehingga jika pengguna menekan `Ctrl+P`, Kop Surat tidak ada dan Watermark Sekolah TIDAK MUNCUL.
2. **Tidak Ada Subheader Dokumen Cetak**:
   - Judul dokumen kurikulum dan identitas pengampu tidak ada.
3. **Format Tampilan Masih Berupa Kartu Interaktif Web**:
   - Tab "Dokumen Saya" (`activeTab === 'list'`) menampilkan kartu matriks 6 dokumen kurikulum (`CP`, `ATP`, `RPE`, `Prota`, `Promes`, `RPM`) serta daftar riwayat dokumen dalam bentuk kartu grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
   - Setiap kartu memiliki tombol aksi interaktif ("Unggah", "Lihat", "Buka Berkas", progress bar, badge status, dll.) yang tidak memiliki class `no-print`.
   - Jika dicetak lewat browser, kartu-kartu terbelah di tengah halaman kertas tanpa struktur tabel formal.
4. **Tidak Ada Tabel Cetak Terstruktur**:
   - Berbeda dengan Admin (`AdminRekapView`) yang menampilkan data tabel rapi, guru tidak memiliki layout tabel cetak rekap kelengkapan berkas perangkat pembelajaran.
5. **Tidak Ada Blok Tanda Tangan**:
   - Tidak ada `<PrintSignature />` untuk Guru Pengampu dan Kepala Sekolah.
6. **Tidak Ada Tombol "Cetak Dokumen"**:
   - Guru tidak memiliki tombol print cepat di halaman, hanya bergantung pada shortcut browser `Ctrl+P`.

---

## 2. Logic Chain

```
[Kebutuhan User & R3]
  1. Hapus elemen "robot", tombol floating, panel chat saat print preview / kertas.
  2. Pertahankan watermark sekolah (TIDAK BOLEH hilang saat cetak).
  3. Format cetak dokumen Guru harus rapi dan sama persis dengan format cetak dokumen Admin (header, tabel, margin, font).
          │
          ├── [Elemen Robot / Floating UI]
          │     ├── Observasi: AIAssistant.tsx render tombol floating (ikon fa-robot) & dialog panel
          │     ├── Fakta CSS: globals.css hanya punya selector [class*="ai-"]
          │     ├── Masalah: Button AIAssistant memakai Tailwind (fixed bottom-5 ...) tanpa class "ai-"
          │     └── Solusi:
          │           1. Tambahkan `no-print print:hidden` di AIAssistant.tsx (button & modal)
          │           2. Perbarui globals.css @media print dengan selector spesifik:
          │              `[data-tour="ai-assistant-btn"], [aria-label*="Asisten AI"], .fa-robot, button.fixed, div[class*="fixed"]:not(.sipjam-print-watermark)`
          │
          ├── [Watermark Sekolah]
          │     ├── Observasi: Didefinisikan di PrintHeader.tsx via createPortal(<div className="sipjam-print-watermark">)
          │     ├── Styling: globals.css .sipjam-print-watermark (position: fixed, opacity: 0.07, rotate(-45deg), z-index: 9999)
          │     ├── Paged Media rule: position: fixed pada print otomatis berulang di setiap lembar halaman
          │     └── Kesimpulan Kritis:
          │           1. CSS rules penonaktifan elemen fixed harus memakai `:not(.sipjam-print-watermark)`
          │           2. Setiap tampilan dokumen yang dicetak (termasuk DokumenView.tsx) WAJIB merender <PrintHeader />
          │
          └── [Penyeragaman Dokumen Guru vs Admin]
                ├── Benchmark Admin (AdminRekapView.tsx):
                │     PrintHeader (Kop) -> Subheader -> PrintOrientationToggle -> Table (px-2 py-1.5, bg-gray-100) -> PrintSignature -> Tombol aksi (no-print)
                ├── RekapJurnalView.tsx (Perbaikan minor):
                │     - Ubah padding sel dari p-2 ke px-2 py-1.5 / print:p-1.5
                │     - Ubah header bg dari print:bg-gray-200 ke print:bg-gray-100
                │     - Beri no-print pada koordinat GPS mentah
                │     - Tampilkan nama Wali Kelas di signature jika user adalah Wali Kelas
                └── DokumenView.tsx (Implementasi Cetak Lengkap):
                      - Pasang <PrintHeader user={user} />
                      - Tambahkan Subheader Cetak Dokumen
                      - Tambahkan PrintOrientationToggle & Tombol "Cetak Dokumen"
                      - Beri `no-print` pada semua elemen filter, tab, kartu interaktif web
                      - Buat Tabel Cetak Resmi (Print-Only Table) matriks kelengkapan 6 dokumen kurikulum
                      - Pasang <PrintSignature /> lengkap (Guru & Kepala Sekolah)
```

---

## 3. Caveats
1. **Pemisahan Mode Dokumen di `DokumenView.tsx`**:
   - Modul `DokumenView.tsx` digunakan oleh Admin (tab `matrix` dan `syarat`) dan Guru (tab `list` dan `upload`).
   - Penyesuaian cetak harus mendukung keduanya: saat Guru mencetak, yang keluar adalah tabel rekap perangkat miliknya; saat Admin mencetak, yang keluar adalah tabel matriks dewan guru atau syarat dokumen yang sedang aktif.
2. **Ketergantungan Supabase Config pada `PrintHeader`**:
   - `PrintHeader` dan `PrintSignature` mengambil data nama sekolah, kop yayasan, logo, nama kepala sekolah, dan NIP dari tabel `pengaturan` dan `sekolah`. Parameter `user` dan `sekolahId` harus dioper dengan benar ke komponen tersebut (`<PrintHeader user={user} sekolahId={user?.sekolah_id} />`).
3. **Penyimpanan Foto di Google Drive**:
   - Pada tabel jurnal guru, foto kegiatan berasal dari Google Drive (`getGoogleDriveThumbnailUrl` / `transformGoogleDriveUrl`). Gambar ini memerlukan atribut `loading="eager"` dan penanganan `onError` agar jika internet lambat atau URL bermasalah, gambar tidak merusak tata letak tabel saat dicetak.

---

## 4. Conclusion & Actionable Recommendations

### 4.1 Rekomendasi Solusi Elemen "Robot" & Floating UI
1. **Di `src/components/AIAssistant/AIAssistant.tsx`**:
   - Tambahkan class `no-print print:hidden` pada elemen trigger button (baris 176):
     ```tsx
     className="fixed bottom-5 right-5 z-[45] ... print:hidden no-print"
     ```
   - Tambahkan class `no-print print:hidden` pada chat panel dialog (baris 191):
     ```tsx
     className="fixed bottom-20 right-4 ... print:hidden no-print"
     ```
2. **Di `src/app/globals.css` (`@media print`)**:
   - Perluas selector penyembunyian elemen non-cetak (baris 312–320) dengan aturan berikut:
     ```css
     /* Hide non-printable elements */
     header, nav, aside, .swal2-container, .no-print,
     .app-header, .page-transition > .no-print,
     [data-tour="ai-assistant-btn"],
     [aria-label*="Asisten AI"],
     [role="dialog"][aria-label*="Asisten AI"],
     .fa-robot,
     [data-testid="spotlight-box"],
     [data-testid="tooltip-card"],
     button.fixed,
     div.fixed:not(.sipjam-print-watermark) {
       display: none !important;
       visibility: hidden !important;
       height: 0 !important;
       overflow: hidden !important;
     }
     ```
3. **Di Komponen Floating Lain**:
   - Tambahkan `no-print print:hidden` pada root container di `TeacherReminderManager.tsx`, `OnboardingTutorial.tsx`, `NotificationPermissionModal.tsx`, dan `PushNotificationPrompt.tsx`.

---

### 4.2 Rekomendasi Solusi Watermark Sekolah
1. **Pertahankan Definisi Saat Ini**:
   - Definisi `.sipjam-print-watermark` di `PrintHeader.tsx` (baris 178–184) dan `globals.css` (baris 271–291) sudah tepat menggunakan `position: fixed; opacity: 0.07;`.
2. **Jaminan Pengecualian**:
   - Pastikan setiap aturan CSS yang menyembunyikan elemen `fixed` mengecualikan `.sipjam-print-watermark` menggunakan `:not(.sipjam-print-watermark)`.
3. **Penyembunyian di Layar Layar (Screen Media)**:
   - Tambahkan aturan di `globals.css` agar watermark tidak mengganggu tampilan layar di luar mode cetak:
     ```css
     @media screen {
       .print-only,
       .sipjam-print-watermark {
         display: none !important;
       }
     }
     ```

---

### 4.3 Rekomendasi Penyesuaian Format Cetak Modul Guru

#### A. Penyesuaian di `src/components/DokumenView.tsx`
1. **Import Komponen Cetak**:
   ```tsx
   import { PrintHeader, PrintSignature, PrintOrientationToggle, formatPeriodHeader } from './PrintHeader';
   ```
2. **State Orientasi Cetak**:
   ```tsx
   const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
   ```
3. **Pemasangan Kop Surat & Subheader di Bagian Atas Card**:
   ```tsx
   <PrintHeader user={user} sekolahId={user?.sekolah_id} />
   
   {/* Print Subheader */}
   <div className="hidden print:block text-center my-3 print:my-2">
     <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
       {isAdmin
         ? 'Rekapitulasi Matriks Kelengkapan Perangkat Pembelajaran Dewan Guru'
         : 'Laporan Kelengkapan Perangkat Pembelajaran Kurikulum Merdeka'}
     </h3>
     <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex flex-wrap justify-center gap-3 sm:gap-6 font-medium">
       {!isAdmin && <span>Guru: <strong>{user?.nama || '-'}</strong> {user?.nip ? `(NIP. ${user.nip})` : ''}</span>}
       <span>Tahun Ajaran: <strong>2024/2025</strong></span>
       <span>Dicetak: <strong>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
     </div>
   </div>
   ```
4. **Toolbar Orientasi & Tombol Cetak (no-print)**:
   ```tsx
   <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
     <PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />
     <button
       type="button"
       onClick={() => window.print()}
       className="btn-click bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
     >
       <i className="fa-solid fa-print"></i> Cetak Dokumen
     </button>
   </div>
   ```
5. **Tambahkan Tabel Cetak Khusus (Print-Only Table)**:
   - Untuk Guru: Tabel berisikan rincian 6 dokumen Kurikulum Merdeka untuk setiap mata pelajaran dan kelas yang diampu:
     - Kolom: `No`, `Kode`, `Nama Dokumen`, `Mata Pelajaran & Kelas`, `Format`, `Status Unggah`, `Status Verifikasi`, `Tanggal Unggah`.
   - Gunakan format styling yang sama dengan Admin:
     `border-collapse border border-black text-[8pt]`, header `bg-gray-100 text-black font-bold px-2 py-1.5`, sel `px-2 py-1.5 border border-black`.
6. **Sembunyikan Elemen Kartu Interaktif Web saat Cetak**:
   - Berikan class `no-print` pada container tab selector, KPI card grid, form upload, dan card list.
7. **Pasang Blok Tanda Tangan (`PrintSignature`)**:
   ```tsx
   <PrintSignature
     leftTitle="Mengetahui,"
     leftSubtitle="Guru Mata Pelajaran"
     leftName={user?.nama}
     leftNip={user?.nip}
     user={user}
     sekolahId={user?.sekolah_id}
   />
   ```

#### B. Penyesuaian di `src/components/RekapJurnalView.tsx`
1. Standardisasi padding sel tabel pada baris 704–728: ganti `p-2` menjadi `px-2 py-1.5` (sama dengan `AdminRekapView.tsx`).
2. Samakan background header tabel baris 703: ganti `print:bg-gray-200` menjadi `print:bg-gray-100`.
3. Sembunyikan geotag koordinat GPS mentah saat cetak: tambahkan `no-print` pada div koordinat di baris 662.
4. Perbaiki tanda tangan Wali Kelas baris 835: jika pengguna adalah Wali Kelas (`isWaliKelas`), isi `leftName={user?.nama}` dan `leftNip={user?.nip}`.

---

## 5. Verification Method

### 5.1 Perintah Verifikasi Kode & Build
Jalankan perintah berikut di PowerShell untuk memastikan tidak ada kesalahan kompilasi atau regresi TypeScript:
```powershell
# 1. Type Check (0 error diharapkan)
npx tsc --noEmit

# 2. Build Check
npm run build
```

### 5.2 Inspeksi File Spesifik
1. **Pemeriksaan `src/app/globals.css`**:
   - Pastikan `@media print` memiliki selector:
     `[data-tour="ai-assistant-btn"], [aria-label*="Asisten AI"], .fa-robot, button.fixed, div.fixed:not(.sipjam-print-watermark) { display: none !important; }`
   - Pastikan `.sipjam-print-watermark` TIDAK di-hide di `@media print` dan tetap memiliki `display: flex !important;`.
2. **Pemeriksaan `src/components/AIAssistant/AIAssistant.tsx`**:
   - Pastikan tag `<button data-tour="ai-assistant-btn">` dan dialog panel memiliki kelas `no-print print:hidden`.
3. **Pemeriksaan `src/components/DokumenView.tsx`**:
   - Pastikan komponen memanggil `<PrintHeader />` dan `<PrintSignature />`.
   - Pastikan elemen tabel cetak muncul di `@media print` dan kartu interaktif tertutup dengan `no-print`.
4. **Pemeriksaan `src/components/RekapJurnalView.tsx`**:
   - Pastikan sel tabel menggunakan padding yang setara dengan Admin (`px-2 py-1.5`).

### 5.3 Kondisi Invalidasi (Kriteria Kegagalan)
Temuan atau implementasi dianggap **tidak valid / gagal** jika:
1. Elemen tombol robot AI atau chat popup masih terlihat pada Print Preview (`Ctrl+P`).
2. Watermark sekolah ("DOKUMEN ASLI - [Nama Sekolah]") hilang atau tidak tercetak di lembar kertas/PDF.
3. Cetak dokumen di modul Guru tidak memuat Kop Surat (`PrintHeader`) atau tanda tangan Kepala Sekolah (`PrintSignature`).
4. `npx tsc --noEmit` menghasilkan error TypeScript.
