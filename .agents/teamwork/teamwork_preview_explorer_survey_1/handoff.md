# Handoff Report: Supabase Schema, Multi-Tenant Propagation & Migration Survey

**Explorer**: `teamwork_preview_explorer`  
**Date**: 2026-10-04  
**Task**: Database & Supabase Schema Survey for Per-School Student Attendance Mode (`mode_presensi_siswa`)

---

## 1. Observation

### 1.1 `public.sekolah` Table Structure & Constraints

Direct database inspection via `execute_sql` on project `jicvvqxjyzntdrccnuyz`:
```json
[
  {"column_name":"id", "data_type":"uuid", "is_nullable":"NO", "column_default":"gen_random_uuid()"},
  {"column_name":"nama", "data_type":"text", "is_nullable":"NO", "column_default":null},
  {"column_name":"npsn", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"alamat", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"kota_kabupaten", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"provinsi", "data_type":"text", "is_nullable":"YES", "column_default":"'Sulawesi Utara'::text"},
  {"column_name":"telepon", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"email", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"website", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"logo_url", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"logo_kiri_url", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"logo_kanan_url", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"nama_kepala_sekolah", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"nip_kepala_sekolah", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"status", "data_type":"text", "is_nullable":"NO", "column_default":"'aktif'::text"},
  {"column_name":"created_at", "data_type":"timestamp with time zone", "is_nullable":"YES", "column_default":"now()"},
  {"column_name":"updated_at", "data_type":"timestamp with time zone", "is_nullable":"YES", "column_default":"now()"},
  {"column_name":"mode_jurnal", "data_type":"text", "is_nullable":"YES", "column_default":"'camera_upload'::text"}
]
```

**Constraints on `public.sekolah`** (queried from `pg_constraint`):
- `sekolah_pkey`: `PRIMARY KEY (id)`
- `sekolah_npsn_key`: `UNIQUE (npsn)`
- `sekolah_status_check`: `CHECK ((status = ANY (ARRAY['aktif'::text, 'nonaktif'::text])))`

**Row-Level Security Policies on `public.sekolah`** (`pg_policies`):
- `sekolah_select_policy` (SELECT): `(is_superadmin() OR (id = get_auth_user_sekolah_id()))`
- `sekolah_insert_policy` (INSERT): `is_superadmin()`
- `sekolah_update_policy` (UPDATE): `(is_superadmin() OR ((get_auth_user_role() = 'Admin'::text) AND (id = get_auth_user_sekolah_id())))`
- `sekolah_delete_policy` (DELETE): `is_superadmin()`

**Precedent Column Addition**:
In `supabase/migrations/20261001_features_r1_r6.sql` (lines 8–10):
```sql
ALTER TABLE public.sekolah 
  ADD COLUMN IF NOT EXISTS mode_jurnal TEXT DEFAULT 'camera_upload';
```

---

### 1.2 `public.presensi_siswa` Table Structure & Constraints

Created via `supabase/migrations/20261003_qr_presensi_siswa.sql` and verified live via `execute_sql`:
```json
[
  {"column_name":"id", "data_type":"uuid", "is_nullable":"NO", "column_default":"gen_random_uuid()"},
  {"column_name":"sekolah_id", "data_type":"uuid", "is_nullable":"NO", "column_default":null},
  {"column_name":"siswa_id", "data_type":"uuid", "is_nullable":"NO", "column_default":null},
  {"column_name":"nisn", "data_type":"text", "is_nullable":"YES", "column_default":null},
  {"column_name":"nama_siswa", "data_type":"text", "is_nullable":"NO", "column_default":null},
  {"column_name":"kelas", "data_type":"text", "is_nullable":"NO", "column_default":null},
  {"column_name":"tanggal", "data_type":"date", "is_nullable":"NO", "column_default":"CURRENT_DATE"},
  {"column_name":"status", "data_type":"text", "is_nullable":"NO", "column_default":null},
  {"column_name":"jam", "data_type":"time without time zone", "is_nullable":"NO", "column_default":"CURRENT_TIME"},
  {"column_name":"timestamp", "data_type":"timestamp with time zone", "is_nullable":"NO", "column_default":"now()"},
  {"column_name":"device_id", "data_type":"text", "is_nullable":"YES", "column_default":"'kiosk-default'::text"},
  {"column_name":"created_at", "data_type":"timestamp with time zone", "is_nullable":"NO", "column_default":"now()"}
]
```

