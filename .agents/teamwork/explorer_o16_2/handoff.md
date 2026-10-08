# Handoff Report: R2 Teacher Attendance & Admin Verification Survey

**Agent**: `teamwork_preview_explorer_survey_o16_2`  
**Target Recipient**: Orchestrator (`835d6ca7-b3e2-474a-acf0-423026614449`) & Downstream Implementer  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_2`  
**Related Artifact**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_2\report.md`  

---

## 1. Observation

1. **Teacher Check-in & Check-out Logic**:
   - In `src/components/GuruPresensi.tsx:710`, `const isJenisDropdownDisabled = tipeAbsen === 'Pulang' && !dailyState?.isDinasLuar;`. If a teacher arrives at school (`Sekolah`), they cannot select "Dinas Luar" when leaving.
   - In `src/components/GuruPresensi.tsx:494-497`:
     `const statusVerif = isTerlambat ? 'Menunggu' : (jenisPresensi === 'Sekolah' && (jarakAktual === null || jarakAktual <= gpsConfig.radius) ? 'Diverifikasi' : 'Menunggu');`
     "Dinas Luar" check-ins are recorded with `status_verifikasi = 'Menunggu'`.
   - In `src/lib/workflow.ts:588-590`:
     `else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) { if (state.jurnalKegiatan) isJurnalDone = true; }`
     "Dinas Luar" allows check-out after 1 `jurnalKegiatan` rather than checking all individual scheduled KBM classes.

2. **Auto-Checkout & Forgotten Checkouts**:
   - `src/lib/attendanceAlpa.ts:47-284` implements `evaluateAndApplyAutoAlpa`. It evaluates unresubmitted rejections and converts them to `Alpa`, and detects teachers with zero attendance records and inserts an `Alpa` Datang record.
   - Nowhere in `attendanceAlpa.ts`, `workflow.ts`, or `src/app/api/attendance/auto-alpa/route.ts` are forgotten checkouts detected. Teachers who check in (`Datang`) but never check out (`Pulang`) remain with an open-ended arrival record without warning or auto-checkout flag.

3. **Sick & Leave Submissions**:
   - In `src/components/GuruPresensi.tsx:835-913`, the leave form only accepts `detailIzin` ('Sakit', 'Izin Pribadi', 'Izin Khusus'), `keterangan` (textarea), and `file` upload.
   - There are **no fields** for duration (`durasi_hari`) or date ranges (`tanggal_mulai`, `tanggal_selesai`).
   - Every leave entry is treated as a 1-day record with `status_verifikasi = 'Menunggu'`. There is no distinction between standard short leave and long-term sick ($\ge 3$ days) or leave ($> 3$ days).

4. **Printed Documents & GPS**:
   - Documents are printed via `window.print()` in 6 locations: `AdminRekapView.tsx:436`, `RekapJurnalView.tsx:945`, `DokumenView.tsx:777`, `PiketView.tsx:3473`, `GradebookView.tsx:1562`, `RekapSiswaView.tsx:1171,1360`.
   - All printed documents share `PrintHeader` and `PrintSignature` from `src/components/PrintHeader.tsx`.
   - `PrintSignature` (lines 376–380) prints a legal security footer with system name, printer name, and WITA timestamp, but **does not attach GPS coordinates**.
   - None of the print buttons check `navigator.geolocation` or display alerts if GPS access is blocked.

5. **Database Tables & Schema**:
   - In `src/types/database.ts:1046-1097`, `public.presensi_guru` stores all attendance and leave types. There is no separate `pengajuan_izin` table.
   - `presensi_guru` lacks columns for `durasi_hari`, `tanggal_mulai`, `tanggal_selesai`, `memerlukan_persetujuan_admin`, and `is_auto_checkout`.

6. **E2E Test Suite**:
   - Executing `npx tsx tests/e2e/run_all_e2e.ts` runs 4 tiers (Tier 1: Feature Coverage, Tier 2: Boundary Cases, Tier 3: Cross-Feature Interactions, Tier 4: Real-World Scenarios) and reports 100% pass (Total Assertions: 186, Passed: 186, Failed: 0).
   - `ORIGINAL_REQUEST.md:966` mandates adding an E2E test verifying teacher attendance state transitions (e.g., "Dinas Luar" check-in to check-out) and routing long-term sick/leave to the Admin dashboard.

---

## 2. Logic Chain

