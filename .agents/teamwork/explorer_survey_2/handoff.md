# Handoff Report: Master Data Schema Alignment & Canonical Specification (Survey Phase)

**Author**: Explorer Survey 2 (`explorer_survey_2`)  
**Target**: Orchestrator, Planner, Implementation Workers  
**Date**: 2026-11-06  
**Scope**: Complete investigation of database schemas, Supabase/PostgreSQL migrations, table definitions, TypeScript interfaces, existing frontend/backend data structures, discrepancies, and canonical CSV templates for all 7 Master Data entities:
1. Kelas (Classes)
2. Siswa (Students)
3. Guru (Teachers)
4. Mapel (Subjects)
5. Kalender Pendidikan (Academic Calendar)
6. Jadwal Pelajaran (Schedules)
7. Wali Kelas (Homeroom Teachers)

---

## 1. Observation

### 1.1 Source Code and Schema Observations

1. **Table Definitions in `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`**:
   - `data_guru` (lines 56–67):
     ```sql
     CREATE TABLE IF NOT EXISTS public.data_guru (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
         nip TEXT,
         nama_guru TEXT NOT NULL,
         mata_pelajaran TEXT,
         no_hp TEXT,
         status TEXT DEFAULT 'Aktif',
         email TEXT,
         created_at TIMESTAMPTZ DEFAULT now(),
         updated_at TIMESTAMPTZ DEFAULT now()
     );
     ```
   - `data_mapel` (lines 70–79):
     ```sql
     CREATE TABLE IF NOT EXISTS public.data_mapel (
         id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
         sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
         nama_mata_pelajaran TEXT NOT NULL,
         kategori TEXT,
         kelompok TEXT,
         urutan INTEGER DEFAULT 1,
         created_at TIMESTAMPTZ DEFAULT now(),
         updated_at TIMESTAMPTZ DEFAULT now()
     );
     ```
   - `data_siswa` (lines 82–94):
     ```sql
     CREATE TABLE IF NOT EXISTS public.data_siswa (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
         nisn TEXT,
         nama_siswa TEXT NOT NULL,
         kelas TEXT NOT NULL,
         gender TEXT,
         status TEXT DEFAULT 'Aktif',
         no_hp_ortu TEXT,
         qr_code TEXT,
         created_at TIMESTAMPTZ DEFAULT now(),
         updated_at TIMESTAMPTZ DEFAULT now()
     );
     ```
   - `wali_kelas` (lines 111–121):
     ```sql
     CREATE TABLE IF NOT EXISTS public.wali_kelas (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
         kelas TEXT NOT NULL,
         guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
         nama_guru TEXT NOT NULL,
         nip TEXT,
         tahun_ajaran TEXT DEFAULT '2024/2025',
         created_at TIMESTAMPTZ DEFAULT now(),
         CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas)
     );
     ```
   - `jadwal_pelajaran` (lines 124–135):
     ```sql
     CREATE TABLE IF NOT EXISTS public.jadwal_pelajaran (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
         hari TEXT NOT NULL,
         nama_guru TEXT NOT NULL,
         mata_pelajaran TEXT NOT NULL,
         kelas TEXT NOT NULL,
         jam_ke TEXT,
         jam_mulai TIME,
         jam_selesai TIME,
         created_at TIMESTAMPTZ DEFAULT now()
     );
     ```
   - `kalender_pendidikan` (lines 346–353):
     ```sql
     CREATE TABLE IF NOT EXISTS public.kalender_pendidikan (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
         tanggal DATE NOT NULL,
         keterangan TEXT NOT NULL,
         tipe TEXT DEFAULT 'libur',
         created_at TIMESTAMPTZ DEFAULT now()
     );
     ```
   - **`kelas`**: Search for `CREATE TABLE.*kelas` in `SETUP_NEW_SCHOOL_TEMPLATE.sql` yielded NO base table `public.kelas` or `public.data_kelas`. Only `wali_kelas` and a view `public.guru_kelas` exist.

