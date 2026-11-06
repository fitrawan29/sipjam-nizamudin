# Milestone M1 Independent Review & Adversarial Challenge Report

**Reviewer**: `reviewer_m1_nov_1`  
**Roles**: reviewer, critic  
**Target Commit**: `0fb1533` (`worker_m1_nov`)  
**Date**: 2026-11-06T23:20:15Z  
**Verdict**: **APPROVE**  

---

## 1. Observation

Direct code examination and automated test suite execution against commit `0fb1533` produced the following verifiable empirical observations:

1. **TypeScript Static Typecheck**:
   - Command: `npx tsc --noEmit`
   - Result: Exit code 0, 0 compiler errors. Pre-existing TS1184 in `AdminVerifView.tsx` (inner function modifier) and TS2322 in `HomeViewAdmin.tsx` (`jurnalColor` omitting `'blue'`) are completely resolved.

2. **Automated Test Suites Execution**:
   - `npx tsx tests/m6_3_dashboards_and_verif.test.ts` → **26 passed, 0 failed (100%)**
   - `npx tsx tests/admin_jurnal_real_data_verification.test.ts` → **All unit & admin scenario tests passed 100%**
   - `npx tsx tests/adversarial_m1_print_verification.test.ts` → **37 passed, 0 failed (100%)**
   - `npx tsx tests/m1_verif_and_dokumen_verification.test.ts` → **All 25 invariants passed (100%)**
   - `npx tsx tests/navigation_consolidation_verification.test.ts` → **150 passed, 0 failed (100%)**
   - `npx tsx tests/m10_r2_r3.test.ts` → **All track R2 & R3 tests passed (100%)**

3. **Presensi & Jurnal Validation on Holidays and Excused Leaves (`AdminVerifView.tsx`)**:
   - `holidayInfo` (lines 598-639) accurately evaluates:
     - Sunday (`effectiveDayName === 'Minggu'`)
     - Saturday with 5-day week (`effectiveDayName === 'Sabtu' && hariSekolah === 5`)
     - Educational calendar holidays in `kalender_pendidikan` (`tipe.includes('libur')`), matching single dates (`evt.tanggal === effectiveDate`) and date ranges (`effectiveDate >= evt.tanggal_mulai && effectiveDate <= evt.tanggal_selesai`).
   - When `holidayInfo?.isHoliday` is true:
     - `unsubmittedPresensi` (line 644) returns `[]`
     - `unsubmittedJurnal` (line 734) returns `[]`
     - `unsubmittedPiket` (line 814) returns `[]`
     - Banner `<div data-testid="holiday-banner">` (lines 1054-1067) is rendered with the specific holiday description.
   - Teachers on approved leave (`Sakit` or `Izin`):
     - `isTeacherOnLeave` in `unsubmittedJurnal` (lines 743-768) filters out excused teachers from delinquency cards.
     - `displayList` (lines 881-925) synthesizes cards for excused teachers on leave with `data-testid="badge-excused-leave"` and label `"Dikecualikan (Izin / Sakit)"` (lines 1475-1492).
     - Multi-day leaves spanning Day 2+ are loaded via `multiQ` (lines 260-292, 312-331) and checked against date ranges, preventing false delinquency cards across all multi-day spans.

4. **Multi-Day Leave Auto-Close (`attendanceAlpa.ts`)**:
   - In `recordUnfilledJournalsAndPiket` (lines 1045-1175):
     - Checks active multi-day leaves spanning `evaluatedDate` (`tanggal_mulai <= evaluatedDate && (tanggal_selesai >= evaluatedDate || computedEnd >= evaluatedDate)`).
     - Empty KBM teaching schedules are auto-recorded with `status_verifikasi = leaveType` (`'Sakit'` or `'Izin'`) and `catatan_admin = 'Otomatis terisi sesuai presensi (${leaveType})'`, rather than delinquency `'Tidak Masuk Kelas'`.
     - In Jurnal Kegiatan, `isExcusedFromActivity = Boolean(leaveType || state.isIzinSakit)`. Because `needsKegiatan` requires `!isExcusedFromActivity`, excused teachers are exempted from delinquent "tidak melaksanakan kegiatan apapun" records.

