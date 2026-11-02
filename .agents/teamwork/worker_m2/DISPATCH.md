## 2026-11-02T13:12:11Z

You are worker_m2.
Your role: teamwork_worker.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASK ASSIGNMENT — Milestone 2: Workflow Engine, Granular Schedule Masking & Journal Workflows

1. Background & References:
   - Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
   - Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
   - Read explorer survey findings in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\analysis.md and handoff.md

2. Scope & File Ownership:
   You own the following files exclusively:
   - `src/lib/workflow.ts`
   - `src/components/HomeViewGuru.tsx`
   - `src/components/GuruJurnal.tsx`
   - `tests/m2_schedule_masking_workflow.test.ts` (test for this milestone)

3. Detailed Requirements:
   A. Workflow Matching Engine (`src/lib/workflow.ts`):
      - Implement `getActiveSistemBloks(dateStr?: string, sekolahId?: string): Promise<SistemBlok[]>` returning all block rules active on `dateStr` for `sekolahId`.
      - Maintain `getActiveSistemBlok(dateStr?: string, sekolahId?: string)` as backward-compatible wrapper.
      - Implement `isKelasInAngkatan(kelas: string | null | undefined, angkatan: string): boolean`:
        * Matches grade tokens (e.g. 10 <-> X, 11 <-> XI, 12 <-> XII, 7 <-> VII, 8 <-> VIII, 9 <-> IX).
        * Uses word boundaries or equivalent matching (e.g. "X Merdeka" matches "10" and "X").
      - Implement `isTimeRangeOverlap(schedStart?: string | null, schedEnd?: string | null, blokStart?: string | null, blokEnd?: string | null): boolean`:
        * If block has no start and end time (`!blokStart && !blokEnd`), or `is_full_day: true`: returns true (full day overlap).
        * If schedule has explicit times and block has explicit times: evaluates `sStart < bEnd && sEnd > bStart`.
        * Robust time parser supporting `HH:mm` or `HH.mm`.
      - Implement `evaluateScheduleBlock(schedule, teacher, activeBloks)`:
        * Matches target:
          - `sekolah`: all schedules match
          - `angkatan`: matches if `isKelasInAngkatan(schedule.kelas, rule.target_angkatan)`
          - `kelas`: matches if `schedule.kelas.toLowerCase().trim() === rule.target_kelas.toLowerCase().trim()`
          - `guru`: matches if teacher ID or teacher name matches `target_guru_id` or `target_guru_nama`
        * Matches time overlap using `isTimeRangeOverlap`.
        * Returns `{ isBlocked: boolean, blockRule?: SistemBlok, reason?: string }`.
      - In `getGuruDailyState()`:
        * Evaluate all schedules in `state.jadwalKBM` using `evaluateScheduleBlock`.
        * Each schedule item receives `isBlocked: boolean` and `blockRule?: SistemBlok`.
        * If all schedules are blocked or a whole-school full-day block is active, `state.isBlok = true`.
        * Add `state.hasBlockedSchedule = state.jadwalKBM.some(s => s.isBlocked)`.
   B. Teacher Home Dashboard (`src/components/HomeViewGuru.tsx`):
      - Update schedule rendering:
        * If all schedules are blocked or full-day whole-school block is active: render the full-day block alert banner as before.
        * If mixed schedules exist (some blocked, some unblocked):
          - Render unblocked schedules as regular KBM cards with standard action buttons.
          - Render blocked schedules with distinct "Kegiatan Blok" badge / masking and button to "Isi Jurnal Kegiatan".
   C. Teacher Journal Interface (`src/components/GuruJurnal.tsx`):
      - Support filling `Jurnal Kegiatan (Sistem Blok)` when any schedule is blocked or when active block applies.
      - In mixed schedule scenarios, allow the teacher to choose between `Jurnal KBM` (for unblocked schedules) and `Jurnal Kegiatan` (for blocked schedules).
      - Ensure submitting `Jurnal Kegiatan` marks teaching obligations as fulfilled for the blocked periods.
   D. Verification:
      - Write unit/integration test in `tests/m2_schedule_masking_workflow.test.ts`.
      - Run TypeScript check: `npx tsc --noEmit`.
      - Run existing test suites: `npx tsx tests/sistem_blok_verification.test.ts` (all 85 tests MUST pass without regressions).
      - Run new test: `npx tsx tests/m2_schedule_masking_workflow.test.ts`.

4. Deliverables:
   - Write comprehensive report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\handoff.md
   - Include command outputs and verification evidence in handoff.
   - Send completion message to orchestrator when finished.
