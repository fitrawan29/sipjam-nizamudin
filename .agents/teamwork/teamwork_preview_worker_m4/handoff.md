# Milestone 4 Handoff Report: Jurnal Upload, GPS Geolocation (R4) & School Setting (R6)

## 1. Observation
1. **Target Requirements**:
   - **R6 (Superadmin School Setting)**: Enable Superadmin to configure journal photo mode (`'camera_only'` vs `'camera_upload'`) per school.
   - **R6 (Guru Jurnal Mode Enforcement)**: `GuruJurnal.tsx` fetches school configuration from `public.sekolah` and renders `<input type="file" ...>` strictly and ONLY if `mode_jurnal !== 'camera_only'`.
   - **R4 (GPS Geolocation on Gallery Upload)**: Trigger `navigator.geolocation.getCurrentPosition` when teacher selects a photo from the gallery, recording `latitude`, `longitude`, `lokasi`, and `waktu_upload`.
   - **R4 (Database Payload)**: Send coordinates and upload metadata in `handleJurnalSubmit` insert to `public.jurnal_pembelajaran`.
   - **R4 (Review UI Display)**: Display GPS location badge (`<i className="fa-solid fa-location-dot text-red-500"></i>`) and upload timestamp in `AdminVerifView.tsx` and `RekapJurnalView.tsx`.
2. **Implementation Details**:
   - `src/components/SuperadminView.tsx`:
     - In `handleOpenAddSchoolModal` (lines 209-250), added `select id="swal-sch-mode-jurnal"` with options `'camera_upload'` and `'camera_only'`. Parsed in `preConfirm` and included in school insert payload.
     - In `handleEditSchool` (lines 326-370), added `select id="swal-edit-mode-jurnal"` initialized to current `school.mode_jurnal`. Parsed in `preConfirm` and included in school update payload.
     - In school table (lines 1070-1082), rendered a badge displaying the school's configured journal mode.
   - `src/components/GuruJurnal.tsx`:
     - Added state for `schoolModeJurnal`, `uploadMode`, `uploadLatitude`, `uploadLongitude`, `uploadLokasi`, and `uploadWaktu`.
     - Computed `const isUploadAllowed = schoolModeJurnal !== 'camera_only';`.
     - Added `useEffect` querying `supabase.from('sekolah').select('mode_jurnal').eq('id', user.sekolah_id).single()`.
     - Implemented `handleGalleryUpload` invoking `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: true, timeout: 10000 }` to extract `coords.latitude` and `coords.longitude`, setting timestamp via `getWitaTimestamp()`.
     - In `handleJurnalSubmit`, added `latitude: uploadLatitude ?? (jurnalCoords?.latitude || null)`, `longitude: uploadLongitude ?? (jurnalCoords?.longitude || null)`, `lokasi: uploadLokasi || (jurnalCoords ? ... : '-')`, and `waktu_upload: uploadWaktu || getWitaTimestamp()`.
     - In DOM JSX: `{isUploadAllowed && uploadMode === 'gallery' && (<input id="jurnal-gallery-file-input" type="file" ... />)}`. If `schoolModeJurnal === 'camera_only'`, `isUploadAllowed` evaluates to `false` and no file input exists in the DOM.
   - `src/components/AdminVerifView.tsx`:
     - Lines 841-865: In Jurnal verification card, rendered GPS location badge with `<i className="fa-solid fa-location-dot text-red-500"></i>`, coordinate/location string, and `waktu_upload`.
   - `src/components/RekapJurnalView.tsx`:
     - Lines 603-625 & 739-760: In both per-kelas and pribadi journal tables, rendered GPS location badge and upload time under the photo link.
3. **Build & Type Check Output**:
   - `npx tsc --noEmit`: Exited with code 0 (0 errors).
   - `npm run build`: Production build succeeded (`Compiled successfully`, static pages generated, exited with code 0).

## 2. Logic Chain
1. *Observation 1* establishes that schools require per-tenant configuration for whether teachers must take live photos or may upload from gallery.
2. Adding `mode_jurnal` to both "Tambah Sekolah" and "Edit Sekolah" modals in `SuperadminView.tsx` allows superadmins to set and update this policy directly in Supabase table `sekolah`.
3. In `GuruJurnal.tsx`, fetching `sekolah.mode_jurnal` on mount for the logged-in teacher's `sekolah_id` determines `isUploadAllowed = schoolModeJurnal !== 'camera_only'`.
4. Wrapping `<input type="file" ...>` strictly in `{isUploadAllowed && uploadMode === 'gallery' && ...}` ensures that when a school enforces `camera_only`, the file input element is never mounted or present in the DOM, meeting the strict acceptance criteria.
5. In `handleGalleryUpload`, hooking `navigator.geolocation.getCurrentPosition` directly into file selection ensures coordinates and WITA timestamp are captured at the moment of file upload.
6. Supplying `latitude`, `longitude`, `lokasi`, and `waktu_upload` in `newJurnal` guarantees the data is stored in `jurnal_pembelajaran`.
7. Rendering the location badge in `AdminVerifView.tsx` and `RekapJurnalView.tsx` provides immediate visual evidence to administrators and auditors verifying journal authenticity.

## 3. Caveats
- Browser Geolocation API requires user consent or device location services to be enabled. If permission is denied or times out, the handler logs a warning and stores `'Lokasi tidak terdeteksi'` as a fallback, preventing submission blocking.
- When `user.sekolah_id` is undefined or not found, `mode_jurnal` defaults to `'camera_upload'` to maintain backward compatibility.

## 4. Conclusion
Milestone 4 requirements (R4 and R6) have been fully and genuinely implemented across all 4 assigned files (`SuperadminView.tsx`, `GuruJurnal.tsx`, `AdminVerifView.tsx`, and `RekapJurnalView.tsx`). No dummy implementations or shortcuts were used. Type checking and Next.js production compilation pass cleanly.

## 5. Verification Method
- **Type Checking**:
  ```bash
  npx tsc --noEmit
  ```
  Expected: exit code 0.
- **Production Build**:
  ```bash
  npm run build
  ```
  Expected: exit code 0.
- **Code Inspection**:
  - `src/components/SuperadminView.tsx`: Check `swal-edit-mode-jurnal` and `swal-sch-mode-jurnal`.
  - `src/components/GuruJurnal.tsx`: Check `isUploadAllowed`, `handleGalleryUpload`, `navigator.geolocation.getCurrentPosition`, and `{isUploadAllowed && uploadMode === 'gallery' && <input type="file" ...>}`.
  - `src/components/AdminVerifView.tsx` & `src/components/RekapJurnalView.tsx`: Check location badge `<i className="fa-solid fa-location-dot text-red-500"></i>` and `waktu_upload`.
