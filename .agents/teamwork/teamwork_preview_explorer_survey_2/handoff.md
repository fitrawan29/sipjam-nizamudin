# Handoff Report: Superadmin School Management Survey (Mode Presensi Siswa)

## 1. Observation

### 1.1 Data Fetching in `SuperadminView.tsx`
- **File**: `src/components/SuperadminView.tsx`, lines 59–73.
- **Fetching Function**:
  ```typescript
  // 1. Fetch schools
  const { data: schools, error: schoolErr } = await supabase
    .from('sekolah')
    .select('*')
    .order('created_at', { ascending: false });

  if (schoolErr) {
    console.error('Error fetching sekolah:', schoolErr);
  } else if (schools) {
    setSekolahList(schools);
  }
  ```
- **State Storage**:
  - Line 33: `const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);`
- **Reactivity & Trigger Points**:
  - Mounted via `useEffect` (lines 115–117): `useEffect(() => { fetchAllData(); }, [fetchAllData]);`
  - Refreshed immediately following:
    - Adding school: line 271 (`fetchAllData()`)
    - Editing school: line 388 (`fetchAllData()`)
    - Toggling school status: line 425 (`fetchAllData()`)
    - Deleting school: line 461 (`fetchAllData()`)
    - Manual header button click: line 716 (`onClick={fetchAllData}`)

### 1.2 Data / Interface Types for `Sekolah`
- **File**: `src/types/database.ts`
- **Table Definition**: Lines 1270–1332 defines `sekolah` entity schema for Supabase:
  - `Row`: contains `id: string`, `nama: string`, `npsn: string | null`, `status: string`, `mode_jurnal: string | null`, etc.
  - `Insert`: optional fields with defaults (`mode_jurnal?: string | null`, etc.).
  - `Update`: optional fields for update payload (`mode_jurnal?: string | null`, etc.).
- **Type Aliases**:
  - Line 1771–1773:
    ```typescript
    export type Sekolah = Tables<"sekolah">;
    export type SekolahInsert = TablesInsert<"sekolah">;
    export type SekolahUpdate = TablesUpdate<"sekolah">;
    ```
  - Line 1920: `export type StatusSekolah = "aktif" | "nonaktif";`

### 1.3 UI Structure for School Management in `SuperadminView.tsx`
- **Tab Selection**: Rendered under `activeTab === 'sekolah'` (lines 984–1248).
- **Header & Action**:
  - Lines 995–1001: Button "Daftarkan Sekolah Baru" triggers `onClick={handleOpenAddSchoolModal}`.
- **Search & Filters**:
  - Lines 1004–1043: Search bar (`sekolahSearch`), Kota/Kabupaten dropdown (`cityFilter`), Status filter (`statusFilter`).
- **School Table**:
  - Lines 1046–1246: Table headers: `No`, `Nama Lembaga & NPSN`, `Wilayah`, `Kepala Sekolah`, `Admin`, `Status`, `Aksi`.
  - Column `Nama Lembaga & NPSN` (lines 1072–1089): Shows school name, NPSN, address, and current feature badges.
  - Column `Status` (lines 1113–1127): Toggle button via `onClick={() => handleToggleSchoolStatus(s)}`.
  - Column `Aksi` (lines 1128–1239): Contains Invoice WhatsApp/PDF button, Edit button (`onClick={() => handleEditSchool(s)}`, lines 1222–1229), and Delete button (`onClick={() => handleDeleteSchool(s)}`, lines 1230–1237).
- **Modal Architecture**:
  - SIPJAM does NOT use separate React component files (no `EditSekolahModal.tsx` or drawer).
  - All school add/edit modals are built using **SweetAlert2 (`Swal.fire`)** with custom HTML templates.

### 1.4 Precedent Pattern: How `mode_jurnal` was Added and Handled
1. **Database Migration** (`supabase/migrations/20261001_features_r1_r6.sql`, line 10):
   ```sql
   ALTER TABLE public.sekolah
     ADD COLUMN IF NOT EXISTS mode_jurnal TEXT DEFAULT 'camera_upload';
   ```
2. **Type Definition** (`src/types/database.ts`, lines 1280, 1300, 1320):
   Added `mode_jurnal: string | null` to `Row`, `Insert`, and `Update`.