**Constraints on `public.presensi_siswa`**:
- `presensi_siswa_pkey`: `PRIMARY KEY (id)`
- `uq_presensi_siswa_status`: `UNIQUE (sekolah_id, tanggal, siswa_id, status)`
- `presensi_siswa_status_check`: `CHECK ((status = ANY (ARRAY['datang'::text, 'pulang'::text])))`
- `presensi_siswa_sekolah_id_fkey`: `FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE`
- `presensi_siswa_siswa_id_fkey`: `FOREIGN KEY (siswa_id) REFERENCES data_siswa(id) ON DELETE CASCADE`

**Indexes**:
- `idx_presensi_siswa_sekolah_tgl_kls` on `(sekolah_id, tanggal, kelas)`
- `idx_presensi_siswa_sekolah_siswa` on `(sekolah_id, siswa_id)`
- `idx_presensi_siswa_timestamp` on `(timestamp DESC)`

**RLS Policies on `public.presensi_siswa`**:
All operations (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) require:
```sql
(is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))
```

---

### 1.3 How Presensi Siswa Records are Inserted & Queried

1. **Insertion Logic (`src/lib/qrSiswa.ts`)**:
   - Function: `recordPresensiSiswa(supabaseClient, params: RecordPresensiParams)` (lines 453–542).
   - Parameters: `{ siswa, status, sekolahId, tanggal, jam, deviceId }`.
   - Idempotency & Deduplication: Queries `presensi_siswa` with `.eq('sekolah_id', sekolahId).eq('tanggal', tanggal).eq('siswa_id', siswa.id).eq('status', status).maybeSingle()`. If found, returns `{ success: false, alreadyExists: true }`.
   - Insertion payload:
     ```ts
     const payload = {
       sekolah_id: sekolahId,
       siswa_id: siswa.id,
       nisn: siswa.nisn || null,
       nama_siswa: siswa.nama_siswa,
       kelas: siswa.kelas,
       tanggal,
       status, // 'datang' | 'pulang'
       jam,
       timestamp: new Date().toISOString(),
       device_id: deviceId
     };
     ```
   - Catches PostgreSQL error `23505` (unique violation on `uq_presensi_siswa_status`) gracefully.

2. **Consumption in Views**:
   - `src/components/PiketView.tsx` (lines 187–235):
     - Displays summary counts via `getTodayPresensiSummary(supabase, user.sekolah_id, todayStr)`.
     - Displays recent events feed via `getRecentPresensiSiswa(supabase, user.sekolah_id, todayStr, 150)`.
     - Listens to Supabase Realtime channel `presensi_kiosk_${user?.sekolah_id || 'all'}_...` on `table: 'presensi_siswa'`.
   - `src/components/GuruJurnal.tsx` (lines 402–420):
     - Queries `presensi_siswa` for today (`tanggal = todayStr`) and class (`kelas = selectedKelas`) where `status = 'datang'` to pre-populate student attendance in class journal.
   - `src/components/RekapSiswaView.tsx` (lines 129, 184):
     - Queries `presensi_siswa` to generate class-level gate attendance reports ("Presensi Gerbang").

---

### 1.4 How `sekolah_id` is Propagated and Enforced Multi-Tenant

1. **Client Authentication Session**:
   - Login RPC `public.verify_login(p_username, p_password)` returns `sekolah_id` and `session_token`.
   - Stored in browser `localStorage.getItem('sipjam_user')` as `{ id, username, role, sekolah_id, session_token }`.

2. **Client HTTP Header Injection (`src/lib/supabaseClient.ts`)**:
   - `getActiveTenantContext()` (lines 43–74) parses `sipjam_user` from `localStorage`.
   - `dynamicTenantFetch` (lines 81–125) intercepts every outgoing PostgREST / Storage / RPC fetch and injects headers:
     - `x-sekolah-id: <user.sekolah_id>`
     - `x-user-role: <user.role>`
     - `x-user-id: <user.id>`
     - `x-session-token: <user.session_token>`

3. **Database RLS Resolution (`supabase/migrations/20260926_secure_rls_helpers.sql`)**:
   - Function `public.get_auth_user_sekolah_id()`:
     - Checks `service_role` header `request.headers ->> 'x-sekolah-id'`
     - Checks JWT claim `request.jwt.claim.sekolah_id`
     - Checks session token: reads `request.headers ->> 'x-session-token'`, queries `public.users.sekolah_id WHERE session_token = v_raw::uuid`
   - Function `public.is_superadmin()`:
     - Returns `TRUE` if `service_role` or if user role is `'Superadmin'` and user is not scoped to a specific school tenant (`get_auth_user_sekolah_id() IS NULL`).
   - RLS Policies on tables use `sekolah_id = public.get_auth_user_sekolah_id() OR is_superadmin()`.

4. **Frontend Query Filtering**:
   - In all queries across components (`data_siswa`, `presensi_siswa`, `absensi`, `data_guru`, etc.), developers explicitly append `.eq('sekolah_id', user.sekolah_id)` for defense-in-depth.

