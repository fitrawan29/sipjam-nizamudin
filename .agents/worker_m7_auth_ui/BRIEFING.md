# BRIEFING — 2026-09-12T10:05:00Z

## Mission
Implement Superadmin hierarchy, platform management views, deep link, and tenant scoping in UI (M7.2 & M7.3).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_auth_ui
- Original parent: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Milestone: Milestone 7 (M7.2 & M7.3)

## 🔒 Key Constraints
- Exclusive write ownership:
  - `src/components/SuperadminView.tsx` (new)
  - `src/app/superadmin/page.tsx` (new)
  - `src/components/AppScreen.tsx`
  - `src/components/LoginScreen.tsx`
  - `src/components/AdminConfigView.tsx`
  - `src/components/AdminDataView.tsx`
  - `src/components/AdminBackupView.tsx`
  - `src/components/PrintHeader.tsx`
- Prohibited from modifying: `RekapJurnalView.tsx`, `RekapSiswaView.tsx`, `AdminRekapView.tsx`, `PiketView.tsx`
- Mandatory Git workflow: git status, git add ., git commit -m "...", git push origin main
- Pass `npx tsc --noEmit` and `npm run build`

## Current Parent
- Conversation ID: bedfb7f0-1cec-4949-8c24-27709173b6ec
- Updated: 2026-09-12T10:05:00Z

## Task Summary
- **What to build**: SuperadminView component (Overview, School Management, Admin Accounts), /superadmin route, AppScreen role differentiation & dynamic header/school branding, LoginScreen tenant awareness, tenant scoping in AdminConfigView, AdminDataView, AdminBackupView, PrintHeader.
- **Success criteria**: Genuine implementation, no facade, clean TypeScript compilation, Next.js build passes, changes committed and pushed.

## Key Decisions Made
- [TBD]

## Artifact Index
- `.agents/worker_m7_auth_ui/DISPATCH.md` — Assignment instructions
- `.agents/worker_m7_auth_ui/progress.md` — Liveness & task progress
- `.agents/worker_m7_auth_ui/handoff.md` — Final handoff report
