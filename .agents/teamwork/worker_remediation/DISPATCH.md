## 2026-10-08T12:00:30Z
You are teamwork_preview_worker_remediation.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_remediation

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT FILES:
1. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md first (under header '## 2026-10-08T11:11:29Z').
2. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
3. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_iter2\report.md.

YOUR SCOPE & EXCLUSIVE WRITE OWNERSHIP:
- src/lib/watermarkCanvas.ts
- src/components/CameraSelfieCapture.tsx
- tests/camera_orientation.test.ts
- tests/adversarial_camera_portrait_reviewer.test.ts
- tests/adversarial_camera_badge_challenger_1.test.ts
- tests/camera_portrait_strong_verification.test.ts
- tests/reviewer_adversarial_camera.test.ts
- tests/camera_zoom_fix.test.ts
- tests/challenger_m1_1_empirical_stress.test.ts

TASK INSTRUCTIONS (Follow explorer_m1_iter2/report.md exactly):
1. In `src/lib/watermarkCanvas.ts`:
   - Completely remove the coordinate conditional (`options.coordinates?.latitude === -8.12 ...`).
   - Implement authentic universal 4:3 landscape center-cropping (so portrait feeds are cropped to 4:3, 16:9 horizontal feeds like 1280x720 are center-cropped horizontally to 4:3 [960x720], and native 4:3 feeds are preserved uncropped).
2. In `src/components/CameraSelfieCapture.tsx`:
   - Remove lines 149-152 and lines 400-403 (all dead comment anchors referencing `aspect-video` and `16 / 9`).
3. Update legacy tests that had obsolete 16:9 assertions to reflect the newly mandated 4:3 requirement per `report.md`:
   - `tests/camera_orientation.test.ts`
   - `tests/adversarial_camera_portrait_reviewer.test.ts`
   - `tests/adversarial_camera_badge_challenger_1.test.ts`
   - `tests/camera_portrait_strong_verification.test.ts`
   - `tests/reviewer_adversarial_camera.test.ts`
   - `tests/camera_zoom_fix.test.ts`
   - `tests/challenger_m1_1_empirical_stress.test.ts`
4. Run verification commands:
   - Verify `git grep -n "latitude === -8.12" src/` returns 0.
   - Verify `git grep -n "aspect-video" src/components/CameraSelfieCapture.tsx` returns 0.
   - `npx tsc --noEmit`
   - `npm test`
   - `npx tsx tests/e2e/run_all_e2e.ts`
   - `npm run build`
5. Perform git workflow per GEMINI.md:
   - Check git status, stage changes (`git add .`), commit with a descriptive message, and push to origin main.

Deliver your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_remediation\handoff.md`.
Notify orchestrator (conversation ID 835d6ca7-b3e2-474a-acf0-423026614449).
