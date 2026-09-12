# Dispatch: SQL Remediation Explorer

## 2026-09-13T05:35:00+08:00
**Assigned Subagent**: `explorer_m8_fix_sql`  
**Archetype**: `teamwork_preview_explorer`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_sql`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f`

## MANDATORY INPUT ARTIFACTS
Subagent MUST read the full audit and challenger failure reports without omission:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m8_forensic\handoff.md` (FULL EVIDENCE REPORT)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m8_multitenant\handoff.md` (FULL CHALLENGE REPORT)
- `supabase/migrations/20260912_fix_rls_integrity.sql`

## OBJECTIVE
Analyze the Superadmin header spoofing defect in `public.is_superadmin()`:
1. Review lines 192-227 of `supabase/migrations/20260912_fix_rls_integrity.sql` where `is_superadmin()` falls back to `get_auth_user_role()`.
2. Formulate the exact, idempotent PostgreSQL replacement function for `public.is_superadmin()`:
   - Must reject requests where `public.get_auth_user_sekolah_id() IS NOT NULL`.
   - Must verify `x-user-id` against `public.users` where `role = 'Superadmin' AND sekolah_id IS NULL`.
   - Must NEVER fall back to raw `x-user-role` header when `x-user-id` is missing.
   - If `x-user-id` is missing or invalid, MUST RETURN FALSE.
3. Test the fix via dry-run SQL on live Supabase DB (`jicvvqxjyzntdrccnuyz`) via Supabase MCP `execute_sql`.
4. Output the complete fix plan in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_sql\handoff.md` and notify parent via `send_message`.
