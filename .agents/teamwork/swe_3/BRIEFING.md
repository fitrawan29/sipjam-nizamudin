# BRIEFING — 2026-09-27T22:30:00+08:00

## Mission
Orchestrate SWE Light refinement loop for Fitur Sistem Blok (CRUD blok, penyesuaian jadwal, jurnal kegiatan guru).

## 🔒 My Identity
- Archetype: teamwork_preview_swe
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_3
- Original parent: parent
- Original parent conversation ID: 14357458-ab41-49cf-ab3e-613c2f7f0bfa

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_3\DISPATCH.md
1. **Decompose**: No decomposition (SWE Light). Entire task is propagated verbatim to implementer, followed by sequential reviewer rounds.
2. **Dispatch & Execute**:
   - Dispatch teamwork_preview_implementer
   - Verify diff and tests independently
   - Reviewer round 1 (teamwork_preview_reviewer)
   - Reviewer round 2 (teamwork_preview_reviewer)
   - Reviewer round 3 (teamwork_preview_reviewer)
   - Audit with teamwork_preview_victory_auditor
3. **On failure**: Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate
4. **Succession**: At >=16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Implementation [pending]
  2. Review Round 1 [pending]
  3. Review Round 2 [pending]
  4. Review Round 3 [pending]
  5. Victory Audit [pending]
- **Current phase**: Phase 1 (Implementation)
- **Current focus**: Dispatch teamwork_preview_implementer

## 🔒 Key Constraints
- Never write, modify, or create source code files yourself.
- Never explore or debug the codebase to solve the task yourself.
- Maintain open issues ledger across all rounds.
- Floor of 3 review rounds + independent test verification + victory auditor before completion.
- Never reuse a subagent after handoff.
- Follow Git Workflow Rule in GEMINI.md automatically.

## Current Parent
- Conversation ID: 14357458-ab41-49cf-ab3e-613c2f7f0bfa
- Updated: not yet

## Key Decisions Made
- SWE Light pattern selected with 1 implementer and minimum 3 reviewer rounds.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Implementer 1 | teamwork_preview_implementer | Implementation of Sistem Blok | in-progress | 3daae40c-3175-4460-b569-364e23b119bc |

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: 3daae40c-3175-4460-b569-364e23b119bc
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 71d2e598-3ae9-4ced-a023-aab2ef50240c/task-9
- Safety timer: 71d2e598-3ae9-4ced-a023-aab2ef50240c/task-29

## Open Issues Ledger
*(Empty)*

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_3\DISPATCH.md — Dispatch instructions
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md — Original request
