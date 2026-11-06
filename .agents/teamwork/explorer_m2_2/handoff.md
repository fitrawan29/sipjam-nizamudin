# Handoff Report: Milestone 2 — CSV Normalization, Validation, and Idempotent Upsert Engine

## 1. Observation

### 1.1 Existing Codebase Findings
1. **`src/lib/dataIntegrityGuard.ts` (Lines 544–581, `normalizeCsvHeaders`)**:
   - Current implementation handles header mapping for `data_siswa`, `data_guru`, and `data_mapel`.
   - Lines 555–557:
     ```ts
     if (clean === 'nama' || clean === 'nama_lengkap' || clean === 'namalengkap') {
       return tableName === 'data_siswa' ? 'nama_siswa' : 'nama_guru';
     }
     ```
     Observed issue: If `tableName === 'data_kelas'` or `tableName === 'kelas'`, a column header named `nama` or `nama_lengkap` will inadvertently map to `nama_guru` rather than `nama_kelas`.
   - Current header normalization has no mappings for `tableName === 'data_kelas'` / `tableName === 'kelas'`. Column names such as `nama_kelas`, `tingkat`, `jurusan`, `kelas`, `rombel` are not recognized or normalized.
   - Cross-entity aliases are partially defined (e.g. `no_hp_orang_tua -> no_hp_ortu`, `id_sekolah -> sekolah_id`), but need complete coverage for aliases such as `jenis_kelamin -> gender`, `tingkat_kelas -> tingkat`, `peminatan -> jurusan`, and table-specific `rombel -> nama_kelas` (for `data_kelas`) vs `rombel -> kelas` (for other tables).

2. **`src/lib/dataIntegrityGuard.ts` (Lines 637–680, `isUuidKeyedTable`)**:
   - `isUuidKeyedTable` defines tables that use UUID primary keys:
     ```ts
     const isUuidKeyedTable =
       tableName === 'kalender_pendidikan' ||
       tableName === 'jadwal_pelajaran' ||
       tableName === 'data_siswa' ||
       tableName === 'wali_kelas' ||
       tableName === 'sistem_blok';
     ```
     Observed issue: `tableName === 'data_kelas'` and `tableName === 'kelas'` are missing. If a CSV without `id` is uploaded for `data_kelas`, it falls back to lines 650–657 which generates a UUID, but if a non-UUID ID (e.g. `KLS-01`) is present, it does not sanitize it to a valid UUID, which triggers PostgreSQL Error `22P02`.
   - Missing validation branch for `data_kelas`: Lines 738–817 handle `data_guru`, `jadwal_pelajaran`, `data_mapel`, and `data_siswa`. There is no validation branch for `data_kelas`, so empty class names or dummy class names (e.g. `test`, `dummy`, `fiktif`) are not intercepted prior to database insertion, allowing PostgreSQL Error `23502` or dummy records to reach the database.

3. **`src/lib/dataIntegrityGuard.ts` (Lines 833–865, `importMasterDataFromCsv`)**:
   - Lines 845–849:
     ```ts
     if (tableName === 'wali_kelas') {
       upsertOptions.onConflict = 'sekolah_id, kelas';
     } else {
       upsertOptions.onConflict = 'id';
     }
     ```
     Observed issue A (`data_kelas`): When `tableName === 'data_kelas'`, `upsertOptions.onConflict` defaults to `'id'`. Re-uploading a class list or importing classes cannot deduplicate on `(sekolah_id, nama_kelas)`. Furthermore, if `public.data_kelas` table has not yet loaded into the PostgREST schema cache (PostgREST error `PGRST205` / PostgreSQL `42P01`), the entire import crashes with an unhandled exception instead of gracefully falling back to syncing classes in `wali_kelas` and `data_siswa`.
     Observed issue B (`data_siswa`): The CSV template for `Data_Siswa` (`Template_Data_Siswa.csv`) omits `id` by design (`nisn,nama_siswa,kelas,gender,status,no_hp_ortu`). When `parseAndValidateMasterCsv` parses this file, lines 650–657 auto-generate a new random UUID for `row.id`. Because `upsertOptions.onConflict = 'id'`, re-uploading an updated student CSV (e.g. updating phone number or class) performs an `INSERT` with new IDs, creating duplicate student records or triggering unique constraint violations on `(sekolah_id, nisn)`.

