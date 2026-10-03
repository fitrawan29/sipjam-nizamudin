# Comprehensive Investigation Report: R3 & R4 Presensi Reporting & Guru Mapel Synchronization

**Explorer**: Explorer 3 (`explorer_o10_3`)  
**Target Repository**: `sipjam-app` (Next.js 16 + React 19 + Supabase)  
**Date**: 2026-10-03  
**Status**: Completed  

---

## 1. Executive Summary

This investigation analyzes the technical architecture and codebase requirements for:
1. **R3**: Student attendance reporting for Guru Piket and Wali Kelas, and
2. **R4**: Real-time synchronization of gate/Piket arrival attendance (`presensi_siswa` datang) to subject teachers (`GuruJurnal.tsx`) for that teaching day.

Key discoveries:
- `RekapSiswaView.tsx` **already exists** in `src/components/RekapSiswaView.tsx` (797 lines) and is mounted in `AppScreen.tsx` (`currentView === 'view-rekap-siswa'`). It already contains a dedicated "Penugasan Wali Kelas" panel that syncs with `public.absensi`.
- The homeroom teacher entity is tracked canonical in table `public.wali_kelas` with unique constraint `(sekolah_id, kelas)`.
- `GuruJurnal.tsx` retrieves schedules through two paths: `guru_mapel` for subject assignments and `src/lib/workflow.ts` (`findJadwalForGuru` via `jadwal_pelajaran`) for today's daily schedule. It records attendance in both `jurnal_pembelajaran` (JSON summary) and `public.absensi` (canonical H/I/S/A rows).
- A table specifically for gate QR check-ins (`presensi_siswa`) does not yet exist and must be created via Supabase migration.
- Several queries currently lack strict multi-tenant filtering by `sekolah_id` (e.g. `guru_mapel`, `jadwal_pelajaran` fallback in `GuruJurnal.tsx`, and `findJadwalForGuru` in `workflow.ts`).

---

## 2. Wali Kelas Reporting Views & `RekapSiswaView.tsx`

### 2.1 File Location & Mounting
- **File**: `src/components/RekapSiswaView.tsx` (797 lines).
- **Mount Point**: `src/components/AppScreen.tsx` line 685:
  ```tsx
  {currentView === 'view-rekap-siswa' && <RekapSiswaView user={user} />}
  ```
- **Navigation Access**:
  - In `menuItemsGuru`: `{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }` (accessible by all teachers).
  - In `menuItemsAdmin`: `{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }` (accessible by admin).
  - Note: In addition, Wali Kelas also has access to `view-jurnal-kelas` (Jurnal Kelas), which renders `RekapJurnalView.tsx` in class mode (`initialMode="kelas"`).

### 2.2 Current Features in `RekapSiswaView.tsx`
1. **Penugasan Wali Kelas Banner & Form Input**:
   - On load, it queries `wali_kelas` table:
     ```ts
     let wQuery = supabase.from('wali_kelas').select('*');
     if (user?.sekolah_id) wQuery = wQuery.eq('sekolah_id', user.sekolah_id);
     ```
   - Matches teacher by `guru_id === user.id || nama_guru === user.nama || nip === user.username` (or all if `user.role === 'Admin'`).
   - If user is assigned as Wali Kelas:
     - Shows an emerald card: "Penugasan Wali Kelas [Kelas]" with button "Input Presensi Kelas".
     - Clicking this toggles an interactive form where the Wali Kelas can:
       - Pick date (`waliTanggal`).
       - Mark individual or batch status ("Semua Hadir", "Semua Sakit", "Semua Izin") for students in their assigned class.
       - Provide notes/reasons (`keterangan`).
       - Save attendance via `handleSaveWaliAttendance()` which upserts into `public.absensi` with `sumber_perubahan = 'Wali Kelas'`.
