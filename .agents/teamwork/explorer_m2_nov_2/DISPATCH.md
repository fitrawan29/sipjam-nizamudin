## 2026-11-06T23:26:28Z
You are explorer_m2_nov_2.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Prior Survey Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_2\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first.

Your mission is to produce an exact implementation blueprint for:
Requirement R3 - Part 2: Hierarchical / Cascading Filters & Strict Grade-Level Matching in `src/components/GradebookView.tsx`:
- Inspect `syncTeacherAssignments` (lines 328–411) and `handleSelectGuru` / `handleSelectMapel` / `handleSelectKelas` (lines 440–493):
  1. Once a teacher is chosen, dynamically populate the Mapel dropdown with that teacher's assigned subjects (`formattedMapels`).
  2. Once a subject is chosen, dynamically filter classes assigned to that teacher for that specific subject (`m.nama_mapel === selectedMapel`).
  3. **Strict Grade-Level (Tingkat) Matching**:
     - Prevent class leakage across grade levels!
     - In `syncTeacherAssignments` lines 395–403, if `matchingClasses` is empty, currently it falls back to `fallbackClasses` (`masterClassesList`), leaking classes from other grades (e.g. grade X or XII classes into grade XI subjects).
     - Incorporate grade-level detection: Extract `targetTingkat` from `selectedMapel` (e.g., using `parseTingkat(selectedMapel)` or `data_mapel.kategori` / regex e.g. `'XI'` -> `'11'`, `'X'` -> `'10'`, `'XII'` -> `'12'`).
     - Any fallback or available classes for that subject must be strictly filtered by:
       `targetTingkat ? parseTingkat(kelas) === targetTingkat : true`.
       For example, if the subject is in class XI, the classes displayed MUST strictly be class XI classes (e.g., `XI Merdeka`, `XI A`, etc.), and never show grade X or XII classes.
  4. State Sanitization: When the teacher is changed in `handleSelectGuru`, reset `selectedMapel = ''` and `selectedKelas = ''` (or select the first subject only if appropriate, but ensure downstream classes follow that exact subject).

Detail the exact code diffs, line references, and functions in your report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_2\handoff.md`.
Maintain `progress.md` in your working directory.
When finished, notify orchestrator via send_message.
