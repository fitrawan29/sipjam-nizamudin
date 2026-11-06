# HANDOFF REPORT — REQUIREMENT R3 PART 3: INVARIANT PRESERVATION, DIRTY GRADES SAFEGUARDS & DEDICATED UNIT TEST DESIGN

**Agent**: `explorer_m2_nov_3`  
**Date**: 2026-11-06T23:35:00Z  
**Scope**: Invariant Preservation, Dirty Grades Safeguards, and Dedicated Unit Test Specification for Requirement R3 (Buku Nilai Mapel Cascading Selection).  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_3`  

---

## 1. Observation

### 1.1 Existing Unit Test Invariants in `tests/gradebook_teacher_filter_ponytail.test.ts`
Direct inspection of `tests/gradebook_teacher_filter_ponytail.test.ts` (lines 1–220) and running `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts` (17 checks passed) identified the following strict static and dynamic invariants:

1. **Required Export Symbols**:
   - `export function isTeacherMatch` (Line 166: `assert.ok(code.includes('export function isTeacherMatch'))`).
   - `export function isAssignmentMatchTeacher` (Line 167: `assert.ok(code.includes('export function isAssignmentMatchTeacher'))`).
   - Implemented in `src/components/GradebookView.tsx`: lines 174–224.
2. **Required Callback Declarations**:
   - `const syncTeacherAssignments = useCallback(` (Line 171: `assert.ok(code.includes('const syncTeacherAssignments = useCallback('))`).
   - `const handleSelectGuru = (newGuru: string) => {` (Line 175: `assert.ok(code.includes('const handleSelectGuru = (newGuru: string) => {'))`).
3. **Required Dirty Grades Check & Confirmation**:
   - `Object.keys(dirtyGrades).length > 0` (Line 176).
   - `window.confirm(` (Line 177).
4. **Required JSX Signatures and Select Element Wiring**:
   - `onChange={e => handleSelectGuru(e.target.value)}` (Line 182).
   - `uniqueMapelList.length === 0 ? (` and `'Tidak ada mapel ditugaskan'` (Line 189–191).
   - `kelasList.length === 0 ? (` and `'Tidak ada kelas ditugaskan'` (Line 197–199).
   - `leftNip={teachersList.find(t => t.nama_guru === selectedGuru)?.nip || user?.nip}` (Line 205).

### 1.2 Additional Invariant Detected in `tests/mata_pelajaran_kelas_paralel_isolation.test.ts`
When inspecting all test suites executed by `npm test` (`package.json` line 10), running `npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts` revealed two currently failing checks in `GradebookView.tsx`:
```
✘ FAIL: handleSelectKelas preserves selectedMapel when switching between parallel classes that both teach it
✘ FAIL: handleSelectMapel keeps selectedKelas when the current parallel class teaches the newly selected mapel
```
- In `tests/mata_pelajaran_kelas_paralel_isolation.test.ts` lines 86–93:
  - Check 2.2 asserts: `gbSrc.includes('stillTeaches') && gbSrc.includes('handleSelectKelas')`.
  - Check 2.3 asserts: `gbSrc.includes('currentClassValid') && gbSrc.includes('handleSelectMapel')`.
- In `src/components/GradebookView.tsx` (lines 458–492), `stillTeaches` and `currentClassValid` were previously omitted or refactored out. Restoring these two variable patterns inside `handleSelectKelas` and `handleSelectMapel` is required for `npm test` to achieve 100% pass rate.

### 1.3 Dirty Grades State Management in `src/components/GradebookView.tsx`
- **State Declaration**: Line 423: `const [dirtyGrades, setDirtyGrades] = useState<Record<string, boolean>>({});`.
- **Browser Unload Guard**: Lines 428–437: Listens to `beforeunload` and calls `e.preventDefault()` when `Object.keys(dirtyGrades).length > 0`.
- **Handlers Safeguards**: Lines 440–492:
  - `handleSelectGuru`: checks `Object.keys(dirtyGrades).length > 0`, prompts with `window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti guru pengampu? Perubahan belum disimpan akan hilang.')`. If cancelled, returns early.
  - `handleSelectMapel`: checks `Object.keys(dirtyGrades).length > 0`, prompts with `window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti mata pelajaran? Perubahan belum disimpan akan hilang.')`. If cancelled, returns early.
  - `handleSelectKelas`: checks `Object.keys(dirtyGrades).length > 0`, prompts with `window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti kelas? Perubahan belum disimpan akan hilang.')`. If cancelled, returns early.
- **Deficiency Observed**: When user confirms changing teacher, subject, or class, `setDirtyGrades({})` was not called directly inside the handler before switching. If `fetchGrades` takes time or is delayed, stale dirty flags remained in memory. Explicitly resetting `setDirtyGrades({})` upon user confirmation ensures state hygiene.

### 1.4 Grade-Level Parsing via `parseTingkat`
- Located in `src/components/AdminKelasView.tsx` lines 53–59:
  ```ts
  export function parseTingkat(nama: string): '10' | '11' | '12' | 'Lainnya' {
    const n = (nama || '').trim();
    if (/\b(xii|12)\b/i.test(n)) return '12';
    if (/\b(xi|11)\b/i.test(n)) return '11';
    if (/\b(x|10)\b/i.test(n)) return '10';
    return 'Lainnya';
  }
  ```
- Tested against representative inputs:
  - `parseTingkat('XI Matematika Tingkat Lanjut')` -> `'11'`
  - `parseTingkat('XI MIPA 1')` -> `'11'`
  - `parseTingkat('Dasar Program X RPL')` -> `'10'`
  - `parseTingkat('X RPL 2')` -> `'10'`
  - `parseTingkat('XII Kimia')` -> `'12'`
  - `parseTingkat('Bahasa Sunda')` -> `'Lainnya'`
- Confirmed that `parseTingkat` seamlessly parses both mata pelajaran names and class names.

---

## 2. Logic Chain

1. **Premise**: Requirement R3 Part 3 requires preserving existing unit test invariants, ensuring dirty grades safeguards across all selection switches, and establishing a dedicated unit test suite proving zero cross-grade leakage and teacher-first selection.
2. **From Observation 1.1 & 1.2**:
   - `tests/gradebook_teacher_filter_ponytail.test.ts` performs exact string matching against the source code of `src/components/GradebookView.tsx`.
   - Modifying handler names, signature structures, or fallback string literals will fail existing CI regression gates.
   - `tests/mata_pelajaran_kelas_paralel_isolation.test.ts` additionally requires `stillTeaches` in `handleSelectKelas` and `currentClassValid` in `handleSelectMapel`.
   - **Deduction**: The implementation blueprint must retain the exact syntax strings:
     - `export function isTeacherMatch`
     - `export function isAssignmentMatchTeacher`
     - `const syncTeacherAssignments = useCallback(`
     - `const handleSelectGuru = (newGuru: string) => {`
     - `Object.keys(dirtyGrades).length > 0`
     - `window.confirm(`
     - `onChange={e => handleSelectGuru(e.target.value)}`
     - `uniqueMapelList.length === 0 ? (`
     - `'Tidak ada mapel ditugaskan'`
     - `kelasList.length === 0 ? (`
     - `'Tidak ada kelas ditugaskan'`
     - `leftNip={teachersList.find(t => t.nama_guru === selectedGuru)?.nip || user?.nip}`
     - `stillTeaches` in `handleSelectKelas`
     - `currentClassValid` in `handleSelectMapel`
3. **From Observation 1.3**:
   - In `handleSelectGuru`, `handleSelectMapel`, and `handleSelectKelas`, prompt cancellation (`window.confirm(...) === false`) preserves current selection and retains uncommitted dirty inputs.
   - Prompt confirmation (`window.confirm(...) === true`) means the user explicitly approves discarding unsaved grades.
   - **Deduction**: Handlers must call `setDirtyGrades({})` on confirm so that downstream components start with clean state and avoid triggering accidental `beforeunload` warnings.
4. **From Observation 1.4**:
   - Currently, `syncTeacherAssignments` and `handleSelectMapel` fallback to `masterClassesList` (all classes across grades 10, 11, and 12) if a teacher's subject has no explicit class in `guru_mapel`.
   - If a subject belongs to grade 11 (e.g. "XI Matematika Tingkat Lanjut"), falling back to `masterClassesList` leaks grade 10 and grade 12 classes into the dropdown.
   - **Deduction**: Incorporating `parseTingkat(activeMapel)` ensures that if `mapelTingkat !== 'Lainnya'`, any assigned or fallback class is filtered by `parseTingkat(cls) === mapelTingkat`. This mathematically eliminates cross-grade leakage.
5. **From Requirement R3 Flow**:
   - For Admin: Initial state must be `selectedGuru = ''`. Mapel and Kelas dropdowns must be disabled (`disabled={isAdmin && !selectedGuru}`) and display placeholder prompts (`-- Pilih Guru Pengampu --`, `Pilih guru pengampu terlebih dahulu`).
   - For Non-Admin (Guru): Initial state is `user?.nama`. Non-admin sees a read-only badge, their assigned subjects and classes load automatically, and read-only mode is 100% preserved.

---

## 3. Caveats

1. **AST String-Matching Sensitivity**:
   - Existing test suites use literal string scanning (`code.includes(...)`). Do not refactor `handleSelectGuru` into `function handleSelectGuru` or arrow callback wrapped inside `useCallback`, as that would break line 175 of the ponytail test.
2. **Subject Titles Without Explicit Grade Level**:
   - Some subjects (e.g., "Pendidikan Agama", "PJOK", "Bahasa Indonesia") do not specify grade levels in their titles (`parseTingkat` returns `'Lainnya'`).
   - For these subjects, class cascading relies strictly on the teacher's assignments in `guru_mapel` and `jadwal_pelajaran`. Only if no assignments exist does it fall back to school classes, preserving existing flexibility for cross-grade general subjects.
3. **Multi-Tenant Scoping**:
   - Master data queries in `GradebookView.tsx` are filtered by `sekolah_id`. Cascading logic must operate on the pre-filtered multi-tenant datasets.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Exact Code Diffs for `src/components/GradebookView.tsx`

#### Blueprint 1: Import `parseTingkat`
At line 13 of `src/components/GradebookView.tsx`:
```tsx
// BEFORE:
import { isInvalidMapel } from '@/lib/dataIntegrityGuard';

// AFTER:
import { isInvalidMapel } from '@/lib/dataIntegrityGuard';
import { parseTingkat } from './AdminKelasView';
```

#### Blueprint 2: Admin Initial Selection State
At line 275 of `src/components/GradebookView.tsx`:
```tsx
// BEFORE:
  const [selectedGuru, setSelectedGuru] = useState<string>(user?.nama || '');
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('');

// AFTER:
  const [selectedGuru, setSelectedGuru] = useState<string>(isAdmin ? '' : (user?.nama || ''));
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('');
```

#### Blueprint 3: `syncTeacherAssignments` with `parseTingkat` Zero-Leakage Filtering
Lines 383–411 of `src/components/GradebookView.tsx`:
```tsx
// BEFORE:
    const distinctSubjects = Array.from(new Set(formattedMapels.map(m => m.nama_mapel).filter(Boolean)));
    const activeMapel = (prefMapel && distinctSubjects.includes(prefMapel))
      ? prefMapel
      : (distinctSubjects[0] || '');
    setSelectedMapel(activeMapel);

    // Classes strictly for activeMapel
    const matchingClasses = Array.from(new Set(
      formattedMapels
        .filter(m => !activeMapel || m.nama_mapel === activeMapel)
        .map(m => m.kelas)
        .filter(Boolean) as string[]
    )).sort();

    let targetClasses = matchingClasses;
    if (targetClasses.length === 0) {
      const allTeacherClasses = Array.from(new Set(
        formattedMapels.map(m => m.kelas).filter(Boolean) as string[]
      )).sort();
      targetClasses = allTeacherClasses.length > 0 ? allTeacherClasses : fallbackClasses;
    }

    setKelasList(targetClasses);

    const activeKelas = (prefKelas && targetClasses.includes(prefKelas))
      ? prefKelas
      : (targetClasses[0] || '');
    setSelectedKelas(activeKelas);

// AFTER:
    const distinctSubjects = Array.from(new Set(formattedMapels.map(m => m.nama_mapel).filter(Boolean)));
    const activeMapel = (prefMapel && distinctSubjects.includes(prefMapel))
      ? prefMapel
      : (isAdmin && !targetGuruName ? '' : (distinctSubjects[0] || ''));
    setSelectedMapel(activeMapel);

    // Classes strictly for activeMapel
    const matchingClasses = Array.from(new Set(
      formattedMapels
        .filter(m => !activeMapel || m.nama_mapel === activeMapel)
        .map(m => m.kelas)
        .filter(Boolean) as string[]
    )).sort();

    const mapelTingkat = activeMapel ? parseTingkat(activeMapel) : 'Lainnya';
    let targetClasses = matchingClasses;
    if (mapelTingkat !== 'Lainnya') {
      targetClasses = matchingClasses.filter(c => parseTingkat(c) === mapelTingkat);
    }

    if (targetClasses.length === 0 && activeMapel) {
      if (mapelTingkat !== 'Lainnya') {
        const teacherTingkatClasses = Array.from(new Set(
          formattedMapels.map(m => m.kelas).filter(Boolean) as string[]
        )).filter(c => parseTingkat(c) === mapelTingkat).sort();
        targetClasses = teacherTingkatClasses.length > 0
          ? teacherTingkatClasses
          : fallbackClasses.filter(c => parseTingkat(c) === mapelTingkat).sort();
      } else {
        const allTeacherClasses = Array.from(new Set(
          formattedMapels.map(m => m.kelas).filter(Boolean) as string[]
        )).sort();
        targetClasses = allTeacherClasses.length > 0 ? allTeacherClasses : fallbackClasses;
      }
    } else if (!activeMapel) {
      targetClasses = [];
    }

    setKelasList(targetClasses);

    const activeKelas = (prefKelas && targetClasses.includes(prefKelas))
      ? prefKelas
      : (targetClasses[0] || '');
    setSelectedKelas(activeKelas);
```

#### Blueprint 4: Filter Handlers with Dirty Guards, Reset & Parallel Isolation Keywords
Lines 440–493 of `src/components/GradebookView.tsx`:
```tsx
// BEFORE:
  // Safe Filter Selection Handlers guarding unsaved grade changes
  const handleSelectGuru = (newGuru: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti guru pengampu? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setSelectedGuru(newGuru);
    syncTeacherAssignments(
      newGuru,
      allTeacherAssignments,
      teachersList,
      masterMapelList,
      masterClassesList,
      selectedMapel,
      selectedKelas
    );
  };

  const handleSelectMapel = (newMapel: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti mata pelajaran? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setSelectedMapel(newMapel);

    // Filter classes strictly to only classes assigned to current teacher for this mapel
    const matchingClasses = Array.from(new Set(
      mapelList.filter(m => m.nama_mapel === newMapel && m.kelas).map(m => m.kelas as string)
    )).sort();

    const targetClasses = matchingClasses.length > 0
      ? matchingClasses
      : (mapelList.some(m => m.kelas)
          ? Array.from(new Set(mapelList.map(m => m.kelas).filter(Boolean) as string[])).sort()
          : masterClassesList);

    setKelasList(targetClasses);
    if (!targetClasses.includes(selectedKelas)) {
      if (targetClasses.length > 0) {
        setSelectedKelas(targetClasses[0]);
      }
    }
  };

  const handleSelectKelas = (newKelas: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti kelas? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setSelectedKelas(newKelas);
  };

// AFTER:
  // Safe Filter Selection Handlers guarding unsaved grade changes
  const handleSelectGuru = (newGuru: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti guru pengampu? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setDirtyGrades({});
    setSelectedGuru(newGuru);
    if (!newGuru) {
      setSelectedMapel('');
      setSelectedKelas('');
      setMapelList([]);
      setKelasList([]);
      return;
    }
    setSelectedMapel('');
    setSelectedKelas('');
    syncTeacherAssignments(
      newGuru,
      allTeacherAssignments,
      teachersList,
      masterMapelList,
      masterClassesList,
      '',
      ''
    );
  };

  const handleSelectMapel = (newMapel: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti mata pelajaran? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setDirtyGrades({});
    setSelectedMapel(newMapel);

    if (!newMapel) {
      setSelectedKelas('');
      setKelasList([]);
      return;
    }

    const currentClassValid = mapelList.some(
      m => m.nama_mapel === newMapel && m.kelas === selectedKelas
    );

    // Filter classes strictly to only classes assigned to current teacher for this mapel
    const matchingClasses = Array.from(new Set(
      mapelList.filter(m => m.nama_mapel === newMapel && m.kelas).map(m => m.kelas as string)
    )).sort();

    const mapelTingkat = parseTingkat(newMapel);
    let targetClasses: string[] = [];
    if (matchingClasses.length > 0) {
      targetClasses = mapelTingkat !== 'Lainnya'
        ? matchingClasses.filter(c => parseTingkat(c) === mapelTingkat)
        : matchingClasses;
    }

    if (targetClasses.length === 0) {
      if (mapelTingkat !== 'Lainnya') {
        const teacherTingkatClasses = Array.from(new Set(
          mapelList.map(m => m.kelas).filter(Boolean) as string[]
        )).filter(c => parseTingkat(c) === mapelTingkat).sort();
        targetClasses = teacherTingkatClasses.length > 0
          ? teacherTingkatClasses
          : masterClassesList.filter(c => parseTingkat(c) === mapelTingkat).sort();
      } else {
        targetClasses = mapelList.some(m => m.kelas)
          ? Array.from(new Set(mapelList.map(m => m.kelas).filter(Boolean) as string[])).sort()
          : masterClassesList;
      }
    }

    setKelasList(targetClasses);
    if (!currentClassValid || !targetClasses.includes(selectedKelas)) {
      setSelectedKelas(targetClasses.length > 0 ? targetClasses[0] : '');
    }
  };

  const handleSelectKelas = (newKelas: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti kelas? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setDirtyGrades({});
    setSelectedKelas(newKelas);
    const stillTeaches = mapelList.some(
      m => m.nama_mapel === selectedMapel && (!m.kelas || m.kelas === newKelas)
    );
    if (!stillTeaches) {
      const firstInClass = mapelList.find(m => !m.kelas || m.kelas === newKelas);
      if (firstInClass && firstInClass.nama_mapel) {
        setSelectedMapel(firstInClass.nama_mapel);
      }
    }
  };
```

#### Blueprint 5: Initial Load Teacher Resolution in `fetchMasterAssignments`
Lines 962–977 of `src/components/GradebookView.tsx`:
```tsx
// BEFORE:
        // Determine initial guru
        const initialGuru = selectedGuru || (isAdmin ? (teachers[0]?.nama_guru || '') : (user?.nama || ''));
        if (!selectedGuru && initialGuru) {
          setSelectedGuru(initialGuru);
        }

        // Apply filtering for initial teacher
        syncTeacherAssignments(
          initialGuru,
          assignments,
          teachers,
          masterMapels,
          masterClasses,
          selectedMapel,
          selectedKelas
        );

// AFTER:
        // Determine initial guru
        if (isAdmin) {
          setSelectedGuru('');
          setSelectedMapel('');
          setSelectedKelas('');
          setMapelList([]);
          setKelasList([]);
        } else {
          const initialGuru = selectedGuru || user?.nama || '';
          if (!selectedGuru && initialGuru) {
            setSelectedGuru(initialGuru);
          }
          syncTeacherAssignments(
            initialGuru,
            assignments,
            teachers,
            masterMapels,
            masterClasses,
            selectedMapel,
            selectedKelas
          );
        }
```

#### Blueprint 6: Dropdown Controls JSX with Placeholder & Invariants
Lines 2700–2770 of `src/components/GradebookView.tsx`:
```tsx
          {/* Guru Filter (Admin Mode only) */}
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
                <option value="">-- Pilih Guru Pengampu --</option>
                {teachersList.map((g, idx) => (
                  <option key={idx} value={g.nama_guru}>
                    {g.nama_guru}
                  </option>
                ))}
              </select>
            </div>
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

          {/* Mapel Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
              Mata Pelajaran
            </label>
            <select
              value={selectedMapel}
              onChange={e => handleSelectMapel(e.target.value)}
              disabled={isAdmin && !selectedGuru}
              className={`w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none ${isAdmin && !selectedGuru ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isAdmin && !selectedGuru ? (
                <option value="">Pilih guru pengampu terlebih dahulu</option>
              ) : uniqueMapelList.length === 0 ? (
                <option value="">Tidak ada mapel ditugaskan</option>
              ) : (
                <>
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {uniqueMapelList.map((m, idx) => (
                    <option key={idx} value={m.nama_mapel}>
                      {m.nama_mapel}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Kelas Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
              Kelas
            </label>
            <select
              value={selectedKelas}
              onChange={e => handleSelectKelas(e.target.value)}
              disabled={isAdmin && (!selectedGuru || !selectedMapel)}
              className={`w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none ${isAdmin && (!selectedGuru || !selectedMapel) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isAdmin && !selectedGuru ? (
                <option value="">Pilih guru pengampu terlebih dahulu</option>
              ) : !selectedMapel ? (
                <option value="">Pilih mata pelajaran terlebih dahulu</option>
              ) : kelasList.length === 0 ? (
                <option value="">Tidak ada kelas ditugaskan</option>
              ) : (
                kelasList.map((k, idx) => (
                  <option key={idx} value={k}>
                    {k}
                  </option>
                ))
              )}
            </select>
          </div>
```

---

### 4.2 Dedicated Unit Test Suite Blueprint: `tests/gradebook_cascading_selection.test.ts`

The dedicated unit test file is created and fully verified (19 checks passed) at:  
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_3\proposed_gradebook_cascading_selection.test.ts`.

It must be deployed to:  
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\tests\gradebook_cascading_selection.test.ts`.

**Suite Structure**:
1. **Suite 1: Static Invariant & Ponytail Test Compatibility (7 checks)**:
   - Validates `isTeacherMatch` and `isAssignmentMatchTeacher` exports.
   - Validates `onChange={e => handleSelectGuru(e.target.value)}`.
   - Validates `uniqueMapelList.length === 0 ? (` and `'Tidak ada mapel ditugaskan'`.
   - Validates `kelasList.length === 0 ? (` and `'Tidak ada kelas ditugaskan'`.
   - Validates `dirtyGrades` check and `window.confirm(` in `handleSelectGuru`.
   - Validates `PrintSignature` dynamic binding to `selectedGuru`.
2. **Suite 2: Admin Initial Selection State & Prompt Enforcement (2 checks)**:
   - Enforces `selectedGuru === ''` initially in Admin mode, disabling Mapel and Kelas selects.
   - Verifies Non-Admin (Guru) mode locks to `user.nama` with enabled selects.
3. **Suite 3: Dynamic Teacher Selection & Mapel Cascading (3 checks)**:
   - Verifies teacher selection exposes strictly assigned subjects.
   - Verifies teacher with no assignments gracefully returns empty list triggering fallback option.
4. **Suite 4: Dynamic Mapel -> Kelas Cascading with `parseTingkat` Zero-Leakage (3 checks)**:
   - Proves subject "XI Matematika Tingkat Lanjut" exposes strictly Grade 11 classes (`parseTingkat === '11'`).
   - Asserts zero leakage of Grade 10 or 12 classes (`classes.some(k => parseTingkat(k) === '10') === false`).
   - Proves fallback scenario when teacher has unassigned class: `masterClassesList` is strictly filtered by `parseTingkat(mapel)`, preventing cross-grade contamination.
5. **Suite 5: Dirty Grades Safeguard Simulation (4 checks)**:
   - Proves prompt cancellation preserves `selectedGuru`, `selectedMapel`, and `selectedKelas`, keeping dirty grades in memory.
   - Proves prompt confirmation allows transition and cleanly resets `dirtyGrades`.

---

## 5. Verification Method

To independently verify this blueprint:

1. **Verify Existing Invariants**:
   ```powershell
   npx tsx tests/gradebook_teacher_filter_ponytail.test.ts
   ```
   *Expected Result*: All 17 checks pass.

2. **Verify Proposed Cascading & Safeguard Test Suite**:
   ```powershell
   npx tsx .agents/teamwork/explorer_m2_nov_3/proposed_gradebook_cascading_selection.test.ts
   ```
   *Expected Result*: All 19 checks pass.

3. **Verify Parallel Class Isolation Invariant**:
   Once the builder updates `GradebookView.tsx` with `stillTeaches` and `currentClassValid`:
   ```powershell
   npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts
   ```
   *Expected Result*: All 15 checks pass (100%).

4. **Verify TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Result*: Exits with code 0.
