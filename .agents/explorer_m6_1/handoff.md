# Handoff Report: Document Printing Implementation Investigation (R1 - Milestone 6)

**Agent ID:** explorer_m6_1  
**Working Directory:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m6_1\`  
**Date:** 2026-09-12  
**Target Milestone:** Milestone 6, Requirement R1 (Penyesuaian Cetak Dokumen: Rekap Jurnal, Rekap Akhir, Presensi Siswa)

---

## 1. Observation

### 1.1 Routes, Pages, and Components for Printing & Rekap
The Next.js application uses a client-side single-page architecture rooted in `src/app/page.tsx` rendering `src/components/AppScreen.tsx`. View switching is handled via `currentView` state.

Four primary views and one shared component provide document printing and export:
1. **Rekap Jurnal Pribadi** (`src/components/RekapJurnalView.tsx`, view id: `'view-guru-rekap-jurnal'`):
   - Used by teachers to review and print their 8-column learning journal recap.
   - Contains `<PrintHeader />` (line 155), `<PrintSignature />` (line 385), Excel export (lines 389-434), and `window.print()` (line 436).
2. **Rekapitulasi Akhir** (`src/components/AdminRekapView.tsx`, view id: `'view-admin-rekap'`):
   - Used by administrators to summarize teacher attendance, approved journals, and piket duties.
   - Contains `<PrintHeader />` (line 177), `<PrintSignature />` (line 341), Excel export (lines 344-370), and `window.print()` (line 373).
   - **Critical Finding**: Has **zero** `<table>` elements in the entire file! Currently prints responsive cards (`div#card-rekap-presensi`, line 259) rather than a formal administrative table.
3. **Rekap Presensi Siswa** (`src/components/RekapSiswaView.tsx`, view id: `'view-rekap-siswa'`):
   - Used by both teachers and administrators to summarize student attendance per class and subject.
   - Contains `<PrintHeader />` (line 199), `<PrintSignature />` (line 328), Excel export (lines 331-346), and `window.print()` (line 349).
4. **Modul Piket** (`src/components/PiketView.tsx`, view id: `'view-piket'`):
   - Contains Piket report recap with CSV export (line 685) and `window.print()` (line 692).
   - Contains `<PrintSignature />` (line 678), but **omits `<PrintHeader />`** entirely despite importing it at line 9.
5. **Shared Print Header & Signature Components** (`src/components/PrintHeader.tsx`):
   - Exports `PrintHeader` (lines 7-101) and `PrintSignature` (lines 103-173).

---

### 1.2 Current Print CSS and Media Query Implementation
Located in `src/app/globals.css` (lines 166-258):
```css
@media print {
  @page { size: A4 portrait; margin: 15mm; }
  body { background: white !important; margin: 0; padding: 0; line-height: 1.2 !important; color: black !important; }
  *, *::before, *::after {
    color: black !important;
    background: transparent !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }
  .swal2-container { display: none !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  ...
  /* Pagination protection */
  .print-signature,
  .print-header,
  .print-avoid-break,
  table,
  tr,
  td,
  th,
  img {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
```
**Direct Observations of Print Deficiencies:**
1. **Hardcoded Portrait Orientation**: `@page { size: A4 portrait; margin: 15mm; }` is hardcoded in line 168. There is no support for landscape orientation on wide tables.
2. **Aggressive Background Stripping**: `*, *::before, *::after { background: transparent !important; }` strips all table header backgrounds (`thead tr th`) and zebra striping, making table headers unstyled unless `-webkit-print-color-adjust: exact; print-color-adjust: exact;` is explicitly applied.
3. **Table Break-Inside Bug**: Lines 226-233 apply `page-break-inside: avoid !important; break-inside: avoid !important;` to `table`. When an attendance or journal table has 30-50 rows spanning multiple pages, forcing `table` to avoid page breaks causes severe page overflow, browser content truncation, or empty pages. Only `tr, td, th` should have break protection, while `table` must allow pagination (`break-inside: auto`).

---

