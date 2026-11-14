import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { isJournalEligibleForKbmTeacher } from '../src/lib/workflow';

const root = process.cwd();
const adminConfigSrc = fs.readFileSync(path.join(root, 'src/components/AdminConfigView.tsx'), 'utf8');
const rekapJurnalSrc = fs.readFileSync(path.join(root, 'src/components/RekapJurnalView.tsx'), 'utf8');
const adminRekapSrc = fs.readFileSync(path.join(root, 'src/components/AdminRekapView.tsx'), 'utf8');
const guruJurnalSrc = fs.readFileSync(path.join(root, 'src/components/GuruJurnal.tsx'), 'utf8');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  FAIL: ${name} -> ${err?.message || err}`);
    failed++;
  }
}

console.log('=== Verifikasi Kebijakan Guru Simpel, Jurnal 5 Hari vs KBM, dan Perbaikan Alur ===');

test('1. AdminConfigView Tab 4 disederhanakan tanpa kartu panduan duplikat', () => {
  assert.ok(!adminConfigSrc.includes('Panduan & Kartu Pilihan Mode Kebijakan Kehadiran Guru'), 'Kartu panduan duplikat harus dihapus');
  assert.ok(adminConfigSrc.includes('role="switch"'), 'Switch toggle per guru tetap ada');
  assert.ok(adminConfigSrc.includes('Set Semua Hanya Hari KBM'), 'Tombol aksi cepat tetap ada');
});

test('2. isJournalEligibleForKbmTeacher memfilter hari non-KBM ketika tanggal tersedia', () => {
  const assignments = [{ kelas: 'X-A', nama_mata_pelajaran: 'Matematika' }];
  const schedules = [{ kelas: 'X-A', mata_pelajaran: 'Matematika', hari: 'Senin' }];

  // 2026-11-09 adalah hari Senin -> lolos
  assert.strictEqual(
    isJournalEligibleForKbmTeacher(
      { tanggal: '2026-11-09', kelas: 'X-A', mapel: 'Matematika', keterangan: 'Jurnal KBM' },
      assignments,
      schedules
    ),
    true
  );

  // 2026-11-10 adalah hari Selasa (bukan hari KBM guru) -> ditolak
  assert.strictEqual(
    isJournalEligibleForKbmTeacher(
      { tanggal: '2026-11-10', kelas: 'X-A', mapel: 'Matematika', keterangan: 'Jurnal KBM' },
      assignments,
      schedules
    ),
    false
  );

  // Sesi INVAL tetap diperbolehkan di hari lain
  assert.strictEqual(
    isJournalEligibleForKbmTeacher(
      { tanggal: '2026-11-10', kelas: 'XI-B', mapel: 'Fisika', keterangan: '[INVAL - Guru B]' },
      assignments,
      schedules
    ),
    true
  );
});

test('3. RekapJurnalView default 5 hari kerja & loop tanggal WITA-safe (T12:00:00+08:00)', () => {
  assert.ok(rekapJurnalSrc.includes('let hariSekolah = 5;'), 'Default hariSekolah harus 5 hari (Senin-Jumat)');
  assert.ok(rekapJurnalSrc.includes('T12:00:00+08:00'), 'Loop tanggal harus menggunakan T12:00:00+08:00 agar bebas DST drift');
});

test('4. AdminRekapView menghitung totalWajib berdasarkan kebijakan guru KBM dan getWitaDayName', () => {
  assert.ok(adminRekapSrc.includes('resolveTeacherAttendancePolicy'), 'AdminRekapView harus mengevaluasi resolveTeacherAttendancePolicy');
  assert.ok(adminRekapSrc.includes('getWitaDayName(cur)'), 'countWorkdays harus memakai getWitaDayName(cur)');
});

test('5. GuruJurnal mengizinkan Jurnal Kegiatan bagi guru wajib setiap hari saat tidak ada KBM hari ini', () => {
  assert.ok(
    guruJurnalSrc.includes('!dailyState?.isNonTeachingDay'),
    'GuruJurnal harus mengarahkan ke Jurnal Kegiatan saat !dailyState?.isNonTeachingDay dan tidak ada jadwal KBM hari ini'
  );
});

console.log(`Hasil: ${passed} LULUS, ${failed} GAGAL`);
if (failed > 0) process.exit(1);