4. **`src/components/AdminDataView.tsx` (Lines 229–260, `templates`)**:
   - `templates` contains configurations for `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, and `Wali_Kelas`.
   - `Data_Kelas` (`Template_Data_Kelas.csv`) is missing from the templates mapping.
   - Lines 1935–1938 render `<AdminKelasView user={user} />` inside a conditional branch where the generic "Impor & Kelola Data" banner (Template download & Unggah buttons) in lines 1955–1978 is bypassed. Therefore, `AdminDataView.tsx` / `AdminKelasView.tsx` needs a dedicated trigger or integrated download/upload controls for `Data_Kelas`.

5. **Existing Test Suite Baseline**:
   - `npm test` executes 54 test files (including adversarial tests, PostgreSQL error prevention tests, and data integrity tests). All passed cleanly (exit code 0).

---

## 2. Logic Chain

```
[Observation 1.1] normalizeCsvHeaders lacks data_kelas rules and has table-collision on 'nama'
        ↓
  Step 1: In normalizeCsvHeaders, scope 'nama' / 'nama_lengkap' by table (data_siswa -> nama_siswa; data_kelas/kelas -> nama_kelas; data_mapel -> nama_mata_pelajaran; default -> nama_guru).
  Step 2: Add dedicated rules for tableName === 'data_kelas' || tableName === 'kelas': map 'kelas', 'rombel', 'nama_kelas', 'namakelas' -> 'nama_kelas'; map 'tingkat', 'tingkat_kelas', 'grade' -> 'tingkat'; map 'jurusan', 'peminatan' -> 'jurusan'.
  Step 3: Unify aliases across all 7 entities so any standard Indonesian educational CSV format is recognized without column mapping errors.

[Observation 1.2] parseAndValidateMasterCsv omits data_kelas from isUuidKeyedTable and lacks validation branch
        ↓
  Step 4: Include 'data_kelas' and 'kelas' in isUuidKeyedTable so missing IDs receive genuine UUIDs and legacy non-UUID strings are sanitized to UUIDs, preventing PostgreSQL Error 22P02.
  Step 5: Add validation branch for data_kelas / kelas:
          - Mandatory non-empty 'nama_kelas' check (prevents PostgreSQL 23502).
          - Anti-dummy check via isDummyOrTestString('nama_kelas').
          - Forbidden name check via isForbiddenName('nama_kelas').
          - Deduplication check of class names within the CSV file.
          - Automatic derivation of 'tingkat' ('10', '11', '12', or 'Lainnya') from class name if omitted.
          - Null-safe sanitization of optional 'jurusan'.

[Observation 1.3] importMasterDataFromCsv lacks data_siswa idempotency and data_kelas fallback
        ↓
  Step 6: In importMasterDataFromCsv for tableName === 'data_siswa':
          Extract all non-empty NISN values and query existing records in chunks of 100 via:
          `supabase.from('data_siswa').select('id, nisn, sekolah_id').eq('sekolah_id', schoolId).in('nisn', chunk)`.
          Map existing student UUIDs into matching CSV rows (row.id = existingId).
          When batch upsert executes with `onConflict: 'id'`, existing students are cleanly updated in-place without duplicate rows or 23505 constraint violations.
  Step 7: In importMasterDataFromCsv for tableName === 'data_kelas' / 'kelas':
          Set upsertOptions.onConflict = 'sekolah_id, nama_kelas'.
          Wrap upsert in defensive error handling. If PostgREST schema cache error (PGRST205 / 42P01) occurs:
          Catch the error using an inline `isSchemaCacheError` helper and fallback gracefully to ensuring distinct class names are synced into `wali_kelas` with placeholder teacher records and standard school ID, returning `{ count, rows }` successfully.

[Observation 1.4 & 1.5] Template alignment and regression prevention
        ↓
  Step 8: Provide `Template_Data_Kelas.csv` in `AdminDataView.tsx` with headers `nama_kelas,tingkat,jurusan`.
  Step 9: Preserve self-contained nature of `dataIntegrityGuard.ts` (no heavy client imports) ensuring 100% test compatibility and zero regression across the 54 automated test suites.
