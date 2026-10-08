# Forensic Audit Report: Milestone 3 (R3 Student Attendance & Piket Flow)

**Auditor Agent**: `auditor_o17_m3_1`  
**Milestone**: Milestone 3 (R3 Student Attendance & Piket Flow)  
**Profile**: General Project  
**Integrity Mode**: Benchmark  
**Verdict**: **CLEAN**  

---

## 1. Observation

Direct empirical observations from codebase inspection, schema definitions, and independent tool executions:

### A. Database Migration & Typing
1. `supabase/migrations/20261008_m3_piket_form_lock.sql` defines:
   - Table `public.piket_form_lock` with columns:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE`
     - `tanggal DATE NOT NULL`
     - `form_type TEXT NOT NULL DEFAULT 'student_attendance'`
     - `locked_by_user_id TEXT NOT NULL`
     - `locked_by_user_name TEXT NOT NULL`
     - `locked_at TIMESTAMPTZ NOT NULL DEFAULT now()`
     - `expires_at TIMESTAMPTZ NOT NULL`
     - `CONSTRAINT uq_piket_form_lock UNIQUE (sekolah_id, tanggal, form_type)`
   - Index `idx_piket_form_lock_lookup ON public.piket_form_lock(sekolah_id, tanggal, form_type)`
   - Row Level Security enabled with school-scoped SELECT and ALL policies.
2. `src/types/database.ts`:
   - Lines 1603–1643: Declares `piket_form_lock` with complete `Row`, `Insert`, and `Update` interfaces and foreign key relationships to `sekolah`.
   - Lines 1971–1973: Exports domain type aliases:
     ```ts
     export type PiketFormLock = Tables<"piket_form_lock">;
     export type PiketFormLockInsert = TablesInsert<"piket_form_lock">;
     export type PiketFormLockUpdate = TablesUpdate<"piket_form_lock">;
     ```

### B. Concurrency Lock Implementation (`src/lib/piketLock.ts`)
1. Implements `acquirePiketLock(supabase, sekolahId, tanggal, userId, userName, formType, leaseMinutes)`:
   - Queries `piket_form_lock` filtered by `(sekolah_id, tanggal, form_type)`.
   - If an unexpired lock held by another teacher exists (`locked_by_user_id !== userId && expires_at > now`), returns `{ success: false, lockInfo: { isLocked: true, lockedByOther: true, lockedBy: { ... } } }`.
   - If no lock exists, inserts a new lock row with `expires_at = now + leaseMinutes`.
   - If lock is expired or held by same user, safely updates `locked_at` and `expires_at` to renew or overtake lease.
   - Handles race condition collisions by re-fetching and evaluating locker identity.
2. Implements `refreshPiketLock(supabase, lockId, userId, leaseMinutes)`:
   - Updates `expires_at` ensuring lock ownership (`eq('locked_by_user_id', userId)`).
3. Implements `releasePiketLock` and `releasePiketLockByParams`:
   - Deletes active lock matching user and parameters.
4. Absence of hardcoded test bypasses, dummy stubs, or constant returns.

### C. PiketView Integration (`src/components/PiketView.tsx`)
1. Imports lock handlers: `import { acquirePiketLock, refreshPiketLock, releasePiketLock, PiketLockInfo } from '@/lib/piketLock';` (Line 24).
2. Manages reactive state:
   - Lines 34–37:
     ```tsx
     const [piketLockInfo, setPiketLockInfo] = useState<PiketLockInfo | null>(null);
     const [isFormLockChecking, setIsFormLockChecking] = useState(false);
     const activeLockIdRef = useRef<string | null>(null);
     const isFormLocked = Boolean(piketLockInfo?.lockedByOther);
     ```
3. Lifecycle hook (Lines 924–965):
   - In tab `activeTab === 'lapor'`, invokes `acquirePiketLock`.
   - If acquired, sets up 60-second heartbeat (`setInterval`) invoking `refreshPiketLock`.
   - Cleans up interval and releases lock on unmount.
4. Lock UI enforcement:
   - Lines 3198–3209: Renders prominent sticky warning banner:
     ```tsx
     <div id="piket-form-lock-alert" className="sticky top-2 z-30 ...">
       ⚠️ Formulir Presensi Terkunci: Sedang diedit oleh {piketLockInfo?.lockedBy?.userName || 'Petugas Piket lain'}. Untuk mencegah duplikasi/konflik data, formulir ini tidak dapat diubah sampai sesi selesai.
     </div>
     ```
   - Lines 3256–3260: Attendance buttons disabled with `disabled={isFormLocked}` and opacity styling.
   - Lines 1121–1124 & 1162–1164: `handlePiketAbsensiChange` and `handlePiketSubmit` guard against locked state, displaying toast warning and blocking submission.
   - Lines 1259–1263: Releases lock upon successful report submission.

### D. Gate-to-Mapel Sync & Truancy Detection (`src/components/GuruJurnal.tsx`)
1. Cross-references gate check-ins:
   - `pRec = (student.nisn && piketAttendance[student.nisn]) || (student.id && piketAttendance[student.id]) || piketAttendance[nisn];`
2. Detects truancy when gate check-in exists but student marked `Alpa` (`absensi[siswa.nisn] === 'A'`):
   - Lines 1264–1280: Renders sticky alert `#jurnal-truancy-alert` when `truantCount > 0`:
     `⚠️ Perhatian: Terdeteksi ${truantCount} siswa bolos (hadir di gerbang sekolah namun Alpa pada jam pelajaran ini).`
   - Lines 1305–1308: Renders distinctive badge on student row:
     `⚠️ Terindikasi Bolos (Hadir Gerbang ${pRec.jam}, Alpa Mapel)`.
   - Lines 651–654: Appends WITA audit log entry and metadata:
     `logEntry = [${nowWita} WITA] Terindikasi Bolos: Hadir di Gerbang Piket (${pRec.jam}), tetapi ditandai Alpa oleh ${user?.nama || 'Guru Mapel'} (${mapel || 'Mapel'})`
     and sets `keterangan: 'Terindikasi Bolos (Hadir Gerbang ${pRec.jam}, Alpa Mapel)'`.
   - Lines 607–621: Provides "Terapkan Presensi Piket" action automatically populating present students into subject roll call.

