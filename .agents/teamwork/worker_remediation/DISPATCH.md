## 2026-09-27T22:05:45Z
You are worker_remediation.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_remediation

Please read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-09-27T21:46:18Z)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_1\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\GEMINI.md

Your exclusive write ownership:
- `src/components/Onboarding/OnboardingTutorial.tsx`
- `src/components/Onboarding/tutorialSteps.ts`
- `src/components/AIAssistant/AIAssistant.tsx`
- Any related test updates if needed

Fixes to implement:
1. In `src/components/Onboarding/OnboardingTutorial.tsx`:
   Fix the Tour Reopening Index Retention bug:
   Add a `useEffect` that resets `currentStepIndex` to 0 whenever `isOpen` transitions to true:
   ```tsx
   useEffect(() => {
     if (isOpen) {
       setCurrentStepIndex(0);
     }
   }, [isOpen]);
   ```
   Ensure that when the user completes or skips the tour, and later clicks "Lihat Tutorial Lagi", the tour restarts cleanly at Step 1 (index 0).

2. In `src/components/Onboarding/tutorialSteps.ts`:
   Fix `normalizeRole(role: string)`:
   Add a guard at the beginning:
   ```ts
   if (!role || typeof role !== 'string') return '';
   ```
   so non-string arguments do not throw `TypeError: role.toLowerCase is not a function`.

3. In `src/components/AIAssistant/AIAssistant.tsx`:
   - Replace any arbitrary `z-45` Tailwind classes with valid arbitrary value `z-[45]`.
   - In props destructuring, include `userName`:
     `export function AIAssistant({ currentView, userRole, userName }: AIAssistantProps)`
     and personalize the initial welcome message with `userName` if present:
     `const displayName = userName ? \`Bapak/Ibu \${userName}\` : (isTeacher ? 'Bapak/Ibu Guru' : 'Admin');`

4. Verification:
   Run all automated test suites:
   - `npx tsx tests/ai_assistant_faq.test.ts`
   - `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`
   - `npx tsx tests/app_screen_integration.test.ts`
   - `npx tsx tests/adversarial_ai_assistant_challenger_1.test.ts`
   - `npx tsx tests/adversarial_onboarding_stress.test.ts`
   Run typecheck: `npx tsc --noEmit`
   Run production build: `npm run build`
   Ensure all pass with exit code 0!

5. Git Workflow per GEMINI.md:
   - `git status`
   - `git add .`
   - `git commit -m "fix: reset onboarding tour step on re-open and polish assistant UI"`
   - `git push origin main`
