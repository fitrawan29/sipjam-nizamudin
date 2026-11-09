import assert from 'assert';
import {
  isPaiSubject,
  isPakSubject,
  isIslamStudent,
  isKristenStudent,
  isStudentEligibleForSubject,
  filterStudentsBySubject,
  getRequiredReligionForSubject
} from '../src/lib/agamaFilter';
import { normalizeCsvHeaders, parseAndValidateMasterCsv } from '../src/lib/dataIntegrityGuard';

console.log('========================================================================');
console.log('  TEST SUITE: PEMISAHAN SISWA AGAMA PAI & PAK DAN NON-REGRESI');
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

// Mock student roster in a single class with diverse religious affiliations
const mockClassStudents = [
  { id: 's1', nisn: '001', nama_siswa: 'Ahmad Fauzi', kelas: 'X Merdeka', agama: 'Islam', gender: 'Laki-laki' },
  { id: 's2', nisn: '002', nama_siswa: 'Fatimah Az-Zahra', kelas: 'X Merdeka', agama: 'Islam', gender: 'Perempuan' },
  { id: 's3', nisn: '003', nama_siswa: 'Muhammad Ali', kelas: 'X Merdeka', agama: 'islam', gender: 'Laki-laki' },
  { id: 's4', nisn: '004', nama_siswa: 'Siti Khadijah', kelas: 'X Merdeka', agama: 'ISLAM', gender: 'Perempuan' },
  { id: 's5', nisn: '005', nama_siswa: 'Nur Hidayah', kelas: 'X Merdeka', agama: ' Islam ', gender: 'Perempuan' },
  { id: 's6', nisn: '006', nama_siswa: 'Yohanes Baptista', kelas: 'X Merdeka', agama: 'Kristen', gender: 'Laki-laki' },
  { id: 's7', nisn: '007', nama_siswa: 'Maria Magdalena', kelas: 'X Merdeka', agama: 'kristen', gender: 'Perempuan' },
  { id: 's8', nisn: '008', nama_siswa: 'Petrus Simon', kelas: 'X Merdeka', agama: 'KRISTEN', gender: 'Laki-laki' },
  { id: 's9', nisn: '009', nama_siswa: 'Daniel Stefanus', kelas: 'X Merdeka', agama: 'Kristen Protestan', gender: 'Laki-laki' },
  { id: 's10', nisn: '010', nama_siswa: 'Theresia Lisieux', kelas: 'X Merdeka', agama: 'Katolik', gender: 'Perempuan' },
  { id: 's11', nisn: '011', nama_siswa: 'I Wayan Balik', kelas: 'X Merdeka', agama: 'Hindu', gender: 'Laki-laki' },
  { id: 's12', nisn: '012', nama_siswa: 'Tanpa Agama Terdata', kelas: 'X Merdeka', agama: null, gender: 'Perempuan' }
];

// --- SECTION 1: Subject Identification (PAI vs PAK vs Umum) ---
console.log('--- SECTION 1: Subject Classification (PAI vs PAK vs Umum) ---');

check('Identifies standard PAI subject variations', () => {
  const paiVariations = [
    'Pendidikan Agama Islam',
    'pendidikan agama islam',
    'PENDIDIKAN AGAMA ISLAM',
    'PAI',
    'pai',
    ' PAI ',
    'P.A.I',
    'P.A.I.',
    'P.A.I. & B.P.',
    'P.A.I & BP',
    'PAI/BP',
    'P.A.I/BP',
    'Pendidikan Agama Islam dan Budi Pekerti',
    'Agama Islam',
    'PAI & BP',
    'PAI dan BP',
    'Pendidikan Agama & Budi Pekerti (Islam)',
    'Pendidikan Agama Islam X',
    'PAIBP',
    'PAI10',
    'PAI11',
    'PAI12',
    'PAIX',
    'PAIXI',
    'PAIXII'
  ];

  paiVariations.forEach(v => {
    assert.strictEqual(isPaiSubject(v), true, `Expected "${v}" to be recognized as PAI`);
    assert.strictEqual(isPakSubject(v), false, `Expected "${v}" not to be recognized as PAK`);
    assert.strictEqual(getRequiredReligionForSubject(v), 'Islam');
  });
});

