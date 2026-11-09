> [!WARNING] **Skepticism Disclaimer**
> Confidence is high across RBAC isolation, session synchronization, Jurnal BK routing, and checkout/presensi pulang gate resolution with all 74 test suites passing (500+ BK assertions verified), though physical capacitive touch screen and hardware camera QR scanning remain verified through AST, DOM, and logic test harnesses rather than physical hardware taps.

## 1. What the prior attempt got wrong

### Issue 1: Guru BK Blocked from Presensi Pulang Due to Missing KBM/Blok Journal Logic
- **Input:** Guru BK (with role `'bk'`, `'guru_bk'`, or holding mapel BK in constraint fallback mode) completes Presensi Datang in a school with standard policy (`aturan_kehadiran_guru = 'Semua_Hari'`). At checkout time, Guru BK attempts to do Presensi Pulang.
- **Expected:** Guru BK is permitted to checkout (`canPresensiPulang === true`, `canTeacherPresensiPulang(state) === true`) because counseling duties are classless and independent from regular teaching schedules.
- **Actual:** `canTeacherPresensiPulang` returned `false` and `getGuruDailyState` set `canPresensiPulang = false` with `lockedReason: 'Anda belum menyelesaikan: Jurnal (KBM/Kegiatan)'`. In `GuruPresensi.tsx`, the Presensi Pulang button was disabled and locked (`isPulangLocked = true`), and attempting to submit triggered a warning dialog: "Presensi Pulang Belum Dibuka: Anda belum menyelesaikan: Jurnal (KBM/Kegiatan)". However, Guru BK has no teaching schedules in `jadwal_pelajaran` and is strictly forbidden from accessing `view-guru-jurnal` by RBAC, creating an unresolvable lockout deadlock.
- **Root Cause:** In `src/lib/workflow.ts`, `isJurnalDone` and `canTeacherPresensiPulang` only recognized `isNonTeachingDay` (for exempt teachers) or `jurnalKegiatan` (for Sistem Blok) when `jadwalKBM.length === 0`. It lacked recognition of Guru BK role and mapel variants (`state.isBk`), falsely expecting KBM journals or block journals from counseling teachers.

### Issue 2: `HomeViewGuru.tsx` Prematurely Intercepted and Swallowed Checkout & Rejection Notices
- **Input:** Guru BK on dashboard (`view-home`) whose Presensi Pulang was rejected by Admin (`dailyState.presensiPulangDitolak`), or who is ready to checkout (`dailyState.canPresensiPulang && !dailyState.presensiPulang`), or who has completed checkout (`dailyState.presensiPulang`).
- **Expected:** `getNextAction` presents the appropriate contextual state: rejection warning, checkout prompt, or checkout completion message ("Semua tugas hari ini sudah selesai. Terima kasih!").
- **Actual:** `getNextAction` unconditionally returned `{ text: 'Layanan BK Aktif: Buka menu Jurnal BK untuk mencatat intervensi dan konseling siswa.' }` at line 540 before evaluating rejection, checkout readiness, or checkout completion. Guru BK was never notified of admin rejections or checkout completion.
- **Root Cause:** In `src/components/HomeViewGuru.tsx`, the `if (isBk)` return statement was placed above checkout completion, readiness, and rejection handlers instead of serving as the active duty fallback.

### Issue 3: Inconsistent Role Label in `AdminPenggunaView.tsx` Table
- **Input:** Admin views users in `AdminPenggunaView` where a teacher is appointed as BK via constraint fallback (`role: 'Guru'` + `mataPelajaran: 'Bimbingan Konseling (BK)'`) or has `role: 'guru_bk'`.
- **Expected:** The table displays `Role: Guru BK`.
- **Actual:** Displayed `Role: Guru` or `Role: guru_bk` because line 1190 strictly checked `item.role === 'bk' ? 'Guru BK' : ...`.
- **Root Cause:** The table row did not use the existing `isItemBk` boolean helper which already normalizes all canonical BK role and mapel variants.

---

## 2. What I changed

