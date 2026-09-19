# Survey & Investigation Report: R1. Print Layout & Document UI Adjustments

**Author**: `explorer_m10_survey_r1`  
**Date**: 2026-09-19  
**Milestone**: M10  
**Scope**: Codebase audit for Print Layout, Orientation Settings, Table Fitting, and Kop Surat Logo Rendering  

---

## 1. Executive Summary

In milestone M10, user requirement **R1 (Print Layout & Document UI Adjustments)** specifies:
1. **Remove forced portrait/landscape CSS/JS settings** so the print layout relies purely on the user's browser print settings.
2. **Ensure tables in print preview fit the page responsively** without getting cut off before the page is filled (vertically or horizontally).
3. **Fix the left and right logos on the letterhead (kop surat)** to render correctly, load reliably without failures, and be completely readable without overlapping text.

This investigation conducted a comprehensive analysis across the codebase, identifying the exact files, line numbers, CSS rules, DOM hierarchies, Supabase data schemas, and rendering mechanisms responsible for each issue, along with actionable solutions.

---

## 2. Print Views & Orientation Configurations

### 2.1 Inventory of All Print Views in the Application

The application contains **5 primary views** that support printing documents via `window.print()` and render `PrintHeader` / `PrintSignature`:

| View Component | File Path | Document Title Printed | Columns / Structure | Print Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **RekapJurnalView (Pribadi)** | `src/components/RekapJurnalView.tsx` (lines 634–740) | *Rekapitulasi Jurnal Pembelajaran Guru* | **8 columns**: Hari/Tgl, Kelas/Jam/Mapel, TP, Materi, Kegiatan, Kehadiran, Refleksi, Foto | Line 846: `window.print()` |
| **RekapJurnalView (Kelas)** | `src/components/RekapJurnalView.tsx` (lines 507–629) | *Rekapitulasi Jurnal Pembelajaran Kelas [X]* | **8 columns**: No, Nama Guru, Tgl/Waktu, Mapel, Jam KBM, Materi/TP, Foto, Status Kehadiran | Line 846: `window.print()` |
| **RekapSiswaView** | `src/components/RekapSiswaView.tsx` (lines 664–700) | *Rekapitulasi Presensi Kehadiran Siswa* | **8 columns**: No, NISN, Nama Siswa, Hadir, Sakit, Izin, Alpa, % Kehadiran | Line 729: `window.print()` |
| **AdminRekapView** | `src/components/AdminRekapView.tsx` (lines 287–345) | *Rekapitulasi Akhir Presensi, Jurnal & Piket Guru* | **10 columns**: No, Nama Guru, Hadir, Dinas Luar, Sakit, Izin, Alpa, Telat, Piket, Jurnal | Line 384: `window.print()` |
| **GradebookView** | `src/components/GradebookView.tsx` (lines 1792–2272) | *Daftar Nilai Asesmen Kurikulum Merdeka* | **Multi-tier nested matrix**: Identitas, Diagnostik, Formatif 1..N, Sumatif 1..N, Nilai Rapor, Predikat | Line 1580: `window.print()` |
| **PiketView (Rekap)** | `src/components/PiketView.tsx` (lines 1198–1397) | *Rekap Laporan Piket* | Card list: Guru Pelapor, Tanggal, Status, Catatan Apel, Kehadiran Siswa, Foto | Line 1413: `window.print()` |

---

### 2.2 Forced Orientation Mechanism & Root Cause

#### How Forced Orientation is Currently Injected:
In `src/components/PrintHeader.tsx`, lines 318–343:
```tsx
export function PrintOrientationToggle({
  orientation,
  setOrientation
}: {
  orientation: 'landscape' | 'portrait';
  setOrientation: (val: 'landscape' | 'portrait') => void;
}) {
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation} !important;
            margin: ${orientation === 'landscape' ? '8mm 10mm' : '12mm 15mm'} !important;
          }
          header, nav, aside, .app-header, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
```

