# Milestone 2 Empirical Challenger Report: Penyelarasan Template Master Data & Impor CSV

- **Agent**: challenger_m2_1 (critic, specialist)
- **Target Files**:
  * `src/components/AdminDataView.tsx`
  * `src/lib/dataIntegrityGuard.ts`
  * `src/components/AdminKelasView.tsx`
- **Test Harnesses Executed**:
  * `tests/challenger_m2_csv_empirical_stress.test.ts` (28/28 assertions PASSED)
  * `tests/adversarial_m2_template_and_import_challenger.test.ts` (19/19 assertions PASSED)
  * `tests/m2_csv_templates_and_import_harmonization.test.ts` (16/16 assertions PASSED)
  * `tests/data_guru_csv_import_sekolah_id_validation.test.ts` (31/31 assertions PASSED)
  * `tests/production_admin_adjustments.test.ts` (24/24 assertions PASSED)
  * `npx tsc --noEmit` (0 errors)
  * `npm test` (54/54 test files PASSED, 0 failures)
- **Verdict**: **VERDICT: APPROVE**
- **Date**: 2026-11-06T01:04:00Z

---

## 1. Observation

Direct empirical inspection and testing of the implementation produced the following factual observations:

1. **CSV Template Definitions & Invariant Adherence (`src/components/AdminDataView.tsx:229–265`)**:
   - `Data_Kelas` is registered in `templates` with:
     ```ts
     Data_Kelas: {
       filename: 'Template_Data_Kelas.csv',
       headers: ['nama_kelas', 'tingkat', 'jurusan'],
       sample: ['X Merdeka', '10', 'Umum']
     }
     ```
   - All 7 Master Data entity templates are present: `Data_Kelas`, `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, and `Wali_Kelas`.
   - `Template_Kalender_Pendidikan.csv` headers are `['tanggal', 'keterangan', 'tipe']`, strictly omitting `'id'` and legacy `'KP-01'`.
   - `Template_Jadwal_Pelajaran.csv` headers are `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']`, strictly omitting `'id'` and legacy `'JP-01'`.
   - `Template_Data_Guru.csv` headers are `['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']`, strictly including `'sekolah_id'`.
   - `AdminDataView.tsx:317–327` preserves `showToast('Unggah Berhasil', ...)` and dispatches `window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'))` whenever `Data_Kelas` or `Data_Siswa` is imported.

2. **CSV Header Normalization & Scoping (`src/lib/dataIntegrityGuard.ts:586–714`)**:
   - `normalizeCsvHeaders` cleans BOM (`\uFEFF`), trims whitespace, and scopes headers by entity:
     * For `data_kelas`: `nama_kelas`, `namakelas`, `kelas`, `rombel`, `nama_rombel`, `ruang_kelas`, `nama` map to `'nama_kelas'`.
     * `tingkat`, `tingkat_kelas`, `grade`, `level` map to `'tingkat'`.
     * `jurusan`, `peminatan`, `program_keahlian`, `konsentrasi` map to `'jurusan'`.
     * Scoped `nama`: maps to `nama_siswa` for `data_siswa`, `nama_kelas` for `data_kelas`, `nama_mata_pelajaran` for `data_mapel`, and `nama_guru` for others.
     * Scoped `rombel`: maps to `nama_kelas` for class entities and `kelas` for student and schedule entities.

3. **Parsing, Pre-Validation & Row-Level Feedback (`src/lib/dataIntegrityGuard.ts:718–1109`)**:
   - `REQUIRED_HEADERS_BY_TABLE` checks required columns before row processing. Uploading an incompatible CSV (e.g. Guru CSV into Siswa tab) triggers an immediate descriptive error (`File CSV tidak memiliki kolom wajib "nama_siswa, kelas"...`).
   - Semicolons (`;`), tabs (`\t`), pipes (`|`), and commas (`,`) are dynamically auto-detected as delimiters based on header frequency.
   - Excel leading apostrophes (`'`) are stripped across all columns in `lines[i]` (`cleanVal.replace(/^'+|'+$/g, '').trim()`).
   - Line numbers are tracked with 1-based indexing corresponding to CSV lines:
     * Empty class name: `Baris ${i}: Kolom "nama_kelas" wajib diisi and tidak boleh kosong untuk data kelas.`
     * Duplicate class name in CSV: `Baris ${i}: Duplikat nama kelas "${cleanNamaKelas}" dalam file CSV.`
     * Dummy class name: `Baris ${i}: Terdeteksi nama kelas dummy/percobaan ("${rawNamaKelas}").`
     * Missing student attributes: `Baris ${i}: Kolom "nama_siswa" wajib diisi...`
     * Duplicate student in class: `Baris ${i}: Duplikat siswa "${row.nama_siswa}" di kelas ${row.kelas} dalam file CSV.`
   - UUID auto-generation occurs for missing IDs on `data_kelas`, `data_siswa`, `kalender_pendidikan`, `jadwal_pelajaran`, and `wali_kelas`, completely preventing Postgres 22P02.

