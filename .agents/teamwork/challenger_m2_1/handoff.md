# Handoff Report — Milestone 2: Challenger M2.1

## 1. Observation

Adversarial stress testing was conducted against Milestone 2 features using `tests/m2_adversarial_stress.test.ts`.
Command:
```bash
npx tsx tests/m2_adversarial_stress.test.ts
```
Result summary:
```
TOTAL CHECKS: 22
PASSED: 11
FAILED: 11
TOTAL FINDINGS: 11
❌ ADVERSARIAL STRESS TEST IDENTIFIED CRITICAL/HIGH BUGS!
```

### Direct Empirical Observations:

1. **`src/lib/warningSystem.ts` lines 125-143 (Timezone & Date Window Shift)**:
   ```ts
   const todayStr = getWitaDateStr();
   const evaluationDates: { dateStr: string; dayName: string }[] = [];
   const dateObj = new Date(todayStr + 'T00:00:00+08:00');

   for (let i = 29; i >= 0; i--) {
     const d = new Date(dateObj);
     d.setDate(d.getDate() - i);
     const dateStr = d.toISOString().split('T')[0];
     const dayOfWeek = d.getUTCDay();
     const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long' });

     if (dayOfWeek === 0) continue; // Exclude Sundays
     if (hariSekolah === '5' && dayOfWeek === 6) continue;
     if (holidaySet.has(dateStr)) continue;

     evaluationDates.push({ dateStr, dayName });
   }
   ```
   - Running simulation for `todayStr = '2026-09-24'` (Thursday in WITA):
     - For `i = 0` (today), `d.toISOString()` evaluates in UTC (+00:00), yielding `2026-09-23T16:00:00.000Z`. `dateStr` is `'2026-09-23'`, shifting the entire date array by -1 day.
     - When `dayName` is `'Senin'` (Monday in WITA), in UTC it is Sunday evening. `d.getUTCDay()` returns `0` (Sunday in UTC). Line 136 `if (dayOfWeek === 0) continue;` skips every Monday school day!
     - When `dayName` is `'Minggu'` (Sunday in WITA), in UTC it is Saturday evening. `d.getUTCDay()` returns `6`. Line 136 is false, so Sunday is NOT skipped and is included as an active school day.
     - When `dayName` is `'Kamis'`, `dateStr` is `'2026-09-23'` (Wednesday). Attendance and journal queries compare Thursday class schedules against Wednesday database submissions.
   - Verbatim check failures:
     ```
     [FAIL] WS-2.1: Evaluation window for today (i=0) should yield dateStr === '2026-09-24'
     [FAIL] WS-2.2: Monday (Senin) should NOT be skipped as Sunday
     [FAIL] WS-2.3: Sunday (Minggu) SHOULD be excluded as dayOfWeek === 0
     [FAIL] WS-2.4: When dayName is 'Kamis', dateStr must match the calendar Thursday ('2026-09-24')
     ```

2. **`src/lib/attendanceAlpa.ts` line 52 (Cutoff Time String Comparison Bug)**:
   ```ts
   const currentTimeWita = getWitaTimeStr();
   ...
   const cutoffTime = configData?.value || '22:00';
   ...
   if (currentTimeWita < cutoffTime) {
     return { affectedCount: 0, details: [], ... };
   }
   ```
   - `getWitaTimeStr()` in `src/lib/wita.ts` formats time with `id-ID` locale, outputting dot separator: `"00.49"`, `"15.30"`.
   - `cutoffTime` uses colon separator: `"15:00"`.
   - In ASCII, `.` is 46, while `:` is 58.
   - Verbatim check failures:
     ```
     [FAIL] AA-1.2: Exactly at cutoff (15:00 vs 15:00) should NOT evaluate as strictly before cutoff
     [FAIL] AA-1.3: 1 min after cutoff (15:01 vs 15:00) should evaluate cutoff as reached (isBefore === false)
     [FAIL] AA-1.4: 30 min after cutoff (15:30 vs 15:00) should evaluate cutoff as reached (isBefore === false)
     ```
   - Empirical proof: `'15.01' < '15:00'` is `true`, `'15.30' < '15:00'` is `true`. Auto-alpa will refuse to execute for up to 59 minutes past the cutoff time.

