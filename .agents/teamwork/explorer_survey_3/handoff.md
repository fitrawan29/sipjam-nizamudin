# Handoff Report — Explorer 3 (Frontend Data Retrieval & Role Flows)

**Date**: 2026-09-26  
**Investigator**: Explorer 3 (Frontend Data Retrieval & Role Flows)  
**Target Application**: SIPJAM Multi-School Attendance & Journal Management System  
**Working Directory**: `.agents/teamwork/explorer_survey_3`  

---

## 1. Observation

### 1.1 Application Architecture & Page Routing
1. **Next.js Single Page Application (SPA)**:
   - File: `src/app/page.tsx` (Lines 10-104).
   - There are no separate Next.js route directories like `/admin/...`, `/guru/...`, or `/siswa/...`.
   - The entire frontend operates as a client-side SPA driven by `MainApp` in `src/app/page.tsx`.
   - Authentication check relies on `localStorage.getItem('sipjam_user')` (lines 56-71).
   - If `storedUser` exists, it renders `<AppScreen user={user} onLogout={handleLogout} />`.
   - If not authenticated, it renders `<LoginScreen onLoginSuccess={handleLoginSuccess} />`.
   - A dedicated Superadmin page exists at `src/app/superadmin/page.tsx` (`/superadmin`), which checks `localStorage.getItem('sipjam_user')` for `role === 'Superadmin'`.

