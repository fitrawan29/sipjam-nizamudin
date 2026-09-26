# BRIEFING — 2026-09-26T18:02:00+08:00

## Mission
Implement genuine fixes for all 5 identified root causes across frontend, workflow logic, Supabase client, and database to restore data access for Admin and Teacher accounts without regressions.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1
- Original parent: f963fff1-816c-4a40-9daa-b44715a5d909
- Milestone: M1 (Core Application & Query Fixes)

## 🔒 Key Constraints
- Genuine fixes only: DO NOT hardcode test results, create dummy/facade implementations, or bypass intended logic.
- Follow minimal change principle: no unnecessary refactoring.
- Adhere to Git Workflow Rule in GEMINI.md upon task completion (git status, git add ., git commit -m "...", git push origin main).
- Preserve existing comments and docstrings.
- Verify compilation and test suite passing.

## Current Parent
- Conversation ID: f963fff1-816c-4a40-9daa-b44715a5d909
- Updated: not yet

## Task Summary
- **What to build**: 
  1. Fix `src/app/page.tsx` to handle legacy stored sessions lacking `session_token`.
  2. Fix `src/lib/workflow.ts` line 217 (`nama_guru`, `nip` instead of `nama`, `username`), resilient `findJadwalForGuru` combining UUID and fuzzy/name matches, and safe presensi/jurnal queries handling null user_id.
  3. Fix `src/components/AppScreen.tsx` (line 108) and `src/components/RekapJurnalView.tsx` (line 92) column names from `nama` to `nama_guru`.
  4. Sanitize teacher names with commas/titles in PostgREST `.or()` filters in `src/components/GuruJurnal.tsx` and `src/components/HomeView.tsx`.
  5. Include session token and school id in `src/components/AdminDataView.tsx` fallback fetch.
  6. Support `sessionToken` in `src/lib/supabaseClient.ts` tenant client helpers.
  7. Check database RLS and backfill unlinked schedules in `jadwal_pelajaran`.
- **Success criteria**:
  - Zero compilation errors (`npx tsc --noEmit` or `npm run build`).
  - Existing tests pass.
  - Verification confirms Admin and Guru can retrieve all data cleanly.
- **Interface contracts**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_4\PROJECT.md`
- **Code layout**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_4\PROJECT.md § Code Layout`

## Key Decisions Made
- Proceed step by step through each target file, inspecting lines before editing.

## Artifact Index
- `.agents/teamwork/worker_m1/BRIEFING.md` — Agent briefing & working memory
- `.agents/teamwork/worker_m1/progress.md` — Heartbeat and step progress
- `.agents/teamwork/worker_m1/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not yet run
- **Lint status**: Clean
- **Tests added/modified**: Pending

## Loaded Skills
- None
