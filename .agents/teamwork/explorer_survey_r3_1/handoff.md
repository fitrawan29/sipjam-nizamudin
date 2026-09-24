# Handoff Report: Requirement R3 Codebase Survey
**Agent**: Explorer 3 (`teamwork_preview_explorer`)  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3_1`  
**Report Type**: Hard Handoff (Investigation Complete)  
**Date**: 2026-09-24  

---

## 1. Observation

### Observation 1: Keterlambatan Accumulation on Teacher Dashboard
- File `src/components/HomeView.tsx` lines 107–115:
  ```ts
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const { data, error } = await supabase
    .from('presensi_guru')
    .select('keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen')
    .eq('nama_guru', user.nama)
    .gte('timestamp', firstDay)
    .eq('tipe_absen', 'Datang');
  ```
- File `src/types/database.ts` lines 966 and 972 show that `keterlambatan_detik` is integer and `timestamp` is `text`.
- Supabase SQL inspection on `presensi_guru` revealed timestamp values stored as mixed string formats:
  - `"7/16/2026 8:56:31"`
  - `"2026-09-24T09:49:30+08:00"`
  - `"2026-08-01 10:20:31"`
  - `"2026-09-10T01:39:06.554Z"`
- In Postgres text comparison: `'7/16/2026' >= '2026-09-01'` evaluates to `TRUE` because ASCII `'7'` (55) > `'2'` (50).
- `timestamp` is omitted from the `select(...)` clause in line 111 of `HomeView.tsx`, preventing frontend verification of the record date.
- `data?.forEach` loop in `HomeView.tsx` (lines 127–151) sums `p.keterlambatan_detik || 0` without verifying `status_verifikasi !== 'Ditolak'`.
- Lines 950–962 of `HomeView.tsx` render the badge:
  ```tsx
  {Math.floor(akumulasiTelat.detik / 3600)} Jam {Math.floor((akumulasiTelat.detik % 3600) / 60)} Menit {akumulasiTelat.detik % 60} Detik
  ```
  with `alpa = Math.floor(akumulasiTelat.detik / 14400)`.

### Observation 2: Camera Switch facingMode Bug
- File `src/components/CameraSelfieCapture.tsx` lines 138–153:
  ```ts
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  useEffect(() => {
    requestLocation();
    if (!capturedImage) {
      startCamera(facingMode);
    }
    return () => {
      stopCamera();
    };
  }, [capturedImage, facingMode, requestLocation, startCamera, stopCamera]);
  ```
- When `toggleFacingMode()` executes:
  1. `startCamera(nextMode)` is immediately called.
  2. `setFacingMode(nextMode)` triggers a re-render.
  3. `useEffect` detects changed dependency `facingMode` and triggers its cleanup function: `stopCamera()`.
  4. `stopCamera()` executes `track.stop()` on all tracks and sets `videoRef.current.srcObject = null`, cutting the newly opened stream mid-flight.
  5. `useEffect` body invokes `startCamera(facingMode)` a second time.
- `CameraSelfieCapture.tsx` is the sole camera component across the application (`GuruPresensi.tsx:517`, `GuruJurnal.tsx:689`, `PiketView.tsx:1219`).

### Observation 3: Teacher Account Credentials (Username & Password)
- File `src/components/AccountSettingsModal.tsx` contains an existing, fully functioning account management modal:
  - Avatar selection (12 custom avatars, lines 260–294)
  - Username input (lines 310–321)
  - Password change with toggle, current password, new password, confirmation (lines 325–395)
  - Web Push notification toggle (lines 398–460)
  - Backend mutation: `supabase.rpc('update_user_profile', payload)` (lines 170–195)
- In Postgres, RPC `update_user_profile` checks `v_caller_id := public.get_auth_user_id()`, checks uniqueness of `p_username`, and updates `username`, `password`, `nama`, `avatar` in `public.users`.
- In `src/components/AdminConfigView.tsx` line 7 & line 574, `AccountSettingsModal` is imported and rendered.
- In `src/components/AppScreen.tsx` and `src/components/HomeView.tsx`, there are zero import statements or references to `AccountSettingsModal`, and no UI triggers exist for teachers to access this modal.

### Observation 4: Master Data Filters
- File `src/components/AdminDataView.tsx` line 10 defines `const [search, setSearch] = useState('');`.
- Line 1461 renders a single text search input:
  `<input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Cari data..." ... />`
