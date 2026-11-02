# Handoff Report: Milestone 2 Empirical Validation & Adversarial Stress Testing

## Verdict: REQUEST_CHANGES

---

## 1. Observation

### Executed Tool Commands & Test Results
1. **Legacy Test Suite (`npx tsx tests/sistem_blok_verification.test.ts`)**:
   ```
   TOTAL TESTS: 85
   PASSED: 85
   FAILED: 0
   🎉 ALL SISTEM BLOK VERIFICATION TESTS PASSED!
   ```
2. **Worker M2 Test Suite (`npx tsx tests/m2_schedule_masking_workflow.test.ts`)**:
   ```
   TOTAL M2 TESTS: 74
   PASSED: 74
   FAILED: 0
   ```
3. **Adversarial Empirical Stress Suite (`npx tsx tests/challenger_m2_matching_masking_stress.test.ts`)**:
   ```
   TOTAL ADVERSARIAL STRESS TESTS: 144
   PASSED: 142
   FAILED: 2
   ```

### Verbatim Failures in Stress Test
```
❌ FAIL: Multi-Rule: Bu Siti afternoon Class X is UNBLOCKED (after block hours) {
  isBlocked: true,
  blockRule: {
    id: 'rule-guru-budi-afternoon',
    sekolah_id: 'school-uuid-1',
    nama_kegiatan: 'Rapat MGMP Pak Budi',
    tipe_target: 'guru',
    target_guru_id: 'uuid-pak-budi',
    target_guru_nama: 'Pak Budi',
    is_full_day: false,
    jam_mulai: '11:00',
    jam_selesai: '14:00'
  },
  reason: 'Diblokir oleh sistem blok: Rapat MGMP Pak Budi'
}

❌ FAIL: Empty teacher object with teacher-targeted rule evaluates safely to unblocked {
  isBlocked: true,
  blockRule: {
    id: 'rule-guru-1',
    sekolah_id: 'school-uuid-1',
    nama_kegiatan: 'Pelatihan Instruktur Guru Penggerak',
    tipe_target: 'guru',
    target_guru_id: 'f8992e62-c0e9-4e67-9c94-0cfb3f946d4a',
    target_guru_nama: 'Siti Nurhaliza, S.Pd',
    is_full_day: true,
    jam_mulai: null,
    jam_selesai: null
  },
  reason: 'Diblokir oleh sistem blok: Pelatihan Instruktur Guru Penggerak'
}
```

### Exact Code Defect Location in `src/lib/workflow.ts`
Lines 240-272:
```typescript
      const targetGuruId = (rule.target_guru_id || (rule as any).target_id || '').trim().toLowerCase();
      const targetGuruNama = (rule.target_guru_nama || '').trim().toLowerCase();

      const teacherId = String(teacher.id || '').trim().toLowerCase();
      const teacherUserId = String(teacher.user_id || '').trim().toLowerCase();
      const schedUserId = String(schedule.user_id || '').trim().toLowerCase();
      const schedGuruId = String(schedule.guru_id || '').trim().toLowerCase();

      const teacherNama = String(teacher.nama || teacher.nama_guru || '').trim().toLowerCase();
      const schedNamaGuru = String(schedule.nama_guru || '').trim().toLowerCase();

      const idMatches = Boolean(
        targetGuruId &&
        (targetGuruId === teacherId ||
          targetGuruId === teacherUserId ||
          targetGuruId === schedUserId ||
          targetGuruId === schedGuruId)
      );

      const namaMatches = Boolean(
        targetGuruNama &&
        (teacherNama.includes(targetGuruNama) ||
          targetGuruNama.includes(teacherNama) ||
          schedNamaGuru.includes(targetGuruNama) ||
          targetGuruNama.includes(schedNamaGuru))
      );
```

### Second Consequential Defect in `src/lib/workflow.ts`
Line 667-678:
```typescript
    } else if (state.jadwalKBM.length === 0 && activeBloks.length > 0) {
      const teacherMatches = activeBloks.some(b => {
        if (b.tipe_target === 'sekolah' || (b.tipe_target as any) === 'keseluruhan' || !b.tipe_target) return true;
        if (b.tipe_target === 'guru') {
          return evaluateScheduleBlock({}, teacherRef, [b]).isBlocked;
        }
        return false;
      });
      if (teacherMatches) {
        state.isBlok = true;
      }
    }
```

---

## 2. Logic Chain

1. **Substr Inclusion Behavior with Empty Strings**:
   In JavaScript, `'any string'.includes('')` evaluates to `true`.
