# Handoff Report: Milestone 1 — Kebijakan Presensi Guru & Staf TU Tanpa Jam KBM (Requirement R1)

## 1. Observation

### 1.1 Root Causes of "Bebas Presensi" / "Bebas Hadir" Identified
1. **`AdminConfigView.tsx`**:
   - Lines 700–717: Attendance policy dropdown only had general descriptions without explaining policies for TU staff and teachers without KBM hours.
   - Lines 743: Mass action button "Set Semua Hanya Hari KBM" executed `onClick={() => setExemptTeacherIds(guruList.map(g => g.id).filter(Boolean))}`, which set `wajib_hadir_hanya_mengajar = true` for all teachers, indiscriminately marking TU staff and teachers with 0 KBM hours as exempt.
   - Lines 347–353: Saving config updated `data_guru.wajib_hadir_hanya_mengajar = true` based on raw `exemptTeacherIds` without checking whether a user was TU staff or had 0 teaching hours.
2. **`workflow.ts`**:
   - Lines 1190–1205: Determined `isTeacherExempt` by evaluating `explicitTeacherSetting` and falling back to `aturanKehadiran === 'Hari_Mengajar_Saja'`. If a teacher had 0 KBM hours or was TU, they were evaluated as exempt.
   - Lines 1505–1520: Evaluated `if (isTeacherExempt && !hasTeachingObligation)`, setting `state.isNonTeachingDay = true`, `state.bebasAlpa = true`, and `state.lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'`.
   - Lines 1761 & 1838: Had fallback `if (state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;`, which allowed teachers without KBM to skip Jurnal Kegiatan if assigned piket.
3. **`AdminVerifView.tsx` & `HomeViewAdmin.tsx`**:
   - In `AdminVerifView.tsx` (lines 859–861): Evaluated `isFreeFromPresence = isTeacherExempt && scheduledClasses.length === 0 && !hasPiketToday;` and rendered `pesan_belum: 'Bebas Hadir'`, `status_label: 'Bebas Hadir'`.
   - In `HomeViewAdmin.tsx` (lines 402–404, 434): Evaluated `isExemptNonTeaching = isTeacherExempt && targetCount === 0; isFreeFromPresence = isExemptNonTeaching && !hasPiketDuty;` and rendered `presensiDatangStatus: 'Bebas Hadir'`.
4. **`attendanceAlpa.ts`**:
   - Lines 410–446: When `isTeacherExempt` was true and `!hasTeachingToday && !hasPiketDuty`, executed `continue;`, skipping attendance evaluation and preventing Alpa creation for absent non-KBM personnel.
5. **`HomeViewTU.tsx`**:
   - Lines 23–37 & 280–320: Did not check for piket assignment (`penugasan_piket` / `jadwal_piket`) or submission (`laporan_piket`), and did not include "Laporan Piket" in workflow steps or checkout prerequisites.
6. **`HomeViewGuru.tsx`**:
   - Lines 421–426 & 1056–1070: Rendered a "Bebas Presensi / Bebas Kehadiran & Jurnal" hero card whenever `dailyState.isNonTeachingDay` was set, which falsely informed teachers without KBM that they did not need to attend.

### 1.2 Verification Commands Executed & Outputs
- `npx tsc --noEmit` -> Exited with code `0` (clean, zero TypeScript compilation errors).
- `npx tsx tests/tu_refinements_and_admin_rekap.test.ts` -> Exited with code `0` (82 passed, 0 failed).
- `npx tsx tests/pulang_cepat_guru_bk_tu.test.ts` -> Exited with code `0` (3 passed, 0 failed).
- `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts` -> Exited with code `0` (20 passed, 0 failed).
- `npx tsx tests/jurnal_edit_delete_r2.test.ts` -> Exited with code `0` (19 passed, 0 failed).

---

## 2. Logic Chain

1. **Classification of Users & Schedule Binding**:
   - In `AdminConfigView.tsx`, loading `jadwal_pelajaran` alongside `data_guru` allows calculating each teacher's total teaching schedule assignments (`getTeacherKbmCount`).
   - TU staff are identified via `mata_pelajaran` containing `'tata usaha'` or user role `'tata_usaha'`.
   - Teachers with 0 schedules across all days are identified as "Guru Tanpa Jam KBM".
   - Teachers with $\ge 1$ schedule are identified as "Guru KBM (N Jadwal)".
2. **Policy Guidelines & Safe Admin Configuration**:
   - Added responsive policy guide cards in Tab 4 "Kebijakan Guru" explicitly defining the distinction between "Guru Hadir Sesuai KBM" (only mandatory on teaching/piket days) and "Guru Hadir Setiap Hari & Staf TU / Tanpa Jam KBM" (mandatory presence on every active school day).
   - The mass action button "Set Semua Hanya Hari KBM" was corrected to filter `guruList.filter(g => !isTuStaff(g) && getTeacherKbmCount(g, jadwalList) > 0)`, strictly preventing TU staff and non-KBM teachers from being set to exempt.
   - On saving, `exemptIds` is strictly intersected with `validExemptTeachers`, guaranteeing that TU staff and non-KBM teachers are updated with `wajib_hadir_hanya_mengajar = false`.
   - On the UI teacher cards, badges (`Staf Tata Usaha`, `Guru Tanpa Jam KBM`, `Guru KBM (N Jadwal)`) are displayed, and toggle switches for TU and non-KBM teachers are locked with informative tooltips and warning toasts.
