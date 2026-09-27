# BRIEFING — 2026-09-28T05:50:30+08:00

## Mission
Thoroughly examine `src/components/AppScreen.tsx` for architectural survey: state management, role handling, sidebar & header JSX/classes, navigation item view keys for Guru and Admin, onboarding button placement, AI Assistant & OnboardingTutorial mounting points, and mobile responsiveness considerations.

## 🔒 My Identity
- Archetype: explorer
- Roles: Git History & Recent Updates Investigator, AppScreen Architecture Explorer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1
- Original parent: f963fff1-816c-4a40-9daa-b44715a5d909
- Milestone: explorer_survey_1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Files for content delivery, Messages for coordination
- Handoff report in handoff.md with 5-Component structure
- No direct source modifications (except teamwork working directory)
- Strictly analyze AppScreen.tsx and related layout/tour targets

## Current Parent
- Conversation ID: 3b364431-4af8-4ed9-9a8c-b79b77d58fbe
- Updated: 2026-09-28T05:50:30+08:00

## Investigation State
- **Explored paths**: `src/components/AppScreen.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`, `package.json`, `tests/`
- **Key findings**:
  1. Active view state is controlled by `currentView` initialized with URL query `?view=...`, defaults to `'view-home'` (or `'view-superadmin-overview'`).
  2. Role checks: `isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin'`. Superadmin is exempt from tutorials; Guru is `!isAdmin && !isSuperadmin`; Admin is `isAdmin && !isSuperadmin`.
  3. Header Hamburger button located at lines 489-491 (`btn-click w-9 h-9 ... <i className="fa-solid fa-bars"></i>`). Target with `data-tour="hamburger-btn"`.
  4. Sidebar navigation items mapped from `menuItemsGuru` and `menuItemsAdmin` (lines 554-566). Exact view keys:
     - Guru: Presensi Datang (`view-guru-presensi`), Jurnal Mengajar (`view-guru-jurnal`), Piket (`view-piket`).
     - Admin: Verifikasi (`view-admin-verif`), Sistem Blok (`view-sistem-blok`), Master Data (`view-admin-data`), Analitik (`view-analitik`), Sistem (`view-admin-config`).
     - Tag them dynamically with `data-tour={item.id}` in the `.map()`.
  5. Sidebar is conditionally rendered: `{sidebarOpen && ...}`. Tour controller must open sidebar (`setSidebarOpen(true)`) during sidebar steps and close it during outside steps.
  6. "Lihat Tutorial Lagi" button placed cleanly directly after "Pengaturan Akun" in the sidebar menu list (around line 574) and guarded by `!isSuperadmin`.
  7. `AIAssistant` (floating button bottom-right) and `OnboardingTutorial` mounted at the bottom of `AppScreen.tsx` (lines 843-844) adjacent to other modal overlays.
  8. Mobile responsiveness: Auto-scroll (`scrollIntoView`), dynamic viewport clamping for tooltips, responsive width (`inset-x-4 sm:w-96`) for chat window.
- **Unexplored areas**: None; all requested survey items thoroughly documented in handoff.md.

## Key Decisions Made
- Documented complete architectural blueprint with verbatim lines and code snippets in `handoff.md`.

## Artifact Index
- handoff.md — Complete 5-component handoff report
- progress.md — Heartbeat and progress tracking
- DISPATCH.md — Received dispatch records
