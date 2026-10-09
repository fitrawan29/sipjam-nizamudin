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
} from '../src/components/TeacherReminderManager';

console.log('========================================================================');
console.log('ADVERSARIAL REVIEWER R2 TEST: SNOOZE BOUNDARY, SANDBOX, & REACTIVITY');
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

(global as any).window = {
  localStorage: customStorage,
  dispatchEvent: (ev: any) => {},
};
(global as any).localStorage = customStorage;

// -----------------------------------------------------------------------------
// TEST SUITE 1: 30-Minute Boundary Precision & Expiry Semantics
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Exact 30-Minute Boundary Check ---');

const testTeacher = 'guru_boundary_test_01';
mockStorage.clear();

const startTime = 1_700_000_000_000;
const originalDateNow = Date.now;
Date.now = () => startTime;

try {
  // Activate 30-minute snooze
  const expiry = setReminderSnooze(30, testTeacher);
  assert.strictEqual(expiry, startTime + 30 * 60 * 1000, 'Expiry is exactly startTime + 1,800,000 ms');

  // Case 1.1: 1ms before expiry (29m 59s 999ms) -> Snooze STILL ACTIVE
  Date.now = () => expiry - 1;
  assert.strictEqual(isReminderSnoozed(testTeacher), true, '1ms before expiry: isReminderSnoozed must be true');
  assert.strictEqual(getReminderSnoozeRemainingMs(testTeacher), 1, '1ms before expiry: remaining ms is 1');

  // Case 1.2: Exactly at expiry -> Snooze EXPIRED
  Date.now = () => expiry;
  assert.strictEqual(isReminderSnoozed(testTeacher), false, 'At exact expiry: isReminderSnoozed must be false');
  assert.strictEqual(getReminderSnoozeRemainingMs(testTeacher), 0, 'At exact expiry: remaining ms is 0');

  // Case 1.3: 1ms after expiry -> Snooze EXPIRED
  Date.now = () => expiry + 1;
  assert.strictEqual(isReminderSnoozed(testTeacher), false, '1ms after expiry: isReminderSnoozed must be false');
  assert.strictEqual(getReminderSnoozeRemainingMs(testTeacher), 0, '1ms after expiry: remaining ms is 0');

  // Case 1.4: 1 hour after expiry -> Snooze EXPIRED and clean
  Date.now = () => expiry + 3600000;
  assert.strictEqual(isReminderSnoozed(testTeacher), false, '1 hour after expiry: isReminderSnoozed remains false');
  assert.strictEqual(getReminderSnoozeRemainingMs(testTeacher), 0, '1 hour after expiry: remaining ms remains 0');

  console.log('✅ PASS Test Suite 1: Exact 30-minute boundary and expiration semantics verified');
} finally {
  Date.now = originalDateNow;
}

// -----------------------------------------------------------------------------
// TEST SUITE 2: Storage Fault Tolerance & Private Sandbox Mode (SecurityError)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Private Sandbox Mode Fallback ---');

storageErrorMode = true;
const sandboxTeacher = 'guru_sandbox_mode_02';

try {
  // Test 2.1: Setting snooze in locked sandbox
  const sandExpiry = setReminderSnooze(30, sandboxTeacher);
  assert(sandExpiry > 0, 'setReminderSnooze must return future timestamp even when localStorage throws SecurityError');

  // Test 2.2: Reading snooze in locked sandbox
  assert.strictEqual(
    isReminderSnoozed(sandboxTeacher),
    true,
    'isReminderSnoozed must return true via memory fallback in locked sandbox'
  );

  const remMs = getReminderSnoozeRemainingMs(sandboxTeacher);
  assert(remMs > 1790000 && remMs <= 1800000, 'getReminderSnoozeRemainingMs reports remaining time from memory fallback');

  // Test 2.3: Config read and write in locked sandbox
  setReminderConfig(sandboxTeacher, false, 15);
  const sandCfg = getReminderConfig(sandboxTeacher);
  assert.strictEqual(sandCfg.enabled, false, 'getReminderConfig accurately reads disabled state from memory fallback');
  assert.strictEqual(sandCfg.intervalMinutes, 15, 'getReminderConfig accurately reads interval from memory fallback');
  assert.strictEqual(sandCfg.intervalMs, 15 * 60 * 1000, 'getReminderConfig converts interval to ms');

  // Test 2.4: Clear snooze in locked sandbox
  clearReminderSnooze(sandboxTeacher);
  assert.strictEqual(
    isReminderSnoozed(sandboxTeacher),
    false,
    'clearReminderSnooze cleans up memory fallback without throwing'
  );
  assert.strictEqual(getReminderSnoozeRemainingMs(sandboxTeacher), 0);

  console.log('✅ PASS Test Suite 2: Memory fallback operates fault-tolerantly under locked localStorage');
} finally {
  storageErrorMode = false;
}

