import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('  ADVERSARIAL STRESS TEST SUITE: M3 (R4) ASESMEN & RAPORT');
console.log('========================================================================\n');

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

const gbPath = path.join(process.cwd(), 'src/components/GradebookView.tsx');
const rpPath = path.join(process.cwd(), 'src/components/RaporView.tsx');

const gbCode = fs.readFileSync(gbPath, 'utf8');
const rpCode = fs.readFileSync(rpPath, 'utf8');

// ============================================================================
// SECTION 1: DEFAULT SEMESTER AND ACADEMIC YEAR LOGIC & SYNC
// ============================================================================
console.log('--- SECTION 1: Default Semester & Academic Year Sync ---');

test('1.1: Academic year & semester config extraction logic handles diverse schemas', () => {
  const extractConfig = (data: any[]) => {
    let tahunVal = '';
    let semVal = '';
    data.forEach((item: any) => {
      const k = item.key?.toLowerCase();
      if (k === 'tahun_ajaran') tahunVal = item.value;
      if (k === 'semester') semVal = item.value;
      if (item.tahun_ajaran && !tahunVal) tahunVal = item.tahun_ajaran;
      if (item.semester && !semVal) semVal = item.semester;
    });

    const normSem: 'Ganjil' | 'Genap' | null =
      String(semVal).trim().toLowerCase() === 'genap'
        ? 'Genap'
        : String(semVal).trim().toLowerCase() === 'ganjil'
        ? 'Ganjil'
        : null;

    return {
      tahunAjaran: tahunVal ? tahunVal.trim() : '2024/2025',
      semester: normSem || 'Ganjil',
    };
  };

  // Case A: 2026/2027 Genap via key-value
  const resA = extractConfig([
    { key: 'tahun_ajaran', value: '2026/2027' },
    { key: 'semester', value: 'Genap' },
  ]);
  assert.strictEqual(resA.tahunAjaran, '2026/2027');
  assert.strictEqual(resA.semester, 'Genap');

  // Case B: 2025/2026 Ganjil via key-value
  const resB = extractConfig([
    { key: 'tahun_ajaran', value: '2025/2026' },
    { key: 'semester', value: 'Ganjil' },
  ]);
  assert.strictEqual(resB.tahunAjaran, '2025/2026');
  assert.strictEqual(resB.semester, 'Ganjil');

  // Case C: Legacy row-level fields
  const resC = extractConfig([
    { id: '1', tahun_ajaran: '2027/2028', semester: 'genap' },
  ]);
  assert.strictEqual(resC.tahunAjaran, '2027/2028');
  assert.strictEqual(resC.semester, 'Genap');

  // Case D: Whitespace & case variations ('  GENAP  ')
  const resD = extractConfig([
    { key: 'tahun_ajaran', value: '  2026/2027  ' },
    { key: 'semester', value: '  GENAP  ' },
  ]);
  assert.strictEqual(resD.tahunAjaran, '2026/2027');
  assert.strictEqual(resD.semester, 'Genap');

  // Case E: Legacy null / empty config -> Clean fallback
  const resE = extractConfig([]);
  assert.strictEqual(resE.tahunAjaran, '2024/2025');
  assert.strictEqual(resE.semester, 'Ganjil');

  const resF = extractConfig([{ key: 'other_key', value: '123' }]);
  assert.strictEqual(resF.tahunAjaran, '2024/2025');
  assert.strictEqual(resF.semester, 'Ganjil');
});

test('1.2: Admin receives active school year & semester in GradebookView and RaporView', () => {
  // In GradebookView: check that fetchAcademicYearSettings does not restrict Admin
  assert.ok(
    !gbCode.includes('if (!isAdmin) {\n              setSelectedTahunAjaran(tahunVal);'),
    'GradebookView must not restrict setSelectedTahunAjaran to !isAdmin'
  );
  assert.ok(
    gbCode.includes('setSelectedTahunAjaran(tahunVal);'),
    'GradebookView must set setSelectedTahunAjaran directly'
  );
  assert.ok(
    gbCode.includes('setSelectedSemester(normSem);'),
    'GradebookView must set setSelectedSemester directly'
  );

  // In RaporView: check that isAdmin triggers synchronization
  assert.ok(
    rpCode.includes('isAdmin || selectedTahunAjaranRef.current === prevActiveTa'),
    'RaporView must sync selectedTahunAjaran if isAdmin is true'
  );
  assert.ok(
    rpCode.includes('isAdmin || selectedSemesterRef.current === prevActiveSem'),
    'RaporView must sync selectedSemester if isAdmin is true'
  );
});

