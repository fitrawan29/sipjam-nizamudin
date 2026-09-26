# BRIEFING — 2026-09-26T18:15:15+08:00

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
- Updated: 2026-09-26T18:15:15+08:00

## Task Summary
- **What to build**: 
  1. Fix `src/app/page.tsx` to handle legacy stored sessions lacking `session_token` by purging `sipjam_user` and routing to login.
  2. Fix `src/lib/workflow.ts`: align `data_guru` query with columns `nama_guru` and `nip`, combine UUID matches and name/fuzzy matches in `findJadwalForGuru` deduplicating by ID, and support historical records where `user_id` might be null.
  3. Fix `src/components/AppScreen.tsx` (line 108) and `src/components/RekapJurnalView.tsx` (line 92) column names from `nama` to `nama_guru` and include `user_id`.
  4. Sanitize teacher names with commas/titles in PostgREST `.or()` filters in `src/components/GuruJurnal.tsx` and `src/components/HomeView.tsx`.
  5. Include session token and school id in `src/components/AdminDataView.tsx` fallback fetch.
  6. Support `sessionToken` in `src/lib/supabaseClient.ts` tenant client helpers.
  7. Database check & backfill for `jadwal_pelajaran`, `data_guru`, and `presensi_guru`.
- **Success criteria**:
  - Zero compilation errors (`npx tsc --noEmit` and `npm run build` pass).
  - Test suites pass (`tests/data_access_roles_verification.test.ts`: 22/22 PASS).
  - Admin and Guru data retrieval verified without RLS errors or data truncation.
  - Working tree clean and pushed to `origin/main`.
- **Interface contracts**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_4\PROJECT.md`
- **Code layout**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_4\PROJECT.md § Code Layout`

## Key Decisions Made
- `findJadwalForGuru` combines both UUID matches and name matches deduplicated by `id`, preventing schedule truncation.
- `cleanTeacherName` scoped at function level in `getGuruDailyState` to sanitize PostgREST `.or()` queries.
- `getTenantSupabaseClient` accepts `sessionToken` directly or via options, falling back to `serverTenantContext`.
- Database backfill executed via Supabase MCP tool: 51/51 schedules and 12/12 data_guru linked with valid `user_id`.

## Artifact Index
- `.agents/teamwork/worker_m1/BRIEFING.md` — Agent briefing & working memory
- `.agents/teamwork/worker_m1/progress.md` — Heartbeat and step progress
- `.agents/teamwork/worker_m1/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**:
  - `src/app/page.tsx`: Purge legacy stored sessions lacking `session_token`.
  - `src/lib/workflow.ts`: Fixed `data_guru` query columns (`nama_guru`, `nip`), combined schedule matching, safe historical query handling.
  - `src/components/AppScreen.tsx`: Replaced non-existent `nama` with `nama_guru` and `user_id`.
  - `src/components/RekapJurnalView.tsx`: Replaced non-existent `nama` with `nama_guru` and `user_id`.
  - `src/components/GuruJurnal.tsx`: Sanitized and quoted PostgREST `.or()` filter for academic titles.
  - `src/components/HomeView.tsx`: Sanitized and quoted PostgREST `.or()` filter for academic titles.
  - `src/components/AdminDataView.tsx`: Added `x-session-token` and `x-sekolah-id` to fallback REST fetch headers.
  - `src/lib/supabaseClient.ts`: Enhanced `getActiveTenantContext` and `getTenantSupabaseClient` for `sessionToken` propagation.
  - `supabase/migrations/20260926_secure_rls_helpers.sql`: Updated helper functions with authenticated `x-user-id` fallback.
  - `supabase/migrations/20260926_add_uuid_fkeys.sql`: Added comprehensive backfill queries.
  - `supabase/migrations/20260926_secure_passwords.sql`: Included `session_token` in `verify_login` return table.
- **Build status**: PASS (`npm run build` and `npx tsc --noEmit` pass with exit code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (22/22 checks in `tests/data_access_roles_verification.test.ts`)
- **Lint status**: Clean
- **Tests added/modified**: Verified all test cases across 4 test suites
