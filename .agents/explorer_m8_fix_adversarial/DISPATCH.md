# Dispatch: Adversarial Test Suite Explorer

## 2026-09-13T05:35:00+08:00
**Assigned Subagent**: `explorer_m8_fix_adversarial`  
**Archetype**: `teamwork_preview_explorer`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_adversarial`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f`

## MANDATORY INPUT ARTIFACTS
Subagent MUST read the full audit and challenger failure reports without omission:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m8_forensic\handoff.md` (FULL EVIDENCE REPORT)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m8_multitenant\handoff.md` (FULL CHALLENGE REPORT)
- `tests/m7_rls_integrity.test.ts`
- `tests/m8_empirical_challenger.test.ts`

## OBJECTIVE
Design the definitive, hostile adversarial test specifications to integrate into `tests/m7_rls_integrity.test.ts`:
1. Craft an explicit test case proving that an unauthenticated client sending:
   ```ts
   headers: { 'x-user-role': 'Superadmin' }
   ```
   (omitting `x-user-id` and `x-sekolah-id`) receives 0 rows from `public.users` and is denied from mutating `public.sekolah` or any tenant table.
2. Craft an explicit test case proving that supplying a forged/non-existent `x-user-id` (e.g. random UUID) alongside `'x-user-role': 'Superadmin'` is rejected with 0 rows.
3. Craft an explicit test case proving that a School Admin's `x-user-id` cannot be used with `'x-user-role': 'Superadmin'` to gain Superadmin access (because `u.sekolah_id IS NOT NULL`).
4. Output the complete test code specification in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_adversarial\handoff.md` and notify parent via `send_message`.
