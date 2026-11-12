import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveSchoolAturanKehadiran,
  resolveSchoolLegacyGhmList,
  resolveTeacherAttendancePolicy,
  parseExplicitBooleanFlag,
  isTuAccount,
  evaluateScheduleBlock,
} from '../src/lib/workflow';

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✘ FAIL: ${name}`, err?.message || err);
    failed++;
  }
}

console.log('========================================================================');
console.log('🧪 VERIFIKASI SINKRONISASI KEBIJAKAN KEHADIRAN & MATRIKS ADMIN');
console.log('========================================================================\n');

// 1. Canonical pengaturan resolution (no stale column poisoning)
check('1.1: resolveSchoolAturanKehadiran memprioritaskan key kanonik daripada kolom row lain', () => {
  const rows = [
    { key: 'jam_pulang_mulai', value: '11:00', aturan_kehadiran_guru: 'Hari_Mengajar_Saja' },
    { key: 'aturan_kehadiran_guru', value: 'Semua_Hari', aturan_kehadiran_guru: 'Hari_Mengajar_Saja' },
  ];
  assert.strictEqual(resolveSchoolAturanKehadiran(rows), 'Semua_Hari');
});

check('1.2: resolveSchoolLegacyGhmList memprioritaskan key kanonik [] daripada kolom legacy usang', () => {
  const rows = [
    { key: 'jam_pulang_mulai', value: '11:00', guru_hanya_mengajar: '["guru-lama"]' },
    { key: 'guru_hanya_mengajar', value: '[]', guru_hanya_mengajar: '["guru-lama"]' },
  ];
  assert.deepStrictEqual(resolveSchoolLegacyGhmList(rows), []);
});

// 2. Bidirectional policy resolution
const sampleJadwal = [
  { id: 'j1', hari: 'Senin', kelas: 'X Merdeka', mata_pelajaran: 'MTK', nama_guru: 'Budi Santoso', user_id: 'u-budi' },
  { id: 'j2', hari: 'Selasa', kelas: 'XI Merdeka', mata_pelajaran: 'PJOK', nama_guru: 'Fitra Suryazana', user_id: 'u-fitra' },
];

check('2.1: Guru wajib hadir setiap hari (wajib_hadir_hanya_mengajar=false) TIDAK terbaca Hanya KBM meski global Hari_Mengajar_Saja & ada di legacy list', () => {
  const res = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-budi', user_id: 'u-budi', nama_guru: 'Budi Santoso', wajib_hadir_hanya_mengajar: false },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Hari_Mengajar_Saja',
    guruHanyaMengajarList: ['g-budi', 'Budi Santoso'],
  });
  assert.strictEqual(res.isTeacherExempt, false);
  assert.strictEqual(res.aturanKehadiran, 'Semua_Hari');
});

check('2.2: Guru wajib hadir setiap hari (string "false" / "0") tetap Wajib Setiap Hari', () => {
  assert.strictEqual(parseExplicitBooleanFlag('false'), false);
  assert.strictEqual(parseExplicitBooleanFlag('0'), false);
  const res = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-budi', user_id: 'u-budi', nama_guru: 'Budi Santoso', wajib_hadir_hanya_mengajar: 'false' },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Hari_Mengajar_Saja',
  });
  assert.strictEqual(res.isTeacherExempt, false);
});

check('2.3: Guru Hanya KBM (wajib_hadir_hanya_mengajar=true / 1 / "1") terbaca Hanya KBM meski global Semua_Hari', () => {
  assert.strictEqual(parseExplicitBooleanFlag(1), true);
  assert.strictEqual(parseExplicitBooleanFlag('1'), true);
  const res = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-budi', user_id: 'u-budi', nama_guru: 'Budi Santoso', wajib_hadir_hanya_mengajar: true },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Semua_Hari',
  });
  assert.strictEqual(res.isTeacherExempt, true);
  assert.strictEqual(res.aturanKehadiran, 'Hari_Mengajar_Saja');
});

check('2.4: Pengaturan eksplisit true pada Kepsek / 0-KBM / TU tetap dihormati (tidak dibalik paksa jadi Wajib Setiap Hari)', () => {
  const res0Kbm = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-kepsek', nama_guru: 'Kepala Sekolah', wajib_hadir_hanya_mengajar: true },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Semua_Hari',
  });
  assert.strictEqual(res0Kbm.isNonKbmOrTu, true);
  assert.strictEqual(res0Kbm.isTeacherExempt, true);
});

check('2.5: Tanpa pengaturan eksplisit (null), staf TU dan guru 0-KBM terlindungi Wajib Setiap Hari meski global Hari_Mengajar_Saja', () => {
  const resTu = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-tu', nama_guru: 'Staf TU', mata_pelajaran: 'Tata Usaha (Administrasi)', wajib_hadir_hanya_mengajar: null },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Hari_Mengajar_Saja',
  });
  assert.strictEqual(isTuAccount(undefined, 'tata_usaha'), true);
  assert.strictEqual(resTu.isNonKbmOrTu, true);
  assert.strictEqual(resTu.isTeacherExempt, false);

  const resUnsetKbm = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-budi', user_id: 'u-budi', nama_guru: 'Budi Santoso', wajib_hadir_hanya_mengajar: null },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Hari_Mengajar_Saja',
  });
  assert.strictEqual(resUnsetKbm.isTeacherExempt, true);
});

check('2.6: Fitra Suryazana tidak bertabrakan dengan Ade Fitrawan Ibrahim atau Assyfa Fitra', () => {
  const resAde = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-ade', user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', wajib_hadir_hanya_mengajar: null },
    weeklySchedules: [{ id: 'j-fitra', hari: 'Senin', kelas: 'X', mata_pelajaran: 'PJOK', nama_guru: 'Fitra' }],
    aturanGlobal: 'Hari_Mengajar_Saja',
  });
  assert.strictEqual(resAde.hasAnyWeeklyKbm, false);
  assert.strictEqual(resAde.isTeacherExempt, false);
});

// 3. Per-schedule & per-teacher Sistem Blok evaluation used in both workflow & HomeViewAdmin
check('3.1: evaluateScheduleBlock memblokir hanya kelas/angkatan sasaran dan membiarkan kelas lain reguler', () => {
  const bloks: any[] = [
    { id: 'b1', nama_kegiatan: 'Ujian XII', tipe_target: 'angkatan', target_angkatan: 'XII', is_full_day: true },
  ];
  const kelasX = evaluateScheduleBlock({ kelas: 'X Merdeka', nama_guru: 'Budi' }, { nama_guru: 'Budi' }, bloks);
  const kelasXII = evaluateScheduleBlock({ kelas: 'XII Merdeka', nama_guru: 'Budi' }, { nama_guru: 'Budi' }, bloks);
  assert.strictEqual(kelasX.isBlocked, false);
  assert.strictEqual(kelasXII.isBlocked, true);
});

// 4. Static integration check across all consumers
check('4.1: Seluruh komponen & library menggunakan resolveTeacherAttendancePolicy / helper terpusat', () => {
  const root = process.cwd();
  const files = [
    'src/lib/workflow.ts',
    'src/components/HomeViewAdmin.tsx',
    'src/components/AdminConfigView.tsx',
    'src/components/AdminVerifView.tsx',
    'src/components/RekapJurnalView.tsx',
    'src/lib/attendanceAlpa.ts',
    'src/lib/warningSystem.ts',
    'src/app/api/push/send-reminders/route.ts',
  ];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.ok(src.includes('resolveTeacherAttendancePolicy'), `${rel} harus menggunakan resolveTeacherAttendancePolicy`);
  }

  const homeAdmin = fs.readFileSync(path.join(root, 'src/components/HomeViewAdmin.tsx'), 'utf8');
  assert.ok(homeAdmin.includes('multiDayLeave'), 'HomeViewAdmin harus mengevaluasi izin/sakit/cuti multi-hari');
  assert.ok(homeAdmin.includes('evaluateScheduleBlock'), 'HomeViewAdmin harus mengevaluasi sistem_blok per guru/jadwal');
  assert.ok(homeAdmin.includes("stVerif === 'Ditolak'") && homeAdmin.includes("pPulang.status_verifikasi === 'Ditolak'"), 'HomeViewAdmin harus menangani presensi ditolak');
  assert.ok(homeAdmin.includes("j.keterangan.includes('Jurnal Kegiatan')"), 'HomeViewAdmin harus mendeteksi Jurnal Kegiatan bertag prefix');
});

console.log(`\nHASIL: ${passed} LULUS, ${failed} GAGAL`);
if (failed > 0) process.exit(1);
