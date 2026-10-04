# BRIEFING — 2026-10-04T07:26:00Z

## Mission
Implement Milestone 1 (R1 & R2): Piket schedule-based access control and Wali Kelas attendance recap restrictions.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1
- Original parent: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Milestone: Milestone 1 (R1 & R2)

## 🔒 Key Constraints
- Exclusive write ownership files:
  - `src/lib/workflow.ts`
  - `src/components/AppScreen.tsx`
  - `src/components/PiketView.tsx`
  - `src/components/RekapSiswaView.tsx`
  DO NOT write to any other source files.
- Mandatory Integrity Mandate: genuine implementation, no dummy/facade, no hardcoded test results.
- Comply with Git Workflow Rule: git status, git add ., git commit -m "...", git push origin.

## Current Parent
- Conversation ID: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Updated: 2026-10-04T07:25:38Z

## Task Summary
- **What to build**:
  - R1: Akses Modul Piket Sesuai Jadwal (workflow.ts getGuruDailyState check penugasan_piket/jadwal_piket, AppScreen navigation & menu & block, PiketView blocked UI)
  - R2: Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel (AppScreen menu & navigation & block, RekapSiswaView assignedKelas prop, block non-wali-kelas, locked class selector to assigned class, GuruJurnal mapel attendance verified)
- **Success criteria**: 0 TypeScript errors (`npx tsc --noEmit`), tests pass, genuine logic, handoff report.
- **Interface contracts**: PROJECT.md, ORIGINAL_REQUEST.md
- **Code layout**: src/lib, src/components

## Key Decisions Made
- Will inspect upstream survey handoff and current file states before making minimal surgical edits.

## Artifact Index
- DISPATCH.md — Assignment instructions
- progress.md — Liveness & progress tracker
- handoff.md — Final completion handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: None

## Loaded Skills
- None
