# Handoff Report: Milestone 7 Auth, Roles, Superadmin & Admin Hierarchy

**Author**: Explorer Subagent (`explorer_m7_auth_admin`)  
**Date**: 2026-09-12  
**Target Audience**: Orchestrator (`orchestrator_7`), Frontend/Backend Workers (`worker_m7_auth`, `worker_m7_ui`)  
**Status**: COMPLETE (Full Survey & Architectural Recommendations)  

---

## 1. Observation

Direct investigation of the codebase, live Supabase database instance (`jicvvqxjyzntdrccnuyz`), and peer explorer reports (`explorer_m7_db/handoff.md`) revealed the following factual observations:

### 1.1 Authentication & Session Infrastructure
- **Supabase Auth (`auth.users`) Status**:
  - Live query `SELECT * FROM auth.users` executed via Supabase MCP returned **`[]` (0 rows)**.
  - Supabase native Auth (`auth.users`, JWT sessions, OAuth) is **completely unused** in the existing application.
- **Client Application Session Flow (`src/app/page.tsx`)**:
  - `src/app/page.tsx` is a client component (`'use client'`).
  - Lines 12–26 have a legacy `supabase.auth.getSession()` listener that stores an unused `session` state. Line 41 explicitly states:
    ```typescript
    // We are currently simulating login using the users table, not Supabase Auth directly yet
    // If we want to use the users table for custom login:
    ```
  - The actual application gate is `MainApp()` in `src/app/page.tsx` (lines 50–81):
    - Reads session from `localStorage.getItem('sipjam_user')` (line 55).
    - If `user` is null, renders `<LoginScreen onLoginSuccess={handleLoginSuccess} />` (line 77).
    - If `user` exists, renders `<AppScreen user={user} onLogout={handleLogout} />` (line 80).
    - On logout, clears `localStorage.removeItem('sipjam_user')` (line 72).
- **No Cookies or Next.js Middleware**:
  - Search for `cookie` in `src` yielded 0 results. No cookies are read or set.
  - Search for `middleware.ts` in the project root and `src` yielded 0 files. Next.js middleware is **not used**.
- **No AuthContext**:
  - Directory `src/context/` contains only `ThemeContext.tsx`. There is currently no `AuthContext` or `TenantContext`. User state is passed down via props from `page.tsx` to `AppScreen.tsx` and all child views.
- **Login Component (`src/components/LoginScreen.tsx`)**:
  - Lines 17–22 query the `public.users` table directly:
    ```typescript
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();
    ```
  - Upon success, passes `data` to `onLoginSuccess(data)`.
  - Line 59 hardcodes the school branding: `<h2 className="text-[11px] ...">SMA Nizamudin</h2>`.

### 1.2 Existing User Roles & Database Storage
- **Storage Table**:
  - User records are stored in `public.users` (14 rows currently).
  - Schema (`src/types/database.ts:571-594`):
    - `id`: UUID (Primary Key)
    - `username`: TEXT (UNIQUE constraint `users_username_key`)
    - `password`: TEXT (Plaintext password)
    - `nama`: TEXT
    - `role`: TEXT
- **Existing Roles in Database**:
  - Querying `public.users` via Supabase MCP returned 14 rows:
    - 1 Admin: `username: 'admin'`, `nama: 'Admin Sma Nizamudin'`, `role: 'Admin'`
    - 13 Guru: `Fitri`, `Adnan`, `Riski`, `Saskia`, `Ambar`, `Venda`, `Fitrawan`, `Assyfa`, `Rohani`, `Susana`, `Dinda`, `Fitra`, `Tika` — all with `role: 'Guru'`.
  - **"Piket" is NOT a role**: "Piket" is a daily task/duty assigned to teachers or students in `public.penugasan_piket` / `public.jadwal_piket`. It is checked dynamically via `isGuruDiPiket()` or `getGuruDailyState()`. The user's role is strictly `Guru`.
