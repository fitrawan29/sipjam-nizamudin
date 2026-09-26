# Explorer 2 Handoff Report: Auth, Roles & Database/RLS Survey

## 1. Observation

### Obs 1: User Roles Definition, Storage, and Authentication Flow
- **Storage**: User accounts are stored in PostgreSQL table `public.users` (`id UUID`, `username TEXT`, `password TEXT`, `nama TEXT`, `role TEXT`, `sekolah_id UUID`, `avatar TEXT`, `session_token UUID`).
- **Roles in Database**: Direct database query `SELECT DISTINCT role FROM public.users;` confirms exactly three roles exist:
  - `"Superadmin"` (Platform admin, `sekolah_id = NULL`)
  - `"Admin"` (School admin, scoped to `sekolah_id = 'a0000000-0000-0000-0000-000000000001'`)
  - `"Guru"` (Teacher, scoped to `sekolah_id = 'a0000000-0000-0000-0000-000000000001'`)
- **Student Data (`data_siswa`)**: Students do NOT have login credentials or user records in `public.users`. Their records reside exclusively in `public.data_siswa` (`id`, `nisn`, `nama_siswa`, `kelas`, `gender`, `status`, `no_hp_ortu`, `sekolah_id`). There is no login flow or authentication role for siswa; their records are queried exclusively by authenticated school staff (Admins and Teachers/Wali Kelas).
- **Authentication RPC**: The application does not use Supabase GoTrue Auth (`auth.users`), but instead uses a custom `SECURITY DEFINER` RPC `public.verify_login(p_username TEXT, p_password TEXT)` in `src/components/LoginScreen.tsx:18`.
- In `supabase/migrations/20260926_secure_rls_helpers.sql:15-18`, `verify_login` executes:
  ```sql
  UPDATE public.users 
  SET session_token = gen_random_uuid() 
  WHERE public.users.username = trim(p_username) AND password = extensions.crypt(p_password, password)
  RETURNING public.users.id, public.users.username, public.users.nama, public.users.role, public.users.sekolah_id, public.users.session_token INTO v_user;
  ```
  On successful credential match, a new `session_token` UUID is generated, saved to `public.users`, and returned in the user payload.
- In `src/components/LoginScreen.tsx:44` and `src/app/page.tsx:73-76`:
  ```typescript
  const handleLoginSuccess = (userData: any) => {
    localStorage.setItem('sipjam_user', JSON.stringify(userData));
    setUser(userData);
  };
  ```

---

### Obs 2: Supabase Client Architecture & Header Injection
- **Single Global Client**: In `src/lib/supabaseClient.ts:119-123`:
  ```typescript
  export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: dynamicTenantFetch,
    },
  });
  ```
- **Service Role Key Absent**: In `.env.local`, only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are provided. `SUPABASE_SERVICE_ROLE_KEY` is undefined. Consequently, both client and server executions use the public anonymous key (`role: 'anon'`).
- **Dynamic Header Injection (`dynamicTenantFetch`)**: In `src/lib/supabaseClient.ts:81-113`:
  ```typescript
  const { sekolahId, role, userId, sessionToken } = getActiveTenantContext();
  if (sekolahId && !headers.has('x-sekolah-id')) headers.set('x-sekolah-id', sekolahId);
  if (role && !headers.has('x-user-role')) headers.set('x-user-role', role);
  if (userId && !headers.has('x-user-id')) headers.set('x-user-id', userId);
  if (sessionToken && !headers.has('x-session-token')) headers.set('x-session-token', sessionToken);
  ```
- **Local Context Extraction (`getActiveTenantContext`)**: In `src/lib/supabaseClient.ts:43-60`:
  ```typescript
  const rawUser = localStorage.getItem('sipjam_user');
  if (rawUser) {
    const user = JSON.parse(rawUser);
    return {
      sekolahId: user?.sekolah_id ? String(user.sekolah_id).trim() : null,
      role: user?.role ? String(user.role).trim() : null,
      userId: user?.id ? String(user.id).trim() : null,
      sessionToken: user?.session_token ? String(user.session_token).trim() : null,
    };
  }
  ```
  If `localStorage.getItem('sipjam_user')` was populated before `session_token` existed, `user.session_token` is `undefined`, so `sessionToken` returned is `null`.
