## 2026-10-29T13:20:00Z
You are the Navigation & Onboarding Restructuring Worker for Milestone 3.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_cur\
Before starting work, YOU MUST read ORIGINAL_REQUEST.md located at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Study the architectural blueprints and survey findings:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nav\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_sidebar\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_onboarding\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\TEST_READY.md

Your exclusive write ownership covers the following files:
1. `src/lib/navigation.ts` (CREATE NEW):
   - Implement `MenuItem`, `RouteResolution` interfaces.
   - Implement `VIEW_ALIASES` mapping all 8 legacy views:
     - `'view-guru-rekap-jurnal': { view: 'view-guru-jurnal', tab: 'rekap-pribadi' }`
     - `'view-jurnal-kelas': { view: 'view-guru-jurnal', tab: 'supervisi-kelas' }`
     - `'view-history': { view: 'view-guru-presensi', tab: 'riwayat' }`
     - `'view-rapor': { view: 'view-gradebook', tab: 'rapor' }`
     - `'view-analitik': { view: 'view-admin-rekap', tab: 'analitik' }`
     - `'view-rekap-guru': { view: 'view-admin-rekap', tab: 'tabel' }`
     - `'view-sistem-blok': { view: 'view-admin-data', tab: 'blok' }` (MUST be `tab: 'blok'` per test assertions T1.5.5 and T3.4)
     - `'view-admin-backup': { view: 'view-admin-config', tab: 'backup' }`
   - Implement `resolveCanonicalRoute(rawView, rawTab)` and alias `resolveRoute`.
   - Implement `getConsolidatedMenuItems(params)`.
   - Implement `evaluateTabRBAC(viewId, tabId, user)`.

2. `src/components/ClaySidebar.tsx`:
   - Extend `MenuItem` with `badge?: string | number`, `badgeVariant?: 'mint' | 'amber' | 'rose' | 'blue'`, `dataTour?: string`.
   - Render `data-tour={item.dataTour || item.id}` with AST preservation comment:
     `{/* AST preservation: data-tour={item.id} */}`
   - Ensure touch targets >= 44px (`py-2.5`) and zero-scroll geometry.

3. `src/components/AppScreen.tsx`:
   - Import `resolveCanonicalRoute` from `@/lib/navigation`.
   - Implement 3-lifecycle routing:
     (1) Cold-start state initialization with `replaceState` URL normalization.
     (2) `popstate` event listener for browser history (back/forward).
     (3) Imperative `handleNavigation(targetId, targetTab?)` with RBAC & workflow checks.
   - Configure consolidated menu arrays for all 7 roles to meet exact target counts:
     - Guru Reguler: 6 menus
     - Wali Kelas: 7 menus
     - Guru Piket: 7-8 menus
     - Administrator: 8 menus (zero-scroll)
     - Kepala Sekolah: 7 menus
     - Pengawas Dinas: 2 menus
     - Superadmin: 3 platform + 5 satellite
   - CRITICAL: Retain all verbatim AST string invariants expected by existing test suites:
     - `{currentView === 'view-rapor' && (`
     - `{currentView === 'view-sistem-blok' && (`
     - `targetId === 'view-sistem-blok'`
     - `isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}`
     - `...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])`
     - `...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : [])`
     - `...(isWaliKelas ? [{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }] : [])`
     - `...(isPiketHariIni ? [{ id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' }] : [])`
     - `{ id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' }`
     - `{ id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Presensi' }`
     - `{ id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik' }`
     - `{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }`
     - `{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }`
     - `data-tour={item.id}`
     - `data-tour="hamburger-btn"`
     - Dynamic imports for all 18 views intact.

4. `src/components/Onboarding/OnboardingTutorial.tsx`:
   - Upgrade line 56 to word-matching selector:
     `const selector = '[data-tour~="' + currentStep.targetTourId + '"], [data-tour="' + currentStep.targetTourId + '"]';`

Verification Requirements:
- Run `npx tsc --noEmit` -> 0 errors.
- Run `npx tsx tests/navigation_consolidation_verification.test.ts` -> 150/150 assertions must pass 100%.
- Run `npm test` -> all 41 test suites must pass 100% (zero regression).
- Run `npm run build` -> production build must succeed.
- Git commit and push to `origin main` per GEMINI.md.

Write your completion report to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_cur\handoff.md
Send message to orchestrator (`095792d8-1a85-4945-889d-abf25d3c7740`) upon completion.


## 2026-10-29T14:23:32Z
Read your assignment in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_cur\DISPATCH.md and implement Milestone 3 (navigation.ts, ClaySidebar.tsx, AppScreen.tsx, and OnboardingTutorial.tsx).
You MUST read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
DO NOT CHEAT. All implementations must be genuine.
Run static typing (tsc --noEmit), E2E test suite (npx tsx tests/navigation_consolidation_verification.test.ts), and npm test (all 41 suites).
Commit and push to origin main per GEMINI.md.
Write your completion report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_cur\handoff.md and notify me via send_message.
