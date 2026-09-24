# Milestone 1 Independent Review & Adversarial Critic Report

**Agent**: Reviewer 2 (`teamwork_preview_reviewer`)  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-09-24  
**Target Milestone**: Milestone 1 (F1–F4)  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct observations from codebase inspection, git history, and runtime execution:

### 1.1 Source Code Observations
1. **`src/components/GuruPresensi.tsx`**:
   - Lines 96–106: Automatically selects `tipeAbsen = 'Datang'` and preserves `jenisPresensi` when `state.presensiDatangDitolak` is truthy:
     ```tsx
     if (state.presensiDatangDitolak) {
       setTipeAbsen('Datang');
       setJenisPresensi(state.presensiDatangDitolak.jenis_presensi || 'Sekolah');
     } else if (state.presensiDatang && (!state.presensiPulang || state.presensiPulangDitolak)) {
       setTipeAbsen('Pulang');
       ...
     ```
   - Lines 144–146 & 156–158: Submission validation allows resubmission if rejected, but blocks duplicates if already accepted:
     ```tsx
     if (tipeAbsen === 'Pulang') {
       if (dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak) {
         return Swal.fire('Info', 'Anda sudah melakukan Presensi Pulang hari ini.', 'info');
       }
     ...
     if (tipeAbsen === 'Datang' && dailyState?.presensiDatang && !dailyState?.presensiDatangDitolak) {
       return Swal.fire('Info', 'Anda sudah melakukan Presensi Datang hari ini.', 'info');
     }
     ```
   - Lines 271–275: Cleanly deletes old rejected record upon new insert completion:
     ```tsx
     const rejectedRecord = tipeAbsen === 'Datang' ? dailyState?.presensiDatangDitolak : dailyState?.presensiPulangDitolak;
     if (rejectedRecord?.id) {
       await supabase.from('presensi_guru').delete().eq('id', rejectedRecord.id);
     }
     ```
   - Lines 404–407: Dropdown options enable Pulang only if Datang is valid and Pulang is not already accepted:
     ```tsx
     <option value="Datang" disabled={!!dailyState?.presensiDatang && !dailyState?.presensiDatangDitolak}>DATANG</option>
     <option value="Pulang" disabled={!dailyState?.presensiDatang || (!!dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak)}>PULANG</option>
     ```

2. **`src/components/GuruJurnal.tsx`**:
   - Line 335: Injects `sekolah_id` for multi-tenant isolation:
     ```tsx
     ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
     ```
   - Lines 340–358: Targets deletion strictly to matching class and subject (eliminating blind batch deletion):
     ```tsx
     if (dailyState?.jurnalDitolak && dailyState.jurnalDitolak.length > 0) {
       const matchingRejected = dailyState.jurnalDitolak.filter((j: any) => {
         if (tipeJurnal === 'Jurnal Kegiatan') {
           return j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan';
         }
         if (tipeJurnal === 'Jurnal KBM') {
           if (j.kelas !== kelas) return false;
           return j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel });
         }
         return false;
       });
       if (matchingRejected.length > 0) {
         const matchingIds = matchingRejected.map((j: any) => j.id);
         await supabase.from('jurnal_pembelajaran').delete().in('id', matchingIds);
       }
     }
     ```
   - Lines 419–424: Synchronously awaits `getGuruDailyState(user.nama, user.username)`.
   - Line 469–470: Ensures lock status is lifted when rejected journals are present, allowing re-submission.

3. **`src/components/PiketView.tsx`**:
   - Lines 204–220: Prompts admin for mandatory rejection reason via `Swal.fire` and records in both `catatan_admin` and `alasan_penolakan`.
   - Lines 332–341: Deletes old rejected report by ID and cleans up teacher's rejected piket records for today.
   - Lines 393–398: Synchronously awaits `getGuruDailyState`.
   - Lines 629–633: Re-enables `canReport` when `dailyState.laporanPiketDitolak` exists.

