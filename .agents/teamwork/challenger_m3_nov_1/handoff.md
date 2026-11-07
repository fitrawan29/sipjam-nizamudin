# Handoff Report — Milestone 3 Challenger (challenger_m3_nov_1)

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Empirical Verification of Relational Dependency Checks
- **Target File**: `src/lib/dataIntegrityGuard.ts` (lines 1437–1700)
- **Empirical Test Suite**: `tests/adversarial_m3_dependencies.test.ts` (Sections 1, 2, 4, 5)
- **Observed Behavior**:
  1. `data_siswa`: Successfully rejected students referencing unregistered classes with `MasterDataValidationError` (code: `'23503'`, referenceTable: `'data_kelas'`, column: `'kelas'`, formatted message with exact row numbers). Correctly supported case-insensitivity and fallback to `wali_kelas`.
  2. `jadwal_pelajaran`: Successfully caught missing teachers (`referenceTable: 'data_guru'`), missing mapel (`referenceTable: 'data_mapel'`), and missing class (`referenceTable: 'data_kelas'`). Multi-failure rows were aggregated with precise row diagnostics.
  3. `wali_kelas`: Successfully caught missing teachers and missing classes before mutation.
  4. **Zero Database Pollution**: In `importMasterDataFromCsv`, when relational validation fails during Stage 3 (30%), the process aborts immediately. `supabase.from(...).upsert` was never called (`upsertCalled === false`).

### 1.2 Empirical Verification of `guru_id` Auto-Population in Wali Kelas
- **Target File**: `src/lib/dataIntegrityGuard.ts` (lines 1640–1659)
- **Observed Behavior**:
  1. When a `wali_kelas` record without `guru_id` or `nip` is validated against existing `data_guru` records, `row.guru_id` is automatically populated from `data_guru.id`, and `row.nip` is automatically populated from `data_guru.nip`.
  2. Auto-enrichment works both by normalized teacher name matching and by NIP matching across academic title variations (`Drs.`, `M.Pd.`, etc.).
  3. Pre-existing custom `guru_id` values are preserved without corruption.

### 1.3 Empirical Verification of CSV Template Headers vs Database Schema
- **Target Files**:
  * `src/components/AdminDataView.tsx` (lines 504–551: `handleDownloadTemplate`)
  * `src/lib/dataIntegrityGuard.ts` (lines 656–815: `normalizeCsvHeaders`, lines 864–879: `REQUIRED_HEADERS_BY_TABLE`, lines 1250–1265: `ALLOWED_COLUMNS_BY_TABLE`)
  * `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (lines 56–140: table definitions)
- **Confirmed Passing Entities**:
  * 8 entities (`data_siswa`, `data_kelas`, `data_guru`, `jadwal_pelajaran`, `wali_kelas`, `users`, `kalender_pendidikan`, `sistem_blok`) match schema columns and pass roundtrip validation cleanly.
- **CRITICAL DEFECT DETECTED (DEFECT-01)**:
  * In `src/components/AdminDataView.tsx` (lines 521–525):
    ```ts
    Data_Mapel: {
      filename: 'Template_Data_Mapel.csv',
      headers: ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok'],
      sample: ['MP-01', 'Matematika Wajib', 'Umum', 'Wajib']
    },
    ```
  * In `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (lines 72–81) & `dataIntegrityGuard.ts` (line 1257):
    Both `kategori TEXT` and `kelompok TEXT` exist as distinct, independent columns in table `data_mapel`.
  * In `src/lib/dataIntegrityGuard.ts` (lines 800–803):
    ```ts
    // 11. Category aliases
    if (clean === 'kelompok' || clean === 'kategori_mapel') {
      return 'kategori';
    }
    ```
  * **Empirical Failure Output** in `tests/adversarial_m3_dependencies.test.ts`:
    ```
    ✖ [FAIL] 3.5: DEFECT-01: Data_Mapel template column "kelompok" is preserved without collision with "kategori"
       AssertionError [ERR_ASSERTION]: Defect in dataIntegrityGuard.ts line 801: "kategori" was overwritten by "kelompok" value!
    'Wajib' !== 'Umum'
    ```
  * When `Template_Data_Mapel.csv` is uploaded:
    1. Header `'kelompok'` is transformed into `'kategori'`.
    2. The parsed header list becomes `['id', 'nama_mata_pelajaran', 'kategori', 'kategori']`.
    3. The second `'kategori'` header (originally `kelompok`) overwrites the first `'kategori'` property on the row object: `row.kategori = 'Wajib'`.
    4. Property `row.kelompok` is dropped (`undefined`).
    5. Database column `data_mapel.kelompok` receives `NULL`, while `data_mapel.kategori` receives the wrong value (`'Wajib'` instead of `'Umum'`).