2. **Rekapitulasi Kehadiran Siswa (Filter & Table)**:
   - Filter inputs: Dari Tanggal (`startDate`), Sampai Tanggal (`endDate`), Kelas (`kelas`), Mapel (`mapel`).
   - Action: "Tampilkan Rekap" (`tarikRekap()`).
   - Metrics cards: Total Siswa, % Kehadiran, Total Hadir, Sakit, Izin, Alpa.
   - Result Table: No, NISN, Nama Siswa, Hadir, Sakit, Izin, Alpa, % Kehadiran.
   - Export: CSV/Excel (`Rekap_Siswa_{kelas}.csv`) and Print Document (`PrintHeader`, `PrintSignature`).

---

## 3. Database Schema for `wali_kelas`

### 3.1 Table Definition: `public.wali_kelas`
Created in `supabase/migrations/20260917_comprehensive_features.sql`:
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

### 3.2 Canonical Attendance Table: `public.absensi`
```sql
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    tanggal DATE NOT NULL,
    kelas TEXT NOT NULL,
    siswa_id TEXT,
    nisn TEXT NOT NULL,
    nama_siswa TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
    keterangan TEXT,
    sumber_perubahan TEXT NOT NULL,
    diubah_oleh TEXT NOT NULL,
    log_perubahan TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_absensi_siswa_hari UNIQUE(sekolah_id, tanggal, nisn)
);
```
- Includes database trigger `sync_absensi_to_jurnal()` which keeps `jurnal_pembelajaran.absensi_siswa` synchronized whenever `public.absensi` is updated.

### 3.3 Application Lookup Logic
In `AppScreen.tsx` (lines 206-258), `isWaliKelas` and `assignedKelas` are resolved using a 3-tier cascade:
1. Direct user claim: `user?.wali_kelas`.
2. Database lookup in `wali_kelas` table:
   `guru_id === user.id || nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim() || nip === user.username`.
3. Fallback database lookup in `data_guru`: checks if `g.wali_kelas` is set.

---

## 4. `GuruJurnal.tsx`: Schedule Retrieval & Attendance Recording

### 4.1 Schedule Retrieval Flow
1. **Teaching Subject & Class Assignment**:
   - `fetchMasterData` in `src/components/GuruJurnal.tsx`:
     - Queries `guru_mapel` for matching `nip === user.username` or `nama_guru ilike user.nama`.
     - Fallback: If `guru_mapel` has no rows, queries `jadwal_pelajaran` matching `nama_guru ilike user.nama`.
     - Populates `assignments`, `mapelList`, and `kelasList`.
2. **Today's Teaching Schedule**:
   - `checkState` calls `getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id)` from `src/lib/workflow.ts`.
   - `workflow.ts` computes `hariIni = getWitaDayName(now)` (e.g. 'Senin', 'Selasa').
   - Calls `findJadwalForGuru(hari, namaGuru, username, userId)` which queries `jadwal_pelajaran` where `hari = selectedHari`.
   - Populates `dailyState.jadwalKBM`.
3. **Auto-Fill Behavior**:
   - When `dailyState.jadwalKBM` contains exactly 1 schedule for today, `GuruJurnal.tsx` automatically fills `mapel`, `kelas`, and `jamKe`.

### 4.2 Attendance Recording Flow
1. When `kelas` is chosen and `tipeJurnal === 'Jurnal KBM'`:
   - `fetchStudents` queries `data_siswa` where `kelas = kelas`.
   - Queries `absensi` for `tanggal = tanggal` and `kelas = kelas`.
   - Sets state `absensi: Record<string, string>` ({ [nisn]: 'H' | 'S' | 'I' | 'A' }), defaulting to 'H' if not yet recorded.
   - Calculates summary via `calculateKehadiranSummary`:
     `"Total murid: {total}, Hadir: {hadir}, Izin: {izin}, Sakit: {sakit}, Alpa: {alpa}"`.
2. Live Update:
   - When teacher clicks status button (H/S/I/A), `handleAbsensiChange` updates local state and immediately calls `supabase.from('absensi').upsert(...)`.