#### Where `PrintOrientationToggle` is Rendered:
1. `src/components/RekapJurnalView.tsx`:
   - Line 31: `const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');`
   - Line 465: `<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />`
2. `src/components/RekapSiswaView.tsx`:
   - Line 27: `const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');`
   - Line 660: `<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />`
3. `src/components/AdminRekapView.tsx`:
   - Line 14: `const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');`
   - Line 282: `<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />`
4. `src/components/GradebookView.tsx`:
   - Line 93: `const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');`
   - Line 1356: `<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />`

#### Why This Forces Browser Orientation:
- In CSS Paged Media Module Level 3, the `@page { size: <page-size> <orientation>; }` descriptor tells the user agent (Blink/Chromium, Gecko, WebKit) to override the print device's default orientation and paper size.
- In modern browsers (Chrome, Edge, Safari), injecting `@page { size: A4 landscape !important; }` locks the print preview. The orientation setting in the browser's print dialog is either **hardcoded / locked** or disabled, preventing the user from switching between portrait and landscape or selecting other paper formats (e.g. F4, Folio, Legal, Letter).
- In `src/app/globals.css` lines 211–213, a note already warned:
  ```css
  /* NOTE: Do NOT set @page here — PrintOrientationToggle injects it dynamically.
     If no toggle is present, fallback to browser default (usually portrait). */
  ```

#### How to Remove Forced Orientations:
1. **Remove `size: A4 ${orientation} !important;` from the `@page` block**:
   - The `@page` rule should either specify only standard margins (e.g. `margin: 10mm;` or `margin: 8mm 10mm;`) or be completely omitted so that the browser's native margins and orientation settings govern the document.
   - Example revised `@page` block:
     ```css
     @page {
       margin: 10mm;
     }
     ```
2. **Handling the `PrintOrientationToggle` Component**:
   - The requirement states: *"Remove forced portrait/landscape CSS/JS settings; the print layout should rely purely on the user's browser print settings."*
   - To satisfy this:
     - Remove the injected `<style> @page { size: ... } </style>` from `PrintOrientationToggle`. If `PrintOrientationToggle` is kept in the UI, it can be styled as an optional preview preview-mode switcher or removed from views where it is no longer required.
     - Note regarding legacy test suites: `tests/m6_2_print_redesign.test.ts` (line 79) checks `printHeaderContent.includes('size: A4 ${orientation} !important;')`. Since milestone M10 explicitly supersedes this requirement, any test checking for forced `@page size` should be aligned with M10 or documented accordingly.
3. **Ensure Global Print Styles Cleanly Format Both Orientations**:
   - `globals.css` must support fluid width (`width: 100% !important; max-width: 100% !important;`) so that whether the user selects Portrait or Landscape in their browser dialog, the page renders seamlessly without fixed clipping.

---

## 3. Print Tables: Overflow, Wrapping, Page-Break Avoidance & Scaling

### 3.1 Root Causes of Vertical Cut-Off ("Cut Off Before the Page Is Filled")

When testing print preview, tables frequently get truncated after page 1 or cut off halfway down a page. Our audit identified two distinct culprits:

#### Culprit 1: Parent Container Fixed Heights & Scroll Overflow Clipping
- **Location 1**: `src/components/GradebookView.tsx`:
  - Line 1790: `<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">`
  - Line 1791: `<div className="overflow-x-auto max-h-[600px] custom-scroll relative">`
  - Line 2178: `<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">`
  - Line 2179: `<div className="overflow-x-auto max-h-[600px] custom-scroll">`
- **Location 2**: `src/components/AppScreen.tsx`:
  - Line 340: `<div className="flex-col h-full w-full flex">` (`h-full` limits height to viewport height).
  - Line 419: `<main className="flex-grow overflow-y-auto custom-scroll w-full relative ...">` (`overflow-y-auto` creates a scroll context).
