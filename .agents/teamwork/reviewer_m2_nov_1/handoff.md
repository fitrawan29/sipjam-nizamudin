# REVIEW & ADVERSARIAL CHALLENGE REPORT — MILESTONE M2 (R3)

**Agent**: `reviewer_m2_nov_1` (Roles: reviewer, critic)  
**Date**: 2026-11-06T23:52:00Z  
**Target Module**: `src/components/GradebookView.tsx`, `tests/gradebook_cascading_selection.test.ts`  
**Commits Reviewed**: `debf0d6`, `5306f20`  
**Explicit Verdict**: **APPROVE**  

---

## 1. Observation

1. **Teacher-First State Initialization (`src/components/GradebookView.tsx:319`)**:
   ```ts
   const [selectedGuru, setSelectedGuru] = useState<string>(isAdmin ? '' : (user?.nama || ''));
   ```
   Directly observed: In Admin mode, `selectedGuru` is initialized to empty string `""` on mount. For non-admin (Guru) mode, it initializes to `user?.nama || ''`.

2. **Auto-Selection Halted in `fetchMasterAssignments` (`src/components/GradebookView.tsx:1086-1108`)**:
   ```ts
   // Determine initial guru
   const initialGuru = selectedGuru || (isAdmin ? '' : (user?.nama || ''));
   if (!selectedGuru && initialGuru) {
     setSelectedGuru(initialGuru);
   }

   // Apply filtering for initial teacher only if teacher is selected
   if (initialGuru) {
     syncTeacherAssignments(
       initialGuru,
       assignments,
       teachers,
       masterMapels,
       masterClasses,
       selectedMapel,
       selectedKelas
     );
   } else {
     setMapelList([]);
     setKelasList([]);
     setSelectedMapel('');
     setSelectedKelas('');
   }
   ```
   Directly observed: When `isAdmin` is true and `selectedGuru` is empty, `initialGuru` evaluates to `""`. Auto-selection of `teachers[0]` is completely halted, and the downstream `mapelList`, `kelasList`, `selectedMapel`, and `selectedKelas` are cleanly emptied.

3. **Dropdown Controls & Placeholder Wiring (`src/components/GradebookView.tsx:2836-2908`)**:
   - Guru dropdown:
     ```tsx
     <select value={selectedGuru} onChange={e => handleSelectGuru(e.target.value)} ...>
       <option value="">-- Pilih Guru Pengampu --</option>
       {teachersList.map((g, idx) => ( ... ))}
     </select>
     ```
   - Mapel dropdown:
     ```tsx
     <select
       value={selectedMapel}
       onChange={e => handleSelectMapel(e.target.value)}
       disabled={!selectedGuru}
       className={`... ${!selectedGuru ? 'opacity-50 cursor-not-allowed' : ''}`}
     >
       {!selectedGuru ? (
         <option value="">-- Pilih guru pengampu terlebih dahulu --</option>
       ) : uniqueMapelList.length === 0 ? (
         <option value="">Tidak ada mapel ditugaskan</option>
       ) : ( ... )}
     </select>
     ```
   - Kelas dropdown:
     ```tsx
     <select
       value={selectedKelas}
       onChange={e => handleSelectKelas(e.target.value)}
       disabled={!selectedGuru || !selectedMapel}
       className={`... ${!selectedGuru || !selectedMapel ? 'opacity-50 cursor-not-allowed' : ''}`}
     >
       {!selectedGuru || !selectedMapel ? (
         <option value="">-- Pilih mata pelajaran terlebih dahulu --</option>
       ) : kelasList.length === 0 ? (
         <option value="">Tidak ada kelas ditugaskan</option>
       ) : ( ... )}
     </select>
     ```

4. **Clay-Styled Empty-State Card (`src/components/GradebookView.tsx:2953-2965`)**:
   ```tsx
   {isAdmin && !selectedGuru ? (
     <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-14 text-center shadow-sm border border-gray-100 dark:border-gray-700/80 mt-4 no-print animate-in fade-in duration-200">
       <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl shadow-inner mb-4">
         <i className="fa-solid fa-chalkboard-user"></i>
       </div>
       <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
         Pilih Guru Pengampu Terlebih Dahulu
       </h3>
       <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
         Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai.
       </p>
     </div>
   ) : ( ... )}
   ```

5. **Non-Admin (Guru) Mode Preserved (`src/components/GradebookView.tsx:2849-2858`)**:
   ```tsx
   ) : (
     <div>
       <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
         Guru Pengampu
       </label>
       <div className="w-full bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white truncate">
         {user?.nama || 'Guru Terpilih'}
       </div>
     </div>
   )}
   ```
   Non-admin mode retains read-only teacher badge, automatically initializes to `user?.nama`, bypasses empty state, and loads the teacher's assignments.

6. **Grade-Level Isolation & Invariant Restoration (`src/components/GradebookView.tsx:560-616`)**:
   - Restored `stillTeaches` in `handleSelectKelas` and `currentClassValid` in `handleSelectMapel`.
   - `parseTingkat` and `getSubjectTingkat` filter selectable classes strictly according to the subject's grade level.
   - Clean reset of `dirtyGrades` via `setDirtyGrades({})` on confirmed selection change.