3. **`src/lib/attendanceAlpa.ts` lines 67-71 & 108-114 (Unbounded Date Query & Cross-Day Protection)**:
   ```ts
   let query = supabase
     .from('presensi_guru')
     .select('*')
     .or(`timestamp.gte.${startOfDay},timestamp.ilike.${evaluatedDate}%`);
   ```
   - There is no upper bound (`.lte(endOfDay)`).
   - In line 108:
     ```ts
     const hasValidResubmission = teacherRecs.some(
       r => r.tipe_absen === 'Datang' && r.status_verifikasi !== 'Ditolak' && r.status_verifikasi !== 'Alpa'
     );
     ```
   - When evaluating a past date, attendance records on any future date are returned in `teacherRecs` and satisfy `hasValidResubmission`, permanently protecting past unresubmitted rejections from ever mutating to Alpa.
   - Verbatim check failure:
     ```
     [FAIL] AA-2.1: Evaluating past date must not consider subsequent days presence as valid resubmission
     ```

4. **`src/app/api/notifications/rejection/route.ts` lines 19-25 & 48-61 (Non-String Type Coercion Crashes)**:
   - Line 55: `const teacherName = body.teacherName.trim();`
   - Line 19: `sanitizeText(str)` calls `str.replace(...)`
   - When called with non-string types (e.g. `{ teacherName: 12345 }` or `{ rejectionReason: 99999 }`):
     ```
     [API /api/notifications/rejection] Exception: TypeError: body.teacherName.trim is not a function
         at POST (C:\Users\Fitra\OneDrive\Documents\sipjam-app\src\app\api\notifications\rejection\route.ts:55:42)
     [API /api/notifications/rejection] Exception: TypeError: str.replace is not a function
         at sanitizeText (C:\Users\Fitra\OneDrive\Documents\sipjam-app\src\app\api\notifications\rejection\route.ts:22:6)
     ```
   - Verbatim check failures:
     ```
     [FAIL] RN-1.1: Non-string teacherName (12345) should return HTTP 400 Bad Request, not HTTP 500
     [FAIL] RN-1.2: Non-string rejectionReason (99999) should return HTTP 400 Bad Request, not HTTP 500
     [FAIL] RN-1.3: Whitespace-only teacherName ("   ") should return HTTP 400 Bad Request
     ```

---

## 2. Logic Chain

1. **Warning System Breakdown (F7)**:
   - From Observation 1, creating `d` as `new Date("YYYY-MM-DDT00:00:00+08:00")` results in UTC timestamp at 16:00:00 of the preceding day.
   - Calling `d.toISOString().split('T')[0]` extracts the UTC date, shifting all evaluation dates backward by 1 calendar day.
   - Concurrently, `dayOfWeek = d.getUTCDay()` queries the day in UTC rather than Asia/Makassar. When it is Monday daytime in WITA (+8), it is Sunday in UTC, causing `d.getUTCDay()` to return 0.
   - Thus, all Mondays are dropped from teacher discipline calculations. Conversely, Sunday daytime in WITA is Saturday in UTC (`d.getUTCDay() === 6`), so Sundays are treated as required teaching days.
   - Furthermore, because `dayName` is computed in Asia/Makassar (`"Kamis"`) while `dateStr` is UTC (`"2026-09-23"` / Wednesday), teacher schedules are checked against the wrong day's attendance and journal submissions, generating false positive and false negative discipline warnings.

2. **Auto-Alpa Cutoff Delay Breakdown (F6)**:
   - From Observation 2, `getWitaTimeStr()` produces formatted strings using Indonesian regional standards (`HH.MM`).
   - Standard HTML time inputs and database values use ISO time (`HH:MM`).
   - String comparison in JavaScript evaluates lexicographically. Because ASCII `.` (46) < `:` (58), `'15.30' < '15:00'` evaluates to `true`.
   - Any scheduled or automated trigger running within the 60 minutes following the cutoff time will falsely decide the cutoff has not arrived, preventing unresubmitted rejections from being transitioned to Alpa.

