# HANDOFF REPORT — CHALLENGER M2: GRADE-LEVEL ISOLATION & ZERO CROSS-GRADE LEAKAGE

**Agent**: `challenger_m2_nov_2`  
**Date**: 2026-11-06T23:58:30Z  
**Verdict**: **APPROVE**  
**Role**: Empirical Challenger (critic, specialist)  
**Target Module**: `src/components/GradebookView.tsx`, `tests/adversarial_grade_isolation.test.ts`  

---

## 1. Observation

1. **Naming Permutations Stress-Testing (`parseTingkat`)**:
   - Tested 53 Grade 10 naming permutations:
     * Roman: `X`, `x`, `X 1`, `X-1`, `X.1`, `X_1`, `X-A`, `X A`, `X.A`, `X-IPA`, `X-IPA-1`, `X IPA 1`, `X-IPS`, `X IPS 2`, `X Merdeka`, `X Merdeka 1`, `X Merdeka 2`, `X-Merdeka-A`, `X RPL 1`, `X TKJ 2`, `X MM`, `Kelas X`, `Kelas X-1`, `Kelas X A`, `Tingkat X`, `SMK X TKJ 1`, `(Kelas X)`, `[X]`.
     * Arabic: `10`, `10 1`, `10-1`, `10.1`, `10_1`, `10A`, `10-A`, `10 B`, `10.B`, `10-IPA`, `10-IPA-1`, `10-IPS`, `10 IPS 2`, `10 Merdeka`, `10 Merdeka 1`, `10 RPL 1`, `10 TKJ 2`, `Kelas 10`, `Kelas 10-A`, `Tingkat 10`, `SMA Negeri 10-A`, `(10)`, `[10]`.
     * Result: 53/53 parsed strictly to `'10'` (100% pass).
   - Tested 54 Grade 11 naming permutations:
     * Roman: `XI`, `xi`, `XI 1`, `XI-1`, `XI.1`, `XI_1`, `XI-A`, `XI A`, `XI.A`, `XI-IPA`, `XI-IPA-1`, `XI IPA 1`, `XI-IPS`, `XI-IPS-2`, `XI IPS 2`, `XI Merdeka`, `XI Merdeka 1`, `XI Merdeka 2`, `XI-Merdeka-B`, `XI RPL 1`, `XI TKJ 2`, `XI MM`, `Kelas XI`, `Kelas XI-1`, `Kelas XI B`, `Tingkat XI`, `SMK XI TKJ 1`, `(Kelas XI)`, `[XI]`.
     * Arabic: `11`, `11 1`, `11-1`, `11.1`, `11_1`, `11A`, `11B`, `11-B`, `11 C`, `11.C`, `11-IPA`, `11-IPA-1`, `11-IPS`, `11 IPS 2`, `11 Merdeka`, `11 Merdeka 2`, `11 RPL 1`, `11 TKJ 2`, `Kelas 11`, `Kelas 11-B`, `Tingkat 11`, `SMA Negeri 11-B`, `(11)`, `[11]`.
     * Result: 54/54 parsed strictly to `'11'` (100% pass).
   - Tested 56 Grade 12 naming permutations:
     * Roman: `XII`, `xii`, `XII 1`, `XII-1`, `XII.1`, `XII_1`, `XII-A`, `XII A`, `XII.A`, `XII-IPA`, `XII-IPA-1`, `XII IPA 1`, `XII-IPS`, `XII-IPS-2`, `XII IPS 2`, `XII Merdeka`, `XII Merdeka 1`, `XII Merdeka 2`, `XII-Merdeka-C`, `XII RPL 1`, `XII TKJ 2`, `XII MM`, `Kelas XII`, `Kelas XII-1`, `Kelas XII C`, `Tingkat XII`, `SMK XII TKJ 1`, `(Kelas XII)`, `[XII]`.
     * Arabic: `12`, `12 1`, `12-1`, `12.1`, `12_1`, `12A`, `12B`, `12C`, `12-C`, `12 D`, `12.D`, `12-IPA`, `12-IPA-1`, `12-IPS`, `12 IPS 2`, `12 Merdeka`, `12 Merdeka 3`, `12 RPL 1`, `12 TKJ 2`, `Kelas 12`, `Kelas 12-C`, `Tingkat 12`, `SMA Negeri 12-C`, `(12)`, `[12]`.
     * Result: 56/56 parsed strictly to `'12'` (100% pass).
   - Tested 13 negative / non-grade strings:
     * `Linux`, `Matrix`, `Text Processing`, `Max Media`, `Pixel Art 3D`, `Bahasa Sunda`, `Pendidikan Agama Islam`, `Pendidikan Pancasila`, `Bimbingan Konseling`, `Ekstrakurikuler Pramuka`, `""`, `null`, `undefined`.
     * Result: 13/13 parsed strictly to `'Lainnya'` without false-positive matches (100% pass).