3. **Add School Modal (`handleOpenAddSchoolModal`)**:
   - HTML field (lines 213–218):
     ```html
     <div>
       <label class="font-bold text-gray-700 block mb-1">Mode Jurnal Pembelajaran</label>
       <select id="swal-sch-mode-jurnal" class="swal2-select !mt-0 !w-full text-xs">
         <option value="camera_upload" selected>Live Camera + Upload Foto</option>
         <option value="camera_only">Live Camera Langsung</option>
       </select>
     </div>
     ```
   - Extraction in `preConfirm` (line 236):
     ```typescript
     const mode_jurnal = (document.getElementById('swal-sch-mode-jurnal') as HTMLSelectElement)?.value || 'camera_upload';
     ```
   - Returned in object (line 253): `mode_jurnal`
   - Inserted into DB (line 261): `await supabase.from('sekolah').insert([formValues]);`
4. **Edit School Modal (`handleEditSchool`)**:
   - HTML field (lines 330–335):
     ```html
     <div>
       <label class="font-bold text-gray-700 block mb-1">Mode Jurnal Pembelajaran</label>
       <select id="swal-edit-mode-jurnal" class="swal2-select !mt-0 !w-full text-xs">
         <option value="camera_only" ${(school as any).mode_jurnal === 'camera_only' ? 'selected' : ''}>Live Camera Langsung</option>
         <option value="camera_upload" ${(school as any).mode_jurnal === 'camera_upload' || !(school as any).mode_jurnal ? 'selected' : ''}>Live Camera + Upload Foto</option>
       </select>
     </div>
     ```
   - Extraction in `preConfirm` (line 353):
     ```typescript
     const mode_jurnal = (document.getElementById('swal-edit-mode-jurnal') as HTMLSelectElement)?.value || 'camera_upload';
     ```
   - Returned in object (line 370): `mode_jurnal, updated_at: new Date().toISOString()`
   - Updated in DB (lines 379–382):
     ```typescript
     const { error } = await supabase
       .from('sekolah')
       .update(formValues)
       .eq('id', school.id);
     ```
5. **Table Badge Display** (lines 1076–1083):
   ```tsx
   <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
     (s as any).mode_jurnal === 'camera_only'
       ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
       : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
   }`}>
     <i className={`fa-solid ${(s as any).mode_jurnal === 'camera_only' ? 'fa-camera' : 'fa-camera-rotate'} mr-1`}></i>
     {(s as any).mode_jurnal === 'camera_only' ? 'Kamera Langsung' : 'Kamera + Upload'}
   </span>
   ```
6. **Consumer View (`src/components/GuruJurnal.tsx`, lines 245–266)**:
   Queries `mode_jurnal` from `sekolah` by `user.sekolah_id` and adjusts the view accordingly.

---

## 2. Logic Chain

1. **Database Schema & Constraints**:
   - Per Requirement R1, `public.sekolah` needs a new column `mode_presensi_siswa` with allowed values `'qr'` or `'manual'`, defaulting to `'qr'`.
   - Adding a check constraint `CHECK (mode_presensi_siswa IN ('qr', 'manual'))` ensures DB integrity.
   - Updating `src/types/database.ts` ensures TypeScript type safety across the entire application without any `any` casting regressions.

2. **UI Implementation Strategy (Ponytail Mode)**:
   - Rather than creating complex new subcomponents, the established pattern in `SuperadminView.tsx` uses SweetAlert2 HTML strings.
   - Adding `mode_presensi_siswa` to `handleOpenAddSchoolModal` and `handleEditSchool` mirrors `mode_jurnal` exactly.
   - Adding a visual badge in the table column `Nama Lembaga & NPSN` alongside the `mode_jurnal` badge gives Superadmin instant visibility over which mode each school is running.
   - Adding a quick-toggle handler `handleTogglePresensiMode(school: Sekolah)` (or making the badge/table action clickable) gives Superadmin the option to toggle between QR Code and Manual with a single click, satisfying both the "toggle" and "dropdown" specifications in Requirement R2.

3. **State Management & Form Validation**:
   - `SuperadminView.tsx` uses React `useState` (`sekolahList`).
   - On submission, `preConfirm` validates mandatory fields (`nama`, `npsn`, `kota_kabupaten`).
   - Default fallback: `(document.getElementById('...') as HTMLSelectElement)?.value || 'qr'` ensures that if the field is missing or omitted, it gracefully falls back to `'qr'`.
   - On successful `update` or `insert`, `fetchAllData()` is invoked, immediately syncing the UI state from the database.

---

## 3. Caveats

1. **Existing Schools Migration**: Any existing rows in `public.sekolah` may currently have `mode_presensi_siswa` as NULL until the migration runs. The migration script MUST include `DEFAULT 'qr'` and backfill existing NULL records with `'qr'`.
2. **Casting in SuperadminView**: Currently `(s as any).mode_jurnal` was casted with `as any`. When adding `mode_presensi_siswa` to `src/types/database.ts`, developers can either access `s.mode_presensi_siswa` directly or use `(s as any).mode_presensi_siswa` as fallback.
3. **Multi-Tenant Context**: Superadmin is the only role that manages `public.sekolah` globally. School admins and teachers do NOT access `SuperadminView.tsx`. Their components (`PiketView.tsx`, `RekapSiswaView.tsx`, `GuruJurnal.tsx`) only read their school's configured `mode_presensi_siswa` via `user.sekolah_id`.

---

## 4. Conclusion & Actionable Implementation Plan

### Exact Insertion Points for Builder

#### Step A: Database Migration (`supabase/migrations/20261004_mode_presensi_siswa.sql`)
```sql
ALTER TABLE public.sekolah 
  ADD COLUMN IF NOT EXISTS mode_presensi_siswa TEXT DEFAULT 'qr';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_mode_presensi_siswa'
  ) THEN
    ALTER TABLE public.sekolah
      ADD CONSTRAINT check_mode_presensi_siswa 
      CHECK (mode_presensi_siswa IN ('qr', 'manual'));
  END IF;
