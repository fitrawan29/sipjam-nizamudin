# HANDOFF REPORT — MILESTONE M2: GRADEBOOK CASCADING SELECTION & GRADE-LEVEL ISOLATION

**Agent**: `worker_m2_nov`  
**Date**: 2026-11-06T23:45:00Z  
**Target Module**: `src/components/GradebookView.tsx`, `tests/gradebook_cascading_selection.test.ts`  
**Milestone**: M2 (Requirement R3 — Asesmen dan Rapor: Buku Nilai Mapel Cascading Selection)  
**Git Commit**: `5306f20` pushed to `origin/main`  

---

## 1. Observation

1. **Initial State & Auto-Selection Defect**:
   - In `src/components/GradebookView.tsx` line 275, `selectedGuru` was initialized to `user?.nama || ''`, populating `selectedGuru` even when the user was an Admin.
   - In `fetchMasterAssignments` lines 962–978, when `isAdmin` was true, the code unconditionally auto-selected `teachers[0]?.nama_guru || ''` and executed `syncTeacherAssignments`, pre-selecting the first teacher, subject, and class, thereby violating the requirement to require teacher selection first.
2. **Missing Placeholders & Unselected Flow**:
   - The Guru dropdown had no unselected option `<option value="">-- Pilih Guru Pengampu --</option>`.
   - The Mapel and Kelas `<select>` elements lacked `disabled` attributes and did not inform the user to choose prerequisite filters first.
   - When no teacher was selected in Admin mode, the workspace attempted to render empty assessment tables instead of a Clay-styled instructional empty state.
3. **Cross-Grade Class Leakage**:
   - `syncTeacherAssignments` and `handleSelectMapel` fell back to `allTeacherClasses` or `fallbackClasses` (`masterClassesList`) without filtering by the subject's grade level. When a teacher was assigned a Class XI subject (e.g., `XI Matematika Tingkat Lanjut`), all classes across grades 10, 11, and 12 were displayed in the dropdown.
4. **Existing Regression Invariant Failure**:
   - Baseline execution of `npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts` revealed two failing checks in `GradebookView.tsx`:
     ```
     ✘ FAIL: handleSelectKelas preserves selectedMapel when switching between parallel classes that both teach it
     ✘ FAIL: handleSelectMapel keeps selectedKelas when the current parallel class teaches the newly selected mapel
     ```
   - This failure was caused by missing `stillTeaches` in `handleSelectKelas` and `currentClassValid` in `handleSelectMapel`.
5. **Dirty Grades Safeguard**:
   - `dirtyGrades` checks existed, but `setDirtyGrades({})` was not cleanly called upon user confirmation, leaving stale dirty state in memory during teacher or subject switching.
6. **Execution & Build Verification Commands**:
   - `npx tsc --noEmit` exited with code 0 (zero errors).
   - `npx tsx tests/gradebook_cascading_selection.test.ts` exited with code 0 (27/27 passed).
   - `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts` exited with code 0 (17/17 passed).
   - `npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts` exited with code 0 (15/15 passed).
   - `npx tsx tests/forensic_gradebook_audit.test.ts` exited with code 0 (24/24 passed).
   - `npx tsx tests/gradebook_unified_setup_flow.test.ts` exited with code 0 (44/44 passed).
   - `npm run build` completed successfully with code 0.
   - `git push origin main` updated `debf0d6..5306f20`.

---

## 2. Logic Chain

1. **Step 1 (Teacher-First Flow)**:
   - From Observation 1: In Admin mode, `selectedGuru` must start unselected (`""`). Changing state initialization to `useState<string>(isAdmin ? '' : (user?.nama || ''))` and updating `fetchMasterAssignments` to only call `syncTeacherAssignments` when `initialGuru` is truthy guarantees that Admin enters with clean unselected state, while non-admin Guru mode automatically binds to `user?.nama` without regression.
2. **Step 2 (Dropdown Placeholders & Disabled Cascading)**:
   - From Observation 2:
     - Adding `<option value="">-- Pilih Guru Pengampu --</option>` to the Guru dropdown provides the unselected entry.
     - Adding `disabled={!selectedGuru}` with `<option value="">-- Pilih guru pengampu terlebih dahulu --</option>` ensures Mapel cannot be interacted with until a teacher is selected, while preserving the existing fallback `uniqueMapelList.length === 0 ? (` with `'Tidak ada mapel ditugaskan'`.
     - Adding `disabled={!selectedGuru || !selectedMapel}` with `<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>` ensures Kelas cannot be interacted with until both teacher and subject are selected, while preserving `kelasList.length === 0 ? (` with `'Tidak ada kelas ditugaskan'`.
     - Wrapping the workspace in `{isAdmin && !selectedGuru ? ( <EmptyStateCard /> ) : ( <> ... </> )}` displays the required Clay-styled empty state: `"Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai."`
