# Handoff Report: Interactive Onboarding Tutorial Implementation

**Agent**: `worker_onboarding`  
**Workspace**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`  
**Parent / Caller**: `orchestrator_5` (`3b364431-4af8-4ed9-9a8c-b79b77d58fbe`)  
**Date**: 2026-09-28T05:55:30Z  

---

## 1. Observation

### 1.1 Requirements and Scope
- Per user request (section `## 2026-09-27T21:46:18Z`) and orchestrator dispatch (`orchestrator_5/DISPATCH.md` R2 & R3):
  - Onboarding tutorial overlay step-by-step for teacher (`Guru`) accounts (minimum 5 steps).
  - Onboarding tutorial overlay step-by-step for school administrator (`Admin`) accounts (minimum 6 steps).
  - Superadmin role is exempt from onboarding tutorials.
  - Persistent state in `localStorage` under `sipjam_onboarding_guru_done` and `sipjam_onboarding_admin_done`.
  - Replay capability from sidebar.
  - Exclusive write ownership:
    - `src/components/Onboarding/tutorialSteps.ts`
    - `src/components/Onboarding/OnboardingTutorial.tsx`
    - `src/components/Onboarding/index.ts`
    - `tests/onboarding_and_ai_assistant_ui.test.ts`
  - Integration with `AppScreen.tsx` is left untouched for Worker 3.

### 1.2 Implemented Files and Direct Outputs
1. **`src/components/Onboarding/tutorialSteps.ts`**:
   - `TourStep` interface with `id`, `targetTourId`, `title`, `description`, `role`, `placement`, `requiresSidebarOpen`.
   - `STORAGE_KEY_GURU = 'sipjam_onboarding_guru_done'`
   - `STORAGE_KEY_ADMIN = 'sipjam_onboarding_admin_done'`
   - `GURU_STEPS` (5 steps):
     1. `hamburger-btn` ("Menu Navigasi", bottom, `requiresSidebarOpen: false`)
     2. `view-guru-presensi` ("Presensi Datang & Pulang", right, `requiresSidebarOpen: true`)
     3. `view-guru-jurnal` ("Jurnal Pembelajaran", right, `requiresSidebarOpen: true`)
     4. `view-piket` ("Modul Piket", right, `requiresSidebarOpen: true`)
     5. `ai-assistant-btn` ("Asisten AI SIPJAM", top, `requiresSidebarOpen: false`)
   - `ADMIN_STEPS` (6 steps):
     1. `view-admin-verif` ("Menu Verifikasi", right, `requiresSidebarOpen: true`)
     2. `view-sistem-blok` ("Menu Sistem Blok", right, `requiresSidebarOpen: true`)
     3. `view-admin-data` ("Menu Master Data", right, `requiresSidebarOpen: true`)
     4. `view-analitik` ("Menu Analitik", right, `requiresSidebarOpen: true`)
     5. `view-admin-config` ("Menu Sistem (Konfigurasi)", right, `requiresSidebarOpen: true`)
     6. `ai-assistant-btn` ("Asisten AI SIPJAM", top, `requiresSidebarOpen: false`)
   - Helper functions: `normalizeRole`, `getStepsForRole`, `isTutorialCompleted`, `shouldShowTutorial`, `setTutorialCompleted`, `resetTutorial`.

2. **`src/components/Onboarding/OnboardingTutorial.tsx`**:
   - Client component (`'use client';`).
   - SVG mask backdrop overlay (`z-[60]`) providing an authentic, transparent cutout hole over the target element.
   - Dynamic spotlight frame (`z-[70]`) with gold border (`border-2 border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.6)]`) and pulse animation.
   - Floating tooltip popover card (`z-[75]`):
     - Step counter badge (`Langkah X dari Y`) with icon and progress dots.
     - Title and description.
     - Actions: "Lewati", "Kembali" (disabled on step 0), "Lanjut", "Selesai", and top-right close "X".
   - Viewport boundary collision avoidance: smart position clamping for mobile screens (320px–428px) and desktop with top/bottom/left/right placement fallbacks.
   - Synchronized sidebar coordination (`onEnsureSidebarOpen` hook with 180ms delay for CSS drawer transition).
   - Window resize, scroll, and keyboard listeners (Escape, ArrowRight, ArrowLeft).

3. **`src/components/Onboarding/index.ts`**:
   - Clean barrel export with `export type { TourStep, OnboardingTutorialProps }` to ensure strict compliance with TypeScript's `isolatedModules`.

4. **`tests/onboarding_and_ai_assistant_ui.test.ts`**:
   - 7 test sections covering:
     - Section 1: Storage keys verification.
     - Section 2: Role normalization with edge cases.
     - Section 3: Guru flow steps count (>= 5), target IDs, and sidebar flags.
     - Section 4: Admin flow steps count (>= 6), target IDs, and sidebar flags.
     - Section 5: Superadmin exemption verification (returns 0 steps).
     - Section 6: LocalStorage state transitions (fresh, completed, reset).
     - Section 7: Component SSR safety and `renderToString` verification (closed, superadmin, guru, admin).
   - Command: `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`
   - Result: Exit code 0 (`ALL ONBOARDING UI & LOGIC TESTS PASSED (100%)`).