2. **Missing Truthy Guards on Needles**:
   In lines 258-264 of `src/lib/workflow.ts`, `namaMatches` checks:
   `targetGuruNama.includes(teacherNama)` and `targetGuruNama.includes(schedNamaGuru)`.
   When `schedule.nama_guru` is omitted or empty (which is typical for schedule records), `schedNamaGuru` is `""`.
   Because `targetGuruNama` is a non-empty string (e.g. `'pak budi'`), `'pak budi'.includes('')` evaluates to `true`.
   Similarly, when `teacher.nama` or `teacher.nama_guru` is empty or undefined, `teacherNama` is `""`, and `'pak budi'.includes('')` evaluates to `true`.
3. **Catastrophic Blast Radius in Production**:
   - Any schedule item that does not contain an explicit `nama_guru` property is matched as belonging to ANY teacher targeted by an active block rule.
   - For example: If Admin sets a block rule for "Guru Pak Budi" (11:00 - 14:00), and Bu Siti teaches a class at 12:30 where the schedule record lacks `nama_guru`, Bu Siti's class is falsely marked as `isBlocked: true` by "Rapat MGMP Pak Budi".
   - At line 671, when any teacher has 0 schedules today, `evaluateScheduleBlock({}, teacherRef, [b])` is evaluated with an empty schedule `{}`. Because `{}` has no `nama_guru`, `schedNamaGuru` is `""`, causing `isBlocked` to return `true`. As a result, EVERY teacher without a schedule today is falsely marked as `state.isBlok = true` if there is a single teacher-targeted block rule active in the school.
4. **Why Worker M2's Test Suite Missed This**:
   Worker M2's test in `tests/m2_schedule_masking_workflow.test.ts` line 263 only tested with explicit dummy names:
   `{ kelas: 'XII RPL', ..., nama_guru: 'Budi Santoso' }`.
   Because `nama_guru` was explicitly set to `'Budi Santoso'`, `schedNamaGuru` was `'budi santoso'`, so `'ade fitrawan'.includes('budi santoso')` was `false`. Worker M2 never tested with schedules missing `nama_guru` or multi-rule isolation.

---

## 3. Caveats

1. **Robust Areas**:
   - `isKelasInAngkatan` is exceptionally robust: 10/X, 11/XI, 12/XII, 7/VII, 8/VIII, 9/IX, and 1..6 cohorts matched correctly while Roman and Arabic boundary regex strictly isolated other cohorts (e.g., target "10"/"X" does NOT match "XI", "XII", "100 RPL", or "101 TKJ").
   - `isTimeRangeOverlap` correctly evaluates bounded intervals (`sStart < bEnd && sEnd > bStart`), correctly rejects boundary touches, and safely defaults to full-day overlap for full-day rules or unbounded hours.
   - `SistemBlokView.tsx`, `HomeViewGuru.tsx`, and `GuruJurnal.tsx` UI structures are sound.
2. **Review-Only Constraint**:
   As EMPIRICAL CHALLENGER, I strictly refrained from modifying `src/lib/workflow.ts` implementation code. The fix must be applied by the worker agent.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES.**

Milestone 2 cannot be approved in its current state because of the critical false-positive matching bug in `evaluateScheduleBlock` when matching `targetGuruNama`.

### Concrete Required Fix for Worker Agent
In `src/lib/workflow.ts` lines 258-264, ensure `teacherNama` and `schedNamaGuru` are non-empty before evaluating `targetGuruNama.includes(...)`:

```typescript
      const namaMatches = Boolean(
        targetGuruNama &&
        ((teacherNama && (teacherNama.includes(targetGuruNama) || targetGuruNama.includes(teacherNama))) ||
          (schedNamaGuru && (schedNamaGuru.includes(targetGuruNama) || targetGuruNama.includes(schedNamaGuru))))
      );
```

---

## 5. Verification Method

To independently verify the bug and confirm remediation:

1. **Run the adversarial challenge test suite**:
   ```bash
   npx tsx tests/challenger_m2_matching_masking_stress.test.ts
   ```
   *Currently fails 2 out of 144 tests due to the empty-string inclusion bug.*

2. **Run existing suites**:
   ```bash
   npx tsx tests/sistem_blok_verification.test.ts
   npx tsx tests/m2_schedule_masking_workflow.test.ts
   ```

3. **Invalidation condition for this challenge**:
   Once Worker applies the guard check in `src/lib/workflow.ts`, running `npx tsx tests/challenger_m2_matching_masking_stress.test.ts` must yield:
   ```
   TOTAL ADVERSARIAL STRESS TESTS: 144
   PASSED: 144
   FAILED: 0
   ```