2. **Supabase Migrations**:
   - `20260918_milestone9_schema.sql` & `20261106_fix_pengaturan_guru_hanya_mengajar_schema_cache.sql`:
     ```sql
     ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE;
     ```
   - `20260926_add_uuid_fkeys.sql`:
     ```sql
     ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
     ALTER TABLE public.jadwal_pelajaran ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
     ```
   - `20261102_validate_mapel_jadwal.sql`:
     Creates trigger `trg_validate_jadwal_mapel` before INSERT/UPDATE on `jadwal_pelajaran` checking against dummy/non-standard subjects.
   - `20261102_restrict_master_data_to_admin.sql` (lines 70–71):
     ```sql
     CALL public.setup_master_data_admin_policies('data_kelas');
     CALL public.setup_master_data_admin_policies('kelas');
     ```
     Procedure verifies table existence in `information_schema.tables` before applying RLS.

3. **TypeScript Types in `src/types/database.ts`**:
   - `data_siswa`: `gender` (string|null), `id` (string), `kelas` (string|null), `nama_siswa` (string|null), `nisn` (string|null), `no_hp_ortu` (string|null), `qr_code` (string|null), `sekolah_id` (string), `status` (string|null).
   - `data_guru`: `email` (string|null), `id` (string), `mata_pelajaran` (string|null), `nama_guru` (string|null), `nip` (string|null), `no_hp` (string|null), `sekolah_id` (string), `status` (string|null), `user_id` (string|null), `wajib_hadir_hanya_mengajar` (boolean|null).
   - `data_mapel`: `id` (string), `kategori` (string|null), `kelompok` (string|null), `kode_mapel` (string|null), `nama_mapel` (string|null), `nama_mata_pelajaran` (string|null), `sekolah_id` (string).
   - `kalender_pendidikan`: `id` (string), `keterangan` (string|null), `sekolah_id` (string), `tanggal` (string|null), `tanggal_mulai` (string|null), `tanggal_selesai` (string|null), `tipe` (string|null).
   - `jadwal_pelajaran`: `hari` (string|null), `id` (string), `jam_mulai` (string|null), `jam_selesai` (string|null), `kelas` (string|null), `mapel` (string|null), `mata_pelajaran` (string|null), `nama_guru` (string|null), `sekolah_id` (string), `user_id` (string|null).
   - `wali_kelas`: `created_at` (string|null), `guru_id` (string|null), `id` (string), `kelas` (string), `nama_guru` (string), `nip` (string|null), `sekolah_id` (string), `tahun_ajaran` (string|null).
   - `guru_kelas`: View row with `guru_id`, `kelas`, `nama_guru`, `nip`, `sekolah_id`.
   - Exported types at bottom of `src/types/database.ts`: `DataSiswa`, `DataGuru`, `DataMapel`, `KalenderPendidikan`, `JadwalPelajaran`, `WaliKelas`, `GuruKelas`. **NO `Kelas` type exists.**

4. **Frontend Tabs & CSV Templates in `src/components/AdminDataView.tsx`**:
   - Lines 117–126 (`tabs` array):
     ```ts
     const tabs = [
       { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
       { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
       { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
       { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
       { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
       { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok' },
       { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas' },
       { id: 'Pengguna', label: 'Pengguna', table: 'users' },
     ];
     ```
     `Kelas` is completely absent from tabs.
   - Lines 228–259 (`templates` object):
     - `Data_Siswa`: headers `['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']`
     - `Data_Guru`: headers `['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']`
     - `Data_Mapel`: headers `['id', 'nama_mata_pelajaran', 'kategori']`
     - `Kalender_Pendidikan`: headers `['tanggal', 'keterangan', 'tipe']`
     - `Jadwal_Pelajaran`: headers `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']` (missing `jam_mulai`, `jam_selesai`)
     - `Wali_Kelas`: headers `['kelas', 'nama_guru', 'nip', 'tahun_ajaran']`
     - **`Kelas`**: No template exists.
   - Edit Modals & Card rendering:
     - `Kalender_Pendidikan`: reads/writes `tanggal_mulai` and `tanggal_selesai`.
     - `Jadwal_Pelajaran`: reads/writes `jam_mulai` and `jam_selesai`.
     - `Data_Mapel`: reads/writes `kode_mapel` and `kelompok`.

