## 2026-11-06T00:35:22Z
You are a Teamwork Explorer for Milestone 2 (Penyelarasan Template Master Data & Impor CSV).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.

Your task:
Focus on the CSV parsing, normalization, validation, and database upsert engine in `src/lib/dataIntegrityGuard.ts`:
1. `normalizeCsvHeaders`:
   - Add mappings for `tableName === 'data_kelas'` / `tableName === 'kelas'`: map `nama_kelas`, `tingkat`, `jurusan`, `kelas`, `rombel`.
   - Verify aliases across all 7 entities (e.g. `no_hp_orang_tua -> no_hp_ortu`, `nama_lengkap -> nama_siswa/nama_guru`, `mapel -> mata_pelajaran`, `id_sekolah -> sekolah_id`).
2. `parseAndValidateMasterCsv`:
   - Add validation branch for `tableName === 'data_kelas'` / `tableName === 'kelas'`. Ensure `nama_kelas` is valid and non-empty. Auto-generate UUID for `id`.
   - Verify anti-dummy checks, anti-22P02, and anti-23502 protections across all 7 tables.
3. `importMasterDataFromCsv`:
   - Support `data_kelas`: if table exists in Supabase, upsert to `data_kelas` with `onConflict: 'sekolah_id, nama_kelas'`. If PGRST205 or schema cache missing, fallback gracefully to updating/syncing classes in `wali_kelas` and `data_siswa`.
   - Support `data_siswa` idempotent updates: match existing records by `(sekolah_id, nisn)` so re-uploading an updated student CSV updates existing student rows rather than inserting duplicate student records.
4. Write your complete design and code blueprint to:
   c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\handoff.md
5. Send a brief message back to the orchestrator when done.
