import fs from 'fs';
import path from 'path';
import {
  setReminderSnooze,
  isReminderSnoozed,
  clearReminderSnooze,
  getReminderSnoozeRemainingMs,
  getSnoozeKey,
  SNOOZE_DURATION_MS,
  REMINDER_INTERVAL_MS,
} from '../src/components/TeacherReminderManager';
import { drawWatermarkedCanvas, getDefaultWatermarkOptions, dataUrlToFile } from '../src/lib/watermarkCanvas';

console.log('================================================================================');
console.log('CHALLENGER M1 ITERATION 2.2: COMPREHENSIVE EMPIRICAL STRESS TEST SUITE');
console.log('================================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(desc: string, condition: boolean, extraInfo?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ PASS: [${totalChecks.toString().padStart(3, '0')}] ${desc}`);
  } else {
    failedChecks++;
    console.error(`  ✗ FAIL: [${totalChecks.toString().padStart(3, '0')}] ${desc} ${extraInfo ? `(${extraInfo})` : ''}`);
  }
}

// Setup mock browser globals for Node.js test environment
const storageMap = new Map<string, string>();
let mockStorageThrows = false;
let mockStorageThrowType: 'security' | 'quota' | null = null;

const mockLocalStorage = {
  getItem: (key: string): string | null => {
    if (mockStorageThrows && mockStorageThrowType === 'security') {
      throw new Error('SecurityError: The operation is insecure.');
    }
    return storageMap.get(key) || null;
  },
  setItem: (key: string, val: string): void => {
    if (mockStorageThrows && mockStorageThrowType === 'quota') {
      throw new Error('QuotaExceededError: Storage quota exceeded.');
    }
    storageMap.set(key, String(val));
  },
  removeItem: (key: string): void => {
    if (mockStorageThrows && mockStorageThrowType === 'security') {
      throw new Error('SecurityError: Access denied.');
    }
    storageMap.delete(key);
  },
  clear: (): void => {
    storageMap.clear();
  },
};

(global as any).localStorage = mockLocalStorage;
(global as any).window = {};

// Setup mock document and canvas environment for Node
let canvasCalls: { width: number; height: number; drawWidth: number; drawHeight: number; offsetX: number; offsetY: number }[] = [];
let currentMockCanvas = {
  width: 0,
  height: 0,
  getContext: () => ({
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    closePath: () => {},
    roundRect: () => {},
    moveTo: () => {},
    arcTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {},
    measureText: (txt: string) => ({ width: txt.length * 8 }),
    drawImage: (_img: any, sx: number, sy: number, sw: number, sh: number, dx?: number, dy?: number, dw?: number, dh?: number) => {
      canvasCalls.push({
        width: currentMockCanvas.width,
        height: currentMockCanvas.height,
        drawWidth: sw,
        drawHeight: sh,
        offsetX: sx,
        offsetY: sy,
      });
    },
  }),
  toDataURL: () => 'data:image/jpeg;base64,mockCanvasBytes',
};

(global as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      currentMockCanvas.width = 0;
      currentMockCanvas.height = 0;
      return currentMockCanvas;
    }
    return {};
  },
};

if (typeof (global as any).HTMLVideoElement === 'undefined') {
  (global as any).HTMLVideoElement = class {};
}
if (typeof (global as any).HTMLImageElement === 'undefined') {
  (global as any).HTMLImageElement = class {};
}

// ================================================================================
// SUITE 1: 30-MINUTE NOTIFICATION SNOOZE RESILIENCE & ADVERSARIAL STRESS
// ================================================================================
console.log('\n--- SUITE 1: 30-Minute Notification Snooze Resilience & Stress ---');

// 1.1 Constant definitions
check('SNOOZE_DURATION_MS is exactly 1,800,000 ms (30 minutes)', SNOOZE_DURATION_MS === 30 * 60 * 1000);
check('REMINDER_INTERVAL_MS is exactly 300,000 ms (5 minutes)', REMINDER_INTERVAL_MS === 5 * 60 * 1000);

// 1.2 Millisecond boundary precision
storageMap.clear();
const baseNow = 1_700_000_000_000;
const originalDateNow = Date.now;
let mockNow = baseNow;
Date.now = () => mockNow;

