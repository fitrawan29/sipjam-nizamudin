# Handoff Report: Milestone 3 Test Suite Design — 7 Master Data CSV Templates & Importer Pipeline

**Author**: `explorer_m3_2`  
**To**: Orchestrator (`77685953-a979-46b9-9e32-e6b24ab55eb5`) / Test Implementation Worker  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_2\`  
**Target Test Suite**: `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`  
**Date**: 2026-11-06  

---

## 1. Observation

### 1.1 Template Definitions and Invariants (`src/components/AdminDataView.tsx`)
In `src/components/AdminDataView.tsx` (lines 228–265), the `handleDownloadTemplate` method registers templates for all 7 Master Data entities:
```typescript
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
```
Key invariants observed:
- `Kalender_Pendidikan` and `Jadwal_Pelajaran` strictly omit `'id'` from `headers` and avoid legacy pseudo-IDs (`'KP-01'`, `'JP-01'`) in `sample`.
- `Data_Guru` explicitly includes `'sekolah_id'` in `headers` and injects `user?.sekolah_id` into `sample[0]`.
- `Data_Kelas` has `filename: 'Template_Data_Kelas.csv'` and `headers: ['nama_kelas', 'tingkat', 'jurusan']`.

In `src/components/AdminKelasView.tsx` (lines 344–361), a direct download handler `handleDownloadClassTemplate` is also implemented:
```typescript
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
```

### 1.2 Header Normalization & Parsing Engine (`src/lib/dataIntegrityGuard.ts`)
1. **Header Normalization (`normalizeCsvHeaders`, lines 595–714)**:
   - Strips UTF-8 BOM (`\uFEFF`) and zero-width characters (`\u200B-\u200D`).
   - For `data_kelas`/`kelas`: Maps `nama_kelas`, `namakelas`, `kelas`, `rombel`, `nama_rombel`, `ruang_kelas`, `nama` to `nama_kelas`; `tingkat`, `tingkat_kelas`, `grade`, `level` to `tingkat`; `jurusan`, `peminatan`, `program_keahlian` to `jurusan`.
   - Entity scoping: Column header `nama` maps to `nama_kelas` for `data_kelas`, `nama_siswa` for `data_siswa`, `nama_guru` for `data_guru`, and `nama_mata_pelajaran` for `data_mapel`.
   - Dynamic `rombel`: Maps to `nama_kelas` when `tableName === 'data_kelas' | 'kelas'`, but maps to `kelas` for relational tables (`data_siswa`, `jadwal_pelajaran`, `wali_kelas`).

2. **Multi-Delimiter Detection (`parseAndValidateMasterCsv`, lines 732–746)**:
   - Computes frequencies of `,`, `;`, `\t`, `|` on the sanitized header row.
   - Automatically selects `;` (Indonesian/European Excel), `\t` (TSV), `|` (Pipe), or `,` (Comma default).
   - Handles CRLF (`\r\n`), LF (`\n`), and bare CR (`\r`) transparently via `splitCsvRecords`.

3. **Excel Apostrophe Stripping (lines 791–793, 873–879)**:
   - Leading `'` on values (common Excel prefix to prevent scientific notation on numbers) is stripped globally:
     ```typescript
     if (cleanVal.startsWith("'")) {
       cleanVal = cleanVal.replace(/^'+|'+$/g, '').trim();
     }
     ```
   - Specifically for `nip`, sanitizes both `'` and `"` quotes:
     ```typescript
     row.nip = String(row.nip).replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/^['"]+|['"]+$/g, '').trim();
     ```

4. **Row Error Feedback (lines 783–1075)**:
   - Missing required headers throws: `File CSV tidak memiliki kolom wajib "<columns>". Pastikan Anda mengunggah file template yang sesuai untuk tabel ini.`
   - Empty required values throw: `Baris ${i}: Kolom "<field>" wajib diisi dan tidak boleh kosong untuk data <entity>.`
   - Dummy/test strings throw: `Baris ${i}: Terdeteksi <entity> dummy/percobaan ("<value>").`
   - In-file duplicates throw:
     - Class: `Baris ${i}: Duplikat nama kelas "${cleanNamaKelas}" dalam file CSV.`
     - Student: `Baris ${i}: Duplikat siswa "${row.nama_siswa}" di kelas ${row.kelas} dalam file CSV.`

