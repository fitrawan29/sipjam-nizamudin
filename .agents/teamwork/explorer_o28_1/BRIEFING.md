# BRIEFING — 2026-11-07T08:24:00Z

## Mission
Investigate AdminBackupView.tsx, backup/restore helpers, compare with R5 requirements, and provide concrete code diff recommendations.

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, investigator, reporter
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_1
- Original parent: 8f5aacc7-a6e3-45c5-9d25-d67c36b27ad6
- Milestone: M1 / Investigation (M4 Scope)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze AdminBackupView.tsx and backup/restore architecture
- Map current 33 Supabase tables vs current backup/restore
- Analyze binary photo assets handling and manifest.json
- Formulate topological order (Level 0 - Level 5) for restore
- Produce report.md and handoff.md

## Current Parent
- Conversation ID: 8f5aacc7-a6e3-45c5-9d25-d67c36b27ad6
- Updated: 2026-11-07T08:18:57Z

## Investigation State
- **Explored paths**: `src/components/AdminBackupView.tsx`, `src/types/database.ts`, `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`, `supabase/migrations/`, `src/lib/driveUpload.ts`, `src/lib/imageUrl.ts`, `PROJECT.md`, `tests/menu_consolidation_feature_recovery.test.ts`
- **Key findings**:
  1. `AdminBackupView.tsx` currently only backs up 2 tables (`presensi_guru`, `jurnal_pembelajaran`) and destructively deletes them from DB via Spreadsheet Webhook.
  2. Exactly 33 database entities mapped: 32 tables under `public.Tables` + 1 view under `public.Views` (`guru_kelas`).
  3. Formulated complete 6-level topological ordering (Level 0 - Level 5) to guarantee zero foreign key violations during restore.
  4. Binary photo extraction to `foto/` specified for base64 data URIs in `users.avatar`, `sekolah.logo_url`, `presensi_guru`, and `jurnal_pembelajaran`.
  5. Manifest format `manifest.json` designed with table counts and topological level metadata.
  6. Preserved critical DOM invariant `<div id="view-admin-backup" className="space-y-4 fade-in">`.
- **Unexplored areas**: None. Investigation complete.

## Key Decisions Made
- Formulate concrete line-by-line diff recommendations for `AdminBackupView.tsx` in `report.md`.
- Detail 5-component handoff in `handoff.md`.

## Artifact Index
- `DISPATCH.md` — incoming instructions log
- `report.md` — comprehensive technical analysis & code diff recommendations
- `handoff.md` — 5-component handoff report
- `progress.md` — liveness heartbeat & task checklist
