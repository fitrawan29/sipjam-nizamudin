# BRIEFING — 2026-10-08T12:27:00Z

## Mission
Implement Milestone 2: Teacher Attendance Multi-State Transitions, Long-Term Leave Approval Routing, Auto-Checkout Flagging, and GPS Signature Printing.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2
- Original parent: 835d6ca7-b3e2-474a-acf0-423026614449
- Milestone: m2

## 🔒 Key Constraints
- DO NOT CHEAT. All implementations must be genuine.
- Exclusive write ownership:
  - src/types/database.ts
  - supabase/migrations/20261008_m2_presensi_guru_approval_autocheckout.sql
  - src/components/GuruPresensi.tsx
  - src/lib/workflow.ts
  - src/lib/attendanceAlpa.ts
  - src/components/AdminVerifView.tsx
  - src/components/PrintHeader.tsx
  - src/utils/printWithGps.ts
  - tests/m2_teacher_attendance_verification.test.ts
- Verification commands: npx tsc --noEmit, npm test, npx tsx tests/m2_teacher_attendance_verification.test.ts, npx tsx tests/e2e/run_all_e2e.ts, npm run build
- Follow Git workflow: git add ., commit, git push origin main.

## Current Parent
- Conversation ID: 835d6ca7-b3e2-474a-acf0-423026614449
- Updated: 2026-10-08T12:27:00Z

## Task Summary
- **What to build**: Teacher attendance multi-state transitions, multi-day leave form with admin approval flagging, workflow logic for leave date ranges, auto-checkout for forgotten checkouts, admin verification badges/routing, and GPS coordinates on printed documents.
- **Success criteria**: All 6 verification commands pass, migration exists, types updated, clean code, no regressions.
- **Interface contracts**: PROJECT.md & explorer_o16_2/report.md
- **Code layout**: Next.js App / components in src/, tests in tests/

## Change Tracker
- **Files modified**: [TBD]
- **Build status**: [TBD]
- **Pending issues**: [TBD]

## Quality Status
- **Build/test result**: [TBD]
- **Lint status**: [TBD]
- **Tests added/modified**: [TBD]

## Loaded Skills
- None explicitly requested as external skill dumps.

## Key Decisions Made
- Follow explorer_o16_2/report.md blueprint precisely.

## Artifact Index
- .agents/teamwork/worker_m2/DISPATCH.md — Dispatch instructions
- .agents/teamwork/worker_m2/BRIEFING.md — Situational awareness
- .agents/teamwork/worker_m2/progress.md — Liveness heartbeat & progress log
- .agents/teamwork/worker_m2/handoff.md — Final handoff report
