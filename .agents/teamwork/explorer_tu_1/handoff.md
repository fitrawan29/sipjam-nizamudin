# Handoff Report: Investigation for Role Tata Usaha (TU) — Auth, Role Types, Sessions, and User Management

**Agent**: `explorer_tu_1`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_tu_1\`  
**Target Request**: Penambahan role `tata_usaha` (TU) serta perintilannya untuk aplikasi SIPJAM dengan pendekatan `/ponytail` (solusi paling ringkas, tepat guna tanpa over-engineering).

---

## 1. Observation

### 1.1 Role Type Definitions & Database Schema
1. **`src/types/user.ts` (lines 1, 7)**:
   ```typescript
   export type UserRole = 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | string;

   export interface AppUser {
     id: string;
     username: string;
     nama: string;
     role: 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | string;
     sekolah_id: string;
     session_token: string;
     avatar?: string | null;
     wali_kelas?: string | { kelas: string } | null;
     nip?: string;
     name?: string;
     penugasan?: any;
     kota_kabupaten?: string | null;
     [key: string]: any;
   }
   ```
2. **`src/types/database.ts` (lines 1672–1715, 1835, 2171)**:
   - Line 1679: `role: string | null` in `users.Row`.
   - Line 1690: `role?: string | null` in `users.Insert`.
   - Line 1701: `role?: string | null` in `users.Update`.
   - Line 1835: `get_auth_user_role: { Args: never; Returns: string }`.
   - Line 2171: `export type RoleUser = "Superadmin" | "Admin" | "Guru" | "dinas_pendidikan" | "Dinas Pendidikan";`.
3. **Database Constraints on `public.users.role`**:
   - `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql` (lines 11–20):
     ```sql
     -- 2. Drop existing role check constraint if any
     DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM pg_constraint 
         WHERE conname = 'users_role_check'
       ) THEN
         ALTER TABLE public.users DROP CONSTRAINT users_role_check;
       END IF;
     END $$;
     ```
     `users_role_check` constraint was dropped. The `role` column in `public.users` is a flexible `TEXT` column that stores any role string without database check constraint failure.
4. **Database RLS Function `get_auth_user_role()`**:
   - `supabase/migrations/20260926_secure_rls_helpers.sql` (lines 74–109):
     Retrieves `public.users.role` directly using `session_token` from header `x-session-token`, or from `x-user-role` if caller is `service_role`.

### 1.2 Authentication & Login Flow
1. **`src/components/LoginScreen.tsx` (lines 19–64)**:
   - Login uses RPC `verify_login`:
     ```typescript
     const { data: rpcData, error: rpcError } = await supabase.rpc('verify_login', {
       p_username: username.trim(),
       p_password: password
     });
     ...
     const userData = rpcData && rpcData.length > 0 ? rpcData[0] : null;
     ...
     onLoginSuccess(userData);
     ```
2. **`supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql` (lines 25–65)**:
   - RPC `verify_login` returns `TABLE(id UUID, username TEXT, nama TEXT, role TEXT, sekolah_id UUID, session_token UUID, avatar TEXT, kota_kabupaten TEXT)`.
   - Checks school status:
     ```sql
     IF lower(replace(v_user.role, ' ', '')) NOT IN ('superadmin', 'dinas_pendidikan') 
        AND v_user.sekolah_status = 'nonaktif' THEN
       RAISE EXCEPTION 'Sekolah nonaktif';
     END IF;
     ```
     For a user with role `tata_usaha`, since they belong to a school (`sekolah_id`), they are correctly subject to school active verification. No SQL change is strictly required in `verify_login`.

### 1.3 Session Persistence & HTTP Headers
1. **`src/app/page.tsx` (lines 23–142, 205–208)**:
   - Client session is stored in browser `localStorage.getItem('sipjam_user')`.
   - `validateSessionWithDb()` queries `masterSupabase.from('users').select('id, username, nama, role, sekolah_id, session_token, avatar, kota_kabupaten').eq('id', storedUserObj.id).single()`.
   - Live synchronization (lines 92–107): updates `user` state and `localStorage` if `dbUser.role` or other core attributes change.
   - `onLoginSuccess(userData)` saves `localStorage.setItem('sipjam_user', JSON.stringify(userData))`.
2. **`src/lib/supabaseClient.ts` (lines 332–362, 437–448, 528–544)**:
   - `getActiveTenantContext()` retrieves stored user and extracts `role: user?.role ? String(user.role).trim() : null`.
   - `customFetch` automatically injects headers:
     `x-sekolah-id`, `x-user-role`, `x-user-id`, and `x-session-token`.

### 1.4 Client-Side Mutation Guards & Master Data Restriction
1. **`src/lib/supabaseClient.ts` (lines 170–204)**:
   ```typescript
   export function isAdminRole(role?: string | null): boolean {
     if (!role) return false;
     const norm = String(role).trim().toLowerCase().replace(/[\s_-]+/g, '');
     return norm === 'admin' || norm === 'superadmin' || norm === 'servicerole';
   }

   export function checkMasterDataMutationGuard(requestUrlStr: string, method: string, role?: string | null): Response | null {
     const upperMethod = (method || 'GET').trim().toUpperCase();
     if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
       if (isMasterDataEndpoint(requestUrlStr) && !isAdminRole(role)) {
         return createMasterDataForbiddenResponse();
       }
     }
     return null;
   }
   ```
   `MASTER_DATA_TABLES` (lines 124–141) includes `'data_siswa'`, `'siswa'`, `'data_guru'`, `'guru'`.
   If a user with role `tata_usaha` attempts a `POST`, `PUT`, `PATCH`, or `DELETE` on `data_siswa` or `data_guru`, `checkMasterDataMutationGuard` will currently block it with 403 Forbidden unless adjusted to recognize `tata_usaha` permissions for student and teacher tables.
2. **`src/lib/dataIntegrityGuard.ts` (lines 522–535)**:
   ```typescript
   export function validateMasterDataModificationRole(role?: string | null): ValidationResult {
     const norm = (role || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
     if (norm === 'admin' || norm === 'superadmin' || norm === 'servicerole') {
       return { valid: true };
     }
     return {
       valid: false,
       message: 'Akses ditolak: Seluruh data master hanya dapat diubah melalui aplikasi oleh Admin menggunakan panel manajemen admin.'
     };
   }
   ```
3. **Database RLS Policies for Master Tables (`supabase/migrations/20261102_restrict_master_data_to_admin.sql`)**:
   - Lines 33–53:
     ```sql
     -- INSERT / UPDATE / DELETE policies
     WITH CHECK (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id()))
     ```
     At the database level, mutations on `data_siswa` and `data_guru` are currently permitted only for `is_superadmin()` or `public.get_auth_user_role() = 'Admin'`.

### 1.5 User Management (Data Pengguna) Current State
1. **`src/components/AdminPenggunaView.tsx`**:
   - Rendered within `AdminDataView.tsx` under tab `'Pengguna'` (step 7).
   - Dedicated exclusively to synchronizing teacher accounts (`role: 'Guru'`) from `data_guru` via `syncTeacherAccounts()` in `src/lib/teacherUserSync.ts`.
   - Editing modal (`handleOpenEditModal`, lines 137–268) provides inputs for `username`, `password`, and NIP synchronization. **There is NO role dropdown or selector**.
   - Non-admin access is blocked at lines 33 and 344–358.
2. **`src/components/AdminDataView.tsx` (lines 1038–1060, 1838–1845)**:
   - When Admin inserts a teacher in `data_guru`, it auto-creates an account in `users` with `role: 'Guru'` and password `NIP27`.
   - When Admin updates a teacher, it syncs name/username to `users`.
   - **There is NO arbitrary user creation or role dropdown** in `AdminDataView.tsx`.
3. **`src/components/SuperadminView.tsx` (lines 125–148, 410–472)**:
   - Manages school tenants (`jaringan`) and Dinas Pendidikan accounts (`dinas`).
   - For Dinas user creation (`handleCreateDinasUser`), `role: 'dinas_pendidikan'` is hardcoded.
   - **There is NO role dropdown** in Superadmin view.
4. **Database RLS Policies for `public.users` (`supabase/migrations/20260912_fix_rls_integrity.sql`, lines 306–330)**:
   ```sql
   CREATE POLICY "users_insert_policy" ON public.users FOR INSERT
   WITH CHECK (
       is_superadmin()
       OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id() AND role <> 'Superadmin')
   );

   CREATE POLICY "users_update_policy" ON public.users FOR UPDATE
   USING (
       is_superadmin()
       OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id())
       OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
   )
   WITH CHECK (
       is_superadmin()
       OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id() AND role <> 'Superadmin')
   );
   ```
   PostgreSQL RLS **already permits** an Admin to insert, update, and manage users with any role (including `'tata_usaha'`), as long as the role is not `'Superadmin'`.

### 1.6 Navigation & AppScreen Routing
1. **`src/lib/navigation.ts` (lines 85–191)**:
   - `getConsolidatedMenuItems(params)`:
     Normalizes roles via `(params.role || '').toLowerCase().replace(/[\s_-]+/g, '')`.
     - `superadmin` -> platform overview or satellite admin menu
     - `dinaspendidikan` -> regional dashboard & student presence
     - `kepalasekolah` -> executive dashboard, supervisi, analitik
     - `admin` -> operational dashboard, verifikasi, master data, pengaturan
     - `siswa` -> ujian siswa & informasi
     - fallback (`guru`) -> presensi guru, jurnal, dokumen, gradebook, informasi
   - If `params.role` is `'tata_usaha'` (norm: `'tatausaha'`), it currently falls into the fallback `guru` menu!
2. **`src/lib/navigation.ts` (lines 193–260)**:
   - `evaluateTabRBAC(viewId, tabId, user)`:
     Line 248 blocks any non-admin (`!isAdmin`) from accessing `view-admin-data`.
3. **`src/components/AppScreen.tsx`**:
   - Lines 90–95:
     ```typescript
     const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
     const isDinas = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'dinaspendidikan';
     const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';
     const isSiswa = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'siswa';
     ```
   - Lines 1306–1327: Guard for `view-admin-data`:
     ```typescript
     {currentView === 'view-admin-data' && (
       isAdmin || isSuperadmin ? (
         <AdminDataView user={user} initialTab={urlTab || undefined} />
       ) : (
         <AccessBlockedScreen />
       )
     )}
     ```
   - Lines 1350–1382: `view-admin-config` is strictly guarded (`isAdmin || isSuperadmin`).
   - Line 1146: `{currentView === 'view-dokumen' && <DokumenView user={user} />}` has no internal role lock, but should be blocked for `tata_usaha` in `handleNavigation` and `evaluateTabRBAC`.

---

## 2. Logic Chain

1. **Role Integration in Types & Session**:
   - Observation 1.1 shows `UserRole` and `AppUser.role` are defined in `src/types/user.ts` as `'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | string`.
   - Observation 1.1 (item 3) confirms `users_role_check` constraint was dropped in migration `20261024_dinas_pendidikan_role_and_region.sql`.
   - Therefore, adding `'tata_usaha'` is completely backward-compatible and requires only updating `src/types/user.ts` (and `RoleUser` in `src/types/database.ts`).
