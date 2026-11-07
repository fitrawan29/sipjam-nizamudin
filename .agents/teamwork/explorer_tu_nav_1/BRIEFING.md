# BRIEFING — 2026-11-07T21:57:00Z

## Mission
Survey and investigate R1 (Penyesuaian Menu Navigasi Role TU) in sipjam-app with ponytail minimal-code philosophy.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_tu_nav_1
- Original parent: de917fec-7436-4fa2-9853-bd1bea951980
- Milestone: R1 - Penyesuaian Menu Navigasi Role TU

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Investigate R1 strictly adhering to ponytail principles (simplest, shortest, minimal changes)
- Write output to handoff.md and report to parent de917fec-7436-4fa2-9853-bd1bea951980

## Current Parent
- Conversation ID: de917fec-7436-4fa2-9853-bd1bea951980
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/lib/navigation.ts` (getConsolidatedMenuItems, evaluateTabRBAC, VIEW_ALIASES, resolveCanonicalRoute)
  - `src/components/AppScreen.tsx` (sidebar overlay, view router, handleNavigation, guards)
  - `src/components/ClaySidebar.tsx` (presentation, quick actions, role styling)
  - `src/components/GuruPresensi.tsx` (presensi workflow and staff compatibility)
  - `src/components/GuruJurnal.tsx` (Jurnal Kegiatan mode support)
  - `src/components/GradebookView.tsx` & `src/components/RaporView.tsx` (Asesmen & Rapor routing and guards)
  - `tests/tata_usaha_role_rbac_and_isolation.test.ts` & other test suites
- **Key findings**:
  - Current role TU menu has only 2 items (`view-data-siswa`, `view-data-guru`) from M1.
  - Requirement R1 mandates strictly and only 6 menus: Presensi TU, Jurnal Kegiatan, Asesmen (read-only), Rapor (read-only), Informasi Sekolah, Pengaturan Akun.
  - Presensi TU can directly reuse `GuruPresensi` (`view-guru-presensi`), which logs into `presensi_guru`.
  - Jurnal Kegiatan is natively supported in `GuruJurnal` (`view-guru-jurnal`), requiring only title/type default.
  - Asesmen & Rapor use `view-gradebook` and `view-rapor`, and must be unblocked for TU in `evaluateTabRBAC` and `AppScreen.tsx`.
  - Master Data (`view-admin-data`) must be strictly blocked for role TU.
  - Sidebar quick actions (Tutorial & Tour) must be hidden for TU so only the 6 menus appear.
- **Unexplored areas**: None for R1; downstream implementation and R2/R3/R4 integration left for builders.

## Key Decisions Made
- Formulated minimal /ponytail modification plan in `handoff.md` requiring zero new component files.

## Artifact Index
- `handoff.md` — Final investigation and synthesis handoff report
- `progress.md` — Liveness heartbeat and progress tracker
- `DISPATCH.md` — Record of dispatch instructions
