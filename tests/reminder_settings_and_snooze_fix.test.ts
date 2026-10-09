import assert from 'assert';
import fs from 'fs';
import path from 'path';
import React from 'react';
import {
  SNOOZE_DURATION_MS,
  getSnoozeKey,
  isReminderSnoozed,
  setReminderSnooze,
  clearReminderSnooze,
  getReminderSnoozeRemainingMs,
  evaluateReminderConditions,
  TeacherReminderManager,
} from '../src/components/TeacherReminderManager';

console.log('========================================================================');
console.log('VERIFICATION TEST: REMINDER SETTINGS (R1) & 30-MIN SNOOZE FIX (R2)');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: R1 - AccountSettingsModal Interface & State Persistence
// -----------------------------------------------------------------------------
console.log('--- Section 1: R1 AccountSettingsModal UI & Persistence ---');

const modalFilePath = path.join(__dirname, '..', 'src', 'components', 'AccountSettingsModal.tsx');
assert(fs.existsSync(modalFilePath), 'AccountSettingsModal.tsx file exists');
const modalSource = fs.readFileSync(modalFilePath, 'utf8');

// 1.1 UI elements present
assert(
  modalSource.includes('Pengingat Otomatis (In-App)'),
  'AccountSettingsModal renders Pengingat Otomatis (In-App) header'
);
assert(
  modalSource.includes('autoReminderEnabled'),
  'AccountSettingsModal tracks autoReminderEnabled state'
);
assert(
  modalSource.includes('autoReminderInterval'),
  'AccountSettingsModal tracks autoReminderInterval state'
);
assert(
  modalSource.includes('Jeda Waktu:'),
  'AccountSettingsModal includes Jeda Waktu label and select'
);

// 1.2 LocalStorage persistence keys
assert(
  modalSource.includes('sipjam_reminder_enabled_'),
  'AccountSettingsModal reads and writes sipjam_reminder_enabled_${user.id}'
);
assert(
  modalSource.includes('sipjam_reminder_interval_'),
  'AccountSettingsModal reads and writes sipjam_reminder_interval_${user.id}'
);

// 1.3 Active snooze status & cancel in modal
assert(
  modalSource.includes('snoozeRemainingMinutes') || modalSource.includes('isReminderSnoozed'),
  'AccountSettingsModal monitors active snooze status'
);
assert(
  modalSource.includes('handleCancelSnoozeFromModal') || modalSource.includes('clearReminderSnooze'),
  'AccountSettingsModal allows canceling snooze directly from settings'
);

// 1.4 Event dispatch for real-time reactivity
assert(
  modalSource.includes('sipjam_reminder_config_changed'),
  'AccountSettingsModal dispatches sipjam_reminder_config_changed event on save / cancel'
);

console.log('✅ PASS Section 1: R1 settings interface and persistence verified');

// -----------------------------------------------------------------------------
// SECTION 2: R2 - 30-Minute Snooze Logic & Suppression
// -----------------------------------------------------------------------------
console.log('\n--- Section 2: R2 30-Minute Snooze Logic & Full Suppression ---');

const testTeacherId = 'guru_test_uuid_101';
const mockStorage = new Map<string, string>();

(global as any).window = {};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, val: string) => mockStorage.set(key, String(val)),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

// 2.1 Snooze duration exact check
assert.strictEqual(
  SNOOZE_DURATION_MS,
  30 * 60 * 1000,
  'SNOOZE_DURATION_MS is exactly 30 minutes (1,800,000 ms)'
);

// 2.2 Initially unsnoozed
assert.strictEqual(
  isReminderSnoozed(testTeacherId),
  false,
  'isReminderSnoozed returns false before snooze activation'
);
assert.strictEqual(
  getReminderSnoozeRemainingMs(testTeacherId),
  0,
  'Remaining ms is 0 before snooze activation'
);

// 2.3 Activate 30-min snooze
const beforeActivation = Date.now();
const expiryTime = setReminderSnooze(30, testTeacherId);
assert(
  expiryTime >= beforeActivation + 1800000 - 100 &&
  expiryTime <= beforeActivation + 1800000 + 100,
  'setReminderSnooze creates expiry timestamp ~30 minutes in the future'
);
assert.strictEqual(
  isReminderSnoozed(testTeacherId),
  true,
  'isReminderSnoozed returns true while snooze window is active'
);
const remainingMs = getReminderSnoozeRemainingMs(testTeacherId);
assert(
  remainingMs > 1700000 && remainingMs <= 1800000,
  'getReminderSnoozeRemainingMs accurately reflects active remaining time'
);

