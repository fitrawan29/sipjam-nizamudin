# Forensic Audit Report: Mode Presensi Siswa Per-Sekolah (QR vs Manual)

**Work Product**: Sipjam App — Student Attendance Mode Configuration (`mode_presensi_siswa`)  
**Profile**: General Project  
**Integrity Mode**: Development (per `ORIGINAL_REQUEST.md` ## 2026-10-04T01:12:11Z)  
**Auditor**: Forensic Auditor (`teamwork_preview_auditor_1`)  
**Verdict**: **CLEAN**

---

## 1. Observation

### A. Database Schema & Supabase Remote Verification
Direct execution of SQL queries against live Supabase project `jicvvqxjyzntdrccnuyz` ("sipjam-nizamudin"):
1. Column definition in `public.sekolah`:
   ```sql
   SELECT column_name, data_type, column_default, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'sekolah' AND column_name = 'mode_presensi_siswa';
   ```
   **Result**:
   - `column_name`: `mode_presensi_siswa`
   - `data_type`: `text`
   - `column_default`: `'qr'::text`
   - `is_nullable`: `NO`

2. Check constraint on `public.sekolah`:
   ```sql
   SELECT conname, pg_get_constraintdef(c.oid) 
   FROM pg_constraint c 
   JOIN pg_namespace n ON n.oid = c.connamespace 
   WHERE conname = 'sekolah_mode_presensi_siswa_check';
   ```
   **Result**:
   - `conname`: `sekolah_mode_presensi_siswa_check`
   - `pg_get_constraintdef`: `CHECK ((mode_presensi_siswa = ANY (ARRAY['qr'::text, 'manual'::text])))`

3. Migration SQL file:
   `supabase/migrations/20261004_add_mode_presensi_siswa_to_sekolah.sql` exists and matches remote schema.

### B. TypeScript Definitions (`src/types/database.ts`)
- `src/types/database.ts`:
  - Line 1281 (`Row`): `mode_presensi_siswa: 'qr' | 'manual' | string`
  - Line 1302 (`Insert`): `mode_presensi_siswa?: 'qr' | 'manual' | string`
  - Line 1323 (`Update`): `mode_presensi_siswa?: 'qr' | 'manual' | string`
  - Line 1926: `export type ModePresensiSiswa = "qr" | "manual";`

### C. Superadmin Configuration UI (`src/components/SuperadminView.tsx`)
- Line 244 & 262: Modal Tambah Sekolah reads `swal-sch-mode-presensi-siswa` and inserts `mode_presensi_siswa` into `sekolah`.
- Line 348-349 & 370 & 388: Modal Edit Sekolah provides dropdown preselected with current school mode and saves to Supabase.
- Line 452-485: Dedicated `handleTogglePresensiMode(school)` handler with Indonesian confirmation modal updates `mode_presensi_siswa` in `public.sekolah` (`.update({ mode_presensi_siswa: newMode, updated_at: new Date().toISOString() }).eq('id', school.id)`) and triggers `fetchAllData()`.
- Line 1139-1153: School list table renders mode badge ("Presensi Manual" vs "Presensi QR") with fast click-to-toggle capability.
- Line 1290-1298: Action buttons row includes quick mode toggle button.

### D. Piket Module Dual Mode Behavior (`src/components/PiketView.tsx`)
- Lines 193-233: Component fetches school mode on mount:
  ```ts
  const { data } = await supabase
    .from('sekolah')
    .select('mode_presensi_siswa')
    .eq('id', user.sekolah_id)
    .single();
  ```
  Also subscribes to Supabase Realtime channel (`postgres_changes` on `sekolah` table with `id=eq.${user.sekolah_id}`) to update `modePresensiSiswa` state live if Superadmin changes it.
- Lines 495-532: `handleManualMark(student, status)` calls:
  ```ts
  recordPresensiSiswa(supabase, {
    siswa: { id, nisn, nama_siswa, kelas, sekolah_id, gender },
    status,
    sekolahId: user?.sekolah_id,
    deviceId: 'manual'
  })
  ```
- Lines 534-559: `handleCancelManualPresensi(recordId, namaSiswa, status)` deletes attendance with strict tenant filter:
  ```ts
  let q = supabase.from('presensi_siswa').delete().eq('id', recordId);
  if (user?.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
  ```
- Lines 1397-1613: When `modePresensiSiswa === 'manual'`, renders "Presensi Manual Siswa" panel with class dropdown filter (`manualKelasFilter`), search input (`manualSearchQuery`), and student roster with "Tandai Datang" and "Tandai Pulang" action buttons.
- Lines 1614-1940: When `modePresensiSiswa === 'qr'`, retains Kiosk scanner station, camera feed, and USB HID scanner.
- Lines 287-302: USB scanner auto-focus listener is conditionally restricted to `modePresensiSiswa === 'qr'` so it does not hijack inputs in manual mode.

### E. Downstream Alignment & Multi-Tenant Isolation
- `src/components/RekapSiswaView.tsx`:
  - Lines 128-134: `supabase.from('presensi_siswa').select('*').eq('tanggal', waliTanggal).eq('kelas', activeWaliKelas.kelas).eq('sekolah_id', user.sekolah_id)`
  - Lines 183-189: `supabase.from('presensi_siswa').select('*').eq('kelas', gerbangKelas).eq('tanggal', gerbangTanggal).eq('sekolah_id', user.sekolah_id)`
  - Both queries strictly enforce tenant isolation.
  - Labels updated to neutral attendance terms ("Belum Presensi" instead of assuming QR scan).
- `src/components/GuruJurnal.tsx`:
  - Lines 403-410: `supabase.from('presensi_siswa').select('...').eq('kelas', kelas).eq('tanggal', tgl).eq('status', 'datang').eq('sekolah_id', user.sekolah_id)`
  - Lines 754-762: `supabase.from('guru_mapel').select('*').eq('guru_id', guruId).eq('sekolah_id', user.sekolah_id)`
  - Strictly tenant-isolated.
- `src/lib/qrSiswa.ts`:
  - All helpers (`recordPresensiSiswa`, `getTodayPresensiSummary`, `getPresensiSiswaByKelas`, `getRecentPresensiSiswa`) require and filter by `sekolah_id`.

### F. Build and Compile Gate Execution
1. Static Typecheck:
   - Command: `npx tsc --noEmit`
   - Exit code: `0` (Zero TypeScript errors)
2. Production Build:
   - Command: `npm run build`
   - Exit code: `0` (Next.js 16.3.4 Turbopack build succeeded, all static/dynamic routes compiled cleanly)

### G. Test Suite Execution & Finding
- Command: `npm test`
- 18 of 19 test suites PASSED.
- One suite (`tests/m4_wali_kelas_guru_sync.test.ts`) failed on 3 static string assertions:
  - Expected `'totalGerbangBelumScan'`, but found `'totalGerbangBelumPresensi'` in `RekapSiswaView.tsx`.
  - Expected `'Belum Scan'`, but found `'Belum Presensi'` in `RekapSiswaView.tsx`.
  - Expected `'Belum Scan Piket'`, but found `'Belum Presensi Piket'` in `GuruJurnal.tsx`.
  - Cause: In commit `6715b0e`, labels were neutralized per R5 ("tidak ada hardcode asumsi mode QR di luar PiketView"), which conflicted with legacy static substring assertions in `tests/m4_wali_kelas_guru_sync.test.ts`.

---

## 2. Logic Chain

1. **Authenticity Assessment**:
   - The implementation across `public.sekolah`, `SuperadminView.tsx`, `PiketView.tsx`, `RekapSiswaView.tsx`, `GuruJurnal.tsx`, and `qrSiswa.ts` connects directly to Supabase PostgREST tables.
   - There are no mocked responses, dummy return values, or facade implementations.
   - In `SuperadminView.tsx`, updating school attendance mode executes real SQL update queries and persists to Supabase.
   - In `PiketView.tsx`, marking manual attendance writes real records to `public.presensi_siswa` with `device_id: 'manual'`.

2. **Integrity Mode Evaluation**:
   - The integrity mode for this milestone is **Development** (per `ORIGINAL_REQUEST.md` ## 2026-10-04T01:12:11Z).
   - Under Development Mode, violations are restricted to: Hardcoded test results (🔴), Dummy/facade implementations (🔴), and Fabricated verification outputs (🔴).
   - None of these violations exist in the work product.

3. **Multi-Tenant Security Assessment**:
   - Every Supabase query in `PiketView.tsx`, `RekapSiswaView.tsx`, `GuruJurnal.tsx`, and `qrSiswa.ts` applies `sekolah_id` filtering from `user.sekolah_id`.
   - Data from School A cannot leak to School B.

4. **Build Gate Compliance**:
   - `npx tsc --noEmit` exited 0.
   - `npm run build` completed successfully with code 0.

---

## 3. Caveats

1. **Legacy Test Suite String Assertion Conflict**:
   - `tests/m4_wali_kelas_guru_sync.test.ts` (created during the prior QR-only milestone) contains literal string checks for `'totalGerbangBelumScan'`, `'Belum Scan'`, and `'Belum Scan Piket'`.
   - Commit `6715b0e` replaced those strings with neutral labels (`'totalGerbangBelumPresensi'`, `'Belum Presensi'`, `'Belum Presensi Piket'`) to honor Requirement R5 ("pastikan tidak ada hardcode asumsi mode QR di luar PiketView").
   - This caused `tests/m4_wali_kelas_guru_sync.test.ts` to fail 3 assertions.
   - Recommendation: The test assertions or the component should include backwards-compatible aliases (e.g. `const totalGerbangBelumScan = totalGerbangBelumPresensi;` or dual display text) so that `npm test` achieves 100% pass rate.
   - As an auditor under key constraints, I do not modify implementation code.

---

## 4. Conclusion

**Verdict: CLEAN**

The implementation of per-school student attendance mode (`mode_presensi_siswa`) is authentic, robust, and correctly integrated into SIPJAM:
- Database schema and check constraints are active on live Supabase.
- Superadmin UI provides full management (modal add/edit + inline quick toggle).
- PiketView dynamically switches between class-based manual checklist and 10-unit kiosk QR scanner based on school configuration and Supabase Realtime updates.
- Downstream views (`RekapSiswaView.tsx` and `GuruJurnal.tsx`) correctly consume `presensi_siswa` records under strict multi-tenant `sekolah_id` isolation.
- Both compilation gates (`npx tsc --noEmit` and `npm run build`) pass cleanly with 0 errors.

---

## 5. Verification Method

To independently verify this report:

1. **Check Live Database**:
   ```sql
   SELECT column_name, data_type, column_default, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'sekolah' AND column_name = 'mode_presensi_siswa';
   ```
2. **Run TypeScript Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected: Exit code 0, 0 errors.*
3. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Expected: Exit code 0, build succeeds.*
4. **Inspect Source Files**:
   - `src/components/SuperadminView.tsx` lines 244, 370, 452-485, 1139-1153.
   - `src/components/PiketView.tsx` lines 193-233, 495-532, 1397-1640.
   - `src/types/database.ts` lines 1281, 1302, 1323, 1926.
