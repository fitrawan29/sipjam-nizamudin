# HANDOFF REPORT — REQUIREMENT R3 (PART 2): HIERARCHICAL CASCADING FILTERS & STRICT GRADE-LEVEL MATCHING
**Agent**: `explorer_m2_nov_2`  
**Date**: 2026-11-06T23:35:00Z  
**Scope**: Exact implementation blueprint for Requirement R3 - Part 2 in `src/components/GradebookView.tsx`:
- `syncTeacherAssignments` (lines 328–411)
- `handleSelectGuru` (lines 440–456)
- `handleSelectMapel` (lines 458–483)
- `handleSelectKelas` (lines 485–493)
- `parseTingkat` and `getSubjectTingkat` helpers (lines 224–225)
- `masterMapelList` typing & data retrieval (lines 313 & 908–912)

---

## 1. Observation

### 1.1 Current Architecture & Line Analysis in `src/components/GradebookView.tsx`

1. **Teacher Assignments Synchronization (`syncTeacherAssignments`, Lines 328–411)**:
   ```tsx
   328: const syncTeacherAssignments = useCallback((
   329:   targetGuruName: string,
   330:   assignmentsPool: { id?: string; guru_id?: string; user_id?: string; nama_guru: string; nip?: string; nama_mapel: string; kelas: string }[],
   331:   teachers: { id?: string; nama_guru: string; nip?: string; mata_pelajaran?: string }[],
   332:   fallbackMapels: { id?: string; nama_mapel: string }[],
   333:   fallbackClasses: string[],
   334:   prefMapel?: string,
   335:   prefKelas?: string
   336: ) => {
   337:   if (!targetGuruName && teachers.length === 0) return;
   338:   const effectiveGuru = targetGuruName || (teachers[0]?.nama_guru || user?.nama || '');
   ...
   383:   const distinctSubjects = Array.from(new Set(formattedMapels.map(m => m.nama_mapel).filter(Boolean)));
   384:   const activeMapel = (prefMapel && distinctSubjects.includes(prefMapel))
   385:     ? prefMapel
   386:     : (distinctSubjects[0] || '');
   387:   setSelectedMapel(activeMapel);
   388:
   389:   // Classes strictly for activeMapel
   390:   const matchingClasses = Array.from(new Set(
   391:     formattedMapels
   392:       .filter(m => !activeMapel || m.nama_mapel === activeMapel)
   393:       .map(m => m.kelas)
   394:       .filter(Boolean) as string[]
   395:   )).sort();
   396:
   397:   let targetClasses = matchingClasses;
   398:   if (targetClasses.length === 0) {
   399:     const allTeacherClasses = Array.from(new Set(
   400:       formattedMapels.map(m => m.kelas).filter(Boolean) as string[]
   401:     )).sort();
   402:     targetClasses = allTeacherClasses.length > 0 ? allTeacherClasses : fallbackClasses;
   403:   }
   404:
   405:   setKelasList(targetClasses);
   406:
   407:   const activeKelas = (prefKelas && targetClasses.includes(prefKelas))
   408:     ? prefKelas
   409:     : (targetClasses[0] || '');
   410:   setSelectedKelas(activeKelas);
   411: }, [user, isAdmin]);
   ```
   - **Flaw 1 (Class Leakage across Grade Levels)**: Lines 398–403 unconditionally fall back to `allTeacherClasses` or `fallbackClasses` (`masterClassesList`). If a teacher is assigned a Class XI subject (e.g., `Matematika Tingkat Lanjut XI`) without explicit class assignments, `targetClasses` receives all classes in the school (`X-A`, `X-B`, `XII-IPA`, etc.), completely bypassing grade-level isolation.
   - **Flaw 2 (Admin fallback when `targetGuruName` is empty)**: Line 338 falls back to `teachers[0]?.nama_guru`. If Admin resets the teacher selection or has not selected a teacher yet, it forces an unwanted auto-selection of the first teacher.

