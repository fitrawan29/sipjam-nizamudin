# Adversarial Review Report: Gradebook Unified Setup Flow & Quick Init (Round 2)

**Reviewer:** Adversarial Reviewer (Round 2)  
**Date:** 2026-10-15  
**Integrity Mode:** Development  

---

> [!WARNING] **Skepticism Disclaimer**  
> 100% of unit tests (39/39 in unified setup, 156/156 in Kurikulum Merdeka formula, 28/28 repository test suites) and Next.js 16 Turbopack production builds pass with zero errors. However, real-world cellular packet loss during high-concurrency multi-row batch upserts in rural school network environments requires ongoing telemetry monitoring.

---

## 1. What the Prior Attempt Got Wrong / Left Unaddressed

1. **Table Column Misalignment on Empty Formatif or Sumatif Columns**
   - **Input:** Teacher opens a newly created or partial TP where Formatif columns or Sumatif columns are empty (`formatifCols.length === 0` or `sumatifCols.length === 0`).
   - **Expected:** The table matrix maintain exact column alignment between `<thead>`, `<tbody>`, and `<tfoot>`.
   - **Actual:** The table header rendered `<th className="...">Belum ada formatif</th>` (1 column), but student rows in `<tbody>` and the class average row in `<tfoot>` used `.map()` over empty arrays, producing zero `<td>` cells. This caused all downstream columns (*Rerata Formatif*, *Rerata Sumatif*, *Nilai Akhir*, *Predikat*) to shift left into the wrong columns, visually corrupting the spreadsheet display.
   - **Root Cause:** In `GradebookView.tsx`, student rows (`<tbody>`) and class average footer (`<tfoot>`) lacked fallback placeholder `<td>-</td>` cells when `formatifCols.length === 0` or `sumatifCols.length === 0`.

