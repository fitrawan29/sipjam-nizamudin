# Master Plan — Orchestrator 18

## Goal
Verify Milestone 4, execute Milestone 5 (E2E Test Suite validation for all 5 acceptance criteria, full test suites, build, git workflow), verify victory, and hand off to Sentinel.

## Phase 1: Milestone 4 Gate Verification
1. Dispatch Reviewer 1 & Reviewer 2:
   - Verify `GradebookView.tsx`, `AppScreen.tsx`, `RaporView.tsx`, `tutorialSteps.ts`, `tutorialData.ts`, `tests/m4_academic_merdeka_rapor.test.ts`.
   - Run build and test suites.
2. Dispatch Challenger 1 & Challenger 2:
   - Challenger 1: Adversarial tests for Kurikulum Merdeka CP calculations (single TP, boundary scores 85/70/65, ties, missing/null values, narrative assertions).
   - Challenger 2: Adversarial tests for Wali Kelas Rapor access boundaries (guru mapel vs wali kelas vs admin/superadmin, navigation interception, unauthorized fallback card).
3. Dispatch Forensic Auditor:
   - Audit code for authenticity, genuine calculations, absence of test mocking shortcuts or fake logic, no hardcoded results.
4. Gate Evaluation:
   - Synthesize verdicts in `GATE_STATUS.md`.
   - If all APPROVE and CLEAN, mark Milestone 4 as DONE in `PROJECT.md` and `progress.md`.

## Phase 2: Milestone 5 Execution (E2E Test Suite & Final Verification)
1. Dispatch Test Writer / Worker:
   - Create or update comprehensive E2E tests in `tests/e2e/` strictly covering all 5 Acceptance Criteria:
     1. 30-minute snooze in `TeacherReminderManager.tsx` (persistence in `localStorage`, suppression of banners/alerts).
     2. Multi-state arrival/departure transitions and long-term leave admin approval routing in `GuruPresensi.tsx` & `AdminVerifView.tsx` (Dinas Luar check-in/out, Sakit >= 3 days, Izin > 3 days).
     3. Concurrency lock in `PiketView.tsx` & `piketLock.ts` (simulating two simultaneous Piket users, lease acquisition and lockout).
     4. Student truancy detection in `GuruJurnal.tsx` (Piket marks Hadir, Mapel marks Alpa, truancy badge & audit entry).
     5. Kurikulum Merdeka Capaian Pembelajaran calculations in `GradebookView.tsx` & Wali Kelas "Rapor" menu in `AppScreen.tsx`.
   - Run `npx tsc --noEmit`.
   - Run `npm test`.
   - Run `npx tsx tests/e2e/run_all_e2e.ts`.
   - Run `npm run build`.
   - Execute git workflow per GEMINI.md (`git status`, `git add .`, `git commit`, `git push origin main`).
2. Dispatch Reviewer & Challenger for Milestone 5:
   - Review E2E test coverage, robustness, assertions, and build status.
   - Challenge edge cases and runtime behavior.
3. Dispatch Final Victory Forensic Auditor:
   - Complete integrity audit across all 5 milestones.
4. Gate Check & Hand-off:
   - Hand off to Sentinel (`e9f5d453-8b8b-44c0-a7ca-400062f27727`).
   - Deliver human report.
