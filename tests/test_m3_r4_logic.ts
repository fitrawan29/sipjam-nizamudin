import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('  TEST SUITE: M3 (R4) ASESMEN, RAPORT, & BOBOT KEHADIRAN DINAMIS');
console.log('========================================================================\n');

const gbPath = path.join(process.cwd(), 'src/components/GradebookView.tsx');
const rpPath = path.join(process.cwd(), 'src/components/RaporView.tsx');

assert.ok(fs.existsSync(gbPath), 'GradebookView.tsx must exist');
assert.ok(fs.existsSync(rpPath), 'RaporView.tsx must exist');

const gb = fs.readFileSync(gbPath, 'utf8');
const rp = fs.readFileSync(rpPath, 'utf8');

let passed = 0;
let total = 0;

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Interfaces and Defaults
test('1.1: AttendanceStatusPoints and DEFAULT_STATUS_POINTS are exported', () => {
  assert.ok(gb.includes('export interface AttendanceStatusPoints'), 'Must export AttendanceStatusPoints');
  assert.ok(gb.includes('export const DEFAULT_STATUS_POINTS: AttendanceStatusPoints = {'), 'Must export DEFAULT_STATUS_POINTS');
  assert.ok(gb.includes('hadir: 100'), 'hadir default must be 100');
  assert.ok(gb.includes('sakit: 75'), 'sakit default must be 75');
  assert.ok(gb.includes('izin: 75'), 'izin default must be 75');
  assert.ok(gb.includes('terlambat: 75'), 'terlambat default must be 75');
  assert.ok(gb.includes('alpa: 0'), 'alpa default must be 0');
});

// 2. Default semester and academic year
test('2.1: GradebookView removes if (!isAdmin) restriction for academic year & semester defaults', () => {
  assert.ok(!gb.includes('if (!isAdmin) {\n              setSelectedTahunAjaran(tahunVal);'), 'Must remove if (!isAdmin) block');
  assert.ok(gb.includes('setSyncedTahunAjaran(tahunVal);') && gb.includes('setSelectedTahunAjaran(tahunVal);'), 'Must set selectedTahunAjaran');
  assert.ok(gb.includes('setSyncedSemester(normSem);') && gb.includes('setSelectedSemester(normSem);'), 'Must set selectedSemester');
});

test('2.2: GradebookView attaches sipjam:config_updated listener for real-time synchronization', () => {
  assert.ok(gb.includes("window.addEventListener('sipjam:config_updated', handleConfigSync)"), 'Must attach sipjam:config_updated listener');
  assert.ok(gb.includes("window.removeEventListener('sipjam:config_updated', handleConfigSync)"), 'Must detach listener on unmount');
  assert.ok(gb.includes("window.addEventListener('storage', handleStorageSync)"), 'Must attach storage listener');
});

test('2.3: GradebookView renders dynamic academic year dropdown with active indicator', () => {
  assert.ok(gb.includes('gradebookTahunAjaranOptions'), 'Must compute gradebookTahunAjaranOptions dynamically');
  assert.ok(gb.includes("syncedTahunAjaran === ta ? ' (Aktif)' : ''"), 'Must indicate active school year');
  assert.ok(gb.includes("syncedSemester === 'Ganjil' ? ' (Aktif)' : ''"), 'Must indicate active Ganjil semester');
  assert.ok(gb.includes("syncedSemester === 'Genap' ? ' (Aktif)' : ''"), 'Must indicate active Genap semester');
});

// 3. Dynamic Attendance Points Configuration Form
test('3.1: GradebookView modal includes sub-form for dynamic attendance points', () => {
  assert.ok(gb.includes('Poin Status Kehadiran per Pertemuan'), 'Modal must contain Poin Status Kehadiran header');
  assert.ok(gb.includes('statusPointsForm.hadir'), 'Must include Hadir point input');
  assert.ok(gb.includes('statusPointsForm.sakit'), 'Must include Sakit point input');
  assert.ok(gb.includes('statusPointsForm.izin'), 'Must include Izin point input');
  assert.ok(gb.includes('statusPointsForm.terlambat'), 'Must include Terlambat point input');
  assert.ok(gb.includes('statusPointsForm.alpa'), 'Must include Alpa point input');
  assert.ok(gb.includes('setStatusPointsForm(DEFAULT_STATUS_POINTS)'), 'Must include Reset Default button');
});

test('3.2: GradebookView saves status_points inside bobot_nilai_mapel configuration JSON', () => {
  assert.ok(gb.includes('status_points: pointsToSave'), 'handleSaveBobot must include status_points in payload');
  assert.ok(gb.includes("key: 'bobot_nilai_mapel'"), 'Must save to key bobot_nilai_mapel');
  assert.ok(gb.includes('setStatusPoints(pointsToSave)'), 'Must update active statusPoints state upon save');
});