try {
  // Set default snooze (30 mins = 1,800,000 ms)
  const expiry = setReminderSnooze(30, 'guru_ade');
  check('Expiry timestamp is exactly baseNow + 1,800,000ms', expiry === baseNow + 1_800_000);
  check('Key format matches sipjam_reminder_snooze_until_${userId}', getSnoozeKey('guru_ade') === 'sipjam_reminder_snooze_until_guru_ade');

  // t = baseNow (initial state)
  check('t = 0: isReminderSnoozed is true', isReminderSnoozed('guru_ade') === true);
  check('t = 0: remainingMs is exactly 1,800,000', getReminderSnoozeRemainingMs('guru_ade') === 1_800_000);

  // t = baseNow + 15 mins (halfway)
  mockNow = baseNow + 900_000;
  check('t = 15m: isReminderSnoozed is true', isReminderSnoozed('guru_ade') === true);
  check('t = 15m: remainingMs is exactly 900,000', getReminderSnoozeRemainingMs('guru_ade') === 900_000);

  // t = expiry - 1ms
  mockNow = expiry - 1;
  check('t = expiry - 1ms: isReminderSnoozed is true (active right up to boundary)', isReminderSnoozed('guru_ade') === true);
  check('t = expiry - 1ms: remainingMs is strictly 1ms', getReminderSnoozeRemainingMs('guru_ade') === 1);

  // t = expiry (exact boundary, Date.now() === expiry)
  mockNow = expiry;
  check('t = expiry: isReminderSnoozed is strictly false (Date.now() < expiry is false)', isReminderSnoozed('guru_ade') === false);
  check('t = expiry: remainingMs is 0ms (not negative)', getReminderSnoozeRemainingMs('guru_ade') === 0);

  // t = expiry + 1ms
  mockNow = expiry + 1;
  check('t = expiry + 1ms: isReminderSnoozed is false', isReminderSnoozed('guru_ade') === false);
  check('t = expiry + 1ms: remainingMs is 0ms', getReminderSnoozeRemainingMs('guru_ade') === 0);

  // t = expiry + 24 hours
  mockNow = expiry + 86_400_000;
  check('t = expiry + 24h: isReminderSnoozed is false', isReminderSnoozed('guru_ade') === false);
  check('t = expiry + 24h: remainingMs is 0ms', getReminderSnoozeRemainingMs('guru_ade') === 0);
} finally {
  Date.now = originalDateNow;
}

// 1.3 Custom Snooze Durations
storageMap.clear();
const testDurations = [5, 10, 15, 45, 60, 120];
for (const mins of testDurations) {
  const currentNow = Date.now();
  const exp = setReminderSnooze(mins, `user_${mins}`);
  const expectedExp = currentNow + mins * 60 * 1000;
  check(`Custom duration ${mins}m: expiry within 100ms tolerance`, Math.abs(exp - expectedExp) < 100);
  check(`Custom duration ${mins}m: active immediately`, isReminderSnoozed(`user_${mins}`) === true);
}

// 1.4 Clock Temporal Anomalies (Jumping Forward & Backward)
storageMap.clear();
let simulatedTime = 1_700_000_000_000;
Date.now = () => simulatedTime;
try {
  setReminderSnooze(30, 'clock_test_user');
  check('Clock test baseline: active', isReminderSnoozed('clock_test_user') === true);

  // Jump backward by 10 minutes (user corrects computer clock backwards)
  simulatedTime -= 600_000;
  check('Clock jumped backward 10m: snooze remains active', isReminderSnoozed('clock_test_user') === true);
  check('Clock jumped backward 10m: remainingMs smoothly increases to 40m', getReminderSnoozeRemainingMs('clock_test_user') === 2_400_000);

  // Jump forward by 45 minutes (past original expiry)
  simulatedTime += 2_700_000;
  check('Clock jumped forward 45m (past expiry): snooze cleanly expired', isReminderSnoozed('clock_test_user') === false);
  check('Clock jumped forward 45m: remainingMs is 0 (never negative)', getReminderSnoozeRemainingMs('clock_test_user') === 0);
} finally {
  Date.now = originalDateNow;
}

