# BRIEFING — 2026-11-07T08:11:00Z

## Mission
Implement Milestone 3 (Requirement R4): Master Data Navigation Order & Panduan Alur (Visual Workflow Stepper), CSV Templates Harmony, Pre-Upload Relational Validation, Progress Bar & Granular Error Diagnostics, and Verification Test Suite.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_nov\
- Original parent: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Milestone: Milestone 3 (Requirement R4)

## 🔒 Key Constraints
- Owned files:
  - `src/components/AdminDataView.tsx`
  - `src/lib/dataIntegrityGuard.ts`
  - `src/components/AdminKelasView.tsx`
  - `tests/master_data_workflow_stepper_and_relational_validation.test.ts`
- Preserve literal `id`, `label`, `table` properties in `tabs` array to satisfy AST regex tests in `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`.
- Preserve existing CSV headers and error message formats (`Baris ${rowNumber}`) for 100% backward test compatibility.
- 0 tsc errors, 100% passing tests across all 61+ test suites, Next.js build clean.
- Git workflow rule: commit and push to origin main when done.

## Current Parent
- Conversation ID: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Updated: 2026-11-07T08:11:00Z

## Task Summary
- **What to build**: Visual workflow stepper card in `AdminDataView.tsx`, 9 CSV templates harmonization, pre-upload relational validation with O(1) batching and fallback handling, 6-stage upload progress bar with micro-yields, PostgreSQL error code translation to actionable diagnostic cards, and comprehensive test suite.
- **Success criteria**: All 4 verification steps pass (tsc, new test suite, npm test 61+ suites, npm run build).

## Key Decisions Made
- [TBD]

## Artifact Index
- `.agents/teamwork/worker_m3_nov/DISPATCH.md`
- `.agents/teamwork/worker_m3_nov/BRIEFING.md`
- `.agents/teamwork/worker_m3_nov/progress.md`
- `.agents/teamwork/worker_m3_nov/handoff.md`

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not run yet
- **Lint status**: Not run yet
- **Tests added/modified**: `tests/master_data_workflow_stepper_and_relational_validation.test.ts` (to be created)

## Loaded Skills
- None
