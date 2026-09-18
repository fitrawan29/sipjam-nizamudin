# Milestone 9 Review & Adversarial Audit Report (Reviewer 2)

**Reviewer ID**: `reviewer_m9_2`  
**Roles**: Reviewer, Adversarial Critic  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\reviewer_m9_2`  
**Evaluation Target**: Milestone 9 Enhancements (R1 - R5)  
**Final Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

### Verification Commands & Results

1. **TypeScript Typecheck (`npx tsc --noEmit`)**:
   - Command: `npx tsc --noEmit`
   - Exit Code: `0`
   - Result: Clean compilation with 0 errors.

2. **Milestone 9 Test Suites**:
   - **`tests/m9_1_database_and_types.test.ts`**:
     - Command: `npx tsx tests/m9_1_database_and_types.test.ts`
     - Exit Code: `0` (17/17 passed).
     - Verified: Database migrations, RLS policies, realtime publication, and TypeScript types.
   - **`tests/m9_2_3_verification.test.ts`**:
     - Command: `npx tsx tests/m9_2_3_verification.test.ts`
     - Exit Code: `0` (20/20 passed).
     - Verified: Jurnal Kelas RBAC, Wali Kelas restrictions, Friday checkout time, teacher attendance exceptions in `workflow.ts`, and elimination of `<input type="file">` in `PiketView.tsx`.
   - **`tests/m9_4_chat_and_notifications.test.ts`**:
     - Command: `npx tsx tests/m9_4_chat_and_notifications.test.ts`
     - Exit Code: `0` (44/44 passed).
     - Verified: Bell shake animation in `globals.css`, navbar unread tracking in `AppScreen.tsx`, Supabase Realtime chat in `ChatView.tsx`, and service worker notification handling.
   - **Full Project Regression Suite (`npm test`)**:
     - Command: `npm test`
     - Exit Code: `0` (100+ tests passed).
   - **Next.js Production Build (`npm run build`)**:
     - Command: `npm run build`
     - Exit Code: `0`. All static and dynamic API routes compiled cleanly.

3. **Adversarial End-to-End Test Suite (`tests/m9_challenger2_e2e_verification.test.ts`)**:
   - Command: `npx tsx tests/m9_challenger2_e2e_verification.test.ts`
   - Exit Code: `1` (87 PASSED, 1 FAILED).
   - **Failure Detail**:
     ```
     ❌ FAIL: Teacher who already checked in (Presensi Datang) receives NO Datang reminder 
     -> BUG FOUND: Checked-in teacher Guru Challenger DoneJournal 472368 erroneously received Datang reminder 
     because route.ts queries non-existent columns eq('tanggal', ...) and eq('jenis', 'Datang') instead of timestamp and tipe_absen!
     ```

---

### Codebase Inspection & Root Cause Analysis

#### Major Defect: Schema Mismatch in `/api/push/send-reminders/route.ts`
- **Location**: `src/app/api/push/send-reminders/route.ts`, lines 54–65:
  ```ts
  // C. Fetch presensi for today (Datang)
  let presensiQuery = supabase
    .from('presensi_guru')
    .select('*')
    .eq('tanggal', todayStr)
    .eq('jenis', 'Datang');
  if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
    presensiQuery = presensiQuery.eq('sekolah_id', sekolahId);
  }
  const { data: presensiList } = await presensiQuery;
  const checkedInSet = new Set((presensiList || []).map(p => (p.nama_guru || '').toLowerCase().trim()));
  ```
- **Observed Database Schema for `presensi_guru`**:
  Columns are: `id`, `timestamp`, `nama_guru`, `tipe_absen`, `jenis_presensi`, `detail_izin`, `lokasi`, `jarak`, `link_bukti`, `status_verifikasi`, `keterlambatan_detik`, `sekolah_id`.
  - There is **no column named `tanggal`**; date and time are stored in `timestamp` (e.g. `"2026-09-18 07:12:00"`).
  - There is **no column named `jenis`**; attendance type is stored in `tipe_absen` (`"Datang"` | `"Pulang"`).
- **Consequence**:
  Because PostgREST / Supabase rejects querying non-existent columns or returns an error, `presensiList` is null. `checkedInSet` remains empty. As a result, `hasCheckedIn` evaluates to `false` for every teacher. **Teachers who have already submitted their Presensi Datang are erroneously spammed with push notification reminders to check in.**

---

### Other Areas Verified (Passing)

1. **R1: GradebookView Admin View-Only Lock, TP Boundaries & Year Sync (`src/components/GradebookView.tsx`)**:
   - Academic year is locked for Guru (`Tahun Ajaran (sinkron admin)` with lock icon) and synchronized with `pengaturan.tahun_ajaran`.
   - Admin view-only lock suppresses all grade input fields, showing read-only text spans (`sGrades[col.id] ?? '-'`).
   - Mutation handlers (`handleSaveGrades`, `handleSaveTp`, `handleDeleteTp`, `handleSaveCol`, `handleDeleteCol`, `handleExecuteBulkFill`) enforce `if (isAdmin || !isGuruPengampu) return;`.
   - Only "Cetak Dokumen" (`window.print()`) is accessible to Admin.
   - Teachers who do not teach the selected subject/class have `isGuruPengampu = false` and cannot create, edit, or delete TPs.

2. **R2: Broadcast Bell & Real-time Chat (`AppScreen.tsx`, `ChatView.tsx`, `globals.css`)**:
   - Bell icon triggers `@keyframes bell-shake` when `unreadCount > 0`, accompanied by a red unread badge.
   - `ChatView.tsx` subscribes to `public.chat_messages` via Supabase Realtime, enabling instantaneous message exchange without page reload.
   - Unread badges in chat list update in real time.

3. **R3: Jurnal Kelas RBAC (`AppScreen.tsx`, `RekapJurnalView.tsx`)**:
   - `menuItemsGuru` conditionally includes "Jurnal Kelas" only when `isWaliKelas` is true.
   - `handleNavigation('view-jurnal-kelas')` checks `!isAdmin && !isWaliKelas` and displays an alert.
   - `AppScreen.tsx` fallback renderer presents an "Akses Terblokir" card if an unauthorized user reaches the view.
   - `RekapJurnalView.tsx` hides the "Rekapan Jurnal Per Kelas" tab toggle for regular teachers and restricts Wali Kelas strictly to their assigned class(es).

4. **R4: Friday Checkout & Teacher Attendance Exceptions (`AdminConfigView.tsx`, `src/lib/workflow.ts`, `GuruPresensi.tsx`)**:
   - `AdminConfigView.tsx` provides checkboxes to designate teachers exempt from daily presence ("Hanya wajib hadir saat hari mengajar") and an input for `jam_pulang_jumat` (default 11:00).
   - `workflow.ts` correctly evaluates `isTeacherExempt`: exempt teachers without teaching/piket obligations on non-teaching days have `bebasAlpa = true` and `isAlpa = false`. Non-exempt teachers default to mandatory daily attendance.
   - `GuruPresensi.tsx` enforces `jam_pulang_jumat` on Fridays, blocking checkouts prior to the Friday opening time.

5. **R5: Direct Camera Enforcement (`CameraSelfieCapture.tsx`, `GuruPresensi.tsx`, `GuruJurnal.tsx`, `PiketView.tsx`)**:
   - Direct media stream via `navigator.mediaDevices.getUserMedia`.
   - Toggle button allows switching between front (`user`) and rear (`environment`) cameras with correct video mirroring.
   - `<input type="file">` is completely removed from Pulang presensi, KBM journal, and Piket reports.

---

## 2. Logic Chain

1. **Premise 1**: Acceptance Criteria for R2 state that Web Push Notifications must accurately warn teachers who have *not* completed their presensi, journals, or piket.
2. **Premise 2**: In `src/app/api/push/send-reminders/route.ts` lines 58–59, `presensiQuery` filters by `.eq('tanggal', todayStr).eq('jenis', 'Datang')`.
3. **Premise 3**: In the `presensi_guru` database table, the column for date/time is `timestamp`, and the column for attendance type is `tipe_absen`. Neither `tanggal` nor `jenis` exist.
4. **Premise 4**: Because the query looks for non-existent columns, `checkedInSet` is empty. Every teacher is flagged as missing attendance, and checked-in teachers erroneously receive reminders.
5. **Premise 5**: Adversarial test `tests/m9_challenger2_e2e_verification.test.ts` failed on this exact invariant.
6. **Conclusion**: The implementation contains an active functional defect in `/api/push/send-reminders/route.ts` that causes false push notification dispatches. Therefore, changes must be requested before final approval.

---

## 3. Caveats

- All other Milestone 9 components (Gradebook view-only lock, year sync, Jurnal Kelas RBAC, Friday checkout time, camera enforcement, realtime chat, and navbar bell animation) are fully compliant and robust.
- The defect is isolated to `src/app/api/push/send-reminders/route.ts` and can be fixed with a straightforward query adjustment.

---

## 4. Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

### Required Remediation
In `src/app/api/push/send-reminders/route.ts` (lines 54–65):
Update the presensi query to match the actual database schema (`tipe_absen` and `timestamp`):
```ts
// C. Fetch presensi for today (Datang)
let presensiQuery = supabase
  .from('presensi_guru')
  .select('nama_guru, timestamp, tipe_absen')
  .eq('tipe_absen', 'Datang');

