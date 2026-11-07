# Progress — challenger_m3_nov_1

Last visited: 2026-11-07T00:48:40Z

## Status: IN_PROGRESS

### Completed
- Initialized DISPATCH.md and BRIEFING.md.
- Read background documents (`ORIGINAL_REQUEST.md`, `PROJECT.md`, `worker_m3_nov/handoff.md`).
- Inspected implementation in `src/lib/dataIntegrityGuard.ts`, `src/components/AdminDataView.tsx`, and database schema in `SETUP_NEW_SCHOOL_TEMPLATE.sql` & migrations.
- Designed and authored empirical adversarial test suite `tests/adversarial_m3_dependencies.test.ts` covering:
  * Relational dependency checks on missing classes (data_siswa), missing teachers/mapels/classes (jadwal_pelajaran), and missing teachers/classes (wali_kelas).
  * Whitespace, casing, and multi-error aggregation diagnostics.
  * `guru_id` and `nip` auto-population in wali kelas by teacher name and NIP.
  * Template vs database schema column matching across all 9 entities.
  * End-to-end stage emission and zero database pollution guarantees.
  * PostgreSQL error diagnostic translation across 23503, 23502, 23505, and 42501.
- Executed `tests/adversarial_m3_dependencies.test.ts` -> 25/26 tests passed; 1 critical defect confirmed empirically:
  * **DEFECT-01**: In `src/lib/dataIntegrityGuard.ts` line 801, `normalizeCsvHeaders` unconditionally maps `clean === 'kelompok'` to `'kategori'`. In `data_mapel`, both `kategori` and `kelompok` are separate database columns and both are present in `Template_Data_Mapel.csv`. When a user uploads the official template, `kelompok` overwrites `kategori`, causing `kelompok` to be dropped (set to NULL in DB) and `kategori` to hold the kelompok value.

### Current Step
- Updating BRIEFING.md and drafting handoff report `handoff.md` with explicit verdict `REQUEST_CHANGES`.
