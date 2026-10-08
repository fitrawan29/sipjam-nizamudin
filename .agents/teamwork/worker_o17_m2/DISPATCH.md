## 2026-10-08T16:10:25Z

You are teamwork_preview_worker (worker_o17_m2).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT FILES:
1. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under header '## 2026-10-08T11:11:29Z').
2. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
3. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_2\report.md.
4. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\progress.md.

YOUR MISSION:
Milestone 2 (R2 Teacher Attendance & Admin Routing) was previously implemented by worker_m2, but interrupted during test/build execution before committing:
Files to inspect and verify:
- supabase/migrations/20261008_m2_presensi_guru_approval_autocheckout.sql
- src/types/database.ts
- src/components/GuruPresensi.tsx (multi-state Pulang options, leave duration fields, admin approval rule)
- src/lib/workflow.ts (arrivalState, departureState, multi-day approved leave)
- src/lib/attendanceAlpa.ts (evaluateAndApplyAutoCheckout)
- src/components/AdminVerifView.tsx (approval badges & dates for Sakit >=3, Izin >3)
- src/components/PrintHeader.tsx & src/utils/printWithGps.ts (GPS print footer, SweetAlert on denied permission)
- tests/m2_teacher_attendance_verification.test.ts

TASK STEPS:
1. Review the above files. If any fix or completion is needed according to explorer_o16_2/report.md, apply it cleanly.
2. Run full verification commands:
   - npx tsc --noEmit
   - npx tsx tests/m2_teacher_attendance_verification.test.ts
   - npm test
   - npx tsx tests/e2e/run_all_e2e.ts
   - npm run build
3. Execute Git Workflow Rule per GEMINI.md:
   - Run `git status`
   - Stage changes (`git add .`)
   - Commit with descriptive message: `feat(m2): implement teacher attendance multi-state, auto-checkout, admin routing, and gps print`
   - Push to active branch (`git push origin main`)
4. Write handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m2\handoff.md` with Observation, Logic Chain, Caveats, Conclusion, Verification Commands & Outputs.
5. Send message back to orchestrator reporting results and handoff file path.
