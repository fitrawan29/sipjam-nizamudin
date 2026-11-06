/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE: MILESTONE M4 (R5)
 * Master Data Templates, System & DB Persistence, & Account Settings
 *
 * File: tests/adversarial_o27_m4_challenger.test.ts
 *
 * Scope:
 * 1. CSV Template Parsing and UUID Sanitization Edge Cases:
 *    - Legacy 'KP-01', 'JP-01' IDs
 *    - Empty string IDs ("")
 *    - Completely missing ID column
 *    - Valid UUID IDs (lowercase, uppercase, mixed)
 *    - Null / undefined string IDs
 *    - Verify 100% of generated/retained IDs are valid UUIDs, never triggering Postgres 22P02
 *    - Verify AdminDataView template headers & samples omit legacy string IDs
 * 2. AdminConfigView Form Submission & Multi-Tab Persistence:
 *    - Verify `noValidate` attribute on `<form>` to prevent hidden-field submission blocking
 *    - Verify `updatePayload` for `sekolah` table contains:
 *      nama, alamat, npsn, kota_kabupaten, logo_kiri_url, logo_kanan_url, logo_url
 * 3. AccountSettingsModal Degree Simplification:
 *    - Verify NO interactive buttons to add gelar exist in JSX DOM
 *    - Verify single `Nama Lengkap *` input works cleanly
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import { parseAndValidateMasterCsv } from '../src/lib/dataIntegrityGuard';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: { id: string; desc: string; error: any }[] = [];