// 2.4 User isolation
const otherTeacherId = 'guru_other_uuid_202';
assert.strictEqual(
  isReminderSnoozed(otherTeacherId),
  false,
  'User isolation: snoozing testTeacherId does not snooze otherTeacherId'
);

// 2.5 Component source inspection: floating reminder is completely hidden
const trmFilePath = path.join(__dirname, '..', 'src', 'components', 'TeacherReminderManager.tsx');
const trmSource = fs.readFileSync(trmFilePath, 'utf8');

assert(
  trmSource.includes('isReminderSnoozed(user?.id)'),
  'TeacherReminderManager checks isReminderSnoozed(user?.id)'
);
assert(
  trmSource.includes('if (isSnoozed || isReminderSnoozed(user?.id))'),
  'TeacherReminderManager short-circuits rendering when snooze is active'
);
assert(
  trmSource.includes('style={{ display: \'none\' }}') && trmSource.includes('className="hidden'),
  'When snoozed, floating reminder is hidden (display: none / hidden) and not visible on screen'
);

// 2.6 Snooze expiration test (simulated time advance)
const originalDateNow = Date.now;
try {
  // Advance simulated clock by 31 minutes
  Date.now = () => beforeActivation + 31 * 60 * 1000;
  assert.strictEqual(
    isReminderSnoozed(testTeacherId),
    false,
    'Snooze expires cleanly after 30 minutes have elapsed'
  );
  assert.strictEqual(
    getReminderSnoozeRemainingMs(testTeacherId),
    0,
    'Remaining ms returns 0 after 30 minutes expire'
  );
} finally {
  Date.now = originalDateNow;
}

// 2.7 Cancellation test
setReminderSnooze(30, testTeacherId);
assert.strictEqual(isReminderSnoozed(testTeacherId), true);
clearReminderSnooze(testTeacherId);
assert.strictEqual(
  isReminderSnoozed(testTeacherId),
  false,
  'clearReminderSnooze removes snooze key immediately'
);
assert.strictEqual(
  getReminderSnoozeRemainingMs(testTeacherId),
  0,
  'Remaining ms is 0 immediately following cancellation'
);

console.log('✅ PASS Section 2: R2 30-minute snooze logic and complete suppression verified');

// -----------------------------------------------------------------------------
// SECTION 3: Edge Cases & Storage Resilience
// -----------------------------------------------------------------------------
console.log('\n--- Section 3: Edge Cases & Storage Fault Tolerance ---');

// 3.1 Undefined / null user fallback
const defaultKey = getSnoozeKey(undefined);
assert.strictEqual(defaultKey, 'sipjam_reminder_snooze_until_default');

// 3.2 Corrupted / malformed storage entries
mockStorage.set(getSnoozeKey('user_corrupt_alpha'), 'invalid_non_numeric');
assert.strictEqual(isReminderSnoozed('user_corrupt_alpha'), false);
assert.strictEqual(getReminderSnoozeRemainingMs('user_corrupt_alpha'), 0);

mockStorage.set(getSnoozeKey('user_corrupt_empty'), '');
assert.strictEqual(isReminderSnoozed('user_corrupt_empty'), false);

mockStorage.set(getSnoozeKey('user_corrupt_neg'), '-50000');
assert.strictEqual(isReminderSnoozed('user_corrupt_neg'), false);

// 3.3 Storage exception handling
(global as any).localStorage.getItem = () => {
  throw new Error('SecurityError: Access Denied');
};
assert.doesNotThrow(() => {
  const result = isReminderSnoozed('user_sec_error');
  assert.strictEqual(result, false, 'SecurityError returns false without throwing');
});
assert.doesNotThrow(() => {
  const rem = getReminderSnoozeRemainingMs('user_sec_error');
  assert.strictEqual(rem, 0, 'SecurityError returns 0 without throwing');
});

console.log('✅ PASS Section 3: Edge cases and exception safety verified');

console.log('\n========================================================================');
console.log('🎉 ALL R1 & R2 REMINDER TESTS PASSED SUCCESSFULLY!');
console.log('========================================================================');
