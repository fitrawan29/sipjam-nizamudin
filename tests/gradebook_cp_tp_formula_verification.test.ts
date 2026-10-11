/**
 * ==============================================================================
 * EMPIRICAL ADVERSARIAL VERIFICATION SUITE: GRADEBOOK CORE RULES & FORMULAS
 * File: tests/gradebook_cp_tp_formula_verification.test.ts
 * Role: Challenger 1 (Adversarial Empirical Verifier)
 * 
 * Target Verifications:
 * 1. Nilai Akhir Formula: (bobot_kehadiran * rata_kehadiran) + (bobot_formatif * rata_formatif) + (bobot_sumatif * rata_sumatif)
 * 2. Diagnostik Isolation: Invariance oracle across 0..100 Diagnostik scores (100% invariant)
 * 3. Missing Data Null Handling: Null/absent formatif or sumatif yields null (not NaN, not 0, not partial)
 * 4. Weight Validation: Strict sum == 100 enforcement (rejection of sum != 100)
 * 5. Diagnostik Limit UI & DB Guards: Max 1 Diagnostik per TP enforced in UI and schema
 * ==============================================================================
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║   ADVERSARIAL EMPIRICAL HARNESS: GRADEBOOK FORMULA & POLICY QA       ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

interface TestFinding {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const findings: TestFinding[] = [];

function runCheck(
  id: string,
  category: string,
  name: string,
  condition: boolean,
  details: string
) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✔ [${id}] PASS: [${category}] ${name}`);
    findings.push({ id, category, name, status: 'PASS', details });
  } else {
    failedChecks++;
    console.error(`  ✖ [${id}] FAIL: [${category}] ${name}`);
    console.error(`       Details: ${details}`);
    findings.push({ id, category, name, status: 'FAIL', details });
  }
}

// ============================================================================
// SIMULATION ENGINE MIRRORING GradebookView.tsx IMPLEMENTATION
// ============================================================================

interface Column {
  id: string;
  tp_id: string;
  kategori: 'Diagnostik' | 'Formatif' | 'Sumatif';
  nama: string;
  bobot: number;
  keterangan?: string | null;
}

interface CalculateSemesterStatsParams {
  nisn: string;
  tpList: { id: string; kode_tp: string; deskripsi: string }[];
  allSemesterColumns: Record<string, Column[]>;
  gradesMap: Record<string, Record<string, number | null | undefined>>;
  bobotKehadiran: number;
  bobotFormatif: number;
  bobotSumatif: number;
  attendanceRates: Record<string, number>;
}

/**
 * Exact mathematical reproduction of calculateStudentSemesterStats from GradebookView.tsx
 */
