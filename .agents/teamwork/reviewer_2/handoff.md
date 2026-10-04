# Adversarial Security & Quality Review Report (Reviewer 2)

**Agent:** `reviewer_2`  
**Roles:** reviewer, critic  
**Target Work:** Worker Handoffs M1, M2, M3 against ORIGINAL_REQUEST.md & orchestrator_13/PROJECT.md  
**Verdict:** **APPROVE**  
**Date:** 2026-10-04  

---

## 1. Observation

Direct observations from source inspection and execution:

1. **R1: Access Control to Picket Module (`src/lib/workflow.ts`, `src/components/AppScreen.tsx`, `src/components/PiketView.tsx`)**:
   - `src/lib/workflow.ts:350-380`: `getGuruDailyState` queries `penugasan_piket` (`hari = selectedHari`, `tipe_petugas = 'Guru'`, matching `guru_id`, `guru_nip`, or normalized `nama_guru`). Only matches set `state.isPiket = true`. Fallback checks `jadwal_piket.daftar_guru`.
   - `src/components/AppScreen.tsx:196`: `const [isPiketHariIni, setIsPiketHariIni] = useState<boolean>(isAdmin || isSuperadmin);`. Regular teachers default to `false` at initial mount.
   - `src/components/AppScreen.tsx:458-468`: `handleNavigation` explicitly verifies `!isAdmin && !isSuperadmin && !isPiketHariIni` and rejects unauthorized navigation with `Swal.fire({ icon: 'warning', title: 'Akses Ditolak' })`.
   - `src/components/AppScreen.tsx:714-735`: The view render condition enforces `currentView === 'view-piket' && (isAdmin || isSuperadmin || isPiketHariIni ? <PiketView user={user} /> : <div className="glass-card ...">Akses Terblokir</div>)`. `<PiketView>` is not mounted if unauthorized.
   - `src/components/PiketView.tsx:1153-1169`: Defense-in-depth within `<PiketView>`: if `isGuru && dailyState && !dailyState.isPiket && !isAdmin`, it renders `<Bukan Jadwal Piket Hari Ini>` locking out all tabs (Beranda, Scan, Lapor, Rekap).

2. **R2: Class Attendance Recap Access (`src/components/AppScreen.tsx`, `src/components/RekapSiswaView.tsx`, `src/components/GuruJurnal.tsx`)**:
   - `src/components/AppScreen.tsx:541`: Sidebar menu item `view-rekap-siswa` is only injected if `isWaliKelas === true`.
   - `src/components/AppScreen.tsx:470-480`: `handleNavigation` blocks `targetId === 'view-rekap-siswa'` for non-wali-kelas teachers with `Swal.fire` warning.
   - `src/components/AppScreen.tsx:684-700`: `currentView === 'view-rekap-siswa'` renders `<RekapSiswaView user={user} assignedKelas={assignedKelas} />` only if `isAdmin || isSuperadmin || isWaliKelas`; otherwise renders `Akses Terblokir`.
   - `src/components/RekapSiswaView.tsx:355-389`: `allowedClasses` restricts regular teachers strictly to assigned classes (`propAssignedKelas`, `user.penugasan.kelas_binaan`, `user.wali_kelas`, and `waliKelasList`). `tarikRekap` clamps `targetKelas` to `allowedClasses[0]` and rejects out-of-boundary class queries with an error modal.
   - `src/components/RekapSiswaView.tsx:920-948` & `1208-1225`: In Tab 1 (Gerbang) and Tab 2 (Rekap), non-admin teachers cannot select unauthorized classes. If only 1 class is assigned, the selector is disabled or replaced with static text.
   - `src/components/GuruJurnal.tsx:402-480`: Guru Mapel retains independent query on `presensi_siswa` for their assigned class and date (`status = 'datang'`), with manual override and live attendance sync to `absensi`.

