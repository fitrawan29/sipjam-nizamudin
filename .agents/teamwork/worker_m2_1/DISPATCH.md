# Task Assignment: Worker Milestone 2

You are Worker M2 (`teamwork_preview_worker`).
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_1
- Original Request File: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Master Project Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md
- Survey Reference: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1_1\survey_r1.md
- Parent Orchestrator ID: 2ac91888-0ccf-41c6-9452-748556b221b7

## Mandatory Integrity Warning
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective: Milestone 2 Implementation
Implement genuine solutions for:
1. **F5: Rejection Notification to Teacher**:
   - Create `src/app/api/notifications/rejection/route.ts` to dispatch Web Push via `sendWebPush` from `src/lib/vapid.ts` and insert in-app message into `chat_messages`.
   - Wire notification calls in `src/components/AdminVerifView.tsx` (when rejecting presensi/jurnal/piket) and `src/components/PiketView.tsx` (when admin rejects piket report).
2. **F6: Auto-Alpa Cutoff Evaluation & Rekap Update**:
   - Create `src/lib/attendanceAlpa.ts` implementing `evaluateAndApplyAutoAlpa(targetDateStr?, sekolahId?)` that queries unresubmitted rejections after `pengaturan.jam_pulang_akhir` and mutates them in DB to `status_verifikasi = 'Alpa'` and `jenis_presensi = 'Alpa'`.
   - Create `src/app/api/attendance/auto-alpa/route.ts` API route.
   - Update `src/components/AdminRekapView.tsx` to count explicit Alpa from `presensi_guru`.
3. **F7: 3x Absence Warning Feature**:
   - Create `src/lib/warningSystem.ts` computing 3x consecutive or accumulated violations for Presensi, Jurnal, and Piket.
   - Render prominent discipline warning banner in `src/components/HomeView.tsx` for teachers.
   - Render warning summary card in `src/components/AdminMonitorView.tsx` for admins.

## Exclusive File Ownership
You exclusively own and may edit:
- `src/app/api/notifications/rejection/route.ts` (new)
- `src/lib/attendanceAlpa.ts` (new)
- `src/app/api/attendance/auto-alpa/route.ts` (new)
- `src/lib/warningSystem.ts` (new)
- `src/components/AdminRekapView.tsx`
- `src/components/AdminMonitorView.tsx`
- `src/components/HomeView.tsx` (warning banner section)
- `src/components/AdminVerifView.tsx` (rejection notification trigger)
- `src/components/PiketView.tsx` (rejection notification trigger)

## Git Workflow Rule (from GEMINI.md)
When completed, you are REQUIRED to automatically:
1. Check git status (`git status`)
2. Stage modified files (`git add .`)
3. Create commit with descriptive message (`git commit -m "feat(m2): implement rejection notifications, auto-alpa cutoff, and 3x absence warning"`)
4. Push to active origin branch (`git push origin main` or current branch)

## Verification
1. Run existing test suite (`npm test`) and E2E test suite (`npm run test:e2e`).
2. Write unit/integration tests for M2 functionality in `tests/m2_notifications_alpa_warning.test.ts`.
3. Document build/test results in `handoff.md` and send completion message to parent.

## 2026-09-24T12:53:07Z
You are Worker M2 for Milestone 2 of SIPJAM.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_1.
Read your instructions at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_1\DISPATCH.md, master project plan at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md, and original request at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Implement:
1. F5: Rejection notifications (/api/notifications/rejection, sendWebPush, chat_messages, wire into AdminVerifView & PiketView)
2. F6: Auto-alpa cutoff (attendanceAlpa.ts, /api/attendance/auto-alpa, AdminRekapView explicit Alpa)
3. F7: 3x absence warning feature (warningSystem.ts, HomeView teacher alert banner, AdminMonitorView summary)
Run tests, follow GEMINI.md git workflow (commit and push), write handoff.md, and send completion message to parent (2ac91888-0ccf-41c6-9452-748556b221b7).