4. **Student Deduplication & Schema Fallback (`src/lib/dataIntegrityGuard.ts:1115–1260`)**:
   - For `data_siswa`: student rows with valid NISN are queried in chunks of 100 via `supabase.from('data_siswa').select('id, nisn, sekolah_id').eq('sekolah_id', schoolId).in('nisn', chunk)`. Existing student records match by `(sekolah_id, nisn)` and map `row.id` to the existing student UUID, enabling in-place updates of `kelas` upon upsert (`onConflict: 'id'`) without inserting duplicate rows.
   - For `data_kelas`: upserts with `onConflict: 'sekolah_id, nama_kelas'`. If PostgREST schema cache reports `PGRST205` or `42P01` (table `data_kelas` missing/not cached), the engine catches the error and gracefully falls back to synchronizing distinct class names into `wali_kelas`.

5. **Empirical Test Suite Execution**:
   - `npx tsx tests/challenger_m2_csv_empirical_stress.test.ts`:
     * 28/28 assertions PASSED (0 failed).
   - `npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts`:
     * 16/16 assertions PASSED (0 failed).
   - `npx tsc --noEmit`:
     * Exited with code 0 (0 compilation errors).
   - `npm test`:
     * Exited with code 0 across all 54 test files (zero regressions).

---

## 2. Logic Chain

1. **Step 1 (Template Conformance & Invariants)**:
   - Direct inspection and empirical testing of `AdminDataView.tsx` confirm that `Template_Data_Kelas.csv` defines headers `['nama_kelas', 'tingkat', 'jurusan']` (Observation 1, Test 1.1).
   - Invariants established by `production_admin_adjustments.test.ts` (omitting `'id'` on Kalender & Jadwal) and `data_guru_csv_import_sekolah_id_validation.test.ts` (including `'sekolah_id'` on Guru) were verified empirically (Observation 1, Tests 1.3 & 1.4).
   - Conclusion: All 7 templates match their database schemas and uphold project invariants.

2. **Step 2 (Parsing Engine Robustness & Delimiter Auto-detection)**:
   - The CSV parser was stressed with Indonesian semicolon-separated files (`\r\n`), TSV tab-delimited files, pipe-delimited files, and comma-in-quotes RFC 4180 records (Observation 3, Tests 6.1–6.5).
   - All variations parsed into identical structured objects with properly mapped fields without corruption or split errors.
   - Conclusion: CSV upload parsing handles real-world spreadsheet exports seamlessly.

3. **Step 3 (Error Reporting & Pre-Validation)**:
   - When fed invalid CSV inputs (empty class names, duplicate classes, dummy names, missing student names, duplicate students, wrong entity templates), the system threw localized, deterministic errors specifying the exact line number (`Baris ${i}`) and column name (Observation 3, Tests 3.1–3.6).
   - Conclusion: Row error reporting provides actionable feedback to users and prevents malformed data from reaching the database.

4. **Step 4 (Apostrophe Stripping & Sanitization)**:
   - Testing rows with Excel apostrophe formatting (`'114367407`, `'081234567890`, `''X Merdeka''`) verified that leading and trailing apostrophes are completely stripped across all columns (Observation 3, Tests 4.1 & 4.2).
   - Conclusion: Excel-formatted numbers and text are sanitized cleanly.

5. **Step 5 (Idempotency of Student Re-Import)**:
   - When an existing student was re-imported with an altered class (`XI Merdeka`), the query matched by `(sekolah_id, nisn)`, substituted the existing UUID onto the incoming row, and executed `upsert({ ... }, { onConflict: 'id' })` (Observation 4, Tests 5.1 & 5.2).
   - The test verified that the student record updated in-place and did not generate duplicate rows.
   - Conclusion: Student class allocation via CSV re-import is fully idempotent.

6. **Step 6 (Non-Regression Gate)**:
   - Static typecheck (`npx tsc --noEmit`) returned 0 errors.
   - The full automated test suite (`npm test`) executed 54 test files with 100% pass rate and 0 failures.
   - Conclusion: No regressions were introduced into existing application workflows.

---

## 3. Caveats

- **Students Without NISN**: For students registered without a valid NISN (e.g., `-` or blank), deduplication by NISN is safely bypassed; each record receives a distinct UUID to prevent accidental row merging.
- **Physical `data_kelas` Table vs PostgREST Schema Cache**: In environments where PostgREST has not reloaded schema definitions for `data_kelas` (`PGRST205`), the graceful fallback syncs class records into `wali_kelas`, maintaining uninterrupted operation.

---

## 4. Conclusion

The implementation for Milestone 2 meets all functional requirements, architectural invariants, and non-regression guarantees:
- All 7 CSV templates in `AdminDataView.tsx` are aligned with database schemas while preserving core invariants.
- `dataIntegrityGuard.ts` provides robust delimiter auto-detection, BOM handling, header normalization, upfront template validation, row error reporting (`Baris ${i}`), Excel apostrophe stripping, and idempotent student upserts.
- All empirical verification tests and full project regression tests passed with zero failures.

**VERDICT: APPROVE**

---

## 5. Verification Method

To independently verify this verdict, execute the following commands in powershell:

1. **Run the Empirical Challenger Stress Test Suite**:
   ```bash
   npx tsx tests/challenger_m2_csv_empirical_stress.test.ts
   ```
   *Expected outcome*: 28/28 PASSED, VERDICT: APPROVE, exit code 0.

2. **Run Worker M2's Dedicated Test Suite**:
   ```bash
   npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts
   ```
   *Expected outcome*: 16/16 PASSED, exit code 0.

3. **Run Static Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome*: 0 errors, exit code 0.

4. **Run Full Automated Regression Suite**:
   ```bash
   npm test
   ```
   *Expected outcome*: All 54 test files pass with 0 failures, exit code 0.
