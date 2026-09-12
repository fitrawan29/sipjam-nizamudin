# Handoff Report: Adversarial Challenge — R1 Print Redesign & R2/R3 Dashboard & Verification Logic

**Agent ID:** challenger_m6_1  
**Role:** critic, specialist (empirical-challenger)  
**Working Directory:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m6_1\`  
**Milestone:** M6 (M6.2 & M6.3)  
**Date:** 2026-09-12  
**Verdict:** **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Target Areas Tested & Pass Verification
An automated adversarial stress suite was developed and executed at `tests/adversarial_suite.ts`. All 40 structural and behavioral assertions passed:
1. **Print Orientation Toggle & Dynamic `@page` CSS**:
   - `src/components/PrintHeader.tsx` lines 230–289: Injects `@page { size: A4 ${orientation} !important; margin: 10mm 12mm !important; }`.
   - Injects suppression: `header, nav, aside, .app-header, .no-print { display: none !important; }`.
   - `src/components/AppScreen.tsx` line 104: Contains `print:hidden no-print`.
   - Verified default states: `RekapJurnalView.tsx` (landscape), `AdminRekapView.tsx` (landscape), `RekapSiswaView.tsx` (portrait).
2. **Header Period Formatting & Date Boundaries**:
   - `src/components/PrintHeader.tsx` lines 291–324 (`formatPeriodHeader`):
     - Indonesian month formatted: `formatPeriodHeader('2026-09')` -> `"Periode: September 2026"`.
     - Date range formatted: `formatPeriodHeader('', '2026-09-01', '2026-09-12')` -> `"Periode: 01/09/2026 - 12/09/2026"`.
     - Single-date collapse: `formatPeriodHeader('', '2026-09-12', '2026-09-12')` -> `"Periode: 12/09/2026"`.
     - Unbounded dates: `"Periode: Sejak 01/09/2026"`, `"Periode: Sampai 30/09/2026"`.
     - Leap-year boundary verified: `new Date(2024, 2, 0).getDate() === 29`, `new Date(2025, 2, 0).getDate() === 28`, `new Date(2026, 9, 0).getDate() === 30`.
3. **Signature Blocks Justification & Line Overflow**:
   - `src/components/PrintHeader.tsx` lines 181–227 (`PrintSignature`):
     - Container: `w-full flex justify-between items-start mt-8 pt-4 page-break-inside-avoid text-black`.
     - All signer lines use `block whitespace-nowrap` to prevent line folding.
4. **Journal Activity Photo Rendering & URL Transformation**:
   - `src/lib/imageUrl.ts`: `getGoogleDriveThumbnailUrl(fotoUrl, 800)` produces CDN thumbnail URL `https://drive.google.com/thumbnail?id={id}&sz=w800`.
   - `RekapJurnalView.tsx` lines 367–398: Uses `object-contain`, `print:w-20 print:h-16`, `loading="eager"`, and `referrerPolicy="no-referrer"`.
5. **AdminRekapView 10-Column Table & RekapSiswa Table**:
   - `src/components/AdminRekapView.tsx` lines 270–282: Exactly contains all 10 requested headers: `No`, `Nama Guru`, `Hadir`, `Dinas Luar`, `Sakit`, `Izin`, `Alpa`, `Keterlambatan`, `Piket`, `Jurnal`.
   - Tables in both views enforce `border-collapse border border-gray-300 dark:border-gray-700 print:border-black print:text-[8pt]`.
6. **Teacher Dashboard Target Journal Ratio Edge Cases**:
   - In `src/components/HomeView.tsx` lines 440–456:
     - 0 scheduled classes: Evaluates cleanly to `0 / 0`, `percentage: 100%`, status badge `'Bebas Mengajar Hari Ini'`.
     - 0 of N classes filled: Evaluates to `0 / N`, `percentage: 0%`, status badge `'Belum Lengkap'`.
     - Partial classes filled: Evaluates to `X / N`, `percentage: Math.round((X/N)*100)`, status badge `'Belum Lengkap'`.
     - All classes filled: Evaluates to `N / N`, `percentage: 100%`, status badge `'Selesai'`.
     - Upper boundary: Target ratio is bounded because `dailyState.jadwalKBM.filter(...)` can never exceed `dailyState.jadwalKBM.length`.
7. **Student Attendance Percentage with Empty Journals / Zero Students**:
   - In `src/components/HomeView.tsx` lines 459–532 & `RekapSiswaView.tsx` lines 162–170:
     - Empty journals array: cleanly returns `0%` (guarded by `totalRecords > 0 ? Math.round(...) : 0`).
     - Empty JSON `{}`: returns `0%`.
     - Malformed JSON string: falls back without throwing, returns `0%`.

---

### 1.2 Identified Bugs & Vulnerabilities

#### Bug 1 [HIGH SEVERITY]: AdminVerifView `!date` Fallback Pollutes Unsubmitted Cross-Referencing
- **File**: `src/components/AdminVerifView.tsx`
- **Lines**: 262, 290, 343
- **Verbatim Code**:
  - Line 262: `presensiList.filter(p => !date || (p.timestamp && p.timestamp.includes(effectiveDate)))`
  - Line 290: `jurnalList.filter(j => !date || j.tanggal === effectiveDate)`
  - Line 343: `piketList.filter(p => !date || p.tanggal === effectiveDate)`
