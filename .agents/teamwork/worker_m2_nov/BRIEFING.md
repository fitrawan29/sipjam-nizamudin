# BRIEFING — 2026-11-06T23:36:00Z

## Mission
Implement Milestone M2: Hierarchical teacher-subject-class cascading selection with strict grade-level matching, empty state, and dirty grades safeguard in GradebookView.tsx, and create dedicated test suite tests/gradebook_cascading_selection.test.ts.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2_nov
- Original parent: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Milestone: M2 - Penyesuaian Asesmen & Rapor (Buku Nilai Mapel Cascading)

## 🔒 Key Constraints
- Follow minimal change principle; do not perform unrelated refactoring.
- Adhere to Git Workflow Rule: git status, git add ., git commit -m "...", git push origin main.
- Preserve AST invariants tested in tests/gradebook_teacher_filter_ponytail.test.ts and tests/mata_pelajaran_kelas_paralel_isolation.test.ts (isTeacherMatch, isAssignmentMatchTeacher, stillTeaches, currentClassValid, onChange={e => handleSelectGuru(e.target.value)}, fallback strings).
- Ensure 0 typescript errors (npx tsc --noEmit).
- Run and pass all tests: tests/gradebook_cascading_selection.test.ts, tests/gradebook_teacher_filter_ponytail.test.ts, tests/mata_pelajaran_kelas_paralel_isolation.test.ts.
- No dummy/facade implementations; genuine state and filtering logic.

## Current Parent
- Conversation ID: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Updated: not yet

## Task Summary
- **What to build**: Hierarchical teacher-subject-class cascading selection with strict grade-level isolation in GradebookView.tsx and unit test suite tests/gradebook_cascading_selection.test.ts.
- **Success criteria**:
  1. Teacher first selection for Admin with unselected start (`-- Pilih Guru Pengampu --`), disabled downstream selects with informative placeholders, and clay empty state.
  2. Strict grade-level matching (`parseTingkat`, `getSubjectTingkat`) preventing cross-grade class leaks.
  3. Dirty grades confirmation and clean state reset.
  4. Implement `stillTeaches` and `currentClassValid` in `handleSelectKelas` and `handleSelectMapel` for parallel class isolation.
  5. Dedicated test suite passes 100%, existing suites pass 100%, `npx tsc --noEmit` passes with 0 errors.
  6. Git commit & push directly to origin main.
- **Interface contracts**: PROJECT.md § GradebookView Selection State Contract
- **Code layout**: src/components/GradebookView.tsx, tests/gradebook_cascading_selection.test.ts

## Key Decisions Made
- Unify blueprints from explorer 1, 2, and 3: Include both `parseTingkat` and `getSubjectTingkat` directly in `GradebookView.tsx` (and export them) to make GradebookView self-contained while also importing `parseTingkat` or keeping it compatible.
- Include `stillTeaches` in `handleSelectKelas` and `currentClassValid` in `handleSelectMapel` to resolve existing failure in `tests/mata_pelajaran_kelas_paralel_isolation.test.ts`.

## Artifact Index
- handoff.md — Final handoff report
- progress.md — Liveness heartbeat

## Change Tracker
- **Files modified**: pending
- **Build status**: pending
- **Pending issues**: none

## Quality Status
- **Build/test result**: pending
- **Lint status**: pending
- **Tests added/modified**: tests/gradebook_cascading_selection.test.ts
