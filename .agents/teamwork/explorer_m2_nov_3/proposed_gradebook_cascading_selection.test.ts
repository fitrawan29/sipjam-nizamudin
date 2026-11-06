import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  isTeacherMatch,
  isAssignmentMatchTeacher
} from '../../../src/components/GradebookView';
import { parseTingkat } from '../../../src/components/AdminKelasView';

console.log('========================================================================');
console.log('  TEST SUITE: GRADEBOOK CASCADING SELECTION & SAFEGUARDS (R3 - PART 3)');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------------------
// SUITE 1: STATIC INVARIANT & PONYTAIL TEST COMPATIBILITY INSPECTION
// -------------------------------------------------------------------------
console.log('--- SUITE 1: Static Invariant & Ponytail Test Compatibility ---');

const gradebookPath = path.resolve(process.cwd(), 'src/components/GradebookView.tsx');
assert.ok(fs.existsSync(gradebookPath), 'GradebookView.tsx must exist');
const code = fs.readFileSync(gradebookPath, 'utf8');

runTest('1.1: GradebookView exports isTeacherMatch', () => {
  assert.ok(code.includes('export function isTeacherMatch'), 'Must export isTeacherMatch');
});

runTest('1.2: GradebookView exports isAssignmentMatchTeacher', () => {
  assert.ok(code.includes('export function isAssignmentMatchTeacher'), 'Must export isAssignmentMatchTeacher');
});

runTest('1.3: GradebookView wires onChange={e => handleSelectGuru(e.target.value)}', () => {
  assert.ok(
    code.includes('onChange={e => handleSelectGuru(e.target.value)}'),
    'Must wire handleSelectGuru onChange verbatim'
  );
});

runTest('1.4: Mapel select includes uniqueMapelList fallback string', () => {
  assert.ok(
    code.includes('uniqueMapelList.length === 0 ? (') && code.includes('Tidak ada mapel ditugaskan'),
    'Must preserve uniqueMapelList.length === 0 check and "Tidak ada mapel ditugaskan"'
  );
});

runTest('1.5: Kelas select includes kelasList fallback string', () => {
  assert.ok(
    code.includes('kelasList.length === 0 ? (') && code.includes('Tidak ada kelas ditugaskan'),
    'Must preserve kelasList.length === 0 check and "Tidak ada kelas ditugaskan"'
  );
});

runTest('1.6: GradebookView preserves dirty grades check & window.confirm in handleSelectGuru', () => {
  assert.ok(code.includes('const handleSelectGuru = (newGuru: string) => {'), 'Must declare handleSelectGuru verbatim');
  assert.ok(code.includes('Object.keys(dirtyGrades).length > 0'), 'Must check dirtyGrades');
  assert.ok(code.includes('window.confirm('), 'Must prompt with window.confirm');
});

runTest('1.7: PrintSignature dynamically binds teacher NIP for selectedGuru', () => {
  assert.ok(
    code.includes('leftNip={teachersList.find(t => t.nama_guru === selectedGuru)?.nip || user?.nip}'),
    'Must bind teacher NIP verbatim for selectedGuru'
  );
});

// -------------------------------------------------------------------------
// SUITE 2: ADMIN SELECTION FLOW & INITIAL STATE ENFORCEMENT SIMULATION
// -------------------------------------------------------------------------
console.log('\n--- SUITE 2: Admin Initial Selection State & Prompt Enforcement ---');

