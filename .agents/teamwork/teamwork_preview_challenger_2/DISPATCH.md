# Task Assignment: Challenger 2 (Empirical State & UI Reactivity Verifier)

## Identity
- Archetype: teamwork_preview_challenger
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_challenger_2
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Mission
Perform empirical adversarial stress testing on Reactivity and UI contract integrity:
1. Write an adversarial test script (e.g. `tests/adversarial_challenger_2.test.ts`) that verifies:
   - Avatar reactivity: data URLs, large base64 strings, SVG fallbacks, `onUserUpdated` invocation without full reload.
   - School mode DOM isolation: verify that in `camera_only` mode, the DOM cannot contain the file input.
   - GPS coordinate precision and negative values (Southern hemisphere / Eastern hemisphere coordinates).
   - "Izin Terlambat" vs "Terlambat" legacy coexistence in attendance state.
2. Execute your test script and report all assertion outputs.

## Verdict Requirement
Your `handoff.md` must conclude with an unambiguous verdict:
`Verdict: APPROVE` or `Verdict: REQUEST_CHANGES`.
Report back via `send_message` to orchestrator_6.

## 2026-10-01T11:36:51Z
You are Challenger 2. Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_challenger_2\DISPATCH.md, PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md, and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Write tests/adversarial_challenger_2.test.ts to adversarially stress test UI reactivity, large base64 avatar images, school mode DOM isolation (ensuring no file input when camera_only), and negative/boundary GPS coordinates. Run tests.
Write handoff.md with explicit Verdict: APPROVE or REQUEST_CHANGES. Notify orchestrator_6 via send_message.
