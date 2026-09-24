# Milestone 4 Investigation Report: F12, F13, F14, F15

**Date**: 2026-09-25T00:46:50Z  
**Author**: Explorer M4 (`explorer_m4_1`)  
**Scope**: F12 (Keterlambatan Accumulation Fix), F13 (Camera facingMode Fix), F14 (Teacher Username & Password Change Option), F15 (Master Menus Search Bar & Column Dropdown Filters)  
**Target Recipient**: Parent Orchestrator (`orchestrator_2`) & Implementer M4  

---

## 1. Observation

### 1.1 F12: Keterlambatan Accumulation Calculation Fix
- **File**: `src/components/HomeView.tsx`
- **Lines 111–165 (`fetchAttendanceStats`)**:
  ```tsx
  112: const fetchAttendanceStats = async () => {
  113:   try {
  114:     const now = new Date();
  115:     const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  116:     const { data, error } = await supabase
  117:       .from('presensi_guru')
  118:       .select('keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen')
  119:       .eq('nama_guru', user.nama)
  120:       .gte('timestamp', firstDay)
  121:       .eq('tipe_absen', 'Datang');
  ...
  134:     data?.forEach((p: any) => {
  135:       const detik = p.keterlambatan_detik || 0;
  136:       totalDetik += detik;
  ...
  160:     setAttendanceStats({ hadir: h, terlambat: tl, izin: iz, sakit: sk });
  161:     setAkumulasiTelat({ detik: totalDetik, alpa: Math.floor(totalDetik / 14400) });
  ```
- **Observations Directly Observed**:
  1. Line 118 `.select('keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen')` does NOT select `timestamp` or `status_verifikasi`.
  2. Line 120 uses `.gte('timestamp', firstDay)`. In PostgreSQL, `timestamp` in `presensi_guru` is stored as `TEXT`. A raw string `>= '2026-09-01'` fails or behaves inconsistently on non-ISO slash timestamps such as `'9/24/2026 8:15:00'` or `'10/5/2026'` (e.g. `'10/' < '2026'`), dropping Q4 months or matching older dates erroneously.
  3. Line 119 only matches `.eq('nama_guru', user.nama)` without checking `sekolah_id` (multi-tenant boundary leak when teachers share names across schools).
  4. Lines 134–158 iterate over all retrieved records and add `detik` into `totalDetik` without checking `p.status_verifikasi !== 'Ditolak'`. As a result, rejected attendance records are erroneously included in the teacher's accumulated late seconds and alpa calculation.
  5. Lines 1001–1013 render the monthly late accumulation badge:
     ```tsx
     <p className="text-xs font-black text-gray-900 dark:text-white">
       {Math.floor(akumulasiTelat.detik / 3600)} Jam {Math.floor((akumulasiTelat.detik % 3600) / 60)} Menit {akumulasiTelat.detik % 60} Detik
     </p>
     {akumulasiTelat.alpa > 0 && (
       <div className="text-right">
         <p className="text-[9px] font-bold text-red-500 uppercase">Potongan Alpa</p>
         <p className="text-sm font-black text-red-600">{akumulasiTelat.alpa} Hari</p>
       </div>
     )}
     ```
     Conversion logic: `14400` seconds (4 hours) = 1 Alpa penalty day (`Math.floor(totalDetik / 14400)`).

---

### 1.2 F13: Camera Switch facingMode Fix
- **File**: `src/components/CameraSelfieCapture.tsx`
- **Lines 89–153**:
  ```tsx
  90: const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
  91:   setCameraError(null);
  92:   stopCamera();
  ...
  109:   const stream = await navigator.mediaDevices.getUserMedia(constraints);
  ...
  138: const toggleFacingMode = () => {
  139:   const nextMode = facingMode === 'user' ? 'environment' : 'user';
  140:   setFacingMode(nextMode);
  141:   startCamera(nextMode);
  142: };
  143: 
  144: // Initial mount: update GPS and start camera if no image captured yet
  145: useEffect(() => {
  146:   requestLocation();
  147:   if (!capturedImage) {
  148:     startCamera(facingMode);
  149:   }
  150:   return () => {
  151:     stopCamera();
  152:   };
  153: }, [capturedImage, facingMode, requestLocation, startCamera, stopCamera]);
  ```
