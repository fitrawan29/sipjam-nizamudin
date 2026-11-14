import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveTeacherAttendancePolicy,
  isJournalEligibleForKbmTeacher,
} from '../src/lib/workflow';

const root = process.cwd();
const rekapPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
const rekapSrc = fs.readFileSync(rekapPath, 'utf8');

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  FAIL: ${name}:`, err?.message || err);
    failed++;
  }
}

console.log('=== TEST: Jurnal Guru Hari & Tanggal Sesuai Kebijakan KBM ===');

check('1. cfgQ di RekapJurnalView memakai select("*") agar tahan schema cache', () => {
  assert.ok(
    rekapSrc.includes("supabase.from('pengaturan').select('*')"),
    'cfgQ harus memakai select("*")'
  );
  assert.ok(
    !rekapSrc.includes("supabase.from('pengaturan').select('key, value, aturan_kehadiran_guru, guru_hanya_mengajar')"),
    'cfgQ tidak boleh memakai select kolom spesifik yang rawan error schema cache'
  );
});

check('2. checkIsHanyaKbm meneruskan preferLegacyListWhenGlobalKbm dan allowSingleWordFirstToken', () => {
  assert.ok(
    rekapSrc.includes("preferLegacyListWhenGlobalKbm: aturanKehadiranGlobal === 'Hari_Mengajar_Saja'"),
    'checkIsHanyaKbm harus meneruskan preferLegacyListWhenGlobalKbm'
  );
  const checkBlockStart = rekapSrc.indexOf('const checkIsHanyaKbm = useCallback(');
  const checkBlockEnd = rekapSrc.indexOf('useEffect(() => {', checkBlockStart);
  const checkBlock = rekapSrc.slice(checkBlockStart, checkBlockEnd);
  assert.ok(
    checkBlock.includes('allowSingleWordFirstToken: true'),
    'isTeacherRecordMatch di checkIsHanyaKbm harus menyertakan allowSingleWordFirstToken: true'
  );
});

check('3. Auto-fetch tarikRekap menunggu isMasterReady sebelum menyintesis hari', () => {
  assert.ok(
    rekapSrc.includes('if (!isMasterReady) return;\n    tarikRekap();') ||
      rekapSrc.includes('if (!isMasterReady) return;\r\n    tarikRekap();'),
    'useEffect tarikRekap harus menunggu isMasterReady === true'
  );
});

check('4. Filter daySchedules menormalkan casing dan spasi s.hari', () => {
  assert.ok(
    rekapSrc.includes("String(s.hari || '').trim().toLowerCase() === dayName.toLowerCase()"),
    'daySchedules harus menormalkan s.hari sebelum membandingkan dengan dayName'
  );
});

check('5. Simulasi guru KBM Rabu & Kamis: Senin/Selasa/Jumat tidak lolos, Rabu/Kamis lolos', () => {
  const teacher = {
    id: 'g-1',
    user_id: 'u-1',
    nama_guru: 'Budi Santoso',
    wajib_hadir_hanya_mengajar: false,
  };
  const schedules = [
    { hari: 'Rabu', kelas: 'X-A', mata_pelajaran: 'Fisika', nama_guru: 'Budi Santoso', user_id: 'u-1' },
    { hari: 'Kamis', kelas: 'X-B', mata_pelajaran: 'Fisika', nama_guru: 'Budi Santoso', user_id: 'u-1' },
  ];
  const assignments = [
    { kelas: 'X-A', nama_mata_pelajaran: 'Fisika' },
    { kelas: 'X-B', nama_mata_pelajaran: 'Fisika' },
  ];

  const policy = resolveTeacherAttendancePolicy({
    teacher,
    weeklySchedules: schedules,
    aturanGlobal: 'Hari_Mengajar_Saja',
    guruHanyaMengajarList: ['g-1'],
    preferLegacyListWhenGlobalKbm: true,
  });
  assert.strictEqual(policy.isTeacherExempt, true, 'Guru dalam daftar KBM harus exempt');

  // 2026-11-09 = Senin, 2026-11-10 = Selasa, 2026-11-11 = Rabu, 2026-11-12 = Kamis, 2026-11-13 = Jumat
  const monSynth = { id: 'unfilled-kegiatan-2026-11-09-u-1', tanggal: '2026-11-09', kelas: '-', mapel: 'Jurnal Kegiatan', keterangan: 'tidak melaksanakan kegiatan apapun' };
  const tueRow = { id: 'j-tue', tanggal: '2026-11-10', kelas: 'X-A', mapel: 'Fisika', keterangan: 'Hadir' };
  const wedRow = { id: 'j-wed', tanggal: '2026-11-11', kelas: 'X-A', mapel: 'Fisika', keterangan: 'Hadir' };
  const thuRow = { id: 'j-thu', tanggal: '2026-11-12', kelas: 'X-B', mapel: 'Fisika', keterangan: 'Hadir' };
  const friSynth = { id: 'unfilled-kegiatan-2026-11-13-u-1', tanggal: '2026-11-13', kelas: '-', mapel: 'Jurnal Kegiatan', keterangan: 'tidak melaksanakan kegiatan apapun' };

  assert.strictEqual(isJournalEligibleForKbmTeacher(monSynth, assignments, schedules), false);
  assert.strictEqual(isJournalEligibleForKbmTeacher(tueRow, assignments, schedules), false);
  assert.strictEqual(isJournalEligibleForKbmTeacher(wedRow, assignments, schedules), true);
  assert.strictEqual(isJournalEligibleForKbmTeacher(thuRow, assignments, schedules), true);
  assert.strictEqual(isJournalEligibleForKbmTeacher(friSynth, assignments, schedules), false);
});

console.log(`\nSummary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