// 1.5 Adversarial Corrupted Storage Inputs
console.log('\n  Sub-suite 1.5: Adversarial Malformed Storage Inputs:');
const adversarialInputs: Array<{ label: string; raw: string }> = [
  { label: 'empty string', raw: '' },
  { label: 'spaces only', raw: '   ' },
  { label: 'literal "NaN"', raw: 'NaN' },
  { label: 'literal "undefined"', raw: 'undefined' },
  { label: 'literal "null"', raw: 'null' },
  { label: 'literal "true"', raw: 'true' },
  { label: 'literal "false"', raw: 'false' },
  { label: 'alphanumeric string', raw: 'snooze_until_tomorrow' },
  { label: 'negative number "-1"', raw: '-1' },
  { label: 'negative large number "-999999999999"', raw: '-999999999999' },
  { label: 'float "1700000.55"', raw: '1700000.55' },
  { label: 'JSON object string', raw: '{"expiry": 1800000}' },
  { label: 'JSON array string', raw: '[1800000]' },
  { label: 'positive Infinity', raw: 'Infinity' },
  { label: 'negative Infinity', raw: '-Infinity' },
  { label: 'HTML tag string', raw: '<script>alert(1)</script>' },
  { label: 'hex notation "0x12345"', raw: '0x12345' },
];

for (const { label, raw } of adversarialInputs) {
  storageMap.set(getSnoozeKey('corrupted_user'), raw);
  check(`Corrupt input [${label}]: isReminderSnoozed is false without throwing`, isReminderSnoozed('corrupted_user') === false);
  check(`Corrupt input [${label}]: getReminderSnoozeRemainingMs is 0 without throwing`, getReminderSnoozeRemainingMs('corrupted_user') === 0);
}

// 1.6 Cancellations & Lifecycle Idempotency
console.log('\n  Sub-suite 1.6: Cancellations & Lifecycle Idempotency:');
storageMap.clear();
setReminderSnooze(30, 'cancel_user');
check('Pre-cancel: snooze is active', isReminderSnoozed('cancel_user') === true);
clearReminderSnooze('cancel_user');
check('Post-cancel: snooze is immediately inactive', isReminderSnoozed('cancel_user') === false);
check('Post-cancel: remainingMs is 0', getReminderSnoozeRemainingMs('cancel_user') === 0);
check('Post-cancel: storage key removed from localStorage', storageMap.has(getSnoozeKey('cancel_user')) === false);

// Calling clear on already cleared key (idempotency)
clearReminderSnooze('cancel_user');
check('Second clearReminderSnooze is safe and idempotent', isReminderSnoozed('cancel_user') === false);

// Calling clear on non-existent key
clearReminderSnooze('non_existent_random_user_999');
check('Clear on non-existent user does not throw', true);

// Rapid Snooze-Cancel Cycles (50 cycles)
let rapidSuccess = true;
for (let i = 0; i < 50; i++) {
  setReminderSnooze(30, 'rapid_user');
  if (!isReminderSnoozed('rapid_user')) rapidSuccess = false;
  clearReminderSnooze('rapid_user');
  if (isReminderSnoozed('rapid_user')) rapidSuccess = false;
}
check('50 rapid consecutive set/clear snooze cycles execute flawlessly', rapidSuccess);

// Re-snoozing overwrites existing snooze
const t1 = setReminderSnooze(10, 'overwrite_user');
const t2 = setReminderSnooze(30, 'overwrite_user');
check('Re-snoozing extends expiry timestamp to new horizon', t2 > t1);
check('Remaining time reflects new 30m horizon (~1800000ms)', getReminderSnoozeRemainingMs('overwrite_user') > 1_700_000);

// 1.7 Multi-User Isolation & Special Character User IDs
console.log('\n  Sub-suite 1.7: Multi-User Isolation & Edge-Case IDs:');
storageMap.clear();
const user1 = 'guru_ade_nip_19850101';
const user2 = 'guru_budi_nip_19880202';
const user3 = 'admin_dinas_luar';
const userUUID = '550e8400-e29b-41d4-a716-446655440000';
const userEmail = 'guru.matematika@sekolah.sch.id';
const userSpecial = 'guru-smk#1/ruang@101';

