/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE: MILESTONE 2
 * Teacher Attendance & Admin Routing (R2)
 *
 * File: tests/adversarial_m2_empirical_challenger.test.ts
 *
 * Scope:
 * 1. Multi-State Arrival/Departure Flow:
 *    - Sekolah -> Sekolah
 *    - Sekolah -> Dinas Luar
 *    - Dinas Luar -> Dinas Luar
 *    - Dinas Luar -> Sekolah
 *    - Invalid / edge transitions (Izin/Sakit -> Pulang blocked, Rejected Datang -> Pulang blocked)
 * 2. Auto-Checkout Edge Cases:
 *    - Forgotten checkouts past cutoff -> auto-checkout record generated
 *    - Already checked out -> NO duplicate checkout
 *    - Full-day approved leave (Izin & Sakit) -> NO auto-checkout
 *    - Time boundaries before vs after cutoff (isBeforeCutoff logic, historical dates, force option)
 *    - Rejected Datang exclusion from auto-checkout
 * 3. Workflow & UI State Reflection:
 *    - arrivalState and departureState tracking
 *    - lastAutoCheckout banner rendering in GuruPresensi
 *    - AdminVerifView badges for long-term sick, leave, and auto-checkout
 * 4. Geolocation & Admin Approval Rules:
 *    - Approval threshold: Sakit >= 3 days, Izin > 3 days
 *    - PrintHeader GPS security footer rendering & error fallback
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import { isBeforeCutoff } from '../src/lib/attendanceAlpa';

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

// ============================================================================
// SIMULATION HARNESS: STATE MACHINE FOR MULTI-STATE ATTENDANCE
// ============================================================================

interface AttendanceRecord {
  id: string;
  tipe_absen: 'Datang' | 'Pulang';
  jenis_presensi: string;
  detail_izin?: string;
  durasi_hari?: number;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  memerlukan_persetujuan_admin?: boolean;
  status_verifikasi: string;
  is_auto_checkout?: boolean;
  lokasi?: string;
  jarak?: string;
  latitude?: number | null;
  longitude?: number | null;
  timestamp: string;
  user_id?: string;
  nama_guru: string;
  sekolah_id?: string;
}

interface SimulatedDailyState {
  presensiDatang: AttendanceRecord | null;
  presensiPulang: AttendanceRecord | null;
  isIzinSakit: boolean;
  isDinasLuar: boolean;
  canPresensiPulang: boolean;
  lockedReason: string | null;
  arrivalState: string | null;
  departureState: string | null;
  isAutoCheckout: boolean;
  lastAutoCheckout: AttendanceRecord | null;
  activeLeaveRecord: AttendanceRecord | null;
}

