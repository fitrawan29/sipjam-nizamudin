# BRIEFING — 2026-10-01T11:06:00Z

## Mission
Investigate database schema and backend implementation for R1 (merge accounts SQL) and R3 (attendance status database/backend).

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_1
- Original parent: 99cc2021-9546-433d-8867-c45dc0860a07
- Milestone: survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Produce survey report and handoff report

## Current Parent
- Conversation ID: 99cc2021-9546-433d-8867-c45dc0860a07
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `public.users`, `public.data_guru`, `public.presensi_guru`, `public.jurnal_pembelajaran`, `public.jadwal_pelajaran`, `public.laporan_piket`, `public.guru_mapel`, `public.penugasan_piket`, `public.wali_kelas`, `public.push_subscriptions`
  - `src/components/GuruPresensi.tsx`
  - `src/app/api/attendance/auto-alpa/route.ts`
  - `src/lib/workflow.ts`
  - `supabase/migrations/*`
- **Key findings**:
  - R1: "Ade Fitrawan Ibrahim" has 197 transaction rows in live database. Cascade deletion hazard on foreign keys means foreign keys MUST be migrated prior to deleting duplicate rows. Unique constraints on `guru_mapel` and `push_subscriptions` must be handled before updating keys. Complete safe PL/pgSQL DO block crafted.
  - R3: `presensi_guru.jenis_presensi` is native Postgres `text` with no CHECK constraints or ENUM types. Frontend `GuruPresensi.tsx` has `value="Terlambat"` which should be `"Izin Terlambat"`. Backend endpoint `src/app/api/attendance/route.ts` should be provided to ensure automated test compatibility alongside Supabase PostgREST.
- **Unexplored areas**: None within Survey 1 scope.

## Key Decisions Made
- Survey completed; full findings documented in survey_report.md and handoff.md.

## Artifact Index
- survey_report.md — Comprehensive database schema, transaction counts, and SQL draft
- handoff.md — 5-component handoff report for orchestrator and implementers
