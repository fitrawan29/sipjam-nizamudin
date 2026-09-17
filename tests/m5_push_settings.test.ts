import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

import { AVATAR_LIST, renderUserAvatar } from '../src/lib/avatars';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, configureWebPush } from '../src/lib/vapid';

let failures = 0;
let passes = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${testName}`);
    passes++;
  }
}

async function runM5TestSuite() {
  console.log('================================================================');
  console.log('MILESTONE 5 VERIFICATION SUITE: VAPID PUSH & ACCOUNT SETTINGS');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: Service Worker Verification (public/sw.js)
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Service Worker (public/sw.js) Verification ---');
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js exists');

  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes("addEventListener('push'"), 'sw.js listens for push events');
  assert(swContent.includes('registration.showNotification'), 'sw.js calls registration.showNotification');
  assert(swContent.includes("addEventListener('notificationclick'"), 'sw.js listens for notificationclick events');
  assert(swContent.includes('notification.close'), 'sw.js closes notification on click');
  assert(swContent.includes('clients.matchAll') || swContent.includes('clients.openWindow'), 'sw.js focuses or opens app window on click');

  // ---------------------------------------------------------------------------
  // SECTION 2: VAPID Helper & Key Configuration
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: VAPID Key & Push Helpers ---');
  assert(typeof VAPID_PUBLIC_KEY === 'string' && VAPID_PUBLIC_KEY.length > 20, 'VAPID public key is configured');
  assert(typeof VAPID_PRIVATE_KEY === 'string' && VAPID_PRIVATE_KEY.length > 20, 'VAPID private key is configured');

  let configSuccess = false;
  try {
    configureWebPush();
    configSuccess = true;
  } catch (err: any) {
    console.error('configureWebPush error:', err);
  }
  assert(configSuccess, 'web-push configuration initializes cleanly with VAPID keys');

  // ---------------------------------------------------------------------------
  // SECTION 3: API Route Endpoints Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: API Push Endpoints (Files & Structure) ---');
  const subscribeRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'push', 'subscribe', 'route.ts');
  assert(fs.existsSync(subscribeRoutePath), 'src/app/api/push/subscribe/route.ts exists');

  const subRouteContent = fs.readFileSync(subscribeRoutePath, 'utf8');
  assert(subRouteContent.includes('push_subscriptions'), 'Subscribe route targets push_subscriptions table');
  assert(subRouteContent.includes('p256dh') && subRouteContent.includes('auth'), 'Subscribe route extracts p256dh and auth keys');
  assert(subRouteContent.includes('upsert'), 'Subscribe route upserts subscription by endpoint');

  const validateRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'push', 'validate', 'route.ts');
  assert(fs.existsSync(validateRoutePath), 'src/app/api/push/validate/route.ts exists');

  const valRouteContent = fs.readFileSync(validateRoutePath, 'utf8');
  assert(valRouteContent.includes('sendWebPush'), 'Validate route calls sendWebPush');
  assert(valRouteContent.includes('GET'), 'Validate route provides GET handler for public key');
  assert(valRouteContent.includes('POST'), 'Validate route provides POST handler for test notification');

  // ---------------------------------------------------------------------------
  // SECTION 4: 12 Avatar Presets & Account Settings Component
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Avatar Presets & Account Settings ---');
  assert(AVATAR_LIST.length === 12, 'Exactly 12 stylish avatar presets exist in AVATAR_LIST', `Got ${AVATAR_LIST.length}`);
  
  const avatarIds = AVATAR_LIST.map(a => a.id);
  const expectedIds = Array.from({ length: 12 }, (_, i) => `avatar_${i + 1}`);
  const allIdsMatch = expectedIds.every(id => avatarIds.includes(id));
  assert(allIdsMatch, 'Avatar IDs conform to avatar_1 through avatar_12');

  const testSvgRender = renderUserAvatar('avatar_1');
  assert(testSvgRender !== null && typeof testSvgRender === 'object', 'renderUserAvatar renders valid SVG React element');

  const modalPath = path.join(__dirname, '..', 'src', 'components', 'AccountSettingsModal.tsx');
  assert(fs.existsSync(modalPath), 'src/components/AccountSettingsModal.tsx exists');

  const modalContent = fs.readFileSync(modalPath, 'utf8');
  assert(modalContent.includes('update_user_profile'), 'AccountSettingsModal calls update_user_profile RPC');
  assert(modalContent.includes('AVATAR_LIST'), 'AccountSettingsModal renders AVATAR_LIST');
  assert(modalContent.includes('changePassword') || modalContent.includes('Ganti Password'), 'AccountSettingsModal supports password updates');
  assert(modalContent.includes('Push Notifikasi') || modalContent.includes('isPushSubscribed'), 'AccountSettingsModal integrates push controls');

  // ---------------------------------------------------------------------------
  // SECTION 5: Teacher Attendance Requirement in AdminConfigView & workflow.ts
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Teacher Attendance Requirement Logic ---');
  const adminConfigPath = path.join(__dirname, '..', 'src', 'components', 'AdminConfigView.tsx');
  const configContent = fs.readFileSync(adminConfigPath, 'utf8');
  assert(configContent.includes('aturan_kehadiran_guru'), 'AdminConfigView contains aturan_kehadiran_guru field');
  assert(configContent.includes('Hari_Mengajar_Saja'), 'AdminConfigView contains Hari_Mengajar_Saja option');
  assert(configContent.includes('Semua_Hari'), 'AdminConfigView contains Semua_Hari option');

  const workflowPath = path.join(__dirname, '..', 'src', 'lib', 'workflow.ts');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  assert(workflowContent.includes('aturan_kehadiran_guru'), 'workflow.ts queries aturan_kehadiran_guru from pengaturan');
  assert(workflowContent.includes('Hari_Mengajar_Saja'), 'workflow.ts branches on Hari_Mengajar_Saja');
  assert(workflowContent.includes('bebasAlpa'), 'workflow.ts populates bebasAlpa property');
  assert(workflowContent.includes('isNonTeachingDay'), 'workflow.ts populates isNonTeachingDay property');

  // Test getGuruDailyState execution with simulated non-teaching conditions
  const { getGuruDailyState } = await import('../src/lib/workflow');
  const dailyState = await getGuruDailyState('Guru Demo NonExistent', 'nonexistent_user');
  assert(typeof dailyState.isAlpa === 'boolean', 'getGuruDailyState returns isAlpa as boolean');
  assert(typeof dailyState.bebasAlpa === 'boolean', 'getGuruDailyState returns bebasAlpa as boolean');

  // ---------------------------------------------------------------------------
  // SECTION 6: Target Email for Drive Upload
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Target Email Integration ---');
  assert(configContent.includes('email_tujuan_upload'), 'AdminConfigView contains email_tujuan_upload input');

  const drivePath = path.join(__dirname, '..', 'src', 'lib', 'driveUpload.ts');
  const driveContent = fs.readFileSync(drivePath, 'utf8');
  assert(driveContent.includes('targetEmail'), 'driveUpload.ts includes targetEmail in webhook payload');
  assert(driveContent.includes('email_tujuan_upload'), 'driveUpload.ts includes email_tujuan_upload parameter/payload');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passes} PASSED, ${failures} FAILED`);
  console.log('================================================================\n');

  if (failures > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL MILESTONE 5 CHECKS PASSED!\n');
  }
}

runM5TestSuite().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
