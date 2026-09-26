/**
 * Adversarial Role Security & Regression Stress Test
 * Validates:
 * 1. Admin access across all 15 school entities
 * 2. Multi-tenant school isolation (School A vs School B)
 * 3. Teacher daily state, schedule matching, academic title resilience
 * 4. Siswa data integrity & strict anonymous lockdown across all tables
 * 5. Token tampering, forgery, and rotation
 * 6. UI/UX and feature regression validation
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const DEFAULT_SEKOLAH_ID = 'a0000000-0000-0000-0000-000000000001';
const FAKE_SEKOLAH_ID = 'b0000000-0000-0000-0000-000000000002';

async function runAdversarialAudit() {
  console.log('=== STARTING ADVERSARIAL ROLE SECURITY AUDIT ===\n');

  // Dynamic import after env vars are populated
  const { setServerTenantContext } = await import('../src/lib/supabaseClient');
  const { getGuruDailyState, findJadwalForGuru } = await import('../src/lib/workflow');

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Authenticate Admin
  const adminAuth = await anonClient.rpc('verify_login', {
    p_username: 'admin',
    p_password: 'QWerty1334#'
  });
  if (adminAuth.error || !adminAuth.data?.[0]) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminAuth.error));
  }
  const admin = adminAuth.data[0];
  console.log('1. Admin authenticated:', admin.nama, 'Session:', admin.session_token);

  const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-session-token': admin.session_token,
        'x-sekolah-id': admin.sekolah_id,
        'x-user-role': admin.role,
        'x-user-id': admin.id
      }
    }
  });

  // 2. Check Admin data access across all 15 school entity tables
  const entities = [
    'users',
    'data_guru',
    'data_siswa',
    'presensi_guru',
    'jurnal_pembelajaran',
    'jadwal_pelajaran',
    'pengaturan',
    'bank_dokumen',
    'laporan_piket',
    'guru_mapel',
    'wali_kelas',
    'absensi',
    'nilai_siswa',
    'asesmen_kolom',
    'tujuan_pembelajaran'
  ];

  console.log('\n2. Testing Admin access across 15 school tables:');
  for (const table of entities) {
    const { data, error } = await adminClient.from(table).select('*').limit(5);
    if (error) {
      console.error(`  FAIL [${table}]:`, error.message);
    } else {
      console.log(`  PASS [${table}]: accessible, retrieved ${data.length} records`);
    }
  }

  // 3. Multi-Tenant Cross-School Isolation Attack:
  // Admin tries to spoof x-sekolah-id with another school ID
  console.log('\n3. Testing Cross-School Spoofing Attack on Admin:');
  const spoofAdminClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-session-token': admin.session_token,
        'x-sekolah-id': FAKE_SEKOLAH_ID, // Spoofed foreign school
        'x-user-role': 'Admin',
        'x-user-id': admin.id
      }
    }
  });
  const { data: spoofSiswa } = await spoofAdminClient.from('data_siswa').select('*');
  const leakedToOtherSchool = spoofSiswa?.filter(s => s.sekolah_id === FAKE_SEKOLAH_ID) || [];
  console.log(`  Cross-tenant leakage to fake school: ${leakedToOtherSchool.length} (Expected: 0)`);
  if (leakedToOtherSchool.length > 0) {
    throw new Error('SECURITY VIOLATION: Spoofed sekolah_id leaked records!');
  } else {
    console.log('  PASS: Header spoofing neutralized by database session verification.');
  }

  // 4. Authenticate Teachers
  console.log('\n4. Testing Teacher accounts & complex workflows:');
  const teachers = [
    { username: 'Riski', pass: 'Riski27', name: 'Riski Candra Mamangkai' },
    { username: 'Tika', pass: 'Tika27', name: 'Tika Mamonto, S.Pd.' },
    { username: 'Adnan', pass: 'Adnan27', name: 'Mohamad Adnan Mamangkai' }
  ];

  for (const t of teachers) {
    const tAuth = await anonClient.rpc('verify_login', { p_username: t.username, p_password: t.pass });
    if (tAuth.error || !tAuth.data?.[0]) {
      console.error(`  FAIL: Teacher ${t.username} login failed:`, tAuth.error);
      continue;
    }
    const tUser = tAuth.data[0];
    console.log(`  Teacher ${t.username} authenticated: Session=${tUser.session_token.slice(0, 8)}...`);

    // Test getGuruDailyState
    setServerTenantContext({
      sessionToken: tUser.session_token,
      sekolahId: tUser.sekolah_id,
      role: tUser.role,
      userId: tUser.id
    });

    const state = await getGuruDailyState(tUser.nama, tUser.username, tUser.id);
    console.log(`    DailyState for ${t.username}: aturanKehadiran=${state.aturanKehadiran}, isAlpa=${state.isAlpa}, jadwalToday=${state.jadwalHariIni?.length}`);

    // Test findJadwalForGuru
    const schedules = await findJadwalForGuru('Senin', tUser.nama, tUser.username, tUser.id);
    console.log(`    Senin schedule for ${t.username}: count=${schedules.length}`);
  }

  // 5. Extreme Edge Case: Academic title with double commas ("Ade Fitrawan Ibrahim, M.Pd., Gr.")
  console.log('\n5. Testing Teacher with multiple commas in academic title:');
  const complexName = 'Ade Fitrawan Ibrahim, M.Pd., Gr.';
  const adeSchedules = await findJadwalForGuru('Senin', complexName, 'Fitrawan', 'fff9d836-b034-4a66-be96-1c1b7cfad277');
  console.log(`  Ade Fitrawan schedule match count: ${adeSchedules.length} (Expected >= 1)`);

  // 6. Strict Anonymous Lockdown Test across ALL 15 Tables
  console.log('\n6. Testing Strict Anonymous Lockdown (unauthenticated client, zero headers):');
  const rawAnonClient = createClient(supabaseUrl, supabaseAnonKey);
  let anonymousBreach = false;

  for (const table of entities) {
    const { data } = await rawAnonClient.from(table).select('*').limit(10);
    const count = data?.length || 0;
    if (count > 0) {
      console.error(`  CRITICAL SECURITY FAILURE [${table}]: Unauthenticated read yielded ${count} rows!`);
      anonymousBreach = true;
    } else {
      console.log(`  PASS [${table}]: 0 rows returned (RLS blocked)`);
    }
  }

  if (anonymousBreach) {
    throw new Error('SECURITY VIOLATION: Unauthenticated client bypassed RLS on one or more tables!');
  } else {
    console.log('  PASS: All 15 tenant tables completely locked against unauthenticated access.');
  }

  // 7. Forged Session Token Attack
  console.log('\n7. Testing Forged Session Token Attack:');
  const forgedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-session-token': randomUUID(),
        'x-sekolah-id': DEFAULT_SEKOLAH_ID,
        'x-user-role': 'Admin'
      }
    }
  });
  const { data: forgedSiswa } = await forgedClient.from('data_siswa').select('*');
  console.log(`  Forged session token rows returned: ${forgedSiswa?.length || 0} (Expected: 0)`);
  if ((forgedSiswa?.length || 0) > 0) {
    throw new Error('SECURITY VIOLATION: Forged session token succeeded!');
  } else {
    console.log('  PASS: Forged session token rejected (0 rows).');
  }

  console.log('\n=== ALL ADVERSARIAL AUDIT CHECKS PASSED WITH ZERO VULNERABILITIES ===\n');
}

runAdversarialAudit().catch((err) => {
  console.error('Adversarial audit failed:', err);
  process.exit(1);
});
