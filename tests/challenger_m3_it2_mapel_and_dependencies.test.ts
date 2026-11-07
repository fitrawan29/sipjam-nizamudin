/**
 * tests/challenger_m3_it2_mapel_and_dependencies.test.ts
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE — MILESTONE 3 ITERATION 2
 * Focus:
 * 1. Data_Mapel category and group field preservation fidelity (kategori & kelompok).
 * 2. Header normalization robustness (aliases, inverted order, whitespace, case, delimiters).
 * 3. End-to-end mock upsert fidelity verifying both fields reach the database payload.
 * 4. Backward compatibility: non-mapel tables aliasing 'kelompok' to 'kategori'.
 * 5. Cross-entity relational dependency boundary conditions.
 */

import assert from 'node:assert';
import {
  parseAndValidateMasterCsv,
  normalizeCsvHeaders,
  validateRelationalDependencies,
  importMasterDataFromCsv,
  MasterDataValidationError
} from '../src/lib/dataIntegrityGuard';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ${GREEN}✔ [PASS]${RESET} ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ${RED}✖ [FAIL]${RESET} ${name}`);
    console.error(`     ${err?.stack || err?.message || err}`);
    process.exitCode = 1;
  }
}

async function runChallengerSuite() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  CHALLENGER SUITE: DATA_MAPEL KATEGORI/KELOMPOK & RELATIONAL FIDELITY ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const schoolId = 'a0000000-0000-0000-0000-000000000001';
  const dummyUser = { id: 'admin-1', role: 'admin', sekolah_id: schoolId };

  // ============================================================================
  // SECTION 1: DATA_MAPEL KATEGORI & KELOMPOK PARSING FIDELITY
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 1: data_mapel Header Normalization & Parsing Fidelity ---${RESET}`);

  await test('1.1: normalizeCsvHeaders preserves both "kategori" and "kelompok" for data_mapel and mapel', () => {
    const raw = ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok'];
    const normMapel = normalizeCsvHeaders(raw, 'data_mapel');
    assert.deepStrictEqual(normMapel, ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok']);

    const normShortMapel = normalizeCsvHeaders(raw, 'mapel');
    assert.deepStrictEqual(normShortMapel, ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok']);
  });

  await test('1.2: normalizeCsvHeaders maps aliases kategori_mapel & kelompok_mapel to canonical names', () => {
    const raw = ['id', 'nama_mapel', 'kategori_mapel', 'kelompok_mapel'];
    const norm = normalizeCsvHeaders(raw, 'data_mapel');
    assert.deepStrictEqual(norm, ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok']);
  });

  await test('1.3: parseAndValidateMasterCsv faithfully preserves kategori and kelompok in standard order', () => {
    const csv = [
      'id,nama_mata_pelajaran,kategori,kelompok',
      'MP-01,Matematika Wajib,Umum,Wajib',
      'MP-02,Biologi Peminatan,Kejuruan,Peminatan'
    ].join('\n');

    const parsed = parseAndValidateMasterCsv(csv, 'data_mapel', dummyUser);
    assert.strictEqual(parsed.length, 2);

    assert.strictEqual(parsed[0].nama_mata_pelajaran, 'Matematika Wajib');
    assert.strictEqual(parsed[0].kategori, 'Umum');
    assert.strictEqual(parsed[0].kelompok, 'Wajib');

    assert.strictEqual(parsed[1].nama_mata_pelajaran, 'Biologi Peminatan');
    assert.strictEqual(parsed[1].kategori, 'Kejuruan');
    assert.strictEqual(parsed[1].kelompok, 'Peminatan');
  });

  await test('1.4: parseAndValidateMasterCsv faithfully preserves fields when kelompok precedes kategori (inverted order)', () => {
    const csv = [
      'id,kelompok,nama_mata_pelajaran,kategori',
      'MP-10,Pilihan,Fisika Lanjutan,MIPA'
    ].join('\n');

    const parsed = parseAndValidateMasterCsv(csv, 'data_mapel', dummyUser);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].nama_mata_pelajaran, 'Fisika Lanjutan');
    assert.strictEqual(parsed[0].kelompok, 'Pilihan');
    assert.strictEqual(parsed[0].kategori, 'MIPA');
  });

  await test('1.5: parseAndValidateMasterCsv handles BOM, quotes, whitespace, and case variations in headers', () => {
    const csv = [
      '\uFEFF" ID " , " Nama Mata Pelajaran " , " KATEGORI " , " KELOMPOK "',
      '"MP-20" , " Kimia Terapan " , " Umum " , " Wajib "'
    ].join('\n');

    const parsed = parseAndValidateMasterCsv(csv, 'data_mapel', dummyUser);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].nama_mata_pelajaran, 'Kimia Terapan');
    assert.strictEqual(parsed[0].kategori, 'Umum');
    assert.strictEqual(parsed[0].kelompok, 'Wajib');
  });

  await test('1.6: parseAndValidateMasterCsv handles semicolon, tab, and pipe delimiters for data_mapel', () => {
    const semiCsv = 'id;nama_mata_pelajaran;kategori;kelompok\nMP-31;Sejarah Indonesia;Umum;Wajib';
    const tabCsv = 'id\tnama_mata_pelajaran\tkategori\tkelompok\nMP-32\tGeografi\tSosial\tPeminatan';
    const pipeCsv = 'id|nama_mata_pelajaran|kategori|kelompok\nMP-33|Sosiologi|Sosial|Pilihan';

    const pSemi = parseAndValidateMasterCsv(semiCsv, 'data_mapel', dummyUser);
    assert.strictEqual(pSemi[0].kategori, 'Umum');
    assert.strictEqual(pSemi[0].kelompok, 'Wajib');

    const pTab = parseAndValidateMasterCsv(tabCsv, 'data_mapel', dummyUser);
    assert.strictEqual(pTab[0].kategori, 'Sosial');
    assert.strictEqual(pTab[0].kelompok, 'Peminatan');

    const pPipe = parseAndValidateMasterCsv(pipeCsv, 'data_mapel', dummyUser);
    assert.strictEqual(pPipe[0].kategori, 'Sosial');
    assert.strictEqual(pPipe[0].kelompok, 'Pilihan');
  });

  await test('1.7: parseAndValidateMasterCsv handles missing optional id (auto-generates id) without dropping kategori/kelompok', () => {
    const csv = [
      'nama_mata_pelajaran,kategori,kelompok',
      'Informatika,Kejuruan,Produktif'
    ].join('\n');

    const parsed = parseAndValidateMasterCsv(csv, 'data_mapel', dummyUser);
    assert.strictEqual(parsed.length, 1);
    assert.ok(parsed[0].id, 'Must have auto-generated id');
    assert.strictEqual(parsed[0].nama_mata_pelajaran, 'Informatika');
    assert.strictEqual(parsed[0].kategori, 'Kejuruan');
    assert.strictEqual(parsed[0].kelompok, 'Produktif');
  });

  await test('1.8: parseAndValidateMasterCsv handles partial fields (only kategori or only kelompok provided)', () => {
    const csvKatOnly = 'nama_mata_pelajaran,kategori\nPendidikan Agama,Umum';
    const pKat = parseAndValidateMasterCsv(csvKatOnly, 'data_mapel', dummyUser);
    assert.strictEqual(pKat[0].kategori, 'Umum');
    assert.strictEqual(pKat[0].kelompok, undefined);

    const csvKelOnly = 'nama_mata_pelajaran,kelompok\nPendidikan Pancasila,Wajib';
    const pKel = parseAndValidateMasterCsv(csvKelOnly, 'data_mapel', dummyUser);
    assert.strictEqual(pKel[0].kelompok, 'Wajib');
    assert.strictEqual(pKel[0].kategori, undefined);
  });

  // ============================================================================
  // SECTION 2: BACKWARD COMPATIBILITY FOR NON-MAPEL TABLES
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 2: Backward Compatibility for Non-Mapel Entities ---${RESET}`);

  await test('2.1: Non-mapel tables convert "kelompok" header to "kategori" for backward compatibility', () => {
    const raw = ['nama_kelas', 'kelompok'];
    const norm = normalizeCsvHeaders(raw, 'data_kelas');
    assert.deepStrictEqual(norm, ['nama_kelas', 'kategori']);
  });

  await test('2.2: Non-mapel tables preserve their canonical headers without collision', () => {
    const guruHeaders = normalizeCsvHeaders(['nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email', 'sekolah_id'], 'data_guru');
    assert.deepStrictEqual(guruHeaders, ['nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email', 'sekolah_id']);

    const siswaHeaders = normalizeCsvHeaders(['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu'], 'data_siswa');
    assert.deepStrictEqual(siswaHeaders, ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']);
  });

  // ============================================================================
  // SECTION 3: END-TO-END MOCK UPSERT PAYLOAD INTEGRITY FOR DATA_MAPEL
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 3: End-to-End Upsert Payload Integrity ---${RESET}`);

  await test('3.1: importMasterDataFromCsv delivers BOTH kategori and kelompok intact to supabase.upsert', async () => {
    let capturedBatch: any[] = [];
    const mockSupabase = {
      from: (tbl: string) => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null })
        }),
        upsert: (batch: any[], options: any) => {
          if (tbl === 'data_mapel') {
            capturedBatch = batch;
          }
          return Promise.resolve({ data: batch, error: null });
        }
      })
    };

    const csv = [
      'id,nama_mata_pelajaran,kategori,kelompok',
      'MP-01,Matematika Wajib,Umum,Wajib',
      'MP-02,Bahasa Inggris Lanjutan,Peminatan,Kelompok B'
    ].join('\n');

    const result = await importMasterDataFromCsv(
      mockSupabase,
      csv,
      'data_mapel',
      dummyUser
    );

    assert.strictEqual(result.count, 2);
    assert.strictEqual(capturedBatch.length, 2);

    // Verify Row 1
    assert.strictEqual(capturedBatch[0].id, 'MP-01');
    assert.strictEqual(capturedBatch[0].nama_mata_pelajaran, 'Matematika Wajib');
    assert.strictEqual(capturedBatch[0].kategori, 'Umum', 'Batch payload MUST retain row 1 kategori');
    assert.strictEqual(capturedBatch[0].kelompok, 'Wajib', 'Batch payload MUST retain row 1 kelompok');
    assert.strictEqual(capturedBatch[0].sekolah_id, schoolId);

    // Verify Row 2
    assert.strictEqual(capturedBatch[1].id, 'MP-02');
    assert.strictEqual(capturedBatch[1].nama_mata_pelajaran, 'Bahasa Inggris Lanjutan');
    assert.strictEqual(capturedBatch[1].kategori, 'Peminatan', 'Batch payload MUST retain row 2 kategori');
    assert.strictEqual(capturedBatch[1].kelompok, 'Kelompok B', 'Batch payload MUST retain row 2 kelompok');
    assert.strictEqual(capturedBatch[1].sekolah_id, schoolId);
  });

  await test('3.2: data_mapel updates existing records in-place without corrupting kategori/kelompok', async () => {
    let capturedBatch: any[] = [];
    const mockSupabase = {
      from: (tbl: string) => ({
        select: (cols: string) => ({
          eq: () => Promise.resolve({
            data: [
              { id: 'uuid-mapel-mat-existing', nama_mata_pelajaran: 'Matematika Wajib', sekolah_id: schoolId }
            ],
            error: null
          })
        }),
        upsert: (batch: any[]) => {
          capturedBatch = batch;
          return Promise.resolve({ data: batch, error: null });
        }
      })
    };

    const csv = [
      'nama_mata_pelajaran,kategori,kelompok',
      'Matematika Wajib,Umum,Wajib Diperbarui'
    ].join('\n');

    await importMasterDataFromCsv(mockSupabase, csv, 'data_mapel', dummyUser);

    assert.strictEqual(capturedBatch.length, 1);
    assert.strictEqual(capturedBatch[0].id, 'uuid-mapel-mat-existing', 'Should resolve existing subject ID idempotently');
    assert.strictEqual(capturedBatch[0].nama_mata_pelajaran, 'Matematika Wajib');
    assert.strictEqual(capturedBatch[0].kategori, 'Umum');
    assert.strictEqual(capturedBatch[0].kelompok, 'Wajib Diperbarui');
  });

  // ============================================================================
  // SECTION 4: RELATIONAL DEPENDENCIES ACROSS IMPORT WORKFLOWS
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 4: Relational Dependency Boundary Verification ---${RESET}`);

  await test('4.1: jadwal_pelajaran validates subject against data_mapel and rejects missing mapel', async () => {
    const mockDb = {
      from: (tbl: string) => ({
        select: () => ({
          eq: () => {
            if (tbl === 'data_guru') return Promise.resolve({ data: [{ id: 'g1', nama_guru: 'Budi Santoso' }], error: null });
            if (tbl === 'data_kelas') return Promise.resolve({ data: [{ id: 'k1', nama_kelas: 'X Merdeka' }], error: null });
            if (tbl === 'data_mapel') return Promise.resolve({ data: [{ id: 'm1', nama_mata_pelajaran: 'Matematika' }], error: null });
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    };

    const invalidScheduleRows = [
      { hari: 'Senin', nama_guru: 'Budi Santoso', mata_pelajaran: 'Robotika Canggih', kelas: 'X Merdeka', _csvRowNumber: 3 }
    ];

    let thrownErr: any = null;
    try {
      await validateRelationalDependencies(mockDb, invalidScheduleRows, 'jadwal_pelajaran', schoolId);
    } catch (e) {
      thrownErr = e;
    }

    assert.ok(thrownErr instanceof MasterDataValidationError, 'Must reject nonexistent subject');
    assert.strictEqual(thrownErr.detail.code, '23503');
    assert.strictEqual(thrownErr.detail.column, 'mata_pelajaran');
    assert.strictEqual(thrownErr.detail.referenceTable, 'data_mapel');
    assert.strictEqual(thrownErr.detail.row, 3);
    assert.ok(thrownErr.message.includes('Mata pelajaran "Robotika Canggih" belum terdaftar di Data Mapel.'));
  });

  await test('4.2: jadwal_pelajaran matches subject case-insensitively with trimmed whitespace', async () => {
    const mockDb = {
      from: (tbl: string) => ({
        select: () => ({
          eq: () => {
            if (tbl === 'data_guru') return Promise.resolve({ data: [{ id: 'g1', nama_guru: 'Budi Santoso' }], error: null });
            if (tbl === 'data_kelas') return Promise.resolve({ data: [{ id: 'k1', nama_kelas: 'X Merdeka' }], error: null });
            if (tbl === 'data_mapel') return Promise.resolve({ data: [{ id: 'm1', nama_mata_pelajaran: 'Pendidikan Agama Islam' }], error: null });
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    };

    const rows = [
      { hari: 'Senin', nama_guru: 'Budi Santoso', mata_pelajaran: '  pendidikan agama islam  ', kelas: 'X Merdeka', _csvRowNumber: 2 }
    ];

    // Must resolve successfully without throwing
    await validateRelationalDependencies(mockDb, rows, 'jadwal_pelajaran', schoolId);
  });

  // ============================================================================
  // SECTION 5: ADVERSARIAL QUOTE STRIPPING & DOWNLOAD TEMPLATE ROUNDTRIP
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 5: Excel Quote Stripping & Official Template Roundtrip ---${RESET}`);

  await test('5.1: Excel single quotes (\'Umum\', \'Wajib\') are cleanly stripped without field corruption', () => {
    const csv = [
      'id,nama_mata_pelajaran,kategori,kelompok',
      '\'MP-50\',\'Bahasa Jerman\',\'Umum\',\'Pilihan\''
    ].join('\n');

    const parsed = parseAndValidateMasterCsv(csv, 'data_mapel', dummyUser);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].id, 'MP-50');
    assert.strictEqual(parsed[0].nama_mata_pelajaran, 'Bahasa Jerman');
    assert.strictEqual(parsed[0].kategori, 'Umum');
    assert.strictEqual(parsed[0].kelompok, 'Pilihan');
  });

  await test('5.2: Official Template_Data_Mapel CSV sample directly parses with 100% field fidelity', () => {
    // Official template from AdminDataView.tsx
    const officialHeaders = ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok'];
    const officialSample = ['MP-01', 'Matematika Wajib', 'Umum', 'Wajib'];
    const officialCsv = `${officialHeaders.join(',')}\n${officialSample.join(',')}`;

    const parsed = parseAndValidateMasterCsv(officialCsv, 'data_mapel', dummyUser);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].id, 'MP-01');
    assert.strictEqual(parsed[0].nama_mata_pelajaran, 'Matematika Wajib');
    assert.strictEqual(parsed[0].kategori, 'Umum');
    assert.strictEqual(parsed[0].kelompok, 'Wajib');
  });

  // ============================================================================
  // SECTION 6: RELATIONAL DEPENDENCY CHECKS WITH INVALID CSV DATA
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 6: Relational Dependency Checks on Invalid CSV Data ---${RESET}`);

  await test('6.1: data_siswa rejects invalid class on CSV with MasterDataValidationError', async () => {
    const mockDb = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [{ id: 'k1', nama_kelas: 'X Merdeka' }], error: null })
        })
      })
    };

    const invalidStudentCsv = [
      'nisn,nama_siswa,kelas',
      '0012345678,Budi Santoso,Kelas Gaib 99'
    ].join('\n');

    let thrown: any = null;
    try {
      await importMasterDataFromCsv(mockDb, invalidStudentCsv, 'data_siswa', dummyUser);
    } catch (e) {
      thrown = e;
    }

    if (!thrown || !(thrown instanceof MasterDataValidationError)) {
      console.error('Actual 6.1 thrown error:', thrown);
    }
    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(thrown.detail.code, '23503');
    assert.strictEqual(thrown.detail.column, 'kelas');
    assert.strictEqual(thrown.detail.receivedValue, 'Kelas Gaib 99');
    assert.strictEqual(thrown.detail.referenceTable, 'data_kelas');
    assert.ok(thrown.message.includes('Kelas "Kelas Gaib 99" untuk siswa "Budi Santoso" belum terdaftar pada Data Kelas.'));
  });

  await test('6.2: jadwal_pelajaran aggregates multiple relational errors (teacher + mapel + class)', async () => {
    const mockDb = {
      from: (tbl: string) => ({
        select: () => ({
          eq: () => {
            if (tbl === 'data_guru') return Promise.resolve({ data: [{ id: 'g1', nama_guru: 'Guru Terdaftar' }], error: null });
            if (tbl === 'data_kelas') return Promise.resolve({ data: [{ id: 'k1', nama_kelas: 'X Merdeka' }], error: null });
            if (tbl === 'data_mapel') return Promise.resolve({ data: [{ id: 'm1', nama_mata_pelajaran: 'Matematika' }], error: null });
            return Promise.resolve({ data: [], error: null });
          }
        }),
        upsert: (batch: any[]) => Promise.resolve({ data: batch, error: null })
      })
    };

    const invalidScheduleCsv = [
      'hari,nama_guru,mata_pelajaran,kelas',
      'Senin,Bambang Sudarsono,Informatika,Kelas NonExistent'
    ].join('\n');

    let thrown: any = null;
    try {
      await importMasterDataFromCsv(mockDb, invalidScheduleCsv, 'jadwal_pelajaran', dummyUser);
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.ok(thrown.message.includes('ditemukan 3 masalah'), 'Must report all 3 missing dependencies');
    assert.ok(thrown.message.includes('Guru "Bambang Sudarsono"'));
    assert.ok(thrown.message.includes('Mata pelajaran "Informatika"'));
    assert.ok(thrown.message.includes('Kelas "Kelas NonExistent"'));
  });

  await test('6.3: wali_kelas resolves teacher by NIP even if teacher name has academic title variations', async () => {
    const mockDb = {
      from: (tbl: string) => ({
        select: () => ({
          eq: () => {
            if (tbl === 'data_guru') {
              return Promise.resolve({
                data: [{ id: 'uuid-guru-dewi-777', nama_guru: 'Dewi Sartika, S.Pd.', nip: '198801012015012001' }],
                error: null
              });
            }
            if (tbl === 'data_kelas') {
              return Promise.resolve({
                data: [{ id: 'k1', nama_kelas: 'XI RPL 1' }],
                error: null
              });
            }
            return Promise.resolve({ data: [], error: null });
          }
        }),
        upsert: (batch: any[]) => Promise.resolve({ data: batch, error: null })
      })
    };

    const waliCsv = [
      'kelas,nama_guru,nip,tahun_ajaran',
      'XI RPL 1,Dewi Sartika,198801012015012001,2024/2025'
    ].join('\n');

    const result = await importMasterDataFromCsv(mockDb, waliCsv, 'wali_kelas', dummyUser);
    assert.strictEqual(result.count, 1);
    assert.strictEqual(result.rows[0].guru_id, 'uuid-guru-dewi-777', 'Must resolve guru_id by NIP match');
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}  CHALLENGER SUITE SUMMARY: ${passedTests} / ${totalTests} CHECKS PASSED${RESET}`);
  if (failedTests > 0) {
    console.log(`${RED}${BOLD}  ${failedTests} CHECKS FAILED!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}  ALL ${totalTests} CHECKS PASSED WITH COMPLETE FIELD FIDELITY!${RESET}`);
    console.log(`${BOLD}========================================================================${RESET}\n`);
  }
}

runChallengerSuite().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