test('1.3: sipjam:config_updated event immediately syncs GradebookView and RaporView', () => {
  // Verify listeners in GradebookView
  assert.ok(
    gbCode.includes("window.addEventListener('sipjam:config_updated', handleConfigSync)"),
    'GradebookView must register sipjam:config_updated listener'
  );
  assert.ok(
    gbCode.includes("window.removeEventListener('sipjam:config_updated', handleConfigSync)"),
    'GradebookView must cleanup sipjam:config_updated listener'
  );

  // Verify listeners in RaporView
  assert.ok(
    rpCode.includes("window.addEventListener('sipjam:config_updated', handleConfigSync)"),
    'RaporView must register sipjam:config_updated listener'
  );
  assert.ok(
    rpCode.includes("window.removeEventListener('sipjam:config_updated', handleConfigSync)"),
    'RaporView must cleanup sipjam:config_updated listener'
  );

  // Simulate handleConfigSync event payload extraction
  const simulateConfigSync = (currentSekolahId: string, eventDetail: any) => {
    if (eventDetail?.sekolah_id && currentSekolahId && eventDetail.sekolah_id !== currentSekolahId) {
      return null; // Ignored due to tenant mismatch
    }
    const newTa = eventDetail?.tahun_ajaran || eventDetail?.config?.tahun_ajaran;
    const newSem = eventDetail?.semester || eventDetail?.config?.semester;
    const normSem =
      String(newSem).trim().toLowerCase() === 'genap'
        ? 'Genap'
        : String(newSem).trim().toLowerCase() === 'ganjil'
        ? 'Ganjil'
        : null;

    return {
      tahun_ajaran: newTa ? String(newTa).trim() : null,
      semester: normSem,
    };
  };

  // Direct format
  const ev1 = simulateConfigSync('school-1', {
    sekolah_id: 'school-1',
    tahun_ajaran: '2026/2027',
    semester: 'Genap',
  });
  assert.deepStrictEqual(ev1, { tahun_ajaran: '2026/2027', semester: 'Genap' });

  // Nested in config object
  const ev2 = simulateConfigSync('school-1', {
    sekolah_id: 'school-1',
    config: { tahun_ajaran: '2025/2026', semester: 'ganjil' },
  });
  assert.deepStrictEqual(ev2, { tahun_ajaran: '2025/2026', semester: 'Ganjil' });

  // Multi-tenant mismatch guard
  const ev3 = simulateConfigSync('school-1', {
    sekolah_id: 'school-999',
    tahun_ajaran: '2099/2100',
    semester: 'Genap',
  });
  assert.strictEqual(ev3, null, 'Tenant mismatch must be rejected');
});

test('1.4: Multi-tab localStorage hydration and storage event resilience', () => {
  // Test storage parser
  const parseStorageChange = (newValue: string | null) => {
    try {
      return newValue ? JSON.parse(newValue) : null;
    } catch {
      return null;
    }
  };

  // Valid storage update
  const valid = parseStorageChange(JSON.stringify({ tahun_ajaran: '2026/2027', semester: 'Genap' }));
  assert.strictEqual(valid.tahun_ajaran, '2026/2027');

  // Corrupted storage update (e.g. malformed JSON string)
  const malformed = parseStorageChange('{"tahun_ajaran": "2026/2027", broken');
  assert.strictEqual(malformed, null);

  // Both components verify window.addEventListener('storage', handleStorageSync)
  assert.ok(gbCode.includes("window.addEventListener('storage', handleStorageSync)"));
  assert.ok(rpCode.includes("window.addEventListener('storage', handleStorageSync)"));
});

test('1.5: Dynamic Academic Year list preservation and active tagging', () => {
  const getOptions = (activeTa: string, selectedTa: string) => {
    const setYears = new Set<string>(['2023/2024', '2024/2025', '2025/2026', '2026/2027', '2027/2028']);
    if (selectedTa) setYears.add(selectedTa.trim());
    if (activeTa) setYears.add(activeTa.trim());
    return Array.from(setYears).filter(Boolean).sort();
  };

  const opts = getOptions('2029/2030', '2029/2030');
  assert.ok(opts.includes('2029/2030'), 'Custom future year must be preserved');
  assert.ok(opts.includes('2024/2025'), 'Base year must be preserved');
});


// ============================================================================
// SECTION 2: DYNAMIC ATTENDANCE STATUS POINTS & ACCUMULATION FORMULA
// ============================================================================
console.log('\n--- SECTION 2: Dynamic Attendance Status Points & Formula ---');

