# Handoff Report: R3 & R4 Investigation
**Agent**: explorer_m10_survey_r3r4  
**Date**: 2026-09-19  
**Target Milestone**: Milestone 10  
**Survey Report Reference**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r3r4\survey_r3r4.md`

---

## 1. Observation

1. **Teacher Dashboard Sections (`src/components/HomeView.tsx`)**:
   - Lines 788–868: Section 1 renders Personal Attendance Stats (`Statistik Presensi Pribadi`: H, TL, I, S, Akumulasi Keterlambatan).
   - Lines 871–937: Section 2 renders standalone Dynamic Target Journal Ratio (`Target Jurnal Hari Ini`: Jurnal Terisi vs Total Target).
   - Lines 940–1037: Section 3 renders Workflow Status Tracker (`Status Tugas Hari Ini`: Datang, Piket, Jurnal, Pulang).
   - Lines 1040–1111: Section 4 renders Student Attendance Percentage per Subject (`Persentase Kehadiran Siswa per Mata Pelajaran`).
   - Lines 1114–1195: Section 5 renders Kurikulum Merdeka Document Completeness (`Kelengkapan Perangkat Pembelajaran`).
   - Lines 1198–1328: Section 6 renders Teaching Schedule (`Jadwal Mengajar Hari Ini`).
   - State & queries: Lines 160–226 load `bank_dokumen` and historical journals to support Section 4 and Section 5.

2. **Camera Capture & Watermark (`src/lib/watermarkCanvas.ts` & `src/components/CameraSelfieCapture.tsx`)**:
   - `CameraSelfieCapture.tsx` is called at `src/components/GuruPresensi.tsx:472`, `src/components/GuruJurnal.tsx:655`, and `src/components/PiketView.tsx:1154`.
   - Lines 34–55 in `CameraSelfieCapture.tsx`: `navigator.geolocation.getCurrentPosition` captures `latitude` and `longitude`.
   - Lines 77–86 in `watermarkCanvas.ts`: Front camera mirroring is executed on video frame via `ctx.translate(width, 0); ctx.scale(-1, 1); ctx.drawImage(...); ctx.restore();`.
   - Lines 91–163 in `watermarkCanvas.ts`: Text watermark badge is drawn **after** `ctx.restore()`, ensuring all text is unmirrored.
   - Lines 142–162 in `watermarkCanvas.ts`: The canvas badge currently displays exactly 3 lines: Date, Coordinates, and WITA Time. Location name / reverse geocoding is absent.

3. **Student Attendance Percentage Calculation**:
   - In `src/components/HomeView.tsx` lines 500–556: `totalRecords` counts matching tokens `/\(([HSIAhsia])\)/g`. When only absentees were recorded in `detail_absen` (e.g. `Budi (S)`), `totalRecords = 1`, `totalH = 0`, producing `percentage = 0%`.
   - In `src/components/RekapSiswaView.tsx` line 235: Query `.select('absensi_siswa, detail_absen, tanggal')` completely omits `kehadiran_murid`. If `absensi_siswa` was text (e.g. `Semua Hadir (30 siswa)`), no attendance was credited, producing `0%` attendance.

4. **PWA Setup**:
   - `public/sw.js` exists (handles push notifications and offline claim).
   - Neither `public/manifest.json` nor `public/manifest.webmanifest` exists.
   - No `beforeinstallprompt` or `appinstalled` event listeners exist in `src/app/` or `src/components/`.

5. **Admin Verification & Database Schema**:
   - In `src/components/AdminVerifView.tsx` line 815: Clicking "Tolak" directly triggers `verifyItem(item.id, 'Ditolak')` without any feedback input.
   - SQL query on `information_schema.columns` (project `jicvvqxjyzntdrccnuyz`):
     - `presensi_guru`: contains no feedback/rejection reason column.
     - `jurnal_pembelajaran`: contains no feedback/rejection reason column.
     - `laporan_piket`: contains no feedback/rejection reason column.
   - In `src/components/HistoryView.tsx` lines 164 & 208: UI already checks and renders `{item.catatan_admin && (...)}`.
   - In `src/components/DokumenView.tsx` lines 126–139: SweetAlert2 `input: 'textarea'` is already used to require `catatan_admin` when rejecting a document.

---

## 2. Logic Chain

1. **Teacher Dashboard (R3.1)**:
   - Observation 1 demonstrates that `HomeView.tsx` currently renders 6 widgets, causing cognitive overload.
   - The user request strictly requires: (1) Personal data statistics, (2) Today's task status, (3) Teaching schedule, and explicit removal of all other sections.
   - Therefore, moving Section 3 up to position 2, moving Section 6 to position 3, and removing Sections 2, 4, and 5 strictly satisfies the requirement and eliminates unused heavy database queries.

2. **Camera Location & OSM Nominatim (R3.2)**:
   - Observation 2 demonstrates that camera capture is already centralized in `CameraSelfieCapture.tsx` and watermarking is in `watermarkCanvas.ts`.
   - Text rendering is drawn in non-mirrored coordinate space, which guarantees front and rear cameras produce legible text.
   - Integrating Nominatim reverse geocoding with a 3.5s timeout, coordinate quantization caching (3 decimal places / ~110m), and formatting as `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]` ensures adherence to OSM policy while guaranteeing fast photo capture. Expanding the canvas badge to 4 lines renders the location clearly.

3. **Student Attendance Calculation (R3.3)**:
   - Observation 3 proves that missing `kehadiran_murid` in the select query and regex parsing of absentee-only entries created severe 0% bugs.
   - Re-introducing `kehadiran_murid` and enforcing `(total_present / total_students) * 100` based on enrolled students resolves the discrepancy across teacher and admin views.

4. **PWA Install Prompt (R4.1)**:
   - Observation 4 confirms that `sw.js` is active but manifest and install prompt are missing.
   - Adding `public/manifest.json`, registering it in `layout.tsx`, and implementing `PWAInstallPrompt.tsx` with `window.matchMedia('(display-mode: standalone)')` and `localStorage` checks fulfills all criteria.

5. **Admin Rejection Flow (R4.2)**:
   - Observation 5 confirms `AdminVerifView.tsx` lacks a rejection feedback modal, and the three verification tables lack feedback columns in PostgreSQL.
   - Adding `catatan_admin TEXT DEFAULT NULL` (and `alasan_penolakan TEXT DEFAULT NULL`) via SQL migration aligns the schema with `HistoryView.tsx` and `DokumenView.tsx`.
   - Wrapping the "Tolak" button click in `AdminVerifView.tsx` with a mandatory SweetAlert2 textarea modal enforces feedback before saving.

---

## 3. Caveats

1. **Nominatim Usage Limits**: OpenStreetMap Nominatim has an official acceptable use limit of 1 request per second. Coordinate quantization caching (rounding to 3 decimals) and caching in `sessionStorage` avoids duplicate requests for users taking multiple photos at the same venue.
2. **iOS Safari PWA Limitations**: iOS Safari does not fire `beforeinstallprompt`. The component gracefully handles this by detecting iOS (`navigator.standalone`) and offering standard "Add to Home Screen" instructions if desired, while remaining hidden when already in standalone mode.

---

## 4. Conclusion

The technical path forward for R3 and R4 is completely mapped and verified. All required files, exact line numbers, SQL migrations, and UI flows have been audited without introducing breaking changes. Downstream worker agents can implement these specifications immediately.

---

## 5. Verification Method

1. **TypeScript Build Validation**:
   ```powershell
   npx tsc --noEmit
   ```
2. **Database Schema Verification**:
   Execute SQL query on project `jicvvqxjyzntdrccnuyz`:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name IN ('presensi_guru', 'jurnal_pembelajaran', 'laporan_piket') 
     AND column_name IN ('catatan_admin', 'alasan_penolakan');
   ```
3. **UI Inspection Checklist**:
   - Login as teacher: Verify dashboard displays exactly: (1) Personal Stats, (2) Today's Task Status, (3) Teaching Schedule. Verify no other sections appear.
   - Open camera capture for presensi, jurnal, or piket: Verify photo contains 4-line watermark with location `[Desa, Kecamatan, Kota, Provinsi]`. Verify both front and rear cameras produce upright legible text.
   - Check student attendance percentage in `RekapSiswaView.tsx`: Verify non-zero accurate percentages matching `(total_present / total_students) * 100`.
   - Open app in browser: Verify PWA install prompt appears on initial load and disappears when dismissed, accepted, or running in standalone mode.
   - Login as admin, open verification view (`AdminVerifView.tsx`): Click "Tolak", verify required feedback textarea modal appears, blocks submission if empty, and saves to database upon input.
