# Milestone 1 Handoff Report: Presensi, Jurnal, Piket Resubmission Reset & Admin Verification UI

**Agent**: Worker M1 (`teamwork_preview_worker`)  
**Date**: 2026-09-24  
**Target Milestone**: Milestone 1 (F1–F4)

---

## 1. Observation

Direct observations from codebase inspection:
1. **GuruPresensi.tsx**:
   - `GuruPresensi.tsx` (lines 140–155) previously lacked verification preventing re-submitting "Pulang" if already performed today, while improperly permitting Pulang when Datang was rejected (`!dailyState?.presensiDatang && !dailyState?.presensiDatangDitolak`).
   - Old rejected record was deleted by `rejectedRecord.id` on line 268, but initial mount did not automatically pre-select "Datang" when `presensiDatangDitolak` was true.
2. **GuruJurnal.tsx**:
   - `GuruJurnal.tsx` (lines 339–342) executed a blind batch deletion:
     ```ts
     const rejectedIds = dailyState.jurnalDitolak.map((j: any) => j.id);
     await supabase.from('jurnal_pembelajaran').delete().in('id', rejectedIds);
     ```
     This caused resubmission of one class journal (e.g. VII A) to accidentally delete all other rejected journals (e.g. VII B) without them ever being resubmitted.
   - `newJurnal` insert payload (line 311) did not include `sekolah_id`, risking tenant isolation issues under RLS.
   - Workflow state refresh was unawaited (`.then()`), leaving `dailyState` stale when transitioning.
3. **PiketView.tsx**:
   - Resubmitting piket report deleted the single `dailyState.laporanPiketDitolak.id`, but state refresh was asynchronously unawaited, leaving local state un-synchronized until user navigation.
4. **AdminVerifView.tsx**:
   - The "Setujui" button was rendered for all items without checking if `item.status_verifikasi === 'Ditolak'` (lines 844–858). As a result, rejected items still displayed an active, clickable "Setujui" button.
   - When an item was rejected, `verifyItem` updated its status in-place (`setPresensiList(prev => prev.map(...))`) rather than removing it from the list. The rejected card remained in the view.
   - `displayList` did not exclude rejected items from the default verification view, and `bulkVerifyCurrent` could potentially encompass rejected items.

---

## 2. Logic Chain

1. **Presensi Resubmission (F1)**:
   - Updated `initConfig` to check `if (state.presensiDatangDitolak)` and automatically initialize `tipeAbsen` to `'Datang'`.
   - Updated Pulang submission check to block duplicates when `dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak`.
   - Updated Pulang dropdown option to be disabled if `!dailyState?.presensiDatang || (!!dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak)`. This guarantees Datang must be valid first and Pulang cannot be duplicated unless rejected.
   - Resubmission cleanly removes the old rejected record by ID and updates `dailyState`.
2. **Jurnal Resubmission & Batch-Delete Fix (F2)**:
   - Imported `isJurnalMatchJadwal` from `@/lib/workflow`.
   - Included `...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})` in `newJurnal`.
   - Replaced indiscriminate batch deletion with targeted filter matching:
     - For `Jurnal KBM`: filters `dailyState.jurnalDitolak` where `j.kelas === kelas` and `(j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel }))`.
     - For `Jurnal Kegiatan`: filters `dailyState.jurnalDitolak` where `j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan'`.
     - Deletes only matching IDs. Non-matching rejected journals (e.g. for other classes) remain intact until separately resubmitted.
   - Awaited `getGuruDailyState` before finishing form submission.
3. **Piket Resubmission (F3)**:
   - Ensured rejection deletion deletes by ID and cleans up any rejected records for the teacher on the current date.
   - Synchronously awaited `getGuruDailyState` to refresh `dailyState`.
4. **Admin Verification UI (F4)**:
   - Wrapped "Setujui" button in `{item.status_verifikasi !== 'Ditolak' && (...) }` so it is completely hidden from the DOM when rejected.
   - In `verifyItem`, when `status === 'Ditolak'`, immediately filtered the rejected item out of `presensiList`, `jurnalList`, and `piketList` using `.filter(item => item.id !== id)`.
   - In `displayList`, excluded items where `verifFilter !== 'Ditolak' && item.status_verifikasi === 'Ditolak'`, so rejected items disappear from active verification lists ("Semua" and "Menunggu") and only appear if the Admin explicitly selects the "Ditolak" filter.
   - In `bulkVerifyCurrent`, added `&& item.status_verifikasi !== 'Ditolak'` guard.

---

## 3. Caveats

- Deletion of rejected records relies on client invocation of Supabase `.delete().eq('id', ...)`. In production, ensure teacher RLS policies allow deleting their own records where `status_verifikasi = 'Ditolak'`.
- "Ditolak" entries are still queryable by Admin if Admin specifically switches the verification filter dropdown to "Ditolak".

---

## 4. Conclusion

All Milestone 1 objectives (F1, F2, F3, F4) are fully and genuinely implemented:
- Old rejected Presensi records are cleanly removed upon resubmission; state properly refreshes.
- Jurnal batch-deletion bug is resolved: only matching rejected journals are deleted, preserving others; missing `sekolah_id` is populated.
- Piket resubmission cleanly resets rejected reports.
- Admin Verification UI completely hides the "Setujui" button on rejected items and immediately removes rejected cards from active verification lists.

---

## 5. Verification Method

To independently verify:
1. **Run the full test suite**:
   ```bash
   npm test
   ```
   Output confirms:
   - `MILESTONE M1 TEST: RESUBMISSION RESET & ADMIN VERIF UI`: 23/23 tests passed.
   - All previous test suites (M6.1, M6.2, M6.3, M6.4, M10, QOL, etc.) passed without regression.
2. **Run production build**:
   ```bash
   npm run build
   ```
   Build passes with 0 TypeScript errors and successfully generates all static and dynamic routes.
