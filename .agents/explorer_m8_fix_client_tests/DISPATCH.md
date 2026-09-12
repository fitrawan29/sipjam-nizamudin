# Dispatch: Client & Test Remediation Explorer

## 2026-09-13T05:35:00+08:00
**Assigned Subagent**: `explorer_m8_fix_client_tests`  
**Archetype**: `teamwork_preview_explorer`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_client_tests`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f`

## MANDATORY INPUT ARTIFACTS
Subagent MUST read the full audit and challenger failure reports without omission:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m8_forensic\handoff.md` (FULL EVIDENCE REPORT)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m8_multitenant\handoff.md` (FULL CHALLENGE REPORT)
- `src/lib/supabaseClient.ts`
- `tests/m7_challenger_rls.test.ts`
- `tests/m7_2_auth_ui_verification.test.ts`

## OBJECTIVE
Analyze test client and frontend client behavior when `is_superadmin()` strictly requires valid `x-user-id`:
1. Inspect line 61 of `tests/m7_challenger_rls.test.ts`:
   - It instantiated `superadminClient` with only `{ 'x-user-role': 'Superadmin' }`.
   - Determine how `superadminClient` should properly authenticate via `verify_login('superadmin', 'superadmin123')` and supply `headers: { 'x-user-id': superadminUser.id, 'x-user-role': 'Superadmin' }`.
2. Inspect `src/lib/supabaseClient.ts`:
   - Verify `dynamicTenantFetch` extracts `user.id` and sets `headers.set('x-user-id', user.id)`. (Line 89 already does this: `if (userId && !headers.has('x-user-id')) headers.set('x-user-id', userId)`).
   - Ensure Superadmin sessions in `localStorage` contain `id` and are properly propagated.
3. Formulate the exact code edits for `tests/m7_challenger_rls.test.ts` and any other test fixtures.
4. Output the complete strategy in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_client_tests\handoff.md` and notify parent via `send_message`.
