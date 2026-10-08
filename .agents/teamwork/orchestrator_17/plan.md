# Orchestration Plan — Orchestrator 17

## Overview
Orchestrator 17 continues from Orchestrator 16, concluding Milestone 2 and sequentially executing Milestone 3, Milestone 4, and Milestone 5 to deliver the complete, verified teacher account update for SIPJAM.

---

## Phases & Milestones

### Phase 2: Milestone 2 Conclusion (R2 Teacher Attendance & Admin Routing)
- **Status**: IN_PROGRESS
- **Scope**:
  - `public.presensi_guru` database migration (`supabase/migrations/20261008_m2_presensi_guru_approval_autocheckout.sql`) & types (`src/types/database.ts`)
  - Multi-state attendance flow ("Hadir di Sekolah" <-> "Dinas Luar") in `GuruPresensi.tsx` & `workflow.ts`
  - Auto-checkout evaluation in `attendanceAlpa.ts` & warning banner in `GuruPresensi.tsx`
  - Admin approval routing badges for sick (>=3 days) & leave (>3 days) in `AdminVerifView.tsx`
  - GPS coordinates auto-attached to `PrintHeader.tsx` footer via `printWithGps.ts` with SweetAlert alert on permission block
  - Tests in `tests/m2_teacher_attendance_verification.test.ts`
- **Execution Steps**:
  1. Dispatch `teamwork_preview_worker` (`worker_o17_m2`) to verify, run test suite (`tsc`, `npm test`, `m2 test`, `npm run build`), commit & push to git.
  2. Dispatch 2 parallel Reviewers (`reviewer_o17_m2_1`, `reviewer_o17_m2_2`).
  3. Dispatch 2 parallel Challengers (`challenger_o17_m2_1`, `challenger_o17_m2_2`).
  4. Dispatch Forensic Auditor (`auditor_o17_m2_1`).
  5. Gate evaluation -> If ALL PASS, mark M2 DONE in `PROJECT.md`.

---

### Phase 3: Milestone 3 (R3 Student Attendance RBAC, Gate-Mapel Truancy Sync, Piket Concurrency Lock)
- **Status**: PLANNED
- **Scope**:
  - Strict RBAC: Mapel limited to session roll-call, Wali Kelas locked to assigned class, Piket active only on duty days.
  - Concurrency lease lock `src/lib/piketLock.ts` and `PiketView.tsx` integration with heartbeat.
  - Gate-to-Mapel sync with automated truancy detection in `GuruJurnal.tsx` (`piketAttendance` present & `absensi === 'A'`) with UI alert badge and audit logging.
  - Verification test `tests/m3_student_attendance_piket_lock.test.ts`.
- **Execution Steps**:
  1. Dispatch `teamwork_preview_worker` (`worker_o17_m3`).
  2. Dispatch Reviewers, Challengers, and Forensic Auditor.
  3. Gate evaluation -> Mark M3 DONE.

---

### Phase 4: Milestone 4 (R4 Kurikulum Merdeka Calculations, Wali Kelas Rapor Menu, In-app Tutorials)
- **Status**: PLANNED
- **Scope**:
  - Kurikulum Merdeka Capaian Pembelajaran narrative generator in `GradebookView.tsx`.
  - Wali Kelas "Rapor" menu in `AppScreen.tsx` with role guard and dynamic mounting.
  - Tutorial updates in `tutorialSteps.ts` and `tutorialData.ts`.
  - Verification test `tests/m4_academic_merdeka_rapor.test.ts`.
- **Execution Steps**:
  1. Dispatch `teamwork_preview_worker` (`worker_o17_m4`).
  2. Dispatch Reviewers, Challengers, and Forensic Auditor.
  3. Gate evaluation -> Mark M4 DONE.

---

### Phase 5: Milestone 5 (E2E Test Suites in `tests/e2e/`, Acceptance Criteria Verification, Clean Build, Git Delivery)
- **Status**: PLANNED
- **Scope**:
  - Update `tests/e2e/` (Tiers 1-4) verifying all 5 Acceptance Criteria.
  - Full verification: `npm test`, `npm run test:e2e`, `npx tsc --noEmit`, `npm run build`.
  - Git commit & push.
  - Forensic audit & Victory preparation.
  - Handoff & notify Sentinel (`e9f5d453-8b8b-44c0-a7ca-400062f27727`).