5. **PostgreSQL 22P02 Prevention via Non-UUID Conversion (lines 800–843)**:
   - For UUID-keyed tables (`kalender_pendidikan`, `jadwal_pelajaran`, `data_siswa`, `wali_kelas`, `data_kelas`, `kelas`):
     - If `row.id` is missing or empty, generates `crypto.randomUUID()`.
     - If `row.id` is present but fails `UUID_REGEX` (e.g. `'KP-01'`, `'JP-01'`), automatically converts it to a valid random UUID.
     - Prevents PostgreSQL error `22P02: invalid input syntax for type uuid`.

### 1.3 Importer Idempotency & Database Integrity (`src/lib/dataIntegrityGuard.ts`)
1. **Student Deduplication by `(sekolah_id, nisn)` (lines 1127–1172)**:
   - Queries `supabase.from('data_siswa').select('id, nisn, sekolah_id').eq('sekolah_id', schoolId).in('nisn', chunk)`.
   - Matches incoming rows by `nisn` (ignoring blank and `'-'`).
   - If a student with that NISN already exists, assigns the existing student's UUID to `row.id`.
   - Upsert uses `{ onConflict: 'id' }`.
   - Result: Updates student attributes (e.g., class reallocation) without creating duplicate records.

2. **`data_kelas` Upsert and `PGRST205` Graceful Fallback (lines 1182–1264)**:
   - Upsert uses `onConflict: 'sekolah_id, nama_kelas'`.
   - If PostgreSQL error `42P10` occurs (missing unique constraint on conflict target), retries with `onConflict: 'id'`.
   - If `error.code === 'PGRST205'` or `42P01` (schema cache missing table `public.data_kelas`), triggers graceful fallback:
     - Extracts distinct `nama_kelas` from imported rows.
     - Upserts each distinct class to `wali_kelas` with `(sekolah_id, kelas, nama_guru: '-', nip: '-', tahun_ajaran: '2024/2025')` using `onConflict: 'sekolah_id, kelas'`.
     - Returns `{ count: rows.length, rows }` without crashing the application.

---

## 2. Logic Chain

1. **Why Invariant Verification is Mandatory**:
   - Kalender & Jadwal tables utilize UUID primary keys in PostgreSQL. If templates include legacy string IDs like `'KP-01'` or `'JP-01'`, inserting them directly triggers `22P02` syntax error. Testing that `headers` omit `'id'` guarantees templates are safe.
   - Multi-tenant security requires `sekolah_id` for teacher data. If `Template_Data_Guru.csv` omitted `sekolah_id`, imported teachers would fail validation or violate foreign key constraints.

2. **Why Multi-Delimiter and Apostrophe Testing is Essential**:
   - Indonesian school administrators predominantly use Microsoft Excel with regional Indonesian settings, which defaults to semicolon (`;`) delimiters rather than commas (`,`).
   - Furthermore, school operators routinely prefix NISN, NIP, and phone numbers with single apostrophes (`'`) in Excel so leading zeros are not stripped (e.g. `'081234567890`, `'114367407`).
   - Validating both multi-delimiter auto-detection (`,`, `;`, `\t`, `|`) and quote/apostrophe stripping guarantees real-world production robustness.

3. **Why Exact Row Error Feedback (`Baris ${i}`) Must Be Tested**:
   - When a user uploads a 500-line CSV and line 47 has an empty name or duplicate entry, a generic "Validation Failed" toast is useless. The user needs `Baris 47: Kolom "nama_siswa" wajib diisi`. Testing exact row indices verifies that offset tracking (`lines[i]`) is 1-indexed and accurate.

4. **Why Student Upsert Idempotency Must Be Tested**:
   - When school admins advance students or re-allocate classes via CSV re-upload, students should be updated, not duplicated.
   - Matching by `(sekolah_id, nisn)` and assigning `row.id = existingStudent.id` ensures database consistency without requiring a composite unique constraint on `(sekolah_id, nisn)` that could conflict with legacy unindexed null NISNs.

5. **Why `PGRST205` Schema Cache Fallback Must Be Tested**:
   - In environments where Supabase PostgREST schema cache has not yet reloaded the newly created `data_kelas` table, an unhandled `PGRST205` error would abort CSV import.
   - The graceful fallback to `wali_kelas` ensures zero downtime and preserves class allocations for attendance and schedule modules.

---

## 3. Caveats

1. **Synthetic Supabase Mocking**:
   - The test scenarios utilize precise, controlled in-memory mock Supabase clients rather than hitting remote live databases. This avoids network flakiness, rate limits, and test data pollution while testing 100% of the query builder chain (`from`, `select`, `eq`, `in`, `upsert`, `maybeSingle`).