### 1.3 Navbar & Sidebar Structure and Print Hiding
In `src/components/AppScreen.tsx`:
- **Fixed Top Header / Navbar (lines 103-121)**:
  ```tsx
  <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-40 fixed top-0 w-full shadow-sm border-b border-gray-100 dark:border-gray-800 left-1/2 -translate-x-1/2 max-w-[1280px]">
  ```
  **Direct Observation**: The `<header>` element has **neither `no-print` nor `print:hidden`**. Furthermore, `src/app/globals.css` does not include `header` in its `@media print` hiding rules. Consequently, when `window.print()` is executed, the fixed navbar (containing the hamburger button, "SIPJAM Nizamudin" logo, dark mode toggle, and "Keluar" button) prints directly across the top of printed documents!
- **Sidebar Overlay (lines 124-157)**:
  The slide-over navigation overlay `{sidebarOpen && (<div className="fixed inset-0 ...">...</div>)}` does not have `no-print` or `print:hidden`.
- **Main Container Padding (line 159)**:
  ```tsx
  <main className="flex-grow overflow-y-auto custom-scroll w-full relative pt-20 pb-8 px-4 sm:px-6 lg:px-8 z-10 max-w-7xl mx-auto">
  ```
  **Direct Observation**: `<main>` has `pt-20` (80px top padding) to clear the fixed navbar. In `@media print`, this padding is **not reset**, leaving an 80px gap at the top of the first printed page.

---

### 1.4 Signature Block Structure and Styling
In `src/components/PrintHeader.tsx` (lines 103-173):
```tsx
export function PrintSignature() {
  ...
  return (
    <div className="print-only print-signature mt-10 flex justify-end ml-auto text-black" style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: 'auto' }}>
      <div className="text-center w-64 ml-auto text-black">
        <p className="leading-tight text-xs sm:text-sm">{region ? `${region}, ` : ''}{dateStr}</p>
        <p className="mb-24 leading-tight text-xs sm:text-sm">Kepala Sekolah</p>
        <p className="font-bold underline leading-tight text-xs sm:text-sm">{kepsekNama}</p>
        <p className="leading-tight text-[11px] sm:text-xs">
          {kepsekNip && kepsekNip !== '-' ? `NIP. ${kepsekNip}` : 'NIP. -'}
        </p>
      </div>
    </div>
  );
}
```
In `src/app/globals.css` (lines 210-220):
```css
.print-signature {
  display: flex !important;
  justify-content: flex-end !important;
  margin-left: auto !important;
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
.print-signature > div {
  margin-left: auto !important;
}
```
**Direct Observations of Signature Issues:**
1. **Narrow Fixed Width `w-64` (256px)**: When `region` is long (e.g. `Kabupaten Bolaangmongondow Timur`), the first line `Kabupaten Bolaangmongondow Timur, 12 September 2026` exceeds 256px and breaks onto 2 or 3 lines. Similarly, long teacher/headmaster names with titles/degrees wrap down ("tergulung ke bawah").
2. **Missing Container Justify (`justify-between`)**: The requirement specifically states: *"Blok tanda tangan (Kabupaten, tanggal, jabatan, nama, NIP) diatur rata kiri-kanan (justify) di dalam kontainernya, memastikan setiap elemen memiliki baris sendiri dan tidak tergulung ke bawah."* In Indonesian administrative standards for school recaps (Rekap Jurnal, Presensi Siswa), the footer signature container spans full width:
   - Left side: Guru Pengampu / Wali Kelas (or empty placeholder / Mengetahui)
   - Right side: Kepala Sekolah with [Kabupaten], [Tanggal]
   Currently, `PrintSignature` only has a single right-aligned block with `justify-end !important;`.

---

### 1.5 Header with Dynamic Period / Date Range
1. **In `RekapJurnalView.tsx` (lines 267-270)**:
   ```tsx
   <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex justify-center gap-4">
     <span>Guru: <strong>{user?.nama || '-'}</strong></span>
     {bulan && <span>Periode: <strong>{bulan}</strong></span>}
   </div>
   ```
   - When the user selects `2026-09`, it renders raw `Periode: 2026-09` instead of `Periode: September 2026`.
   - When the user selects custom date filters (`startDate` and `endDate`), the header **ignores them** and still displays `{bulan}` or nothing!
2. **In `AdminRekapView.tsx`**:
   - Lines 177-180 only render `<PrintHeader />` and `<h2 ...>Rekapitulasi Akhir</h2>`. In print, there is **no period or date range text** indicating which month/dates were pulled!