END $$;

UPDATE public.sekolah 
SET mode_presensi_siswa = 'qr' 
WHERE mode_presensi_siswa IS NULL;
```

#### Step B: Types Definition (`src/types/database.ts`)
1. In `sekolah.Row` (line 1280):
   ```typescript
   mode_presensi_siswa: 'qr' | 'manual' | string | null
   ```
2. In `sekolah.Insert` (line 1300):
   ```typescript
   mode_presensi_siswa?: 'qr' | 'manual' | string | null
   ```
3. In `sekolah.Update` (line 1320):
   ```typescript
   mode_presensi_siswa?: 'qr' | 'manual' | string | null
   ```
4. Export type alias around line 1921:
   ```typescript
   export type ModePresensiSiswa = 'qr' | 'manual';
   ```

#### Step C: Superadmin UI (`src/components/SuperadminView.tsx`)

1. **In `handleOpenAddSchoolModal`**:
   - **HTML Field** (around line 218, immediately after `swal-sch-mode-jurnal`):
     ```html
     <div>
       <label class="font-bold text-gray-700 block mb-1">Mode Presensi Siswa</label>
       <select id="swal-sch-mode-presensi-siswa" class="swal2-select !mt-0 !w-full text-xs">
         <option value="qr" selected>QR Code (Scan Kamera / Scanner Eksternal)</option>
         <option value="manual">Manual (Ceklis Hadir / Pulang per Siswa)</option>
       </select>
     </div>
     ```
   - **DOM Extraction** (around line 237):
     ```typescript
     const mode_presensi_siswa = (document.getElementById('swal-sch-mode-presensi-siswa') as HTMLSelectElement)?.value || 'qr';
     ```
   - **Payload** (around line 254):
     ```typescript
     return {
       ...
       mode_jurnal,
       mode_presensi_siswa
     };
     ```

2. **In `handleEditSchool`**:
   - **HTML Field** (around line 335, immediately after `swal-edit-mode-jurnal`):
     ```html
     <div>
       <label class="font-bold text-gray-700 block mb-1">Mode Presensi Siswa</label>
       <select id="swal-edit-mode-presensi-siswa" class="swal2-select !mt-0 !w-full text-xs">
         <option value="qr" ${(school as any).mode_presensi_siswa === 'qr' || !(school as any).mode_presensi_siswa ? 'selected' : ''}>QR Code (Scan Kamera / Scanner Eksternal)</option>
         <option value="manual" ${(school as any).mode_presensi_siswa === 'manual' ? 'selected' : ''}>Manual (Ceklis Hadir / Pulang per Siswa)</option>
       </select>
     </div>
     ```
   - **DOM Extraction** (around line 354):
     ```typescript
     const mode_presensi_siswa = (document.getElementById('swal-edit-mode-presensi-siswa') as HTMLSelectElement)?.value || 'qr';
     ```
   - **Payload** (around line 371):
     ```typescript
     return {
       ...
       mode_jurnal,
       mode_presensi_siswa,
       updated_at: new Date().toISOString()
     };
     ```

3. **In School Table Badge** (around line 1084):
   Add a badge right next to the `mode_jurnal` badge:
   ```tsx
   <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 ${
     (s as any).mode_presensi_siswa === 'manual'
       ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
       : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
   }`}>
     <i className={`fa-solid ${(s as any).mode_presensi_siswa === 'manual' ? 'fa-list-check' : 'fa-qrcode'}`}></i>
     {(s as any).mode_presensi_siswa === 'manual' ? 'Presensi Manual' : 'Presensi QR'}
   </span>
   ```