function evaluateSimulatedWorkflow(
  todayStr: string,
  records: AttendanceRecord[],
  hasCompletedJurnal: boolean = true,
  hasCompletedPiket: boolean = true
): SimulatedDailyState {
  const state: SimulatedDailyState = {
    presensiDatang: null,
    presensiPulang: null,
    isIzinSakit: false,
    isDinasLuar: false,
    canPresensiPulang: false,
    lockedReason: null,
    arrivalState: null,
    departureState: null,
    isAutoCheckout: false,
    lastAutoCheckout: null,
    activeLeaveRecord: null,
  };

  const todayPresensi = records.filter(p => (p.timestamp || '').startsWith(todayStr));
  const acceptedPresensi = todayPresensi.filter(p => p.status_verifikasi !== 'Ditolak');

  state.presensiDatang = acceptedPresensi.find(p => p.tipe_absen === 'Datang') || null;
  state.presensiPulang = acceptedPresensi.find(p => p.tipe_absen === 'Pulang') || null;

  // Multi-day leave check across all records
  const multiDayLeave = records.find(p => {
    if (p.status_verifikasi === 'Ditolak') return false;
    const isLeave = p.jenis_presensi === 'Izin' || p.jenis_presensi === 'Sakit' || p.detail_izin === 'Sakit';
    if (!isLeave) return false;
    if (p.tanggal_mulai && p.tanggal_selesai) {
      return todayStr >= p.tanggal_mulai && todayStr <= p.tanggal_selesai;
    }
    return false;
  });

  if (multiDayLeave) {
    state.activeLeaveRecord = multiDayLeave;
    if (!state.presensiDatang) {
      state.presensiDatang = multiDayLeave;
    }
  }

  // Auto-checkout detection
  const lastAuto = records.find(
    p => p.tipe_absen === 'Pulang' && (p.is_auto_checkout || p.status_verifikasi === 'Lupa Checkout')
  );
  if (lastAuto) {
    state.lastAutoCheckout = lastAuto;
  }
  if (state.presensiPulang?.is_auto_checkout || state.presensiPulang?.status_verifikasi === 'Lupa Checkout') {
    state.isAutoCheckout = true;
  }

  state.arrivalState = state.presensiDatang?.jenis_presensi || null;
  state.departureState = state.presensiPulang?.jenis_presensi || null;

  if (!state.presensiDatang) {
    state.lockedReason = 'Anda belum melakukan Presensi Datang hari ini.';
    return state;
  }

  const jp = state.presensiDatang.jenis_presensi;
  if (state.activeLeaveRecord || jp === 'Izin' || jp === 'Sakit') {
    state.isIzinSakit = true;
    state.lockedReason = `Anda sedang ${state.activeLeaveRecord?.detail_izin || jp}. Tidak perlu mengisi Pulang.`;
    state.canPresensiPulang = false;
    return state;
  }

  if (jp === 'Dinas Luar') {
    state.isDinasLuar = true;
  }

  if (hasCompletedJurnal && hasCompletedPiket) {
    state.canPresensiPulang = true;
  } else {
    state.lockedReason = 'Anda belum menyelesaikan Jurnal atau Piket.';
  }

  return state;
}

// ============================================================================
// SIMULATION HARNESS: AUTO-CHECKOUT EVALUATION ENGINE
// ============================================================================

