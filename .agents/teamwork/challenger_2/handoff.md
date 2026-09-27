# Handoff Report: Challenger 2 Empirical Stress-Testing

**Author**: challenger_2 (Adversarial Challenger & Empirical Verification Specialist)  
**Target Area**: OnboardingTutorial (`OnboardingTutorial.tsx`, `tutorialSteps.ts`, `AppScreen.tsx` integration)  
**Date**: 2026-09-28  
**Verdict**: **REJECT** (1 Critical/High Finding, 1 Medium Finding)

---

## 1. Observation

### 1.1 Empirical Test Execution Results
An adversarial test harness was authored and executed at `tests/adversarial_onboarding_stress.test.ts`. Command executed:
```powershell
npx tsx tests/adversarial_onboarding_stress.test.ts
```
**Output summary**:
- Total Assertions: 161
- Passed: 160
- Failed: 1 (Uncaught TypeError in `normalizeRole`)
- Findings Logged: 2

### 1.2 Observation 1: Tour Reopening Index Retention Bug (`AppScreen.tsx:886` & `OnboardingTutorial.tsx:35`)
In `src/components/AppScreen.tsx` (lines 886-892):
```tsx
      <OnboardingTutorial
        userRole={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'guru'}
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onComplete={() => setTourOpen(false)}
        onEnsureSidebarOpen={(open) => setSidebarOpen(open)}
      />
```
And in `src/components/AppScreen.tsx` (lines 601-610):
```tsx
      {!isSuperadmin && (
        <button
          type="button"
          onClick={() => { setTourOpen(true); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all border border-amber-200/60 dark:border-amber-800/40 mt-1 mb-2 cursor-pointer"
          title="Buka kembali panduan tutorial interaktif"
        >
          <i className="fa-solid fa-graduation-cap text-sm"></i>
          <span>Lihat Tutorial Lagi</span>
        </button>
      )}
```
In `src/components/Onboarding/OnboardingTutorial.tsx` (lines 35-38, 131-155):
```typescript
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  ...
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
- `OnboardingTutorial` is mounted unconditionally inside `AppScreen.tsx`.
- When closed (`isOpen === false`), it returns `null` but remains in the React component tree; its state is preserved.
- Neither `handleSkip`, `handleComplete`, nor any `useEffect` resets `currentStepIndex` back to `0`.
- When the user finishes or skips the tutorial and subsequently clicks **"Lihat Tutorial Lagi"** (`setTourOpen(true)`), `currentStepIndex` retains its previous value (`steps.length - 1` if finished, or whatever step was active when skipped).
- As a result, the user is presented with the final step ("Langkah 5 dari 5" with "Selesai") instead of starting at Step 1 ("Menu Navigasi").

### 1.3 Observation 2: Unhandled Runtime TypeError in `normalizeRole` (`tutorialSteps.ts:122`)
In `src/components/Onboarding/tutorialSteps.ts` (lines 122-129):
```typescript
export function normalizeRole(role?: string | null): 'superadmin' | 'admin' | 'guru' | 'unknown' {
  if (!role) return 'unknown';
  const clean = role.toLowerCase().replace(/[\s_-]+/g, '');
  if (clean === 'superadmin') return 'superadmin';
  if (clean === 'admin') return 'admin';
  if (clean === 'guru' || clean === 'teacher') return 'guru';
  return 'unknown';
}
```
Verbatim test error when passing non-string argument:
```
TypeError: role.toLowerCase is not a function
    at normalizeRole (src/components/Onboarding/tutorialSteps.ts:124:22)