2. **Teacher Selection Handler (`handleSelectGuru`, Lines 440–456)**:
   ```tsx
   440: const handleSelectGuru = (newGuru: string) => {
   441:   if (Object.keys(dirtyGrades).length > 0) {
   442:     if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti guru pengampu? Perubahan belum disimpan akan hilang.')) {
   443:       return;
   444:     }
   445:   }
   446:   setSelectedGuru(newGuru);
   447:   syncTeacherAssignments(
   448:     newGuru,
   449:     allTeacherAssignments,
   450:     teachersList,
   451:     masterMapelList,
   452:     masterClassesList,
   453:     selectedMapel,
   454:     selectedKelas
   455:   );
   456: };
   ```
   - **Flaw 3 (State Carryover Collision)**: Lines 453–454 pass the current `selectedMapel` and `selectedKelas` as `prefMapel` and `prefKelas` to the new teacher. If the new teacher happens to have an assignment with the same generic mapel name, or if `prefKelas` matches, it attempts to retain the previous teacher's class instead of sanitizing state and aligning with the new teacher's actual assignment.
   - **Flaw 4 (Empty Selection Unhandled)**: If `newGuru` is empty string `""` (user chose `-- Pilih Guru Pengampu --`), it still runs `syncTeacherAssignments` instead of clearing `mapelList`, `kelasList`, `selectedMapel`, and `selectedKelas`.

3. **Subject Selection Handler (`handleSelectMapel`, Lines 458–483)**:
   ```tsx
   458: const handleSelectMapel = (newMapel: string) => {
   459:   if (Object.keys(dirtyGrades).length > 0) {
   460:     if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti mata pelajaran? Perubahan belum disimpan akan hilang.')) {
   461:       return;
   462:     }
   463:   }
   464:   setSelectedMapel(newMapel);
   465:
   466:   // Filter classes strictly to only classes assigned to current teacher for this mapel
   467:   const matchingClasses = Array.from(new Set(
   468:     mapelList.filter(m => m.nama_mapel === newMapel && m.kelas).map(m => m.kelas as string)
   469:   )).sort();
   470:
   471:   const targetClasses = matchingClasses.length > 0
   472:     ? matchingClasses
   473:     : (mapelList.some(m => m.kelas)
   474:         ? Array.from(new Set(mapelList.map(m => m.kelas).filter(Boolean) as string[])).sort()
   475:         : masterClassesList);
   476:
   477:   setKelasList(targetClasses);
   478:   if (!targetClasses.includes(selectedKelas)) {
   479:     if (targetClasses.length > 0) {
   480:       setSelectedKelas(targetClasses[0]);
   481:     }
   482:   }
   483: };
   ```
   - **Flaw 5 (Grade Leakage in Subject Switching)**: Lines 473–475 fallback to `allTeacherClasses` or `masterClassesList` without checking `targetTingkat`.
   - **Flaw 6 (Dangling `selectedKelas` on Empty Classes)**: Lines 478–482 only update `selectedKelas` if `targetClasses.length > 0`. If `targetClasses` is empty (`[]`), `selectedKelas` retains its old value instead of resetting to `''`.

### 1.2 Existing Tests & Symbol Invariants

In `tests/gradebook_teacher_filter_ponytail.test.ts`, the following exact symbols, signatures, and string literals are strictly asserted:
- `export function isTeacherMatch`
- `export function isAssignmentMatchTeacher`
- `const syncTeacherAssignments = useCallback(`
- `const handleSelectGuru = (newGuru: string) => {`
- `Object.keys(dirtyGrades).length > 0`
- `window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti guru pengampu? Perubahan belum disimpan akan hilang.')`
- `onChange={e => handleSelectGuru(e.target.value)}`
- `uniqueMapelList.length === 0 ? (` with `'Tidak ada mapel ditugaskan'`
- `kelasList.length === 0 ? (` with `'Tidak ada kelas ditugaskan'`
- `leftNip={teachersList.find(t => t.nama_guru === selectedGuru)?.nip || user?.nip}`

Running `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts` yields:
```
TOTAL CHECKS: 17 | PASSED: 17 | FAILED: 0
🎉 ALL GURU-SCOPED DAFTAR NILAI TESTS PASSED WITH 100% SUCCESS!
```

---

## 2. Logic Chain

### 2.1 From Grade-Level Leaks to Strict Normalization (`parseTingkat` & `getSubjectTingkat`)

