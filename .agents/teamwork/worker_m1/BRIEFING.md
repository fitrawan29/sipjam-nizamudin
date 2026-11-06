# BRIEFING — 2026-11-06T00:15:00Z

## Mission
Implement Milestone 1: Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa (AdminKelasView, AdminDataView integration, navigation routing)

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\
- Original parent: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Milestone: Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa)

## 🔒 Key Constraints
- Strict RBAC using isMasterDataModificationAllowed(user?.role)
- Cascading renames across data_siswa, wali_kelas, jadwal_pelajaran
- Defensive schema-cache error handling using isSchemaCacheOrMissingTableError
- Only delete class if count is 0
- Verify with npx tsc --noEmit and npm test
- Git commit and push to main following GEMINI.md

## Current Parent
- Conversation ID: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Updated: not yet

## Task Summary
- **What to build**: AdminKelasView.tsx, integrate into AdminDataView.tsx, update VIEW_ALIASES in src/lib/navigation.ts
- **Success criteria**: Functional Sub Menu Kelas, centralized class roster & student allocation, responsive card directory, cascade rename, zero TS errors, 100% tests pass, committed and pushed to main.
- **Interface contracts**: PROJECT.md, explorer_m1_1, explorer_m1_2, explorer_m1_3 handoff reports
- **Code layout**: src/components/AdminKelasView.tsx, src/components/AdminDataView.tsx, src/lib/navigation.ts

## Key Decisions Made
- None yet

## Artifact Index
- DISPATCH.md — Assignment instructions
- progress.md — Liveness & step updates
- BRIEFING.md — Working memory
- handoff.md — Final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: TBD

## Loaded Skills
None
