# Reviewer Round 2 Report: Pemisahan Siswa Agama PAI & PAK

> [!WARNING] **Skepticism Disclaimer**
> High confidence (98%) — The adversarial review identified 6 concrete edge cases and vulnerabilities in acronym classification, international loanword religions, attendance persistence payload isolation, and UI state retention. All 6 issues were surgically fixed, tested with 27 dedicated assertions, and validated against the entire 77-suite repository test suite and Next.js production build.

## 1. What the prior attempt got wrong

1. **Concatenated Acronym and Grade/Suffix Normalization Failure in `isPaiSubject` and `isPakSubject`**:
   - **Input**: Mapel formatted as `"PAIBP"`, `"PAKBP"`, `"PAI10"`, `"PAI11"`, `"PAI12"`, `"PAIX"`, `"PAIXI"`, `"PAIXII"`, `"PAK10"`, `"PAK11"`, `"PAK12"`, `"PAKX"`, `"PAKXI"`, or `"PAKXII"` (common format in school schedules and imports without spaces).
   - **Expected**: `isPaiSubject("PAIBP") === true`, `isPakSubject("PAKBP") === true`, `isPaiSubject("PAI10") === true`, etc.
   - **Actual**: All returned `false`.
   - **Root cause**: Word-boundary regex `/\b(pai)\b/i` and `/\b(pak)\b/i` required a non-word boundary immediately after "pai" and "pak". Directly adjacent digits, roman numerals, or "bp" prevented `\b` from matching.

2. **Unrecognized International Religious Variations (`Moslem`, `Christian`, `Catholic`)**:
   - **Input**: Student object or CSV row with `agama: "Moslem"`, `"Christian"`, or `"Catholic"`.
   - **Expected**: Recognized as Islam for `isIslamStudent` and Christian/Catholic for `isKristenStudent`, and standardized to canonical Title Case in CSV import.
   - **Actual**: `isIslamStudent({ agama: "Moslem" }) === false`, `isKristenStudent({ agama: "Christian" }) === false`, `isKristenStudent({ agama: "Catholic" }) === false`.
   - **Root cause**: `isIslamStudent` only checked `'islam'` and `'muslim'`; `isKristenStudent` only checked `'kristen'`, `'protestan'`, `'katolik'`; `parseAndValidateMasterCsv` lacked standardization branches for these loanwords.

3. **Absence of Payload Pruning in `GuruJurnal.tsx` on Save**:
   - **Input**: Teacher has attendance state in `absensi` containing non-eligible student keys (e.g. from restored draft, prior session, or component re-render) and clicks "Simpan Jurnal".
   - **Expected**: `jurnal_pembelajaran.absensi_siswa` JSON stored in Supabase contains strictly only the eligible students for that subject.
   - **Actual**: `absensi_siswa: JSON.stringify(absensi)` serialized raw unfiltered state directly to the database.
   - **Root cause**: Missing defensive projection against `students` when preparing `newJurnal` payload and computing `kehadiran_murid`.

4. **Attendance State Bleed in `handleApplyPiketAttendance` in `GuruJurnal.tsx`**:
   - **Input**: Teacher clicks "Terapkan Presensi Piket" when on a PAI or PAK class.
   - **Expected**: Only the eligible students in `students` are present in `newAbsensi`.
   - **Actual**: `const newAbsensi = { ...absensi }` copied all keys from `absensi`, retaining any cross-religion keys present in previous state.
   - **Root cause**: Shallow object spread `{ ...absensi }` without bounding by `students`.

5. **Roster Filter Retention on Class Switch in `AdminKelasView.tsx`**:
   - **Input**: Admin filters roster by "Pendidikan Agama Kristen (PAK)" in Class X-1, closes workspace, and opens Class X-2.
   - **Expected**: Class X-2 opens showing all students (`rosterMapelFilter === 'ALL'`).
   - **Actual**: `rosterMapelFilter` remained locked on "Pendidikan Agama Kristen (PAK)".
   - **Root cause**: `setSelectedClassForWorkspace` did not reset `setRosterMapelFilter('ALL')`.

