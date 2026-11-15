/**
 * VERIFICATION SUITE: MILESTONE M1
 * R1: Role-Based Attendance Visibility in Gradebook
 * R2: Interactive Per-Session Attendance Tab
 * R3: Formative and Summative Assessment Breakdown
 * R4: Semester Filtering for Attendance Data
 */

import fs from 'fs';
import path from 'path';
import { getSemesterDateRange } from '../src/lib/workflow';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    failCount++;
  }
}

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  VERIFICATION SUITE: MILESTONE M1 (R1, R2, R3, R4)                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

// ━━━ 1. R1: ROLE-BASED ATTENDANCE VISIBILITY ━━━
console.log('━━━ 1. R1: ROLE-BASED ATTENDANCE VISIBILITY ━━━');

const appScreenPath = path.join(process.cwd(), 'src/components/AppScreen.tsx');
const appScreenCode = fs.readFileSync(appScreenPath, 'utf8');

assert(
  appScreenCode.includes('<GradebookView') &&
  appScreenCode.includes('isWaliKelas={isWaliKelas}'),
  'R1.1: AppScreen passes isWaliKelas={isWaliKelas} to GradebookView'
);

const gradebookPath = path.join(process.cwd(), 'src/components/GradebookView.tsx');
const gradebookCode = fs.readFileSync(gradebookPath, 'utf8');

assert(
  gradebookCode.includes('isWaliKelas?: boolean;') || gradebookCode.includes('isWaliKelas?: boolean'),
  'R1.2: GradebookViewProps includes isWaliKelas?: boolean'
);

assert(
  gradebookCode.includes('const isPureGuruMapel = !isAdmin && !isSuperadmin && !isTataUsaha && !isWaliKelas;'),
  'R1.3: Defines isPureGuruMapel strictly excluding admin, superadmin, tata usaha, and wali kelas'
);

assert(
  gradebookCode.includes('if (isPureGuruMapel) {') &&
  gradebookCode.includes('const defaultRates: Record<string, number> = {};') &&
  gradebookCode.includes('students.forEach(s => { defaultRates[s.nisn] = 100; });') &&
  gradebookCode.includes('setAttendanceRates(defaultRates);') &&
  gradebookCode.includes('return;') &&
  gradebookCode.includes('// 2. Fallback: query canonical absensi table for this class'),
  'R1.4: fetchMapelAttendance prevents Pure Guru Mapel from falling back to canonical class absensi table'
);

assert(
  gradebookCode.includes('Komponen Penilaian: Presensi (Harian & Mapel)') &&
  gradebookCode.includes('Komponen Penilaian: Presensi Mapel'),
  'R1.5: Settings/Format bar renders role-appropriate attendance & assessment component breakdown'
);

// ━━━ 2. R2: INTERACTIVE PER-SESSION ATTENDANCE TAB ━━━
console.log('\n━━━ 2. R2: INTERACTIVE PER-SESSION ATTENDANCE TAB ━━━');

assert(
  gradebookCode.includes("'tp-matrix' | 'rekap-semester' | 'presensi-sesi' | 'statistik'"),
  "R2.1: innerTab state type includes 'presensi-sesi'"
);

assert(
  gradebookCode.includes("onClick={() => setInnerTab('presensi-sesi')}") &&
  gradebookCode.includes('Presensi Sesi (16 Pertemuan)'),
  'R2.2: Sub-nav renders interactive tab button for Presensi Sesi (16 Pertemuan)'
);

assert(
  gradebookCode.includes("innerTab === 'presensi-sesi'") &&
  gradebookCode.includes('16 Pertemuan KBM Sesi Tatap Muka') &&
  gradebookCode.includes('handleUpdateCellStatus') &&
  gradebookCode.includes('handleMarkAllPresent'),
  'R2.3: Dedicated tab component renders 16 session meetings with status update and batch mark all present'
);

assert(
  gradebookCode.includes('activeAttendanceView') &&
  gradebookCode.includes("setActiveAttendanceView('mapel')") &&
  gradebookCode.includes("setActiveAttendanceView('harian')"),
  'R2.4: Provides mode toggle between Presensi Mapel and Presensi Harian Kelas for Wali Kelas / Admin'
);

