# Handoff Report — Milestone 1: RBAC, Data Layer, & Superadmin Regional Assignment

## 1. Observation
1. **Model & Interface Types**:
   - `src/types/user.ts`: Lines 1-18 declare `UserRole` and `AppUser` interface with `role: 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | string`, `sekolah_id: string`, and `kota_kabupaten?: string | null`.
   - `src/types/database.ts`: Lines 1639-1675 define `users` table (`Row`, `Insert`, `Update`) with `kota_kabupaten: string | null`.
2. **Database Migration**:
   - `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`: Created with `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kota_kabupaten TEXT;`, `CREATE INDEX IF NOT EXISTS idx_users_kota_kabupaten ON public.users(kota_kabupaten);`, drop existing `users_role_check`, and update `verify_login` RPC returning `kota_kabupaten` and allowing login when `sekolah_id IS NULL` for `role = 'dinas_pendidikan'`.
3. **Target Scope & Read-Only HTTP Guard**:
   - `src/lib/supabaseClient.ts`:
     - Line 17-25: Updated `TenantContext` interface with `kotaKabupaten?: string | null` and `kota_kabupaten?: string | null`.
     - Lines 174-210: Updated `getActiveTargetSchool()`: Allows `roleNorm === 'superadmin' || roleNorm === 'dinaspendidikan'`. When `roleNorm === 'dinaspendidikan'`, verifies that `targetSchool.kota_kabupaten` matches `user.kota_kabupaten` (trimmed, case-insensitive).
     - Lines 360-495: Updated `dynamicTenantFetch` and `masterFetch` with client-side guard rejecting mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) when role is `dinas_pendidikan` (excluding `/rpc/verify_login`), returning HTTP 403 with `{ error: 'Role dinas_pendidikan is read-only. Data mutation prohibited.' }`.
4. **Superadmin Management UI**:
   - `src/components/SuperadminView.tsx`:
     - Lines 20-30: `SuperadminViewProps` updated with `initialTab?: 'overview' | 'jaringan' | 'dinas'` and `onNavigateTab`.
     - Line 45: State `dinasUsers` (`DinasAccount[]`), `dinasSearch`, `loadingDinas`.
     - Lines 125-150: Callback `fetchDinasUsers()` fetching users with `ilike('role', '%dinas%')` from `masterSupabase`.
     - Lines 335-580: Handlers `handleOpenAddDinasUserModal`, `handleEditDinasUser`, and `handleDeleteDinasUser`. The region select dropdown is dynamically populated from distinct `kota_kabupaten` values extracted from registered schools in `satelliteSchools` (`sekolah` / `sekolah_registry`).
     - Accounts created have `role = 'dinas_pendidikan'`, `sekolah_id = null`, and `kota_kabupaten = selectedRegion`.
     - Lines 1290-1310: Added 3rd tab button "Akun Dinas Pendidikan ({dinasUsers.length})" in tab bar.
     - Lines 1855-2045: Rendered full management panel for `activeTab === 'dinas'` with search, statistics, responsive table, and empty state.
5. **Session Synchronization**:
   - `src/app/page.tsx:27` and `src/hooks/useSessionSync.ts:38`: Added `kota_kabupaten` to `.select()` on `users` table so cached session maintains regional assignment.
6. **Command Results**:
   - `npx tsc --noEmit` exited with code 0 (zero errors).
   - Programmatic verification test executing `getActiveTargetSchool` and `dynamicTenantFetch` mutation guard passed all 6 assertions (Superadmin access, Dinas matching region access, case-insensitive trimmed matching, different region blocking, Guru blocking, and HTTP 403 mutation rejection).

## 2. Logic Chain
1. Based on Observation 1 and 2, adding `dinas_pendidikan` and `kota_kabupaten` to `AppUser`, `Database['public']['Tables']['users']`, and the SQL migration ensures consistent schema definition across client and PostgreSQL backend.
2. Based on Observation 3, checking `roleNorm === 'dinaspendidikan'` in `getActiveTargetSchool()` permits regional switching while enforcing strict intra-regional bounds: if a dinas user attempts to switch to a school in a different regency, `getActiveTargetSchool()` returns `null`, preventing cross-regional data contamination.
3. Based on Observation 3, adding the mutation guard to `dynamicTenantFetch` at the fetch interceptor level provides Layer 4 defense-in-depth: any attempt by a dinas session to POST/PUT/PATCH/DELETE data returns HTTP 403 Forbidden with `{ error: 'Role dinas_pendidikan is read-only. Data mutation prohibited.' }`.
4. Based on Observation 4, adding the "Akun Dinas Pendidikan" tab to `SuperadminView.tsx` with dynamic dropdown of distinct `kota_kabupaten` from registered schools enables the Superadmin to assign and manage dinas accounts without manual SQL queries.
5. Based on Observation 6, `npx tsc --noEmit` compiles cleanly with zero errors and all programmatic assertions pass.

## 3. Caveats
- The SQL migration `20261024_dinas_pendidikan_role_and_region.sql` is ready in the repository for deployment to the live Supabase instance; local development environment without live DB connection safely falls back to local and client-side guards.
- Milestone 2 will implement the navigation gating in `AppScreen.tsx` and the executive dashboard UI in `DinasDashboard.tsx`.

## 4. Conclusion
Milestone 1 is completely implemented, verified, and ready for integration:
- Types, data models, and migration file are in place.
- Regional scoping in `getActiveTargetSchool` and read-only mutation prevention in `dynamicTenantFetch` are active and proven by automated test.
- Superadmin regional assignment interface for Dinas Pendidikan accounts is fully functional.
- Zero TypeScript errors (`npx tsc --noEmit` code 0).

## 5. Verification Method
1. Run TypeScript typecheck:
   ```bash
   npx tsc --noEmit
   ```
   Expected: Exit code 0, 0 errors.
2. Run test assertions via `npx tsx`:
   ```bash
   npx tsx -e "
   import assert from 'assert';
   import { setServerTenantContext, setServerActiveTargetSchool, getActiveTargetSchool, dynamicTenantFetch } from './src/lib/supabaseClient';
   setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });
   setServerActiveTargetSchool({ id: 'sch-1', nama: 'SMA 1', kota_kabupaten: 'Kota Kotamobagu' });
   assert.strictEqual(getActiveTargetSchool()?.id, 'sch-1');
   setServerActiveTargetSchool({ id: 'sch-2', nama: 'SMA 2', kota_kabupaten: 'Kab. Boltim' });
   assert.strictEqual(getActiveTargetSchool(), null);
   dynamicTenantFetch('https://example.com/rest/v1/data', { method: 'POST' }).then(r => assert.strictEqual(r.status, 403));
   console.log('PASS');
   "
   ```
   Expected: Prints "PASS" with 0 assertion failures.
