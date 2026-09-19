# Comprehensive Survey Report: R3 & R4
**Explorer**: explorer_m10_survey_r3r4  
**Date**: 2026-09-19  
**Target Milestone**: Milestone 10  
**Scope**: 
- **R3**: Teacher Dashboard Layout, Camera Geolocation & Reverse Geocoding (OSM Nominatim), Student Attendance Percentage Calculation
- **R4**: PWA Install Prompt, Admin Rejection Feedback Flow & Database Schema

---

## Executive Summary
This survey establishes a complete, rigorous technical investigation into the SIPJAM application across requirements **R3** and **R4**. 

Key discoveries:
1. **Teacher Dashboard**: `src/components/HomeView.tsx` currently renders 6 distinct sections for teachers (`isGuru`). It must be pruned and strictly ordered into exactly three sections: (1) Personal Data Statistics, (2) Today's Task Status, and (3) Teaching Schedule. Extraneous sections—"Target Jurnal Hari Ini" (standalone ratio), "Persentase Kehadiran Siswa per Mata Pelajaran", and "Kelengkapan Perangkat Pembelajaran"—must be removed or streamlined.
2. **Camera Geolocation & Nominatim**: Camera capture is centralized in `src/components/CameraSelfieCapture.tsx` and watermarking is handled client-side in `src/lib/watermarkCanvas.ts`. It is used identically across `GuruPresensi.tsx` (front/back), `GuruJurnal.tsx` (rear), and `PiketView.tsx` (rear). Nominatim reverse geocoding can be cleanly integrated with coordinate quantization caching, 3.5s abort timeout, and four-line canvas badge rendering formatted as `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]`. Front-camera mirroring is strictly isolated to the video frame; text watermarks are rendered upright on both cameras.
3. **Student Attendance Percentage**: Identified severe calculation bugs where journals with text entries ("Semua Hadir") or absentee-only parenthetical formats in `detail_absen` resulted in 0% attendance or severe distortion. We establish the definitive formula `(total_present / total_students) * 100` with complete data fallback.
4. **PWA Install Prompt**: `public/sw.js` is already deployed, but `manifest.json` and a `beforeinstallprompt` handler are absent. A lightweight `PWAInstallPrompt` component is designed with standalone detection (`display-mode: standalone`) and local dismissal/installation persistence.
5. **Admin Rejection Feedback Flow**: SQL inspection confirmed that none of `presensi_guru`, `jurnal_pembelajaran`, or `laporan_piket` currently possess a rejection reason column. Adding `catatan_admin TEXT DEFAULT NULL` (matching `bank_dokumen` and `HistoryView.tsx`) accompanied by a mandatory SweetAlert2/modal textarea in `AdminVerifView.tsx` completes this flow.

---

## Part 1: R3.1 - Teacher Dashboard Structure & Strict Reordering

### 1.1 Architecture & Current Widget Inventory
In `src/components/HomeView.tsx`, user role determination occurs at line 71:
```tsx
const isGuru = user?.role !== 'Admin';
```
When `isGuru === true`, the component currently renders the following hierarchy inside `<section id="view-home">`:

| Order in Code | Section Name | Lines in `HomeView.tsx` | Description | Target Disposition |
|---|---|---|---|---|
| Header | Header Banner | 743 – 780 | Teacher greeting, username, school name, date & live clock | **Retain** (Top banner) |
| **Section 1** | **Statistik Presensi Pribadi** | 788 – 868 | Monthly cards for Hadir (H), Terlambat (TL), Izin (I), Sakit (S), and Akumulasi Keterlambatan | **KEEP as Item 1** |
| Section 2 | Target Jurnal Hari Ini | 871 – 937 | Jurnal Terisi vs Total Target ratio, progress bar, and "Buka Jurnal KBM" button | **REMOVE as standalone** (absorb into Task Status) |
| **Section 3** | **Status Tugas Hari Ini** | 940 – 1037 | Step workflow tracker: Presensi Datang, Laporan Piket, Jurnal KBM, Presensi Pulang | **KEEP as Item 2** |
| Section 4 | Persentase Kehadiran Siswa | 1040 – 1111 | Subject cards with progress meter of student attendance per mapel | **REMOVE** (extraneous) |
| Section 5 | Kelengkapan Perangkat Pembelajaran | 1114 – 1195 | Kurikulum Merdeka documents checklist (CP, ATP, RPE, Prota, Promes, RPM) | **REMOVE** (handled in DokumenView) |
| **Section 6** | **Jadwal Mengajar Hari Ini** | 1198 – 1328 | Cards of today's classes from `jadwal_pelajaran` with "Isi Jurnal" / "Sudah Diisi" | **KEEP as Item 3** |