```
If `role` is an object, number, or unexpected type from Supabase session/local data, the function crashes instead of returning `'unknown'`.

### 1.4 Observation 3: Robustness Under Other Stress Vectors
- **Missing / Non-Existent DOM Targets**:
  - `updateTargetRect()` handles missing DOM elements by setting `targetRect = null`.
  - SVG mask cutout safely suppresses the cutout rectangle when `targetRect === null`.
  - Spotlight bounding box (`data-testid="spotlight-box"`) is conditionally unmounted when `targetRect === null`.
  - `calculateTooltipStyle()` returns `{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 75 }` (modal centered on screen) without crashing.
- **LocalStorage Boundary Stress**:
  - Tested 18 corrupt string values (`'false'`, `'null'`, `'undefined'`, `'0'`, `'1'`, `'TRUE'`, `'true '`, `'yes'`, `'no'`, `'{}'`, `'{"done":true}'`, `'[object Object]'`, `'NaN'`, `'Infinity'`, `''`).
  - All 18 corrupt values correctly return `isTutorialCompleted === false` and `shouldShowTutorial === true`. Only strictly `'true'` bypasses the tutorial.
  - Superadmin role is 100% exempt regardless of localStorage contents.
- **Viewport Boundary Stress**:
  - 336 permutations of screen dimensions (320px to 3840px) and element locations were evaluated.
  - Zero horizontal overflows (`left + width <= vw`).
  - Zero negative top coordinates.

---

## 2. Logic Chain

1. **Premise 1 (Acceptance Criteria R2 & R3)**:
   The specifications mandate: *"User bisa skip atau klik 'Lanjut' antar step... Ada tombol 'Lihat Tutorial Lagi' di sidebar. Tutorial bisa dibuka ulang melalui sidebar."*
2. **Premise 2 (State Persistence)**:
   In React, an unconditionlly mounted component (`<OnboardingTutorial isOpen={tourOpen} .../>`) that returns `null` does not unmount. Its internal hook state (`currentStepIndex`) persists.
3. **Premise 3 (Observed State Transition)**:
   When `tourOpen` toggles from `false` to `true` upon clicking "Lihat Tutorial Lagi", `currentStepIndex` remains at `steps.length - 1`.
4. **Premise 4 (User Experience Impact)**:
   A user attempting to re-learn the application via "Lihat Tutorial Lagi" does not see the tutorial; they immediately see the final callout ("Asisten AI SIPJAM" / "Selesai"), bypassing all preceding steps (Presensi, Jurnal, Piket, etc.).
5. **Conclusion**:
   Acceptance criteria for reopening the tutorial is broken. This constitutes a functional regression requiring immediate remediation.

---

## 3. Caveats

- In production desktop environments where the user never skips or finishes, the bug is dormant until the second invocation.
- Touch scroll inertial dynamics on real physical iOS Safari devices cannot be fully emulated in node runtime, though mathematical collision formulas were verified across 336 screen permutations.
- Implementation code was strictly NOT modified per Review-Only constraint.

---

## 4. Conclusion & Actionable Mitigations

**Verdict**: **REJECT**

### Required Fixes for Implementer:

1. **Fix Reopening Index Retention**:
   In `src/components/Onboarding/OnboardingTutorial.tsx`, reset `currentStepIndex` when `isOpen` becomes `true`:
   ```typescript
   useEffect(() => {
     if (isOpen) {
       setCurrentStepIndex(0);
     }
   }, [isOpen]);
   ```
   *Alternative fix*: In `src/components/AppScreen.tsx`, conditionally mount the component:
   ```tsx
   {tourOpen && (
     <OnboardingTutorial
       userRole={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'guru'}
       isOpen={tourOpen}
       onClose={() => setTourOpen(false)}
       onComplete={() => setTourOpen(false)}
       onEnsureSidebarOpen={(open) => setSidebarOpen(open)}
     />
   )}
   ```

2. **Fix `normalizeRole` Type Guard**:
   In `src/components/Onboarding/tutorialSteps.ts`:
   ```typescript
   export function normalizeRole(role?: unknown): 'superadmin' | 'admin' | 'guru' | 'unknown' {
     if (typeof role !== 'string' || !role.trim()) return 'unknown';
     const clean = role.toLowerCase().replace(/[\s_-]+/g, '');
     ...
   ```

---

## 5. Verification Method

To independently reproduce and verify:
```powershell
npx tsx tests/adversarial_onboarding_stress.test.ts
```
Expected output prior to fix:
- Section 2 reports: `[FAIL] normalizeRole(123) should not throw exception`
- Section 4 reports: `[FINDING - HIGH] Tour Reopening Index Retention Bug`
- Overall Verdict: `REJECT`

Once the fixes are applied, rerun:
```powershell
npx tsx tests/adversarial_onboarding_stress.test.ts
npm run build
```
Both will pass cleanly.
