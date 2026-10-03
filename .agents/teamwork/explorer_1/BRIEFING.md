# BRIEFING — 2026-10-03T05:37:00Z

## Mission
Investigate R1: Camera Anti-Zoom and Accurate Orientation in CameraSelfieCapture.tsx (video constraints, canvas capture, CSS styling, aspect ratio, orientation, 1x scale without artificial cropping/zoom).

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Explorer 1 (Investigation & Synthesis)
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_1
- Original parent: 7e84420a-2cde-4423-8413-5104d66482dd
- Milestone: Investigation R1 (Camera Anti-Zoom & Orientation)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Produce comprehensive report at .agents/teamwork/explorer_1/report.md and handoff.md
- Keep heartbeat via progress.md
- Follow Git Workflow Rule when modifying files (only in explorer_1 workspace)

## Current Parent
- Conversation ID: 7e84420a-2cde-4423-8413-5104d66482dd
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/components/CameraSelfieCapture.tsx`
  - `src/lib/watermarkCanvas.ts`
  - `src/components/GuruPresensi.tsx`
  - `src/components/GuruJurnal.tsx`
  - `src/components/PiketView.tsx`
  - `tests/camera_orientation.test.ts`
  - `tests/camera_zoom_fix.test.ts`
  - `tests/m10_r2_r3.test.ts`
  - `tests/m7_comprehensive_e2e.test.ts`
- **Key findings**:
  - The root cause of the artificial camera zoom/crop is in `src/lib/watermarkCanvas.ts` line 145: `const targetRatio = isPortrait ? (3 / 4) : (16 / 9);` which artificially crops camera streams using `offsetX` and `offsetY` in `ctx.drawImage()`.
  - When a smartphone streams portrait 9:16 (720x1280), `drawWatermarkedCanvas` crops it to 3:4 (720x960), throwing away 320px (25% vertical crop, 1.33x digital zoom) and cutting off forehead/chin.
  - Previous commit `2cf4a66` set `<video>` and `<img>` CSS to `object-contain`, so the live preview is uncropped 1x, but the canvas capture was STILL artificially cropped, causing an abrupt jump/zoom upon taking the photo.
  - In `src/components/CameraSelfieCapture.tsx`, constraints already configure height > width for portrait (`width: { ideal: 720, max: 1080 }`, `height: { ideal: 1280, max: 1920 }`) and width > height for landscape.
  - The solution: In `drawWatermarkedCanvas`, when the incoming stream orientation already matches the requested orientation (`height > width` for portrait, or `width >= height` for landscape), do NOT crop (`drawWidth = width, drawHeight = height, offsetX = 0, offsetY = 0`). Only crop when an orientation mismatch occurs (e.g. desktop webcam in portrait mode).
  - Test alignment: `tests/camera_orientation.test.ts` has old assertions hardcoding `targetRatio 3/4` and `16/9`; updating `watermarkCanvas.ts` will require updating these assertions to verify 1x uncropped scale in portrait.
- **Unexplored areas**:
  - None for R1; ready to synthesize full report.

## Key Decisions Made
- Confirmed that "rasio kamera 1:1 tanpa zoom" denotes 1x scale without artificial cropping/zoom (skala 1x), as confirmed by the Acceptance Criteria requiring vertical dimension (`tinggi > lebar`) without artificial cropping.

## Artifact Index
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_1\DISPATCH.md` — Task dispatch instructions
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_1\BRIEFING.md` — Situational awareness state
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_1\progress.md` — Liveness heartbeat
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_1\report.md` — Detailed investigation report
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_1\handoff.md` — 5-component handoff report
