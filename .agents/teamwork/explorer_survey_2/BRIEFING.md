# BRIEFING — 2026-10-05T10:04:45Z

## Mission
Investigate Requirement R2: QR Code Camera preview bug (camera not appearing/rendering in QR scanner) and provide root cause and step-by-step fix recipe.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2
- Original parent: 4fd5e35b-30eb-4eaa-ba5a-613af6a5d52c
- Milestone: survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Focus on Requirement R2 (Perbaikan Kamera QR Code)
- Provide exact root cause with file paths and line numbers
- Provide concrete, step-by-step fix recipe

## Current Parent
- Conversation ID: 4fd5e35b-30eb-4eaa-ba5a-613af6a5d52c
- Updated: 2026-10-05T10:04:45Z

## Investigation State
- **Explored paths**:
  - `src/components/PiketView.tsx` (camera state, lifecycle, JSX rendering, BarcodeDetector loop)
  - `src/components/CameraSelfieCapture.tsx` (reference implementation for camera streaming and constraints)
  - `src/lib/qrSiswa.ts` (QR code generation, resolution, attendance recording)
  - `tests/m3_piket_scanner_kiosk.test.ts` (test expectations and static assertions)
  - `tests/m3_adversarial_scanner_kiosk_stress.test.ts` (concurrency and edge cases)
  - `package.json` (verified absence of external scanner libraries; zero-dependency architecture)
- **Key findings**:
  1. Primary root cause: In `PiketView.tsx`, the `<video>` element is conditionally mounted inside `{cameraActive && ...}`. In `startCamera()`, `videoRef.current` is tested when `cameraActive` is still `false`, so `videoRef.current` is strictly `null`. `videoRef.current.srcObject = stream` is skipped. After `setCameraActive(true)` mounts `<video>`, no hook or callback attaches `streamRef.current` to it, leaving the video element black/blank.
  2. Secondary root cause: Strict `facingMode: 'environment'` constraints fail on devices without rear cameras (desktop webcams, laptops), triggering `OverconstrainedError` without a fallback catch.
  3. `BarcodeDetector` readiness: Frame detection loop checks `videoRef.current.readyState < 2`. Because `srcObject` is null, `readyState` stays `0`, so barcode detection never triggers.
- **Unexplored areas**: None regarding Requirement R2; full call chain and lifecycle identified.

## Key Decisions Made
- Formulated two-pronged fix: lifecycle sync (`useEffect([cameraActive])` + callback ref) and resilient media constraints (`{ ideal: 'environment' }` with fallback to `{ video: true }`).
- Retain exact method names and identifiers (`videoRef`, `startCamera`, `stopCamera`, `BarcodeDetector`) to ensure 100% compatibility with existing test suites.

## Artifact Index
- DISPATCH.md — dispatch message record
- BRIEFING.md — persistent working memory
- progress.md — liveness heartbeat
- handoff.md — self-contained 5-component handoff report