### 1.2 Strict Reordering Requirement
The authoritative requirement states:
> "Reorder the teacher dashboard to show: (1) Personal data statistics, (2) Today's task status, (3) Teaching schedule. Remove any other sections."

Therefore, the teacher dashboard JSX must be strictly restructured as:
```tsx
{isGuru && (
  <>
    {/* (1) Personal data statistics */}
    <div className="glass-card p-4">
      {/* Statistik Presensi Pribadi (Hadir, Terlambat, Izin, Sakit, Akumulasi Telat) */}
    </div>

    {/* (2) Today's task status */}
    <div className="glass-card p-4">
      {/* Status Tugas Hari Ini (Presensi Datang, Piket, Jurnal KBM [with target count], Presensi Pulang) */}
    </div>

    {/* (3) Teaching schedule */}
    <div className="glass-card p-4">
      {/* Jadwal Mengajar Hari Ini (Today's classes list from jadwal_pelajaran) */}
    </div>
  </>
)}
```

### 1.3 State & Query Optimization
Removing Section 4 and Section 5 allows significant performance cleanup in `HomeView.tsx`:
- Lines 160–226: `fetchTeacherDetails` queried `bank_dokumen` and entire historical `jurnal_pembelajaran` for every teacher on mount. These heavy queries can be removed or simplified.
- Lines 485–558 (`subjectAttendanceList`) and Lines 561–646 (`subjectDocCompletenessList`) can be removed from `HomeView.tsx`, freeing React memory and eliminating unnecessary database roundtrips.

---

## Part 2: R3.2 - Camera Geolocation & OSM Nominatim Reverse Geocoding

### 2.1 Codebase Inspection of Camera Capture
Camera capture across the application is unified under `src/components/CameraSelfieCapture.tsx` and `src/lib/watermarkCanvas.ts`.
It is invoked in exactly three places:
1. `src/components/GuruPresensi.tsx` (line 472): for Presensi Datang and Presensi Pulang.
2. `src/components/GuruJurnal.tsx` (line 655): for KBM classroom documentation photos.
3. `src/components/PiketView.tsx` (line 1154): for school duty documentation photos.

### 2.2 Geolocation & Canvas Watermark Mechanism
1. **Coordinate Acquisition**:
   In `src/components/CameraSelfieCapture.tsx` (lines 34–55):
   ```ts
   navigator.geolocation.getCurrentPosition(
     (pos) => {
       const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
       setCoordinates(coords);
     },
     ...,
     { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
   );
   ```
2. **Current Watermark Badge in `src/lib/watermarkCanvas.ts`**:
   The canvas creates a dark slate pill (`rgba(15, 23, 42, 0.78)`) at the bottom center:
   - Line 1: `options.dateText` (e.g. `Kamis, 17 September 2026`)
   - Line 2: Coordinates (e.g. `Lat: -8.512345, Long: 115.267890`)
   - Line 3: `options.timestamp` (e.g. `07:15:30 WITA`)
