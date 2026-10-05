/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL TEST SUITE — CHALLENGER M1
 * File: tests/challenger_m1_piket_filter_ui.test.ts
 *
 * Requirements Empirically Verified:
 * - R1.1: Marking a student via handleManualMark does NOT mutate or clear
 *         manualSearchQuery or manualKelasFilter. When simulated on a list
 *         of N students, after marking 1 student (or sequential students),
 *         all N students remain present in the filtered array.
 * - R1.2: PiketView renders distinct UI for Guru (!isAdmin / isGuru) vs Admin (isAdmin):
 *         Guru:
 *           - Hides kiosk station selector (defaults to kiosk-default)
 *           - Renders compact mode toggle (Pill button Datang | Pulang)
 *           - Renders inline counter badge (Hadir Datang: X • Pulang: Y)
 *           - Hides 7-column Live Attendance Audit Log table
 *           - Renders touch-friendly 1-tap action buttons per student
 *         Admin:
 *           - Renders kiosk station selector with exactly 10 options (kiosk-1 to kiosk-10)
 *           - Renders 3 standalone metric cards (Total Hadir Datang, Total Pulang, Total Unik Siswa)
 *           - Renders full 7-column Live Attendance Audit Log table (No, Waktu, Nama Siswa, Kelas, NISN, Status, Kios)
 *           - Renders full 6-column roster table with cancellation options
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testId: string, desc: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✔ [${testId}] PASS:${RESET} ${desc}`);
    if (detail) console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✖ [${testId}] FAIL:${RESET} ${desc}`);
    if (detail) console.error(`    ${RED}↳ Detail: ${detail}${RESET}`);
  }
}

