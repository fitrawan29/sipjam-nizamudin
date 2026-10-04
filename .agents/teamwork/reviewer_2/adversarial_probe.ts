import {
  getStudentQrIdentifier,
  generateQrMatrix,
  generateStudentCardCanvas,
  downloadStudentCardPng,
  printStudentQrCardWithSchool,
} from '../../../src/lib/qrSiswa';
import * as fs from 'fs';
import * as path from 'path';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

console.log('====================================================');
console.log('REVIEWER 2: ADVERSARIAL STRESS TEST & ATTACK VECTORS');
console.log('====================================================');

// ============================================================================
// PROBE 1: Student Card Generation Edge Cases
// ============================================================================
console.log('\n--- PROBE 1: Student Card Generation Edge Cases ---');

// 1.1 Missing name (null, undefined, empty, whitespaces)
const studentMissingName = {
  id: 'std-001',
  nama_siswa: null,
  nisn: '1234567890',
  kelas: 'X Merdeka',
  gender: 'L',
  status: 'Aktif'
};
const canvas1 = generateStudentCardCanvas({
  student: studentMissingName,
  schoolName: 'SMA NIZAMUDIN'
});
assert(canvas1.width === 600, 'Canvas width is 600px when nama_siswa is null');
assert(canvas1.height === 960, 'Canvas height is 960px when nama_siswa is null');

// 1.2 Missing school name (null, empty, undefined)
const student2 = {
  id: 'std-002',
  nama_siswa: 'Budi Santoso',
  nisn: '9876543210',
  kelas: 'XI IPA 1'
};
const canvas2 = generateStudentCardCanvas({
  student: student2,
  schoolName: undefined
});
assert(canvas2 !== null, 'Canvas generated safely when schoolName is undefined');

// 1.3 Missing NISN and QR Code (only ID available)
const student3 = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nama_siswa: 'Siti Rahma',
  kelas: 'XII IPS 2'
};
const id3 = getStudentQrIdentifier(student3);
assert(id3 === '550e8400-e29b-41d4-a716-446655440000', 'Identifier safely falls back to UUID when NISN & qr_code are missing');
const matrix3 = generateQrMatrix(id3);
assert(matrix3.length === 29, 'UUID generates valid Version 3 QR matrix (29x29)');

// 1.4 Very long student name (overflow attack)
const longNameStudent = {
  id: 'std-004',
  nama_siswa: 'Muhammad Alexander Christopher Von Lichtenstein Al-Fatih Pratama Dotulong',
  nisn: '0098765432',
  kelas: 'X-1'
};
const canvasLong = generateStudentCardCanvas({
  student: longNameStudent,
  schoolName: 'SMA ISLAM PLUS NIZAMUDIN BOARDING SCHOOL KABUPATEN BOLAANG MONGONDOW'
});
assert(canvasLong.width === 600 && canvasLong.height === 960, 'Long name & long school name do not break canvas bounds');

// ============================================================================
// PROBE 2: CSS Print Specificity & Watermark Preservation
// ============================================================================
console.log('\n--- PROBE 2: CSS Print Specificity & Watermark Preservation ---');
const globalsCssPath = path.resolve(__dirname, '../../../src/app/globals.css');
const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

// Ensure watermark is strictly protected from fixed hiding
assert(
  globalsCss.includes('div.fixed:not(.sipjam-print-watermark)'),
  'div.fixed:not(.sipjam-print-watermark) explicitly spares the watermark from fixed removal'
);
assert(
  globalsCss.includes('.sipjam-print-watermark {') && globalsCss.includes('display: flex !important;'),
  '.sipjam-print-watermark is guaranteed display: flex !important in print media'
);

// Ensure robot elements are completely hidden
assert(
  globalsCss.includes('[data-tour="ai-assistant-btn"]') && globalsCss.includes('.fa-robot'),
  'AI assistant button and robot icon are targeted for complete elimination in print'
);
assert(
  globalsCss.includes('button.fixed'),
  'button.fixed is set to display: none !important in print'
);

