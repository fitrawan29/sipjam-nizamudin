# Survey Report: Requirement R1 (Alur Presensi, Jurnal, dan Laporan Piket)

**Date**: 2026-09-24  
**Explorer**: Explorer 1 (`teamwork_preview_explorer`)  
**Scope**: Codebase analysis, gap assessment, and technical architecture recommendations for Requirement R1.

---

## 1. Executive Summary

Requirement R1 addresses the end-to-end workflow when submissions for Presensi, Jurnal Pembelajaran, or Laporan Piket are rejected by an Admin, notifications to affected teachers, auto-alpa cutoff enforcement, Admin verification UI adjustments, and a multi-dimensional 3x absence warning system.

| Sub-Requirement | Current Codebase Status | Key Files Involved | Primary Action Required |
|---|---|---|---|
| **R1.1: Re-submission Reset on Reject** | Partially implemented in `GuruPresensi.tsx` & `PiketView.tsx`. **Critical Bug in `GuruJurnal.tsx`** where submitting one journal deletes *all* rejected journals indiscriminately. | `src/components/GuruPresensi.tsx`<br>`src/components/GuruJurnal.tsx`<br>`src/components/PiketView.tsx`<br>`src/lib/workflow.ts` | Target deletion/reset to the specific rejected entry matching class/subject; populate missing `sekolah_id` in Jurnal insert payload. |
| **R1.2: Notification to Teacher on Rejection** | **Missing entirely**. Admin rejection only writes to database; no notification is dispatched to teacher. | `src/components/AdminVerifView.tsx`<br>`src/components/PiketView.tsx`<br>`src/app/api/notifications/rejection/route.ts` *(new)*<br>`src/lib/vapid.ts` | Add Web Push notification dispatch + in-app `chat_messages` insertion upon rejection in Admin verification. |
| **R1.3: Auto-Alpa at Pulang Cutoff** | Workflow sets `isAlpa: true` in client state, but **no database update occurs** when the pulang cutoff passes without resubmission. `AdminRekapView.tsx` only counts late accumulation. | `src/lib/attendanceAlpa.ts` *(new)*<br>`src/app/api/attendance/auto-alpa/route.ts` *(new)*<br>`src/components/AdminRekapView.tsx`<br>`src/lib/workflow.ts` | Implement cutoff evaluation against `pengaturan.jam_pulang_akhir` that mutates unresubmitted rejections to `status_verifikasi = 'Alpa'` / `jenis_presensi = 'Alpa'` in DB. Update Rekap to count explicit Alpa. |
| **R1.4: Admin Verification UI Updates** | When an item is rejected, the **"Setujui" button is NOT hidden** (remains clickable) and the **rejected card is NOT removed** from the verification list. | `src/components/AdminVerifView.tsx` | Conditionally hide "Setujui" when `status_verifikasi === 'Ditolak'`; optimistically filter out rejected cards from the pending verification list. |
| **R1.5: 3x Absence Warning Feature** | **Completely non-existent**. No calculation or presentation of 3x consecutive/accumulated absences for Presensi, Jurnal, or Piket. | `src/lib/warningSystem.ts` *(new)*<br>`src/components/HomeView.tsx`<br>`src/components/AdminMonitorView.tsx` | Implement domain calculation for 3x violations (Presensi, Jurnal, Piket) and render warning cards/badges in Teacher HomeView and Admin Pantauan/Rekap. |

---

## 2. Detailed Technical Survey by Sub-Requirement

### 2.1. Re-Submission Reset on Reject by Admin

#### Context & Requirement
> *"Jika presensi, jurnal, atau laporan piket ditolak admin, guru harus mengisinya kembali pada hari yang sama. Pengisian ulang ini akan me-reset data yang lama."*

#### Database Tables & Columns
- **`presensi_guru`**: `id`, `timestamp`, `nama_guru`, `tipe_absen`, `jenis_presensi`, `status_verifikasi`, `catatan_admin`, `alasan_penolakan`, `sekolah_id`
- **`jurnal_pembelajaran`**: `id`, `timestamp`, `nama_guru`, `kelas`, `mapel`, `tanggal`, `keterangan`, `status_verifikasi`, `catatan_admin`, `alasan_penolakan`, `sekolah_id`
- **`laporan_piket`**: `id`, `timestamp`, `tanggal`, `guru_pelapor`, `rekap_absen_kelas`, `status_verifikasi`, `catatan_admin`, `alasan_penolakan`, `sekolah_id`

