# BRIEFING — 2026-09-26T10:01:00Z

## Mission
Investigate authentication flow, user session handling, roles/profiles, Supabase client configs, and database queries/RLS policies to find why admin and teacher accounts cannot retrieve or view data.

## 🔒 My Identity
- Archetype: explorer
- Roles: Auth, Roles & Database/RLS investigation
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2
- Original parent: f963fff1-816c-4a40-9daa-b44715a5d909
- Milestone: Explorer Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze auth flow, session handling, roles/profiles, Supabase client configs, and RLS policies
- Focus on root causes of why admin and teacher accounts cannot retrieve or view data

## Current Parent
- Conversation ID: f963fff1-816c-4a40-9daa-b44715a5d909
- Updated: 2026-09-26T10:01:00Z

## Investigation State
- **Explored paths**:
  - `supabase/migrations/` (20260926_secure_rls_helpers.sql, 20260926_secure_passwords.sql, 20260926_add_uuid_fkeys.sql, 20260912_multi_tenant_sekolah_rls.sql)
  - `src/lib/supabaseClient.ts`, `src/lib/workflow.ts`, `src/lib/attendanceAlpa.ts`, `src/lib/toast.ts`
  - `src/components/LoginScreen.tsx`, `src/app/page.tsx`, `src/components/AppScreen.tsx`, `src/components/HomeView.tsx`, `src/components/AdminDataView.tsx`, `src/components/AdminVerifView.tsx`, `src/components/GuruJurnal.tsx`, `src/components/GuruPresensi.tsx`
  - `pg_policies` and PostgreSQL functions (`verify_login`, `get_auth_user_role`, `get_auth_user_sekolah_id`, `get_auth_user_id`)
  - Live query behavior across `public.users`, `data_guru`, `data_siswa`, `jadwal_pelajaran`
- **Key findings**:
  - Root Cause 1 (Session Token Gating in RLS): Migration `20260926_secure_rls_helpers.sql` strictly restricted `get_auth_user_role()` and `get_auth_user_sekolah_id()` to require `x-session-token` for non-service_role requests. Any cached session in `localStorage` without `session_token` gets treated as Guest with NULL sekolah_id, causing RLS to return 0 rows for all tables.
  - Root Cause 2 (Column Schema Mismatches): Queries in `workflow.ts:217` (`tQ.select('id, nama, username, ...')`) and `AppScreen.tsx:108` (`or(..., nama.eq."...")`) query `data_guru.nama` and `data_guru.username`, which do not exist (the table has `nama_guru` and `nip`), throwing PostgreSQL error `42703`.
  - Root Cause 3 (PostgREST Logic Tree Syntax Breakage): In `GuruJurnal.tsx:105` and `HomeView.tsx:207`, `.or('nip.eq...,nama_guru.ilike.%' + user.nama + '%')` contains unquoted commas when a teacher has academic titles (e.g. `'Tika Mamonto, S.Pd.'`, `'Ade Fitrawan Ibrahim, M.Pd., Gr.'`), triggering `PGRST100: failed to parse logic tree`.
  - Root Cause 4 (Incomplete UUID Backfill & Disconnection): Migration `20260926_add_uuid_fkeys.sql` backfilled only 3 of 51 rows in `jadwal_pelajaran` because of full name vs short name mismatch. `findJadwalForGuru` filtering on `user_id` drops all other schedules.
  - Root Cause 5 (Fallback Direct Fetch in AdminDataView): Direct REST fallback bypasses `dynamicTenantFetch` and sends no `x-session-token`, thus RLS returns empty rows.
- **Unexplored areas**: None, all 5 core survey tasks completed.

## Key Decisions Made
- Documented complete root causes, evidence chains, and proposed surgical fixes across client and database layers.

## Artifact Index
- handoff.md — Final investigation report
- progress.md — Liveness heartbeat
- DISPATCH.md — Task dispatch log
