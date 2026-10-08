## 2026-10-08T11:26:19Z
You are teamwork_preview_worker_m1.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT FILES:
1. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md first (under header '## 2026-10-08T11:11:29Z').
2. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
3. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_1\report.md.

YOUR SCOPE & EXCLUSIVE WRITE OWNERSHIP:
- src/components/TeacherReminderManager.tsx
- src/components/PrintHeader.tsx
- src/components/CameraSelfieCapture.tsx
- src/lib/watermarkCanvas.ts

REQUIREMENTS TO IMPLEMENT:
1. 30-Minute Notification Snooze (TeacherReminderManager.tsx):
   - Add persistent 30-minute snooze stored in localStorage under `sipjam_reminder_snooze_until_${userId}`.
   - When teacher clicks snooze / "Tunda 30 Menit", suppress notifications and reminder modal for 30 minutes.
   - Provide an option to cancel / toggle off the snooze early if needed.
   - Ensure reminder evaluation checks `isReminderSnoozed(user.id)` before showing banner or firing notifications.
2. Print Orientation Simplification (PrintHeader.tsx):
   - Remove manual print orientation settings / toggle buttons so the user relies on the native browser print dialog.
   - Keep `export function PrintOrientationToggle` returning null or an invisible container so that existing test assertions checking for its existence in `tests/m6_2_print_redesign.test.ts` continue to pass cleanly.
   - Do NOT inject conflicting forced `@page` orientation directives that override the browser print dialog.
3. Camera 4:3 Ratio Lock & Storage Optimization (CameraSelfieCapture.tsx & watermarkCanvas.ts):
   - Strictly lock camera ratios to 4:3 (portrait 3:4 for attendance, landscape 4:3 for KBM journal).
   - In CameraSelfieCapture.tsx, change landscape constraints from 16:9 to 4:3 (e.g. ideal width 1280, height 960, aspectRatio ideal 4/3). Update preview container aspect classes to aspect-[4/3] (and aspect-[3/4] for portrait).
   - In watermarkCanvas.ts, update landscape cropping target ratio to 4/3.
   - Verify that Google Drive direct upload via `src/lib/driveUpload.ts` continues to function with pre-compressed canvas frames.
4. UI Responsiveness:
   - Ensure smooth responsive styling across mobile (320px–428px) and desktop.

VERIFICATION COMMANDS:
You must run:
1. `npx tsc --noEmit`
2. `npm test`
3. `npx tsx tests/e2e/run_all_e2e.ts`
All must pass with 0 errors.

Deliver your detailed report and handoff to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\handoff.md.
Notify orchestrator (conversation ID 835d6ca7-b3e2-474a-acf0-423026614449) via send_message when complete.
