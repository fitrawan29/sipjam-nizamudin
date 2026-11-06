# BRIEFING — 2026-11-06T01:10:30Z

## Mission
Plan and design comprehensive test scenarios for the 7 Master Data CSV Templates & Importer Pipeline in `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_2\
- Original parent: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Milestone: Milestone 3 (Automated Test Suite & Non-Regression Gate)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strict adherence to 5-component handoff report
- Plan exact runnable test cases with assertions for `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`
- Maintain progress.md heartbeat

## Current Parent
- Conversation ID: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/components/AdminDataView.tsx` (lines 228-265, templates dictionary and invariants)
  - `src/components/AdminKelasView.tsx` (lines 344-361, class template download and file upload handlers)
  - `src/lib/dataIntegrityGuard.ts` (lines 600-1300: `normalizeCsvHeaders`, `parseAndValidateMasterCsv`, `importMasterDataFromCsv`)
  - `tests/m2_csv_templates_and_import_harmonization.test.ts` & `tests/adversarial_m2_template_and_import_challenger.test.ts`
- **Key findings**:
  - All 7 Master Data templates and invariants confirmed (`Data_Kelas`, `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`).
  - Invariants: `Kalender_Pendidikan` and `Jadwal_Pelajaran` strictly omit `id`; `Data_Guru` strictly includes `sekolah_id`.
  - Multi-delimiter parser supports `,`, `;`, `\t`, `|` and mixed line endings (`\r\n`, `\n`, bare `\r`).
  - Excel apostrophes (`'`) are cleanly stripped from numbers (`nisn`, `nip`, `no_hp_ortu`).
  - Row error feedback consistently prefixes `Baris ${i}` for missing required fields, dummy names, and duplicates.
  - Non-UUID values converted to random valid UUIDs to prevent PostgreSQL 22P02.
  - Importer idempotency matches students by `(sekolah_id, nisn)` to update existing UUIDs without duplicate rows.
  - Missing `data_kelas` table triggers graceful fallback syncing classes into `wali_kelas` on `PGRST205` / `42P01`.
- **Unexplored areas**: None within the scope of CSV templates and importer pipeline.

## Key Decisions Made
- Formulate 22 exact runnable assertions divided across 4 distinct test suites:
  1. Suite B: 7 Master Data CSV Templates Verification & Invariants
  2. Suite C: CSV Parsing, Normalization & Multi-Delimiter Stress
  3. Suite D: Data Sanitization, Anti-Dummy Guards & Row Error Feedback
  4. Suite E: Importer Idempotency & Database Integrity
- Include full runnable TypeScript code blocks ready for drop-in into `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- progress.md — Liveness heartbeat and progress tracking
- handoff.md — Complete test blueprint and runnable test cases
