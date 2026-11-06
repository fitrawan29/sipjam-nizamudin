# Handoff Report: CSV Upload User Feedback, Error Reporting & Robustness across 7 Master Data Entities

- **Author**: Explorer M2-3
- **Date**: 2026-11-06T00:42:00Z
- **Target Audience**: Orchestrator & Implementer Agent
- **Scope**: CSV Upload User Feedback, Detailed Row-by-Row Error Reporting (`Baris ${i}`), Parser Edge Cases, and Direct CSV Actions Integration in `AdminKelasView.tsx`.

---

## 1. Observation

### 1.1 Current Implementation of `handleFileUpload` in `AdminDataView.tsx`
In `src/components/AdminDataView.tsx` (lines 288–322):
```tsx
  // CSV File Parser & Batch Upsert
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengunggah atau memodifikasi data master.', 'error');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const { count } = await importMasterDataFromCsv(supabase, text, tabObj.table, user);

      showToast(
        'Unggah Berhasil',
        `Berhasil mengimpor dan memperbarui ${count} data ke tabel ${tabObj.label}!`,
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast(
        'Gagal Impor CSV',
        err.message || 'Terjadi kesalahan saat memproses file CSV.',
        'error'
      );
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };
```
Observations:
- Success is reported using `showToast('Unggah Berhasil', `Berhasil mengimpor dan memperbarui ${count} data ke tabel ${tabObj.label}!`, 'success')`.
- Error is reported using `showToast('Gagal Impor CSV', err.message || ..., 'error')`.
- `showToast` uses SweetAlert2's toast configuration (`src/lib/toast.ts:7-17`) with `timer: 3000` (auto-dismisses after 3 seconds) and a small notification box in the top-right corner. When an error is descriptive (e.g. `Baris 14: Kolom "nama_guru" wajib diisi dan tidak boleh kosong`), 3 seconds is often too fast for an admin to write down or digest the exact row number and column.
- In `tests/ui_ux_improvements_audit.test.ts:84`, there is an invariant:
  `assert(adminDataContent.includes("showToast(") && adminDataContent.includes("Unggah Berhasil"), 'AdminDataView uses showToast for CSV upload success');`
  Therefore, the call to `showToast` with `"Unggah Berhasil"` must be preserved.
- When `activeTab === 'Data_Kelas'`, calling `loadData()` at line 311 does not refresh `AdminKelasView` because line 130 states:
  `if (activeTab === 'sistem_blok' || activeTab === 'blok' || activeTab === 'Pengguna' || activeTab === 'Data_Kelas') return;`
  `AdminKelasView` manages its own internal student and class state via `loadAllData()`.

### 1.2 Isolation of `AdminKelasView` from the Main CSV Toolbar
In `src/components/AdminDataView.tsx` (lines 1935–1978):
- When `activeTab === 'Data_Kelas'`, `AdminDataView` conditionally renders:
  ```tsx
  : activeTab === 'Data_Kelas' ? (
    <div className="mt-2">
      <AdminKelasView user={user} />
    </div>
  ) : (
    <> ... {/* CSV Template & Upload buttons are placed here */}
  ```
- Because the toolbar (lines 1955–1978) containing "Template" and "Unggah" is located inside the `else` branch of `activeTab === 'Data_Kelas'`, an admin who navigates to the "Kelas" tab does NOT see the standard CSV toolbar.
- In `src/components/AdminKelasView.tsx` (lines 876–898), the action buttons only contain:
  1. `<button onClick={handleAddClass}>Tambah Kelas</button>`
  2. `<button onClick={() => setIsNaikKelasOpen(true)}>Naik Kelas</button>`
  There is currently no button to download `Template_Data_Kelas.csv` or upload a class CSV directly inside the Kelas workspace.

### 1.3 Validation Behavior in `src/lib/dataIntegrityGuard.ts`
In `src/lib/dataIntegrityGuard.ts` (lines 589–827):
- For `data_guru`: Validates UUID format, scopes `sekolah_id`, validates `nama_guru` not empty, sanitizes NIP apostrophes, and checks for duplicates, throwing `Baris ${i}: ...`.
- For `data_siswa`: Checks dummy name, forbidden names, and duplicate student in class, BUT does NOT validate if `nama_siswa` is empty or if `kelas` is empty!
- For `data_kelas`: Completely unhandled in `parseAndValidateMasterCsv`. Missing `nama_kelas` passes through `parseAndValidateMasterCsv` and hits Supabase `NOT NULL` constraint, failing with Postgres error 23502 without a row number (`Baris ${i}`).
- For `kalender_pendidikan`: Does not validate date format (`YYYY-MM-DD`) or empty `keterangan`. Invalid dates fail with Postgres error 22007 without a row number.
- For `jadwal_pelajaran`: Does not check if `hari`, `nama_guru`, `mata_pelajaran`, or `kelas` are empty.
- For `wali_kelas`: Does not check if `kelas` or `nama_guru` are empty.
- For `data_mapel`: Does not check if `nama_mata_pelajaran` is empty.

