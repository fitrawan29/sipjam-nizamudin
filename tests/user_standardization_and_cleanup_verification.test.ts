/**
 * Test Suite: Verifikasi Standardisasi Nama User Fitra Suryazana Mamonto & Pembersihan Drs. Ahmad Dahlan, M.Pd.
 * Verifies Acceptance Criteria for R1 and R2.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import fs from 'fs';
import {
  validateTeacherData,
  validateUserData,
  validateStudentData,
  isDummyOrTestString,
  isForbiddenName
} from '../src/lib/dataIntegrityGuard';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('========================================================================');
console.log('🧪 VERIFIKASI: STANDARISASI USER FITRA & PEMBERSIHAN DATA USANG');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(name: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ✔ PASS: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name: string, error?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ✖ FAIL: ${name}`, error || '');
}

async function run() {
  const baseClient = createClient(supabaseUrl, supabaseKey);

  let sessionToken: string | null = null;
  try {
    const { data: loginData } = await baseClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
    }
  } catch (err) {
    console.warn('Superadmin auth warning:', err);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });

  // --------------------------------------------------------------------------
  // SUITE 1: CSV SOURCES STANDARDIZATION (R1)
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: VERIFIKASI FILE CSV SUMBER (R1) ---');
  const root = path.resolve(__dirname, '..');
  const csvFiles = [
    'csv/SIPJAM NIZAMUDIN - Users (1).csv',
    'csv/SIPJAM NIZAMUDIN - Jadwal_Piket.csv',
    'csv/SIPJAM NIZAMUDIN - Jurnal_Pembelajaran (1).csv',
    'csv/SIPJAM NIZAMUDIN - Presensi_Guru (1).csv',
    'csv/SIPJAM NIZAMUDIN - Laporan_Piket.csv',
    'csv/SIPJAM NIZAMUDIN - Data_Guru (1).csv'
  ];

  for (const rel of csvFiles) {
    const fullPath = path.join(root, rel);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('FITRA SURYAZANA MAMONTO')) {
        fail(`CSV file ${rel} still contains uppercase 'FITRA SURYAZANA MAMONTO'`);
      } else {
        pass(`CSV file ${rel} does not contain uppercase 'FITRA SURYAZANA MAMONTO'`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 2: DATABASE STANDARDIZATION FITRA SURYAZANA MAMONTO (R1)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: DATABASE USER & TRANSACTIONS (R1) ---');

  // R1.1: users table
  const { data: userUpper, error: errUserUpper } = await supabase
    .from('users')
    .select('*')
    .eq('nama', 'FITRA SURYAZANA MAMONTO');
  if (errUserUpper) {
    fail('Query users for FITRA SURYAZANA MAMONTO', errUserUpper);
  } else if ((userUpper?.length || 0) === 0) {
    pass('Table users: 0 rows with uppercase FITRA SURYAZANA MAMONTO');
  } else {
    fail(`Table users still has ${userUpper.length} uppercase rows`);
  }

  const { data: userFitra, error: errUserFitra } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'Fitra');
  if (errUserFitra) {
    fail('Query users for username Fitra', errUserFitra);
  } else if (userFitra?.[0]?.nama === 'Fitra Suryazana Mamonto') {
    pass("Table users: username 'Fitra' has nama 'Fitra Suryazana Mamonto'");
  } else {
    fail(`Table users: username 'Fitra' has unexpected nama: ${userFitra?.[0]?.nama}`);
  }

  // R1.2: presensi_guru table
  const { data: presensiUpper, error: errPresensiUpper } = await supabase
    .from('presensi_guru')
    .select('*')
    .eq('nama_guru', 'FITRA SURYAZANA MAMONTO');
  if (errPresensiUpper) {
    fail('Query presensi_guru for FITRA SURYAZANA MAMONTO', errPresensiUpper);
  } else if ((presensiUpper?.length || 0) === 0) {
    pass('Table presensi_guru: 0 rows with uppercase FITRA SURYAZANA MAMONTO');
  } else {
    fail(`Table presensi_guru still has ${presensiUpper.length} uppercase rows`);
  }

  const { data: presensiTitle } = await supabase
    .from('presensi_guru')
    .select('*')
    .eq('nama_guru', 'Fitra Suryazana Mamonto');
  if ((presensiTitle?.length || 0) >= 5) {
    pass(`Table presensi_guru: ${presensiTitle?.length} rows standardized to 'Fitra Suryazana Mamonto'`);
  } else {
    fail(`Table presensi_guru: expected >= 5 standardized rows, got ${presensiTitle?.length || 0}`);
  }

  // R1.3: jurnal_pembelajaran table
  const { data: jurnalUpper, error: errJurnalUpper } = await supabase
    .from('jurnal_pembelajaran')
    .select('*')
    .eq('nama_guru', 'FITRA SURYAZANA MAMONTO');
  if (errJurnalUpper) {
    fail('Query jurnal_pembelajaran for FITRA SURYAZANA MAMONTO', errJurnalUpper);
  } else if ((jurnalUpper?.length || 0) === 0) {
    pass('Table jurnal_pembelajaran: 0 rows with uppercase FITRA SURYAZANA MAMONTO');
  } else {
    fail(`Table jurnal_pembelajaran still has ${jurnalUpper.length} uppercase rows`);
  }

  const { data: jurnalTitle } = await supabase
    .from('jurnal_pembelajaran')
    .select('*')
    .eq('nama_guru', 'Fitra Suryazana Mamonto');
  if ((jurnalTitle?.length || 0) >= 3) {
    pass(`Table jurnal_pembelajaran: ${jurnalTitle?.length} rows standardized to 'Fitra Suryazana Mamonto'`);
  } else {
    fail(`Table jurnal_pembelajaran: expected >= 3 standardized rows, got ${jurnalTitle?.length || 0}`);
  }

  // R1.4: laporan_piket table
  const { data: allPiket, error: errAllPiket } = await supabase
    .from('laporan_piket')
    .select('*');
  if (errAllPiket) {
    fail('Query laporan_piket', errAllPiket);
  } else {
    const upperPiket = allPiket?.filter(p => JSON.stringify(p).includes('FITRA SURYAZANA MAMONTO')) || [];
    if (upperPiket.length === 0) {
      pass('Table laporan_piket: 0 rows containing uppercase FITRA SURYAZANA MAMONTO');
    } else {
      fail(`Table laporan_piket: ${upperPiket.length} rows still contain uppercase FITRA SURYAZANA MAMONTO`);
    }

    const titlePiket = allPiket?.filter(p => JSON.stringify(p).includes('Fitra Suryazana Mamonto')) || [];
    if (titlePiket.length >= 2) {
      pass(`Table laporan_piket: ${titlePiket.length} rows standardized to 'Fitra Suryazana Mamonto'`);
    } else {
      fail(`Table laporan_piket: expected >= 2 standardized rows, got ${titlePiket.length}`);
    }
  }

  // R1.5: data_guru account relation
  const { data: guruRel, error: errGuruRel } = await supabase
    .from('data_guru')
    .select('*')
    .eq('nip', 'Fitra');
  if (errGuruRel) {
    fail('Query data_guru for nip Fitra', errGuruRel);
  } else if (guruRel?.[0]?.user_id === userFitra?.[0]?.id && guruRel?.[0]?.status === 'Aktif') {
    pass("Table data_guru: relation for NIP 'Fitra' remains intact, active, and linked to user");
  } else {
    fail(`Table data_guru: relation mismatch:`, guruRel);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: TOTAL PURGE OF DRS. AHMAD DAHLAN, M.PD. (R2)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: PEMBERSIHAN TOTAL DRS. AHMAD DAHLAN, M.PD. (R2) ---');

  const purgeCheckTables = [
    { table: 'users', col: 'nama' },
    { table: 'data_guru', col: 'nama_guru' },
    { table: 'presensi_guru', col: 'nama_guru' },
    { table: 'jurnal_pembelajaran', col: 'nama_guru' },
    { table: 'laporan_piket', col: 'guru_pelapor' },
    { table: 'data_siswa', col: 'nama_siswa' },
  ];

  for (const { table, col } of purgeCheckTables) {
    const { data: rows, error: errCheck } = await supabase
      .from(table)
      .select('*')
      .ilike(col, '%Ahmad Dahlan%');
    if (errCheck) {
      fail(`Query ${table} for Ahmad Dahlan`, errCheck);
    } else if ((rows?.length || 0) === 0) {
      pass(`Table ${table}: exactly 0 rows matching 'Ahmad Dahlan'`);
    } else {
      fail(`Table ${table}: found ${rows.length} rows matching 'Ahmad Dahlan'`);
    }
  }

  // Specific check for old ID e1144f72-2ec4-43f2-aebb-10a59063a906 in presensi_guru
  const { data: specificRow } = await supabase
    .from('presensi_guru')
    .select('*')
    .eq('id', 'e1144f72-2ec4-43f2-aebb-10a59063a906');
  if ((specificRow?.length || 0) === 0) {
    pass("Table presensi_guru: specific obsolete ID e1144f72-2ec4-43f2-aebb-10a59063a906 is permanently deleted");
  } else {
    fail("Table presensi_guru: specific obsolete ID e1144f72-2ec4-43f2-aebb-10a59063a906 still exists");
  }

  // Check laporan_piket json body
  const piketAhmad = allPiket?.filter(p => JSON.stringify(p).toLowerCase().includes('ahmad dahlan')) || [];
  if (piketAhmad.length === 0) {
    pass("Table laporan_piket: 0 references to 'ahmad dahlan' across all fields");
  } else {
    fail(`Table laporan_piket: ${piketAhmad.length} references found to 'ahmad dahlan'`);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: DATA UNIQUENESS GUARD (R3)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: DATA UNIQUENESS GUARD (R3) ---');

  // 4.1: Database Users Uniqueness
  const { data: dbUsers, error: errDbUsers } = await supabase.from('users').select('*');
  if (errDbUsers) {
    fail('Query all users for uniqueness check', errDbUsers);
  } else {
    const usernameMap = new Map<string, number>();
    const userNameMap = new Map<string, number>();
    for (const u of dbUsers || []) {
      const uKey = (u.username || '').toLowerCase().trim();
      usernameMap.set(uKey, (usernameMap.get(uKey) || 0) + 1);

      const nKey = `${u.sekolah_id || 'global'}::${(u.nama || '').toLowerCase().trim()}`;
      userNameMap.set(nKey, (userNameMap.get(nKey) || 0) + 1);
    }

    const dupUsernames = [...usernameMap.entries()].filter(([_, c]) => c > 1);
    if (dupUsernames.length === 0) {
      pass(`Table users: exactly 0 duplicate usernames (${dbUsers.length} users checked)`);
    } else {
      fail(`Table users: found ${dupUsernames.length} duplicate usernames: ${JSON.stringify(dupUsernames)}`);
    }

    const dupUserNames = [...userNameMap.entries()].filter(([_, c]) => c > 1);
    if (dupUserNames.length === 0) {
      pass(`Table users: exactly 0 duplicate user names within school scope`);
    } else {
      fail(`Table users: found ${dupUserNames.length} duplicate user names: ${JSON.stringify(dupUserNames)}`);
    }
  }

  // 4.2: Database Data Guru Uniqueness
  const { data: dbGuru, error: errDbGuru } = await supabase.from('data_guru').select('*');
  if (errDbGuru) {
    fail('Query all data_guru for uniqueness check', errDbGuru);
  } else {
    const guruNameMap = new Map<string, number>();
    const guruNipMap = new Map<string, number>();
    for (const g of dbGuru || []) {
      const gKey = `${g.sekolah_id || 'global'}::${(g.nama_guru || '').toLowerCase().trim()}`;
      guruNameMap.set(gKey, (guruNameMap.get(gKey) || 0) + 1);

      const nip = (g.nip || '').trim();
      if (nip && nip !== '-') {
        const nipKey = `${g.sekolah_id || 'global'}::${nip.toLowerCase()}`;
        guruNipMap.set(nipKey, (guruNipMap.get(nipKey) || 0) + 1);
      }
    }

    const dupGuruNames = [...guruNameMap.entries()].filter(([_, c]) => c > 1);
    if (dupGuruNames.length === 0) {
      pass(`Table data_guru: exactly 0 duplicate teacher names (${dbGuru.length} teachers checked)`);
    } else {
      fail(`Table data_guru: found duplicate teacher names: ${JSON.stringify(dupGuruNames)}`);
    }

    const dupGuruNips = [...guruNipMap.entries()].filter(([_, c]) => c > 1);
    if (dupGuruNips.length === 0) {
      pass(`Table data_guru: exactly 0 duplicate teacher NIPs`);
    } else {
      fail(`Table data_guru: found duplicate teacher NIPs: ${JSON.stringify(dupGuruNips)}`);
    }
  }

  // 4.3: Uniqueness Validation Guard Unit Tests
  const mockExistingUsers = [
    { id: 'u1', username: 'Fitra', nama: 'Fitra Suryazana Mamonto' },
    { id: 'u2', username: 'Fitri', nama: 'Fitri Aprilia Dotulong' },
  ];
  const dupUserRes = validateUserData('fitra', 'User Baru', mockExistingUsers);
  if (!dupUserRes.valid && dupUserRes.message?.includes('sudah digunakan')) {
    pass('validateUserData: successfully blocks duplicate username (case-insensitive)');
  } else {
    fail('validateUserData: failed to block duplicate username', dupUserRes);
  }

  const dupNameRes = validateUserData('user_baru', 'Fitra Suryazana Mamonto', mockExistingUsers);
  if (!dupNameRes.valid && dupNameRes.message?.includes('sudah terdaftar')) {
    pass('validateUserData: successfully blocks duplicate user name');
  } else {
    fail('validateUserData: failed to block duplicate user name', dupNameRes);
  }

  const validUserRes = validateUserData('guru_unik', 'Guru Nama Unik', mockExistingUsers);
  if (validUserRes.valid) {
    pass('validateUserData: accepts unique user credentials');
  } else {
    fail('validateUserData: rejected valid user credentials', validUserRes);
  }

  const mockExistingGuru = [
    { id: 'g1', nip: 'Fitra', nama_guru: 'Fitra Suryazana Mamonto' },
    { id: 'g2', nip: '19800101', nama_guru: 'Guru Budiman Riil' }
  ];
  const dupTeacherNameRes = validateTeacherData('19999999', 'Fitra Suryazana Mamonto', mockExistingGuru);
  if (!dupTeacherNameRes.valid && dupTeacherNameRes.message?.includes('sudah terdaftar')) {
    pass('validateTeacherData: successfully blocks duplicate teacher name in same school');
  } else {
    fail('validateTeacherData: failed to block duplicate teacher name', dupTeacherNameRes);
  }

  const dupTeacherNipRes = validateTeacherData('Fitra', 'Guru Nama Baru', mockExistingGuru);
  if (!dupTeacherNipRes.valid && dupTeacherNipRes.message?.includes('sudah terdaftar')) {
    pass('validateTeacherData: successfully blocks duplicate teacher NIP');
  } else {
    fail('validateTeacherData: failed to block duplicate teacher NIP', dupTeacherNipRes);
  }

  const dupTeacherWhitespaceRes = validateTeacherData('19999999', 'Guru  Budiman   Riil', mockExistingGuru);
  if (!dupTeacherWhitespaceRes.valid && dupTeacherWhitespaceRes.message?.includes('sudah terdaftar')) {
    pass('validateTeacherData: successfully blocks duplicate teacher name with internal multi-spaces');
  } else {
    fail('validateTeacherData: failed to block duplicate teacher with multi-spaces', dupTeacherWhitespaceRes);
  }

  const dupUserWhitespaceRes = validateUserData('user_baru_ws', 'Fitra   Suryazana   Mamonto', mockExistingUsers);
  if (!dupUserWhitespaceRes.valid && dupUserWhitespaceRes.message?.includes('sudah terdaftar')) {
    pass('validateUserData: successfully blocks duplicate user name with internal multi-spaces');
  } else {
    fail('validateUserData: failed to block duplicate user name with multi-spaces', dupUserWhitespaceRes);
  }

  const dupStudentWhitespaceRes = validateStudentData(
    'Siswa  Budi  Santoso',
    'X Merdeka',
    [{ id: 's1', nama_siswa: 'Siswa Budi Santoso', kelas: 'X Merdeka' }]
  );
  if (!dupStudentWhitespaceRes.valid && dupStudentWhitespaceRes.message?.includes('sudah terdaftar')) {
    pass('validateStudentData: successfully blocks duplicate student with multi-space variations');
  } else {
    fail('validateStudentData: failed to block duplicate student with multi-spaces', dupStudentWhitespaceRes);
  }

  const selfEditTeacherRes = validateTeacherData('Fitra', 'Fitra Suryazana Mamonto', mockExistingGuru, 'g1');
  if (selfEditTeacherRes.valid) {
    pass('validateTeacherData: allows editing existing teacher without self-collision');
  } else {
    fail('validateTeacherData: false positive collision when editing own record', selfEditTeacherRes);
  }

  // --------------------------------------------------------------------------
  // SUITE 5: ANTI-DUMMY & DATA REALNESS GUARD (R4)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: ANTI-DUMMY & DATA REALNESS GUARD (R4) ---');

  // 5.1: Live Database Anti-Dummy Scan
  const dummyIdentityRegex = /\b(test|testing|tester|dummy|fiktif|fake|percobaan|uji coba|contoh|sample|foo|bar|asdf)\b/i;
  
  const dummyUsersInDb = (dbUsers || []).filter(u => 
    dummyIdentityRegex.test(u.nama) || (u.username !== 'superadmin' && dummyIdentityRegex.test(u.username))
  );
  if (dummyUsersInDb.length === 0) {
    pass(`Table users: exactly 0 dummy or test accounts in operational database`);
  } else {
    fail(`Table users: found ${dummyUsersInDb.length} dummy accounts:`, dummyUsersInDb);
  }

  const dummyGuruInDb = (dbGuru || []).filter(g => 
    dummyIdentityRegex.test(g.nama_guru) || (g.nip !== '-' && dummyIdentityRegex.test(g.nip))
  );
  if (dummyGuruInDb.length === 0) {
    pass(`Table data_guru: exactly 0 dummy or test records in operational database`);
  } else {
    fail(`Table data_guru: found ${dummyGuruInDb.length} dummy records:`, dummyGuruInDb);
  }

  const { data: dbPresensi } = await supabase.from('presensi_guru').select('id, nama_guru');
  const dummyPresensiInDb = (dbPresensi || []).filter(p => dummyIdentityRegex.test(p.nama_guru));
  if (dummyPresensiInDb.length === 0) {
    pass(`Table presensi_guru: exactly 0 lingering dummy or test attendance records`);
  } else {
    fail(`Table presensi_guru: found ${dummyPresensiInDb.length} dummy presensi records:`, dummyPresensiInDb);
  }

  // 5.2: Anti-Dummy Validation Guard Tests
  const dummyTeacherTest1 = validateTeacherData('12345', 'Test Guru', []);
  if (!dummyTeacherTest1.valid && dummyTeacherTest1.message?.includes('terdeteksi sebagai data percobaan/dummy')) {
    pass('validateTeacherData: rejects "Test Guru" dummy identity');
  } else {
    fail('validateTeacherData: failed to reject "Test Guru"', dummyTeacherTest1);
  }

  const dummyTeacherTest2 = validateTeacherData('12345', 'FITRA SURYAZANA MAMONTO', []);
  if (!dummyTeacherTest2.valid && dummyTeacherTest2.message?.includes('Title Case')) {
    pass('validateTeacherData: rejects uppercase "FITRA SURYAZANA MAMONTO" with helpful guidance');
  } else {
    fail('validateTeacherData: failed to reject uppercase "FITRA SURYAZANA MAMONTO"', dummyTeacherTest2);
  }

  const dummyTeacherTest3 = validateTeacherData('12345', 'Drs. Ahmad Dahlan, M.Pd.', []);
  if (!dummyTeacherTest3.valid && dummyTeacherTest3.message?.includes('dinonaktifkan')) {
    pass('validateTeacherData: rejects deprecated "Drs. Ahmad Dahlan, M.Pd."');
  } else {
    fail('validateTeacherData: failed to reject "Drs. Ahmad Dahlan, M.Pd."', dummyTeacherTest3);
  }

  const dummyTeacherDiacriticTest = validateTeacherData('12345', 'Drs. Ahmád Dahlan, M.Pd.', []);
  if (!dummyTeacherDiacriticTest.valid && dummyTeacherDiacriticTest.message?.includes('dinonaktifkan')) {
    pass('validateTeacherData: rejects deprecated Ahmad Dahlan with diacritics');
  } else {
    fail('validateTeacherData: failed to reject Ahmad Dahlan with diacritics', dummyTeacherDiacriticTest);
  }

  const dummyTeacherFitraMultiSpace = validateTeacherData('12345', 'FITRA   SURYAZANA   MAMONTO', []);
  if (!dummyTeacherFitraMultiSpace.valid && dummyTeacherFitraMultiSpace.message?.includes('Title Case')) {
    pass('validateTeacherData: rejects uppercase FITRA SURYAZANA MAMONTO with internal multi-spaces');
  } else {
    fail('validateTeacherData: failed to reject uppercase FITRA with multi-spaces', dummyTeacherFitraMultiSpace);
  }

  const dummyUserTest = validateUserData('test_admin', 'Administrator Testing', []);
  if (!dummyUserTest.valid && dummyUserTest.message?.includes('terdeteksi sebagai akun percobaan/dummy')) {
    pass('validateUserData: rejects dummy username/name');
  } else {
    fail('validateUserData: failed to reject dummy account', dummyUserTest);
  }

  const dummyUserUnderscoreTest = validateUserData('test_user', 'Nama Pengguna Sah', []);
  if (!dummyUserUnderscoreTest.valid && dummyUserUnderscoreTest.message?.includes('terdeteksi sebagai akun percobaan/dummy')) {
    pass('validateUserData: rejects dummy username with underscore (test_user)');
  } else {
    fail('validateUserData: failed to reject test_user', dummyUserUnderscoreTest);
  }

  const dummyUserNumberTest = validateUserData('dummy1', 'Nama Pengguna Sah', []);
  if (!dummyUserNumberTest.valid && dummyUserNumberTest.message?.includes('terdeteksi sebagai akun percobaan/dummy')) {
    pass('validateUserData: rejects dummy username with appended digit (dummy1)');
  } else {
    fail('validateUserData: failed to reject dummy1', dummyUserNumberTest);
  }

  const dummyStudentTest = validateStudentData('Dummy Siswa Test', 'X Merdeka', []);
  if (!dummyStudentTest.valid && dummyStudentTest.message?.includes('terdeteksi sebagai data percobaan/dummy')) {
    pass('validateStudentData: rejects dummy student name');
  } else {
    fail('validateStudentData: failed to reject dummy student', dummyStudentTest);
  }

  // 5.3: Schema Migration File Guard Verification
  const migFilePath = path.join(root, 'supabase/migrations/20261027_user_uniqueness_and_anti_dummy_guard.sql');
  if (fs.existsSync(migFilePath)) {
    const migContent = fs.readFileSync(migFilePath, 'utf8');
    const hasUserUsernameIdx = migContent.includes('uq_users_username_lower');
    const hasUserNamaIdx = migContent.includes('uq_users_sekolah_nama_lower');
    const hasGuruNamaIdx = migContent.includes('uq_data_guru_sekolah_nama_lower');
    const hasGuruNipIdx = migContent.includes('uq_data_guru_sekolah_nip_lower');
    const hasAntiDummyTrg = migContent.includes('check_anti_dummy_guard');

    if (hasUserUsernameIdx && hasUserNamaIdx && hasGuruNamaIdx && hasGuruNipIdx && hasAntiDummyTrg) {
      pass('Migration 20261027_user_uniqueness_and_anti_dummy_guard.sql: contains all DB indexes and guards');
    } else {
      fail('Migration 20261027_user_uniqueness_and_anti_dummy_guard.sql is missing required constraints');
    }
  } else {
    fail('Migration file 20261027_user_uniqueness_and_anti_dummy_guard.sql does not exist');
  }

  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('========================================================================');

  if (failedTests > 0) {
    console.error('❌ Verification failed!');
    process.exit(1);
  } else {
    console.log('🎉 100% VERIFICATION PASSED!');
  }
}

run().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
