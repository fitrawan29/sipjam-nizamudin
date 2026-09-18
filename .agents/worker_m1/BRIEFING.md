# BRIEFING — 2026-09-18T08:05:03Z

## Mission
Implement Milestone 9 database schema migration (pengaturan Friday & teacher attendance columns, data_guru column, chat_messages table with RLS & realtime, pengumuman_dibaca table with RLS), apply to Supabase, update src/types/database.ts, verify with tsc, and commit/push.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1
- Original parent: 742c922b-4acf-4153-902f-de90d07d6ea8
- Milestone: Milestone 1 — Requirement R1
- Updated Milestone: Milestone 1 — Database Schema & TypeScript Types (Milestone 9)

## 🔒 Key Constraints
- File Ownership: Exclusive write ownership of `src/components/AdminVerifView.tsx` and `src/components/PiketView.tsx`.
- DO NOT modify any other files to avoid collisions with concurrent workers.
- DO NOT CHEAT: Genuine implementations only, maintain real state and real behavior with Supabase.
- Run `npx tsc --noEmit` and `npm run build` to verify clean build.
- Git workflow: status, add, commit, push automatically.
- Milestone 9 constraints:
  - Create migration `supabase/migrations/20260918_milestone9_schema.sql`.
  - Apply migration to Supabase.
  - Update `src/types/database.ts` with new tables and columns.
  - Verification: `npx tsc --noEmit` produces 0 errors.
  - Commit message: `feat(db): add milestone 9 schema for attendance rules, chat, and read tracking`.

## Current Parent
- Conversation ID: a21d5b87-ff2e-4b29-acfe-6e2543e24911
- Updated: 2026-09-18T08:05:03Z

## Task Summary
- **What to build**:
  1. `supabase/migrations/20260918_milestone9_schema.sql`:
     - `pengaturan`: `jam_pulang_jumat TEXT DEFAULT '11:00'`, `guru_hanya_mengajar TEXT DEFAULT '[]'`
     - `data_guru`: `wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE`
     - `chat_messages`: `id`, `sekolah_id`, `sender_id`, `sender_nama`, `recipient_id`, `recipient_nama`, `pesan`, `is_read`, `created_at`, RLS policies, publication `supabase_realtime`
     - `pengumuman_dibaca`: `id`, `sekolah_id`, `pengumuman_id`, `user_id`, `read_at`, RLS policies
  2. Apply migration using Supabase MCP tool / SQL execution.
  3. Update `src/types/database.ts` with typed definitions for new columns and tables.
  4. Run `npx tsc --noEmit`.
  5. Git status, add, commit, and push origin main.
  6. Write handoff report and notify caller.
- **Success criteria**: Zero TypeScript errors (`npx tsc --noEmit`), migration applied to Supabase, clean git push.

## Change Tracker
- **Files modified**:
  - `supabase/migrations/20260918_milestone9_schema.sql`: DDL for pengaturan Friday & teacher attendance columns, data_guru column, chat_messages table with RLS & realtime, and pengumuman_dibaca table with RLS.
  - `src/types/database.ts`: Added chat_messages and pengumuman_dibaca tables, updated data_guru and pengaturan, exported convenience types.
  - `tests/m9_1_database_and_types.test.ts`: Automated test suite for Milestone 1.
- **Build status**: PASS (`npx tsc --noEmit` code 0, test suite code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (TSC 0 errors, 17/17 M9.1 tests pass, full suite pass)
- **Lint status**: Clean
- **Tests added/modified**: `tests/m9_1_database_and_types.test.ts` (17 assertions covering SQL, types, and live DB)

## Loaded Skills
None required.

## Artifact Index
- `.agents/worker_m1/DISPATCH.md` — Assignment dispatch
- `.agents/worker_m1/BRIEFING.md` — Working memory
- `.agents/worker_m1/progress.md` — Liveness and progress tracking
- `.agents/worker_m1/handoff.md` — Final handoff report
- `supabase/migrations/20260918_milestone9_schema.sql` — Schema migration
- `tests/m9_1_database_and_types.test.ts` — Verification test suite
