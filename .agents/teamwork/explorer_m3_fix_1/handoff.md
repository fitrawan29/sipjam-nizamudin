# Handoff Report — DEFECT-01 Investigation & Fix Strategy (explorer_m3_fix_1)

## Executive Summary
Investigation into DEFECT-01 confirms that in `src/lib/dataIntegrityGuard.ts` (lines 801–803), `clean === 'kelompok'` is unconditionally aliased to `'kategori'`. In the database schema (`supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`) and application contract (`Template_Data_Mapel.csv` in `AdminDataView.tsx`), `data_mapel` has **two distinct columns**: `kategori TEXT` (e.g., `'Umum'`) and `kelompok TEXT` (e.g., `'Wajib'`). 

When `Template_Data_Mapel.csv` is uploaded, `normalizeCsvHeaders` converts `['id', 'nama_mata_pelajaran', 'kategori', 'kelompok']` into `['id', 'nama_mata_pelajaran', 'kategori', 'kategori']`. The duplicate key `'kategori'` causes the value of `kelompok` (`'Wajib'`) to overwrite `kategori` (`'Umum'`), and `row.kelompok` is dropped (`undefined`), resulting in data loss on database upsert and failing `tests/adversarial_m3_dependencies.test.ts` Check 3.5.

A precise fix strategy scoping the alias with the already existing `isMapel` boolean flag (`isMapel ? 'kelompok' : 'kategori'`) restores roundtrip fidelity for `data_mapel` while preserving backward compatibility for all other tables.

---

## 1. Observation

### 1.1 Source Defect in `normalizeCsvHeaders`
- **File**: `src/lib/dataIntegrityGuard.ts` lines 800–804:
  ```ts
  // 11. Category aliases
  if (clean === 'kelompok' || clean === 'kategori_mapel') {
    return 'kategori';
  }
  ```
- **Context**: In lines 656–664, `normalizeCsvHeaders` already computes table context flags:
  ```ts
  export function normalizeCsvHeaders(rawHeaders: string[], tableName: string): string[] {
    const normTable = (tableName || '').toLowerCase().trim();
    const isKelas = normTable === 'data_kelas' || normTable === 'kelas';
    const isSiswa = normTable === 'data_siswa' || normTable === 'siswa';
    const isMapel = normTable === 'data_mapel' || normTable === 'mapel';
    const isGuru = normTable === 'data_guru' || normTable === 'guru';
    const isUsers = normTable === 'users' || normTable === 'pengguna';
    const isBlok = normTable === 'sistem_blok' || normTable === 'periode_blok';
  ```
  While `isMapel` is accurately scoped and utilized for subject names (`clean === 'nama_mata_pelajaran' -> isMapel ? 'nama_mata_pelajaran' : 'mata_pelajaran'` at line 766), rule 11 unconditionally collapses `clean === 'kelompok'` into `'kategori'`.

### 1.2 CSV Template Definition in `AdminDataView.tsx`
- **File**: `src/components/AdminDataView.tsx` lines 521–525:
  ```ts
  Data_Mapel: {
    filename: 'Template_Data_Mapel.csv',
    headers: ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok'],
    sample: ['MP-01', 'Matematika Wajib', 'Umum', 'Wajib']
  },
  ```
  The official downloadable template exposes four columns, specifically including both `kategori` and `kelompok`.

