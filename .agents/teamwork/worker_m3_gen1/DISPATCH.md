## 2026-10-29T16:20:02Z
You are teamwork_worker for Milestone 3 (Navigation Restructuring, URL Aliasing & Onboarding).
Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_gen1\

MANDATORY FIRST STEP:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

READ EXPLORER REPORTS FIRST:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\spec_miner_m3_gen1\handoff.md
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nav_gen1\handoff.md
3. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_tour_gen1\handoff.md

FILE OWNERSHIP:
- Primary file to modify: src/components/AppScreen.tsx
- Supporting files (inspect and refine if necessary):
  - src/lib/navigation.ts
  - src/components/ClaySidebar.tsx
  - src/components/Onboarding/OnboardingTutorial.tsx
  - src/components/Onboarding/tutorialSteps.ts
  - src/components/Tutorial/tutorialData.ts

TASK REQUIREMENTS:
1. In `src/components/AppScreen.tsx`:
   - Connect `resolveRoute` / `resolveCanonicalRoute` from `src/lib/navigation.ts`:
     a. Cold-start URL query initialization (`useState` for `currentView` and `urlTab`): parse `window.location.search`, resolve route. If legacy alias was detected, update state with canonical view and default tab, and replace URL cleanly (`window.history.replaceState`).
     b. Browser history (`popstate` listener in `useEffect`): resolve route from `window.location.search` and update `currentView` and `urlTab`.
     c. Imperative navigation (`handleNavigation(targetId, targetTab?)`): resolve route, update state, and push history state `?view=${canonicalView}&tab=${tab}`.
   - Sidebar menus & mobile drawer in `AppScreen.tsx`:
     - Utilize `getConsolidatedMenuItems` or ensure active menu arrays conform to target menu counts:
       - Guru Reguler: 6
       - Wali Kelas: 7
       - Guru Piket: 7-8
       - Administrator: 8 (zero-scroll)
       - Kepala Sekolah: 7
       - Pengawas Dinas: 1 (overview) or 2 (satellite inspection)
       - Superadmin: 3 platform + 5 satellite
     - Ensure `data-tour={(item as any).dataTour || item.id}` is rendered.
   - CRITICAL ARCHITECTURAL INVARIANTS:
     Strictly retain ALL literal AST guard lines tested by existing suites:
     - `{/* AST preservation: data-tour={item.id} */}`
     - `...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])` (or comments/arrays matching `tests/adversarial_rapor_wali_security.test.ts` line 219)
     - `if (targetId === 'view-rapor')`
     - `!isAdmin && !isSuperadmin && !isWaliKelas`
     - `{currentView === 'view-rapor' && (`
     - `isAdmin || isSuperadmin || isWaliKelas ? (`
     - `<RaporView user={user} assignedKelas={assignedKelas} />`
     - `Halaman <strong>Rapor</strong> secara eksklusif hanya dapat diakses oleh Administrator`
     - `targetId === 'view-sistem-blok'`
     - `{currentView === 'view-sistem-blok' && (`
     - `isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}`
     - `{currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />}`
     - `initialTab={(urlTab as any) || 'live'}`
     - `initialTab={(urlTab as any) || 'input'}`
     - `menuItemsKepalaSekolah` containing the items required by `tests/kepsek_pengawas_rbac.test.ts`

2. Tour & Onboarding:
   - Ensure `OnboardingTutorial.tsx` has word-matching selector:
     `const selector = '[data-tour~="' + currentStep.targetTourId + '"], [data-tour="' + currentStep.targetTourId + '"]';`
   - Ensure `ClaySidebar.tsx` has `{/* AST preservation: data-tour={item.id} */}` and `data-tour={item.dataTour || item.id}`.

3. Verification:
   Run all verification commands:
   - `npx tsc --noEmit`
   - `npx tsx tests/navigation_consolidation_verification.test.ts`
   - `npx tsx tests/adversarial_ast_invariants_challenger.test.ts`
   - `npx tsx tests/adversarial_m2_regression_and_ast_challenger_2.test.ts`
   - `npm test`

4. Git Workflow Rule (GEMINI.md):
   After all verification tests pass, automatically stage, commit, and push to main:
   `git add .`
   `git commit -m "feat: complete Milestone 3 navigation restructuring, aliasing, and tour compatibility"`
   `git push origin main`

5. Write handoff report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_gen1\handoff.md` and send message to parent orchestrator.
