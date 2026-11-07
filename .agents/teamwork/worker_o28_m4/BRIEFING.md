# BRIEFING — 2026-11-07T08:27:00Z

## Mission
Implement Full System ZIP Backup and Restore in AdminBackupView.tsx with JSZip, covering all 33 database entities, photo asset extraction/restoration, manifest.json, topological order restoration (Levels 0-5), chunked pagination & upsert, and audit logging.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m4
- Original parent: 8f5aacc7-a6e3-45c5-9d25-d67c36b27ad6
- Milestone: Milestone 4 (R5 - Full System ZIP Backup & Restore)

## 🔒 Key Constraints
- Completely non-destructive backup (DO NOT delete or clear data from database).
- Support all 33 entities with pagination range(0, 999) chunked retrieval.
- Extract photo assets (users.avatar, sekolah.logo_url, presensi_guru.link_bukti, jurnal_pembelajaran.foto_kegiatan, laporan_piket.link_foto) to foto/ using compression: 'STORE'.
- Include root manifest.json with appName 'sipjam-app', version '2.0', topologicalLevels, etc.
- Restore strictly Level 0 to Level 5, skipping views (guru_kelas) from upsert.
- Root JSX element MUST remain `<div id="view-admin-backup" className="space-y-4 fade-in">`.
- Props interface MUST remain `{ user }: { user: any }`.
- Run npx tsc --noEmit, npm test, npm run build to verify.
- Git workflow rule: check git status, git add ., git commit -m "...", git push origin main.

## Current Parent
- Conversation ID: 8f5aacc7-a6e3-45c5-9d25-d67c36b27ad6
- Updated: 2026-11-07T08:27:00Z

## Task Summary
- **What to build**: Full System ZIP Backup and Restore in AdminBackupView.tsx + optional helper / src/lib/backupEngine.ts.
- **Success criteria**: JSZip installed, all 33 tables backed up to data/<table_name>.json, photo assets stored in foto/, manifest.json generated, restore process parses ZIP, validates manifest, restores topological levels 0-5 in chunks, typecheck and tests pass, build succeeds.
- **Interface contracts**: PROJECT.md, explorer_o28_1/report.md, explorer_o28_2/report.md, explorer_o28_3/report.md.
- **Code layout**: src/components/AdminBackupView.tsx, src/lib/backupEngine.ts (optional).

## Key Decisions Made
- [TBD - will review explorer reports first]

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m4\DISPATCH.md — Dispatch assignment
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m4\BRIEFING.md — Persistent context & state
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m4\progress.md — Progress log & heartbeat

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Clean
- **Tests added/modified**: Pending

## Loaded Skills
None requested.