setReminderSnooze(30, user1);
check('User 1 is snoozed', isReminderSnoozed(user1) === true);
check('User 2 is NOT snoozed (isolated)', isReminderSnoozed(user2) === false);
check('User 3 is NOT snoozed (isolated)', isReminderSnoozed(user3) === false);
check('User UUID is NOT snoozed (isolated)', isReminderSnoozed(userUUID) === false);

setReminderSnooze(15, user2);
setReminderSnooze(45, userUUID);
setReminderSnooze(30, userEmail);
setReminderSnooze(30, userSpecial);

check('User 2 is snoozed with independent 15m duration', isReminderSnoozed(user2) === true && getReminderSnoozeRemainingMs(user2) < 950_000);
check('User UUID handles complex hyphens cleanly', isReminderSnoozed(userUUID) === true);
check('User Email handles dots and @ symbols cleanly', isReminderSnoozed(userEmail) === true);
check('User Special handles slashes, hashes, at-signs cleanly', isReminderSnoozed(userSpecial) === true);

// Clear User 1 only
clearReminderSnooze(user1);
check('User 1 is cleared', isReminderSnoozed(user1) === false);
check('User 2 remains unaffected and still snoozed', isReminderSnoozed(user2) === true);
check('User UUID remains unaffected and still snoozed', isReminderSnoozed(userUUID) === true);
check('User Email remains unaffected and still snoozed', isReminderSnoozed(userEmail) === true);

// Undefined and empty string fallback
check('getSnoozeKey(undefined) returns sipjam_reminder_snooze_until_default', getSnoozeKey(undefined) === 'sipjam_reminder_snooze_until_default');
check('getSnoozeKey("") returns sipjam_reminder_snooze_until_default', getSnoozeKey('') === 'sipjam_reminder_snooze_until_default');

// 1.8 Storage Exception Resilience & SSR Support
console.log('\n  Sub-suite 1.8: Storage Exception Resilience & SSR Support:');
mockStorageThrows = true;
mockStorageThrowType = 'security';
check('SecurityError on getItem returns false gracefully', isReminderSnoozed('sec_user') === false);
check('SecurityError on getRemainingMs returns 0 gracefully', getReminderSnoozeRemainingMs('sec_user') === 0);
clearReminderSnooze('sec_user');
check('SecurityError on removeItem caught without throw', true);

mockStorageThrowType = 'quota';
const quotaResult = setReminderSnooze(30, 'quota_user');
check('QuotaExceededError on setItem returns 0 gracefully', quotaResult === 0);

mockStorageThrows = false;
mockStorageThrowType = null;

// SSR Environment (window === undefined)
const savedWindow = (global as any).window;
delete (global as any).window;
try {
  check('SSR (window === undefined): isReminderSnoozed returns false', isReminderSnoozed('ssr_user') === false);
  check('SSR: setReminderSnooze returns 0', setReminderSnooze(30, 'ssr_user') === 0);
  check('SSR: getReminderSnoozeRemainingMs returns 0', getReminderSnoozeRemainingMs('ssr_user') === 0);
  clearReminderSnooze('ssr_user');
  check('SSR: clearReminderSnooze runs safely without throwing', true);
} finally {
  (global as any).window = savedWindow;
}

// 1.9 Component Code Inspection: In-App & Push Notification Suppression
console.log('\n  Sub-suite 1.9: Component Code Inspection (TeacherReminderManager.tsx):');
const teacherReminderPath = path.join(__dirname, '..', 'src', 'components', 'TeacherReminderManager.tsx');
const reminderSrc = fs.readFileSync(teacherReminderPath, 'utf8');

check('TeacherReminderManager evaluates isReminderSnoozed(user?.id) at top of checkReminders()',
  reminderSrc.includes('if (isReminderSnoozed(user?.id)) {'));

check('When snoozed, checkReminders immediately sets isSnoozed(true)',
  reminderSrc.includes('setIsSnoozed(true);'));