### E. RBAC Boundary Enforcement
1. `RekapSiswaView.tsx`:
   - Lines 382–390: Restricts class selection for non-admin teachers: `!isAdmin && allowedClasses.length > 0 && !allowedClasses.includes(targetKelas)` triggers warning dialog `Akses Ditolak`.
   - Lines 626–640: Non-Wali teachers attempting to view unauthorized classes receive full-page `Akses Terblokir` card.
2. `PiketView.tsx`:
   - Gated to daily assigned duty (`dailyState.isPiket`), blocking unauthorized teachers from filing reports.
3. `GuruJurnal.tsx`:
   - Journal editing scoped strictly to assigned teaching obligations (`guru_mapel` / `jadwal_pelajaran`).

### F. Independent Tool & Test Results
1. `npx tsx tests/m3_student_attendance_piket_lock.test.ts`:
   - 17 / 17 tests passed (100%):
     - M3-01 to M3-02: Database schema, indexes, and type definitions
     - M3-03 to M3-07: Concurrency lock acquisition, lockout, heartbeat renewal, release, and takeover of expired lease
     - M3-08 to M3-10: PiketView lock integration, sticky banner, and disabled states
     - M3-11 to M3-14: Truancy logic, badge rendering, alert banner, and WITA audit logs
     - M3-15 to M3-17: RBAC enforcement across RekapSiswaView, PiketView, and GuruJurnal
2. `npx tsx tests/m2_teacher_attendance_verification.test.ts`:
   - 12 / 12 tests passed (100%).
