## 2026-09-17T10:44:38Z

You are worker_m3_selfie, a specialized frontend and media implementation worker.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3_selfie

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md before starting work.
Also read PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md and survey reports at:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r1r2\handoff.md

FILE WRITE OWNERSHIP:
You exclusively own:
- src/components/CameraSelfieCapture.tsx (New component)
- src/lib/watermarkCanvas.ts (New utility)
- src/components/GuruPresensi.tsx (Teacher attendance UI)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

YOUR MISSION (Milestone 3 - Teacher Selfie Attendance & Watermark):
1. Create `src/lib/watermarkCanvas.ts`:
   - Function `drawWatermarkedCanvas(videoElement: HTMLVideoElement, options: { timestamp: string, coordinates: { latitude: number, longitude: number } | null, dateText: string }): string (base64 data URL)`
   - Takes video frame and draws onto an HTML5 `<canvas>`.
   - Renders a semi-transparent dark pill/badge at bottom-center of canvas.
   - Draws clear, high-contrast white text inside badge:
     - Top line: Date in Indonesian format (e.g. `Kamis, 17 September 2026`)
     - Middle line: Coordinates (e.g. `Lat: -8.123456, Long: 115.123456` or accurate GPS coords)
     - Bottom line: WITA time (e.g. `10:45:00 WITA`)
   - Fully client-side processing without server dependency.
2. Create `src/components/CameraSelfieCapture.tsx`:
   - Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })` to start live camera stream in a `<video>` element.
   - Live geolocation tracking via `navigator.geolocation.getCurrentPosition`.
   - Visual capture trigger button.
   - Upon capture, draws to canvas using `drawWatermarkedCanvas` and displays image preview.
   - Offers "Foto Ulang" (Retake) and "Gunakan Foto" (Save/Confirm) buttons.
   - Graceful camera stop (stopping all tracks) on unmount or when photo is confirmed.
   - Fallback handling if camera or GPS permission is denied with clear user guidance.
3. Update `src/components/GuruPresensi.tsx`:
   - For `tipeAbsen === 'Datang'` and for `jenisPresensi === 'Dinas Luar'`, replace static file input with `CameraSelfieCapture`.
   - Non-blocking Asynchronous GAS Upload:
     - Do NOT block form submission waiting for `uploadToDrive` to complete.
     - Immediately insert the `presensi_guru` record with status, timestamp, location.
     - Fire `uploadToDrive` asynchronously in background; when finished, update `presensi_guru.link_bukti` in Supabase.
     - Show instant UI feedback / SweetAlert success.
   - Pulang options for Dinas Luar:
     - When doing presensi Pulang, if teacher checked in as Dinas Luar (`dailyState?.isDinasLuar` is true), do NOT freeze dropdown with `disabled={tipeAbsen === 'Pulang'}`. Allow teacher to choose between "Di Sekolah" and "Dinas Luar".
4. Verify TypeScript (`npx tsc --noEmit`).
5. Execute Git workflow (commit & push per GEMINI.md), write `handoff.md`, and message orchestrator_9.
