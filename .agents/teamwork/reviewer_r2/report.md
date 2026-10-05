# Reviewer Round 2 Adversarial QA Report: Presensi Siswa Two-Way Sync & Superadmin Removal

## Overview
- **Role:** teamwork_preview_reviewer (Round 2)
- **Scope:** `src/components/PiketView.tsx`, `src/components/SuperadminView.tsx`, `tests/adversarial_presensi_sync_reviewer_r2.test.ts`, and repository test suite.
- **Verification Status:** 26 test suites passed (106 checks passed), 0 failures. `npx tsc --noEmit` and `npm run build` (Turbopack) passed cleanly.

## Key Defects Uncovered & Resolved in Round 2

### 1. Hardware Scanner Barcode Burst Concatenation & Prepended Buffer Trap
- **Input:** Operator previously typed a student's name into the manual search input (or a prior scan left NISN in the buffer), and then a physical USB scanner emitted barcode data (`<barcode>\n` or `<barcode>\r`).
- **Expected:** The incoming scanner burst should be isolated to the scanned barcode alone and immediately processed.
- **Actual:** The incoming scanner burst concatenated with the existing input value (e.g. `Ahmad0012345`), causing scan failure ("Siswa tidak ditemukan").
- **Root Cause:** `handleUsbInputChange` and `handleManualSearchChange` stripped whitespace and newlines but did not check if the incoming burst prepended the existing buffer value before executing.
- **Fix:** Added prepended buffer isolation defense in both `handleUsbInputChange` and `handleManualSearchChange`. If `cleanVal.startsWith(bufferVal)`, the prepended buffer is stripped to isolate the exact new barcode.

### 2. Stale Closure Race Condition on Manual Input Hardware Scan
- **Input:** Hardware barcode scanner scanned into manual search input (`handleManualSearchChange`), which scheduled `setTimeout(() => handleManualFormSubmit(), 0)`.
- **Expected:** The scanned barcode query is processed immediately and deterministically.
- **Actual:** `handleManualFormSubmit` accepted no arguments and read `manualSearchQuery` from closure state, risking execution with stale closure state if React state batching had not yet flushed.
- **Root Cause:** Asynchronous state synchronization race condition between `setManualSearchQuery` and `setTimeout(() => handleManualFormSubmit(), 0)`.
- **Fix:** Enhanced `handleManualFormSubmit` to accept an optional `overrideQuery?: string` parameter. In `handleManualSearchChange`, the isolated barcode is passed directly: `handleManualFormSubmit(cleanVal)`, eliminating the asynchronous closure race.

### 3. Double-Submission / Concurrent Execution Vulnerability
- **Input:** Rapid double-click on "Proses Presensi" / "Tandai Datang" or fast double Enter keypress.
- **Expected:** Single idempotent submission to database.
- **Actual:** `handleManualFormSubmit` and `handleManualMark` had no early return guards checking `scanProcessing` or `manualMarkLoading`, allowing concurrent duplicate requests to `recordPresensiSiswa`.
- **Root Cause:** Missing top-level concurrency guards.
- **Fix:** Added `if (scanProcessing || manualMarkLoading) return;` at the beginning of both `handleManualFormSubmit` and `handleManualMark`.

### 4. Cross-Class Multi-Match Search Lockout Trap
- **Input:** Operator filters by class (e.g. 7A) and searches for a common name that matches multiple students in other classes (e.g. "Budi" in 7B and 8A).
- **Expected:** Roster reveals all matching students so the operator can select the appropriate one.
- **Actual:** `filteredManualStudents` was 0 due to class filter. The cross-school search only matched if exactly 1 match existed (`allMatches.length === 1`). With multiple matches, it fell through to DB code resolution, failed, and showed "Siswa tidak ditemukan".
- **Root Cause:** Incomplete fallback logic in `handleManualFormSubmit` for multi-match scenarios across different classes.
- **Fix:** Added `else if (allMatches.length > 1)` branch that automatically resets `manualKelasFilter` to `'Semua'` and notifies the operator to pick the student from the roster table.

### 5. Stale Feedback Card Retention on Complete Input Clearing
- **Input:** Operator backspaced all text in the manual search input (`val = ''`).
- **Expected:** Stale scan feedback card is dismissed when search query is cleared.
- **Actual:** `matchesOld` remained true for empty string (`''.includes('')`), and `val.trim() !== ''` prevented `setLastScanResult(null)` from running, leaving the old card on screen.
- **Root Cause:** Incomplete predicate in `handleUsbInputChange` and `handleManualSearchChange`.
- **Fix:** Updated predicate to `if (!matchesOld || val.trim() === '') setLastScanResult(null)`.

### 6. Explicit Text Selection on Hardware Scan Completion
- **Input:** Next scan after a successful scan.
- **Expected:** USB scanner input buffer is immediately ready for next scan without requiring manual mouse focus or backspace.
- **Actual:** While `focus()` was called, native `focus()` on an already-focused element did not dispatch a `focus` event, leaving text unselected.
- **Root Cause:** Relying solely on `onFocus` event listener for text selection.
- **Fix:** Added explicit `usbInputRef.current.select()` call right after `usbInputRef.current.focus()` in the `finally` block of `handleProcessScan`.

## Verification Record
- `npx tsx tests/adversarial_presensi_sync_reviewer_r2.test.ts`: 10/10 PASS
- `npx tsx tests/adversarial_presensi_sync_reviewer.test.ts`: 12/12 PASS
- `npx tsx tests/presensi_siswa_sync_and_superadmin.test.ts`: 11/11 PASS
- `npm test`: All 26 test suites passed (106 checks passed, 0 failures)
- `npx tsc --noEmit`: 0 TypeScript errors
- `npm run build`: Production build succeeded with Next.js 16.3.4 (Turbopack)
