# Comprehensive Codebase Survey Report: Requirement R3
**Requirement R3: Fungsionalitas Tambahan & Bug Fixes**  
**Working Directory:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3_1`  
**Date:** 2026-09-24  
**Author:** Explorer 3 (`teamwork_preview_explorer`)

---

## Executive Summary

Requirement R3 encompasses 4 distinct functional fixes and enhancements:
1. **Keterlambatan Accumulation Calculation Fix on Teacher Dashboard**: Accurately read and accumulate late arrival seconds/minutes/hours and automatic Alpa deductions for each teacher on the teacher dashboard (`HomeView.tsx`).
2. **Camera Switch facingMode Bug Fix (Front <-> Back Toggle)**: Eliminate camera freeze, stream interruption, and hardware lock errors when switching between user (front) and environment (back) cameras in `CameraSelfieCapture.tsx`.
3. **Change Username & Password Option on Teacher Account Page**: Provide teachers with direct UI access to modify their username and password via `AccountSettingsModal.tsx` and Supabase RPC `update_user_profile`.
4. **Search Bar & Column Dropdown Filters across all Master Menus**: Add comprehensive text search and column-specific dropdown filters across all 6 sections of `AdminDataView.tsx` (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`).

The survey confirms that the core architectural foundations (such as `update_user_profile` RPC, `CameraSelfieCapture.tsx`, and `AdminDataView.tsx` tabs) exist, but specific algorithmic bugs, UI omissions, and string-matching defects prevent R3 from functioning properly.

---

## Detailed Investigation by Item

### Item 1: Keterlambatan Accumulation Calculation Fix on Teacher Dashboard

#### 1. Affected Files & Line Numbers
- **`src/components/HomeView.tsx`**:
  - Lines 76–83: State definitions for `attendanceStats` and `akumulasiTelat`.
  - Lines 105–157: `fetchAttendanceStats` data loading and calculation.
  - Lines 906–916: `attendanceStats.terlambat` card rendering.
  - Lines 943–962: `Akumulasi Keterlambatan Bulan Ini` and `Potongan Alpa` card rendering.
- **`src/components/GuruPresensi.tsx`**:
  - Lines 195–213, 241–258: Late calculation at time of submission (`keterlambatan_detik`).
- **`src/components/AdminRekapView.tsx`**:
  - Lines 131–141, 162–165, 332–335: Admin recap late accumulation formula (`totalDetik / 14400 = 1 Alpa`).
- **`src/types/database.ts`**:
  - Lines 958–1015: `presensi_guru` table schema (`keterlambatan_detik: number | null`, `timestamp: string | null`).

#### 2. Root Cause Analysis
1. **Database Schema & Mixed Timestamp Formats**:
   - In Supabase, `presensi_guru.timestamp` is a `TEXT` column (not `timestamptz`).
   - The database contains mixed timestamp formats from legacy imports and live inputs:
     - ISO with WITA offset: `2026-09-24T09:49:30+08:00`
     - ISO UTC: `2026-09-10T01:39:06.554Z`
     - Space-delimited: `2026-08-01 10:20:31`
     - Slash-delimited: `7/16/2026 8:56:31`, `8/22/2026 9:21:46`
2. **Postgres String Comparison Flaw in SQL Query**:
   In `HomeView.tsx` (lines 107–114):
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
   - When Postgres executes `.gte('timestamp', '2026-09-01')` on a `TEXT` column, it performs lexicographical ASCII comparison.
   - ASCII character `'7'` (ASCII 55) and `'8'` (ASCII 56) are greater than `'2'` (ASCII 50). Consequently, records from July (`7/16/2026`) and August (`8/22/2026`) evaluate to `TRUE` and are returned as if they were in the current month!
   - Conversely, for months starting with `'1'` (October `10/`, November `11/`, December `12/`), `'1'` (ASCII 49) is strictly less than `'2'`, causing all slash-formatted records in Q4 to be omitted!
   - Furthermore, `timestamp` was not included in `.select(...)`, making in-memory client date parsing impossible.
3. **Missing Month Bounds and Timezone**:
   - `firstDay` uses client local `new Date()` instead of normalized WITA (`getWitaNow()`).
   - There is no upper bound (`lte` or end-of-month), allowing future records or spurious string matches to leak.
4. **Missing Rejection Filter**:
   - `data?.forEach` does not verify `status_verifikasi !== 'Ditolak'`. If an admin rejects a late presensi and the teacher re-submits, the rejected record's late seconds were still being accumulated.
5. **Multi-Tenant Isolation**:
   - The query lacks `.eq('sekolah_id', user.sekolah_id)`.

