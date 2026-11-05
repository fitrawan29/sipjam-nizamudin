# Adversarial Challenge Report — Milestone M3 (R4: Asesmen, Raport, & Bobot Kehadiran Dinamis)

## Challenge Summary

- **Verdict**: **APPROVE**
- **Overall Risk Assessment**: **LOW**
- **Test Executions**:
  - `npx tsx tests/test_m3_r4_logic.ts` → **9/9 PASSED**
  - `npx tsx tests/adversarial_m3_r4_stress.test.ts` → **14/14 PASSED**
  - `npx tsx tests/e_rapor_tahun_ajaran_sync.test.ts` → **13/13 PASSED**
  - `npx tsc --noEmit` → **0 errors**
  - `npm test` → **49 test suites (all tests) PASSED**
  - `npm run build` → **Compiled successfully in 2.1s**

---

## 1. Observation

1. **Academic Year & Semester Active Configuration Synchronization**:
   - In `src/components/GradebookView.tsx` lines 553–597, `fetchAcademicYearSettings` retrieves active configuration from table `pengaturan` (supporting both key-value pairs `key = 'tahun_ajaran'` and row fields `item.tahun_ajaran`), safely normalizes semester values (`'Genap'` / `'Ganjil'`), and directly sets `setSelectedTahunAjaran(tahunVal)` and `setSelectedSemester(normSem)` without any `if (!isAdmin)` restriction.
   - In `src/components/GradebookView.tsx` lines 225–251, lazy `useState` initializers read `localStorage.getItem('sipjam_config_sync')` for immediate synchronous hydration on mount before network requests finish.
   - In `src/components/GradebookView.tsx` lines 600–647, event listeners for `window.addEventListener('sipjam:config_updated', handleConfigSync)` and `window.addEventListener('storage', handleStorageSync)` update `selectedTahunAjaran`, `selectedSemester`, and `tpForm` in real time, with strict multi-tenant boundary checks (`detail.sekolah_id !== sekolahId`).
   - In `src/components/RaporView.tsx` lines 241 & 251, the condition `if (isInitial || !hasInitializedConfig.current || isAdmin || selectedTahunAjaranRef.current === prevActiveTa)` guarantees that administrators are automatically synchronized to the active school year and semester.
   - In `src/components/RaporView.tsx` lines 336–388, `handleConfigSync` listens to `sipjam:config_updated` and updates `selectedTahunAjaran` and `selectedSemester` for Admin and Guru alike.

2. **Dynamic Attendance Status Points & Math Accumulation**:
   - In `src/components/GradebookView.tsx` lines 24–38:
     ```ts
     export interface AttendanceStatusPoints {
       hadir: number;
       sakit: number;
       izin: number;
       terlambat: number;
       alpa: number;
     }
     export const DEFAULT_STATUS_POINTS: AttendanceStatusPoints = {
       hadir: 100,
       sakit: 75,
       izin: 75,
       terlambat: 75,
       alpa: 0,
     };
     ```
   - In `src/components/GradebookView.tsx` lines 1060–1066, `handleSaveBobot` enforces input bounds and type sanitization via:
     ```ts
     const pointsToSave: AttendanceStatusPoints = {
       hadir: Math.min(100, Math.max(0, Number(statusPointsForm.hadir) || 0)),
       sakit: Math.min(100, Math.max(0, Number(statusPointsForm.sakit) || 0)),
       izin: Math.min(100, Math.max(0, Number(statusPointsForm.izin) || 0)),
       terlambat: Math.min(100, Math.max(0, Number(statusPointsForm.terlambat) || 0)),
       alpa: Math.min(100, Math.max(0, Number(statusPointsForm.alpa) || 0)),
     };
     ```
   - In `src/components/GradebookView.tsx` lines 406–457, `fetchMapelAttendance` aggregates student points:
     ```ts
     const rate = (earned / (validSessions * 100)) * 100;
     rates[s.nisn] = parseFloat(Math.min(100, Math.max(0, rate)).toFixed(1));
     ```
     With fallback default rate of 100% when no sessions exist or when records are absent (`defaultRates[s.nisn] = 100`).