function pass(id: string, desc: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${desc}`);
  if (detail) {
    console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  }
}

function fail(id: string, desc: string, error?: any) {
  totalTests++;
  failedTests++;
  const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  failures.push({ id, desc, error: errMsg });
  console.log(`  ${RED}✖ [${id}] FAIL:${RESET} ${desc}`);
  if (errMsg) {
    console.log(`    ${RED}↳ Error: ${errMsg}${RESET}`);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function runAdversarialM4Suite() {
  console.log(`${BOLD}${CYAN}=====================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE: MILESTONE M4 (R5)    ${RESET}`);
  console.log(`${BOLD}${CYAN}=====================================================================${RESET}\n`);

  // ========================================================================
  // AREA 1: CSV TEMPLATE PARSING & UUID SANITIZATION EDGE CASES
  // ========================================================================
  console.log(`${BOLD}1. CSV Template Parsing & UUID Sanitization Edge Cases${RESET}`);

  // Test 1.1: Kalender Pendidikan with legacy 'KP-01' ID
  try {
    const csvLegacy = 'id,tanggal,keterangan,tipe\nKP-01,2026-10-01,Hari Libur Nasional,Libur';
    const rows = parseAndValidateMasterCsv(csvLegacy, 'kalender_pendidikan');
    assert.strictEqual(rows.length, 1);
    assert.notStrictEqual(rows[0].id, 'KP-01', 'Legacy KP-01 must be replaced');
    assert.ok(UUID_REGEX.test(rows[0].id), `ID "${rows[0].id}" must be a valid UUID`);
    pass('CSV-01', 'Kalender Pendidikan with legacy "KP-01" converts to valid UUID without throwing 22P02', `Sanitized to: ${rows[0].id}`);
  } catch (err) {
    fail('CSV-01', 'Kalender Pendidikan with legacy "KP-01" failed', err);
  }

  // Test 1.2: Kalender Pendidikan with empty string ID ("")
  try {
    const csvEmpty = 'id,tanggal,keterangan,tipe\n"",2026-10-02,Cuti Bersama,Libur';
    const rows = parseAndValidateMasterCsv(csvEmpty, 'kalender_pendidikan');
    assert.strictEqual(rows.length, 1);
    assert.ok(rows[0].id, 'Row ID must not be empty');
    assert.ok(UUID_REGEX.test(rows[0].id), `ID "${rows[0].id}" must be a valid UUID`);
    pass('CSV-02', 'Kalender Pendidikan with empty string ID generates a valid UUID', `Generated: ${rows[0].id}`);
  } catch (err) {
    fail('CSV-02', 'Kalender Pendidikan with empty string ID failed', err);
  }

  // Test 1.3: Kalender Pendidikan without ID column at all
  try {
    const csvNoId = 'tanggal,keterangan,tipe\n2026-10-03,Hari Guru Nasional,Kegiatan';
    const rows = parseAndValidateMasterCsv(csvNoId, 'kalender_pendidikan');
    assert.strictEqual(rows.length, 1);
    assert.ok(rows[0].id, 'Row ID must be auto-generated when column is absent');
    assert.ok(UUID_REGEX.test(rows[0].id), `ID "${rows[0].id}" must be a valid UUID`);
    pass('CSV-03', 'Kalender Pendidikan without ID column auto-generates a valid UUID', `Auto-generated: ${rows[0].id}`);
  } catch (err) {
    fail('CSV-03', 'Kalender Pendidikan without ID column failed', err);
  }

  // Test 1.4: Kalender Pendidikan with valid UUID ID
  try {
    const originalUuid = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    const csvValid = `id,tanggal,keterangan,tipe\n${originalUuid},2026-10-04,Ujian Semester,Kegiatan`;
    const rows = parseAndValidateMasterCsv(csvValid, 'kalender_pendidikan');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id.toLowerCase(), originalUuid.toLowerCase(), 'Valid UUID must be preserved');
    pass('CSV-04', 'Kalender Pendidikan with valid UUID preserves the given UUID cleanly', `Preserved: ${rows[0].id}`);
  } catch (err) {
    fail('CSV-04', 'Kalender Pendidikan with valid UUID failed', err);
  }

  // Test 1.5: Jadwal Pelajaran with legacy 'JP-01', empty id, and without id column
  try {
    const jpLegacy = 'id,hari,nama_guru,mata_pelajaran,kelas\nJP-01,Senin,Fitri Aprilia Dotulong,Bahasa Inggris,X Merdeka';
    const rLegacy = parseAndValidateMasterCsv(jpLegacy, 'jadwal_pelajaran');
    assert.notStrictEqual(rLegacy[0].id, 'JP-01');
    assert.ok(UUID_REGEX.test(rLegacy[0].id), 'Jadwal Pelajaran legacy ID must be replaced with valid UUID');

    const jpEmpty = 'id,hari,nama_guru,mata_pelajaran,kelas\n,Selasa,Fitri Aprilia Dotulong,Bahasa Inggris,X Merdeka';
    const rEmpty = parseAndValidateMasterCsv(jpEmpty, 'jadwal_pelajaran');
    assert.ok(UUID_REGEX.test(rEmpty[0].id), 'Jadwal Pelajaran empty ID must generate valid UUID');

    const jpNoId = 'hari,nama_guru,mata_pelajaran,kelas\nRabu,Fitri Aprilia Dotulong,Bahasa Inggris,X Merdeka';
    const rNoId = parseAndValidateMasterCsv(jpNoId, 'jadwal_pelajaran');
    assert.ok(UUID_REGEX.test(rNoId[0].id), 'Jadwal Pelajaran without ID column must generate valid UUID');

    pass('CSV-05', 'Jadwal Pelajaran edge cases (JP-01, empty, no ID column) all result in valid UUIDs', `Outputs: ${rLegacy[0].id}, ${rEmpty[0].id}, ${rNoId[0].id}`);
  } catch (err) {
    fail('CSV-05', 'Jadwal Pelajaran edge cases failed', err);
  }

  // Test 1.6: Adversarial edge cases: "null", "undefined", whitespace-only, malformed strings
  try {
    const adversarialCsv = [
      'id,tanggal,keterangan,tipe',
      'null,2026-11-01,A,Libur',
      'undefined,2026-11-02,B,Libur',
      '   ,2026-11-03,C,Libur',
      'INVALID-UUID-12345,2026-11-04,D,Libur',
      '123e4567-e89b-12d3-a456-426614174000,2026-11-05,E,Libur'
    ].join('\n');

    const advRows = parseAndValidateMasterCsv(adversarialCsv, 'kalender_pendidikan');
    assert.strictEqual(advRows.length, 5);
    for (let i = 0; i < advRows.length; i++) {
      assert.ok(UUID_REGEX.test(advRows[i].id), `Row ${i + 1} ID "${advRows[i].id}" must be a valid UUID`);
    }
    assert.strictEqual(advRows[4].id.toLowerCase(), '123e4567-e89b-12d3-a456-426614174000');
    pass('CSV-06', 'Adversarial strings ("null", "undefined", whitespace, malformed) sanitized to UUIDs', `All 5 rows have valid UUIDs`);
  } catch (err) {
    fail('CSV-06', 'Adversarial strings sanitization failed', err);
  }

  // Test 1.7: Template inspection in AdminDataView.tsx
  try {
    const adminDataPath = path.resolve('src/components/AdminDataView.tsx');
    const adminDataContent = fs.readFileSync(adminDataPath, 'utf8');

    // Extract Kalender_Pendidikan template definition
    const kalenderMatch = adminDataContent.match(/Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[(.*?)\][\s\S]*?sample:\s*\[(.*?)\]/);
    assert.ok(kalenderMatch, 'Kalender_Pendidikan template definition must exist');
    const kalenderHeaders = kalenderMatch[1];
    const kalenderSample = kalenderMatch[2];
    assert.ok(!kalenderHeaders.includes("'id'") && !kalenderHeaders.includes('"id"'), 'Kalender_Pendidikan headers must NOT include id');
    assert.ok(!kalenderSample.includes('KP-01'), 'Kalender_Pendidikan sample must NOT include KP-01');

    // Extract Jadwal_Pelajaran template definition
    const jadwalMatch = adminDataContent.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[(.*?)\][\s\S]*?sample:\s*\[(.*?)\]/);
    assert.ok(jadwalMatch, 'Jadwal_Pelajaran template definition must exist');
    const jadwalHeaders = jadwalMatch[1];
    const jadwalSample = jadwalMatch[2];
    assert.ok(!jadwalHeaders.includes("'id'") && !jadwalHeaders.includes('"id"'), 'Jadwal_Pelajaran headers must NOT include id');
    assert.ok(!jadwalSample.includes('JP-01'), 'Jadwal_Pelajaran sample must NOT include JP-01');

    pass('CSV-07', 'AdminDataView templates for Kalender & Jadwal cleanly omit "id" and legacy "KP-01"/"JP-01"', 'Clean download templates verified');
  } catch (err) {
    fail('CSV-07', 'AdminDataView template inspection failed', err);
  }

  // ========================================================================
  // AREA 2: ADMIN CONFIG VIEW FORM SUBMISSION & MULTI-TAB PERSISTENCE
  // ========================================================================
  console.log(`\n${BOLD}2. AdminConfigView Form Submission & Multi-Tab Persistence${RESET}`);

  const adminConfigPath = path.resolve('src/components/AdminConfigView.tsx');
  const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf8');

  // Test 2.1: Verify noValidate attribute on <form>
  try {
    const formRegex = /<form\s+[^>]*onSubmit=\{handleSave\}[^>]*>/;
    const formMatch = adminConfigContent.match(formRegex);
    assert.ok(formMatch, '<form onSubmit={handleSave}> must exist in AdminConfigView.tsx');
    assert.ok(formMatch[0].includes('noValidate'), `<form> must contain noValidate to prevent silent submit abortion on hidden tabs. Found: ${formMatch[0]}`);
    pass('FORM-01', '<form onSubmit={handleSave}> has noValidate attribute', formMatch[0].trim());
  } catch (err) {
    fail('FORM-01', 'Form noValidate attribute check failed', err);
  }

  // Test 2.2: Verify updatePayload contains all school identity fields
  try {
    const requiredFields = [
      'nama',
      'alamat',
      'npsn',
      'kota_kabupaten',
      'logo_kiri_url',
      'logo_kanan_url',
      'logo_url',
      'nama_kepala_sekolah',
      'nip_kepala_sekolah',
      'kepala_sekolah_id'
    ];

    const missingFields: string[] = [];
    for (const field of requiredFields) {
      const hasProp =
        adminConfigContent.includes(`updatePayload.${field}`) ||
        adminConfigContent.includes(`${field}:`);
      if (!hasProp) {
        missingFields.push(field);
      }
    }

    assert.strictEqual(missingFields.length, 0, `Missing required fields in updatePayload: ${missingFields.join(', ')}`);

    // Verify exact assignments
    assert.ok(adminConfigContent.includes('updatePayload.nama = saveConfig.kop_sekolah'), 'updatePayload.nama must be assigned from kop_sekolah');
    assert.ok(adminConfigContent.includes('updatePayload.alamat = saveConfig.kop_alamat'), 'updatePayload.alamat must be assigned from kop_alamat');
    assert.ok(adminConfigContent.includes('updatePayload.npsn = saveConfig.kop_npsn'), 'updatePayload.npsn must be assigned from kop_npsn');
    assert.ok(adminConfigContent.includes('updatePayload.kota_kabupaten = cityValue'), 'updatePayload.kota_kabupaten must be assigned from cityValue');
    assert.ok(adminConfigContent.includes('updatePayload.logo_kiri_url = saveConfig.logo_kiri'), 'updatePayload.logo_kiri_url must be assigned from logo_kiri');
    assert.ok(adminConfigContent.includes('updatePayload.logo_kanan_url = saveConfig.logo_kanan'), 'updatePayload.logo_kanan_url must be assigned from logo_kanan');
    assert.ok(adminConfigContent.includes('updatePayload.logo_url = saveConfig.logo_kiri || saveConfig.logo_kanan'), 'updatePayload.logo_url must be assigned from logos');

    pass('FORM-02', 'updatePayload properly synchronizes all 10 school identity fields to "sekolah" table', 'All fields confirmed');
  } catch (err) {
    fail('FORM-02', 'updatePayload fields verification failed', err);
  }

  // Test 2.3: Verify Supabase call targets sekolah table with updatePayload
  try {
    const supabaseSekolahCall = adminConfigContent.includes(".from('sekolah')") &&
      adminConfigContent.includes('.update(updatePayload)') &&
      adminConfigContent.includes(".eq('id', targetSekolahId)");
    assert.ok(supabaseSekolahCall, "AdminConfigView must call supabase.from('sekolah').update(updatePayload).eq('id', targetSekolahId)");
    pass('FORM-03', 'AdminConfigView persists updatePayload directly to Supabase "sekolah" table', "Confirmed .update(updatePayload).eq('id', targetSekolahId)");
  } catch (err) {
    fail('FORM-03', 'Supabase sekolah update call verification failed', err);
  }

  // ========================================================================
  // AREA 3: ACCOUNT SETTINGS MODAL DEGREE SIMPLIFICATION
  // ========================================================================
  console.log(`\n${BOLD}3. AccountSettingsModal Degree Simplification${RESET}`);

  const accountModalPath = path.resolve('src/components/AccountSettingsModal.tsx');
  const accountModalContent = fs.readFileSync(accountModalPath, 'utf8');

  // Test 3.1: Search JSX/DOM for interactive buttons to add gelar
  try {
    const forbiddenPatterns = [
      /<button[^>]*>[^<]*\+?\s*Tambah Gelar[^<]*<\/button>/i,
      /<button[^>]*onClick=\{[^}]*addTitle[^}]*\}/i,
      /<button[^>]*onClick=\{[^}]*handleAddTitle[^}]*\}/i,
      /<button[^>]*onClick=\{[^}]*removeTitle[^}]*\}/i,
      /<select[^>]*name="prefix_suffix"[^>]*>/i,
      /<div[^>]*className="[^"]*multi-gelar-manager[^"]*"/i
    ];

    const activeViolations: string[] = [];
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(accountModalContent)) {
        activeViolations.push(pattern.toString());
      }
    }

    assert.strictEqual(activeViolations.length, 0, `Found forbidden degree manager buttons/elements: ${activeViolations.join(', ')}`);
    pass('ACCOUNT-01', 'No interactive buttons to add or manage degrees exist in AccountSettingsModal JSX', 'All forbidden degree UI controls absent');
  } catch (err) {
    fail('ACCOUNT-01', 'Interactive degree buttons check failed', err);
  }

  // Test 3.2: Verify single "Nama Lengkap *" input exists and binds cleanly
  try {
    assert.ok(accountModalContent.includes('Nama Lengkap *'), 'AccountSettingsModal must include label "Nama Lengkap *"');
    assert.ok(accountModalContent.includes('value={nama}'), 'Name input must bind directly to value={nama}');
    assert.ok(
      accountModalContent.includes('setNama(e.target.value)'),
      'Name input must update state on change'
    );
    pass('ACCOUNT-02', 'Single "Nama Lengkap *" input exists and binds directly to state', 'Clean single-field input verified');
  } catch (err) {
    fail('ACCOUNT-02', 'Single Nama Lengkap input verification failed', err);
  }

  // Test 3.3: Verify handleSave saves nama directly without degree reconstruction
  try {
    assert.ok(accountModalContent.includes('const effectiveCoreNama = (nama || \'\').trim()'), 'Calculates effectiveCoreNama from direct inputs');
    assert.ok(accountModalContent.includes('const cleanNama = normalizeName(effectiveCoreNama)'), 'Normalizes effectiveCoreNama cleanly');
    assert.ok(accountModalContent.includes('p_nama: cleanNama || user.nama'), 'RPC payload persists direct normalized name');
    assert.ok(accountModalContent.includes('nama: cleanNama || user.nama'), 'State/Storage persists direct normalized name');
    pass('ACCOUNT-03', 'handleSave persists direct user name without forced title concatenation', 'Clean save handler verified');
  } catch (err) {
    fail('ACCOUNT-03', 'Direct name persistence check failed', err);
  }

  // ========================================================================
  // SUMMARY REPORT
  // ========================================================================
  console.log(`\n${BOLD}${CYAN}=====================================================================${RESET}`);
  console.log(`${BOLD}SUMMARY:${RESET} Total: ${totalTests} | ${GREEN}Passed: ${passedTests}${RESET} | ${RED}Failed: ${failedTests}${RESET}`);
  console.log(`${BOLD}${CYAN}=====================================================================${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${RED}Adversarial suite encountered ${failedTests} failure(s).${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}ALL ADVERSARIAL CHALLENGE TESTS PASSED SUCCESSFULLY!${RESET}`);
  }
}

runAdversarialM4Suite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
