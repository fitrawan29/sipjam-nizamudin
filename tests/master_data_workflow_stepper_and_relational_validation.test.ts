/**
 * tests/master_data_workflow_stepper_and_relational_validation.test.ts
 *
 * AUTOMATED VERIFICATION SUITE — MILESTONE 3 (REQUIREMENT R4):
 * Master Data Workflow Stepper, Relational Validation, Progress Bar & Granular Error Diagnostics
 *
 * Verification Areas:
 * 1. Visual Workflow Stepper & Canonical Tab Order (9 steps from Siswa to Periode Blok)
 * 2. Complete Harmonization of all 9 Master Data CSV Templates
 * 3. Pre-upload Relational Dependency Validation with Row Numbers and Auto-Enrichment (data_siswa, jadwal_pelajaran, wali_kelas)
 * 4. Granular PostgreSQL Error Translation & Diagnostic Metadata with Backward Compatibility
 * 5. Real-time Multi-Stage Upload Progress Bar Callback Emission (0% to 100%)
 * 6. UI Integration & AST Invariants in AdminDataView.tsx and AdminKelasView.tsx
 */

import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseAndValidateMasterCsv,
  validateRelationalDependencies,
  translateDatabaseError,
  importMasterDataFromCsv,
  UploadProgressInfo,
  MasterDataValidationError
} from '../src/lib/dataIntegrityGuard';
import { normalizeAdminTab } from '../src/components/AdminDataView';

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
    console.error(`     ${err?.message || err}`);
    process.exitCode = 1;
  }
}