3. **In `RekapSiswaView.tsx`**:
   - Lines 199-202 only render `<PrintHeader />` and `<h2 ...>Rekap Absen Siswa</h2>`. In print, there is **no subtitle showing the selected Class, Subject, or Date Range / Period**!

---

### 1.6 Journal Activity Photo Rendering
In `src/components/RekapJurnalView.tsx` (lines 353-376):
```tsx
{/* 8. Foto kegiatan */}
<td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
  {hasFoto ? (
    <div className="flex flex-col items-center justify-center gap-1">
      <img
        src={transformGoogleDriveUrl(fotoUrl)}
        alt="Foto Kegiatan"
        className="w-12 h-12 print:w-10 print:h-10 object-cover rounded border border-gray-300 dark:border-gray-600 print:border-black mx-auto"
        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
      />
      <a href={fotoUrl} target="_blank" rel="noreferrer" className="text-[9px] ... no-print">Lihat</a>
    </div>
  ) : (
    <span className="text-gray-400 text-[10px] italic">-</span>
  )}
</td>
```
**Direct Observations of Photo Issues:**
1. **Tiny Postage-Stamp Size in Print**: `print:w-10 print:h-10` is 40px × 40px (~10mm × 10mm). Activity photos cannot be deciphered.
2. **Aggressive `object-cover` Cropping**: Most smartphone activity photos are landscape (4:3 or 16:9). `object-cover` forced into a square box cuts off faces, teaching boards, and classroom context.
3. **Paper Border Clipping in Portrait**: In portrait orientation (180mm printable width), squeezing 8 columns forces Column 8 to the far right margin where it risks clipping. In landscape orientation (277mm printable width), Column 8 has ample room (35-45mm) to render photos at `print:w-20 print:h-16` or `print:max-h-20` clearly with `object-contain`.
4. **Google Drive CDN Image Resolution**: `src/lib/imageUrl.ts` has `getGoogleDriveThumbnailUrl(url, 800)`, which provides fast, high-resolution direct image delivery that avoids Google Drive `uc?export=view` virus scan warnings and rate limits.

---

### 1.7 Presensi Siswa & Rekap Akhir Table Styling
1. **`AdminRekapView.tsx` Table Deficiencies**:
   - **Total absence of `<table>`**: The component currently renders grid cards (`div#card-rekap-presensi`, line 259) with small colored metric chips for each teacher.
   - Requirement R1 explicitly demands: *"Tabel untuk Presensi Siswa dan Rekap Akhir wajib didesain dengan garis tepi, padding, dan struktur tabel yang sangat profesional."*
   - Currently, an admin printing `AdminRekapView` gets raw cards with missing backgrounds and inconsistent page breaks.
2. **`RekapSiswaView.tsx` Table Deficiencies**:
   - The table (lines 288-326) uses only bottom borders (`border-b border-gray-200 dark:border-gray-800`), with zero vertical grid lines between columns.
   - It completely lacks print border classes (`print:border-black`, `print:border`). When printed, light gray borders vanish or appear faint and jagged.
   - Padding is `px-3 py-2`, lacking print-optimized compact padding (`print:py-1 print:px-2`) to fit 35-40 students on a clean page.

---

## 2. Logic Chain

1. **Orientation Logic**:
   - *Observation 1.2* proves `@page { size: A4 portrait; margin: 15mm; }` is hardcoded in `globals.css`.
   - *Observation 1.1 & 1.6* prove that Rekap Jurnal (8 columns with photo) and Admin Rekap (10 columns) require landscape orientation to prevent horizontal truncation and photo clipping, whereas Presensi Siswa may be printed in either portrait or landscape.
   - *Inference*: Hardcoding `@page` prevents orientation adaptability. Removing the hardcoded `size: A4 portrait` from `globals.css` and providing an interactive orientation switch toggle (`Portrait` vs `Landscape`) that dynamically injects `@page { size: A4 ${orientation}; }` allows each document view to set its optimal default (e.g. Landscape for Rekap Jurnal & Rekap Akhir, Portrait for Rekap Siswa) while allowing the user to switch at will prior to printing.

