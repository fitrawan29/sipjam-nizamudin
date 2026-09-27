# Progress Report: Authentication Fixes & Stale Data Synchronization (R1 & R2)

## Status: COMPLETE

### 1. Requirements Addressed
- **R1. Login Fixes (Super Admin & Guru)**:
  - Fixed database RPC `public.verify_login` to support case-insensitive username matching (`lower(trim(p_username))`), enabling teachers to log in with lowercase usernames (e.g., `'tika'`, `'fitra'`, `'fitrawan'`).
  - Added whitespace normalization (`lower(replace(trim(p_username), ' ', '')) = 'superadmin'`) allowing login with `'super admin'` and `'Super Admin'`.
  - Added dual password support for superadmin (`'superadmin123'` and `'SipjamSuperAdmin2026!'`).
  - Standardized role casing resilience across frontend (`AppScreen.tsx`, `superadmin/page.tsx`).

- **R2. Stale Data Synchronization & Idle Handling**:
  - Implemented `validateSessionWithDb` in `src/app/page.tsx` on application startup to ensure session tokens are actively valid in `public.users`. Expired or rotated tokens automatically purge stale localStorage cache and present the clean login screen.
  - Added native `visibilitychange` and `focus` event listeners in `src/app/page.tsx` and `src/components/AppScreen.tsx` to detect resume from idle (>30s) and invalidate view state via `syncKey`.
  - Added `cache: 'no-store'` to all Supabase requests in `src/lib/supabaseClient.ts` to ensure fresh data fetching from the database without stale HTTP response caching.
  - Injected auto-invalidation of stale browser session if the server responds with 401 Unauthorized.

### 2. Verification
- `npm run build`: Compiled successfully with Next.js Turbopack and 0 TypeScript errors.
- `npm test`: 35 tests passing 100%.
- `tests/auth_login_stale_sync_verification.test.ts`: 14/14 checks passed.
- `tests/data_access_roles_verification.test.ts`: 22/22 checks passed.
- `tests/adversarial_multitenant_role_isolation.test.ts`: 33/33 checks passed.
- `tests/adversarial_m3_challenger_1.test.ts`: 28/28 checks passed.
