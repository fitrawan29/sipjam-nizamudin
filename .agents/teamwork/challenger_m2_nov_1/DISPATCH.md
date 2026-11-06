## 2026-11-06T23:46:21Z
You are challenger_m2_nov_1.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_nov_1\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Worker Handoff Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_nov\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first.

Your mission is to perform adversarial stress-testing and empirical verification of:
1. **Teacher-First Selection & State Hygiene**:
   - Write and run empirical stress tests verifying that in Admin mode, unselected state (`selectedGuru === ''`) disables Mapel and Kelas selects, prevents premature grade fetching, and renders the empty-state prompt card.
   - Test teacher switching with and without dirty grades: Verify that dirty grades prompt confirmation correctly, that cancelling preserves the previous teacher/grades, and that confirming resets dirty state cleanly.
   - Test switching from teacher A to teacher B to `-- Pilih Guru Pengampu --` (`""`): Verify that downstream selections reset to `""` without leaving orphaned data or dangling class selections.

Write your stress-test script in `tests/` or execute via `npx tsx`.
Provide your verdict (APPROVE or CHALLENGE_FAILED) in your handoff report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_nov_1\handoff.md`.
Maintain `progress.md` in your working directory.
When finished, notify orchestrator via send_message.
