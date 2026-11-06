# Reviewer & Adversarial Critic Report: Milestone 2 (Instance 2)

- **Reviewer**: reviewer_m2_2 (reviewer, critic)
- **Target Files**:
  * `src/lib/dataIntegrityGuard.ts`
  * `src/components/AdminDataView.tsx`
  * `src/components/AdminKelasView.tsx`
  * `tests/m2_csv_templates_and_import_harmonization.test.ts`
- **Interfaces / Specifications**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `worker_m2/handoff.md`
- **Date**: 2026-11-06T01:05:00Z
- **Final Verdict**: `VERDICT: APPROVE`

---

## 1. Observation

Direct code inspection and test execution yielded the following observations:

1. **Student Import Idempotency by `(sekolah_id, nisn)` (`src/lib/dataIntegrityGuard.ts:1127–1172`)**:
   - `importMasterDataFromCsv` extracts distinct non-empty NISNs (filtering out empty strings and `'-'`).
   - Queries `data_siswa` scoped to `sekolah_id` in chunks of 100 (`.in('nisn', chunk)`).
   - Replaces the newly generated random UUID with the matched student's existing UUID `s.id`.
   - Batch upsert runs with `upsertOptions.onConflict = 'id'`, performing in-place `UPDATE` on existing records instead of creating duplicate student rows.

2. **Defensive Schema Cache Error Handling for `data_kelas` (`src/lib/dataIntegrityGuard.ts:545–563, 1195–1215, 1232–1264`)**:
   - `isSchemaCacheError` identifies `PGRST205`, `42P01`, `PGRST200`, `PGRST204`, and messages containing `"could not find the table"` or `"relation ... does not exist"`.
   - When `data_kelas` upsert encounters `isSchemaCacheError`, `isTableMissing` is set to `true` and the loop terminates safely without throwing an unhandled exception.
   - Falls back gracefully by synchronizing distinct class names into `wali_kelas` with placeholder teacher attributes (`nama_guru: '-'`, `nip: '-'`, `tahun_ajaran: '2024/2025'`).
   - If PostgreSQL reports `42P10` (no unique constraint on `(sekolah_id, nama_kelas)`), it retries upsert with `onConflict: 'id'`.

3. **Anti-Dummy, Anti-22P02, and Anti-23502 Protections Across All 7 Tables (`src/lib/dataIntegrityGuard.ts:759–1109`)**:
   - Pre-validation enforces mandatory headers via `REQUIRED_HEADERS_BY_TABLE`:
     * `data_kelas`: `['nama_kelas']`
     * `data_siswa`: `['nama_siswa', 'kelas']`
     * `data_guru`: `['nama_guru']`
     * `data_mapel`: `['nama_mata_pelajaran']`
     * `kalender_pendidikan`: `['tanggal', 'keterangan']`
     * `jadwal_pelajaran`: `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']`
     * `wali_kelas`: `['kelas', 'nama_guru']`
   - Anti-Dummy checks: `isDummyOrTestString` and `isForbiddenName` guard class names, teacher names, teacher NIPs, subjects, student names, and grade levels.
   - Anti-22P02: `isUuidKeyedTable` covers `kalender_pendidikan`, `jadwal_pelajaran`, `data_siswa`, `wali_kelas`, `sistem_blok`, `data_kelas`, and `kelas`. Legacy string IDs (e.g. `'KP-01'`, `'JP-01'`) and dirty GUIDs are converted to genuine UUIDs.
   - Anti-23502: Empty/null values on required fields throw localized error messages with exact row numbers (`Baris ${i}`). Default fallbacks are applied for `status` (`'Aktif'`), `sekolah_id` (from session or default), and `tahun_ajaran` (`'2024/2025'`).
   - Spreadsheet column sanitization: `ALLOWED_COLUMNS_BY_TABLE` strips auxiliary spreadsheet columns before database insertion.

4. **Template Harmonization in `AdminDataView.tsx:229–265` & `AdminKelasView.tsx:344–419`**:
   - `AdminDataView.tsx` includes all 7 entities in `templates` record with exact headers:
     * `Data_Kelas`: `['nama_kelas', 'tingkat', 'jurusan']`
     * `Data_Siswa`: `['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']`
     * `Data_Guru`: `['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']`
     * `Data_Mapel`: `['id', 'nama_mata_pelajaran', 'kategori']`
     * `Kalender_Pendidikan`: `['tanggal', 'keterangan', 'tipe']` (omits `id`)
     * `Jadwal_Pelajaran`: `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']` (omits `id`)
     * `Wali_Kelas`: `['kelas', 'nama_guru', 'nip', 'tahun_ajaran']`
   - `AdminKelasView.tsx` incorporates "Template CSV" and "Impor CSV" buttons and listens to `'sipjam:kelas-updated'` for synchronized reactivity.

5. **Test and Verification Command Results**:
   - `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`: **31/31 PASSED** (0 failed).
   - `npx tsx tests/production_admin_adjustments.test.ts`: **24/24 PASSED** (0 failed).
   - `npx tsc --noEmit`: **0 ERRORS** (exited code 0).
   - `npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts`: **16/16 PASSED** (0 failed).
   - `npm test`: **All 54 test files PASSED** (0 failed, zero regression).

