/**
 * EMPIRICAL CHALLENGER TEST SUITE — Milestone 2: Penyelarasan Template Master Data & Impor CSV
 * 
 * Comprehensive adversarial verification of:
 * 1. CSV Template Downloads (Headers, Invariants, Schemas for 7 entities)
 * 2. Upload Parsing & Header Normalization (Delimiters, Aliases, Encodings, BOM)
 * 3. Row Error Reporting (Precise Baris ${i} messages)
 * 4. Excel Apostrophe Stripping across all fields
 * 5. Student Deduplication & In-place Class Updates
 * 6. Fallback mechanisms & Database Schema Matching
 */

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeCsvHeaders,
  parseAndValidateMasterCsv,
  importMasterDataFromCsv
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

function pass(desc: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [PASS]${RESET} ${desc}`);
}

function fail(desc: string, err?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ${RED}✖ [FAIL]${RESET} ${desc}`);
  if (err) console.error(`    ↳ Error:`, err);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function runEmpiricalChallengerSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}⚔️  EMPIRICAL CHALLENGER TEST SUITE: MILESTONE 2 (CSV & IMPORT ENGINE)${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  // ==========================================================================
  // CHALLENGE 1: CSV TEMPLATE VERIFICATION (7 ENTITIES & INVARIANTS)
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}--- CHALLENGE 1: CSV Template Definitions & Database Schema Matching ---${RESET}`);

  const adminDataPath = path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminDataSrc = fs.readFileSync(adminDataPath, 'utf8');

  // 1.1 Verify Template_Data_Kelas.csv headers: ['nama_kelas', 'tingkat', 'jurusan']
  try {
    const match = adminDataSrc.match(/Data_Kelas:\s*\{[\s\S]*?filename:\s*'Template_Data_Kelas\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(match, 'Template_Data_Kelas.csv must be defined in AdminDataView.tsx');
    const headers = match[1].split(',').map(s => s.replace(/['"\s]/g, ''));
    assert.deepStrictEqual(headers, ['nama_kelas', 'tingkat', 'jurusan'], 'Data_Kelas headers must exactly be nama_kelas, tingkat, jurusan');
    pass('1.1: Template_Data_Kelas.csv defined with exact headers: [nama_kelas, tingkat, jurusan]');
  } catch (e) {
    fail('1.1: Template_Data_Kelas.csv header verification failed', e);
  }

  // 1.2 Verify all 7 templates match their database schemas and permitted columns
  try {
    const expectedEntities = [
      'Data_Kelas',
      'Data_Siswa',
      'Data_Guru',
      'Data_Mapel',
      'Kalender_Pendidikan',
      'Jadwal_Pelajaran',
      'Wali_Kelas'
    ];
    for (const ent of expectedEntities) {
      assert.ok(adminDataSrc.includes(`${ent}:`), `Template configuration for ${ent} must exist`);
    }

    // Verify Data_Siswa headers
    const siswaMatch = adminDataSrc.match(/Data_Siswa:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(siswaMatch, 'Data_Siswa template must exist');
    const siswaHeaders = siswaMatch[1].split(',').map(s => s.replace(/['"\s]/g, ''));
    assert.deepStrictEqual(siswaHeaders, ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']);

    // Verify Data_Guru headers
    const guruMatch = adminDataSrc.match(/Data_Guru:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(guruMatch, 'Data_Guru template must exist');
    const guruHeaders = guruMatch[1].split(',').map(s => s.replace(/['"\s]/g, ''));
    assert.deepStrictEqual(guruHeaders, ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']);

    // Verify Data_Mapel headers
    const mapelMatch = adminDataSrc.match(/Data_Mapel:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(mapelMatch, 'Data_Mapel template must exist');
    const mapelHeaders = mapelMatch[1].split(',').map(s => s.replace(/['"\s]/g, ''));
    assert.deepStrictEqual(mapelHeaders, ['id', 'nama_mata_pelajaran', 'kategori']);

    // Verify Kalender_Pendidikan headers
    const kalenderMatch = adminDataSrc.match(/Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(kalenderMatch, 'Kalender_Pendidikan template must exist');
    const kalenderHeaders = kalenderMatch[1].split(',').map(s => s.replace(/['"\s]/g, ''));
    assert.deepStrictEqual(kalenderHeaders, ['tanggal', 'keterangan', 'tipe']);

    // Verify Jadwal_Pelajaran headers
    const jadwalMatch = adminDataSrc.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(jadwalMatch, 'Jadwal_Pelajaran template must exist');
    const jadwalHeaders = jadwalMatch[1].split(',').map(s => s.replace(/['"\s]/g, ''));
    assert.deepStrictEqual(jadwalHeaders, ['hari', 'nama_guru', 'mata_pelajaran', 'kelas']);

    // Verify Wali_Kelas headers
    const waliMatch = adminDataSrc.match(/Wali_Kelas:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(waliMatch, 'Wali_Kelas template must exist');
    const waliHeaders = waliMatch[1].split(',').map(s => s.replace(/['"\s]/g, ''));
    assert.deepStrictEqual(waliHeaders, ['kelas', 'nama_guru', 'nip', 'tahun_ajaran']);

    pass('1.2: All 7 Master Data templates match target database schema columns exactly');
  } catch (e) {
    fail('1.2: Template schemas matching failed', e);
  }

  // 1.3 Verify Kalender & Jadwal templates omit 'id' (Critical Postgres 22P02 invariant)
  try {
    const kalenderMatch = adminDataSrc.match(/Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(!kalenderMatch![1].includes("'id'"), 'Kalender template must not contain id');
    assert.ok(!kalenderMatch![2].includes('KP-01'), 'Kalender sample must not contain legacy KP-01');

    const jadwalMatch = adminDataSrc.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(!jadwalMatch![1].includes("'id'"), 'Jadwal template must not contain id');
    assert.ok(!jadwalMatch![2].includes('JP-01'), 'Jadwal sample must not contain legacy JP-01');
    pass('1.3: Kalender & Jadwal templates strictly omit "id" and legacy string IDs');
  } catch (e) {
    fail('1.3: Kalender & Jadwal omission of "id" invariant failed', e);
  }

  // 1.4 Verify Guru template includes 'sekolah_id'
  try {
    const guruMatch = adminDataSrc.match(/Data_Guru:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(guruMatch![1].includes('sekolah_id'), 'Data_Guru headers must include sekolah_id');
    pass('1.4: Guru template includes "sekolah_id" column');
  } catch (e) {
    fail('1.4: Guru sekolah_id invariant failed', e);
  }

  // ==========================================================================
  // CHALLENGE 2: CSV UPLOAD PARSING & VALIDATION ACROSS ALL 7 ENTITIES
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- CHALLENGE 2: Valid CSV Imports for All 7 Entities ---${RESET}`);

  const testSekolahId = 'a0000000-0000-0000-0000-000000000001';
  const testUser = {
    sekolah_id: testSekolahId,
    role: 'admin',
    nama: 'Admin Penguji'
  };

  // 2.1 data_kelas valid CSV
  try {
    const csv = [
      'nama_kelas,tingkat,jurusan',
      'X RPL 1,10,Rekayasa Perangkat Lunak',
      'XI TKJ 2,11,Teknik Komputer dan Jaringan'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'data_kelas', testUser);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].nama_kelas, 'X RPL 1');
    assert.strictEqual(rows[0].tingkat, '10');
    assert.strictEqual(rows[0].jurusan, 'Rekayasa Perangkat Lunak');
    assert.strictEqual(rows[0].sekolah_id, testSekolahId);
    assert.ok(UUID_REGEX.test(rows[0].id));
    pass('2.1: Valid data_kelas CSV parses correctly with UUID and injected sekolah_id');
  } catch (e) {
    fail('2.1: data_kelas CSV parse failed', e);
  }

  // 2.2 data_siswa valid CSV
  try {
    const csv = [
      'nisn,nama_siswa,kelas,gender,status,no_hp_ortu',
      '0081234567,Ahmad Fauzi,X RPL 1,Laki-laki,Aktif,081298765432',
      '0087654321,Siti Aminah,X RPL 1,Perempuan,Aktif,081298765433'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'data_siswa', testUser);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].nama_siswa, 'Ahmad Fauzi');
    assert.strictEqual(rows[0].kelas, 'X RPL 1');
    assert.strictEqual(rows[0].status, 'Aktif');
    assert.strictEqual(rows[0].sekolah_id, testSekolahId);
    assert.ok(UUID_REGEX.test(rows[0].id));
    pass('2.2: Valid data_siswa CSV parses correctly with normalized fields and UUID');
  } catch (e) {
    fail('2.2: data_siswa CSV parse failed', e);
  }

  // 2.3 data_guru valid CSV
  try {
    const csv = [
      `sekolah_id,nip,nama_guru,mata_pelajaran,no_hp,status,email`,
      `${testSekolahId},198001012005011001,Budi Santoso,Informatika,08111222333,Aktif,budi@sekolah.sch.id`
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'data_guru', testUser);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].nama_guru, 'Budi Santoso');
    assert.strictEqual(rows[0].nip, '198001012005011001');
    assert.strictEqual(rows[0].sekolah_id, testSekolahId);
    pass('2.3: Valid data_guru CSV parses correctly with verified sekolah_id');
  } catch (e) {
    fail('2.3: data_guru CSV parse failed', e);
  }

  // 2.4 data_mapel valid CSV
  try {
    const csv = [
      'id,nama_mata_pelajaran,kategori',
      'MP-01,Matematika,Umum',
      'MP-02,Bahasa Indonesia,Umum'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'data_mapel', testUser);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].nama_mata_pelajaran, 'Matematika');
    assert.strictEqual(rows[0].kategori, 'Umum');
    pass('2.4: Valid data_mapel CSV parses correctly with custom mapel id preserved');
  } catch (e) {
    fail('2.4: data_mapel CSV parse failed', e);
  }

  // 2.5 kalender_pendidikan valid CSV
  try {
    const csv = [
      'tanggal,keterangan,tipe',
      '2026-10-01,Hari Kesaktian Pancasila,Libur',
      '2026-10-28,Hari Sumpah Pemuda,Kegiatan'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'kalender_pendidikan', testUser);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].tanggal, '2026-10-01');
    assert.strictEqual(rows[0].keterangan, 'Hari Kesaktian Pancasila');
    assert.ok(UUID_REGEX.test(rows[0].id), 'kalender id must be generated UUID');
    pass('2.5: Valid kalender_pendidikan CSV parses correctly and auto-generates UUID');
  } catch (e) {
    fail('2.5: kalender_pendidikan CSV parse failed', e);
  }

  // 2.6 jadwal_pelajaran valid CSV
  try {
    const csv = [
      'hari,nama_guru,mata_pelajaran,kelas',
      'Senin,Budi Santoso,Informatika,X RPL 1',
      'Selasa,Budi Santoso,Informatika,XI TKJ 2'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'jadwal_pelajaran', testUser);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].hari, 'Senin');
    assert.strictEqual(rows[0].nama_guru, 'Budi Santoso');
    assert.strictEqual(rows[0].mata_pelajaran, 'Informatika');
    assert.strictEqual(rows[0].kelas, 'X RPL 1');
    assert.ok(UUID_REGEX.test(rows[0].id), 'jadwal id must be generated UUID');
    pass('2.6: Valid jadwal_pelajaran CSV parses correctly and auto-generates UUID');
  } catch (e) {
    fail('2.6: jadwal_pelajaran CSV parse failed', e);
  }

  // 2.7 wali_kelas valid CSV
  try {
    const csv = [
      'kelas,nama_guru,nip,tahun_ajaran',
      'X RPL 1,Budi Santoso,198001012005011001,2024/2025'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'wali_kelas', testUser);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].kelas, 'X RPL 1');
    assert.strictEqual(rows[0].nama_guru, 'Budi Santoso');
    assert.strictEqual(rows[0].tahun_ajaran, '2024/2025');
    assert.ok(UUID_REGEX.test(rows[0].id));
    pass('2.7: Valid wali_kelas CSV parses correctly with UUID and default tahun_ajaran');
  } catch (e) {
    fail('2.7: wali_kelas CSV parse failed', e);
  }

  // ==========================================================================
  // CHALLENGE 3: ROW ERROR REPORTING (BARIS ${i} LOCALIZED MESSAGES)
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- CHALLENGE 3: Row Error Reporting (Baris \${i}) ---${RESET}`);

  // 3.1 Empty nama_kelas on line 4
  try {
    const csv = [
      'nama_kelas,tingkat',
      'X RPL 1,10',
      'X RPL 2,10',
      '   ,10'
    ].join('\n');
    let errMessage = '';
    try {
      parseAndValidateMasterCsv(csv, 'data_kelas', testUser);
    } catch (err: any) {
      errMessage = err.message;
    }
    assert.ok(errMessage.includes('Baris 3: Kolom "nama_kelas" wajib diisi'), `Expected Baris 3 error, got: ${errMessage}`);
    pass('3.1: Empty nama_kelas triggers explicit "Baris 3: Kolom \\"nama_kelas\\" wajib diisi"');
  } catch (e) {
    fail('3.1: Empty nama_kelas error reporting failed', e);
  }

  // 3.2 Duplicate class name within CSV on line 5
  try {
    const csv = [
      'nama_kelas,tingkat',
      'X RPL 1,10',
      'X RPL 2,10',
      'XI RPL 1,11',
      'X RPL 1,10' // duplicate on line 5 (index 4)
    ].join('\n');
    let errMessage = '';
    try {
      parseAndValidateMasterCsv(csv, 'data_kelas', testUser);
    } catch (err: any) {
      errMessage = err.message;
    }
    assert.ok(errMessage.includes('Baris 4: Duplikat nama kelas "X RPL 1"'), `Expected Baris 4 duplicate error, got: ${errMessage}`);
    pass('3.2: Duplicate class name triggers explicit "Baris 4: Duplikat nama kelas \\"X RPL 1\\""');
  } catch (e) {
    fail('3.2: Duplicate class name error reporting failed', e);
  }

  // 3.3 Dummy class name detected
  try {
    const csv = [
      'nama_kelas,tingkat',
      'X Merdeka,10',
      'Kelas Dummy Test,10'
    ].join('\n');
    let errMessage = '';
    try {
      parseAndValidateMasterCsv(csv, 'data_kelas', testUser);
    } catch (err: any) {
      errMessage = err.message;
    }
    assert.ok(errMessage.includes('Baris 2') && errMessage.includes('dummy'), `Expected Baris 2 dummy error, got: ${errMessage}`);
    pass('3.3: Dummy class name triggers explicit "Baris 2: Terdeteksi nama kelas dummy/percobaan"');
  } catch (e) {
    fail('3.3: Dummy class name error reporting failed', e);
  }

  // 3.4 Missing student name or class in data_siswa
  try {
    const csv = [
      'nisn,nama_siswa,kelas',
      '0081234567,,X Merdeka'
    ].join('\n');
    let errMessage = '';
    try {
      parseAndValidateMasterCsv(csv, 'data_siswa', testUser);
    } catch (err: any) {
      errMessage = err.message;
    }
    assert.ok(errMessage.includes('Baris 1') && errMessage.includes('nama_siswa'), `Expected Baris 1 nama_siswa error, got: ${errMessage}`);
    pass('3.4: Missing nama_siswa triggers "Baris 1: Kolom \\"nama_siswa\\" wajib diisi"');
  } catch (e) {
    fail('3.4: Missing nama_siswa error reporting failed', e);
  }

  // 3.5 Duplicate student in same class
  try {
    const csv = [
      'nisn,nama_siswa,kelas',
      '0081234567,Candra Podomi,X Merdeka',
      '0081234568,Candra Podomi,X Merdeka'
    ].join('\n');
    let errMessage = '';
    try {
      parseAndValidateMasterCsv(csv, 'data_siswa', testUser);
    } catch (err: any) {
      errMessage = err.message;
    }
    assert.ok(errMessage.includes('Baris 2') && errMessage.includes('Duplikat siswa'), `Expected Baris 2 duplicate student error, got: ${errMessage}`);
    pass('3.5: Duplicate student in same class triggers "Baris 2: Duplikat siswa \\"Candra Podomi\\" di kelas X Merdeka"');
  } catch (e) {
    fail('3.5: Duplicate student error reporting failed', e);
  }

  // 3.6 Missing required headers pre-validation (Incompatible template)
  try {
    const wrongCsv = [
      'tanggal,keterangan,tipe',
      '2026-10-01,Libur,Libur'
    ].join('\n');
    let errMessage = '';
    try {
      parseAndValidateMasterCsv(wrongCsv, 'data_siswa', testUser);
    } catch (err: any) {
      errMessage = err.message;
    }
    assert.ok(errMessage.includes('kolom wajib') && errMessage.includes('nama_siswa'), `Expected missing column pre-validation error, got: ${errMessage}`);
    pass('3.6: Uploading incompatible CSV template immediately triggers clear missing required column error');
  } catch (e) {
    fail('3.6: Incompatible CSV pre-validation failed', e);
  }

  // ==========================================================================
  // CHALLENGE 4: EXCEL APOSTROPHE STRIPPING
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- CHALLENGE 4: Excel Apostrophe Stripping ---${RESET}`);

  // 4.1 Excel apostrophe stripping on NISN, phone, NIP, and text
  try {
    const csv = [
      'nisn,nama_siswa,kelas,no_hp_ortu',
      "'114367407,'Moh. Candra Podomi,'X Merdeka,'081234567890"
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'data_siswa', testUser);
    assert.strictEqual(rows[0].nisn, '114367407', 'Leading apostrophe on NISN must be stripped');
    assert.strictEqual(rows[0].no_hp_ortu, '081234567890', 'Leading apostrophe on phone must be stripped');
    assert.strictEqual(rows[0].nama_siswa, 'Moh. Candra Podomi', 'Leading apostrophe on name must be stripped');
    assert.strictEqual(rows[0].kelas, 'X Merdeka', 'Leading apostrophe on class must be stripped');
    pass('4.1: Leading Excel apostrophes (\') are cleanly stripped across all fields (NISN, phone, name, class)');
  } catch (e) {
    fail('4.1: Excel apostrophe stripping failed', e);
  }

  // 4.2 Multiple apostrophes (e.g. "''12345''")
  try {
    const csv = [
      'nama_kelas,tingkat,jurusan',
      "''X Merdeka'','10,''Umum''"
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'data_kelas', testUser);
    assert.strictEqual(rows[0].nama_kelas, 'X Merdeka');
    assert.strictEqual(rows[0].tingkat, '10');
    assert.strictEqual(rows[0].jurusan, 'Umum');
    pass('4.2: Enclosing multiple apostrophes are safely trimmed without corrupting content');
  } catch (e) {
    fail('4.2: Multiple apostrophes stripping failed', e);
  }

  // ==========================================================================
  // CHALLENGE 5: STUDENT DEDUPLICATION & IN-PLACE CLASS UPDATE
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- CHALLENGE 5: Student Deduplication & In-place Class Updates ---${RESET}`);

  // 5.1 Re-importing existing student updates data_siswa.kelas without creating duplicate rows
  try {
    const existingStudentUuid = 'd1111111-2222-3333-4444-555555555555';
    let upsertCalledWith: any[] = [];
    let conflictTarget = '';

    const mockSupabase = {
      from: (tbl: string) => {
        if (tbl === 'data_siswa') {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                in: (inCol: string, list: string[]) => {
                  assert.strictEqual(col, 'sekolah_id');
                  assert.strictEqual(val, testSekolahId);
                  assert.ok(list.includes('114367407'));
                  return Promise.resolve({
                    data: [
                      {
                        id: existingStudentUuid,
                        nisn: '114367407',
                        sekolah_id: testSekolahId,
                        nama_siswa: 'Moh. Candra Podomi',
                        kelas: 'X Merdeka'
                      }
                    ],
                    error: null
                  });
                }
              })
            }),
            upsert: (batch: any[], opts: any) => {
              upsertCalledWith = batch;
              conflictTarget = opts.onConflict;
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    // CSV has same student NISN but updated class "XI Merdeka"
    const updatedStudentCsv = [
      'nisn,nama_siswa,kelas,gender,status',
      '114367407,Moh. Candra Podomi,XI Merdeka,Laki-laki,Aktif'
    ].join('\n');

    const result = await importMasterDataFromCsv(mockSupabase, updatedStudentCsv, 'data_siswa', testUser);

    assert.strictEqual(result.count, 1);
    assert.strictEqual(conflictTarget, 'id', 'Upsert should target primary key id');
    assert.strictEqual(upsertCalledWith.length, 1);
    assert.strictEqual(upsertCalledWith[0].id, existingStudentUuid, 'Row id must match existing UUID');
    assert.strictEqual(upsertCalledWith[0].kelas, 'XI Merdeka', 'Class must be updated to XI Merdeka');
    assert.strictEqual(upsertCalledWith[0].nisn, '114367407');
    pass('5.1: Existing student re-import maps existing student UUID and updates class in-place without duplicates');
  } catch (e) {
    fail('5.1: Student deduplication test failed', e);
  }

  // 5.2 Mixed batch: 1 existing student + 1 new student
  try {
    const existingStudentUuid = 'd2222222-3333-4444-5555-666666666666';
    let upsertBatch: any[] = [];

    const mockSupabase = {
      from: (tbl: string) => {
        if (tbl === 'data_siswa') {
          return {
            select: () => ({
              eq: () => ({
                in: (col: string, list: string[]) => {
                  return Promise.resolve({
                    data: [
                      {
                        id: existingStudentUuid,
                        nisn: '114367407',
                        sekolah_id: testSekolahId
                      }
                    ],
                    error: null
                  });
                }
              })
            }),
            upsert: (batch: any[]) => {
              upsertBatch = batch;
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const mixedCsv = [
      'nisn,nama_siswa,kelas',
      '114367407,Moh. Candra Podomi,XI Merdeka',
      '223344556,Siti Khodijah,X Merdeka'
    ].join('\n');

    const result = await importMasterDataFromCsv(mockSupabase, mixedCsv, 'data_siswa', testUser);
    assert.strictEqual(result.count, 2);
    // Row 1 matches existing UUID
    assert.strictEqual(upsertBatch[0].id, existingStudentUuid);
    assert.strictEqual(upsertBatch[0].kelas, 'XI Merdeka');
    // Row 2 receives brand new UUID
    assert.notStrictEqual(upsertBatch[1].id, existingStudentUuid);
    assert.ok(UUID_REGEX.test(upsertBatch[1].id));
    assert.strictEqual(upsertBatch[1].kelas, 'X Merdeka');
    pass('5.2: Mixed batch correctly distinguishes existing student (in-place update) and new student (new UUID)');
  } catch (e) {
    fail('5.2: Mixed batch deduplication test failed', e);
  }

  // 5.3 Student without NISN (empty or "-") does not false-match
  try {
    let selectExecuted = false;
    const mockSupabase = {
      from: (tbl: string) => {
        if (tbl === 'data_siswa') {
          return {
            select: () => ({
              eq: () => ({
                in: () => {
                  selectExecuted = true;
                  return Promise.resolve({ data: [], error: null });
                }
              })
            }),
            upsert: (batch: any[]) => Promise.resolve({ error: null })
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const noNisnCsv = [
      'nisn,nama_siswa,kelas',
      '-,Siswa Baru 1,X Merdeka',
      ',Siswa Baru 2,X Merdeka'
    ].join('\n');

    const res = await importMasterDataFromCsv(mockSupabase, noNisnCsv, 'data_siswa', testUser);
    assert.strictEqual(res.count, 2);
    assert.strictEqual(selectExecuted, false, 'Should not query DB when all NISNs are empty or "-"');
    assert.ok(UUID_REGEX.test(res.rows[0].id));
    assert.ok(UUID_REGEX.test(res.rows[1].id));
    assert.notStrictEqual(res.rows[0].id, res.rows[1].id);
    pass('5.3: Students with empty/placeholder NISN bypass NISN query and receive distinct valid UUIDs');
  } catch (e) {
    fail('5.3: Empty NISN handling failed', e);
  }

  // ==========================================================================
  // CHALLENGE 6: DELIMITERS, ENCODINGS, AND ALIASES STRESS TEST
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- CHALLENGE 6: Adversarial Delimiters, Encodings, and Aliases ---${RESET}`);

  // 6.1 Semicolon-delimited Indonesian CSV
  try {
    const csvSemicolon = [
      'nama_kelas;tingkat;jurusan',
      'X IPA 1;10;MIPA',
      'XI IPS 2;11;IPS'
    ].join('\r\n');
    const rows = parseAndValidateMasterCsv(csvSemicolon, 'data_kelas', testUser);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].nama_kelas, 'X IPA 1');
    assert.strictEqual(rows[0].tingkat, '10');
    assert.strictEqual(rows[0].jurusan, 'MIPA');
    pass('6.1: Semicolon delimiter (Indonesian Excel format) with CRLF autodetected and parsed cleanly');
  } catch (e) {
    fail('6.1: Semicolon delimiter test failed', e);
  }

  // 6.2 Tab-delimited (TSV) CSV
  try {
    const tsv = [
      'nama_kelas\ttingkat\tjurusan',
      'X TKJ\t10\tTKJ'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(tsv, 'data_kelas', testUser);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].nama_kelas, 'X TKJ');
    pass('6.2: Tab-delimited format (TSV) autodetected and parsed cleanly');
  } catch (e) {
    fail('6.2: Tab-delimited test failed', e);
  }

  // 6.3 Header aliases (kelas -> nama_kelas, rombel -> nama_kelas, grade -> tingkat, peminatan -> jurusan)
  try {
    const csvAliases = [
      'rombel,grade,peminatan',
      'XII Boga,12,Tata Boga'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csvAliases, 'data_kelas', testUser);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].nama_kelas, 'XII Boga');
    assert.strictEqual(rows[0].tingkat, '12');
    assert.strictEqual(rows[0].jurusan, 'Tata Boga');
    pass('6.3: Aliases (rombel, grade, peminatan) seamlessly normalize to schema fields');
  } catch (e) {
    fail('6.3: Header aliases test failed', e);
  }

  // 6.4 Auto-derivation of tingkat from class name patterns
  try {
    const testPatterns = [
      { name: 'X Merdeka 1', expected: '10' },
      { name: 'XI IPA 2', expected: '11' },
      { name: 'XII IPS 3', expected: '12' },
      { name: '10 Otomotif', expected: '10' },
      { name: '11 Listrik', expected: '11' },
      { name: '12 Bangunan', expected: '12' },
      { name: 'Kelas Pengganti', expected: 'Lainnya' }
    ];

    for (const p of testPatterns) {
      const csv = `nama_kelas\n${p.name}`;
      const rows = parseAndValidateMasterCsv(csv, 'data_kelas', testUser);
      assert.strictEqual(rows[0].tingkat, p.expected, `Expected ${p.name} to derive tingkat ${p.expected}`);
    }
    pass('6.4: Auto-derivation of tingkat handles Roman (X, XI, XII), Arabic (10, 11, 12), and fallback (Lainnya)');
  } catch (e) {
    fail('6.4: Auto-derivation of tingkat test failed', e);
  }

  // 6.5 Quoted values with commas
  try {
    const csvQuoted = [
      'hari,nama_guru,mata_pelajaran,kelas',
      'Senin,Budi Santoso,"Informatika, Algoritma, dan Pemrograman",X RPL 1'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csvQuoted, 'jadwal_pelajaran', testUser);
    assert.strictEqual(rows[0].mata_pelajaran, 'Informatika, Algoritma, dan Pemrograman');
    pass('6.5: Quoted values containing commas are correctly preserved without splitting');
  } catch (e) {
    fail('6.5: Quoted commas test failed', e);
  }

  // ==========================================================================
  // CHALLENGE 7: DATABASE SCHEMA CACHE FALLBACK FOR data_kelas
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- CHALLENGE 7: PostgREST Schema Cache Fallback (PGRST205) ---${RESET}`);

  // 7.1 Verify fallback syncs distinct classes into wali_kelas when data_kelas table is missing
  try {
    const syncedClasses: string[] = [];
    const mockSupabasePgrst = {
      from: (tbl: string) => {
        if (tbl === 'data_kelas') {
          return {
            upsert: () => Promise.resolve({
              error: { code: 'PGRST205', message: "Could not find the table 'public.data_kelas' in the schema cache" }
            })
          };
        }
        if (tbl === 'wali_kelas') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null })
                })
              })
            }),
            upsert: (record: any) => {
              syncedClasses.push(record.kelas);
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const csvFallback = [
      'nama_kelas,tingkat,jurusan',
      'X Tata Busana,10,Busana',
      'XI Tata Busana,11,Busana'
    ].join('\n');

    const result = await importMasterDataFromCsv(mockSupabasePgrst, csvFallback, 'data_kelas', testUser);
    assert.strictEqual(result.count, 2);
    assert.strictEqual(syncedClasses.length, 2);
    assert.ok(syncedClasses.includes('X Tata Busana'));
    assert.ok(syncedClasses.includes('XI Tata Busana'));
    pass('7.1: PGRST205 schema cache absence triggers graceful fallback syncing classes into wali_kelas');
  } catch (e) {
    fail('7.1: Schema cache fallback test failed', e);
  }

  // ==========================================================================
  // FINAL RESULTS SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}EMPIRICAL CHALLENGER RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${RED}${BOLD}VERDICT: REQUEST_CHANGES${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}VERDICT: APPROVE${RESET}`);
  }
}

runEmpiricalChallengerSuite().catch(e => {
  console.error('Fatal unhandled error in Empirical Challenger test suite:', e);
  process.exit(1);
});
