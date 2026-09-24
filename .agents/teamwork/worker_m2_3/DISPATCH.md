# Dispatch: Worker M2.3 (Forensic Remediation Execution)

## Identity
- Role: teamwork_preview_worker
- Assigned Scope: Milestone 2 Remediation Implementation (Iteration 3)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_3\
- Parent Orchestrator: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\

## Mandatory Context
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md
- REMEDIATION BLUEPRINT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\handoff.md
- FORENSIC AUDIT EVIDENCE: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_m2_1\handoff.md

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Git Workflow Rule (GEMINI.md)
Every time you complete code modifications:
1. `git status`
2. `git add .`
3. `git commit -m "..."`
4. `git push origin main` (or active branch) automatically without asking.

## Next.js Rules (AGENTS.md)
Follow Next.js App Router rules and conventions.

## Action Plan (Apply Patches 1-5 from Explorer M2.2 handoff)
1. **Patch 1: `src/components/AdminRekapView.tsx`**
   - Line 65: Change `.eq('status_verifikasi', 'Disetujui')` to `.in('status_verifikasi', ['Disetujui', 'Alpa'])`.
2. **Patch 2: `src/lib/wita.ts` & `src/lib/attendanceAlpa.ts`**
   - In `src/lib/wita.ts`: Ensure `getWitaTimeStr` returns colon format with `.replace('.', ':')`.
   - In `src/lib/attendanceAlpa.ts`: Add `isBeforeCutoff` export, use it on line 52, bound queries with `.gte('timestamp', startOfDay).lte('timestamp', endOfDay)`, and filter `presensiRecords` by evaluated date.
3. **Patch 3: `src/lib/warningSystem.ts`**
   - Export `buildEvaluationDates` using WITA date arithmetic (`todayStr + 'T12:00:00+08:00'`), filter Sundays (`dayName === 'Minggu'`), Saturdays for 5-day schools (`dayName === 'Sabtu'`), and holidays.
   - Bound queries in `getTeacherDisciplineWarnings` with `.lte('timestamp', maxDate)`.
4. **Patch 4: `src/app/api/notifications/rejection/route.ts`**
   - In `sanitizeText`: Handle non-string values safely.
   - In `POST`: Validate string types, non-empty trimmed values, and valid categories (`Presensi`, `Jurnal`, `Piket`), returning HTTP 400 on invalid input.
5. **Patch 5: Update Tests**
   - In `tests/m2_adversarial_stress.test.ts`: Import and verify `isBeforeCutoff` and `buildEvaluationDates` so that all 22 checks pass (22/22 PASS).
   - In `tests/m2_notifications_alpa_warning.test.ts`: Add behavioral assertions testing cutoff comparison, Sunday/holiday exclusion, and Rekap Alpa aggregation.
6. **Execute Verification Commands**:
   - `npx tsx tests/m2_adversarial_stress.test.ts` (Expected: 22/22 PASS)
   - `npx tsx tests/m2_notifications_alpa_warning.test.ts` (Expected: 100% PASS)
   - `npx tsx tests/challenger_m2_empirical.test.ts` (Expected: 16/16 PASS)
   - `npx tsc --noEmit` (Expected: 0 errors)
   - `npm run build` (Expected: Exit 0)
7. **Git Commit & Push**:
   - Follow GEMINI.md.
8. **Handoff**:
   - Write comprehensive `handoff.md` and notify parent via `send_message`.