- **Mechanism in Chromium / Blink**:
  - In CSS printing, any ancestor with `height: 100%`, `max-height: 600px`, `overflow: hidden`, or `overflow: auto` creates a **fixed-height clipping block**.
  - The browser print engine prints **only** the portion of the table that fits inside that 600px box or 100vh viewport, and completely drops all remaining pages! The table cuts off before page 1 is filled, leaving the bottom of page 1 empty and dropping the rest of the records.
- **Current `globals.css` Defect**:
  - Line 342 in `globals.css` only overrides `.overflow-x-auto`:
    ```css
    .overflow-x-auto { overflow: visible !important; }
    ```
  - It **fails** to override `overflow-y-auto`, `[class*="max-h-"]`, `.overflow-hidden`, and `main` height!

#### Culprit 2: Premature Page Breaks & Row Splitting
- In `src/app/globals.css`, lines 316–319:
  ```css
  tr {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  ```
- While `break-inside: auto` allows rows to break across pages, it often cuts text lines and 70px activity photos horizontally in half across the bottom margin of paper.
- Conversely, if large block elements or signatures have `page-break-inside: avoid` with huge margins, the browser pushes them prematurely to a blank second page, leaving the bottom of page 1 empty.

---

### 3.2 Root Causes of Horizontal Overflow & Truncation

1. **Missing `table-layout: fixed` & Column Width Allocation**:
   - In `AdminRekapView.tsx` (10 columns) and `RekapJurnalView.tsx` (8 columns), tables use `w-full border-collapse` without `table-layout: fixed`.
   - In standard A4 Portrait (~180mm printable width), 10 columns average 18mm each.
   - Without `table-layout: fixed`, `table-layout: auto` calculates column width from cell text length. If a column contains long text (e.g. teacher names, long note descriptions, URLs), the table expands beyond 180mm, pushing the rightmost columns (`% Kehadiran`, `Foto`, `Jurnal`) off the right edge of the page!
2. **Missing Word-Break & Overflow-Wrap**:
   - Cells in `RekapJurnalView.tsx` use `whitespace-pre-wrap`, but lack `break-words` or `overflow-wrap: break-word` / `word-break: break-word`.
   - A single long word or string without spaces forces the entire column to expand indefinitely.
3. **Fixed Font Size without Responsive Scaling**:
   - `globals.css` line 294 sets:
     ```css
     table {
       border-collapse: collapse !important;
       width: 100% !important;
       font-size: 8pt !important;
     }
     ```
   - For an 8-to-10 column table on portrait paper, `8pt` with standard cell padding (`padding: 3px 5px !important;`) is too wide. Cells need compact padding (`padding: 2px 4px !important;`) and proportional scaling (e.g. `7pt` or `clamp(6.5pt, 1.2vw, 8pt)`).

---

### 3.3 Table Styles Comparison Across Views

| View | Columns | Cell Padding in Print | Overflow Handling | Page-Break Handling |
| :--- | :---: | :--- | :--- | :--- |
| **RekapJurnalView** | 8 | `p-2 print:border-black` | `.print:overflow-visible` | `tr` inherits `globals.css` `break-inside: auto` |
| **RekapSiswaView** | 8 | `px-2 py-1.5 print:border-black` | `.print:overflow-visible` | `tr` inherits `globals.css` `break-inside: auto` |
| **AdminRekapView** | 10 | `px-2 py-1.5 print:border-black` | `.print:overflow-visible` | `tr` inherits `globals.css` `break-inside: auto` |
| **GradebookView** | 12–20+ | `py-2 px-2.5` | `max-h-[600px] overflow-hidden` **(BUG)** | None explicitly declared on table |
| **PiketView** | N/A (Cards) | Card padding `p-3.5` | Container `space-y-3` | Cards lack `break-inside: avoid` |

---

## 4. Kop Surat (Letterhead) Rendering & Logo Handling

### 4.1 Implementation Architecture in `PrintHeader.tsx`