3. **R3: Print Formatting, Watermark & Robot Hiding (`src/app/globals.css`, `AIAssistant.tsx`, `DokumenView.tsx`, `RekapJurnalView.tsx`, `PrintHeader.tsx`)**:
   - `src/app/globals.css:312-328`: Non-printable selector includes `[data-tour="ai-assistant-btn"], [aria-label*="Asisten AI"], [role="dialog"][aria-label*="Asisten AI"], .fa-robot, button.fixed, div.fixed:not(.sipjam-print-watermark)`.
   - `src/components/AIAssistant/AIAssistant.tsx:176,191`: Trigger button and chat panel include `no-print print:hidden`.
   - `src/app/globals.css:272-291`: `.sipjam-print-watermark` is styled with `display: flex !important;`, `position: fixed;`, `top: 50%;`, `left: 50%;`, repeating across printed pages in CSS Paged Media. Excluded from `div.fixed` removal via `:not(.sipjam-print-watermark)`.
   - `src/components/PrintHeader.tsx:178-184`: `createPortal(<div className="sipjam-print-watermark"><span>DOKUMEN ASLI</span><span>{sekolah}</span></div>, document.body)` ensures DOM presence whenever `PrintHeader` is mounted.
   - `src/components/DokumenView.tsx:754,1515-1625`: Renders `<PrintHeader user={user} sekolahId={user?.sekolah_id} />`, print subheader, orientation toggle, `no-print` on web cards, and clean print-only table with `px-2 py-1.5 border border-black`.
   - `src/components/RekapJurnalView.tsx:661-673`: Hides GPS geotag coordinates in printout via `no-print`. Standardizes table padding to `px-2 py-1.5 print:p-1.5` and header to `print:bg-gray-100`.

4. **R4: Student QR ID Card Download (`src/lib/qrSiswa.ts`, `src/components/AdminDataView.tsx`)**:
   - `src/lib/qrSiswa.ts:736-995`: `generateStudentCardCanvas` draws high-resolution 600x960 px portrait cards via HTML5 Canvas 2D API (gradient emerald header `#0B4619` -> `#166534`, gold accent `#EAB308`, school name, 210x210 px QR matrix in `#0B4619`, ID badge, student metadata box with NISN, Kelas, Sekolah, Gender, and instructions footer).
   - `src/lib/qrSiswa.ts:1001-1030`: `downloadStudentCardPng` exports PNG DataURL and triggers browser download named `Kartu_Presensi_${safeName}_${safeId}.png`.
   - `src/components/AdminDataView.tsx:2023-2030`: Action button "Download Kartu" is embedded per student in `Data_Siswa` cards, along with preview modal options to download PNG or print/save as PDF.

5. **Test & Build Verification Results**:
   - `npx tsc --noEmit`: Exited with code 0 (0 type errors).
   - `npm test`: Exited with code 0 (all test suites passed, including QR generation, multi-kiosk concurrency, and wali sync).
   - `.agents/teamwork/worker_m2/verify_m2.ts`: 25/25 checks passed.
   - `.agents/teamwork/worker_m3/test_card.ts`: 100% passed.
   - `.agents/teamwork/reviewer_2/adversarial_probe.ts`: 18/18 checks passed.
   - `npm run build`: Production build succeeded in 1.47s with Next.js Turbopack.

---

## 2. Logic Chain: Adversarial Stress Test & Attack Vector Probes

### Probe 1: Can a non-picket teacher bypass R1 via direct URL, state tampering, or timing race condition?
- **Vector A — Direct URL tampering (`?view=view-piket`)**:
  - Initial state `isPiketHariIni` is `false` for non-admin teachers (`isAdmin || isSuperadmin` is `false`).
  - When URL contains `?view=view-piket`, `AppScreen` initializes `currentView = 'view-piket'`.
  - Frame 0 render: `currentView === 'view-piket' && (isAdmin || isSuperadmin || isPiketHariIni ? <PiketView /> : <Akses Terblokir />)`.
  - Because `isPiketHariIni` is `false`, `AppScreen` immediately renders `<Akses Terblokir>`. `<PiketView>` is never mounted.
  - Background async check `getGuruDailyState` confirms `state.isPiket = false`. State remains `false`.
