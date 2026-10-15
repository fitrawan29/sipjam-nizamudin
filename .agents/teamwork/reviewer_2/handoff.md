# Adversarial Review Report: Mobile QR Fallback & Presensi Datang (Round 2)

**Reviewer:** Adversarial Reviewer (Round 2)  
**Date:** 2026-10-15  
**Integrity Mode:** Development  

---

> [!WARNING] **Skepticism Disclaimer**  
> Empirical test suites (28/28 passed), multi-tenant security assertions, and Turbopack production builds pass 100%. However, hardware camera sensor optical focus speeds under low-light or dirty camera lens conditions on real physical smartphones remain dependent on user environment and device optics.

---

## 1. Summary of Findings & Modifications

### 1.1 What the Prior Attempt Got Wrong / Left Unaddressed

1. **Unmanaged Hardware AudioContext Leaks & Browser Limit Lockout on Mobile Safari**
   - **Input:** Teacher scans 7 or more student QR cards sequentially via mobile browser.
   - **Expected:** Audio feedback plays reliably on all scans without audio degradation or browser exceptions.
   - **Actual:** Prior implementation instantiated a brand new `new AudioContext()` on every single scan invocation without ever closing or reusing it. iOS Safari enforces a strict limit of 4-6 concurrent active AudioContexts per page. After the 6th student scan, Safari threw `DOMException` or permanently silenced Web Audio playback. Furthermore, audio context creation inside the asynchronous scan detection loop lacked user gesture priming, leading to silent playback on iOS Safari autoplay policy.
   - **Root Cause:** In `PiketView.tsx`, `playAudioFeedback` lacked an instance lifecycle cache (`audioCtxRef`) and lacked gesture priming on initial camera activation.

2. **Unhandled Camera Track Ending & App Switch Interruption (Incoming Calls / Multitasking)**
   - **Input:** Teacher scans student cards using mobile browser, then minimizes browser or receives an incoming phone call, or camera is preempted by the OS.
   - **Expected:** The application recognizes the track termination, cleans up dead stream references, resets `cameraActive` to false, and provides a clear 1-tap reopening message rather than freezing.
   - **Actual:** `MediaStreamTrack.onended` was not listened to. The video element froze on the last frame, `cameraActive` remained `true`, and jsQR continued processing frozen/dead frames in an infinite 250ms loop. The teacher was left staring at a frozen black box with no indication of why scanning halted.
   - **Root Cause:** In `PiketView.tsx`, `startCamera` did not attach `onended` listeners to media tracks, and lacked `visibilitychange` resumption logic for backgrounded/foregrounded video streams.

3. **Multi-Tenant School Isolation Leak on Missing Teacher Context**
   - **Input:** A teacher account without an assigned `sekolah_id` (or scanned code belonging to an adjacent school) executes QR scanning.
   - **Expected:** Scanning strictly rejects student resolution and presensi recording across different school tenants, protecting multi-tenant boundary integrity.
   - **Actual:** Prior `handleProcessScan` did not validate `user?.sekolah_id` before invoking `resolveStudentByCode` and did not verify that `student.sekolah_id` matches `user.sekolah_id`.
   - **Root Cause:** In `PiketView.tsx`, `handleProcessScan` relied purely on `resolveStudentByCode` fallback behavior, which could resolve students across arbitrary schools if `sekolah_id` was falsy.

4. **Small-Screen Viewport Clipping on Smartphones (320px - 428px)**
   - **Input:** Teacher opens QR camera in portrait mode on an iPhone SE or standard smartphone (320px - 390px width).
   - **Expected:** Viewport accommodates both scanning reticle and capability status badge comfortably without vertical clipping.
   - **Actual:** Camera container used rigid 16:9 `aspect-video` (height ~162px on 320px width), while the scanner reticle was fixed at `w-44 h-44` (176px). The reticle was taller than the video container itself and overlapped the bottom status banner.
   - **Root Cause:** Hardcoded CSS dimensions without portrait-friendly aspect ratio (`aspect-[4/3] sm:aspect-video`) or bounded reticle constraints (`max-w-[75%] max-h-[75%]`).

5. **Date-Dependent Test Flakiness in `m3_adversarial_scanner_kiosk_stress.test.ts`**
   - **Input:** Running test suite on dates other than `2026-10-04`.
   - **Expected:** All 30 checks pass deterministically.
   - **Actual:** Check 25 failed because `crossRecord` omitted an explicit `tanggal`, defaulting to current day `getLocalTodayDate()` and resulting in 21 records instead of 22 for `2026-10-04`.
   - **Root Cause:** Missing `tanggal: '2026-10-04'` in test harness payload.

---

## 2. What I Changed