The letterhead is rendered exclusively by the `PrintHeader` component (`src/components/PrintHeader.tsx`, lines 15–139):

```tsx
export function PrintHeader({ sekolahId, user }: PrintHeaderProps = {}) {
  // 1. Loads config from 'pengaturan' table where sekolah_id = activeSekolahId
  // 2. Loads schoolInfo from 'sekolah' table where id = activeSekolahId
  ...
  const logoYayasan = transformGoogleDriveUrl(config.logo_yayasan || config.logo_kiri || config.LOGO_KIRI_URL || schoolInfo?.logo_url || '');
  const logoDinas = transformGoogleDriveUrl(config.logo_dinas || config.logo_kanan || config.LOGO_KANAN_URL || '');
  const yayasan = config.kop_yayasan || config.NAMA_YAYASAN || '';
  const sekolah = config.kop_sekolah || config.NAMA_SEKOLAH || schoolInfo?.nama || 'SMA NIZAMUDIN';
  const alamat = config.kop_alamat || config.ALAMAT_SEKOLAH || schoolInfo?.alamat || '';
  const npsn = config.kop_npsn || config.NPSN || schoolInfo?.npsn || '';
```

The JSX template (lines 90–137) is structured as:
```tsx
<div className="print-header print-only mb-6 border-b-4 border-black pb-4 text-black font-medium leading-none">
  <div className="flex items-center justify-center gap-4 sm:gap-8 max-w-4xl mx-auto">
    {logoYayasan && (
      <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
        <img src={logoYayasan} alt="Logo Yayasan" className="max-w-full max-h-full object-contain" />
      </div>
    )}
    <div className="print-header-center flex-1 min-w-0 text-center px-2 overflow-hidden leading-none">
      ...
    </div>
    {logoDinas && (
      <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
        <img src={logoDinas} alt="Logo Dinas" className="max-w-full max-h-full object-contain" />
      </div>
    )}
  </div>
</div>
```

---

### 4.2 Why Logos Fail to Load or Render Properly

Our investigation uncovered **four distinct failure modes** in logo rendering:

#### 1. Google Drive URL Transformation Failure (`drive.google.com/uc?export=view`)
- `PrintHeader.tsx` calls `transformGoogleDriveUrl(...)` for both logos.
- In `src/lib/imageUrl.ts`, line 42:
  ```ts
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
  ```
- **Real-world failure**: In 2024, Google Drive restricted `uc?export=view`. When loaded from an external domain or embedded in an `<img>` tag without Google session cookies, Google returns a **303 redirect followed by an HTML virus scan warning, rate limit page, or 403 Forbidden**. The browser tries to decode HTML as an image, fails, and renders a broken image placeholder or nothing at all!
- **Proven Solution**: In `imageUrl.ts`, `getGoogleDriveThumbnailUrl(url, 800)` produces:
  ```ts
  `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
  ```
  This endpoint redirects (302) to `https://lh3.googleusercontent.com/d/${fileId}=w800`, which is Google's public thumbnail CDN. It serves image bytes directly, bypasses cookie restrictions, supports caching, and works reliably in `<img>` tags.
  While `RekapJurnalView.tsx` already uses `getGoogleDriveThumbnailUrl(fotoUrl, 800)`, `PrintHeader.tsx` was never updated to use it!

#### 2. Missing Schema Column Resolution for Multi-Tenant Schools
- In the Supabase database schema (`supabase/migrations/20260912_multi_tenant_sekolah_rls.sql`), the `sekolah` table has columns:
  - `logo_url`
  - `logo_kiri_url`
  - `logo_kanan_url`
- However, in `PrintHeader.tsx`:
  - Line 70 checks: `config.logo_yayasan || config.logo_kiri || config.LOGO_KIRI_URL || schoolInfo?.logo_url || ''` -> **Does NOT check `schoolInfo?.logo_kiri_url`!**
  - Line 71 checks: `config.logo_dinas || config.logo_kanan || config.LOGO_KANAN_URL || ''` -> **Does NOT check `schoolInfo?.logo_kanan_url`!**
