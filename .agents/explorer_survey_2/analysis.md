# Comprehensive UI/UX Audit & Refactoring Analysis: Core Pages & Views

**Project:** SIPJAM SMA Nizamudin (`c:\Users\Fitra\OneDrive\Documents\sipjam-app`)  
**Auditor / Agent:** `explorer_survey_2` (Read-only Core Pages & Views Explorer)  
**Date:** 2026-09-11  
**Scope:** Survey of all core feature pages, routes, and view components across `src/app` and `src/components`.

---

## 1. Executive Summary & Inventory of Core Views

The SIPJAM application is architected as a Next.js 15 (App Router) single-page dashboard application. Routing is driven dynamically by state (`currentView`) inside `src/components/AppScreen.tsx`, rendering distinct modular view components depending on user role (`Guru` or `Admin`).

### Inventory of Surveyed Files
| View ID / Route | Component File | Role / Purpose |
|---|---|---|
| *Auth Entry* | `src/components/LoginScreen.tsx` | Authentication screen |
| *App Shell* | `src/components/AppScreen.tsx` | Top bar navigation, slide-out drawer menu, view router |
| `view-home` | `src/components/HomeView.tsx` | Dashboard: user profile banner, daily workflow tracker, monthly lateness widget, activity shortcut grid |
| `view-guru-presensi` | `src/components/GuruPresensi.tsx` | Teacher attendance (Datang/Pulang), GPS coordinate calculation, leave attachment upload |
| `view-guru-jurnal` | `src/components/GuruJurnal.tsx` | Teaching journal (KBM / Kegiatan), live class student attendance checklist (H/S/I/A) |
| `view-piket` | `src/components/PiketView.tsx` | Duty teacher module: schedule viewer, daily duty report form, multi-class attendance tracker |
| `view-dokumen` | `src/components/DokumenView.tsx` | Teaching devices/documents repository, document list cards, file upload form |
| `view-history` | `src/components/HistoryView.tsx` | Personal history: Presensi & Jurnal logs, search filter, responsive card grid, pagination |
| `view-guru-rekap-jurnal`| `src/components/RekapJurnalView.tsx` | Personal journal summary, multi-filter selector, journal entry cards, CSV/Print exporter |
| `view-rekap-siswa` | `src/components/RekapSiswaView.tsx` | Student attendance recap, filter criteria, horizontal-scrolling data table, CSV/Print exporter |
| `view-admin-monitor` | `src/components/AdminMonitorView.tsx` | Daily live attendance monitor with Supabase Realtime subscriptions, search, card grid |
| `view-admin-verif` | `src/components/AdminVerifView.tsx` | Admin verification for presensi and journals, bulk approve, status toggles |
| `view-admin-rekap` | `src/components/AdminRekapView.tsx` | Final monthly recapitulation, automatic alpa calculator, custom date filter, teacher recap cards |
| `view-admin-data` | `src/components/AdminDataView.tsx` | Master data viewer (Siswa, Guru, Mapel, Kalender, Jadwal), search, card grid, pagination |
| `view-admin-backup` | `src/components/AdminBackupView.tsx` | Database backup & restore via Google Sheets webhook, backup history log |
| `view-admin-config` | `src/components/AdminConfigView.tsx` | System settings: academic year, school hours, lateness threshold, letterhead kop, GPS coordinates |
| `view-analitik` | `src/components/AnalitikView.tsx` | Monthly school analytics, attendance percentage bars, top 10 leaderboard |
| *Print Shared* | `src/components/PrintHeader.tsx` | Formal letterhead kop and signature blocks for print stylesheets |

---

## 2. Key Audit Findings & Systematic Issues

### Finding 1: Incomplete Dark Mode Typography & Contrast Degradation (Violation of R1)
1. **Pervasive low-contrast gray text in dark mode:**
   - Instead of pure white (`dark:text-white`) or high-contrast equivalents, hundreds of elements across all 15 views use `dark:text-gray-400`, `dark:text-gray-300`, `dark:text-gray-200`, or `dark:text-gray-100`.
   - In dark mode with background `#121212` and card background `#1e1e1e`, `dark:text-gray-400` yields a contrast ratio below WCAG AA thresholds (often < 3.5:1), making labels, timestamps, metadata, and table bodies unreadable.
   - For example:
     - Form labels: `text-gray-500 dark:text-gray-400` across `GuruPresensi`, `GuruJurnal`, `DokumenView`, `RekapJurnalView`, `RekapSiswaView`, and `AdminConfigView`.
     - Card titles: `text-gray-800 dark:text-gray-100` or `text-gray-800 dark:text-gray-200` in `AdminMonitorView`, `AdminVerifView`, `AdminDataView`, `HistoryView`, and `HomeView`.
2. **Missing dark mode text classes:**
   - Pagination text (`<span className="text-[10px] text-gray-400 font-medium">`) in `HistoryView`, `AdminDataView`, and `AdminVerifView` completely lacks any `dark:text-*` class, causing text to fade into dark card backgrounds.
   - Backup timestamp in `AdminBackupView` (`<div className="text-[9px] text-gray-400 text-right">`) lacks dark mode variants.
   - Table cell contents in `RekapSiswaView` (`<td className="px-3 py-2 text-center font-bold">`) lack dark text styling.
3. **Hardcoded medium-dark text without dark variants in light mode:**
   - Many titles and labels use `text-gray-800` or `text-gray-700` instead of high-clarity pure dark/black (`text-gray-900` or `text-black`) in light mode and `dark:text-white` in dark mode.

