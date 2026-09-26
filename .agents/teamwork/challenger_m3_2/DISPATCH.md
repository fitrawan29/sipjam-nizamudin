# Dispatch: Challenger 2 (Multi-Tenant & Role Isolation Stress Testing)

## Assigned Task
Adversarially challenge multi-tenant security and cross-role data boundaries:
- Attempt cross-tenant data access (accessing School A data with a School B token or header).
- Verify that student data (`data_siswa`, `absensi`, `nilai_siswa`) cannot be accessed anonymously or mutated without authorization.
- Verify teacher data cannot be accessed or manipulated by unauthorized roles.
- Write and execute empirical tests.

## 2026-09-26T10:16:04Z
You are Challenger 2 (Multi-Tenant & Role Isolation Stress Testing).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_2
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_4\PROJECT.md.

Tasks:
1. Empirically test multi-tenant security and cross-role boundaries:
   - Can an authenticated teacher access admin-only data or mutate unauthorized tables?
   - Can unauthenticated requests read or write to `data_siswa`, `absensi`, `users`?
   - Can forged headers (`x-sekolah-id`, `x-user-role`, `x-user-id`) spoof tenant isolation when using anon key?
2. Construct and run an empirical adversarial test script using `npx tsx`.
3. Report empirical findings in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_2\handoff.md`.
4. State your verdict (CONFIRMED_CORRECT or FAILED) and send a completion message.