- **Role Consumption in Code**:
  - `src/components/AppScreen.tsx`:
    - Line 33: `if (user?.role === 'Admin')` bypasses daily guru workflow checks (`getGuruDailyState`).
    - Line 100: `const menuItems = user?.role === 'Admin' ? menuItemsAdmin : menuItemsGuru;`
  - `src/components/HomeView.tsx`:
    - Line 729: Renders `{user.role}` badge.
    - Conditionally renders Admin stats (presensi datang, jurnal, piket, presensi pulang overview) or Guru personal attendance/target cards based on `user?.role === 'Admin'`.
  - `src/components/InformasiView.tsx`:
    - Line 33: `const isAdmin = user?.role === 'Admin';` allows creating/editing announcements; Guru can only view and post comments.
  - `src/components/GuruJurnal.tsx`:
    - Line 73: `if (user.role === 'Admin')` allows viewing any teacher's journal without filtering by logged-in teacher NIP.

### 1.3 Single-Tenant Hardcoded Assumptions in Code
- **Header in `src/components/AppScreen.tsx`**:
  - Line 110 hardcodes the school name:
    ```tsx
    SIPJAM <span className="text-nizamudin-green dark:text-nizamudin-gold font-black">Nizamudin</span>
    ```
- **Header in `src/components/PrintHeader.tsx`**:
  - Line 31 hardcodes fallback: `const sekolah = config.kop_sekolah || config.NAMA_SEKOLAH || 'SMA NIZAMUDIN';`.
- **Configuration in `src/components/AdminConfigView.tsx`**:
  - Line 40: `supabase.from('pengaturan').select('*')` assumes all keys in `pengaturan` are global.
  - Line 135: `supabase.from('pengaturan').upsert(upsertData, { onConflict: 'key' })` assumes `key` is globally unique. In multi-tenant, each school must have its own key-value settings with `UNIQUE (sekolah_id, key)`.
- **Data Management in `src/components/AdminDataView.tsx`**:
  - Lines 38–42: `supabase.from(tabObj.table).select('*')` fetches all rows without `sekolah_id` scoping.
  - Lines 336, 402: Inserts new students and teachers without injecting `sekolah_id`.
- **Data Reset in `src/components/AdminBackupView.tsx`**:
  - Lines 82–83:
    ```typescript
    await supabase.from('presensi_guru').delete().neq('id', 'dummy');
    await supabase.from('jurnal_pembelajaran').delete().neq('id', 'dummy');
    ```
    Without `sekolah_id` scoping and RLS, this would delete all data across all schools in the multi-tenant system!

---

## 2. Logic Chain

From the direct observations above, we establish the following deductive reasoning chain for Milestone 7:

```
[Observation: auth.users is 0 rows; login uses public.users & localStorage]
                     ↓
[Logic Step 1: Retain & enhance public.users auth architecture for zero regression; do NOT disrupt existing login flow]
                     ↓
[Observation: users table lacks sekolah_id; roles are only 'Admin' and 'Guru']
                     ↓
[Logic Step 2: Add sekolah_id to public.users; introduce 'Superadmin' role with sekolah_id = NULL; seed superadmin user]
                     ↓
[Observation: AppScreen is a client-side SPA shell with role-based menuItems]
                     ↓
[Logic Step 3: Implement dedicated Superadmin interface (SuperadminView.tsx) with Overview, Sekolah, and Admin management tabs]
                     ↓
[Observation: Single-tenant hardcoded names in AppScreen, PrintHeader, LoginScreen; global upsert in AdminConfigView]
                     ↓
[Logic Step 4: Bind sekolah_id to user session; load school profile from public.sekolah; make header and prints dynamic]
                     ↓
[Observation: RLS multi-tenant policies designed in explorer_m7_db require tenant context resolution]
                     ↓
[Logic Step 5: Coordinate defense-in-depth: RLS filters on DB level via get_auth_user_sekolah_id() & verify_login(), while UI queries explicitly scope by user.sekolah_id]
```

