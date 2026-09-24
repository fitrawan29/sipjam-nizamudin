# Handoff Report: Requirement R1 Survey & Architecture

**Agent**: Explorer 1 (`teamwork_preview_explorer`)  
**Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1_1`  
**Milestone**: Survey & Technical Mapping (Requirement R1)  
**Parent Orchestrator**: `2ac91888-0ccf-41c6-9452-748556b221b7`  

---

## 1. Observation

1. **Rejection Storage & Existing Columns**:
   - `supabase/migrations/20260919_milestone10_schema.sql` (lines 99–113) added `catatan_admin` and `alasan_penolakan` columns to `presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket`.
   - In `src/types/database.ts`:
     - `presensi_guru` (lines 960–961): `alasan_penolakan?: string | null`, `catatan_admin?: string | null`.
     - `jurnal_pembelajaran` (lines 473–474): `alasan_penolakan?: string | null`, `catatan_admin?: string | null`.
     - `laporan_piket` (lines 596–597): `alasan_penolakan?: string | null`, `catatan_admin?: string | null`.

2. **Re-Submission Reset Behavior**:
   - `src/components/GuruPresensi.tsx` (lines 265–269):
     ```ts
     const rejectedRecord = tipeAbsen === 'Datang' ? dailyState?.presensiDatangDitolak : dailyState?.presensiPulangDitolak;
     if (rejectedRecord?.id) {
       await supabase.from('presensi_guru').delete().eq('id', rejectedRecord.id);
     }
     ```
   - `src/components/GuruJurnal.tsx` (lines 339–342):
     ```ts
     if (dailyState?.jurnalDitolak && dailyState.jurnalDitolak.length > 0) {
       const rejectedIds = dailyState.jurnalDitolak.map((j: any) => j.id);
       await supabase.from('jurnal_pembelajaran').delete().in('id', rejectedIds);
     }
     ```
     Observed that all rejected journal records are batch deleted when *any* journal is submitted, regardless of subject/class. Also observed line 311 `newJurnal` lacks `sekolah_id`.
   - `src/components/PiketView.tsx` (lines 333–335):
     ```ts
     if (dailyState?.laporanPiketDitolak?.id) {
       await supabase.from('laporan_piket').delete().eq('id', dailyState.laporanPiketDitolak.id);
     }
     ```

3. **Notification on Rejection**:
   - In `src/components/AdminVerifView.tsx` (lines 182–214), `verifyItem`:
     When `status === 'Ditolak'`, it updates `supabase.from(table).update(updatePayload).eq('id', id)` and shows a local toast to the admin. No push notification or in-app message is dispatched to the teacher.
   - Web Push infrastructure already exists in `src/lib/vapid.ts` (`sendWebPush`), `src/app/api/push/send-reminders/route.ts`, and table `push_subscriptions`.

4. **Auto-Alpa Cutoff**:
   - `src/lib/workflow.ts` (lines 327–351): sets `state.isAlpa = true` in memory if `!state.presensiDatang`, but does NOT write `Alpa` to the database.
   - `pengaturan` table contains `jam_pulang_akhir` (default `22:00` WITA) and `jam_pulang_jumat`.
   - `src/components/AdminRekapView.tsx` (lines 163–168): computes `alpaOtomatis = Math.floor(telat / 14400)` strictly from late minutes and does not count records where `jenis_presensi === 'Alpa'`.

5. **Admin Verification UI**:
   - `src/components/AdminVerifView.tsx` (lines 844–858):
     The "Setujui" button is disabled only when `item.status_verifikasi === 'Disetujui'`. If `item.status_verifikasi === 'Ditolak'`, the button remains visible and enabled.
   - Lines 196–203: rejected items remain in `presensiList`, `jurnalList`, and `piketList`, and continue to render in the verification card list.

6. **3x Absence Warning Feature**:
   - Grep search for warning / peringatan logic confirmed no 3x absence warning feature exists for Presensi, Jurnal, or Piket.

---

## 2. Logic Chain

1. **Re-Submission Reset**:
   - *Premise*: Re-submitting a rejected item must reset the previous rejected item for that specific duty without destroying unrelated records.
   - *Inference*: In `GuruPresensi.tsx` and `PiketView.tsx`, 1-to-1 replacement works as expected. In `GuruJurnal.tsx`, deleting `dailyState.jurnalDitolak.map(j => j.id)` is defective because a teacher teaching multiple classes in a day will lose all other rejected classes upon submitting one. Modifying `GuruJurnal.tsx` to delete only the matching class/mapel entry resolves this bug. Adding `sekolah_id` ensures multi-tenant integrity.

2. **Rejection Notification**:
   - *Premise*: When Admin rejects a submission, the teacher must be notified.
   - *Inference*: Since `push_subscriptions` and `sendWebPush` already exist, creating a dedicated server endpoint (`/api/notifications/rejection`) that sends both a native Web Push and inserts a message into `chat_messages` ensures teachers receive instant push notifications on their devices and have persistent in-app notifications. Calling this endpoint from `AdminVerifView.tsx` and `PiketView.tsx` fulfills R1.2.

3. **Auto-Alpa Cutoff**:
   - *Premise*: If a teacher does not resubmit by the end of pulang presensi (`jam_pulang_akhir`), the status must change to `Alpa` in the database.
   - *Inference*: A standalone evaluator (`src/lib/attendanceAlpa.ts`) and API route (`/api/attendance/auto-alpa`) can query records with `status_verifikasi = 'Ditolak'` after cutoff and update them to `status_verifikasi = 'Alpa'` / `jenis_presensi = 'Alpa'`. Updating `AdminRekapView.tsx` ensures explicit Alpa entries are counted alongside late accumulation.

4. **Admin Verification UI**:
   - *Premise*: Rejecting an item must hide the "Setujui" button and remove the rejected item from the verification queue.
   - *Inference*: In `AdminVerifView.tsx`, wrapping the "Setujui" button with `{item.status_verifikasi !== 'Ditolak' && ...}` ensures the button disappears. Filtering out rejected records from local state (`setPresensiList(prev => prev.filter(item => item.id !== id))`) immediately removes the row/card upon rejection.

5. **3x Absence Warning**:
   - *Premise*: A warning must be issued if a teacher misses presensi, journals, or piket 3 times consecutively or accumulated.
   - *Inference*: Building `src/lib/warningSystem.ts` to compute violations across the 3 domains allows rendering warning alert banners on the teacher's dashboard (`HomeView.tsx`) and in Admin monitoring (`AdminMonitorView.tsx`), directly satisfying R1.5.

---

## 3. Caveats

1. **Cutoff Scheduling in Serverless / Next.js**:
   Next.js applications without a continuously running background daemon rely on external crons (e.g. Vercel Cron or Supabase pg_cron) or trigger-on-load evaluation. Providing both an API endpoint (`/api/attendance/auto-alpa`) and a trigger-on-load check ensures auto-alpa functions seamlessly in local dev, test scripts, and hosted deployments.
2. **Push Permission**:
   Push notifications depend on the teacher granting notification permission and having an active subscription in `push_subscriptions`. By dual-writing notifications to `chat_messages`, teachers who have not granted push permissions will still receive the rejection notification inside the application.

---

## 4. Conclusion

Requirement R1 is clearly scoped and technically feasible. All required database tables and rejection feedback columns (`catatan_admin`, `alasan_penolakan`) are already present in Postgres. The primary gaps are:
1. Fixing the indiscriminate batch deletion bug in `GuruJurnal.tsx`.
2. Adding rejection notification dispatch via Web Push and in-app `chat_messages`.
3. Implementing the auto-alpa cutoff transition in the database and updating `AdminRekapView.tsx`.
4. Updating `AdminVerifView.tsx` to hide "Setujui" and remove rejected cards from the verification queue.
5. Implementing `warningSystem.ts` and its corresponding UI banners.

Detailed technical design and line-by-line specifications are documented in `survey_r1.md`.

---

## 5. Verification Method

To independently verify the survey observations:
1. **Inspect rejection columns**:
   `view_file` on `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\types\database.ts` at lines 473, 596, 960.
2. **Inspect batch delete bug in Jurnal**:
   `view_file` on `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\GuruJurnal.tsx` at lines 339–342.
3. **Inspect Setujui button in Admin Verification**:
   `view_file` on `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminVerifView.tsx` at lines 844–858.
4. **Inspect Alpa calculation in Rekap**:
   `view_file` on `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminRekapView.tsx` at lines 163–168.
5. **Run test runner**:
   Run `npm run test` or `npx tsx scripts/test-attendance-sync.ts` in the project root to verify TypeScript/Next.js environment health.
