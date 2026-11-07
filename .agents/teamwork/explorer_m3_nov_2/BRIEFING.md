# BRIEFING — 2026-11-07T08:08:30Z

## Mission
Explore and blueprint Milestone 3 (Requirement R4): Master Data CSV Templates & Schema Harmony and Pre-Upload Relational Dependency Validation.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_2\
- Original parent: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Milestone: Milestone 3 (Requirement R4)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect all CSV templates provided for download across master data entities (Siswa, Kelas, Mapel, Guru, Jadwal, Wali Kelas, Pengguna, Kalender, Periode Blok)
- Compare template headers, data types, and required fields against actual DB schemas and upsert logic
- Blueprint pre-upload relational dependency validation
- Write output to handoff.md and update progress.md

## Current Parent
- Conversation ID: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Updated: 2026-11-06T23:59:47Z

## Investigation State
- **Explored paths**:
  - `src/components/AdminDataView.tsx` (tabs, templates, handleDownloadTemplate, handleFileUpload)
  - `src/components/AdminKelasView.tsx` (handleDownloadClassTemplate, handleClassFileUpload)
  - `src/components/AdminPenggunaView.tsx` (teacher user sync and credentials)
  - `src/components/SistemBlokView.tsx` (flexible block dates, targets, time ranges)
  - `src/lib/dataIntegrityGuard.ts` (parseAndValidateMasterCsv, normalizeCsvHeaders, importMasterDataFromCsv)
  - `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` & `src/types/database.ts` (all 33 table schemas)
  - Automated tests: `tests/m2_csv_templates_and_import_harmonization.test.ts`, `tests/adversarial_m2_template_and_import_challenger.test.ts`, `tests/template_master_data_import_visibility.test.ts`
- **Key findings**:
  - `AdminDataView.tsx` defines templates for 7 entities (Siswa, Kelas, Guru, Mapel, Kalender, Jadwal, Wali Kelas), missing `Pengguna` and `Periode Blok`.
  - `Template_Data_Mapel.csv` has `id: 'MP-01'`, which risks duplicate key errors if copied; `data_mapel` allows string IDs or UUIDs, while `REQUIRED_HEADERS_BY_TABLE` only requires `nama_mata_pelajaran`.
  - Invariants: `Template_Kalender_Pendidikan.csv` & `Template_Jadwal_Pelajaran.csv` MUST omit `'id'`; `Template_Data_Guru.csv` MUST include `'sekolah_id'`.
  - In `wali_kelas`, `guru_id` is nullable and currently not populated from `data_guru`.
  - Pre-upload relational validation must pre-fetch prerequisites in single batched parallel queries and check existence in O(1) Sets before any database mutation.
  - Test mock resilience: Mocks in existing tests (`adversarial_student_csv_review.test.ts`, `m2_csv_templates_and_import_harmonization.test.ts`) only define the target table; all prerequisite queries must be guarded with `typeof supabase?.from?.(table)?.select === 'function'` to avoid regression.
- **Unexplored areas**: None. Exploration and blueprint complete.

## Key Decisions Made
- Blueprint comprehensive schema harmony for all 9 entities, including adding `Template_Pengguna.csv` and `Template_Periode_Blok.csv`.
- Blueprint pre-upload relational validation inside `importMasterDataFromCsv` in `dataIntegrityGuard.ts` with friendly, actionable error reporting and defensive mock handling.

## Artifact Index
- DISPATCH.md — Stored incoming dispatch message
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat and progress tracking
- handoff.md — Final 5-component report
