# Handoff Report: Challenger 1 — Milestone 1 (Requirement R1: Kebijakan Presensi Guru & Staf TU Tanpa Jam KBM)

## 1. Observation

### 1.1 Direct Observations & Evidence Chain
1. **`src/lib/workflow.ts`**:
   - Lines 1202–1228: `totalTeacherKbmCount` is determined across the school timetable for any non-TU teacher. `isNonKbmOrTu = isTeacherTu || totalTeacherKbmCount === 0;`.
   - Lines 1238–1248: When `isNonKbmOrTu` is true, `isTeacherExempt` is strictly assigned `false`:
     ```typescript
     if (isNonKbmOrTu) {
       isTeacherExempt = false;
     } else if (explicitTeacherSetting === false) { ...
     ```
     This strictly overrides any prior database flag (`explicitTeacherSetting === true`), legacy JSON list (`guruHanyaMengajarList`), or school policy (`aturanKehadiran === 'Hari_Mengajar_Saja'`).
   - Line 1250: `state.aturanKehadiran = isTeacherExempt ? 'Hari_Mengajar_Saja' : 'Semua_Hari';`.
   - Lines 1550–1560: `state.isNonTeachingDay` is only set to `true` if `isTeacherExempt` is true. For 0-KBM teachers and TU staff, `state.isNonTeachingDay` remains `false`.
   - Line 1807: In the journal evaluation block:
     ```typescript
     } else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {
       if (state.jurnalKegiatan) {
         isJurnalDone = true;
       } else if (isTeacherExempt && state.jadwalKBM.length === 0) {
         isJurnalDone = true;
       } else if (!isNonKbmOrTu && state.jadwalKBM.length === 0 && state.isPiket) {
         isJurnalDone = true;
       }
     }
     ```
     Notice `!isNonKbmOrTu`: A regular KBM teacher on a non-teaching day who is on piket duty has their duty covered by piket, BUT for 0-KBM teachers and TU staff (`isNonKbmOrTu === true`), `!isNonKbmOrTu` is false. Therefore, piket duty does NOT eliminate the requirement for Jurnal Kegiatan.
   - Lines 1825–1839: `isPiketDone` requires `state.laporanPiket` when `state.isPiket` is true. Departure authorization (`state.canPresensiPulang`) is set only when `isJurnalDone && isPiketDone`.

2. **`src/components/AdminConfigView.tsx`**:
   - Lines 71–80: `isTuStaff` detects TU roles/mapel (`tata usaha`, `tu (administrasi)`, `tu`), and `getTeacherKbmCount` returns 0 for TU staff or matches timetable assignments.
   - Lines 800–814: The mass action button "Set Semua Hanya Hari KBM" filters exclusively for teachers with KBM schedules:
     ```typescript
     const eligibleTeachers = guruList.filter(g => !isTuStaff(g) && getTeacherKbmCount(g, jadwalList) > 0);
     setExemptTeacherIds(eligibleTeachers.map(g => g.id).filter(Boolean));
     ```
   - Lines 375–385: The save handler actively purges any rogue/invalid IDs by intersecting with `validExemptTeachers`:
     ```typescript
     const validExemptTeachers = guruList.filter(t => !isTuStaff(t) && getTeacherKbmCount(t, jadwalList) > 0);
     const validExemptIdSet = new Set(validExemptTeachers.map(t => t.id));
     const exemptIds = guruList.filter(t => validExemptIdSet.has(t.id) && ...);
     const nonExemptIds = guruList.filter(t => !exemptIds.includes(t.id));
     ```
   - Lines 520–525: Explicitly updates `data_guru` with `wajib_hadir_hanya_mengajar: false` for all `nonExemptIds` (which includes all TU staff and 0-KBM teachers).

3. **`src/components/HomeViewTU.tsx`**:
   - Lines 305–375: Queries `penugasan_piket` and `jadwal_piket` for today. If on duty, fetches `laporan_piket`.
   - Lines 380–385: `isPiketDone = !isPiket || (Boolean(laporanPiket) && !laporanPiketDitolak);` and `canPresensiPulang = Boolean(effectivePresensiDatang) && !isIzinSakit && !isAlpa && !isLibur && Boolean(jurnalKegiatan) && isPiketDone;`.
   - Lines 620–675: Workflow step UI renders Laporan Piket when assigned and locks Jurnal Kegiatan/Pulang until requirements are met.

