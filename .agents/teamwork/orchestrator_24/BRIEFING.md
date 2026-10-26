# BRIEFING — 2026-10-23T23:00:00Z

## Mission
Restorasi layout, header, dan sidebar asli Superadmin serta mempertahankan integrasi role dinas_pendidikan secara rapi dan non-destruktif, dengan pengiriman otomatis ke branch dev.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_24
- Original parent: 97d88aea-aa34-489f-b046-f852354a77ff
- Original parent conversation ID: 97d88aea-aa34-489f-b046-f852354a77ff

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_24\SCOPE.md
1. **Decompose**:
   - Milestone 1: Survey & Technical Exploration (Navbar, Sidebar, SuperadminView, Dinas Role, Tests)
   - Milestone 2: Implementation of Restorations & Harmonization
   - Milestone 3: Independent Review & Challenging
   - Milestone 4: Forensic Integrity Audit & Final Verification (Tests, Build, Git Delivery to dev)
2. **Dispatch & Execute**:
   - Direct iteration loop: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate
3. **On failure**:
   - Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate
4. **Succession**:
   - Self-succeed at 16 spawns
- **Work items**:
  1. Survey & Technical Exploration [in-progress]
  2. Implementation of Navbar, Sidebar, SuperadminView & Dinas Preservation [pending]
  3. Verification & Adversarial Review [pending]
  4. Forensic Audit & Git Delivery [pending]
- **Current phase**: 1
- **Current focus**: Work Item 1 (Survey & Technical Exploration)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- File-editing tools ONLY for metadata/state files (.md) in .agents/teamwork/ folder.
- Mandatory audit enforcement: binary veto on integrity violation.
- Git delivery must push to branch dev (NEVER push/merge to main).
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 97d88aea-aa34-489f-b046-f852354a77ff
- Updated: 2026-10-23T23:00:00Z

## Key Decisions Made
- Project pattern selected for multi-milestone restoration and preservation.
- Survey will deploy 3 Explorers in parallel to inspect current codebase state, git history/diffs for original superadmin navbar/sidebar, and current dinas_pendidikan implementation.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_o24_1 | teamwork_preview_explorer | Survey Navbar & Header Restoration | in-progress | 2f4b0061-8c15-4935-959a-4be668bd0811 |
| explorer_o24_2 | teamwork_preview_explorer | Survey Sidebar & Operational Menus | in-progress | 511b3efc-7382-42a7-80fd-774bbae3df2e |
| explorer_o24_3 | teamwork_preview_explorer | Survey SuperadminView, Dinas Role, Tests | in-progress | 97956911-2421-4bb7-9332-ce807e7086d1 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: 2f4b0061-8c15-4935-959a-4be668bd0811, 511b3efc-7382-42a7-80fd-774bbae3df2e, 97956911-2421-4bb7-9332-ce807e7086d1
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 90d93d5d-b906-4cf2-940b-b03501fdc13d/task-20
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_24\BRIEFING.md — Persistent state index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_24\DISPATCH.md — Dispatch assignment
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_24\progress.md — Liveness & status tracking
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_24\SCOPE.md — Milestone decomposition & interfaces