---

## 2. Logic Chain

1. **Adversarial Stress-Testing of Default Semester and Academic Year Logic**:
   - **Scenario 1.1 (Schema Polymorphism)**: Evaluated configuration extraction against:
     - Key-value config: `{ key: 'tahun_ajaran', value: '2026/2027' }, { key: 'semester', value: 'Genap' }` → Successfully extracts `2026/2027` and `Genap`.
     - Key-value config: `{ key: 'tahun_ajaran', value: '2025/2026' }, { key: 'semester', value: 'Ganjil' }` → Successfully extracts `2025/2026` and `Ganjil`.
     - Legacy row-level fields: `{ tahun_ajaran: '2027/2028', semester: 'genap' }` → Successfully extracts `2027/2028` and normalizes to `Genap`.
     - Whitespace and case variations: `  GENAP  ` → Normalized cleanly to `Genap`.
     - Empty array / null configs: `[]` → Falls back gracefully to `2024/2025` and `Ganjil` without throwing errors or setting `undefined`.
   - **Scenario 1.2 (Admin Entitlement)**: Tested if Admin receives active configuration by default. Verified in code and tests that removal of `if (!isAdmin)` in `GradebookView` and presence of `isAdmin || ...` in `RaporView` ensures Admin consistently receives the active semester and academic year.
   - **Scenario 1.3 (Real-time Broadcast & Tenant Isolation)**: Tested dispatch of `sipjam:config_updated`. When dispatched with current `sekolah_id`, selection updates instantly in both views. When dispatched with a different `sekolah_id`, the event is dropped, preventing cross-tenant leakage.

2. **Adversarial Stress-Testing of Dynamic Attendance Status Points Calculation**:
   - **Scenario 2.1 (Default Point Math)**:
     - 1 Hadir (100) + 1 Sakit (75) out of 2 meetings:
       $$\text{Rate} = \frac{100 + 75}{2 \times 100} \times 100 = \frac{175}{200} \times 100 = 87.5\%$$
       Matches calculation assertion exactly.
     - 1 Hadir (100) + 1 Alpa (0) out of 2 meetings:
       $$\text{Rate} = \frac{100 + 0}{200} \times 100 = 50.0\%$$
       Matches calculation assertion exactly.
   - **Scenario 2.2 (Custom Weights Formulation)**:
     - Configured: Hadir = 100, Sakit = 50, Izin = 50, Terlambat = 50, Alpa = 0.
     - 1 Hadir (100) + 1 Sakit (50) out of 2 meetings: $\frac{150}{200} \times 100 = 75.0\%$.
     - 1 Hadir (100) + 1 Sakit (50) + 1 Izin (50) + 1 Terlambat (50) out of 4 meetings: $\frac{250}{400} \times 100 = 62.5\%$.
     - 4 Alpa (0) out of 4 meetings: $\frac{0}{400} \times 100 = 0.0\%$.
     All match calculation assertions exactly.
   - **Scenario 2.3 (Extreme Boundary & Edge Cases)**:
     - Zero valid sessions ($validSessions = 0$): Cleanly returns 100% default fallback; no division by zero, no `NaN`, no `Infinity`.
     - Student omitted from attendance in conducted sessions: Correctly earns 0 points $\rightarrow 0.0\%$.
     - Negative input clamping: `-50` clamped to `0`.
     - Overflow input clamping: `250` clamped to `100`.
     - Non-numeric / NaN input: `'invalid'` clamped to `0`.
     - Raw status string variations: Correctly resolves `'hadir'`, `'HADIR'`, `'H'`, `'h'`, `'Bebas Hadir'`, `'Sakit'`, `'SAKIT'`, `'S'`, `'s'`, `'Izin'`, `'IZIN'`, `'I'`, `'i'`, `'Dinas Luar'`, `'Terlambat'`, `'TERLAMBAT'`, `'T'`, `'t'`, `'Alpa'`, `'ALPA'`, `'A'`, `'a'`, `'Bolos'`.
     - Unknown status strings: Default to 0 points.
     - Legacy data without `status_points` key: Defensively falls back to `{ hadir: 100, sakit: 75, izin: 75, terlambat: 75, alpa: 0 }`.

