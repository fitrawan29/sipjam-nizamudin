# BRIEFING — 2026-09-28T05:55:35Z

## Mission
Implement high-fidelity Onboarding Tutorial component (`OnboardingTutorial.tsx`, `tutorialSteps.ts`, `index.ts`) with spotlight overlay, mobile-adaptive clamping, sidebar coordination, and comprehensive automated test suite.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_onboarding
- Original parent: 3b364431-4af8-4ed9-9a8c-b79b77d58fbe
- Milestone: Onboarding Feature Implementation

## 🔒 Key Constraints
- Exclusive write ownership:
  - `src/components/Onboarding/tutorialSteps.ts`
  - `src/components/Onboarding/OnboardingTutorial.tsx`
  - `src/components/Onboarding/index.ts`
  - `tests/onboarding_and_ai_assistant_ui.test.ts`
- DO NOT modify `src/components/AppScreen.tsx` (assigned to Worker 3).
- Minimum 5 steps for Guru role with specific targets & metadata.
- Minimum 6 steps for Admin role with specific targets & metadata.
- Superadmin receives empty steps.
- LocalStorage keys: `sipjam_onboarding_guru_done`, `sipjam_onboarding_admin_done`.
- Spotlight overlay with pulsing gold border, dark backdrop, mobile-clamped tooltip.
- Sidebar coordination (`onEnsureSidebarOpen` hook).
- Tests must pass via `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`.
- Typecheck `npx tsc --noEmit` must pass with 0 errors.
- Integrity: No cheats, real logic and state.

## Current Parent
- Conversation ID: 3b364431-4af8-4ed9-9a8c-b79b77d58fbe
- Updated: 2026-09-28T05:55:35Z

## Task Summary
- **What to build**: Onboarding tutorial system with role-based steps, spotlight rendering, viewport clamping, responsive controls, and automated test suite.
- **Success criteria**: All tour steps implemented, responsive tooltip positioning, smooth backdrop/spotlight, clean exports, automated tests passing (exit code 0), tsc passing.
- **Code layout**: `src/components/Onboarding/`

## Key Decisions Made
- Created SVG mask cutout on dark backdrop (`z-[60]`) paired with gold spotlight box (`z-[70]`) and floating card (`z-[75]`).
- Implemented responsive tooltip clamping for mobile (320px–428px) and desktop with top/bottom/left/right placement fallbacks.
- Provided sidebar synchronization with debounce/timeout for animation settle.
- Tested SSR safety using `react-dom/server`'s `renderToString`.

## Artifact Index
- `src/components/Onboarding/tutorialSteps.ts` — Role tour definitions & storage constants
- `src/components/Onboarding/OnboardingTutorial.tsx` — Main interactive overlay & spotlight component
- `src/components/Onboarding/index.ts` — Component barrel exports
- `tests/onboarding_and_ai_assistant_ui.test.ts` — Comprehensive test suite

## Change Tracker
- **Files modified**:
  - `src/components/Onboarding/tutorialSteps.ts`: Created
  - `src/components/Onboarding/OnboardingTutorial.tsx`: Created
  - `src/components/Onboarding/index.ts`: Created
  - `tests/onboarding_and_ai_assistant_ui.test.ts`: Created
- **Build status**: PASS (`npx tsc --noEmit` exit 0, `npm run build` exit 0, tests 100% PASS)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (100%)
- **Lint status**: PASS (Clean TypeScript)
- **Tests added/modified**: `tests/onboarding_and_ai_assistant_ui.test.ts` (all 7 sections passing)
