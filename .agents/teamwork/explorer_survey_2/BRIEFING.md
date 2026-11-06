# BRIEFING — 2026-11-06T08:05:00Z

## Mission
Survey database schemas, migrations, table definitions, and TypeScript interfaces for 7 master data entities, identify discrepancies, and define exact canonical CSV headers and sample row values.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, surveyor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\
- Original parent: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Milestone: survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or alter source code
- Write only to working directory: .agents/teamwork/explorer_survey_2/
- Follow Handoff Protocol (5 sections: Observation, Logic Chain, Caveats, Conclusion, Verification Method)

## Current Parent
- Conversation ID: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Updated: 2026-11-06T08:05:00Z

## Investigation State
- **Explored paths**:
  - `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`
  - `supabase/migrations/` (all 37 migration files examined)
  - `src/types/database.ts` (all table rows, inserts, updates, relationships, helper types)
  - `src/components/AdminDataView.tsx` (tabs, templates, loadData, renderCard, edit modals, unique helpers)
  - `src/components/NaikKelasModal.tsx` (student cohort advancement and progression modes)
  - `src/lib/dataIntegrityGuard.ts` (`importMasterDataFromCsv`, `parseAndValidateMasterCsv`, `normalizeCsvHeaders`)
  - `csv/` directory (real-world sample CSV files)
  - `tests/` (`data_guru_csv_import_sekolah_id_validation.test.ts`, `m6_master_data_polish.test.ts`)
- **Key findings**:
  - `kelas`: No physical table in PostgreSQL; currently implicit across `data_siswa.kelas`, `wali_kelas.kelas`, `jadwal_pelajaran.kelas`, etc. Must be formalized for R1/R2.
  - `data_siswa`: Template lacks `id` and `sekolah_id` (auto-injected by session). Needs conflict key awareness during CSV re-import.
  - `data_guru`: Strictly enforced `sekolah_id` UUID validation and teacher user account auto-sync.
  - `data_mapel`: Primary key `id` is `TEXT`, not UUID. Template has `['id', 'nama_mata_pelajaran', 'kategori']`.
  - `kalender_pendidikan`: DB has `tanggal DATE NOT NULL`; UI also supports `tanggal_mulai` and `tanggal_selesai`. Template only has `tanggal`. Old numeric CSV IDs cause UUID errors if not sanitized.
  - `jadwal_pelajaran`: Current template is missing `jam_mulai` and `jam_selesai` (TIME). Validation trigger rejects dummy subjects.
  - `wali_kelas`: Unique constraint on `(sekolah_id, kelas)`. Well-aligned.
- **Unexplored areas**: Final implementation details will be handled by Worker agents.

## Key Decisions Made
- Structured the complete 7-entity specification with exact SQL DDL, column types, nullability, defaults, constraints, discrepancies, and canonical CSV templates.

## Artifact Index
- DISPATCH.md — incoming dispatch instructions
- progress.md — liveness and progress tracking
- BRIEFING.md — persistent situational awareness
- handoff.md — final survey and schema alignment specification
