# Dispatch for Explorer 2 (Milestone 9 - Survey R2)

## Identity
- Role: Explorer
- Agent Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_2
- Parent: orchestrator_10

## Assigned Scope: R2
1. **Broadcast Bell Notification in Navbar**:
   - Locate the navbar / header component.
   - Inspect existing broadcast / announcement data structure (e.g. `informasi` or `broadcast` table in Supabase).
   - Check how read/unread status is tracked per user/role.
   - Investigate how to implement a bell icon that has a shake animation (e.g. keyframe vibration or CSS animation) and a red badge/dot when there are unread broadcasts.
2. **Real-time Chat between Teachers**:
   - Investigate existing Supabase Realtime setup in the project (client initialization, channels, subscriptions).
   - Design / check database schema for teacher-to-teacher chat (e.g. `chat_messages` or `direct_messages`, sender_id, recipient_id, content, timestamp, read status).
   - Locate teacher dashboard / navigation to see where the chat UI should be placed or accessed.
3. **Web Push Notifications**:
   - Investigate Service Worker (`sw.js` or public worker) and push registration flow in the app.
   - Check VAPID keys configuration (env vars, backend `/api/push` or similar).
   - Investigate how automatic push warnings/reminders can be triggered for teachers who haven't completed attendance (presensi datang/pulang), journal entry, or picket duties.
   - Report exact files, lines of code, database tables/columns involved, and recommend implementation details.

## Required Output
Write your findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_2\handoff.md`.
Report back when finished.

## 2026-09-18T07:42:05Z
You are Explorer 2 for Milestone 9.
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_2\DISPATCH.md.
Your scope:
1. Broadcast Bell Notification in Navbar:
   - Locate navbar / header components.
   - Check broadcast/announcements data model and unread state tracking per user.
   - Determine how to add bell icon with shake animation and red unread dot/badge.
2. Real-time Chat between Teachers:
   - Check Supabase Realtime client configuration in the app.
   - Investigate or design schema for teacher chat (messages, sender, recipient, timestamp).
   - Check where teacher chat UI should be placed and how real-time subscriptions work.
3. Web Push Notifications:
   - Check service worker (sw.js) and Web Push / VAPID setup.
   - Investigate automated reminders/warnings for teachers who have not done attendance, journal, or picket.

Perform thorough code exploration. Find exact files, component names, lines of code, and database schema.
Write your complete findings and implementation plan to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_2\handoff.md.
Send a message when completed with your summary.