if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
  presensiQuery = presensiQuery.eq('sekolah_id', sekolahId);
}
const { data: presensiList } = await presensiQuery;
const checkedInSet = new Set(
  (presensiList || [])
    .filter(p => (p.timestamp || '').startsWith(todayStr))
    .map(p => (p.nama_guru || '').toLowerCase().trim())
);
```

---

## 5. Verification Method (For Validating the Fix)

After applying the remediation:

1. Run the challenger E2E test suite:
   ```bash
   npx tsx tests/m9_challenger2_e2e_verification.test.ts
   ```
   *Expected*: All 88 tests pass with 0 failures.

2. Run the M9 test suites:
   ```bash
   npx tsx tests/m9_1_database_and_types.test.ts
   npx tsx tests/m9_2_3_verification.test.ts
   npx tsx tests/m9_4_chat_and_notifications.test.ts
   ```
   *Expected*: All tests pass.

3. Run TypeScript check:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0.

4. Run production build:
   ```bash
   npm run build
   ```
   *Expected*: Clean build.

---

## Findings Summary

### [Critical] Finding 1: Schema Mismatch in Push Notification Datang Reminder Query
- **What**: Query on `presensi_guru` targets non-existent columns `tanggal` and `jenis`.
- **Where**: `src/app/api/push/send-reminders/route.ts`, lines 58–59.
- **Why**: PostgREST fails to resolve columns, resulting in an empty checked-in set. Teachers who already checked in still receive "Pengingat Presensi Datang".
- **Suggestion**: Query `.eq('tipe_absen', 'Datang')` and filter `timestamp` starting with `todayStr`.
