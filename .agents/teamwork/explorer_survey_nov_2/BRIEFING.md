# BRIEFING — 2026-11-06T22:39:00Z

## Mission
Comprehensive codebase survey for Requirements R3 (Buku Nilai Mapel cascading selection) and R5 (System Backup & Restore with ZIP archive, data/ and foto/).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_2\
- Original parent: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Milestone: survey_r3_r5

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write only to my folder: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_2\`
- Never place source code, tests, or data files in `.agents/teamwork/`
- Never name a file `AGENTS.md` or `GEMINI.md`

## Current Parent
- Conversation ID: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/components/GradebookView.tsx` (Buku Nilai Mapel, teacher/mapel/kelas state & sync logic)
  - `src/components/RaporView.tsx` (Rapor Kelas Binaan / Wali Kelas)
  - `src/components/AdminBackupView.tsx` (Existing legacy backup & restore logic)
  - `src/components/AdminConfigView.tsx` (System configuration, backup tab embedding)
  - `src/components/AppScreen.tsx` (View mounting & routing for gradebook and backup)
  - `src/types/database.ts` & `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (Inventory of 33 tables)
  - `src/components/AdminKelasView.tsx` (parseTingkat helper for grade normalization)
  - `tests/gradebook_teacher_filter_ponytail.test.ts` (Existing teacher filter test suite)
  - `tests/menu_consolidation_feature_recovery.test.ts` (AdminBackupView DOM invariants)
- **Key findings**:
  - R3: Current GradebookView auto-selects first teacher on mount for Admin and leaks non-matching class grade levels via fallback; must mandate initial teacher selection and strictly filter classes by subject and tingkat.
  - R5: Current AdminBackupView only backs up 2 tables destructively via external Google Sheets webhook; must be overhauled to package all 33 tables in `data/` and photos/assets in `foto/` within a single ZIP archive, supported by a topological dependency-ordered restore.
- **Unexplored areas**: None for R3 and R5 survey scope.

## Key Decisions Made
- Completed survey and compiled full 5-component handoff report.
- Formulated exact topological dependency order (Levels 0 through 5) for clean restore execution.
- Identified test invariants in `gradebook_teacher_filter_ponytail.test.ts` and `menu_consolidation_feature_recovery.test.ts` to guarantee zero regression.

## Artifact Index
- DISPATCH.md — Initial task dispatch
- BRIEFING.md — Situational awareness and persistent memory
- progress.md — Liveness heartbeat and milestone tracker
- handoff.md — Comprehensive 5-component survey handoff report
