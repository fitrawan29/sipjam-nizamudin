# Implementer Handoff Report: Pemisahan Siswa Berdasarkan Status Agama pada PAI dan PAK

> [!WARNING] **Skepticism Disclaimer**
> I am highly confident that the subject classification, religious eligibility filtering, and non-regression for general subjects work correctly across presensi/absensi, jurnal mengajar, penilaian/rekap nilai, dan daftar siswa kelas based on 21 passing automated tests in `tests/agama_pai_pak_isolation.test.ts` and passing existing suites (`adversarial_student_csv_review`, `jurnal_r1_r2_r3_verification`, `m4_academic_merdeka_rapor`, `adversarial_rapor_wali_security`, etc.), though edge cases where a student record has corrupted/unorthodox religious denominations not recognized by the normalization regex will naturally be excluded from PAI/PAK and fall back to general subjects.

## 1. What I changed
- **`src/lib/agamaFilter.ts` (New)**: Added a dedicated, modular utility providing:
  - `isPaiSubject(mapelName)`: Detects PAI variations (e.g. "Pendidikan Agama Islam", "PAI", "PAI & BP", "Agama Islam", etc.).
  - `isPakSubject(mapelName)`: Detects PAK variations (e.g. "Pendidikan Agama Kristen", "PAK", "PAK & BP", "Agama Kristen", "Pendidikan Agama Katolik", etc.).
  - `isIslamStudent(student)`: Detects Islamic student affiliation.
  - `isKristenStudent(student)`: Detects Christian/Catholic student affiliation.
  - `isStudentEligibleForSubject(student, mapelName)`: Evaluates eligibility per student and subject.
  - `filterStudentsBySubject(students, mapelName)`: Core filtering function that filters students strictly for PAI/PAK, and leaves the roster unmodified for general subjects.
- **`src/types/database.ts`**: Added `agama: string | null` to `data_siswa` table definitions (`Row`, `Insert`, `Update`).
- **`src/lib/dataIntegrityGuard.ts`**:
  - Registered `agama` aliases (`agama`, `religion`, `status_agama`, `kepercayaan`) in `normalizeCsvHeaders`.
  - Added `agama` to `ALLOWED_COLUMNS_BY_TABLE['data_siswa']` and `ALLOWED_COLUMNS_BY_TABLE['siswa']`.
- **`src/components/GuruJurnal.tsx`**:
  - Filtered loaded students by subject using `filterStudentsBySubject(data, mapel)` in `fetchStudents`.
  - Added `mapel` to `useEffect` dependency array so subject switching immediately updates the roster.
  - Updated attendance initialization and summary calculation to use the subject-filtered roster.
- **`src/components/GradebookView.tsx`**:
  - Added `agama?: string | null` to `StudentItem`.
  - Filtered loaded students with `filterStudentsBySubject(data || [], selectedMapel)` in `fetchStudents`.
  - Added `selectedMapel` to dependency array to dynamically update student grades when toggling subjects.
- **`src/components/RekapSiswaView.tsx`**:
  - Applied `filterStudentsBySubject(siswa || [], mapel)` in `loadRekapData` so only enrolled students are processed when calculating attendance for PAI or PAK.
- **`src/components/AdminKelasView.tsx`**:
  - Added `agama?: string | null` to `StudentItem` and selected all columns in `loadAllData`.
  - Added a Mapel filter dropdown in the class roster workspace ("Roster Siswa Kelas Ini") to isolate students by PAI/PAK or view all.
  - Displayed student `agama` badge in the roster table.
- **`src/components/AdminDataView.tsx`**:
  - Added `agama` field to student creation and edit modals.
  - Displayed `agama` on student cards.
  - Added Mapel/Agama filter dropdown for the `Data_Siswa` tab.
- **`src/components/RaporView.tsx`**:
  - Added `agama?: string | null` to `StudentItem` and fetched `agama`.
  - Filtered report card subjects using `isStudentEligibleForSubject(student, mapel)` so Islam students do not have PAK on their report cards, and Christian students do not have PAI.
- **`supabase/migrations/20261109_add_agama_to_data_siswa.sql` (New)**: Idempotent SQL migration script to add `agama TEXT` to `public.data_siswa` and reload PostgREST schema cache.
- **`tests/agama_pai_pak_isolation.test.ts` (New)**: Automated verification test suite with 21 assertions covering R1, R2, domains, and edge cases.
- **`package.json`**: Appended `tests/agama_pai_pak_isolation.test.ts` to `test` script.

## 2. Why
To satisfy requirement R1 and acceptance criteria, ensuring that within the same class, students enrolled in PAI are strictly those with Islamic status, and students enrolled in PAK are strictly those with Christian status, without altering general subject rosters (R2 non-regression).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `tests/agama_pai_pak_isolation.test.ts` (21 assertions, all 21 passed with exit code 0).
  - Ran `tests/test_user_exact_student_csv.ts` (passed with exit code 0).
  - Ran `tests/adversarial_student_csv_review.test.ts` (15 adversarial tests, all passed with exit code 0).
  - Ran `tests/jurnal_r1_r2_r3_verification.test.ts` (20 assertions, all passed with exit code 0).
  - Ran `tests/gradebook_teacher_filter_ponytail.test.ts` (17 assertions, all passed with exit code 0).
  - Ran `tests/m4_academic_merdeka_rapor.test.ts` (14 assertions, all passed with exit code 0).
  - Ran `tests/adversarial_rapor_wali_security.test.ts` (28 assertions, all passed with exit code 0).
  - Ran `tests/e_rapor_real_data_pipeline.test.ts` (18 assertions, all passed with exit code 0).
  - Ran `tests/e_rapor_tahun_ajaran_sync.test.ts` (13 assertions, all passed with exit code 0).
- **Shallow Verification (manual run only):**
  - UI dropdown layout in AdminKelasView and AdminDataView was statically verified in code.
- **Unverified aspects:**
  - Live Supabase cloud mutation against a production PostgreSQL instance requiring manual admin migration execution.

## 4. Known Issues
- `Minor Robustness Risk`: If an existing student record in the database has an empty or null `agama`, that student is considered unassigned to PAI or PAK and will only appear in general subjects until their `agama` is set in master data. This is by design to ensure strict religious isolation.

## 5. Untested Edge Cases & Next Step
- Reviewers should test importing an old CSV file without an `agama` column, verifying that students are imported without error and default to null/Aktif, appearing on general subjects.
