# R2 Investigation Report: Teacher Attendance & Admin Verification

**Date**: 2026-10-08  
**Investigator**: Explorer Agent (`teamwork_preview_explorer_survey_o16_2`)  
**Scope**: In-depth Codebase Survey for R2 (Teacher Attendance & Admin Verification)  
**Target Project**: `sipjam-app` (Next.js 16 + React 19 + Supabase)

---

## Executive Summary

This report delivers a comprehensive architectural and codebase investigation of `sipjam-app` focusing on **R2: Teacher Attendance & Admin Verification**. The survey analyzes current state mechanics, identifies architectural gaps, and proposes concrete, backward-compatible designs across all 6 requested inquiry areas:
1. Multi-state arrival and departure flow transitions ("Hadir di Sekolah" vs "Dinas Luar").
2. Automated detection and flagging for forgotten checkouts (Auto-checkout).
3. Routing long-term sick ($\ge 3$ days) and leave ($> 3$ days) submissions to the Admin verification dashboard.
4. Auto-attaching GPS coordinates to printed documents and handling GPS denial/blocking alerts.
5. Supabase schema analysis and migration requirements.
6. E2E test harness requirements and test specifications in `tests/e2e/`.

---

## 1. Teacher Attendance Flow ("Hadir di Sekolah" vs "Dinas Luar")

### 1.1 Existing Check-in (Datang) and Check-out (Pulang) Mechanism
- **Core Component**: `src/components/GuruPresensi.tsx` (1,025 lines)
- **Workflow Engine**: `src/lib/workflow.ts` (620 lines) — `getGuruDailyState(namaGuru, username, userId, sekolahId)`
- **Check-in (Datang)**:
  - Managed via state `tipeAbsen` (`'Datang' | 'Pulang'`).
  - Active time window governed by `pengaturan` keys: `jam_datang_mulai`, `jam_datang_batas`, `jam_datang_akhir` (`GuruPresensi.tsx:458-473`).
  - Validates selfie camera requirement (`isSelfieRequired`, `GuruPresensi.tsx:387-393`).
  - Calculates `keterlambatan_detik` if current time exceeds `jam_datang_batas`.
  - Determines `status_verifikasi`:
    ```ts
    // GuruPresensi.tsx:494-497
    const statusVerif = isTerlambat
      ? 'Menunggu' // Izin Terlambat always requires admin verification
      : (jenisPresensi === 'Sekolah' && (jarakAktual === null || jarakAktual <= gpsConfig.radius) ? 'Diverifikasi' : 'Menunggu');
    ```
- **Check-out (Pulang)**:
  - Enabled once `dailyState.presensiDatang` is recorded (or if rejected, resubmission is allowed).
  - Check-out is **locked** (`isPulangLocked`, `GuruPresensi.tsx:705`) if `dailyState.canPresensiPulang` is `false`.
  - In `src/lib/workflow.ts:584-610`, `canPresensiPulang` requires:
    1. All scheduled KBM classes have matching journals (`jurnalKBM`), OR teacher is on `isBlok`, OR teacher is `isDinasLuar` with 1 `jurnalKegiatan`, OR teacher has no teaching schedule (`jadwalKBM.length === 0`).
    2. Picket report (`laporanPiket`) is completed if the teacher is assigned picket duty (`isPiket`).
  - Active time window governed by `jam_pulang_mulai` (or `jam_pulang_jumat` on Fridays) up to `jam_pulang_akhir` (`GuruPresensi.tsx:474-486`).

