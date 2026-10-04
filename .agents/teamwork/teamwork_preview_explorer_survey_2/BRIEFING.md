# BRIEFING — 2026-10-04T01:20:30Z

## Mission
Investigate Superadmin school management: examine SuperadminView.tsx and related components/modals, data/interface types for Sekolah, edit school UI, persistence to DB (like mode_jurnal), exact lines to add "Mode Presensi Siswa: QR Code / Manual", and state/form/save handlers.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2
- Original parent: 99cc2021-9546-433d-8867-c45dc0860a07
- Milestone: Survey & Investigation (R2 & R5)
- Appended Parent: 60f11d0f-3028-47d5-a4c0-af2902baf3f1
- Appended Milestone: Superadmin School Management Survey (Mode Presensi Siswa)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Ponytail mode: simplest, minimal solution, standard library/framework first
- Write survey_report.md and handoff.md in working directory
- Git workflow rule applies if any non-agent modifications occur (do not modify app code in explorer)
- Read-only: Produce structured analysis report for downstream builders

## Current Parent
- Conversation ID: 60f11d0f-3028-47d5-a4c0-af2902baf3f1
- Updated: 2026-10-04T01:20:30Z

## Investigation State
- **Explored paths**:
  - `src/components/SuperadminView.tsx` (all 1370 lines inspected, specifically lines 59–73, 212–255, 281–396, 1070–1085, 1222–1229)
  - `src/types/database.ts` (lines 1270–1332, 1771–1773, 1920)
  - `src/components/GuruJurnal.tsx` (lines 245–265)
  - `src/components/PiketView.tsx` (lines 1–100)
  - `src/components/AppScreen.tsx` (lines 260–280, 615–640)
  - `supabase/migrations/20261001_features_r1_r6.sql` (lines 1–15)
  - `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql`
- **Key findings**:
  1. Data fetching in `SuperadminView.tsx` uses `supabase.from('sekolah').select('*').order('created_at', { ascending: false })` stored in `sekolahList`.
  2. School edit UI is implemented via SweetAlert2 (`Swal.fire`) with inline HTML, NOT a separate modal component.
  3. Precedent: `mode_jurnal` was added to `public.sekolah` table as `TEXT DEFAULT 'camera_upload'`, typed in `types/database.ts`, included in SweetAlert forms (`handleOpenAddSchoolModal` & `handleEditSchool`), extracted via DOM `getElementById`, updated via `supabase.from('sekolah').update(formValues).eq('id', school.id)`, and displayed as a badge in the school table.
  4. Exact insertion points for "Mode Presensi Siswa: QR Code / Manual" identified:
     - `handleOpenAddSchoolModal` lines 218–219 (HTML), 237 (extract), 254 (payload)
     - `handleEditSchool` lines 335–336 (HTML), 354 (extract), 371 (payload)
     - School table badge line 1084
     - Quick toggle handler `handleTogglePresensiMode` can be added to allow 1-click toggling
  5. DB migration requires adding `mode_presensi_siswa TEXT DEFAULT 'qr'` to `public.sekolah` with check constraint `CHECK (mode_presensi_siswa IN ('qr', 'manual'))`.
- **Unexplored areas**: None, full scope investigated.

## Key Decisions Made
- Structure handoff report adhering to the 5-component protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
- Provide copy-paste ready code snippets for the builder agent.

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — 5-component handoff report
