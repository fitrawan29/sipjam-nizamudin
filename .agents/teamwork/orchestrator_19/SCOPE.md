# Scope: SIPJAM Maintenance & Refactoring (R1 - R10)

## Architecture & Code Layout
- `src/app/api/attendance/route.ts` - Attendance API & superadmin credentials
- `src/app/page.tsx` - App entry point & auth listener cleanup
- `src/components/HomeView.tsx` - Dashboard view (to be split into HomeViewGuru.tsx, HomeViewAdmin.tsx, HomeView.tsx)
- `src/components/AdminVerifView.tsx` - Admin verification realtime channels
- `src/types/user.ts` - New AppUser interface
- `src/hooks/` - New hooks: useSessionSync.ts, useWaliKelas.ts, usePiket.ts, useBroadcasts.ts
- `src/components/AppScreen.tsx` - Main app orchestrator view, consume hooks & AppUser
- `src/components/LoginScreen.tsx` - Consume AppUser
- `src/components/GuruPresensi.tsx` - Consume AppUser
- `src/app/layout.tsx` - Add preconnect to Font Awesome
- `src/lib/supabaseClient.ts` - Connectivity check once-flag
- `src/app/api/sync-spreadsheet/` - Dead code investigation & cleanup

## Feature Inventory & Requirements
| # | Requirement | Description | Target Files | Phase |
|---|-------------|-------------|--------------|-------|
| R1 | Security: Superadmin password | Move plaintext password in route.ts to env var SUPERADMIN_API_PASSWORD in .env.local; return null if absent | `src/app/api/attendance/route.ts`, `.env.local` | 1 |
| R2 | Auth Duplication | Remove getSession() and onAuthStateChange in page.tsx; render MainApp directly | `src/app/page.tsx` | 1 |
| R3 | Bugfix isGuru | Fix isGuru = !isAdmin in HomeView.tsx matching AppScreen.tsx | `src/components/HomeView.tsx` | 1 |
| R4 | Realtime Scope | Scope channels with user?.sekolah_id in AdminVerifView.tsx | `src/components/AdminVerifView.tsx` | 1 |
| R8 | Font Awesome Preconnect | Add preconnect link in layout.tsx | `src/app/layout.tsx` | 1 |
| R9 | Connectivity Once-Flag | Add once-flag in supabaseClient.ts | `src/lib/supabaseClient.ts` | 1 |
| R10 | Clean Dead Code | Investigate & delete src/app/api/sync-spreadsheet/ if dead | `src/app/api/sync-spreadsheet/` | 1 |
| R5 | AppUser Interface | Create src/types/user.ts and apply to AppScreen, HomeView, LoginScreen, GuruPresensi | `src/types/user.ts`, `src/components/...` | 2 |
| R6 | Extract 4 Hooks | Extract useSessionSync, useWaliKelas, usePiket, useBroadcasts from AppScreen.tsx | `src/hooks/...`, `src/components/AppScreen.tsx` | 2 |
| R7 | Split HomeView | Split into HomeViewGuru.tsx, HomeViewAdmin.tsx, HomeView.tsx (<200 lines) | `src/components/HomeView...` | 2 |

## Acceptance Criteria
- No 'SipjamSuperAdmin' literal in src/
- `.env.local` has SUPERADMIN_API_PASSWORD
- `npm test` exit code 0
- `npm run build` succeeds without TS errors
- No supabase.auth in page.tsx
- Channel names include sekolah_id in AdminVerifView.tsx
- src/types/user.ts exports AppUser, used in main components
- 4 hooks created and consumed in AppScreen.tsx
- HomeView split into Guru & Admin, wrapper <200 lines
- layout.tsx has preconnect
- supabaseClient.ts has once-flag
- git clean, committed, pushed to origin main
