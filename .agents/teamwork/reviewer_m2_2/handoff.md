# Handoff Report: Reviewer M2-2 — Architecture & Adversarial Review of Milestone 2

## 1. Observation

### Verification Commands & Test Results
1. **Static Typing Check**:
   - Command: `npx tsc --noEmit`
   - Result: Exited with code 0 (zero static typing errors).
2. **Regression Verification Suite**:
   - Command: `npx tsx tests/sistem_blok_verification.test.ts`
   - Result:
     ```
     TOTAL TESTS: 85
     PASSED: 85
     FAILED: 0
     🎉 ALL SISTEM BLOK VERIFICATION TESTS PASSED!
     ```
3. **M2 Worker Test Suite**:
   - Command: `npx tsx tests/m2_schedule_masking_workflow.test.ts`
   - Result:
     ```
     TOTAL M2 TESTS: 74
     PASSED: 74
     FAILED: 0
     ```
4. **Dual Journal & Mixed Schedule Challenger Suite**:
   - Command: `npx tsx tests/challenger_m2_2_mixed_schedule_journal.test.ts`
   - Result:
     ```
     TOTAL CHALLENGER TESTS: 52
     PASSED: 52
     FAILED: 0
     ```
5. **Adversarial Stress Test Suite**:
   - Command: `npx tsx tests/challenger_m2_matching_masking_stress.test.ts`
   - Result:
     ```
     TOTAL ADVERSARIAL STRESS TESTS: 144
     PASSED: 142
     FAILED: 2
     ```
   - Failing tests:
     * `❌ FAIL: Multi-Rule: Bu Siti afternoon Class X is UNBLOCKED (after block hours)`
     * `❌ FAIL: Empty teacher object with teacher-targeted rule evaluates safely to unblocked`

---

### Code Inspections & Root Cause Identification

#### A. Integrity Violation Audit
- Codebase examined: `src/lib/workflow.ts`, `src/components/HomeViewGuru.tsx`, `src/components/GuruJurnal.tsx`.
- Findings:
  * No hardcoded test answers or dummy return values found.
  * Real Supabase database queries and actual entity mutations are executed.
  * No facades or shortcuts detected.
  * Integrity status: **CLEAN (No integrity violations detected)**.

#### B. Flaw in `src/lib/workflow.ts` (lines 258-272)
In `evaluateScheduleBlock`:
```typescript
247: const teacherNama = String(teacher.nama || teacher.nama_guru || '').trim().toLowerCase();
248: const schedNamaGuru = String(schedule.nama_guru || '').trim().toLowerCase();
...
258: const namaMatches = Boolean(
259:   targetGuruNama &&
260:   (teacherNama.includes(targetGuruNama) ||
261:     targetGuruNama.includes(teacherNama) ||
262:     schedNamaGuru.includes(targetGuruNama) ||
263:     targetGuruNama.includes(schedNamaGuru))
264: );
265:
266: const fallbackMatches = Boolean(
267:   targetGuruId &&
268:   (teacherNama.includes(targetGuruId) ||
269:     schedNamaGuru.includes(targetGuruId))
270: );
```
- In JavaScript, `anyString.includes('')` evaluates to `true`.
- When a block rule targets a teacher (`tipe_target === 'guru'`) with `target_guru_nama = 'Pak Budi'`:
  1. If a schedule item has no `nama_guru` (e.g. `schedule = { kelas: 'X Merdeka', jam_mulai: '12:30', jam_selesai: '14:00' }`), `schedNamaGuru` becomes `""`.
  2. Line 263 evaluates: `targetGuruNama.includes("")`, which returns `true`.
  3. Consequently, `namaMatches` evaluates to `true`, and the schedule is falsely marked `isBlocked = true` by Pak Budi's rule, even if taught by Bu Siti or anyone else!
  4. If an empty teacher object (`teacher = {}`) is passed, `teacherNama` is `""`, and line 261 `targetGuruNama.includes("")` evaluates to `true`.

#### C. Edge Case: SD Grade 1 vs Class Section Suffix in `isKelasInAngkatan`
In `src/lib/workflow.ts` (lines 146-152):
```typescript
if (/^\d+$/.test(token)) {
  const numRegex = new RegExp(`(^|[^0-9])${token}([^0-9]|$)`, 'i');
  return numRegex.test(k);
}
```
- If an admin configures an angkatan rule for grade `1` (typical in elementary school / SD), `numRegex` is `(^|[^0-9])1([^0-9]|$)`.
- A high school class like `"X TKJ 1"` matches token `1` at the end (`TKJ 1`).
- While SMK schools typically configure angkatan `10, 11, 12`, grade-token matching should ideally avoid matching trailing section numbers.

#### D. Time Parsing & Overlap Robustness
- In `parseTimeToMinutes`:
  * Format `"7:30"` (no leading zero) -> `450` (Pass)
  * Format `"07.30"` (dot notation) -> `450` (Pass)
  * Format `"7.30"` (no leading zero + dot) -> `450` (Pass)
  * Format `"07:30:00"` (with seconds) -> `450` (Pass)
  * Edge cases `null`, `""`, `"abc"` -> fallback handled cleanly without throwing.
- In `isTimeRangeOverlap`:
  * Full day (`is_full_day: true`) -> always true (Pass).
  * Boundary touch (`07:00-07:30` vs `07:30-11:00`) -> does not overlap (Pass).
  * Interval crossing midnight (e.g. `23:00 - 02:00`): Evaluates within a single calendar day (00:00 - 24:00). In Indonesian KBM school operations, schedules operate exclusively between 06:30 and 17:00, so midnight crossing does not occur in practice.

