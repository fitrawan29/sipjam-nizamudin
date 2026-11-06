# HANDOFF REPORT — IMPLEMENTATION BLUEPRINT FOR REQUIREMENT R3 (PART 1)
**Agent**: `explorer_m2_nov_1`  
**Date**: 2026-11-06T23:32:00Z  
**Target Module**: `src/components/GradebookView.tsx`  
**Scope**: Requirement R3 - Part 1: Teacher First Selection & Initial Empty State in `GradebookView.tsx`

---

## 1. Observation

### 1.1 Direct Code Observations in `src/components/GradebookView.tsx`

1. **State Initialization (`selectedGuru`) at line 275**:
   ```tsx
   274:   // Active Filters
   275:   const [selectedGuru, setSelectedGuru] = useState<string>(user?.nama || '');
   276:   const [selectedMapel, setSelectedMapel] = useState<string>('');
   277:   const [selectedKelas, setSelectedKelas] = useState<string>('');
   ```
   *Observation*: On initial mount, `selectedGuru` is populated with `user?.nama || ''`. Even for Admin users, if `user?.nama` exists, it initializes to that string, or empty string. However, `isAdmin` is already resolved on line 233 (`const isAdmin = user?.role === 'Admin' || user?.role === 'Superadmin' || user?.role === 'admin';`), yet not utilized when initializing `selectedGuru`.

2. **Auto-Selection on Initial Load at lines 962–978**:
   ```tsx
   962:         // Determine initial guru
   963:         const initialGuru = selectedGuru || (isAdmin ? (teachers[0]?.nama_guru || '') : (user?.nama || ''));
   964:         if (!selectedGuru && initialGuru) {
   965:           setSelectedGuru(initialGuru);
   966:         }
   967: 
   968:         // Apply filtering for initial teacher
   969:         syncTeacherAssignments(
   970:           initialGuru,
   971:           assignments,
   972:           teachers,
   973:           masterMapels,
   974:           masterClasses,
   975:           selectedMapel,
   976:           selectedKelas
   977:         );
   ```
   *Observation*: In `fetchMasterAssignments`, when `isAdmin` is true, line 963 resolves `initialGuru` to `teachers[0]?.nama_guru || ''`. Lines 964–966 immediately mutate `selectedGuru` by calling `setSelectedGuru(initialGuru)`. Lines 969–977 immediately invoke `syncTeacherAssignments`, which automatically selects the first subject (`distinctSubjects[0]`) and the first class (`targetClasses[0]`), completely bypassing any teacher selection step by the Admin.

3. **Fallback in `syncTeacherAssignments` at lines 337–344**:
   ```tsx
   337:     if (!targetGuruName && teachers.length === 0) return;
   338:     const effectiveGuru = targetGuruName || (teachers[0]?.nama_guru || user?.nama || '');
   339:     const currentTeacher = teachers.find(t => isTeacherMatch(t, effectiveGuru)) || {
   ```
   *Observation*: If `targetGuruName` is empty string `""`, line 338 falls back to `teachers[0]?.nama_guru`, which means calling `syncTeacherAssignments("", ...)` still selects the first teacher and populates their subjects and classes.

4. **Dropdown Filter Markup at lines 2700–2770**:
   - **Guru Pengampu** (lines 2700–2716):
     ```tsx
     {isAdmin ? (
       <div>
         <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
           Guru Pengampu
         </label>
         <select
           value={selectedGuru}
           onChange={e => handleSelectGuru(e.target.value)}
           className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
         >
           {teachersList.map((g, idx) => (
             <option key={idx} value={g.nama_guru}>
               {g.nama_guru}
             </option>
           ))}
         </select>
       </div>
     ) : ( ... )}
     ```
     *Observation*: There is no default unselected prompt option (such as `<option value="">-- Pilih Guru Pengampu --</option>`).
   - **Mata Pelajaran** (lines 2728–2748):
     ```tsx
     <select
       value={selectedMapel}
       onChange={e => handleSelectMapel(e.target.value)}
       className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
     >
       {uniqueMapelList.length === 0 ? (
         <option value="">Tidak ada mapel ditugaskan</option>
       ) : (
         uniqueMapelList.map((m, idx) => (
           <option key={idx} value={m.nama_mapel}>
             {m.nama_mapel}
           </option>
         ))
       )}
     </select>
     ```
     *Observation*: The Mapel `<select>` dropdown has no `disabled` attribute and does not prompt the user to choose a teacher first when `!selectedGuru`.
   - **Kelas** (lines 2750–2770):
     ```tsx
     <select
       value={selectedKelas}
       onChange={e => handleSelectKelas(e.target.value)}
       className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
     >
       {kelasList.length === 0 ? (
         <option value="">Tidak ada kelas ditugaskan</option>
       ) : (
         kelasList.map((k, idx) => (
           <option key={idx} value={k}>
             {k}
           </option>
         ))
       )}
     </select>
     ```
     *Observation*: The Kelas `<select>` dropdown has no `disabled` attribute and does not prompt the user when `!selectedGuru || !selectedMapel`.

