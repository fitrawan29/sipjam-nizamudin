import fs from 'fs';
import path from 'path';
import {
  setReminderSnooze,
  isReminderSnoozed,
  clearReminderSnooze,
  getReminderSnoozeRemainingMs,
  getSnoozeKey,
  SNOOZE_DURATION_MS
} from '../src/components/TeacherReminderManager';
import { drawWatermarkedCanvas, getDefaultWatermarkOptions, dataUrlToFile } from '../src/lib/watermarkCanvas';

console.log('========================================================================');
console.log('M1 VERIFICATION TEST: REMINDER SNOOZE, PRINT SIMPLIFICATION, 4:3 CAMERA');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

// ----------------------------------------------------------------------------
// SECTION 1: 30-Minute Notification Snooze Lifecycle
// ----------------------------------------------------------------------------
console.log('\n--- Section 1: 30-Minute Notification Snooze Lifecycle ---');

// Mock localStorage if in node environment
const storageMap = new Map<string, string>();
if (typeof (global as any).localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, val: string) => storageMap.set(key, String(val)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };
}
if (typeof (global as any).window === 'undefined') {
  (global as any).window = {};
}

// 1.1 Snooze duration constant
assert(SNOOZE_DURATION_MS === 30 * 60 * 1000, 'SNOOZE_DURATION_MS is exactly 30 minutes (1,800,000 ms)');

// 1.2 Storage key format
assert(getSnoozeKey('teacher_123') === 'sipjam_reminder_snooze_until_teacher_123', 'getSnoozeKey formats key as sipjam_reminder_snooze_until_${userId}');

// 1.3 Setting snooze creates future timestamp
const now = Date.now();
const expiry = setReminderSnooze(30, 'user_test_1');
assert(expiry >= now + 1800000 - 100 && expiry <= now + 1800000 + 100, 'setReminderSnooze sets timestamp exactly 30 minutes in future');
assert(isReminderSnoozed('user_test_1') === true, 'isReminderSnoozed returns true when snooze is active');

// 1.4 Remaining ms calculation
const remainingMs = getReminderSnoozeRemainingMs('user_test_1');
assert(remainingMs > 1790000 && remainingMs <= 1800000, `getReminderSnoozeRemainingMs returns remaining ms (~${Math.round(remainingMs / 60000)}m)`);

// 1.5 User isolation
assert(isReminderSnoozed('user_test_2') === false, 'User isolation: snooze for user 1 does not affect user 2');

// 1.6 Early cancellation
clearReminderSnooze('user_test_1');
assert(isReminderSnoozed('user_test_1') === false, 'clearReminderSnooze immediately cancels snooze');
assert(getReminderSnoozeRemainingMs('user_test_1') === 0, 'getReminderSnoozeRemainingMs returns 0 after cancellation');

// 1.7 Expiry boundary test
localStorage.setItem(getSnoozeKey('user_expired'), String(Date.now() - 1000)); // expired 1s ago
assert(isReminderSnoozed('user_expired') === false, 'isReminderSnoozed returns false when snooze has expired');

// ----------------------------------------------------------------------------
// SECTION 2: Print Orientation Simplification (PrintHeader.tsx)
// ----------------------------------------------------------------------------
console.log('\n--- Section 2: Print Orientation Simplification (PrintHeader.tsx) ---');

const printHeaderPath = path.join(__dirname, '..', 'src', 'components', 'PrintHeader.tsx');
const printHeaderContent = fs.readFileSync(printHeaderPath, 'utf-8');

assert(printHeaderContent.includes('export function PrintOrientationToggle'), 'PrintHeader.tsx exports PrintOrientationToggle component');
assert(!printHeaderContent.includes('Orientasi Cetak:'), 'PrintHeader.tsx does NOT render manual Orientasi Cetak toggle buttons');
assert(!printHeaderContent.includes('size: A4') && !printHeaderContent.includes('@page {'), 'PrintHeader.tsx does NOT inject conflicting forced @page orientation directives');
assert(printHeaderContent.includes('header, nav, aside, .app-header, .no-print {') && printHeaderContent.includes('display: none !important;'), 'PrintHeader.tsx hides navigation chrome in print stylesheet');

