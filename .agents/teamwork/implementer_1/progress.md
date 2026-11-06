# Progress Update: Student CSV Template Download & Upload Data Loading

## Status: Implemented & Verifying

### Summary of Changes:
1. **src/components/AdminDataView.tsx**:
   - Updated `normalizeAdminTab` to canonicalize `data_siswa`, `siswa`, `student`, `students` (along with case and whitespace variants) to `'Data_Siswa'`. Also normalized `data_guru`, `guru`, `data_mapel`, `mapel`, `kalender_pendidikan`, `kalender`, `jadwal_pelajaran`, `jadwal`, `wali_kelas`, `wali`.
   - Added `uploadedRowsCacheRef` to store imported data rows per entity tab.
   - Updated `loadData` to:
     - Use `normalizeAdminTab` for reliable lookup in `tabs`.
     - Seed `dataList` with `cachedRows` when available, eliminating the race condition where `setDataList([])` prematurely blanked out freshly uploaded data before the async fetch completed.
     - Fall back to preserving uploaded data when the database query returns 0 rows or errors.
   - Updated `handleDownloadTemplate`:
     - Normalizes `activeTab` so template for `Data_Siswa` is reliably downloaded as `Template_Data_Siswa.csv` with schema headers `['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']`.
   - Updated `handleFileUpload`:
     - Uses `normalizeAdminTab` to reliably match tab objects.
     - Populates `uploadedRowsCacheRef` with the imported rows.
     - Sets `setDataList(rows)`, resets search and filters, resets page to 0, and sets `loading = false` to guarantee uploaded rows render immediately.
     - Performs non-destructive background refresh using `.then(({ data }) => ...)` updating both `dataList` and cache without wiping out rows.

2. **Verification Suite**:
   - Created `tests/test_user_exact_student_csv.ts`: Tests exact 392-student dataset parsing, handling optional fields (empty phone numbers, apostrophes, dots in names), auto-generating IDs and QR codes, idempotent import, template consistency, and empty-state avoidance simulation.
   - Verified that `tests/template_master_data_import_visibility.test.ts`, `tests/m2_csv_templates_and_import_harmonization.test.ts`, `tests/challenger_m2_csv_empirical_stress.test.ts`, and `tests/test_user_exact_student_csv.ts` all pass with 0 failures.
