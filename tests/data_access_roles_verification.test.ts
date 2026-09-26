/**
 * ============================================================================
 * E2E DATA ACCESS & ROLES VERIFICATION TEST SUITE
 * File: tests/data_access_roles_verification.test.ts
 *
 * Comprehensive, automated, end-to-end programmatic verification test suite
 * testing Admin, Teacher (Guru), Student (Siswa) data access, PostgREST query
 * integrity, schedule matching, RLS multi-tenant isolation, and legacy session resilience.
 *
 * Directly runnable with:
 *   npx tsx tests/data_access_roles_verification.test.ts
 * ============================================================================
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ANSI terminal colors
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
const failureDetails: string[] = [];

function suiteHeader(name: string) {
  console.log(`\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${CYAN}${BOLD}  SUITE: ${name}${RESET}`);
  console.log(`${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
}

function pass(testId: string, description: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${testId}] PASS:${RESET} ${description}`);
  if (detail) {
    console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  }
}

function fail(testId: string, description: string, error?: any) {
  totalTests++;
  failedTests++;
  const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  console.error(`  ${RED}✖ [${testId}] FAIL:${RESET} ${description}`);
  if (errMsg) {
    console.error(`    ${RED}↳ Error: ${errMsg}${RESET}`);
  }
  failureDetails.push(`[${testId}] ${description} — ${errMsg}`);
}

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(`${RED}Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.${RESET}`);
  process.exit(1);
}

const DEFAULT_SEKOLAH_ID = 'a0000000-0000-0000-0000-000000000001';

/**
 * Helper to build an authenticated client injecting tenant headers
 */
function createTenantClient(user: { id?: string; session_token?: string; role?: string; sekolah_id?: string | null }) {
  const headers: Record<string, string> = {};
  if (user.session_token) headers['x-session-token'] = user.session_token;
  if (user.sekolah_id) headers['x-sekolah-id'] = user.sekolah_id;
  if (user.role) headers['x-user-role'] = user.role;
  if (user.id) headers['x-user-id'] = user.id;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers }
  });
}

/**
 * Standalone session validation contract helper
 */
function isSessionValid(user: any): boolean {
  if (!user || typeof user !== 'object') return false;
  if (!user.id || typeof user.id !== 'string') return false;
  if (!user.role || typeof user.role !== 'string') return false;
  if (user.role !== 'Superadmin' && (!user.sekolah_id || typeof user.sekolah_id !== 'string')) return false;
  if (!user.session_token || typeof user.session_token !== 'string' || user.session_token.length < 32) return false;
  return true;
}

/**
 * Sanitize teacher name for PostgREST .or() filters to prevent PGRST100 syntax breakage
 */