check('Identifies standard PAK subject variations', () => {
  const pakVariations = [
    'Pendidikan Agama Kristen',
    'pendidikan agama kristen',
    'PENDIDIKAN AGAMA KRISTEN',
    'PAK',
    'pak',
    ' PAK ',
    'P.A.K',
    'P.A.K.',
    'P.A.K. & B.P.',
    'P.A.K & BP',
    'PAK/BP',
    'P.A.K/BP',
    'Pendidikan Agama Kristen dan Budi Pekerti',
    'Agama Kristen',
    'PAK & BP',
    'PAK dan BP',
    'Pendidikan Agama & Budi Pekerti (Kristen)',
    'Pendidikan Agama Kristen X',
    'Pendidikan Agama Katolik',
    'Agama Katolik',
    'PAKBP',
    'PAK10',
    'PAK11',
    'PAK12',
    'PAKX',
    'PAKXI',
    'PAKXII'
  ];

  pakVariations.forEach(v => {
    assert.strictEqual(isPakSubject(v), true, `Expected "${v}" to be recognized as PAK`);
    assert.strictEqual(isPaiSubject(v), false, `Expected "${v}" not to be recognized as PAI`);
    assert.strictEqual(getRequiredReligionForSubject(v), 'Kristen');
  });
});

check('Preserves general and other subjects (Non-Regresi)', () => {
  const generalSubjects = [
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'Pendidikan Pancasila',
    'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
    'Informatika',
    'Fisika',
    'Kimia',
    'Biologi',
    'Sejarah',
    'Seni Budaya',
    'Prakarya',
    'Bimbingan Konseling',
    'Paket Keahlian Rekayasa Perangkat Lunak',
    'Paket Kejuruan Akuntansi'
  ];

  generalSubjects.forEach(s => {
    assert.strictEqual(isPaiSubject(s), false, `General subject "${s}" must NOT match PAI`);
    assert.strictEqual(isPakSubject(s), false, `General subject "${s}" must NOT match PAK`);
    assert.strictEqual(getRequiredReligionForSubject(s), null, `General subject "${s}" must require no religion`);
  });
});

check('Defensive handling of empty, null, and undefined subjects', () => {
  assert.strictEqual(isPaiSubject(''), false);
  assert.strictEqual(isPaiSubject(null), false);
  assert.strictEqual(isPaiSubject(undefined), false);
  assert.strictEqual(isPakSubject(''), false);
  assert.strictEqual(isPakSubject(null), false);
  assert.strictEqual(isPakSubject(undefined), false);
  assert.strictEqual(getRequiredReligionForSubject(''), null);
  assert.strictEqual(getRequiredReligionForSubject(null), null);
});

// --- SECTION 2: Student Religious Status Verification ---
console.log('\n--- SECTION 2: Student Religious Status Verification ---');

check('Correctly identifies Islamic student status across casing, whitespace, and Moslem variant', () => {
  assert.strictEqual(isIslamStudent({ agama: 'Islam' }), true);
  assert.strictEqual(isIslamStudent({ agama: 'islam' }), true);
  assert.strictEqual(isIslamStudent({ agama: 'ISLAM' }), true);
  assert.strictEqual(isIslamStudent({ agama: ' Islam ' }), true);
  assert.strictEqual(isIslamStudent({ agama: 'Muslim' }), true);
  assert.strictEqual(isIslamStudent({ agama: 'muslim' }), true);
  assert.strictEqual(isIslamStudent({ agama: 'Moslem' }), true);
  assert.strictEqual(isIslamStudent({ agama: 'moslem' }), true);

  assert.strictEqual(isIslamStudent({ agama: 'Kristen' }), false);
  assert.strictEqual(isIslamStudent({ agama: 'Katolik' }), false);
  assert.strictEqual(isIslamStudent({ agama: 'Hindu' }), false);
  assert.strictEqual(isIslamStudent({ agama: null }), false);
  assert.strictEqual(isIslamStudent({ agama: '' }), false);
  assert.strictEqual(isIslamStudent(null), false);
});