- Lines 1275–1292 define `filteredList` solely by matching `search` against string fields.
- There are no column-specific `<select>` dropdown filters in any of the 6 tabs (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`).

### Observation 5: Existing Regression Test Suite
- Ran `npm test`. All 26 tests in `m6_3_dashboards_and_verif.test.ts`, 20 tests in `m6_4_piket_perangkat_broadcast.test.ts`, and all tests in `m10_r2_r3.test.ts` passed cleanly (exit code 0).

---

## 2. Logic Chain

1. **Keterlambatan Calculation**:
   - Because `presensi_guru.timestamp` is stored as `text` with multiple format variants (Observation 1), running `.gte('timestamp', 'YYYY-MM-01')` in Supabase relies on ASCII string comparison.
   - ASCII `'7'` and `'8'` > `'2'`, so previous months (July/August) leak into September calculations, while October (`'1' < '2'`) is excluded.
   - Because `timestamp` was not selected, client-side date filtering was impossible.
   - Because `status_verifikasi` was not filtered, rejected records were counted.
   - Therefore, selecting `timestamp` and applying a resilient client-side regex/date parser matching WITA year-month, excluding rejected presensi, and summing `keterlambatan_detik` resolves the accumulation calculation.

2. **Camera Toggle Bug**:
   - In `CameraSelfieCapture.tsx`, `toggleFacingMode()` and `useEffect([..., facingMode])` both invoke `startCamera` concurrently when `facingMode` changes (Observation 2).
   - The effect cleanup synchronously halts the active tracks while the second stream is establishing.
   - Mobile hardware takes ~150ms to release a camera sensor; overlapping calls throw `NotReadableError` / `AbortError`.
   - Therefore, decoupling camera initialization from the `facingMode` state trigger, introducing an async release delay (100ms), and applying an in-flight mutex lock resolves the camera toggle bug without freeze or crash.

3. **Teacher Username & Password Change**:
   - The backend RPC `update_user_profile` and frontend component `AccountSettingsModal.tsx` already support modifying username and password (Observation 3).
   - However, `AccountSettingsModal` is isolated inside `AdminConfigView.tsx`, which teachers cannot access.
   - Therefore, rendering `AccountSettingsModal` at the `AppScreen.tsx` level (triggered via top bar profile button or sidebar) and adding a profile shortcut on the teacher dashboard (`HomeView.tsx`) provides immediate, seamless access for teachers to update their credentials.

4. **Master Menu Search & Dropdown Filters**:
   - `AdminDataView.tsx` has only a single text search input and zero column dropdown filters (Observation 4).
   - The requirement mandates a general search bar AND column-specific dropdown filters on every master section.
   - Therefore, introducing reactive dropdown states (Kelas, Status, Gender for Siswa; Status, Mapel for Guru; Kategori for Mapel; Tipe, Bulan for Kalender; Hari, Kelas, Guru for Jadwal; Tahun, Kelas for Wali Kelas) and updating `filteredList` satisfies the requirement completely.

---

## 3. Caveats

- **No Caveats**: The codebase, database schema, RPC functions, and test suites were directly inspected, queried, and verified.
- **Assumptions**: In `AccountSettingsModal.tsx`, `verify_login` intentionally does not return plain passwords. The frontend validation should allow users with valid active sessions to update their password cleanly via `update_user_profile` RPC, as the RPC enforces `v_caller_id = p_user_id` authentication.

---

## 4. Conclusion

Requirement R3 is fully analyzed and shovel-ready:
1. **Keterlambatan**: Update `HomeView.tsx` lines 105–157 to select `timestamp`, filter by WITA current month using multi-format parsing, filter out rejected records, and sum `keterlambatan_detik` for accurate minutes/hours and Alpa deduction display.
2. **Camera**: Update `CameraSelfieCapture.tsx` to eliminate the double-start race condition, add an in-flight mutex lock, insert a 100ms hardware release pause, and implement adaptive constraint fallbacks.
3. **Teacher Credentials**: Expose `AccountSettingsModal.tsx` in `AppScreen.tsx` (top bar profile button) and `HomeView.tsx` (teacher banner button), syncing state and `localStorage`.
4. **Master Filters**: Add 1–3 reactive column dropdown filters per tab in `AdminDataView.tsx` alongside the existing general search bar.

Detailed code references and implementation blueprints are documented in:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3_1\survey_r3.md`.

---

## 5. Verification Method

1. **Run Full Project Test Suite**:
   ```powershell
   npm test
   ```
   Must pass without any regression in `m10_r2_r3.test.ts`, `m6_3_dashboards_and_verif.test.ts`, and `m6_4_piket_perangkat_broadcast.test.ts`.

2. **Automated Unit & Integration Verification**:
   - Inspect `HomeView.tsx` to verify:
     - `Statistik Presensi Pribadi` precedes `Status Tugas Hari Ini` and `Jadwal Mengajar Hari Ini`.
     - `akumulasiTelat.detik` converts correctly to hours, minutes, seconds and `alpa = Math.floor(detik / 14400)`.
   - Inspect `CameraSelfieCapture.tsx` to verify clean camera switching logic and constraint fallbacks.
   - Inspect `AppScreen.tsx` and `AdminDataView.tsx` for account button and dropdown filter elements.