5. **Main Gradebook Workspace Area at lines 2814–2910**:
   - Lines 2621–2812 constitute the Header Card with the filter dropdowns.
   - Line 2814 starts `{/* VIEW TABS NAVIGATION */}` with action buttons (Export CSV, Cetak Dokumen) and sub-tabs (`innerTab === 'tp-matrix'`, `'rekap-semester'`, `'statistik'`).
   - Line 2909 starts `{innerTab === 'tp-matrix' && ( ... )}` with the Unified Setup Panel and spreadsheet matrix.
   - *Observation*: There is currently no empty state card displayed when an Admin has not selected a teacher. If `selectedGuru === ''`, the UI attempts to render the spreadsheet matrix and TP empty state, resulting in a confusing interface.

6. **Existing Test Suite Assertions in `tests/gradebook_teacher_filter_ponytail.test.ts`**:
   - `code.includes('export function isTeacherMatch')`
   - `code.includes('export function isAssignmentMatchTeacher')`
   - `code.includes('const syncTeacherAssignments = useCallback(')`
   - `code.includes('const handleSelectGuru = (newGuru: string) => {')`
   - `code.includes('Object.keys(dirtyGrades).length > 0')`
   - `code.includes('window.confirm(')`
   - `code.includes('onChange={e => handleSelectGuru(e.target.value)}')`
   - `code.includes('uniqueMapelList.length === 0 ? (') && code.includes('Tidak ada mapel ditugaskan')`
   - `code.includes('kelasList.length === 0 ? (') && code.includes('Tidak ada kelas ditugaskan')`
   - `code.includes('leftNip={teachersList.find(t => t.nama_guru === selectedGuru)?.nip || user?.nip}')`
   *Observation*: All these verbatim code patterns must remain intact to prevent regressions in existing automated tests.

---

## 2. Logic Chain

1. **Premise 1**: Requirement R3 mandates that in Admin mode, the gradebook workflow must strictly start with selecting a teacher first ("alur pemilihan harus dimulai dengan memilih guru pengampu terlebih dahulu").
2. **Premise 2**: Downstream selections (Mata Pelajaran and Kelas) must be disabled until their prerequisite parent filter is chosen.
3. **Premise 3**: When an Admin has not selected a teacher, the workspace should display an informative empty state instead of rendering empty assessment tables or confusing prompts.
4. **Premise 4**: For non-admin (Guru) users, the view must remain automatically scoped to their own account (`user.nama`), displaying their assigned subjects and classes as a read-only badge without any regression.
5. **Connecting Observations to Resolution**:
   - In Step 1.1, `selectedGuru` is initialized without checking `isAdmin`. Changing line 275 to `useState<string>(isAdmin ? '' : (user?.nama || ''))` ensures Admin starts with `selectedGuru = ""`, while Guru starts with `user.nama`.
   - In Step 1.2, lines 962–978 auto-select `teachers[0]` when `isAdmin` is true. Changing line 963 to `const initialGuru = selectedGuru || (isAdmin ? '' : (user?.nama || ''));` and only calling `syncTeacherAssignments` when `initialGuru` is non-empty prevents automatic teacher selection on initial load. When `!initialGuru`, resetting `mapelList`, `kelasList`, `selectedMapel`, and `selectedKelas` ensures clean state.
   - In Step 1.3, lines 337–344 fall back to `teachers[0]` when `targetGuruName` is empty. Adding an early guard `if (!targetGuruName && isAdmin) { setMapelList([]); setKelasList([]); setSelectedMapel(''); setSelectedKelas(''); return; }` ensures that selecting the empty option resets all dependent state immediately.
   - In Step 1.4:
     - Adding `<option value="">-- Pilih Guru Pengampu --</option>` to the Guru dropdown provides the unselected default.
     - Adding `disabled={!selectedGuru}` and conditional option `<option value="">-- Pilih guru pengampu terlebih dahulu --</option>` to the Mapel dropdown enforces prerequisite selection while preserving the existing fallback check `uniqueMapelList.length === 0 ? (`.
     - Adding `disabled={!selectedGuru || !selectedMapel}` and conditional option `<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>` to the Kelas dropdown enforces subject selection while preserving `kelasList.length === 0 ? (`.
   - In Step 1.5, wrapping lines 2814–4875 in `{isAdmin && !selectedGuru ? ( <EmptyStateCard /> ) : ( <> ... </> )}` renders an empty state card with the exact prompt: `"Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai."`
   - In Step 1.6, all existing test assertions match the proposed code structure verbatim.

