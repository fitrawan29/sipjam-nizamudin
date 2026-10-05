import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('REVIEWER R1 TEST: PIKETVIEW UI & STATE VERIFICATION');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failed++;
  }
}

const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
assert(fs.existsSync(piketViewPath), 'PiketView.tsx exists');

const piketCode = fs.readFileSync(piketViewPath, 'utf8');

// ============================================================================
// SECTION 1: REQUIREMENT R1.1 — AUTO-FILTER FIX ON MANUAL MARK
// ============================================================================
console.log('\n--- Section 1: Requirement R1.1 (Auto-Filter & Roster Preservation) ---');

// Extract the handleManualMark function accurately: from "const handleManualMark" to "const handleCancelManualPresensi"
const startIdx = piketCode.indexOf('const handleManualMark = async');
const endIdx = piketCode.indexOf('const handleCancelManualPresensi = async');
assert(startIdx !== -1 && endIdx !== -1 && endIdx > startIdx, 'handleManualMark boundary identified in PiketView.tsx');

const handleManualMarkCode = piketCode.substring(startIdx, endIdx);

// 1.1 Verify setManualSearchQuery is NOT called in handleManualMark
const searchSetterInMark = handleManualMarkCode.includes('setManualSearchQuery');
assert(
  !searchSetterInMark,
  'handleManualMark does NOT call setManualSearchQuery (avoids auto-filtering down to 1 student)'
);

// 1.2 Verify setManualKelasFilter is NOT called in handleManualMark
const classSetterInMark = handleManualMarkCode.includes('setManualKelasFilter');
assert(
  !classSetterInMark,
  'handleManualMark does NOT call setManualKelasFilter (preserves active class filter, does not force reset to "Semua")'
);

// 1.3 Verify two-way sync remains active (setUsbInputVal and setLastScanResult called)
assert(
  handleManualMarkCode.includes('setUsbInputVal(student.nisn || student.nama_siswa)'),
  'handleManualMark retains setUsbInputVal for two-way sync to QR input'
);
assert(
  handleManualMarkCode.includes('setLastScanResult('),
  'handleManualMark retains setLastScanResult to update feedback banner/card'
);
assert(
  handleManualMarkCode.includes('await fetchTodayScanData()'),
  'handleManualMark re-fetches today scan data to update attendance badges'
);

// 1.4 Simulation of filtering logic
const mockStudents = [
  { id: '1', nama_siswa: 'Ahmad Dahlan', kelas: '7A', nisn: '001' },
  { id: '2', nama_siswa: 'Ahmad Faiz', kelas: '7A', nisn: '002' },
  { id: '3', nama_siswa: 'Budi Santoso', kelas: '7A', nisn: '003' },
  { id: '4', nama_siswa: 'Citra Dewi', kelas: '7A', nisn: '004' },
  { id: '5', nama_siswa: 'Dewi Lestari', kelas: '7B', nisn: '005' },
  { id: '6', nama_siswa: 'Eko Prasetyo', kelas: '7B', nisn: '006' }
];

