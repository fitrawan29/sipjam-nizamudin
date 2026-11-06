import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  isTeacherMatch,
  isAssignmentMatchTeacher
} from '../src/components/GradebookView';

console.log('========================================================================');
console.log('  TEST SUITE: GURU-SCOPED MAPEL & KELAS IN GRADEBOOKVIEW (PONYTAIL)');
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
// SUITE 1: TEACHER & ASSIGNMENT MATCHING LOGIC
// -------------------------------------------------------------------------
console.log('--- SUITE 1: Teacher & Assignment Matching Logic ---');

runTest('1.1: isTeacherMatch handles exact name match', () => {
  const teacher = { id: 'g-1', nama_guru: 'Ahmad Dahlan', nip: '19850101' };
  assert.strictEqual(isTeacherMatch(teacher, 'Ahmad Dahlan'), true);
  assert.strictEqual(isTeacherMatch(teacher, 'ahmad dahlan'), true);
  assert.strictEqual(isTeacherMatch(teacher, 'Budi Santoso'), false);
});

runTest('1.2: isTeacherMatch strips academic titles (e.g. S.Pd, M.Pd)', () => {
  const teacher = { id: 'g-1', nama_guru: 'Fitra Suryazana, S.Pd', nip: '19900202' };
  assert.strictEqual(isTeacherMatch(teacher, 'Fitra Suryazana'), true);
  assert.strictEqual(isTeacherMatch(teacher, 'Fitra Suryazana, M.Pd'), true);
  assert.strictEqual(isTeacherMatch(teacher, 'Fitra Suryazana, S.Kom, M.T'), true);
});

runTest('1.3: isTeacherMatch matches by ID and NIP when provided as object', () => {
  const teacher = { id: 'g-uuid-123', nama_guru: 'Dewi Sartika', nip: '19750505' };
  assert.strictEqual(isTeacherMatch(teacher, { id: 'g-uuid-123', nama_guru: 'Other Name' }), true);
  assert.strictEqual(isTeacherMatch(teacher, { nip: '19750505', nama_guru: 'Other' }), true);
  assert.strictEqual(isTeacherMatch(teacher, { nip: '1975 0505 ', nama_guru: 'Other' }), true);
});

runTest('1.4: isAssignmentMatchTeacher matches assignments by guru_id or user_id', () => {
  const teacher = { id: 'g-001', nama_guru: 'Hasan Basri', nip: '12345' };
  const assignmentWithGuruId = { guru_id: 'g-001', nama_guru: 'Hasan', nama_mapel: 'Fisika', kelas: '10A' };
  const assignmentWithUserId = { user_id: 'g-001', nama_guru: 'Hasan', nama_mapel: 'Fisika', kelas: '10A' };
  const nonMatching = { guru_id: 'g-999', nama_guru: 'Budi', nama_mapel: 'Fisika', kelas: '10A' };

  assert.strictEqual(isAssignmentMatchTeacher(assignmentWithGuruId, teacher), true);
  assert.strictEqual(isAssignmentMatchTeacher(assignmentWithUserId, teacher), true);
  assert.strictEqual(isAssignmentMatchTeacher(nonMatching, teacher), false);
});

runTest('1.5: isAssignmentMatchTeacher matches assignments by NIP and sanitized name', () => {
  const teacher = { id: 'g-002', nama_guru: 'Siti Rahma, M.Pd', nip: '19880808' };
  const assignmentByNip = { nip: '19880808', nama_guru: '', nama_mapel: 'Kimia', kelas: '11B' };
  const assignmentByName = { nip: '', nama_guru: 'Siti Rahma', nama_mapel: 'Kimia', kelas: '11B' };

  assert.strictEqual(isAssignmentMatchTeacher(assignmentByNip, teacher), true);
  assert.strictEqual(isAssignmentMatchTeacher(assignmentByName, teacher), true);
});

// -------------------------------------------------------------------------
// SUITE 2: MULTI-TEACHER ASSIGNMENT FILTERING SIMULATION
// -------------------------------------------------------------------------
console.log('\n--- SUITE 2: Multi-Teacher Assignment Filtering Simulation ---');

