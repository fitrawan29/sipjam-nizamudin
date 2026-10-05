## 2026-10-05T10:06:52Z
You are worker_m1.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP: Read the user request at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under ## 2026-10-05T09:55:29Z)

Also read the detailed survey explorer reports:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\handoff.md (Piket UI & State)
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md (QR Camera Fix)

File Ownership:
You have EXCLUSIVE write access to `src/components/PiketView.tsx`.
Do NOT modify `AppScreen.tsx` or other files in this milestone.

Requirements to implement in `src/components/PiketView.tsx`:
1. R1.1: Fix "Tandai Datang" auto-filter bug:
   - In `handleManualMark` (both success branch around line 592 and alreadyExists branch around line 617), remove `setManualSearchQuery(student.nama_siswa)` and `setManualKelasFilter('Semua')`.
   - Preserve `setUsbInputVal` and `setLastScanResult`, but DO NOT overwrite the user's manual search query or class filter. The student list must remain fully intact with all students visible after marking attendance.
2. R2: Fix QR Camera preview rendering:
   - Implement camera initiation mutex `isStartingCameraRef = useRef(false)`.
   - In `startCamera()`, implement resilient `MediaStreamConstraints` with `facingMode: { ideal: 'environment' }` and fallback catch to `{ video: true, audio: false }`.
   - Implement callback ref on `<video>` element in JSX to immediately bind `streamRef.current` and call `.play()`.
   - Implement `useEffect` synchronization on `cameraActive` to ensure that once the video element mounts, `videoRef.current.srcObject = streamRef.current` and `.play()` is called.
   - Update capability badge for BarcodeDetector.
3. R1.2: Differentiate Guru vs Admin UI:
   - Normalize role check:
     `const roleNormalized = (user?.role || '').toLowerCase().replace(/\s+/g, '');`
     `const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';`
     `const isGuru = roleNormalized === 'guru';`
   - For Guru (`isGuru` or `!isAdmin`):
     - Hide Kiosk Station dropdown selector (default to 'kiosk-default').
     - Show compact attendance mode toggle (pill button `Datang` | `Pulang`).
     - Render compact scanner toggle card.
     - Fast touch-friendly student roster with 1-tap "Datang" and "Pulang" buttons and status badge.
     - Inline counter badge (`Hadir Datang: X • Pulang: Y`) instead of 3 large standalone metric cards.
     - Hide the redundant 7-column raw Live Attendance Audit Log table.
   - For Admin (`isAdmin`):
     - Keep full kiosk controls (dropdown Kiosk 1–10).
     - Full 6-column student roster with override/cancel.
     - 3 large metric stat cards.
     - Full 7-column Live Attendance Audit Log table.
     - Access to `Penugasan Piket` tab.

Verification Requirements:
- Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
- Run existing regression tests: `npx tsx tests/m3_piket_scanner_kiosk.test.ts` and `npx tsx tests/presensi_siswa_sync_and_superadmin.test.ts`.
- Document all modified lines, build results, and test outputs in `handoff.md`.
