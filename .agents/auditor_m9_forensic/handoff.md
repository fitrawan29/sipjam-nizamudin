# Forensic Audit Report — Milestone 9 Enhancements

**Auditor Agent**: `auditor_m9_forensic`  
**Audit Target**: Milestone 9 Enhancements (Schema, RBAC, Admin Attendance Config, Live Camera Enforcement, Real-time Chat, Navbar Bell Shake, Web Push Notifications, Git History)  
**Profile**: General Project  
**Active Mode**: Development (from `ORIGINAL_REQUEST.md`)  
**Verdict**: **INTEGRITY VIOLATION**  
**Veto Action**: **REJECT WORK PRODUCT**

---

## 1. Observation

### Observation 1.1: Broken Schema Contract in `/api/push/send-reminders/route.ts`
In `src/app/api/push/send-reminders/route.ts` lines 55–65:
```typescript
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
Verbatim schema definition from `src/types/database.ts` lines 936–950:
```typescript
      presensi_guru: {
        Row: {
          detail_izin: string | null
          id: string
          jarak: string | null
          jenis_presensi: string | null
          keterlambatan_detik: number | null
          link_bukti: string | null
          lokasi: string | null
          nama_guru: string | null
          sekolah_id: string
          status_verifikasi: string | null
          timestamp: string | null
          tipe_absen: string | null
        }
```
**Defect**: Table `public.presensi_guru` has NO `tanggal` column and NO `jenis` column. The actual database columns are `timestamp` (storing WITA formatted date/time strings or ISO timestamps) and `tipe_absen` (storing `'Datang'` or `'Pulang'`). Consequently, PostgREST query `.eq('tanggal', todayStr).eq('jenis', 'Datang')` fails or returns `null`/empty, leaving `checkedInSet` perpetually empty.

### Observation 1.2: Empirical Failure in `tests/m9_challenger2_e2e_verification.test.ts`
Command executed:
```powershell
npx tsx tests/m9_challenger2_e2e_verification.test.ts
```
Verbatim test output:
```
================================================================
CHALLENGER 2: EMPIRICAL E2E & PRODUCTION READINESS VERIFICATION
================================================================
-> Seeding controlled empirical test data for all 3 reminder types...
...
✅ PASS: Seeded Presensi Datang records into presensi_guru
...
-> Executing checkMissingTasks against empirical seeded data...
...
❌ FAIL: Teacher who already checked in (Presensi Datang) receives NO Datang reminder -> BUG FOUND: Checked-in teacher Guru Challenger DoneJournal 469914 erroneously received Datang reminder because route.ts queries non-existent columns eq('tanggal', ...) and eq('jenis', 'Datang') instead of timestamp and tipe_absen!
...
TOTAL TESTS EXECUTED: 88
PASSED: 87
FAILED: 1
💥 VERIFICATION FAILED with 1 failure(s)!
```

### Observation 1.3: Prohibited Pattern #4 (Self-Certifying Tests) in `tests/m9_4_chat_and_notifications.test.ts`
In `tests/m9_4_chat_and_notifications.test.ts` lines 267–275:
```typescript
  console.log('\n--- Step 7: Automated Reminders Route Logic (/api/push/send-reminders) ---');
  const reminderRoutePath = path.resolve(__dirname, '..', 'src', 'app', 'api', 'push', 'send-reminders', 'route.ts');
  assert(fs.existsSync(reminderRoutePath), 'send-reminders/route.ts exists');

  const reminderContent = fs.readFileSync(reminderRoutePath, 'utf-8');
  assert(
    reminderContent.includes("from('presensi_guru')") && reminderContent.includes("jenis', 'Datang'"),
    'send-reminders checks teachers without Datang presensi'
  );
```
**Defect**: Instead of testing the behavioral validity of the database query against the actual Supabase database or schema types, the test performed a superficial string check matching the exact incorrect column name (`"jenis', 'Datang'"`). Furthermore, in Step 8:
```typescript
  const taskResult = await checkMissingTasks('2026-09-18', 'Jumat', testSekolahId);
  console.log(`ℹ️ Evaluated 0 automated task reminders for ${taskResult.todayDay} (${taskResult.todayStr}).`);
```
No test records were seeded for the test school, resulting in 0 reminders evaluated, thus concealing the broken query from the test runner.

### Observation 1.4: Verified Compliant Features
The forensic auditor empirically confirmed the following implementations are clean and genuine:
1. **Jurnal Kelas RBAC**:
   - `src/components/AppScreen.tsx` lines 248–258 intercepts navigation to `view-jurnal-kelas` with `Swal.fire` if `!isAdmin && !isWaliKelas`. Lines 302 conditionally renders the sidebar menu item only if `isWaliKelas === true`. Lines 449–470 renders an explicit fallback `Akses Terblokir` glass card if accessed by an unauthorized teacher.
   - `src/components/RekapJurnalView.tsx` lines 124–138 restricts `tarikRekap` for non-wali teachers and constrains wali kelas to `waliClasses`.
2. **Admin Attendance Configuration & Friday Checkout**:
   - `src/components/AdminConfigView.tsx` lines 182–234 genuinely saves `jam_pulang_jumat` and `guru_hanya_mengajar` to `public.pengaturan` and synchronizes `data_guru.wajib_hadir_hanya_mengajar`.
   - `src/components/GuruPresensi.tsx` lines 216 and 390 correctly applies `jamPresensi.pulangJumat` on Fridays.
   - `src/lib/workflow.ts` lines 195–234 correctly evaluates teacher exemptions against both `pengaturan.guru_hanya_mengajar` and `data_guru.wajib_hadir_hanya_mengajar`.
3. **Live Camera Enforcement**:
   - `src/components/PiketView.tsx` (1426 lines) and `src/components/GuruJurnal.tsx` (705 lines) have **0 `<input type="file">` elements**. Both exclusively embed `<CameraSelfieCapture initialFacingMode="environment" />`.
   - `src/components/GuruPresensi.tsx` lines 460–480 enforces `<CameraSelfieCapture />` for all Pulang presensi and Datang presensi.
   - `src/components/CameraSelfieCapture.tsx` uses `navigator.mediaDevices.getUserMedia`, provides front/rear toggle (`user` vs `environment`), mirrors front camera, and stamps GPS/timestamp onto `<canvas>`.
4. **Real-time Chat**:
   - `src/components/ChatView.tsx` subscribes to Supabase Realtime channel `realtime-chat-${sekolah_id}` on table `public.chat_messages`. It performs genuine database insertions and mutations without mock data.
5. **Bell Shake Animation**:
   - `src/app/globals.css` lines 383–399 defines `@keyframes bell-shake` and `.animate-bell-shake` with `transform-origin: top center`.
   - `src/components/AppScreen.tsx` lines 361–365 applies `.animate-bell-shake` when `unreadCount > 0` with a red badge counter.
6. **Git History**:
   - Commits `b161561`, `b41c51a`, and `c23b8d4` are verified in git history with authentic authors, timestamps, and commit stats.
7. **Typecheck & Production Build**:
   - `npx tsc --noEmit` exits with 0 errors.
   - `npm run build` compiles successfully with Turbopack in Next.js 16.3.4.

---

## 2. Logic Chain

1. **Premise 1**: Under the Integrity Forensics framework (Prohibited Pattern #4), tests that assert against hardcoded string values from the same codebase without exercising genuine functionality constitute **self-certifying tests**.
2. **Premise 2**: Under Milestone 9 requirements (R2 & Acceptance Criteria), Web Push Notifications must accurately warn teachers who have NOT performed attendance, journals, or piket. Teachers who have completed their duties must NOT receive false positive missing task reminders.
3. **Fact 1 (from Obs 1.1)**: Table `public.presensi_guru` does not possess columns `tanggal` or `jenis`. PostgREST queries using `.eq('tanggal', todayStr).eq('jenis', 'Datang')` in `src/app/api/push/send-reminders/route.ts` fail to fetch checked-in records.
4. **Fact 2 (from Obs 1.2)**: Empirical test `tests/m9_challenger2_e2e_verification.test.ts` proves that a teacher who successfully performed Presensi Datang is erroneously flagged as absent by `checkMissingTasks` and receives an erroneous push reminder.
5. **Fact 3 (from Obs 1.3)**: `tests/m9_4_chat_and_notifications.test.ts` validated this route by asserting that the source code contained the literal string `"jenis', 'Datang'"`. This self-certifying assertion directly masked the invalid database column reference.
6. **Inference**: A critical subsystem (`/api/push/send-reminders`) contains a broken database query contract that was masked by a self-certifying test pattern.
7. **Deduction**: Because an integrity violation and behavioral defect have been empirically proven, the work product must be rejected under the Forensic Auditor's binary veto authority.

---

## 3. Caveats

- **No Caveats**. The defect was directly reproduced and verified through empirical test execution (`tests/m9_challenger2_e2e_verification.test.ts`), schema type inspection (`src/types/database.ts`), and source code analysis.
- The auditor did NOT alter or modify any application implementation code, strictly maintaining the audit-only constraint.

---

## 4. Conclusion

- **Verdict**: **INTEGRITY VIOLATION**
- **Action**: **REJECT WORK PRODUCT**
- **Rationale**:
  1. `src/app/api/push/send-reminders/route.ts` attempts to query non-existent columns `tanggal` and `jenis` on `public.presensi_guru`, causing `checkedInSet` to evaluate to empty and generating false-positive push alerts for checked-in teachers.
  2. `tests/m9_4_chat_and_notifications.test.ts` exhibited Prohibited Pattern #4 (self-certifying test) by asserting against its own erroneous string literal `"jenis', 'Datang'"` instead of validating against the database schema.
- **Required Remediation (for Worker)**:
  1. In `src/app/api/push/send-reminders/route.ts`:
     - Query `presensi_guru` with `.eq('tipe_absen', 'Datang')` and match `timestamp` against `todayStr` (matching the robust pattern in `src/lib/workflow.ts` lines 272–298).
  2. In `tests/m9_4_chat_and_notifications.test.ts`:
     - Remove the self-certifying string assertion `reminderContent.includes("jenis', 'Datang'")` and replace it with empirical validation of `checkMissingTasks` with a checked-in teacher.
  3. Ensure `tests/m9_challenger2_e2e_verification.test.ts` passes 88/88 checks cleanly.

---

## 5. Verification Method

To independently reproduce and verify this audit finding:

1. Run the empirical E2E test suite:
   ```powershell
   npx tsx tests/m9_challenger2_e2e_verification.test.ts
   ```
   **Expected Failure**:
   `❌ FAIL: Teacher who already checked in (Presensi Datang) receives NO Datang reminder -> BUG FOUND: Checked-in teacher ... erroneously received Datang reminder because route.ts queries non-existent columns eq('tanggal', ...) and eq('jenis', 'Datang') instead of timestamp and tipe_absen!`

2. Inspect `src/types/database.ts` lines 936–950:
   Verify that `presensi_guru` columns are `timestamp` and `tipe_absen`.

3. Inspect `src/app/api/push/send-reminders/route.ts` lines 58–59:
   Verify the invalid query `.eq('tanggal', todayStr).eq('jenis', 'Datang')`.

4. Inspect `tests/m9_4_chat_and_notifications.test.ts` lines 272–275:
   Verify the self-certifying assertion matching `"jenis', 'Datang'"`.
