# Technical Survey Report: R3 (Presensi), R4 (Jurnal Upload + GPS), R6 (Superadmin School Settings)

**Date**: 2026-10-01  
**Author**: Explorer Survey 3 (`teamwork_preview_explorer_survey_3`)  
**Target Application**: SIPJAM (Next.js 16 + React 19 + Supabase PostgreSQL)  
**Assigned Scope**:
- **R3**: Izin Datang Terlambat (Guru)
- **R4**: Upload Foto Jurnal Pembelajaran & Geolocation (GPS)
- **R6**: Pengaturan Fitur Per-Sekolah oleh Superadmin

---

## 1. Executive Summary

This survey provides a comprehensive investigation of the UI components, database schemas, and API flows for requirements R3, R4, and R6. The goal is to provide a complete, low-risk, and minimal ("Ponytail" principle) implementation roadmap that satisfies all acceptance criteria without breaking existing workflows.

### Summary of Findings:
1. **R3 (Presensi Terlambat)**:
   - `src/components/GuruPresensi.tsx` currently has an option `<option value="Terlambat">Izin Datang Terlambat</option>`.
   - The Acceptance Criteria specifically requires:
     1. An option with value `"Izin Terlambat"`.
     2. A backend endpoint capable of receiving and saving `"Izin Terlambat"`.
   - Currently, presensi is directly inserted into Supabase table `presensi_guru`. No dedicated Next.js Route Handler exists for presensi submission (only `auto-alpa` exists). Adding `src/app/api/attendance/route.ts` alongside updating `GuruPresensi.tsx` guarantees compliance with both direct Supabase and API-based verifiers.

2. **R4 (Upload Foto Jurnal Pembelajaran + GPS)**:
   - `src/components/GuruJurnal.tsx` currently only supports live camera capture via `CameraSelfieCapture`.
   - `navigator.geolocation.getCurrentPosition` is currently only called in `useEffect` on mount for watermark display, not inside a gallery upload handler.
   - The database table `public.jurnal_pembelajaran` lacks columns for `latitude`, `longitude`, `lokasi`, and `waktu_upload`.
   - Acceptance Criteria mandates:
     1. Invocation of `navigator.geolocation.getCurrentPosition` inside the gallery upload handler.
     2. Inclusion of `latitude` and `longitude` in the backend insert/request payload.

3. **R6 (Pengaturan Fitur Per-Sekolah)**:
   - `src/components/SuperadminView.tsx` contains the "Edit Data Sekolah" modal (`handleEditSchool`, lines 272–378) using SweetAlert2.
   - Table `public.sekolah` does not yet contain a column for journal configuration mode (`mode_jurnal`).
   - `GuruJurnal.tsx` does not currently read school configuration to toggle camera vs upload features.
   - Acceptance Criteria mandates:
     1. Edit Sekolah form must include an input for Journal mode (`Live Camera Langsung` vs `Live Camera + Upload Foto`).
     2. Guru Jurnal page reads the logged-in teacher's school configuration and renders the file upload input **only if** the configuration allows it.

---

## 2. Deep Dive: R3 — Izin Datang Terlambat (Guru)

### 2.1 Current Architecture & Code Review
- **File**: `src/components/GuruPresensi.tsx`
- **Lines 510–516**:
  ```tsx
  <option value="Sekolah">Hadir Sekolah</option>
  <option value="Dinas Luar">Dinas Luar</option>
  <option value="Terlambat">Izin Datang Terlambat</option>
  <option value="Izin">Izin / Sakit</option>
  ```
- **Line 322–324**:
  ```tsx
  const statusVerif = jenisPresensi === 'Terlambat'
    ? 'Menunggu'
    : (jenisPresensi === 'Sekolah' && (jarakAktual === null || jarakAktual <= gpsConfig.radius) ? 'Diverifikasi' : 'Menunggu');
  ```
- **Line 221**:
  ```tsx
  const isSelfieRequired = tipeAbsen === 'Pulang' || (tipeAbsen === 'Datang' && jenisPresensi !== 'Izin') || jenisPresensi === 'Dinas Luar';
  ```
