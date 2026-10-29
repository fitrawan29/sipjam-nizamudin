> [!WARNING] **Skepticism Disclaimer**
> Verified across 125 tests in `challenger_m2_tutorial_system.test.ts`, 92 in `adversarial_challenger_final_verification.test.ts`, 163 in `adversarial_onboarding_stress.test.ts`, and full repository suite `npm test` with 100% pass; physical multi-touch zoom and scroll performance on physical mobile devices remain unverified due to headless test environment.

## 1. What the prior attempt got wrong
1. **Uncaptured Nested Container Scroll Events**:
   - *Input*: User scrolls inside the sidebar drawer menu list (`div.overflow-y-auto`) while an onboarding tour step points to a sidebar menu item.
   - *Expected*: The scroll event is detected on `window` and `updateTargetRect()` recalculates the target position so the spotlight box and tooltip follow the scrolled item.
   - *Actual*: `window.addEventListener('scroll', handleResizeOrScroll, { passive: true })` used default `capture: false`. In DOM specifications, `scroll` events do not bubble (`bubbles: false`), so scroll events inside child containers were never received on `window`. The spotlight frame and tooltip remained frozen at the initial position while the element scrolled away.
   - *Root Cause*: Missing `capture: true` in the scroll listener on `window`.
2. **Missing Dependencies on Keydown Effect Causing Listener Churn**:
   - *Input*: Multi-phase timeout ticks (0ms, 80ms, 200ms, 350ms) and step index transitions.
   - *Expected*: Keydown event listener attaches cleanly and updates smoothly without redundant unbind/rebind cycles on every render.
   - *Actual*: `useEffect` for keyboard navigation had an omitted dependency array (`});`), triggering listener removal and re-attachment on every single render.
   - *Root Cause*: Missing dependency array `[isOpen, currentStepIndex, steps.length, userRole]`.
3. **Unclamped Desktop Collision Fallback Coordinates & Missing Center Placement**:
   - *Input*: Compact vertical desktop/tablet viewport where tooltip collision occurs, or step with `placement: 'center'`.
   - *Expected*: All coordinates safely clamped within viewport (`Math.max(16, ...)`), and `placement: 'center'` calculates centered position relative to target.
   - *Actual*: In `placement === 'right'` and `placement === 'top'` fallback below, `top = Math.min(vh - estimatedHeight - 16, targetRect.bottom + 16)` lacked `Math.max(16, ...)`, risking negative top values. Furthermore, `placement === 'center'` had no calculation branch and defaulted to `top = targetRect.top; left = targetRect.left`.
   - *Root Cause*: Incomplete boundary clamping and missing `placement === 'center'` handling in `calculateTooltipStyle()`.
4. **Spotlight Frame Coordinate Misalignment near Viewport Edges**:
   - *Input*: Target element situated close to viewport edges (`targetRect.left < padding` or `targetRect.top < padding`).
   - *Expected*: Both the SVG mask cutout and the HTML spotlight box (`data-testid="spotlight-box"`) bound to non-negative coordinates consistently.
   - *Actual*: The SVG mask cutout clamped with `Math.max(0, targetRect.left - padding)`, while the HTML spotlight box used raw `${targetRect.left - padding}px`. If `targetRect.left = 2px` and `padding = 6px`, the mask was at `x = 0` while the box was at `left = -4px`, causing visual misalignment and frame clipping.
   - *Root Cause*: Missing `Math.max(0, ...)` coordinate clamping on the HTML spotlight box.

## 2. What I changed
- `src/components/Onboarding/OnboardingTutorial.tsx`:
  - Added `{ capture: true }` to `window.addEventListener('scroll', handleResizeOrScroll, { passive: true, capture: true })` and `removeEventListener`.
  - Added dependency array `[isOpen, currentStepIndex, steps.length, userRole]` to the keydown navigation `useEffect`.
  - Added explicit handling for `placement === 'center'` and a comprehensive viewport boundary safety net (`top = Math.max(16, Math.min(Math.max(16, vh - estimatedHeight - 16), top))`, etc.) in `calculateTooltipStyle()`.
  - Clamped HTML spotlight box coordinates with `Math.max(0, targetRect.top - padding)` and `Math.max(0, targetRect.left - padding)`.
- `tests/challenger_m2_tutorial_system.test.ts`:
  - Added assertions in Section 7 verifying capture-phase scroll listening, spotlight box edge clamping, center placement support, and keydown dependency array integrity (125 tests total, 100% pass).
- Staged, committed, and pushed directly to `origin main` as mandated by `GEMINI.md`.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/challenger_m2_tutorial_system.test.ts`: 125 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_challenger_final_verification.test.ts`: 92 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_onboarding_stress.test.ts`: 163 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts`: 82 passed, 0 failed (100% PASS)
  - `npx tsx tests/challenger_m2_sidebar_profile.test.ts`: 72 passed, 0 failed (100% PASS)
  - `npx tsc --noEmit`: 0 errors (Exit code 0)
  - `npm test`: 41 test suites passed 100% (Exit code 0)
- **Shallow Verification (manual only):** None.
- **Unverified aspects:**
  - Physical multi-touch pinch-to-zoom and gesture smoothness on real iOS Safari and Android WebView devices.

## 4. Known Issues
- `Minor Robustness Risk` — If custom CSS transforms (such as CSS zoom or scale3d) are applied to ancestor containers outside standard viewport flow, `getBoundingClientRect()` values will reflect scale factors that require viewport-relative offset calculation.

## 5. Remaining risk & next step
- The tutorial system now fully respects menu consolidation and sub-tab pointers across all roles, captures nested container scrolling, eliminates listener churn, and bounds geometries across all screen viewports with 100% test pass.
- Review Round 3 or Victory Auditor can proceed to verify platform-wide integration.
