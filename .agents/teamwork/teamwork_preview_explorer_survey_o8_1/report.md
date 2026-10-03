# Survey Report: Camera Orientation (R1) & DB Migration (R4)

**Explorer**: Explorer 1 (Survey for R1 Camera Orientation & R4 DB Migration)  
**Date**: 2026-10-03  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_1`  
**Target Scope**: R1 (Camera Orientation per Feature) & R4 (Supabase Database Migration for `jurnal_pembelajaran`)

---

## Executive Summary

1. **Camera Component (`CameraSelfieCapture.tsx`)**:
   - Already implements both `orientation` (`'portrait' | 'landscape'`) and `initialFacingMode` (`'user' | 'environment'`).
   - Dynamic constraints adjust resolution based on `orientation`:
     - Portrait: `{ ideal: 720, max: 1080 }` x `{ ideal: 1280, max: 1920 }`, container `aspect-[3/4] max-w-sm mx-auto`.
     - Landscape: `{ ideal: 1280, max: 1920 }` x `{ ideal: 720, max: 1080 }`, container `aspect-video`.
   - Watermark canvas drawing (`drawWatermarkedCanvas`) conforms to 3:4 portrait or 16:9 landscape.
   - Component is complete and does not require modifications.

2. **Feature Camera Orientation Audit**:
   - `src/components/GuruPresensi.tsx`: Currently passes `orientation="portrait"`, but omits `initialFacingMode` (defaults to `'user'`). Explicitly adding `initialFacingMode="user"` will ensure 100% adherence to R1 requirements.
   - `src/components/GuruJurnal.tsx`: Already passes `orientation="landscape"` and `initialFacingMode="environment"`.
   - `src/components/PiketView.tsx`: Already passes `orientation="landscape"` and `initialFacingMode="environment"`.

3. **Rekap Jurnal Photo Thumbnail Rendering (`src/components/RekapJurnalView.tsx`)**:
   - Both `tabMode === 'kelas'` (line 593) and `tabMode === 'pribadi'` (line 729) render photos using `w-14 h-14 object-cover` on screen (a square 1:1 aspect ratio), which crops horizontal landscape photos taken in Jurnal and Piket.
   - Print CSS uses `print:w-full print:h-auto`.
   - To satisfy R1 & R3, the screen/preview styling should be updated to a landscape ratio: `w-24 h-14 aspect-video object-cover` or `aspect-video w-full max-w-[120px] object-cover mx-auto`.

4. **Supabase Database Schema & Migration Status**:
   - Project ID / Reference: `jicvvqxjyzntdrccnuyz` (from `.env.local` `NEXT_PUBLIC_SUPABASE_URL=https://jicvvqxjyzntdrccnuyz.supabase.co`).
   - Live database inspection of `jurnal_pembelajaran` table via MCP `execute_sql` confirmed:
     - Columns `kktp`, `konten`, `lokasi_kbm` **DO NOT EXIST**.
     - Table currently contains 30 columns.
   - Migration is **REQUIRED**:
     ```sql
     ALTER TABLE jurnal_pembelajaran 
       ADD COLUMN IF NOT EXISTS kktp TEXT,
       ADD COLUMN IF NOT EXISTS konten TEXT,
       ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;
     ```
   - TypeScript definitions in `src/types/database.ts` also need updating for `jurnal_pembelajaran` (`Row`, `Insert`, `Update`).

---

## Detailed Findings

### 1. `src/components/CameraSelfieCapture.tsx`

| Feature / Property | Current State | Code Location | Assessment |
|--------------------|---------------|---------------|------------|
| `orientation` prop | `'portrait' \| 'landscape'` (default `'landscape'`) | Lines 14, 24 | Complete |
| `initialFacingMode` prop | `'user' \| 'environment'` (default `'user'`) | Lines 13, 23 | Complete |
| Video Constraints | Width/height switched based on `isPortrait` | Lines 139-148 | Complete |
| Preview Container Ratio | `portrait`: `aspect-[3/4] max-w-sm mx-auto`<br>`landscape`: `aspect-video` | Lines 319-321 | Complete |
| Watermark Canvas Ratio | `drawWatermarkedCanvas(..., orientation)` enforces 3:4 portrait or 16:9 landscape | Lines 249; `watermarkCanvas.ts:146-185` | Complete |
| Dynamic Stream Re-negotiation | `useEffect` triggers `startCamera` if `orientation` prop changes | Lines 212-219 | Complete |

### 2. Camera Orientation in Feature Components

| Component | Prop `orientation` | Prop `initialFacingMode` | Location | Recommended Action |
|-----------|--------------------|--------------------------|----------|-------------------|
| `GuruPresensi.tsx` | `"portrait"` | *Not specified* (defaults to `'user'`) | Lines 695-704 | Explicitly add `initialFacingMode="user"` |
| `GuruJurnal.tsx` | `"landscape"` | `"environment"` | Lines 1084-1101 | None (already optimal) |
| `PiketView.tsx` | `"landscape"` | `"environment"` | Lines 1238-1247 | None (already optimal) |

### 3. Photo Thumbnail Rendering in `RekapJurnalView.tsx`

- **Current Implementation**:
  - `tabMode === 'kelas'`:
    ```tsx
    <img
      src={getGoogleDriveThumbnailUrl(fotoUrl, 800) || transformGoogleDriveUrl(fotoUrl)}
      alt="Foto Kegiatan"
      className="w-14 h-14 object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:h-auto print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
    />
    ```
  - `tabMode === 'pribadi'`:
    ```tsx
    <img
      src={getGoogleDriveThumbnailUrl(fotoUrl, 800) || transformGoogleDriveUrl(fotoUrl)}
      alt="Foto Kegiatan"
      className="w-14 h-14 object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:h-auto print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
    />
    ```
