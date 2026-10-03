# Handoff Report: Camera Orientation (R1) & DB Migration (R4) Survey

**Agent**: Explorer 1 (Survey for R1 Camera Orientation & R4 DB Migration)  
**Date**: 2026-10-03T07:19:00Z  
**Type**: Hard Handoff  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_1`

---

## 1. Observation

### 1.1 `src/components/CameraSelfieCapture.tsx`
- **Line 7-15**: Props interface:
  ```typescript
  export interface CameraSelfieCaptureProps {
    onPhotoConfirmed: (file: File, previewUrl: string) => void;
    onCancel?: () => void;
    initialCoordinates?: WatermarkCoordinates | null;
    initialLocationName?: string | null;
    existingPhotoUrl?: string | null;
    initialFacingMode?: 'user' | 'environment';
    orientation?: 'portrait' | 'landscape';
  }
  ```
- **Line 23-24**: Default props: `initialFacingMode = 'user'`, `orientation = 'landscape'`.
- **Line 139-148**: Video stream constraints switch width and height based on `orientation === 'portrait'`:
  - Portrait: `width: { ideal: 720, max: 1080 }`, `height: { ideal: 1280, max: 1920 }`
  - Landscape: `width: { ideal: 1280, max: 1920 }`, `height: { ideal: 720, max: 1080 }`
- **Line 319-321**: Container CSS aspect ratio:
  ```tsx
  <div className={`relative w-full ${
    orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-video'
  } rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-300 dark:border-slate-700`}>
  ```
- **Line 249 & `src/lib/watermarkCanvas.ts:146-185`**: Watermark canvas snapshot conforms to 3:4 portrait or 16:9 landscape.

### 1.2 `src/components/GuruPresensi.tsx`
- **Line 695-704**: Camera invocation:
  ```tsx
  <CameraSelfieCapture
    key="camera-selfie"
    orientation="portrait"
    initialCoordinates={userCoords}
    existingPhotoUrl={photoPreviewUrl}
    onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
      setFile(capturedFile);
      setPhotoPreviewUrl(previewUrl);
    }}
  />
  ```
  - `orientation="portrait"` is passed.
  - `initialFacingMode` is not explicitly passed (relies on default `'user'`).

### 1.3 `src/components/PiketView.tsx` & `src/components/GuruJurnal.tsx`
- **`src/components/PiketView.tsx` Line 1238-1247**:
  ```tsx
  <CameraSelfieCapture
    key="cam-piket"
    orientation="landscape"
    initialFacingMode="environment"
    existingPhotoUrl={photoPreviewUrl}
    onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
      setFile(capturedFile);
      setPhotoPreviewUrl(previewUrl);
    }}
  />
  ```
  Both `orientation="landscape"` and `initialFacingMode="environment"` are passed.
- **`src/components/GuruJurnal.tsx` Line 1084-1101**:
  ```tsx
  <CameraSelfieCapture
    key={`cam-jurnal-${tipeJurnal}`}
    orientation="landscape"
    initialFacingMode="environment"
    initialCoordinates={jurnalCoords}
    existingPhotoUrl={photoPreviewUrl}
    onPhotoConfirmed={(capturedFile: File, previewUrl: string) => { ... }}
  />
  ```
  Both `orientation="landscape"` and `initialFacingMode="environment"` are passed.

### 1.4 `src/components/RekapJurnalView.tsx`
- **Line 593 (`tabMode === 'kelas'`)** & **Line 729 (`tabMode === 'pribadi'`)**:
  ```tsx
  className="w-14 h-14 object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:h-auto print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
  ```
  - `w-14 h-14` is 56px x 56px (1:1 aspect ratio square).
  - Landscape photos (16:9) are cropped into 1:1 square on screen.
  - For `tabMode === 'pribadi'`, R3 requires 10 columns with landscape aspect-ratio photo rendering (`aspect-video`).

### 1.5 Supabase Database Schema Inspection
- **Connection Details**:
  - `.env.local` Line 1: `NEXT_PUBLIC_SUPABASE_URL=https://jicvvqxjyzntdrccnuyz.supabase.co`
  - Supabase Project ID: `jicvvqxjyzntdrccnuyz`
- **SQL Inspection executed via Supabase MCP tool (`execute_sql`)**:
  ```sql
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'jurnal_pembelajaran' 
  ORDER BY ordinal_position;
  ```