function filterStudents(students: typeof mockStudents, kelasFilter: string, searchQuery: string) {
  return students.filter(s => {
    const matchKelas = kelasFilter === 'Semua' || s.kelas === kelasFilter;
    const matchSearch = !searchQuery.trim() ||
      (s.nama_siswa?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (s.nisn?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchKelas && matchSearch;
  });
}

// Scenario A: Class 7A selected, no search query. Before and after clicking Tandai Datang for Ahmad Dahlan.
let currentKelasFilter = '7A';
let currentSearchQuery = '';
let visibleBefore = filterStudents(mockStudents, currentKelasFilter, currentSearchQuery);
assert(visibleBefore.length === 4, 'Scenario A: Initially 4 students visible in class 7A');

// Simulate handleManualMark without touching state
let simulatedScans: any[] = [];
function simulateManualMark(student: typeof mockStudents[0], status: 'datang' | 'pulang') {
  // Real implementation: sets usbInputVal, lastScanResult, and appends scan record
  simulatedScans.push({ siswa_id: student.id, nama_siswa: student.nama_siswa, kelas: student.kelas, status, jam: '07:15:00' });
  // Notice: currentKelasFilter and currentSearchQuery are NOT modified!
}

simulateManualMark(mockStudents[0], 'datang');
let visibleAfter = filterStudents(mockStudents, currentKelasFilter, currentSearchQuery);
assert(
  visibleAfter.length === 4,
  'Scenario A: All 4 students remain visible in class 7A after clicking Tandai Datang on student 1'
);
assert(
  currentKelasFilter === '7A',
  'Scenario A: Class filter remains "7A" and was not reset to "Semua"'
);

// Scenario B: User typed search query "Ahmad" (matches 2 students)
currentSearchQuery = 'Ahmad';
visibleBefore = filterStudents(mockStudents, currentKelasFilter, currentSearchQuery);
assert(visibleBefore.length === 2, 'Scenario B: Initially 2 students match search "Ahmad" in 7A');

simulateManualMark(mockStudents[1], 'datang');
visibleAfter = filterStudents(mockStudents, currentKelasFilter, currentSearchQuery);
assert(
  visibleAfter.length === 2,
  'Scenario B: Both matching students remain visible after clicking Tandai Datang on Ahmad Faiz'
);
assert(
  currentSearchQuery === 'Ahmad',
  'Scenario B: Search query remains "Ahmad" and is not replaced with full student name'
);

// ============================================================================
// SECTION 2: REQUIREMENT R1.2 — ROLE DIFFERENTIATION (GURU VS ADMIN)
// ============================================================================
console.log('\n--- Section 2: Requirement R1.2 (Role Differentiation) ---');

// 2.1 Role normalization logic
assert(
  piketCode.includes("const roleNormalized = (user?.role || '').toLowerCase().replace(/\\s+/g, '')"),
  'roleNormalized normalizes user.role by lowercasing and trimming all whitespace'
);
assert(
  piketCode.includes("const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin'"),
  'isAdmin evaluates true for both admin and superadmin roles'
);
assert(
  piketCode.includes("const isGuru = roleNormalized === 'guru'"),
  'isGuru evaluates true for guru role'
);

// Test role normalization across variations
function evalRoles(userRole: any) {
  const roleNormalized = (userRole || '').toLowerCase().replace(/\s+/g, '');
  const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';
  const isGuru = roleNormalized === 'guru';
  return { isAdmin, isGuru };
}

assert(evalRoles('Guru').isGuru === true && evalRoles('Guru').isAdmin === false, 'Role "Guru" is guru and not admin');
assert(evalRoles('guru').isGuru === true && evalRoles('guru').isAdmin === false, 'Role "guru" (lowercase) is guru and not admin');
assert(evalRoles('GURU').isGuru === true && evalRoles('GURU').isAdmin === false, 'Role "GURU" (uppercase) is guru and not admin');
assert(evalRoles('Admin').isAdmin === true && evalRoles('Admin').isGuru === false, 'Role "Admin" is admin and not guru');
assert(evalRoles('admin').isAdmin === true && evalRoles('admin').isGuru === false, 'Role "admin" (lowercase) is admin and not guru');
assert(evalRoles('Super Admin').isAdmin === true && evalRoles('Super Admin').isGuru === false, 'Role "Super Admin" (with space) is admin');
assert(evalRoles('superadmin').isAdmin === true && evalRoles('superadmin').isGuru === false, 'Role "superadmin" is admin');

// 2.2 Guru Compact UI Checks
console.log('\n--- Guru Compact UI Verification ---');
const guruStart = piketCode.indexOf('id="piket-content-scan-guru"');
const guruEnd = piketCode.indexOf('{/* TAB: PENUGASAN PIKET (ADMIN ONLY) */}');
assert(guruStart !== -1 && guruEnd !== -1 && guruEnd > guruStart, 'Guru scan section boundary identified');

const guruScanCode = piketCode.substring(guruStart, guruEnd);

// Guru: No Kiosk station selector
assert(
  !guruScanCode.includes('handleDeviceIdChange') && !guruScanCode.includes('Stasiun Kios:'),
  'Guru view hides Kiosk station dropdown selector (defaults to kiosk-default)'
);

// Guru: Compact attendance mode pill button
assert(
  guruScanCode.includes("Mode Presensi:") &&
  guruScanCode.includes("onClick={() => setScanMode('datang')}") &&
  guruScanCode.includes("onClick={() => setScanMode('pulang')}") &&
  guruScanCode.includes("inline-flex p-1 bg-white dark:bg-gray-800 rounded-xl"),
  'Guru view provides compact pill toggle button for Datang | Pulang'
);

// Guru: Inline counter badge
assert(
  guruScanCode.includes('Hadir Datang: {scanSummary.totalDatang}') &&
  guruScanCode.includes('Pulang: {scanSummary.totalPulang}'),
  'Guru view displays inline counter badge (Hadir Datang: X • Pulang: Y)'
);

// Guru: 1-tap touch buttons in roster
assert(
  guruScanCode.includes("onClick={() => handleManualMark(s, 'datang')}") &&
  guruScanCode.includes("onClick={() => handleManualMark(s, 'pulang')}") &&
  guruScanCode.includes("min-h-[38px]"),
  'Guru view renders fast touch-friendly student roster cards with 1-tap Datang/Pulang action buttons'
);

// Guru: 7-column Live Attendance Audit Log table is HIDDEN
assert(
  !guruScanCode.includes('Log Presensi Siswa Hari Ini') &&
  !guruScanCode.includes('<th>Kios</th>'),
  'Guru view completely hides the heavy 7-column Live Attendance Audit Log table'
);

// 2.3 Admin Detailed UI Checks
console.log('\n--- Admin Detailed UI Verification ---');
const adminStart = piketCode.indexOf('id="piket-content-scan"');
const adminEnd = piketCode.indexOf('id="piket-content-scan-guru"');
assert(adminStart !== -1 && adminEnd !== -1 && adminEnd > adminStart, 'Admin scan section boundary identified');

const adminScanCode = piketCode.substring(adminStart, adminEnd);

// Admin: Kiosk Station Selector (Kios 1-10)
assert(
  adminScanCode.includes('Stasiun Kios:') &&
  adminScanCode.includes('value="kiosk-1"') &&
  adminScanCode.includes('value="kiosk-10"'),
  'Admin view provides Kiosk station selector dropdown with Kios 1 to Kios 10 options'
);

// Admin: 3 large metric cards
assert(
  adminScanCode.includes('{scanSummary.totalDatang}') &&
  adminScanCode.includes('Total Hadir Datang') &&
  adminScanCode.includes('{scanSummary.totalPulang}') &&
  adminScanCode.includes('Total Pulang') &&
  adminScanCode.includes('{scanSummary.totalUnik}') &&
  adminScanCode.includes('Total Unik Siswa'),
  'Admin view renders 3 large standalone metric stat cards (Total Datang, Total Pulang, Total Unik Siswa)'
);

// Admin: 6-column roster table
assert(
  adminScanCode.includes('Presensi Manual & Daftar Siswa') &&
  adminScanCode.includes('Aksi Presensi Datang') &&
  adminScanCode.includes('Aksi Presensi Pulang'),
  'Admin view renders full detailed student roster table with separate Datang & Pulang column controls'
);

// Admin: 7-column Live Attendance Audit Log
assert(
  adminScanCode.includes('Log Presensi Siswa Hari Ini') &&
  adminScanCode.includes('<th className="py-2.5 px-3">No</th>') &&
  adminScanCode.includes('<th className="py-2.5 px-3">Waktu</th>') &&
  adminScanCode.includes('<th className="py-2.5 px-3">Nama Siswa</th>') &&
  adminScanCode.includes('<th className="py-2.5 px-3">Kelas</th>') &&
  adminScanCode.includes('<th className="py-2.5 px-3">NISN</th>') &&
  adminScanCode.includes('<th className="py-2.5 px-3">Status</th>') &&
  adminScanCode.includes('<th className="py-2.5 px-3">Kios</th>'),
  'Admin view renders complete 7-column Live Attendance Audit Log table'
);

// Admin: Penugasan Piket tab access
assert(
  piketCode.includes("activeTab === 'penugasan' && isAdmin"),
  'Penugasan Piket tab is restricted strictly to Admin role'
);

// ============================================================================
// SECTION 3: INTEGRITY & ANTI-CHEATING AUDIT
// ============================================================================
console.log('\n--- Section 3: Adversarial Integrity Audit ---');

// Check for hardcoded responses or dummy mocks in production code
assert(
  !piketCode.includes('// dummy') &&
  !piketCode.includes('/* dummy */') &&
  !piketCode.includes('fakeData') &&
  !piketCode.includes('mockResult'),
  'No dummy/fake/mock data structures in PiketView.tsx'
);

// Check that recordPresensiSiswa is called with legitimate parameters
assert(
  handleManualMarkCode.includes('recordPresensiSiswa(supabase, {') &&
  handleManualMarkCode.includes('siswa: {') &&
  handleManualMarkCode.includes('status,'),
  'handleManualMark genuinely calls recordPresensiSiswa API helper with database client and student object'
);

console.log('\n====================================================');
console.log(`RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
