# Implementation Plan — orchestrator_15

## Overview
Decomposition into 3 structured milestones to deliver R1, R2, and R3 with full verification and zero regressions.

### Milestone 1: Modul Piket UI/State & QR Camera Fix (R1 & R2)
- Target file: `src/components/PiketView.tsx`
- Tasks:
  1. Fix "Tandai Datang" auto-filtering bug by removing `setManualSearchQuery` and `setManualKelasFilter` in `handleManualMark` (lines 592 & 617). All students remain visible after marking attendance.
  2. Implement Guru vs. Admin UI differentiation:
     - Guru: Compact, mobile-friendly layout, 1-tap attendance marking, hidden 10-kiosk selector and hidden 7-column raw audit log table.
     - Admin: Full kiosk controls, device selector, 3 large metric cards, 6-column roster with override/cancel, 7-column live audit log table.
  3. Fix QR Camera preview rendering:
     - Solve React conditional mounting timing bug using callback ref on `<video>` element + `useEffect` on `cameraActive` to assign `videoRef.current.srcObject = streamRef.current` and call `play()`.
     - Resilient constraints with fallback to `{ video: true, audio: false }` for webcams without environment camera.
     - Add `isStartingCameraRef` mutex to prevent rapid click races.
- Workers: 1 Worker (`teamwork_preview_worker`), 2 Reviewers, 2 Challengers, 1 Auditor.

### Milestone 2: Sidebar User Profile & Tutorial System (R3)
- Target files: `src/components/AppScreen.tsx`, `src/components/Tutorial/*`, `docs/PANDUAN_PENGGUNA.md`.
- Tasks:
  1. Add Sidebar User Profile Card displaying avatar (`renderUserAvatar`), user full name (`user?.nama`), color-coded role badge, and username.
  2. Build in-app comprehensive tutorial modal (`TutorialModal.tsx` & `tutorialData.ts`) covering all 28 menus for Guru (11), Admin (14), and Superadmin (3) with search, step-by-step instructions, and quick menu launch.
  3. Create complete user documentation guide in `docs/PANDUAN_PENGGUNA.md`.
  4. Preserve backward compatibility and existing tests (`tests/app_screen_integration.test.ts`, `tests/onboarding_and_ai_assistant_ui.test.ts`).
- Workers: 1 Worker, 2 Reviewers, 2 Challengers, 1 Auditor.

### Milestone 3: Full Verification, E2E Validation, Build & Git Sync
- Tasks:
  1. Run unit and integration tests across affected components.
  2. Verify all 5 acceptance criteria checklist items.
  3. Run `npx tsc --noEmit` and `npm run build`.
  4. Execute Git Workflow Rule (`git status`, `git add .`, `git commit -m "..."`, `git push origin main`).
  5. Send completion/victory report back to parent Sentinel.
