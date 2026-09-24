# Task Assignment: Worker Milestone 1

You are Worker M1 (`teamwork_preview_worker`).
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1_1
- Original Request File: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Master Project Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md
- Survey Reference: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1_1\survey_r1.md
- Parent Orchestrator ID: 2ac91888-0ccf-41c6-9452-748556b221b7

## Mandatory Integrity Warning
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective: Milestone 1 Implementation
Implement genuine solutions for:
1. **F1: Presensi Re-submission Reset on Reject**:
   In `src/components/GuruPresensi.tsx`, ensure resubmitting rejected presensi (Datang or Pulang) reliably deletes the old rejected record and updates daily state.
2. **F2: Jurnal Re-submission Reset & Fix**:
   In `src/components/GuruJurnal.tsx`, fix the critical batch-deletion bug where submitting one journal deletes all rejected journals indiscriminately. Target deletion only to the matching rejected journal (matching class and subject/keterangan). Populate missing `sekolah_id` in the `newJurnal` insert payload.
3. **F3: Laporan Piket Re-submission Reset on Reject**:
   In `src/components/PiketView.tsx`, ensure rejected piket report is cleanly reset upon resubmission.
4. **F4: Admin Verification UI Updates**:
   In `src/components/AdminVerifView.tsx`:
   - Hide the "Setujui" button whenever `item.status_verifikasi === 'Ditolak'` (it must not remain clickable or visible on rejected items).
   - Automatically and immediately remove rejected cards from the active verification list when Admin submits a rejection.

## Exclusive File Ownership
You exclusively own and may edit:
- `src/components/GuruPresensi.tsx`
- `src/components/GuruJurnal.tsx`
- `src/components/PiketView.tsx`
- `src/components/AdminVerifView.tsx`

## Git Workflow Rule (from GEMINI.md)
When completed, you are REQUIRED to automatically:
1. Check git status (`git status`)
2. Stage modified files (`git add .`)
3. Create commit with descriptive message (`git commit -m "feat(m1): implement presensi/jurnal/piket resubmit reset & admin verif UI"`)
4. Push to active origin branch (`git push origin main` or current branch)

## Verification
1. Run existing test suite (`npm test`) to ensure no regressions.
2. Write a unit/integration test or verify with tests that M1 requirements pass.
3. Document build/test results in `handoff.md` and send completion message to parent.

## 2026-09-24T12:32:55Z
You are Worker M1 for Milestone 1 of SIPJAM.
Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1_1.
Read your instructions at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1_1\DISPATCH.md, survey report at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1_1\survey_r1.md, and original request at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Implement genuine fixes for:
1. F1: Presensi resubmission reset on reject (GuruPresensi.tsx)
2. F2: Jurnal resubmission reset & batch-delete fix + sekolah_id (GuruJurnal.tsx)
3. F3: Laporan Piket resubmission reset (PiketView.tsx)
4. F4: Admin Verification UI: hide Setujui button when rejected, remove rejected item from list (AdminVerifView.tsx)
Run tests to verify no regressions, follow GEMINI.md git workflow (status, add, commit, push), write handoff.md, and report completion back to parent (2ac91888-0ccf-41c6-9452-748556b221b7) via send_message.
