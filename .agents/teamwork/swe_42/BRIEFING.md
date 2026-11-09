# BRIEFING — 2026-11-09T05:32:00Z

## Mission
Sesuaikan alur presensi agar petugas piket tidak lagi memiliki kewajiban melakukan presensi/rekap absensi kepada siswa di pagi hari, serta gantikan tulisan/label "presensi piket" untuk siswa menjadi "presensi datang" dan "presensi pulang", menjaga stabilitas seluruh fitur lain.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_42
- Original parent: 0d58ee6a-7b09-42da-9baf-18574b3c6a95
- Original parent conversation ID: 0d58ee6a-7b09-42da-9baf-18574b3c6a95

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
1. **Decompose**: No decomposition (SWE Light rule: sequential refinement on single whole task).
2. **Dispatch & Execute**:
   - teamwork_implementer -> teamwork_reviewer (round 1) -> teamwork_reviewer (round 2) -> teamwork_reviewer (round 3) -> teamwork_victory_auditor
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At >=16 spawns with all completed, handoff to successor.
- **Work items**:
  1. Implementer pass [in-progress]
  2. Reviewer round 1 [pending]
  3. Reviewer round 2 [pending]
  4. Reviewer round 3 [pending]
  5. Victory audit [pending]
- **Current phase**: 2
- **Current focus**: Monitoring teamwork_implementer (dc418a40-3b5e-44d8-80d1-e0f314dd880c)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files yourself. Delegate all implementation and all repair to teamwork_implementer and teamwork_reviewer.
- NEVER explore or debug the codebase in order to solve the task yourself.
- Run at least 3 review rounds + victory audit.
- Carry open-issues ledger across ALL rounds.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Always follow ponytail principles (minimal, clean, no over-engineering).

## Current Parent
- Conversation ID: 0d58ee6a-7b09-42da-9baf-18574b3c6a95
- Updated: not yet

## Key Decisions Made
- Initial dispatch of teamwork_implementer (dc418a40-3b5e-44d8-80d1-e0f314dd880c).

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| teamwork_implementer | teamwork_implementer | Primary implementation of R1, R2, R3 | in-progress | dc418a40-3b5e-44d8-80d1-e0f314dd880c |

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: dc418a40-3b5e-44d8-80d1-e0f314dd880c
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 98fe8e89-a2d2-480c-af0c-96b0a282e4c1/task-14
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: handle timers as step 4 of State Recovery section

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md — Original User Request
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_42\DISPATCH.md — Dispatch instructions
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_42\progress.md — Progress and open-issues ledger
