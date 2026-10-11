# BRIEFING — 2026-10-10T22:57:32Z

## Mission
Rombak modul daftar nilai (GradebookView.tsx) alur CP → TP → Asesmen (Diagnostik/Formatif/Sumatif) → Nilai Akhir (R1-R5).

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_20
- Original parent: parent
- Original parent conversation ID: 6c21b6ba-4f4f-4397-97bb-a7c28ef37865

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
1. **Decompose**: Survey (3 Explorers) → Feature Inventory → Decomposition into Milestones & Interface Contracts
2. **Dispatch & Execute**:
   - Dual Track: Implementation Track + E2E Testing Track
   - Milestones: Explorer → Worker → Reviewer / Challenger / Auditor loop
3. **On failure**: Retry → Replace → Skip → Redistribute → Redesign
4. **Succession**: Threshold 16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Survey & Architecture Exploration [in-progress]
  2. Database & Types (capaian_pembelajaran, keterangan, bobot_nilai_mapel) [pending]
  3. CP & TP Management in GradebookView [pending]
  4. Assessment per TP (Diagnostik, Formatif, Sumatif) & Keterangan [pending]
  5. Nilai Akhir Formula & Kehadiran Integration & Rekap [pending]
  6. Admin Bobot Settings [pending]
  7. Verification, E2E Testing, Build & Git Push [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Surveying codebase and specifications with 3 explorers

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level directly — dispatch Explorers.
- Audit verdict is a binary veto — violation means failure unconditionally.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Always include path to ORIGINAL_REQUEST.md in every subagent dispatch.
- Mandatory integrity warning in Worker prompts.
- Ponytail principle: minimal schema diff, minimal bloat.
- Git workflow rule: git status, git add ., git commit -m "...", git push origin main when complete.

## Current Parent
- Conversation ID: 6c21b6ba-4f4f-4397-97bb-a7c28ef37865
- Updated: 2026-10-10T22:57:32Z

## Key Decisions Made
- Chose Project Pattern with Survey phase using 3 Explorers.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|

## Succession Status
- Succession required: no
- Spawn count: 0 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: not started
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative user requirements
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_20\DISPATCH.md — Dispatch instructions
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_20\progress.md — Progress tracker
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md — Global project architecture & milestones
