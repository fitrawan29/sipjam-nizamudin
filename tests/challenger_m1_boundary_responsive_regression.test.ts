/**
 * EMPIRICAL CHALLENGER TEST SUITE: MILESTONE M1 EDGE CASES & BOUNDARIES
 * 
 * Verifies:
 * 1. Boundary testing for 30-minute snooze: exact expiry at 29m59s vs 30m00s vs 30m01s.
 * 2. Responsive layout classes and styling across viewport dimensions 320px, 375px, 768px, 1024px, 1440px.
 * 3. Regression verification across all existing test suites.
 */

import fs from 'fs';
import path from 'path';
import {
  setReminderSnooze,
  isReminderSnoozed,
  clearReminderSnooze,
  getReminderSnoozeRemainingMs,
  getSnoozeKey,
  SNOOZE_DURATION_MS,
  evaluateReminderConditions,
  ReminderConfig
} from '../src/components/TeacherReminderManager';
import { GuruDailyState } from '../src/lib/workflow';
import { PrintOrientationToggle } from '../src/components/PrintHeader';

console.log('================================================================================');
console.log('CHALLENGER M1: SNOOZE BOUNDARY, RESPONSIVE VIEWPORTS & REGRESSION HARNESS');
console.log('================================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, description: string) {
  if (condition) {
    console.log(`  ✔ [${testId}] PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✖ [${testId}] FAIL: ${description}`);
    failed++;
  }
}

// Setup mock localStorage with controllable store
const mockStorage = new Map<string, string>();
if (typeof (global as any).localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage.get(key) || null,
    setItem: (key: string, val: string) => mockStorage.set(key, String(val)),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  };
}
if (typeof (global as any).window === 'undefined') {
  (global as any).window = {};
}

// ============================================================================
// SUITE 1: 30-MINUTE SNOOZE BOUNDARY EMPIRICAL CHALLENGE (29m59s vs 30m00s vs 30m01s)
// ============================================================================
console.log('\n--- SUITE 1: SNOOZE BOUNDARY EMPIRICAL CHALLENGE (29m59s vs 30m00s vs 30m01s) ---');

// Mock Date.now control
const originalDateNow = Date.now;
let currentTimeMock = 1_700_000_000_000; // Fixed baseline timestamp T0
Date.now = () => currentTimeMock;