- **Line 297–301**:
  ```tsx
  if (currTimeVal > batasVal && jenisPresensi === 'Sekolah') {
    const currTotalSeconds = currH * 3600 + currM * 60 + currS;
    const batasTotalSeconds = batasVal * 60;
    keterlambatanDetik = Math.max(0, currTotalSeconds - batasTotalSeconds);
  }
  ```
- **Line 349**:
  ```tsx
  const { error } = await supabase.from('presensi_guru').insert([newPresensi]);
  ```

### 2.2 Gaps Against Acceptance Criteria
1. **Value Mismatch**: The HTML select currently uses `value="Terlambat"`. The Acceptance Criteria specifies:
   `Tombol/opsi absensi memiliki pilihan bernilai "Izin Terlambat"`.
   The option value must be `"Izin Terlambat"` (or support both `"Izin Terlambat"` and `"Terlambat"` for backward compatibility).
2. **Missing Backend Endpoint**: The Acceptance Criteria specifies:
   `Backend endpoint presensi dapat menerima dan menyimpan status "Izin Terlambat"`.
   In `src/app/api/attendance/`, only `auto-alpa/route.ts` exists. Client components currently talk directly to Supabase via `@/lib/supabaseClient`. A Next.js API route `POST /api/attendance` must be implemented to accept presensi payloads and store them in `presensi_guru`.

### 2.3 Proposed Implementation for R3
1. **Update `src/components/GuruPresensi.tsx`**:
   - Change line 513:
     ```tsx
     <option value="Izin Terlambat">Izin Terlambat</option>
     ```
   - Update conditions to support `"Izin Terlambat"` and `"Terlambat"`:
     - `const isTerlambat = jenisPresensi === 'Izin Terlambat' || jenisPresensi === 'Terlambat';`
     - Status verifikasi: `isTerlambat ? 'Menunggu' : ...`
     - Late calculation: `if (currTimeVal > batasVal && (jenisPresensi === 'Sekolah' || isTerlambat))`
     - Presensi submission: `jenis_presensi: jenisPresensi`
2. **Create Route Handler `src/app/api/attendance/route.ts`**:
   - Accepts `POST` requests with JSON body:
     ```ts
     {
       user_id: string,
       nama_guru: string,
       tipe_absen: "Datang" | "Pulang",
       jenis_presensi: "Izin Terlambat",
       detail_izin?: string,
       lokasi?: string,
       jarak?: string,
       link_bukti?: string,
       status_verifikasi?: string,
       keterlambatan_detik?: number,
       sekolah_id?: string
     }
     ```
   - Validates and inserts the record into Supabase `presensi_guru`.
   - Returns `{ success: true, data: record }`.
3. **Verify Workflow Handling**:
   - In `src/lib/workflow.ts`, ensure `jenis_presensi === 'Izin Terlambat'` is treated as a regular attendance arrival (teacher is present to teach, so `isIzinSakit` remains `false`).
   - In `src/components/HomeView.tsx`, ensure badge display and statistics correctly reflect `Izin Terlambat`.

---

## 3. Deep Dive: R4 — Upload Foto Jurnal Pembelajaran & Geolocation (GPS)

### 3.1 Current Architecture & Code Review
- **File**: `src/components/GuruJurnal.tsx`
- **Lines 213–221**:
  ```tsx
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setJurnalCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);
  ```
- **Lines 960–980**:
  Renders only `CameraSelfieCapture` for taking photo documentation.
- **Lines 441–467**:
  `newJurnal` payload includes:
  `id, timestamp, nama_guru, user_id, mapel, kelas, tanggal, materi, kegiatan, absensi_siswa, keterangan, refleksi, detail_absen, link_bukti_foto, status_verifikasi, catatan_khusus_siswa, pertemuan_ke, jam_ke, tujuan_pembelajaran, materi_pembelajaran, kehadiran_murid, catatan_refleksi, foto_kegiatan, sekolah_id`.
  Does NOT contain `latitude` or `longitude`.