4. **`src/components/HomeViewGuru.tsx`**:
   - Lines 420–425 & 1050–1060: The "Bebas Presensi" hero banner is guarded by:
     `dailyState.isNonTeachingDay && dailyState.aturanKehadiran === 'Hari_Mengajar_Saja'`.
   - Lines 1130–1175: When a teacher has 0 KBM on an active school day, it renders an informative card stating: "Anda tetap wajib hadir dan mengisi Jurnal Kegiatan administrasi harian." with an interactive button to "Isi Jurnal Kegiatan".

5. **`src/components/AdminVerifView.tsx` & `src/components/HomeViewAdmin.tsx` & `src/lib/attendanceAlpa.ts`**:
   - `AdminVerifView.tsx` (lines 846–868): Calculates `isNonKbmOrTu = isTu || totalTeacherSchedules === 0;` and sets `isTeacherExempt = !isNonKbmOrTu && ...`. `isFreeFromPresence` is false, eliminating false "Bebas Hadir" badges for absent non-KBM/TU staff.
   - `HomeViewAdmin.tsx` (lines 409–416): Calculates `isNonKbmOrTu = isTu || !hasAnyWeeklyKbm;` and sets `isTeacherExempt = !isNonKbmOrTu && ...`.
   - `attendanceAlpa.ts` (lines 426–438): Guards `isTeacherExempt = !isNonKbmOrTu && ...`. Ensures non-KBM/TU teachers are not skipped during Alpa evaluations when absent.

### 1.2 Verification Commands Executed
- `npx tsx tests/adversarial_r1_kebijakan_presensi.test.ts`
  - Result: **40/40 assertions passed, 0 failed**.
- `npx tsc --noEmit`
  - Result: **0 compilation errors (clean exit code 0)**.
- `npx tsx tests/pulang_cepat_guru_bk_tu.test.ts`
  - Result: **3/3 passed**.
- `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`
  - Result: **20/20 passed**.
- `npx tsx tests/tu_refinements_and_admin_rekap.test.ts`
  - Result: **82/82 passed**.
- `npx tsx tests/jurnal_edit_delete_r2.test.ts`
  - Result: **19/19 passed**.

---

## 2. Logic Chain

1. **Scenario A (0-KBM Teacher Under Hari_Mengajar_Saja)**:
   - *Observation*: `workflow.ts` line 1227 computes `isNonKbmOrTu = totalTeacherKbmCount === 0`. Line 1238 sets `isTeacherExempt = false`. Line 1553 requires `isTeacherExempt` to set `isNonTeachingDay`.
   - *Inference*: Even if global config is `'Hari_Mengajar_Saja'`, a teacher with 0 KBM hours is never evaluated as exempt.
   - *Adversarial Challenge*: Tested database injection where `data_guru.wajib_hadir_hanya_mengajar = true` or `guru_hanya_mengajar` JSON list contained the teacher's name.
   - *Result*: In all cases, `isNonKbmOrTu` executed first, forcing `isTeacherExempt = false`. `isNonTeachingDay` remained `false`.
   - *Verdict on Scenario A*: **PASSED**.

2. **Scenario B (TU Staff Member Exemption Immunity)**:
   - *Observation*: In `workflow.ts`, `isTeacherTu` is identified via role (`'tata_usaha'`, `'tatausaha'`) and mapel (`'Tata Usaha'`, `'TU (Administrasi)'`, `'tu'`). In `AdminVerifView`, `HomeViewAdmin`, and `attendanceAlpa`, `isNonKbmOrTu = isTu || ...`.
   - *Inference*: Staf TU cannot be evaluated as exempt under any condition on active school days.
   - *Adversarial Challenge*: Tested 7 variations of TU roles and mapel strings, including an adversarial case where bogus KBM records were attached to a TU staff member in the DB.
   - *Result*: `isTuStaff` and `isTeacherTu` forced KBM count to 0 and `isTeacherExempt = false`. Status label was strictly `Wajib Hadir`, never `Bebas Hadir`.
   - *Verdict on Scenario B*: **PASSED**.

