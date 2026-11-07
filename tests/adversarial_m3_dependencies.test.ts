/**
 * tests/adversarial_m3_dependencies.test.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 3 (CHALLENGER):
 * Relational Dependency Validation, CSV Template Alignment & Guru_ID Enrichment
 *
 * Challenge Focus:
 * 1. Empirically verify relational dependency checks in src/lib/dataIntegrityGuard.ts
 *    with invalid relational CSV data (missing class for student, missing teacher/mapel/class for schedule,
 *    missing teacher for wali kelas, whitespace/case variations, multi-error aggregation).
 * 2. Empirically verify CSV template headers match database schema columns for all 9 entities.
 * 3. Empirically verify guru_id and nip auto-population in wali kelas.
 * 4. Verify zero database pollution (upsert is never reached when relational validation fails).
 * 5. Verify granular error diagnostic translation across PostgreSQL codes (23503, 23502, 23505, 42501).
 */

import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseAndValidateMasterCsv,
  validateRelationalDependencies,
  translateDatabaseError,
  importMasterDataFromCsv,
  MasterDataValidationError,
  normalizeCsvHeaders,
  normalizeName
} from '../src/lib/dataIntegrityGuard';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
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

async function runAdversarialSuite() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  ADVERSARIAL CHALLENGER SUITE: M3 MASTER DATA RELATIONAL INTEGRITY    ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const schoolId = 'a0000000-0000-0000-0000-000000000001';
  const dummyUser = { id: 'admin-1', role: 'admin', sekolah_id: schoolId };

  // ============================================================================
  // SECTION 1: RELATIONAL DEPENDENCY CHECKS WITH INVALID CSV DATA
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 1: Adversarial Relational Dependency Stress Testing ---${RESET}`);

  // Mock Database Fixture
  const createMockSupabase = (overrides?: {
    classes?: Array<{ nama_kelas: string; id?: string }>;
    teachers?: Array<{ nama_guru: string; id: string; nip?: string; user_id?: string }>;
    mapels?: Array<{ nama_mata_pelajaran: string; id: string; nama_mapel?: string }>;
    waliKelas?: Array<{ kelas: string; id?: string }>;
    upsertSpy?: (batch: any[]) => void;
  }) => {
    const validClasses = overrides?.classes || [
      { id: 'c1', nama_kelas: 'X Merdeka' },
      { id: 'c2', nama_kelas: 'XI RPL 1' },
      { id: 'c3', nama_kelas: 'XII TITL' }
    ];
    const validTeachers = overrides?.teachers || [
      { id: 't1', nama_guru: 'Budi Santoso', nip: '198001012010011001' },
      { id: 't2', nama_guru: 'Siti Aminah, M.Pd.', nip: '198502022012022002' },
      { id: 't3', nama_guru: 'Ade Fitrawan Ibrahim', nip: '-' }
    ];
    const validMapels = overrides?.mapels || [
      { id: 'm1', nama_mata_pelajaran: 'Matematika' },
      { id: 'm2', nama_mata_pelajaran: 'Informatika' },
      { id: 'm3', nama_mata_pelajaran: 'Bahasa Indonesia' }
    ];
    const validWali = overrides?.waliKelas || [];

    return {
      from: (tbl: string) => ({
        select: (cols: string) => ({
          eq: (col: string, val: string) => {
            if (tbl === 'data_kelas') return Promise.resolve({ data: validClasses, error: null });
            if (tbl === 'data_guru') return Promise.resolve({ data: validTeachers, error: null });
            if (tbl === 'data_mapel') return Promise.resolve({ data: validMapels, error: null });
            if (tbl === 'wali_kelas') return Promise.resolve({ data: validWali, error: null });
            return Promise.resolve({ data: [], error: null });
          }
        }),
        upsert: (batch: any[], opts?: any) => {
          if (overrides?.upsertSpy) overrides.upsertSpy(batch);
          return Promise.resolve({ error: null });
        }
      })
    };
  };

  await test('1.1: data_siswa rejects single student when kelas does not exist in data_kelas or wali_kelas', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { nisn: '1001', nama_siswa: 'Candra', kelas: 'X-NonExistent', _csvRowNumber: 2 }
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'data_siswa', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(thrown.detail.code, '23503');
    assert.strictEqual(thrown.detail.row, 2);
    assert.strictEqual(thrown.detail.column, 'kelas');
    assert.strictEqual(thrown.detail.receivedValue, 'X-NonExistent');
    assert.strictEqual(thrown.detail.referenceTable, 'data_kelas');
    assert.ok(thrown.message.includes('Baris 2'), 'Must include Baris 2');
    assert.ok(thrown.message.includes('X-NonExistent'), 'Must identify missing class name');
    assert.ok(thrown.message.includes('Data Kelas'), 'Must mention Data Kelas prerequisite');
  });

  await test('1.2: data_siswa accepts student when kelas matches case-insensitively or with normalized whitespace', async () => {
    const mockDb = createMockSupabase();
    // Test case A: Leading/trailing whitespace and mixed case
    const rows = [
      { nisn: '1001', nama_siswa: 'Candra', kelas: '  x merdeka  ', _csvRowNumber: 2 }
    ];
    await validateRelationalDependencies(mockDb, rows, 'data_siswa', schoolId);

    // Test case B: Multi-space normalization through CSV parsing pipeline
    const rawCsv = 'nisn,nama_siswa,kelas,gender,status,no_hp_ortu\n1001,Candra,  x  merdeka  ,L,Aktif,08123456789';
    const parsedRows = parseAndValidateMasterCsv(rawCsv, 'data_siswa', dummyUser);
    assert.strictEqual(parsedRows[0].kelas, 'x merdeka', 'parseAndValidateMasterCsv must normalize multiple internal spaces');
    await validateRelationalDependencies(mockDb, parsedRows, 'data_siswa', schoolId);
  });

  await test('1.3: data_siswa accepts student when kelas is present in wali_kelas fallback', async () => {
    const mockDb = createMockSupabase({
      classes: [], // Empty data_kelas
      waliKelas: [{ kelas: 'X Fallback' }]
    });
    const rows = [
      { nisn: '1001', nama_siswa: 'Candra', kelas: 'X Fallback', _csvRowNumber: 2 }
    ];

    // Should succeed because wali_kelas provides the class fallback
    await validateRelationalDependencies(mockDb, rows, 'data_siswa', schoolId);
  });

  await test('1.4: data_siswa aggregates multiple missing classes and formats multi-line diagnostic error', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { nisn: '1001', nama_siswa: 'Candra', kelas: 'X Merdeka', _csvRowNumber: 2 }, // valid
      { nisn: '1002', nama_siswa: 'Doni', kelas: 'Kelas Hantu 1', _csvRowNumber: 3 }, // invalid
      { nisn: '1003', nama_siswa: 'Eka', kelas: 'Kelas Hantu 2', _csvRowNumber: 4 }, // invalid
      { nisn: '1004', nama_siswa: 'Fani', kelas: 'Kelas Hantu 3', _csvRowNumber: 5 }  // invalid
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'data_siswa', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.ok(thrown.message.includes('ditemukan 3 masalah'), 'Must report total error count of 3');
    assert.ok(thrown.message.includes('Baris 3: Kelas "Kelas Hantu 1"'), 'Must report row 3');
    assert.ok(thrown.message.includes('Baris 4: Kelas "Kelas Hantu 2"'), 'Must report row 4');
    assert.ok(thrown.message.includes('Baris 5: Kelas "Kelas Hantu 3"'), 'Must report row 5');
    assert.strictEqual(thrown.detail.row, 3, 'First error row must be 3');
  });

  await test('1.5: jadwal_pelajaran rejects missing teacher with exact row, column, and reference table', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { hari: 'Senin', nama_guru: 'Guru Tidak Terdaftar', mata_pelajaran: 'Matematika', kelas: 'X Merdeka', _csvRowNumber: 7 }
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'jadwal_pelajaran', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(thrown.detail.code, '23503');
    assert.strictEqual(thrown.detail.row, 7);
    assert.strictEqual(thrown.detail.column, 'nama_guru');
    assert.strictEqual(thrown.detail.receivedValue, 'Guru Tidak Terdaftar');
    assert.strictEqual(thrown.detail.referenceTable, 'data_guru');
    assert.ok(thrown.message.includes('Baris 7: Guru "Guru Tidak Terdaftar" belum terdaftar di Data Guru.'));
  });

  await test('1.6: jadwal_pelajaran rejects missing mapel with exact row, column, and reference table', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { hari: 'Senin', nama_guru: 'Budi Santoso', mata_pelajaran: 'Astronomi Gaib', kelas: 'X Merdeka', _csvRowNumber: 8 }
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'jadwal_pelajaran', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(thrown.detail.code, '23503');
    assert.strictEqual(thrown.detail.row, 8);
    assert.strictEqual(thrown.detail.column, 'mata_pelajaran');
    assert.strictEqual(thrown.detail.receivedValue, 'Astronomi Gaib');
    assert.strictEqual(thrown.detail.referenceTable, 'data_mapel');
    assert.ok(thrown.message.includes('Baris 8: Mata pelajaran "Astronomi Gaib" belum terdaftar di Data Mapel.'));
  });

  await test('1.7: jadwal_pelajaran rejects missing class with exact row, column, and reference table', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { hari: 'Senin', nama_guru: 'Budi Santoso', mata_pelajaran: 'Matematika', kelas: 'Kelas NonExistent 99', _csvRowNumber: 9 }
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'jadwal_pelajaran', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(thrown.detail.code, '23503');
    assert.strictEqual(thrown.detail.row, 9);
    assert.strictEqual(thrown.detail.column, 'kelas');
    assert.strictEqual(thrown.detail.receivedValue, 'Kelas NonExistent 99');
    assert.strictEqual(thrown.detail.referenceTable, 'data_kelas');
    assert.ok(thrown.message.includes('Baris 9: Kelas "Kelas NonExistent 99" belum terdaftar di Data Kelas.'));
  });

  await test('1.8: jadwal_pelajaran detects combined teacher + mapel + class failure on a single row', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { hari: 'Selasa', nama_guru: 'Guru X', mata_pelajaran: 'Mapel Y', kelas: 'Kelas Z', _csvRowNumber: 15 }
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'jadwal_pelajaran', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.ok(thrown.message.includes('ditemukan 3 masalah'), 'Must report 3 relational failures for the row');
    assert.ok(thrown.message.includes('Guru "Guru X"'), 'Must mention invalid teacher');
    assert.ok(thrown.message.includes('Mata pelajaran "Mapel Y"'), 'Must mention invalid mapel');
    assert.ok(thrown.message.includes('Kelas "Kelas Z"'), 'Must mention invalid class');
  });

  await test('1.9: wali_kelas rejects missing teacher with exact diagnostic message', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { kelas: 'X Merdeka', nama_guru: 'Guru Yang Tidak Ada', nip: '-', tahun_ajaran: '2024/2025', _csvRowNumber: 4 }
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'wali_kelas', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(thrown.detail.code, '23503');
    assert.strictEqual(thrown.detail.row, 4);
    assert.strictEqual(thrown.detail.column, 'nama_guru');
    assert.strictEqual(thrown.detail.receivedValue, 'Guru Yang Tidak Ada');
    assert.strictEqual(thrown.detail.referenceTable, 'data_guru');
    assert.ok(thrown.message.includes('Baris 4: Guru "Guru Yang Tidak Ada" belum terdaftar di Data Guru.'));
  });

  await test('1.10: wali_kelas rejects missing class with exact diagnostic message', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { kelas: 'Kelas Antah Berantah', nama_guru: 'Budi Santoso', nip: '198001012010011001', tahun_ajaran: '2024/2025', _csvRowNumber: 6 }
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'wali_kelas', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(thrown.detail.code, '23503');
    assert.strictEqual(thrown.detail.row, 6);
    assert.strictEqual(thrown.detail.column, 'kelas');
    assert.strictEqual(thrown.detail.receivedValue, 'Kelas Antah Berantah');
    assert.strictEqual(thrown.detail.referenceTable, 'data_kelas');
    assert.ok(thrown.message.includes('Baris 6: Kelas "Kelas Antah Berantah" belum terdaftar di Data Kelas.'));
  });

  await test('1.11: data_siswa rejects student when class is empty string or only whitespace', async () => {
    const mockDb = createMockSupabase();
    const rows = [
      { nisn: '1001', nama_siswa: 'Candra', kelas: '   ', _csvRowNumber: 11 }
    ];

    let thrown: any = null;
    try {
      await validateRelationalDependencies(mockDb, rows, 'data_siswa', schoolId);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown instanceof MasterDataValidationError, 'Must reject whitespace class');
    assert.strictEqual(thrown.detail.row, 11);
    assert.strictEqual(thrown.detail.column, 'kelas');
  });

  // ============================================================================
  // SECTION 2: GURU_ID AND NIP AUTO-POPULATION IN WALI KELAS
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 2: Guru_ID & NIP Auto-Population in Wali Kelas ---${RESET}`);

  await test('2.1: wali_kelas auto-populates guru_id and nip when matching by teacher name', async () => {
    const mockDb = createMockSupabase({
      teachers: [
        { id: 'uuid-guru-budi-123', nama_guru: 'Budi Santoso', nip: '198001012010011001' }
      ],
      classes: [{ id: 'c1', nama_kelas: 'X Merdeka' }]
    });

    const rows = [
      { kelas: 'X Merdeka', nama_guru: 'Budi Santoso', nip: '', tahun_ajaran: '2024/2025', _csvRowNumber: 2 }
    ];

    await validateRelationalDependencies(mockDb, rows, 'wali_kelas', schoolId);

    assert.strictEqual((rows[0] as any).guru_id, 'uuid-guru-budi-123', 'guru_id must be populated from data_guru');
    assert.strictEqual((rows[0] as any).nip, '198001012010011001', 'nip must be populated from data_guru if empty');
  });

  await test('2.2: wali_kelas auto-populates guru_id by NIP even if teacher name has academic title variations', async () => {
    const mockDb = createMockSupabase({
      teachers: [
        { id: 'uuid-guru-siti-456', nama_guru: 'Siti Aminah, M.Pd.', nip: '198502022012022002' }
      ],
      classes: [{ id: 'c1', nama_kelas: 'X Merdeka' }]
    });

    const rows = [
      {
        kelas: 'X Merdeka',
        nama_guru: 'Siti Aminah', // Name without title
        nip: '198502022012022002', // Matches by NIP!
        tahun_ajaran: '2024/2025',
        _csvRowNumber: 3
      }
    ];

    await validateRelationalDependencies(mockDb, rows, 'wali_kelas', schoolId);

    assert.strictEqual((rows[0] as any).guru_id, 'uuid-guru-siti-456', 'guru_id must be resolved via NIP match');
  });

  await test('2.3: wali_kelas preserves pre-existing guru_id and does not corrupt it', async () => {
    const mockDb = createMockSupabase({
      teachers: [
        { id: 'uuid-guru-budi-123', nama_guru: 'Budi Santoso', nip: '198001012010011001' }
      ],
      classes: [{ id: 'c1', nama_kelas: 'X Merdeka' }]
    });

    const rows = [
      {
        kelas: 'X Merdeka',
        nama_guru: 'Budi Santoso',
        guru_id: 'existing-custom-uuid',
        nip: '198001012010011001',
        tahun_ajaran: '2024/2025',
        _csvRowNumber: 4
      }
    ];

    await validateRelationalDependencies(mockDb, rows, 'wali_kelas', schoolId);

    assert.strictEqual((rows[0] as any).guru_id, 'existing-custom-uuid', 'Existing guru_id must be preserved');
  });

  await test('2.4: wali_kelas auto-populates academic year (tahun_ajaran) when omitted in CSV', () => {
    const csv = 'kelas,nama_guru,nip\nX Merdeka,Budi Santoso,19800101';
    const parsed = parseAndValidateMasterCsv(csv, 'wali_kelas', dummyUser);
    assert.ok(parsed[0].tahun_ajaran && parsed[0].tahun_ajaran.includes('/'), 'tahun_ajaran must be populated automatically');
  });

  // ============================================================================
  // SECTION 3: CSV TEMPLATE HEADERS MATCH DATABASE SCHEMA COLUMNS
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 3: CSV Template Headers vs DB Schema Alignment ---${RESET}`);

  const adminDataPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminDataCode = fs.readFileSync(adminDataPath, 'utf8');

  // Database Schema definitions verified against SETUP_NEW_SCHOOL_TEMPLATE.sql & migrations
  const DATABASE_TABLE_COLUMNS: Record<string, string[]> = {
    Data_Siswa: ['id', 'sekolah_id', 'nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu', 'qr_code'],
    Data_Kelas: ['id', 'sekolah_id', 'nama_kelas', 'tingkat', 'jurusan'],
    Data_Mapel: ['id', 'sekolah_id', 'nama_mata_pelajaran', 'kategori', 'kelompok', 'urutan'],
    Data_Guru: ['id', 'sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email', 'user_id', 'wajib_hadir_hanya_mengajar'],
    Jadwal_Pelajaran: ['id', 'sekolah_id', 'user_id', 'hari', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_ke', 'jam_mulai', 'jam_selesai'],
    Wali_Kelas: ['id', 'sekolah_id', 'kelas', 'guru_id', 'nama_guru', 'nip', 'tahun_ajaran'],
    Pengguna: ['id', 'username', 'password', 'nama', 'role', 'sekolah_id'],
    Kalender_Pendidikan: ['id', 'sekolah_id', 'tanggal', 'keterangan', 'tipe'],
    sistem_blok: ['id', 'sekolah_id', 'nama_kegiatan', 'deskripsi', 'tanggal_mulai', 'tanggal_selesai', 'tipe_target', 'target_angkatan', 'target_kelas', 'target_guru_id', 'target_guru_nama', 'is_full_day', 'jam_mulai', 'jam_selesai']
  };

  // Extract templates object from AdminDataView.tsx source AST
  const tplRegex = /const\s+templates:\s*Record<string,\s*\{[^}]+\}>\s*=\s*\{([\s\S]*?)\n\s*\};/;
  const tplMatch = adminDataCode.match(tplRegex);
  assert.ok(tplMatch, 'templates dictionary must exist in AdminDataView.tsx');

  const templatesAst: Record<string, { filename: string; headers: string[]; sample: string[] }> = {};
  const blockMatches = tplMatch[1].matchAll(/(\w+):\s*\{[\s\S]*?filename:\s*'([^']+)'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/g);

  for (const m of blockMatches) {
    const key = m[1];
    const filename = m[2];
    const headers = m[3].split(',').map(s => s.replace(/['"\s]/g, '').trim()).filter(Boolean);
    const sample = m[4].split(',').map(s => s.replace(/['"]/g, '').trim());
    templatesAst[key] = { filename, headers, sample };
  }

  await test('3.1: All 9 templates defined in AdminDataView exist and contain valid filenames', () => {
    const expectedKeys = Object.keys(DATABASE_TABLE_COLUMNS);
    for (const key of expectedKeys) {
      assert.ok(templatesAst[key], `Template ${key} must be defined in AdminDataView.tsx`);
      assert.ok(templatesAst[key].filename.endsWith('.csv'), `Template ${key} must have .csv filename`);
      assert.ok(templatesAst[key].headers.length >= 2, `Template ${key} must have at least 2 headers`);
    }
  });

  await test('3.2: Every header in each template corresponds strictly to a recognized DB schema column', () => {
    for (const [key, tpl] of Object.entries(templatesAst)) {
      const allowedDbColumns = DATABASE_TABLE_COLUMNS[key];
      assert.ok(allowedDbColumns, `Allowed DB columns must exist for ${key}`);

      for (const h of tpl.headers) {
        assert.ok(
          allowedDbColumns.includes(h),
          `Template [${key}] header "${h}" is NOT a recognized column in database table schema (${allowedDbColumns.join(', ')})`
        );
      }
    }
  });

  await test('3.3: Templates for 8 non-mapel entities roundtrip through parseAndValidateMasterCsv without errors', () => {
    const tableMapping: Record<string, string> = {
      Data_Siswa: 'data_siswa',
      Data_Kelas: 'data_kelas',
      Data_Guru: 'data_guru',
      Jadwal_Pelajaran: 'jadwal_pelajaran',
      Wali_Kelas: 'wali_kelas',
      Pengguna: 'users',
      Kalender_Pendidikan: 'kalender_pendidikan',
      sistem_blok: 'sistem_blok'
    };

    for (const [tplKey, dbTable] of Object.entries(tableMapping)) {
      const tpl = templatesAst[tplKey];
      assert.ok(tpl, `Template must exist for ${tplKey}`);

      // Construct CSV from template headers and sample row
      const sampleRow = tpl.headers.map((h) => {
        if (h === 'sekolah_id') return schoolId;
        if (h === 'id') return 'MP-99';
        if (h === 'nama_guru') return 'Pak Guru Asli';
        if (h === 'nama_siswa') return 'Siswa Asli';
        if (h === 'nama_mata_pelajaran' || h === 'mata_pelajaran') return 'Informatika';
        if (h === 'nama_kelas' || h === 'kelas') return 'X Merdeka';
        if (h === 'hari') return 'Senin';
        if (h === 'tanggal') return '2026-10-15';
        if (h === 'keterangan') return 'Libur Nasional';
        if (h === 'username') return 'guru_asli_sipjam';
        if (h === 'nama_kegiatan') return 'Ujian Sekolah';
        if (h === 'tanggal_mulai') return '2026-11-01';
        if (h === 'tanggal_selesai') return '2026-11-05';
        if (h === 'tipe_target') return 'sekolah';
        return `val_${h}`;
      });

      const csvContent = `${tpl.headers.join(',')}\n${sampleRow.join(',')}`;

      const parsed = parseAndValidateMasterCsv(csvContent, dbTable, dummyUser);
      assert.strictEqual(parsed.length, 1, `Template ${tplKey} must yield exactly 1 parsed row`);

      // Verify template headers are present in parsed object
      for (const h of tpl.headers) {
        assert.ok(
          parsed[0][h] !== undefined,
          `Template [${tplKey}] column "${h}" was unexpectedly dropped or missing after parseAndValidateMasterCsv`
        );
      }
    }
  });

  await test('3.4: Special schema invariants: Guru requires sekolah_id; Jadwal and Kalender omit client-supplied id', () => {
    // Data_Guru strictly includes sekolah_id
    assert.ok(
      templatesAst['Data_Guru'].headers.includes('sekolah_id'),
      'Data_Guru template must strictly include sekolah_id'
    );

    // Jadwal_Pelajaran and Kalender_Pendidikan must NOT include 'id'
    assert.ok(
      !templatesAst['Jadwal_Pelajaran'].headers.includes('id'),
      'Jadwal_Pelajaran template must NOT include client id'
    );
    assert.ok(
      !templatesAst['Kalender_Pendidikan'].headers.includes('id'),
      'Kalender_Pendidikan template must NOT include client id'
    );
  });

  await test('3.5: DEFECT-01: Data_Mapel template column "kelompok" is preserved without collision with "kategori"', () => {
    const mapelTpl = templatesAst['Data_Mapel'];
    assert.ok(mapelTpl, 'Data_Mapel template must exist');
    assert.ok(mapelTpl.headers.includes('kategori'), 'Data_Mapel template must have kategori header');
    assert.ok(mapelTpl.headers.includes('kelompok'), 'Data_Mapel template must have kelompok header');

    const csvContent = `${mapelTpl.headers.join(',')}\nMP-01,Matematika Wajib,Umum,Wajib`;
    const parsed = parseAndValidateMasterCsv(csvContent, 'data_mapel', dummyUser);

    assert.strictEqual(
      parsed[0].kategori,
      'Umum',
      'Defect in dataIntegrityGuard.ts line 801: "kategori" was overwritten by "kelompok" value!'
    );
    assert.strictEqual(
      parsed[0].kelompok,
      'Wajib',
      'Defect in dataIntegrityGuard.ts line 801: normalizeCsvHeaders unconditionally aliases "kelompok" to "kategori", causing "kelompok" to be dropped from parsed row!'
    );
  });

  // ============================================================================
  // SECTION 4: ZERO DATABASE POLLUTION & END-TO-END FLOW VERIFICATION
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 4: Zero Database Pollution & Stage Guarantees ---${RESET}`);

  await test('4.1: importMasterDataFromCsv aborts before database upsert when relational checks fail', async () => {
    let upsertCalled = false;
    const mockDb = createMockSupabase({
      upsertSpy: () => {
        upsertCalled = true;
      }
    });

    // Use a real/realistic teacher name that is not in the database (bypasses anti-dummy check)
    const invalidScheduleCsv = [
      'hari,nama_guru,mata_pelajaran,kelas',
      'Senin,Bambang Sudarsono,Informatika,X Merdeka'
    ].join('\n');

    const stagesReported: string[] = [];

    let errorThrown: any = null;
    try {
      await importMasterDataFromCsv(
        mockDb,
        invalidScheduleCsv,
        'jadwal_pelajaran',
        dummyUser,
        (p) => {
          stagesReported.push(p.stage);
        }
      );
    } catch (err) {
      errorThrown = err;
    }

    assert.ok(errorThrown instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(upsertCalled, false, 'CRITICAL: Database upsert must NEVER be called when relational validation fails!');
    assert.ok(stagesReported.some(s => s.includes('Membaca')), 'Must report Membaca stage');
    assert.ok(stagesReported.some(s => s.includes('Memvalidasi')), 'Must report Memvalidasi stage');
    assert.ok(stagesReported.some(s => s.includes('Memeriksa dependensi relasional')), 'Must report Memeriksa stage');
    assert.ok(!stagesReported.some(s => s.includes('Mengunggah baris')), 'Must NOT reach Mengunggah batch stage');
  });

  await test('4.2: importMasterDataFromCsv completes all stages when relational dependencies are valid', async () => {
    let upsertedCount = 0;
    const mockDb = createMockSupabase({
      upsertSpy: (batch) => {
        upsertedCount += batch.length;
      }
    });

    const validScheduleCsv = [
      'hari,nama_guru,mata_pelajaran,kelas',
      'Senin,Budi Santoso,Informatika,X Merdeka',
      'Selasa,Budi Santoso,Informatika,XI RPL 1'
    ].join('\n');

    const progressReports: number[] = [];

    const res = await importMasterDataFromCsv(
      mockDb,
      validScheduleCsv,
      'jadwal_pelajaran',
      dummyUser,
      (p) => {
        progressReports.push(p.percentage);
      }
    );

    assert.strictEqual(res.count, 2, 'Must import 2 rows');
    assert.strictEqual(upsertedCount, 2, 'Must upsert 2 rows');
    assert.strictEqual(progressReports[0], 5, 'Starts at 5%');
    assert.strictEqual(progressReports[progressReports.length - 1], 100, 'Finishes at 100%');
  });

  // ============================================================================
  // SECTION 5: GRANULAR ERROR TRANSLATION ACROSS ALL PG ERROR CODES
  // ============================================================================
  console.log(`\n${BOLD}--- SECTION 5: Granular Error Translation Robustness ---${RESET}`);

  await test('5.1: translateDatabaseError handles 23503 on unmapped table gracefully', () => {
    const batch = [{ custom_field: 'val_123', _csvRowNumber: 11 }];
    const pgErr = {
      code: '23503',
      message: 'foreign key constraint violation',
      details: 'Key (custom_field)=(val_123) is not present in table "custom_lookup".'
    };

    const res = translateDatabaseError(pgErr, batch, 'custom_table');
    assert.strictEqual(res.row, 11);
    assert.strictEqual(res.column, 'custom_field');
    assert.strictEqual(res.receivedValue, 'val_123');
    assert.strictEqual(res.referenceTable, 'custom_lookup');
    assert.ok(res.message.includes('Baris 11:'));
    assert.ok(res.message.includes('custom_lookup'));
  });

  await test('5.2: translateDatabaseError handles 23502 (Not Null) on arbitrary column', () => {
    const batch = [
      { col_a: 'ok', col_b: '', _csvRowNumber: 14 }
    ];
    const pgErr = {
      code: '23502',
      message: 'null value in column "col_b" violates not-null constraint'
    };

    const res = translateDatabaseError(pgErr, batch, 'data_custom');
    assert.strictEqual(res.row, 14);
    assert.strictEqual(res.column, 'col_b');
    assert.ok(res.message.includes('Baris 14:'));
    assert.ok(res.message.includes('kolom wajib yang bernilai kosong'));
  });

  await test('5.3: translateDatabaseError handles 23505 (Unique Constraint) on multi-tenant composite key', () => {
    const batch = [
      { sekolah_id: schoolId, nisn: '011223344', _csvRowNumber: 22 }
    ];
    const pgErr = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "data_siswa_sekolah_id_nisn_key"',
      details: `Key (sekolah_id, nisn)=(${schoolId}, 011223344) already exists.`
    };

    const res = translateDatabaseError(pgErr, batch, 'data_siswa');
    assert.strictEqual(res.row, 22);
    assert.strictEqual(res.column, 'nisn');
    assert.strictEqual(res.receivedValue, '011223344');
    assert.ok(res.message.includes('Baris 22:'));
    assert.ok(res.message.includes('terdapat data duplikat'));
  });

  await test('5.4: translateDatabaseError handles 42501 (RLS Policy Rejection)', () => {
    const batch = [{ _csvRowNumber: 1 }];
    const pgErr = {
      code: '42501',
      message: 'new row violates row-level security policy for table "data_guru"'
    };

    const res = translateDatabaseError(pgErr, batch, 'data_guru');
    assert.strictEqual(res.code, '42501');
    assert.strictEqual(res.row, 1);
    assert.ok(res.message.includes('Baris 1: Akses ditolak oleh kebijakan keamanan data sekolah (RLS)'));
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}  CHALLENGER ADVERSARIAL SUITE RESULTS: ${passedTests} / ${totalTests} PASSED${RESET}`);
  if (failedTests > 0) {
    console.log(`${RED}${BOLD}  ${failedTests} ADVERSARIAL CHECKS FAILED!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}  ALL ${totalTests} ADVERSARIAL TESTS PASSED PERFECTLY WITH ZERO DEFECTS!${RESET}`);
    console.log(`${BOLD}========================================================================${RESET}\n`);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
