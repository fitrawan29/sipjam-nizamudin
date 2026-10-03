# Handoff Report: R3 & R4 Presensi Reporting and Guru Mapel Synchronization

**Agent**: Explorer 3 (`explorer_o10_3`)  
**Parent Agent**: `149f0279-6b23-4179-9bd4-edcb251f34f1`  
**Date**: 2026-10-03  
**Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

1. **`RekapSiswaView.tsx` Location and Access**:
   - `src/components/RekapSiswaView.tsx` exists (797 lines).
   - Mounted in `src/components/AppScreen.tsx` line 685:
     ```tsx
     {currentView === 'view-rekap-siswa' && <RekapSiswaView user={user} />}
     ```
   - Menu items: Present in `menuItemsGuru` (line 482) and `menuItemsAdmin` (line 497) as `{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }`.
   - Lines 54-71 of `RekapSiswaView.tsx` query `wali_kelas` table scoped by `user?.sekolah_id` to determine if the logged-in user is a Wali Kelas. If true, lines 437-627 render an emerald "Penugasan Wali Kelas" panel allowing input of daily attendance (`waliTanggal`) synced to `public.absensi` with `sumber_perubahan = 'Wali Kelas'`.

2. **`wali_kelas` Database Structure**:
   - Schema defined in `supabase/migrations/20260917_comprehensive_features.sql` lines 23-33:
     ```sql
     CREATE TABLE IF NOT EXISTS public.wali_kelas (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
         kelas TEXT NOT NULL,
         guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
         nama_guru TEXT NOT NULL,
         nip TEXT,
         tahun_ajaran TEXT DEFAULT '2024/2025',
         created_at TIMESTAMPTZ DEFAULT now(),
         CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas)
     );
     ```
   - Admin management UI in `src/components/AdminDataView.tsx` under tab `'Wali_Kelas'`.
   - Resolution cascade in `src/components/AppScreen.tsx` lines 206-258 checks `user?.wali_kelas`, then queries `wali_kelas`, then falls back to `data_guru.wali_kelas`.

3. **`GuruJurnal.tsx` Schedule Retrieval & Attendance**:
   - Lines 127-134 query `guru_mapel` using `user.username` (nip) or `user.nama`.
   - Lines 144-169 fallback to `jadwal_pelajaran` if `guru_mapel` is empty.
   - Lines 258-283 call `getGuruDailyState()` from `src/lib/workflow.ts`, which uses `findJadwalForGuru(hari, namaGuru, username, userId)` querying `jadwal_pelajaran` where `hari = selectedHari`.
   - Lines 371-409 (`fetchStudents`) load students from `data_siswa` and existing attendance from canonical `public.absensi`.
   - Lines 411-447 (`handleAbsensiChange`) perform live upsert into `public.absensi` on button click.
   - Lines 549, 564, 638 store `absensi_siswa` (JSON) and `kehadiran_murid` into `jurnal_pembelajaran` and batch-upsert into `public.absensi`.

4. **Absence of `presensi_siswa` Table**:
   - Ripgrep search across the repository returned no occurrences of `presensi_siswa`.
   - No migration currently defines student gate scan records.

5. **Multi-Tenant Scoping Gaps Observed**:
   - `src/components/GuruJurnal.tsx`:
     - Line 99 (`data_mapel` for Admin): no `.eq('sekolah_id', user.sekolah_id)`.
     - Line 114 (`data_siswa` for Admin): no `.eq('sekolah_id', user.sekolah_id)`.
     - Line 127 (`guru_mapel`): `let query = supabase.from('guru_mapel').select('*');` — no `sekolah_id` filter.
     - Line 145 (`jadwal_pelajaran` fallback): no `sekolah_id` filter.
   - `src/lib/workflow.ts`:
     - Lines 88-92 (`findJadwalForGuru`): queries `jadwal_pelajaran` without `sekolah_id`.
     - Lines 229, 243, 281, 347, 362, 458, 484: queries `kalender_pendidikan`, `pengaturan`, `data_guru`, `jadwal_piket`, `presensi_guru`, `laporan_piket`, `jurnal_pembelajaran` without `sekolahId` filter.

