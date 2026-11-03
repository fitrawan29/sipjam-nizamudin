# BRIEFING — 2026-11-03T03:05:40Z

## Mission
Pastikan seluruh logika presensi gerbang piket, absensi wali kelas, alokasi kepulangan, aturan bolos mapel, fallback jurnal KBM, notifikasi WhatsApp orang tua, serta fungsi cetak/export rekap tetap dipertahankan dan bekerja sesuai kesepakatan setelah pembaruan tampilan scan aktual.

## 🔒 My Identity
- Archetype: teamwork_swe
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_1\
- Original parent: parent
- Original parent conversation ID: 252bc2fb-55c3-485f-95e5-a2455cf9b756

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
1. **Decompose**: Do not decompose. Sequential refinement by teamwork_implementer followed by teamwork_reviewer rounds.
2. **Dispatch & Execute**: Direct (iteration loop):
   - teamwork_implementer -> teamwork_reviewer -> teamwork_reviewer -> ... -> teamwork_victory_auditor -> done
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (last resort)
4. **Succession**: At 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Primary implementation (teamwork_implementer) [in-progress]
  2. Review Round 1 (teamwork_reviewer) [pending]
  3. Review Round 2 (teamwork_reviewer) [pending]
  4. Review Round 3 (teamwork_reviewer) [pending]
  5. Audit & Victory (teamwork_victory_auditor) [pending]
- **Current phase**: 1
- **Current focus**: Primary implementation

## 🔒 Key Constraints
- NEVER write, modify, or create source code files yourself. Delegate all implementation and all repair to teamwork_implementer and teamwork_reviewer.
- NEVER explore or debug the codebase in order to solve the task yourself.
- Propagate the task verbatim.
- Floor of 3 review rounds required by pattern.
- Carry open-issues ledger across ALL rounds.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Always follow git workflow rule (status, add, commit, push origin main) on completions.

## Current Parent
- Conversation ID: 252bc2fb-55c3-485f-95e5-a2455cf9b756
- Updated: 2026-11-03T03:05:00Z

## Key Decisions Made
- Initial dispatch: Spawned teamwork_implementer_p1 (f8423675-093d-45cd-adda-7c03c5bf6194) for R1-R4 presensi & absensi logic retention and actual scan time display.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| teamwork_implementer_p1 | teamwork_implementer | Primary Implementation | in-progress | f8423675-093d-45cd-adda-7c03c5bf6194 |

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: [f8423675-093d-45cd-adda-7c03c5bf6194]
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: deb62a4b-7249-487d-b175-09bf52efe57c/task-34
- Safety timer: deb62a4b-7249-487d-b175-09bf52efe57c/task-36

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_1\BRIEFING.md — Briefing & working memory
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_1\progress.md — Progress & heartbeat
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_1\DISPATCH.md — Incoming messages
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_1\handoff.md — Orchestrator handoff report
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md — Original user request
