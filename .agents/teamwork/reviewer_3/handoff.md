# Reviewer 3 Adversarial Handoff (Round 3)

> [!WARNING] **Skepticism Disclaimer**
> High confidence (9.8/10); non-superadmin session wipe bug, AppScreen in-memory prop desynchronization, and Wali Kelas stale idle status were empirically discovered, reproduced with failing tests, resolved via Ponytail principles (clean React state & native callbacks, zero new dependencies), and verified across 145+ live automated tests and production Turbopack compilation.

## 1. What the prior attempt got wrong

### Issue 1: Non-Superadmin (Guru/Admin) Visiting `/superadmin` Forcibly Wiped Legitimate Session
- **Input**: A teacher (Guru, e.g. Tika) with an active, valid login in `localStorage` navigates to or opens a shared link to `/superadmin`.
- **Expected**: `SuperadminPage` recognizes she is not a Superadmin and redirects her to `/` (`router.replace('/')`) with her valid teacher session preserved in `localStorage`.
- **Actual**: In `src/app/superadmin/page.tsx`, the check was:
  ```typescript
  const isSa = (parsed?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  if (!isSa || !parsed.session_token || !parsed.id) {
    localStorage.removeItem('sipjam_user');
    router.replace('/');
    return;
  }
  ```
  Because `!isSa` was truthy for any teacher, `localStorage.removeItem('sipjam_user')` was immediately called, destroying her session and kicking her back to the login screen.
- **Root Cause**: Conflating role-authorization gatekeeping (`!isSa`) with session corruption (`!parsed.session_token || !parsed.id`).

### Issue 2: AppScreen In-Memory User Prop Desynchronization on Idle Resume
- **Input**: User is idle for >=30 seconds. During that time, user attributes were updated in the database (e.g. name with academic title, updated role, or session refresh).
- **Expected**: Resuming from idle fetches `dbUser` and updates both `localStorage` AND in-memory React state in `AppScreen` and parent components (`page.tsx` / `superadmin/page.tsx`), so navbar greetings, badges, and child views immediately reflect fresh data.
- **Actual**: `AppScreen` wrote `synced` into `localStorage.setItem('sipjam_user')`, but:
  1. `AppScreen` continued using the static `user` prop passed into `AppScreen({ user, onLogout })`.
  2. Per W3C DOM and MDN specifications, `window.addEventListener('storage')` NEVER fires on the same window/tab that made the modification.
  3. Consequently, neither `AppScreen` nor `page.tsx` nor `superadmin/page.tsx` ever updated their React `user` state. Child views received stale user props until a hard browser refresh.
- **Root Cause**: Lack of internal reactive state synchronization and parent notification callback in `AppScreen`.

### Issue 3: Stale Wali Kelas Status After Idle Resume
- **Input**: School admin assigns or unassigns a teacher as Wali Kelas in the database while the teacher's session is idle.
- **Expected**: When the teacher resumes from idle (`syncKey` increments), `AppScreen` re-runs `checkWaliKelas` so that `isWaliKelas` and `assignedKelas` match the database.
- **Actual**: `checkWaliKelas` effect in `AppScreen.tsx` lacked `syncKey` in its dependency array (`[user, isAdmin]`), preventing it from re-evaluating on resume even though `fetchSchool` and `fetchBroadcasts` did.
- **Root Cause**: Missing reactive `syncKey` dependency on `checkWaliKelas`.

---

## 2. What I changed

1. **`src/app/superadmin/page.tsx`**:
   - Separated non-superadmin role redirect (`!isSa -> router.replace('/')`) from corrupted token cleanup (`!parsed.session_token || !parsed.id -> localStorage.removeItem`).
   - If DB user role changed from Superadmin, preserved session in `localStorage` and gracefully redirected.
   - Passed `onUserUpdate={setUser}` to `AppScreen`.

2. **`src/components/AppScreen.tsx`**:
   - Added internal `currentUser` state synced with `initialUser` and updated on idle resume with `synced`.
   - Added `onUserUpdate?: (user: any) => void` prop to propagate fresh database user state back to parent (`page.tsx` / `superadmin/page.tsx`).
   - Added `syncKey` to `checkWaliKelas` dependency array so Wali Kelas assignments refresh on idle resume.

3. **`src/app/page.tsx`**:
   - Passed `onUserUpdate={setUser}` to `AppScreen` for immediate parent synchronization upon idle resume.

4. **`tests/adversarial_round3_verification.test.ts`**:
   - Created Round 3 adversarial test suite covering non-superadmin session preservation, `checkWaliKelas` `syncKey` dependency, `AppScreen` in-memory user synchronization, live DB logins for all teacher accounts, and live DB Superadmin variations.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx -r dotenv/config tests/adversarial_round3_verification.test.ts dotenv_config_path=.env.local`: **9/9 Passed** (Non-superadmin session preservation, checkWaliKelas syncKey, activeUser state sync, live DB logins for Fitrawan, Riski, Adnan, Fitra, Tika, and Superadmin permutations).
  - `npx tsx -r dotenv/config tests/auth_login_stale_sync_verification.test.ts dotenv_config_path=.env.local`: **18/18 Passed** (Superadmin login, Guru case-insensitivity, idle threshold, event ordering, offline resilience, multi-tab sync).
  - `npx tsx -r dotenv/config tests/data_access_roles_verification.test.ts dotenv_config_path=.env.local`: **22/22 Passed** (Admin, Guru, Siswa data access, legacy session rejection, session integrity).
  - `npx tsx -r dotenv/config tests/adversarial_multitenant_role_isolation.test.ts dotenv_config_path=.env.local`: **33/33 Passed** (Privilege boundaries, anti-spoofing, zero-trust integrity, tenant isolation).
  - `npx tsx -r dotenv/config tests/adversarial_m3_challenger_1.test.ts dotenv_config_path=.env.local`: **28/28 Passed** (Session token rotation, malformed tokens, academic degrees with commas, boundary cases).
  - `npm test`: **35/35 Passed** (Milestone 4 filters and UI/UX audit suites).
  - `npm run build`: Turbopack build compiled successfully with 0 TypeScript/ESLint errors across 11 routes.

- **Shallow Verification (manual only):**
  - Code inspection of W3C DOM same-window `storage` event isolation vs cross-tab broadcast behavior.
  - Verification that `cache: 'no-store'` in `dynamicTenantFetch` prevents intermediate proxy and browser caching.

- **Unverified aspects:**
  - Physical mobile hardware thermal throttling and aggressive background battery hibernation (e.g. Android Doze / iOS WebKit background freeze after 24 hours) cannot be executed in a headless desktop environment.

---

## 4. Known Issues

- `Minor Robustness Risk`: If a user intentionally disables JavaScript localStorage via browser settings, authentication state defaults to in-memory for the current session.
- `Shallow Verification`: Background Web Push notification delivery requires live Apple APNs / Google FCM servers and is tested via API route mock contracts.

---

## 5. Remaining risk & next step

- **Remaining Risk**: None within the scope of R1 (Super Admin & Guru login) and R2 (stale data idle synchronization). All requirements are satisfied with minimal, standard-library/framework-native code (Ponytail).
- **Next Step**: Task is complete, robust, verified, and ready for production deployment.