2. **Login Verification**:
   - Observation 1.2 shows login relies on `verify_login` RPC which returns `users.role` as a plain `TEXT` column.
   - Observation 1.3 shows `localStorage` and `validateSessionWithDb` automatically serialize and sync user records including `role`.
   - Therefore, when a user with `role = 'tata_usaha'` logs in, `verify_login` and `page.tsx` will naturally return and store `tata_usaha` without breaking login flow.
3. **User Management Findings**:
   - Observation 1.5 shows no general user creation or role dropdown exists in `AdminPenggunaView.tsx` or `SuperadminView.tsx`.
   - `AdminPenggunaView` is tightly coupled to `data_guru` synchronization (`role: 'Guru'`).
   - However, Observation 1.5 (item 4) shows database RLS policies (`users_insert_policy`) already permit Admin to create users for their school with any role except `'Superadmin'`.
   - Therefore, to support creating or assigning `tata_usaha`, `AdminPenggunaView.tsx` needs a simple way for Admin to manage/add accounts with role `tata_usaha` (e.g., a role selector or "+ Tambah Pengguna TU" button) and list existing TU accounts.
4. **Access Control & Permissions for `tata_usaha`**:
   - Requirement R2 mandates: Tata Usaha has operational access ONLY to Data Siswa and Data Guru, and is prohibited from Bank Dokumen / Persuratan (`view-dokumen`), system settings (`view-admin-config`), and Superadmin accounts/views.
   - Observations 1.4, 1.6 show that:
     a) `src/lib/navigation.ts` (`getConsolidatedMenuItems`): A dedicated menu for `normRole === 'tatausaha'` should return only operational access to Data Siswa and Data Guru (e.g., `view-admin-data` with default/allowed tabs for Siswa & Guru).
     b) `src/lib/navigation.ts` (`evaluateTabRBAC`): Must permit `tata_usaha` for `view-admin-data` on tabs `Data_Siswa` and `Data_Guru`, while blocking `view-dokumen`, `view-admin-config`, and other master tabs (e.g. `Data_Kelas`, `Data_Mapel`, `Jadwal_Pelajaran`, `Wali_Kelas`, `Pengguna`, `Kalender_Pendidikan`, `sistem_blok`).
     c) `src/components/AppScreen.tsx`: Allow `tata_usaha` to open `view-admin-data`, but block `view-dokumen`, `view-admin-config`, and `view-admin-backup`.
     d) `src/components/AdminDataView.tsx`: Filter `tabs` so Tata Usaha only sees `Data_Siswa` and `Data_Guru`. Adjust `isAdmin` / `isOperationAllowed` check for add/edit/delete/bulk-delete to allow `tata_usaha` when modifying `data_siswa` or `data_guru`.
     e) `src/lib/supabaseClient.ts` (`checkMasterDataMutationGuard`): Allow mutations on `data_siswa` and `data_guru` if `role` is `tata_usaha`.

