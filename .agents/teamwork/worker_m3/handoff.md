# Handoff Report: Milestone 3 (R4) - Download Kartu Presensi QR Siswa (Admin)

## 1. Observation
1. **Source Code Modifications**:
   - `src/lib/qrSiswa.ts` (lines 675-870):
     - Added `GenerateStudentCardParams` and `PrintStudentCardParams` interfaces.
     - Implemented `drawCanvasRoundRect(ctx, x, y, w, h, r)` helper supporting native `ctx.roundRect` with quadratic curve fallback.
     - Implemented `generateStudentCardCanvas({ student, schoolName, qrIdentifier })`:
       - Fixed canvas dimensions: 600 x 960 px.
       - Emerald theme gradient header (`#0B4619` to `#166534`) with gold accent line (`#EAB308`).
       - Header typography: "KARTU PRESENSI DIGITAL", school name (`schoolName`), and subtitle "Sistem Informasi Presensi Siswa".
       - White rounded QR container box (270x270 px) with drop shadow and border.
       - Sharp QR matrix generated from `generateQrMatrix(qrIdentifier)` in `#0B4619` color (210x210 px).
       - Monospace badge `ID: ${qrIdentifier}`.
       - Student Identity box (510x315 px): full name (`student.nama_siswa`), status badge ("SISWA AKTIF"), structured metadata grid for NISN (`student.nisn`), Kelas (`student.kelas`), Sekolah (`schoolName`), Gender (`student.gender`).
       - Footer: instructions "Tunjukkan kartu ini pada scanner saat presensi datang & pulang" and branding "SIPJAM • Dokumen Resmi Presensi" with bottom emerald accent bar.
       - Built-in graceful fallback for non-DOM/Node test environments.
     - Implemented `downloadStudentCardPng({ student, schoolName, qrIdentifier })`:
       - Calls `generateStudentCardCanvas`, exports DataURL via `canvas.toDataURL('image/png')`.
       - Sanitizes filename: `Kartu_Presensi_${safeName}_${safeId}.png`.
       - Triggers browser file download via temporary anchor element.
     - Implemented `printStudentQrCardWithSchool({ student, schoolName, qrSvg, qrIdentifier })`:
       - Enhanced popup print window with school name in header, formatted card layout, and automatic `window.print()`.

   - `src/components/AdminDataView.tsx`:
     - Imported `downloadStudentCardPng` and `printStudentQrCardWithSchool` from `@/lib/qrSiswa`.
     - Added `schoolName` state initialized with `user?.sekolah_nama || 'SIPJAM'`.
     - Added `useEffect` hook to fetch official school name from Supabase `sekolah` table (`user.sekolah_id`).
     - Added `handleDownloadStudentCard(student)` triggering PNG download with feedback toast.
     - Updated `printStudentQrCard` to invoke `printStudentQrCardWithSchool`.
     - Enhanced `handleShowStudentQr(student)` modal dialog with school name header, "Download Gambar (PNG)" deny button, and "Cetak / Simpan PDF" confirm button.
     - Updated `handlePrintBatchQrCards` to include `schoolName` in each card header and in window title.
     - Added "Download Kartu" action button in student card list:
       `<button type="button" onClick={() => handleDownloadStudentCard(item)} className="btn-click text-[11px] font-bold text-emerald-600 ..."><i className="fa-solid fa-download text-[10px]"></i> Download Kartu</button>`

2. **Verification Outputs**:
   - `npx tsx tests/qrSiswa.test.ts`: 35/35 tests passed successfully.
   - `npx tsx .agents/teamwork/worker_m3/test_card.ts`: 100% passed (dimensions 600x960, valid dataUrl, safe Node execution).
   - `npx tsc --noEmit`: 0 errors.
   - `npm run build`: Production build succeeded in 4.6s with Turbopack.

## 2. Logic Chain
1. **Zero-Dependency Mandate**:
   - Instead of pulling third-party packages (`jspdf`, `qrcode`, `html2canvas`), the implementation utilizes the existing pure TypeScript QR generator (`generateQrMatrix`) and native HTML5 Canvas 2D API (`canvas.getContext('2d')`).
   - This ensures 100% synchronous rendering, zero network round-trip, no CORS/tainted canvas issues, and zero bundle size bloat.
2. **High-Resolution Portrait ID Ratio**:
   - Canvas dimensions of 600 x 960 px provide a standard 1:1.6 aspect ratio suitable for student ID cards, lanyards, and digital mobile storage.
   - Modules are drawn directly via `fillRect` with subpixel overlap (+0.5px), guaranteeing razor-sharp edges when printed or scanned.
3. **School Branding Integration**:
   - Multi-tenant school identification is preserved by querying `sekolah.nama` based on `user.sekolah_id`, falling back to `user.sekolah_nama` or `'SIPJAM'`.
   - Both the downloaded PNG cards and the browser print dialogs prominently display the school name alongside student credentials.

## 3. Caveats
- Direct PNG download triggers through client DOM `<a>` tag download attribute; in non-browser Node environments (CLI test runners), `downloadStudentCardPng` returns `false` safely without throwing an error.
- Direct PDF generation is performed natively via the browser's "Save as PDF / Simpan sebagai PDF" dialog triggered by `window.print()` in `printStudentQrCardWithSchool`, ensuring zero extra dependencies while fulfilling the PDF requirement.

## 4. Conclusion
Milestone 3 (R4) is fully implemented, strictly adhering to write boundaries (`src/lib/qrSiswa.ts` and `src/components/AdminDataView.tsx`), zero-dependency constraints, and the project interface contracts. Both single-student PNG downloads, single-student print/PDF dialogs, and batch card prints with school names are operational and verified.

## 5. Verification Method
1. **Run Unit & Canvas Tests**:
   ```bash
   npx tsx tests/qrSiswa.test.ts
   npx tsx .agents/teamwork/worker_m3/test_card.ts
   ```
2. **Type Check**:
   ```bash
   npx tsc --noEmit
   ```
3. **Production Build**:
   ```bash
   npm run build
   ```
4. **Manual Verification**:
   - Navigate to Admin -> Master Data -> Siswa.
   - Observe the "Download Kartu" button on each student card.
   - Click "Download Kartu": confirms `Kartu_Presensi_[Nama]_[NISN].png` is generated with 600x960 px resolution, school name, student credentials, and QR code.
   - Click "QR Code": confirms preview modal provides "Download Gambar (PNG)" and "Cetak / Simpan PDF" options.
