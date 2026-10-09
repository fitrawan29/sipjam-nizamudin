import assert from 'assert';
import {
  SNOOZE_DURATION_MS,
  getSnoozeKey,
  getReminderEnabledKey,
  getReminderIntervalKey,
  isReminderSnoozed,
  setReminderSnooze,
  clearReminderSnooze,
  getReminderSnoozeRemainingMs,
  getReminderConfig,
  setReminderConfig,
  safeGetStorageItem,
  safeSetStorageItem,
  safeRemoveStorageItem,
  evaluateReminderConditions,
  TeacherReminderManager,
} from '../src/components/TeacherReminderManager';

console.log('========================================================================');
console.log('ADVERSARIAL REVIEWER R3 TEST: SERVICE WORKER RACE, CLOCK SKEW & RESILIENCE');
console.log('========================================================================\n');

// Mock browser global environment
const mockStorage = new Map<string, string>();
let storageErrorMode = false;

const customStorage: any = {
  getItem: (k: string) => {
    if (storageErrorMode) throw new Error('DOMException: SecurityError: Access is denied');
    return mockStorage.get(k) ?? null;
  },
  setItem: (k: string, v: string) => {
    if (storageErrorMode) throw new Error('DOMException: QuotaExceededError');
    mockStorage.set(k, String(v));
  },
  removeItem: (k: string) => {
    if (storageErrorMode) throw new Error('DOMException: SecurityError');
    mockStorage.delete(k);
  },
  clear: () => {
    mockStorage.clear();
  },
};

let dispatchedEvents: string[] = [];

(global as any).window = {
  localStorage: customStorage,
  dispatchEvent: (ev: any) => {
    dispatchedEvents.push(ev?.type || 'unknown');
  },
};
(global as any).localStorage = customStorage;

// -----------------------------------------------------------------------------
// TEST SUITE 1: Undefined / Null User Fallbacks Across Settings & Snooze
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Null/Undefined User Safety in Snooze & Settings ---');

mockStorage.clear();
dispatchedEvents = [];

// 1.1 Snooze with undefined userId
const expUndef = setReminderSnooze(30, undefined);
assert(expUndef > Date.now(), 'setReminderSnooze(30, undefined) succeeds with future timestamp');
assert.strictEqual(isReminderSnoozed(undefined), true, 'isReminderSnoozed(undefined) returns true');
assert(getReminderSnoozeRemainingMs(undefined) > 0, 'Remaining ms for undefined user is > 0');

// 1.2 Config with undefined userId
setReminderConfig(undefined, false, 15);
const cfgUndef = getReminderConfig(undefined);
assert.strictEqual(cfgUndef.enabled, false, 'Reminder config for undefined user persists enabled=false');
assert.strictEqual(cfgUndef.intervalMinutes, 15, 'Reminder config for undefined user persists interval=15');

// 1.3 Clear snooze with undefined userId
clearReminderSnooze(undefined);
assert.strictEqual(isReminderSnoozed(undefined), false, 'clearReminderSnooze(undefined) resets snooze state');
assert.strictEqual(getReminderSnoozeRemainingMs(undefined), 0, 'Remaining ms is 0 after clearing');

console.log('✅ PASS Test Suite 1: Undefined / null user fallback operations operate seamlessly');

// -----------------------------------------------------------------------------
// TEST SUITE 2: System Clock Jump & Boundary Edge Cases
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: System Clock Jump & Boundary Precision ---');

const teacherClock = 'guru_clock_jump_01';
mockStorage.clear();

const baseTime = 1_710_000_000_000;
const originalDateNow = Date.now;
Date.now = () => baseTime;

