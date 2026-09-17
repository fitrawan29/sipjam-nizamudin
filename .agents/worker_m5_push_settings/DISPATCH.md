## 2026-09-17T10:44:38Z
<USER_REQUEST>
You are worker_m5_push_settings, a specialized backend and PWA worker.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m5_push_settings

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md before starting work.
Also read PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md and survey reports at:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r3r4\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1_db\handoff.md

FILE WRITE OWNERSHIP:
You exclusively own:
- public/sw.js (New file)
- src/app/api/push/subscribe/route.ts (New file)
- src/app/api/push/validate/route.ts (New file)
- src/components/AccountSettingsModal.tsx (New component)
- src/components/AdminConfigView.tsx (Setting inputs for teacher attendance & target email)
- src/lib/workflow.ts (getGuruDailyState logic update)
- src/lib/driveUpload.ts (Target email integration)
- package.json / package-lock.json (if installing web-push and @types/web-push)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

YOUR MISSION (Milestone 5 - VAPID Push Notifications & Account Settings):
1. Native VAPID Web Push Notifications (without Firebase):
   - Install `web-push` and `@types/web-push` via npm.
   - Create `public/sw.js`:
     - Service worker listening for `push` event. Parses payload JSON `{ title, body, icon, url, data }`.
     - Calls `self.registration.showNotification(title, options)`.
     - Handles `notificationclick` event: closes notification and navigates/focuses to app window.
   - Create Next.js route `src/app/api/push/subscribe/route.ts`:
     - POST endpoint receiving `{ subscription, user_id, user_nama, user_role, sekolah_id }`.
     - Upserts endpoint, p256dh, and auth into `public.push_subscriptions`.
   - Create Next.js route `src/app/api/push/validate/route.ts`:
     - POST endpoint to validate push subscription by sending a test push message using `web-push.sendNotification()`.
2. Account Settings for Guru & Admin in `src/components/AccountSettingsModal.tsx`:
   - UI modal accessible from Header / AppScreen profile button.
   - Cool default avatar picker: grid of 12 distinct stylish avatars (e.g. `avatar_1` to `avatar_12` using SVG or Dicebear/identicon illustrations).
   - Change username input.
   - Change password input with current & new password fields.
   - Uses RPC `public.update_user_profile` created in M1 to securely update profile in `public.users`.
3. Teacher Attendance Requirement in `src/components/AdminConfigView.tsx` & `src/lib/workflow.ts`:
   - In `AdminConfigView.tsx`: Add radio or select setting for `aturan_kehadiran_guru`:
     - "Semua_Hari" (Wajib Hadir Setiap Hari)
     - "Hari_Mengajar_Saja" (Wajib Hadir Hanya di Hari Mengajar)
     - Persist to `public.pengaturan.aturan_kehadiran_guru`.
   - In `src/lib/workflow.ts` within `getGuruDailyState()`:
     - Read `aturan_kehadiran_guru` from `pengaturan`.
     - If setting is 'Hari_Mengajar_Saja' and teacher has NO teaching schedule on `selectedHari`:
       - Do NOT set `isAlpa = true`.
       - Exempt teacher from "Alpa" and unsubmitted presence lists.
4. Target Email Setting in `src/components/AdminConfigView.tsx` & `src/lib/driveUpload.ts`:
   - In `AdminConfigView.tsx`: Add input field for `email_tujuan_upload` (Target email for file upload integration), saving to `pengaturan`.
   - In `src/lib/driveUpload.ts`: Include `targetEmail` in payload sent to Google Apps Script webhook.
5. Verify TypeScript (`npx tsc --noEmit`).
6. Execute Git workflow (commit & push per GEMINI.md), write `handoff.md`, and message orchestrator_9.
</USER_REQUEST>