#### 3. Technical Implementation Architecture
- **Query Enhancement**:
  ```ts
  let q = supabase
    .from('presensi_guru')
    .select('id, timestamp, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, status_verifikasi, nama_guru')
    .eq('nama_guru', user.nama)
    .eq('tipe_absen', 'Datang');
  if (user?.sekolah_id) {
    q = q.eq('sekolah_id', user.sekolah_id);
  }
  ```
- **Resilient Month Matcher** (matching the proven pattern in `workflow.ts`):
  Extract year and month in WITA:
  ```ts
  const nowWita = getWitaNow();
  const currentYearStr = String(nowWita.getFullYear());
  const currentMonthStr = String(nowWita.getMonth() + 1).padStart(2, '0');
  const targetYearMonth = `${currentYearStr}-${currentMonthStr}`; // e.g. "2026-09"
  ```
  Parse candidate timestamps across all formats:
  - If ISO / YYYY-MM: `ts.startsWith(targetYearMonth)`
  - If slash format `M/D/YYYY`: match regex `/^(\d{1,2})\/(\d{1,2})\/(\d{4})/`, extract month & year, compare to `targetYearMonth`.
- **Filtering & Accumulation**:
  - Exclude `p.status_verifikasi === 'Ditolak'`.
  - Calculate `totalDetik = sum(p.keterlambatan_detik || 0)`.
  - Calculate `alpa = Math.floor(totalDetik / 14400)` (4 hours = 1 Alpa).
  - Categorize stats:
    * `hadir`: `detik === 0 && (jenis === 'sekolah' || jenis === 'dinas luar')`
    * `terlambat`: `detik > 0`
    * `izin`: `jenis === 'izin' && !detail.includes('sakit')`
    * `sakit`: `jenis === 'sakit' || detail.includes('sakit')`
  - Update `attendanceStats` and `akumulasiTelat` state.

---

### Item 2: Camera Switch facingMode Bug Fix (Front <-> Back Toggle)

#### 1. Affected Files & Line Numbers
- **`src/components/CameraSelfieCapture.tsx`**:
  - Line 27: `const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);`
  - Lines 76–87: `stopCamera` callback.
  - Lines 90–135: `startCamera` callback.
  - Lines 138–142: `toggleFacingMode` handler.
  - Lines 145–153: `useEffect` mount/watch hook.
  - Lines 257–265: `<video>` element with transforms.
  - Lines 290–316, 350–375: Camera switch buttons in UI.
- Integrated into:
  - `src/components/GuruPresensi.tsx` (line 517)
  - `src/components/GuruJurnal.tsx` (line 689)
  - `src/components/PiketView.tsx` (line 1219)