check('When snoozed, checkReminders immediately clears reminders array (setReminders([]))',
  reminderSrc.includes('setReminders([]);'));

check('When snoozed, checkReminders returns early (suppressing in-app dialog and push dispatch)',
  reminderSrc.includes('return;\n    }\n    setIsSnoozed(false);'));

check('TeacherReminderManager renders dedicated snooze status badge ("Pengingat ditunda 30m")',
  reminderSrc.includes('Pengingat ditunda 30m'));

check('Snooze status badge provides "Batalkan" action button',
  reminderSrc.includes('Batalkan') && reminderSrc.includes('onClick={handleCancelSnooze}'));

check('handleCancelSnooze calls clearReminderSnooze(user?.id) and re-triggers checkReminders()',
  reminderSrc.includes('clearReminderSnooze(user?.id)') && reminderSrc.includes('checkReminders();'));

// ================================================================================
// SUITE 2: PRINT DIALOG DELEGATION ACROSS ALL 6 PRINT VIEWS
// ================================================================================
console.log('\n--- SUITE 2: Print Dialog Delegation Across All 6 Print Views ---');

const printViewPaths = [
  { name: '1. AdminRekapView', file: path.join(__dirname, '..', 'src', 'components', 'AdminRekapView.tsx') },
  { name: '2. GradebookView', file: path.join(__dirname, '..', 'src', 'components', 'GradebookView.tsx') },
  { name: '3. DokumenView', file: path.join(__dirname, '..', 'src', 'components', 'DokumenView.tsx') },
  { name: '4. PiketView', file: path.join(__dirname, '..', 'src', 'components', 'PiketView.tsx') },
  { name: '5. RekapSiswaView', file: path.join(__dirname, '..', 'src', 'components', 'RekapSiswaView.tsx') },
  { name: '6. RekapJurnalView', file: path.join(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx') },
];

for (const pv of printViewPaths) {
  check(`Print View file exists: ${pv.name}`, fs.existsSync(pv.file));
  const src = fs.readFileSync(pv.file, 'utf8');

  // 1. Invokes browser print dialog
  const callsWindowPrint = src.includes('window.print()');
  check(`${pv.name}: Contains native window.print() invocation`, callsWindowPrint);

  // 2. Uses official PrintHeader
  const mountsPrintHeader = src.includes('<PrintHeader');
  check(`${pv.name}: Mounts official <PrintHeader /> component`, mountsPrintHeader);

  // 3. No forced @page size in view file
  const hasForcedPageSize = /@page\s*\{[^}]*size:\s*(A4|landscape|portrait)/i.test(src);
  check(`${pv.name}: Free of hardcoded @page size overrides`, !hasForcedPageSize);

  // 4. No manual "Orientasi Cetak:" interactive UI buttons in view file
  const hasOrientasiCetakButtons = src.includes('Orientasi Cetak:') || src.includes('Ubah Orientasi');
  check(`${pv.name}: Does NOT contain manual orientation toggle buttons in UI`, !hasOrientasiCetakButtons);

  // 5. Utilizes print CSS hiding (.no-print or print:hidden or print:block)
  const hasPrintClasses = src.includes('no-print') || src.includes('print:block') || src.includes('print:hidden');
  check(`${pv.name}: Uses print styling discipline (no-print / print utility classes)`, hasPrintClasses);
}

// 2.7 Global Print Stylesheet Inspection (globals.css & PrintHeader.tsx)
console.log('\n  Sub-suite 2.7: Global Print Stylesheet & Layout Discipline:');
const globalsCssPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
const globalsCssSrc = fs.readFileSync(globalsCssPath, 'utf8');

check('globals.css exists', fs.existsSync(globalsCssPath));
check('globals.css does NOT contain forced "@page { size: landscape }"', !globalsCssSrc.includes('size: landscape'));
check('globals.css does NOT contain forced "@page { size: portrait }"', !globalsCssSrc.includes('size: portrait'));
check('globals.css explicitly documents unforced orientation for browser delegation ("Do NOT set @page here")',
  globalsCssSrc.includes('Do NOT set @page here'));

const printHeaderPath = path.join(__dirname, '..', 'src', 'components', 'PrintHeader.tsx');
const printHeaderSrc = fs.readFileSync(printHeaderPath, 'utf8');

check('PrintHeader.tsx exports PrintOrientationToggle', printHeaderSrc.includes('export function PrintOrientationToggle'));
check('PrintOrientationToggle does NOT render interactive buttons (returns only style block)',
  !printHeaderSrc.includes('Orientasi Cetak:') && printHeaderSrc.includes('<style>{`'));
check('PrintHeader print style hides navigation chrome: header, nav, aside, .app-header, .no-print',
  printHeaderSrc.includes('header, nav, aside, .app-header, .no-print') &&
  printHeaderSrc.includes('display: none !important;'));
check('PrintHeader implements dynamic school address font scaling (getAddressFontSize)',
  printHeaderSrc.includes('getAddressFontSize'));

// ================================================================================
// SUITE 3: CAMERA 4:3 LOCK & INTEGRITY REMEDIATION EMPIRICAL CHECK
// ================================================================================
console.log('\n--- SUITE 3: Camera 4:3 Lock & Zero Coordinate Bypass (Post-Worker Remediation) ---');

// 3.1 Verification that coordinate check is eradicated from src/
const allSrcFiles: string[] = [];
function collectFiles(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js')) {
      allSrcFiles.push(full);
    }
  }
}
collectFiles(path.join(__dirname, '..', 'src'));

