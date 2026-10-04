# BRIEFING — 2026-10-04T07:25:50Z

## Mission
Sesuaikan hak akses modul Piket (jadwal hari ini), batasi rekapitulasi presensi hanya untuk Wali Kelas & buka akses kehadiran mapel untuk Guru Mapel, sesuaikan format cetak dokumen Guru (identik Admin, sembunyikan tombol/robot UI melayang, pertahankan watermark), dan tambahkan fitur download kartu presensi QR siswa di Admin.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_13
- Original parent: parent
- Original parent conversation ID: 5d236340-098a-4028-b588-33f103f83eb9

## 🔒 My Workflow
- **Pattern**: Project Pattern (Survey → Assess → Decompose & Delegate / Iterate)
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_13\PROJECT.md
1. **Decompose**: Survey completed (3 Explorers). Milestones defined: M1 (Piket & Wali Kelas Access), M2 (Print Layout & Watermark), M3 (Student QR Card Download), M4 (Verification, Review, Challenger, Forensic Audit & Git Delivery).
2. **Dispatch & Execute**:
   - Survey phase: 3 Explorers completed.
   - Implementation phase: Dispatched 3 Workers in parallel with strict file boundaries:
     - worker_m1 (M1): workflow.ts, AppScreen.tsx, PiketView.tsx, RekapSiswaView.tsx
     - worker_m2 (M2): globals.css, AIAssistant.tsx, DokumenView.tsx, RekapJurnalView.tsx
     - worker_m3 (M3): qrSiswa.ts, AdminDataView.tsx
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Threshold 16 spawns. When count >= 16 and subagents complete, write handoff.md, kill timers, spawn successor.
- **Work items**:
  1. Survey codebase & requirements [done]
  2. Architecture & decomposition into PROJECT.md [done]
  3. M1: Piket access restriction by schedule [in-progress]
  4. M2: Rekap presensi restriction for Wali Kelas vs Guru Mapel [in-progress]
  5. M3: Print layout alignment, hide robot/UI buttons, keep watermark [in-progress]
  6. M4: Download QR student card in Admin [in-progress]
  7. M5: Acceptance verification (tsc, build), Review, Challenger, Forensic Audit, Git Push [pending]
- **Current phase**: 2 (Implementation)
- **Current focus**: Parallel implementation of M1, M2, M3 by 3 dedicated Workers

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/teamwork/ folder.
- AUDIT VETO: Forensic Auditor INTEGRITY VIOLATION is an unconditional failure veto.
- Git Workflow Rule (GEMINI.md): git status, git add ., git commit -m "...", git push origin main automatically upon task completion.
- Acceptance criteria: tsc --noEmit 0 error, npm run build successful.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 5d236340-098a-4028-b588-33f103f83eb9
- Updated: 2026-10-04T07:15:00Z

## Key Decisions Made
- Survey completed across all requirements R1-R4.
- Dispatched 3 Workers simultaneously with mutually exclusive write boundaries.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_1 | teamwork_preview_explorer | Survey R1 & R2 | completed | 77b40af0-5ac2-41be-9fea-bfd734e85b51 |
| explorer_survey_2 | teamwork_preview_explorer | Survey R3 | completed | 31748879-b841-42f3-a3f7-5ad637b98929 |
| explorer_survey_3 | teamwork_preview_explorer | Survey R4 | completed | bf5718b6-fc62-4c47-b4d2-5edc32a8dfa7 |
| worker_m1 | teamwork_preview_worker | Milestone 1 (R1 & R2) | in-progress | 5d487334-45d6-40b3-9aa1-04162731bc14 |
| worker_m2 | teamwork_preview_worker | Milestone 2 (R3) | in-progress | d3996415-2dc4-4bc9-870d-ce4dfb55f91a |
| worker_m3 | teamwork_preview_worker | Milestone 3 (R4) | in-progress | c345af01-1114-4ce8-9ea2-f398568fb267 |

## Succession Status
- Succession required: no
- Spawn count: 6 / 16
- Pending subagents: 5d487334-45d6-40b3-9aa1-04162731bc14, d3996415-2dc4-4bc9-870d-ce4dfb55f91a, c345af01-1114-4ce8-9ea2-f398568fb267
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-18
- Safety timer: none

## Artifact Index
- .agents/teamwork/orchestrator_13/BRIEFING.md — persistent working memory
- .agents/teamwork/orchestrator_13/DISPATCH.md — dispatch instructions
- .agents/teamwork/orchestrator_13/progress.md — liveness and progress tracking
- .agents/teamwork/orchestrator_13/PROJECT.md — scope, feature inventory, milestones, contracts
- .agents/teamwork/ORIGINAL_REQUEST.md — user request record
- .agents/teamwork/explorer_survey_1/handoff.md — R1 & R2 survey report
- .agents/teamwork/explorer_survey_2/handoff.md — R3 survey report
- .agents/teamwork/explorer_survey_3/handoff.md — R4 survey report
