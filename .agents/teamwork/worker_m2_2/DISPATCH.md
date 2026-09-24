# Dispatch: Worker M2 (Iteration 2)

## Identity
- Role: teamwork_preview_worker
- Assigned Milestone: Milestone 2 (M2: Notifikasi Penolakan, Auto-Alpa Cutoff & Warning 3x)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_2\
- Parent Orchestrator: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\

## Mandatory Context
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md
- Prior Work & Test: tests/m2_notifications_alpa_warning.test.ts

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Git Workflow Rule (GEMINI.md)
Every time you complete code modifications:
1. `git status`
2. `git add .`
3. `git commit -m "..."`
4. `git push origin main` (or active branch) automatically without asking.

## Next.js Rules (AGENTS.md)
Ensure App Router conventions and zero deprecations.

## Objectives & Tasks
Complete and verify Features F5, F6, F7:
1. **F5: Rejection Notification to Teacher**
   - Route `src/app/api/notifications/rejection/route.ts`
   - Wire into `src/components/AdminVerifView.tsx` and `src/components/PiketView.tsx`
   - Real Web Push via `sendWebPush` in `src/lib/vapid.ts` and in-app message in `chat_messages`
   - Validations, XSS sanitization, 410 dead subscription cleanup
2. **F6: Auto-Alpa Cutoff Evaluation & Rekap Update**
   - Service `src/lib/attendanceAlpa.ts` (`evaluateAndApplyAutoAlpa`)
   - Route `src/app/api/attendance/auto-alpa/route.ts` (GET & POST)
   - Mutate unresubmitted rejections to 'Alpa' in `presensi_guru` after `jam_pulang_akhir`
   - Update `src/components/AdminRekapView.tsx` to aggregate explicit Alpa
3. **F7: 3x Absence Warning Feature**
   - Service `src/lib/warningSystem.ts` (`getTeacherDisciplineWarnings`, `getAllTeachersDisciplineWarnings`, `calculateStreak`)
   - Banners and UI in `src/components/HomeView.tsx` and `src/components/AdminMonitorView.tsx`
   - Covers Presensi, Jurnal, and Piket for both consecutive (berturut-turut) and accumulated (akumulasi) violations
4. **Verification & Tests**
   - Run `npx tsx tests/m2_notifications_alpa_warning.test.ts`
   - Run `npm test` or affected tests
   - Ensure all tests pass with exit code 0
5. **Git commit and push per GEMINI.md**
6. **Handoff**
   - Write comprehensive `handoff.md` in your working directory with build/test results, files changed, and git commit hash.
