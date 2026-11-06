# Handoff Report: Master Data CSV Templates, Importer Architecture & Kelas Sub-Menu Survey

## 1. Observation

### 1.1 Master Data Navigation & UI Architecture
- **Location**: `src/components/AdminDataView.tsx` (Lines 117–126, Lines 1903–1924)
- **Observed Tabs**:
  ```typescript
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
- **Finding**: There is **no tab or sub-menu for `Kelas`** in `AdminDataView.tsx`. The entities currently exposed are Siswa, Guru, Mapel, Kalender, Jadwal, Periode Sistem Blok, Wali Kelas, and Pengguna.
- **Student Allocation Workflow**:
  - Class allocations are currently viewed solely inside the `Data_Siswa` tab.
  - Class progression/allocation modal exists in `src/components/NaikKelasModal.tsx` (opened via the "Naik Kelas" button in `AdminDataView.tsx:1996`), which updates `data_siswa.kelas` and `data_siswa.status` via Supabase query:
    ```typescript
    // src/components/NaikKelasModal.tsx:253-262
    let query = supabase
      .from('data_siswa')
      .update({ kelas: targetKelas, status: targetStatus })
      .in('id', targetIds);
    ```
  - Classes are currently dynamically derived as distinct values from `dataList` via `uniqueKelas` (`AdminDataView.tsx:1647-1655`).

### 1.2 CSV Template Generation & Download Mechanism
- **Location**: `src/components/AdminDataView.tsx` (Lines 227–285, `handleDownloadTemplate()`)
- **Observed Templates Record**:
  ```typescript
  const templates: Record<string, { filename: string; headers: string[]; sample: string[] }> = {
    Data_Siswa: {
      filename: 'Template_Data_Siswa.csv',
      headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu'],
      sample: ['114367407', 'Moh. Candra Podomi', 'X Merdeka', 'Laki-laki', 'Aktif', '081234567890']
    },
    Data_Guru: {
      filename: 'Template_Data_Guru.csv',
      headers: ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
      sample: [user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001', '198501012010011001', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', '6281241316190', 'Aktif', 'vitridotulong26@gmail.com']
    },
    Data_Mapel: {
      filename: 'Template_Data_Mapel.csv',
      headers: ['id', 'nama_mata_pelajaran', 'kategori'],
      sample: ['MP-01', 'Matematika Wajib', 'X Merdeka']
    },
    Kalender_Pendidikan: {
      filename: 'Template_Kalender_Pendidikan.csv',
      headers: ['tanggal', 'keterangan', 'tipe'],
      sample: ['2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']
    },
    Jadwal_Pelajaran: {
      filename: 'Template_Jadwal_Pelajaran.csv',
      headers: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
      sample: ['Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']
    },
    Wali_Kelas: {
      filename: 'Template_Wali_Kelas.csv',
      headers: ['kelas', 'nama_guru', 'nip', 'tahun_ajaran'],
      sample: ['X Merdeka', 'Fitri Aprilia Dotulong', '198501012010011001', '2024/2025']
    }
  };
  ```
- **Findings across all 7 Entities**:
  1. **Kelas**: Completely **missing** from `templates`. Clicking "Template" on a non-existent or newly added tab returns early (`if (!current) return;`).
  2. **Data_Siswa**: Download exists (`Template_Data_Siswa.csv`). Headers: `nisn, nama_siswa, kelas, gender, status, no_hp_ortu`. DB table has `id UUID` and `qr_code TEXT`.
  3. **Data_Guru**: Download exists (`Template_Data_Guru.csv`). Headers include `sekolah_id` (mandatory, asserted by `tests/data_guru_csv_import_sekolah_id_validation.test.ts:834`).
  4. **Data_Mapel**: Download exists (`Template_Data_Mapel.csv`). Headers: `id, nama_mata_pelajaran, kategori`. Sample includes string `'MP-01'`.
  5. **Kalender_Pendidikan**: Download exists (`Template_Kalender_Pendidikan.csv`). Headers: `tanggal, keterangan, tipe`. Note: `id` is strictly excluded per tests `tests/production_admin_adjustments.test.ts:688` and `tests/adversarial_r1_r5_stress_test.ts:513` to prevent PostgreSQL 22P02 error.
  6. **Jadwal_Pelajaran**: Download exists (`Template_Jadwal_Pelajaran.csv`). Headers: `hari, nama_guru, mata_pelajaran, kelas`. Note: `id` is strictly excluded per `tests/production_admin_adjustments.test.ts:696`.
  7. **Wali_Kelas**: Download exists (`Template_Wali_Kelas.csv`). Headers: `kelas, nama_guru, nip, tahun_ajaran`.

### 1.3 Database Schema Verification
- **Schema Definitions**: `src/types/database.ts` & `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`
- **Observed Table Columns**:
  - `data_siswa`: `id` (UUID PK), `sekolah_id` (UUID FK), `nisn` (TEXT), `nama_siswa` (TEXT), `kelas` (TEXT), `gender` (TEXT), `status` (TEXT), `no_hp_ortu` (TEXT), `qr_code` (TEXT).
  - `data_guru`: `id` (UUID PK), `sekolah_id` (UUID FK), `nip` (TEXT), `nama_guru` (TEXT), `mata_pelajaran` (TEXT), `no_hp` (TEXT), `status` (TEXT), `email` (TEXT), `user_id` (UUID FK), `wajib_hadir_hanya_mengajar` (BOOLEAN).
  - `data_mapel`: `id` (TEXT PK), `sekolah_id` (UUID FK), `nama_mata_pelajaran` (TEXT), `nama_mapel` (TEXT), `kode_mapel` (TEXT), `kategori` (TEXT), `kelompok` (TEXT).
  - `kalender_pendidikan`: `id` (UUID PK), `sekolah_id` (UUID FK), `tanggal` (DATE), `keterangan` (TEXT), `tipe` (TEXT), `tanggal_mulai` (DATE), `tanggal_selesai` (DATE).
  - `jadwal_pelajaran`: `id` (UUID PK), `sekolah_id` (UUID FK), `hari` (TEXT), `nama_guru` (TEXT), `mata_pelajaran` (TEXT), `mapel` (TEXT), `kelas` (TEXT), `jam_ke` (TEXT), `jam_mulai` (TIME), `jam_selesai` (TIME).
  - `wali_kelas`: `id` (UUID PK), `sekolah_id` (UUID FK), `kelas` (TEXT), `guru_id` (UUID FK), `nama_guru` (TEXT), `nip` (TEXT), `tahun_ajaran` (TEXT). Unique constraint: `CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas)`.
  - `data_kelas`: Querying `https://jicvvqxjyzntdrccnuyz.supabase.co/rest/v1/data_kelas` returned:
    `{"code":"PGRST205","message":"Could not find the table 'public.data_kelas' in the schema cache"}`.
    Similarly, `public.kelas` is not present in PostgREST schema cache.
    However, `MASTER_DATA_TABLES` in `src/lib/supabaseClient.ts:136-137` and `supabase/migrations/20261102_restrict_master_data_to_admin.sql:70-71` already register `data_kelas` and `kelas` under admin mutation policies.

