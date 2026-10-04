# Dispatch Instructions for Explorer 1 (explorer_nav_r1)

## Objective
Thoroughly explore the `sipjam-app` codebase to map the complete application flow, routing, and menu hierarchy across all roles.

## Context & Inputs
- Authoritative user request: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read this first!)
- Key areas to investigate:
  - Next.js routing structure (e.g. `src/app` or `pages` directory, route handlers, middleware)
  - Authentication flow & session management (`src/components/LoginModal.tsx`, `src/lib/supabaseClient.ts`, auth state, role checks)
  - Core navigation shell (`src/components/AppScreen.tsx` - inspect sidebar menus, headers, role-based tabs)
  - Role views & conditions:
    - `superadmin`: management panels, school switches, configuration
    - `admin`: dashboard, verification (`AdminVerifView`), block system, master data (`AdminDataView`), analytics, config
    - `guru`: dashboard, attendance (`GuruPresensi`), teaching journal (`GuruJurnal`), substitute ("Guru Inval"), lesson plans, grades, history, recap
    - `piket`: daily duty checking, QR code scanner (camera & USB HID), manual attendance mode, reporting
    - `wali_kelas`: student attendance recap locked to assigned class (`RekapSiswaView`)
  - Modal dialogs, overlay tutorials (`OnboardingModal`), AI assistant floating widget (`AIAssistant`)
  - Navigation triggers and state transitions (how views are switched, URL vs state-driven navigation)

## Deliverables & Output
Write a comprehensive report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_nav_r1\report.md`
and write your handoff in:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_nav_r1\handoff.md`

Your report MUST include:
1. Complete list of routes, views, tabs, and modals.
2. Exact menu hierarchy for each role (Superadmin, Admin, Guru, Piket, Wali Kelas).
3. Access conditions & conditional visibility rules (e.g., piket duty check, wali kelas restriction).
4. Proposed syntax and structure for a Mermaid flowchart representing the complete application flow.

When finished, send a message to orchestrator with your report location.


## 2026-10-04T13:53:50Z
You are Explorer 1 (explorer_nav_r1).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_nav_r1
Read your dispatch instructions at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_nav_r1\DISPATCH.md
Read the authoritative user request first at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-04T13:50:06Z).

Your mission is to map the complete application flow, routing, and menu hierarchy across all user roles (Superadmin, Admin, Guru, Piket, Wali Kelas).
Investigate:
1. Routing structure in Next.js (App router / Pages router / conditional SPA views in src/components/AppScreen.tsx).
2. Authentication flow & role-based routing gates (LoginModal.tsx, auth state in AppScreen.tsx, role checks).
3. Exact menu hierarchy for each role:
   - Superadmin (e.g. school management, system settings)
   - Admin (e.g. dashboard, verification AdminVerifView, master data AdminDataView, block system, analytics, system config)
   - Guru (e.g. dashboard, presensi GuruPresensi, jurnal GuruJurnal, teacher substitute / inval, lesson plans, grades, history, recap RekapJurnalView)
   - Piket (duty schedule check, QR code scanner camera & USB HID, manual attendance mode, reporting)
   - Wali Kelas (student attendance recap restricted to assigned class)
4. Modals, dialogs, and floating widgets (AIAssistant, onboarding tutorials, account settings).
5. State transitions and navigation triggers.

Write your findings to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_nav_r1\report.md
Write your handoff to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_nav_r1\handoff.md
Include a draft of a syntactically valid Mermaid flowchart covering the complete app flow.
When finished, send a message to orchestrator (962492f1-3042-46e5-9074-fc7b66436c10).
