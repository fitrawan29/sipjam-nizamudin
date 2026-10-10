# Scope: SIPJAM Maintenance & Refactoring (R1 - R10)

## Architecture & Code Layout
- `src/app/api/attendance/route.ts` - Attendance API & superadmin credentials (DONE)
- `src/app/page.tsx` - App entry point & auth listener cleanup (DONE)
- `src/components/HomeView.tsx` - Dashboard view wrapper (< 200 lines, currently 45 lines) (DONE)
- `src/components/HomeViewGuru.tsx` - Teacher dashboard view (DONE)
- `src/components/HomeViewAdmin.tsx` - Admin dashboard view (DONE)
- `src/components/AdminVerifView.tsx` - Admin verification realtime channels (DONE)
- `src/types/user.ts` - New AppUser interface (DONE)
- `src/hooks/` - New hooks: useSessionSync.ts, useWaliKelas.ts, usePiket.ts, useBroadcasts.ts (DONE)
- `src/components/AppScreen.tsx` - Main app orchestrator view, consuming hooks & AppUser (DONE)
- `src/components/LoginScreen.tsx` - Consuming AppUser (DONE)
- `src/components/GuruPresensi.tsx` - Consuming AppUser (DONE)
- `src/app/layout.tsx` - Preconnect to Font Awesome CDN (DONE)
- `src/lib/supabaseClient.ts` - Connectivity check once-flag (DONE)
- `src/app/api/sync-spreadsheet/` - Dead code deleted (DONE)

## Feature Inventory & Requirements Status
| # | Requirement | Description | Target Files | Status |
|---|-------------|-------------|--------------|--------|
| R1 | Security: Superadmin password | Move plaintext password in route.ts to env var SUPERADMIN_API_PASSWORD in .env.local; return null if absent | `src/app/api/attendance/route.ts`, `.env.local` | DONE |
| R2 | Auth Duplication | Remove getSession() and onAuthStateChange in page.tsx; render MainApp directly | `src/app/page.tsx` | DONE |
| R3 | Bugfix isGuru | Fix isGuru = !isAdmin in HomeView.tsx matching AppScreen.tsx | `src/components/HomeView.tsx` | DONE |
| R4 | Realtime Scope | Scope channels with user?.sekolah_id in AdminVerifView.tsx | `src/components/AdminVerifView.tsx` | DONE |
| R8 | Font Awesome Preconnect | Add preconnect link in layout.tsx | `src/app/layout.tsx` | DONE |
| R9 | Connectivity Once-Flag | Add once-flag in supabaseClient.ts | `src/lib/supabaseClient.ts` | DONE |
| R10 | Clean Dead Code | Investigate & delete src/app/api/sync-spreadsheet/ if dead | `src/app/api/sync-spreadsheet/` | DONE |
| R5 | AppUser Interface | Create src/types/user.ts and apply to AppScreen, HomeView, LoginScreen, GuruPresensi | `src/types/user.ts`, `src/components/...` | DONE |
| R6 | Extract 4 Hooks | Extract useSessionSync, useWaliKelas, usePiket, useBroadcasts from AppScreen.tsx | `src/hooks/...`, `src/components/AppScreen.tsx` | DONE |
| R7 | Split HomeView | Split into HomeViewGuru.tsx, HomeViewAdmin.tsx, HomeView.tsx (<200 lines) | `src/components/HomeView...` | DONE |

## Acceptance Criteria
- [x] No 'SipjamSuperAdmin' literal in src/ (0 matches)
- [x] `.env.local` has SUPERADMIN_API_PASSWORD
- [x] `npm test` exit code 0 (all test suites passing)
- [x] `npm run build` succeeds without TS errors
- [x] No supabase.auth in page.tsx (0 matches)
- [x] Channel names include sekolah_id in AdminVerifView.tsx
- [x] src/types/user.ts exports AppUser, used in main components
- [x] 4 hooks created and consumed in AppScreen.tsx
- [x] HomeView split into Guru & Admin, wrapper is 45 lines (<200 lines)
- [x] layout.tsx has preconnect
- [x] supabaseClient.ts has once-flag
- [x] git clean, committed, pushed to origin main