### 1.2 Current State of "Dinas Luar"
- In `GuruPresensi.tsx:787-800`:
  - When checking in (`Datang`), user can pick `'Sekolah'`, `'Dinas Luar'`, `'Izin Terlambat'`, `'Izin'`.
  - When checking out (`Pulang`), the dropdown behavior is governed by line 710:
    ```ts
    // GuruPresensi.tsx:710
    const isJenisDropdownDisabled = tipeAbsen === 'Pulang' && !dailyState?.isDinasLuar;
    ```
  - **Limitation**: If a teacher arrives at school (`Sekolah`), the dropdown is **disabled** during Pulang, forcing checkout as `'Sekolah'`. If the teacher leaves for external duty in the afternoon, they cannot check out as "Dinas Luar".
  - If a teacher checks in as `'Dinas Luar'`, line 787 renders:
    ```tsx
    {tipeAbsen === 'Pulang' && dailyState?.isDinasLuar ? (
      <>
        <option value="Sekolah">Di Sekolah</option>
        <option value="Dinas Luar">Dinas Luar</option>
      </>
    ) : ...
    ```

### 1.3 Recommended Multi-State Arrival/Departure Implementation
To satisfy the requirement *"Implement multi-state arrival/departure flows ('Hadir di Sekolah' vs 'Dinas Luar')"*:
1. **Four Valid State Transitions**:
   - **Transition 1 (School $\to$ School)**: Arrive at School (`Hadir di Sekolah`) $\to$ Leave from School (`Hadir di Sekolah`).
   - **Transition 2 (School $\to$ External)**: Arrive at School (`Hadir di Sekolah`) $\to$ Leave on External Duty (`Dinas Luar`).
   - **Transition 3 (External $\to$ External)**: Arrive at External Duty (`Dinas Luar`) $\to$ Leave from External Duty (`Dinas Luar`).
   - **Transition 4 (External $\to$ School)**: Arrive at External Duty (`Dinas Luar`) $\to$ Return and Leave from School (`Hadir di Sekolah`).
2. **UI Updates in `GuruPresensi.tsx`**:
   - Standardize option values to `'Sekolah'` (display: "Hadir di Sekolah") and `'Dinas Luar'` (display: "Dinas Luar"). Support backward-compatible checks (`r.jenis_presensi === 'Sekolah' || r.jenis_presensi === 'Hadir di Sekolah'`).
   - Remove `isJenisDropdownDisabled` restriction so teachers can select between "Hadir di Sekolah" and "Dinas Luar" during Pulang regardless of arrival mode.
   - For departure as "Dinas Luar", require selfie capture (`isSelfieRequired = true`) and record location coordinates.
3. **Workflow Adjustments in `src/lib/workflow.ts`**:
   - Track separate states:
     - `state.arrivalState`: `'Hadir di Sekolah' | 'Dinas Luar' | 'Izin' | null`
     - `state.departureState`: `'Hadir di Sekolah' | 'Dinas Luar' | null`
   - If arrival is `'Hadir di Sekolah'` and departure is `'Dinas Luar'`, verify that KBM journal requirements are relaxed for classes occurring during the external assignment period, or require 1 `Jurnal Kegiatan` documenting the external duty.

---

## 2. Auto-Checkout Flagging (Forgotten Checkouts)

### 2.1 Current System Behavior
- `src/lib/attendanceAlpa.ts` (lines 45–284) implements `evaluateAndApplyAutoAlpa(targetDate, sekolahId, options)` called via cron/API at `src/app/api/attendance/auto-alpa/route.ts`.
- Currently, `attendanceAlpa.ts`:
  1. Checks if unresubmitted rejected records exist $\to$ converts to `Alpa` (F6).
  2. Finds active teachers who have **NO** attendance record at all on `targetDate` $\to$ inserts a new record with `tipe_absen: 'Datang'`, `jenis_presensi: 'Alpa'`, `status_verifikasi: 'Alpa'`.
- **Architectural Gap**: If a teacher completed check-in (`Datang`) at 07:00 WITA, but **completely forgot** to check out (`Pulang`) before `jam_pulang_akhir` (e.g., 18:00 or 22:00 WITA), the system **does not flag or record anything**. The teacher has an open-ended arrival without departure.

