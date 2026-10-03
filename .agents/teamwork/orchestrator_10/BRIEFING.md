# BRIEFING — 2026-10-03T20:16:55Z

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
  2. M1: Hapus Fitur Chat Guru [in-progress]
  3. M2: QR Code Siswa — Generate & Scan [pending]
  4. M3: PiketView Scanner UI & Laporan Piket [pending]
  5. M4: Laporan Wali Kelas & Sinkronisasi Guru Mapel [pending]
  6. M5: Final Verification, Build & Delivery [pending]
- **Current phase**: 1 (M1 Execution)
- **Current focus**: M1: Hapus Fitur Chat Guru

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
- Completed Survey Phase with 3 Explorers. Updated PROJECT.md with complete architecture, feature inventory, and milestone decomposition.
- Dispatched worker_o10_m1 to execute M1 (Chat removal, AppScreen cleanup, test adjustment).

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_o10_1 | teamwork_preview_explorer | Survey R1: Chat Removal | completed | 283805da-1093-4220-bc8c-e6872e61994c |
| explorer_o10_2 | teamwork_preview_explorer | Survey R2: QR Siswa & Piket | completed | 61765a7a-e594-41d6-a66e-e214b2b2f9d8 |
| explorer_o10_3 | teamwork_preview_explorer | Survey R3 & R4: Reports & Sync | completed | 78db7777-67a9-44c1-a26e-d5a08e6e2e79 |
| worker_o10_m1 | teamwork_preview_worker | M1 Implementation: Chat Removal | in-progress | 5665bf41-d89c-4a49-adb5-639c969aea66 |

## Succession Status
- Succession required: no
- Spawn count: 4 / 16
- Pending subagents: 5665bf41-d89c-4a49-adb5-639c969aea66
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 149f0279-6b23-4179-9bd4-edcb251f34f1/task-20
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10\DISPATCH.md — Task assignment log
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10\BRIEFING.md — Working memory
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10\progress.md — Liveness & status tracking
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md — Global architecture & feature inventory