- **Live Output**:
  Columns currently in `jurnal_pembelajaran`:
  `id`, `timestamp`, `nama_guru`, `mapel`, `kelas`, `tanggal`, `materi`, `kegiatan`, `absensi_siswa`, `keterangan`, `refleksi`, `detail_absen`, `link_bukti_foto`, `status_verifikasi`, `catatan_khusus_siswa`, `pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `materi_pembelajaran`, `kehadiran_murid`, `catatan_refleksi`, `foto_kegiatan`, `sekolah_id`, `catatan_admin`, `alasan_penolakan`, `user_id`, `latitude`, `longitude`, `lokasi`, `waktu_upload`.
  - Column `kktp`: **DOES NOT EXIST**
  - Column `konten`: **DOES NOT EXIST**
  - Column `lokasi_kbm`: **DOES NOT EXIST**

---

## 2. Logic Chain

1. **Step 1**: From Observation 1.1, `CameraSelfieCapture.tsx` already has complete support for `orientation="portrait" | "landscape"` and `initialFacingMode="user" | "environment"`, including responsive CSS aspect-ratios (`aspect-[3/4]` vs `aspect-video`), MediaStream resolution constraints, and canvas watermark dimension calculation. Therefore, no modifications are needed within `CameraSelfieCapture.tsx`.
2. **Step 2**: From Observation 1.2 and 1.3, `GuruPresensi.tsx` already passes `orientation="portrait"`, but omits `initialFacingMode="user"`. `PiketView.tsx` and `GuruJurnal.tsx` already pass both `orientation="landscape"` and `initialFacingMode="environment"`. Therefore, only `GuruPresensi.tsx` requires adding `initialFacingMode="user"` to explicitly meet R1 acceptance criteria.
3. **Step 3**: From Observation 1.4, `RekapJurnalView.tsx` currently forces a square 1:1 container (`w-14 h-14`) for photos in both class and personal journal modes. In `tabMode === 'pribadi'`, R1 and R3 require photo thumbnails to display in landscape ratio (`aspect-video`). Replacing `w-14 h-14` with `w-24 h-14 aspect-video object-cover` on screen and ensuring `print:aspect-video` solves the thumbnail cropping and satisfies the requirement.
4. **Step 4**: From Observation 1.5, direct query on `information_schema.columns` for `jurnal_pembelajaran` in the live Supabase project `jicvvqxjyzntdrccnuyz` confirms that `kktp`, `konten`, and `lokasi_kbm` do not exist. Therefore, database migration R4 is mandatory before implementing form submission (R2) and document printing (R3).
5. **Step 5**: Because all existing queries in the application query `jurnal_pembelajaran` via `.select('*')` (Observation in `GuruJurnal.tsx`, `HistoryView.tsx`, `RekapJurnalView.tsx`), adding these three nullable `TEXT` columns will be non-breaking and immediately backward-compatible.

---

## 3. Caveats

- **Network / Tool Permission**: As an Explorer agent operating in read-only investigation mode, no DDL modifications (`apply_migration`) or file edits have been executed in this turn. The migration and code edits must be executed by the designated Implementer agent or orchestrator.
- **Existing `lokasi` vs New `lokasi_kbm`**: The table already has a column named `lokasi` (added in a prior feature for GPS coordinates/place string, e.g., `"GPS: -6.123, 106.123"`). The new requirement R2/R4 specifies `lokasi_kbm` for user input (e.g., `"Ruang Kelas 7A"`, `"Lab IPA"`). Both columns will coexist; `RekapJurnalView` should fallback: `j.lokasi_kbm || j.lokasi || '-'`.

---

## 4. Conclusion

- **R1 Camera Status**:
  - `CameraSelfieCapture.tsx`: Ready as-is.
  - `GuruPresensi.tsx`: Update line 697 to add `initialFacingMode="user"`.
  - `GuruJurnal.tsx`: Already has `orientation="landscape"` and `initialFacingMode="environment"`.
  - `PiketView.tsx`: Already has `orientation="landscape"` and `initialFacingMode="environment"`.
  - `RekapJurnalView.tsx`: Update image thumbnail classes from `w-14 h-14` to `w-24 h-14 aspect-video object-cover` (and `print:aspect-video`).
- **R4 Database Migration Status**:
  - Supabase Project ID: `jicvvqxjyzntdrccnuyz`.
  - Required migration:
    ```sql
    ALTER TABLE public.jurnal_pembelajaran 
      ADD COLUMN IF NOT EXISTS kktp TEXT,
      ADD COLUMN IF NOT EXISTS konten TEXT,
      ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;
    ```
  - MCP command: `supabase.apply_migration(project_id="jicvvqxjyzntdrccnuyz", name="add_kktp_konten_lokasi_kbm", query=...)`.
  - File to create: `supabase/migrations/20261003_add_kktp_konten_lokasi_kbm.sql`.
  - TypeScript update: `src/types/database.ts` lines 508-585.

---

## 5. Verification Method

1. **Verify Database Columns**:
   Run Supabase MCP tool `execute_sql` with:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'jurnal_pembelajaran' AND column_name IN ('kktp', 'konten', 'lokasi_kbm');
   ```
   Before migration: returns 0 rows.  
   After migration: returns 3 rows (`kktp`, `konten`, `lokasi_kbm`, all `data_type = 'text'`).

2. **Verify Camera Props**:
   Inspect:
   - `src/components/GuruPresensi.tsx`: check `<CameraSelfieCapture orientation="portrait" initialFacingMode="user" ... />`.
   - `src/components/GuruJurnal.tsx`: check `<CameraSelfieCapture orientation="landscape" initialFacingMode="environment" ... />`.
   - `src/components/PiketView.tsx`: check `<CameraSelfieCapture orientation="landscape" initialFacingMode="environment" ... />`.

3. **Verify Rekap Photo Aspect Ratio**:
   Inspect `src/components/RekapJurnalView.tsx` line 729 for `aspect-video` class in both preview and print CSS.

4. **Verify TypeScript Build**:
   Run `npm run build` or `npx tsc --noEmit` to verify type integrity after updating `src/types/database.ts`.
