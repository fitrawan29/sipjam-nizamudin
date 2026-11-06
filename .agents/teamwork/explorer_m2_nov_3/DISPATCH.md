## 2026-11-06T23:26:35Z
You are explorer_m2_nov_3.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_3\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Prior Survey Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_2\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first.

Your mission is to produce an exact implementation blueprint for:
Requirement R3 - Part 3: Invariant Preservation, Dirty Grades Safeguards & Dedicated Unit Test Design:
1. **Preserve Existing Unit Test Invariants**:
   - Inspect `tests/gradebook_teacher_filter_ponytail.test.ts`.
   - Verify all required symbols and string signatures:
     - `export function isTeacherMatch`
     - `export function isAssignmentMatchTeacher`
     - `onChange={e => handleSelectGuru(e.target.value)}`
     - `'Tidak ada mapel ditugaskan'`
     - `'Tidak ada kelas ditugaskan'`
   - Ensure none of these functions, exports, or strings are broken.
2. **Dirty Grades Safeguards**:
   - Review `handleSelectGuru`, `handleSelectMapel`, `handleSelectKelas`.
   - Verify `dirtyGrades` check and `window.confirm('Terdapat perubahan nilai yang belum disimpan...')` prompt before switching selections.
3. **Dedicated Test Suite Specification**:
   - Design an automated unit test suite (`tests/gradebook_cascading_selection.test.ts`) that verifies:
     a. Admin mode requires selecting teacher first (`selectedGuru === ''` renders prompt and disables Mapel/Kelas selects).
     b. Selecting a teacher dynamically cascades available Mapel.
     c. Selecting a Mapel dynamically cascades Kelas strictly following that subject's assignment and grade level (`parseTingkat`), proving zero cross-grade leakage.
     d. Invariants and non-admin read-only mode remain intact.

Detail the exact code diffs and test file blueprint in your report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_3\handoff.md`.
Maintain `progress.md` in your working directory.
When finished, notify orchestrator via send_message.
