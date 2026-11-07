## 2026-11-06T23:59:47Z
You are explorer_m3_nov_2.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first before analyzing anything.

Your mission is to explore and blueprint Milestone 3 (Requirement R4) focusing on:
1. **Master Data CSV Templates & Schema Harmony**:
   - Inspect all CSV templates provided for download across master data entities:
     * Siswa, Kelas, Mapel, Guru, Jadwal, Wali Kelas, Pengguna, Kalender, Periode Blok.
   - Examine how templates are generated / downloaded in `src/components/AdminDataView.tsx`, `src/components/AdminKelasView.tsx`, and `src/lib/dataIntegrityGuard.ts`.
   - Compare template headers, data types, and required fields against the actual database schemas and upsert logic in Supabase / `dataIntegrityGuard.ts`.
   - Identify any discrepancies, missing columns, or type mismatches that could trigger database errors upon re-uploading sample or filled templates.
2. **Pre-Upload Relational Dependency Validation**:
   - Inspect `dataIntegrityGuard.ts` and the upload process in `AdminDataView.tsx` / `AdminKelasView.tsx`.
   - Blueprint pre-upload validation for relational prerequisites:
     * When uploading Siswa (`data_siswa`): check that assigned `kelas` exists in `data_kelas` (or `wali_kelas`).
     * When uploading Jadwal (`jadwal_pelajaran`): check that `nama_guru` exists in `data_guru`, `mata_pelajaran` exists in `data_mapel`, and `kelas` exists in `data_kelas`.
     * When uploading Wali Kelas (`wali_kelas`): check that `nama_guru` exists in `data_guru` and `kelas` exists in `data_kelas`.
   - Specify how prerequisite data is queried or verified efficiently (e.g. fetching existing master records in a single query prior to validating rows).
   - If missing dependencies are found, abort upload before database mutation and report exactly which prerequisite is missing for which row.

Produce a detailed blueprint in your handoff report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_2\handoff.md`
Maintain `progress.md` in your working directory.
When done, notify orchestrator via send_message.