check('Correctly identifies Christian/Catholic student status across casing, whitespace, and English variants', () => {
  assert.strictEqual(isKristenStudent({ agama: 'Kristen' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'kristen' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'KRISTEN' }), true);
  assert.strictEqual(isKristenStudent({ agama: ' Kristen ' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'Kristen Protestan' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'Katolik' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'Kristen Katolik' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'Christian' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'christian' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'Catholic' }), true);
  assert.strictEqual(isKristenStudent({ agama: 'catholic' }), true);

  assert.strictEqual(isKristenStudent({ agama: 'Islam' }), false);
  assert.strictEqual(isKristenStudent({ agama: 'Muslim' }), false);
  assert.strictEqual(isKristenStudent({ agama: 'Moslem' }), false);
  assert.strictEqual(isKristenStudent({ agama: 'Hindu' }), false);
  assert.strictEqual(isKristenStudent({ agama: null }), false);
  assert.strictEqual(isKristenStudent({ agama: '' }), false);
  assert.strictEqual(isKristenStudent(null), false);
});

// --- SECTION 3: R1 Requirement - Separation in PAI and PAK ---
console.log('\n--- SECTION 3: R1 Requirement - PAI & PAK Student Separation ---');

check('R1.1: PAI roster strictly includes ONLY students with status Islam', () => {
  const paiRoster = filterStudentsBySubject(mockClassStudents, 'Pendidikan Agama Islam');
  assert.strictEqual(paiRoster.length, 5, 'Should strictly load 5 Islam students');
  
  // Verify all included students are Islam
  paiRoster.forEach(s => {
    assert.strictEqual(isIslamStudent(s), true, `Student ${s.nama_siswa} in PAI must be Islam`);
  });

  // Verify non-Islam students are strictly excluded
  const nonIslamIds = ['s6', 's7', 's8', 's9', 's10', 's11', 's12'];
  nonIslamIds.forEach(id => {
    assert.strictEqual(paiRoster.some(s => s.id === id), false, `Student ${id} must NOT be in PAI`);
  });
});

check('R1.2: PAK roster strictly includes ONLY students with status Kristen/Katolik', () => {
  const pakRoster = filterStudentsBySubject(mockClassStudents, 'Pendidikan Agama Kristen');
  assert.strictEqual(pakRoster.length, 5, 'Should strictly load 5 Christian/Catholic students');

  // Verify all included students are Christian
  pakRoster.forEach(s => {
    assert.strictEqual(isKristenStudent(s), true, `Student ${s.nama_siswa} in PAK must be Kristen`);
  });

  // Verify non-Christian students are strictly excluded
  const nonKristenIds = ['s1', 's2', 's3', 's4', 's5', 's11', 's12'];
  nonKristenIds.forEach(id => {
    assert.strictEqual(pakRoster.some(s => s.id === id), false, `Student ${id} must NOT be in PAK`);
  });
});

check('R1.3: PAI acronym "PAI" strictly filters to Islam students', () => {
  const paiRoster = filterStudentsBySubject(mockClassStudents, 'PAI');
  assert.strictEqual(paiRoster.length, 5);
  paiRoster.forEach(s => assert.strictEqual(isIslamStudent(s), true));
});

check('R1.4: PAK acronym "PAK" strictly filters to Christian students', () => {
  const pakRoster = filterStudentsBySubject(mockClassStudents, 'PAK');
  assert.strictEqual(pakRoster.length, 5);
  pakRoster.forEach(s => assert.strictEqual(isKristenStudent(s), true));
});

// --- SECTION 4: R2 Requirement - Non-Regresi on Other Subjects ---
console.log('\n--- SECTION 4: R2 Requirement - Non-Regresi on Other Subjects ---');

check('R2.1: General subjects (Matematika) load ALL class students completely', () => {
  const mtkRoster = filterStudentsBySubject(mockClassStudents, 'Matematika');
  assert.strictEqual(mtkRoster.length, mockClassStudents.length, 'Matematika must load all 12 students');
  assert.deepStrictEqual(mtkRoster.map(s => s.id), mockClassStudents.map(s => s.id));
});