- **No Middleware**: Confirmed no `src/middleware.ts` or `middleware.js` exists in the codebase.
- **Server-Side API Routes**: API routes (e.g. `src/app/api/attendance/auto-alpa/route.ts`) import `supabase` from `@/lib/supabaseClient`. On Node.js/server runtime, `typeof window === 'undefined'`, so `getActiveTenantContext()` returns empty context (`sekolahId: null, role: null, sessionToken: null, userId: null`). Because the client uses the anon key, all server-side cron queries are evaluated under RLS as unauthenticated anon clients.

---

### Obs 3: Database Schema & RLS Policy Gating
- Verified via `pg_policies` query across all 16 tenant tables:
  `absensi`, `asesmen_kolom`, `bank_dokumen`, `chat_messages`, `data_guru`, `data_mapel`, `data_siswa`, `guru_mapel`, `jadwal_pelajaran`, `jadwal_piket`, `jurnal_pembelajaran`, `kalender_pendidikan`, `laporan_piket`, `nilai_siswa`, `pengaturan`, `pengumuman`, `pengumuman_dibaca`, `pengumuman_tanggapan`, `penugasan_piket`, `presensi_guru`, `push_subscriptions`, `riwayat_backup`, `sekolah`, `syarat_perangkat_pembelajaran`, `tujuan_pembelajaran`, `users`, `wali_kelas`.
- **Tenant SELECT Policy Pattern**:
  `USING (is_superadmin() OR (sekolah_id = get_auth_user_sekolah_id()))`
- **Helper Functions** (`supabase/migrations/20260926_secure_rls_helpers.sql:55-123`):
  ```sql
  CREATE OR REPLACE FUNCTION public.get_auth_user_role()
  RETURNS TEXT AS $$
  BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      v_raw := current_setting('request.headers', true)::json->>'x-user-role';
      IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN RETURN v_raw; END IF;
      RETURN 'Superadmin';
    END IF;
    -- (Checks auth.jwt() which is empty for anon)
    -- Checks x-session-token:
    v_raw := current_setting('request.headers', true)::json->>'x-session-token';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      SELECT public.users.role INTO v_role FROM public.users WHERE public.users.session_token = v_raw::uuid;
      RETURN v_role;
    END IF;
    RETURN 'Guest';
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.get_auth_user_sekolah_id()
  RETURNS UUID AS $$
  BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      v_raw := current_setting('request.headers', true)::json->>'x-sekolah-id';
      IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN RETURN v_raw::uuid; END IF;
      RETURN NULL;
    END IF;
    -- (Checks request.jwt.claim.sekolah_id which is empty for anon)
    -- Checks x-session-token:
    v_raw := current_setting('request.headers', true)::json->>'x-session-token';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      SELECT public.users.sekolah_id INTO v_sekolah_id FROM public.users WHERE public.users.session_token = v_raw::uuid;
      RETURN v_sekolah_id;
    END IF;
    RETURN NULL;
  END;
  $$;
  ```
- **Consequence**: An anonymous client request WITHOUT a valid matching `x-session-token` header causes `get_auth_user_sekolah_id()` to return `NULL` and `get_auth_user_role()` to return `'Guest'`. Under RLS:
  `sekolah_id = NULL` evaluates to `FALSE` for every single row. The database returns `0` rows for all tables.

---

### Obs 4: Broken Queries with Non-Existent Columns
1. **`src/lib/workflow.ts:217-219`**:
   ```typescript
   let tQ = supabase.from('data_guru').select('id, nama, username, wajib_hadir_hanya_mengajar');
   if (username) {
     tQ = tQ.or(`nama.eq."${namaGuru}",username.eq."${username}"`);
   }
   ```
   - Schema check of `public.data_guru`: Columns are `id`, `nip`, `nama_guru`, `mata_pelajaran`, `no_hp`, `status`, `email`, `sekolah_id`, `wajib_hadir_hanya_mengajar`, `user_id`.
   - Columns `nama` and `username` **DO NOT EXIST** in `data_guru`.
   - Verbatim Postgres error produced:
     `code: '42703', message: 'column data_guru.nama does not exist'`
   - This occurs inside `getGuruDailyState()` on every teacher dashboard load.

2. **`src/components/AppScreen.tsx:105-108`**:
   ```typescript
   const { data: gData } = await supabase
     .from('data_guru')
     .select('*')
     .or(`id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},nama.eq."${user.nama || ''}"`);
   ```
   - Queries non-existent column `nama` on `data_guru`.
   - Triggers `code: '42703', message: 'column data_guru.nama does not exist'` inside `checkWaliKelas()` on component mount.

