# Handoff Report — Challenger 1: Empirical Adversarial Verification

- **Agent**: `challenger_gradebook_1` (Adversarial Empirical Verifier)
- **Role**: critic, specialist
- **Date**: 2026-10-11T01:25:00Z
- **Recipient**: Orchestrator (`1f15a155-9441-412f-8adc-6ac5519d6f4d`)
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_gradebook_1`
- **Verdict**: **`APPROVE`**

---

## 1. Observation

### 1.1 Codebase Implementation & Lines Observed
1. **Nilai Akhir Formula (`src/components/GradebookView.tsx:1537-1543`)**:
   ```typescript
   if (avgFormatifAll !== null && avgSumatifAll !== null) {
     semesterFinalRaw = parseFloat((
       kehadiranScore * (bobotKehadiran / 100) +
       avgFormatifAll * (bobotFormatif / 100) +
       avgSumatifAll * (bobotSumatif / 100)
     ).toFixed(1));
   }
   ```
   Attendance rate is queried per student from KBM sessions in `jurnal_pembelajaran` with fallback to `absensi` table, resolving `kehadiranScore = attendanceRates[nisn] ?? 100` (`GradebookView.tsx:1532`).

2. **Diagnostik Isolation (`src/components/GradebookView.tsx:1411-1412, 1496-1497, 1536`)**:
   - In TP calculations, `diagVal` is captured as baseline but excluded from formative and summative weighted averages:
     `formatifCols = cols.filter(c => c.kategori === 'Formatif')`
     `sumatifCols = cols.filter(c => c.kategori === 'Sumatif')`
   - In semester calculations:
     `const fCols = cols.filter(c => c.kategori === 'Formatif');`
     `const sCols = cols.filter(c => c.kategori === 'Sumatif');`
   - Explicit code comment and architecture: `// Diagnostik is completely excluded from final score`.

3. **Missing Data Null Handling (`src/components/GradebookView.tsx:1535-1543`)**:
   - `semesterFinalRaw` initializes to `null`.
   - Condition `if (avgFormatifAll !== null && avgSumatifAll !== null)` strictly prevents computation if either formative or summative assessments are missing.
   - When either is null, `semesterFinalRaw` remains `null`. It is rendered as `'-'` in table cells (line 2736) and exported as `'-'` in CSV.

4. **Weight Validation (`src/components/GradebookView.tsx:768-773, 3235-3242`)**:
   ```typescript
   const handleSaveBobot = async (e: React.FormEvent) => {
     e.preventDefault();
     const total = bobotForm.kehadiran + bobotForm.formatif + bobotForm.sumatif;
     if (total !== 100) {
       showToast('Validasi', `Total bobot harus 100%. Saat ini: ${total}%.`, 'warning'); return;
     }
   ```
   The modal form provides real-time badge feedback (`Total: ${total}% (harus 100%)`) and blocks submission if `total !== 100`.

