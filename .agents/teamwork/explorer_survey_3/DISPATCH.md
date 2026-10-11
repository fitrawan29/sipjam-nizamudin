# Dispatch for explorer_survey_3

- **Role**: Explorer 3 — Nilai Akhir Calculation Formula, Absensi Integration, Rekap & Test Suite
- **Working Directory**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3
- **Authoritative Request**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see entry at 2026-10-10T22:56:05Z)
- **Parent Conversation ID**: 1f15a155-9441-412f-8adc-6ac5519d6f4d

## Objective
Analyze grade calculation, attendance integration, rekap semester, and testing strategy:
1. Trace existing score calculation in `src/components/GradebookView.tsx`: how averages, TP scores, semester recap, and weights are calculated.
2. Analyze the new formula requirements:
   - Nilai Akhir mapel = `(bobot_kehadiran * rata_kehadiran) + (bobot_formatif * rata_formatif) + (bobot_sumatif * rata_sumatif)`.
   - Default weights: Kehadiran 40%, Formatif 30%, Sumatif 30% (customizable by Admin, total must = 100%).
   - Asesmen Diagnostik does NOT count toward Nilai Akhir.
   - Diagnostik is limited to max 1 per TP (UI & validation check).
   - If no formatif or sumatif data exists, display '-' or null (no error / NaN).
3. Investigate how attendance (`absensi`) per mapel is queried and calculated for each student (e.g. total hadir vs total pertemuan for the mapel in the semester).
4. Check Semester Recap and Rapor integration, print, analytics, and ensure zero regressions.
5. Review existing tests in `tests/`, test commands (`npm test`), build (`npm run build`).
6. Output detailed report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md`.


## 2026-10-11T00:42:19Z
You are Explorer 3 (Grading Logic, Absensi & Testing Explorer) for project orchestrator_21.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3
Read your instructions in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\DISPATCH.md
Authoritative request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see entry at 2026-10-10T22:56:05Z)

Investigate score calculation formulas, attendance integration, and testing:
- Trace how scores are currently calculated in `src/components/GradebookView.tsx`.
- Design the new Nilai Akhir formula: `(bobot_kehadiran * rata_kehadiran) + (bobot_formatif * rata_formatif) + (bobot_sumatif * rata_sumatif)`.
- Verify rule: Diagnostik max 1 per TP, Diagnostik excluded from Nilai Akhir calculation.
- Investigate how attendance per mapel is queried from `absensi` table for each student.
- Trace Rekap Semester and Rapor data calculation to ensure formula applies without regressions.
- Examine existing test suites in `tests/`, test command execution, and test cases needed.
- Write your complete findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md` and message the orchestrator when finished.
