/**
 * Automated Verification: Milestone 2 — Penyelarasan Template Master Data & Impor CSV
 * 
 * Verifies:
 * 1. Harmonization of all 7 CSV templates in AdminDataView.tsx (Data_Kelas, Data_Siswa, Data_Guru, Data_Mapel, Kalender_Pendidikan, Jadwal_Pelajaran, Wali_Kelas)
 * 2. Preservation of core invariants:
 *    - Template_Kalender_Pendidikan.csv must not contain 'id'
 *    - Template_Jadwal_Pelajaran.csv must not contain 'id'
 *    - Template_Data_Guru.csv must contain 'sekolah_id'
 *    - AdminDataView uses showToast with 'Unggah Berhasil'
 * 3. normalizeCsvHeaders handles data_kelas/kelas, cleans BOM, handles aliases, and eliminates table collisions
 * 4. parseAndValidateMasterCsv validates required headers, validates data_kelas, auto-derives tingkat, sanitizes apostrophes, and auto-generates UUIDs
 * 5. importMasterDataFromCsv resolves students idempotently by (sekolah_id, nisn) and supports data_kelas upsert with schema cache fallback
 * 6. AdminKelasView integrates Template CSV download, Impor CSV upload, and listens to 'sipjam:kelas-updated'
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

async function runMilestone2Suite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}🧪 TEST SUITE: MILESTONE 2 (CSV TEMPLATES & IMPORT HARMONIZATION)${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  // ==========================================================================
  // SECTION 1: TEMPLATE HARMONIZATION & INVARIANT GUARDS
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}--- SECTION 1: AdminDataView CSV Templates Verification ---${RESET}`);

  const adminDataPath = path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminDataSrc = fs.readFileSync(adminDataPath, 'utf8');

  // Test 1.1: Data_Kelas template definition exists with correct structure
  try {
    assert.ok(adminDataSrc.includes('Template_Data_Kelas.csv'), 'AdminDataView must include Template_Data_Kelas.csv');
    const kelasMatch = adminDataSrc.match(/Data_Kelas:\s*\{[\s\S]*?filename:\s*'Template_Data_Kelas\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(kelasMatch, 'Data_Kelas template block must be defined in AdminDataView.tsx');
    const headersStr = kelasMatch[1];
    assert.ok(headersStr.includes('nama_kelas'), 'Data_Kelas headers must include nama_kelas');
    assert.ok(headersStr.includes('tingkat'), 'Data_Kelas headers must include tingkat');
    assert.ok(headersStr.includes('jurusan'), 'Data_Kelas headers must include jurusan');
    pass('1.1: Data_Kelas template is harmonized in AdminDataView with nama_kelas, tingkat, jurusan');
  } catch (e) {
    fail('1.1: Data_Kelas template verification failed', e);
  }

  // Test 1.2: All 7 entity templates exist
  try {
    const requiredTemplates = [
      'Data_Kelas',
      'Data_Siswa',
      'Data_Guru',
      'Data_Mapel',
      'Kalender_Pendidikan',
      'Jadwal_Pelajaran',
      'Wali_Kelas'
    ];
    for (const t of requiredTemplates) {
      assert.ok(adminDataSrc.includes(`${t}:`), `AdminDataView templates must contain ${t}`);
    }
    pass('1.2: All 7 Master Data entity templates are present in AdminDataView.tsx');
  } catch (e) {
    fail('1.2: Template entities check failed', e);
  }

  // Test 1.3: Kalender & Jadwal invariants: NO 'id'
  try {
    const kalenderMatch = adminDataSrc.match(/Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(kalenderMatch, 'Kalender_Pendidikan template block must exist');
    assert.strictEqual(kalenderMatch[1].includes("'id'"), false, 'Kalender_Pendidikan headers must NOT include "id"');
    assert.strictEqual(kalenderMatch[2].includes('KP-01'), false, 'Kalender_Pendidikan sample must NOT include legacy KP-01');

    const jadwalMatch = adminDataSrc.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(jadwalMatch, 'Jadwal_Pelajaran template block must exist');
    assert.strictEqual(jadwalMatch[1].includes("'id'"), false, 'Jadwal_Pelajaran headers must NOT include "id"');
    assert.strictEqual(jadwalMatch[2].includes('JP-01'), false, 'Jadwal_Pelajaran sample must NOT include legacy JP-01');
    pass('1.3: Invariant satisfied: Kalender_Pendidikan and Jadwal_Pelajaran omit "id" and legacy strings');
  } catch (e) {
    fail('1.3: Kalender/Jadwal template invariant failed', e);
  }

  // Test 1.4: Data_Guru invariant: contains 'sekolah_id'
  try {
    const guruMatch = adminDataSrc.match(/Data_Guru:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(guruMatch, 'Data_Guru template block must exist');
    assert.ok(guruMatch[1].includes('sekolah_id'), 'Data_Guru headers must contain sekolah_id');
    pass('1.4: Invariant satisfied: Data_Guru template includes sekolah_id');
  } catch (e) {
    fail('1.4: Data_Guru sekolah_id invariant failed', e);
  }

  // Test 1.5: AdminDataView preserves showToast with 'Unggah Berhasil' & dispatches sipjam:kelas-updated
  try {
    assert.ok(adminDataSrc.includes("showToast(") && adminDataSrc.includes("Unggah Berhasil"), 'Must use showToast with "Unggah Berhasil"');
    assert.ok(adminDataSrc.includes("sipjam:kelas-updated"), 'AdminDataView must dispatch sipjam:kelas-updated on class/student update');
    pass('1.5: Invariant satisfied: AdminDataView uses showToast("Unggah Berhasil") and dispatches sipjam:kelas-updated');
  } catch (e) {
    fail('1.5: Toast / event dispatch invariant failed', e);
  }

  // ==========================================================================
  // SECTION 2: CSV HEADER NORMALIZATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 2: normalizeCsvHeaders Robustness & Scoping ---${RESET}`);

  // Test 2.1: Data_Kelas header normalization
  try {
    const rawKelasHeaders = ['\uFEFFKelas', ' Tingkat Kelas ', 'peminatan'];
    const norm = normalizeCsvHeaders(rawKelasHeaders, 'data_kelas');
    assert.deepStrictEqual(norm, ['nama_kelas', 'tingkat', 'jurusan']);

    const rawRombel = ['Rombel', 'Grade', 'Jurusan'];
    const normRombel = normalizeCsvHeaders(rawRombel, 'kelas');
    assert.deepStrictEqual(normRombel, ['nama_kelas', 'tingkat', 'jurusan']);
    pass('2.1: normalizeCsvHeaders correctly normalizes class aliases (kelas, rombel, tingkat_kelas, grade, peminatan)');
  } catch (e) {
    fail('2.1: normalizeCsvHeaders for data_kelas failed', e);
  }

  // Test 2.2: Scoping of "nama" collision across entities
  try {
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_kelas'), ['nama_kelas']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_siswa'), ['nama_siswa']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_mapel'), ['nama_mata_pelajaran']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_guru'), ['nama_guru']);
    pass('2.2: Header "nama" is accurately scoped by table without cross-entity collisions');
  } catch (e) {
    fail('2.2: Name collision scoping failed', e);
  }

  // Test 2.3: "rombel" maps to "nama_kelas" for class table, but "kelas" for student/schedule tables
  try {
    assert.deepStrictEqual(normalizeCsvHeaders(['rombel'], 'data_kelas'), ['nama_kelas']);
    assert.deepStrictEqual(normalizeCsvHeaders(['rombel'], 'data_siswa'), ['kelas']);
    assert.deepStrictEqual(normalizeCsvHeaders(['rombel'], 'jadwal_pelajaran'), ['kelas']);
    pass('2.3: Header "rombel" dynamically maps to "nama_kelas" for class table and "kelas" for relational tables');
  } catch (e) {
    fail('2.3: rombel mapping failed', e);
  }

  // ==========================================================================
  // SECTION 3: PARSING, VALIDATION & ROW-LEVEL FEEDBACK
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 3: parseAndValidateMasterCsv Engine ---${RESET}`);

  // Test 3.1: Valid data_kelas CSV parses and auto-derives tingkat and UUID
  try {
    const csvKelas = [
      'nama_kelas,jurusan',
      'X Merdeka,Umum',
      'XI IPA 1,IPA',
      'XII IPS 2,IPS',
      'Ruang Khusus,Inklusif'
    ].join('\n');

    const rows = parseAndValidateMasterCsv(csvKelas, 'data_kelas');
    assert.strictEqual(rows.length, 4);
    assert.strictEqual(rows[0].nama_kelas, 'X Merdeka');
    assert.strictEqual(rows[0].tingkat, '10');
    assert.strictEqual(rows[0].jurusan, 'Umum');
    assert.ok(UUID_REGEX.test(rows[0].id), 'Row 0 id must be a valid UUID');

    assert.strictEqual(rows[1].tingkat, '11');
    assert.strictEqual(rows[2].tingkat, '12');
    assert.strictEqual(rows[3].tingkat, 'Lainnya');
    pass('3.1: parseAndValidateMasterCsv successfully parses class CSV, auto-derives tingkat (10, 11, 12, Lainnya), and assigns UUIDs');
  } catch (e) {
    fail('3.1: data_kelas parsing failed', e);
  }

  // Test 3.2: Empty nama_kelas throws with exact row number
  try {
    const invalidCsv = [
      'nama_kelas,tingkat',
      'X Merdeka,10',
      '  ,11'
    ].join('\n');

    let threw = false;
    try {
      parseAndValidateMasterCsv(invalidCsv, 'data_kelas');
    } catch (err: any) {
      threw = true;
      assert.ok(err.message.includes('Baris 2'), `Error must mention Baris 2, got: ${err.message}`);
      assert.ok(err.message.includes('nama_kelas'), `Error must mention nama_kelas, got: ${err.message}`);
    }
    assert.strictEqual(threw, true, 'Should have thrown for empty nama_kelas at Baris 2');
    pass('3.2: Empty nama_kelas throws descriptive error with exact row number (Baris 2)');
  } catch (e) {
    fail('3.2: Empty nama_kelas validation failed', e);
  }

  // Test 3.3: Missing required header throws informative pre-validation error
  try {
    const wrongTemplateCsv = [
      'nip,nama_guru,mata_pelajaran',
      '19850101,Dewi Sartika,Informatika'
    ].join('\n');

    let threw = false;
    try {
      parseAndValidateMasterCsv(wrongTemplateCsv, 'data_kelas');
    } catch (err: any) {
      threw = true;
      assert.ok(err.message.includes('kolom wajib'), `Error must mention "kolom wajib", got: ${err.message}`);
      assert.ok(err.message.includes('nama_kelas'), `Error must mention "nama_kelas", got: ${err.message}`);
    }
    assert.strictEqual(threw, true, 'Should fail pre-validation when uploading wrong template');
    pass('3.3: Pre-validation catches missing required headers when wrong template is uploaded');
  } catch (e) {
    fail('3.3: Pre-validation missing header check failed', e);
  }

  // Test 3.4: Strips Excel apostrophes on student NISN and phone
  try {
    const studentCsv = [
      'nisn,nama_siswa,kelas,no_hp_ortu',
      "'114367407,Candra Podomi,X Merdeka,'081234567890"
    ].join('\n');

    const rows = parseAndValidateMasterCsv(studentCsv, 'data_siswa');
    assert.strictEqual(rows[0].nisn, '114367407', 'Leading apostrophe on NISN must be stripped');
    assert.strictEqual(rows[0].no_hp_ortu, '081234567890', 'Leading apostrophe on phone must be stripped');
    pass('3.4: Excel apostrophes ("\'") are cleanly stripped from NISN and phone numbers');
  } catch (e) {
    fail('3.4: Apostrophe sanitization failed', e);
  }

  // ==========================================================================
  // SECTION 4: IDEMPOTENCY & SUPABASE IMPORT ENGINE
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 4: importMasterDataFromCsv Engine ---${RESET}`);

  // Test 4.1: Student deduplication by (sekolah_id, nisn) preserves existing UUID
  try {
    const existingStudentUuid = 'c0000000-0000-0000-0000-000000000099';
    const mockSupabase = {
      from: (tbl: string) => {
        if (tbl === 'data_siswa') {
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
              assert.strictEqual(batch[0].id, existingStudentUuid, 'Existing student UUID must be mapped to row id');
              assert.strictEqual(opts.onConflict, 'id');
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const reimportCsv = [
      'nisn,nama_siswa,kelas',
      '114367407,Candra Podomi,XI Merdeka'
    ].join('\n');

    const res = await importMasterDataFromCsv(mockSupabase, reimportCsv, 'data_siswa', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });
    assert.strictEqual(res.count, 1);
    assert.strictEqual(res.rows[0].id, existingStudentUuid);
    assert.strictEqual(res.rows[0].kelas, 'XI Merdeka');
    pass('4.1: Student re-import matches existing student by (sekolah_id, nisn) and updates in-place without duplicate rows');
  } catch (e) {
    fail('4.1: Student idempotency test failed', e);
  }

  // Test 4.2: data_kelas upsert uses onConflict 'sekolah_id, nama_kelas' and handles PGRST205 fallback
  try {
    let fallbackTriggered = false;
    const mockSupabaseWithFallback = {
      from: (tbl: string) => {
        if (tbl === 'data_kelas') {
          return {
            upsert: (batch: any[], opts: any) => {
              assert.strictEqual(opts.onConflict, 'sekolah_id, nama_kelas');
              // Simulate missing table in schema cache (PGRST205)
              return Promise.resolve({
                error: { code: 'PGRST205', message: "Could not find the table 'public.data_kelas' in the schema cache" }
              });
            }
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
              fallbackTriggered = true;
              assert.ok(record.kelas, 'Fallback should sync class name to wali_kelas');
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const classCsv = [
      'nama_kelas,tingkat,jurusan',
      'X Merdeka,10,Umum'
    ].join('\n');

    const res = await importMasterDataFromCsv(mockSupabaseWithFallback, classCsv, 'data_kelas', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });
    assert.strictEqual(res.count, 1);
    assert.strictEqual(fallbackTriggered, true, 'Fallback to wali_kelas must trigger on PGRST205');
    pass('4.2: data_kelas upsert targets (sekolah_id, nama_kelas) and gracefully falls back on PGRST205');
  } catch (e) {
    fail('4.2: data_kelas upsert and fallback failed', e);
  }

  // ==========================================================================
  // SECTION 5: ADMINKELASVIEW INTEGRATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 5: AdminKelasView Toolbar & Event Integration ---${RESET}`);

  const adminKelasPath = path.join(__dirname, '..', 'src', 'components', 'AdminKelasView.tsx');
  const adminKelasSrc = fs.readFileSync(adminKelasPath, 'utf8');

  // Test 5.1: AdminKelasView has Template CSV and Impor CSV buttons
  try {
    assert.ok(adminKelasSrc.includes('Template CSV'), 'AdminKelasView must contain "Template CSV" button');
    assert.ok(adminKelasSrc.includes('Impor CSV'), 'AdminKelasView must contain "Impor CSV" button');
    assert.ok(adminKelasSrc.includes('handleDownloadClassTemplate'), 'Must have handleDownloadClassTemplate handler');
    assert.ok(adminKelasSrc.includes('handleClassFileUpload'), 'Must have handleClassFileUpload handler');
    pass('5.1: AdminKelasView toolbar includes "Template CSV" and "Impor CSV" buttons and handlers');
  } catch (e) {
    fail('5.1: AdminKelasView buttons verification failed', e);
  }

  // Test 5.2: AdminKelasView listens to 'sipjam:kelas-updated'
  try {
    assert.ok(adminKelasSrc.includes("'sipjam:kelas-updated'"), 'AdminKelasView must listen to sipjam:kelas-updated');
    pass('5.2: AdminKelasView listens to "sipjam:kelas-updated" custom event for live refresh');
  } catch (e) {
    fail('5.2: AdminKelasView event listener verification failed', e);
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMilestone2Suite().catch(e => {
  console.error('Fatal error in Milestone 2 test runner:', e);
  process.exit(1);
});
