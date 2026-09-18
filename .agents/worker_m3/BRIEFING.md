# BRIEFING — 2026-09-18T16:25:02+08:00

## Mission
Milestone 3 (R4 & R5: Attendance Rules & Direct Camera Integration):
1. Admin Attendance Settings in AdminConfigView (jam_pulang_jumat & interactive teacher exemption selection).
2. Attendance Workflow calculation in workflow.ts (getGuruDailyState exemption).
3. Friday checkout rule in GuruPresensi.tsx (jam_pulang_jumat).
4. Direct Camera enforcement & removal of gallery file uploads across CameraSelfieCapture, watermarkCanvas, GuruPresensi, GuruJurnal, PiketView.

## 🔒 My Identity
- Archetype: Implementer / QA / Specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3
- Original parent: 742c922b-4acf-4153-902f-de90d07d6ea8
- Milestone: M3 (Requirement R3 - Global Operations & Workflow Optimization)
- Current Parent / Invoking Caller: a21d5b87-ff2e-4b29-acfe-6e2543e24911 (orchestrator_10)
- Active Milestone: Milestone 3 (R4 & R5: Attendance Rules & Direct Camera Integration)

## 🔒 Key Constraints
- File Ownership: Exclusive write ownership of:
  - src/components/AdminDataView.tsx
  - src/components/DokumenView.tsx
  - src/components/AdminBackupView.tsx
  - src/components/HomeView.tsx
  - src/components/HistoryView.tsx
  - src/components/AdminConfigView.tsx
- DO NOT modify any other files unless assigned.
- Assigned in Milestone 3:
  - src/components/AdminConfigView.tsx
  - src/lib/workflow.ts
  - src/components/GuruPresensi.tsx
  - src/components/GuruJurnal.tsx
  - src/components/PiketView.tsx
  - src/components/CameraSelfieCapture.tsx
  - src/lib/watermarkCanvas.ts
- Integrity Mandate: No hardcoded test results, no dummy facade implementations. Real state and logic.
- Verification: Zero TypeScript compilation errors (`npx tsc --noEmit`).
- Git workflow: `git status`, `git add .`, `git commit -m "feat(attendance-camera): add friday checkout, teacher attendance exceptions, and direct live camera enforcement"`, `git push origin main`.

## Current Parent
- Conversation ID: a21d5b87-ff2e-4b29-acfe-6e2543e24911
- Updated: 2026-09-18T16:25:02+08:00

## Task Summary
- **What to build**:
  1. AdminConfigView.tsx: Add `jam_pulang_jumat` setting and teacher attendance exemption selection (`guru_hanya_mengajar` / `data_guru.wajib_hadir_hanya_mengajar`).
  2. workflow.ts: `getGuruDailyState` handles exempt teachers (bebasAlpa, not teaching day).
  3. GuruPresensi.tsx: Friday checkout opening against `jam_pulang_jumat`, enforce camera capture on Pulang.
  4. CameraSelfieCapture.tsx: Remove file inputs/gallery uploads, front/rear camera toggle with `facingMode`, mirror only front camera.
  5. watermarkCanvas.ts: `mirror: boolean` parameter to prevent rear camera horizontal flipping.
  6. GuruJurnal.tsx: Remove file input, embed direct camera capture with preview/confirm/retake.
  7. PiketView.tsx: Remove file input, embed direct camera capture with preview/confirm/retake.
- **Success criteria**: Genuine implementation, clean compilation (`npx tsc --noEmit`), git commit & push, comprehensive handoff report.
- **Interface contracts**: Supabase schema, workflow.ts types, CameraSelfieCapture props.
- **Code layout**: src/components/, src/lib/

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: Pending

## Loaded Skills
- None

## Key Decisions Made
- Investigating target files before applying changes.

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — Final 5-component handoff report
