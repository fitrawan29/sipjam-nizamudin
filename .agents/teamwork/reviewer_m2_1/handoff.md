# Handoff Report: Milestone 2 (M2) — Reviewer & Adversarial Critic Assessment

## 1. Observation

### Verification Commands & Results

1. **TypeScript Static Analysis (`npx tsc --noEmit`)**:
   - Exit Code: 0 (Zero type errors).
2. **Existing Sistem Blok Test Suite (`npx tsx tests/sistem_blok_verification.test.ts`)**:
   - Total Tests: 85
   - Passed: 85, Failed: 0.
   - Result: All legacy and M1 assertions passed cleanly.
3. **Worker M2 Test Suite (`npx tsx tests/m2_schedule_masking_workflow.test.ts`)**:
   - Total Tests: 74
   - Passed: 74, Failed: 0.
4. **Full Project Regression Test Suite (`npm test`)**:
   - 45 test files executed sequentially.
   - Exit Code: 0 (All existing suites passed).
5. **Adversarial Stress Test Suite (`npx tsx tests/challenger_m2_matching_masking_stress.test.ts`)**:
   - Total Tests: 144
   - Passed: 142
   - **Failed: 2**
   ```
   ❌ FAIL: Multi-Rule: Bu Siti afternoon Class X is UNBLOCKED (after block hours)
   ❌ FAIL: Empty teacher object with teacher-targeted rule evaluates safely to unblocked
   ```

### Code Observations

1. **`src/lib/workflow.ts` (Lines 258-264)**:
   ```typescript
   const teacherNama = String(teacher.nama || teacher.nama_guru || '').trim().toLowerCase();
   const schedNamaGuru = String(schedule.nama_guru || '').trim().toLowerCase();

   const namaMatches = Boolean(
     targetGuruNama &&
     (teacherNama.includes(targetGuruNama) ||
       targetGuruNama.includes(teacherNama) ||
       schedNamaGuru.includes(targetGuruNama) ||
       targetGuruNama.includes(schedNamaGuru))
   );
   ```
   *Behavior*: In JavaScript, `targetGuruNama.includes("")` evaluates to `true`. When `schedNamaGuru` is empty (e.g. any schedule object where `nama_guru` is omitted, such as `{ kelas: 'X Merdeka', jam_mulai: '12:30', jam_selesai: '14:00' }`), `targetGuruNama.includes(schedNamaGuru)` evaluates to `true`. Likewise, when `teacher.nama` is undefined (empty object `{}`), `targetGuruNama.includes(teacherNama)` evaluates to `true`. As a consequence, any schedule lacking `nama_guru` or any teacher context lacking `nama` matches any teacher-targeted block rule that has a non-empty `target_guru_nama`.

2. **`src/lib/workflow.ts` (Lines 980-986)**:
   ```typescript
   const unblockedFulfilled = unblockedSchedules.every(jk => 
     state.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))
   );
   const blockedFulfilled = blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan);

   if ((unblockedFulfilled && blockedFulfilled) || state.jurnalKegiatan) isJurnalDone = true;
   ```
   *Behavior*: In mixed schedule mode (`unblockedSchedules.length > 0 && blockedSchedules.length > 0`), if a teacher submits 1 `jurnalKegiatan` for their blocked schedule, `state.jurnalKegiatan` is truthy. The trailing `|| state.jurnalKegiatan` short-circuits the evaluation, making `isJurnalDone = true` even if `unblockedFulfilled` is `false` (i.e. regular unblocked KBM classes were never taught or submitted).

3. **`tests/m2_schedule_masking_workflow.test.ts` (Lines 422-440)**:
   The test in Section 5 evaluated fulfillment via local script variables (`assert(unblockedDone && blockedDone)`) rather than executing `getGuruDailyState()`, thereby masking the bug in `workflow.ts:985`.

---

## 2. Logic Chain

1. **Target Isolation (ORIGINAL_REQUEST R1 & PROJECT.md)**:
   - Target scopes must strictly isolate affected teachers/classes. A rule targeting Teacher A must never block Teacher B.
   - Because `String('Pak Budi').includes('') === true`, omitting `nama_guru` in a schedule object causes `evaluateScheduleBlock` to treat the schedule as matching Teacher A's block.
   - When Bu Siti has a schedule during the afternoon overlapping with Pak Budi's afternoon block, Bu Siti's schedule is falsely blocked.
2. **Journal Fulfillment Consistency (ORIGINAL_REQUEST R3 & PROJECT.md)**:
   - On mixed schedule days, teachers with unblocked classes must teach and submit `Jurnal KBM` for those unblocked classes, while filling `Jurnal Kegiatan` for blocked schedules.
   - Having `|| state.jurnalKegiatan` bypass `unblockedFulfilled` allows a teacher with 3 regular classes and 1 blocked class to submit only 1 activity journal and have all 3 regular teaching obligations marked as done.
3. **Verdict Determination**:
   - Because of these two defects in core workflow evaluation, the implementation does not yet satisfy strict target isolation and mixed-state fulfillment integrity. Therefore, the review verdict is `REQUEST_CHANGES`.

---

## 3. Caveats