3. **Historical Auto-Alpa Invalidation Breakdown (F6)**:
   - From Observation 3, omitting `timestamp.lte.${endOfDay}` allows subsequent days' attendance to bleed into the evaluation of a specific date.
   - Because `hasValidResubmission` checks all records in `teacherRecs` without asserting date equality, future presence immunizes past unresubmitted rejections from Alpa transition.

4. **Rejection Endpoint Fault Tolerance Breakdown (F5)**:
   - From Observation 4, lack of `typeof === 'string'` checks causes unhandled TypeErrors on non-string inputs, yielding HTTP 500 Internal Server Error instead of clean HTTP 400 client error responses.
   - Whitespace strings pass `!body.teacherName`, yielding empty string queries in Supabase.

---

## 3. Caveats

- Out-of-band push delivery to Apple Push Notification Service (APNs) and Google Firebase Cloud Messaging (FCM) was verified at the protocol and payload construction layer, but cannot be physically displayed on end-user hardware without active user tokens.
- All other features and logic chains have been empirically executed and reproduced locally in Node.js / Turbopack runtime.

---

## 4. Conclusion

**VERDICT: REQUEST_CHANGES**

Milestone 2 cannot be approved in its current state due to critical defects in core date, timezone, and time comparison logic.

### Required Actions for Worker:

1. **Fix `src/lib/warningSystem.ts` lines 125-143**:
   - Do NOT use UTC conversion (`d.toISOString()` and `d.getUTCDay()`) on WITA dates.
   - Instead, compute date strings and day numbers directly in WITA:
     ```ts
     // Use date arithmetic safely or format using Intl.DateTimeFormat with Asia/Makassar:
     const d = new Date();
     // Or format dateStr using:
     // new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(d)
     // And determine day of week via WITA day name or getDay() normalized to WITA.
     ```
   - Ensure Monday (Senin) is never skipped as Sunday, Sunday (Minggu) is properly excluded, and `dateStr` matches `dayName`.

2. **Fix `src/lib/attendanceAlpa.ts` lines 46-53**:
   - Normalize time separators before comparison:
     ```ts
     const normalizedCurrentTime = currentTimeWita.replace('.', ':');
     const normalizedCutoff = cutoffTime.replace('.', ':');
     if (normalizedCurrentTime < normalizedCutoff) { ... }
     ```
   - Ensure `'15:01' < '15:00'` evaluates to `false`.

3. **Fix `src/lib/attendanceAlpa.ts` lines 67-71 & 108-114**:
   - Add `.lte('timestamp', endOfDay)` to the query so records from future days are not included.
   - Ensure `hasValidResubmission` and `hasApprovedLeave` evaluate only records matching `evaluatedDate`.

4. **Fix `src/app/api/notifications/rejection/route.ts` lines 48-61**:
   - Add explicit string validation:
     ```ts
     if (
       typeof body.teacherName !== 'string' || !body.teacherName.trim() ||
       typeof body.category !== 'string' || !body.category.trim() ||
       typeof body.rejectionReason !== 'string' || !body.rejectionReason.trim()
     ) {
       return NextResponse.json({ success: false, error: 'Invalid or missing required parameters' }, { status: 400 });
     }
     ```
   - Ensure `cleanReason` is not empty after sanitization, or provide a safe fallback.

---

## 5. Verification Method

1. Run the empirical adversarial stress test suite:
   ```bash
   npx tsx tests/m2_adversarial_stress.test.ts
   ```
   **Expected when resolved**: 22/22 tests PASS, exit code 0.
2. Run standard Milestone 2 tests:
   ```bash
   npx tsx tests/m2_notifications_alpa_warning.test.ts
   ```
3. Run project test suite:
   ```bash
   npm test
   ```
4. Verify TypeScript compilation:
   ```bash
   npx tsc --noEmit
   ```