1. **Step 1: Grade Normalization Contract**:
   Classes and subjects in Indonesian high schools follow distinct grade patterns:
   - Grade 10: `X`, `10`, `Kelas X`, `X-1`, `10A`, `Fase E`.
   - Grade 11: `XI`, `11`, `Kelas XI`, `XI-1`, `11B`, `XI Merdeka`.
   - Grade 12: `XII`, `12`, `Kelas XII`, `XII-IPA`, `12C`.
2. **Step 2: Word Boundary Regex Refinement**:
   Standard regex `/\b(x|10)\b/i` fails on alphanumeric strings like `10A` because both `0` and `A` are `\w` word characters.
   Therefore, the regex must support:
   - Word boundaries: `\b(xii|12)\b`
   - Class prefixes: `^(xii|12)[a-z0-9_-]` or `^(xii|12)\b`
   - Case-insensitive matching.
3. **Step 3: Extracting `targetTingkat`**:
   `getSubjectTingkat(mapelName, mapelsList)`:
   - First, attempts `parseTingkat(mapelName)`. If it returns `'10' | '11' | '12'`, that is the `targetTingkat`.
   - Checks Kurikulum Merdeka phase: `/\b(fase\s*e)\b/i.test(mapelName)` maps to `'10'`.
   - Second, if name has no grade (e.g., `'Matematika Tingkat Lanjut'`), it searches `mapelsList` (`masterMapelList`) for `kategori` (`'XI'`, `'11'`, `'X'`, etc.) and runs `parseTingkat(kategori)`.
   - If no grade level is specified anywhere (e.g. universal general subjects), returns `null`.
4. **Step 4: Strict Cascading Filter Rule**:
   `const targetClasses = candidateClasses.filter(kelas => targetTingkat ? parseTingkat(kelas) === targetTingkat : true);`
   - If `targetTingkat` is `'11'`, every class candidate MUST satisfy `parseTingkat(kelas) === '11'`.
   - Class 10 and Class 12 candidates are strictly purged.
   - If `targetTingkat` is `null`, all assigned classes are preserved.

### 2.2 Cascading Dropdown State Sanitization

1. **Teacher Change (`handleSelectGuru`)**:
   - If `!newGuru`: Admin selected `-- Pilih Guru Pengampu --`. Immediately set `selectedGuru = ''`, `mapelList = []`, `selectedMapel = ''`, `kelasList = []`, `selectedKelas = ''`, and exit.
   - If `newGuru` is valid: Pass `prefMapel = ''` and `prefKelas = ''` to `syncTeacherAssignments`.
   - `syncTeacherAssignments` populates `formattedMapels` for `newGuru`.
   - `activeMapel` automatically resolves to `distinctSubjects[0] || ''`.
   - `targetClasses` resolves strictly to classes assigned for `activeMapel` (and matching `targetTingkat`).
   - `activeKelas` resolves to `targetClasses[0] || ''`.
   - Result: Dropdown cascading is instantaneous, deterministic, and free of orphaned selections from prior teachers.
2. **Subject Change (`handleSelectMapel`)**:
   - If `!newMapel`: Immediately reset `selectedMapel = ''`, `kelasList = []`, `selectedKelas = ''`, and exit.
   - If `newMapel` is valid:
     - Detect `targetTingkat = getSubjectTingkat(newMapel, masterMapelList)`.
     - Filter `mapelList` matching `newMapel` and `targetTingkat`.
     - If empty, check teacher's other classes matching `targetTingkat`.
     - If still empty, fall back to `masterClassesList` strictly filtered by `targetTingkat`.
     - Set `kelasList = targetClasses`.
     - Set `selectedKelas = targetClasses.includes(selectedKelas) ? selectedKelas : (targetClasses[0] || '')`.

---

## 3. Caveats

1. **Collaboration with Explorer 1 & Explorer 3**:
   - Explorer 1 specifies the initial empty state for Admin mode (`selectedGuru = ""` default, Guru dropdown placeholder `-- Pilih Guru Pengampu --`, and disabled Mapel/Kelas selects when no teacher is selected).
   - Our implementation of `syncTeacherAssignments`, `handleSelectGuru`, and `handleSelectMapel` is fully defensive: if `targetGuruName` is empty and `isAdmin`, it cleanly exits without setting state.