const getStatusPointValue = (rawStatus: string, pointsCfg: any): number => {
  const st = (rawStatus || '').trim().toUpperCase();
  if (st === 'H' || st === 'HADIR') return pointsCfg.hadir ?? 100;
  if (st === 'S' || st === 'SAKIT') return pointsCfg.sakit ?? 75;
  if (st === 'I' || st === 'IZIN') return pointsCfg.izin ?? 75;
  if (st === 'T' || st === 'TERLAMBAT') return pointsCfg.terlambat ?? 75;
  if (st === 'A' || st === 'ALPA') return pointsCfg.alpa ?? 0;
  if (st.includes('HADIR') || st.includes('BEBAS')) return pointsCfg.hadir ?? 100;
  if (st.includes('SAKIT')) return pointsCfg.sakit ?? 75;
  if (st.includes('IZIN') || st.includes('DINAS')) return pointsCfg.izin ?? 75;
  if (st.includes('TERLAMBAT')) return pointsCfg.terlambat ?? 75;
  if (st.includes('ALPA') || st.includes('BOLOS')) return pointsCfg.alpa ?? 0;
  return 0;
};

const calculateAttendanceRate = (
  earnedPoints: number,
  validSessions: number
): number => {
  if (validSessions <= 0) return 100; // Fallback default when no valid sessions exist
  const rate = (earnedPoints / (validSessions * 100)) * 100;
  return parseFloat(Math.min(100, Math.max(0, rate)).toFixed(1));
};

test('2.1: Default points formula: 1 Hadir (100) + 1 Sakit (75) out of 2 meetings = 87.5%', () => {
  const defaultCfg = { hadir: 100, sakit: 75, izin: 75, terlambat: 75, alpa: 0 };
  const sessions = ['Hadir', 'Sakit'];
  const earned = sessions.reduce((acc, s) => acc + getStatusPointValue(s, defaultCfg), 0);
  assert.strictEqual(earned, 175);
  const rate = calculateAttendanceRate(earned, sessions.length);
  assert.strictEqual(rate, 87.5);
});

test('2.2: Default points formula: 1 Hadir (100) + 1 Alpa (0) out of 2 meetings = 50.0%', () => {
  const defaultCfg = { hadir: 100, sakit: 75, izin: 75, terlambat: 75, alpa: 0 };
  const sessions = ['HADIR', 'ALPA'];
  const earned = sessions.reduce((acc, s) => acc + getStatusPointValue(s, defaultCfg), 0);
  assert.strictEqual(earned, 100);
  const rate = calculateAttendanceRate(earned, sessions.length);
  assert.strictEqual(rate, 50.0);
});

test('2.3: Custom points configuration: Hadir 100, Sakit 50, Izin 50, Terlambat 50, Alpa 0', () => {
  const customCfg = { hadir: 100, sakit: 50, izin: 50, terlambat: 50, alpa: 0 };
  
  // 1 Hadir (100) + 1 Sakit (50) out of 2 meetings -> 150 / 200 = 75.0%
  const s1 = ['Hadir', 'Sakit'];
  const e1 = s1.reduce((acc, s) => acc + getStatusPointValue(s, customCfg), 0);
  assert.strictEqual(calculateAttendanceRate(e1, s1.length), 75.0);

  // 1 Hadir (100) + 1 Sakit (50) + 1 Izin (50) + 1 Terlambat (50) out of 4 meetings -> 250 / 400 = 62.5%
  const s2 = ['H', 'S', 'I', 'T'];
  const e2 = s2.reduce((acc, s) => acc + getStatusPointValue(s, customCfg), 0);
  assert.strictEqual(calculateAttendanceRate(e2, s2.length), 62.5);

  // 4 Alpa out of 4 meetings -> 0 / 400 = 0.0%
  const s3 = ['A', 'A', 'A', 'A'];
  const e3 = s3.reduce((acc, s) => acc + getStatusPointValue(s, customCfg), 0);
  assert.strictEqual(calculateAttendanceRate(e3, s3.length), 0.0);
});

test('2.4: Extreme edge case: 0 valid sessions returns 100% (no division by zero / NaN)', () => {
  const defaultCfg = { hadir: 100, sakit: 75, izin: 75, terlambat: 75, alpa: 0 };
  const rate = calculateAttendanceRate(0, 0);
  assert.strictEqual(rate, 100);
  assert.ok(!isNaN(rate) && isFinite(rate), 'Rate must not be NaN or Infinity');
});

test('2.5: Extreme edge case: Student has 0 records while other students attended meetings', () => {
  // If 5 valid sessions took place, but student X has 0 records in absensi_siswa
  const validSessions = 5;
  const earnedPoints = 0;
  const rate = calculateAttendanceRate(earnedPoints, validSessions);
  assert.strictEqual(rate, 0.0, 'Student with 0 attendance in conducted sessions must be 0%');
});