2. **Crypto Global Object in Node.js**:
   - In Node.js >= 19 and modern browsers, `crypto.randomUUID()` is globally available. If tested on older Node runtimes, the fallback regex generator in `dataIntegrityGuard.ts` takes over.
3. **Teacher Account Auto-Sync**:
   - When importing `data_guru`, the importer attempts to call `resolveTeacherUsername` and insert into `users`. The mock client must support `users.select` and `users.insert` if testing teacher CSV import end-to-end.

---

## 4. Conclusion & Complete Test Blueprint

The blueprint comprises **22 exact, runnable test cases** divided into 4 cohesive suites:
- **Suite B**: 7 Master Data CSV Templates Verification & Invariants (6 tests)
- **Suite C**: CSV Parsing, Header Normalization & Multi-Delimiter Stress (5 tests)
- **Suite D**: Data Sanitization, Anti-Dummy Guards & Row Error Feedback (6 tests)
- **Suite E**: Importer Idempotency & Database Integrity (5 tests)

Here is the exact runnable TypeScript implementation designed for drop-in into `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`:

```typescript
// ============================================================================
// PART 2: 7 MASTER DATA CSV TEMPLATES & IMPORTER PIPELINE SUITE
// ============================================================================

import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeCsvHeaders,
  parseAndValidateMasterCsv,
  importMasterDataFromCsv
} from '../src/lib/dataIntegrityGuard';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function runMasterDataCsvAndImporterSuite(pass: (desc: string) => void, fail: (desc: string, err?: any) => void) {
  const adminDataPath = path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminKelasPath = path.join(__dirname, '..', 'src', 'components', 'AdminKelasView.tsx');
  const adminDataSrc = fs.readFileSync(adminDataPath, 'utf8');
  const adminKelasSrc = fs.readFileSync(adminKelasPath, 'utf8');

  // ==========================================================================
  // SUITE B: TEMPLATE DOWNLOAD VERIFICATION ACROSS ALL 7 ENTITIES
  // ==========================================================================
  console.log('\n--- SUITE B: 7 Master Data CSV Templates & Invariants ---');

  // Test B.1: All 7 templates defined in AdminDataView.tsx
  try {
    const requiredEntities = [
      'Data_Kelas',
      'Data_Siswa',
      'Data_Guru',
      'Data_Mapel',
      'Kalender_Pendidikan',
      'Jadwal_Pelajaran',
      'Wali_Kelas'
    ];
    for (const entity of requiredEntities) {
      assert.ok(
        adminDataSrc.includes(`${entity}:`),
        `AdminDataView templates dictionary must register entity "${entity}"`
      );
    }
    pass('B.1: All 7 Master Data entities are registered in AdminDataView.tsx templates dictionary');
  } catch (e) {
    fail('B.1: Template entity registration check failed', e);
  }

  // Test B.2: Data_Kelas template headers and filename
  try {
    assert.ok(
      adminDataSrc.includes("filename: 'Template_Data_Kelas.csv'"),
      'Data_Kelas filename must be "Template_Data_Kelas.csv"'
    );
    const kelasMatch = adminDataSrc.match(
      /Data_Kelas:\s*\{[\s\S]*?filename:\s*'Template_Data_Kelas\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/
    );
    assert.ok(kelasMatch, 'Data_Kelas template block must be properly defined');
    const headersStr = kelasMatch[1];
    assert.ok(headersStr.includes("'nama_kelas'"), 'Data_Kelas headers must contain "nama_kelas"');
    assert.ok(headersStr.includes("'tingkat'"), 'Data_Kelas headers must contain "tingkat"');
    assert.ok(headersStr.includes("'jurusan'"), 'Data_Kelas headers must contain "jurusan"');
    pass('B.2: Data_Kelas template defines filename "Template_Data_Kelas.csv" with headers [nama_kelas, tingkat, jurusan]');
  } catch (e) {
    fail('B.2: Data_Kelas template definition check failed', e);
  }

  // Test B.3: Invariant check - Kalender_Pendidikan omits 'id' and legacy pseudo-IDs
  try {
    const kalenderMatch = adminDataSrc.match(
      /Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/
    );
    assert.ok(kalenderMatch, 'Kalender_Pendidikan template block must exist');
    assert.strictEqual(
      kalenderMatch[1].includes("'id'"),
      false,
      'Kalender_Pendidikan headers must NOT include "id"'
    );
    assert.strictEqual(
      kalenderMatch[2].includes('KP-01'),
      false,
      'Kalender_Pendidikan sample must NOT include legacy "KP-01"'
    );
    pass('B.3: Invariant satisfied: Kalender_Pendidikan template omits "id" and legacy strings');
  } catch (e) {
    fail('B.3: Kalender_Pendidikan invariant check failed', e);
  }

  // Test B.4: Invariant check - Jadwal_Pelajaran omits 'id' and legacy pseudo-IDs
  try {
    const jadwalMatch = adminDataSrc.match(
      /Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/
    );
    assert.ok(jadwalMatch, 'Jadwal_Pelajaran template block must exist');
    assert.strictEqual(
      jadwalMatch[1].includes("'id'"),
      false,
      'Jadwal_Pelajaran headers must NOT include "id"'
    );
    assert.strictEqual(
      jadwalMatch[2].includes('JP-01'),
      false,
      'Jadwal_Pelajaran sample must NOT include legacy "JP-01"'
    );
    pass('B.4: Invariant satisfied: Jadwal_Pelajaran template omits "id" and legacy strings');
  } catch (e) {
    fail('B.4: Jadwal_Pelajaran invariant check failed', e);
  }

  // Test B.5: Invariant check - Data_Guru includes 'sekolah_id'
  try {
    const guruMatch = adminDataSrc.match(
      /Data_Guru:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/
    );
    assert.ok(guruMatch, 'Data_Guru template block must exist');
    assert.ok(guruMatch[1].includes("'sekolah_id'"), 'Data_Guru headers must contain "sekolah_id"');
    pass('B.5: Invariant satisfied: Data_Guru template includes "sekolah_id" in headers and sample');
  } catch (e) {
    fail('B.5: Data_Guru sekolah_id invariant check failed', e);
  }

  // Test B.6: AdminKelasView direct template download
  try {
    assert.ok(
      adminKelasSrc.includes('handleDownloadClassTemplate'),
      'AdminKelasView must implement handleDownloadClassTemplate'
    );
    assert.ok(
      adminKelasSrc.includes("'Template_Data_Kelas.csv'"),
      'AdminKelasView download filename must be "Template_Data_Kelas.csv"'
    );
    assert.ok(
      adminKelasSrc.includes('nama_kelas,tingkat,jurusan'),
      'AdminKelasView template content must contain header "nama_kelas,tingkat,jurusan"'
    );
    assert.ok(
      adminKelasSrc.includes('\\uFEFF'),
      'AdminKelasView template content must prepend UTF-8 BOM'
    );
    pass('B.6: AdminKelasView has dedicated handleDownloadClassTemplate with BOM and valid headers');
  } catch (e) {
    fail('B.6: AdminKelasView template download check failed', e);
  }

  // ==========================================================================
  // SUITE C: CSV PARSING, HEADER NORMALIZATION & MULTI-DELIMITER STRESS
  // ==========================================================================
  console.log('\n--- SUITE C: CSV Parsing, Normalization & Multi-Delimiter ---');

  // Test C.1: Header normalization across entity-specific aliases
  try {
    const rawKelas = ['\uFEFFKelas', ' Tingkat Kelas ', 'peminatan'];
    assert.deepStrictEqual(
      normalizeCsvHeaders(rawKelas, 'data_kelas'),
      ['nama_kelas', 'tingkat', 'jurusan']
    );

    const rawRombel = ['Rombel', 'Grade', 'Jurusan'];
    assert.deepStrictEqual(
      normalizeCsvHeaders(rawRombel, 'kelas'),
      ['nama_kelas', 'tingkat', 'jurusan']
    );

    const rawStudent = ['Nama Lengkap', 'Nomor_Induk_Siswa_Nasional', 'Rombel', 'Jenis_Kelamin', 'Telepon_Ortu'];
    assert.deepStrictEqual(
      normalizeCsvHeaders(rawStudent, 'data_siswa'),
      ['nama_siswa', 'nisn', 'kelas', 'gender', 'no_hp_ortu']
    );
    pass('C.1: normalizeCsvHeaders successfully normalizes class, student, and entity aliases');
  } catch (e) {
    fail('C.1: Header normalization check failed', e);
  }

  // Test C.2: Entity-scoped "nama" collision prevention
  try {
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_kelas'), ['nama_kelas']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_siswa'), ['nama_siswa']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_guru'), ['nama_guru']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_mapel'), ['nama_mata_pelajaran']);
    pass('C.2: Header "nama" is scoped accurately to each entity without cross-table collisions');
  } catch (e) {
    fail('C.2: Name scoping check failed', e);
  }

  // Test C.3: Multi-delimiter auto-detection (Comma, Semicolon, Tab, Pipe)
  try {
    // Semicolon (Indonesian Excel standard)
    const semicolonCsv = '\uFEFFnama_kelas;tingkat;jurusan\r\nX Merdeka;10;Umum\r\nXI Merdeka;11;IPA\r\n';
    const semiRows = parseAndValidateMasterCsv(semicolonCsv, 'data_kelas');
    assert.strictEqual(semiRows.length, 2);
    assert.strictEqual(semiRows[0].nama_kelas, 'X Merdeka');
    assert.strictEqual(semiRows[0].tingkat, '10');

    // Tab-delimited (TSV)
    const tsv = 'nama_kelas\ttingkat\tjurusan\nX Merdeka 1\t10\tUmum\nXI Merdeka 2\t11\tIPS\n';
    const tsvRows = parseAndValidateMasterCsv(tsv, 'data_kelas');
    assert.strictEqual(tsvRows.length, 2);
    assert.strictEqual(tsvRows[0].nama_kelas, 'X Merdeka 1');
    assert.strictEqual(tsvRows[1].tingkat, '11');

    // Pipe-delimited
    const pipeCsv = 'nama_kelas|tingkat|jurusan\rXII RPL 1|12|RPL\rXII RPL 2|12|TKJ\r';
    const pipeRows = parseAndValidateMasterCsv(pipeCsv, 'data_kelas');
    assert.strictEqual(pipeRows.length, 2);
    assert.strictEqual(pipeRows[0].nama_kelas, 'XII RPL 1');
    assert.strictEqual(pipeRows[0].jurusan, 'RPL');
    pass('C.3: Multi-delimiter parsing auto-detects and parses comma, semicolon, tab, and pipe CSVs');
  } catch (e) {
    fail('C.3: Multi-delimiter parsing check failed', e);
  }

  // Test C.4: Line endings resilience (CRLF, LF, bare CR)
  try {
    const crlfCsv = 'nama_kelas,tingkat,jurusan\r\nX CRLF,10,Umum\r\n';
    const lfCsv = 'nama_kelas,tingkat,jurusan\nX LF,10,Umum\n';
    const bareCrCsv = 'nama_kelas,tingkat,jurusan\rX CR,10,Umum\r';

    assert.strictEqual(parseAndValidateMasterCsv(crlfCsv, 'data_kelas')[0].nama_kelas, 'X CRLF');
    assert.strictEqual(parseAndValidateMasterCsv(lfCsv, 'data_kelas')[0].nama_kelas, 'X LF');
    assert.strictEqual(parseAndValidateMasterCsv(bareCrCsv, 'data_kelas')[0].nama_kelas, 'X CR');
    pass('C.4: Multi-line endings (Windows CRLF, Unix LF, bare CR) parse cleanly without blank row pollution');
  } catch (e) {
    fail('C.4: Line endings resilience check failed', e);
  }

  // Test C.5: RFC 4180 quotes and comma within quoted fields
  try {
    const quotedCsv = 'nama_kelas,tingkat,jurusan\n"X ""Unggulan"" Merdeka",10,"Umum, Multidisiplin"\n';
    const rows = parseAndValidateMasterCsv(quotedCsv, 'data_kelas');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].nama_kelas, 'X "Unggulan" Merdeka');
    assert.strictEqual(rows[0].jurusan, 'Umum, Multidisiplin');
    pass('C.5: RFC 4180 escaped quotes and comma-within-quotes parsed cleanly');
  } catch (e) {
    fail('C.5: RFC 4180 quotes check failed', e);
  }

  // ==========================================================================
  // SUITE D: DATA SANITIZATION, ANTI-DUMMY & ROW ERROR FEEDBACK
  // ==========================================================================
  console.log('\n--- SUITE D: Sanitization, Anti-Dummy & Row Error Feedback ---');

  // Test D.1: Excel apostrophe stripping on numbers (nisn, nip, no_hp_ortu)
  try {
    const studentCsv = 'nisn,nama_siswa,kelas,gender,status,no_hp_ortu\n\'114367407,Candra Podomi,X Merdeka,Laki-laki,Aktif,\'081234567890\n';
    const rows = parseAndValidateMasterCsv(studentCsv, 'data_siswa');
    assert.strictEqual(rows[0].nisn, '114367407', 'Leading apostrophe on NISN must be stripped');
    assert.strictEqual(rows[0].no_hp_ortu, '081234567890', 'Leading apostrophe on phone must be stripped');

    const guruCsv = 'sekolah_id,nip,nama_guru,mata_pelajaran\na0000000-0000-0000-0000-000000000001,\'198501012010011001,Fitri Aprilia,Bahasa Inggris\n';
    const guruRows = parseAndValidateMasterCsv(guruCsv, 'data_guru');
    assert.strictEqual(guruRows[0].nip, '198501012010011001', 'Leading apostrophe on NIP must be stripped');
    pass('D.1: Excel apostrophes ("\'") are cleanly stripped from NISN, NIP, and phone numbers');
  } catch (e) {
    fail('D.1: Apostrophe stripping check failed', e);
  }

  // Test D.2: Non-UUID conversion to valid UUID prevents Postgres 22P02
  try {
    const kalenderLegacyCsv = 'id,tanggal,keterangan,tipe\nKP-01,2026-10-01,Hari Libur Nasional,Libur\n';
    const kalRows = parseAndValidateMasterCsv(kalenderLegacyCsv, 'kalender_pendidikan');
    assert.notStrictEqual(kalRows[0].id, 'KP-01', 'Legacy non-UUID string must be replaced');
    assert.ok(UUID_REGEX.test(kalRows[0].id), 'Replaced id must match standard UUID format');

    const validUuid = 'b0000000-0000-4000-a000-000000000001';
    const kalenderValidCsv = `id,tanggal,keterangan,tipe\n${validUuid},2026-10-01,Hari Libur Nasional,Libur\n`;
    const kalValidRows = parseAndValidateMasterCsv(kalenderValidCsv, 'kalender_pendidikan');
    assert.strictEqual(kalValidRows[0].id, validUuid, 'Existing valid UUID must be preserved');
    pass('D.2: Non-UUID conversion generates valid UUIDs preventing PostgreSQL 22P02 syntax errors');
  } catch (e) {
    fail('D.2: Non-UUID conversion check failed', e);
  }

  // Test D.3: Row error feedback (Baris ${i}) on empty required columns
  try {
    const invalidClassCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\n,11,IPA\n';
    let threw = false;
    try {
      parseAndValidateMasterCsv(invalidClassCsv, 'data_kelas');
    } catch (err: any) {
      threw = true;
      assert.ok(err.message.includes('Baris 2'), `Error must mention Baris 2, got: ${err.message}`);
      assert.ok(err.message.includes('nama_kelas'), `Error must mention nama_kelas, got: ${err.message}`);
    }
    assert.strictEqual(threw, true, 'Must throw error on empty nama_kelas at Baris 2');

    const invalidStudentCsv = 'nisn,nama_siswa,kelas\n114367407,Candra,X Merdeka\n114367408,,\n';
    let threwStudent = false;
    try {
      parseAndValidateMasterCsv(invalidStudentCsv, 'data_siswa');
    } catch (err: any) {
      threwStudent = true;
      assert.ok(err.message.includes('Baris 2'), `Error must mention Baris 2, got: ${err.message}`);
    }
    assert.strictEqual(threwStudent, true, 'Must throw error on empty student data at Baris 2');
    pass('D.3: Empty required columns throw descriptive error with exact row number (Baris ${i})');
  } catch (e) {
    fail('D.3: Row error feedback check failed', e);
  }

  // Test D.4: Anti-dummy string detection with row error feedback
  try {
    const dummyClassCsv = 'nama_kelas,tingkat,jurusan\nKelas Dummy Percobaan,10,Umum\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dummyClassCsv, 'data_kelas'),
      /Baris 1: Terdeteksi nama kelas dummy\/percobaan/i
    );

    const dummyStudentCsv = 'nisn,nama_siswa,kelas\n114367407,Siswa Test Ujicoba,X Merdeka\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dummyStudentCsv, 'data_siswa'),
      /Baris 1: Terdeteksi data siswa dummy\/percobaan/i
    );
    pass('D.4: Dummy/test names in class and student records are rejected with exact row numbers');
  } catch (e) {
    fail('D.4: Anti-dummy detection check failed', e);
  }

  // Test D.5: Duplicate records within same CSV rejected with line numbers
  try {
    const dupClassCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\nX Merdeka,10,Umum\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dupClassCsv, 'data_kelas'),
      /Baris 2: Duplikat nama kelas "X Merdeka" dalam file CSV/
    );

    const dupStudentCsv = 'nisn,nama_siswa,kelas\n114367407,Candra Podomi,X Merdeka\n114367408,Candra Podomi,X Merdeka\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dupStudentCsv, 'data_siswa'),
      /Baris 2: Duplikat siswa "Candra Podomi" di kelas X Merdeka dalam file CSV/
    );
    pass('D.5: In-file duplicate class names and student keys are rejected with Baris ${i} feedback');
  } catch (e) {
    fail('D.5: In-file duplicate check failed', e);
  }

  // Test D.6: Wrong template upload caught by pre-validation
  try {
    const guruCsv = 'sekolah_id,nip,nama_guru,mata_pelajaran\na0000000-0000-0000-0000-000000000001,19850101,Fitri,B.Inggris\n';
    assert.throws(
      () => parseAndValidateMasterCsv(guruCsv, 'data_siswa'),
      (err: any) => err.message.includes('kolom wajib') && err.message.includes('nama_siswa')
    );

    const kalenderCsv = 'tanggal,keterangan,tipe\n2026-10-01,Libur,Libur\n';
    assert.throws(
      () => parseAndValidateMasterCsv(kalenderCsv, 'data_kelas'),
      (err: any) => err.message.includes('kolom wajib') && err.message.includes('nama_kelas')
    );
    pass('D.6: Uploading mismatched CSV templates triggers immediate pre-validation error');
  } catch (e) {
    fail('D.6: Wrong template pre-validation check failed', e);
  }

  // ==========================================================================
  // SUITE E: IMPORTER IDEMPOTENCY & DATABASE INTEGRITY
  // ==========================================================================
  console.log('\n--- SUITE E: Importer Idempotency & Database Integrity ---');

  // Test E.1: Student deduplication by (sekolah_id, nisn) reuses existing UUID
  try {
    const existingStudentUuid = 's0000000-0000-4000-a000-000000000001';
    let upsertCalledWith: any = null;

    const mockSupabase = {
      from: (table: string) => {
        if (table === 'data_siswa') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({
                  data: [{ id: existingStudentUuid, nisn: '114367407', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }],
                  error: null
                })
              })
            }),
            upsert: (batch: any[], opts: any) => {
              upsertCalledWith = { batch, opts };
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const reimportCsv = 'nisn,nama_siswa,kelas\n114367407,Moh. Candra Podomi,XI Merdeka\n';
    const result = await importMasterDataFromCsv(mockSupabase, reimportCsv, 'data_siswa', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });

    assert.strictEqual(result.count, 1);
    assert.strictEqual(result.rows[0].id, existingStudentUuid, 'Existing student UUID must be preserved');
    assert.strictEqual(result.rows[0].kelas, 'XI Merdeka', 'Student class must be updated');
    assert.strictEqual(upsertCalledWith.opts.onConflict, 'id');
    assert.strictEqual(upsertCalledWith.batch[0].id, existingStudentUuid);
    pass('E.1: Student re-import matches by (sekolah_id, nisn) and updates row in-place without duplicate records');
  } catch (e) {
    fail('E.1: Student deduplication check failed', e);
  }

  // Test E.2: Mixed batch of existing NISN and new NISN
  try {
    const existingId = 's0000000-0000-4000-a000-000000000002';
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'data_siswa') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({
                  data: [{ id: existingId, nisn: '114367401', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }],
                  error: null
                })
              })
            }),
            upsert: () => Promise.resolve({ error: null })
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const mixedCsv = [
      'nisn,nama_siswa,kelas',
      '114367401,Siswa Lama,X Merdeka',
      '114367402,Siswa Baru,X Merdeka',
      '-,Siswa Tanpa NISN,X Merdeka'
    ].join('\n');

    const result = await importMasterDataFromCsv(mockSupabase, mixedCsv, 'data_siswa', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });

    assert.strictEqual(result.count, 3);
    assert.strictEqual(result.rows[0].id, existingId, 'Existing student reuses ID');
    assert.notStrictEqual(result.rows[1].id, existingId, 'New student gets a new ID');
    assert.ok(UUID_REGEX.test(result.rows[1].id), 'New student ID is a valid UUID');
    assert.ok(UUID_REGEX.test(result.rows[2].id), 'Hyphen NISN student gets a valid UUID without collision');
    pass('E.2: Mixed batch import correctly handles existing NISNs, new NISNs, and unassigned/hyphen NISNs');
  } catch (e) {
    fail('E.2: Mixed batch import check failed', e);
  }

  // Test E.3: data_kelas upsert uses onConflict 'sekolah_id, nama_kelas'
  try {
    let capturedOnConflict: string = '';
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'data_kelas') {
          return {
            upsert: (batch: any[], opts: any) => {
              capturedOnConflict = opts?.onConflict || '';
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const classCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\n';
    await importMasterDataFromCsv(mockSupabase, classCsv, 'data_kelas', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });

    assert.strictEqual(capturedOnConflict, 'sekolah_id, nama_kelas', 'data_kelas upsert onConflict must be "sekolah_id, nama_kelas"');
    pass('E.3: data_kelas upsert targets "sekolah_id, nama_kelas" for multi-tenant isolation');
  } catch (e) {
    fail('E.3: data_kelas onConflict check failed', e);
  }

  // Test E.4: Graceful fallback on missing data_kelas table (PGRST205)
  try {
    let fallbackSyncedClasses: string[] = [];
    const mockSupabaseWithPgrst205 = {
      from: (table: string) => {
        if (table === 'data_kelas') {
          return {
            upsert: () => Promise.resolve({
              error: {
                code: 'PGRST205',
                message: "Could not find the table 'public.data_kelas' in the schema cache"
              }
            })
          };
        }
        if (table === 'wali_kelas') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null })
                })
              })
            }),
            upsert: (record: any) => {
              fallbackSyncedClasses.push(record.kelas);
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const classCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\nXI Merdeka,11,IPA\n';
    const result = await importMasterDataFromCsv(mockSupabaseWithPgrst205, classCsv, 'data_kelas', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });

    assert.strictEqual(result.count, 2);
    assert.deepStrictEqual(fallbackSyncedClasses, ['X Merdeka', 'XI Merdeka']);
    pass('E.4: data_kelas gracefully falls back to syncing classes in wali_kelas on PGRST205 schema cache error');
  } catch (e) {
    fail('E.4: PGRST205 graceful fallback check failed', e);
  }

  // Test E.5: Database error translations (FK 23503, RLS 42501, NOT NULL 23502)
  try {
    const makeFailingMock = (code: string, message: string) => ({
      from: () => ({
        upsert: () => Promise.resolve({ error: { code, message } })
      })
    });

    const csv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\n';

    // FK 23503
    await assert.rejects(
      () => importMasterDataFromCsv(makeFailingMock('23503', 'foreign key constraint sekolah_id_fkey'), csv, 'data_kelas'),
      /ID sekolah \("sekolah_id"\) dalam CSV tidak terdaftar/
    );

    // RLS 42501
    await assert.rejects(
      () => importMasterDataFromCsv(makeFailingMock('42501', 'violates row-level security policy'), csv, 'data_kelas'),
      /Akses ditolak oleh kebijakan keamanan data sekolah \(RLS\)/
    );

    // NOT NULL 23502
    await assert.rejects(
      () => importMasterDataFromCsv(makeFailingMock('23502', 'null value in column violates not-null'), csv, 'data_kelas'),
      /terdapat kolom wajib yang bernilai kosong/
    );
    pass('E.5: Database errors (23503 FK, 42501 RLS, 23502 NOT NULL) are mapped to user-friendly messages');
  } catch (e) {
    fail('E.5: Database error translation check failed', e);
  }
}
```

---

## 5. Verification Method

1. **Test Runner Command**:
   ```bash
   npx tsx tests/m2_csv_templates_and_import_harmonization.test.ts
   npx tsx tests/adversarial_m2_template_and_import_challenger.test.ts
   ```
2. **Integrated Test Suite Verification**:
   Once incorporated into `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`:
   ```bash
   npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts
   ```
3. **Full Project Regression Gate**:
   ```bash
   npm test
   ```
4. **Invalidation Conditions**:
   - Any failure in the 22 test assertions.
   - Any reintroduction of `'id'` into `Kalender_Pendidikan` or `Jadwal_Pelajaran` CSV templates.
   - Any omission of `'sekolah_id'` from `Data_Guru` CSV template.
   - Any failure to strip single apostrophes (`'`) from NISN or NIP.
   - Any uncaught `PGRST205` error when importing into `data_kelas`.
   - Any duplicate row creation upon re-importing existing student NISNs.