### Finding 2: Desktop-First Rigid Layouts & Mobile Viewport Overflow (Violation of R2)
1. **Unresponsive multi-column grids (`grid-cols-2` and `grid-cols-3`):**
   - In `AdminConfigView`:
     - Line 112: `grid grid-cols-3 gap-3 mb-3` for time inputs (`jam_datang_mulai`, `jam_datang_batas`, `jam_datang_akhir`). On standard mobile viewports (360px–390px), rendering 3 native time pickers side-by-side causes extreme layout squishing and horizontal overflow.
     - Line 157: `grid grid-cols-3 gap-3` for GPS latitude, longitude, and radius.
     - Lines 89, 104, 117: `grid grid-cols-2 gap-3` without mobile fallback `grid-cols-1 sm:grid-cols-2`.
   - In `GuruPresensi.tsx`:
     - Line 227: `grid grid-cols-2 gap-3` for Tipe Absen and Kondisi selects causes text clipping on smaller phones (< 375px).
   - In `GuruJurnal.tsx`:
     - Line 164: `grid grid-cols-2 gap-3` for Mapel and Kelas.
     - Line 186: `grid grid-cols-2 gap-3` for Tanggal and Materi.
   - In `AnalitikView.tsx`:
     - Line 106: `grid grid-cols-2 gap-4 mb-5` for Total Hadir and Total Jurnal stat cards.
2. **Container Padding & Flex Wrapping on Mobile:**
   - In `HomeView.tsx`: Line 261 Lateness info card uses `flex items-center justify-between` which on narrow screens forces text and "Potongan Alpa" badge to collide; should be `flex flex-col sm:flex-row sm:items-center justify-between gap-2`.
   - In `LoginScreen.tsx`: Line 54 has `p-8` which consumes excessive horizontal padding on small screens; should be `p-6 sm:p-8`.

### Finding 3: Iconography Inconsistencies & Dark Mode Visibility
1. **Inconsistent icon colors and missing dark variants:**
   - `GuruPresensi.tsx` (Line 216): `<i className="fa-solid fa-right-to-bracket text-green-500"></i>` lacks dark-mode variant (should be `text-green-600 dark:text-green-400`).
   - `HistoryView.tsx` (Line 76) and `AdminConfigView.tsx` (Line 86): header icons use dull gray `text-gray-500 dark:text-gray-400` whereas all other views use distinctive, vibrant, pleasant colors (e.g. `text-indigo-500 dark:text-indigo-400`, `text-teal-500 dark:text-teal-400`, `text-rose-500 dark:text-rose-400`).
2. **Icon sizing:**
   - In `HomeView.tsx` shortcut buttons: icons are `text-xl` inside `w-12 h-12` squircle containers—this is pleasing and consistent.
   - However, in header titles, some views use `text-lg font-bold ... gap-2` with unconstrained icon sizes, while buttons use inconsistent icon margins (`mr-1`, `mr-1.5`, `mr-2`).

---

## 3. Detailed View-by-View Audit & Specific Class Recommendations

---

### View 1: `src/components/LoginScreen.tsx`
- **Route / Component:** Auth Entry Screen (`<LoginScreen />`)
- **Container Layout:** `flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden h-full`
- **Audit Findings:**
  - Card padding `p-8` is slightly oversized on 320px–360px mobile viewports.
  - Subheading subtitle `text-gray-500 dark:text-gray-400` has lower contrast in dark mode.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 54 | `glass-card w-full max-w-md p-8 border-t-4 border-nizamudin-green dark:border-nizamudin-gold text-center relative z-10 mx-auto` | `glass-card w-full max-w-md p-6 sm:p-8 border-t-4 border-nizamudin-green dark:border-nizamudin-gold text-center relative z-10 mx-auto` | Improved mobile fit on compact screens |
| 58 | `text-2xl font-bold text-gray-800 dark:text-white tracking-tight mb-1` | `text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1` | Pure dark text in light mode |
| 59 | `text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6` | `text-[11px] font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-widest mb-6` | High contrast subtitle in dark mode |
| 85 | `btn-click w-full bg-nizamudin-green text-white dark:text-nizamudin-gold font-bold py-3.5 rounded-2xl shadow-md mt-6 text-sm flex justify-center items-center gap-2 disabled:opacity-50` | `btn-click w-full bg-nizamudin-green text-white dark:text-white font-bold py-3.5 rounded-2xl shadow-md mt-6 text-sm flex justify-center items-center gap-2 disabled:opacity-50 hover:bg-opacity-95 transition-all` | Standard white typography on green button |

---

### View 2: `src/components/AppScreen.tsx`
- **Route / Component:** Shell & Main Navigation (`<AppScreen />`)
- **Audit Findings:**
  - Sidebar drawer buttons use `text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800` which has suboptimal dark contrast.
  - Close button in sidebar uses `text-gray-400 hover:text-gray-600 dark:hover:text-gray-200`.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 122 | `btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700` | `btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700` | Pure white icon in dark mode |
| 125 | `text-sm md:text-base font-bold text-gray-800 dark:text-white cursor-pointer` | `text-sm md:text-base font-bold text-gray-900 dark:text-white cursor-pointer` | Standardized header title |
| 131 | `btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-nizamudin-gold shadow-sm border border-gray-200 dark:border-gray-700` | `btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-800 dark:text-nizamudin-gold shadow-sm border border-gray-200 dark:border-gray-700` | Clean high-contrast theme toggle |
| 150 | `font-bold text-sm text-gray-800 dark:text-white` | `font-bold text-sm text-gray-900 dark:text-white` | High-contrast drawer header |
| 152 | `w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200` | `w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white` | Clearly visible close button |
| 164 | `text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 border border-transparent` | `text-gray-700 hover:bg-gray-100 dark:text-white/90 dark:hover:bg-gray-800 border border-transparent` | High contrast menu text in dark mode |