---

## 2. Logic Chain

1. **Existence of Views**: Because `RekapSiswaView.tsx` is already present, imported, and conditionally rendered in `AppScreen.tsx` for both teachers and administrators, there is no need to create a new component from scratch for R3. The existing view can be augmented.
2. **Role Tracking**: Because `public.wali_kelas` has a clear unique constraint on `(sekolah_id, kelas)` and is already utilized in `AppScreen.tsx`, `RekapJurnalView.tsx`, and `RekapSiswaView.tsx`, identifying a user as Wali Kelas should continue relying on this established convention.
3. **Data Segregation for QR Presensi**: Because gate check-in/out (`datang`/`pulang`) is distinct from classroom academic status (H/I/S/A), creating a dedicated table `public.presensi_siswa` ensures backward compatibility with existing workflows while satisfying R2 and R3 without corrupting the canonical `public.absensi` or `jurnal_pembelajaran` tables.
4. **Guru Mapel Synchronization**: In `GuruJurnal.tsx`, fetching `presensi_siswa` for the selected `kelas` and `tanggal` during `fetchStudents` allows displaying a badge (`✓ Hadir di Sekolah (Piket HH:mm)` or `Belum Scan`) next to each student in the existing "Live Absensi" list. This fulfills R4 cleanly.
5. **Multi-Tenant Security**: Since multi-tenant isolation requires strict `sekolah_id` filtering on all queries and RLS policies, the observed gaps in `GuruJurnal.tsx` and `workflow.ts` represent leakage risks that must be fixed when implementing R3 & R4.

---

## 3. Caveats

- **External Hardware Scanner Integration**: USB HID barcode/QR scanners type characters into whichever input element has browser focus and emit `Enter`. The implementation of R2/R3 in `PiketView` must maintain focus or a listening capture on the scanner input to avoid input loss.
- **Offline / Camera Permissions**: Camera scan via browser requires HTTPS or `localhost` and user permission for `navigator.mediaDevices.getUserMedia`.
- **Existing `absensi` Trigger**: Supabase table `public.absensi` has a trigger `sync_absensi_to_jurnal()`. Modifications to `absensi` will trigger updates to `jurnal_pembelajaran.absensi_siswa`.

---

## 4. Conclusion

1. `RekapSiswaView.tsx` already exists and provides a solid foundation for Wali Kelas and school-wide student attendance reporting. It should be augmented with daily gate QR presensi records from the new `presensi_siswa` table.
2. A new migration creating `public.presensi_siswa` with columns `id`, `sekolah_id`, `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal`, `status` ('datang'|'pulang'), `jam`, `petugas_nama`, `metode_scan`, `scanner_id` is required.
3. In `GuruJurnal.tsx`, fetching `presensi_siswa` for the active class and date provides seamless real-time synchronization to subject teachers on their teaching days.
4. All queries in `GuruJurnal.tsx` and `workflow.ts` must be patched to enforce `sekolah_id` multi-tenant scoping.

---

## 5. Verification Method

1. **Static Analysis & Type Checking**:
   ```bash
   npx tsc --noEmit
   ```
   Must pass with exit code 0.
2. **File Inspection**:
   - Verify `src/components/RekapSiswaView.tsx` (lines 50-75 and 435-625) for Wali Kelas detection and input.
   - Verify `src/components/GuruJurnal.tsx` (lines 125-170, 370-410) for schedule and student loading.
   - Check `report.md` at `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o10_3\report.md`.
3. **Invalidation Conditions**:
   - If `RekapSiswaView.tsx` is deleted or unmounted from `AppScreen.tsx`.
   - If table `public.wali_kelas` is altered in schema.
