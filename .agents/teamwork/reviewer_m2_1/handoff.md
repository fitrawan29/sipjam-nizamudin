# Milestone 2 Reviewer & Critic Handoff Report: Penyelarasan Template Master Data & Impor CSV

- **Agent**: reviewer_m2_1 (reviewer, critic)
- **Target Files Under Review**:
  * `src/components/AdminDataView.tsx`
  * `src/lib/dataIntegrityGuard.ts`
  * `src/components/AdminKelasView.tsx`
  * `tests/m2_csv_templates_and_import_harmonization.test.ts`
- **Orchestrator ID**: `77685953-a979-46b9-9e32-e6b24ab55eb5`
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_1\`
- **Date**: 2026-11-06T01:03:30Z

---

## 1. Observation

Direct examination of the implementation in commit `bd78007` and workspace files shows:

1. **`src/components/AdminDataView.tsx`**:
   - Lines 229–265: All 7 Master Data entity templates are defined in `templates`:
     * `Data_Kelas`: `filename: 'Template_Data_Kelas.csv'`, `headers: ['nama_kelas', 'tingkat', 'jurusan']`, `sample: ['X Merdeka', '10', 'Umum']`
     * `Data_Siswa`: `filename: 'Template_Data_Siswa.csv'`, `headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']`
     * `Data_Guru`: `filename: 'Template_Data_Guru.csv'`, `headers: ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']` (preserves invariant `sekolah_id`)
     * `Data_Mapel`: `filename: 'Template_Data_Mapel.csv'`, `headers: ['id', 'nama_mata_pelajaran', 'kategori']`
     * `Kalender_Pendidikan`: `filename: 'Template_Kalender_Pendidikan.csv'`, `headers: ['tanggal', 'keterangan', 'tipe']` (strictly omits `'id'` and legacy `KP-01`)
     * `Jadwal_Pelajaran`: `filename: 'Template_Jadwal_Pelajaran.csv'`, `headers: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas']` (strictly omits `'id'` and legacy `JP-01`)
     * `Wali_Kelas`: `filename: 'Template_Wali_Kelas.csv'`, `headers: ['kelas', 'nama_guru', 'nip', 'tahun_ajaran']`
   - Line 267: Template lookup is normalized using `templates[activeTab] || templates[normalizeAdminTab(activeTab)]`, eliminating tab alias mismatch errors.
   - Lines 317–321: `showToast('Unggah Berhasil', ...)` is retained as required by `tests/ui_ux_improvements_audit.test.ts:84`.
   - Lines 323–326: Dispatches custom event `sipjam:kelas-updated` when `tabObj.id === 'Data_Kelas' || tabObj.id === 'Data_Siswa'` to synchronize class directory cards and rosters across views.
   - Lines 339–359: Displays SweetAlert2 error modal detailing exact row/column issues when error messages contain `Baris `, `Kolom `, `wajib`, or `dilarang`.