1. **`src/components/PiketView.tsx`**
   - **Cached AudioContext with Lifecycle & Priming:** Introduced `audioCtxRef` and `getAudioContext()` helper. Reuses single audio context across all student scans, safely handles `suspended`/`closed` states, primes context on user gesture in `startCamera()`, and closes context on unmount.
   - **Camera Interruption & Lifecycle Resilience:**
     - Attached `track.onended` listeners on all stream tracks to cleanly reset `cameraActive(false)`, null `videoRef.current.srcObject`, and display informative error guidance.
     - Added `visibilitychange` listener to resume paused video streams upon app foregrounding or notify user if tracks were terminated while backgrounded.
     - Added `video.paused` detection in 250ms interval loop to automatically call `videoRef.current.play()` if paused by browser power management.
   - **Multi-Tenant School Isolation Enforcement:** Added guards in `handleProcessScan`: verifies `user?.sekolah_id` exists and asserts `student.sekolah_id === user.sekolah_id`, rejecting cross-school scans with error audio chime and Indonesian feedback.
   - **Mobile UI Viewport Optimization:**
     - Changed video container to `aspect-[4/3] sm:aspect-video` in both Guru and Admin views.
     - Constrained reticle to responsive dimensions (`w-36 h-36 xs:w-40 xs:h-40 sm:w-48 sm:h-48 max-w-[75%] max-h-[75%]`) so it never overflows small screen heights.

2. **`tests/mobile_qr_fallback_piket.test.ts`**
   - Added contract assertions for camera track interruption handling, Web Audio context caching & gesture priming, multi-tenant isolation, and small-screen viewport responsiveness.
   - Added behavioral checks Step 6 (multi-tenant boundary rejection) and Step 7 (missing `sekolah_id` rejection). Total checks increased from 20 to 26 (100% PASS).

3. **`tests/m3_adversarial_scanner_kiosk_stress.test.ts`**
   - Added explicit `tanggal: '2026-10-04'` to `crossRecord` call to eliminate date-dependent flakiness (30/30 checks PASS).

---

## 3. Verification Record

### Deep Verification (Ran Actual Tests & Commands)

1. **`npx tsx tests/qrSiswa.test.ts`**
   - Result: `PASS (35/35 checks passed)`
   - Assertions: Format bits (0x77c4), tenant isolation, student resolution, datang check-in, duplicate datang rejection.

2. **`npx tsx tests/m3_piket_scanner_kiosk.test.ts`**
   - Result: `PASS (37/37 checks passed)`
   - Assertions: Dual input (USB & camera), Web Audio API feedback, visual feedback card, multi-kiosk concurrency.

3. **`npx tsx tests/mobile_qr_fallback_piket.test.ts`**
   - Result: `PASS (26/26 checks passed)`
   - Assertions: Mobile contracts, jsQR synthetic decoding, rapid consecutive student attendance flow, duplicate rejection, concurrency guards, camera interruption recovery, audio context caching, multi-tenant boundary checks.

4. **`npx tsx tests/challenger_m1_camera_qr_lifecycle.test.ts`**
   - Result: `PASS (18/18 checks passed)`
   - Assertions: Concurrency mutex stress test (10 calls), mount race oracle, debounce oracle, fallback constraints.

5. **`npx tsx tests/r2_camera_piket_reviewer.test.ts`**
   - Result: `PASS (15/15 checks passed)`
   - Assertions: playsinline, webkit-playsinline, track cleanup, readyState >= 2 guard.

6. **`npx tsx tests/m3_adversarial_scanner_kiosk_stress.test.ts`**
   - Result: `PASS (30/30 checks passed)`
   - Assertions: Malformed input defense, tenant boundaries, 20-kiosk concurrency, race condition idempotency.

7. **`npx tsx tests/forensic_auditor_m1_integrity.test.ts`**
   - Result: `PASS (20/20 checks passed)`
   - Assertions: Genuine attendance marking, no mocks/facades, two-way sync, camera MediaStream lifecycle.

8. **`npm test` (Full Repository Test Suite - 28 Test Suites)**
   - Result: `PASS (All 28 sequential test suites passed 100%)`

9. **`npm run build`**
   - Result: `PASS (Compiled successfully in 2.7s via Turbopack, TypeScript verified in 3.4s, 12 static/dynamic routes generated)`

---

## 4. Known Issues

- `Shallow Verification` — Extreme physical optical glare on cracked/dirty smartphone lenses or dark outdoor environments cannot be completely simulated in automated headless canvas rasterization.
- `Minor Robustness Risk` — If a teacher's smartphone is set to hardware physical mute switch (iPhone silent switch), Web Audio API sound synthesis will be muted by the OS unless unmuted by the physical switch (visual feedback card provides full redundant visual confirmation).

---

## 5. Remaining Risk & Next Step

All mobile scanner edge cases, audio context leak vulnerabilities, camera interruption lifecycles, and multi-tenant security boundaries have been resolved and verified with 100% passing tests and production Turbopack builds.
The task is complete and ready for production deployment.