5. **Diagnostik Limit UI & DB Guards**:
   - UI Modal Invocation (`src/components/GradebookView.tsx:1219`):
     `const handleOpenAddColModal = (kategori: 'Formatif' | 'Sumatif') => { ... }`
     UI buttons only trigger modal for Formatif or Sumatif; no UI action exists to add a 2nd Diagnostik.
   - UI Save Guard (`src/components/GradebookView.tsx:1265-1271`):
     ```typescript
     if (colForm.kategori === 'Diagnostik') {
       const existingDiag = columnsList.find(c => c.kategori === 'Diagnostik');
       if (existingDiag && (!editingCol || editingCol.id !== existingDiag.id)) {
         showToast('Validasi Gagal', 'Maksimal 1 Asesmen Diagnostik per Tujuan Pembelajaran.', 'warning');
         return;
       }
     }
     ```
   - UI Delete Prevention (`src/components/GradebookView.tsx:1320-1323`):
     ```typescript
     if (col.kategori === 'Diagnostik') {
       showToast('Tidak Dapat Dihapus', 'Asesmen Diagnostik wajib ada tepat 1 per Tujuan Pembelajaran.', 'warning');
       return;
     }
     ```
   - Database Partial Unique Index (`supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql:43-45`):
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS uq_asesmen_tp_diagnostik 
         ON public.asesmen_kolom(tp_id) 
         WHERE (kategori = 'Diagnostik');
     ```

### 1.2 Empirical Execution Results
1. **Adversarial Formula & Guard Test Suite (`tests/gradebook_cp_tp_formula_verification.test.ts`)**:
   - Command: `npx tsx tests/gradebook_cp_tp_formula_verification.test.ts`
   - Result: **Total Checks: 29 | Passed: 29 | Failed: 0** (Exit code 0).
   - Test breakdown:
     - `[F-01..F-07]`: Standard (91.0), fractional (81.3), zero (0.0), cent (100.0), custom weights 20/50/30 (79.0), 50/25/25 (89.0), and sub-column custom weights (90.5).
     - `[DIAG-01..DIAG-02]`: Diagnostik swept from 0 to 100 across 101 discrete points; deviation was exactly 0.0 (100% invariant). Negative, null, undefined, extreme, and NaN Diagnostik inputs caused 0 deviation.
     - `[NULL-01..NULL-04]`: Missing formatif, missing sumatif, both missing, and completely unrated students evaluate strictly to `null` (not NaN, not 0, not partial).
     - `[WT-01..WT-03]`: Weight sums < 100 (90, 80, 0, 99) rejected; sums > 100 (150, 101, 300, 110) rejected; valid sums == 100 accepted.
     - `[GUARD-01..GUARD-05]`: Adding 2nd Diagnostik blocked; converting Formatif to Diagnostik blocked; deleting Diagnostik blocked; editing existing Diagnostik allowed; adding multi Formatif/Sumatif allowed.
     - `[STATIC-01..STATIC-08]`: All 8 static code and migration constraints verified.

2. **TypeScript Static Check**:
   - Command: `npx tsc --noEmit`
   - Result: Exit code 0 (no errors).

3. **Existing Project Test Suite**:
   - Command: `npm test`
   - Result: Exit code 0 (all 19 test suites passed with 0 failures).

4. **Production Build**:
   - Command: `npm run build` (`next build`)
   - Result: Exit code 0 (`✓ Compiled successfully in 2.9s`, 12/12 static pages generated).

---

## 2. Logic Chain

1. **Formula Correctness**:
   - Observation 1.1.1 shows `semesterFinalRaw = (kehadiranScore * (bobotKehadiran / 100)) + (avgFormatifAll * (bobotFormatif / 100)) + (avgSumatifAll * (bobotSumatif / 100))`.
   - Observation 1.2.1 (`F-01` through `F-07`) empirically tested 7 mathematical variations against independent analytical calculations. In all cases, `toFixed(1)` produced the exact expected output, including floating point fractional rounding and sub-column weights.
   - Therefore, the mathematical formula is verified accurate.

2. **Diagnostik Isolation**:
   - Observation 1.1.2 shows that `formatifCols` and `sumatifCols` only filter columns by `c.kategori === 'Formatif'` and `'Sumatif'`.
   - Observation 1.2.1 (`DIAG-01`) empirically swept Diagnostik values $D \in [0, 100]$ in increments of 1 (101 trials) with identical student attendance, formative, and summative scores. For all 101 trials, the final score was identical to the baseline (85.5) with a maximum deviation of 0.
   - Observation 1.2.1 (`DIAG-02`) verified that null, undefined, negative, or NaN Diagnostik values also produce zero deviation.
   - Therefore, Diagnostik is 100% isolated and invariant.

3. **Missing Data Null Handling**:
   - Observation 1.1.3 shows that `avgFormatifAll !== null && avgSumatifAll !== null` is a prerequisite for computing `semesterFinalRaw`.
   - Observation 1.2.1 (`NULL-01` to `NULL-04`) proved that when Formatif is null, Sumatif is null, both are null, or the student has no grades recorded, `semesterFinal` evaluates to `null`.
   - In none of these cases does it evaluate to `NaN`, fallback to `0`, or leak partial attendance scores.
   - Therefore, null handling satisfies R3 and PROJECT.md contract line 82.

4. **Weight Validation (Sum == 100)**:
   - Observation 1.1.4 shows `if (total !== 100) { showToast('Validasi', ...); return; }` in `handleSaveBobot`.
   - Observation 1.2.1 (`WT-01` to `WT-03`) tested under-sums (< 100%), over-sums (> 100%), and exactly 100% sums. Only sums equal to 100% pass validation.
   - Therefore, weight validation strictly enforces the 100% invariant.

5. **Diagnostik Limit (Max 1 per TP)**:
   - Observation 1.1.5 shows a 4-layered defense: (1) `handleOpenAddColModal` restricts argument types to `'Formatif' | 'Sumatif'`, (2) `handleSaveCol` validates `!existingDiag || editingCol.id === existingDiag.id`, (3) `handleDeleteCol` blocks deleting Diagnostik, (4) DB migration applies partial unique index `uq_asesmen_tp_diagnostik`.
   - Observation 1.2.1 (`GUARD-01` to `GUARD-05`) empirically simulated adversarial attempts to add, convert, or delete Diagnostik columns, and all were blocked.
   - Therefore, the Diagnostik limit is securely enforced at both the UI and database levels.

---

## 3. Caveats

- **External Supabase Live Migration**: The PostgreSQL partial unique index `uq_asesmen_tp_diagnostik` is defined in `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`. In environments without a live connection to the remote Supabase PostgreSQL instance, enforcement relies on the local TypeScript UI guards in `GradebookView.tsx`, which were verified fully functional.
- No other caveats.

---

## 4. Conclusion

All 5 dispatch challenge criteria have been empirically stressed and verified with zero defects:
1. **Nilai Akhir Formula**: Verified `(bobot_kehadiran * rata_kehadiran) + (bobot_formatif * rata_formatif) + (bobot_sumatif * rata_sumatif)` across standard, boundary, and custom weight scenarios.
2. **Diagnostik Isolation**: Verified 100% invariance across 101 sweep points and edge values.
3. **Missing Data Null Handling**: Verified that missing formative or summative scores evaluate to `null` without NaN or partial leakage.
4. **Weight Validation**: Verified strict rejection of any weight combination where sum != 100.
5. **Diagnostik Limit**: Verified UI guard and database constraint blocking addition of second Diagnostik column.
6. **Code Quality**: `npx tsc --noEmit`, `npm test`, and `npm run build` all pass with exit code 0.

**Final Verdict**: **`APPROVE`**

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Run the Empirical Adversarial Harness**:
   ```powershell
   npx tsx tests/gradebook_cp_tp_formula_verification.test.ts
   ```
   *Expected Output*: `SUMMARY: Total Checks: 29 | Passed: 29 | Failed: 0` with verdict `APPROVE`.

2. **Run TypeScript Static Verification**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Output*: Exit code 0 (no errors).

3. **Run Project Test Suite**:
   ```powershell
   npm test
   ```
   *Expected Output*: All 19 test suites pass with exit code 0.

4. **Run Production Build Verification**:
   ```powershell
   npm run build
   ```
   *Expected Output*: Production build completes successfully with exit code 0.
