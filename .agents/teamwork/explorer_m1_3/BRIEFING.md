# BRIEFING — 2026-11-06T00:13:00Z

## Mission
Analyze data mutations, database scoping, and state synchronization for centralized student class allocation in Milestone 1.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Investigation & Synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_3\
- Original parent: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Milestone: Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Focus on Data Mutations, Database Scoping, and State Synchronization for Centralized Student Class Allocation
- Multi-tenant safety: Ensure all queries strictly enforce sekolah_id = user.sekolah_id
- Write complete state synchronization design and mutation specification to handoff.md

## Current Parent
- Conversation ID: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Updated: 2026-11-06T00:13:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`
  - `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (lines 81-135)
  - `supabase/migrations/20261102_restrict_master_data_to_admin.sql` (lines 1-75)
  - `supabase/migrations/20260912_fix_rls_integrity.sql` (lines 370-405)
  - `supabase/migrations/20261027_user_uniqueness_and_anti_dummy_guard.sql` (lines 65-120)
  - `supabase/migrations/20260925_cascade_profile_updates.sql` (lines 1-114)
  - `src/types/database.ts` (lines 328-475, 1716-1765)
  - `src/components/NaikKelasModal.tsx` (lines 1-450)
  - `src/components/AdminDataView.tsx` (lines 100-210, 1910-2335)
  - `src/components/AdminPenggunaView.tsx` (lines 1-100)
  - `src/lib/dataIntegrityGuard.ts` (lines 270-350, 800-860)
  - `src/lib/navigation.ts` (lines 1-60)
  - `src/lib/toast.ts` (lines 1-37)
  - `tests/m6_master_data_polish.test.ts` (lines 130-230)
  - `tests/jadwal_mapel_validity_and_master_integrity.test.ts` (lines 430-455)
- **Key findings**:
  1. `data_siswa.kelas` is the single source of truth for student allocations.
  2. `wali_kelas` has unique constraint `uq_wali_kelas_sekolah_kelas` on `(sekolah_id, kelas)`.
  3. `jadwal_pelajaran` and `guru_mapel` also store `kelas` as text strings.
  4. Cascading class rename requires synchronized updates across `data_siswa`, `wali_kelas`, `jadwal_pelajaran`, and `guru_mapel`, with pre-check on `wali_kelas` unique constraints.
  5. Multi-tenant scoping requires explicit `.eq('sekolah_id', user.sekolah_id)` on all operations to satisfy RLS and prevent data leaks.
  6. Zero-reload UI reactivity is achieved through direct in-place state updating (`setStudents`) and memoized aggregations (`useMemo`).
  7. Guardrails: blocking empty target class names, preventing deletion of classes with enrolled students, and using UUID-based student selection to prevent name/NISN collision bugs.
- **Unexplored areas**: Milestone 2 and Milestone 3 specific CSV parsing engines (deferred to subsequent milestones).

## Key Decisions Made
- Fully specified the data mutation operations, cascading rename algorithm, reactivity pattern, and edge-case guardrails for `AdminKelasView.tsx`.
- Formulated the exact interface and props contract for seamless integration with `NaikKelasModal.tsx` and `AdminDataView.tsx`.

## Artifact Index
- handoff.md — Comprehensive data mutations, database scoping, and state synchronization report
- progress.md — Liveness heartbeat and progress log
- DISPATCH.md — Original orchestrator instructions