### 1.4 Delimiter and Format Handling
In `src/lib/dataIntegrityGuard.ts`:
- `splitCsvRecords(text)` (lines 509–538) correctly parses RFC 4180 multiline quoted fields and splits on `\r\n` (CRLF), `\n` (LF), and `\r` (CR).
- `parseCsvLine(line, delimiter)` (lines 462–484) parses escaped double quotes (`""`) correctly.
- Lines 600–612 count `,`, `;`, `\t`, and `|` to detect delimiter automatically. Indonesian Excel files typically use semicolon (`;`).

---

## 2. Logic Chain

```
[Observation 1.1, 1.3: CSV validation errors]
  → When required fields are missing or dates are invalid, lack of pre-checks in parseAndValidateMasterCsv
    causes database-level errors (23502, 22007) that lack the exact row number ("Baris ${i}").
  → Adding comprehensive pre-insertion validation in parseAndValidateMasterCsv for all 7 entities
    guarantees that every malformed row is caught before reaching Supabase, throwing an explicit
    "Baris ${i}: Kolom <X> wajib diisi..." error.

[Observation 1.1: 3-second toast vs detailed error]
  → A 3-second toast is easy to miss when reading complex error messages with line numbers.
  → Retaining showToast('Unggah Berhasil', ...) satisfies tests/ui_ux_improvements_audit.test.ts:84.
  → For errors, keeping showToast('Gagal Impor CSV', errorMsg, 'error') AND displaying a persistent
    SweetAlert2 modal (Swal.fire) with a styled error card when errorMsg contains "Baris " or "Kolom "
    ensures the user can inspect the exact row number and fix their file before closing the modal.

[Observation 1.2: AdminKelasView has no CSV buttons]
  → AdminDataView hides its toolbar when activeTab === 'Data_Kelas'.
  → AdminKelasView is the dedicated workspace where admins spend time managing classes.
  → Adding "Template CSV" and "Impor CSV" buttons directly into AdminKelasView's top action toolbar
    (alongside "Tambah Kelas" and "Naik Kelas") provides immediate convenience.
  → Directly invoking importMasterDataFromCsv(supabase, text, 'data_kelas', user) in AdminKelasView
    followed by await loadAllData(true) immediately updates the class cards without requiring a reload.

[Observation 1.4: Edge cases & header normalization]
  → Empty CSV files (<2 lines or 0 data rows) are already rejected, but need clear error wording.
  → If a user uploads the wrong CSV template (e.g. Guru CSV into Siswa tab), checking for required
    headers upfront prevents confusing missing column database errors.
  → Excel formatting often adds leading apostrophes to text-formatted numbers ('114367407, '081234...).
    Stripping leading apostrophes across all parsed values prevents corrupted DB fields.
  → Unexpected extra columns (e.g. "No", "Timestamp", extra notes) can cause PostgREST PGRST204 errors;
    filtering row keys to allowed table columns ensures robust ingestion.
```

---

## 3. Caveats

1. **Role Permissions**: Master data modification and CSV uploads are restricted to the Admin role (`isMasterDataModificationAllowed(user?.role)`). Non-admin roles (Guru, Siswa, Dinas, Kepsek) must be blocked from initiating uploads in both `AdminDataView` and `AdminKelasView`.
2. **`data_kelas` Table Availability**: While the application supports `public.data_kelas`, the database in some deployments might be missing the table or experience schema-cache latency (PGRST205). The class import engine must fall back gracefully to syncing classes in `wali_kelas` and `data_siswa` if `data_kelas` upsert fails, as already implemented defensively in `AdminKelasView.tsx`.
3. **No Breaking Changes to Existing Invariants**:
   - `Kalender_Pendidikan` MUST NOT contain `id` in its template header (asserted by `tests/production_admin_adjustments.test.ts:688`).
   - `Jadwal_Pelajaran` MUST NOT contain `id` in its template header (asserted by `tests/production_admin_adjustments.test.ts:696`).
   - `Data_Guru` MUST contain `sekolah_id` (asserted by `tests/data_guru_csv_import_sekolah_id_validation.test.ts:834`).
   - `AdminDataView.tsx` MUST use `showToast` with `"Unggah Berhasil"` (asserted by `tests/ui_ux_improvements_audit.test.ts:84`).

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Enhanced `handleFileUpload` in `src/components/AdminDataView.tsx`