#### Current Implementation Analysis
1. **Presensi (`src/components/GuruPresensi.tsx`)**:
   - Lines 150: Checks `dailyState?.presensiDatang && !dailyState?.presensiDatangDitolak`. Allows resubmission of "Datang" when rejected.
   - Lines 265–269:
     ```ts
     const rejectedRecord = tipeAbsen === 'Datang' ? dailyState?.presensiDatangDitolak : dailyState?.presensiPulangDitolak;
     if (rejectedRecord?.id) {
       await supabase.from('presensi_guru').delete().eq('id', rejectedRecord.id);
     }
     ```
   - *Status*: Working for single record, but should also ensure atomic consistency or delete by date & teacher if multiple records exist.

2. **Jurnal Pembelajaran (`src/components/GuruJurnal.tsx`)**:
   - Lines 339–342:
     ```ts
     if (dailyState?.jurnalDitolak && dailyState.jurnalDitolak.length > 0) {
       const rejectedIds = dailyState.jurnalDitolak.map((j: any) => j.id);
       await supabase.from('jurnal_pembelajaran').delete().in('id', rejectedIds);
     }
     ```
   - **CRITICAL BUG IDENTIFIED**:
     When a teacher has multiple teaching sessions in a single day (e.g. Class 7A and Class 7B) and both were rejected, re-submitting Class 7A deletes ALL rejected journals (including 7B) from the database! Class 7B disappears without ever being resubmitted by the teacher.
   - **Missing Column in Payload**:
     Line 311: `newJurnal` object does NOT include `sekolah_id`. In multi-tenant environments with RLS, this can trigger insert failures or decouple tenant association.

3. **Laporan Piket (`src/components/PiketView.tsx`)**:
   - Lines 333–335:
     ```ts
     if (dailyState?.laporanPiketDitolak?.id) {
       await supabase.from('laporan_piket').delete().eq('id', dailyState.laporanPiketDitolak.id);
     }
     ```
   - *Status*: Works because piket report is 1 per day per teacher. State refresh properly resets `laporanPiketDitolak`.

#### Necessary Changes
- In `src/components/GuruJurnal.tsx`:
  Match the rejected journal specifically by `mapel` and `kelas` (or matching ID if the user selects which rejected journal they are correcting):
  ```ts
  const matchingRejected = dailyState?.jurnalDitolak?.find((j: any) => 
    (tipeJurnal === 'Jurnal Kegiatan' && (j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan')) ||
    (tipeJurnal === 'Jurnal KBM' && j.kelas === kelas && (j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel })))
  );
  if (matchingRejected?.id) {
    await supabase.from('jurnal_pembelajaran').delete().eq('id', matchingRejected.id);
  }
  ```
  And add `...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})` to `newJurnal`.

---

### 2.2. Notification to Teacher on Rejection

#### Context & Requirement
> *"Kirimkan notifikasi kepada guru jika data mereka ditolak."*

#### Existing Infrastructure
- **`push_subscriptions` table**:
  `id`, `user_id`, `user_nama`, `user_role`, `endpoint`, `p256dh`, `auth`, `sekolah_id`, `created_at`
- **`src/lib/vapid.ts`**: Provides `sendWebPush(subscription, payload)` using web-push library and VAPID keys.
- **`src/app/api/push/send-reminders/route.ts`**: Dispatches batch push notifications for missing tasks.
- **`chat_messages` table**:
  `id`, `sender_id`, `sender_nama`, `recipient_id`, `recipient_nama`, `pesan`, `is_read`, `created_at`, `sekolah_id`

#### Current Implementation Analysis
- In `src/components/AdminVerifView.tsx` (lines 144–219, `verifyItem`):
  When Admin rejects an item:
  - Updates DB: `status_verifikasi = 'Ditolak'`, `catatan_admin = rejectionReason`, `alasan_penolakan = rejectionReason`.
  - Shows SweetAlert toast to Admin.
  - **NO notification of any kind is dispatched to the teacher**.
- In `src/components/PiketView.tsx` (lines 201–250, `updatePiketStatus`):
  Admin can reject from Rekap Piket. Also dispatches zero notifications.

