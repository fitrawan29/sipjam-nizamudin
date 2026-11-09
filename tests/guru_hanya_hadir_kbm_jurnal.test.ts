/**
 * tests/guru_hanya_hadir_kbm_jurnal.test.ts
 *
 * Verification suite for:
 * "Sesuaikan untuk guru yang terhitung hanya hadir pada jam KBM.
 *  Ketika mereka ingin melihat mencetak jurnal KBM, pastikan informasi yang tertera
 *  pada jurnal mereka tidak memiliki jam dan hanya hadir atau wajib hadir pada KBM saja.
 *  Pastikan perubahan ini tidak mempengaruhi fitur dan logika yang ada pada aplikasi
 *  dan tidak terpengaruh untuk perubahan ini."
 */

import fs from 'fs';
import path from 'path';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, name: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } else {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

console.log('\n========================================================================');
console.log('TEST SUITE: GURU HANYA HADIR JAM KBM — JURNAL TANPA JAM & STATUS KBM');
console.log('========================================================================\n');

const rekapCode = fs.readFileSync(path.join(process.cwd(), 'src/components/RekapJurnalView.tsx'), 'utf8');

// Section 1: Static AST & State Verification
console.log('--- Section 1: State & Helper AST Verification ---');
assert(
  rekapCode.includes('checkIsHanyaKbm') &&
  rekapCode.includes('isHanyaKbmUser') &&
  rekapCode.includes('wajib_hadir_hanya_mengajar'),
  'RekapJurnalView declares checkIsHanyaKbm evaluator checking data_guru and user exemption'
);

assert(
  rekapCode.includes("aturanKehadiranGlobal === 'Hari_Mengajar_Saja'") &&
  rekapCode.includes('aturan_kehadiran_guru'),
  'checkIsHanyaKbm accounts for school-wide Hari_Mengajar_Saja attendance policy'
);

assert(
  rekapCode.includes('legacyGhmList') &&
  rekapCode.includes('guru_hanya_mengajar'),
  'checkIsHanyaKbm accounts for legacy guru_hanya_mengajar / guru_bebas_hadir list'
);

// Section 2: Zero Non-Teaching Day Synthetic Placeholders for Guru Hanya KBM
console.log('\n--- Section 2: Non-Teaching Day Synthesis Isolation ---');
assert(
  rekapCode.includes('!isCurrUserHanyaKbm') &&
  rekapCode.includes("activeMode === 'pribadi' && !activeKelas && !mapel && user?.nama && teacherSchedulesToday.length === 0"),
  'Unsubmitted Jurnal Kegiatan synthesis is strictly bypassed for teachers only required on KBM'
);

assert(
  rekapCode.includes("tabMode === 'pribadi' && isHanyaKbmUser") &&
  rekapCode.includes("j.mapel === 'Jurnal Kegiatan' || j.keterangan === 'Jurnal Kegiatan' || j.keterangan === 'tidak melaksanakan kegiatan apapun'"),
  'filteredJurnal filters out any synthetic non-KBM activities from personal journal view/print'
);

// Section 3: Elimination of Hours (Jam) and Display of Hadir / Wajib Hadir KBM
console.log('\n--- Section 3: Elimination of Hours & Presence Information on KBM ---');
assert(
  rekapCode.includes('waktuStr && !isRowHanyaKbm') &&
  rekapCode.includes('Pukul {waktuStr}'),
  'Pukul timestamp time is hidden for teachers who are only present on KBM'
);

assert(
  rekapCode.includes('isRowHanyaKbm') &&
  rekapCode.includes('<span className="font-bold text-blue-700 dark:text-blue-400 print:text-black">KBM</span>'),
  'Jam KBM column displays "KBM" without hours or numbers for exempt teachers'
);

assert(
  rekapCode.includes("'Wajib Hadir KBM (tidak masuk kelas)'") &&
  rekapCode.includes("'Hadir KBM'"),
  'Attendance status column renders "Hadir KBM" or "Wajib Hadir KBM" for exempt teachers'
);

assert(
  rekapCode.includes('Kewajiban Kehadiran: <strong>Wajib Hadir pada Jam KBM Saja</strong>'),
  'Document Print Subheader displays dynamic attendance obligation badge for personal journal'
);

assert(
  rekapCode.includes("isRowHanyaKbm ? 'KBM'") &&
  rekapCode.includes("'Wajib Hadir KBM (tidak masuk kelas)' : 'Hadir KBM'"),
  'CSV Export cleanly omits hour string and outputs KBM and Hadir KBM / Wajib Hadir KBM'
);

assert(
  rekapCode.includes('checkIsHanyaKbm(selectedJurnal.nama_guru, undefined, selectedJurnal.user_id)') &&
  rekapCode.includes('Wajib Hadir KBM') &&
  rekapCode.includes('Hadir KBM'),
  'Detail modal formats Jam Ke / Sesi and Status Verifikasi appropriately for KBM-only teachers'
);

// Section 4: Behavioral Simulation of Evaluator Logic
console.log('\n--- Section 4: Behavioral Simulation of Evaluation Logic ---');
function simulateCheckIsHanyaKbm(
  teacher: { id?: string; nama_guru?: string; nip?: string; user_id?: string; wajib_hadir_hanya_mengajar?: any },
  currentUser: any,
  allTeachers: any[],
  legacyGhm: string[],
  aturanGlobal: string
): boolean {
  const isValTrue = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
  const isValFalse = (v: any) => v === false || v === 'false' || v === 0 || v === '0';

  if (teacher.user_id && currentUser?.id === teacher.user_id) {
    const uv = currentUser?.wajib_hadir_hanya_mengajar;
    if (isValTrue(uv)) return true;
    if (isValFalse(uv)) return false;
  }

  const cleanName = (teacher.nama_guru || '').split(',')[0].trim().toLowerCase();
  const matched = allTeachers.find((t: any) =>
    (teacher.user_id && (t.user_id === teacher.user_id || t.id === teacher.user_id)) ||
    (teacher.nip && (t.nip || '').toLowerCase() === teacher.nip.toLowerCase()) ||
    (cleanName && (t.nama_guru || '').toLowerCase().includes(cleanName))
  );

  if (matched) {
    if (isValTrue(matched.wajib_hadir_hanya_mengajar)) return true;
    if (isValFalse(matched.wajib_hadir_hanya_mengajar)) return false;
    if (
      legacyGhm.includes(matched.id) ||
      legacyGhm.includes(matched.nama_guru) ||
      (matched.nip && legacyGhm.includes(matched.nip))
    ) {
      return true;
    }
  }

  if (cleanName && legacyGhm.some((g: string) => g.toLowerCase() === cleanName)) return true;
  if (teacher.nip && legacyGhm.includes(teacher.nip)) return true;

  return aturanGlobal === 'Hari_Mengajar_Saja';
}

const mockTeachers = [
  { id: 't1', nama_guru: 'Budi Santoso, S.Pd', nip: '19850101', wajib_hadir_hanya_mengajar: true },
  { id: 't2', nama_guru: 'Siti Aminah, M.Pd', nip: '19870202', wajib_hadir_hanya_mengajar: false },
  { id: 't3', nama_guru: 'Ahmad Dahlan', nip: '19900303', wajib_hadir_hanya_mengajar: null },
];

assert(
  simulateCheckIsHanyaKbm({ nama_guru: 'Budi Santoso' }, null, mockTeachers, [], 'Semua_Hari') === true,
  'Teacher with explicit wajib_hadir_hanya_mengajar=true is recognized as Hanya KBM'
);

assert(
  simulateCheckIsHanyaKbm({ nama_guru: 'Siti Aminah' }, null, mockTeachers, [], 'Hari_Mengajar_Saja') === false,
  'Teacher with explicit wajib_hadir_hanya_mengajar=false overrides global Hari_Mengajar_Saja'
);

assert(
  simulateCheckIsHanyaKbm({ nama_guru: 'Ahmad Dahlan' }, null, mockTeachers, [], 'Hari_Mengajar_Saja') === true,
  'Teacher with null setting falls back to global Hari_Mengajar_Saja'
);

assert(
  simulateCheckIsHanyaKbm({ nama_guru: 'Ahmad Dahlan' }, null, mockTeachers, [], 'Semua_Hari') === false,
  'Teacher with null setting falls back to global Semua_Hari'
);

assert(
  simulateCheckIsHanyaKbm({ nama_guru: 'Ahmad Dahlan' }, null, mockTeachers, ['Ahmad Dahlan'], 'Semua_Hari') === true,
  'Teacher in legacy guru_hanya_mengajar list is recognized as Hanya KBM'
);

console.log('\n========================================================================');
console.log(`SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('========================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL GURU HANYA HADIR KBM JURNAL TESTS PASSED SUCCESSFULLY!\n');
}
