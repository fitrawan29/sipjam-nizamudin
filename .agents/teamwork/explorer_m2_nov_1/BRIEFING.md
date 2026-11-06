# BRIEFING — 2026-11-06T23:31:30Z

## Mission
Produce an exact implementation blueprint for Requirement R3 - Part 1: Teacher First Selection & Initial Empty State in `src/components/GradebookView.tsx`.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_1\
- Original parent: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Milestone: milestone_2 (R3 - Part 1 Blueprint)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement / edit source code
- Produce exact code diffs, line references, and component markup in handoff.md
- Non-admin (Guru) mode must remain untouched (automatically scoped to user.nama as read-only badge)

## Current Parent
- Conversation ID: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Updated: 2026-11-06T23:31:30Z

## Investigation State
- **Explored paths**:
  - `src/components/GradebookView.tsx` (lines 265–300, 327–456, 940–1075, 2690–2820, 2820–2950, 4870–5133)
  - `tests/gradebook_teacher_filter_ponytail.test.ts`
  - `tests/forensic_gradebook_audit.test.ts`
  - `tests/gradebook_unified_setup_flow.test.ts`
  - `PROJECT.md` & `ORIGINAL_REQUEST.md`
- **Key findings**:
  - `selectedGuru` initialized at line 275: changing to `isAdmin ? '' : (user?.nama || '')` cleanly forces empty selection for Admin on mount.
  - `fetchMasterAssignments` lines 962–978: changing `initialGuru` resolution from `teachers[0]` to empty string for Admin stops auto-selection on initial load.
  - `syncTeacherAssignments` lines 336–345: adding early exit when `!targetGuruName && isAdmin` clears downstream states (`mapelList`, `kelasList`, `selectedMapel`, `selectedKelas`).
  - Guru dropdown lines 2705–2715: adding `<option value="">-- Pilih Guru Pengampu --</option>`.
  - Mapel dropdown lines 2733–2747: `disabled={!selectedGuru}` with `<option value="">-- Pilih guru pengampu terlebih dahulu --</option>` while preserving `uniqueMapelList.length === 0 ? (` and `Tidak ada mapel ditugaskan` for existing tests.
  - Kelas dropdown lines 2755–2769: `disabled={!selectedGuru || !selectedMapel}` with `<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>` while preserving `kelasList.length === 0 ? (` and `Tidak ada kelas ditugaskan` for existing tests.
  - Workspace lines 2813 to 4875: conditional render of attractive empty state card when `isAdmin && !selectedGuru` with verbatim copy: "Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai."
  - Non-admin mode preserves read-only badge and automatic teacher scoping.
- **Unexplored areas**: None for R3 - Part 1 scope.

## Key Decisions Made
- All test invariants from `tests/gradebook_teacher_filter_ponytail.test.ts` (e.g. `isTeacherMatch`, `isAssignmentMatchTeacher`, `handleSelectGuru`, `uniqueMapelList.length === 0 ? (`, `kelasList.length === 0 ? (`, `leftNip={...}`) are preserved verbatim.
- Proposed diffs formatted for direct application by the builder agent.

## Artifact Index
- DISPATCH.md — Initial dispatch message
- BRIEFING.md — Persistent context & memory
- progress.md — Liveness & status tracking
- handoff.md — Final blueprint report
