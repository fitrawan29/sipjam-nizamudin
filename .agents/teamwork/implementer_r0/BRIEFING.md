# Implementer R0 Briefing

## Task Overview
Guru presensi: kamera khusus mode portrait, gambar tidak auto-zoom saat diambil.
Integrity mode: benchmark.

## Requirements
- **R1. Kamera Portrait**: Pastikan kamera hanya menggunakan mode portrait saat guru melakukan presensi.
- **R2. Nonaktifkan Auto-zoom**: Pastikan gambar yang diambil tidak mengalami auto-zoom secara otomatis.

## Key Files & Implementation
1. `src/components/CameraSelfieCapture.tsx`:
   - Enforces `orientation?: 'portrait' | 'landscape'`.
   - Portrait video constraints (`width: 720, height: 1280`).
   - Container applies `aspect-[3/4] max-w-sm mx-auto` in portrait mode.
   - Video element uses CSS `object-contain` (not `object-cover`), avoiding zoom/crop.
   - Preview `<img>` uses CSS `object-contain` matching live video feed.
2. `src/components/GuruPresensi.tsx`:
   - Passes `orientation="portrait"` explicitly to `CameraSelfieCapture`.
3. `src/lib/watermarkCanvas.ts`:
   - `drawWatermarkedCanvas` takes `orientation` parameter.
   - For vertical/portrait stream (`width < height`), preserves full 1x scale without artificial zoom or crop (`drawWidth = width, drawHeight = height, offsetX = 0, offsetY = 0`).
   - For horizontal stream in portrait mode, crops to 3:4 target ratio with centered offset.

## Verification
- `tests/camera_orientation.test.ts`: Passes all sections (orientation constraints, component props, functional canvas scaling).
- `tests/camera_zoom_fix.test.ts`: Passes all checks (object-contain, aspect ratio geometry across multiple sensor resolutions, DOM zoom guards).
- `tests/adversarial_camera_badge_challenger_1.test.ts`: Passes all 314 tests.
- Full test suite (`npm test`): Passes all 20 test files.
- `npx tsc --noEmit`: 0 TypeScript errors.
- `npm run build`: Next.js 16 production build compiles cleanly.