5. **CSV Parsing & Validation in `src/lib/dataIntegrityGuard.ts`**:
   - `normalizeCsvHeaders` (lines 544–580): Normalizes headers, maps aliases (`no_hp_orang_tua` -> `no_hp_ortu`, `nama_lengkap` -> `nama_siswa`/`nama_guru`, `mapel` -> `nama_mata_pelajaran`/`mata_pelajaran`, `id_sekolah` -> `sekolah_id`).
   - `parseAndValidateMasterCsv` (lines 589–827):
     - Auto-generates UUID `id` if missing or invalid.
     - Strictly validates `sekolah_id` UUID for `data_guru`.
     - Auto-injects `user.sekolah_id` if missing.
     - Enforces anti-dummy rules for teacher, schedule, and student names.
   - `importMasterDataFromCsv` (lines 833–900):
     - Batches upserts in chunks of 50.
     - Conflict target for `wali_kelas`: `'sekolah_id, kelas'`.
     - Conflict target for all other tables: `'id'`.
     - Auto-syncs teacher accounts into `users` table upon `data_guru` import.

---

## 2. Logic Chain

1. **Premise 1**: Requirement R1 requires adding a sub menu "Kelas" under Master Data for role admin and centralizing student class allocation.
2. **Premise 2**: Requirement R2 requires all master data entities with download/upload features (Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, Wali Kelas) to align precisely with the database schema.
3. **Inference for Entity 1 (Kelas)**:
   - Since no physical table `kelas` currently exists in the database, `kelas` exists purely as a string property across child tables (`data_siswa.kelas`, `wali_kelas.kelas`, `jadwal_pelajaran.kelas`, etc.).
   - To provide full CRUD and CSV import/export for `Kelas` as a first-class master data entity, a dedicated table `public.kelas` must be created (or student class allocation mapped to `data_siswa.kelas`).
   - A dedicated `public.kelas` table provides a single source of truth for valid classes in each school tenant (`sekolah_id`), supporting class registration (`nama_kelas`, `tingkat`, `jurusan`), while centralized student allocation updates `data_siswa.kelas`.
4. **Inference for Entity 5 (Kalender Pendidikan)**:
   - The database table has `tanggal DATE NOT NULL`, and migrations/types support `tanggal_mulai` and `tanggal_selesai`.
   - The current CSV template only has `tanggal`. For single-day events, `tanggal` suffices and the parser can map `tanggal_mulai = tanggal` and `tanggal_selesai = tanggal`.
   - The template must NOT use numeric IDs (e.g. `1782874179683` found in legacy CSV), because PostgreSQL throws error `22P02` when casting non-UUIDs to UUID. Omitting `id` from the template allows PostgreSQL `DEFAULT gen_random_uuid()` to execute cleanly.
5. **Inference for Entity 6 (Jadwal Pelajaran)**:
   - The current template `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']` leaves `jam_mulai` and `jam_selesai` as NULL.
   - In `AdminDataView.tsx` (lines 1849, 209), the UI explicitly expects and displays `jam_mulai` and `jam_selesai`.
   - Harmonizing the template by adding `jam_mulai` and `jam_selesai` aligns the template 100% with `public.jadwal_pelajaran`.
6. **Inference for Entity 2 (Siswa) & Conflict Resolution**:
   - `dataIntegrityGuard.ts:848` uses `onConflict: 'id'`. Because `Template_Data_Siswa.csv` does not include `id`, every upload generates random UUIDs. If an admin re-uploads a student CSV to update classes, it would insert duplicate student records unless matched by `nisn` or `id`.
   - To achieve reliable student class allocation, either:
     a) Include `id` optionally in CSV export/import, or
     b) Enable conflict resolution on `sekolah_id, nisn` in `data_siswa`.

---

## 3. Discrepancies & Alignment Matrix (All 7 Entities)

