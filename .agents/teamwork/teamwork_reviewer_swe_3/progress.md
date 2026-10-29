# Progress — Review Round 3 (teamwork_reviewer)

## Phase
- Review Round 3: Adversarial Review & Quality Assurance

## Findings & Fixes
1. **Broken Test in Legacy Onboarding UI Suite (`tests/onboarding_and_ai_assistant_ui.test.ts`)**:
   - *Input*: Running `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`.
   - *Expected*: All tests pass cleanly.
   - *Actual*: Assertion failed on `assert(guruHtml.includes('Langkah 1 dari 5'))`.
   - *Root Cause*: The test had a hardcoded step count of 5 from before Rapor was integrated as step 6 in the Guru onboarding tour. When Guru was updated to 6 steps to cover the consolidated Rapor & Asesmen module (`guru-step-6-rapor`), the counter rendered `Langkah 1 dari 6`, causing the test to fail.
   - *Fix*: Updated `tests/onboarding_and_ai_assistant_ui.test.ts` to assert `view-rapor` in `guruTargets` and assert `guruHtml.includes('Langkah 1 dari ' + guruSteps.length)` (6 steps), restoring 100% test pass.
2. **Keydown Event Listener Arrow Key Trigger on Form Input Focus**:
   - *Input*: User is typing text in an input or textarea element while the onboarding tutorial is open.
   - *Expected*: Left/Right arrow keys used for text cursor movement inside the input should not trigger step changes in the onboarding tutorial.
   - *Actual*: `handleKeyDown` in `OnboardingTutorial.tsx` listened globally on `window` for `ArrowRight` and `ArrowLeft` without checking `document.activeElement`, allowing arrow key presses in text fields to inadvertently trigger `handleNext()` / `handlePrev()`.
   - *Root Cause*: Missing `activeElement` tag check (`input`, `textarea`) in `handleKeyDown`.
   - *Fix*: Added guard `if (activeTag === 'input' || activeTag === 'textarea') return;` in `OnboardingTutorial.tsx`.
3. **Hardened Test Assertions in `tests/challenger_m2_tutorial_system.test.ts`**:
   - Added assertions to Section 7 for input focus guard, subtab fallback selector matching, and active subtab highlight styling. Total tests increased to 128 (100% PASS).

## Verification
- `npx tsx tests/challenger_m2_tutorial_system.test.ts`: 128 passed, 0 failed
- `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`: 40 passed, 0 failed
- `npx tsx tests/adversarial_challenger_final_verification.test.ts`: 92 passed, 0 failed
- `npx tsx tests/adversarial_onboarding_stress.test.ts`: 163 passed, 0 failed
- `npx tsx tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts`: 82 passed, 0 failed
- `npx tsx tests/adversarial_tier5_lifecycle_scoping_challenger_2.test.ts`: 24 passed, 0 failed
- `npx tsx tests/challenger_m2_sidebar_profile.test.ts`: 72 passed, 0 failed
- `npx tsx tests/app_screen_integration.test.ts`: 25 passed, 0 failed
- `npx tsc --noEmit`: 0 errors
- `npm test`: 41 test suites passed (100%)