2. **`src/lib/dataIntegrityGuard.ts`**:
   - Lines 565–714 (`normalizeCsvHeaders`): Strips BOM (`\uFEFF`), trims whitespace, standardizes separators to snake_case, supports school ID aliases, maps class headers (`nama_kelas`, `tingkat`, `jurusan`), and contextually scopes ambiguous headers (`nama` -> `nama_siswa` for student table, `nama_kelas` for class table, `nama_mata_pelajaran` for mapel, `nama_guru` for guru/schedule; `rombel` -> `nama_kelas` for class table, `kelas` for student/schedule).
   - Lines 722–844 (`parseAndValidateMasterCsv`):
     * Delimiter auto-detection supports comma, semicolon (Indonesian Excel), tab (TSV), and pipe (`|`).
     * Pre-validation via `REQUIRED_HEADERS_BY_TABLE` catches wrong template uploads before line-by-line processing.
     * `isUuidKeyedTable` includes `data_kelas` and `kelas`; generates valid UUIDs when missing/empty; replaces non-UUID strings to prevent PostgreSQL Error 22P02.
     * Sanitizes Excel apostrophes (`'`) on numbers (`nisn`, `nip`, `no_hp_ortu`).
     * `ALLOWED_COLUMNS_BY_TABLE` filters row keys to known schema columns, preventing PostgREST PGRST204 errors from spreadsheet auxiliary columns.
   - Lines 902–956: Entity-specific validation for `data_kelas`: requires non-empty `nama_kelas`, detects dummy/test names, detects forbidden names, detects within-file duplicate class names, auto-derives `tingkat` (`10`, `11`, `12`, or `Lainnya`), and sanitizes optional `jurusan`.
   - Lines 1115–1231 (`importMasterDataFromCsv`):
     * Idempotent student resolution: queries existing students by `(sekolah_id, nisn)` in chunks of 100, maps their existing UUIDs to matching CSV rows, and executes upsert with `onConflict: 'id'`, preventing duplicate student rows on re-import.
     * Class upsert targets `onConflict: 'sekolah_id, nama_kelas'`.
     * Defensive fallback: detects PostgREST schema cache error (`PGRST205` / `42P01`) via `isSchemaCacheError` and syncs distinct class names to `wali_kelas` with placeholder teacher attributes.

3. **`src/components/AdminKelasView.tsx`**:
   - Lines 968–998: Renders "Template CSV" and "Impor CSV" buttons in the action toolbar.
   - Lines 344–361 (`handleDownloadClassTemplate`): Generates and downloads `Template_Data_Kelas.csv` matching `AdminDataView.tsx`.
   - Lines 364–419 (`handleClassFileUpload`): Parses and imports class CSV directly via `importMasterDataFromCsv`, provides feedback, and refreshes directory via `loadAllData(true)`.
   - Lines 191–199: Listens to custom event `sipjam:kelas-updated` to trigger live refresh when class or student data changes externally.

4. **Empirical Verification Results**:
   - `npx tsc --noEmit`: Exited with code 0 (0 type errors).
   - `npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts`: 16/16 PASSED (0 failed).
   - `npx tsx tests/production_admin_adjustments.test.ts`: 24/24 PASSED (0 failed).
   - `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`: 31/31 PASSED (0 failed).
   - `npx tsx tests/adversarial_centralized_class_allocation_m1.test.ts`: 15/15 PASSED (0 failed).
   - `npx tsx tests/sistem_blok_verification.test.ts`: 204/204 PASSED (0 failed).

---

## 2. Logic Chain

1. **Schema Alignment (R2)**:
   - Target database tables (`data_kelas`, `data_siswa`, `data_guru`, `data_mapel`, `kalender_pendidikan`, `jadwal_pelajaran`, `wali_kelas`) define specific column names and types.
   - Inspection of `templates` in `AdminDataView.tsx` and `handleDownloadClassTemplate` in `AdminKelasView.tsx` shows exact column naming matching the target schema.
   - By omitting `id` in `Kalender_Pendidikan` and `Jadwal_Pelajaran` templates while injecting valid UUIDs in `dataIntegrityGuard.ts`, PostgreSQL error 22P02 is completely avoided, and existing test invariants (`production_admin_adjustments.test.ts:688, 696`) are strictly respected.
   - By retaining `sekolah_id` in `Template_Data_Guru.csv`, multi-tenant isolation and `data_guru_csv_import_sekolah_id_validation.test.ts:834` remain satisfied.