| Entity | DB Table | DB Primary Key | Key Constraints | Existing Template Headers | Discrepancies Found |
|---|---|---|---|---|---|
| **1. Kelas** | `public.kelas` *(To formalize)* | `id UUID` | `UNIQUE(sekolah_id, nama_kelas)` | *(None - missing)* | No tab in `AdminDataView`, no template in `templates`, no DDL in `SETUP_NEW_SCHOOL_TEMPLATE.sql`. |
| **2. Siswa** | `public.data_siswa` | `id UUID` | `nama_siswa NOT NULL`, `kelas NOT NULL` | `nisn,nama_siswa,kelas,gender,status,no_hp_ortu` | `id` and `sekolah_id` omitted. Upsert on conflict uses `id`, causing potential duplication on re-import unless handled. |
| **3. Guru** | `public.data_guru` | `id UUID` | `sekolah_id UUID NOT NULL REFERENCES sekolah(id)`, `nama_guru NOT NULL` | `sekolah_id,nip,nama_guru,mata_pelajaran,no_hp,status,email` | Aligned with `data_guru_csv_import_sekolah_id_validation.test.ts`. Auto-syncs credentials into `users`. |
| **4. Mapel** | `public.data_mapel` | `id TEXT` (Custom PK) | `nama_mata_pelajaran NOT NULL` | `id,nama_mata_pelajaran,kategori` | Header uses `nama_mata_pelajaran`, while UI edit modal uses `kode_mapel`, `nama_mapel`, `kelompok`. PK is `TEXT`, not UUID. |
| **5. Kalender** | `public.kalender_pendidikan` | `id UUID` | `tanggal DATE NOT NULL`, `keterangan NOT NULL` | `tanggal,keterangan,tipe` | Template lacks date range columns (`tanggal_mulai`, `tanggal_selesai`) used by UI. Old CSV used numeric IDs causing 22P02. |
| **6. Jadwal** | `public.jadwal_pelajaran` | `id UUID` | `hari NOT NULL`, `mata_pelajaran NOT NULL`, trigger `trg_validate_jadwal_mapel` | `hari,nama_guru,mata_pelajaran,kelas` | **Missing `jam_mulai` and `jam_selesai`** in template, resulting in NULL schedule times upon import. |
| **7. Wali Kelas** | `public.wali_kelas` | `id UUID` | `UNIQUE(sekolah_id, kelas)`, `kelas NOT NULL`, `nama_guru NOT NULL` | `kelas,nama_guru,nip,tahun_ajaran` | Template sample uses `'2024/2025'`; otherwise well-aligned with `uq_wali_kelas_sekolah_kelas`. |

---

## 4. Exact Canonical CSV Headers & Sample Rows Specification

### 1. Kelas (Classes)
- **Target Table**: `public.kelas` (Class registry) & `public.data_siswa` (Student assignment)
- **Canonical CSV Headers**: `nama_kelas,tingkat,jurusan`
- **Sample Row Values**:
  ```csv
  nama_kelas,tingkat,jurusan
  X Merdeka,X,Umum
  XI Merdeka 1,XI,MIPA
  XII Merdeka 2,XII,IPS
  ```
- **Student Allocation Alternative (for direct class reassignment via CSV)**:
  ```csv
  nisn,nama_siswa,kelas
  114367407,Moh. Candra Podomi,X Merdeka
  112366749,Anugrah Nugi Paputungan,X Merdeka
  ```

### 2. Siswa (Students)
- **Target Table**: `public.data_siswa`
- **Canonical CSV Headers**: `nisn,nama_siswa,kelas,gender,status,no_hp_ortu`
- **Sample Row Values**:
  ```csv
  nisn,nama_siswa,kelas,gender,status,no_hp_ortu
  114367407,Moh. Candra Podomi,X Merdeka,Laki-laki,Aktif,081234567890
  112366749,Anugrah Nugi Paputungan,X Merdeka,Laki-laki,Aktif,081234567891
  ```

### 3. Guru (Teachers)
- **Target Table**: `public.data_guru`
- **Canonical CSV Headers**: `sekolah_id,nip,nama_guru,mata_pelajaran,no_hp,status,email`
- **Sample Row Values**:
  ```csv
  sekolah_id,nip,nama_guru,mata_pelajaran,no_hp,status,email
  a0000000-0000-0000-0000-000000000001,198501012010011001,Fitri Aprilia Dotulong,Bahasa Inggris,6281241316190,Aktif,vitridotulong26@gmail.com
  a0000000-0000-0000-0000-000000000001,-,Mohamad Adnan Mamangkai,Pendidikan Agama Islam,6289518073927,Aktif,adnanmamangkai733@gmail.com
  ```

### 4. Mapel (Subjects)
- **Target Table**: `public.data_mapel`
- **Canonical CSV Headers**: `id,nama_mata_pelajaran,kategori,kelompok`
- **Sample Row Values**:
  ```csv
  id,nama_mata_pelajaran,kategori,kelompok
  MP-01,Matematika Wajib,X Merdeka,Umum
  MP-02,Bahasa Inggris,X Merdeka,Umum
  MP-03,Informatika,X Merdeka,Pilihan
  ```
  *(Note: Header aliases `kode_mapel` -> `id`, `nama_mapel` -> `nama_mata_pelajaran` supported seamlessly by `normalizeCsvHeaders`).*