const mockTeachers = [
  { id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003' },
  { id: 'g-2', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199203102019032008' },
  { id: 'g-3', nama_guru: 'Bambang Irawan, S.Pd', nip: '198507202010011012' },
];

const mockAssignmentsPool = [
  // Ahmad teaches Informatika in 7A, 7B and TIK in 8A
  { id: 'gm-1', guru_id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003', nama_mapel: 'Informatika', kelas: '7A' },
  { id: 'gm-2', guru_id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003', nama_mapel: 'Informatika', kelas: '7B' },
  { id: 'gm-3', guru_id: 'g-1', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003', nama_mapel: 'TIK', kelas: '8A' },

  // Nurul teaches Matematika in 8A, 8B, 9A
  { id: 'gm-4', guru_id: 'g-2', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199203102019032008', nama_mapel: 'Matematika', kelas: '8A' },
  { id: 'gm-5', guru_id: 'g-2', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199203102019032008', nama_mapel: 'Matematika', kelas: '8B' },
  { id: 'gm-6', guru_id: 'g-2', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199203102019032008', nama_mapel: 'Matematika', kelas: '9A' },

  // Bambang teaches PJOK in 7A, 8A, 9A
  { id: 'gm-7', guru_id: 'g-3', nama_guru: 'Bambang Irawan, S.Pd', nip: '198507202010011012', nama_mapel: 'PJOK', kelas: '7A' },
  { id: 'gm-8', guru_id: 'g-3', nama_guru: 'Bambang Irawan, S.Pd', nip: '198507202010011012', nama_mapel: 'PJOK', kelas: '8A' },
  { id: 'gm-9', guru_id: 'g-3', nama_guru: 'Bambang Irawan, S.Pd', nip: '198507202010011012', nama_mapel: 'PJOK', kelas: '9A' },
];

function simulateFilter(selectedGuru: string, selectedMapel?: string) {
  const teacher = mockTeachers.find(t => isTeacherMatch(t, selectedGuru));
  assert.ok(teacher, `Teacher ${selectedGuru} must exist in mock list`);

  const teacherAssignments = mockAssignmentsPool.filter(a => isAssignmentMatchTeacher(a, teacher));
  const distinctMapels = Array.from(new Set(teacherAssignments.map(a => a.nama_mapel))).sort();

  const activeMapel = (selectedMapel && distinctMapels.includes(selectedMapel))
    ? selectedMapel
    : (distinctMapels[0] || '');

  const classesForActiveMapel = Array.from(new Set(
    teacherAssignments.filter(a => a.nama_mapel === activeMapel).map(a => a.kelas)
  )).sort();

  return { distinctMapels, activeMapel, classesForActiveMapel };
}

runTest('2.1: Selecting Ahmad Fauzi only exposes Informatika and TIK, NOT Matematika or PJOK', () => {
  const res = simulateFilter('Ahmad Fauzi, S.Kom');
  assert.deepStrictEqual(res.distinctMapels, ['Informatika', 'TIK']);
  assert.strictEqual(res.distinctMapels.includes('Matematika'), false);
  assert.strictEqual(res.distinctMapels.includes('PJOK'), false);
});

runTest('2.2: When Ahmad Fauzi has Informatika selected, classes are strictly [7A, 7B], NOT 8A', () => {
  const res = simulateFilter('Ahmad Fauzi, S.Kom', 'Informatika');
  assert.deepStrictEqual(res.classesForActiveMapel, ['7A', '7B']);
  assert.strictEqual(res.classesForActiveMapel.includes('8A'), false);
  assert.strictEqual(res.classesForActiveMapel.includes('9A'), false);
});

runTest('2.3: When Ahmad Fauzi has TIK selected, classes are strictly [8A], NOT 7A or 7B', () => {
  const res = simulateFilter('Ahmad Fauzi, S.Kom', 'TIK');
  assert.deepStrictEqual(res.classesForActiveMapel, ['8A']);
  assert.strictEqual(res.classesForActiveMapel.includes('7A'), false);
  assert.strictEqual(res.classesForActiveMapel.includes('7B'), false);
});

runTest('2.4: Switching teacher to Nurul Hidayah switches subjects to [Matematika] and classes to [8A, 8B, 9A]', () => {
  const res = simulateFilter('Nurul Hidayah, M.Pd');
  assert.deepStrictEqual(res.distinctMapels, ['Matematika']);
  assert.strictEqual(res.activeMapel, 'Matematika');
  assert.deepStrictEqual(res.classesForActiveMapel, ['8A', '8B', '9A']);
});

runTest('2.5: Switching teacher to Bambang Irawan switches subjects to [PJOK] and classes to [7A, 8A, 9A]', () => {
  const res = simulateFilter('Bambang Irawan, S.Pd');
  assert.deepStrictEqual(res.distinctMapels, ['PJOK']);
  assert.strictEqual(res.activeMapel, 'PJOK');
  assert.deepStrictEqual(res.classesForActiveMapel, ['7A', '8A', '9A']);
});

// -------------------------------------------------------------------------
// SUITE 3: STATIC CODE & UI WIRING INSPECTION IN GRADEBOOKVIEW.TSX
// -------------------------------------------------------------------------
console.log('\n--- SUITE 3: Static Code & UI Wiring Inspection in GradebookView.tsx ---');

const gradebookPath = path.resolve(process.cwd(), 'src/components/GradebookView.tsx');
assert.ok(fs.existsSync(gradebookPath), 'GradebookView.tsx must exist');
const code = fs.readFileSync(gradebookPath, 'utf8');

runTest('3.1: GradebookView exports isTeacherMatch and isAssignmentMatchTeacher', () => {
  assert.ok(code.includes('export function isTeacherMatch'), 'GradebookView must export isTeacherMatch');
  assert.ok(code.includes('export function isAssignmentMatchTeacher'), 'GradebookView must export isAssignmentMatchTeacher');
});

runTest('3.2: GradebookView defines syncTeacherAssignments callback', () => {
  assert.ok(code.includes('const syncTeacherAssignments = useCallback('), 'GradebookView must define syncTeacherAssignments callback');
});

runTest('3.3: GradebookView defines handleSelectGuru with dirty grades guard', () => {
  assert.ok(code.includes('const handleSelectGuru = (newGuru: string) => {'), 'GradebookView must define handleSelectGuru');
  assert.ok(code.includes('Object.keys(dirtyGrades).length > 0'), 'handleSelectGuru must check dirtyGrades');
  assert.ok(code.includes('window.confirm('), 'handleSelectGuru must confirm unsaved changes');
});

runTest('3.4: Guru Pengampu select element uses onChange={e => handleSelectGuru(e.target.value)}', () => {
  assert.ok(
    code.includes('onChange={e => handleSelectGuru(e.target.value)}'),
    'Guru Pengampu select must wire to handleSelectGuru'
  );
});

runTest('3.5: Mapel Filter select element displays fallback option when uniqueMapelList is empty', () => {
  assert.ok(
    code.includes('uniqueMapelList.length === 0 ? (') &&
    code.includes('Tidak ada mapel ditugaskan'),
    'Mapel select must render graceful fallback when teacher has no assigned subjects'
  );
});

runTest('3.6: Kelas Filter select element displays fallback option when kelasList is empty', () => {
  assert.ok(
    code.includes('kelasList.length === 0 ? (') &&
    code.includes('Tidak ada kelas ditugaskan'),
    'Kelas select must render graceful fallback when teacher has no assigned classes'
  );
});

runTest('3.7: PrintSignature dynamically binds teacher NIP for selectedGuru', () => {
  assert.ok(
    code.includes('leftNip={teachersList.find(t => t.nama_guru === selectedGuru)?.nip || user?.nip}'),
    'PrintSignature must bind teacher NIP corresponding to selectedGuru'
  );
});

console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('========================================================================\n');

if (totalTests === passedTests) {
  console.log('🎉 ALL GURU-SCOPED DAFTAR NILAI TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
