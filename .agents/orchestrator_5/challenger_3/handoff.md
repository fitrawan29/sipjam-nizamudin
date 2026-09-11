# Empirical Challenge Report & Handoff — Challenger 3

**Agent**: Challenger 3 (`teamwork_preview_challenger`)  
**Roles**: critic, specialist  
**Parent Agent**: `0436a7e8-c270-413c-bcf5-b9e753860f23` (Orchestrator)  
**Date**: 2026-09-12  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\challenger_3`  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

### A. Verification of Specific User Requests & Remediation Claims

1. **Pak Riski Candra Mamangkai (`username = 'Riski'` / `nama = 'Riski Candra Mamangkai'`):**
   - **Tool command**: `node --env-file=.env.local -r tsx/cjs tests/challenger3_schedule_stress.test.ts`
   - **Senin (Monday)**: `findJadwalForGuru('Senin', 'Riski Candra Mamangkai', 'Riski')` returns exactly 2 classes (`XI Merdeka Sejarah`, `XII Merdeka Sejarah`).
   - **Kamis (Thursday)**: `findJadwalForGuru('Kamis', 'Riski Candra Mamangkai', 'Riski')` returns exactly 1 class (`X Merdeka Sejarah`).
   - **Without username argument**: Both calls successfully return their respective classes.
   - **Other days (Selasa, Rabu, Jumat, Sabtu, Minggu)**: Returns 0 classes.
   - **Status**: **VERIFIED (PASS)**.

2. **Ibu Assyfa Fitra Azzahrah Abukasim (`username = 'Assyfa'` / `nama = 'Assyfa Fitra Azzahrah Abukasim'`):**
   - **Rabu (Wednesday)**: `findJadwalForGuru('Rabu', 'Assyfa Fitra Azzahrah Abukasim', 'Assyfa')` returns `[]` (0 classes).
   - **Without username argument**: `findJadwalForGuru('Rabu', 'Assyfa Fitra Azzahrah Abukasim')` returns `[]` (0 classes).
   - **Other days**: Returns 0 classes across all days.
   - **Status**: **VERIFIED (PASS)**.

3. **Pak FITRA SURYAZANA MAMONTO (`username = 'Fitra'` / `nama = 'FITRA SURYAZANA MAMONTO'`):**
   - **Rabu (Wednesday)**: `findJadwalForGuru('Rabu', 'FITRA SURYAZANA MAMONTO', 'Fitra')` returns exactly 3 PJOK classes (`X Merdeka PJOK`, `XI Merdeka PJOK`, `XII Merdeka PJOK`).
   - **Without username argument**: Returns exactly 3 PJOK classes.
   - **Status**: **VERIFIED (PASS)**.

4. **Supabase Database Row Standardization for `Riski` / `Rizki`:**
   - **Tool call**: Supabase MCP `execute_sql` on project `jicvvqxjyzntdrccnuyz`:
     ```sql
     SELECT id, hari, kelas, mata_pelajaran, nama_guru FROM public.jadwal_pelajaran WHERE nama_guru ILIKE '%risk%' OR nama_guru ILIKE '%rizk%';
     ```
   - **Result**:
     - ID `1788831035353`: `hari: 'Kamis', kelas: 'X Merdeka', mata_pelajaran: 'Sejarah', nama_guru: 'Riski'`
     - ID `1788831035361`: `hari: 'Senin', kelas: 'XI Merdeka', mata_pelajaran: 'Sejarah', nama_guru: 'Riski'`
     - ID `1788831035377`: `hari: 'Senin', kelas: 'XII Merdeka', mata_pelajaran: 'Sejarah', nama_guru: 'Riski'`
   - **Verification query**:
     ```sql
     SELECT count(*) FROM public.jadwal_pelajaran WHERE nama_guru = 'Rizki';
     ```
     Returned `count = 0`.
   - **Status**: **VERIFIED (PASS)**.

5. **Existing Automated Test Suites & Typecheck:**
   - Command: `node --env-file=.env.local -r tsx/cjs tests/dailyScheduleAndFixes.test.ts`  
     **Result**: Exited with code 0 (All 7 test cases passed).
   - Command: `npm test`  
     **Result**: Exited with code 0 (`ALL 11 TESTS PASSED!`, `ALL PRINT HEADER, GURU JURNAL & REKAP TESTS PASSED!`, `ALL QOL TESTS PASSED SUCCESSFULLY!`).
   - Command: `npx tsc --noEmit`  
     **Result**: Exited with code 0 (Zero TypeScript compilation errors).

---

### B. EMPIRICAL ADVERSARIAL DISCOVERY: Critical Token Prefix Collision Bug

While running an adversarial cross-user validation harness (`tests/challenger3_schedule_stress.test.ts` and `tests/matrix_check.ts`) across all 14 active teachers in `public.users` for all 6 active school days, a severe defect was discovered:

- **Verbatim Error Output from Test Harness**:
  ```text
  ❌ FAIL: Ade Fitrawan Ibrahim does NOT adopt Fitra PJOK classes on Rabu -> PJOK classes found: 3
  💥 CHALLENGER 3 HARNESS FAILED WITH 1 ERRORS!
  ```
- **Live Output from `tests/matrix_check.ts`**:
  ```text
  User: Fitrawan   (Ade Fitrawan Ibrahim     ) on Senin   -> 2 classes [Ade]: X Merdeka MTK, XI Merdeka MTK
  User: Fitrawan   (Ade Fitrawan Ibrahim     ) on Selasa  -> 1 classes [Ade]: X Merdeka MTK
  User: Fitrawan   (Ade Fitrawan Ibrahim     ) on Rabu    -> 3 classes [Fitra]: X Merdeka PJOK, XI Merdeka PJOK, XII Merdeka PJOK
  User: Fitrawan   (Ade Fitrawan Ibrahim     ) on Jumat   -> 2 classes [Ade]: XI Merdeka MTK, XII Merdeka MTK
  User: Fitrawan   (Ade Fitrawan Ibrahim     ) on Sabtu   -> 2 classes [Ade]: X Merdeka Informatika, XII Merdeka MTK
  ```
- **Code Inspection of `src/lib/workflow.ts` lines 56–62**:
  ```typescript
  // 1. Prioritaskan username matching jika disediakan
  if (userNorm) {
    if (userNorm === jNorm) return true;
    if (userNorm.length >= 3 && jNorm.length >= 3) {
      if (userNorm.startsWith(jNorm) || jNorm.startsWith(userNorm)) return true;
    }
  }
  ```
- **The Defect Mechanism**:
  1. Teacher `Ade Fitrawan Ibrahim` has `username = 'Fitrawan'`. His normalized username is `userNorm = 'fitrawan'`.
  2. Pak `FITRA SURYAZANA MAMONTO` teaches PJOK on Wednesdays with `nama_guru = 'Fitra'` in `jadwal_pelajaran`. His normalized schedule name is `jNorm = 'fitra'`.
  3. In line 60, `userNorm.startsWith(jNorm)` evaluates:
     `"fitrawan".startsWith("fitra")` -> **`true`**!
  4. Consequently, `findJadwalForGuru('Rabu', 'Ade Fitrawan Ibrahim', 'Fitrawan')` returns all 3 of Pak Fitra's Wednesday PJOK classes.
  5. Ade Fitrawan Ibrahim teaches MTK (Math) and Informatika on Monday, Tuesday, Friday, and Saturday. He has 0 teaching hours on Wednesday.
  6. **Production Impact**: When Ade Fitrawan Ibrahim logs into the application on Wednesday, his HomeView dashboard demands that he teach 3 PJOK classes (X Merdeka, XI Merdeka, XII Merdeka). Because he does not teach PJOK and has no PJOK option in his journal dropdown, he cannot submit matching journals, and his Presensi Pulang checkout is locked with: *"Anda belum menyelesaikan: Jurnal (KBM/Kegiatan)"*.

---

## 2. Logic Chain

1. *Observation*: Pak Riski's 3 Sejarah classes in `jadwal_pelajaran` were updated to `'Riski'`, and `findJadwalForGuru` on Senin (XI, XII) and Kamis (X) returns those classes accurately.
2. *Observation*: Ibu Assyfa's middle name `"Fitra"` no longer causes collisions because `workflow.ts` removed the whole-string token search `guruWords.includes(jNama)`.
3. *Observation*: In `src/lib/workflow.ts` line 60, `userNorm.startsWith(jNorm) || jNorm.startsWith(userNorm)` was added to match usernames to schedules.
4. *Observation*: Ade Fitrawan Ibrahim has username `"Fitrawan"`. Pak Fitra has schedule name `"Fitra"`.
5. *Observation*: `"fitrawan".startsWith("fitra")` is `true`. Ade has first name `"Ade"`, but line 60 executes *before* first name checks and immediately returns `true`.
6. *Inference*: Ade Fitrawan Ibrahim adopts Pak Fitra's 3 PJOK classes on Wednesdays.
7. *Observation*: An analysis of all 14 users in `public.users` reveals:
   - Every single user who legitimately uses username to match schedule (`Adnan`, `Ambar`, `Fitra`, `Fitri`, `Riski`, etc.) has `userNorm === jNorm` (EXACT MATCH).
   - The only user whose name differs from schedule is `Susana Muliono` (`nama_guru = 'Susan'`), but Susana matches via rule 3 (`firstName.startsWith(jNorm)` where `"susana".startsWith("susan")` is `true`), so she does NOT need line 60.
8. *Inference*: Line 60's prefix check (`userNorm.startsWith(jNorm) || jNorm.startsWith(userNorm)`) is completely redundant for valid teachers, and directly causes a critical false positive collision between `Fitrawan` and `Fitra`.
9. *Conclusion*: The schedule matching fix introduced a new collision defect for Pak Ade Fitrawan Ibrahim, requiring a targeted code change.

---

## 3. Caveats

- All database DDL, column migrations, backfill counts, and Kop Surat / Print formatting remain in working order.
- The defect is isolated specifically to line 60 of `src/lib/workflow.ts`.
- In strict adherence to the role constraint *"Review-only — do NOT modify implementation code"*, this agent has documented the exact failure and verified the remediation in standalone test harnesses without modifying production implementation code.

---

## 4. Conclusion & Required Changes

**Verdict**: **REQUEST_CHANGES**

To attain complete approval, the following fix must be applied by an implementer worker:

### Required Remediation in `src/lib/workflow.ts`:
Replace lines 56–62 of `src/lib/workflow.ts`:
```typescript
    // 1. Prioritaskan username matching jika disediakan
    if (userNorm) {
      if (userNorm === jNorm) return true;
      if (userNorm.length >= 3 && jNorm.length >= 3) {
        if (userNorm.startsWith(jNorm) || jNorm.startsWith(userNorm)) return true;
      }
    }
