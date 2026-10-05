# Reviewer Round 3 Adversarial QA Report: Presensi Siswa Hardening & Two-Way Sync Verification

## Executive Summary
- **Role:** teamwork_preview_reviewer (Round 3)
- **Scope:** `src/components/PiketView.tsx`, `package.json`, `tests/adversarial_presensi_sync_reviewer_r3.test.ts`, and full repository test suite.
- **Verification Status:** All 27 test suites passed (118 individual automated checks passed, 0 failures). `npx tsc --noEmit` passed with 0 errors. `npm run build` compiled cleanly on Next.js 16.3.4 (Turbopack).

---

## 1. What the Prior Attempt Got Wrong

### Defect 1: Stale Error Feedback Card Locked on Input Modification / Clearing
- **Input:** Operator scans or searches for an invalid barcode / non-existent student name, resulting in a failed scan (`lastScanResult = { student: null, success: false, ... }`). Operator then starts typing a valid student's name or clears the search input (`val = ''`).
- **Expected:** The stale error card ("Siswa tidak ditemukan") should be immediately dismissed to clear the UI for the new search.
- **Actual:** The red error card remained permanently affixed on screen above the roster table.
- **Root Cause:** Both `handleUsbInputChange` and `handleManualSearchChange` guarded card dismissal strictly inside `if (lastScanResult?.student)`. When `lastScanResult.student === null`, the dismissal block was completely bypassed, preventing `setLastScanResult(null)` from running on backspace or text entry.
- **Fix:** Refactored card cancellation in both handlers to `if (lastScanResult) { if (!lastScanResult.student || val.trim() === '') setLastScanResult(null); else ... }`.

### Defect 2: Missing Student `qr_code` Attribute in Two-Way Sync and Search Roster
- **Input:** Operator inputs or scans a student's distinct `qr_code` (e.g. `QR-SISWA-001`) into the manual search input or USB input buffer.
- **Expected:** The system matches the student in memory, maintains the feedback card, and filters the student in `filteredManualStudents`.
- **Actual:** `matchesOld` and `filteredManualStudents` only checked `nama_siswa` and `nisn`, falsely treating the distinct `qr_code` as an input mismatch that cleared `lastScanResult` while showing an empty table ("Tidak ada siswa ditemukan"), forcing an unneeded database fallback query.
- **Root Cause:** Omission of `(s as any).qr_code` from matching predicates in `handleUsbInputChange`, `handleManualSearchChange`, `filteredManualStudents`, and `handleManualFormSubmit`.
- **Fix:** Added `((s as any).qr_code && (s as any).qr_code.toLowerCase().includes(val.toLowerCase()))` across all lookup and sync filters.

### Defect 3: Microtask Double-Submission Race in Asynchronous Database Fallback
- **Input:** Operator enters a student code requiring database resolution (`resolveStudentByCode`) and presses Enter in rapid succession or triggers concurrent form submit events.
- **Expected:** Single idempotent database submission; all concurrent calls during the in-flight network request are immediately blocked.
- **Actual:** While `handleManualFormSubmit` had `if (scanProcessing || manualMarkLoading) return;`, neither flag was set during the asynchronous `await resolveStudentByCode` network call (since `setManualMarkLoading` only ran inside `handleManualMark`). Furthermore, React 18/19 state updates are batched asynchronously, allowing concurrent calls in the same microtask queue to bypass the guard.
- **Root Cause:** Lack of an immediate synchronous in-memory lock during async DB code resolution and state batching delay.
- **Fix:** Added `isSubmittingPresensiRef = useRef(false)` checked and set synchronously before executing async calls in `handleProcessScan`, `handleManualFormSubmit`, and `handleManualMark`, with guaranteed release in `finally` blocks. In `handleManualFormSubmit`, `setManualMarkLoading('resolving-code')` and the mutex are engaged before invoking `resolveStudentByCode`.

### Defect 4: Missing Error and Exception Synchronization in `handleManualMark`
- **Input:** Manual presensi submission fails due to network outage or database rejection.
- **Expected:** Two-way sync updates `lastScanResult` so the feedback card reflects the failure state, identical to QR scanner behavior.
- **Actual:** `handleManualMark` showed a toast and played audio feedback, but left `lastScanResult` displaying the previous student's card or untouched.
- **Root Cause:** Missing `setLastScanResult` in `handleManualMark`'s failure and catch blocks.
- **Fix:** Added explicit `setLastScanResult` calls in `handleManualMark` when `!res.success && !res.alreadyExists` and inside `catch (err)`.

### Defect 5: Accidental Concatenation on Manual Input Re-focus
- **Input:** Operator alternates between scanning and manual typing into `manualSearchQuery`.
- **Expected:** Clicking or focusing the manual search input highlights existing text so that subsequent typing or hardware barcode burst replaces the buffer rather than appending.
- **Actual:** The manual `<input>` lacked `onFocus` text selection, allowing new keystrokes to concatenate with previous student names.
- **Root Cause:** Absence of `onFocus={(e) => e.target.select()}` on the manual search input.
- **Fix:** Added `onFocus={(e) => e.target.select()}` to the manual search input element.

### Defect 6: Cancellation Collision Vulnerability on Shared Names
- **Input:** Operator cancels a presensi record for a student who shares a name with another student in a different class.
- **Expected:** Cancellation checks student ID rather than string name alone.
- **Actual:** `handleCancelManualPresensi` checked `lastScanResult?.student?.nama_siswa === namaSiswa`.
- **Root Cause:** Comparing names without checking `studentId`.
- **Fix:** Updated `handleCancelManualPresensi` signature and roster table buttons to pass and check `s.id`.

---

## 2. What I Changed
- `src/components/PiketView.tsx`:
  - Added synchronous `isSubmittingPresensiRef` mutex lock to eliminate microtask double-submission races.
  - Hardened stale error card dismissal when `lastScanResult.student === null`.
  - Added student `qr_code` support in `matchesOld`, roster filtering, and in-memory search.
  - Synchronized error/failure results in `handleManualMark` into `lastScanResult`.
  - Added `onFocus={(e) => e.target.select()}` to manual search input.
  - Added `studentId` disambiguation to `handleCancelManualPresensi`.
- `tests/adversarial_presensi_sync_reviewer_r3.test.ts`:
  - Created 12 new adversarial test checks verifying mutex lock, error card dismissal, QR sync, and concurrency.
- `package.json`:
  - Registered `tests/adversarial_presensi_sync_reviewer_r3.test.ts` into the repository test runner.

---

## 3. Verification Record
- **Automated Tests:**
  - `npx tsx tests/adversarial_presensi_sync_reviewer_r3.test.ts`: 12/12 PASS
  - `npx tsx tests/adversarial_presensi_sync_reviewer_r2.test.ts`: 10/10 PASS
  - `npx tsx tests/adversarial_presensi_sync_reviewer.test.ts`: 12/12 PASS
  - `npx tsx tests/presensi_siswa_sync_and_superadmin.test.ts`: 11/11 PASS
  - `npm test`: All 27 test suites passed (118 checks passed, 0 failures)
- **TypeScript Typecheck:**
  - `npx tsc --noEmit`: 0 errors
- **Production Build:**
  - `npm run build`: Succeeded in 11.2s with Next.js 16.3.4 (Turbopack)
