# Task Assignment: Reviewer 2 (Robustness, Security & Performance Review)

## Identity
- Archetype: teamwork_preview_reviewer
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_reviewer_2
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Mission
Perform an independent, adversarial code review focusing on:
1. Security & authorization: Verify that username locking (R5) cannot be bypassed from frontend or backend RPC `update_user_profile`. Verify that only Admin/Superadmin can modify teacher usernames.
2. Robustness & edge cases: Geolocation fallbacks (R4), avatar file size checking (<1MB) (R2), backward-compatible attendance statuses (R3), school journal mode default handling (R6).
3. Database integrity: Safe foreign key migrations before deletions in `merge_accounts.sql` (R1).
4. Run verification tests:
   - `npx tsx tests/all_requirements_r1_r6_verification.test.ts`
   - `npx tsc --noEmit`
   - `npm run build`

## Verdict Requirement
Your `handoff.md` must conclude with an unambiguous verdict:
`Verdict: APPROVE` or `Verdict: REQUEST_CHANGES` (with explicit reasons).
Report back via `send_message` to orchestrator_6.

## 2026-10-01T11:36:51Z
You are Reviewer 2. Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_reviewer_2\DISPATCH.md, PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md, and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Review robustness, security, and edge cases across R1-R6 (username locking, geolocation fallbacks, avatar size checks, school mode enforcement). Run verification tests.
Write handoff.md with explicit Verdict: APPROVE or REQUEST_CHANGES. Notify orchestrator_6 via send_message.
