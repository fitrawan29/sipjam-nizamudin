import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { parseAndValidateMasterCsv } from '../../../src/lib/dataIntegrityGuard';

console.log('========================================================================');
console.log('🔍 REVIEWER M4 INDEPENDENT VERIFICATION & STRESS-TEST SUITE');
console.log('========================================================================\n');

const rootDir = path.resolve(__dirname, '../../..');

// -----------------------------------------------------------------------------
// CHECK 1: Master data CSV templates in AdminDataView.tsx
// -----------------------------------------------------------------------------
console.log('--- CHECK 1: Master Data CSV Templates in AdminDataView.tsx ---');
const adminDataViewPath = path.join(rootDir, 'src/components/AdminDataView.tsx');
const adminDataContent = fs.readFileSync(adminDataViewPath, 'utf8');

const kalenderSection = adminDataContent.match(/Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
assert.ok(kalenderSection, 'Kalender_Pendidikan template section must exist');
const kalenderHeaders = kalenderSection[1];
const kalenderSample = kalenderSection[2];

assert.ok(!kalenderHeaders.includes("'id'"), "Kalender_Pendidikan headers must NOT contain 'id'");
assert.ok(!kalenderSample.includes("'KP-01'"), "Kalender_Pendidikan sample must NOT contain 'KP-01'");
assert.ok(kalenderHeaders.includes("'tanggal'"), "Kalender_Pendidikan headers must contain 'tanggal'");
assert.ok(kalenderHeaders.includes("'keterangan'"), "Kalender_Pendidikan headers must contain 'keterangan'");
assert.ok(kalenderHeaders.includes("'tipe'"), "Kalender_Pendidikan headers must contain 'tipe'");
console.log('  ✔ [PASS] Kalender_Pendidikan template: headers omit id, sample omits KP-01');

const jadwalSection = adminDataContent.match(/Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/);
assert.ok(jadwalSection, 'Jadwal_Pelajaran template section must exist');
const jadwalHeaders = jadwalSection[1];
const jadwalSample = jadwalSection[2];

assert.ok(!jadwalHeaders.includes("'id'"), "Jadwal_Pelajaran headers must NOT contain 'id'");
assert.ok(!jadwalSample.includes("'JP-01'"), "Jadwal_Pelajaran sample must NOT contain 'JP-01'");
assert.ok(jadwalHeaders.includes("'hari'"), "Jadwal_Pelajaran headers must contain 'hari'");
assert.ok(jadwalHeaders.includes("'nama_guru'"), "Jadwal_Pelajaran headers must contain 'nama_guru'");
assert.ok(jadwalHeaders.includes("'mata_pelajaran'"), "Jadwal_Pelajaran headers must contain 'mata_pelajaran'");
assert.ok(jadwalHeaders.includes("'kelas'"), "Jadwal_Pelajaran headers must contain 'kelas'");
console.log('  ✔ [PASS] Jadwal_Pelajaran template: headers omit id, sample omits JP-01');

// -----------------------------------------------------------------------------
// CHECK 2: dataIntegrityGuard.ts UUID Sanitization & Error 22P02 Prevention
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 2: UUID Sanitization in dataIntegrityGuard.ts ---');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mockUser = { id: 'u1', sekolah_id: 'a0000000-0000-0000-0000-000000000001', role: 'Admin' };

// 2.1 Kalender Pendidikan with legacy 'KP-01'
const legacyKalenderCsv = `id,tanggal,keterangan,tipe\nKP-01,2026-10-01,Hari Kesaktian Pancasila,Libur\nKP-02,2026-10-28,Sumpah Pemuda,Kegiatan`;
const kalenderRows = parseAndValidateMasterCsv(legacyKalenderCsv, 'kalender_pendidikan', mockUser);
assert.strictEqual(kalenderRows.length, 2, 'Should parse 2 kalender rows');
assert.ok(UUID_REGEX.test(kalenderRows[0].id), `Row 0 ID must be a valid UUID, got: ${kalenderRows[0].id}`);
assert.ok(UUID_REGEX.test(kalenderRows[1].id), `Row 1 ID must be a valid UUID, got: ${kalenderRows[1].id}`);
assert.notStrictEqual(kalenderRows[0].id, kalenderRows[1].id, 'Each sanitized UUID must be unique');
assert.notStrictEqual(kalenderRows[0].id, 'KP-01', "Row 0 ID must not be 'KP-01'");
console.log('  ✔ [PASS] Legacy Kalender Pendidikan with KP-01 replaced with genuine UUIDs');

// 2.2 Kalender Pendidikan with new template (no id)
const newKalenderCsv = `tanggal,keterangan,tipe\n2026-12-25,Hari Natal,Libur`;
const newKalenderRows = parseAndValidateMasterCsv(newKalenderCsv, 'kalender_pendidikan', mockUser);
assert.strictEqual(newKalenderRows.length, 1);
assert.ok(UUID_REGEX.test(newKalenderRows[0].id), `New template row ID must be a valid UUID, got: ${newKalenderRows[0].id}`);
console.log('  ✔ [PASS] New Kalender Pendidikan without id column automatically assigned genuine UUID');

// 2.3 Jadwal Pelajaran with legacy 'JP-01'
const legacyJadwalCsv = `id,hari,nama_guru,mata_pelajaran,kelas\nJP-01,Senin,Fitri Aprilia Dotulong,Bahasa Inggris,X Merdeka`;
const jadwalRows = parseAndValidateMasterCsv(legacyJadwalCsv, 'jadwal_pelajaran', mockUser);
assert.strictEqual(jadwalRows.length, 1);
assert.ok(UUID_REGEX.test(jadwalRows[0].id), `Row 0 ID must be a valid UUID, got: ${jadwalRows[0].id}`);
assert.notStrictEqual(jadwalRows[0].id, 'JP-01');
console.log('  ✔ [PASS] Legacy Jadwal Pelajaran with JP-01 replaced with genuine UUID');

// 2.4 Jadwal Pelajaran with genuine existing UUID
const existingUuid = 'b1111111-2222-3333-4444-555555555555';
const validUuidJadwalCsv = `id,hari,nama_guru,mata_pelajaran,kelas\n${existingUuid},Selasa,Fitri Aprilia Dotulong,Bahasa Inggris,XI Merdeka`;
const validJadwalRows = parseAndValidateMasterCsv(validUuidJadwalCsv, 'jadwal_pelajaran', mockUser);
assert.strictEqual(validJadwalRows[0].id, existingUuid, 'Valid UUID should be preserved as-is');
console.log('  ✔ [PASS] Genuine existing UUID preserved in Jadwal Pelajaran');

// 2.5 Data Siswa, Wali Kelas, Sistem Blok with non-UUID string
const tables = ['data_siswa', 'wali_kelas', 'sistem_blok'];
for (const tbl of tables) {
  const csv = `id,dummy_col\nNON-UUID-STRING,value`;
  const res = parseAndValidateMasterCsv(csv, tbl, mockUser);
  assert.ok(UUID_REGEX.test(res[0].id), `${tbl} must sanitize non-UUID to valid UUID`);
}
console.log('  ✔ [PASS] data_siswa, wali_kelas, sistem_blok successfully sanitize non-UUID strings');

// 2.6 Data Guru strict validation (should throw on invalid UUID, NOT silently replace)
let guruThrew = false;
try {
  parseAndValidateMasterCsv('id,sekolah_id,nama_guru\nNOT-A-UUID,a0000000-0000-0000-0000-000000000001,Guru Budi', 'data_guru', mockUser);
} catch (e: any) {
  guruThrew = true;
  assert.ok(e.message.includes('tidak valid. Harus berupa format UUID'));
}
assert.ok(guruThrew, 'data_guru with invalid UUID MUST throw validation error');
console.log('  ✔ [PASS] data_guru strictly enforces valid UUID syntax without silent bypass');

// 2.7 Data Mapel non-UUID text key preservation (e.g. MP-01)
const mapelCsv = `id,nama_mata_pelajaran,kategori\nMP-01,Matematika Wajib,Umum`;
const mapelRows = parseAndValidateMasterCsv(mapelCsv, 'data_mata_pelajaran', mockUser);
assert.strictEqual(mapelRows[0].id, 'MP-01', "Text primary key 'MP-01' must be preserved for data_mata_pelajaran");
console.log('  ✔ [PASS] data_mata_pelajaran preserves text primary key MP-01');

// -----------------------------------------------------------------------------
// CHECK 3: AdminConfigView.tsx noValidate and Sekolah Persistence
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 3: AdminConfigView.tsx Form & Persistence ---');
const configViewPath = path.join(rootDir, 'src/components/AdminConfigView.tsx');
const configContent = fs.readFileSync(configViewPath, 'utf8');

// Check noValidate on <form>
const formMatch = configContent.match(/<form[\s\S]*?onSubmit=\{handleSave\}[\s\S]*?>/);
assert.ok(formMatch, '<form onSubmit={handleSave}> must exist');
assert.ok(formMatch[0].includes('noValidate'), "form must have 'noValidate' attribute to prevent hidden input submission blockage");
console.log('  ✔ [PASS] form element includes noValidate attribute');

// Check updatePayload properties
assert.ok(configContent.includes('updatePayload.nama = saveConfig.kop_sekolah'), 'updatePayload.nama must sync kop_sekolah');
assert.ok(configContent.includes('updatePayload.alamat = saveConfig.kop_alamat'), 'updatePayload.alamat must sync kop_alamat');
assert.ok(configContent.includes('updatePayload.npsn = saveConfig.kop_npsn'), 'updatePayload.npsn must sync kop_npsn');
assert.ok(configContent.includes('updatePayload.kota_kabupaten = cityValue'), 'updatePayload.kota_kabupaten must sync cityValue');
assert.ok(configContent.includes('updatePayload.logo_kiri_url = saveConfig.logo_kiri'), 'updatePayload.logo_kiri_url must sync logo_kiri');
assert.ok(configContent.includes('updatePayload.logo_kanan_url = saveConfig.logo_kanan'), 'updatePayload.logo_kanan_url must sync logo_kanan');
assert.ok(configContent.includes('updatePayload.logo_url = saveConfig.logo_kiri || saveConfig.logo_kanan'), 'updatePayload.logo_url must sync logo');
assert.ok(
  /\.from\('sekolah'\)\s*\.update\(updatePayload\)\s*\.eq\('id',\s*targetSekolahId\)/.test(configContent),
  'Must execute update on sekolah table'
);
console.log('  ✔ [PASS] updatePayload syncs all school profile fields to sekolah table');

// Check fetchConfig pre-population
assert.ok(
  /\.from\('sekolah'\)\s*\.select\([\s\S]*?nama[\s\S]*?alamat[\s\S]*?npsn[\s\S]*?kota_kabupaten/.test(configContent),
  'fetchConfig must query sekolah table'
);
console.log('  ✔ [PASS] fetchConfig pre-populates school identity fields from sekolah table');

// -----------------------------------------------------------------------------
// CHECK 4: AccountSettingsModal.tsx Multi-Gelar Removal & Single Nama Lengkap
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 4: AccountSettingsModal.tsx Multi-Gelar Removal ---');
const accountModalPath = path.join(rootDir, 'src/components/AccountSettingsModal.tsx');
const accountContent = fs.readFileSync(accountModalPath, 'utf8');

// Strip JSX comments before checking for active UI elements
const contentWithoutComments = accountContent.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// Verify active UI removal
assert.ok(!contentWithoutComments.includes("onClick={() => addTitle("), 'Interactive addTitle button must be removed');
assert.ok(!contentWithoutComments.includes("onClick={() => removeTitle("), 'Interactive removeTitle button must be removed');
assert.ok(!contentWithoutComments.includes("Pilihan Cepat:"), 'Quick choice chips must be removed from rendered JSX');
assert.ok(!contentWithoutComments.includes("Preview Nama Lengkap Terformat:"), 'Interactive live preview card must be removed from JSX flow');
assert.ok(!contentWithoutComments.includes("Gelar Akademik & Profesi"), 'Gelar section label must be removed from rendered JSX');
assert.ok(!contentWithoutComments.includes("Tambah Gelar"), 'Tambah Gelar button must be removed from rendered JSX');

// Verify single Nama Lengkap * input
assert.ok(contentWithoutComments.includes('Nama Lengkap *'), "Form must contain 'Nama Lengkap *' label");
assert.ok(!contentWithoutComments.includes('Nama Pokok (Tanpa Gelar) *'), "Old label 'Nama Pokok (Tanpa Gelar) *' must be replaced");

// Verify handleSave saves directly without combining titles
const saveHandlerMatch = accountContent.match(/const cleanNama = normalizeName\(effectiveCoreNama\);/);
assert.ok(saveHandlerMatch, 'handleSave must directly normalize effectiveCoreNama without formatFullName appending titles');
console.log('  ✔ [PASS] Multi-Gelar manager removed from active UI and single Nama Lengkap * input functioning directly');

console.log('\n========================================================================');
console.log('🎉 ALL REVIEWER CHECKS AND STRESS-TESTS PASSED (0 FAILURES)');
console.log('========================================================================');
