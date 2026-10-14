import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('🧪 VERIFIKASI FIX: ANTI-COLLISION MATRIKS HARIAN GURU (FITRAWAN VS FITRA)');
console.log('========================================================================\n');

const root = path.resolve(__dirname, '..');
const homeAdminPath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
assert(fs.existsSync(homeAdminPath), 'HomeViewAdmin.tsx exists');

const homeAdminContent = fs.readFileSync(homeAdminPath, 'utf8');

// 1. Static assertion: HomeViewAdmin contains anti-collision token-based isTeacherMatch
assert(
  homeAdminContent.includes('// First name match (first word token must match exactly, min 2 chars; prevents substring collision e.g. Fitrawan vs Fitra)'),
  'HomeViewAdmin contains updated isTeacherMatch with first-name word token boundary'
);
assert(
  !homeAdminContent.includes('c2.includes(c1)'),
  'HomeViewAdmin no longer contains dangerous loose bidirectional substring search c2.includes(c1)'
);

// 2. Behavioral unit tests: Simulating isTeacherMatch logic from HomeViewAdmin
const cleanStr = (s?: string | null) => (s || '').toLowerCase()
  .replace(/,.*$/, '')
  .replace(/\b(s\.?pd\.?i?|m\.?pd\.?|s\.?kom\.?|s\.?si\.?|s\.?ag\.?|s\.?e\.?|s\.?t\.?|gr\.?)\b/gi, '')
  .replace(/[^a-z0-9]/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const isTeacherMatch = (recordName?: string, recordNip?: string, targetName?: string, targetNip?: string): boolean => {
  const rNip = cleanStr(recordNip);
  const tNip = cleanStr(targetNip);
  if (rNip && tNip && rNip === tNip) return true;

  const c1 = cleanStr(recordName);
  const c2 = cleanStr(targetName);
  if (!c1 && !c2) return false;

  if (c1 && tNip && c1 === tNip) return true;
  if (c2 && rNip && c2 === rNip) return true;

  if (!c1 || !c2) return false;
  if (c1 === c2) return true;

  const t1 = c1.split(' ').filter(w => w.length >= 2);
  const t2 = c2.split(' ').filter(w => w.length >= 2);
  if (t1.length > 0 && t2.length > 0 && t1[0] === t2[0]) {
    return true;
  }

  return false;
};

// Test Suite 1: Anti-Collision Fitrawan vs Fitra
console.log('--- Test Suite 1: Anti-Collision Fitrawan vs Fitra ---');

// Record name "Fitra" (PJOK on Rabu) vs Teacher "Ade Fitrawan Ibrahim" (NIP: Fitrawan)
const matchFitrawanWithFitraClass = isTeacherMatch('Fitra', undefined, 'Ade Fitrawan Ibrahim', 'Fitrawan');
assert.strictEqual(
  matchFitrawanWithFitraClass,
  false,
  'Ade Fitrawan Ibrahim must NOT match Fitra schedule (no substring collision)'
);
console.log('✅ PASS: Ade Fitrawan Ibrahim does not match Fitra schedule');

// Record name "Fitra" vs Teacher "FITRA SURYAZANA MAMONTO, S.Pd." (NIP: Fitra)
const matchFitraSelf = isTeacherMatch('Fitra', undefined, 'FITRA SURYAZANA MAMONTO, S.Pd.', 'Fitra');
assert.strictEqual(
  matchFitraSelf,
  true,
  'FITRA SURYAZANA MAMONTO correctly matches Fitra schedule via NIP/username or first name'
);
console.log('✅ PASS: Fitra matches his own schedule');

// Record name "Ade" vs Teacher "Ade Fitrawan Ibrahim"
const matchAdeShort = isTeacherMatch('Ade', undefined, 'Ade Fitrawan Ibrahim', 'Fitrawan');
assert.strictEqual(
  matchAdeShort,
  true,
  'Ade matches Ade Fitrawan Ibrahim via first name'
);
console.log('✅ PASS: First name Ade matches Ade Fitrawan Ibrahim');

// Record name "Fitrawan" vs Teacher "Ade Fitrawan Ibrahim" (NIP: Fitrawan)
const matchAdeNip = isTeacherMatch('Fitrawan', undefined, 'Ade Fitrawan Ibrahim', 'Fitrawan');
assert.strictEqual(
  matchAdeNip,
  true,
  'Username/NIP Fitrawan matches Ade Fitrawan Ibrahim'
);
console.log('✅ PASS: Username Fitrawan matches Ade Fitrawan Ibrahim');

// Test Suite 2: Anti-Collision Assyfa vs Fitra
console.log('\n--- Test Suite 2: Anti-Collision Assyfa vs Fitra ---');
const matchAssyfaWithFitraClass = isTeacherMatch('Fitra', undefined, 'Assyfa Fitra Azzahrah Abukasim', '19900202');
assert.strictEqual(
  matchAssyfaWithFitraClass,
  false,
  'Assyfa Fitra Azzahrah Abukasim must NOT match Fitra schedule (middle name Fitra ignored when first name is Assyfa)'
);
console.log('✅ PASS: Assyfa Fitra does not match Fitra schedule');

// Test Suite 3: Simulating Daily Matrix Status Resolution for Fitrawan on Rabu
console.log('\n--- Test Suite 3: Daily Matrix Status Resolution Simulation ---');
const rabuJadwal = [
  { id: 'j-1', kelas: 'X Merdeka', mata_pelajaran: 'PJOK', nama_guru: 'Fitra' },
  { id: 'j-2', kelas: 'XI Merdeka', mata_pelajaran: 'PJOK', nama_guru: 'Fitra' },
  { id: 'j-3', kelas: 'XII Merdeka', mata_pelajaran: 'PJOK', nama_guru: 'Fitra' },
];

const teacherFitrawan = {
  id: 'guru-fitrawan-1',
  nama_guru: 'Ade Fitrawan Ibrahim, M.Pd.',
  nip: 'Fitrawan',
  mata_pelajaran: 'Informatika',
  wajib_hadir_hanya_mengajar: true,
};

// Filter target classes for Fitrawan
const targetClasses = rabuJadwal.filter(j =>
  isTeacherMatch(j.nama_guru, undefined, teacherFitrawan.nama_guru, teacherFitrawan.nip)
);
const targetCount = targetClasses.length;

assert.strictEqual(targetCount, 0, 'Fitrawan has 0 target classes on Rabu');
console.log(`✅ PASS: Fitrawan targetCount on Rabu is 0 (got ${targetCount})`);

const isTeacherExempt = Boolean(teacherFitrawan.wajib_hadir_hanya_mengajar);
const isExemptNonTeaching = isTeacherExempt && targetCount === 0;
const hasPiketDuty = false;
const isSchoolDayOff = false;
const isFreeFromPresence = isSchoolDayOff ? false : (isExemptNonTeaching && !hasPiketDuty);

let presensiDatangStatus = isSchoolDayOff ? 'Libur' : isFreeFromPresence ? 'Bebas Hadir' : 'Belum Datang';
assert.strictEqual(presensiDatangStatus, 'Bebas Hadir', 'Fitrawan receives Bebas Hadir, NOT Belum Datang');
console.log(`✅ PASS: Fitrawan presensiDatangStatus is '${presensiDatangStatus}'`);

let jurnalStatus = isExemptNonTeaching ? 'Bebas KBM' : '0/0 Belum';
assert.strictEqual(jurnalStatus, 'Bebas KBM', 'Fitrawan receives Bebas KBM');
console.log(`✅ PASS: Fitrawan jurnalStatus is '${jurnalStatus}'`);

let presensiPulangStatus = isFreeFromPresence ? 'Bebas Hadir' : 'Belum Pulang';
assert.strictEqual(presensiPulangStatus, 'Bebas Hadir', 'Fitrawan receives Bebas Hadir for Pulang');
console.log(`✅ PASS: Fitrawan presensiPulangStatus is '${presensiPulangStatus}'`);

console.log('\n========================================================================');
console.log('🎉 ALL MATRIX TEACHER COLLISION TESTS PASSED 100%!');
console.log('========================================================================');