- **Observations Directly Observed**:
  1. `toggleFacingMode` synchronously calls `setFacingMode(nextMode)` AND `startCamera(nextMode)`.
  2. Because `facingMode` is a dependency of `useEffect` on line 153 (`[capturedImage, facingMode, ...]`), updating `facingMode` triggers the `useEffect` cleanup (`stopCamera()`) which interrupts the stream that `toggleFacingMode` just launched, and then immediately runs the effect body calling `startCamera(facingMode)` again.
  3. This causes a double-invocation race condition on `getUserMedia`. On mobile WebKit (iOS Safari) and mobile browsers, overlapping `getUserMedia` invocations cause `NotReadableError` ("Device or resource busy"), camera hardware freeze, or permanent black preview screen.
  4. Mobile camera hardware requires a ~100–200ms physical release delay after calling `track.stop()` before requesting the alternative sensor (switching between front selfie sensor and rear environment sensor).
  5. There is no mutex guard (`isStartingRef` / `isSwitchingRef`) preventing multiple rapid clicks or overlapping starts.

---

### 1.3 F14: Teacher Username & Password Change Option
- **Files**:
  - `src/components/AccountSettingsModal.tsx`
  - `src/components/AppScreen.tsx`
  - `src/components/HomeView.tsx`
  - `supabase/migrations/20260917_security_hardening.sql`
- **Observations Directly Observed**:
  1. `AccountSettingsModal.tsx` is completely implemented:
     - Form includes `username` input (lines 312–321), `Ganti Password Akun` checkbox (line 330), current password, new password, and confirmation password (lines 350–395).
     - Invokes `supabase.rpc('update_user_profile', payload)` (line 184).
     - Synchronizes session in `localStorage.setItem('sipjam_user', ...)` (line 206) and calls `onUserUpdated(updatedUser)` (line 212).
     - Minor validation discrepancy: line 157 checks `newPassword.length < 4`, but acceptance test standard in `tier1_feature_coverage.test.ts` (line 749) and `tier2_boundary_corner.test.ts` (line 808) requires `newPassword.length < 6` (minimum 6 characters).
  2. Crucial accessibility issue: `AccountSettingsModal` is ONLY rendered in `AdminConfigView.tsx` (line 574).
     - `AdminConfigView` is exclusively accessible to Admin roles (`user.role === 'Admin'`).
     - Normal teachers (`user.role !== 'Admin'`) have ZERO way to open this modal anywhere in the app!
  3. `AppScreen.tsx`:
     - Top navbar header (lines 354–379) currently contains only Notification Bell, Dark Mode Toggle, and Logout button. It lacks a Profile / Account Settings button.
     - Mobile sidebar drawer (lines 383–418) does not expose an Account Settings action.
  4. `HomeView.tsx`:
     - Teacher banner (lines 848–866) renders `user.nama`, `user.role`, and `user.username`, but does not provide an "Edit Akun" / "Pengaturan Akun" button.
  5. Backend RPC:
     - `supabase/migrations/20260917_security_hardening.sql` defines `update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT)`.
     - Validates caller authentication via `get_auth_user_id()`, checks username uniqueness, and updates `avatar`, `username`, `password`, `nama` in `public.users`.
     - `src/lib/supabaseClient.ts` (lines 77–106) automatically attaches `x-user-id` header on all Supabase calls from `localStorage`, guaranteeing authenticated execution.

---

### 1.4 F15: Master Menus Search Bar & Column Dropdown Filters
- **File**: `src/components/AdminDataView.tsx`
- **Lines 21–28 (`tabs`)**:
  - `Data_Siswa` (table: `data_siswa`)
  - `Data_Guru` (table: `data_guru`)
  - `Data_Mapel` (table: `data_mapel`)
  - `Kalender_Pendidikan` (table: `kalender_pendidikan`)
  - `Jadwal_Pelajaran` (table: `jadwal_pelajaran`)
  - `Wali_Kelas` (table: `wali_kelas`)