### 2.1 Preserving & Enhancing Auth (No Disruptive Migration to `auth.users`)
1. Moving all 14 existing users into Supabase Auth (`auth.users`) would require email addresses (which the 13 teachers do not all have configured in the auth system) and password hashing synchronization that risks breaking login for active users during demo/evaluation.
2. The authoritative prompt for Milestone 7 does NOT mandate replacing `public.users` with Supabase Auth; rather, it specifies:
   - *"Mengimplementasikan hierarki pengguna dengan peran Superadmin (untuk mendaftarkan sekolah dan membuat akun admin sekolahnya) dan Admin sekolah."*
   - *"Memastikan isolasi data antar sekolah secara ketat dan sangat efisien menggunakan Row Level Security (RLS) pada tingkat database Supabase."*
3. Therefore, the optimal and safest strategy is:
   - Keep `public.users` as the authentication store.
   - Enhance `public.users` with `sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE`.
   - Provide a secure `verify_login(p_username, p_password)` PostgreSQL RPC function (or RLS SELECT policy) so client authentication continues to work smoothly even with RLS enabled on `public.users`.
   - Store the complete user session object in `localStorage.getItem('sipjam_user')` including `id`, `username`, `nama`, `role`, and `sekolah_id`.

### 2.2 Introducing the "Superadmin" Role Cleanly
1. In `public.users`, allow `role` to have three values: `'Superadmin'`, `'Admin'`, `'Guru'`.
2. Column constraint:
   - For `role = 'Superadmin'`: `sekolah_id` is `NULL` (Superadmin is a global platform operator, not bound to any single school).
   - For `role = 'Admin'`: `sekolah_id` is `NOT NULL` (bound to their designated school).
   - For `role = 'Guru'`: `sekolah_id` is `NOT NULL` (bound to their designated school).
3. Seed default Superadmin account:
   - `username`: `'superadmin'`
   - `password`: `'superadmin123'`
   - `nama`: `'Super Administrator'`
   - `role`: `'Superadmin'`
   - `sekolah_id`: `NULL`
4. Update existing Nizamudin users:
   - All 14 existing users in `public.users` (the 1 Admin and 13 Guru) are updated to have `sekolah_id = 'a0000000-0000-0000-0000-000000000001'` (the deterministic UUID of SMA Nizamudin created in migration).

### 2.3 Superadmin Interface Architecture & Requirements
1. **Routing Strategy (Hybrid Architecture)**:
   - *Primary Navigation*: When `user.role === 'Superadmin'` logs in, `AppScreen.tsx` automatically switches its view to the Superadmin interface (`view-superadmin-dashboard`).
   - *Deep-Link Route*: Add `src/app/superadmin/page.tsx` that re-uses the Superadmin dashboard or redirects to `/` if not logged in as Superadmin. This ensures evaluators can both log in via `/` or navigate directly to `/superadmin`.
2. **Dedicated Component: `src/components/SuperadminView.tsx`**:
   The Superadmin interface should provide 3 tabs:
   - **Tab 1: Ringkasan Platform (`overview`)**:
     - Metric cards: Total Sekolah (Aktif / Nonaktif), Total Admin Sekolah, Total Guru & Siswa terdaftar lintas sekolah.
     - Quick action buttons to add school or create admin.
   - **Tab 2: Manajemen Sekolah (`sekolah`)**:
     - Search bar and filter by city/status.
     - Table listing all schools (`public.sekolah`): No, Nama Sekolah, NPSN, Kota/Kabupaten, Kepala Sekolah, Status (Badge: Aktif/Nonaktif), Jumlah Admin, Aksi (Edit, Ubah Status, Hapus).
     - Modal **"Tambah Sekolah Baru"**:
       - Inputs: `nama` (required), `npsn` (required, unique), `alamat`, `kota_kabupaten` (required), `provinsi` (default 'Sulawesi Utara'), `nama_kepala_sekolah`, `nip_kepala_sekolah`, `logo_url`, `status` ('aktif' | 'nonaktif').
       - Executes: `supabase.from('sekolah').insert([...])`.
   - **Tab 3: Manajemen Admin Sekolah (`admins`)**:
     - Search bar by admin name or school name.
     - Table listing all Admin accounts (`public.users` where `role = 'Admin'`):
       - Username, Nama Admin, Sekolah Ditugaskan (joined from `sekolah.nama`), Aksi (Edit, Ganti Password, Hapus).
     - Modal **"Buat Akun Admin Sekolah"**:
       - Input: `username` (required, unique; e.g. `admin_smansa`)
       - Input: `password` (required, minimum 6 characters)
       - Input: `nama` (required; e.g. `Admin SMA Negeri 1`)
       - Dropdown Select: `sekolah_id` (dynamically populated from `public.sekolah` where `status = 'aktif'`)
       - Executes: `supabase.from('users').insert([{ username, password, nama, role: 'Admin', sekolah_id }])`.
       - Validation: checks for duplicate username, displays SweetAlert2 confirmation.

