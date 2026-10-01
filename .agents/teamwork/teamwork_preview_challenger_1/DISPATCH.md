# Task Assignment: Challenger 1 (Adversarial Correctness & Security Verifier)

## Identity
- Archetype: teamwork_preview_challenger
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_challenger_1
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Mission
Perform empirical adversarial stress testing against the solution for Requirements R1 through R6:
1. Write a custom adversarial test script (e.g. `tests/adversarial_challenger_1.test.ts`) that executes edge cases:
   - Attempting to bypass username update as a teacher (verifying rejection or preservation).
   - Invoking `/api/attendance` with missing fields, malformed payloads, and "Izin Terlambat".
   - Verifying geolocation null/error fallback in journal submission.
   - Verifying `merge_accounts.sql` idempotency against duplicate execution.
   - Verifying school mode switching properly toggles the file input.
2. Run your adversarial test suite, plus the full suite `tests/all_requirements_r1_r6_verification.test.ts`.

## Verdict Requirement
Your `handoff.md` must conclude with an unambiguous verdict:
`Verdict: APPROVE` or `Verdict: REQUEST_CHANGES`.
Report back via `send_message` to orchestrator_6.

## 2026-10-01T11:36:51Z
You are Challenger 1. Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_challenger_1\DISPATCH.md, PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md, and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Write tests/adversarial_challenger_1.test.ts to adversarially test edge cases across R1-R6 (username bypass attempts, invalid attendance payloads, geolocation null handling, merge idempotency). Run tests.
Write handoff.md with explicit Verdict: APPROVE or REQUEST_CHANGES. Notify orchestrator_6 via send_message.

