## 2026-11-07T01:00:25Z
You are worker_m3_fix. Your working directory is `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_fix\`.
Read your DISPATCH.md at `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_fix\DISPATCH.md`.

You MUST read the following files before starting your work:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_fix_1\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_fix_3\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_fix_1\defect_01_fix.patch`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. In `src/lib/dataIntegrityGuard.ts` around line 800 (`normalizeCsvHeaders`), scope the `clean === 'kelompok'` mapping so that when `isMapel` is true, it returns `'kelompok'`.
2. (Optional best practice) In `package.json`, ensure `adversarial_m3_dependencies.test.ts` and `adversarial_m3_diagnostics.test.ts` are included in `scripts.test`.
3. Verify:
   - `npx tsx tests/adversarial_m3_dependencies.test.ts` (26/26 checks pass)
   - `npx tsx tests/adversarial_m3_diagnostics.test.ts` (22/22 checks pass)
   - `npx tsx tests/master_data_workflow_stepper_and_relational_validation.test.ts` (18/18 checks pass)
   - `npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` (58/58 checks pass)
   - `npx tsc --noEmit` (exit code 0)
   - `npm test` (all 63+ test suites pass, exit code 0)
   - `npm run build` (exit code 0)
4. Git Workflow:
   - `git status`
   - `git add .`
   - `git commit -m "fix(master-data): preserve kelompok column without category collision on mapel import"`
   - `git push origin main`
5. Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_fix\handoff.md` and message the orchestrator.