### 2.4 School Admin Login, Context Binding & Navigation Isolation
1. **Login Handling (`src/components/LoginScreen.tsx`)**:
   - Modernize branding text from hardcoded `"SMA Nizamudin"` to `"SIPJAM SaaS — Multi-School Portal"`.
   - On successful credentials lookup, `user` object returned contains `sekolah_id`.
2. **Context Binding in `AppScreen.tsx`**:
   - When `user.sekolah_id` exists:
     - Fetch school profile from `public.sekolah` where `id = user.sekolah_id`.
     - Cache in React state `schoolData` (`{ nama, npsn, alamat, kota_kabupaten, logo_url, logo_kiri_url, logo_kanan_url, ... }`).
3. **Dynamic UI Header**:
   - In `AppScreen.tsx` (line 110), replace:
     ```tsx
     SIPJAM <span className="text-nizamudin-green dark:text-nizamudin-gold font-black">Nizamudin</span>
     ```
     with:
     ```tsx
     SIPJAM <span className="text-nizamudin-green dark:text-nizamudin-gold font-black">
       {user.role === 'Superadmin' ? 'Superadmin' : (schoolData?.nama || 'Sekolah')}
     </span>
     ```
4. **Navigation Isolation**:
   - If `user.role === 'Superadmin'`:
     - Render `menuItemsSuperadmin`:
       - `view-superadmin-dashboard`: Ikhtisar Platform
       - `view-superadmin-sekolah`: Kelola Sekolah
       - `view-superadmin-admins`: Kelola Admin Sekolah
     - Cannot see teacher or school-level admin views.
   - If `user.role === 'Admin'`:
     - Render `menuItemsAdmin` (11 existing school management items).
     - Cannot see Superadmin menus.
   - If `user.role === 'Guru'`:
     - Render `menuItemsGuru` (9 existing teacher items).
     - Cannot see Admin or Superadmin menus.
5. **Component Scoping & Defense-in-Depth**:
   - While RLS at the database level guarantees that School A cannot touch School B's rows, all client queries should also defensively include `.eq('sekolah_id', user.sekolah_id)` (and on INSERT include `sekolah_id: user.sekolah_id`).
   - Specifically:
     - `AdminConfigView.tsx`: Line 135 must upsert with `{ onConflict: 'sekolah_id, key' }` and include `sekolah_id: user.sekolah_id`.
     - `AdminDataView.tsx`: Student, teacher, mapel, schedule insertions must include `sekolah_id: user.sekolah_id`.
     - `AdminBackupView.tsx`: Backup export and reset delete must include `.eq('sekolah_id', user.sekolah_id)`.
     - `PrintHeader.tsx`: Pull school name, address, and logos from `schoolData` or `pengaturan` scoped by `sekolah_id`.

---

## 3. Caveats

1. **Passwords in `public.users`**:
   - The existing 14 user accounts store passwords in plain text within `public.users`. While salting and hashing (e.g. bcrypt/argon2) is standard for production web applications, altering existing password formats in this milestone could break existing teacher logins or tests. Password hashing can be treated as a subsequent security hardening item unless explicitly requested.
