import dotenv from 'dotenv';
import path from 'path';
import { NextRequest } from 'next/server';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
}

import { calculateStreak } from '../src/lib/warningSystem';
import { getWitaDateStr, getWitaTimeStr, getWitaStartOfDay, getWitaEndOfDay } from '../src/lib/wita';
import { POST as rejectionPostHandler } from '../src/app/api/notifications/rejection/route';

let passCount = 0;
let failCount = 0;
const findings: { id: string; title: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; detail: string }[] = [];

function check(id: string, description: string, condition: boolean, failSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', failExplanation?: string) {
  if (condition) {
    console.log(`  [PASS] ${id}: ${description}`);
    passCount++;
  } else {
    console.log(`  [FAIL] ${id}: ${description}`);
    failCount++;
    if (failSeverity && failExplanation) {
      findings.push({
        id,
        title: description,
        severity: failSeverity,
        detail: failExplanation
      });
    }
  }
}

async function runAdversarialSuite() {
  console.log('================================================================');
  console.log('CHALLENGER M2.1: ADVERSARIAL STRESS TEST SUITE (EMPIRICAL)');
  console.log('================================================================\n');

  // ============================================================================
  // SUITE 1: WARNING SYSTEM (calculateStreak & Date/Timezone Evaluation Engine)
  // ============================================================================
  console.log('--- SUITE 1: Warning System Engine & Timezone Boundaries ---');

  // 1.1 calculateStreak Oracle tests
  check('WS-1.1', 'Empty history returns 0 streak', calculateStreak([]) === 0);
  check('WS-1.2', 'All present returns 0 streak', calculateStreak([false, false, false, false, false]) === 0);
  check('WS-1.3', 'All absent returns exact count streak', calculateStreak([true, true, true, true]) === 4);
  check('WS-1.4', 'Intermittent absences [T, F, T, F, T] bounded at 1', calculateStreak([true, false, true, false, true]) === 1);
  check('WS-1.5', 'Two absences bounded at 2 [T, T, F, T]', calculateStreak([true, true, false, true]) === 2);
  check('WS-1.6', '3 consecutive absences in middle [F, T, T, T, F] yields 3', calculateStreak([false, true, true, true, false]) === 3);
  check('WS-1.7', 'Multiple streaks [T, T, T, F, T, T, T, T] yields max streak (4)', calculateStreak([true, true, true, false, true, true, true, true]) === 4);
  check('WS-1.8', 'Single day absence [T] yields 1', calculateStreak([true]) === 1);
  
  // Performance & stress on large array
  const largeHistory = new Array(50000).fill(false);
  largeHistory[1000] = true;
  largeHistory[1001] = true;
  largeHistory[1002] = true;
  const startPerf = Date.now();
  const perfStreak = calculateStreak(largeHistory);
  const duration = Date.now() - startPerf;
  check('WS-1.9', 'Large 50,000 array stress test completes in < 50ms', duration < 50 && perfStreak === 3);

  // 1.2 Timezone & Evaluation Window Simulation in warningSystem.ts (lines 125-143)
  const testWitaToday = '2026-09-24'; // Thursday in WITA
  const dateObj = new Date(testWitaToday + 'T00:00:00+08:00');
  
  const evaluatedDaysSim: { i: number; dateStr: string; dayOfWeek: number; dayName: string; skippedAsSunday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getUTCDay();
    const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long' });
    evaluatedDaysSim.push({
      i,
      dateStr,
      dayOfWeek,
      dayName,
      skippedAsSunday: dayOfWeek === 0
    });
  }

  // Check today's dateStr for i=0
  const todayEntry = evaluatedDaysSim.find(e => e.i === 0)!;
  check(
    'WS-2.1',
    `Evaluation window for today (i=0) should yield dateStr === '${testWitaToday}'`,
    todayEntry.dateStr === testWitaToday,
    'CRITICAL',
    `dateStr for today is '${todayEntry.dateStr}' instead of '${testWitaToday}' because d.toISOString() formats in UTC (16:00 previous day). This causes a 1-day date shift across all evaluations.`
  );

  // Check Monday handling (Senin)
  const mondayEntry = evaluatedDaysSim.find(e => e.dayName === 'Senin')!;
  check(
    'WS-2.2',
    'Monday (Senin) should NOT be skipped as Sunday',
    !mondayEntry.skippedAsSunday,
    'CRITICAL',
    `Monday (Senin) is skipped because d.getUTCDay() evaluates to 0 (Sunday in UTC), causing warningSystem to skip every Monday school day.`
  );

  // Check Sunday handling (Minggu)
  const sundayEntry = evaluatedDaysSim.find(e => e.dayName === 'Minggu')!;
  check(
    'WS-2.3',
    'Sunday (Minggu) SHOULD be excluded as dayOfWeek === 0',
    sundayEntry.dayOfWeek === 0,
    'CRITICAL',
    `Sunday (Minggu) has d.getUTCDay() === 6 (Saturday in UTC). As a result, Sunday is NOT skipped by 'dayOfWeek === 0' and is treated as an active school day.`
  );

  // Check date alignment between dateStr and dayName
  const kamisEntry = evaluatedDaysSim.find(e => e.dayName === 'Kamis')!;
  check(
    'WS-2.4',
    `When dayName is 'Kamis', dateStr must match the calendar Thursday ('2026-09-24')`,
    kamisEntry.dateStr === '2026-09-24',
    'CRITICAL',
    `When dayName is 'Kamis', dateStr is '${kamisEntry.dateStr}'. Attendance/journal queries search for Wednesday records against Thursday schedules.`
  );


  // ============================================================================
  // SUITE 2: AUTO-ALPA CUTOFF TIMEZONE & BOUNDARY CONDITIONS
  // ============================================================================
  console.log('\n--- SUITE 2: Auto-Alpa Cutoff Time & Boundary Conditions ---');

  const sampleWitaTime = getWitaTimeStr();
  console.log(`  [INFO] Current getWitaTimeStr() output: "${sampleWitaTime}"`);

  // Test string comparison bug:
  // getWitaTimeStr() uses id-ID locale -> outputs HH.MM (with dot '.')
  // Cutoff in pengaturan / HTML5 time input uses HH:MM (with colon ':')
  const cutoffColon = '15:00';
  const time30MinAfterCutoff = '15.30'; // 15:30 in id-ID format
  const time1MinAfterCutoff = '15.01';  // 15:01 in id-ID format
  const timeExactCutoff = '15.00';      // 15:00 in id-ID format
  const time1MinBeforeCutoff = '14.59'; // 14:59 in id-ID format

  const isBeforeAt1MinBefore = time1MinBeforeCutoff < cutoffColon;
  const isBeforeAtExact = timeExactCutoff < cutoffColon;
  const isBeforeAt1MinAfter = time1MinAfterCutoff < cutoffColon;
  const isBeforeAt30MinAfter = time30MinAfterCutoff < cutoffColon;

  check('AA-1.1', '1 min before cutoff (14:59 vs 15:00) should correctly detect cutoff not reached', isBeforeAt1MinBefore === true);
  check(
    'AA-1.2',
    'Exactly at cutoff (15:00 vs 15:00) should NOT evaluate as strictly before cutoff',
    isBeforeAtExact === false,
    'HIGH',
    `'15.00' < '15:00' evaluates to TRUE in JavaScript because '.' (ASCII 46) < ':' (ASCII 58). Auto-alpa will refuse to run at cutoff time.`
  );
  check(
    'AA-1.3',
    '1 min after cutoff (15:01 vs 15:00) should evaluate cutoff as reached (isBefore === false)',
    isBeforeAt1MinAfter === false,
    'HIGH',
    `'15.01' < '15:00' evaluates to TRUE in JavaScript. Auto-alpa fails to trigger 1 minute after cutoff.`
  );
  check(
    'AA-1.4',
    '30 min after cutoff (15:30 vs 15:00) should evaluate cutoff as reached (isBefore === false)',
    isBeforeAt30MinAfter === false,
    'HIGH',
    `'15.30' < '15:00' evaluates to TRUE in JavaScript. For the entire hour following cutoff, auto-alpa fails to execute.`
  );

  // 2.2 Date bounding check in attendanceAlpa.ts (unbounded query simulation)
  const testDate = '2026-09-20';
  const multiDayTeacherRecords = [
    { id: 'rec-1', nama_guru: 'Budi', timestamp: '2026-09-20T08:00:00+08:00', tipe_absen: 'Datang', status_verifikasi: 'Ditolak', jenis_presensi: 'Sekolah' },
    { id: 'rec-2', nama_guru: 'Budi', timestamp: '2026-09-21T08:00:00+08:00', tipe_absen: 'Datang', status_verifikasi: 'Disetujui', jenis_presensi: 'Sekolah' }
  ];

  const unboundedResubmissionCheck = multiDayTeacherRecords.some(
    r => r.tipe_absen === 'Datang' && r.status_verifikasi !== 'Ditolak' && r.status_verifikasi !== 'Alpa'
  );
  const dateBoundedRecords = multiDayTeacherRecords.filter(r => r.timestamp.startsWith(testDate));
  const boundedResubmissionCheck = dateBoundedRecords.some(
    r => r.tipe_absen === 'Datang' && r.status_verifikasi !== 'Ditolak' && r.status_verifikasi !== 'Alpa'
  );

  check(
    'AA-2.1',
    'Evaluating past date must not consider subsequent days presence as valid resubmission',
    unboundedResubmissionCheck === boundedResubmissionCheck,
    'MEDIUM',
    `Because attendanceAlpa query has no upper bound (lte endOfDay), presence on subsequent days (rec-2) causes hasValidResubmission to be true for past rejected records (rec-1).`
  );


  // ============================================================================
  // SUITE 3: REJECTION NOTIFICATION (Malicious Payloads & Edge Cases)
  // ============================================================================
  console.log('\n--- SUITE 3: Rejection Notification Route Edge Cases ---');

  // Test live NextRequest to rejectionPostHandler with malformed / adversarial payloads
  // 3.1 Non-string teacherName
  try {
    const reqNonStringName = new NextRequest('http://localhost:3000/api/notifications/rejection', {
      method: 'POST',
      body: JSON.stringify({
        teacherName: 12345,
        category: 'Presensi',
        rejectionReason: 'Foto buram'
      })
    });
    const res = await rejectionPostHandler(reqNonStringName);
    check(
      'RN-1.1',
      'Non-string teacherName (12345) should return HTTP 400 Bad Request, not HTTP 500',
      res.status === 400,
      'MEDIUM',
      `Endpoint returned HTTP ${res.status}. Body validation does not verify typeof teacherName === 'string', crashing with TypeError: body.teacherName.trim is not a function.`
    );
  } catch (err: any) {
    check('RN-1.1', 'Non-string teacherName threw unhandled exception', false, 'MEDIUM', err.message);
  }

  // 3.2 Non-string rejectionReason
  try {
    const reqNonStringReason = new NextRequest('http://localhost:3000/api/notifications/rejection', {
      method: 'POST',
      body: JSON.stringify({
        teacherName: 'Budi Santoso',
        category: 'Presensi',
        rejectionReason: 99999
      })
    });
    const res = await rejectionPostHandler(reqNonStringReason);
    check(
      'RN-1.2',
      'Non-string rejectionReason (99999) should return HTTP 400 Bad Request, not HTTP 500',
      res.status === 400,
      'MEDIUM',
      `Endpoint returned HTTP ${res.status}. sanitizeText(str) calls str.replace without string type check, resulting in TypeError and HTTP 500.`
    );
  } catch (err: any) {
    check('RN-1.2', 'Non-string rejectionReason threw unhandled exception', false, 'MEDIUM', err.message);
  }

  // 3.3 Whitespace-only teacherName
  try {
    const reqWhitespace = new NextRequest('http://localhost:3000/api/notifications/rejection', {
      method: 'POST',
      body: JSON.stringify({
        teacherName: '   ',
        category: 'Presensi',
        rejectionReason: 'Foto buram'
      })
    });
    const res = await rejectionPostHandler(reqWhitespace);
    check(
      'RN-1.3',
      'Whitespace-only teacherName ("   ") should return HTTP 400 Bad Request',
      res.status === 400,
      'LOW',
      `Endpoint returned HTTP ${res.status}. Check '!body.teacherName' allows whitespace string, passing empty string to Supabase queries.`
    );
  } catch (err: any) {
    check('RN-1.3', 'Whitespace-only teacherName threw unhandled exception', false, 'LOW', err.message);
  }

  // 3.4 XSS sanitization
  try {
    const reqXss = new NextRequest('http://localhost:3000/api/notifications/rejection', {
      method: 'POST',
      body: JSON.stringify({
        teacherName: 'Budi Santoso',
        category: 'Presensi',
        rejectionReason: '<script>alert("XSS")</script>Foto tidak sesuai lokasi'
      })
    });
    const res = await rejectionPostHandler(reqXss);
    const json = await res.json();
    check('RN-1.4', 'XSS payload in rejectionReason is handled cleanly', res.status === 200 && json.success === true);
  } catch (err: any) {
    check('RN-1.4', 'XSS payload threw unhandled exception', false, 'LOW', err.message);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log(`TOTAL FINDINGS: ${findings.length}`);
  console.log('================================================================\n');

  if (findings.length > 0) {
    console.log('CHALLENGER FINDINGS:');
    findings.forEach(f => {
      console.log(`[${f.severity}] ${f.id}: ${f.title}`);
      console.log(`   -> ${f.detail}\n`);
    });
  }

  return { passCount, failCount, findings };
}

runAdversarialSuite().then(res => {
  if (res.findings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')) {
    console.error('❌ ADVERSARIAL STRESS TEST IDENTIFIED CRITICAL/HIGH BUGS!');
    process.exit(1);
  } else {
    console.log('✅ ALL STRESS TESTS PASSED!');
    process.exit(0);
  }
}).catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
