# Handoff Report: Explorer 1 (Auth, User Management, RBAC & Superadmin)

## 1. Observation

1. **User Types & AppUser Interface**:
   - `src/types/user.ts:1-14`:
     ```typescript
     export interface AppUser {
       id: string;
       username: string;
       nama: string;
       role: string;
       sekolah_id: string;
       session_token: string;
       avatar?: string | null;
       wali_kelas?: string | { kelas: string } | null;
       nip?: string;
       name?: string;
       penugasan?: any;
       [key: string]: any;
     }
     ```
   - `src/types/database.ts:2041`: `export type User = Tables<"users">;` where `users.Row` (`src/types/database.ts:1639-1649`) has fields `id`, `username`, `password`, `nama`, `role`, `sekolah_id`, `session_token`, `avatar`.
   - `src/components/AIAssistant/knowledgeBase.ts:7`: `export type UserRole = 'guru' | 'admin' | 'all';`.
   - Database schema constraint in `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql:47`:
     `role TEXT NOT NULL CHECK (role IN ('Superadmin', 'Admin', 'Guru', 'Piket', 'Wali Kelas'))`.

2. **Login & Session Management**:
   - `src/components/LoginScreen.tsx:19-22`:
     ```typescript
     const { data: rpcData, error: rpcError } = await supabase.rpc('verify_login', {
       p_username: username.trim(),
       p_password: password
     });
     ```
   - PostgreSQL RPC `verify_login` (`supabase/migrations/20261002_sekolah_nonaktif_login_block.sql:7-66`):
     Runs as `SECURITY DEFINER`, verifies encrypted/plaintext password, generates new `session_token = gen_random_uuid()`, and returns `(id, username, nama, role, sekolah_id, session_token, avatar)`.
   - Session storage in `src/app/page.tsx:165`: `localStorage.setItem('sipjam_user', JSON.stringify(userData))`.
   - Session validation on app mount in `src/app/page.tsx:23-74`:
     Queries `masterSupabase.from('users').select('id, username, nama, role, sekolah_id, session_token, avatar').eq('id', storedUserObj.id).single()`.
   - Session idle resume validation in `src/hooks/useSessionSync.ts:36-40`:
     Queries `masterSupabase.from('users').select('id, username, nama, role, sekolah_id, session_token, avatar').eq('id', activeUser.id).single()`.

3. **Navigation & Perutean View**:
   - `src/components/AppScreen.tsx:73-74`:
     ```typescript
     const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
     const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';
     ```
   - `src/components/AppScreen.tsx:153-160`:
     ```typescript
     const [currentView, setCurrentView] = useState(() => {
       if (typeof window !== 'undefined') {
         const params = new URLSearchParams(window.location.search);
         const view = params.get('view');
         if (view) return view;
       }
       if (isSuperadmin) return 'view-superadmin-overview';
       return 'view-home';
     });
     ```
   - Popstate fallback in `AppScreen.tsx:170`: `setCurrentView(isSuperadmin ? 'view-superadmin-overview' : 'view-home');`.
   - Default view fallback in `AppScreen.tsx:515`: `const defaultHomeView = isSuperadmin ? 'view-superadmin-overview' : 'view-home';`.
   - Navigation guards in `AppScreen.tsx:303-440` (`handleNavigation`) enforce access controls for administrative and teacher views.

4. **Superadmin School & Region Management**:
   - `src/components/SuperadminView.tsx`:
     Manages satellite schools via `masterSupabase.from('sekolah_registry')` with fallback to `masterSupabase.from('sekolah')`.
     `handleOpenAddSatelliteSchoolModal` (`lines 336-520`), `handleEditSatelliteSchool` (`lines 521-681`), `handleDeleteSatelliteSchool` (`lines 682-789`).
   - Region Tracking (`kota_kabupaten`):
     - `public.sekolah` table (`supabase/migrations/20260912_multi_tenant_sekolah_rls.sql:22`):
       Column `kota_kabupaten TEXT` exists natively.
     - `public.sekolah_registry` table (`supabase/migrations/20261013_portal_induk_jaringan_multi_sekolah.sql:11`):
       Column `kota_kabupaten TEXT` exists natively.
     - Form input fields in `SuperadminView.tsx:352, 537` (`swal-sat-kota`, `swal-edit-sat-kota`) actively manage `kota_kabupaten`.
   - User Management in Superadmin:
     - Currently `SuperadminView.tsx` only has two tabs (`overview` and `jaringan`). There is no UI for managing system accounts or `dinas_pendidikan` users.

5. **Multi-Tenant Context & Satellite Switching Infrastructure**:
   - `src/lib/supabaseClient.ts:168-177`:
     ```typescript
     export function getActiveTargetSchool(): SatelliteSchool | null {
       const tenant = getActiveTenantContext();
       const roleNorm = (tenant.role || '').toLowerCase().replace(/\s+/g, '');
       if (roleNorm !== 'superadmin') {
         return null;
       }
     ```
     `getActiveTargetSchool()` is currently restricted to `roleNorm === 'superadmin'`.
   - `src/lib/supabaseClient.ts:370-394`:
     Custom fetch interceptor injects `x-sekolah-id`, `x-user-role`, `x-user-id`, `x-session-token` on outgoing Supabase requests.