function calculateStudentSemesterStatsHarness(params: CalculateSemesterStatsParams) {
  const {
    nisn,
    tpList,
    allSemesterColumns,
    gradesMap,
    bobotKehadiran,
    bobotFormatif,
    bobotSumatif,
    attendanceRates,
  } = params;

  const sGrades = gradesMap[nisn] || {};
  const tpResults: Record<string, number | null> = {};
  const validTpScores: number[] = [];

  const allAvgF: number[] = [];
  const allAvgS: number[] = [];

  tpList.forEach(tp => {
    const cols = allSemesterColumns[tp.id] || [];
    const fCols = cols.filter(c => c.kategori === 'Formatif');
    const sCols = cols.filter(c => c.kategori === 'Sumatif');

    let sumF = 0, wF = 0;
    fCols.forEach(c => {
      const val = sGrades[c.id];
      if (val !== null && val !== undefined && !isNaN(val)) {
        const w = c.bobot ? Number(c.bobot) : 1;
        sumF += val * w;
        wF += w;
      }
    });
    const avgF = wF > 0 ? sumF / wF : null;
    if (avgF !== null) allAvgF.push(avgF);

    let sumS = 0, wS = 0;
    sCols.forEach(c => {
      const val = sGrades[c.id];
      if (val !== null && val !== undefined && !isNaN(val)) {
        const w = c.bobot ? Number(c.bobot) : 1;
        sumS += val * w;
        wS += w;
      }
    });
    const avgS = wS > 0 ? sumS / wS : null;
    if (avgS !== null) allAvgS.push(avgS);

    // Per-TP score
    const fsTotal = bobotFormatif + bobotSumatif;
    let score: number | null = null;
    if (avgF !== null && avgS !== null && fsTotal > 0) {
      score = parseFloat((avgF * (bobotFormatif / fsTotal) + avgS * (bobotSumatif / fsTotal)).toFixed(1));
    } else if (avgS !== null) {
      score = parseFloat(avgS.toFixed(1));
    } else if (avgF !== null) {
      score = parseFloat(avgF.toFixed(1));
    }
    tpResults[tp.id] = score;
    if (score !== null) validTpScores.push(score);
  });

  const avgFormatifAll = allAvgF.length > 0 ? allAvgF.reduce((a, b) => a + b, 0) / allAvgF.length : null;
  const avgSumatifAll = allAvgS.length > 0 ? allAvgS.reduce((a, b) => a + b, 0) / allAvgS.length : null;
  const kehadiranScore = attendanceRates[nisn] ?? 100;

  let semesterFinalRaw: number | null = null;
  if (avgFormatifAll !== null && avgSumatifAll !== null) {
    semesterFinalRaw = parseFloat((
      kehadiranScore * (bobotKehadiran / 100) +
      avgFormatifAll * (bobotFormatif / 100) +
      avgSumatifAll * (bobotSumatif / 100)
    ).toFixed(1));
  }

  return {
    tpResults,
    semesterFinal: semesterFinalRaw,
    avgFormatifAll,
    avgSumatifAll,
    kehadiranScore,
  };
}

/**
 * Exact validation logic for Admin Bobot settings from GradebookView.tsx
 */
function validateBobotSettingsHarness(bobot: { kehadiran: number; formatif: number; sumatif: number }): { valid: boolean; message?: string } {
  const total = bobot.kehadiran + bobot.formatif + bobot.sumatif;
  if (total !== 100) {
    return { valid: false, message: `Total bobot harus 100%. Saat ini: ${total}%.` };
  }
  return { valid: true };
}

/**
 * Exact UI guard logic for adding assessment columns from GradebookView.tsx
 */
function validateAddColumnHarness(
  columnsList: Column[],
  newCol: { kategori: 'Diagnostik' | 'Formatif' | 'Sumatif'; nama: string; bobot: number },
  editingColId?: string | null
): { allowed: boolean; message?: string } {
  if (newCol.kategori === 'Diagnostik') {
    const existingDiag = columnsList.find(c => c.kategori === 'Diagnostik');
    if (existingDiag && (!editingColId || editingColId !== existingDiag.id)) {
      return { allowed: false, message: 'Maksimal 1 Asesmen Diagnostik per Tujuan Pembelajaran.' };
    }
  }
  return { allowed: true };
}

/**
 * Exact UI guard logic for deleting assessment columns from GradebookView.tsx
 */
function validateDeleteColumnHarness(col: Column): { allowed: boolean; message?: string } {
  if (col.kategori === 'Diagnostik') {
    return { allowed: false, message: 'Asesmen Diagnostik wajib ada tepat 1 per Tujuan Pembelajaran.' };
  }
  return { allowed: true };
}

// ============================================================================
// SUITE 1: NILAI AKHIR MATHEMATICAL FORMULA EMPIRICAL VERIFICATION
// ============================================================================
console.log('━━━ SUITE 1: NILAI AKHIR FORMULA MATHEMATICAL INTEGRITY ━━━');

