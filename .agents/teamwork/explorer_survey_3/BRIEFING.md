# BRIEFING — 2026-11-06T00:06:00Z

## Mission
Survey and analyze existing CSV template generation/download and CSV upload/import mechanisms across all 7 Master Data entities (Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, Wali Kelas), identify root causes for failures/misaligned columns, inspect existing automated tests and test harnesses, and formulate design recommendations for R2 & R3 while guaranteeing zero regression (R4).

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: teamwork_explorer, read-only investigator
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\
- Original parent: 4b795f59-8b14-4efc-839a-20e1afe8c2a0
- Milestone: exploration_survey
- Subagent Parent ID: 77685953-a979-46b9-9e32-e6b24ab55eb5

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify any source code or test files outside .agents/teamwork/explorer_survey_3/
- Provide exact paths, line numbers, and verifiable evidence
- Never place source code, tests, or data files in .agents/teamwork/

## Current Parent
- Conversation ID: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Updated: 2026-11-06T00:06:00Z

## Investigation State
- **Explored paths**:
  - `src/components/AdminDataView.tsx` (tabs, template generation, CSV upload handler, table view)
  - `src/lib/dataIntegrityGuard.ts` (`parseAndValidateMasterCsv`, `importMasterDataFromCsv`, `normalizeCsvHeaders`, `splitCsvRecords`, `parseCsvLine`)
  - `src/components/NaikKelasModal.tsx` (existing student promotion & class allocation logic)
  - `src/lib/navigation.ts` (view aliases, menu consolidation, tab RBAC)
  - `src/lib/supabaseClient.ts` (master data tables list, tenant isolation guards)
  - `src/types/database.ts` (database schema contracts for all tables)
  - `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (baseline database tables & RLS)
  - `supabase/migrations/20261102_restrict_master_data_to_admin.sql` (admin role policies for master data)
  - `csv/` sample files (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, etc.)
  - Test suites: `tests/data_guru_csv_import_sekolah_id_validation.test.ts`, `tests/adversarial_o27_m4_challenger.test.ts`, `tests/production_admin_adjustments.test.ts`, `tests/adversarial_r1_r5_stress_test.ts`, `tests/master_data_admin_role_restriction.test.ts`, `tests/jadwal_mapel_validity_and_master_integrity.test.ts`, `tests/adversarial_ast_invariants_challenger.test.ts`, `tests/r1_r10_ponytail_verification.test.ts`, and full baseline `npm test`.
- **Key findings**:
  - Entity 1 (Kelas): Completely missing from `tabs`, missing from `templates` in `AdminDataView.tsx`, and no dedicated `data_kelas` table exists in Supabase cache (PGRST205). Class values currently reside as `kelas TEXT` in `data_siswa`, `wali_kelas`, `jadwal_pelajaran`.
  - Entities 2-7 (Siswa, Guru, Mapel, Kalender, Jadwal, Wali Kelas): Template downloads exist in `AdminDataView.tsx: handleDownloadTemplate()`. Specific header and sample rules exist (e.g. Kalender and Jadwal strictly forbid `id` and legacy strings `KP-01`/`JP-01` per `ADV-R5-01`; Guru strictly requires `sekolah_id` per `ADV-R1-01`).
  - Import mechanism: Handled by `importMasterDataFromCsv` via `parseAndValidateMasterCsv` in `dataIntegrityGuard.ts`. Uses RFC 4180 splitting, delimiter auto-detection (`,`, `;`, `\t`, `|`), header normalization, and upsert batching (batch size 50).
  - Identified failure causes: lack of Kelas entity handler, onConflict `'id'` creating duplicates when `id` omitted in CSV, non-UUID parsing throwing 22P02, unmapped column synonyms, and missing cross-tenant checks.
  - Test harness: 54 suites chained in `package.json` `"test"` using `tsx`, baseline execution is 100% passing.
- **Unexplored areas**: None. Comprehensive survey completed.

## Key Decisions Made
- Recommend adding `Data_Kelas` tab to `AdminDataView.tsx` with centralized student allocation capabilities (embedding/reusing `NaikKelasModal` workflows) and CSV import/export support.
- Harmonize CSV templates strictly in compliance with database schema and existing regression assertions (preserving `sekolah_id` in Guru, omitting `id` in Kalender & Jadwal).
- Update `dataIntegrityGuard.ts` with explicit `data_kelas` parser/validator, expand synonym mappings in `normalizeCsvHeaders`, and support student class allocation re-imports.

## Artifact Index
- `.agents/teamwork/explorer_survey_3/DISPATCH.md` — Initial dispatch message
- `.agents/teamwork/explorer_survey_3/BRIEFING.md` — Persistent context & state
- `.agents/teamwork/explorer_survey_3/progress.md` — Liveness & step tracking
- `.agents/teamwork/explorer_survey_3/handoff.md` — 5-component handoff report
