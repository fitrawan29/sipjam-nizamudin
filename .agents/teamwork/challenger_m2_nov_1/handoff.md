# HANDOFF REPORT — CHALLENGER VERIFICATION (MILESTONE M2)

**Agent**: `challenger_m2_nov_1`  
**Role**: EMPIRICAL CHALLENGER (critic, specialist)  
**Date**: 2026-11-06T23:54:00Z  
**Verdict**: **APPROVE**  
**Target Module**: `src/components/GradebookView.tsx`, `tests/adversarial_m2_teacher_first_stress.test.ts`  
**Milestone**: M2 (Requirement R3 — Asesmen dan Rapor: Buku Nilai Mapel Cascading & Teacher-First Selection)  

---

## 1. Observation

1. **Teacher-First Unselected State & UI Hygiene**:
   - In `src/components/GradebookView.tsx` line 319, `selectedGuru` is initialized cleanly to `useState<string>(isAdmin ? '' : (user?.nama || ''))`.
   - In lines 1086–1108 (`fetchMasterAssignments`), Admin mode enforces `initialGuru = ''`, explicitly setting:
     ```ts
     setMapelList([]);
     setKelasList([]);
     setSelectedMapel('');
     setSelectedKelas('');
     ```
   - In lines 2841, 2868, 2893:
     - Guru select provides `<option value="">-- Pilih Guru Pengampu --</option>`.
     - Mapel select is disabled (`disabled={!selectedGuru}`) with placeholder prompt `<option value="">-- Pilih guru pengampu terlebih dahulu --</option>`.
     - Kelas select is disabled (`disabled={!selectedGuru || !selectedMapel}`) with placeholder prompt `<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>`.
   - In lines 2953–2965, the workspace displays a dedicated Clay-styled empty-state prompt card:
     ```tsx
     {isAdmin && !selectedGuru ? (
       <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-14 text-center ...">
         <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
           Pilih Guru Pengampu Terlebih Dahulu
         </h3>
         <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
           Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai.
         </p>
       </div>
     ) : ( <> ... </> )}
     ```

2. **Premature Grade Fetching Prevention**:
   - In lines 1557–1562 (`fetchGrades`):
     ```ts
     const fetchGrades = useCallback(async () => {
       if (!selectedKelas || !selectedMapel) {
         setGradesMap({});
         setDirtyGrades({});
         return;
       }
       ...
     ```
   - Empirical Supabase query spied in `tests/adversarial_m2_teacher_first_stress.test.ts` Suite 1.3 confirmed **zero queries** (`0 calls`) to `supabase.from('nilai_siswa')` when `selectedGuru === ''`.

3. **Dirty Grades Safeguard Matrix**:
   - In `handleSelectGuru` (lines 519–543), `handleSelectMapel` (lines 545–597), and `handleSelectKelas` (lines 599–616):
     - If `Object.keys(dirtyGrades).length > 0`, `window.confirm` is triggered.
     - When user cancels (`confirm === false`), the function returns early: previous teacher, mapel, kelas, and `dirtyGrades` are 100% preserved.
     - When user confirms (`confirm === true`), `setDirtyGrades({})` cleanly purges dirty state and updates downstream selections.

4. **Cyclic Transitions & Zero Orphaned State**:
   - State transition sequence `"" -> Teacher A -> Teacher B -> "" -> Teacher B -> Teacher A`:
     - Switching from Teacher B to `""` immediately purges `selectedMapel = ''`, `selectedKelas = ''`, `mapelList = []`, and `kelasList = []`.
     - 100-step randomized fuzzing generator in Suite 3.3 passed with zero invariant violations: no orphaned classes, no dangling parallel classes, and no state leakage across transitions.

5. **Grade-Level Isolation & Cross-Grade Leakage**:
   - In lines 449–482 and 564–591, `parseTingkat` and `getSubjectTingkat` strictly enforce grade boundaries:
     - Selecting Grade 10 subject restricts classes strictly to `parseTingkat(kelas) === '10'`.
     - Selecting Grade 11 subject restricts classes strictly to `parseTingkat(kelas) === '11'`.
     - Selecting Grade 12 subject restricts classes strictly to `parseTingkat(kelas) === '12'`.
     - Roman numerals (`X`, `XI`, `XII`), Arabic numerals (`10`, `11`, `12`), Kurikulum Merdeka Phase E, and alphanumeric classes (`10 RPL 1`, `XI MIPA 1`) were stress-tested with 0% class leakage.

6. **Non-Admin (Guru Mode) Preservation**:
   - Non-admin teachers (`role: 'Guru'`) initialize `selectedGuru` automatically to `user?.nama`, display the read-only teacher badge, bypass the unselected empty state, auto-populate assigned mapels and classes, and execute `fetchGrades` normally on mount.

