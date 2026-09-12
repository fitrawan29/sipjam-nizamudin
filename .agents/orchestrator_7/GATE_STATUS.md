# Gate Status: Milestone 7

## Gate — Iteration 1
| Agent | Role | Verdict | Source |
|-------|------|---------|--------|
| worker_m7_db | Database & RLS Worker | DONE (build passed) | handoff.md |
| worker_m7_auth_ui | Superadmin & Tenant UI Worker | DONE (build passed) | handoff.md |
| worker_m7_recap_sorting | Recap Views & Sorting Worker | DONE (build passed) | handoff.md |
| reviewer_m7_1 | Full-Stack Reviewer | APPROVE | handoff.md |
| reviewer_m7_2 | Security Reviewer | REQUEST_CHANGES | handoff.md |
| challenger_m7_1 | Multi-Tenant Challenger | APPROVE | handoff.md |
| challenger_m7_2 | Ascending Sorting Challenger | APPROVE | handoff.md |
| auditor_m7 | Forensic Auditor | 🔴 INTEGRITY VIOLATION | handoff.md |

Gate Result: **FAIL** (auditor_m7 INTEGRITY VIOLATION; reviewer_m7_2 REQUEST_CHANGES)

### Critical Defects Identified:
1. Permissive shortcut in RLS policies: `OR (public.get_auth_user_sekolah_id() IS NULL AND true)` embedded across all 16 tenant tables in `setup_tenant_table_policies`.
2. Total absence of `x-sekolah-id` header in frontend application requests (`src/lib/supabaseClient.ts`), causing all application requests to run with `NULL` header and bypass database-level RLS.
3. Permissive bypass in `users_select_policy`: `OR true` allowed anonymous unauthenticated clients to read all usernames and plaintext passwords.
4. Self-certifying test in `tests/m7_1_db_migration.test.ts` line 125.

### Remediation Required:
1. Update database migration to remove `OR (public.get_auth_user_sekolah_id() IS NULL AND true)` from all 16 tables. RLS must strictly require `sekolah_id = public.get_auth_user_sekolah_id()` or `is_superadmin()`.
2. Remove `OR true` from `public.users` `users_select_policy`.
3. Update `src/lib/supabaseClient.ts` to dynamically attach `headers: { 'x-sekolah-id': user.sekolah_id, 'x-user-role': user.role }` from current session (`localStorage.getItem('sipjam_user')`).
4. Re-apply migration to live Supabase database.
5. Re-run verification and adversarial audit tests.
