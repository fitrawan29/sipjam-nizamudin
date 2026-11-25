import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { canTeacherPresensiPulang, resolveTeacherAttendancePolicy } from '../src/lib/workflow';

const rootDir = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(rootDir, relPath), 'utf8').replace(/\r\n/g, '\n');
}

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

console.log('========================================================================');
console.log('VERIFIKASI ATURAN BEBAS KBM, JURNAL KEGIATAN, DAN SISTEM BLOK');
console.log('========================================================================');

check('1.1: Guru Hadir KBM (exempt) tanpa jadwal hari ini -> Bebas KBM & Bebas Hadir (normal & Sistem Blok)', () => {
  const policy = resolveTeacherAttendancePolicy({
    teacher: { id: 'g1', nama_guru: 'Guru KBM Saja', wajib_hadir_hanya_mengajar: true },
    totalTeacherKbmCount: 4,
    aturanGlobal: 'Semua_Hari',
  });
  assert.strictEqual(policy.isTeacherExempt, true);

  // Normal day without KBM
  assert.strictEqual(
    canTeacherPresensiPulang({
      presensiDatang: { jenis_presensi: 'Hadir' },
      aturanKehadiran: 'Hari_Mengajar_Saja',
      isNonTeachingDay: true,
      jadwalKBM: [],
      isBlok: false,
      jurnalKegiatan: null,
    }),
    true
  );

  // Sistem Blok day without KBM -> remains Bebas KBM
  assert.strictEqual(
    canTeacherPresensiPulang({
      presensiDatang: { jenis_presensi: 'Hadir' },
      aturanKehadiran: 'Hari_Mengajar_Saja',
      isNonTeachingDay: true,
      jadwalKBM: [],
      isBlok: true,
      jurnalKegiatan: null,
    }),
    true
  );
});

check('1.2: Guru Hadir KBM (exempt) PADA hari mengajarnya saat Sistem Blok -> wajib Jurnal Kegiatan', () => {
  assert.strictEqual(
    canTeacherPresensiPulang({
      presensiDatang: { jenis_presensi: 'Hadir' },
      aturanKehadiran: 'Hari_Mengajar_Saja',
      isNonTeachingDay: false,
      jadwalKBM: [{ kelas: 'X RPL 1', mapel: 'Matematika', isBlocked: true }],
      isBlok: true,
      jurnalKegiatan: null,
    }),
    false
  );

  assert.strictEqual(
    canTeacherPresensiPulang({
      presensiDatang: { jenis_presensi: 'Hadir' },
      aturanKehadiran: 'Hari_Mengajar_Saja',
      isNonTeachingDay: false,
      jadwalKBM: [{ kelas: 'X RPL 1', mapel: 'Matematika', isBlocked: true }],
      isBlok: true,
      jurnalKegiatan: { id: 'jk-1', keterangan: 'Jurnal Kegiatan' },
    }),
    true
  );
});

check('1.3: Guru Wajib Setiap Hari (non-exempt) tanpa KBM hari ini -> wajib Jurnal Kegiatan (normal & Sistem Blok)', () => {
  const policy = resolveTeacherAttendancePolicy({
    teacher: { id: 'g2', nama_guru: 'Guru Reguler', wajib_hadir_hanya_mengajar: false },
    totalTeacherKbmCount: 4,
    aturanGlobal: 'Hari_Mengajar_Saja',
  });
  assert.strictEqual(policy.isTeacherExempt, false);

  // Normal day without KBM, even with piket -> cannot checkout without Jurnal Kegiatan
  assert.strictEqual(
    canTeacherPresensiPulang({
      presensiDatang: { jenis_presensi: 'Hadir' },
      aturanKehadiran: 'Semua_Hari',
      isNonTeachingDay: false,
      isPiket: true,
      laporanPiket: { id: 'p-1' },
      jadwalKBM: [],
      isBlok: false,
      jurnalKegiatan: null,
    }),
    false
  );

  // With Jurnal Kegiatan -> allowed
  assert.strictEqual(
    canTeacherPresensiPulang({
      presensiDatang: { jenis_presensi: 'Hadir' },
      aturanKehadiran: 'Semua_Hari',
      isNonTeachingDay: false,
      isPiket: true,
      laporanPiket: { id: 'p-1' },
      jadwalKBM: [],
      isBlok: false,
      jurnalKegiatan: { id: 'jk-2', keterangan: 'Jurnal Kegiatan' },
    }),
    true
  );

  // Sistem Blok day without KBM -> requires Jurnal Kegiatan
  assert.strictEqual(
    canTeacherPresensiPulang({
      presensiDatang: { jenis_presensi: 'Hadir' },
      aturanKehadiran: 'Semua_Hari',
      isNonTeachingDay: false,
      jadwalKBM: [],
      isBlok: true,
      jurnalKegiatan: null,
    }),
    false
  );
});

check('2.1: HomeViewAdmin menggunakan targetCount === 0 untuk isExemptNonTeaching & wajib Jurnal Kegiatan untuk guru reguler', () => {
  const src = readSrc('src/components/HomeViewAdmin.tsx');
  assert.ok(src.includes('const isExemptNonTeaching = isTeacherExempt && targetCount === 0;'));
  assert.ok(!src.includes('else if (!isNonKbmOrTu && isPiket)'));
});

check('2.2: AdminVerifView unsubmittedJurnal hanya membebaskan guru exempt tanpa jadwal KBM', () => {
  const src = readSrc('src/components/AdminVerifView.tsx');
  assert.ok(src.includes('if (isTeacherExempt && scheduledClasses.length === 0) return false;'));
  assert.ok(src.includes('Jurnal Kegiatan (Wajib Hadir)'));
});

check('2.3: GuruJurnal mengarahkan guru wajib setiap hari tanpa KBM ke Jurnal Kegiatan', () => {
  const src = readSrc('src/components/GuruJurnal.tsx');
  assert.ok(src.includes("!state.isNonTeachingDay &&\n        !(state.aturanKehadiran === 'Hari_Mengajar_Saja'"));
});

check('2.4: send-reminders mengirim Pengingat Jurnal Kegiatan untuk guru reguler tanpa KBM', () => {
  const src = readSrc('src/app/api/push/send-reminders/route.ts');
  assert.ok(src.includes("title: 'Pengingat Jurnal Kegiatan'"));
  assert.ok(src.includes('!isExemptTeacher(teacher) && !isBkAccount(teacher.mata_pelajaran)'));
});

console.log(`\nHASIL: ${passed} LULUS, ${failed} GAGAL`);
if (failed > 0) process.exit(1);