### 3.2 Database Schema Inspection: `public.jurnal_pembelajaran`
From Supabase metadata query:
- Existing columns: 26 columns.
- `latitude`, `longitude`, `lokasi`, `waktu_upload`: **NOT PRESENT**.
- If PostgREST receives `latitude` and `longitude` without them being in PostgreSQL schema, the request will fail with HTTP 400 (`PGRST204: column not found`).
- Therefore, a PostgreSQL migration must add these columns:
  ```sql
  ALTER TABLE public.jurnal_pembelajaran
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS lokasi TEXT,
    ADD COLUMN IF NOT EXISTS waktu_upload TEXT;
  ```

### 3.3 Gaps Against Acceptance Criteria
1. **Missing GPS Capture in Gallery Upload Handler**:
   Acceptance Criteria: `Terdapat penggunaan API navigator.geolocation.getCurrentPosition pada fungsi upload jurnal via galeri.`
   Must have a dedicated function for file/gallery selection that calls `navigator.geolocation.getCurrentPosition`.
2. **Payload Missing Coordinates**:
   Acceptance Criteria: `Payload request ke backend menyertakan latitude dan longitude.`
   `newJurnal` inserted into Supabase must include `latitude` and `longitude`.
3. **UI Display**:
   Uploaded photo location and upload timestamp must be saved and displayed in the UI (e.g. `AdminVerifView` and `RekapJurnalView`).

### 3.4 Proposed Implementation for R4
1. **State in `GuruJurnal.tsx`**:
   ```tsx
   const [uploadMode, setUploadMode] = useState<'camera' | 'gallery'>('camera');
   const [uploadLatitude, setUploadLatitude] = useState<number | null>(null);
   const [uploadLongitude, setUploadLongitude] = useState<number | null>(null);
   const [uploadLokasi, setUploadLokasi] = useState<string | null>(null);
   const [uploadWaktu, setUploadWaktu] = useState<string | null>(null);
   ```
2. **Gallery Upload Handler with Geolocation**:
   ```tsx
   const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFile = e.target.files?.[0];
     if (!selectedFile) return;

     const nowWita = getWitaTimestamp();
     setUploadWaktu(nowWita);

     // Trigger GPS Geolocation on gallery upload
     if (typeof navigator !== 'undefined' && navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (position) => {
           const lat = position.coords.latitude;
           const lng = position.coords.longitude;
           setUploadLatitude(lat);
           setUploadLongitude(lng);
           setUploadLokasi(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
         },
         (error) => {
           console.warn('Geolocation capture failed on gallery upload:', error);
           setUploadLokasi('Lokasi tidak terdeteksi');
         },
         { enableHighAccuracy: true, timeout: 10000 }
       );
     }

     setFile(selectedFile);
     setPhotoPreviewUrl(URL.createObjectURL(selectedFile));
   };
   ```
3. **Payload in `handleJurnalSubmit`**:
   ```tsx
   const newJurnal = {
     ...
     latitude: uploadLatitude ?? (jurnalCoords?.latitude || null),
     longitude: uploadLongitude ?? (jurnalCoords?.longitude || null),
     lokasi: uploadLokasi || (jurnalCoords ? `GPS: ${jurnalCoords.latitude.toFixed(5)}, ${jurnalCoords.longitude.toFixed(5)}` : '-'),
     waktu_upload: uploadWaktu || getWitaTimestamp(),
     ...
   };
   ```
4. **UI Display in `AdminVerifView.tsx` & `RekapJurnalView.tsx`**:
   Render location badge and upload time next to `item.link_bukti_foto`:
   ```tsx
   {(item.lokasi || (item.latitude && item.longitude)) && (
     <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
       <i className="fa-solid fa-location-dot text-red-500"></i>
       <span>{item.lokasi || `${item.latitude?.toFixed(5)}, ${item.longitude?.toFixed(5)}`}</span>
       {item.waktu_upload && <span>• {item.waktu_upload}</span>}
     </div>
   )}
   ```

---

## 4. Deep Dive: R6 — Pengaturan Fitur Per-Sekolah (Superadmin)

