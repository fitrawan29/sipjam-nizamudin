# Investigation Report — SIPJAM Jurnal & Perangkat Pembelajaran

## Observation
- **Perangkat Pembelajaran**:
  - Code: `src/components/DokumenView.tsx`
  - Deduplication Logic (UI): Lines 752-796 (`submitDokumen` function) check for existing records (`duplicateDoc`) based on teacher name, document type (fuzzy matched), subject (fuzzy matched), and grade level (via `extractTingkat`).
- **Jurnal KBM**:
  - Code: `src/components/GuruJurnal.tsx` (Form) and `src/components/RekapJurnalView.tsx` (Table View).
- **Table Freezing**:
  - `RekapJurnalView.tsx` renders tables (lines 1927, 2150). No `sticky` CSS classes found in the table header or container.

## Logic Chain
1.  **Deduplication**: The current deduplication (`DokumenView.tsx`) is enforced in the `submitDokumen` function at the client side. This prevents form submission if a duplicate is found. This is prone to bypass (e.g., via API calls).
2.  **Table Freezing**: The tables lack `sticky` positioning, which explains why users might be experiencing scrolling issues without header context.
3.  **UI Elements**: Identified key components for Jurnal and Rekap.

## Caveats
- No deep investigation of database schema constraints was performed to confirm if `bank_dokumen` has unique indexes, but client-side logic suggests it relies on the UI for prevention.

## Conclusion
1.  **Deduplication**: The deduplication logic is located in `src/components/DokumenView.tsx`. To improve this, enforce it via a database constraint or backend validation in addition to the existing UI check.
2.  **Table Freezing**: Missing entirely. Recommend adding Tailwind's `sticky top-0` class to `<thead>` and ensuring the table's container has `overflow-y-auto`.

## Verification Method
1.  **Deduplication**: Attempt to submit a duplicate document via `DokumenView.tsx` (UI-level test). For robustness, attempt to insert duplicate via a direct database SQL query to test backend/constraint enforcement (this would require a database schema migration if no constraints exist).
2.  **Table Freezing**: Apply `sticky top-0` to the table header in `RekapJurnalView.tsx` and verify header visibility during scrolling in a browser.

## Relevant Files
- `src/components/DokumenView.tsx` (Deduplication)
- `src/components/GuruJurnal.tsx` (Jurnal Form)
- `src/components/RekapJurnalView.tsx` (Rekap Table)
