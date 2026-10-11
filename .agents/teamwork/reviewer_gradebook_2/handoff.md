# Handoff Report — Reviewer 2: Grading Logic, Attendance & Regression Reviewer

- **Reviewer**: Reviewer 2 (Grading Logic, Attendance & Regression Reviewer)
- **Roles**: reviewer, critic
- **Target File**: `src/components/GradebookView.tsx`
- **Verdict**: **APPROVE**
- **Date**: 2026-10-11T01:22:00Z

---

## 1. Observation

### 1.1 Nilai Akhir Mathematical Formula in `calculateStudentSemesterStats`
In `src/components/GradebookView.tsx` (lines 1530–1544):
```tsx
    // Aggregate semester final with real kehadiran component
    const avgFormatifAll = allAvgF.length > 0 ? allAvgF.reduce((a, b) => a + b, 0) / allAvgF.length : null;
    const avgSumatifAll = allAvgS.length > 0 ? allAvgS.reduce((a, b) => a + b, 0) / allAvgS.length : null;
    const kehadiranScore = attendanceRates[nisn] ?? 100;

    let semesterFinalRaw: number | null = null;
    // Requirement: Jika tidak ada data formatif atau sumatif, nilai akhir menampilkan '-' / null (tidak error)
    // Diagnostik is completely excluded from final score
    if (avgFormatifAll !== null && avgSumatifAll !== null) {
      semesterFinalRaw = parseFloat((
        kehadiranScore * (bobotKehadiran / 100) +
        avgFormatifAll * (bobotFormatif / 100) +
        avgSumatifAll * (bobotSumatif / 100)
      ).toFixed(1));
    }
```
- Formula strictly computes $(kehadiranScore \times bobotKehadiran / 100) + (avgFormatifAll \times bobotFormatif / 100) + (avgSumatifAll \times bobotSumatif / 100)$.
- The raw value is formatted to 1 decimal place using `.toFixed(1)` and parsed back with `parseFloat`.

### 1.2 Strict Exclusion of Diagnostik Assessments
In `src/components/GradebookView.tsx` (lines 1494–1514):
```tsx
    tpList.forEach(tp => {
      const cols = allSemesterColumns[tp.id] || [];
      const fCols = cols.filter(c => c.kategori === 'Formatif');
      const sCols = cols.filter(c => c.kategori === 'Sumatif');

      let sumF = 0, wF = 0;
      fCols.forEach(c => {
        const val = sGrades[c.id];
        if (val !== null && val !== undefined && !isNaN(val)) { const w = c.bobot ? Number(c.bobot) : 1; sumF += val * w; wF += w; }
      });
      const avgF = wF > 0 ? sumF / wF : null;
      if (avgF !== null) allAvgF.push(avgF);

      let sumS = 0, wS = 0;
      sCols.forEach(c => {
        const val = sGrades[c.id];
        if (val !== null && val !== undefined && !isNaN(val)) { const w = c.bobot ? Number(c.bobot) : 1; sumS += val * w; wS += w; }
      });
      const avgS = wS > 0 ? sumS / wS : null;
      if (avgS !== null) allAvgS.push(avgS);
```
- Diagnostik assessments (`kategori === 'Diagnostik'`) are strictly excluded from `fCols` and `sCols`.
- In `calculateStudentTpStats` (lines 1411–1453), `diagnostikCol` is isolated in `const diagVal = diagnostikCol ? sGrades[diagnostikCol.id] : null;` and never contributes to `avgF`, `avgS`, or `finalTp`.

### 1.3 Missing Data Handling & Fallback
- Line 1537: `if (avgFormatifAll !== null && avgSumatifAll !== null)` ensures that if either formatif or sumatif is missing/null, `semesterFinalRaw` remains `null`.
- In UI Tab 2 Rekap Semester (line 2752):
  ```tsx
  {/* Nilai Rapor Semester */}
  <td className="py-2.5 px-3 text-center font-black text-sm bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-r border-gray-200 dark:border-gray-700">
    {stats.semesterFinal !== null ? stats.semesterFinal : '-'}
  </td>
  ```
- In CSV export (line 1696):
  ```tsx
  semStats.semesterFinal !== null ? semStats.semesterFinal : '',
  ```
  Exports clean empty string without generating `null`, `undefined`, or `NaN`.

### 1.4 Dual-Source Attendance Integration
In `src/components/GradebookView.tsx` (lines 221–305):
- Step 1: Queries `jurnal_pembelajaran` for `selectedMapel` and `selectedKelas` (`absensi_siswa` column). Parses both stringified JSON and JSON objects, filters sessions with `validSessions > 0`, and calculates attendance percentage:
  `rates[s.nisn] = parseFloat(((hadir / validSessions) * 100).toFixed(1))`.
- Step 2: Falls back to canonical `absensi` table per class (`kelas === selectedKelas`), computing `(stat.hadir / stat.total) * 100`.
- Step 3: Default fallback: if no attendance records exist in either table, sets `defaultRates[s.nisn] = 100`.
- Line 1532: `const kehadiranScore = attendanceRates[nisn] ?? 100;` provides an additional layer of null-safety.

### 1.5 Preservation of Interfaces & Zero Regressions
- `generateKurikulumMerdekaDeskripsi` and `CapaianDeskripsiResult` (lines 11–105) preserved with exact type signatures and behavior.
- `npx tsc --noEmit` exits cleanly with code 0 (0 errors).
- `npm test` runs 19 verification test files with 100% PASS (exit code 0).
- `tests/adversarial_kurikulum_merdeka_cp.test.ts`: 26 / 26 PASS.
- `tests/adversarial_kurikulum_merdeka_cp_permutations.test.ts`: 25 / 25 PASS.
- `tests/m4_academic_merdeka_rapor.test.ts`: 14 / 14 PASS.

