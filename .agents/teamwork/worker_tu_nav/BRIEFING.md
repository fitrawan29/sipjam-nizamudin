# BRIEFING — 2026-11-07T22:25:00Z

## Mission
Implement Milestone 2: Penyesuaian Role Tata Usaha (TU), Hak Akses Read-Only Asesmen & Rapor, Pemisahan Rekap Admin, dan Pengelolaan Akun TU using /ponytail (simplest, shortest diff, 0 extra abstractions, zero regressions).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist (/ponytail)
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_tu_nav
- Original parent: de917fec-7436-4fa2-9853-bd1bea951980
- Milestone: M2 - Penyesuaian Role TU & Admin Rekap (/ponytail)

## 🔒 Key Constraints
- Philosophy: /ponytail (simplest, most minimal, direct, zero extra abstractions, zero new dependencies).
- Strictly preserve AST comments verbatim: `{/* AST preservation: data-tour={item.id} */}`.
- Do not cheat: genuine logic, real states, real behavior.
- Git workflow rule: check status, stage all, commit descriptive message, push directly to `origin main`.

## Current Parent
- Conversation ID: de917fec-7436-4fa2-9853-bd1bea951980
- Updated: 2026-11-07T22:25:00Z

## Task Summary
- **What to build**:
  1. R1: TU menu limited to exactly 6 items: Presensi TU, Jurnal Kegiatan, Asesmen, Rapor, Informasi Sekolah, Pengaturan Akun. Strict RBAC denial for unlisted views. Default landing view = `view-guru-presensi`.
  2. R2: TU read-only access for Asesmen and Rapor. PostgREST mutation interceptor blocks assessment mutations for TU with 403 / 42501.
  3. R3: Admin Presensi Recap separated into Guru & TU tables in UI and print with CSS page break.
  4. R4: Admin can appoint TU from existing teachers and create new TU with 4 mandatory fields. `teacherUserSync.ts` preserves TU role.
  5. R5 & R6: Automated verification with `npx tsc --noEmit` and `npm test`. Direct push to `main`.
- **Success criteria**: All tests pass 100%, TypeScript passes, git pushed to main.
- **Interface contracts**: PROJECT.md § Interface Contracts
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- Reused existing teacher query pipeline in `GradebookView` with `canSelectAllTeachers = isAdmin || isTataUsaha`.
- Reused existing class selector in `RaporView` with `{isAdmin || isSuperadmin ? (...) : isTataUsaha ? (...) : (...)}`.
- Reused native `no_hp` and `email` columns in `data_guru` without modifying schema.
- Added graceful fallback in `teacherUserSync.ts` for mock clients without `.in()`.

## Loaded Skills
- **Source**: C:\Users\Fitra\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md
- **Local copy**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_tu_nav\ponytail_skill.md
- **Core methodology**: Simplest, shortest diff, standard library / native features first, 0 extra abstractions.

## Change Tracker
- **Files modified**:
  - `src/lib/navigation.ts`: 6 menu items for TU, aliases, RBAC rules.
  - `src/components/AppScreen.tsx`: TU landing view, account modal navigation, button suppression, AST preservation.
  - `src/components/ClaySidebar.tsx`: Pengaturan Akun modal trigger, button suppression, AST preservation.
  - `src/components/GradebookView.tsx`: Read-only review mode, teacher selector, bobot/save button hiding.
  - `src/components/RaporView.tsx`: Class selector, save button hiding, non-editable text rendering, signature fallback.
  - `src/lib/supabaseClient.ts`: PostgREST mutation interceptor returning 403 / 42501 on assessment endpoints for TU.
  - `src/components/AdminRekapView.tsx`: Presensi separation into Guru & TU, UI tables, print page-break, CSV export.
  - `src/components/AdminPenggunaView.tsx`: Tunjuk TU / Ke Guru toggle, + Akun TU modal with 4 required fields.
  - `src/lib/teacherUserSync.ts`: Resilient query including TU role, role preservation during auto-sync.
  - `tests/tata_usaha_role_rbac_and_isolation.test.ts`: Updated for 6 menu items and M2 RBAC rules.
  - `tests/tu_refinements_and_admin_rekap.test.ts`: Comprehensive new automated test suite.
  - `package.json`: Added test suite to test script.
- **Build status**: Pass (tsc and npm test all green)
- **Pending issues**: None

## Quality Status
- **Build/test result**: All passing (87/87 on RBAC suite, 81/81 on M2 suite, all suites passing in npm test)
- **Lint status**: Clean
- **Tests added/modified**: `tests/tata_usaha_role_rbac_and_isolation.test.ts` (updated), `tests/tu_refinements_and_admin_rekap.test.ts` (created)