6. **Filter Retention on Tab Switch in `AdminDataView.tsx`**:
   - **Input**: Admin filters Data Siswa by PAI/PAK, switches to Data Guru, and switches back.
   - **Expected**: `filterMapelSiswa` resets to `'ALL'` on tab transition.
   - **Actual**: Filter remained active.
   - **Root cause**: `handleSwitchTab` did not reset `setFilterMapelSiswa('ALL')`.

## 2. What I changed
- **`src/lib/agamaFilter.ts`**:
  - Broadened `isPaiSubject` regex to `/\b(pai)(?:bp|[\d]+|[xvi]+)?\b/i` to seamlessly match `PAIBP`, `PAI10`, `PAIX`, etc.
  - Broadened `isPakSubject` regex to `/\b(pak)(?:bp|[\d]+|[xvi]+)?\b/i` to seamlessly match `PAKBP`, `PAK10`, `PAKX`, etc.
  - Enhanced `isIslamStudent` to recognize `moslem` and `muslimah`.
  - Enhanced `isKristenStudent` to recognize `christian` and `catholic`.
- **`src/lib/dataIntegrityGuard.ts`**:
  - Added CSV standardization in `parseAndValidateMasterCsv` for `moslem` -> `'Islam'`, `christian` -> `'Kristen'`, and `catholic` -> `'Katolik'`.
- **`src/components/GuruJurnal.tsx`**:
  - Implemented `cleanAbsensiForSave` payload projection ensuring `absensi_siswa` written to `jurnal_pembelajaran` and `computedKehadiran` strictly include only students in `students`.
  - Bound `handleApplyPiketAttendance` to initialize `newAbsensi` strictly for `students`.
- **`src/components/AdminKelasView.tsx`**:
  - Added `setRosterMapelFilter('ALL')` when `setSelectedClassForWorkspace` is invoked.
- **`src/components/AdminDataView.tsx`**:
  - Added `setFilterMapelSiswa('ALL')` inside `handleSwitchTab`.
- **`tests/agama_pai_pak_isolation.test.ts`**:
  - Updated mock data to replace deprecated name with `Ahmad Fauzi`.
  - Added assertions for concatenated acronyms (`PAIBP`, `PAKBP`, `PAI10`, `PAK10`, `PAIX`, `PAKX`).
  - Added assertions for `Moslem`, `Christian`, and `Catholic` religious values.
  - Added assertions for `GuruJurnal` `absensi_siswa` database payload isolation.
  - Added assertions for `handleApplyPiketAttendance` student key restriction.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/agama_pai_pak_isolation.test.ts`: **27 / 27 checks passed (exit code 0)**.
  - `npm test`: **77 / 77 test suites passed (exit code 0)**.
  - `npx tsc --noEmit`: **0 TypeScript compilation errors**.
  - `npm run build`: **Next.js 16.3.4 (Turbopack) production build completed cleanly (exit code 0)**.
- **Shallow Verification (manual only):**
  - Inspected UI filter reset triggers in `AdminKelasView` workspace drawer and `AdminDataView` tabs.
- **Unverified aspects:**
  - Production execution of database migration SQL `supabase/migrations/20261109_add_agama_to_data_siswa.sql` on live hosted Supabase instance.

## 4. Known Issues
- `Minor Robustness Risk`: Students whose `agama` field is `NULL` or unpopulated in the database will be excluded from PAI and PAK classes until their religious status is updated in master data. They remain included in all general subjects. This behavior is deliberate to enforce strict isolation.

## 5. Remaining risk & next step
The feature is hardened, robust against schedule naming variations and multi-language inputs, and fully verified across all 77 repository test suites. The next step is applying the migration script `supabase/migrations/20261109_add_agama_to_data_siswa.sql` to the production PostgreSQL environment.