- **Vector B — In-memory state tampering / History navigation**:
  - If teacher pushes history state or triggers `popstate`, `handleNavigation('view-piket')` intercepts the call, evaluates `!isAdmin && !isSuperadmin && !isPiketHariIni`, and displays an `Akses Ditolak` SweetAlert modal without transitioning.
- **Vector C — Race condition / DevTools spoofing**:
  - Even if a malicious user force-mounted `<PiketView user={user} />` via React DevTools, `<PiketView>` runs its own independent query: `getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id).then(setDailyState)`.
  - As soon as `dailyState` resolves, lines 1153-1169 intercept the render and return `<Bukan Jadwal Piket Hari Ini>`, completely tearing down the UI.
- **Conclusion**: R1 cannot be bypassed. Triple-layer protection (Sidebar filter + Navigation Guard + Render Guard + Component-level lock) holds under all tested vectors.

### Probe 2: Can a non-wali-kelas teacher bypass R2 to see full student attendance recaps of other classes?
- **Vector A — Direct navigation to `view-rekap-siswa`**:
  - Non-wali-kelas teachers do not see the menu item in the sidebar (`...(isWaliKelas ? [...] : [])`).
  - Attempting to navigate via URL or `handleNavigation` is blocked by `AppScreen` (`Swal.fire Akses Ditolak` and `<Akses Terblokir>` card).
  - Inside `RekapSiswaView`, if `masterLoaded && !isWaliKelasUser`, it renders an internal `<Akses Terblokir>` screen.
- **Vector B — Dropdown manipulation in Tab 1 (Gerbang) & Tab 2 (Rekap)**:
  - If a teacher is assigned as Wali Kelas for Class 7A, `allowedClasses` contains only `['7A']`.
  - In Tab 1, the class selector is replaced with static read-only text `Kelas 7A (Wali Kelas)`. No dropdown exists.
  - In Tab 2, the `<select>` element is `disabled={true}` with only their assigned class.
  - If the user tampers with the DOM `<select>` value in DevTools to select "9B", `tarikRekap` executes:
    `const targetKelas = !isAdmin && allowedClasses.length > 0 ? (allowedClasses.includes(kelas) ? kelas : allowedClasses[0]) : kelas;`
    `targetKelas` is clamped back to `'7A'`. If invalid, `Swal.fire('Akses Ditolak', 'Anda hanya dapat melihat rekapitulasi kehadiran untuk kelas binaan Anda.')` halts execution.
- **Conclusion**: Full class attendance recaps cannot be accessed by non-wali-kelas teachers, nor can a wali kelas access other classes.

### Probe 3: Does Guru Mapel retain 100% attendance visibility for their scheduled classes?
- In `src/components/GuruJurnal.tsx:402-421`, Guru Mapel loading their teaching session queries `presensi_siswa` for the current subject, class, and date (`status = 'datang'`).
- Arrived students are identified in the KBM attendance list with arrival time badges.
- Guru Mapel has full autonomy to apply gate arrivals (`handleApplyPiketAttendance`), manually change statuses (H/I/S/A), and submit KBM logs with automatic sync to `absensi`.
- **Conclusion**: Guru Mapel visibility and management for their scheduled classes remains 100% intact and unaffected.

### Probe 4: Are there any print preview cases where the robot or floating buttons appear? Does the school watermark EVER disappear on print?
- **Robot & Floating Buttons**:
  - Elements have utility classes `no-print print:hidden` and are targeted by `@media print` CSS:
    `[data-tour="ai-assistant-btn"], [aria-label*="Asisten AI"], [role="dialog"][aria-label*="Asisten AI"], .fa-robot, button.fixed, div.fixed:not(.sipjam-print-watermark) { display: none !important; visibility: hidden !important; height: 0 !important; }`.
  - Both CSS selectors and utility classes provide double protection.