// 4. Attendance Calculation Formula
test('4.1: Attendance rate formula accumulates status points per session and divides by (validSessions * 100) * 100', () => {
  assert.ok(gb.includes('getStatusPointValue'), 'Must define getStatusPointValue helper');
  assert.ok(gb.includes('(earned / (validSessions * 100)) * 100'), 'Must divide earned by (validSessions * 100) * 100 in jurnal attendance');
  assert.ok(gb.includes('(stat.earned / (stat.totalSessions * 100)) * 100'), 'Must divide earned by (stat.totalSessions * 100) * 100 in absensi fallback');
  assert.ok(gb.includes('[selectedMapel, selectedKelas, sekolahId, students, statusPoints]'), 'useEffect must react to statusPoints updates');
});

test('4.2: Simulation of attendance point accumulation reflects configured weights accurately', () => {
  const pointsCfg = {
    hadir: 100,
    sakit: 75,
    izin: 75,
    terlambat: 75,
    alpa: 0,
  };

  const getPoints = (st: string) => {
    const s = st.toUpperCase();
    if (s === 'H' || s === 'HADIR') return pointsCfg.hadir;
    if (s === 'S' || s === 'SAKIT') return pointsCfg.sakit;
    if (s === 'I' || s === 'IZIN') return pointsCfg.izin;
    if (s === 'T' || s === 'TERLAMBAT') return pointsCfg.terlambat;
    if (s === 'A' || s === 'ALPA') return pointsCfg.alpa;
    return 0;
  };

  // Case 1: 2 sessions, 1 Hadir (100) + 1 Sakit (75) -> 175 / 200 = 87.5%
  const s1Sessions = ['Hadir', 'Sakit'];
  const s1Earned = s1Sessions.reduce((acc, st) => acc + getPoints(st), 0);
  const s1Rate = parseFloat(((s1Earned / (s1Sessions.length * 100)) * 100).toFixed(1));
  assert.strictEqual(s1Rate, 87.5, '1 Hadir + 1 Sakit must equal 87.5%');

  // Case 2: 4 sessions, 2 Hadir (200) + 1 Izin (75) + 1 Terlambat (75) -> 350 / 400 = 87.5%
  const s2Sessions = ['H', 'H', 'I', 'T'];
  const s2Earned = s2Sessions.reduce((acc, st) => acc + getPoints(st), 0);
  const s2Rate = parseFloat(((s2Earned / (s2Sessions.length * 100)) * 100).toFixed(1));
  assert.strictEqual(s2Rate, 87.5, '2 Hadir + 1 Izin + 1 Terlambat must equal 87.5%');

  // Case 3: 2 sessions, 1 Hadir (100) + 1 Alpa (0) -> 100 / 200 = 50.0%
  const s3Sessions = ['Hadir', 'Alpa'];
  const s3Earned = s3Sessions.reduce((acc, st) => acc + getPoints(st), 0);
  const s3Rate = parseFloat(((s3Earned / (s3Sessions.length * 100)) * 100).toFixed(1));
  assert.strictEqual(s3Rate, 50.0, '1 Hadir + 1 Alpa must equal 50.0%');

  // Case 4: Custom weights by Admin: Sakit=90, Izin=80
  pointsCfg.sakit = 90;
  pointsCfg.izin = 80;
  const s4Sessions = ['Hadir', 'Sakit', 'Izin'];
  const s4Earned = s4Sessions.reduce((acc, st) => acc + getPoints(st), 0);
  const s4Rate = parseFloat(((s4Earned / (s4Sessions.length * 100)) * 100).toFixed(1));
  // 100 + 90 + 80 = 270 / 300 = 90.0%
  assert.strictEqual(s4Rate, 90.0, 'Custom points must calculate correctly');
});

// 5. RaporView Default Academic Year and Semester
test('5.1: RaporView selects active school year & semester for Admin by default', () => {
  assert.ok(rp.includes('isAdmin || selectedTahunAjaranRef.current === prevActiveTa'), 'Must update selectedTahunAjaran for Admin');
  assert.ok(rp.includes('isAdmin || selectedSemesterRef.current === prevActiveSem'), 'Must update selectedSemester for Admin');
  assert.ok(rp.includes("window.addEventListener('sipjam:config_updated', handleConfigSync)"), 'RaporView must listen to sipjam:config_updated');
});

console.log(`\n========================================================================`);
console.log(`  RESULTS: ${passed}/${total} TESTS PASSED`);
console.log(`========================================================================\n`);

if (passed !== total) process.exit(1);
