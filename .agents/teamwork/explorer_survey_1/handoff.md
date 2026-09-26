# Handoff Report — Explorer 1: Git History & Recent Updates Investigation

## 1. Observation

### 1.1 Git Commit History & Recent Changes Overview
Direct examination of `git log` reveals several recent updates that altered authentication, multi-tenant RLS helper functions, relational foreign keys, profile updates, and UI data fetching:
- **`5c7a25c`** (`fix: update local migrations for pgcrypto extensions schema prefix`): Modified `supabase/migrations/20260926_secure_passwords.sql` and `20260926_secure_rls_helpers.sql`.
- **`4eeaa3d`** (`fix: correct column names in local migrations to align with schema`): Modified `20260925_cascade_profile_updates.sql` and `20260926_add_uuid_fkeys.sql`.
- **`ee98313`**, **`6028a3e`**, **`5757327`**, **`c53b2e3`**: UI/UX audit commits modifying `GuruPresensi.tsx`, `GuruJurnal.tsx`, `AdminDataView.tsx`, `AppScreen.tsx`, `PiketView.tsx`, `RekapJurnalView.tsx`, `GradebookView.tsx`, and `supabaseClient.ts`.
- **`6f68e0b`** (`fix: resolve relational loss on profile update by fully adopting user_id for presensi, jurnal, piket`): Switched `workflow.ts` (`getGuruDailyState`) and submission components to query strictly by `user_id` when present.
- **`7824858` / `9ccb279`** (`Fix security vulnerabilities: secure passwords, RLS helpers, and API routes`): Added bcrypt password hashing, session tokens (`session_token UUID`), and replaced header-based RLS resolution (`x-sekolah-id`) with session token header lookup (`x-session-token`).
- **`2462652`** (`Fix data integrity and architecture issues`): Added `user_id` foreign keys to operational tables (`jadwal_pelajaran`, `jurnal_pembelajaran`, `presensi_guru`, `laporan_piket`, `data_guru`) and modified `findJadwalForGuru` in `src/lib/workflow.ts` to favor UUID matching.

---

### 1.2 Verbatim Observations & Tool Verifications

#### Observation O1: Missing `x-session-token` Locks Out All Tenant Data (RLS Returns 0 Rows)
- **File**: `supabase/migrations/20260926_secure_rls_helpers.sql` lines 90–123:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_auth_user_sekolah_id()
  RETURNS UUID AS $$
  DECLARE
    v_sekolah_id UUID;
    v_raw TEXT;
  BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      v_raw := current_setting('request.headers', true)::json->>'x-sekolah-id';
      IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
        RETURN v_raw::uuid;
      END IF;
      RETURN NULL;
    END IF;

    BEGIN
      v_raw := current_setting('request.jwt.claim.sekolah_id', true);
      IF v_raw IS NOT NULL AND v_raw <> '' THEN
        RETURN v_raw::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      v_raw := current_setting('request.headers', true)::json->>'x-session-token';
      IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
        SELECT public.users.sekolah_id INTO v_sekolah_id FROM public.users WHERE public.users.session_token = v_raw::uuid;
        RETURN v_sekolah_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN NULL;
  END;
  $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
  ```
- **Observed Behavior**: The frontend client connects using `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`request.jwt.claim.role = 'anon'`). For anonymous connections, `get_auth_user_sekolah_id()` ignores `x-sekolah-id` and depends 100% on `request.headers ->> 'x-session-token'`.
- **Empirical Test Result**:
  - Request with only `x-sekolah-id`, `x-user-role`, `x-user-id` (no `x-session-token`):
    `users` returned **0 rows**, `data_guru` returned **0 rows**, `error: undefined`.
  - Request with valid `x-session-token`:
    `users` returned **14 rows**, `data_guru` returned **12 rows**, `presensi_guru` returned **321 rows**, `jurnal_pembelajaran` returned **202 rows**.
