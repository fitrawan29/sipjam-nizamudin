# Sentinel Handoff Report — Milestone swe_23 (In Progress)

## 1. Observation
User requested fixing teacher attendance rule "wajib hadir hanya hari mengajar" across all modules (workflow, presensi, admin dashboard, automatic alpa calculation, push reminder), as well as deleting obsolete components (`AdminMonitorView.tsx`, `NotificationPermissionModal.tsx`, `PushNotificationPrompt.tsx`) and leftover dead code (offline queues).
- Path routed: SWE Light (`teamwork_preview_swe`) as a single self-contained focused fix.
- Orchestrator: `swe_23` (`cee80ad9-6743-4395-8d50-c686b97fb49d`) spawned.
- Crons initialized: Cron 1 (Progress Reporting, task-18) and Cron 2 (Liveness Check, task-20).

## 2. Logic Chain
1. Requirement R1: Align non-teaching day status for teachers with `wajib_hadir_hanya_mengajar = true` or school policy `Hari_Mengajar_Saja`:
   - Non-teaching day without picket duty: exempt from attendance (`isNonTeachingDay: true`, `bebasAlpa: true`, `isAlpa: false`), no automatic Alpa in `attendanceAlpa.ts`, no reminders in `send-reminders/route.ts`.
   - Picket duty on non-teaching day: picket duty mandatory, presensi datang required.
   - Voluntary attendance on non-teaching day: presensi pulang allowed without fictional teaching journal requirement.
   - Consistent UI in `HomeViewAdmin.tsx` and `HomeViewGuru.tsx`.
2. Requirement R2: Delete unused files (`AdminMonitorView.tsx`, `NotificationPermissionModal.tsx`, `PushNotificationPrompt.tsx`) and clean legacy offline queue references safely.
3. Requirement R3: Automated test suite verification (`tests/wajib_hadir_dan_pembersihan_usang.test.ts`), full test suite pass (`npm test`), typecheck and build cleanly.

## 3. Caveats
- Subagent `swe_23` is currently executing with its implementer and review loop.
- Independent victory audit will be triggered upon orchestrator completion claim.

## 4. Conclusion
Dispatched and actively monitored. Waiting for `swe_23` completion report.

## 5. Verification Method
- SWE Light execution loop with reviewer verification.
- Automated tests via `npm test`.
- Independent post-victory audit.
