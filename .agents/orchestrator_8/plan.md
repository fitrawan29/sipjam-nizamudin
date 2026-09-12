# Implementation & Remediation Plan: Milestone 7

## Objectives
1. Eliminate all permissive RLS shortcuts (`OR (public.get_auth_user_sekolah_id() IS NULL AND true)`) and credential leaks (`OR true` on `public.users` and `public.sekolah`).
2. Apply hardened SQL migration `supabase/migrations/20260912_fix_rls_integrity.sql` to live Supabase DB.
3. Configure `src/lib/supabaseClient.ts` with dynamic tenant header injection (`dynamicTenantFetch`) reading `localStorage.getItem('sipjam_user')` without breaking SSR or existing callers.
4. Set `DEFAULT public.get_auth_user_sekolah_id()` on all 16 tenant tables to ensure seamless inserts.
5. Deploy authentic adversarial test suite in `tests/m7_rls_integrity.test.ts` and eliminate self-certifying tests in `tests/m7_1_db_migration.test.ts`.
6. Verify all tests pass (`tests/m7_rls_integrity.test.ts`, `tests/m7_1_db_migration.test.ts`, `tests/m7_challenger_rls.test.ts`).
7. Verify typecheck (`npx tsc --noEmit`) and Next.js production build (`npm run build`).
8. Comply with GEMINI.md git workflow: `git status`, `git add .`, `git commit -m "..."`, `git push origin main`.
9. Conduct multi-agent Gate 2 verification (2 Reviewers, 2 Challengers, 1 Forensic Auditor).
10. Achieve clean audit verdict, summarize results, and report victory handoff to Sentinel.
