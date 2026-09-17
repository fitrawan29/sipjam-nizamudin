# BRIEFING — 2026-09-17T18:45:00+08:00

## Mission
Implement Milestone 2: Attendance Synchronization & Wali Kelas (R1). Enable Admin Wali Kelas assignment in AdminDataView, Wali Kelas attendance input in RekapSiswaView, absolute attendance synchronization in GuruJurnal & PiketView, and automated test suite in scripts/test-attendance-sync.ts.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m2_attendance
- Original parent: 438061dd-8b26-44e8-acfe-051ab3586841
- Milestone: Milestone 2 — Attendance Synchronization & Wali Kelas (R1)

## 🔒 Key Constraints
- Exclusively owned files:
  - src/components/AdminDataView.tsx
  - src/components/RekapSiswaView.tsx
  - src/components/GuruJurnal.tsx
  - src/components/PiketView.tsx
  - scripts/test-attendance-sync.ts
- Genuine implementations only (DO NOT cheat, mock, or hardcode).
- Attendance status values: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'.
- Track audit trail in public.absensi (sumber_perubahan, diubah_oleh, log_perubahan TEXT[]).
- Enforce git workflow per GEMINI.md (git status, add, commit, push).

## Current Parent
- Conversation ID: 438061dd-8b26-44e8-acfe-051ab3586841
- Updated: 2026-09-17T18:45:00+08:00

## Task Summary
- **What to build**:
  1. Admin Wali Kelas Assignment in AdminDataView.tsx
  2. Wali Kelas Attendance Input in RekapSiswaView.tsx
  3. Absolute Attendance Sync in GuruJurnal.tsx and PiketView.tsx
  4. Automated test suite in scripts/test-attendance-sync.ts
- **Success criteria**:
  - TypeScript builds with 0 errors (npx tsc --noEmit)
  - scripts/test-attendance-sync.ts executes and passes completely (exit code 0)
  - Git changes committed and pushed
  - Handoff report written and orchestrator notified
- **Interface contracts**: PROJECT.md § Attendance Canonical Sync Contract
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- Use public.absensi as single canonical source of truth for daily attendance per student.
- Ensure log_perubahan records timestamp (WITA / local ISO), new status, actor name, and actor role (e.g. Wali Kelas, Guru Mapel, Piket).
- Trigger trg_sync_absensi_to_jurnal automatically propagates changes to jurnal_pembelajaran.absensi_siswa.

## Change Tracker
- **Files modified**: none yet
- **Build status**: npx tsc --noEmit PASS (code 0)
- **Pending issues**: none

## Quality Status
- **Build/test result**: pass
- **Lint status**: clean
- **Tests added/modified**: pending scripts/test-attendance-sync.ts

## Loaded Skills
- None