- **Analysis**:
  - `w-14 h-14` is 3.5rem x 3.5rem (56px x 56px), which is 1:1 square.
  - Since photos in Jurnal and Piket are captured in landscape (16:9), `object-cover` in a 1:1 square container crops the left and right sides substantially.
  - In `tabMode === 'pribadi'`, R3 requires 10 columns where column 9 is "Foto Dokumentasi" in landscape ratio (`aspect-video`).
  - Recommended class replacement:
    `w-24 h-14 aspect-video object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:h-auto print:aspect-video print:rounded-none print:border-none print:bg-transparent print:m-0 print:block`

### 4. Supabase Database Migration (`jurnal_pembelajaran`)

- **Connection Details**:
  - URL: `https://jicvvqxjyzntdrccnuyz.supabase.co`
  - Project ID: `jicvvqxjyzntdrccnuyz`
  - Anon Key: Found in `.env.local`
  - Client setup: `src/lib/supabaseClient.ts` uses multi-tenant header wrappers.

- **Information Schema Inspection Result**:
  Query:
  ```sql
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'jurnal_pembelajaran' 
  ORDER BY ordinal_position;
  ```
  Result columns (30):
  1. `id` (text, not null)
  2. `timestamp` (text, nullable)
  3. `nama_guru` (text, nullable)
  4. `mapel` (text, nullable)
  5. `kelas` (text, nullable)
  6. `tanggal` (text, nullable)
  7. `materi` (text, nullable)
  8. `kegiatan` (text, nullable)
  9. `absensi_siswa` (text, nullable)
  10. `keterangan` (text, nullable)
  11. `refleksi` (text, nullable)
  12. `detail_absen` (text, nullable)
  13. `link_bukti_foto` (text, nullable)
  14. `status_verifikasi` (text, nullable)
  15. `catatan_khusus_siswa` (text, nullable)
  16. `pertemuan_ke` (text, nullable)
  17. `jam_ke` (text, nullable)
  18. `tujuan_pembelajaran` (text, nullable)
  19. `materi_pembelajaran` (text, nullable)
  20. `kehadiran_murid` (text, nullable)
  21. `catatan_refleksi` (text, nullable)
  22. `foto_kegiatan` (text, nullable)
  23. `sekolah_id` (uuid, not null)
  24. `catatan_admin` (text, nullable)
  25. `alasan_penolakan` (text, nullable)
  26. `user_id` (uuid, nullable)
  27. `latitude` (double precision, nullable)
  28. `longitude` (double precision, nullable)
  29. `lokasi` (text, nullable)
  30. `waktu_upload` (text, nullable)

- **Verification of Target Columns**:
  - `kktp`: **Missing**
  - `konten`: **Missing**
  - `lokasi_kbm`: **Missing** (Note: `lokasi` exists from GPS upload, but R2/R4 specifies `lokasi_kbm` for school room/location like "Ruang Kelas 7A").

- **Migration Implementation Plan**:
  1. Migration file: Create `supabase/migrations/20261003_add_kktp_konten_lokasi_kbm.sql`:
     ```sql
     -- Migration: 20261003_add_kktp_konten_lokasi_kbm
     -- Add new columns for restructured Jurnal KBM form and print rekap
     ALTER TABLE public.jurnal_pembelajaran 
       ADD COLUMN IF NOT EXISTS kktp TEXT,
       ADD COLUMN IF NOT EXISTS konten TEXT,
       ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;
     ```
  2. Execute via Supabase MCP `apply_migration`:
     - Tool: `supabase` -> `apply_migration`
     - `project_id`: `"jicvvqxjyzntdrccnuyz"`
     - `name`: `"add_kktp_konten_lokasi_kbm"`
     - `query`:
       `ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS kktp TEXT, ADD COLUMN IF NOT EXISTS konten TEXT, ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;`
  3. Update `src/types/database.ts`:
     Add optional properties to `jurnal_pembelajaran` Row, Insert, and Update types:
     - `kktp: string | null`
     - `konten: string | null`
     - `lokasi_kbm: string | null`

---

## Actionable Recommendations for Implementation Phase

1. **R1: Camera & Thumbnails**:
   - In `src/components/GuruPresensi.tsx`: add `initialFacingMode="user"` to `<CameraSelfieCapture>`.
   - In `src/components/RekapJurnalView.tsx`: update thumbnail classes to `aspect-video` landscape ratio (e.g., `w-24 h-14 aspect-video object-cover` on screen, `print:w-full print:h-auto print:aspect-video`).

2. **R4: Database Migration**:
   - Apply migration via Supabase MCP `apply_migration`.
   - Commit SQL file `supabase/migrations/20261003_add_kktp_konten_lokasi_kbm.sql`.
   - Update `src/types/database.ts`.

3. **Coordination with R2 & R3**:
   - In `GuruJurnal.tsx`: form submission payload `newJurnal` should include:
     ```ts
     kktp: kktp.trim(),
     konten: konten.trim(),
     lokasi_kbm: lokasiKbm.trim(),
     ```
   - In `RekapJurnalView.tsx`: table `tabMode === 'pribadi'` should render the 10 columns using fallbacks:
     - `j.konten || j.materi_pembelajaran || j.materi || '-'`
     - `j.kktp || '-'`
     - `j.lokasi_kbm || j.lokasi || '-'`
     - `j.catatan_refleksi || j.refleksi || '-'`
