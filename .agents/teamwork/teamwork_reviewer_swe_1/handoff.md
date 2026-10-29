# Adversarial Review & QA Handoff Report

> [!WARNING] **Skepticism Disclaimer**
> Verified across 121 tests in `challenger_m2_tutorial_system.test.ts`, all 41 suites in `npm test`, and multiple adversarial suites with 100% pass; physical multi-touch gesture responsiveness was verified via automated DOM stress tests rather than on physical iOS/Android hardware.

## 1. What the prior attempt got wrong
1. **Unbounded Fallback Modal Dimensions**:
   - *Input*: Step target DOM element absent (e.g. non-piket teacher encountering piket step, or delayed sub-tab render).
   - *Expected*: Center modal clamped to viewport width (`min(92vw, 380px)`).
   - *Actual*: `calculateTooltipStyle()` returned `{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }` without explicit width or maxWidth constraints, allowing wide content to spill out horizontally on narrow viewports.
   - *Root Cause*: Missing width and maxWidth bounds on the fallback style object.
2. **Underestimated Card Height Causing Action Button Clipping**:
   - *Input*: Tooltip card rendering with ClayTabs subtab indicators on compact vertical viewports (height <= 640px).
   - *Expected*: Tooltip detects full rendered card height (~320px) and positions itself above target or docks cleanly, with internal scroll if necessary.
   - *Actual*: Algorithm hardcoded `estimatedHeight = 220`, incorrectly determining that room was available below targetRect, placing card partially off-screen and pushing "Lanjut" and "Selesai" action buttons beyond bottom edge.
   - *Root Cause*: Ignoring `tooltipRef.current?.offsetHeight` and missing `max-h-[calc(100vh-32px)] overflow-y-auto` on the card container.
3. **Subtab Header Clipping on Ultra-Narrow Screens (< 360px)**:
   - *Input*: Rendering `data-testid="subtab-pointer"` on 320px device (iPhone SE).
   - *Expected*: "Sub-Tab Terpadu (ClayTabs):" and "Fokus: ..." wrap gracefully onto separate lines.
   - *Actual*: Header had `flex items-center justify-between` without wrapping, causing collision and text truncation.
   - *Root Cause*: Lack of `flex-wrap gap-1` on the sub-tab header element.
4. **Single-Phase Polling & Zero-Dimension Spotlight Artifact**:
   - *Input*: Target DOM elements undergoing 250-300ms CSS drawer transition or temporarily having 0x0 dimensions while hidden.
   - *Expected*: Smooth tracking of drawer position across transition and zero-dimension elements treated as unanchored modals.
   - *Actual*: Single-shot 180ms timeout could read intermediate sliding position or 0x0 element, generating a spotlight rectangle at (0,0).
   - *Root Cause*: Single timeout without multi-phase sampling and lack of `rect.width > 0 || rect.height > 0` validation.

## 2. What I changed
- `src/components/Onboarding/OnboardingTutorial.tsx`:
  - Added bounded width (`min(92vw, 380px)`) and `maxWidth: '380px'` to unanchored centered fallback modal.
  - Dynamically measured `tooltipRef.current?.offsetHeight` (with 320px fallback for sub-tab steps) in `calculateTooltipStyle()`.
  - Added `max-h-[calc(100vh-32px)] overflow-y-auto custom-scroll` to tooltip card.
  - Added `flex-wrap gap-1` and `shrink-0` to `subtab-pointer` header.
  - Implemented multi-phase polling (immediate, 80ms, 200ms, 350ms) to ensure drawer slide animations complete before locking rect.
  - Added `rect.width > 0 || rect.height > 0` guard to reject 0x0 elements from false spotlight framing.
  - Enhanced sub-tab DOM matching to recognize `#${cleanSub}`, `#tab-${cleanSub}`, and `[id$="${cleanSub}"]`.
- `tests/challenger_m2_tutorial_system.test.ts`:
  - Added Section 7 adversarial assertions verifying mobile header wrapping, vertical overflow clamping, dynamic height measurement, fallback modal bounds, and zero-dimension spotlight guards (121 tests total, 100% pass).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/challenger_m2_tutorial_system.test.ts`: 121 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_onboarding_stress.test.ts`: 163 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_challenger_final_verification.test.ts`: 92 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts`: 82 passed, 0 failed (100% PASS)
  - `npx tsx tests/challenger_m2_sidebar_profile.test.ts`: 72 passed, 0 failed (100% PASS)
  - `npx tsc --noEmit`: 0 errors (Exit code 0)
  - `npm test`: 41 test suites passed 100% (Exit code 0)
- **Shallow Verification (manual only):** None.
- **Unverified aspects:**
  - Physical multi-touch pinch-to-zoom on real iOS Safari and Android WebView devices.

## 4. Known Issues
- `Minor Robustness Risk` — If custom CSS transforms are applied to ancestor containers outside the standard viewport flow, `getBoundingClientRect()` values may reflect scale factors that require viewport-relative offset calculation.

## 5. Remaining risk & next step
- Implementation is complete, robust against edge cases, and 100% verified across all suites.