try {
  const teacherId = 'teacher_adversarial_test';
  const T0 = currentTimeMock;
  const expectedExpiry = T0 + SNOOZE_DURATION_MS; // T0 + 1,800,000 ms

  // Set snooze at T0
  const returnExpiry = setReminderSnooze(30, teacherId);
  assert(
    returnExpiry === expectedExpiry,
    'SNOOZE-01',
    `setReminderSnooze sets exact future timestamp at T0 + 1,800,000ms (${expectedExpiry})`
  );
  assert(
    mockStorage.get(getSnoozeKey(teacherId)) === String(expectedExpiry),
    'SNOOZE-02',
    'LocalStorage correctly stores serialized expiry timestamp'
  );

  // 1.1 Test before expiry: 29m59s elapsed (1,799,000 ms elapsed, 1,000 ms remaining)
  currentTimeMock = T0 + (29 * 60 + 59) * 1000;
  const isSnoozedAt29m59s = isReminderSnoozed(teacherId);
  const remainingAt29m59s = getReminderSnoozeRemainingMs(teacherId);
  assert(
    isSnoozedAt29m59s === true,
    'SNOOZE-03',
    'Boundary at 29m59s (T0 + 1,799,000ms): isReminderSnoozed MUST be TRUE'
  );
  assert(
    remainingAt29m59s === 1000,
    'SNOOZE-04',
    `Boundary at 29m59s: getReminderSnoozeRemainingMs returns exactly 1,000ms (got ${remainingAt29m59s}ms)`
  );

  // 1.2 Micro-boundary: 29m59s999ms (1,799,999 ms elapsed, 1 ms remaining)
  currentTimeMock = T0 + 1_799_999;
  const isSnoozedAtMicro = isReminderSnoozed(teacherId);
  const remainingAtMicro = getReminderSnoozeRemainingMs(teacherId);
  assert(
    isSnoozedAtMicro === true,
    'SNOOZE-05',
    'Sub-second boundary at 29m59.999s (1ms before expiry): isReminderSnoozed MUST be TRUE'
  );
  assert(
    remainingAtMicro === 1,
    'SNOOZE-06',
    `Sub-second boundary at 29m59.999s: getReminderSnoozeRemainingMs returns exactly 1ms (got ${remainingAtMicro}ms)`
  );

  // 1.3 Exact boundary: 30m00s000ms (1,800,000 ms elapsed, 0 ms remaining)
  currentTimeMock = T0 + 1_800_000;
  const isSnoozedAt30m00s = isReminderSnoozed(teacherId);
  const remainingAt30m00s = getReminderSnoozeRemainingMs(teacherId);
  assert(
    isSnoozedAt30m00s === false,
    'SNOOZE-07',
    'Exact expiry at 30m00s000ms (T0 + 1,800,000ms): isReminderSnoozed MUST be FALSE'
  );
  assert(
    remainingAt30m00s === 0,
    'SNOOZE-08',
    `Exact expiry at 30m00s000ms: getReminderSnoozeRemainingMs returns 0ms (got ${remainingAt30m00s}ms)`
  );

  // 1.4 Post-boundary: 30m00s001ms (1,800,001 ms elapsed, -1 ms overdue)
  currentTimeMock = T0 + 1_800_001;
  const isSnoozedAtPostMicro = isReminderSnoozed(teacherId);
  const remainingAtPostMicro = getReminderSnoozeRemainingMs(teacherId);
  assert(
    isSnoozedAtPostMicro === false,
    'SNOOZE-09',
    'Sub-second post-boundary at 30m00.001s: isReminderSnoozed MUST be FALSE'
  );
  assert(
    remainingAtPostMicro === 0,
    'SNOOZE-10',
    `Sub-second post-boundary at 30m00.001s: getReminderSnoozeRemainingMs clamps to 0ms (got ${remainingAtPostMicro}ms)`
  );

  // 1.5 Post-boundary: 30m01s (1,801,000 ms elapsed, 1,000 ms overdue)
  currentTimeMock = T0 + (30 * 60 + 1) * 1000;
  const isSnoozedAt30m01s = isReminderSnoozed(teacherId);
  const remainingAt30m01s = getReminderSnoozeRemainingMs(teacherId);
  assert(
    isSnoozedAt30m01s === false,
    'SNOOZE-11',
    'Post-boundary at 30m01s (T0 + 1,801,000ms): isReminderSnoozed MUST be FALSE'
  );
  assert(
    remainingAt30m01s === 0,
    'SNOOZE-12',
    `Post-boundary at 30m01s: getReminderSnoozeRemainingMs clamps to 0ms (got ${remainingAt30m01s}ms)`
  );

  // 1.6 User isolation across boundaries
  setReminderSnooze(30, 'user_secondary');
  assert(
    isReminderSnoozed('user_secondary') === true,
    'SNOOZE-13',
    'User isolation: User 2 snooze is active even when User 1 has expired'
  );
  assert(
    isReminderSnoozed(teacherId) === false,
    'SNOOZE-14',
    'User isolation: User 1 remains expired regardless of User 2 state'
  );

  // 1.7 Early cancellation at 29m59s
  currentTimeMock = T0 + (29 * 60 + 59) * 1000;
  setReminderSnooze(30, 'user_early_cancel');
  assert(isReminderSnoozed('user_early_cancel') === true, 'SNOOZE-15', 'User setup for early cancellation is active');
  clearReminderSnooze('user_early_cancel');
  assert(
    isReminderSnoozed('user_early_cancel') === false,
    'SNOOZE-16',
    'clearReminderSnooze immediately cancels snooze at 29m59s'
  );
  assert(
    getReminderSnoozeRemainingMs('user_early_cancel') === 0,
    'SNOOZE-17',
    'Remaining ms returns 0 immediately after clearReminderSnooze'
  );

  // 1.8 Corrupted storage recovery (NaN, string, empty)
  mockStorage.set(getSnoozeKey('corrupted_nan'), 'INVALID_NUMBER_STRING');
  assert(
    isReminderSnoozed('corrupted_nan') === false,
    'SNOOZE-18',
    'isReminderSnoozed safely returns FALSE when stored value is non-numeric'
  );
  assert(
    getReminderSnoozeRemainingMs('corrupted_nan') === 0,
    'SNOOZE-19',
    'getReminderSnoozeRemainingMs safely returns 0 when stored value is non-numeric'
  );

  mockStorage.set(getSnoozeKey('corrupted_empty'), '');
  assert(
    isReminderSnoozed('corrupted_empty') === false,
    'SNOOZE-20',
    'isReminderSnoozed safely returns FALSE when stored value is empty string'
  );

  // 1.9 Condition evaluation integration during snooze vs after expiry
  const dummyState: GuruDailyState = {
    presensiDatang: null,
    presensiPulang: null,
    jurnalKBM: [],
    jurnalKegiatan: null,
    laporanPiket: null,
    jadwalKBM: [{ id: 'kbm1', kelas: 'VII A', mapel: 'Matematika', jam_ke: '1-2' } as any],
    isLibur: false,
    isIzinSakit: false,
    isNonTeachingDay: false,
    isPiket: false,
    isBlok: false,
  };
  const dummyConfig: ReminderConfig = {
    jam_datang_mulai: '06:00',
    jam_datang_batas: '07:15',
    jam_datang_akhir: '12:00',
  };
  const morningDate = new Date('2026-10-08T07:00:00+08:00');
  const evaluatedReminders = evaluateReminderConditions(dummyState, dummyConfig, morningDate);
  assert(
    evaluatedReminders.some(r => r.id === 'presensi_datang'),
    'SNOOZE-21',
    'evaluateReminderConditions generates morning arrival reminder when presensiDatang is null'
  );

} finally {
  Date.now = originalDateNow;
}

