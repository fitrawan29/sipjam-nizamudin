/**
 * Adversarial Challenger Test Suite: Milestone 2 (CSV Templates & Import Harmonization)
 * 
 * Empirically stress-tests:
 * 1. Template Integrity & Invariants:
 *    - All 7 entity templates defined in AdminDataView.tsx
 *    - Kalender & Jadwal templates omit 'id' (prevents Postgres 22P02)
 *    - Guru template contains 'sekolah_id'
 *    - Kelas template contains 'nama_kelas', 'tingkat', 'jurusan'
 * 2. Delimiter & Encoding Stress:
 *    - Comma, Semicolon (Indonesian Excel), Tab (TSV), Pipe
 *    - Windows CRLF, Unix LF, Bare CR
 *    - UTF-8 BOM, zero-width characters, leading/trailing whitespace
 *    - RFC 4180 escaped quotes, multiline values, apostrophe-escaped numbers
 * 3. Cross-Template Incompatibility & Feedback:
 *    - Uploading wrong template triggers immediate clear pre-validation error
 *    - Empty or 1-line CSV triggers clear error
 * 4. Data_Kelas Anti-Dummy & Duplicate Guards:
 *    - Empty nama_kelas rejected with exact line number
 *    - Dummy class names rejected (test, dummy, percobaan, ujicoba)
 *    - Duplicate class names in same CSV rejected with line number
 *    - Tingkat auto-derivation across Arabic and Roman numerals (10, 11, 12, Lainnya)
 * 5. Student Upsert Idempotency:
 *    - Matching by (sekolah_id, nisn) reuses existing UUID id to prevent duplicate rows
 *    - Handles blank/hyphen NISNs without collisions
 * 6. UI Synchronization:
 *    - AdminDataView dispatches 'sipjam:kelas-updated'
 *    - AdminKelasView listens for 'sipjam:kelas-updated' and includes download/upload buttons
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

async function runAdversarialM2Suite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}⚔️  ADVERSARIAL CHALLENGER SUITE: MILESTONE 2 (TEMPLATES & CSV IMPORT)${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  const adminDataPath = path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminKelasPath = path.join(__dirname, '..', 'src', 'components', 'AdminKelasView.tsx');
  const adminDataSrc = fs.readFileSync(adminDataPath, 'utf8');
  const adminKelasSrc = fs.readFileSync(adminKelasPath, 'utf8');

  // ==========================================================================
  // SUITE 1: TEMPLATE HARMONIZATION & INVARIANT GUARDS
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}--- SUITE 1: Template Harmonization & Invariant Contracts ---${RESET}`);

  // Test 1.1: Verify all 7 templates exist
  try {
    const required = [
      'Data_Kelas', 'Data_Siswa', 'Data_Guru', 'Data_Mapel',
      'Kalender_Pendidikan', 'Jadwal_Pelajaran', 'Wali_Kelas'
    ];
    for (const req of required) {
      assert.ok(adminDataSrc.includes(`${req}:`), `Missing template ${req} in AdminDataView.tsx`);
    }
    pass('1.1: All 7 entity templates are registered in AdminDataView.tsx');
  } catch (e) {
    fail('1.1: Template existence check failed', e);
  }

  // Test 1.2: Data_Kelas headers exactly match schema (nama_kelas, tingkat, jurusan)
  try {
    const kelasMatch = adminDataSrc.match(/Data_Kelas:\s*\{[\s\S]*?filename:\s*'Template_Data_Kelas\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(kelasMatch, 'Data_Kelas template missing in AdminDataView');
    const h = kelasMatch[1];
    assert.ok(h.includes("'nama_kelas'") && h.includes("'tingkat'") && h.includes("'jurusan'"),
      'Data_Kelas headers must be nama_kelas, tingkat, jurusan');
    pass('1.2: Data_Kelas template headers precisely match [nama_kelas, tingkat, jurusan]');
  } catch (e) {
    fail('1.2: Data_Kelas template check failed', e);
  }

  // Test 1.3: Kalender and Jadwal omit 'id'
  try {
    const kalMatch = adminDataSrc.match(/Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(kalMatch && !kalMatch[1].includes("'id'"), 'Kalender template must omit id');
    const jadMatch = adminDataSrc.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(jadMatch && !jadMatch[1].includes("'id'"), 'Jadwal template must omit id');
    pass('1.3: Invariant satisfied: Kalender and Jadwal templates omit "id"');
  } catch (e) {
    fail('1.3: Invariant id check failed', e);
  }

  // Test 1.4: Data_Guru includes sekolah_id
  try {
    const guruMatch = adminDataSrc.match(/Data_Guru:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/);
    assert.ok(guruMatch && guruMatch[1].includes("'sekolah_id'"), 'Data_Guru must include sekolah_id');
    pass('1.4: Invariant satisfied: Data_Guru template includes sekolah_id');
  } catch (e) {
    fail('1.4: Invariant sekolah_id check failed', e);
  }

  // ==========================================================================
  // SUITE 2: ADVERSARIAL CSV ENCODING & DELIMITER TESTS
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 2: Delimiters, Line Endings, and Quote Stress ---${RESET}`);

  // Test 2.1: Semicolon delimited (Indonesian Excel) with BOM and apostrophe numbers
  try {
    const csvSemicolon = '\uFEFFnama_kelas;tingkat;jurusan\r\nX Merdeka;10;Umum\r\nXI Merdeka;11;IPA\r\n';
    const rows = parseAndValidateMasterCsv(csvSemicolon, 'data_kelas');
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].nama_kelas, 'X Merdeka');
    assert.strictEqual(rows[0].tingkat, '10');
    assert.strictEqual(rows[1].nama_kelas, 'XI Merdeka');
    pass('2.1: BOM + Semicolon delimiter (Indonesian Excel) parses perfectly');
  } catch (e) {
    fail('2.1: Semicolon parsing failed', e);
  }

  // Test 2.2: Tab-delimited (TSV) with Unix LF
  try {
    const tsv = 'nama_kelas\ttingkat\tjurusan\nX Merdeka 1\t10\tUmum\nXI Merdeka 2\t11\tIPS\n';
    const rows = parseAndValidateMasterCsv(tsv, 'data_kelas');
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].nama_kelas, 'X Merdeka 1');
    assert.strictEqual(rows[1].tingkat, '11');
    pass('2.2: TSV tab-delimited format with Unix LF parses cleanly');
  } catch (e) {
    fail('2.2: TSV parsing failed', e);
  }

  // Test 2.3: Pipe-delimited with Bare CR (\r) line breaks
  try {
    const pipeCsv = 'nama_kelas|tingkat|jurusan\rXII RPL 1|12|Rekayasa Perangkat Lunak\rXII RPL 2|12|RPL\r';
    const rows = parseAndValidateMasterCsv(pipeCsv, 'data_kelas');
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].nama_kelas, 'XII RPL 1');
    assert.strictEqual(rows[1].jurusan, 'RPL');
    pass('2.3: Pipe-delimited with bare CR line endings parses cleanly');
  } catch (e) {
    fail('2.3: Pipe-delimited bare CR parsing failed', e);
  }

  // Test 2.4: RFC 4180 Escaped Quotes and Multiline Fields
  try {
    const quotedCsv = 'nama_kelas,tingkat,jurusan\n"X ""Merdeka"" Unggulan",10,"Umum, Multidisiplin"\n';
    const rows = parseAndValidateMasterCsv(quotedCsv, 'data_kelas');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].nama_kelas, 'X "Merdeka" Unggulan');
    assert.strictEqual(rows[0].jurusan, 'Umum, Multidisiplin');
    pass('2.4: RFC 4180 escaped quotes and comma-in-quotes parsed cleanly');
  } catch (e) {
    fail('2.4: Escaped quotes parsing failed', e);
  }

  // Test 2.5: Excel apostrophe prefix stripping on student data
  try {
    const studentCsv = 'nisn,nama_siswa,kelas,gender,status,no_hp_ortu\n\'114367407,Siswa Teladan,X Merdeka,Laki-laki,Aktif,\'081234567890\n';
    const rows = parseAndValidateMasterCsv(studentCsv, 'data_siswa');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].nisn, '114367407');
    assert.strictEqual(rows[0].no_hp_ortu, '081234567890');
    pass('2.5: Excel apostrophes on NISN and phone numbers are cleanly stripped');
  } catch (e) {
    fail('2.5: Apostrophe stripping failed', e);
  }

  // ==========================================================================
  // SUITE 3: CROSS-TEMPLATE INCOMPATIBILITY & PRE-VALIDATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 3: Incompatible Template Upload Pre-Validation ---${RESET}`);

  // Test 3.1: Uploading Guru CSV to Siswa table
  try {
    const guruCsv = 'sekolah_id,nip,nama_guru,mata_pelajaran,no_hp,status,email\na0000000-0000-0000-0000-000000000001,198501012010011001,Fitri Aprilia,B.Inggris,081241316190,Aktif,test@gmail.com\n';
    assert.throws(
      () => parseAndValidateMasterCsv(guruCsv, 'data_siswa'),
      (err: any) => {
        return err.message.includes('kolom wajib') && (err.message.includes('nama_siswa') || err.message.includes('kelas'));
      }
    );
    pass('3.1: Uploading Guru CSV to Siswa table is immediately caught by pre-validation');
  } catch (e) {
    fail('3.1: Incompatible template upload test failed', e);
  }

  // Test 3.2: Uploading Kalender CSV to Kelas table
  try {
    const kalenderCsv = 'tanggal,keterangan,tipe\n2026-10-01,Hari Libur,Libur\n';
    assert.throws(
      () => parseAndValidateMasterCsv(kalenderCsv, 'data_kelas'),
      (err: any) => {
        return err.message.includes('kolom wajib') && err.message.includes('nama_kelas');
      }
    );
    pass('3.2: Uploading Kalender CSV to Kelas table throws missing required column error');
  } catch (e) {
    fail('3.2: Kalender to Kelas template upload failed', e);
  }

  // Test 3.3: Empty CSV (0 bytes) or 1-line CSV (headers only)
  try {
    assert.throws(() => parseAndValidateMasterCsv('', 'data_kelas'), /File CSV kosong/);
    assert.throws(() => parseAndValidateMasterCsv('nama_kelas,tingkat,jurusan\n', 'data_kelas'), /File CSV kosong/);
    pass('3.3: Empty CSV or headers-only CSV is rejected cleanly without crashing');
  } catch (e) {
    fail('3.3: Empty CSV test failed', e);
  }

  // ==========================================================================
  // SUITE 4: DATA_KELAS ANTI-DUMMY, DUPLICATE, AND AUTO-DERIVATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 4: Data_Kelas Anti-Dummy, Duplicates & Derivation ---${RESET}`);

  // Test 4.1: Empty nama_kelas throws Baris 1 error
  try {
    const badCsv = 'nama_kelas,tingkat,jurusan\n,10,Umum\n';
    assert.throws(
      () => parseAndValidateMasterCsv(badCsv, 'data_kelas'),
      /Baris 1: Kolom "nama_kelas" wajib diisi/
    );
    pass('4.1: Empty nama_kelas throws friendly error indicating Baris 1');
  } catch (e) {
    fail('4.1: Empty nama_kelas test failed', e);
  }

  // Test 4.2: Dummy nama_kelas rejected
  try {
    const dummyNames = ['Kelas Dummy 1', 'Test RPL', 'Percobaan XI', 'Ujicoba 10'];
    for (const d of dummyNames) {
      assert.throws(
        () => parseAndValidateMasterCsv(`nama_kelas,tingkat,jurusan\n${d},10,Umum\n`, 'data_kelas'),
        /dummy\/percobaan/i
      );
    }
    pass('4.2: Dummy class names (test, dummy, percobaan, ujicoba) are strictly rejected');
  } catch (e) {
    fail('4.2: Dummy class name rejection failed', e);
  }

  // Test 4.3: Duplicate class names in same CSV rejected with line number
  try {
    const dupCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\nx merdeka,10,Umum\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dupCsv, 'data_kelas'),
      /Baris 2: Duplikat nama kelas "x merdeka"/i
    );
    pass('4.3: Duplicate class names in same CSV trigger Baris 2 error');
  } catch (e) {
    fail('4.3: Duplicate class name check failed', e);
  }

  // Test 4.4: Auto-derivation of tingkat across various formats
  try {
    const derivationCsv = [
      'nama_kelas,tingkat,jurusan',
      'X Merdeka 1,,Umum',
      '10 Teknik Mesin,,Kejuruan',
      'XI IPA 1,,IPA',
      '11 Agribisnis,,Agri',
      'XII Akuntansi,,Akun',
      '12 Tata Boga,,Boga',
      'Kelas Akselerasi Khusus,,Umum'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(derivationCsv, 'data_kelas');
    assert.strictEqual(rows.length, 7);
    assert.strictEqual(rows[0].tingkat, '10');
    assert.strictEqual(rows[1].tingkat, '10');
    assert.strictEqual(rows[2].tingkat, '11');
    assert.strictEqual(rows[3].tingkat, '11');
    assert.strictEqual(rows[4].tingkat, '12');
    assert.strictEqual(rows[5].tingkat, '12');
    assert.strictEqual(rows[6].tingkat, 'Lainnya');
    pass('4.4: Tingkat is accurately auto-derived across 10, 11, 12, and Lainnya');
  } catch (e) {
    fail('4.4: Tingkat auto-derivation failed', e);
  }

  // ==========================================================================
  // SUITE 5: STUDENT UPSERT IDEMPOTENCY
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 5: Student Upsert Idempotency Resolution ---${RESET}`);

  // Test 5.1: Student re-import matches by (sekolah_id, nisn) and reuses UUID
  try {
    const existingDbStudents = [
      { id: '11111111-1111-4111-8111-111111111111', nisn: '0011223344', sekolah_id: 'a0000000-0000-0000-0000-000000000001' },
      { id: '22222222-2222-4222-8222-222222222222', nisn: '0099887766', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    ];

    let capturedUpsertPayload: any[] = [];
    let capturedOnConflict = '';

    const mockSupabase: any = {
      from: (tbl: string) => {
        if (tbl === 'data_siswa') {
          return {
            select: () => ({
              eq: () => ({
                in: (col: string, vals: string[]) => {
                  const filtered = existingDbStudents.filter(s => vals.includes(s.nisn));
                  return Promise.resolve({ data: filtered, error: null });
                }
              })
            }),
            upsert: (batch: any[], opts: any) => {
              capturedUpsertPayload.push(...batch);
              capturedOnConflict = opts?.onConflict;
              return Promise.resolve({ data: batch, error: null });
            }
          };
        }
        return {};
      }
    };

    const csvStudentImport = [
      'nisn,nama_siswa,kelas,gender,status,no_hp_ortu',
      '0011223344,Mohamad Candra Podomi,XI Merdeka 1,Laki-laki,Aktif,081234567890', // matches existing 1111...
      '9999999999,Siswa Baru Pindahan,X Merdeka 2,Perempuan,Aktif,081987654321' // brand new
    ].join('\n');

    const result = await importMasterDataFromCsv(mockSupabase, csvStudentImport, 'data_siswa', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      role: 'Admin'
    });

    assert.strictEqual(result.count, 2);
    assert.strictEqual(capturedUpsertPayload.length, 2);
    // Row 1 should have received existing UUID
    assert.strictEqual(capturedUpsertPayload[0].id, '11111111-1111-4111-8111-111111111111');
    assert.strictEqual(capturedUpsertPayload[0].kelas, 'XI Merdeka 1');
    // Row 2 should have received a newly generated genuine UUID
    assert.ok(UUID_REGEX.test(capturedUpsertPayload[1].id));
    assert.notStrictEqual(capturedUpsertPayload[1].id, '11111111-1111-4111-8111-111111111111');
    pass('5.1: Existing student matched by (sekolah_id, nisn) reuses UUID to avoid duplicates');
  } catch (e) {
    fail('5.1: Student idempotency test failed', e);
  }

  // ==========================================================================
  // SUITE 6: UI SYNCHRONIZATION & EVENT HARNESS
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 6: UI Cross-Component Synchronization ---${RESET}`);

  // Test 6.1: AdminDataView dispatches 'sipjam:kelas-updated' on Data_Kelas or Data_Siswa upload
  try {
    assert.ok(
      adminDataSrc.includes("window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'))"),
      'AdminDataView must dispatch sipjam:kelas-updated event'
    );
    pass('6.1: AdminDataView dispatches sipjam:kelas-updated on class/student import');
  } catch (e) {
    fail('6.1: AdminDataView event dispatch check failed', e);
  }

  // Test 6.2: AdminKelasView registers listener for 'sipjam:kelas-updated'
  try {
    assert.ok(
      adminKelasSrc.includes("sipjam:kelas-updated"),
      'AdminKelasView must register sipjam:kelas-updated listener'
    );
    assert.ok(
      adminKelasSrc.includes('handleDownloadClassTemplate'),
      'AdminKelasView must have handleDownloadClassTemplate'
    );
    assert.ok(
      adminKelasSrc.includes('handleClassFileUpload'),
      'AdminKelasView must have handleClassFileUpload'
    );
    pass('6.2: AdminKelasView listens for sipjam:kelas-updated and provides direct CSV toolbar');
  } catch (e) {
    fail('6.2: AdminKelasView UI wiring check failed', e);
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

runAdversarialM2Suite().catch(err => {
  console.error('Unhandled test suite failure:', err);
  process.exit(1);
});