---

### View 3: `src/components/HomeView.tsx`
- **Route / Component:** Dashboard (`view-home` / `<HomeView />`)
- **Audit Findings:**
  - Status tracker section titles use `text-gray-800 dark:text-gray-100`.
  - Locked step detail text uses `'text-gray-400 dark:text-gray-600'`—`dark:text-gray-600` on dark card background (`#1e1e1e`) is practically invisible!
  - Lateness info card layout can wrap awkwardly on narrow viewports (<360px).
  - Activity section header and grid button labels use `text-gray-800 dark:text-gray-200`.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 192 | `text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2` | `text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2` | Strict contrast compliance (R1) |
| 235 | `'text-gray-400 dark:text-gray-500'` (locked label) | `'text-gray-500 dark:text-white/60'` | Legible locked step header |
| 243 | `'text-gray-400 dark:text-gray-600'` (locked detail) | `'text-gray-500 dark:text-white/50'` | Critical contrast fix: replace unreadable gray-600 on dark |
| 261 | `mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between` | `mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5` | Responsive wrapping on narrow screens |
| 267 | `text-[10px] font-bold text-slate-500 dark:text-slate-400` | `text-[10px] font-bold text-slate-600 dark:text-white/80` | Legible metadata text |
| 268 | `text-xs font-black text-slate-700 dark:text-slate-200` | `text-xs font-black text-slate-900 dark:text-white` | Clear prominent lateness count |
| 285 | `text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 px-1` | `text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-3 px-1` | Strict contrast compliance |
| 286 | `grid grid-cols-2 gap-3 sm:grid-cols-4` | `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3` | Optimized adaptive grid spacing |
| 294 | `font-bold text-[11px] sm:text-xs text-gray-800 dark:text-gray-200` | `font-bold text-[11px] sm:text-xs text-gray-900 dark:text-white` | Card button label contrast |

---

### View 4: `src/components/GuruPresensi.tsx`
- **Route / Component:** Teacher Attendance (`view-guru-presensi` / `<GuruPresensi />`)
- **Audit Findings:**
  - Header icon `<i className="fa-solid fa-right-to-bracket text-green-500"></i>` lacks dark-mode variant.
  - Line 227: `grid grid-cols-2 gap-3` for Tipe Absen and Kondisi / Sifat forces inputs to be narrow on small screens; should have responsive mobile stacking.
  - Labels use `text-gray-500 dark:text-gray-400` and `text-gray-700 dark:text-gray-300`.
  - Refresh API link uses `text-[9px] text-blue-500 dark:text-blue-400`.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 216 | `text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2` and `i ... text-green-500` | `text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2` and `i ... text-green-600 dark:text-green-400` | Pure white title and adaptive icon |
| 227 | `grid grid-cols-2 gap-3` | `grid grid-cols-1 sm:grid-cols-2 gap-3` | Mobile-first single column fallback to prevent squishing |
| 229 | `block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1` | `block text-[11px] font-bold text-gray-700 dark:text-white mb-1.5 ml-1` | Standardized high-contrast label |
| 236 | `block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1` | `block text-[11px] font-bold text-gray-700 dark:text-white mb-1.5 ml-1` | Standardized high-contrast label |
| 263 | `block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-2 flex justify-between items-center` | `block text-[11px] font-bold text-gray-900 dark:text-white mb-2 flex justify-between items-center` | High contrast label |
| 272 | `w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white ...` | `w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ...` | Pure black text in light mode |
| 287 | `block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 flex justify-between` | `block text-[11px] font-bold text-gray-700 dark:text-white mb-1.5 ml-1 flex justify-between` | High contrast GPS label |

---

### View 5: `src/components/GuruJurnal.tsx`
- **Route / Component:** Teaching Journal (`view-guru-jurnal` / `<GuruJurnal />`)
- **Audit Findings:**
  - Header title `text-gray-800 dark:text-white`.
  - Rigid `grid grid-cols-2 gap-3` on lines 164 (Mapel/Kelas) and 186 (Tanggal/Materi).
  - All form labels use `text-gray-500 dark:text-gray-400`.
  - Student attendance checklist uses `text-gray-800 dark:text-gray-200` for names and `text-gray-500 dark:text-gray-400` for NISN.
  - Inactive attendance buttons (`H`, `S`, `I`, `A`) use `dark:bg-gray-700 dark:text-gray-400`.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 144 | `text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2` | Pure dark header text |
| 156, 166, 175, 188, 192, 198, 250, 255 | `block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1` | `block text-[11px] font-bold text-gray-700 dark:text-white mb-1.5 ml-1` | Strict contrast compliance across all form labels |
| 164 | `grid grid-cols-2 gap-3 fade-in` | `grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in` | Mobile-first single column layout |
| 186 | `grid grid-cols-2 gap-3` | `grid grid-cols-1 sm:grid-cols-2 gap-3` | Mobile-first single column layout |
| 205 | `text-gray-800 dark:text-white` | `text-gray-900 dark:text-white` | High contrast text in light mode |
| 211 | `text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2` | `text-[11px] font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2` | High contrast live attendance title |
| 220 | `text-xs font-bold text-gray-800 dark:text-gray-200` | `text-xs font-bold text-gray-900 dark:text-white` | Pure white student name in dark mode |
| 221 | `text-[9px] text-gray-500 dark:text-gray-400` | `text-[9px] text-gray-600 dark:text-white/70` | Legible student NISN |
| 236 | `dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600` | `dark:bg-gray-700 dark:text-white/80 dark:hover:bg-gray-600` | Clear attendance status button in dark mode |