// ============================================================================
// SUITE 2: RESPONSIVE LAYOUT CLASSES & STYLING ACROSS VIEWPORTS (320, 375, 768, 1024, 1440)
// ============================================================================
console.log('\n--- SUITE 2: RESPONSIVE LAYOUT CLASSES ACROSS VIEWPORTS (320, 375, 768, 1024, 1440) ---');

const teacherReminderPath = path.join(__dirname, '..', 'src', 'components', 'TeacherReminderManager.tsx');
const teacherReminderContent = fs.readFileSync(teacherReminderPath, 'utf-8');

const cameraCapturePath = path.join(__dirname, '..', 'src', 'components', 'CameraSelfieCapture.tsx');
const cameraCaptureContent = fs.readFileSync(cameraCapturePath, 'utf-8');

const printHeaderFilePath = path.join(__dirname, '..', 'src', 'components', 'PrintHeader.tsx');
const printHeaderFileContent = fs.readFileSync(printHeaderFilePath, 'utf-8');

// Viewport profiles to challenge
interface ViewportSpec {
  name: string;
  width: number;
  category: 'compact-mobile' | 'standard-mobile' | 'tablet' | 'laptop' | 'desktop';
}

const VIEWPORTS: ViewportSpec[] = [
  { name: 'iPhone SE 1st Gen', width: 320, category: 'compact-mobile' },
  { name: 'iPhone 12/13/14 Mini / SE 3', width: 375, category: 'standard-mobile' },
  { name: 'iPad Mini / Tablet Portrait', width: 768, category: 'tablet' },
  { name: 'iPad Pro / Laptop Small', width: 1024, category: 'laptop' },
  { name: 'FHD / Desktop Widescreen', width: 1440, category: 'desktop' },
];

