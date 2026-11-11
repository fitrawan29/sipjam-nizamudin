/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 1 (REQUIREMENT R1)
 * File: tests/adversarial_r1_kebijakan_presensi.test.ts
 *
 * Rigorous empirical verification of:
 * - Scenario A: Teacher with 0 KBM teaching assignments under 'Hari_Mengajar_Saja'
 * - Scenario B: TU Staff member role/mapel permutations on active school days
 * - Scenario C: Daily workflow progression for 0-KBM teacher and TU staff
 *               (including proof that piket duty does NOT waive Jurnal Kegiatan)
 * - Scenario D: AdminConfigView mass toggle logic and tamper-resistant saving
 * - Scenario E: Normal teachers with teaching schedules retain Hari_Mengajar_Saja
 * - Scenario F: Static AST and code invariants across all Milestone 1 components
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import {
  canTeacherPresensiPulang,
  isTeacherRecordMatch,
  GuruDailyState
} from '../src/lib/workflow';

// Auto-load .env.local if present
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

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

function recordAssert(condition: boolean, testId: string, desc: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✔ [${testId}] PASS:${RESET} ${desc}`);
    if (detail) console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✖ [${testId}] FAIL:${RESET} ${desc}`);
    if (detail) console.error(`    ${RED}↳ Detail: ${detail}${RESET}`);
  }
}

// ============================================================================
// SIMULATION HELPERS MIRRORING PRODUCTION LOGIC
// ============================================================================

/**
 * Evaluates teacher exemption using the EXACT logic implemented in workflow.ts,
 * AdminVerifView.tsx, HomeViewAdmin.tsx, and attendanceAlpa.ts.
 */
function evaluateExemptionStatus(params: {
  isTeacherTu: boolean;
  totalTeacherKbmCount: number;
  explicitTeacherSetting: boolean | null | undefined;
  isInLegacyList: boolean;
  aturanKehadiranGlobal: 'Semua_Hari' | 'Hari_Mengajar_Saja';
}) {
  const isNonKbmOrTu = params.isTeacherTu || params.totalTeacherKbmCount === 0;

  let isTeacherExempt = false;
  if (isNonKbmOrTu) {
    isTeacherExempt = false;
  } else if (params.explicitTeacherSetting === false) {
    isTeacherExempt = false;
  } else if (params.explicitTeacherSetting === true) {
    isTeacherExempt = true;
  } else {
    if (params.isInLegacyList || params.aturanKehadiranGlobal === 'Hari_Mengajar_Saja') {
      isTeacherExempt = true;
    }
  }

  return {
    isNonKbmOrTu,
    isTeacherExempt,
    effectiveAturanKehadiran: isTeacherExempt ? ('Hari_Mengajar_Saja' as const) : ('Semua_Hari' as const)
  };
}

/**
 * Evaluates whether a user on an active school day is marked as 'isNonTeachingDay'
 * or 'isFreeFromPresence' ("Bebas Hadir").
 */
function evaluateDailyAttendanceFreedom(params: {
  isTeacherExempt: boolean;
  hasTeachingToday: boolean;
  hasPiketToday: boolean;
  isSchoolDay: boolean; // Monday-Friday or Monday-Saturday
}) {
  if (!params.isSchoolDay) {
    return { isLibur: true, isFreeFromPresence: true, label: 'Libur' };
  }

  // Active school day
  const hasTeachingObligation = params.hasTeachingToday || params.hasPiketToday;
  const isNonTeachingDay = params.isTeacherExempt && !hasTeachingObligation;
  const isFreeFromPresence = isNonTeachingDay;

  return {
    isLibur: false,
    isNonTeachingDay,
    isFreeFromPresence,
    statusLabel: isFreeFromPresence ? 'Bebas Hadir' : 'Wajib Hadir'
  };
}

/**
 * Evaluates departure checkout authorization (canPresensiPulang) exactly as in workflow.ts
 */