5. **Accurate Document Printing & Sickness Aggregation (`AdminRekapView.tsx` & `RekapJurnalView.tsx`)**:
   - `AdminRekapView.tsx` (lines 185-220, 355-448):
     - Queries both single-day and multi-day spans with `status_verifikasi IN ('Disetujui', 'Diverifikasi', 'Pulang Cepat', 'Sakit', 'Izin')`.
     - Detects `isSakit` and `isIzin`, tracking credited dates in `creditedLeaveDates[canonicalNama]`. Only active working days within the period (excluding weekends and `kalender_pendidikan` libur dates) are credited.
     - Formula: `alpa = Math.max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin)`. Because `sakit` is accurately counted, sick days do not trigger false Alpa.
     - Redundant Sub-Tab 3 (`activeTab === 'cetak'`) was cleanly eliminated per Requirement R2. Tab 2 (`Tabel Rekapitulasi`) consolidates GPS printing and Excel export with official Kop and signatures. Legacy `?tab=cetak` redirects transparently to `tabel` without loss of functionality.
   - `RekapJurnalView.tsx` (lines 339-345, 658-668):
     - Missing entry synthesis loop checks `const isWeekend = dayName === 'Minggu' || (hariSekolah === 5 && dayName === 'Sabtu')` and `const isCalendarHoliday = liburDates.has(dateStr)`. Holidays are skipped so false delinquency entries are never synthesized.
     - `filteredJurnal` filters out any entries where `status_verifikasi === 'libur' || keterangan === 'libur' || materi === 'libur'`, keeping printed documents free from holiday rows.

6. **Class X Subject Resolution (`DokumenView.tsx`)**:
   - `resolveTeacherSubjects` (lines 183-268) resolves subject assignments from `jadwal_pelajaran`, `data_mapel`, `guru_mapel`, and `data_guru.mata_pelajaran`.
   - Uses `isTeacherNameMatch` (tokenized, title-stripped) to match nicknames to full names.
   - Expands abbreviations (`MTK` -> `Matematika`).
   - Zero occurrences of `'Mata Pelajaran Umum'` fallback exist in code.

---

## 2. Logic Chain

1. **Holiday and Excused Leave Integrity**:
   - Step 1: `kalender_pendidikan` events and `hari_sekolah` settings are loaded during initial view initialization with tenant scoping.
   - Step 2: `holidayInfo` evaluates whether the selected date is a weekend or listed calendar holiday.
   - Step 3: When a date is a holiday, returning empty arrays for `unsubmittedPresensi`, `unsubmittedJurnal`, and `unsubmittedPiket` guarantees that zero teachers are flagged as delinquent on non-school dates, while the holiday banner provides clear administrative feedback.
   - Step 4: For regular school days, teachers with approved single-day or multi-day leaves (`Sakit` / `Izin`) are excluded from delinquency and instead surfaced as excused entries with badge `badge-excused-leave` and label `"Dikecualikan (Izin / Sakit)"`.
   - Step 5: `attendanceAlpa.ts` mirrors this multi-day detection at the automated cron / cutoff level, guaranteeing that unresubmitted/unfilled journals on Day 2+ of approved leaves auto-close as excused instead of delinquency.

2. **Accurate Document Printing & Elimination of False Alpa**:
   - Step 1: In `AdminRekapView.tsx`, fetching `Sakit` presensi and iterating through active workdays within multi-day spans allows accurate computation of `sakit` and `izin` metrics without double-counting.
   - Step 2: Incorporating `sakit` into `alpa = max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin)` mathematically prevents sick days from being deducted as Alpa.
   - Step 3: In `RekapJurnalView.tsx`, omitting holidays from the synthesis loop and filtering `'libur'` entries from `filteredJurnal` ensures official print outputs reflect only valid instructional days.
   - Step 4: Eliminating duplicate Sub-Tab 3 simplifies user workflow while preserving full print fidelity, legal signatures, GPS watermarking, and CSV export in Tab 2.

3. **Integrity & Anti-Cheat Verification**:
   - Source code analysis confirmed no hardcoded test outputs, no mock bypass switches, and no fake attestation artifacts exist in the implementation files.
   - All assertions test genuine, live production algorithms and UI structures.

---

## 3. Caveats

- **Multi-Tenant Scoping**: All queries to `kalender_pendidikan`, `pengaturan`, and `presensi_guru` properly include `sekolah_id` (or universal null) filtering, ensuring clean multi-tenant isolation.
- **Legacy Route Redirection**: Legacy links or bookmarks referencing `?tab=cetak` redirect to `tabel` seamlessly.
- **No Caveats**: Zero functional or compilation regressions identified.

---

## 4. Conclusion

The implementation by `worker_m1_nov` (commit `0fb1533`) for Milestone M1 is **correct, complete, and resilient**. It satisfies all criteria specified in `ORIGINAL_REQUEST.md` (R1, R2, R6) and `PROJECT.md`.

**Official Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this review:

```powershell
# 1. Verify TypeScript compilation
npx tsc --noEmit

# 2. Run all M1 automated test suites
npx tsx tests/m6_3_dashboards_and_verif.test.ts
npx tsx tests/admin_jurnal_real_data_verification.test.ts
npx tsx tests/adversarial_m1_print_verification.test.ts
npx tsx tests/m1_verif_and_dokumen_verification.test.ts
npx tsx tests/navigation_consolidation_verification.test.ts
npx tsx tests/m10_r2_r3.test.ts
```

All commands exit with code 0 and 100% test pass rate.