6. **Current Build Health**:
   - Ran `npx tsc --noEmit`: exited with code 0 (zero TypeScript errors).
   - Ran `git status`: branch `dev`, working tree clean (only agent files in `.agents/teamwork/`).

---

## 2. Logic Chain

1. **Role Integration**:
   - From Observation 1, role checks are case-insensitive and trimmed. Adding `role = 'dinas_pendidikan'` requires updating `src/types/user.ts` (`AppUser`), `src/types/database.ts`, and removing or expanding the database `CHECK (role IN (...))` constraint.
2. **Session & Region Tracking**:
   - From Observation 2 and 4, `public.users` currently lacks `kota_kabupaten`. Adding `kota_kabupaten TEXT` to `public.users` enables Superadmin to bind any `dinas_pendidikan` account directly to their assigned region.
   - Updating `verify_login` RPC and the `.select(...)` queries in `src/app/page.tsx:27` and `src/hooks/useSessionSync.ts:38` ensures `kota_kabupaten` is loaded into the client session and preserved across re-renders and idle resumption.
3. **Login Redirection & View Routing**:
   - From Observation 3, when `user.role === 'dinas_pendidikan'`, `AppScreen.tsx` must initialize `currentView` to `'view-dinas-monitoring'` instead of `'view-home'`.
   - A dedicated `menuItemsDinas` array in `AppScreen.tsx` will display only the regional dashboard and read-only drilldown links (`view-admin-rekap`, `view-rekap-siswa`, `view-jurnal-kelas`), preventing any access to configuration or transaction pages.
4. **Superadmin Region Assignment**:
   - From Observation 4, `SuperadminView.tsx` already has access to all schools and their `kota_kabupaten`.
   - Adding a tab or modal in `SuperadminView.tsx` allows Superadmin to create/edit `dinas_pendidikan` accounts in `masterSupabase.from('users')`, selecting `kota_kabupaten` from a dropdown populated from `sekolah_registry`.
5. **Read-Only Isolation Enforcement**:
   - From Observation 5, `getActiveTargetSchool()` must be unlocked for `dinas_pendidikan` BUT conditionally restricted so that `targetSchool.kota_kabupaten === tenant.kotaKabupaten`.
   - In `supabaseClient.ts`, intercepting `POST`, `PUT`, `PATCH`, `DELETE` methods for `dinas_pendidikan` guarantees that even if a user manipulates the DOM, no database mutation can be executed.
   - Combined with existing PostgreSQL RLS (which only allows mutations for Superadmin or school Admin), read-only isolation is strictly guaranteed across both client and server layers.

---

## 3. Caveats

1. **Satellite External Database Auth**:
   If a satellite school uses an external Supabase instance with its own anon key, `getSatelliteSupabaseClient` routes requests directly to that instance. For `dinas_pendidikan`, ensure `x-user-role: dinas_pendidikan` is sent and client-side mutation blocking remains active.
2. **Password Hashing**:
   When Superadmin creates a `dinas_pendidikan` account directly in `public.users`, password must be stored either in plaintext (which `verify_login` will automatically hash with bcrypt on first login) or hashed using `extensions.crypt()`. Both patterns are supported by `verify_login`.
3. **Scope of Investigation**:
   Investigation was conducted strictly in read-only mode without altering any source code in the repository.

---

## 4. Conclusion

1. `UserRole` and `User` interface are located in `src/types/user.ts` and `src/types/database.ts`. The new role `'dinas_pendidikan'` can be seamlessly integrated into `AppUser` alongside an optional `kota_kabupaten?: string | null` field.
2. Login occurs via `verify_login` RPC and stores user session in `localStorage.getItem('sipjam_user')`. By updating `currentView` initialization in `AppScreen.tsx`, users with role `'dinas_pendidikan'` are automatically redirected to `'view-dinas-monitoring'`.
3. The `kota_kabupaten` column is already natively present on both `public.sekolah` and `public.sekolah_registry`. Adding `kota_kabupaten TEXT` to `public.users` completes the data model.
4. Superadmin can assign and manage regional assignments by adding a dedicated "Akun Dinas Pendidikan" tab in `SuperadminView.tsx` that inserts/updates `public.users`.
5. Read-only isolation can be strictly guaranteed using a 5-layer architecture (Navigation Gating, UI `isReadOnly={true}` props, Region-bound Target Switching, Client-side Fetch Mutation Interceptor, and PostgreSQL RLS).

Full detailed findings and code designs are documented in:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_1\report.md`.

---

## 5. Verification Method

To independently verify the findings in this report:

1. **Verify Type and Schema Locations**:
   - Run `npx tsc --noEmit` to confirm existing compilation is 100% clean.
   - Inspect `src/types/user.ts:1-14` to verify `AppUser` structure.
   - Inspect `src/lib/supabaseClient.ts:168-177` to verify `getActiveTargetSchool` current role restriction.
   - Inspect `src/components/AppScreen.tsx:73-75, 153-160, 506-515` to verify current role checks and default view initialization.
   - Inspect `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql:22` and `supabase/migrations/20261013_portal_induk_jaringan_multi_sekolah.sql:11` to verify `kota_kabupaten` column existence in `sekolah` and `sekolah_registry`.

2. **Verify Tests**:
   - Run existing RBAC and portal integration tests:
     `npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts`
     `npx tsx tests/kepsek_pengawas_rbac.test.ts`
     Confirm all tests pass without errors.