2. **Subject Grade Resolution & Phase E (`getSubjectTingkat`)**:
   - Direct subject names correctly resolve: `Matematika X` -> `'10'`, `XI Matematika Tingkat Lanjut` -> `'11'`, `XII Administrasi Server` -> `'12'`.
   - Kurikulum Merdeka Phase E subjects correctly resolve: `Informatika Fase E` -> `'10'`, `Dasar Kejuruan (Fase E)` -> `'10'`, `Projek IPAS Fase E` -> `'10'`.
   - Category-based lookup correctly resolves: `{ nama_mapel: 'Informatika', kategori: 'Kelas X' }` -> `'10'`, `{ nama_mapel: 'Dasar Pemrograman', kategori: '11 RPL' }` -> `'11'`, `{ nama_mapel: 'Sistem Operasi Jaringan', kategori: 'XII TKJ' }` -> `'12'`, `{ nama_mapel: 'Agama Islam', kategori: 'Umum' }` -> `null`.

3. **Grade-Level Isolation & Zero Cross-Grade Leakage**:
   - When a multi-grade teacher (`Drs. Joko Susilo, M.Pd`) teaching across grades 10, 11, and 12 has a Grade 11 subject selected (`XI Matematika Tingkat Lanjut`), the resolved classes are strictly `['11B', 'XI MIPA 1', 'XI-IPA']`:
     * Grade 11 classes: 3/3 (100%).
     * Grade 10 leakage: 0 (0%).
     * Grade 12 leakage: 0 (0%).
   - When a Grade 10 subject is selected (`Dasar Kejuruan X`), resolved classes are strictly `['10A', 'X RPL 1', 'X-1']` with 0% Grade 11 or Grade 12 leakage.
   - When a Grade 12 subject is selected (`XII Administrasi Server`), resolved classes are strictly `['12C', 'XII TKJ 1', 'XII-IPS']` with 0% Grade 10 or Grade 11 leakage.

4. **Fallback Scenarios (Teacher Unassigned Class in `guru_mapel`)**:
   - For an unassigned subject row (e.g. `Kimia Kelas XI` with `kelas = ''`), fallback master classes are strictly filtered by `parseTingkat(k) === '11'`. Zero Grade 10 or Grade 12 classes leaked.
   - For `Projek IPAS Fase E` with `kelas = ''`, fallback master classes are strictly filtered by `parseTingkat(k) === '10'`. Zero Grade 11 or Grade 12 classes leaked.
   - For `Fisika XII` with `kelas = ''`, fallback master classes are strictly filtered by `parseTingkat(k) === '12'`. Zero Grade 10 or Grade 11 classes leaked.

5. **Parallel Class Switching & Invariant Preservation**:
   - Switching between parallel classes `XI-1` and `XI-2` where teacher teaches `Matematika XI` in both: `res.selectedMapel` is preserved as `Matematika XI` (verified via `stillTeaches`).
   - Switching from `XI-1` to `XI-2` when on `Fisika XI` (only taught in `XI-1`): `selectedMapel` cleanly updates to the mapel taught in `XI-2`.
   - Switching mapel while on `XI-1`: `selectedKelas` is preserved as `XI-1` (verified via `currentClassValid`).

6. **Execution Outputs**:
   - `npx tsx tests/adversarial_grade_isolation.test.ts`: **193 passed, 0 failed** (100% pass).
   - `npx tsx tests/gradebook_cascading_selection.test.ts`: **27 passed, 0 failed**.
   - `npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts`: **15 passed, 0 failed**.
   - `npx tsx tests/gradebook_teacher_filter_ponytail.test.ts`: **17 passed, 0 failed**.
   - `npx tsx tests/forensic_gradebook_audit.test.ts`: **24 passed, 0 failed**.
   - `npx tsx tests/gradebook_unified_setup_flow.test.ts`: **44 passed, 0 failed**.
   - `npx tsc --noEmit`: Exited with code 0 (zero errors).
   - `npm run build`: Compiled successfully in 2.2s, TypeScript passed in 2.7s, Next.js static pages generated (13/13) with code 0.