2. **Navbar Hiding & Page Padding Logic**:
   - *Observation 1.3* proves `<header>` in `AppScreen.tsx` lacks `no-print` and `<main>` retains `pt-20` during print.
   - *Inference*: Adding `print:hidden` / `no-print` to `<header>` and resetting `main` padding (`print:pt-0 print:p-0`) in `AppScreen.tsx` and adding `header, nav, aside { display: none !important; }` in `globals.css` guarantees that documents print cleanly from the top of page 1 with zero app shell clutter.

3. **Signature Block Logic**:
   - *Observation 1.4* proves that the existing `PrintSignature` has `w-64` (256px) and `justify-end`, which causes long region names (e.g. `Kabupaten Bolaangmongondow Timur`) or teacher/headmaster names to wrap awkwardly onto multiple lines.
   - *Inference*: Setting the container to `w-full flex justify-between items-start` and applying `whitespace-nowrap` to each line of text ensures that every element occupies its own dedicated line without wrapping ("tidak tergulung ke bawah"), and aligns signatures across the container margins ("rata kiri-kanan (justify)"). Supporting both dual signers (e.g. Guru/Wali Kelas on left, Kepala Sekolah on right) and single signer modes cleanly satisfies the administrative formatting requirement.

4. **Dynamic Period Header Logic**:
   - *Observation 1.5* proves that `RekapJurnalView` prints raw `2026-09`, `AdminRekapView` has no print period header, and `RekapSiswaView` has no print period/class header.
   - *Inference*: A centralized date period formatter function (converting `YYYY-MM` to `"September 2026"` and `startDate`/`endDate` to `"1 September 2026 s/d 12 September 2026"`) must be rendered in a formal document print subheader across all three views.

5. **Journal Photo Rendering Logic**:
   - *Observation 1.6* proves `print:w-10 print:h-10` with `object-cover` severely degrades photos and crops classroom content.
   - *Inference*: Expanding print dimensions to `print:w-24 print:h-20`, switching to `object-contain` (or proper aspect ratio), using `getGoogleDriveThumbnailUrl(..., 800)`, and printing in Landscape orientation guarantees clear, uncropped photo rendering.

6. **Professional Table Construction Logic**:
   - *Observation 1.7* proves `AdminRekapView` has zero `<table>` elements and `RekapSiswaView` lacks vertical borders and print borders.
   - *Inference*: Building a dedicated, formal `<table>` for `AdminRekapView` with 10 explicit columns, and updating `RekapSiswaView` to use `border-collapse border border-gray-400 print:border-black`, `p-2 print:p-1.5`, and explicit cell borders transforms both into publication-grade official school documents.

---

## 3. Caveats

1. **Browser `@page` Orientation Support**: Modern Chromium (Chrome, Edge) and WebKit (Safari) strictly obey `@page { size: landscape; }` or `@page { size: portrait; }` when injected into `<style>` in the document head or body. In Firefox, users can still manually adjust print orientation in the native browser print preview dialog.
2. **Existing Tests Compatibility**: `tests/printHeader.test.ts` and `tests/challenger_r1_r3.test.ts` contain unit assertions on `getAddressFontSize`, `getRegion`, `formatHariTanggal`, and `transformGoogleDriveUrl`. Any updates to `PrintHeader.tsx` or `globals.css` must maintain or enhance these helper functions so that all 11 existing test suites continue to pass with 0 regressions.
3. **Database Schema**: No new database migration is required for R1 (all necessary configuration keys `kop_yayasan`, `kop_sekolah`, `kop_alamat`, `kop_npsn`, `logo_kiri`, `logo_kanan`, `kota_kabupaten`, `ttd_kepsek_nama`, `ttd_kepsek_nip` already exist in the `pengaturan` table).

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 Implementation Blueprint

#### A. Orientation Switcher Component (`PrintOrientationToggle`)
Create a shared or reusable component (e.g. in `src/components/PrintHeader.tsx` or as a standalone UI helper) that:
1. Manages `orientation: 'portrait' | 'landscape'` state.
2. Injects a reactive `<style>` block:
   ```tsx
   <style>{`
     @media print {
       @page {
         size: A4 ${orientation} !important;
         margin: ${orientation === 'landscape' ? '10mm 12mm' : '15mm 12mm'} !important;
       }
     }
   `}</style>
   ```