7. **Empirical Test Results**:
   - `npx tsx tests/adversarial_m2_teacher_first_stress.test.ts`: **26/26 passed (100% success)**.
   - `npx tsx tests/gradebook_cascading_selection.test.ts`: **27/27 passed (100% success)**.
   - `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts`: **17/17 passed (100% success)**.
   - `npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts`: **15/15 passed (100% success)**.
   - `npx tsx tests/forensic_gradebook_audit.test.ts`: **24/24 passed (100% success)**.
   - `npx tsc --noEmit`: exited with code 0 (0 type errors).
   - `npm run build`: compiled and generated all 13 routes successfully in Next.js 16.3.4 (Turbopack).

---

## 2. Logic Chain

1. **Teacher-First Selection & Empty State (Observation 1, 2)**:
   - Initializing `selectedGuru` to `''` in Admin mode prevents premature auto-binding.
   - Disabling Mapel and Kelas dropdowns with explicit instructional option strings ensures users cannot make out-of-order selections.
   - Guarding `fetchGrades` with `if (!selectedKelas || !selectedMapel) return;` guarantees no premature network requests or database errors occur on mount.
   - Wrapping the assessment workspace with `{isAdmin && !selectedGuru ? <EmptyStateCard /> : <> ... </>}` ensures users see an intuitive prompt rather than empty tables.

2. **Dirty Grades Safeguard (Observation 3)**:
   - Empirical simulation verified that when unsaved changes exist in `dirtyGrades`:
     - Cancelling preserves the active teacher and keeps all dirty flags intact across multiple cancelled attempts (Suite 7.1).
     - Confirming invokes `setDirtyGrades({})`, resetting dirty tracking before cascading to the new selection, preventing dirty state leaks.

3. **Downstream Selection Reset & State Hygiene (Observation 4)**:
   - When switching to `-- Pilih Guru Pengampu --` (`""`), `handleSelectGuru` explicitly zeroes out `selectedMapel`, `selectedKelas`, `mapelList`, and `kelasList`.
   - The 100-step randomized transition fuzzer proved that subsequent switches to any teacher cleanly rebuild fresh lists without any orphaned classes from previous teachers.

4. **Grade-Level Isolation (Observation 5)**:
   - Checking Roman/Arabic numerals in descending order (`12` -> `11` -> `10`) eliminates prefix collisions (e.g. `XI` being matched as `X`).
   - Filtering both matching assignments and fallback master classes through `parseTingkat(k) === targetTingkat` guarantees that Grade 10 classes never leak into Grade 11/12 subjects and vice versa.

5. **RBAC & Zero Regression (Observation 6, 7)**:
   - Non-admin teachers retain their automatic assignment binding and cannot alter the teacher dropdown.
   - All existing gradebook regression tests passed, TypeScript compiled with zero errors, and Next.js production build succeeded.

---

## 3. Caveats

- **Subjects with Universal/General Scope**: Subjects without an explicit grade level in name or category (e.g., `Pendidikan Agama` or `PJOK`) resolve `targetTingkat === null`. For these subjects, grade-level filtering is intentionally bypassed to allow all classes assigned to the teacher. This is expected and verified in Suite 4.3.

---

## 4. Conclusion

**VERDICT: APPROVE**

The implementation of Milestone M2 (Requirement R3) in `src/components/GradebookView.tsx` satisfies all specifications and passes rigorous adversarial stress-testing:
- Admin mode strictly begins with `-- Pilih Guru Pengampu --` unselected.
- Mapel and Kelas selects are disabled with helpful placeholder prompts until prerequisite selections are made.
- Premature grade fetching is completely prevented (0 queries to `nilai_siswa` in unselected state).
- The empty-state card is rendered cleanly in Admin mode without teacher selection.
- Dirty grades safeguards prevent accidental data loss upon teacher, subject, or class change.
- Switching between teachers or back to unselected `""` resets downstream state with zero orphaned data.
- Grade-level isolation prevents cross-grade class leakage.
- Non-admin mode behaves normally with zero regression.

---

## 5. Verification Method

To independently execute and verify the empirical stress tests:

1. **Run Challenger Adversarial Stress Suite**:
   ```powershell
   npx tsx tests/adversarial_m2_teacher_first_stress.test.ts
   ```
   *Expected Output*: `TOTAL: 26 | PASSED: 26 | FAILED: 0`, verdict `APPROVE`.

2. **Run Worker Cascading Selection Suite**:
   ```powershell
   npx tsx tests/gradebook_cascading_selection.test.ts
   ```
   *Expected Output*: `27/27 tests passed`.

3. **Run Related Gradebook Regression Suites**:
   ```powershell
   npx tsx tests/gradebook_teacher_filter_ponytail.test.ts
   npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts
   npx tsx tests/forensic_gradebook_audit.test.ts
   ```
   *Expected Output*: All suites pass with 100% success rate.

4. **Verify TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Output*: Exit code 0, no errors.

5. **Verify Production Build**:
   ```powershell
   npm run build
   ```
   *Expected Output*: Exit code 0, Next.js build succeeds.
