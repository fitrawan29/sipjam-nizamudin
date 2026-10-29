# Progress Reviewer: Onboarding Tutorial & Challenger M2 Verification

## Review Scope & Objectives
- Target: Onboarding Tutorial (`src/components/Onboarding/OnboardingTutorial.tsx`, `tutorialSteps.ts`), ClayTabs Sub-Tab indicators, and `tests/challenger_m2_tutorial_system.test.ts`.
- Reference: `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`.

## Independent Analysis & Defect Identification
1. **Unanchored / Fallback Tooltip Card Unbounded Sizing**:
   - In `OnboardingTutorial.tsx`, when `!targetRect`, style returned `top: 50%, left: 50%, transform: translate(-50%, -50%)` without explicit `width` or `maxWidth`. On compact mobile screens, content can stretch horizontally past viewport margins.
   - **Fix**: Added `width: 'min(92vw, 380px)'` and `maxWidth: '380px'`.
2. **Hardcoded Estimated Height Pushing Buttons Offscreen**:
   - `calculateTooltipStyle()` used static `estimatedHeight = 220`, while the card with subtab badge indicators is ~320px tall. When target elements were positioned near bottom on short screens (e.g. mobile 600px height), the algorithm incorrectly decided there was space below, pushing "Lanjut", "Selesai", and "Kembali" buttons off the screen.
   - **Fix**: Measured dynamic height from `tooltipRef.current?.offsetHeight` (fallback 320px if subTabs exist), and clamped card max height to `max-h-[calc(100vh-32px)] overflow-y-auto`.
3. **Subtab Pointer Header Overflow on Ultra-Narrow Viewports (< 360px)**:
   - Header was `flex items-center justify-between` without wrapping. On 320px devices (iPhone SE), "Sub-Tab Terpadu (ClayTabs):" and "Fokus: ..." collided and clipped.
   - **Fix**: Changed to `flex flex-wrap items-center justify-between gap-1` with `shrink-0`.
4. **Single-Shot Polling and Zero-Dimension Spotlight Artifact**:
   - Single 180ms timer missed completion of 250-300ms CSS drawer slide transitions, causing misplaced spotlights during fast navigation. Additionally, hidden/unrendered elements with 0 width/height were given spotlight boxes at (0,0).
   - **Fix**: Replaced single timer with multi-phase polling (immediate, 80ms, 200ms, 350ms) and added `rect.width > 0 || rect.height > 0` guard to safely fall back to centered modal when elements are zero-sized.
5. **Sub-Tab ID Prefix Resiliency**:
   - SubSelector only matched `#tab-${id}`, failing if custom `tabsIdPrefix` was used (e.g. `#guru-jurnal-input`).
   - **Fix**: Extended subSelector to match `cleanSub`, `#cleanSub`, and `[id$="cleanSub"]`.

## Verification Status
- `npx tsx tests/challenger_m2_tutorial_system.test.ts`: 121 / 121 PASSED (100%)
- `npx tsx tests/adversarial_onboarding_stress.test.ts`: 163 / 163 PASSED (100%)
- `npx tsx tests/adversarial_challenger_final_verification.test.ts`: 92 / 92 PASSED (100%)
- `npx tsx tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts`: 82 / 82 PASSED (100%)
- `npx tsx tests/challenger_m2_sidebar_profile.test.ts`: 72 / 72 PASSED (100%)
- `npx tsc --noEmit`: 0 errors
- `npm test`: 41 / 41 test suites PASSED (100%)