---

### Obs 5: PostgREST Filter Syntax Error on Teacher Names with Commas
1. **`src/components/GuruJurnal.tsx:105`**:
   ```typescript
   query = query.or(`nip.eq.${user.username},nama_guru.ilike.%${user.nama}%`);
   ```
2. **`src/components/HomeView.tsx:207`**:
   ```typescript
   mapelQuery = mapelQuery.or(`nip.eq.${user.username},nama_guru.ilike.%${user.nama}%`);
   ```
3. **Database Records**:
   - `SELECT nama_guru FROM public.data_guru WHERE nama_guru LIKE '%,%';` returned:
     - `"Ade Fitrawan Ibrahim, M.Pd., Gr."`
     - `"Tika Mamonto, S.Pd."`
   - `SELECT nama FROM public.users WHERE nama LIKE '%,%';` returned:
     - `"Tika Mamonto, S.Pd."`
4. **Verbatim Error**:
   When testing `.or('nip.eq.Fitra,nama_guru.ilike.%Mohamad Adnan, S.Pd.%')`:
   ```json
   {
     "code": "PGRST100",
     "details": "unexpected \"P\" expecting \"not\" or operator (eq, gt, ...)",
     "hint": null,
     "message": "\"failed to parse logic tree ((nip.eq.Fitra,nama_guru.ilike.%Mohamad Adnan, S.Pd.%))\" (line 1, column 51)"
   }
   ```
   PostgREST splits query parameters by comma. An unquoted comma inside an academic title splits the expression into invalid tokens, breaking data retrieval completely for any teacher with title suffixes.

---

### Obs 6: Relational UUID Disconnection & Schedule Drop (`findJadwalForGuru`)
1. **Migration `supabase/migrations/20260926_add_uuid_fkeys.sql:11`**:
   ```sql
   UPDATE public.jadwal_pelajaran jp SET user_id = u.id FROM public.users u WHERE jp.nama_guru = u.nama AND jp.sekolah_id = u.sekolah_id;
   ```
   - In `public.jadwal_pelajaran`, `nama_guru` contains short names (e.g., `'Adnan'`, `'Riski'`, `'Fitra'`), whereas `public.users.nama` contains full names (`'Mohamad Adnan Mamangkai'`, `'Riski Candra Mamangkai'`, `'FITRA SURYAZANA MAMONTO'`).
   - Query verification:
     `SELECT count(*) FILTER (WHERE user_id IS NOT NULL), count(*) FILTER (WHERE user_id IS NULL) FROM public.jadwal_pelajaran;`
     Result: **3 populated, 48 NULL** (out of 51 rows).
2. **`src/lib/workflow.ts:58-62`**:
   ```typescript
   if (userId) {
     const exactMatches = allJadwal.filter((j: any) => j.user_id === userId);
     if (exactMatches.length > 0) return exactMatches;
   }
   ```
   - If a teacher has even 1 schedule row with `user_id` populated, `exactMatches.length > 0` evaluates to true, and it **only returns that 1 row**, dropping all other schedules where `user_id IS NULL`!
3. **`src/lib/workflow.ts:243, 327, 346`**:
   ```typescript
   if (userId) presensiQuery = presensiQuery.eq('user_id', userId);
   if (userId) piketQuery = piketQuery.eq('user_id', userId);
   if (userId) jurnalQuery = jurnalQuery.eq('user_id', userId);
   ```
   - For any historical or imported record where `user_id` is NULL, querying by `user_id = userId` returns 0 rows.

---

### Obs 7: AdminDataView Direct REST Fallback Header Omission
- In `src/components/AdminDataView.tsx:78-95`:
  ```typescript
  const res = await fetch(endpoint, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  ```
  - When the primary query encounters an issue, this fallback direct fetch fires.
  - It sends only `apikey` and `Authorization`, completely omitting `x-session-token`.
  - Under the hardened RLS policy, PostgREST returns `[]` (0 rows) with status 200. The component interprets this as empty or fails silently, locking the Admin data view in an error state.

---

## 2. Logic Chain

