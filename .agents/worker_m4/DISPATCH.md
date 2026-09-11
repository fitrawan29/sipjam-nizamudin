## 2026-09-11T07:39:53Z

You are worker_m4, working as an implementation worker for Milestone 4 (Admin Management & Analytics Views).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m4

MANDATORY FIRST STEP:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE BOUNDARY:
You exclusively own and may modify ONLY these files:
- src/components/AdminMonitorView.tsx
- src/components/AdminVerifView.tsx
- src/components/AdminRekapView.tsx
- src/components/AdminDataView.tsx
- src/components/AdminBackupView.tsx
- src/components/AdminConfigView.tsx
- src/components/AnalitikView.tsx

DO NOT modify any other files.
CRITICAL CONSTRAINT: You must accomplish all requirements STRICTLY by adjusting Tailwind CSS classes (`className` strings), WITHOUT altering React component logic, state hooks (`useState`, `useEffect`), handlers, or JSX control flow.

DETAILED TASKS:
1. src/components/AdminConfigView.tsx:
   - Line 112: 3-column time inputs (`jam_datang_mulai`, etc.): change `grid grid-cols-3 gap-3 mb-3` to `grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3`.
   - Line 157: GPS coordinates (`gps_lat`, `gps_lng`, `gps_radius`): change `grid grid-cols-3 gap-3` to `grid grid-cols-1 sm:grid-cols-3 gap-3`.
   - Lines 89, 104, 117: Change `grid grid-cols-2 gap-3` to `grid grid-cols-1 sm:grid-cols-2 gap-3`.
   - Standardize subhead icons: change `text-[10px]` to standard `text-xs` or `w-4 h-4` with optical comfort.
   - Enforce `text-gray-900 dark:text-white` on all form labels, inputs, and section headers.
2. src/components/AdminDataView.tsx:
   - Lines 230-243: Search input + refresh button + "+ Baru" button: change to `flex flex-wrap sm:flex-nowrap gap-2` so input is not squeezed on small mobile viewports (<360px).
   - Line 268: Pagination counter `<span className="text-[10px] text-gray-400 font-medium">`: add `dark:text-white/80`.
   - Enforce `text-gray-900 dark:text-white` on cards, table headers, table cells, and modal form inputs.
3. src/components/AdminMonitorView.tsx:
   - Enforce `text-gray-900 dark:text-white` on attendance cards, feed titles, and search bar.
4. src/components/AdminVerifView.tsx:
   - Line 153: Card titles: update to `dark:text-white`.
   - Line 191: Pagination counter: add `dark:text-white/80`.
   - Enforce `text-gray-900 dark:text-white` across verification request details and modal dialogs.
5. src/components/AdminRekapView.tsx:
   - Enforce `text-gray-900 dark:text-white` on monthly/daily report filters, table cells, and export buttons.
6. src/components/AdminBackupView.tsx:
   - Line 189: Backup card title: update to `dark:text-white`.
   - Line 192: Backup timestamp `<div className="text-[9px] text-gray-400 text-right">`: add `dark:text-white/70`.
   - Enforce `text-gray-900 dark:text-white` on backup history list and status indicators.
7. src/components/AnalitikView.tsx:
   - Line 106: Statistics cards: change `grid grid-cols-2 gap-4 mb-5` to `grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5`.
   - Lines 149, 170: Card titles and metrics: update to `dark:text-white`.

VERIFICATION:
Run `npm run build` via command execution to confirm zero compilation or TypeScript errors.
Document the build output in your handoff report at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m4\handoff.md
When done, update progress.md and send a message back to the orchestrator.
