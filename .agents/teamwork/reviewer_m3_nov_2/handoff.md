# Reviewer & Adversarial Critic Handoff Report — Milestone 3 (Requirement R4)

**Agent**: `reviewer_m3_nov_2`  
**Roles**: reviewer, critic  
**Target**: Milestone 3 Implementation by `worker_m3_nov` (Commit `485ac42`)  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

### 1.1 Visual Workflow Stepper & Tab Sequence Invariants
- **File**: `src/components/AdminDataView.tsx` (lines 217–227)
  `tabs` array contains all 9 required master data tabs in exact sequence:
  1. `Data_Siswa` (Siswa, table: `data_siswa`, step: 1)
  2. `Data_Kelas` (Kelas, table: `data_kelas`, step: 2)
  3. `Data_Mapel` (Mapel, table: `data_mapel`, step: 3)
  4. `Data_Guru` (Guru, table: `data_guru`, step: 4)
  5. `Jadwal_Pelajaran` (Jadwal, table: `jadwal_pelajaran`, step: 5)
  6. `Wali_Kelas` (Wali Kelas, table: `wali_kelas`, step: 6)
  7. `Pengguna` (Pengguna, table: `users`, step: 7)
  8. `Kalender_Pendidikan` (Kalender, table: `kalender_pendidikan`, step: 8)
  9. `sistem_blok` (Periode Sistem Blok, table: `sistem_blok`, step: 9, `optional: true`)
- **File**: `src/components/AdminDataView.tsx` (lines 2457–2558)
  Renders interactive Clay-styled "Panduan Alur Penginputan Master Data" visual workflow stepper pipeline:
  - Active step highlighted with purple-to-indigo gradient and ring outline (`bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-400/50`).
  - Past steps display checkmark badge (`<i className="fa-solid fa-check text-[9px] sm:text-[10px]"></i>`).
  - Pipeline connections render `fa-chevron-right` dividers.
  - Buttons call `handleSwitchTab(step.id)` which synchronizes URL query params (`?view=view-admin-data&tab=${tabId}`).
- **Integrity**: Real, dynamic pipeline; zero hardcoded dummy elements or facades.

### 1.2 Pre-Upload Relational Validation & `safeSelect` Execution
- **File**: `src/lib/dataIntegrityGuard.ts` (lines 1437–1700, function `validateRelationalDependencies`)
  - `data_siswa`: verifies `kelas` exists in `data_kelas` or `wali_kelas`.
  - `jadwal_pelajaran`: verifies `nama_guru` exists in `data_guru`, `mata_pelajaran` exists in `data_mapel`, and `kelas` exists in `data_kelas`.
  - `wali_kelas`: verifies `nama_guru` exists in `data_guru`, `kelas` exists in `data_kelas`, and automatically enriches `row.guru_id` and `row.nip` from `data_guru`.
  - `safeSelect` helper (lines 1447–1460): Executes defensive queries scoped by `sekolah_id`, gracefully falling back to `{ data: null }` if tables or Supabase clients are missing.
  - Aborts immediately before database upsert with `MasterDataValidationError` (code: `'23503'`), returning exact row numbers and remediation advice.

### 1.3 PostgreSQL Error Translation & Diagnostic Information
- **File**: `src/lib/dataIntegrityGuard.ts` (lines 1324–1432, function `translateDatabaseError`)
  - Converts PostgreSQL error codes:
    * `23503` (Foreign Key Violation): identifies missing reference table and received value, while preserving exact compatibility prefix `Baris ${rowNumber}: `.
    * `23502` (Not-Null Violation): extracts empty column name and reports `Baris ${rowNumber}: Gagal menyimpan data: terdapat kolom wajib yang bernilai kosong`.
    * `23505` (Unique Violation): parses composite keys, strips multi-tenant column `sekolah_id`, resolves business key, and finds matching row in batch.
    * `42501` (Row-Level Security): explains school tenant isolation policy.
  - Tagged parsed rows with non-enumerable `_csvRowNumber = i`, preserving line numbers through 50-row batch chunking without polluting database upsert payload.

### 1.4 6-Stage Progress Tracking & Cooperative Micro-Yields
- **File**: `src/lib/dataIntegrityGuard.ts` (lines 1713–1870, function `importMasterDataFromCsv`)
  Emits 6 sequential stages:
  1. `Membaca berkas CSV...` (5%)
  2. `Memvalidasi skema data...` (15%)
  3. `Memeriksa dependensi relasional...` (30%)
  4. `Mengunggah data master (Batch X dari Y)...` (40% - 90%)
  5. `Sinkronisasi data sistem...` (95%)
  6. `Unggah master data berhasil!` (100%)
  Each stage yields to the event loop via `await new Promise(r => setTimeout(r, 10))`.
- **UI Integration**:
  - `AdminDataView.tsx` (lines 2586–2616): Animated gradient progress bar (`bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500`) with batch status (`Batch X dari Y`, `N dari M baris`) and `showMasterDataDiagnosticModal` modal helper.
  - `AdminKelasView.tsx` (lines 1310–1340): Matching animated progress bar and diagnostic modal integration.

### 1.5 Automated Build & Test Execution
- `npx tsc --noEmit` exited with code 0 (zero errors).
- `npx tsx tests/master_data_workflow_stepper_and_relational_validation.test.ts` passed 18/18 checks (code 0).
- `npm test` ran all 62 suites and exited with code 0.
- `npm run build` completed static page generation (13/13 pages) with code 0.
- `npx tsx tests/adversarial_m3_diagnostics.test.ts` passed 22/22 tests (code 0).
- `npx tsx tests/adversarial_m3_dependencies.test.ts` passed 25/26 tests, with **1 FAILING TEST (code 1)**.

