# BRIEFING — 2026-11-07T17:18:45Z

## Mission
Investigate navigation, sidebar, views, and layout routing for adding the 'tata_usaha' role to SIPJAM.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_tu_2\
- Original parent: 08027b32-4cf8-48ae-a2fb-29465f707e8c
- Milestone: TU Role Navigation and Views Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Ponytail approach: simplest, cleanest, most concise reuse of existing structures without over-engineering
- Scoped to navigation, sidebar, view routing, Data Siswa/Guru views, dashboard/home view

## Current Parent
- Conversation ID: 08027b32-4cf8-48ae-a2fb-29465f707e8c
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/lib/navigation.ts` (route resolution, aliases, role menu generator, evaluateTabRBAC)
  - `src/components/AppScreen.tsx` (sidebar drawer, role flags, handleNavigation, view rendering, onboarding trigger)
  - `src/components/ClaySidebar.tsx` (claymorphic sidebar, badge styling, role label, role icon)
  - `src/components/AdminDataView.tsx` (tabs definition, tab normalization, CRUD modals, CSV import/export, student QR, naik kelas modal)
  - `src/components/HomeView.tsx`, `HomeViewGuru.tsx`, `HomeViewAdmin.tsx` (role landing views)
  - `src/types/user.ts` (UserRole type contract)
  - `src/components/TeacherReminderManager.tsx`, `src/components/NaikKelasModal.tsx`
- **Key findings**:
  - `AdminDataView` already supports all Data Siswa & Data Guru features; can be reused directly by filtering `tabs` array when `normRole === 'tatausaha'`.
  - Sidebar for Tata Usaha requires exactly two items: `view-data-siswa` and `view-data-guru` (mapped via `VIEW_ALIASES` to `view-admin-data` with `Data_Siswa` / `Data_Guru`).
  - Landing directly on `view-admin-data` (default tab `Data_Siswa`) mirrors Superadmin/Dinas/Siswa patterns, eliminating redundant home views (/ponytail).
  - RBAC in `evaluateTabRBAC` and `handleNavigation` must strictly deny `view-dokumen`, `view-admin-config`, `view-admin-backup`, `view-superadmin-*`, and non-permitted tabs.
  - AST preservation comment `{/* AST preservation: data-tour={item.id} */}` must remain intact in `AppScreen.tsx` and `ClaySidebar.tsx`.
- **Unexplored areas**: None within the assigned scope.

## Key Decisions Made
- Recommending direct reuse of `AdminDataView` with filtered tabs rather than creating duplicate view components.
- Recommending landing on `view-admin-data` (tab `Data_Siswa`) as default home view for `tata_usaha`.
- Completed comprehensive 5-component handoff report.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- progress.md — Liveness heartbeat and checklist
- BRIEFING.md — Persistent context & memory
- handoff.md — Comprehensive 5-component handoff report
