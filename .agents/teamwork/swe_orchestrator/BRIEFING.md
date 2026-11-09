# BRIEFING — 2026-11-09T07:30:30Z

## Mission
Perbaiki alur dan fungsionalitas Guru BK saat admin menunjuk guru menjadi Guru BK ("Tunjuk BK"), konsistensi role 'bk' vs 'guru_bk', navigasi dan fitur BK, serta preservasi peran lain dengan pendekatan /ponytail.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_orchestrator\
- Original parent: parent
- Original parent conversation ID: c571d333-6d16-4f6e-93f5-9088c486cf14

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
1. **Decompose**: No decomposition (SWE Light: single whole-task sequential refinement).
2. **Dispatch & Execute**:
   - Dispatch teamwork_implementer with verbatim task.
   - Dispatch teamwork_reviewer (floor: 3 review rounds).
   - Carry open-issues ledger across all rounds.
   - Independent test verification by orchestrator.
   - Blocking victory audit via teamwork_victory_auditor before completion.
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Redesign: next review round
4. **Succession**: At >=16 spawns and all subagents complete, spawn successor and exit.
- **Work items**:
  1. teamwork_implementer [in-progress]
  2. teamwork_reviewer_1 [pending]
  3. teamwork_reviewer_2 [pending]
  4. teamwork_reviewer_3 [pending]
  5. teamwork_victory_auditor [pending]
- **Current phase**: 1 (Implementation)
- **Current focus**: teamwork_implementer (510cf4a9-1b01-4b7e-82b7-ba5ae05df978)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files yourself. Delegate all implementation and repair.
- NEVER explore or debug codebase to solve task yourself.
- Propagate user task verbatim.
- Sequential refinement, not parallel.
- Carry open-issues ledger across all rounds.
- Floor of 3 review rounds + independent test verification.
- Blocking audit by teamwork_victory_auditor.

## Current Parent
- Conversation ID: c571d333-6d16-4f6e-93f5-9088c486cf14
- Updated: not yet

## Key Decisions Made
- Use SWE Light pattern with ponytail approach attached to subagents.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| teamwork_implementer_r0 | teamwork_implementer | Initial implementation | in-progress (running test suite) | 510cf4a9-1b01-4b7e-82b7-ba5ae05df978 |

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: 510cf4a9-1b01-4b7e-82b7-ba5ae05df978
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-16
- Safety timer: task-42
- On succession: kill all timers before spawning successor
- On context truncation: handle timers as step 4 of the State Recovery section of your prompt says

## Artifact Index
- .agents/teamwork/swe_orchestrator/DISPATCH.md - Dispatch instructions
- .agents/teamwork/ORIGINAL_REQUEST.md - Authoritative task requirements
- .agents/teamwork/swe_orchestrator/progress.md - Execution progress and open issues ledger