2. **Universal Subjects Without Grade In Name**:
   - If a subject has no grade in its name or category (e.g. general subjects like `Pendidikan Agama`), `targetTingkat` resolves to `null`. In this case, `parseTingkat(kelas) === targetTingkat` is bypassed (`true`), allowing all classes assigned to that teacher. This prevents false-positive class filtering for non-grade-specific subjects.
3. **Preservation of PonyTail Test Invariants**:
   - The exact strings asserted in `tests/gradebook_teacher_filter_ponytail.test.ts` (e.g., function names, dirty grade confirmation text, fallback strings `'Tidak ada mapel ditugaskan'`, `'Tidak ada kelas ditugaskan'`) must remain verbatim.

---

## 4. Conclusion & Exact Implementation Blueprint

### 4.1 Exact Code Diffs & Blueprint for `src/components/GradebookView.tsx`

#### A. Add `parseTingkat` & `getSubjectTingkat` at Lines 224–225
```tsx
// Insert after isAssignmentMatchTeacher (line 224) and before export default function GradebookView (line 226):

/**
 * Normalizes and infers school grade (tingkat: '10' | '11' | '12' | 'Lainnya')
 * from subject name, category, or class name.
 */
export function parseTingkat(nama?: string | null): '10' | '11' | '12' | 'Lainnya' {
  const n = (nama || '').trim();
  if (/\b(xii|12)\b/i.test(n) || /^(xii|12)\b/i.test(n) || /^(xii|12)[a-z0-9_-]/i.test(n)) return '12';
  if (/\b(xi|11)\b/i.test(n) || /^(xi|11)\b/i.test(n) || /^(xi|11)[a-z0-9_-]/i.test(n)) return '11';
  if (/\b(x|10)\b/i.test(n) || /^(x|10)\b/i.test(n) || /^(x|10)[a-z0-9_-]/i.test(n)) return '10';
  return 'Lainnya';
}

/**
 * Extracts target grade-level (tingkat: '10' | '11' | '12' | null) from subject name or category.
 */
export function getSubjectTingkat(
  mapelName?: string | null,
  mapelsList?: { id?: string; nama_mapel: string; kategori?: string }[]
): '10' | '11' | '12' | null {
  if (!mapelName) return null;

  // 1. Direct name inference (e.g. "Matematika XI", "Fisika X", "Biologi 12")
  const fromName = parseTingkat(mapelName);
  if (fromName === '10' || fromName === '11' || fromName === '12') {
    return fromName;
  }

  // Check Kurikulum Merdeka Phase E (Grade 10)
  if (/\b(fase\s*e)\b/i.test(mapelName)) return '10';

  // 2. Kategori lookup in master mapel list
  if (mapelsList && mapelsList.length > 0) {
    const found = mapelsList.find(m => (m.nama_mapel || '').toLowerCase() === mapelName.toLowerCase());
    if (found?.kategori) {
      const fromKat = parseTingkat(found.kategori);
      if (fromKat === '10' || fromKat === '11' || fromKat === '12') {
        return fromKat;
      }
    }
  }

  return null;
}
```

#### B. Enhance `masterMapelList` State & Fetch at Lines 313 & 908–912
```tsx
// Line 313: Add kategori optional field to masterMapelList state
const [masterMapelList, setMasterMapelList] = useState<{ id?: string; nama_mapel: string; kategori?: string }[]>([]);

// Lines 908–912 in fetchMasterAssignments:
if (mData) {
  masterMapels = mData
    .filter(m => !isInvalidMapel(m.nama_mata_pelajaran || m.nama_mapel))
    .map(m => ({
      id: m.id,
      nama_mapel: m.nama_mata_pelajaran || m.nama_mapel || '',
      kategori: m.kategori || ''
    }));
  setMasterMapelList(masterMapels);
}
```

