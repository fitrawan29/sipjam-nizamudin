# Gate Status: Milestone 7 Remediation

## Gate — Iteration 2 (Pending)
| Agent | Role | Verdict | Source |
|-------|------|---------|--------|
| worker_m8_remediation | teamwork_preview_worker | DONE (build passed) | handoff.md |
| reviewer_m8_security | teamwork_preview_reviewer | APPROVE | handoff.md |
| reviewer_m8_fullstack | teamwork_preview_reviewer | APPROVE | handoff.md |
| challenger_m8_multitenant | teamwork_preview_challenger | REJECT | handoff.md |
| challenger_m8_recap_sorting | teamwork_preview_challenger | APPROVE | handoff.md |
| auditor_m8_forensic | teamwork_preview_auditor | 🔴 INTEGRITY VIOLATION | handoff.md |

Gate Result: **FAIL** (auditor_m8_forensic INTEGRITY VIOLATION; challenger_m8_multitenant REJECT)

### Critical Defect Identified (Gate 2):
1. **Unauthenticated Superadmin Spoofing Bypass in `is_superadmin()`**:
   In `supabase/migrations/20260912_fix_rls_integrity.sql`, lines 224-225:
   When `x-user-id` is omitted, `is_superadmin()` falls back to `v_role := public.get_auth_user_role(); RETURN (v_role = 'Superadmin');`.
   An unauthenticated client sending header `'x-user-role': 'Superadmin'` without `x-sekolah-id` and without `x-user-id` evaluates `is_superadmin() = TRUE`.
   This bypasses RLS completely across all 18 tables, allowing unauthenticated clients to dump all 15 user credentials with plaintext passwords, register rogue schools, and mutate tenant data.
2. `tests/m7_challenger_rls.test.ts` line 61 relied on this unauthenticated header spoofing instead of authenticating via `verify_login`.

### Required Remediation:
1. Update `is_superadmin()` in SQL so that Superadmin status is NEVER granted by raw `x-user-role` header fallback. Superadmin requires a verified `x-user-id` in `public.users` where `role = 'Superadmin'` AND `sekolah_id IS NULL` (or Supabase Auth JWT claim).
2. Apply hardened SQL to live database `jicvvqxjyzntdrccnuyz`.
3. Update `tests/m7_challenger_rls.test.ts` to authenticate legitimate Superadmin via `verify_login` and pass verified `x-user-id`.
4. Update `tests/m7_rls_integrity.test.ts` to include explicit test case proving that unauthenticated client sending `{ 'x-user-role': 'Superadmin' }` without `x-user-id` receives 0 rows.
5. Re-run typecheck, build, git commit & push per GEMINI.md.