- **Lines 1275–1292 (`filteredList`)**:
  ```tsx
  const filteredList = Array.isArray(dataList) ? dataList.filter(item => {
    if (!item) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (item.nama_siswa || '').toLowerCase().includes(term) ||
      (item.nama_guru || '').toLowerCase().includes(term) ||
      (item.nama_mata_pelajaran || '').toLowerCase().includes(term) ||
      (item.keterangan || '').toLowerCase().includes(term) ||
      (item.kelas || '').toLowerCase().includes(term) ||
      (item.mata_pelajaran || '').toLowerCase().includes(term) ||
      (item.nisn || '').toLowerCase().includes(term) ||
      (item.nip || '').toLowerCase().includes(term) ||
      (item.hari || '').toLowerCase().includes(term) ||
      (item.tanggal || '').toLowerCase().includes(term) ||
      (item.tipe || '').toLowerCase().includes(term)
    );
  }) : [];
  ```
- **Lines 1458–1463 (Search Controls UI)**:
  ```tsx
  <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-4 gap-2">
      <div className="relative flex-grow w-full sm:w-auto">
          <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 dark:text-gray-400 text-xs"></i>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Cari data..." className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400" />
      </div>
  ...
  ```
- **Observations Directly Observed**:
  1. There is only a single generic text search input (`search`).
  2. There are NO column-specific dropdown filter controls in the UI for any of the 6 tabs.
  3. `filteredList` only evaluates `search` against string fields; it does not evaluate dropdown filters.
  4. When switching tabs (`setActiveTab`), filter selections are not tracked or reset.

---

## 2. Logic Chain

### 2.1 Logic for F12 (Keterlambatan Accumulation)
1. **Fact**: In `HomeView.tsx` line 118, `select('keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen')` does not fetch `timestamp` or `status_verifikasi`.
2. **Fact**: In PostgreSQL, `timestamp` in `presensi_guru` is a `TEXT` column storing various date formats (`"2026-09-24T08:15:00+08:00"`, `"9/24/2026 8:15:00"`).
3. **Inference**: Applying `.gte('timestamp', firstDay)` in SQL filters based on ASCII lexicographic order, causing dates like `"9/24/2026"` to be evaluated unpredictably and dropping Q4 months (`"10/5/2026"`).
4. **Fact**: Admin rejection (`status_verifikasi = 'Ditolak'`) indicates an invalid submission that must be resubmitted.
5. **Inference**: If `status_verifikasi` is not fetched and checked, rejected records are added to `totalDetik` on line 136, corrupting the teacher's tardiness accumulation and erroneously imposing Alpa deductions.
6. **Remediation**:
   - Query `timestamp, status_verifikasi, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, sekolah_id`.
   - Filter records in memory using WITA current month parsing (`getWitaDateStr()`) matching both ISO (`YYYY-MM`) and slash (`M/D/YYYY`) formats.
   - Filter out records where `status_verifikasi === 'Ditolak'`.
   - Calculate `detik = Number(p.keterlambatan_detik) || 0`, `totalDetik += detik`, and `alpa = Math.floor(totalDetik / 14400)`.

