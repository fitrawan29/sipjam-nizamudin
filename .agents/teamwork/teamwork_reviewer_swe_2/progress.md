# Progress - Reviewer Round 2 (teamwork_reviewer)

## Objective
Independent adversarial verification, stress testing, and hardening of the onboarding tutorial system alignment (`OnboardingTutorial.tsx`, `tutorialSteps.ts`, `tests/challenger_m2_tutorial_system.test.ts`) according to `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`.

## Defects Identified & Hardened
1. **Uncaptured Nested Container Scroll Events**:
   - `window.addEventListener('scroll')` without capture phase failed to receive non-bubbling scroll events from scrollable child containers like `div.space-y-1.5.overflow-y-auto` in the sidebar.
   - Fixed by adding `{ passive: true, capture: true }` to `window.addEventListener('scroll')` and `{ capture: true }` to `removeEventListener`.
2. **Missing Dependencies on Keydown Effect Causing Listener Churn**:
   - `useEffect` for keyboard navigation in `OnboardingTutorial.tsx` lacked a dependency array (`});`), resulting in re-binding of the window listener on every render cycle.
   - Fixed by specifying explicit dependency array `[isOpen, currentStepIndex, steps.length, userRole]`.
3. **Unclamped Desktop Collision Fallback Coordinates & Missing Center Placement**:
   - Tooltip calculation when flipping below target on right/top placement lacked `Math.max(16, ...)` clamping, risking negative top values on short viewports. Also, `placement === 'center'` had no dedicated calculation.
   - Fixed by adding explicit `placement === 'center'` handling and a dual-axis viewport boundary safety net (`top = Math.max(16, Math.min(Math.max(16, vh - estimatedHeight - 16), top))`, etc.).
4. **Spotlight Frame Coordinate Misalignment near Viewport Edges**:
   - The HTML spotlight box used raw `${targetRect.left - padding}px` while the SVG mask cutout used `Math.max(0, targetRect.left - padding)`.
   - Fixed by clamping both `top` and `left` of the spotlight box with `Math.max(0, ...)`.

## Verification Status
- `npx tsx tests/challenger_m2_tutorial_system.test.ts`: 125 passed, 0 failed (100% PASS)
- `npx tsx tests/adversarial_challenger_final_verification.test.ts`: 92 passed, 0 failed (100% PASS)
- `npx tsx tests/adversarial_onboarding_stress.test.ts`: 163 passed, 0 failed (100% PASS)
- `npx tsx tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts`: 82 passed, 0 failed (100% PASS)
- `npx tsx tests/challenger_m2_sidebar_profile.test.ts`: 72 passed, 0 failed (100% PASS)
- `npx tsc --noEmit`: 0 errors (Exit code 0)
- `npm test`: 41 suites, 100% pass (Exit code 0)
