# Progress Tracking — worker_o19_1

- **Last visited**: 2026-10-10T10:41:00Z
- **Status**: Group 1 completed and verified with `npx tsc --noEmit` (exit code 0). Starting Group 2 (R5, R6, R7).

## Checklist
- [x] Group 1:
  - [x] R1: Remove hardcoded password from `src/app/api/attendance/route.ts` & update `.env.local`
  - [x] R2: Remove duplicate auth in `src/app/page.tsx`
  - [x] R3: Fix isGuru logic in `src/components/HomeView.tsx`
  - [x] R4: Scope realtime channels in `src/components/AdminVerifView.tsx`
  - [x] R8: Preconnect cdnjs in `src/app/layout.tsx`
  - [x] R9: Connectivity check once-flag in `src/lib/supabaseClient.ts`
  - [x] R10: Remove empty directory `src/app/api/sync-spreadsheet`
  - [x] Intermediate validation: `npx tsc --noEmit` (PASSED, exit code 0)
- [ ] Group 2:
  - [ ] R5: Create `src/types/user.ts` and apply to AppScreen, HomeView, LoginScreen, GuruPresensi
  - [ ] R6: Extract 4 hooks from `AppScreen.tsx` to `src/hooks/`
  - [ ] R7: Split `HomeView.tsx` into `HomeViewGuru.tsx`, `HomeViewAdmin.tsx`, and thin `HomeView.tsx`
- [ ] Testing & Build:
  - [ ] Create `tests/r1_r10_ponytail_verification.test.ts`
  - [ ] Update `package.json` test runner to ensure `npm test` exit code 0
  - [ ] Run `npm run build`
- [ ] Git Workflow:
  - [ ] `git status`
  - [ ] `git add .`
  - [ ] `git commit -m "ponytail: security fix, bug fixes, refactor & perf improvements"`
  - [ ] `git push origin main`
- [ ] Completion:
  - [ ] Write `handoff.md`
  - [ ] Send confirmation message to orchestrator