#### C. Upgrade `syncTeacherAssignments` at Lines 328–411
```tsx
// Replace syncTeacherAssignments definition (lines 328–411):
const syncTeacherAssignments = useCallback((
  targetGuruName: string,
  assignmentsPool: { id?: string; guru_id?: string; user_id?: string; nama_guru: string; nip?: string; nama_mapel: string; kelas: string }[],
  teachers: { id?: string; nama_guru: string; nip?: string; mata_pelajaran?: string }[],
  fallbackMapels: { id?: string; nama_mapel: string; kategori?: string }[],
  fallbackClasses: string[],
  prefMapel?: string,
  prefKelas?: string
) => {
  // If Admin and no teacher selected yet, clear selections and return immediately
  if (isAdmin && !targetGuruName) {
    setMapelList([]);
    setSelectedMapel('');
    setKelasList([]);
    setSelectedKelas('');
    return;
  }

  if (!targetGuruName && teachers.length === 0) return;
  const effectiveGuru = targetGuruName || (teachers[0]?.nama_guru || user?.nama || '');
  const currentTeacher = teachers.find(t => isTeacherMatch(t, effectiveGuru)) || {
    nama_guru: effectiveGuru,
    nip: user?.username || '',
    id: user?.id,
    mata_pelajaran: user?.mata_pelajaran || '',
  };

  // Filter teacher assignments
  let matched = assignmentsPool.filter(a => isAssignmentMatchTeacher(a, currentTeacher));
  // Non-admin pool is already queried per-teacher (nip/nama). If strict matching misses
  // (e.g. name format differs), use the official pool instead of the data_guru placeholder fallback.
  if (matched.length === 0 && !isAdmin) matched = assignmentsPool;

  // Fallback if teacher has no assignments in guru_mapel / jadwal_pelajaran
  if (matched.length === 0) {
    const rawMapel = (currentTeacher as any).mata_pelajaran;
    if (rawMapel && !isInvalidMapel(rawMapel)) {
      matched = [{
        id: 'fallback',
        guru_id: currentTeacher.id,
        nama_guru: currentTeacher.nama_guru,
        nip: currentTeacher.nip || '',
        nama_mapel: rawMapel,
        kelas: ''
      }];
    } else if (isAdmin && fallbackMapels.length > 0) {
      matched = fallbackMapels.map(m => ({
        id: m.id,
        guru_id: currentTeacher.id,
        nama_guru: currentTeacher.nama_guru,
        nip: currentTeacher.nip || '',
        nama_mapel: m.nama_mapel,
        kelas: ''
      }));
    }
  }

  const formattedMapels = matched.map(m => ({
    id: m.id,
    nama_mapel: m.nama_mapel,
    kelas: m.kelas || undefined,
  }));
  setMapelList(formattedMapels);

  const distinctSubjects = Array.from(new Set(formattedMapels.map(m => m.nama_mapel).filter(Boolean)));
  const activeMapel = (prefMapel && distinctSubjects.includes(prefMapel))
    ? prefMapel
    : (distinctSubjects[0] || '');
  setSelectedMapel(activeMapel);

  // Extract target grade level for activeMapel to enforce strict grade-level matching
  const targetTingkat = getSubjectTingkat(activeMapel, fallbackMapels);

  // Classes strictly for activeMapel
  let matchingClasses = Array.from(new Set(
    formattedMapels
      .filter(m => !activeMapel || m.nama_mapel === activeMapel)
      .map(m => m.kelas)
      .filter(Boolean) as string[]
  )).sort();

  // Enforce strict grade-level matching on matchingClasses
  if (targetTingkat) {
    matchingClasses = matchingClasses.filter(k => parseTingkat(k) === targetTingkat);
  }

  let targetClasses = matchingClasses;
  if (targetClasses.length === 0) {
    const allTeacherClasses = Array.from(new Set(
      formattedMapels.map(m => m.kelas).filter(Boolean) as string[]
    )).sort();

    const candidateClasses = allTeacherClasses.length > 0 ? allTeacherClasses : fallbackClasses;
    const filteredCandidates = targetTingkat
      ? candidateClasses.filter(k => parseTingkat(k) === targetTingkat)
      : candidateClasses;

    // If teacher's classes didn't match targetTingkat, fall back to master classes for that grade level
    if (filteredCandidates.length === 0 && targetTingkat && fallbackClasses.length > 0) {
      targetClasses = fallbackClasses.filter(k => parseTingkat(k) === targetTingkat);
    } else {
      targetClasses = filteredCandidates;
    }
  }

  setKelasList(targetClasses);

  const activeKelas = (prefKelas && targetClasses.includes(prefKelas))
    ? prefKelas
    : (targetClasses[0] || '');
  setSelectedKelas(activeKelas);
}, [user, isAdmin]);
```