---

## 2. Logic Chain

1. **Relational Dependency & Auto-Population**:
   - `validateRelationalDependencies` queries parent entities (`data_kelas`, `data_guru`, `data_mapel`) prior to upserting.
   - For `data_siswa`, missing classes throw `MasterDataValidationError` with code `'23503'`, preventing DB constraint violations.
   - For `jadwal_pelajaran`, missing teachers, subjects, or classes throw descriptive errors detailing row numbers and reference tables.
   - For `wali_kelas`, matching teachers auto-enriches `guru_id` and `nip`.
   - In `importMasterDataFromCsv`, this check executes at stage 3 (30%) before the batch upsert loop (stage 4, 40%+). Because it throws, no upsert is ever called, ensuring zero DB pollution.

2. **Template Harmonization Defect**:
   - Requirement R4 explicitly mandates: *"Memastikan template data pada masing-masing master data sesuai dengan format skema database agar tidak ada error saat pengunggahan."*
   - `AdminDataView.tsx` correctly included both `'kategori'` and `'kelompok'` in `Template_Data_Mapel.csv`.
   - However, `normalizeCsvHeaders` in `src/lib/dataIntegrityGuard.ts` treats `'kelompok'` as an alias for `'kategori'` across all entities unconditionally.
   - Because `data_mapel` has both columns, aliasing `'kelompok'` to `'kategori'` produces duplicate object keys during row assignment, causing data loss for `'kelompok'` and silent corruption of `'kategori'`.

---

## 3. Caveats

- Tests were run with mocked Supabase responses for cross-table relational dependencies to test all permutations deterministically without mutating live production tenant data.
- The defect is isolated to `data_mapel`; all other 8 entity templates passed roundtrip schema validation without error.

---

## 4. Conclusion

- **Verdict**: **REQUEST_CHANGES**
- **Required Remediation by Worker**:
  In `src/lib/dataIntegrityGuard.ts` around line 800:
  Update the category alias logic so that `kelompok` is NOT converted to `'kategori'` when `isMapel` is true (or remove the alias for `kelompok` so `data_mapel` preserves both `kategori` and `kelompok` columns):
  ```ts
  // 11. Category aliases
  if (!isMapel && clean === 'kelompok') {
    return 'kategori';
  }
  if (clean === 'kategori_mapel') {
    return 'kategori';
  }
  ```
  Once fixed, re-run `npx tsx tests/adversarial_m3_dependencies.test.ts` to confirm 26/26 tests pass.

---

## 5. Verification Method

To independently reproduce this finding:
1. Run adversarial test suite:
   ```bash
   npx tsx tests/adversarial_m3_dependencies.test.ts
   ```
2. Observe test `3.5: DEFECT-01: Data_Mapel template column "kelompok" is preserved without collision with "kategori"` failing with:
   `AssertionError: Defect in dataIntegrityGuard.ts line 801: "kategori" was overwritten by "kelompok" value! 'Wajib' !== 'Umum'`
3. Check TypeScript compilation:
   ```bash
   npx tsc --noEmit
   ```
