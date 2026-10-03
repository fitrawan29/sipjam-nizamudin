import fs from 'fs';
import path from 'path';
import {
  REMINDER_INTERVAL_MS,
  evaluateReminderConditions,
  parseTimeToMinutes,
  ReminderConfig
} from '../src/components/TeacherReminderManager';
import { GuruDailyState } from '../src/lib/workflow';

console.log('====================================================');
console.log('R3 AUTOMATED TEACHER REMINDER SYSTEM VERIFICATION');
console.log('====================================================\n');

let failed = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

const rootDir = path.join(__dirname, '..');

// --- Section 1: Static Code Inspection & File Integration ---
console.log('--- Section 1: Static Code Inspection & Integration ---');
const reminderCompPath = path.join(rootDir, 'src', 'components', 'TeacherReminderManager.tsx');
assert(fs.existsSync(reminderCompPath), 'TeacherReminderManager.tsx component exists');

const reminderContent = fs.readFileSync(reminderCompPath, 'utf-8');
assert(
  reminderContent.includes('REMINDER_INTERVAL_MS = 300_000') || reminderContent.includes('300000'),
  'TeacherReminderManager defines 5-minute (300,000 ms) recurring interval'
);
assert(
  REMINDER_INTERVAL_MS === 300_000,
  `Exported REMINDER_INTERVAL_MS equals exactly 300,000 ms (5 minutes)`
);

const appScreenPath = path.join(rootDir, 'src', 'components', 'AppScreen.tsx');
const appScreenContent = fs.readFileSync(appScreenPath, 'utf-8');
assert(
  appScreenContent.includes('TeacherReminderManager'),
  'AppScreen.tsx imports and mounts TeacherReminderManager'
);
assert(
  appScreenContent.includes('<TeacherReminderManager') && appScreenContent.includes('onNavigate={handleNavigation}'),
  'AppScreen.tsx passes user and handleNavigation callback to TeacherReminderManager'
);

const routePath = path.join(rootDir, 'src', 'app', 'api', 'push', 'send-reminders', 'route.ts');
const routeContent = fs.readFileSync(routePath, 'utf-8');
assert(
  routeContent.includes('checkedOutSet') && routeContent.includes('presensi_pulang'),
  'Backend route /api/push/send-reminders includes Task 4 (presensi_pulang) parity check'
);

// --- Section 2: Pure Condition 1 Evaluation (Presensi Datang) ---
console.log('\n--- Section 2: Condition 1 Evaluation (Presensi Datang) ---');
const baseConfig: ReminderConfig = {
  jam_datang_mulai: '06:00',
  jam_datang_batas: '07:15',
  jam_datang_akhir: '12:00',
  jam_pulang_mulai: '14:00',
  jam_pulang_jumat: '11:00',
  jam_pulang_akhir: '18:00',
};

function createBaseState(): GuruDailyState {
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
  };
}

// 2.1 Before batas time on a weekday morning (06:45 WITA)
const morningDate = new Date('2026-10-05T06:45:00+08:00');
const stateUnchecked = createBaseState();
const remindersMorning = evaluateReminderConditions(stateUnchecked, baseConfig, morningDate);
const datangReminder = remindersMorning.find(r => r.id === 'presensi_datang');
assert(Boolean(datangReminder), 'Triggers Presensi Datang reminder during arrival window (06:45 WITA)');
assert(
  datangReminder?.urgency === 'normal' && datangReminder?.targetView === 'view-guru-presensi',
  'Presensi Datang reminder before limit has normal urgency and targets view-guru-presensi'
);

// 2.2 After batas time (07:30 WITA) -> warning/urgent
const lateDate = new Date('2026-10-05T07:30:00+08:00');
const remindersLate = evaluateReminderConditions(stateUnchecked, baseConfig, lateDate);
const datangLateReminder = remindersLate.find(r => r.id === 'presensi_datang');
assert(Boolean(datangLateReminder), 'Triggers Presensi Datang reminder after late threshold (07:30 WITA)');
assert(
  datangLateReminder?.urgency === 'warning' && datangLateReminder?.message.includes('melewati batas'),
  'Late arrival reminder flags warning urgency and notes late threshold'
);

// 2.3 Already checked in
const stateCheckedIn = createBaseState();
stateCheckedIn.presensiDatang = { id: 1, jam: '06:50' };
const remindersChecked = evaluateReminderConditions(stateCheckedIn, baseConfig, morningDate);
assert(
  !remindersChecked.some(r => r.id === 'presensi_datang'),
  'Does not trigger Presensi Datang reminder if teacher already checked in'
);

