# Task Assignment: Worker Milestone 4 (Jurnal Upload, GPS Geolocation R4 & School Setting R6)

## Identity
- Archetype: teamwork_preview_worker
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Survey References
- Explorer Survey 3 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_report.md`
- Survey 3 Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md`

## Write Ownership (Strictly Exclusive)
You exclusively own and may modify ONLY these files:
- `src/components/SuperadminView.tsx`
- `src/components/GuruJurnal.tsx`
- `src/components/AdminVerifView.tsx`
- `src/components/RekapJurnalView.tsx`

DO NOT modify `GuruPresensi.tsx`, `AccountSettingsModal.tsx`, `merge_accounts.sql`, or migration files.

## Mission & Detailed Requirements

### 1. R6: Superadmin School Setting for Journal Mode
1. **`src/components/SuperadminView.tsx`**:
   - In "Edit Data Sekolah" modal (`handleEditSchool` using SweetAlert2):
     - Add input field for Mode Jurnal Pembelajaran:
       - Options:
         - Value `'camera_only'`: "Live Camera Langsung"
         - Value `'camera_upload'`: "Live Camera + Upload Foto"
       - Set current value based on `school.mode_jurnal`.
     - In `preConfirm`, read selected `mode_jurnal` and include it in the update payload to Supabase table `sekolah`.
   - In "Tambah Sekolah Baru" modal (`handleOpenAddSchoolModal`):
     - Also include the `mode_jurnal` field with default `'camera_upload'`.

### 2. R6 & R4: GuruJurnal Conditional Upload & GPS Geolocation
1. **`src/components/GuruJurnal.tsx`**:
   - **School Mode Enforcement**:
     - Fetch the logged-in teacher's school configuration from Supabase table `sekolah`:
       `select('mode_jurnal').eq('id', user.sekolah_id).single()`.
     - Default to `'camera_upload'` if not found.
     - Determine: `const isUploadAllowed = schoolModeJurnal !== 'camera_only';`
     - When `isUploadAllowed` is true, render options to switch between "Kamera Langsung" and "Upload Galeri/File".
     - **CRITICAL ACCEPTANCE CRITERIA**: The file upload input `<input type="file" ...>` must **ONLY** be rendered in the DOM if `isUploadAllowed` is true (i.e. if `schoolModeJurnal !== 'camera_only'`). If `camera_only`, the file input must NOT be rendered.
   - **GPS Capture on Gallery Upload**:
     - Implement dedicated handler for gallery file upload:
       ```ts
       const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
         const selectedFile = e.target.files?.[0];
         if (!selectedFile) return;
         
         const nowWita = getWitaTimestamp();
         setUploadWaktu(nowWita);
         
         // Capture GPS Geolocation via browser API
         if (typeof navigator !== 'undefined' && navigator.geolocation) {
           navigator.geolocation.getCurrentPosition(
             (position) => {
               const lat = position.coords.latitude;
               const lng = position.coords.longitude;
               setUploadLatitude(lat);
               setUploadLongitude(lng);
               setUploadLokasi(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
             },
             (err) => {
               console.warn('Geolocation capture failed:', err);
               setUploadLokasi('Lokasi tidak terdeteksi');
             },
             { enableHighAccuracy: true, timeout: 10000 }
           );
         }
         ...
       };
       ```
     - In `handleJurnalSubmit`, include coordinates in the payload:
       ```ts
       latitude: uploadLatitude ?? (jurnalCoords?.latitude || null),
       longitude: uploadLongitude ?? (jurnalCoords?.longitude || null),
       lokasi: uploadLokasi || (jurnalCoords ? `GPS: ${jurnalCoords.latitude.toFixed(5)}, ${jurnalCoords.longitude.toFixed(5)}` : '-'),
       waktu_upload: uploadWaktu || getWitaTimestamp(),
       ```
       and insert into `public.jurnal_pembelajaran`.

### 3. R4: Journal Review UI Enhancements
1. **`src/components/AdminVerifView.tsx` & `src/components/RekapJurnalView.tsx`**:
   - Next to or under `item.link_bukti_foto` / foto kegiatan, if `item.lokasi` or (`item.latitude` && `item.longitude`) is present:
     - Render location badge with icon `<i className="fa-solid fa-location-dot text-red-500"></i>` and coordinate/location text.
     - If `item.waktu_upload` is present, display the upload timestamp.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification
- Verify TypeScript types (`npx tsc --noEmit`).
- Document all changes and verification in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4\handoff.md`.
- Report back via `send_message` to orchestrator_6.

## 2026-10-01T11:17:37Z
You are assigned as Worker Milestone 4 (Jurnal Upload, GPS Geolocation R4 & School Setting R6). Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4\DISPATCH.md, PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md, and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement R4 & R6: Add mode_jurnal input in SuperadminView.tsx Edit Sekolah modal, update GuruJurnal.tsx to read school config and conditionally render gallery upload input ONLY if allowed, invoke navigator.geolocation.getCurrentPosition on gallery upload and send latitude, longitude, lokasi, waktu_upload to database, and display location badge in AdminVerifView.tsx & RekapJurnalView.tsx.
Verify with tsc --noEmit.
Write handoff.md in your working directory and notify orchestrator_6 via send_message when done.
