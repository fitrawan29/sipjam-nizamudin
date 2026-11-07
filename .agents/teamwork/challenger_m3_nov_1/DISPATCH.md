# DISPATCH — challenger_m3_nov_1

## Task
Empirically stress-test Master Data Relational Dependencies and Template Harmonization.

## Key Files
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\lib\dataIntegrityGuard.ts`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminDataView.tsx`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_nov\handoff.md`

## Challenge Focus
1. Test relational dependency checks on invalid CSVs (missing class for student, missing teacher/mapel/class for schedule, missing teacher for wali kelas).
2. Test template download content against DB table schema.
3. Verify automatic `guru_id` enrichment in wali kelas.
4. Author an empirical stress test script or test suite to confirm robustness.


## 2026-11-07T00:41:10Z
You are challenger_m3_nov_1. Your working directory is `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_nov_1\`.
Read your DISPATCH.md at `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_nov_1\DISPATCH.md`.

You MUST read the following files before starting:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_nov\handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Challenge Focus:
1. Empirically verify relational dependency checks in `src/lib/dataIntegrityGuard.ts` by authoring/running stress tests with invalid relational CSV data (missing class for student, missing teacher/mapel/class for schedule, missing teacher for wali kelas).
2. Empirically verify CSV template headers match database schema columns.
3. Empirically verify `guru_id` auto-population in wali kelas.
4. Author an empirical test script (e.g. `tests/adversarial_m3_dependencies.test.ts`) and execute it.
5. If you modify or add any test files, remember to stage, commit, and push (`git push origin main`).

Deliver your findings in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_nov_1\handoff.md` with an explicit verdict: APPROVE or REQUEST_CHANGES.
Send a message back to the orchestrator when complete.