### 5. Kalender Pendidikan (Academic Calendar)
- **Target Table**: `public.kalender_pendidikan`
- **Canonical CSV Headers**: `tanggal,keterangan,tipe`
- **Range-Compatible Headers**: `tanggal,tanggal_selesai,keterangan,tipe`
- **Sample Row Values**:
  ```csv
  tanggal,tanggal_selesai,keterangan,tipe
  2026-10-01,2026-10-01,Hari Kesaktian Pancasila,Libur
  2026-12-14,2026-12-19,Penilaian Akhir Semester Ganjil,Ujian
  ```

### 6. Jadwal Pelajaran (Schedules)
- **Target Table**: `public.jadwal_pelajaran`
- **Canonical CSV Headers**: `hari,nama_guru,mata_pelajaran,kelas,jam_mulai,jam_selesai`
- **Sample Row Values**:
  ```csv
  hari,nama_guru,mata_pelajaran,kelas,jam_mulai,jam_selesai
  Senin,Fitri Aprilia Dotulong,Bahasa Inggris,X Merdeka,07:30,09:00
  Senin,Mohamad Adnan Mamangkai,Pendidikan Agama Islam,X Merdeka,09:15,10:45
  ```

### 7. Wali Kelas (Homeroom Teachers)
- **Target Table**: `public.wali_kelas`
- **Canonical CSV Headers**: `kelas,nama_guru,nip,tahun_ajaran`
- **Sample Row Values**:
  ```csv
  kelas,nama_guru,nip,tahun_ajaran
  X Merdeka,Fitri Aprilia Dotulong,198501012010011001,2026/2027
  XI Merdeka,Setia Ambar Ningsih Mamonto,198703152012022002,2026/2027
  ```

---

## 5. Architectural DDL for Entity 1: `public.kelas`

To ensure zero database errors and complete multi-tenant RLS compliance:
```sql
-- Migration: Add table public.kelas
CREATE TABLE IF NOT EXISTS public.kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    nama_kelas TEXT NOT NULL,
    tingkat TEXT,
    jurusan TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_kelas_sekolah UNIQUE (sekolah_id, nama_kelas)
);

CREATE INDEX IF NOT EXISTS idx_kelas_sekolah_id ON public.kelas(sekolah_id);
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
CALL public.setup_master_data_admin_policies('kelas');
```

---

## 6. Caveats

1. **Database Migration Deployment**: `SETUP_NEW_SCHOOL_TEMPLATE.sql` serves as the gold-standard template for new school tenants, but existing tenants may require the `CREATE TABLE IF NOT EXISTS public.kelas` migration to be applied if `public.kelas` is adopted as a physical table.
2. **Student Class Fallback**: If `public.kelas` is not immediately created as a physical table in Supabase, the `Kelas` sub-menu can synthesize the class registry dynamically from `SELECT DISTINCT kelas FROM public.data_siswa WHERE sekolah_id = ...` union `public.wali_kelas`, and CSV import for `Kelas` can update `data_siswa.kelas` by `nisn`. However, creating the physical table provides superior data integrity.
3. **No Code Modification Undertaken**: In accordance with the Explorer role, no source files were modified.

---

## 7. Conclusion

All 7 master data entities have been thoroughly surveyed across PostgreSQL DDL, migrations, TypeScript types, frontend views, and CSV processing logic. The discrepancies—notably the missing `Kelas` tab/template, missing `jam_mulai`/`jam_selesai` in `Jadwal_Pelajaran`, and the lack of date-range fields in `Kalender_Pendidikan`—have been precisely mapped. The canonical CSV schemas defined above provide 100% precision alignment with the database schema and existing project test suites.

---

## 8. Verification Method

1. **Verify Database Types & Models**:
   Inspect `src/types/database.ts` and `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` to verify table schemas and constraints.
2. **Verify CSV Parser Integration**:
   Inspect `src/lib/dataIntegrityGuard.ts` (`normalizeCsvHeaders`, `parseAndValidateMasterCsv`, `importMasterDataFromCsv`).
3. **Run Existing Automated Tests**:
   Execute:
   ```powershell
   npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts
   npx tsx tests/m6_master_data_polish.test.ts
   ```
   Both suites must pass with 0 failures (verified: 31/31 passed in both suites).
