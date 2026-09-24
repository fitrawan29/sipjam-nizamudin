# Dispatch: Forensic Auditor M2

## Identity
- Role: teamwork_preview_auditor
- Assigned Scope: Milestone 2 Forensic Integrity Audit
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_m2_1\
- Parent Orchestrator: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\

## Mandatory Context
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md
- Worker Handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_2\handoff.md

## Audit Scope & Verification Checks
Perform forensic integrity checks on all Milestone 2 files:
1. `src/app/api/notifications/rejection/route.ts`
2. `src/lib/attendanceAlpa.ts`
3. `src/app/api/attendance/auto-alpa/route.ts`
4. `src/lib/warningSystem.ts`
5. `src/components/AdminVerifView.tsx` & `src/components/PiketView.tsx`
6. `src/components/AdminRekapView.tsx`
7. `src/components/HomeView.tsx` & `src/components/AdminMonitorView.tsx`
8. `tests/m2_notifications_alpa_warning.test.ts`

Integrity Checks:
- **No Mock or Dummy Implementations**: Verify genuine Web Push sending (`sendWebPush`), real database queries and mutations via Supabase client, and authentic warning calculations.
- **No Hardcoded Façade**: Check that cutoff evaluation genuinely queries `jam_pulang_akhir` and updates rows in `presensi_guru`.
- **No Test Cheating**: Ensure `tests/m2_notifications_alpa_warning.test.ts` executes real assertions on file contents and exported algorithmic functions without dummy test passes.
- **Binary Verdict**: CLEAN or INTEGRITY VIOLATION.
- Write full evidence report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_m2_1\handoff.md`.
- Notify parent orchestrator via `send_message`.

## 2026-09-24T16:45:57Z
You are Forensic Auditor M2. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_m2_1\.
Read your dispatch instructions at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_m2_1\DISPATCH.md.
Also read ORIGINAL_REQUEST at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md.
Perform forensic integrity checks on Milestone 2 code, routes, and services. Formulate binary verdict (CLEAN or INTEGRITY VIOLATION), write full evidence report in handoff.md, and notify parent with send_message.