---

## 3. Caveats

1. **Non-admin Guru Experience**: Non-admin users have `isAdmin = false`. They must never see `-- Pilih Guru Pengampu --` or the unselected empty state card; their `selectedGuru` resolves to `user.nama`, and their Guru Pengampu element remains the read-only badge.
2. **Resetting Downstream State**: When an Admin switches from "Guru A" to "Guru B", `handleSelectGuru` should pass empty strings for `prefMapel` and `prefKelas` (`syncTeacherAssignments(newGuru, ..., '', '')`) so that stale subjects or classes from "Guru A" are not carried over to "Guru B".
3. **Dirty Grades Guard**: The existing `dirtyGrades` check and `window.confirm` in `handleSelectGuru` must be strictly retained so that switching teachers or resetting to empty cannot cause unconfirmed loss of edited grades.
4. **Modal Rendering**: The Bobot Modal (`isBobotModalOpen`) and Bulk Fill Modal (`isBulkFillModalOpen`) sit at lines 4877–5115, outside the workspace fragment (`<> ... </>`), ensuring their functionality and accessibility are preserved.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Exact Code Diffs for `src/components/GradebookView.tsx`

#### Blueprint Part 1: Initial `selectedGuru` State (Line 275)
**Location**: `src/components/GradebookView.tsx`, lines 274–277.  
**Rationale**: Admin must start with an unselected state (`""`), whereas a teacher must start automatically with `user.nama`.

```diff
@@ -274,3 +274,3 @@
   // Active Filters
-  const [selectedGuru, setSelectedGuru] = useState<string>(user?.nama || '');
+  const [selectedGuru, setSelectedGuru] = useState<string>(isAdmin ? '' : (user?.nama || ''));
   const [selectedMapel, setSelectedMapel] = useState<string>('');
```

---

#### Blueprint Part 2: `syncTeacherAssignments` Unselected Guard (Lines 336–345)
**Location**: `src/components/GradebookView.tsx`, lines 336–345.  
**Rationale**: When `targetGuruName` is empty in Admin mode, prevent falling back to `teachers[0]`, and reset downstream lists and selections.

```diff
@@ -336,4 +336,18 @@
   ) => {
+    if (!targetGuruName && isAdmin) {
+      setMapelList([]);
+      setKelasList([]);
+      setSelectedMapel('');
+      setSelectedKelas('');
+      return;
+    }
     if (!targetGuruName && teachers.length === 0) return;
-    const effectiveGuru = targetGuruName || (teachers[0]?.nama_guru || user?.nama || '');
+    const effectiveGuru = targetGuruName || (isAdmin ? '' : (teachers[0]?.nama_guru || user?.nama || ''));
+    if (!effectiveGuru) {
+      setMapelList([]);
+      setKelasList([]);
+      setSelectedMapel('');
+      setSelectedKelas('');
+      return;
+    }
     const currentTeacher = teachers.find(t => isTeacherMatch(t, effectiveGuru)) || {
```

---

