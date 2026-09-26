# BRIEFING — 2026-09-26T09:48:00Z

## Mission
Investigate frontend data retrieval, dashboard pages, components, API routes, and server actions for Admin, Teacher (Guru), and Student (Siswa) to identify why admin and teacher accounts cannot read their data following a recent update.

## 🔒 My Identity
- Archetype: explorer
- Roles: frontend investigator, role flow analyzer, evidence synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3
- Original parent: f963fff1-816c-4a40-9daa-b44715a5d909
- Milestone: survey & root cause analysis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement fixes directly
- Investigate frontend pages, components, queries, API routes, server actions, and differences between roles
- Provide exact file paths, line numbers, and logic chain
- Output handoff report to `handoff.md` and keep `progress.md` updated

## Current Parent
- Conversation ID: f963fff1-816c-4a40-9daa-b44715a5d909
- Updated: not yet

## Investigation State
- **Explored paths**: `src/app/page.tsx`, `src/app/superadmin/page.tsx`, `src/components/AppScreen.tsx`, `src/components/HomeView.tsx`, `src/components/AdminDataView.tsx`, `src/components/AdminVerifView.tsx`, `src/components/AdminRekapView.tsx`, `src/components/AdminConfigView.tsx`, `src/components/GuruPresensi.tsx`, `src/components/GuruJurnal.tsx`, `src/components/PiketView.tsx`, `src/components/RekapSiswaView.tsx`, `src/components/GradebookView.tsx`, `src/lib/supabaseClient.ts`, `src/lib/workflow.ts`, `supabase/migrations/20260926_secure_rls_helpers.sql`
- **Key findings**:
  1. Frontend is an SPA where views are managed via `currentView` in `AppScreen.tsx`.
  2. Data fetching uses direct `supabase.from(...)` intercepted by `dynamicTenantFetch` in `src/lib/supabaseClient.ts`.
  3. Migration `20260926_secure_rls_helpers.sql` restricted RLS helper functions (`get_auth_user_role`, `get_auth_user_sekolah_id`) to strictly require `x-session-token` for anon requests.
  4. Users with legacy sessions stored in `localStorage['sipjam_user']` lack `session_token`. When loaded in `page.tsx`, no `x-session-token` is sent, causing RLS to evaluate `sekolah_id = NULL` -> 0 rows returned silently for all tables.
  5. In `src/lib/workflow.ts`, `data_guru` was queried with non-existent columns `nama` and `username` instead of `nama_guru` and `nip`.
- **Unexplored areas**: None. Root cause empirically reproduced and verified across Admin, Guru, and Siswa.

## Key Decisions Made
- Confirmed that student (Siswa) data access is tied to the authenticated user's session token; there is no student login portal.
- Empirically proved that fresh logins with `session_token` retrieve all rows, while legacy sessions return 0 rows.

## Artifact Index
- `.agents/teamwork/explorer_survey_3/handoff.md` — Comprehensive 5-component handoff report
- `.agents/teamwork/explorer_survey_3/verify_failure_modes.ts` — Automated script proving failure modes
- `.agents/teamwork/explorer_survey_3/simulate_role_flow.ts` — Full role flow simulation script
- `.agents/teamwork/explorer_survey_3/test_riski.ts` — Guru query verification script