3. **Scenario C (Daily Workflow Progression & Piket Immunity)**:
   - *Observation*: In `workflow.ts` lines 1807 & 1831, `isJurnalDone` requires `state.jurnalKegiatan` when `jadwalKBM.length === 0`. The waiver `state.jadwalKBM.length === 0 && state.isPiket` is guarded by `!isNonKbmOrTu`.
   - *Inference*: Having piket duty does not eliminate the requirement for Jurnal Kegiatan for 0-KBM teachers and TU staff.
   - *Adversarial Challenge*: Tested checkout attempts when:
     - Only Presensi Datang -> `canPresensiPulang = false`.
     - Presensi Datang + Piket report submitted, but Jurnal Kegiatan omitted -> `canPresensiPulang = false` with locked reason citing missing Jurnal Kegiatan.
     - Presensi Datang + Jurnal Kegiatan submitted, but Piket report omitted -> `canPresensiPulang = false` with locked reason citing missing Laporan Piket.
     - Presensi Datang + Jurnal Kegiatan + Piket report submitted -> `canPresensiPulang = true`.
   - *Verdict on Scenario C*: **PASSED**.

4. **Scenario D (AdminConfigView Mass Toggle Logic & Tamper Resistance)**:
   - *Observation*: Button handler filters `guruList.filter(g => !isTuStaff(g) && getTeacherKbmCount(g, jadwalList) > 0)`. Save handler intersects with `validExemptTeachers`.
   - *Inference*: Only teachers with actual KBM schedules can be toggled to `wajib_hadir_hanya_mengajar = true`.
   - *Adversarial Challenge*: Injected client state containing TU staff IDs and 0-KBM teacher IDs into `exemptTeacherIds`.
   - *Result*: The save handler purged all invalid IDs into `nonExemptIds`, persisting `wajib_hadir_hanya_mengajar: false` to Supabase.
   - *Verdict on Scenario D*: **PASSED**.

5. **Scenario E (Normal Teachers with KBM on Non-Teaching Days)**:
   - *Observation*: When `totalTeacherKbmCount > 0` and teacher is configured for `Hari_Mengajar_Saja`, `isNonKbmOrTu = false` and `isTeacherExempt = true`.
   - *Inference*: On a day where `hasTeachingToday = false` and `hasPiketToday = false`, `isNonTeachingDay = true` and status is `'Bebas Hadir'`.
   - *Adversarial Challenge*: Verified that regular teaching staff are not regressed and still receive proper non-teaching day exemptions.
   - *Verdict on Scenario E*: **PASSED**.

---

## 3. Caveats

- **Dynamic Timetable Updates**: If an administrator subsequently assigns teaching hours in `jadwal_pelajaran` to a teacher previously having 0 KBM hours, the system dynamically recalculates `getTeacherKbmCount > 0`, allowing the teacher to be toggled to `Hari_Mengajar_Saja`. This is expected and desirable behavior.
- **Guru BK Exception**: Guru BK has specialized workflow rules (`isBk = true`), allowing departure based on BK activity logs rather than standard KBM journals. This was preserved and verified not to interfere with TU or non-KBM regular teachers.

---

## 4. Conclusion

### Explicit Verdict: **APPROVE**

Milestone 1 (Requirement R1: Kebijakan Presensi Guru & Staf TU Tanpa Jam KBM) is completely sound, resilient against adversarial tampering, and satisfies all 5 required scenarios (A, B, C, D, E) as well as static AST invariants (F).
- Zero false "Bebas Hadir" labels.
- Zero loophole exemptions for TU staff or teachers without KBM hours.
- Strict enforcement of Jurnal Kegiatan and Laporan Piket (if on duty) prior to Presensi Pulang.
- Tamper-resistant mass toggle and database persistence in AdminConfigView.

---

## 5. Verification Method

To independently reproduce the adversarial verification:

```bash
# 1. Run the automated adversarial stress test harness (40 assertions)
npx tsx tests/adversarial_r1_kebijakan_presensi.test.ts

# 2. Verify TypeScript static type safety across the repository
npx tsc --noEmit

# 3. Verify universal checkout, duties, and TU regression suites
npx tsx tests/pulang_cepat_guru_bk_tu.test.ts
npx tsx tests/jurnal_r1_r2_r3_verification.test.ts
npx tsx tests/tu_refinements_and_admin_rekap.test.ts
npx tsx tests/jurnal_edit_delete_r2.test.ts
```

### Invalidation Conditions
- Any case where a TU staff member or 0-KBM teacher evaluates to `isTeacherExempt = true` or `isNonTeachingDay = true` on an active school day.
- Any case where a 0-KBM teacher on piket duty can check out (`canPresensiPulang = true`) without submitting `jurnalKegiatan`.
- Any case where the Admin mass toggle or save handler persists `wajib_hadir_hanya_mengajar: true` for a TU staff member or 0-KBM teacher.
- Any test failure or TypeScript compilation error.