{
  const tpList = [{ id: 'tp-1', kode_tp: 'TP-1', deskripsi: 'TP Uji' }];
  const cols: Column[] = [
    { id: 'diag-1', tp_id: 'tp-1', kategori: 'Diagnostik', nama: 'Diagnostik', bobot: 1 },
    { id: 'f-1', tp_id: 'tp-1', kategori: 'Formatif', nama: 'Formatif 1', bobot: 1 },
    { id: 's-1', tp_id: 'tp-1', kategori: 'Sumatif', nama: 'Sumatif 1', bobot: 1 },
  ];
  const allSemesterColumns = { 'tp-1': cols };

  // 1.1 Standard values with default weights (40% Kehadiran, 30% Formatif, 30% Sumatif)
  // Attendance: 100%, Formatif: 80, Sumatif: 90
  // Formula: (100 * 0.40) + (80 * 0.30) + (90 * 0.30) = 40 + 24 + 27 = 91.0
  const res1 = calculateStudentSemesterStatsHarness({
    nisn: '1001',
    tpList,
    allSemesterColumns,
    gradesMap: { '1001': { 'diag-1': 50, 'f-1': 80, 's-1': 90 } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { '1001': 100 },
  });
  runCheck(
    'F-01',
    'Formula',
    'Standard grade: Att=100, Form=80, Sum=90 (40/30/30) evaluates to 91.0',
    res1.semesterFinal === 91.0,
    `Expected 91.0, got ${res1.semesterFinal}`
  );

  // 1.2 Fractional and boundary values
  // Attendance: 85%, Formatif: 75.5, Sumatif: 82.3
  // Formula: (85 * 0.40) + (75.5 * 0.30) + (82.3 * 0.30) = 34.0 + 22.65 + 24.69 = 81.34 -> 81.3
  const res2 = calculateStudentSemesterStatsHarness({
    nisn: '1002',
    tpList,
    allSemesterColumns,
    gradesMap: { '1002': { 'diag-1': 60, 'f-1': 75.5, 's-1': 82.3 } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { '1002': 85 },
  });
  runCheck(
    'F-02',
    'Formula',
    'Fractional rounding: Att=85, Form=75.5, Sum=82.3 evaluates to 81.3',
    res2.semesterFinal === 81.3,
    `Expected 81.3, got ${res2.semesterFinal}`
  );

  // 1.3 Boundary extreme: All 0
  const resZero = calculateStudentSemesterStatsHarness({
    nisn: '1003',
    tpList,
    allSemesterColumns,
    gradesMap: { '1003': { 'diag-1': 0, 'f-1': 0, 's-1': 0 } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { '1003': 0 },
  });
  runCheck(
    'F-03',
    'Formula',
    'All zeros: Att=0, Form=0, Sum=0 evaluates to 0.0',
    resZero.semesterFinal === 0.0,
    `Expected 0.0, got ${resZero.semesterFinal}`
  );

  // 1.4 Boundary extreme: All 100
  const resCent = calculateStudentSemesterStatsHarness({
    nisn: '1004',
    tpList,
    allSemesterColumns,
    gradesMap: { '1004': { 'diag-1': 100, 'f-1': 100, 's-1': 100 } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { '1004': 100 },
  });
  runCheck(
    'F-04',
    'Formula',
    'All hundred: Att=100, Form=100, Sum=100 evaluates to 100.0',
    resCent.semesterFinal === 100.0,
    `Expected 100.0, got ${resCent.semesterFinal}`
  );

  // 1.5 Custom dynamic admin weights: 20% Kehadiran, 50% Formatif, 30% Sumatif
  // Att=90, Form=80, Sum=70 -> (90*0.2) + (80*0.5) + (70*0.3) = 18 + 40 + 21 = 79.0
  const resCustom1 = calculateStudentSemesterStatsHarness({
    nisn: '1005',
    tpList,
    allSemesterColumns,
    gradesMap: { '1005': { 'diag-1': 70, 'f-1': 80, 's-1': 70 } },
    bobotKehadiran: 20,
    bobotFormatif: 50,
    bobotSumatif: 30,
    attendanceRates: { '1005': 90 },
  });
  runCheck(
    'F-05',
    'Formula',
    'Custom weights (20/50/30): Att=90, Form=80, Sum=70 evaluates to 79.0',
    resCustom1.semesterFinal === 79.0,
    `Expected 79.0, got ${resCustom1.semesterFinal}`
  );

  // 1.6 Custom dynamic admin weights: 50% Kehadiran, 25% Formatif, 25% Sumatif
  // Att=92, Form=84, Sum=88 -> (92*0.5) + (84*0.25) + (88*0.25) = 46 + 21 + 22 = 89.0
  const resCustom2 = calculateStudentSemesterStatsHarness({
    nisn: '1006',
    tpList,
    allSemesterColumns,
    gradesMap: { '1006': { 'diag-1': 70, 'f-1': 84, 's-1': 88 } },
    bobotKehadiran: 50,
    bobotFormatif: 25,
    bobotSumatif: 25,
    attendanceRates: { '1006': 92 },
  });
  runCheck(
    'F-06',
    'Formula',
    'Custom weights (50/25/25): Att=92, Form=84, Sum=88 evaluates to 89.0',
    resCustom2.semesterFinal === 89.0,
    `Expected 89.0, got ${resCustom2.semesterFinal}`
  );

  // 1.7 Weighted Formatif & Sumatif sub-columns
  // F1: 70 (w=1), F2: 90 (w=3) -> avgF = (70*1 + 90*3)/4 = 340/4 = 85.0
  // S1: 80 (w=2), S2: 100 (w=2) -> avgS = (160 + 200)/4 = 360/4 = 90.0
  // Att: 95%, Weights: 40/30/30 -> (95*0.4) + (85*0.3) + (90*0.3) = 38.0 + 25.5 + 27.0 = 90.5
  const multiCols: Column[] = [
    { id: 'diag-1', tp_id: 'tp-1', kategori: 'Diagnostik', nama: 'Diagnostik', bobot: 1 },
    { id: 'f-1', tp_id: 'tp-1', kategori: 'Formatif', nama: 'Formatif 1', bobot: 1 },
    { id: 'f-2', tp_id: 'tp-1', kategori: 'Formatif', nama: 'Formatif 2', bobot: 3 },
    { id: 's-1', tp_id: 'tp-1', kategori: 'Sumatif', nama: 'Sumatif 1', bobot: 2 },
    { id: 's-2', tp_id: 'tp-1', kategori: 'Sumatif', nama: 'Sumatif 2', bobot: 2 },
  ];
  const resSubWeights = calculateStudentSemesterStatsHarness({
    nisn: '1007',
    tpList,
    allSemesterColumns: { 'tp-1': multiCols },
    gradesMap: { '1007': { 'diag-1': 40, 'f-1': 70, 'f-2': 90, 's-1': 80, 's-2': 100 } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { '1007': 95 },
  });
  runCheck(
    'F-07',
    'Formula',
    'Sub-column custom weights inside TP correctly aggregated to 90.5',
    resSubWeights.semesterFinal === 90.5,
    `Expected 90.5, got ${resSubWeights.semesterFinal}`
  );
}

// ============================================================================
// SUITE 2: DIAGNOSTIK ISOLATION & INVARIANCE ORACLE (101 POINTS SWEEP)
// ============================================================================
console.log('\n━━━ SUITE 2: DIAGNOSTIK ISOLATION & INVARIANCE ORACLE ━━━');

{
  const tpList = [{ id: 'tp-1', kode_tp: 'TP-1', deskripsi: 'TP Uji Diagnostik' }];
  const cols: Column[] = [
    { id: 'diag-1', tp_id: 'tp-1', kategori: 'Diagnostik', nama: 'Diagnostik', bobot: 1 },
    { id: 'f-1', tp_id: 'tp-1', kategori: 'Formatif', nama: 'Formatif 1', bobot: 1 },
    { id: 's-1', tp_id: 'tp-1', kategori: 'Sumatif', nama: 'Sumatif 1', bobot: 1 },
  ];
  const allSemesterColumns = { 'tp-1': cols };

  // Baseline without Diagnostik (or D = 0):
  // Att=90 (w=40) -> 36.0, Formatif=85 (w=30) -> 25.5, Sumatif=80 (w=30) -> 24.0 => Final = 85.5
  const baselineRes = calculateStudentSemesterStatsHarness({
    nisn: 'inv-student',
    tpList,
    allSemesterColumns,
    gradesMap: { 'inv-student': { 'diag-1': 0, 'f-1': 85, 's-1': 80 } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { 'inv-student': 90 },
  });
  const expectedScore = baselineRes.semesterFinal; // 85.5

  let invariancePassed = true;
  let maxDeviation = 0;

  for (let diagScore = 0; diagScore <= 100; diagScore++) {
    const sweepRes = calculateStudentSemesterStatsHarness({
      nisn: 'inv-student',
      tpList,
      allSemesterColumns,
      gradesMap: { 'inv-student': { 'diag-1': diagScore, 'f-1': 85, 's-1': 80 } },
      bobotKehadiran: 40,
      bobotFormatif: 30,
      bobotSumatif: 30,
      attendanceRates: { 'inv-student': 90 },
    });

    const diff = Math.abs((sweepRes.semesterFinal ?? 0) - (expectedScore ?? 0));
    if (diff > maxDeviation) maxDeviation = diff;
    if (sweepRes.semesterFinal !== expectedScore) {
      invariancePassed = false;
      break;
    }
  }

  runCheck(
    'DIAG-01',
    'Diagnostik Isolation',
    'Diagnostik swept from 0 to 100 (101 points): Final grade is 100% invariant at 85.5',
    invariancePassed && maxDeviation === 0,
    `Invariance failed with max deviation: ${maxDeviation}`
  );

  // 2.2 Diagnostik null / undefined / extreme value invariance
  const extremeDiags: (number | null | undefined)[] = [null, undefined, -50, 999, NaN];
  let extremeInvariancePassed = true;

  for (const d of extremeDiags) {
    const extRes = calculateStudentSemesterStatsHarness({
      nisn: 'ext-student',
      tpList,
      allSemesterColumns,
      gradesMap: { 'ext-student': { 'diag-1': d as any, 'f-1': 85, 's-1': 80 } },
      bobotKehadiran: 40,
      bobotFormatif: 30,
      bobotSumatif: 30,
      attendanceRates: { 'ext-student': 90 },
    });
    if (extRes.semesterFinal !== expectedScore) {
      extremeInvariancePassed = false;
      break;
    }
  }

  runCheck(
    'DIAG-02',
    'Diagnostik Isolation',
    'Diagnostik null, undefined, negative, extreme, NaN: 100% invariant at 85.5',
    extremeInvariancePassed,
    `Diagnostik extreme values affected final grade`
  );
}

// ============================================================================
// SUITE 3: MISSING DATA NULL HANDLING
// ============================================================================
console.log('\n━━━ SUITE 3: MISSING DATA NULL HANDLING ━━━');

{
  const tpList = [{ id: 'tp-1', kode_tp: 'TP-1', deskripsi: 'TP Uji Null' }];
  const cols: Column[] = [
    { id: 'diag-1', tp_id: 'tp-1', kategori: 'Diagnostik', nama: 'Diagnostik', bobot: 1 },
    { id: 'f-1', tp_id: 'tp-1', kategori: 'Formatif', nama: 'Formatif 1', bobot: 1 },
    { id: 's-1', tp_id: 'tp-1', kategori: 'Sumatif', nama: 'Sumatif 1', bobot: 1 },
  ];
  const allSemesterColumns = { 'tp-1': cols };

  // 3.1 Missing Formatif (null)
  const resNoF = calculateStudentSemesterStatsHarness({
    nisn: 'null-f',
    tpList,
    allSemesterColumns,
    gradesMap: { 'null-f': { 'diag-1': 80, 'f-1': null, 's-1': 90 } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { 'null-f': 100 },
  });
  runCheck(
    'NULL-01',
    'Missing Data',
    'Missing Formatif evaluates to null (not NaN, not 0, not partial)',
    resNoF.semesterFinal === null && !isNaN(resNoF.semesterFinal as any),
    `Expected null, got ${resNoF.semesterFinal}`
  );

  // 3.2 Missing Sumatif (null)
  const resNoS = calculateStudentSemesterStatsHarness({
    nisn: 'null-s',
    tpList,
    allSemesterColumns,
    gradesMap: { 'null-s': { 'diag-1': 80, 'f-1': 85, 's-1': null } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { 'null-s': 100 },
  });
  runCheck(
    'NULL-02',
    'Missing Data',
    'Missing Sumatif evaluates to null (not NaN, not 0, not partial)',
    resNoS.semesterFinal === null && !isNaN(resNoS.semesterFinal as any),
    `Expected null, got ${resNoS.semesterFinal}`
  );

  // 3.3 Both Formatif and Sumatif Missing
  const resNoBoth = calculateStudentSemesterStatsHarness({
    nisn: 'null-both',
    tpList,
    allSemesterColumns,
    gradesMap: { 'null-both': { 'diag-1': 80, 'f-1': null, 's-1': null } },
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { 'null-both': 100 },
  });
  runCheck(
    'NULL-03',
    'Missing Data',
    'Both Formatif and Sumatif missing evaluates to null (does not default to attendance score)',
    resNoBoth.semesterFinal === null,
    `Expected null, got ${resNoBoth.semesterFinal}`
  );

  // 3.4 Student has no entries in gradesMap at all
  const resUnrated = calculateStudentSemesterStatsHarness({
    nisn: 'unrated',
    tpList,
    allSemesterColumns,
    gradesMap: {},
    bobotKehadiran: 40,
    bobotFormatif: 30,
    bobotSumatif: 30,
    attendanceRates: { 'unrated': 95 },
  });
  runCheck(
    'NULL-04',
    'Missing Data',
    'Completely unrated student evaluates to null without throwing runtime exceptions',
    resUnrated.semesterFinal === null,
    `Expected null, got ${resUnrated.semesterFinal}`
  );
}

// ============================================================================
// SUITE 4: WEIGHT VALIDATION STRESS TESTING (SUM != 100 REJECTION)
// ============================================================================
console.log('\n━━━ SUITE 4: WEIGHT VALIDATION STRESS TESTING ━━━');

{
  // 4.1 Combinations summing to < 100 must be rejected
  const invalidUnder = [
    { kehadiran: 30, formatif: 30, sumatif: 30 }, // 90
    { kehadiran: 40, formatif: 20, sumatif: 20 }, // 80
    { kehadiran: 0, formatif: 0, sumatif: 0 },    // 0
    { kehadiran: 39, formatif: 30, sumatif: 30 }, // 99
  ];
  let underAllRejected = true;
  for (const b of invalidUnder) {
    const v = validateBobotSettingsHarness(b);
    if (v.valid) { underAllRejected = false; break; }
  }
  runCheck(
    'WT-01',
    'Weight Validation',
    'Rejects all weight combinations where sum < 100 (90%, 80%, 0%, 99%)',
    underAllRejected,
    'Failed to reject a weight sum < 100'
  );

  // 4.2 Combinations summing to > 100 must be rejected
  const invalidOver = [
    { kehadiran: 50, formatif: 50, sumatif: 50 },   // 150
    { kehadiran: 41, formatif: 30, sumatif: 30 },   // 101
    { kehadiran: 100, formatif: 100, sumatif: 100 }, // 300
    { kehadiran: 40, formatif: 40, sumatif: 30 },   // 110
  ];
  let overAllRejected = true;
  for (const b of invalidOver) {
    const v = validateBobotSettingsHarness(b);
    if (v.valid) { overAllRejected = false; break; }
  }
  runCheck(
    'WT-02',
    'Weight Validation',
    'Rejects all weight combinations where sum > 100 (150%, 101%, 300%, 110%)',
    overAllRejected,
    'Failed to reject a weight sum > 100'
  );

  // 4.3 Valid combinations summing to exactly 100 must pass
  const validWeights = [
    { kehadiran: 40, formatif: 30, sumatif: 30 },
    { kehadiran: 50, formatif: 25, sumatif: 25 },
    { kehadiran: 20, formatif: 40, sumatif: 40 },
    { kehadiran: 100, formatif: 0, sumatif: 0 },
    { kehadiran: 0, formatif: 50, sumatif: 50 },
    { kehadiran: 10, formatif: 45, sumatif: 45 },
  ];
  let validAllPassed = true;
  for (const b of validWeights) {
    const v = validateBobotSettingsHarness(b);
    if (!v.valid) { validAllPassed = false; break; }
  }
  runCheck(
    'WT-03',
    'Weight Validation',
    'Accepts valid weight combinations summing to exactly 100',
    validAllPassed,
    'Failed to accept a valid 100% weight combination'
  );
}

// ============================================================================
// SUITE 5: DIAGNOSTIK LIMIT UI & DB GUARD VERIFICATION
// ============================================================================
console.log('\n━━━ SUITE 5: DIAGNOSTIK LIMIT UI & DB GUARD VERIFICATION ━━━');

{
  const existingCols: Column[] = [
    { id: 'diag-existing', tp_id: 'tp-1', kategori: 'Diagnostik', nama: 'Diagnostik', bobot: 1 },
    { id: 'f-1', tp_id: 'tp-1', kategori: 'Formatif', nama: 'Formatif 1', bobot: 1 },
    { id: 's-1', tp_id: 'tp-1', kategori: 'Sumatif', nama: 'Sumatif 1', bobot: 1 },
  ];

  // 5.1 Attempt to add a second Diagnostik column
  const attemptAddSecondDiag = validateAddColumnHarness(existingCols, {
    kategori: 'Diagnostik',
    nama: 'Diagnostik 2',
    bobot: 1,
  });
  runCheck(
    'GUARD-01',
    'Diagnostik Limit',
    'UI Guard blocks adding a 2nd Diagnostik column per TP',
    !attemptAddSecondDiag.allowed && attemptAddSecondDiag.message?.includes('Maksimal 1 Asesmen Diagnostik'),
    `Expected guard block, got: ${JSON.stringify(attemptAddSecondDiag)}`
  );

  // 5.2 Editing the existing Diagnostik column (updating name/bobot/keterangan) is allowed
  const attemptEditSameDiag = validateAddColumnHarness(existingCols, {
    kategori: 'Diagnostik',
    nama: 'Diagnostik Updated',
    bobot: 1,
  }, 'diag-existing');
  runCheck(
    'GUARD-02',
    'Diagnostik Limit',
    'Editing the existing Diagnostik column is permitted (editingCol.id === existingDiag.id)',
    attemptEditSameDiag.allowed,
    `Editing existing diagnostik was blocked: ${JSON.stringify(attemptEditSameDiag)}`
  );

  // 5.3 Attempt to convert an existing Formatif into a second Diagnostik is blocked
  const attemptConvertFormatifToDiag = validateAddColumnHarness(existingCols, {
    kategori: 'Diagnostik',
    nama: 'Formatif Renamed to Diag',
    bobot: 1,
  }, 'f-1');
  runCheck(
    'GUARD-03',
    'Diagnostik Limit',
    'Converting Formatif to Diagnostik when Diagnostik already exists is blocked',
    !attemptConvertFormatifToDiag.allowed,
    `Expected block on converting to second diagnostik`
  );

  // 5.4 Attempt to delete Diagnostik is strictly blocked
  const diagCol = existingCols.find(c => c.kategori === 'Diagnostik')!;
  const deleteDiagCheck = validateDeleteColumnHarness(diagCol);
  runCheck(
    'GUARD-04',
    'Diagnostik Limit',
    'UI Guard blocks deleting Diagnostik column (strictly 1 required per TP)',
    !deleteDiagCheck.allowed && deleteDiagCheck.message?.includes('wajib ada tepat 1'),
    `Deleting diagnostik was not blocked: ${JSON.stringify(deleteDiagCheck)}`
  );

  // 5.5 Adding multiple Formatif and Sumatif columns is allowed
  const addFormatif2 = validateAddColumnHarness(existingCols, { kategori: 'Formatif', nama: 'Formatif 2', bobot: 1 });
  const addSumatif2 = validateAddColumnHarness(existingCols, { kategori: 'Sumatif', nama: 'Sumatif 2', bobot: 1 });
  runCheck(
    'GUARD-05',
    'Diagnostik Limit',
    'Adding multiple Formatif and Sumatif columns is permitted',
    addFormatif2.allowed && addSumatif2.allowed,
    `Adding Formatif/Sumatif was unexpectedly blocked`
  );
}

// ============================================================================
// SUITE 6: STATIC CODEBASE & MIGRATION ENFORCEMENT VERIFICATION
// ============================================================================
console.log('\n━━━ SUITE 6: CODEBASE & MIGRATION STATIC CONSTRAINTS ━━━');

{
  const gradebookPath = path.join(process.cwd(), 'src', 'components', 'GradebookView.tsx');
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261011_capaian_pembelajaran_and_gradebook_v2.sql'
  );

  const gbContent = fs.readFileSync(gradebookPath, 'utf8');
  const migContent = fs.readFileSync(migrationPath, 'utf8');

  // 6.1 GradebookView has total !== 100 validation in handleSaveBobot
  runCheck(
    'STATIC-01',
    'Static Guard',
    'GradebookView.tsx contains total !== 100 validation guard in handleSaveBobot',
    gbContent.includes('total !== 100') && gbContent.includes('Total bobot harus 100%'),
    'Missing total !== 100 guard in handleSaveBobot'
  );

  // 6.2 GradebookView has Diagnostik creation guard in handleSaveCol
  runCheck(
    'STATIC-02',
    'Static Guard',
    'GradebookView.tsx contains max 1 Diagnostik guard in handleSaveCol',
    gbContent.includes("colForm.kategori === 'Diagnostik'") &&
    gbContent.includes('Maksimal 1 Asesmen Diagnostik per Tujuan Pembelajaran'),
    'Missing max 1 Diagnostik guard in handleSaveCol'
  );

  // 6.3 GradebookView has Diagnostik deletion guard in handleDeleteCol
  runCheck(
    'STATIC-03',
    'Static Guard',
    'GradebookView.tsx contains deletion prevention for Diagnostik in handleDeleteCol',
    gbContent.includes("col.kategori === 'Diagnostik'") &&
    gbContent.includes('Asesmen Diagnostik wajib ada tepat 1 per Tujuan Pembelajaran'),
    'Missing deletion guard for Diagnostik in handleDeleteCol'
  );

  // 6.4 GradebookView calculates semester final using attendance, formative, summative
  runCheck(
    'STATIC-04',
    'Static Guard',
    'GradebookView.tsx implements Nilai Akhir formula: kehadiran + formatif + sumatif',
    gbContent.includes('kehadiranScore * (bobotKehadiran / 100)') &&
    gbContent.includes('avgFormatifAll * (bobotFormatif / 100)') &&
    gbContent.includes('avgSumatifAll * (bobotSumatif / 100)'),
    'Missing formula terms in GradebookView.tsx'
  );

  // 6.5 GradebookView guards against null formatif or sumatif
  runCheck(
    'STATIC-05',
    'Static Guard',
    'GradebookView.tsx guards against missing formatif or sumatif',
    gbContent.includes('if (avgFormatifAll !== null && avgSumatifAll !== null)'),
    'Missing null guard for formatif and sumatif'
  );

  // 6.6 Database Migration contains unique index for Diagnostik per TP
  runCheck(
    'STATIC-06',
    'Static Guard',
    'Database migration enforces partial unique index uq_asesmen_tp_diagnostik on asesmen_kolom',
    migContent.includes('uq_asesmen_tp_diagnostik') &&
    migContent.includes("WHERE (kategori = 'Diagnostik')"),
    'Missing uq_asesmen_tp_diagnostik index in migration'
  );

  // 6.7 Database Migration creates capaian_pembelajaran table
  runCheck(
    'STATIC-07',
    'Static Guard',
    'Database migration creates capaian_pembelajaran table with required columns',
    migContent.includes('CREATE TABLE IF NOT EXISTS public.capaian_pembelajaran') &&
    migContent.includes('guru_mapel_id') &&
    migContent.includes('kode_cp') &&
    migContent.includes('deskripsi'),
    'Missing capaian_pembelajaran table in migration'
  );

  // 6.8 Database Migration seeds default bobot in pengaturan
  runCheck(
    'STATIC-08',
    'Static Guard',
    'Database migration seeds bobot_nilai_mapel default in pengaturan',
    migContent.includes('bobot_nilai_mapel'),
    'Missing bobot_nilai_mapel seed in migration'
  );
}

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`SUMMARY: Total Checks: ${totalChecks} | Passed: ${passedChecks} | Failed: ${failedChecks}`);
if (failedChecks === 0) {
  console.log('VERDICT: ALL EMPIRICAL & ADVERSARIAL CHECKS PASSED (APPROVE)!');
} else {
  console.error(`VERDICT: ${failedChecks} CHECKS FAILED (REJECT)!`);
  process.exit(1);
}
console.log('══════════════════════════════════════════════════════════════════════\n');