```

---

## 3. Caveats

1. **Database Table `public.data_kelas` vs Relational Fallback**:
   In older Supabase instances of SIPJAM, classes are dynamically derived from `data_siswa.kelas` and `wali_kelas.kelas`. A dedicated table `public.data_kelas` was introduced in later migrations. The proposed engine actively checks `data_kelas` first, and if `PGRST205` or `42P01` occurs, it automatically falls back to syncing `wali_kelas` and `data_siswa` without requiring manual database migration or causing user disruption.
2. **NISN Formatting**:
   Students in early registration may occasionally have empty NISN or placeholder `-`. The idempotent matching logic strictly ignores empty strings and `-`, falling back to genuine UUID generation for new students while maintaining safety.
3. **Multi-tenant Safety**:
   `sekolah_id` validation is strictly enforced. School-level Admins cannot upload CSVs targeting foreign `sekolah_id`s, while Superadmins retain cross-school administrative flexibility.

---

## 4. Conclusion & Technical Implementation Blueprint

The solution consists of precise, backward-compatible enhancements to `src/lib/dataIntegrityGuard.ts` and integration in `src/components/AdminDataView.tsx`.

### 4.1 Implementation Blueprint for `src/lib/dataIntegrityGuard.ts`

#### Component A: Helper Function `isSchemaCacheError`
Add an inline helper inside `src/lib/dataIntegrityGuard.ts` to keep the module completely self-contained:
```ts
/**
 * Detects PostgREST PGRST205 or PostgreSQL 42P01 missing table errors
 * without requiring external library imports.
 */
function isSchemaCacheError(err: any): boolean {
  if (!err) return false;
  const target = (typeof err === 'object' && err !== null && 'error' in err && err.error && typeof err.error === 'object')
    ? err.error
    : err;
  const code = String(target.code || target.status || err.code || err.status || '').trim().toUpperCase();
  const msg = String(target.message || target.error_description || err.message || '').toLowerCase();
  const details = String(target.details || err.details || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    code === 'PGRST200' ||
    code === 'PGRST204' ||
    msg.includes('pgrst205') ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    details.includes('does not exist')
  );
}
```

#### Component B: Enhanced `normalizeCsvHeaders`
Replace `normalizeCsvHeaders` with the following comprehensive implementation:
```ts
/**
 * Normalizes CSV header names across all 7 Master Data entities:
 * - data_kelas / kelas: nama_kelas, tingkat, jurusan, kelas, rombel
 * - data_siswa: nisn, nama_siswa, kelas, gender, status, no_hp_ortu
 * - data_guru: nip, nama_guru, mata_pelajaran, no_hp, status, email, sekolah_id
 * - data_mapel: id, nama_mata_pelajaran, kategori
 * - kalender_pendidikan: tanggal, keterangan, tipe
 * - jadwal_pelajaran: hari, nama_guru, mata_pelajaran, kelas
 * - wali_kelas: kelas, nama_guru, nip, tahun_ajaran
 */
