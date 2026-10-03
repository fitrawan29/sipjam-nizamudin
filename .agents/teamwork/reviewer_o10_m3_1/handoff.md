# Review & Adversarial Critic Report — Milestone 3 (M3): PiketView Scanner UI & Laporan Piket

**Reviewer**: `reviewer_o10_m3_1` (Roles: reviewer, critic)  
**Verdict**: **APPROVE**

---

## 1. Observation

1. **Tab Navigation & Mode Toggle**:
   - In `src/components/PiketView.tsx` (lines 20, 1066-1072):
     `activeTab` includes `'scan'`, rendered in the tab navigation bar with label `"Scan QR Siswa"` and icon `fa-qrcode`.
   - In `src/components/PiketView.tsx` (lines 68, 1314-1358):
     Mode toggle switches `scanMode` between `'datang'` (`bg-emerald-600`, icon `fa-right-to-bracket`) and `'pulang'` (`bg-blue-600`, icon `fa-right-from-bracket`) with distinct visual styling.

2. **Dual Input: USB HID Hardware Scanner & Camera Scanner**:
   - In `src/components/PiketView.tsx` (lines 70, 90, 238-264, 1380-1429):
     Auto-focused `<input ref={usbInputRef} ... autoFocus />` captures keyboard-wedge USB HID barcode scanner input.
     `handleUsbInputBlur` automatically refocuses `usbInputRef.current?.focus()` after 250ms, while safely skipping focus theft when the active element is another input, select, textarea, or button (`lines 252-258`).
     `<form onSubmit={...}>` catches Enter key submissions, trims input, clears value, and triggers `handleProcessScan(code)`.
     `scanProcessing` flag disables the input and submit button during network resolution, preventing duplicate rapid scans.
   - In `src/components/PiketView.tsx` (lines 84-90, 267-350, 1431-1485):
     `startCamera()` uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })`.
     Tracks are stopped cleanly on tab change (`lines 296-300`) and unmount (`lines 302-306`).
     Frame detection loop runs every 250ms using the native `BarcodeDetector` Web API with format array `['qr_code', 'code_128', 'ean_13', 'code_39']`.
     Debounce guard `(now - lastCameraScannedRef.current.time > 3000)` prevents repeated triggers from continuous camera frames.

3. **Audio Feedback Synthesizer & Visual Preview Card**:
   - In `src/components/PiketView.tsx` (lines 98-163):
     Zero-dependency Web Audio API sound synthesizer `playAudioFeedback`:
     - Success chime: ascending sine wave from D5 (587.33 Hz) to A5 (880.00 Hz) with exponential decay.
     - Warning tone: double 440 Hz triangle wave beeps.
     - Error tone: descending 220 Hz to 140 Hz sawtooth buzzer.
     - Wrapped in `try / catch` with `ctx.resume()` to gracefully handle browser autoplay restrictions.
   - In `src/components/PiketView.tsx` (lines 1489-1589):
     Real-time visual student card showing large initial avatar badge, `nama_siswa`, `kelas`, `nisn`, formatted timestamp (`pk. HH:mm:ss WITA`), and contextual badge (Green for success Datang, Blue for success Pulang, Amber for duplicate, Red for not found).

4. **Multi-Kiosk Concurrency (10-Unit Support) & Supabase Realtime**:
   - In `src/components/PiketView.tsx` (lines 69, 165-184, 1280-1305):
     Station selector dropdown options for `kiosk-1` through `kiosk-10`.
     Station ID is saved to `localStorage` (`sipjam_piket_kiosk_id`) and sent as `deviceId` in `recordPresensiSiswa`.
   - In `src/components/PiketView.tsx` (lines 201-235):
     Supabase Realtime subscription on `presensi_siswa` channel (`postgres_changes`), filtered by `sekolah_id` to guarantee tenant isolation.
     Paired with an 8-second polling fallback interval (`setInterval(fetchTodayScanData, 8000)`) to survive intermittent WebSocket disconnection.
     Channels and interval timers are safely unmounted in cleanup.
   - In `src/lib/qrSiswa.ts` (lines 513-520):
     Handles PostgreSQL unique constraint violation error code `23505` when concurrent scans arrive at the same millisecond, returning `alreadyExists: true` without crashing.

5. **Live Attendance Log & Summary Statistics**:
   - In `src/components/PiketView.tsx` (lines 93-96, 1593-1736):
     Summary stat cards: `Total Hadir Datang`, `Total Pulang`, and `Total Unik Siswa`.
     Filter dropdown by `kelas` dynamically populated from school classes (`lines 453-455`).
     Real-time search input for `nama_siswa` and `nisn`.
     Responsive table displaying index, time (`jam`), student name, class, NISN, status badge, and kiosk station ID (`device_id`).

6. **Integrity & Build Verification**:
   - No hardcoded mocks or dummy facade implementations exist in `src/components/PiketView.tsx`.
   - Terminal command verification results:
     - `npx tsc --noEmit` exited code `0` (clean TypeScript compilation).
     - `npm test` exited code `0` (all test suites passed, including all 35 QR tests, 37 M3 Piket kiosk audit tests, and all teacher reminder tests).
     - `npm run build` exited code `0` (Turbopack production build succeeded in 1.4s with 0 errors).

---

## 2. Logic Chain

1. *Observation 1 & 2* → The scan kiosk is directly accessible in `PiketView.tsx` under the `'scan'` tab, supporting both physical USB HID scanners (with auto-focus and Enter key listeners) and camera devices without requiring any external npm libraries.
2. *Observation 2* → Focus management in `handleUsbInputBlur` respects user intent by checking `document.activeElement`. If the teacher is interacting with the class filter dropdown or search bar, focus is not stolen, preventing frustrating UI lockouts.
3. *Observation 3* → The Web Audio API provides zero-latency acoustic feedback without network requests or external audio assets, and handles browser autoplay suspensions cleanly.
4. *Observation 4* → Station tagging (`kiosk-1`..`kiosk-10`) combined with Supabase Realtime channels and an 8-second polling fallback guarantees accurate, conflict-free attendance recording across up to 10 concurrent kiosk terminals. Concurrent identical check-ins are handled safely via DB unique constraint code `23505`.
5. *Observation 5 & 6* → The live table and stat counters give piket teachers immediate feedback on today's school entrance traffic, filtered by class or searchable by student name.
6. *Integrity Audit* → Zero integrity violations detected. No dummy facade functions or hardcoded test bypasses were introduced. Build and tests pass completely.

---

## 3. Caveats

- `BarcodeDetector` Web API is natively supported in Chromium browsers (Google Chrome, Microsoft Edge, Chrome for Android). In desktop Safari or Firefox, optical camera scanning depends on browser flag activation; however, physical USB HID scanners (the primary school gate kiosk hardware) operate reliably across all browsers.
- Web Audio sound generation requires at least one initial user interaction (such as switching tabs, clicking mode, or scanning) to unlock browser audio autoplay policies.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 3 (M3) meets all functional and non-functional requirements with high engineering quality:
- Complete Scan tab navigation and mode toggling (`Datang` vs `Pulang`).
- Dual input architecture: USB HID auto-focus/Enter listener + Camera stream with native `BarcodeDetector`.
- Immediate Web Audio tones and student preview feedback card.
- 10-station multi-kiosk concurrency with Supabase Realtime and polling fallback.
- Real-time attendance log table and summary statistics.
- Strict multi-tenant isolation by `sekolah_id`.
- Zero TypeScript errors, all unit/integration tests passing, and clean production build.

---

## 5. Verification Method

To independently verify the implementation:
1. `npx tsc --noEmit` — passes with 0 errors.
2. `npx tsx tests/m3_piket_scanner_kiosk.test.ts` — verifies all 37/37 assertions covering static code properties and 10-unit concurrent kiosk simulations.
3. `npm test` — all test suites pass.
4. `npm run build` — Turbopack production build succeeds.
5. Inspect `src/components/PiketView.tsx` lines 1066-1072 (tab button) and lines 1265-1738 (kiosk scanner interface).