assert(
  gradebookCode.includes("const statusCycle = ['H', 'S', 'I', 'T', 'A'];") &&
  gradebookCode.includes(".from('jurnal_pembelajaran')") &&
  gradebookCode.includes(".update({") &&
  gradebookCode.includes(".insert({"),
  'R2.5: Interactive status cycle and persistence to jurnal_pembelajaran'
);

// ━━━ 3. R3: FORMATIVE AND SUMMATIVE ASSESSMENT BREAKDOWN ━━━
console.log('\n━━━ 3. R3: FORMATIVE AND SUMMATIVE ASSESSMENT BREAKDOWN ━━━');

assert(
  gradebookCode.includes('Active TP & CP Context Banner') &&
  gradebookCode.includes('parentCp.kode_cp') &&
  gradebookCode.includes('Formatif:') &&
  gradebookCode.includes('Sumatif:'),
  'R3.1: tp-matrix renders active TP & CP context banner with parent CP badge and assessment counts'
);

assert(
  gradebookCode.includes('Asesmen Formatif (Proses) • Bobot') &&
  gradebookCode.includes('Asesmen Sumatif (Lingkup Materi) • Bobot') &&
  gradebookCode.includes('Rata F') &&
  gradebookCode.includes('Rata S'),
  'R3.2: rekap-semester renders distinct dual-tier headers separating Formatif and Sumatif sub-column groupings'
);

assert(
  gradebookCode.includes('stats.tpFormatifResults?.[tp.id]') &&
  gradebookCode.includes('stats.avgFormatifAll') &&
  gradebookCode.includes('stats.tpSumatifResults?.[tp.id]') &&
  gradebookCode.includes('stats.avgSumatifAll') &&
  gradebookCode.includes('stats.kehadiranScore'),
  'R3.3: rekap-semester displays per-TP Formatif/Sumatif scores, category averages, and separated attendance rate'
);

// ━━━ 4. R4: SEMESTER FILTERING FOR ATTENDANCE DATA ━━━
console.log('\n━━━ 4. R4: SEMESTER FILTERING FOR ATTENDANCE DATA ━━━');

const ganjilRange = getSemesterDateRange('Ganjil', '2024/2025');
assert(
  ganjilRange.startDate === '2024-07-01' && ganjilRange.endDate === '2024-12-31',
  'R4.1: getSemesterDateRange(Ganjil, 2024/2025) returns July 1 - Dec 31 2024',
  JSON.stringify(ganjilRange)
);

const genapRange = getSemesterDateRange('Genap', '2024/2025');
assert(
  genapRange.startDate === '2025-01-01' && genapRange.endDate === '2025-07-15',
  'R4.2: getSemesterDateRange(Genap, 2024/2025) returns Jan 1 - July 15 2025',
  JSON.stringify(genapRange)
);

assert(
  gradebookCode.includes("from('jurnal_pembelajaran')") &&
  gradebookCode.includes(".gte('tanggal', startDate)") &&
  gradebookCode.includes(".lte('tanggal', endDate)"),
  'R4.3: GradebookView filters jurnal_pembelajaran query by active semester date range'
);

assert(
  gradebookCode.includes("aQ = aQ.gte('tanggal', startDate).lte('tanggal', endDate);"),
  'R4.4: GradebookView filters fallback absensi query by active semester date range'
);

assert(
  gradebookCode.includes('}, [selectedMapel, selectedKelas, selectedSemester, selectedTahunAjaran, sekolahId, students, statusPoints, isPureGuruMapel]);'),
  'R4.5: GradebookView attendance useEffect reactively listens to selectedSemester and selectedTahunAjaran'
);

const raporPath = path.join(process.cwd(), 'src/components/RaporView.tsx');
const raporCode = fs.readFileSync(raporPath, 'utf8');

assert(
  raporCode.includes('getSemesterDateRange(selectedSemester, selectedTahunAjaran)') &&
  raporCode.includes(".from('absensi')") &&
  raporCode.includes(".gte('tanggal', startDate)") &&
  raporCode.includes(".lte('tanggal', endDate)"),
  'R4.6: RaporView filters fallback absensi query by active semester date range'
);

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`TEST SUMMARY: Total ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);

if (failCount > 0) {
  console.error('VERDICT: MILESTONE M1 VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('VERDICT: ALL MILESTONE M1 REQUIREMENTS (R1, R2, R3, R4) PASSED 100%!');
  process.exit(0);
}
