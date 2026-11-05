## 2026-11-05T15:03:32Z
You are worker_o27_m1. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m1\

MANDATORY: Read the authoritative request before starting work:
- Path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Project scope: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Investigation findings: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o27_1\report.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o27_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope of Milestone M1:
You have exclusive write ownership over:
- src/components/HomeViewAdmin.tsx
- src/components/AdminRekapView.tsx

Tasks to implement:
1. R1 (Dashboard Operasional):
   - In `src/components/HomeViewAdmin.tsx` (around lines 539-550): Fix duplicate school name. If `user.nama` already contains the school name (e.g. "SMA NIZAMUDIN"), do not duplicate "SMA NIZAMUDIN" below it. Only render the school name if not already in `user.nama`.
   - In `src/components/HomeViewAdmin.tsx` (around lines 691-722): Completely eliminate the "Pusat Informasi" (Informasi & Pengumuman Sekolah) card section from the operational dashboard.

2. R3 (Laporan Analitik Kerja):
   - In `src/components/AdminRekapView.tsx`: In the rekapitulasi table (`pMap` / `pArr`), fix duplicate entry for teacher "Ade Fitrawan Ibrahim". Strip academic degrees from "Ade Fitrawan Ibrahim, M.Pd., Gr." and canonicalize to "Ade Fitrawan Ibrahim". Merge attendance statistics from both entries into a single row with name "Ade Fitrawan Ibrahim" (without title/degree) so only one row appears in the table.

Verification requirements:
- Run `npx tsc --noEmit` to verify 0 type errors.
- Run `npm test` to ensure existing tests pass.
- Write your completion report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m1\handoff.md`.
- Send a completion message to parent when finished.
