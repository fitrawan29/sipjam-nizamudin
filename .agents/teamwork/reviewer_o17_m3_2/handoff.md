# Handoff Report: Milestone 3 Review (R3 Student Attendance & Piket Flow)

**Reviewer ID**: `reviewer_o17_m3_2` (Reviewer 2 / Adversarial Critic)  
**Milestone**: Milestone 3 (R3 Student Attendance & Piket Flow)  
**Date**: 2026-10-08  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_o17_m3_2`  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct observations and evidence collected from codebase inspection and command executions:

1. **Database Schema & Types**:
   - `supabase/migrations/20261008_m3_piket_form_lock.sql` (lines 5-15) defines table `public.piket_form_lock` with columns `id`, `sekolah_id`, `tanggal`, `form_type`, `locked_by_user_id`, `locked_by_user_name`, `locked_at`, `expires_at`, and unique constraint:
     ```sql
     CONSTRAINT uq_piket_form_lock UNIQUE (sekolah_id, tanggal, form_type)
     ```
     as well as lookup index `idx_piket_form_lock_lookup` and Row Level Security policies.
   - `src/types/database.ts` (lines 1603-1643 and 1971-1973) includes full TypeScript definitions for `piket_form_lock` (`Row`, `Insert`, `Update`) and exports `PiketFormLock`, `PiketFormLockInsert`, and `PiketFormLockUpdate`.

2. **Concurrency Lock Implementation (`src/lib/piketLock.ts`)**:
   - `acquirePiketLock` (lines 35-199): Queries active locks with `eq('sekolah_id', sekolahId).eq('tanggal', tanggal).eq('form_type', formType)`.
     - When an unexpired lock is held by another user (`!isExpired && !isSameUser`), it returns `success: false` and `lockInfo.lockedByOther: true` with locker details (`userId`, `userName`, `lockedAt`).
     - When no lock exists, it inserts a new lock record. In case of an insert race condition collision (`insertErr`), it safely re-fetches and checks if another user successfully acquired the lock.
     - When a lock is expired or belongs to the current user, it extends or takes over the lease by updating `locked_by_user_id`, `locked_at`, and `expires_at`.
   - `refreshPiketLock` (lines 204-261): Extends the expiration timestamp for the current user's active lease.
   - `releasePiketLock` (lines 266-284) and `releasePiketLockByParams` (lines 289-311): Cleans up lock records on component unmount or form submission.

3. **Piket View Integration & UI Disablement (`src/components/PiketView.tsx`)**:
   - Tab switch hook (lines 924-965): Acquires lock when `activeTab === 'lapor' && user` and starts a 60-second heartbeat calling `refreshPiketLock`. Releases lock on unmount or tab switch away from `'lapor'`.
   - State guard: Line 37 calculates `isFormLocked = Boolean(piketLockInfo?.lockedByOther)`.
   - Lock banner (lines 3198-3210): Renders sticky alert banner:
     ```tsx
     ⚠️ Formulir Presensi Terkunci: Sedang diedit oleh {piketLockInfo?.lockedBy?.userName || 'Petugas Piket lain'}. Untuk mencegah duplikasi/konflik data, formulir ini tidak dapat diubah sampai sesi selesai.
     ```
   - Input & button disablement:
     - Student attendance buttons ('H', 'S', 'I', 'A') are disabled (`disabled={isFormLocked}`, line 3256) and blocked inside `handlePiketAbsensiChange` (line 1121).
     - Special notes textarea is disabled (`disabled={isFormLocked}`, line 3283).
     - Camera capture handlers return early if locked (lines 3306, 3311).
     - Submit button is disabled (`disabled={loading || isFormLocked}`, line 3345) and displays lock icon text "Formulir Terkunci (Sedang Diedit)".
     - Form submit handler `handlePiketSubmit` checks `if (isFormLocked)` and aborts immediately (line 1162).
     - On successful submission, line 1258 explicitly releases the lock.

4. **Gate-to-Mapel Sync & Truancy Detection (`src/components/GuruJurnal.tsx`)**:
   - Querying gate check-ins (lines 558-577): Queries `presensi_siswa` for arrivals (`status = 'datang'`) for current class and date, populating `piketAttendance` indexed by `nisn` and `siswa_id`.
   - Roster rendering (lines 1264-1320):
     - Calculates `truantCount` for students present at gate but marked `Alpa` in journal (`absensi[s.nisn] === 'A'`).
     - Renders top alert banner: `⚠️ Perhatian: Terdeteksi ${truantCount} siswa bolos (hadir di gerbang sekolah namun Alpa pada jam pelajaran ini).`
     - Renders row warning badge: `⚠️ Terindikasi Bolos (Hadir Gerbang ${pRec.jam}, Alpa Mapel)`.
   - Status update logging (lines 623-670): In `handleAbsensiChange`, if student is truant, appends to `log_perubahan`:
     ```
     [${nowWita} WITA] Terindikasi Bolos: Hadir di Gerbang Piket (${pRec.jam}), tetapi ditandai Alpa oleh ${user?.nama || 'Guru Mapel'} (${mapel || 'Mapel'})
     ```
     and sets `keterangan: 'Terindikasi Bolos (Hadir Gerbang ${pRec.jam}, Alpa Mapel)'`.
   - Quick batch sync (lines 607-621): `handleApplyPiketAttendance` allows teachers to mark all gate-present students as 'Hadir' with a single click.

5. **Role-Based Access Control (RBAC)**:
   - `src/components/RekapSiswaView.tsx` (lines 626-640): Blocks non-Wali teachers with a dedicated "Akses Terblokir" screen.
   - `src/components/RekapSiswaView.tsx` (lines 363-390, 921-949): Non-admin teachers are restricted to `allowedClasses` (their assigned homeroom classes). Attempting to fetch other classes displays an "Akses Ditolak" alert.
   - `src/components/PiketView.tsx` (lines 2801-2820, line 3196): Only teachers assigned to duty today (`dailyState.isPiket`) or administrators can access reporting functions.
   - `src/components/GuruJurnal.tsx` (lines 115-180): Teaching journal sessions strictly scoped to assigned `guru_mapel`.

6. **Execution of Verification Commands**:
   - `npx tsc --noEmit`: Exited with code 0 (zero errors).
   - `npx tsx tests/m3_student_attendance_piket_lock.test.ts`: Exited with code 0 (17 / 17 passed).
   - `npm test`: Exited with code 0 (27 test suites passed 100%).
   - `npx tsx tests/e2e/run_all_e2e.ts`: Exited with code 0 (all 4 tiers passed 100%).
   - `npm run build`: Exited with code 0 (Next.js 16 production build succeeded).
   - `npx tsx tests/m2_teacher_attendance_verification.test.ts`: Exited with code 0 (12 / 12 passed, zero regressions).

---

## 2. Logic Chain

1. **Concurrency Lock Soundness**:
   - Observations 1 & 2 confirm that concurrency locks use a database-backed unique constraint `(sekolah_id, tanggal, form_type)`. Simultaneous requests cannot generate duplicate lock records.
   - Observation 2 confirms that stale or abandoned locks automatically expire after 5 minutes, preventing deadlock if a browser terminates abruptly.
   - Observation 3 confirms that UI enforcement is comprehensive: buttons, textarea, photo controls, and form submission are all completely disabled, eliminating accidental duplicate writes.

2. **Truancy Detection & Audit Reliability**:
   - Observation 4 confirms that gate arrival data (`presensi_siswa`) is synchronized directly into the subject teacher's journal view.
   - When a student who entered through the gate is marked `Alpa`, the system triggers both immediate visual feedback (sticky banner, animated row badge) and tamper-evident audit logging in `absensi.log_perubahan`.
   - Reverting the status to `Hadir` cleanly dismisses the visual truancy indicator while maintaining the historical log entry.

3. **RBAC Isolation Guarantee**:
   - Observation 5 confirms that student attendance controls are restricted by role: Mapel teachers are confined to their teaching periods, Piket teachers can only report on their assigned duty days, and student recap / homeroom attendance is locked exclusively to assigned Wali Kelas and Administrators.

4. **Integrity & Code Quality**:
   - Code inspections revealed zero hardcoded dummy return values, facade implementations, or bypasses.
   - All tests execute real queries/logic and verify genuine behavioral outputs.

---

## 3. Caveats

- **Network Disconnections & Lease Expiration**: As with all lease-based distributed locks, if a user experiences a sustained network disconnection exceeding the 5-minute lease duration, another authorized Piket user can acquire the lock. Upon reconnection, the original user's next heartbeat will detect the takeover and transition their UI into locked mode. This is expected behavior and avoids permanent deadlocks.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 3 (R3 Student Attendance & Piket Flow) is fully implemented, verified, and free of defects or integrity violations:
- Database schema and TypeScript models are complete and accurate.
- Concurrency locks effectively eliminate duplicate data submissions across concurrent Piket teachers.
- Gate-to-Mapel attendance synchronization and truancy detection function correctly with proper audit trails.
- RBAC rules for Mapel, Wali Kelas, and Piket roles are strictly enforced across all relevant components.
- All test suites, end-to-end scenarios, typechecks, and production builds pass with 100% success.

---

## 5. Verification Method

To independently reproduce the verification:

1. **Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected: Exit code 0, zero errors.*

2. **Milestone 3 Dedicated Test Suite**:
   ```powershell
   npx tsx tests/m3_student_attendance_piket_lock.test.ts
   ```
   *Expected: 17 / 17 passed.*

3. **Milestone 2 Regression Test Suite**:
   ```powershell
   npx tsx tests/m2_teacher_attendance_verification.test.ts
   ```
   *Expected: 12 / 12 passed.*

4. **Full Test Suite**:
   ```powershell
   npm test
   ```
   *Expected: 27 test files pass 100%.*

5. **End-to-End Test Suite**:
   ```powershell
   npx tsx tests/e2e/run_all_e2e.ts
   ```
   *Expected: All 4 tiers pass 100%.*

6. **Production Build**:
   ```powershell
   npm run build
   ```
   *Expected: Exit code 0, successful production build.*
