# Milestone 2 Empirical Challenge Report: Penyelarasan Template Master Data & Impor CSV

- **Challenger Agent**: challenger_m2_2 (critic, specialist)
- **Target Files Inspected**:
  * `src/components/AdminDataView.tsx`
  * `src/lib/dataIntegrityGuard.ts`
  * `src/components/AdminKelasView.tsx`
- **Verification Harnesses Executed**:
  * `npm test` (54 test files)
  * `npx tsx tests/production_admin_adjustments.test.ts`
  * `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`
  * `npx tsx tests/adversarial_r1_r5_stress_test.ts`
  * `npx tsx tests/adversarial_o27_m4_challenger.test.ts`
  * `npx tsx tests/adversarial_centralized_class_allocation_m1.test.ts`
  * `npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts`
  * `tests/adversarial_m2_template_and_import_challenger.test.ts` (newly authored 19-test adversarial suite)
  * `npx tsc --noEmit`
  * `npm run build`
- **Date**: 2026-11-06T01:04:30Z

---

## 1. Observation

Direct empirical execution of test suites and code inspection yielded the following facts:

1. **Automated Regression Suite (`npm test`)**:
   - Command: `npm test`
   - Output: Exited with code 0.
   - Result: All 54 test files executed and passed with 0 failures, confirming zero regression across the existing application.

2. **Invariant Test Suites**:
   - `npx tsx tests/production_admin_adjustments.test.ts`:
     * Result: 24/24 PASSED (0 failed). Verbatim: `PASS: CSV templates for Kalender_Pendidikan and Jadwal_Pelajaran omit "id" and legacy strings ("KP-01", "JP-01")`.
   - `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`:
     * Result: 31/31 PASSED (0 failed). Verbatim: `AdminDataView.tsx wires importMasterDataFromCsv and includes sekolah_id in Template_Data_Guru`.
   - `npx tsx tests/adversarial_r1_r5_stress_test.ts`:
     * Result: 14/14 PASSED (0 failed).
   - `npx tsx tests/adversarial_o27_m4_challenger.test.ts`:
     * Result: 13/13 PASSED (0 failed).
   - `npx tsx tests/adversarial_centralized_class_allocation_m1.test.ts`:
     * Result: 15/15 PASSED (0 failed). Verbatim: `PASS: normalizeAdminTab consistently standardizes all class tab variations to canonical Data_Kelas`.
   - `npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts`:
     * Result: 16/16 PASSED (0 failed).

3. **Source Code Inspection**:
   - `src/components/AdminDataView.tsx`:
     * Lines 230–234: `Data_Kelas` template is registered with `filename: 'Template_Data_Kelas.csv'`, `headers: ['nama_kelas', 'tingkat', 'jurusan']`, and `sample: ['X Merdeka', '10', 'Umum']`.
     * Lines 235–264: All 7 templates (`Data_Kelas`, `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`) are defined with exact schema alignment.
     * Line 267: Normalized template lookup via `templates[activeTab] || templates[normalizeAdminTab(activeTab)]`.
     * Line 325: Dispatches `window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'))` on `Data_Kelas` and `Data_Siswa` file uploads.
     * Line 317: Retains required `showToast('Unggah Berhasil', ...)`.
   - `src/lib/dataIntegrityGuard.ts`:
     * Lines 612–630: `normalizeCsvHeaders` scopes headers for `data_kelas` (`nama_kelas`, `tingkat`, `jurusan`).
     * Lines 759–781: `REQUIRED_HEADERS_BY_TABLE` performs upfront pre-validation on uploaded CSV files, preventing incompatible file uploads from triggering database errors.
     * Lines 805–806: `data_kelas` and `kelas` are included in `isUuidKeyedTable`.
     * Lines 902–956: Entity-specific validation for `data_kelas` enforces non-empty `nama_kelas`, rejects dummy strings (`isDummyOrTestString`), checks duplicate class names within the CSV file, and auto-derives `tingkat` (`10`, `11`, `12`, or `Lainnya`).
     * Lines 1127–1172: Idempotent student resolution queries existing students by `(sekolah_id, nisn)` and binds their existing UUID `id` to matching rows, preventing duplicate student records upon re-import.
     * Lines 1182–1230: Upsert for `data_kelas` targets `onConflict: 'sekolah_id, nama_kelas'` with graceful fallback if table is missing or unindexed.
   - `src/components/AdminKelasView.tsx`:
     * Lines 344–361: Implements `handleDownloadClassTemplate` downloading `Template_Data_Kelas.csv`.
     * Lines 364–419: Implements `handleClassFileUpload` importing via `importMasterDataFromCsv`.
     * Lines 179–185: Listens to `sipjam:kelas-updated` to trigger live refresh when class or student records are mutated.