---

## 2. Logic Chain

1. **Ordering of Regular Expression Checks Prevents Substring Collisions**:
   - In `parseTingkat`, check order is strictly `12/XII` first, followed by `11/XI`, followed by `10/X`.
   - Because `XII` contains `XI` and `X`, checking `XII` first guarantees Roman numeral XII is never misclassified as XI or X.
   - Because `XI` contains `X`, checking `XI` before `X` guarantees XI is never misclassified as X.
   - Empirical test with 163 positive class/subject naming permutations verified that no roman numeral collision or prefix collision occurred.
2. **Boundary Anchoring Prevents False Positives on Common Words**:
   - By anchoring on word boundaries (`\b`) and string starts (`^`), words containing 'x' such as `Linux`, `Matrix`, `Text Processing`, `Max Media`, `Pixel Art 3D` correctly yield `'Lainnya'` and do not trigger false-positive grade detection.
3. **Strict Mathematical Filtering Guarantees Zero Cross-Grade Leakage**:
   - When `targetTingkat` is resolved, `matchingClasses.filter(k => parseTingkat(k) === targetTingkat)` and fallback `masterClasses.filter(k => parseTingkat(k) === targetTingkat)` enforce an absolute predicate: only classes with matching grade level are admitted to the array.
   - In multi-grade test matrices across 10, 11, and 12, cross-grade leakage was measured at exactly 0.00%.
4. **Preservation of `stillTeaches` and `currentClassValid` Protects Parallel Class UX**:
   - When switching between parallel classes (`XI-1` and `XI-2`), `stillTeaches` verifies if the target class also teaches the selected subject. If true, the user's active subject is preserved.
   - When switching subjects within the same class, `currentClassValid` ensures the active class is not unnecessarily jumped to the first class in the pool.

---

## 3. Caveats

- For universal subjects with no grade indication in name or category (e.g. `Pendidikan Agama Islam`, `Bimbingan Konseling` with `kategori = 'Umum'`), `getSubjectTingkat` returns `null`. Under this condition, grade filtering is intentionally bypassed to allow all classes assigned to the teacher without false-positive omission. This is by design and respects existing curriculum rules.

---

## 4. Conclusion

**VERDICT: APPROVE**

The Grade-Level (Tingkat) Isolation & Zero Cross-Grade Leakage requirements (Milestone M2 / Requirement R3) are empirically verified and fully sound:
1. All Roman numerals, Arabic numerals, prefix alphanumeric combinations, and Kurikulum Merdeka Phase E patterns parse accurately without leakage.
2. Cross-grade leakage between Class 10, Class 11, and Class 12 is verified to be 0%.
3. Fallback master classes strictly filter by target grade level when teacher has no explicit class assignment.
4. Parallel class switching preserves user selections cleanly via `stillTeaches` and `currentClassValid`.
5. All 193 adversarial checks, 127 regression checks across 5 suites, TypeScript compiler, and Next.js production build pass with 100% success.

---

## 5. Verification Method

To independently reproduce the empirical adversarial results:

1. **Run the Adversarial Grade Isolation Test Suite**:
   ```powershell
   npx tsx tests/adversarial_grade_isolation.test.ts
   ```
   *Expected*: Code 0, 193/193 checks passed.

2. **Run All Milestone M2 Regression Suites**:
   ```powershell
   npx tsx tests/gradebook_cascading_selection.test.ts
   npx tsx tests/mata_pelajaran_kelas_paralel_isolation.test.ts
   npx tsx tests/gradebook_teacher_filter_ponytail.test.ts
   npx tsx tests/forensic_gradebook_audit.test.ts
   npx tsx tests/gradebook_unified_setup_flow.test.ts
   ```
   *Expected*: All test suites pass with 100% success rate.

3. **Verify Type Checking & Production Build**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
   *Expected*: Code 0, 0 errors.