### 1.3 Database Schema & Type Definitions
- **Database Schema**: `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` lines 72–81:
  ```sql
  CREATE TABLE IF NOT EXISTS public.data_mapel (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
      nama_mata_pelajaran TEXT NOT NULL,
      kategori TEXT,
      kelompok TEXT,
      urutan INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- **TypeScript Interface**: `src/types/database.ts` lines 290–308:
  ```ts
  data_mapel: {
    Row: {
      id: string
      kategori: string | null
      kelompok: string | null
      kode_mapel: string | null
      nama_mapel: string | null
      nama_mata_pelajaran: string | null
      sekolah_id: string
    }
    Insert: {
      id: string
      kategori?: string | null
      kelompok?: string | null
      kode_mapel?: string | null
      nama_mapel?: string | null
      nama_mata_pelajaran?: string | null
      sekolah_id?: string
    }
  ```
  Both `kategori` and `kelompok` are distinct, valid, independent database columns.

### 1.4 Allowed Columns and Row Parsing in `dataIntegrityGuard.ts`
- **Allowed Columns**: `src/lib/dataIntegrityGuard.ts` lines 1257–1258:
  ```ts
  data_mapel: ['id', 'sekolah_id', 'nama_mata_pelajaran', 'kategori', 'kelompok', 'urutan', 'kode_mapel', 'nama_mapel'],
  mapel: ['id', 'sekolah_id', 'nama_mata_pelajaran', 'kategori', 'kelompok', 'urutan', 'kode_mapel', 'nama_mapel'],
  ```
  Both `kategori` and `kelompok` are explicitly whitelisted for persistence.
- **Row Object Key Collision**: `src/lib/dataIntegrityGuard.ts` lines 895–904:
  ```ts
  const row: Record<string, any> = {};
  headers.forEach((h, idx) => {
    if (vals[idx] !== undefined && h) {
      let cleanVal = String(vals[idx]).trim();
      if (cleanVal.startsWith("'")) {
        cleanVal = cleanVal.replace(/^'+|'+$/g, '').trim();
      }
      row[h] = cleanVal;
    }
  });
  ```
  Because `headers` is `['id', 'nama_mata_pelajaran', 'kategori', 'kategori']`:
  1. Index 2 (`'kategori'`): `row['kategori'] = 'Umum'`
  2. Index 3 (`'kategori'`, originally `'kelompok'`): `row['kategori'] = 'Wajib'`
  3. `row['kelompok']` remains `undefined`.
  4. On database insert, column `kategori` receives `'Wajib'` (corrupted), and `kelompok` receives `NULL`/omitted (lost).

### 1.5 Usage of `kategori` and `kelompok` Across Application Code
- **`src/components/AdminDataView.tsx`**:
  - Line 1187 & 1987: `supabase.from('data_mapel').select('id, nama_mata_pelajaran, kategori, kelompok')`
  - Line 1865–1895: Edit modal inputs for "Kelompok / Kategori" and populates both `kelompok` and `kategori: kelompok`.
  - Line 2321: Filters mapel using `(item.kelompok || item.kategori || '').trim()`.
  - Line 2386: Renders `<p><span className="font-semibold">Kelompok:</span> {item.kelompok || item.kategori || '-'}</p>`.
- **`src/lib/workflow.ts`**:
  - Lines 496, 500, 513: Resolves class level using `m.kategori || m.kelompok`.
- **`src/components/DokumenView.tsx`**:
  - Line 213: Fallback resolution `kelas = (dm.kategori || dm.kelompok || ...)`.
- **`src/components/RaporView.tsx`**:
  - Lines 602–607: Queries `kategori, kelompok` and resolves `(d.kategori || d.kelompok || '')`.

Both columns are actively referenced in fallback cascades across teaching modules.

### 1.6 Empirical Adversarial Failure Reproduction
- **Tool Command**: `npx tsx tests/adversarial_m3_dependencies.test.ts`
- **Output**:
  ```
  ✖ [FAIL] 3.5: DEFECT-01: Data_Mapel template column "kelompok" is preserved without collision with "kategori"
     AssertionError [ERR_ASSERTION]: Defect in dataIntegrityGuard.ts line 801: "kategori" was overwritten by "kelompok" value!

  'Wajib' !== 'Umum'

      at <anonymous> (C:\Users\Fitra\OneDrive\Documents\sipjam-app\tests\adversarial_m3_dependencies.test.ts:549:12)
      at test (C:\Users\Fitra\OneDrive\Documents\sipjam-app\tests\adversarial_m3_dependencies.test.ts:44:11)
      at runAdversarialSuite (C:\Users\Fitra\OneDrive\Documents\sipjam-app\tests\adversarial_m3_dependencies.test.ts:540:9)
  ```
  25 out of 26 adversarial tests pass; Check 3.5 reproduces DEFECT-01 deterministically.

---

## 2. Logic Chain

1. *Premise 1*: `data_mapel` table in PostgreSQL defines separate columns: `kategori TEXT` (used for grade/curriculum tier such as 'Umum', 'X Merdeka') and `kelompok TEXT` (used for subject group such as 'Wajib', 'Peminatan', 'Muatan Lokal').
2. *Premise 2*: `AdminDataView.tsx` template `Template_Data_Mapel.csv` defines headers `['id', 'nama_mata_pelajaran', 'kategori', 'kelompok']`.
3. *Premise 3*: When `normalizeCsvHeaders` processes a CSV, it normalizes each column header string into a canonical property key.
4. *Deduction 4*: In `dataIntegrityGuard.ts` line 801, `clean === 'kelompok'` is converted to `'kategori'` without checking the table name.
5. *Deduction 5*: When the 4-column template is parsed, the header array becomes `['id', 'nama_mata_pelajaran', 'kategori', 'kategori']`.
6. *Consequence 6*: During `row[h] = cleanVal`, the second `'kategori'` key overwrites the first `'kategori'` key. Consequently:
   - `row.kategori` takes the value of the `kelompok` column (`'Wajib'`).
   - `row.kelompok` is `undefined`.
   - Data in `kelompok` is completely omitted from the database upsert, causing permanent data loss on CSV upload.
7. *Remediation 7*: By conditioning `clean === 'kelompok'` on `isMapel` (`isMapel ? 'kelompok' : 'kategori'`), when `tableName` is `'data_mapel'` or `'mapel'`, the header `'kelompok'` remains `'kelompok'`.
8. *Result 8*: The parsed object retains `{ id, nama_mata_pelajaran, kategori: 'Umum', kelompok: 'Wajib' }`. Both properties match `ALLOWED_COLUMNS_BY_TABLE['data_mapel']`, persist to their respective database columns, and Check 3.5 passes.

---

## 3. Caveats

1. **Non-Mapel Entities**: No other entity in the database (`data_siswa`, `data_kelas`, `data_guru`, `jadwal_pelajaran`, `wali_kelas`, `users`, `kalender_pendidikan`, `sistem_blok`) has a column named `kelompok` or `kategori`. Retaining `!isMapel ? 'kategori' : 'kelompok'` ensures zero behavioral regression for any edge-case non-mapel imports.
2. **Additional Aliases**: Users occasionally label columns as `kelompok_mapel` or `kategori_mapel`. The fix should explicitly handle `clean === 'kelompok_mapel'` -> `'kelompok'` and `clean === 'kategori_mapel'` -> `'kategori'`.
3. **Workspace Invariant Note**: `tests/wajib_hadir_dan_pembersihan_usang.test.ts` (Check R1.8) performs a strict AST string match against `HomeViewAdmin.tsx` line 452. That test failure is pre-existing from earlier commits and does not affect Milestone 3's Master Data components (`dataIntegrityGuard.ts`, `AdminDataView.tsx`, `AdminKelasView.tsx`). Milestone 3 suites pass 100% (18/18, 58/58, 22/22).

---

## 4. Conclusion & Proposed Fix

### Proposed Code Changes in `src/lib/dataIntegrityGuard.ts`

#### Change 1: Update Docstring
**File**: `src/lib/dataIntegrityGuard.ts` line 651
```diff
--- a/src/lib/dataIntegrityGuard.ts
+++ b/src/lib/dataIntegrityGuard.ts
@@ -651,1 +651,1 @@
- * - data_mapel: id, nama_mata_pelajaran, kategori
+ * - data_mapel: id, nama_mata_pelajaran, kategori, kelompok
```

#### Change 2: Scope Category & Group Aliases
**File**: `src/lib/dataIntegrityGuard.ts` lines 800–804
```diff
--- a/src/lib/dataIntegrityGuard.ts
+++ b/src/lib/dataIntegrityGuard.ts
@@ -800,4 +800,10 @@
-    // 11. Category aliases
-    if (clean === 'kelompok' || clean === 'kategori_mapel') {
-      return 'kategori';
-    }
+    // 11. Category and Group aliases
+    if (clean === 'kategori_mapel') {
+      return 'kategori';
+    }
+    if (clean === 'kelompok_mapel') {
+      return 'kelompok';
+    }
+    if (clean === 'kelompok') {
+      return isMapel ? 'kelompok' : 'kategori';
+    }
```

### Rationale
- `isMapel` is already defined at line 660 as `normTable === 'data_mapel' || normTable === 'mapel'`.
- For `data_mapel`, `'kelompok'` resolves to `'kelompok'`, and `'kategori'` resolves to `'kategori'`.
- Both columns are retained without key collisions in the parsed row.
- `Template_Data_Mapel.csv` roundtrips with 100% field fidelity.

---

## 5. Verification Method

Once the patch is applied by the worker:

1. **Verify Adversarial M3 Dependencies Suite**:
   ```bash
   npx tsx tests/adversarial_m3_dependencies.test.ts
   ```
   *Expected Result*: 26 / 26 PASSED (including Check 3.5).

2. **Verify Master Data Stepper & Relational Validation Suite**:
   ```bash
   npx tsx tests/master_data_workflow_stepper_and_relational_validation.test.ts
   ```
   *Expected Result*: 18 / 18 PASSED.

3. **Verify Master Data CSV Harmony & Submenu Kelas Suite**:
   ```bash
   npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts
   ```
   *Expected Result*: 58 / 58 PASSED.

4. **Verify Granular Diagnostics & Progress Micro-Yields Suite**:
   ```bash
   npx tsx tests/adversarial_m3_diagnostics.test.ts
   ```
   *Expected Result*: 22 / 22 PASSED.

5. **Static Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected Result*: Exit code 0, 0 errors.