- **Impact on Pre-Existing Sessions (`src/app/page.tsx:55-71`)**:
  `page.tsx` reads `localStorage.getItem('sipjam_user')` on load and immediately renders `AppScreen`. If a user (Admin or Teacher) logged in before commit `9ccb279`, their `sipjam_user` JSON object lacks `session_token`. The app loads, bypasses the login screen, but `dynamicTenantFetch` never sends `x-session-token`. Consequently, **all** Supabase queries for that user return 0 rows silently.

---

#### Observation O2: Schema Mismatch — Non-Existent Column `nama` on `data_guru`
- **File**: `src/components/AppScreen.tsx` lines 105–108:
  ```ts
  const { data: gData } = await supabase
    .from('data_guru')
    .select('*')
    .or(`id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},nama.eq."${user.nama || ''}"`);
  ```
- **File**: `src/components/RekapJurnalView.tsx` lines 89–92:
  ```ts
  const { data: gData } = await supabase
    .from('data_guru')
    .select('*')
    .or(`id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},nama.eq."${user.nama || ''}"`);
  ```
- **File**: `src/lib/workflow.ts` lines 217–222:
  ```ts
  let tQ = supabase.from('data_guru').select('id, nama, username, wajib_hadir_hanya_mengajar');
  if (username) {
    tQ = tQ.or(`nama.eq."${namaGuru}",username.eq."${username}"`);
  } else {
    tQ = tQ.eq('nama', namaGuru);
  }
  ```
- **Empirical Execution Result**:
  ```json
  {
    "code": "42703",
    "details": null,
    "hint": null,
    "message": "column data_guru.nama does not exist"
  }
  ```
- **Database Schema of `data_guru`**: The actual columns are `['id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email', 'sekolah_id', 'wajib_hadir_hanya_mengajar', 'user_id']`. There is no `nama` column and no `username` column. In `data_guru`, the teacher's name is `nama_guru` and the username/NIP is stored under `nip`. In addition, `data_guru.id` is the table's own primary key, not `users.id` (which is stored in `data_guru.user_id`).

---

#### Observation O3: Broken Relational Matching and Truncated Jadwal in `workflow.ts`
- **File**: `src/lib/workflow.ts` lines 58–62:
  ```ts
  if (userId) {
    const exactMatches = allJadwal.filter((j: any) => j.user_id === userId);
    // If we find matches by UUID, trust them implicitly and skip fuzzy string matching
    if (exactMatches.length > 0) return exactMatches;
  }
  ```
- **File**: `supabase/migrations/20260926_add_uuid_fkeys.sql` line 11:
  ```sql
  UPDATE public.jadwal_pelajaran jp SET user_id = u.id FROM public.users u WHERE jp.nama_guru = u.nama AND jp.sekolah_id = u.sekolah_id;
  ```
- **Empirical Database Audit of `user_id` Column State**:
  - `jadwal_pelajaran`: **51 total rows**, **48 rows with `user_id = NULL`**, only **3 rows with `user_id NOT NULL`**.
  - `data_guru`: **12 total rows**, **2 rows with `user_id = NULL`**, **10 rows with `user_id NOT NULL`**.
  - `presensi_guru`: **321 total rows**, **1 row with `user_id = NULL`**, **320 rows with `user_id NOT NULL`**.
- **Failure Mechanism**: In `jadwal_pelajaran`, `nama_guru` often holds abbreviated names (e.g., "Ade", "Riski") while `public.users.nama` holds full names (e.g., "FITRA SURYAZANA MAMONTO", "Riski Candra Mamangkai"). The migration backfill failed on 48 out of 51 rows. When a teacher with even a single partial UUID match logs in, `findJadwalForGuru` returns **only** the UUID matches and discards all remaining classes for that teacher.
- **Filtering by `user_id` in `workflow.ts` lines 298–301, 388–391, 412–415**:
  ```ts
  if (userId) presensiQuery = presensiQuery.eq('user_id', userId);
  else presensiQuery = presensiQuery.eq('nama_guru', namaGuru);
  ```
  If any existing presensi, jurnal, or piket record has `user_id IS NULL`, querying with `eq('user_id', userId)` completely ignores those rows.

---