```tsx
  // CSV File Parser & Batch Upsert with Dual Toast & Row-Specific Modal Feedback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengunggah atau memodifikasi data master.', 'error');
      return;
    }

    if (file.size === 0) {
      showToast('Berkas Kosong', `Berkas "${file.name}" tidak memiliki data (0 bytes).`, 'error');
      e.target.value = '';
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const { count } = await importMasterDataFromCsv(supabase, text, tabObj.table, user);

      // Invariant-compliant success toast (asserted by tests/ui_ux_improvements_audit.test.ts:84)
      showToast(
        'Unggah Berhasil',
        `Berhasil mengimpor dan memperbarui ${count} data ke tabel ${tabObj.label}!`,
        'success'
      );

      // If active tab is Data_Kelas, dispatch sync event so AdminKelasView refreshes
      if (activeTab === 'Data_Kelas') {
        window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'));
      } else {
        loadData();
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Terjadi kesalahan saat memproses file CSV.';
      
      // Standard quick toast
      showToast('Gagal Impor CSV', errorMsg, 'error');

      // If the error identifies an exact line (Baris ${i}) or column validation, show persistent modal
      if (errorMsg.includes('Baris ') || errorMsg.includes('Kolom ') || errorMsg.includes('wajib')) {
        Swal.fire({
          icon: 'error',
          title: 'Validasi CSV Gagal',
          html: `
            <div class="text-left text-xs space-y-2 text-gray-700 dark:text-gray-300">
              <p class="font-bold text-red-600 dark:text-red-400">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i> Ditemukan kesalahan pada baris data berkas CSV:
              </p>
              <div class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl font-mono text-[11px] text-red-800 dark:text-red-300 break-words">
                ${errorMsg}
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">
                Silakan buka file CSV/Excel Anda, perbaiki baris data terkait, lalu unggah kembali.
              </p>
            </div>
          `,
          confirmButtonText: 'Tutup & Perbaiki',
          confirmButtonColor: '#7C3AED'
        });
      }
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };
```

---

### 4.2 Integrated CSV Template & Upload in `src/components/AdminKelasView.tsx`

Add direct CSV handling into `AdminKelasView.tsx`:

```tsx
// 1. Add file input ref in component body
const classFileInputRef = useRef<HTMLInputElement>(null);

// 2. Add listener to 'sipjam:kelas-updated' so it syncs if uploaded from AdminDataView
useEffect(() => {
  const handleExternalUpdate = () => {
    loadAllData(true);
  };
  window.addEventListener('sipjam:kelas-updated', handleExternalUpdate);
  return () => {
    window.removeEventListener('sipjam:kelas-updated', handleExternalUpdate);
  };
}, [loadAllData]);

// 3. Template Download Handler
const handleDownloadClassTemplate = () => {
  const content = '\uFEFF' + [
    'nama_kelas,tingkat,jurusan',
    'X Merdeka,10,Umum',
    'XI Merdeka,11,IPA',
    'XII Merdeka,12,IPS'
  ].join('\r\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Template_Data_Kelas.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 4. Direct Class CSV Upload Handler
const handleClassFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!isAdmin) {
    showToast('Akses Ditolak', 'Hanya Admin yang dapat mengunggah data kelas.', 'error');
    return;
  }

  if (file.size === 0) {
    showToast('Berkas Kosong', `Berkas "${file.name}" kosong (0 bytes).`, 'error');
    e.target.value = '';
    return;
  }

  setActionLoading(true);
  try {
    const text = await file.text();
    const { count } = await importMasterDataFromCsv(supabase, text, 'data_kelas', user);

    showToast(
      'Unggah Berhasil',
      `Berhasil mengimpor dan memperbarui ${count} data kelas ke sistem!`,
      'success'
    );
    await loadAllData(true);
  } catch (err: any) {
    const errorMsg = err.message || 'Terjadi kesalahan saat memproses CSV kelas.';
    showToast('Gagal Impor CSV', errorMsg, 'error');

    if (errorMsg.includes('Baris ') || errorMsg.includes('Kolom ') || errorMsg.includes('wajib')) {
      Swal.fire({
        icon: 'error',
        title: 'Validasi CSV Kelas Gagal',
        html: `
          <div class="text-left text-xs space-y-2 text-gray-700 dark:text-gray-300">
            <p class="font-bold text-red-600 dark:text-red-400">
              <i class="fa-solid fa-triangle-exclamation mr-1"></i> Kesalahan pada berkas CSV Kelas:
            </p>
            <div class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl font-mono text-[11px] text-red-800 dark:text-red-300 break-words">
              ${errorMsg}
            </div>
            <p class="text-[11px] text-gray-500 dark:text-gray-400">
              Pastikan kolom "nama_kelas" terisi dan sesuai format template.
            </p>
          </div>
        `,
        confirmButtonText: 'Tutup & Perbaiki',
        confirmButtonColor: '#7C3AED'
      });
    }
  } finally {
    setActionLoading(false);
    e.target.value = '';
  }
};
```