2. **Orphaned Headless TP State After Network Disconnect Mid-Insert (Open Ledger Item #1)**
   - **Input:** A client device drops internet connection permanently right after creating a TP in `tujuan_pembelajaran` but before inserting assessment columns in `asesmen_kolom`, or loads an empty TP created without columns.
   - **Expected:** When re-selected or fetched, the system automatically detects that the TP has 0 assessment columns and self-heals by provisioning the required Kurikulum Merdeka triplet (Diagnostik, Formatif 1, Sumatif 1).
   - **Actual:** Prior `fetchColumnsForActiveTP` only checked `hasDiagnostik` and inserted a single Diagnostik column if missing, leaving the TP with 0 Formatif and 0 Sumatif columns, rendering it unusable for grade input without manual multi-step column additions.
   - **Root Cause:** Missing complete auto-heal check `if (cols.length === 0)` in `fetchColumnsForActiveTP`.

3. **Stale Semester Column Cache and Missing Reactive Grade Recalculation on Column Add/Delete (Open Ledger Item #3)**
   - **Input:** Teacher adds, edits, or deletes an assessment column within the Unified Setup Panel while reviewing or switching to semester summaries.
   - **Expected:** The semester recap and student final grades immediately recalculate based on the updated column set without needing a page refresh.
   - **Actual:** `allSemesterColumns` was only populated when switching to `activeTab === 'rekap-semester'` or when `tpList` changed. Adding or deleting columns inside `fetchColumnsForActiveTP` did not synchronize `allSemesterColumns`, leaving semester final calculations stale in memory.
   - **Root Cause:** `fetchColumnsForActiveTP` updated local `columnsList` but never synced `allSemesterColumns[activeTpId]`.

4. **Low OLED Dark Mode Border and Text Contrast in Unified Setup Cards (Open Ledger Item #2)**
   - **Input:** Teacher uses SIPJAM Gradebook on an OLED mobile device in dark mode.
   - **Expected:** Card boundaries and empty state messages are distinct and meet WCAG AA contrast standards.
   - **Actual:** Cards used semi-transparent borders `border-gray-200/80 dark:border-gray-700/70` with `dark:bg-gray-900/50`, appearing washed out and lacking crisp separation on OLED displays. Empty state messages used `text-gray-400 dark:text-gray-500` which has poor readability.
   - **Root Cause:** Weak Tailwind opacity modifier classes on dark mode borders and muted text.

5. **Newly Created TP Not Automatically Selected in Manual Creation Flow**
   - **Input:** Teacher manually creates a new TP via `handleSaveTp` inside the Unified Setup Panel.
   - **Expected:** Newly created TP is immediately selected as active in the matrix so the teacher can begin grading right away.
   - **Actual:** `handleSaveTp` refreshed `fetchTPs()` but did not set `setSelectedTpId(created.id)`, leaving the previous TP selected.
   - **Root Cause:** Missing `setSelectedTpId(created.id)` call after successful insert in `handleSaveTp`.

---

## 2. What I Changed

### 2.1 Codebase Modifications

1. **`src/components/GradebookView.tsx`**
   - **Auto-Heal Empty/Orphaned TPs:** In `fetchColumnsForActiveTP`, added `if (cols.length === 0)` block that automatically provisions the complete Kurikulum Merdeka triplet (Diagnostik, Formatif 1, Sumatif 1) upon detecting 0 columns.
   - **Immediate Semester Cache Synchronization:** Added `setAllSemesterColumns(prev => ({ ...prev, [activeTpId]: cols }))` inside `fetchColumnsForActiveTP` so that any column addition, edit, deletion, or auto-healing immediately reflects in `calculateStudentSemesterStats` without page reload.
   - **Auto-Select Created TP:** In `handleSaveTp`, added `setSelectedTpId(created.id)` when `created?.id` is returned.
   - **OLED Dark Mode Visual Contrast:** Upgraded Unified Setup Panel card containers from `bg-gray-50 dark:bg-gray-900/50 border-gray-200/80 dark:border-gray-700/70` to solid `bg-gray-50 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700`. Upgraded empty-state instructional text from `text-gray-400 dark:text-gray-500` to `text-gray-500 dark:text-gray-400`.
   - **Table Matrix Cell Alignment:** In `<tbody>` student rows and `<tfoot>` class average row, added fallback placeholder `<td className="...">-</td>` cells when `formatifCols.length === 0` or `sumatifCols.length === 0`, ensuring 1:1 column count alignment with `<thead>`.

2. **`tests/gradebook_unified_setup_flow.test.ts`**
   - Added Tier 6 Verification Suite (R6.1 - R6.5):
     - `R6.1`: Auto-heal provisions complete KM assessment triplet if orphaned TP has 0 columns.
     - `R6.2`: Immediate synchronization of `allSemesterColumns` cache enables reactive grade recalculation without reload.
     - `R6.3`: Auto-select newly created TP on manual creation in `handleSaveTp`.
     - `R6.4`: Unified setup cards and empty states adhere to solid OLED dark mode contrast standards.
     - `R6.5`: Spreadsheet matrix table rows in `<tbody>` and `<tfoot>` maintain cell alignment when columns are empty.
   - Total assertions increased from 34 to 39 (100% PASS).

---

## 3. Verification Record

### Deep Verification (Ran Actual Tests)

1. **`npx tsx tests/gradebook_unified_setup_flow.test.ts`**
   - **Result:** `39/39 PASSED (100%)`
   - Covers: R1 (Unified Setup Flow), R2 (Frictionless Grade Entry & 1-Click Init), R3 (KM Logic & Data Integrity), R4 (Ponytail Principles), R5 (Adversarial Round 1 hardening), and R6 (Adversarial Round 2 hardening).

2. **`npx tsx tests/gradebook_cp_tp_formula_verification.test.ts`**
   - **Result:** `156/156 PASSED (100%)`
   - Covers: Supabase database schema & types, Diagnostik score invariance, Formatif & Sumatif weighted calculations, boundary cases, attendance formulas, pairwise combinatorial tests (15 pairs), and real-world KM workflows.

3. **`npm test`**
   - **Result:** `ALL 28 TEST SUITES PASSED (100%)`
   - Executed full sequential suite with 0 regressions.

4. **`npm run build`**
   - **Result:** `Next.js 16.3.4 (Turbopack) build succeeded in 1.87s, TypeScript finished in 3.3s, 12 static/dynamic routes generated with 0 errors.`

### Shallow Verification (Manual Inspection)
- Inspected JSX markup for `<table>`, `<thead>`, `<tbody>`, and `<tfoot>` ensuring column spans and cell counts match identically under both populated and zero-column states.
- Inspected CSS utility classes for WCAG AA contrast compliance in dark mode.

### Unverified Aspects
- Physical Bluetooth hardware keyboard shortcut navigation (arrow keys across matrix inputs) on physical Android tablets in landscape mode.
- Extended offline service worker sync behavior when offline for >7 days.

---

## 4. Known Issues

- `Minor Robustness Risk` — If a browser has JavaScript completely disabled, client-side interactivity is unavailable (by Next.js design; 'use client' components require JavaScript).

---

## 5. Remaining Risk & Next Step

- The task is **complete, resilient, and verified**.
- All requirements (R1 Penyatuan Alur Persiapan Asesmen, R2 Frictionless Grade Entry & 1-Click Init, R3 Kurikulum Merdeka Logic & Data Integrity, R4 Ponytail Principle) as well as all open issues from the ledger have been resolved and proven by 39 dedicated tests and 156 formula verification tests.
- Git workflow rule will be executed to commit and push all changes.
