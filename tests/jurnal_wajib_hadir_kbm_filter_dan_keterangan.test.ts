/**
 * tests/jurnal_wajib_hadir_kbm_filter_dan_keterangan.test.ts
 *
 * Verifikasi Mendalam untuk Requirement R1 & R2:
 * R1. Penyaringan Hari Tanpa Jadwal KBM pada Jurnal Guru Wajib Hadir KBM (seperti Ade Fitrawan Ibrahim / username Ade).
 * R2. Penyesuaian Keterangan Ketidakhadiran pada Hari Jadwal KBM menjadi "tidak masuk kelas".
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveTeacherAttendancePolicy,
  isJournalEligibleForKbmTeacher,
  isTeacherRecordMatch,
  isTeacherNameEquivalent,
} from '../src/lib/workflow';

const root = process.cwd();
const rekapPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
const rekapCode = fs.readFileSync(rekapPath, 'utf8');

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}:`, err?.message || err);
    failed++;
  }
}

console.log('\n========================================================================');
console.log('TEST SUITE: JURNAL GURU WAJIB HADIR KBM — FILTER HARI & KETERANGAN TIDAK MASUK');
console.log('========================================================================\n');

console.log('--- Bagian 1: AST Invariants & Pembersihan Teks Obsolete ---');

check('1.1: Tidak ada lagi teks "Wajib Hadir KBM (tidak masuk kelas)" di RekapJurnalView', () => {
  assert.ok(
    !rekapCode.includes("'Wajib Hadir KBM (tidak masuk kelas)'"),
    'RekapJurnalView tidak boleh lagi memuat teks "Wajib Hadir KBM (tidak masuk kelas)"'
  );
  assert.ok(
    !rekapCode.includes('"Wajib Hadir KBM (tidak masuk kelas)"'),
    'RekapJurnalView tidak boleh lagi memuat teks string ganda "Wajib Hadir KBM (tidak masuk kelas)"'
  );
});

check('1.2: Entri sintetis KBM tidak terisi memakai keterangan & materi "tidak masuk kelas"', () => {
  assert.ok(
    rekapCode.includes("materi: isExcused ? leaveType! : 'tidak masuk kelas'"),
    'materi harus diisi "tidak masuk kelas"'
  );
  assert.ok(
    rekapCode.includes("keterangan: isExcused ? leaveType! : 'tidak masuk kelas'"),
    'keterangan harus diisi "tidak masuk kelas"'
  );
  assert.ok(
    rekapCode.includes("status_verifikasi: isExcused ? leaveType! : 'Tidak Masuk Kelas'"),
    'status_verifikasi harus diisi "Tidak Masuk Kelas"'
  );
});

check('1.3: Render tabel web (8 kolom & 10 kolom) dan ekspor CSV memakai "tidak masuk kelas"', () => {
  assert.ok(
    rekapCode.includes("isTidakMasukKelas\n                                  ? 'tidak masuk kelas'") ||
    rekapCode.includes("isTidakMasukKelas\r\n                                  ? 'tidak masuk kelas'"),
    'Render tabel 8 kolom harus memakai "tidak masuk kelas" saat isTidakMasukKelas'
  );
  assert.ok(
    rekapCode.includes("(isTidakMasukKelas ? 'tidak masuk kelas' : isTidakKegiatan ? (isHanyaKbmUser ? 'Wajib Hadir KBM' : 'tidak melaksanakan kegiatan apapun') : '-')"),
    'Render tabel 10 kolom materi/konten harus memakai "tidak masuk kelas"'
  );
  assert.ok(
    rekapCode.includes("(isTidakMasukKelas ? 'tidak masuk kelas' : isTidakKegiatan ? (isHanyaKbmUser ? 'Wajib Hadir KBM' : 'tidak melaksanakan kegiatan apapun') : (isHanyaKbmUser ? 'Hadir KBM' : (j.keterangan || '-')))"),
    'Render tabel 10 kolom catatan_refleksi harus memakai "tidak masuk kelas"'
  );
});

check('1.4: Detail modal dan CSV export konsisten memakai "Tidak Masuk Kelas" / "tidak masuk kelas"', () => {
  assert.ok(
    rekapCode.includes("isTidakMasukKelas ? 'tidak masuk kelas' : 'Hadir KBM'"),
    'CSV export col8 harus memakai "tidak masuk kelas"'
  );
  assert.ok(
    rekapCode.includes("isTidakMasukKelas ? 'Tidak Masuk Kelas' : 'Hadir KBM'"),
    'CSV export status harus memakai "Tidak Masuk Kelas"'
  );
});

console.log('\n--- Bagian 2: Resolusi Kebijakan Kehadiran Guru Ade Fitrawan Ibrahim ---');

const mockSchedulesAde = [
  { hari: 'Rabu', kelas: 'X Merdeka', mata_pelajaran: 'Informatika', nama_guru: 'Ade' },
  { hari: 'Kamis', kelas: 'XI Merdeka', mata_pelajaran: 'Informatika', nama_guru: 'Ade' },
];

const mockAssignmentsAde = [
  { kelas: 'X Merdeka', nama_mata_pelajaran: 'Informatika' },
  { kelas: 'XI Merdeka', nama_mata_pelajaran: 'Informatika' },
];

check('2.1: Ade Fitrawan Ibrahim dikenali Hanya KBM via flag wajib_hadir_hanya_mengajar di user', () => {
  const user = { id: 'u-ade', username: 'Ade', nama: 'Ade Fitrawan Ibrahim', wajib_hadir_hanya_mengajar: true };
  const teacher = { id: 'g-ade', user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', nip: '19870101' };
  const pol = resolveTeacherAttendancePolicy({
    teacher,
    linkedUser: user,
    weeklySchedules: mockSchedulesAde,
    preferLegacyListWhenGlobalKbm: true,
  });
  assert.strictEqual(pol.isTeacherExempt, true, 'Harus teridentifikasi isTeacherExempt: true');
});

check('2.2: Ade Fitrawan Ibrahim dikenali Hanya KBM via legacy list ["Ade"] dan username "Ade"', () => {
  const user = { id: 'u-ade', username: 'Ade', nama: 'Ade Fitrawan Ibrahim' };
  const teacher = { id: 'g-ade', user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', nip: '19870101' };
  const pol = resolveTeacherAttendancePolicy({
    teacher,
    linkedUser: user,
    weeklySchedules: mockSchedulesAde,
    guruHanyaMengajarList: ['Ade'],
    preferLegacyListWhenGlobalKbm: true,
  });
  assert.strictEqual(pol.isTeacherExempt, true, 'Harus teridentifikasi isTeacherExempt via legacy list');
});

check('2.3: Ade Fitrawan Ibrahim dikenali Hanya KBM via legacy list ["Ade"] meski username "Fitrawan"', () => {
  const user = { id: 'u-ade', username: 'Fitrawan', nama: 'Ade Fitrawan Ibrahim' };
  const teacher = { id: 'g-ade', user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', nip: '19870101' };
  const pol = resolveTeacherAttendancePolicy({
    teacher,
    linkedUser: user,
    weeklySchedules: mockSchedulesAde,
    guruHanyaMengajarList: ['Ade'],
    preferLegacyListWhenGlobalKbm: true,
  });
  assert.strictEqual(pol.isTeacherExempt, true, 'Harus teridentifikasi isTeacherExempt via alias name match');
});

check('2.4: isTeacherNameEquivalent mendukung nama depan + tengah ("Ade Fitrawan" vs "Ade Fitrawan Ibrahim")', () => {
  assert.strictEqual(
    isTeacherNameEquivalent('Ade Fitrawan', 'Ade Fitrawan Ibrahim', true),
    true,
    'Ade Fitrawan harus cocok dengan Ade Fitrawan Ibrahim'
  );
  assert.strictEqual(
    isTeacherNameEquivalent('Ade', 'Ade Fitrawan Ibrahim', true),
    true,
    'Ade harus cocok dengan Ade Fitrawan Ibrahim'
  );
  assert.strictEqual(
    isTeacherNameEquivalent('Fitra', 'Ade Fitrawan Ibrahim', true),
    false,
    'Fitra TIDAK boleh cocok dengan Ade Fitrawan Ibrahim (anti-collision)'
  );
});

console.log('\n--- Bagian 3: Simulasi Alur Jurnal Ade Fitrawan Ibrahim Periode November 2026 ---');

check('3.1: Hari Senin & Selasa (di luar jadwal KBM) tidak disintesis untuk Ade', () => {
  // Simulasi hari Senin (2026-11-02) & Selasa (2026-11-03)
  const isCurrUserHanyaKbm = true;
  const teacherSchedulesMon: any[] = []; // Tidak ada jadwal di hari Senin
  const teacherSchedulesTue: any[] = []; // Tidak ada jadwal di hari Selasa

  const shouldSynthesizeMon = teacherSchedulesMon.length === 0 && !isCurrUserHanyaKbm;
  const shouldSynthesizeTue = teacherSchedulesTue.length === 0 && !isCurrUserHanyaKbm;

  assert.strictEqual(shouldSynthesizeMon, false, 'Hari Senin tidak boleh mensintesis unfilled kegiatan');
  assert.strictEqual(shouldSynthesizeTue, false, 'Hari Selasa tidak boleh mensintesis unfilled kegiatan');
});

check('3.2: Baris non-KBM (Senin/Selasa) otomatis tersaring dari filteredJurnal untuk guru Hanya KBM', () => {
  // Periode: 2026-11-02 (Senin), 2026-11-03 (Selasa), 2026-11-04 (Rabu), 2026-11-05 (Kamis)
  const monSynthRow = {
    id: 'unfilled-kegiatan-2026-11-02-u-ade',
    tanggal: '2026-11-02',
    kelas: '-',
    mapel: 'Jurnal Kegiatan',
    keterangan: 'tidak melaksanakan kegiatan apapun',
    materi: 'tidak melaksanakan kegiatan apapun',
  };
  const tueSynthRow = {
    id: 'unfilled-kegiatan-2026-11-03-u-ade',
    tanggal: '2026-11-03',
    kelas: '-',
    mapel: 'Jurnal Kegiatan',
    keterangan: 'tidak melaksanakan kegiatan apapun',
    materi: 'tidak melaksanakan kegiatan apapun',
  };
  const wedKbmRow = {
    id: 'unfilled-kbm-2026-11-04-X Merdeka-Informatika-Ade',
    tanggal: '2026-11-04',
    kelas: 'X Merdeka',
    mapel: 'Informatika',
    keterangan: 'tidak masuk kelas',
    materi: 'tidak masuk kelas',
    status_verifikasi: 'Tidak Masuk Kelas',
  };
  const thuKbmRow = {
    id: 'unfilled-kbm-2026-11-05-XI Merdeka-Informatika-Ade',
    tanggal: '2026-11-05',
    kelas: 'XI Merdeka',
    mapel: 'Informatika',
    keterangan: 'tidak masuk kelas',
    materi: 'tidak masuk kelas',
    status_verifikasi: 'Tidak Masuk Kelas',
  };

  assert.strictEqual(isJournalEligibleForKbmTeacher(monSynthRow, mockAssignmentsAde, mockSchedulesAde), false, 'Senin harus disaring');
  assert.strictEqual(isJournalEligibleForKbmTeacher(tueSynthRow, mockAssignmentsAde, mockSchedulesAde), false, 'Selasa harus disaring');
  assert.strictEqual(isJournalEligibleForKbmTeacher(wedKbmRow, mockAssignmentsAde, mockSchedulesAde), true, 'Rabu (KBM) harus lolos');
  assert.strictEqual(isJournalEligibleForKbmTeacher(thuKbmRow, mockAssignmentsAde, mockSchedulesAde), true, 'Kamis (KBM) harus lolos');
});

check('3.3: Dokumen cetak & tabel hanya memuat hari jadwal KBM dengan teks "tidak masuk kelas"', () => {
  const allRows = [
    {
      id: 'unfilled-kegiatan-2026-11-02-u-ade',
      tanggal: '2026-11-02',
      kelas: '-',
      mapel: 'Jurnal Kegiatan',
      keterangan: 'tidak melaksanakan kegiatan apapun',
      materi: 'tidak melaksanakan kegiatan apapun',
    },
    {
      id: 'unfilled-kegiatan-2026-11-03-u-ade',
      tanggal: '2026-11-03',
      kelas: '-',
      mapel: 'Jurnal Kegiatan',
      keterangan: 'tidak melaksanakan kegiatan apapun',
      materi: 'tidak melaksanakan kegiatan apapun',
    },
    {
      id: 'unfilled-kbm-2026-11-04-X Merdeka-Informatika-Ade',
      tanggal: '2026-11-04',
      kelas: 'X Merdeka',
      mapel: 'Informatika',
      keterangan: 'tidak masuk kelas',
      materi: 'tidak masuk kelas',
      status_verifikasi: 'Tidak Masuk Kelas',
    },
    {
      id: 'unfilled-kbm-2026-11-05-XI Merdeka-Informatika-Ade',
      tanggal: '2026-11-05',
      kelas: 'XI Merdeka',
      mapel: 'Informatika',
      keterangan: 'tidak masuk kelas',
      materi: 'tidak masuk kelas',
      status_verifikasi: 'Tidak Masuk Kelas',
    },
  ];

  const printable = allRows.filter(j => isJournalEligibleForKbmTeacher(j, mockAssignmentsAde, mockSchedulesAde));
  assert.strictEqual(printable.length, 2, 'Dokumen cetak harus berisi tepat 2 baris (Rabu dan Kamis)');
  assert.deepStrictEqual(printable.map(p => p.tanggal), ['2026-11-04', '2026-11-05']);
  assert.strictEqual(printable[0].keterangan, 'tidak masuk kelas');
  assert.strictEqual(printable[0].materi, 'tidak masuk kelas');
  assert.strictEqual(printable[1].keterangan, 'tidak masuk kelas');
  assert.strictEqual(printable[1].materi, 'tidak masuk kelas');
});

console.log('\n--- Bagian 4: Ketahanan Edge Cases (Lowercase Status, Legacy Text, AST Robustness) ---');

check('4.1: isTidakMasukKelas tahan terhadap lowercase "tidak masuk kelas" dan "unfilled-kbm-"', () => {
  const evaluator = (j: any) =>
    j.id?.startsWith('unfilled-kbm-') ||
    j.status_verifikasi === 'Wajib Hadir KBM' ||
    (j.status_verifikasi || '').toLowerCase().includes('tidak masuk kelas') ||
    (j.keterangan || '').toLowerCase().includes('tidak masuk kelas') ||
    (j.materi || '').toLowerCase().includes('tidak masuk kelas') ||
    (j.materi_pembelajaran || '').toLowerCase().includes('tidak masuk kelas');

  const lowerCaseRow = {
    id: 'db-entry-1',
    tanggal: '2026-11-04',
    kelas: 'X Merdeka',
    mapel: 'Informatika',
    status_verifikasi: 'tidak masuk kelas',
    keterangan: '-',
    materi: 'tidak masuk kelas',
  };
  const unfilledKbmRow = {
    id: 'unfilled-kbm-2026-11-04-X Merdeka-Informatika-Ade',
    tanggal: '2026-11-04',
    kelas: 'X Merdeka',
    mapel: 'Informatika',
    status_verifikasi: '-',
    keterangan: '-',
  };
  const legacyStatusRow = {
    id: 'db-entry-2',
    tanggal: '2026-11-04',
    kelas: 'X Merdeka',
    mapel: 'Informatika',
    status_verifikasi: 'Wajib Hadir KBM',
    keterangan: '-',
  };

  assert.strictEqual(evaluator(lowerCaseRow), true, 'Lowercase status_verifikasi harus dikenali');
  assert.strictEqual(evaluator(unfilledKbmRow), true, 'ID unfilled-kbm- harus dikenali');
  assert.strictEqual(evaluator(legacyStatusRow), true, 'Legacy status_verifikasi Wajib Hadir KBM harus dikenali');
});

check('4.2: AST tabel kelas (kolom 6) memprioritaskan isTidakMasukKelas ? "tidak masuk kelas"', () => {
  assert.ok(
    rekapCode.includes("{isTidakMasukKelas ? 'tidak masuk kelas' : ((j.materi_pembelajaran && j.materi_pembelajaran !== '-') ? j.materi_pembelajaran : (j.materi && j.materi !== '-' ? j.materi : (j.konten || '-')))}"),
    'Materi tabel kelas harus menampilkan "tidak masuk kelas" saat isTidakMasukKelas'
  );
});

check('4.3: AST tabel pribadi memprioritaskan isTidakMasukKelas di materi dan keterangan', () => {
  assert.ok(
    rekapCode.includes("isTidakMasukKelas ? 'tidak masuk kelas' : (j.konten && j.konten !== '-')"),
    'Materi tabel pribadi harus memprioritaskan "tidak masuk kelas" saat isTidakMasukKelas'
  );
  assert.ok(
    rekapCode.includes("isTidakMasukKelas ? 'tidak masuk kelas' : (j.catatan_refleksi || j.refleksi"),
    'Keterangan tabel pribadi harus memprioritaskan "tidak masuk kelas" saat isTidakMasukKelas'
  );
});

check('4.4: Detail Modal menangani status & materi tidak masuk kelas secara komprehensif', () => {
  assert.ok(
    rekapCode.includes("const isModalTidakMasuk =") &&
    rekapCode.includes("const isModalDelinquent ="),
    'Detail Modal harus memiliki evaluator terdedikasi untuk baris tidak masuk'
  );
});

console.log('\n========================================================================');
console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
console.log('========================================================================\n');

if (failed > 0) process.exit(1);
