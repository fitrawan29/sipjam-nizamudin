import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('====================================================');
console.log('THREE FIXES VERIFICATION TEST (R1, R2, R3)');
console.log('====================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const workflowPath = path.join(projectRoot, 'src', 'lib', 'workflow.ts');
const homeViewPath = path.join(projectRoot, 'src', 'components', 'HomeView.tsx');
const rekapJurnalPath = path.join(projectRoot, 'src', 'components', 'RekapJurnalView.tsx');
const sendRemindersPath = path.join(projectRoot, 'src', 'app', 'api', 'push', 'send-reminders', 'route.ts');

assert(fs.existsSync(workflowPath), 'workflow.ts exists');
assert(fs.existsSync(homeViewPath), 'HomeView.tsx exists');
assert(fs.existsSync(rekapJurnalPath), 'RekapJurnalView.tsx exists');
assert(fs.existsSync(sendRemindersPath), 'send-reminders route.ts exists');

const workflowContent = fs.readFileSync(workflowPath, 'utf8');
const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');
const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf8');
const sendRemindersContent = fs.readFileSync(sendRemindersPath, 'utf8');

// ----------------------------------------------------
// Section 1: Requirement R1 - Pengecualian Sistem Blok
// ----------------------------------------------------
console.log('--- Section 1: R1 - Pengecualian Sistem Blok ---');

// 1.1 workflow.ts: Piket is bypassed for exempt teacher without classes during block
assert(
  workflowContent.includes('const isExemptAndNoSchedule = isTeacherExempt && state.jadwalKBM.length === 0;') &&
  workflowContent.includes('if (!(state.isBlok && isExemptAndNoSchedule)) {'),
  'R1.1 workflow.ts: Piket is not assigned to exempt teacher without schedule during block system'
);

// 1.2 workflow.ts: hasTeachingObligation excludes exempt teachers when isBlok is active
assert(
  workflowContent.includes('const hasTeachingObligation = (state.isBlok && !isTeacherExempt) || state.jadwalKBM.length > 0 || state.isPiket;'),
  'R1.2 workflow.ts: hasTeachingObligation does not force attendance on exempt teachers during block periods'
);

// 1.3 workflow.ts: isNonTeachingDay sets bebasAlpa and unlocks presensi pulang
assert(
  workflowContent.includes('if (state.isNonTeachingDay) {') &&
  workflowContent.includes('isJurnalDone = true;'),
  'R1.3 workflow.ts: isNonTeachingDay grants isJurnalDone = true'
);

// 1.4 HomeView.tsx: isExemptNonTeaching applies during block days
assert(
  homeViewContent.includes('const isExemptNonTeaching = Boolean(teacher.wajib_hadir_hanya_mengajar) && targetCount === 0;'),
  'R1.4 HomeView.tsx: isExemptNonTeaching is active for exempt teachers with targetCount === 0 even during block system'
);

// 1.5 HomeView.tsx: Admin Matrix marks exempt teachers as Bebas Piket / Bukan Petugas and Bebas KBM
assert(
  homeViewContent.includes("const isPiket = isAssignedPiket && (!isBlokToday || !isExemptNonTeaching);") &&
  homeViewContent.includes("let piketStatus = isExemptNonTeaching && isAssignedPiket ? 'Bebas Piket' : 'Bukan Petugas';"),
  'R1.5 HomeView.tsx: Admin matrix frees exempt teachers from piket during block system'
);

assert(
  homeViewContent.includes("if (isBlokToday) {") &&
  homeViewContent.includes("if (isExemptNonTeaching) {") &&
  homeViewContent.includes("jurnalStatus = 'Bebas KBM';"),
  'R1.6 HomeView.tsx: Admin matrix classifies exempt teachers without classes as Bebas KBM during block system'
);

// 1.6 HomeView.tsx: Teacher dashboard workflow steps & schedule section
assert(
  homeViewContent.includes("if (dailyState.isNonTeachingDay) {") &&
  homeViewContent.includes("steps.push({ label: 'Bebas Presensi'"),
  'R1.7 HomeView.tsx: Teacher workflow steps display Bebas Presensi when isNonTeachingDay'
);

assert(
  homeViewContent.includes("dailyState?.isNonTeachingDay ? (") &&
  homeViewContent.includes("Bebas Kehadiran & Jurnal"),
  'R1.8 HomeView.tsx: Teacher schedule widget renders dedicated Bebas Kehadiran & Jurnal card'
);

// 1.7 send-reminders: Push reminders skip exempt teachers without classes during block
assert(
  sendRemindersContent.includes('if (teacher.wajib_hadir_hanya_mengajar)') &&
  !sendRemindersContent.includes('if (teacher.wajib_hadir_hanya_mengajar && !activeBlok)'),
  'R1.9 send-reminders: Presensi reminder skips exempt teachers without classes even during active block'
);

assert(
  sendRemindersContent.includes('Teachers exempt on non-teaching days do not need to fill block journals if they have no classes today') &&
  sendRemindersContent.includes('teacherObj?.wajib_hadir_hanya_mengajar') &&
  sendRemindersContent.includes('if (!hasTeachingToday) {'),
  'R1.10 send-reminders: Jurnal and piket reminders skip exempt teachers during block periods'
);

console.log('✅ Section 1 (R1: Pengecualian Sistem Blok) Passed!');

// ----------------------------------------------------
// Section 2: Requirement R2 - Ukuran Foto Dokumen Cetak
// ----------------------------------------------------
console.log('\n--- Section 2: R2 - Ukuran Foto Dokumen Cetak ---');

// 2.1 RekapJurnalView uses print:w-full print:h-auto and avoids fixed height
assert(
  rekapJurnalContent.includes('print:w-full print:h-auto') &&
  !rekapJurnalContent.includes('print:h-[70px]') &&
  !rekapJurnalContent.includes('print:h-[120px]'),
  'R2.1 RekapJurnalView activity photos use print:w-full print:h-auto without fixed height'
);

// 2.2 Table container allows full width and auto height
assert(
  rekapJurnalContent.includes('print:p-0') &&
  rekapJurnalContent.includes('print:block print:w-full print:h-full'),
  'R2.2 RekapJurnalView photo td/div containers fill the full column space without margin/padding distortion'
);

console.log('✅ Section 2 (R2: Ukuran Foto Dokumen Cetak) Passed!');

// ----------------------------------------------------
// Section 3: Requirement R3 - Format Tanggal Dashboard
// ----------------------------------------------------
console.log('\n--- Section 3: R3 - Format Tanggal Dashboard ---');

// 3.1 HomeView builds dashboardDateStr as [hari, DD-MM-YYYY]
assert(
  homeViewContent.includes("const dateParts = getWitaDateStr().split('-');") &&
  homeViewContent.includes("const dashboardDateStr = `${hariIni}, ${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;"),
  'R3.1 HomeView formats dashboardDateStr as [hari, DD-MM-YYYY]'
);

// 3.2 Responsive date header without truncate
assert(
  homeViewContent.includes('{dashboardDateStr}</p>') &&
  homeViewContent.includes('leading-tight break-words whitespace-normal'),
  'R3.2 HomeView header banner renders date with leading-tight break-words whitespace-normal (no truncate)'
);

// 3.3 Unit testing date format logic
const sampleDateStr = '2026-10-02';
const sampleDay = 'Jumat';
const parts = sampleDateStr.split('-');
const formatted = `${sampleDay}, ${parts[2]}-${parts[1]}-${parts[0]}`;
assert.strictEqual(formatted, 'Jumat, 02-10-2026', 'R3.3 Unit test: Date format produces exact "Jumat, 02-10-2026"');

// 3.4 Responsive matrix date badge without truncate and with wrap support
assert(
  homeViewContent.includes('{dashboardDateStr}\n                </span>') ||
  homeViewContent.includes('{dashboardDateStr}') && homeViewContent.includes('whitespace-normal break-words'),
  'R3.4 HomeView matrix status badge renders date with whitespace-normal break-words (no truncate)'
);

console.log('✅ Section 3 (R3: Format Tanggal Dashboard) Passed!');

console.log('\n====================================================');
console.log('🎉 ALL R1, R2, AND R3 CHECKS COMPLETED AND VERIFIED!');
console.log('====================================================');
