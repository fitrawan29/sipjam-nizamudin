# Handoff Report: Survey and Solution Architecture for R1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa)

**Explorer**: `explorer_survey_1`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\`  
**Date / Timestamp**: 2026-11-06T08:05:00Z  
**Target Milestone**: Survey Phase (R1 Architecture)  
**Parent Orchestrator**: `77685953-a979-46b9-9e32-e6b24ab55eb5`

---

## 1. Observation

### 1.1 Admin Navigation & Master Data Entry Point
- In `src/components/AppScreen.tsx` (lines 726–742), the navigation menu for `role === 'admin'` defines:
  ```tsx
  const menuItemsAdmin = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' },
    { id: 'view-sistem-blok', icon: 'fa-layer-group', label: 'Sistem Blok' },
    { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' },
    { id: 'view-piket', icon: 'fa-shield-halved', label: 'Kelola Piket' },
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
    { id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' },
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
    { id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik' },
    { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Akhir' },
    { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' },
    { id: 'view-admin-data', icon: 'fa-database', label: 'Master' },
    { id: 'view-admin-backup', icon: 'fa-hard-drive', label: 'Akses Data / Backup' },
    { id: 'view-admin-config', icon: 'fa-gears', label: 'Sistem' }
  ];
  ```
- In `src/lib/navigation.ts` (lines 146–150), `getConsolidatedMenuItems` defines the Master Data item for Admin as:
  ```tsx
  {
    id: 'view-admin-data',
    icon: 'fa-database',
    label: 'Master Data & Kalender',
    dataTour: 'view-admin-data view-sistem-blok'
  }
  ```
- In `src/components/AppScreen.tsx` (lines 1306–1327), when `currentView === 'view-admin-data'`, access is strictly guarded:
  ```tsx
  {currentView === 'view-admin-data' && (
    isAdmin || isSuperadmin ? (
      <AdminDataView user={user} initialTab={urlTab || undefined} />
    ) : (
      <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Halaman <strong>Data Master</strong> secara eksklusif hanya dapat diakses oleh Administrator...
        </p>
      </div>
    )
  )}
  ```

### 1.2 Current Sub-menus / Tabs under Master Data
- In `src/components/AdminDataView.tsx` (lines 42–58 and lines 117–126), the current master data tabs are:
  ```tsx
  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
    { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok' },
    { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas' },
    { id: 'Pengguna', label: 'Pengguna', table: 'users' },
  ];
  ```
- **There is NO "Kelas" sub-menu or tab currently present** in `tabs` or anywhere in `AdminDataView.tsx`.
- Special modular views embedded inside `AdminDataView.tsx` (lines 1926–1934):
  ```tsx
  {(activeTab === 'sistem_blok' || activeTab === 'blok') ? (
    <div className="mt-2">
      <SistemBlokView user={user} />
    </div>
  ) : activeTab === 'Pengguna' ? (
    <div className="mt-2">
      <AdminPenggunaView user={user} />
    </div>
  ) : (
    ... standard master table grid ...
  )}
  ```

### 1.3 How Classes Are Currently Handled in the Codebase
- In `src/types/database.ts` and `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (lines 81–94, 110–121, 123–135), there is **no standalone table `public.data_kelas` or `public.kelas`** defined in the default schema.
- Instead, class is stored as a free-form `TEXT` attribute in several tables:
  1. `data_siswa.kelas`: `TEXT NOT NULL`
  2. `wali_kelas.kelas`: `TEXT NOT NULL` (with constraint `uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas)`)
  3. `jadwal_pelajaran.kelas`: `TEXT NOT NULL`
  4. `guru_mapel.kelas`: `TEXT NOT NULL`
  5. `absensi.kelas`: `TEXT`
- Wherever classes are queried (e.g. `AdminDataView.tsx:774-778`, `DokumenView.tsx:161`, `RekapSiswaView.tsx:103`), distinct class names are dynamically derived:
  ```ts
  let sQuery = supabase.from('data_siswa').select('kelas');
  if (user?.sekolah_id) sQuery = sQuery.eq('sekolah_id', user.sekolah_id);
  const { data: sData } = await sQuery;
  if (sData) kelasListOptions = [...new Set(sData.map(s => s.kelas).filter(Boolean))].sort() as string[];
  ```
- In `src/lib/supabaseClient.ts` (lines 119, 136–138), the security infrastructure already pre-registers `data_kelas` and `kelas` under `MASTER_DATA_TABLES`:
  ```ts
  export const MASTER_DATA_TABLES = [
    'data_siswa',
    'siswa',
    'data_guru',
    'guru',
    'jadwal_pelajaran',
    'jadwal_pembelajaran',
    'data_mapel',
    'mapel',
    'mata_pelajaran',
    'guru_mapel',
    'wali_kelas',
    'data_kelas',
    'kelas',
    'guru_kelas',
    'kalender_pendidikan',
    'sistem_blok',
  ] as const;
  ```
- In `supabase/migrations/20261102_restrict_master_data_to_admin.sql` (line 70):
  ```sql
  CALL public.setup_master_data_admin_policies('data_kelas');
  CALL public.setup_master_data_admin_policies('kelas');
  ```

### 1.4 How Students (Siswa) Are Displayed and How Class Allocation Is Currently Handled
- In `AdminDataView.tsx`:
  - Students are listed in a paginated grid (lines 2226–2250) under the `Data_Siswa` tab with:
    - Text search (`search`)
    - Class filter dropdown (`filter1`: "Semua Kelas", derived from `uniqueKelas`)
    - Status filter dropdown (`filter2`: "Semua Status", derived from `uniqueStatusSiswa`)
  - **Individual student class edit**:
    Admin clicks "Edit" on a student card (lines 1165–1210). A SweetAlert modal appears where the admin can edit `kelas` as a plain input text box. Updating this sends an `UPDATE` to `supabase.from('data_siswa').update({ kelas, ... }).eq('id', studentId)`.
  - **Batch Class Allocation / Movement**:
    Admin selects students using checkboxes and clicks "Naik Kelas" (lines 1994–2001). This opens `src/components/NaikKelasModal.tsx` which provides three modes:
    1. *Mode Perorangan* (lines 145–206): Updates `kelas` and `status` for checked students.
    2. *Mode Per Kelas* (lines 209–279): Moves all students from `sourceKelas` to `perKelasTargetKelas`.
    3. *Mode Satu Angkatan* (lines 282–350): Bulk advances cohorts (Grade 10 -> 11, 11 -> 12, 12 -> Lulus).
- **Current Limitation**: Class allocation is buried inside student card editing and the "Naik Kelas" modal. There is no class-oriented workspace where an admin can inspect a class, view its total enrollment, see unassigned/new students, and move or assign students between classes from a single centralized dashboard.

### 1.5 Existing CSV Template & Upload Handlers
- In `AdminDataView.tsx` (lines 228–259), `handleDownloadTemplate` defines templates for 6 entities:
  `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`.
  **There is no entry for `Kelas` / `Data_Kelas`**.
- In `src/lib/dataIntegrityGuard.ts` (lines 833–860), `importMasterDataFromCsv` parses CSV records and executes batch upsert to Supabase.

### 1.6 Current Test Suite Status
- Command `npm test` executed across all 54 test files: **100% Passed (0 Failures)**.

---

## 2. Logic Chain

1. **Premise (Navigation & Access)**:
   - Observation 1.1 shows that Admin navigates to Master Data via `view-admin-data`, rendered by `<AdminDataView user={user} initialTab={urlTab} />`. Non-admin access is blocked.
   - Observation 1.2 shows that `AdminDataView` uses a tabbed navigation system (`tabs` state).
   - In accordance with R1, adding a sub-menu "Kelas" is cleanly implemented by adding `{ id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' }` to `tabs` in `AdminDataView.tsx`.
   - In `src/lib/navigation.ts`, adding route aliases `'view-admin-kelas'` and `'view-kelas'` pointing to `{ view: 'view-admin-data', tab: 'Data_Kelas' }` ensures seamless deep-linking (`?view=view-admin-data&tab=Data_Kelas`) without breaking existing route aliases (verified by `tests/admin_submenu_pengguna_kredensial_guru.test.ts:518-522`).

2. **Premise (Sub-menu Architecture)**:
   - In Observation 1.2, special master views with rich workflows (such as `sistem_blok` and `Pengguna`) are implemented as dedicated modular components (`SistemBlokView.tsx`, `AdminPenggunaView.tsx`) rather than squeezing complex logic into `AdminDataView.tsx`.
   - Creating a dedicated component `src/components/AdminKelasView.tsx` adheres to the existing architectural pattern established in commit `7666712` (sub menu Pengguna) and keeps `AdminDataView.tsx` clean, maintainable, and low-risk.

3. **Premise (Data Model & Schema Resilience)**:
   - Observation 1.3 shows that classes currently exist primarily through `data_siswa.kelas` and `wali_kelas.kelas`.
   - To ensure zero regression and immediate usability:
     `AdminKelasView` must load active student data from `data_siswa` (`id, nama_siswa, nisn, kelas, gender, status`) and homeroom data from `wali_kelas` (`kelas, nama_guru, nip, tahun_ajaran`).
     It aggregates these records to present:
     - Distinct class list
     - Enrolled student count per class
     - Grade level / Tingkat (using `extractTingkat` from `src/components/DokumenView.tsx` or regex matching X/XI/XII/VII/VIII/IX/1-6)
     - Assigned homeroom teacher
     - Distinct group for **"Siswa Belum Dialokasikan (Tanpa Kelas)"** (students with `kelas === null`, `''`, or undefined).
   - Furthermore, `AdminKelasView` will support persisting and reading from `data_kelas` if present in the database, with graceful fallback to `data_siswa` aggregation if the table has not yet been migrated.

4. **Premise (Centralizing Student Class Allocation)**:
   - In Observation 1.4, class assignment was scattered across individual student edit modals and `NaikKelasModal`.
   - In `AdminKelasView`:
     - Admin selects any class card to open the **Centralized Allocation Workspace**:
       1. **Class Student Roster**: Shows all students currently assigned to this class.
       2. **Move/Transfer Students ("Pindahkan Siswa")**: Admin selects one or multiple students and picks a target destination class from a dropdown.
       3. **Add/Assign Students ("Alokasikan Siswa Masuk")**: Admin can pick unassigned students (or students from another class) and allocate them into the active class with 1 click.
       4. **Inline Quick Reassignment**: Per-row dropdown or button to shift individual students.
       5. **Class Rename**: Allows renaming a class (e.g. from "X-1" to "X Merdeka 1"), updating all referencing records in `data_siswa`, `wali_kelas`, and `jadwal_pelajaran`.
       6. **Class Creation**: "+ Tambah Kelas Baru" to declare a new class even before students are assigned to it.
   - All mutations execute direct Supabase updates on `data_siswa`:
     `supabase.from('data_siswa').update({ kelas: targetKelas }).in('id', studentIds).eq('sekolah_id', sekolahId)`
     and trigger reactive local state updates immediately.

5. **Premise (Non-Regression & CSV Templates)**:
   - Observation 1.5 shows that `Template_Data_Siswa`, `Template_Data_Guru`, etc. already exist.
   - Adding `Data_Kelas` template (`Template_Data_Kelas.csv` with headers `nama_kelas,tingkat,jurusan,tahun_ajaran`) completes the master data template catalog required by R2 without modifying existing CSV templates.
   - Existing tabs (`Data_Siswa`, `Data_Guru`, `Wali_Kelas`, etc.) remain 100% operational, preserving all existing test assertions.

---

## 3. Caveats

1. **Database Schema State**:
   - `data_siswa`, `wali_kelas`, and `jadwal_pelajaran` all currently exist and are actively populated with live school data.
   - A standalone `data_kelas` table is registered in `MASTER_DATA_TABLES` (in `supabaseClient.ts`), but not in `SETUP_NEW_SCHOOL_TEMPLATE.sql`.
   - Therefore, `AdminKelasView` must not fail if `data_kelas` table query returns a schema cache or missing relation error. It must seamlessly fall back to aggregating from `data_siswa` and `wali_kelas`.
2. **Multi-Tenant Scoping**:
   - Every read and write in `AdminKelasView` must explicitly scope to `user?.sekolah_id` to prevent cross-school data leakage, matching the multi-tenant architecture.
3. **Role Enforcement**:
   - Only `Admin` and `Superadmin` may perform mutations, enforced by `isMasterDataModificationAllowed(user?.role)`.

---

## 4. Conclusion & Architectural Recommendation

### Recommended Implementation Structure for R1:

1. **Component Creation (`src/components/AdminKelasView.tsx`)**:
   - Create a dedicated component with:
     - Header bar with search, filter by Tingkat, "+ Tambah Kelas", and "Promosi / Naik Kelas" shortcut.
     - Summary metrics: Total Kelas, Total Siswa Teralokasi, Siswa Tanpa Kelas.
     - Responsive grid of Class Cards (displaying Class Name, Tingkat, Student Count, Wali Kelas).
     - Special attention card for "Siswa Belum Memiliki Kelas" (if any students have null/empty class).
     - Interactive Student Allocation Drawer / Panel:
       - Displays student roster for the selected class.
       - Multi-select checkbox with action "Pindahkan ke Kelas...".
       - Action "+ Masukkan Siswa ke Kelas Ini" (selector from unallocated or other students).
       - Action "Ubah Nama Kelas" with cascading updates across `data_siswa`, `wali_kelas`, and `jadwal_pelajaran`.
       - Action "Hapus Kelas" (safely blocked if class still has students).
     - SweetAlert confirmation dialogs and toasts for all mutation actions.

2. **Integration in `src/components/AdminDataView.tsx`**:
   - Add `{ id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' }` to `tabs` (placed logically between `Data_Siswa` and `Data_Guru`).
   - Add tab resolution:
     ```tsx
     if (initialTab === 'Data_Kelas' || initialTab === 'data_kelas' || initialTab === 'Kelas' || initialTab === 'kelas') {
       return 'Data_Kelas';
     }
     ```
   - Render `AdminKelasView`:
     ```tsx
     activeTab === 'Data_Kelas' ? (
       <div className="mt-2">
         <AdminKelasView user={user} />
       </div>
     ) : ...
     ```
   - Add `Data_Kelas` template to `templates`:
     ```tsx
     Data_Kelas: {
       filename: 'Template_Data_Kelas.csv',
       headers: ['nama_kelas', 'tingkat', 'jurusan', 'tahun_ajaran'],
       sample: ['X Merdeka 1', 'X', 'Umum', '2024/2025']
     }
     ```

3. **Navigation & Routing Updates (`src/lib/navigation.ts`)**:
   - In `VIEW_ALIASES`, register:
     ```tsx
     'view-admin-kelas': { view: 'view-admin-data', tab: 'Data_Kelas' },
     'view-kelas':       { view: 'view-admin-data', tab: 'Data_Kelas' },
     ```

4. **Integration with `src/lib/dataIntegrityGuard.ts`**:
   - In `normalizeCsvHeaders`, map `'nama_kelas'` and `'kelas'` properly for `tableName === 'data_kelas'`.
   - In `parseAndValidateMasterCsv`, handle `data_kelas` records.

---

## 5. Verification Method

To independently verify this survey and future implementation of R1:

1. **Automated Test Suite**:
   Run the full project test suite:
   ```powershell
   npm test
   ```
   *Expected*: All 54 test files pass without regression.

2. **New Dedicated Test Suite (`tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`)**:
   Create and execute verification tests covering:
   - [ ] Sub menu `Data_Kelas` / `Kelas` exists in `AdminDataView` tabs and is restricted to Admin.
   - [ ] Canonical route resolution: `resolveCanonicalRoute('view-admin-kelas')` resolves to `view-admin-data` with tab `Data_Kelas`.
   - [ ] Non-admin roles (Guru, Siswa, Dinas, Kepsek) cannot access the Kelas sub-menu.
   - [ ] Class list derivation from `data_siswa` correctly groups and calculates student counts.
   - [ ] Student allocation update logic correctly modifies `data_siswa.kelas` with multi-tenant scoping (`sekolah_id`).
   - [ ] Batch student transfer updates multiple student records atomically.
   - [ ] Renaming a class propagates changes to `data_siswa` and related tables.
   - [ ] `Template_Data_Kelas.csv` contains valid headers consistent with the class schema.

3. **Manual / Static Code Verification**:
   - Inspect `src/components/AdminDataView.tsx` for the new `Data_Kelas` tab and `AdminKelasView` mount.
   - Inspect `src/lib/navigation.ts` for `VIEW_ALIASES` integrity.
   - Verify zero modification to unrelated modules (guru, jurnal, piket, absensi).
