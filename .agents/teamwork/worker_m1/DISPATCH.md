## 2026-10-29T11:43:00Z
You are the Foundation and Sub-Tab Normalization Worker for Milestone 1.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\
Before starting work, YOU MUST read ORIGINAL_REQUEST.md located at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You must study the blueprints prepared by the Explorers:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_tabs\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_jurnal_presensi\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_dinas_rekap\handoff.md

Your exclusive write ownership covers the following files:
1. `src/components/ClayTabs.tsx` (NEW): Implement the reusable tactile Claymorphism sub-tabs component with WAI-ARIA 1.2 roving tabindex, keyboard navigation, badge variants, and touch scroll as specified in explorer_m1_tabs handoff.
2. `src/components/clay/index.ts`: Export ClayTabs, getNextTabId, and related types.
3. `src/components/GuruJurnal.tsx`: Add `initialTab` support ('input' | 'rekap-pribadi' | 'supervisi-kelas'), render ClayTabs, wrap 10-field input form and roll-call inside `<div className={activeTab === 'input' ? 'block' : 'hidden'}>` to guarantee in-memory draft preservation with zero unmounting. Mount RekapJurnalView for sub-tabs 2 and 3.
4. `src/components/RekapJurnalView.tsx`: Accept `controlledMode` and `hideTabSwitch` props without modifying existing filters, KOP printing, or Excel exports.
5. `src/components/GuruPresensi.tsx`: Add `initialTab` support ('live' | 'riwayat'), render ClayTabs, wrap live selfie/GPS form inside `<div className={activeTab === 'live' ? 'block' : 'hidden'}>` to prevent unmounting. Mount HistoryView for sub-tab 2.
6. `src/components/HistoryView.tsx`: Accept `onlyTab`, `hideTabSwitch`, `hideSectionWrapper` props without deleting or modifying any existing lines checked by AST test assertions.
7. `src/components/AdminRekapView.tsx`: Add `initialTab`, `targetSchool`, and activate `isReadOnly` logic as specified in explorer_m1_dinas_rekap handoff.
8. `src/components/AppScreen.tsx`: Update mounting props for GuruJurnal, GuruPresensi, and AdminRekapView, while strictly preserving all existing AST regex guards verbatim (e.g. `{currentView === 'view-guru-rekap-jurnal' && ...}`, `{currentView === 'view-history' && ...}`, `/currentView === 'view-admin-rekap'\s*&&\s*\(/`).
9. `tests/clay_tabs_verification.test.ts` (NEW): Create the automated test suite verifying ClayTabs rendering, ARIA attributes, and keyboard navigation.

Verification Requirements:
- Run `npx tsx tests/clay_tabs_verification.test.ts` -> must pass 100%.
- Run `npx tsc --noEmit` -> 0 TypeScript compilation errors.
- Run `npm test` -> all 41 test suites must pass 100% (zero regression).

Write your completion report to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\handoff.md
Update your progress in:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\progress.md
Send a completion message to the orchestrator (conversation ID: 095792d8-1a85-4945-889d-abf25d3c7740).