---

### 1.5 How Migrations are Managed in This Project

1. **File System**: Migrations are saved as SQL files in `supabase/migrations/` prefixed with timestamp/date, e.g.:
   - `20260912_multi_tenant_sekolah_rls.sql`
   - `20261001_features_r1_r6.sql`
   - `20261002_sekolah_nonaktif_login_block.sql`
   - `20261003_add_kktp_konten_lokasi_kbm.sql`
   - `20261003_qr_presensi_siswa.sql`
2. **Supabase Remote Execution**: Applied using Supabase MCP tool `apply_migration` (or Supabase CLI):
   - Project ID: `jicvvqxjyzntdrccnuyz`
   - Tool arguments: `{ "project_id": "jicvvqxjyzntdrccnuyz", "name": "<migration_name>", "query": "<sql>" }`
3. **Migration Version Table**: Supabase tracks applied versions in `supabase_migrations.schema_migrations` (inspected via `list_migrations`).
4. **TypeScript Definitions**: Mirrored in `src/types/database.ts` (1923 lines) under `Database['public']['Tables']`.

---

## 2. Logic Chain

1. **Requirement Analysis**:
   - Requirement R1 demands adding `mode_presensi_siswa` (`'qr'` | `'manual'`, default `'qr'`) to `public.sekolah`.
   - Superadmin can configure this per school (R2).
   - In `'manual'` mode, `PiketView` displays a manual attendance checklist for students instead of the QR scanner (R3).
   - In `'qr'` mode, `PiketView` retains the existing QR scanner (R4).
   - Downstream consumers (`GuruJurnal.tsx`, `RekapSiswaView.tsx`) read from `presensi_siswa` agnostic of whether rows were produced via QR scan or manual check (R5).

2. **Column Type Choice (`TEXT` + Check Constraint vs PostgreSQL `ENUM`)**:
   - Table `public.sekolah` already uses `status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif'))` (Observation 1.1).
   - Table `public.presensi_siswa` uses `status TEXT NOT NULL CHECK (status IN ('datang', 'pulang'))` (Observation 1.2).
   - PostgREST handles `TEXT` with CHECK constraints natively without requiring custom PostgreSQL enum type mapping or cache invalidation headaches.
   - Therefore, `TEXT NOT NULL DEFAULT 'qr'` with a CHECK constraint `CHECK (mode_presensi_siswa IN ('qr', 'manual'))` is completely consistent with the existing codebase patterns.

3. **Multi-Tenant Safety**:
   - `public.sekolah` RLS policies permit `SELECT` if `id = get_auth_user_sekolah_id()`. Thus, non-superadmin users (Guru Piket, Admin Sekolah) can read their school's `mode_presensi_siswa` column without any policy changes.
   - `public.sekolah` RLS policies allow Superadmin to update all schools, and School Admin to update their own school (`sekolah_update_policy`).

4. **Integration with `src/lib/qrSiswa.ts` & `PiketView.tsx`**:
   - Because `recordPresensiSiswa()` takes `{ siswa, status, sekolahId, tanggal, jam, deviceId }` and inserts standard rows into `presensi_siswa`, manual marking in `PiketView` can simply call `recordPresensiSiswa(supabase, { siswa, status: 'datang', sekolahId: user.sekolah_id })` or `status: 'pulang'`.
   - All unique constraints (`uq_presensi_siswa_status`), indexes, and downstream query integrations (`GuruJurnal`, `RekapSiswaView`) will work out of the box without schema alterations to `presensi_siswa`.

---

## 3. Caveats

1. **Existing Schools**: Currently there is 1 active school in production (`SMA Nizamudin`, ID: `a0000000-0000-0000-0000-000000000001`). The migration must backfill any existing rows with `'qr'` before or during setting `NOT NULL`.
2. **Client Type Generation**: After running `apply_migration`, `src/types/database.ts` must be manually updated (or regenerated) to include `mode_presensi_siswa` in `sekolah.Row`, `sekolah.Insert`, and `sekolah.Update` to maintain `npx tsc --noEmit` clean compilation.
3. **PiketView UI Responsiveness**: In manual mode, `PiketView` should handle class filtering smoothly so that schools with hundreds of students do not experience UI lag when rendering check buttons.

---

## 4. Conclusion & Recommendations

### 4.1 Recommended SQL Migration File

Create file: `supabase/migrations/20261004_add_mode_presensi_siswa_to_sekolah.sql`
Apply via MCP: `apply_migration` (name: `add_mode_presensi_siswa_to_sekolah`, project: `jicvvqxjyzntdrccnuyz`)

