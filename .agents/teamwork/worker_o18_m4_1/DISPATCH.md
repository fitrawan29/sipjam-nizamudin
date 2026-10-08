# DISPATCH: worker_o18_m4_1

## Task
Implement the robust algorithmic fix for `generateKurikulumMerdekaDeskripsi` in `src/components/GradebookView.tsx` based on Explorer consensus, resolving all 8 failing adversarial checks while preserving all 14 existing M4 tests.

## Mandatory Inputs (MUST READ FIRST)
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (header ## 2026-10-08T11:11:29Z)
- Project Scope: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- Explorer 1 Handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o18_m4_1\handoff.md
- Explorer 2 Handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o18_m4_2\handoff.md
- Explorer 3 Handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o18_m4_3\handoff.md
- Challenger 1 Handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o18_m4_1\handoff.md

## Write Ownership
- You exclusively own: `src/components/GradebookView.tsx` (lines 20-82).
- Do NOT modify other source files unless strictly necessary for compatibility.

## Implementation Details
In `src/components/GradebookView.tsx`, update `generateKurikulumMerdekaDeskripsi` to:
1. Coerce scores with `typeof t.score === 'string' ? parseFloat(t.score) : Number(t.score)`, safely filter out null/undefined/empty string/NaN/Infinity, and clamp to $[0, 100]$.
2. Compute `finalScore` with `.toFixed(1)`.
3. In narrative generation:
   - Helper `sanitizeDeskripsi`: fallback to `item.kode` or `'capaian pembelajaran'` if `item.deskripsi` is empty or whitespace.
   - `isAllLow = highest.score < 70`
   - `isAllHigh = lowest.score >= 85 || (lowest.score >= 84.95 && finalScore >= 85)`
   - Branch order:
     a. `if (isAllLow)`: emit remedial guidance text (`Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowestDesc}.`).
     b. `else if (isAllHigh || sorted.length === 1)`: emit mastery text (`Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}.`).
     c. `else if (highest.score === lowest.score || highestDesc === lowestDesc)`: emit uniform text (`Menunjukkan penguasaan yang baik dan merata dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}.`).
     d. `else`: emit dual strength and guidance text (`Menunjukkan penguasaan yang baik dalam ${highestDesc}, namun perlu bimbingan dan peningkatan dalam ${lowestDesc}.`).

## Required Verification Runs
Run and document results:
- `npx tsc --noEmit`
- `npx tsx tests/adversarial_kurikulum_merdeka_cp.test.ts` (MUST pass 26 / 26)
- `npx tsx tests/adversarial_rapor_wali_security.test.ts` (MUST pass 28 / 28)
- `npx tsx tests/m4_academic_merdeka_rapor.test.ts` (MUST pass 14 / 14)
- `npm test`
- `npm run build`

## Mandatory Git Workflow (GEMINI.md)
Upon completing modifications and tests passing:
1. `git status`
2. `git add .`
3. `git commit -m "fix(academic): harden kurikulum merdeka cp calculation narrative and score clamping"`
4. `git push origin main`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