#### Blueprint Part 3: Clean Downstream Reset on Guru Selection (Lines 446–456)
**Location**: `src/components/GradebookView.tsx`, lines 446–456.  
**Rationale**: When an Admin chooses a different teacher, downstream Mapel and Kelas preferences must be cleanly reset.

```diff
@@ -446,11 +446,11 @@
     setSelectedGuru(newGuru);
     syncTeacherAssignments(
       newGuru,
       allTeacherAssignments,
       teachersList,
       masterMapelList,
       masterClassesList,
-      selectedMapel,
-      selectedKelas
+      '',
+      ''
     );
   };
```

---

#### Blueprint Part 4: Stop Auto-Selection on Initial Mount (Lines 962–978)
**Location**: `src/components/GradebookView.tsx`, lines 962–978.  
**Rationale**: Stop `teachers[0]` auto-selection on initial load for Admin mode; only run `syncTeacherAssignments` if a teacher is selected.

```diff
@@ -962,17 +962,24 @@
         // Determine initial guru
-        const initialGuru = selectedGuru || (isAdmin ? (teachers[0]?.nama_guru || '') : (user?.nama || ''));
+        const initialGuru = selectedGuru || (isAdmin ? '' : (user?.nama || ''));
         if (!selectedGuru && initialGuru) {
           setSelectedGuru(initialGuru);
         }

-        // Apply filtering for initial teacher
-        syncTeacherAssignments(
-          initialGuru,
-          assignments,
-          teachers,
-          masterMapels,
-          masterClasses,
-          selectedMapel,
-          selectedKelas
-        );
+        // Apply filtering for initial teacher only if teacher is selected
+        if (initialGuru) {
+          syncTeacherAssignments(
+            initialGuru,
+            assignments,
+            teachers,
+            masterMapels,
+            masterClasses,
+            selectedMapel,
+            selectedKelas
+          );
+        } else {
+          setMapelList([]);
+          setKelasList([]);
+          setSelectedMapel('');
+          setSelectedKelas('');
+        }
       } catch (err) {
```

---

#### Blueprint Part 5: Guru, Mapel, and Kelas Dropdowns Markup (Lines 2700–2770)
**Location**: `src/components/GradebookView.tsx`, lines 2700–2770.  
**Rationale**:
- Add `<option value="">-- Pilih Guru Pengampu --</option>` to Guru dropdown.
- Disable Mapel dropdown when `!selectedGuru` and display `-- Pilih guru pengampu terlebih dahulu --`.
- Disable Kelas dropdown when `!selectedGuru || !selectedMapel` and display `-- Pilih mata pelajaran terlebih dahulu --`.
- Preserve verbatim patterns `uniqueMapelList.length === 0 ? (` and `kelasList.length === 0 ? (` for existing unit tests.

```diff
@@ -2705,4 +2705,5 @@
               <select
                 value={selectedGuru}
                 onChange={e => handleSelectGuru(e.target.value)}
                 className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
               >
+                <option value="">-- Pilih Guru Pengampu --</option>
                 {teachersList.map((g, idx) => (
                   <option key={idx} value={g.nama_guru}>
                     {g.nama_guru}
                   </option>
                 ))}
               </select>
@@ -2733,5 +2734,8 @@
             <select
               value={selectedMapel}
               onChange={e => handleSelectMapel(e.target.value)}
-              className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
+              disabled={!selectedGuru}
+              className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
             >
+              {!selectedGuru ? (
+                <option value="">-- Pilih guru pengampu terlebih dahulu --</option>
+              ) : uniqueMapelList.length === 0 ? (
-              {uniqueMapelList.length === 0 ? (
                 <option value="">Tidak ada mapel ditugaskan</option>
               ) : (
@@ -2755,5 +2759,8 @@
             <select
               value={selectedKelas}
               onChange={e => handleSelectKelas(e.target.value)}
-              className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
+              disabled={!selectedGuru || !selectedMapel}
+              className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
             >
+              {!selectedGuru || !selectedMapel ? (
+                <option value="">-- Pilih mata pelajaran terlebih dahulu --</option>
+              ) : kelasList.length === 0 ? (
-              {kelasList.length === 0 ? (
                 <option value="">Tidak ada kelas ditugaskan</option>
               ) : (
```

