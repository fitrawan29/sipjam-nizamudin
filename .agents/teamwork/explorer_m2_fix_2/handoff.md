# Handoff Report: Milestone 2 Defect Fix — Mixed Schedule Journal Fulfillment

## 1. Observation

### Source Code Location
- **File**: `src/lib/workflow.ts`
- **Function**: `getGuruDailyState(namaGuru: string, username?: string, userId?: string, sekolahId?: string)`
- **Lines**: 976–987

Verbatim code in `src/lib/workflow.ts`:
```typescript
976:       // Evaluasi jadwal reguler dan jadwal yang terblokir
977:       const unblockedSchedules = state.jadwalKBM.filter((jk: any) => !jk.isBlocked);
978:       const blockedSchedules = state.jadwalKBM.filter((jk: any) => jk.isBlocked);
979: 
980:       const unblockedFulfilled = unblockedSchedules.every(jk => 
981:         state.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))
982:       );
983:       const blockedFulfilled = blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan);
984: 
985:       if ((unblockedFulfilled && blockedFulfilled) || state.jurnalKegiatan) isJurnalDone = true;
986:     }
```

### Reviewer & Test Observations
1. **Reviewer 1 Finding (`.agents/teamwork/reviewer_m2_1/handoff.md`, lines 45–54, 135–146)**:
   - Line 985 contains a short-circuit bypass: `if ((unblockedFulfilled && blockedFulfilled) || state.jurnalKegiatan) isJurnalDone = true;`.
   - In mixed schedule mode (`unblockedSchedules.length > 0 && blockedSchedules.length > 0`), if a teacher submits 1 `jurnalKegiatan` for their blocked schedule, `state.jurnalKegiatan` is truthy.
   - The trailing `|| state.jurnalKegiatan` short-circuits the condition, making `isJurnalDone = true` even if `unblockedFulfilled` is `false` (i.e. regular unblocked KBM classes were never taught or submitted).
2. **Reviewer 2 Finding (`.agents/teamwork/reviewer_m2_2/handoff.md`, lines 18–33)**:
   - In `tests/challenger_m2_2_mixed_schedule_journal.test.ts` lines 259–264, the test author defined `const isJurnalDone = (unblockedFulfilled && blockedFulfilled);` in a local test simulation function without `|| state.jurnalKegiatan`, demonstrating the expected design requirement: both regular KBM and activity journals must be submitted.
3. **Worker M2 Test Suite (`tests/m2_schedule_masking_workflow.test.ts`, lines 422–440)**:
   - Section 5 of the worker test suite asserted:
     ```typescript
     assert(unblockedDone && blockedDone, 'Mixed State: complete duty fulfilled when both KBM and Kegiatan are submitted');
     assert(!incompleteKBM, 'Mixed State: missing unblocked class journal correctly recognized as incomplete');
     assert(!incompleteKegiatan, 'Mixed State: missing blocked journal correctly recognized as incomplete');
     ```
   - The test verified the logic using local variables rather than invoking `getGuruDailyState()`, which masked the bug in `workflow.ts:985`.

---

## 2. Logic Chain

1. **Premise & Specification (ORIGINAL_REQUEST R3 & PROJECT.md)**:
   - On days where a teacher has a mixed schedule (some regular KBM classes unaffected by block, and some classes masked as blocked), the teacher is required to:
     a) Teach and submit `Jurnal KBM` for all unblocked regular classes (`unblockedFulfilled`).
     b) Submit `Jurnal Kegiatan` for the blocked period/schedule (`blockedFulfilled`).
2. **Defect Mechanism**:
   - In `src/lib/workflow.ts` line 985, the expression `((unblockedFulfilled && blockedFulfilled) || state.jurnalKegiatan)` contains a disjunction where `state.jurnalKegiatan` appears unconditionally on the right side.
   - If a teacher has 3 regular morning classes and 1 blocked afternoon class:
     - Teacher submits 1 `Jurnal Kegiatan`.
     - `state.jurnalKegiatan` becomes an object (truthy).
     - Teacher has submitted 0 `Jurnal KBM` (`unblockedFulfilled === false`).
     - Condition evaluates: `(false && true) || true` -> `true`.
     - `isJurnalDone` is set to `true`, and the system considers all daily journal obligations fulfilled, bypassing 3 regular classes.
3. **Deduction of the Fix**:
   - When `blockedSchedules.length > 0`:
     The teacher has at least one blocked schedule.
     - If it is a mixed schedule (`unblockedSchedules.length > 0`), BOTH `unblockedFulfilled` AND `blockedFulfilled` MUST be true. `state.jurnalKegiatan` alone must NEVER bypass `unblockedFulfilled`.
     - If it is an all-blocked schedule (`unblockedSchedules.length === 0`), `unblockedFulfilled` evaluates to `true` (via `[].every(...) === true`), so `unblockedFulfilled && blockedFulfilled` evaluates strictly to `blockedFulfilled` (`Boolean(state.jurnalKegiatan)`).
   - When `blockedSchedules.length === 0`:
     The teacher has purely unblocked schedules.
     - Standard KBM fulfillment (`unblockedFulfilled`) marks `isJurnalDone = true`.
     - Legacy tolerance (`|| state.jurnalKegiatan`) can be safely retained in the `else` branch for backward compatibility if a teacher submitted an ad-hoc activity journal without an active block in DB.

