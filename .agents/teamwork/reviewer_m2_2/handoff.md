# Handoff Report — Milestone 2 Independent Adversarial Review (Reviewer M2.2)

## 1. Observation

### Observation 1: Time Comparison String Bug in Auto-Alpa Cutoff
- **File**: `src/lib/attendanceAlpa.ts`, lines 38, 46, 52:
  ```ts
  38: const currentTimeWita = getWitaTimeStr();
  ...
  46: const cutoffTime = configData?.value || '22:00';
  ...
  52: if (currentTimeWita < cutoffTime) {
  ```
- **Helper definition** in `src/lib/wita.ts`, lines 42-47:
  ```ts
  export function getWitaTimeStr(date: Date = new Date()): string {
    return date.toLocaleTimeString('id-ID', {
      timeZone: WITA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  ```
- **Direct execution result** (`node -e "..."`):
  - In Indonesian locale (`id-ID`), `toLocaleTimeString` produces `"00.47"` with a **DOT (`.`)**, NOT a colon (`:`).
  - In ASCII, `'.'` (ASCII 46) is strictly less than `':'` (ASCII 58).
  - When compared: `'22.30' < '22:00'` evaluates to `true`! `'16.30' < '16:00'` evaluates to `true`!
  - Consequently, `currentTimeWita < cutoffTime` evaluates to `true` even after the cutoff time has passed (e.g., at 22:30 when cutoff is 22:00), causing `attendanceAlpa.ts` to exit early with `affectedCount: 0`.

### Observation 2: Timezone Discrepancy & Day-Schedule Inversion in 3x Warning System
- **File**: `src/lib/warningSystem.ts`, lines 123-143:
  ```ts
  123: const todayStr = getWitaDateStr();
  124: const evaluationDates: { dateStr: string; dayName: string }[] = [];
  125: const dateObj = new Date(todayStr + 'T00:00:00+08:00');
  126: 
  127: // Look back up to 30 calendar days
  128: for (let i = 29; i >= 0; i--) {
  129:   const d = new Date(dateObj);
  130:   d.setDate(d.getDate() - i);
  131:   const dateStr = d.toISOString().split('T')[0];
  132:   const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  133:   const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long' });
  134: 
  135:   // Exclude Sundays
  136:   if (dayOfWeek === 0) continue;
  137:   // Exclude Saturdays if 5-day school week
  138:   if (hariSekolah === '5' && dayOfWeek === 6) continue;
  139:   // Exclude calendar holidays (F7-B3)
  140:   if (holidaySet.has(dateStr)) continue;
  141: 
  142:   evaluationDates.push({ dateStr, dayName });
  143: }
  ```
- **Direct execution result**:
  For `todayStr = '2026-09-25'` (Friday in WITA):
  - `d.toISOString()` converts to UTC. Because `T00:00:00+08:00` is 16:00 UTC of the previous day, `dateStr` becomes `'2026-09-24'` (Thursday).
  - Meanwhile, `dayName` formats in `Asia/Makassar`, which is `'Jumat'` (Friday).
  - `dayOfWeek = d.getUTCDay()` returns 4 (Thursday).
  - When `i = 4` (`2026-09-20` Sunday in calendar), `dateStr` is `'2026-09-20'`, `dayName` is `'Senin'` (Monday), and `d.getUTCDay()` is `0` (Sunday). The condition `if (dayOfWeek === 0) continue;` **excludes Monday instead of Sunday**!
  - When `i = 5` (`2026-09-19` Saturday in calendar), `dayName` is `'Minggu'` (Sunday) and `d.getUTCDay()` is `6` (Saturday). Sunday is **NOT excluded** and is treated as a valid school day with zero attendance!
  - When checking schedules, `dayPresensi` searches `presensi_guru` matching `dateStr` (`2026-09-24` Thursday), but checks obligations against `dayName` (`Jumat` Friday). This pairs Thursday's attendance with Friday's teaching schedule.

### Observation 3: Database Query in AdminRekapView Excludes All Alpa Records
- **File**: `src/components/AdminRekapView.tsx`, lines 60-70:
  ```ts
  60: let presensiQuery = supabase
  61:   .from('presensi_guru')
  62:   .select('*')
  63:   .gte('timestamp', start)
  64:   .lte('timestamp', end)
  65:   .eq('status_verifikasi', 'Disetujui')
  66:   .order('timestamp', { ascending: true });
  ```
- In `attendanceAlpa.ts` lines 123-130, auto-alpa updates records to:
  ```ts
  status_verifikasi: 'Alpa',
  jenis_presensi: 'Alpa'
  ```
