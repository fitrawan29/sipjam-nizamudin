# Dispatch: Security Reviewer (reviewer_m8_security)

## 2026-09-13T05:20:00+08:00
**Assigned Subagent**: `reviewer_m8_security`  
**Archetype**: `teamwork_preview_reviewer`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\reviewer_m8_security`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f`

## MANDATORY INPUT ARTIFACTS
Subagent MUST read:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m7\handoff.md` (previous audit failure)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m8_remediation\handoff.md` (remediation work)
- `supabase/migrations/20260912_fix_rls_integrity.sql`
- `src/lib/supabaseClient.ts`
- `tests/m7_rls_integrity.test.ts`

## OBJECTIVE
Perform independent, adversarial security review of the remediated codebase and live database:
1. Verify database policies in live Supabase DB (`jicvvqxjyzntdrccnuyz`):
   - Zero occurrences of `OR (public.get_auth_user_sekolah_id() IS NULL AND true)` or `OR true` across all 16 tenant tables, `public.users`, and `public.sekolah`.
   - Column default `sekolah_id = public.get_auth_user_sekolah_id()` on all 16 tenant tables.
   - `verify_login` RPC is `SECURITY DEFINER` and does not return `password`.
   - `is_superadmin()` rejects spoofed headers when scoped to a school.
2. Verify empirical anonymous and cross-tenant access rejection:
   - Anonymous clients receive 0 rows from tenant tables and `public.users`.
   - School A cannot read, insert, update, or delete School B data.
3. Run test suites:
   - `npx tsx tests/m7_rls_integrity.test.ts`
   - `npx tsx tests/m7_challenger_rls.test.ts`
4. Deliver verdict in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\reviewer_m8_security\handoff.md`:
   - Must conclude with explicit `APPROVE` or `REQUEST_CHANGES`.
   - Notify parent orchestrator via `send_message`.