```sql
-- Migration: 20261004_add_mode_presensi_siswa_to_sekolah.sql
-- Description: Add mode_presensi_siswa column to public.sekolah with default 'qr' and check constraint ('qr', 'manual')

-- 1. Add mode_presensi_siswa column with default 'qr'
ALTER TABLE public.sekolah 
  ADD COLUMN IF NOT EXISTS mode_presensi_siswa TEXT DEFAULT 'qr';

-- 2. Backfill existing rows if any are null
UPDATE public.sekolah 
  SET mode_presensi_siswa = 'qr' 
  WHERE mode_presensi_siswa IS NULL;

-- 3. Enforce NOT NULL
ALTER TABLE public.sekolah 
  ALTER COLUMN mode_presensi_siswa SET NOT NULL;

-- 4. Add check constraint ensuring mode is either 'qr' or 'manual'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'sekolah_mode_presensi_siswa_check'
  ) THEN
    ALTER TABLE public.sekolah 
      ADD CONSTRAINT sekolah_mode_presensi_siswa_check 
      CHECK (mode_presensi_siswa IN ('qr', 'manual'));
  END IF;
END $$;
```

### 4.2 TypeScript Types Update (`src/types/database.ts`)

In `src/types/database.ts` under `Tables['sekolah']`:
- `Row`:
  ```ts
  mode_presensi_siswa: 'qr' | 'manual' | string
  ```
- `Insert`:
  ```ts
  mode_presensi_siswa?: 'qr' | 'manual' | string
  ```
- `Update`:
  ```ts
  mode_presensi_siswa?: 'qr' | 'manual' | string
  ```
- Export helper type (around line 1920):
  ```ts
  export type ModePresensiSiswa = 'qr' | 'manual';
  ```

### 4.3 UI Component Integration Blueprint

1. **`src/components/SuperadminView.tsx`**:
   - In `handleRegisterSchool`: Add dropdown input `#swal-sch-mode-presensi-siswa` with options `qr` ("QR Code (Kamera / Hardware Scanner)") and `manual` ("Manual (Checklist Daftar Siswa)").
   - In `handleEditSchool`: Add `#swal-edit-mode-presensi-siswa` pre-populated with `(school as any).mode_presensi_siswa || 'qr'`.
   - In the school cards list (lines 1070–1085): Display a badge indicating current student attendance mode (e.g. `fa-qrcode` for QR, `fa-list-check` for Manual).

2. **`src/components/PiketView.tsx`**:
   - Fetch school configuration:
     ```ts
     const [modePresensiSiswa, setModePresensiSiswa] = useState<'qr' | 'manual'>('qr');
     
     useEffect(() => {
       if (!user?.sekolah_id) return;
       supabase.from('sekolah').select('mode_presensi_siswa').eq('id', user.sekolah_id).single()
         .then(({ data }) => {
           if (data?.mode_presensi_siswa) setModePresensiSiswa(data.mode_presensi_siswa as any);
         });
     }, [user?.sekolah_id]);
     ```
   - In Tab `'scan'`:
     - If `modePresensiSiswa === 'manual'`: Render a responsive class-filtered student roster with individual buttons for "Hadir Datang" and "Hadir Pulang", showing real-time marked status and timestamps.
     - If `modePresensiSiswa === 'qr'`: Render the existing camera and USB scanner interface.

---

## 5. Verification Method

To independently verify the implementation:

1. **Verify Database Column & Constraint via Supabase MCP / SQL**:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
     AND table_name = 'sekolah' 
     AND column_name = 'mode_presensi_siswa';
   ```
   *Expected*: `column_name = mode_presensi_siswa`, `data_type = text`, `is_nullable = NO`, `column_default = 'qr'::text`.

   ```sql
   SELECT pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conname = 'sekolah_mode_presensi_siswa_check';
   ```
   *Expected*: `CHECK ((mode_presensi_siswa = ANY (ARRAY['qr'::text, 'manual'::text])))`.

2. **Verify Check Constraint Rejection**:
   ```sql
   UPDATE public.sekolah SET mode_presensi_siswa = 'invalid_mode' WHERE id = 'a0000000-0000-0000-0000-000000000001';
   ```
   *Expected*: Constraint violation error (`23514 check_violation`).

3. **Verify Superadmin Update**:
   ```sql
   UPDATE public.sekolah SET mode_presensi_siswa = 'manual' WHERE id = 'a0000000-0000-0000-0000-000000000001';
   SELECT mode_presensi_siswa FROM public.sekolah WHERE id = 'a0000000-0000-0000-0000-000000000001';
   ```
   *Expected*: Returns `'manual'`.

4. **Verify TypeScript & Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   *Expected*: 0 TypeScript errors and successful production build.
