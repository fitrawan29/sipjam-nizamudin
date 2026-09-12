# Dispatch: Hardened Superadmin & Test Remediation Worker

## 2026-09-13T05:36:00+08:00
**Assigned Subagent**: `worker_m8_fix_implementation`  
**Archetype**: `teamwork_preview_worker`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m8_fix_implementation`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Authoritative Context & Input Artifacts
Subagent MUST read these files before starting work:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m8_forensic\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m8_multitenant\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_sql\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_adversarial\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_client_tests\handoff.md`

## Required Implementation Actions
1. **SQL Hardening (`supabase/migrations/20260912_fix_rls_integrity.sql`)**:
   - Update `public.is_superadmin()` and `public.get_auth_user_role()` in `supabase/migrations/20260912_fix_rls_integrity.sql` per `explorer_m8_fix_sql/handoff.md`.
   - `is_superadmin()` must strictly require verified `x-user-id` in `public.users` where `role = 'Superadmin' AND sekolah_id IS NULL` (or Supabase Auth JWT claim).
   - `is_superadmin()` must NEVER fall back to raw `x-user-role` header when `x-user-id` is omitted.
   - Apply this hardened SQL to the live Supabase database `jicvvqxjyzntdrccnuyz` via Supabase MCP `execute_sql`.
2. **Adversarial Test Suite (`tests/m7_rls_integrity.test.ts`)**:
   - Update `tests/m7_rls_integrity.test.ts` per `explorer_m8_fix_adversarial/handoff.md` (or copy `.agents/explorer_m8_fix_adversarial/proposed_m7_rls_integrity.test.ts`).
   - Ensures explicit test cases asserting that unauthenticated `{ 'x-user-role': 'Superadmin' }` with NO user ID receives 0 rows from `public.users` and is denied from mutating `public.sekolah` or tenant tables.
3. **Test Suites Pre-Authentication Updates**:
   - Update `tests/m7_challenger_rls.test.ts` per `explorer_m8_fix_client_tests/handoff.md`: authenticate `superadminClient` via `verify_login` and attach verified `x-user-id`.
   - Update secondary test files that initialized `superadminClient` without user ID:
     - `tests/m7_2_auth_ui_verification.test.ts`
     - `tests/m7_3_recap_sorting.test.ts`
     - `tests/m7_challenger_sorting.test.ts`
     - `tests/reviewer_m7_adversarial.test.ts`
4. **Verification**:
   - Execute:
     - `npx tsx tests/m7_rls_integrity.test.ts`
     - `npx tsx tests/m7_challenger_rls.test.ts`
     - `npx tsx tests/m7_3_recap_sorting.test.ts`
     - `npx tsx tests/m7_challenger_sorting.test.ts`
     - `npx tsx --env-file=.env.local tests/m7_2_auth_ui_verification.test.ts`
     - `npx tsx tests/m7_1_db_migration.test.ts`
     - `npx tsc --noEmit`
     - `npm run build`
5. **Git Workflow (GEMINI.md)**:
   - `git status`
   - `git add .`
   - `git commit -m "fix(m7): harden is_superadmin against header spoofing and eliminate credential leaks"`
   - `git push origin main`
6. **Handoff**:
   - Deliver handoff report with raw command outputs in `.agents/worker_m8_fix_implementation/handoff.md`.
   - Notify parent via `send_message`.
