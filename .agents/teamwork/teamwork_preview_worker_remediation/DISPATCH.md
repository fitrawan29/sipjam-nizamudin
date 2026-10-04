# Dispatch: Remediation Worker (Reviewer 1 Feedback Resolution)

## Role
You are a Worker agent (`teamwork_preview_worker`).

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_remediation`

## Reference Files
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md`
- Reviewer 1 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_reviewer_1\handoff.md`
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Exclusive File Ownership
You exclusively own and may edit:
- `src/components/PiketView.tsx`
- `tests/m4_wali_kelas_guru_sync.test.ts`
- `src/components/RekapSiswaView.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks to Fix
1. **Fix `showToast` argument order in `src/components/PiketView.tsx`**:
   In `handleManualMark` and `handleCancelManualPresensi` (around lines 514–556):
   Check how `showToast` is declared in `PiketView.tsx`:
   `const showToast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success', text?: string)`
   Make sure calls pass `showToast('Gagal', 'error', res.message || 'Terjadi kesalahan')` and NOT passing the icon as the 3rd parameter or text as the 2nd parameter!
2. **Camera cleanup on mode flip in `src/components/PiketView.tsx`**:
   In `useEffect` or mode change handler, when `modePresensiSiswa === 'manual'`, ensure `stopCameraStream()` is called if camera stream is active, so the hardware camera does not remain on when transitioning to manual mode.
3. **Legacy test alignment in `tests/m4_wali_kelas_guru_sync.test.ts` and `RekapSiswaView.tsx`**:
   In `tests/m4_wali_kelas_guru_sync.test.ts`, update the static string assertions (or provide backward-compatible aliases like `const totalGerbangBelumScan = totalGerbangBelumPresensi;` in `RekapSiswaView.tsx` and allow both "Belum Presensi" and "Belum Scan") so that `npm test` passes 100% across all test suites without breaking the requirement R5 neutralized wording.
4. **Run Verifications**:
   - Run `npm test` and verify 100% suites pass.
   - Run `npx tsc --noEmit` (0 errors).
   - Run `npm run build` (0 errors).
5. **Git Workflow (GEMINI.md)**:
   Stage, commit with a descriptive message, and push to origin/main.

## Deliverable
Write your completion report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_remediation\handoff.md`
Then send a completion message back.


## 2026-10-04T02:00:24Z
You are Remediation Worker.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_remediation
Read your task description in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_remediation\DISPATCH.md
Also read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
and Reviewer 1 report at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_reviewer_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You exclusively own:
- src/components/PiketView.tsx
- tests/m4_wali_kelas_guru_sync.test.ts
- src/components/RekapSiswaView.tsx

Tasks:
1. Fix showToast argument order in PiketView.tsx.
2. Ensure camera stream is stopped when mode transitions to 'manual' in PiketView.tsx.
3. Update tests/m4_wali_kelas_guru_sync.test.ts (and RekapSiswaView.tsx alias if needed) so that npm test passes 100% across all suites while preserving R5 neutral attendance phrasing.
4. Run `npm test`, `npx tsc --noEmit`, and `npm run build`.
5. Execute git workflow (stage, commit, push to origin/main).
Write handoff to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_remediation\handoff.md
Then send a completion message back.