// 2.4 Holiday or sick leave -> no reminder
const stateHoliday = createBaseState();
stateHoliday.isLibur = true;
assert(
  evaluateReminderConditions(stateHoliday, baseConfig, morningDate).length === 0,
  'No reminders triggered on holiday'
);

// --- Section 3: Pure Condition 2 Evaluation (Jurnal Mengajar & Blok) ---
console.log('\n--- Section 3: Condition 2 Evaluation (Jurnal Mengajar & Blok) ---');

// 3.1 Regular KBM with missing journals
const stateWithSchedule = createBaseState();
stateWithSchedule.presensiDatang = { id: 1 };
stateWithSchedule.jadwalKBM = [
  { id: 101, kelas: 'X-1', mata_pelajaran: 'Matematika' },
  { id: 102, kelas: 'X-2', mata_pelajaran: 'Matematika' },
];
stateWithSchedule.jurnalKBM = [
  { id: 201, kelas: 'X-1', mapel: 'Matematika', status_verifikasi: 'Disetujui' },
];
const middayDate = new Date('2026-10-05T10:00:00+08:00');
const remindersJurnal = evaluateReminderConditions(stateWithSchedule, baseConfig, middayDate);
const jurnalReminder = remindersJurnal.find(r => r.id === 'jurnal');
assert(Boolean(jurnalReminder), 'Triggers Jurnal Mengajar reminder when schedules exceed submitted journals');
assert(
  jurnalReminder?.message.includes('1 belum terisi') && jurnalReminder?.targetView === 'view-guru-jurnal',
  'Jurnal reminder correctly reports missing class count and navigates to view-guru-jurnal'
);

// 3.2 All journals submitted
stateWithSchedule.jurnalKBM.push({ id: 202, kelas: 'X-2', mapel: 'Matematika', status_verifikasi: 'Disetujui' });
const remindersAllJurnal = evaluateReminderConditions(stateWithSchedule, baseConfig, middayDate);
assert(
  !remindersAllJurnal.some(r => r.id === 'jurnal'),
  'Does not trigger Jurnal reminder when all scheduled classes have journals submitted'
);

// 3.3 Sistem Blok mode
const stateBlok = createBaseState();
stateBlok.presensiDatang = { id: 1 };
stateBlok.isBlok = true;
stateBlok.blokInfo = {
  id: 'b-1',
  nama_kegiatan: 'Pekan Asesmen Sumatif',
  deskripsi: 'Ujian Bersama',
  tanggal_mulai: '2026-10-05',
  tanggal_selesai: '2026-10-09',
};
const remindersBlok = evaluateReminderConditions(stateBlok, baseConfig, middayDate);
const blokReminder = remindersBlok.find(r => r.id === 'jurnal');
assert(Boolean(blokReminder), 'Triggers Jurnal Kegiatan (Sistem Blok) reminder when block active');
assert(
  blokReminder?.title.includes('Sistem Blok') && blokReminder?.message.includes('Pekan Asesmen Sumatif'),
  'Block journal reminder includes block activity name'
);

stateBlok.jurnalKegiatan = { id: 301, keterangan: 'Jurnal Kegiatan', status_verifikasi: 'Disetujui' };
const remindersBlokDone = evaluateReminderConditions(stateBlok, baseConfig, middayDate);
assert(
  !remindersBlokDone.some(r => r.id === 'jurnal'),
  'Does not trigger block journal reminder once Jurnal Kegiatan is submitted'
);

// --- Section 4: Pure Condition 3 Evaluation (Laporan Piket) ---
console.log('\n--- Section 4: Condition 3 Evaluation (Laporan Piket) ---');
const statePiket = createBaseState();
statePiket.presensiDatang = { id: 1 };
statePiket.isPiket = true;
statePiket.laporanPiket = null;

const remindersPiket = evaluateReminderConditions(statePiket, baseConfig, middayDate);
const piketReminder = remindersPiket.find(r => r.id === 'piket');
assert(Boolean(piketReminder), 'Triggers Laporan Piket reminder for teachers assigned piket duty');
assert(
  piketReminder?.targetView === 'view-piket',
  'Laporan Piket reminder targets view-piket'
);

