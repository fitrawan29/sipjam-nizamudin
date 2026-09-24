# Handoff Report — Milestone 2: Challenger M2 (Iteration 2)

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Observation 1: Automated Test Results
- **Standard M2 Test Suite**: Ran `npx tsx tests/m2_notifications_alpa_warning.test.ts`.
  ```
  TOTAL TESTS: 27
  PASSED: 27
  FAILED: 0
  🎉 ALL MILESTONE 2 TESTS PASSED!
  ```
- **Typecheck & Production Build**:
  - `npx tsc --noEmit` exited with code 0 (zero errors).
  - `npm run build` compiled successfully via Next.js Turbopack with static generation for all routes.
- **Empirical Baseline Suite**: Ran `npx tsx tests/challenger_m2_empirical.test.ts`.
  ```
  TOTAL CHECKS: 16
  PASSED: 16
  FAILED: 0
  🎉 ALL 16 EMPIRICAL CHALLENGER CHECKS PASSED SUCCESSFULLY!
  ```

### Observation 2: Adversarial Stress Test Execution (`npx tsx tests/m2_adversarial_stress.test.ts`)
Ran `npx tsx tests/m2_adversarial_stress.test.ts` (exited with code 1):
```
================================================================
TOTAL CHECKS: 22
PASSED: 11
FAILED: 11
TOTAL FINDINGS: 11
================================================================

[CRITICAL] WS-2.1: Evaluation window for today (i=0) should yield dateStr === '2026-09-24'
   -> dateStr for today is '2026-09-23' instead of '2026-09-24' because d.toISOString() formats in UTC (16:00 previous day). This causes a 1-day date shift across all evaluations.

[CRITICAL] WS-2.2: Monday (Senin) should NOT be skipped as Sunday
   -> Monday (Senin) is skipped because d.getUTCDay() evaluates to 0 (Sunday in UTC), causing warningSystem to skip every Monday school day.

[CRITICAL] WS-2.3: Sunday (Minggu) SHOULD be excluded as dayOfWeek === 0
   -> Sunday (Minggu) has d.getUTCDay() === 6 (Saturday in UTC). As a result, Sunday is NOT skipped by 'dayOfWeek === 0' and is treated as an active school day.

[CRITICAL] WS-2.4: When dayName is 'Kamis', dateStr must match the calendar Thursday ('2026-09-24')
   -> When dayName is 'Kamis', dateStr is '2026-09-23'. Attendance/journal queries search for Wednesday records against Thursday schedules.

[HIGH] AA-1.2: Exactly at cutoff (15:00 vs 15:00) should NOT evaluate as strictly before cutoff
   -> '15.00' < '15:00' evaluates to TRUE in JavaScript because '.' (ASCII 46) < ':' (ASCII 58). Auto-alpa will refuse to run at cutoff time.

[HIGH] AA-1.3: 1 min after cutoff (15:01 vs 15:00) should evaluate cutoff as reached (isBefore === false)
   -> '15.01' < '15:00' evaluates to TRUE in JavaScript. Auto-alpa fails to trigger 1 minute after cutoff.

[HIGH] AA-1.4: 30 min after cutoff (15:30 vs 15:00) should evaluate cutoff as reached (isBefore === false)
   -> '15.30' < '15:00' evaluates to TRUE in JavaScript. For the entire hour following cutoff, auto-alpa fails to execute.

[MEDIUM] AA-2.1: Evaluating past date must not consider subsequent days presence as valid resubmission
   -> Because attendanceAlpa query has no upper bound (lte endOfDay), presence on subsequent days (rec-2) causes hasValidResubmission to be true for past rejected records (rec-1).

[MEDIUM] RN-1.1: Non-string teacherName (12345) should return HTTP 400 Bad Request, not HTTP 500
   -> Endpoint returned HTTP 500. Body validation does not verify typeof teacherName === 'string', crashing with TypeError: body.teacherName.trim is not a function.

[MEDIUM] RN-1.2: Non-string rejectionReason (99999) should return HTTP 400 Bad Request, not HTTP 500
   -> Endpoint returned HTTP 500. sanitizeText(str) calls str.replace without string type check, resulting in TypeError and HTTP 500.

[LOW] RN-1.3: Whitespace-only teacherName ("   ") should return HTTP 400 Bad Request
   -> Endpoint returned HTTP 200. Check '!body.teacherName' allows whitespace string, passing empty string to Supabase queries.
```

### Observation 3: Exact Code Inspection
1. **`src/lib/warningSystem.ts` (lines 125-133)**:
   ```ts
   const dateObj = new Date(todayStr + 'T00:00:00+08:00');
   for (let i = 29; i >= 0; i--) {
     const d = new Date(dateObj);
     d.setDate(d.getDate() - i);
     const dateStr = d.toISOString().split('T')[0];
     const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
     const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long' });
     if (dayOfWeek === 0) continue;
   ```
2. **`src/lib/attendanceAlpa.ts` (lines 38, 46, 52)**:
   ```ts
   const currentTimeWita = getWitaTimeStr(); // produces "HH.MM" with '.' from id-ID locale
   const cutoffTime = configData?.value || '22:00'; // formatted with ':'
   if (currentTimeWita < cutoffTime) { // '.' (ASCII 46) < ':' (ASCII 58), so '15.30' < '15:00' evaluates to TRUE
   ```