### 1.4 CSV Parsing & Database Import Pipeline
- **Handler**: `AdminDataView.tsx:288-321` (`handleFileUpload()`)
  - Reads text via `await file.text()`.
  - Invokes `importMasterDataFromCsv(supabase, text, tabObj.table, user)`.
  - Displays SweetAlert2 feedback: toast success with count or error toast with `err.message`.
- **Parsing Utilities**: `src/lib/dataIntegrityGuard.ts`
  - `splitCsvRecords(text)` (Lines 509–539): RFC 4180 multiline record splitter.
  - Delimiter detector (Lines 599–612): Autodetects `,`, `;`, `\t`, `|`.
  - `parseCsvLine(line, delimiter)` (Lines 462–499): Quote-aware field parser.
  - `normalizeCsvHeaders(rawHeaders, tableName)` (Lines 544–580): Normalizes BOM, whitespace, quotes, Indonesian aliases (`no_hp_orang_tua -> no_hp_ortu`, `nama_lengkap -> nama_siswa/nama_guru`, `mapel -> mata_pelajaran`, `id_sekolah/school_id -> sekolah_id`).
  - `parseAndValidateMasterCsv(text, tableName, user)` (Lines 589–827):
    - Replaces invalid/legacy non-UUID IDs (`KP-01`, `JP-01`, numeric timestamps) with generated UUIDs to prevent PostgreSQL error 22P02.
    - Validates `sekolah_id` for `data_guru` (or auto-injects from session).
    - Cleans Excel apostrophe prefix on NIP (`row.nip.replace(/^['"]+|['"]+$/g, '')`).
    - Enforces anti-dummy validation and duplicate checks.
  - `importMasterDataFromCsv(supabase, csvText, tableName, user)` (Lines 833–900):
    - Chunks rows into batches of 50 (`batchSize = 50`).
    - Performs upsert: `upsertOptions.onConflict = tableName === 'wali_kelas' ? 'sekolah_id, kelas' : 'id'`.
    - Automatically synchronizes teacher user credentials into `users` table for imported `data_guru`.

