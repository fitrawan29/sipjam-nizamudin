/**
 * Test Suite: Verifikasi Standardisasi Nama User Fitra Suryazana Mamonto & Pembersihan Drs. Ahmad Dahlan, M.Pd.
 * Verifies Acceptance Criteria for R1 and R2.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import fs from 'fs';

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
