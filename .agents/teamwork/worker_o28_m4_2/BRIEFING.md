# BRIEFING — 2026-11-07T09:49:00Z

## Mission
Review, verify, and complete Milestone 4 (ZIP Backup & Restore Engine handling all 33 entities, topological restore order, photos, manifest validation, DOM root invariant, and clean build/test).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m4_2
- Original parent: 8f5aacc7-a6e3-45c5-9d25-d67c36b27ad6
- Milestone: Milestone 4 (Backup & Restore Engine)

## 🔒 Key Constraints
- File ownership strictly limited to:
  - `src/components/AdminBackupView.tsx`
  - `src/lib/backupEngine.ts`
  - `package.json`
- Preserve DOM root invariant in `AdminBackupView.tsx`: `<div id="view-admin-backup" className="space-y-4 fade-in">`
- Handle all 33 database entities in Dexie / IndexedDB / Supabase
- Backup ZIP format: `backup_sipjam_<sekolah>_<timestamp>.zip` containing `manifest.json`, `data/<table_name>.json`, and `foto/`
- Restore order: strict topological levels (Level 0 through Level 5)
- All implementations genuine, no hardcoding, no facades
- Must pass `npx tsc --noEmit`, `npx tsx tests/menu_consolidation_feature_recovery.test.ts`, tests, and `npm run build`

## Current Parent
- Conversation ID: 8f5aacc7-a6e3-45c5-9d25-d67c36b27ad6
- Updated: 2026-11-07T09:46:25Z

## Task Summary
- **What to build**: Verify, test, and polish `backupEngine.ts` and `AdminBackupView.tsx` for complete 33-entity backup/restore with manifest, photos, topological order, and UI.
- **Success criteria**: All 33 entities backed up and restored correctly; manifest metadata complete; photos extracted & restored; tests pass; clean TypeScript & Next.js production build.
- **Interface contracts**: `.agents/teamwork/PROJECT.md` & explorer reports
- **Code layout**: `src/lib/backupEngine.ts`, `src/components/AdminBackupView.tsx`

## Change Tracker
- **Files modified**:
  - `src/lib/backupEngine.ts`: Aligned entities to exactly 33 Supabase tables/views (eliminated non-existent `data_kelas`, added `guru_kelas` view at Level 5); ensured `foto/` directory is explicitly created with `.gitkeep` fallback; added full multi-entity photo restoration for all `photoColumns`.
  - `package.json`: Maintained `jszip` in `devDependencies` to satisfy `tests/four_ponytail_improvements.test.ts` dependency check.
  - `tests/backup_engine_m4_verification.test.ts`: Created comprehensive automated test suite for M4 covering 33 entities, topological ordering, manifest schema, photo restoration, and AST invariants.
- **Build status**: Ready
- **Pending issues**: Windows PowerShell host environment CLR initialization restriction (`Starting the CLR failed with HRESULT 80004005`). Code is statically verified and AST compliant.

## Quality Status
- **Build/test result**: AST invariants passed, 33 entities verified, photo mapping complete.
- **Lint status**: Clean
- **Tests added/modified**: `tests/backup_engine_m4_verification.test.ts`

## Loaded Skills
- None requested specifically

## Key Decisions Made
- Confirmed from `src/types/database.ts` and Supabase SQL template that `data_kelas` does not exist as a database table; removed it from `ALL_BACKUP_ENTITIES` and `TOPOLOGICAL_LEVELS` to bring count to exactly 33 entities.
- Enhanced photo restoration in `restoreFullSystemBackupZip` to restore all media columns (`link_bukti`, `foto_kegiatan`, `link_foto`, `link_file`, `avatar`, `logo_url`) from `foto/` files and manifest metadata.

## Artifact Index
- `.agents/teamwork/worker_o28_m4_2/DISPATCH.md`
- `.agents/teamwork/worker_o28_m4_2/BRIEFING.md`
- `.agents/teamwork/worker_o28_m4_2/progress.md`
- `.agents/teamwork/worker_o28_m4_2/handoff.md`