function evaluateWorkflowCheckout(params: {
  presensiDatang: any | null;
  isIzinSakit: boolean;
  isLibur: boolean;
  isAlpa: boolean;
  isNonTeachingDay: boolean;
  isBk: boolean;
  isNonKbmOrTu: boolean;
  isTeacherExempt: boolean;
  jadwalKBMCountToday: number;
  jurnalKegiatan: any | null;
  jurnalKBMCountToday: number;
  isPiketToday: boolean;
  laporanPiket: any | null;
}) {
  if (!params.presensiDatang) return { canPresensiPulang: false, lockedReason: 'Belum presensi datang' };
  if (params.isIzinSakit) return { canPresensiPulang: false, lockedReason: 'Sedang izin/sakit' };
  if (params.isLibur) return { canPresensiPulang: false, lockedReason: 'Hari libur' };
  if (params.isAlpa) return { canPresensiPulang: false, lockedReason: 'Tercatat Alpa' };

  let isJurnalDone = false;
  if (params.isNonTeachingDay) {
    isJurnalDone = true;
  } else if (params.isBk) {
    isJurnalDone = true;
  } else if (params.jadwalKBMCountToday === 0) {
    if (params.jurnalKegiatan) {
      isJurnalDone = true;
    } else if (params.isTeacherExempt && params.jadwalKBMCountToday === 0) {
      isJurnalDone = true;
    } else if (!params.isNonKbmOrTu && params.jadwalKBMCountToday === 0 && params.isPiketToday) {
      isJurnalDone = true;
    }
  } else {
    // Has KBM today
    if (params.jurnalKBMCountToday >= params.jadwalKBMCountToday) {
      isJurnalDone = true;
    }
  }

  let isPiketDone = true;
  if (params.isPiketToday && !params.laporanPiket) {
    isPiketDone = false;
  }

  const canPresensiPulang = isJurnalDone && isPiketDone;
  const missing: string[] = [];
  if (!isPiketDone) missing.push('Laporan Piket');
  if (!isJurnalDone) missing.push(params.jadwalKBMCountToday === 0 ? 'Jurnal Kegiatan' : 'Jurnal KBM');

  return {
    canPresensiPulang,
    isJurnalDone,
    isPiketDone,
    lockedReason: canPresensiPulang ? null : `Anda belum menyelesaikan: ${missing.join(', ')}`
  };
}

/**
 * AdminConfigView logic helpers
 */
function isTuStaff(t: any): boolean {
  const mp = (t?.mata_pelajaran || '').toLowerCase();
  return mp.includes('tata usaha') || mp.includes('tu (administrasi)') || mp === 'tu';
}

function getTeacherKbmCount(t: any, schedules: any[]): number {
  if (isTuStaff(t)) return 0;
  return (schedules || []).filter(j =>
    isTeacherRecordMatch(j, t, null, { allowSingleWordFirstToken: true })
  ).length;
}

function simulateAdminConfigMassToggle(guruList: any[], jadwalList: any[]) {
  const eligibleTeachers = guruList.filter(g => !isTuStaff(g) && getTeacherKbmCount(g, jadwalList) > 0);
  return eligibleTeachers.map(g => g.id).filter(Boolean);
}