3. Journal Submission:
   - Saves row to `jurnal_pembelajaran` with:
     - `absensi_siswa = JSON.stringify(absensi)`
     - `kehadiran_murid = computedKehadiran`
   - Concurrently batch-upserts all rows into `public.absensi`.

---

## 5. Integration Architecture: Piket QR Attendance to `GuruJurnal` & `RekapSiswaView`

### 5.1 Proposed Schema: `public.presensi_siswa`
A lightweight, dedicated table for gate QR scans by Guru Piket:
```sql
CREATE TABLE IF NOT EXISTS public.presensi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    siswa_id UUID REFERENCES public.data_siswa(id) ON DELETE CASCADE,
    nisn TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('datang', 'pulang')),
    jam TEXT NOT NULL, -- e.g. '06:45 WITA'
    waktu_scan TIMESTAMPTZ DEFAULT now(),
    petugas_nama TEXT,
    metode_scan TEXT DEFAULT 'kamera', -- 'kamera' | 'hardware'
    scanner_id TEXT DEFAULT 'Scanner 1', -- 1-10 concurrent stations
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_presensi_siswa_status_hari UNIQUE(sekolah_id, tanggal, siswa_id, status)
);

CREATE INDEX IF NOT EXISTS idx_presensi_siswa_sekolah_tgl_kelas ON public.presensi_siswa(sekolah_id, tanggal, kelas);
CREATE INDEX IF NOT EXISTS idx_presensi_siswa_status ON public.presensi_siswa(sekolah_id, tanggal, status);
```

### 5.2 Integration in `GuruJurnal.tsx` (R4)
When a Guru Mapel opens `GuruJurnal.tsx`:
1. In `fetchStudents(kelas, tanggal)`:
   - Concurrently query `presensi_siswa`:
     ```ts
     let pQuery = supabase
       .from('presensi_siswa')
       .select('*')
       .eq('tanggal', tanggal || getWitaDateStr())
       .eq('kelas', kelas)
       .eq('status', 'datang');
     if (user?.sekolah_id) pQuery = pQuery.eq('sekolah_id', user.sekolah_id);
     const { data: pData } = await pQuery;
     ```
   - Store as `piketScanMap: Record<string, { jam: string; scanner_id?: string }>` keyed by `nisn` or `siswa_id`.
2. UI Display:
   - **Header Summary Badge**:
     `Piket Gerbang: {scannedCount} dari {total} siswa kelas {kelas} sudah scan masuk hari ini.`
   - **Student Item Status Pill**:
     In the student list under Section 9 (Live Absensi):
     - If in `piketScanMap`:
       `[✓ Masuk: {jam}]` in green.
     - If not in `piketScanMap`:
       `[Belum Scan Gerbang]` in amber/gray.
   - **Teaching Day Schedule Context**:
     If today's schedule from `dailyState.jadwalKBM` matches this class and subject, display an informative banner:
     `Jadwal Anda Hari Ini: {mapel} Kelas {kelas} ({jamMulai} - {jamSelesai})`.

### 5.3 Integration in `RekapSiswaView.tsx` (R3)
1. **In "Input Presensi Kelas" (Wali Kelas)**:
   - When loading `waliStudents`, also fetch `presensi_siswa` for `waliTanggal` and `activeWaliKelas.kelas`.
   - Display the gate scan status next to each student's name so Wali Kelas immediately knows whether the student physically arrived at school before marking them Hadir/Sakit/Izin/Alpa.
2. **In Main Rekap View**:
   - Provide a secondary tab or section: "Log Presensi Gerbang (Piket QR)".
   - Shows the daily check-in (datang) and check-out (pulang) times, scanner station, and status for each student in the class on any chosen date.

### 5.4 Integration in `PiketView.tsx` (R3)
- Piket view displays the daily scanned student counter and table for today:
  - Total Datang, Total Pulang, per class breakdown.
  - Filterable by class and scanner unit.

---

## 6. Multi-Tenant Scoping (`sekolah_id`) Audit