#### Observation O4: Discrepancy Between `verify_login` Migrations
- **File**: `supabase/migrations/20260926_secure_passwords.sql` lines 11–25:
  ```sql
  CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
  RETURNS TABLE (
    id UUID,
    username TEXT,
    nama TEXT,
    role TEXT,
    sekolah_id UUID
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT u.id, u.username, u.nama, u.role, u.sekolah_id
    FROM public.users u
    WHERE u.username = trim(p_username) AND u.password = extensions.crypt(p_password, u.password);
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
  ```
- **File**: `supabase/migrations/20260926_secure_rls_helpers.sql` lines 3–29:
  ```sql
  CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
  RETURNS TABLE (
    id UUID,
    username TEXT,
    nama TEXT,
    role TEXT,
    sekolah_id UUID,
    session_token UUID
  ) AS $$
  ...
  ```
- **Conflict**: If `20260926_secure_passwords.sql` is run after `20260926_secure_rls_helpers.sql`, `verify_login` is redefined to omit `session_token`.
- **Plaintext vs Hashed Passwords**: Newly inserted users (such as those inserted in `tests/m7_challenger_rls.test.ts` or via direct admin user creation) have plaintext passwords. Since `verify_login` requires `extensions.crypt(p_password, u.password)`, plaintext users fail authentication:
  `❌ FAIL [6]: verify_login failed for Admin A or wrong sekolah_id null`

---

## 2. Logic Chain

1. **Step 1 (O1 -> Data Invisibility)**:
   - Commit `9ccb279` locked down `get_auth_user_sekolah_id()` to strictly require `request.headers ->> 'x-session-token'`.
   - Any user (Admin or Teacher) whose session in `localStorage` was created before this change (or whose login did not persist `session_token`) does not send `x-session-token`.
   - `get_auth_user_sekolah_id()` returns `NULL`.
   - All RLS policies check `sekolah_id = public.get_auth_user_sekolah_id()`.
   - All queries return `[]` (0 rows). The user perceives that their data has disappeared or cannot be read.

2. **Step 2 (O2 -> Component Crash & False Alpa)**:
   - Recent changes in `AppScreen.tsx` line 108 and `RekapJurnalView.tsx` line 92 attempted to resolve Wali Kelas data by querying `data_guru` using `.or('id.eq...,nama.eq...')`.
   - Because `data_guru` has no `nama` column, PostgREST returns error `42703 (column data_guru.nama does not exist)`.
   - In `workflow.ts` line 217, the attendance exemption check queries `select('id, nama, username, wajib_hadir_hanya_mengajar')`. This query fails with `42703`.
   - The failure is caught by an empty `catch`, leaving `isTeacherExempt = false`. On days when teachers have no scheduled classes, they are erroneously marked `isAlpa = true`.

3. **Step 3 (O3 -> Missing Schedules & Truncated Operational Data)**:
   - Commits `2462652` and `6f68e0b` assumed all operational tables had `user_id` populated.
   - Empirical query of the database revealed 48 out of 51 rows in `jadwal_pelajaran` have `user_id = NULL` because the backfill query performed strict string matching (`jp.nama_guru = u.nama`) against abbreviated names.
   - In `workflow.ts`, `findJadwalForGuru` was updated so that if any `user_id` matches exist, it skips fuzzy matching and returns only the UUID matches. Teachers therefore lose visibility over the rest of their class schedules.
   - Strict `eq('user_id', userId)` queries on `presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket` drop any records that have `user_id = NULL`.

4. **Step 4 (O4 -> Re-login and New User Creation Failure)**:
   - `20260926_secure_passwords.sql` in commit `5c7a25c` defines `verify_login` without `session_token`, clashing with `20260926_secure_rls_helpers.sql`.
   - When new users or tests create accounts without bcrypt hashing, `verify_login` rejects them because `extensions.crypt()` cannot verify against plaintext passwords.

---

## 3. Caveats