#### 2. Root Cause Analysis
1. **Double Invocation & Cleanup Race Condition**:
   In `CameraSelfieCapture.tsx`:
   ```ts
   const toggleFacingMode = () => {
     const nextMode = facingMode === 'user' ? 'environment' : 'user';
     setFacingMode(nextMode);
     startCamera(nextMode);
   };
   ```
   And `useEffect`:
   ```ts
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
   - When the user clicks "Ganti Kamera", `toggleFacingMode` immediately invokes `startCamera(nextMode)` while also calling `setFacingMode(nextMode)`.
   - `setFacingMode(nextMode)` triggers a component re-render.
   - Because `facingMode` changed, React runs the cleanup callback of the previous `useEffect` instance: `stopCamera()`.
   - `stopCamera()` halts all tracks (`track.stop()`) and sets `videoRef.current.srcObject = null` on the stream that `startCamera(nextMode)` was in the middle of requesting!
   - React then executes the new `useEffect` body, calling `startCamera(facingMode)` a second time!
   - This fires two concurrent `getUserMedia` requests that collide, triggering `AbortError` or `NotReadableError: TrackStartError`.
2. **Mobile Hardware Release Delay**:
   - On iOS Safari and Android Chrome, the camera hardware requires ~150–250ms to release after tracks are stopped. Calling `getUserMedia` before previous tracks are fully terminated results in "Camera is already in use by another application".
3. **No Debounce / In-Flight Mutex**:
   - Rapid clicking spawns overlapping streams without waiting for the prior promise to settle.
4. **Constraint Inflexibility**:
   - `{ facingMode: { ideal: mode } }` sometimes fails to switch or sticks to the default camera on iOS Safari without an exact/fallback strategy.

#### 3. Technical Implementation Architecture
- **Separate Lifecycle from State**:
  Let `toggleFacingMode` update state or trigger a single controlled transition without calling `startCamera` twice. Or better, use an async switcher with an `isSwitchingRef` lock.
- **Clean Stream Tear-Down Sequence**:
  ```ts
  const isSwitchingRef = useRef(false);

  const switchCamera = async (targetMode: 'user' | 'environment') => {
    if (isSwitchingRef.current) return;
    isSwitchingRef.current = true;
    try {
      // 1. Pause video and stop all tracks cleanly
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      setIsStreaming(false);

      // 2. Allow mobile camera hardware to release (delay 100ms)
      await new Promise(r => setTimeout(r, 100));

      // 3. Request new stream with adaptive constraints
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: targetMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        });
      } catch {
        // Fallback to ideal if exact fails
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        });
      }

      streamRef.current = newStream;
      setFacingMode(targetMode);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.warn);
          setIsStreaming(true);
        };
      }
    } catch (err: any) {
      console.error('[Camera] Switch error:', err);
      setCameraError(`Gagal berganti kamera: ${err.message || 'Error hardware'}`);
    } finally {
      isSwitchingRef.current = false;
    }
  };
  ```
- **Ensure iOS Safari Autoplay Compatibility**: Keep `playsInline`, `autoPlay`, `muted` on `<video>`.

---

### Item 3: Change Username & Password Option on Teacher Account Page

#### 1. Affected Files & Line Numbers
- **`src/components/AccountSettingsModal.tsx`**:
  - Full modal with avatar picker, username input, password change inputs, and push notification toggles.
  - Lines 131–230: `handleSave` calling `supabase.rpc('update_user_profile', payload)`.
- **`src/components/AppScreen.tsx`**:
  - Lines 342–380: Header bar (currently lacks profile / account button).
  - Lines 382–418: Sidebar navigation (no account item for teachers).
- **`src/components/HomeView.tsx`**:
  - Lines 840–860: Teacher welcome banner (displays avatar, name, username, role, but no button to open account settings).
- **`src/components/AdminConfigView.tsx`**:
  - Line 7, 256–261, 574–581: The ONLY place where `AccountSettingsModal` is currently opened.
- **Database RPC `public.update_user_profile`**:
  - Validates `v_caller_id := public.get_auth_user_id()`.
  - Verifies `v_caller_id = p_user_id` or caller is superadmin.
  - Checks unique username across `public.users`.
  - Updates `avatar`, `username`, `password`, `nama`.

#### 2. Root Cause Analysis
1. **Missing UI Entry Points for Teachers**:
   - `AccountSettingsModal` is already built and working, but is exclusively placed inside `AdminConfigView.tsx` which is restricted to Admin role only.
   - Teachers have no menu item, header button, or dashboard button to access account settings.
2. **Missing `password` in Session Data**:
   - In `LoginScreen.tsx`, `verify_login` returns `id, username, nama, role, sekolah_id`. It intentionally omits `password` from the returned user object.
   - In `AccountSettingsModal.tsx` line 152: `if (user.password && currentPassword !== user.password)`. Since `user.password` is undefined, this check is skipped on the client.
3. **State & LocalStorage Synchronization**:
   - When a teacher updates their username or password, `localStorage.getItem('sipjam_user')` must update, and the parent `user` state in `AppScreen.tsx` must be refreshed via `onUserUpdated(updatedUser)`.

#### 3. Technical Implementation Architecture
- **Header Profile Button in `AppScreen.tsx`**:
  Add an account/profile button in the top navigation bar (adjacent to bell and theme toggles) showing the user's avatar. Clicking it opens `AccountSettingsModal` for any logged-in user (especially teachers).
- **Sidebar Menu Entry**:
  Optionally add `{ id: 'modal-akun', icon: 'fa-user-gear', label: 'Pengaturan Akun' }` to teacher menu items.
- **Dashboard Banner Action in `HomeView.tsx`**:
  Add a gear icon or "Edit Akun" pill button on the teacher dashboard welcome banner next to the teacher's name and username.
- **Modal Mounting**:
  Mount `AccountSettingsModal` in `AppScreen.tsx`:
  ```tsx
  <AccountSettingsModal
    isOpen={accountModalOpen}
    onClose={() => setAccountModalOpen(false)}
    user={user}
    onUserUpdated={(updatedUser) => {
      setUser(updatedUser);
      localStorage.setItem('sipjam_user', JSON.stringify(updatedUser));
    }}
  />
  ```
- **Backend Verification**:
  Supabase RPC `update_user_profile` already handles authenticated password hashing/updating and username uniqueness checking.

---

### Item 4: Search Bar & Column Dropdown Filters across all Master Menus

#### 1. Affected Files & Line Numbers
- **`src/components/AdminDataView.tsx`**:
  - Line 9: `const [activeTab, setActiveTab] = useState('Data_Siswa');`
  - Line 10: `const [search, setSearch] = useState('');` (only a single search string).
  - Lines 21–28: `tabs` definition: `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`.
  - Lines 1275–1292: `filteredList` filter function.
  - Lines 1457–1475: Search input container in UI.

#### 2. Root Cause Analysis
1. **General Text Search Only**:
   Currently, only a single generic text search input (`search`) is provided at line 1461.
2. **Zero Dropdown Filters**:
   None of the 6 master tabs provide column-specific dropdown filters.
   Per requirement:
   - "Tambahkan fitur filter (search bar umum dan filter dropdown spesifik per kolom) pada setiap bagian di menu master."
   - "Verifikasi bahwa menu master memiliki input pencarian teks dan minimal satu filter dropdown tambahan, dan datanya terfilter saat digunakan."

#### 3. Technical Implementation Architecture
- **State Management**:
  Add reactive filter states per tab:
  ```ts
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterTipeKalender, setFilterTipeKalender] = useState('');
  const [filterBulanKalender, setFilterBulanKalender] = useState('');
  const [filterHariJadwal, setFilterHariJadwal] = useState('');
  const [filterGuruJadwal, setFilterGuruJadwal] = useState('');
  const [filterTahunWali, setFilterTahunWali] = useState('');
  ```
  Reset all filters when `activeTab` changes.
- **Dynamic Filter Option Derivation** (using `useMemo`):
  Extract unique sorted options from `dataList`:
  - `uniqueKelasList`: unique `item.kelas` from `data_siswa` / `jadwal_pelajaran` / `wali_kelas`.
  - `uniqueMapelList`: unique `item.mata_pelajaran` from `data_guru`.
  - `uniqueKategoriList`: unique `item.kategori` / `item.kelompok` from `data_mapel`.
  - `uniqueGuruList`: unique `item.nama_guru` from `jadwal_pelajaran`.
  - `uniqueTahunList`: unique `item.tahun_ajaran` from `wali_kelas`.
- **Tab-Specific Dropdown Renders**:
  - **Tab 1: `Data_Siswa`**:
    * Dropdown 1: Kelas (`Semua Kelas`, ...uniqueKelasList)
    * Dropdown 2: Status (`Semua Status`, `Aktif`, `Lulus`, `Pindah`, `Nonaktif`)
    * Dropdown 3: Gender (`Semua Gender`, `Laki-laki`, `Perempuan`)
  - **Tab 2: `Data_Guru`**:
    * Dropdown 1: Status (`Semua Status`, `Aktif`, `Cuti`, `Nonaktif`)
    * Dropdown 2: Mapel (`Semua Mapel`, ...uniqueMapelList)
  - **Tab 3: `Data_Mapel`**:
    * Dropdown 1: Kategori / Kelompok (`Semua Kategori`, ...uniqueKategoriList)
  - **Tab 4: `Kalender_Pendidikan`**:
    * Dropdown 1: Tipe Agenda (`Semua Tipe`, `Libur`, `Kegiatan`, `Ujian`)
    * Dropdown 2: Bulan (`Semua Bulan`, `Januari` s/d `Desember`)
  - **Tab 5: `Jadwal_Pelajaran`**:
    * Dropdown 1: Hari (`Semua Hari`, `Senin`, `Selasa`, `Rabu`, `Kamis`, `Jumat`, `Sabtu`)
    * Dropdown 2: Kelas (`Semua Kelas`, ...uniqueKelasList)
    * Dropdown 3: Guru (`Semua Guru`, ...uniqueGuruList)
  - **Tab 6: `Wali_Kelas`**:
    * Dropdown 1: Tahun Ajaran (`Semua Tahun`, ...uniqueTahunList)
    * Dropdown 2: Kelas (`Semua Kelas`, ...uniqueKelasList)
- **Combined Multi-Criteria Filtering**:
  ```ts
  const filteredList = useMemo(() => {
    if (!Array.isArray(dataList)) return [];
    return dataList.filter(item => {
      if (!item) return false;

      // 1. General search term
      if (search) {
        const term = search.toLowerCase();
        const matchesSearch = [
          item.nama_siswa, item.nama_guru, item.nama_mata_pelajaran,
          item.nama_mapel, item.keterangan, item.kelas, item.mata_pelajaran,
          item.mapel, item.nisn, item.nip, item.hari, item.tanggal, item.tipe
        ].some(field => (field || '').toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }

      // 2. Tab-specific dropdown filters
      if (activeTab === 'Data_Siswa') {
        if (filterKelas && item.kelas !== filterKelas) return false;
        if (filterStatus && (item.status || 'Aktif') !== filterStatus) return false;
        if (filterGender && item.gender !== filterGender) return false;
      } else if (activeTab === 'Data_Guru') {
        if (filterStatus && (item.status || 'Aktif') !== filterStatus) return false;
        if (filterMapel && item.mata_pelajaran !== filterMapel) return false;
      } else if (activeTab === 'Data_Mapel') {
        if (filterKategori && (item.kategori || item.kelompok) !== filterKategori) return false;
      } else if (activeTab === 'Kalender_Pendidikan') {
        if (filterTipeKalender && item.tipe !== filterTipeKalender) return false;
        if (filterBulanKalender) {
          const tgl = item.tanggal_mulai || item.tanggal || '';
          const m = tgl.includes('-') ? tgl.split('-')[1] : '';
          if (m !== filterBulanKalender) return false;
        }
      } else if (activeTab === 'Jadwal_Pelajaran') {
        if (filterHariJadwal && item.hari !== filterHariJadwal) return false;
        if (filterKelas && item.kelas !== filterKelas) return false;
        if (filterGuruJadwal && item.nama_guru !== filterGuruJadwal) return false;
      } else if (activeTab === 'Wali_Kelas') {
        if (filterTahunWali && item.tahun_ajaran !== filterTahunWali) return false;
        if (filterKelas && item.kelas !== filterKelas) return false;
      }

      return true;
    });
  }, [dataList, search, activeTab, filterKelas, filterStatus, filterGender, filterMapel, filterKategori, filterTipeKalender, filterBulanKalender, filterHariJadwal, filterGuruJadwal, filterTahunWali]);
  ```
- **Reset Button**: Provide a quick "Reset Filter" button whenever `search` or any dropdown is active.

---

## Acceptance Criteria Cross-Check

| AC Requirement | Code Verification Point | Strategy / Target Component |
|---|---|---|
| **Akumulasi keterlambatan menit/jam dikalkulasi dengan benar di dashboard guru** | `src/components/HomeView.tsx:105-157, 943-962` | Multi-format timestamp month matching in WITA, exclude rejected, sum seconds, render hours/minutes/seconds and 4-hour Alpa conversion. |
| **Peralihan kamera (facingMode) di Safari iOS tanpa freeze / bug** | `src/components/CameraSelfieCapture.tsx:76-154` | Separate stream lifecycle from React re-renders, track stop delay, in-flight mutex lock, adaptive constraints, prevent double-invocation. |
| **Ganti username & password berhasil memperbarui kredensial** | `src/components/AccountSettingsModal.tsx`, `AppScreen.tsx`, `HomeView.tsx` | Wire `AccountSettingsModal` to header and teacher dashboard; invoke `update_user_profile` RPC; update `sipjam_user` session. |
| **Menu master memiliki input pencarian teks dan dropdown filters spesifik kolom** | `src/components/AdminDataView.tsx:1275-1292, 1457-1475` | Add 1–3 specific dropdown filters per tab + general search input + dynamic option derivation. |

---

## Potential Risks and Mitigations

1. **Risk: Breaking existing test suite (`tests/m10_r2_r3.test.ts`)**
   - *Mitigation*: Ensure that the 3 strict teacher dashboard sections and their labels (`Statistik Presensi Pribadi`, `Status Tugas Hari Ini`, `Jadwal Mengajar Hari Ini`) remain in exact order in `HomeView.tsx`. Retain reverse geocoding and watermark methods in `CameraSelfieCapture.tsx`.
2. **Risk: Mobile Camera Hardware Lock (`TrackStartError`)**
   - *Mitigation*: Introduce a 100ms micro-delay between `track.stop()` and the subsequent `getUserMedia` call. Guard against rapid clicks using `isSwitchingRef`.
3. **Risk: Missing teacher records due to whitespace in names**
   - *Mitigation*: Trim and normalize name strings before comparison.
4. **Risk: Master data pagination reset**
   - *Mitigation*: Always reset `page` to `0` when any filter or search value changes.

---

## Conclusion

The codebase is well-structured and ready for the implementation of Requirement R3. All target files have been identified, the root causes of the bugs are pinpointed with exact lines of code, and detailed architectural solutions have been designed to ensure seamless integration, high reliability on mobile/iOS devices, and compliance with all acceptance criteria.
