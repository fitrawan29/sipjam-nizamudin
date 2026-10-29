# BRIEFING — 2026-10-29T11:30:00Z

## Mission
Investigate current navigation and routing architecture across sipjam-app, examine view switching, legacy view IDs, data-tour selectors, and propose technical architecture for menu consolidation and sub-tabs.

## 🔒 My Identity
- Archetype: explorer
- Roles: Navigation Architecture Explorer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_nav_arch\
- Original parent: 095792d8-1a85-4945-889d-abf25d3c7740
- Milestone: Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Investigate codebase and write report to handoff.md
- Update progress.md regularly

## Current Parent
- Conversation ID: 095792d8-1a85-4945-889d-abf25d3c7740
- Updated: 2026-10-29T11:30:00Z

## Investigation State
- **Explored paths**:
  - `src/components/AppScreen.tsx` (Sidebar arrays, navigation router, role checks, dynamic imports)
  - `src/components/ClaySidebar.tsx` (Reusable sidebar primitive with claymorphism tokens)
  - `src/components/HomeViewGuru.tsx` & `src/components/HomeViewAdmin.tsx` (Quick navigation buttons & steps)
  - `src/components/Onboarding/tutorialSteps.ts` & `src/components/Onboarding/OnboardingTutorial.tsx` (DOM tour query selectors)
  - `src/components/Tutorial/tutorialData.ts` (28 tutorial items and viewId mappings)
  - `src/components/AIAssistant/knowledgeBase.ts` (Menu registry & FAQ related views)
  - `src/components/DokumenView.tsx`, `RekapSiswaView.tsx`, `PiketView.tsx`, `AdminDataView.tsx`, `SuperadminView.tsx`, `AdminVerifView.tsx` (Tab patterns)
  - Test suites: `tests/kepsek_pengawas_rbac.test.ts`, `tests/adversarial_rapor_wali_security.test.ts`, `tests/sistem_blok_verification.test.ts`, `tests/dinas_pendidikan_monitoring.test.ts`, `tests/app_screen_integration.test.ts`, `tests/adversarial_onboarding_stress.test.ts`
- **Key findings**:
  1. 41 automated test suites in `npm test` pass 100%, but several perform literal string/regex checks against `AppScreen.tsx` for legacy menu declarations (`id: 'view-rapor'`, `id: 'view-sistem-blok'`, `id: 'view-analitik'`).
  2. `OnboardingTutorial.tsx` uses exact string match `[data-tour="${currentStep.targetTourId}"]`, which breaks if space-separated composite classes are used without upgrading the selector.
  3. View switching uses single `currentView` string state, triggering unmounting of components.
  4. Three distinct tab UI patterns currently exist: Claymorphism Pills, Rounded Border Pills, and Segmented Bar Tabs.
- **Unexplored areas**: None, all 5 dispatch objectives investigated.

## Key Decisions Made
- Architected transparent two-layer aliasing router and sub-tab model with in-memory keep-alive for form tabs.
- Identified mitigation for test suite static AST checks and data-tour selectors.

## Artifact Index
- handoff.md — Comprehensive findings and navigation architecture proposal
- progress.md — Liveness heartbeat and milestone tracking
- DISPATCH.md — Stored dispatch instructions