---

## 3. Caveats

1. **Database RLS Policies for Master Tables**:
   Migration `20261102_restrict_master_data_to_admin.sql` has `WITH CHECK (is_superadmin() OR (public.get_auth_user_role() = 'Admin' ...))`. If tests run against mock Supabase client (as demonstrated by `getTenantSupabaseClient` in `tests/master_data_admin_role_restriction.test.ts`), `checkMasterDataMutationGuard` governs client-side interception. In live production PostgreSQL, a policy update or migration allowing `public.get_auth_user_role() IN ('Admin', 'tata_usaha')` on `data_siswa` and `data_guru` may be applied if RLS enforcement is active on the live remote server.
2. **Display Naming Conventions**:
   In some test files, roles are tested case-insensitively (`'tata_usaha'`, `'tatausaha'`, `'Tata Usaha'`). The codebase standard normalization `(role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha'` should be consistently employed everywhere.
3. **No Caveats Beyond Above**.

---

## 4. Conclusion

1. **Role Definition**: Add `'tata_usaha'` into:
   - `src/types/user.ts`: `UserRole` and `AppUser.role`.
   - `src/types/database.ts`: `RoleUser`.
2. **Auth & Login**: Fully compatible without changes to `verify_login` RPC because `verify_login` returns `users.role` directly and checks school status dynamically.
3. **User Management**:
   - Currently, no role dropdown exists anywhere in user management.
   - Minimalist (/ponytail) solution: Enhance `AdminPenggunaView.tsx` to support creating or managing TU accounts, and fetch accounts where `role IN ('Guru', 'tata_usaha', 'Tata Usaha')`.