4. **Empirical Adversarial Stress Testing (`tests/adversarial_m2_template_and_import_challenger.test.ts`)**:
   - Authored and ran a 19-test adversarial stress harness.
   - Output: 19/19 PASSED (0 failed).
   - Adversarial scenarios passed:
     * Delimiter autodetection & encoding: Semicolon (Indonesian Excel), TSV (Tab), Pipe (`|`), Unix LF (`\n`), Windows CRLF (`\r\n`), Bare CR (`\r`), UTF-8 BOM (`\uFEFF`), and RFC 4180 escaped quotes (`"X ""Merdeka"" Unggulan"`).
     * Incompatible template pre-validation: Uploading Guru CSV to Siswa table and Kalender CSV to Kelas table throws immediate descriptive errors without database roundtrips.
     * Empty and 1-line CSV files rejected cleanly without unhandled crashes.
     * Anti-dummy and duplicate detection on class names rejected with row indicators (`Baris 1`, `Baris 2`).
     * Tingkat auto-derivation across Arabic and Roman numerals (`10`, `X`, `11`, `XI`, `12`, `XII`, and `Lainnya`).
     * Student deduplication: Matched existing student NISN `0011223344` and reused UUID `11111111-1111-4111-8111-111111111111`.

5. **Static Typecheck and Build**:
   - `npx tsc --noEmit`: Exited with code 0 (0 errors).
   - `npm run build`: Exited with code 0 (compiled successfully with Turbopack, static page generation 13/13 succeeded).

---

## 2. Logic Chain

1. **Verification of Acceptance Criteria 1 (Template CSV Harmonization)**:
   - Observations 3 and 4 show all 7 master data templates (`Data_Kelas`, `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`) are properly defined and aligned with the database schema.
   - Invariants from prior milestones are fully preserved: `Kalender_Pendidikan` and `Jadwal_Pelajaran` omit `id` to prevent PostgreSQL Error 22P02, while `Data_Guru` includes `sekolah_id` to prevent PostgreSQL Error 23502.

2. **Verification of Acceptance Criteria 2 (CSV Parsing, Validation & Idempotency)**:
   - Observation 3 shows `normalizeCsvHeaders` normalizes headers for all 7 entities without collisions.
   - Pre-validation via `REQUIRED_HEADERS_BY_TABLE` catches wrong template uploads early.
   - Anti-dummy and within-file duplicate guards reject invalid entries with clear, localized row-level feedback.
   - Student re-import queries existing records by `(sekolah_id, nisn)` and maps their UUIDs, proving that updates happen in-place without generating duplicate student rows.

3. **Verification of Acceptance Criteria 3 (Zero Regression & Stability)**:
   - Observation 1 demonstrates that all 54 existing test files in `npm test` continue to pass 100%.
   - Observation 2 confirms that all 5 dedicated invariant and regression test suites pass 100%.
   - Observation 5 verifies static type safety (`npx tsc --noEmit`) and production bundle buildability (`npm run build`).

---

## 3. Caveats

- **NISN-less Students**: Students registered without an NISN (empty or `"-"`) are assigned genuine UUIDs and will not be deduplicated by NISN; this is expected behavior for unassigned/unregistered identification numbers.
- No other caveats.

---

## 4. Conclusion

The Milestone 2 implementation for "Penyelarasan Template Master Data & Impor CSV" satisfies all functional requirements and acceptance criteria in `ORIGINAL_REQUEST.md` and `PROJECT.md`. It preserves all test invariants and achieves zero regression across the entire automated test suite.

**VERDICT: APPROVE**

---

## 5. Verification Method

To independently verify the empirical results documented above, execute the following commands in the workspace root:

1. **Milestone 2 Invariant & Harmonization Suite**:
   ```bash
   npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts
   ```
   *Expected outcome*: 16/16 PASSED (0 failed).

2. **Milestone 2 Adversarial Stress Test Suite**:
   ```bash
   npx tsx tests/adversarial_m2_template_and_import_challenger.test.ts
   ```
   *Expected outcome*: 19/19 PASSED (0 failed).

3. **Core Regression & Invariant Suites**:
   ```bash
   npx tsx tests/production_admin_adjustments.test.ts
   npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts
   npx tsx tests/adversarial_r1_r5_stress_test.ts
   npx tsx tests/adversarial_o27_m4_challenger.test.ts
   npx tsx tests/adversarial_centralized_class_allocation_m1.test.ts
   ```
   *Expected outcome*: All suites exit with code 0 and 0 failures.

4. **Full Automated Project Regression Suite**:
   ```bash
   npm test
   ```
   *Expected outcome*: 54+ test files pass 100% with 0 failures.

5. **Typecheck & Production Build Verification**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   *Expected outcome*: Both commands exit with code 0.
