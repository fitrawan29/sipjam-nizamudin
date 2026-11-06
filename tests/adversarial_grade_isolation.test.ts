import assert from 'assert';
import {
  parseTingkat,
  getSubjectTingkat,
  isTeacherMatch,
  isAssignmentMatchTeacher
} from '../src/components/GradebookView';

console.log('========================================================================');
console.log('  ADVERSARIAL STRESS TEST: GRADE-LEVEL ISOLATION & ZERO LEAKAGE');
console.log('========================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(desc: string, fn: () => void) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✔ [PASS] ${desc}`);
  } catch (err: any) {
    failedChecks++;
    console.error(`  ✖ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
  }
}

// =========================================================================
// SECTION 1: EMPIRICAL STRESS OF NAMING PERMUTATIONS (parseTingkat)
// =========================================================================
console.log('--- SECTION 1: Empirical Stress of Naming Permutations (parseTingkat) ---');

const grade10Permutations = [
  'X', 'x', ' X ',
  '10', ' 10 ',
  'X 1', 'X-1', 'X.1', 'X_1', 'X-A', 'X A', 'X.A',
  '10 1', '10-1', '10.1', '10_1', '10A', '10-A', '10 B', '10.B',
  'X-IPA', 'X-IPA-1', 'X IPA 1', 'X-IPS', 'X IPS 2',
  '10-IPA', '10-IPA-1', '10-IPS', '10 IPS 2',
  'X Merdeka', 'X Merdeka 1', 'X Merdeka 2', 'X-Merdeka-A',
  '10 Merdeka', '10 Merdeka 1',
  'X RPL 1', 'X TKJ 2', 'X MM', '10 RPL 1', '10 TKJ 2',
  'Kelas X', 'Kelas X-1', 'Kelas X A', 'Kelas 10', 'Kelas 10-A',
  'Tingkat X', 'Tingkat 10',
  'SMK X TKJ 1', 'SMA Negeri 10-A', '(Kelas X)', '(10)', '[X]', '[10]'
];

for (const p of grade10Permutations) {
  check(`Grade 10 permutation: "${p}" parses to "10"`, () => {
    assert.strictEqual(parseTingkat(p), '10');
  });
}

const grade11Permutations = [
  'XI', 'xi', ' XI ',
  '11', ' 11 ',
  'XI 1', 'XI-1', 'XI.1', 'XI_1', 'XI-A', 'XI A', 'XI.A',
  '11 1', '11-1', '11.1', '11_1', '11A', '11B', '11-B', '11 C', '11.C',
  'XI-IPA', 'XI-IPA-1', 'XI IPA 1', 'XI-IPS', 'XI-IPS-2', 'XI IPS 2',
  '11-IPA', '11-IPA-1', '11-IPS', '11 IPS 2',
  'XI Merdeka', 'XI Merdeka 1', 'XI Merdeka 2', 'XI-Merdeka-B',
  '11 Merdeka', '11 Merdeka 2',
  'XI RPL 1', 'XI TKJ 2', 'XI MM', '11 RPL 1', '11 TKJ 2',
  'Kelas XI', 'Kelas XI-1', 'Kelas XI B', 'Kelas 11', 'Kelas 11-B',
  'Tingkat XI', 'Tingkat 11',
  'SMK XI TKJ 1', 'SMA Negeri 11-B', '(Kelas XI)', '(11)', '[XI]', '[11]'
];

for (const p of grade11Permutations) {
  check(`Grade 11 permutation: "${p}" parses to "11"`, () => {
    assert.strictEqual(parseTingkat(p), '11');
  });
}

const grade12Permutations = [
  'XII', 'xii', ' XII ',
  '12', ' 12 ',
  'XII 1', 'XII-1', 'XII.1', 'XII_1', 'XII-A', 'XII A', 'XII.A',
  '12 1', '12-1', '12.1', '12_1', '12A', '12B', '12C', '12-C', '12 D', '12.D',
  'XII-IPA', 'XII-IPA-1', 'XII IPA 1', 'XII-IPS', 'XII-IPS-2', 'XII IPS 2',
  '12-IPA', '12-IPA-1', '12-IPS', '12 IPS 2',
  'XII Merdeka', 'XII Merdeka 1', 'XII Merdeka 2', 'XII-Merdeka-C',
  '12 Merdeka', '12 Merdeka 3',
  'XII RPL 1', 'XII TKJ 2', 'XII MM', '12 RPL 1', '12 TKJ 2',
  'Kelas XII', 'Kelas XII-1', 'Kelas XII C', 'Kelas 12', 'Kelas 12-C',
  'Tingkat XII', 'Tingkat 12',
  'SMK XII TKJ 1', 'SMA Negeri 12-C', '(Kelas XII)', '(12)', '[XII]', '[12]'
];

for (const p of grade12Permutations) {
  check(`Grade 12 permutation: "${p}" parses to "12"`, () => {
    assert.strictEqual(parseTingkat(p), '12');
  });
}

const nonGradeCases = [
  'Linux', 'Matrix', 'Text Processing', 'Max Media', 'Pixel Art 3D',
  'Bahasa Sunda', 'Pendidikan Agama Islam', 'Pendidikan Pancasila',
  'Bimbingan Konseling', 'Ekstrakurikuler Pramuka', '', null, undefined
];

for (const p of nonGradeCases) {
  check(`Non-grade string: "${p}" parses to "Lainnya"`, () => {
    assert.strictEqual(parseTingkat(p), 'Lainnya');
  });
}

// =========================================================================
// SECTION 2: SUBJECT GRADE RESOLUTION & PHASE E (getSubjectTingkat)
// =========================================================================
console.log('\n--- SECTION 2: Subject Grade Resolution & Phase E (getSubjectTingkat) ---');

check('Infers Grade 10 from direct subject name', () => {
  assert.strictEqual(getSubjectTingkat('Matematika X'), '10');
  assert.strictEqual(getSubjectTingkat('Fisika Kelas 10'), '10');
  assert.strictEqual(getSubjectTingkat('10A Dasar Kejuruan'), '10');
  assert.strictEqual(getSubjectTingkat('Kimia 10-A'), '10');
  assert.strictEqual(getSubjectTingkat('X Dasar Kejuruan TKJ'), '10');
});

check('Infers Grade 11 from direct subject name', () => {
  assert.strictEqual(getSubjectTingkat('XI Matematika Tingkat Lanjut'), '11');
  assert.strictEqual(getSubjectTingkat('Biologi XI'), '11');
  assert.strictEqual(getSubjectTingkat('Sosiologi Kelas 11'), '11');
  assert.strictEqual(getSubjectTingkat('11 Pemodelan Perangkat Lunak'), '11');
});

check('Infers Grade 12 from direct subject name', () => {
  assert.strictEqual(getSubjectTingkat('XII Matematika Tingkat Lanjut'), '12');
  assert.strictEqual(getSubjectTingkat('Kimia XII'), '12');
  assert.strictEqual(getSubjectTingkat('Fisika Kelas 12'), '12');
  assert.strictEqual(getSubjectTingkat('12 Administrasi Server'), '12');
});

check('Infers Grade 10 from Kurikulum Merdeka Phase E in subject name', () => {
  assert.strictEqual(getSubjectTingkat('Informatika Fase E'), '10');
  assert.strictEqual(getSubjectTingkat('Dasar Kejuruan (Fase E)'), '10');
  assert.strictEqual(getSubjectTingkat('Projek IPAS Fase E'), '10');
  assert.strictEqual(getSubjectTingkat('B. Indonesia Fase E'), '10');
  assert.strictEqual(getSubjectTingkat('Fase E'), '10');
});

check('Infers Grade from category lookup when subject name is generic', () => {
  const masterMapels = [
    { id: 'm1', nama_mapel: 'Informatika', kategori: 'Kelas X' },
    { id: 'm2', nama_mapel: 'Dasar Pemrograman', kategori: '11 RPL' },
    { id: 'm3', nama_mapel: 'Sistem Operasi Jaringan', kategori: 'XII TKJ' },
    { id: 'm4', nama_mapel: 'Pendidikan Agama Islam', kategori: 'Umum' },
  ];
  assert.strictEqual(getSubjectTingkat('Informatika', masterMapels), '10');
  assert.strictEqual(getSubjectTingkat('Dasar Pemrograman', masterMapels), '11');
  assert.strictEqual(getSubjectTingkat('Sistem Operasi Jaringan', masterMapels), '12');
  assert.strictEqual(getSubjectTingkat('Pendidikan Agama Islam', masterMapels), null);
});

// =========================================================================
// SECTION 3: EMPIRICAL CROSS-GRADE ISOLATION & ZERO LEAKAGE
// =========================================================================
console.log('\n--- SECTION 3: Empirical Cross-Grade Isolation & Zero Leakage ---');

// Teacher Pak Joko teaches multi-grade subjects:
// - Grade 10: "Dasar Kejuruan X" in classes ['X RPL 1', '10A', 'X-1']
// - Grade 11: "XI Matematika Tingkat Lanjut" in classes ['XI MIPA 1', '11B', 'XI-IPA']
// - Grade 12: "XII Administrasi Server" in classes ['XII TKJ 1', '12C', 'XII-IPS']
const multiGradeTeacher = {
  id: 'g-joko',
  nama_guru: 'Drs. Joko Susilo, M.Pd',
  nip: '197505121999031002'
};

const multiGradeAssignments = [
  // Grade 10
  { id: 'a1', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'Dasar Kejuruan X', kelas: 'X RPL 1' },
  { id: 'a2', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'Dasar Kejuruan X', kelas: '10A' },
  { id: 'a3', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'Dasar Kejuruan X', kelas: 'X-1' },
  // Grade 11
  { id: 'a4', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'XI Matematika Tingkat Lanjut', kelas: 'XI MIPA 1' },
  { id: 'a5', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'XI Matematika Tingkat Lanjut', kelas: '11B' },
  { id: 'a6', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'XI Matematika Tingkat Lanjut', kelas: 'XI-IPA' },
  // Grade 12
  { id: 'a7', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'XII Administrasi Server', kelas: 'XII TKJ 1' },
  { id: 'a8', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'XII Administrasi Server', kelas: '12C' },
  { id: 'a9', guru_id: 'g-joko', nama_guru: 'Drs. Joko Susilo, M.Pd', nip: '197505121999031002', nama_mapel: 'XII Administrasi Server', kelas: 'XII-IPS' },
];

const masterClassesPool = [
  'X RPL 1', '10A', 'X-1', 'X Merdeka 1',
  'XI MIPA 1', '11B', 'XI-IPA', 'XI Merdeka 2',
  'XII TKJ 1', '12C', 'XII-IPS', 'XII Merdeka 3'
].sort();

function resolveClassesForSubject(
  teacher: typeof multiGradeTeacher,
  subject: string,
  assignments: typeof multiGradeAssignments,
  masterClasses: string[]
): string[] {
  const teacherAssignments = assignments.filter(a => isAssignmentMatchTeacher(a, teacher));
  const activeMapel = subject;
  const targetTingkat = getSubjectTingkat(activeMapel);

  let matchingClasses = Array.from(new Set(
    teacherAssignments
      .filter(m => !activeMapel || m.nama_mapel === activeMapel)
      .map(m => m.kelas)
      .filter(Boolean) as string[]
  )).sort();

  if (targetTingkat) {
    matchingClasses = matchingClasses.filter(k => parseTingkat(k) === targetTingkat);
  }

  let targetClasses = matchingClasses;
  if (targetClasses.length === 0) {
    const allTeacherClasses = Array.from(new Set(
      teacherAssignments.map(m => m.kelas).filter(Boolean) as string[]
    )).sort();

    const candidateClasses = allTeacherClasses.length > 0 ? allTeacherClasses : masterClasses;
    const filteredCandidates = targetTingkat
      ? candidateClasses.filter(k => parseTingkat(k) === targetTingkat)
      : candidateClasses;

    if (filteredCandidates.length === 0 && targetTingkat && masterClasses.length > 0) {
      targetClasses = masterClasses.filter(k => parseTingkat(k) === targetTingkat);
    } else {
      targetClasses = filteredCandidates;
    }
  }

  return targetClasses;
}

check('Class XI subject yields STRICTLY Grade 11 classes, ZERO Grade 10 or 12 leakage', () => {
  const classes = resolveClassesForSubject(multiGradeTeacher, 'XI Matematika Tingkat Lanjut', multiGradeAssignments, masterClassesPool);
  
  assert.deepStrictEqual(classes, ['11B', 'XI MIPA 1', 'XI-IPA']);
  assert.strictEqual(classes.length, 3);
  
  // Every class must be 11
  for (const c of classes) {
    assert.strictEqual(parseTingkat(c), '11', `Class "${c}" must parse to 11`);
  }

  // Zero Class 10 leakage
  const grade10Leaks = classes.filter(c => parseTingkat(c) === '10');
  assert.strictEqual(grade10Leaks.length, 0, `Grade 10 leaked: ${grade10Leaks.join(', ')}`);

  // Zero Class 12 leakage
  const grade12Leaks = classes.filter(c => parseTingkat(c) === '12');
  assert.strictEqual(grade12Leaks.length, 0, `Grade 12 leaked: ${grade12Leaks.join(', ')}`);
});

check('Class X subject yields STRICTLY Grade 10 classes, ZERO Grade 11 or 12 leakage', () => {
  const classes = resolveClassesForSubject(multiGradeTeacher, 'Dasar Kejuruan X', multiGradeAssignments, masterClassesPool);
  
  assert.deepStrictEqual(classes, ['10A', 'X RPL 1', 'X-1']);
  assert.strictEqual(classes.length, 3);
  
  for (const c of classes) {
    assert.strictEqual(parseTingkat(c), '10', `Class "${c}" must parse to 10`);
  }

  // Zero Class 11 leakage
  const grade11Leaks = classes.filter(c => parseTingkat(c) === '11');
  assert.strictEqual(grade11Leaks.length, 0, `Grade 11 leaked: ${grade11Leaks.join(', ')}`);

  // Zero Class 12 leakage
  const grade12Leaks = classes.filter(c => parseTingkat(c) === '12');
  assert.strictEqual(grade12Leaks.length, 0, `Grade 12 leaked: ${grade12Leaks.join(', ')}`);
});

check('Class XII subject yields STRICTLY Grade 12 classes, ZERO Grade 10 or 11 leakage', () => {
  const classes = resolveClassesForSubject(multiGradeTeacher, 'XII Administrasi Server', multiGradeAssignments, masterClassesPool);
  
  assert.deepStrictEqual(classes, ['12C', 'XII TKJ 1', 'XII-IPS']);
  assert.strictEqual(classes.length, 3);
  
  for (const c of classes) {
    assert.strictEqual(parseTingkat(c), '12', `Class "${c}" must parse to 12`);
  }

  // Zero Class 10 leakage
  const grade10Leaks = classes.filter(c => parseTingkat(c) === '10');
  assert.strictEqual(grade10Leaks.length, 0, `Grade 10 leaked: ${grade10Leaks.join(', ')}`);

  // Zero Class 11 leakage
  const grade11Leaks = classes.filter(c => parseTingkat(c) === '11');
  assert.strictEqual(grade11Leaks.length, 0, `Grade 11 leaked: ${grade11Leaks.join(', ')}`);
});

// =========================================================================
// SECTION 4: FALLBACK SCENARIOS (NO EXPLICIT CLASS IN GURU_MAPEL)
// =========================================================================
console.log('\n--- SECTION 4: Fallback Scenarios (Teacher without explicit class in guru_mapel) ---');

// Teacher Bu Siti has an unassigned class subject (e.g. placeholder row with kelas = '' or from data_guru)
const fallbackTeacher = {
  id: 'g-siti',
  nama_guru: 'Siti Aminah, S.Pd',
  nip: '198203152006042010',
  mata_pelajaran: 'Kimia Kelas XI'
};

const unassignedAssignments = [
  { id: 'fb-1', guru_id: 'g-siti', nama_guru: 'Siti Aminah, S.Pd', nip: '198203152006042010', nama_mapel: 'Kimia Kelas XI', kelas: '' }
];

check('Fallback scenario: Class XI subject without class assignment strictly resolves to Grade 11 master classes', () => {
  const classes = resolveClassesForSubject(fallbackTeacher, 'Kimia Kelas XI', unassignedAssignments, masterClassesPool);

  assert.deepStrictEqual(classes, ['11B', 'XI Merdeka 2', 'XI MIPA 1', 'XI-IPA'].sort());
  for (const c of classes) {
    assert.strictEqual(parseTingkat(c), '11');
  }
  assert.strictEqual(classes.some(c => parseTingkat(c) === '10'), false, 'Zero Grade 10 leakage in fallback');
  assert.strictEqual(classes.some(c => parseTingkat(c) === '12'), false, 'Zero Grade 12 leakage in fallback');
});

check('Fallback scenario: Kurikulum Merdeka Phase E subject strictly resolves to Grade 10 master classes', () => {
  const phaseEAssignments = [
    { id: 'fb-2', guru_id: 'g-siti', nama_guru: 'Siti Aminah, S.Pd', nip: '198203152006042010', nama_mapel: 'Projek IPAS Fase E', kelas: '' }
  ];
  const classes = resolveClassesForSubject(fallbackTeacher, 'Projek IPAS Fase E', phaseEAssignments, masterClassesPool);

  assert.deepStrictEqual(classes, ['10A', 'X Merdeka 1', 'X RPL 1', 'X-1'].sort());
  for (const c of classes) {
    assert.strictEqual(parseTingkat(c), '10');
  }
  assert.strictEqual(classes.some(c => parseTingkat(c) === '11'), false, 'Zero Grade 11 leakage in Phase E fallback');
  assert.strictEqual(classes.some(c => parseTingkat(c) === '12'), false, 'Zero Grade 12 leakage in Phase E fallback');
});

check('Fallback scenario: Class XII subject strictly resolves to Grade 12 master classes', () => {
  const grade12Assignments = [
    { id: 'fb-3', guru_id: 'g-siti', nama_guru: 'Siti Aminah, S.Pd', nip: '198203152006042010', nama_mapel: 'Fisika XII', kelas: '' }
  ];
  const classes = resolveClassesForSubject(fallbackTeacher, 'Fisika XII', grade12Assignments, masterClassesPool);

  assert.deepStrictEqual(classes, ['12C', 'XII Merdeka 3', 'XII TKJ 1', 'XII-IPS'].sort());
  for (const c of classes) {
    assert.strictEqual(parseTingkat(c), '12');
  }
  assert.strictEqual(classes.some(c => parseTingkat(c) === '10'), false, 'Zero Grade 10 leakage in Grade 12 fallback');
  assert.strictEqual(classes.some(c => parseTingkat(c) === '11'), false, 'Zero Grade 11 leakage in Grade 12 fallback');
});

// =========================================================================
// SECTION 5: PARALLEL CLASS SWITCHING & SELECTION PRESERVATION
// =========================================================================
console.log('\n--- SECTION 5: Parallel Class Switching & Selection Preservation (stillTeaches & currentClassValid) ---');

// Teacher teaches Matematika in parallel classes XI-1 and XI-2, and Fisika only in XI-1
const parallelAssignments = [
  { nama_mapel: 'Matematika XI', kelas: 'XI-1' },
  { nama_mapel: 'Matematika XI', kelas: 'XI-2' },
  { nama_mapel: 'Fisika XI', kelas: 'XI-1' }
];

// Simulation of handleSelectKelas in GradebookView.tsx
function simulateHandleSelectKelas(
  currentSelectedMapel: string,
  newKelas: string,
  mapelList: { nama_mapel: string; kelas?: string }[]
): { selectedKelas: string; selectedMapel: string } {
  let selectedKelas = newKelas;
  let selectedMapel = currentSelectedMapel;

  const stillTeaches = mapelList.some(
    m => m.nama_mapel === selectedMapel && (!m.kelas || m.kelas === newKelas)
  );

  if (!stillTeaches) {
    const firstInClass = mapelList.find(m => !m.kelas || m.kelas === newKelas);
    if (firstInClass && firstInClass.nama_mapel) {
      selectedMapel = firstInClass.nama_mapel;
    }
  }

  return { selectedKelas, selectedMapel };
}

// Simulation of handleSelectMapel in GradebookView.tsx
function simulateHandleSelectMapel(
  newMapel: string,
  currentSelectedKelas: string,
  mapelList: { nama_mapel: string; kelas?: string }[],
  masterClassesList: string[]
): { selectedKelas: string; selectedMapel: string; targetClasses: string[] } {
  const selectedMapel = newMapel;
  let selectedKelas = currentSelectedKelas;

  const currentClassValid = mapelList.some(
    m => m.nama_mapel === newMapel && m.kelas === selectedKelas
  );

  const targetTingkat = getSubjectTingkat(newMapel);

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

  if (!currentClassValid || !targetClasses.includes(selectedKelas)) {
    selectedKelas = targetClasses.length > 0 ? targetClasses[0] : '';
  }

  return { selectedKelas, selectedMapel, targetClasses };
}

check('Parallel class switch XI-1 -> XI-2 preserves "Matematika XI" via stillTeaches', () => {
  const res = simulateHandleSelectKelas('Matematika XI', 'XI-2', parallelAssignments);
  assert.strictEqual(res.selectedKelas, 'XI-2');
  assert.strictEqual(res.selectedMapel, 'Matematika XI', 'Mapel must remain unchanged');
});

check('Parallel class switch XI-2 -> XI-1 preserves "Matematika XI" via stillTeaches', () => {
  const res = simulateHandleSelectKelas('Matematika XI', 'XI-1', parallelAssignments);
  assert.strictEqual(res.selectedKelas, 'XI-1');
  assert.strictEqual(res.selectedMapel, 'Matematika XI', 'Mapel must remain unchanged');
});

check('Class switch XI-1 -> XI-2 with "Fisika XI" (not taught in XI-2) correctly reassigns mapel', () => {
  const res = simulateHandleSelectKelas('Fisika XI', 'XI-2', parallelAssignments);
  assert.strictEqual(res.selectedKelas, 'XI-2');
  assert.strictEqual(res.selectedMapel, 'Matematika XI', 'Mapel must update to mapel taught in XI-2');
});

check('Mapel switch on XI-1 preserves selectedKelas XI-1 via currentClassValid', () => {
  const res = simulateHandleSelectMapel('Fisika XI', 'XI-1', parallelAssignments, masterClassesPool);
  assert.strictEqual(res.selectedMapel, 'Fisika XI');
  assert.strictEqual(res.selectedKelas, 'XI-1', 'Kelas must remain XI-1 because Fisika XI is taught in XI-1');
});

check('Mapel switch on XI-2 for "Fisika XI" (not taught in XI-2) auto-redirects selectedKelas to XI-1', () => {
  const res = simulateHandleSelectMapel('Fisika XI', 'XI-2', parallelAssignments, masterClassesPool);
  assert.strictEqual(res.selectedMapel, 'Fisika XI');
  assert.strictEqual(res.selectedKelas, 'XI-1', 'Kelas must redirect to XI-1 where Fisika XI is taught');
});

// =========================================================================
// SUMMARY REPORT
// =========================================================================
console.log('\n========================================================================');
console.log(`TOTAL ADVERSARIAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${failedChecks}`);
console.log('========================================================================\n');

if (failedChecks > 0) {
  console.error(`❌ STRESS VERIFICATION FAILED with ${failedChecks} errors!`);
  process.exit(1);
} else {
  console.log('🎉 100% ADVERSARIAL STRESS CHECKS PASSED: ZERO LEAKAGE CONFIRMED!');
  process.exit(0);
}
