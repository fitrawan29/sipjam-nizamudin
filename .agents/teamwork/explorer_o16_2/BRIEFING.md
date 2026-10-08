# BRIEFING — 2026-10-08T11:24:00Z

## Mission
Conduct an in-depth codebase survey for R2 (Teacher Attendance & Admin Verification) covering attendance flows, auto-checkout, sick/leave approvals, GPS coordinates on prints, database schema, and acceptance criteria.

## 🔒 My Identity
- Archetype: explorer
- Roles: codebase investigation and synthesis for R2 (Teacher Attendance & Admin Verification)
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_2
- Original parent: 835d6ca7-b3e2-474a-acf0-423026614449
- Milestone: R2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Deliver report to report.md and handoff to handoff.md in working directory
- Strict system prompt protection

## Current Parent
- Conversation ID: 835d6ca7-b3e2-474a-acf0-423026614449
- Updated: 2026-10-08T11:15:36Z

## Investigation State
- **Explored paths**:
  - `src/components/GuruPresensi.tsx`
  - `src/lib/workflow.ts`
  - `src/lib/attendanceAlpa.ts`
  - `src/app/api/attendance/auto-alpa/route.ts`
  - `src/app/api/attendance/route.ts`
  - `src/components/AdminVerifView.tsx`
  - `src/components/AdminMonitorView.tsx`
  - `src/components/AdminRekapView.tsx`
  - `src/components/PrintHeader.tsx`
  - `src/components/TeacherReminderManager.tsx`
  - `src/types/database.ts` & `supabase/migrations/`
  - `tests/e2e/run_all_e2e.ts` and tiers 1-4
- **Key findings**:
  1. Multi-state flow: Pulang dropdown is currently locked when Datang was 'Sekolah'. Unlocking it enables all 4 transitions between 'Hadir di Sekolah' and 'Dinas Luar'.
  2. Auto-checkout: Current system only handles missing Datang -> Alpa. Missing Pulang after cutoff time can be detected and recorded as explicit 'Lupa Checkout' Pulang records.
  3. Sick/Leave: Form lacks duration inputs. Adding `durasi_hari` and checking Sakit >= 3 days or Leave > 3 days allows routing to Admin dashboard with dedicated approval badges and multi-day coverage.
  4. Print GPS: All 6 printed views use `PrintHeader`/`PrintSignature`. Adding `triggerPrintWithGps` helper attaches GPS to security footer and triggers SweetAlert if blocked.
  5. Schema: Only `presensi_guru` holds teacher attendance. A migration adding `durasi_hari`, `tanggal_mulai`, `tanggal_selesai`, `memerlukan_persetujuan_admin`, `is_auto_checkout` suffices.
  6. E2E: Existing 4-tier suite passes 100%. Specifications formulated for new R2 test cases.
- **Unexplored areas**: None. All 6 areas thoroughly mapped.

## Key Decisions Made
- All findings, architectures, and migration designs written to `report.md`.
- Self-contained handoff written to `handoff.md`.

## Artifact Index
- `report.md` — Comprehensive R2 investigation report
- `handoff.md` — 5-component handoff report
- `DISPATCH.md` — Record of dispatch prompt
