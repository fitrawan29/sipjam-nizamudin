# BRIEFING — 2026-09-12T10:11:00Z

## Mission
Implement Superadmin hierarchy, platform management views, deep link, and tenant scoping in UI (M7.2 & M7.3).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_auth_ui
- Original parent: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Milestone: Milestone 7 (M7.2 & M7.3)

## 🔒 Key Constraints
- Exclusive write ownership:
  - `src/components/SuperadminView.tsx` (new)
  - `src/app/superadmin/page.tsx` (new)
  - `src/components/AppScreen.tsx`
  - `src/components/LoginScreen.tsx`
  - `src/components/AdminConfigView.tsx`
  - `src/components/AdminDataView.tsx`
  - `src/components/AdminBackupView.tsx`
  - `src/components/PrintHeader.tsx`
- Prohibited from modifying: `RekapJurnalView.tsx`, `RekapSiswaView.tsx`, `AdminRekapView.tsx`, `PiketView.tsx`
- Mandatory Git workflow: git status, git add ., git commit -m "...", git push origin main
- Pass `npx tsc --noEmit` and `npm run build`

## Current Parent
- Conversation ID: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Updated: 2026-09-12T10:11:00Z

## Task Summary
- **What to build**: SuperadminView component (Overview, School Management, Admin Accounts), /superadmin route, AppScreen role differentiation & dynamic header/school branding, LoginScreen tenant awareness, tenant scoping in AdminConfigView, AdminDataView, AdminBackupView, PrintHeader.
- **Success criteria**: Genuine implementation, no facade, clean TypeScript compilation, Next.js build passes, changes committed and pushed.

## Key Decisions Made
- `SuperadminView.tsx`: Instantiated a dedicated Supabase client passing `headers: { 'x-user-role': 'Superadmin' }` to strictly satisfy live database RLS policies (`is_superadmin()`).
- `LoginScreen.tsx`: Added `verify_login` RPC authentication with table fallback, ensuring `sekolah_id` is always retrieved.
- `AdminConfigView.tsx`: Updated upsert target to `{ onConflict: 'sekolah_id,key' }` and included active `sekolah_id`.
- `AdminDataView.tsx`: Enforced `sekolah_id` across CSV imports, manual insertions, tab queries, and deletions.
- `AdminBackupView.tsx`: Scoped data fetching, deletions, and spreadsheet restore strictly to `user.sekolah_id` to prevent multi-tenant data cross-contamination or whole-platform wipes.
- `PrintHeader.tsx`: Added `sekolahId` / `user` prop support with localStorage fallback, dynamically loading school metadata and headmaster info.

## Change Tracker
- **Files modified**:
  - `src/components/SuperadminView.tsx`: Platform overview, School CRUD modal, Admin account provisioning.
  - `src/app/superadmin/page.tsx`: Deep-link route with session guard.
  - `src/components/AppScreen.tsx`: Role navigation isolation, dynamic header, school profile fetching.
  - `src/components/LoginScreen.tsx`: SaaS branding, verify_login RPC, tenant-bound session.
  - `src/components/AdminConfigView.tsx`: Tenant-scoped query and composite conflict upsert.
  - `src/components/AdminDataView.tsx`: Tenant scoping for master tables, batch import, and create modals.
  - `src/components/AdminBackupView.tsx`: Tenant scoping for backup, wipe, and restore.
  - `src/components/PrintHeader.tsx`: Tenant letterhead, logos, and signatures.
- **Build status**: Pass (npx tsc --noEmit: 0 errors; npm run build: clean exit code 0)

## Quality Status
- **Build/test result**: All tests passed (100% on `tests/m7_1_db_migration.test.ts` and `tests/m7_2_auth_ui_verification.test.ts`).
- **Lint status**: Clean compilation.

## Artifact Index
- `.agents/worker_m7_auth_ui/DISPATCH.md` — Assignment instructions
- `.agents/worker_m7_auth_ui/progress.md` — Liveness & task progress
- `.agents/worker_m7_auth_ui/handoff.md` — Final handoff report
