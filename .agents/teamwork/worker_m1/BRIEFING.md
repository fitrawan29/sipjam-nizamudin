# BRIEFING — 2026-10-23T20:01:35Z

## Mission
Milestone 1: RBAC Data Model, Database Migration, Supabase Regional Isolation & Superadmin Regional Assignment for role `dinas_pendidikan`.

## 🔒 My Identity
- Archetype: implementer / qa / specialist
- Roles: [implementer, qa, specialist]
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1
- Original parent: 835d6ca7-b3e2-474a-acf0-423026614449
- Milestone: M1 (Teacher Reminder Snooze, Print Simplification, Camera 4:3 Ratio Lock)
- Re-assigned: 2026-10-11 by parent 1f15a155-9441-412f-8adc-6ac5519d6f4d
- Re-assigned: 2026-10-23 by parent b9c240a0-6ada-4834-ac97-9bf90cc14baf
- Current Milestone: M1 (RBAC, Data Model, & Superadmin Regional Assignment for dinas_pendidikan)

## 🔒 Key Constraints
- Scope & exclusive write ownership:
  - `src/types/user.ts`
  - `src/types/database.ts`
  - `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`
  - `src/lib/supabaseClient.ts`
  - `src/components/SuperadminView.tsx`
- Verification commands:
  - `npx tsc --noEmit`
- Never hardcode test outputs or create facades. Real implementations only.
- Git workflow rule: git status, git add ., git commit -m "...", git push origin dev (never push directly to main).

## Current Parent
- Conversation ID: b9c240a0-6ada-4834-ac97-9bf90cc14baf
- Updated: 2026-10-23T20:01:35Z

## Task Summary
- **What to build**:
  1. `src/types/user.ts`: Update `AppUser` to include role `'dinas_pendidikan'` (or `UserRole` union) and `kota_kabupaten?: string | null`.
  2. `src/types/database.ts`: Update `users` table type definition to include `kota_kabupaten?: string | null` in Row, Insert, and Update.
  3. `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`: Create migration to add `kota_kabupaten TEXT` column to `public.users` table if not exists, and update `verify_login` RPC to return `kota_kabupaten` and accommodate `dinas_pendidikan` role without school restriction.
  4. `src/lib/supabaseClient.ts`:
     - Allow role `'dinas_pendidikan'` in `getActiveTargetSchool()`. Enforce that `targetSchool.kota_kabupaten` matches user's `kota_kabupaten` (trimmed, case-insensitive).
     - In `dynamicTenantFetch`: client-side mutation guard rejecting POST, PUT, PATCH, DELETE when role is `dinas_pendidikan`, returning 403 Forbidden.
  5. `src/components/SuperadminView.tsx`:
     - Add tab / management section for "Akun Dinas Pendidikan".
     - Enable Superadmin to create/edit/delete `dinas_pendidikan` accounts with assigned `kota_kabupaten` dropdown populated from distinct registered schools in `sekolah` / `sekolah_registry`.
     - Dinas accounts are created with `role = 'dinas_pendidikan'`, `sekolah_id = null`, and `kota_kabupaten = selectedRegion`.
- **Success criteria**:
  - `npx tsc --noEmit` passes with 0 errors.
  - Verification of regional matching and mutation rejection.
- **Interface contracts**: PROJECT.md / DISPATCH.md
- **Code layout**: src/types, supabase/migrations, src/lib, src/components

## Key Decisions Made
- [TBD]

## Artifact Index
- `.agents/teamwork/worker_m1/DISPATCH.md`
- `.agents/teamwork/worker_m1/BRIEFING.md`
- `.agents/teamwork/worker_m1/progress.md`
- `.agents/teamwork/worker_m1/handoff.md`

## Change Tracker
- **Files modified**: None yet.
- **Build status**: Pending.
- **Pending issues**: None.

## Quality Status
- **Build/test result**: Pending.
- **Lint status**: Clean.
- **Tests added/modified**: Pending.

## Loaded Skills
- `migration`: Reversible, compatibility-safe schema transitions.
- `ponytail`: Minimal schema diff and backward compatibility.
- `safe-refactor`: Behavior-preserving refactoring with bracketed verification.