**UI Integration in `AdminKelasView.tsx` Toolbar (lines 876–898)**:
```tsx
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <input
            type="file"
            ref={classFileInputRef}
            accept=".csv,text/csv,text/plain"
            onChange={handleClassFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleDownloadClassTemplate}
            className="clay-btn px-2.5 sm:px-3 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Unduh format template CSV Data Kelas"
          >
            <i className="fa-solid fa-file-csv text-green-600 dark:text-green-400"></i>
            <span>Template CSV</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => classFileInputRef.current?.click()}
              disabled={actionLoading}
              className="clay-btn px-2.5 sm:px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Unggah berkas CSV Data Kelas"
            >
              <i className="fa-solid fa-upload"></i>
              <span>Impor CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddClass}
            disabled={actionLoading}
            className="clay-btn px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Tambah Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNaikKelasOpen(true)}
            className="clay-btn px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            title="Buka panduan kenaikan kelas dan kelulusan satu angkatan"
          >
            <i className="fa-solid fa-graduation-cap"></i>
            <span>Naik Kelas</span>
          </button>
        </div>
```

---

### 4.3 Pre-Insertion Row-by-Row Validation (`Baris ${i}`) in `dataIntegrityGuard.ts`

In `parseAndValidateMasterCsv`:
Ensure all 7 entities perform pre-insertion checks for required non-empty fields:

| Entity | Target Table | Required Non-Empty Columns | Specific Validation Rule & Error Format |
|---|---|---|---|
| **Kelas** | `data_kelas` | `nama_kelas` | `Baris ${i}: Kolom "nama_kelas" wajib diisi dan tidak boleh kosong.` <br> Auto-generate UUID if `id` is blank or invalid format. |
| **Siswa** | `data_siswa` | `nama_siswa`, `kelas` | `Baris ${i}: Kolom "nama_siswa" wajib diisi dan tidak boleh kosong.` <br> `Baris ${i}: Kolom "kelas" wajib diisi dan tidak boleh kosong untuk data siswa.` <br> Strip leading `'` on NISN and `no_hp_ortu`. |
| **Guru** | `data_guru` | `nama_guru`, `sekolah_id` | `Baris ${i}: Kolom "nama_guru" wajib diisi...` <br> `Baris ${i}: Kolom "sekolah_id" tidak ditemukan...` <br> Validate UUID format for `sekolah_id` and `id`. |
| **Mapel** | `data_mapel` | `nama_mata_pelajaran` | `Baris ${i}: Kolom "nama_mata_pelajaran" wajib diisi dan tidak boleh kosong.` |
| **Kalender** | `kalender_pendidikan` | `tanggal`, `keterangan` | `Baris ${i}: Kolom "tanggal" wajib diisi dengan format YYYY-MM-DD (contoh: "2026-10-01").` <br> `Baris ${i}: Kolom "keterangan" wajib diisi...` <br> Date format regex: `/^\d{4}-\d{2}-\d{2}$/`. Auto-generate UUID for `id`. |
| **Jadwal** | `jadwal_pelajaran` | `hari`, `nama_guru`, `mata_pelajaran`, `kelas` | `Baris ${i}: Kolom "${col}" wajib diisi dan tidak boleh kosong untuk jadwal pelajaran.` <br> Auto-generate UUID for `id`. |
| **Wali Kelas**| `wali_kelas` | `kelas`, `nama_guru` | `Baris ${i}: Kolom "kelas" wajib diisi dan tidak boleh kosong untuk wali kelas.` <br> `Baris ${i}: Kolom "nama_guru" wajib diisi dan tidak boleh kosong untuk wali kelas.` |

---

### 4.4 Header Validation & Protection Against Wrong Template Uploads

