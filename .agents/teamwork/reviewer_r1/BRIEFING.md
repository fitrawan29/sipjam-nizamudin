# BRIEFING — Review Round 1 (Kamera Portrait & Anti Auto-Zoom)

## Mission
Adversarial review and quality assurance for Teacher Attendance Camera (`GuruPresensi.tsx` & `CameraSelfieCapture.tsx`):
1. **R1**: Enforce portrait mode exclusively for teacher attendance.
2. **R2**: Prevent auto-zoom / auto-cropping during capture, ensuring the captured photo exactly mirrors the preview framing.

## Reviewer Identity
- Archetype: reviewer & qa
- Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1`
- Parent ID: `0d65758d-f082-4759-b6d9-3b4fb1b0f47d`
- Domain Skill: `surgical-patch`

## Requirements Traceability
- **R1 (Kamera Portrait)**:
  - `src/components/GuruPresensi.tsx`: Camera call site strictly binds `orientation="portrait"`.
  - `src/components/CameraSelfieCapture.tsx`: When `orientation === 'portrait'`, enforces `aspect-[3/4] max-w-sm mx-auto` viewport and portrait `MediaStreamConstraints` (`width: { ideal: 720, max: 1080 }`, `height: { ideal: 1280, max: 1920 }`).
- **R2 (Nonaktifkan Auto-zoom)**:
  - `src/components/CameraSelfieCapture.tsx`: `<video>` and `<img>` enforce CSS `object-contain` without `object-cover` or scaling transforms.
  - `src/lib/watermarkCanvas.ts`: Zero artificial cropping for vertical feeds (`drawWidth = width`, `drawHeight = height`, `offsetX = 0`, `offsetY = 0`), preserving 1x sensor scale.
  - Symmetrical center-crop fallback to 3:4 portrait only for horizontal desktop webcams.

## Adversarial Verification & Attack Surface
- Added `tests/reviewer_adversarial_camera.test.ts` (38 checks covering props, zero-crop math across 6 phone aspect ratios, dataUrl decoding, and watermark coordinate resilience).
- Verified `package.json` test pipeline includes all 21 test suites.
- Verified Turbopack production build and TypeScript compilation pass with 0 errors.
