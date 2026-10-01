# BRIEFING — 2026-10-01T11:29:00Z

## Mission
Implement R3: Presensi "Izin Terlambat" UI dropdown, calculation & state in GuruPresensi.tsx and backend route handler in src/app/api/attendance/route.ts.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3
- Original parent: 99cc2021-9546-433d-8867-c45dc0860a07
- Milestone: M3 (Presensi "Izin Terlambat" UI & Backend API)

## 🔒 Key Constraints
- Exclusively own and modify: src/components/GuruPresensi.tsx, src/app/api/attendance/route.ts, src/lib/workflow.ts (if needed)
- DO NOT modify GuruJurnal.tsx, AccountSettingsModal.tsx, SuperadminView.tsx, or database migration files
- DO NOT cheat, fake, or hardcode verification outputs
- Ponytail principle: minimal changes, standard library / Next.js features
- Respect Git Workflow Rule in GEMINI.md

## Current Parent
- Conversation ID: 99cc2021-9546-433d-8867-c45dc0860a07
- Updated: 2026-10-01T11:17:37Z

## Task Summary
- **What to build**: Update GuruPresensi.tsx to support "Izin Terlambat" in dropdown options, verification status, late time calculation, and payload saving. Create src/app/api/attendance/route.ts with POST/GET handlers saving to public.presensi_guru.
- **Success criteria**: Option value="Izin Terlambat" present in GuruPresensi.tsx; backend route handler handles POST with "Izin Terlambat"; tsc --noEmit passes; npm run build passes; tests pass.
- **Interface contracts**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md § Interface Contracts
- **Code layout**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md § Code Layout

## Change Tracker
- **Files modified**:
  - `src/components/GuruPresensi.tsx`: Updated option to `<option value="Izin Terlambat">Izin Terlambat</option>`, added `isTerlambat` check for late calculation, status_verifikasi 'Menunggu', and optional notes field.
  - `src/app/api/attendance/route.ts`: Created Next.js App Router route handler with POST and GET methods, saving to Supabase `presensi_guru` with RLS resilience.
  - `tests/m3_izin_terlambat_verification.test.ts`: Created automated test suite verifying GuruPresensi UI and attendance route handler.
- **Build status**: PASS (`npx tsc --noEmit` exit 0, `npm run build` exit 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (100% of M3 verification assertions passed)
- **Lint status**: 0 violations
- **Tests added/modified**: `tests/m3_izin_terlambat_verification.test.ts` (13 assertions, all passing)

## Loaded Skills
None loaded

## Key Decisions Made
- Used both 'Izin Terlambat' and 'Terlambat' checks to preserve complete backward compatibility.
- In `src/app/api/attendance/route.ts`, resolved session token from headers, body, or server fallback so that requests both with and without explicit headers succeed against PostgreSQL RLS.
- Verified that teacher submitting with "Izin Terlambat" remains eligible to fill subsequent class journals and presensi pulang.

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3\handoff.md — Final handoff report
