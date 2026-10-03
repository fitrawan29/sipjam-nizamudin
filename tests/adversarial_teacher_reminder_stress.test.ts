import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {
  REMINDER_INTERVAL_MS,
  evaluateReminderConditions,
  parseTimeToMinutes,
  ReminderConfig,
  TeacherReminderManager,
  computeRoleFlags,
} from '../src/components/TeacherReminderManager';
import { GuruDailyState } from '../src/lib/workflow';
import { getWitaTimeStr, getWitaDayName } from '../src/lib/wita';

console.log('================================================================');
console.log('ADVERSARIAL STRESS TEST HARNESS: R3 TEACHER REMINDER SYSTEM');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

interface TestFailure {
  name: string;
  detail: string;
  category: string;
}

const failureLog: TestFailure[] = [];

function assert(condition: boolean, testName: string, detail?: string, category: string = 'General') {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [${category}]: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failedTests++;
    failureLog.push({ name: testName, detail: detail || 'Assertion failed', category });
  } else {
    console.log(`✅ PASS [${category}]: ${testName}`);
    passedTests++;
  }
}

const standardConfig: ReminderConfig = {
  jam_datang_mulai: '06:00',
  jam_datang_batas: '07:15',
  jam_datang_akhir: '12:00',
  jam_pulang_mulai: '14:00',
  jam_pulang_jumat: '11:00',
  jam_pulang_akhir: '18:00',
};

function createMockDailyState(overrides: Partial<GuruDailyState> = {}): GuruDailyState {
  return {
    tanggal: '2026-10-05', // Monday
    isLibur: false,
    presensiDatang: null,
    presensiPulang: null,
    isIzinSakit: false,
    isDinasLuar: false,
    isPiket: false,
    laporanPiket: null,
    jadwalKBM: [],
    jurnalKBM: [],
    jurnalKegiatan: null,
    isBlok: false,
    blokInfo: null,
    canOpenPiket: false,
    canOpenJurnal: false,
    canPresensiPulang: false,
    lockedReason: null,
    aturanKehadiran: 'Semua_Hari',
    isNonTeachingDay: false,
    bebasAlpa: false,
    isAlpa: false,
    presensiDatangDitolak: null,
    presensiPulangDitolak: null,
    laporanPiketDitolak: null,
    jurnalDitolak: [],
    ...overrides,
  };
}

// ============================================================================
// SECTION 1: Condition 1 - Presensi Datang Boundary Time Windows & Exemption
// ============================================================================
console.log('--- SECTION 1: Condition 1 - Presensi Datang Boundary Times ---');

// 1.1 Before arrival window (05:59:59 WITA) -> Should NOT trigger
const t0559 = new Date('2026-10-05T05:59:59+08:00');
const res0559 = evaluateReminderConditions(createMockDailyState(), standardConfig, t0559);
assert(
  !res0559.some(r => r.id === 'presensi_datang'),
  '1 second before jam_datang_mulai (05:59:59) does NOT trigger presensi datang',
  undefined,
  'Presensi Datang'
);

// 1.2 Exactly at arrival window start (06:00:00 WITA) -> Should trigger normal
const t0600 = new Date('2026-10-05T06:00:00+08:00');
const res0600 = evaluateReminderConditions(createMockDailyState(), standardConfig, t0600);
const r0600 = res0600.find(r => r.id === 'presensi_datang');
assert(
  Boolean(r0600 && r0600.urgency === 'normal'),
  'At exactly jam_datang_mulai (06:00:00) triggers with normal urgency',
  undefined,
  'Presensi Datang'
);

// 1.3 1 second after window start (06:00:01 WITA) -> Should trigger normal
const t060001 = new Date('2026-10-05T06:00:01+08:00');
const res060001 = evaluateReminderConditions(createMockDailyState(), standardConfig, t060001);
assert(
  Boolean(res060001.find(r => r.id === 'presensi_datang')?.urgency === 'normal'),
  '1 second after jam_datang_mulai (06:00:01) triggers with normal urgency',
  undefined,
  'Presensi Datang'
);