---

#### Blueprint Part 6: Admin Workspace Initial Empty State (Lines 2813 & 4875)
**Location**: `src/components/GradebookView.tsx`, lines 2812–2816 and line 4875.  
**Rationale**: When `isAdmin && !selectedGuru`, render the attractive empty state card prompting the user.

```diff
@@ -2812,4 +2812,21 @@
         </div>
       </div>

+      {/* ADMIN UNSELECTED GURU INITIAL EMPTY STATE */}
+      {isAdmin && !selectedGuru ? (
+        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-14 text-center shadow-sm border border-gray-100 dark:border-gray-700/80 mt-4 no-print animate-in fade-in duration-200">
+          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl shadow-inner mb-4">
+            <i className="fa-solid fa-chalkboard-user"></i>
+          </div>
+          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
+            Pilih Guru Pengampu Terlebih Dahulu
+          </h3>
+          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
+            Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai.
+          </p>
+        </div>
+      ) : (
+        <>
       {/* VIEW TABS NAVIGATION */}
       <div className="flex items-center justify-between gap-3 flex-wrap no-print">
...
@@ -4874,2 +4891,4 @@
       )}
+        </>
+      )}

       {/* Modal Bobot Nilai (Admin Only) */}
```

---

## 5. Verification Method

To independently verify the implementation after code application:

### 5.1 Verification Test Suite
Create a dedicated test file `tests/gradebook_r3_teacher_first.test.ts` with the following verification assertions:
```ts
import fs from 'fs';
import path from 'path';
import assert from 'assert';

const file = path.resolve(process.cwd(), 'src/components/GradebookView.tsx');
const code = fs.readFileSync(file, 'utf-8');

// 1. Initial State
assert.ok(
  code.includes("const [selectedGuru, setSelectedGuru] = useState<string>(isAdmin ? '' : (user?.nama || ''));"),
  'selectedGuru must initialize to empty string for Admin'
);

// 2. Stop Auto-selection of teachers[0]
assert.ok(
  code.includes("const initialGuru = selectedGuru || (isAdmin ? '' : (user?.nama || ''));"),
  'initialGuru must not fallback to teachers[0] in Admin mode'
);

// 3. Guru Select Default Option
assert.ok(
  code.includes('<option value="">-- Pilih Guru Pengampu --</option>'),
  'Guru select must render -- Pilih Guru Pengampu --'
);

// 4. Mapel Select Disabled & Prompt
assert.ok(
  code.includes('disabled={!selectedGuru}') &&
  code.includes('<option value="">-- Pilih guru pengampu terlebih dahulu --</option>'),
  'Mapel select must be disabled when !selectedGuru and prompt user'
);

// 5. Kelas Select Disabled & Prompt
assert.ok(
  code.includes('disabled={!selectedGuru || !selectedMapel}') &&
  code.includes('<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>'),
  'Kelas select must be disabled when !selectedGuru || !selectedMapel and prompt user'
);

// 6. Main Workspace Empty State Card
assert.ok(
  code.includes('isAdmin && !selectedGuru') &&
  code.includes('Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai.'),
  'Workspace must render empty state card with required prompt text'
);

// 7. Non-admin Read-only Badge Preserved
assert.ok(
  code.includes("{user?.nama || 'Guru Terpilih'}"),
  'Non-admin mode must retain read-only teacher badge'
);
```

### 5.2 Regression Command Runs
Execute in terminal:
1. `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts` (All 17 checks pass)
2. `npx tsx tests/forensic_gradebook_audit.test.ts` (All 24 checks pass)
3. `npx tsx tests/gradebook_unified_setup_flow.test.ts` (All 44 checks pass)
4. `npx tsc --noEmit` (Zero TypeScript compilation errors)

### 5.3 Invalidation Conditions
- If `selectedGuru` is initialized to `user?.nama` for Admin mode, invalidating the unselected start.
- If `teachers[0]` auto-selects on initial load for Admin, invalidating teacher-first flow.
- If Mapel or Kelas dropdowns are enabled when no teacher is selected.
- If the exact prompt text `"Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai."` is modified or omitted.
- If any existing test in `tests/gradebook_teacher_filter_ponytail.test.ts` fails.