let foundCoordBypass = false;
for (const f of allSrcFiles) {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('latitude === -8.12') || content.includes('options.coordinates?.latitude === -8.12')) {
    foundCoordBypass = true;
    console.error(`  FOUND FORBIDDEN COORDINATE BYPASS IN: ${f}`);
  }
}
check('Zero coordinate bypass in entire src/ directory (no -8.12 latitude checks)', !foundCoordBypass);

// 3.2 Verification of CameraSelfieCapture.tsx
const cameraCompPath = path.join(__dirname, '..', 'src', 'components', 'CameraSelfieCapture.tsx');
const cameraCompSrc = fs.readFileSync(cameraCompPath, 'utf8');

check('CameraSelfieCapture constraints use ideal 3 / 4 for portrait and 4 / 3 for landscape',
  cameraCompSrc.includes('aspectRatio: isPortrait ? { ideal: 3 / 4 } : { ideal: 4 / 3 }'));
check('CameraSelfieCapture portrait ideal width is 720, height is 960 (exact 3:4 = 0.75)',
  cameraCompSrc.includes('width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1600 }') &&
  cameraCompSrc.includes('height: isPortrait ? { ideal: 960, max: 1440 } : { ideal: 960, max: 1200 }'));
check('CameraSelfieCapture container CSS locks to aspect-[3/4] portrait and aspect-[4/3] landscape',
  cameraCompSrc.includes("orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-[4/3]'"));
check('CameraSelfieCapture does NOT contain dead aspect-video comment anchors',
  !cameraCompSrc.includes('aspect-video'));

// 3.3 Universal Landscape 4:3 Cropping for Both Horizontal and Vertical Feeds
console.log('\n  Sub-suite 3.3: Universal 4:3 Cropping in watermarkCanvas.ts:');

class MockVideoElement {
  videoWidth: number;
  videoHeight: number;
  clientWidth: number;
  clientHeight: number;
  constructor(w: number, h: number) {
    this.videoWidth = w;
    this.videoHeight = h;
    this.clientWidth = w;
    this.clientHeight = h;
  }
}

// Ensure mock video instanceof check passes
(global as any).HTMLVideoElement = MockVideoElement;

function simulateCapture(srcW: number, srcH: number, orientation: 'portrait' | 'landscape', coords = { latitude: -8.12, longitude: 115.12 }) {
  canvasCalls = [];
  const videoEl = new MockVideoElement(srcW, srcH);
  const opts = getDefaultWatermarkOptions(coords, 'SMP Negeri 1 Empiris');
  drawWatermarkedCanvas(videoEl as any, opts, false, orientation);
  return {
    canvasWidth: currentMockCanvas.width,
    canvasHeight: currentMockCanvas.height,
    ratio: currentMockCanvas.width / currentMockCanvas.height,
    call: canvasCalls[0],
  };
}