1. **Step 1 (Session Token Invalidation)**:
   - Commit `9ccb279` introduced `20260926_secure_rls_helpers.sql`, replacing `get_auth_user_role()` and `get_auth_user_sekolah_id()`.
   - The new implementation strictly verifies `public.users.session_token = (request.headers->>'x-session-token')::uuid`.
   - If `x-session-token` is absent (such as in pre-existing browser sessions stored in `localStorage`, direct REST fallbacks, or automated test clients), `get_auth_user_sekolah_id()` returns `NULL` and `get_auth_user_role()` returns `'Guest'`.
   - Because RLS on all 16 tenant tables specifies `USING (is_superadmin() OR (sekolah_id = get_auth_user_sekolah_id()))`, all queries return 0 rows. Neither Admin nor Teacher accounts can read data.

2. **Step 2 (Schema Column Regression)**:
   - Even when a fresh login provides a valid `x-session-token`, subsequent component initialization queries fail with SQL errors.
   - Specifically, `workflow.ts:217` queries `data_guru.nama` and `data_guru.username`.
   - Direct inspection of `data_guru` schema proves the column names are `nama_guru` and `nip`.
   - This causes PostgREST to return HTTP 400 (`column data_guru.nama does not exist`), failing the workflow evaluation during dashboard render.

3. **Step 3 (PostgREST Logic Tree Crash on Academic Titles)**:
   - In `GuruJurnal.tsx:105` and `HomeView.tsx:207`, `.or()` filters interpolate `user.nama` directly without double-quoting or sanitizing commas.
   - Teachers with degrees/titles (e.g. `"Tika Mamonto, S.Pd."`) cause PostgREST to split the query string at the comma, resulting in syntax error `PGRST100: failed to parse logic tree`.
   - Consequently, teachers with academic titles cannot load their subject assignments or teaching journals.

4. **Step 4 (Partial Backfill Schedule Truncation)**:
   - Migration `20260926_add_uuid_fkeys.sql` backfilled only 3 of 51 schedules due to string mismatch between `users.nama` (full) and `jadwal_pelajaran.nama_guru` (short).
   - In `workflow.ts:58-62`, `findJadwalForGuru` checks `exactMatches = allJadwal.filter(j => j.user_id === userId)`.
   - Because `exactMatches.length > 0` returns only the backfilled row(s), the fallback fuzzy matcher is skipped, and remaining classes for that teacher are dropped from the daily workflow.

5. **Step 5 (Admin Data Fallback Loop)**:
   - When any transient issue occurs in `AdminDataView`, the component attempts a direct REST fallback via `fetch()`.
   - This fallback omits `x-session-token`, triggering the RLS rejection described in Step 1 and guaranteeing an empty response.

---

## 3. Caveats

1. **Service Role Key in Production Environment**: `.env.local` currently contains only the anon key. If a production deployment sets `SUPABASE_SERVICE_ROLE_KEY`, server-side cron jobs (`/api/attendance/auto-alpa`) would bypass RLS; however, local development and any environment lacking this key will fail unless the client or RLS policies provide appropriate fallback or context.
2. **Student Accounts**: There are no student authentication accounts in the system. The requirement to ensure siswa data access remains intact refers to ensuring student records (`data_siswa`) and attendance/gradebook operations remain fully accessible to authorized school roles (Admins, Teachers, and Wali Kelas).
3. **Session Invalidation on Re-login**: In `verify_login`, `session_token` is re-generated on every login call (`SET session_token = gen_random_uuid()`). If a user has multiple active browser tabs or devices, logging in on one invalidates the session token on the other.

---

## 4. Conclusion

The failure of Admin and Teacher accounts to retrieve and view data is caused by a chain of **5 specific regressions**:

1. **RLS Session Gating on Stored Sessions**: RLS helper functions `get_auth_user_role()` and `get_auth_user_sekolah_id()` reject anon requests lacking `x-session-token`. Existing cached user sessions in `localStorage` without a `session_token` cannot query any tenant tables.
2. **Column Name Mismatch in `data_guru` Queries**: `src/lib/workflow.ts:217` and `src/components/AppScreen.tsx:108` query non-existent columns `nama` and `username` instead of `nama_guru` and `nip`, throwing PostgreSQL error `42703`.
3. **Unescaped Comma in PostgREST `.or()` Filters**: `src/components/GuruJurnal.tsx:105` and `src/components/HomeView.tsx:207` use `.or()` without quoting `user.nama`, causing `PGRST100` errors for teachers with academic titles (`", S.Pd."`, `", M.Pd."`).
4. **Schedule Truncation via `user_id` Matching**: Migration `20260926_add_uuid_fkeys.sql` failed to backfill 48 of 51 schedules due to short name vs full name mismatch. `findJadwalForGuru` prematurely truncates schedule lists when any row matches `user_id`.
5. **Direct REST Fallback in `AdminDataView`**: Bypasses `dynamicTenantFetch` and sends no `x-session-token`, resulting in RLS blocking the fallback request.

