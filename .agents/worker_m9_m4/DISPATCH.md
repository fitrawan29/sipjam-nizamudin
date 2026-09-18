## 2026-09-18T12:57:15Z
You are Worker M4 (worker_m9_m4).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m9_m4
Read ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
Read PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission is to implement Milestone 4 (Requirement R2: Sistem Notifikasi & Chat Real-time):

1. Exact Requirements & Tasks:

   A. Navbar Broadcast Bell with Shake Animation & Red Indicator:
      - In `src/app/globals.css`:
        * Add keyframe animation `@keyframes bell-shake` (e.g. rotating slightly left and right) and `.animate-bell-shake` utility class.
      - In `src/components/AppScreen.tsx`:
        * In the top navbar, render a broadcast notification bell button/icon.
        * Calculate unread broadcasts: Query `pengumuman` (matching user's school and target audience) and check against `pengumuman_dibaca` for the current user.
        * If unread count > 0:
          - Apply `.animate-bell-shake` to the bell icon.
          - Display a red dot badge with the unread count number.
        * Supabase Realtime: Subscribe to changes in `pengumuman` and `pengumuman_dibaca` so that when an admin publishes a new broadcast, the bell immediately starts shaking and the unread badge updates without a page refresh!
        * Clicking the bell opens a broadcast modal or drawer showing recent announcements, with an option to mark all or specific items as read (inserting into `pengumuman_dibaca`), which immediately stops the shake animation and clears the badge.

   B. Real-time Teacher-to-Teacher Chat:
      - Create `src/components/ChatView.tsx`:
        * Interface for 2-way real-time communication between teachers (and admin) within the same school (`sekolah_id`).
        * Sidebar or list to select a colleague from `data_guru`.
        * Active conversation pane displaying chat message history, sender, recipient, timestamp, and message bubbles.
        * Supabase Realtime channel subscription listening to `INSERT` on `public.chat_messages` for the school.
        * When a new message arrives for the current conversation, append it immediately to the message stream without requiring a page reload.
        * Input form with text input and Send button inserting into `public.chat_messages` (`sekolah_id`, `sender_id`, `sender_nama`, `recipient_id`, `recipient_nama`, `pesan`).
      - In `src/components/AppScreen.tsx`:
        * Add "Chat Guru" / "Pesan" to the navigation menu for Guru and Admin.
        * Wire navigation state so clicking it renders `<ChatView ... />`.

   C. Web Push Notifications & Permission Dialog:
      - In `public/sw.js`:
        * Ensure standard Service Worker handles `push` events, parses JSON or text payload, and calls `self.registration.showNotification(title, options)`.
        * Handle `notificationclick` event to focus existing client window or open URL.
      - Push Permission Dialog:
        * In `src/components/AppScreen.tsx` or a child prompt component (e.g. `src/components/PushNotificationPrompt.tsx`):
          - Check `Notification.permission`. If `'default'` (not yet requested), render a friendly prompt/dialog: "Kirim Notifikasi (Push)" asking the user to enable notifications for attendance, journal, and piket reminders.
          - When granted, subscribe using browser PushManager and save subscription or provide simulated notification test.
          - Provide an option/button "Kirim Notifikasi Uji Coba" to trigger a simulated push notification directly via `registration.showNotification` so acceptance criteria ("Dialog izin 'Kirim Notifikasi (Push)' muncul di browser, dan notifikasi simulasi dari sistem berhasil masuk") is 100% satisfied.
      - Automated Reminders Endpoint:
        * In `src/app/api/push/send-reminders/route.ts`:
          - Check for missing tasks for the current day (teachers without Datang presensi, teachers with schedule today without journals, teachers on piket today without piket reports).
          - Support sending push notification reminders using `web-push` library.

2. Verification & Automated Testing:
   - Run `npx tsc --noEmit` and ensure exit code 0 with zero errors.
   - Create an integration test in `tests/m9_4_chat_and_notifications.test.ts` to test:
     * `chat_messages` schema operations and realtime payload structure.
     * `pengumuman` and `pengumuman_dibaca` unread count calculation.
     * `/api/push/send-reminders` logic and push payload format.
   - Execute `npx tsx tests/m9_4_chat_and_notifications.test.ts` and ensure all tests pass.

3. Git Delivery (MANDATORY PER GEMINI.md):
   - Check `git status`
   - Stage changes `git add .`
   - Commit with descriptive message: `git commit -m "feat(milestone-9): implement broadcast bell with shake animation, real-time chat, and web push notifications"`
   - Push to origin: `git push origin main`

4. Output:
   Write a comprehensive report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m9_m4\handoff.md` detailing all implemented components, verification outputs, and git commit hash.
   Send a completion message via send_message to the parent orchestrator when finished.

## 2026-09-18T13:07:35Z
**Context**: Milestone 4 Implementation (worker_m9_m4)
**Content**: Please provide a brief status update on your implementation of the navbar broadcast bell, real-time teacher chat (ChatView.tsx), and web push notifications/reminders.
**Action**: Report your current progress or send your completion handoff report.
