## 2026-11-06T23:46:27Z
You are challenger_m2_nov_2.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_nov_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Worker Handoff Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_nov\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first.

Your mission is to perform adversarial stress-testing and empirical verification of:
1. **Grade-Level (Tingkat) Isolation & Zero Cross-Grade Leakage**:
   - Write and run empirical stress tests testing dozens of subject and class naming permutations:
     * Roman numerals (`X`, `XI`, `XII`), Arabic numerals (`10`, `11`, `12`), prefix alphanumeric combinations (`10A`, `11B`, `12C`, `X-1`, `XI-IPA`, `XII-IPS`, `X Merdeka`, `XI Merdeka`), Phase E, etc.
   - Verify that when a Class XI subject is selected, ONLY Class XI classes can appear in the dropdown. Zero Class 10 or Class 12 classes!
   - Verify that when a Class X subject is selected, ONLY Class X classes can appear.
   - Verify that when a Class XII subject is selected, ONLY Class XII classes can appear.
   - Test fallback scenarios where teacher has no explicit class in `guru_mapel`: Verify fallback master classes are also strictly filtered by `targetTingkat`.
   - Test parallel classes switching: Verify that parallel classes (e.g. `XI-1` and `XI-2`) both teaching the same mapel preserve `selectedMapel` when switching between them (`stillTeaches`).

Write your stress-test script in `tests/` or execute via `npx tsx`.
Provide your verdict (APPROVE or CHALLENGE_FAILED) in your handoff report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_nov_2\handoff.md`.
Maintain `progress.md` in your working directory.
When finished, notify orchestrator via send_message.

## 2026-11-06T23:54:35Z
**Context**: Checking status on Milestone M2 grade-level isolation empirical stress verification.
**Content**: All other verifiers (reviewer 1, reviewer 2, challenger 1, auditor) have completed with APPROVE / CLEAN verdicts. Please finalize your empirical tests, write handoff.md, and report your verdict.
**Action**: Complete your evaluation and send your verdict to orchestrator.
