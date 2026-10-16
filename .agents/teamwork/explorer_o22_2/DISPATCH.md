## 2026-10-16T11:34:11Z
You are explorer_o22_2.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o22_2
Caller/Parent ID: b8a13b7c-6c39-493c-96de-cd823a6f72d9

MANDATORY FIRST STEP:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.

TASK:
Survey the codebase for Feature R2: Auto-Save Draft Lokal & Ketahanan Koneksi Lemah (GradebookView & GuruJurnal).
Specifically investigate:
1. `src/components/GradebookView.tsx` - inspect how `localScores` and grade state are maintained, how user inputs are handled, how "Simpan Semua Nilai" works, and how to implement debounced auto-save to localStorage using key `sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}`. Where should the "Draft Lokal Tersimpan" indicator be shown? When should draft be cleared?
2. `src/components/GuruJurnal.tsx` - inspect how journal form state is held, how submission handles errors or offline status (`!navigator.onLine`), how to preserve draft in localStorage on failure/offline, and where to show the draft status indicator.
3. Check existing localStorage usage, debounce patterns, or helpers in the project.
4. Outline exact minimal changes needed to implement R2 cleanly with zero bloat.

CONSTRAINTS:
- You are read-only! DO NOT modify any code.
- Write your findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o22_2\survey_report.md` and `handoff.md`.
- When finished, send a message to b8a13b7c-6c39-493c-96de-cd823a6f72d9 with your summary.