- Because `AdminRekapView.tsx` line 65 queries `.eq('status_verifikasi', 'Disetujui')`, Supabase will **never** return any record with `status_verifikasi = 'Alpa'`.
- As a consequence, lines 142-146 (`if (p.jenis_presensi === 'Alpa' || p.status_verifikasi === 'Alpa') { pMap[nama].alpaDirect++; }`) is unreachable dead code in production. Direct Alpa will always remain `0`.

### Observation 4: Historical Date Bleed in attendanceAlpa.ts
- **File**: `src/lib/attendanceAlpa.ts`, lines 64-70:
  ```ts
  64: const startOfDay = getWitaStartOfDay(evaluatedDate);
  65: const endOfDay = getWitaEndOfDay(evaluatedDate);
  66: 
  67: let query = supabase
  68:   .from('presensi_guru')
  69:   .select('*')
  70:   .or(`timestamp.gte.${startOfDay},timestamp.ilike.${evaluatedDate}%`);
  ```
- `endOfDay` is declared on line 65, but never used in the query.
- The query has no `.lte` upper bound. When evaluating a past date (e.g. `targetDateStr = '2026-09-10'`), it queries all records from September 10th to the current day.
- In line 87, records are pushed to `teacherRecordsMap` without checking `rec.timestamp`. Therefore, any attendance or approved leave submitted on a *subsequent* day (e.g., September 11th) marks `hasValidResubmission` or `hasApprovedLeave` as true for September 10th.

### Observation 5: Test Suite Integrity & Self-Certification Issue
- **File**: `tests/m2_notifications_alpa_warning.test.ts`
- 25 out of 27 test cases (F5.1-F5.8, F6.1-F6.7, F7.1, F7.4-F7.8) perform static file content string matching (e.g. `assert(alpaServiceContent.includes('currentTimeWita < cutoffTime'))`).
- These tests verify the presence of code patterns, not behavioral execution.
- Function `calculateStreak` is unit-tested in isolation (F7.2, F7.3), but `calculateStreak` is never called inside `warningSystem.ts` (which instead uses inline streak loops).
- This allowed all four aforementioned runtime defects to pass silently.

---

## 2. Logic Chain

1. **Auto-Alpa Cutoff (F6)**:
   - Observation 1 proves that `getWitaTimeStr()` produces dot-delimited time (`HH.MM`) while HTML input / DB configs produce colon-delimited time (`HH:MM`).
   - ASCII character 46 (`.`) is less than ASCII character 58 (`:`).
   - Therefore, any comparison between dot format and colon format with identical hours (e.g., `'16.30' < '16:00'`) evaluates to `true`.
   - Line 52 interprets this as "cutoff has not been reached" and returns with 0 records mutated.
   - Conclusion: The auto-alpa cutoff fails to execute automatically after cutoff time on the same day.

2. **3x Absence Warnings (F7)**:
   - Observation 2 demonstrates that formatting a WITA midnight timestamp (`T00:00:00+08:00`) with `d.toISOString()` rolls the calendar date back by 8 hours to UTC 16:00 of the previous day.
   - Conversely, `d.toLocaleDateString(..., { timeZone: 'Asia/Makassar' })` evaluates in WITA, keeping the current calendar day.
   - This creates a 1-day discrepancy between `dateStr` and `dayName`.
   - Presensi check looks for attendance on day $N-1$ while checking teaching schedule for day $N$.
   - Sunday exclusion (`d.getUTCDay() === 0`) excludes Monday in WITA while keeping Sunday.
   - Conclusion: The warning engine computes invalid absence streaks and falsely flags teachers based on mismatched schedules.

3. **Admin Rekap Alpa Aggregation (F6.7)**:
   - Observation 3 shows that `presensiQuery` filters exclusively for `status_verifikasi = 'Disetujui'`.
   - Records marked as Alpa by `attendanceAlpa.ts` have `status_verifikasi = 'Alpa'`.
   - Because of the query filter, no Alpa records are ever retrieved from Supabase into `AdminRekapView`.
   - Conclusion: The recap report will never reflect explicit Alpa records in production.

4. **Historical Query Isolation (F6)**:
   - Observation 4 shows that queries for historical dates are unbounded by `endOfDay`.
   - Attendance records from future dates leak into the evaluation for past dates.
   - Conclusion: Historical batch evaluations or retroactive triggers will incorrectly treat future attendance as valid resubmissions for past dates.