| File | Location | Query | Multi-Tenant Status | Action Needed |
|------|----------|-------|---------------------|---------------|
| `src/components/GuruJurnal.tsx` | Line 99 | `supabase.from('data_mapel')` (Admin role) | ⚠️ Missing `sekolah_id` filter | Add `if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);` |
| `src/components/GuruJurnal.tsx` | Line 114 | `supabase.from('data_siswa').select('kelas')` | ⚠️ Missing `sekolah_id` filter | Add `if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);` |
| `src/components/GuruJurnal.tsx` | Line 127 | `supabase.from('guru_mapel')` | ⚠️ Missing `sekolah_id` filter | Add `if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);` |
| `src/components/GuruJurnal.tsx` | Line 145 | `supabase.from('jadwal_pelajaran')` fallback | ⚠️ Missing `sekolah_id` filter | Add `if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);` |
| `src/components/GuruJurnal.tsx` | Line 379, 387, 428, 612 | `data_siswa`, `absensi` | ✅ Correctly scoped | Maintain current scoping |
| `src/lib/workflow.ts` | Line 88 | `findJadwalForGuru` (`jadwal_pelajaran`) | ⚠️ Missing `sekolah_id` filter | Add `sekolahId?: string` parameter and apply `.eq('sekolah_id', sekolahId)` |
| `src/lib/workflow.ts` | Line 341 | `state.jadwalKBM = await findJadwalForGuru(...)` | ⚠️ Does not pass `sekolahId` | Pass `sekolahId` to `findJadwalForGuru` |
| `src/lib/workflow.ts` | Line 347, 362, 458, 484 | `jadwal_piket`, `presensi_guru`, `laporan_piket`, `jurnal_pembelajaran` | ⚠️ Missing `sekolahId` filter | Add `if (sekolahId) query = query.eq('sekolah_id', sekolahId);` |
| `src/components/RekapSiswaView.tsx` | Lines 35, 46, 55, 89, 99, 227, 237, 249 | All queries (`data_siswa`, `data_mapel`, `wali_kelas`, `absensi`, `jurnal_pembelajaran`) | ✅ Fully scoped with `user?.sekolah_id` | Ensure any new query for `presensi_siswa` follows this pattern |
| `src/components/PiketView.tsx` | Lines 63, 77, 100, 124, 130, 136, 289, 368 | All queries | ✅ Fully scoped with `user?.sekolah_id` | Ensure any new query for `presensi_siswa` follows this pattern |

---

## 7. Concrete Recommendations & Next Steps

1. **Database Migration (`supabase/migrations/`)**:
   - Create migration for `presensi_siswa` with columns: `id`, `sekolah_id`, `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal`, `status`, `jam`, `waktu_scan`, `petugas_nama`, `metode_scan`, `scanner_id`, `created_at`.
   - Add unique constraint `(sekolah_id, tanggal, siswa_id, status)` and RLS policies enforcing tenant isolation via `public.get_auth_user_sekolah_id()`.

2. **Patch Multi-Tenant Scoping**:
   - Update `findJadwalForGuru` in `src/lib/workflow.ts` to accept `sekolahId` and filter `jadwal_pelajaran`.
   - Add `sekolah_id` filters to `guru_mapel`, `jadwal_pelajaran`, `data_mapel`, and `data_siswa` in `GuruJurnal.tsx`.

3. **Enhance `GuruJurnal.tsx`**:
   - Fetch `presensi_siswa` for the selected `kelas` and `tanggal`.
   - Render gate scan indicators beside each student name in the live attendance list.
   - Display a class arrival summary badge.

4. **Enhance `RekapSiswaView.tsx`**:
   - In Wali Kelas input panel: display gate check-in status per student.
   - In report section: add daily gate scan log view/tab.

5. **Enhance `PiketView.tsx`**:
   - Provide scan modal/page with camera and hardware USB HID barcode scanner support (up to 10 stations).
   - Display today's daily student gate attendance report.