#### Necessary Changes
1. Create a server-side endpoint: `src/app/api/notifications/rejection/route.ts`:
   - Input payload:
     ```ts
     {
       teacherName: string;
       sekolahId?: string;
       category: 'Presensi' | 'Jurnal' | 'Piket';
       detailInfo: string;       // e.g. "Presensi Datang", "Jurnal VII A (MTK)", "Laporan Piket"
       rejectionReason: string;
       adminName: string;
     }
     ```
   - Logic:
     1. Query active push subscriptions from `push_subscriptions` matching `user_nama` (or `user_id`) in `sekolah_id`.
     2. Send Web Push using `sendWebPush`:
        - `title`: `Pengajuan ${category} Ditolak`
        - `body`: `Pengajuan ${detailInfo} Anda ditolak oleh admin. Alasan: "${rejectionReason}". Silakan isi ulang.`
        - `url`: `/?view=${category === 'Presensi' ? 'view-guru-presensi' : category === 'Jurnal' ? 'view-guru-jurnal' : 'view-piket'}`
     3. Insert an in-app system notification message into `chat_messages` so it appears in the teacher's messages / notifications:
        - `sender_nama`: `Admin Verifikasi`
        - `recipient_nama`: `teacherName`
        - `pesan`: `[Pemberitahuan Sistem] Pengajuan ${detailInfo} Anda ditolak. Alasan: "${rejectionReason}". Silakan melakukan pengisian ulang hari ini.`
        - `is_read`: false
2. Wire `verifyItem` in `AdminVerifView.tsx` and `updatePiketStatus` in `PiketView.tsx` to call `/api/notifications/rejection` immediately upon successful rejection update.

---

### 2.3. Auto-Alpa at Pulang Cutoff if Not Resubmitted

#### Context & Requirement
> *"Jika guru tidak melakukan pengisian ulang hingga waktu presensi pulang ditutup, status mereka diubah menjadi alpa."*  
> Acceptance criteria: *"Verifikasi bahwa jika tidak ada perbaikan data hingga jam pulang, status berubah menjadi alpa di database."*

#### Database Settings & Tables
- **`pengaturan` table**:
  - `jam_pulang_mulai`: e.g. `'11:00'`
  - `jam_pulang_jumat`: e.g. `'11:00'`
  - `jam_pulang_akhir`: e.g. `'22:00'` (pulang cutoff time)
  - `aturan_kehadiran_guru`: `'Semua_Hari'` or `'Hari_Mengajar_Saja'`
- **`presensi_guru` table**:
  - `jenis_presensi`: `'Sekolah' | 'Dinas Luar' | 'Izin' | 'Sakit' | 'Alpa'`
  - `status_verifikasi`: `'Menunggu' | 'Disetujui' | 'Ditolak' | 'Alpa'`
  - `catatan_admin`: reason / auto-alpa explanation

#### Current Implementation Analysis
- In `src/lib/workflow.ts` (lines 327–351):
  Workflow checks if `!state.presensiDatang` and sets in-memory `state.isAlpa = true`.
  However, **nothing is ever written to the database**.
- In `src/components/AdminRekapView.tsx` (lines 163–168):
  `alpaOtomatis = Math.floor(telat / 14400)` (late accumulation).
  Records with `jenis_presensi === 'Alpa'` or unsubmitted/rejected presensi are NOT counted in the Rekap table.

#### Necessary Changes
1. Create dedicated Auto-Alpa processing service: `src/lib/attendanceAlpa.ts`:
   - Function `evaluateAndApplyAutoAlpa(targetDateStr?: string, sekolahId?: string)`:
     1. Retrieve cutoff time from `pengaturan.jam_pulang_akhir` (default `22:00` WITA).
     2. If target date is today: verify if current WITA time is past `jam_pulang_akhir`. If target date is in the past: cutoff has already passed.
     3. For each teacher with attendance obligation for the date:
        - Check their `presensi_guru` records for that date:
          - **Condition A (Rejected & Not Resubmitted)**:
            If teacher has a `presensi_guru` record with `tipe_absen = 'Datang'` and `status_verifikasi = 'Ditolak'`, and no subsequent `Datang` record with `status_verifikasi != 'Ditolak'`:
            -> Update that rejected record:
               `status_verifikasi = 'Alpa'`, `jenis_presensi = 'Alpa'`,
               `catatan_admin = 'Status diubah menjadi Alpa karena tidak mengisi ulang presensi hingga batas waktu pulang.'`
          - **Condition B (Rejected Jurnal / Piket Not Resubmitted)**:
            If teacher's journal or piket was rejected and not resubmitted by cutoff:
            -> Update or insert presensi to record the non-compliance as Alpa.
          - **Condition C (Never Submitted)**:
            If teacher has zero Datang presensi for the school day:
            -> Insert a presensi record with `tipe_absen: 'Datang'`, `jenis_presensi: 'Alpa'`, `status_verifikasi: 'Alpa'`, `timestamp: targetDateStr + ' 22:00:00'`.