3. Provides intuitive interactive pill buttons in the view controls (before clicking Cetak Dokumen):
   ```tsx
   <div className="flex items-center gap-2 no-print">
     <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Orientasi Kertas:</span>
     <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1">
       <button
         type="button"
         onClick={() => setOrientation('portrait')}
         className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${orientation === 'portrait' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
       >
         <i className="fa-solid fa-file mr-1.5"></i> Portrait
       </button>
       <button
         type="button"
         onClick={() => setOrientation('landscape')}
         className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${orientation === 'landscape' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
       >
         <i className="fa-solid fa-file fa-rotate-90 mr-1.5"></i> Landscape
       </button>
     </div>
   </div>
   ```

#### B. Update `src/app/globals.css`
1. Change `@page { size: A4 portrait; margin: 15mm; }` to flexible `@page { margin: 12mm; }` so dynamic injected orientation takes precedence.
2. In `@media print`, add explicit rule:
   ```css
   header, nav, aside, .app-header, .no-print {
     display: none !important;
   }
   main {
     padding: 0 !important;
     margin: 0 !important;
     max-width: 100% !important;
     width: 100% !important;
     overflow: visible !important;
   }
   ```
3. Fix the table page break bug: Remove `table` from `page-break-inside: avoid !important;`, keeping only `tr, td, th, img`.
4. Update `.print-signature`:
   ```css
   .print-signature {
     display: flex !important;
     width: 100% !important;
     justify-content: space-between !important;
     page-break-inside: avoid !important;
     break-inside: avoid !important;
   }
   ```

#### C. Update `src/components/AppScreen.tsx`
Add `print:hidden no-print` to `<header>` (line 103) and `<main className="... print:pt-0 print:p-0 print:m-0">` (line 159).

#### D. Upgrade `PrintSignature` in `src/components/PrintHeader.tsx`
Enhance `PrintSignature` with props:
```tsx
interface PrintSignatureProps {
  leftTitle?: string;
  leftName?: string;
  leftNip?: string;
  rightTitle?: string;
  rightName?: string;
  rightNip?: string;
  singleColumn?: boolean;
}
```
Ensure every paragraph has `whitespace-nowrap`:
```tsx
<div className="print-only print-signature mt-8 w-full flex justify-between items-start text-black">
  {/* Left Signature Block (Guru / Wali Kelas / Mengetahui) */}
  <div className="text-center min-w-[220px]">
    <p className="whitespace-nowrap text-xs sm:text-sm font-medium">{leftTitle || 'Mengetahui,'}</p>
    <p className="whitespace-nowrap text-xs sm:text-sm">{leftSubtitle || 'Guru Mata Pelajaran'}</p>
    <div className="h-20 sm:h-24"></div>
    <p className="whitespace-nowrap font-bold underline text-xs sm:text-sm">{leftName || '-'}</p>
    <p className="whitespace-nowrap text-[11px] sm:text-xs">NIP. {leftNip || '-'}</p>
  </div>

  {/* Right Signature Block (Kepala Sekolah with Dynamic Region & Date) */}
  <div className="text-center min-w-[220px]">
    <p className="whitespace-nowrap text-xs sm:text-sm font-medium">{region ? `${region}, ` : ''}{dateStr}</p>
    <p className="whitespace-nowrap text-xs sm:text-sm">{rightTitle || 'Kepala Sekolah'}</p>
    <div className="h-20 sm:h-24"></div>
    <p className="whitespace-nowrap font-bold underline text-xs sm:text-sm">{rightName || kepsekNama}</p>
    <p className="whitespace-nowrap text-[11px] sm:text-xs">{rightNip || (kepsekNip && kepsekNip !== '-' ? `NIP. ${kepsekNip}` : 'NIP. -')}</p>
  </div>
</div>
```

