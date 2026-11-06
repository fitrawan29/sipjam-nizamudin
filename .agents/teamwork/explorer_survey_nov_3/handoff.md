# Handoff Report: Comprehensive Survey for Requirements R4 & R6

- **Agent Name**: `explorer_survey_nov_3`
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_3\`
- **Target Requirements**:
  - **R4**: Penyesuaian Master Data (Alur Input, Template, Progress, dan Error Handling)
  - **R6**: Preservasi Fitur dan Logika Eksisting (Zero Regression)
- **Date**: 2026-11-06T22:38:00Z

---

## 1. Observation

### 1.1 Master Data Architecture & Component Layout (R4)
- **Primary Component**: `src/components/AdminDataView.tsx` (2,766 lines, 133 KB)
  - Tab definitions at lines 206–216:
    ```tsx
    const tabs = [
      { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
      { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' },
      { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
      { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
      { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
      { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas' },
      { id: 'Pengguna', label: 'Pengguna', table: 'users' },
      { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
      { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok' },
    ];
    ```
  - Sub-views embedded conditionally based on `activeTab` (lines 2353–2365):
    - `sistem_blok` / `blok`: `<SistemBlokView user={user} />` (`src/components/SistemBlokView.tsx`)
    - `Pengguna`: `<AdminPenggunaView user={user} />` (`src/components/AdminPenggunaView.tsx`)
    - `Data_Kelas`: `<AdminKelasView user={user} />` (`src/components/AdminKelasView.tsx`)
    - Other tabs (`Data_Siswa`, `Data_Mapel`, `Data_Guru`, `Jadwal_Pelajaran`, `Wali_Kelas`, `Kalender_Pendidikan`): Rendered directly inside `AdminDataView.tsx` with generic table, filter bar, CSV import, and SweetAlert2 manual modal.
- **Workflow Guide Observation**:
  - Searching for `"panduan"`, `"alur"`, or stepper/guide in `AdminDataView.tsx` returned **0 results**.
  - While tabs are ordered 1–9, there is **no visual workflow guide / stepper** or informational banner explaining the prerequisite sequence of data population to administrators.
- **Dependency Validation Observation**:
  - In `src/lib/dataIntegrityGuard.ts`:
    - Function `parseAndValidateMasterCsv` (lines 788–1239) and `importMasterDataFromCsv` (lines 1245–1636):
      - `data_siswa`: Only checks `nama_siswa` and `kelas` are non-empty. Does **not** check whether `kelas` exists in `data_kelas` or `wali_kelas`.
      - `jadwal_pelajaran`: Only checks `hari`, `nama_guru`, `mata_pelajaran`, and `kelas` are non-empty strings. Does **not** check whether `nama_guru` exists in `data_guru`, `mata_pelajaran` exists in `data_mapel`, or `kelas` exists in `data_kelas`.
      - `wali_kelas`: Only checks `kelas` and `nama_guru` are non-empty strings. Does **not** check whether `nama_guru` exists in `data_guru` or `kelas` exists.
      - In contrast, the manual modal for `Jadwal_Pelajaran` in `AdminDataView.tsx` (lines 1056–1063) **already checks** dependencies interactively:
        ```tsx
        if (guruList.length === 0) {
          showToast('Peringatan', 'Belum ada data guru. Silakan tambahkan data guru terlebih dahulu.', 'warning');
          return;
        }
        if (mapelList.length === 0) {
          showToast('Peringatan', 'Belum ada data mapel. Silakan tambahkan data mapel terlebih dahulu.', 'warning');
          return;
        }
        ```
        However, the CSV bulk upload path completely skips this validation.

### 1.2 Template vs. Database Schema Alignment (R4)
Templates defined in `AdminDataView.tsx` lines 487–523 vs. `src/types/database.ts`:
1. **Data_Kelas**:
   - Template headers: `['nama_kelas', 'tingkat', 'jurusan']`
   - Sample: `['X Merdeka', '10', 'Umum']`
   - DB / Runtime schema: Handled by `data_kelas` with fallback to `wali_kelas`. Template columns align directly with `ALLOWED_COLUMNS_BY_TABLE.data_kelas` (`['id', 'sekolah_id', 'nama_kelas', 'tingkat', 'jurusan']`).
2. **Data_Siswa**:
   - Template headers: `['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']`
   - Sample: `['0114367407', 'Moh. Candra Podomi', 'X Merdeka', 'Laki-laki', 'Aktif', '081234567890']`
   - DB Schema: `public.data_siswa` (`id`, `sekolah_id`, `nisn`, `nama_siswa`, `kelas`, `gender`, `status`, `no_hp_ortu`, `qr_code`).
   - Alignment: 100% compliant. `id` and `sekolah_id` are auto-injected; `qr_code` defaults to NISN.
3. **Data_Guru**:
   - Template headers: `['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']`
   - Sample: `[user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001', '198501012010011001', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', '6281241316190', 'Aktif', 'vitridotulong26@gmail.com']`
   - DB Schema: `public.data_guru` (`id`, `sekolah_id`, `nip`, `nama_guru`, `mata_pelajaran`, `no_hp`, `status`, `email`, `user_id`, `wajib_hadir_hanya_mengajar`).
   - Alignment Caveat: Only `Data_Guru` exposes `sekolah_id` in its template headers. If users delete or alter this UUID in Excel, upload throws: `Baris X: Kolom "sekolah_id" ("...") tidak sesuai dengan ID sekolah akun Anda`. In `parseAndValidateMasterCsv` (lines 917–924), there is already fallback to auto-inject from session (`user.sekolah_id`), but the template sample still exposes the raw UUID.
4. **Data_Mapel**:
   - Template headers: `['id', 'nama_mata_pelajaran', 'kategori']`
   - Sample: `['MP-01', 'Matematika Wajib', 'X Merdeka']`
   - DB Schema: `public.data_mapel` (`id: string`, `sekolah_id: string`, `nama_mata_pelajaran: string | null`, `kategori: string | null`, `kelompok: string | null`, `kode_mapel: string | null`, `nama_mapel: string | null`).
   - Alignment: Compliant. Note that `id` is alphanumeric text ('MP-01').
5. **Kalender_Pendidikan**:
   - Template headers: `['tanggal', 'keterangan', 'tipe']`
   - Sample: `['2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']`
   - DB Schema: `public.kalender_pendidikan` (`id: uuid`, `sekolah_id: uuid`, `tanggal`, `keterangan`, `tipe`, `tanggal_mulai`, `tanggal_selesai`).
   - Alignment: Compliant. Legacy `KP-01` ID is excluded as required by AST test `tests/adversarial_o27_m4_challenger.test.ts:177-178`.
6. **Jadwal_Pelajaran**:
   - Template headers: `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']`
   - Sample: `['Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']`
   - DB Schema: `public.jadwal_pelajaran` (`id: uuid`, `sekolah_id: uuid`, `hari`, `nama_guru`, `mata_pelajaran`, `kelas`, `jam_mulai`, `jam_selesai`, `mapel`, `user_id`).
   - Alignment: Compliant. Legacy `JP-01` ID is excluded as required by AST test `tests/adversarial_o27_m4_challenger.test.ts:185-186`.
7. **Wali_Kelas**:
   - Template headers: `['kelas', 'nama_guru', 'nip', 'tahun_ajaran']`
   - Sample: `['X Merdeka', 'Fitri Aprilia Dotulong', '198501012010011001', configuredTahunAjaran || '2024/2025']`
   - DB Schema: `public.wali_kelas` (`id: uuid`, `sekolah_id: uuid`, `kelas`, `guru_id: uuid | null`, `nama_guru`, `nip`, `tahun_ajaran`).
   - Alignment: Compliant. `configuredTahunAjaran` is dynamically bound (verified by `tests/master_data_wali_kelas_tahun_ajaran_sync.test.ts:1.6`).
8. **Pengguna** & **sistem_blok**:
   - Currently, `templates` in `AdminDataView.tsx` does **not** define entries for `Pengguna` or `sistem_blok`.
   - `Pengguna` accounts are auto-synced from `data_guru` via `syncTeacherAccounts(supabase, sekolahId)` in `AdminPenggunaView.tsx`.
   - `sistem_blok` is managed via custom UI forms in `SistemBlokView.tsx`.

### 1.3 Upload Progress Visualization Observation (R4)
- In `AdminDataView.tsx` (lines 572, 665, 732):
  ```tsx
  setLoading(true);
  try {
    const text = await file.text();
    // ...
    const { count, rows } = await importMasterDataFromCsv(supabase, text, targetTable, user);
    // ...
  } finally {
    setLoading(false);
  }
  ```
  - `loading` state only disables the upload button and sets `<i className="fa-solid fa-rotate-right animate-spin"></i>`.
  - There is **no progress bar, no percentage (0–100%), no indicator of which batch is currently being sent to Supabase**, and no UI element showing stage progress.
- In `AdminKelasView.tsx` (lines 451, 569):
  - Uses `setActionLoading(true)` with identical behavior: button spinner only, no progress bar.

### 1.4 Error Handling Observation (R4)
- In `src/lib/dataIntegrityGuard.ts` (lines 1550–1562):
  ```ts
  if (error.code === '23503' || String(error.message).includes('sekolah_id_fkey') || String(error.message).includes('foreign key constraint')) {
    throw new Error('ID sekolah ("sekolah_id") dalam CSV tidak terdaftar di sistem sekolah. Pastikan menggunakan ID sekolah yang valid.');
  }
  ```
  - **Defect**: Every PostgreSQL error code `23503` (foreign key violation) is assumed to be `sekolah_id_fkey`, even if the failure was actually caused by `wali_kelas_guru_id_fkey` or another relation!
  - `error.code === '23502'` (not-null violation) produces raw database messages like: `Gagal menyimpan data: terdapat kolom wajib yang bernilai kosong (null value in column "nama_guru" violates not-null constraint)`. It does not report which CSV row number failed.
- In `AdminDataView.tsx` (lines 702–730):
  - Catches `err` and only triggers `Swal.fire` if the message contains `'Baris '`, `'Kolom '`, `'wajib'`, or `'dilarang'`.
  - For unhandled DB exceptions, it falls back to a brief `showToast('Gagal Impor CSV', errorMsg, 'error')` which disappears after 3 seconds, leaving the user with no actionable details.

### 1.5 Automated Test Suite & Build Verification (R6)
- **Test Runner & Scripts**:
  - `package.json` contains:
    - `"test": "tsx tests/r1_r10_ponytail_verification.test.ts && tsx tests/imageUrl.test.ts && ..."` (60 test files chained with `&&`).
    - `"test:e2e": "tsx tests/e2e/run_all_e2e.ts"`.
  - Total test files in `tests/`: **232 files** (60 in `npm test`, plus 172 additional regression/adversarial test files).
  - Runner is `tsx` (TypeScript Execute without compilation overhead). Tests run fast: isolated tests take ~1.5 to 3.5 seconds each.
- **Build Verification Observations**:
  - Command: `npx tsc --noEmit`
    - **Result**: Exited with code 1.
    - Errors:
      1. `src/components/AdminVerifView.tsx(475,1): error TS1184: Modifiers cannot appear here.`
         - Cause: `export function isRealSubmittedJournal(j: any)` is placed inside the body of the `AdminVerifView` component instead of outside at module level.
      2. `src/components/HomeViewAdmin.tsx(529,11): error TS2322: Type '"blue" | "rose"' is not assignable to type '"green" | "amber" | "rose" | "gray"'.`
         - Cause: `jurnalColor` type definition only accepts `'green' | 'amber' | 'rose' | 'gray'`, but line 529 assigns `'blue'`.
  - Command: `npm run build`
    - **Result**: Exited with code 1.
    - Error: `Turbopack build failed: ./src/components/AdminVerifView.tsx:475:1: Error: 'import', and 'export' cannot be used outside of module code`.

---

## 2. Logic Chain

### 2.1 Logic Chain for Requirement R4 (Master Data)
1. **Observation**: The navigation tabs in `AdminDataView.tsx` are already configured in the sequence: `Data_Siswa` (1), `Data_Kelas` (2), `Data_Mapel` (3), `Data_Guru` (4), `Jadwal_Pelajaran` (5), `Wali_Kelas` (6), `Pengguna` (7), `Kalender_Pendidikan` (8), and `sistem_blok` (9).
2. **Inference**: Tab ordering is structurally in place. However, users lack a clear, intuitive visual workflow guide ("panduan alur penginputan") explaining that data must be entered in this order because downstream entities depend on upstream entities.
3. **Observation**: `importMasterDataFromCsv` validates individual row fields in memory (e.g., regex, dummy checks), but performs **zero cross-table dependency checks** before issuing bulk upserts.
4. **Inference**: If a user uploads Jadwal with non-existent teachers or subjects, or uploads Wali Kelas with a non-existent class, either orphaned records are created or foreign key database constraints trigger cryptic errors.
5. **Observation**: Bulk upsert in `importMasterDataFromCsv` processes data in batches of 50 without any progress callback mechanism. `AdminDataView` and `AdminKelasView` only toggle a boolean `loading` state.
6. **Inference**: To satisfy Acceptance Criteria 3 ("Komponen upload master data menampilkan indikator progress yang bergerak saat proses pengunggahan berlangsung"), `importMasterDataFromCsv` must accept a progress callback `(progress: { stage: string; current: number; total: number; percentage: number }) => void`, and `AdminDataView` / `AdminKelasView` must render an interactive visual progress bar with percentage and phase description.
7. **Observation**: Database errors are caught generically; `error.code === '23503'` erroneously asserts that `sekolah_id` is invalid, misleading administrators when other foreign keys fail.
8. **Inference**: Error handling must map database error codes (23503, 23502, 23505) and pre-upload dependency failures to specific CSV row numbers with actionable Indonesian explanations.

### 2.2 Logic Chain for Requirement R6 (Zero Regression & Invariants)
1. **Observation**: Existing test suites (e.g., `tests/adversarial_o27_m4_challenger.test.ts`, `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`, `tests/master_data_wali_kelas_tahun_ajaran_sync.test.ts`) assert exact source code substrings and AST properties of `AdminDataView.tsx`:
   - `tabs` array placement (`Data_Kelas` must be between `Data_Siswa` and `Data_Guru`).
   - `Kalender_Pendidikan` and `Jadwal_Pelajaran` templates must NOT include `'id'` or legacy strings (`'KP-01'`, `'JP-01'`).
   - All 7 entity templates (`Data_Kelas`, `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`) must be registered in the `templates` dictionary.
   - `configuredTahunAjaran` state and event listeners must be preserved.
2. **Inference**: Any modification to `AdminDataView.tsx` or `dataIntegrityGuard.ts` must strictly preserve these existing AST signatures; otherwise, regression tests in `npm test` will break.
3. **Observation**: `npx tsc --noEmit` and `npm run build` currently fail due to two specific pre-existing TypeScript bugs (`AdminVerifView.tsx:475:1` and `HomeViewAdmin.tsx:529:11`).
4. **Inference**: In order for full build verification (`npm run build`) to succeed during the implementation phase, these two syntax/type errors must be corrected without altering their underlying business logic.

---

## 3. Caveats
1. **Supabase Realtime vs. Mocking in Test Suites**: The project test suites run in node environments using mocked or cached Supabase responses (`[supabaseClient] MISSING ENV VARS! Falling back to placeholder client`). Any dependency validation added to `importMasterDataFromCsv` must gracefully handle cases where Supabase query returns empty or client methods are mocked (defensive optional chaining: `supabase?.from?.(...)?`).
2. **`data_kelas` Schema Resilience**: As observed in `src/lib/dataIntegrityGuard.ts` lines 1528–1544, PostgreSQL schema cache in Supabase may occasionally report `data_kelas` as missing (PGRST205), in which case the app falls back to syncing classes in `wali_kelas` and `localStorage`. Dependency validation for "Kelas" must check both `data_kelas` and `wali_kelas` (or local class cache) so that valid uploads are not blocked if the database view is degraded.
3. **Execution Time of Full Test Suite**: Running all 60 chained tests in `npm test` takes approximately 2–3 minutes. Individual test files should be run during development for rapid feedback, followed by the complete suite prior to handoff.

---

## 4. Conclusion & Architectural Recommendations

### 4.1 Concrete Implementation Plan for R4 (Master Data)

#### A. Workflow Guide Component (Panduan Alur Penginputan)
In `AdminDataView.tsx`, add an interactive visual workflow stepper card above the tab navigation:
- Display the sequential steps 1–9:
  1. **Siswa** (Entri data identitas murid)
  2. **Kelas** (Struktur rombel & tingkat)
  3. **Mapel** (Katalog mata pelajaran)
  4. **Guru** (Data pendidik & NIP)
  5. **Jadwal** (Penugasan KBM guru & kelas)
  6. **Wali Kelas** (Penetapan wali per rombel)
  7. **Pengguna** (Sinkronisasi akun guru)
  8. **Kalender** (Agenda akademik & libur)
  9. **Periode Blok** (Opsional - pengaturan blok KBM)
- Highlight the currently active tab in the stepper.
- Provide collapsible guide details explaining dependency requirements (e.g. "Unggah Kelas terlebih dahulu sebelum mengisi Siswa atau Jadwal").

#### B. Relational Dependency Validation in `importMasterDataFromCsv`
Enhance `dataIntegrityGuard.ts`:
1. When uploading **Data Siswa**:
   - Query existing classes (`data_kelas` / `wali_kelas`).
   - If a student's `kelas` is not registered, raise a clear error: `Baris ${rowNum}: Kelas "${kelasName}" belum terdaftar pada Master Data Kelas. Silakan buat kelas tersebut terlebih dahulu.`
2. When uploading **Jadwal Pelajaran**:
   - Fetch active teachers from `data_guru`, subjects from `data_mapel`, and classes from `data_kelas`.
   - Validate each row:
     - If teacher missing: `Baris ${rowNum}: Guru "${row.nama_guru}" tidak ditemukan pada Master Data Guru.`
     - If subject missing: `Baris ${rowNum}: Mata pelajaran "${row.mata_pelajaran}" tidak ditemukan pada Master Data Mapel.`
     - If class missing: `Baris ${rowNum}: Kelas "${row.kelas}" tidak ditemukan pada Master Data Kelas.`
3. When uploading **Wali Kelas**:
   - Validate that the teacher exists in `data_guru` and class exists in `data_kelas`.

#### C. Upload Progress Visualization (Progress Bar / Indikator)
1. Add a progress callback parameter to `importMasterDataFromCsv`:
   ```ts
   export async function importMasterDataFromCsv(
     supabase: any,
     csvText: string,
     tableName: string,
     user?: any,
     onProgress?: (progress: {
       stage: string;
       percentage: number;
       currentBatch: number;
       totalBatches: number;
       processedRows: number;
       totalRows: number;
     }) => void
   )
   ```
2. Stages to emit:
   - Stage 1: "Memvalidasi format berkas CSV..." (10%)
   - Stage 2: "Memverifikasi dependensi data master (Guru, Mapel, Kelas)..." (25%)
   - Stage 3: "Menyimpan data ke database (Baris X dari Y)..." (25% -> 85%)
   - Stage 4: "Menyinkronkan akun & indeks sistem..." (90%)
   - Stage 5: "Selesai!" (100%)
3. In `AdminDataView.tsx` and `AdminKelasView.tsx`:
   - Introduce state: `uploadProgress: { active: boolean; stage: string; percentage: number; processed: number; total: number }`.
   - Render an interactive, animated Clay-styled progress card with a smooth gradient progress bar (`w-[${uploadProgress.percentage}%]`) and live percentage pill.

#### D. Specific & Actionable Error Handling
1. Replace generic DB constraint catches in `dataIntegrityGuard.ts` (lines 1550–1562):
   - For `error.code === '23503'`: Distinguish whether failure is `sekolah_id`, `guru_id`, or `mapel_id`.
   - For `error.code === '23502'`: Parse failing column from `error.message` and translate to user-friendly column name with row reference.
   - For `error.code === '23505'`: Identify the conflicting duplicate key with actionable advice.
2. In `AdminDataView.tsx`, ensure any upload failure opens the detailed SweetAlert2 diagnostic dialog with a formatted table of errors.

---

### 4.2 Concrete Implementation Plan for R6 (Zero Regression & Build Verification)

#### A. Fix Preexisting Compilation Errors
1. In `src/components/AdminVerifView.tsx`:
   - Move `isRealSubmittedJournal` outside the component (place it before or after `AdminVerifView` component declaration at module scope).
2. In `src/components/HomeViewAdmin.tsx`:
   - Line 529: Change `jurnalColor = presensiDatangStatus === 'Sakit' ? 'rose' : 'blue';` to `'rose' : 'amber'` or update the type of `jurnalColor` to allow `'blue'`.

#### B. Role Invariant Matrix

| Role | Key Invariants to Preserve | Critical Files to Protect |
| :--- | :--- | :--- |
| **Admin** | Full master data access, CRUD across all 9 tabs, school configuration, verification management. Must retain role check `isMasterDataModificationAllowed`. | `AdminDataView.tsx`, `AdminKelasView.tsx`, `AdminConfigView.tsx`, `AdminVerifView.tsx` |
| **Guru** | KBM journal submission, presensi re-submission upon rejection, personal history, device upload. Cannot mutate master data (`403 Forbidden`). | `GuruPresensi.tsx`, `GuruJurnal.tsx`, `DokumenView.tsx` |
| **Wali Kelas** | Classroom supervisory access (`supervisi-kelas`), student attendance tracking (`view-rekap-siswa`), exclusive access to `view-gradebook` Rapor tab. | `RaporView.tsx`, `navigation.ts`, `AppScreen.tsx` |
| **Guru Piket** | Concurrency lease lock (`piket_form_lock`), gate attendance scanning (`presensi_siswa`), truancy cross-checking. | `PiketView.tsx`, `piketLock.ts` |
| **Kepala Sekolah** | Executive Dashboard, supervision read-only access for verif and rekap. Cannot modify master data. | `HomeView.tsx`, `AdminVerifView.tsx`, `AdminRekapView.tsx` |
| **Pengawas Dinas** | Regional dashboard (`view-dinas-overview`), multi-school satellite monitoring, strict tenant isolation. | `DinasDashboard.tsx`, `ClaySidebar.tsx` |
| **Superadmin** | Master tenant selector, network overview, system-wide admin proxy. | `SuperadminView.tsx`, `AppScreen.tsx` |

---

## 5. Verification Method

### 5.1 Test Execution Commands
1. **Targeted Master Data Tests**:
   ```powershell
   npx tsx tests/template_master_data_import_visibility.test.ts
   npx tsx tests/master_data_admin_role_restriction.test.ts
   npx tsx tests/master_data_wali_kelas_tahun_ajaran_sync.test.ts
   npx tsx tests/adversarial_student_csv_review.test.ts
   npx tsx tests/production_admin_adjustments.test.ts
   ```
2. **Full Regression Test Suite**:
   ```powershell
   npm test
   ```
3. **Typecheck & Production Build**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```

### 5.2 Invalidation Conditions
- If `npx tsc --noEmit` fails, build verification is invalidated.
- If any test in `npm test` fails, the zero regression requirement (R6) is invalidated.
- If `AdminDataView.tsx` removes or alters `configuredTahunAjaran` or changes the position of `Data_Kelas` relative to `Data_Siswa`, tests `1.9` in `admin_submenu_kelas_dan_alokasi_siswa.test.ts` and `1.1` in `master_data_wali_kelas_tahun_ajaran_sync.test.ts` will immediately fail.
- If CSV templates for `Kalender_Pendidikan` or `Jadwal_Pelajaran` re-introduce `'id'`, test `CSV-07` in `adversarial_o27_m4_challenger.test.ts` will fail.
