# Orchestration Plan — Teacher Account Comprehensive Updates

## Objective
Implement all teacher account updates across R1, R2, R3, R4 and satisfy all Acceptance Criteria (including tests in `tests/e2e/`, Kurikulum Merdeka tests, Piket concurrency test, truancy detection test, clean build, and git commit/push).

## Strategy & Phasing
- **Phase 0: Survey (3 Explorers in parallel)**
  - Explorer 1: R1 (UI/UX, 30-min notification snooze, print orientation removal, 4:3 camera ratio, Google Drive optimization/upload, responsiveness) & existing notification/camera code.
  - Explorer 2: R2 (Teacher attendance multi-state "Hadir di Sekolah" vs "Dinas Luar", auto-checkout flagging for forgotten checkout, sick >=3 days / leave >3 days admin approval routing, GPS auto-attachment to printed docs & alert).
  - Explorer 3: R3 & R4 (Student attendance role access, Piket/Wali Kelas to Mapel sync with truancy detection, concurrency locks for Piket forms, Kurikulum Merdeka academic calculations & Capaian Pembelajaran, Wali Kelas "Rapor" menu, in-app tutorial updates, and existing E2E/test infrastructure in `tests/e2e/`).
- **Phase 1: Milestone Decomposition & Scope Document Creation (`PROJECT.md`)**
  - M1: R1 UI/UX, Notification Snooze, Print Settings & Camera/Google Drive.
  - M2: R2 Teacher Attendance ("Hadir di Sekolah" vs "Dinas Luar", Auto-Checkout, Admin Approval routing, GPS on print).
  - M3: R3 Student Attendance, Piket Concurrency Lock & Truancy Detection Sync.
  - M4: R4 Kurikulum Merdeka Calculations, Wali Kelas Rapor Menu & In-app Tutorial.
  - M5: Acceptance Criteria Verification, Full E2E & Programmatic Test Suite Pass, Clean Build (`npm run build`, `npx tsc --noEmit`), and Git Workflow.
- **Phase 2: Execution via Worker-Reviewer-Challenger-Auditor Cycles**
- **Phase 3: Final Verification & Delivery to Sentinel**