### 1.5 Automated Test Suite & Test Harness
- **Test Runner**: Node with `tsx` (`package.json:10`).
- **Command**: `npm test` runs 54 chained test files sequentially.
- **Baseline Run**: Tested directly via PowerShell; all 54 test suites **PASSED with 0 errors (Exit code 0)**.
- **Specific CSV & Master Data Test Suites**:
  1. `tests/data_guru_csv_import_sekolah_id_validation.test.ts`: 31 tests verifying unit validation, missing `sekolah_id` rejection, session auto-injection, prevention of Postgres 23502 & 22P02, TSV/semicolon/pipe support, multiline CSV, batching, and `AdminDataView.tsx` template consistency.
  2. `tests/adversarial_o27_m4_challenger.test.ts`: 13 tests verifying legacy ID conversion (KP-01, JP-01), absence of `id` in Kalender & Jadwal templates, and form submission resilience.
  3. `tests/production_admin_adjustments.test.ts`: Asserts `Kalender_Pendidikan` and `Jadwal_Pelajaran` templates omit `id` and legacy strings.
  4. `tests/adversarial_r1_r5_stress_test.ts`: Static code matching asserting `Template_Kalender_Pendidikan.csv` and `Template_Jadwal_Pelajaran.csv` header structures.
  5. `tests/master_data_admin_role_restriction.test.ts`: Verifies mutation protection across all 16 master tables for non-admin roles.

---

## 2. Logic Chain

1. **Missing Kelas Sub-Menu & Template (R1, R2)**:
   - *Observation*: `AdminDataView.tsx` lines 117–126 omit any tab for `Kelas`, and lines 228–258 omit any template entry for `Kelas`.
   - *Deduction*: Role admin currently cannot navigate to a distinct `Kelas` sub-menu nor download/upload a CSV template specifically for classes. Centralized allocation of students is currently split between `NaikKelasModal.tsx` and manual student editing in `Data_Siswa`.
   - *Requirement R1*: Needs a dedicated sub-menu tab (`{ id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' }` or managed student allocation table) that lists classes, shows student counts, and enables central allocation/reassignment of students to classes.

2. **Database Alignment & Class Storage Mechanism (R2, R3)**:
   - *Observation*: PostgREST returned PGRST205 for `data_kelas` and `kelas`, whereas `data_siswa.kelas` is the authoritative source across the app (`absensi`, `jurnal_pembelajaran`, `jadwal_pelajaran`, `wali_kelas`, `gradebook` all reference class as string names matching `data_siswa.kelas`).
   - *Deduction*:
     - In sipjam-app, classes are primarily defined through the active roster in `data_siswa.kelas` and `wali_kelas.kelas`.
     - For CSV upload/import of `Kelas`, the system can operate seamlessly by either:
       a) Importing class allocation records that update/assign students to classes (`nisn, nama_siswa, kelas`).
       b) Importing class definitions (`nama_kelas, tingkat, jurusan`) into a dedicated `data_kelas` table or mapping them to class structures and `wali_kelas`.
     - Supporting both patterns in `dataIntegrityGuard.ts` provides complete flexibility without violating existing schema constraints.

