## 2026-11-06T01:05:53Z
You are a Teamwork Explorer for Milestone 3 (Automated Test Suite & Non-Regression Gate).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.

Your task:
Plan and design the test scenarios for 7 Master Data CSV Templates & Importer Pipeline in `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`:
1. Template download verification across all 7 entities:
   - `Data_Kelas`: `Template_Data_Kelas.csv`, headers: `['nama_kelas', 'tingkat', 'jurusan']`
   - `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`
   - Invariants check: Kalender & Jadwal templates omit `'id'`; Guru template includes `'sekolah_id'`.
2. CSV Parsing & Validation:
   - Header normalization and multi-delimiter parsing (`,`, `;`, `\t`, `|`).
   - Excel apostrophe stripping on numbers (`nisn`, `nip`, `no_hp_ortu`).
   - Row error feedback (`Baris ${i}`) on empty required columns or dummy names.
   - Non-UUID conversion to valid UUIDs to prevent Postgres 22P02.
3. Importer idempotency & database integrity:
   - Student deduplication by `(sekolah_id, nisn)`: re-importing existing students updates class without creating duplicate rows.
   - `data_kelas` upsert and graceful fallback handling on schema cache error (`PGRST205`).
4. Formulate the exact runnable test cases with assertions.
Write your complete test blueprint to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_2\handoff.md
Send a brief message back to the orchestrator when done.