---

## 3. Caveats

1. **Presensi Pulang Flexibility (R2 Rule)**:
   - `canTeacherPresensiPulang(state)` in lines 1005–1010 allows a teacher who has recorded `presensiDatang` to checkout without being blocked by unsubmitted journals.
   - However, `isJurnalDone` remains the primary source of truth for:
     a) Whether the teacher has fulfilled their daily duties for administrative audits and rekap.
     b) Dismissal warnings / reminders (`state.lockedReason = 'Anda belum menyelesaikan: ...'`).
     c) Teachers without `presensiDatang` who attempt checkout or check status.
2. **All-Blocked Schedule Routing**:
   - In `getGuruDailyState`, when all schedules are blocked (`allBlocked`), line 656 sets `state.isBlok = true`.
   - Therefore, all-blocked schedules are already captured at line 971:
     `else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0)`
     where `if (state.jurnalKegiatan) isJurnalDone = true;`.
   - Even if an all-blocked schedule reaches line 976, `unblockedSchedules.length === 0` makes `unblockedFulfilled === true`, so `unblockedFulfilled && blockedFulfilled` requires only `state.jurnalKegiatan`.
3. **Scope Discipline**:
   - This handoff addresses Defect 2 (line 985).
   - Defect 1 (empty string matching in `workflow.ts:258-272`) is addressed in parallel by `explorer_m2_fix_1`.

---

## 4. Conclusion & Exact Proposed Fix

### Proposed Code Change in `src/lib/workflow.ts`

**Location**: Lines 980–986

#### Before:
```typescript
      const unblockedFulfilled = unblockedSchedules.every(jk => 
        state.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))
      );
      const blockedFulfilled = blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan);

      if ((unblockedFulfilled && blockedFulfilled) || state.jurnalKegiatan) isJurnalDone = true;
```

#### After:
```typescript
      const unblockedFulfilled = unblockedSchedules.every(jk => 
        state.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))
      );
      const blockedFulfilled = blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan);

      if (blockedSchedules.length > 0) {
        // Mixed or all-blocked schedule: both regular KBM journals and Jurnal Kegiatan must be fulfilled
        if (unblockedFulfilled && blockedFulfilled) isJurnalDone = true;
      } else {
        // Standard unblocked schedule: regular KBM fulfillment (or legacy Jurnal Kegiatan tolerance)
        if (unblockedFulfilled || state.jurnalKegiatan) isJurnalDone = true;
      }
```

#### Patch File Reference
Machine-applicable unified diff has been written to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_fix_2\workflow_jurnal_done.patch`

---

## 5. Verification Method

### Matrix of Test Cases to Verify

| Scenario | Schedule Shape | Journals Submitted | Expected `unblockedFulfilled` | Expected `blockedFulfilled` | Expected `isJurnalDone` |
|---|---|---|---|---|---|
| **Mixed 1** | 2 unblocked, 1 blocked | None | `false` | `false` | `false` |
| **Mixed 2** | 2 unblocked, 1 blocked | Only Jurnal Kegiatan | `false` | `true` | `false` (Defect Fixed!) |
| **Mixed 3** | 2 unblocked, 1 blocked | Only 1 of 2 KBM | `false` | `false` | `false` |
| **Mixed 4** | 2 unblocked, 1 blocked | 2 of 2 KBM, No Kegiatan | `true` | `false` | `false` |
| **Mixed 5** | 2 unblocked, 1 blocked | 2 of 2 KBM + Jurnal Kegiatan | `true` | `true` | `true` |
| **Unblocked 1** | 2 unblocked, 0 blocked | 2 of 2 KBM | `true` | `true` | `true` |
| **Unblocked 2** | 2 unblocked, 0 blocked | None | `false` | `true` | `false` |
| **All Blocked** | 0 unblocked, 2 blocked | Jurnal Kegiatan | `true` | `true` | `true` |

### Independent Verification Commands
```powershell
# 1. Static typing check
npx tsc --noEmit

# 2. Existing and M2 verification suites
npx tsx tests/sistem_blok_verification.test.ts
npx tsx tests/m2_schedule_masking_workflow.test.ts
npx tsx tests/challenger_m2_2_mixed_schedule_journal.test.ts

# 3. Full project regression suite
npm test
```

### Invalidation Conditions
1. If a teacher with unblocked regular KBM classes and 1 blocked class can submit only `Jurnal Kegiatan` and have `isJurnalDone = true`.
2. If a teacher with unblocked regular classes who submits all regular KBM journals but omits `Jurnal Kegiatan` for a blocked class is marked `isJurnalDone = true`.
3. If any existing regression test in `tests/sistem_blok_verification.test.ts` or `npm test` fails.