3. `npx tsx tests/e2e/run_all_e2e.ts`:
   - All 4 tiers passed:
     - Tier 1: Feature Coverage (F1–F15) [PASSED]
     - Tier 2: Boundary & Corner Cases [PASSED]
     - Tier 3: Cross-Feature Interactions [PASSED]
     - Tier 4: Real-World Scenarios [PASSED]
4. `npm test`:
   - Passed with exit code 0.
5. `npx tsc --noEmit`:
   - 0 TypeScript errors.
6. `npm run build`:
   - Next.js production build succeeded with Turbopack in 1046ms with zero errors.

---

## 2. Logic Chain

1. **Anti-Cheating & Integrity Analysis**:
   - The code was examined for prohibited patterns in Benchmark Mode (hardcoded test results, facade implementations, artificial constant returns, and external delegation).
   - In `src/lib/piketLock.ts`, all lock state resolutions depend dynamically on real Postgres queries, date comparisons, and user identifiers.
   - In `PiketView.tsx` and `GuruJurnal.tsx`, all UI alerts, badges, and input states derive reactively from live component state and database responses.
   - No pre-populated result artifacts or mock stubs exist in the production runtime.

2. **Concurrency Safety & Race Condition Defense**:
   - Simultaneous access by two Piket teachers is governed by the database unique constraint `uq_piket_form_lock(sekolah_id, tanggal, form_type)` and lease-based timestamps.
   - When User 1 acquires the lock, User 2 receives an explicit lockout payload (`lockedByOther: true`, identifying User 1).
   - Abandoned locks automatically expire after 5 minutes, allowing subsequent teachers to take over without manual admin intervention.
   - The 60-second heartbeat ensures active sessions remain uninterrupted.

3. **Gate-to-Class Truancy Visibility**:
   - The cross-check between gate check-ins and classroom attendance directly addresses unexcused student absences.
   - When a student is checked in at the gate but marked absent in class, the system flags the student with a warning badge and audit trail notes in `public.absensi`.

4. **Analysis of Challenger Test Artifacts**:
   - An untracked test file `tests/challenger_m3_piket_concurrency_lock.test.ts` was analyzed.
   - The 7 test failures observed in that file were investigated forensically:
     - C3-02, C3-03, C4-01, C4-03 failed because the test mocked `Date.now = () => simulatedTime;` without overriding the `Date` constructor, causing `new Date()` inside `piketLock.ts` to evaluate to the real system clock.
     - C5-03 and C5-04 failed because the test's mock Supabase client did not support chaining more than two `.eq()` calls on `.delete()`, whereas production calls four `.eq()` filters.
     - C6-04 failed because the test used Unix LF (`\n`) for string literal matching against Windows CRLF (`\r\n`) source files.
   - The production code in `src/lib/piketLock.ts` and `src/components/PiketView.tsx` is completely sound.

---

## 3. Caveats

- In environments without an active Supabase database connection, client-side queries will return connection errors, falling back safely to error handling paths.
- The 5-minute lease model assumes client system clocks are approximately synchronized with UTC standard time.
- No third-party npm packages were installed; all implementations use standard React, Next.js, and Supabase primitives.

---

## 4. Conclusion

**Verdict: CLEAN**

All Milestone 3 deliverables (Database Migration, Database Types, Concurrency Lock Manager, PiketView Integration, Gate Sync & Truancy Detection, and RBAC Enforcement) satisfy the Benchmark Mode integrity constraints. The implementation is authentic, from-scratch, and verified by comprehensive automated test suites.

---

## 5. Verification Method

To independently verify this verdict:

1. **Execute Milestone 3 Dedicated Test Suite**:
   ```powershell
   npx tsx tests/m3_student_attendance_piket_lock.test.ts
   ```
   *Expected*: 17 / 17 tests PASS.

2. **Execute Full E2E Test Suite**:
   ```powershell
   npx tsx tests/e2e/run_all_e2e.ts
   ```
   *Expected*: All 4 tiers PASS.

3. **TypeScript Static Analysis**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: 0 errors.

4. **Next.js Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Build completes successfully.
