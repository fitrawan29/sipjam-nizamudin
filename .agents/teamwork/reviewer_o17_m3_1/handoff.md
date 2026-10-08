# Handoff Report: Reviewer 1 — Milestone 3 (R3 Student Attendance & Piket Flow)

**Agent**: `reviewer_o17_m3_1` (Reviewer & Critic)  
**Milestone**: Milestone 3 (R3 Student Attendance & Piket Flow)  
**Date**: 2026-10-08  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_o17_m3_1`  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct observations and execution results gathered during the review and adversarial audit:

1. **Database Schema & Types**:
   - `supabase/migrations/20261008_m3_piket_form_lock.sql` (lines 5–15):
     Creates table `public.piket_form_lock` with `id UUID`, `sekolah_id UUID`, `tanggal DATE`, `form_type TEXT`, `locked_by_user_id TEXT`, `locked_by_user_name TEXT`, `locked_at TIMESTAMPTZ`, `expires_at TIMESTAMPTZ`, and unique constraint:
     `CONSTRAINT uq_piket_form_lock UNIQUE (sekolah_id, tanggal, form_type)`.
     Index `idx_piket_form_lock_lookup` on lines 18–19 and RLS policies on lines 21–35.
   - `src/types/database.ts`:
     Lines 1603–1643 declare `piket_form_lock` inside `Database['public']['Tables']` for `Row`, `Insert`, `Update`, and `Relationships`.
     Lines 1971–1973 export domain type aliases `PiketFormLock`, `PiketFormLockInsert`, and `PiketFormLockUpdate`.

2. **Concurrency Lock Manager (`src/lib/piketLock.ts`)**:
   - `acquirePiketLock` (lines 35–199): Queries active lock by `(sekolah_id, tanggal, form_type)`. If unexpired and held by another user (`!isExpired && !isSameUser`), returns `{ success: false, lockInfo: { isLocked: true, lockedByOther: true, lockedBy: ... } }`. If expired or same user, extends lease. If not found, inserts new lock. Handles race collision on unique constraint by re-fetching and returning locker details.
   - `refreshPiketLock` (lines 204–261): Renews lease by updating `expires_at` matching `id = lockId` and `locked_by_user_id = userId`.
   - `releasePiketLock` (lines 266–284) & `releasePiketLockByParams` (lines 289–311): Deletes lock with user verification (`locked_by_user_id = userId`).

3. **PiketView Integration (`src/components/PiketView.tsx`)**:
   - Lines 924–965: When `activeTab === 'lapor'`, `useEffect` invokes `acquirePiketLock` with current user credentials, sets up 60-second heartbeat calling `refreshPiketLock`, and cleans up on unmount or tab switch with `releasePiketLock`.
   - Lines 3198–3209: Prominent sticky banner renders when `isFormLocked`:
     `⚠️ Formulir Presensi Terkunci: Sedang diedit oleh ${piketLockInfo?.lockedBy?.userName || 'Petugas Piket lain'}. Untuk mencegah duplikasi/konflik data, formulir ini tidak dapat diubah sampai sesi selesai.`
   - Lines 3256–3270: Student attendance buttons ('H', 'S', 'I', 'A') disabled (`disabled={isFormLocked}`).
   - Lines 3283–3286: Catatan textarea disabled (`disabled={isFormLocked}`).
   - Lines 3306, 3311: Camera capture and retake callbacks guarded (`if (isFormLocked) return;`).
   - Line 3330: Photo removal button disabled (`disabled={isFormLocked}`).
   - Lines 3345–3355: Submit button disabled (`disabled={loading || isFormLocked}`) rendering lock icon and text `"Formulir Terkunci (Sedang Diedit)"`.
   - Lines 1121, 1162: Handlers `handlePiketAbsensiChange` and `handlePiketSubmit` reject execution when locked with toast warning.
   - Lines 1258–1264: `handlePiketSubmit` releases lock upon successful save.

4. **Gate-to-Mapel Sync & Truancy Detection (`src/components/GuruJurnal.tsx`)**:
   - Lines 558–577: Queries arrival records from `presensi_siswa` where `status = 'datang'`, `kelas = kelas`, and `tanggal = tgl`, mapping records into `piketAttendance`.
   - Lines 640–655: In `handleAbsensiChange`, evaluates truancy condition:
     `const pRec = (student.nisn && piketAttendance[student.nisn]) || (student.id && piketAttendance[student.id]) || piketAttendance[nisn];`
     `const isTruant = status === 'A' && Boolean(pRec);`
     If truant, records WITA timestamped log into `absensi.log_perubahan` and sets `keterangan`:
     `[${nowWita} WITA] Terindikasi Bolos: Hadir di Gerbang Piket (${pRec.jam}), tetapi ditandai Alpa oleh ${user?.nama || 'Guru Mapel'} (${mapel || 'Mapel'})`
   - Lines 1272–1280: Prominent top warning banner displayed when `truantCount > 0`:
     `⚠️ Perhatian: Terdeteksi ${truantCount} siswa bolos (hadir di gerbang sekolah namun Alpa pada jam pelajaran ini).`
   - Lines 1305–1308: Student row badge rendered for truant student:
     `⚠️ Terindikasi Bolos (Hadir Gerbang ${pRec.jam}, Alpa Mapel)`
   - Lines 1285–1292: "Terapkan Presensi Piket" button syncs gate-present students to classroom roster with one click.

5. **Role-Based Access Control (RBAC)**:
   - Non-admin / Non-Wali teacher opening `RekapSiswaView.tsx` (lines 626–640): Renders fallback `"Akses Terblokir"` card.
   - Homeroom teacher in `RekapSiswaView.tsx` (lines 363–388, 1210–1225): `allowedClasses` locks teacher exclusively to assigned class, preventing selection of other classes.
   - Non-duty teacher opening `PiketView.tsx` (lines 1501–1518): Renders fallback `"Bukan Jadwal Piket Hari Ini"` card, and `canReport` requires `dailyState.isPiket` (lines 1496–1499).
   - Subject teacher in `GuruJurnal.tsx` (lines 300–355): Scoped strictly to assigned `guru_mapel` / `jadwal_pelajaran`.

6. **Integrity Violations Check**:
   - No hardcoded test results embedded in source code.
   - No dummy/facade implementations; full logic backed by database schema and real UI state.
   - No shortcuts or bypassed tasks.
   - All tests run and verified independently.

7. **Verification Command Results**:
   - `npx tsc --noEmit` -> Exited 0 (zero errors).
   - `npx tsx tests/m3_student_attendance_piket_lock.test.ts` -> Exited 0 (17 / 17 passed).
   - `npx tsx tests/adversarial_m3_truancy_rbac_challenger.test.ts` -> Exited 0 (17 / 17 passed).
   - `npx tsx tests/challenger_m3_piket_concurrency_lock.test.ts` -> Exited 0 (26 / 26 passed).
   - `npx tsx tests/m2_teacher_attendance_verification.test.ts` -> Exited 0 (12 / 12 passed).
   - `npm test` -> Exited 0 (all test suites passed).
   - `npx tsx tests/e2e/run_all_e2e.ts` -> Exited 0 (all 4 tiers passed 100%).
   - `npm run build` -> Exited 0 (compiled successfully in 2.6s, all static and dynamic pages generated).

---

## 2. Logic Chain

1. **Concurrency Protection**: The database unique constraint `uq_piket_form_lock (sekolah_id, tanggal, form_type)` guarantees mutual exclusion at the storage level, eliminating double entry even under high concurrent load. The 5-minute lease model with 60-second heartbeat ensures that idle, crashed, or closed tabs release their lock without deadlocks.
2. **UI Disablement & Feedback**: Disabling attendance buttons, textarea, photo removal, and the submit button, accompanied by a sticky warning banner and action-interception toasts, ensures that teachers immediately understand why editing is restricted and cannot inadvertently overwrite active submissions.
3. **Truancy Detection Accuracy**: Gate arrivals are strictly filtered by `status = 'datang'` from `presensi_siswa`. Truancy is flagged only when `pRec` exists and the teacher actively assigns status `'A'` (Alpa). When teachers mark `'H'`, `'S'`, or `'I'`, no truancy is flagged. When a student was never recorded at the gate, ordinary Alpa does not trigger truancy.
4. **Multi-Layer RBAC Robustness**: Security boundaries are enforced across all three layers: sidebar navigation omission, route selection guards (`AppScreen.tsx`), and inner JSX fallback blocks (`RekapSiswaView.tsx` and `PiketView.tsx`). Homeroom teachers are strictly confined to their own class, and duty teachers are confined to their assigned duty days.
5. **No Regressions**: Prior milestones (M1 notification snooze and camera, M2 teacher multi-state attendance and auto-checkout) continue to pass all regression suites (12/12 in M2 tests, 100% across all 4 E2E tiers).

---

## 3. Caveats

1. In network offline situations, if the client is unable to reach the server, the 5-minute lease will expire naturally and allow another teacher to take over. This is the intended behavior of distributed lease locks to prevent permanent lockouts.
2. In `GuruJurnal.tsx`, if a student was marked Alpa and subsequently changed back to Hadir, the UI warning badge and banner disappear immediately, and the change is logged in `absensi.log_perubahan`. The `absensi.keterangan` column retains the previous note for audit trail unless overwritten by another note.

---

## 4. Conclusion

**Verdict: APPROVE**

The work product for Milestone 3 (R3 Student Attendance & Piket Flow) is complete, robust, verified, and free of integrity violations. All requirements and acceptance criteria specified in `PROJECT.md` and `ORIGINAL_REQUEST.md` are satisfied.

---

## 5. Verification Method

To independently verify this evaluation, execute the following commands in order:

```powershell
# 1. Type check
npx tsc --noEmit

# 2. Milestone 3 primary test suite
npx tsx tests/m3_student_attendance_piket_lock.test.ts

# 3. Milestone 3 adversarial challenger test suites
npx tsx tests/adversarial_m3_truancy_rbac_challenger.test.ts
npx tsx tests/challenger_m3_piket_concurrency_lock.test.ts

# 4. Milestone 2 regression test suite
npx tsx tests/m2_teacher_attendance_verification.test.ts

# 5. Full test suite
npm test

# 6. E2E full test suite
npx tsx tests/e2e/run_all_e2e.ts

# 7. Production build
npm run build
```

**Invalidation conditions**:
- Any TypeScript error emitted by `tsc --noEmit`.
- Any assertion failure in `tests/m3_student_attendance_piket_lock.test.ts` or adversarial suites.
- Any failure in `npm test` or `npm run build`.
