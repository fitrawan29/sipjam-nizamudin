# BRIEFING — 2026-10-04T01:43:00Z

## Mission
Implement school mode fetching and conditional view rendering in PiketView.tsx (if 'manual': class-filterable student roster with Datang and Pulang marking buttons calling recordPresensiSiswa; if 'qr': retain existing camera and USB HID kiosk scanner).

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3
- Original parent: 99cc2021-9546-433d-8867-c45dc0860a07
- Milestone: M3 (Presensi "Izin Terlambat" UI & Backend API)
- Milestone 2026-10-04: M3 (Piket View QR vs Manual)
- Current parent: 60f11d0f-3028-47d5-a4c0-af2902baf3f1

## 🔒 Key Constraints
- Exclusively own and modify: src/components/GuruPresensi.tsx, src/app/api/attendance/route.ts, src/lib/workflow.ts (if needed) [from 2026-10-01]
- DO NOT modify GuruJurnal.tsx, AccountSettingsModal.tsx, SuperadminView.tsx, or database migration files [from 2026-10-01]
- DO NOT cheat, fake, or hardcode verification outputs
- Ponytail principle: minimal changes, standard library / Next.js features
- Respect Git Workflow Rule in GEMINI.md
- For 2026-10-04 Milestone M3: Exclusively own and modify: src/components/PiketView.tsx
- Do not modify files outside PiketView.tsx without orchestrator direction.

## Current Parent
- Conversation ID: 60f11d0f-3028-47d5-a4c0-af2902baf3f1
- Updated: 2026-10-04T01:35:14Z

## Task Summary
- **What to build**:
  1. Fetch school `mode_presensi_siswa` from `public.sekolah` on mount using `user.sekolah_id` (default 'qr').
  2. Tab label reflects mode: "Scan QR Siswa" when 'qr', "Presensi Manual Siswa" when 'manual'.
  3. When `modePresensiSiswa === 'manual'`:
     - Render class-filterable student roster (class dropdown/selector, search input).
     - Roster table with columns: No, Nama Siswa, NISN, Kelas, Presensi Datang, Presensi Pulang.
     - Datang: Check `todayScans` for `status === 'datang'`. If yes, green badge `✓ Datang {jam}` + cancel button. If no, "Tandai Datang" button calling `recordPresensiSiswa` with `deviceId: 'manual'`.
     - Pulang: Check `todayScans` for `status === 'pulang'`. If yes, blue badge `✓ Pulang {jam}` + cancel button. If no, "Tandai Pulang" button calling `recordPresensiSiswa` with `deviceId: 'manual'`.
     - Statistics cards and Log Presensi Hari Ini table remain active below.
  4. When `modePresensiSiswa === 'qr'`:
     - Retain existing camera and USB HID kiosk scanner with zero regression.
- **Success criteria**:
  - `npx tsc --noEmit` exits 0.
  - `npm run build` exits 0.
  - Genuine implementation, no hardcoded values, strict multi-tenant filtering.
- **Interface contracts**: PROJECT.md § Interface Contracts
- **Code layout**: PROJECT.md § Code Layout

## Change Tracker
- **Files modified**:
  - `src/components/PiketView.tsx`: Added `modePresensiSiswa` fetching and realtime subscription, dynamic tab button labeling, conditional manual attendance roster table with Datang/Pulang actions and cancel capability, retained full QR kiosk scanner when mode is 'qr', upgraded today scan limit to 1000, and adapted log count header.
- **Build status**: PASS (`npx tsc --noEmit` exit 0, `npm run build` exit 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (TypeScript 0 errors, Next.js build clean)
- **Lint status**: 0 violations
- **Tests added/modified**: Verified type safety and production build

## Loaded Skills
- surgical-patch: C:\Users\Fitra\OneDrive\Documents\sipjam-app\.gemini\config\skills\surgical-patch\SKILL.md
- ponytail: C:\Users\Fitra\OneDrive\Documents\sipjam-app\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md

## Key Decisions Made
- Used existing `recordPresensiSiswa` from `src/lib/qrSiswa.ts` to ensure 100% schema consistency with QR scan records.
- Leveraged existing `allStudents`, `kelasList`, `todayScans`, and `fetchTodayScanData` in `PiketView.tsx` to minimize redundant state.
- Wrapped existing QR controls cleanly without modifying internal scanner logic, avoiding any regressions.
- Added cancellation dialog for accidental manual marks so teachers can self-remedy without touching the DB.

## Artifact Index
- `.agents/teamwork/teamwork_preview_worker_m3/handoff.md` — Final handoff report
