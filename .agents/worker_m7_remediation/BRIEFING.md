# BRIEFING — 2026-09-12T17:23:30+07:00

## Mission
Remediate Milestone 7 RLS integrity flaws and client tenant header wiring: apply database migration, configure dynamic tenant headers in client, run adversarial test suite, build/typecheck, commit and push.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_remediation
- Original parent: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Milestone: Milestone 7 Remediation

## 🔒 Key Constraints
- Strict integrity: no cheating, no hardcoded bypasses, no dummy implementations.
- Complete removal of `OR (public.get_auth_user_sekolah_id() IS NULL AND true)` from all 16 tenant tables.
- Complete removal of `OR true` from `public.users` and `public.sekolah` select policies.
- Enforce DEFAULT `public.get_auth_user_sekolah_id()` on `sekolah_id` across all 16 tenant tables.
- Dynamic client header injection via `src/lib/supabaseClient.ts` without breaking SSR or anonymous login lookups.
- Git workflow: `git status`, `git add .`, `git commit`, `git push origin main`.

## Current Parent
- Conversation ID: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Updated: 2026-09-12T17:23:30+07:00

## Task Summary
- **What to build**: Apply hardened SQL migration, wire dynamic headers in supabaseClient.ts, verify with tests/m7_rls_integrity.test.ts, verify build and tsc.
- **Success criteria**: All RLS bypasses eliminated, multi-tenant isolation mathematically enforced in DB, test suite passes 100%, build succeeds, pushed to main.

## Change Tracker
- **Files modified**: TBD
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: tests/m7_rls_integrity.test.ts
