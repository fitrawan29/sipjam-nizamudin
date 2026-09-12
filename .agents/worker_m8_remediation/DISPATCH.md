# Dispatch: Remediation Implementation Worker

## 2026-09-13T05:16:00+08:00
**Assigned Subagent**: `worker_m8_remediation`  
**Archetype**: `teamwork_preview_worker`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m8_remediation`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f` (orchestrator_8)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Authoritative Context & Input Artifacts
Subagent MUST read these files before starting work:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m7\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_sql\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_client\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_tests\handoff.md`

## Required Actions
1. **Database Migration (`supabase/migrations/20260912_fix_rls_integrity.sql`)**:
   - Create/finalize `supabase/migrations/20260912_fix_rls_integrity.sql` based on the SQL explorer's specification.
   - Strictly remove `OR (public.get_auth_user_sekolah_id() IS NULL AND true)` from all 16 tenant tables.
   - Strictly remove `OR true` from `public.users` and `public.sekolah`.
   - Ensure `ALTER TABLE public.<table_name> ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();` is applied to all 16 tables.
   - Apply the migration to the live Supabase database (using Supabase MCP `execute_sql` with project_ref `jicvvqxjyzntdrccnuyz`, or running a migration execution script).
2. **Frontend Client (`src/lib/supabaseClient.ts`)**:
   - Implement `dynamicTenantFetch` interceptor that reads `localStorage.getItem('sipjam_user')` and sets `x-sekolah-id` and `x-user-role`.
   - Provide fallback support for SSR/Node contexts (`getActiveTenantContext`, `setServerTenantContext`, `getTenantSupabaseClient`).
3. **Tests (`tests/m7_rls_integrity.test.ts` & `tests/m7_1_db_migration.test.ts`)**:
   - Write/update `tests/m7_rls_integrity.test.ts` with authentic 4-tier adversarial checks.
   - Fix any self-certifying tests in `tests/m7_1_db_migration.test.ts`.
4. **Verification**:
   - Execute:
     - `npx tsx tests/m7_rls_integrity.test.ts`
     - `npx tsx tests/m7_1_db_migration.test.ts`
     - `npx tsx tests/m7_challenger_rls.test.ts`
     - `npx tsc --noEmit`
     - `npm run build`
5. **Git Workflow (GEMINI.md)**:
   - `git status`
   - `git add .`
   - `git commit -m "fix(m7): remediate RLS integrity, wire tenant headers, and harden multi-tenant security"`
   - `git push origin main`
6. **Handoff**:
   - Write `.agents/worker_m8_remediation/handoff.md` containing all command outputs, verification results, and git push confirmations.
   - Notify parent orchestrator via `send_message`.