// 1.4 At late limit boundary (07:15:00 WITA) -> Not past batas yet (<= 07:15) -> normal
const t0715 = new Date('2026-10-05T07:15:00+08:00');
const res0715 = evaluateReminderConditions(createMockDailyState(), standardConfig, t0715);
assert(
  Boolean(res0715.find(r => r.id === 'presensi_datang')?.urgency === 'normal'),
  'At exactly jam_datang_batas (07:15:00) triggers with normal urgency',
  undefined,
  'Presensi Datang'
);

// 1.5 Past late limit (07:16:00 WITA) -> Should trigger with warning urgency
const t0716 = new Date('2026-10-05T07:16:00+08:00');
const res0716 = evaluateReminderConditions(createMockDailyState(), standardConfig, t0716);
const r0716 = res0716.find(r => r.id === 'presensi_datang');
assert(
  Boolean(r0716 && r0716.urgency === 'warning' && r0716.message.includes('melewati batas')),
  'Past jam_datang_batas (07:16:00) triggers with warning urgency & late warning text',
  undefined,
  'Presensi Datang'
);

// 1.6 At exact arrival window end (12:00:00 WITA) -> Should still trigger
const t1200 = new Date('2026-10-05T12:00:00+08:00');
const res1200 = evaluateReminderConditions(createMockDailyState(), standardConfig, t1200);
assert(
  Boolean(res1200.find(r => r.id === 'presensi_datang')),
  'At exactly jam_datang_akhir (12:00:00) triggers presensi datang reminder',
  undefined,
  'Presensi Datang'
);

// 1.7 1 minute past arrival window end (12:01:00 WITA) -> Should NOT trigger
const t1201 = new Date('2026-10-05T12:01:00+08:00');
const res1201 = evaluateReminderConditions(createMockDailyState(), standardConfig, t1201);
assert(
  !res1201.some(r => r.id === 'presensi_datang'),
  '1 minute past jam_datang_akhir (12:01:00) does NOT trigger presensi datang',
  undefined,
  'Presensi Datang'
);

// 1.8 Teacher already present -> No reminder
const statePresent = createMockDailyState({ presensiDatang: { id: 'p-1', jam: '06:45' } });
const resPresent = evaluateReminderConditions(statePresent, standardConfig, t0715);
assert(
  !resPresent.some(r => r.id === 'presensi_datang'),
  'Teacher already checked in does NOT trigger presensi datang reminder',
  undefined,
  'Presensi Datang'
);

// 1.9 Teacher present BUT attendance rejected (presensiDatangDitolak) -> MUST trigger reminder
const stateRejected = createMockDailyState({
  presensiDatang: null,
  presensiDatangDitolak: { id: 'p-rej', status_verifikasi: 'Ditolak' }
});
const resRejected = evaluateReminderConditions(stateRejected, standardConfig, t0715);
assert(
  Boolean(resRejected.find(r => r.id === 'presensi_datang')),
  'Teacher with rejected attendance (presensiDatangDitolak) MUST receive re-submission reminder',
  undefined,
  'Presensi Datang'
);

// 1.10 Exempt teacher on non-teaching day without classes -> Should NOT trigger
const stateExemptNoClass = createMockDailyState({
  isNonTeachingDay: true,
  jadwalKBM: [],
});
const resExempt = evaluateReminderConditions(stateExemptNoClass, standardConfig, t0715, { wajib_hadir_hanya_mengajar: true });
assert(
  !resExempt.some(r => r.id === 'presensi_datang'),
  'Exempt teacher on non-teaching day without classes does NOT trigger presensi datang',
  undefined,
  'Presensi Datang'
);

