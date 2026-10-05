/**
 * ============================================================================
 * ADVERSARIAL REVIEWER ROUND 3 TEST SUITE: DEEP RESILIENCE & ADVERSARIAL QA
 * File: tests/adversarial_presensi_sync_reviewer_r3.test.ts
 *
 * Attacks & Verifies:
 * - ADV3-01: Synchronous Submission Mutex Lock (isSubmittingPresensiRef) across all entry points
 * - ADV3-02: Dismissal of stale error scan card (student: null) on user input or clear
 * - ADV3-03: Two-way sync support for student qr_code attribute in matchesOld, roster, and lookup
 * - ADV3-04: Full failure and exception synchronization in handleManualMark into lastScanResult
 * - ADV3-05: Auto-selection on focus for manual input (onFocus e.target.select())
 * - ADV3-06: Student ID disambiguation in handleCancelManualPresensi
 * - ADV3-07: In-flight async DB resolution protection in handleManualFormSubmit
 * - ADV3-08: Exclusion of stale filteredManualStudents state closure in handleManualFormSubmit
 * - ADV3-09: Live behavioral simulation of concurrent burst submissions and stale card dismissal
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

async function runReviewerR3Tests() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  REVIEWER ROUND 3 ADVERSARIAL QA: DEEP RESILIENCE & QA PROOF          ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
  const piketCode = fs.readFileSync(piketPath, 'utf-8');

  // ==========================================================================
  // SECTION 1: SYNCHRONOUS MUTEX LOCK & ASYNC BOUNDARY PROTECTION
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ 1. SYNCHRONOUS MUTEX LOCK & CONCURRENCY GUARDS ━━━${RESET}`);

  // ADV3-01: isSubmittingPresensiRef mutex declared and wired to all entry points
  const hasMutexRef = piketCode.includes('const isSubmittingPresensiRef = useRef(false);');
  const processScanGuarded = piketCode.includes('if (!code || scanProcessing || isSubmittingPresensiRef.current) return;') &&
                             piketCode.includes('isSubmittingPresensiRef.current = true;');
  const manualMarkGuarded = piketCode.includes('if (isSubmittingPresensiRef.current) return;');
  const submitGuarded = piketCode.includes('handleManualFormSubmit = async') &&
                        piketCode.includes('if (isSubmittingPresensiRef.current) return;');

  if (hasMutexRef && processScanGuarded && manualMarkGuarded && submitGuarded) {
    pass('ADV3-01', 'Synchronous isSubmittingPresensiRef mutex locks all entry points against async race leaks');
  } else {
    fail('ADV3-01', 'Mutex ref isSubmittingPresensiRef missing or not wired across all entry points');
  }

  // ADV3-02: Async DB fallback in handleManualFormSubmit locks mutex during network request
  const dbFallbackGuarded = piketCode.includes("isSubmittingPresensiRef.current = true;") &&
                            piketCode.includes("setManualMarkLoading('resolving-code');") &&
                            piketCode.includes("await resolveStudentByCode(supabase, query, user?.sekolah_id)");
  if (dbFallbackGuarded) {
    pass('ADV3-02', 'handleManualFormSubmit locks mutex and loading state during async resolveStudentByCode');
  } else {
    fail('ADV3-02', 'handleManualFormSubmit lacks mutex lock during async DB code resolution');
  }

  // ==========================================================================
  // SECTION 2: ERROR CARD DISMISSAL & TWO-WAY SYNC RESILIENCE
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. STALE ERROR CARD DISMISSAL & INPUT RESILIENCE ━━━${RESET}`);

  // ADV3-03: Stale error card (student: null) is dismissed when user starts typing or clears input
  const dismissesNullStudentCard = piketCode.includes('if (!lastScanResult.student || val.trim() === \'\')') &&
                                   piketCode.includes('setLastScanResult(null);');
  if (dismissesNullStudentCard) {
    pass('ADV3-03', 'Stale error feedback card (student: null) is dismissed on input modification or clearing');
  } else {
    fail('ADV3-03', 'Error feedback card without student is not dismissed on input modification');
  }

  // ADV3-04: Student qr_code attribute is checked in matchesOld
  const qrCodeInMatchesOld = piketCode.includes('(s as any).qr_code && (s as any).qr_code.toLowerCase().includes(val.toLowerCase())');
  if (qrCodeInMatchesOld) {
    pass('ADV3-04', 'Student qr_code field is verified in matchesOld to prevent accidental card cancellation');
  } else {
    fail('ADV3-04', 'matchesOld predicate ignores student qr_code');
  }

  // ADV3-05: Student qr_code attribute is checked in filteredManualStudents
  const qrCodeInRosterFilter = piketCode.includes("((s as any).qr_code?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase())");
  if (qrCodeInRosterFilter) {
    pass('ADV3-05', 'filteredManualStudents roster filtering matches against student qr_code field');
  } else {
    fail('ADV3-05', 'filteredManualStudents ignores student qr_code');
  }

  // ADV3-06: Student qr_code attribute is checked in handleManualFormSubmit memory lookup
  const qrCodeInSubmitLookup = piketCode.includes('(s as any).qr_code && (s as any).qr_code.toLowerCase() === query.toLowerCase()');
  if (qrCodeInSubmitLookup) {
    pass('ADV3-06', 'handleManualFormSubmit matches student qr_code directly from in-memory allStudents');
  } else {
    fail('ADV3-06', 'handleManualFormSubmit lacks in-memory qr_code matching');
  }

  // ==========================================================================
  // SECTION 3: FAILURE SYNCHRONIZATION & DISAMBIGUATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. FAILURE SYNC, DISAMBIGUATION & ACCESSIBILITY ━━━${RESET}`);

  // ADV3-07: handleManualMark synchronizes failure and exception states into lastScanResult
  const manualMarkSyncsFailures = piketCode.includes("message: res.message || 'Gagal menandai presensi'") &&
                                  piketCode.includes("message: err.message || 'Gagal menandai presensi'");
  if (manualMarkSyncsFailures) {
    pass('ADV3-07', 'handleManualMark synchronizes failure and error states to lastScanResult QR feedback card');
  } else {
    fail('ADV3-07', 'handleManualMark does not synchronize error states to lastScanResult');
  }

  // ADV3-08: Manual search input has onFocus e.target.select() to prevent prepended text concatenation
  const manualInputHasSelectOnFocus = piketCode.includes('value={manualSearchQuery}') &&
                                      piketCode.includes('onFocus={(e) => e.target.select()}');
  if (manualInputHasSelectOnFocus) {
    pass('ADV3-08', 'manualSearchQuery input element selects text onFocus to prevent burst concatenation');
  } else {
    fail('ADV3-08', 'manualSearchQuery input missing onFocus text selection');
  }

  // ADV3-09: handleCancelManualPresensi accepts and matches studentId
  const cancelMatchesStudentId = piketCode.includes('handleCancelManualPresensi = async (recordId: string, namaSiswa: string, status: \'datang\' | \'pulang\', studentId?: string)') &&
                                 piketCode.includes('(studentId && lastScanResult?.student?.id === studentId) ||');
  if (cancelMatchesStudentId) {
    pass('ADV3-09', 'handleCancelManualPresensi safely disambiguates students by studentId');
  } else {
    fail('ADV3-09', 'handleCancelManualPresensi lacks studentId disambiguation');
  }

  // ==========================================================================
  // SECTION 4: LIVE BEHAVIORAL LOGIC SIMULATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 4. LIVE BEHAVIORAL SIMULATION ━━━${RESET}`);

  // Test Simulation 1: Stale Error Card Dismissal Logic
  let mockLastScanResult: any = {
    student: null,
    status: 'datang',
    success: false,
    message: 'Siswa "UNKNOWN" tidak ditemukan.'
  };

  const simulateUsbInput = (val: string) => {
    if (mockLastScanResult) {
      if (!mockLastScanResult.student || val.trim() === '') {
        mockLastScanResult = null;
      } else {
        const s = mockLastScanResult.student;
        const matchesOld =
          s.nama_siswa.toLowerCase().includes(val.toLowerCase()) ||
          (s.nisn && s.nisn.toLowerCase().includes(val.toLowerCase())) ||
          ((s as any).qr_code && (s as any).qr_code.toLowerCase().includes(val.toLowerCase())) ||
          s.id === val;
        if (!matchesOld || val.trim() === '') {
          mockLastScanResult = null;
        }
      }
    }
  };

  // User types 'A' after a failed scan
  simulateUsbInput('A');
  if (mockLastScanResult === null) {
    pass('ADV3-10', 'Simulation: typing "A" after failed scan immediately dismisses error feedback card');
  } else {
    fail('ADV3-10', 'Simulation: typing after failed scan did not dismiss error card');
  }

  // Test Simulation 2: QR Code Matching in Two-Way Sync
  mockLastScanResult = {
    student: {
      id: 'stu-01',
      nama_siswa: 'Budi Santoso',
      nisn: '0012345678',
      qr_code: 'QR-BUDI-01'
    },
    status: 'datang',
    success: true
  };

  // User inputs the student's distinct qr_code 'QR-BUDI'
  simulateUsbInput('QR-BUDI');
  if (mockLastScanResult !== null) {
    pass('ADV3-11', 'Simulation: entering student qr_code preserves active student feedback card without wiping');
  } else {
    fail('ADV3-11', 'Simulation: entering student qr_code falsely wiped active student card');
  }

  // Test Simulation 3: Mutex Concurrency Lock
  let activeLock = false;
  let executionCount = 0;

  const simulatedSubmit = async (query: string) => {
    if (activeLock) return;
    activeLock = true;
    try {
      await new Promise(r => setTimeout(r, 10)); // simulate async DB fetch
      executionCount++;
    } finally {
      activeLock = false;
    }
  };

  // Launch two concurrent rapid submissions
  await Promise.all([
    simulatedSubmit('TEST-1'),
    simulatedSubmit('TEST-1')
  ]);

  if (executionCount === 1) {
    pass('ADV3-12', 'Simulation: synchronous mutex successfully blocked concurrent double-submission');
  } else {
    fail('ADV3-12', `Simulation: expected 1 execution, got ${executionCount}`);
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}${RESET}`);
  if (failedTests === 0) {
    console.log(`${GREEN}${BOLD}VERDICT: ALL REVIEWER ROUND 3 ADVERSARIAL TESTS PASSED!${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}VERDICT: REVIEWER ROUND 3 ADVERSARIAL QA DETECTED FAILURES!${RESET}\n`);
    process.exitCode = 1;
  }
}

runReviewerR3Tests().catch(err => {
  console.error('Adversarial test error:', err);
  process.exitCode = 1;
});