### 1.6 CRITICAL DEFECT: `data_mapel.kelompok` Overwritten by Category Normalization
- **File**: `src/lib/dataIntegrityGuard.ts` (lines 800–803)
  ```ts
  // 11. Category aliases
  if (clean === 'kelompok' || clean === 'kategori_mapel') {
    return 'kategori';
  }
  ```
- **File**: `src/components/AdminDataView.tsx` (lines 521–525)
  ```ts
  Data_Mapel: {
    filename: 'Template_Data_Mapel.csv',
    headers: ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok'],
    sample: ['MP-01', 'Matematika Wajib', 'Umum', 'Wajib']
  },
  ```
- **Database Schema**: `src/types/database.ts` (lines 290–299)
  Table `data_mapel` has distinct columns `kategori` (`TEXT`) and `kelompok` (`TEXT`).
- **Verbatim Failure Output** (`tests/adversarial_m3_dependencies.test.ts` line 549):
  ```
  ✖ [FAIL] 3.5: DEFECT-01: Data_Mapel template column "kelompok" is preserved without collision with "kategori"
     AssertionError [ERR_ASSERTION]: Defect in dataIntegrityGuard.ts line 801: "kategori" was overwritten by "kelompok" value!
  'Wajib' !== 'Umum'
  ```
- **Impact**: When an administrator downloads `Template_Data_Mapel.csv` and uploads it, column `kelompok` is aliased to `kategori`. This causes `row['kategori']` to be overwritten by the value of `kelompok` (e.g. `'Wajib'`), while column `kelompok` is dropped from the object and saved as `NULL` in PostgreSQL.

---

## 2. Logic Chain

1. **Stepper & Workflow Navigation**:
   - `tabs` array in `AdminDataView.tsx` accurately models the 9 required stages in chronological dependency order.
   - The visual stepper card above the tab buttons enhances administrator usability while preserving existing literal AST tokens (`id`, `label`, `table`), maintaining 100% compatibility with regression suites.
2. **Relational Integrity**:
   - `validateRelationalDependencies` successfully catches missing dependencies across students, schedules, and homeroom teachers before attempting database writes.
   - Throws `MasterDataValidationError` early at Stage 3 (30%), preventing database mutations and guaranteeing zero database pollution.
3. **Fidelity of Error Translation**:
   - `translateDatabaseError` parses PostgreSQL raw codes (`23503`, `23502`, `23505`, `42501`) into structured diagnostic info.
   - Maintains exact string prefixes (`Baris ${rowNumber}: `) ensuring legacy assertions remain satisfied.
4. **Root Cause of Defect**:
   - Requirement R4 explicitly mandates: *"Memastikan template data pada masing-masing master data sesuai dengan format skema database agar tidak ada error saat pengunggahan."*
   - `AdminDataView.tsx` correctly included both `'kategori'` and `'kelompok'` in `Template_Data_Mapel.csv`.
   - However, in `src/lib/dataIntegrityGuard.ts` (line 801), `normalizeCsvHeaders` unconditionally translates header `'kelompok'` to `'kategori'`.
   - Because `data_mapel` schema defines both columns independently, this alias collides with the `'kategori'` header. The parsed object contains duplicate `'kategori'` assignments, clobbering `'kategori'` with the value of `'kelompok'`, and leaving database column `kelompok` empty (`NULL`).

---

## 3. Caveats

- **Scope of Defect**: This issue is strictly confined to `data_mapel`. The other 8 templates (`data_siswa`, `data_kelas`, `data_guru`, `jadwal_pelajaran`, `wali_kelas`, `users`, `kalender_pendidikan`, `sistem_blok`) pass roundtrip validation with zero collisions.
- **Remediation Simplicity**: The fix only requires guarding line 801 of `src/lib/dataIntegrityGuard.ts` so `kelompok` is not converted to `kategori` when `isMapel` is true.

---

## 4. Conclusion

The implementation of Milestone 3 is substantially sound, highly capable, and well-engineered. However, because `Template_Data_Mapel.csv` suffers silent data corruption during ingestion, Milestone 3 cannot be approved in its current state.

**Verdict**: **REQUEST_CHANGES**

### Actionable Remediation for Worker (`worker_m3_nov`):
In `src/lib/dataIntegrityGuard.ts` around line 800, modify `normalizeCsvHeaders`:
```ts
// 11. Category aliases
if (!isMapel && clean === 'kelompok') {
  return 'kategori';
}
if (clean === 'kategori_mapel') {
  return 'kategori';
}
```
After making this change:
1. Run `npx tsx tests/adversarial_m3_dependencies.test.ts` -> must pass 26/26.
2. Run `npm test` -> must pass all 62 suites.
3. Commit and push per Git workflow rules.

---

## 5. Verification Method

To independently reproduce this finding:
1. Execute adversarial dependency suite:
   ```bash
   npx tsx tests/adversarial_m3_dependencies.test.ts
   ```
   Observe check 3.5 failing:
   `AssertionError: Defect in dataIntegrityGuard.ts line 801: "kategori" was overwritten by "kelompok" value! 'Wajib' !== 'Umum'`
2. Verify TypeScript typecheck:
   ```bash
   npx tsc --noEmit
   ```
3. Verify production build:
   ```bash
   npm run build
   ```
4. Invalidation Condition:
   When `!isMapel && clean === 'kelompok'` is applied, check 3.5 passes and `parsed[0].kategori === 'Umum'` and `parsed[0].kelompok === 'Wajib'`.
