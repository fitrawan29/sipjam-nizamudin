# Milestone 1 Empirical Challenge Report & Verdict

**Agent**: Challenger 1 (`teamwork_preview_challenger`)  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m1_1`  
**Target Milestone**: Milestone 1 (F1: Presensi Reset, F2: Jurnal Targeted Class Isolation, F3: Piket Reset, F4: Admin Verification UI)  
**Parent Orchestrator ID**: `2ac91888-0ccf-41c6-9452-748556b221b7`  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct observations from codebase inspection, empirical stress testing, test execution, and production build:

1. **Jurnal Targeted Isolation (F2)**:
   - File: `src/components/GuruJurnal.tsx` (lines 339–358):
     ```ts
     const matchingRejected = dailyState.jurnalDitolak.filter((j: any) => {
       if (tipeJurnal === 'Jurnal Kegiatan') {
         return j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan';
       }
       if (tipeJurnal === 'Jurnal KBM') {
         // Must match kelas
         if (j.kelas !== kelas) return false;
         // Match mapel directly or via fuzzy match
         return j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel });
       }
       return false;
     });

     if (matchingRejected.length > 0) {
       const matchingIds = matchingRejected.map((j: any) => j.id);
       await supabase.from('jurnal_pembelajaran').delete().in('id', matchingIds);
     }
     ```
   - In `tests/adversarial_m1_challenger_1.test.ts` (Suite 1, assertions F2-ADV1 & F2-ADV2):
     In a scenario with 5 rejected journals across classes VII A, VII B, VII C, VIII A, and VIII B, resubmitting for VII B Matematika selectively and exclusively matched and deleted record `j-7b`, preserving all 4 other rejected class journals untouched.
   - Tested subject collision boundaries:
     - `isJurnalMatchJadwal` with "IPA" vs "IPS": evaluated to `false` (F2-ADV3).
     - `isJurnalMatchJadwal` with "Pendidikan Agama Islam" vs "Pendidikan Pancasila": evaluated to `false` (F2-ADV4).
     - Underscore prefixes (`VII A_Matematika` vs `Matematika`): evaluated to `true` (F2-ADV5).
     - Null/undefined fields: safely returned `false` without throwing `TypeError` (F2-ADV6 & F2-ADV7).
   - In `newJurnal` payload (line 335), `...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})` guarantees tenant isolation without transmitting `undefined` keys when missing (F2-ADV10 & F2-ADV11).

2. **Presensi Resubmission Reset & Workflow State Machine (F1)**:
   - File: `src/components/GuruPresensi.tsx`:
     - Initial mount pre-selects 'Datang' on rejection (lines 96–98):
       ```ts
       if (state.presensiDatangDitolak) {
         setTipeAbsen('Datang');
         setJenisPresensi(state.presensiDatangDitolak.jenis_presensi || 'Sekolah');
       }
       ```
     - Dropdown option for Pulang is disabled when Datang is rejected or unsubmitted (line 406):
       ```tsx
       <option value="Pulang" disabled={!dailyState?.presensiDatang || (!!dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak)}>PULANG</option>
       ```
     - Pulang submit handler blocks duplicate submission (lines 144–146):
       ```ts
       if (dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak) {
         return Swal.fire('Info', 'Anda sudah melakukan Presensi Pulang hari ini.', 'info');
       }
       ```
     - Resubmission cleanly deletes the old rejected record by ID (lines 272–275):
       ```ts
       const rejectedRecord = tipeAbsen === 'Datang' ? dailyState?.presensiDatangDitolak : dailyState?.presensiPulangDitolak;
       if (rejectedRecord?.id) {
         await supabase.from('presensi_guru').delete().eq('id', rejectedRecord.id);
       }
       ```
     - Workflow state refresh is synchronously awaited (line 301): `const state = await getGuruDailyState(...)`.
   - Verified via empirical tests F1-ADV1 through F1-ADV7: all assertions passed.

3. **Laporan Piket Resubmission Reset (F3)**:
   - File: `src/components/PiketView.tsx` (lines 333–341):
     ```ts
     if (dailyState?.laporanPiketDitolak?.id) {
       await supabase.from('laporan_piket').delete().eq('id', dailyState.laporanPiketDitolak.id);
     }
     await supabase.from('laporan_piket')
       .delete()
       .eq('guru_pelapor', user.nama)
       .eq('tanggal', getWitaDateStr())
       .eq('status_verifikasi', 'Ditolak');
     ```
     Resubmission deletes the rejected report by ID and sweeps any duplicate rejected reports for the teacher on the current date.
   - Synchronously awaits `getGuruDailyState` (lines 393–399), instantly refreshing `dailyState`.
   - Verified via empirical tests F3-ADV1 through F3-ADV3: all assertions passed.

4. **Admin Verification UI Security & Filters (F4)**:
   - File: `src/components/AdminVerifView.tsx`:
     - Setujui button is conditionally rendered:
       ```tsx
       {item.status_verifikasi !== 'Ditolak' && (
         <button ...>Setujui</button>
       )}
       ```
       (lines 860–876). Setujui button is completely absent from the DOM when `status_verifikasi === 'Ditolak'`.
     - `verifyItem` immediately filters out rejected items upon rejection (lines 196–204):
       `setPresensiList(prev => prev.filter(item => item.id !== id))`
     - `displayList` hides rejected items from the active queue unless explicitly filtered by 'Ditolak' (lines 474–477):
       ```ts
       if (verifFilter !== 'Ditolak' && item.status_verifikasi === 'Ditolak') {
         return false;
       }
       ```
     - `bulkVerifyCurrent` strictly guards against approving rejected items (line 235):
       `displayList.filter(item => !item.isUnsubmitted && item.status_verifikasi !== 'Disetujui' && item.status_verifikasi !== 'Ditolak')`
   - Verified via empirical tests F4-ADV1 through F4-ADV10: all assertions passed.

5. **Test & Build Execution Results**:
   - `npx tsx tests/adversarial_m1_challenger_1.test.ts`: **34 / 34 passed (100%)**
   - `npm test`: **23 / 23 M1 tests passed; all earlier milestone suites passed (100%)**
   - `npx tsx tests/e2e/run_all_e2e.ts`: **100% of assertions passed across Tiers 1–4**
   - `npm run build`: **Exit code 0, Turbopack compiled clean, 0 TypeScript errors**

---

## 2. Logic Chain

1. **Jurnal Batch-Deletion Bug Resolution**:
   - *Premise*: Previously, `GuruJurnal.tsx` ran `dailyState.jurnalDitolak.map(j => j.id)` and deleted all rejected journals across all classes whenever any single journal was resubmitted.
   - *Deduction*: By filtering `dailyState.jurnalDitolak` with `j.kelas === kelas` and subject matching before performing `.delete().in('id', matchingIds)`, the deletion blast radius is constrained strictly to the targeted class and subject.
   - *Empirical Proof*: In test F2-ADV1 and F2-ADV2, resubmitting class VII B left classes VII A, VII C, VIII A, and VIII B fully intact in the database. In the stress matrix (F5-ADV1 to F5-ADV3), 50 interleaved operations across 5 teachers and 4 classes resulted in zero cross-contamination.

2. **Presensi & Piket Workflow Correctness**:
   - *Premise*: Rejected attendance must require re-taking attendance before permitting checkout ("Pulang").
   - *Deduction*: In `workflow.ts`, rejected records are filtered out of `acceptedPresensi`, setting `state.presensiDatang = null` and populating `state.presensiDatangDitolak`. Because `presensiDatang` is null, `canPresensiPulang` is false, and the UI select option for Pulang is disabled via `!dailyState?.presensiDatang`. Resubmission deletes the old record and awaits state update, successfully resetting the lifecycle.

3. **Admin Verification UI Invariants**:
   - *Premise*: Rejection must make approval impossible and remove the item from the pending queue.
   - *Deduction*: In `AdminVerifView.tsx`, wrapping the button in `{item.status_verifikasi !== 'Ditolak' && (...) }` ensures that no click event or DOM interaction can trigger approval for a rejected item. Furthermore, `displayList` excludes rejected items from "Semua" and "Menunggu", and `bulkVerifyCurrent` adds an explicit status check, preventing bulk approval race conditions.

---

## 3. Caveats

1. **Direct `isJurnalMatchJadwal` on Empty Objects**:
   - Direct execution of `isJurnalMatchJadwal({}, {})` without property guards returns `true` because empty strings match (`'' === ''`).
   - However, in `GuruJurnal.tsx`, line 346 strictly checks `if (j.kelas !== kelas) return false;` and form inputs enforce non-empty class and mapel strings. Thus, this edge case is fully contained at the component level.
2. **Client-Side RLS Dependency**:
   - Deletion of rejected records is performed via client Supabase `.delete().eq('id', ...)`. Production PostgreSQL RLS policies on `presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket` must allow users to delete their own records where `status_verifikasi = 'Ditolak'`.

---

## 4. Conclusion

All Milestone 1 requirements (F1, F2, F3, F4) are **genuine, resilient, and verified empirically**:
- Resubmitting rejected Presensi cleanly removes the rejected entry, resets the workflow state, and properly guards Pulang.
- Resubmitting rejected Jurnal isolates deletion to the specific class and subject, completely resolving the multi-class batch deletion bug.
- Resubmitting rejected Piket clears prior rejected reports and synchronously unlocks dependent workflows.
- Admin Verification UI completely eliminates the "Setujui" button on rejected items and removes them from active queues while defending against bulk approval race conditions.

**Milestone 1 Quality Gate Verdict: APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Execute Challenger 1 Adversarial Test Suite**:
   ```powershell
   npx tsx tests/adversarial_m1_challenger_1.test.ts
   ```
   *Expected output*: 34 passed, 0 failed.

2. **Execute Full Project Test Suite**:
   ```powershell
   npm test
   ```
   *Expected output*: 23 / 23 Milestone 1 tests passed; all earlier tests passed.

3. **Execute Full E2E Test Suite**:
   ```powershell
   npx tsx tests/e2e/run_all_e2e.ts
   ```
   *Expected output*: 100% passed across Tiers 1 through 4.

4. **Execute Production Build**:
   ```powershell
   npm run build
   ```
   *Expected output*: Compiled successfully, 0 TypeScript errors, all static & dynamic routes collected.
