import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveTeacherAttendancePolicy,
  getPresensiLeaveCategory,
  isPresensiCoveringDate,
} from '../src/lib/workflow';
import { evaluateTeacherWarningsSync } from '../src/lib/warningSystem';
import { evaluateReminderConditions } from '../src/components/TeacherReminderManager';

const root = process.cwd();
let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✘ FAIL: ${name}:`, err?.message || err);
    failed++;
  }
}

console.log('========================================================================');
console.log('🧪 TEST SUITE: KEBIJAKAN PERORANGAN TANPA DEFAULT & SYNC TIDAK MASUK');
console.log('========================================================================\n');

const sampleJadwal = [
  { id: 'j1', hari: 'Senin', kelas: 'X A', mata_pelajaran: 'Matematika', nama_guru: 'Budi Santoso', user_id: 'u-budi' },
  { id: 'j2', hari: 'Selasa', kelas: 'X B', mata_pelajaran: 'Biologi', nama_guru: 'Siti Aminah', user_id: 'u-siti' },
];

// 1. Penghapusan sistem default sekolah -> murni perorangan
check('1.1: resolveTeacherAttendancePolicy mengabaikan aturanGlobal Hari_Mengajar_Saja bila guru belum disetel perorangan', () => {
  const res = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-budi', user_id: 'u-budi', nama_guru: 'Budi Santoso', wajib_hadir_hanya_mengajar: null },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Hari_Mengajar_Saja',
    guruHanyaMengajarList: [],
  });
  assert.strictEqual(res.isTeacherExempt, false, 'Tanpa pilihan perorangan, aturanGlobal tidak boleh otomatis membuat guru Hadir KBM');
  assert.strictEqual(res.aturanKehadiran, 'Semua_Hari');
});

check('1.2: Guru yang dipilih perorangan Hadir KBM (true) dan guru Wajib Hadir Setiap Hari (false) masing-masing dihormati', () => {
  const resKbm = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-budi', user_id: 'u-budi', nama_guru: 'Budi Santoso', wajib_hadir_hanya_mengajar: true },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Semua_Hari',
  });
  const resEveryDay = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-siti', user_id: 'u-siti', nama_guru: 'Siti Aminah', wajib_hadir_hanya_mengajar: false },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Hari_Mengajar_Saja',
  });
  assert.strictEqual(resKbm.isTeacherExempt, true);
  assert.strictEqual(resEveryDay.isTeacherExempt, false);
});

check('1.3: AdminConfigView tidak lagi menampilkan dropdown default sekolah aturan_kehadiran_guru', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'components', 'AdminConfigView.tsx'), 'utf8');
  assert.ok(!src.includes('name="aturan_kehadiran_guru"'), 'Dropdown default sekolah aturan_kehadiran_guru harus dihapus dari AdminConfigView');
  assert.ok(!src.includes('Default: Hadir Setiap Hari'), 'Opsi default global harus dihapus');
  assert.ok(!src.includes('Default: Sesuai Hari KBM'), 'Opsi default global KBM harus dihapus');
});

// 2. Helper sinkronisasi status tidak masuk (Sakit, Izin, Cuti, Dinas Luar + multi-hari)
check('2.1: getPresensiLeaveCategory & isPresensiCoveringDate mengenali Sakit, Izin, Cuti, Dinas Luar dan rentang multi-hari', () => {
  const cutiMulti = {
    jenis_presensi: 'Cuti',
    status_verifikasi: 'Disetujui',
    tanggal_mulai: '2026-11-10',
    tanggal_selesai: '2026-11-12',
    timestamp: '2026-11-10T07:00:00+08:00',
  };
  assert.strictEqual(getPresensiLeaveCategory(cutiMulti), 'Cuti');
  assert.strictEqual(isPresensiCoveringDate(cutiMulti, '2026-11-11'), true);
  assert.strictEqual(isPresensiCoveringDate(cutiMulti, '2026-11-13'), false);

  const rejected = { jenis_presensi: 'Sakit', status_verifikasi: 'Ditolak', timestamp: '2026-11-10T07:00:00+08:00' };
  assert.strictEqual(getPresensiLeaveCategory(rejected), null);
});

// 3. Sinkronisasi warningSystem pada cuti/izin multi-hari & kebijakan perorangan
check('3.1: warningSystem tidak menghitung pelanggaran Presensi/Jurnal/Piket pada hari ke-2+ cuti/sakit/izin multi-hari', () => {
  const summary = evaluateTeacherWarningsSync(
    'g-siti',
    'Siti Aminah',
    false, // Wajib Hadir Setiap Hari
    'sch-1',
    [{ key: 'hari_sekolah', value: '6' }],
    [],
    [{ id: 'j-selasa', hari: 'Selasa', kelas: 'X B', mata_pelajaran: 'Biologi', nama_guru: 'Siti Aminah' }],
    [{ hari: 'Selasa', guru_nama: 'Siti Aminah', tipe_petugas: 'Guru' }],
    [],
    [
      {
        id: 'p-cuti',
        nama_guru: 'Siti Aminah',
        tipe_absen: 'Datang',
        jenis_presensi: 'Cuti',
        status_verifikasi: 'Disetujui',
        tanggal_mulai: '2026-11-02',
        tanggal_selesai: '2026-11-05',
        timestamp: '2026-11-02T07:00:00+08:00',
      },
    ],
    [],
    [],
    '2026-11'
  );
  // Hari Senin 2026-11-02 s/d Kamis 2026-11-05 berada di rentang cuti -> tidak boleh menjadi streak pelanggaran 4x
  const presensiDates = summary.warnings.filter(w => w.category === 'Presensi').flatMap(w => w.dates);
  const jurnalDates = summary.warnings.filter(w => w.category === 'Jurnal').flatMap(w => w.dates);
  const piketDates = summary.warnings.filter(w => w.category === 'Piket').flatMap(w => w.dates);
  for (const d of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']) {
    assert.ok(!presensiDates.includes(d), `Presensi ${d} seharusnya terlindungi oleh Cuti multi-hari`);
    assert.ok(!jurnalDates.includes(d), `Jurnal ${d} seharusnya terlindungi oleh Cuti multi-hari`);
    assert.ok(!piketDates.includes(d), `Piket ${d} seharusnya terlindungi oleh Cuti multi-hari`);
  }
});

// 4. Sinkronisasi TeacherReminderManager tanpa fallback global default
check('4.1: TeacherReminderManager mengikuti aturan perorangan tanpa fallback global', () => {
  const mockDailyState: any = {
    isLibur: false,
    isIzinSakit: false,
    isNonTeachingDay: false,
    aturanKehadiran: 'Semua_Hari',
    jadwalKBM: [],
    isPiket: false,
    presensiDatang: null,
    presensiPulang: null,
    jurnalKBM: [],
    jurnalKegiatan: null,
    laporanPiket: null,
  };
  const teacherObj = { wajib_hadir_hanya_mengajar: null };
  const now = new Date('2026-11-14T07:30:00+08:00');
  const reminders = evaluateReminderConditions(mockDailyState, { jam_datang_mulai: '06:30', jam_datang_akhir: '09:00' }, now, teacherObj);
  assert.ok(reminders.some(r => r.category === 'presensi'), 'Guru tanpa setelan Hadir KBM tetap wajib diingatkan presensi datang');
});

// 5. Static integration checks across sync points
check('5.1: attendanceAlpa menyinkronkan jurnal/piket saat Alpa dan mendukung Cuti', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'lib', 'attendanceAlpa.ts'), 'utf8');
  assert.ok(src.includes('recordUnfilledJournalsAndPiket'), 'attendanceAlpa harus memiliki recordUnfilledJournalsAndPiket');
  assert.ok(src.includes("'Cuti'"), 'attendanceAlpa harus mendukung status Cuti');
});

check('5.2: AdminRekapView menghitung hari piket pada guru Hadir KBM dan mendukung status Cuti', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'components', 'AdminRekapView.tsx'), 'utf8');
  assert.ok(src.includes("'Cuti'") || src.includes('"Cuti"'), 'AdminRekapView harus menangani status Cuti');
  assert.ok(src.includes('piketDays') || src.includes('isTeacherPiket') || src.includes('teacherPiket'), 'AdminRekapView harus menyertakan hari piket ke totalWajib guru Hadir KBM');
});

check('5.3: send-reminders mengecualikan guru Sakit/Izin/Cuti/Alpa dari reminder jurnal, piket, & pulang', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'app', 'api', 'push', 'send-reminders', 'route.ts'), 'utf8');
  assert.ok(src.includes('getPresensiLeaveCategory') || src.includes('isTeacherOnLeaveOrAlpa'), 'send-reminders harus mengecek status izin/sakit/cuti/alpa secara terpusat');
});

console.log(`\n========================================================================`);
console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
console.log(`========================================================================`);
if (failed > 0) process.exit(1);