// 1.11 Exempt teacher WITH classes today -> MUST trigger
const stateExemptWithClass = createMockDailyState({
  isNonTeachingDay: false,
  jadwalKBM: [{ id: 1, kelas: 'X-1', mata_pelajaran: 'Fisika' }],
});
const resExemptWithClass = evaluateReminderConditions(stateExemptWithClass, standardConfig, t0715, { wajib_hadir_hanya_mengajar: true });
assert(
  Boolean(resExemptWithClass.find(r => r.id === 'presensi_datang')),
  'Exempt teacher WITH classes today MUST receive presensi datang reminder',
  undefined,
  'Presensi Datang'
);

// 1.12 Holiday / Sick Leave -> MUST be completely suppressed
const stateHoliday = createMockDailyState({ isLibur: true });
assert(
  evaluateReminderConditions(stateHoliday, standardConfig, t0715).length === 0,
  'All reminders suppressed during school holiday (isLibur = true)',
  undefined,
  'Presensi Datang'
);
const stateSick = createMockDailyState({ isIzinSakit: true });
assert(
  evaluateReminderConditions(stateSick, standardConfig, t0715).length === 0,
  'All reminders suppressed during approved sick leave (isIzinSakit = true)',
  undefined,
  'Presensi Datang'
);


// ============================================================================
// SECTION 2: Condition 2 - Jurnal Mengajar (KBM vs Sistem Blok)
// ============================================================================
console.log('\n--- SECTION 2: Condition 2 - Jurnal Mengajar Permutations ---');

// 2.1 Zero classes scheduled on regular day -> No journal reminder
const stateZeroClasses = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  jadwalKBM: [],
  jurnalKBM: [],
});
const resZeroClasses = evaluateReminderConditions(stateZeroClasses, standardConfig, t1200);
assert(
  !resZeroClasses.some(r => r.id === 'jurnal'),
  'Teacher with 0 scheduled classes receives NO journal reminder',
  undefined,
  'Jurnal Mengajar'
);

// 2.2 Multiple scheduled classes, none submitted -> Triggers with full count
const stateMultiNoneSubmitted = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  jadwalKBM: [
    { id: 1, kelas: 'X-1', mata_pelajaran: 'Matematika' },
    { id: 2, kelas: 'X-2', mata_pelajaran: 'Matematika' },
    { id: 3, kelas: 'XI-1', mata_pelajaran: 'Matematika' },
  ],
  jurnalKBM: [],
});
const resMultiNone = evaluateReminderConditions(stateMultiNoneSubmitted, standardConfig, t1200);
const rMultiNone = resMultiNone.find(r => r.id === 'jurnal');
assert(
  Boolean(rMultiNone && rMultiNone.message.includes('3 jam mengajar') && rMultiNone.message.includes('0 selesai, 3 belum terisi')),
  'Multiple scheduled classes with 0 submitted reports accurate counts (0 selesai, 3 belum terisi)',
  undefined,
  'Jurnal Mengajar'
);

// 2.3 Multiple scheduled classes, partial submitted -> Reports remaining
const statePartialSubmitted = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  jadwalKBM: [
    { id: 1, kelas: 'X-1', mata_pelajaran: 'Matematika' },
    { id: 2, kelas: 'X-2', mata_pelajaran: 'Matematika' },
    { id: 3, kelas: 'XI-1', mata_pelajaran: 'Matematika' },
  ],
  jurnalKBM: [
    { id: 101, kelas: 'X-1', mapel: 'Matematika', status_verifikasi: 'Disetujui' },
  ],
});
const resPartial = evaluateReminderConditions(statePartialSubmitted, standardConfig, t1200);
const rPartial = resPartial.find(r => r.id === 'jurnal');
assert(
  Boolean(rPartial && rPartial.message.includes('1 selesai, 2 belum terisi')),
  'Partial journal submission accurately reports remaining count (1 selesai, 2 belum terisi)',
  undefined,
  'Jurnal Mengajar'
);