---

## 3. Stress Test Results

| Test ID | Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **ST-01** | Diverse config extraction (2026/2027 Genap, 2025/2026 Ganjil, legacy row fields) | Extracts correct values with whitespace/case normalization | Exact match | **PASS** |
| **ST-02** | Legacy empty / null config fallback | Defaults safely to 2024/2025 Ganjil | Exact match | **PASS** |
| **ST-03** | Admin active year/semester default in GradebookView & RaporView | Admin receives active configuration without restriction | Verified | **PASS** |
| **ST-04** | `sipjam:config_updated` real-time sync with multi-tenant check | Updates state immediately; drops mismatched tenant events | Verified | **PASS** |
| **ST-05** | Multi-tab `storage` event & corrupted JSON resilience | Parses valid updates; handles broken JSON without throwing | Verified | **PASS** |
| **ST-06** | Dynamic Academic Year dropdown list with active marker | Preserves active year and appends ` (Aktif)` | Verified | **PASS** |
| **ST-07** | Default points: 1 Hadir (100) + 1 Sakit (75) out of 2 meetings | Produces exactly 87.5% | $87.5\%$ | **PASS** |
| **ST-08** | Default points: 1 Hadir (100) + 1 Alpa (0) out of 2 meetings | Produces exactly 50.0% | $50.0\%$ | **PASS** |
| **ST-09** | Custom points (H=100, S=50, I=50, T=50, A=0): 1H + 1S in 2 meetings | Produces exactly 75.0% | $75.0\%$ | **PASS** |
| **ST-10** | Custom points (H=100, S=50, I=50, T=50, A=0): 1H + 1S + 1I + 1T in 4 meetings | Produces exactly 62.5% | $62.5\%$ | **PASS** |
| **ST-11** | Zero valid sessions boundary condition | Returns 100% fallback cleanly (no NaN/Infinity) | $100\%$ | **PASS** |
| **ST-12** | Student missing from attendance when sessions took place | Computes 0 earned points = 0.0% | $0.0\%$ | **PASS** |
| **ST-13** | Input clamping in `handleSaveBobot` for negative, >100, and NaN | Clamped strictly to [0, 100] range | Verified | **PASS** |
| **ST-14** | Raw status aliases and unknown status resilience | Robust pattern matching and 0-point fallback | Verified | **PASS** |

---

## 4. Caveats

- **No Caveats**: The implementation is mathematically sound, fully type-safe, backward-compatible with legacy database records, and protected against division by zero and null-reference errors.

---

## 5. Conclusion

Milestone M3 (R4) satisfies all requirements and acceptance criteria:
1. Academic year and semester defaults are reliably selected for Administrator and Teacher accounts across `GradebookView` and `RaporView`, with instant `localStorage` hydration and cross-tab/real-time event synchronization.
2. Dynamic attendance status points configuration is cleanly integrated, persisted into `bobot_nilai_mapel`, validated within $[0, 100]$, and accurately computed via the accumulated points formula.

**Final Verdict: APPROVE**

---

## 6. Verification Method

To independently reproduce and verify this assessment:
```bash
# 1. Run M3 worker verification logic
npx tsx tests/test_m3_r4_logic.ts

# 2. Run adversarial stress test suite
npx tsx tests/adversarial_m3_r4_stress.test.ts

# 3. Run e-rapor synchronization test suite
npx tsx tests/e_rapor_tahun_ajaran_sync.test.ts

# 4. Check TypeScript types
npx tsc --noEmit

# 5. Run full test suite
npm test

# 6. Verify production build
npm run build
```
