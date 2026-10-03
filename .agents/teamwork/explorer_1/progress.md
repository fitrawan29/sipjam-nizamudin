# Progress — Explorer 1

- Status: In Progress — Completed deep dive analysis of CameraSelfieCapture and watermarkCanvas
- Last visited: 2026-10-03T05:36:00Z
- Completed:
  - Audited `src/components/CameraSelfieCapture.tsx` (constraints, `<video>` CSS styling, container classes, mirroring, lifecycle, session handling).
  - Audited `src/lib/watermarkCanvas.ts` (canvas sizing, crop math, `drawImage` parameters, mirror transforms, watermark badge drawing).
  - Audited callers: `GuruPresensi.tsx` (portrait), `GuruJurnal.tsx` (landscape), `PiketView.tsx` (landscape).
  - Uncovered the exact root cause of the artificial zoom/crop issue: `drawWatermarkedCanvas` forced `targetRatio = 3/4` (portrait) and `16/9` (landscape), discarding 25% to 58% of sensor pixels even when streams were already in target orientation!
  - Analyzed interaction between CSS `object-contain` and `<canvas>` frame drawing.
  - Formulated the exact anti-zoom 1x scale solution and orientation adaptation rules.
  - Examined test suite impacts (`tests/camera_orientation.test.ts`, `tests/camera_zoom_fix.test.ts`, `tests/m10_r2_r3.test.ts`).
- Next: Author comprehensive `report.md` and `handoff.md`.