- If an admin configures their school's logos via `sekolah.logo_kiri_url` and `sekolah.logo_kanan_url`, the right logo (`logoDinas`) is **completely empty (`''`)**, and the left logo falls back only to `logo_url`!

#### 3. Missing Critical Image Element Attributes
- In `PrintHeader.tsx`:
  `<img src={logoYayasan} alt="Logo Yayasan" className="max-w-full max-h-full object-contain" />`
- It is missing:
  - `loading="eager"`: In print mode, browsers often skip lazy-loaded images that have not entered the viewport before `window.print()` triggers.
  - `referrerPolicy="no-referrer"`: Without this, Google Drive servers may block requests based on the origin `Referer` header.
  - `onError`: No fallback handling to recover if the primary URL fails.

#### 4. Asymmetric Shifting & Text Collision (Overlap)
- The container uses `flex items-center justify-center gap-4 sm:gap-8`.
- If only one logo is present (e.g. left logo is present, right logo is empty):
  - Because `logoDinas` is not rendered, there is no right-side counterweight.
  - The center text container (`flex-1`) is shifted to the right, throwing off document balance.
- Logo container dimensions:
  - `w-20 h-20 sm:w-24 sm:h-24` (80px–96px wide).
  - Two logos + two 32px gaps consume **256px** of horizontal space.
  - On standard A4 portrait (~680px printable width), this leaves only ~424px for the center text.
- Line-Height 1 Collision:
  - In `globals.css`:
    ```css
    .print-header, .print-header * { line-height: 1 !important; }
    ```
  - When the school name (`h1`) is long (e.g. 2 lines), `line-height: 1` causes the top line and bottom line to collide vertically into each other.
- Address Micro-Font & Overflow:
  - `getAddressFontSize(alamat)` scales down to `0.45rem` (7.2px = 5.4pt).
  - At 5.4pt, text becomes unreadable on paper, yet because `overflow: hidden; text-overflow: clip;` is enforced, any slight overflow gets truncated.

---

## 5. Concrete Action Plan & Recommendations

### Recommendation 1: Neutralize Forced Orientation
1. In `src/components/PrintHeader.tsx`:
   - Remove `size: A4 ${orientation} !important;` from the injected `<style>` tag in `PrintOrientationToggle`.
   - Update `@page` to define only neutral margins:
     ```css
     @media print {
       @page {
         margin: 10mm;
       }
       header, nav, aside, .app-header, .no-print {
         display: none !important;
       }
       main {
         padding: 0 !important;
         margin: 0 !important;
         max-width: 100% !important;
         width: 100% !important;
       }
     }
     ```
2. In `RekapJurnalView.tsx`, `RekapSiswaView.tsx`, `AdminRekapView.tsx`, `GradebookView.tsx`:
   - Allow the user to print directly via browser settings without forcing orientation.

---

### Recommendation 2: Fix Print Table Layout & Eliminate Vertical/Horizontal Cut-Off
1. In `src/app/globals.css`, add comprehensive print resets:
   ```css
   @media print {
     /* Prevent vertical clipping by unlocking all ancestor containers */
     html, body, main,
     .overflow-y-auto,
     .overflow-x-auto,
     .custom-scroll,
     [class*="max-h-"],
     .overflow-hidden,
     .glass-card,
     .mobile-container {
       overflow: visible !important;
       max-height: none !important;
       height: auto !important;
     }

     /* Ensure tables fit responsively on paper */
     table {
       width: 100% !important;
       table-layout: auto !important;
       border-collapse: collapse !important;
       font-size: 7.5pt !important;
     }

     th, td {
       word-break: break-word !important;
       overflow-wrap: break-word !important;
       padding: 3px 4px !important;
     }

     /* Clean pagination: keep headers repeating and prevent broken rows */
     thead {
       display: table-header-group !important;
     }
     tfoot {
       display: table-footer-group !important;
     }
     tr {
       page-break-inside: avoid !important;
       break-inside: avoid !important;
     }

     /* Avoid breaking photos across pages */
     img, .print-photo-container {
       page-break-inside: avoid !important;
       break-inside: avoid !important;
     }
   }
   ```
