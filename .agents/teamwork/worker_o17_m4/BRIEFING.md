# BRIEFING — 2026-10-08T17:15:00Z

## Mission
Implement Milestone 4: Kurikulum Merdeka Capaian Pembelajaran Calculations, Wali Kelas Rapor Menu & View, and In-app Tutorial updates.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m4
- Original parent: 3ef8ddbb-8819-4386-aaac-f3d3ca2811fc
- Milestone: Milestone 4 (R4 Academic Merdeka Calculations, Wali Kelas Rapor Menu, In-app Tutorials)

## 🔒 Key Constraints
- Follow explorer_o16_3/report.md blueprint closely.
- Do not hardcode test results or create dummy facades. Genuine implementations only.
- Strict write scope:
  - src/components/GradebookView.tsx
  - src/components/AppScreen.tsx
  - src/components/RaporView.tsx
  - src/components/Onboarding/tutorialSteps.ts
  - src/components/Tutorial/tutorialData.ts
  - tests/m4_academic_merdeka_rapor.test.ts
- Comply with all lint, typecheck, tests, and build checks.
- Adhere to GEMINI.md git workflow (status, add, commit, push).

## Current Parent
- Conversation ID: 3ef8ddbb-8819-4386-aaac-f3d3ca2811fc
- Updated: not yet

## Task Summary
- **What to build**:
  1. Kurikulum Merdeka Capaian Pembelajaran narrative generator and calculation in GradebookView.tsx.
  2. Wali Kelas & Admin "Rapor" navigation item and RaporView.tsx component in AppScreen.tsx.
  3. Tutorial updates in tutorialSteps.ts and tutorialData.ts.
  4. Comprehensive test suite in tests/m4_academic_merdeka_rapor.test.ts.
- **Success criteria**:
  - generateKurikulumMerdekaDeskripsi logic matches specifications.
  - Tab 2 rekap-semester includes Deskripsi Capaian Pembelajaran.
  - Wali Kelas and Admin have access to Rapor menu; unauthorized users blocked.
  - RaporView renders student selector, CP descriptions, attendance summary, reflection, print button.
  - All test suites pass (m4, m3, m2, npm test, e2e, build).
- **Interface contracts**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- **Code layout**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

## Change Tracker
- **Files modified**: none yet
- **Build status**: pending
- **Pending issues**: none

## Quality Status
- **Build/test result**: pending
- **Lint status**: pending
- **Tests added/modified**: pending

## Loaded Skills
None

## Key Decisions Made
- Initialized workspace and briefing.

## Artifact Index
- .agents/teamwork/worker_o17_m4/DISPATCH.md
- .agents/teamwork/worker_o17_m4/BRIEFING.md
- .agents/teamwork/worker_o17_m4/progress.md