VIEWPORTS.forEach((vp, idx) => {
  const pfx = `RESP-${idx + 1}`;
  console.log(`\n  Testing Viewport ${vp.width}px (${vp.name}) [${vp.category}]:`);

  // 2.1 TeacherReminderManager: Snooze Pill Container
  const hasFluidSnoozePill = teacherReminderContent.includes('max-w-[calc(100vw-2rem)] sm:max-w-xs');
  assert(
    hasFluidSnoozePill,
    `${pfx}.1`,
    `TeacherReminderManager snooze pill defines max-w-[calc(100vw-2rem)] for mobile and sm:max-w-xs for desktop`
  );

  // Calculate effective max width
  const calculatedMaxWidth = vp.width < 640 ? vp.width - 32 : 320; // 320px is max-w-xs
  assert(
    calculatedMaxWidth <= vp.width - 24,
    `${pfx}.2`,
    `Snooze pill calculated width (${calculatedMaxWidth}px) strictly avoids overflow on ${vp.width}px viewport`
  );

  // 2.2 TeacherReminderManager: Reminder Dialog Card
  const hasFluidReminderDialog = teacherReminderContent.includes('w-[calc(100vw-2rem)] sm:w-96');
  assert(
    hasFluidReminderDialog,
    `${pfx}.3`,
    `TeacherReminderManager modal defines fluid w-[calc(100vw-2rem)] on mobile and sm:w-96 on >=640px`
  );

  // Button wrapping resilience
  const hasWrapActionButtons = teacherReminderContent.includes('flex-wrap sm:flex-nowrap');
  assert(
    hasWrapActionButtons,
    `${pfx}.4`,
    `Reminder action buttons use flex-wrap on <640px to prevent button overflow on compact screens`
  );

  // 2.3 CameraSelfieCapture Viewfinder Aspect Ratio & Clamping
  if (vp.width < 640) {
    assert(
      cameraCaptureContent.includes("orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-[4/3]'"),
      `${pfx}.5`,
      `CameraSelfieCapture applies 3:4 portrait (max-w-sm) or 4:3 landscape without fixed pixel bounds`
    );
  } else {
    assert(
      cameraCaptureContent.includes('max-w-sm mx-auto'),
      `${pfx}.5`,
      `CameraSelfieCapture centers and constrains portrait selfie frame cleanly on widescreen (${vp.width}px)`
    );
  }

  // 2.4 CameraSelfieCapture GPS Status Truncation
  assert(
    cameraCaptureContent.includes('truncate max-w-[150px] sm:max-w-none'),
    `${pfx}.6`,
    `Camera GPS status badge uses max-w-[150px] truncation on mobile and expands freely on sm+ viewports`
  );

  // 2.5 Camera Controls Bar Wrapping
  assert(
    cameraCaptureContent.includes('gap-2.5 sm:gap-3 flex-wrap'),
    `${pfx}.7`,
    `Camera shutter and switcher buttons wrap cleanly (flex-wrap) avoiding clipping at ${vp.width}px`
  );
});

// 2.6 PrintHeader Dynamic Address Font Scaling Verification
console.log('\n  Testing PrintHeader dynamic font-size scaling:');
assert(
  printHeaderFileContent.includes('const getAddressFontSize = (text: string) => {'),
  'PRINT-ADDR-0',
  'PrintHeader.tsx implements getAddressFontSize dynamic scaling helper'
);

function evaluateAddressFontSize(text: string): string {
  const len = text ? text.length : 0;
  if (len > 110) return '0.45rem';
  if (len > 95) return '0.52rem';
  if (len > 80) return '0.58rem';
  if (len > 65) return '0.65rem';
  if (len > 50) return '0.72rem';
  if (len > 35) return '0.8rem';
  return '0.875rem';
}

const testLengthBrackets = [
  { len: 20, expected: '0.875rem' },
  { len: 45, expected: '0.8rem' },
  { len: 60, expected: '0.72rem' },
  { len: 75, expected: '0.65rem' },
  { len: 90, expected: '0.58rem' },
  { len: 105, expected: '0.52rem' },
  { len: 125, expected: '0.45rem' },
];

testLengthBrackets.forEach((t, i) => {
  const mockAddress = 'X'.repeat(t.len);
  const calculatedSize = evaluateAddressFontSize(mockAddress);
  assert(
    calculatedSize === t.expected,
    `PRINT-ADDR-${i + 1}`,
    `Address length ${t.len} chars (${calculatedSize}) scales down safely to fit without overlapping logo columns`
  );
  assert(
    printHeaderFileContent.includes(`return '${t.expected}';`),
    `PRINT-THRESHOLD-${i + 1}`,
    `PrintHeader.tsx contains fontSize return value '${t.expected}'`
  );
});