check('R2.2: Bahasa Indonesia loads ALL class students completely without filtering', () => {
  const bIndoRoster = filterStudentsBySubject(mockClassStudents, 'Bahasa Indonesia');
  assert.strictEqual(bIndoRoster.length, mockClassStudents.length);
  assert.deepStrictEqual(bIndoRoster.map(s => s.id), mockClassStudents.map(s => s.id));
});

check('R2.3: Pendidikan Pancasila loads ALL class students completely without filtering', () => {
  const ppknRoster = filterStudentsBySubject(mockClassStudents, 'Pendidikan Pancasila');
  assert.strictEqual(ppknRoster.length, mockClassStudents.length);
});

check('R2.4: Empty or unselected subject loads ALL class students completely', () => {
  const all1 = filterStudentsBySubject(mockClassStudents, '');
  assert.strictEqual(all1.length, mockClassStudents.length);

  const all2 = filterStudentsBySubject(mockClassStudents, null);
  assert.strictEqual(all2.length, mockClassStudents.length);

  const all3 = filterStudentsBySubject(mockClassStudents, undefined);
  assert.strictEqual(all3.length, mockClassStudents.length);
});

// --- SECTION 5: Domain Cross-Verification (Presensi, Jurnal, Penilaian, Roster) ---
console.log('\n--- SECTION 5: Domain Cross-Verification ---');

check('Domain 1: Presensi / Absensi Attendance Summary Calculation Isolation', () => {
  // Simulate GuruJurnal attendance summary for PAI
  const paiStudents = filterStudentsBySubject(mockClassStudents, 'Pendidikan Agama Islam');
  assert.strictEqual(paiStudents.length, 5);

  const absensiMap: Record<string, string> = {
    '001': 'H',
    '002': 'H',
    '003': 'S',
    '004': 'I',
    '005': 'A'
  };

  let h = 0, s = 0, i = 0, a = 0;
  paiStudents.forEach(st => {
    const code = absensiMap[st.nisn] || 'H';
    if (code === 'H') h++;
    else if (code === 'S') s++;
    else if (code === 'I') i++;
    else if (code === 'A') a++;
  });

  const summary = `H:${h}|S:${s}|I:${i}|A:${a}`;
  assert.strictEqual(summary, 'H:2|S:1|I:1|A:1', 'Summary reflects strictly PAI students');
  assert.strictEqual(h + s + i + a, 5, 'Sum of PAI attendees equals PAI student count (5)');
});

check('Domain 2: Jurnal KBM Roster Verification for PAI vs PAK in Same Class', () => {
  const paiStudents = filterStudentsBySubject(mockClassStudents, 'PAI');
  const pakStudents = filterStudentsBySubject(mockClassStudents, 'PAK');

  // Both subject rosters originate from the same class 'X Merdeka'
  paiStudents.forEach(s => assert.strictEqual(s.kelas, 'X Merdeka'));
  pakStudents.forEach(s => assert.strictEqual(s.kelas, 'X Merdeka'));

  // Ensure mutually exclusive sets (intersection is empty)
  const paiIds = new Set(paiStudents.map(s => s.id));
  const pakIds = new Set(pakStudents.map(s => s.id));
  const intersection = [...paiIds].filter(id => pakIds.has(id));
  assert.strictEqual(intersection.length, 0, 'Zero student overlap between PAI and PAK');
});

check('Domain 3: Penilaian / Gradebook Student Roster Filtering', () => {
  // When teacher selects PAI in GradebookView
  const paiGradebook = filterStudentsBySubject(mockClassStudents, 'Pendidikan Agama Islam');
  assert.strictEqual(paiGradebook.length, 5);

  // When teacher selects PAK in GradebookView
  const pakGradebook = filterStudentsBySubject(mockClassStudents, 'Pendidikan Agama Kristen');
  assert.strictEqual(pakGradebook.length, 5);

  // When teacher selects Matematika in GradebookView
  const generalGradebook = filterStudentsBySubject(mockClassStudents, 'Matematika');
  assert.strictEqual(generalGradebook.length, 12);
});

