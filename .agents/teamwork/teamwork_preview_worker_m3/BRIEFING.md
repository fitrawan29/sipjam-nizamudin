# BRIEFING — 2026-10-01T11:20:00Z

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
- DO NOT modify GuruJurnal.tsx, AccountSettingsModal.tsx, SuperadminView.tsx, or database migrations
- DO NOT cheat, fake, or hardcode verification outputs
- Ponytail principle: minimal changes, standard library / Next.js features
- Respect Git Workflow Rule in GEMINI.md

## Current Parent
- Conversation ID: 99cc2021-9546-433d-8867-c45dc0860a07
- Updated: 2026-10-01T11:17:37Z

## Task Summary
- **What to build**: Update GuruPresensi.tsx to support "Izin Terlambat" in dropdown options, verification status, late time calculation, and payload saving. Create src/app/api/attendance/route.ts with POST/GET handlers saving to public.presensi_guru.
- **Success criteria**: Option value="Izin Terlambat" present in GuruPresensi.tsx; backend route handler handles POST with "Izin Terlambat"; tsc --noEmit passes.
- **Interface contracts**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md § Interface Contracts
- **Code layout**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md § Code Layout

## Change Tracker
- **Files modified**: none yet
- **Build status**: untried
- **Pending issues**: none

## Quality Status
- **Build/test result**: untried
- **Lint status**: 0 violations
- **Tests added/modified**: none

## Loaded Skills
None loaded

## Key Decisions Made
- Use both 'Izin Terlambat' and 'Terlambat' backwards compatibility check in GuruPresensi.tsx.
- Implement robust App Router route handler in src/app/api/attendance/route.ts using Supabase client.

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3\handoff.md — Final handoff report