4. **Add Quick Toggle Function `handleTogglePresensiMode`** (around line 433):
   ```typescript
   const handleTogglePresensiMode = async (school: Sekolah) => {
     const currentMode = (school as any).mode_presensi_siswa || 'qr';
     const newMode = currentMode === 'manual' ? 'qr' : 'manual';
     const modeLabel = newMode === 'manual' ? 'Manual (Ceklis)' : 'QR Code (Scanner)';

     const confirm = await Swal.fire({
       title: 'Ubah Mode Presensi Siswa?',
       text: `Ubah mode presensi siswa untuk "${school.nama}" menjadi ${modeLabel}?`,
       icon: 'question',
       showCancelButton: true,
       confirmButtonText: `Ya, Ubah ke ${modeLabel}`,
       confirmButtonColor: newMode === 'manual' ? '#7e22ce' : '#0B4619',
       cancelButtonText: 'Batal'
     });

     if (!confirm.isConfirmed) return;

     setLoading(true);
     try {
       const { error } = await supabase
         .from('sekolah')
         .update({ mode_presensi_siswa: newMode, updated_at: new Date().toISOString() })
         .eq('id', school.id);

       if (error) {
         Swal.fire('Gagal Mengubah Mode', error.message, 'error');
       } else {
         Swal.fire('Berhasil', `Mode presensi siswa berhasil diubah menjadi ${modeLabel}.`, 'success');
         fetchAllData();
       }
     } catch (err: any) {
       Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
     } finally {
       setLoading(false);
     }
   };
   ```
   Can be wired as an `onClick={() => handleTogglePresensiMode(s)}` on the badge or as a quick action button.

---

## 5. Verification Method

1. **TypeScript Validation**:
   - Run: `npx tsc --noEmit`
   - Invalidation condition: Any compiler error in `src/types/database.ts` or `src/components/SuperadminView.tsx`.
2. **Build Validation**:
   - Run: `npm run build`
   - Invalidation condition: Build failure or bundle compilation error.
3. **Database Verification via Supabase MCP / SQL**:
   - Query schema: `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'sekolah' AND column_name = 'mode_presensi_siswa';`
   - Verify constraint: `SELECT conname FROM pg_constraint WHERE conname = 'check_mode_presensi_siswa';`
4. **Functional UI Flow Verification**:
   - Login as Superadmin (`/superadmin` or navigate to Tab "Kelola Sekolah").
   - Click "Edit Data Sekolah" (pencil icon) on any school row.
   - Verify the dropdown "Mode Presensi Siswa" appears with options "QR Code" and "Manual", pre-selecting the current school value.
   - Change mode from "QR Code" to "Manual" and click "Simpan Perubahan".
   - Verify success modal appears, `fetchAllData()` refreshes the table, and the school badge reflects "Presensi Manual".
   - Check Supabase `public.sekolah` table: ensure the row's `mode_presensi_siswa` column is updated to `'manual'`.