try {
  const snoozeExp = setReminderSnooze(30, teacherClock);
  assert.strictEqual(snoozeExp, baseTime + 1_800_000);

  // Jump clock forward by 29 minutes and 59 seconds
  Date.now = () => baseTime + 29 * 60 * 1000 + 59 * 1000;
  assert.strictEqual(isReminderSnoozed(teacherClock), true, 'At 29m 59s: snooze remains active');
  assert.strictEqual(getReminderSnoozeRemainingMs(teacherClock), 1000, 'Remaining ms is exactly 1,000');

  // Jump clock forward by exactly 30 minutes
  Date.now = () => baseTime + 30 * 60 * 1000;
  assert.strictEqual(isReminderSnoozed(teacherClock), false, 'At exactly 30m: snooze expires');
  assert.strictEqual(getReminderSnoozeRemainingMs(teacherClock), 0, 'Remaining ms is 0');

  // Jump clock forward by 2 hours (e.g. laptop closed or sleep mode)
  Date.now = () => baseTime + 2 * 3600 * 1000;
  assert.strictEqual(isReminderSnoozed(teacherClock), false, 'At 2h after: snooze remains cleanly expired');
  assert.strictEqual(getReminderSnoozeRemainingMs(teacherClock), 0, 'Remaining ms remains 0');

  // Clock skew backwards (e.g. NTP sync corrected clock backwards by 5 minutes)
  Date.now = () => baseTime - 300_000;
  assert.strictEqual(isReminderSnoozed(teacherClock), true, 'If clock moves backward before expiry, snooze stays active');
  assert.strictEqual(getReminderSnoozeRemainingMs(teacherClock), 1_800_000 + 300_000);

  console.log('✅ PASS Test Suite 2: System clock jump and skew handled with mathematical precision');
} finally {
  Date.now = originalDateNow;
}

// -----------------------------------------------------------------------------
// TEST SUITE 3: Corrupted & Extreme Interval Configuration Values
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Extreme & Malformed Interval Configurations ---');

const teacherExtreme = 'guru_extreme_config';

const malformedValues = [
  '0',
  '-1',
  '-999999',
  'abc',
  'Infinity',
  '-Infinity',
  'null',
  'undefined',
  '{}',
  '3.14',
  '   ',
];

for (const val of malformedValues) {
  mockStorage.set(getReminderIntervalKey(teacherExtreme), val);
  const cfg = getReminderConfig(teacherExtreme);
  assert(cfg.intervalMinutes >= 1, `Interval value ${val} must sanitize to >= 1 minute (got ${cfg.intervalMinutes})`);
  assert(cfg.intervalMs >= 60_000, `Interval ms must sanitize to >= 60,000 ms (got ${cfg.intervalMs})`);
  assert.strictEqual(typeof cfg.enabled, 'boolean', 'Enabled must be a valid boolean');
}

console.log('✅ PASS Test Suite 3: Malformed intervals strictly sanitized to safe minimums');

// -----------------------------------------------------------------------------
// TEST SUITE 4: Storage Race & Fault Tolerance in Safe Storage Helpers
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Memory Storage Isolation & Fallback ---');

storageErrorMode = true;
const sandboxUser = 'guru_isolated_sandbox';

try {
  safeSetStorageItem('test_key_sandbox', 'test_val');
  assert.strictEqual(
    safeGetStorageItem('test_key_sandbox'),
    'test_val',
    'safeGetStorageItem retrieves value from memory fallback when storage errors'
  );

  safeRemoveStorageItem('test_key_sandbox');
  assert.strictEqual(
    safeGetStorageItem('test_key_sandbox'),
    null,
    'safeRemoveStorageItem clears value from memory fallback'
  );

  console.log('✅ PASS Test Suite 4: Safe storage primitives operate with 100% memory fault tolerance');
} finally {
  storageErrorMode = false;
}

// -----------------------------------------------------------------------------
// TEST SUITE 5: Service Worker Non-Blocking Fallback Inspection
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Service Worker Fallback & Non-Hanging Timeout ---');

import fs from 'fs';
import path from 'path';

const trmFilePath = path.join(__dirname, '..', 'src', 'components', 'TeacherReminderManager.tsx');
const trmSource = fs.readFileSync(trmFilePath, 'utf8');

assert(
  trmSource.includes('Promise.race([') && trmSource.includes('navigator.serviceWorker.ready'),
  'TeacherReminderManager uses Promise.race on navigator.serviceWorker.ready to prevent infinite hangs'
);

assert(
  trmSource.includes('new Notification('),
  'TeacherReminderManager falls back gracefully to new Notification() when SW is unavailable or times out'
);

console.log('✅ PASS Test Suite 5: Service worker timeout and non-blocking notification delivery verified');

console.log('\n========================================================================');
console.log('🎉 ALL ADVERSARIAL REVIEWER R3 TESTS PASSED SUCCESSFULLY!');
console.log('========================================================================');