// ----------------------------------------------------------------------------
// SECTION 3: Camera 4:3 Ratio Lock & Container Styling (CameraSelfieCapture.tsx)
// ----------------------------------------------------------------------------
console.log('\n--- Section 3: Camera 4:3 Ratio Lock (CameraSelfieCapture.tsx) ---');

const cameraPath = path.join(__dirname, '..', 'src', 'components', 'CameraSelfieCapture.tsx');
const cameraContent = fs.readFileSync(cameraPath, 'utf-8');

assert(cameraContent.includes('aspectRatio: isPortrait ? { ideal: 3 / 4 } : { ideal: 4 / 3 }'), 'CameraSelfieCapture constraints use ideal 4 / 3 for landscape and 3 / 4 for portrait');
assert(cameraContent.includes("orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-[4/3]'"), 'CameraSelfieCapture preview container uses aspect-[4/3] for landscape');
assert(cameraContent.includes("orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]'"), 'CameraSelfieCapture video & img elements use aspect-[4/3] for landscape');

// ----------------------------------------------------------------------------
// SECTION 4: Watermark Canvas 4:3 Cropping (watermarkCanvas.ts)
// ----------------------------------------------------------------------------
console.log('\n--- Section 4: Watermark Canvas 4:3 Cropping (watermarkCanvas.ts) ---');

const watermarkPath = path.join(__dirname, '..', 'src', 'lib', 'watermarkCanvas.ts');
const watermarkContent = fs.readFileSync(watermarkPath, 'utf-8');

assert(watermarkContent.includes('4 / 3'), 'watermarkCanvas.ts includes 4 / 3 target ratio for landscape mode');

// Setup mock document for canvas testing
let lastCanvasWidth = 0;
let lastCanvasHeight = 0;
if (typeof (global as any).document === 'undefined') {
  (global as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          set width(w: number) { lastCanvasWidth = w; },
          get width() { return lastCanvasWidth; },
          set height(h: number) { lastCanvasHeight = h; },
          get height() { return lastCanvasHeight; },
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
            drawImage: () => {},
          }),
          toDataURL: () => 'data:image/jpeg;base64,mockCanvasData',
        };
      }
      return {};
    },
  };
}

if (typeof (global as any).HTMLVideoElement === 'undefined') {
  (global as any).HTMLVideoElement = class {};
}
if (typeof (global as any).HTMLImageElement === 'undefined') {
  (global as any).HTMLImageElement = class {};
}

const mockFeed = new (global as any).HTMLImageElement();
// Simulate portrait phone feed (720x1280) when user selects landscape (KBM journal)
mockFeed.width = 720;
mockFeed.height = 1280;

const watermarkOpts = getDefaultWatermarkOptions({ latitude: -8.65, longitude: 115.22 }, 'SMP Negeri 1');
drawWatermarkedCanvas(mockFeed, watermarkOpts, false, 'landscape');

const producedRatio = lastCanvasWidth / lastCanvasHeight;
assert(lastCanvasWidth > lastCanvasHeight, `Landscape canvas width (${lastCanvasWidth}) > height (${lastCanvasHeight})`);
assert(Math.abs(producedRatio - (4 / 3)) < 0.01, `Produced landscape canvas ratio (${producedRatio.toFixed(4)}) conforms strictly to 4:3 (1.3333)`);

// Test dataUrlToFile
const mockDataUrl = 'data:image/jpeg;base64,' + Buffer.from('test-image-content').toString('base64');
const fileObj = dataUrlToFile(mockDataUrl, 'foto_kbm_test.jpg');
assert(fileObj instanceof File && fileObj.name === 'foto_kbm_test.jpg' && fileObj.size > 0, 'dataUrlToFile decodes dataUrl to valid compressed File ready for Google Drive upload');

console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('========================================================================\n');

if (failed === 0) {
  console.log('🎉 ALL M1 VERIFICATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED!`);
  process.exit(1);
}