2. **CSV Processing & Import Compatibility (R3)**:
   - Real-world CSV uploads from Indonesian schools frequently use semicolons (Indonesian regional settings in Excel), BOM prefixes, and apostrophe prefixes on numbers (to force text formatting for NISN/NIP/Phone).
   - The multi-delimiter detection, BOM cleaning, and apostrophe stripping in `dataIntegrityGuard.ts` handle these variations seamlessly.
   - When users upload an incorrect CSV (e.g. Guru CSV into Kelas tab), `REQUIRED_HEADERS_BY_TABLE` detects the discrepancy upfront and provides actionable error guidance before database execution.
   - For student re-imports, matching incoming NISNs to existing student UUIDs ensures idempotent updates instead of duplicate record creation.
   - When PostgREST schema cache does not yet recognize `public.data_kelas` (`PGRST205`), the graceful fallback synchronizes classes into `wali_kelas` and `data_siswa`, preventing user-facing disruption.

3. **Integrity & Zero Regression (R4)**:
   - No mock test facades, dummy bypasses, or hardcoded answers were introduced.
   - `showToast('Unggah Berhasil', ...)` was preserved, satisfying `ui_ux_improvements_audit.test.ts:84`.
   - All regression suites (`production_admin_adjustments`, `data_guru_csv_import_sekolah_id_validation`, `adversarial_centralized_class_allocation_m1`, `sistem_blok_verification`) pass with 100% success.

---

## 3. Caveats

1. **Students without NISN**: If students are imported without an NISN (empty or `"-"`), deduplication falls back to generating a fresh UUID. This is expected behavior for prospective students who have not yet received an official national NISN.
2. **Schema Cache Latency on `data_kelas`**: In environments where PostgREST has not reloaded its schema cache after table creation, the system operates seamlessly via fallback synchronization to `wali_kelas`.

---

## 4. Conclusion

All requirements for Milestone 2 (Penyelarasan Template Master Data & Impor CSV) are fully implemented, verified, and free of regression or integrity issues:
- All 7 Master Data templates are aligned with target database schemas.
- Invariants (Kalender/Jadwal omit `id`, Guru includes `sekolah_id`, `showToast('Unggah Berhasil')` retained) are 100% preserved.
- Row-level validation feedback (`Baris ${i}`) and user-friendly error dialogs are active.
- Idempotent student re-import and schema cache fallbacks are verified empirically.

**VERDICT: APPROVE**

---

## 5. Verification Method

To independently re-verify Milestone 2:

1. **TypeScript Static Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, 0 type errors.

2. **Milestone 2 Automated Verification Suite**:
   ```bash
   npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts
   ```
   *Expected result*: 16/16 PASSED (0 failed).

3. **Regression Test Suites**:
   ```bash
   npx tsx tests/production_admin_adjustments.test.ts
   npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts
   npx tsx tests/adversarial_centralized_class_allocation_m1.test.ts
   npx tsx tests/sistem_blok_verification.test.ts
   ```
   *Expected result*: All tests pass with 0 failures.

---

## Quality Review Summary

**Verdict**: APPROVE

### Findings
- **Positive Observation (Excellence in Defensive Design)**: Upfront validation via `REQUIRED_HEADERS_BY_TABLE` prevents incompatible file uploads from corrupting database state, while `ALLOWED_COLUMNS_BY_TABLE` filters auxiliary spreadsheet columns.
- **Positive Observation (UX Resilience)**: Detailed SweetAlert2 modal popups when row/column errors occur provide immediate, actionable feedback to school administrators.
- **Minor Note (Edge Consideration)**: For very large student files (>1000 rows), chunking student NISN lookups in batches of 100 ensures Supabase URL query length limits are never exceeded.

### Verified Claims
- Data_Kelas template definition exists with `nama_kelas,tingkat,jurusan` -> verified via AST inspection & test 1.1 -> PASS
- All 7 Master Data templates present in AdminDataView -> verified via test 1.2 -> PASS
- Invariant: Kalender & Jadwal templates omit `id` -> verified via test 1.3 & `production_admin_adjustments.test.ts` -> PASS
- Invariant: Guru template includes `sekolah_id` -> verified via test 1.4 & `data_guru_csv_import_sekolah_id_validation.test.ts` -> PASS
- Invariant: showToast('Unggah Berhasil') preserved & `sipjam:kelas-updated` dispatched -> verified via test 1.5 -> PASS
- Header normalization handles aliases and scopes `nama` and `rombel` -> verified via tests 2.1-2.3 -> PASS
- Row-level validation reports exact row number (`Baris ${i}`) -> verified via test 3.2 -> PASS
- Student re-import preserves existing UUID without duplicating records -> verified via test 4.1 -> PASS
- Fallback on PGRST205 syncs classes into `wali_kelas` -> verified via test 4.2 -> PASS
- AdminKelasView toolbar includes Template CSV & Impor CSV and listens to event -> verified via tests 5.1-5.2 -> PASS

