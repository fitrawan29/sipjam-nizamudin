# Handoff Report — Explorer 2: Print System Auditor

**Date**: 2026-11-04T02:18:00Z  
**Author**: Explorer 2 (`explorer_o26_survey_print`)  
**Mission**: Audit print views, export layouts, official signatures, and footers across sipjam-app comparing pre-consolidation git history with the current state.  
**Deliverable**: `.agents/teamwork/explorer_o26_survey_print/report.md`  

---

## 1. Observation

1. **Pre-Consolidation Baseline**:
   - Git baseline commit: `bee9fd5` (and prior commits `b81fb17^` / `7aa6afd`).
   - The application supports official document printing across **9 core views**: `AdminRekapView.tsx`, `RekapJurnalView.tsx`, `RekapSiswaView.tsx`, `GradebookView.tsx`, `RaporView.tsx`, `PiketView.tsx`, `DokumenView.tsx`, `DinasDashboard.tsx`, and `AdminDataView.tsx` (batch QR).
   - Core print engine components: `src/components/PrintHeader.tsx` (`PrintHeader`, `PrintSignature`), `src/utils/printWithGps.ts` (`triggerPrintWithGps`), and `src/app/globals.css` (lines 525–785 `@media print`).

2. **Observed Defect 1: Missing Signature on Sub-Tab 2 of `AdminRekapView.tsx`**:
   - File: `src/components/AdminRekapView.tsx`.
   - In pre-consolidation commit `bee9fd5`: lines 453–460 rendered `<PrintSignature ... />` directly under the 10-column table before the action buttons.
   - In current `HEAD`: Commit `0b32ead` refactored `AdminRekapView` into 3 Sub-tabs (`analitik`, `tabel`, `cetak`).
   - Sub-tab 2 (`tabel`, lines 454–683) retains the "Cetak Halaman" button (line 680) calling `triggerPrintWithGps()`, but **`<PrintSignature>` was completely removed from Sub-tab 2**.
   - `<PrintSignature>` was placed exclusively inside Sub-tab 3 (`cetak`, line 743).
   - Because Sub-tab 3 has `className={activeTab === 'cetak' ? 'block' : 'hidden'}`, when printing from Sub-tab 2, Sub-tab 3 is `hidden` (`display: none`).
   - Verbatim result: Printing from Sub-tab 2 produces a table with **NO SIGNATURES AND NO SECURITY FOOTER**.

3. **Observed Defect 2: Duplicate Kop Surat on Sub-Tab 3 of `AdminRekapView.tsx`**:
   - File: `src/components/AdminRekapView.tsx`.
   - Line 417 renders `<PrintHeader user={user} sekolahId={user?.sekolah_id} />` inside `<div className="hidden print:block">`.
   - Line 690 inside Sub-tab 3 (`cetak`) ALSO renders `<PrintHeader user={user} sekolahId={user?.sekolah_id} />`.
   - Verbatim result: When user selects Sub-tab 3 and prints, **Kop Surat is rendered twice (duplicate header)**.

4. **Observed Defect 3: Blanket `isAdmin` Suppression in `PrintHeader.tsx` Erasing Third-Party Signatures**:
   - File: `src/components/PrintHeader.tsx` lines 354–355:
     ```tsx
     const isAdmin = typeof user?.role === 'string' && user.role.trim().toLowerCase() === 'admin';
     const isSingleColumnLayout = Boolean(singleColumn || isAdmin);
     ```
   - Commit `2e54dad` introduced this blanket rule to hide admin signatures on administrative recaps.
   - However, when `isSingleColumnLayout === true`:
     - Line 380 suppresses `signature-left` (`{!isSingleColumnLayout ? <div ... signature-left> : ...}`).
     - In `RaporView.tsx` (lines 1501–1512), `leftSubtitle="Orang Tua / Wali Murid"`. When an Admin prints Rapor, **"Orang Tua / Wali Murid" is completely suppressed**, leaving only Wali Kelas and Kepala Sekolah.
     - In `RekapSiswaView.tsx` (lines 1531 & 1770), `leftSubtitle="Wali Kelas"`. When an Admin prints, **"Wali Kelas" is completely suppressed**.
     - In `RekapJurnalView.tsx` (lines 1050–1058, mode kelas), `leftSubtitle="Wali Kelas"`. When an Admin prints, **"Wali Kelas" is completely suppressed**.
     - In `GradebookView.tsx` (lines 3901 & 4047), `leftSubtitle="Guru Mata Pelajaran"`. When an Admin prints, **"Guru Mata Pelajaran" is completely suppressed**.

5. **Observed Defect 4: Missing Props Fallback in `PiketView.tsx`**:
   - File: `src/components/PiketView.tsx` line 4179:
     `<PrintSignature user={user} sekolahId={user?.sekolah_id} />`
   - Omitted props: `leftTitle`, `leftSubtitle`, `leftName`, `leftNip`.
   - In `PrintHeader.tsx`, lines 386 and 391 default to `"Guru Mata Pelajaran"` and `"( ........................................ )"`.
   - Verbatim result: A teacher printing a picket duty report gets a signature block labeled **"Guru Mata Pelajaran"** with an empty name, instead of **"Guru Piket"** with `user?.nama`.

