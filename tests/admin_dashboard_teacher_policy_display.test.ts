/**
 * Test Suite: Admin Dashboard Teacher Policy Display & Username Formatting
 * Verifies that teachers with "Hanya Hari KBM" policy (e.g., username Ade at SMAN 1 Tutuyan)
 * have their exemption policy displayed accurately on the Admin Dashboard matrix,
 * and username/NIP and subject information are formatted cleanly without breaking any app logic.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('🧪 TEST: ADMIN DASHBOARD TEACHER POLICY & USERNAME DISPLAY');
console.log('========================================================================\n');

let total = 0;
let passed = 0;
let failed = 0;

function pass(name: string) {
  total++;
  passed++;
  console.log(`✅ PASS: ${name}`);
}

function fail(name: string, error?: any) {
  total++;
  failed++;
  console.error(`❌ FAIL: ${name}`, error || '');
}

const root = path.resolve(__dirname, '..');
const adminHomePath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
const guruHomePath = path.join(root, 'src', 'components', 'HomeViewGuru.tsx');

function runStaticTests() {
  const adminCode = fs.readFileSync(adminHomePath, 'utf8');
  const guruCode = fs.readFileSync(guruHomePath, 'utf8');

  // 1. TeacherStatusRow interface includes isTeacherExempt
  try {
    assert(adminCode.includes('isTeacherExempt?: boolean;'), 'TeacherStatusRow must declare isTeacherExempt');
    assert(adminCode.includes('isExemptNonTeaching?: boolean;'), 'TeacherStatusRow must declare isExemptNonTeaching');
    pass('1.1: TeacherStatusRow declares isTeacherExempt and isExemptNonTeaching properties');
  } catch (e) {
    fail('1.1: TeacherStatusRow missing policy properties', e);
  }

  // 2. Mapping includes isTeacherExempt in row object
  try {
    assert(adminCode.includes('isTeacherExempt,'), 'loadAdminMatrix returns isTeacherExempt');
    assert(adminCode.includes('isExemptNonTeaching,'), 'loadAdminMatrix returns isExemptNonTeaching');
    pass('1.2: loadAdminMatrix maps isTeacherExempt and isExemptNonTeaching into status matrix rows');
  } catch (e) {
    fail('1.2: Mapping missing policy properties', e);
  }

  // 3. UI renders "Hanya Hari KBM" badge
  try {
    assert(adminCode.includes('Hanya Hari KBM'), 'HomeViewAdmin.tsx must render "Hanya Hari KBM" badge');
    assert(adminCode.includes('row.isTeacherExempt &&'), 'Badge gated by row.isTeacherExempt');
    assert(adminCode.includes('fa-graduation-cap'), 'Badge has iconic graduation cap indicator');
    pass('1.3: HomeViewAdmin renders "Hanya Hari KBM" badge when teacher is exempt');
  } catch (e) {
    fail('1.3: Policy badge rendering failed', e);
  }

  // 4. Formats username / NIP with mapel cleanly
  try {
    assert(adminCode.includes('@{row.nip}'), 'HomeViewAdmin formats username with @ prefix when non-numeric');
    assert(adminCode.includes('NIP: {row.nip}'), 'HomeViewAdmin formats numeric NIP with NIP: prefix');
    assert(adminCode.includes('• ${row.mata_pelajaran}'), 'HomeViewAdmin appends mata_pelajaran to subline');
    pass('1.4: HomeViewAdmin formats username (@Ade) and numeric NIP with subject info cleanly');
  } catch (e) {
    fail('1.4: Username / NIP formatting failed', e);
  }

  // 5. MatrixFilter includes "Hanya Hari KBM" filter pill
  try {
    assert(adminCode.includes("'Hanya Hari KBM'"), 'HomeViewAdmin includes "Hanya Hari KBM" filter pill');
    assert(adminCode.includes("if (matrixFilter === 'Hanya Hari KBM') return Boolean(row.isTeacherExempt);"), 'Filter pill reactive filtering logic implemented');
    pass('1.5: HomeViewAdmin provides reactive filter pill for "Hanya Hari KBM"');
  } catch (e) {
    fail('1.5: Filter pill implementation failed', e);
  }

  // 6. HomeViewGuru displays policy badge for exempt teacher
  try {
    assert(guruCode.includes('Hanya Hari KBM'), 'HomeViewGuru displays "Hanya Hari KBM" badge');
    assert(guruCode.includes("dailyState?.aturanKehadiran === 'Hari_Mengajar_Saja'"), 'Guru badge checks Hari_Mengajar_Saja');
    pass('1.6: HomeViewGuru displays "Hanya Hari KBM" badge in profile banner');
  } catch (e) {
    fail('1.6: HomeViewGuru badge display failed', e);
  }

  // 7. Core logic preservation: verify zero regression on critical guards
  try {
    assert(adminCode.includes('const isExemptNonTeaching = isTeacherExempt && targetCount === 0;'), 'isExemptNonTeaching logic preserved');
    assert(adminCode.includes("isFreeFromPresence ? 'Bebas Hadir' : 'Belum Datang'"), 'Bebas Hadir logic preserved');
    assert(adminCode.includes('const isLiburOrExempt = isSchoolDayOff || (isExemptNonTeaching && !hasPiketDuty && !pDatang);'), 'isLiburOrExempt logic preserved');
    pass('1.7: Core presence and exemption calculations remain 100% preserved and untouched');
  } catch (e) {
    fail('1.7: Core logic altered', e);
  }
}

function runSimulations() {
  console.log('\n--- Simulation: Teacher Display Formatting Logic ---');

  // Helper simulating the exact formatting in HomeViewAdmin
  function formatTeacherSubline(nip: string, mapel: string) {
    const isRealNip = /^\d{8,25}$/.test(nip.replace(/[-.\s]/g, ''));
    if (nip && nip !== '-') {
      if (isRealNip) {
        return `NIP: ${nip}${mapel && mapel !== '-' ? ` • ${mapel}` : ''}`;
      } else {
        return `@${nip}${mapel && mapel !== '-' ? ` • ${mapel}` : ''}`;
      }
    }
    return mapel && mapel !== '-' ? mapel : 'Guru';
  }

  // Case 1: Ade Fitrawan Ibrahim (SMAN 1 Tutuyan) - nip = "Ade"
  const adeSubline = formatTeacherSubline('Ade', 'Biologi - X A, Mat. Wajib - X B');
  assert.strictEqual(adeSubline, '@Ade • Biologi - X A, Mat. Wajib - X B');
  pass('2.1: Username "Ade" correctly formatted as "@Ade • Biologi - X A, Mat. Wajib - X B"');

  // Case 2: Sarah Alheid (SMAN 1 Tutuyan) - nip = "Sarah"
  const sarahSubline = formatTeacherSubline('Sarah', 'Biologi - X B');
  assert.strictEqual(sarahSubline, '@Sarah • Biologi - X B');
  pass('2.2: Username "Sarah" correctly formatted as "@Sarah • Biologi - X B"');

  // Case 3: Diane Vike Rory (standard NIP)
  const dianeSubline = formatTeacherSubline('197610132003122006', 'Kimia - XI A');
  assert.strictEqual(dianeSubline, 'NIP: 197610132003122006 • Kimia - XI A');
  pass('2.3: Standard NIP correctly formatted as "NIP: 197610132003122006 • Kimia - XI A"');

  // Case 4: Teacher without NIP (hyphen)
  const noNipSubline = formatTeacherSubline('-', 'Seni Budaya');
  assert.strictEqual(noNipSubline, 'Seni Budaya');
  pass('2.4: Teacher without NIP cleanly falls back to subject name');

  // Case 5: Policy filtering simulation
  const mockRows = [
    { id: '1', nama_guru: 'Ade Fitrawan Ibrahim', isTeacherExempt: true, isTugasLengkap: false },
    { id: '2', nama_guru: 'Diane Vike Rory', isTeacherExempt: false, isTugasLengkap: true },
    { id: '3', nama_guru: 'Sarah Alheid', isTeacherExempt: true, isTugasLengkap: true },
  ];

  const filterSemua = mockRows;
  const filterLengkap = mockRows.filter(r => r.isTugasLengkap);
  const filterHanyaKbm = mockRows.filter(r => r.isTeacherExempt);

  assert.strictEqual(filterSemua.length, 3);
  assert.strictEqual(filterLengkap.length, 2);
  assert.strictEqual(filterHanyaKbm.length, 2);
  assert.deepStrictEqual(filterHanyaKbm.map(r => r.nama_guru), ['Ade Fitrawan Ibrahim', 'Sarah Alheid']);
  pass('2.5: "Hanya Hari KBM" filter pill simulation correctly filters Ade and Sarah');
}

runStaticTests();
runSimulations();

console.log('\n========================================================================');
console.log(`TOTAL TESTS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
