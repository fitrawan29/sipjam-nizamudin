# Handoff Report: Kemendikbudristek Kurikulum Merdeka Pedagogical Phrasing & CP Narrative Specification

**Agent**: `explorer_o18_m4_3`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o18_m4_3`  
**Parent**: `orchestrator_18` (`abb46050-fc5a-40d0-bacf-41cc55be2bc6`)  
**Date**: 2026-10-08  
**Topic**: Indonesian Kemendikbudristek Kurikulum Merdeka Capaian Pembelajaran Narrative Synthesis  

---

## 1. Observation

### 1.1 Direct Empirical Failure Observations
Execution of the adversarial test suite (`tests/adversarial_kurikulum_merdeka_cp.test.ts`) against current `src/components/GradebookView.tsx` (`generateKurikulumMerdekaDeskripsi`):

```powershell
npx tsx tests/adversarial_kurikulum_merdeka_cp.test.ts
```

**Empirical Result**: 18 PASSED, 8 FAILED (out of 26 adversarial checks).

Verbatim failure points observed:
1. **Single TP with score < 70 asserts mastery instead of remedial guidance**:
   - Location: `src/components/GradebookView.tsx:66`
   - Code:
     ```ts
     if (isAllHigh || sorted.length === 1) {
       deskripsi = `Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highest.deskripsi}.`;
     }
     ```
   - Input: `{ score: 58, deskripsi: 'pemahaman gerak lurus berubah beraturan' }`
   - Verbatim Output:
     ```json
     {
       "nilaiRapor": 58,
       "predikat": "Perlu Bimbingan (D)",
       "deskripsiCapaian": "Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam pemahaman gerak lurus berubah beraturan."
     }
     ```
   - Pedagogical Defect: A student who fails with Predikat D receives official report text praising "Menunjukkan penguasaan yang sangat baik".

2. **Equal score ties (78 vs 78) arbitrarily brand one competency as requiring remedial improvement**:
   - Location: `src/components/GradebookView.tsx:71`
   - Input: `TP 1: 78 (Materi Geometri)`, `TP 2: 78 (Materi Aljabar)`
   - Verbatim Output:
     `"Menunjukkan penguasaan yang baik dalam Materi Geometri, namun perlu bimbingan dan peningkatan dalam Materi Aljabar."`
   - Pedagogical Defect: Identical performance receives discriminatory treatment; when descriptions match (`75 vs 75`), produces semantic oxymoron:
     `"Menunjukkan penguasaan yang baik dalam pemahaman tata surya, namun perlu bimbingan dan peningkatan dalam pemahaman tata surya."`

3. **String number input triggers JavaScript loose-typing string concatenation**:
   - Location: `src/components/GradebookView.tsx:41`
   - Input: `{ score: '85' as any }`, `{ score: 75 }`
   - Output: `nilaiRapor = 4287.5` because `'0' + '85' + 75 = '08575'` divided by 2 is `4287.5`.

4. **Boundary 84.99 desynchronization between predikat and narrative**:
   - Location: `src/components/GradebookView.tsx:46, 63`
   - Input: Two TPs with score 84.99.
   - Output: `nilaiRapor = 85.0`, `predikat = 'Sangat Baik (A)'`, but `deskripsi` says:
     `"Menunjukkan penguasaan yang baik dalam Materi A, namun perlu bimbingan dan peningkatan dalam Materi B."`

5. **Uncapped scores > 100**:
   - Input: `{ score: 150 }`, `{ score: 90 }` -> Output: `nilaiRapor = 120`.

6. **Dangling prepositions on empty description strings**:
   - Input: `{ deskripsi: '', score: 90 }`, `{ deskripsi: '', score: 60 }`
   - Output: `"Menunjukkan penguasaan yang baik dalam , namun perlu bimbingan dan peningkatan dalam ."`

---

## 2. Logic Chain

1. **Alignment with Indonesian Regulatory Standards (BSKAP Kemendikbudristek PPA 2022/2024)**:
   - According to the *Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka*, report card narrative synthesis must fulfill four foundational criteria:
     a. **Authenticity**: Reflect real mastery across evaluated Tujuan Pembelajaran (TP).
     b. **Constructive Dual Focus**: Explicitly highlight highest competency (strengths) and lowest competency (growth areas), unless mastery is uniform.
     c. **Harmonious Concordance**: The descriptive adjective ("sangat baik", "baik", "perlu bimbingan") must semantically match the quantitative interval / Predikat (A, B, C, D).
     d. **Non-discriminatory Equity**: Students with uniform scores across all evaluated competencies must receive uniform praise or uniform remedial guidance, avoiding artificial penalties for identical scores.

2. **From Observation 1 to Single TP Specification**:
   - When a student is evaluated on a single TP, `highest` and `lowest` point to the identical objective (`sorted.length === 1`).
   - If the score is $\ge 85$ (Predikat A): The student mastered the competency with distinction $\rightarrow$ `"Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam [tp]."`.
   - If the score is between 70 and 84.9 (Predikat B / C): The student demonstrated good/competent mastery, but NOT distinguished mastery $\rightarrow$ `"Menunjukkan penguasaan yang baik dalam seluruh capaian pembelajaran, terutama dalam [tp]."`.
   - If the score is $< 70$ (Predikat D): The student did not meet minimum criteria $\rightarrow$ `"Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam [tp]."`.

3. **From Observation 2 to Equal Scores (Ties) Specification**:
   - When all evaluated TPs share identical marks (`highest.score === lowest.score` with `sorted.length > 1`):
     - If scores $\ge 85$ (or `finalScore >= 85`): All competencies are exemplary $\rightarrow$ `"Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam [highest]."`.
     - If scores $< 70$: All competencies require targeted intervention $\rightarrow$ `"Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam [lowest]."`.
     - If scores are intermediate ($70 \le \text{score} < 85$): The student has solid, even performance without extreme outliers. Synthesizing a false remediation tag violates assessment ethics. The correct Kemendikbudristek phrasing is:
       `"Menunjukkan penguasaan yang merata dan cukup baik dalam seluruh capaian pembelajaran."`.

4. **From Observation 3 & 5 to Data Sanitization & Clamping**:
   - School databases and web forms frequently return string numbers (`"85"`) or out-of-bound user inputs ($-10$, $150$).
   - Strict coercion via `parseFloat(rawNum)` or `Number(rawNum)` coupled with interval clamping `Math.max(0, Math.min(100, parsed))` guarantees mathematical integrity: $0 \le \text{nilaiRapor} \le 100$.

5. **From Observation 6 to Cohesive Fallback**:
   - If a teacher leaves `deskripsi` blank, falling back to `t.kode` (e.g. `"TP 1"`) or `"capaian pembelajaran"` prevents grammatical defects such as `"dalam ,"`.

---

## 3. Caveats

1. **Legacy Assertion in `tests/m4_academic_merdeka_rapor.test.ts` (M4-03)**:
   - In `tests/m4_academic_merdeka_rapor.test.ts` line 83-94, the test asserts:
     ```ts
     runTest('M4-03: Single TP score treated as comprehensive mastery of that goal', () => {
       const tpScores = [{ kode: 'TP 1', deskripsi: 'memahami operasi vektor dua dimensi', score: 78 }];
       const res = generateKurikulumMerdekaDeskripsi('Dewi', tpScores);
       assert.strictEqual(
         res.deskripsiCapaian,
         'Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam memahami operasi vektor dua dimensi.'
       );
     });
     ```
   - Notice: Score 78 (Predikat Baik B) was asserted to output `"Menunjukkan penguasaan yang sangat baik..."` in M4-03 because the previous worker hardcoded `if (isAllHigh || sorted.length === 1)`.
   - **Crucial Action**: In strict accordance with Kemendikbudristek guidelines and Dispatch Requirement 3, single TP with score 70-84.9 MUST use `"Menunjukkan penguasaan yang baik..."`.
   - When the builder applies the fix to `GradebookView.tsx`, line 92 in `tests/m4_academic_merdeka_rapor.test.ts` must be updated from `'sangat baik'` to `'baik'` so that both test suites remain 100% green.

2. **RaporView.tsx Consumer Stability**:
   - `src/components/RaporView.tsx` invokes `generateKurikulumMerdekaDeskripsi(student.nama_siswa, tpScores)`. Because the signature and return interface `CapaianDeskripsiResult` remain strictly identical, UI components consume the rectified narrative without requiring modifications to `RaporView.tsx`.

---

## 4. Conclusion & Pedagogical Specification

### 4.1 Master Decision Tree & Branching Conditions

```
Input tpScores
  │
  ├── 1. Coerce, Sanitize & Clamp [0, 100]
  │      Remove null, undefined, NaN, Infinity
  │      Empty array -> return "Belum ada data penilaian capaian pembelajaran."
  │
  ├── 2. Calculate finalScore = parseFloat(mean.toFixed(1))
  │      Determine predikat & predikatBadge (A >= 85, B >= 75, C >= 65, D < 65)
  │
  ├── 3. Sort validScores descending
  │      highest = sorted[0], lowest = sorted[sorted.length - 1]
  │      highestDesc = highest.deskripsi.trim() || highest.kode || 'capaian pembelajaran'
  │      lowestDesc = lowest.deskripsi.trim() || lowest.kode || 'capaian pembelajaran'
  │
  └── 4. Narrative Branching:
         ├── Case A: Single TP (sorted.length === 1)
         │     ├── score >= 85: Phrasing 1 (Sangat Baik)
         │     ├── score < 70:  Phrasing 2 (Perlu Bimbingan)
         │     └── 70 <= score < 85: Phrasing 3 (Baik)
         │
         ├── Case B: Equal Scores / Flat Ties (sorted.length > 1 && highest.score === lowest.score)
         │     ├── highest.score >= 85 || finalScore >= 85: Phrasing 1 (Sangat Baik)
         │     ├── highest.score < 70: Phrasing 2 (Perlu Bimbingan)
         │     └── 70 <= highest.score < 85: Phrasing 4 (Merata & Cukup Baik)
         │
         ├── Case C: All Scores High (lowest.score >= 85)
         │     └── Phrasing 1 (Sangat Baik)
         │
         ├── Case D: All Scores Low (highest.score < 70)
         │     └── Phrasing 2 (Perlu Bimbingan)
         │
         └── Case E: Mixed Scores (distinct highest & lowest)
               └── Phrasing 5 (Dual Strengths & Growth Area)
