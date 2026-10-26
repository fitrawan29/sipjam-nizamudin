# BRIEFING — 2026-10-24T07:27:00Z

## Mission
Restorasi layout, header, dan sidebar asli Superadmin (termasuk dropdown switcher satelit di navbar atas dan seluruh menu operasional sekolah) serta mempertahankan integrasi role `dinas_pendidikan` (manajemen wilayah oleh Superadmin & dashboard monitoring read-only) secara rapi dan non-destruktif, dengan pengiriman otomatis ke branch `dev`.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_25
- Original parent: 97d88aea-aa34-489f-b046-f852354a77ff
- Original parent conversation ID: 97d88aea-aa34-489f-b046-f852354a77ff

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_25\SCOPE.md
1. **Decompose**:
   - Survey: 3 Explorers in parallel mapping current codebase state, git history of original superadmin UI vs recent changes, and current dinas integration.
   - Milestone 1: Restorasi Navbar & Header Asli Superadmin (R1)
   - Milestone 2: Restorasi Sidebar Asli & Menu Operasional Superadmin (R2)
   - Milestone 3: Harmonisasi Tab di SuperadminView (R3) & Preservasi Dinas (R4)
   - Milestone 4: Verification, Automated Tests, Build & Git Delivery to dev (R5)
2. **Dispatch & Execute**:
   - Direct iteration loop: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate
3. **On failure**:
   - Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate
4. **Succession**:
   - Self-succeed at 16 spawns
- **Work items**:
  1. Survey & Technical Investigation [in-progress]
  2. Implementation: Navbar & Header (R1) [pending]
  3. Implementation: Sidebar & Operational Menus (R2) [pending]
  4. Implementation: SuperadminView Harmonization (R3) & Dinas Role Preservation (R4) [pending]
  5. Verification & Automated Testing (R5) [pending]
  6. Final Integrity Audit & Git Delivery to dev (R5) [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Work Item 1 (Survey & Technical Investigation)

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
- Updated: 2026-10-24T07:26:00Z

## Key Decisions Made
- Project pattern selected for multi-milestone restoration and preservation.
- Survey launched 3 Explorers in parallel:
  1. explorer_o25_1 (fdecf2c8-6abc-4e8e-9b1c-6be74c59dd7f): Navbar / Header investigation (R1).
  2. explorer_o25_2 (128bbb77-2d30-4155-a7df-8f4ff0894f09): Sidebar & Operational Menus investigation (R2).
  3. explorer_o25_3 (9e556ff5-c9c1-4094-ad4e-88e657c69954): SuperadminView Tabs & Dinas Role preservation & tests (R3, R4, R5).

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_o25_1 | teamwork_preview_explorer | Survey Navbar & Header (R1) | in-progress | fdecf2c8-6abc-4e8e-9b1c-6be74c59dd7f |
| explorer_o25_2 | teamwork_preview_explorer | Survey Sidebar & Operational Menus (R2) | in-progress | 128bbb77-2d30-4155-a7df-8f4ff0894f09 |
| explorer_o25_3 | teamwork_preview_explorer | Survey SuperadminView Tabs, Dinas & Tests (R3, R4, R5) | in-progress | 9e556ff5-c9c1-4094-ad4e-88e657c69954 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: fdecf2c8-6abc-4e8e-9b1c-6be74c59dd7f, 128bbb77-2d30-4155-a7df-8f4ff0894f09, 9e556ff5-c9c1-4094-ad4e-88e657c69954
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: bb0d235f-367d-48bc-8283-846a0fd9e2e7/task-36
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_25\BRIEFING.md — Persistent state index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_25\DISPATCH.md — Dispatch assignment
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_25\progress.md — Liveness & status tracking
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_25\SCOPE.md — Milestone decomposition