statePiket.laporanPiket = { id: 401, tanggal: '2026-10-05' };
const remindersPiketDone = evaluateReminderConditions(statePiket, baseConfig, middayDate);
assert(
  !remindersPiketDone.some(r => r.id === 'piket'),
  'Does not trigger Piket reminder once piket report is submitted'
);

// Teacher not on piket duty
const stateNoPiket = createBaseState();
stateNoPiket.isPiket = false;
assert(
  !evaluateReminderConditions(stateNoPiket, baseConfig, middayDate).some(r => r.id === 'piket'),
  'Does not trigger Piket reminder for teachers not assigned piket'
);

// --- Section 5: Pure Condition 4 Evaluation (Presensi Pulang) ---
console.log('\n--- Section 5: Condition 4 Evaluation (Presensi Pulang) ---');
const statePulang = createBaseState();
statePulang.presensiDatang = { id: 1 };
statePulang.presensiPulang = null;

// 5.1 Before departure time (e.g. 11:30 WITA on Monday)
const mondayMidday = new Date('2026-10-05T11:30:00+08:00');
const remindersEarly = evaluateReminderConditions(statePulang, baseConfig, mondayMidday);
assert(
  !remindersEarly.some(r => r.id === 'presensi_pulang'),
  'Does not trigger Presensi Pulang before departure window opens (11:30 on Monday)'
);

// 5.2 Within Monday departure window (14:30 WITA)
const mondayAfternoon = new Date('2026-10-05T14:30:00+08:00');
const remindersPulang = evaluateReminderConditions(statePulang, baseConfig, mondayAfternoon);
const pulangReminder = remindersPulang.find(r => r.id === 'presensi_pulang');
assert(Boolean(pulangReminder), 'Triggers Presensi Pulang reminder during departure window (14:30 WITA)');
assert(
  pulangReminder?.targetView === 'view-guru-presensi',
  'Presensi Pulang reminder targets view-guru-presensi'
);

// 5.3 Friday departure window (11:15 WITA on Friday)
const fridayNoon = new Date('2026-10-09T11:15:00+08:00');
const stateFriday = createBaseState();
stateFriday.tanggal = '2026-10-09';
stateFriday.presensiDatang = { id: 1 };
const remindersFriday = evaluateReminderConditions(stateFriday, baseConfig, fridayNoon);
assert(
  Boolean(remindersFriday.find(r => r.id === 'presensi_pulang')),
  'Friday uses special jam_pulang_jumat schedule (triggers at 11:15 WITA)'
);

// 5.4 Already checked out
statePulang.presensiPulang = { id: 2, jam: '14:35' };
const remindersPulangDone = evaluateReminderConditions(statePulang, baseConfig, mondayAfternoon);
assert(
  !remindersPulangDone.some(r => r.id === 'presensi_pulang'),
  'Does not trigger Presensi Pulang reminder once teacher checked out'
);

// --- Section 6: Time Parser Utility Verification ---
console.log('\n--- Section 6: Time Parser Utility Verification ---');
assert(parseTimeToMinutes('06:00') === 360, 'Parses 06:00 to 360 minutes');
assert(parseTimeToMinutes('07.15') === 435, 'Parses 07.15 (dot notation) to 435 minutes');
assert(parseTimeToMinutes('14:30') === 870, 'Parses 14:30 to 870 minutes');
assert(parseTimeToMinutes('') === 0, 'Handles empty string gracefully returning 0');

// --- Section 7: Anti-Spam Interval & Multi-Channel Verification ---
console.log('\n--- Section 7: Anti-Spam & UI Fallback Verification ---');
assert(
  reminderContent.includes('setIsDismissed(false)'),
  'Dismissal state resets periodically to surface unfulfilled warnings on interval ticks'
);
assert(
  reminderContent.includes('Notification.permission === \'granted\''),
  'Dispatches native Web Notification when browser permission is granted'
);
assert(
  reminderContent.includes('role="region"') && reminderContent.includes('aria-label="Pengingat Tugas Harian Guru"'),
  'Renders accessible in-app banner fallback with ARIA region attributes'
);
assert(
  reminderContent.includes('Buka Menu') && reminderContent.includes('handleAction'),
  'In-app banner provides direct action button navigating to the relevant workflow screen'
);

console.log('\n====================================================');
if (failed === 0) {
  console.log('🎉 ALL R3 TEACHER REMINDER SYSTEM TESTS PASSED!');
} else {
  console.error(`❌ ${failed} TESTS FAILED!`);
  process.exit(1);
}
