# Handoff Report: Milestone 2 Empirical Challenge (Teacher Attendance & Admin Routing)

**Agent**: Challenger 2 (`challenger_o17_m2_2`)  
**Date**: 2026-10-08T16:26:00Z  
**Verdict**: **REQUEST_CHANGES**  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o17_m2_2`  
**Test Suite**: `tests/challenger_o17_m2_empirical_stress.test.ts` (22/22 tests passing)  

---

## 1. Observation

### Observation 1: Sick & Leave Approval Thresholds & Admin Badges (Verified Correct)
1. In `src/components/GuruPresensi.tsx` line 128:
   ```ts
   const memerlukanPersetujuanAdmin = (detailIzin === 'Sakit' && durasiHari >= 3) || (jenisPresensi === 'Izin' && durasiHari > 3);
   ```
2. In `src/components/AdminVerifView.tsx` lines 826–840:
   ```tsx
   {((item.detail_izin === 'Sakit' || item.jenis_presensi === 'Sakit') && (item.durasi_hari >= 3 || item.memerlukan_persetujuan_admin)) && (
     <div className="my-1.5">
       <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 ...">
         <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
         Sakit >= 3 Hari (Perlu Persetujuan)
       </span>
     </div>
   )}
   {((item.jenis_presensi === 'Izin' || item.detail_izin?.includes('Izin')) && item.detail_izin !== 'Sakit' && (item.durasi_hari > 3 || item.memerlukan_persetujuan_admin)) && (
     <div className="my-1.5">
       <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 ...">
         <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
         Izin > 3 Hari (Perlu Persetujuan)
       </span>
     </div>
   )}
   ```
3. Executed empirical tests P1-01 through P1-09 in `tests/challenger_o17_m2_empirical_stress.test.ts`:
   - Sakit 1 day: `memerlukan_persetujuan_admin = false` (No admin badge)
   - Sakit 2 days: `memerlukan_persetujuan_admin = false` (No admin badge)
   - Sakit 3 days: `memerlukan_persetujuan_admin = true` (`Sakit >= 3 Hari` badge rendered)
   - Sakit 4 days: `memerlukan_persetujuan_admin = true` (`Sakit >= 3 Hari` badge rendered)
   - Izin 1 day: `memerlukan_persetujuan_admin = false` (No admin badge)
   - Izin 2 days: `memerlukan_persetujuan_admin = false` (No admin badge)
   - Izin 3 days: `memerlukan_persetujuan_admin = false` (No admin badge, strictly respects `> 3`)
   - Izin 4 days: `memerlukan_persetujuan_admin = true` (`Izin > 3 Hari` badge rendered)
   - Izin 5 days: `memerlukan_persetujuan_admin = true` (`Izin > 3 Hari` badge rendered)

### Observation 2: Date Arithmetic Spanning Month Boundaries, Leap Years & Inverted Input (Edge Case Found)
1. In `src/components/GuruPresensi.tsx` lines 83–109:
   ```ts
   const addDaysToDateStr = (dateStr: string, days: number): string => { ... };
   const getDaysBetween = (startStr: string, endStr: string): number => { ... };
   ```
2. Executed tests P2-01 through P2-08 in `tests/challenger_o17_m2_empirical_stress.test.ts`:
   - Month boundary transitions (`2026-10-30` + 2 days = `2026-11-01`, diff = 3 days) calculate correctly.
   - Leap year (`2024-02-28` + 2 days = `2024-03-01`, diff = 3 days) and non-leap year (`2026-02-27` + 2 days = `2026-03-01`, diff = 3 days) calculate correctly.
   - Year crossover (`2026-12-30` + 3 days = `2027-01-02`, diff = 4 days) calculates correctly.
   - Round-trip generator testing across 420 combinations ($N \in [1..60]$ over 7 anchor dates) passed 100%.
3. Inverted date selection edge case:
   In `src/components/GuruPresensi.tsx` lines 122–126:
   ```ts
   const handleTanggalSelesaiChange = (newEnd: string) => {
     setTanggalSelesai(newEnd);
     const days = getDaysBetween(tanggalMulai, newEnd);
     setDurasiHari(days);
   };
   ```
   If a teacher selects `newEnd < tanggalMulai` (e.g. start `2026-10-10`, end `2026-10-08`), `getDaysBetween` returns `1`, but `tanggalSelesai` is kept as `'2026-10-08'`. The resulting record has `tanggal_mulai: '2026-10-10'`, `tanggal_selesai: '2026-10-08'`. In `workflow.ts`, the condition `todayStr >= p.tanggal_mulai && todayStr <= p.tanggal_selesai` can never be satisfied, permanently deactivating the leave.

### Observation 3: Multi-Day Leave Coverage vs Auto-Alpa (CRITICAL DEFECT CONFIRMED)
1. In `src/lib/workflow.ts` lines 463–478:
   The client-side `getGuruDailyState` checks:
   ```ts
   const multiDayLeave = allPresensi.find((p: any) => {
     if (p.status_verifikasi === 'Ditolak') return false;
     const isLeaveType = p.jenis_presensi === 'Izin' || p.jenis_presensi === 'Sakit' || p.detail_izin === 'Sakit';
     if (!isLeaveType) return false;
     if (p.tanggal_mulai && p.tanggal_selesai) {
       return todayStr >= p.tanggal_mulai && todayStr <= p.tanggal_selesai;
     }
     return false;
   });
   ```
2. HOWEVER, in `src/lib/attendanceAlpa.ts` lines 85–105 and 236–271:
   The backend Auto-Alpa evaluation `evaluateAndApplyAutoAlpa(targetDateStr)` evaluates `targetDateStr` as follows:
   ```ts
   const startOfDay = getWitaStartOfDay(evaluatedDate);
   const endOfDay = getWitaEndOfDay(evaluatedDate);

   let query = supabase
     .from('presensi_guru')
     .select('*')
     .gte('timestamp', startOfDay)
     .lte('timestamp', endOfDay);
   ```
   And then evaluates whether each active teacher has attendance today:
   ```ts
   // Skip jika sudah ada record hari ini (match by nama atau user_id)
   const hasRecord = presensiRecords.some(r =>
     (r.nama_guru || '').toLowerCase().trim() === namaNorm
     || (guru.user_id && r.user_id === guru.user_id)
   );
   if (hasRecord) continue;
   ...
   // INSERT record Alpa baru
   const { error: insErr } = await supabase.from('presensi_guru').insert({
     id: crypto.randomUUID(),
     timestamp: `${evaluatedDate}T23:59:00+08:00`,
     nama_guru: guru.nama_guru,
     user_id: guru.user_id || null,
     tipe_absen: 'Datang',
     jenis_presensi: 'Alpa',
     status_verifikasi: 'Alpa',
     catatan_admin: 'Alpa otomatis: tidak melakukan presensi datang hingga batas waktu.',
     sekolah_id: guru.sekolah_id,
   });
   ```
3. Test P3-02 in `tests/challenger_o17_m2_empirical_stress.test.ts` reproduced and proved:
   When a teacher submits a multi-day leave on `2026-10-08` covering `2026-10-08` through `2026-10-10`, the record's `timestamp` is `2026-10-08 07:15:00`.
   On Day 2 (`2026-10-09`), `evaluateAndApplyAutoAlpa('2026-10-09')` queries `presensi_guru` where `timestamp` is within `2026-10-09`.
   The leave record from Day 1 is NOT returned. `presensiRecords` has 0 records for this teacher.
   `hasRecord` evaluates to `false`.
   `evaluateAndApplyAutoAlpa` INSERTS AN ALPA RECORD FOR THIS TEACHER ON 2026-10-09!
   This directly violates Requirement R2: "Multi-day leave coverage: test that approved multi-day leave excuses the teacher across all dates without triggering Auto-Alpa."

### Observation 4: GPS Print Attachment & SweetAlert Blocking Disconnected (HIGH DEFECT CONFIRMED)
1. `src/utils/printWithGps.ts` exports `triggerPrintWithGps` which handles `navigator.geolocation`, alerts `Akses GPS Diblokir` on `PERMISSION_DENIED` via SweetAlert, and caches coordinates on `window.__SIPJAM_PRINT_GPS__`.
2. `src/components/PrintHeader.tsx` line 385 extracts `activeGps = gpsCoordinates ?? (window as any).__SIPJAM_PRINT_GPS__` and embeds GPS coordinates into the print security footer.
3. HOWEVER, test P4-03 in `tests/challenger_o17_m2_empirical_stress.test.ts` verified that across all 7 printable view components:
   - `src/components/RekapJurnalView.tsx` line 945: `<button type="button" onClick={() => window.print()} ...>`
   - `src/components/DokumenView.tsx` line 777: `onClick={() => window.print()}`
   - `src/components/AdminRekapView.tsx` line 436: `<button type="button" onClick={() => window.print()} ...>`
   - `src/components/PiketView.tsx` line 3473: `onClick={() => window.print()}`
   - `src/components/RekapSiswaView.tsx` line 1171, line 1360: `onClick={() => window.print()}`
   - `src/components/GradebookView.tsx` line 1562: `onClick={() => window.print()}`
   - `src/components/AdminDataView.tsx` line 996: `window.print()`
   Every print button in the app calls `window.print()` directly!
   ZERO components call `triggerPrintWithGps` or `printWithGps`.
   Consequently, GPS coordinates are never acquired or attached during user print actions, and SweetAlert permission block alerts are never triggered when printing.

---

## 2. Logic Chain

1. From Observation 1, the approval thresholds strictly conform to `(Sakit >= 3 || Izin > 3)`. The UI forms and Admin verification badges accurately reflect this rule.
2. From Observation 2, date calculations handle month, year, and leap day boundaries accurately across extensive stress tests, though inverted dates should be guarded with `min={tanggalMulai}`.
3. From Observation 3, while client-side `workflow.ts` was patched to detect multi-day leave, `evaluateAndApplyAutoAlpa` in `attendanceAlpa.ts` was omitted. When evaluated at cutoff (22:00 WITA), `evaluateAndApplyAutoAlpa` queries only the evaluated date's `timestamp` range, misses prior active multi-day leaves, and inserts an `Alpa` record into the database for teachers on approved multi-day leave.
4. From Observation 4, `triggerPrintWithGps` is dead code because no UI component invokes it. Users who click "Cetak" bypass GPS acquisition entirely; coordinates are never injected into `PrintHeader.tsx`, and SweetAlert permission warnings never trigger.
5. Because Observations 3 and 4 directly violate core requirements of Milestone 2 (Multi-day leave immunity from Auto-Alpa, and GPS print attachment with SweetAlert blocking), the implementation cannot be approved in its current state.

---

## 3. Caveats

- Date arithmetic was verified in local timezones and simulated WITA contexts (UTC+8). If the system is run in regions with daylight saving time shifts, `Math.round(diffTime / 86400000)` handles 23-hour and 25-hour days safely.
- No other caveats.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 2 implementation has two critical/high issues that require worker remediation:
1. **Fix `evaluateAndApplyAutoAlpa` in `src/lib/attendanceAlpa.ts`**:
   Must query active approved/pending multi-day leaves spanning `evaluatedDate` (`lte('tanggal_mulai', evaluatedDate).gte('tanggal_selesai', evaluatedDate)`) and exempt matching teachers from Auto-Alpa insertion.
2. **Wire `triggerPrintWithGps` into UI print buttons**:
   Replace raw `window.print()` with `triggerPrintWithGps()` in printable views (notably `RekapJurnalView.tsx`, `DokumenView.tsx`, `AdminRekapView.tsx`, `PiketView.tsx`, `RekapSiswaView.tsx`).
3. **Add Input Guard for Inverted Dates**:
   Add `min={tanggalMulai}` to `<input type="date" value={tanggalSelesai} />` in `GuruPresensi.tsx`.

---

## 5. Verification Method

To independently reproduce and verify these findings, run:

```bash
# 1. Run Challenger 2 Empirical Stress Test Suite
npx tsx tests/challenger_o17_m2_empirical_stress.test.ts

# 2. Inspect Confirmed Vulnerability P3-02 in:
# src/lib/attendanceAlpa.ts lines 85-105 & 237-271

# 3. Inspect Confirmed Disconnected Triggers in:
# src/components/RekapJurnalView.tsx:945
# src/components/DokumenView.tsx:777
# src/components/AdminRekapView.tsx:436
# src/components/PiketView.tsx:3473
# src/components/RekapSiswaView.tsx:1171, 1360
# src/components/GradebookView.tsx:1562
# src/components/AdminDataView.tsx:996
```