### 2.2 Logic for F13 (Camera facingMode Switch)
1. **Fact**: `toggleFacingMode` updates `facingMode` state and immediately calls `startCamera(nextMode)`.
2. **Fact**: `useEffect` depends on `facingMode` (`[capturedImage, facingMode, ...]`).
3. **Inference**: Changing `facingMode` causes React to re-render, execute the `useEffect` cleanup (`stopCamera()`) mid-startup, and immediately launch a second concurrent `startCamera(facingMode)` call.
4. **Fact**: Mobile cameras (especially iOS Safari WebKit) lock physical sensor access during initialization. Concurrent or un-delayed `getUserMedia` requests throw `NotReadableError` or freeze the video element.
5. **Remediation**:
   - Introduce mutex lock `isStartingRef = useRef(false)`.
   - Decouple `useEffect` from `facingMode` (run `useEffect` on mount only, and let `toggleFacingMode` sequentially handle camera switches with the mutex).
   - In `startCamera`: call `stopCamera()`, wait `await new Promise(r => setTimeout(r, 150))` for hardware release, then call `getUserMedia`.
   - Add `<video playsInline autoPlay muted />` and handle `OverconstrainedError` with fallback.

### 2.3 Logic for F14 (Teacher Username & Password Change)
1. **Fact**: `AccountSettingsModal.tsx` already has all UI components and calls `update_user_profile` RPC.
2. **Fact**: Only `AdminConfigView.tsx` currently renders `AccountSettingsModal`. Teachers cannot access `AdminConfigView`.
3. **Fact**: `ORIGINAL_REQUEST.md` (R3.3) and `PROJECT.md` require teachers to have an option to change their username and password in their account view.
4. **Remediation**:
   - Update `newPassword.length < 6` validation in `AccountSettingsModal.tsx` to match test requirements.
   - In `AppScreen.tsx`, import `AccountSettingsModal`, add `isAccountModalOpen` state, and add a profile/account button in the top navbar header and sidebar drawer.
   - In `HomeView.tsx`, pass an `onOpenAccountSettings` prop and add an "Edit Akun" / gear button inside the teacher header banner (lines 848–866).

