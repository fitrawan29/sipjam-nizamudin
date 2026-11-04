# Handoff Report: Master Data Guru CSV Import `sekolah_id` Validation Fix

## Overview
- **Issue**: Importing master data guru from CSV without `sekolah_id` caused unhandled PostgreSQL error 23502 (null value in column "sekolah_id" of relation "data_guru" violates not-null constraint).
- **Resolution**: Implemented mandatory row-level pre-validation for `sekolah_id` in `data_guru` CSV import, ensuring missing, blank, or null `sekolah_id` values are caught with a clear validation error before any database insertion is attempted. Also updated `Template_Data_Guru.csv` headers to include `sekolah_id`.
- **Approach**: Ponytail / surgical-patch minimal architecture, extracting CSV parsing and validation into `src/lib/dataIntegrityGuard.ts` (`parseAndValidateMasterCsv`, `importMasterDataFromCsv`), and delegating cleanly from `src/components/AdminDataView.tsx`.

---

## 1. Files Touched

1. **`src/lib/dataIntegrityGuard.ts`**
   - Added `parseCsvLine(line: string): string[]` with quoted cell parsing support.
   - Added `normalizeCsvHeaders(rawHeaders: string[], tableName: string): string[]` with alias mapping (`id_sekolah` / `school_id` -> `sekolah_id`).
   - Added `parseAndValidateMasterCsv(text: string, tableName: string, user?: any): Record<string, any>[]`:
     - Explicitly checks and enforces non-null, non-empty `sekolah_id` for every row when `tableName === 'data_guru'`.
     - Throws localized error `Baris ${i}: Kolom "sekolah_id" wajib diisi dan tidak boleh kosong untuk data guru.`
     - Preserves all existing integrity checks (anti-dummy, forbidden names, mapel validity, deduplication).
   - Added `importMasterDataFromCsv(supabase: any, text: string, tableName: string, user?: any)`:
     - Runs full pre-validation before any database mutation.
     - Batch upserts to Supabase in chunks of 50.
     - Entirely prevents PostgreSQL error 23502.

2. **`src/components/AdminDataView.tsx`**
   - Streamlined `handleFileUpload` from ~190 lines of inline parsing down to 15 lines delegating to `importMasterDataFromCsv`.
   - Updated `Template_Data_Guru.csv` in `handleDownloadTemplate` to include `'sekolah_id'` in headers and populate current school UUID in sample data.

3. **`tests/data_guru_csv_import_sekolah_id_validation.test.ts`**
   - New automated verification suite with 10 test cases covering:
     - Section 1: Unit validation rejecting CSVs with missing `sekolah_id` column, empty string `""`, whitespace `"   "`, literal `"null"`, and multi-row row-level localization.
     - Section 2: Mock DB proof verifying database is NEVER invoked on validation failure, completely preventing PostgreSQL 23502.
     - Section 3: Header aliases (`id_sekolah`, `school_id`) and live Supabase database insertion with valid `sekolah_id`, verified with SELECT query and automated cleanup.
     - Section 4: Template and UI consistency verification.

4. **`package.json`**
   - Registered `tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts` in the `npm test` script.

---

## 2. Verification Record

### 2.1 Unit & Functional Tests
Command:
```bash
npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts
```
Output:
```
🧪 TEST SUITE: DATA GURU CSV IMPORT SEKOLAH_ID VALIDATION
========================================================================

--- SECTION 1: CSV Missing sekolah_id Validation Prior to DB Insertion ---
  ✔ [PASS] CSV missing "sekolah_id" column throws clear validation error on Baris 1
  ✔ [PASS] CSV row with empty sekolah_id string ("") throws validation error
  ✔ [PASS] CSV row with whitespace-only sekolah_id ("   ") throws validation error
  ✔ [PASS] CSV row with string literal "null" as sekolah_id throws validation error
  ✔ [PASS] Multi-row CSV correctly identifies error at Baris 2 when Row 1 is valid

--- SECTION 2: Prevention of PostgreSQL Error 23502 ---
  ✔ [PASS] importMasterDataFromCsv prevents DB call and completely avoids PostgreSQL 23502

--- SECTION 3: Successful Import of Valid CSV with sekolah_id ---
  ✔ [PASS] parseAndValidateMasterCsv cleanly returns validated row with sekolah_id and UUID
  ✔ [PASS] Headers "id_sekolah" and "school_id" normalize to "sekolah_id" seamlessly
  ✔ [PASS] Live database import succeeded and verified: record inserted with sekolah_id=a0000000-0000-0000-0000-000000000001 and cleaned up

--- SECTION 4: Template and UI Consistency Verification ---
  ✔ [PASS] AdminDataView.tsx wires importMasterDataFromCsv and includes sekolah_id in Template_Data_Guru

========================================================================
RESULTS: 10/10 PASSED (0 FAILED)
========================================================================
```

### 2.2 TypeScript Typecheck
Command:
```bash
npx tsc --noEmit
```
Output:
```
Exit code: 0 (No type errors)
```

### 2.3 Next.js Production Build
Command:
```bash
npm run build
```
Output:
```
▲ Next.js 16.3.4 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 26ms
  Creating an optimized production build ...
✓ Compiled successfully in 2.2s
  Running TypeScript ...
  Finished TypeScript in 2.3s ...
  Collecting page data using 14 workers ...
✓ Generating static pages using 14 workers (13/13) in 900ms
  Finalizing page optimization ...
Exit code: 0
```

### 2.4 Regression Check
Command:
```bash
npx tsx tests/master_data_admin_role_restriction.test.ts
```
Output:
```
ALL MASTER DATA ROLE RESTRICTION TESTS PASSED (8/8)
```
Command:
```bash
npx tsx tests/jadwal_mapel_validity_and_master_integrity.test.ts
```
Output:
```
TOTAL CHECKS: 16 | PASSED: 16 | FAILED: 0
🎉 ALL JADWAL MAPEL VALIDITY & MASTER INTEGRITY CHECKS PASSED 100%!
```

---

## 3. Git Operations
Following Git Workflow Rule in `GEMINI.md`:
1. `git status`
2. `git add .`
3. `git commit -m "fix(master-data): validate sekolah_id presence in data_guru CSV import to prevent error 23502"`
4. `git push origin main`
