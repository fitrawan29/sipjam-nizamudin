# BRIEFING — 2026-10-14T02:26:00Z

## Mission
Mengganti mekanisme presensi Dinas Luar pada guru: dari upload dokumen (Surat Tugas) menjadi pengambilan foto lokasi langsung melalui kamera lengkap dengan watermark waktu & koordinat GPS/lokasi, tanpa batasan radius lokasi dari sekolah.

## 🔒 My Identity
- Archetype: swe_21 (teamwork_preview_swe)
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_21
- Original parent: Sentinel
- Original parent conversation ID: 9bec634d-53a8-4c3e-a76a-e281f410f50f

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_21\DISPATCH.md
1. **Decompose**: No decomposition (SWE Light: sequential refinement on whole task)
2. **Dispatch & Execute**:
   - teamwork_preview_implementer -> produces working diff
   - teamwork_preview_reviewer (Round 1) -> tries to break and fix
   - teamwork_preview_reviewer (Round 2) -> tries to break and fix
   - teamwork_preview_reviewer (Round 3) -> tries to break and fix
   - teamwork_preview_victory_auditor -> post-victory audit
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (last resort)
4. **Succession**: At 16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Implementer: camera selfie capture for Dinas Luar, GPS radius bypass, seamless state transition, GDrive folder routing [pending]
  2. Reviewer Round 1 [pending]
  3. Reviewer Round 2 [pending]
  4. Reviewer Round 3 [pending]
  5. Victory Auditor [pending]
- **Current phase**: 2 (Dispatch & Execute)
- **Current focus**: Implementer dispatch

## 🔒 Key Constraints
- NEVER write, modify, or create source code files yourself. Delegate all implementation and all repair to workers.
- NEVER explore or debug the codebase in order to solve the task yourself.
- Propagate the task verbatim.
- Floor of 3 reviewer rounds.
- Carry open-issues ledger across all rounds.
- Automated tests (npm test), tsc (--noEmit), build (npm run build) must pass.
- Git workflow per GEMINI.md: git status -> git add . -> git commit -> git push.
- Never reuse a subagent after it has delivered its handoff.

## Current Parent
- Conversation ID: 9bec634d-53a8-4c3e-a76a-e281f410f50f
- Updated: 2026-10-14T02:26:00Z

## Key Decisions Made
- Initializing SWE Light sequential refinement workflow.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Implementer | teamwork_preview_implementer | Implementation R1-R4 | completed | 79545c67-acb0-46ff-88ba-3bdd475b7171 |
| Reviewer R1 | teamwork_preview_reviewer | Adversarial Review Round 1 | in-progress | f35d7bdf-eb90-4733-8c49-775c59ed584d |

## Succession Status
- Succession required: no
- Spawn count: 2 / 16
- Pending subagents: f35d7bdf-eb90-4733-8c49-775c59ed584d
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 3e8bd682-e794-4929-9e75-6ca1b41b7e73/task-16
- Safety timer: none

## Artifact Index
- DISPATCH.md — Dispatch instructions and mission requirements
- progress.md — Liveness heartbeat and iteration status
- handoff.md — Final state dump / report