2. **Role & View Matrix in `src/components/AppScreen.tsx`**:
   - Navigation is handled via `currentView` state (synchronized with `?view=<targetId>` via `window.history.pushState` and `popstate` listeners, lines 32-54, 258-314).
   - **Superadmin (`user.role === 'Superadmin'`)**:
     - `view-superadmin-overview`, `view-superadmin-sekolah`, `view-superadmin-admins` -> `<SuperadminView />`
   - **Admin (`user.role === 'Admin'`)**:
     - `view-home` -> `<HomeView />` (Teacher daily monitoring status matrix, attendance, journals, and piket)
     - `view-admin-verif` -> `<AdminVerifView />` (Queue to verify/approve/reject presensi, journals, and piket)
     - `view-jurnal-kelas` -> `<RekapJurnalView initialMode="kelas" />` (Class journal across all grades)
     - `view-piket` -> `<PiketView />` (Teacher & student piket assignment schedule and daily reports)
     - `view-dokumen` -> `<DokumenView />` (Curriculum teaching documents library)
     - `view-gradebook` -> `<GradebookView />` (School-wide gradebook, TP matrix, formative/summative scoring)
     - `view-chat` -> `<ChatView />` (Internal staff messaging)
     - `view-informasi` -> `<InformasiView />` (Broadcast announcements)
     - `view-analitik` -> `<AnalitikView />` (Visual trend charts)
     - `view-admin-rekap` -> `<AdminRekapView />` (Periodical attendance, journal, and piket printable recap)
     - `view-rekap-siswa` -> `<RekapSiswaView />` (Student attendance percentages and logs)
     - `view-admin-data` -> `<AdminDataView />` (Master data: Siswa, Guru, Mapel, Kalender, Jadwal, Wali Kelas CRUD & CSV)
     - `view-admin-backup` -> `<AdminBackupView />` (Database backup)
     - `view-admin-config` -> `<AdminConfigView />` (School settings: GPS coordinates, hours, attendance rules)
     - Modal: `<AccountSettingsModal />` (Profile settings)
   - **Teacher / Guru (`user.role === 'Guru'`)**:
     - `view-home` -> `<HomeView />` (Personal attendance stats, daily gatekeeper status via `getGuruDailyState`, today's schedule, discipline warnings)
     - `view-guru-presensi` -> `<GuruPresensi />` (Selfie clock-in/out, GPS distance check against `pengaturan`, Drive photo upload, Izin/Sakit documentation)
     - `view-guru-jurnal` -> `<GuruJurnal />` (KBM journal entry, student attendance per session, materials, reflection, photo)
     - `view-jurnal-kelas` (Only if `isWaliKelas`) -> `<RekapJurnalView initialMode="kelas" />` (Homeroom class journal)
     - `view-piket` -> `<PiketView />` (View piket schedule, submit daily piket report)
     - `view-dokumen` -> `<DokumenView />` (Upload syllabus, CP, ATP, Modul Ajar)
     - `view-gradebook` -> `<GradebookView />` (Create TP, input student grades for assigned subjects)
     - `view-chat` -> `<ChatView />` (Staff chat)
     - `view-informasi` -> `<InformasiView />` (School announcements)
     - `view-history` -> `<HistoryView />` (Personal attendance history)
     - `view-guru-rekap-jurnal` -> `<RekapJurnalView />` (Personal teaching journal history)
     - `view-rekap-siswa` -> `<RekapSiswaView />` (Student attendance percentage)
     - Modal: `<AccountSettingsModal />` (Profile settings)
   - **Siswa (Student)**:
     - No direct student login or student user account exists (`role: 'Siswa'` is not in `public.users`).
     - Student data resides in `public.data_siswa` (14 records in School A).
     - Student attendance resides in `jurnal_pembelajaran.absensi_siswa` and `public.absensi`.
     - Student scores reside in `public.nilai_siswa`.
     - Student piket duties reside in `public.penugasan_piket` (`tipe_petugas = 'Siswa'`).

### 1.2 Data Fetching Mechanisms
- Direct client-side calls via `supabase.from('<table>')` or `supabase.rpc('<name>')`.
- No SWR, React Query, or Next.js Server Actions are used in frontend views.
- Outgoing requests use `dynamicTenantFetch` in `src/lib/supabaseClient.ts` (lines 81-113), which reads `getActiveTenantContext()` and injects:
  - `x-sekolah-id: user.sekolah_id`
  - `x-user-role: user.role`
  - `x-user-id: user.id`
  - `x-session-token: user.session_token`

### 1.3 Verbatim Empirical Test Observations
1. **Direct Verification Script (`verify_failure_modes.ts`) Output**:
   ```
   --- Mode 1: Legacy Stored Session in localStorage (No session_token) ---
   Legacy Admin results:
     users: 0
     data_guru: 0
     data_siswa: 0
     presensi_guru: 0
     pengaturan: 0

   --- Mode 3: Legacy Guru in localStorage (No session_token) ---
   Legacy Guru results:
     data_guru: 0
     data_siswa: 0
     presensi_guru: 0

   --- Mode 2 & 4: Fresh Login via verify_login RPC (Valid session_token) ---
   Fresh Admin results:
     users: 14
     data_guru: 12
     data_siswa: 14
     presensi_guru: 321
     pengaturan: 52
   Fresh Guru results:
     data_guru: 12
     data_siswa: 14
     presensi_guru: 321
   ```
2. **Database Helper Function Definition (`supabase/migrations/20260926_secure_rls_helpers.sql`)**:
   - `get_auth_user_role()` (lines 61-87):
     ```sql
     IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
       v_raw := current_setting('request.headers', true)::json->>'x-user-role';
       IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN RETURN v_raw; END IF;
       RETURN 'Superadmin';
     END IF;
     ...
     BEGIN
       v_raw := current_setting('request.headers', true)::json->>'x-session-token';
       IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
         SELECT public.users.role INTO v_role FROM public.users WHERE public.users.session_token = v_raw::uuid;
         RETURN v_role;
       END IF;
     EXCEPTION WHEN OTHERS THEN NULL; END;
     RETURN 'Guest';
     ```
   - `get_auth_user_sekolah_id()` (lines 96-122):
     Returns `NULL` unless `request.jwt.claim.role = 'service_role'` or `x-session-token` matches `public.users.session_token`.
3. **Environment Observation (`.env.local`)**:
   - `NEXT_PUBLIC_SUPABASE_URL` is set.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set.
   - `SUPABASE_SERVICE_ROLE_KEY` is NOT set.
   - Therefore, all client and server requests in this app run as PostgREST role `'anon'`.
4. **Workflow Column Mismatch (`src/lib/workflow.ts` lines 217-222)**:
   - Calls `supabase.from('data_guru').select('id, nama, username, wajib_hadir_hanya_mengajar')`.
   - Verified columns in `data_guru`: `id`, `nip`, `nama_guru`, `mata_pelajaran`, `no_hp`, `status`, `email`, `sekolah_id`, `wajib_hadir_hanya_mengajar`, `user_id`.
   - Columns `nama` and `username` DO NOT EXIST on `data_guru`, causing PostgREST query failure.
5. **Existing Test Suite Breakage (`tests/m7_comprehensive_e2e.test.ts`)**:
   - Tests instantiate clients with only headers `x-sekolah-id` and `x-user-role`.
   - Because `20260926_secure_rls_helpers.sql` stripped anon support for these headers, tests fail with:
     `code: '42501', message: 'new row violates row-level security policy for table "wali_kelas"'`.

---

## 2. Logic Chain

1. **Step 1 — Authentication Mechanics**:
   - The app does not issue Supabase Auth tokens; authentication is entirely managed through custom RPC `verify_login(p_username, p_password)` against `public.users`.
   - When successful, `verify_login` returns the user row, which `page.tsx` stores in `localStorage['sipjam_user']`.
2. **Step 2 — The Recent Security Update**:
   - Commit `9ccb279` and migration `20260926_secure_rls_helpers.sql` introduced `session_token` column on `public.users`.
   - The migration modified `get_auth_user_role()` and `get_auth_user_sekolah_id()` to strictly ignore `x-user-role` and `x-sekolah-id` headers for anon requests, requiring `x-session-token` instead.
3. **Step 3 — The Cause of Zero Data for Admin & Teacher**:
   - **Condition A (Stale Browser Session)**: Users already logged in prior to the migration had `sipjam_user` stored in `localStorage` without a `session_token`. When they loaded the app, `page.tsx` saw a truthy `user` and bypassed login. `dynamicTenantFetch` had no `sessionToken` to send, so PostgREST evaluated `get_auth_user_sekolah_id() = NULL`. RLS policies on all tables (`sekolah_id = get_auth_user_sekolah_id()`) evaluated to `FALSE`, resulting in 0 rows returned silently.
   - **Condition B (Single-Device / Multi-Tab Session Invalidation)**: `verify_login` executes `UPDATE public.users SET session_token = gen_random_uuid() WHERE username = ...`. If an admin or teacher logged in from a second tab, device, or test runner, the token in the previous tab's `localStorage` was instantly invalidated in the database, breaking all data retrieval in that tab.
   - **Condition C (Default GPS Failure in GuruPresensi)**: When `pengaturan` returned 0 rows due to Condition A/B, `GuruPresensi.tsx` retained fallback GPS coordinates for Jakarta (`-6.200000, 106.816666`), preventing teachers in Bolaang Mongondow from submitting attendance due to false "outside radius" errors.
   - **Condition D (Workflow Logic Exception)**: In `src/lib/workflow.ts`, querying non-existent columns (`nama`, `username`) on `data_guru` threw errors inside `getGuruDailyState`, corrupting teacher daily state evaluation.
   - **Condition E (Test Harness & API Breakage)**: Automated tests and API routes (`/api/push/subscribe`) created clients without `x-session-token`, causing immediate RLS policy rejections.
4. **Step 4 — Student (Siswa) Data Isolation**:
   - Student data (`data_siswa`, `absensi`, `nilai_siswa`) has the exact same tenant RLS policy `(is_superadmin() OR (sekolah_id = get_auth_user_sekolah_id()))`.
   - When Admin or Teacher session tokens are valid, student data is completely accessible.
   - When Admin or Teacher session tokens are missing or invalid, student data returns 0 rows.
   - Students do not have user credentials and never log in directly.

---

## 3. Caveats

1. **Service Role Key Absent**: `SUPABASE_SERVICE_ROLE_KEY` is not present in the local environment (`.env.local`). All tests and server endpoints execute using the `anon` key. Solutions must not assume `service_role` is available client-side or in local tests.
2. **Session Token Expiry / Multi-Tab Support**: `public.users` currently contains only a single `session_token UUID` column per user. Logging in on one device or running a test script that calls `verify_login` overwrites this single token, invalidating other active browser sessions for that user.
3. **Database Migration State**: The live Supabase database has already executed `20260926_secure_rls_helpers.sql` and `20260926_secure_passwords.sql`. Both `verify_login` and password hashes are bcrypt-encrypted.

---

## 4. Conclusion

The root cause preventing Admin and Teacher (Guru) accounts from reading their data stems from a multi-layer cascade introduced in the recent security update:
1. **Primary Root Cause (Stale/Missing Session Token)**: RLS helper functions (`get_auth_user_sekolah_id`, `get_auth_user_role`) now strictly require an `x-session-token` header matching `public.users.session_token`. Existing authenticated users with legacy `localStorage['sipjam_user']` sessions lacked `session_token`, causing all queries across 17+ tables to return 0 rows.
2. **Session Rotation Invalidation**: `verify_login` regenerates `session_token` on every invocation, invalidating concurrent sessions or active test sessions.
3. **Schema Bug in `workflow.ts`**: `src/lib/workflow.ts` line 217 queries non-existent columns `nama` and `username` on `data_guru` instead of `nama_guru` and `nip`.
4. **GPS Default Fallback Failure**: In `GuruPresensi.tsx`, when `pengaturan` fails to load, coordinates default to Jakarta, locking out teachers from geofenced presensi.
5. **Test Harness & Push API Desync**: Test files and `/api/push/subscribe` do not supply `x-session-token` to their Supabase client instances.

### Actionable Fix Recommendations for Implementer:
1. **In `src/app/page.tsx`**: Check if `storedUser` has a valid `session_token`. If `session_token` is missing or invalid, purge `localStorage.removeItem('sipjam_user')` and force the user to `LoginScreen`, or automatically re-verify.
2. **In `src/lib/workflow.ts`**: Fix column references in line 217 from `nama, username` to `nama_guru, nip`.
3. **In RLS Helpers (`get_auth_user_role`, `get_auth_user_sekolah_id`, `get_auth_user_id`)**:
   - Maintain security by validating `x-session-token` against `public.users`.
   - Provide a safe backward-compatible fallback for authenticated test runners/scripts: if `x-session-token` is absent, allow `x-user-role` and `x-sekolah-id` ONLY when verified against a valid `x-user-id` in `public.users`.
4. **In `src/lib/supabaseClient.ts`**: Update `getTenantSupabaseClient` and `setServerTenantContext` to accept and inject `sessionToken` so test suites and background workers function smoothly.

---

## 5. Verification Method

To independently verify these findings, execute the following commands in the workspace root:

1. **Verify Legacy Session Failure vs Fresh Session Success**:
   ```powershell
   npx tsx .agents/teamwork/explorer_survey_3/verify_failure_modes.ts
   ```
   *Expected Result*: Legacy Admin and Guru with no session token return 0 rows for all tables; Fresh Admin and Guru return all records (12 teachers, 14 students, 321 attendance rows, 52 settings).

2. **Verify Guru Gatekeeper and Specific Table Retrieval**:
   ```powershell
   npx tsx .agents/teamwork/explorer_survey_3/test_riski.ts
   ```
   *Expected Result*: Returns 52 rows for `pengaturan`, 5 rows for `presensi_guru`, and 5 rows for `data_guru`.

3. **Verify Current Test Suite Status**:
   ```powershell
   npx tsx tests/ui_ux_improvements_audit.test.ts
   ```
   *Expected Result*: All UI/UX tests PASS (verifying component rendering and toast integrations).

4. **Verify RLS Test Suite Failure Point**:
   ```powershell
   npx tsx tests/m7_comprehensive_e2e.test.ts
   ```
   *Expected Result*: Demonstrates RLS policy rejection when clients omit `x-session-token`.