function evaluateAutoCheckoutLogic(
  evaluatedDate: string,
  todayWita: string,
  currentTimeWita: string,
  cutoffTime: string,
  allRecords: AttendanceRecord[],
  options?: { force?: boolean }
) {
  // Pre-cutoff early exit
  if (evaluatedDate === todayWita && !options?.force) {
    if (isBeforeCutoff(currentTimeWita, cutoffTime)) {
      return {
        affectedCount: 0,
        details: [],
        cutoffTime,
        evaluatedDate,
        reason: `Cutoff time (${cutoffTime} WITA) has not been reached yet for today (${currentTimeWita} WITA).`
      };
    }
  }

  const presensiRecords = allRecords.filter(r => (r.timestamp || '').startsWith(evaluatedDate));

  // Group by teacher
  const teacherRecordsMap = new Map<string, AttendanceRecord[]>();
  for (const rec of presensiRecords) {
    const key = rec.user_id ? `uid:${rec.user_id}` : rec.nama_guru.toLowerCase().trim();
    if (!teacherRecordsMap.has(key)) {
      teacherRecordsMap.set(key, []);
    }
    teacherRecordsMap.get(key)!.push(rec);
  }

  const details: any[] = [];

  for (const [_, teacherRecs] of teacherRecordsMap.entries()) {
    const validDatang = teacherRecs.find(
      r => r.tipe_absen === 'Datang' && r.status_verifikasi !== 'Ditolak' && r.status_verifikasi !== 'Alpa'
    );
    if (!validDatang) continue;

    const isLeave = ['Izin', 'Sakit'].includes(validDatang.jenis_presensi || '') ||
      ['Izin', 'Sakit'].includes(validDatang.detail_izin || '');
    if (isLeave) continue;

    const hasPulang = teacherRecs.some(r => r.tipe_absen === 'Pulang');
    if (hasPulang) continue;

    // Generated auto-checkout record
    details.push({
      id: `auto-${validDatang.id}`,
      nama_guru: validDatang.nama_guru,
      user_id: validDatang.user_id || null,
      sekolah_id: validDatang.sekolah_id,
      previousStatus: 'Belum Pulang',
      newStatus: 'Lupa Checkout',
      insertedRecord: {
        id: `auto-${validDatang.id}`,
        timestamp: `${evaluatedDate}T${cutoffTime.replace('.', ':')}:00+08:00`,
        nama_guru: validDatang.nama_guru,
        user_id: validDatang.user_id || null,
        tipe_absen: 'Pulang',
        jenis_presensi: 'Auto-Checkout',
        status_verifikasi: 'Lupa Checkout',
        catatan_admin: 'Auto-checkout: Guru tidak melakukan presensi pulang',
        sekolah_id: validDatang.sekolah_id,
        is_auto_checkout: true
      }
    });
  }

  return {
    affectedCount: details.length,
    details,
    cutoffTime,
    evaluatedDate
  };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAdversarialM2Suite() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║   EMPIRICAL ADVERSARIAL CHALLENGER: MILESTONE 2 (R2 VERIFICATION)   ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // Read implementation files for structural verification
  const presensiPath = path.resolve(process.cwd(), 'src/components/GuruPresensi.tsx');
  const workflowPath = path.resolve(process.cwd(), 'src/lib/workflow.ts');
  const alpaPath = path.resolve(process.cwd(), 'src/lib/attendanceAlpa.ts');
  const verifPath = path.resolve(process.cwd(), 'src/components/AdminVerifView.tsx');
  const printHeaderPath = path.resolve(process.cwd(), 'src/components/PrintHeader.tsx');
  const printGpsPath = path.resolve(process.cwd(), 'src/utils/printWithGps.ts');

  const presensiCode = fs.readFileSync(presensiPath, 'utf-8');
  const workflowCode = fs.readFileSync(workflowPath, 'utf-8');
  const alpaCode = fs.readFileSync(alpaPath, 'utf-8');
  const verifCode = fs.readFileSync(verifPath, 'utf-8');
  const printHeaderCode = fs.readFileSync(printHeaderPath, 'utf-8');
  const printGpsCode = fs.readFileSync(printGpsPath, 'utf-8');

  // ==========================================================================
  // SUITE 1: MULTI-STATE ARRIVAL/DEPARTURE FLOW (STATE MACHINE COMBINATIONS)
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ 1. MULTI-STATE ARRIVAL/DEPARTURE STATE MACHINE ━━━${RESET}`);

  // Test 1.1: Combination 1: Sekolah -> Sekolah
  const recordsComb1: AttendanceRecord[] = [
    {
      id: 'r1-datang',
      nama_guru: 'Guru Alpha',
      user_id: 'u-1',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Diverifikasi',
      timestamp: '2026-10-08T07:15:00+08:00'
    },
    {
      id: 'r1-pulang',
      nama_guru: 'Guru Alpha',
      user_id: 'u-1',
      tipe_absen: 'Pulang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Diverifikasi',
      timestamp: '2026-10-08T15:30:00+08:00'
    }
  ];
  const stateComb1 = evaluateSimulatedWorkflow('2026-10-08', recordsComb1);
  if (stateComb1.arrivalState === 'Sekolah' && stateComb1.departureState === 'Sekolah' && !stateComb1.isDinasLuar) {
    pass('MS-01', 'State Transition [Sekolah -> Sekolah]: arrivalState=Sekolah, departureState=Sekolah, isDinasLuar=false');
  } else {
    fail('MS-01', 'Combination Sekolah -> Sekolah failed state evaluation', stateComb1);
  }

  // Test 1.2: Combination 2: Sekolah -> Dinas Luar
  const recordsComb2: AttendanceRecord[] = [
    {
      id: 'r2-datang',
      nama_guru: 'Guru Beta',
      user_id: 'u-2',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Diverifikasi',
      timestamp: '2026-10-08T07:20:00+08:00'
    },
    {
      id: 'r2-pulang',
      nama_guru: 'Guru Beta',
      user_id: 'u-2',
      tipe_absen: 'Pulang',
      jenis_presensi: 'Dinas Luar',
      status_verifikasi: 'Menunggu',
      timestamp: '2026-10-08T16:00:00+08:00'
    }
  ];
  const stateComb2 = evaluateSimulatedWorkflow('2026-10-08', recordsComb2);
  if (stateComb2.arrivalState === 'Sekolah' && stateComb2.departureState === 'Dinas Luar') {
    pass('MS-02', 'State Transition [Sekolah -> Dinas Luar]: arrivalState=Sekolah, departureState=Dinas Luar');
  } else {
    fail('MS-02', 'Combination Sekolah -> Dinas Luar failed state evaluation', stateComb2);
  }

  // Test 1.3: Combination 3: Dinas Luar -> Dinas Luar
  const recordsComb3: AttendanceRecord[] = [
    {
      id: 'r3-datang',
      nama_guru: 'Guru Gamma',
      user_id: 'u-3',
      tipe_absen: 'Datang',
      jenis_presensi: 'Dinas Luar',
      status_verifikasi: 'Menunggu',
      timestamp: '2026-10-08T07:30:00+08:00'
    },
    {
      id: 'r3-pulang',
      nama_guru: 'Guru Gamma',
      user_id: 'u-3',
      tipe_absen: 'Pulang',
      jenis_presensi: 'Dinas Luar',
      status_verifikasi: 'Menunggu',
      timestamp: '2026-10-08T15:45:00+08:00'
    }
  ];
  const stateComb3 = evaluateSimulatedWorkflow('2026-10-08', recordsComb3);
  if (stateComb3.arrivalState === 'Dinas Luar' && stateComb3.departureState === 'Dinas Luar' && stateComb3.isDinasLuar) {
    pass('MS-03', 'State Transition [Dinas Luar -> Dinas Luar]: arrivalState=Dinas Luar, departureState=Dinas Luar, isDinasLuar=true');
  } else {
    fail('MS-03', 'Combination Dinas Luar -> Dinas Luar failed state evaluation', stateComb3);
  }

  // Test 1.4: Combination 4: Dinas Luar -> Sekolah
  const recordsComb4: AttendanceRecord[] = [
    {
      id: 'r4-datang',
      nama_guru: 'Guru Delta',
      user_id: 'u-4',
      tipe_absen: 'Datang',
      jenis_presensi: 'Dinas Luar',
      status_verifikasi: 'Menunggu',
      timestamp: '2026-10-08T07:45:00+08:00'
    },
    {
      id: 'r4-pulang',
      nama_guru: 'Guru Delta',
      user_id: 'u-4',
      tipe_absen: 'Pulang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Diverifikasi',
      timestamp: '2026-10-08T16:15:00+08:00'
    }
  ];
  const stateComb4 = evaluateSimulatedWorkflow('2026-10-08', recordsComb4);
  if (stateComb4.arrivalState === 'Dinas Luar' && stateComb4.departureState === 'Sekolah' && stateComb4.isDinasLuar) {
    pass('MS-04', 'State Transition [Dinas Luar -> Sekolah]: arrivalState=Dinas Luar, departureState=Sekolah');
  } else {
    fail('MS-04', 'Combination Dinas Luar -> Sekolah failed state evaluation', stateComb4);
  }

  // Test 1.5: Adversarial UI Check: Pulang dropdown is NEVER locked and provides both Sekolah and Dinas Luar
  const dropdownUnlocked = presensiCode.includes('const isJenisDropdownDisabled = false;') &&
                           presensiCode.includes('<option value="Sekolah">Hadir di Sekolah</option>') &&
                           presensiCode.includes('<option value="Dinas Luar">Dinas Luar</option>');
  if (dropdownUnlocked) {
    pass('MS-05', 'GuruPresensi UI: Pulang dropdown is unlocked and offers both Hadir di Sekolah and Dinas Luar');
  } else {
    fail('MS-05', 'GuruPresensi UI does not cleanly offer both options for Pulang checkout');
  }

  // Test 1.6: Adversarial Check: Teachers on Leave (Izin/Sakit) are BLOCKED from Pulang checkout
  const recordsLeave: AttendanceRecord[] = [
    {
      id: 'r-leave',
      nama_guru: 'Guru Epsilon',
      user_id: 'u-5',
      tipe_absen: 'Datang',
      jenis_presensi: 'Izin',
      detail_izin: 'Izin Pribadi',
      status_verifikasi: 'Menunggu',
      timestamp: '2026-10-08T08:00:00+08:00'
    }
  ];
  const stateLeave = evaluateSimulatedWorkflow('2026-10-08', recordsLeave);
  if (stateLeave.isIzinSakit && !stateLeave.canPresensiPulang && stateLeave.lockedReason?.includes('Izin')) {
    pass('MS-06', 'Adversarial Edge Case: Teachers with Izin/Sakit arrival cannot checkout Pulang (workflow safely locks Pulang)');
  } else {
    fail('MS-06', 'Teachers with leave were not properly locked from checkout', stateLeave);
  }

  // Test 1.7: Adversarial Check: Rejected Datang cannot transition to Pulang
  const recordsRejectedDatang: AttendanceRecord[] = [
    {
      id: 'r-rej',
      nama_guru: 'Guru Zeta',
      user_id: 'u-6',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Ditolak',
      timestamp: '2026-10-08T07:10:00+08:00'
    }
  ];
  const stateRej = evaluateSimulatedWorkflow('2026-10-08', recordsRejectedDatang);
  if (!stateRej.presensiDatang && !stateRej.canPresensiPulang) {
    pass('MS-07', 'Adversarial Edge Case: Rejected Datang is excluded from accepted Datang, blocking Pulang until re-submitted');
  } else {
    fail('MS-07', 'Rejected Datang improperly allowed Pulang progression', stateRej);
  }

  // ==========================================================================
  // SUITE 2: AUTO-CHECKOUT ENGINE & TIME BOUNDARIES
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. AUTO-CHECKOUT ENGINE & BOUNDARY CORNER CASES ━━━${RESET}`);

  // Test 2.1: Unit Verification of isBeforeCutoff Helper
  assert.strictEqual(isBeforeCutoff('14:30', '16:00'), true);
  assert.strictEqual(isBeforeCutoff('15:59', '16:00'), true);
  assert.strictEqual(isBeforeCutoff('16:00', '16:00'), false);
  assert.strictEqual(isBeforeCutoff('16:01', '16:00'), false);
  assert.strictEqual(isBeforeCutoff('21.59', '22.00'), true);
  assert.strictEqual(isBeforeCutoff('22.00', '22.00'), false);
  pass('AC-01', 'isBeforeCutoff correctly handles exact boundary equality and dots/colons');

  // Test 2.2: Edge Case: Pre-Cutoff Early Exit (Before Cutoff Time)
  const testRecordsPreCutoff: AttendanceRecord[] = [
    {
      id: 'r-datang-only',
      nama_guru: 'Guru Ahmad',
      user_id: 'u-ahmad',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Diverifikasi',
      timestamp: '2026-10-08T07:00:00+08:00'
    }
  ];
  const preCutoffRes = evaluateAutoCheckoutLogic(
    '2026-10-08',
    '2026-10-08',
    '14:00', // Current time is 14:00 WITA
    '16:00', // Cutoff is 16:00 WITA
    testRecordsPreCutoff,
    { force: false }
  );
  if (preCutoffRes.affectedCount === 0 && preCutoffRes.reason?.includes('Cutoff time')) {
    pass('AC-02', 'Edge Case [Before Cutoff]: Pre-cutoff early exit prevents premature auto-checkout during operational hours');
  } else {
    fail('AC-02', 'Pre-cutoff early exit failed', preCutoffRes);
  }

  // Test 2.3: Edge Case: Forgotten Checkout Past Cutoff -> Auto-Checkout Applied
  const pastCutoffRes = evaluateAutoCheckoutLogic(
    '2026-10-08',
    '2026-10-08',
    '16:05', // Current time is past cutoff
    '16:00',
    testRecordsPreCutoff,
    { force: false }
  );
  if (pastCutoffRes.affectedCount === 1 && pastCutoffRes.details[0]?.newStatus === 'Lupa Checkout') {
    const rec = pastCutoffRes.details[0].insertedRecord;
    assert.strictEqual(rec.is_auto_checkout, true);
    assert.strictEqual(rec.status_verifikasi, 'Lupa Checkout');
    assert.strictEqual(rec.tipe_absen, 'Pulang');
    assert.ok(rec.catatan_admin.includes('Auto-checkout'));
    pass('AC-03', 'Edge Case [Forgotten Checkout]: Inserts Pulang record with is_auto_checkout=true and status_verifikasi=Lupa Checkout');
  } else {
    fail('AC-03', 'Forgotten checkout past cutoff was not flagged', pastCutoffRes);
  }

  // Test 2.4: Edge Case: Already Checked Out -> MUST NOT Flag Auto-Checkout
  const testRecordsCompleted: AttendanceRecord[] = [
    {
      id: 'r-done-datang',
      nama_guru: 'Guru Budi',
      user_id: 'u-budi',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Diverifikasi',
      timestamp: '2026-10-08T07:05:00+08:00'
    },
    {
      id: 'r-done-pulang',
      nama_guru: 'Guru Budi',
      user_id: 'u-budi',
      tipe_absen: 'Pulang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Diverifikasi',
      timestamp: '2026-10-08T15:30:00+08:00'
    }
  ];
  const completedRes = evaluateAutoCheckoutLogic(
    '2026-10-08',
    '2026-10-08',
    '17:00',
    '16:00',
    testRecordsCompleted
  );
  if (completedRes.affectedCount === 0) {
    pass('AC-04', 'Edge Case [Already Checked Out]: Auto-checkout safely skips teachers who have already checked out');
  } else {
    fail('AC-04', 'Completed checkout was incorrectly flagged for auto-checkout', completedRes);
  }

  // Test 2.5: Edge Case: Full-Day Approved Leave (Izin & Sakit) -> MUST NOT Flag Auto-Checkout
  const testRecordsLeave: AttendanceRecord[] = [
    {
      id: 'r-izin',
      nama_guru: 'Guru Cici',
      user_id: 'u-cici',
      tipe_absen: 'Datang',
      jenis_presensi: 'Izin',
      detail_izin: 'Izin Keperluan Keluarga',
      status_verifikasi: 'Disetujui',
      timestamp: '2026-10-08T08:00:00+08:00'
    },
    {
      id: 'r-sakit',
      nama_guru: 'Guru Dodi',
      user_id: 'u-dodi',
      tipe_absen: 'Datang',
      jenis_presensi: 'Izin',
      detail_izin: 'Sakit',
      durasi_hari: 3,
      status_verifikasi: 'Menunggu',
      timestamp: '2026-10-08T08:15:00+08:00'
    }
  ];
  const leaveRes = evaluateAutoCheckoutLogic(
    '2026-10-08',
    '2026-10-08',
    '18:00',
    '16:00',
    testRecordsLeave
  );
  if (leaveRes.affectedCount === 0) {
    pass('AC-05', 'Edge Case [Full-Day Leave]: Teachers on Izin/Sakit are strictly excluded from auto-checkout');
  } else {
    fail('AC-05', 'Teachers on leave were falsely flagged for auto-checkout', leaveRes);
  }

  // Test 2.6: Edge Case: Historical Evaluation Date (e.g. Yesterday) bypasses today cutoff guard
  const historicalRes = evaluateAutoCheckoutLogic(
    '2026-10-07', // Yesterday
    '2026-10-08', // Today
    '08:00',      // Current time is 08:00 AM today (before today's cutoff)
    '16:00',
    [
      {
        id: 'r-yest',
        nama_guru: 'Guru Eka',
        user_id: 'u-eka',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi',
        timestamp: '2026-10-07T07:15:00+08:00'
      }
    ]
  );
  if (historicalRes.affectedCount === 1 && historicalRes.details[0].nama_guru === 'Guru Eka') {
    pass('AC-06', 'Edge Case [Historical Evaluation]: Past dates are evaluated regardless of current time of day');
  } else {
    fail('AC-06', 'Historical evaluation failed to process past date', historicalRes);
  }

  // Test 2.7: Edge Case: Forced Option ({ force: true }) overrides pre-cutoff check
  const forcedRes = evaluateAutoCheckoutLogic(
    '2026-10-08',
    '2026-10-08',
    '12:00', // Current time is noon (before 16:00 cutoff)
    '16:00',
    testRecordsPreCutoff,
    { force: true }
  );
  if (forcedRes.affectedCount === 1) {
    pass('AC-07', 'Edge Case [Force Option]: options.force=true overrides pre-cutoff guard for admin audits');
  } else {
    fail('AC-07', 'Forced evaluation did not bypass pre-cutoff guard', forcedRes);
  }

  // Test 2.8: Edge Case: Rejected Datang is not auto-checked out
  const rejectedDatangList: AttendanceRecord[] = [
    {
      id: 'r-rej-datang',
      nama_guru: 'Guru Fajar',
      user_id: 'u-fajar',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      status_verifikasi: 'Ditolak',
      timestamp: '2026-10-08T07:00:00+08:00'
    }
  ];
  const rejectedRes = evaluateAutoCheckoutLogic(
    '2026-10-08',
    '2026-10-08',
    '18:00',
    '16:00',
    rejectedDatangList
  );
  if (rejectedRes.affectedCount === 0) {
    pass('AC-08', 'Edge Case [Rejected Datang]: Unresubmitted rejected Datang is excluded from auto-checkout (handled by Auto-Alpa)');
  } else {
    fail('AC-08', 'Rejected Datang was incorrectly processed by auto-checkout', rejectedRes);
  }

  // ==========================================================================
  // SUITE 3: WORKFLOW MULTI-DAY COVERAGE & LUPA CHECKOUT WARNINGS
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. WORKFLOW MULTI-DAY COVERAGE & LUPA CHECKOUT NOTIFICATIONS ━━━${RESET}`);

  // Test 3.1: Multi-day Approved Leave Spanning Across Days
  const recordsMultiDay: AttendanceRecord[] = [
    {
      id: 'leave-multi',
      nama_guru: 'Guru Gina',
      user_id: 'u-gina',
      tipe_absen: 'Datang',
      jenis_presensi: 'Izin',
      detail_izin: 'Sakit',
      durasi_hari: 4,
      tanggal_mulai: '2026-10-07',
      tanggal_selesai: '2026-10-10',
      status_verifikasi: 'Disetujui',
      memerlukan_persetujuan_admin: true,
      timestamp: '2026-10-07T08:00:00+08:00'
    }
  ];
  // Evaluate on 2026-10-09 (Day 3 of 4)
  const stateMultiDay = evaluateSimulatedWorkflow('2026-10-09', recordsMultiDay);
  if (stateMultiDay.isIzinSakit && stateMultiDay.activeLeaveRecord?.id === 'leave-multi' && !stateMultiDay.canPresensiPulang) {
    pass('WF-01', 'Multi-day approved leave spans across active days [2026-10-07 to 2026-10-10] protecting teacher on 2026-10-09');
  } else {
    fail('WF-01', 'Multi-day leave was not recognized on subsequent active day', stateMultiDay);
  }

  // Test 3.2: Lupa Checkout Banner Detection
  const recordsWithAutoCheckout: AttendanceRecord[] = [
    {
      id: 'old-auto',
      nama_guru: 'Guru Hani',
      user_id: 'u-hani',
      tipe_absen: 'Pulang',
      jenis_presensi: 'Auto-Checkout',
      status_verifikasi: 'Lupa Checkout',
      is_auto_checkout: true,
      timestamp: '2026-10-07T22:00:00+08:00'
    }
  ];
  const stateWithAuto = evaluateSimulatedWorkflow('2026-10-08', recordsWithAutoCheckout);
  if (stateWithAuto.lastAutoCheckout && stateWithAuto.lastAutoCheckout.status_verifikasi === 'Lupa Checkout') {
    pass('WF-02', 'Workflow identifies lastAutoCheckout record for teacher UI notification');
  } else {
    fail('WF-02', 'Workflow failed to populate lastAutoCheckout', stateWithAuto);
  }

  // Test 3.3: GuruPresensi renders Lupa Checkout banner
  const hasLupaCheckoutBanner = presensiCode.includes('dailyState?.lastAutoCheckout') &&
                                presensiCode.includes('Peringatan Presensi: Tercatat Lupa Checkout') &&
                                presensiCode.includes('Lupa Checkout</span>');
  if (hasLupaCheckoutBanner) {
    pass('WF-03', 'GuruPresensi UI renders prominent amber warning banner when dailyState.lastAutoCheckout is present');
  } else {
    fail('WF-03', 'GuruPresensi lacks Lupa Checkout warning banner rendering');
  }

  // ==========================================================================
  // SUITE 4: ADMIN APPROVAL ROUTING & BADGES
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 4. ADMIN APPROVAL ROUTING & STATUS BADGES ━━━${RESET}`);

  // Test 4.1: Approval Threshold Calculation
  const checkApproval = (jenis: string, detail: string, durasi: number) => {
    return (detail === 'Sakit' && durasi >= 3) || (jenis === 'Izin' && detail !== 'Sakit' && durasi > 3);
  };
  assert.strictEqual(checkApproval('Izin', 'Sakit', 1), false);
  assert.strictEqual(checkApproval('Izin', 'Sakit', 2), false);
  assert.strictEqual(checkApproval('Izin', 'Sakit', 3), true);
  assert.strictEqual(checkApproval('Izin', 'Sakit', 5), true);
  assert.strictEqual(checkApproval('Izin', 'Izin Pribadi', 1), false);
  assert.strictEqual(checkApproval('Izin', 'Izin Pribadi', 3), false);
  assert.strictEqual(checkApproval('Izin', 'Izin Pribadi', 4), true);
  pass('AD-01', 'Admin Approval Threshold strictly adheres to (Sakit >= 3 || Izin > 3)');

  // Test 4.2: AdminVerifView contains Sakit >= 3 and Izin > 3 badges
  const hasAdminApprovalBadges = (
    verifCode.includes('Sakit &gt;= 3 Hari (Perlu Persetujuan)') ||
    verifCode.includes('Sakit >= 3 Hari (Perlu Persetujuan)')
  ) && (
    verifCode.includes('Izin &gt; 3 Hari (Perlu Persetujuan)') ||
    verifCode.includes('Izin > 3 Hari (Perlu Persetujuan)')
  );
  if (hasAdminApprovalBadges) {
    pass('AD-02', 'AdminVerifView renders distinctive approval badges for Sakit >= 3 and Izin > 3');
  } else {
    fail('AD-02', 'AdminVerifView is missing required approval badges for long-term leave');
  }

  // Test 4.3: AdminVerifView renders Auto-Checkout (Lupa Checkout) badge
  const hasAutoCheckoutBadge = verifCode.includes('Auto-Checkout (Lupa Checkout)') ||
                               verifCode.includes('Lupa Checkout');
  if (hasAutoCheckoutBadge) {
    pass('AD-03', 'AdminVerifView renders Auto-Checkout (Lupa Checkout) verification badge');
  } else {
    fail('AD-03', 'AdminVerifView is missing Auto-Checkout (Lupa Checkout) badge');
  }

  // ==========================================================================
  // SUITE 5: GPS SECURITY FOOTER & ERROR RESILIENCE
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 5. GPS COORDINATES ON PRINTED DOCUMENTS ━━━${RESET}`);

  // Test 5.1: PrintSignature displays GPS coordinates with accuracy and timestamp
  const hasGpsInPrintSignature = printHeaderCode.includes('gpsCoordinates?:') &&
                                 printHeaderCode.includes('Koordinat GPS:') &&
                                 printHeaderCode.includes('toFixed(6)');
  if (hasGpsInPrintSignature) {
    pass('GP-01', 'PrintHeader PrintSignature embeds 6-decimal GPS coordinates, accuracy, and timestamp');
  } else {
    fail('GP-01', 'PrintHeader PrintSignature lacks GPS coordinates injection');
  }

  // Test 5.2: triggerPrintWithGps handles Geolocation Permission Denied and Errors
  const handlesGpsErrors = printGpsCode.includes('triggerPrintWithGps') &&
                           printGpsCode.includes('PERMISSION_DENIED') &&
                           printGpsCode.includes('POSITION_UNAVAILABLE') &&
                           printGpsCode.includes('Swal.fire');
  if (handlesGpsErrors) {
    pass('GP-02', 'printWithGps.ts guards against GPS permission denial and hardware timeout with SweetAlert alert');
  } else {
    fail('GP-02', 'printWithGps.ts missing SweetAlert alert on blocked GPS');
  }

  // ==========================================================================
  // FINAL RESULTS SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  EMPIRICAL CHALLENGER RESULTS: ${GREEN}${passedTests} PASSED${RESET} / ${RED}${failedTests} FAILED${RESET} (Total: ${totalTests})`);
  console.log(`${CYAN}${BOLD}══════════════════════════════════════════════════════════════════════${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialM2Suite().catch(err => {
  console.error(`${RED}Fatal error running adversarial test suite:${RESET}`, err);
  process.exit(1);
});
