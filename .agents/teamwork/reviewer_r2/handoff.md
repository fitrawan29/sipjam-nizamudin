# Handoff Report — Review Round 2 (Kamera Portrait & Anti Auto-Zoom)

> [!WARNING] **Skepticism Disclaimer**
> Deep programmatic verification confirms strict portrait enforcement, CSS `object-contain` 1x uncropped scale across 6 smartphone aspect ratios, synchronized retake state clearing, and WebKit autoplay resilience; however, hardware-level camera driver variations across obscure vendor ROMs remain unverified without physical device execution.

## 1. What the prior attempt got wrong
The prior review (Round 1) verified primary constraints but left several latent defects and robustness hazards unaddressed:
1. **Camera Retake State Desynchronization**:
   - `input`: Teacher took a photo, clicked "Gunakan Foto", then clicked "Foto Ulang" within the camera component.
   - `expected`: Parent form (`GuruPresensi.tsx`) resets its confirmed `file` and `photoPreviewUrl` state so that stale/discarded photos cannot be submitted.
   - `actual`: `CameraSelfieCapture` had no callback to notify the parent on retake. `GuruPresensi` retained the old `file` object and green "Foto selfie siap digunakan" card while the live video camera streamed. Submitting would send the old discarded photo.
   - `root cause`: Missing `onRetake` prop in `CameraSelfieCaptureProps` and lack of caller hook invocation inside `handleRetake`.
2. **WebKit Autoplay Lockup & Silent Playback Rejection**:
   - `input`: Device or browser (e.g. iOS WebKit in Low Power Mode or autoplay restricted tab) rejects `videoRef.current.play()`.
   - `expected`: Browser error is surfaced to the user with a retry button and front/back toggle.
   - `actual`: The error was swallowed with `console.warn` without setting `setCameraError`. `isStreaming` remained `false`, leaving the user permanently trapped on a loading spinner with no error message and no retry buttons.
   - `root cause`: Missing error handling on `play()` promise rejection and missing explicit `videoRef.current.muted = true` DOM property assignment required by WebKit autoplay policies.
3. **Overconstrained Hardware Fallback**:
   - `input`: Single-camera devices or strict WebKit drivers throwing `ConstraintNotSatisfiedError`.
   - `expected`: Fallback to unconstrained `{ video: true, audio: false }`.
   - `actual`: Only `OverconstrainedError` was caught; `ConstraintNotSatisfiedError` propagated and aborted camera startup.
   - `root cause`: Over-specific error name check in `startCamera`.
4. **Watermark Badge GPS Coordinate Sanitization**:
   - `input`: Geolocation lookup providing non-finite or `NaN` coordinate values.
   - `expected`: Fallback to `[GPS: Lokasi Tidak Terdeteksi]`.
   - `actual`: `typeof NaN === 'number'` evaluated to `true`, rendering `Lat: NaN, Long: NaN` onto attendance proof badge.
   - `root cause`: Missing `isFinite` and `!isNaN` guard in `watermarkCanvas.ts`.

## 2. What I changed
- **`src/components/CameraSelfieCapture.tsx`**:
  - Added optional `onRetake?: () => void` to `CameraSelfieCaptureProps` and invoked `onRetake?.()` inside `handleRetake()`.
  - Added explicit `videoRef.current.muted = true;` before `play()`.
  - Handled `play()` promise rejection by catching the error, calling `setCameraError`, and resetting `isStreaming` so recovery action buttons are rendered.
  - Expanded `getUserMedia` constraint fallback to catch both `OverconstrainedError` and `ConstraintNotSatisfiedError`.
- **`src/components/GuruPresensi.tsx`**:
  - Bound `onRetake={() => { setFile(null); setPhotoPreviewUrl(null); }}` to `<CameraSelfieCapture>` to cleanly flush stale confirmed photos when a retake is initiated.
- **`src/components/GuruJurnal.tsx`** & **`src/components/PiketView.tsx`**:
  - Bound `onRetake={() => { setFile(null); setPhotoPreviewUrl(null); }}` for consistent retake hygiene across all camera interfaces.
- **`src/lib/watermarkCanvas.ts`**:
  - Hardened GPS coordinate formatting with `isFinite` and `!isNaN` guards.
- **`tests/reviewer_adversarial_camera.test.ts`**:
  - Expanded test suite from 38 to 46 adversarial checks including Section 6 covering `onRetake` lifecycle synchronization, WebKit autoplay muted property, constraint fallback, and non-finite coordinate handling.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/reviewer_adversarial_camera.test.ts`: PASSED (46/46 checks passed, 0 failures).
  - `npm test`: PASSED (all 21 test suites passed cleanly with 0 errors).
  - `npx tsc --noEmit`: PASSED (0 TypeScript compilation errors).
  - `npm run build`: PASSED (Turbopack production build compiled cleanly across all 12 routes in 2.2s).
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
- The implementation strictly adheres to R1 (kamera khusus mode portrait) and R2 (gambar tidak auto-zoom saat diambil), with full retake state synchronization and WebKit autoplay fault-tolerance.
- Next step: Physical device testing on mobile browsers (iOS Safari / Android Chrome) to perform end-to-end attendance flow with selfie capture and photo verification.
