# Handoff Report — Reviewer R3

> [!WARNING] **Skepticism Disclaimer**
> High confidence in the core business rules (R1: Pulang Cepat & R2: Tidak Masuk Kelas auto-record), multi-tenant isolation, user_id collision guards, ISO date sanitization, and UI warning state harmonization across both Teacher and Admin dashboards.

## 1. What the prior attempt got wrong

1. **Teacher Identity Collision in `evaluateAndApplyAutoCheckout` on Multi-Teacher Matches**
   - **Input:** Teacher 1 (`user_id = 'usr-1'`, `nama_guru = 'Budi Santoso'`) only checked in; Teacher 2 (`user_id = 'usr-2'`, `nama_guru = 'Budi Handoko'`) checked in and checked out.
   - **Expected:** Teacher 1 is evaluated independently and flagged as `Pulang Cepat`.
   - **Actual:** `teacherGroups.find` in `attendanceAlpa.ts` fell back to `matchTeacherTokens` even when both records had distinct non-null user IDs! Teacher 1 was merged into Teacher 2's group, inheriting Teacher 2's `Pulang` record and escaping `Pulang Cepat` detection!
   - **Root Cause:** In `src/lib/attendanceAlpa.ts`, `teacherGroups` checked `if (recUid && item.user_id && recUid === String(item.user_id).trim()) return true;` but then continued to `matchTeacherTokens` when `recUid !== item.user_id`, allowing token overlap between different teachers with distinct user accounts.
   - **Same Root Cause:** Present in `isTeacherScheduleMatch` and `isTeacherJournalMatch`, where distinct user IDs fell through to name token matching.

2. **`Invalid Date` and Missing Schedules on ISO Timestamp `targetDateStr` Input**
   - **Input:** Invoking `evaluateAndApplyAutoCheckout('2026-10-30T00:00:00.000Z')` or passing an ISO timestamp via cron/webhook.
   - **Expected:** System parses date as `'2026-10-30'` and queries schedules for `'Jumat'`.
   - **Actual:** `getDayNameFromDate` appended `'T12:00:00+08:00'` to the ISO string, creating an invalid date string. `getDay()` returned `NaN`, `days[NaN]` became `undefined`, and `jadwal_pelajaran` queried for `hari = undefined`, finding 0 schedules. No empty schedules were recognized, causing `Pulang Cepat` to never trigger!
   - **Root Cause:** Lack of `normalizeDateStr` to sanitize ISO timestamps into clean `YYYY-MM-DD` strings before querying database fields (`tanggal`, `hari`) and date math.

3. **False Positive "Semua Tugas Selesai" & Normal Departure Step in `HomeViewGuru.tsx`**
   - **Input:** Teacher is penalized with `Pulang Cepat` after ditching classes.
   - **Expected:** Teacher dashboard alerts the teacher of their `Pulang Cepat` status and marks unfulfilled schedules as `Tidak Masuk Kelas`.
   - **Actual:**
     1. `getNextAction()` displayed: `"Semua tugas hari ini sudah selesai. Terima kasih!"` in bright green!
     2. Step 4 (Presensi Pulang) marked status `'done'` with detail `"Pulang · 14:00 WITA"`.
   - **Root Cause:** `HomeViewGuru.tsx` checked only `if (dailyState.presensiPulang)` without verifying if `status_verifikasi` / `jenis_presensi` was `Pulang Cepat`.

4. **`unsubmittedJurnal` False-Negative in `AdminVerifView.tsx`**
   - **Input:** Admin inspects the Jurnal tab using filter `taskFilter = 'Belum'` (Guru Belum Menyelesaikan) after auto-checkout generated "Tidak Masuk Kelas" records.
   - **Expected:** Teachers who did not submit their teaching journals still appear in the unsubmitted list.
   - **Actual:** The teacher disappeared because `submittedList` counted auto-generated "Tidak Masuk Kelas" records as valid teacher submissions!
   - **Root Cause:** `AdminVerifView.tsx` `unsubmittedJurnal` did not exclude `j.status_verifikasi === 'Tidak Masuk Kelas'` and `j.keterangan === 'Tidak Masuk Kelas'`.