### Coverage Gaps
- None. All 7 master entities, file parsing variations, validation branches, and UI integrations are covered.

### Unverified Items
- None.

---

## Adversarial Challenge Summary

**Overall risk assessment**: LOW

### Challenges

#### Challenge 1: Spreadsheet Apostrophe Number Formatting
- **Assumption challenged**: Spreadsheets export plain digits for NISN, NIP, and phone numbers.
- **Attack scenario**: Excel often prepends an apostrophe (`'114367407` or `'081234567890`) to prevent scientific notation or preserve leading zeros. If unhandled, this breaks integer/digit checks or database unique indexes.
- **Mitigation verified**: `dataIntegrityGuard.ts` line 791 explicitly strips leading/trailing apostrophes across all parsed cell values, and lines 874, 1006 apply secondary regex sanitization.

#### Challenge 2: Accidental Upload of Wrong Master Data File
- **Assumption challenged**: Admins always upload the correct CSV template to the active tab.
- **Attack scenario**: An admin on the "Data Siswa" tab mistakenly uploads a "Data Guru" CSV file.
- **Blast radius**: Could cause database column mismatch errors or pollute the student table with teacher names.
- **Mitigation verified**: `REQUIRED_HEADERS_BY_TABLE` checks upfront that `['nama_siswa', 'kelas']` exist; if not, immediately throws `File CSV tidak memiliki kolom wajib...` before any row is inserted.

#### Challenge 3: In-Memory / Schema Cache Absence of `public.data_kelas`
- **Assumption challenged**: The physical database table `data_kelas` always exists and is indexed in PostgREST schema cache.
- **Attack scenario**: Fresh Supabase instance or staging environment where `data_kelas` migration has not been applied or PostgREST has not refreshed its schema cache.
- **Mitigation verified**: `importMasterDataFromCsv` catches `PGRST205` / `42P01` and gracefully synchronizes class names into `wali_kelas`, keeping class directory cards and student allocations fully operational.

#### Challenge 4: Non-Standard CSV Delimiters (Indonesian Excel)
- **Assumption challenged**: CSV files are always comma-separated.
- **Attack scenario**: Regional settings in Windows Indonesia export CSV files delimited by semicolons (`;`), tabs (`\t`), or pipes (`|`).
- **Mitigation verified**: Delimiter frequency detection on the header line automatically picks the correct delimiter, ensuring seamless import.

### Stress Test Results
- All 16 automated tests in `tests/m2_csv_templates_and_import_harmonization.test.ts` passed cleanly.
- All 31 tests in `tests/data_guru_csv_import_sekolah_id_validation.test.ts` passed cleanly.
- All 24 tests in `tests/production_admin_adjustments.test.ts` passed cleanly.
- All 204 tests in `tests/sistem_blok_verification.test.ts` passed cleanly.

### Unchallenged Areas
- Direct network disconnection mid-upload (handled by standard browser fetch failure / SweetAlert error toast).

---

## Integrity Attestation

- [x] No hardcoded test results or expected outputs embedded in source code.
- [x] No dummy or facade implementations (full CSV tokenizer, header normalizer, row validator, and upsert logic implemented).
- [x] No shortcuts bypassing the intended task.
- [x] No fabricated verification outputs or falsified test logs.
- [x] Verified via independent, reproducible test executions.