3. **Mirroring Behavior (Front vs Rear Camera)**:
   In `drawWatermarkedCanvas`:
   - If `mirror === true` (front selfie camera): `ctx.translate(width, 0); ctx.scale(-1, 1); ctx.drawImage(...); ctx.restore();`.
   - The badge and all watermark text are drawn **after** `ctx.restore()`.
   - **Result**: The camera image is mirrored for selfie ergonomics, but **all text is rendered unmirrored, completely upright and legible on both front and rear cameras**.

### 2.3 Nominatim Reverse Geocoding Design
#### A. API Endpoint & Query
```
https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1
```
*Note*: OpenStreetMap Nominatim guidelines require a recognizable User-Agent or Referer. In a client-side browser fetch, browser CORS is supported by Nominatim.

#### B. Address Decomposition & Formatting
Nominatim returns a hierarchical `address` object. The Indonesian administrative subdivisions map as follows:
- **Desa/Kelurahan**: `address.village || address.suburb || address.quarter || address.neighbourhood || address.hamlet || address.residential || ''`
- **Kecamatan**: `address.subdistrict || address.municipality || address.district || address.city_district || ''`
- **Kota/Kabupaten**: `address.city || address.regency || address.county || address.state_district || ''`
- **Provinsi**: `address.state || address.province || ''`

**Target Format**: `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]`  
Example: `[Batuan, Sukawati, Gianyar, Bali]` or `[Desa Batuan, Kec. Sukawati, Kab. Gianyar, Bali]`.

#### C. Caching, Rate-Limiting & Offline Resilience
To prevent exceeding Nominatim's 1 req/sec policy and avoid UI lag:
1. **Coordinate Quantization Cache**: Round coordinates to 3 decimal places (`~110 meters`). Store results in `sessionStorage` with key `nom_cache_${lat.toFixed(3)}_${lon.toFixed(3)}`.
2. **Abort Timeout**: Use `AbortController` with a 3500ms timeout so camera capture is never blocked if cellular connection is slow.
3. **Fallback Strategy**:
   - If cache hit: Return immediately.
   - If network call succeeds: Save to cache and return formatted string.
   - If network call fails (offline or timeout):
     - Fallback 1: Last cached location from `sessionStorage` / `localStorage`.
     - Fallback 2: School city/location from `pengaturan` table (if available).
     - Fallback 3: Clean coordinate fallback string without breaking: `[Lokasi GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}]`.

#### D. Canvas Watermark Adaptation
In `src/lib/watermarkCanvas.ts`:
1. Expand `WatermarkOptions`:
   ```ts
   export interface WatermarkOptions {
     timestamp: string;
     coordinates: WatermarkCoordinates | null;
     dateText: string;
     locationName?: string | null;
   }
   ```
2. Adjust badge dimensions:
   - Scale badge height: `const badgeHeight = Math.round(116 * scale);`
   - Render 4 vertical lines:
     - Line 1 (`badgeY + verticalSpacing * 0.8`): Date (`Kamis, 17 September 2026`)
     - Line 2 (`badgeY + verticalSpacing * 1.6`): **Location Name**: `options.locationName || '[Lokasi Tidak Terdeteksi]'` (font size: `11.5 * scale`, high contrast white)
     - Line 3 (`badgeY + verticalSpacing * 2.4`): Coordinates: `Lat: -8.xxx, Long: 115.xxx`
     - Line 4 (`badgeY + verticalSpacing * 3.2`): Time WITA: `07:15:30 WITA`
   - Apply text truncation or font scaling if the combined location string exceeds `badgeWidth - 20px`.

---

## Part 3: R3.3 - Student Attendance Percentage Calculation

### 3.1 Audit of Existing Calculations
1. **`src/components/HomeView.tsx` (lines 485–558)**:
   Calculates student attendance percentage per subject taught by the teacher.
   ```ts
   const percentage = totalRecords > 0 ? Math.round((totalH / totalRecords) * 100) : 0;
   ```
