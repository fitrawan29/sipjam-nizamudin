# BRIEFING — 2026-10-09T05:14:45Z

## Mission
Implement Milestone 4: R4 Academic Merdeka Calculations, Wali Kelas Rapor Menu, In-app Tutorials, with dedicated verification suite, tsc passing, all tests passing, and git workflow execution.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m4_2
- Original parent: 3ef8ddbb-8819-4386-aaac-f3d3ca2811fc
- Milestone: Milestone 4 (R4 Academic Merdeka Calculations, Wali Kelas Rapor Menu, In-app Tutorials)

## 🔒 Key Constraints
- Strict scope ownership:
  - src/components/GradebookView.tsx
  - src/components/AppScreen.tsx
  - src/components/RaporView.tsx
  - src/components/Onboarding/tutorialSteps.ts
  - src/components/Tutorial/tutorialData.ts
  - tests/m4_academic_merdeka_rapor.test.ts
- Genuine logic only, no hardcoded values or facades.
- All verification commands must pass: tsc --noEmit, m4 test, m3 test, m2 test, npm test, e2e test, npm run build.
- Adhere to GEMINI.md git workflow: git status, git add ., git commit, git push origin main.

## Current Parent
- Conversation ID: 3ef8ddbb-8819-4386-aaac-f3d3ca2811fc
- Updated: 2026-10-09T05:14:45Z

## Task Summary
- **What to build**:
  1. Kurikulum Merdeka Capaian Pembelajaran calculations & narrative synthesis in `GradebookView.tsx` (Tab 2 rekap-semester column).
  2. Wali Kelas "Rapor" menu & `RaporView.tsx` with student selector, CP descriptions, attendance summary, teacher notes, print with GPS.
  3. In-App Tutorial updates across `tutorialSteps.ts` and `tutorialData.ts`.
  4. Test suite `tests/m4_academic_merdeka_rapor.test.ts`.
- **Success criteria**: All tests pass (m4, m3, m2, npm test, e2e), tsc and next build pass, git committed and pushed.
- **Interface contracts**: PROJECT.md & explorer_o16_3/report.md.

## Key Decisions Made
- Resolved type error in `RaporView.tsx` with `PrintSignature` props by removing non-existent `rightSubtitle` and `showGpsCoordinate`, supplying `rightTitle`, `user`, and `sekolahId`.
- Added `guru-rapor` tutorial item and updated `admin-verif` tutorial in `tutorialData.ts` to document long-term sick and leave approvals.
- Maintained strict backward compatibility with existing Gradebook Tab 2 table and Kurikulum Merdeka assessment standards.

## Artifact Index
- `src/components/GradebookView.tsx` — Kurikulum Merdeka CP calculation & narrative generator (`generateKurikulumMerdekaDeskripsi`) and Tab 2 column.
- `src/components/AppScreen.tsx` — Wali Kelas "Rapor" menu conditional inclusion, navigation guard, and view switcher.
- `src/components/RaporView.tsx` — Full Kurikulum Merdeka Rapor view component for Wali Kelas with GPS-verified printing.
- `src/components/Onboarding/tutorialSteps.ts` — Interactive onboarding tour steps for all new flows and Wali Kelas Rapor.
- `src/components/Tutorial/tutorialData.ts` — In-app tutorial knowledge base entries (`guru-rapor`, `admin-verif`, `guru-presensi`, `guru-jurnal`, `guru-piket`).
- `tests/m4_academic_merdeka_rapor.test.ts` — 14-test verification suite for Milestone 4.

## Change Tracker
- **Files modified**:
  - `src/components/RaporView.tsx`: Fixed PrintSignature props.
  - `src/components/Tutorial/tutorialData.ts`: Added guru-rapor and updated admin-verif.
  - `tests/m4_academic_merdeka_rapor.test.ts`: Created comprehensive M4 test suite.
- **Build status**: PASS (tsc --noEmit, npm run build, all unit/E2E test suites)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (14/14 M4 tests, 17/17 M3 tests, 12/12 M2 tests, 123/123 E2E tests, npm test passed)
- **Lint status**: 0 errors
- **Tests added/modified**: `tests/m4_academic_merdeka_rapor.test.ts` (14 assertions)

## Loaded Skills
None
