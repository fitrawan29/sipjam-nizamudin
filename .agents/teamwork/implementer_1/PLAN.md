# Implementation Plan - Milestone 2

## Implementation Plan

### R3: Attendance UI Consolidation (GuruPresensi.tsx)
- Merge the two separate UI sections for "presensi datang" and "presensi pulang" into a unified card interface.
- Use conditional rendering based on current `dailyState` and `tipeAbsen` state.

### R1: Attendance Logic Improvements (GuruPresensi.tsx & presensiIntervensi.ts)
- Update `handlePresensiSubmit` in `GuruPresensi.tsx` to handle "sakit", "izin", "dinas luar" for "presensi pulang".
- Implement backend logic or helper functions to automate "alpa" if presensi not done by deadline.
- Implement automation for "pulang cepat" if "presensi pulang" not done by the scheduled time.

### R6: Daftar Nilai Fixes (GradebookView.tsx)
- Modify `GradebookView.tsx` to allow editing of presensi sesi even if no KBM journal exists.
- Locate and remove the strict journal check dependency in the update/edit handler.

### Verification Method
- Run `npm run test` (existing tests + new verification tests).
- Manually verify UI updates in development mode.