2. **`src/components/RekapSiswaView.tsx` (lines 330–338 & 356–364)**:
   - Per-student attendance percentage:
     ```ts
     const total = s.hadir + s.sakit + s.izin + s.alpa;
     const persentase = total > 0 ? Math.round((s.hadir / total) * 100) : 0;
     ```
   - Class-wide summary metric:
     ```ts
     const totalAllSessions = totalHadir + totalSakit + totalIzin + totalAlpa;
     const avgKehadiran = totalAllSessions > 0 ? Math.round((totalHadir / totalAllSessions) * 100) : 0;
     ```
3. **`src/components/GuruJurnal.tsx` (lines 38–60)**:
   Summarizes attendance into text string like `"Semua Hadir (30 siswa)"` or `"Hadir: 28, Sakit: 1, Izin: 1 [Budi (S), Siti (I)]"`.

### 3.2 Bugs & Discrepancies Identified
1. **Critical Bug in `RekapSiswaView.tsx` (Line 235)**:
   The query for `jurnal_pembelajaran` is:
   ```ts
   .select('absensi_siswa, detail_absen, tanggal')
   ```
   Notice that `kehadiran_murid` is **NOT included in the SELECT clause**!
   If a journal has `kehadiran_murid = "Semua Hadir (30 siswa)"` and `absensi_siswa` was not stored in JSON format (or stored as a summary), the parser in lines 261–326 checks `absensiJson` and `detail_absen`. Neither has absentee entries, so **0 present sessions are credited to every student**, yielding `0%` attendance!
2. **Critical Regex Bug in `detail_absen` Parsing**:
   In older code, `detail_absen` only listed absent students (e.g. `Budi (S), Joko (I)`).
   The parser regex `match(/\(([HSIAhsia])\)/g)` only matched `S` and `I`.
   `totalRecords` was calculated as `2` (the 2 absentees) and `totalH` was `0`, producing `0%` attendance instead of `(28 / 30) * 100 = 93%`!
3. **Denominator Inconsistency**:
   In `HomeView.tsx`, the formula divided by `totalRecords` (sum of logged statuses). If a student was absent without being logged or omitted from the sheet, the denominator shrank, distorting the percentage.

### 3.3 Target Formula & Implementation
The requirement states:
> "The student attendance percentage formula equals `(total_present / total_students) * 100` and displays correctly on the UI."

To ensure mathematical precision:
1. **Per-Meeting Attendance**:
   $$\text{Attendance \%} = \frac{\text{total\_present}}{\text{total\_students\_enrolled}} \times 100$$
   Where `total_students_enrolled` is obtained from `data_siswa` for that class.
2. **Cumulative Per-Student Attendance**:
   $$\text{Attendance \%} = \frac{\text{student\_hadir\_count}}{\text{total\_meetings\_conducted}} \times 100$$
3. **Class Recap Aggregate**:
   $$\text{Attendance \%} = \frac{\sum \text{total\_present}}{\text{total\_students} \times \text{total\_meetings}} \times 100$$
   Or equivalently:
   $$\text{Attendance \%} = \frac{\sum \text{total\_present}}{\sum \text{total\_expected\_attendances}} \times 100$$

In `RekapSiswaView.tsx`:
- Add `kehadiran_murid` to `supabase.from('jurnal_pembelajaran').select(...)`.
- When `absensi_siswa` is JSON, count keys accurately.
- When `absensi_siswa` or `kehadiran_murid` specifies "Semua Hadir", credit all students with Hadir.
- If absentees are listed (e.g. `[Budi (S), Siti (I)]`), mark named students with S/I and credit all other enrolled students in `data_siswa` with Hadir.

---

## Part 4: R4.1 - PWA Install Prompt

### 4.1 Current PWA State
- **Service Worker**: `public/sw.js` exists, handling VAPID push and background notifications.
- **Manifest**: `public/manifest.json` does **NOT** exist.
- **HTML Meta**: `src/app/layout.tsx` does not declare `<link rel="manifest" ...>`.
- **Event Listeners**: No `beforeinstallprompt` or `appinstalled` listeners exist in the project.

