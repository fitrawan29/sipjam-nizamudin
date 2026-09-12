# Dispatch: Post-Audit Remediation Worker

## 2026-09-13T05:50:00+08:00
**Assigned Subagent**: `worker_m8_post_audit_fix`  
**Archetype**: `teamwork_preview_worker`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m8_post_audit_fix`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Authoritative Input Artifacts
Subagent MUST read:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\victory_auditor_5\handoff.md` (FULL AUDIT REPORT)
- `src/components/SuperadminView.tsx`
- `src/lib/supabaseClient.ts`
- `tests/reviewer_m7_adversarial.test.ts`

## REQUIRED REMEDIATION ACTIONS
1. **Fix `src/components/SuperadminView.tsx`**:
   - Lines 11-17 currently create a standalone client `const supabase = createClient(...)` with only `{ 'x-user-role': 'Superadmin' }`.
   - Remove this standalone `createClient` instantiation and replace with:
     ```tsx
     import { supabase } from '@/lib/supabaseClient';
     ```
   - Verify that all queries in `SuperadminView.tsx` use the shared `supabase` client from `@/lib/supabaseClient`, which automatically injects `x-user-id` and `x-user-role` from `localStorage.getItem('sipjam_user')` via `dynamicTenantFetch`.
2. **Fix `tests/reviewer_m7_adversarial.test.ts`**:
   - Lines 160 and 169 attempt to insert column `nama_guru` into `jadwal_piket`. Update this to `daftar_guru: ['Guru A']` matching the actual schema definition in `src/types/database.ts`.
3. **Verification**:
   - Execute:
     - `npx tsx .agents/victory_auditor_5/test_superadmin_view.ts` (or equivalent test verifying SuperadminView client can read schools and insert schools)
     - `npx tsx --env-file=.env.local tests/reviewer_m7_adversarial.test.ts` (MUST pass 27/27)
     - `npx tsx tests/m7_rls_integrity.test.ts` (MUST pass 43/43)
     - `npx tsx tests/m7_challenger_rls.test.ts` (MUST pass 47/47)
     - `npx tsx tests/m8_empirical_challenger.test.ts` (MUST pass 42/42)
     - `npx tsc --noEmit` (MUST pass with 0 errors)
     - `npm run build` (MUST pass with exit code 0)
4. **Git Workflow (GEMINI.md)**:
   - `git status`
   - `git add .`
   - `git commit -m "fix(m7): wire SuperadminView to shared supabaseClient and fix jadwal_piket test column"`
   - `git push origin main`
5. **Handoff**:
   - Write `.agents/worker_m8_post_audit_fix/handoff.md` with full command outputs.
   - Notify parent via `send_message`.