```
With exact username matching only:
```typescript
    // 1. Prioritaskan username matching jika disediakan (hanya exact match untuk mencegah collision seperti Fitrawan vs Fitra)
    if (userNorm && userNorm === jNorm) return true;
```

### Verified Impact of Remediation:
As proven by running `tests/matrix_check.ts`:
- `User: Fitrawan (Ade Fitrawan Ibrahim)` on Rabu receives **0 classes** (no longer adopts Pak Fitra's PJOK).
- `User: Fitra (FITRA SURYAZANA MAMONTO)` on Rabu continues to receive **3 PJOK classes**.
- `User: Adnan` on Jumat & Sabtu continues to receive his PAI classes.
- `User: Ambar` on Senin, Kamis, Jumat, Sabtu continues to receive her Kimia & Fisika classes.
- `User: Susana` on Rabu & Kamis continues to receive her PP classes (via `firstName.startsWith(jNorm)`).
- `User: Riski` on Senin & Kamis continues to receive his Sejarah classes.
- `User: Assyfa` continues to receive 0 classes.
- `All 14 teachers` match 100% cleanly with zero collisions across all 6 days.

---

## 5. Verification Method

To independently reproduce the bug and verify the fix:

1. **Run Challenger 3 Adversarial Test Harness (reproduces current failure)**:
   ```powershell
   node --env-file=.env.local -r tsx/cjs tests/challenger3_schedule_stress.test.ts
   ```
   *Current Result*: Fails on Section 4 (`Ade Fitrawan Ibrahim does NOT adopt Fitra PJOK classes on Rabu -> PJOK classes found: 3`).  
   *Expected Post-Fix Result*: Passes all sections with exit code 0.

2. **Run Matrix Check of All Users**:
   ```powershell
   node --env-file=.env.local -r tsx/cjs tests/matrix_check.ts
   ```
   *Current Result*: Shows `User: Fitrawan ... on Rabu -> 3 classes [Fitra]`.  
   *Expected Post-Fix Result*: Ade Fitrawan Ibrahim has no classes on Rabu.

3. **Verify Standard Test Suites & Compilation**:
   ```powershell
   node --env-file=.env.local -r tsx/cjs tests/dailyScheduleAndFixes.test.ts
   npm test
   npx tsc --noEmit
   ```
   *Expected*: All pass with exit code 0.