---

## 2. Logic Chain

1. **Verification of Student Deduplication**:
   - Observation 1 demonstrates that student records uploaded with existing NISNs within the same `sekolah_id` have their target UUID replaced by the existing row's UUID.
   - Consequently, executing `upsert` with `onConflict: 'id'` translates to an `UPDATE` operation on the existing student row.
   - New students (or students with unassigned/hyphen NISNs) retain fresh UUIDs and are inserted cleanly.
   - Therefore, student import is fully idempotent.

2. **Verification of Schema Cache Error Boundary**:
   - Observation 2 confirms that `isSchemaCacheError` detects PostgREST error codes `PGRST205` / `42P01`.
   - When encountered, execution breaks from the upsert loop and delegates to creating homeroom class associations in `wali_kelas`.
   - The user receives an informative toast without a fatal rejection or unhandled crash.
   - Therefore, `data_kelas` upsert handles missing tables or schema cache delays defensively.

3. **Verification of Invariant Preservation and Protections**:
   - Observation 3 shows that all 7 master data tables have explicit pre-validation header requirements, anti-dummy checks, UUID sanitization, and allowed column whitelisting.
   - Invariants from existing test suites (omission of `'id'` in Kalender and Jadwal templates, presence of `'sekolah_id'` in Data Guru, and `showToast('Unggah Berhasil')`) are 100% satisfied.
   - Observation 5 confirms that running the regression suites and `npm test` produces zero failures across all 54 test files.

4. **Integrity Verification**:
   - No hardcoded test responses or bypass shortcuts exist in source code.
   - The implementation applies genuine database queries, chunks batches, normalizes aliases, and validates business rules.

---

## 3. Caveats

1. **Unassigned NISN Scenarios**: In registration workflows where students have blank or hyphen (`'-'`) NISNs, deduplication by NISN is safely bypassed to avoid collapsing distinct students into a single record.
2. **PostgREST Schema Reload**: If a database administrator creates the physical `data_kelas` table in Supabase, PostgREST may require a schema cache reload (`NOTIFY pgrst, 'reload schema'`). Until reloaded, the engine automatically falls back to `wali_kelas` syncing.

---

## 4. Conclusion & Verdict

The Milestone 2 implementation for Penyelarasan Template Master Data & Impor CSV is robust, fully compliant with specifications, defensively coded against database schema errors, and passes all regression tests with zero failures.

**VERDICT: APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Execute Milestone 2 Focused Verification**:
   ```bash
   npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts
   npx tsx tests/production_admin_adjustments.test.ts
   npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts
   ```
   *Expected*: All tests pass with 0 failures.

2. **Execute Static Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 type errors.

3. **Execute Full Project Regression**:
   ```bash
   npm test
   ```
   *Expected*: All 54 test suites pass cleanly.

---

## 6. Adversarial Challenge Report

**Overall Risk Assessment**: **LOW**

### Challenge 1: Large Student Roster Upload (> 100 students)
- **Assumption Challenged**: Student deduplication by NISN can handle rosters of hundreds of students without exceeding PostgREST URL filter lengths.
- **Attack Scenario**: Uploading a roster of 500 students in one CSV causing `.in('nisn', ...)` to generate a massive HTTP GET URL exceeding PostgREST or web server URI limits (HTTP 414).
- **Blast Radius**: Student import failure for entire school cohorts.
- **Mitigation**: Verified at `src/lib/dataIntegrityGuard.ts:1140–1159`: NISN lookup is partitioned into `chunkSize = 100` sub-queries, completely avoiding URI overflow.

### Challenge 2: Accidental Incompatible Template Upload
- **Assumption Challenged**: An admin uploading a Teacher CSV into the Student tab will not corrupt database state or trigger cryptic Postgres foreign key errors.
- **Attack Scenario**: Admin clicks upload on "Data Siswa" but selects `Template_Data_Guru.csv`.
- **Blast Radius**: PostgREST NOT NULL or type mismatch exceptions.
- **Mitigation**: Verified at `src/lib/dataIntegrityGuard.ts:773–781`: `REQUIRED_HEADERS_BY_TABLE` validates header columns before any row processing. The system rejects the file immediately with: `"File CSV tidak memiliki kolom wajib 'nama_siswa, kelas'. Pastikan Anda mengunggah file template yang sesuai untuk tabel ini."`

### Challenge 3: Auxiliary Spreadsheet Columns from User Exports
- **Assumption Challenged**: User-generated spreadsheets with auxiliary commentary columns do not cause PostgREST `PGRST204` errors.
- **Attack Scenario**: User exports from Excel with added columns (`Catatan`, `Ranking`, `Formula`).
- **Blast Radius**: Complete import failure.
- **Mitigation**: Verified at `src/lib/dataIntegrityGuard.ts:1076–1100`: `ALLOWED_COLUMNS_BY_TABLE` sanitizes each row, retaining only authorized database schema columns.
