# DISPATCH — reviewer_m3_nov_2

## Task
Review Milestone 3 implementation of CSV Templates Harmonization, Pre-Upload Relational Validation, and Granular Error Diagnostics.

## Key Files to Review
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\lib\dataIntegrityGuard.ts`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminDataView.tsx`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminKelasView.tsx`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_nov\handoff.md`

## Review Focus
1. Harmonization of all 9 CSV templates against DB schema (`Data_Guru` includes `sekolah_id`, `Jadwal` and `Kalender` omit `id`, etc.).
2. Relational pre-upload validation (`validateRelationalDependencies`) verifying foreign keys before upsert.
3. Error translation (`translateDatabaseError`) converting PostgreSQL error codes (`23503`, `23502`, `23505`, `42501`) into structured diagnostic info while preserving compatibility prefix `Baris ${rowNumber}: `.
4. Upload progress bar (6 stages, micro-yields, visual UI in AdminDataView & AdminKelasView).
5. Run build and tests.

## 2026-11-07T00:41:10Z
You are reviewer_m3_nov_2. Your working directory is `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m3_nov_2\`.
Read your DISPATCH.md at `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m3_nov_2\DISPATCH.md`.

You MUST read the following files before starting your review:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_nov\handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Review Focus:
1. Harmonization of all 9 CSV download templates in `AdminDataView.tsx` against database schemas (e.g., `Data_Guru` includes `sekolah_id`, `Jadwal` and `Kalender` omit `id`).
2. Pre-upload relational dependency validation in `src/lib/dataIntegrityGuard.ts` (`validateRelationalDependencies`) verifying prerequisite records before database upsert, with defensive query execution (`safeSelect`).
3. Database error translation (`translateDatabaseError`) converting PostgreSQL error codes (`23503`, `23502`, `23505`, `42501`) into structured diagnostic info while preserving the `Baris ${rowNumber}: ` prefix for backward compatibility.
4. 6-stage upload progress bar in `dataIntegrityGuard.ts` and UI integration in `AdminDataView.tsx` and `AdminKelasView.tsx`.
5. Run build and tests: `npx tsc --noEmit` and `npm test`.

Deliver your findings in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m3_nov_2\handoff.md` with an explicit verdict: APPROVE or REQUEST_CHANGES.
Send a message back to the orchestrator when complete.