#### E. Dynamic Period Formatting Utility
Add a helper in `src/lib/wita.ts` or `src/components/PrintHeader.tsx`:
```tsx
export function formatPeriodHeader(bulan?: string, startDate?: string, endDate?: string): string {
  if (startDate && endDate) {
    if (startDate === endDate) return formatHariTanggal(startDate);
    return `${formatHariTanggal(startDate)} s/d ${formatHariTanggal(endDate)}`;
  }
  if (bulan && bulan.includes('-')) {
    const [year, month] = bulan.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${monthNames[mIdx] || month} ${year}`;
  }
  return 'Semua Periode';
}
```

#### F. Build Professional `<table>` for `AdminRekapView.tsx`
Add a dedicated table rendered on screen and in print with 10 explicit columns:
```tsx
<div className="overflow-x-auto w-full my-4 rounded-xl border border-gray-300 dark:border-gray-700 print:border-black print:overflow-visible">
  <table className="w-full text-left text-xs border-collapse border border-gray-300 dark:border-gray-700 print:border-black print:text-[8pt]">
    <thead>
      <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 print:bg-gray-200 print:text-black print:border-black">
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">No</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black font-bold">Nama Guru</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Hadir</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Dinas Luar</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Sakit</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Izin</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Alpa</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Keterlambatan</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Piket</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Jurnal</th>
      </tr>
    </thead>
    <tbody>
      {filteredPresensi.map((r, idx) => (
        <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 print:border-black">
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">{idx + 1}</td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black font-semibold">{r.nama}</td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">{r.hadir || 0}</td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">{r.dinasLuar || 0}</td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">{r.sakit || 0}</td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">{r.izin || 0}</td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">{r.alpa || 0}</td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">
            {Math.floor((r.telatDetik || 0) / 3600)}j {Math.floor(((r.telatDetik || 0) % 3600) / 60)}m
          </td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">{r.piket || 0}</td>
          <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center">{r.jurnal || 0}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

#### G. Upgrade `RekapSiswaView.tsx` Table Styling
1. Add full grid cell borders (`border border-gray-300 dark:border-gray-600 print:border-black` on all `<th>` and `<td>`).
2. Add document print subheader displaying Class, Subject, and dynamic Period.
3. Optimize print padding: `p-2 print:p-1.5 print:text-[8pt]`.

#### H. Upgrade `RekapJurnalView.tsx` Photo Rendering
1. Use `getGoogleDriveThumbnailUrl(fotoUrl, 800) || transformGoogleDriveUrl(fotoUrl)`.
2. Upgrade print styling from `print:w-10 print:h-10 object-cover` to `print:w-20 print:h-16 object-contain rounded border print:border-black mx-auto`.
3. Add `referrerPolicy="no-referrer"` to prevent Google 403 blocks.
4. Default orientation to `landscape`.

---

## 5. Verification Method

### 5.1 Automated Command-Line Verification
1. **TypeScript Static Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Result*: Exit code 0 with 0 type errors.
2. **Automated Unit Tests**:
   ```powershell
   npm test
   ```
   *Expected Result*: All existing tests (`tests/imageUrl.test.ts`, `tests/printHeader.test.ts`, `tests/qolAudit.test.ts`) pass cleanly.
3. **Build Target Check**:
   ```powershell
   npm run build
   ```
   *Expected Result*: Next.js production build succeeds with 0 errors.

### 5.2 Code Inspection Verification
1. Inspect `src/components/AppScreen.tsx` line 103 to verify `<header>` has `print:hidden` / `no-print`.
2. Inspect `src/app/globals.css` lines 166-235 to verify `@page` has dynamic support, `table` does not force break avoidance, and `header` is hidden.
3. Inspect `src/components/PrintHeader.tsx` to verify `PrintSignature` has `w-full flex justify-between` and `whitespace-nowrap` on every text element.
4. Inspect `src/components/AdminRekapView.tsx` to verify a professional `<table>` with 10 columns exists and prints cleanly.
5. Inspect `src/components/RekapSiswaView.tsx` to verify full grid borders (`border border-black` in print) and dynamic period/class subheader.
6. Inspect `src/components/RekapJurnalView.tsx` to verify uncropped photo rendering and landscape orientation toggle.

### 5.3 Invalidation Conditions
- If the browser print preview shows the fixed navbar ("SIPJAM Nizamudin", toggle, logout) at the top of the paper, navbar hiding failed.
- If a signature line wraps onto two lines (e.g. Kabupaten name separated from date), `whitespace-nowrap` or container width failed.
- If `AdminRekapView` prints cards without a tabular grid, table implementation failed.
- If changing the orientation toggle does not alter `@page { size: landscape / portrait; }`, dynamic style injection failed.
