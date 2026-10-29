## 2026-10-29T11:34:24Z
You are an Explorer for Milestone 1: Dinas & Rekap Normalization Architecture.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_dinas_rekap\
Before starting work, YOU MUST read ORIGINAL_REQUEST.md located at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\spec_miner_survey\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_views_tests\handoff.md

Your task is to analyze and design the exact technical strategy to:
1. Examine `AdminRekapView.tsx`, its props (`isReadOnly`, `isKepalaSekolah`, `targetSchool`), and its current usage in `AppScreen.tsx` for `view-admin-rekap` and `view-rekap-guru`.
2. Detail how `view-rekap-guru` can be cleanly standardized to use `AdminRekapView` with `isReadOnly={true}` without duplicate component wrappers.
3. Prepare the sub-tab structure for Cluster 4 (`tab=analitik`, `tab=tabel`, `tab=cetak`) inside `AdminRekapView.tsx`:
   - What props need to be accepted (`initialTab?: string`).
   - How `AnalitikView` chart cards and Top 5 Leaderboard can be cleanly hosted in `tab=analitik`.
   - How table filters (month/custom date, workdays count, teacher search) and print layouts remain 100% intact.
4. Ensure AST regex checks in existing tests (e.g. `tests/kepsek_pengawas_rbac.test.ts` and `tests/dinas_pendidikan_monitoring.test.ts`) are preserved without any regression.

Write your comprehensive findings and blueprint to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_dinas_rekap\handoff.md
Update progress in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_dinas_rekap\progress.md
Send a completion message to the orchestrator (conversation ID: 095792d8-1a85-4945-889d-abf25d3c7740).