- In UI dashboards (`HomeViewGuru.tsx` and `GuruJurnal.tsx`), the visual rendering, badges, and mode selectors are well-implemented and pass all structural checks.
- Grade parsing (`isKelasInAngkatan`) and time overlap arithmetic (`isTimeRangeOverlap`) are mathematically sound and survive extensive adversarial boundary testing.
- The bugs are confined to `src/lib/workflow.ts` (lines 258-264 and line 985).

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Two issues must be addressed in `src/lib/workflow.ts`:
1. Guard `teacherNama` and `schedNamaGuru` as non-empty before checking substring containment against `targetGuruNama`.
2. Restrict `state.jurnalKegiatan` fulfillment in mixed schedule mode so it does not bypass `unblockedFulfilled`.

---

## 5. Verification Method

To verify the fixes independently:
```powershell
# 1. Static typecheck
npx tsc --noEmit

# 2. Existing and M2 test suites
npx tsx tests/sistem_blok_verification.test.ts
npx tsx tests/m2_schedule_masking_workflow.test.ts

# 3. Challenger stress test suite (must pass 144/144)
npx tsx tests/challenger_m2_matching_masking_stress.test.ts
```

Invalidation conditions:
- Any test failure in `tests/challenger_m2_matching_masking_stress.test.ts`.
- False positive matching when `schedule.nama_guru` or `teacher.nama` is empty.
- Submitting `jurnalKegiatan` bypassing uncompleted unblocked classes in mixed mode.

---

# Quality Review Report

## Review Summary
**Verdict**: REQUEST_CHANGES

## Findings

### [Critical] Finding 1: False Positive Matching in Teacher-Targeted Sistem Blok
- **What**: Any schedule lacking `nama_guru` or any teacher context lacking `nama` matches any teacher-targeted block rule.
- **Where**: `src/lib/workflow.ts`, lines 258-264.
- **Why**: `targetGuruNama.includes('')` is always `true` in JavaScript. When `schedNamaGuru` is `""`, it evaluates to `true`, causing schedules belonging to other teachers to be falsely blocked by rules targeting someone else.
- **Suggestion**:
  ```typescript
  const namaMatches = Boolean(
    targetGuruNama &&
    ((teacherNama && (teacherNama.includes(targetGuruNama) || targetGuruNama.includes(teacherNama))) ||
     (schedNamaGuru && (schedNamaGuru.includes(targetGuruNama) || targetGuruNama.includes(schedNamaGuru))))
  );
  ```

### [Major] Finding 2: Journal Fulfillment Shortcut in Mixed Schedule Mode
- **What**: Filling `Jurnal Kegiatan` allows a teacher with unblocked classes to bypass filling `Jurnal KBM`.
- **Where**: `src/lib/workflow.ts`, line 985.
- **Why**: `if ((unblockedFulfilled && blockedFulfilled) || state.jurnalKegiatan) isJurnalDone = true;`. The trailing `|| state.jurnalKegiatan` makes `isJurnalDone` true even when `unblockedFulfilled` is false.
- **Suggestion**:
  ```typescript
  if (blockedSchedules.length > 0) {
    if (unblockedFulfilled && blockedFulfilled) isJurnalDone = true;
  } else {
    if (unblockedFulfilled || state.jurnalKegiatan) isJurnalDone = true;
  }
  ```

## Verified Claims
- Grade matching `isKelasInAngkatan` handles Roman and Arabic numerals without boundary bleeding (`X` does not match `XI` or `XII`) → VERIFIED (PASS).
- Time overlap calculation `isTimeRangeOverlap` handles partial and full-day intervals correctly → VERIFIED (PASS).
- Full regression test suite (`npm test`) passes with 0 regressions → VERIFIED (PASS).
- `HomeViewGuru.tsx` renders mixed schedule cards and block badges properly → VERIFIED (PASS).
- `GuruJurnal.tsx` allows dual-journal selection for mixed schedules → VERIFIED (PASS).

## Coverage Gaps
- None. All 4 target scopes and time boundaries were reviewed and stress-tested.

## Unverified Items
- None.

---

# Adversarial Challenge Report

## Challenge Summary
**Overall risk assessment**: HIGH (due to false positive schedule blocking across teachers)

## Challenges

### [Critical] Challenge 1: Cross-Teacher Schedule Hijacking via Empty String Substring Match
- **Assumption challenged**: That `namaMatches` only matches the targeted teacher.
- **Attack scenario**: A schedule object without explicit `nama_guru` (common in schedule lookups or partial records) is evaluated against an active block targeting a different teacher. Because `String('').trim().toLowerCase()` is `""`, `targetGuruNama.includes("")` evaluates to `true`.
- **Blast radius**: Teachers have their classes falsely masked and converted to "Kegiatan Blok" whenever any teacher in the school has an active block rule during those hours.
- **Mitigation**: Require non-empty string checks on both sides before executing `includes()`.

### [High] Challenge 2: Mixed Day Regular KBM Evasion
- **Assumption challenged**: That mixed schedule fulfillment requires both regular KBM and block journals.
- **Attack scenario**: Teacher has 3 morning classes and 1 afternoon blocked class. Teacher submits 1 `jurnalKegiatan` and does not teach or submit KBM journals for the morning classes. The system marks `isJurnalDone = true`.
- **Blast radius**: Teaching accountability breakdown; unblocked classes escape validation.
- **Mitigation**: Disallow `state.jurnalKegiatan` as a standalone bypass when `blockedSchedules.length > 0`.

## Stress Test Results
- Target matching isolation: 8 failures out of 144 before analysis, isolated to 2 specific failure modes in `tests/challenger_m2_matching_masking_stress.test.ts`.
