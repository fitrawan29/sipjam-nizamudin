# Milestone 2 Exploration Report: Penyelarasan Template Master Data & Impor CSV

**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_1\`  
**Target Component**: `src/components/AdminDataView.tsx` (`templates` & `handleDownloadTemplate`)  
**Related Modules**: `src/lib/dataIntegrityGuard.ts`, `src/types/database.ts`  
**Test Harness**: `tests/production_admin_adjustments.test.ts`, `tests/data_guru_csv_import_sekolah_id_validation.test.ts`, `tests/adversarial_r1_r5_stress_test.ts`  

---

## 1. Observation

### 1.1 Current State of `templates` in `src/components/AdminDataView.tsx` (Lines 228–260)
Direct inspection of `src/components/AdminDataView.tsx` lines 228–260 reveals:
```tsx
228:   const handleDownloadTemplate = () => {
229:     const templates: Record<string, { filename: string; headers: string[]; sample: string[] }> = {
230:       Data_Siswa: {
231:         filename: 'Template_Data_Siswa.csv',
232:         headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu'],
233:         sample: ['114367407', 'Moh. Candra Podomi', 'X Merdeka', 'Laki-laki', 'Aktif', '081234567890']
234:       },
235:       Data_Guru: {
236:         filename: 'Template_Data_Guru.csv',
237:         headers: ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
238:         sample: [user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001', '198501012010011001', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', '6281241316190', 'Aktif', 'vitridotulong26@gmail.com']
239:       },
240:       Data_Mapel: {
241:         filename: 'Template_Data_Mapel.csv',
242:         headers: ['id', 'nama_mata_pelajaran', 'kategori'],
243:         sample: ['MP-01', 'Matematika Wajib', 'X Merdeka']
244:       },
245:       Kalender_Pendidikan: {
246:         filename: 'Template_Kalender_Pendidikan.csv',
247:         headers: ['tanggal', 'keterangan', 'tipe'],
248:         sample: ['2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']
249:       },
250:       Jadwal_Pelajaran: {
251:         filename: 'Template_Jadwal_Pelajaran.csv',
252:         headers: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
253:         sample: ['Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']
254:       },
255:       Wali_Kelas: {
256:         filename: 'Template_Wali_Kelas.csv',
257:         headers: ['kelas', 'nama_guru', 'nip', 'tahun_ajaran'],
258:         sample: ['X Merdeka', 'Fitri Aprilia Dotulong', '198501012010011001', '2024/2025']
259:       }
260:     };
```
**Key observation**: Only 6 entities are defined. `Data_Kelas` (`Template_Data_Kelas.csv`) is completely missing from `templates`.

### 1.2 Invariant Guardrail Test Assertions
1. **`Kalender_Pendidikan` MUST NOT have `id`**  
   Asserted by `tests/production_admin_adjustments.test.ts:684–689`:
   ```ts
   const kalenderMatch = adminDataContent.match(/Kalender_Pendidikan:\s*\{[\s\S]*?filename:\s*'Template_Kalender_Pendidikan\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
   assert.ok(kalenderMatch, 'Must find Kalender_Pendidikan template in AdminDataView.tsx');
   const kalenderHeaders = kalenderMatch[1];
   const kalenderSample = kalenderMatch[2];
   assert.strictEqual(kalenderHeaders.includes("'id'"), false, "Kalender_Pendidikan template headers must NOT include 'id'");
   assert.strictEqual(kalenderSample.includes('KP-01'), false, "Kalender_Pendidikan template sample must NOT include 'KP-01'");
   ```
   *Current status*: Fully satisfied.

2. **`Jadwal_Pelajaran` MUST NOT have `id`**  
   Asserted by `tests/production_admin_adjustments.test.ts:692–697`:
   ```ts
   const jadwalMatch = adminDataContent.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?filename:\s*'Template_Jadwal_Pelajaran\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
   assert.ok(jadwalMatch, 'Must find Jadwal_Pelajaran template in AdminDataView.tsx');
   const jadwalHeaders = jadwalMatch[1];
   const jadwalSample = jadwalMatch[2];
   assert.strictEqual(jadwalHeaders.includes("'id'"), false, "Jadwal_Pelajaran template headers must NOT include 'id'");
   assert.strictEqual(jadwalSample.includes('JP-01'), false, "Jadwal_Pelajaran template sample must NOT include 'JP-01'");
   ```
   *Current status*: Fully satisfied.

3. **`Data_Guru` MUST have `sekolah_id`**  
   Asserted by `tests/data_guru_csv_import_sekolah_id_validation.test.ts:833–840`:
   ```ts
   assert.ok(
     adminDataSrc.includes("'sekolah_id'") || adminDataSrc.includes('"sekolah_id"'),
     'AdminDataView must include sekolah_id in Template_Data_Guru headers'
   );
   assert.ok(
     adminDataSrc.includes('importMasterDataFromCsv'),
     'AdminDataView handleFileUpload must invoke importMasterDataFromCsv'
   );
   ```
   *Current status*: Fully satisfied.

4. **Adversarial Template Regressions**  
   Asserted by `tests/adversarial_r1_r5_stress_test.ts:506–523`:
   Must contain `'Template_Kalender_Pendidikan.csv'` and `'Template_Jadwal_Pelajaran.csv'` without `'KP-01'` or `'JP-01'`.
   *Current status*: Fully satisfied (14/14 tests passing).

### 1.3 Database Schema Column Alignments (`src/types/database.ts`)
- **`data_kelas`**: `{ id: UUID, sekolah_id: UUID, nama_kelas: string, tingkat: string, jurusan: string }` (as handled in `AdminKelasView.tsx:391–394`).
- **`data_siswa`**: `['id', 'sekolah_id', 'nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu', 'qr_code']` (`src/types/database.ts:328–339`).
- **`data_guru`**: `['id', 'sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email', 'user_id', 'wajib_hadir_hanya_mengajar']` (`src/types/database.ts:236–248`).
- **`data_mapel`**: `['id', 'sekolah_id', 'nama_mata_pelajaran', 'kategori', 'kode_mapel', 'kelompok', 'nama_mapel']` (`src/types/database.ts:290–299`).
- **`kalender_pendidikan`**: `['id', 'sekolah_id', 'tanggal', 'keterangan', 'tipe', 'tanggal_mulai', 'tanggal_selesai']` (`src/types/database.ts:639–648`).
- **`jadwal_pelajaran`**: `['id', 'sekolah_id', 'hari', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_mulai', 'jam_selesai', 'mapel', 'user_id']` (`src/types/database.ts:433–445`).
- **`wali_kelas`**: `['id', 'sekolah_id', 'kelas', 'nama_guru', 'nip', 'tahun_ajaran', 'guru_id', 'created_at']` (`src/types/database.ts:1716–1726`).

### 1.4 Tab Normalization and UI Rendering Observations
- In `src/components/AdminDataView.tsx:47`:
  `if (clean === 'data_kelas' || clean === 'kelas') return 'Data_Kelas';`
- In `src/components/AdminDataView.tsx:119`:
  `{ id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' }`
- In `src/components/AdminDataView.tsx:1935–1978`:
  When `activeTab === 'Data_Kelas'`, the component renders:
  ```tsx
  ) : activeTab === 'Data_Kelas' ? (
    <div className="mt-2">
      <AdminKelasView user={user} />
    </div>
  ) : (
    <> ... "Impor & Kelola Data" toolbar ...
  ```
  The "Impor & Kelola Data" section (containing the `Template` download button and `Unggah` file input button) is located strictly in the `else` branch, meaning that on the `Data_Kelas` tab, users currently have no visible template download or CSV upload button unless the toolbar is placed above `<AdminKelasView />` or integrated.

---

## 2. Logic Chain

1. **Premise 1 (Missing Entity)**: `AdminDataView.tsx:templates` has entries for 6 tabs (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`). When `activeTab === 'Data_Kelas'`, `templates[activeTab]` evaluates to `undefined`, causing `handleDownloadTemplate` to immediately return early without downloading anything.
2. **Premise 2 (Target Table Contract)**: The `data_kelas` schema expects `{ nama_kelas, tingkat, jurusan }`. For manual creation (`AdminKelasView.tsx:392–394`), the form inputs are `nama_kelas`, `tingkat`, and `jurusan`. The CSV template must therefore provide headers `['nama_kelas', 'tingkat', 'jurusan']` and sample `['X Merdeka', '10', 'Umum']` under filename `'Template_Data_Kelas.csv'`.
3. **Premise 3 (Preservation of Invariant Tests)**:
   - `production_admin_adjustments.test.ts:684–697` strictly regex-matches `Kalender_Pendidikan` and `Jadwal_Pelajaran` template definitions, requiring `id` and legacy strings (`'KP-01'`, `'JP-01'`) to be absent. Any alteration to these two template blocks would fail existing regression suites.
   - `data_guru_csv_import_sekolah_id_validation.test.ts:833` asserts that `AdminDataView.tsx` includes `'sekolah_id'` in `Template_Data_Guru` headers and wires `importMasterDataFromCsv`. Altering `Data_Guru` headers would break this test.
   - Therefore, the 6 existing templates must remain exactly as they are, with `Data_Kelas` added cleanly.
4. **Premise 4 (Tab Key & Alias Resilience)**: In `AdminDataView.tsx`, the tab identifier is `'Data_Kelas'`, while route parameters or queries may pass `'data_kelas'` or `'kelas'`. Using `templates[activeTab] || templates[normalizeAdminTab(activeTab)]` ensures that template download functions even if `activeTab` holds an unnormalized alias string.
5. **Premise 5 (UI Availability on Kelas Tab)**: If `activeTab === 'Data_Kelas'`, providing the "Impor & Kelola Data Kelas" toolbar above `<AdminKelasView user={user} />` ensures that administrators can seamlessly download `Template_Data_Kelas.csv` and trigger CSV uploads directly while on the Kelas sub-menu, without modifying or disrupting `AdminKelasView`'s internal state.

---

## 3. Caveats

1. **Dynamic Database Table `data_kelas`**: In production Supabase instances where `public.data_kelas` table has not yet been migrated into the PostgREST schema cache, `AdminKelasView` gracefully stores custom classes in component state and updates `data_siswa.kelas`. Consequently, when importing `data_kelas` CSV via `importMasterDataFromCsv` in Milestone 2, the import engine in `src/lib/dataIntegrityGuard.ts` should gracefully catch `PGRST205` / missing table errors and avoid throwing an unhandled exception to the UI.
2. **Student ID Deduplication (`data_siswa`)**: In `data_siswa`, students are uniquely identified across a tenant by `(sekolah_id, nisn)`. As noted in `PROJECT.md:69`, `importMasterDataFromCsv` for `data_siswa` should resolve existing student records by `(sekolah_id, nisn)` so that re-importing student CSVs with class allocations updates existing student rows rather than inserting duplicates with new UUIDs.

---

## 4. Conclusion & Code Blueprint

All 6 existing CSV templates (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`) are precisely aligned with database schemas and satisfy all invariant test assertions. Adding `Data_Kelas` to `templates` completes the harmonization across all 7 master data entities.

### 4.1 Exact Code Blueprint for `src/components/AdminDataView.tsx`

#### Part A: `templates` Record in `handleDownloadTemplate` (Lines 228–285)
```tsx
  // CSV Template Generation and Download
  const handleDownloadTemplate = () => {
    const templates: Record<string, { filename: string; headers: string[]; sample: string[] }> = {
      Data_Kelas: {
        filename: 'Template_Data_Kelas.csv',
        headers: ['nama_kelas', 'tingkat', 'jurusan'],
        sample: ['X Merdeka', '10', 'Umum']
      },
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

    const current = templates[activeTab] || templates[normalizeAdminTab(activeTab)];
    if (!current) return;

    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const content = '\uFEFF' + [
      current.headers.join(','),
      current.sample.map(escapeCsv).join(',')
    ].join('\r\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
```

#### Part B: UI Toolbar for `Data_Kelas` Tab (Lines 1935–1940)
```tsx
            ) : activeTab === 'Data_Kelas' ? (
              <div className="mt-2 space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-3 border border-purple-100 dark:border-purple-900/30">
                  <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
                    <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase truncate">
                      Impor & Kelola Data Kelas
                    </span>
                    <div className="flex flex-wrap sm:flex-nowrap gap-1.5 shrink-0 ml-auto sm:ml-0">
                      <button 
                        type="button" 
                        onClick={handleDownloadTemplate} 
                        className="btn-click bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                      >
                        <i className="fa-solid fa-file-csv text-green-600 dark:text-green-400"></i> Template
                      </button>
                      {isAdmin && (
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          disabled={loading}
                          className="btn-click bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                        >
                          <i className="fa-solid fa-upload"></i> Unggah
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <AdminKelasView user={user} />
              </div>
            ) : (
```

### 4.2 Guidance for M2 Builder (`src/lib/dataIntegrityGuard.ts`)
To complete Milestone 2, the implementer should add the following enhancements to `src/lib/dataIntegrityGuard.ts`:
1. **`normalizeCsvHeaders`**:
   Add aliases for `data_kelas`:
   ```ts
   if (tableName === 'data_kelas') {
     if (clean === 'kelas' || clean === 'rombel' || clean === 'nama_rombel' || clean === 'nama') return 'nama_kelas';
     if (clean === 'tingkatan' || clean === 'tingkat_kelas' || clean === 'grade') return 'tingkat';
     if (clean === 'peminatan' || clean === 'program_keahlian') return 'jurusan';
   }
   ```
2. **`parseAndValidateMasterCsv`**:
   - Include `'data_kelas'` in `isUuidKeyedTable` so `id` is auto-generated if missing.
   - Validate `row.nama_kelas` is non-empty and passes `isDummyOrTestString`.
   - Auto-derive `row.tingkat` if missing (`'10'`, `'11'`, or `'12'` based on name pattern).
   - Default `row.jurusan` to `'Umum'` if missing.
   - Auto-inject `row.sekolah_id` from `user?.sekolah_id`.
3. **`importMasterDataFromCsv`**:
   - For `data_kelas`: attempt upsert to `data_kelas` with fallback catching `PGRST205` / missing table error.
   - For `data_siswa`: fetch existing students by `(sekolah_id, nisn)` to preserve primary keys and avoid inserting duplicate student records upon re-import.

---

## 5. Verification Method

To independently verify this blueprint:
1. **Source Code Assertions**:
   ```powershell
   npx tsx tests/production_admin_adjustments.test.ts
   npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts
   npx tsx tests/adversarial_r1_r5_stress_test.ts
   ```
   *Expected result*: All 24 tests in `production_admin_adjustments`, all 31 tests in `data_guru_csv_import_sekolah_id_validation`, and all 14 tests in `adversarial_r1_r5_stress_test` PASS.
2. **Template Download Verification**:
   Verify that `templates['Data_Kelas']` contains `filename: 'Template_Data_Kelas.csv'`, `headers: ['nama_kelas', 'tingkat', 'jurusan']`, and `sample: ['X Merdeka', '10', 'Umum']`.
3. **Invalidation Conditions**:
   - Any inclusion of `'id'` in `Kalender_Pendidikan` or `Jadwal_Pelajaran` templates (violates `production_admin_adjustments.test.ts:688, 696`).
   - Any omission of `'sekolah_id'` in `Data_Guru` template (violates `data_guru_csv_import_sekolah_id_validation.test.ts:833`).
   - Renaming or reformatting existing template filenames or header lists.