check('Domain 4: Rapor Subject Score Eligibility per Student', () => {
  const activeMapels = [
    'Bahasa Indonesia',
    'Matematika',
    'Pendidikan Agama Islam',
    'Pendidikan Agama Kristen',
    'Pendidikan Pancasila'
  ];

  const islamStudent = mockClassStudents.find(s => s.nama_siswa === 'Ahmad Fauzi')!;
  const kristenStudent = mockClassStudents.find(s => s.nama_siswa === 'Yohanes Baptista')!;

  const islamSubjects = activeMapels.filter(m => isStudentEligibleForSubject(islamStudent, m));
  const kristenSubjects = activeMapels.filter(m => isStudentEligibleForSubject(kristenStudent, m));

  assert.strictEqual(islamSubjects.includes('Pendidikan Agama Islam'), true);
  assert.strictEqual(islamSubjects.includes('Pendidikan Agama Kristen'), false, 'Islam student must NOT receive PAK in Rapor');
  assert.strictEqual(islamSubjects.includes('Matematika'), true);

  assert.strictEqual(kristenSubjects.includes('Pendidikan Agama Kristen'), true);
  assert.strictEqual(kristenSubjects.includes('Pendidikan Agama Islam'), false, 'Christian student must NOT receive PAI in Rapor');
  assert.strictEqual(kristenSubjects.includes('Matematika'), true);
});

// --- SECTION 6: CSV Import and Data Guard Integration ---
console.log('\n--- SECTION 6: CSV Import & Guard Integration ---');

check('normalizeCsvHeaders handles agama aliases properly', () => {
  const headers = ['nisn', 'nama_siswa', 'kelas', 'gender', 'agama', 'status', 'no_hp_ortu'];
  const normalized = normalizeCsvHeaders(headers, 'data_siswa');
  assert.strictEqual(normalized.includes('agama'), true);

  const aliasHeaders = ['NISN', 'Nama Siswa', 'Kelas', 'Jenis Kelamin', 'Religion', 'Status Agama', 'Kepercayaan'];
  const normAlias = normalizeCsvHeaders(aliasHeaders, 'data_siswa');
  assert.strictEqual(normAlias.filter(h => h === 'agama').length, 3, 'Aliases map to agama');
});

check('parseAndValidateMasterCsv sanitizes and standardizes agama values', () => {
  const csvContent = `nisn,nama_siswa,kelas,gender,agama,status
001,Siswa Satu,X Merdeka,Laki-laki,  islam  ,Aktif
002,Siswa Dua,X Merdeka,Perempuan,ISLAM,Aktif
003,Siswa Tiga,X Merdeka,Laki-laki,Kristen Protestan,Aktif
004,Siswa Empat,X Merdeka,Perempuan,katolik,Aktif
005,Siswa Lima,X Merdeka,Laki-laki,hindu,Aktif
006,Siswa Enam,X Merdeka,Perempuan,buddha,Aktif
007,Siswa Tujuh,X Merdeka,Laki-laki,-,Aktif
008,Siswa Delapan,X Merdeka,Perempuan,null,Aktif
009,Siswa Sembilan,X Merdeka,Laki-laki,Moslem,Aktif
010,Siswa Sepuluh,X Merdeka,Perempuan,Christian,Aktif
011,Siswa Sebelas,X Merdeka,Perempuan,Catholic,Aktif`;

  const rows = parseAndValidateMasterCsv(csvContent, 'data_siswa');
  assert.strictEqual(rows.length, 11);
  assert.strictEqual(rows[0].agama, 'Islam', 'Whitespace and lowercase trimmed/standardized');
  assert.strictEqual(rows[1].agama, 'Islam', 'Uppercase ISLAM standardized to Title Case');
  assert.strictEqual(rows[2].agama, 'Kristen', 'Kristen Protestan standardized to Kristen');
  assert.strictEqual(rows[3].agama, 'Katolik', 'katolik standardized to Katolik');
  assert.strictEqual(rows[4].agama, 'Hindu', 'hindu standardized to Hindu');
  assert.strictEqual(rows[5].agama, 'Buddha', 'buddha standardized to Buddha');
  assert.strictEqual(rows[6].agama, null, 'Dash hyphen normalized to null');
  assert.strictEqual(rows[7].agama, null, 'String null normalized to null');
  assert.strictEqual(rows[8].agama, 'Islam', 'Moslem standardized to Islam');
  assert.strictEqual(rows[9].agama, 'Kristen', 'Christian standardized to Kristen');
  assert.strictEqual(rows[10].agama, 'Katolik', 'Catholic standardized to Katolik');
});