3. **Field Normalization & Upsert Conflict Inconsistencies (R3)**:
   - *Observation*: `dataIntegrityGuard.ts:848` defaults `upsertOptions.onConflict = 'id'`.
   - *Deduction*: In templates like `Template_Data_Siswa.csv`, `id` is omitted. `parseAndValidateMasterCsv` generates a new random UUID for each row. If an admin re-imports an updated roster of the same students, `onConflict: 'id'` results in duplicate student records rather than updating existing ones by `nisn`.
   - *Remedy*: In `importMasterDataFromCsv`, `data_siswa` imports should detect existing student records by `(sekolah_id, nisn)` or `(sekolah_id, nama_siswa, kelas)` and reuse their existing `id`, or update them idempotently.

4. **Regression Invariant Guardrails (R4)**:
   - *Observation*: Existing test suites (`tests/production_admin_adjustments.test.ts:688`, `tests/adversarial_r1_r5_stress_test.ts:513`, `tests/data_guru_csv_import_sekolah_id_validation.test.ts:834`) strictly check source strings in `AdminDataView.tsx`:
     - `Template_Kalender_Pendidikan.csv` MUST NOT include `'id'` in headers.
     - `Template_Jadwal_Pelajaran.csv` MUST NOT include `'id'` in headers.
     - Neither may contain legacy samples `'KP-01'` or `'JP-01'`.
     - `Template_Data_Guru.csv` MUST include `'sekolah_id'` in headers.
   - *Deduction*: Any harmonization of templates MUST strictly preserve these existing assertions, or `npm test` will fail.

---

## 3. Caveats

1. **Live Remote Supabase DDL Privileges**:
   Direct execution of raw SQL DDL (e.g. `CREATE TABLE public.data_kelas`) against the remote Supabase project requires service-role/admin database access or migration deployment. The application's anon client cannot execute arbitrary `CREATE TABLE` queries directly at runtime. Therefore, UI and parser implementations must gracefully handle environments where `data_kelas` is stored in the database or dynamically aggregated from `data_siswa`/`wali_kelas`.
2. **PostgreSQL 22P02 & 23502 Prevention**:
   All auto-generated IDs must remain valid RFC 4180 UUIDs. Numeric timestamp IDs from external spreadsheets must continue to be sanitized to UUIDs.
3. **Multi-tenant `sekolah_id` Scoping**:
   CSV uploads by school admins must enforce tenant scoping (`sekolah_id = user.sekolah_id`). Cross-tenant imports must remain strictly restricted to Superadmin.

---

## 4. Conclusion & Concrete Design Recommendations

### 4.1 Recommendation for R1 (Sub Menu Kelas & Centralized Student Allocation)
1. **Add Sub Menu Tab in `AdminDataView.tsx`**:
   - Add `{ id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' }` into `tabs` array.
   - Position: Right before or alongside `Data_Siswa`.
2. **Centralized Student Class Allocation Interface**:
   - In `AdminDataView.tsx`, when `activeTab === 'Data_Kelas'`:
     - Render a Class Directory Card displaying each class (e.g. `X Merdeka`, `XI Merdeka`, `XII Merdeka`), total students enrolled, gender breakdown, and homeroom teacher (from `wali_kelas`).
     - Provide an interactive "Alokasi Siswa" button that opens a centralized allocation drawer/modal allowing admins to:
       a) Filter by current class.
       b) Select one or more students.
       c) Assign or move them to a destination class.
       d) Persist updates directly to `data_siswa.kelas` (and `data_siswa.status` if graduating).
     - Provide quick integration with `NaikKelasModal.tsx` for bulk cohort transitions.

### 4.2 Recommendation for R2 (Harmonization of CSV Templates)
Harmonize the templates in `AdminDataView.tsx:handleDownloadTemplate` across all 7 entities:

| Entity | Filename | Exact Headers | Sample Data | DB Target Table |
|---|---|---|---|---|
| **Kelas** | `Template_Data_Kelas.csv` | `['nama_kelas', 'tingkat', 'jurusan']` | `['X Merdeka', '10', 'Umum']` | `data_kelas` / `data_siswa` |
| **Siswa** | `Template_Data_Siswa.csv` | `['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']` | `['114367407', 'Moh. Candra Podomi', 'X Merdeka', 'Laki-laki', 'Aktif', '081234567890']` | `data_siswa` |
| **Guru** | `Template_Data_Guru.csv` | `['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']` | `[user?.sekolah_id \|\| 'a0000000-0000-0000-0000-000000000001', '198501012010011001', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', '6281241316190', 'Aktif', 'vitridotulong26@gmail.com']` | `data_guru` |
| **Mapel** | `Template_Data_Mapel.csv` | `['id', 'nama_mata_pelajaran', 'kategori']` | `['MP-01', 'Matematika Wajib', 'X Merdeka']` | `data_mapel` |
| **Kalender Pendidikan** | `Template_Kalender_Pendidikan.csv` | `['tanggal', 'keterangan', 'tipe']` | `['2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']` | `kalender_pendidikan` |
| **Jadwal Pelajaran** | `Template_Jadwal_Pelajaran.csv` | `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']` | `['Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']` | `jadwal_pelajaran` |
| **Wali Kelas** | `Template_Wali_Kelas.csv` | `['kelas', 'nama_guru', 'nip', 'tahun_ajaran']` | `['X Merdeka', 'Fitri Aprilia Dotulong', '198501012010011001', '2024/2025']` | `wali_kelas` |

*Note*: Kalender and Jadwal omit `id` to strictly respect `production_admin_adjustments.test.ts`. Guru includes `sekolah_id` to strictly respect `data_guru_csv_import_sekolah_id_validation.test.ts`.

### 4.3 Recommendation for R3 (Robust CSV Upload Processing & Feedback)
1. **Enhance `dataIntegrityGuard.ts`**:
   - In `normalizeCsvHeaders`: Add mappings for `nama_kelas`, `rombel`, `rombongan_belajar` -> `nama_kelas` / `kelas`. Add `tingkat` -> `tingkat`. Add `jurusan` -> `jurusan`.
   - In `parseAndValidateMasterCsv`: Add explicit validation branch for `data_kelas` / `kelas`. If CSV contains `nisn` and `kelas`, route to student class allocation; if it contains `nama_kelas`, validate class string formatting.
   - In `importMasterDataFromCsv`:
     - When importing `data_siswa`: Automatically match existing records by `(sekolah_id, nisn)` to preserve their primary key UUIDs, preventing record duplication on repeated imports.
     - For `data_kelas`: If table `data_kelas` returns PGRST205 (missing table in schema cache), fallback gracefully to updating/syncing classes in `wali_kelas` and `data_siswa`.
2. **Clear Feedback / Toast**:
   - Provide informative feedback upon upload completion: `Berhasil mengimpor X baris data ke tabel [Label]!`.
   - If validation errors occur, return the exact row number (`Baris ${i}`) and clear explanation (e.g. `Baris 3: Kolom "nama_guru" wajib diisi`).

### 4.4 Recommendation for R4 (Zero Regression)
- Do not alter existing table names, view aliases in `src/lib/navigation.ts`, or existing auth/RBAC checks in `src/lib/supabaseClient.ts`.
- Ensure all 54 existing test files in `npm test` continue to pass cleanly without any regression.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Baseline Test Harness**:
   ```bash
   npm test
   ```
   *Expected Result*: All 54 test suites exit with code 0 (passed).

2. **Verify CSV Import Validation Tests**:
   ```bash
   npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts
   npx tsx tests/adversarial_o27_m4_challenger.test.ts
   npx tsx tests/production_admin_adjustments.test.ts
   npx tsx tests/master_data_admin_role_restriction.test.ts
   ```
   *Expected Result*: All test assertions pass.

3. **Verify Template Header Guardrails**:
   Inspect `AdminDataView.tsx:227-259` and verify that `Kalender_Pendidikan` and `Jadwal_Pelajaran` headers do NOT contain `'id'`, and `Data_Guru` headers contain `'sekolah_id'`.
