# Handoff Report: Milestone 2 — Workflow Engine, Granular Schedule Masking & Journal Workflows

## 1. Observation

### Exact File Paths & Code Changes
1. **`src/lib/workflow.ts`**:
   - Lines 28-30: Expanded `GuruDailyState` type with:
     ```typescript
     hasBlockedSchedule?: boolean;
     activeBloks?: SistemBlok[];
     ```
   - Lines 72-102: Implemented `getActiveSistemBloks(dateStr?: string, sekolahId?: string): Promise<SistemBlok[]>` returning all block rules active on `dateStr` for `sekolahId`.
   - Lines 100-104: Maintained backward-compatible wrapper:
     ```typescript
     export async function getActiveSistemBlok(dateStr?: string, sekolahId?: string): Promise<any | null> {
       const bloks = await getActiveSistemBloks(dateStr, sekolahId);
       return bloks.length > 0 ? bloks[0] : null;
     }
     ```
   - Lines 107-152: Implemented `isKelasInAngkatan(kelas: string | null | undefined, angkatan: string): boolean`:
     * Supports bidirectional Arabic <-> Roman numeral grade equivalence (10 <-> X, 11 <-> XI, 12 <-> XII, 7 <-> VII, 8 <-> VIII, 9 <-> IX, 1..6 <-> I..VI).
     * Enforces Roman numeral boundary assertion regex `(^|[^a-z0-9])${token}([^a-z0-9]|(?![ivx])[a-z]|$)` so Roman numerals like `XI` or `XII` never falsely match `X`.
   - Lines 155-197: Implemented `parseTimeToMinutes(t?: string | null, fallbackMinutes = 0): number` and `isTimeRangeOverlap(schedStart, schedEnd, blokStart, blokEnd, isFullDay)`:
     * Parses both `HH:mm` and `HH.mm` formats.
     * Evaluates `sStartMin < bEndMin && sEndMin > bStartMin`.
     * Returns `true` if `is_full_day === true` or both block times are unspecified.
   - Lines 205-300: Implemented `evaluateScheduleBlock(schedule, teacher, activeBloks): ScheduleBlockEvaluation`:
     * Matches target scopes:
       - `sekolah` / `keseluruhan`: all schedules match.
       - `angkatan`: matches via `isKelasInAngkatan(schedule.kelas, rule.target_angkatan)`.
       - `kelas`: matches exact class name (case-insensitive).
       - `guru`: matches `target_guru_id` or `target_guru_nama` against teacher / schedule attributes.
     * Evaluates interval overlap via `isTimeRangeOverlap`.
     * Returns `{ isBlocked: boolean, blockRule?: SistemBlok, reason?: string }`.
   - Lines 445-475: Updated `getGuruDailyState()` step 0 to load all `activeBloks` via `getActiveSistemBloks(todayStr, sekolahId)`.
   - Lines 630-675: Evaluated each schedule item in `state.jadwalKBM` using `evaluateScheduleBlock`, tagging each schedule with `isBlocked`, `blockRule`, and `blockedReason`.
   - Set `state.hasBlockedSchedule = state.jadwalKBM.some((jk: any) => jk.isBlocked)`. If all schedules are blocked or full-day whole-school block is active, set `state.isBlok = true`.
   - Lines 975-990: Evaluated `isJurnalDone` in mixed state: unblocked schedules require `jurnalKBM` matches, while blocked schedules are fulfilled by 1 `jurnalKegiatan`.

2. **`src/components/HomeViewGuru.tsx`**:
   - Lines 810-822: Rendered `Campuran` badge when `dailyState.hasBlockedSchedule` is true.
   - Lines 850-915: Preserved full-day block banner when `dailyState?.isBlok` is true.
   - Lines 930-1035: In `dailyState.jadwalKBM.map`, conditionally distinguished:
     * Blocked schedules (`jk.isBlocked`): rendered with `Kegiatan Blok` badge, block activity name, and button to `Isi Jurnal Kegiatan` (or `Jurnal Selesai ✓` if completed).
     * Unblocked schedules (`!jk.isBlocked`): rendered with standard KBM card and regular `Isi Jurnal` / `Sudah Diisi` status.
   - Lines 1040-1060: Updated progress summary to display both regular KBM progress and Kegiatan Blok status.

3. **`src/components/GuruJurnal.tsx`**:
   - Lines 510-530: In `checkState`, auto-selected journal mode based on workflow state. In mixed mode (`hasBlockedSchedule && !isBlok`), pre-filled block metadata while allowing switching.
   - Lines 1260-1275: Updated block guidance banner to acknowledge mixed schedule mode.
   - Lines 1325-1355: Replaced disabled select in mixed mode with interactive dropdown allowing teacher to toggle between `Jurnal KBM` (for unblocked regular classes) and `Jurnal Kegiatan` (for blocked schedules).