5. **Typecheck & Production Build Commands**:
   - `npx tsc --noEmit` -> Exit code 0 (0 errors).
   - `npm run build` -> Exit code 0 (`Compiled successfully in 1235ms`, 11/11 static pages generated).

---

## 2. Logic Chain

1. **Role Identification & Step Selection**:
   - Normalizing roles (`'Guru'` -> `'guru'`, `'Admin'` -> `'admin'`, `'Superadmin'` -> `'superadmin'`) ensures case-insensitive and whitespace-resilient matching.
   - Calling `getStepsForRole` returns exact arrays for Guru (5 steps) and Admin (6 steps), and an empty array for Superadmin, guaranteeing Superadmins are never prompted with an irrelevant tour.

2. **Overlay & Cutout Architecture**:
   - Standard dark overlays (`bg-black/60`) without a cutout obscure the target element, defeating the purpose of a tutorial tour.
   - By combining an SVG `<mask id="...">` at `z-[60]` with an active spotlight border box at `z-[70]`, the highlighted UI element shines through in its original clarity and colors, while surrounding UI is dimmed.
   - If the element is not found in the DOM (e.g. initial mount or off-screen), the component gracefully degrades to a centered card without throwing or corrupting layout.

3. **Sidebar Coordination**:
   - In `AppScreen.tsx`, navigation items inside the sidebar drawer are conditionally rendered (`{sidebarOpen && ...}`).
   - Steps requiring the sidebar (`view-guru-presensi`, `view-admin-verif`, etc.) have `requiresSidebarOpen: true`.
   - When entering such steps, `OnboardingTutorial` invokes `onEnsureSidebarOpen?.(true)` and waits 180ms for the drawer animation before calling `scrollIntoView()` and computing `getBoundingClientRect()`.
   - When entering steps outside the sidebar (e.g. hamburger button or AI Assistant button), it invokes `onEnsureSidebarOpen?.(false)` to prevent the drawer from obscuring the target.
   - When the tour completes or is skipped, it ensures `onEnsureSidebarOpen?.(false)` is called so the sidebar is closed cleanly.

4. **Mobile Tooltip Clamping (320px–428px)**:
   - On narrow mobile viewports, tooltips with fixed `placement="right"` would bleed off-screen horizontally.
   - The clamping logic detects `window.innerWidth < 640`, sets width to `Math.min(360, vw - 32)`, and attempts vertical positioning (below or above the target). If neither fits comfortably, it cleanly docks the card to `bottom: 20px` with 16px margins, allowing the user to view the highlighted element above while interacting with thumb-friendly buttons below.

5. **Persistence**:
   - Clicking "Lewati" or "Selesai" calls `setTutorialCompleted(role)`, writing `'true'` to `localStorage` under `sipjam_onboarding_guru_done` or `sipjam_onboarding_admin_done`.
   - The export of `resetTutorial(role)` provides Worker 3 a clean utility to implement the "Lihat Tutorial Lagi" feature in the sidebar.

---

## 3. Caveats

1. **DOM Availability**:
   - The spotlight relies on the target elements possessing the attribute `data-tour="<targetTourId>"`.
   - Integration Worker 3 must add `data-tour="hamburger-btn"`, `data-tour={item.id}`, and `data-tour="ai-assistant-btn"` to the corresponding JSX in `AppScreen.tsx` as documented in `explorer_survey_1/handoff.md`.
2. **No External Packages**:
   - Built 100% with standard React 19, native browser DOM APIs, SVG, and Tailwind CSS classes; no external tour libraries (`shepherd`, `driver.js`, etc.) were installed.

---

## 4. Conclusion

All requirements for the Onboarding Tutorial have been fulfilled:
- `src/components/Onboarding/tutorialSteps.ts` provides complete tour data, target mapping, storage keys, and role logic.
- `src/components/Onboarding/OnboardingTutorial.tsx` provides high-fidelity visual spotlight overlay, responsive collision-avoiding tooltips, sidebar synchronization, and keyboard navigation.
- `src/components/Onboarding/index.ts` provides clean, isolated-module compliant exports.
- `tests/onboarding_and_ai_assistant_ui.test.ts` validates the entire logic and SSR rendering with 100% pass rate.
- Ready for immediate integration into `AppScreen.tsx` by Worker 3.

---

## 5. Verification Method

To independently verify the implementation, run the following commands:

1. **Run Onboarding Test Suite**:
   ```bash
   npx tsx tests/onboarding_and_ai_assistant_ui.test.ts
   ```
   *Expected*: Exit code 0, all 7 sections pass.

2. **Run TypeScript Compiler Validation**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 type errors.

3. **Run Next.js Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: Exit code 0, successful prerender of 11/11 routes.
