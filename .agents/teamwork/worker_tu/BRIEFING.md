# BRIEFING — 2026-11-08T01:43:00Z

## Mission
Implement role Tata Usaha ('tata_usaha') and operational scope for SIPJAM with /ponytail minimal diff, zero bloat, and 100% component reuse.

## 🔒 My Identity
- Archetype: worker_tu
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_tu\
- Original parent: 08027b32-4cf8-48ae-a2fb-29465f707e8c
- Milestone: M1

## 🔒 Key Constraints
- Preserve AST comment verbatim in AppScreen.tsx and ClaySidebar.tsx: `{/* AST preservation: data-tour={item.id} */}`
- `isAdminRole('tata_usaha')` must remain strictly `false`.
- Do not create new page views or duplicate data views — reuse `AdminDataView.tsx`.
- Role Tata Usaha must have ZERO access to Bank Dokumen / Persuratan (`view-dokumen`), system config (`view-admin-config`, `view-admin-backup`, `view-sistem-blok`), and Superadmin views (`view-superadmin-*`).
- All existing roles (`superadmin`, `admin`, `guru`, `dinas_pendidikan`, `siswa`, `kepalasekolah`) must remain 100% operative with zero regression.

## Current Parent
- Conversation ID: 08027b32-4cf8-48ae-a2fb-29465f707e8c
- Updated: 2026-11-08T01:43:00Z

## Task Summary
- **What to build**: Add role `tata_usaha`, sidebar navigation (exactly 2 items: Data Siswa & Data Guru), RBAC routing guards, PostgREST mutation security in `checkMasterDataMutationGuard`, filter `AdminDataView` tabs and CRUD, add TU account management in `AdminPenggunaView`, author comprehensive test suite, update `package.json`.
- **Success criteria**: All acceptance criteria in `ORIGINAL_REQUEST.md`, zero regressions on existing test suites, TypeScript compilation passes without errors, and new dedicated test suite passes.
- **Interface contracts**: `PROJECT.md` § Interface Contracts
- **Code layout**: `PROJECT.md` § Code Layout

## Key Decisions Made
- Reused `AdminDataView.tsx` by declaring `const tabs = [...]` (9 items) for AST compatibility and `const visibleTabs = isTataUsaha ? tabs.filter(t => t.id === 'Data_Siswa' || t.id === 'Data_Guru') : tabs` for UI isolation.
- Preserved `isAdminRole('tata_usaha') === false` while extending `checkMasterDataMutationGuard` specifically for `data_siswa` and `data_guru` mutations.
- Reused `AdminPenggunaView.tsx` with modal dialog "+ Akun TU" so school admins can create TU accounts directly into the `users` table without interfering with teacher sync.

## Artifact Index
- `.agents/teamwork/worker_tu/DISPATCH.md` — Dispatch message
- `.agents/teamwork/worker_tu/BRIEFING.md` — Situational awareness
- `.agents/teamwork/worker_tu/progress.md` — Execution progress and status
- `.agents/teamwork/worker_tu/handoff.md` — Final handoff report
- `tests/tata_usaha_role_rbac_and_isolation.test.ts` — Comprehensive 81-assertion test suite

## Change Tracker
- **Files modified**:
  - `src/types/user.ts`: Added `'tata_usaha'` to `UserRole` and `AppUser.role`.
  - `src/types/database.ts`: Added `'tata_usaha'` and `'Tata Usaha'` to `RoleUser`.
  - `src/lib/navigation.ts`: Registered aliases `view-data-siswa` and `view-data-guru`, isolated sidebar menu to 2 items for `tatausaha`, enforced strict RBAC in `evaluateTabRBAC`.
  - `src/lib/supabaseClient.ts`: Kept `isAdminRole('tata_usaha') === false`, permitted mutations on `data_siswa` & `data_guru` for `tata_usaha` in `checkMasterDataMutationGuard`.
  - `src/components/AppScreen.tsx`: Added `isTataUsaha`, defaulted landing view to `view-admin-data`, blocked `view-dokumen`, rendered TU identity badge in sidebar, preserved AST comments.
  - `src/components/ClaySidebar.tsx`: Added TU identity badge and icon, preserved AST comments.
  - `src/components/AdminDataView.tsx`: Filtered visible tabs to Data Siswa & Data Guru for TU, enabled `canModify` CRUD on those two tabs.
  - `src/components/AdminPenggunaView.tsx`: Added TU account creation and credential management without teacher sync collision.
  - `tests/tata_usaha_role_rbac_and_isolation.test.ts`: Created 81-assertion automated test suite.
  - `package.json`: Appended test runner script.
- **Build status**: Pass (`npm test` and `npx tsc --noEmit` pass with 0 errors).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: Pass (81/81 in dedicated suite, 58/58 in admin submenu suite, 8/8 in master data restriction suite, 47/47 in kepsek suite, all 68+ test suites in `npm test` passed).
- **Lint status**: 0 errors.
- **Tests added/modified**: `tests/tata_usaha_role_rbac_and_isolation.test.ts` (81 assertions across 6 suites).

## Loaded Skills
- **Source**: `C:\Users\Fitra\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md`
- **Local copy**: `.agents/teamwork/worker_tu/skills/ponytail/SKILL.md`
- **Core methodology**: Simplest, shortest diff, zero bloat, reuse before new code, stdlib/native first, ladder of simplicity.