// 2.4 All scheduled classes submitted -> No journal reminder
const stateAllSubmitted = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  jadwalKBM: [
    { id: 1, kelas: 'X-1', mata_pelajaran: 'Matematika' },
    { id: 2, kelas: 'X-2', mata_pelajaran: 'Matematika' },
  ],
  jurnalKBM: [
    { id: 101, kelas: 'X-1', mapel: 'Matematika', status_verifikasi: 'Disetujui' },
    { id: 102, kelas: 'X-2', mapel: 'Matematika', status_verifikasi: 'Disetujui' },
  ],
});
const resAllSubmitted = evaluateReminderConditions(stateAllSubmitted, standardConfig, t1200);
assert(
  !resAllSubmitted.some(r => r.id === 'jurnal'),
  'All scheduled classes submitted suppresses journal reminder',
  undefined,
  'Jurnal Mengajar'
);

// 2.5 Sistem Blok active, Jurnal Kegiatan not yet submitted -> Triggers block reminder
const stateBlokActive = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  isBlok: true,
  blokInfo: {
    id: 'blk-1',
    nama_kegiatan: 'Projek P5 Gaya Hidup Berkelanjutan',
    deskripsi: 'Kegiatan P5 Siswa',
    tanggal_mulai: '2026-10-05',
    tanggal_selesai: '2026-10-09',
  },
  jurnalKegiatan: null,
});
const resBlok = evaluateReminderConditions(stateBlokActive, standardConfig, t1200);
const rBlok = resBlok.find(r => r.id === 'jurnal');
assert(
  Boolean(rBlok && rBlok.title.includes('Sistem Blok') && rBlok.message.includes('Projek P5 Gaya Hidup Berkelanjutan')),
  'Sistem Blok active triggers Jurnal Kegiatan reminder with exact block activity name',
  undefined,
  'Jurnal Mengajar'
);

// 2.6 Sistem Blok active, Jurnal Kegiatan submitted -> Suppresses reminder
const stateBlokDone = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  isBlok: true,
  jurnalKegiatan: { id: 'jk-1', keterangan: 'Jurnal Kegiatan P5' },
});
assert(
  !evaluateReminderConditions(stateBlokDone, standardConfig, t1200).some(r => r.id === 'jurnal'),
  'Sistem Blok with Jurnal Kegiatan submitted suppresses reminder',
  undefined,
  'Jurnal Mengajar'
);

// 2.7 Sistem Blok active, exempt teacher with NO classes today -> Exempt from Jurnal Kegiatan
const stateBlokExempt = createMockDailyState({
  isBlok: true,
  jadwalKBM: [],
  jurnalKegiatan: null,
});
assert(
  !evaluateReminderConditions(stateBlokExempt, standardConfig, t1200, { wajib_hadir_hanya_mengajar: true }).some(r => r.id === 'jurnal'),
  'Sistem Blok with exempt teacher having no classes today does NOT require Jurnal Kegiatan',
  undefined,
  'Jurnal Mengajar'
);


// ============================================================================
// SECTION 3: Condition 3 - Laporan Piket
// ============================================================================
console.log('\n--- SECTION 3: Condition 3 - Laporan Piket Permutations ---');

// 3.1 Teacher not on piket -> No piket reminder
const stateNotPiket = createMockDailyState({ isPiket: false });
assert(
  !evaluateReminderConditions(stateNotPiket, standardConfig, t1200).some(r => r.id === 'piket'),
  'Teacher not assigned piket duty receives NO piket reminder',
  undefined,
  'Laporan Piket'
);

// 3.2 Teacher assigned piket, report not submitted -> Triggers piket reminder
const statePiketUnsubmitted = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  isPiket: true,
  laporanPiket: null,
});
const resPiket = evaluateReminderConditions(statePiketUnsubmitted, standardConfig, t1200);
const rPiket = resPiket.find(r => r.id === 'piket');
assert(
  Boolean(rPiket && rPiket.targetView === 'view-piket'),
  'Teacher assigned piket duty with missing report triggers piket reminder targeting view-piket',
  undefined,
  'Laporan Piket'
);

