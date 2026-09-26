# Dispatch: Challenger 1 (Adversarial Stress Testing & Edge Cases)

## Assigned Task
Adversarially challenge the implementation:
- Test edge cases in authentication and data retrieval:
  - Expired, empty, or malicious session tokens
  - Teachers with multiple commas, unusual characters, or whitespace in names
  - Concurrent logins or rotated tokens
  - Boundary cases in `findJadwalForGuru` and `getGuruDailyState`
- Write and execute an adversarial verification script.
- Deliver verdict in `handoff.md`.

## 2026-09-26T10:16:04Z
You are Challenger 1 (Adversarial Stress Testing & Edge Cases).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_1
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_4\PROJECT.md.

Tasks:
1. Empirically challenge edge cases:
   - Stale/corrupt localStorage sessions (e.g. invalid JSON, missing session_token, expired token, malformed UUID).
   - Teachers with unusual names, multiple commas, degrees (e.g. `"Dr. Ir. Fitra, S.Pd., M.Pd., Gr."`).
   - Boundary cases in `findJadwalForGuru` and `getGuruDailyState`.
2. Construct and run an adversarial test script using `npx tsx`.
3. Report empirical findings and results in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_1\handoff.md`.
4. State your verdict (CONFIRMED_CORRECT or FAILED) and send a completion message.

