# BRIEFING — 2026-09-12T16:54:30+07:00

## Mission
Investigate database architecture of sipjam-app, enumerate tables, analyze RLS & foreign keys, design `sekolah` table and multi-tenant schema with native Supabase RLS, and provide concrete SQL migration scripts.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer, investigator, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_db
- Original parent: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Milestone: Milestone 7 (Multi-Tenant Database Architecture & RLS)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement application source code changes
- Provide comprehensive, concrete SQL migration scripts & RLS policy definitions
- Write only to own folder (.agents/explorer_m7_db)

## Current Parent
- Conversation ID: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Updated: 2026-09-12T16:54:30+07:00

## Investigation State
- **Explored paths**:
  - `supabase/migrations/*` (4 migrations: guru_mapel, jurnal 8 kolom, m6 overhaul, riski jadwal)
  - `src/lib/supabaseClient.ts`, `src/types/database.ts`
  - `src/components/LoginScreen.tsx`, `AppScreen.tsx`, `AdminConfigView.tsx`, `AdminDataView.tsx`
  - Supabase MCP `list_tables`, `execute_sql` on `pg_policies`, `information_schema`, `pengaturan`, `users`
- **Key findings**:
  - 17 tables exist in public schema, 13 currently have RLS disabled.
  - 4 tables had permissive `USING (true)` policies.
  - Conflicting single-tenant UNIQUE constraints identified on `pengaturan(key)`, `jadwal_piket(hari)`, and `guru_mapel(nip, nama_mapel)`.
  - Default school identity extracted from `pengaturan`: SMA Nizamudin, NPSN 70040625, Boltim.
  - Designed full migration strategy with deterministic UUID `a0000000-0000-0000-0000-000000000001`.
  - Formulated 5-tier fallback security helper functions (`get_auth_user_sekolah_id`, `get_auth_user_role`, `is_superadmin`) and complete RLS policy suite.
- **Unexplored areas**: None for DB exploration scope; handed off for implementation.

## Key Decisions Made
- Multi-tenancy architecture will use native Supabase RLS with hybrid fallback (JWT claim + auth.uid + PostgREST header x-sekolah-id) to support seamless migration without breaking current client session.
- Backfill all historical records to default school UUID `a0000000-0000-0000-0000-000000000001`.
- Replace single-tenant UNIQUE constraints with composite `(sekolah_id, key/hari/mapel)`.
- Ascending indexes added on `(sekolah_id, tanggal/timestamp ASC)` for Requirement 3.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness & status tracking
- handoff.md — Comprehensive database exploration, architecture & SQL migration report