// 3.3 Teacher assigned piket, report submitted -> No piket reminder
const statePiketSubmitted = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  isPiket: true,
  laporanPiket: { id: 'lp-1', tanggal: '2026-10-05' },
});
assert(
  !evaluateReminderConditions(statePiketSubmitted, standardConfig, t1200).some(r => r.id === 'piket'),
  'Teacher with submitted piket report receives NO piket reminder',
  undefined,
  'Laporan Piket'
);

// 3.4 Teacher assigned piket, report rejected (laporanPiketDitolak) -> MUST trigger reminder
const statePiketRejected = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  isPiket: true,
  laporanPiket: null,
  laporanPiketDitolak: { id: 'lp-rej', status_verifikasi: 'Ditolak' },
});
assert(
  Boolean(evaluateReminderConditions(statePiketRejected, standardConfig, t1200).find(r => r.id === 'piket')),
  'Teacher with rejected piket report MUST receive re-submission reminder',
  undefined,
  'Laporan Piket'
);

// 3.5 Sistem Blok active, exempt teacher with no classes -> Free from piket
const statePiketBlokExempt = createMockDailyState({
  isPiket: true,
  isBlok: true,
  jadwalKBM: [],
  laporanPiket: null,
});
assert(
  !evaluateReminderConditions(statePiketBlokExempt, standardConfig, t1200, { wajib_hadir_hanya_mengajar: true }).some(r => r.id === 'piket'),
  'Sistem Blok with exempt teacher having no classes is exempt from piket report',
  undefined,
  'Laporan Piket'
);


// ============================================================================
// SECTION 4: Condition 4 - Presensi Pulang Windows & Friday Hours
// ============================================================================
console.log('\n--- SECTION 4: Condition 4 - Presensi Pulang Boundary Times ---');

// 4.1 Regular Monday, 1 second before departure window (13:59:59 WITA) -> No reminder
const t1359 = new Date('2026-10-05T13:59:59+08:00');
const statePulangBase = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  presensiPulang: null,
});
assert(
  !evaluateReminderConditions(statePulangBase, standardConfig, t1359).some(r => r.id === 'presensi_pulang'),
  'Monday at 13:59:59 (before jam_pulang_mulai 14:00) does NOT trigger presensi pulang',
  undefined,
  'Presensi Pulang'
);

// 4.2 Regular Monday, exactly at departure window start (14:00:00 WITA) -> Triggers
const t1400 = new Date('2026-10-05T14:00:00+08:00');
const res1400 = evaluateReminderConditions(statePulangBase, standardConfig, t1400);
const r1400 = res1400.find(r => r.id === 'presensi_pulang');
assert(
  Boolean(r1400 && r1400.targetView === 'view-guru-presensi'),
  'Monday at exactly jam_pulang_mulai (14:00:00) triggers presensi pulang reminder targeting view-guru-presensi',
  undefined,
  'Presensi Pulang'
);

// 4.3 Regular Monday, at departure deadline (18:00:00 WITA) -> Triggers
const t1800 = new Date('2026-10-05T18:00:00+08:00');
assert(
  Boolean(evaluateReminderConditions(statePulangBase, standardConfig, t1800).find(r => r.id === 'presensi_pulang')),
  'Monday at jam_pulang_akhir (18:00:00) triggers presensi pulang reminder',
  undefined,
  'Presensi Pulang'
);

// 4.4 Regular Monday, past departure deadline (18:01:00 WITA) -> No reminder
const t1801 = new Date('2026-10-05T18:01:00+08:00');
assert(
  !evaluateReminderConditions(statePulangBase, standardConfig, t1801).some(r => r.id === 'presensi_pulang'),
  'Monday at 18:01:00 (past jam_pulang_akhir) does NOT trigger presensi pulang',
  undefined,
  'Presensi Pulang'
);

