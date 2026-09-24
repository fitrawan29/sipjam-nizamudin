## 2026-09-24T21:39:41Z
You are Worker M4.3 (`worker_m4_3`).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m4_3

## Objective
Verify, harden if necessary, test, and commit Milestone 4 enhancements (F12, F13, F14, F15) for SIPJAM:
1. **F12: Keterlambatan Accumulation Fix**:
   - `src/components/HomeView.tsx`: Verify `fetchAttendanceStats` selects `timestamp` and `status_verifikasi`, parses WITA current month across multiple formats (ISO and slash), excludes records where `status_verifikasi === 'Ditolak'`, sums `keterlambatan_detik`, and calculates alpa deduction (`Math.floor(totalDetik / 14400)`).
2. **F13: Camera Switch facingMode Fix**:
   - `src/components/CameraSelfieCapture.tsx`: Verify `toggleFacingMode` and `startCamera` have a mutex guard (`isStartingRef`), clean track stop, hardware release pause (~150ms), decoupled `useEffect` so `facingMode` changes do not re-trigger double `getUserMedia` calls, and `playsInline` video attributes.
3. **F14: Teacher Username & Password Change Option**:
   - `src/components/AccountSettingsModal.tsx`: Verify minimum password length is 6 characters.
   - `src/components/AppScreen.tsx`: Expose Account Settings button in header top bar and sidebar drawer for teachers/users.
   - `src/components/HomeView.tsx`: Expose Edit Akun button in teacher header banner.
4. **F15: Master Menus Search Bar & Column Dropdown Filters**:
   - `src/components/AdminDataView.tsx`: Verify responsive dropdown filters for each of the 6 tabs (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`) with AND conjunction filtering alongside text search, and reset filter capability.

## Test Verification
- Inspect/create comprehensive automated tests in `tests/m4_features_verification.test.ts` covering F12, F13, F14, and F15 thoroughly.
- Run tests:
  - `npm test`
  - `npm run test:e2e` (must achieve 186/186 pass rate)
  - `npx tsc --noEmit`
  - `npm run build`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Git Workflow (GEMINI.md)
Upon completing modifications and verifying tests pass:
1. `git status`
2. `git add .`
3. `git commit -m "feat(m4): implement and verify F12-F15 keterlambatan accumulation, camera switch, teacher account settings, and master data filters"`
4. `git push origin main` (or active branch)

## References & Inputs
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_3\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m4_1\handoff.md`

Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m4_3\handoff.md`
