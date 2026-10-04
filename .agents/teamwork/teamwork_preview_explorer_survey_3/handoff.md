# Handoff Report: Explorer Survey 3 (Student Attendance Across Views)

## 1. Observation

### A. `src/components/PiketView.tsx` Analysis
1. **School Data & `mode_presensi_siswa` Acquisition**:
   - `PiketView` is mounted in `src/components/AppScreen.tsx:653` as `<PiketView user={user} />`.
   - Prop signature: `export default function PiketView({ user }: { user: any })` (`PiketView.tsx:26`).
   - The `user` object contains `user.sekolah_id` (UUID of the user's tenant school).
   - Currently, `PiketView.tsx` has **no query** to table `public.sekolah` and does not yet hold a `mode_presensi_siswa` state.
   - Reference pattern: In `GuruJurnal.tsx:245-265`, school configuration (`mode_jurnal`) is fetched directly on mount:
     ```tsx
     const { data } = await supabase
       .from('sekolah')
       .select('mode_jurnal')
       .eq('id', user.sekolah_id)
       .single();
     ```
     Similarly, `PiketView` can query `mode_presensi_siswa` from `sekolah` by `user.sekolah_id`, defaulting to `'qr'` if null or not yet set.

2. **Loading Student List, Classes, and Current Attendance**:
   - `allStudents` and `kelasList`: Loaded in `fetchStudents` (`PiketView.tsx:447-482`):
     ```tsx
     let query = supabase.from('data_siswa').select('*').order('kelas', { ascending: true }).order('nama_siswa', { ascending: true });
     if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
     const { data } = await query;
     ```
     `kelasList` is derived as `[...new Set(data.map(s => s.kelas).filter(Boolean))] as string[]`.
     `activeKelas` is initialized to `uniqueKelas[0]`.
   - `todayScans` and `scanSummary`: Loaded in `fetchTodayScanData` (`PiketView.tsx:187-199`):
     - `getTodayPresensiSummary(supabase, user.sekolah_id, todayStr)` (`qrSiswa.ts:586-617`) counts `totalDatang`, `totalPulang`, and `totalUnik`.
     - `getRecentPresensiSiswa(supabase, user.sekolah_id, todayStr, 150)` (`qrSiswa.ts:654-675`) fetches records from `public.presensi_siswa` ordered by `timestamp DESC`.
   - Realtime & polling: Lines 201-235 set up a Supabase Realtime channel (`presensi_kiosk_${user.sekolah_id}`) on `public.presensi_siswa` plus an 8-second interval poll to ensure live multi-station synchronization.

3. **Existing QR Scanning Operation (Camera + USB HID)**:
   - Tab rendering: Activated under `activeTab === 'scan'` (`PiketView.tsx:1265-1738`). Tab button at line 1068: `<button onClick={() => setActiveTab('scan')}>... Scan QR Siswa</button>`.
   - Dual Input Modes:
     - **Hardware USB HID scanner**: `<input ref={usbInputRef} />` (lines 1398-1410) with automatic focus on mount and auto re-focus on blur (lines 237-264). Pressing Enter triggers form submit → calls `handleProcessScan(code)`.
     - **Browser Camera**: Uses `navigator.mediaDevices.getUserMedia` (`facingMode: 'environment'`, 1280x720) with frame polling every 250ms via native `BarcodeDetector` (formats: `['qr_code', 'code_128', 'ean_13', 'code_39']`). When a code is detected, debounces and calls `handleProcessScan(code)`.
   - Scan Processing (`handleProcessScan`, lines 353-434):
     1. Resolves student code using `resolveStudentByCode(supabase, code, user?.sekolah_id)` (matching `qr_code`, `id`, or `nisn` in `data_siswa`).
     2. Records attendance via `recordPresensiSiswa(supabase, { siswa, status: scanMode, sekolahId: user?.sekolah_id, deviceId })`.
     3. Plays audio feedback via Web Audio API synthesizer (`playAudioFeedback('success' | 'warning' | 'error')`).
     4. Sets `lastScanResult` state for the visual feedback student card (lines 1489-1583).
     5. Refreshes live log and summary via `fetchTodayScanData()`.
   - Kiosk Concurrency: Supports station IDs (`kiosk-1` through `kiosk-10`, stored in `localStorage: sipjam_piket_kiosk_id`).

4. **Manual Mode UI Requirements (`mode_presensi_siswa === 'manual'`)**:
   - Tab header: Tab button title dynamically reflects mode (e.g. "Presensi Siswa" / "Presensi Manual" instead of "Scan QR Siswa").
   - Interface display: Replaces the QR scanner hardware kiosk input and camera card (lines 1267-1590) with a class-based manual attendance checklist:
     - **Filter by Class**: Dropdown or pill selector (`kelasList`, e.g. `selectedManualKelas` or using `activeKelas`).
     - **Student Search**: Real-time search filter for student name or NISN.
     - **Student List Table / Cards**:
       - Lists all students in the selected class (`allStudents.filter(s => s.kelas === activeKelas)`).
       - Per-student row displays: Number, Student Name, NISN, Gender.
       - **Datang Column**:
         - If already recorded as `datang` in `presensi_siswa` today: displays green badge/checkmark with time (e.g. `✓ 07:15 WITA`).
         - If not yet recorded: Guru piket clicks "Tandai Datang" (button or checkbox).
       - **Pulang Column**:
         - If already recorded as `pulang` in `presensi_siswa` today: displays blue badge/checkmark with time (e.g. `✓ 14:05 WITA`).
         - If not yet recorded: Guru piket clicks "Tandai Pulang" (button or checkbox).
   - **Saving Records**:
     - Action invokes `recordPresensiSiswa` (or direct Supabase insert into `public.presensi_siswa`):
       ```ts
       await recordPresensiSiswa(supabase, {
         siswa: student,
         status: 'datang', // or 'pulang'
         sekolahId: user?.sekolah_id,
         deviceId: 'manual-piket'
       });
       ```
     - Payload written to `presensi_siswa` is **100% identical** in columns and structure to QR scan records:
       `sekolah_id`, `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal`, `status`, `jam`, `timestamp`, `device_id` (e.g. `'manual'`).
     - Table constraint `uq_presensi_siswa_status UNIQUE (sekolah_id, tanggal, siswa_id, status)` prevents accidental duplicate marks.
   - **Live Log & Stats**: The summary stat cards (Total Datang, Total Pulang, Total Unik) and Today's Attendance Log table remain visible below the manual checklist, updating in real time.

5. **Retention of QR Scanner When `mode_presensi_siswa === 'qr'`**:
   - When `mode_presensi_siswa === 'qr'`, the tab retains all existing scanner elements: Kiosk stasiun dropdown, scan mode toggle (Datang / Pulang), USB HID auto-focus input, browser camera stream with BarcodeDetector overlay, and visual feedback student card.

---

### B. `src/components/RekapSiswaView.tsx` Analysis
1. **Reading `presensi_siswa`**:
   - **Wali Kelas View** (`RekapSiswaView.tsx:128-145`):
     ```tsx
     let pQ = supabase
       .from('presensi_siswa')
       .select('*')
       .eq('tanggal', waliTanggal)
       .eq('kelas', activeWaliKelas.kelas);
     if (user?.sekolah_id) pQ = pQ.eq('sekolah_id', user.sekolah_id);
     const { data: gateData } = await pQ;
     ```
     Maps `datang` and `pulang` records to `waliGateLogs[nisn || siswa_id]`.
   - **Gerbang Piket Tab** (`RekapSiswaView.tsx:183-215`):
     ```tsx
     let pQ = supabase
       .from('presensi_siswa')
       .select('*')
       .eq('kelas', gerbangKelas)
       .eq('tanggal', gerbangTanggal);
     if (user?.sekolah_id) pQ = pQ.eq('sekolah_id', user.sekolah_id);
     const { data: gateLogs } = await pQ;
     ```
     Matches student with `(p.siswa_id === siswa.id || (siswa.nisn && p.nisn === siswa.nisn))` and assigns `jamDatang`, `jamPulang`, `hasDatang`, `hasPulang`, `deviceDatang`, `devicePulang`.
2. **Absence of Hardcoded QR Assumptions**:
   - Neither query filters on QR code fields or `device_id`.
   - Logic checks only `status === 'datang'` and `status === 'pulang'`. Records inserted in manual mode populate `presensi_siswa` with the same values and work seamlessly.
   - Only cosmetic reference is a static UI subtitle at line 843: `"Data kedatangan harian siswa tercatat melalui pos gerbang/piket QR."` (recommend tweaking to `"Data kedatangan harian siswa tercatat melalui pos gerbang/piket."` for neutral phrasing).
3. **Multi-Tenant Isolation**:
   - Lines 114, 125, 133, 180, 188 explicitly filter by `sekolah_id = user.sekolah_id`.
   - Database table `public.presensi_siswa` has RLS enabled with tenant isolation policy (`sekolah_id = public.get_auth_user_sekolah_id()`). School A cannot access School B data.

---

### C. `src/components/GuruJurnal.tsx` Analysis
1. **Reading `presensi_siswa`**:
   - `fetchStudents` (`GuruJurnal.tsx:403-421`):
     ```tsx
     let pQuery = supabase
       .from('presensi_siswa')
       .select('siswa_id, nisn, nama_siswa, jam, status')
       .eq('kelas', kelas)
       .eq('tanggal', tgl)
       .eq('status', 'datang');
     if (user?.sekolah_id) pQuery = pQuery.eq('sekolah_id', user.sekolah_id);
     const { data: pData } = await pQuery;
     ```
     Populates `piketAttendance[nisn || siswa_id] = { jam: jamStr }`.
   - `handleApplyPiketAttendance` (`GuruJurnal.tsx:443-457`):
     Syncs piket arrivals to teaching journal: iterates `students`, checks `piketAttendance[s.nisn] || piketAttendance[s.id]`, and sets `newAbsensi[s.nisn] = 'H'`.
   - UI Badges (`GuruJurnal.tsx:1105-1113`):
     - If in `piketAttendance`: Displays `✓ Hadir di Sekolah (Piket {pRec.jam})`.
     - If not: Displays `Belum Scan Piket`.
2. **Absence of Hardcoded QR Assumptions**:
   - The query filters solely on `kelas`, `tanggal`, `status = 'datang'`, and `sekolah_id`.
   - Does not inspect `device_id` or require a QR scan origin.
   - Manual marks from `PiketView` create rows with `status = 'datang'`, so `GuruJurnal.tsx` automatically receives and synchronizes them without any change to its query logic.
   - Minor recommendation: The badge text `"Belum Scan Piket"` at line 1111 can optionally be generalized to `"Belum Presensi Piket"` to cleanly match both QR and manual schools.
3. **Multi-Tenant Isolation**:
   - Lines 391, 399, 409 explicitly filter queries by `user?.sekolah_id`. Multi-tenant safety is 100% verified.

---

### D. Superadmin Configuration Context (`SuperadminView.tsx` & Schema)
- Migration requirement R1:
  Add `mode_presensi_siswa TEXT DEFAULT 'qr' CHECK (mode_presensi_siswa IN ('qr', 'manual'))` to `public.sekolah`.
- Superadmin UI requirement R2:
  In `SuperadminView.tsx`:
  - `handleAddSchool` (lines 236, 253): Include `mode_presensi_siswa` with default `'qr'`.
  - `handleEditSchool` (lines 331, 353, 370): Include `<select id="swal-edit-mode-presensi-siswa">` with options `'qr'` (QR Code) and `'manual'` (Manual Satu per Satu).
  - School table listing (lines 1076-1084): Add a badge displaying "Presensi: QR" or "Presensi: Manual".

---

## 2. Logic Chain

1. **School Mode Propagation**:
   - Observation 1A shows `PiketView` receives `user` with `user.sekolah_id`.
   - Querying `mode_presensi_siswa` from `sekolah` by `user.sekolah_id` directly determines whether `PiketView` renders the QR kiosk scanner or the manual student checklist.
   - Defaulting to `'qr'` ensures zero breaking changes or regressions for existing schools.

2. **Manual Mode Implementation in `PiketView`**:
   - Observation 1A(2) shows `allStudents` and `kelasList` are already queried and stored in state in `PiketView`.
   - Thus, rendering students filtered by class requires no new API calls or external dependencies.
   - Observation 1A(4) & Migration 20261003 show that `public.presensi_siswa` already defines the exact schema (`sekolah_id`, `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal`, `status`, `jam`, `timestamp`, `device_id`) and unique constraint `(sekolah_id, tanggal, siswa_id, status)`.
   - Marking "Datang" or "Pulang" manually inserts with `status: 'datang' | 'pulang'` and `device_id: 'manual'`, perfectly satisfying requirement R3.

3. **Interoperability with `RekapSiswaView` and `GuruJurnal`**:
   - Observations 1B and 1C prove that both `RekapSiswaView` and `GuruJurnal` read `presensi_siswa` solely by `(sekolah_id, kelas, tanggal, status)`.
   - Because manual marking writes identical records to `presensi_siswa`, both downstream views immediately read manual attendance records with zero database schema alterations or query changes.

4. **Multi-Tenant Integrity**:
   - All examined queries across `PiketView`, `RekapSiswaView`, and `GuruJurnal` include `.eq('sekolah_id', user.sekolah_id)`.
   - Database RLS on `presensi_siswa` enforces tenant partition. Cross-school leakage is impossible.

---

## 3. Caveats

1. **Cache / Freshness on Superadmin Change**:
   If a Superadmin updates `mode_presensi_siswa` in `SuperadminView`, a logged-in Guru Piket will see the updated mode upon page refresh or view re-mount. Adding `mode_presensi_siswa` to the sync listener or fetching it on view mount ensures instant reflection.
2. **Cosmetic Label Consistency**:
   In `RekapSiswaView.tsx:843` and `GuruJurnal.tsx:1111`, static labels say `"pos gerbang/piket QR"` and `"Belum Scan Piket"`. Changing them to neutral terms (`"pos gerbang/piket"` and `"Belum Presensi Piket"`) prevents confusing users in manual-mode schools.
3. **Accidental Manual Mark Reversal**:
   In manual mode, a guru piket might accidentally mark a student as "Datang" or "Pulang". Implementing a toggle or delete option (with confirmation) allows reverting accidental marks while respecting the unique database constraint.

---

## 4. Conclusion

The student attendance architecture across SIPJAM is clean, decoupled, and primed for the dual-mode configuration:
1. **Single Source of Truth**: `public.sekolah.mode_presensi_siswa` (`'qr'` vs `'manual'`, default `'qr'`).
2. **Modular PiketView**: Tab `'scan'` (or dynamically titled "Presensi Siswa") easily switches between the existing QR Kiosk Scanner (camera + USB HID) when `mode_presensi_siswa === 'qr'`, and the Manual Class Checklist when `mode_presensi_siswa === 'manual'`.
3. **Identical Storage**: Both modes store records in `public.presensi_siswa` using the identical columns and unique constraints.
4. **Zero Regressions**: `RekapSiswaView` and `GuruJurnal` require no query modifications; they seamlessly reflect student presence whether recorded via QR scan or manual mark.
5. **Multi-tenant isolation**: Strictly preserved across all views via `user.sekolah_id` and database RLS.

---

## 5. Verification Method

1. **TypeScript Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   Must compile with 0 errors.

2. **Static Code Inspection**:
   - In `src/components/PiketView.tsx`: Verify condition `mode_presensi_siswa === 'manual'` renders student list per class with Datang and Pulang action buttons/checkboxes, and `mode_presensi_siswa === 'qr'` retains the camera and USB HID kiosk.
   - In `src/components/RekapSiswaView.tsx`: Verify queries on `presensi_siswa` work for both modes without QR restrictions.
   - In `src/components/GuruJurnal.tsx`: Verify `piketAttendance` accurately captures manual and QR `datang` records.

3. **End-to-End Build**:
   ```powershell
   npm run build
   ```
   Must successfully produce the Next.js production build.
