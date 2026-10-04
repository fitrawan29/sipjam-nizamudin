# BRIEFING — Review Round 2 (Kamera Portrait & Anti Auto-Zoom)

## Mission
Adversarial review and quality assurance (Round 2) for Teacher Attendance Camera (`GuruPresensi.tsx`, `CameraSelfieCapture.tsx`, and `watermarkCanvas.ts`):
1. **R1**: Enforce portrait mode exclusively for teacher attendance.
2. **R2**: Prevent auto-zoom / auto-cropping during capture, ensuring the captured photo exactly mirrors the preview framing.

## Reviewer Identity
- Archetype: reviewer & qa
- Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r2`
- Parent ID: `0d65758d-f082-4759-b6d9-3b4fb1b0f47d`
- Domain Skill: `surgical-patch`

## Identified Defects & Hardening in Round 2
1. **Camera Retake State Desynchronization**:
   - `CameraSelfieCapture` had no callback to notify the parent when "Foto Ulang" was triggered.
   - When teacher clicked "Foto Ulang", the camera restarted its live feed, but `GuruPresensi` still held the previously confirmed file in React state and showed the green "Foto selfie siap digunakan" card. Submitting would send the old discarded photo.
   - Fixed by introducing `onRetake?: () => void` in `CameraSelfieCaptureProps` and binding `onRetake={() => { setFile(null); setPhotoPreviewUrl(null); }}` in `GuruPresensi.tsx` (as well as `GuruJurnal.tsx` and `PiketView.tsx`).
2. **WebKit Autoplay Lockup & Video Play Error Handling**:
   - When `videoRef.current.play()` rejected (e.g. Autoplay restrictions, low-power mode, iOS WebKit policy), the error was logged with `console.warn` but `setIsStreaming(true)` was never reached. The user was permanently stuck on the loading spinner with no error message and no retry buttons.
   - Fixed by explicitly setting `videoRef.current.muted = true` before `play()`, and surfacing playback failures to `setCameraError` so the user is given "Coba Lagi" and "Ganti Kamera" recovery actions.
3. **Hardware Constraint Fallback**:
   - Added support for `ConstraintNotSatisfiedError` in addition to `OverconstrainedError` during `getUserMedia` constraint negotiation.
4. **Watermark Coordinates Sanitization**:
   - Guarded GPS coordinates formatting in `watermarkCanvas.ts` with `isFinite` and `!isNaN` to prevent `Lat: NaN, Long: NaN` from rendering onto watermarked photos.

## Verification Summary
- `npx tsx tests/reviewer_adversarial_camera.test.ts`: 46/46 passed.
- `npm test`: All 21 test suites passed with 0 errors.
- `npx tsc --noEmit`: 0 TypeScript errors.
- `npm run build`: Production build cleanly succeeded with Turbopack across all 12 routes.
