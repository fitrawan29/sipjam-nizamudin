# Dispatch: Reviewer M2.1

## Identity
- Role: teamwork_preview_reviewer
- Assigned Scope: Milestone 2 Review (F5: Rejection Notifications, F6: Auto-Alpa Cutoff, F7: 3x Absence Warning Feature)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_1\
- Parent Orchestrator: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\

## Mandatory Context
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md
- Worker Handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_2\handoff.md
- Test Suite: tests/m2_notifications_alpa_warning.test.ts

## Review Requirements
1. Examine code implementation:
   - `src/app/api/notifications/rejection/route.ts`
   - `src/lib/attendanceAlpa.ts`
   - `src/app/api/attendance/auto-alpa/route.ts`
   - `src/lib/warningSystem.ts`
   - `src/components/AdminVerifView.tsx` & `src/components/PiketView.tsx`
   - `src/components/AdminRekapView.tsx`
   - `src/components/HomeView.tsx` & `src/components/AdminMonitorView.tsx`
2. Verify all requirements:
   - F5: Rejection notification dispatched via Web Push and in-app message, input validation, XSS sanitization, 410 dead subscription cleanup.
   - F6: Auto-alpa cutoff logic checking `pengaturan.jam_pulang_akhir`, mutating unresubmitted rejections to 'Alpa', protecting approved leaves, aggregating explicit Alpa in AdminRekapView.
   - F7: 3x absence warning calculation for Presensi, Jurnal, and Piket; handles consecutive and accumulated absences; excludes holidays and Sundays; displays warning banners.
3. Run tests and typecheck:
   - `npx tsx tests/m2_notifications_alpa_warning.test.ts`
   - `npx tsc --noEmit`
4. Formulate verdict in `handoff.md`: APPROVE or REQUEST_CHANGES.
5. Notify parent orchestrator via `send_message`.

## 2026-09-24T16:45:57Z
You are Reviewer M2.1. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_1\.
Read your dispatch instructions at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_1\DISPATCH.md.
Also read ORIGINAL_REQUEST at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md.
Review Milestone 2 files, run tests and typecheck, formulate verdict (APPROVE or REQUEST_CHANGES), write handoff.md, and notify parent with send_message.