### 4.2 Required PWA Assets & Configuration
1. Create `public/manifest.json`:
   ```json
   {
     "name": "SIPJAM - SMA Nizamudin",
     "short_name": "SIPJAM",
     "description": "Sistem Informasi Manajemen Presensi & Jurnal Mengajar",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#0B4619",
     "theme_color": "#0B4619",
     "orientation": "portrait",
     "icons": [
       {
         "src": "/favicon.ico",
         "sizes": "64x64 32x32 24x24 16x16",
         "type": "image/x-icon"
       }
     ]
   }
   ```
2. Link manifest in `src/app/layout.tsx` `<head>`:
   ```tsx
   <link rel="manifest" href="/manifest.json" />
   <meta name="theme-color" content="#0B4619" />
   ```

### 4.3 Component Specification: `PWAInstallPrompt.tsx`
Create `src/components/PWAInstallPrompt.tsx`:
- **Mount Point**: Rendered in `src/app/page.tsx` or `src/components/AppScreen.tsx`.
- **Display Criteria**:
  1. Check standalone mode:
     ```ts
     const isStandalone = 
       (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
       ((typeof navigator !== 'undefined') && (navigator as any).standalone === true);
     ```
     If `isStandalone === true`, **do not display prompt**.
  2. Check local persistence:
     ```ts
     const isDismissed = localStorage.getItem('sipjam_pwa_dismissed') === 'true';
     const isInstalled = localStorage.getItem('sipjam_pwa_installed') === 'true';
     ```
     If either is true, **do not display prompt**.
  3. Listen for `beforeinstallprompt`:
     ```ts
     window.addEventListener('beforeinstallprompt', (e) => {
       e.preventDefault();
       setDeferredPrompt(e);
       setShowPrompt(true);
     });
     ```
  4. Listen for `appinstalled`:
     ```ts
     window.addEventListener('appinstalled', () => {
       localStorage.setItem('sipjam_pwa_installed', 'true');
       setShowPrompt(false);
       setDeferredPrompt(null);
     });
     ```
- **Action Handlers**:
  - **Install Button**:
    ```ts
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem('sipjam_pwa_installed', 'true');
      }
      setShowPrompt(false);
    }
    ```
  - **Dismiss ("Nanti") Button**:
    ```ts
    localStorage.setItem('sipjam_pwa_dismissed', 'true');
    setShowPrompt(false);
    ```

---

## Part 5: R4.2 - Admin Rejection Feedback Flow

### 5.1 Verification Workflow in `src/components/AdminVerifView.tsx`
Currently (lines 144–185):
- `verifyItem(id, status)` executes immediately:
  ```ts
  const { error } = await supabase
    .from(table)
    .update({ status_verifikasi: status })
    .eq('id', id);
  ```
- Clicking "Tolak" (Reject) does not request a rejection reason.

### 5.2 Database Schema Audit
Direct SQL query to `information_schema.columns` on project `jicvvqxjyzntdrccnuyz` revealed:
- `presensi_guru`: has `status_verifikasi`, **NO** rejection reason column.
- `jurnal_pembelajaran`: has `status_verifikasi`, **NO** rejection reason column.
- `laporan_piket`: has `status_verifikasi`, **NO** rejection reason column.

*Notice*: `bank_dokumen` already has `catatan_admin TEXT` (see `DokumenView.tsx`), and `src/components/HistoryView.tsx` lines 164 & 208 already render:
```tsx
{item.catatan_admin && (
  <div className="mt-1 p-1.5 bg-gray-50 dark:bg-gray-900 rounded text-[9px] border border-gray-100 dark:border-gray-700">
    <span className="font-semibold text-gray-900 dark:text-white">Catatan Admin: </span>
    <span className="text-gray-700 dark:text-gray-300 italic">{item.catatan_admin}</span>
  </div>
)}
```