2. In `GradebookView.tsx`:
   - Add `print:max-h-none print:overflow-visible` to lines 1790–1791 and 2178–2179 so the 600px height cap is removed when printing.

---

### Recommendation 3: Fix Letterhead (Kop Surat) & Logo Rendering
1. **Enhance Logo Resolution in `src/components/PrintHeader.tsx`**:
   - Resolve logos from all config and schema keys:
     ```tsx
     const rawLogoYayasan = config.logo_yayasan || config.logo_kiri || config.LOGO_KIRI_URL || schoolInfo?.logo_kiri_url || schoolInfo?.logo_url || '';
     const rawLogoDinas = config.logo_dinas || config.logo_kanan || config.LOGO_KANAN_URL || schoolInfo?.logo_kanan_url || '';

     const logoYayasan = getGoogleDriveThumbnailUrl(rawLogoYayasan, 800) || transformGoogleDriveUrl(rawLogoYayasan);
     const logoDinas = getGoogleDriveThumbnailUrl(rawLogoDinas, 800) || transformGoogleDriveUrl(rawLogoDinas);
     ```
2. **Add Eager Loading, No-Referrer & Error Fallback to Logo Images**:
   ```tsx
   <img
     src={logoYayasan}
     alt="Logo Yayasan"
     loading="eager"
     referrerPolicy="no-referrer"
     className="max-w-full max-h-full object-contain"
     onError={(e) => {
       const target = e.target as HTMLImageElement;
       if (rawLogoYayasan && target.src !== transformGoogleDriveUrl(rawLogoYayasan)) {
         target.src = transformGoogleDriveUrl(rawLogoYayasan);
       }
     }}
   />
   ```
3. **Use a Symmetric 3-Column Slot Layout to Prevent Overlap**:
   - Give left and right logo containers balanced slot widths (`w-20` / 80px) and appropriate height (`h-20`).
   - If one logo is absent, maintain an empty matching spacer slot so the center text remains perfectly centered between margins and never shifts into the logo area.
   - Adjust `line-height` on multiline headers to `leading-tight` or `1.15` to prevent text line collision while keeping the official letterhead look.

---

## 6. Verification Plan

| Check Item | Target File(s) | Verification Command / Method | Expected Result |
| :--- | :--- | :--- | :--- |
| **No Forced Orientation** | `PrintHeader.tsx`, `globals.css` | Inspect print stylesheet / browser print preview | No `@page { size: portrait/landscape }`; browser print dialog allows user to select orientation freely. |
| **No Table Vertical Clipping** | `GradebookView.tsx`, `globals.css` | Print preview with 30+ students in Gradebook | All rows paginate cleanly across multiple pages; table is not cut off at 600px. |
| **No Table Horizontal Cut-off** | `AdminRekapView.tsx`, `RekapJurnalView.tsx` | Print preview on Portrait A4 | All 8 or 10 columns fit within paper margins without rightmost columns clipped. |
| **Logos Load Successfully** | `PrintHeader.tsx`, `imageUrl.ts` | Load page with Google Drive links in `logo_kiri` and `logo_kanan` | Both logos render high-resolution image bytes without 403 or broken icons. |
| **No Logo-Text Overlap** | `PrintHeader.tsx` | Print preview with long school name & address | Center text remains centered; address fits cleanly on one line without touching or overlapping logo boxes. |
| **Regression Testing** | Entire test suite | `npm test` | Existing test suite executes cleanly. |

---
*Report compiled by explorer_m10_survey_r1.*