5. **Cutoff Time String Normalization & Missing Schema Fallback on Journal Insert**
   - **Input:** `pengaturan` stores `jam_pulang_akhir` with seconds (e.g. `"14:00:00"`).
   - **Expected:** Formatted cutoff timestamp generated as `"${evaluatedDate}T14:00:00+08:00"`.
   - **Actual:** Cutoff timestamp became `"${evaluatedDate}T14:00:00:00+08:00"`, invalid ISO format causing Supabase insert to throw an error.
   - **Root Cause:** Unsanitized string length when formatting cutoff timestamps.

## 2. What I changed

- `src/lib/attendanceAlpa.ts`:
  - Added and exported `normalizeDateStr(dateStr?: string)` to guarantee clean `YYYY-MM-DD` extraction from ISO strings or whitespace-padded inputs.
  - Sanitized `getDayNameFromDate` and `evaluateAndApplyAutoAlpa` / `evaluateAndApplyAutoCheckout` to use `normalizeDateStr`.
  - Hardened `isTeacherScheduleMatch` and `isTeacherJournalMatch` to strictly return `false` when both records have non-null, distinct `user_id`s, preventing token mismatch.
  - Hardened `teacherGroups` consolidation in `evaluateAndApplyAutoCheckout` so records with different user IDs are never merged.
  - Sanitized `formattedCutoff` timestamp string length to prevent `":00:00:00"` malformed timestamps.
  - Added `kegiatan_pembelajaran`, `catatan_refleksi`, and schema cache error retry fallback to `jurnal_pembelajaran` insert.
- `src/lib/workflow.ts`:
  - Added `isPulangCepat?: boolean;` to `GuruDailyState` interface.
  - Set `state.isPulangCepat = true` when `presensiPulang` is `Pulang Cepat`.
- `src/components/HomeViewGuru.tsx`:
  - Updated `getWorkflowSteps()` to show `⚠️ Pulang Cepat · ${timeOnly} WITA` for departure step and `⚠️ Tidak Masuk Kelas (${total - filled} jam pelajaran)` for KBM journal step.
  - Updated `getNextAction()` to display amber/orange warning `'⚠️ Anda tercatat Pulang Cepat karena tidak mengisi jurnal kegiatan dan tidak melakukan presensi pulang.'` instead of green "Semua tugas selesai".
- `src/components/AdminVerifView.tsx`:
  - Excluded `Tidak Masuk Kelas` records from `submittedList` in `unsubmittedJurnal` so teachers with unfulfilled classes remain visible in `taskFilter === 'Belum'`.
  - Added `item.jenis_presensi === 'Pulang Cepat'` check to status badge styling.
- `tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`:
  - Added Section 7 with 5 automated tests for ISO date sanitization, strict distinct user_id mismatch rejection, teacher group consolidation isolation, teacher dashboard warning state, and admin verif unsubmitted journal filtering (Total: 30/30 tests passing).

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - Ran `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: 30/30 passed (100%).
  - Ran `npm test`: all 42 automated test suites in repository passed (100% across whole app, 0 failures).
  - Ran `npm run build`: Next.js 16.3.4 Turbopack production build compiled cleanly in 6.9s, TypeScript checks passed in 20.5s, 13/13 static pages generated successfully with 0 errors.
- **Shallow Verification (manual only):**
  - None.
- **Unverified aspects:**
  - Real-time mobile push notifications for Pulang Cepat (external push service).

## 4. Known Issues

- `Minor Robustness Risk`: If a school alters schedule periods midway through the day after the cutoff has already executed, existing "Tidak Masuk Kelas" records remain in the database unless edited or deleted by the school admin.

## 5. Remaining risk & next step

- All core functional requirements (R1, R2) and edge cases across teacher identity consolidation, user_id collision guards, ISO date parsing, dashboard warning states, and unsubmitted filters are verified with 100% test pass rate.
- Ready to commit and push to main branch according to project git rules.