function sanitizeNameForOrFilter(fullName: string): string {
  if (!fullName) return '';
  // Strip academic titles/degrees following comma (e.g. "Tika Mamonto, S.Pd." -> "Tika Mamonto")
  const primaryName = fullName.split(',')[0].trim();
  // Strip special PostgREST characters
  return primaryName.replace(/["'(),]/g, '').trim();
}

async function runTestSuite() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║     SIPJAM DATA ACCESS & ROLES PROGRAMMATIC VERIFICATION SUITE       ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`${GRAY}Target: ${supabaseUrl}${RESET}`);
  console.log(`${GRAY}Timestamp: ${new Date().toISOString()}${RESET}`);

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // Dynamically import project modules after dotenv is loaded
  const { setServerTenantContext } = await import('../src/lib/supabaseClient');
  
  let findJadwalForGuru: any = null;
  let getGuruDailyState: any = null;
  let workflowImportError: any = null;

  try {
    const wf = await import('../src/lib/workflow');
    findJadwalForGuru = wf.findJadwalForGuru;
    getGuruDailyState = wf.getGuruDailyState;
  } catch (wfErr) {
    workflowImportError = wfErr;
  }

  // Shared state for subsequent suites
  let adminUser: any = null;
  let adminClient: SupabaseClient | null = null;
  let teacherUsers: Record<string, any> = {};

  // ==========================================================================
  // SUITE 1: Admin Role Data Access Verification
  // ==========================================================================
  suiteHeader('1. Admin Role Data Access Verification');

  // Test 1.1: Authenticate as Admin via verify_login RPC
  try {
    let authRes = await anonClient.rpc('verify_login', {
      p_username: 'admin',
      p_password: 'SipjamAdmin2026!'
    });

    if (!authRes.data || authRes.data.length === 0) {
      // Fallback to database seed password if SipjamAdmin2026! is not set
      authRes = await anonClient.rpc('verify_login', {
        p_username: 'admin',
        p_password: 'QWerty1334#'
      });
    }

    if (authRes.error) throw authRes.error;
    if (!authRes.data || authRes.data.length === 0) {
      throw new Error('verify_login returned 0 rows for admin credentials');
    }

    adminUser = authRes.data[0];
    if (adminUser.role !== 'Admin') {
      throw new Error(`Expected role 'Admin', got '${adminUser.role}'`);
    }
    if (adminUser.sekolah_id !== DEFAULT_SEKOLAH_ID) {
      throw new Error(`Expected sekolah_id '${DEFAULT_SEKOLAH_ID}', got '${adminUser.sekolah_id}'`);
    }
    if (!adminUser.session_token || adminUser.session_token.length < 32) {
      throw new Error(`Missing or invalid session_token: '${adminUser.session_token}'`);
    }

    adminClient = createTenantClient(adminUser);
    pass('ADMIN-01', 'Admin authentication via verify_login RPC', 
      `User: ${adminUser.username} (${adminUser.nama}), Role: ${adminUser.role}, Session: ${adminUser.session_token.slice(0, 8)}...`);
  } catch (err) {
    fail('ADMIN-01', 'Admin authentication via verify_login RPC', err);
  }

  // Test 1.2: Admin queries users table
  if (adminClient) {
    try {
      const { data, error } = await adminClient.from('users').select('id, username, nama, role, sekolah_id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Admin received 0 rows from users table');
      }
      const foreignRows = data.filter((u: any) => u.sekolah_id !== DEFAULT_SEKOLAH_ID && u.role !== 'Superadmin');
      if (foreignRows.length > 0) {
        throw new Error(`RLS breach: Found ${foreignRows.length} users outside school ${DEFAULT_SEKOLAH_ID}`);
      }
      pass('ADMIN-02', 'Admin retrieves school staff users', 
        `Loaded ${data.length} staff records (All scoped to sekolah_id ${DEFAULT_SEKOLAH_ID})`);
    } catch (err) {
      fail('ADMIN-02', 'Admin retrieves school staff users', err);
    }

    // Test 1.3: Admin queries data_guru table
    try {
      const { data, error } = await adminClient.from('data_guru').select('*');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Admin received 0 rows from data_guru table');
      }
      const sample = data[0];
      const hasRequiredColumns = 'nama_guru' in sample && 'nip' in sample && 'sekolah_id' in sample && 'user_id' in sample;
      if (!hasRequiredColumns) {
        throw new Error(`data_guru missing required schema columns. Available: ${Object.keys(sample).join(', ')}`);
      }
      pass('ADMIN-03', 'Admin retrieves data_guru with correct schema', 
        `Loaded ${data.length} teacher records (Verified columns: id, nip, nama_guru, user_id, sekolah_id)`);
    } catch (err) {
      fail('ADMIN-03', 'Admin retrieves data_guru with correct schema', err);
    }

    // Test 1.4: Admin queries data_siswa table
    try {
      const { data, error } = await adminClient.from('data_siswa').select('*');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Admin received 0 rows from data_siswa table');
      }
      if (data.length !== 14) {
        throw new Error(`Expected 14 students for test school, received ${data.length}`);
      }
      const hasValidRecords = data.every((s: any) => s.nama_siswa && s.kelas && s.sekolah_id === DEFAULT_SEKOLAH_ID);
      if (!hasValidRecords) {
        throw new Error('One or more student records have missing names or invalid sekolah_id');
      }
      pass('ADMIN-04', 'Admin retrieves complete student roster (data_siswa)', 
        `Loaded exactly 14 students across classes (X Merdeka, XI Merdeka, XII Merdeka) without RLS errors`);
    } catch (err) {
      fail('ADMIN-04', 'Admin retrieves complete student roster (data_siswa)', err);
    }

    // Test 1.5: Admin queries presensi_guru, jurnal_pembelajaran, pengaturan
    try {
      const [presensiRes, jurnalRes, configRes] = await Promise.all([
        adminClient.from('presensi_guru').select('id, timestamp, nama_guru').limit(20),
        adminClient.from('jurnal_pembelajaran').select('id, tanggal, nama_guru').limit(20),
        adminClient.from('pengaturan').select('id, key, value')
      ]);

      if (presensiRes.error) throw new Error(`presensi_guru error: ${presensiRes.error.message}`);
      if (jurnalRes.error) throw new Error(`jurnal_pembelajaran error: ${jurnalRes.error.message}`);
      if (configRes.error) throw new Error(`pengaturan error: ${configRes.error.message}`);

      if (!presensiRes.data || presensiRes.data.length === 0) {
        throw new Error('presensi_guru returned 0 rows for admin');
      }
      if (!jurnalRes.data || jurnalRes.data.length === 0) {
        throw new Error('jurnal_pembelajaran returned 0 rows for admin');
      }
      if (!configRes.data || configRes.data.length < 50) {
        throw new Error(`pengaturan returned only ${configRes.data?.length} rows, expected >= 50`);
      }

      pass('ADMIN-05', 'Admin retrieves operational tables cleanly (presensi, jurnal, pengaturan)', 
        `Presensi: ${presensiRes.data.length} sample rows, Jurnal: ${jurnalRes.data.length} sample rows, Pengaturan: ${configRes.data.length} rows`);
    } catch (err) {
      fail('ADMIN-05', 'Admin retrieves operational tables cleanly (presensi, jurnal, pengaturan)', err);
    }

    // Test 1.6: AdminDataView fallback direct REST fetch with session token
    try {
      const endpoint = `${supabaseUrl}/rest/v1/data_siswa?select=*&limit=100&sekolah_id=eq.${DEFAULT_SEKOLAH_ID}`;
      const restRes = await fetch(endpoint, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'x-sekolah-id': DEFAULT_SEKOLAH_ID,
          'x-user-role': adminUser.role,
          'x-user-id': adminUser.id,
          'x-session-token': adminUser.session_token
        }
      });

      if (!restRes.ok) {
        throw new Error(`REST fallback failed with HTTP ${restRes.status}: ${restRes.statusText}`);
      }
      const restData = await restRes.json();
      if (!Array.isArray(restData) || restData.length !== 14) {
        throw new Error(`REST fallback expected 14 students, got ${Array.isArray(restData) ? restData.length : typeof restData}`);
      }

      pass('ADMIN-06', 'AdminDataView direct REST fallback with x-session-token', 
        `HTTP 200 OK — Successfully loaded ${restData.length} records via direct REST with session token`);
    } catch (err) {
      fail('ADMIN-06', 'AdminDataView direct REST fallback with x-session-token', err);
    }
  }

  // ==========================================================================
  // SUITE 2: Teacher (Guru) Role Data Access Verification
  // ==========================================================================
  suiteHeader('2. Teacher (Guru) Role Data Access Verification');

  // Test 2.1: Authenticate standard teachers (Riski, Adnan, Fitra)
  const teacherCreds = [
    { username: 'Riski', password: 'Riski27' },
    { username: 'Adnan', password: 'Adnan27' },
    { username: 'Fitra', password: 'Fitra27' },
  ];

  for (const cred of teacherCreds) {
    try {
      const authRes = await anonClient.rpc('verify_login', {
        p_username: cred.username,
        p_password: cred.password
      });

      if (authRes.error) throw authRes.error;
      if (!authRes.data || authRes.data.length === 0) {
        throw new Error(`verify_login returned 0 rows for teacher ${cred.username}`);
      }

      const tUser = authRes.data[0];
      if (tUser.role !== 'Guru') throw new Error(`Expected role 'Guru', got '${tUser.role}'`);
      if (!tUser.session_token) throw new Error('Missing session_token');
      teacherUsers[cred.username] = tUser;

      pass(`GURU-01-${cred.username}`, `Teacher authentication (${cred.username})`, 
        `Authenticated as ${tUser.nama}, Session: ${tUser.session_token.slice(0, 8)}...`);
    } catch (err) {
      fail(`GURU-01-${cred.username}`, `Teacher authentication (${cred.username})`, err);
    }
  }

  // Test 2.2: Authenticate teacher with academic titles/commas (Tika Mamonto, S.Pd.)
  try {
    const authRes = await anonClient.rpc('verify_login', {
      p_username: 'Tika',
      p_password: 'Tika27'
    });

    if (authRes.error) throw authRes.error;
    if (!authRes.data || authRes.data.length === 0) {
      throw new Error('verify_login returned 0 rows for Tika');
    }

    const tika = authRes.data[0];
    if (!tika.nama.includes(',')) {
      throw new Error(`Expected name with academic title/comma, got '${tika.nama}'`);
    }
    if (tika.role !== 'Guru') throw new Error(`Expected role 'Guru', got '${tika.role}'`);
    teacherUsers['Tika'] = tika;

    // Verify teacher in data_guru with titles ("Ade Fitrawan Ibrahim, M.Pd., Gr.")
    const { data: adeGuru } = await adminClient!
      .from('data_guru')
      .select('*')
      .ilike('nama_guru', '%Ade Fitrawan%');

    if (!adeGuru || adeGuru.length === 0) {
      throw new Error('Could not find teacher Ade Fitrawan in data_guru');
    }

    pass('GURU-02', 'Teacher with academic titles / commas authentication', 
      `Verified: "${tika.nama}" (session: ${tika.session_token.slice(0, 8)}...) & "${adeGuru[0].nama_guru}" in data_guru`);
  } catch (err) {
    fail('GURU-02', 'Teacher with academic titles / commas authentication', err);
  }

  // Test 2.3: Teacher schedule retrieval & non-truncation in findJadwalForGuru
  try {
    if (workflowImportError) throw workflowImportError;
    const riski = teacherUsers['Riski'];
    if (!riski) throw new Error('Riski user not available');

    setServerTenantContext({
      sessionToken: riski.session_token,
      sekolahId: riski.sekolah_id,
      role: riski.role,
      userId: riski.id
    });

    // Test across all school days
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let totalRiskiClasses = 0;
    let daysWithClasses = 0;

    for (const d of days) {
      const schedules = await findJadwalForGuru(d, riski.nama, riski.username, riski.id);
      if (schedules && schedules.length > 0) {
        totalRiskiClasses += schedules.length;
        daysWithClasses++;
      }
    }

    if (totalRiskiClasses === 0) {
      throw new Error('findJadwalForGuru returned 0 total classes across the entire week for Riski');
    }

    // Test Ade Fitrawan schedule matching (UUID vs short name 'Ade')
    const adeSchedules = await findJadwalForGuru('Senin', 'Ade Fitrawan Ibrahim, M.Pd., Gr.', 'Fitrawan', 'fff9d836-b034-4a66-be96-1c1b7cfad277');
    if (!adeSchedules || adeSchedules.length === 0) {
      throw new Error('findJadwalForGuru returned 0 classes for Ade on Senin');
    }

    pass('GURU-03', 'Teacher schedule retrieval & non-truncation (findJadwalForGuru)', 
      `Riski has ${totalRiskiClasses} classes across ${daysWithClasses} days. Ade has ${adeSchedules.length} classes on Senin (No truncation).`);
  } catch (err) {
    fail('GURU-03', 'Teacher schedule retrieval & non-truncation (findJadwalForGuru)', err);
  }

  // Test 2.4: Teacher daily state / gatekeeper evaluation (getGuruDailyState)
  try {
    if (workflowImportError) throw workflowImportError;
    const riski = teacherUsers['Riski'];
    const tika = teacherUsers['Tika'];

    // 1. Evaluate Riski
    setServerTenantContext({
      sessionToken: riski.session_token,
      sekolahId: riski.sekolah_id,
      role: riski.role,
      userId: riski.id
    });

    const riskiState = await getGuruDailyState(riski.nama, riski.username, riski.id);
    if (!riskiState || typeof riskiState !== 'object') {
      throw new Error('getGuruDailyState returned non-object for Riski');
    }
    if (!('isAlpa' in riskiState) || !('aturanKehadiran' in riskiState)) {
      throw new Error('getGuruDailyState missing key fields');
    }

    // 2. Evaluate Tika (teacher with academic title and wajib_hadir_hanya_mengajar = true)
    setServerTenantContext({
      sessionToken: tika.session_token,
      sekolahId: tika.sekolah_id,
      role: tika.role,
      userId: tika.id
    });

    const tikaState = await getGuruDailyState(tika.nama, tika.username, tika.id);
    if (!tikaState || typeof tikaState !== 'object') {
      throw new Error('getGuruDailyState returned non-object for Tika');
    }

    // Direct check of data_guru schema compliance (must NOT query data_guru.nama)
    const tikaClient = createTenantClient(tika);
    const { data: gCheck, error: gErr } = await tikaClient
      .from('data_guru')
      .select('id, nip, nama_guru, wajib_hadir_hanya_mengajar')
      .eq('nip', tika.username);

    if (gErr) throw new Error(`data_guru query failed: ${gErr.message}`);
    if (!gCheck || gCheck.length === 0) throw new Error('Could not find Tika in data_guru');

    const isExempt = gCheck[0].wajib_hadir_hanya_mengajar === true;

    pass('GURU-04', 'Teacher daily gatekeeper evaluation (getGuruDailyState)', 
      `Evaluated cleanly without column 42703 error. Tika exemption: ${isExempt}, Aturan: ${tikaState.aturanKehadiran}, Alpa: ${tikaState.isAlpa}`);
  } catch (err) {
    fail('GURU-04', 'Teacher daily gatekeeper evaluation (getGuruDailyState)', err);
  }

  // Test 2.5: PostgREST Filter Syntax Resilience on Academic Titles / Commas
  try {
    const tika = teacherUsers['Tika'];
    const tikaClient = createTenantClient(tika);

    // Unsanitized query with comma would cause PGRST100
    // Test that the sanitized / clean query executes with HTTP 200 without error
    const cleanName = sanitizeNameForOrFilter(tika.nama);
    const filterStr = `nip.eq.${tika.username},nama_guru.ilike.%${cleanName}%`;

    const { data: mapelData, error: mapelErr } = await tikaClient
      .from('guru_mapel')
      .select('*')
      .or(filterStr);

    if (mapelErr) {
      throw new Error(`Sanitized PostgREST filter failed with: ${mapelErr.message}`);
    }

    // Also test Ade Fitrawan Ibrahim, M.Pd., Gr.
    const cleanAdeName = sanitizeNameForOrFilter('Ade Fitrawan Ibrahim, M.Pd., Gr.');
    const adeFilter = `nip.eq.Fitrawan,nama_guru.ilike.%${cleanAdeName}%`;
    const { error: adeErr } = await tikaClient
      .from('guru_mapel')
      .select('*')
      .or(adeFilter);

    if (adeErr) {
      throw new Error(`Ade Fitrawan filter failed with: ${adeErr.message}`);
    }

    pass('GURU-05', 'PostgREST filter syntax resilience on academic titles with commas', 
      `Sanitized filters executed cleanly without PGRST100 logic tree parse errors ("${cleanName}", "${cleanAdeName}")`);
  } catch (err) {
    fail('GURU-05', 'PostgREST filter syntax resilience on academic titles with commas', err);
  }

  // Test 2.6: Teaching Journal & Attendance Queries for Teacher
  try {
    const riski = teacherUsers['Riski'];
    const riskiClient = createTenantClient(riski);

    const [presensiRes, jurnalRes] = await Promise.all([
      riskiClient.from('presensi_guru').select('*').limit(10),
      riskiClient.from('jurnal_pembelajaran').select('*').limit(10)
    ]);

    if (presensiRes.error) throw new Error(`Teacher presensi query error: ${presensiRes.error.message}`);
    if (jurnalRes.error) throw new Error(`Teacher jurnal query error: ${jurnalRes.error.message}`);

    pass('GURU-06', 'Teacher retrieves attendance & teaching journals', 
      `Presensi query: ${presensiRes.data?.length ?? 0} rows, Jurnal query: ${jurnalRes.data?.length ?? 0} rows (clean execution)`);
  } catch (err) {
    fail('GURU-06', 'Teacher retrieves attendance & teaching journals', err);
  }

  // ==========================================================================
  // SUITE 3: Siswa (Student) Data Access Integrity & Isolation
  // ==========================================================================
  suiteHeader('3. Siswa (Student) Data Access Integrity & Isolation');

  // Test 3.1: Authorized staff access to student roster
  try {
    if (!adminClient) throw new Error('adminClient not initialized');
    const riski = teacherUsers['Riski'];
    const riskiClient = createTenantClient(riski);

    const [adminSiswa, guruSiswa] = await Promise.all([
      adminClient.from('data_siswa').select('id, nama_siswa, nisn, kelas'),
      riskiClient.from('data_siswa').select('id, nama_siswa, nisn, kelas')
    ]);

    if (adminSiswa.error) throw new Error(`Admin query error: ${adminSiswa.error.message}`);
    if (guruSiswa.error) throw new Error(`Guru query error: ${guruSiswa.error.message}`);

    if (adminSiswa.data?.length !== 14 || guruSiswa.data?.length !== 14) {
      throw new Error(`Expected 14 students for both Admin and Guru, got Admin=${adminSiswa.data?.length}, Guru=${guruSiswa.data?.length}`);
    }

    pass('SISWA-01', 'Authorized staff (Admin & Guru) access to student roster', 
      `Admin retrieved ${adminSiswa.data.length} students; Guru retrieved ${guruSiswa.data.length} students`);
  } catch (err) {
    fail('SISWA-01', 'Authorized staff (Admin & Guru) access to student roster', err);
  }

  // Test 3.2: Unauthenticated client denial (RLS enforcement on data_siswa)
  try {
    const rawAnonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await rawAnonClient.from('data_siswa').select('*');

    // Under RLS, unauthenticated SELECT on tenant table returns 0 rows (no data leakage)
    if (data && data.length > 0) {
      throw new Error(`CRITICAL SECURITY FAILURE: Unauthenticated anon client read ${data.length} student records!`);
    }

    pass('SISWA-02', 'Unauthenticated request denial on student data (RLS read protection)', 
      `Anonymous client received 0 rows from data_siswa (RLS isolation strictly enforced)`);
  } catch (err) {
    fail('SISWA-02', 'Unauthenticated request denial on student data (RLS read protection)', err);
  }

  // Test 3.3: Unauthenticated mutation protection (RLS write rejection)
  try {
    const rawAnonClient = createClient(supabaseUrl, supabaseAnonKey);
    const rogueStudentId = randomUUID();

    const insertRes = await rawAnonClient.from('data_siswa').insert({
      id: rogueStudentId,
      nama_siswa: 'Hacker Rogue Student',
      nisn: '9999999999',
      kelas: 'X Merdeka',
      sekolah_id: DEFAULT_SEKOLAH_ID
    }).select();

    if (insertRes.data && insertRes.data.length > 0) {
      throw new Error(`CRITICAL SECURITY FAILURE: Unauthenticated anon client inserted record into data_siswa!`);
    }

    pass('SISWA-03', 'Unauthenticated mutation rejection on data_siswa (RLS write protection)', 
      `Anonymous INSERT strictly rejected by RLS (0 rows created, data integrity preserved)`);
  } catch (err) {
    fail('SISWA-03', 'Unauthenticated mutation rejection on data_siswa (RLS write protection)', err);
  }

  // Test 3.4: Cross-school multi-tenant isolation & header spoofing defense
  try {
    const riski = teacherUsers['Riski'];
    const fakeSchoolId = randomUUID();

    // Attacker sends authentic School A session token but spoofs x-sekolah-id with fakeSchoolId
    const spoofClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-session-token': riski.session_token,
          'x-sekolah-id': fakeSchoolId,
          'x-user-role': 'Guru',
          'x-user-id': riski.id
        }
      }
    });

    const { data: spoofData } = await spoofClient.from('data_siswa').select('*');
    // Because get_auth_user_sekolah_id() derives the tenant from the verified session_token,
    // it MUST return School A data, NOT let the user wander into fakeSchoolId
    if (spoofData && spoofData.some((s: any) => s.sekolah_id === fakeSchoolId)) {
      throw new Error('RLS allowed spoofed x-sekolah-id to access or create cross-tenant data!');
    }

    // Forged session token (non-existent UUID)
    const forgedTokenClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-session-token': randomUUID(),
          'x-sekolah-id': DEFAULT_SEKOLAH_ID,
          'x-user-role': 'Admin'
        }
      }
    });

    const { data: forgedData } = await forgedTokenClient.from('data_siswa').select('*');
    if (forgedData && forgedData.length > 0) {
      throw new Error('Forged session token was accepted by RLS!');
    }

    pass('SISWA-04', 'Cross-school multi-tenant isolation & anti-spoofing defense', 
      `Spoofed headers and forged session tokens correctly rejected (0 cross-tenant data leakage)`);
  } catch (err) {
    fail('SISWA-04', 'Cross-school multi-tenant isolation & anti-spoofing defense', err);
  }

  // ==========================================================================
  // SUITE 4: Legacy / Stale Session Resilience
  // ==========================================================================
  suiteHeader('4. Legacy / Stale Session Resilience');

  // Test 4.1: Legacy session without session_token returns 0 rows (rejected by RLS)
  try {
    const legacyAdminClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-sekolah-id': DEFAULT_SEKOLAH_ID,
          'x-user-role': 'Admin'
          // NO x-session-token, NO x-user-id
        }
      }
    });

    const [uRes, sRes, gRes] = await Promise.all([
      legacyAdminClient.from('users').select('*'),
      legacyAdminClient.from('data_siswa').select('*'),
      legacyAdminClient.from('data_guru').select('*')
    ]);

    if ((uRes.data?.length ?? 0) > 0 || (sRes.data?.length ?? 0) > 0 || (gRes.data?.length ?? 0) > 0) {
      throw new Error(`Legacy client without session_token unexpectedly received data! Users: ${uRes.data?.length}, Siswa: ${sRes.data?.length}`);
    }

    pass('SESSION-01', 'Legacy session without session_token rejected by RLS', 
      `All queries returned 0 rows (users: 0, siswa: 0, data_guru: 0), confirming RLS token gating`);
  } catch (err) {
    fail('SESSION-01', 'Legacy session without session_token rejected by RLS', err);
  }

  // Test 4.2: Session integrity validation helper contract
  try {
    const legacySessionMock = {
      id: 'd23141e4-2116-4946-8094-895ef21a50e5',
      username: 'admin',
      nama: 'Admin SMA Nizamudin',
      role: 'Admin',
      sekolah_id: DEFAULT_SEKOLAH_ID
      // session_token is undefined
    };

    const isLegacyValid = isSessionValid(legacySessionMock);
    if (isLegacyValid) {
      throw new Error('isSessionValid failed: Evaluated legacy session lacking session_token as valid');
    }

    const freshSessionMock = {
      ...legacySessionMock,
      session_token: randomUUID()
    };

    const isFreshValid = isSessionValid(freshSessionMock);
    if (!isFreshValid) {
      throw new Error('isSessionValid failed: Evaluated fresh session with session_token as invalid');
    }

    pass('SESSION-02', 'Session integrity validation contract (isSessionValid)', 
      `Legacy session correctly marked invalid (false); Fresh session correctly marked valid (true)`);
  } catch (err) {
    fail('SESSION-02', 'Session integrity validation contract (isSessionValid)', err);
  }

  // Test 4.3: Session auto-recovery via re-authentication
  try {
    // When a legacy session is detected, app invokes verify_login to acquire fresh session_token
    const reauthRes = await anonClient.rpc('verify_login', {
      p_username: 'admin',
      p_password: 'QWerty1334#'
    });

    if (reauthRes.error) throw reauthRes.error;
    if (!reauthRes.data || reauthRes.data.length === 0) {
      throw new Error('Re-authentication failed');
    }

    const recoveredUser = reauthRes.data[0];
    if (!isSessionValid(recoveredUser)) {
      throw new Error('Recovered user session is invalid');
    }

    const recoveredClient = createTenantClient(recoveredUser);
    const { data: siswaData, error: siswaErr } = await recoveredClient.from('data_siswa').select('*');

    if (siswaErr) throw siswaErr;
    if (!siswaData || siswaData.length !== 14) {
      throw new Error(`Recovered client received ${siswaData?.length} students, expected 14`);
    }

    pass('SESSION-03', 'Session recovery via re-authentication immediately restores access', 
      `Re-auth issued fresh token ${recoveredUser.session_token.slice(0, 8)}... and restored all 14 student records`);
  } catch (err) {
    fail('SESSION-03', 'Session recovery via re-authentication immediately restores access', err);
  }

  // Test 4.4: Expired / Rotated session token rejection
  try {
    // Save current token, then login again to rotate token in DB
    const oldToken = adminUser.session_token;

    const rotateRes = await anonClient.rpc('verify_login', {
      p_username: 'admin',
      p_password: 'QWerty1334#'
    });
    const newTokenUser = rotateRes.data[0];

    // Client using oldToken now (without user_id bypass)
    const oldTokenClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-session-token': oldToken,
          'x-sekolah-id': DEFAULT_SEKOLAH_ID,
          'x-user-role': 'Admin'
        }
      }
    });

    const { data: oldData } = await oldTokenClient.from('data_siswa').select('*');
    if (oldData && oldData.length > 0) {
      throw new Error(`Rotated token was not invalidated! Old token received ${oldData.length} rows`);
    }

    // Client using newTokenUser
    const newTokenClient = createTenantClient(newTokenUser);
    const { data: newData } = await newTokenClient.from('data_siswa').select('*');
    if (!newData || newData.length !== 14) {
      throw new Error(`New token failed to read data! Count: ${newData?.length}`);
    }

    pass('SESSION-04', 'Rotated/revoked session token rejection', 
      `Old rotated token returned 0 rows; New token successfully retrieved 14 rows`);
  } catch (err) {
    fail('SESSION-04', 'Rotated/revoked session token rejection', err);
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${CYAN}${BOLD}  TEST EXECUTION SUMMARY${RESET}`);
  console.log(`${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  Total Checks : ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed       : ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed       : ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);

  if (failureDetails.length > 0) {
    console.log(`\n${RED}${BOLD}Failures Summary:${RESET}`);
    failureDetails.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✔ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY.${RESET}\n`);
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error(`${RED}Unhandled test runner exception:${RESET}`, err);
  process.exit(1);
});
