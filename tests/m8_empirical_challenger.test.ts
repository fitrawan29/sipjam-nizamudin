/**
 * ============================================================================
 * EMPIRICAL CHALLENGER ADVERSARIAL SUITE
 * File: tests/m8_empirical_challenger.test.ts
 *
 * Exhaustive empirical stress testing for:
 * 1. Anonymous CRUD rejection across ALL 16 tenant tables
 * 2. Anonymous password dumping from public.users
 * 3. School A vs School B real multi-tenant data isolation
 * 4. Header spoofing attacks (School Admin escalation & unauthenticated role spoofing)
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passedChecks = 0;
let failedChecks = 0;
let totalChecks = 0;

function pass(msg: string) {
  passedChecks++;
  totalChecks++;
  console.log(`${GREEN}✅ PASS [${totalChecks}]:${RESET} ${msg}`);
}

function fail(msg: string, detail?: any) {
  failedChecks++;
  totalChecks++;
  console.error(`${RED}❌ FAIL [${totalChecks}]:${RESET} ${msg}`, detail !== undefined ? detail : '');
}

async function runEmpiricalChallenger() {
  console.log(`\n${CYAN}======================================================================${RESET}`);
  console.log(`${CYAN}     M8 EMPIRICAL CHALLENGER ADVERSARIAL VERIFICATION SUITE           ${RESET}`);
  console.log(`${CYAN}======================================================================\n`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const timestamp = Date.now();
  const schoolAId = 'a0000000-0000-0000-0000-000000000001'; // SMA Nizamudin
  const schoolBId = randomUUID();
  const npsnB = `98${timestamp.toString().slice(-6)}`;

  // Clients
  const anonClient = createClient(supabaseUrl, supabaseKey);

  // Authenticate superadmin via RPC to obtain genuine superadmin user id
  const { data: superadminAuth } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });
  const genuineSuperadminId = superadminAuth?.[0]?.id;

  const genuineSuperadminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        'x-user-id': genuineSuperadminId
      }
    }
  });

  const schoolAAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': schoolAId,
        'x-user-role': 'Admin'
      }
    }
  });

  const schoolBAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': schoolBId,
        'x-user-role': 'Admin'
      }
    }
  });

  try {
    // =========================================================================
    // PART 1: ALL 16 TENANT TABLES ANONYMOUS CRUD REJECTION (NO HEADERS)
    // =========================================================================
    console.log(`${CYAN}--- PART 1: Anonymous CRUD Rejection Across ALL 16 Tenant Tables ---${RESET}`);

    const tenantTables = [
      'data_guru',
      'data_mapel',
      'data_siswa',
      'jadwal_pelajaran',
      'jadwal_piket',
      'jurnal_pembelajaran',
      'kalender_pendidikan',
      'laporan_piket',
      'pengaturan',
      'presensi_guru',
      'bank_dokumen',
      'riwayat_backup',
      'guru_mapel',
      'penugasan_piket',
      'pengumuman',
      'pengumuman_tanggapan'
    ];

    for (const table of tenantTables) {
      // 1. SELECT without headers
      const { data: selectData } = await anonClient.from(table).select('*').limit(10);
      if (selectData && selectData.length > 0) {
        fail(`Anonymous client READ ${selectData.length} rows from ${table}!`, selectData[0]);
      } else {
        pass(`Anonymous SELECT on ${table} denied (0 rows)`);
      }

      // 2. INSERT without headers
      const testRowId = randomUUID();
      const insertPayload: any = { id: testRowId, sekolah_id: schoolAId };
      if (table === 'pengaturan') {
        insertPayload.key = `anon_test_${timestamp}`;
        insertPayload.value = 'blocked';
      } else if (table === 'data_guru') {
        insertPayload.nama_guru = 'Anon Injected';
        insertPayload.nip = `ANON_${timestamp.toString().slice(-4)}`;
        insertPayload.mata_pelajaran = 'Anon';
      }

      const { data: insertData, error: insertErr } = await anonClient.from(table).insert([insertPayload]).select();
      if (!insertErr && insertData && insertData.length > 0) {
        await genuineSuperadminClient.from(table).delete().eq('id', testRowId);
        fail(`Anonymous client INSERTED row into ${table}!`, insertData);
      } else {
        pass(`Anonymous INSERT into ${table} blocked`);
      }
    }

    // =========================================================================
    // PART 2: ANONYMOUS PASSWORD & USER CREDENTIAL PROTECTION
    // =========================================================================
    console.log(`\n${CYAN}--- PART 2: Anonymous Credential & Password Dump Protection ---${RESET}`);

    // Anonymous dump attempt
    const { data: dumpUsers } = await anonClient.from('users').select('*');
    if (dumpUsers && dumpUsers.length > 0) {
      fail(`Anonymous client dumped ${dumpUsers.length} users!`, dumpUsers[0]);
    } else {
      pass('Anonymous SELECT on public.users denied (0 rows)');
    }

    // Query specifically for password hashes
    const { data: dumpPasswords } = await anonClient.from('users').select('password').not('password', 'is', null);
    if (dumpPasswords && dumpPasswords.length > 0) {
      fail(`Anonymous client dumped ${dumpPasswords.length} passwords!`);
    } else {
      pass('Anonymous password query returned 0 rows');
    }

    // =========================================================================
    // PART 3: TRUE CROSS-TENANT ISOLATION (SCHOOL A VS SCHOOL B)
    // =========================================================================
    console.log(`\n${CYAN}--- PART 3: School A vs School B Real Data Isolation ---${RESET}`);

    // Setup School B in database
    const { error: errCreateSchoolB } = await genuineSuperadminClient.from('sekolah').insert({
      id: schoolBId,
      nama: 'SMA Swasta Penantang B',
      npsn: npsnB,
      status: 'aktif'
    });
    if (errCreateSchoolB) throw errCreateSchoolB;

    const guruBId = randomUUID();
    const { error: errGuruB } = await schoolBAdminClient.from('data_guru').insert({
      id: guruBId,
      sekolah_id: schoolBId,
      nama_guru: 'Guru Budi Penantang B',
      nip: `NIPB_${timestamp.toString().slice(-4)}`,
      mata_pelajaran: 'Kimia Organik'
    });
    if (errGuruB) throw errGuruB;

    const siswaBId = randomUUID();
    const { error: errSiswaB } = await schoolBAdminClient.from('data_siswa').insert({
      id: siswaBId,
      sekolah_id: schoolBId,
      nama_siswa: 'Siswa Penantang B',
      nisn: `NISNB_${timestamp.toString().slice(-4)}`,
      kelas: 'XII-IPA'
    });
    if (errSiswaB) throw errSiswaB;

    const settingBId = randomUUID();
    const { error: errCfgB } = await schoolBAdminClient.from('pengaturan').insert({
      id: settingBId,
      sekolah_id: schoolBId,
      key: 'secret_school_b_key',
      value: 'CONFIDENTIAL_B_DATA'
    });
    if (errCfgB) throw errCfgB;

    pass('School B successfully seeded with real rows');

    // 3.1 School A Admin tries to SELECT School B teacher
    const { data: readBTeacher } = await schoolAAdminClient.from('data_guru').select('*').eq('id', guruBId);
    if (readBTeacher && readBTeacher.length > 0) {
      fail('School A Admin read School B teacher!', readBTeacher);
    } else {
      pass('School A Admin cannot read School B teacher by ID');
    }

    // 3.2 School A Admin tries to SELECT School B setting
    const { data: readBSetting } = await schoolAAdminClient.from('pengaturan').select('*').eq('id', settingBId);
    if (readBSetting && readBSetting.length > 0) {
      fail('School A Admin read School B settings!', readBSetting);
    } else {
      pass('School A Admin cannot read School B settings');
    }

    // 3.3 School A Admin tries to UPDATE School B teacher
    const { data: updateBTeacher, error: errUpdB } = await schoolAAdminClient
      .from('data_guru')
      .update({ nama_guru: 'TAMPERED_BY_A' })
      .eq('id', guruBId)
      .select();
    if (!errUpdB && updateBTeacher && updateBTeacher.length > 0) {
      fail('School A Admin modified School B teacher!', updateBTeacher);
    } else {
      pass('School A Admin cannot UPDATE School B teacher (0 rows affected)');
    }

    // 3.4 School A Admin tries to DELETE School B student
    const { data: delBSiswa, error: errDelB } = await schoolAAdminClient
      .from('data_siswa')
      .delete()
      .eq('id', siswaBId)
      .select();
    if (!errDelB && delBSiswa && delBSiswa.length > 0) {
      fail('School A Admin deleted School B student!', delBSiswa);
    } else {
      pass('School A Admin cannot DELETE School B student (0 rows affected)');
    }

    // =========================================================================
    // PART 4: HEADER SPOOFING & PRIVILEGE ESCALATION VULNERABILITY ANALYSIS
    // =========================================================================
    console.log(`\n${CYAN}--- PART 4: Header Spoofing & Privilege Escalation Defenses ---${RESET}`);

    // 4.1 School Admin attempting to claim Superadmin while sending x-sekolah-id
    const boundSpoofClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'x-sekolah-id': schoolAId,
          'x-user-role': 'Superadmin'
        }
      }
    });
    const { data: boundSpoofUsers } = await boundSpoofClient.from('users').select('id, username').eq('role', 'Superadmin');
    if (boundSpoofUsers && boundSpoofUsers.length > 0) {
      fail('School A Admin with x-sekolah-id + x-user-role: Superadmin read Superadmin users!');
    } else {
      pass('School A Admin claiming Superadmin while sending x-sekolah-id is strictly rejected');
    }

    // 4.2 Adversarial Attack: Omission of x-sekolah-id and x-user-id with x-user-role: Superadmin
    console.log(`\n${YELLOW}Testing unauthenticated role spoofing: headers: { 'x-user-role': 'Superadmin' } without x-user-id...${RESET}`);
    const unauthenticatedSuperadminClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'x-user-role': 'Superadmin'
        }
      }
    });

    const { data: dumpedAllUsers, error: errDump } = await unauthenticatedSuperadminClient
      .from('users')
      .select('id, username, password, role');

    if (!errDump && dumpedAllUsers && dumpedAllUsers.length > 0) {
      fail(
        `CRITICAL RLS BYPASS CONFIRMED: Sending ONLY 'x-user-role': 'Superadmin' without x-user-id dumps all ${dumpedAllUsers.length} user accounts including plaintext passwords!`,
        { exposedCount: dumpedAllUsers.length, sampleUsername: dumpedAllUsers[0].username, samplePassword: dumpedAllUsers[0].password }
      );
    } else {
      pass('Unauthenticated x-user-role: Superadmin spoofing rejected');
    }

    // 4.3 Adversarial Attack: Inserting new school using unauthenticated role spoofing
    const rogueSchoolId = randomUUID();
    const { data: rogueSchool, error: errRogueSchool } = await unauthenticatedSuperadminClient
      .from('sekolah')
      .insert({
        id: rogueSchoolId,
        nama: 'Rogue School Exploit',
        npsn: `EXPLOIT_${timestamp.toString().slice(-4)}`
      })
      .select();

    if (!errRogueSchool && rogueSchool && rogueSchool.length > 0) {
      await genuineSuperadminClient.from('sekolah').delete().eq('id', rogueSchoolId);
      fail('CRITICAL RLS BYPASS CONFIRMED: Unauthenticated client with x-user-role: Superadmin successfully registered a school!');
    } else {
      pass('Rogue school registration blocked');
    }

  } finally {
    // Teardown
    console.log(`\n${YELLOW}--- Teardown: Removing temporary School B ---${RESET}`);
    try {
      await genuineSuperadminClient.from('sekolah').delete().eq('id', schoolBId);
      console.log('✅ Teardown: School B wiped cleanly.');
    } catch (e) {
      console.warn('Teardown warning:', e);
    }
  }

  console.log(`\n${CYAN}======================================================================${RESET}`);
  console.log(`Total checks: ${totalChecks}, Passed: ${passedChecks}, Failed: ${failedChecks}`);
  console.log(`${CYAN}======================================================================${RESET}\n`);

  return { totalChecks, passedChecks, failedChecks };
}

runEmpiricalChallenger().catch(err => {
  console.error('Test execution aborted:', err);
  process.exit(1);
});