Add an upfront header validation in `parseAndValidateMasterCsv` before processing rows:
```ts
  const REQUIRED_HEADERS_BY_TABLE: Record<string, string[]> = {
    data_kelas: ['nama_kelas'],
    data_siswa: ['nama_siswa', 'kelas'],
    data_guru: ['nama_guru'],
    data_mapel: ['nama_mata_pelajaran'],
    kalender_pendidikan: ['tanggal', 'keterangan'],
    jadwal_pelajaran: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
    wali_kelas: ['kelas', 'nama_guru']
  };

  const expectedHeaders = REQUIRED_HEADERS_BY_TABLE[tableName];
  if (expectedHeaders) {
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(
        `File CSV tidak memiliki kolom wajib "${missingHeaders.join(', ')}". Pastikan Anda mengunggah file template yang sesuai untuk tabel ini.`
      );
    }
  }
```
This single check immediately prevents an admin from accidentally uploading a Guru CSV into the Siswa tab or a Jadwal CSV into the Kalender tab.

---

### 4.5 Stripping Unexpected Columns to Prevent PostgREST PGRST204

Filter row fields against known database schema columns:
```ts
  const ALLOWED_COLUMNS_BY_TABLE: Record<string, string[]> = {
    data_kelas: ['id', 'sekolah_id', 'nama_kelas', 'tingkat', 'jurusan'],
    data_siswa: ['id', 'sekolah_id', 'nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu', 'qr_code'],
    data_guru: ['id', 'sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
    data_mapel: ['id', 'sekolah_id', 'nama_mata_pelajaran', 'kategori', 'kelompok', 'urutan'],
    kalender_pendidikan: ['id', 'sekolah_id', 'tanggal', 'keterangan', 'tipe'],
    jadwal_pelajaran: ['id', 'sekolah_id', 'hari', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_ke', 'jam_mulai', 'jam_selesai'],
    wali_kelas: ['id', 'sekolah_id', 'kelas', 'guru_id', 'nama_guru', 'nip', 'tahun_ajaran']
  };

  // Before rows.push(row):
  const allowedCols = ALLOWED_COLUMNS_BY_TABLE[tableName];
  if (allowedCols) {
    const sanitizedRow: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      if (allowedCols.includes(key)) {
        sanitizedRow[key] = row[key];
      }
    }
    rows.push(sanitizedRow);
  } else {
    rows.push(row);
  }
```
This guarantees that extra columns added by spreadsheets (e.g. `No`, `Nomor`, `Catatan`, `timestamp`) will never trigger Supabase PostgREST column errors.

---

## 5. Verification Method

To independently verify these capabilities:

1. **Test Suite Verification**:
   Execute the entire automated test suite:
   ```powershell
   npm test
   ```
   Confirm all 54+ suites pass without any regression.
2. **Specific Test Guardrails**:
   Inspect that the following tests pass:
   - `tests/ui_ux_improvements_audit.test.ts`: Asserts `AdminDataView.tsx` uses `showToast` for `Unggah Berhasil`.
   - `tests/data_guru_csv_import_sekolah_id_validation.test.ts`: Asserts `AdminDataView.tsx` handleFileUpload invokes `importMasterDataFromCsv`.
   - `tests/production_admin_adjustments.test.ts`: Asserts `Template_Kalender_Pendidikan.csv` and `Template_Jadwal_Pelajaran.csv` do not contain `id`.
3. **Interactive & Edge Case Validation**:
   - Empty CSV file: Verify message `Berkas ... kosong (0 bytes)` or `File CSV kosong atau tidak memiliki baris data.`
   - Missing required headers: Verify message `File CSV tidak memiliki kolom wajib ...`
   - Malformed row: Verify message contains `Baris ${i}: Kolom "..." wajib diisi` and triggers the SweetAlert2 modal.
   - Excel quote escaping & semicolon delimiter: Upload a semicolon-delimited CSV containing quotes (`"X Merdeka";"10";"Umum"`), verify successful ingestion.
   - Kelas Workspace: Navigate to Master Data -> Kelas, verify presence of `Template CSV` and `Impor CSV` buttons, and verify uploading a CSV updates class cards directly.

### Invalidation Conditions
- Any removal of `showToast` or `"Unggah Berhasil"` in `AdminDataView.tsx`.
- Adding `id` back into `Template_Kalender_Pendidikan.csv` or `Template_Jadwal_Pelajaran.csv`.
- Failing to auto-generate valid UUIDs when `id` is omitted in Kalender or Jadwal imports.
