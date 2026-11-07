import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  NIZAMUDIN_SEKOLAH_ID,
  TUTUYAN_SEKOLAH_ID,
  isCrossTenantMapelOrKelas,
  isTeacherNameMatch,
  isTeacherEntityMatch,
  resolveTeacherSubjects,
  extractTingkat
} from '../src/components/DokumenView';

console.log('========================================================================');
console.log('  TEST SUITE: PERANGKAT MAPEL ASSIGNMENT & NIZAMUDIN/TUTUYAN ISOLATION');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  ✖ [FAIL] ${label}`);
    failed++;
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------------------
// 1. MULTI-TENANT MAPEL & KELAS ISOLATION (NIZAMUDIN vs TUTUYAN)
// -------------------------------------------------------------------------
console.log('--- 1. Cross-Tenant Isolation (SMA Nizamudin vs SMAN 1 Tutuyan) ---');

check(
  isCrossTenantMapelOrKelas('X Merdeka A_Matematika', 'X Merdeka A', NIZAMUDIN_SEKOLAH_ID) === true,
  'SMA Nizamudin rejects Tutuyan parallel class mapel "X Merdeka A_Matematika"'
);
check(
  isCrossTenantMapelOrKelas('X Merdeka_MTK', 'X Merdeka', NIZAMUDIN_SEKOLAH_ID) === false,
  'SMA Nizamudin accepts its own class mapel "X Merdeka_MTK"'
);
check(
  isCrossTenantMapelOrKelas('X Merdeka_MTK', 'X Merdeka', TUTUYAN_SEKOLAH_ID) === true,
  'SMAN 1 Tutuyan rejects Nizamudin bare class mapel "X Merdeka_MTK"'
);
check(
  isCrossTenantMapelOrKelas('Matematika', 'X Merdeka A', TUTUYAN_SEKOLAH_ID) === false,
  'SMAN 1 Tutuyan accepts its own parallel class "X Merdeka A" with "Matematika"'
);

// -------------------------------------------------------------------------
// 2. TEACHER NAME & ENTITY MATCHING (NO CROSS-TEACHER MERGING)
// -------------------------------------------------------------------------
console.log('\n--- 2. Teacher Name & Entity Matching ---');

check(
  isTeacherNameMatch('Fitra Suryazana Mamonto', 'Fitrawan') === false &&
  isTeacherNameMatch('Fitra', 'Fitri Aprilia Dotulong') === false,
  'isTeacherNameMatch prevents prefix substring collision ("Fitra" vs "Fitrawan" / "Fitri")'
);
check(
  isTeacherNameMatch('Siti Aminah, S.Pd', 'Siti Rahma, M.Pd') === false,
  'isTeacherNameMatch prevents merging two different teachers who only share a first name'
);
check(
  isTeacherNameMatch('Ade Fitrawan Ibrahim', 'Ade') === true,
  'isTeacherNameMatch still matches legitimate nickname "Ade" to "Ade Fitrawan Ibrahim"'
);
check(
  isTeacherEntityMatch(
    { id: 'g-1', nama_guru: 'Budi Santoso', nip: '198501012010011001', sekolah_id: NIZAMUDIN_SEKOLAH_ID },
    'Budi Santoso',
    '199002022015021002',
    null,
    NIZAMUDIN_SEKOLAH_ID
  ) === false,
  'isTeacherEntityMatch rejects records with conflicting real NIPs even if names are similar'
);
check(
  isTeacherEntityMatch(
    { id: 'g-1', nama_guru: 'Budi Santoso', nip: '198501012010011001', sekolah_id: NIZAMUDIN_SEKOLAH_ID },
    'Budi Santoso',
    '198501012010011001',
    null,
    TUTUYAN_SEKOLAH_ID
  ) === false,
  'isTeacherEntityMatch rejects records from a different school (sekolah_id mismatch)'
);

// -------------------------------------------------------------------------
// 3. RESOLVE TEACHER SUBJECTS (ADMIN & GURU ASSIGNED MAPEL ACCURACY)
// -------------------------------------------------------------------------
console.log('\n--- 3. resolveTeacherSubjects Accuracy & Deduplication ---');

const nizamudinTeacher = {
  id: 'guru-niz-1',
  nama_guru: 'Ade Fitrawan Ibrahim',
  nip: '199001012020011001',
  mata_pelajaran: 'X Merdeka_MTK, XI Merdeka_Informatika',
  sekolah_id: NIZAMUDIN_SEKOLAH_ID
};

const mixedJadwal = [
  { nama_guru: 'Ade Fitrawan Ibrahim', mata_pelajaran: 'MTK', kelas: 'X Merdeka', sekolah_id: NIZAMUDIN_SEKOLAH_ID },
  { nama_guru: 'Ade Fitrawan Ibrahim', mata_pelajaran: 'Informatika', kelas: 'XI Merdeka', sekolah_id: NIZAMUDIN_SEKOLAH_ID },
  // Foreign Tutuyan schedule row that must be ignored for Nizamudin teacher
  { nama_guru: 'Ade Fitrawan Ibrahim', mata_pelajaran: 'Kimia', kelas: 'X Merdeka A', sekolah_id: TUTUYAN_SEKOLAH_ID }
];

const mixedGuruMapel = [
  // Stale unassigned mapel in guru_mapel that is neither in jadwal nor in teacher.mata_pelajaran
  { guru_id: 'guru-niz-1', nama_guru: 'Ade Fitrawan Ibrahim', nama_mapel: 'Sosiologi', kelas: 'XII Merdeka', sekolah_id: NIZAMUDIN_SEKOLAH_ID },
  // Generic classless duplicate for Matematika
  { guru_id: 'guru-niz-1', nama_guru: 'Ade Fitrawan Ibrahim', nama_mapel: 'Matematika', kelas: '', sekolah_id: NIZAMUDIN_SEKOLAH_ID }
];

const mixedDataMapel = [
  { nama_mata_pelajaran: 'X Merdeka_MTK', sekolah_id: NIZAMUDIN_SEKOLAH_ID },
  { nama_mata_pelajaran: 'XI Merdeka_Informatika', sekolah_id: NIZAMUDIN_SEKOLAH_ID },
  { nama_mata_pelajaran: 'X Merdeka A_Kimia', sekolah_id: TUTUYAN_SEKOLAH_ID }
];

const resolvedNiz = resolveTeacherSubjects(
  nizamudinTeacher,
  mixedJadwal,
  mixedDataMapel,
  mixedGuruMapel,
  ['X Merdeka', 'XI Merdeka', 'XII Merdeka']
);

check(
  resolvedNiz.length === 2 &&
  resolvedNiz[0].nama_mapel === 'Matematika' && resolvedNiz[0].kelas === 'X Merdeka' &&
  resolvedNiz[1].nama_mapel === 'Informatika' && resolvedNiz[1].kelas === 'XI Merdeka',
  'Nizamudin teacher resolves strictly assigned subjects (Matematika X Merdeka, Informatika XI Merdeka) without foreign Tutuyan or stale unassigned subjects or classless duplicates'
);

const tutuyanTeacher = {
  id: 'guru-tut-1',
  nama_guru: 'Guru Tutuyan, S.Pd',
  nip: '198802022015022002',
  mata_pelajaran: 'Biologi, X Merdeka_MTK', // polluted with Nizamudin X Merdeka_MTK
  sekolah_id: TUTUYAN_SEKOLAH_ID
};

const tutuyanJadwal = [
  { nama_guru: 'Guru Tutuyan, S.Pd', mata_pelajaran: 'Biologi', kelas: 'X Merdeka A', sekolah_id: TUTUYAN_SEKOLAH_ID },
  { nama_guru: 'Guru Tutuyan, S.Pd', mata_pelajaran: 'Biologi', kelas: 'X Merdeka B', sekolah_id: TUTUYAN_SEKOLAH_ID }
];

const resolvedTut = resolveTeacherSubjects(
  tutuyanTeacher,
  tutuyanJadwal,
  mixedDataMapel,
  [],
  ['X Merdeka A', 'X Merdeka B']
);

check(
  resolvedTut.length === 2 &&
  resolvedTut.every(s => s.nama_mapel === 'Biologi') &&
  resolvedTut.map(s => s.kelas).join(',') === 'X Merdeka A,X Merdeka B',
  'Tutuyan teacher resolves strictly Biologi in X Merdeka A & B and rejects Nizamudin X Merdeka_MTK pollution'
);

// -------------------------------------------------------------------------
// 4. STATIC CODE INVARIANTS ACROSS DOKUMENVIEW & ADMINDATAVIEW
// -------------------------------------------------------------------------
console.log('\n--- 4. Static Source Invariants ---');

const rootDir = path.resolve(__dirname, '..');
const dokSrc = fs.readFileSync(path.join(rootDir, 'src/components/DokumenView.tsx'), 'utf8');
const adminDataSrc = fs.readFileSync(path.join(rootDir, 'src/components/AdminDataView.tsx'), 'utf8');
const gbSrc = fs.readFileSync(path.join(rootDir, 'src/components/GradebookView.tsx'), 'utf8');

check(
  dokSrc.includes("guruQuery = guruQuery.eq('sekolah_id', targetSchoolId)") &&
  dokSrc.includes("gmQuery = gmQuery.eq('sekolah_id', targetSchoolId)") &&
  dokSrc.includes("docQuery = docQuery.eq('sekolah_id', targetSchoolId)"),
  'DokumenView scopes data_guru, guru_mapel, and bank_dokumen queries by targetSchoolId'
);
check(
  dokSrc.includes('extractTingkat') && dokSrc.includes('parallelClass'),
  'DokumenView preserves Kurikulum Merdeka tingkat sharing invariant (extractTingkat & parallelClass)'
);
check(
  !adminDataSrc.includes("if (!data?.length && sekolahId) data = (await supabase.from('data_mapel').select('*').order('nama_mata_pelajaran')).data"),
  'AdminDataView buildMapelChecklistHtml no longer falls back to unscoped cross-school data_mapel query'
);
check(
  gbSrc.includes("if (sekolahId) gQuery = gQuery.eq('sekolah_id', sekolahId)") &&
  gbSrc.includes("if (sekolahId) mQuery = mQuery.eq('sekolah_id', sekolahId)"),
  'GradebookView scopes data_guru and data_mapel queries by sekolahId'
);
check(
  extractTingkat('X Merdeka A') === 'X' && extractTingkat('XI Merdeka') === 'XI',
  'extractTingkat works for both Tutuyan and Nizamudin class formats'
);

console.log('\n========================================================================');
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('========================================================================');
if (failed > 0) process.exit(1);