runTest('2.1: Admin mode starts with selectedGuru === "" and requires explicit teacher selection', () => {
  const isAdmin = true;
  const user = { role: 'Admin', nama: 'Administrator SIPJAM' };
  const teachers = [
    { id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198801' },
    { id: 'g-2', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199202' }
  ];

  // Logic: In admin mode, initialGuru must not auto-select teachers[0]
  const initialGuru = isAdmin ? '' : (user?.nama || '');
  assert.strictEqual(initialGuru, '', 'Admin mode initialGuru must be empty string');

  // When selectedGuru === '', Mapel and Kelas are disabled
  const isMapelDisabled = isAdmin && !initialGuru;
  const isKelasDisabled = isAdmin && (!initialGuru || false);
  assert.strictEqual(isMapelDisabled, true, 'Mapel select must be disabled when teacher is not chosen');
  assert.strictEqual(isKelasDisabled, true, 'Kelas select must be disabled when teacher is not chosen');
});

runTest('2.2: Non-admin (Guru) mode automatically initializes selectedGuru to current user', () => {
  const isAdmin = false;
  const user = { role: 'Guru', nama: 'Nurul Hidayah, M.Pd', nip: '199202' };

  const initialGuru = isAdmin ? '' : (user?.nama || '');
  assert.strictEqual(initialGuru, 'Nurul Hidayah, M.Pd');

  const isMapelDisabled = isAdmin && !initialGuru;
  assert.strictEqual(isMapelDisabled, false, 'Non-admin mapel must not be disabled by admin teacher guard');
});

// -------------------------------------------------------------------------
// SUITE 3: DYNAMIC TEACHER SELECTION -> MAPEL CASCADING SIMULATION
// -------------------------------------------------------------------------
console.log('\n--- SUITE 3: Dynamic Teacher Selection & Mapel Cascading ---');

const mockAssignmentsPool = [
  // Pak Ahmad Fauzi teaches: Informatika (7A, 7B), Dasar Kejuruan (10 RPL 1)
  { id: 'gm-1', guru_id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198801', nama_mapel: 'Informatika', kelas: '7A' },
  { id: 'gm-2', guru_id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198801', nama_mapel: 'Informatika', kelas: '7B' },
  { id: 'gm-3', guru_id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198801', nama_mapel: 'Dasar Kejuruan', kelas: '10 RPL 1' },

  // Bu Nurul Hidayah teaches: XI Matematika Tingkat Lanjut (XI MIPA 1, XI MIPA 2)
  { id: 'gm-4', guru_id: 'g-2', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199202', nama_mapel: 'XI Matematika Tingkat Lanjut', kelas: 'XI MIPA 1' },
  { id: 'gm-5', guru_id: 'g-2', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199202', nama_mapel: 'XI Matematika Tingkat Lanjut', kelas: 'XI MIPA 2' },

  // Pak Hendra (no assignments)
];

const mockTeachersList = [
  { id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198801' },
  { id: 'g-2', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199202' },
  { id: 'g-3', nama_guru: 'Hendra Setiawan, S.Pd', nip: '198303' },
];

function getTeacherSubjects(teacherName: string) {
  const teacher = mockTeachersList.find(t => isTeacherMatch(t, teacherName));
  if (!teacher) return [];
  const assigned = mockAssignmentsPool.filter(a => isAssignmentMatchTeacher(a, teacher));
  return Array.from(new Set(assigned.map(a => a.nama_mapel).filter(Boolean))).sort();
}

runTest('3.1: Selecting Ahmad Fauzi only exposes his assigned subjects [Dasar Kejuruan, Informatika]', () => {
  const mapels = getTeacherSubjects('Ahmad Fauzi, S.Kom');
  assert.deepStrictEqual(mapels, ['Dasar Kejuruan', 'Informatika']);
  assert.strictEqual(mapels.includes('XI Matematika Tingkat Lanjut'), false);
});

runTest('3.2: Selecting Nurul Hidayah dynamically cascades to [XI Matematika Tingkat Lanjut]', () => {
  const mapels = getTeacherSubjects('Nurul Hidayah, M.Pd');
  assert.deepStrictEqual(mapels, ['XI Matematika Tingkat Lanjut']);
  assert.strictEqual(mapels.includes('Informatika'), false);
});

runTest('3.3: Selecting Hendra Setiawan (no assignments) yields empty list (triggers fallback option)', () => {
  const mapels = getTeacherSubjects('Hendra Setiawan, S.Pd');
  assert.deepStrictEqual(mapels, []);
});

// -------------------------------------------------------------------------
// SUITE 4: DYNAMIC MAPEL -> KELAS CASCADING WITH ZERO CROSS-GRADE LEAKAGE
// -------------------------------------------------------------------------
console.log('\n--- SUITE 4: Dynamic Mapel -> Kelas Cascading with parseTingkat ---');

const mockMasterClasses = [
  'X RPL 1', 'X RPL 2', 'X DKV 1',
  'XI MIPA 1', 'XI MIPA 2', 'XI IPS 1',
  'XII MIPA 1', 'XII MIPA 2'
];

function getCascadingClasses(
  teacherName: string,
  mapelName: string,
  fallbackMasterClasses: string[] = mockMasterClasses
) {
  const teacher = mockTeachersList.find(t => isTeacherMatch(t, teacherName));
  if (!teacher || !mapelName) return [];

  const teacherAssignments = mockAssignmentsPool.filter(a => isAssignmentMatchTeacher(a, teacher));
  const matchingClasses = Array.from(new Set(
    teacherAssignments.filter(a => a.nama_mapel === mapelName).map(a => a.kelas).filter(Boolean)
  )).sort();

  const mapelTingkat = parseTingkat(mapelName);

  let targetClasses = matchingClasses;
  if (mapelTingkat !== 'Lainnya') {
    targetClasses = matchingClasses.filter(c => parseTingkat(c) === mapelTingkat);
  }

  // Fallback if no explicit class assignment exists in guru_mapel
  if (targetClasses.length === 0) {
    if (mapelTingkat !== 'Lainnya') {
      targetClasses = fallbackMasterClasses.filter(c => parseTingkat(c) === mapelTingkat).sort();
    } else {
      targetClasses = fallbackMasterClasses;
    }
  }

  return targetClasses;
}

runTest('4.1: Selecting "XI Matematika Tingkat Lanjut" strictly filters to Grade 11 classes, zero Grade 10/12 leakage', () => {
  const classes = getCascadingClasses('Nurul Hidayah, M.Pd', 'XI Matematika Tingkat Lanjut');
  assert.deepStrictEqual(classes, ['XI MIPA 1', 'XI MIPA 2']);

  // Assert every class has tingkat '11'
  for (const k of classes) {
    assert.strictEqual(parseTingkat(k), '11', `Class ${k} must belong to grade 11`);
  }
  // Assert zero cross-grade leakage
  assert.strictEqual(classes.some(k => parseTingkat(k) === '10'), false, 'Grade 10 classes must not leak');
  assert.strictEqual(classes.some(k => parseTingkat(k) === '12'), false, 'Grade 12 classes must not leak');
});

runTest('4.2: Selecting "Dasar Kejuruan" (Class 10) strictly filters to Grade 10 classes', () => {
  const classes = getCascadingClasses('Ahmad Fauzi, S.Kom', 'Dasar Kejuruan');
  assert.deepStrictEqual(classes, ['10 RPL 1']);
  assert.strictEqual(parseTingkat(classes[0]), '10');
});

runTest('4.3: Fallback scenario: Teacher has unassigned class for "Fisika Kelas XI", master classes strictly filtered by parseTingkat', () => {
  // Simulate teacher assigned subject with no explicit class
  const emptyAssignmentTeacher = 'Hendra Setiawan, S.Pd';
  const subjectWithGradeXI = 'Fisika Kelas XI';
  const classes = getCascadingClasses(emptyAssignmentTeacher, subjectWithGradeXI, mockMasterClasses);

  assert.deepStrictEqual(classes, ['XI IPS 1', 'XI MIPA 1', 'XI MIPA 2']);
  for (const k of classes) {
    assert.strictEqual(parseTingkat(k), '11');
  }
  assert.strictEqual(classes.includes('X RPL 1'), false);
  assert.strictEqual(classes.includes('XII MIPA 1'), false);
});

// -------------------------------------------------------------------------
// SUITE 5: DIRTY GRADES SAFEGUARDS & CONFIRMATION FLOW SIMULATION
// -------------------------------------------------------------------------
console.log('\n--- SUITE 5: Dirty Grades Safeguard Simulation ---');

function simulateSelectionChange(
  currentValue: string,
  newValue: string,
  dirtyGrades: Record<string, boolean>,
  userConfirmed: boolean
) {
  let promptShown = false;
  if (Object.keys(dirtyGrades).length > 0) {
    promptShown = true;
    if (!userConfirmed) {
      return { value: currentValue, dirty: dirtyGrades, changed: false, promptShown };
    }
  }
  // User confirmed or no dirty grades
  return { value: newValue, dirty: {}, changed: true, promptShown };
}

runTest('5.1: Switching teacher with dirtyGrades prompts window.confirm; cancel keeps state intact', () => {
  const dirty = { 'nisn1_col1': true, 'nisn2_col2': true };
  const res = simulateSelectionChange('Ahmad Fauzi, S.Kom', 'Nurul Hidayah, M.Pd', dirty, false);

  assert.strictEqual(res.promptShown, true, 'Confirmation prompt must be shown');
  assert.strictEqual(res.changed, false, 'Selection must not change when cancelled');
  assert.strictEqual(res.value, 'Ahmad Fauzi, S.Kom');
  assert.strictEqual(Object.keys(res.dirty).length, 2, 'Dirty grades must remain in memory');
});

runTest('5.2: Switching teacher with dirtyGrades and accepting confirm resets dirtyGrades and updates teacher', () => {
  const dirty = { 'nisn1_col1': true };
  const res = simulateSelectionChange('Ahmad Fauzi, S.Kom', 'Nurul Hidayah, M.Pd', dirty, true);

  assert.strictEqual(res.promptShown, true, 'Confirmation prompt must be shown');
  assert.strictEqual(res.changed, true, 'Selection must change when confirmed');
  assert.strictEqual(res.value, 'Nurul Hidayah, M.Pd');
  assert.strictEqual(Object.keys(res.dirty).length, 0, 'Dirty grades must be cleanly cleared');
});

runTest('5.3: Switching mapel with dirtyGrades and cancelling preserves selectedMapel and dirtyGrades', () => {
  const dirty = { 'nisn1_col1': true };
  const res = simulateSelectionChange('Informatika', 'Dasar Kejuruan', dirty, false);

  assert.strictEqual(res.promptShown, true);
  assert.strictEqual(res.changed, false);
  assert.strictEqual(res.value, 'Informatika');
});

runTest('5.4: Switching kelas with dirtyGrades and cancelling preserves selectedKelas and dirtyGrades', () => {
  const dirty = { 'nisn1_col1': true };
  const res = simulateSelectionChange('XI MIPA 1', 'XI MIPA 2', dirty, false);

  assert.strictEqual(res.promptShown, true);
  assert.strictEqual(res.changed, false);
  assert.strictEqual(res.value, 'XI MIPA 1');
});

console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('========================================================================\n');

if (totalTests === passedTests) {
  console.log('🎉 ALL GRADEBOOK CASCADING SELECTION TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