3. **Core Engine Exemption Protection (`workflow.ts`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, `attendanceAlpa.ts`)**:
   - In `workflow.ts`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, and `attendanceAlpa.ts`, any user who is TU staff or has 0 total teaching assignments is flagged with `isNonKbmOrTu = true`.
   - When `isNonKbmOrTu` is true, `isTeacherExempt` is strictly forced to `false`.
   - As a result:
     - On active school days, they are never marked `isNonTeachingDay` or `isFreeFromPresence`.
     - In `AdminVerifView.tsx` and `HomeViewAdmin.tsx`, they are never displayed as "Bebas Hadir"; they are tracked as active attendees (or Alpa if overdue).
     - In `attendanceAlpa.ts`, they are never skipped by the exemption check.
4. **Enforcing the 4-Step Workflow**:
   - Both in `workflow.ts` and `HomeViewTU.tsx`:
     1. Presensi Datang is required first.
     2. Laporan Piket is required if the user has piket duties today (`dailyState.isPiket` and `!dailyState.laporanPiket`).
     3. Jurnal Kegiatan is strictly required (`state.jurnalKegiatan`) for non-exempt / non-KBM users and TU staff before departure. Piket duty alone does not waive the Jurnal Kegiatan requirement for daily personnel.
     4. Presensi Pulang (`canPresensiPulang`) is only unlocked when both Jurnal Kegiatan and Laporan Piket (if on duty) are completed.
5. **Eliminating False Hero Banner in `HomeViewGuru.tsx`**:
   - The "Bebas Presensi" hero card is restricted to `dailyState?.isNonTeachingDay && dailyState?.aturanKehadiran === 'Hari_Mengajar_Saja'`.
   - When teachers without KBM log in, they see their active 4-step workflow and an interactive card informing them to complete Jurnal Kegiatan.

---

## 3. Caveats

- **Timetable Dynamics**: If an admin later assigns new teaching schedules in `jadwal_pelajaran` to a teacher who previously had 0 KBM hours, the system dynamically recalculates `getTeacherKbmCount > 0`, allowing the teacher to be configured into "Hari_Mengajar_Saja" if desired.
- **TU Piket Navigation**: Staf TU are assigned to `penugasan_piket` only when school policy directs them to piket duties. If assigned, their workflow steps render "Laporan Piket" pointing to `'view-guru-piket'` and require its submission before checkout.
- **Milestone Isolation**: No files owned by Milestone 2 (`src/components/RekapJurnalView.tsx`, `src/components/GuruJurnal.tsx`) were modified by this worker.

---

## 4. Conclusion

Milestone 1 (Requirement R1) has been fully implemented across all 7 assigned files:
1. `src/components/AdminConfigView.tsx`: Tab 4 provides clear policy guidelines, categorizes personnel with clear badges, restricts the mass action button to active KBM teachers, enforces non-exempt persistence (`wajib_hadir_hanya_mengajar = false`) on save, and locks manual toggles for TU and non-KBM staff.
2. `src/lib/workflow.ts`: Eliminates false `isTeacherExempt` and `isNonTeachingDay` for TU and non-KBM teachers, and strictly requires Jurnal Kegiatan and Piket for checkout.
3. `src/components/AdminVerifView.tsx` & `src/components/HomeViewAdmin.tsx`: Eliminates false "Bebas Hadir" labels for TU staff and non-KBM teachers on school days.
4. `src/lib/attendanceAlpa.ts`: Protects TU staff and non-KBM teachers from being bypassed during daily Alpa audits.
5. `src/components/HomeViewTU.tsx`: Adds piket duty detection, renders "Laporan Piket" when assigned, and enforces it before `canPresensiPulang`.
6. `src/components/HomeViewGuru.tsx`: Eliminates false "Bebas Presensi" banner for non-KBM teachers on active school days, rendering their active workflow steps.

---

## 5. Verification Method

To independently verify this implementation, run:

```bash
# 1. Type correctness verification
npx tsc --noEmit

# 2. Existing TU refinements & Admin Recap test suite
npx tsx tests/tu_refinements_and_admin_rekap.test.ts

# 3. Universal Pulang Cepat test suite
npx tsx tests/pulang_cepat_guru_bk_tu.test.ts

# 4. Standard duties & journal verification test suite
npx tsx tests/jurnal_r1_r2_r3_verification.test.ts

# 5. Milestone 2 edit/delete test suite (confirming zero regression)
npx tsx tests/jurnal_edit_delete_r2.test.ts
```

### Invalidation Conditions
- Any occurrence of `status_label = 'Bebas Hadir'` or `lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'` for a TU staff user or teacher without KBM hours on active school days.
- Any ability of the mass action button "Set Semua Hanya Hari KBM" to set TU staff or teachers with 0 KBM hours to `wajib_hadir_hanya_mengajar = true`.
- Any ability of TU staff or non-KBM teachers to complete `canPresensiPulang` without submitting `jurnalKegiatan` or `laporanPiket` (if assigned).
- Any compilation or test failure in `npx tsc --noEmit` or unit test runners.
