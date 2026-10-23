# Dispatch for Worker M1 (RBAC, Data Model, & Superadmin Regional Assignment)

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o23_m1`

## Authoritative User Request
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read latest request at 2026-10-23T19:45:33Z)

## Project Scope
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_23\PROJECT.md`

## Input Reports
- Explorer 1 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_1\report.md`
- Explorer 3 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_3\report.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective & Files Owned
Files exclusively owned for M1:
1. `src/types/user.ts`:
   - Verify `AppUser` has `role: 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | string` and `kota_kabupaten?: string | null`.
2. `src/types/database.ts`:
   - Update `users` table type definition to include `kota_kabupaten?: string | null`.
3. `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`:
   - Create migration to add `kota_kabupaten TEXT` column to `public.users` table if not exists.
4. `src/lib/supabaseClient.ts`:
   - Update `getActiveTargetSchool()`: Allow role `'dinas_pendidikan'` (or `'dinas'`) in addition to `'superadmin'`. For `dinas_pendidikan`, enforce that `targetSchool.kota_kabupaten` matches the user's `kota_kabupaten` (trimmed, case-insensitive).
   - In `dynamicTenantFetch` or client interceptor: add client-side guard rejecting mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) when role is `dinas_pendidikan`, returning 403 Forbidden with `{ error: 'Role dinas_pendidikan is read-only. Data mutation prohibited.' }`.
5. `src/components/SuperadminView.tsx`:
   - Add a dedicated Tab / Section / Modal for "Akun Dinas Pendidikan".
   - Allow Superadmin to view list of `dinas_pendidikan` accounts, create new accounts, edit their assigned region (`kota_kabupaten`), and delete/deactivate.
   - The region selection must be a dropdown populated with distinct `kota_kabupaten` values from existing schools in `sekolah` / `sekolah_registry`.
   - Ensure accounts created for dinas have `role = 'dinas_pendidikan'`, `sekolah_id = null`, and `kota_kabupaten = selectedRegion`.

## Verification Commands
Worker MUST run build & typecheck after completing changes:
- `npx tsc --noEmit`
Document commands run and exact outputs in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o23_m1\handoff.md`.


## 2026-10-23T20:08:47Z
Implement Milestone 1:
1. `src/types/user.ts`: AppUser role `dinas_pendidikan` and `kota_kabupaten?: string | null`.
2. `src/types/database.ts`: Update `users` table type definition to include `kota_kabupaten?: string | null`.
3. Create SQL migration `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql` adding `kota_kabupaten TEXT` to `public.users` if not exists.
4. `src/lib/supabaseClient.ts`:
   - In `getActiveTargetSchool()`: allow `dinas_pendidikan` (or `dinaspendidikan`) in addition to `superadmin`. Verify that `targetSchool.kota_kabupaten` matches the user's `kota_kabupaten` (trimmed, case-insensitive).
   - In `dynamicTenantFetch`: add client-side guard rejecting mutating methods (POST, PUT, PATCH, DELETE) when role is `dinas_pendidikan`, returning 403 Forbidden with `{ error: 'Role dinas_pendidikan is read-only. Data mutation prohibited.' }`.
5. `src/components/SuperadminView.tsx`:
   - Add management tab/panel for "Akun Dinas Pendidikan".
   - Allow Superadmin to create/edit/delete `dinas_pendidikan` accounts with assigned `kota_kabupaten` dropdown populated from distinct registered schools (`sekolah` / `sekolah_registry`).
   - Dinas accounts are created with `role = 'dinas_pendidikan'`, `sekolah_id = null`, and `kota_kabupaten = selectedRegion`.
6. Run `npx tsc --noEmit` and verify 0 type errors.
7. Write full details to `handoff.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o23_m1\handoff.md` and notify me via send_message when done.