4. **`tests/m2_schedule_masking_workflow.test.ts`**:
   - Created comprehensive test suite with 74 tests covering:
     * Section 1: Grade / Angkatan matching (26 test assertions)
     * Section 2: Time range parsing & interval overlap (18 test assertions)
     * Section 3: Targeted block evaluation for all 4 scopes (10 test assertions)
     * Section 4: Live DB fetching and in-memory schema mapping (9 test assertions)
     * Section 5: Daily state mixed schedule masking & journal fulfillment (5 test assertions)
     * Section 6: UI source code structural compliance (6 test assertions)

### Verbatim Tool Commands & Test Execution Results
- `npx tsc --noEmit`: Exited with code 0 (zero static errors).
- `npx tsx tests/sistem_blok_verification.test.ts`:
  ```
  TOTAL TESTS: 85
  PASSED: 85
  FAILED: 0
  🎉 ALL SISTEM BLOK VERIFICATION TESTS PASSED!
  ```
- `npx tsx tests/m2_schedule_masking_workflow.test.ts`:
  ```
  TOTAL M2 TESTS: 74
  PASSED: 74
  FAILED: 0
  ```

---

## 2. Logic Chain

1. **Target Identification Requirement (from Dispatch 3.A & ORIGINAL_REQUEST R1)**:
   Previous block logic assumed school-wide full-day blocks. The new system supports 4 distinct target scopes (`sekolah`, `angkatan`, `kelas`, `guru`). `isKelasInAngkatan` provides flexible grade token recognition (such as `10 <-> X` and `11 <-> XI`) while preventing false substring matches (e.g., `XI` or `XII` never matching `X`).
2. **Time Range Overlap Requirement (from Dispatch 3.A & ORIGINAL_REQUEST R2)**:
   Block rules can either apply full day (`is_full_day: true` or null time bounds) or within explicit hours (`jam_mulai` to `jam_selesai`). `parseTimeToMinutes` converts `HH:mm` or `HH.mm` into minutes from midnight, and `isTimeRangeOverlap` implements strict interval overlap `sStart < bEnd && sEnd > bStart`.
3. **Granular Schedule Masking (from Dispatch 3.A, 3.B & ORIGINAL_REQUEST R3)**:
   Instead of an all-or-nothing boolean, `getGuruDailyState` maps each teacher schedule item through `evaluateScheduleBlock`. If a schedule falls within the targeted scope and active hours, it is tagged `isBlocked = true`. In `HomeViewGuru.tsx`, blocked schedules are visually masked with a prominent "Kegiatan Blok" badge and an action link to fill the activity journal, while unblocked schedules remain active KBM cards.
4. **Teacher Journal Workflow (from Dispatch 3.C & ORIGINAL_REQUEST R3)**:
   When a teacher has mixed schedules (e.g. morning block and afternoon class, or one class blocked while another is unaffected), `GuruJurnal.tsx` allows switching between `Jurnal KBM` and `Jurnal Kegiatan`. In `workflow.ts`, fulfillment of teaching obligations requires `jurnalKBM` for all unblocked schedules plus 1 `jurnalKegiatan` for blocked periods.
5. **Regression Safety**:
   All 85 legacy test assertions in `tests/sistem_blok_verification.test.ts` (including verbatim code checks) were preserved intact, ensuring 100% backward compatibility.

---

## 3. Caveats

1. **Remote PostgREST Schema Cache (PGRST204)**:
   As documented in M1, if the remote Supabase PostgREST schema cache has not yet reloaded the columns from `20261102_flexible_sistem_blok.sql`, the application and test suites seamlessly use fallback compatibility mode without throwing unhandled exceptions.
2. **Schedules without Explicit Hours**:
   If a schedule in `jadwal_pelajaran` lacks explicit `jam_mulai` and `jam_selesai`, `isTimeRangeOverlap` safely treats it as overlapping with any active block for that day.

---

## 4. Conclusion

Milestone 2 is complete and verified:
- `src/lib/workflow.ts` fully implements `getActiveSistemBloks`, `getActiveSistemBlok`, `isKelasInAngkatan`, `isTimeRangeOverlap`, and `evaluateScheduleBlock`.
- `src/components/HomeViewGuru.tsx` renders granular schedule masking for mixed schedules and full block banner for complete blocks.
- `src/components/GuruJurnal.tsx` supports dual-journal entry for mixed schedule days.
- Static typing (`npx tsc --noEmit`) passes with 0 errors.
- Both test suites (`tests/sistem_blok_verification.test.ts` [85 tests] and `tests/m2_schedule_masking_workflow.test.ts` [74 tests]) pass with 100% success rate.

---

## 5. Verification Method

To independently verify the implementation:

```bash
# 1. Typecheck the codebase
npx tsc --noEmit

# 2. Run existing test suite (85 tests, zero regressions)
npx tsx tests/sistem_blok_verification.test.ts

# 3. Run new Milestone 2 test suite (74 tests)
npx tsx tests/m2_schedule_masking_workflow.test.ts
```

Invalidation conditions:
- Any test failure in `tests/sistem_blok_verification.test.ts` or `tests/m2_schedule_masking_workflow.test.ts`.
- TypeScript errors reported by `npx tsc --noEmit`.
