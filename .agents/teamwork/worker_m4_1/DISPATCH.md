# Dispatch: Worker M4

## Identity
- Role: teamwork_preview_worker
- Assigned Scope: Milestone 4 Implementation (F12, F13, F14, F15)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m4_1\
- Parent Orchestrator: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\

## Mandatory Context
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md
- M4 BLUEPRINT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m4_1\handoff.md

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Git Workflow Rule (GEMINI.md)
Every time you complete code modifications:
1. `git status`
2. `git add .`
3. `git commit -m "..."`
4. `git push origin main` (or active branch) automatically without asking.

## Next.js Rules (AGENTS.md)
Follow Next.js App Router rules and conventions.

## Action Plan (Implement F12, F13, F14, F15 per Explorer M4 handoff.md)

1. **F12: Keterlambatan Accumulation Fix (`src/components/HomeView.tsx`)**:
   - In `fetchAttendanceStats` (lines 111–165):
     - Select `timestamp, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, status_verifikasi, sekolah_id`.
     - Filter current month in WITA timezone supporting both ISO (`YYYY-MM`) and slash (`M/D/YYYY`) date formats.
     - Exclude rejected records (`p.status_verifikasi === 'Ditolak'`).
     - Sum `totalDetik += Number(p.keterlambatan_detik) || 0`.
     - Set `setAkumulasiTelat({ detik: totalDetik, alpa: Math.floor(totalDetik / 14400) })`.

2. **F13: Camera Switch facingMode Fix (`src/components/CameraSelfieCapture.tsx`)**:
   - Add `isStartingRef = useRef(false)`.
   - In `startCamera`: call `stopCamera()`, add `await new Promise(r => setTimeout(r, 150))` for hardware release, add `OverconstrainedError` fallback, set `playsinline` and `webkit-playsinline` on video.
   - In `toggleFacingMode`: mutex guard, set facingMode, call `startCamera(nextMode)`.
   - Decouple `useEffect` from `facingMode` (run only on mount).

3. **F14: Teacher Username & Password Change (`AccountSettingsModal.tsx`, `AppScreen.tsx`, `HomeView.tsx`)**:
   - In `src/components/AccountSettingsModal.tsx`: enforce `newPassword.length < 6` with message `'Password baru minimal 6 karakter.'`.
   - In `src/components/AppScreen.tsx`: import `AccountSettingsModal`, add `isAccountModalOpen` state, add user account gear button in header and sidebar, pass `onOpenAccountSettings` to `HomeView`, and render `<AccountSettingsModal>`.
   - In `src/components/HomeView.tsx`: accept `onOpenAccountSettings?: () => void` prop, add "Edit Akun" button in teacher header banner.

4. **F15: Master Menus Search Bar & Column Dropdown Filters (`src/components/AdminDataView.tsx`)**:
   - Add filter state: `filter1`, `filter2`.
   - Reset filters on tab change.
   - Derive unique values dynamically from `dataList`:
     - `Data_Siswa`: Kelas, Status
     - `Data_Guru`: Status, Mapel
     - `Data_Mapel`: Kategori / Kelompok
     - `Kalender_Pendidikan`: Tipe, Bulan
     - `Jadwal_Pelajaran`: Hari, Kelas
     - `Wali_Kelas`: Kelas, Tahun Ajaran
   - Update `filteredList` to apply an AND conjunction between `search` query and active column filters.
   - Render dropdown filter `<select>` controls beside/above search bar with a "Reset Filter" button.

5. **Test & Verification**:
   - Run `npm run test:e2e` (Tiers 1-4, 186 assertions).
   - Run `npm test`.
   - Run `npx tsc --noEmit`.
   - Run `npm run build`.

6. **Git commit and push per GEMINI.md**:
   - Commit message: `feat(m4): implement late accumulation fix, camera switch fix, teacher account settings, and master column filters (F12-F15)`

7. **Handoff**:
   - Write comprehensive `handoff.md` and notify parent via `send_message`.

## 2026-09-24T17:13:04Z
User Request received:
Worker M4 working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m4_1\
Tasks:
1. Implement F12: Keterlambatan accumulation calculation fix in src/components/HomeView.tsx.
2. Implement F13: Camera switch facingMode bug fix in src/components/CameraSelfieCapture.tsx.
3. Implement F14: Teacher username & password change option in src/components/AccountSettingsModal.tsx, AppScreen.tsx, and HomeView.tsx.
4. Implement F15: Master menus search bar and column dropdown filters in src/components/AdminDataView.tsx.
5. Run npm run test:e2e (must pass 186/186 tests).
6. Run npm test, npx tsc --noEmit, and npm run build.
7. Stage, commit, and push to origin per GEMINI.md.
8. Write handoff.md in your working directory and notify parent with send_message.