---

## 2. Logic Chain

1. **Formula Fidelity**:
   - Observation 1.1 confirms that `calculateStudentSemesterStats` calculates:
     $$\text{semesterFinalRaw} = \text{kehadiranScore} \times \frac{\text{bobotKehadiran}}{100} + \text{avgFormatifAll} \times \frac{\text{bobotFormatif}}{100} + \text{avgSumatifAll} \times \frac{\text{bobotSumatif}}{100}$$
   - Bobot values are bounded by `handleSaveBobot` requiring `total === 100` before saving.
   - Therefore, Requirement 1 is mathematically and logically sound.

2. **Diagnostik Isolation**:
   - Observation 1.2 demonstrates that `allSemesterColumns[tp.id]` is partitioned strictly into `fCols` (`kategori === 'Formatif'`) and `sCols` (`kategori === 'Sumatif'`).
   - Diagnostik records cannot leak into `allAvgF` or `allAvgS` under any circumstance.
   - Therefore, Requirement 2 is fully satisfied.

3. **Defensive Missing Data Handling**:
   - Observation 1.3 shows that `semesterFinalRaw` is initialized to `null` and only populated when both `avgFormatifAll` and `avgSumatifAll` are non-null numbers.
   - Both the visual DOM table rendering (`'-'`) and CSV export (`''`) gracefully handle null states without throwing runtime exceptions.
   - Therefore, Requirement 3 is fully satisfied.

4. **Multi-Tier Attendance Resolution**:
   - Observation 1.4 shows a 3-tier cascade:
     1. Mapel & class sessions in `jurnal_pembelajaran.absensi_siswa`
     2. Class attendance in `absensi`
     3. Default baseline 100%
   - Each tier sanitizes status strings (`'H'` or `'HADIR'`), handles malformed JSON in a `try...catch`, and prevents divide-by-zero errors.
   - Therefore, Requirement 4 is fully satisfied.

5. **Interface Preservation and Regression Resistance**:
   - Observation 1.5 confirms that TypeScript compiler passes with 0 errors and all project test suites pass with 100% success.
   - No breaking changes were introduced to exported functions, types, or views.
   - Therefore, Requirement 5 is fully satisfied.

6. **Integrity Audit**:
   - Active inspection for integrity violations revealed:
     - No hardcoded test outputs or mock bypasses in `src/components/GradebookView.tsx`.
     - Real logic implemented for all calculations, queries, and modal interactions.
     - Authentic verification outputs backed by live `tsc` and test executions.

---

## 3. Caveats

1. **Stale Code Comment in GradebookView.tsx:1485**:
   Line 1485 contains an outdated comment:
   `// ponytail: kehadiran not yet stored per-mapel; use 100 as placeholder so formula still runs`
   The actual implementation on line 1532 directly uses `const kehadiranScore = attendanceRates[nisn] ?? 100;`, which is populated dynamically by `fetchMapelAttendance`. This is purely an informational cosmetic observation; the runtime behavior is 100% correct.
2. **Standalone Legacy Test `tests/m4_gradebook.test.ts`**:
   The standalone test file `tests/m4_gradebook.test.ts` (not included in `npm test`) asserts static text `import GradebookView from './GradebookView';`, which fails because `AppScreen.tsx` now loads `GradebookView` via Next.js dynamic import `const GradebookView = dynamic(() => import('./GradebookView'));`. This does not affect `npm test` or the runtime application.

---

## 4. Conclusion & Verdict

**Verdict**: **APPROVE**

All requirements from the dispatch instructions and authoritative request have been completely verified:
- Nilai Akhir formula correctly incorporates attendance, formative, and summative components according to configured weights.
- Diagnostik assessments are strictly excluded from final grading calculations.
- Missing data returns `null` and displays `'-'` cleanly.
- Dual-source attendance integration functions as designed with robust fallback defaults.
- Zero regressions across `generateKurikulumMerdekaDeskripsi`, Tab 2 Rekap Semester, and CSV exports.
- Clean pass on `npx tsc --noEmit` and `npm test`.

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.

2. **Kurikulum Merdeka CP Engine Verification**:
   ```powershell
   npx tsx tests/adversarial_kurikulum_merdeka_cp.test.ts
   ```
   *Expected*: 26 / 26 PASS.

3. **Permutations & Boundary Verification**:
   ```powershell
   npx tsx tests/adversarial_kurikulum_merdeka_cp_permutations.test.ts
   ```
   *Expected*: 25 / 25 PASS.

4. **Academic Rapor & Hierarchy Verification**:
   ```powershell
   npx tsx tests/m4_academic_merdeka_rapor.test.ts
   ```
   *Expected*: 14 / 14 PASS.

5. **Full Project Test Suite**:
   ```powershell
   npm test
   ```
   *Expected*: Exit code 0, all suites passing.

6. **Grading Logic & Edge Case Evaluation**:
   ```powershell
   node -e "
   const kehadiran = 87.5, avgF = 82.0, avgS = 78.0;
   const bK = 40, bF = 30, bS = 30;
   const finalRaw = parseFloat((kehadiran * (bK/100) + avgF * (bF/100) + avgS * (bS/100)).toFixed(1));
   console.log('Result:', finalRaw); // 83.0
   if (finalRaw !== 83.0) process.exit(1);
   "
   ```
