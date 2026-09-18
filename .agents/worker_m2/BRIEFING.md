# BRIEFING — 2026-09-18T08:25:02Z

## Mission
Implement Academic Year sync, Admin view-only gradebook, Guru Pengampu TP restriction, and Jurnal Kelas RBAC for Milestone 2 (R1 & R3).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m2
- Original parent: a21d5b87-ff2e-4b29-acfe-6e2543e24911
- Milestone: Milestone 2 (R1 & R3: Academic Year, Gradebook & Jurnal Kelas RBAC)

## 🔒 Key Constraints
- Sync Academic Year in `GradebookView.tsx` with `pengaturan.tahun_ajaran` for guru accounts.
- Lock Admin Gradebook to view-only mode (hide edit/save/export buttons, replace grade inputs with read-only score text spans, show only 'Cetak').
- Restrict Tujuan Pembelajaran (TP) management to Guru Pengampu in `GradebookView.tsx`.
- Implement Jurnal Kelas RBAC in `AppScreen.tsx` and `RekapJurnalView.tsx`: accessible exclusively to Admin (all classes) and assigned Wali Kelas (their assigned class only); hidden and blocked for regular teachers.
- Verify with `npx tsc --noEmit`.
- No dummy/facade implementations or hardcoding.
- Git Workflow Rule: `git status`, `git add .`, `git commit -m "feat(gradebook-jurnal): implement academic year sync, admin view-only gradebook, and jurnal kelas rbac"`, `git push origin main`.

## Current Parent
- Conversation ID: a21d5b87-ff2e-4b29-acfe-6e2543e24911
- Updated: 2026-09-18T08:25:02Z

## Task Summary
- **What to build**:
  1. Academic Year sync in `src/components/GradebookView.tsx`: Fetch `tahun_ajaran` & `semester` from `pengaturan` (or settings query) on mount; for guru accounts, automatically sync `selectedTahunAjaran` and `tpForm.tahun_ajaran` and lock/reflect it.
  2. Admin Gradebook lock in `src/components/GradebookView.tsx`: When `user.role === 'admin'`, hide save/edit/export buttons, replace grade inputs with `<span className="font-semibold text-gray-900 dark:text-white">{sGrades[col.id] ?? '-'}</span>`, show ONLY "Cetak" button, guard mutation handlers.
  3. Restrict TP management in `src/components/GradebookView.tsx`: Check if `user.nama` or `user.id` matches assigned teacher for the selected subject and class (`isGuruPengampu`). Only allow create/edit/delete TP if `!isAdmin && isGuruPengampu`.
  4. Jurnal Kelas RBAC in `src/components/AppScreen.tsx` & `src/components/RekapJurnalView.tsx`: Define view `view-jurnal-kelas`. Admin sees it (all classes). For guru, query `wali_kelas` for the teacher: if Wali Kelas, show menu and restrict class selection to their assigned class; if regular teacher, hide from menu and block route with alert. Hide "Rekapan Jurnal Per Kelas" tab in RekapJurnalView for regular teachers.
- **Success criteria**: Strict adherence to specifications, 0 TypeScript errors on `npx tsc --noEmit`, automatic Git commit and push, comprehensive handoff report.

## Change Tracker
- **Files modified**:
  - `src/components/GradebookView.tsx`: [Pending]
  - `src/components/AppScreen.tsx`: [Pending]
  - `src/components/RekapJurnalView.tsx`: [Pending]
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending verification
- **Lint status**: Pending
- **Tests added/modified**: Pending

## Loaded Skills
- None

## Artifact Index
- `.agents/worker_m2/DISPATCH.md` — Assignment and instructions
- `.agents/worker_m2/BRIEFING.md` — Agent state and situational awareness
- `.agents/worker_m2/progress.md` — Liveness and progress heartbeat
- `.agents/worker_m2/handoff.md` — Final handoff report