---

## 3. Caveats
- Rejection notification flow (`src/app/api/notifications/rejection/route.ts`), input sanitization, category deep links, and client dispatch wiring in `AdminVerifView.tsx` and `PiketView.tsx` are well implemented and functioning.
- The UI presentation layers in `HomeView.tsx` (warning banner) and `AdminMonitorView.tsx` (summary cards) are properly structured and ready to display warnings once the underlying calculation in `warningSystem.ts` is fixed.

---

## 4. Conclusion
**VERDICT: REQUEST_CHANGES**

Milestone 2 cannot be approved in its current state due to three critical runtime defects and one test integrity issue:
1. **Critical Defect 1 (Cutoff Invalidation)**: `attendanceAlpa.ts` time comparison compares dot-delimited time (`16.30`) with colon-delimited time (`16:00`), preventing auto-alpa from ever triggering on the cutoff hour.
2. **Critical Defect 2 (Timezone Inversion)**: `warningSystem.ts` creates a 1-day discrepancy between `dateStr` and `dayName` via `toISOString()`, pairing Thursday attendance with Friday schedule, and excluding Monday instead of Sunday.
3. **Critical Defect 3 (Dead Alpa Query in Rekap)**: `AdminRekapView.tsx` queries `.eq('status_verifikasi', 'Disetujui')`, discarding all `status_verifikasi = 'Alpa'` records before aggregation.
4. **Major Defect 4 (Historical Date Leak)**: `attendanceAlpa.ts` leaves `endOfDay` unused and does not bound the query with `.lte()`, allowing future attendance records to contaminate past date evaluations.
5. **Quality & Integrity Defect 5**: `tests/m2_notifications_alpa_warning.test.ts` relies on superficial string presence checks that masked all runtime bugs above. Functional unit/integration tests must be added.

### Required Changes:
1. In `src/lib/attendanceAlpa.ts`:
   - Normalize both `currentTimeWita` and `cutoffTime` before comparison (e.g. normalize separators: `currentTimeWita.replace('.', ':') < cutoffTime.replace('.', ':')` or parse to minutes).
   - Use `endOfDay` with `.lte('timestamp', endOfDay)` and ensure `rec.timestamp` strictly matches `evaluatedDate`.
2. In `src/lib/warningSystem.ts`:
   - Use WITA-consistent date iteration: anchor date at noon (`T12:00:00+08:00`) or use `getWitaDateStr(d)` and `getWitaDayName(d)`.
   - Check Sunday via `dayName === 'Minggu'` or WITA day of week.
   - Utilize `calculateStreak` inside the warning evaluation loops.
3. In `src/components/AdminRekapView.tsx`:
   - Update `presensiQuery` to fetch both approved attendance and Alpa records (e.g. `.in('status_verifikasi', ['Disetujui', 'Alpa'])`).
4. In `tests/m2_notifications_alpa_warning.test.ts`:
   - Replace or supplement string-matching assertions with real behavioral execution tests (e.g., test time comparison with dot vs colon, test evaluation dates timezone alignment, and test Alpa aggregation).

---

## 5. Verification Method

1. **Verify Time Comparison Fix**:
   Execute Node test:
   ```bash
   node -e "const cur = '16.30'; const cutoff = '16:00'; const normCur = cur.replace('.', ':'); console.log('Fixed comparison:', normCur < cutoff ? 'FAIL' : 'PASS');"
   ```
   Expect: `Fixed comparison: PASS`.

2. **Verify Timezone & Day Alignment in warningSystem.ts**:
   Execute Node test:
   ```bash
   node -e "
   const todayStr = '2026-09-25';
   const d = new Date(todayStr + 'T12:00:00+08:00');
   const dateStr = d.toISOString().split('T')[0];
   const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long' });
   console.log('Date:', dateStr, 'Day:', dayName);
   if (dateStr === '2026-09-25' && dayName === 'Jumat') console.log('PASS: Date and day are aligned.');
   else console.log('FAIL: Date and day are mismatched.');
   "
   ```
   Expect: `PASS: Date and day are aligned.`

3. **Verify AdminRekapView Query**:
   Inspect `src/components/AdminRekapView.tsx` line 65 to confirm that `status_verifikasi = 'Alpa'` is included in `presensiQuery`.

4. **Run Full Test Suite & Build**:
   ```bash
   npx tsx tests/m2_notifications_alpa_warning.test.ts
   npm test
   npx tsc --noEmit
   npm run build
   ```
   Expect: 100% pass and successful build.