#### D. Upgrade `handleSelectGuru` at Lines 440–456
```tsx
// Replace handleSelectGuru (lines 440–456):
const handleSelectGuru = (newGuru: string) => {
  if (Object.keys(dirtyGrades).length > 0) {
    if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti guru pengampu? Perubahan belum disimpan akan hilang.')) {
      return;
    }
  }
  setSelectedGuru(newGuru);
  if (!newGuru) {
    setMapelList([]);
    setSelectedMapel('');
    setKelasList([]);
    setSelectedKelas('');
    return;
  }
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
```

#### E. Upgrade `handleSelectMapel` at Lines 458–483
```tsx
// Replace handleSelectMapel (lines 458–483):
const handleSelectMapel = (newMapel: string) => {
  if (Object.keys(dirtyGrades).length > 0) {
    if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti mata pelajaran? Perubahan belum disimpan akan hilang.')) {
      return;
    }
  }
  if (!newMapel) {
    setSelectedMapel('');
    setKelasList([]);
    setSelectedKelas('');
    return;
  }
  setSelectedMapel(newMapel);

  const targetTingkat = getSubjectTingkat(newMapel, masterMapelList);

  // Filter classes strictly to only classes assigned to current teacher for this mapel
  let matchingClasses = Array.from(new Set(
    mapelList.filter(m => m.nama_mapel === newMapel && m.kelas).map(m => m.kelas as string)
  )).sort();

  if (targetTingkat) {
    matchingClasses = matchingClasses.filter(k => parseTingkat(k) === targetTingkat);
  }

  let targetClasses = matchingClasses;
  if (targetClasses.length === 0) {
    const allTeacherClasses = Array.from(new Set(
      mapelList.map(m => m.kelas).filter(Boolean) as string[]
    )).sort();

    const candidateClasses = allTeacherClasses.length > 0 ? allTeacherClasses : masterClassesList;
    const filteredCandidates = targetTingkat
      ? candidateClasses.filter(k => parseTingkat(k) === targetTingkat)
      : candidateClasses;

    if (filteredCandidates.length === 0 && targetTingkat && masterClassesList.length > 0) {
      targetClasses = masterClassesList.filter(k => parseTingkat(k) === targetTingkat);
    } else {
      targetClasses = filteredCandidates;
    }
  }

  setKelasList(targetClasses);
  if (!targetClasses.includes(selectedKelas)) {
    setSelectedKelas(targetClasses[0] || '');
  }
};
```

---

## 5. Verification Method

To verify the implementation blueprint independently:

1. **Static Invariant & PonyTail Regression Test**:
   ```powershell
   npx tsx tests/gradebook_teacher_filter_ponytail.test.ts
   ```
   *Expected*: All 17 checks pass without regression.

2. **Dedicated Cascading & Strict Grade-Level Matching Verification**:
   Verify via node assertion test that:
   - `parseTingkat('Matematika XI') === '11'`
   - `parseTingkat('Fisika X') === '10'`
   - `parseTingkat('Kimia XII') === '12'`
   - `parseTingkat('XI Merdeka') === '11'`
   - `parseTingkat('10A') === '10'`
   - `getSubjectTingkat('Matematika XI', []) === '11'`
   - When a Class XI subject is selected, class candidates `['X-1', 'XI-1', 'XII-1']` are strictly filtered to `['XI-1']`, proving zero cross-grade leakage.
   - When teacher is switched, `prefMapel` and `prefKelas` are reset cleanly to `''`, preventing state carryover.
   - When `-- Pilih Guru Pengampu --` (`""`) is chosen, `selectedMapel` and `selectedKelas` reset to `""` and lists are emptied.

3. **Production Build & Type Check**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
   *Expected*: Zero TypeScript compilation errors and successful production build.