- **External Services**: Google Drive upload webhook and Web Push services were not tested live as they depend on external endpoints (`script.google.com`).
- **Superadmin Immunity**: Superadmin accounts (`sekolah_id IS NULL`, `role = 'Superadmin'`) bypass tenant RLS via `is_superadmin()` using `x-user-id`, which is why Superadmin was able to see data while school Admins and Teachers could not.
- **Student Role**: Students (`siswa`) do not log in directly with user accounts; student data (`data_siswa`, `absensi`, `nilai_siswa`) is accessed by Admins and Teachers (Wali Kelas / Guru Mapel). Restoring Admin and Teacher RLS and query integrity directly restores student data retrieval.

---

## 4. Conclusion

The inability of Admin and Teacher accounts to read their data following the recent update is caused by four interrelated root causes:
1. **RLS Lockdown vs Legacy Client Sessions**: RLS helper `get_auth_user_sekolah_id()` was hardened to require `x-session-token`, but pre-existing sessions in `localStorage` have no `session_token`, causing all tenant queries to return 0 rows.
2. **PostgREST Column Name Crashes**: Queries in `AppScreen.tsx` (line 108), `RekapJurnalView.tsx` (line 92), and `workflow.ts` (line 217) query `data_guru.nama` and `data_guru.username`, which do not exist in PostgreSQL (the columns are `nama_guru` and `nip`).
3. **Incomplete `user_id` Backfill in `jadwal_pelajaran` & Premature Fuzzy Fallback Bypass**: 48 of 51 rows in `jadwal_pelajaran` have `user_id = NULL`. `findJadwalForGuru` and daily state queries in `workflow.ts` prematurely bypass fuzzy matching and drop unlinked rows.
4. **`verify_login` Migration Conflict & Plaintext Fallback**: `20260926_secure_passwords.sql` omits `session_token` from `verify_login`, and lacks fallback for plaintext passwords during login verification.

---

## 5. Verification Method

To independently reproduce and verify each observation:

1. **Verify RLS Failure on Missing Session Token**:
   Run a test client with only `x-sekolah-id`, `x-user-role`, and `x-user-id` (no `x-session-token`):
   ```bash
   npx tsx -e "
     import { createClient } from '@supabase/supabase-js';
     import * as dotenv from 'dotenv';
     dotenv.config({ path: '.env.local' });
     const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
       global: { headers: { 'x-sekolah-id': 'a0000000-0000-0000-0000-000000000001', 'x-user-role': 'Admin', 'x-user-id': 'd23141e4-2116-4946-8094-895ef21a50e5' } }
     });
     c.from('data_guru').select('*').then(r => console.log('Rows returned without session token:', r.data?.length));
   "
   ```
   *Expected Result*: Returns `Rows returned without session token: 0`.

2. **Verify Column `nama` Error on `data_guru`**:
   Execute the query from `AppScreen.tsx:108`:
   ```bash
   npx tsx -e "
     import { createClient } from '@supabase/supabase-js';
     import * as dotenv from 'dotenv';
     dotenv.config({ path: '.env.local' });
     const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
     c.from('data_guru').select('*').or('id.eq.00000000-0000-0000-0000-000000000000,nama.eq.Test').then(r => console.log('Error:', r.error));
   "
   ```
   *Expected Result*: Returns `code: '42703', message: 'column data_guru.nama does not exist'`.

3. **Verify `jadwal_pelajaran` Unlinked Row Count**:
   Execute:
   ```bash
   npx tsx -e "
     import { createClient } from '@supabase/supabase-js';
     import * as dotenv from 'dotenv';
     dotenv.config({ path: '.env.local' });
     const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
     c.rpc('verify_login', { p_username: 'superadmin', p_password: 'SipjamSuperAdmin2026!' }).then(async ({ data }) => {
       const sc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
         global: { headers: { 'x-user-role': 'Superadmin', 'x-user-id': data[0].id, 'x-session-token': data[0].session_token } }
       });
       const { data: jp } = await sc.from('jadwal_pelajaran').select('id, user_id');
       console.log('Total:', jp.length, 'NULL user_id:', jp.filter(r => !r.user_id).length);
     });
   "
   ```
   *Expected Result*: `Total: 51 NULL user_id: 48`.