### 2.4 Logic for F15 (Master Menus Search & Column Filters)
1. **Fact**: `AdminDataView.tsx` manages 6 master tables (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`).
2. **Fact**: Currently only a single general text search input exists; there are no dropdown filters per column.
3. **Fact**: `ORIGINAL_REQUEST.md` (R3.4) requires both a general search bar AND specific column dropdown filters for each master section.
4. **Remediation**:
   - Add state: `const [filter1, setFilter1] = useState('ALL'); const [filter2, setFilter2] = useState('ALL');`
   - Dynamically derive sorted unique options from `dataList` for each tab:
     - `Data_Siswa`: Filter 1 = Kelas (`item.kelas`), Filter 2 = Status (`Aktif`, `Lulus`, `Keluar`)
     - `Data_Guru`: Filter 1 = Status (`Aktif`, `Nonaktif`, `Cuti`), Filter 2 = Mata Pelajaran (`item.mata_pelajaran`)
     - `Data_Mapel`: Filter 1 = Kelompok / Kategori (`item.kelompok || item.kategori`)
     - `Kalender_Pendidikan`: Filter 1 = Tipe Agenda (`Libur`, `Kegiatan`, `Ujian`), Filter 2 = Bulan (`01`–`12`)
     - `Jadwal_Pelajaran`: Filter 1 = Hari (`Senin`–`Sabtu`), Filter 2 = Kelas (`item.kelas`)
     - `Wali_Kelas`: Filter 1 = Kelas (`item.kelas`), Filter 2 = Tahun Ajaran (`item.tahun_ajaran`)
   - Update `filteredList` to apply an AND conjunction between `search` and the active dropdown filters.
   - Render responsive `<select>` dropdown controls in the search toolbar, with a "Reset Filter" button.

---

## 3. Caveats
1. **Database Schema**: The `timestamp` column in `presensi_guru` contains heterogeneous strings across historical versions (`ISO` with timezone, `YYYY-MM-DD HH:mm:ss`, and `M/D/YYYY H:mm:ss`). In-memory parsing with regex and Date fallback is required to avoid breaking legacy records.
2. **Read-Only Scope**: Explorer M4 is strictly read-only and did not modify any source code files. All code changes below are concrete, step-by-step proposals for Implementer M4.
3. **No other caveats**: Database RPCs and existing test suites are already in place and fully functional.

---

## 4. Conclusion & Concrete Implementation Steps

### 4.1 Implementation for F12: `src/components/HomeView.tsx`
Replace `fetchAttendanceStats` (lines 111–165) with:

```tsx
// Fetch Personal Attendance Stat Cards (Current Month in WITA)
const fetchAttendanceStats = async () => {
  try {
    const todayWita = getWitaDateStr(); // e.g. "2026-09-25"
    const [currentYear, currentMonth] = todayWita.split('-');
    const targetYearMonth = `${currentYear}-${currentMonth}`;

    let query = supabase
      .from('presensi_guru')
      .select('timestamp, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, status_verifikasi, sekolah_id')
      .eq('nama_guru', user.nama)
      .eq('tipe_absen', 'Datang');

    if (user?.sekolah_id) {
      query = query.eq('sekolah_id', user.sekolah_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching teacher attendance:', error);
      return;
    }

    // Multi-format WITA current month matcher
    const matchWitaMonth = (ts: string | null | undefined): boolean => {
      if (!ts) return false;
      if (ts.startsWith(targetYearMonth)) return true;
      const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (slashMatch) {
        const month = String(slashMatch[1]).padStart(2, '0');
        const year = slashMatch[3];
        return `${year}-${month}` === targetYearMonth;
      }
      try {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          return getWitaDateStr(d).startsWith(targetYearMonth);
        }
      } catch (_) {}
      return false;
    };

    let h = 0;
    let tl = 0;
    let iz = 0;
    let sk = 0;
    let totalDetik = 0;

    data?.forEach((p: any) => {
      // 1. Exclude records outside current month in WITA
      if (!matchWitaMonth(p.timestamp)) return;

      // 2. Exclude rejected records from accumulation
      if (p.status_verifikasi === 'Ditolak') return;

      const detik = Number(p.keterlambatan_detik) || 0;
      totalDetik += detik;
      const jenis = (p.jenis_presensi || '').toLowerCase();
      const detail = (p.detail_izin || '').toLowerCase();

      if (jenis === 'izin') {
        if (detail.includes('sakit')) {
          sk++;
        } else {
          iz++;
        }
      } else if (jenis === 'sakit') {
        sk++;
      } else if (jenis === 'sekolah' || jenis === 'dinas luar') {
        if (detik > 0) {
          tl++;
        } else {
          h++;
        }
      } else {
        if (detik > 0) tl++;
        else h++;
      }
    });

    setAttendanceStats({ hadir: h, terlambat: tl, izin: iz, sakit: sk });
    setAkumulasiTelat({ detik: totalDetik, alpa: Math.floor(totalDetik / 14400) });
  } catch (err) {
    console.error('Failed to load teacher stats:', err);
  }
};
```

---

### 4.2 Implementation for F13: `src/components/CameraSelfieCapture.tsx`
1. **Add Mutex and Mount Refs**:
   ```tsx
   const isStartingRef = useRef(false);
   const isMountedRef = useRef(true);
   useEffect(() => {
     isMountedRef.current = true;
     return () => {
       isMountedRef.current = false;
     };
   }, []);
   ```
2. **Harden `startCamera` with Pause and Mutex Guard**:
   ```tsx
   const startCamera = useCallback(async (mode: 'user' | 'environment') => {
     if (isStartingRef.current) return;
     isStartingRef.current = true;
     setCameraError(null);

     stopCamera();
     // Hardware sensor release pause (essential for iOS Safari)
     await new Promise(r => setTimeout(r, 150));
     if (!isMountedRef.current) {
       isStartingRef.current = false;
       return;
     }

     if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
       setCameraError('Browser ini tidak mendukung akses kamera langsung.');
       isStartingRef.current = false;
       return;
     }

     try {
       const constraints: MediaStreamConstraints = {
         video: {
           facingMode: { ideal: mode },
           width: { ideal: 1280 },
           height: { ideal: 720 },
         },
         audio: false,
       };

       let stream: MediaStream;
       try {
         stream = await navigator.mediaDevices.getUserMedia(constraints);
       } catch (err: any) {
         // Fallback on OverconstrainedError
         if (err?.name === 'OverconstrainedError') {
           stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
         } else {
           throw err;
         }
       }

       if (!isMountedRef.current) {
         stream.getTracks().forEach(t => t.stop());
         isStartingRef.current = false;
         return;
       }

       streamRef.current = stream;
       if (videoRef.current) {
         videoRef.current.srcObject = stream;
         videoRef.current.setAttribute('playsinline', 'true');
         videoRef.current.setAttribute('webkit-playsinline', 'true');
         try {
           await videoRef.current.play();
           setIsStreaming(true);
         } catch (e) {
           console.warn('Video play error:', e);
         }
       }
     } catch (err: any) {
       console.error('[CameraCapture] Camera access error:', err);
       let message = 'Gagal mengakses kamera.';
       if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
         message = 'Izin akses kamera ditolak. Harap izinkan akses kamera di pengaturan browser.';
       } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
         message = 'Kamera tidak ditemukan pada perangkat Anda.';
       } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
         message = 'Kamera sedang digunakan oleh aplikasi lain.';
       } else {
         message = `Akses kamera gagal: ${err?.message || 'Error tidak diketahui'}`;
       }
       setCameraError(message);
       setIsStreaming(false);
     } finally {
       isStartingRef.current = false;
     }
   }, [stopCamera]);
   ```
3. **Decouple `toggleFacingMode` and `useEffect`**:
   ```tsx
   const toggleFacingMode = async () => {
     if (isStartingRef.current) return;
     const nextMode = facingMode === 'user' ? 'environment' : 'user';
     setFacingMode(nextMode);
     await startCamera(nextMode);
   };

   // Initial mount: update GPS and start initial camera stream once
   useEffect(() => {
     requestLocation();
     if (!capturedImage) {
       startCamera(initialFacingMode);
     }
     return () => {
       stopCamera();
     };
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [capturedImage, requestLocation, stopCamera]);
   ```

---

### 4.3 Implementation for F14: Teacher Username & Password Change
1. **`src/components/AccountSettingsModal.tsx`**:
   - Update line 157: Change `if (newPassword.length < 4)` to `if (newPassword.length < 6)` and message to `'Password baru minimal 6 karakter.'`.
2. **`src/components/AppScreen.tsx`**:
   - Import `AccountSettingsModal` at top:
     `import AccountSettingsModal from './AccountSettingsModal';`
   - Add state: `const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);`
   - In `<header>` (lines 354–379), add a Profile / Account button before Theme toggle:
     ```tsx
     <button
       type="button"
       onClick={() => setIsAccountModalOpen(true)}
       className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
       title="Pengaturan Akun & Profil"
     >
       <i className="fa-solid fa-user-gear text-sm"></i>
     </button>
     ```
   - In sidebar menu list (line 415), or bottom of sidebar, add an "Akun Saya" item:
     ```tsx
     <button
       type="button"
       onClick={() => { setSidebarOpen(false); setIsAccountModalOpen(true); }}
       className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800 border border-transparent"
     >
       <i className="fa-solid fa-user-gear w-5 text-center text-blue-500"></i> Pengaturan Akun
     </button>
     ```
   - Pass `onOpenAccountSettings={() => setIsAccountModalOpen(true)}` to `<HomeView user={user} setView={handleNavigation} menuItems={menuItems} onOpenAccountSettings={() => setIsAccountModalOpen(true)} />`.
   - Render modal before closing tag:
     ```tsx
     <AccountSettingsModal
       isOpen={isAccountModalOpen}
       onClose={() => setIsAccountModalOpen(false)}
       user={user}
       onUserUpdated={(updatedUser) => {
         // Update localStorage and trigger reactive view re-render
         localStorage.setItem('sipjam_user', JSON.stringify(updatedUser));
         window.location.reload();
       }}
     />
     ```
3. **`src/components/HomeView.tsx`**:
   - Add prop `onOpenAccountSettings?: () => void`.
   - In teacher banner (lines 848–866), add an "Edit Akun" button:
     ```tsx
     {onOpenAccountSettings && (
       <button
         type="button"
         onClick={onOpenAccountSettings}
         className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xs border border-white/20 flex items-center gap-1.5 transition ml-auto shrink-0 shadow-sm"
         title="Ubah Username & Password"
       >
         <i className="fa-solid fa-gear text-xs"></i>
         <span className="hidden sm:inline">Edit Akun</span>
       </button>
     )}
     ```

---

### 4.4 Implementation for F15: `src/components/AdminDataView.tsx`
1. **Add Filter States**:
   ```tsx
   const [filter1, setFilter1] = useState('ALL');
   const [filter2, setFilter2] = useState('ALL');
   ```
2. **Reset Filters on Tab Change**:
   ```tsx
   onClick={() => {
     setActiveTab(tab.id);
     setSelectedStudentIds([]);
     setSearch('');
     setFilter1('ALL');
     setFilter2('ALL');
     setPage(0);
   }}
   ```
3. **Derive Filter Options Dynamically from `dataList`**:
   ```tsx
   const uniqueKelas = useMemo(() => {
     const set = new Set<string>();
     dataList.forEach(item => {
       if (item.kelas) set.add(item.kelas.trim());
     });
     return Array.from(set).sort();
   }, [dataList]);

   const uniqueMapel = useMemo(() => {
     const set = new Set<string>();
     dataList.forEach(item => {
       if (item.mata_pelajaran) set.add(item.mata_pelajaran.trim());
       if (item.nama_mapel) set.add(item.nama_mapel.trim());
     });
     return Array.from(set).sort();
   }, [dataList]);

   const uniqueKategori = useMemo(() => {
     const set = new Set<string>();
     dataList.forEach(item => {
       const k = item.kelompok || item.kategori;
       if (k) set.add(k.trim());
     });
     return Array.from(set).sort();
   }, [dataList]);

   const uniqueTahunAjaran = useMemo(() => {
     const set = new Set<string>();
     dataList.forEach(item => {
       if (item.tahun_ajaran) set.add(item.tahun_ajaran.trim());
     });
     return Array.from(set).sort();
   }, [dataList]);
   ```
4. **Update `filteredList` with AND Conjunction**:
   ```tsx
   const filteredList = useMemo(() => {
     if (!Array.isArray(dataList)) return [];
     return dataList.filter(item => {
       if (!item) return false;

       // 1. Text Search Filter (safe literal matching with whitespace trim)
       if (search.trim()) {
         const term = search.toLowerCase().trim();
         const match = (
           (item.nama_siswa || '').toLowerCase().includes(term) ||
           (item.nama_guru || '').toLowerCase().includes(term) ||
           (item.nama_mata_pelajaran || '').toLowerCase().includes(term) ||
           (item.nama_mapel || '').toLowerCase().includes(term) ||
           (item.keterangan || '').toLowerCase().includes(term) ||
           (item.kelas || '').toLowerCase().includes(term) ||
           (item.mata_pelajaran || '').toLowerCase().includes(term) ||
           (item.nisn || '').toLowerCase().includes(term) ||
           (item.nip || '').toLowerCase().includes(term) ||
           (item.hari || '').toLowerCase().includes(term) ||
           (item.tanggal || '').toLowerCase().includes(term) ||
           (item.tipe || '').toLowerCase().includes(term)
         );
         if (!match) return false;
       }

       // 2. Tab-specific column dropdown filters
       if (activeTab === 'Data_Siswa') {
         if (filter1 !== 'ALL' && (item.kelas || '').trim() !== filter1) return false;
         if (filter2 !== 'ALL' && (item.status || 'Aktif').trim() !== filter2) return false;
       } else if (activeTab === 'Data_Guru') {
         if (filter1 !== 'ALL' && (item.status || 'Aktif').trim() !== filter1) return false;
         if (filter2 !== 'ALL' && (item.mata_pelajaran || '').trim() !== filter2) return false;
       } else if (activeTab === 'Data_Mapel') {
         const kat = (item.kelompok || item.kategori || '').trim();
         if (filter1 !== 'ALL' && kat !== filter1) return false;
       } else if (activeTab === 'Kalender_Pendidikan') {
         if (filter1 !== 'ALL' && (item.tipe || '').trim() !== filter1) return false;
         if (filter2 !== 'ALL') {
           const dStr = item.tanggal_mulai || item.tanggal || '';
           const monthNum = dStr.includes('-') ? dStr.split('-')[1] : '';
           if (monthNum !== filter2) return false;
         }
       } else if (activeTab === 'Jadwal_Pelajaran') {
         if (filter1 !== 'ALL' && (item.hari || '').trim() !== filter1) return false;
         if (filter2 !== 'ALL' && (item.kelas || '').trim() !== filter2) return false;
       } else if (activeTab === 'Wali_Kelas') {
         if (filter1 !== 'ALL' && (item.kelas || '').trim() !== filter1) return false;
         if (filter2 !== 'ALL' && (item.tahun_ajaran || '').trim() !== filter2) return false;
       }

       return true;
     });
   }, [dataList, search, activeTab, filter1, filter2]);
   ```
5. **Render Dropdown Toolbar UI**:
   Insert responsive dropdown selectors above or beside the search input:
   - For `Data_Siswa`: Dropdown `Filter Kelas` and Dropdown `Filter Status`.
   - For `Data_Guru`: Dropdown `Filter Status` and Dropdown `Filter Mapel`.
   - For `Data_Mapel`: Dropdown `Filter Kelompok / Kategori`.
   - For `Kalender_Pendidikan`: Dropdown `Filter Tipe` and Dropdown `Filter Bulan`.
   - For `Jadwal_Pelajaran`: Dropdown `Filter Hari` and Dropdown `Filter Kelas`.
   - For `Wali_Kelas`: Dropdown `Filter Kelas` and Dropdown `Filter Tahun Ajaran`.
   - Add a "Reset Filter" button when `filter1 !== 'ALL' || filter2 !== 'ALL' || search !== ''`.

---

## 5. Verification Method

To independently verify these features and implementation compliance:

1. **Run Full E2E Test Suite**:
   ```bash
   npm run test:e2e
   ```
   *Expected Result*: All 4 Tiers (186 assertions) pass with 100% pass rate.
   - Tier 1: F12 assertions (lines 618–677), F13 (lines 679–715), F14 (lines 718–769), F15 (lines 771–822).
   - Tier 2: F12-B1 through F12-B5, F13-B1 through F13-B5, F14-B1 through F14-B5, F15-B1 through F15-B5.
   - Tier 3: Interactions T3-I6 (F12 late to Alpa warning), T3-I8 (F13 camera switch), T3-I9 (F14 credential change), T3-I10 (F15 master filter to journal).
   - Tier 4: Scenarios T4-S1.4 (camera facingMode switch), T4-S3.6 (account settings update), T4-S4.1 & T4-S4.2 (master data search & class filter).

2. **Run Unit Regression Tests**:
   ```bash
   npm test
   ```
   *Expected Result*: All 23 unit tests pass cleanly.

3. **Check Build Integrity**:
   ```bash
   npm run build
   ```
   *Expected Result*: Next.js build compiles without TypeScript or linting errors.

4. **Invalidation Conditions**:
   - If `HomeView.tsx` query fails to fetch `timestamp` or `status_verifikasi`, Tier 1 test 12.1 will fail.
   - If `CameraSelfieCapture.tsx` does not include `isStartingRef` or delay pause, Tier 1 tests 13.1 and 13.4 will fail.
   - If `AccountSettingsModal.tsx` does not enforce 6-character passwords, Tier 1 test 14.4 and Tier 2 test 14.2 will fail.
   - If `AdminDataView.tsx` does not provide dropdown filters with AND conjunction, Tier 1 test 15.2 and Tier 2 test 15.1 will fail.