6. **Observed Defect 5: Missing Signature in `GradebookView.tsx` Tab 3 (`statistik`)**:
   - File: `src/components/GradebookView.tsx` line 2491: "Cetak Dokumen" button exists in the header toolbar.
   - Lines 4061–4194 (Tab 3: `statistik`): Renders class analytics and grade distribution, but **contains no `<PrintSignature>` block**.

---

## 2. Logic Chain

1. **Step 1**: The original user request demands identifying all features lost during menu consolidation, specifically print templates, signatures, and footers, and restoring them without breaking the consolidated menu structure.
2. **Step 2**: Git diff between `bee9fd5` and `HEAD` confirms that menu consolidation introduced sub-tab navigation (`ClayTabs`) across several views (`AdminRekapView`, `GuruJurnal`, `GradebookView`).
3. **Step 3**: In `AdminRekapView.tsx`, moving `<PrintSignature>` to Sub-tab 3 without keeping it in Sub-tab 2 broke printouts from Sub-tab 2 because CSS `@media print` does not unhide Tailwind `.hidden` containers.
4. **Step 4**: The blanket role check `isAdmin` inside `PrintHeader.tsx` was implemented without caller context awareness. While it intended to hide "Pengelola Data / Admin", it inadvertently suppressed "Orang Tua / Wali Murid", "Wali Kelas", and "Guru Mata Pelajaran" whenever an Admin is the active user.
5. **Step 5**: The legal footer (WITA timestamp, print user, GPS coordinates watermark, legal clause) is tightly coupled to `<PrintSignature>`. Therefore, wherever `<PrintSignature>` is missing or suppressed, the legal footer and GPS watermark are lost as well.
6. **Step 6**: Because the consolidated menu structure in `AppScreen.tsx` and `navigation.ts` is fully functional and stable, all identified print defects can be fixed strictly within the print component layer (`PrintHeader.tsx`, `AdminRekapView.tsx`, `PiketView.tsx`, `GradebookView.tsx`) without modifying or reverting the consolidated menu navigation.

---

## 3. Caveats

1. **Physical Printer Variance**: We inspected and verified the AST, DOM structure, and CSS media print rules. Actual paper output depends on the browser's native print engine (Chrome, Edge, Firefox), but SIPJAM's `@media print` rules adhere strictly to W3C print specifications (`break-inside: avoid`, `table-header-group`, `table-footer-group`).
2. **GPS Geolocation Permission**: `triggerPrintWithGps()` relies on browser GPS permissions. If denied, it gracefully shows a SweetAlert or falls back to native `window.print()` without GPS coordinates in the footer.
3. **Admin Signature Policy**: The project previously committed `2e54dad` to hide the Admin's *own* signature on administrative recaps. Our proposed fix preserves this exact policy while fixing the bug where third-party signatures (parents, homeroom teachers, subject teachers) were inadvertently hidden.

---

## 4. Conclusion

The audit is complete. All views with print capabilities have been inventoried, compared with pre-consolidation git history, and 5 concrete defects have been pinpointed with exact file paths and line numbers:
1. `AdminRekapView.tsx`: Sub-tab 2 (`tabel`) missing `<PrintSignature>`.
2. `AdminRekapView.tsx`: Sub-tab 3 (`cetak`) has duplicate `<PrintHeader>`.
3. `PrintHeader.tsx`: Blanket `isAdmin` check strips "Orang Tua / Wali Murid" in `RaporView`, "Wali Kelas" in `RekapSiswaView` & `RekapJurnalView`, and "Guru Mata Pelajaran" in `GradebookView`.
4. `PiketView.tsx`: Missing props causes picket recap to print with "Guru Mata Pelajaran" and empty name instead of "Guru Piket".
5. `GradebookView.tsx`: Tab 3 (`statistik`) missing `<PrintSignature>`.

All 5 defects can be restored with 100% fidelity without altering the consolidated menu UX.

---

## 5. Verification Method

To independently verify the audit findings:
1. **Source Code Inspection**:
   - Inspect `src/components/AdminRekapView.tsx`: Lines 417 & 690 (duplicate `PrintHeader`), line 680 (button without `PrintSignature` in Sub-tab 2), line 743 (`PrintSignature` isolated in Sub-tab 3).
   - Inspect `src/components/PrintHeader.tsx`: Lines 354–355 and 380 (`isSingleColumnLayout = Boolean(singleColumn || isAdmin)`).
   - Inspect `src/components/RaporView.tsx`: Lines 1501–1512 (note `leftSubtitle="Orang Tua / Wali Murid"` passed to `PrintSignature`).
   - Inspect `src/components/PiketView.tsx`: Line 4179 (`<PrintSignature user={user} sekolahId={user?.sekolah_id} />`).
2. **Automated Unit Test Verification**:
   - Run existing print suite: `npx tsx tests/printHeader.test.ts`.
   - Observe lines 600–680 of `tests/printHeader.test.ts` which enforce the current blanket `admin` suppression.
3. **Build & Type Check**:
   - `npx tsc --noEmit`
   - `npm test`
