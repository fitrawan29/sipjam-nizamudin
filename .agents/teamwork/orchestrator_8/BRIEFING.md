# BRIEFING — 2026-10-03T07:13:02Z

## Mission
Modifikasi aplikasi SIPJAM (Next.js + Supabase) untuk menyesuaikan orientasi kamera per fitur, restrukturisasi form Jurnal KBM, restrukturisasi tabel cetak rekap jurnal pribadi, dan migrasi database Supabase menggunakan pendekatan minimal (ponytail).

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8
- Original parent: parent (c16732bb-db4e-4115-ae8d-8be2997b0079)
- Original parent conversation ID: c16732bb-db4e-4115-ae8d-8be2997b0079

## 🔒 My Workflow
- **Pattern**: Project / Iteration Loop
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8\PROJECT.md
1. **Decompose**:
   - Survey scope with Explorers
   - M1: Database Migration (apply `kktp`, `konten`, `lokasi_kbm` to `jurnal_pembelajaran`)
   - M2: Implementation (Camera orientation, Form Jurnal KBM 10 fields, Rekap Jurnal print table 10 columns)
   - M3: Verification, Testing, and Git Workflow
2. **Dispatch & Execute**:
   - Direct iteration loop: Explorer → Worker → Reviewer / Challenger → Forensic Auditor → Gate
3. **On failure**:
   - Retry → Replace → Skip → Redistribute → Redesign
4. **Succession**:
   - Spawn count threshold: 16
- **Work items**:
  1. Survey & DB Migration Check [pending]
  2. Implementation: Camera orientation & Jurnal form & Rekap table [pending]
  3. Verification & Git Workflow [pending]
- **Current phase**: 1
- **Current focus**: Survey & DB Migration

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- File-editing tools ONLY for metadata/state files (.md) in .agents/teamwork/ folder.
- Follow Git Workflow Rule (GEMINI.md): git status, git add ., git commit -m "...", git push origin main.
- ATENSI: Baca node_modules/next/dist/docs/ sebelum menulis kode Next.js apapun.
- Ponytail philosophy: Minimal changes, standard libraries, no over-engineering.
- Binary veto on Forensic Auditor failure.

## Current Parent
- Conversation ID: c16732bb-db4e-4115-ae8d-8be2997b0079
- Updated: not yet

## Key Decisions Made
- Project Orchestrator initialized.
- Using direct iteration loop with Explorer → Worker → Reviewer / Challenger / Auditor.
- User corrections applied (2026-10-03T07:17:31Z):
  - Hari/Tanggal display format is DD-MM-YYYY (read-only), stored as YYYY-MM-DD.
  - "Konten" replaces "Materi Pembelajaran".
  - "Kegiatan Pembelajaran" remains separate and required.
  - Pertemuan ke- and Jam ke- removed from form UI (Mapel retained).
  - Print table includes Konten (replacing Materi) and Kegiatan Pembelajaran as separate columns.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_1 | teamwork_preview_explorer | Survey R1 (Camera) & R4 (DB Migration) | completed | 644b496f-f65f-4741-baee-c46210e1ea3f |
| explorer_survey_2 | teamwork_preview_explorer | Survey R2 (GuruJurnal Form Restructuring) | completed | cde156e7-d11f-4476-8855-76a060d16640 |
| explorer_survey_3 | teamwork_preview_explorer | Survey R3 (RekapJurnalView Print Table) | completed | 93b75af9-b712-4372-a192-ffe6ca3d3049 |
| worker_m2 | teamwork_preview_worker | Implementation R1, R2, R3, Migration file & Types | in-progress | 9e08916d-6768-4c92-a4d0-d0b19749837a |

## Succession Status
- Succession required: no
- Spawn count: 4 / 16
- Pending subagents: worker_m2
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: not started
- Safety timer: none

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8\BRIEFING.md — persistent working memory
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8\DISPATCH.md — dispatch message log
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8\PROJECT.md — project scope & architecture
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8\plan.md — operational plan
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8\progress.md — progress heartbeat
