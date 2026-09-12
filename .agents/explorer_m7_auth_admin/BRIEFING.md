# BRIEFING — 2026-09-12T16:56:00+07:00

## Mission
Investigate authentication, user roles, Superadmin & Admin hierarchy, and multi-tenant school dashboard context for Milestone 7.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_auth_admin
- Original parent: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Milestone: Milestone 7 (Auth, Roles, Superadmin & Admin Hierarchy)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Deliver structured handoff report to handoff.md following 5-component format
- Include exact file paths and line numbers in observations
- Reference project files and verify architecture cleanly

## Current Parent
- Conversation ID: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/app/page.tsx`, `src/app/layout.tsx`
  - `src/components/LoginScreen.tsx`, `src/components/AppScreen.tsx`, `src/components/HomeView.tsx`
  - `src/components/AdminConfigView.tsx`, `src/components/AdminDataView.tsx`, `src/components/AdminVerifView.tsx`, `src/components/AdminBackupView.tsx`
  - `src/lib/supabaseClient.ts`, `src/lib/workflow.ts`
  - `src/types/database.ts`
  - `supabase/migrations/*.sql`
  - Supabase MCP tools (`list_tables`, `execute_sql`, `get_publishable_keys`, `list_projects`)
  - `.agents/explorer_m7_db/handoff.md`
- **Key findings**:
  1. Auth: Currently uses custom client-side query against `public.users` table (`username` & plaintext `password`), stored in `localStorage.getItem('sipjam_user')`. No cookies, no Next.js middleware, no AuthContext, `auth.users` is empty (0 rows).
  2. Roles: Stored in `public.users.role`. Currently only `'Admin'` (1 user) and `'Guru'` (13 users). "Piket" is a task/assignment in `penugasan_piket`, not a user role.
  3. Superadmin: Can be added to `public.users.role` with `sekolah_id = NULL`. Seed `superadmin` user (`superadmin123`).
  4. Superadmin Interface: Best implemented as a hybrid architecture (dynamic view in `AppScreen.tsx` when `user.role === 'Superadmin'` + optional deep-link route `/superadmin/page.tsx`). Includes Platform Overview, Sekolah Management (CRUD + status toggle), and Admin Accounts Management (linked to `sekolah_id`).
  5. School Admin Login & Context: When School Admin logs in, `user.sekolah_id` is loaded from `users`, cached in session (`localStorage`), and school profile is retrieved from `public.sekolah`. Dynamic header replaces hardcoded "SMA Nizamudin" with dynamic school name. Sidebar isolates navigation: School Admin only sees school-level menus, Guru only sees teacher menus, Superadmin only sees platform management menus. RLS strictly prevents cross-tenant data access.
- **Unexplored areas**: None. All 5 mission objectives fully investigated with live database queries and code references.

## Key Decisions Made
- Concluded that hybrid architecture (dynamic view switching in `AppScreen.tsx` with dedicated component `SuperadminView.tsx` + route `/superadmin`) is the cleanest, most idiomatic fit for sipjam-app's existing SPA structure.
- Reconciled with `explorer_m7_db` schema to ensure `public.users.sekolah_id` (nullable for Superadmin), `verify_login` RPC, and multi-tenant RLS policies align seamlessly.

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_auth_admin\handoff.md — Full investigation findings and architectural recommendations
