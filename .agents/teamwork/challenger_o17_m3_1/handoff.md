# Empirical Adversarial Challenge Report: Milestone 3 (R3 Student Attendance & Piket Concurrency Lock)

**Challenger Agent ID**: `challenger_o17_m3_1`  
**Milestone**: Milestone 3 (R3 Student Attendance & Piket Flow)  
**Date**: 2026-10-08T17:11:30Z  
**Verdict**: **APPROVE**  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o17_m3_1`

---

## 1. Observation

Direct observations from codebase inspection, schema analysis, and execution of empirical stress harnesses:

1. **Concurrency Lock Core (`src/lib/piketLock.ts`)**:
   - `acquirePiketLock(supabase, sekolahId, tanggal, userId, userName, formType, leaseMinutes)`:
     - Lines 49-56: Queries `piket_form_lock` by `(sekolah_id, tanggal, form_type)`.
     - Lines 66-86: If active lock held by another teacher (`!isExpired && !isSameUser`), returns `{ success: false, lockInfo: { isLocked: true, lockedByOther: true, lockedBy: { userId, userName, lockedAt } } }`.
     - Lines 89-122: If expired or owned by caller, updates `locked_by_user_id`, `locked_by_user_name`, `locked_at`, and `expires_at` (`now + leaseMinutes`), returning `{ success: true, lockInfo: { isLocked: true, lockedByOther: false, ... } }`.
     - Lines 126-176: If no record exists, inserts new lock row. In race conditions colliding on PostgreSQL unique constraint `uq_piket_form_lock`, catches `insertErr`, queries `racedExisting`, and if held by another unexpired user, returns `{ success: false, lockInfo: { isLocked: true, lockedByOther: true, lockedBy: ... } }`.
   - `refreshPiketLock(supabase, lockId, userId, leaseMinutes)`:
     - Lines 223-230: Extends `expires_at` scoped strictly to `eq('id', lockId)` and `eq('locked_by_user_id', userId)`. Rejects unauthorized refresh attempts (`!updated`).
   - `releasePiketLock(supabase, lockId, userId)` & `releasePiketLockByParams(supabase, sekolahId, tanggal, userId, formType)`:
     - Lines 275-280 & Lines 299-306: Deletes lock row matching user ID. Rejects deletion if caller is not the lock owner.

2. **UI Integration in `src/components/PiketView.tsx`**:
   - Line 37: `const isFormLocked = Boolean(piketLockInfo?.lockedByOther);`
   - Lines 924-965: `useEffect` triggers `acquirePiketLock` upon activating the "Lapor" tab (`activeTab === 'lapor'`).
   - Lines 939-950: Launches a 60-second heartbeat interval calling `refreshPiketLock(supabase, activeLockIdRef.current, userId)`.
   - Lines 957-964: Cleanup on unmount/tab-switch clears heartbeat timer and calls `releasePiketLock`.
   - Lines 1259-1264: `handlePiketSubmit` calls `await releasePiketLock(...)` upon successful report submission.
   - Lines 3200-3209: Renders sticky alert banner `id="piket-form-lock-alert"` with text:
     `⚠️ Formulir Presensi Terkunci: Sedang diedit oleh ${piketLockInfo?.lockedBy?.userName || 'Petugas Piket lain'}. Untuk mencegah duplikasi/konflik data, formulir ini tidak dapat diubah sampai sesi selesai.`
   - Lines 3256-3259: Disables student attendance status buttons (`H`, `S`, `I`, `A`) (`disabled={isFormLocked}`).
   - Lines 3283-3286: Disables Catatan textarea (`disabled={isFormLocked}`).
   - Lines 3306, 3311: Guards camera capture and retake callbacks (`if (isFormLocked) return`).
   - Line 3330: Disables photo remove button (`disabled={isFormLocked}`).
   - Line 3345: Disables submit button (`disabled={loading || isFormLocked}`) and displays `Formulir Terkunci (Sedang Diedit)`.

3. **Empirical Challenger Stress Harness (`tests/challenger_m3_piket_concurrency_lock.test.ts`)**:
   - Executed 26 rigorous adversarial test cases across 6 suites:
     - **Suite 1 (Simultaneous Concurrency & Race Conditions)**: C1-01 (True concurrent race condition collision), C1-02 (Sequential lockout), C1-03 (10-user high concurrency swarm: exactly 1 winner, 9 locked out with winner's identity), C1-04 (Idempotent re-acquisition by same user).
     - **Suite 2 (Boundary & Partition Isolation)**: C2-01 (Multi-tenant School A vs School B isolation), C2-02 (Date partition isolation), C2-03 (Form type isolation).
     - **Suite 3 (5-Minute Lease Expiration & Clean Takeover)**: C3-01 (Lockout enforced at T = 4m 59s), C3-02 (Clean takeover at T = 5m 01s by User 2), C3-03 (Post-takeover lockout of stale User 1).
     - **Suite 4 (Heartbeat Renewal & Lease Extension)**: C4-01 (Heartbeat extends active lease by 5 minutes to T+9m), C4-02 (Heartbeat prevents premature takeover at T = 6m), C4-03 (Eventual expiry and takeover at T = 9m 01s after heartbeat stops), C4-04 (Unauthorized heartbeat rejection).
     - **Suite 5 (Lock Release on Submit & Unmount)**: C5-01 (Submit release enables immediate takeover), C5-02 (Unmount cleanup release enables immediate takeover), C5-03 (Parameter-based release fallback), C5-04 (Unauthorized release tamper rejection), C5-05 (Defensive validation of empty/null parameters).
     - **Suite 6 (UI Component Verification in PiketView.tsx)**: C6-01 (Banner and lock derivation), C6-02 (Disabled attendance buttons), C6-03 (Disabled notes textarea), C6-04 (Blocked camera callbacks and photo removal), C6-05 (Disabled submit button and locked badge), C6-06 (Lifecycle acquisition and unmount cleanup), C6-07 (Submit lock release).
   - Execution command: `npx tsx tests/challenger_m3_piket_concurrency_lock.test.ts`
   - Result: **26 / 26 PASSED (100%)**.

4. **Worker Milestone Test Suite (`tests/m3_student_attendance_piket_lock.test.ts`)**:
   - Execution command: `npx tsx tests/m3_student_attendance_piket_lock.test.ts`
   - Result: **17 / 17 PASSED (100%)**.

5. **E2E & Full Regression Suites**:
   - `npx tsc --noEmit`: 0 TypeScript errors.
   - `npm test`: All unit/adversarial suites passed.
   - `npx tsx tests/e2e/run_all_e2e.ts`: All 4 tiers passed 100%.
   - `npm run build`: Next.js 16.3.4 Turbopack build succeeded with 0 errors.

---

## 2. Logic Chain

1. **Race Condition Resilience**: In `acquirePiketLock`, simultaneous attempts by concurrent Piket teachers are mediated by the database unique constraint `uq_piket_form_lock(sekolah_id, tanggal, form_type)`. If two users insert at the exact same millisecond, the database admits one transaction and rejects the second with error code `23505`. `acquirePiketLock` intercepts this error, re-fetches the winner's lock, and sets `lockedByOther: true` disclosing the winning teacher's identity. This was empirically validated by test `C1-01` and the 10-user swarm `C1-03`.
2. **Lease Expiry & Takeover Safety**: A deadlocked system (where an unmounted tab or crashed browser freezes the form indefinitely) is prevented by the 5-minute lease model. Tests `C3-01` and `C3-02` prove that at 4 minutes 59 seconds the lock remains impenetrable (`lockedByOther: true`), but at 5 minutes 1 second an incoming teacher cleanly takes ownership without requiring administrative database intervention.
3. **Heartbeat Extension Efficacy**: During active data entry, a teacher working past 5 minutes is safeguarded by the 60-second heartbeat. Tests `C4-01` and `C4-02` confirm that heartbeat renewal extends the expiration timestamp, ensuring that at T = 6 minutes an external teacher attempting acquisition remains locked out.
4. **Immediate Clean Release Lifecycle**: Both user-initiated submission (`handlePiketSubmit`) and browser navigation/unmount invoke `releasePiketLock`. Tests `C5-01` and `C5-02` prove that the moment User 1 leaves or submits, User 2 can acquire the form instantly without waiting for the 5-minute timeout.
5. **Tamper Proofing**: Tests `C4-04` and `C5-04` demonstrate that User 2 cannot forge heartbeat updates or delete User 1's lock row, because all update and delete queries are strictly parameterized with `locked_by_user_id`.
6. **UI Enforcement**: In `PiketView.tsx`, `isFormLocked` disables all mutation vectors (attendance markers, notes, camera capture, photo delete, form submission) and renders a persistent banner with the occupying teacher's name.

---

## 3. Caveats

- **Supabase Production Migration**: The table `public.piket_form_lock` is defined in migration script `supabase/migrations/20261008_m3_piket_form_lock.sql`. Before production deployment, this migration must be applied to the remote PostgreSQL instance (e.g. via `supabase db push` or Supabase MCP). Local tests verify that the application code, mock drivers, and database types in `src/types/database.ts` are 100% compliant.
- **Client Offline Behavior**: If a client goes completely offline during an editing session, the heartbeat cannot reach Supabase. After 5 minutes of total disconnection, another teacher can assume the lock. This is the intended design of lease-based distributed locking to avoid unrecoverable deadlocks.

---

## 4. Conclusion

The implementation of the Piket Concurrency Lock in `src/lib/piketLock.ts` and `src/components/PiketView.tsx` is empirically robust, secure, and fully compliant with all Milestone 3 requirements:
1. Multi-user concurrent access locks out subsequent users with the winner's identity (`lockedByOther === true`).
2. Expired locks are cleanly taken over after 5 minutes.
3. Heartbeat renewals extend active leases and prevent premature lock releases.
4. Locks are released immediately upon submission and component unmount.
5. All UI inputs and submit buttons freeze when `isFormLocked === true`.

**Verdict: APPROVE**

---

## 5. Verification Method

To independently verify the empirical challenge results:

1. **Run the Adversarial Challenger Stress Harness**:
   ```powershell
   npx tsx tests/challenger_m3_piket_concurrency_lock.test.ts
   ```
   *Expected Output: 26 / 26 PASSED.*

2. **Run Worker Milestone 3 Test Suite**:
   ```powershell
   npx tsx tests/m3_student_attendance_piket_lock.test.ts
   ```
   *Expected Output: 17 / 17 PASSED.*

3. **Run TypeScript Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Output: 0 errors.*

4. **Run End-to-End Test Suite**:
   ```powershell
   npx tsx tests/e2e/run_all_e2e.ts
   ```
   *Expected Output: All 4 tiers pass (100%).*

5. **Run Next.js Production Build**:
   ```powershell
   npm run build
   ```
   *Expected Output: Compiled successfully without errors.*
