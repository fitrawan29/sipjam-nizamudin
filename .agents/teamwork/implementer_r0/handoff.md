# Handoff Report: Kamera Portrait & Anti Auto-Zoom Guru Presensi

> [!WARNING] **Skepticism Disclaimer**
> High confidence in the orientation prop enforcement, CSS object-contain anti-zoom, canvas zero-crop logic, and automated test suite; however, hardware-level auto-focus/zoom mechanisms and device camera driver aspect ratio behaviors on physical OEM Android/iOS devices require real device validation.

## 1. What I changed
- Verified and validated `src/components/GuruPresensi.tsx`: Camera invocation strictly passes `orientation="portrait"` to `CameraSelfieCapture`.
- Verified and validated `src/components/CameraSelfieCapture.tsx`:
  - `MediaStreamConstraints` requests portrait dimensions (`width: 720, height: 1280`) when `orientation === 'portrait'`.
  - Viewfinder container applies `aspect-[3/4] max-w-sm mx-auto` for portrait orientation.
  - Video element (`<video>`) and captured preview image (`<img>`) enforce CSS `object-contain` (eliminating `object-cover` auto-cropping and unwanted zoom).
  - Forwards `orientation` prop to `drawWatermarkedCanvas`.
- Verified and validated `src/lib/watermarkCanvas.ts`:
  - `drawWatermarkedCanvas` accepts `orientation?: 'portrait' | 'landscape'`.
  - For portrait orientation on vertical mobile streams (`width < height`), retains uncropped 1x sensor scale (`drawWidth = width`, `drawHeight = height`, `offsetX = 0`, `offsetY = 0`) to prevent artificial zoom or crop.
  - For desktop landscape webcams in portrait mode, crops to centered 3:4 aspect ratio.

## 2. Why
- **R1 (Kamera Portrait)**: Teachers taking attendance require an upright portrait framing tailored to smartphone mobile usage and facial selfie identification.
- **R2 (Nonaktifkan Auto-zoom)**: Previously, camera streams using `object-cover` or artificial crop cut off up to 25%-58% of the video frame, making users appear zoomed in. Switching to `object-contain` with 1x uncropped canvas drawing ensures the captured photo matches the live preview exactly with zero crop distortion.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/camera_orientation.test.ts`: All 10 sections passed (33 assertions). Verified portrait orientation constraints, `GuruPresensi` props, and canvas aspect ratio scaling.
  - `npx tsx tests/camera_zoom_fix.test.ts`: All 8 sections passed (35 assertions). Mathematically verified 0% crop and 0% distortion across 4:3, 16:9, 9:16, 1:1, 19.5:9, 21:9, and 5:4 sensor feeds.
  - `npx tsx tests/adversarial_camera_badge_challenger_1.test.ts`: All 314 adversarial tests passed (0 failures).
  - `npm test`: Full 20-file test suite passed cleanly (100% pass rate).
  - `npx tsc --noEmit`: Exited with code 0 (0 type errors).
  - `npm run build`: Next.js 16.3.4 Turbopack production build succeeded with 0 errors across 12 routes.
- **Shallow Verification (manual run only):**
  - Inspected DOM attribute hardening (`playsInline`, `autoPlay`, `muted`, absence of static pixel width/height).
  - Checked letterboxing/pillarboxing styling in dark background viewport.
- **Unverified aspects:**
  - Physical camera hardware on actual mobile phones running various OEM camera drivers (e.g., Samsung One UI, Xiaomi MIUI, iOS Safari).
  - Camera sensors with proprietary hardware digital zoom enabled at the OS/firmware level.

## 4. Known Issues
- `Minor Robustness Risk` — If a user uses a desktop webcam (typically fixed landscape 16:9) for portrait presensi, `drawWatermarkedCanvas` centers and crops the horizontal feed to 3:4 vertical orientation. This is intentional to ensure the resulting attendance card is portrait.
- `Shallow Verification` — Exact appearance of letterboxing on very narrow physical mobile screens (< 320px width).

## 5. Untested Edge Cases & Next Step
- Reviewer should test on a physical mobile device: open Guru Presensi, verify the camera opens in portrait mode, take a selfie, and verify that the preview image matches the live viewfinder framing without unexpected magnification or cropping.
