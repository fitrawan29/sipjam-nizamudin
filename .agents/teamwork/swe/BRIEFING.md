# BRIEFING — 2026-11-02T06:57:00Z

## Mission
Perbaiki mata pelajaran di jadwal pembelajaran agar mata pelajaran yang tidak ada seperti "teknik informasi" tidak dimasukkan dan hanya mata pelajaran valid seperti "informatika" yang digunakan, serta pastikan seluruh data master yang sudah diupload (data siswa, data guru, data jadwal pembelajaran, dan data kelas) tidak diubah atau disentuh sama sekali.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe
- Original parent: parent
- Original parent conversation ID: 7e12b170-dd72-4511-919d-6c30e535ce0a

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: docs/KONSEKUENSI_PELANGGARAN.md
1. **Decompose**: SWE Light pattern - sequential refinement, no decomposition.
2. **Dispatch & Execute**: Direct iteration loop (teamwork_implementer -> teamwork_reviewer -> ... -> teamwork_victory_auditor).
3. **On failure**: Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate.
4. **Succession**: At 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Implement policy document docs/KONSEKUENSI_PELANGGARAN.md [completed]
  2. Koreksi mata pelajaran jadwal pembelajaran & perlindungan data master [in-progress]
- **Current phase**: 2
- **Current focus**: Dispatch teamwork_implementer

## 🔒 Key Constraints
- NEVER write, modify, or create source code files yourself. Delegate all implementation and all repair to teamwork_implementer and teamwork_reviewer.
- NEVER explore or debug the codebase in order to solve the task yourself.
- Propagate task verbatim to workers.
- Run floor of 3 review rounds and verify independently.
- Git workflow rule: commit and push to main.

## Current Parent
- Conversation ID: 9435d357-8091-4442-bb16-f5ebdc424c44
- Updated: 2026-11-02T06:56:54Z

## Key Decisions Made
- Previous task completed and verified.
- Starting new task: Perbaikan mata pelajaran jadwal pembelajaran dan perlindungan data master.
- Sequential refinement pattern: teamwork_implementer -> teamwork_reviewer (r1) -> teamwork_reviewer (r2) -> teamwork_reviewer (r3) -> verification -> teamwork_victory_auditor.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| teamwork_implementer_mapel_r0 | teamwork_implementer | Implement fix for mapel and master data protection | in-progress | c127a6a1-bb82-4322-8413-1d5614b9b2ef |

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: c127a6a1-bb82-4322-8413-1d5614b9b2ef
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 89d07476-3646-4a53-b496-e4d6da3b433f/task-26
- Safety timer: 89d07476-3646-4a53-b496-e4d6da3b433f/task-97

## Artifact Index
- .agents/teamwork/ORIGINAL_REQUEST.md — Original user request
- .agents/teamwork/swe/DISPATCH.md — Dispatch log
- .agents/teamwork/swe/progress.md — Progress and iteration ledger
- .agents/teamwork/swe/handoff.md — Orchestrator handoff report