2. Create API endpoint: `src/app/api/attendance/auto-alpa/route.ts` (GET & POST) to enable scheduled cron calls or manual/test invocations.
3. Update `AdminRekapView.tsx` (lines 131–142):
   Include explicit Alpa in calculations:
   ```ts
   else if (p.jenis_presensi === 'Alpa' || p.status_verifikasi === 'Alpa') {
     pMap[nama].alpaDirect = (pMap[nama].alpaDirect || 0) + 1;
   }
   ```
   And in total: `alpa: alpaOtomatis + (pMap[k].alpaDirect || 0)`.

---

### 2.4. Admin Verification UI Update (Hide Setujui, Remove Rejected Item)

#### Context & Requirement
> *"Pada halaman verifikasi admin: Jika admin menolak data, tombol 'Setujui' otomatis hilang, dan data yang ditolak tersebut otomatis dihapus dari daftar verifikasi."*  
> Acceptance criteria: *"Saat status ditolak disubmit, baris data hilang dari daftar verifikasi dan tombol setujui tidak dapat di-klik lagi."*

#### Current Implementation Analysis in `src/components/AdminVerifView.tsx`
1. **Setujui Button Rendering (lines 844–858)**:
   ```tsx
   <button 
     disabled={processingId === item.id || item.status_verifikasi === 'Disetujui'}
     onClick={() => verifyItem(item.id, 'Disetujui')} 
     className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition ... ${
       item.status_verifikasi === 'Disetujui' ? '...' : 'bg-green-500 ...'
     }`}
   >
     <i className="fa-solid fa-check"></i> Setujui
   </button>
   ```
   - When an item has `status_verifikasi === 'Ditolak'`, `item.status_verifikasi === 'Disetujui'` is `false`.
   - The button remains visible and fully enabled! Admin can still click "Setujui" on a rejected item.
2. **List Persistence on Rejection (lines 196–203)**:
   ```ts
   // Optimistic update
   if (activeTab === 'Presensi') {
     setPresensiList(prev => prev.map(item => item.id === id ? { ...item, ...updatePayload } : item));
   } else if (activeTab === 'Jurnal') {
     setJurnalList(prev => prev.map(item => item.id === id ? { ...item, ...updatePayload } : item));
   } else {
     setPiketList(prev => prev.map(item => item.id === id ? { ...item, ...updatePayload } : item));
   }
   ```
   - The rejected item remains in `presensiList`, `jurnalList`, or `piketList`.
   - In `displayList` (lines 450–519), unless the admin explicitly changes `verifFilter`, the rejected item remains visible on screen with a red badge. It is NOT removed from the active verification list.

#### Necessary Changes
1. **Hide "Setujui" Button on Rejected Items**:
   In `src/components/AdminVerifView.tsx` (around line 844):
   ```tsx
   {item.status_verifikasi !== 'Ditolak' && (
     <button 
       disabled={processingId === item.id || item.status_verifikasi === 'Disetujui'}
       onClick={() => verifyItem(item.id, 'Disetujui')} 
       className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
         item.status_verifikasi === 'Disetujui'
           ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
           : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
       }`}
     >
       ...
     </button>
   )}
   ```
2. **Remove Rejected Item from the Verification List**:
   In `verifyItem` when `status === 'Ditolak'`:
   Remove the item from the state arrays so it disappears immediately from the active verification UI:
   ```ts
   if (status === 'Ditolak') {
     if (activeTab === 'Presensi') {
       setPresensiList(prev => prev.filter(item => item.id !== id));
     } else if (activeTab === 'Jurnal') {
       setJurnalList(prev => prev.filter(item => item.id !== id));
     } else {
       setPiketList(prev => prev.filter(item => item.id !== id));
     }
   }
   ```
   In addition, in `displayList` memoization:
   When `verifFilter === 'Semua'` or `verifFilter === 'Menunggu'`, filter out any items with `status_verifikasi === 'Ditolak'`. (Rejected items are only shown if the admin explicitly selects `verifFilter === 'Ditolak'`).

---

### 2.5. 3x Absence Warning Feature (Presensi, Jurnal, Piket)

#### Context & Requirement
> *"Tambahkan fitur peringatan (warning) bagi guru yang tidak melakukan presensi, tidak mengisi jurnal, dan tidak mengisi laporan piket masing-masing sebanyak 3 kali berturut-turut/akumulasi."*  
> Acceptance criteria: *"Verifikasi bahwa peringatan 3x absen muncul sesuai dengan kondisi data (presensi, jurnal, laporan)."*

#### Current Status
- Zero implementation exists in the codebase.

#### Technical Architecture Recommendation
Create `src/lib/warningSystem.ts`:
```ts
export interface TeacherWarningSummary {
  teacherId: string;
  teacherName: string;
  hasWarning: boolean;
  warnings: {
    category: 'Presensi' | 'Jurnal' | 'Piket';
    type: 'berturut-turut' | 'akumulasi';
    count: number;
    dates: string[];
    message: string;
  }[];
}
```

1. **Calculation Rules per Category**:
   - **Presensi**:
     - Evaluate past 30 days (excluding holidays from `kalender_pendidikan` and Sundays/non-school Saturdays).
     - Violation day = Teacher had attendance obligation, but had no Datang presensi OR presensi is 'Alpa' / unresubmitted 'Ditolak'.
     - If count >= 3 consecutive days OR total accumulated >= 3 days -> Trigger Warning.
   - **Jurnal Pembelajaran**:
     - Evaluate dates where teacher had teaching obligations in `jadwal_pelajaran`.
     - Violation day = Teacher had classes scheduled, but submitted 0 journals OR submitted fewer journals than required classes.
     - If count >= 3 consecutive scheduled teaching days OR total accumulated >= 3 days -> Trigger Warning.
   - **Laporan Piket**:
     - Evaluate dates where teacher was assigned in `penugasan_piket` / `jadwal_piket`.
     - Violation day = Assigned to piket on that date, but submitted no `laporan_piket` (or rejected and not resubmitted).
     - If count >= 3 consecutive piket assignments OR total accumulated >= 3 days -> Trigger Warning.

2. **UI Integration**:
   - **Teacher Dashboard (`src/components/HomeView.tsx`)**:
     Render a prominent warning banner at the top of the dashboard whenever `teacherWarnings.hasWarning` is true:
     - Clear red/amber badge with warning level:
       *"⚠️ PERINGATAN KEDISIPLINAN: Anda terdeteksi 3x tidak mengisi [Presensi / Jurnal / Laporan Piket]. Harap segera melengkapi kewajiban atau konfirmasi ke Admin."*
     - Breakdown showing dates and violation type (berturut-turut or akumulasi).
   - **Admin Dashboard (`src/components/AdminMonitorView.tsx` & `src/components/AdminRekapView.tsx`)**:
     - Add a "Peringatan Guru (3x Pelanggaran)" summary card and filterable list.
     - Admin can see list of teachers with active warnings, violation count, category, and dates.

---

## 3. Files, Tables, and Columns Summary

### Tables & Columns Affected

| Table | Relevant Columns | Role in R1 |
|---|---|---|
| `presensi_guru` | `id`, `timestamp`, `nama_guru`, `tipe_absen`, `jenis_presensi`, `status_verifikasi`, `catatan_admin`, `alasan_penolakan`, `sekolah_id` | Storing attendance, handling rejection status, resetting on resubmission, transitioning to `Alpa`. |
| `jurnal_pembelajaran` | `id`, `timestamp`, `nama_guru`, `kelas`, `mapel`, `tanggal`, `status_verifikasi`, `catatan_admin`, `alasan_penolakan`, `sekolah_id` | Storing journals, handling rejection and class-specific resubmission reset. |
| `laporan_piket` | `id`, `timestamp`, `tanggal`, `guru_pelapor`, `status_verifikasi`, `catatan_admin`, `alasan_penolakan`, `sekolah_id` | Storing daily piket report, handling rejection and reset. |
| `push_subscriptions` | `id`, `user_id`, `user_nama`, `endpoint`, `p256dh`, `auth`, `sekolah_id` | Target endpoints for Web Push notifications on rejection. |
| `chat_messages` | `id`, `sender_id`, `sender_nama`, `recipient_id`, `recipient_nama`, `pesan`, `is_read`, `created_at`, `sekolah_id` | Persistent in-app rejection notifications. |
| `pengaturan` | `key`, `value`, `jam_pulang_akhir`, `jam_pulang_jumat`, `jam_pulang_mulai` | Configured cutoff time for auto-alpa transition. |
| `data_guru` | `id`, `nama_guru`, `wajib_hadir_hanya_mengajar`, `sekolah_id` | Teacher master list for evaluation of attendance obligation and warning checks. |
| `jadwal_pelajaran` | `id`, `hari`, `kelas`, `mata_pelajaran`, `nama_guru`, `sekolah_id` | Obligation checks for journals. |
| `penugasan_piket` & `jadwal_piket` | `id`, `hari`, `guru_nama`, `tipe_petugas`, `daftar_guru`, `sekolah_id` | Obligation checks for piket. |

### Source Code Files Affected

| File Path | Description of Changes Needed |
|---|---|
| `src/components/GuruJurnal.tsx` | Fix resubmission reset to delete only matching rejected journal; add missing `sekolah_id`. |
| `src/components/GuruPresensi.tsx` | Ensure robust deletion of old rejected record and immediate state update. |
| `src/components/PiketView.tsx` | Wire rejection notification call in `updatePiketStatus`; verify resubmission reset. |
| `src/components/AdminVerifView.tsx` | 1. Hide "Setujui" button when `item.status_verifikasi === 'Ditolak'`.<br>2. Remove rejected items from active verification list upon rejection.<br>3. Dispatch notification to teacher via `/api/notifications/rejection`. |
| `src/app/api/notifications/rejection/route.ts` *(new)* | Server route to send Web Push via `sendWebPush` and insert into `chat_messages`. |
| `src/lib/attendanceAlpa.ts` *(new)* | Business logic to evaluate cutoff against `jam_pulang_akhir` and update unresubmitted records to `Alpa` in DB. |
| `src/app/api/attendance/auto-alpa/route.ts` *(new)* | API route to trigger auto-alpa processing. |
| `src/components/AdminRekapView.tsx` | Update Rekap counting logic to include explicit `Alpa` records in `presensi_guru`. |
| `src/lib/warningSystem.ts` *(new)* | Engine to compute 3x consecutive and accumulated absence violations for Presensi, Jurnal, and Piket. |
| `src/components/HomeView.tsx` | Display 3x discipline warning banner to affected teachers. |
| `src/components/AdminMonitorView.tsx` | Display warning list/badges to Admin in daily monitoring. |

---

## 4. Verification and Acceptance Testing Strategy

An automated test script `scripts/test-rejection-flow.ts` (runnable via `npx tsx scripts/test-rejection-flow.ts`) will be implemented to test:
1. **Rejection & Resubmission Reset**:
   - Create a test submission (Presensi / Jurnal / Piket).
   - Simulate Admin rejection: verify `status_verifikasi = 'Ditolak'` and notification triggered.
   - Simulate teacher resubmission: verify new submission succeeds and old rejected record is removed.
2. **Auto-Alpa Cutoff Simulation**:
   - Seed a rejected presensi record for a past/cutoff timestamp without resubmission.
   - Invoke `evaluateAndApplyAutoAlpa`: verify database record updates to `status_verifikasi = 'Alpa'` and `jenis_presensi = 'Alpa'`.
3. **Admin Verification UI Invariants**:
   - Verify that UI logic hides "Setujui" when status is `'Ditolak'`.
   - Verify that UI logic removes rejected records from the active list.
4. **3x Absence Warning Conditions**:
   - Seed 3 consecutive or accumulated absences for Presensi, Jurnal, and Piket.
   - Verify `warningSystem.ts` detects `hasWarning: true` with correct categories and dates.