// -----------------------------------------------------------------------------
// TEST SUITE 3: Multi-User Isolation on Same Browser / Device
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Multi-User Client Isolation ---');

mockStorage.clear();
const teacherAlpha = 'guru_alpha_uuid';
const teacherBeta = 'guru_beta_uuid';

// Alpha snoozes for 30 minutes, Beta does not
setReminderSnooze(30, teacherAlpha);
assert.strictEqual(isReminderSnoozed(teacherAlpha), true, 'Teacher Alpha is snoozed');
assert.strictEqual(isReminderSnoozed(teacherBeta), false, 'Teacher Beta is NOT snoozed');

// Alpha disables reminders, Beta keeps default (enabled, 5m)
setReminderConfig(teacherAlpha, false, 10);
const cfgAlpha = getReminderConfig(teacherAlpha);
const cfgBeta = getReminderConfig(teacherBeta);

assert.strictEqual(cfgAlpha.enabled, false, 'Teacher Alpha has reminders disabled');
assert.strictEqual(cfgAlpha.intervalMinutes, 10, 'Teacher Alpha has 10 min interval');
assert.strictEqual(cfgBeta.enabled, true, 'Teacher Beta retains default enabled state');
assert.strictEqual(cfgBeta.intervalMinutes, 5, 'Teacher Beta retains default 5 min interval');

// Cancel Alpha snooze: Beta remains unaffected
clearReminderSnooze(teacherAlpha);
assert.strictEqual(isReminderSnoozed(teacherAlpha), false);
assert.strictEqual(isReminderSnoozed(teacherBeta), false);

console.log('✅ PASS Test Suite 3: Teacher Alpha and Teacher Beta states completely isolated');

// -----------------------------------------------------------------------------
// TEST SUITE 4: Configuration Sanitization & Corrupted Input Handling
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Configuration Sanitization ---');

const teacherCorrupt = 'guru_corrupt_config';

// Case 4.1: Corrupted negative interval
mockStorage.set(getReminderIntervalKey(teacherCorrupt), '-10');
assert.strictEqual(getReminderConfig(teacherCorrupt).intervalMinutes, 5, 'Negative interval safely sanitizes to default 5 min');

// Case 4.2: Corrupted non-numeric string
mockStorage.set(getReminderIntervalKey(teacherCorrupt), 'banana');
assert.strictEqual(getReminderConfig(teacherCorrupt).intervalMinutes, 5, 'Non-numeric interval safely sanitizes to default 5 min');

// Case 4.3: Zero interval
mockStorage.set(getReminderIntervalKey(teacherCorrupt), '0');
assert.strictEqual(getReminderConfig(teacherCorrupt).intervalMinutes, 5, 'Zero interval safely sanitizes to default 5 min');

// Case 4.4: Valid intervals (1, 3, 5, 15, 30)
for (const mins of [1, 3, 5, 15, 30]) {
  setReminderConfig(teacherCorrupt, true, mins);
  const cfg = getReminderConfig(teacherCorrupt);
  assert.strictEqual(cfg.enabled, true);
  assert.strictEqual(cfg.intervalMinutes, mins);
  assert.strictEqual(cfg.intervalMs, mins * 60 * 1000);
}

console.log('✅ PASS Test Suite 4: Corrupted configuration sanitization verified');

// -----------------------------------------------------------------------------
// TEST SUITE 5: Event Bus Reactivity on Config Change
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Event Bus Dispatch Reactivity ---');

let eventDispatched = 0;
let storageDispatched = 0;

(global as any).window.dispatchEvent = (ev: any) => {
  if (ev?.type === 'sipjam_reminder_config_changed') eventDispatched++;
  if (ev?.type === 'storage') storageDispatched++;
};

const teacherEvents = 'guru_event_tester';
eventDispatched = 0;
storageDispatched = 0;

setReminderSnooze(30, teacherEvents);
assert.strictEqual(eventDispatched, 1, 'setReminderSnooze dispatches sipjam_reminder_config_changed');
assert.strictEqual(storageDispatched, 1, 'setReminderSnooze dispatches storage');

clearReminderSnooze(teacherEvents);
assert.strictEqual(eventDispatched, 2, 'clearReminderSnooze dispatches sipjam_reminder_config_changed');
assert.strictEqual(storageDispatched, 2, 'clearReminderSnooze dispatches storage');

setReminderConfig(teacherEvents, false, 5);
assert.strictEqual(eventDispatched, 3, 'setReminderConfig dispatches sipjam_reminder_config_changed');
assert.strictEqual(storageDispatched, 3, 'setReminderConfig dispatches storage');

console.log('✅ PASS Test Suite 5: Event bus synchronization across components and tabs verified');

console.log('\n========================================================================');
console.log('🎉 ALL ADVERSARIAL REVIEWER R2 TESTS PASSED SUCCESSFULLY!');
console.log('========================================================================');
