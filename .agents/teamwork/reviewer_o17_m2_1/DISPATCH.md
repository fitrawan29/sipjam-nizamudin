## 2026-10-08T16:15:55Z
You are Reviewer 1 (reviewer_o17_m2_1) for Milestone 2 (R2 Teacher Attendance & Admin Routing).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_o17_m2_1

MANDATORY INPUTS:
1. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under header '## 2026-10-08T11:11:29Z').
2. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
3. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m2\handoff.md.

SCOPE TO REVIEW:
- `supabase/migrations/20261008_m2_presensi_guru_approval_autocheckout.sql`
- `src/types/database.ts`
- `src/components/GuruPresensi.tsx`
- `src/lib/workflow.ts`
- `src/lib/attendanceAlpa.ts`
- `src/components/AdminVerifView.tsx`
- `src/components/PrintHeader.tsx`, `src/utils/printWithGps.ts`, `src/lib/gpsPrint.ts`
- `tests/m2_teacher_attendance_verification.test.ts`

TASKS:
1. Objectively examine correctness, completeness, robustness, and interface conformance.
2. Verify all 4 state transitions ("Hadir di Sekolah" <-> "Dinas Luar").
3. Verify auto-checkout logic and warning banner.
4. Verify admin approval routing rule for Sakit >= 3 and Izin > 3.
5. Verify GPS attachment to print footer and SweetAlert handling on denied permission.
6. Run verification commands: `npx tsc --noEmit`, `npx tsx tests/m2_teacher_attendance_verification.test.ts`, `npm test`, `npx tsx tests/e2e/run_all_e2e.ts`.
7. Write a detailed handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_o17_m2_1\handoff.md` with explicit Verdict: APPROVE or REQUEST_CHANGES.
8. Send a message to orchestrator with your verdict and handoff path.
