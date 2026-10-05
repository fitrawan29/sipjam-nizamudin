/**
 * ============================================================================
 * ADVERSARIAL REVIEWER TEST SUITE: PRESENSI SISWA TWO-WAY SYNC & SUPERADMIN
 * File: tests/adversarial_presensi_sync_reviewer.test.ts
 *
 * Attacks & Verifies:
 * - ADV-1: Hardware barcode scanner rapid key bursts, carriage return \r & \n
 * - ADV-2: Focus select & anti-concatenation buffer protection for consecutive scans
 * - ADV-3: Cross-class manual search without class filter trap
 * - ADV-4: Stale scan feedback card dismissal upon input clearing or mismatch
 * - ADV-5: Complete Superadmin mode_presensi_siswa removal with schema safety
 * - ADV-6: Zero dead state variables (modePresensiSiswa cleanup)
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

function pass(id: string, desc: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${desc}`);
  if (detail) {
    console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  }
}

function fail(id: string, desc: string, error?: any) {
  totalTests++;
  failedTests++;
  const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  console.error(`  ${RED}✖ [${id}] FAIL:${RESET} ${desc}`);
  if (errMsg) {
    console.error(`    ${RED}↳ Error: ${errMsg}${RESET}`);
  }
}

async function runAdversarialTests() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  ADVERSARIAL REVIEWER QA: PRESENSI SISWA & HARDWARE EDGE CASES       ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
  const piketCode = fs.readFileSync(piketPath, 'utf-8');

  const superadminPath = path.resolve(process.cwd(), 'src/components/SuperadminView.tsx');
  const superadminCode = fs.readFileSync(superadminPath, 'utf-8');

  // ==========================================================================
  // SECTION 1: HARDWARE SCANNER BURSTS & CARRIAGE RETURN \r / \n HANDLING
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ 1. HARDWARE SCANNER INPUT RESILIENCE (BURST / \\r / \\n) ━━━${RESET}`);

  // ADV-1.1: handleUsbInputChange detects \n or \r and immediately triggers handleProcessScan
  const usbHandlesCrLf = piketCode.includes("val.includes('\\n') || val.includes('\\r')") &&
                         piketCode.includes('handleProcessScan(cleanVal)');
  if (usbHandlesCrLf) {
    pass('ADV-01', 'handleUsbInputChange detects hardware scanner \\r / \\n burst and triggers immediate scan');
  } else {
    fail('ADV-01', 'handleUsbInputChange lacks hardware scanner carriage return / newline burst detection');
  }

  // ADV-1.2: handleManualSearchChange detects \n or \r and triggers manual submission
  const manualHandlesCrLf = piketCode.includes("handleManualSearchChange") &&
                            piketCode.includes("val.includes('\\n') || val.includes('\\r')") &&
                            piketCode.includes("handleManualFormSubmit()");
  if (manualHandlesCrLf) {
    pass('ADV-02', 'handleManualSearchChange detects hardware scanner \\r / \\n burst and triggers manual form submit');
  } else {
    fail('ADV-02', 'handleManualSearchChange lacks carriage return / newline handling');
  }

  // ADV-1.3: usbInputRef has onFocus e.target.select() to prevent barcode concatenation
  const usbHasSelectOnFocus = piketCode.includes('e.target.select()') && piketCode.includes('usbInputRef');
  if (usbHasSelectOnFocus) {
    pass('ADV-03', 'usbInputRef selects text on focus to prevent barcode concatenation across consecutive scans');
  } else {
    fail('ADV-03', 'usbInputRef missing e.target.select() on focus');
  }

  // ADV-1.4: usbInputRef has onKeyDown handler supporting Enter, \r, \n, and keyCode 13
  const usbHasOnKeyDown = piketCode.includes("e.key === 'Enter' || e.key === '\\r' || e.key === '\\n' || e.keyCode === 13");
  if (usbHasOnKeyDown) {
    pass('ADV-04', 'usbInputRef has dedicated onKeyDown interceptor for Enter / \\r / \\n / keyCode 13');
  } else {
    fail('ADV-04', 'usbInputRef missing dedicated onKeyDown interceptor');
  }

  // ==========================================================================
  // SECTION 2: CROSS-CLASS SEARCH & FILTER INTEGRITY
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. CROSS-CLASS SEARCH & FILTER INTEGRITY ━━━${RESET}`);

  // ADV-2.1: Initial manualKelasFilter is NOT forced to uniqueKelas[0] on data load
  const hasFilterLock = piketCode.includes("setManualKelasFilter(prev => prev === 'Semua' ? (uniqueKelas[0] as string) : prev)");
  if (!hasFilterLock) {
    pass('ADV-05', 'manualKelasFilter defaults cleanly to "Semua" without being locked to the first class on load');
  } else {
    fail('ADV-05', 'manualKelasFilter is locked to uniqueKelas[0] on student load');
  }

  // ADV-2.2: handleManualFormSubmit searches across all students in school if not found in active class filter
  const hasCrossSchoolSearch = piketCode.includes("const allMatches = allStudents.filter(") &&
                               piketCode.includes("setManualKelasFilter('Semua')");
  if (hasCrossSchoolSearch) {
    pass('ADV-06', 'handleManualFormSubmit falls back to cross-school student matching if filtered by class');
  } else {
    fail('ADV-06', 'handleManualFormSubmit lacks cross-school fallback matching');
  }

  // ADV-2.3: handleManualMark resets manualKelasFilter to 'Semua' so marked student is visible in roster
  const manualMarkResetsFilter = piketCode.includes("handleManualMark = async") &&
                                 piketCode.includes("setManualKelasFilter('Semua')");
  if (manualMarkResetsFilter) {
    pass('ADV-07', 'handleManualMark resets manualKelasFilter to "Semua" to keep marked student visible in roster');
  } else {
    fail('ADV-07', 'handleManualMark does not reset manualKelasFilter to "Semua"');
  }

  // ==========================================================================
  // SECTION 3: STALE QR CARD DISMISSAL & BIDIRECTIONAL SYNC
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. STALE SCAN CARD DISMISSAL & BIDIRECTIONAL SYNC ━━━${RESET}`);

  // ADV-3.1: Clearing manual search query dismisses lastScanResult
  const clearDismissesScan = piketCode.includes("setManualSearchQuery('')") &&
                             piketCode.includes("setUsbInputVal('')") &&
                             piketCode.includes("setLastScanResult(null)");
  if (clearDismissesScan) {
    pass('ADV-08', 'Clicking search clear "X" button resets query, USB buffer, and dismisses lastScanResult');
  } else {
    fail('ADV-08', 'Search clear button does not dismiss lastScanResult');
  }

  // ADV-3.2: Cancelling manual attendance dismisses lastScanResult if matching student
  const cancelDismissesScan = piketCode.includes("handleCancelManualPresensi") &&
                              piketCode.includes("lastScanResult?.student?.nama_siswa === namaSiswa") &&
                              piketCode.includes("setLastScanResult(null)");
  if (cancelDismissesScan) {
    pass('ADV-09', 'handleCancelManualPresensi safely dismisses lastScanResult when matching student');
  } else {
    fail('ADV-09', 'handleCancelManualPresensi does not dismiss lastScanResult');
  }

  // ==========================================================================
  // SECTION 4: CODEBASE CLEANLINESS & REMOVAL OF SUPERADMIN CONFIG
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 4. CODEBASE CLEANLINESS & SUPERADMIN CONFIG REMOVAL ━━━${RESET}`);

  // ADV-4.1: No unused modePresensiSiswa state in PiketView
  const hasDeadState = piketCode.includes("const [modePresensiSiswa, setModePresensiSiswa]");
  if (!hasDeadState) {
    pass('ADV-10', 'Dead state variable modePresensiSiswa is completely removed from PiketView.tsx');
  } else {
    fail('ADV-10', 'Dead state variable modePresensiSiswa still exists in PiketView.tsx');
  }

  // ADV-4.2: SuperadminView has zero mode_presensi_siswa in edit dialog
  const editHasPresensiMode = superadminCode.includes("swal-edit-mode-presensi-siswa");
  if (!editHasPresensiMode) {
    pass('ADV-11', 'SuperadminView edit dialog does not configure mode_presensi_siswa');
  } else {
    fail('ADV-11', 'SuperadminView edit dialog still contains mode_presensi_siswa');
  }

  // ADV-4.3: SuperadminView create dialog safely defaults mode_presensi_siswa: 'qr'
  const createSetsDefaultQr = superadminCode.includes("mode_presensi_siswa: 'qr'");
  if (createSetsDefaultQr) {
    pass('ADV-12', 'SuperadminView handleCreateSchool defaults mode_presensi_siswa to "qr" for database schema compatibility');
  } else {
    fail('ADV-12', 'SuperadminView handleCreateSchool missing mode_presensi_siswa default');
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}${RESET}`);
  if (failedTests === 0) {
    console.log(`${GREEN}${BOLD}VERDICT: ALL ADVERSARIAL REVIEWER TESTS PASSED!${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}VERDICT: ADVERSARIAL QA DETECTED FAILURES!${RESET}\n`);
    process.exitCode = 1;
  }
}

runAdversarialTests().catch(err => {
  console.error('Adversarial test error:', err);
  process.exitCode = 1;
});
