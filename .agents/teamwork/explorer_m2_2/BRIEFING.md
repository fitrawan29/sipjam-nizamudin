# BRIEFING — 2026-11-06T00:43:00Z

## Mission
Analyze CSV parsing, normalization, validation, and database upsert engine in `src/lib/dataIntegrityGuard.ts` for Milestone 2 (Master Data CSV Template Alignment & Import Engine), providing a complete design and code blueprint.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\
- Original parent: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Milestone: Milestone 2 (Penyelarasan Template Master Data & Impor CSV)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in source files
- Focus strictly on `src/lib/dataIntegrityGuard.ts` CSV parsing, normalization, validation, and upsert engine
- Ensure zero-regression on existing test suites and existing behavior

## Current Parent
- Conversation ID: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Updated: not yet

## Investigation State
- **Explored paths**:
  * `src/lib/dataIntegrityGuard.ts`: analyzed header normalization, UUID generation, anti-dummy checks, anti-22P02/23502 protections, batch upserts.
  * `src/components/AdminDataView.tsx`: examined CSV template generation (`Template_Data_*.csv`), upload handler, tab configurations.
  * `src/components/AdminKelasView.tsx`: examined schema cache handling for `data_kelas` and cascading updates.
  * `tests/data_guru_csv_import_sekolah_id_validation.test.ts`, `tests/production_admin_adjustments.test.ts`, `tests/adversarial_r1_r5_stress_test.ts`: examined existing test contracts and invariants.
- **Key findings**:
  1. `normalizeCsvHeaders` needs table-scoped alias resolution for `data_kelas` / `kelas` (`nama_kelas`, `tingkat`, `jurusan`, `kelas`, `rombel`), and full cross-entity aliases (`no_hp_ortu`, `nama_siswa/nama_guru`, `mata_pelajaran`, `sekolah_id`, `gender`, `keterangan`, `tahun_ajaran`).
  2. `parseAndValidateMasterCsv` must add `data_kelas` / `kelas` to `isUuidKeyedTable` (auto-generating UUID when missing and sanitizing invalid UUIDs to prevent 22P02), validate mandatory non-empty `nama_kelas` (anti-23502), enforce `isDummyOrTestString` (anti-dummy), and deduplicate class names within the CSV.
  3. `importMasterDataFromCsv` must resolve student idempotency for `data_siswa` by querying existing students by `(sekolah_id, nisn)` and assigning existing `id` to matching rows before upserting.
  4. `importMasterDataFromCsv` must support `data_kelas` upsert with `onConflict: 'sekolah_id, nama_kelas'` and provide a graceful schema-cache fallback (catching PGRST205/42P01) syncing to `wali_kelas` and `data_siswa` without crashing.
- **Unexplored areas**: None. Complete blueprint ready.

## Key Decisions Made
- Architecture: Keep `src/lib/dataIntegrityGuard.ts` completely self-contained (define inline `isSchemaCacheError` helper) so it requires no external database client imports and remains lightweight for unit tests.
- Deliverable: Write complete 5-component `handoff.md` with drop-in code replacements for the implementer agent.

## Artifact Index
- `DISPATCH.md` — Initial dispatch message
- `BRIEFING.md` — Situational awareness document
- `progress.md` — Progress heartbeat
- `handoff.md` — Complete 5-component handoff report and code blueprint
