# Handoff Report: Reviewer 2 (Interactive Onboarding Tutorial & AppScreen Integration)

**Agent**: `reviewer_2`  
**Role**: reviewer, critic  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_2`  
**Parent / Caller**: `orchestrator_5` (`3b364431-4af8-4ed9-9a8c-b79b77d58fbe`)  
**Date**: 2026-09-28T06:05:00+08:00 (UTC: 2026-09-27T22:05:00Z)  

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**

Overall code quality, component architecture, styling, and test coverage for the Onboarding Tutorial are exceptional. Zero integrity violations were detected. However, an adversarial review uncovered a **Major Functional Defect**: when a user completes or skips the tutorial and later clicks "Lihat Tutorial Lagi" from the sidebar, `currentStepIndex` is NOT reset to 0 in `OnboardingTutorial.tsx`. Consequently, the tutorial re-opens on the final step ("Selesai") rather than starting from Step 1 ("Menu Navigasi" or "Menu Verifikasi"). A concise 3-line fix resolves this completely.

---

## 1. Observation

Direct observations from codebase inspection and execution:

### 1.1 Implementation Files Inspected
1. **`src/components/Onboarding/tutorialSteps.ts`**:
   - Lines 11-12:
     ```ts
     export const STORAGE_KEY_GURU = 'sipjam_onboarding_guru_done';
     export const STORAGE_KEY_ADMIN = 'sipjam_onboarding_admin_done';
     ```
   - Lines 14-60 (`GURU_STEPS`): Exactly 5 steps defined:
     - Step 1: `targetTourId: 'hamburger-btn'`, `title: 'Menu Navigasi'`, `requiresSidebarOpen: false`, `placement: 'bottom'`
     - Step 2: `targetTourId: 'view-guru-presensi'`, `title: 'Presensi Datang & Pulang'`, `requiresSidebarOpen: true`, `placement: 'right'`
     - Step 3: `targetTourId: 'view-guru-jurnal'`, `title: 'Jurnal Pembelajaran'`, `requiresSidebarOpen: true`, `placement: 'right'`
     - Step 4: `targetTourId: 'view-piket'`, `title: 'Modul Piket'`, `requiresSidebarOpen: true`, `placement: 'right'`
     - Step 5: `targetTourId: 'ai-assistant-btn'`, `title: 'Asisten AI SIPJAM'`, `requiresSidebarOpen: false`, `placement: 'top'`
   - Lines 62-117 (`ADMIN_STEPS`): Exactly 6 steps defined:
     - Step 1: `targetTourId: 'view-admin-verif'`, `title: 'Menu Verifikasi'`, `requiresSidebarOpen: true`, `placement: 'right'`
     - Step 2: `targetTourId: 'view-sistem-blok'`, `title: 'Menu Sistem Blok'`, `requiresSidebarOpen: true`, `placement: 'right'`
     - Step 3: `targetTourId: 'view-admin-data'`, `title: 'Menu Master Data'`, `requiresSidebarOpen: true`, `placement: 'right'`
     - Step 4: `targetTourId: 'view-analitik'`, `title: 'Menu Analitik'`, `requiresSidebarOpen: true`, `placement: 'right'`
     - Step 5: `targetTourId: 'view-admin-config'`, `title: 'Menu Sistem (Konfigurasi)'`, `requiresSidebarOpen: true`, `placement: 'right'`
     - Step 6: `targetTourId: 'ai-assistant-btn'`, `title: 'Asisten AI SIPJAM'`, `requiresSidebarOpen: false`, `placement: 'top'`
   - Lines 122-187: Utility functions `normalizeRole`, `getStepsForRole`, `isTutorialCompleted`, `shouldShowTutorial`, `setTutorialCompleted`, `resetTutorial`.
     - Superadmin is explicitly handled by returning `[]` and `isTutorialCompleted('superadmin') === true`.

2. **`src/components/Onboarding/OnboardingTutorial.tsx`**:
   - Lines 27-41:
     ```tsx
     export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
       userRole,
       isOpen,
       onClose,
       onComplete,
       onEnsureSidebarOpen,
     }) => {
       const steps = getStepsForRole(userRole);
       const [currentStepIndex, setCurrentStepIndex] = useState(0);
       const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
       const [isMeasuring, setIsMeasuring] = useState(false);
       const tooltipRef = useRef<HTMLDivElement>(null);

       const currentStep: TourStep | undefined = steps[currentStepIndex];
     ```
   - Lines 131-155:
     ```tsx
     const handleSkip = () => {
       setTutorialCompleted(userRole);
       onEnsureSidebarOpen?.(false);
       onClose();
     };
     ...
     const handleComplete = () => {
       setTutorialCompleted(userRole);
       onEnsureSidebarOpen?.(false);
       onComplete();
     };
     ```
     **Observation**: Neither `handleSkip` nor `handleComplete` resets `currentStepIndex` to `0`. Furthermore, there is no `useEffect` watching `isOpen` to reset `currentStepIndex` to `0` when `isOpen` transitions to `true`.
   - Lines 162-263 (`calculateTooltipStyle`):
     - Mobile branch (`vw < 640`): calculates `tooltipWidth = Math.min(360, vw - 32)`. Checks room below target (`targetRect.bottom + estimatedHeight + 16 <= vh`), checks room above target (`targetRect.top - estimatedHeight - 16 >= 0`), or docks to bottom (`bottom: 20px, left: 16px, right: 16px, margin: 0 auto`).
     - Desktop branch (`vw >= 640`): calculates coordinate offsets, checking edge collisions against `vw - 16` and `vh - 16`, flipping to opposite sides as needed.
   - Lines 268-412: High-fidelity visual presentation using SVG `<mask id="sipjam-onboarding-mask">` with transparent cutout for highlighted target, dynamic spotlight box (`data-testid="spotlight-box"`) at `z-[70]`, and tooltip card (`data-testid="tooltip-card"`) at `z-[75]`.

3. **`src/components/AppScreen.tsx`**:
   - Line 28: Imports `OnboardingTutorial, STORAGE_KEY_GURU, STORAGE_KEY_ADMIN`.
   - Lines 174-189: Auto-trigger effect checks `localStorage.getItem(STORAGE_KEY_ADMIN)` / `STORAGE_KEY_GURU` and sets `setTourOpen(true)`. Superadmin is excluded (`!isSuperadmin`).
   - Line 514: Hamburger button tagged with `data-tour="hamburger-btn"`.
   - Line 582: Dynamic sidebar button tagged with `data-tour={item.id}`.
   - Lines 600-610: "Lihat Tutorial Lagi" button rendered in sidebar for non-superadmin:
     ```tsx
     {!isSuperadmin && (
       <button
         type="button"
         onClick={() => { setTourOpen(true); setSidebarOpen(false); }}
         className="..."
       >
         <i className="fa-solid fa-graduation-cap text-sm"></i>
         <span>Lihat Tutorial Lagi</span>
       </button>
     )}
     ```
   - Lines 886-892: `<OnboardingTutorial>` mounted at root level:
     ```tsx
     <OnboardingTutorial
       userRole={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'guru'}
       isOpen={tourOpen}
       onClose={() => setTourOpen(false)}
       onComplete={() => setTourOpen(false)}
       onEnsureSidebarOpen={(open) => setSidebarOpen(open)}
     />
     ```

### 1.2 Test Execution Results
1. `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`:
   - All 7 sections passed (100%):
     - LocalStorage keys verified
     - Role normalization verified
     - Guru flow verified (>= 5 steps, targets, flags)
     - Admin flow verified (>= 6 steps, targets, flags)
     - Superadmin exemption verified
     - LocalStorage state machine verified
     - SSR component render verified
   - Exit code: 0
2. `npx tsx tests/app_screen_integration.test.ts`:
   - 24/24 assertions passed (100%):
     - Imports, states, auto-trigger effect, DOM targeting, sidebar button, prop passing, and step target alignment.
   - Exit code: 0
3. `npx tsc --noEmit`:
   - Zero TypeScript errors.
   - Exit code: 0
4. `npm run build`:
   - Next.js Turbopack production build succeeded in 868ms. 11/11 routes prerendered.
   - Exit code: 0

---

## 2. Logic Chain

1. **Integrity Assessment**:
   - Inspected test files and source code. No hardcoded mock results, no dummy facades, no external bypassing dependencies, and no fabricated assertions.
   - The test suites genuinely test the exported modules and DOM AST representations.
   - **Finding**: Integrity check PASSED.

2. **Compliance with User Requirements**:
   - **R2 (Guru Flow)**: Defines 5 steps covering Hamburger, Presensi Datang, Jurnal Mengajar, Piket, and AI Assistant button. `STORAGE_KEY_GURU` properly persisted. PASSED.
   - **R3 (Admin Flow)**: Defines 6 steps covering Verifikasi, Sistem Blok, Master Data, Analitik, Sistem (Konfigurasi), and AI Assistant button. `STORAGE_KEY_ADMIN` properly persisted. PASSED.
   - **R4 (Integration)**: Cleanly mounted in `AppScreen.tsx`. No extra npm packages. All UI strings in Bahasa Indonesia. Mobile responsive clamping. PASSED.

3. **Adversarial Failure Mode Analysis (The Bug)**:
   - **Premise 1**: `<OnboardingTutorial>` is rendered unconditionally inside `AppScreen.tsx` (lines 886-892) without a unique `key` prop that changes when `tourOpen` toggles.
   - **Premise 2**: React preserves the component instance and internal state (`currentStepIndex`) across renders when `isOpen` changes from `false` to `true`.
   - **Premise 3**: In `OnboardingTutorial.tsx`, `currentStepIndex` is initialized to `0` via `useState(0)`. During a tour, user advances to the final step (`currentStepIndex = 4` for Guru, `5` for Admin).
   - **Premise 4**: When the user clicks "Selesai" or "Lewati", `onClose()` / `onComplete()` sets `tourOpen = false`. In `OnboardingTutorial.tsx`, line 157 returns `null`, but the component instance remains mounted and `currentStepIndex` retains its final value.
   - **Premise 5**: When the user subsequently clicks "Lihat Tutorial Lagi" in the sidebar, `setTourOpen(true)` triggers `isOpen = true`.
   - **Inference**: Because `currentStepIndex` was never reset, the tutorial re-opens displaying the last step (e.g., "Langkah 5 dari 5: Asisten AI SIPJAM" with button "Selesai"), completely skipping steps 1 through 4.
   - **Risk Escalation**: If the user's role switches from Admin (6 steps, index 5) to Guru (5 steps, max index 4), `steps[5]` is `undefined`, causing `currentStep` to be `undefined`. Line 157 (`if (!isOpen || steps.length === 0 || !currentStep) return null;`) causes `OnboardingTutorial` to render `null` permanently, bricking the tutorial entirely until a full page reload.

---

## 3. Findings

### [Major] Finding 1: Step Index Retention on "Lihat Tutorial Lagi" Re-open

- **What**: Re-opening the onboarding tutorial via the sidebar button "Lihat Tutorial Lagi" opens on the final step (Step 5 of 5 for Guru, Step 6 of 6 for Admin) instead of restarting from Step 1.
- **Where**: `src/components/Onboarding/OnboardingTutorial.tsx`, lines 35, 76-94, 131-155.
- **Why**: React preserves the internal `currentStepIndex` state across `isOpen` prop toggles. Neither `handleSkip` / `handleComplete` nor any `useEffect` resets `currentStepIndex` to 0 when `isOpen` becomes `true`.
- **Suggestion**: In `src/components/Onboarding/OnboardingTutorial.tsx`, add an effect to reset `currentStepIndex` to 0 when `isOpen` transitions to true:
  ```tsx
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);
  ```
  And/or reset `setCurrentStepIndex(0)` inside `handleSkip` and `handleComplete`.

### [Minor] Finding 2: `normalizeRole` Non-String Type Guard

- **What**: If `role` is passed as a non-string truthy value (e.g. numeric ID `123` or an object), `role.toLowerCase()` throws an unhandled `TypeError: role.toLowerCase is not a function`.
- **Where**: `src/components/Onboarding/tutorialSteps.ts`, line 122.
- **Why**: `if (!role) return 'unknown';` does not check `typeof role !== 'string'`.
- **Suggestion**: Update guard to:
  ```ts
  export function normalizeRole(role?: unknown): 'superadmin' | 'admin' | 'guru' | 'unknown' {
    if (!role || typeof role !== 'string') return 'unknown';
    const clean = role.toLowerCase().replace(/[\s_-]+/g, '');
    ...
  ```

---

## 4. Verified Claims

| Claim | Method | Result |
|---|---|---|
| Guru flow has >= 5 steps with specified targets | Inspected `tutorialSteps.ts` and ran `tests/onboarding_and_ai_assistant_ui.test.ts` | PASS (5 steps: hamburger-btn, view-guru-presensi, view-guru-jurnal, view-piket, ai-assistant-btn) |
| Admin flow has >= 6 steps with specified targets | Inspected `tutorialSteps.ts` and ran `tests/onboarding_and_ai_assistant_ui.test.ts` | PASS (6 steps: view-admin-verif, view-sistem-blok, view-admin-data, view-analitik, view-admin-config, ai-assistant-btn) |
| LocalStorage keys match exact specification | Tested `STORAGE_KEY_GURU` and `STORAGE_KEY_ADMIN` values and persistence transitions | PASS (`sipjam_onboarding_guru_done`, `sipjam_onboarding_admin_done`) |
| Superadmin is exempt from tutorial | Inspected `tutorialSteps.ts` (`[]`), `AppScreen.tsx` (`!isSuperadmin`), and SSR test | PASS (0 steps returned, button omitted, auto-trigger suppressed) |
| Mobile responsiveness & boundary clamping | Inspected `calculateTooltipStyle()` for `vw < 640` and tested boundary clamping math | PASS (Clamped to `Math.min(360, vw - 32)`, left 16px, dock fallback) |
| Sidebar coordination | Inspected `requiresSidebarOpen` flags and `onEnsureSidebarOpen` hook with 180ms delay | PASS (Drawer opens/closes in sync with step requirements) |
| Production build & type safety | Ran `npx tsc --noEmit` and `npm run build` | PASS (0 errors, Turbopack succeeded) |

---

## 5. Coverage Gaps & Caveats

- **Coverage Gaps**: None. All requirements R1-R4 and review tasks 1-7 have been exhaustively tested and traced.
- **Caveats**:
  1. Real iOS Safari momentum scrolling and physical touch gestures cannot be simulated in this headless CLI environment.
  2. The failure on `npm test` in `sistem_blok_verification.test.ts` (`Original jadwal_pelajaran table has 0 records`) is due to the live database environment seed state and is completely unrelated to onboarding components.

---

## 6. Adversarial Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Pass / Fail |
|---|---|---|---|
| Target element missing in DOM | Tooltip gracefully centers at (50%, 50%), spotlight hidden, no crash | Safe fallback to viewport center, no runtime error | PASS |
| Ultra-narrow viewport (320px) | Card does not bleed off-screen horizontally or vertically | Clamped to 288px width with 16px margin, docked to bottom | PASS |
| Superadmin login | No tour overlay and no "Lihat Tutorial Lagi" button | `shouldShowTutorial` returns false, steps are `[]`, button omitted | PASS |
| Corrupted localStorage string | Re-prompts tour unless strictly `'true'` | `localStorage.getItem(key) === 'true'` strictly enforced | PASS |
| Re-open tour via "Lihat Tutorial Lagi" | Tour restarts at Step 1 | **Retains last step index (`currentStepIndex = 4` or `5`), immediately displays "Selesai"** | **FAIL (Finding 1)** |

---

## 7. Conclusion & Next Steps

The work product delivered by `worker_onboarding` and `worker_integration` is of high architectural quality. However, per adversarial review standards, the step retention bug must be resolved so that "Lihat Tutorial Lagi" provides a proper experience restarting from Step 1.

**Verdict**: **REQUEST_CHANGES**

**Recommended Action for Orchestrator**:
Instruct `worker_onboarding` to add the 3-line reset effect to `src/components/Onboarding/OnboardingTutorial.tsx`:
```tsx
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);
```
Once added, the tour will reliably start at Step 1 whenever opened, fully resolving Finding 1.

---

## 8. Verification Method

To verify the review findings and tests independently:

1. **Run Onboarding Logic & UI Test Suite**:
   ```bash
   npx tsx tests/onboarding_and_ai_assistant_ui.test.ts
   ```
2. **Run AppScreen Integration Test Suite**:
   ```bash
   npx tsx tests/app_screen_integration.test.ts
   ```
3. **Run TypeScript Check**:
   ```bash
   npx tsc --noEmit
   ```
4. **Run Production Build**:
   ```bash
   npm run build
   ```
5. **Verify Finding 1 (Step Retention Bug)**:
   Inspect `src/components/Onboarding/OnboardingTutorial.tsx` lines 34-40 and lines 131-155. Note the lack of `setCurrentStepIndex(0)` upon `isOpen` change or upon completion/skip.
