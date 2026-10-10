# Handoff Report — Phase 1 Investigation (R1, R2, R3, R4, R8, R9, R10)
**Agent**: explorer_o19_1  
**Timestamp**: 2026-10-10T10:33:30Z  
**Recipient**: orchestrator_19 (ID: 10338150-5928-42f6-aed4-72eb0fc6dd61)  
**Type**: Hard Handoff (Investigation Complete)

---

## 1. Observation

Direct observations from the codebase via search tools and inspections:

- **R1 (`src/app/api/attendance/route.ts` & `.env.local`)**:
  - `src/app/api/attendance/route.ts` line 27–30:
    ```ts
    const { data } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!',
    });
    ```
  - `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.env.local` contains Supabase and Webhook keys, but currently lacks `SUPERADMIN_API_PASSWORD`.
  - `grep_search` for `SipjamSuperAdmin` across `src/` yielded exactly 1 match: line 29 in `src/app/api/attendance/route.ts`.

- **R2 (`src/app/page.tsx`)**:
  - Lines 16 & 22 contain:
    - Line 16: `const { data: { session } } = await supabase.auth.getSession();`
    - Line 22: `const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { ... });`
  - The `session` state in `Home()` (line 10) is set, but never passed to `MainApp` (line 44 `<MainApp />`).
  - `MainApp` independently checks `localStorage.getItem('sipjam_user')` and validates via `validateSessionWithDb` (line 55).

- **R3 (`src/components/HomeView.tsx`)**:
  - Line 78 contains verbatim:
    ```ts
    const isGuru = user?.role !== 'Admin';
    ```
  - When `user.role` is `'superadmin'` or `'Superadmin'`, `'superadmin' !== 'Admin'` evaluates to `true`.
  - In `AppScreen.tsx` line 61–63, the role check is normalized:
    ```ts
    const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
    const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';
    ```

- **R4 (`src/components/AdminVerifView.tsx`)**:
  - Lines 64, 71, 78 verbatim:
    ```ts
    .channel('verif-presensi')
    .channel('verif-jurnal')
    .channel('verif-piket')
    ```
  - Component receives `user: any` containing `user.sekolah_id`.

- **R8 (`src/app/layout.tsx`)**:
  - Line 46 contains:
    ```tsx
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    ```
  - Currently no `preconnect` link exists before line 46.

- **R9 (`src/lib/supabaseClient.ts`)**:
  - Lines 214–227 contains top-level connectivity check:
    ```ts
    if (typeof window !== 'undefined') {
      supabase.from('sekolah').select('id').limit(1).then(...)
    }
    ```
  - No execution guard / once-flag exists.

- **R10 (`src/app/api/sync-spreadsheet/`)**:
  - `list_dir` on `src/app/api/sync-spreadsheet` returned `Empty directory` (0 files).
  - `git ls-files src/app/api/sync-spreadsheet` returned empty output.
  - Project search for `sync-spreadsheet` returned 0 matches.
  - Actual spreadsheet sync is handled in `AdminBackupView.tsx` via direct client-side fetch to `NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL`.

---

## 2. Logic Chain

