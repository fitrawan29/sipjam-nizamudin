> [!WARNING] **Skepticism Disclaimer**
> High confidence in headless DOM geometry, event listeners, input focus protection, and test suite execution across 41 repository test suites; physical multi-touch pinch-to-zoom on real iOS Safari and Android WebView devices remains unverified due to headless Node.js test environment constraints.

## 1. What the prior attempt got wrong
1. **Broken Assertion in Sibling Test Suite (`tests/onboarding_and_ai_assistant_ui.test.ts`)**:
   - *Input*: Running `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`.
   - *Expected*: All assertions pass.
   - *Actual*: Execution failed with `❌ FAIL: Guru HTML includes "Langkah 1 dari 5" counter badge`.
   - *Root Cause*: The prior implementer added the 6th step to `GURU_STEPS` (`guru-step-6-rapor` for the consolidated Rapor & Asesmen module) but missed updating the sibling onboarding test suite `tests/onboarding_and_ai_assistant_ui.test.ts`, which still had a hardcoded expectation for 5 steps.
2. **Keyboard Arrow Navigation Interfering with Active Input / Textarea Elements**:
   - *Input*: An `<input>` or `<textarea>` element has focus (e.g. from an active form or modal) while `OnboardingTutorial` is mounted, and the user presses ArrowLeft or ArrowRight to position the text cursor.
   - *Expected*: Arrow keys navigate text inside the input field without changing onboarding tutorial steps.
   - *Actual*: The global `window.addEventListener('keydown', handleKeyDown)` fired `handleNext()` or `handlePrev()`, skipping tutorial steps or causing erratic step transitions.
   - *Root Cause*: `handleKeyDown` in `src/components/Onboarding/OnboardingTutorial.tsx` did not inspect `document.activeElement?.tagName`.

## 2. What I changed
- `src/components/Onboarding/OnboardingTutorial.tsx`:
  - Added input element focus guard `const activeTag = (document.activeElement?.tagName || '').toLowerCase(); if (activeTag === 'input' || activeTag === 'textarea') return;` inside `handleKeyDown`.
- `tests/onboarding_and_ai_assistant_ui.test.ts`:
  - Added `assert(guruTargets.includes('view-rapor'))` to Guru target verification.
  - Updated counter badge assertion from hardcoded `Langkah 1 dari 5` to dynamic `Langkah 1 dari ${guruSteps.length}` (6 steps), passing 100%.
- `tests/challenger_m2_tutorial_system.test.ts`:
  - Added Section 7 assertions verifying active input keydown protection, sub-tab fallback selector matching, and active sub-tab badge highlighting (now 128 tests total, 100% pass).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/challenger_m2_tutorial_system.test.ts`: 128 passed, 0 failed (100% PASS)
  - `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`: 40 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_challenger_final_verification.test.ts`: 92 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_onboarding_stress.test.ts`: 163 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts`: 82 passed, 0 failed (100% PASS)
  - `npx tsx tests/adversarial_tier5_lifecycle_scoping_challenger_2.test.ts`: 24 passed, 0 failed (100% PASS)
  - `npx tsx tests/challenger_m2_sidebar_profile.test.ts`: 72 passed, 0 failed (100% PASS)
  - `npx tsx tests/app_screen_integration.test.ts`: 25 passed, 0 failed (100% PASS)
  - `npx tsc --noEmit`: 0 errors (Exit code 0)
  - `npm test`: 41 test suites passed 100% (Exit code 0)
- **Shallow Verification (manual only):** None.
- **Unverified aspects:**
  - Physical multi-touch pinch-to-zoom and gesture smoothness on real iOS Safari and Android WebView devices.

## 4. Known Issues
- `Minor Robustness Risk` — If custom CSS transforms (such as CSS zoom or scale3d) are applied to ancestor containers outside standard viewport flow, `getBoundingClientRect()` values will reflect scale factors that require viewport-relative offset calculation.

## 5. Remaining risk & next step
- Both primary and secondary onboarding tutorial test suites now run and pass 100%.
- Keyboard event handling is shielded from active form inputs, and sub-tab pointers and geometry clamping are verified across all screen dimensions.
- The task requirements R1 and R2 and all acceptance criteria are fully satisfied. Teamwork orchestrator may proceed to Victory Audit.
