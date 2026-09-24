# Dispatch: Explorer M4

## Identity
- Role: teamwork_preview_explorer
- Assigned Scope: Milestone 4 Investigation (F12, F13, F14, F15)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m4_1\
- Parent Orchestrator: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\

## Mandatory Context
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md

## Objectives
Explore the codebase and provide a concrete, step-by-step implementation plan for Milestone 4 features:
1. **F12: Keterlambatan Accumulation Calculation Fix**
   - Inspect `src/components/HomeView.tsx` (how late minutes/hours are calculated and displayed in the teacher dashboard).
   - Verify selection of `timestamp` from `presensi_guru`.
   - Identify how records are filtered for current month in WITA timezone.
   - Verify that rejected records (`status_verifikasi === 'Ditolak'`) are excluded.
   - Formulate exact calculation for `keterlambatan_detik`, minutes, hours, and badge/alpa deduction.
2. **F13: Camera Switch facingMode Fix**
   - Inspect `src/components/CameraSelfieCapture.tsx`.
   - Diagnose the camera switch bug (switching between front/environment camera causes freeze, black screen, or race condition).
   - Identify interaction between `toggleFacingMode` and `useEffect`.
   - Propose mutex lock (`isStartingRef`), clean track stop (`track.stop()`), and hardware release delay (~100-200ms) for iOS Safari and mobile browsers.
3. **F14: Teacher Username & Password Change Option**
   - Inspect `src/components/AccountSettingsModal.tsx`, `src/components/AppScreen.tsx`, and `src/components/HomeView.tsx`.
   - Investigate how teachers can access this modal (e.g. user profile button / header action).
   - Check Supabase RPC (`update_user_profile` or auth API) and how teacher credentials in `users` / `data_guru` are updated.
4. **F15: Master Menus Search Bar & Column Dropdown Filters**
   - Inspect `src/components/AdminDataView.tsx`.
   - Check all 6 tabs: Siswa, Guru, Mapel, Kalender, Jadwal, Wali Kelas.
   - Check existing search bar implementation.
   - Identify appropriate column dropdown filters for each tab (e.g., Siswa: Kelas/Jurusan; Guru: Status/Mapel; Mapel: Tingkat/Jurusan; Kalender: Jenis/Bulan; Jadwal: Hari/Kelas; Wali Kelas: Kelas).
   - Plan reactive filtering logic combining general search query AND column dropdown selections.

## Output
Write a comprehensive investigation report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m4_1\handoff.md`.
Notify parent orchestrator via `send_message`.
