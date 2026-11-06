# Empirical Challenger Handoff Report — Milestone M1

**Agent**: `challenger_m1_nov_1`  
**Roles**: critic, specialist  
**Date**: 2026-11-06T23:26:00Z  
**Verdict**: **APPROVE**  
**Working Directory**: `.agents/teamwork/challenger_m1_nov_1/`  
**Test Suite**: `tests/adversarial_m1_challenger_stress.test.ts`

---

## 1. Observation

1. **Holiday Evaluation in `src/components/AdminVerifView.tsx` (Lines 597–639, 642–856)**:
   - Sundays are unconditionally treated as holidays: `if (effectiveDayName === 'Minggu') return { isHoliday: true, keterangan: 'Hari Minggu (Libur Akhir Pekan)' };`
   - Saturdays are conditioned on `hariSekolah`: `if (effectiveDayName === 'Sabtu' && hariSekolah === 5) return { isHoliday: true, keterangan: 'Hari Sabtu (Libur Sekolah 5 Hari)' };`
   - Single-day and multi-day calendar holidays matching `tipe: 'Libur'` return `{ isHoliday: true, keterangan: calMatch.keterangan }`.
   - When `holidayInfo?.isHoliday === true`, lines 644, 734, and 814 immediately return `[]` for `unsubmittedPresensi`, `unsubmittedJurnal`, and `unsubmittedPiket`.
   - In `tests/adversarial_m1_challenger_stress.test.ts`, 25 distinct holiday dates were evaluated across Sundays, Saturdays (5 vs 6 days), single-day calendar events, and multi-day date spans (`2026-12-21` to `2026-12-31`). On every holiday, `unsubmittedPresensi`, `unsubmittedJurnal`, and `unsubmittedPiket` returned 0 delinquent teachers.

2. **Multi-Day Leaves in `src/lib/attendanceAlpa.ts` (Lines 1067–1096, 1133–1165, 1349–1365)**:
   - When resolving teacher presence on `targetDateStr` (Day 2 or Day 3 of leave), lines 1067–1096 query active multi-day leaves spanning the evaluated date via `lte('tanggal_mulai', evaluatedDate).neq('status_verifikasi', 'Ditolak')` and duration check `evaluatedDate <= computedEnd`.
   - Lines 1105–1108 evaluate `leaveType` as `'Sakit'` or `'Izin'`.
   - Lines 1133–1158 insert KBM records with `status_verifikasi: leaveType`, `materi: leaveType`, and `catatan_admin: 'Otomatis terisi sesuai presensi (' + leaveType + ')'`.
   - In `tests/adversarial_m1_challenger_stress.test.ts`, empirical execution of `recordUnfilledJournalsAndPiket` and `autoCloseOrMarkDelinquentJournals` on Day 1 (`2026-11-02`), Day 2 (`2026-11-03`), and Day 3 (`2026-11-04`) for a teacher on approved sick leave produced `status_verifikasi: 'Sakit'` on all 3 days, with 0 instances of `'Tidak Masuk Kelas'` and 0 instances of `'Tidak Melaksanakan Kegiatan'`.
   - In contrast, an unexcused teacher without leave evaluated on Day 1 empirically received `status_verifikasi: 'Tidak Masuk Kelas'` and `'tidak melaksanakan kegiatan apapun'`.

3. **Attendance Sickness Credit & Alpa in `src/components/AdminRekapView.tsx` (Lines 262–277, 361–435, 470–487)**:
   - Lines 373–376 identify `isSakit = jenisLower === 'sakit' || detailLower.includes('sakit') || statusLower === 'sakit'`.
   - Lines 386–435 iterate over leave dates, filtering with `dStr >= startDateStr && dStr <= endDateStr && !isWeekend && !liburDates.has(dStr) && !creditedLeaveDates[canonicalNama].has(dStr)`.
   - Lines 401 and 423 credit `pMap[canonicalNama].sakit++` and add the date to `creditedLeaveDates[canonicalNama]`.
   - Line 480 calculates `alpa = Math.max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin)`.
   - In `tests/adversarial_m1_challenger_stress.test.ts`:
     - A teacher with 4 days Hadir and 1 day Sakit in a 5-day week achieved `sakit: 1, alpa: 0`.
     - A teacher with a full 5-day sick leave achieved `sakit: 5, alpa: 0`.
     - A cross-month sick leave (`2026-10-28` to `2026-11-04`, 8 calendar days) credited exactly 3 workdays in October and 3 workdays in November (total 6 workdays), with zero under-counting and zero double-counting.
     - When a single-day presence record and a multi-day leave record coexisted on the same day, `creditedLeaveDates` prevented duplicate counting.
     - When a calendar holiday overlapped with sick leave, the holiday was excluded from workdays and excluded from sick days, maintaining `alpa: 0`.

