# Dispatch: Final Security Reviewer

## 2026-09-13T05:42:00+08:00
**Assigned Subagent**: `reviewer_m8_final_security`  
**Archetype**: `teamwork_preview_reviewer`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\reviewer_m8_final_security`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f`

## MANDATORY INPUT ARTIFACTS
Subagent MUST read:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m8_fix_implementation\handoff.md`
- `supabase/migrations/20260912_fix_rls_integrity.sql`
- `tests/m7_rls_integrity.test.ts`
- `tests/m7_challenger_rls.test.ts`

## OBJECTIVE
Perform final security review of the hardened PostgreSQL functions and policies:
1. Live Database Audit (`jicvvqxjyzntdrccnuyz`):
   - Verify `is_superadmin()` strictly requires valid `x-user-id` in `public.users` where `role = 'Superadmin' AND sekolah_id IS NULL`.
   - Verify unauthenticated caller sending `{ 'x-user-role': 'Superadmin' }` without `x-user-id` returns `is_superadmin() -> false`.
   - Verify unauthenticated caller receives 0 rows from `public.users` and cannot mutate `public.sekolah`.
2. Run test suites:
   - `npx tsx tests/m7_rls_integrity.test.ts`
   - `npx tsx tests/m7_challenger_rls.test.ts`
3. Deliver verdict in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\reviewer_m8_final_security\handoff.md`:
   - Explicit verdict: `APPROVE` or `REQUEST_CHANGES`.
   - Notify parent via `send_message`.
