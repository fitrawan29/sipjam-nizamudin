# BRIEFING — 2026-10-11T01:02:00Z

## Mission
Milestone 1: Data Layer — Canonical Database Migration & TypeScript Database Types for Capaian Pembelajaran and Gradebook v2.

## 🔒 My Identity
- Archetype: implementer / qa / specialist
- Roles: [implementer, qa, specialist]
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1
- Original parent: 835d6ca7-b3e2-474a-acf0-423026614449
- Milestone: M1 (Teacher Reminder Snooze, Print Simplification, Camera 4:3 Ratio Lock)
- Re-assigned: 2026-10-11 by parent 1f15a155-9441-412f-8adc-6ac5519d6f4d
- Current Milestone: M1 (Data Layer: Database Migration & TypeScript Types)

## 🔒 Key Constraints
- Scope & exclusive write ownership:
  - src/components/TeacherReminderManager.tsx
  - src/components/PrintHeader.tsx
  - src/components/CameraSelfieCapture.tsx
  - src/lib/watermarkCanvas.ts
- Verification commands:
  - npx tsc --noEmit
  - npm test
  - npx tsx tests/e2e/run_all_e2e.ts
  All must pass with 0 errors.
- Never hardcode test outputs or create facades.
- Git workflow rule: git status, git add ., git commit -m "...", git push origin <branch>.
- Milestone 1 Exclusive Write Ownership:
  - supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql
  - src/types/database.ts
- Apply Ponytail minimalism and backward compatibility.

## Current Parent
- Conversation ID: 1f15a155-9441-412f-8adc-6ac5519d6f4d
- Updated: 2026-10-11T01:02:00Z

## Task Summary
- **What to build**:
  1. Canonical migration `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`:
     - `capaian_pembelajaran` table, indexes, RLS policies.
     - `cp_id` in `tujuan_pembelajaran`.
     - `keterangan` in `asesmen_kolom`.
     - `uq_asesmen_tp_diagnostik` partial unique index on `asesmen_kolom(tp_id) WHERE (kategori = 'Diagnostik')`.
     - Idempotent seed for `bobot_nilai_mapel` in `pengaturan`.
  2. `src/types/database.ts`:
     - `capaian_pembelajaran` table, Row, Insert, Update, Relationships.
     - `cp_id` on `tujuan_pembelajaran` and relationship to `capaian_pembelajaran`.
     - `keterangan` on `asesmen_kolom`.
     - Export aliases `CapaianPembelajaran`, `CapaianPembelajaranInsert`, `CapaianPembelajaranUpdate`.
     - Export `BobotNilaiMapel` and `DEFAULT_BOBOT_NILAI_MAPEL`.
  3. Clean up untracked `migrations/add_cp_and_gradebook_v2.sql`.
- **Success criteria**:
  - `npx tsx tests/m1_database_and_types_verification.test.ts` passes (38/38 assertions).
  - `npm test` passes without regressions.
- **Interface contracts**: PROJECT.md
- **Code layout**: supabase/migrations, src/types

## Key Decisions Made
- Used `cp_id` (UUID nullable) on `tujuan_pembelajaran` referencing `capaian_pembelajaran(id) ON DELETE SET NULL` for non-destructive backwards compatibility.
- Enforced max 1 Diagnostik column per TP at DB engine level via partial unique index `uq_asesmen_tp_diagnostik`.
- Seeded default weights `{kehadiran: 40, formatif: 30, sumatif: 30}` idempotently with `ON CONFLICT (sekolah_id, key) DO NOTHING`.
- Exported `DEFAULT_BOBOT_NILAI_MAPEL` and `BobotNilaiMapel` from `src/types/database.ts` ready for M2 consumption.

## Artifact Index
- .agents/teamwork/worker_m1/DISPATCH.md
- .agents/teamwork/worker_m1/BRIEFING.md
- .agents/teamwork/worker_m1/progress.md
- .agents/teamwork/worker_m1/handoff.md
- supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql
- src/types/database.ts
- tests/m1_database_and_types_verification.test.ts

## Change Tracker
- **Files modified**:
  - `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`: Created canonical migration.
  - `src/types/database.ts`: Added CP relationship on `tujuan_pembelajaran`, exported `BobotNilaiMapel` and `DEFAULT_BOBOT_NILAI_MAPEL`.
  - `migrations/add_cp_and_gradebook_v2.sql`: Removed draft.
  - `tests/m1_database_and_types_verification.test.ts`: Added comprehensive verification tests (38 assertions).
- **Build status**: PASS (`tests/m1_database_and_types_verification.test.ts` 38/38, `npm test` 100%).
- **Pending issues**: None for M1.

## Quality Status
- **Build/test result**: Pass.
- **Lint status**: Clean.
- **Tests added/modified**: `tests/m1_database_and_types_verification.test.ts` (38 passed).

## Loaded Skills
- `migration`: Reversible, compatibility-safe schema transitions.
- `ponytail`: Minimal schema diff and backward compatibility.