// 4.5 Friday departure window (jam_pulang_jumat: '11:00')
// Friday 10:59:59 -> No reminder
const tFri1059 = new Date('2026-10-09T10:59:59+08:00'); // Friday
const stateFri = createMockDailyState({ tanggal: '2026-10-09', presensiDatang: { id: 'p-1' }, presensiPulang: null });
assert(
  !evaluateReminderConditions(stateFri, standardConfig, tFri1059).some(r => r.id === 'presensi_pulang'),
  'Friday at 10:59:59 (before jam_pulang_jumat 11:00) does NOT trigger presensi pulang',
  undefined,
  'Presensi Pulang'
);

// Friday 11:00:00 -> Triggers
const tFri1100 = new Date('2026-10-09T11:00:00+08:00'); // Friday
const resFri1100 = evaluateReminderConditions(stateFri, standardConfig, tFri1100);
const rFri1100 = resFri1100.find(r => r.id === 'presensi_pulang');
assert(
  Boolean(rFri1100 && rFri1100.message.includes('11:00 WITA')),
  'Friday at 11:00:00 triggers presensi pulang reminder recognizing Friday schedule',
  undefined,
  'Presensi Pulang'
);

// 4.6 Teacher already checked out -> No reminder
const stateCheckedOut = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  presensiPulang: { id: 'p-pulang', jam: '14:15' },
});
assert(
  !evaluateReminderConditions(stateCheckedOut, standardConfig, t1400).some(r => r.id === 'presensi_pulang'),
  'Teacher already checked out receives NO presensi pulang reminder',
  undefined,
  'Presensi Pulang'
);

// 4.7 Teacher checkout rejected (presensiPulangDitolak) -> MUST trigger reminder
const statePulangRejected = createMockDailyState({
  presensiDatang: { id: 'p-1' },
  presensiPulang: null,
  presensiPulangDitolak: { id: 'p-rej', status_verifikasi: 'Ditolak' },
});
assert(
  Boolean(evaluateReminderConditions(statePulangRejected, standardConfig, t1400).find(r => r.id === 'presensi_pulang')),
  'Teacher with rejected checkout MUST receive re-submission reminder',
  undefined,
  'Presensi Pulang'
);


// ============================================================================
// SECTION 5: Adversarial Role Restrictions & Non-Teacher Privilege Escalation
// ============================================================================
console.log('\n--- SECTION 5: Adversarial Role Restrictions & Isolation ---');

// Role computation helper imported from TeacherReminderManager.tsx

// 5.1 Admin Role: MUST NOT evaluate or trigger reminders
const adminUser = { id: 'u-admin', role: 'admin', nama: 'Administrator' };
const adminFlags = computeRoleFlags(adminUser);
assert(!adminFlags.isGuru && adminFlags.isAdmin, 'Admin role is correctly blocked from isGuru', undefined, 'Role Restrictions');

// 5.2 Superadmin Role: MUST NOT evaluate or trigger reminders
const superadminUser = { id: 'u-super', role: 'superadmin', nama: 'Super Admin' };
const superFlags = computeRoleFlags(superadminUser);
assert(!superFlags.isGuru && superFlags.isSuperadmin, 'Superadmin role is correctly blocked from isGuru', undefined, 'Role Restrictions');

// 5.3 Spaced / Mixed Case Super Admin: MUST NOT evaluate or trigger reminders
const spacedSuperUser = { id: 'u-super2', role: 'Super Admin', nama: 'Super Admin SIPJAM' };
const spacedSuperFlags = computeRoleFlags(spacedSuperUser);
assert(!spacedSuperFlags.isGuru && spacedSuperFlags.isSuperadmin, 'Case-insensitive "Super Admin" is blocked from isGuru', undefined, 'Role Restrictions');

// 5.4 Null or Undefined User: MUST NOT evaluate or trigger reminders
assert(!computeRoleFlags(null).isGuru, 'null user is NOT isGuru', undefined, 'Role Restrictions');
assert(!computeRoleFlags(undefined).isGuru, 'undefined user is NOT isGuru', undefined, 'Role Restrictions');

