## 2026-09-17T15:36:02Z
You are worker_m7_remediation, a senior full-stack and security remediation worker.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_remediation

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

FULL FORENSIC AUDIT & REVIEW EVIDENCE REPORT (YOU MUST RESOLVE ALL OF THESE ISSUES):
1. Auditor Evidence (auditor_m7_forensic):
   - `npm run build` FAILS with exit code 1.
     Turbopack build error:
     Module not found: Can't resolve 'net' and Can't resolve 'tls' in node_modules/agent-base and node_modules/https-proxy-agent.
     Import trace:
     Client Component Browser:
     node_modules/web-push -> src/lib/vapid.ts -> src/lib/pushClient.ts -> src/components/AccountSettingsModal.tsx, AdminConfigView.tsx, AppScreen.tsx
     Root Cause: `src/lib/pushClient.ts` imports `urlBase64ToUint8Array` from `src/lib/vapid.ts`, which imports `* as webpush from 'web-push'`. This forces Turbopack to bundle the Node.js-only `web-push` library into browser client components!
   - `npm test` FAILS with exit code 1 due to 5 assertion errors in `tests/m6_1_database_and_types.test.ts` on unseeded tables.

2. Security Review Evidence (reviewer_m7_2):
   - Security gap in `update_user_profile` RPC: ensure callers can only update their own record and cannot overwrite arbitrary accounts.
   - Security gap in `push_subscriptions` RLS: remove `OR sekolah_id IS NULL` for tenant users.
   - Role check in `wali_kelas` RLS: ensure only Admin/Superadmin can insert, update, or delete homeroom assignments.

YOUR REMEDIATION MISSION:
1. Fix the Production Build Failure (`src/lib/pushClient.ts` & `next.config.ts`):
   - In `src/lib/pushClient.ts`: Remove `import { urlBase64ToUint8Array } from './vapid';`. Implement `urlBase64ToUint8Array` directly in `src/lib/pushClient.ts` as a pure client-side utility using standard `window.atob` and `Uint8Array`. Ensure `src/lib/pushClient.ts` has ZERO imports from `src/lib/vapid.ts`.
   - In `next.config.ts`: Add `serverExternalPackages: ['web-push']` (under experimental or top-level depending on Next.js 16 configuration) so Next.js treats `web-push` exclusively as a server external package.
   - Run `npm run build` and ensure it completes with exit code 0.
2. Fix `tests/m6_1_database_and_types.test.ts`:
   - Adjust assertions in `tests/m6_1_database_and_types.test.ts` so it validates schema correctness without failing when demo tables are unseeded, or seeds required test rows. Ensure `npm test` passes with exit code 0.
3. Database Security Hardening:
   - Create `supabase/migrations/20260917_security_hardening.sql`:
     - Harden `update_user_profile`: Verify that the user exists and ensure callers cannot arbitrarily take over superadmin accounts.
     - Tighten `push_subscriptions` RLS policy to enforce tenant isolation strictly.
     - Tighten `wali_kelas` mutation policy so only users with role 'Admin' or Superadmin can mutate.
   - Apply migration to Supabase database.
4. Comprehensive Verification:
   - Run `npm run build` -> MUST exit with 0.
   - Run `npm test` -> MUST exit with 0.
   - Run `npx tsx tests/m7_comprehensive_e2e.test.ts` -> MUST exit with 0.
   - Run `npx tsx scripts/test-attendance-sync.ts` -> MUST exit with 0.
   - Run `npx tsc --noEmit` -> MUST exit with 0.
5. Commit and push git changes per GEMINI.md (git status, git add ., git commit -m "...", git push origin main).
6. Write detailed handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_remediation\handoff.md` and message orchestrator_9.
