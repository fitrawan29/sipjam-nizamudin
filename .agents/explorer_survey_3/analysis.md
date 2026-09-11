# UI Components & Iconography Survey Report

**Project**: SIPJAM SMA Nizamudin (`c:\Users\Fitra\OneDrive\Documents\sipjam-app`)  
**Explorer**: `explorer_survey_3`  
**Date**: 2026-09-11  
**Scope**: Shared UI component library, typography contrast audit (light vs dark mode), icon usage consistency, mobile layout resilience.  
**Mode**: Read-Only Analysis  

---

## 1. Executive Summary

This survey audited all 18 view/component files in `src/components/`, the application shell (`src/app/layout.tsx`, `src/app/page.tsx`), and the styling layer (`src/app/globals.css`). 

Key findings:
1. **Absence of a Shared Primitive Component Library**: There is no `components/ui/` folder or headless UI library (e.g. Radix, HeadlessUI). UI primitives (buttons, inputs, select menus, badges, tabs, cards, search bars) are duplicated inline across 17 view components. Shared styling currently relies only on global Tailwind utility classes in `src/app/globals.css` (`.glass-card`, `.input-premium`, `.btn-click`, `.form-label`, `.alert-banner-*`).
2. **Typography Contrast Gaps (Requirement R1)**: While several `h2` headings recently received `dark:text-white`, **over 180 text elements fail the strict contrast adaptability rule**. Form labels predominantly use `text-gray-500 dark:text-gray-400` (and `.form-label` defines `dark:text-gray-400`), which suffers from low contrast on dark backgrounds (`#1e1e1e` / `#121212`). Card item titles use `dark:text-gray-100` or `dark:text-gray-200` instead of pure white (`dark:text-white`). Metadata and body text frequently use `dark:text-gray-400` or have hardcoded dark colors with no dark-mode variant.
3. **Iconography Architecture**: All icons use **Font Awesome 6.4.0 (Free)** loaded via CDN (`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`) in `src/app/layout.tsx`. No `lucide-react` or SVG icon components are present. Across 137+ icon instances, there is substantial inconsistency: icons in headings inherit unconstrained `text-lg` or `text-[10px]`, search input icons have misaligned offsets (`left-3` vs `left-3.5`), and icon spacing mixes inline margins (`mr-1`, `mr-2`) with flex `gap-2`, causing visual stutter.
4. **Mobile Layout Vulnerabilities (Requirement R2)**: Several components break or cause horizontal overflow/cramping on mobile viewports:
   - `AdminConfigView`: 3-column grids (`grid-cols-3`) for time inputs and GPS coordinates cause input truncation on narrow screens (<390px).
   - `RekapSiswaView`: Table with 6 columns and `whitespace-nowrap` forces horizontal scroll instead of providing a responsive mobile layout.
   - `AdminDataView`: Header row with Search Input + Refresh Button + `+ Baru` Button becomes heavily compressed on screens <360px.
   - `HomeView`: Akumulasi Keterlambatan banner flex-between layout crowds text on narrow mobile screens.

---

## 2. Reusable UI Primitives Inventory

### 2.1 File Structure Overview

The application organizes all user-facing screens inside `src/components/`:

| Component File | Size | Primary Role & Screens |
|---|---|---|
| `AppScreen.tsx` | 10.5 KB | App layout shell, fixed top navbar, sidebar overlay drawer, view router |
| `LoginScreen.tsx` | 3.7 KB | Authentication screen, login form |
| `HomeView.tsx` | 17.3 KB | Dashboard: profile banner, daily workflow tracker, lateness card, quick action menu grid |
| `GuruPresensi.tsx` | 15.7 KB | Presensi Datang/Pulang form, GPS radius check, file upload |
| `GuruJurnal.tsx` | 13.9 KB | Jurnal KBM/Kegiatan form, dynamic student attendance selector, file upload |
| `PiketView.tsx` | 15.0 KB | Piket dashboard: schedule card, recent reports, piket reporting form |
| `DokumenView.tsx` | 10.6 KB | Learning materials repository: tabbed list grid and upload form |
| `HistoryView.tsx` | 10.0 KB | History list for Presensi and Jurnal with search & pagination |
| `RekapJurnalView.tsx` | 9.5 KB | Teacher journal report with date/class/mapel filters, CSV & print export |
| `RekapSiswaView.tsx` | 11.4 KB | Student attendance summary with filters, HTML table, CSV & print export |
| `AdminMonitorView.tsx` | 6.4 KB | Realtime daily monitoring feed with date picker & search |
| `AdminVerifView.tsx` | 11.6 KB | Verification dashboard for Presensi & Jurnal, single & batch approval |
| `AdminRekapView.tsx` | 13.2 KB | Monthly/custom attendance & journal summary cards, CSV & print export |
| `AdminDataView.tsx` | 15.2 KB | Master data viewer (Siswa, Guru, Mapel, Kalender, Jadwal) with tabs & search |
| `AdminBackupView.tsx` | 9.7 KB | Data archival/backup & restore via Google Spreadsheet webhook |
| `AdminConfigView.tsx` | 14.8 KB | System settings: academic year, school hours, letterhead, GPS coordinates |
| `AnalitikView.tsx` | 9.9 KB | Analytical dashboard: monthly attendance/journal metrics & top 10 leaderboard |
| `PrintHeader.tsx` | 2.8 KB | Shared print letterhead (`PrintHeader`) and signature section (`PrintSignature`) |

### 2.2 Global CSS Utility Primitives (`src/app/globals.css`)

The current design system defines these shared CSS classes under `@layer components`:
1. **`.glass-card`**: Surface wrapper (`bg-white rounded-3xl relative z-10 border border-slate-100 dark:bg-nizamudin-darkcard dark:border-slate-800 dark:text-white`).
2. **`.input-premium`**: Form input styling (`border border-slate-200 bg-slate-50 rounded-2xl text-gray-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white`).
3. **`.btn-click`**: Interactive animation (`active:scale-[0.92] active:opacity-80 transition-all duration-200`).
4. **`.form-label`**: Field label styling (`text-[11px] font-bold text-gray-500 mb-1.5 ml-1 dark:text-gray-400`).
5. **`.alert-banner-red / -orange / -blue / -green`**: Pre-styled feedback boxes.
6. **`.squircle-icon`**: `rounded-[20px] aspect-square flex justify-center items-center` (currently rarely utilized).
7. **`.mobile-container`**: Root wrapper with max-width `1280px` on lg screens.

### 2.3 Inline Primitives Taxonomy

Because no shared React component library exists, primitives are implemented inline. The following table catalogs how each primitive is currently constructed:

| Primitive | Current Implementation Patterns | Observed Inconsistencies |
|---|---|---|
| **Primary Buttons** | Full-width buttons: `btn-click w-full bg-[color] text-white font-bold py-3.5 rounded-2xl shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50` | Colors vary arbitrarily by view (green in Presensi, blue in Jurnal/Config, teal in Piket, amber in Dokumen, indigo in RekapJurnal). Rounded radii vary (`rounded-2xl` vs `rounded-xl`). |
| **Secondary / Icon Buttons** | Square buttons: `btn-click w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex justify-center items-center` | Header uses `w-9 h-9 rounded-xl`, views use `w-8 h-8 rounded-lg` or `w-8 h-8 rounded-xl`. |
| **Pill Tabs** | Pattern A: `px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 border`<br>Pattern B: `px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap`<br>Pattern C: `btn-click flex-1 text-[11px] font-bold py-2 rounded-lg` | Three completely different tab designs across DokumenView (A), PiketView (B), and HistoryView (C). Inactive states vary between `text-gray-500` and `text-gray-600`. |
| **Form Inputs** | `w-full px-3 py-2.5 text-sm rounded-xl input-premium`<br>Or: `w-full px-2 py-2 text-xs rounded-lg input-premium` | Padding and font-size differ: some views use `py-2.5 text-sm rounded-xl`, others use `py-2 text-xs rounded-lg`. |
| **Search Bars** | Container with absolute left icon: `relative mb-4` + `fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs` + `input-premium pl-9` | Duplicated in 4 views (`HistoryView`, `AdminMonitorView`, `AdminVerifView`, `AdminDataView`). In `AdminDataView`, icon offset is `left-3 top-3` with `pl-8`. |
| **Status Badges** | `text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0`<br>Disetujui: `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`<br>Ditolak: `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`<br>Menunggu: `bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400` | In `AdminMonitorView`, badge uses `bg-green-50 text-green-600` instead of standard `bg-green-100 text-green-700`. Badge in `HomeView` header uses gold background. |
| **Content Cards** | Result item cards: `bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2` | Border and padding are mostly consistent, but text colors inside them vary wildly between `dark:text-gray-100`, `dark:text-gray-200`, `dark:text-gray-300`, and `dark:text-white`. |
| **Attendance Buttons (H, S, I, A)** | `w-7 h-7 rounded-md text-[10px] font-bold transition-all` | Present in `GuruJurnal.tsx` and `PiketView.tsx`. Inactive state uses `dark:text-gray-400`. Active state uses pure white text. |
| **Modals / Dialogs** | Implemented exclusively via `sweetalert2` (`Swal.fire`) | SweetAlert2 uses default white popup theme; lacks dark mode styling override in `globals.css`. |
| **Tables** | Standard HTML `<table>` in `RekapSiswaView.tsx` | Only 1 table in entire app. Headers use `bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300`. |
| **Pagination** | `flex justify-between items-center mt-5 pt-4 border-t` + text label + chevron buttons | Reimplemented identically in `HistoryView` and `AdminDataView`. |

---

## 3. Typography Contrast Audit (Light vs Dark Mode)

### 3.1 Requirement R1 Evaluation Criteria
- **Light Mode**: Pure black or highly legible dark equivalents (`text-gray-900`, `text-black`, `text-gray-800`).
- **Dark Mode**: Pure white (`dark:text-white`) for all primary and important text. Secondary/supporting text must be high-contrast legible (`dark:text-gray-100` or `dark:text-white`).
- **Forbidden**: Hardcoded dark colors without dark-mode variants, unreadable low-contrast combinations in dark mode (such as `text-gray-400` or `text-gray-500` on dark backgrounds).

### 3.2 Violation Catalog

#### A. Form Labels & Global Form Styles (`globals.css`)
- **`src/app/globals.css:120-125`**:
  ```css
  .form-label {
    @apply block text-[11px] font-bold text-gray-500 mb-1.5 ml-1;
  }
  .dark .form-label {
    @apply text-gray-400; /* VIOLATION: Low contrast on dark backgrounds */
  }
  ```
  *Recommendation*: Update `.dark .form-label` to `@apply text-white;` or `@apply text-gray-100;`. In light mode, change `text-gray-500` to `text-gray-800` or `text-black`.