// 5.5 Valid Teacher Role: MUST be recognized as isGuru
const guruUser = { id: 'u-guru', role: 'guru', nama: 'Guru Matematika' };
const guruFlags = computeRoleFlags(guruUser);
assert(guruFlags.isGuru, 'Standard "guru" role is active as isGuru', undefined, 'Role Restrictions');

const guruUpperUser = { id: 'u-guru2', role: 'Guru', nama: 'Guru Fisika' };
assert(computeRoleFlags(guruUpperUser).isGuru, 'Capitalized "Guru" role is active as isGuru', undefined, 'Role Restrictions');

// 5.6 NON-TEACHER ROLES ADVERSARIAL STRESS TEST
// The dispatch explicitly requires:
// "Role restriction: ensure non-teachers (admins, superadmins, students, guests) never trigger reminder evaluations or popups."
console.log('Testing non-teacher roles against TeacherReminderManager role detection logic...');

const studentUser = { id: 'u-student', role: 'siswa', nama: 'Budi Santoso (Siswa)' };
const studentFlags = computeRoleFlags(studentUser);
assert(
  !studentFlags.isGuru,
  'Student role ("siswa") must NEVER be treated as teacher (isGuru must be false)',
  `Actual isGuru: ${studentFlags.isGuru}`,
  'Role Restrictions'
);

const englishStudentUser = { id: 'u-student2', role: 'student', nama: 'John Doe (Student)' };
const englishStudentFlags = computeRoleFlags(englishStudentUser);
assert(
  !englishStudentFlags.isGuru,
  'Student role ("student") must NEVER be treated as teacher (isGuru must be false)',
  `Actual isGuru: ${englishStudentFlags.isGuru}`,
  'Role Restrictions'
);

const guestUser = { id: 'u-guest', role: 'guest', nama: 'Tamu Sekolah' };
const guestFlags = computeRoleFlags(guestUser);
assert(
  !guestFlags.isGuru,
  'Guest role ("guest") must NEVER be treated as teacher (isGuru must be false)',
  `Actual isGuru: ${guestFlags.isGuru}`,
  'Role Restrictions'
);

const parentUser = { id: 'u-parent', role: 'wali_murid', nama: 'Orang Tua Siswa' };
const parentFlags = computeRoleFlags(parentUser);
assert(
  !parentFlags.isGuru,
  'Parent role ("wali_murid") must NEVER be treated as teacher (isGuru must be false)',
  `Actual isGuru: ${parentFlags.isGuru}`,
  'Role Restrictions'
);

const anonymousRoleUser = { id: 'u-anon', role: '', nama: 'User Without Role' };
const anonFlags = computeRoleFlags(anonymousRoleUser);
assert(
  !anonFlags.isGuru,
  'Empty role string must NEVER be treated as teacher (isGuru must be false)',
  `Actual isGuru: ${anonFlags.isGuru}`,
  'Role Restrictions'
);

const administratorUser = { id: 'u-admin-long', role: 'administrator', nama: 'Admin Panjang' };
const adminLongFlags = computeRoleFlags(administratorUser);
assert(
  !adminLongFlags.isGuru,
  'Role "administrator" must NOT be treated as teacher (isGuru must be false)',
  `Actual isGuru: ${adminLongFlags.isGuru}`,
  'Role Restrictions'
);

// 5.7 Defensive Type Robustness: undefined jurnalKBM in evaluateReminderConditions
let threwOnUndefinedJurnal = false;
try {
  evaluateReminderConditions(
    createMockDailyState({
      jadwalKBM: [{ id: 1, kelas: 'X-1', mata_pelajaran: 'Matematika' }],
      jurnalKBM: undefined as any,
    }),
    standardConfig,
    t1200
  );
} catch (e: any) {
  threwOnUndefinedJurnal = true;
}
assert(
  !threwOnUndefinedJurnal,
  'evaluateReminderConditions should defensively handle undefined jurnalKBM without throwing TypeError',
  'Throws TypeError: Cannot read properties of undefined (reading \'some\')',
  'Defensive Robustness'
);



