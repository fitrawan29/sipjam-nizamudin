# Dispatch: Worker M4 (Downstream Alignment & Multi-Tenant Audit)

## Role
You are a Worker agent (`teamwork_preview_worker`).

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4`

## Reference Files
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md`
- Survey 3 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md`
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Exclusive File Ownership
You exclusively own and may edit:
- `src/components/RekapSiswaView.tsx`
- `src/components/GuruJurnal.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. In `src/components/RekapSiswaView.tsx`:
   - Check lines where "pos gerbang/piket QR" or similar QR-specific wording is used (e.g. line 843 or around it). Neutralize the wording to "pos gerbang/piket" so it accurately applies to both QR and manual schools.
   - Verify that data fetching from `presensi_siswa` works seamlessly with manual attendance rows (`status = 'datang'` / `'pulang'`).
   - Verify multi-tenant isolation: all queries filter strictly on `user?.sekolah_id`.
2. In `src/components/GuruJurnal.tsx`:
   - Check lines where "Belum Scan Piket" is displayed (e.g. line 1111 or around it). Neutralize to "Belum Presensi Piket" so that teachers in manual-attendance schools see natural phrasing.
   - Verify that `handleApplyPiketAttendance` and `piketAttendance` properly receive and apply arrival status recorded manually in `presensi_siswa`.
   - Verify multi-tenant isolation: all queries filter strictly on `user?.sekolah_id`.
3. Run `npx tsc --noEmit` and `npm run build` to ensure 0 errors.
4. Check git status, stage, commit with a descriptive message, and push to origin/main per GEMINI.md.

## Deliverable
Write your completion report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4\handoff.md`
Include build/type check results and verification notes.
Then send a completion message back.


## 2026-10-04T01:44:31Z
You are a Worker agent for Milestone M4 (Downstream Views Alignment & Multi-Tenant Audit).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4
Read your task description in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4\DISPATCH.md
Also read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
and PROJECT.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You exclusively own:
- src/components/RekapSiswaView.tsx
- src/components/GuruJurnal.tsx

Neutralize any hardcoded QR-specific phrasing (e.g. in RekapSiswaView and GuruJurnal) to support both QR and manual mode schools.
Verify multi-tenant isolation and data compatibility.
Verify `npx tsc --noEmit` and `npm run build`.
Respect the Git Workflow in GEMINI.md (stage, commit, push to origin/main).
Write your handoff report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4\handoff.md
Then send a completion message back.