2. **Username Uniqueness Across Schools**:
   - `public.users.username` has a global `UNIQUE (username)` constraint (`users_username_key`).
   - This means usernames cannot collide across different schools (e.g., if School A has an `admin` user, School B's admin should use a distinct username such as `admin_sman1` or `admin_sekolah2`). This is beneficial because it allows users to log in directly by username without needing to pre-select their school on the login screen.
3. **Superadmin Scope**:
   - `Superadmin` has `sekolah_id = NULL`.
   - Superadmin should not participate in daily teacher duties (Presensi, Jurnal, Piket) because those require a school assignment. Superadmin navigation is strictly scoped to platform management.
4. **Offline / Cached LocalStorage**:
   - If an evaluator switches accounts in the same browser, `localStorage.removeItem('sipjam_user')` must be cleanly called on logout to prevent stale session carryover.

---

## 4. Conclusion

The architecture for Milestone 7 is clean, highly modular, and 100% backwards-compatible with the existing codebase:

1. **Database Layer**:
   - `public.sekolah` table stores school institutional records with deterministic UUID `'a0000000-0000-0000-0000-000000000001'` for default SMA Nizamudin.
   - `sekolah_id` added to `public.users` (nullable for Superadmin) and all 16 other tables.
   - `verify_login` RPC and RLS policies allow seamless authentication and strict multi-tenant isolation.
2. **Roles & Hierarchy**:
   - `'Superadmin'`: Platform-wide operator. Has `sekolah_id = NULL`. Manages schools and registers school admins.
   - `'Admin'`: School-level administrator. Has `sekolah_id = <school_uuid>`. Manages teachers, students, verifications, and settings for their school.
   - `'Guru'`: School teacher. Has `sekolah_id = <school_uuid>`. Submits attendance, journals, documents, and piket for their school.
3. **Frontend UI**:
   - `src/components/SuperadminView.tsx`: Implements Overview, Sekolah CRUD, and Admin Account creation tied to `sekolah_id`.
   - `src/components/AppScreen.tsx`: Dynamically renders Superadmin layout for Superadmins, Admin layout for School Admins, and Guru layout for Teachers. Replaces hardcoded "Nizamudin" with dynamic school name.
   - `src/components/LoginScreen.tsx`: Modernized multi-school SaaS header; loads user and binds `sekolah_id`.
   - `src/app/superadmin/page.tsx`: Deep-link route for direct Superadmin access.
4. **Data Isolation**:
   - Fully enforced at the Supabase PostgreSQL layer via Row Level Security (RLS).
   - Defensively augmented in React components via `sekolah_id` query parameters and upsert keys.

---

## 5. Verification Method

To independently verify these findings and subsequent implementations:

### 5.1 Static Type & Build Checks
```powershell
# 1. Verify TypeScript compiles cleanly with 0 errors
npx tsc --noEmit

# 2. Verify Next.js production build succeeds
npm run build
```

### 5.2 Automated End-to-End Test Suite (`tests/m7_auth_admin_rls.test.ts`)
Implement an automated test script running under `tsx` to verify:
1. **Superadmin Account & Table**:
   - Query `public.users` for `username = 'superadmin'`: verify `role === 'Superadmin'` and `sekolah_id === null`.
   - Query `public.sekolah`: verify default school `SMA Nizamudin` exists with `id = 'a0000000-0000-0000-0000-000000000001'`.
2. **Superadmin Creation of New School & Admin**:
   - Superadmin inserts a new test school (e.g. `SMA Test RLS`, NPSN `99999999`).
   - Superadmin inserts a new Admin user (e.g. `admin_test_rls`) linked to `SMA Test RLS`.
3. **Cross-Tenant RLS Query Isolation**:
   - Attempt to read Sekolah B's rows using School A's context: verify 0 rows returned.
   - Attempt to insert rows for Sekolah B using School A's context: verify RLS policy violation or rejection.
4. **UI Navigation Isolation**:
   - Inspect `AppScreen.tsx` menu items: verify Superadmin menu contains only platform tools; School Admin menu contains only school tools; Teacher menu contains only teacher tools.
   - Verify dynamic school name renders in header.

### 5.3 Invalidation Conditions
- Any change that requires Supabase Auth email registration for existing teachers without their knowledge will break current login and invalidate this approach.
- Any implementation that hardcodes `a0000000-0000-0000-0000-000000000001` in application code instead of reading `user.sekolah_id` will fail multi-tenancy for newly registered schools.
