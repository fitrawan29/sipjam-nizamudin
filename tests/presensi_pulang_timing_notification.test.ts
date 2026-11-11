import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { parseTimeToMinutes, getWitaTimeStr, getWitaDayName } from '../src/lib/wita';
import { evaluatePresensiPulangTiming } from '../src/lib/workflow';

console.log('========================================================================');
console.log('🧪 TEST SUITE: PEMBERITAHUAN PRESENSI PULANG SESUAI JADWAL OPERASIONAL');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err?.message || err}`);
    failed++;
  }
}

// ----------------------------------------------------
// Section 1: parseTimeToMinutes utility test
// ----------------------------------------------------
console.log('--- Section 1: parseTimeToMinutes Normalization ---');

runTest('1.1: Standard 24-hour formats (11:00, 14:30, 06:45)', () => {
  assert.strictEqual(parseTimeToMinutes('11:00'), 660);
  assert.strictEqual(parseTimeToMinutes('14:30'), 870);
  assert.strictEqual(parseTimeToMinutes('06:45'), 405);
  assert.strictEqual(parseTimeToMinutes('00:00'), 0);
  assert.strictEqual(parseTimeToMinutes('23:59'), 1439);
});

runTest('1.2: Dot notation formats (11.00, 14.30)', () => {
  assert.strictEqual(parseTimeToMinutes('11.00'), 660);
  assert.strictEqual(parseTimeToMinutes('14.30'), 870);
});

runTest('1.3: Handling whitespace, null, undefined, and empty string', () => {
  assert.strictEqual(parseTimeToMinutes(null), 0);
  assert.strictEqual(parseTimeToMinutes(undefined), 0);
  assert.strictEqual(parseTimeToMinutes(''), 0);
  assert.strictEqual(parseTimeToMinutes('   '), 0);
  assert.strictEqual(parseTimeToMinutes('  11:00  '), 660);
});

// ----------------------------------------------------
// Section 2: evaluatePresensiPulangTiming Logic
// ----------------------------------------------------
console.log('\n--- Section 2: evaluatePresensiPulangTiming Logic ---');

const baseJamPresensi = {
  datangMulai: '06:45',
  datangBatas: '07:15',
  datangAkhir: '08:00',
  pulangMulai: '11:00',
  pulangJumat: '10:30',
  pulangAkhir: '22:00',
  effectivePulangMulai: '11:00',
};

runTest('2.1: Before Pulang Window (e.g. 09:30 WITA with start 11:00)', () => {
  const customNow = new Date('2026-11-11T09:30:00+08:00');
  const result = evaluatePresensiPulangTiming(baseJamPresensi, customNow);
  assert.strictEqual(result.isBefore, true, 'Must flag isBefore=true when before 11:00');
  assert.strictEqual(result.isOpen, false, 'Must flag isOpen=false when before 11:00');
  assert.strictEqual(result.isAfter, false, 'Must flag isAfter=false when before 11:00');
  assert.strictEqual(result.effectivePulangMulai, '11:00');
});

runTest('2.2: Within Pulang Window (e.g. 11:15 WITA and 14:00 WITA)', () => {
  const at1115 = new Date('2026-11-11T11:15:00+08:00');
  const res1115 = evaluatePresensiPulangTiming(baseJamPresensi, at1115);
  assert.strictEqual(res1115.isBefore, false);
  assert.strictEqual(res1115.isOpen, true);
  assert.strictEqual(res1115.isAfter, false);

  const at1400 = new Date('2026-11-11T14:00:00+08:00');
  const res1400 = evaluatePresensiPulangTiming(baseJamPresensi, at1400);
  assert.strictEqual(res1400.isBefore, false);
  assert.strictEqual(res1400.isOpen, true);
  assert.strictEqual(res1400.isAfter, false);
});

runTest('2.3: After Pulang Window (e.g. 22:30 WITA with end 22:00)', () => {
  const afterClose = new Date('2026-11-11T22:30:00+08:00');
  const result = evaluatePresensiPulangTiming(baseJamPresensi, afterClose);
  assert.strictEqual(result.isBefore, false);
  assert.strictEqual(result.isOpen, false);
  assert.strictEqual(result.isAfter, true);
});

runTest('2.4: Fallback to defaults when jamPresensi is undefined or empty', () => {
  const morning = new Date('2026-11-11T08:00:00+08:00');
  const resDefault = evaluatePresensiPulangTiming(null, morning);
  assert.strictEqual(resDefault.isBefore, true, 'Default pulangMulai 11:00 should identify 08:00 as isBefore=true');
  assert.strictEqual(resDefault.effectivePulangMulai, '11:00');
  assert.strictEqual(resDefault.pulangAkhir, '22:00');
});

// ----------------------------------------------------
// Section 3: HomeViewGuru.tsx Invariant & Message Verifications
// ----------------------------------------------------
console.log('\n--- Section 3: HomeViewGuru.tsx Invariants & NextAction Banner ---');

const root = path.resolve(__dirname, '..');
const homeGuruSrc = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewGuru.tsx'), 'utf8');

runTest('3.1: HomeViewGuru imports evaluatePresensiPulangTiming & parseTimeToMinutes', () => {
  assert.ok(homeGuruSrc.includes('evaluatePresensiPulangTiming'), 'Must import evaluatePresensiPulangTiming');
  assert.ok(homeGuruSrc.includes('parseTimeToMinutes'), 'Must import parseTimeToMinutes');
});

runTest('3.2: HomeViewGuru getNextAction contains conditioned message before opening time', () => {
  assert.ok(
    homeGuruSrc.includes('Semua tugas selesai! Presensi Pulang dibuka pukul ${effectivePulangMulai} WITA.'),
    'HomeViewGuru must render informational banner with opening time when before checkout window'
  );
  assert.ok(
    homeGuruSrc.includes('Semua tugas selesai! Silakan lakukan Presensi Pulang.'),
    'HomeViewGuru must preserve active prompt when checkout window is open'
  );
  assert.ok(
    homeGuruSrc.includes('Waktu Presensi Pulang hari ini telah berakhir'),
    'HomeViewGuru must inform when checkout window has expired'
  );
});

runTest('3.3: HomeViewGuru Step Tracker updates Step 4 status when before checkout window', () => {
  assert.ok(
    homeGuruSrc.includes('Semua tugas selesai · Dibuka pukul ${effectivePulangMulai} WITA'),
    'Step 4 detail must clearly show opening time when all tasks are complete before checkout time'
  );
  assert.ok(
    homeGuruSrc.includes("status: 'locked'"),
    'Step 4 status must remain locked while waiting for checkout opening time'
  );
  assert.ok(
    homeGuruSrc.includes('Semua tugas selesai, silakan absen pulang'),
    'Step 4 active detail must be preserved when open'
  );
  assert.ok(
    homeGuruSrc.includes('Selesaikan semua tugas terlebih dahulu'),
    'Step 4 locked detail when duties are missing must be preserved'
  );
});

runTest('3.4: HomeViewGuru BK role preserves schedule awareness', () => {
  assert.ok(
    homeGuruSrc.includes('Jurnal BK hari ini sudah tercatat') &&
    homeGuruSrc.includes('Presensi Pulang dibuka pukul ${effectivePulangMulai} WITA.'),
    'Guru BK must also be informed of the presensi pulang opening time when before window'
  );
});

// ----------------------------------------------------
// Section 4: HomeViewTU.tsx Invariant & Message Verifications
// ----------------------------------------------------
console.log('\n--- Section 4: HomeViewTU.tsx Invariants & NextAction Banner ---');

const homeTuSrc = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewTU.tsx'), 'utf8');

runTest('4.1: HomeViewTU checks isBeforePulang before checkout prompt', () => {
  assert.ok(
    homeTuSrc.includes('Jurnal kegiatan dan piket telah lengkap! Presensi Pulang dibuka pukul ${jamPresensi.effectivePulangMulai} WITA.'),
    'HomeViewTU must inform TU staff of opening time when tasks completed early'
  );
  assert.ok(
    homeTuSrc.includes('Jurnal kegiatan dan piket telah lengkap! Silakan lakukan Presensi Pulang sebelum meninggalkan sekolah.'),
    'HomeViewTU must prompt checkout only when within checkout window'
  );
});

runTest('4.2: HomeViewTU Step Tracker reflects opening time for Step 4', () => {
  assert.ok(
    homeTuSrc.includes('Tugas administrasi selesai · Dibuka pukul ${jamPresensi.effectivePulangMulai} WITA'),
    'HomeViewTU Step 4 must show opening time when before checkout window'
  );
});

// ----------------------------------------------------
// Section 5: GuruPresensi.tsx Invariant & Alert Banner
// ----------------------------------------------------
console.log('\n--- Section 5: GuruPresensi.tsx Invariant & Alert Banner ---');

const guruPresensiSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf8');

runTest('5.1: GuruPresensi renders informational banner before checkout opening time', () => {
  assert.ok(
    guruPresensiSrc.includes('isPulangBeforeTime'),
    'GuruPresensi must compute isPulangBeforeTime'
  );
  assert.ok(
    guruPresensiSrc.includes('Semua tugas hari ini telah selesai. Presensi Pulang baru dibuka pukul'),
    'GuruPresensi must inform user that duties are done but waiting for checkout window'
  );
  assert.ok(
    guruPresensiSrc.includes("const isPulangLocked = tipeAbsen === 'Pulang' && dailyState && !dailyState.canPresensiPulang;"),
    'GuruPresensi must keep isPulangLocked invariant'
  );
  assert.ok(
    guruPresensiSrc.includes('disabled={loading || isPulangLocked || dailyState?.isLibur}'),
    'GuruPresensi must keep submit button disabled invariant'
  );
});

console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PRESENSI PULANG TIMING & NOTIFICATION TESTS PASSED PERFECTLY!');
}