export function normalizeCsvHeaders(rawHeaders: string[], tableName: string): string[] {
  const normTable = (tableName || '').toLowerCase().trim();
  const isKelas = normTable === 'data_kelas' || normTable === 'kelas';
  const isSiswa = normTable === 'data_siswa' || normTable === 'siswa';
  const isMapel = normTable === 'data_mapel' || normTable === 'mapel';
  const isGuru = normTable === 'data_guru' || normTable === 'guru';

  return rawHeaders.map(h => {
    const clean = h
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/^["']+|["']+$/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
      .replace(/^_+|_+$/g, '');

    // 1. School ID aliases across all entities
    if (
      clean === 'id_sekolah' ||
      clean === 'school_id' ||
      clean === 'sekolahid' ||
      clean === 'schoolid' ||
      clean === 'idsekolah' ||
      clean === 'id_school' ||
      clean === 'idschool' ||
      clean === 'sekolah_uuid' ||
      clean === 'uuid_sekolah' ||
      clean === 'sekolahuuid' ||
      clean === 'uuidsekolah' ||
      clean === 'kode_sekolah' ||
      clean === 'kodesekolah'
    ) {
      return 'sekolah_id';
    }

    // 2. Class entity specific mappings
    if (isKelas) {
      if (
        clean === 'nama_kelas' ||
        clean === 'namakelas' ||
        clean === 'kelas' ||
        clean === 'rombel' ||
        clean === 'nama_rombel' ||
        clean === 'ruang_kelas' ||
        clean === 'nama'
      ) {
        return 'nama_kelas';
      }
      if (clean === 'tingkat' || clean === 'tingkat_kelas' || clean === 'tingkatkelas' || clean === 'grade' || clean === 'level') {
        return 'tingkat';
      }
      if (clean === 'jurusan' || clean === 'peminatan' || clean === 'program_keahlian' || clean === 'program' || clean === 'konsentrasi') {
        return 'jurusan';
      }
    }

    // 3. Name headers scoped by entity
    if (clean === 'nama' || clean === 'nama_lengkap' || clean === 'namalengkap') {
      if (isSiswa) return 'nama_siswa';
      if (isKelas) return 'nama_kelas';
      if (isMapel) return 'nama_mata_pelajaran';
      return 'nama_guru';
    }

    // 4. Student Phone / Parent Phone aliases
    if (
      clean === 'no_hp_orang_tua' ||
      clean === 'hp_ortu' ||
      clean === 'hp_orang_tua' ||
      clean === 'nohporangtua' ||
      clean === 'nohp_ortu' ||
      clean === 'telepon_ortu' ||
      clean === 'no_telepon_ortu' ||
      clean === 'wa_ortu' ||
      clean === 'nomor_ortu'
    ) {
      return 'no_hp_ortu';
    }

    // 5. Subject aliases
    if (
      clean === 'mata_pelajaran' ||
      clean === 'matapelajaran' ||
      clean === 'mapel' ||
      clean === 'nama_mapel' ||
      clean === 'namamapel' ||
      clean === 'nama_mata_pelajaran' ||
      clean === 'namamatapelajaran'
    ) {
      return isMapel ? 'nama_mata_pelajaran' : 'mata_pelajaran';
    }

    // 6. Teacher name aliases
    if (clean === 'guru' || clean === 'wali_kelas' || clean === 'walikelas' || clean === 'nama_wali_kelas') {
      return 'nama_guru';
    }

    // 7. Rombel in student, schedule, or homeroom teacher tables maps to 'kelas'
    if (clean === 'rombel') {
      return isKelas ? 'nama_kelas' : 'kelas';
    }

    // 8. Gender aliases
    if (clean === 'jenis_kelamin' || clean === 'jeniskelamin' || clean === 'jk' || clean === 'sex') {
      return 'gender';
    }

    // 9. Calendar / Event aliases
    if (clean === 'deskripsi' || clean === 'agenda' || clean === 'kegiatan' || clean === 'uraian' || clean === 'acara') {
      return 'keterangan';
    }
    if (clean === 'tgl' || clean === 'date') {
      return 'tanggal';
    }
    if (clean === 'jenis' || clean === 'type') {
      return 'tipe';
    }

    // 10. Academic year aliases
    if (clean === 'tahunajaran' || clean === 'tahun_akademik' || clean === 'ta') {
      return 'tahun_ajaran';
    }

    // 11. Category aliases
    if (clean === 'kelompok' || clean === 'kategori_mapel') {
      return 'kategori';
    }

    // 12. NISN / NIP aliases
    if (clean === 'nomor_induk_siswa_nasional' || clean === 'no_induk') {
      return 'nisn';
    }
    if (clean === 'nuptk' || clean === 'nomor_induk_pegawai') {
      return 'nip';
    }

    return clean;
  });
}
```

#### Component C: Enhanced `parseAndValidateMasterCsv`
Update UUID handling and add the `data_kelas` validation branch:
```ts
    // In parseAndValidateMasterCsv:
    // Update isUuidKeyedTable (include data_kelas & kelas):
    const isUuidKeyedTable =
      tableName === 'kalender_pendidikan' ||
      tableName === 'jadwal_pelajaran' ||
      tableName === 'data_siswa' ||
      tableName === 'wali_kelas' ||
      tableName === 'sistem_blok' ||
      tableName === 'data_kelas' ||
      tableName === 'kelas';
```
Add tracking set before loop:
```ts
  const seenClassNames = new Set<string>();
```
Add validation branch inside line processing:
```ts
    // Validation branch for data_kelas / kelas
    if (tableName === 'data_kelas' || tableName === 'kelas') {
      const rawNamaKelas = row.nama_kelas ? String(row.nama_kelas).trim() : '';
      if (!rawNamaKelas || rawNamaKelas.toLowerCase() === 'null' || rawNamaKelas.toLowerCase() === 'undefined') {
        throw new Error(`Baris ${i}: Kolom "nama_kelas" wajib diisi dan tidak boleh kosong untuk data kelas.`);
      }

      if (isDummyOrTestString(rawNamaKelas)) {
        throw new Error(`Baris ${i}: Terdeteksi nama kelas dummy/percobaan ("${rawNamaKelas}"). Harap masukkan data kelas riil.`);
      }

      if (isForbiddenName(rawNamaKelas)) {
        throw new Error(`Baris ${i}: Nama kelas "${rawNamaKelas}" dilarang.`);
      }

      const cleanNamaKelas = rawNamaKelas.replace(/\s+/g, ' ');
      row.nama_kelas = cleanNamaKelas;

      const lowerClass = cleanNamaKelas.toLowerCase();
      if (seenClassNames.has(lowerClass)) {
        throw new Error(`Baris ${i}: Duplikat nama kelas "${cleanNamaKelas}" dalam file CSV.`);
      }
      seenClassNames.add(lowerClass);

      // Auto-derive tingkat if missing or empty
      if (!row.tingkat || String(row.tingkat).trim() === '' || String(row.tingkat).toLowerCase() === 'null') {
        if (/^10\b|^x\b/i.test(cleanNamaKelas)) {
          row.tingkat = '10';
        } else if (/^11\b|^xi\b/i.test(cleanNamaKelas)) {
          row.tingkat = '11';
        } else if (/^12\b|^xii\b/i.test(cleanNamaKelas)) {
          row.tingkat = '12';
        } else {
          row.tingkat = 'Lainnya';
        }
      } else {
        row.tingkat = String(row.tingkat).trim();
        if (isDummyOrTestString(row.tingkat)) {
          throw new Error(`Baris ${i}: Terdeteksi tingkat kelas dummy/percobaan ("${row.tingkat}").`);
        }
      }

      // Sanitize optional jurusan
      if (row.jurusan !== undefined && row.jurusan !== null) {
        const rawJurusan = String(row.jurusan).trim();
        if (rawJurusan && rawJurusan.toLowerCase() !== 'null' && rawJurusan.toLowerCase() !== 'undefined') {
          if (isDummyOrTestString(rawJurusan)) {
            throw new Error(`Baris ${i}: Terdeteksi jurusan kelas dummy/percobaan ("${rawJurusan}").`);
          }
          row.jurusan = rawJurusan;
        } else {
          row.jurusan = null;
        }
      } else {
        row.jurusan = null;
      }
    }
```

#### Component D: Enhanced `importMasterDataFromCsv`
Enhance student idempotency matching and class upsert with fallback:
```ts
export async function importMasterDataFromCsv(
  supabase: any,
  csvText: string,
  tableName: string,
  user?: any
): Promise<{ count: number; rows: Record<string, any>[] }> {
  const rows = parseAndValidateMasterCsv(csvText, tableName, user);
  const isKelasTable = tableName === 'data_kelas' || tableName === 'kelas';
  const isSiswaTable = tableName === 'data_siswa' || tableName === 'siswa';
  const effectiveTableName = isKelasTable ? 'data_kelas' : tableName;

  // 1. IDEMPOTENT STUDENT RESOLUTION (data_siswa)
  // Match incoming students by (sekolah_id, nisn) to update existing rows instead of creating duplicates
  if (isSiswaTable && rows.length > 0) {
    const nisnList = Array.from(new Set(
      rows
        .map(r => (r.nisn ? String(r.nisn).trim() : ''))
        .filter(n => n.length > 0 && n !== '-')
    ));

    if (nisnList.length > 0) {
      const schoolId = user?.sekolah_id || rows[0]?.sekolah_id;
      try {
        const nisnToIdMap = new Map<string, string>();
        const chunkSize = 100;
        for (let k = 0; k < nisnList.length; k += chunkSize) {
          const chunk = nisnList.slice(k, k + chunkSize);
          let studentQuery = supabase
            .from('data_siswa')
            .select('id, nisn, sekolah_id');
          if (schoolId) {
            studentQuery = studentQuery.eq('sekolah_id', schoolId);
          }
          studentQuery = studentQuery.in('nisn', chunk);

          const { data: existingStudents, error: fetchErr } = await studentQuery;
          if (!fetchErr && existingStudents) {
            for (const s of existingStudents) {
              if (s.nisn) {
                nisnToIdMap.set(String(s.nisn).trim().toLowerCase(), s.id);
              }
            }
          }
        }

        // Map existing UUID to matching rows
        for (const row of rows) {
          const cleanNisn = row.nisn ? String(row.nisn).trim().toLowerCase() : '';
          if (cleanNisn && nisnToIdMap.has(cleanNisn)) {
            row.id = nisnToIdMap.get(cleanNisn);
          }
        }
      } catch (nisnMatchErr) {
        console.warn('[dataIntegrityGuard] Warning resolving existing students by NISN:', nisnMatchErr);
      }
    }
  }

  // 2. BATCH UPSERT WITH CONFLICT RESOLUTION AND FALLBACK
  const batchSize = 50;
  let isTableMissing = false;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const upsertOptions: any = { ignoreDuplicates: false };

    if (isKelasTable) {
      upsertOptions.onConflict = 'sekolah_id, nama_kelas';
    } else if (tableName === 'wali_kelas') {
      upsertOptions.onConflict = 'sekolah_id, kelas';
    } else {
      upsertOptions.onConflict = 'id';
    }

    const { error } = await supabase
      .from(effectiveTableName)
      .upsert(batch, upsertOptions);

    if (error) {
      // Check if data_kelas table is missing from schema cache (PGRST205 / 42P01)
      if (isKelasTable && isSchemaCacheError(error)) {
        isTableMissing = true;
        break;
      }

      // If onConflict specification on (sekolah_id, nama_kelas) fails due to constraint absence, retry on 'id'
      if (isKelasTable && (error.code === '42P10' || String(error.message).includes('conflict target') || String(error.message).includes('constraint'))) {
        const { error: idErr } = await supabase
          .from(effectiveTableName)
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
        if (idErr) {
          if (isSchemaCacheError(idErr)) {
            isTableMissing = true;
            break;
          }
          throw idErr;
        }
        continue;
      }

      // Localized error message translations
      if (error.code === '23503' || String(error.message).includes('sekolah_id_fkey') || String(error.message).includes('foreign key constraint')) {
        throw new Error('ID sekolah ("sekolah_id") dalam CSV tidak terdaftar di sistem sekolah. Pastikan menggunakan ID sekolah yang valid.');
      }
      if (error.code === '23502') {
        throw new Error(`Gagal menyimpan data: terdapat kolom wajib yang bernilai kosong (${error.message}).`);
      }
      if (error.code === '23505') {
        throw new Error(`Gagal menyimpan data: terdapat data duplikat yang melanggar batasan unik database (${error.message}).`);
      }
      if (error.code === '42501' || String(error.message).includes('row-level security')) {
        throw new Error('Akses ditolak oleh kebijakan keamanan data sekolah (RLS). Pastikan Anda hanya mengimpor data untuk sekolah Anda sendiri.');
      }
      throw error;
    }
  }

  // 3. GRACEFUL FALLBACK FOR data_kelas
  if (isTableMissing && isKelasTable) {
    console.warn('[dataIntegrityGuard] Table data_kelas unavailable (PGRST205/missing). Falling back to syncing classes in wali_kelas.');
    try {
      const schoolId = user?.sekolah_id || rows[0]?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      const distinctClasses = Array.from(new Set(rows.map(r => r.nama_kelas).filter(Boolean)));
      for (const cls of distinctClasses) {
        try {
          const { data: existingWali } = await supabase
            .from('wali_kelas')
            .select('id, kelas')
            .eq('sekolah_id', schoolId)
            .eq('kelas', cls)
            .maybeSingle();

          if (!existingWali) {
            await supabase.from('wali_kelas').upsert({
              id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined,
              sekolah_id: schoolId,
              kelas: cls,
              nama_guru: '-',
              nip: '-',
              tahun_ajaran: '2024/2025'
            }, { onConflict: 'sekolah_id, kelas' });
          }
        } catch (wErr) {
          console.warn('[dataIntegrityGuard] Fallback sync to wali_kelas warning for class:', cls, wErr);
        }
      }
    } catch (fallbackErr) {
      console.warn('[dataIntegrityGuard] Graceful fallback sync error:', fallbackErr);
    }
  }

  // 4. AUTO-SYNC TEACHER ACCOUNTS (data_guru)
  if (tableName === 'data_guru' && rows.length > 0) {
    try {
      for (const row of rows) {
        const targetUsername = resolveTeacherUsername(row);
        if (targetUsername) {
          const defaultPassword = getDefaultTeacherPassword(targetUsername);
          const userTable = supabase?.from?.('users');
          if (typeof userTable?.select === 'function') {
            const { data: existingUser } = await userTable
              .select('id')
              .ilike('username', targetUsername)
              .maybeSingle();

            if (!existingUser && typeof userTable?.insert === 'function') {
              await userTable.insert([{
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined,
                username: targetUsername,
                password: defaultPassword,
                nama: row.nama_guru,
                role: 'Guru',
                sekolah_id: row.sekolah_id || user?.sekolah_id
              }]);
            }
          }
        }
      }
    } catch (syncErr) {
      console.warn('[dataIntegrityGuard] Auto-sync users for imported data_guru warning:', syncErr);
    }
  }

  return { count: rows.length, rows };
}
```

---

### 4.2 Integration Blueprint for `src/components/AdminDataView.tsx`

1. **Add `Data_Kelas` to `templates` mapping**:
   ```ts
   Data_Kelas: {
     filename: 'Template_Data_Kelas.csv',
     headers: ['nama_kelas', 'tingkat', 'jurusan'],
     sample: ['X Merdeka', '10', 'Umum']
   },
   ```

2. **Expose CSV Template Download & Upload in `AdminKelasView.tsx`**:
   In `src/components/AdminKelasView.tsx`, provide an "Impor & Kelola Data" action bar with:
   - "Unduh Template": Downloads `Template_Data_Kelas.csv` (`nama_kelas,tingkat,jurusan`).
   - "Unggah CSV": File input accepting `.csv`, passing content to `importMasterDataFromCsv(supabase, text, 'data_kelas', user)`.
   - On success: refreshes class cards and directory via `loadAllData()`.

---

## 5. Verification Method

To independently verify the implementation:

1. **Execute TypeScript Static Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: 0 type errors.

2. **Execute Full Project Regression Test Suite**:
   ```bash
   npm test
   ```
   *Expected result*: All 54 test suites pass with 0 failures (Zero Regression).

3. **Dedicated Milestone 2 Verification Test Suite**:
   Verify with unit tests covering:
   - Header normalization: `normalizeCsvHeaders(['kelas', 'tingkat', 'jurusan'], 'data_kelas')` returns `['nama_kelas', 'tingkat', 'jurusan']`.
   - Alias normalization: `normalizeCsvHeaders(['rombel', 'grade', 'peminatan'], 'data_kelas')` returns `['nama_kelas', 'tingkat', 'jurusan']`.
   - Missing/dummy class name validation: `parseAndValidateMasterCsv` rejects empty `nama_kelas` and dummy strings (`test`, `dummy`, `fiktif`) with clear error messages mentioning row numbers.
   - Non-UUID / missing ID auto-generation: `parseAndValidateMasterCsv` generates valid UUIDs and prevents PostgreSQL 22P02.
   - Student idempotency: `importMasterDataFromCsv` matches existing student by `(sekolah_id, nisn)` and updates existing student ID rather than inserting duplicates.
   - Graceful fallback: Mock Supabase returning `PGRST205` on `data_kelas` upsert falls back to `wali_kelas` sync without throwing errors.
