# Adversarial Review Round 3 Report: Master Data CSV Export Final Hardening

> [!WARNING] **Skepticism Disclaimer**
> Deterministic round-trip CSV export/import integrity confirmed across all 9 Master Data tabs (Siswa, Kelas, Mapel, Guru, Jadwal Pelajaran, Wali Kelas, Pengguna, Kalender Pendidikan, Sistem Blok) with zero regressions; client-side file save dialog behavior relies on native browser Blob/URL download mechanics.

---

## 1. What the Prior Attempt Got Wrong

### Issue 1: Mobile Layout Overflow & Rigid Button Container in `AdminPenggunaView` (Line 1042)
- **Input**: Viewing the "Manajemen Kredensial Akun Guru" card on mobile or narrow viewport (<640px).
- **Expected**: The four action buttons (`+ Akun TU`, `+ Akun BK`, `Tarik / Sinkron Guru`, `Export CSV`) wrap gracefully across multiple lines without overflowing the card or horizontal scrolling.
- **Actual**: The buttons were wrapped in `<div className="shrink-0 flex items-center gap-2">` without `flex-wrap`. Four wide buttons with `shrink-0` overflowed the card boundary on mobile screens and caused layout distortion.
- **Root Cause**: Rigid `shrink-0` class prevented the flex container from wrapping buttons onto next lines on mobile screens.
- **Fix**: Replaced with `<div className="flex flex-wrap items-center gap-2">` allowing natural wrapping. Similarly updated `SistemBlokView.tsx` line 842 to `flex flex-wrap items-center gap-2 self-start sm:self-auto`.

### Issue 2: Incomplete Multi-Tenant School ID Extraction for Data Guru (`csvExport.ts:334`)
- **Input**: Teacher items containing `school_id` property (e.g. from joined queries or synthetic objects) instead of `sekolah_id`.
- **Expected**: Resolved school ID from `item.school_id` if `item.sekolah_id` is undefined.
- **Actual**: Fell back to `options?.schoolId || ''`, omitting the item's existing school ID.
- **Root Cause**: Missing check for `item?.school_id` alias in `Data_Guru.extractRow`.
- **Fix**: Updated line 334 to `item?.sekolah_id || item?.school_id || options?.schoolId || ''`.

### Issue 3: Inconsistent WCAG / Accessibility Labels on Template Download Buttons
- **Input**: Screen readers navigating toolbar buttons in `AdminDataView` and `AdminKelasView`.
- **Expected**: All toolbar buttons have descriptive `aria-label` and `title` attributes matching the standard set on the Export CSV buttons.
- **Actual**: The "Template" button in `AdminDataView` lacked `title` and `aria-label`, and `AdminKelasView` Template button lacked `aria-label`.
- **Root Cause**: Incomplete accessibility attributes on secondary toolbar buttons.
- **Fix**: Added explicit `title` and `aria-label` to Template buttons in both views.

### Issue 4: Incomplete Verification Coverage for Round-Trip Import on Tabs 3–9
- **Input**: Exporting and re-importing Mapel, Guru, Jadwal, Wali Kelas, Pengguna, Kalender, or Sistem Blok.
- **Expected**: Automated test suite proves roundtrip re-import integrity for all 9 Master Data tabs.
- **Actual**: Test suite Section 4 only tested `Data_Siswa` and `Data_Kelas`.
- **Root Cause**: Incomplete test coverage leaving tabs 3 through 9 unverified in automated CI.
- **Fix**: Added automated round-trip tests (4.3 to 4.9) and Section 8 adversarial special character matrix for all 9 Master Data tabs in `tests/master_data_csv_export_verification.test.ts`.

---

## 2. What I Changed

1. **`src/components/AdminPenggunaView.tsx`**:
   - Replaced `shrink-0 flex items-center gap-2` with `flex flex-wrap items-center gap-2` on line 1042 so the 4 action buttons wrap responsively on mobile viewports.
2. **`src/components/SistemBlokView.tsx`**:
   - Updated line 842 to `flex flex-wrap items-center gap-2 self-start sm:self-auto` to prevent button collisions on narrow viewports.
3. **`src/components/AdminDataView.tsx`**:
   - Added `title="Unduh format template CSV"`, `aria-label="Unduh format template CSV"`, and `cursor-pointer` to the Template button.
4. **`src/components/AdminKelasView.tsx`**:
   - Added `aria-label="Unduh format template CSV Data Kelas"` to the Template CSV button.
5. **`src/lib/csvExport.ts`**:
   - Added `item?.school_id` fallback in `Data_Guru.extractRow`.
6. **`tests/master_data_csv_export_verification.test.ts`**:
   - Expanded Section 4 to test round-trip import compatibility across all 9 Master Data tabs (4.1 through 4.9).
   - Added Section 8 with 4 adversarial tests:
     - 8.1: Mobile flex-wrap responsive layouts in all 4 UI views.
     - 8.2: Role permission isolation (Admin vs TU vs unauthorized roles).
     - 8.3: Special character matrix roundtrip across all 9 tabs (quotes, commas, newlines, semicolons, formulas, Unicode).
     - 8.4: Master Data export definitions registry integrity.
   - Total test assertions increased to **44/44 PASSED (0 failed)**.

---

## 3. Verification Record

- **Deep Verification (Ran Actual Tests):**
  - `npx tsx tests/master_data_csv_export_verification.test.ts`: **44/44 PASSED (0 failed)**
  - `npx tsc --noEmit`: **0 errors (Exit code 0)**
  - `npm test`: **All 85+ test suites PASSED with 0 failures**
  - `npm run build`: **Next.js Turbopack build successful, 13/13 static pages generated**
- **Shallow Verification:**
  - Verified mobile wrapping classes (`flex flex-wrap`) across all 4 toolbar views.
  - Inspected button accessibility attributes (`aria-label`, `title`) across all 9 tabs.
- **Unverified Aspects:**
  - Physical browser file save prompt on iOS Safari and mobile Chrome (mocked via DOM click dispatch).
  - Native Excel/Calc rendering on offline hardware machines (validated via RFC 4180 BOM & escaping parsing).

---

## 4. Known Issues
- `Minor Robustness Risk`: Very large browser downloads (>50MB / >100,000 rows) may consume noticeable RAM on low-end mobile devices before garbage collection frees the Blob URL.
- `Shallow Verification`: Physical download OS dialog interaction on physical hardware relies on browser-standard Blob anchor click behavior.

---

## 5. Remaining Risk & Next Step
- **Status**: Task complete, all 9 Master Data tabs fully verified with zero regressions, mobile responsiveness hardened, and ready for victory audit.
