/**
 * Automated Verification: Master Data CSV Export for All 9 Tabs
 * 
 * Verifies:
 * 1. RFC 4180 CSV escaping engine (escapeCsvField, generateCsvString) with UTF-8 BOM.
 * 2. Complete and accurate CSV generation for all 9 Master Data tabs:
 *    - Siswa (Data_Siswa)
 *    - Kelas (Data_Kelas)
 *    - Mapel (Data_Mapel)
 *    - Guru (Data_Guru)
 *    - Jadwal Pelajaran (Jadwal_Pelajaran)
 *    - Wali Kelas (Wali_Kelas)
 *    - Pengguna (Pengguna)
 *    - Kalender Pendidikan (Kalender_Pendidikan)
 *    - Sistem Blok (sistem_blok)
 * 3. Tab alias normalization (e.g., 'siswa', 'classes', 'mapel', 'teachers', 'schedule', 'homeroom', 'users', 'calendar', 'blok').
 * 4. Special characters & escaping (commas in names/titles, internal quotes, newlines, semicolons).
 * 5. Edge cases (empty array, null fields, undefined values).
 * 6. Compatibility with parseAndValidateMasterCsv from dataIntegrityGuard.
 * 7. AST/Source code verification of UI integration across AdminDataView, AdminKelasView, AdminPenggunaView, and SistemBlokView.
 * 8. Zero third-party dependency additions in package.json.
 */

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  escapeCsvField,
  generateCsvString,
  normalizeMasterTabKey,
  generateMasterDataCsv,
  downloadMasterDataCsv,
  MASTER_DATA_EXPORT_DEFINITIONS
} from '../src/lib/csvExport';
import { parseAndValidateMasterCsv } from '../src/lib/dataIntegrityGuard';

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