#### E. Mixed Schedule UI Rendering (`HomeViewGuru.tsx`)
- Correctly renders `"Campuran"` badge in header when some schedules are blocked and others unblocked (`dailyState.hasBlockedSchedule && !dailyState.isBlok`).
- Blocked schedules are rendered in distinct amber styling with `"Kegiatan Blok"` badge, block name, and button `"Isi Jurnal Kegiatan"`.
- Unblocked schedules are rendered as active KBM cards with standard `"Isi Jurnal"` / `"Sudah Diisi"` state.
- Grid layout (`grid grid-cols-1 sm:grid-cols-2`) and flex containers remain balanced with zero layout breakage.

#### F. Dual Journal Input Switching (`GuruJurnal.tsx`)
- In mixed mode (`hasBlockedSchedule && !isBlok`), the journal mode selector dropdown is enabled, allowing teachers to toggle between `Jurnal KBM` and `Jurnal Kegiatan`.
- Switching to `Jurnal Kegiatan`:
  * Pre-fills `materi` with block activity name.
  * Conditionally hides KBM-specific inputs (mapel, kelas, kehadiran siswa, kktp, tujuan pembelajaran).
  * On submit, sets `mapel = '-'` and `kelas = '-'`.
- Switching back to `Jurnal KBM`:
  * Draft inputs (`tujuanPembelajaran`, `kktp`, `konten`, `kegiatan`) are safely retained in component state and localStorage draft.
  * Validates all required KBM fields.
- Post-submit reset:
  * Cleans all fields, removes draft from storage, and refreshes daily state.

---

## 2. Logic Chain

1. **Integrity Verification**:
   The implementation is genuine: no hardcoded test answers, fake stubs, or bypasses exist.
2. **Adversarial Failure Trace**:
   Running the comprehensive adversarial test `challenger_m2_matching_masking_stress.test.ts` revealed that 2 out of 144 tests fail.
3. **Root Cause Analysis**:
   Tracing the failure in Scenario 6.2 directly led to line 263 in `src/lib/workflow.ts`:
   `targetGuruNama.includes(schedNamaGuru)`
   In JavaScript, `String.prototype.includes("")` always returns `true`. If a schedule object omits `nama_guru` or has an empty string, or if a teacher object has an empty `nama`, `namaMatches` inadvertently evaluates to `true`.
4. **Impact Assessment (Blast Radius)**:
   In a multi-rule environment where an admin defines a teacher-specific block (e.g. Pak Budi assigned to MGMP from 11:00 to 14:00), any schedule belonging to another teacher that is queried or stored without an explicit `nama_guru` attribute will be falsely masked as blocked by Pak Budi's rule.
5. **Required Fix**:
   `teacherNama` and `schedNamaGuru` must be verified as non-empty before invoking `.includes()`, e.g.:
   ```typescript
   const namaMatches = Boolean(
     targetGuruNama &&
     ((teacherNama && (teacherNama.includes(targetGuruNama) || targetGuruNama.includes(teacherNama))) ||
      (schedNamaGuru && (schedNamaGuru.includes(targetGuruNama) || targetGuruNama.includes(schedNamaGuru))))
   );

   const fallbackMatches = Boolean(
     targetGuruId &&
     ((teacherNama && teacherNama.includes(targetGuruId)) ||
      (schedNamaGuru && schedNamaGuru.includes(targetGuruId)))
   );
   ```

---

## 3. Caveats

1. **Midnight-Crossing Blocks**:
   `isTimeRangeOverlap` assumes daytime single-day intervals (`00:00` - `24:00`). If an admin enters `jam_mulai: "22:00"` and `jam_selesai: "02:00"`, the start minute (`1320`) exceeds the end minute (`120`), so standard daytime schedules will not overlap. This is standard for Indonesian school KBM schedules, but an explicit validation in Admin UI to enforce `jam_selesai > jam_mulai` is recommended.
2. **Elementary Grade 1 Token Suffix**:
   `isKelasInAngkatan("X TKJ 1", "1")` returns `true` because the regex detects boundary-wrapped `'1'`. For high schools where angkatan is 10, 11, 12, this does not manifest unless an admin configures angkatan `1`.

---

## 4. Conclusion

### Verdict: **REQUEST_CHANGES**

While the core functionality of Milestone 2 (schedule masking, mixed layout rendering in `HomeViewGuru.tsx`, dual journaling in `GuruJurnal.tsx`, and time parsing) is implemented and passes standard test suites, the matching engine in `src/lib/workflow.ts` contains a critical string inclusion bug where `targetGuruNama.includes("")` evaluates to `true`.

This bug causes teacher-targeted block rules to falsely match schedules and teacher objects lacking `nama_guru`, breaking strict teacher isolation and causing test failures in `tests/challenger_m2_matching_masking_stress.test.ts`.

Worker must patch `src/lib/workflow.ts` lines 258-272 to ensure empty strings are not matched via `.includes()`.

---

## 5. Verification Method

To verify the resolution of this issue:

```bash
# 1. Typecheck the codebase
npx tsc --noEmit

# 2. Run existing verification suite
npx tsx tests/sistem_blok_verification.test.ts

# 3. Run Milestone 2 workflow test suite
npx tsx tests/m2_schedule_masking_workflow.test.ts

# 4. Run adversarial stress test suite (MUST PASS 144/144)
npx tsx tests/challenger_m2_matching_masking_stress.test.ts

# 5. Run challenger dual journal test suite (MUST PASS 52/52)
npx tsx tests/challenger_m2_2_mixed_schedule_journal.test.ts
```

### Invalidation Conditions:
- Any test failure in `tests/challenger_m2_matching_masking_stress.test.ts` (currently 2 failing).
- Any false positive block evaluation when a schedule lacks `nama_guru` while a teacher block rule is active.