4. **Navigational & Operational Boundaries (R2)**:
   - `src/lib/navigation.ts`: In `getConsolidatedMenuItems`, return only navigation items for Data Siswa and Data Guru when `normRole === 'tatausaha'`.
   - In `evaluateTabRBAC`, explicitly grant `tata_usaha` access to `Data_Siswa` and `Data_Guru` in `view-admin-data`, while explicitly forbidding `view-dokumen`, `view-admin-config`, `view-superadmin-*`, and non-permitted master tabs.
   - `src/components/AdminDataView.tsx`: Render only the `Data_Siswa` and `Data_Guru` tabs for `tata_usaha`, and authorize mutations on those two tables.
   - `src/lib/supabaseClient.ts`: Permit `data_siswa` and `data_guru` mutations in `checkMasterDataMutationGuard` when `role` is `tata_usaha`.

---

## 5. Verification Method

1. **Automated Test Suite**:
   Run the existing comprehensive test suite:
   ```powershell
   npm test
   ```
   *Expected result*: All existing test files exit with code 0 without any regressions.
2. **Dedicated Role Verification Test**:
   Create a new test file (e.g. `tests/role_tata_usaha_auth_rbac.test.ts`) that asserts:
   - `resolveCanonicalRoute` and `getConsolidatedMenuItems({ role: 'tata_usaha' })` returns only Data Siswa & Data Guru.
   - `evaluateTabRBAC` allows `view-admin-data` (`Data_Siswa` & `Data_Guru`) and denies `view-dokumen`, `view-admin-config`, and `view-admin-pengguna`.
   - `checkMasterDataMutationGuard` permits mutations to `data_siswa` and `data_guru` for `tata_usaha`, but returns 403 for `jadwal_pelajaran`, `data_kelas`, `kalender_pendidikan`, etc.
3. **Inspection of Modified Files**:
   Verify lines in `src/types/user.ts`, `src/lib/navigation.ts`, `src/components/AdminDataView.tsx`, `src/components/AdminPenggunaView.tsx`, `src/components/ClaySidebar.tsx`, and `src/lib/supabaseClient.ts`.
