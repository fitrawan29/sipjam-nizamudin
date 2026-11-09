# BRIEFING — 2026-11-09T05:20:30Z

## Mission
Investigate and survey R1 (Role BK - Bimbingan Konseling & Kontrol Akses) across the SIPJAM codebase.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, analysis, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_bk_1
- Original parent: 964210f9-504e-473a-a8e2-8633726ad7c7
- Milestone: M1 / R1 Exploration

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT write or modify any source code files
- Only write metadata, reports, and progress in our own working directory
- Produce 5-component handoff.md and send message back to parent orchestrator

## Current Parent
- Conversation ID: 964210f9-504e-473a-a8e2-8633726ad7c7
- Updated: 2026-11-09T05:20:30Z

## Investigation State
- **Explored paths**:
  - `src/types/user.ts` and `src/types/database.ts`
  - `src/lib/navigation.ts` (consolidated menus & evaluateTabRBAC)
  - `src/components/AppScreen.tsx` and `src/components/ClaySidebar.tsx`
  - `src/components/AdminPenggunaView.tsx` and `src/lib/teacherUserSync.ts`
  - `src/components/HomeView.tsx` and `src/components/HomeViewTU.tsx`
  - `src/lib/supabaseClient.ts`
  - `tests/adversarial_tu_nav_m2_challenger.test.ts` and `tests/tata_usaha_role_rbac_and_isolation.test.ts`
  - `supabase/migrations/20261108_fix_users_role_check_constraint.sql`
- **Key findings**:
  1. Role naming: Canonical `'bk'`. Normalization: `normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling'`.
  2. Sidebar menus: 5 items for BK (`view-home`, `view-guru-presensi`, `view-jurnal-bk`, `view-informasi`, `view-pengaturan-akun`) respecting Miller's Law.
  3. Default landing: `'view-home'` for consistency across staff roles.
  4. AST invariant: Verbatim comment `{/* AST preservation: data-tour={item.id} */}` in AppScreen & ClaySidebar is checked by automated tests and must be strictly preserved.
  5. RBAC: `evaluateTabRBAC` and JSX dual guard strictly protect `view-jurnal-bk` so only BK, Admin, and Kepsek can access, blocking regular Guru, Wali Kelas, Piket, TU, Siswa, and Dinas.
  6. Admin management: Dual mechanisms in `AdminPenggunaView.tsx` ("Tunjuk BK" toggle in table, "+ Akun BK" 4-field modal in banner, sync in `teacherUserSync.ts`).
- **Unexplored areas**: None for R1 exploration scope.

## Key Decisions Made
- Fully documented 5-component handoff report at `.agents/teamwork/explorer_bk_1/handoff.md`.

## Artifact Index
- DISPATCH.md — incoming task log
- progress.md — liveness and step progress
- BRIEFING.md — situational awareness
- handoff.md — final 5-component handoff report