---

### View 6: `src/components/PiketView.tsx`
- **Route / Component:** Duty Teacher Module (`view-piket` / `<PiketView />`)
- **Audit Findings:**
  - Header refresh button uses `text-gray-600 dark:text-gray-300`.
  - Inactive tabs use `bg-gray-50 text-gray-600 border border-transparent dark:bg-gray-800 dark:text-gray-300`.
  - Recent reports and schedule lists use `text-gray-800 dark:text-gray-200` for reporter name and `text-gray-600 dark:text-gray-400` for notes.
  - Class student attendance picker has `text-gray-800 dark:text-gray-200` for student names.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 108 | `text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2` | Pure dark header text |
| 111 | `btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center` | `btn-click bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center` | High contrast refresh button |
| 125, 132 | `... dark:text-gray-300` (inactive tab) | `... dark:text-white/80 dark:hover:text-white` | Clear tab labels in dark mode |
| 151 | `text-[10px] text-gray-600 dark:text-gray-300 mt-0.5` | `text-[10px] text-gray-700 dark:text-white/90 mt-0.5` | Duty teacher roster contrast |
| 158 | `text-xs font-bold text-gray-700 dark:text-gray-300` | `text-xs font-bold text-gray-900 dark:text-white` | Section header contrast |
| 166 | `font-bold text-xs text-gray-800 dark:text-gray-200` | `font-bold text-xs text-gray-900 dark:text-white` | Reporter name contrast |
| 169 | `text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2` | `text-[10px] text-gray-700 dark:text-white/80 line-clamp-2` | Notes preview contrast |
| 184, 244, 248 | `block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1` | `block text-[11px] font-bold text-gray-700 dark:text-white mb-1.5 ml-1` | Form label contrast |
| 201 | `bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700` | `bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-white/90 dark:border-gray-700` | Class selection pill contrast |
| 215 | `text-xs font-bold text-gray-800 dark:text-gray-200` | `text-xs font-bold text-gray-900 dark:text-white` | Student name contrast |
| 216 | `text-[9px] text-gray-500 dark:text-gray-400` | `text-[9px] text-gray-600 dark:text-white/70` | Student NISN contrast |

---

### View 7: `src/components/DokumenView.tsx`
- **Route / Component:** Teaching Devices (`view-dokumen` / `<DokumenView />`)
- **Audit Findings:**
  - Header refresh button uses `text-gray-600 dark:text-gray-300`.
  - Inactive tab buttons use `border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700`.
  - Document cards use `text-gray-500 dark:text-gray-400 mt-1` for timestamp.
  - Admin note uses `text-gray-700 dark:text-gray-300` and `text-gray-600 dark:text-gray-400`.
  - "Buka Dokumen" button uses `text-gray-700 dark:text-gray-200`.
  - Form labels use `text-gray-500 dark:text-gray-400`.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 96 | `text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2` | Pure dark header text |
| 99 | `btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center` | `btn-click bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center` | High contrast button |
| 108, 114 | `border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700` | `border-gray-200 text-gray-700 dark:text-white/80 dark:border-gray-700` | Tab pill readability |
| 138 | `text-[10px] text-gray-500 dark:text-gray-400 mt-1` | `text-[10px] text-gray-600 dark:text-white/70 mt-1` | Legible timestamp |
| 142 | `font-bold block mb-0.5 text-gray-700 dark:text-gray-300` | `font-bold block mb-0.5 text-gray-900 dark:text-white` | Admin note title contrast |
| 143 | `text-gray-600 dark:text-gray-400 italic` | `text-gray-700 dark:text-white/80 italic` | Admin note content contrast |
| 148 | `text-gray-700 dark:text-gray-200 py-2 rounded-lg transition-colors` | `text-gray-900 dark:text-white py-2 rounded-lg transition-colors` | Document link button text contrast |
| 162, 174, 178 | `block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1` | `block text-[11px] font-bold text-gray-700 dark:text-white mb-1.5 ml-1` | Form label contrast |

---

### View 8: `src/components/HistoryView.tsx`
- **Route / Component:** Personal History (`view-history` / `<HistoryView />`)
- **Audit Findings:**
  - Header icon `<i className="fa-solid fa-clipboard-list text-gray-500 dark:text-gray-400"></i>` is visually dull compared to other views.
  - Inactive tabs use `text-gray-500 dark:text-gray-400`.
  - Card titles use `text-gray-800 dark:text-gray-100`.
  - Card detail text uses `text-gray-600 dark:text-gray-300`.
  - Pagination text: `<span className="text-[10px] text-gray-400 font-medium">` completely lacks `dark:text-*` styling!

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 75 | `text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2` | Pure dark header text |
| 76 | `text-gray-500 dark:text-gray-400` | `text-emerald-500 dark:text-emerald-400` | Visually appealing themed icon matching feature color |
| 78 | `text-gray-600 dark:text-gray-300` | `text-gray-800 dark:text-white` | Refresh button contrast |
| 86, 93 | `text-gray-500 dark:text-gray-400` (inactive tab) | `text-gray-700 dark:text-white/80` | Tab contrast |
| 124, 139 | `text-xs font-bold text-gray-800 dark:text-gray-100` | `text-xs font-bold text-gray-900 dark:text-white` | Card title contrast |
| 131, 146 | `text-[10px] text-gray-600 dark:text-gray-300 space-y-1` | `text-[10px] text-gray-700 dark:text-white/90 space-y-1` | Card details contrast |
| 158 | `text-[10px] text-gray-400 font-medium` | `text-[10px] text-gray-600 dark:text-white/70 font-medium` | Fix missing dark-mode class on pagination |
| 166, 173 | `border border-gray-200 dark:border-gray-700 dark:text-gray-300` | `border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white` | Pagination buttons contrast |