4. **Journal Printing in `src/components/RekapJurnalView.tsx` (Lines 659–667, 978–1112)**:
   - Lines 661–667 filter `filteredJurnal`:
     ```ts
     const statusLower = (j.status_verifikasi || '').toLowerCase();
     const ketLower = (j.keterangan || '').toLowerCase();
     const matLower = (j.materi || j.materi_pembelajaran || '').toLowerCase();
     if (statusLower === 'libur' || ketLower === 'libur' || matLower === 'libur') {
       return false;
     }
     ```
   - In `tests/adversarial_m1_challenger_stress.test.ts`, all 4 variations of "Libur" entries were completely filtered out from `filteredJurnal` (0 "Libur" rows in print document).
   - Programmatic static markup rendering of `renderAttendanceBadge` confirmed:
     - `Sakit` badge renders text `'Sakit'` with CSS classes `bg-rose-100 text-rose-700` without `'tidak masuk kelas'`.
     - `Izin` badge renders text `'Izin'` with CSS classes `bg-amber-100 text-amber-700` without `'tidak masuk kelas'`.
     - `Dinas Luar` badge renders text `'Dinas Luar'` with CSS classes `bg-blue-100 text-blue-700`.

---

## 2. Logic Chain

1. **Presensi & Jurnal on Non-Teaching Days**:
   - Because `holidayInfo` explicitly checks Sunday, Saturday (for `hariSekolah === 5`), and single/multi-day calendar holidays (Observation 1), non-teaching days are accurately identified.
   - Because `unsubmittedPresensi`, `unsubmittedJurnal`, and `unsubmittedPiket` immediately exit with `[]` on holidays, no teachers are falsely penalized as delinquent on days where school is not in session.
   - Because `recordUnfilledJournalsAndPiket` queries active multi-day leaves covering the target date (Observation 2), approved multi-day leaves on Day 2 and Day 3 automatically assign `status_verifikasi: leaveType`, preventing false auto-creation of `'Tidak Masuk Kelas'`.

2. **Attendance Sickness Credit & Alpa**:
   - Because `AdminRekapView` now includes `isSakit` handling alongside `isIzin` (Observation 3), sick days increment `sakit++` rather than being skipped.
   - Because `alpa = max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin)`, crediting `sakit` offsets `totalHariKerja` one-for-one, keeping `alpa = 0`.
   - Because `creditedLeaveDates` tracks dates within `[startDateStr, endDateStr]` and excludes weekends and holidays, cross-month leaves are bounded strictly to their respective month windows without duplication.

3. **Accurate Document Printing**:
   - Because `filteredJurnal` excludes rows with `status_verifikasi`, `keterangan`, or `materi` of `'libur'` (Observation 4), official print documents never contain misleading "Libur" rows.
   - Because `RekapJurnalView` maps `isSakit` and `isIzin` to distinct badge styles (`bg-rose-100` and `bg-amber-100`), attendance excuses print with high clarity and contrast.

---

## 3. Caveats

- **No Caveats**: All 3 assigned targets were empirically stress-tested with real functions, generators, and stateful test harnesses. 71 out of 71 assertions passed with a 100% success rate, and TypeScript compilation (`npx tsc --noEmit`) completed with 0 errors.

---

## 4. Conclusion

**Verdict**: **APPROVE**

Milestone M1 satisfies all requirements for:
1. Presensi & Jurnal validation on non-teaching days (Sundays, Saturdays 5 vs 6 days, calendar holidays, multi-day approved leaves Day 1–3).
2. Attendance sickness credit in `AdminRekapView` (`sakit` credited, `alpa = 0`, cross-month boundaries verified).
3. Accurate journal printing in `RekapJurnalView` (exclusion of "Libur" rows, clear badge rendering for `Sakit` and `Izin`).

---

## 5. Verification Method

To independently reproduce and verify this challenger assessment:

1. **Run Empirical Challenger Stress Test Suite**:
   ```powershell
   npx tsx tests/adversarial_m1_challenger_stress.test.ts
   ```
   *Expected Output*: 71 passed, 0 failed (100% success rate).

2. **Run Associated Verification Suites**:
   ```powershell
   npx tsx tests/m1_verif_and_dokumen_verification.test.ts
   npx tsx tests/adversarial_m1_print_verification.test.ts
   npx tsx tests/admin_jurnal_real_data_verification.test.ts
   npx tsx tests/navigation_consolidation_verification.test.ts
   ```
   *Expected Output*: All suites exit with code 0.

3. **Run TypeScript Compiler**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Output*: 0 errors. Exit code 0.