1. **State Transitions**: Observation 1 shows that `isJenisDropdownDisabled` currently locks Pulang to `Sekolah` unless arrival was `Dinas Luar`. Removing this UI restriction and standardizing `jenis_presensi` enables all 4 transition pairs ("Hadir di Sekolah" $\leftrightarrow$ "Dinas Luar").
2. **Auto-Checkout Detection**: Observation 2 shows `attendanceAlpa.ts` already evaluates teachers past the cutoff time `jam_pulang_akhir`. Adding logic to find teachers with `tipe_absen === 'Datang'` but missing `tipe_absen === 'Pulang'` allows the system to insert or flag an explicit `Lupa Checkout` Pulang record.
3. **Approval Routing**: Observation 3 shows that absence requests have no duration field. Adding `durasi_hari` and checking `(detailIzin === 'Sakit' && durasi >= 3) || (jenisPresensi === 'Izin' && durasi > 3)` provides an exact rule for flagging `memerlukan_persetujuan_admin = true` and highlighting the cards in `AdminVerifView.tsx`.
4. **GPS on Print**: Observation 4 shows all printed pages render `PrintSignature`. Creating a `triggerPrintWithGps` helper allows intercepting the print click, acquiring GPS coordinates (or alerting via SweetAlert if blocked), and passing coordinates to `PrintSignature` to render in the print footer.
5. **Schema Compatibility**: Observation 5 confirms `presensi_guru` is the single source of truth for all attendance types. Adding nullable/default columns (`durasi_hari`, `tanggal_mulai`, `tanggal_selesai`, `memerlukan_persetujuan_admin`, `is_auto_checkout`) preserves all existing queries while supporting the new features.
6. **Verification Completeness**: Observation 6 shows the 4-tier E2E runner is robust and fast (~0.1s). Incorporating the new test assertions into `tier1_feature_coverage.test.ts` and `tier3_cross_feature.test.ts` satisfies the user's mandatory acceptance criteria.

---

## 3. Caveats

1. **Hardware GPS Simulation in Headless CI**: In automated test environments without a physical GPS chip or browser location prompt, `navigator.geolocation` must be mocked in test helpers (`helpers/testHarness.ts` or `mockData.ts`).
2. **Timezone Handling**: All dates and cutoff times must strictly follow WITA (`Asia/Makassar`) using `src/lib/wita.ts` helpers (`getWitaDateStr`, `getWitaTimeStr`) to prevent false cutoff triggers near midnight.
3. **Multi-Tenant Isolation**: Any new queries or migrations on `presensi_guru` must include `sekolah_id` filters to maintain strict multi-tenant isolation.

---

## 4. Conclusion

The codebase is cleanly structured and well-prepared for R2 enhancements without requiring structural refactoring:
1. Multi-state arrival/departure transitions can be accomplished by unlocking `GuruPresensi.tsx` dropdown restrictions and tracking arrival vs departure states in `workflow.ts`.
2. Auto-checkout detection integrates directly into `attendanceAlpa.ts` after the existing auto-alpa pass.
3. Long-term sick ($\ge 3$ days) and leave ($> 3$ days) routing can be implemented by adding `durasi_hari` to `GuruPresensi.tsx` and rendering prominent verification badges in `AdminVerifView.tsx`.
4. GPS on printed documents is cleanly implemented via a shared `triggerPrintWithGps` utility wired into `PrintHeader.tsx`'s `PrintSignature`.
5. Database changes require only an `ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS` migration.
6. E2E tests can be added seamlessly to `tests/e2e/tier1_feature_coverage.test.ts` and `tests/e2e/tier3_cross_feature.test.ts`.

---

## 5. Verification Method

To independently verify all findings and baseline readiness:
1. **Run Full E2E Test Suite**:
   ```bash
   npx tsx tests/e2e/run_all_e2e.ts
   ```
   *Expected Result*: All 4 tiers pass (100% pass rate).
2. **Inspect Core Files**:
   - `src/components/GuruPresensi.tsx` (lines 494–497, 710, 787–800) for attendance and dropdown states.
   - `src/lib/attendanceAlpa.ts` (lines 47–284) for cutoff evaluation logic.
   - `src/components/AdminVerifView.tsx` (lines 145–255, 804–840) for verification actions and Presensi cards.
   - `src/components/PrintHeader.tsx` (lines 376–380) for printed document security footer.
3. **TypeScript Build Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected Result*: 0 type errors.
