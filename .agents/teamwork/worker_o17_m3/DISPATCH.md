## 2026-10-08T16:45:20Z
You are Worker M3 (worker_o17_m3) implementing Milestone 3 (R3 Student Attendance & Piket Flow).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT FILES:
1. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under header '## 2026-10-08T11:11:29Z').
2. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
3. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_3\report.md.

YOUR SCOPE & EXCLUSIVE WRITE OWNERSHIP:
- supabase/migrations/20261008_m3_piket_form_lock.sql
- src/types/database.ts
- src/lib/piketLock.ts
- src/components/PiketView.tsx
- src/components/GuruJurnal.tsx
- src/components/RekapSiswaView.tsx
- tests/m3_student_attendance_piket_lock.test.ts

TASK INSTRUCTIONS (Follow explorer_o16_3/report.md blueprint):
1. Database Schema & Migration for Concurrency Lock:
   - Create migration `supabase/migrations/20261008_m3_piket_form_lock.sql`:
     Create table `public.piket_form_lock` with `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE`, `tanggal DATE NOT NULL`, `form_type TEXT NOT NULL DEFAULT 'student_attendance'`, `locked_by_user_id TEXT NOT NULL`, `locked_by_user_name TEXT NOT NULL`, `locked_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `expires_at TIMESTAMPTZ NOT NULL`, `CONSTRAINT uq_piket_form_lock UNIQUE (sekolah_id, tanggal, form_type)`.
     Add index `idx_piket_form_lock_lookup ON public.piket_form_lock(sekolah_id, tanggal, form_type)`.
   - Update `src/types/database.ts` adding table `piket_form_lock` across Row, Insert, and Update interfaces.

2. Concurrency Lock Module (`src/lib/piketLock.ts`):
   - Implement `acquirePiketLock`, `releasePiketLock`, and `refreshPiketLock`.
   - Lease duration default 5 minutes (300 seconds), refresh interval 60 seconds.
   - If lock exists, is not expired, and belongs to another user (`locked_by_user_id !== userId`), return `{ success: false, lockInfo: { isLocked: true, lockedByOther: true, lockedBy: { userId, userName, lockedAt } } }`.
   - If lock expired or belongs to same user, refresh and return `{ success: true, lockInfo: ... }`.

3. Integration in `src/components/PiketView.tsx`:
   - When duty teacher opens the "lapor" tab, invoke `acquirePiketLock`.
   - If `lockInfo.lockedByOther === true`:
     Display a prominent sticky alert banner: `⚠️ Formulir Presensi Terkunci: Sedang diedit oleh ${lockInfo.lockedBy.userName}. Untuk mencegah duplikasi/konflik data, formulir ini tidak dapat diubah sampai sesi selesai.`
     Disable all input buttons, attendance markers, and the submit button.
   - If lock acquired: start a 60-second heartbeat calling `refreshPiketLock`.
   - On component unmount or submit, release the lock.

4. Gate-to-Mapel Sync & Truancy (Bolos) Detection in `src/components/GuruJurnal.tsx`:
   - Student roster queries gate check-ins from `presensi_siswa` (`piketAttendance`).
   - If a student is present at the gate (`pRec = piketAttendance[siswa.nisn]` or `piketAttendance[siswa.id]`) BUT marked `Alpa` (`'A'`) in GuruJurnal:
     - Render distinctive warning badge: `⚠️ Terindikasi Bolos (Hadir Gerbang ${pRec.jam}, Alpa Mapel)`.
     - Display banner above roster if any student is flagged for truancy: `⚠️ Perhatian: Terdeteksi ${truantCount} siswa bolos (hadir di gerbang sekolah namun Alpa pada jam pelajaran ini).`
     - In `handleAbsensiChange`, if `status === 'A'` and `pRec` exists, record log note: `[WITA] Terindikasi Bolos: Hadir di Gerbang Piket (${pRec.jam}), tetapi ditandai Alpa oleh ${user.nama} (${mapel})` into `absensi.keterangan` / `absensi.log_perubahan`.

5. Role-Based Access Enforcement:
   - Ensure Mapel is strictly scoped to their scheduled subject & class.
   - Ensure Wali Kelas is locked to `assignedKelas` in `RekapSiswaView.tsx`.
   - Ensure Piket is locked to duty days (`isPiketHariIni`).

6. Dedicated Verification Suite (`tests/m3_student_attendance_piket_lock.test.ts`):
   - Test RBAC boundaries.
   - Test Truancy detection logic, badge render condition, and log output.
   - Test Concurrency lock:
     - User 1 acquires lock -> succeeds.
     - User 2 acquires lock -> fails with lockedBy User 1.
     - User 1 releases lock -> User 2 acquires lock -> succeeds.
     - Expired lock takeover simulation.

7. Verification Commands:
   - `npx tsc --noEmit`
   - `npx tsx tests/m3_student_attendance_piket_lock.test.ts`
   - `npx tsx tests/m2_teacher_attendance_verification.test.ts`
   - `npm test`
   - `npx tsx tests/e2e/run_all_e2e.ts`
   - `npm run build`

8. Git Workflow:
   - `git status`, `git add .`, `git commit -m "feat(m3): implement student attendance rbac, gate truancy detection, and piket concurrency lock"`, `git push origin main`.

Deliver handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m3\handoff.md`.
Notify orchestrator when done.