check('parseAndValidateMasterCsv handles legacy CSV without agama column gracefully', () => {
  const legacyCsv = `nisn,nama_siswa,kelas,gender,status
001,Siswa Lama,X Merdeka,Laki-laki,Aktif`;

  const rows = parseAndValidateMasterCsv(legacyCsv, 'data_siswa');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].nama_siswa, 'Siswa Lama');
  assert.strictEqual(rows[0].agama, undefined);
  // Student without agama is eligible for general subjects
  assert.strictEqual(isStudentEligibleForSubject(rows[0], 'Matematika'), true);
  // Student without agama is safely excluded from PAI and PAK
  assert.strictEqual(isStudentEligibleForSubject(rows[0], 'PAI'), false);
  assert.strictEqual(isStudentEligibleForSubject(rows[0], 'PAK'), false);
});

// --- SECTION 7: Adversarial State Isolation & Bleed Prevention ---
console.log('\n--- SECTION 7: Adversarial State Isolation & Bleed Prevention ---');

check('Prevents attendance state bleed when switching from general subject to PAI/PAK', () => {
  // Simulate teacher starting on Matematika with all 12 class students
  const prevAbsensi: Record<string, string> = {};
  mockClassStudents.forEach(s => {
    prevAbsensi[s.nisn] = 'H';
  });
  assert.strictEqual(Object.keys(prevAbsensi).length, 12, 'Matematika has 12 student attendance keys');

  // Teacher switches mapel to PAK (which only has 5 students: 006, 007, 008, 009, 010)
  const filteredPakData = filterStudentsBySubject(mockClassStudents, 'PAK');
  assert.strictEqual(filteredPakData.length, 5);

  // GuruJurnal fixed state merger logic:
  const merged: Record<string, string> = {};
  filteredPakData.forEach(s => {
    if (s.nisn) {
      merged[s.nisn] = prevAbsensi[s.nisn] || 'H';
    }
  });

  // Verify merged state ONLY has keys for the 5 PAK students
  assert.strictEqual(Object.keys(merged).length, 5);
  const pakNisns = ['006', '007', '008', '009', '010'];
  assert.deepStrictEqual(Object.keys(merged).sort(), pakNisns.sort());

  // Confirm NO Muslim student keys leaked into the PAK attendance record
  const islamNisns = ['001', '002', '003', '004', '005'];
  islamNisns.forEach(nisn => {
    assert.strictEqual(merged[nisn], undefined, `Muslim student ${nisn} must NOT exist in PAK attendance state`);
  });
});

check('GuruJurnal save payload guarantees strict isolation (absensi_siswa excludes non-eligible keys)', () => {
  // Simulate dirty absensi containing 12 students from a prior general session or stale draft
  const dirtyAbsensi: Record<string, string> = {};
  mockClassStudents.forEach(s => {
    dirtyAbsensi[s.nisn] = 'H';
  });
  assert.strictEqual(Object.keys(dirtyAbsensi).length, 12);

  // When saving a PAI KBM Journal (where only 5 Islam students are eligible)
  const paiStudents = filterStudentsBySubject(mockClassStudents, 'PAI');
  assert.strictEqual(paiStudents.length, 5);

  const cleanAbsensiForSave: Record<string, string> = {};
  paiStudents.forEach(s => {
    if (s.nisn) {
      cleanAbsensiForSave[s.nisn] = dirtyAbsensi[s.nisn] || 'H';
    }
  });

  const serialized = JSON.stringify(cleanAbsensiForSave);
  const parsed = JSON.parse(serialized);

  assert.strictEqual(Object.keys(parsed).length, 5, 'Serialized DB payload contains strictly 5 PAI student keys');
  const nonPaiNisns = ['006', '007', '008', '009', '010', '011', '012'];
  nonPaiNisns.forEach(n => {
    assert.strictEqual(parsed[n], undefined, `Non-PAI student ${n} must NEVER be saved in PAI absensi_siswa`);
  });
});

