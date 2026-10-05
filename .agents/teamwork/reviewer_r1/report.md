# Adversarial Reviewer Round 1 Report

## 1. What the prior attempt got wrong

### Issue 1: Scanner Input Buffer Pollution / Concatenation
- **Input:** Student A scans barcode `0012345` via USB scanner or camera, followed immediately by Student B scanning barcode `0098765`.
- **Expected:** Student A is recorded and feedback card rendered; the USB scanner input buffer is ready for Student B's scan.
- **Actual:** `setUsbInputVal(student.nisn || student.nama_siswa)` inside `handleProcessScan` and `handleManualMark` populated the hardware scanner input buffer with Student A's identity. Because hardware USB scanners emit rapid keystrokes into whichever element has focus (`usbInputRef`), Student B's scan concatenated with Student A's NISN (`00123450098765`), causing scan failure ("Siswa tidak ditemukan").
- **Root Cause:** Inappropriately populating the hardware scanner input buffer `usbInputVal` upon scan resolution or manual mark completion, coupled with missing `select()` on focus and lack of hardware carriage-return burst handling.

### Issue 2: Class Filter Lockout on Initial Load & Search
- **Input:** Operator loads Piket View and enters the name or NISN of a student in class 8B while the school has classes starting with 7A.
- **Expected:** The manual roster search finds the student, shows them in the table, and allows attendance marking.
- **Actual:** Line 670 of `PiketView.tsx` (`setManualKelasFilter(prev => prev === 'Semua' ? (uniqueKelas[0] as string) : prev)`) forcibly overrode the initial `'Semua'` state to the first class (e.g. 7A) on load. As a result, `filteredManualStudents` was restricted to 7A. The student in 8B was excluded, and `handleManualFormSubmit` failed with "Siswa tidak ditemukan".
- **Root Cause:** Legacy filter initialization code from the deprecated manual-only view remained active, restricting initial roster and search scope to the first alphabetically sorted class.

### Issue 3: Stale QR Card Not Cleared on Search Input Clear
- **Input:** Operator clicks the "X" button to clear the manual search box.
- **Expected:** Stale QR feedback card (`lastScanResult`) is dismissed along with the query.
- **Actual:** The previous student's feedback card remained displayed on screen.
- **Root Cause:** Clear button onClick only reset `setManualSearchQuery('')` and `setUsbInputVal('')` without calling `setLastScanResult(null)`.

### Issue 4: Unused Dead State Variable Left in PiketView
- **Input:** Inspection of state declarations.
- **Expected:** No unused state variables in production components.
- **Actual:** `const [modePresensiSiswa, setModePresensiSiswa] = useState<'qr' | 'manual'>('qr');` was declared at line 99 and never used.
- **Root Cause:** Incomplete cleanup during removal of `mode_presensi_siswa`.

### Issue 5: Missing Test Suites in package.json
- **Input:** Running standard `npm test`.
- **Expected:** `npm test` executes all test suites including the presensi siswa sync tests.
- **Actual:** `tests/presensi_siswa_sync_and_superadmin.test.ts` was not included in `package.json`'s `test` script.
- **Root Cause:** Omission during implementer's test script setup.

## 2. What I changed
- `src/components/PiketView.tsx`:
  - Removed dead state `modePresensiSiswa`.
  - Added hardware scanner carriage return (`\r`) and newline (`\n`) burst detection in `handleUsbInputChange` and `handleManualSearchChange` to immediately process scan bursts without trailing newlines (resolves Open Issues 1 & 2).
  - Added `onFocus={(e) => { setIsUsbInputFocused(true); e.target.select(); }}` on `usbInputRef` to prevent barcode concatenation across rapid consecutive student scans.
  - Added explicit `onKeyDown` handlers intercepting Enter / `\r` / `\n` / keyCode 13 on both USB scanner and manual search inputs.
  - Removed line forcing `manualKelasFilter` to `uniqueKelas[0]` on initial load so the roster defaults cleanly to `'Semua'`.
  - Updated `handleManualFormSubmit` to fall back to searching across all school students if filtered by class and auto-reset `manualKelasFilter` to `'Semua'`.
  - Updated `handleManualMark` to auto-reset `manualKelasFilter` to `'Semua'` so marked students remain visible in the roster table.
  - Updated search clear "X" button to dismiss `lastScanResult(null)`.
- `tests/adversarial_presensi_sync_reviewer.test.ts`:
  - Created 12-check adversarial test suite targeting hardware scanner burst resilience, focus select anti-concatenation, cross-class search integrity, stale card dismissal, and Superadmin configuration removal.
- `package.json`:
  - Added `tests/presensi_siswa_sync_and_superadmin.test.ts` and `tests/adversarial_presensi_sync_reviewer.test.ts` to `npm test`.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/adversarial_presensi_sync_reviewer.test.ts`: 12/12 passed (0 failures).
  - `npx tsx tests/presensi_siswa_sync_and_superadmin.test.ts`: 11/11 passed (0 failures).
  - `npm test`: All 25 test suites passed (96 checks passed, 0 failures).
  - `npx tsc --noEmit`: 0 TypeScript compilation errors.
  - `npm run build`: Next.js 16.3.4 (Turbopack) production build completed successfully.
- **Shallow Verification (manual only):** Verified responsive grid stacking on viewports < 640px and < 1024px.
- **Unverified aspects:** Behavior on physical legacy barcode scanners running non-standard vendor firmware drivers that intercept OS keyboard events entirely.

## 4. Known Issues
- `Minor Robustness Risk` — High-speed physical barcode scanners running in non-standard serial wedge COM emulation (rather than standard USB HID keyboard mode) require virtual COM port software bridges.

## 5. Remaining risk & next step
- Complete. All requirements (R1, R2, R3), acceptance criteria, and adversarial hardware edge cases verified.