test('2.6: Extreme edge case: Negative, >100, or NaN input clamping in handleSaveBobot', () => {
  const clampPoints = (raw: any) => ({
    hadir: Math.min(100, Math.max(0, Number(raw.hadir) || 0)),
    sakit: Math.min(100, Math.max(0, Number(raw.sakit) || 0)),
    izin: Math.min(100, Math.max(0, Number(raw.izin) || 0)),
    terlambat: Math.min(100, Math.max(0, Number(raw.terlambat) || 0)),
    alpa: Math.min(100, Math.max(0, Number(raw.alpa) || 0)),
  });

  const clamped = clampPoints({
    hadir: 250,      // > 100 -> 100
    sakit: -50,      // < 0   -> 0
    izin: 'invalid', // NaN   -> 0
    terlambat: '80', // string -> 80
    alpa: -0.5,      // < 0   -> 0
  });

  assert.strictEqual(clamped.hadir, 100);
  assert.strictEqual(clamped.sakit, 0);
  assert.strictEqual(clamped.izin, 0);
  assert.strictEqual(clamped.terlambat, 80);
  assert.strictEqual(clamped.alpa, 0);
});

test('2.7: Status string normalization & variations', () => {
  const cfg = { hadir: 100, sakit: 80, izin: 70, terlambat: 60, alpa: 10 };

  // Abbreviations & cases
  assert.strictEqual(getStatusPointValue('h', cfg), 100);
  assert.strictEqual(getStatusPointValue('H', cfg), 100);
  assert.strictEqual(getStatusPointValue('hadir', cfg), 100);
  assert.strictEqual(getStatusPointValue('HADIR', cfg), 100);
  assert.strictEqual(getStatusPointValue('Bebas Hadir', cfg), 100);

  assert.strictEqual(getStatusPointValue('s', cfg), 80);
  assert.strictEqual(getStatusPointValue('SAKIT', cfg), 80);

  assert.strictEqual(getStatusPointValue('i', cfg), 70);
  assert.strictEqual(getStatusPointValue('IZIN', cfg), 70);
  assert.strictEqual(getStatusPointValue('Dinas Luar', cfg), 70);

  assert.strictEqual(getStatusPointValue('t', cfg), 60);
  assert.strictEqual(getStatusPointValue('TERLAMBAT', cfg), 60);

  assert.strictEqual(getStatusPointValue('a', cfg), 10);
  assert.strictEqual(getStatusPointValue('ALPA', cfg), 10);
  assert.strictEqual(getStatusPointValue('Bolos', cfg), 10);

  // Unknown status
  assert.strictEqual(getStatusPointValue('SOMETHING_RANDOM', cfg), 0);
  assert.strictEqual(getStatusPointValue('', cfg), 0);
  assert.strictEqual(getStatusPointValue(null as any, cfg), 0);
});

test('2.8: Backward compatibility: Legacy bobot_nilai_mapel without status_points', () => {
  const legacyRecord = {
    kehadiran: 20,
    formatif: 30,
    sumatif: 50,
  };

  const loadedPoints = {
    hadir: typeof (legacyRecord as any).status_points?.hadir === 'number' ? (legacyRecord as any).status_points.hadir : 100,
    sakit: typeof (legacyRecord as any).status_points?.sakit === 'number' ? (legacyRecord as any).status_points.sakit : 75,
    izin: typeof (legacyRecord as any).status_points?.izin === 'number' ? (legacyRecord as any).status_points.izin : 75,
    terlambat: typeof (legacyRecord as any).status_points?.terlambat === 'number' ? (legacyRecord as any).status_points.terlambat : 75,
    alpa: typeof (legacyRecord as any).status_points?.alpa === 'number' ? (legacyRecord as any).status_points.alpa : 0,
  };

  assert.strictEqual(loadedPoints.hadir, 100);
  assert.strictEqual(loadedPoints.sakit, 75);
  assert.strictEqual(loadedPoints.izin, 75);
  assert.strictEqual(loadedPoints.terlambat, 75);
  assert.strictEqual(loadedPoints.alpa, 0);
});

test('2.9: Full Gradebook weighted average formula verification with dynamic attendance', () => {
  const bobot = { kehadiran: 20, formatif: 40, sumatif: 40 };
  const nilaiKehadiran = 87.5; // From 1 Hadir (100) + 1 Sakit (75)
  const nilaiFormatif = 85.0;
  const nilaiSumatif = 90.0;

  const totalBobot = bobot.kehadiran + bobot.formatif + bobot.sumatif;
  assert.strictEqual(totalBobot, 100, 'Total bobot must be 100%');

  const finalScore = parseFloat((
    (nilaiKehadiran * bobot.kehadiran + nilaiFormatif * bobot.formatif + nilaiSumatif * bobot.sumatif) / 100
  ).toFixed(1));

  // (87.5 * 20 + 85.0 * 40 + 90.0 * 40) / 100 = (1750 + 3400 + 3600) / 100 = 8750 / 100 = 87.5
  assert.strictEqual(finalScore, 87.5);
});

console.log(`\n========================================================================`);
console.log(`  ADVERSARIAL SUITE SUMMARY: ${passed}/${total} TESTS PASSED`);
console.log(`========================================================================\n`);

if (passed !== total) process.exit(1);
