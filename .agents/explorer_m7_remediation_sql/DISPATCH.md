## 2026-09-12T10:17:09Z
You are an Explorer subagent for Milestone 7 Remediation (RLS Policy & Database Migration).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_sql

MANDATORY FIRST STEP:
Read the authoritative user request and the full Forensic Auditor & Reviewer reports:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m7\handoff.md (FULL AUDITOR EVIDENCE OF INTEGRITY VIOLATION)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\reviewer_m7_2\handoff.md (FULL REVIEWER EVIDENCE)
- supabase/migrations/20260912_multi_tenant_sekolah_rls.sql

CONTEXT OF FAILURE:
The Forensic Auditor and Reviewer 2 rejected Milestone 7 because:
1. `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql` embedded `OR (public.get_auth_user_sekolah_id() IS NULL AND true)` into all 16 tenant tables, completely bypassing RLS when no header was sent.
2. `users_select_policy` had `OR true`, leaking all plaintext passwords to anonymous queries.

YOUR MISSION:
Design the complete SQL remediation migration `supabase/migrations/20260912_fix_rls_integrity.sql`:
1. Drop the flawed policies on all 16 tenant tables and recreate strict policies:
   - SELECT: `is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id()`
   - INSERT: `WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())`
   - UPDATE: `USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id()) WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())`
   - DELETE: `USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())`
   NO PERMISSIVE FALLBACK `OR (IS NULL AND true)`.
2. Fix `public.users` policies:
   - Remove `OR true` from `users_select_policy`.
   - Ensure `verify_login` RPC (SECURITY DEFINER) continues to allow safe authentication without exposing the entire table to anonymous dumps.
3. Review `public.sekolah` policies.
4. Provide the exact, executable SQL script and verification commands.

DELIVERABLE:
Write your findings and SQL remediation specification to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_sql\handoff.md

When complete, message orchestrator parent (bedfb7f0-1cec-4949-8c24-27709173b6ec).
