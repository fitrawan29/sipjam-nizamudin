# BRIEFING — 2026-10-04T01:27:55Z

## Mission
Orchestrate the implementation and verification of student attendance mode configuration (QR vs Manual) per-school for SIPJAM.

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12
- Original parent: parent
- Original parent conversation ID: df9b7bd5-375e-48d6-b214-ea30096248e6

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md
1. **Decompose**: Survey codebase via Explorers, define milestones, establish interface contracts in PROJECT.md.
2. **Dispatch & Execute**: Direct iteration loop or delegate to sub-orchestrator per milestone.
3. **On failure**: Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate.
4. **Succession**: At 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Survey & Architecture Specification [done]
  2. M1: Database Migration & Schema (`public.sekolah.mode_presensi_siswa`) [done]
  3. M2: Superadmin Configuration UI (`SuperadminView.tsx`) [in-progress]
  4. M3: Piket View Mode Handling (QR vs Manual list) (`PiketView.tsx`) [pending]
  5. M4: Multi-tenant Isolation & Related Views Verification (`RekapSiswaView.tsx`, `GuruJurnal.tsx`) [pending]
  6. E2E / Dual-track Integration Verification [pending]
- **Current phase**: 1 (Implementation)
- **Current focus**: Milestone M2 (Superadmin Configuration UI)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/teamwork/ folder.
- Follow Git Workflow Rule in GEMINI.md: check git status, git add ., git commit -m "...", git push origin main on feature/task completion (delegated to workers).
- Strictly adhere to Next.js notes in node_modules/next/dist/docs/.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: df9b7bd5-375e-48d6-b214-ea30096248e6
- Updated: 2026-10-04T01:13:54Z

## Key Decisions Made
- M1 successfully executed and verified on database and database.ts types.
- Dispatched Worker M2 to implement school attendance mode configuration in `SuperadminView.tsx`.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_1 | teamwork_preview_explorer | DB & Schema Survey | completed | 36dc8009-6533-4dbc-ab56-5d3f4a1b4c75 |
| explorer_survey_2 | teamwork_preview_explorer | Superadmin UI Survey | completed | eed8581e-ea73-4e3b-a3c1-111b0a4cb793 |
| explorer_survey_3 | teamwork_preview_explorer | Piket & Views Survey | completed | 9a1fee43-ab89-44c1-8a4c-dd68f7d7c3df |
| worker_m1 | teamwork_preview_worker | M1: DB Migration & Types | completed | cb1ce59c-fdb3-47f6-a008-cf76a3b6354a |
| worker_m2 | teamwork_preview_worker | M2: Superadmin UI | in-progress | 8530e15f-3289-49a1-b8b8-f668cc240cbb |

## Succession Status
- Succession required: no
- Spawn count: 5 / 16
- Pending subagents: 8530e15f-3289-49a1-b8b8-f668cc240cbb
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 60f11d0f-3028-47d5-a4c0-af2902baf3f1/task-10
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\BRIEFING.md — Persistent working memory
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\DISPATCH.md — Incoming dispatch log
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\progress.md — Liveness & status tracking
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md — Global architecture, milestones & inventory
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\GATE_STATUS.md — Gate verdicts
