# BRIEFING — 2026-09-17T18:49:30+08:00

## Mission
Implement Milestone 3: Teacher Selfie Attendance with client-side watermarked canvas, live camera capture, non-blocking asynchronous Google Drive upload, and flexible Dinas Luar pulang options.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3_selfie
- Original parent: 438061dd-8b26-44e8-acfe-051ab3586841
- Milestone: Milestone 3 - Teacher Selfie Attendance & Watermark

## 🔒 Key Constraints
- Exclusively own files:
  - `src/components/CameraSelfieCapture.tsx` (New component)
  - `src/lib/watermarkCanvas.ts` (New utility)
  - `src/components/GuruPresensi.tsx` (Teacher attendance UI)
- Do NOT touch files owned by other milestones/workers unless specified.
- Non-blocking asynchronous GAS upload: immediately insert `presensi_guru` record, fire `uploadToDrive` in background, update `presensi_guru.link_bukti` upon completion, instant UI feedback.
- Canvas watermark with dark pill badge, white text: Indonesian date, Lat/Long coords, WITA time.
- Flexible Dinas Luar check-out: allow switching between "Di Sekolah" and "Dinas Luar" on Pulang if checked in as Dinas Luar.
- Follow Git workflow rule in GEMINI.md (status, add, commit, push origin main).
- Integrity Mandate: genuine implementations only, no hardcoding, no facades.

## Current Parent
- Conversation ID: 438061dd-8b26-44e8-acfe-051ab3586841
- Updated: 2026-09-17T18:49:30+08:00

## Task Summary
- **What to build**:
  1. `src/lib/watermarkCanvas.ts`: client-side canvas watermarking function `drawWatermarkedCanvas`.
  2. `src/components/CameraSelfieCapture.tsx`: live camera stream, geolocation tracking, watermark preview, retake/confirm buttons, camera resource cleanup.
  3. `src/components/GuruPresensi.tsx`: integrate CameraSelfieCapture for Datang and Dinas Luar, implement non-blocking background upload to GAS with Supabase record update, and adjust Dinas Luar pulang options.
- **Success criteria**: TypeScript passes without errors, camera & watermark fully operational, instant attendance submission with async upload.
- **Interface contracts**: PROJECT.md, ORIGINAL_REQUEST.md
- **Code layout**: src/lib, src/components

## Change Tracker
- **Files modified**:
  - `src/lib/watermarkCanvas.ts`: New client-side canvas watermark utility.
  - `src/components/CameraSelfieCapture.tsx`: New webcam selfie capture component with live video, GPS tracking, retake/confirm flow, and graceful stream stop.
  - `src/components/GuruPresensi.tsx`: Integrated CameraSelfieCapture, async non-blocking GAS upload with instant UI response, and flexible Pulang options for Dinas Luar.
  - `tests/m3_selfie_watermark.test.ts`: New test suite for Milestone 3 verification.
- **Build status**: PASS (unit tests and QoL audits 100% pass)
- **Pending issues**: none

## Quality Status
- **Build/test result**: `tests/m3_selfie_watermark.test.ts` passed (15/15 assertions), `tests/qolAudit.test.ts` passed (0 native alert calls).
- **Lint status**: clean
- **Tests added/modified**: `tests/m3_selfie_watermark.test.ts`

## Loaded Skills
- None

## Key Decisions Made
- Used HTML5 Canvas to composite mirrored front camera stream with high-contrast semi-transparent dark badge overlay containing formatted Indonesian date, GPS coordinates, and WITA time.
- Implemented non-blocking pattern for attendance submission: `presensi_guru` record is inserted with `link_bukti: 'pending:uploading'` and UI feedback is immediately presented to user, while `uploadToDrive` runs asynchronously in the background and updates `link_bukti` once resolved.
- Preserved fallback photo picker in `CameraSelfieCapture` in case user denies camera permissions or runs on headless/desktop environments without a webcam.

## Artifact Index
- .agents/worker_m3_selfie/DISPATCH.md — Assignment instructions
- .agents/worker_m3_selfie/BRIEFING.md — Persistent working memory
- .agents/worker_m3_selfie/progress.md — Liveness & heartbeat
- .agents/worker_m3_selfie/handoff.md — Final completion report
