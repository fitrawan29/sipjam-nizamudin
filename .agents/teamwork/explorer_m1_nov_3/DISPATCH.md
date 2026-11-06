## 2026-11-06T22:42:18Z
You are explorer_m1_nov_3.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_3\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Prior Survey Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_1\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first.

Your mission is to produce an exact, actionable technical implementation blueprint for:
1. **Verifikasi Perangkat Kelas X Mata Pelajaran Resolution in `src/components/DokumenView.tsx`**:
   - Resolve Class X subjects specifically instead of falling back to `'Mata Pelajaran Umum'`.
   - Implement tokenized/fuzzy teacher name matching (`Ade` <-> `Ade Fitrawan Ibrahim`) when checking `guru_mapel` and `jadwal_pelajaran`.
   - Connect teacher assignments with `jadwal_pelajaran` and `data_mapel` (e.g. leveraging `connectGuruMapelWithJadwal` from `src/lib/workflow.ts` or direct tokenized schedule resolution).
   - Ensure Class X subjects (such as Matematika, Informatika, Fisika, Biologi, etc. for class X) are displayed with their specific subject names and class identifiers.
   - Eliminate the default fallback to `'Mata Pelajaran Umum'`.
2. **Pre-existing Compilation & Build Error Fixes**:
   - In `src/components/AdminVerifView.tsx`: Move `export function isRealSubmittedJournal(j: any)` outside the component function so `npx tsc --noEmit` and Turbopack build do not fail with `TS1184: Modifiers cannot appear here`.
   - In `src/components/HomeViewAdmin.tsx`: Fix `jurnalColor` assignment at line 529 (`'blue'` is not assignable to `'green' | 'amber' | 'rose' | 'gray'`) so TypeScript typecheck passes with 0 errors.

Detail the exact functions, line numbers, TypeScript types, and code diff blueprint in your report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_3\handoff.md`.
Maintain `progress.md` in your working directory.
When finished, notify the orchestrator via send_message.