- **Inline Labels across all Form Views**:
  The pattern `<label className="block text-[10px]/text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">` occurs across:
  - `GuruPresensi.tsx`: Lines 229, 236, 254, 287
  - `GuruJurnal.tsx`: Lines 156, 166, 175, 188, 192, 198, 250, 255
  - `PiketView.tsx`: Lines 184, 244, 248
  - `DokumenView.tsx`: Lines 162, 174, 178
  - `RekapJurnalView.tsx`: Lines 73, 77, 83, 90
  - `RekapSiswaView.tsx`: Lines 113, 117, 123, 130
  - `AdminConfigView.tsx`: Lines 91, 95, 105, 106, 108, 113-115, 118, 119, 126-129, 132, 136, 146, 150, 159, 163, 167
  *Issue*: In dark mode, `dark:text-gray-400` is dim gray (#94a3b8) on #1e1e1e. In light mode, `text-gray-500` is medium gray (#64748b).  
  *Fix*: Replace `text-gray-500 dark:text-gray-400` with `text-black dark:text-white` or `text-gray-900 dark:text-white`.

#### B. Component Card Titles & Item Headers
The following headings use `dark:text-gray-100` or `dark:text-gray-200` instead of the mandated `dark:text-white`:
- `AdminDataView.tsx:130, 142, 154, 163, 173`: `text-gray-800 dark:text-gray-100`
- `AdminBackupView.tsx:189`: `text-gray-800 dark:text-gray-200`
- `AdminMonitorView.tsx:97`: `text-gray-800 dark:text-gray-100`
- `AdminVerifView.tsx:153`: `text-gray-800 dark:text-gray-100`
- `HistoryView.tsx:124, 139`: `text-gray-800 dark:text-gray-100`
- `HomeView.tsx:192`: `text-gray-800 dark:text-gray-100`
- `HomeView.tsx:285, 294`: `text-gray-800 dark:text-gray-200`
- `AnalitikView.tsx:149, 170`: `text-gray-800 dark:text-gray-100`
- `RekapSiswaView.tsx:161`: `text-gray-800 dark:text-gray-200`
- `RekapJurnalView.tsx:119`: `text-gray-800 dark:text-gray-200`
- `PiketView.tsx:166, 215`: `text-gray-800 dark:text-gray-200`
- `GuruJurnal.tsx:220`: `text-gray-800 dark:text-gray-200`
*Fix*: Replace `text-gray-800 dark:text-gray-100` / `dark:text-gray-200` with `text-black dark:text-white`.

#### C. Card Subtitles, Metadata & Body Text
- `PiketView.tsx:151`: `text-[10px] text-gray-600 dark:text-gray-300`
- `PiketView.tsx:169`: `text-[10px] text-gray-600 dark:text-gray-400` (Catatan piket)
- `DokumenView.tsx:138`: `text-[10px] text-gray-500 dark:text-gray-400` (Timestamp)
- `DokumenView.tsx:143`: `text-gray-600 dark:text-gray-400 italic` (Catatan admin)
- `HistoryView.tsx:131, 146`: `text-[10px] text-gray-600 dark:text-gray-300` (Presensi/Jurnal metadata)
- `AdminMonitorView.tsx:106`: `text-[10px] text-gray-600 dark:text-gray-300`
- `AdminVerifView.tsx:161, 172`: `text-[10px] text-gray-600 dark:text-gray-300`
- `AnalitikView.tsx:119, 128, 137`: `text-gray-600 dark:text-gray-400`
- `RekapJurnalView.tsx:120`: `text-[10px] text-gray-600 dark:text-gray-400`
*Fix*: Standardize to `text-gray-800 dark:text-white` or `text-gray-900 dark:text-gray-100`.

#### D. Hardcoded Text Colors with NO Dark Variant
- `AdminBackupView.tsx:192`: `<div className="text-[9px] text-gray-400 text-right">` (Timestamp lacks `dark:` variant)
- `HistoryView.tsx:158`: `<span className="text-[10px] text-gray-400 font-medium">` (Pagination count lacks `dark:` variant)
- `AdminDataView.tsx:268`: `<span className="text-[10px] text-gray-400 font-medium">` (Pagination count lacks `dark:` variant)
- `AdminVerifView.tsx:191`: `<span className="text-[10px] text-gray-400 font-medium">` (Count label lacks `dark:` variant)
- `HomeView.tsx:275-276`: `text-red-500` and `text-red-600` for "Potongan Alpa" (lacks dark mode adjustment `dark:text-red-400`)
- `HistoryView.tsx:99`, `AdminMonitorView.tsx:79`, `AdminVerifView.tsx:142`, `AdminDataView.tsx:232`: Search icon `<i className="... text-gray-400 ...">` lacks dark mode class `dark:text-white` or `dark:text-gray-300`.

#### E. Input Placeholders & Input Text
- In `globals.css`:
  - Line 65: `.input-premium::placeholder { @apply text-slate-400; }`
  - Line 71: `.dark .input-premium::placeholder { @apply text-slate-500; }` (Too dark in dark mode; `text-slate-400` or `text-gray-400` is more legible)
- In views with custom placeholders:
  - `placeholder-gray-400 dark:placeholder-gray-500` used in `AdminConfigView`, `AdminDataView`, `AdminMonitorView`, `AdminVerifView`, `GuruPresensi`, `GuruJurnal`. `dark:placeholder-gray-400` offers better optical clarity.

#### F. Tab Buttons
- Inactive tabs:
  - `DokumenView.tsx:107, 114`: `text-gray-500 dark:text-gray-400 dark:border-gray-700`
  - `AdminVerifView.tsx:134, 137`: `text-gray-500 dark:text-gray-400`
  - `AdminDataView.tsx:198`: `text-gray-500 dark:text-gray-400`
  - `HistoryView.tsx:86, 93`: `text-gray-500 dark:text-gray-400`
  *Fix*: Change to `text-gray-800 dark:text-white` or `text-gray-700 dark:text-white`.

#### G. Table Contrast (`RekapSiswaView.tsx`)
- Line 145: `table className="w-full text-[10px] text-left text-gray-500 dark:text-gray-400 whitespace-nowrap"`
- Line 146: `thead className="text-[9px] text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700"`
- Line 161: `td className="px-3 py-2 font-bold text-gray-800 dark:text-gray-200"`
*Fix*: Table root `text-black dark:text-white`. Table head `text-black dark:text-white`. Table cells `text-black dark:text-white`.

---

## 4. Iconography Audit

### 4.1 Icon Library Identification
- **Primary Library**: **Font Awesome 6.4.0 Free**
- **Delivery Method**: External CDN stylesheet in `<head>` of `src/app/layout.tsx`:
  ```html
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  ```
- **Lucide / React-Icons**: Zero packages installed in `package.json`, zero imports in codebase.

### 4.2 Icon Usage Catalog by View

| Component | Icon Class Names Observed | Functional Context |
|---|---|---|
| `layout.tsx` | CDN Link | Global stylesheet link |
| `LoginScreen.tsx` | `fa-mosque`, `fa-arrow-right` | School emblem inside circle avatar, submit button |
| `AppScreen.tsx` | `fa-bars`, `fa-mosque`, `fa-sun`, `fa-moon`, `fa-power-off`, `fa-xmark`, `fa-house`, `fa-right-to-bracket`, `fa-book-journal-whills`, `fa-shield-halved`, `fa-folder-open`, `fa-clock-rotate-left`, `fa-book-open`, `fa-users-viewfinder`, `fa-clipboard-check`, `fa-chart-pie`, `fa-file-invoice`, `fa-database`, `fa-user-clock`, `fa-hard-drive`, `fa-gears` | Top header buttons, school logo, theme toggle, logout, sidebar items for Guru & Admin |
| `HomeView.tsx` | `fa-mosque` (decorative watermark), `fa-user-tie`, `fa-list-check`, `fa-circle-notch` (spin), `fa-calendar-xmark`, `fa-right-to-bracket`, `fa-bed`, `fa-shield-halved`, `fa-book-journal-whills`, `fa-right-from-bracket`, `fa-check`, `fa-minus`, `fa-lock`, `fa-circle-info`, `fa-stopwatch`, plus dynamic icons for menu items | Banner header, user avatar, workflow step icons, lateness card, dashboard quick action grid |
| `GuruPresensi.tsx` | `fa-right-to-bracket`, `fa-lock`, `fa-triangle-exclamation`, `fa-pen`, `fa-asterisk`, `fa-location-crosshairs`, `fa-check-circle`, `fa-paper-plane` | View heading, locked status, warning alert, note header, GPS status, submit |
| `GuruJurnal.tsx` | `fa-book-journal-whills`, `fa-lock`, `fa-clipboard-user`, `fa-users`, `fa-save` | View heading, locked status, student note, live attendance, submit |
| `PiketView.tsx` | `fa-shield-halved`, `fa-rotate-right`, `fa-lock`, `fa-calendar-check`, `fa-list-check`, `fa-circle-info`, `fa-clipboard-check`, `fa-paper-plane` | View heading, refresh, locked status, daily schedule, latest reports, form submit |
| `DokumenView.tsx` | `fa-folder-open`, `fa-rotate-right` (spin), `fa-file-pdf`, `fa-asterisk`, `fa-circle-notch` (spin), `fa-cloud-arrow-up` | View heading, refresh, PDF link, required marker, upload button |
| `HistoryView.tsx` | `fa-clipboard-list`, `fa-rotate-right` (spin), `fa-search`, `fa-circle-exclamation` | View heading, refresh, search input, error alert |
| `RekapJurnalView.tsx`| `fa-book-open`, `fa-circle-notch` (spin), `fa-search`, `fa-file-excel`, `fa-print` | View heading, filter submit, CSV & print buttons |
| `RekapSiswaView.tsx` | `fa-users-viewfinder`, `fa-circle-notch` (spin), `fa-search`, `fa-file-excel`, `fa-print` | View heading, filter submit, CSV & print buttons |
| `AdminMonitorView.tsx`| `fa-user-clock`, `fa-rotate-right` (spin), `fa-calendar`, `fa-search`, `fa-location-dot` | View heading, refresh, date picker label, search, GPS location badge |
| `AdminVerifView.tsx` | `fa-clipboard-check`, `fa-rotate-right` (spin), `fa-calendar`, `fa-check-double`, `fa-search`, `fa-link` | View heading, refresh, batch approval, search, attachment links |
| `AdminRekapView.tsx` | `fa-file-invoice`, `fa-circle-notch` (spin), `fa-download`, `fa-caret-right`, `fa-user-check`, `fa-book`, `fa-file-excel`, `fa-print` | View heading, download button, accordion caret, metrics, export buttons |
| `AdminDataView.tsx` | `fa-database`, `fa-circle-exclamation`, `fa-info-circle`, `fa-upload`, `fa-search`, `fa-rotate-right` (spin), `fa-plus`, `fa-circle-notch` (spin), `fa-chevron-left`, `fa-chevron-right` | View heading, error/info alerts, search, refresh, add new, pagination chevrons |
| `AdminBackupView.tsx`| `fa-hard-drive`, `fa-rotate-right`, `fa-cloud-arrow-up`, `fa-cloud-arrow-down`, `fa-clock-rotate-left` | View heading, refresh, backup/restore buttons, history header |
| `AdminConfigView.tsx`| `fa-gears`, `fa-calendar`, `fa-clock`, `fa-print`, `fa-signature`, `fa-location-dot`, `fa-save` | View heading, section card headers, submit |
| `AnalitikView.tsx` | `fa-chart-pie`, `fa-circle-notch` (spin), `fa-rotate-right`, `fa-medal`, `fa-check`, `fa-book` | View heading, refresh, leaderboard header, metrics |

### 4.3 Consistency, Sizing & Optical Comfort Evaluation

#### 1. Inconsistent Header Icon Sizing
- In `AdminConfigView:103, 111, 124, 143, 156`: Section headers use `<h3 className="text-[10px] ..."><i className="fa-regular fa-calendar"></i>` with no size on `<i>`. The icon inherits `text-[10px]`, making it roughly 10px tall, which is uncomfortably small and difficult to identify.
- In `PiketView:108`, `GuruPresensi:216`, `GuruJurnal:144`, `DokumenView:97`: View headings use `<h2 className="text-lg ..."><i className="fa-solid fa-... text-green-500"></i>`. The icon inherits `text-lg` (~18px), which has comfortable optical balance with the text.
*Recommendation*: Standardize all section/subheading icons to a minimum of `text-xs` (12px) or `text-sm` (14px) so they don't appear shrunken.

#### 2. Spacing Conflicts: Margin vs Gap
- Several components mix `mr-1` / `mr-2` with flex containers that already have `gap-2` or `gap-1.5`.
  - Example (`PiketView:158`): `<h3 className="..."><i className="fa-solid fa-list-check mr-1 text-gray-400"></i> Laporan Terbaru</h3>` (inline `mr-1`).
  - Example (`DokumenView:97`): `<h2 className="... flex items-center gap-2"><i className="fa-solid fa-folder-open ..."></i> Perangkat</h2>` (flex `gap-2`).
  - Example (`AdminMonitorView:74`): `<label ...><i className="fa-regular fa-calendar"></i> Pantau Tanggal</label>` (uses plain space character ` ` instead of margin or gap).
*Recommendation*: Standardize all icon-text pairings to `inline-flex items-center gap-2` or `gap-1.5`, removing disparate `mr-1` / `mr-2` and literal whitespace strings.

#### 3. Search Bar Icon Centering
- `HistoryView:99`, `AdminMonitorView:79`, `AdminVerifView:142`:
  `<i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs"></i>` inside `py-2.5` input.
- `AdminDataView:232`:
  `<i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>` inside `py-2` input.
*Recommendation*: Standardize search container to `relative flex items-center` with icon positioned at `absolute left-3.5 top-1/2 -translate-y-1/2` to eliminate manual pixel guesswork.

#### 4. Icon Contrast in Dark Mode
- In `AdminConfigView:86`, `HistoryView:76`: Icon uses `text-gray-500 dark:text-gray-400`.
- In `HistoryView:99`, `AdminMonitorView:79`: Search icon uses `text-gray-400` with NO dark-mode color variant.
- In `HomeView:217`: Inactive/locked workflow step icons use `bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500`.
*Recommendation*: Use `dark:text-white` or theme-accented colors (`dark:text-nizamudin-gold`, `dark:text-emerald-400`) to guarantee high optical visibility.

---

## 5. Mobile-First Layout & Responsiveness Audit

### 5.1 Mobile Layout Breakages & Cramped Elements

#### Breakage 1: `AdminConfigView.tsx` 3-Column Inputs on Mobile
- **Lines 112-116**:
  ```tsx
  <div className="grid grid-cols-3 gap-3 mb-3">
      <div><label ...>Datang Buka</label><input type="time" ... /></div>
      <div><label ...>Batas Terlambat</label><input type="time" ... /></div>
      <div><label ...>Datang Tutup</label><input type="time" ... /></div>
  </div>
  ```
- **Lines 157-171**:
  ```tsx
  <div className="grid grid-cols-3 gap-3">
      <div><label ...>Latitude</label><input type="text" ... /></div>
      <div><label ...>Longitude</label><input type="text" ... /></div>
      <div><label ...>Radius (Meter)</label><input type="number" ... /></div>
  </div>
  ```
- **Observation**: On mobile devices (viewports 320px - 390px), dividing the width into 3 columns plus 2 gaps results in column widths of less than 95px. `input[type="time"]` controls on iOS and Android have browser-native clock pickers and AM/PM badges that clip and overflow. Latitude coordinates (`-6.200000`) get cut off horizontally.
- **Remedy**: Change `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`.

#### Breakage 2: `RekapSiswaView.tsx` Wide Table Overflow
- **Lines 144-173**:
  ```tsx
  <div className="overflow-x-auto border border-gray-200 ...">
      <table className="w-full text-[10px] text-left ... whitespace-nowrap">
        ... (No, NISN, Nama Siswa, Sakit, Izin, Alpa)
  ```
- **Observation**: While wrapped in `overflow-x-auto`, tables with `whitespace-nowrap` force horizontal swiping on mobile viewports. On phone screens, this obscures the attendance numbers (Sakit/Izin/Alpa) off-screen to the right.
- **Remedy**: Ensure cell padding is compact on mobile (`px-2 py-1.5 sm:px-3 sm:py-2`), set max-w constraints on `Nama Siswa`, or provide a mobile card view.

#### Breakage 3: `AdminDataView.tsx` Header Action Crowding
- **Lines 229-243**:
  ```tsx
  <div className="flex justify-between items-center mb-4 gap-2">
      <div className="relative flex-grow">
          <input ... placeholder="Cari data..." />
      </div>
      <div className="flex gap-1.5 shrink-0">
          <button ... className="w-8 h-8 ..."><i className="fa-solid fa-rotate-right"></i></button>
          <button ... className="px-3 h-8 ..."><i className="fa-solid fa-plus"></i> Baru</button>
      </div>
  </div>
  ```
- **Observation**: On 320px-360px screens, the search bar has under 150px remaining width because the refresh button (32px) and "+ Baru" button (~68px) and gaps consume over 110px.
- **Remedy**: Change "+ Baru" button on mobile to an icon-only button (`<span className="hidden sm:inline">Baru</span>`) or flex-wrap the controls.

#### Breakage 4: `HomeView.tsx` Lateness Banner Crowding
- **Lines 261-279**:
  ```tsx
  <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border ... flex items-center justify-between">
      <div className="flex items-center gap-3">...</div>
      {akumulasiTelat.alpa > 0 && (
        <div className="text-right">...</div>
      )}
  </div>
  ```
- **Observation**: When `akumulasiTelat.alpa > 0`, the left block ("Akumulasi Keterlambatan Bulan Ini" + 3 numbers) and right block ("Potongan Alpa" + "X Hari") collide horizontally on narrow screens (<360px).
- **Remedy**: Add `flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center`.

#### Breakage 5: `AdminRekapView.tsx` Status Mini-Cards
- **Lines 143-150**:
  Inside each teacher's card, there is a `grid grid-cols-3 gap-1 text-center`. Inside the 6th item ("TELAT"):
  `{Math.floor(p.telatDetik / 3600)}j {Math.floor((p.telatDetik % 3600) / 60)}m`
- **Observation**: In a 3-column subgrid within a mobile card, a box width of ~85px causes "Xj Ym" to wrap onto two lines, breaking vertical alignment.
- **Remedy**: Ensure `whitespace-nowrap leading-none` or format cleanly as `Xj Ym`.

---

## 6. Actionable Implementation Roadmap (CSS/Tailwind Only)

All improvements can be achieved strictly through CSS and Tailwind class modifications, fulfilling the zero-logic-change constraint:

### Phase 1: Update Global Design System (`src/app/globals.css`)
1. **Fix `.form-label`**:
   ```css
   .form-label {
     @apply block text-[11px] font-bold text-black mb-1.5 ml-1;
   }
   .dark .form-label {
     @apply text-white;
   }
   ```
2. **Refine `.input-premium` Placeholder**:
   ```css
   .dark .input-premium::placeholder {
     @apply text-slate-400; /* upgraded from text-slate-500 for legibility */
   }
   ```
3. **Add SweetAlert2 Dark Mode Overrides** in `globals.css`:
   Ensure `.dark .swal2-popup` renders with dark background `#1e1e1e`, pure white title/content text (`text-white`), and matching borders.

### Phase 2: Standardize Form Labels across All 17 Views
- Replace all instances of `text-gray-500 dark:text-gray-400` on `<label>` elements with `text-black dark:text-white` or `form-label`.

### Phase 3: Enforce Pure White (`dark:text-white`) on Card Titles & Metadata
- In all 17 components, replace `text-gray-800 dark:text-gray-100` / `dark:text-gray-200` with `text-black dark:text-white`.
- Upgrade dim metadata text (`dark:text-gray-400`) to `dark:text-white` or `dark:text-gray-100`.
- Add missing `dark:text-white` variants to pagination counts, search icons, and timestamps.

### Phase 4: Mobile-First Grid Adjustments
- In `AdminConfigView.tsx`: Replace `grid-cols-3` with `grid-cols-1 sm:grid-cols-3` for Jam Presensi and GPS Coordinates.
- In `AdminDataView.tsx`: Hide "Baru" text on small mobile screens (`<span className="hidden sm:inline"> Baru</span>`).
- In `HomeView.tsx`: Update lateness container to `flex flex-col sm:flex-row`.
- In `RekapSiswaView.tsx`: Optimize table cell padding for mobile (`px-2 py-2 sm:px-3 sm:py-2`).

### Phase 5: Icon Styling Normalization
- Enforce minimum sizing (`text-xs` or `text-sm`) on shrunken icons (e.g. `AdminConfigView` subheadings).
- Standardize search icon positioning with `top-1/2 -translate-y-1/2`.
- Convert icon-text pairings to `inline-flex items-center gap-1.5` or `gap-2` instead of disparate `mr-1` / `mr-2`.
