# Task Assignment: Test Writer Milestone 5 (Comprehensive Verification Suite)

## Identity
- Archetype: teamwork_preview_test_writer
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_test_writer_m5
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Objective
Write and execute a comprehensive automated test suite (e.g. using `tsx` or Vitest/Jest) that strictly verifies all 6 Acceptance Criteria from `ORIGINAL_REQUEST.md`:
1. **R1 (Merge Account)**:
   - File `merge_accounts.sql` exists at project root.
   - Contains UPDATE queries to re-assign foreign keys across tables.
   - Contains DELETE queries to remove duplicate accounts.
   - Verifies primary account integrity.
2. **R2 (Avatar)**:
   - `renderUserAvatar` handles data URLs (`data:image/*`) and image URLs.
   - `AccountSettingsModal.tsx` contains file upload input and updates React state immediately via `onUserUpdated` upon success without requiring reload.
   - `HomeView.tsx` and `AppScreen.tsx` render user avatar instead of static icons.
3. **R3 (Izin Terlambat)**:
   - `GuruPresensi.tsx` option has `value="Izin Terlambat"`.
   - Backend endpoint `/api/attendance` receives and stores status "Izin Terlambat".
4. **R4 (Upload Jurnal GPS)**:
   - `GuruJurnal.tsx` calls `navigator.geolocation.getCurrentPosition` inside the gallery upload flow.
   - Payload submitted to backend/database includes `latitude` and `longitude`.
   - UI views (`AdminVerifView`, `RekapJurnalView`) display location.
5. **R5 (Username Edit Limit)**:
   - Form edit username in `AccountSettingsModal.tsx` checks `role === 'admin'` (or normalized admin role check).
   - If not admin, the field is disabled / locked.
   - Backend guard in `update_user_profile` RPC prevents teachers from altering their username.
6. **R6 (Pengaturan Sekolah)**:
   - `SuperadminView.tsx` form Edit Sekolah has input for Journal Mode (`camera_only` vs `camera_upload`).
   - `GuruJurnal.tsx` reads school configuration and renders the file upload input ONLY IF the configuration allows it (`mode_jurnal !== 'camera_only'`).

## Execution & Verification
- Execute your test suite via `npx tsx tests/all_requirements_r1_r6_verification.test.ts`.
- Ensure all tests pass (0 failures).
- Verify typecheck: `npx tsc --noEmit`.
- Verify production build: `npm run build`.
- Write your comprehensive test results to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_test_writer_m5\handoff.md`.
- Report back via `send_message` to orchestrator_6.

## 2026-10-01T11:30:20Z
You are assigned as Test Writer Milestone 5. Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_test_writer_m5\DISPATCH.md, PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md, and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.

Write tests/all_requirements_r1_r6_verification.test.ts verifying all 6 acceptance criteria for R1-R6.
Run the tests (e.g. npx tsx tests/all_requirements_r1_r6_verification.test.ts), run npx tsc --noEmit, and run npm run build.
Document all commands and passing outputs in handoff.md, and notify orchestrator_6 via send_message when done.
