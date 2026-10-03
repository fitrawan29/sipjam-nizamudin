# Worker 2 Dispatch: Remediate Teacher Role Restriction and Array Guard (Iteration 2)

## Context & Role
You are Worker 2 (`teamwork_preview_worker`).
Working directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_2`
Original request path: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read this first!).

## Context of Failure in Iteration 1
In Iteration 1, Challenger 2 ran `tests/adversarial_teacher_reminder_stress.test.ts` and uncovered 2 bugs in `src/components/TeacherReminderManager.tsx`:
1. **Critical/High (Negative Role Inference Privilege Escalation)**:
   Lines 178–181 used:
   ```tsx
   const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
   const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';
   const isGuru = Boolean(user && !isAdmin && !isSuperadmin);
   ```
   This caused non-teachers (`siswa`, `student`, `guest`, `wali_murid`, empty role `''`, or `administrator`) to evaluate as `isGuru = true`, polling the database and sending teacher reminders to students/guests!
2. **Medium (Unhandled Runtime TypeError on undefined `jurnalKBM`)**:
   Line 116 used `dailyState.jurnalKBM.some(...)` without defensive fallback, crashing when `jurnalKBM` is undefined or null.

## Required Fixes in `src/components/TeacherReminderManager.tsx`
1. Remediate lines 178–182 with explicit positive role verification:
   ```tsx
   // Positive role verification: Active ONLY for teachers (guru / teacher)
   const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
   const isSuperadmin = normRole === 'superadmin';
   const isAdmin = isSuperadmin || normRole === 'admin' || normRole === 'administrator';
   const isGuru = Boolean(user && !isAdmin && !isSuperadmin && (normRole === 'guru' || normRole === 'teacher'));
   ```
2. Defensively guard `jurnalKBM` on line 116 (or around it):
   ```tsx
   const missingSchedules = dailyState.jadwalKBM.filter(
     jk => !(dailyState.jurnalKBM || []).some(j => isJurnalMatchJadwal(j, jk))
   );
   ```

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification & Git Workflow
1. Run `npx tsx tests/adversarial_teacher_reminder_stress.test.ts` — all 57/57 assertions must PASS.
2. Run `npm test` — all 16 test suites must PASS.
3. Run `npx tsc --noEmit` — 0 errors.
4. Run `npm run build` — Turbopack production build succeeds.
5. Execute mandatory GEMINI.md Git Workflow:
   - `git status`
   - `git add .`
   - `git commit -m "fix(reminder): enforce positive teacher role check and defensive array guard"`
   - `git push origin main`

## Output Requirements
Write handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_2\handoff.md` and notify caller (orchestrator_7).

## 2026-10-03T05:57:42Z
You are Worker 2 (teamwork_preview_worker).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_2
First read your task instructions in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_2\DISPATCH.md, ORIGINAL_REQUEST.md, and challenger_2 handoff report at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_2\handoff.md.

Task:
Fix the 2 bugs in src/components/TeacherReminderManager.tsx:
1. Enforce positive role verification (normRole === 'guru' || normRole === 'teacher') so non-teachers (siswa, guest, etc.) are never treated as teachers.
2. Add defensive array fallback (dailyState.jurnalKBM || []).some(...) to prevent TypeError.
Run tests:
- npx tsx tests/adversarial_teacher_reminder_stress.test.ts (all 57 assertions must pass)
- npm test (all 16 test suites pass)
- npx tsc --noEmit (0 errors)
- npm run build (successful build)
Execute Git workflow: git status, git add ., git commit -m "fix(reminder): enforce positive teacher role check and defensive array guard", git push origin main.
Write handoff report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_2\handoff.md and notify your caller (orchestrator_7).
