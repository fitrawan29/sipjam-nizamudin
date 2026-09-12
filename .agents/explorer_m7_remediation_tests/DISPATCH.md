## 2026-09-12T10:17:09Z
You are an Explorer subagent for Milestone 7 Remediation (Adversarial RLS Testing).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_tests

MANDATORY FIRST STEP:
Read the authoritative user request and the full Forensic Auditor report:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m7\handoff.md (FULL AUDITOR EVIDENCE)
- tests/m7_1_db_migration.test.ts

CONTEXT OF FAILURE:
The auditor noted that previous tests were self-certifying (querying non-existent UUIDs to claim RLS isolation).

YOUR MISSION:
Design an authentic, exhaustive adversarial test script for `tests/m7_rls_integrity.test.ts` that will independently prove:
1. Unauthenticated / anonymous client with NO headers receives 0 rows and is rejected on INSERT/UPDATE/DELETE on tenant tables.
2. Anonymous client CANNOT dump passwords or user records from `public.users`.
3. School A client (with `x-sekolah-id: School A`) CANNOT see, insert, update, or delete School B's rows when School B actually has data in the table.
4. School Admin CANNOT escalate to Superadmin by spoofing headers.
5. Provide the exact test script code.

DELIVERABLE:
Write your findings and test specification to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_tests\handoff.md

When complete, message orchestrator parent (bedfb7f0-1cec-4949-8c24-27709173b6ec).
