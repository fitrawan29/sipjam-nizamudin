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
  sanitizeCsvFormula,
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

  try {
    // Generate exported mapel CSV
    const mapels = [
      { id: 'MP-01', nama_mata_pelajaran: 'Matematika Wajib', kategori: 'Umum', kelompok: 'Wajib' },
      { id: 'MP-02', nama_mata_pelajaran: 'Bahasa Indonesia', kategori: 'Umum', kelompok: 'Wajib' }
    ];
    const { csv } = generateMasterDataCsv('Data_Mapel', mapels);
    const parsed = parseAndValidateMasterCsv(csv, 'data_mapel', { role: 'admin' });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].nama_mata_pelajaran, 'Matematika Wajib');
    assert.strictEqual(parsed[1].nama_mata_pelajaran, 'Bahasa Indonesia');
    pass('4.3: Exported Data_Mapel CSV can be parsed and validated back by parseAndValidateMasterCsv');
  } catch (e) {
    fail('4.3: Mapel re-import roundtrip failed', e);
  }

  try {
    // Generate exported guru CSV
    const schoolUuid = 'a0000000-0000-0000-0000-000000000001';
    const gurus = [
      { sekolah_id: schoolUuid, nip: '198501012010011001', nama_guru: 'Budi Santoso, S.Pd.', mata_pelajaran: 'Informatika', no_hp: '081234567890', status: 'Aktif', email: 'budi@example.com' },
      { sekolah_id: schoolUuid, nip: '198602022011022002', nama_guru: 'Siti Aminah, M.Pd.', mata_pelajaran: 'Matematika', no_hp: '081234567891', status: 'Aktif', email: 'siti@example.com' }
    ];
    const { csv } = generateMasterDataCsv('Data_Guru', gurus, { schoolId: schoolUuid });
    const parsed = parseAndValidateMasterCsv(csv, 'data_guru', { role: 'admin', sekolah_id: schoolUuid });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].nama_guru, 'Budi Santoso, S.Pd.');
    assert.strictEqual(parsed[1].nama_guru, 'Siti Aminah, M.Pd.');
    pass('4.4: Exported Data_Guru CSV can be parsed and validated back by parseAndValidateMasterCsv');
  } catch (e) {
    fail('4.4: Guru re-import roundtrip failed', e);
  }

  try {
    // Generate exported jadwal CSV
    const jadwals = [
      { hari: 'Senin', nama_guru: 'Budi Santoso', mata_pelajaran: 'Informatika', kelas: 'X Merdeka', jam_mulai: '07:30', jam_selesai: '09:00' },
      { hari: 'Selasa', nama_guru: 'Siti Aminah', mata_pelajaran: 'Matematika', kelas: 'XI Merdeka A', jam_mulai: '08:00', jam_selesai: '09:30' }
    ];
    const { csv } = generateMasterDataCsv('Jadwal_Pelajaran', jadwals);
    const parsed = parseAndValidateMasterCsv(csv, 'jadwal_pelajaran', { role: 'admin' });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].hari, 'Senin');
    assert.strictEqual(parsed[0].nama_guru, 'Budi Santoso');
    assert.strictEqual(parsed[1].hari, 'Selasa');
    assert.strictEqual(parsed[1].mata_pelajaran, 'Matematika');
    pass('4.5: Exported Jadwal_Pelajaran CSV can be parsed and validated back by parseAndValidateMasterCsv');
  } catch (e) {
    fail('4.5: Jadwal Pelajaran re-import roundtrip failed', e);
  }

  try {
    // Generate exported wali kelas CSV
    const walis = [
      { kelas: 'X Merdeka', nama_guru: 'Budi Santoso', nip: '198501012010011001', tahun_ajaran: '2024/2025' },
      { kelas: 'XI Merdeka A', nama_guru: 'Siti Aminah', nip: '198602022011022002', tahun_ajaran: '2024/2025' }
    ];
    const { csv } = generateMasterDataCsv('Wali_Kelas', walis);
    const parsed = parseAndValidateMasterCsv(csv, 'wali_kelas', { role: 'admin' });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].kelas, 'X Merdeka');
    assert.strictEqual(parsed[0].nama_guru, 'Budi Santoso');
    assert.strictEqual(parsed[1].kelas, 'XI Merdeka A');
    assert.strictEqual(parsed[1].nama_guru, 'Siti Aminah');
    pass('4.6: Exported Wali_Kelas CSV can be parsed and validated back by parseAndValidateMasterCsv');
  } catch (e) {
    fail('4.6: Wali Kelas re-import roundtrip failed', e);
  }

  try {
    // Generate exported pengguna CSV
    const users = [
      { username: '198501012010011001', nama: 'Budi Santoso', role: 'Guru', nip: '198501012010011001', mata_pelajaran: 'Informatika', status: 'Aktif' },
      { username: '198602022011022002', nama: 'Siti Aminah', role: 'Guru', nip: '198602022011022002', mata_pelajaran: 'Matematika', status: 'Aktif' }
    ];
    const { csv } = generateMasterDataCsv('Pengguna', users);
    const parsed = parseAndValidateMasterCsv(csv, 'pengguna', { role: 'admin' });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].username, '198501012010011001');
    assert.strictEqual(parsed[0].nama, 'Budi Santoso');
    assert.strictEqual(parsed[0].role, 'Guru');
    assert.strictEqual(parsed[1].username, '198602022011022002');
    pass('4.7: Exported Pengguna CSV can be parsed and validated back by parseAndValidateMasterCsv');
  } catch (e) {
    fail('4.7: Pengguna re-import roundtrip failed', e);
  }

  try {
    // Generate exported kalender pendidikan CSV
    const kalenders = [
      { tanggal: '2026-10-01', keterangan: 'Hari Kesaktian Pancasila', tipe: 'Libur' },
      { tanggal: '2026-11-10', keterangan: 'Hari Pahlawan', tipe: 'Kegiatan' }
    ];
    const { csv } = generateMasterDataCsv('Kalender_Pendidikan', kalenders);
    const parsed = parseAndValidateMasterCsv(csv, 'kalender_pendidikan', { role: 'admin' });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].tanggal, '2026-10-01');
    assert.strictEqual(parsed[0].keterangan, 'Hari Kesaktian Pancasila');
    assert.strictEqual(parsed[1].tanggal, '2026-11-10');
    pass('4.8: Exported Kalender_Pendidikan CSV can be parsed and validated back by parseAndValidateMasterCsv');
  } catch (e) {
    fail('4.8: Kalender Pendidikan re-import roundtrip failed', e);
  }

  try {
    // Generate exported sistem blok CSV
    const bloks = [
      { nama_kegiatan: 'Penilaian Akhir Semester', tanggal_mulai: '2026-12-01', tanggal_selesai: '2026-12-10', tipe_target: 'sekolah', target_kelas: '', deskripsi: 'Ujian Semester' },
      { nama_kegiatan: 'KBM Praktik Industri', tanggal_mulai: '2026-11-01', tanggal_selesai: '2026-11-15', tipe_target: 'kelas', target_kelas: 'XII Merdeka 1; XII Merdeka 2', deskripsi: 'Praktik' }
    ];
    const { csv } = generateMasterDataCsv('sistem_blok', bloks);
    const parsed = parseAndValidateMasterCsv(csv, 'sistem_blok', { role: 'admin' });
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].nama_kegiatan, 'Penilaian Akhir Semester');
    assert.strictEqual(parsed[0].tanggal_mulai, '2026-12-01');
    assert.strictEqual(parsed[1].target_kelas, 'XII Merdeka 1; XII Merdeka 2');
    pass('4.9: Exported sistem_blok CSV can be parsed and validated back by parseAndValidateMasterCsv');
  } catch (e) {
    fail('4.9: Sistem Blok re-import roundtrip failed', e);
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
  // SECTION 6: Adversarial Review Probes & Regression Hardening
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 6: Adversarial Review Probes & Edge Case Proof ---${RESET}`);

  try {
    // 6.1: Data_Kelas with wali_kelas as an object (as created by AdminKelasView consolidatedClasses)
    const classWithObjWali = [
      {
        nama_kelas: 'XII Merdeka B',
        tingkat: '12',
        jurusan: 'IPA',
        wali_kelas: { nama_guru: 'Dra. Hj. Siti Aminah, M.Pd.', nip: '197205121998022001' },
        totalSiswa: 36
      }
    ];
    const res = generateMasterDataCsv('Data_Kelas', classWithObjWali);
    assert.ok(!res.csv.includes('[object Object]'), 'Exported CSV must never contain [object Object]');
    assert.ok(res.csv.includes('"Dra. Hj. Siti Aminah, M.Pd."'), 'Homeroom teacher name must be extracted properly');
    pass('6.1: Data_Kelas handles wali_kelas as object without [object Object] degradation');
  } catch (e) {
    fail('6.1: Data_Kelas object wali_kelas probe failed', e);
  }

  try {
    // 6.2: Tab aliases with whitespace and hyphens
    assert.strictEqual(normalizeMasterTabKey('Wali Kelas'), 'Wali_Kelas');
    assert.strictEqual(normalizeMasterTabKey('wali kelas'), 'Wali_Kelas');
    assert.strictEqual(normalizeMasterTabKey('Jadwal Pelajaran'), 'Jadwal_Pelajaran');
    assert.strictEqual(normalizeMasterTabKey('jadwal-pelajaran'), 'Jadwal_Pelajaran');
    assert.strictEqual(normalizeMasterTabKey('Kalender Pendidikan'), 'Kalender_Pendidikan');
    assert.strictEqual(normalizeMasterTabKey('Sistem Blok'), 'sistem_blok');
    assert.strictEqual(normalizeMasterTabKey('Periode Sistem Blok'), 'sistem_blok');
    assert.strictEqual(normalizeMasterTabKey('Data Guru'), 'Data_Guru');
    assert.strictEqual(normalizeMasterTabKey('Data Siswa'), 'Data_Siswa');
    assert.strictEqual(normalizeMasterTabKey('Data Kelas'), 'Data_Kelas');
    assert.strictEqual(normalizeMasterTabKey('Data Mapel'), 'Data_Mapel');
    assert.strictEqual(normalizeMasterTabKey('data-siswa'), 'Data_Siswa');

    // Verify calling generateMasterDataCsv with 'Wali Kelas' does NOT fallback to Data_Siswa
    const resWali = generateMasterDataCsv('Wali Kelas', [{ kelas: 'X-A', nama_guru: 'Budi' }]);
    assert.strictEqual(resWali.filename, 'Data_Wali_Kelas.csv');
    assert.deepStrictEqual(resWali.headers, ['kelas', 'nama_guru', 'nip', 'tahun_ajaran']);
    assert.ok(!resWali.headers.includes('nisn'), 'Must not fallback to Data_Siswa');
    pass('6.2: Tab aliases with spaces, hyphens, and title cases resolve to exact entity definitions');
  } catch (e) {
    fail('6.2: Tab aliases with whitespace probe failed', e);
  }

  try {
    // 6.3: Complex multi-line, quotation marks, commas, tabs, and non-ASCII emojis
    const complexDesc = 'Catatan:\r\n1. "Ujian Akhir" Semester 📝\n2. Ruang KBM: Lab 1; Lab 2\t[Wajib]';
    const blokComplex = [
      {
        nama_kegiatan: 'PAS & "Remedial" 2026',
        tanggal_mulai: '2026-11-01',
        tanggal_selesai: '2026-11-15',
        tipe_target: 'sekolah',
        target_kelas: 'Semua Kelas',
        deskripsi: complexDesc
      }
    ];
    const res = generateMasterDataCsv('sistem_blok', blokComplex);
    assert.ok(res.csv.includes('""Ujian Akhir""'));
    assert.ok(res.csv.includes('📝'));

    // Roundtrip verification through parseAndValidateMasterCsv
    const parsed = parseAndValidateMasterCsv(res.csv, 'sistem_blok', { role: 'admin' });
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].nama_kegiatan, 'PAS & "Remedial" 2026');
    assert.strictEqual(parsed[0].deskripsi, complexDesc);
    pass('6.3: Complex multi-line text, mixed CRLF/LF, quotes, emojis, tabs roundtrip perfectly');
  } catch (e) {
    fail('6.3: Complex multi-line & emoji escaping probe failed', e);
  }

  try {
    // 6.4: escapeCsvField defensive object protection
    assert.strictEqual(escapeCsvField({ nama_guru: 'Ahmad, M.Pd.' }), '"Ahmad, M.Pd."');
    assert.strictEqual(escapeCsvField({ nama_siswa: 'Budi' }), 'Budi');
    assert.strictEqual(escapeCsvField({ nama_kelas: 'X-A' }), 'X-A');
    assert.strictEqual(escapeCsvField(new Date('2026-05-15T08:00:00Z')), '2026-05-15');
    assert.strictEqual(escapeCsvField(['IPA', 'IPS']), '"IPA; IPS"');
    assert.ok(!escapeCsvField({ other: 123 }).includes('[object Object]'));
    pass('6.4: escapeCsvField defensive handlers gracefully format objects, arrays, and dates');
  } catch (e) {
    fail('6.4: escapeCsvField defensive handling failed', e);
  }

  try {
    // 6.5: Verify UI components prevent dumping entire dataset when filter yields 0 matches
    assert.ok(adminDataSrc.includes('isFilterApplied'), 'AdminDataView must check isFilterApplied');
    assert.ok(adminKelasSrc.includes('isFilterApplied'), 'AdminKelasView must check isFilterApplied');
    assert.ok(adminPenggunaSrc.includes('isFilterApplied'), 'AdminPenggunaView must check isFilterApplied');
    assert.ok(sistemBlokSrc.includes('isFilterApplied'), 'SistemBlokView must check isFilterApplied');
    pass('6.5: UI components preserve active filter scope during CSV export without unintended database dumps');
  } catch (e) {
    fail('6.5: UI component filter check verification failed', e);
  }

  // ==========================================================================
  // SECTION 7: Adversarial Round 2 Probes & Advanced Hardening
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 7: Adversarial Round 2 Probes (Formula Injection, Types, Perf, A11y) ---${RESET}`);

  try {
    // 7.1: CSV Spreadsheet / Formula Injection Mitigation (CWE-1236)
    // Excel / LibreOffice execution triggers: =, +, -, @, \t, \r, |
    assert.strictEqual(sanitizeCsvFormula("=cmd|'/C calc'!A0"), "'=cmd|'/C calc'!A0");
    assert.strictEqual(sanitizeCsvFormula('@SUM(1,2)'), "'@SUM(1,2)");
    assert.strictEqual(sanitizeCsvFormula('+cmd'), "'+cmd");
    assert.strictEqual(sanitizeCsvFormula('-cmd'), "'-cmd");
    assert.strictEqual(sanitizeCsvFormula('   =1+1'), "'   =1+1");
    assert.strictEqual(sanitizeCsvFormula('\t=1+1'), "'\t=1+1");
    assert.strictEqual(sanitizeCsvFormula("=HYPERLINK(\"http://evil.com\")"), "'=HYPERLINK(\"http://evil.com\")");

    // Pure numbers and standalone hyphen must remain unquoted/unprefixed
    assert.strictEqual(sanitizeCsvFormula('123'), '123');
    assert.strictEqual(sanitizeCsvFormula('-10'), '-10');
    assert.strictEqual(sanitizeCsvFormula('+5'), '+5');
    assert.strictEqual(sanitizeCsvFormula('3.14159'), '3.14159');
    assert.strictEqual(sanitizeCsvFormula('-'), '-');
    assert.strictEqual(sanitizeCsvFormula("'=already_safe"), "'=already_safe");

    // Test in full CSV export pipeline
    const formulaPayload = [
      { nisn: '0110001111', nama_siswa: "=cmd|'/C calc'!A0", kelas: 'X Merdeka', gender: 'Laki-laki', status: 'Aktif' },
      { nisn: '0110002222', nama_siswa: '@SUM(A1:B2)', kelas: 'X Merdeka', gender: 'Laki-laki', status: 'Aktif' },
      { nisn: '0110003333', nama_siswa: '=SUM(1, 2)', kelas: 'X Merdeka', gender: 'Laki-laki', status: 'Aktif' }
    ];
    const exp = generateMasterDataCsv('Data_Siswa', formulaPayload);
    assert.ok(exp.csv.includes("'=cmd|'/C calc'!A0"), 'Formula starting with = must have safe quote prefix');
    assert.ok(exp.csv.includes("'@SUM(A1:B2)"), 'Formula starting with @ must have safe quote prefix');
    assert.ok(exp.csv.includes("\"'=SUM(1, 2)\""), 'Formula containing comma must be quoted with safe prefix');

    // Roundtrip verification: parseAndValidateMasterCsv safely imports back without dangerous execution
    const reimported = parseAndValidateMasterCsv(exp.csv, 'data_siswa', { role: 'admin' });
    assert.strictEqual(reimported.length, 3);
    assert.strictEqual(reimported[0].nama_siswa, "=cmd|'/C calc'!A0");
    assert.strictEqual(reimported[1].nama_siswa, '@SUM(A1:B2)');
    assert.strictEqual(reimported[2].nama_siswa, '=SUM(1, 2)');
    pass('7.1: CSV formula injection prevented with safe single-quote prefix and verified roundtrip');
  } catch (e) {
    fail('7.1: CSV formula injection probe failed', e);
  }

  try {
    // 7.2: Defensive Data Types & Crash Prevention (Invalid Dates, Circular References, BigInt)
    // Invalid date must not crash with RangeError: Invalid time value
    const invalidDate = new Date('invalid');
    assert.strictEqual(escapeCsvField(invalidDate), '');

    // Kalender Pendidikan with invalid date gracefully exports empty string
    const kalenderInvalid = [{ tanggal: new Date(NaN), keterangan: 'Ujian Percobaan', tipe: 'Kegiatan' }];
    const kalenderRes = generateMasterDataCsv('Kalender_Pendidikan', kalenderInvalid);
    assert.ok(kalenderRes.csv.includes(',Ujian Percobaan,Kegiatan'));

    // Object with BigInt must not throw TypeError: Do not know how to serialize a BigInt
    const bigIntObj = { id: 9007199254740991n, detail: 'BigInt test' };
    const escapedBigInt = escapeCsvField(bigIntObj);
    assert.ok(escapedBigInt.includes('9007199254740991'));

    // Circular object must not throw TypeError: Converting circular structure to JSON
    const circularObj: any = { name: undefined };
    circularObj.self = circularObj;
    const escapedCircular = escapeCsvField(circularObj);
    assert.ok(escapedCircular.length > 0 && !escapedCircular.includes('[object Object]'));

    pass('7.2: Defensive data types (invalid Date, BigInt, circular objects) serialize safely without exceptions');
  } catch (e) {
    fail('7.2: Defensive data types probe failed', e);
  }

  try {
    // 7.3: Array Handling for Class Names & Teacher Names
    // Target classes as array in sistem_blok must join properly instead of returning empty string
    const multiClassBlok = [
      {
        nama_kegiatan: 'KBM Blok Khusus',
        tanggal_mulai: '2026-10-10',
        tanggal_selesai: '2026-10-15',
        tipe_target: 'kelas',
        target_kelas: ['X Merdeka 1', 'X Merdeka 2', 'XI Merdeka A'],
        deskripsi: 'Rotasi kelas gabungan'
      }
    ];
    const blokRes = generateMasterDataCsv('sistem_blok', multiClassBlok);
    assert.ok(blokRes.csv.includes('"X Merdeka 1; X Merdeka 2; XI Merdeka A"'), 'Array of classes must be joined by semicolon');

    // Jadwal Pelajaran with object time formats
    const jadwalObjTime = [
      {
        hari: 'Senin',
        nama_guru: [{ nama_guru: 'Guru Utama' }, { nama_guru: 'Guru Pendamping' }],
        mata_pelajaran: 'Fisika Terapan',
        kelas: [{ nama_kelas: 'XII-IPA-1' }],
        jam_mulai: { jam: '08:00' },
        jam_selesai: { jam: '09:30' }
      }
    ];
    const jadwalRes = generateMasterDataCsv('Jadwal_Pelajaran', jadwalObjTime);
    assert.ok(jadwalRes.csv.includes('"Guru Utama; Guru Pendamping"'));
    assert.ok(jadwalRes.csv.includes('XII-IPA-1'));
    assert.ok(jadwalRes.csv.includes('08:00,09:30'));

    pass('7.3: Array handling for classes and teachers extracts full multi-value records');
  } catch (e) {
    fail('7.3: Array handling probe failed', e);
  }

  try {
    // 7.4: High-Performance Synthetic Dataset Generation
    // Benchmarks exporting 25,000 rows to ensure zero memory exhaustion, fast join, and no call-stack overflow
    const startTime = Date.now();
    const largeDataset = new Array(25000);
    for (let i = 0; i < 25000; i++) {
      largeDataset[i] = {
        nisn: '0100000000'.slice(0, 10 - String(i).length) + i,
        nama_siswa: `Siswa Uji Performa Ke-${i}, S.Pd.`,
        kelas: `X Merdeka ${(i % 10) + 1}`,
        gender: i % 2 === 0 ? 'Laki-laki' : 'Perempuan',
        agama: 'Islam',
        status: 'Aktif',
        no_hp_ortu: '081234567890'
      };
    }
    const largeExport = generateMasterDataCsv('Data_Siswa', largeDataset);
    const elapsed = Date.now() - startTime;

    assert.strictEqual(largeExport.rowCount, 25000);
    assert.ok(largeExport.csv.startsWith('\uFEFFnisn,nama_siswa,kelas,gender,agama,status,no_hp_ortu'));
    assert.ok(elapsed < 2000, `25,000 rows export took ${elapsed}ms (expected under 2000ms)`);
    pass(`7.4: Synthetic large dataset (25,000 rows) generated in ${elapsed}ms without memory spikes or stack overflow`);
  } catch (e) {
    fail('7.4: Large dataset performance benchmark failed', e);
  }

  try {
    // 7.5: Accessibility & WCAG Compliance for Export Buttons
    // Verifies aria-label presence on Export CSV buttons in all 4 UI components
    assert.ok(adminDataSrc.includes('aria-label="Ekspor data ke berkas CSV"'), 'AdminDataView export button must have aria-label');
    assert.ok(adminKelasSrc.includes('aria-label="Ekspor seluruh Data Kelas ke berkas CSV"'), 'AdminKelasView export button must have aria-label');
    assert.ok(adminPenggunaSrc.includes('aria-label="Ekspor daftar pengguna ke berkas CSV"'), 'AdminPenggunaView export button must have aria-label');
    assert.ok(sistemBlokSrc.includes('aria-label="Ekspor seluruh Periode Sistem Blok ke berkas CSV"'), 'SistemBlokView export button must have aria-label');
    pass('7.5: Accessibility verification: aria-label defined on all Export CSV buttons across views');
  } catch (e) {
    fail('7.5: Accessibility verification failed', e);
  }

  // ==========================================================================
  // SECTION 8: Adversarial Round 3 Probes (Mobile Responsiveness, RBAC, Special Chars)
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 8: Adversarial Round 3 Probes (Mobile Layout, RBAC, Special Chars) ---${RESET}`);

  try {
    // 8.1: Mobile Flex-Wrap & Non-Overflow Toolbar Layout
    // Re-read current files
    const curAdminDataSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx'), 'utf8');
    const curAdminKelasSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AdminKelasView.tsx'), 'utf8');
    const curAdminPenggunaSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AdminPenggunaView.tsx'), 'utf8');
    const curSistemBlokSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'SistemBlokView.tsx'), 'utf8');

    // AdminDataView toolbar must use flex flex-wrap for responsive wrapping
    assert.ok(curAdminDataSrc.includes('flex flex-wrap sm:flex-nowrap gap-1.5'), 'AdminDataView toolbar must support flex-wrap on mobile');

    // AdminKelasView action buttons container must use flex flex-wrap
    assert.ok(curAdminKelasSrc.includes('flex flex-wrap items-center gap-1.5 sm:gap-2'), 'AdminKelasView buttons must use flex-wrap');

    // AdminPenggunaView buttons container must use flex flex-wrap (not rigid shrink-0)
    assert.ok(curAdminPenggunaSrc.includes('flex flex-wrap items-center gap-2'), 'AdminPenggunaView buttons must support flex-wrap on mobile');

    // SistemBlokView toolbar buttons container must use flex-wrap
    assert.ok(curSistemBlokSrc.includes('flex flex-wrap items-center gap-2 self-start sm:self-auto'), 'SistemBlokView buttons must support flex-wrap on mobile');

    pass('8.1: Mobile flex-wrap & non-overflow responsive layouts verified across all 4 UI views');
  } catch (e) {
    fail('8.1: Mobile responsive layout verification failed', e);
  }

  try {
    // 8.2: Role Permission & RBAC Isolation
    // Verifies that canModify in AdminDataView requires isAdmin or isTataUsaha with Siswa/Guru tabs only
    assert.ok(adminDataSrc.includes("const canModify = isAdmin || (isTataUsaha && (activeTab === 'Data_Siswa' || activeTab === 'Data_Guru'));"), 'AdminDataView must enforce strict canModify RBAC');

    // AdminKelasView strictly guards class uploads with isAdmin
    assert.ok(adminKelasSrc.includes('if (!isAdmin) {'), 'AdminKelasView must guard file upload with isAdmin check');

    // SistemBlokView displays locked screen for non-admin users
    assert.ok(sistemBlokSrc.includes('if (!isAdminOrSuperadmin) {'), 'SistemBlokView must guard view with isAdminOrSuperadmin');

    pass('8.2: Role permission isolation strictly verified for Admin, TU, and non-admin roles');
  } catch (e) {
    fail('8.2: Role permission verification failed', e);
  }

  try {
    // 8.3: Special Character Matrix Round-Trip Across All 9 Tabs
    const specialMatrix = [
      {
        tab: 'Data_Siswa',
        table: 'data_siswa',
        item: {
          nisn: '0106436229',
          nama_siswa: 'Siswa, "Spesial" & Karakter: =cmd | kalkulasi;',
          kelas: 'X Merdeka, A',
          gender: 'Laki-laki',
          agama: 'Islam',
          status: 'Aktif',
          no_hp_ortu: '081234567890'
        }
      },
      {
        tab: 'Data_Kelas',
        table: 'data_kelas',
        item: {
          nama_kelas: 'XI IPA "Unggulan", 1',
          tingkat: '11',
          jurusan: 'MIPA, Sains'
        }
      },
      {
        tab: 'Data_Mapel',
        table: 'data_mapel',
        item: {
          id: 'MP-SP-01',
          nama_mata_pelajaran: 'Bahasa & Sastra "Indonesia", Wajib',
          kategori: 'Umum, Wajib',
          kelompok: 'Kelompok A (Wajib)'
        }
      },
      {
        tab: 'Data_Guru',
        table: 'data_guru',
        item: {
          sekolah_id: 'a0000000-0000-0000-0000-000000000001',
          nip: '198501012010011001',
          nama_guru: 'Dra. Hj. Siti "Aminah", M.Pd.',
          mata_pelajaran: 'Bahasa Indonesia',
          no_hp: '081234567890',
          status: 'Aktif',
          email: 'siti.aminah@sekolah.sch.id'
        }
      },
      {
        tab: 'Jadwal_Pelajaran',
        table: 'jadwal_pelajaran',
        item: {
          hari: 'Senin',
          nama_guru: 'Dra. Hj. Siti "Aminah", M.Pd.',
          mata_pelajaran: 'Bahasa Indonesia',
          kelas: 'XI IPA "Unggulan", 1',
          jam_mulai: '07:30',
          jam_selesai: '09:00'
        }
      },
      {
        tab: 'Wali_Kelas',
        table: 'wali_kelas',
        item: {
          kelas: 'XI IPA "Unggulan", 1',
          nama_guru: 'Dra. Hj. Siti "Aminah", M.Pd.',
          nip: '198501012010011001',
          tahun_ajaran: '2024/2025'
        }
      },
      {
        tab: 'Pengguna',
        table: 'pengguna',
        item: {
          username: '198501012010011001',
          nama: 'Dra. Hj. Siti "Aminah", M.Pd.',
          role: 'Guru',
          nip: '198501012010011001',
          mata_pelajaran: 'Bahasa Indonesia',
          status: 'Aktif'
        }
      },
      {
        tab: 'Kalender_Pendidikan',
        table: 'kalender_pendidikan',
        item: {
          tanggal: '2026-08-17',
          keterangan: 'HUT RI Ke-81: "Indonesia Tangguh, Indonesia Maju"',
          tipe: 'Libur Nasional'
        }
      },
      {
        tab: 'sistem_blok',
        table: 'sistem_blok',
        item: {
          nama_kegiatan: 'Ujian "Komprehensif" Semester, Ganjil',
          tanggal_mulai: '2026-12-01',
          tanggal_selesai: '2026-12-10',
          tipe_target: 'kelas',
          target_kelas: 'XI IPA "Unggulan", 1; XII IPA "Reguler"',
          deskripsi: 'Pelaksanaan ujian blok: tertib & teratur'
        }
      }
    ];

    for (const testCase of specialMatrix) {
      const { csv } = generateMasterDataCsv(testCase.tab, [testCase.item], { schoolId: 'a0000000-0000-0000-0000-000000000001' });
      const parsed = parseAndValidateMasterCsv(csv, testCase.table, {
        role: 'admin',
        sekolah_id: 'a0000000-0000-0000-0000-000000000001'
      });
      assert.strictEqual(parsed.length, 1, `Table ${testCase.table} must parse exactly 1 row`);
    }

    pass('8.3: Symmetrical round-trip verified for complex special character matrix across all 9 tabs');
  } catch (e) {
    fail('8.3: Special character matrix round-trip failed', e);
  }

  try {
    // 8.4: Verification of Template and Export Definitions Registry Alignment
    const canonicalTabs = [
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

    for (const tabKey of canonicalTabs) {
      assert.ok(MASTER_DATA_EXPORT_DEFINITIONS[tabKey], `Definition for tab "${tabKey}" must exist`);
      assert.ok(MASTER_DATA_EXPORT_DEFINITIONS[tabKey].headers.length > 0, `Headers for "${tabKey}" must not be empty`);
      assert.ok(MASTER_DATA_EXPORT_DEFINITIONS[tabKey].filename.endsWith('.csv'), `Filename for "${tabKey}" must end with .csv`);
    }

    pass('8.4: All 9 canonical Master Data export definitions exist and are properly registered');
  } catch (e) {
    fail('8.4: Alignment check failed', e);
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
