## 2026-09-12T10:11:57Z

<USER_REQUEST>
You are a Challenger subagent for Milestone 7 (Multi-Tenant & RLS Adversarial Challenger).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m7_1

MANDATORY FIRST STEP:
Read the authoritative user request and project scope:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

YOUR MISSION:
Adversarially and empirically stress-test multi-tenant isolation and hierarchy:
1. Write and run an empirical test script (e.g. `tests/m7_challenger_rls.test.ts`) against the live Supabase database.
2. Test cross-tenant data isolation:
   - Create or simulate School A and School B.
   - Verify that queries scoped or session-authenticated for School A CANNOT read, insert, update, or delete records belonging to School B.
3. Test Superadmin workflow:
   - Verify Superadmin can register new schools and create admin accounts linked to schools.
   - Verify non-superadmin users are blocked from creating schools or modifying platform settings.
4. Confirm test results and pass/fail status.

Render an explicit verdict: APPROVE or REQUEST_CHANGES.
Write your full report and test output to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m7_1\handoff.md`.
When done, message orchestrator parent (bedfb7f0-1cec-4949-8c24-27709173b6ec).
</USER_REQUEST>
