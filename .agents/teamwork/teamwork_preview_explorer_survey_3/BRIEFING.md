# BRIEFING — 2026-10-01T11:06:00Z

## Mission
Investigate and survey R3 (GuruPresensi - Izin Datang Terlambat), R4 (GuruJurnal photo upload + geolocation), and R6 (Superadmin School Settings & per-school journal config).

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3
- Original parent: 99cc2021-9546-433d-8867-c45dc0860a07
- Milestone: Explorer Survey Phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Ponytail principle (simplest minimal solution, framework-native, no extra deps)
- Write only to my own folder: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3`

## Current Parent
- Conversation ID: 99cc2021-9546-433d-8867-c45dc0860a07
- Updated: 2026-10-01T11:06:00Z

## Investigation State
- **Explored paths**:
  - `src/components/GuruPresensi.tsx` (R3 status options, submit handler, validation)
  - `src/app/api/attendance/` (surveyed existing routes, found only auto-alpa)
  - `src/components/GuruJurnal.tsx` (R4 camera vs gallery upload, GPS capture, insert payload)
  - `src/components/SuperadminView.tsx` (R6 handleEditSchool modal and school state)
  - Supabase database schema via `list_tables` & `execute_sql` for `sekolah`, `jurnal_pembelajaran`, `presensi_guru`
  - `src/types/database.ts`
- **Key findings**:
  - R3: `GuruPresensi.tsx:513` uses `value="Terlambat"`, needs update to `value="Izin Terlambat"`. Need `src/app/api/attendance/route.ts` to satisfy backend endpoint acceptance criteria.
  - R4: `GuruJurnal.tsx` lacks gallery upload and GPS capture in upload handler. Table `jurnal_pembelajaran` needs `latitude, longitude, lokasi, waktu_upload` columns.
  - R6: `SuperadminView.tsx` Edit Sekolah modal needs `mode_jurnal` input. `public.sekolah` needs `mode_jurnal` column. `GuruJurnal.tsx` must conditionally render upload file input based on teacher's school config.
- **Unexplored areas**: None within assigned scope.

## Key Decisions Made
- Produced detailed survey report `survey_report.md` with complete technical specifications, line numbers, schema migrations, and implementation steps.
- Produced 5-component `handoff.md`.

## Artifact Index
- `DISPATCH.md` — Task assignment and incoming messages
- `BRIEFING.md` — Persistent context & state
- `progress.md` — Liveness & step updates
- `survey_report.md` — Detailed survey findings and technical proposal
- `handoff.md` — 5-component handoff report