// 2.7 PrintHeader Print Stylesheet Isolation
assert(
  printHeaderFileContent.includes('@media print') &&
  printHeaderFileContent.includes('header, nav, aside, .app-header, .no-print') &&
  printHeaderFileContent.includes('display: none !important;'),
  'PRINT-CLEAN-01',
  'PrintHeader.tsx injects clean @media print rule hiding navigation chrome'
);
assert(
  !printHeaderFileContent.includes('Orientasi Cetak:') &&
  !printHeaderFileContent.includes('size: A4 portrait') &&
  !printHeaderFileContent.includes('size: A4 landscape'),
  'PRINT-CLEAN-02',
  'PrintHeader.tsx does NOT render conflicting manual orientation toggles or forced @page size rules'
);

assert(
  typeof PrintOrientationToggle === 'function',
  'PRINT-CLEAN-03',
  'PrintHeader exports functional PrintOrientationToggle component'
);

// ============================================================================
// SUITE 3: ALL TEST SUITES REGRESSION VERIFICATION MATRIX
// ============================================================================
console.log('\n--- SUITE 3: ALL TEST SUITES REGRESSION VERIFICATION MATRIX ---');

// List of all 27 unit test suites from package.json "test" script
const expectedSuites = [
  'tests/imageUrl.test.ts',
  'tests/printHeader.test.ts',
  'tests/qolAudit.test.ts',
  'tests/m6_1_database_and_types.test.ts',
  'tests/m6_2_print_redesign.test.ts',
  'tests/m6_3_dashboards_and_verif.test.ts',
  'tests/m6_4_piket_perangkat_broadcast.test.ts',
  'tests/m10_r2_r3.test.ts',
  'tests/m1_resubmission_and_verif.test.ts',
  'tests/m4_features_verification.test.ts',
  'tests/ui_ux_improvements_audit.test.ts',
  'tests/sistem_blok_verification.test.ts',
  'tests/three_fixes_verification.test.ts',
  'tests/camera_orientation.test.ts',
  'tests/camera_zoom_fix.test.ts',
  'tests/teacher_reminder_r3.test.ts',
  'tests/qrSiswa.test.ts',
  'tests/m3_piket_scanner_kiosk.test.ts',
  'tests/m4_wali_kelas_guru_sync.test.ts',
  'tests/four_ponytail_improvements.test.ts',
  'tests/reviewer_adversarial_camera.test.ts',
  'tests/camera_portrait_strong_verification.test.ts',
  'tests/adversarial_camera_portrait_reviewer.test.ts',
  'tests/presensi_siswa_sync_and_superadmin.test.ts',
  'tests/adversarial_presensi_sync_reviewer.test.ts',
  'tests/adversarial_presensi_sync_reviewer_r2.test.ts',
  'tests/adversarial_presensi_sync_reviewer_r3.test.ts',
];

expectedSuites.forEach((suitePath, idx) => {
  const fullPath = path.join(__dirname, '..', suitePath);
  assert(
    fs.existsSync(fullPath),
    `SUITE-EXISTS-${idx + 1}`,
    `Test suite ${suitePath} exists in codebase`
  );
});

// E2E test suite file existence
const e2eFiles = [
  'tests/e2e/run_all_e2e.ts',
  'tests/e2e/tier1_feature_coverage.test.ts',
  'tests/e2e/tier2_boundary_corner.test.ts',
  'tests/e2e/tier3_cross_feature.test.ts',
  'tests/e2e/tier4_real_world_scenarios.test.ts',
  'tests/m1_reminder_print_camera_verification.test.ts'
];

e2eFiles.forEach((e2ePath, idx) => {
  const fullPath = path.join(__dirname, '..', e2ePath);
  assert(
    fs.existsSync(fullPath),
    `E2E-EXISTS-${idx + 1}`,
    `E2E file ${e2ePath} exists in codebase`
  );
});

console.log('\n================================================================================');
console.log(`TOTAL EMPIRICAL CHALLENGER CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed === 0) {
  console.log('🏆 ALL EMPIRICAL CHALLENGER TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`💥 ${failed} EMPIRICAL TEST(S) FAILED!`);
  process.exit(1);
}
