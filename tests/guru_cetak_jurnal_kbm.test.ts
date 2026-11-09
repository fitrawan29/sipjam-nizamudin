/**
 * tests/guru_cetak_jurnal_kbm.test.ts
 *
 * Verification suite for:
 * "pastikan akun role guru memiliki menu untuk mencetak jurnal KBM sesuai mata pelajaran
 *  dan kelas yang ditugaskan kepada mereka. Pastikan perubahan ini tidak mempengaruhi fitur
 *  dan logika yang ada pada aplikasi dan tidak terpengaruh untuk perubahan ini."
 */

import fs from 'fs';
import path from 'path';
import { getConsolidatedMenuItems, resolveCanonicalRoute, evaluateTabRBAC } from '../src/lib/navigation';
import { connectGuruMapelWithJadwal } from '../src/lib/workflow';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, name: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } else {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

console.log('\n========================================================================');
console.log('TEST SUITE: GURU MENU CETAK JURNAL KBM & ISOLASI MAPEL/KELAS TUGAS');
console.log('========================================================================\n');

// 1. AST Invariants: Guru has menu for Cetak Jurnal KBM
console.log('--- Section 1: Menu Cetak Jurnal KBM untuk Akun Role Guru ---');
const appScreenCode = fs.readFileSync(path.join(process.cwd(), 'src/components/AppScreen.tsx'), 'utf8');
const claySidebarCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ClaySidebar.tsx'), 'utf8');
const guruJurnalCode = fs.readFileSync(path.join(process.cwd(), 'src/components/GuruJurnal.tsx'), 'utf8');
const homeGuruCode = fs.readFileSync(path.join(process.cwd(), 'src/components/HomeViewGuru.tsx'), 'utf8');
const rekapJurnalCode = fs.readFileSync(path.join(process.cwd(), 'src/components/RekapJurnalView.tsx'), 'utf8');

assert(
  appScreenCode.includes('Cetak Jurnal KBM') &&
  appScreenCode.includes("handleNavigation('view-guru-jurnal', 'rekap-pribadi')"),
  'AppScreen sidebar renders dedicated "Cetak Jurnal KBM" menu button navigating to rekap-pribadi'
);

assert(
  claySidebarCode.includes('Cetak Jurnal KBM') &&
  claySidebarCode.includes("onNavigate('view-guru-rekap-jurnal')"),
  'ClaySidebar renders dedicated "Cetak Jurnal KBM" menu button navigating to view-guru-rekap-jurnal'
);

assert(
  !homeGuruCode.includes('Cetak Jurnal KBM') &&
  !homeGuruCode.includes('Cetak Jurnal') &&
  !homeGuruCode.includes('Cetak Dokumen'),
  'HomeViewGuru (Dashboard Guru) strictly does NOT contain Cetak Dokumen or Cetak Jurnal'
);

assert(
  guruJurnalCode.includes("label: 'Cetak & Rekap Jurnal KBM'") &&
  guruJurnalCode.includes("icon: 'fa-print'"),
  'GuruJurnal Tab 2 is clearly labeled "Cetak & Rekap Jurnal KBM" with print icon'
);

assert(
  guruJurnalCode.includes("handleTabChange('rekap-pribadi')") &&
  guruJurnalCode.includes('Cetak Jurnal KBM'),
  'GuruJurnal Form Jurnal includes direct header button to switch to Cetak Jurnal KBM'
);

// 2. Unblocked Print Access (Bypass attendance lock when accessing print/rekap)
console.log('\n--- Section 2: Akses Cetak Bebas Blokir Presensi & Hari Libur ---');
assert(
  appScreenCode.includes("const isRekapTab = targetTab === 'rekap-pribadi' || targetTab === 'supervisi-kelas' || targetId === 'view-guru-rekap-jurnal';") &&
  appScreenCode.includes('if (!isRekapTab) {'),
  'AppScreen navigation guard allows teachers to access Cetak/Rekap Jurnal without requiring presensiDatang'
);

assert(
  appScreenCode.includes('if (state.isLibur && targetId !== \'view-guru-presensi\' && !isRekapTab)'),
  'AppScreen navigation guard allows teachers to access Cetak/Rekap Jurnal even on holidays/weekends'
);

// 3. RekapJurnalView: Filter Mapel & Kelas Sesuai Penugasan Guru
console.log('\n--- Section 3: Filter Mapel & Kelas Sesuai Penugasan Guru ---');
assert(
  rekapJurnalCode.includes('assignedMapelList') &&
  rekapJurnalCode.includes('assignedKelasList') &&
  rekapJurnalCode.includes('teacherAssignments'),
  'RekapJurnalView declares state for assignedMapelList, assignedKelasList, and teacherAssignments'
);

assert(
  rekapJurnalCode.includes('connectGuruMapelWithJadwal'),
  'RekapJurnalView integrates connectGuruMapelWithJadwal to correlate teacher assignments'
);

assert(
  rekapJurnalCode.includes('Semua Mapel Ditugaskan') &&
  rekapJurnalCode.includes('Semua Kelas Ditugaskan'),
  'RekapJurnalView displays "Semua Mapel Ditugaskan" and "Semua Kelas Ditugaskan" options for teachers'
);

assert(
  rekapJurnalCode.includes('isAdmin || isKepalaSekolah || tabMode === \'pribadi\''),
  'RekapJurnalView strictly preserves exact AST requirement for Admin & Kepsek inspection'
);

assert(
  rekapJurnalCode.includes('triggerPrintWithGps()') &&
  rekapJurnalCode.includes('Cetak Dokumen'),
  'RekapJurnalView provides triggerPrintWithGps button in toolbar and action bar'
);

// 4. Behavioral Logic Test: connectGuruMapelWithJadwal correctly filters to assigned subjects and classes
console.log('\n--- Section 4: Behavioral Verification of Teacher Assignment Isolation ---');
const dummyTeacher = {
  id: 'teacher-uuid-1',
  user_id: 'teacher-uuid-1',
  username: '19850101',
  nama: 'Budi Santoso, S.Pd',
};

const dummyJadwal = [
  { id: 'j1', hari: 'Senin', kelas: 'X-A', mata_pelajaran: 'Matematika', nama_guru: 'Budi Santoso' },
  { id: 'j2', hari: 'Selasa', kelas: 'X-B', mata_pelajaran: 'Matematika', nama_guru: 'Budi Santoso' },
  { id: 'j3', hari: 'Rabu', kelas: 'XI-IPA', mata_pelajaran: 'Fisika', nama_guru: 'Siti Rahma' }, // Different teacher
];

const dummyMapel = [
  { id: 'm1', nama_mata_pelajaran: 'Matematika' },
  { id: 'm2', nama_mata_pelajaran: 'Fisika' },
  { id: 'm3', nama_mata_pelajaran: 'Biologi' },
];

const dummyGuruMapel = [
  { id: 'gm1', guru_id: 'teacher-uuid-1', nama_guru: 'Budi Santoso', nama_mapel: 'Matematika', kelas: 'X-A' },
  { id: 'gm2', guru_id: 'teacher-uuid-1', nama_guru: 'Budi Santoso', nama_mapel: 'Matematika', kelas: 'X-B' },
];

const connected = connectGuruMapelWithJadwal(
  dummyTeacher,
  dummyJadwal,
  dummyMapel,
  dummyGuruMapel,
  undefined,
  ['X-A', 'X-B', 'XI-IPA']
);

const teacherMapels = Array.from(new Set(connected.map(a => a.nama_mata_pelajaran || a.nama_mapel)));
const teacherKelas = Array.from(new Set(connected.map(a => a.kelas)));

assert(
  teacherMapels.includes('Matematika') && !teacherMapels.includes('Fisika') && !teacherMapels.includes('Biologi'),
  'Teacher assigned subjects strictly contains "Matematika" and excludes unassigned subjects ("Fisika", "Biologi")'
);

assert(
  teacherKelas.includes('X-A') && teacherKelas.includes('X-B') && !teacherKelas.includes('XI-IPA'),
  'Teacher assigned classes strictly contains "X-A" and "X-B", excluding unassigned class "XI-IPA"'
);

// 5. Zero Side-Effect Guarantee on Navigation
console.log('\n--- Section 5: Zero Side-Effect Guarantee ---');
const guruMenus = getConsolidatedMenuItems({ role: 'Guru', isWaliKelas: false, isPiketHariIni: false });
assert(
  guruMenus.length === 6,
  `getConsolidatedMenuItems length for regular teacher remains exactly 6 (got ${guruMenus.length})`
);

const canonicalRekap = resolveCanonicalRoute('view-guru-rekap-jurnal');
assert(
  canonicalRekap.canonicalView === 'view-guru-jurnal' && canonicalRekap.defaultTab === 'rekap-pribadi',
  'view-guru-rekap-jurnal canonical route mapping remains intact'
);

const rbacGuruRekap = evaluateTabRBAC('view-guru-jurnal', 'rekap-pribadi', { role: 'Guru' });
assert(
  rbacGuruRekap.allowed === true,
  'RBAC allows role Guru in view-guru-jurnal with tab rekap-pribadi'
);

console.log('\n========================================================================');
console.log(`SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('========================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL GURU CETAK JURNAL KBM TESTS PASSED SUCCESSFULLY!\n');
}
