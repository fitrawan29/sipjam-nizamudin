# Review & Adversarial Verification Report: reviewer_1

**Reviewer**: `reviewer_1`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_1`  
**Date**: 2026-10-04  
**Scope**: R1 (Piket Access by Schedule), R2 (Attendance Recap Restriction for Wali Kelas vs Guru Mapel), R3 (Print Layout Alignment, Robot UI Hiding & Watermark Preservation), R4 (Student QR Card Download & Print in Admin)  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1. R1: Akses Modul Piket Sesuai Jadwal
- **`src/lib/workflow.ts` (lines 349-393)**:
  - `getGuruDailyState` queries `penugasan_piket` directly where `hari = selectedHari` (computed via `getWitaDayName(now)` in WITA timezone), `tipe_petugas = 'Guru'`, and tenant scoped `sekolah_id`.
  - Verifies match using `isTeacherPiketMatch`: matches `userId === p.guru_id`, normalized NIP `username === p.guru_nip`, and bidirectional normalized string token matching for teacher names.
  - Retains fallback to `jadwal_piket` via `isGuruDiPiket(piketHariIni.daftar_guru, namaGuru)`.
  - Sets `state.isPiket = true` upon matching.
- **`src/components/AppScreen.tsx` (lines 196, 262-286, 459-470, 535, 715-735)**:
  - State `isPiketHariIni` initialized to `isAdmin || isSuperadmin`.
  - Dynamic `useEffect` hook invokes `getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id)` for teachers, re-evaluating when `syncKey` updates upon idle resume.
  - Sidebar menu item `{ id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' }` rendered conditionally: `...(isPiketHariIni ? [{ id: 'view-piket', ... }] : [])`.
  - In `handleNavigation`, navigation to `view-piket` without picket assignment is blocked with a warning alert (`Akses Terblokir: Modul Piket hanya dapat diakses oleh Guru yang bertugas piket pada hari ini.`).
  - In view render, `currentView === 'view-piket'` renders `<PiketView user={user} />` only if `isAdmin || isSuperadmin || isPiketHariIni`. Non-assigned users are shown an "Akses Terblokir" lock screen with a button to return to Dashboard.
- **`src/components/PiketView.tsx` (lines 1153-1171)**:
  - Component-level defense: `if (isGuru && dailyState && !dailyState.isPiket && !isAdmin)` renders an informative "Bukan Jadwal Piket Hari Ini" lock screen.

### 1.2. R2: Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel
- **`src/components/AppScreen.tsx` (lines 194-195, 206-260, 469-480, 542, 763-784)**:
  - `isWaliKelas` and `assignedKelas` resolved via `user.wali_kelas`, `supabase.from('wali_kelas')`, and `data_guru.wali_kelas`.
  - Menu item `view-rekap-siswa` included in `menuItemsGuru` only if `isWaliKelas === true`.
  - Navigation to `view-rekap-siswa` blocked for non-wali-kelas teachers in `handleNavigation`.
  - View render guards `<RekapSiswaView user={user} assignedKelas={assignedKelas} />` with lock screen fallback.
- **`src/components/RekapSiswaView.tsx` (lines 355-385, 618-639, 930-945, 1205-1230)**:
  - If `masterLoaded && !isWaliKelasUser`, renders "Akses Terblokir" screen.
  - `allowedClasses` computed dynamically:
    ```ts
    const userWaliKelasString = typeof user?.wali_kelas === 'string' ? user.wali_kelas : user?.wali_kelas?.kelas;
    const rawAllowed = [propAssignedKelas, user?.penugasan?.kelas_binaan, userWaliKelasString, ...waliKelasList.map(w => w.kelas)].filter(Boolean);
    const allowedClasses = (isAdmin || user?.role === 'Admin') ? kelasList : (Array.from(new Set(rawAllowed)) as string[]);
    ```
  - For non-admin, class dropdown is locked/disabled strictly to `allowedClasses`.
  - In `tarikRekap`, query class is clamped to `allowedClasses[0]` if an unauthorized class is passed, and blocked if not in `allowedClasses`.
- **`src/components/GuruJurnal.tsx` (lines 381-450)**:
  - Verified independent subject attendance loading per session: queries `data_siswa`, `absensi`, and `presensi_siswa` (`status = 'datang'`) for the class being taught. Subject teachers retain 100% full attendance management for their KBM session.

### 1.3. R3: Format Cetak Dokumen Guru, Sembunyikan Robot UI & Pertahankan Watermark
- **`src/app/globals.css` (lines 272-291, 310-330, 488-494)**:
  - `@media print` explicitly hides:
    `[data-tour="ai-assistant-btn"]`, `[aria-label*="Asisten AI"]`, `[role="dialog"][aria-label*="Asisten AI"]`, `.fa-robot`, `[data-testid="spotlight-box"]`, `[data-testid="tooltip-card"]`, `button.fixed`, `div.fixed:not(.sipjam-print-watermark)`.
  - `@media print` explicitly preserves `.sipjam-print-watermark` with `display: flex !important; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.07;`.
  - `@media screen` hides `.print-only, .sipjam-print-watermark { display: none !important; }`.
- **`src/components/AIAssistant/AIAssistant.tsx` (lines 176, 191)**:
  - Both floating button and chat modal dialog include `no-print print:hidden`.
- **`src/components/DokumenView.tsx` (lines 19-35, 115-185, 300-380)**:
  - Integrates `<PrintHeader user={user} sekolahId={user?.sekolah_id} />`.
  - Adds standardized Print Subheader with title, teacher name, NIP, school year, and date in WITA.
  - Adds clean print-only table (`border-collapse border border-black print:text-[8pt]`, `px-2 py-1.5`, header `bg-gray-100`).
  - Hides web cards via `no-print`.
  - Mounts `<PrintSignature />` with dual signers.
- **`src/components/RekapJurnalView.tsx` (lines 710-840)**:
  - Standardized cell padding across all columns to `px-2 py-1.5 print:p-1.5`.
  - Header background set to `print:bg-gray-100`.
  - Raw GPS coordinates hidden via `no-print`.
  - Wali Kelas name and NIP autofilled in `PrintSignature`.

### 1.4. R4: Download Kartu Presensi QR Siswa (Admin)
- **`src/lib/qrSiswa.ts` (lines 675-870)**:
  - Zero-dependency HTML5 Canvas ID card generator (`generateStudentCardCanvas`): 600 x 960 px portrait resolution.
  - Renders complete identity: "KARTU PRESENSI DIGITAL", school name (`schoolName`), student name (`student.nama_siswa`), "SISWA AKTIF" badge, NISN (`student.nisn`), Kelas (`student.kelas`), Sekolah, Gender, sharp QR code matrix (`#0B4619`), monospace ID badge, and instructions.
  - Implements `downloadStudentCardPng` triggering browser PNG download with sanitized filename (`Kartu_Presensi_${safeName}_${safeId}.png`).
  - Implements `printStudentQrCardWithSchool` generating a printable popup with school branding and automatic `window.print()` (enabling browser "Save as PDF").
- **`src/components/AdminDataView.tsx` (lines 115, 875-975, 2020-2035)**:
  - Fetches school name from Supabase `sekolah` table.
  - Adds "Download Kartu" action button directly on each student card in the Data Siswa list.
  - Updates QR modal dialog with "Cetak / Simpan PDF" and "Download Gambar (PNG)" options.
  - Updates batch print view to include school branding on all cards.

### 1.5. Build & Automated Test Execution
- `npx tsc --noEmit`: Exited with code 0 (0 errors).
- `npm run build`: Production build completed successfully in 1522ms (Turbopack, all 12 static/dynamic routes compiled).
- `npm test`: All 19 test suites passed with 0 failures (including QR generation, multi-kiosk concurrency, and wali kelas sync).
- `npx tsx .agents/teamwork/worker_m2/verify_m2.ts`: 25/25 checks passed.
- `npx tsx .agents/teamwork/worker_m3/test_card.ts`: 100% checks passed.

---

## 2. Logic Chain

1. **R1 Logic Chain**:
   - The user requested restricting Picket module access strictly to teachers assigned today.
   - By querying both `penugasan_piket` (primary) and `jadwal_piket` (fallback) using WITA day name, the system ensures real-time accuracy without omitting legitimate assignments.
   - By enforcing multi-layered defenses (sidebar menu omission -> `handleNavigation` interception -> `AppScreen` view gate -> `PiketView` internal check), unauthorized access is rendered impossible through standard navigation or direct deep-linking.
   - Admins/Superadmins retain universal access (`isAdmin || isSuperadmin`).

2. **R2 Logic Chain**:
   - The user required restricting complete class attendance recaps strictly to assigned Wali Kelas, while ensuring subject teachers can still take attendance during their lessons.
   - In `AppScreen`, non-wali-kelas teachers are prevented from opening `view-rekap-siswa`.
   - In `RekapSiswaView`, `allowedClasses` locks the class dropdown strictly to the teacher's assigned class (`allowedClasses.length <= 1 ? disabled : selectable among assigned`), and `tarikRekap` clamps query parameters to prevent unauthorized class inspection.
   - In `GuruJurnal`, subject attendance during KBM runs independently on lesson schedules, ensuring subject teachers remain fully capable of recording and syncing student attendance during their classes.

3. **R3 Logic Chain**:
   - The user required print format consistency between teacher and admin modules, removal of floating UI/robot elements during print, and preservation of the school watermark.
   - By applying both Tailwind classes (`no-print print:hidden`) and CSS selectors targeting `[data-tour="ai-assistant-btn"]`, `[aria-label*="Asisten AI"]`, and `.fa-robot`, floating robot elements are eliminated in print previews.
   - By explicitly excluding `.sipjam-print-watermark` from fixed element removal (`div.fixed:not(.sipjam-print-watermark)`) and declaring `display: flex !important;`, the school watermark repeats across every page.
   - By structuring `DokumenView` with `PrintHeader`, print subheader, standardized black-bordered table cells (`px-2 py-1.5`), and `PrintSignature`, the printed curriculum report meets official administrative standards.

4. **R4 Logic Chain**:
   - The user requested Admin capability to download student ID cards featuring complete student identity and QR code.
   - By using pure HTML5 Canvas (600x960 px) and existing QR matrix math without external heavy libraries (`jspdf`, `html2canvas`), the implementation delivers instantaneous, offline-capable PNG card downloads.
   - By offering both direct PNG downloads and print popups (with native browser "Save as PDF"), both image and PDF formats are satisfied.
   - School name is queried from the tenant database and prominently displayed on all card headers.

---

## 3. Adversarial Stress-Test & Integrity Check

### 3.1. Adversarial Scenarios Evaluated
1. **Timezone & Day Boundary Fluctuation**:
   - *Scenario*: User accesses picket module near midnight UTC vs WITA.
   - *Result*: `workflow.ts` uses `getWitaDayName(now)` which adds +8 hours UTC offset, matching the school's operational timezone.
2. **Class Parameter Tampering in Rekap**:
   - *Scenario*: A teacher edits component state or DOM value to request another class.
   - *Result*: `tarikRekap` checks `!isAdmin && allowedClasses.length > 0 && !allowedClasses.includes(targetKelas)`. If tampered, it clamps to `allowedClasses[0]` or triggers an access denied alert.
3. **Print Media Watermark Suppression**:
   - *Scenario*: Global reset rules wipe out fixed elements, removing watermark.
   - *Result*: `globals.css` line 323 has `div.fixed:not(.sipjam-print-watermark)` and line 272 explicitly applies `display: flex !important;`. The watermark is preserved.
4. **Canvas Tainting or Network Dependency**:
   - *Scenario*: Third-party font or image causes tainted canvas during `.toDataURL()`.
   - *Result*: All canvas drawing commands use local system fonts and native vector graphics (`fillRect`, `roundRect`, `stroke`). No external assets are loaded into canvas, eliminating CORS/taint risks.
5. **Session Resume & Role Desync**:
   - *Scenario*: Teacher stays on page after picket duty ends or role changes.
   - *Result*: `AppScreen.tsx` listens to `visibilitychange` and increments `syncKey`, re-evaluating `getGuruDailyState` and re-verifying picket and wali kelas access.

### 3.2. Integrity Check Attestation
- **No Hardcoded Test Bypasses**: Zero mock return values, bypass branches, or hardcoded teacher/student IDs in production code.
- **Genuine Business Logic**: All database interactions use official Supabase queries with tenant scoping.
- **Zero Incomplete Facades**: UI elements, buttons, and API helpers perform complete, real actions (downloading files, printing documents, rendering tables).
- **Independent Verification**: Build, type check, and tests were independently executed and passed.

---

## 4. Caveats

- **Browser Download Security**: Direct PNG downloads via `<a download>` depend on browser permissions for file downloads. If blocked by browser settings, Admin can still use the "Cetak / Simpan PDF" button.
- **Multiple Class Assignments**: For teachers assigned as Wali Kelas for multiple classes, the dropdown displays only their assigned classes (`allowedClasses`), maintaining privacy across all other classes.
- No caveats regarding code stability or regression risk.

---

## 5. Conclusion

The implementation across Milestones 1, 2, and 3 fulfills 100% of the requirements from the user's latest dispatch (2026-10-04T07:11:46Z), strictly complies with architectural guidelines, and demonstrates high code quality with zero integrity violations.

**Verdict**: **APPROVE**

---

## 6. Verification Method

To independently verify the implementation:

1. **Run TypeScript Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.

2. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Successful compilation with Turbopack and static page generation.

3. **Run Automated Test Suites**:
   ```powershell
   npm test
   npx tsx .agents/teamwork/worker_m2/verify_m2.ts
   npx tsx .agents/teamwork/worker_m3/test_card.ts
   ```
   *Expected*: All test checks pass cleanly (100%).

4. **Inspect Source Locations**:
   - `src/lib/workflow.ts:349-393`: Picket assignment matching against `penugasan_piket` & `jadwal_piket`.
   - `src/components/AppScreen.tsx:459-470, 715-735, 763-784`: Guard rails for picket and wali kelas access.
   - `src/components/RekapSiswaView.tsx:355-385, 1205-1230`: `allowedClasses` lock and query clamping.
   - `src/app/globals.css:272-291, 310-330`: `@media print` rules hiding robot UI and preserving watermark.
   - `src/components/DokumenView.tsx`: Standardized print table, header, and signature block.
   - `src/lib/qrSiswa.ts:675-870`: 600x960 px Canvas ID card generator and PNG downloader.
   - `src/components/AdminDataView.tsx:2020-2035`: "Download Kartu" button and preview dialog.