---

### View 9: `src/components/RekapJurnalView.tsx`
- **Route / Component:** Personal Journal Summary (`view-guru-rekap-jurnal` / `<RekapJurnalView />`)
- **Audit Findings:**
  - Form labels use `text-[10px] text-gray-500 dark:text-gray-400 mb-1`.
  - Card titles use `text-gray-800 dark:text-gray-200 font-semibold`.
  - Card metadata and labels use `text-gray-700 dark:text-gray-300` and `text-gray-500 dark:text-gray-400`.
  - Grid layout is already responsive (`grid-cols-1 sm:grid-cols-2`).

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 67 | `text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2` | Pure dark header text |
| 73, 77, 83, 90 | `block text-[10px] text-gray-500 dark:text-gray-400 mb-1` | `block text-[10px] font-bold text-gray-700 dark:text-white mb-1` | High contrast filter labels |
| 119 | `text-[11px] text-gray-800 dark:text-gray-200 font-semibold` | `text-[11px] text-gray-900 dark:text-white font-bold` | Card subject/class contrast |
| 120 | `text-[10px] text-gray-600 dark:text-gray-400` | `text-[10px] text-gray-700 dark:text-white/80` | Card content text contrast |
| 121, 122, 123 | `font-semibold text-gray-700 dark:text-gray-300` | `font-semibold text-gray-900 dark:text-white` | Sub-label contrast |
| 126 | `text-[9px] font-bold text-gray-500 dark:text-gray-400 mb-1` | `text-[9px] font-bold text-gray-700 dark:text-white mb-1` | Absensi label contrast |
| 127 | `text-[10px] text-gray-600 dark:text-gray-400` | `text-[10px] text-gray-700 dark:text-white/90` | Absensi data text contrast |

---

### View 10: `src/components/RekapSiswaView.tsx`
- **Route / Component:** Student Attendance Recap (`view-rekap-siswa` / `<RekapSiswaView />`)
- **Audit Findings:**
  - Table element has body text `text-gray-500 dark:text-gray-400` which makes numbers and cell text faint in dark mode.
  - Table header uses `text-gray-700 dark:text-gray-300`.
  - Student names in rows use `text-gray-800 dark:text-gray-200`.
  - Cell numbers for Sakit and Izin (`<td className="px-3 py-2 text-center font-bold">`) lack explicit dark text color, inheriting faint gray-400.
  - Has `overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl custom-scroll` wrapper, which correctly prevents mobile viewport blowout.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 107 | `text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2` | Pure dark header text |
| 113, 117, 123, 130 | `block text-[10px] text-gray-500 dark:text-gray-400 mb-1` | `block text-[10px] font-bold text-gray-700 dark:text-white mb-1` | Filter label contrast |
| 145 | `w-full text-[10px] text-left text-gray-500 dark:text-gray-400 whitespace-nowrap` | `w-full text-[10px] text-left text-gray-700 dark:text-white/90 whitespace-nowrap` | Table body general text contrast |
| 146 | `text-[9px] text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700` | `text-[9px] font-bold text-gray-900 dark:text-white uppercase bg-gray-50 dark:bg-gray-700` | Table header contrast |
| 161 | `px-3 py-2 font-bold text-gray-800 dark:text-gray-200` | `px-3 py-2 font-bold text-gray-900 dark:text-white` | Student name table cell contrast |
| 162, 163 | `px-3 py-2 text-center font-bold` | `px-3 py-2 text-center font-bold text-gray-800 dark:text-white` | Absence counts contrast |

---

