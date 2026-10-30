# BRIEFING — 2026-10-30T08:24:50Z

## Mission
Sesuaikan alur presensi dan jurnal kegiatan guru pada sipjam-app: jika guru presensi datang, punya jadwal, tidak isi jurnal, tidak presensi pulang -> status presensi pulang cepat & jurnal kosong otomatis tidak masuk kelas.

## 🔒 My Identity
- Archetype: teamwork_swe
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_40
- Original parent: parent
- Original parent conversation ID: a40a6b30-60e7-4e9f-9f54-f65cb815442c

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
1. **Decompose**: No decomposition (SWE Light: sequential refinement on the full task)
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: teamwork_implementer -> teamwork_reviewer (r1) -> teamwork_reviewer (r2) -> teamwork_reviewer (r3) -> teamwork_victory_auditor
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Primary implementation (teamwork_implementer) [done]
  2. Review Round 1 (teamwork_reviewer) [in-progress]
  3. Review Round 2 (teamwork_reviewer) [pending]
  4. Review Round 3 (teamwork_reviewer) [pending]
  5. Completion Audit (teamwork_victory_auditor) [pending]
- **Current phase**: 2
- **Current focus**: Review Round 1 (teamwork_reviewer)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files yourself. Delegate all implementation and all repair to teamwork_implementer and teamwork_reviewer.
- NEVER explore or debug the codebase in order to solve the task yourself.
- Sequential refinement, no parallel workers. Pass task verbatim.
- Floor of 3 review rounds + personally re-run relevant tests + victory auditor.
- Maintain open-issues ledger across all rounds.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Follow Git workflow rule on completion if required.

## Current Parent
- Conversation ID: a40a6b30-60e7-4e9f-9f54-f65cb815442c
- Updated: 2026-10-30T08:06:37Z

## Key Decisions Made
- Use SWE Light pattern with teamwork_implementer followed by 3 review rounds and victory auditor.
- Primary implementation completed by implementer_1. Tests passed 15/15.
- Dispatched reviewer_r1 (conv ID: b75521f6-d92e-4dbb-a173-34814749ba05).

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| implementer_1 | teamwork_implementer | Primary implementation | completed | 1e81cdf1-d173-488f-afdf-b49fc20e71b9 |
| reviewer_r1 | teamwork_reviewer | Review Round 1 | in-progress | b75521f6-d92e-4dbb-a173-34814749ba05 |

## Succession Status
- Succession required: no
- Spawn count: 2 / 16
- Pending subagents: b75521f6-d92e-4dbb-a173-34814749ba05
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: c3d4309c-4d45-4c83-b827-f8a33baeb128/task-16
- Safety timer: c3d4309c-4d45-4c83-b827-f8a33baeb128/task-61
- On succession: kill all timers before spawning successor
- On context truncation: handle timers as step 4 of the State Recovery section of your prompt says

## Artifact Index
- .agents/teamwork/ORIGINAL_REQUEST.md — Authoritative original user request
- .agents/teamwork/swe_40/DISPATCH.md — Incoming dispatch message
- .agents/teamwork/swe_40/BRIEFING.md — Working memory and status
- .agents/teamwork/swe_40/progress.md — Liveness heartbeat and checklist
- .agents/teamwork/implementer_1/handoff.md — Report from implementer_1
- .agents/teamwork/reviewer_r1/handoff.md — (Pending) Report from reviewer_r1