### 2.2 Detection Mechanism for Forgotten Checkouts
- **Trigger Conditions**:
  1. Record exists for teacher on `targetDate` with `tipe_absen === 'Datang'` and `status_verifikasi !== 'Ditolak'` and `jenis_presensi !== 'Alpa'`.
  2. Teacher is **not** on approved full-day leave (`isIzinSakit === false`).
  3. No record exists with `tipe_absen === 'Pulang'` on `targetDate`.
  4. The current time is past `jam_pulang_akhir` (for today's evaluation) OR the evaluation is running for a past calendar date ($T > \text{cutoff}$).

### 2.3 Proposed Flagging Architecture
1. **Database Representation (Explicit Pulang Record)**:
   - In `src/lib/attendanceAlpa.ts`, add an evaluation pass `evaluateAndApplyAutoCheckout(targetDate, sekolahId, options)`.
   - Insert an auto-generated check-out record into `public.presensi_guru`:
     ```ts
     {
       id: crypto.randomUUID(),
       timestamp: `${targetDate}T${cutoffTime}:00+08:00`,
       nama_guru: teacher.nama_guru,
       user_id: teacher.user_id,
       tipe_absen: 'Pulang',
       jenis_presensi: 'Auto-Checkout',
       status_verifikasi: 'Lupa Checkout',
       catatan_admin: 'Auto-checkout: Guru tidak melakukan presensi pulang hingga batas waktu operasional sekolah.',
       sekolah_id: teacher.sekolah_id,
       lokasi: 'Sistem Otomatis (Lupa Checkout)',
       jarak: '0 m'
     }
     ```
2. **Workflow & UI Integration**:
   - In `src/lib/workflow.ts`:
     - If `acceptedPresensi` has `tipe_absen === 'Pulang'` with `status_verifikasi === 'Lupa Checkout'`, populate `state.isAutoCheckout = true`.
   - In `src/components/GuruPresensi.tsx`:
     - Display an informative banner if yesterday or today was flagged as "Lupa Checkout":
       `"Anda tercatat Lupa Melakukan Presensi Pulang pada tanggal [X]. Status: Lupa Checkout."`
   - In `src/components/AdminMonitorView.tsx` & `src/components/AdminRekapView.tsx`:
     - Highlight the red/amber badge `"Lupa Checkout"` in daily monitor.
     - Add a dedicated column or metric in Rekap: `Lupa Pulang`.

---

## 3. Sick & Leave Approval Routing ($\ge 3$ Days Sakit & $> 3$ Days Izin)

### 3.1 Current Submission and Approval Flow
- In `src/components/GuruPresensi.tsx:835-913`:
  - Teacher selects `jenisPresensi: 'Izin'`.
  - Dropdown `detailIzin`: `'Sakit' | 'Izin Pribadi' | 'Izin Khusus'`.
  - Textarea `keterangan` + file upload `file` (Surat Keterangan).
  - Status is unconditionally set to `'Menunggu'` (`GuruPresensi.tsx:496`).
  - Record is inserted into `public.presensi_guru`.
  - **Limitations**:
    1. There is no field for duration (`durasi_hari`) or date range (`tanggal_mulai`, `tanggal_selesai`).
    2. Every sick or permission request is treated as a 1-day submission.
    3. All submissions go to the same queue in `AdminVerifView.tsx` without distinction between short-term single-day absence and long-term medical/extended leave.

### 3.2 Escalation Threshold Rules
- **Rule 1 — Sick Leave (Sakit)**:
  - If `durasi_hari < 3`: Standard short-term sick note. Can be auto-noted or reviewed routinely.
  - If $\mathbf{\text{durasi\_hari} \ge 3}$: **Long-Term Sick Leave**. Requires official doctor's note (`surat_dokter`) and **MUST** be routed to Admin dashboard for explicit approval (`status_verifikasi = 'Menunggu'`).
- **Rule 2 — Personal / Special Leave (Izin)**:
  - If `durasi_hari \le 3`: Regular short leave.
  - If $\mathbf{\text{durasi\_hari} > 3}$: **Extended Leave (Cuti / Izin Khusus)**. **MUST** be routed to Admin dashboard for explicit approval (`status_verifikasi = 'Menunggu'`).

### 3.3 Proposed Routing & Dashboard Architecture
1. **Frontend Form Enhancements (`GuruPresensi.tsx`)**:
   - When `jenisPresensi === 'Izin'`:
     - Add `durasi_hari` number input (default: 1, min: 1, max: 30) OR Date Range inputs (`tanggal_mulai`, `tanggal_selesai`).
     - Dynamic threshold badge:
       - If `detailIzin === 'Sakit'` and `durasi_hari >= 3`: Display warning badge:
         `"Sakit ≥ 3 Hari: Wajib melampirkan Surat Keterangan Dokter dan memerlukan verifikasi Admin."`
       - If `detailIzin !== 'Sakit'` and `durasi_hari > 3`: Display warning badge:
         `"Izin > 3 Hari: Izin jangka panjang memerlukan persetujuan Admin."`
   - Set flag `memerlukan_persetujuan_admin = (detailIzin === 'Sakit' && durasi >= 3) || (detailIzin !== 'Sakit' && durasi > 3)`.
2. **Admin Verification Dashboard (`AdminVerifView.tsx`)**:
   - On the `Presensi` tab (`AdminVerifView.tsx:818-839`):
     - Check if submission has `durasi_hari >= 3` (for Sakit) or `durasi_hari > 3` (for Izin).
     - Render distinctive badge:
       - `<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Sakit ≥ 3 Hari (Perlu Persetujuan)</span>`
       - `<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Izin > 3 Hari (Perlu Persetujuan)</span>`
     - Display start date, end date, and duration: `"Periode: ${tanggal_mulai} s/d ${tanggal_selesai} (${durasi_hari} Hari)"`.
     - Admin can click **"Setujui"** or **"Tolak"** (with rejection reason).
3. **Multi-Day Coverage in `src/lib/workflow.ts`**:
   - Update query in `workflow.ts:401-436`:
     - Check if there is an approved sick/leave record where `todayStr` falls between `tanggal_mulai` and `tanggal_selesai`.
     - If found:
       `state.isIzinSakit = true`, `state.bebasAlpa = true`, `state.lockedReason = 'Anda sedang ${jp} (${durasi_hari} hari, disetujui Admin)'`.
     - This guarantees the teacher is **not marked Alpa** across all consecutive approved days without needing to check in each morning!

---

## 4. GPS Coordinates on Printed Documents & Geolocation Alerting

### 4.1 Inventory of Print Documents
All printed documents in `sipjam-app` use native `window.print()` and shared header/footer components:
1. `src/components/AdminRekapView.tsx:436` — Rekapitulasi Presensi & Jurnal Guru (Admin).
2. `src/components/RekapJurnalView.tsx:945` — Rekap Jurnal Pembelajaran Guru (Mode Pribadi & Mode Kelas).
3. `src/components/DokumenView.tsx:777` — Bank Dokumen / Perangkat Pembelajaran.
4. `src/components/PiketView.tsx:3473` — Laporan Harian Guru Piket.
5. `src/components/GradebookView.tsx:1562` — Daftar Nilai / Buku Nilai Siswa.
6. `src/components/RekapSiswaView.tsx:1171,1360` — Rekap Presensi Siswa (Wali Kelas & Admin).

### 4.2 Shared Component: `PrintHeader.tsx` & `PrintSignature`
- `src/components/PrintHeader.tsx`:
  - Contains `PrintHeader` (KOP surat, logos, school address, NPSN) and `PrintSignature` (official signatures & legal footer).
  - In `PrintSignature` (lines 376–380):
    ```tsx
    {/* Security Footer */}
    <div className="print-only text-[9px] text-gray-500 mt-6 text-left max-w-4xl mx-auto">
      Dicetak dari Sistem SIPJAM oleh {namaPencetak || 'Pengguna'} pada {timestamp} WITA.<br/>
      Dokumen ini sah dan tidak untuk diedit.
    </div>
    ```

### 4.3 Implementation Strategy: Auto-Attaching GPS & Alerts
1. **Print Interceptor Utility (`src/utils/printWithGps.ts`)**:
   Create a reusable helper for triggering print with mandatory GPS attachment:
   ```ts
   export async function triggerPrintWithGps(options: {
     onCoordinatesAcquired: (coords: { lat: number; lng: number; accuracy: number }) => void;
     onErrorAlert?: (msg: string) => void;
   }): Promise<boolean> {
     if (typeof window === 'undefined') return false;

     if (!navigator.geolocation) {
       Swal.fire({
         icon: 'error',
         title: 'GPS Tidak Didukung',
         text: 'Browser Anda tidak mendukung layanan geolokasi GPS.',
         confirmButtonColor: '#0B4619'
       });
       return false;
     }

     return new Promise((resolve) => {
       navigator.geolocation.getCurrentPosition(
         (pos) => {
           options.onCoordinatesAcquired({
             lat: pos.coords.latitude,
             lng: pos.coords.longitude,
             accuracy: Math.round(pos.coords.accuracy)
           });
           setTimeout(() => {
             window.print();
             resolve(true);
           }, 200); // Allow DOM to re-render with GPS badge before print dialog opens
         },
         (err) => {
           let errorTitle = 'Akses GPS Terkendala';
           let errorMessage = 'Gagal mendeteksi lokasi GPS.';
           if (err.code === err.PERMISSION_DENIED) {
             errorTitle = 'Akses GPS Diblokir';
             errorMessage = 'Izin lokasi browser diblokir atau ditolak. Mohon izinkan akses lokasi (GPS) pada pengaturan browser Anda untuk mencetak dokumen resmi.';
           } else if (err.code === err.POSITION_UNAVAILABLE) {
             errorTitle = 'Sinyal GPS Tidak Tersedia';
             errorMessage = 'Titik lokasi GPS tidak dapat ditemukan pada perangkat Anda.';
           } else if (err.code === err.TIMEOUT) {
             errorTitle = 'Waktu GPS Habis';
             errorMessage = 'Waktu permintaan sinyal GPS habis. Silakan coba lagi.';
           }

           Swal.fire({
             icon: 'warning',
             title: errorTitle,
             text: errorMessage,
             confirmButtonColor: '#0B4619'
           });
           resolve(false);
         },
         { enableHighAccuracy: true, timeout: 6000 }
       );
     });
   }
   ```
2. **Attaching GPS to Printed Footer in `PrintHeader.tsx`**:
   - Accept optional `gpsCoords?: { lat: number; lng: number; accuracy?: number }` in `PrintSignatureProps` or context.
   - In `PrintSignature` security footer:
     ```tsx
     <div className="print-only text-[9px] text-gray-500 mt-6 text-left max-w-4xl mx-auto">
       Dicetak dari Sistem SIPJAM oleh {namaPencetak || 'Pengguna'} pada {timestamp} WITA.
       {gpsCoords && (
         <span> | Koordinat GPS: {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)} (±{gpsCoords.accuracy || 10}m)</span>
       )}
       <br/>Dokumen ini sah dan tidak untuk diedit.
     </div>
     ```

---

## 5. Database Schema & Supabase Tables Inspection

### 5.1 Tables Analyzed
| Table Name | Description | Key Columns |
|---|---|---|
| `public.presensi_guru` | Core teacher attendance table | `id`, `timestamp`, `nama_guru`, `user_id`, `tipe_absen`, `jenis_presensi`, `detail_izin`, `lokasi`, `jarak`, `link_bukti`, `status_verifikasi`, `keterlambatan_detik`, `catatan_admin`, `alasan_penolakan`, `sekolah_id` |
| `public.pengaturan` | System & school hours configuration | `key`, `value`, `sekolah_id`, `aturan_kehadiran_guru` |
| `public.data_guru` | Teacher directory | `id`, `nama_guru`, `nip`, `wajib_hadir_hanya_mengajar`, `status`, `sekolah_id` |
| `public.sekolah` | Multi-tenant school records | `id`, `nama`, `npsn`, `mode_presensi_siswa` |
| `public.sistem_blok` | Block schedule events | `id`, `nama_kegiatan`, `tanggal_mulai`, `tanggal_selesai`, `sekolah_id` |

*Note*: There is **no separate `pengajuan_izin` table** in the codebase. All teacher permissions, sick notes, tardiness, official travels, and regular attendance are stored as rows in `public.presensi_guru`.

### 5.2 Required Schema Migrations
To support R2 features without breaking legacy data, the following migration is recommended for `public.presensi_guru`:

```sql
-- Migration: 20261008_r2_teacher_attendance_and_verification.sql

-- 1. Support multi-day sick and leave durations
ALTER TABLE public.presensi_guru
  ADD COLUMN IF NOT EXISTS durasi_hari INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tanggal_mulai DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tanggal_selesai DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS memerlukan_persetujuan_admin BOOLEAN DEFAULT FALSE;

-- 2. Support auto-checkout tracking
ALTER TABLE public.presensi_guru
  ADD COLUMN IF NOT EXISTS is_auto_checkout BOOLEAN DEFAULT FALSE;

-- 3. Support explicit latitude & longitude numeric storage for high-precision validation
ALTER TABLE public.presensi_guru
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT NULL;

-- 4. Create index on multi-day date range and verification status for performant workflow lookups
CREATE INDEX IF NOT EXISTS idx_presensi_guru_leave_range 
  ON public.presensi_guru(sekolah_id, status_verifikasi, tanggal_mulai, tanggal_selesai);

CREATE INDEX IF NOT EXISTS idx_presensi_guru_auto_checkout
  ON public.presensi_guru(sekolah_id, tipe_absen, is_auto_checkout);
```

---

## 6. Acceptance Criteria & E2E Test Suite Analysis

### 6.1 Review of Current E2E Test Architecture
- **Location**: `tests/e2e/`
- **Runner**: `tests/e2e/run_all_e2e.ts` (executes via `npm run test:e2e` or `npx tsx tests/e2e/run_all_e2e.ts`)
- **Tiers**:
  1. `tier1_feature_coverage.test.ts` (F1–F15 Happy Path, 832 lines)
  2. `tier2_boundary_corner.test.ts` (F1–F15 Boundary cases, 915 lines)
  3. `tier3_cross_feature.test.ts` (Cross-feature interactions, 364 lines)
  4. `tier4_real_world_scenarios.test.ts` (End-to-end multi-actor operational workflows, 354 lines)
- **Status**: Currently passes 100% across all 4 tiers (Execution time: ~0.1s).

### 6.2 Acceptance Criteria for R2
From `ORIGINAL_REQUEST.md`:
> *"Must write an E2E test verifying that the teacher attendance flow correctly transitions states (e.g., 'Dinas Luar' check-in to check-out) and routes long-term sick/leave to the Admin dashboard."*

### 6.3 Required New E2E Test Cases for R2
The following test specifications should be implemented in `tests/e2e/`:

#### Test Case 1: Multi-State Teacher Attendance State Transitions
- **File**: `tests/e2e/tier1_feature_coverage.test.ts` & `tier3_cross_feature.test.ts`
- **Assertions**:
  1. Teacher check-in with `jenis_presensi: 'Dinas Luar'` creates pending Datang record.
  2. Workflow engine parses `state.isDinasLuar === true`.
  3. Teacher submits 1 `Jurnal Kegiatan` (satisfies duty obligation).
  4. Teacher successfully checks out with `jenis_presensi: 'Dinas Luar'` (external $\to$ external) OR `jenis_presensi: 'Hadir di Sekolah'` (external $\to$ school).
  5. Teacher checking in as `Hadir di Sekolah` can also transition to `Dinas Luar` on checkout.

#### Test Case 2: Auto-Checkout Flagging for Forgotten Checkouts
- **File**: `tests/e2e/tier2_boundary_corner.test.ts` & `tier4_real_world_scenarios.test.ts`
- **Assertions**:
  1. Teacher checks in at 07:00 WITA (`Datang`).
  2. Time reaches cutoff threshold `jam_pulang_akhir` without `Pulang` check-out.
  3. `evaluateAndApplyAutoCheckout` identifies missing checkout and records auto-checkout with `status_verifikasi: 'Lupa Checkout'`.
  4. Subsequent workflow evaluations mark teacher as having completed day with a "Lupa Checkout" penalty flag, avoiding false Alpa.

#### Test Case 3: Long-term Sick ($\ge 3$ Days) and Leave ($> 3$ Days) Routing
- **File**: `tests/e2e/tier1_feature_coverage.test.ts` & `tier3_cross_feature.test.ts`
- **Assertions**:
  1. Sakit request with `durasi_hari: 2` is treated as standard note.
  2. Sakit request with `durasi_hari: 3` (or $\ge 3$) is marked `memerlukan_persetujuan_admin: true` and routed to Admin verification queue with `status_verifikasi: 'Menunggu'`.
  3. Leave request (`Izin`) with `durasi_hari: 3` is treated as standard short leave.
  4. Leave request (`Izin`) with `durasi_hari: 4` (or $> 3$) is marked `memerlukan_persetujuan_admin: true` and routed to Admin verification queue with `status_verifikasi: 'Menunggu'`.
  5. Admin approval of long-term sick/leave covers all dates within `[tanggal_mulai, tanggal_selesai]`, preventing Auto-Alpa throughout the period.

#### Test Case 4: GPS Coordinates on Printed Documents
- **File**: `tests/e2e/tier2_boundary_corner.test.ts` & `tier4_real_world_scenarios.test.ts`
- **Assertions**:
  1. When GPS is permitted, coordinates (`lat`, `lng`, `accuracy`) are attached to `PrintSignature` security footer.
  2. When GPS is denied/blocked, `triggerPrintWithGps` triggers SweetAlert warning dialog and prevents/alerts unverified print.

---

## 7. Synthesis & Implementation Checklist for Downstream Implementer

1. **`src/components/GuruPresensi.tsx`**:
   - Unlock `isJenisDropdownDisabled` during Pulang to enable choosing "Hadir di Sekolah" or "Dinas Luar".
   - Add duration (`durasi_hari`) and date range inputs when `jenisPresensi === 'Izin'`.
   - Apply routing threshold rule ($\ge 3$ days Sakit, $> 3$ days Izin).
2. **`src/lib/workflow.ts`**:
   - Support multi-day approved sick/leave date ranges so teachers are excused across the entire duration.
   - Track arrival state vs departure state independently.
3. **`src/lib/attendanceAlpa.ts` & `src/app/api/attendance/auto-alpa/route.ts`**:
   - Add auto-checkout detection for teachers with check-in but no check-out after cutoff time.
4. **`src/components/AdminVerifView.tsx`**:
   - Render highlight badges for Sakit $\ge 3$ Hari and Izin $> 3$ Hari requiring admin approval.
5. **`src/components/PrintHeader.tsx` & Print Views**:
   - Render GPS coordinates in `PrintSignature` security footer.
   - Intercept print triggers with geolocation lookup and error alerting.
6. **`tests/e2e/`**:
   - Add test suites for state transitions, auto-checkout flagging, sick/leave routing, and print GPS.

---
*End of Report.*