// ============================================================================
// SECTION 6: 5-Minute Throttling & Interval Verification
// ============================================================================
console.log('\n--- SECTION 6: 5-Minute Throttling & Anti-Spam Interval ---');

// 6.1 Check exported interval constant
assert(
  REMINDER_INTERVAL_MS === 300_000,
  'REMINDER_INTERVAL_MS equals exactly 300,000 ms (5 minutes)',
  `Actual: ${REMINDER_INTERVAL_MS} ms`,
  'Interval Throttling'
);

// 6.2 Verify source code contains 5-minute interval timer setup
const trmPath = path.resolve(__dirname, '../src/components/TeacherReminderManager.tsx');
const trmCode = fs.readFileSync(trmPath, 'utf8');

assert(
  trmCode.includes('setInterval(') && trmCode.includes('REMINDER_INTERVAL_MS'),
  'TeacherReminderManager registers setInterval with REMINDER_INTERVAL_MS',
  undefined,
  'Interval Throttling'
);

// 6.3 Verify notification tags prevent OS notification spam
assert(
  trmCode.includes('tag: `sipjam-reminder-${item.id}`') || trmCode.includes('tag: \'sipjam-reminder-'),
  'Native notification assigns persistent item tag to deduplicate and prevent notification flooding',
  undefined,
  'Interval Throttling'
);

// 6.4 Verify tab visibility listener has minimum 60-second debounce
assert(
  trmCode.includes('elapsed > 60_000') || trmCode.includes('60000'),
  'Tab visibility change handler throttles re-checks with at least 60-second elapsed requirement',
  undefined,
  'Interval Throttling'
);

// 6.5 Verify dismissal state resets on interval ticks so unresolved tasks resurface
assert(
  trmCode.includes('setIsDismissed(false)'),
  'Dismissal state resets periodically to surface unfulfilled warnings on interval ticks',
  undefined,
  'Interval Throttling'
);


// ============================================================================
// SECTION 7: Fallback Mechanisms & Multi-Channel Delivery
// ============================================================================
console.log('\n--- SECTION 7: Fallback Mechanisms ---');

// 7.1 Component renders valid in-app banner accessible region
assert(
  trmCode.includes('role="region"') && trmCode.includes('aria-label="Pengingat Tugas Harian Guru"'),
  'Accessible ARIA region present for in-app banner',
  undefined,
  'Fallback Mechanisms'
);

// 7.2 Safe guard against SSR / missing window.Notification
assert(
  trmCode.includes('typeof window !== \'undefined\'') && trmCode.includes('\'Notification\' in window'),
  'Checks for window and Notification existence before calling native Notification API',
  undefined,
  'Fallback Mechanisms'
);

// 7.3 Safe guard for Notification.permission !== granted
assert(
  trmCode.includes('Notification.permission === \'granted\''),
  'Only attempts native push/notification spawn when permission is explicitly granted',
  undefined,
  'Fallback Mechanisms'
);

// 7.4 Service worker fallback to new Notification()
assert(
  trmCode.includes('\'serviceWorker\' in navigator') && trmCode.includes('new Notification('),
  'Gracefully falls back to new Notification() when Service Worker is unavailable',
  undefined,
  'Fallback Mechanisms'
);

// 7.5 Exception handling around native notification spawn
assert(
  trmCode.includes('try {') && trmCode.includes('console.warn(\'Native notification spawn failed:\''),
  'Wraps native notification dispatch in try/catch to ensure UI rendering never crashes on OS/browser permission rejection',
  undefined,
  'Fallback Mechanisms'
);

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================');

if (failureLog.length > 0) {
  console.log('\n🚨 DETAILED FAILURE BREAKDOWN:');
  failureLog.forEach((f, idx) => {
    console.log(`${idx + 1}. [${f.category}] ${f.name}`);
    console.log(`   Details: ${f.detail}`);
  });
}

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL ADVERSARIAL STRESS TESTS PASSED!');
  process.exit(0);
}