3. **Step 3 (Strict Grade-Level Matching)**:
   - From Observation 3: Adding helper functions `parseTingkat(nama)` and `getSubjectTingkat(mapelName, mapelsList)`:
     - Normalizes Roman numerals (`X`, `XI`, `XII`), Arabic numerals (`10`, `11`, `12`), prefix alphanumeric combinations (`10A`, `11B`, `12C`), and Kurikulum Merdeka Phase E.
     - In `syncTeacherAssignments` and `handleSelectMapel`, candidate classes are strictly filtered by `parseTingkat(kelas) === targetTingkat`. If a subject belongs to Grade 11, only Grade 11 classes are selectable. If no classes match, fallback master classes are strictly filtered by `targetTingkat`, mathematically eliminating cross-grade leakage.
4. **Step 4 (Invariant Restoration & Parallel Class Isolation)**:
   - From Observation 4: Restoring `stillTeaches` in `handleSelectKelas` and `currentClassValid` in `handleSelectMapel` fixed the two regression failures in `tests/mata_pelajaran_kelas_paralel_isolation.test.ts`, restoring it to 100% pass rate.
5. **Step 5 (Dirty Grades State Hygiene)**:
   - From Observation 5: In `handleSelectGuru`, `handleSelectMapel`, and `handleSelectKelas`, invoking `setDirtyGrades({})` upon user confirmation resets dirty flags, preventing orphaned dirty grade warnings.

---

## 3. Caveats

1. **Subjects Without Explicit Grade Indicators**:
   - For general subjects without grade in name or category (e.g., universal subjects like `Pendidikan Agama`), `getSubjectTingkat` returns `null`. In this case, `parseTingkat` filtering is bypassed, allowing all classes assigned to that teacher without false-positive class filtering.
2. **Modals Positioning**:
   - The Bobot Modal (`isBobotModalOpen`) and Bulk Fill Modal (`isBulkFillModalOpen`) remain outside the conditional workspace fragment, ensuring they function properly whenever opened by Admin or teacher.

---

## 4. Conclusion

Milestone M2 (Requirement R3) is fully implemented, verified, and pushed to `origin/main`.
- Admin gradebook selection strictly begins with teacher selection (`-- Pilih Guru Pengampu --`).
- Downstream Mapel and Kelas dropdowns cascade reactively with disabled states and instructional placeholder prompts.
- Grade-level matching is strictly enforced with `parseTingkat` and `getSubjectTingkat`, with 0% class leakage across grade levels.
- Workspace displays an attractive Clay-styled empty state card when no teacher is selected.
- All pre-existing test invariants (`isTeacherMatch`, `isAssignmentMatchTeacher`, `stillTeaches`, `currentClassValid`, `dirtyGrades`, `window.confirm`) are preserved.
- All test suites (cascading selection, ponytail, parallel class isolation, forensic audit, unified setup) passed 100%, TypeScript typecheck passed with 0 errors, Next.js production build succeeded, and changes are committed in `5306f20`.

---

## 5. Verification Method

To independently reproduce and verify this work:

1. **Verify TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Code 0, zero errors.

2. **Run Dedicated Cascading Selection Test Suite**:
   ```powershell
   npx tsx tests/gradebook_cascading_selection.test.ts
   ```
   *Expected*: 27/27 tests passed.

3. **Run Existing Gradebook Regression Suites**:
   ```powershell
   npx tsx tests/gradebook_teacher_filter_ponytail.test.ts
   npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts
   npx tsx tests/forensic_gradebook_audit.test.ts
   npx tsx tests/gradebook_unified_setup_flow.test.ts
   ```
   *Expected*: All tests passed with 100% success rate.

4. **Verify Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Code 0, successful production build.

5. **Verify Git History**:
   ```powershell
   git log -1 --stat
   ```
   *Expected*: Commit `5306f20` containing `src/components/GradebookView.tsx` and `tests/gradebook_cascading_selection.test.ts`.