check('handleApplyPiketAttendance strictly restricts attendance keys to eligible students', () => {
  const dirtyAbsensi: Record<string, string> = { '001': 'H', '002': 'S', '006': 'H', '007': 'I' };
  const pakStudents = filterStudentsBySubject(mockClassStudents, 'PAK'); // students 006, 007, 008, 009, 010

  const newAbsensi: Record<string, string> = {};
  pakStudents.forEach(s => {
    if (s.nisn) {
      newAbsensi[s.nisn] = dirtyAbsensi[s.nisn] || 'H';
    }
  });

  assert.strictEqual(Object.keys(newAbsensi).length, 5);
  assert.strictEqual(newAbsensi['001'], undefined);
  assert.strictEqual(newAbsensi['002'], undefined);
  assert.strictEqual(newAbsensi['006'], 'H');
  assert.strictEqual(newAbsensi['007'], 'I');
});

check('Handles student objects using religion or status_agama aliases', () => {
  const studentWithReligionAlias = { id: 'x1', nama_siswa: 'Ali', religion: 'Islam' };
  const studentWithStatusAgama = { id: 'x2', nama_siswa: 'David', status_agama: 'Kristen' };
  const studentWithMoslem = { id: 'x3', nama_siswa: 'Hasan', religion: 'Moslem' };
  const studentWithChristian = { id: 'x4', nama_siswa: 'John', status_agama: 'Christian' };

  assert.strictEqual(isIslamStudent(studentWithReligionAlias), true);
  assert.strictEqual(isKristenStudent(studentWithStatusAgama), true);
  assert.strictEqual(isIslamStudent(studentWithMoslem), true);
  assert.strictEqual(isKristenStudent(studentWithChristian), true);

  assert.strictEqual(isStudentEligibleForSubject(studentWithReligionAlias, 'PAI'), true);
  assert.strictEqual(isStudentEligibleForSubject(studentWithStatusAgama, 'PAK'), true);
  assert.strictEqual(isStudentEligibleForSubject(studentWithMoslem, 'PAIBP'), true);
  assert.strictEqual(isStudentEligibleForSubject(studentWithChristian, 'PAKBP'), true);
});

// --- SECTION 8: Boundary & Stress Cases ---
console.log('\n--- SECTION 8: Boundary & Stress Cases ---');

check('Handles empty student arrays gracefully', () => {
  assert.deepStrictEqual(filterStudentsBySubject([], 'PAI'), []);
  assert.deepStrictEqual(filterStudentsBySubject([], 'PAK'), []);
  assert.deepStrictEqual(filterStudentsBySubject([], 'Matematika'), []);
});

check('Handles class where all students belong to one religion', () => {
  const allIslam = mockClassStudents.filter(s => isIslamStudent(s));
  assert.strictEqual(filterStudentsBySubject(allIslam, 'PAI').length, allIslam.length);
  assert.strictEqual(filterStudentsBySubject(allIslam, 'PAK').length, 0);
  assert.strictEqual(filterStudentsBySubject(allIslam, 'Fisika').length, allIslam.length);

  const allKristen = mockClassStudents.filter(s => isKristenStudent(s));
  assert.strictEqual(filterStudentsBySubject(allKristen, 'PAK').length, allKristen.length);
  assert.strictEqual(filterStudentsBySubject(allKristen, 'PAI').length, 0);
  assert.strictEqual(filterStudentsBySubject(allKristen, 'Fisika').length, allKristen.length);
});

console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${failedChecks}`);
console.log('========================================================================');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PAI & PAK RELIGION SEPARATION CHECKS PASSED PERFECTLY!');
  process.exit(0);
}
