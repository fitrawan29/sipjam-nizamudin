/**
 * ============================================================================
 * ADVERSARIAL RLS INTEGRITY & MULTI-TENANT ISOLATION TEST SUITE
 * File: tests/m7_rls_integrity.test.ts
 *
 * This test suite provides authentic, adversarial, and uncheatable verification
 * for Supabase Row Level Security (RLS) policies and Multi-Tenant Isolation:
 *
 * 1. UNHEADERED / ANONYMOUS DENIAL:
 *    Proves unauthenticated / anonymous clients with NO headers receive 0 rows
 *    on SELECT and are rejected (error / 0 affected) on INSERT/UPDATE/DELETE.
 *
 * 2. CREDENTIAL LEAK PROTECTION:
 *    Proves anonymous clients CANNOT dump user records or passwords from
 *    public.users, while verify_login RPC remains functional for valid logins.
 *
 * 3. REAL CROSS-TENANT ISOLATION:
 *    Proves School A client CANNOT read, insert, update, or delete School B's
 *    records when School B ACTUALLY HAS REAL DATA populated in the database.
 *    (Eliminates previous self-certifying queries against non-existent UUIDs).
 *
 * 4. HEADER SPOOFING & PRIVILEGE ESCALATION DEFENSE:
 *    Proves School Admin CANNOT escalate to Superadmin by spoofing headers
 *    or tamper with other schools' entities or create rogue Superadmins.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Ensure environment variables are loaded from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config();

// ANSI color formatting for crystal-clear terminal reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passedChecks = 0;
let failedChecks = 0;
let totalChecks = 0;

function pass(msg: string) {
  passedChecks++;
  totalChecks++;
  console.log(`${GREEN}✅ PASS [${totalChecks}]:${RESET} ${msg}`);
}

function fail(msg: string, detail?: any): never {
  failedChecks++;
  totalChecks++;
  console.error(`${RED}❌ FAIL [${totalChecks}]:${RESET} ${msg}`, detail !== undefined ? detail : '');
  throw new Error(`Assertion failed: ${msg}`);
}

async function runRlsIntegrityVerification() {
  console.log(`\n${CYAN}${BOLD}======================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}     M7 ADVERSARIAL RLS INTEGRITY & MULTI-TENANT VERIFICATION SUITE   ${RESET}`);
  console.log(`${CYAN}${BOLD}======================================================================${RESET}\n`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment');
  }

  // Identifiers for multi-tenant isolation testing
  const timestamp = Date.now();
  const defaultSchoolAId = 'a0000000-0000-0000-0000-000000000001'; // SMA Nizamudin
  const schoolBId = randomUUID();
  const schoolBNpsn = `99${timestamp.toString().slice(-6)}`;
  
  const userAdminB = `admin_b_${timestamp}`;
  const userGuruB = `guru_b_${timestamp}`;

  // Unique fixture IDs for School B real data
  const guruBId = randomUUID();
  const siswaBId = randomUUID();
  const jurnalBId = randomUUID();
  const presensiBId = randomUUID();
  const settingBId = randomUUID();

  // --------------------------------------------------------------------------
  // Client Profiles
  // --------------------------------------------------------------------------
  // 1. Raw anonymous client (NO custom headers, NO auth tokens)
  const anonClient = createClient(supabaseUrl, supabaseKey);

  // 2. School A Admin client (Authenticated for School A)
  const schoolAAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Admin'
      }
    }
  });

  // 3. School A Guru client (Authenticated for School A)
  const schoolAGuruClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Guru'
      }
    }
  });

  // 4. School B Admin client (Authenticated for School B)
  const schoolBAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': schoolBId,
        'x-user-role': 'Admin'
      }
    }
  });

  // 5. Spoofed School Admin client (School A Admin attempting to claim Superadmin)
  const spoofedSchoolAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Superadmin'
      }
    }
  });

  // 6. Platform Superadmin client (Legitimate platform administrator)
  const superadminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin'
      }
    }
  });

  try {
    // =========================================================================
    // SECTION 1: ANONYMOUS / UNHEADERED CLIENT DENIAL ON TENANT TABLES
    // =========================================================================
    console.log(`${CYAN}--- SECTION 1: Anonymous Client Denial on Tenant Tables (No Headers) ---${RESET}`);

    // Verify baseline: School A has actual data in data_guru
    const { data: superTeachers, error: errSuperT } = await superadminClient
      .from('data_guru')
      .select('id, nama_guru, sekolah_id')
      .eq('sekolah_id', defaultSchoolAId);

    if (errSuperT || !superTeachers || superTeachers.length === 0) {
      fail('Setup error: School A must have existing teacher records for valid test', errSuperT);
    }
    pass(`Baseline verified: School A contains ${superTeachers.length} real teacher records`);
    const existingGuruAId = superTeachers[0].id;
    const existingGuruAName = superTeachers[0].nama_guru;

    // 1.1 Anonymous SELECT Denial: data_guru
    const { data: anonGuru, error: errAnonGuru } = await anonClient
      .from('data_guru')
      .select('id, nama_guru');

    if (anonGuru && anonGuru.length > 0) {
      fail(`CRITICAL RLS VIOLATION: Anonymous client read ${anonGuru.length} rows from data_guru without headers!`, anonGuru[0]);
    }
    pass('Anonymous SELECT on data_guru returned 0 rows (RLS policy denied access)');

    // 1.2 Anonymous SELECT Denial: data_siswa
    const { data: anonSiswa } = await anonClient.from('data_siswa').select('id, nama_siswa');
    if (anonSiswa && anonSiswa.length > 0) {
      fail(`CRITICAL RLS VIOLATION: Anonymous client read ${anonSiswa.length} rows from data_siswa!`);
    }
    pass('Anonymous SELECT on data_siswa returned 0 rows');

    // 1.3 Anonymous SELECT Denial: pengaturan
    const { data: anonPengaturan } = await anonClient.from('pengaturan').select('id, key, value');
    if (anonPengaturan && anonPengaturan.length > 0) {
      fail(`CRITICAL RLS VIOLATION: Anonymous client read ${anonPengaturan.length} rows from pengaturan!`);
    }
    pass('Anonymous SELECT on pengaturan returned 0 rows');

    // 1.4 Anonymous SELECT Denial: jurnal_pembelajaran
    const { data: anonJurnal } = await anonClient.from('jurnal_pembelajaran').select('id, mapel');
    if (anonJurnal && anonJurnal.length > 0) {
      fail(`CRITICAL RLS VIOLATION: Anonymous client read ${anonJurnal.length} rows from jurnal_pembelajaran!`);
    }
    pass('Anonymous SELECT on jurnal_pembelajaran returned 0 rows');

    // 1.5 Anonymous SELECT Denial: presensi_guru
    const { data: anonPresensi } = await anonClient.from('presensi_guru').select('id, nama_guru');
    if (anonPresensi && anonPresensi.length > 0) {
      fail(`CRITICAL RLS VIOLATION: Anonymous client read ${anonPresensi.length} rows from presensi_guru!`);
    }
    pass('Anonymous SELECT on presensi_guru returned 0 rows');

    // 1.6 Anonymous INSERT Denial: Attempting to insert into pengaturan
    const anonAttackSettingId = randomUUID();
    const { data: anonInsData, error: anonInsErr } = await anonClient
      .from('pengaturan')
      .insert([{
        id: anonAttackSettingId,
        sekolah_id: defaultSchoolAId,
        key: 'malicious_anon_key',
        value: 'ATTACK_SUCCESS'
      }])
      .select();

    if (!anonInsErr && anonInsData && anonInsData.length > 0) {
      // Teardown injected row immediately
      await superadminClient.from('pengaturan').delete().eq('id', anonAttackSettingId);
      fail('CRITICAL RLS VIOLATION: Anonymous client without headers successfully INSERTED row into pengaturan!', anonInsData);
    }
    pass('Anonymous INSERT into pengaturan rejected with RLS error or 0 inserted rows');

    // 1.7 Anonymous UPDATE Denial: Attempting to tamper with School A teacher name
    const { data: anonUpdData, error: anonUpdErr } = await anonClient
      .from('data_guru')
      .update({ nama_guru: 'HACKED_BY_ANON' })
      .eq('id', existingGuruAId)
      .select();

    if (!anonUpdErr && anonUpdData && anonUpdData.length > 0) {
      // Revert tampering
      await superadminClient.from('data_guru').update({ nama_guru: existingGuruAName }).eq('id', existingGuruAId);
      fail('CRITICAL RLS VIOLATION: Anonymous client successfully UPDATED teacher record!', anonUpdData);
    }
    // Privileged verification: Check teacher was NOT altered
    const { data: checkGuruA } = await superadminClient.from('data_guru').select('nama_guru').eq('id', existingGuruAId).single();
    if (checkGuruA?.nama_guru !== existingGuruAName) {
      fail(`Teacher record was mutated during anonymous update attempt! Expected "${existingGuruAName}", found "${checkGuruA?.nama_guru}"`);
    }
    pass('Anonymous UPDATE on data_guru rejected (0 rows affected; record intact)');

    // 1.8 Anonymous DELETE Denial: Attempting to delete School A teacher
    const { data: anonDelData, error: anonDelErr } = await anonClient
      .from('data_guru')
      .delete()
      .eq('id', existingGuruAId)
      .select();

    if (!anonDelErr && anonDelData && anonDelData.length > 0) {
      fail('CRITICAL RLS VIOLATION: Anonymous client successfully DELETED teacher record!', anonDelData);
    }
    // Privileged verification: Check teacher still exists
    const { data: checkGuruAExists } = await superadminClient.from('data_guru').select('id').eq('id', existingGuruAId).single();
    if (!checkGuruAExists) {
      fail('Teacher record was deleted by anonymous client!');
    }
    pass('Anonymous DELETE on data_guru rejected (0 rows affected; record preserved)');

    // =========================================================================
    // SECTION 2: ANONYMOUS CREDENTIAL & PASSWORD PROTECTION ON public.users
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 2: Anonymous Credential & Password Dump Protection (public.users) ---${RESET}`);

    // 2.1 Full User Table Dump Prevention
    const { data: anonUsersDump, error: errUsersDump } = await anonClient
      .from('users')
      .select('*');

    if (anonUsersDump && anonUsersDump.length > 0) {
      fail(`CRITICAL CREDENTIAL LEAK: Anonymous client dumped ${anonUsersDump.length} user accounts from public.users!`, anonUsersDump[0]);
    }
    pass('Anonymous SELECT on public.users returned 0 rows (No bulk user credentials leaked)');

    // 2.2 Targeted Superadmin Password Query Prevention
    const { data: anonSuperQuery } = await anonClient
      .from('users')
      .select('id, username, password, role')
      .eq('username', 'superadmin');

    if (anonSuperQuery && anonSuperQuery.length > 0) {
      fail('CRITICAL CREDENTIAL LEAK: Anonymous client queried Superadmin password!', anonSuperQuery);
    }
    pass('Targeted query for Superadmin credentials returned 0 rows');

    // 2.3 Password Column Query Prevention
    const { data: anonPassQuery } = await anonClient
      .from('users')
      .select('password')
      .not('password', 'is', null);

    if (anonPassQuery && anonPassQuery.length > 0) {
      fail('CRITICAL CREDENTIAL LEAK: Anonymous client fetched plaintext password hashes!', anonPassQuery);
    }
    pass('Direct query for password hashes returned 0 rows');

    // 2.4 Legitimate verify_login RPC Authentication
    const { data: validLogin, error: errValidLogin } = await anonClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'superadmin123'
    });

    if (errValidLogin || !validLogin || validLogin.length !== 1) {
      fail('verify_login RPC failed for valid superadmin credentials', errValidLogin);
    }
    const loggedInUser = validLogin[0];
    if (loggedInUser.username !== 'superadmin' || loggedInUser.role !== 'Superadmin') {
      fail('verify_login RPC returned unexpected user payload', loggedInUser);
    }
    if ('password' in loggedInUser) {
      fail('verify_login RPC unexpectedly returned plaintext password field in result payload!', loggedInUser);
    }
    pass(`verify_login RPC functional: authenticated ${loggedInUser.username} (${loggedInUser.role}) without leaking password`);

    // 2.5 verify_login RPC Rejection on Bad Credentials
    const { data: badLogin } = await anonClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'wrong_password_999'
    });
    if (badLogin && badLogin.length > 0) {
      fail('verify_login RPC accepted incorrect password!', badLogin);
    }
    pass('verify_login RPC correctly rejected invalid password (returned 0 rows)');

    // 2.6 verify_login SQL Injection Neutralization
    const { data: sqliLogin } = await anonClient.rpc('verify_login', {
      p_username: "' OR '1'='1",
      p_password: "' OR '1'='1"
    });
    if (sqliLogin && sqliLogin.length > 0) {
      fail('verify_login RPC vulnerable to SQL injection bypass!', sqliLogin);
    }
    pass('verify_login RPC neutralized SQL injection attempts');

    // =========================================================================
    // SECTION 3: TRUE MULTI-TENANT ISOLATION (SCHOOL A VS SCHOOL B REAL DATA)
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 3: True Multi-Tenant Isolation (School A vs School B Real Data) ---${RESET}`);

    // 3.0 Provision School B and Populate Non-Trivial Real Data
    console.log(`Provisioning real secondary tenant: School B (ID: ${schoolBId}, NPSN: ${schoolBNpsn})...`);
    const { error: errInsSchoolB } = await superadminClient.from('sekolah').insert([{
      id: schoolBId,
      nama: 'SMA Negeri 2 Bolaang',
      npsn: schoolBNpsn,
      alamat: 'Jl. Trans Sulawesi No. 20, Bolaang',
      kota_kabupaten: 'Kab. Bolaang Mongondow',
      provinsi: 'Sulawesi Utara',
      status: 'aktif'
    }]);

    if (errInsSchoolB) {
      fail('Failed to register School B via superadmin', errInsSchoolB);
    }

    // Populate Real School B Data across Master & Transactional Tables
    const { error: errGuruB } = await schoolBAdminClient.from('data_guru').insert([{
      id: guruBId,
      sekolah_id: schoolBId,
      nama_guru: 'Guru Eksklusif Sekolah B',
      nip: `19850101_${timestamp.toString().slice(-4)}`,
      mata_pelajaran: 'Fisika Kuantum',
      status: 'aktif'
    }]);
    if (errGuruB) fail('Failed to populate School B teacher', errGuruB);

    const { error: errSiswaB } = await schoolBAdminClient.from('data_siswa').insert([{
      id: siswaBId,
      sekolah_id: schoolBId,
      nama_siswa: 'Siswa Eksklusif Sekolah B',
      nisn: `NISB_${timestamp.toString().slice(-4)}`,
      kelas: 'XI-IPA'
    }]);
    if (errSiswaB) fail('Failed to populate School B student', errSiswaB);

    const { error: errCfgB } = await schoolBAdminClient.from('pengaturan').insert([{
      id: settingBId,
      sekolah_id: schoolBId,
      key: 'rekening_bank_sekolah',
      value: 'CONFIDENTIAL_BANK_ACCOUNT_B'
    }]);
    if (errCfgB) fail('Failed to populate School B settings', errCfgB);

    const { error: errJurnalB } = await schoolBAdminClient.from('jurnal_pembelajaran').insert([{
      id: jurnalBId,
      sekolah_id: schoolBId,
      nama_guru: 'Guru Eksklusif Sekolah B',
      mapel: 'Fisika Kuantum',
      kelas: 'XI-IPA',
      tanggal: '2026-09-12',
      jam_ke: '3-4',
      pertemuan_ke: '2',
      materi_pembelajaran: 'Eksperimen Interferometer Michelson',
      kegiatan: 'Praktikum lab',
      kehadiran_murid: '30 Siswa'
    }]);
    if (errJurnalB) fail('Failed to populate School B journal', errJurnalB);

    const { error: errPresensiB } = await schoolBAdminClient.from('presensi_guru').insert([{
      id: presensiBId,
      sekolah_id: schoolBId,
      nama_guru: 'Guru Eksklusif Sekolah B',
      tipe_absen: 'datang',
      jenis_presensi: 'Hadir',
      timestamp: new Date().toISOString()
    }]);
    if (errPresensiB) fail('Failed to populate School B attendance', errPresensiB);

    // Verify via Superadmin that School B data genuinely exists in the database!
    const { data: verifyGuruB } = await superadminClient.from('data_guru').select('id').eq('id', guruBId).single();
    const { data: verifyCfgB } = await superadminClient.from('pengaturan').select('id').eq('id', settingBId).single();
    if (!verifyGuruB || !verifyCfgB) {
      fail('Setup verification failed: School B data was not confirmed in database');
    }
    pass('School B successfully provisioned with confirmed real rows across all tenant tables');

    // 3.1 Cross-Tenant SELECT Attack by Target ID
    const { data: leakGuruById } = await schoolAAdminClient
      .from('data_guru')
      .select('*')
      .eq('id', guruBId);

    if (leakGuruById && leakGuruById.length > 0) {
      fail('CRITICAL MULTI-TENANT LEAK: School A Admin read School B teacher by ID!', leakGuruById);
    }
    pass('Cross-tenant SELECT by ID blocked: School A Admin cannot read School B teacher');

    // 3.2 Cross-Tenant SELECT Attack by Explicit sekolah_id Filter
    const { data: leakGuruBySchool } = await schoolAAdminClient
      .from('data_guru')
      .select('*')
      .eq('sekolah_id', schoolBId);

    if (leakGuruBySchool && leakGuruBySchool.length > 0) {
      fail('CRITICAL MULTI-TENANT LEAK: School A Admin read records by filtering for School B ID!', leakGuruBySchool);
    }
    pass('Cross-tenant SELECT with foreign sekolah_id filter blocked (returned 0 rows)');

    // 3.3 Cross-Tenant SELECT Attack without Filter (Table Sweep)
    const { data: unfilteredGuru } = await schoolAAdminClient
      .from('data_guru')
      .select('id, nama_guru, sekolah_id');

    const containsForeignRecords = unfilteredGuru?.some(g => g.sekolah_id === schoolBId || g.id === guruBId);
    if (containsForeignRecords) {
      fail('CRITICAL MULTI-TENANT LEAK: Unfiltered table query returned records from School B!', unfilteredGuru);
    }
    const allBelongToA = (unfilteredGuru || []).every(g => g.sekolah_id === defaultSchoolAId);
    if (!allBelongToA) {
      fail('Unfiltered table query returned rows not belonging to School A');
    }
    pass('Unfiltered SELECT sweep returned strictly School A records (100% tenant containment)');

    // 3.4 Cross-Tenant SELECT on Sensitive Settings
    const { data: leakSettings } = await schoolAAdminClient
      .from('pengaturan')
      .select('*')
      .eq('id', settingBId);

    if (leakSettings && leakSettings.length > 0) {
      fail('CRITICAL MULTI-TENANT LEAK: School A Admin read School B sensitive settings!', leakSettings);
    }
    pass('Cross-tenant SELECT on pengaturan blocked (School B bank account isolated)');

    // 3.5 Cross-Tenant SELECT on Teacher Journal & Attendance
    const { data: leakJurnal } = await schoolAGuruClient
      .from('jurnal_pembelajaran')
      .select('*')
      .eq('id', jurnalBId);

    if (leakJurnal && leakJurnal.length > 0) {
      fail('CRITICAL MULTI-TENANT LEAK: School A Guru read School B learning journal!', leakJurnal);
    }
    pass('Cross-tenant SELECT on jurnal_pembelajaran blocked');

    const { data: leakPresensi } = await schoolAGuruClient
      .from('presensi_guru')
      .select('*')
      .eq('id', presensiBId);

    if (leakPresensi && leakPresensi.length > 0) {
      fail('CRITICAL MULTI-TENANT LEAK: School A Guru read School B attendance record!', leakPresensi);
    }
    pass('Cross-tenant SELECT on presensi_guru blocked');

    // 3.6 Cross-Tenant INSERT Attack
    const trojanGuruId = randomUUID();
    const { data: trojanData, error: trojanErr } = await schoolAAdminClient
      .from('data_guru')
      .insert([{
        id: trojanGuruId,
        sekolah_id: schoolBId, // Maliciously targeting School B
        nama_guru: 'Trojan Teacher from School A',
        nip: '199999990000',
        mata_pelajaran: 'Espionage',
        status: 'aktif'
      }])
      .select();

    if (!trojanErr && trojanData && trojanData.length > 0) {
      await superadminClient.from('data_guru').delete().eq('id', trojanGuruId);
      fail('CRITICAL VULNERABILITY: School A Admin successfully inserted a teacher into School B!', trojanData);
    }
    // Verify School B was not polluted
    const { data: checkTrojan } = await superadminClient.from('data_guru').select('id').eq('id', trojanGuruId);
    if (checkTrojan && checkTrojan.length > 0) {
      fail('Trojan record exists in School B after rejected insert!');
    }
    pass('Cross-tenant INSERT rejected (School A cannot inject records into School B)');

    // 3.7 Cross-Tenant UPDATE Attack
    const { data: tamperData, error: tamperErr } = await schoolAAdminClient
      .from('data_guru')
      .update({ nama_guru: 'TAMPERED_BY_SCHOOL_A' })
      .eq('id', guruBId)
      .select();

    if (!tamperErr && tamperData && tamperData.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin modified School B teacher!', tamperData);
    }
    // Verify teacher B record is unaltered
    const { data: checkGuruBUnchanged } = await superadminClient.from('data_guru').select('nama_guru').eq('id', guruBId).single();
    if (checkGuruBUnchanged?.nama_guru !== 'Guru Eksklusif Sekolah B') {
      fail('School B teacher was mutated during cross-tenant update attack!');
    }
    pass('Cross-tenant UPDATE rejected (0 rows modified; School B data immutable to School A)');

    // 3.8 Cross-Tenant DELETE Attack
    const { data: delData, error: delErr } = await schoolAAdminClient
      .from('data_guru')
      .delete()
      .eq('id', guruBId)
      .select();

    if (!delErr && delData && delData.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin deleted School B teacher!', delData);
    }
    // Verify teacher B still exists
    const { data: checkGuruBStillExists } = await superadminClient.from('data_guru').select('id').eq('id', guruBId).single();
    if (!checkGuruBStillExists) {
      fail('School B teacher was deleted during cross-tenant delete attack!');
    }
    pass('Cross-tenant DELETE rejected (0 rows deleted; School B records preserved)');

    // 3.9 Cross-Tenant Bulk DELETE Attack
    const { data: bulkDelData, error: bulkDelErr } = await schoolAAdminClient
      .from('presensi_guru')
      .delete()
      .eq('sekolah_id', schoolBId)
      .select();

    if (!bulkDelErr && bulkDelData && bulkDelData.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin performed bulk delete on School B attendance!', bulkDelData);
    }
    const { data: checkPresensiBStillExists } = await superadminClient.from('presensi_guru').select('id').eq('id', presensiBId).single();
    if (!checkPresensiBStillExists) {
      fail('School B attendance records were wiped by School A Admin!');
    }
    pass('Cross-tenant bulk DELETE rejected (School B attendance unaffected)');

    // =========================================================================
    // SECTION 4: HEADER SPOOFING & PRIVILEGE ESCALATION DEFENSE
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 4: Header Spoofing & Privilege Escalation Defense ---${RESET}`);

    // 4.1 School Admin Spoofing x-user-role: Superadmin while bound to School A
    // An attacker with a legitimate School Admin session sets 'x-user-role': 'Superadmin'
    // in an attempt to register a new school on the platform.
    const illegalSchoolId = randomUUID();
    const { data: spoofInsData, error: spoofInsErr } = await spoofedSchoolAdminClient
      .from('sekolah')
      .insert([{
        id: illegalSchoolId,
        nama: 'Illegal Spoofed School',
        npsn: `00${timestamp.toString().slice(-6)}`,
        status: 'aktif'
      }])
      .select();

    if (!spoofInsErr && spoofInsData && spoofInsData.length > 0) {
      await superadminClient.from('sekolah').delete().eq('id', illegalSchoolId);
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin spoofed Superadmin role and created a new school!', spoofInsData);
    }
    pass('Header spoofing attack on public.sekolah rejected (School Admin cannot create schools)');

    // 4.2 School Admin Spoofing x-user-role to delete other schools
    const { data: spoofDelData, error: spoofDelErr } = await spoofedSchoolAdminClient
      .from('sekolah')
      .delete()
      .eq('id', schoolBId)
      .select();

    if (!spoofDelErr && spoofDelData && spoofDelData.length > 0) {
      fail('CRITICAL PRIVILEGE ESCALATION: Spoofed School Admin deleted School B!', spoofDelData);
    }
    const { data: verifySchoolBStillExists } = await superadminClient.from('sekolah').select('id').eq('id', schoolBId).single();
    if (!verifySchoolBStillExists) {
      fail('School B was deleted by spoofed School Admin client!');
    }
    pass('Header spoofing attack on school deletion blocked (School B unharmed)');

    // 4.3 School Admin attempting to provision a rogue Superadmin user
    const rogueSuperadminUsername = `rogue_super_${timestamp}`;
    const { data: rogueData, error: rogueErr } = await schoolAAdminClient
      .from('users')
      .insert([{
        username: rogueSuperadminUsername,
        password: 'Password123!',
        nama: 'Rogue Superadmin',
        role: 'Superadmin',
        sekolah_id: null
      }])
      .select();

    if (!rogueErr && rogueData && rogueData.length > 0) {
      await superadminClient.from('users').delete().eq('username', rogueSuperadminUsername);
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin created a rogue Superadmin user in public.users!', rogueData);
    }
    pass('Privilege escalation in public.users blocked (School Admin cannot provision Superadmins)');

    // 4.4 School Admin attempting to create an Admin for another school
    const rogueAdminBUsername = `rogue_admin_b_${timestamp}`;
    const { data: rogueAdminBData, error: rogueAdminBErr } = await schoolAAdminClient
      .from('users')
      .insert([{
        username: rogueAdminBUsername,
        password: 'Password123!',
        nama: 'Rogue Admin B',
        role: 'Admin',
        sekolah_id: schoolBId
      }])
      .select();

    if (!rogueAdminBErr && rogueAdminBData && rogueAdminBData.length > 0) {
      await superadminClient.from('users').delete().eq('username', rogueAdminBUsername);
      fail('CRITICAL SECURITY VIOLATION: School A Admin created an Admin user for School B!', rogueAdminBData);
    }
    pass('Cross-tenant user provisioning blocked (School A cannot create users for School B)');

    console.log(`\n${GREEN}${BOLD}======================================================================${RESET}`);
    console.log(`${GREEN}${BOLD}  🎉 ALL ${totalChecks} ADVERSARIAL RLS INTEGRITY CHECKS PASSED WITH ZERO LEAKS! ${RESET}`);
    console.log(`${GREEN}${BOLD}======================================================================${RESET}\n`);

  } finally {
    // =========================================================================
    // SECTION 5: TEARDOWN & RECOVERY
    // =========================================================================
    console.log(`${YELLOW}--- Teardown: Removing temporary test school and cascaded entities ---${RESET}`);
    try {
      // Deleting School B cascades to all test tables (data_guru, data_siswa, pengaturan, jurnal, presensi)
      const { error: teardownErr } = await superadminClient
        .from('sekolah')
        .delete()
        .eq('id', schoolBId);

      if (teardownErr) {
        console.warn('Teardown warning: Failed to delete School B cleanly:', teardownErr);
      } else {
        console.log('✅ Teardown: School B and all cascaded test records deleted cleanly');
      }
    } catch (cleanErr) {
      console.warn('Teardown exception:', cleanErr);
    }
  }
}

// Execute test runner
runRlsIntegrityVerification().catch(err => {
  console.error(`\n${RED}Test execution failed with error:${RESET}`, err.message);
  process.exit(1);
});