- **Observation**:
  1. On initial mount, `date` state is initialized to empty string: `const [date, setDate] = useState('');` (line 17).
  2. `effectiveDate` is defined as `date || getWitaDateStr();` (line 246), which represents today's date in WITA.
  3. When `date === ''`, the condition `!date` evaluates to `true`.
  4. As a result, `!date || ...` is ALWAYS `true` for all 200 records loaded from historical data.
  5. Any teacher who has submitted presensi, journal, or picket at any time in the past 200 database records is added to `submittedTeacherNames`.
  6. When the admin switches `taskFilter` to `'Belum'`, teachers who submitted yesterday or in previous days are treated as having submitted for today.
  7. **Empirical test verification** (`tests/adversarial_suite.ts` Section 8.4):
     ```
     With 3 total teachers and 2 historical records from yesterday (0 check-ins today):
     - Correct unsubmitted count for today: 3
     - Flawed code output: 1 (2 teachers falsely marked as submitted today)
     ```
  8. If all 13 school teachers have submitted within the last 200 records, the "Belum Menyelesaikan" filter renders "Semua guru telah menyelesaikan tugas untuk tanggal ini!" even if zero teachers checked in today.

#### Bug 2 [MEDIUM SEVERITY]: AdminVerifView "Semua" Filter Omits Unsubmitted Teachers
- **File**: `src/components/AdminVerifView.tsx`
- **Lines**: 373–400, 502
- **Observation**:
  - In line 502, the UI dropdown label reads: `<option value="Semua">Semua Guru (Sudah & Belum)</option>`.
  - In lines 373–400 (`displayList`), the logic branches:
    ```typescript
    if (taskFilter === 'Belum') {
      // returns unsubmittedList
    }
    // 2. If filtering for Sudah Menyelesaikan or Semua
    const submittedList = activeTab === 'Presensi' ? presensiList : ...
    return submittedList.filter(...)
    ```
  - When `taskFilter === 'Semua'`, `displayList` returns only `submittedList`, exactly identical to `taskFilter === 'Sudah'`.
  - Teachers who have not submitted are completely absent from the display unless `'Belum'` is explicitly selected.

#### Bug 3 [MEDIUM SEVERITY]: Substring Name Collision in Unsubmitted Detection
- **File**: `src/components/AdminVerifView.tsx`
- **Lines**: 270, 301, 356
- **Verbatim Code**:
  - `Array.from(submittedTeacherNames).some(sn => sn.includes(tName) || tName.includes(sn))`
- **Observation**:
  - Bidirectional substring matching (`sn.includes(tName) || tName.includes(sn)`) causes teachers whose name is a substring of another teacher (e.g. "Fitra" and "Ade Fitrawan") to be considered submitted if either one submits.

---

## 2. Logic Chain

1. *Premise 1*: Requirement R3 dictates that Admin Verification must feature reactive filters to display teachers who "Sudah" and "Belum" completed their duties for the target date.
2. *Premise 2*: In `src/components/AdminVerifView.tsx`, `date` defaults to `""`, while the cards state they display status for `effectiveDate` (today).
3. *Premise 3*: Because `!date` evaluates to `true` when `date === ""`, lines 262, 290, and 343 include all 200 historical records from previous days in `submittedTeacherNames`.
4. *Inference*: Any teacher who checked in yesterday is counted as having checked in today. Teachers with no submissions today are omitted from the `'Belum'` list.
5. *Empirical Confirmation*: Running `tests/adversarial_suite.ts` proved that when 0 teachers checked in today, the flawed logic falsely flagged 2 teachers as submitted, reducing the unsubmitted count from 3 to 1.
6. *Conclusion*: The diff calculation between total teachers and submitted logs is functionally compromised under default view conditions.

---

## 3. Caveats

1. The issue only manifests when `date === ""` (the initial state when entering the page). If the admin explicitly clicks "Hari Ini" or picks a date from the date input, `date` is non-empty, and the bug does not trigger. However, users naturally expect the default landing view to accurately represent today's unsubmitted teachers.
2. The print redesign components (R1: `PrintHeader.tsx`, `RekapJurnalView.tsx`, `AdminRekapView.tsx`, `RekapSiswaView.tsx`) and Teacher Dashboard components (R2: `HomeView.tsx`) are completely robust and passed all 40 adversarial checks.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Areas R1 (Print Redesign) and R2 (Teacher Dashboard stats, target journal ratio, student attendance %) are approved. However, Area R3 (Admin Verification unsubmitted diff calculation) has a functional bug in `AdminVerifView.tsx` that must be addressed:

### Required Action Items for Implementer:
1. In `src/components/AdminVerifView.tsx`:
   - Line 262: Change:
     ```typescript
     presensiList.filter(p => p.timestamp && p.timestamp.includes(effectiveDate))
     ```
   - Line 290: Change:
     ```typescript
     jurnalList.filter(j => j.tanggal === effectiveDate)
     ```
   - Line 343: Change:
     ```typescript
     piketList.filter(p => p.tanggal === effectiveDate)
     ```
   - Remove `!date ||` from the unsubmitted filters, as unsubmitted checks must always evaluate strictly against `effectiveDate`.
2. In `src/components/AdminVerifView.tsx`:
   - Update line 502 dropdown label to `<option value="Semua">Semua Pengajuan (Sudah)</option>` OR combine `[...submittedList, ...unsubmittedList]` when `taskFilter === 'Semua'` so the UI label matches the rendered data.
3. Replace loose `sn.includes(tName) || tName.includes(sn)` with exact normalized name matching to prevent substring false-positive collisions.

---

## 5. Verification Method

1. **Run Adversarial Suite**:
   ```powershell
   npx tsx tests/adversarial_suite.ts
   ```
   *Expected result*: 40 passes, identifying the exact findings documented in this report.
2. **Run Standard Suite**:
   ```powershell
   npm test
   ```
   *Expected result*: All 6 test suites pass with 0 failures.
3. **Invalidation Condition**:
   - If `tests/adversarial_suite.ts` is re-run after applying the fixes and reports 0 findings, the verdict transitions to `APPROVE`.