async function runMasterDataExportTests() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}🧪 TEST SUITE: MASTER DATA CSV EXPORT FOR ALL 9 TABS${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  // ==========================================================================
  // SECTION 1: CSV Escaping & BOM Engine
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}--- SECTION 1: CSV Escaping & Encoding Engine ---${RESET}`);

  try {
    assert.strictEqual(escapeCsvField('Hello'), 'Hello');
    assert.strictEqual(escapeCsvField(''), '');
    assert.strictEqual(escapeCsvField(null), '');
    assert.strictEqual(escapeCsvField(undefined), '');
    assert.strictEqual(escapeCsvField(123), '123');
    assert.strictEqual(escapeCsvField(true), 'true');
    pass('1.1: escapeCsvField handles primitive literals, null, and undefined cleanly');
  } catch (e) {
    fail('1.1: escapeCsvField primitive handling failed', e);
  }

  try {
    // Comma in name/title
    assert.strictEqual(
      escapeCsvField('Fitri Aprilia Dotulong, S.Pd.'),
      '"Fitri Aprilia Dotulong, S.Pd."'
    );
    // Double quotes in value
    assert.strictEqual(
      escapeCsvField('Kelas "Unggulan" A'),
      '"Kelas ""Unggulan"" A"'
    );
    // Newline in description
    assert.strictEqual(
      escapeCsvField('Baris 1\nBaris 2'),
      '"Baris 1\nBaris 2"'
    );
    // Semicolon in value
    assert.strictEqual(
      escapeCsvField('Matematika; Fisika'),
      '"Matematika; Fisika"'
    );
    pass('1.2: escapeCsvField properly quotes and escapes commas, internal quotes, newlines, and semicolons');
  } catch (e) {
    fail('1.2: escapeCsvField special characters escaping failed', e);
  }

  try {
    const headers = ['nama', 'kelas'];
    const rows = [['Fitra, S.Pd.', 'X Merdeka']];
    const csv = generateCsvString(headers, rows);
    assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
    assert.ok(csv.includes('"Fitra, S.Pd.",X Merdeka'), 'Row must contain escaped comma');
    pass('1.3: generateCsvString prepends UTF-8 BOM for Excel compatibility');
  } catch (e) {
    fail('1.3: generateCsvString BOM verification failed', e);
  }

  // ==========================================================================
  // SECTION 2: Master Data Export for All 9 Tabs
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 2: CSV Export for All 9 Master Data Tabs ---${RESET}`);

  // Tab 1: Siswa
  try {
    const studentSample = [
      {
        nisn: '0114367407',
        nama_siswa: 'Moh. Candra Podomi, Jr.',
        kelas: 'X Merdeka',
        gender: 'Laki-laki',
        agama: 'Islam',
        status: 'Aktif',
        no_hp_ortu: '081234567890'
      }
    ];
    const res = generateMasterDataCsv('Data_Siswa', studentSample);
    assert.strictEqual(res.filename, 'Data_Siswa.csv');
    assert.deepStrictEqual(res.headers, ['nisn', 'nama_siswa', 'kelas', 'gender', 'agama', 'status', 'no_hp_ortu']);
    assert.strictEqual(res.rowCount, 1);
    assert.ok(res.csv.includes('"Moh. Candra Podomi, Jr."'));
    assert.ok(res.csv.includes('0114367407'));
    pass('2.1: Tab Siswa (Data_Siswa) exports accurate columns, filename, and properly escaped fields');
  } catch (e) {
    fail('2.1: Tab Siswa export failed', e);
  }

  // Tab 2: Kelas
  try {
    const classSample = [
      {
        nama_kelas: 'X Merdeka 1',
        tingkat: '10',
        jurusan: 'Umum, Pilihan',
        wali_kelas: 'Fitri Aprilia Dotulong, S.Pd.',
        totalSiswa: 32
      }
    ];
    const res = generateMasterDataCsv('Data_Kelas', classSample);
    assert.strictEqual(res.filename, 'Data_Kelas.csv');
    assert.deepStrictEqual(res.headers, ['nama_kelas', 'tingkat', 'jurusan', 'wali_kelas', 'total_siswa']);
    assert.strictEqual(res.rowCount, 1);
    assert.ok(res.csv.includes('X Merdeka 1,10,"Umum, Pilihan","Fitri Aprilia Dotulong, S.Pd.",32'));
    pass('2.2: Tab Kelas (Data_Kelas) exports correct columns and counts');
  } catch (e) {
    fail('2.2: Tab Kelas export failed', e);
  }

  // Tab 3: Mapel
  try {
    const mapelSample = [
      {
        id: 'MP-01',
        nama_mata_pelajaran: 'Bahasa Indonesia, KBM Wajib',
        kategori: 'Umum',
        kelompok: 'Wajib'
      }
    ];
    const res = generateMasterDataCsv('Data_Mapel', mapelSample);
    assert.strictEqual(res.filename, 'Data_Mapel.csv');
    assert.deepStrictEqual(res.headers, ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok']);
    assert.ok(res.csv.includes('MP-01,"Bahasa Indonesia, KBM Wajib",Umum,Wajib'));
    pass('2.3: Tab Mapel (Data_Mapel) exports ID, nama mata pelajaran, kategori, dan kelompok');
  } catch (e) {
    fail('2.3: Tab Mapel export failed', e);
  }

  // Tab 4: Guru
  try {
    const guruSample = [
      {
        sekolah_id: 'a0000000-0000-0000-0000-000000000001',
        nip: '198501012010011001',
        nama_guru: 'Dewi Sartika, S.Pd., M.Pd.',
        mata_pelajaran: 'Bahasa Inggris, Sastra',
        no_hp: '081241316190',
        status: 'Aktif',
        email: 'dewi@example.com'
      }
    ];
    const res = generateMasterDataCsv('Data_Guru', guruSample, {
      schoolId: 'a0000000-0000-0000-0000-000000000001'
    });
    assert.strictEqual(res.filename, 'Data_Guru.csv');
    assert.deepStrictEqual(res.headers, ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']);
    assert.ok(res.csv.includes('"Dewi Sartika, S.Pd., M.Pd."'));
    assert.ok(res.csv.includes('"Bahasa Inggris, Sastra"'));
    pass('2.4: Tab Guru (Data_Guru) exports complete teacher credentials and contacts');
  } catch (e) {
    fail('2.4: Tab Guru export failed', e);
  }

  // Tab 5: Jadwal Pelajaran
  try {
    const jadwalSample = [
      {
        hari: 'Senin',
        nama_guru: 'Dewi Sartika, S.Pd.',
        mata_pelajaran: 'Bahasa Inggris',
        kelas: 'X Merdeka',
        jam_mulai: '07:30',
        jam_selesai: '09:00'
      }
    ];
    const res = generateMasterDataCsv('Jadwal_Pelajaran', jadwalSample);
    assert.strictEqual(res.filename, 'Data_Jadwal_Pelajaran.csv');
    assert.deepStrictEqual(res.headers, ['hari', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_mulai', 'jam_selesai']);
    assert.ok(res.csv.includes('Senin,"Dewi Sartika, S.Pd.",Bahasa Inggris,X Merdeka,07:30,09:00'));
    pass('2.5: Tab Jadwal Pelajaran (Jadwal_Pelajaran) exports schedule time slots and teacher assignments');
  } catch (e) {
    fail('2.5: Tab Jadwal Pelajaran export failed', e);
  }

  // Tab 6: Wali Kelas
  try {
    const waliSample = [
      {
        kelas: 'X Merdeka',
        nama_guru: 'Dewi Sartika, S.Pd.',
        nip: '198501012010011001',
        tahun_ajaran: '2024/2025'
      }
    ];
    const res = generateMasterDataCsv('Wali_Kelas', waliSample, {
      configuredTahunAjaran: '2024/2025'
    });
    assert.strictEqual(res.filename, 'Data_Wali_Kelas.csv');
    assert.deepStrictEqual(res.headers, ['kelas', 'nama_guru', 'nip', 'tahun_ajaran']);
    assert.ok(res.csv.includes('X Merdeka,"Dewi Sartika, S.Pd.",198501012010011001,2024/2025'));
    pass('2.6: Tab Wali Kelas (Wali_Kelas) exports homeroom assignments and academic year');
  } catch (e) {
    fail('2.6: Tab Wali Kelas export failed', e);
  }

  // Tab 7: Pengguna
  try {
    const penggunaSample = [
      {
        username: 'dewisartika',
        nama: 'Dewi Sartika, S.Pd.',
        role: 'Guru',
        nip: '198501012010011001',
        mataPelajaran: 'Bahasa Inggris',
        status: 'Aktif'
      }
    ];
    const res = generateMasterDataCsv('Pengguna', penggunaSample);
    assert.strictEqual(res.filename, 'Data_Pengguna.csv');
    assert.deepStrictEqual(res.headers, ['username', 'nama', 'role', 'nip', 'mata_pelajaran', 'status']);
    assert.ok(res.csv.includes('dewisartika,"Dewi Sartika, S.Pd.",Guru,198501012010011001,Bahasa Inggris,Aktif'));
    pass('2.7: Tab Pengguna (Pengguna) exports user accounts, roles, and subjects');
  } catch (e) {
    fail('2.7: Tab Pengguna export failed', e);
  }

  // Tab 8: Kalender Pendidikan
  try {
    const kalenderSample = [
      {
        tanggal: '2026-10-01',
        keterangan: 'Hari Kesaktian Pancasila, Libur Nasional',
        tipe: 'Libur'
      }
    ];
    const res = generateMasterDataCsv('Kalender_Pendidikan', kalenderSample);
    assert.strictEqual(res.filename, 'Data_Kalender_Pendidikan.csv');
    assert.deepStrictEqual(res.headers, ['tanggal', 'keterangan', 'tipe']);
    assert.ok(res.csv.includes('2026-10-01,"Hari Kesaktian Pancasila, Libur Nasional",Libur'));
    pass('2.8: Tab Kalender Pendidikan (Kalender_Pendidikan) exports calendar dates and event types');
  } catch (e) {
    fail('2.8: Tab Kalender Pendidikan export failed', e);
  }

  // Tab 9: Sistem Blok
  try {
    const blokSample = [
      {
        nama_kegiatan: 'Penilaian Akhir Semester "Ganjil"',
        tanggal_mulai: '2026-12-01T00:00:00.000Z',
        tanggal_selesai: '2026-12-10T00:00:00.000Z',
        tipe_target: 'sekolah',
        target_kelas: 'Semua Kelas',
        deskripsi: 'Ujian semester, blok terjadwal'
      }
    ];
    const res = generateMasterDataCsv('sistem_blok', blokSample);
    assert.strictEqual(res.filename, 'Data_Periode_Sistem_Blok.csv');
    assert.deepStrictEqual(res.headers, ['nama_kegiatan', 'tanggal_mulai', 'tanggal_selesai', 'tipe_target', 'target_kelas', 'deskripsi']);
    assert.ok(res.csv.includes('"Penilaian Akhir Semester ""Ganjil"""'));
    assert.ok(res.csv.includes('2026-12-01,2026-12-10,sekolah,Semua Kelas,"Ujian semester, blok terjadwal"'));
    pass('2.9: Tab Sistem Blok (sistem_blok) exports sanitized dates, target types, and quotes');
  } catch (e) {
    fail('2.9: Tab Sistem Blok export failed', e);
  }

  // ==========================================================================
  // SECTION 3: Tab Aliases & Robustness
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 3: Tab Aliases & Edge Case Handling ---${RESET}`);

  try {
    assert.strictEqual(normalizeMasterTabKey('siswa'), 'Data_Siswa');
    assert.strictEqual(normalizeMasterTabKey('students'), 'Data_Siswa');
    assert.strictEqual(normalizeMasterTabKey('kelas'), 'Data_Kelas');
    assert.strictEqual(normalizeMasterTabKey('classes'), 'Data_Kelas');
    assert.strictEqual(normalizeMasterTabKey('mapel'), 'Data_Mapel');
    assert.strictEqual(normalizeMasterTabKey('guru'), 'Data_Guru');
    assert.strictEqual(normalizeMasterTabKey('schedule'), 'Jadwal_Pelajaran');
    assert.strictEqual(normalizeMasterTabKey('homeroom'), 'Wali_Kelas');
    assert.strictEqual(normalizeMasterTabKey('users'), 'Pengguna');
    assert.strictEqual(normalizeMasterTabKey('calendar'), 'Kalender_Pendidikan');
    assert.strictEqual(normalizeMasterTabKey('blok'), 'sistem_blok');
    assert.strictEqual(normalizeMasterTabKey('periode_blok'), 'sistem_blok');
    pass('3.1: normalizeMasterTabKey correctly resolves all tab aliases to canonical keys');
  } catch (e) {
    fail('3.1: normalizeMasterTabKey alias resolution failed', e);
  }

  try {
    // Empty data list should still return valid headers and BOM
    const res = generateMasterDataCsv('Data_Siswa', []);
    assert.strictEqual(res.rowCount, 0);
    assert.ok(res.csv.startsWith('\uFEFF'));
    assert.strictEqual(res.csv.replace('\uFEFF', '').trim(), 'nisn,nama_siswa,kelas,gender,agama,status,no_hp_ortu');
    pass('3.2: Empty data list generates valid CSV with correct headers and zero rows');
  } catch (e) {
    fail('3.2: Empty data list test failed', e);
  }

  try {
    // Missing/undefined fields should not throw and output empty strings
    const res = generateMasterDataCsv('Data_Siswa', [{}]);
    assert.strictEqual(res.rowCount, 1);
    assert.ok(res.csv.includes(',,Aktif,'));
    pass('3.3: Missing fields default safely without throwing exceptions');
  } catch (e) {
    fail('3.3: Missing fields test failed', e);
  }

  try {
    const downloadRes = downloadMasterDataCsv('Data_Kelas', [{ nama_kelas: 'XII Merdeka', tingkat: '12' }]);
    assert.strictEqual(downloadRes.success, true);
    assert.strictEqual(downloadRes.rowCount, 1);
    assert.strictEqual(downloadRes.filename, 'Data_Kelas.csv');
    pass('3.4: downloadMasterDataCsv executes safely in Node environment without crashing on missing browser globals');
  } catch (e) {
    fail('3.4: downloadMasterDataCsv Node execution failed', e);
  }

  // ==========================================================================
  // SECTION 4: Re-import Compatibility
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 4: Re-import Compatibility with dataIntegrityGuard ---${RESET}`);

  try {
    // Generate exported student CSV
    const students = [
      { nisn: '0106436229', nama_siswa: 'Abdul Sendi Mamonto', kelas: 'XI Merdeka D', gender: 'Laki-laki', status: 'Aktif', no_hp_ortu: '082193147509' },
      { nisn: '0116150651', nama_siswa: 'ABIGAIL MIKHAYLA, S.Tr.', kelas: 'X Merdeka D', gender: 'Perempuan', status: 'Aktif', no_hp_ortu: '085256693473' }
    ];
    const { csv } = generateMasterDataCsv('Data_Siswa', students);

    // Parse back using application's import validator
    const parsed = parseAndValidateMasterCsv(csv, 'data_siswa', { role: 'admin' });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].nama_siswa, 'Abdul Sendi Mamonto');
    assert.strictEqual(parsed[0].kelas, 'XI Merdeka D');
    assert.strictEqual(parsed[1].nama_siswa, 'ABIGAIL MIKHAYLA, S.Tr.');
    assert.strictEqual(parsed[1].kelas, 'X Merdeka D');
    pass('4.1: Exported Data_Siswa CSV can be parsed and validated back by parseAndValidateMasterCsv without error');
  } catch (e) {
    fail('4.1: Student re-import roundtrip failed', e);
  }

  try {
    // Generate exported class CSV
    const classes = [
      { nama_kelas: 'X Merdeka', tingkat: '10', jurusan: 'Umum' },
      { nama_kelas: 'XI IPA, Reguler', tingkat: '11', jurusan: 'IPA' }
    ];
    const { csv } = generateMasterDataCsv('Data_Kelas', classes);

    // Parse back
    const parsed = parseAndValidateMasterCsv(csv, 'data_kelas', { role: 'admin' });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].nama_kelas, 'X Merdeka');
    assert.strictEqual(parsed[1].nama_kelas, 'XI IPA, Reguler');
    pass('4.2: Exported Data_Kelas CSV can be parsed and validated back by parseAndValidateMasterCsv');
  } catch (e) {
    fail('4.2: Class re-import roundtrip failed', e);
  }

  // ==========================================================================
  // SECTION 5: UI Integration Verification across All Master Data Views
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 5: UI Toolbar Integration Verification ---${RESET}`);

  const adminDataSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx'), 'utf8');
  const adminKelasSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AdminKelasView.tsx'), 'utf8');
  const adminPenggunaSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AdminPenggunaView.tsx'), 'utf8');
  const sistemBlokSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'SistemBlokView.tsx'), 'utf8');
  const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

  try {
    assert.ok(adminDataSrc.includes('handleExportCsv'), 'AdminDataView must declare handleExportCsv');
    assert.ok(adminDataSrc.includes('downloadMasterDataCsv'), 'AdminDataView must import downloadMasterDataCsv');
    assert.ok(adminDataSrc.includes('Export CSV'), 'AdminDataView toolbar must display "Export CSV" button');
    pass('5.1: AdminDataView has handleExportCsv and "Export CSV" toolbar button');
  } catch (e) {
    fail('5.1: AdminDataView integration check failed', e);
  }

  try {
    assert.ok(adminKelasSrc.includes('handleExportClassCsv'), 'AdminKelasView must declare handleExportClassCsv');
    assert.ok(adminKelasSrc.includes('downloadMasterDataCsv'), 'AdminKelasView must import downloadMasterDataCsv');
    assert.ok(adminKelasSrc.includes('Export CSV'), 'AdminKelasView toolbar must display "Export CSV" button');
    pass('5.2: AdminKelasView has handleExportClassCsv and "Export CSV" toolbar button');
  } catch (e) {
    fail('5.2: AdminKelasView integration check failed', e);
  }

  try {
    assert.ok(adminPenggunaSrc.includes('handleExportUsersCsv'), 'AdminPenggunaView must declare handleExportUsersCsv');
    assert.ok(adminPenggunaSrc.includes('downloadMasterDataCsv'), 'AdminPenggunaView must import downloadMasterDataCsv');
    assert.ok(adminPenggunaSrc.includes('Export CSV'), 'AdminPenggunaView toolbar must display "Export CSV" button');
    pass('5.3: AdminPenggunaView has handleExportUsersCsv and "Export CSV" toolbar button');
  } catch (e) {
    fail('5.3: AdminPenggunaView integration check failed', e);
  }

  try {
    assert.ok(sistemBlokSrc.includes('handleExportBlokCsv'), 'SistemBlokView must declare handleExportBlokCsv');
    assert.ok(sistemBlokSrc.includes('downloadMasterDataCsv'), 'SistemBlokView must import downloadMasterDataCsv');
    assert.ok(sistemBlokSrc.includes('Export CSV'), 'SistemBlokView toolbar must display "Export CSV" button');
    pass('5.4: SistemBlokView has handleExportBlokCsv and "Export CSV" toolbar button');
  } catch (e) {
    fail('5.4: SistemBlokView integration check failed', e);
  }

  try {
    const deps = Object.keys(pkgJson.dependencies || {});
    // Verify no new packages were added
    assert.ok(!deps.includes('papaparse'), 'Must not add papaparse');
    assert.ok(!deps.includes('xlsx'), 'Must not add xlsx');
    assert.ok(!deps.includes('file-saver'), 'Must not add file-saver');
    pass('5.5: Zero third-party dependencies added to package.json');
  } catch (e) {
    fail('5.5: package.json dependency verification failed', e);
  }

  // ==========================================================================
  // FINAL SCORE
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMasterDataExportTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