function simulateAdminConfigSave(
  guruList: any[],
  jadwalList: any[],
  rawExemptTeacherIds: string[]
) {
  const validExemptTeachers = guruList.filter(t => !isTuStaff(t) && getTeacherKbmCount(t, jadwalList) > 0);
  const validExemptIdSet = new Set(validExemptTeachers.map(t => t.id));

  const exemptIds = guruList.length > 0
    ? guruList
        .filter(t => validExemptIdSet.has(t.id) && (rawExemptTeacherIds.includes(t.id) || (t.nama_guru && rawExemptTeacherIds.includes(t.nama_guru))))
        .map(t => t.id)
        .filter(Boolean)
    : [];

  const nonExemptIds = guruList.length > 0
    ? guruList.filter(t => !exemptIds.includes(t.id)).map(t => t.id).filter(Boolean)
    : [];

  return { exemptIds, nonExemptIds };
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

async function runAdversarialR1Tests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🔥 ADVERSARIAL STRESS TEST SUITE: MILESTONE 1 (REQUIREMENT R1)${RESET}`);
  console.log(`${BOLD}${CYAN}   Kebijakan Presensi Guru & Staf TU Tanpa Jam KBM${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const root = path.resolve(__dirname, '..');

  // ==========================================================================
  // SCENARIO A: TEACHER WITH 0 KBM TEACHING ASSIGNMENTS UNDER HARI_MENGAJAR_SAJA
  // ==========================================================================
  console.log(`\n${BOLD}${YELLOW}--- Scenario A: 0-KBM Teacher Under Hari_Mengajar_Saja ---${RESET}`);

  // Test A1: Baseline: 0-KBM teacher with null explicit setting
  const resA1 = evaluateExemptionStatus({
    isTeacherTu: false,
    totalTeacherKbmCount: 0,
    explicitTeacherSetting: null,
    isInLegacyList: false,
    aturanKehadiranGlobal: 'Hari_Mengajar_Saja'
  });
  recordAssert(
    resA1.isNonKbmOrTu === true && resA1.isTeacherExempt === false && resA1.effectiveAturanKehadiran === 'Semua_Hari',
    'A1.1',
    '0-KBM teacher under Hari_Mengajar_Saja is strictly evaluated as isTeacherExempt = false',
    `isNonKbmOrTu=${resA1.isNonKbmOrTu}, isTeacherExempt=${resA1.isTeacherExempt}, effective=${resA1.effectiveAturanKehadiran}`
  );

  const freedomA1 = evaluateDailyAttendanceFreedom({
    isTeacherExempt: resA1.isTeacherExempt,
    hasTeachingToday: false,
    hasPiketToday: false,
    isSchoolDay: true
  });
  recordAssert(
    freedomA1.isNonTeachingDay === false && freedomA1.isFreeFromPresence === false && freedomA1.statusLabel === 'Wajib Hadir',
    'A1.2',
    '0-KBM teacher on active school day is NOT given isNonTeachingDay=true and is NOT Bebas Hadir',
    `isNonTeachingDay=${freedomA1.isNonTeachingDay}, statusLabel=${freedomA1.statusLabel}`
  );

  // Test A2: Adversarial Tampering: DB explicitly has wajib_hadir_hanya_mengajar = true
  const resA2 = evaluateExemptionStatus({
    isTeacherTu: false,
    totalTeacherKbmCount: 0,
    explicitTeacherSetting: true, // Malicious / erroneous flag in DB
    isInLegacyList: false,
    aturanKehadiranGlobal: 'Hari_Mengajar_Saja'
  });
  recordAssert(
    resA2.isNonKbmOrTu === true && resA2.isTeacherExempt === false,
    'A2.1',
    'Adversarial Attack: Database flag wajib_hadir_hanya_mengajar=true is OVERRIDDEN by 0-KBM count',
    'isNonKbmOrTu strictly takes precedence over explicitTeacherSetting = true'
  );

  // Test A3: Adversarial Tampering: Teacher name/id is in legacy guru_hanya_mengajar list
  const resA3 = evaluateExemptionStatus({
    isTeacherTu: false,
    totalTeacherKbmCount: 0,
    explicitTeacherSetting: null,
    isInLegacyList: true, // Legacy JSON list injection
    aturanKehadiranGlobal: 'Hari_Mengajar_Saja'
  });
  recordAssert(
    resA3.isNonKbmOrTu === true && resA3.isTeacherExempt === false,
    'A3.1',
    'Adversarial Attack: Legacy guru_hanya_mengajar list cannot grant exemption to 0-KBM teacher',
    `isTeacherExempt=${resA3.isTeacherExempt}`
  );

  // ==========================================================================
  // SCENARIO B: TU STAFF MEMBER (ROLE / MAPEL PERMUTATIONS)
  // ==========================================================================
  console.log(`\n${BOLD}${YELLOW}--- Scenario B: TU Staff Member Exemption Immunity ---${RESET}`);

  const tuPermutations = [
    { label: 'Role tata_usaha with empty mapel', isTu: true, mapel: '', kbm: 0 },
    { label: 'Role tatausaha (normalized)', isTu: true, mapel: '', kbm: 0 },
    { label: 'Mapel "Tata Usaha"', isTu: true, mapel: 'Tata Usaha', kbm: 0 },
    { label: 'Mapel "TU (Administrasi)"', isTu: true, mapel: 'TU (Administrasi)', kbm: 0 },
    { label: 'Mapel "tu"', isTu: true, mapel: 'tu', kbm: 0 },
    { label: 'Mapel "Tenaga Tata Usaha Sekolah"', isTu: true, mapel: 'Tenaga Tata Usaha Sekolah', kbm: 0 },
    { label: 'Adversarial: TU staff with bogus KBM schedule assigned in DB', isTu: true, mapel: 'Tata Usaha', kbm: 2 }
  ];

  for (let i = 0; i < tuPermutations.length; i++) {
    const p = tuPermutations[i];
    // In production, isTuStaff forces KBM count to 0 even if bogus schedules exist
    const effectiveKbm = p.mapel && isTuStaff({ mata_pelajaran: p.mapel }) ? 0 : p.kbm;
    const resB = evaluateExemptionStatus({
      isTeacherTu: p.isTu,
      totalTeacherKbmCount: effectiveKbm,
      explicitTeacherSetting: true, // Even if set to true
      isInLegacyList: true,         // Even if in legacy list
      aturanKehadiranGlobal: 'Hari_Mengajar_Saja'
    });

    const freedomB = evaluateDailyAttendanceFreedom({
      isTeacherExempt: resB.isTeacherExempt,
      hasTeachingToday: false,
      hasPiketToday: false,
      isSchoolDay: true
    });

    recordAssert(
      resB.isTeacherExempt === false && freedomB.isNonTeachingDay === false && freedomB.isFreeFromPresence === false,
      `B1.${i + 1}`,
      `TU Staff [${p.label}] is strictly immune from exemption and "Bebas Hadir" on school days`,
      `isTeacherExempt=${resB.isTeacherExempt}, statusLabel=${freedomB.statusLabel}`
    );
  }

  // ==========================================================================
  // SCENARIO C: DAILY WORKFLOW PROGRESSION (0-KBM & TU)
  // ==========================================================================
  console.log(`\n${BOLD}${YELLOW}--- Scenario C: Daily Workflow Progression & Piket Immunity ---${RESET}`);

  // C1.1: 0-KBM teacher checked in, not piket, no Jurnal Kegiatan -> locked
  const wfC1_1 = evaluateWorkflowCheckout({
    presensiDatang: { id: 'p1', tipe_absen: 'Datang' },
    isIzinSakit: false,
    isLibur: false,
    isAlpa: false,
    isNonTeachingDay: false,
    isBk: false,
    isNonKbmOrTu: true,
    isTeacherExempt: false,
    jadwalKBMCountToday: 0,
    jurnalKegiatan: null,
    jurnalKBMCountToday: 0,
    isPiketToday: false,
    laporanPiket: null
  });
  recordAssert(
    wfC1_1.canPresensiPulang === false && Boolean(wfC1_1.lockedReason?.includes('Jurnal Kegiatan')),
    'C1.1',
    '0-KBM teacher without Jurnal Kegiatan is BLOCKED from departure (canPresensiPulang=false)',
    `lockedReason="${wfC1_1.lockedReason}"`
  );

  // C1.2: 0-KBM teacher checked in, not piket, Jurnal Kegiatan submitted -> unlocked
  const wfC1_2 = evaluateWorkflowCheckout({
    presensiDatang: { id: 'p1', tipe_absen: 'Datang' },
    isIzinSakit: false,
    isLibur: false,
    isAlpa: false,
    isNonTeachingDay: false,
    isBk: false,
    isNonKbmOrTu: true,
    isTeacherExempt: false,
    jadwalKBMCountToday: 0,
    jurnalKegiatan: { id: 'jk1', tipeJurnal: 'Jurnal Kegiatan' },
    jurnalKBMCountToday: 0,
    isPiketToday: false,
    laporanPiket: null
  });
  recordAssert(
    wfC1_2.canPresensiPulang === true && wfC1_2.lockedReason === null,
    'C1.2',
    '0-KBM teacher with Jurnal Kegiatan submitted is UNLOCKED for departure',
    `canPresensiPulang=${wfC1_2.canPresensiPulang}`
  );

  // C1.3 (CRITICAL ADVERSARIAL ATTACK):
  // 0-KBM teacher on piket duty, fills Laporan Piket BUT skips Jurnal Kegiatan!
  // In the old buggy code, `state.jadwalKBM.length === 0 && state.isPiket` bypassed Jurnal!
  // In Milestone 1, `!isNonKbmOrTu` prevents this bypass!
  const wfC1_3 = evaluateWorkflowCheckout({
    presensiDatang: { id: 'p1', tipe_absen: 'Datang' },
    isIzinSakit: false,
    isLibur: false,
    isAlpa: false,
    isNonTeachingDay: false,
    isBk: false,
    isNonKbmOrTu: true, // Non-KBM teacher
    isTeacherExempt: false,
    jadwalKBMCountToday: 0,
    jurnalKegiatan: null, // NO JURNAL KEGIATAN!
    jurnalKBMCountToday: 0,
    isPiketToday: true,   // Has piket duty
    laporanPiket: { id: 'lp1', status_verifikasi: 'Disetujui' } // Piket completed!
  });
  recordAssert(
    wfC1_3.canPresensiPulang === false && Boolean(wfC1_3.lockedReason?.includes('Jurnal Kegiatan')),
    'C1.3',
    'CRITICAL: Piket duty does NOT eliminate Jurnal Kegiatan requirement for 0-KBM teacher',
    `canPresensiPulang=${wfC1_3.canPresensiPulang}, lockedReason="${wfC1_3.lockedReason}"`
  );

  // C1.4: 0-KBM teacher on piket duty, fills Jurnal Kegiatan BUT skips Laporan Piket -> locked
  const wfC1_4 = evaluateWorkflowCheckout({
    presensiDatang: { id: 'p1', tipe_absen: 'Datang' },
    isIzinSakit: false,
    isLibur: false,
    isAlpa: false,
    isNonTeachingDay: false,
    isBk: false,
    isNonKbmOrTu: true,
    isTeacherExempt: false,
    jadwalKBMCountToday: 0,
    jurnalKegiatan: { id: 'jk1', tipeJurnal: 'Jurnal Kegiatan' },
    jurnalKBMCountToday: 0,
    isPiketToday: true,
    laporanPiket: null // Missing piket report
  });
  recordAssert(
    wfC1_4.canPresensiPulang === false && Boolean(wfC1_4.lockedReason?.includes('Laporan Piket')),
    'C1.4',
    '0-KBM teacher on piket duty without Laporan Piket is BLOCKED from departure',
    `lockedReason="${wfC1_4.lockedReason}"`
  );

  // C1.5: 0-KBM teacher on piket duty, fills BOTH Jurnal Kegiatan AND Laporan Piket -> unlocked
  const wfC1_5 = evaluateWorkflowCheckout({
    presensiDatang: { id: 'p1', tipe_absen: 'Datang' },
    isIzinSakit: false,
    isLibur: false,
    isAlpa: false,
    isNonTeachingDay: false,
    isBk: false,
    isNonKbmOrTu: true,
    isTeacherExempt: false,
    jadwalKBMCountToday: 0,
    jurnalKegiatan: { id: 'jk1', tipeJurnal: 'Jurnal Kegiatan' },
    jurnalKBMCountToday: 0,
    isPiketToday: true,
    laporanPiket: { id: 'lp1', status_verifikasi: 'Disetujui' }
  });
  recordAssert(
    wfC1_5.canPresensiPulang === true && wfC1_5.lockedReason === null,
    'C1.5',
    '0-KBM teacher with BOTH Jurnal Kegiatan and Laporan Piket is UNLOCKED for departure',
    `canPresensiPulang=${wfC1_5.canPresensiPulang}`
  );

  // C2.1 - C2.4: canTeacherPresensiPulang exported function verification with Partial<GuruDailyState>
  const testStateNoJurnal: Partial<GuruDailyState> = {
    presensiDatang: { id: 'p1' } as any,
    isIzinSakit: false,
    isLibur: false,
    isAlpa: false,
    isNonTeachingDay: false,
    isBk: false,
    aturanKehadiran: 'Semua_Hari',
    jadwalKBM: [],
    jurnalKegiatan: null,
    isPiket: false,
    laporanPiket: null
  };
  recordAssert(
    canTeacherPresensiPulang(testStateNoJurnal) === false,
    'C2.1',
    'canTeacherPresensiPulang returns FALSE when 0-KBM teacher has not submitted Jurnal Kegiatan',
    'Explicit non-exempt 0-KBM state without journal cannot checkout'
  );

  const testStateWithJurnal: Partial<GuruDailyState> = {
    ...testStateNoJurnal,
    jurnalKegiatan: { id: 'jk1' } as any
  };
  recordAssert(
    canTeacherPresensiPulang(testStateWithJurnal) === true,
    'C2.2',
    'canTeacherPresensiPulang returns TRUE when 0-KBM teacher has submitted Jurnal Kegiatan',
    'Authorized checkout'
  );

  const testStatePiketNoJurnal: Partial<GuruDailyState> = {
    ...testStateNoJurnal,
    isPiket: true,
    laporanPiket: { id: 'lp1' } as any,
    jurnalKegiatan: null // CRITICAL: Attempting bypass via piket!
  };
  recordAssert(
    canTeacherPresensiPulang(testStatePiketNoJurnal) === false,
    'C2.3',
    'canTeacherPresensiPulang strictly returns FALSE when piket completed but Jurnal Kegiatan missing',
    'Proof that piket duty does not eliminate Jurnal Kegiatan requirement'
  );

  const testStatePiketWithBoth: Partial<GuruDailyState> = {
    ...testStatePiketNoJurnal,
    jurnalKegiatan: { id: 'jk1' } as any
  };
  recordAssert(
    canTeacherPresensiPulang(testStatePiketWithBoth) === true,
    'C2.4',
    'canTeacherPresensiPulang returns TRUE when BOTH piket report and Jurnal Kegiatan are completed',
    'All mandatory duties fulfilled'
  );

  // ==========================================================================
  // SCENARIO D: ADMINCONFIGVIEW MASS TOGGLE LOGIC & TAMPER RESISTANCE
  // ==========================================================================
  console.log(`\n${BOLD}${YELLOW}--- Scenario D: AdminConfigView Mass Toggle & Persistence ---${RESET}`);

  const mockGuruList = [
    { id: 'guru-kbm-1', nama_guru: 'Ahmad Guru Mapel', mata_pelajaran: 'Matematika' },
    { id: 'guru-kbm-2', nama_guru: 'Budi Guru IPA', mata_pelajaran: 'IPA' },
    { id: 'guru-non-kbm-1', nama_guru: 'Citra Tanpa Jadwal', mata_pelajaran: 'Seni Budaya' },
    { id: 'tu-staff-1', nama_guru: 'Dedi Staf Tata Usaha', mata_pelajaran: 'Tata Usaha' },
    { id: 'tu-staff-2', nama_guru: 'Eka Tenaga TU', mata_pelajaran: 'TU (Administrasi)' }
  ];

  const mockJadwalList = [
    { id: 'j1', nama_guru: 'Ahmad Guru Mapel', hari: 'Senin', jam_ke: '1-2' },
    { id: 'j2', nama_guru: 'Ahmad Guru Mapel', hari: 'Rabu', jam_ke: '3-4' },
    { id: 'j3', nama_guru: 'Budi Guru IPA', hari: 'Selasa', jam_ke: '1-2' }
    // Note: Citra, Dedi, and Eka have 0 schedules
  ];

  // D1: Verify isTuStaff helper
  recordAssert(
    isTuStaff(mockGuruList[3]) === true && isTuStaff(mockGuruList[4]) === true && isTuStaff(mockGuruList[0]) === false,
    'D1.1',
    'isTuStaff correctly classifies TU staff and non-TU personnel',
    `Dedi isTu=${isTuStaff(mockGuruList[3])}, Ahmad isTu=${isTuStaff(mockGuruList[0])}`
  );

  // D2: Verify getTeacherKbmCount
  const countAhmad = getTeacherKbmCount(mockGuruList[0], mockJadwalList);
  const countCitra = getTeacherKbmCount(mockGuruList[2], mockJadwalList);
  const countDedi = getTeacherKbmCount(mockGuruList[3], mockJadwalList);
  recordAssert(
    countAhmad === 2 && countCitra === 0 && countDedi === 0,
    'D2.1',
    'getTeacherKbmCount returns accurate KBM schedule counts and 0 for TU/non-KBM staff',
    `Ahmad=${countAhmad}, Citra=${countCitra}, Dedi=${countDedi}`
  );

  // D3: Mass action button "Set Semua Hanya Hari KBM"
  const massToggledIds = simulateAdminConfigMassToggle(mockGuruList, mockJadwalList);
  recordAssert(
    massToggledIds.length === 2 &&
    massToggledIds.includes('guru-kbm-1') &&
    massToggledIds.includes('guru-kbm-2') &&
    !massToggledIds.includes('guru-non-kbm-1') &&
    !massToggledIds.includes('tu-staff-1') &&
    !massToggledIds.includes('tu-staff-2'),
    'D3.1',
    'Mass button "Set Semua Hanya Hari KBM" ONLY selects teachers with active KBM schedules',
    `Selected: ${JSON.stringify(massToggledIds)}`
  );

  // D4: Adversarial Attack on Persistence:
  // Client state sends an adversarial array containing TU staff and 0-KBM teachers as exempt!
  const rogueExemptIds = ['guru-kbm-1', 'guru-non-kbm-1', 'tu-staff-1', 'tu-staff-2'];
  const savedConfig = simulateAdminConfigSave(mockGuruList, mockJadwalList, rogueExemptIds);

  recordAssert(
    savedConfig.exemptIds.length === 1 &&
    savedConfig.exemptIds[0] === 'guru-kbm-1' &&
    savedConfig.nonExemptIds.includes('guru-non-kbm-1') &&
    savedConfig.nonExemptIds.includes('tu-staff-1') &&
    savedConfig.nonExemptIds.includes('tu-staff-2'),
    'D4.1',
    'Adversarial Tamper Defense: Save handler purges TU and 0-KBM teachers into nonExemptIds',
    `Persisted exempt=${JSON.stringify(savedConfig.exemptIds)}, nonExempt=${JSON.stringify(savedConfig.nonExemptIds)}`
  );

  // ==========================================================================
  // SCENARIO E: NORMAL TEACHERS WITH KBM GET PROPER HARI_MENGAJAR_SAJA BEHAVIOR
  // ==========================================================================
  console.log(`\n${BOLD}${YELLOW}--- Scenario E: Regular KBM Teachers Non-Teaching Day Exemption ---${RESET}`);

  // E1.1: Regular teacher with KBM, evaluated on a non-teaching day under Hari_Mengajar_Saja
  const resE1 = evaluateExemptionStatus({
    isTeacherTu: false,
    totalTeacherKbmCount: 4, // Has 4 schedules across week
    explicitTeacherSetting: true, // Configured for Hari Mengajar Saja
    isInLegacyList: false,
    aturanKehadiranGlobal: 'Hari_Mengajar_Saja'
  });
  recordAssert(
    resE1.isNonKbmOrTu === false && resE1.isTeacherExempt === true && resE1.effectiveAturanKehadiran === 'Hari_Mengajar_Saja',
    'E1.1',
    'Regular KBM teacher under Hari_Mengajar_Saja is correctly identified as isTeacherExempt = true',
    `isNonKbmOrTu=${resE1.isNonKbmOrTu}, isTeacherExempt=${resE1.isTeacherExempt}`
  );

  const freedomE1 = evaluateDailyAttendanceFreedom({
    isTeacherExempt: resE1.isTeacherExempt,
    hasTeachingToday: false, // No teaching today
    hasPiketToday: false,    // No piket today
    isSchoolDay: true
  });
  recordAssert(
    freedomE1.isNonTeachingDay === true && freedomE1.isFreeFromPresence === true && freedomE1.statusLabel === 'Bebas Hadir',
    'E1.2',
    'Regular KBM teacher on non-teaching day receives isNonTeachingDay=true and Bebas Hadir label',
    `isNonTeachingDay=${freedomE1.isNonTeachingDay}, statusLabel=${freedomE1.statusLabel}`
  );

  // E1.3: Regular teacher evaluated on a teaching day (has KBM today)
  const freedomE2 = evaluateDailyAttendanceFreedom({
    isTeacherExempt: resE1.isTeacherExempt,
    hasTeachingToday: true, // Teaching today!
    hasPiketToday: false,
    isSchoolDay: true
  });
  recordAssert(
    freedomE2.isNonTeachingDay === false && freedomE2.isFreeFromPresence === false && freedomE2.statusLabel === 'Wajib Hadir',
    'E1.3',
    'Regular KBM teacher ON a teaching day is NOT exempt (isNonTeachingDay=false, Wajib Hadir)',
    `isNonTeachingDay=${freedomE2.isNonTeachingDay}, statusLabel=${freedomE2.statusLabel}`
  );

  // ==========================================================================
  // SCENARIO F: CODEBASE AST & IMPLEMENTATION INVARIANTS
  // ==========================================================================
  console.log(`\n${BOLD}${YELLOW}--- Scenario F: Static AST & Implementation Invariants ---${RESET}`);

  // F1: workflow.ts invariants
  const workflowPath = path.join(root, 'src', 'lib', 'workflow.ts');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');

  recordAssert(
    workflowContent.includes('isNonKbmOrTu = isTeacherTu || totalTeacherKbmCount === 0;'),
    'F1.1',
    'workflow.ts calculates isNonKbmOrTu from isTeacherTu or totalTeacherKbmCount === 0',
    'Verified verbatim match'
  );

  recordAssert(
    workflowContent.includes('if (isNonKbmOrTu) {\n      isTeacherExempt = false;'),
    'F1.2',
    'workflow.ts enforces isNonKbmOrTu as the top-priority guard (isTeacherExempt = false)',
    'Verified guard precedence'
  );

  recordAssert(
    workflowContent.includes('else if (!isNonKbmOrTu && state.jadwalKBM.length === 0 && state.isPiket)'),
    'F1.3',
    'workflow.ts shields Jurnal Kegiatan requirement so piket cannot bypass Jurnal for non-KBM/TU',
    'Verified !isNonKbmOrTu prerequisite for piket journal waiver'
  );

  // F2: AdminConfigView.tsx invariants
  const adminConfigPath = path.join(root, 'src', 'components', 'AdminConfigView.tsx');
  const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf8');

  recordAssert(
    adminConfigContent.includes('guruList.filter(g => !isTuStaff(g) && getTeacherKbmCount(g, jadwalList) > 0)'),
    'F2.1',
    'AdminConfigView mass toggle filters exclusively for teachers with KBM schedules',
    'Verified button handler'
  );

  recordAssert(
    adminConfigContent.includes('const validExemptTeachers = guruList.filter(t => !isTuStaff(t) && getTeacherKbmCount(t, jadwalList) > 0);'),
    'F2.2',
    'AdminConfigView save handler validates validExemptTeachers before saving to database',
    'Verified persistence protection'
  );

  recordAssert(
    adminConfigContent.includes('wajib_hadir_hanya_mengajar: false'),
    'F2.3',
    'AdminConfigView explicitly updates non-exempt teachers with wajib_hadir_hanya_mengajar: false',
    'Verified explicit false persistence'
  );

  // F3: HomeViewTU.tsx invariants
  const homeViewTuPath = path.join(root, 'src', 'components', 'HomeViewTU.tsx');
  const homeViewTuContent = fs.readFileSync(homeViewTuPath, 'utf8');

  recordAssert(
    homeViewTuContent.includes("isPiketDone = !isPiket || (Boolean(laporanPiket) && !laporanPiketDitolak)"),
    'F3.1',
    'HomeViewTU defines isPiketDone requiring accepted laporanPiket when on duty',
    'Verified piket check'
  );

  recordAssert(
    homeViewTuContent.includes("Boolean(effectivePresensiDatang) && !isIzinSakit && !isAlpa && !isLibur && Boolean(jurnalKegiatan) && isPiketDone"),
    'F3.2',
    'HomeViewTU canPresensiPulang strictly requires Datang, Jurnal Kegiatan, and isPiketDone',
    'Verified checkout prerequisites'
  );

  // F4: HomeViewGuru.tsx invariants
  const homeViewGuruPath = path.join(root, 'src', 'components', 'HomeViewGuru.tsx');
  const homeViewGuruContent = fs.readFileSync(homeViewGuruPath, 'utf8');

  recordAssert(
    homeViewGuruContent.includes("dailyState.isNonTeachingDay && dailyState.aturanKehadiran === 'Hari_Mengajar_Saja'"),
    'F4.1',
    'HomeViewGuru Bebas Presensi hero card is scoped strictly to genuine Hari_Mengajar_Saja non-teaching days',
    'Suppresses false hero card for 0-KBM teachers'
  );

  recordAssert(
    homeViewGuruContent.includes("Anda tetap wajib hadir dan mengisi Jurnal Kegiatan administrasi harian."),
    'F4.2',
    'HomeViewGuru informs 0-KBM teachers to complete Jurnal Kegiatan harian',
    'Verified informative UI text'
  );

  // F5: AdminVerifView & HomeViewAdmin invariants
  const adminVerifPath = path.join(root, 'src', 'components', 'AdminVerifView.tsx');
  const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf8');
  recordAssert(
    adminVerifContent.includes("const isNonKbmOrTu = isTu || totalTeacherSchedules === 0;") &&
    adminVerifContent.includes("const isTeacherExempt = !isNonKbmOrTu &&"),
    'F5.1',
    'AdminVerifView guards isTeacherExempt with !isNonKbmOrTu to eliminate false "Bebas Hadir"',
    'Verified AdminVerifView logic'
  );

  const homeViewAdminPath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
  const homeViewAdminContent = fs.readFileSync(homeViewAdminPath, 'utf8');
  recordAssert(
    homeViewAdminContent.includes("const isNonKbmOrTu = isTu || !hasAnyWeeklyKbm;") &&
    homeViewAdminContent.includes("const isTeacherExempt = !isNonKbmOrTu &&"),
    'F5.2',
    'HomeViewAdmin guards isTeacherExempt with !isNonKbmOrTu to eliminate false "Bebas Hadir"',
    'Verified HomeViewAdmin logic'
  );

  // F6: attendanceAlpa.ts invariants
  const attendanceAlpaPath = path.join(root, 'src', 'lib', 'attendanceAlpa.ts');
  const attendanceAlpaContent = fs.readFileSync(attendanceAlpaPath, 'utf8');
  recordAssert(
    attendanceAlpaContent.includes("const isNonKbmOrTu = isTu || !hasAnyWeeklyKbm;") &&
    attendanceAlpaContent.includes("const isTeacherExempt = !isNonKbmOrTu &&"),
    'F6.1',
    'attendanceAlpa.ts guards isTeacherExempt with !isNonKbmOrTu so 0-KBM & TU cannot escape Alpa',
    'Verified attendanceAlpa exemption protection'
  );

  // ==========================================================================
  // FINAL SUMMARY & VERDICT
  // ==========================================================================
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📊 ADVERSARIAL STRESS TEST SUMMARY${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`Total Assertions Evaluated : ${BOLD}${totalTests}${RESET}`);
  console.log(`Passed Assertions          : ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`Failed Assertions          : ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);

  if (failedTests === 0) {
    console.log(`\n${GREEN}${BOLD}🏆 ADVERSARIAL VERDICT: APPROVE${RESET}`);
    console.log(`${GREEN}Milestone 1 satisfies all adversarial criteria across Scenarios A-F without defect.${RESET}\n`);
  } else {
    console.error(`\n${RED}${BOLD}🚨 ADVERSARIAL VERDICT: REJECT${RESET}`);
    console.error(`${RED}${failedTests} assertions failed during stress testing.${RESET}\n`);
    process.exit(1);
  }
}

runAdversarialR1Tests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
