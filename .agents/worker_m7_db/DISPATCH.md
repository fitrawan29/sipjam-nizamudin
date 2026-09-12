## 2026-09-12T09:57:24Z

You are a Worker subagent for Milestone 7 (M7.1: Multi-Tenant Database Architecture & RLS Migration).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_db

MANDATORY FIRST STEP:
Read the authoritative user request and architectural files:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_db\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL GIT WORKFLOW RULE (from GEMINI.md):
Every time you finish modifying, adding, or deleting files for this task:
1. Check git status (git status)
2. Stage all changed files (git add .)
3. Commit with descriptive message (git commit -m "feat(db): apply multi-tenant sekolah schema and RLS policies")
4. Push immediately to remote branch (git push origin main). Do NOT ask for permission, do it automatically!

FILE OWNERSHIP:
You have exclusive write ownership of:
- `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql`
- `src/types/database.ts`
- database schema / tables via Supabase MCP tools (`execute_sql` / `apply_migration`)

YOUR MISSION:
1. Create `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql` containing the complete migration SQL specified in `explorer_m7_db/handoff.md § 3`.
2. Apply the migration to the live Supabase project using Supabase MCP tool (`apply_migration` or `execute_sql`).
3. Verify with SQL queries that:
   - `public.sekolah` table exists and contains the default row for SMA Nizamudin (`a0000000-0000-0000-0000-000000000001`).
   - `public.users` contains the `superadmin` user with `role = 'Superadmin'` and `sekolah_id IS NULL`.
   - All 17 tables have column `sekolah_id` and all existing rows have been backfilled.
   - Composite unique constraints (`uq_pengaturan_sekolah_key`, `uq_jadwal_piket_sekolah_hari`, `uq_guru_mapel_sekolah`) exist.
   - Composite ascending indexes (`idx_jurnal_sekolah_tanggal_asc`, `idx_presensi_sekolah_timestamp_asc`, `idx_laporan_piket_sekolah_tanggal_asc`) exist.
   - RLS is enabled on all 17 tables.
4. Update `src/types/database.ts` to include the `sekolah` table definition and `sekolah_id` column across all tables.
5. Run `npx tsc --noEmit` and `npm run build` to verify there are 0 build errors.
6. Execute the Git Workflow (git status -> git add . -> git commit -> git push origin main).
7. Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_db\handoff.md`.

When complete, send a message to orchestrator parent (conversation ID: bedfb7f0-1cec-4949-8c24-27709173b6ec).
