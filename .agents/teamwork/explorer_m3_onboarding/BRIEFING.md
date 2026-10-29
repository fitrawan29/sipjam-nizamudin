# BRIEFING — 2026-10-29T13:08:30Z

## Mission
Explore and blueprint onboarding tutorial preservation, tour selectors, and help modules for Milestone 3 consolidation.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Investigation, Synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_onboarding
- Original parent: 095792d8-1a85-4945-889d-abf25d3c7740
- Milestone: Milestone 3

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Ensure zero feature loss across onboarding tours and tutorial help modules
- Ensure legacy and multi-key tour selectors match seamlessly
- Write handoff report with 5-component protocol to handoff.md

## Current Parent
- Conversation ID: 095792d8-1a85-4945-889d-abf25d3c7740
- Updated: 2026-10-29T13:08:30Z

## Investigation State
- **Explored paths**:
  - `src/components/Onboarding/OnboardingTutorial.tsx`
  - `src/components/Onboarding/tutorialSteps.ts`
  - `src/components/Tutorial/tutorialData.ts`
  - `src/components/Tutorial/TutorialModal.tsx`
  - `src/components/AppScreen.tsx`
  - `src/components/ClaySidebar.tsx`
  - `tests/navigation_consolidation_verification.test.ts`
  - `tests/app_screen_integration.test.ts`
  - `tests/adversarial_onboarding_stress.test.ts`
  - `tests/m4_academic_merdeka_rapor.test.ts`
  - `tests/challenger_m2_tutorial_system.test.ts`
  - `tests/claymorphism_design_system.test.ts`
  - `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`
- **Key findings**:
  1. `OnboardingTutorial.tsx` line 56 uses exact string matching: `[data-tour="${currentStep.targetTourId}"]`. Multi-token buttons fail unless word-matching `[data-tour~="${tourId}"], [data-tour="${tourId}"]` is applied.
  2. `tutorialSteps.ts` targets (`view-rapor`, `view-sistem-blok`, `view-analitik`) are strictly asserted by `tests/m4_academic_merdeka_rapor.test.ts` and `tests/app_screen_integration.test.ts`. Retaining these targets while aliasing buttons via compound `data-tour="canonical legacy"` guarantees zero regression.
  3. `tutorialData.ts` items are referenced by `tests/m4_academic_merdeka_rapor.test.ts` (specifically `guru-rapor`, `guru-presensi`, `guru-jurnal`, `guru-piket`, `admin-verif`). All 28 items can be safely maintained with enhanced descriptions of consolidated sub-tabs, and all 8 legacy view IDs route automatically through `VIEW_ALIASES`.
  4. AST string test constraints in `tests/app_screen_integration.test.ts` and `tests/claymorphism_design_system.test.ts` require verbatim `data-tour={item.id}` in `AppScreen.tsx` and `ClaySidebar.tsx`.
- **Unexplored areas**: None within the assigned milestone scope.

## Key Decisions Made
- Formulated concrete blueprint: word-matching selector enhancement in `OnboardingTutorial.tsx`, compound `data-tour` aliasing in sidebar menus, AST test guard comments for `data-tour={item.id}`, and sub-tab guidance in `tutorialData.ts`.

## Artifact Index
- DISPATCH.md — Task assignment and instructions
- BRIEFING.md — Situational awareness and working memory
- progress.md — Heartbeat and activity progress
- handoff.md — Complete 5-component handoff report for Worker M3
