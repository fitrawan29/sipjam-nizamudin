# Handoff Report: Reviewer R3 (Review Round 3)

> [!WARNING] **Skepticism Disclaimer**
> High confidence based on 56 automated adversarial assertions verifying portrait orientation, CSS `object-contain` 1x uncropped scale across 6 smartphone aspect ratios, unmount leak immunity, hardware camera track release on play failure, GPS request lifecycle isolation, and clean compilation; hardware sensor peculiarities on obscure OEM vendor ROMs remain unverified without physical mobile execution.

## 1. What the prior attempt got wrong
While Round 2 successfully synchronized retake callbacks and WebKit autoplay `muted` attributes, several latent robustness defects were uncovered during adversarial stress testing:
1. **Unmount State Leaks & Hardware Camera Sensor Leaks on Play Failure**:
   - `input`: Component unmounts while `videoRef.current.play()` is resolving or rejecting, or browser rejects `play()` due to background tab autoplay policies.
   - `expected`: Browser cancels gracefully, stops all hardware media tracks, clears `streamRef.current` and `videoRef.current.srcObject`, and avoids invoking React state setters on unmounted components.
   - `actual`: If `play()` was rejected, media tracks were never stopped (`stream.getTracks().forEach(...)` was omitted), leaving the hardware camera sensor and privacy LED active in the background. Furthermore, `setIsStreaming` and `setCameraError` were invoked without verifying `isMountedRef.current`, producing React memory leak warnings.
   - `root cause`: Missing `isMountedRef` check and missing `stream.getTracks().forEach(t => t.stop())` inside `play()` resolution and rejection paths.
2. **GPS Request Triggering on Captured Photo Preview**:
   - `input`: Teacher took a photo, transitioning `capturedImage` from `null` to `dataUrl`.
   - `expected`: The confirmed photo preview displays the acquired GPS location without re-triggering geolocation lookup.
   - `actual`: The primary lifecycle effect included `[capturedImage]` in its dependency array and called `requestLocation()` indiscriminately, causing `setGpsStatus('Mencari sinyal GPS...')` to flash over the confirmed photo preview.
   - `root cause`: `requestLocation()` was invoked unconditionally outside `if (!capturedImage)`.
3. **Concurrent Multi-Click Capture & Confirmation Race Conditions**:
   - `input`: User rapidly double-clicked the capture button or "Gunakan Foto" confirmation button on mobile touchscreens.
   - `expected`: Exactly one photo capture and one confirmation callback are executed.
   - `actual`: `handleCapturePhoto` did not check `capturedImage || isStartingRef.current`, and `handleConfirmPhoto` had no in-flight guard, allowing duplicated submissions.
   - `root cause`: Lack of synchronous state/ref checks guarding rapid multi-tap user actions.
4. **Non-Finite (`Infinity`) Coordinate Vulnerability in Reverse Geocoding**:
   - `input`: `reverseGeocodeNominatim(Infinity, 115.2)` invoked with non-finite numeric coordinate.
   - `expected`: Returns `'[Lokasi Tidak Terdeteksi]'`.
   - `actual`: `typeof Infinity === 'number'` and `!isNaN(Infinity)` evaluated to `true`, querying `/api/geocode?lat=Infinity&lon=115.2` and displaying `[GPS: Infinity, 115.2000]`.
   - `root cause`: Missing `!isFinite(lat) || !isFinite(lon)` guards in `reverseGeocodeNominatim`.

## 2. What I changed
- **`src/components/CameraSelfieCapture.tsx`**:
  - Hardened `startCamera`: added unmount and active-session validation after `videoRef.current.play()`; explicitly stopped tracks and cleared video references upon `play()` rejection.
  - Added unmount guards to outer camera error handler to prevent state mutations on unmounted instances.
  - Isolated `requestLocation()` to `if (!capturedImage)` to avoid GPS searching status flash during photo review.
  - Added `isConfirmingRef` and guarded `handleCapturePhoto` and `handleConfirmPhoto` against rapid multi-clicks.
- **`src/lib/watermarkCanvas.ts`**:
  - Enhanced `reverseGeocodeNominatim` with `!isFinite(lat) || !isFinite(lon)` checks to safely reject non-finite coordinates.
- **`tests/reviewer_adversarial_camera.test.ts`**:
  - Expanded test suite from 46 to 56 checks, adding Sections 7, 8, 9, and 10 to enforce hardware track release, concurrent click debouncing, non-finite coordinate handling, and GPS lifecycle isolation.
- **Documentation**:
  - Created `.agents/teamwork/reviewer_r3/BRIEFING.md`, `progress.md`, and `handoff.md`.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/reviewer_adversarial_camera.test.ts`: PASSED (56/56 checks passed, 0 failures).
  - `npm test`: PASSED (all 21 test suites passed cleanly with 0 errors).
  - `npx tsc --noEmit`: PASSED (0 TypeScript compilation errors).
  - `npm run build`: PASSED (Next.js Turbopack production build compiled cleanly across all 12 routes in 2.2s).
- **Shallow Verification (manual only):**
  - Inspected CSS styling on `<video>` and `<img>` elements for `object-contain`, `w-full`, and `h-full`.
  - Verified dark backdrop letterbox/pillarbox container framing (`aspect-[3/4] max-w-sm mx-auto`).
- **Unverified aspects:**
  - Physical mobile smartphone cameras running OEM custom camera drivers (e.g., Samsung Camera, Xiaomi MIUI Camera, iOS WebKit AVFoundation).
  - Operating system level digital/optical zoom toggles activated outside the browser DOM.

## 4. Known Issues
- `Minor Robustness Risk` — Desktop 16:9 horizontal webcams are center-cropped to 3:4 in portrait mode to ensure presensi photos conform to upright vertical dimensions.
- `Shallow Verification` — Viewfinder letterboxing on ultra-narrow viewports (< 320px width).

## 5. Remaining risk & next step
- The implementation strictly satisfies R1 (portrait orientation) and R2 (anti auto-zoom uncropped 1x scale), with robust teardown, unmount leak immunity, and state synchronization.
- Next step: Physical device acceptance testing on mobile browsers (iOS Safari / Android Chrome) for live selfie presensi submission.
