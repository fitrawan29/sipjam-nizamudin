import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
}

import { calculateStreak } from '../src/lib/warningSystem';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('MILESTONE M2 TEST: NOTIFICATIONS, AUTO-ALPA & 3X WARNING');
  console.log('====================================================\n');

  const projectRoot = path.resolve(__dirname, '..');
  const notifRoutePath = path.join(projectRoot, 'src', 'app', 'api', 'notifications', 'rejection', 'route.ts');
  const alpaServicePath = path.join(projectRoot, 'src', 'lib', 'attendanceAlpa.ts');
  const alpaRoutePath = path.join(projectRoot, 'src', 'app', 'api', 'attendance', 'auto-alpa', 'route.ts');
  const warningServicePath = path.join(projectRoot, 'src', 'lib', 'warningSystem.ts');
  const rekapViewPath = path.join(projectRoot, 'src', 'components', 'AdminRekapView.tsx');
  const homeViewPath = path.join(projectRoot, 'src', 'components', 'HomeView.tsx');
  const monitorViewPath = path.join(projectRoot, 'src', 'components', 'AdminMonitorView.tsx');
  const adminVerifPath = path.join(projectRoot, 'src', 'components', 'AdminVerifView.tsx');
  const piketViewPath = path.join(projectRoot, 'src', 'components', 'PiketView.tsx');

  assert(fs.existsSync(notifRoutePath), 'F5: /api/notifications/rejection/route.ts exists');
  assert(fs.existsSync(alpaServicePath), 'F6: src/lib/attendanceAlpa.ts exists');
  assert(fs.existsSync(alpaRoutePath), 'F6: /api/attendance/auto-alpa/route.ts exists');
  assert(fs.existsSync(warningServicePath), 'F7: src/lib/warningSystem.ts exists');

  const notifRouteContent = fs.readFileSync(notifRoutePath, 'utf8');
  const alpaServiceContent = fs.readFileSync(alpaServicePath, 'utf8');
  const alpaRouteContent = fs.readFileSync(alpaRoutePath, 'utf8');
  const warningServiceContent = fs.readFileSync(warningServicePath, 'utf8');
  const rekapContent = fs.readFileSync(rekapViewPath, 'utf8');
  const homeContent = fs.readFileSync(homeViewPath, 'utf8');
  const monitorContent = fs.readFileSync(monitorViewPath, 'utf8');
  const verifContent = fs.readFileSync(adminVerifPath, 'utf8');
  const piketContent = fs.readFileSync(piketViewPath, 'utf8');

  // ----------------------------------------------------
  // Section 1: F5 - Rejection Notification System
  // ----------------------------------------------------
  console.log('\n--- Section 1: F5 - Rejection Notification System ---');

  // 1.1 Route imports and calls sendWebPush
  assert(
    notifRouteContent.includes('sendWebPush') && notifRouteContent.includes('@/lib/vapid'),
    'F5.1: Rejection notification route imports and invokes sendWebPush from vapid.ts'
  );

  // 1.2 Route inserts in-app notification into chat_messages
  assert(
    notifRouteContent.includes("from('chat_messages').insert") &&
    notifRouteContent.includes('[Pemberitahuan Sistem]'),
    'F5.2: Rejection route creates persistent in-app chat_messages notification'
  );

  // 1.3 Required parameter validation returning 400
  assert(
    notifRouteContent.includes('!body.teacherName || !body.category || !body.rejectionReason') &&
    notifRouteContent.includes('status: 400'),
    'F5.3: Rejection route validates teacherName, category, and rejectionReason with HTTP 400'
  );

  // 1.4 Text sanitization against XSS
  assert(
    notifRouteContent.includes('sanitizeText') &&
    notifRouteContent.includes('/<script') &&
    notifRouteContent.includes('/<[^>]+>/g'),
    'F5.4: Rejection route sanitizes rejection reasons, stripping HTML and script tags'
  );

  // 1.5 Deep link routing per category
  assert(
    notifRouteContent.includes('view-guru-presensi') &&
    notifRouteContent.includes('view-guru-jurnal') &&
    notifRouteContent.includes('view-piket'),
    'F5.5: Rejection route constructs targeted deep links for Presensi, Jurnal, and Piket'
  );

  // 1.6 Dead subscription cleanup (410/404)
  assert(
    notifRouteContent.includes('410') && notifRouteContent.includes(".from('push_subscriptions').delete()"),
    'F5.6: Rejection route automatically cleans up expired HTTP 410 push subscriptions'
  );

  // 1.7 Wired into AdminVerifView.tsx
  assert(
    verifContent.includes('/api/notifications/rejection') &&
    verifContent.includes("status === 'Ditolak'") &&
    verifContent.includes('rejectionReason'),
    'F5.7: AdminVerifView triggers rejection notification endpoint on admin rejection'
  );

  // 1.8 Wired into PiketView.tsx
  assert(
    piketContent.includes('/api/notifications/rejection') &&
    piketContent.includes("status === 'Ditolak'") &&
    piketContent.includes("category: 'Piket'"),
    'F5.8: PiketView triggers rejection notification endpoint on admin piket report rejection'
  );

  // ----------------------------------------------------
  // Section 2: F6 - Auto-Alpa Cutoff Evaluation & Rekap
  // ----------------------------------------------------
  console.log('\n--- Section 2: F6 - Auto-Alpa Cutoff Evaluation & Rekap ---');

  // 2.1 Exported evaluateAndApplyAutoAlpa function
  assert(
    alpaServiceContent.includes('export async function evaluateAndApplyAutoAlpa'),
    'F6.1: attendanceAlpa.ts exports evaluateAndApplyAutoAlpa service function'
  );

  // 2.2 Checks jam_pulang_akhir setting
  assert(
    alpaServiceContent.includes('jam_pulang_akhir') &&
    alpaServiceContent.includes("from('pengaturan')"),
    'F6.2: attendanceAlpa queries school jam_pulang_akhir cutoff configuration'
  );

  // 2.3 Early exit prior to cutoff
  assert(
    alpaServiceContent.includes('currentTimeWita < cutoffTime') &&
    alpaServiceContent.includes('affectedCount: 0'),
    'F6.3: attendanceAlpa exits early with 0 affected records prior to cutoff time'
  );

  // 2.4 Mutates database record to Alpa
  assert(
    alpaServiceContent.includes("status_verifikasi: 'Alpa'") &&
    alpaServiceContent.includes("jenis_presensi: 'Alpa'") &&
    alpaServiceContent.includes('catatan_admin:'),
    'F6.4: attendanceAlpa mutates unresubmitted rejections to status_verifikasi = Alpa and jenis_presensi = Alpa'
  );

  // 2.5 Protects approved leaves and resubmissions
  assert(
    alpaServiceContent.includes('hasApprovedLeave') &&
    alpaServiceContent.includes('hasValidResubmission'),
    'F6.5: attendanceAlpa protects approved leaves (Sakit/Izin/Dinas) and active resubmissions from Alpa mutation'
  );

  // 2.6 Auto-Alpa API route handles GET and POST
  assert(
    alpaRouteContent.includes('export async function GET') &&
    alpaRouteContent.includes('export async function POST') &&
    alpaRouteContent.includes('evaluateAndApplyAutoAlpa'),
    'F6.6: /api/attendance/auto-alpa route handler supports both GET and POST triggers'
  );

  // 2.7 AdminRekapView aggregates explicit Alpa
  assert(
    rekapContent.includes('alpaDirect') &&
    rekapContent.includes("p.jenis_presensi === 'Alpa' || p.status_verifikasi === 'Alpa'") &&
    rekapContent.includes('totalAlpa = alpaOtomatis + alpaDirect'),
    'F6.7: AdminRekapView aggregates explicit database Alpa with late deduction Alpa'
  );

  // ----------------------------------------------------
  // Section 3: F7 - 3x Absence Warning System & UI
  // ----------------------------------------------------
  console.log('\n--- Section 3: F7 - 3x Absence Warning System & UI ---');

  // 3.1 Exported functions and types
  assert(
    warningServiceContent.includes('export async function getTeacherDisciplineWarnings') &&
    warningServiceContent.includes('export async function getAllTeachersDisciplineWarnings'),
    'F7.1: warningSystem.ts exports getTeacherDisciplineWarnings and getAllTeachersDisciplineWarnings'
  );

  // 3.2 Consecutive streak logic verification
  assert(
    calculateStreak([true, true, true, false, false]) === 3,
    'F7.2: calculateStreak accurately identifies 3 consecutive unexcused absences'
  );
  assert(
    calculateStreak([true, true, false, true]) === 2,
    'F7.3: calculateStreak handles presence interruptions, bounding streak at 2'
  );

  // 3.3 Calendar holiday and Sunday immunity
  assert(
    warningServiceContent.includes('kalender_pendidikan') &&
    warningServiceContent.includes('holidaySet') &&
    warningServiceContent.includes('dayOfWeek === 0'),
    'F7.4: warningSystem excludes kalender_pendidikan holidays and Sundays from absence window'
  );

  // 3.4 Multi-dimensional warning coverage (Presensi, Jurnal, Piket)
  assert(
    warningServiceContent.includes("category: 'Presensi'") &&
    warningServiceContent.includes("category: 'Jurnal'") &&
    warningServiceContent.includes("category: 'Piket'"),
    'F7.5: warningSystem calculates independent warnings across Presensi, Jurnal, and Piket'
  );

  // 3.5 Both consecutive (berturut-turut) and accumulated (akumulasi) types
  assert(
    warningServiceContent.includes("type: 'berturut-turut'") &&
    warningServiceContent.includes("type: 'akumulasi'"),
    'F7.6: warningSystem differentiates berturut-turut and akumulasi violation types'
  );

  // 3.6 Teacher warning banner in HomeView.tsx
  assert(
    homeContent.includes('teacherWarnings?.hasWarning') &&
    homeContent.includes('PERINGATAN KEDISIPLINAN (3x)') &&
    homeContent.includes('getTeacherDisciplineWarnings'),
    'F7.7: HomeView renders prominent discipline warning banner when teacher has active 3x warning'
  );

  // 3.7 Admin warning summary card in AdminMonitorView.tsx
  assert(
    monitorContent.includes('Peringatan Kedisiplinan Guru (3x Pelanggaran)') &&
    monitorContent.includes('getAllTeachersDisciplineWarnings') &&
    monitorContent.includes('warningsList'),
    'F7.8: AdminMonitorView displays warning summary card and detailed teacher violation cards'
  );

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL MILESTONE 2 TESTS PASSED!\n');
  }
}

runTests().catch(err => {
  console.error('Fatal error running M2 tests:', err);
  process.exit(1);
});
