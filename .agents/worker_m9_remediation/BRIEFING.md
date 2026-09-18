# BRIEFING — 2026-09-19T01:34:30+08:00

## Mission
Remediate broken schema contract in push reminder route (presensi_guru query: timestamp & tipe_absen), fix self-certifying tests in tests/m9_4_chat_and_notifications.test.ts, verify all test suites, and deliver clean build and git push.

## 🔒 My Identity
- Archetype: Worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m9_remediation
- Original parent: d2dfd088-11e9-48f7-a9b6-d9a38d0c3b78
- Milestone: M9 Remediation

## 🔒 Key Constraints
- DO NOT CHEAT. All implementations must be genuine.
- Fix broken schema contract in src/app/api/push/send-reminders/route.ts (presensi_guru columns: timestamp, tipe_absen).
- Fix self-certifying assertions in tests/m9_4_chat_and_notifications.test.ts.
- Verify all 5 M9 test suites pass 100%.
- npx tsc --noEmit and npm run build must pass cleanly.
- Follow GEMINI.md git workflow: git status, git add ., git commit -m "...", git push origin main.

## Current Parent
- Conversation ID: d2dfd088-11e9-48f7-a9b6-d9a38d0c3b78
- Updated: 2026-09-19T01:34:30+08:00

## Task Summary
- **What to build**: Fix presensi_guru query in send-reminders route to use timestamp (startOfDay to endOfDay) and tipe_absen ('Datang'), add multi-tenant sekolah_id filter support, update tests to verify genuine schema compliance and mock behavior.
- **Success criteria**: All 5 test suites pass, TypeScript builds clean, next build succeeds, committed and pushed.
- **Interface contracts**: PROJECT.md, src/lib/database.ts, types/database.ts
- **Code layout**: src/app/api/push/send-reminders/route.ts, tests/m9_4_chat_and_notifications.test.ts

## Key Decisions Made
- [initial decision]: Follow minimal change principle and align database queries exactly with public.presensi_guru schema (timestamp, tipe_absen).

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — Final 5-component report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: Remediate push reminder route and test assertions

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: Pending

## Loaded Skills
- None requested/loaded