---

## 5. Proposed Changes & Verification Method

### Proposed Fixes

#### Fix 1: Update RLS Helper Functions (`supabase/migrations/` & Database)
Allow `get_auth_user_sekolah_id()` and `get_auth_user_role()` to support both `x-session-token` (primary secure path) and legacy `x-sekolah-id` / `x-user-role` headers if the token is transitioning, OR enforce automatic session migration in the client.

#### Fix 2: Client Auto-Migration & Fallback Header (`src/lib/supabaseClient.ts`)
In `getActiveTenantContext()`, if `rawUser` exists but `session_token` is missing, trigger a clean re-auth or populate headers safely. In `dynamicTenantFetch`, ensure headers are forwarded reliably.

#### Fix 3: Fix Column Names in `src/lib/workflow.ts` and `src/components/AppScreen.tsx`
- In `src/lib/workflow.ts:217-219`:
  Change `select('id, nama, username, wajib_hadir_hanya_mengajar')` to:
  `select('id, nama_guru, nip, wajib_hadir_hanya_mengajar')`
  and change `.or('nama.eq...,username.eq...')` to:
  `.or('nama_guru.eq."' + namaGuru.split(',')[0].trim() + '",nip.eq."' + (username || '') + '"')`
- In `src/components/AppScreen.tsx:108`:
  Change `nama.eq."${user.nama || ''}"` to `nama_guru.eq."${user.nama || ''}"`.

#### Fix 4: Double-Quote Strings with Commas in PostgREST Filters
In `GuruJurnal.tsx:105` and `HomeView.tsx:207`:
Sanitize or wrap name search tokens:
```typescript
const cleanName = (user.nama || '').split(',')[0].trim();
query = query.or(`nip.eq."${user.username}",nama_guru.ilike."%${cleanName}%"`);
```

#### Fix 5: Complete Schedule Backfill & Resilient `findJadwalForGuru`
- Run SQL backfill linking `jadwal_pelajaran.nama_guru` to `users.id` using fuzzy/first-name matching.
- In `findJadwalForGuru`: Combine both UUID matches AND name matches instead of returning early on partial UUID matches:
  ```typescript
  const uuidMatches = userId ? allJadwal.filter((j: any) => j.user_id === userId) : [];
  const nameMatches = allJadwal.filter((j: any) => isTeacherMatch(j.nama_guru, undefined, namaGuru, username));
  // Deduplicate combined results by ID
  const map = new Map();
  [...uuidMatches, ...nameMatches].forEach(item => map.set(item.id, item));
  return Array.from(map.values());
  ```

#### Fix 6: Add Session Token to Direct Fallback Fetch in `AdminDataView.tsx`
In `AdminDataView.tsx:88`, inject `'x-session-token': user?.session_token` and `'x-sekolah-id': user?.sekolah_id` into the fallback `fetch()` headers.

---

### Independent Verification Method

1. **Verify Login & Retrieval via Node/TSX**:
   Run:
   `npx tsx .agents/teamwork/explorer_survey_3/simulate_role_flow.ts`
   Confirm both Admin (`admin`) and Teacher (`Riski` / `Adnan`) authenticate and successfully return rows across all tables without RLS errors.
2. **Verify Teacher Dashboard Workflow**:
   Test `getGuruDailyState` with teacher accounts containing academic titles:
   `Mohamad Adnan Mamangkai` (Adnan), `Ade Fitrawan Ibrahim, M.Pd., Gr.`, `Tika Mamonto, S.Pd.`.
   Confirm zero PostgreSQL `42703` or `PGRST100` errors.
3. **Verify Admin Data Matrix**:
   Log in as `admin`, verify `AdminDataView` tabs (`data_siswa`, `data_guru`, `data_mapel`, `jadwal_pelajaran`) load records cleanly.
4. **Verify Existing Tests**:
   Run `npm test` and `npm run test:e2e` to confirm no regressions across existing test suites.