1. **R1**: Because line 29 of `src/app/api/attendance/route.ts` hardcodes `'SipjamSuperAdmin2026!'`, any repository reader has access to the plaintext password. By reading `process.env.SUPERADMIN_API_PASSWORD` and returning `null` if not set, credentials are kept out of source code. Setting `SUPERADMIN_API_PASSWORD=SipjamSuperAdmin2026!` in `.env.local` ensures backward compatibility for legitimate API use.
2. **R2**: Because `MainApp` solely uses `sipjam_user` in `localStorage`, the `supabase.auth` checks in `Home()` incur useless network overhead and delay rendering behind an unnecessary loading spinner. Removing lines 10–41 and rendering `<MainApp />` directly inside `<div className="mobile-container flex flex-col min-h-screen min-h-dvh relative">` eliminates the redundant auth calls while preserving `supabase.from('users')` inside `MainApp`.
3. **R3**: Because `'Superadmin' !== 'Admin'` evaluates to `true`, Superadmins viewing `HomeView` are erroneously classified as `isGuru = true`, causing teacher workflows to mount instead of admin matrix views. Standardizing to `const role = (user?.role || '').toLowerCase().replace(/\s+/g, ''); const isSuperadmin = role === 'superadmin'; const isAdmin = isSuperadmin || role === 'admin'; const isGuru = !isAdmin;` guarantees exact role separation.
4. **R4**: Because channel names `'verif-presensi'`, `'verif-jurnal'`, `'verif-piket'` are shared across all tenants, mutations in one school trigger unnecessary reload events in other schools. Interpolating `-${user?.sekolah_id || 'global'}` provides complete tenant isolation.
5. **R8**: Because `cdnjs.cloudflare.com` is a cross-origin resource, adding `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />` allows early socket setup (DNS + TCP + TLS) during HTML parsing, eliminating connection setup latency.
6. **R9**: Because module imports can trigger repeatedly during hydration or chunk loading, adding `let _connectivityChecked = false` ensures the probe query runs strictly once per browser session.
7. **R10**: Because `src/app/api/sync-spreadsheet` is an empty folder with 0 files, 0 git tracking, and 0 references in the codebase, deleting it has zero regression risk and cleans up dead workspace clutter.

---

## 3. Caveats

- **Existing test failures in M6.2**: Running `npm test` showed that `tests/m6_2_print_redesign.test.ts` has 8 pre-existing test failures related to `PrintOrientationToggle` components. These are unrelated to Phase 1 (R1-R4, R8-R10) and should not be confused with regressions.
- **`.env.local` distribution**: Environment variables in `.env.local` are not committed to git (per standard `.gitignore`). Ensure deployment environments also receive `SUPERADMIN_API_PASSWORD`.
- **`src/app/page.tsx` imports**: `import { supabase } from '@/lib/supabaseClient';` must remain in `page.tsx` because `MainApp` calls `supabase.from('users')`.

---

## 4. Conclusion

Phase 1 requirements are fully specified, verified, and mapped to exact code edits:
- **R1**: Replace hardcoded password in `src/app/api/attendance/route.ts:24-37` with `process.env.SUPERADMIN_API_PASSWORD` check (return null if unset), and append `SUPERADMIN_API_PASSWORD=SipjamSuperAdmin2026!` to `.env.local`.
- **R2**: Simplify `Home()` in `src/app/page.tsx:9-47` to directly return `<div className="mobile-container flex flex-col min-h-screen min-h-dvh relative"><MainApp /></div>`.
- **R3**: Update `src/components/HomeView.tsx:78` to derive `isGuru = !isAdmin` via normalized `role`.
- **R4**: Scope channel names in `src/components/AdminVerifView.tsx:64,71,78` with template string `${user?.sekolah_id || 'global'}`.
- **R8**: Add `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />` before line 46 in `src/app/layout.tsx`.
- **R9**: Add `let _connectivityChecked = false;` once-flag in `src/lib/supabaseClient.ts:214-227`.
- **R10**: Delete the empty directory `src/app/api/sync-spreadsheet/`.

Detailed diffs and lines are documented in `analysis.md`.

---

## 5. Verification Method

To independently verify the changes once applied:

1. **Security Grep Check**:
   ```powershell
   # Must return empty
   git grep -i "SipjamSuperAdmin" src/
   ```
2. **Page Auth Grep Check**:
   ```powershell
   # Must return empty
   git grep "supabase.auth" src/app/page.tsx
   ```
3. **Realtime Channel Grep Check**:
   ```powershell
   # Must return empty (string literals without scoping)
   git grep "verif-presensi'" src/components/AdminVerifView.tsx
   ```
4. **Preconnect Link Check**:
   ```powershell
   git grep "preconnect.*cdnjs" src/app/layout.tsx
   ```
5. **Connectivity Once-Flag Check**:
   ```powershell
   git grep "_connectivityChecked" src/lib/supabaseClient.ts
   ```
6. **Sync-Spreadsheet Directory Check**:
   ```powershell
   Test-Path "src/app/api/sync-spreadsheet" # Must return False
   ```
7. **Build Check**:
   ```powershell
   npm run build
   ```
   Must compile successfully with 0 TypeScript errors.
