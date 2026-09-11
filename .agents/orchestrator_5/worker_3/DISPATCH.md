## 2026-09-12T05:47:19Z
You are Worker 3 (teamwork_preview_worker).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\worker_3

Read the authoritative user request at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
Also refer to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\SCOPE.md
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\explorer_3\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files You Own Exclusively:
- `src/lib/workflow.ts`
- `src/components/HomeView.tsx`
- `src/app/page.tsx`
- `src/components/GuruPresensi.tsx`
- `src/components/HistoryView.tsx`

Your Tasks:
1. Requirement R4:
   - In `src/lib/workflow.ts`:
     - Export `findJadwalForGuru` and `isJurnalMatchJadwal`.
     - In `getGuruDailyState`: do NOT clear or suppress `state.jadwalKBM` when `isDinasLuar` is true. Ensure `jadwalKBM` is always populated for the current day.
   - In `src/components/HomeView.tsx`:
     - Render the Daily Teaching Schedule widget on `HomeView.tsx` for the logged-in teacher (`dailyState.jadwalKBM`).
     - Display today's teaching schedule clearly: class badges, subject names, meeting status (indicate whether journal was already filled today using `dailyState.jurnalKBM` with `isJurnalMatchJadwal` or link to `view-guru-jurnal` to fill it).
     - Include loading state, empty state for weekend/Sundays or when no schedule exists for today.

2. Requirement R5:
   - In `src/app/page.tsx`:
     - Wrap `JSON.parse(localStorage.getItem('sipjam_user'))` in a try-catch block with fallback cleanup so malformed data never crashes the app.
   - In `src/components/GuruPresensi.tsx`:
     - Normalize hour and minute calculation to WITA (`Asia/Makassar`) instead of machine local time.
   - In `src/components/HistoryView.tsx`:
     - Fix pagination `useEffect` flickering.

3. Validation & Verification:
   - Run `npx tsc --noEmit` to verify 0 type errors.
   - Ensure all affected components compile and render cleanly.

4. Execute Git Workflow (per GEMINI.md):
   - git status
   - git add .
   - git commit -m "feat(home,fix): implement R4 daily schedule widget and R5 codebase stabilization"
   - git push origin main

Write your completion and handoff report to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\worker_3\handoff.md
Update progress.md and send a message with your report path when done.