### View 11: `src/components/AdminMonitorView.tsx`
- **Route / Component:** Daily Live Monitor (`view-admin-monitor` / `<AdminMonitorView />`)
- **Audit Findings:**
  - Card teacher names use `text-xs font-bold text-gray-800 dark:text-gray-100 mt-2`.
  - Timestamp and location details use `text-gray-500 dark:text-gray-400` and `text-gray-400 dark:text-gray-400`.
  - Attendance condition uses `text-gray-600 dark:text-gray-300`.
  - Card grid is responsive (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 65 | `text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2` | Pure dark header text |
| 68 | `text-gray-600 dark:text-gray-300` | `text-gray-800 dark:text-white` | Refresh button contrast |
| 73 | `text-orange-800 dark:text-orange-400` | `text-orange-900 dark:text-orange-300` | Vibrant filter label |
| 97 | `text-xs font-bold text-gray-800 dark:text-gray-100 mt-2` | `text-xs font-bold text-gray-900 dark:text-white mt-2` | Teacher name card title contrast |
| 99 | `text-gray-500 dark:text-gray-400` | `text-gray-600 dark:text-white/80` | Timestamp contrast |
| 106 | `text-[10px] text-gray-600 dark:text-gray-300` | `text-[10px] text-gray-700 dark:text-white/90` | Attendance type detail contrast |
| 111 | `text-[9px] text-gray-400 dark:text-gray-400 truncate` | `text-[9px] text-gray-500 dark:text-white/70 truncate` | Location metadata contrast |

---

### View 12: `src/components/AdminVerifView.tsx`
- **Route / Component:** Verification Center (`view-admin-verif` / `<AdminVerifView />`)
- **Audit Findings:**
  - Date filter buttons and inactive tab pills use `text-gray-500 dark:text-gray-400` and `text-gray-700 dark:text-gray-300`.
  - Verification cards use `text-xs font-bold text-gray-800 dark:text-gray-100`.
  - Card details use `text-gray-600 dark:text-gray-300`.
  - Total item count indicator (`<span className="text-[10px] text-gray-400 font-medium">{displayList.length} Data</span>`) lacks dark-mode text class!

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 112 | `text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2` | Pure dark header text |
| 115 | `text-gray-600 dark:text-gray-300` | `text-gray-800 dark:text-white` | Refresh button contrast |
| 125 | `bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300` | `bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white` | Filter button text contrast |
| 134, 137 | `text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700` | `text-gray-700 dark:text-white/80 border-gray-200 dark:border-gray-700` | Tab pill contrast |
| 153 | `text-xs font-bold text-gray-800 dark:text-gray-100` | `text-xs font-bold text-gray-900 dark:text-white` | Teacher name card title contrast |
| 161, 172 | `text-[10px] text-gray-600 dark:text-gray-300 space-y-1` | `text-[10px] text-gray-700 dark:text-white/90 space-y-1` | Verification item details contrast |
| 191 | `text-[10px] text-gray-400 font-medium` | `text-[10px] text-gray-600 dark:text-white/70 font-medium` | Fix missing dark-mode class on counter |

---

### View 13: `src/components/AdminRekapView.tsx`
- **Route / Component:** Final Recapitulation (`view-admin-rekap` / `<AdminRekapView />`)
- **Audit Findings:**
  - Filter labels use `text-gray-600 dark:text-gray-400` and `text-[9px] text-gray-500 dark:text-gray-400`.
  - Section subheadings use `text-gray-700 dark:text-gray-300`.
  - Teacher names in cards use `text-gray-800 dark:text-gray-100`.
  - Slate badge in line 149 uses `text-slate-600 dark:text-slate-400` and `text-slate-700 dark:text-slate-300`.
  - Jurnal cards in line 163 use `text-gray-600 dark:text-gray-400` and `text-gray-400 dark:text-gray-400`.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 102 | `text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2` | Pure dark header text |
| 106 | `block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-2` | `block text-[11px] font-bold text-gray-800 dark:text-white mb-2` | Month selector label contrast |
| 115 | `font-bold text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer outline-none flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg` | `font-bold text-[11px] text-gray-700 dark:text-white cursor-pointer outline-none flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg` | Collapsible filter title contrast |
| 121, 125 | `block text-[9px] text-gray-500 dark:text-gray-400 mb-1` | `block text-[9px] font-bold text-gray-700 dark:text-white mb-1` | Custom date range label contrast |
| 136, 157 | `text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2` | `text-xs font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2` | Section subtitle contrast |
| 142 | `text-[11px] font-bold text-gray-800 dark:text-gray-100 mb-2 truncate` | `text-[11px] font-bold text-gray-900 dark:text-white mb-2 truncate` | Teacher card name contrast |
| 149 | `text-[8px] text-slate-600 dark:text-slate-400 font-bold` and `text-xs font-black text-slate-700 dark:text-slate-300` | `text-[8px] text-slate-700 dark:text-slate-300 font-bold` and `text-xs font-black text-slate-900 dark:text-white` | Lateness badge contrast |
| 163 | `text-[9px] font-bold text-gray-600 dark:text-gray-400 mb-1 truncate` | `text-[9px] font-bold text-gray-900 dark:text-white mb-1 truncate` | Jurnal teacher card name contrast |
| 165 | `text-[8px] text-gray-400 dark:text-gray-400` | `text-[8px] font-bold text-gray-500 dark:text-white/70` | Jurnal unit label contrast |

---

### View 14: `src/components/AdminDataView.tsx`
- **Route / Component:** Master Data (`view-admin-data` / `<AdminDataView />`)
- **Audit Findings:**
  - Tab buttons use `border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700`.
  - Card titles across all 5 data types (Siswa, Guru, Mapel, Kalender, Jadwal) use `font-bold text-xs text-gray-800 dark:text-gray-100`.
  - Card details use `text-[10px] text-gray-500 dark:text-gray-400 mt-1`.
  - Active status badges use `bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300`.
  - Pagination text (`<span className="text-[10px] text-gray-400 font-medium">`) lacks dark mode class!

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 130, 142, 154, 163, 173 | `font-bold text-xs text-gray-800 dark:text-gray-100` | `font-bold text-xs text-gray-900 dark:text-white` | Standardized high contrast card titles |
| 131, 143, 155, 164, 174 | `text-[10px] text-gray-500 dark:text-gray-400 mt-1` | `text-[10px] text-gray-700 dark:text-white/80 mt-1` | Legible metadata details in dark mode |
| 136, 148 | `bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300` | `bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white` | High contrast status badge |
| 187 | `text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2` | Pure dark header text |
| 198 | `border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700` | `border-gray-200 text-gray-700 dark:text-white/80 dark:border-gray-700` | Tab pill contrast |
| 223 | `text-gray-600 dark:text-gray-300` | `text-gray-800 dark:text-white` | Template button contrast |
| 236 | `text-gray-600 dark:text-gray-300` | `text-gray-800 dark:text-white` | Refresh button contrast |
| 268 | `text-[10px] text-gray-400 font-medium` | `text-[10px] text-gray-600 dark:text-white/70 font-medium` | Fix missing dark-mode class on pagination |

---

### View 15: `src/components/AdminBackupView.tsx`
- **Route / Component:** Data Access & Backup (`view-admin-backup` / `<AdminBackupView />`)
- **Audit Findings:**
  - Header title `text-gray-800 dark:text-white` and refresh button `text-gray-600 dark:text-gray-300`.
  - Explanation paragraph uses `text-[9px] text-gray-500 dark:text-gray-400 mb-3`.
  - History cards use `text-xs font-bold text-gray-800 dark:text-gray-200` and `text-[10px] text-gray-500 dark:text-gray-400`.
  - History timestamp uses `<div className="text-[9px] text-gray-400 text-right">` without dark mode class!

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 153 | `text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2` | Pure dark header text |
| 156 | `text-gray-600 dark:text-gray-300` | `text-gray-800 dark:text-white` | Refresh button contrast |
| 163 | `text-[9px] text-gray-500 dark:text-gray-400 mb-3` | `text-[9px] text-gray-700 dark:text-white/80 mb-3` | Clear informative text |
| 178 | `text-xs font-bold text-gray-700 dark:text-gray-300 mb-3` | `text-xs font-bold text-gray-900 dark:text-white mb-3` | Section title contrast |
| 189 | `text-xs font-bold text-gray-800 dark:text-gray-200` | `text-xs font-bold text-gray-900 dark:text-white` | Backup item title contrast |
| 190 | `text-[10px] text-gray-500 dark:text-gray-400` | `text-[10px] text-gray-600 dark:text-white/80` | Admin creator text contrast |
| 192 | `text-[9px] text-gray-400 text-right` | `text-[9px] text-gray-500 dark:text-white/70 text-right` | Fix missing dark-mode class on timestamp |

---

### View 16: `src/components/AdminConfigView.tsx`
- **Route / Component:** System Configuration (`view-admin-config` / `<AdminConfigView />`)
- **Audit Findings:**
  - Header icon `<i className="fa-solid fa-gears text-gray-500 dark:text-gray-400"></i>` lacks visual appeal and color identity.
  - Line 89: `grid grid-cols-2 gap-3` lacks mobile fallback.
  - Line 104: `grid grid-cols-2 gap-3 mb-3` lacks mobile fallback.
  - **Line 112:** `grid grid-cols-3 gap-3 mb-3` for 3 time pickers on mobile causes horizontal squeezing and clipping.
  - Line 117: `grid grid-cols-2 gap-3` lacks mobile fallback.
  - **Line 157:** `grid grid-cols-3 gap-3` for GPS coordinates on mobile causes extreme cramming.
  - All form labels across 5 setting sections use `text-gray-500 dark:text-gray-400`.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 85 | `text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2` | Pure dark header text |
| 86 | `text-gray-500 dark:text-gray-400` | `text-blue-500 dark:text-blue-400` | Distinctive themed icon |
| 89 | `grid grid-cols-2 gap-3` | `grid grid-cols-1 sm:grid-cols-2 gap-3` | Mobile-first layout |
| 91, 95 | `block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1` | `block text-[10px] font-bold text-gray-700 dark:text-white mb-1 ml-1` | Strict label contrast |
| 103, 143 | `text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase flex items-center gap-1.5` | `text-[10px] font-bold text-gray-700 dark:text-white mb-3 uppercase flex items-center gap-1.5` | Section label contrast |
| 104 | `grid grid-cols-2 gap-3 mb-3` | `grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3` | Mobile-first layout |
| 105, 106, 108 | `block text-[9px] text-gray-500 dark:text-gray-400 mb-1` | `block text-[9px] font-bold text-gray-700 dark:text-white mb-1` | Sub-label contrast |
| **112** | `grid grid-cols-3 gap-3 mb-3` | `grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3` | **Critical mobile fix: prevent 3-column time picker squishing** |
| 113, 114, 115, 118, 119 | `block text-[9px] text-gray-500 dark:text-gray-400 mb-1` | `block text-[9px] font-bold text-gray-700 dark:text-white mb-1` | Time input label contrast |
| 117 | `grid grid-cols-2 gap-3` | `grid grid-cols-1 sm:grid-cols-2 gap-3` | Mobile-first layout |
| 126, 127, 128, 129, 132, 136 | `block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5` | `block text-[9px] font-bold text-gray-700 dark:text-white mb-0.5` | Letterhead input label contrast |
| 144 | `grid grid-cols-1 sm:grid-cols-2 gap-3` | *(Keep: already mobile-first)* | Correct implementation |
| 146, 150 | `block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5` | `block text-[9px] font-bold text-gray-700 dark:text-white mb-0.5` | Signature label contrast |
| **157** | `grid grid-cols-3 gap-3` | `grid grid-cols-1 sm:grid-cols-3 gap-3` | **Critical mobile fix: prevent 3-column GPS input squishing** |
| 159, 163, 167 | `block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5` | `block text-[9px] font-bold text-gray-700 dark:text-white mb-0.5` | GPS input label contrast |

---

### View 17: `src/components/AnalitikView.tsx`
- **Route / Component:** School Analytics (`view-analitik` / `<AnalitikView />`)
- **Audit Findings:**
  - Header title uses `text-gray-800 dark:text-white`.
  - Stat cards on Line 106 use rigid `grid grid-cols-2 gap-4 mb-5`.
  - Percentage row labels on Lines 119, 128, 137 use `text-gray-600 dark:text-gray-400`.
  - Leaderboard section uses `text-gray-800 dark:text-gray-100` and `text-[9px] text-gray-500 dark:text-gray-400`.
  - Poin label on Line 178 uses `text-gray-400 dark:text-gray-500`.

| Line | Current Tailwind Classes | Recommended Replacement Classes | Rationale |
|---|---|---|---|
| 93 | `text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2` | `text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2` | Pure dark header text |
| 104 | `text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-4` | `text-[11px] font-bold text-gray-900 dark:text-white mb-4` | Section title contrast |
| 106 | `grid grid-cols-2 gap-4 mb-5` | `grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5` | Mobile-first stat card layout |
| 109 | `text-[9px] font-bold text-green-800 dark:text-green-500 uppercase tracking-wide mt-1` | `text-[9px] font-bold text-green-800 dark:text-green-400 uppercase tracking-wide mt-1` | Stat card subtitle contrast |
| 113 | `text-[9px] font-bold text-blue-800 dark:text-blue-500 uppercase tracking-wide mt-1` | `text-[9px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide mt-1` | Stat card subtitle contrast |
| 119, 128, 137 | `flex justify-between text-[10px] mb-1 font-bold text-gray-600 dark:text-gray-400` | `flex justify-between text-[10px] mb-1 font-bold text-gray-800 dark:text-white` | Attendance category percentage label contrast |
| 149 | `text-sm font-black text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2` | `text-sm font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2` | Leaderboard title contrast |
| 170 | `text-[11px] font-bold text-gray-800 dark:text-gray-100 truncate` | `text-[11px] font-bold text-gray-900 dark:text-white truncate` | Leaderboard teacher name contrast |
| 171 | `text-[9px] text-gray-500 dark:text-gray-400 flex gap-2 mt-0.5` | `text-[9px] text-gray-600 dark:text-white/80 flex gap-2 mt-0.5` | Leaderboard stats contrast |
| 178 | `text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider` | `text-[8px] text-gray-600 dark:text-white/70 font-bold uppercase tracking-wider` | Point label contrast |

---

## 4. Cross-Cutting Design Tokens & Global Consistency Guidelines

To satisfy Acceptance Criteria without altering any React state or component logic:

1. **Form Labels Rule:**
   - Standardize all `<label>` elements to: `block text-[11px] font-bold text-gray-700 dark:text-white mb-1.5 ml-1`.
   - Never use `dark:text-gray-400` for form labels, as form labels must provide effortless readability for users completing attendance or journals in dark mode.

2. **Section & Card Titles Rule:**
   - View titles: `text-lg font-bold text-gray-900 dark:text-white`.
   - Card headers: `font-bold text-xs sm:text-sm text-gray-900 dark:text-white`.
   - In light mode, avoid `text-gray-700`/`text-gray-800` for primary text; use `text-gray-900`.
   - In dark mode, replace all instances of `dark:text-gray-100`, `dark:text-gray-200`, `dark:text-gray-300`, and `dark:text-gray-400` on primary and secondary text with `dark:text-white` (primary) or `dark:text-white/80` (secondary metadata).

3. **Mobile Responsive Breakpoint Rule:**
   - Replace any bare `grid-cols-2` with `grid-cols-1 sm:grid-cols-2`.
   - Replace any bare `grid-cols-3` with `grid-cols-1 sm:grid-cols-3`.
   - Ensure all data tables remain enclosed within an `overflow-x-auto custom-scroll` container.
   - For interactive pill tabs, preserve `flex gap-2 overflow-x-auto custom-scroll pb-1` with `shrink-0` to guarantee smooth touch scrolling without page blowout.

4. **Iconography Standards:**
   - Ensure every icon has harmonious light/dark color tokens (e.g., `text-indigo-600 dark:text-indigo-400`, `text-emerald-600 dark:text-emerald-400`, `text-amber-600 dark:text-amber-400`).
   - Replace dull gray icons in section headers (`HistoryView` and `AdminConfigView`) with themed colors.

---

## 5. Implementation Roadmap for Refactoring Agents

When the refactoring agents begin implementing changes:
- **Phase 1 (Shell & Core Guru Views):**
  1. `src/components/LoginScreen.tsx`
  2. `src/components/AppScreen.tsx`
  3. `src/components/HomeView.tsx`
  4. `src/components/GuruPresensi.tsx`
  5. `src/components/GuruJurnal.tsx`
- **Phase 2 (Piket, Dokumen, Riwayat & Rekap Guru Views):**
  6. `src/components/PiketView.tsx`
  7. `src/components/DokumenView.tsx`
  8. `src/components/HistoryView.tsx`
  9. `src/components/RekapJurnalView.tsx`
  10. `src/components/RekapSiswaView.tsx`
- **Phase 3 (Admin Management & Analytics Views):**
  11. `src/components/AdminMonitorView.tsx`
  12. `src/components/AdminVerifView.tsx`
  13. `src/components/AdminRekapView.tsx`
  14. `src/components/AdminDataView.tsx`
  15. `src/components/AdminBackupView.tsx`
  16. `src/components/AdminConfigView.tsx`
  17. `src/components/AnalitikView.tsx`

Every change must strictly consist of CSS class adjustments without altering any React hooks, handlers, conditions, or component logic.
