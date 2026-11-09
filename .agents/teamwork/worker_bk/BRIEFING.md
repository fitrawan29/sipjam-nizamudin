# BRIEFING — 2026-11-09T05:42:00Z

## Mission
Implement Milestone 1: Role BK (Bimbingan Konseling) and independent classless counseling journal (`jurnal_bk`) into SIPJAM for production needs, with strict access control, zero regression, and ponytail philosophy.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_bk
- Original parent: 964210f9-504e-473a-a8e2-8633726ad7c7
- Milestone: Milestone 1: Role BK & Independent Classless Counseling Journal

## 🔒 Key Constraints
- Ponytail philosophy: simplest effective solution, zero new dependencies, reuse existing components (PrintHeader, SweetAlert2, Lucide icons, Supabase client).
- Absolute integrity: no hardcoded test results, genuine implementations only.
- Strict non-regression: DO NOT touch `src/components/GuruJurnal.tsx` or `src/lib/workflow.ts`. Do not break classroom teaching journals, schedules, attendance, or piket.
- Exclusive file ownership: edit only assigned files (`src/types/user.ts`, `src/types/database.ts`, `src/lib/navigation.ts`, `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`, `src/components/BkJurnalView.tsx`, `src/components/AdminPenggunaView.tsx`, `src/lib/teacherUserSync.ts`, `supabase/migrations/20261109_create_jurnal_bk.sql`, `tests/bk_role_and_jurnal_rbac_verification.test.ts`).
- AST Preservation Invariant: Verbatim preservation of `{/* AST preservation: data-tour={item.id} */}` in AppScreen.tsx and ClaySidebar.tsx.
- Strictly 5 menu items for BK in navigation: `view-home`, `view-guru-presensi`, `view-jurnal-bk`, `view-informasi`, `view-pengaturan-akun`.
- RBAC gate: `view-jurnal-bk` only accessible by `bk`, `admin`, `kepala_sekolah`. Deny regular `guru`, `wali_kelas`, `piket`, `tata_usaha`, `siswa`, `dinas_pendidikan`.
- Deny `bk` from accessing `view-guru-jurnal`, `view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-admin-verif`, `view-superadmin-*`, `view-dinas-*`.
- Git delivery: `git status`, `git add .`, `git commit -m "feat(bk): implement role BK and independent classless counseling journal"`, `git push origin main`.

## Current Parent
- Conversation ID: 964210f9-504e-473a-a8e2-8633726ad7c7
- Updated: 2026-11-09T05:42:00Z

## Task Summary
- **What to build**: Full BK role support, navigation isolation, classless Jurnal BK component with offline/cache resilience, universal student selector, Admin BK account management & toggle, Kepsek read-only monitoring, migration script, and comprehensive verification test suite.
- **Success criteria**: All tests pass (`npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts` and existing TU/RBAC test suites), TypeScript passes (`npx tsc --noEmit`), build passes (`npm run build`), committed and pushed to `main`.
- **Interface contracts**: PROJECT.md and survey handoffs (explorer_bk_1, explorer_bk_2, explorer_bk_3).
- **Code layout**: Next.js App / src directory conventions.

## Key Decisions Made
- Ponytail philosophy followed throughout: 0 new external libraries added, native components and Supabase client reused.
- Independent table `jurnal_bk` created to cleanly decouple counseling from KBM teaching journals, protecting `canTeacherPresensiPulang` and classroom attendance from regressions.
- Multi-tier resilience: PostgREST cache fallback via `sipjam_jurnal_bk_cache_${sekolahId}` and form draft auto-save via `sipjam_jurnal_bk_draft_${userId}`.
- RBAC dual-layer defense: navigation redirection in `handleNavigation` and UI-level hard gate in `AppScreen.tsx`.

## Artifact Index
- `.agents/teamwork/worker_bk/DISPATCH.md` — Assigned task instructions
- `.agents/teamwork/worker_bk/BRIEFING.md` — Agent working memory
- `.agents/teamwork/worker_bk/progress.md` — Liveness & progress tracker
- `.agents/teamwork/worker_bk/handoff.md` — Completion handoff report
- `supabase/migrations/20261109_create_jurnal_bk.sql` — PostgreSQL migration
- `src/components/BkJurnalView.tsx` — Independent counseling journal view
- `tests/bk_role_and_jurnal_rbac_verification.test.ts` — Comprehensive test suite

## Change Tracker
- **Files modified**:
  - `src/types/user.ts`: Added `'bk' | 'guru_bk'` to UserRole
  - `src/types/database.ts`: Added `"bk" | "guru_bk" | "Guru BK" | "BK"` to RoleUser
  - `src/lib/navigation.ts`: Added 5 BK menus, RBAC gate, and BK access isolation
  - `src/lib/teacherUserSync.ts`: Included BK role in sync and query filter
  - `src/components/AdminPenggunaView.tsx`: Added BK assignment toggle and creation modal
  - `src/components/AppScreen.tsx`: Wired view-jurnal-bk, route defense, preserved AST comments
  - `src/components/ClaySidebar.tsx`: Added BK role badge, preserved AST comments
  - `src/components/BkJurnalView.tsx`: New component with full classless counseling CRUD & print
  - `supabase/migrations/20261109_create_jurnal_bk.sql`: Migration script
  - `tests/bk_role_and_jurnal_rbac_verification.test.ts`: Verification suite with 106 tests
- **Build status**: PASS (`npx tsc --noEmit` code 0, `npm run build` code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: All 106 BK verification tests passed, 87 TU isolation tests passed, 167 challenger tests passed.
- **Lint status**: 0 TypeScript compilation errors.
- **Tests added/modified**: `tests/bk_role_and_jurnal_rbac_verification.test.ts` (106 test cases)

## Loaded Skills
- **Source**: C:\Users\Fitra\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md
- **Local copy**: Loaded in context
- **Core methodology**: Simplest solution that actually works, zero bloat, native platform/existing component reuse.
