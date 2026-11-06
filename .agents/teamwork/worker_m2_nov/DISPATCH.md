## 2026-11-06T23:34:15Z
You are worker_m2_nov.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_nov\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

Read ORIGINAL_REQUEST.md and PROJECT.md first.

Read the 3 detailed implementation blueprints provided by our explorers:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_1\handoff.md (Teacher First selection, dropdown placeholders, empty-state card)
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_2\handoff.md (Cascading filters, parseTingkat, getSubjectTingkat, strict grade-level matching)
3. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_3\handoff.md (Invariant preservation, dirty check, and proposed test suite at proposed_gradebook_cascading_selection.test.ts)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your scope of implementation (Files you own exclusively):
- `src/components/GradebookView.tsx`
- `tests/gradebook_cascading_selection.test.ts`

Detailed Tasks to implement:
1. **Teacher First Selection & Empty State in `src/components/GradebookView.tsx`**:
   - Initialize `selectedGuru` state: `const [selectedGuru, setSelectedGuru] = useState<string>(isAdmin ? '' : (user?.nama || ''));`.
   - In `fetchMasterAssignments` (lines 962–978): When `isAdmin`, do NOT auto-select `teachers[0]?.nama_guru`. Only auto-select for non-admin `user?.nama`.
   - In Guru dropdown (lines 2700–2726): Add `<option value="">-- Pilih Guru Pengampu --</option>`.
   - In Mapel dropdown (lines 2728–2748): If `!selectedGuru`, disable the select (`disabled={!selectedGuru}`) and show `<option value="">-- Pilih guru pengampu terlebih dahulu --</option>`, while preserving the invariant fallback `<option value="">Tidak ada mapel ditugaskan</option>`.
   - In Kelas dropdown (lines 2750–2770): If `!selectedGuru || !selectedMapel`, disable the select (`disabled={!selectedGuru || !selectedMapel}`) and show `<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>`, while preserving the invariant fallback `<option value="">Tidak ada kelas ditugaskan</option>`.
   - In Workspace Area (lines 2813 & 4875): When `isAdmin && !selectedGuru`, render the attractive Clay-styled empty state prompting: "Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai."
   - Non-admin mode (Guru) must remain untouched (read-only badge scoped to `user.nama`).

2. **Cascading Filters & Strict Grade-Level Matching**:
   - Add exported helpers `parseTingkat(nama)` and `getSubjectTingkat(mapelName, mapelsList)`.
   - In `syncTeacherAssignments`:
     * If `isAdmin && !targetGuruName`, clear selections and return immediately.
     * When teacher is selected, filter assignments strictly to that teacher.
     * Mapel dropdown populates that teacher's distinct assigned subjects.
     * Classes strictly follow `activeMapel`.
     * Extract `targetTingkat` from `activeMapel` using `getSubjectTingkat`. Filter all matching classes and fallbacks so that if a subject belongs to a grade level (e.g. Class XI), ONLY classes matching that grade level (`parseTingkat(kelas) === targetTingkat`) are returned. Zero class leakage across grade levels!
   - In `handleSelectGuru`:
     * Preserve `dirtyGrades` check and `window.confirm`.
     * If `!newGuru`: Reset all downstream state (`selectedMapel = ''`, `selectedKelas = ''`, `mapelList = []`, `kelasList = []`).
     * If valid: Call `syncTeacherAssignments(newGuru, ..., '', '')` with sanitized prefMapel/prefKelas.
   - In `handleSelectMapel`:
     * Preserve `dirtyGrades` check and `window.confirm`.
     * If `!newMapel`: Reset `selectedMapel = ''`, `selectedKelas = ''`, `kelasList = []`.
     * If valid: Filter classes strictly for `newMapel` matching `targetTingkat`. Reset `selectedKelas` to first valid class or `''`.
   - Preserve all AST invariants tested in `tests/gradebook_teacher_filter_ponytail.test.ts` and `tests/mata_pelajaran_kelas_paralel_isolation.test.ts` (`isTeacherMatch`, `isAssignmentMatchTeacher`, `stillTeaches`, `currentClassValid`, `onChange={e => handleSelectGuru(e.target.value)}`).

3. **Dedicated Test Suite Implementation**:
   - Implement `tests/gradebook_cascading_selection.test.ts` (adapting from `explorer_m2_nov_3/proposed_gradebook_cascading_selection.test.ts`).

4. **Verification & Git Push**:
   - Run `npx tsc --noEmit` (must have 0 errors).
   - Run `npx tsx tests/gradebook_cascading_selection.test.ts`.
   - Run `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts`.
   - Run `npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts`.
   - Check `git status`, stage files with `git add .`, commit with descriptive message `feat(gradebook): implement hierarchical teacher-subject-class cascading selection with strict grade-level isolation`, and push directly to `git push origin main`.
