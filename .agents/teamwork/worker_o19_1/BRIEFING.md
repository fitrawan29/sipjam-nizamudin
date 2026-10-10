# BRIEFING — 2026-10-10T10:38:00Z

## Mission
Implementasi perbaikan komprehensif R1 sampai R10 (keamanan, bug korektif, arsitektur, dan performa) dengan pendekatan Ponytail pada aplikasi SIPJAM.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o19_1
- Original parent: 10338150-5928-42f6-aed4-72eb0fc6dd61
- Milestone: milestone_19_ponytail_fixes

## 🔒 Key Constraints
- Ponytail approach: minimal working diff, no new external dependencies, native/existing framework features first.
- Strict Integrity: no hardcoded test assertions, no dummy facades, real implementation.
- Automated git workflow: git status, git add ., git commit -m "ponytail: security fix, bug fixes, refactor & perf improvements", git push origin main.
- Tests & Build: npm test must pass with exit code 0; npm run build must pass with 0 TypeScript errors.

## Current Parent
- Conversation ID: 10338150-5928-42f6-aed4-72eb0fc6dd61
- Updated: 2026-10-10T10:38:00Z

## Task Summary
- **What to build**: 
  - R1: Remove hardcoded superadmin password from `src/app/api/attendance/route.ts` -> `process.env.SUPERADMIN_API_PASSWORD` in `.env.local`.
  - R2: Remove duplicate auth state checking in `src/app/page.tsx`.
  - R3: Fix `isGuru` calculation in `src/components/HomeView.tsx` for Superadmin.
  - R4: Scope realtime channels by `sekolah_id` in `src/components/AdminVerifView.tsx`.
  - R8: Add `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />` in `src/app/layout.tsx`.
  - R9: Add `_connectivityChecked` once-flag in `src/lib/supabaseClient.ts`.
  - R10: Delete empty dead code directory `src/app/api/sync-spreadsheet/`.
  - R5: Create `src/types/user.ts` (`AppUser`) and apply to AppScreen, HomeView, LoginScreen, GuruPresensi.
  - R6: Extract 4 hooks (`useSessionSync`, `useWaliKelas`, `usePiket`, `useBroadcasts`) from `AppScreen.tsx` to `src/hooks/`.
  - R7: Split `HomeView.tsx` into `HomeViewGuru.tsx`, `HomeViewAdmin.tsx`, and a thin `HomeView.tsx` router (< 200 lines).
  - Tests: Create `tests/r1_r10_ponytail_verification.test.ts`, update `package.json` test script to ensure `npm test` exits 0.
  - Build: Verify `npm run build` succeeds.
  - Git commit & push.
- **Success criteria**: All Acceptance Criteria met, tests pass, build passes, pushed to origin main.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Baseline verified by explorer 3 (npm run build passed, npm test had obsolete test failures)
- **Pending issues**: None

## Quality Status
- **Build/test result**: In progress
- **Lint status**: Clean
- **Tests added/modified**: Pending `tests/r1_r10_ponytail_verification.test.ts`

## Loaded Skills
- **Source**: ponytail (C:\Users\Fitra\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md)
- **Core methodology**: Simplest, minimal working code, deletion over addition, no unnecessary boilerplate.
