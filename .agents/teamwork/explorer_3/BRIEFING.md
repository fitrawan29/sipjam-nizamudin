# BRIEFING — 2026-10-03T05:35:00Z

## Mission
Investigate Task R3: 5-Minute Automated Reminder System for Teachers (presensi datang/pulang, jurnal mengajar, piket duty) with Web Notification & in-app fallback.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_3
- Original parent: 7e84420a-2cde-4423-8413-5104d66482dd
- Milestone: R3 Automated Reminder System Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT modify production source code
- Files in .agents/teamwork/explorer_3/ only
- Respect Ponytail principle (simplest, robust, framework/native features without bloated dependencies)

## Current Parent
- Conversation ID: 7e84420a-2cde-4423-8413-5104d66482dd
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `public/sw.js`: Service worker caching, push event, and notificationclick navigation.
  - `src/lib/pushClient.ts`: VAPID client subscription and status checks.
  - `src/lib/workflow.ts`: `getGuruDailyState()`, `findJadwalForGuru()`, `getActiveSistemBlok()`, `isJurnalMatchJadwal()`.
  - `src/lib/wita.ts`: WITA timezone normalization and date/time helpers.
  - `src/components/GuruPresensi.tsx`: Attendance types, school hours loading, time window enforcement.
  - `src/components/GuruJurnal.tsx`: Jurnal KBM vs Jurnal Kegiatan submission and validation.
  - `src/components/PiketView.tsx`: Penugasan piket and laporan piket flow.
  - `src/components/AdminConfigView.tsx`: School hours keys (`jam_datang_mulai`, `jam_datang_batas`, `jam_datang_akhir`, `jam_pulang_mulai`, `jam_pulang_jumat`, `jam_pulang_akhir`).
  - `src/components/AppScreen.tsx`: Top-level component orchestrating views, user roles, modals, prompts.
  - `src/components/PushNotificationPrompt.tsx`: Permission prompt and blocking modal.
  - `src/app/api/push/send-reminders/route.ts`: Backend reminders checking Datang, Jurnal, Piket (missing Pulang).
- **Key findings**:
  1. `getGuruDailyState()` in `src/lib/workflow.ts` already evaluates 95% of daily teacher obligations: Datang, Pulang, KBM journals vs Sistem Blok, Piket assignments, exemptions, and holidays.
  2. School hours are stored in `pengaturan` table: `jam_datang_mulai` (06:45), `jam_datang_batas` (07:15), `jam_datang_akhir` (10:00), `jam_pulang_mulai` (14:00, or `jam_pulang_jumat` 11:00 on Fridays), `jam_pulang_akhir` (17:00).
  3. No recurring timers (`setInterval`) currently exist in the client app.
  4. Web notifications can be posted directly via `navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options))` when `Notification.permission === 'granted'`. Clicks route through `notificationclick` in `sw.js` to focus the window and navigate.
  5. In-app fallback: If `Notification.permission !== 'granted'`, an in-app banner/card provides immediate visual reminder and direct CTA buttons to navigate to the missing task.
  6. Backend route `/api/push/send-reminders/route.ts` is missing Task 4 (Presensi Pulang check), which should also be added for parity.
- **Unexplored areas**: None; all sub-questions in DISPATCH.md are thoroughly investigated.

## Key Decisions Made
- Architecture designed around a dedicated component/hook (`TeacherReminderManager` / `useTeacherReminder`) mounted in `AppScreen.tsx` for `role === 'guru'`.
- 5-minute interval (`300,000 ms`) with anti-spam session throttle and time-window awareness.

## Artifact Index
- report.md — Comprehensive investigation report for R3
- handoff.md — 5-component handoff report
- progress.md — Heartbeat and activity log
- DISPATCH.md — Task instructions and dispatch log
