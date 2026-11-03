# Adversarial Review & QA Handoff: Retensi Logika Presensi Gerbang & Absensi (R1 - R4)

## 1. What the Prior Attempt Got Wrong

### Issue 1: Boundary & Suffix Vulnerability in Time Comparison Logic
- **Input:** Boundary time strings with timezone or format suffixes (e.g. `currentTimeStr = '08:00 WITA'` against `cutoffTime = '08:00'`, or departure `current = '12:00 WITA'` against `pulangEnd = '12:00'`).
- **Expected:** `isIntervensiAllowed('08:00', '08:00 WITA')` returns `true`; `isPiketPulangAllowed('11:00', '12:00 WITA')` returns `allowed: true`.
- **Actual:** Returned `false`!
- **Root Cause:** In `src/lib/presensiIntervensi.ts`, local naive `normalize` functions only ran `parts = t.replace('.', ':').split(':')` and `(parts[1] || '0').padStart(2, '0')`. When `t` contained `'08:00 WITA'`, `parts[1]` was `'00 WITA'`. In JavaScript lexical comparison, `'08:00 WITA' <= '08:00'` evaluates to `false` because `' '` (ASCII 32) > `''` (empty string). Similarly, dot formats with seconds (e.g. `'08.00.00'`) were only replaced on the first dot, creating malformed strings like `'08:00.00'`.

### Issue 2: Rich Time Formatting Ignored in `addMinutesToTime`
- **Input:** `addMinutesToTime('11:00 WITA', 60)` or `addMinutesToTime('11.30', 45)`.
- **Expected:** Returns `'12:00'` and `'12:15'`.
- **Actual:** Did not leverage the centralized `formatPresensiTime` normalization helper, leading to vulnerability on non-standard time representations.
- **Root Cause:** Isolated parsing with naive single-dot replacement.

### Issue 3: Potential CSV RFC 4180 Invalidation in `exportGerbangCsv`
- **Input:** Student with double quotes in name (e.g. `Aditya "Adi" Pratama`).
- **Expected:** Valid RFC 4180 CSV escaping: `"Aditya ""Adi"" Pratama"`.
- **Actual:** Produced unescaped internal double quotes: `"Aditya "Adi" Pratama"`.
- **Root Cause:** Direct interpolation `"${s.nama_siswa}"` without `.replace(/"/g, '""')`.

---

## 2. What I Changed

1. **`src/lib/presensiIntervensi.ts`:**
   - Imported `formatPresensiTime` from `@/lib/wita`.
   - Introduced unified `normalizeTime(t: string): string` that delegates directly to `formatPresensiTime(t)` and falls back safely to clean `HH:mm` format.
   - Refactored `isIntervensiAllowed`, `isPiketPulangAllowed`, and `isWaliKelasIntervensiAllowed` to use `normalizeTime`.
   - Hardened `addMinutesToTime` to parse rich time inputs via `formatPresensiTime`.

2. **`src/components/RekapSiswaView.tsx`:**
   - Sanitized student names in `exportGerbangCsv` using `(s.nama_siswa || '').replace(/"/g, '""')` to guarantee RFC 4180 compliance.

3. **`tests/presensi_gerbang_dan_absensi_retensi.test.ts`:**
   - Added adversarial test `R1.5`: Probes boundary conditions with suffix 'WITA', dot notation ('08.00.00'), seconds, and 12-hour AM/PM formats across `isIntervensiAllowed`, `isPiketPulangAllowed`, `isWaliKelasIntervensiAllowed`, and `addMinutesToTime`.
   - Added adversarial test `R2.5`: Probes student identification by ID (no NISN), trimmed whitespace NISN (`" 0012345678 "`), case-insensitive name matching, and absentee-only KBM journals.
   - Added adversarial test `R2.6`: Probes complex teaching hour strings in `findLastKbmJournal` ("Jam 7-8", "Jam ke-9", numeric 10).
   - Added adversarial test `R3.3`: Confirms quote escaping in `exportGerbangCsv`.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/presensi_gerbang_dan_absensi_retensi.test.ts`: 17 / 17 passed (100%).
  - `npx tsx tests/presensi_gerbang_jam_datang_pulang.test.ts`: 17 / 17 passed (100%).
  - `npx tsc --noEmit`: 0 errors.
  - `npm run build`: Production build and SSG generation succeeded without errors.
  - `npm test`: All 48 test suites in repository passed cleanly.

- **Shallow Verification (manual only):**
  - Static review of mobile touch card layout in `PiketView.tsx` and PDF GPS signatures in `RekapSiswaView.tsx`.

- **Unverified aspects:**
  - Physical USB HID scanner latency on specific microcontroller kiosk hardware (hardware-dependent).
  - GSM carrier routing for WhatsApp delivery to parent phones outside application control.

---

## 4. Known Issues
- `Minor Robustness Risk`: None remaining in core business logic. Multi-format time parsing, gate intervention windows, homeroom intervention windows, truant status logic, dynamic fallback, and CSV/print utilities are fully hardened and verified.

---

## 5. Remaining Risk & Next Step
The task is complete. All requirements R1-R4 and acceptance criteria are thoroughly verified, hardened against adversarial edge cases, and protected by automated regression test suites.
