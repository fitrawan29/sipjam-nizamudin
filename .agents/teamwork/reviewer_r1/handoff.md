> [!WARNING] **Skepticism Disclaimer**
> Moderate confidence: the religious isolation mechanism for PAI and PAK is strictly verified across all 4 key domains (presensi, jurnal, gradebook, rapor) with 25 passing automated tests, and previous state-bleed and dot-acronym edge cases have been fixed, though edge cases involving non-standard unmigrated legacy database rows with NULL agama remain dependent on manual master data enrichment.

## 1. What the prior attempt got wrong
1. **Attendance State Bleed in `GuruJurnal.tsx` (`prevAbsensi` retained non-eligible student keys)**:
   - **Input**: Teacher opens GuruJurnal for class "X Merdeka" and selects a general subject (e.g. Matematika with 30 students), then switches `mapel` to "Pendidikan Agama Kristen (PAK)" (5 students).
   - **Expected**: `absensi` state contains only the 5 eligible PAK students; `absensi_siswa` JSON saved to `jurnal_pembelajaran` in Supabase contains only those 5 PAK students.
   - **Actual**: `merged = { ...initialAbsensi, ...prevAbsensi }` copied all 30 students from `prevAbsensi`. When the teacher saved the journal, `JSON.stringify(absensi)` wrote attendance records for 25 Muslim students into the PAK journal record in the database.
   - **Root cause**: Shallow object spread `{ ...initialAbsensi, ...prevAbsensi }` in `GuruJurnal.tsx` without intersecting keys against `filteredData`.

2. **Acronym Normalization Failure on Subject Acronyms with Dots in `agamaFilter.ts`**:
   - **Input**: Subject formatted as `"P.A.I"`, `"P.A.I."`, `"P.A.K"`, `"P.A.K."`, or `"P.A.I. & B.P."`.
   - **Expected**: `isPaiSubject("P.A.I") === true`, `isPakSubject("P.A.K") === true`.
   - **Actual**: Both returned `false`.
   - **Root cause**: `normalizeSubject` replaced hyphens, slashes, and parentheses, but did not strip periods `.`. Hence `"P.A.I"` became `"p.a.i"`, failing both `\b(pai)\b` regex and `'islam'` inclusion checks.

3. **Missing Sanitization & Standardization of `row.agama` in `dataIntegrityGuard.ts`**:
   - **Input**: CSV import with raw `agama` values e.g. `" islam "`, `"ISLAM"`, `"kristen protestan"`, `"-"`, or `"null"`.
   - **Expected**: Values standardized to Title Case canonical values (`"Islam"`, `"Kristen"`, `"Katolik"`, `"Hindu"`, `"Buddha"`, `"Khonghucu"`) or `null`.
   - **Actual**: Unsanitized raw strings were saved directly to the database.
   - **Root cause**: Missing standardization block for `row.agama` in `parseAndValidateMasterCsv` (unlike `row.status` and `row.gender` which were already standardized).

4. **Inflexible Student Religion Property Support**:
   - **Input**: Student objects passed from external sources or CSVs with alias keys `status_agama` or `religion`.
   - **Expected**: Evaluated correctly in `isIslamStudent` and `isKristenStudent`.
   - **Actual**: Returned `false` because only `student.agama` was inspected.
   - **Root cause**: Lack of alias fallback (`student.agama || student.status_agama || student.religion`).

## 2. What I changed
- **`src/components/GuruJurnal.tsx`**:
  - Replaced object spread `{ ...initialAbsensi, ...prevAbsensi }` with strict key pruning where `merged` iterates exclusively over `filteredData`. This guarantees zero cross-religion attendance pollution in `absensi` and `jurnal_pembelajaran.absensi_siswa`.
- **`src/lib/agamaFilter.ts`**:
  - Enhanced `normalizeSubject` with `.replace(/\./g, '')` to seamlessly recognize acronyms with dots (`P.A.I`, `P.A.K`, `P.A.I.`, `P.A.K.`, `P.A.I. & B.P.`, `P.A.K. & B.P.`).
  - Broadened `isIslamStudent`, `isKristenStudent`, `isStudentEligibleForSubject`, and `filterStudentsBySubject` to defensively accept `religion` and `status_agama` alias properties.
- **`src/lib/dataIntegrityGuard.ts`**:
  - Added standardization block for `row.agama` in `parseAndValidateMasterCsv` to trim whitespace, map variations to canonical Title Case, and map empty/hyphen/null-strings to `null`.
- **`tests/agama_pai_pak_isolation.test.ts`**:
  - Expanded test assertions from 21 to 25 to explicitly test:
    - Dot acronym variations (`P.A.I`, `P.A.I.`, `P.A.K`, `P.A.K.`, `P.A.I. & B.P.`, `P.A.K. & B.P.`).
    - Attendance state bleed prevention on subject switching.
    - `parseAndValidateMasterCsv` standardization of `row.agama`.
    - Legacy CSV import without `agama` column (graceful fallback).
    - Student objects with `religion` or `status_agama` alias keys.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/agama_pai_pak_isolation.test.ts`: **25 / 25 PASSED (exit code 0)**.
  - `npx tsx tests/test_user_exact_student_csv.ts`: **PASSED (exit code 0)** (verifies exact 392-student dataset parsing, template definitions, and empty state avoidance).
  - `npx tsx tests/adversarial_student_csv_review.test.ts`: **15 / 15 PASSED (exit code 0)**.
  - `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`: **20 / 20 PASSED (exit code 0)**.
  - `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts`: **17 / 17 PASSED (exit code 0)**.
  - `npx tsx tests/m4_academic_merdeka_rapor.test.ts`: **14 / 14 PASSED (exit code 0)**.
  - `npx tsx tests/adversarial_rapor_wali_security.test.ts`: **28 / 28 PASSED (exit code 0)**.
- **Shallow Verification (manual only):**
  - Confirmed UI modal forms in `AdminDataView.tsx` (swal-agama dropdown in add and edit modals) and roster filtering dropdown in `AdminKelasView.tsx`.
- **Unverified aspects:**
  - Live PostgreSQL database migration execution on production cloud (`supabase/migrations/20261109_add_agama_to_data_siswa.sql`).

## 4. Known Issues
- `Minor Robustness Risk`: Existing students in the database whose `agama` field is `NULL` will be excluded from PAI and PAK classes until an admin updates their `agama` in master data or via CSV re-import. They will continue to appear in all general subjects. This is by design to ensure strict religious isolation.

## 5. Remaining risk & next step
The implementation is complete, surgically patched, and comprehensively verified with 25 dedicated assertions and passing existing test suites. The next step is deployment of the database migration script (`supabase/migrations/20261109_add_agama_to_data_siswa.sql`) to production PostgreSQL if not already executed.