4. **`src/components/AdminVerifView.tsx`**:
   - Lines 160–171: Mandatory rejection reason validation (`if (!val || !val.trim()) return 'Alasan penolakan wajib diisi'`).
   - Lines 196–205: Optimistically removes rejected item from active lists (`prev.filter(item => item.id !== id)`).
   - Lines 235: Bulk verification skips rejected items (`&& item.status_verifikasi !== 'Ditolak'`).
   - Lines 475–477: Filters out rejected items from active verification views unless `verifFilter === 'Ditolak'`:
     ```tsx
     if (verifFilter !== 'Ditolak' && item.status_verifikasi === 'Ditolak') {
       return false;
     }
     ```
   - Lines 860–876: Suppresses the "Setujui" button entirely when `item.status_verifikasi === 'Ditolak'`:
     ```tsx
     {item.status_verifikasi !== 'Ditolak' && (
       <button ...>
         <i className="fa-solid fa-check"></i> Setujui
       </button>
     )}
     ```

### 1.2 Test Execution Results
- `npm test`:
  ```
  TOTAL TESTS: 23
  PASSED: 23
  FAILED: 0
  🎉 ALL MILESTONE 1 TESTS PASSED!
  ```
  All baseline test suites (M6.1, M6.2, M6.3, M6.4, M10) also passed with 0 failures.
- `npx tsx tests/e2e/run_all_e2e.ts`:
  ```
  • Tier 1: Feature Coverage (F1-F15 Happy Path)........... [ PASSED ] (75/75)
  • Tier 2: Boundary & Corner Cases (F1-F15 Edge Cases).... [ PASSED ] (75/75)
  • Tier 3: Cross-Feature Interactions..................... [ PASSED ] (16/16)
  • Tier 4: Real-World Scenarios........................... [ PASSED ] (20/20)
  Suite Status: ALL TIERS PASSED (100% - 186/186)
  ```
- `npm run build`: Next.js 16.3.4 (Turbopack) production build passed with 0 TypeScript/compilation errors.

---

## 2. Logic Chain

1. **Integrity Violation Analysis**:
   - Inspected all modified files for mock data, hardcoded test strings, dummy returns, or test-only early exits.
   - Grep search on `src/components` yielded zero occurrences of dummy mocks or test branch bypasses.
   - Real database queries and Supabase RPC calls are executed in production code paths.
   - **Conclusion**: PASSED — No integrity violations found.

2. **F1: Presensi Resubmission Logic Chain**:
   - When Admin rejects Datang presensi, `workflow.ts` tags it into `presensiDatangDitolak` and leaves `presensiDatang` null.
   - `GuruPresensi.tsx` automatically detects `presensiDatangDitolak` on mount and pre-selects `tipeAbsen = 'Datang'` (Observation 1.1).
   - Form submission prevents duplicate "Datang" only if Datang is already recorded and NOT rejected.
   - Upon insert success, the old rejected record ID is cleanly deleted from `presensi_guru`.
   - Duplicate Pulang submission is blocked unless Pulang was rejected.
   - **Conclusion**: F1 meets all requirements cleanly and safely.

3. **F2: Jurnal Resubmission & Class Isolation Logic Chain**:
   - Previously, resubmitting one journal deleted all IDs in `dailyState.jurnalDitolak`.
   - Observation 1.2 shows that `GuruJurnal.tsx` now evaluates `j.kelas !== kelas` and uses `isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel })` to isolate deletions to the exact matching session.
   - Verified via unit test simulation (Test 1 in `m1_resubmission_and_verif.test.ts`): resubmitting Class VII A preserves Class VII B in `jurnalDitolak`.
   - Added `sekolah_id` to `newJurnal` guarantees tenant safety under Row Level Security.
   - **Conclusion**: F2 resolves the multi-session deletion bug with precision.

4. **F3: Piket Resubmission Logic Chain**:
   - `workflow.ts` isolates rejected piket reports into `laporanPiketDitolak`.
   - `PiketView.tsx` re-enables `canReport` and renders a prominent rejection banner with direct action to re-submit (Observation 1.3).
   - Resubmission inserts new report, deletes the old rejected report by ID, and synchronously refreshes `dailyState`.
   - **Conclusion**: F3 fulfills the resubmission lifecycle without lingering stale state.