- **School Watermark**:
  - The watermark container `.sipjam-print-watermark` is excluded from fixed element removal via `:not(.sipjam-print-watermark)`.
  - In `@media print`, `.sipjam-print-watermark` is explicitly declared `display: flex !important;` with `position: fixed; top: 50%; left: 50%;`.
  - In CSS Paged Media, `position: fixed` causes the watermark to repeat cleanly across every printed page.
  - If school config is loading or absent, fallback `'SMA NIZAMUDIN'` ensures text is never empty.
- **Conclusion**: Robot and floating UI elements are reliably hidden on print. The school watermark is strictly preserved on every page.

### Probe 5: Can a student card be downloaded with missing name, school name, or corrupted QR code?
- **Missing name (`nama_siswa = null / undefined / ""`)**:
  - `(student.nama_siswa || 'Siswa').trim()` falls back gracefully to `'Siswa'`. File download defaults to `Kartu_Presensi_Siswa_${id}.png`.
- **Missing school name (`schoolName = null / undefined / ""`)**:
  - `(schoolName || 'SIPJAM').trim().toUpperCase()` falls back to `'SIPJAM'` in header and identity rows.
- **Missing NISN and QR Code**:
  - `getStudentQrIdentifier` falls back safely to student UUID `student.id`.
  - UUID is encoded via pure TypeScript QR generator in Version 3 (29x29 matrix).
- **Long strings (Overflow attack)**:
  - Header adjusts font sizes dynamically (24px -> 21px -> 18px).
  - Student name adjusts font sizes dynamically (24px -> 22px -> 19px).
  - Identity row values exceeding 32 characters are truncated with ellipsis `...`.
- **Conclusion**: The card generator handles all degenerate and overflow inputs without crashing or producing broken files.

### Probe 6: Integrity Audit
- Checked for hardcoded test scores or simulated responses: **None**.
- Checked for dummy/facade implementations: **None**. Reed-Solomon polynomial math and HTML5 Canvas rendering are real and functional.
- Checked for test environment bypasses (`process.env.NODE_ENV === 'test'` in `src/`): **None found**.
- Checked for fabricated verification logs: **None**. All tests executed directly in the live environment.

---

## 3. Caveats

- **Admin/Superadmin bypasses**: Intentionally designed per requirements; Admins maintain global oversight over all picket modules, school classes, and student cards.
- **Browser Download API**: PNG downloads trigger client-side via DOM anchor tags (`<a download="...">`); in headless test environments lacking a DOM, functions return `false` cleanly without throwing exceptions.

---

## 4. Conclusion

All requirements (R1, R2, R3, R4) are robustly implemented with zero integrity violations.
The implementation successfully withstood all adversarial attack vectors:
1. Picket module access is secured with triple-layer defense against direct URL and state tampering.
2. Attendance recaps are strictly bound to Wali Kelas for assigned classes, while Guru Mapel maintains complete subject attendance autonomy.
3. Print formatting matches administrative quality, robot and floating widgets are completely suppressed, and the school watermark is reliably preserved across all printed pages.
4. Student QR card generator is resilient to missing data and edge cases, producing clean 600x960 px digital cards.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce the adversarial verification:

1. **Adversarial Attack Probe Suite**:
   ```powershell
   npx tsx .agents/teamwork/reviewer_2/adversarial_probe.ts
   ```
   *Expected result: 18/18 checks pass with 0 failures.*

2. **Milestone 2 Print & Watermark Verification**:
   ```powershell
   npx tsx .agents/teamwork/worker_m2/verify_m2.ts
   ```
   *Expected result: 25/25 checks pass.*

3. **Milestone 3 QR Card Verification**:
   ```powershell
   npx tsx .agents/teamwork/worker_m3/test_card.ts
   ```
   *Expected result: 100% passed.*

4. **TypeScript Compilation Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result: Exit code 0, 0 errors.*

5. **Full Regression Test Suite**:
   ```powershell
   npm test
   ```
   *Expected result: All test suites pass.*

6. **Production Build**:
   ```powershell
   npm run build
   ```
   *Expected result: Production build succeeds.*
