# Handoff Report: Perbaikan Mata Pelajaran Jadwal Pembelajaran & Perlindungan Data Master

## 1. What I Changed
1. **`src/lib/dataIntegrityGuard.ts`**:
   - Added `isInvalidMapel(mapel)` to detect invalid, fictitious, or non-existent subjects such as "teknik informasi" and "teknologi informasi" (case-insensitive, tolerant to punctuation/separators).
   - Added `normalizeScheduleMapel(mapel)` to standardize invalid variants like "teknik informasi" / "teknologi informasi" to the official subject "Informatika".
   - Added `validateScheduleData(mataPelajaran, namaGuru, kelas)` to validate schedule subject inputs and reject invalid subjects.

2. **`src/lib/workflow.ts`**:
   - In `findJadwalForGuru`: Filtered schedules to strictly exclude invalid subjects like "teknik informasi" / "teknologi informasi", guaranteeing only valid subjects like "Informatika" are returned for teacher workflow and KBM.
   - In `isJurnalMatchJadwal`: Added safety checks to prevent matching journals/schedules that reference invalid subjects.

3. **`src/components/AdminDataView.tsx`**:
   - Integrated `isInvalidMapel`, `normalizeScheduleMapel`, and `validateScheduleData`.
   - In `handleFileUpload` (CSV upload): Auto-standardizes any invalid variants in `jadwal_pelajaran` to "Informatika".
   - In `handleOpenCreateModal` & `handleOpenEditModal`: Enforced `validateScheduleData` on manual creation and editing of schedules, blocking "teknik informasi" with user-facing validation feedback.
   - In `loadData`: Excluded invalid subject rows from being displayed in the schedule view.

4. **`src/components/HomeViewAdmin.tsx`**:
   - Filtered `jadwalList` with `!isInvalidMapel(...)` so invalid schedule subjects cannot pollute the administrative monitoring matrix or target counts.

5. **`src/components/GuruJurnal.tsx`, `GradebookView.tsx`, `RaporView.tsx`**:
   - Added `!isInvalidMapel(...)` guards to fallback `jadwal_pelajaran` queries so invalid subjects never leak into teacher subject selectors, gradebooks, or report cards.

6. **`supabase/migrations/20261102_validate_mapel_jadwal.sql` & `scripts/cleanup_invalid_mapel_jadwal.ts`**:
   - Executed live database cleanup targeting the single erroneous test schedule row (`id = 'c0000000-0000-0000-0000-000000000001'`, subject: "Teknologi Informasi", class: "X-1").
   - Verified that all 51 master schedule records uploaded from `SIPJAM NIZAMUDIN - Jadwal_Pelajaran.csv`, all 14 student records from `Data_Siswa`, all 12 teacher records from `Data_Guru`, and all 39 subject records from `Data_Mapel` remain 100% intact, unmodified, and undeleted.

7. **`tests/jadwal_mapel_validity_and_master_integrity.test.ts`**:
   - Comprehensive 13-assertion test suite covering unit guards, workflow integration, component filtering, live database schedule verification, and master data integrity.

## 2. Why
- **R1. Koreksi Mata Pelajaran pada Jadwal**: Jadwal pembelajaran in Kurikulum Merdeka only has "Informatika" (taught by Ade on Saturday in X Merdeka), and "teknik informasi" / "teknologi informasi" is an invalid/non-existent subject that must neither exist in the database nor be allowed in user inputs or workflows.
- **R2. Perlindungan Data Master**: The master uploaded data (`data_siswa`, `data_guru`, `data_mapel`, and `jadwal_pelajaran` 51 records) was uploaded from the official school CSVs and must never be altered or deleted. Only the un-uploaded erroneous rogue test record (`c0000000-0000-0000-0000-000000000001`) was cleaned up, preserving master data at 100% integrity.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/jadwal_mapel_validity_and_master_integrity.test.ts`: PASSED 13/13 checks.
    * Suite 1: `isInvalidMapel`, `normalizeScheduleMapel`, and `validateScheduleData` unit validation tests.
    * Suite 2: `isJurnalMatchJadwal`, `findJadwalForGuru`, and static frontend view imports/filters.
    * Suite 3: Live database `jadwal_pelajaran` verification (0 erroneous records, valid "Informatika" present).
    * Suite 4: Master data integrity verification against CSV files (data_siswa 14/14, data_guru 12/12, data_mapel 39/39, master jadwal 51/51 records 100% intact).
  - `npx tsx tests/matrix_teacher_collision_fix.test.ts`: PASSED (100%).
  - `npx tsx tests/user_standardization_and_cleanup_verification.test.ts`: PASSED (65/65 checks).
  - `npx tsx tests/sistem_blok_verification.test.ts`: PASSED (85/85 checks).
  - `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`: PASSED (20/20 checks).
- **Shallow Verification (manual run only):**
  - Inspected the SweetAlert validation message flow in `AdminDataView.tsx` code.
- **Unverified aspects:**
  - Did not run end-to-end browser Playwright/Cypress clicks in an active browser instance (relied on component unit and database live queries).

## 4. Known Issues
- `Minor Robustness Risk`: Other custom misspellings outside of "teknik informasi" and "teknologi informasi" (e.g. "tekinfo") would be caught if typed as dummy data or if not present in `data_mapel`, but are not explicitly regex-mapped to "Informatika".

## 5. Untested Edge Cases & Next Step
- Edge Case: If a school in a future multi-tenant satellite introduces a real vocational program that actually has a subject named "Teknik Informasi", the regex guard would block it; currently tailored for SMA Nizamudin Kurikulum Merdeka.
- Next Step: Run test suite and review diff.