3. **`src/lib/attendanceAlpa.ts` (lines 67-71)**:
   ```ts
   let query = supabase
     .from('presensi_guru')
     .select('*')
     .or(`timestamp.gte.${startOfDay},timestamp.ilike.${evaluatedDate}%`);
   // Missing: .lte('timestamp', endOfDay)
   ```
4. **`src/app/api/notifications/rejection/route.ts` (lines 48, 55, 57)**:
   ```ts
   if (!body.teacherName || !body.category || !body.rejectionReason) { ... }
   const teacherName = body.teacherName.trim(); // throws if not a string
   const cleanReason = sanitizeText(body.rejectionReason); // calls str.replace(), throws if not a string
   ```

---

## 2. Logic Chain

1. **Warning System UTC/WITA Desynchronization (Observation 2 & 3.1)**:
   - `dateObj` is initialized with `T00:00:00+08:00`. At midnight in WITA, the UTC timestamp is 16:00:00 on the *previous* calendar day.
   - Calling `d.toISOString()` outputs UTC representation, shifting the date backwards by 1 calendar day (`dateStr` is yesterday).
   - Calling `d.getUTCDay()` returns the UTC day of week, which is 1 day behind WITA day of week.
   - For an Indonesian Monday, UTC is Sunday, so `dayOfWeek === 0` evaluates to true, causing the algorithm to skip every Monday.
   - For an Indonesian Sunday, UTC is Saturday, so `dayOfWeek === 6`, causing Sunday to be treated as an active school day.
   - In addition, `dayName` (e.g. "Kamis") does not match `dateStr` (e.g. Wednesday). Thus, Thursday's teaching schedule is queried against Wednesday's attendance records.

2. **Auto-Alpa Cutoff Premature Abort (Observation 2 & 3.2)**:
   - `getWitaTimeStr()` in `src/lib/wita.ts` formats time using `id-ID` locale, producing a dot separator (`.`), e.g., `'15.30'`.
   - `cutoffTime` is configured using standard colon separator (`:`), e.g., `'15:00'`.
   - In ASCII, `.` is 46 and `:` is 58.
   - Comparing `'15.30' < '15:00'` evaluates to `true`.
   - As a result, for the entire hour following cutoff time, `evaluateAndApplyAutoAlpa` wrongly concludes that the cutoff time has not been reached and exits early with 0 affected records.

3. **Auto-Alpa Historical Bounding Defect (Observation 2 & 3.3)**:
   - `attendanceAlpa.ts` queries `timestamp.gte.${startOfDay}` without an upper bound `.lte('timestamp', endOfDay)`.
   - When evaluating a past date, all records created on subsequent dates are included in the result.
   - A teacher who attends school on subsequent days satisfies `hasValidResubmission`, falsely protecting their past unresubmitted rejection from being marked as Alpa.

4. **Rejection Route Type Safety & Validation (Observation 2 & 3.4)**:
   - Passing non-string types for `teacherName` or `rejectionReason` results in an uncaught `TypeError` (`trim is not a function`, `str.replace is not a function`), returning HTTP 500 rather than HTTP 400.
   - Passing whitespace-only strings (`"   "`) bypasses the falsy check and queries Supabase with blank strings.

---

## 3. Caveats

- End-to-end receipt of Web Push on real physical iOS/Safari devices depends on user interaction granting Notification permission and APNs delivery; in-app notifications and Web Push payload formatting are verified locally.
- UI components `AdminRekapView.tsx`, `HomeView.tsx`, and `AdminMonitorView.tsx` render without runtime errors or crashes.
- The 27 unit tests in `tests/m2_notifications_alpa_warning.test.ts` pass, but they relied on idealized assumptions and missed these real-world timezone and formatting edge cases.

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

Milestone 2 cannot be approved in its current state. While the UI and architecture are largely in place, 4 Critical and High severity bugs severely compromise core operational requirements:
1. **`src/lib/warningSystem.ts`**: Must evaluate `dateStr` and `dayOfWeek` in WITA local time (e.g. using `getWitaDateStr(d)` and `d.toLocaleDateString('en-US', { timeZone: 'Asia/Makassar', weekday: 'short' })` or `id-ID`) rather than `d.toISOString()` and `d.getUTCDay()`.
2. **`src/lib/attendanceAlpa.ts`**: Must normalize both `currentTimeWita` and `cutoffTime` before comparison (e.g., `.replace('.', ':')` on `currentTimeWita`), or compare numerical minutes.
3. **`src/lib/attendanceAlpa.ts`**: Must add upper bound `.lte('timestamp', endOfDay)` to the attendance query so subsequent day attendance does not leak into historical evaluation.
4. **`src/app/api/notifications/rejection/route.ts`**: Must validate that `typeof body.teacherName === 'string'` and `typeof body.rejectionReason === 'string'` with `.trim().length > 0`, returning HTTP 400 if invalid.

---

## 5. Verification Method

1. Run the adversarial stress test suite to reproduce all 11 failures:
   ```bash
   npx tsx tests/m2_adversarial_stress.test.ts
   ```
   **Expected before fix**: 11 failures (exits with code 1).
   **Expected after fix**: 22/22 checks PASS (exits with code 0).

2. Run the empirical challenger test suite:
   ```bash
   npx tsx tests/challenger_m2_empirical.test.ts
   ```

3. Run the standard test suite:
   ```bash
   npx tsx tests/m2_notifications_alpa_warning.test.ts
   ```

4. Run typecheck:
   ```bash
   npx tsc --noEmit
   ```