7. **Independent Command Execution Results**:
   - `npx tsc --noEmit`: Exit code 0 (zero errors).
   - `npx tsx tests/gradebook_cascading_selection.test.ts`: Exit code 0 (27/27 tests passed).
   - `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts`: Exit code 0 (17/17 tests passed).
   - `npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts`: Exit code 0 (15/15 tests passed).
   - `npx tsx tests/forensic_gradebook_audit.test.ts`: Exit code 0 (24/24 tests passed).
   - `npx tsx tests/gradebook_unified_setup_flow.test.ts`: Exit code 0 (44/44 tests passed).
   - `npm run build`: Exit code 0 (Next.js 16.3.4 Turbopack production build succeeded).

---

## 2. Logic Chain

1. **Teacher-First Flow Compliance**:
   - From Observation 1 & 2: By setting `selectedGuru` to `""` when `isAdmin` is true and halting auto-selection in `fetchMasterAssignments`, the Admin can no longer bypass teacher selection. Initial mount enters with clean empty state.
2. **Cascading Accessibility & UX Safety**:
   - From Observation 3: Mapel and Kelas selects are disabled with explanatory placeholder options when prerequisite selections are missing (`!selectedGuru`, `!selectedGuru || !selectedMapel`). This guarantees users cannot select invalid combinations or trigger race conditions.
3. **Empty-State Clarity**:
   - From Observation 4: When `isAdmin && !selectedGuru`, the workspace renders a Clay-styled banner instructing the user to choose a teacher first, preventing confusing empty assessment tables or broken UI frames.
4. **Zero Regression for Non-Admin (Guru Mode)**:
   - From Observation 1 & 5: When `isAdmin` is false, `selectedGuru` is initialized to `user?.nama`, rendering the read-only teacher badge and executing assignment synchronization immediately, preserving 100% of the existing teacher workflow.
5. **Cross-Grade Isolation & Invariant Restoration**:
   - From Observation 6: Incorporating `parseTingkat` and `getSubjectTingkat` prevents Class X/XII classes from appearing for Class XI subjects. Restoring `stillTeaches` and `currentClassValid` resolved parallel class regressions, confirmed by 15/15 passing tests in `tests/mata_pelajaran_kelas_paralel_isolation.test.ts`.
6. **Authentic Integrity & Build Cleanliness**:
   - From Observation 7: Zero hardcoded mock outputs or facade implementations were detected. All 127 automated tests across 5 test suites passed 100%, TypeScript compilation reported 0 errors, and Next.js production build succeeded with exit code 0.

---

## 3. Caveats

1. **Subjects Without Explicit Grade Indicators**:
   - Subjects without identifiable grade levels (e.g. general subjects like `Pendidikan Agama Islam` or `Seni Budaya`) return `null` from `getSubjectTingkat`. In such cases, grade-level filtering is bypassed to avoid falsely eliminating legitimate classes assigned to the teacher. This is expected and desirable behavior.
2. **Offline Mode for Master Data**:
   - In environments where Supabase is offline or unconfigured, the component falls back to the in-memory or empty master data without throwing unhandled exceptions.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone M2 (Requirement R3) satisfies all specification requirements:
- In Admin mode, `selectedGuru` starts as empty string `""` on mount.
- Auto-selection of `teachers[0]` is halted in `fetchMasterAssignments`.
- Guru dropdown contains `<option value="">-- Pilih Guru Pengampu --</option>`.
- Mapel dropdown has `disabled={!selectedGuru}` and `<option value="">-- Pilih guru pengampu terlebih dahulu --</option>`.
- Kelas dropdown has `disabled={!selectedGuru || !selectedMapel}` and `<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>`.
- Main workspace renders an instructional Clay-styled empty state card when `isAdmin && !selectedGuru`.
- Non-admin (Guru) mode remains untouched, functioning with full zero-regression fidelity.
- All test suites and production build passed with exit code 0.

---

## 5. Verification Method

To independently reproduce and verify this review:

1. **Verify Static TypeScript Types**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Code 0, zero errors.

2. **Run Cascading Selection Suite**:
   ```powershell
   npx tsx tests/gradebook_cascading_selection.test.ts
   ```
   *Expected result*: 27/27 tests passed.

3. **Run Ponytail & Parallel Class Regression Suites**:
   ```powershell
   npx tsx tests/gradebook_teacher_filter_ponytail.test.ts
   npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts
   ```
   *Expected result*: 17/17 and 15/15 tests passed.

4. **Run Forensic & Unified Setup Suites**:
   ```powershell
   npx tsx tests/forensic_gradebook_audit.test.ts
   npx tsx tests/gradebook_unified_setup_flow.test.ts
   ```
   *Expected result*: 24/24 and 44/44 tests passed.

5. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected result*: Code 0, Next.js build succeeds with static pages generated.
