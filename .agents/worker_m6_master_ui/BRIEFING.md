# BRIEFING — 2026-09-17T18:56:00+08:00

## Mission
Implement Milestone 6: Master Data Edit interfaces, Naik Kelas modal, Rekapan Jurnal Per Kelas (8 columns), Kepala Sekolah title formatter, Perangkat Pembelajaran subject matrix, and automated tests.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m6_master_ui
- Original parent: 438061dd-8b26-44e8-acfe-051ab3586841
- Milestone: Milestone 6 - Advanced Master Data & UI Polish

## 🔒 Key Constraints
- Genuine implementation only: no hardcoding, no dummy/facade implementations
- File write ownership:
  - src/components/AdminDataView.tsx
  - src/components/NaikKelasModal.tsx
  - src/components/RekapJurnalView.tsx
  - src/utils/textUtils.ts
  - src/components/PrintHeader.tsx
  - src/components/DokumenView.tsx
  - tests/m6_master_data_polish.test.ts
- Git workflow per GEMINI.md: check status, git add, commit descriptive message, git push origin
- TypeScript compile: `npx tsc --noEmit` must pass with 0 errors

## Current Parent
- Conversation ID: 438061dd-8b26-44e8-acfe-051ab3586841
- Updated: not yet

## Task Summary
- **What to build**: Master Data Edit modals for 5 tables, NaikKelasModal (Perorangan, Per Kelas, Satu Angkatan), RekapJurnalView classroom view (8 columns + print/export), formatKepalaSekolahTitle utility + PrintHeader integration, DokumenView Perangkat Pembelajaran matrix grouped by mapel + mapel/kelas upload fields, tests in tests/m6_master_data_polish.test.ts.
- **Success criteria**: All features working genuinely with Supabase queries, tests passing, tsc clean, committed & pushed.
- **Interface contracts**: PROJECT.md & survey handoff.md
- **Code layout**: PROJECT.md

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: None yet

## Loaded Skills
- None

## Key Decisions Made
- None yet

## Artifact Index
- .agents/worker_m6_master_ui/DISPATCH.md — Assignment instructions
- .agents/worker_m6_master_ui/BRIEFING.md — Memory and state
- .agents/worker_m6_master_ui/progress.md — Heartbeat and step tracking