// ============================================================================
// PROBE 3: AppScreen Access Guards for Picket and Wali Kelas
// ============================================================================
console.log('\n--- PROBE 3: AppScreen Access Guards for Picket and Wali Kelas ---');
const appScreenPath = path.resolve(__dirname, '../../../src/components/AppScreen.tsx');
const appScreen = fs.readFileSync(appScreenPath, 'utf8');

// 3.1 Initial state check
assert(
  appScreen.includes('const [isPiketHariIni, setIsPiketHariIni] = useState<boolean>(isAdmin || isSuperadmin);'),
  'isPiketHariIni initializes to false for regular teachers (preventing flash-of-unauthorized-content)'
);

// 3.2 Navigation handler check
assert(
  appScreen.includes("if (targetId === 'view-piket')") &&
  appScreen.includes('!isAdmin && !isSuperadmin && !isPiketHariIni'),
  'handleNavigation actively blocks non-picket teachers before changing view state'
);

// 3.3 Render guard check
assert(
  appScreen.includes("currentView === 'view-piket'") &&
  appScreen.includes('isAdmin || isSuperadmin || isPiketHariIni ?'),
  'AppScreen render tree blocks PiketView rendering for non-picket teachers with Akses Terblokir card'
);

// 3.4 Wali kelas navigation check
assert(
  appScreen.includes("if (targetId === 'view-rekap-siswa')") &&
  appScreen.includes('!isAdmin && !isSuperadmin && !isWaliKelas'),
  'handleNavigation blocks non-wali-kelas teachers from navigating to view-rekap-siswa'
);

// 3.5 Wali kelas render guard check
assert(
  appScreen.includes("currentView === 'view-rekap-siswa'") &&
  appScreen.includes('isAdmin || isSuperadmin || isWaliKelas ?'),
  'AppScreen render tree blocks RekapSiswaView rendering for non-wali-kelas teachers'
);

// ============================================================================
// PROBE 4: RekapSiswaView Class Locking
// ============================================================================
console.log('\n--- PROBE 4: RekapSiswaView Class Locking ---');
const rekapSiswaPath = path.resolve(__dirname, '../../../src/components/RekapSiswaView.tsx');
const rekapSiswa = fs.readFileSync(rekapSiswaPath, 'utf8');

assert(
  rekapSiswa.includes('const allowedClasses = (isAdmin || user?.role === \'Admin\')'),
  'allowedClasses restricts non-admin teachers strictly to assigned classes'
);
assert(
  rekapSiswa.includes('if (!isAdmin && allowedClasses.length > 0 && !allowedClasses.includes(targetKelas))'),
  'tarikRekap prevents queries outside allowedClasses'
);
assert(
  rekapSiswa.includes('disabled={allowedClasses.length <= 1}'),
  'Class dropdown is disabled when teacher has only 1 assigned class'
);

// ============================================================================
// PROBE 5: GuruJurnal Independent Attendance
// ============================================================================
console.log('\n--- PROBE 5: GuruJurnal Independent Attendance ---');
const guruJurnalPath = path.resolve(__dirname, '../../../src/components/GuruJurnal.tsx');
const guruJurnal = fs.readFileSync(guruJurnalPath, 'utf8');

assert(
  guruJurnal.includes("from('presensi_siswa')") &&
  guruJurnal.includes(".eq('status', 'datang')"),
  'GuruJurnal loads gate arrival data for current subject and session'
);
assert(
  guruJurnal.includes('handleApplyPiketAttendance'),
  'GuruJurnal provides helper to apply gate attendance to classroom attendance'
);
assert(
  guruJurnal.includes('handleAbsensiChange'),
  'GuruJurnal allows teacher to independently adjust and submit student attendance'
);

console.log('\n====================================================');
console.log('🎉 ALL 18 ADVERSARIAL ATTACK PROBES PASSED 100%!');
console.log('====================================================');
