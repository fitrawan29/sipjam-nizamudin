# BRIEFING — 2026-10-04T14:02:00Z

## Mission
Map complete application flow, routing, and menu hierarchy across all user roles in sipjam-app.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_nav_r1
- Original parent: 962492f1-3042-46e5-9074-fc7b66436c10
- Milestone: App flow, routing, menu hierarchy mapping

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write metadata only to working directory (report.md, handoff.md, progress.md, BRIEFING.md)
- Adhere strictly to verified facts and exact line numbers

## Current Parent
- Conversation ID: 962492f1-3042-46e5-9074-fc7b66436c10
- Updated: 2026-10-04T14:02:00Z

## Investigation State
- **Explored paths**:
  - `src/app/page.tsx`, `src/app/superadmin/page.tsx`, `src/app/layout.tsx`, `src/app/api/...`
  - `src/components/AppScreen.tsx`, `LoginScreen.tsx`, `PreLoginSplash.tsx`
  - `HomeView.tsx`, `GuruPresensi.tsx`, `GuruJurnal.tsx`, `PiketView.tsx`
  - `RekapSiswaView.tsx`, `RekapJurnalView.tsx`, `SuperadminView.tsx`
  - `AdminVerifView.tsx`, `AdminDataView.tsx`, `SistemBlokView.tsx`
  - `AnalitikView.tsx`, `DokumenView.tsx`, `GradebookView.tsx`, `AdminConfigView.tsx`, `AdminBackupView.tsx`, `InformasiView.tsx`, `HistoryView.tsx`
  - Modals & Services: `AIAssistant`, `OnboardingTutorial`, `AccountSettingsModal`, `TeacherReminderManager`, `NotificationPermissionModal`, `PushNotificationPrompt`, `PWAInstallPrompt`, `NaikKelasModal`
  - `src/lib/workflow.ts`, `src/lib/qrSiswa.ts`, `src/types/database.ts`
- **Key findings**:
  - Routing is SPA state-driven orchestrated by `AppScreen.tsx` synchronized via URL query parameter `?view=...` with `pushState` and `popstate`.
  - Roles: `Superadmin` (multi-tenant master), `Admin` (school operational master), `Guru` (teaching, attendance, gradebook).
  - Dynamic capability roles: `Piket` (dynamically injected into Guru/Admin menu when assigned duty on the day) and `Wali Kelas` (dynamically injected when assigned homeroom, with strict class locking).
  - Access control operates at 3 tiers: Navigation guard in `handleNavigation`, fallback UI guard rendering "Akses Terblokir" in `AppScreen`, and component-level data filter query constraints.
  - Complete syntactically valid Mermaid flowchart and 4 actionable improvement suggestions generated.
- **Unexplored areas**: None, task complete.

## Key Decisions Made
- Fully documented findings in report.md and handoff.md.

## Artifact Index
- report.md — comprehensive app flow, menu hierarchy, and routing analysis
- handoff.md — 5-component handoff report
- progress.md — task heartbeat log
