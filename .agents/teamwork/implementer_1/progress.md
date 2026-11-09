# Implementer Progress: Pemisahan Siswa Berdasarkan Status Agama pada PAI dan PAK

## Status: Implementation Complete & Verified
- Implementation complete:
  1. `src/lib/agamaFilter.ts`: Added helper functions:
     - `isPaiSubject`, `isPakSubject`
     - `isIslamStudent`, `isKristenStudent`
     - `isStudentEligibleForSubject`
     - `filterStudentsBySubject`
     - `getRequiredReligionForSubject`
  2. `src/types/database.ts`: Added `agama: string | null` to `data_siswa` types (Row, Insert, Update).
  3. `src/lib/dataIntegrityGuard.ts`: Added `agama` aliases in `normalizeCsvHeaders` and added `agama` to `ALLOWED_COLUMNS_BY_TABLE` for `data_siswa` and `siswa`.
  4. `src/components/GuruJurnal.tsx`: Filtered `students` by subject in `fetchStudents` for teaching journals (Jurnal KBM) and presensi/absensi per mapel. Updated dependency array and attendance summary calculation.
  5. `src/components/GradebookView.tsx`: Filtered student list by `selectedMapel` in `fetchStudents`. Updated dependency array and `StudentItem` interface.
  6. `src/components/RekapSiswaView.tsx`: Filtered student roster when `mapel` is selected in `loadRekapData` so only students matching the religion are accounted for.
  7. `src/components/AdminKelasView.tsx`: Added mapel/religion filtering in the class roster workspace and displayed religion status.
  8. `src/components/AdminDataView.tsx`: Added `agama` field to student create/edit modals, student cards, and added mapel/religion filter dropdown.
  9. `src/components/RaporView.tsx`: Filtered active subjects by student religious eligibility so Islam students do not get PAK and Christian students do not get PAI in report cards.
  10. `supabase/migrations/20261109_add_agama_to_data_siswa.sql`: Idempotent SQL migration for adding `agama` to `data_siswa`.
  11. `tests/agama_pai_pak_isolation.test.ts`: Added 21 automated tests covering R1 (PAI & PAK separation across presensi, jurnal, penilaian, daftar siswa kelas) and R2 (non-regression of general subjects and edge cases). All 21 tests pass (exit code 0).