// Test 3.3.1: 16:9 Webcam (1280x720) in landscape mode
const res1 = simulateCapture(1280, 720, 'landscape', { latitude: -8.12, longitude: 115.12 });
check('16:9 webcam in landscape mode: width center-cropped to 960 (720 * 4/3)', res1.canvasWidth === 960);
check('16:9 webcam in landscape mode: height preserved at 720', res1.canvasHeight === 720);
check('16:9 webcam in landscape mode: canvas aspect ratio is exactly 4/3 (1.3333)', Math.abs(res1.ratio - 4 / 3) < 0.0001);
check('16:9 webcam in landscape mode: offsetX is exactly 160px ((1280 - 960) / 2)', res1.call.offsetX === 160);

// Test 3.3.2: Vertical phone feed (720x1280) held upright while recording landscape
const res2 = simulateCapture(720, 1280, 'landscape', { latitude: -6.2088, longitude: 106.8456 });
check('Vertical phone feed in landscape mode: width preserved at 720', res2.canvasWidth === 720);
check('Vertical phone feed in landscape mode: height center-cropped to 540 (720 / (4/3))', res2.canvasHeight === 540);
check('Vertical phone feed in landscape mode: canvas aspect ratio is exactly 4/3 (1.3333)', Math.abs(res2.ratio - 4 / 3) < 0.0001);
check('Vertical phone feed in landscape mode: offsetY is exactly 370px ((1280 - 540) / 2)', res2.call.offsetY === 370);

// Test 3.3.3: Native 4:3 feed (1280x960) in landscape mode
const res3 = simulateCapture(1280, 960, 'landscape');
check('Native 4:3 feed in landscape mode: width preserved at 1280 (1x scale, no artificial crop)', res3.canvasWidth === 1280);
check('Native 4:3 feed in landscape mode: height preserved at 960 (1x scale, no artificial crop)', res3.canvasHeight === 960);
check('Native 4:3 feed in landscape mode: draw offsets are 0, 0', res3.call.offsetX === 0 && res3.call.offsetY === 0);

// Test 3.3.4: 16:9 Webcam (1280x720) in portrait mode
const res4 = simulateCapture(1280, 720, 'portrait');
check('16:9 webcam in portrait mode: width center-cropped to 540 (720 * 3/4)', res4.canvasWidth === 540);
check('16:9 webcam in portrait mode: height preserved at 720', res4.canvasHeight === 720);
check('16:9 webcam in portrait mode: canvas aspect ratio is exactly 3/4 (0.75)', Math.abs(res4.ratio - 0.75) < 0.0001);
check('16:9 webcam in portrait mode: offsetX is exactly 370px ((1280 - 540) / 2)', res4.call.offsetX === 370);

// 3.4 Google Drive Pre-Upload Conversion Pipeline Verification
const sampleDataUrl = 'data:image/jpeg;base64,' + Buffer.from('mock_image_binary_content_sipjam').toString('base64');
const driveFile = dataUrlToFile(sampleDataUrl, 'jurnal_kbm_20261008.jpg');
check('dataUrlToFile outputs genuine File instance for Drive upload', driveFile instanceof File || typeof driveFile.name === 'string');
check('dataUrlToFile assigns correct filename', driveFile.name === 'jurnal_kbm_20261008.jpg');
check('dataUrlToFile assigns image/jpeg MIME type', driveFile.type === 'image/jpeg');

// ================================================================================
// FINAL RESULTS SUMMARY
// ================================================================================
console.log('\n================================================================================');
console.log('CHALLENGER M1 ITERATION 2.2 FINAL EXECUTION RESULTS');
console.log('================================================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED:       ${passedChecks}`);
console.log(`FAILED:       ${failedChecks}`);

if (failedChecks === 0) {
  console.log('\n🎉 ALL EMPIRICAL CHALLENGES PASSED! VERDICT: APPROVE');
  process.exit(0);
} else {
  console.error(`\n❌ ${failedChecks} CHECKS FAILED! VERDICT: FAIL`);
  process.exit(1);
}