5. **F4: Admin Verification UI Logic Chain**:
   - Observation 1.4 confirms that when `status === 'Ditolak'`, `verifyItem` invokes `prev.filter(item => item.id !== id)`, immediately removing the card from the UI.
   - Even if the view re-renders, `displayList` excludes items where `item.status_verifikasi === 'Ditolak'` unless the Admin explicitly selects the "Ditolak" filter option.
   - In both the default view and the "Ditolak" audit view, `{item.status_verifikasi !== 'Ditolak' && <button>Setujui</button>}` guarantees that the "Setujui" button is not rendered and cannot be clicked.
   - `bulkVerifyCurrent` explicitly ignores rejected items.
   - Rejection reasons are stored in both `catatan_admin` and `alasan_penolakan` and rendered cleanly in UI cards with XSS-safe text nodes.
   - **Conclusion**: F4 completely satisfies the acceptance criteria.

---

## 3. Adversarial Stress-Test Findings & Boundary Analysis

| Scenario / Attack Vector | Predicted Risk | Observed Defense | Result |
|---|---|---|---|
| **Multiple rejected journals across different classes (e.g. VII A & VII B)** | Submitting VII A might delete VII B | Filter strictly checks `j.kelas !== kelas`; tested in Tier 2 (F2-B1) & Tier 3 (T3-I2.1) | **PASS** |
| **Admin attempting to approve rejected item** | Unintended approval of uncorrected data | "Setujui" button conditional suppresses rendering completely from DOM | **PASS** |
| **Rejection card lingering in active queue** | Cluttering pending queue and confusing admin | Filtered out optimistically from state, and excluded in `displayList` when `verifFilter !== 'Ditolak'` | **PASS** |
| **Re-submission failure on network drop** | Deleting rejected record before new insert finishes | Presensi and Piket insert new record *first*, and delete rejected record *after* successful insert | **PASS** |
| **Special characters in rejection reason (e.g. `<script>`, quotes)** | Potential XSS or JSON breakage | Admin note input is trimmed and rendered as JSX text node (auto-escaped); tested in Tier 2 (F4-B2) | **PASS** |
| **Duplicate Pulang bypass** | Teacher trying to submit Pulang twice on the same day | Guarded by `dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak` | **PASS** |

### Minor Quality Observation (Non-blocking):
In `GuruJurnal.tsx` (lines 356 & 360), `matchingRejected` deletion is awaited immediately prior to `supabase.from('jurnal_pembelajaran').insert([newJurnal])`. If the insert were to fail due to a rare network error, the old rejected record would already be deleted. Because the record was already marked as rejected (not counting towards completed KBM anyway), there is no data inflation risk; however, mirroring `GuruPresensi`'s order (insert first, delete old after) could be considered in future refactorings.

---

## 4. Caveats

- Supabase client-side record deletions (`.delete().eq('id', ...)`) depend on database RLS policies granting DELETE permission to teachers on their own records where `status_verifikasi = 'Ditolak'`.
- Admins can still audit rejected submissions by explicitly choosing the "Ditolak" option in the verification filter dropdown.

---

## 5. Conclusion

**Verdict: APPROVE**

The implementation of Milestone 1 across `GuruPresensi.tsx`, `GuruJurnal.tsx`, `PiketView.tsx`, and `AdminVerifView.tsx` is clean, robust, and verified:
1. Re-submission resets rejected records without affecting unintended classes or sessions.
2. The "Setujui" button is inaccessible for rejected items, and rejected items disappear immediately from active verification queues.
3. Multi-tenant isolation (`sekolah_id`) is properly maintained.
4. All 23 Milestone 1 tests, 186 E2E tests, and Next.js production build pass with zero failures.
5. No integrity violations or facade implementations were detected.

---

## 6. Verification Method

To independently reproduce this verification:
```bash
# 1. Run unit and milestone test suites
npm test

# 2. Run comprehensive 4-tier E2E acceptance test suite
npx tsx tests/e2e/run_all_e2e.ts

# 3. Verify Next.js production compilation and TypeScript checks
npm run build
```
Invalidation conditions:
- Any test failure in `m1_resubmission_and_verif.test.ts` or `tests/e2e/run_all_e2e.ts`.
- Appearance of the "Setujui" button when inspecting a rejected submission element in DOM.
- Resubmission of a journal for Class VII A causing the deletion of a rejected journal for Class VII B.