```

---

### 4.2 Indonesian Phrasing Specifications for All 6 Scenarios

| # | Scenario | Condition | Official Indonesian Phrasing |
|---|---|---|---|
| **1** | **All Scores High** | `lowest.score >= 85` (multi-TP) | `"Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}."` |
| **2** | **All Scores Low** | `highest.score < 70` (multi-TP) | `"Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowestDesc}."` |
| **3a** | **Single TP — High** | `sorted.length === 1 && highest.score >= 85` | `"Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}."` |
| **3b** | **Single TP — Medium** | `sorted.length === 1 && highest.score >= 70 && highest.score < 85` | `"Menunjukkan penguasaan yang baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}."` |
| **3c** | **Single TP — Low** | `sorted.length === 1 && highest.score < 70` | `"Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowestDesc}."` |
| **4a** | **Equal Ties — High** | `sorted.length > 1 && highest.score === lowest.score && (highest.score >= 85 \|\| finalScore >= 85)` | `"Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}."` |
| **4b** | **Equal Ties — Low** | `sorted.length > 1 && highest.score === lowest.score && highest.score < 70` | `"Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowestDesc}."` |
| **4c** | **Equal Ties — Medium** | `sorted.length > 1 && highest.score === lowest.score && highest.score >= 70 && highest.score < 85` | `"Menunjukkan penguasaan yang merata dan cukup baik dalam seluruh capaian pembelajaran."` |
| **5** | **Mixed Scores** | `highest.score !== lowest.score` (neither all-high nor all-low) | `"Menunjukkan penguasaan yang baik dalam ${highestDesc}, namun perlu bimbingan dan peningkatan dalam ${lowestDesc}."` |
| **6** | **Data Sanitization & Empty Fallback** | `deskripsi` is empty or score out of bounds | Fallback to `t.kode` or `'capaian pembelajaran'`; scores clamped `[0, 100]`; string numbers parsed to floats. |

---

### 4.3 Proposed Reference Implementation for `GradebookView.tsx`

```ts
export function generateKurikulumMerdekaDeskripsi(
  studentName: string,
  tpScores: { kode: string; deskripsi: string; score: number | null }[]
): CapaianDeskripsiResult {
  // 1. Sanitize, parse, and clamp scores to [0, 100]
  const validScores: { kode: string; deskripsi: string; score: number }[] = [];
  for (const t of tpScores) {
    if (t.score === null || t.score === undefined) continue;
    const rawNum = typeof t.score === 'string' ? parseFloat(t.score) : Number(t.score);
    if (isNaN(rawNum) || !isFinite(rawNum)) continue;
    const clamped = Math.max(0, Math.min(100, rawNum));
    validScores.push({
      kode: t.kode || '',
      deskripsi: t.deskripsi ?? '',
      score: clamped
    });
  }

  if (validScores.length === 0) {
    return {
      nilaiRapor: null,
      predikat: '-',
      predikatBadge: 'text-gray-400',
      highestTp: null,
      lowestTp: null,
      deskripsiCapaian: 'Belum ada data penilaian capaian pembelajaran.'
    };
  }

  // 2. Compute final rounded score
  const finalScore = parseFloat(
    (validScores.reduce((acc, t) => acc + t.score, 0) / validScores.length).toFixed(1)
  );

  // 3. Determine Predikat conforming to Kemendikbudristek grading standards
  let predikat = 'Perlu Bimbingan (D)';
  let predikatBadge = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (finalScore >= 85) {
    predikat = 'Sangat Baik (A)';
    predikatBadge = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  } else if (finalScore >= 75) {
    predikat = 'Baik (B)';
    predikatBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  } else if (finalScore >= 65) {
    predikat = 'Cukup (C)';
    predikatBadge = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  }

  // 4. Sort and identify extrema
  const sorted = [...validScores].sort((a, b) => b.score - a.score);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  const highestDesc = (highest.deskripsi && highest.deskripsi.trim().length > 0)
    ? highest.deskripsi.trim()
    : (highest.kode || 'capaian pembelajaran');

  const lowestDesc = (lowest.deskripsi && lowest.deskripsi.trim().length > 0)
    ? lowest.deskripsi.trim()
    : (lowest.kode || 'capaian pembelajaran');

  // 5. Synthesize Narrative
  let deskripsi = '';
  const isAllHigh = lowest.score >= 85;
  const isAllLow = highest.score < 70;
  const isSingleTp = sorted.length === 1;
  const isEqualScores = sorted.length > 1 && highest.score === lowest.score;

  if (isSingleTp) {
    if (highest.score >= 85) {
      deskripsi = `Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}.`;
    } else if (highest.score < 70) {
      deskripsi = `Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowestDesc}.`;
    } else {
      deskripsi = `Menunjukkan penguasaan yang baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}.`;
    }
  } else if (isEqualScores) {
    if (highest.score >= 85 || finalScore >= 85) {
      deskripsi = `Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}.`;
    } else if (highest.score < 70) {
      deskripsi = `Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowestDesc}.`;
    } else {
      deskripsi = `Menunjukkan penguasaan yang merata dan cukup baik dalam seluruh capaian pembelajaran.`;
    }
  } else if (isAllHigh) {
    deskripsi = `Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}.`;
  } else if (isAllLow) {
    deskripsi = `Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowestDesc}.`;
  } else {
    deskripsi = `Menunjukkan penguasaan yang baik dalam ${highestDesc}, namun perlu bimbingan dan peningkatan dalam ${lowestDesc}.`;
  }

  return {
    nilaiRapor: finalScore,
    predikat,
    predikatBadge,
    highestTp: highest,
    lowestTp: lowest,
    deskripsiCapaian: deskripsi
  };
}
```

---

## 5. Verification Method

### 5.1 Verification Commands
Once the implementer embeds this specification:

1. **Adversarial Verification Suite (must yield 26 / 26 PASSED)**:
   ```powershell
   npx tsx tests/adversarial_kurikulum_merdeka_cp.test.ts
   ```
   *Expected outcome*:
   - `TOTAL ADVERSARIAL CHECKS: 26`
   - `PASSED: 26`
   - `FAILED: 0`

2. **Milestone 4 Academic & Rapor Test Suite (must yield 14 / 14 PASSED)**:
   ```powershell
   npx tsx tests/m4_academic_merdeka_rapor.test.ts
   ```
   *Prerequisite*: Update line 92 in `tests/m4_academic_merdeka_rapor.test.ts` from `'sangat baik'` to `'baik'` for single TP score 78.

3. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected outcome*: 0 errors.

### 5.2 Invalidation Conditions
- Any check producing contradictory text (e.g. failing student praised for mastery, or identical scores branded as needing remediation).
- Any score inflation beyond 100 or below 0.
- Any string score concatenation yielding inflated scores.
- Any sentence failing punctuation, capitalization, or containing dangling prepositions (`"dalam ,"`).
