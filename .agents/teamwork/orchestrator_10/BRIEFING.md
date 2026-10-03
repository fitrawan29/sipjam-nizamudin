# BRIEFING — 2026-10-03T20:57:15Z

## Mission
Lead and orchestrate SIPJAM feature modifications: Chat removal, QR siswa generate & scan, attendance reports for Piket & Wali Kelas, and sync to Guru Mapel.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10
- Original parent: Sentinel (top-level)
- Original parent conversation ID: 4313b7e6-a775-4fdc-a5fc-d12a9f6fb15f

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
1. **Decompose**: Survey full scope with 3 parallel Explorers -> Update PROJECT.md -> Decompose into milestones M1-M5.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Explorer (3) -> Worker (1) -> Reviewer (2) -> Challenger (2) -> Auditor (1) -> Gate
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, cancel timers, spawn successor, record ID
- **Work items**:
  1. Survey & Architecture Assessment [completed]
  2. M1: Hapus Fitur Chat Guru [DONE - Gate Passed]
  3. M2: QR Code Siswa — Generate & Scan [DONE - Verified]
  4. M3: PiketView Scanner UI & Laporan Piket [in-progress]
  5. M4: Laporan Wali Kelas & Sinkronisasi Guru Mapel [pending]
  6. M5: Final Verification, Build & Delivery [pending]
- **Current phase**: 3 (M3 Execution)
- **Current focus**: Milestone 3: PiketView Scanner UI & Laporan Piket

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- AGENTS.md: Read node_modules/next/dist/docs/ before writing Next.js code.
- GEMINI.md: git status -> git add . -> git commit -m "..." -> git push origin main.
- Multi-tenant isolation per sekolah_id.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 4313b7e6-a775-4fdc-a5fc-d12a9f6fb15f
- Updated: 2026-10-03T20:08:05Z

## Key Decisions Made
- M1 Gate passed unanimously.
- M2 fully complete and verified (DB migration live, QR format bits ISO/IEC 18004 compliant).
- Heartbeat cron active (task-225).
- Dispatched worker_o10_m3 to implement Milestone 3 (Scan tab in PiketView with dual hardware/camera input, audio feedback, 10-station kiosk concurrency, and daily gate log).

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| worker_o10_m3 | teamwork_preview_worker | M3 Implementation: PiketView Scanner UI & Laporan | in-progress | 331b590a-37dd-41ca-861d-4d041f12725d |

## Succession Status
- Succession required: no
- Spawn count: 17
- Pending subagents: 331b590a-37dd-41ca-861d-4d041f12725d
- Predecessor: none
- Successor: none

## Active Timers
- Heartbeat cron: 149f0279-6b23-4179-9bd4-edcb251f34f1/task-225
- Safety timer: none

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10\DISPATCH.md — Task assignment log
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10\BRIEFING.md — Working memory
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10\progress.md — Liveness & status tracking
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10\GATE_STATUS.md — Gate status tracking
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md — Global architecture & feature inventory