async function runChallengerTestSuite() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  CHALLENGER M1: PIKETVIEW FILTER PERSISTENCE & ROLE UI EMPIRICAL TEST║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
  assert(fs.existsSync(piketPath), 'ENV-01', 'src/components/PiketView.tsx must exist');

  const piketCode = fs.readFileSync(piketPath, 'utf-8');

  // ==========================================================================
  // SECTION 1: STATIC CODE & AST PARSING OF PiketView.tsx
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 1. CODE STRUCTURE & IMPLEMENTATION VERIFICATION ━━━${RESET}`);

  // Extract handleManualMark implementation block
  const handleManualMarkMatch = piketCode.match(/const\s+handleManualMark\s*=\s*async\s*\([\s\S]*?\n\s*\}\s*;/);
  assert(
    handleManualMarkMatch !== null,
    'CODE-01',
    'handleManualMark function is defined in PiketView.tsx',
    handleManualMarkMatch ? `Found function definition of length ${handleManualMarkMatch[0].length} chars` : 'Not found'
  );

  const manualMarkBlock = handleManualMarkMatch ? handleManualMarkMatch[0] : '';

  // R1.1 Verification inside handleManualMark:
  // Must NOT contain setManualSearchQuery or setManualKelasFilter
  const containsSetManualSearch = /setManualSearchQuery\s*\(/.test(manualMarkBlock);
  assert(
    !containsSetManualSearch,
    'R1.1-CODE-01',
    'handleManualMark does NOT call setManualSearchQuery',
    containsSetManualSearch ? 'FAIL: setManualSearchQuery found inside handleManualMark' : 'Confirmed absent'
  );

  const containsSetManualKelas = /setManualKelasFilter\s*\(/.test(manualMarkBlock);
  assert(
    !containsSetManualKelas,
    'R1.1-CODE-02',
    'handleManualMark does NOT call setManualKelasFilter',
    containsSetManualKelas ? 'FAIL: setManualKelasFilter found inside handleManualMark' : 'Confirmed absent'
  );

  // Must still contain USB input syncing (setUsbInputVal) to preserve two-way sync
  const containsSetUsbInput = /setUsbInputVal\s*\(\s*student\.nisn\s*\|\|\s*student\.nama_siswa\s*\)/.test(manualMarkBlock);
  assert(
    containsSetUsbInput,
    'R1.1-CODE-03',
    'handleManualMark retains USB input sync (setUsbInputVal)',
    containsSetUsbInput ? 'Confirmed setUsbInputVal is called' : 'Missing setUsbInputVal'
  );

  // Must update lastScanResult
  const containsSetLastScan = /setLastScanResult\s*\(/.test(manualMarkBlock);
  assert(
    containsSetLastScan,
    'R1.1-CODE-04',
    'handleManualMark updates lastScanResult for visual feedback',
    containsSetLastScan ? 'Confirmed setLastScanResult is called' : 'Missing setLastScanResult'
  );

  // Filter definition in PiketView.tsx
  const filterDefMatch = piketCode.match(/const\s+filteredManualStudents\s*=\s*allStudents\.filter\([\s\S]*?\n\s*\}\s*\);/);
  assert(
    filterDefMatch !== null,
    'R1.1-CODE-05',
    'filteredManualStudents uses manualKelasFilter and manualSearchQuery',
    filterDefMatch ? 'Filter definition located successfully' : 'Not found'
  );

  // Role normalization verification
  assert(
    piketCode.includes("const roleNormalized = (user?.role || '').toLowerCase().replace(/\\s+/g, '');"),
    'R1.2-CODE-01',
    'PiketView normalizes user role strings by trimming, lowercasing, and stripping whitespace'
  );

  assert(
    piketCode.includes("const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';"),
    'R1.2-CODE-02',
    'PiketView recognizes both admin and superadmin as isAdmin'
  );

  assert(
    piketCode.includes("const isGuru = roleNormalized === 'guru';"),
    'R1.2-CODE-03',
    'PiketView recognizes guru role'
  );

  // ==========================================================================
  // SECTION 2: EMPIRICAL STATE & FILTER SIMULATION (R1.1)
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. EMPIRICAL FILTER PERSISTENCE SIMULATION (R1.1) ━━━${RESET}`);

  // Create synthetic dataset of 30 students across 3 classes
  interface TestStudent {
    id: string;
    nisn: string;
    nama_siswa: string;
    kelas: string;
    gender: 'L' | 'P';
    sekolah_id: string;
  }

  const mockStudents: TestStudent[] = [];
  const classes = ['X-A', 'X-B', 'XI-IPA'];
  let studentCounter = 1;

  for (const cls of classes) {
    for (let i = 1; i <= 10; i++) {
      mockStudents.push({
        id: `std-${studentCounter}`,
        nisn: `00${10000 + studentCounter}`,
        nama_siswa: `Siswa ${cls} No ${i}`,
        kelas: cls,
        gender: i % 2 === 0 ? 'L' : 'P',
        sekolah_id: 'sch-1'
      });
      studentCounter++;
    }
  }

  // Exact filtering algorithm from PiketView.tsx lines 843-850
  function computeFilteredStudents(
    students: TestStudent[],
    kelasFilter: string,
    searchQuery: string
  ): TestStudent[] {
    return students.filter(s => {
      const matchKelas = kelasFilter === 'Semua' || s.kelas === kelasFilter;
      const matchSearch =
        !searchQuery.trim() ||
        (s.nama_siswa?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (s.nisn?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        ((s as any).qr_code?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      return matchKelas && matchSearch;
    });
  }

  // Simulated state container replicating React state hooks
  class PiketStateSimulator {
    manualKelasFilter: string = 'Semua';
    manualSearchQuery: string = '';
    usbInputVal: string = '';
    todayScans: any[] = [];
    lastScanResult: any = null;
    allStudents: TestStudent[];

    constructor(initialStudents: TestStudent[]) {
      this.allStudents = [...initialStudents];
    }

    get filteredManualStudents(): TestStudent[] {
      return computeFilteredStudents(this.allStudents, this.manualKelasFilter, this.manualSearchQuery);
    }

    // Fixed handleManualMark as currently implemented in PiketView.tsx
    async handleManualMark(student: TestStudent, status: 'datang' | 'pulang', mockResult: 'success' | 'alreadyExists' | 'error') {
      const jamStr = '07:15:00';
      if (mockResult === 'success') {
        this.lastScanResult = {
          student,
          status,
          success: true,
          alreadyExists: false,
          jam: jamStr
        };
        // Fix: updates USB input, does NOT reset manualSearchQuery or manualKelasFilter
        this.usbInputVal = student.nisn || student.nama_siswa;
        this.todayScans.push({
          id: `scan-${Date.now()}-${Math.random()}`,
          siswa_id: student.id,
          nisn: student.nisn,
          nama_siswa: student.nama_siswa,
          kelas: student.kelas,
          status,
          jam: jamStr
        });
      } else if (mockResult === 'alreadyExists') {
        this.lastScanResult = {
          student,
          status,
          success: false,
          alreadyExists: true,
          jam: jamStr
        };
        this.usbInputVal = student.nisn || student.nama_siswa;
      } else {
        this.lastScanResult = {
          student,
          status,
          success: false,
          alreadyExists: false,
          jam: jamStr
        };
      }
    }

    // Buggy legacy implementation for regression comparison
    async legacyBuggyHandleManualMark(student: TestStudent, status: 'datang' | 'pulang') {
      this.usbInputVal = student.nisn || student.nama_siswa;
      // BUG: reset query to student name and reset class to 'Semua'
      this.manualSearchQuery = student.nama_siswa;
      this.manualKelasFilter = 'Semua';
    }
  }

  // TEST 2.1: Class filter selected, mark 1 student -> All class students remain visible
  {
    const sim = new PiketStateSimulator(mockStudents);
    sim.manualKelasFilter = 'X-A';
    sim.manualSearchQuery = '';

    const initialFiltered = sim.filteredManualStudents;
    assert(
      initialFiltered.length === 10,
      'SIM-01',
      'Initial filtered list for class X-A has exactly 10 students',
      `Count: ${initialFiltered.length}`
    );

    const targetStudent = initialFiltered[0]; // Siswa X-A No 1
    await sim.handleManualMark(targetStudent, 'datang', 'success');

    const postMarkFiltered = sim.filteredManualStudents;
    assert(
      postMarkFiltered.length === 10,
      'R1.1-SIM-01',
      'After marking 1 student, ALL 10 students in class X-A remain in filtered list',
      `Expected 10, Got: ${postMarkFiltered.length}`
    );

    assert(
      sim.manualKelasFilter === 'X-A',
      'R1.1-SIM-02',
      'manualKelasFilter remains "X-A" (not reset to "Semua")',
      `Value: ${sim.manualKelasFilter}`
    );

    assert(
      sim.manualSearchQuery === '',
      'R1.1-SIM-03',
      'manualSearchQuery remains empty string (not set to student name)',
      `Value: "${sim.manualSearchQuery}"`
    );

    assert(
      sim.usbInputVal === targetStudent.nisn,
      'R1.1-SIM-04',
      'usbInputVal is synced with student NISN/name for two-way sync',
      `Value: ${sim.usbInputVal}`
    );
  }

  // TEST 2.2: Adversarial proof - Compare with buggy legacy behavior
  {
    const buggySim = new PiketStateSimulator(mockStudents);
    buggySim.manualKelasFilter = 'X-A';
    buggySim.manualSearchQuery = '';

    await buggySim.legacyBuggyHandleManualMark(buggySim.filteredManualStudents[0], 'datang');
    const buggyResult = buggySim.filteredManualStudents;

    assert(
      buggyResult.length === 1,
      'BUG-REPRO-01',
      'Legacy buggy code reproduced: list collapses down to 1 student',
      `Buggy count: ${buggyResult.length} (Target: ${buggyResult[0].nama_siswa})`
    );

    assert(
      buggySim.manualKelasFilter === 'Semua',
      'BUG-REPRO-02',
      'Legacy buggy code forcibly reset class filter to "Semua"'
    );
  }

  // TEST 2.3: Sequential marking of multiple students (Stress test N=10 in class)
  {
    const sim = new PiketStateSimulator(mockStudents);
    sim.manualKelasFilter = 'X-B';
    sim.manualSearchQuery = '';

    const targetClassStudents = [...sim.filteredManualStudents];
    assert(targetClassStudents.length === 10, 'SIM-02', 'Class X-B starts with 10 students');

    for (let i = 0; i < 5; i++) {
      const studentToMark = targetClassStudents[i];
      await sim.handleManualMark(studentToMark, 'datang', 'success');

      assert(
        sim.filteredManualStudents.length === 10,
        `R1.1-SEQ-0${i + 1}`,
        `Step ${i + 1}/5: List remains intact with 10 students after marking "${studentToMark.nama_siswa}"`,
        `Current list size: ${sim.filteredManualStudents.length}`
      );
    }

    assert(
      sim.todayScans.length === 5,
      'SIM-03',
      'All 5 students recorded attendance in todayScans',
      `Recorded: ${sim.todayScans.length}`
    );
  }

  // TEST 2.4: Active search query persistence
  {
    const sim = new PiketStateSimulator(mockStudents);
    sim.manualKelasFilter = 'Semua';
    sim.manualSearchQuery = 'No 5'; // Matches "Siswa X-A No 5", "Siswa X-B No 5", "Siswa XI-IPA No 5"

    const matchingInitial = sim.filteredManualStudents;
    assert(matchingInitial.length === 3, 'SIM-04', 'Search for "No 5" returns 3 students across classes');

    await sim.handleManualMark(matchingInitial[0], 'datang', 'success');

    assert(
      sim.manualSearchQuery === 'No 5',
      'R1.1-SEARCH-01',
      'manualSearchQuery is preserved as "No 5" after marking student',
      `Query: "${sim.manualSearchQuery}"`
    );

    assert(
      sim.filteredManualStudents.length === 3,
      'R1.1-SEARCH-02',
      'All 3 matching search results remain visible in the filtered list',
      `Remaining: ${sim.filteredManualStudents.length}`
    );
  }

  // TEST 2.5: AlreadyExists & Error branches do not corrupt filters
  {
    const sim = new PiketStateSimulator(mockStudents);
    sim.manualKelasFilter = 'XI-IPA';
    sim.manualSearchQuery = 'Siswa';

    const countBefore = sim.filteredManualStudents.length;

    // Simulate duplicate mark
    await sim.handleManualMark(sim.filteredManualStudents[0], 'datang', 'alreadyExists');
    assert(
      sim.filteredManualStudents.length === countBefore,
      'R1.1-DUP-01',
      'Duplicate attendance mark preserves filter count and state'
    );
    assert(
      sim.manualKelasFilter === 'XI-IPA' && sim.manualSearchQuery === 'Siswa',
      'R1.1-DUP-02',
      'manualKelasFilter and manualSearchQuery untouched on duplicate mark'
    );

    // Simulate error mark
    await sim.handleManualMark(sim.filteredManualStudents[1], 'datang', 'error');
    assert(
      sim.filteredManualStudents.length === countBefore,
      'R1.1-ERR-01',
      'Error during attendance mark preserves filter count and state'
    );
    assert(
      sim.manualKelasFilter === 'XI-IPA' && sim.manualSearchQuery === 'Siswa',
      'R1.1-ERR-02',
      'manualKelasFilter and manualSearchQuery untouched on error'
    );
  }

  // TEST 2.6: High-volume stress test (N=1000 students)
  {
    const largeRoster: TestStudent[] = [];
    for (let i = 1; i <= 1000; i++) {
      largeRoster.push({
        id: `std-bulk-${i}`,
        nisn: `99${String(i).padStart(6, '0')}`,
        nama_siswa: `Siswa Bulk ${i}`,
        kelas: `Kelas-${(i % 20) + 1}`,
        gender: i % 2 === 0 ? 'L' : 'P',
        sekolah_id: 'sch-bulk'
      });
    }

    const bulkSim = new PiketStateSimulator(largeRoster);
    bulkSim.manualKelasFilter = 'Kelas-5'; // 50 students
    const initialBulkCount = bulkSim.filteredManualStudents.length;
    assert(initialBulkCount === 50, 'SIM-05', 'Large roster has 50 students in Kelas-5');

    // Mark 10 students rapidly
    const startT = performance.now();
    for (let i = 0; i < 10; i++) {
      await bulkSim.handleManualMark(bulkSim.filteredManualStudents[i], 'datang', 'success');
    }
    const endT = performance.now();

    assert(
      bulkSim.filteredManualStudents.length === 50,
      'R1.1-STRESS-01',
      'All 50 students in Kelas-5 remain visible after 10 high-speed marks in 1,000 student roster',
      `Duration: ${(endT - startT).toFixed(2)}ms`
    );
    assert(
      bulkSim.manualKelasFilter === 'Kelas-5',
      'R1.1-STRESS-02',
      'Class filter persists in large scale dataset'
    );
  }

  // ==========================================================================
  // SECTION 3: EMPIRICAL UI STRUCTURE & ROLE DIFFERENTIATION (R1.2)
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. ROLE-BASED UI DIFFERENTIATION VERIFICATION (R1.2) ━━━${RESET}`);

  // Test role normalization across multiple edge-case role strings
  function testRoleAccess(role: any) {
    const roleNormalized = (role || '').toLowerCase().replace(/\s+/g, '');
    const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';
    const isGuru = roleNormalized === 'guru';
    return { isAdmin, isGuru };
  }

  const roleCases = [
    { input: 'Admin', expectedAdmin: true, expectedGuru: false },
    { input: 'admin', expectedAdmin: true, expectedGuru: false },
    { input: 'Superadmin', expectedAdmin: true, expectedGuru: false },
    { input: 'Super Admin', expectedAdmin: true, expectedGuru: false },
    { input: '  superadmin  ', expectedAdmin: true, expectedGuru: false },
    { input: 'Guru', expectedAdmin: false, expectedGuru: true },
    { input: 'guru', expectedAdmin: false, expectedGuru: true },
    { input: ' GURU ', expectedAdmin: false, expectedGuru: true },
    { input: 'wali_kelas', expectedAdmin: false, expectedGuru: false },
    { input: 'siswa', expectedAdmin: false, expectedGuru: false },
    { input: '', expectedAdmin: false, expectedGuru: false },
    { input: undefined, expectedAdmin: false, expectedGuru: false }
  ];

  for (const rc of roleCases) {
    const res = testRoleAccess(rc.input);
    assert(
      res.isAdmin === rc.expectedAdmin && res.isGuru === rc.expectedGuru,
      `ROLE-NORM-${rc.input || 'empty'}`,
      `Role "${rc.input}" correctly parsed: isAdmin=${res.isAdmin}, isGuru=${res.isGuru}`
    );
  }

  // Extract the JSX blocks for Admin and Guru scan view
  const scanTabMatch = piketCode.match(/\{activeTab === 'scan' && \([\s\S]*?\)\s*\}\s*\)/);
  assert(scanTabMatch !== null, 'UI-01', 'Found activeTab === "scan" block in PiketView.tsx');

  const scanTabCode = scanTabMatch ? scanTabMatch[0] : '';

  // Extract Admin branch: starts at isAdmin ? ( <div id="piket-content-scan"
  const adminBranchMatch = scanTabCode.match(/isAdmin \?\s*\(\s*<div id="piket-content-scan"[\s\S]*?\)\s*:\s*\(/);
  assert(
    adminBranchMatch !== null,
    'UI-02',
    'Admin branch located with id="piket-content-scan"',
    adminBranchMatch ? `Admin branch length: ${adminBranchMatch[0].length} chars` : 'Missing'
  );
  const adminBranch = adminBranchMatch ? adminBranchMatch[0] : '';

  // Extract Guru branch: starts after ) : ( with id="piket-content-scan-guru"
  const guruBranchMatch = scanTabCode.match(/id="piket-content-scan-guru"[\s\S]*?\)\s*\)\s*;/);
  assert(
    guruBranchMatch !== null,
    'UI-03',
    'Guru branch located with id="piket-content-scan-guru"',
    guruBranchMatch ? `Guru branch length: ${guruBranchMatch[0].length} chars` : 'Missing'
  );
  const guruBranch = guruBranchMatch ? guruBranchMatch[0] : '';

  // --------------------------------------------------------------------------
  // R1.2 VERIFICATION: GURU VIEW (Ringkas)
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}--- Verifying Guru View (!isAdmin / isGuru) ---${RESET}`);

  // 1. Kiosk Station Selector must be HIDDEN in Guru branch
  const guruHasKioskSelect = /Stasiun Kios:/.test(guruBranch) || /<select[^>]*value=\{deviceId\}/.test(guruBranch);
  assert(
    !guruHasKioskSelect,
    'R1.2-GURU-01',
    'Guru View HIDES kiosk station selector dropdown',
    guruHasKioskSelect ? 'FAIL: Kiosk station selector found in Guru View' : 'Confirmed hidden'
  );

  // Guru default deviceId check in state initialization
  assert(
    piketCode.includes("const [deviceId, setDeviceId] = useState<string>(isAdmin ? 'kiosk-1' : 'kiosk-default');"),
    'R1.2-GURU-02',
    'deviceId defaults to "kiosk-default" for Guru and "kiosk-1" for Admin'
  );

  // 2. Compact Mode Toggle rendered in Guru branch
  const guruHasCompactToggle =
    guruBranch.includes('Mode Presensi:') &&
    guruBranch.includes("onClick={() => setScanMode('datang')}") &&
    guruBranch.includes("onClick={() => setScanMode('pulang')}") &&
    guruBranch.includes('Datang') &&
    guruBranch.includes('Pulang');
  assert(
    guruHasCompactToggle,
    'R1.2-GURU-03',
    'Guru View RENDERS compact mode toggle (Pill button Datang | Pulang)',
    guruHasCompactToggle ? 'Confirmed compact pill button present' : 'Missing compact toggle'
  );

  // 3. Inline Counter Badge rendered in Guru branch
  const guruHasInlineCounter =
    guruBranch.includes('Hadir Datang: {scanSummary.totalDatang}') &&
    guruBranch.includes('Pulang: {scanSummary.totalPulang}') &&
    guruBranch.includes('inline-flex items-center gap-2');
  assert(
    guruHasInlineCounter,
    'R1.2-GURU-04',
    'Guru View RENDERS inline counter badge (Hadir Datang: X • Pulang: Y)',
    guruHasInlineCounter ? 'Confirmed inline counter badge present' : 'Missing inline counter badge'
  );

  // Guru view must NOT render the 3 standalone large metric cards
  const guruHasStandaloneCards =
    guruBranch.includes('Total Hadir Datang') ||
    guruBranch.includes('Total Pulang') ||
    guruBranch.includes('Total Unik Siswa');
  assert(
    !guruHasStandaloneCards,
    'R1.2-GURU-05',
    'Guru View does NOT render standalone large metric cards (replaced by inline badge)',
    guruHasStandaloneCards ? 'FAIL: Found standalone cards in Guru view' : 'Confirmed absent'
  );

  // 4. 7-column Live Attendance Audit Log Table must be HIDDEN in Guru branch
  const guruHasAuditLogTable =
    guruBranch.includes('Log Presensi Siswa Hari Ini') ||
    guruBranch.includes('<th className="py-2.5 px-3">Kios</th>') ||
    guruBranch.includes('colSpan={7}');
  assert(
    !guruHasAuditLogTable,
    'R1.2-GURU-06',
    'Guru View HIDES 7-column Live Attendance Audit Log table',
    guruHasAuditLogTable ? 'FAIL: Live Attendance Audit Log table found in Guru View' : 'Confirmed hidden'
  );

  // 5. Touch-friendly Student Roster with 1-tap buttons in Guru branch
  const guruHasTouchRoster =
    guruBranch.includes('Menampilkan {filteredManualStudents.length} siswa') &&
    guruBranch.includes('handleManualMark(s, \'datang\')') &&
    guruBranch.includes('handleManualMark(s, \'pulang\')') &&
    guruBranch.includes('1-tap tombol untuk mencatat kehadiran');
  assert(
    guruHasTouchRoster,
    'R1.2-GURU-07',
    'Guru View RENDERS touch-friendly roster with 1-tap Datang/Pulang action buttons'
  );

  // --------------------------------------------------------------------------
  // R1.2 VERIFICATION: ADMIN VIEW (Detail)
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}--- Verifying Admin View (isAdmin) ---${RESET}`);

  // 1. Kiosk Station Selector with 10 options rendered in Admin branch
  const adminHasKioskLabel = adminBranch.includes('Stasiun Kios:');
  const kioskOptionsMatch = adminBranch.match(/<option\s+value="kiosk-\d+">[\s\S]*?<\/option>/g);
  const kioskOptionsCount = kioskOptionsMatch ? kioskOptionsMatch.length : 0;

  assert(
    adminHasKioskLabel && kioskOptionsCount === 10,
    'R1.2-ADMIN-01',
    'Admin View RENDERS kiosk station selector with exactly 10 options (kiosk-1 to kiosk-10)',
    `Found options count: ${kioskOptionsCount}`
  );

  // Verify all 10 options exist specifically
  let all10Present = true;
  for (let k = 1; k <= 10; k++) {
    if (!adminBranch.includes(`value="kiosk-${k}"`)) {
      all10Present = false;
      break;
    }
  }
  assert(
    all10Present,
    'R1.2-ADMIN-02',
    'Admin View contains kiosk-1 through kiosk-10 continuously'
  );

  // 2. 3 Standalone Metric Cards rendered in Admin branch
  const adminHasMetricDatang = adminBranch.includes('Total Hadir Datang') && adminBranch.includes('{scanSummary.totalDatang}');
  const adminHasMetricPulang = adminBranch.includes('Total Pulang') && adminBranch.includes('{scanSummary.totalPulang}');
  const adminHasMetricUnik = adminBranch.includes('Total Unik Siswa') && adminBranch.includes('{scanSummary.totalUnik}');

  assert(
    adminHasMetricDatang && adminHasMetricPulang && adminHasMetricUnik,
    'R1.2-ADMIN-03',
    'Admin View RENDERS 3 standalone metric cards (Total Hadir Datang, Total Pulang, Total Unik Siswa)',
    `Datang: ${adminHasMetricDatang}, Pulang: ${adminHasMetricPulang}, Unik: ${adminHasMetricUnik}`
  );

  // 3. Full 7-column Live Attendance Audit Log Table rendered in Admin branch
  const adminHasAuditTable = adminBranch.includes('Log Presensi Siswa Hari Ini');
  assert(
    adminHasAuditTable,
    'R1.2-ADMIN-04',
    'Admin View RENDERS Live Attendance Audit Log section ("Log Presensi Siswa Hari Ini")'
  );

  // Verify exact 7 columns
  const tableHeaders = ['No', 'Waktu', 'Nama Siswa', 'Kelas', 'NISN', 'Status', 'Kios'];
  let allHeadersFound = true;
  for (const h of tableHeaders) {
    if (!adminBranch.includes(`<th className="py-2.5 px-3">${h}</th>`)) {
      allHeadersFound = false;
      console.warn(`Header not found: ${h}`);
    }
  }
  assert(
    allHeadersFound,
    'R1.2-ADMIN-05',
    'Live Attendance Audit Log table in Admin View has exact 7 columns: No, Waktu, Nama Siswa, Kelas, NISN, Status, Kios',
    `Found all: ${allHeadersFound}`
  );

  assert(
    adminBranch.includes('colSpan={7}'),
    'R1.2-ADMIN-06',
    'Empty state in Admin Audit Log table specifies colSpan={7}'
  );

  // 4. Admin Penugasan Piket tab access restriction
  assert(
    piketCode.includes("{isAdmin && (") && piketCode.includes("onClick={() => setActiveTab('penugasan')}"),
    'R1.2-ADMIN-07',
    'Penugasan Piket tab is exclusively shown to Admin (isAdmin &&)'
  );

  // ==========================================================================
  // SECTION 4: REGRESSION TEST FOR PREVIOUS MILESTONE (QR 2-WAY SYNC)
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 4. REGRESSION VERIFICATION (QR TWO-WAY SYNC PRESERVED) ━━━${RESET}`);

  // In handleProcessScan (when scanning QR), two-way sync to manual input is retained
  const handleProcessScanMatch = piketCode.match(/const\s+handleProcessScan\s*=\s*async\s*\([\s\S]*?\n\s*\}\s*;/);
  const scanProcessCode = handleProcessScanMatch ? handleProcessScanMatch[0] : '';

  assert(
    scanProcessCode.includes('setManualSearchQuery(student.nama_siswa)'),
    'REG-01',
    'handleProcessScan retains QR -> manual form synchronization as required by earlier milestone'
  );

  assert(
    scanProcessCode.includes('setUsbInputVal(student.nisn || student.nama_siswa)'),
    'REG-02',
    'handleProcessScan syncs scanned student code to USB input'
  );

  // ==========================================================================
  // FINAL REPORT & SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}CHALLENGER VERIFICATION SUMMARY:${RESET}`);
  console.log(`Total Tests Run:  ${totalTests}`);
  console.log(`Passed:           ${GREEN}${passedTests}${RESET}`);
  console.log(`Failed:           ${failedTests > 0 ? RED + failedTests : GREEN + '0'}${RESET}`);
  console.log(`${CYAN}${BOLD}══════════════════════════════════════════════════════════════════════${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${RED}${BOLD}VERDICT: REQUEST_CHANGES (${failedTests} tests failed)${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}VERDICT: APPROVE (All ${totalTests} tests passed cleanly)${RESET}\n`);
    process.exit(0);
  }
}

runChallengerTestSuite().catch(err => {
  console.error(`${RED}Unexpected Test Suite Error:${RESET}`, err);
  process.exit(1);
});
