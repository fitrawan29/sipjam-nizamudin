# Execution Plan — Orchestrator 28

## Objective
Melanjutkan penyesuaian fungsional pada role admin aplikasi sipjam-app untuk kebutuhan produksi:
1. **Milestone 4 (M4 - R5)**: Penyesuaian Pencadangan Data Sistem (`src/components/AdminBackupView.tsx`)
   - Backup 33 tabel database dalam format ZIP (`backup_sipjam_<sekolah>_<timestamp>.zip`).
   - Struktur internal ZIP memisahkan `data/<table_name>.json`, `foto/` untuk aset biner/foto, dan `manifest.json`.
   - Restore kompatibilitas: verifikasi dan pemulihan bertahap secara topological order (Level 0 s/d Level 5) dan pemulihan foto/aset.
2. **Milestone 5 (M5 - R6)**: Preservasi Fitur dan Logika Eksisting (Zero Regression)
   - Automated test suite di folder `tests/` memvalidasi backup/restore ZIP dan keutuhan sistem.
   - Verifikasi keutuhan sistem: `npm test`, `npx tsc --noEmit`, dan `npm run build`.
   - Eksekusi alur wajib Git ke `main` sesuai `GEMINI.md` (`git status`, `git add .`, `git commit -m "..."`, `git push origin main`).

---

## Detailed Step-by-Step Plan

### Phase 1: Milestone M4 (R5) Exploration
- **Step 1.1**: Dispatch 3 Explorers (`explorer_o28_1`, `explorer_o28_2`, `explorer_o28_3`) in parallel:
  - `explorer_o28_1`: Inspect `src/components/AdminBackupView.tsx`, identifying current backup/restore mechanisms, JSZip or zip libraries, and how tables and files are queried and packaged.
  - `explorer_o28_2`: Inspect the database schema (migration files, Supabase tables) to identify all 33 tables/entities and determine their topological dependency order (Level 0 to Level 5) for clean restore.
  - `explorer_o28_3`: Inspect storage buckets / binary photo assets (`foto_profil`, `foto_presensi`, `dokumen`, etc.), how photos are retrieved during backup and restored to storage buckets, and format of `manifest.json`.
- **Step 1.2**: Aggregate explorer reports, extract the definitive list of 33 tables, topological order, and ZIP structure specification.

### Phase 2: Milestone M4 (R5) Implementation & Iteration Loop
- **Step 2.1**: Dispatch Worker (`worker_o28_m4`) to update `AdminBackupView.tsx` (and supporting libraries if needed):
  - Ensure all 33 tables are exported to `data/<table_name>.json`.
  - Ensure binary photo assets from buckets are included in `foto/`.
  - Ensure `manifest.json` contains metadata (timestamp, school, version, tables list, file counts).
  - Ensure restore function reads the ZIP, processes `data/` in topological order (Level 0 to Level 5), and restores `foto/` to Supabase storage.
  - Worker must verify build (`npm run build`) and run relevant tests.
- **Step 2.2**: Dispatch 2 Reviewers (`reviewer_o28_m4_1`, `reviewer_o28_m4_2`) to examine implementation, correctness, security, and interface conformance.
- **Step 2.3**: Dispatch 2 Challengers (`challenger_o28_m4_1`, `challenger_o28_m4_2`) to write stress-test harnesses verifying:
  - ZIP layout (`data/*.json`, `foto/*`, `manifest.json`).
  - 33 tables exported and deserializable.
  - Restore topological order (Level 0 to Level 5) correctly resolves foreign key dependencies.
  - Binary photo handling.
- **Step 2.4**: Dispatch Forensic Auditor (`auditor_o28_m4`) to perform integrity forensics (anti-facade, zero hardcoded test strings).
- **Step 2.5**: Gate evaluation. If all pass -> mark M4 DONE.

### Phase 3: Milestone M5 (R6) Automated Regression & Git Delivery
- **Step 3.1**: Dispatch Worker / Test Writer (`worker_o28_m5`) to:
  - Add comprehensive regression tests in `tests/` verifying M4 backup/restore and zero regressions across M1-M5.
  - Run `npm test`, `npx tsc --noEmit`, and `npm run build`.
  - Follow `GEMINI.md` workflow (`git status`, `git add .`, `git commit -m "..."`, `git push origin main`).
- **Step 3.2**: Dispatch Reviewer (`reviewer_o28_m5`) and Forensic Auditor (`auditor_o28_m5`) to verify M5.
- **Step 3.3**: Final gate evaluation and completion message to parent.
