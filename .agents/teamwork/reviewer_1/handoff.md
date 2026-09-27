> [!WARNING] **Skepticism Disclaimer**
> Moderate confidence (8.8/10); core login and idle synchronization defects were discovered and repaired, backed by 133+ automated tests passing against live Postgres and Turbopack build, but physical mobile hardware lifecycle events (e.g. iOS WebKit aggressive tab suspension) cannot be physically simulated in this terminal environment.

## 1. What the prior attempt got wrong

### Issue 1: Flawed Idle Resume Condition Caused Active View Wiping On Every Window Focus
- **Input**: User clicks away from the window briefly (e.g. opening a file picker to attach an izin letter/photo, switching to another app for 2 seconds, or alt-tabbing).
- **Expected**: Active component state, open modals, and unsaved inputs are preserved. View should only remount if the user was genuinely idle for prolonged period (>= 30s).
- **Actual**: In `src/components/AppScreen.tsx`, line 57 had `if (elapsed > 30000 || document.visibilityState === 'visible')`. Because `document.visibilityState === 'visible'` is always true when returning to the tab, the `||` operator made `elapsed > 30000` completely inert. Every single window focus triggered `setSyncKey(k => k + 1)`, instantly unmounting and remounting child views (`GuruPresensi`, `AdminDataView`, etc.) and wiping uncommitted state.
- **Root Cause**: Faulty boolean logic (`||` instead of `&&`) combined with lack of active user interaction listeners (`pointerdown`, `keydown`). Furthermore, `lastActive` was only initialized on mount and updated on focus, meaning actively typing for 35 seconds without leaving the window would cause the next focus event to be falsely classified as an idle resume.

### Issue 2: `/superadmin` Route Accepted Stale/Expired Session Without Database Validation
- **Input**: User navigates directly to `/superadmin` after session token was revoked, expired, or rotated in the database.
- **Expected**: `/superadmin` route validates the stored session token against `public.users` in Postgres. If invalid/stale, cache is purged and user is redirected to `/` login.
- **Actual**: `src/app/superadmin/page.tsx` only performed local `JSON.parse(localStorage.getItem('sipjam_user'))` and checked role locally without any live database query, allowing stale/expired superadmin tokens to bypass into `SuperadminView`, which subsequently failed queries with RLS errors.
- **Root Cause**: Incomplete implementation of session freshness verification in `src/app/superadmin/page.tsx`.

### Issue 3: Strict Case Comparison in Database Functions for Superadmin Role
- **Input**: Superadmin account or role evaluated with case/whitespace variations in SQL functions.
- **Expected**: `verify_login` and `is_superadmin()` handle role comparisons resiliently (`lower(replace(role, ' ', '')) = 'superadmin'`), matching frontend normalization.
- **Actual**: `verify_login` and `is_superadmin()` used strict equality `public.users.role = 'Superadmin'` and `v_db_role = 'Superadmin'`, which would fail if a database record contained `'superadmin'` or `'Super Admin'`.
- **Root Cause**: Role comparison in SQL lacked normalization functions (`lower` and `replace`).

### Issue 4: Redundant DB Queries and Component Re-renders on Window Focus
- **Input**: User clicking or focusing window frequently in `src/app/page.tsx`.
- **Expected**: Session revalidation is debounced, and `setUser` is only invoked if user fields actually changed in the database.
- **Actual**: `validateSessionWithDb` created a new object reference `{ ...storedUserObj, ...dbUser }` and called `setUser` unconditionally on every focus, forcing full React subtree re-renders.
- **Root Cause**: Lack of debounce threshold on focus listener and absence of value equality check before state update.

---

## 2. What I changed

1. **`src/components/AppScreen.tsx`**:
   - Fixed `handleSyncOnResume`: strictly enforces `elapsed >= 30000 && document.visibilityState === 'visible'`.
   - Added passive `pointerdown` and `keydown` event listeners to continuously update `lastActive`, preventing active typing sessions from being falsely flagged as idle.
   - Cleaned up event listeners on component unmount.

2. **`src/app/superadmin/page.tsx`**:
   - Integrated live Postgres session validation via `supabase.from('users').select(...).eq('id', parsed.id).single()`.
   - Added automatic purge of stale `sipjam_user` cache and redirect to `/` if session token is expired, revoked, or no longer has superadmin role.

3. **`src/app/page.tsx`**:
   - Debounced focus/visibility revalidation with a 15-second minimum interval (`now - lastValidated >= 15000`).
   - Added equality check in `setUser` to only trigger state update if database attributes (`nama`, `role`, `sekolah_id`, `username`, `session_token`) actually differ.

4. **`supabase/migrations/20260926_secure_rls_helpers.sql` & Live PostgreSQL Database**:
   - Updated `verify_login` and `is_superadmin()` functions to use `lower(replace(role, ' ', '')) = 'superadmin'` across all branches.
   - Applied DDL updates to live Supabase instance `jicvvqxjyzntdrccnuyz`.

5. **`tests/auth_login_stale_sync_verification.test.ts`**:
   - Added test `SYNC-04` verifying genuine idle threshold enforcement (`elapsed >= 30000`), user interaction listeners, and `/superadmin` live DB token validation.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx -r dotenv/config tests/auth_login_stale_sync_verification.test.ts dotenv_config_path=.env.local`: **15/15 Passed** (Superadmin login variants, Guru lowercase/mixed case, stale token rejection, cache-busting, genuine idle threshold guard).
  - `npx tsx -r dotenv/config tests/data_access_roles_verification.test.ts dotenv_config_path=.env.local`: **22/22 Passed** (Admin, Guru, Siswa data access, legacy session rejection, session integrity).
  - `npx tsx -r dotenv/config tests/adversarial_multitenant_role_isolation.test.ts dotenv_config_path=.env.local`: **33/33 Passed** (Privilege boundaries, anti-spoofing, zero-trust integrity, tenant isolation).
  - `npx tsx -r dotenv/config tests/adversarial_m3_challenger_1.test.ts dotenv_config_path=.env.local`: **28/28 Passed** (Session token rotation, malformed tokens, academic degrees with commas, boundary cases).
  - `npm test`: **35/35 Passed** (Milestone 4 filters and UI/UX audit suites).
  - `npm run build`: Turbopack build completed successfully with 0 TypeScript/ESLint errors across 11 routes.

- **Shallow Verification (manual only):**
  - Code inspection of `AppScreen.tsx` idle duration calculations and user interaction event listener lifecycles.
  - Review of `dynamicTenantFetch` header injection and `cache: 'no-store'` directive behavior.

- **Unverified aspects:**
  - Real-world mobile OS hardware sleep suspension (e.g. iOS Safari hibernating background tabs for 12+ hours) cannot be tested natively in headless CLI.

---

## 4. Known Issues

- `Minor Robustness Risk`: Offline mode during idle resume will gracefully catch the network error and preserve local state rather than immediately logging the user out. Once connectivity resumes, the next active focus revalidates the session.
- `Minor Robustness Risk`: If a user has two browser tabs open simultaneously and logs in on another device, one tab will invalidate upon returning from idle, while an actively typing tab will invalidate upon its next idle resume or 401 response.

---

## 5. Remaining risk & next step

- **Remaining Risk**: Edge cases with multi-tab session coordination where tab A mutates data while tab B is idle.
- **Next Step**: Task requirements R1 and R2 are fully met and verified with clean Ponytail principles (native browser events, zero external dependencies). The fix is complete and ready for final orchestrator review and deployment.
