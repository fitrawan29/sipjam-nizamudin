# Milestone 2 Handoff Report: Penyelarasan Template Master Data & Impor CSV

- **Agent**: worker_m2 (implementer, qa, specialist)
- **Target Files**:
  * `src/components/AdminDataView.tsx`
  * `src/lib/dataIntegrityGuard.ts`
  * `src/components/AdminKelasView.tsx`
- **Verification Harness**: `tests/m2_csv_templates_and_import_harmonization.test.ts`, `npm test`, `npx tsc --noEmit`
- **Date**: 2026-11-06T00:57:00Z

---

## 1. Observation

Direct inspection of the codebase prior to Milestone 2 revealed the following:

1. **`src/components/AdminDataView.tsx` (templates & handleFileUpload)**:
   - Line 229: `templates` record previously only included 6 entities (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`). `Data_Kelas` (`Template_Data_Kelas.csv`) was absent.
   - Line 262: Lookup was `templates[activeTab]`, which failed if an unnormalized tab name was passed.
   - Lines 306–312: When uploading a CSV file, `showToast('Unggah Berhasil', ...)` was called, but if `activeTab === 'Data_Kelas'`, `loadData()` returned early without updating `AdminKelasView` state. There was no cross-component event dispatch to notify class directory cards and rosters.
   - Core invariants in test harness:
     * `Template_Kalender_Pendidikan.csv` MUST NOT contain `'id'` (asserted by `tests/production_admin_adjustments.test.ts:688`).
     * `Template_Jadwal_Pelajaran.csv` MUST NOT contain `'id'` (asserted by `tests/production_admin_adjustments.test.ts:696`).
     * `Template_Data_Guru.csv` MUST contain `'sekolah_id'` (asserted by `tests/data_guru_csv_import_sekolah_id_validation.test.ts:834`).
     * Preserving `showToast('Unggah Berhasil', ...)` is required for `tests/ui_ux_improvements_audit.test.ts:84`.

2. **`src/lib/dataIntegrityGuard.ts` (normalizeCsvHeaders, parseAndValidateMasterCsv, importMasterDataFromCsv)**:
   - `normalizeCsvHeaders` lacked mappings for `data_kelas` / `kelas` (`nama_kelas`, `tingkat`, `jurusan`, `kelas`, `rombel`). Header `nama` collapsed to `nama_guru` for any table other than `data_siswa`.
   - `parseAndValidateMasterCsv`:
     * `isUuidKeyedTable` omitted `data_kelas` and `kelas`.
     * Missing pre-validation check for required headers when uploading an incompatible template (e.g. Guru CSV to Siswa tab).
     * No validation branch existed for `data_kelas` (empty `nama_kelas` or test/dummy class names hit Postgres NOT NULL without a friendly row-level error `Baris ${i}`).
     * Missing auto-derivation for `tingkat` when omitted in class CSV.
     * Excel apostrophe prefix (`'`) on numbers (e.g. `'114367407` or `'081234567890`) was not stripped across student attributes.
   - `importMasterDataFromCsv`:
     * For `data_siswa`: student CSV templates omit `id`, resulting in newly generated random UUIDs. When upserting with `onConflict: 'id'`, re-uploading an updated student CSV resulted in duplicate student records instead of updating existing records in-place.
     * For `data_kelas`: upsert defaulted to `onConflict: 'id'`. Furthermore, if `public.data_kelas` was absent or not yet loaded in PostgREST schema cache (`PGRST205` / `42P01`), the operation threw an unhandled error instead of falling back to syncing classes in `wali_kelas`.

3. **`src/components/AdminKelasView.tsx`**:
   - The toolbar only contained "Tambah Kelas" and "Naik Kelas", with no direct mechanism to download `Template_Data_Kelas.csv` or upload a class CSV from within the sub-menu.
   - There was no listener to refresh class cards when CSV imports were performed.

---

## 2. Logic Chain

1. **Step 1 (Template Harmonization in `AdminDataView.tsx`)**:
   - Added `Data_Kelas` to `templates` record:
     ```ts
     Data_Kelas: {
       filename: 'Template_Data_Kelas.csv',
       headers: ['nama_kelas', 'tingkat', 'jurusan'],
       sample: ['X Merdeka', '10', 'Umum']
     }
     ```
   - Aligned template lookup with `normalizeAdminTab(activeTab)` so tab aliases (`data_kelas`, `kelas`) work seamlessly.
   - Preserved all 6 existing templates and their exact sample data to guarantee zero regression on `tests/production_admin_adjustments.test.ts:688, 696`, `tests/adversarial_r1_r5_stress_test.ts:506–523`, and `tests/data_guru_csv_import_sekolah_id_validation.test.ts:834`.

2. **Step 2 (Cross-Component Event & User Feedback in `AdminDataView.tsx`)**:
   - In `handleFileUpload`, retained `showToast('Unggah Berhasil', ...)` and added:
     ```ts
     if (tabObj.id === 'Data_Kelas' || tabObj.id === 'Data_Siswa') {
       window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'));
     }
     ```
   - When errors occur, if the error contains row/column validation information (`Baris `, `Kolom `, `wajib`, `dilarang`), displayed an informative SweetAlert2 modal alongside the quick toast so admins have sufficient time to read the exact row and column errors.

3. **Step 3 (Header Normalization in `dataIntegrityGuard.ts`)**:
   - In `normalizeCsvHeaders`, added BOM stripping, space trimming, and table-scoped normalization.
   - For `data_kelas`: mapped `nama_kelas`, `namakelas`, `kelas`, `rombel`, `nama_rombel`, `ruang_kelas`, `nama` -> `'nama_kelas'`; `tingkat`, `tingkat_kelas`, `grade`, `level` -> `'tingkat'`; `jurusan`, `peminatan`, `program_keahlian`, `konsentrasi` -> `'jurusan'`.
   - Scoped `nama` based on table: `data_siswa` -> `nama_siswa`, `data_kelas` -> `nama_kelas`, `data_mapel` -> `nama_mata_pelajaran`, else `nama_guru`.
   - Scoped `rombel`: for `data_kelas` -> `nama_kelas`, for relational tables (`data_siswa`, `jadwal_pelajaran`) -> `kelas`.

4. **Step 4 (Validation & UUID Handling in `dataIntegrityGuard.ts`)**:
   - Added upfront required headers check via `REQUIRED_HEADERS_BY_TABLE` to catch incompatible file uploads before line processing.
   - Added `data_kelas` and `kelas` to `isUuidKeyedTable`, ensuring missing IDs receive valid UUIDs and non-UUID legacy IDs are converted to prevent Postgres error 22P02.
   - Added validation branch for `data_kelas` / `kelas`: requires non-empty `nama_kelas`, detects dummy/forbidden names, checks for within-file duplicate class names, auto-derives `tingkat` (`10`, `11`, `12`, or `Lainnya`), and sanitizes optional `jurusan`.
   - Added non-empty checks for `nama_siswa` and `kelas` in `data_siswa`, `tanggal` and `keterangan` in `kalender_pendidikan`, and required columns in `jadwal_pelajaran` and `wali_kelas`.
   - Stripped Excel apostrophes (`'`) across numeric columns (`nisn`, `nip`, `no_hp_ortu`).
   - Filtered output row keys to known schema columns via `ALLOWED_COLUMNS_BY_TABLE` to prevent PostgREST PGRST204 errors from spreadsheet auxiliary columns.

5. **Step 5 (Idempotent Student Resolution & Schema Cache Fallback in `dataIntegrityGuard.ts`)**:
   - In `importMasterDataFromCsv` for `data_siswa`: queried existing student records by `(sekolah_id, nisn)` in chunks of 100 and mapped their existing UUID `id` to matching CSV rows. When batch upsert runs with `onConflict: 'id'`, existing students are cleanly updated in-place, eliminating duplicate rows.
   - For `data_kelas`: configured upsert with `onConflict: 'sekolah_id, nama_kelas'`.
   - Added `isSchemaCacheError` helper. If PostgREST schema cache error (`PGRST205` / `42P01`) occurs during `data_kelas` upsert, caught the error and gracefully fell back to syncing distinct class names into `wali_kelas` with placeholder teacher attributes.

6. **Step 6 (UI Actions & Live Sync in `AdminKelasView.tsx`)**:
   - Added "Template CSV" and "Impor CSV" buttons in `AdminKelasView` action toolbar.
   - Integrated `handleDownloadClassTemplate` to trigger direct download of `Template_Data_Kelas.csv`.
   - Integrated `handleClassFileUpload` to parse and import class CSV directly via `importMasterDataFromCsv`, followed by `loadAllData(true)`.
   - Added an event listener for `sipjam:kelas-updated` to trigger `loadAllData(true)` whenever classes or students are modified across the application.

---

## 3. Caveats

1. **No-NISN Students**: In registration scenarios where students do not yet have an assigned NISN (empty or `"-"`), student deduplication skips NISN matching and assigns genuine UUIDs.
2. **Schema Cache Latency on `public.data_kelas`**: In deployments where the physical `data_kelas` table has not yet been registered into PostgREST schema cache, the engine gracefully falls back to syncing classes in `wali_kelas` and `data_siswa` without disrupting the user experience.

---

## 4. Conclusion

All Milestone 2 requirements have been implemented and verified:
- `AdminDataView.tsx` harmonizes all 7 CSV templates (including `Data_Kelas`) and dispatches `sipjam:kelas-updated`.
- `dataIntegrityGuard.ts` features robust header normalization, pre-validation required header checks, row-level validation (`Baris ${i}`), student deduplication by `(sekolah_id, nisn)`, and `data_kelas` upsert with graceful fallback.
- `AdminKelasView.tsx` provides direct "Template CSV" and "Impor CSV" actions and live-refreshes on `sipjam:kelas-updated`.
- All existing project invariants (`production_admin_adjustments.test.ts:688, 696`, `data_guru_csv_import_sekolah_id_validation.test.ts:834`, `ui_ux_improvements_audit.test.ts:84`) are 100% preserved.

---

## 5. Verification Method

1. **Static Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Result*: 0 errors (exited with code 0).

2. **Dedicated Milestone 2 Automated Test Suite**:
   ```bash
   npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts
   ```
   *Result*: 16/16 PASSED (0 failed).

3. **Full Automated Test Suite**:
   ```bash
   npm test
   ```
   *Result*: All 54 test files passed (0 failures, zero regression).

4. **Specific Regression Suites**:
   - `npx tsx tests/production_admin_adjustments.test.ts`: 24/24 PASSED.
   - `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`: 31/31 PASSED.
   - `npx tsx tests/adversarial_r1_r5_stress_test.ts`: 14/14 PASSED.
   - `npx tsx tests/adversarial_o27_m4_challenger.test.ts`: 13/13 PASSED.
   - `npx tsx tests/adversarial_centralized_class_allocation_m1.test.ts`: 15/15 PASSED.