1. **`src/lib/workflow.ts`**:
   - Added `isBk?: boolean;` to `GuruDailyState` interface.
   - Updated `getGuruDailyState` to inspect `data_guru.mata_pelajaran` and `users.role` for BK variants (`bimbingan konseling`, `bimbingan dan konseling`, `bk`), setting `state.isBk = isTeacherBk`.
   - Updated `isJurnalDone` calculation in `getGuruDailyState` to consider BK teachers fulfilled (`else if (state.isBk || isTeacherBk) isJurnalDone = true;`).
   - Updated `canTeacherPresensiPulang` to inspect `state.isBk`, role, and mapel variants, unlocking checkout for Guru BK with `presensiDatang` while strictly preserving piket obligations if assigned.

2. **`src/components/HomeViewGuru.tsx`**:
   - Refined `getNextAction` to evaluate high-priority rejection warnings and checkout completion (`dailyState.presensiPulang`) before BK active duty notices.
   - Provided clear prompts for Guru BK: checkout prompt when duties are ready, and completed message when checkout has succeeded.
   - Preserved exact legacy AST string invariants.

3. **`src/components/AdminPenggunaView.tsx`**:
   - Updated line 1190 to use `isItemBk` so that teachers appointed to BK (via either pure role `'bk'`, `'guru_bk'`, or constraint fallback mapel) uniformly display `Role: Guru BK`.

4. **`tests/adversarial_bk_reviewer_verification.test.ts`**:
   - Added Suite 8: 14 assertions testing `canTeacherPresensiPulang` across all BK mapel variants, pure roles, `isBk` flag, and ensuring incomplete piket remains strictly enforced.
   - Added Suite 9: Non-regression assertion ensuring regular teachers without schedule in non-exempt schools are strictly blocked from unearned checkout.
   - Added Suite 10: AST verification ensuring `AdminPenggunaView` renders `Guru BK` consistently via `isItemBk`.
   - Total assertions expanded from 70 to 86 (100% passing).

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/adversarial_bk_reviewer_verification.test.ts`:
    - Result: **86 / 86 assertions PASSED** (0 failures).
  - `npx tsx tests/adversarial_bk_challenger.test.ts`:
    - Result: **481 / 481 assertions PASSED** (0 failures).
  - `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts`:
    - Result: **106 / 106 assertions PASSED** (0 failures).
  - `npx tsx tests/challenger_bk_2_stress_test.test.ts`:
    - Result: **60 / 60 assertions PASSED** (0 failures).
  - `npx tsx tests/three_fixes_verification.test.ts`:
    - Result: **PASSED with exit code 0** (verified non-regression on legacy anchors).
  - `npx tsx tests/guru_presensi_pulang_tugas_terisi.test.ts`:
    - Result: **20 / 20 checks PASSED** (0 failures).
  - `npx tsx tests/sistem_blok_verification.test.ts`:
    - Result: **205 / 205 checks PASSED** (0 failures).
  - `npm test` (Full Project Suite - 74 test files):
    - Result: **PASSED with exit code 0** across all 74 test suites without a single regression.

- **Shallow Verification (manual only):**
  - Inspected `git diff src/` ensuring all edits conform strictly to the `/ponytail` philosophy: smallest responsible diff, root cause resolution, and zero unrequested abstractions or dependencies.
  - Verified exact preservation of AST comments in `AppScreen.tsx` line 1111 and `ClaySidebar.tsx` line 240.

- **Unverified aspects:**
  - Physical browser touch events and live camera/QR hardware scanning (verified via AST, DOM simulation, and headless node harnesses).

---

## 4. Known Issues

- `Minor Robustness Risk`: In environments where database constraint `users_role_check` blocks role `'bk'`, the teacher is recorded as `'Guru'` in `users` and `'Bimbingan Konseling (BK)'` in `data_guru`. Our codebase now 100% recognizes this fallback across all views, RBAC guards, sidebar, dashboard, and checkout gates. Running `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;` in Supabase remains recommended for schema cleanliness.

---

## 5. Remaining risk & next step

- Task is **complete**: All acceptance criteria are fully met with zero regressions, all edge cases (including checkout deadlock and dashboard state swallowing) have been resolved at the root cause, and the full project test suite (74 test suites, 730+ BK assertions) passes with 100% success.
- Next step: Stage, commit, and push changes to `main` branch following the project's Git Workflow Rule.
