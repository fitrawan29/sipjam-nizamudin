# Context — Orchestrator 18

## Active Workspaces & Paths
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
- Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_18`
- Parent Conversation ID: `e9f5d453-8b8b-44c0-a7ca-400062f27727`
- Predecessor: `orchestrator_17` (`3ef8ddbb-8819-4386-aaac-f3d3ca2811fc`)

## Milestone 4 Verification Target
- Worker Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m4_2\handoff.md`
- Commit: `a062bbc`
- Code Files Touched:
  - `src/components/GradebookView.tsx`: `generateKurikulumMerdekaDeskripsi`, integration in `rekap-semester` tab with CP column.
  - `src/components/AppScreen.tsx`: `isWaliKelas` conditionally adds `view-rapor`, route navigation guard with Swal, unauthorized fallback card.
  - `src/components/RaporView.tsx`: Complete Kurikulum Merdeka Rapor view component.
  - `src/components/Onboarding/tutorialSteps.ts`: Updated onboarding steps for teacher & admin.
  - `src/components/Tutorial/tutorialData.ts`: Updated knowledge cards for Rapor and Admin Verif.
  - `tests/m4_academic_merdeka_rapor.test.ts`: 14 automated unit/integration tests for M4.

## Verification Commands Required from Workers/Reviewers
- `npx tsc --noEmit`
- `npx tsx tests/m4_academic_merdeka_rapor.test.ts`
- `npx tsx tests/m3_student_attendance_piket_lock.test.ts`
- `npx tsx tests/m2_teacher_attendance_verification.test.ts`
- `npm test`
- `npx tsx tests/e2e/run_all_e2e.ts`
- `npm run build`