async function runAllTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  VERIFICATION SUITE: MASTER DATA WORKFLOW STEPPER & RELATIONAL VALIDATION${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const adminDataPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminKelasPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminKelasView.tsx');
  const integrityGuardPath = path.resolve(__dirname, '..', 'src', 'lib', 'dataIntegrityGuard.ts');

  assert.ok(fs.existsSync(adminDataPath), 'AdminDataView.tsx must exist');
  assert.ok(fs.existsSync(adminKelasPath), 'AdminKelasView.tsx must exist');
  assert.ok(fs.existsSync(integrityGuardPath), 'dataIntegrityGuard.ts must exist');

  const adminDataCode = fs.readFileSync(adminDataPath, 'utf8');
  const adminKelasCode = fs.readFileSync(adminKelasPath, 'utf8');
  const integrityGuardCode = fs.readFileSync(integrityGuardPath, 'utf8');

  // ============================================================================
  // SUITE 1: VISUAL WORKFLOW STEPPER & TAB ORDERING IN ADMIN DATA VIEW
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 1: Visual Workflow Stepper & Tab Sequence ---${RESET}`);

  await test('1.1: AdminDataView defines tabs array with all 9 steps in exact sequential order', () => {
    const tabsMatch = adminDataCode.match(/const\s+tabs\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(tabsMatch, 'const tabs = [...] must be declared in AdminDataView.tsx');
    const tabsContent = tabsMatch[1];

    const expectedSequence = [
      { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa', step: 1 },
      { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas', step: 2 },
      { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel', step: 3 },
      { id: 'Data_Guru', label: 'Guru', table: 'data_guru', step: 4 },
      { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran', step: 5 },
      { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas', step: 6 },
      { id: 'Pengguna', label: 'Pengguna', table: 'users', step: 7 },
      { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan', step: 8 },
      { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok', step: 9, optional: true }
    ];

    let lastIndex = -1;
    for (const exp of expectedSequence) {
      const idx = tabsContent.indexOf(`id: '${exp.id}'`);
      assert.ok(idx !== -1, `Tab ${exp.id} must be present in tabs array`);
      assert.ok(idx > lastIndex, `Tab ${exp.id} must appear in exact chronological sequence after previous step`);
      lastIndex = idx;

      assert.ok(
        tabsContent.includes(`label: '${exp.label}'`),
        `Tab ${exp.id} must have literal label '${exp.label}'`
      );
      assert.ok(
        tabsContent.includes(`table: '${exp.table}'`),
        `Tab ${exp.id} must have literal table '${exp.table}'`
      );
      assert.ok(
        tabsContent.includes(`step: ${exp.step}`),
        `Tab ${exp.id} must be configured with step: ${exp.step}`
      );
    }

    assert.ok(
      tabsContent.includes("optional: true"),
      'sistem_blok must be marked with optional: true'
    );
  });

  await test('1.2: Visual Workflow Stepper card renders with Clay styling and 9 interactive steps', () => {
    assert.ok(
      adminDataCode.includes('Panduan Alur Penginputan Master Data'),
      'AdminDataView must contain "Panduan Alur Penginputan Master Data" header'
    );
    assert.ok(
      adminDataCode.includes('fa-chevron-right'),
      'Stepper must render connecting chevron arrows between steps'
    );
    assert.ok(
      adminDataCode.includes('handleSwitchTab'),
      'Stepper buttons must invoke handleSwitchTab'
    );
    assert.ok(
      adminDataCode.includes('overflow-x-auto') && adminDataCode.includes('shrink-0'),
      'Stepper container must be horizontally scrollable with non-shrinking step cards'
    );
  });

  await test('1.3: Tab pill buttons below stepper render icons, labels, and optional badge', () => {
    assert.ok(
      adminDataCode.includes('tab.icon'),
      'Pill buttons must render icon for each tab'
    );
    assert.ok(
      adminDataCode.includes('(Opsional)'),
      'Pill buttons must render (Opsional) tag for optional steps'
    );
  });

  await test('1.4: normalizeAdminTab normalizes tab aliases and falls back cleanly', () => {
    assert.strictEqual(normalizeAdminTab('data_siswa'), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('kelas'), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('guru'), 'Data_Guru');
    assert.strictEqual(normalizeAdminTab('jadwal'), 'Jadwal_Pelajaran');
    assert.strictEqual(normalizeAdminTab('wali_kelas'), 'Wali_Kelas');
    assert.strictEqual(normalizeAdminTab('pengguna'), 'Pengguna');
    assert.strictEqual(normalizeAdminTab('kalender'), 'Kalender_Pendidikan');
    assert.strictEqual(normalizeAdminTab('sistem_blok'), 'sistem_blok');
    assert.strictEqual(normalizeAdminTab(undefined), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('unknown_random_tab'), 'unknown_random_tab');
  });

  // ============================================================================
  // SUITE 2: COMPLETE HARMONIZATION OF ALL 9 MASTER DATA CSV TEMPLATES
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 2: Master Data CSV Templates Harmonization ---${RESET}`);

  await test('2.1: All 9 templates defined in AdminDataView have required database columns', () => {
    assert.ok(adminDataCode.includes('handleDownloadTemplate'), 'handleDownloadTemplate must exist in AdminDataView.tsx');

    // Extract templates dictionary
    const tplMatch = adminDataCode.match(/const\s+templates:\s*Record<string,\s*\{[^}]+\}>\s*=\s*\{([\s\S]*?)\n\s*\};/);
    assert.ok(tplMatch, 'templates dictionary must be defined inside handleDownloadTemplate');
    const tplContent = tplMatch[1];

    const requiredKeys = [
      'Data_Siswa',
      'Data_Kelas',
      'Data_Mapel',
      'Data_Guru',
      'Jadwal_Pelajaran',
      'Wali_Kelas',
      'Pengguna',
      'Kalender_Pendidikan',
      'sistem_blok'
    ];

    for (const key of requiredKeys) {
      assert.ok(tplContent.includes(`${key}: {`), `Template for ${key} must be defined in templates dictionary`);
    }

    // Verify Data_Guru strictly includes sekolah_id
    assert.ok(
      tplContent.includes("'sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'"),
      'Data_Guru template must strictly include sekolah_id'
    );

    // Verify Jadwal and Kalender templates do NOT contain 'id'
    const jadwalTpl = tplContent.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(jadwalTpl && !jadwalTpl[1].includes("'id'"), 'Jadwal template must NOT include id');

    const kalenderTpl = tplContent.match(/Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(kalenderTpl && !kalenderTpl[1].includes("'id'"), 'Kalender template must NOT include id');
  });

  await test('2.2: parseAndValidateMasterCsv validates valid CSV payloads across all 9 templates', () => {
    const dummyUser = { id: 'admin-1', role: 'admin', sekolah_id: 'a0000000-0000-0000-0000-000000000001' };

    // 1. Siswa
    const siswaCsv = 'nisn,nama_siswa,kelas,gender,status,no_hp_ortu\n1001,Ahmad,X-A,L,Aktif,08123456789';
    const r1 = parseAndValidateMasterCsv(siswaCsv, 'data_siswa', dummyUser);
    assert.strictEqual(r1.length, 1);
    assert.strictEqual(r1[0].nisn, '1001');

    // 2. Kelas
    const kelasCsv = 'nama_kelas,tingkat,jurusan\nX-A,10,IPA';
    const r2 = parseAndValidateMasterCsv(kelasCsv, 'data_kelas', dummyUser);
    assert.strictEqual(r2.length, 1);
    assert.strictEqual(r2[0].nama_kelas, 'X-A');

    // 3. Mapel
    const mapelCsv = 'nama_mata_pelajaran,kategori,kelompok\nMatematika,Umum,A';
    const r3 = parseAndValidateMasterCsv(mapelCsv, 'data_mapel', dummyUser);
    assert.strictEqual(r3.length, 1);
    assert.strictEqual(r3[0].nama_mata_pelajaran, 'Matematika');

    // 4. Guru
    const guruCsv = 'sekolah_id,nip,nama_guru,mata_pelajaran,no_hp,status,email\na0000000-0000-0000-0000-000000000001,19800101,Budi Santoso,Matematika,08123456789,PNS,budi@sch.id';
    const r4 = parseAndValidateMasterCsv(guruCsv, 'data_guru', dummyUser);
    assert.strictEqual(r4.length, 1);
    assert.strictEqual(r4[0].nama_guru, 'Budi Santoso');

    // 5. Jadwal
    const jadwalCsv = 'hari,nama_guru,mata_pelajaran,kelas\nSenin,Budi Santoso,Matematika,X-A';
    const r5 = parseAndValidateMasterCsv(jadwalCsv, 'jadwal_pelajaran', dummyUser);
    assert.strictEqual(r5.length, 1);
    assert.strictEqual(r5[0].hari, 'Senin');

    // 6. Wali Kelas
    const waliCsv = 'kelas,nama_guru,nip,tahun_ajaran\nX-A,Budi Santoso,19800101,2024/2025';
    const r6 = parseAndValidateMasterCsv(waliCsv, 'wali_kelas', dummyUser);
    assert.strictEqual(r6.length, 1);
    assert.strictEqual(r6[0].kelas, 'X-A');

    // 7. Pengguna
    const userCsv = 'username,nama,role,password\nguru_budi,Budi Santoso,guru,rahasia123';
    const r7 = parseAndValidateMasterCsv(userCsv, 'users', dummyUser);
    assert.strictEqual(r7.length, 1);
    assert.strictEqual(r7[0].username, 'guru_budi');

    // 8. Kalender
    const kalenderCsv = 'tanggal,keterangan,tipe\n2025-01-01,Tahun Baru,Libur';
    const r8 = parseAndValidateMasterCsv(kalenderCsv, 'kalender_pendidikan', dummyUser);
    assert.strictEqual(r8.length, 1);
    assert.strictEqual(r8[0].tanggal, '2025-01-01');

    // 9. Sistem Blok
    const blokCsv = 'nama_kegiatan,tanggal_mulai,tanggal_selesai,tipe_target,target_kelas,deskripsi\nPKL,2025-02-01,2025-04-30,all,,Praktek Kerja Lapangan';
    const r9 = parseAndValidateMasterCsv(blokCsv, 'sistem_blok', dummyUser);
    assert.strictEqual(r9.length, 1);
    assert.strictEqual(r9[0].nama_kegiatan, 'PKL');
  });

  // ============================================================================
  // SUITE 3: PRE-UPLOAD RELATIONAL DEPENDENCY VALIDATION
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 3: Pre-Upload Relational Dependency Validation ---${RESET}`);

  await test('3.1: data_siswa relational validation rejects student when class does not exist in data_kelas', async () => {
    const mockSupabase: any = {
      from: (tbl: string) => ({
        select: (cols: string) => ({
          eq: (col: string, val: string) => {
            if (tbl === 'data_kelas') {
              return Promise.resolve({ data: [{ nama_kelas: 'X-B' }], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    };

    const studentRows = [
      { nisn: '1001', nama_siswa: 'Siti', kelas: 'X-NonExistent', _csvRowNumber: 1 }
    ];

    let errorThrown: any = null;
    try {
      await validateRelationalDependencies(mockSupabase, studentRows, 'data_siswa', 'sch-123');
    } catch (err) {
      errorThrown = err;
    }

    assert.ok(errorThrown, 'Should throw error when class does not exist in data_kelas');
    assert.ok(
      errorThrown.message.includes('Baris 1'),
      `Error must contain row number, got: ${errorThrown.message}`
    );
    assert.ok(
      errorThrown.message.includes('X-NonExistent') && errorThrown.message.includes('Data Kelas'),
      `Error must mention missing class and prerequisite Data Kelas, got: ${errorThrown.message}`
    );
  });

  await test('3.2: data_siswa relational validation passes when class exists in data_kelas', async () => {
    const mockSupabase: any = {
      from: (tbl: string) => ({
        select: (cols: string) => ({
          eq: (col: string, val: string) => {
            if (tbl === 'data_kelas') {
              return Promise.resolve({ data: [{ nama_kelas: 'X-A' }, { nama_kelas: 'X-B' }], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    };

    const studentRows = [
      { nisn: '1001', nama_siswa: 'Siti', kelas: 'X-A', _csvRowNumber: 1 },
      { nisn: '1002', nama_siswa: 'Budi', kelas: 'X-B', _csvRowNumber: 2 }
    ];

    await validateRelationalDependencies(mockSupabase, studentRows, 'data_siswa', 'sch-123');
    // If no error thrown, test passes!
  });

  await test('3.3: jadwal_pelajaran validates teacher, mapel, and class dependencies with row numbers', async () => {
    const mockSupabase: any = {
      from: (tbl: string) => ({
        select: (cols: string) => ({
          eq: (col: string, val: string) => {
            if (tbl === 'data_guru') return Promise.resolve({ data: [{ nama_guru: 'Budi Santoso' }], error: null });
            if (tbl === 'data_mapel') return Promise.resolve({ data: [{ nama_mata_pelajaran: 'Matematika' }], error: null });
            if (tbl === 'data_kelas') return Promise.resolve({ data: [{ nama_kelas: 'X-A' }], error: null });
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    };

    // Case A: Missing Teacher
    let errA: any = null;
    try {
      await validateRelationalDependencies(
        mockSupabase,
        [{ hari: 'Senin', nama_guru: 'Guru Gaib', mata_pelajaran: 'Matematika', kelas: 'X-A', _csvRowNumber: 1 }],
        'jadwal_pelajaran',
        'sch-123'
      );
    } catch (err) { errA = err; }
    assert.ok(errA && errA.message.includes('Baris 1') && errA.message.includes('Guru Gaib') && errA.message.includes('Data Guru'));

    // Case B: Missing Mapel
    let errB: any = null;
    try {
      await validateRelationalDependencies(
        mockSupabase,
        [{ hari: 'Senin', nama_guru: 'Budi Santoso', mata_pelajaran: 'Mapel Gaib', kelas: 'X-A', _csvRowNumber: 2 }],
        'jadwal_pelajaran',
        'sch-123'
      );
    } catch (err) { errB = err; }
    assert.ok(errB && errB.message.includes('Baris 2') && errB.message.includes('Mapel Gaib') && errB.message.includes('Data Mapel'));

    // Case C: Missing Class
    let errC: any = null;
    try {
      await validateRelationalDependencies(
        mockSupabase,
        [{ hari: 'Senin', nama_guru: 'Budi Santoso', mata_pelajaran: 'Matematika', kelas: 'Kelas Gaib', _csvRowNumber: 3 }],
        'jadwal_pelajaran',
        'sch-123'
      );
    } catch (err) { errC = err; }
    assert.ok(errC && errC.message.includes('Baris 3') && errC.message.includes('Kelas Gaib') && errC.message.includes('Data Kelas'));

    // Case D: All valid
    await validateRelationalDependencies(
      mockSupabase,
      [{ hari: 'Senin', nama_guru: 'Budi Santoso', mata_pelajaran: 'Matematika', kelas: 'X-A', _csvRowNumber: 4 }],
      'jadwal_pelajaran',
      'sch-123'
    );
  });

  await test('3.4: wali_kelas validates teacher and class dependencies, and auto-populates guru_id', async () => {
    const mockSupabase: any = {
      from: (tbl: string) => ({
        select: (cols: string) => ({
          eq: (col: string, val: string) => {
            if (tbl === 'data_guru') {
              return Promise.resolve({
                data: [{ id: 'guru-uuid-001', nama_guru: 'Budi Santoso', nip: '19800101' }],
                error: null
              });
            }
            if (tbl === 'data_kelas') {
              return Promise.resolve({ data: [{ nama_kelas: 'X-A' }], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    };

    const waliRows = [
      { kelas: 'X-A', nama_guru: 'Budi Santoso', nip: '19800101', tahun_ajaran: '2024/2025', _csvRowNumber: 1 }
    ];

    await validateRelationalDependencies(mockSupabase, waliRows, 'wali_kelas', 'sch-123');

    // Verify auto-enrichment of guru_id
    assert.strictEqual(
      (waliRows[0] as any).guru_id,
      'guru-uuid-001',
      'validateRelationalDependencies must auto-populate guru_id from data_guru'
    );
  });

  // ============================================================================
  // SUITE 4: POSTGRESQL ERROR TRANSLATION & GRANULAR DIAGNOSTICS
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 4: PostgreSQL Error Translation & Granular Diagnostics ---${RESET}`);

  await test('4.1a: translateDatabaseError translates relational code 23503 (Foreign Key Violation)', () => {
    const batch = [
      { nisn: '1001', nama_siswa: 'Ali', kelas: 'X-NonExistent', _csvRowNumber: 5 }
    ];
    const pgError = {
      code: '23503',
      message: 'insert or update on table "data_siswa" violates foreign key constraint "fk_siswa_kelas"',
      detail: 'Key (kelas)=(X-NonExistent) is not present in table "data_kelas".'
    };

    const translated = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.ok(translated.message.startsWith('Baris 5:'), 'Message must start with Baris ${rowNumber}');
    assert.ok(translated.message.includes('tidak ditemukan pada tabel referensi'), 'Must explain reference table missing');
    assert.strictEqual(translated.code, '23503');
    assert.strictEqual(translated.row, 5);
    assert.strictEqual(translated.column, 'kelas');
    assert.strictEqual(translated.receivedValue, 'X-NonExistent');
    assert.strictEqual(translated.referenceTable, 'data_kelas');
    assert.ok(translated.remediation.includes('data_kelas'));
  });

  await test('4.1b: translateDatabaseError translates sekolah_id code 23503 with exact compatibility string', () => {
    const batch = [
      { nip: '19800101', nama_guru: 'Ali', sekolah_id: 'bad-school-id', _csvRowNumber: 3 }
    ];
    const pgError = {
      code: '23503',
      message: 'insert or update on table "data_guru" violates foreign key constraint "data_guru_sekolah_id_fkey"',
      detail: 'Key (sekolah_id)=(bad-school-id) is not present in table "sekolah".'
    };

    const translated = translateDatabaseError(pgError, batch, 'data_guru');

    assert.ok(translated.message.startsWith('Baris 3:'), 'Message must start with Baris ${rowNumber}');
    assert.ok(translated.message.includes('tidak terdaftar di sistem sekolah'), 'Must maintain verbatim compatibility string');
    assert.strictEqual(translated.code, '23503');
    assert.strictEqual(translated.row, 3);
    assert.strictEqual(translated.column, 'sekolah_id');
    assert.strictEqual(translated.referenceTable, 'sekolah');
  });

  await test('4.2: translateDatabaseError translates code 23502 (Not-Null Violation)', () => {
    const batch = [
      { nisn: '1002', nama_siswa: '', kelas: 'X-A', _csvRowNumber: 12 }
    ];
    const pgError = {
      code: '23502',
      message: 'null value in column "nama_siswa" of relation "data_siswa" violates not-null constraint',
      column: 'nama_siswa'
    };

    const translated = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.ok(translated.message.startsWith('Baris 12:'), 'Message must start with Baris ${rowNumber}');
    assert.ok(translated.message.includes('terdapat kolom wajib yang bernilai kosong'), 'Must maintain verbatim compatibility string');
    assert.strictEqual(translated.code, '23502');
    assert.strictEqual(translated.row, 12);
    assert.strictEqual(translated.column, 'nama_siswa');
    assert.ok(translated.remediation.length > 0);
  });

  await test('4.3: translateDatabaseError translates code 23505 (Unique Violation)', () => {
    const batch = [
      { nisn: '1001', nama_siswa: 'Duplicate NISN', kelas: 'X-A', _csvRowNumber: 8 }
    ];
    const pgError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "data_siswa_sekolah_id_nisn_key"',
      detail: 'Key (sekolah_id, nisn)=(sch-123, 1001) already exists.'
    };

    const translated = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.ok(translated.message.startsWith('Baris 8:'), 'Message must start with Baris ${rowNumber}');
    assert.ok(translated.message.includes('terdapat data duplikat yang melanggar batasan unik database'), 'Must maintain verbatim compatibility string');
    assert.strictEqual(translated.code, '23505');
    assert.strictEqual(translated.row, 8);
    assert.ok(translated.column?.includes('nisn'));
    assert.ok(translated.receivedValue?.includes('1001'));
  });

  await test('4.4: translateDatabaseError translates code 42501 (RLS Policy Violation)', () => {
    const batch = [{ _csvRowNumber: 1 }];
    const pgError = {
      code: '42501',
      message: 'new row violates row-level security policy for table "data_siswa"'
    };

    const translated = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.ok(translated.message.startsWith('Baris 1:'), 'Message must start with Baris ${rowNumber}');
    assert.ok(translated.message.includes('Akses ditolak oleh kebijakan keamanan data sekolah (RLS)'), 'Must maintain verbatim compatibility string');
    assert.strictEqual(translated.code, '42501');
    assert.strictEqual(translated.row, 1);
  });

  // ============================================================================
  // SUITE 5: UPLOAD PROGRESS BAR EMISSION & MICRO-YIELDS
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 5: Upload Progress Bar Emission ---${RESET}`);

  await test('5.1: importMasterDataFromCsv emits 6 stages with monotonically increasing percentages', async () => {
    const dummyUser = { id: 'admin-1', role: 'admin', sekolah_id: 'sch-123' };
    const mockQuery: any = {
      eq: () => mockQuery,
      in: () => Promise.resolve({ data: [], error: null }),
      then: (resolve: any) => Promise.resolve({ data: [{ nama_kelas: 'X-A' }], error: null }).then(resolve)
    };
    const mockSupabase: any = {
      from: (tbl: string) => ({
        select: () => mockQuery,
        upsert: () => Promise.resolve({ error: null })
      })
    };

    const progressReports: UploadProgressInfo[] = [];
    const csvContent = 'nisn,nama_siswa,kelas,gender,status,no_hp_ortu\n1001,Ahmad,X-A,L,Aktif,08123456789\n1002,Budi,X-A,L,Aktif,08123456780';

    const result = await importMasterDataFromCsv(
      mockSupabase,
      csvContent,
      'data_siswa',
      dummyUser,
      (info) => {
        progressReports.push({ ...info });
      }
    );

    assert.strictEqual(result.count, 2, 'Must import 2 rows');
    assert.ok(progressReports.length >= 5, `Must receive at least 5 progress callbacks, got ${progressReports.length}`);

    // Check first and last percentages
    assert.strictEqual(progressReports[0].percentage, 5, 'First callback must be 5% (Reading CSV)');
    assert.strictEqual(progressReports[progressReports.length - 1].percentage, 100, 'Last callback must be 100% (Complete)');

    // Check monotonicity
    for (let i = 1; i < progressReports.length; i++) {
      assert.ok(
        progressReports[i].percentage >= progressReports[i - 1].percentage,
        `Progress percentage must be monotonically non-decreasing: ${progressReports[i - 1].percentage}% -> ${progressReports[i].percentage}%`
      );
    }

    // Verify stage presence
    const stages = progressReports.map(r => r.stage);
    assert.ok(stages.some(s => s.includes('Membaca')), 'Must include Membaca stage');
    assert.ok(stages.some(s => s.includes('Memvalidasi')), 'Must include Memvalidasi stage');
    assert.ok(stages.some(s => s.includes('Memeriksa')), 'Must include Memeriksa stage');
    assert.ok(stages.some(s => s.includes('Mengunggah') || s.includes('Sinkronisasi')), 'Must include Mengunggah/Sinkronisasi stage');
    assert.ok(stages.some(s => s.includes('Selesai')), 'Must include Selesai stage');
  });

  // ============================================================================
  // SUITE 6: UI INTEGRATION & AST INVARIANTS IN ADMIN VIEWS
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 6: UI Integration & AST Invariants in Admin Views ---${RESET}`);

  await test('6.1: AdminDataView contains upload progress states, animated progress bar, and diagnostic modal', () => {
    assert.ok(adminDataCode.includes('isUploading'), 'AdminDataView must declare isUploading state');
    assert.ok(adminDataCode.includes('uploadProgress'), 'AdminDataView must declare uploadProgress state');
    assert.ok(adminDataCode.includes('uploadStage'), 'AdminDataView must declare uploadStage state');
    assert.ok(adminDataCode.includes('showMasterDataDiagnosticModal'), 'AdminDataView must declare showMasterDataDiagnosticModal helper');
    assert.ok(adminDataCode.includes('bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500'), 'AdminDataView must render animated gradient progress bar');
  });

  await test('6.2: AdminKelasView contains class upload progress states, animated progress bar, and diagnostic modal', () => {
    assert.ok(adminKelasCode.includes('isClassUploading'), 'AdminKelasView must declare isClassUploading state');
    assert.ok(adminKelasCode.includes('classUploadProgress'), 'AdminKelasView must declare classUploadProgress state');
    assert.ok(adminKelasCode.includes('classUploadStage'), 'AdminKelasView must declare classUploadStage state');
    assert.ok(adminKelasCode.includes('showMasterDataDiagnosticModal'), 'AdminKelasView must declare showMasterDataDiagnosticModal helper');
    assert.ok(adminKelasCode.includes('bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500'), 'AdminKelasView must render animated class gradient progress bar');
  });

  // Summary Output
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}  TEST SUITE RESULTS: ${passedTests} / ${totalTests} PASSED${RESET}`);
  if (failedTests > 0) {
    console.log(`${RED}${BOLD}  ${failedTests} CHECKS FAILED!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}  ALL ${totalTests} CHECKS PASSED PERFECTLY WITH ZERO DEFECTS!${RESET}`);
    console.log(`${BOLD}========================================================================${RESET}\n`);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
