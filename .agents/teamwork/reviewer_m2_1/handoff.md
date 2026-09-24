# Review & Adversarial Critic Report — Milestone 2 (Worker M2.2)

**Reviewer**: Reviewer M2.1 (reviewer & adversarial critic)  
**Assigned Scope**: Milestone 2 Review (F5: Rejection Notifications, F6: Auto-Alpa Cutoff, F7: 3x Absence Warning Feature)  
**Verdict**: **REQUEST_CHANGES**  
**Overall Risk Assessment**: **CRITICAL**

---

## 1. Review Summary

While the worker successfully implemented the core API routes, push notifications, UI banners, and achieved a clean TypeScript build (`npx tsc --noEmit` code 0) and passing AST string tests (`tests/m2_notifications_alpa_warning.test.ts`), critical runtime defects and an integrity issue were uncovered during adversarial inspection:
1. **Critical Finding 1 (INTEGRITY VIOLATION)**: Facade / Self-Certifying Test Suite in `tests/m2_notifications_alpa_warning.test.ts` (25 of 27 assertions are substring presence checks that masked severe runtime logic defects).
2. **Critical Finding 2**: Fatal Timezone Skew & Date Inversion in `src/lib/warningSystem.ts` (UTC `d.toISOString()` shifts dates by -1 day against WITA `dayName`, skipping Monday instead of Sunday, and comparing Thursday's teaching schedule against Wednesday's attendance records).
3. **Critical Finding 3**: Logic Contradiction in `src/components/AdminRekapView.tsx` (Query filters `.eq('status_verifikasi', 'Disetujui')`, completely dropping all records mutated to `status_verifikasi = 'Alpa'`, making explicit Alpa aggregation dead code).
4. **Major Finding 4**: Unbounded Date Query in `src/lib/attendanceAlpa.ts` (Missing `.lte(endOfDay)` causes past evaluation runs to pull subsequent days' attendance).

---

## 2. Findings

### [Critical] Finding 1 — Tagged INTEGRITY VIOLATION: Self-Certifying & Facade Tests in `tests/m2_notifications_alpa_warning.test.ts`
- **What**: 25 out of 27 tests in the Milestone 2 test suite verify only source file string inclusions (`rekapContent.includes(...)`, `warningServiceContent.includes('dayOfWeek === 0')`) rather than executing runtime functional logic.
- **Where**: `tests/m2_notifications_alpa_warning.test.ts`, lines 65–241.
- **Why**: This facade testing provided false confidence and certified 100% pass rate ("27/27 PASSED"), while completely masking that:
  - `AdminRekapView.tsx` drops all Alpa records at the database level.
  - `warningSystem.ts` contains a 1-day timezone offset that inverts weekends and days of the week.
- **Suggestion**: Replace string pattern checks with behavioral simulation tests that instantiate the date logic and check the SQL filter constraints.

---

### [Critical] Finding 2: Timezone Skew & Date Inversion in `warningSystem.ts`
- **What**: Mixing UTC date conversion (`d.toISOString().split('T')[0]`, `d.getUTCDay()`) with WITA locale conversion (`d.toLocaleDateString(..., { timeZone: 'Asia/Makassar', weekday: 'long' })`) causes a 1-day date skew.
- **Where**: `src/lib/warningSystem.ts`, lines 128–143:
  ```ts
  const d = new Date(dateObj);
  d.setDate(d.getDate() - i);
  const dateStr = d.toISOString().split('T')[0];
  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long' });

  // Exclude Sundays
  if (dayOfWeek === 0) continue;
  ```
- **Why**: 
  - In WITA (UTC+8), midnight `00:00:00+08:00` on Sunday corresponds to Saturday `16:00:00Z` in UTC.
  - `d.getUTCDay()` evaluates to `6` (Saturday) for Sunday morning, so `dayOfWeek === 0` is FALSE, and Sunday is **NOT** skipped! As teachers do not work on Sunday, every teacher is falsely marked absent on Sunday.
  - Conversely, midnight on Monday corresponds to Sunday `16:00:00Z` in UTC. `d.getUTCDay()` evaluates to `0` (Sunday), so Monday (an active school day) **IS SKIPPED**!
  - Furthermore, `dateStr` is `2026-09-23` while `dayName` is `'Kamis'` (`2026-09-24`). The engine checks Thursday's teaching schedule against Wednesday's attendance records.
- **Suggestion**: Use `getWitaDateStr(d)` and `getWitaDayName(d)` from `@/lib/wita`. Filter Sundays via `dayName === 'Minggu'`.

---

### [Critical] Finding 3: Database Filter Drops Auto-Alpa in `AdminRekapView.tsx`
- **What**: `AdminRekapView.tsx` filters `presensiQuery` by `.eq('status_verifikasi', 'Disetujui')`.
- **Where**: `src/components/AdminRekapView.tsx`, lines 60–70:
  ```ts
  let presensiQuery = supabase
    .from('presensi_guru')
    .select('*')
    .gte('timestamp', start)
    .lte('timestamp', end)
    .eq('status_verifikasi', 'Disetujui')
    .order('timestamp', { ascending: true });
  ```
- **Why**: Auto-Alpa records in `presensi_guru` have `status_verifikasi = 'Alpa'` (set by `attendanceAlpa.ts`). Because the query only selects `'Disetujui'`, Supabase filters out all Alpa records before they reach the frontend. Lines 142–147 aggregating `p.status_verifikasi === 'Alpa'` into `pMap[nama].alpaDirect` will never execute for auto-alpa records.
- **Suggestion**: Change `.eq('status_verifikasi', 'Disetujui')` to `.in('status_verifikasi', ['Disetujui', 'Alpa'])`.

---

### [Major] Finding 4: Unbounded Date Query in `attendanceAlpa.ts`
- **What**: In `src/lib/attendanceAlpa.ts`, the query uses `.or(\`timestamp.gte.${startOfDay},timestamp.ilike.${evaluatedDate}%\`)` without an upper bound (`.lte(endOfDay)`).
- **Where**: `src/lib/attendanceAlpa.ts`, lines 67–76 and 87–95.
- **Why**: If evaluating a historical date, the query pulls all records from that date through the present day. Because `presensiRecords` are grouped into `teacherRecordsMap` without checking if `rec.timestamp` belongs to `evaluatedDate`, actions or approved leaves on subsequent days corrupt the evaluation for `evaluatedDate`.
- **Suggestion**: Constrain query with `.lte('timestamp', endOfDay)` or filter `rec.timestamp.startsWith(evaluatedDate)` when populating `teacherRecordsMap`.

---

## 3. Adversarial Challenges & Stress-Test Results

| # | Scenario / Assumption | Expected Behavior | Actual Behavior | Result |
|---|----------------------|-------------------|-----------------|--------|
| 1 | Teacher has no attendance on Sunday | Sunday excluded from evaluation window | `d.getUTCDay()` returns 6 (UTC Saturday) for Sunday morning; Sunday is evaluated as unexcused absence | **FAIL** |
| 2 | Teacher teaches on Monday | Monday evaluated for journal & presensi | `d.getUTCDay()` returns 0 (UTC Sunday) for Monday morning; Monday is skipped entirely | **FAIL** |
| 3 | Teacher teaches on Thursday and logs journals on Thursday | Thursday's journal matched with Thursday's schedule | `dateStr` is Wednesday while `dayName` is Thursday; teacher gets warning for missing journal | **FAIL** |
| 4 | Auto-Alpa runs and sets record to `status_verifikasi = 'Alpa'` | `AdminRekapView` fetches record and increments `alpaDirect` | Supabase query filters `.eq('status_verifikasi', 'Disetujui')`; record is dropped, `alpaDirect` remains 0 | **FAIL** |
| 5 | Web Push notification dispatched to teacher | Push sent via `vapid.ts`, clean in-app chat created, 410 cleaned up | Works as intended with multi-tenant filtering and HTML stripping | **PASS** |
| 6 | Streak calculation for consecutive absence | Array `[true, true, true, false]` yields streak 3 | Correctly bounded by `calculateStreak` | **PASS** |

---

## 4. 5-Component Handoff Protocol

### 1. Observation
- **Test execution**:
  `npx tsx tests/m2_notifications_alpa_warning.test.ts` completed with 27 passed, 0 failed.
- **Node verification of date window logic** in `warningSystem.ts`:
  ```bash
  node -e "
  const todayStr = '2026-09-24';
  const dateObj = new Date(todayStr + 'T00:00:00+08:00');
  const evaluationDates = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getUTCDay();
    const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long' });
    evaluationDates.push({ i, dateStr, dayOfWeek, dayName });
  }
  console.log(evaluationDates);
  "
  ```
  Verbatim output:
  ```json
  [
    { "i": 4, "dateStr": "2026-09-19", "dayOfWeek": 6, "dayName": "Minggu" },
    { "i": 3, "dateStr": "2026-09-20", "dayOfWeek": 0, "dayName": "Senin" },
    { "i": 2, "dateStr": "2026-09-21", "dayOfWeek": 1, "dayName": "Selasa" },
    { "i": 1, "dateStr": "2026-09-22", "dayOfWeek": 2, "dayName": "Rabu" },
    { "i": 0, "dateStr": "2026-09-23", "dayOfWeek": 3, "dayName": "Kamis" }
  ]
  ```
- **AdminRekapView query inspection**:
  In `src/components/AdminRekapView.tsx`, line 65:
  `.eq('status_verifikasi', 'Disetujui')`

### 2. Logic Chain
1. `warningSystem.ts` defines `dateObj` as `todayStr + 'T00:00:00+08:00'`.
2. Subtracting days in UTC+8 and calling `.toISOString().split('T')[0]` shifts the date back 8 hours into UTC, resulting in yesterday's date string.
3. Concurrently, `dayName` uses Makassar timezone (today's day name).
4. `d.getUTCDay()` returns Sunday's UTC day (Saturday = 6) and Monday's UTC day (Sunday = 0).
5. Therefore, `if (dayOfWeek === 0) continue;` skips Monday instead of Sunday.
6. In `AdminRekapView.tsx`, query filter `.eq('status_verifikasi', 'Disetujui')` discards `status_verifikasi = 'Alpa'`. Hence, explicit Alpa can never be loaded.
7. The tests in `tests/m2_notifications_alpa_warning.test.ts` checked only string inclusions and thus concealed these bugs.

### 3. Caveats
- No caveats regarding the findings. Code inspection and node runtime execution conclusively prove both defects.

### 4. Conclusion
Milestone 2 cannot be approved in its current state. The verdict is **REQUEST_CHANGES**. The worker must fix the timezone calculation in `src/lib/warningSystem.ts`, adjust the query in `src/components/AdminRekapView.tsx`, bound the query in `src/lib/attendanceAlpa.ts`, and update `tests/m2_notifications_alpa_warning.test.ts` to include behavioral assertions.

### 5. Verification Method
1. Re-run node verification script on `warningSystem.ts` date calculation after fixing to ensure:
   - Sunday is skipped (`dayName === 'Minggu'`).
   - Monday is included.
   - `dateStr` aligns with `dayName`.
2. Inspect `src/components/AdminRekapView.tsx` line 65 to ensure `.in('status_verifikasi', ['Disetujui', 'Alpa'])` is used.
3. Run `npx tsx tests/m2_notifications_alpa_warning.test.ts` and `npx tsc --noEmit`.