### 5.3 Database Migration Specification
Create migration file `supabase/migrations/20260919_add_rejection_feedback_columns.sql`:
```sql
-- Add admin feedback / rejection reason columns to verification tables
ALTER TABLE public.presensi_guru 
ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;

ALTER TABLE public.jurnal_pembelajaran 
ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;

ALTER TABLE public.laporan_piket 
ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;

-- Optional alias column if needed for backward compatibility
ALTER TABLE public.presensi_guru 
ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;

ALTER TABLE public.jurnal_pembelajaran 
ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;

ALTER TABLE public.laporan_piket 
ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;
```

### 5.4 UI Implementation in `AdminVerifView.tsx`
When admin clicks "Tolak":
1. Open a SweetAlert2 modal with `input: 'textarea'`:
   ```ts
   const { value: feedback } = await Swal.fire({
     title: `Tolak ${label}?`,
     input: 'textarea',
     inputLabel: 'Alasan Penolakan (Wajib Diisi)',
     inputPlaceholder: 'Tuliskan alasan penolakan atau perbaikan yang harus dilakukan oleh guru...',
     showCancelButton: true,
     confirmButtonText: 'Tolak Pengajuan',
     confirmButtonColor: '#dc2626',
     cancelButtonText: 'Batal',
     inputValidator: (val) => {
       if (!val || !val.trim()) {
         return 'Alasan penolakan wajib diisi sebelum menyimpan!';
       }
       return null;
     }
   });

   if (!feedback) return; // User cancelled or closed modal
   ```
2. Update backend:
   ```ts
   const { error } = await supabase
     .from(table)
     .update({ 
       status_verifikasi: 'Ditolak',
       catatan_admin: feedback.trim(),
       alasan_penolakan: feedback.trim()
     })
     .eq('id', id);
   ```
3. Update local state so the card immediately reflects the rejection reason and badge.
4. Render `catatan_admin` / `alasan_penolakan` across teacher views (`HistoryView.tsx`, `GuruJurnal.tsx`, and `PiketView.tsx`) with a red warning badge so the teacher understands what to correct.

---

## Part 6: Actionable Implementation Blueprint

| Step | Target File | Action |
|---|---|---|
| **1. Reorder Teacher Dashboard** | `src/components/HomeView.tsx` | - Place `Statistik Presensi Pribadi` as Section 1<br>- Place `Status Tugas Hari Ini` as Section 2<br>- Place `Jadwal Mengajar Hari Ini` as Section 3<br>- Remove Section 4 (Student Attendance per mapel) & Section 5 (Dokumen Kurikulum Merdeka) & standalone Target Jurnal |
| **2. Nominatim Geocoding & Watermark** | `src/lib/watermarkCanvas.ts`<br>`src/components/CameraSelfieCapture.tsx` | - Add reverse geocoding fetch to Nominatim with 3.5s timeout and coordinate quantization cache<br>- Format address as `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]`<br>- Add 4th line to canvas badge in `drawWatermarkedCanvas`<br>- Verify front/back camera compatibility |
| **3. Student Attendance Formula** | `src/components/RekapSiswaView.tsx` | - Select `kehadiran_murid` in journal query<br>- Enforce `(total_present / total_students) * 100`<br>- Parse "Semua Hadir" and absentee lists correctly |
| **4. PWA Install Prompt** | `public/manifest.json`<br>`src/components/PWAInstallPrompt.tsx`<br>`src/app/layout.tsx` | - Create manifest.json with icons & standalone display<br>- Build `PWAInstallPrompt.tsx` with `beforeinstallprompt`, standalone check, and dismissal persistence |
| **5. Admin Rejection Feedback** | `supabase/migrations/...`<br>`src/components/AdminVerifView.tsx` | - Run migration adding `catatan_admin` and `alasan_penolakan`<br>- Add required SweetAlert2 textarea modal on "Tolak"<br>- Save reason to DB and display on teacher history |

---
**Report compiled by**: `explorer_m10_survey_r3r4`  
**Timestamp**: 2026-09-19T09:20:00+08:00