### 4.1 Current Architecture & Code Review
- **File**: `src/components/SuperadminView.tsx`
- **School Management**:
  - `sekolahList` fetched from `supabase.from('sekolah').select('*')` (lines 63–72).
  - Edit School function: `handleEditSchool(school: Sekolah)` (lines 272–378).
  - Uses SweetAlert2 (`Swal.fire`) with form fields:
    `swal-edit-nama`, `swal-edit-npsn`, `swal-edit-alamat`, `swal-edit-kota`, `swal-edit-provinsi`, `swal-edit-kepsek`, `swal-edit-nip`, `swal-edit-logo`, `swal-edit-status`.
- **Database Schema: `public.sekolah`**:
  - Existing columns: `id, nama, npsn, alamat, kota_kabupaten, provinsi, telepon, email, website, logo_url, logo_kiri_url, logo_kanan_url, nama_kepala_sekolah, nip_kepala_sekolah, status, created_at, updated_at`.
  - Column `mode_jurnal` does NOT exist yet.

### 4.2 Gaps Against Acceptance Criteria
1. **Form Edit Sekolah Missing Journal Mode Input**:
   Acceptance Criteria: `UI form Edit Sekolah memiliki input untuk mode Jurnal (Live Camera / Camera + Upload).`
   Needs a select or radio input in the Edit Sekolah modal with values:
   - `'camera_only'`: "Live Camera Langsung"
   - `'camera_upload'`: "Live Camera + Upload Foto"
2. **Guru Jurnal Conditional Rendering**:
   Acceptance Criteria: `Halaman Jurnal membaca konfigurasi sekolah pengguna yang sedang login dan merender input file upload HANYA JIKA konfigurasinya mengizinkan.`
   If `mode_jurnal === 'camera_only'`, the gallery upload input `<input type="file">` must **NOT** be rendered in the DOM.

### 4.3 Proposed Implementation for R6
1. **Database Migration**:
   ```sql
   ALTER TABLE public.sekolah 
     ADD COLUMN IF NOT EXISTS mode_jurnal TEXT DEFAULT 'camera_upload';
   ```
2. **Update `src/components/SuperadminView.tsx`**:
   - In `handleEditSchool`:
     Add input to Swal HTML template:
     ```html
     <div>
       <label class="font-bold text-gray-700 block mb-1">Mode Jurnal Pembelajaran</label>
       <select id="swal-edit-mode-jurnal" class="swal2-select !mt-0 !w-full text-xs">
         <option value="camera_only" ${school.mode_jurnal === 'camera_only' ? 'selected' : ''}>Live Camera Langsung</option>
         <option value="camera_upload" ${school.mode_jurnal === 'camera_upload' || !school.mode_jurnal ? 'selected' : ''}>Live Camera + Upload Foto</option>
       </select>
     </div>
     ```
   - In `preConfirm`:
     ```ts
     const mode_jurnal = (document.getElementById('swal-edit-mode-jurnal') as HTMLSelectElement)?.value || 'camera_upload';
     return {
       ...
       mode_jurnal,
       updated_at: new Date().toISOString()
     };
     ```
   - Also add `swal-input-mode-jurnal` in `handleOpenAddSchoolModal`.
3. **Update `src/components/GuruJurnal.tsx`**:
   - Fetch school configuration on mount:
     ```tsx
     const [schoolModeJurnal, setSchoolModeJurnal] = useState<string>('camera_upload');

     useEffect(() => {
       const fetchSchoolConfig = async () => {
         if (!user?.sekolah_id) return;
         const { data } = await supabase
           .from('sekolah')
           .select('mode_jurnal')
           .eq('id', user.sekolah_id)
           .single();
         if (data?.mode_jurnal) {
           setSchoolModeJurnal(data.mode_jurnal);
         }
       };
       fetchSchoolConfig();
     }, [user?.sekolah_id]);
     ```
   - Determine allowance:
     ```tsx
     const isUploadAllowed = schoolModeJurnal !== 'camera_only';
     ```
   - In JSX:
     If `isUploadAllowed`, show option/buttons to switch between Camera and Gallery Upload.
     Render the `<input type="file" ... onChange={handleGalleryUpload} />` **strictly and only if** `isUploadAllowed && uploadMode === 'gallery'`.

