import assert from 'node:assert';
import {
  isKelasInAngkatan,
  isTimeRangeOverlap,
  parseTimeToMinutes,
  evaluateScheduleBlock
} from '../src/lib/workflow';
import type { SistemBlok } from '../src/types/database';

console.log('====================================================');
console.log('ADVERSARIAL STRESS TEST: SISTEM BLOK WORKFLOW ENGINE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`✅ PASS: ${name}`);
  } catch (err: any) {
    failCount++;
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 1. Stress-Testing isKelasInAngkatan
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Angkatan Token Extraction & Word Boundary Stress ---');

test('Standard SMK/SMA class names match angkatan 10', () => {
  assert.strictEqual(isKelasInAngkatan('X RPL 1', '10'), true);
  assert.strictEqual(isKelasInAngkatan('X-TKJ-2', '10'), true);
  assert.strictEqual(isKelasInAngkatan('10 Merdeka', '10'), true);
  assert.strictEqual(isKelasInAngkatan('Kelas 10 TITL', 'X'), true);
  assert.strictEqual(isKelasInAngkatan('X.1', '10'), true);
});

test('Standard SMK/SMA class names match angkatan 11', () => {
  assert.strictEqual(isKelasInAngkatan('XI RPL 1', '11'), true);
  assert.strictEqual(isKelasInAngkatan('XI-TKJ-2', '11'), true);
  assert.strictEqual(isKelasInAngkatan('11 Merdeka', '11'), true);
  assert.strictEqual(isKelasInAngkatan('Kelas 11 TITL', 'XI'), true);
});

test('Standard SMK/SMA class names match angkatan 12', () => {
  assert.strictEqual(isKelasInAngkatan('XII RPL 1', '12'), true);
  assert.strictEqual(isKelasInAngkatan('XII-TKJ-2', '12'), true);
  assert.strictEqual(isKelasInAngkatan('12 Akuntansi', '12'), true);
  assert.strictEqual(isKelasInAngkatan('Kelas 12 TITL', 'XII'), true);
});

test('Cohort isolation: Grade X never matches XI or XII', () => {
  assert.strictEqual(isKelasInAngkatan('X RPL 1', '11'), false);
  assert.strictEqual(isKelasInAngkatan('X RPL 1', '12'), false);
  assert.strictEqual(isKelasInAngkatan('X RPL 1', 'XI'), false);
  assert.strictEqual(isKelasInAngkatan('X RPL 1', 'XII'), false);
  assert.strictEqual(isKelasInAngkatan('10 TKJ', '11'), false);
  assert.strictEqual(isKelasInAngkatan('10 TKJ', '12'), false);
});

test('Cohort isolation: Grade XI never matches X or XII', () => {
  assert.strictEqual(isKelasInAngkatan('XI RPL 1', '10'), false);
  assert.strictEqual(isKelasInAngkatan('XI RPL 1', '12'), false);
  assert.strictEqual(isKelasInAngkatan('XI RPL 1', 'X'), false);
  assert.strictEqual(isKelasInAngkatan('XI RPL 1', 'XII'), false);
});

test('Cohort isolation: Grade XII never matches X or XI', () => {
  assert.strictEqual(isKelasInAngkatan('XII RPL 1', '10'), false);
  assert.strictEqual(isKelasInAngkatan('XII RPL 1', '11'), false);
  assert.strictEqual(isKelasInAngkatan('XII RPL 1', 'X'), false);
  assert.strictEqual(isKelasInAngkatan('XII RPL 1', 'XI'), false);
});

test('Cohort isolation: Substring and number boundary protection', () => {
  // '10' must not match '1' (SD grade 1)
  assert.strictEqual(isKelasInAngkatan('10 RPL', '1'), false);
  // '1' must not match '10', '11', '12'
  assert.strictEqual(isKelasInAngkatan('1 SD', '10'), false);
  // '100' must not match '10'
  assert.strictEqual(isKelasInAngkatan('Room 100', '10'), false);
});

test('Falsy and malformed inputs to isKelasInAngkatan safely return false', () => {
  assert.strictEqual(isKelasInAngkatan(null, '10'), false);
  assert.strictEqual(isKelasInAngkatan(undefined, '10'), false);
  assert.strictEqual(isKelasInAngkatan('', '10'), false);
  assert.strictEqual(isKelasInAngkatan('   ', '10'), false);
  assert.strictEqual(isKelasInAngkatan('X RPL', ''), false);
});

// -----------------------------------------------------------------------------
// 2. Stress-Testing parseTimeToMinutes & isTimeRangeOverlap
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: Time Calculations & Boundary Overlap Stress ---');

test('parseTimeToMinutes handles standard, dot, and edge inputs', () => {
  assert.strictEqual(parseTimeToMinutes('07:30'), 450);
  assert.strictEqual(parseTimeToMinutes('07.30'), 450);
  assert.strictEqual(parseTimeToMinutes('00:00'), 0);
  assert.strictEqual(parseTimeToMinutes('23:59'), 23 * 60 + 59);
  assert.strictEqual(parseTimeToMinutes(null, 100), 100);
  assert.strictEqual(parseTimeToMinutes(undefined, 200), 200);
  assert.strictEqual(parseTimeToMinutes('invalid', 300), 300);
});

test('Boundary touching intervals do NOT overlap (half-open interval semantics)', () => {
  // Sched: 07:00 - 08:00, Blok: 08:00 - 09:00 -> adjacent, NO overlap
  assert.strictEqual(isTimeRangeOverlap('07:00', '08:00', '08:00', '09:00', false), false);
  // Sched: 09:00 - 10:00, Blok: 08:00 - 09:00 -> adjacent, NO overlap
  assert.strictEqual(isTimeRangeOverlap('09:00', '10:00', '08:00', '09:00', false), false);
});

test('1-minute overlap across boundaries registers as overlapping', () => {
  // Sched: 07:00 - 08:01, Blok: 08:00 - 09:00 -> 1 min overlap
  assert.strictEqual(isTimeRangeOverlap('07:00', '08:01', '08:00', '09:00', false), true);
  // Sched: 08:59 - 10:00, Blok: 08:00 - 09:00 -> 1 min overlap
  assert.strictEqual(isTimeRangeOverlap('08:59', '10:00', '08:00', '09:00', false), true);
});

test('Full day flag always overrides time parameters', () => {
  // Sched: 07:00 - 08:00, Blok: 12:00 - 14:00 BUT isFullDay: true
  assert.strictEqual(isTimeRangeOverlap('07:00', '08:00', '12:00', '14:00', true), true);
  // Missing block times defaults to true (full day)
  assert.strictEqual(isTimeRangeOverlap('07:00', '08:00', null, null, false), true);
});

test('Enclosed and enclosing intervals overlap', () => {
  // Sched inside block
  assert.strictEqual(isTimeRangeOverlap('08:30', '09:30', '08:00', '10:00', false), true);
  // Sched encloses block
  assert.strictEqual(isTimeRangeOverlap('07:00', '12:00', '08:00', '10:00', false), true);
  // Identical intervals
  assert.strictEqual(isTimeRangeOverlap('08:00', '10:00', '08:00', '10:00', false), true);
});

// -----------------------------------------------------------------------------
// 3. Stress-Testing evaluateScheduleBlock with Concurrent Complex Rules
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Multi-Rule Concurrent Evaluation Matrix ---');

const activeRules: SistemBlok[] = [
  // Rule 1: Angkatan 10 morning workshop (07:30 - 10:00)
  {
    id: 'rule-angkatan-10',
    sekolah_id: 'sch-1',
    nama_kegiatan: 'Workshop Robotika Kelas X',
    deskripsi: 'Kegiatan robotika angkatan 10',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
    tipe_target: 'angkatan',
    target_angkatan: '10',
    target_kelas: null,
    target_guru_id: null,
    target_guru_nama: null,
    is_full_day: false,
    jam_mulai: '07:30',
    jam_selesai: '10:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Rule 2: Specific class UKK full-day (XII TITL 1)
  {
    id: 'rule-kelas-xii-titl-1',
    sekolah_id: 'sch-1',
    nama_kegiatan: 'UKK Mandiri XII TITL 1',
    deskripsi: 'Ujian Kejuruan',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
    tipe_target: 'kelas',
    target_angkatan: null,
    target_kelas: 'XII TITL 1',
    target_guru_id: null,
    target_guru_nama: null,
    is_full_day: true,
    jam_mulai: null,
    jam_selesai: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Rule 3: Specific teacher MGMP afternoon (13:00 - 15:30)
  {
    id: 'rule-guru-pak-sukardi',
    sekolah_id: 'sch-1',
    nama_kegiatan: 'MGMP Matematika Guru Sukardi',
    deskripsi: 'Rapat MGMP Wilayah',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
    tipe_target: 'guru',
    target_angkatan: null,
    target_kelas: null,
    target_guru_id: 'uuid-guru-sukardi-999',
    target_guru_nama: 'Drs. Sukardi, M.Pd.',
    is_full_day: false,
    jam_mulai: '13:00',
    jam_selesai: '15:30',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const teacherSukardi = {
  id: 'uuid-guru-sukardi-999',
  nama: 'Drs. Sukardi, M.Pd.',
  user_id: 'usr-sukardi',
};

const teacherRahma = {
  id: 'uuid-guru-rahma-111',
  nama: 'Siti Rahma, S.Kom.',
  user_id: 'usr-rahma',
};

test('Class X morning schedule is blocked by Rule 1 for ANY teacher', () => {
  const schedXMorning = {
    kelas: 'X RPL 1',
    jam_mulai: '08:00',
    jam_selesai: '09:30',
    nama_guru: 'Siti Rahma, S.Kom.',
    guru_id: 'uuid-guru-rahma-111',
  };
  const evalResult = evaluateScheduleBlock(schedXMorning, teacherRahma, activeRules);
  assert.strictEqual(evalResult.isBlocked, true);
  assert.strictEqual(evalResult.blockRule?.id, 'rule-angkatan-10');
});

test('Class X afternoon schedule is UNBLOCKED (after 10:00 morning block window)', () => {
  const schedXAfternoon = {
    kelas: 'X RPL 1',
    jam_mulai: '10:30',
    jam_selesai: '12:00',
    nama_guru: 'Siti Rahma, S.Kom.',
    guru_id: 'uuid-guru-rahma-111',
  };
  const evalResult = evaluateScheduleBlock(schedXAfternoon, teacherRahma, activeRules);
  assert.strictEqual(evalResult.isBlocked, false);
});

test('Class XI morning schedule is UNBLOCKED for Bu Rahma (cohort isolation)', () => {
  const schedXIMorning = {
    kelas: 'XI RPL 2',
    jam_mulai: '08:00',
    jam_selesai: '09:30',
    nama_guru: 'Siti Rahma, S.Kom.',
    guru_id: 'uuid-guru-rahma-111',
  };
  const evalResult = evaluateScheduleBlock(schedXIMorning, teacherRahma, activeRules);
  assert.strictEqual(evalResult.isBlocked, false);
});

test('Class XII TITL 1 is BLOCKED all day for any teacher (Rule 2)', () => {
  const schedXII = {
    kelas: 'XII TITL 1',
    jam_mulai: '11:00',
    jam_selesai: '12:30',
    nama_guru: 'Siti Rahma, S.Kom.',
    guru_id: 'uuid-guru-rahma-111',
  };
  const evalResult = evaluateScheduleBlock(schedXII, teacherRahma, activeRules);
  assert.strictEqual(evalResult.isBlocked, true);
  assert.strictEqual(evalResult.blockRule?.id, 'rule-kelas-xii-titl-1');
});

test('Class XII TITL 2 is UNBLOCKED (class-level precision isolation from XII TITL 1)', () => {
  const schedXIIOther = {
    kelas: 'XII TITL 2',
    jam_mulai: '11:00',
    jam_selesai: '12:30',
    nama_guru: 'Siti Rahma, S.Kom.',
    guru_id: 'uuid-guru-rahma-111',
  };
  const evalResult = evaluateScheduleBlock(schedXIIOther, teacherRahma, activeRules);
  assert.strictEqual(evalResult.isBlocked, false);
});

test('Pak Sukardi afternoon schedule in Class XI is BLOCKED by Teacher Rule 3', () => {
  const schedSukardiAfternoon = {
    kelas: 'XI RPL 2',
    jam_mulai: '13:30',
    jam_selesai: '15:00',
    nama_guru: 'Drs. Sukardi, M.Pd.',
    guru_id: 'uuid-guru-sukardi-999',
  };
  const evalResult = evaluateScheduleBlock(schedSukardiAfternoon, teacherSukardi, activeRules);
  assert.strictEqual(evalResult.isBlocked, true);
  assert.strictEqual(evalResult.blockRule?.id, 'rule-guru-pak-sukardi');
});

test('Pak Sukardi morning schedule in Class XI is UNBLOCKED (before 13:00 MGMP start)', () => {
  const schedSukardiMorning = {
    kelas: 'XI RPL 2',
    jam_mulai: '10:30',
    jam_selesai: '12:00',
    nama_guru: 'Drs. Sukardi, M.Pd.',
    guru_id: 'uuid-guru-sukardi-999',
  };
  const evalResult = evaluateScheduleBlock(schedSukardiMorning, teacherSukardi, activeRules);
  assert.strictEqual(evalResult.isBlocked, false);
});

test('Bu Rahma afternoon schedule in Class XI is UNBLOCKED (teacher isolation from Pak Sukardi)', () => {
  const schedRahmaAfternoon = {
    kelas: 'XI RPL 2',
    jam_mulai: '13:30',
    jam_selesai: '15:00',
    nama_guru: 'Siti Rahma, S.Kom.',
    guru_id: 'uuid-guru-rahma-111',
  };
  const evalResult = evaluateScheduleBlock(schedRahmaAfternoon, teacherRahma, activeRules);
  assert.strictEqual(evalResult.isBlocked, false);
});

test('Teacher matched by name substring when ID differs (fallback resilience)', () => {
  const teacherSukardiNameOnly = {
    id: 'different-local-id',
    nama: 'Sukardi',
  };
  const sched = {
    kelas: 'XI RPL 2',
    jam_mulai: '13:30',
    jam_selesai: '15:00',
    nama_guru: 'Drs. Sukardi, M.Pd.',
  };
  const evalResult = evaluateScheduleBlock(sched, teacherSukardiNameOnly, activeRules);
  assert.strictEqual(evalResult.isBlocked, true);
  assert.strictEqual(evalResult.blockRule?.id, 'rule-guru-pak-sukardi');
});

console.log('\n====================================================');
console.log(`TOTAL ADVERSARIAL STRESS TESTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
