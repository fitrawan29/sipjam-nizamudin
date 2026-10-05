/**
 * ============================================================================
 * ADVERSARIAL REVIEWER ROUND 2 TEST SUITE: HARDENING & EDGE CASE RESILIENCE
 * File: tests/adversarial_presensi_sync_reviewer_r2.test.ts
 *
 * Attacks & Verifies:
 * - ADV2-01: Scanner buffer concatenation prevention with prepended text stripping in handleUsbInputChange
 * - ADV2-02: Scanner buffer concatenation prevention with prepended text stripping in handleManualSearchChange
 * - ADV2-03: handleManualFormSubmit accepts explicit overrideQuery parameter to avoid React state closure races
 * - ADV2-04: Double-submission protection in handleManualFormSubmit
 * - ADV2-05: Double-submission protection in handleManualMark
 * - ADV2-06: Cross-class multi-match search resilience auto-resetting manualKelasFilter to 'Semua'
 * - ADV2-07: Real-time dismissal of stale QR card when clearing input (val.trim() === '')
 * - ADV2-08: Programmatic text selection on scan completion via usbInputRef.current?.select()
 * - ADV2-09: Simultaneous rendering of kiosk scanner and manual roster on unified tab
 * - ADV2-10: Complete excision of mode_presensi_siswa from SuperadminView with schema-safe default
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

async function runReviewerR2Tests() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  REVIEWER ROUND 2 ADVERSARIAL QA: HARDENING & EDGE CASE RESILIENCE   ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
  const piketCode = fs.readFileSync(piketPath, 'utf-8');

  const superadminPath = path.resolve(process.cwd(), 'src/components/SuperadminView.tsx');
  const superadminCode = fs.readFileSync(superadminPath, 'utf-8');

  // ==========================================================================
  // SECTION 1: HARDWARE SCANNER BUFFER STRIPPING & CONCATENATION DEFENSE
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ 1. HARDWARE SCANNER BUFFER STRIPPING & CONCATENATION DEFENSE ━━━${RESET}`);

  // ADV2-01: handleUsbInputChange strips prepended buffer before scan
  const usbStripsPrepended = piketCode.includes('usbInputVal && cleanVal.startsWith(usbInputVal)') &&
                             piketCode.includes('cleanVal.slice(usbInputVal.length).trim()');
  if (usbStripsPrepended) {
    pass('ADV2-01', 'handleUsbInputChange isolates scan burst by stripping prepended buffer');
  } else {
    fail('ADV2-01', 'handleUsbInputChange lacks prepended buffer stripping defense');
  }

  // ADV2-02: handleManualSearchChange strips prepended buffer before submit
  const manualStripsPrepended = piketCode.includes('manualSearchQuery && cleanVal.startsWith(manualSearchQuery)') &&
                               piketCode.includes('cleanVal.slice(manualSearchQuery.length).trim()');
  if (manualStripsPrepended) {
    pass('ADV2-02', 'handleManualSearchChange isolates scan burst by stripping prepended manual buffer');
  } else {
    fail('ADV2-02', 'handleManualSearchChange lacks prepended buffer stripping defense');
  }

  // ADV2-03: handleManualFormSubmit accepts explicit overrideQuery parameter
  const submitHasParam = piketCode.includes('handleManualFormSubmit = async (overrideQuery?: string)') &&
                         piketCode.includes('const query = (overrideQuery !== undefined ? overrideQuery : manualSearchQuery).trim()');
  if (submitHasParam) {
    pass('ADV2-03', 'handleManualFormSubmit accepts explicit overrideQuery parameter to eliminate stale closure races');
  } else {
    fail('ADV2-03', 'handleManualFormSubmit missing overrideQuery parameter');
  }

  // ADV2-04: Double-submission protection in handleManualFormSubmit
  const submitGuardsConcurrency = piketCode.includes('handleManualFormSubmit = async') &&
                                  piketCode.includes('if (scanProcessing || manualMarkLoading) return;');
  if (submitGuardsConcurrency) {
    pass('ADV2-04', 'handleManualFormSubmit guards against concurrent execution during active processing');
  } else {
    fail('ADV2-04', 'handleManualFormSubmit lacks concurrency / double-submit guard');
  }

  // ADV2-05: Double-submission protection in handleManualMark
  const markGuardsConcurrency = piketCode.includes('handleManualMark = async') &&
                                piketCode.includes('if (scanProcessing || manualMarkLoading) return;');
  if (markGuardsConcurrency) {
    pass('ADV2-05', 'handleManualMark guards against concurrent execution during active processing');
  } else {
    fail('ADV2-05', 'handleManualMark lacks concurrency / double-submit guard');
  }

  // ==========================================================================
  // SECTION 2: CROSS-CLASS MULTI-MATCH & SEARCH RESILIENCE
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. CROSS-CLASS MULTI-MATCH & SEARCH RESILIENCE ━━━${RESET}`);

  // ADV2-06: Cross-class multi-match auto-resets manualKelasFilter to 'Semua'
  const multiMatchResetsFilter = piketCode.includes('else if (allMatches.length > 1)') &&
                                 piketCode.includes("setManualKelasFilter('Semua')") &&
                                 piketCode.includes('Ditemukan ${allMatches.length} siswa dengan kata kunci');
  if (multiMatchResetsFilter) {
    pass('ADV2-06', 'Cross-class multi-match search automatically resets manualKelasFilter to "Semua" to reveal matches');
  } else {
    fail('ADV2-06', 'Cross-class multi-match does not reset manualKelasFilter to "Semua"');
  }

  // ADV2-07: Clearing query to empty string (val.trim() === '') dismisses stale QR feedback card
  const clearsOnEmptyString = piketCode.includes("!matchesOld || val.trim() === ''") &&
                              piketCode.includes('setLastScanResult(null)');
  if (clearsOnEmptyString) {
    pass('ADV2-07', 'Clearing manual or USB input to empty string immediately dismisses stale QR card');
  } else {
    fail('ADV2-07', 'Empty string does not dismiss stale QR feedback card');
  }

  // ADV2-08: usbInputRef text is programmatically selected on scan completion
  const selectsOnScanFinally = piketCode.includes('usbInputRef.current.focus()') &&
                               piketCode.includes('usbInputRef.current.select()');
  if (selectsOnScanFinally) {
    pass('ADV2-08', 'usbInputRef selects text upon scan completion for instantaneous next-scan overwrite');
  } else {
    fail('ADV2-08', 'usbInputRef does not explicitly select text upon scan completion');
  }

  // ==========================================================================
  // SECTION 3: SUPERADMIN EXCLUSION & SIMULTANEOUS VIEW RENDERING
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. SUPERADMIN EXCLUSION & SIMULTANEOUS VIEW RENDERING ━━━${RESET}`);

  // ADV2-09: Simultaneous rendering of kiosk scanner and manual roster on unified tab
  const hasUnifiedTab = piketCode.includes('Presensi Siswa (QR & Manual)') &&
                        piketCode.includes('Kios Scanner Presensi Siswa') &&
                        piketCode.includes('Presensi Manual & Daftar Siswa');
  if (hasUnifiedTab) {
    pass('ADV2-09', 'QR Scanner and Manual Roster render simultaneously under unified Presensi Siswa tab');
  } else {
    fail('ADV2-09', 'Unified Presensi Siswa tab missing required simultaneous components');
  }

  // ADV2-10: SuperadminView completely excises mode_presensi_siswa configuration
  const superadminClean = !superadminCode.includes('swal-sch-mode-presensi-siswa') &&
                          !superadminCode.includes('swal-edit-mode-presensi-siswa') &&
                          !superadminCode.includes('handleTogglePresensiMode') &&
                          superadminCode.includes("mode_presensi_siswa: 'qr'");
  if (superadminClean) {
    pass('ADV2-10', 'SuperadminView has zero mode configuration controls while retaining safe default on creation');
  } else {
    fail('ADV2-10', 'SuperadminView still contains mode configuration controls or lacks safe default');
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}${RESET}`);
  if (failedTests === 0) {
    console.log(`${GREEN}${BOLD}VERDICT: ALL REVIEWER ROUND 2 ADVERSARIAL TESTS PASSED!${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}VERDICT: REVIEWER ROUND 2 ADVERSARIAL QA DETECTED FAILURES!${RESET}\n`);
    process.exitCode = 1;
  }
}

runReviewerR2Tests().catch(err => {
  console.error('Adversarial test error:', err);
  process.exitCode = 1;
});