---

## 5. Comprehensive Step-by-Step Implementation Plan

### Step 1: Database DDL Migration
Apply migration script (e.g. `supabase/migrations/20261001_jurnal_upload_gps_and_school_config.sql`):
```sql
-- 1. Add mode_jurnal to public.sekolah
ALTER TABLE public.sekolah 
  ADD COLUMN IF NOT EXISTS mode_jurnal TEXT DEFAULT 'camera_upload';

-- 2. Add GPS and upload metadata columns to public.jurnal_pembelajaran
ALTER TABLE public.jurnal_pembelajaran 
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lokasi TEXT,
  ADD COLUMN IF NOT EXISTS waktu_upload TEXT;

-- 3. Ensure permissions
GRANT ALL ON public.sekolah TO anon, authenticated, service_role;
GRANT ALL ON public.jurnal_pembelajaran TO anon, authenticated, service_role;
```

### Step 2: Update TypeScript Types
In `src/types/database.ts`:
- Extend `sekolah` entity with `mode_jurnal?: string | null`.
- Extend `jurnal_pembelajaran` entity with `latitude?: number | null`, `longitude?: number | null`, `lokasi?: string | null`, `waktu_upload?: string | null`.

### Step 3: Superadmin "Edit Sekolah" Mode Jurnal (R6)
In `src/components/SuperadminView.tsx`:
- Add dropdown for `mode_jurnal` in `handleEditSchool` and `handleOpenAddSchoolModal`.
- Update state when school is modified.

### Step 4: GuruJurnal Geolocation & Conditional Upload (R4 + R6)
In `src/components/GuruJurnal.tsx`:
- Fetch school `mode_jurnal`.
- Conditionally render gallery file input when `mode_jurnal !== 'camera_only'`.
- Hook `navigator.geolocation.getCurrentPosition` directly into gallery file selection.
- Send `latitude`, `longitude`, `lokasi`, `waktu_upload` in payload to `jurnal_pembelajaran`.

### Step 5: GuruPresensi "Izin Terlambat" & Backend API (R3)
In `src/components/GuruPresensi.tsx`:
- Update dropdown option to `<option value="Izin Terlambat">Izin Terlambat</option>`.
- Support `"Izin Terlambat"` in late time calculation, verifikasi status, and submission.
- Create Route Handler `src/app/api/attendance/route.ts` with `POST` handler for saving attendance.

### Step 6: Journal Review UI Enhancements
In `src/components/AdminVerifView.tsx` & `src/components/RekapJurnalView.tsx`:
- Render coordinates and upload timestamp when present.

### Step 7: Automated Verification Test Suite
Create `tests/survey3_features_verification.test.ts` to test:
1. `GuruPresensi.tsx` contains option with `value="Izin Terlambat"`.
2. `/api/attendance` exists and handles `Izin Terlambat`.
3. `GuruJurnal.tsx` contains `navigator.geolocation.getCurrentPosition` inside gallery upload.
4. `GuruJurnal.tsx` sends `latitude` and `longitude` in insert payload.
5. `SuperadminView.tsx` form contains mode Jurnal input.
6. `GuruJurnal.tsx` conditionally renders upload input based on school configuration.

---

## 6. Risk Analysis & Regression Prevention

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| Missing database columns causing PostgREST 400 error | High | Execute migration before testing inserts; ensure schema cache reload. |
| Browser geolocation denied by user or device | Low | Fallback gracefully with error handler; record `lokasi: 'Izin Lokasi Ditolak'` while preserving file upload. |
| Existing attendance records with old `"Terlambat"` value | Medium | Support both `"Terlambat"` and `"Izin Terlambat"` in read queries and workflow calculations. |
| Teacher assigned to multiple schools or undefined `sekolah_id` | Low | Default `mode_jurnal` to `'camera_upload'` if `sekolah_id` is missing or school not found. |

---

## 7. Conclusion

All requirements for R3, R4, and R6 have been thoroughly analyzed. The codebase is fully prepared for implementation, requiring minimal lines of code following Ponytail principles. No new npm dependencies are needed.
