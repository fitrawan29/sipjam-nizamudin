import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ANSI colors for clean test reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passedChecks = 0;
let totalChecks = 0;

function pass(msg: string) {
  passedChecks++;
  totalChecks++;
  console.log(`${GREEN}✅ PASS [${totalChecks}]:${RESET} ${msg}`);
}

function fail(msg: string, detail?: any): never {
  totalChecks++;
  console.error(`${RED}❌ FAIL [${totalChecks}]:${RESET} ${msg}`, detail !== undefined ? detail : '');
  throw new Error(`Test failed: ${msg}`);
}

async function runChallengerRlsTests() {
  console.log(`${CYAN}================================================================${RESET}`);
  console.log(`${CYAN}  M7 EMPIRICAL CHALLENGER: MULTI-TENANT RLS & HIERARCHY STRESS  ${RESET}`);
  console.log(`${CYAN}================================================================\n`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    fail('Missing Supabase environment variables');
  }

  // Generate unique test IDs to avoid conflicts
  const timestamp = Date.now();
  const schoolAId = randomUUID();
  const schoolBId = randomUUID();
  const npsnA = `NPSA_${timestamp.toString().slice(-6)}`;
  const npsnB = `NPSB_${timestamp.toString().slice(-6)}`;

  const userSuperadmin = 'superadmin';
  const userAdminA = `admin_a_${timestamp}`;
  const userAdminB = `admin_b_${timestamp}`;
  const userGuruA = `guru_a_${timestamp}`;
  const userGuruB = `guru_b_${timestamp}`;

  console.log(`Setting up test fixture:`);
  console.log(`- School A: ID=${schoolAId}, NPSN=${npsnA}`);
  console.log(`- School B: ID=${schoolBId}, NPSN=${npsnB}`);

  // Create scoped clients
  const superadminClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { 'x-user-role': 'Superadmin' } }
  });

  const schoolAAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { 'x-sekolah-id': schoolAId, 'x-user-role': 'Admin' } }
  });

  const schoolAGuruClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { 'x-sekolah-id': schoolAId, 'x-user-role': 'Guru' } }
  });

  const schoolBAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { 'x-sekolah-id': schoolBId, 'x-user-role': 'Admin' } }
  });

  const anonClient = createClient(supabaseUrl, supabaseKey);

  try {
    // =========================================================================
    // SECTION 1: SUPERADMIN WORKFLOW & REGISTRATION
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 1: Superadmin Workflow (Register Schools & Provision Admins) ---${RESET}`);

    // 1.1 Superadmin registers School A
    const { data: resSchoolA, error: errSchoolA } = await superadminClient
      .from('sekolah')
      .insert({
        id: schoolAId,
        nama: 'SMA Challenger Alpha',
        npsn: npsnA,
        alamat: 'Jl. Alpha No. 1',
        kota_kabupaten: 'Kota Alpha',
        provinsi: 'Sulawesi Utara',
        status: 'aktif'
      })
      .select()
      .single();

    if (errSchoolA || !resSchoolA) {
      fail('Superadmin failed to register School A', errSchoolA);
    }
    pass(`Superadmin successfully registered School A (${resSchoolA.nama})`);

    // 1.2 Superadmin registers School B
    const { data: resSchoolB, error: errSchoolB } = await superadminClient
      .from('sekolah')
      .insert({
        id: schoolBId,
        nama: 'SMA Challenger Beta',
        npsn: npsnB,
        alamat: 'Jl. Beta No. 2',
        kota_kabupaten: 'Kota Beta',
        provinsi: 'Sulawesi Utara',
        status: 'aktif'
      })
      .select()
      .single();

    if (errSchoolB || !resSchoolB) {
      fail('Superadmin failed to register School B', errSchoolB);
    }
    pass(`Superadmin successfully registered School B (${resSchoolB.nama})`);

    // 1.3 Superadmin provisions Admin A linked to School A
    const { data: resAdminA, error: errAdminA } = await superadminClient
      .from('users')
      .insert({
        username: userAdminA,
        password: 'passwordA123',
        nama: 'Admin Alpha',
        role: 'Admin',
        sekolah_id: schoolAId
      })
      .select()
      .single();

    if (errAdminA || !resAdminA) {
      fail('Superadmin failed to provision Admin for School A', errAdminA);
    }
    pass(`Superadmin provisioned Admin A (${resAdminA.username}) linked to School A (${resAdminA.sekolah_id})`);

    // 1.4 Superadmin provisions Admin B linked to School B
    const { data: resAdminB, error: errAdminB } = await superadminClient
      .from('users')
      .insert({
        username: userAdminB,
        password: 'passwordB123',
        nama: 'Admin Beta',
        role: 'Admin',
        sekolah_id: schoolBId
      })
      .select()
      .single();

    if (errAdminB || !resAdminB) {
      fail('Superadmin failed to provision Admin for School B', errAdminB);
    }
    pass(`Superadmin provisioned Admin B (${resAdminB.username}) linked to School B (${resAdminB.sekolah_id})`);

    // 1.5 Verify login credentials via verify_login RPC
    const { data: loginSa, error: errLoginSa } = await anonClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'superadmin123'
    });
    if (errLoginSa || !loginSa || loginSa.length === 0 || loginSa[0].role !== 'Superadmin') {
      fail('verify_login failed for superadmin', errLoginSa);
    }
    pass('verify_login successfully authenticated Superadmin role');

    const { data: loginAdminA, error: errLoginAdminA } = await anonClient.rpc('verify_login', {
      p_username: userAdminA,
      p_password: 'passwordA123'
    });
    if (errLoginAdminA || !loginAdminA || loginAdminA.length === 0 || loginAdminA[0].sekolah_id !== schoolAId) {
      fail('verify_login failed for Admin A or wrong sekolah_id', errLoginAdminA);
    }
    pass(`verify_login authenticated Admin A with exact bound sekolah_id (${loginAdminA[0].sekolah_id})`);

    // =========================================================================
    // SECTION 2: NON-SUPERADMIN RESTRICTIONS & PRIVILEGE ESCALATION BLOCKING
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 2: Non-Superadmin Restrictions & Security Boundary Checks ---${RESET}`);

    // 2.1 School Admin A attempts to register a new school (Must be BLOCKED)
    const { data: illegalSchoolAdmin, error: errIllegalSchoolAdmin } = await schoolAAdminClient
      .from('sekolah')
      .insert({
        id: randomUUID(),
        nama: 'Hacked School by Admin A',
        npsn: `HACK_${timestamp.toString().slice(-4)}`
      })
      .select();

    if (!errIllegalSchoolAdmin && illegalSchoolAdmin && illegalSchoolAdmin.length > 0) {
      fail('SECURITY LEAK: School Admin A was able to INSERT into public.sekolah!');
    }
    pass('Blocked: School Admin A cannot insert into public.sekolah (RLS enforced)');

    // 2.2 School Guru A attempts to register a new school (Must be BLOCKED)
    const { data: illegalSchoolGuru, error: errIllegalSchoolGuru } = await schoolAGuruClient
      .from('sekolah')
      .insert({
        id: randomUUID(),
        nama: 'Hacked School by Guru A',
        npsn: `HACK2_${timestamp.toString().slice(-4)}`
      })
      .select();

    if (!errIllegalSchoolGuru && illegalSchoolGuru && illegalSchoolGuru.length > 0) {
      fail('SECURITY LEAK: School Guru A was able to INSERT into public.sekolah!');
    }
    pass('Blocked: School Guru A cannot insert into public.sekolah (RLS enforced)');

    // 2.3 Anon client attempts to register a school (Must be BLOCKED)
    const { data: illegalSchoolAnon, error: errIllegalSchoolAnon } = await anonClient
      .from('sekolah')
      .insert({
        id: randomUUID(),
        nama: 'Hacked School by Anon',
        npsn: `HACK3_${timestamp.toString().slice(-4)}`
      })
      .select();

    if (!errIllegalSchoolAnon && illegalSchoolAnon && illegalSchoolAnon.length > 0) {
      fail('SECURITY LEAK: Anon client was able to INSERT into public.sekolah!');
    }
    pass('Blocked: Anonymous client cannot insert into public.sekolah (RLS enforced)');

    // 2.4 School Admin A attempts to DELETE School B (Must be BLOCKED)
    const { data: illegalDelSchoolB, error: errIllegalDelSchoolB } = await schoolAAdminClient
      .from('sekolah')
      .delete()
      .eq('id', schoolBId)
      .select();

    if (!errIllegalDelSchoolB && illegalDelSchoolB && illegalDelSchoolB.length > 0) {
      fail('SECURITY LEAK: School Admin A was able to DELETE School B!');
    }
    pass('Blocked: School Admin A cannot delete School B (RLS enforced)');

    // 2.5 School Admin A attempts to UPDATE School B's name (Must be BLOCKED)
    const { data: illegalUpdateSchoolB, error: errIllegalUpdateSchoolB } = await schoolAAdminClient
      .from('sekolah')
      .update({ nama: 'Defaced Beta' })
      .eq('id', schoolBId)
      .select();

    if (!errIllegalUpdateSchoolB && illegalUpdateSchoolB && illegalUpdateSchoolB.length > 0) {
      fail('SECURITY LEAK: School Admin A was able to UPDATE School B!');
    }
    pass('Blocked: School Admin A cannot update School B in public.sekolah');

    // 2.6 School Admin A attempts to provision an Admin user for School B (Must be BLOCKED)
    const { data: illegalUserForB, error: errIllegalUserForB } = await schoolAAdminClient
      .from('users')
      .insert({
        username: `rogue_admin_${timestamp}`,
        password: 'roguePassword123',
        nama: 'Rogue Admin in B',
        role: 'Admin',
        sekolah_id: schoolBId
      })
      .select();

    if (!errIllegalUserForB && illegalUserForB && illegalUserForB.length > 0) {
      fail('SECURITY LEAK: School Admin A created an admin user for School B!');
    }
    pass('Blocked: School Admin A cannot create users for School B (RLS enforced)');

    // 2.7 School Admin A attempts privilege escalation by creating a Superadmin user (Must be BLOCKED)
    const { data: illegalSuperadmin, error: errIllegalSuperadmin } = await schoolAAdminClient
      .from('users')
      .insert({
        username: `escalated_sa_${timestamp}`,
        password: 'escalatedPassword123',
        nama: 'Escalated Superadmin',
        role: 'Superadmin',
        sekolah_id: null
      })
      .select();

    if (!errIllegalSuperadmin && illegalSuperadmin && illegalSuperadmin.length > 0) {
      fail('SECURITY LEAK: School Admin A created a Superadmin user!');
    }
    pass('Blocked: School Admin A cannot create a Superadmin user (RLS enforced)');

    // 2.8 School Guru A attempts to create a user (Must be BLOCKED)
    const { data: illegalGuruInsertUser, error: errIllegalGuruInsertUser } = await schoolAGuruClient
      .from('users')
      .insert({
        username: `guru_created_${timestamp}`,
        password: 'password123',
        nama: 'Teacher Created User',
        role: 'Guru',
        sekolah_id: schoolAId
      })
      .select();

    if (!errIllegalGuruInsertUser && illegalGuruInsertUser && illegalGuruInsertUser.length > 0) {
      fail('SECURITY LEAK: School Guru A was able to insert into public.users!');
    }
    pass('Blocked: School Guru A cannot insert into public.users (RLS enforced)');

    // =========================================================================
    // SECTION 3: BASELINE DATA POPULATION IN SCHOOL A & SCHOOL B
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 3: Populating Baseline Data in School A and School B ---${RESET}`);

    // Admin A inserts a teacher into School A's data_guru
    const nipA = `19900101_${timestamp.toString().slice(-4)}`;
    const { data: guruA, error: errGuruA } = await schoolAAdminClient
      .from('data_guru')
      .insert({
        sekolah_id: schoolAId,
        nama_guru: 'Budi Alpha, S.Pd.',
        nip: nipA,
        mata_pelajaran: 'X-A_Matematika',
        status: 'aktif'
      })
      .select()
      .single();

    if (errGuruA || !guruA) {
      fail('Admin A failed to insert teacher into School A data_guru', errGuruA);
    }
    pass(`Admin A inserted teacher into School A: "${guruA.nama_guru}" (ID: ${guruA.id})`);

    // Admin B inserts a teacher into School B's data_guru
    const nipB = `19900202_${timestamp.toString().slice(-4)}`;
    const { data: guruB, error: errGuruB } = await schoolBAdminClient
      .from('data_guru')
      .insert({
        sekolah_id: schoolBId,
        nama_guru: 'Siti Beta, S.Pd.',
        nip: nipB,
        mata_pelajaran: 'X-B_Fisika',
        status: 'aktif'
      })
      .select()
      .single();

    if (errGuruB || !guruB) {
      fail('Admin B failed to insert teacher into School B data_guru', errGuruB);
    }
    pass(`Admin B inserted teacher into School B: "${guruB.nama_guru}" (ID: ${guruB.id})`);

    // Admin A inserts student into School A
    const { data: siswaA, error: errSiswaA } = await schoolAAdminClient
      .from('data_siswa')
      .insert({
        sekolah_id: schoolAId,
        nama_siswa: 'Siswa Alpha One',
        nisn: `NISA_${timestamp.toString().slice(-4)}`,
        kelas: 'X-A'
      })
      .select()
      .single();

    if (errSiswaA || !siswaA) {
      fail('Admin A failed to insert student into School A', errSiswaA);
    }
    pass(`Admin A inserted student into School A: "${siswaA.nama_siswa}"`);

    // Admin B inserts student into School B
    const { data: siswaB, error: errSiswaB } = await schoolBAdminClient
      .from('data_siswa')
      .insert({
        sekolah_id: schoolBId,
        nama_siswa: 'Siswa Beta Two',
        nisn: `NISB_${timestamp.toString().slice(-4)}`,
        kelas: 'X-B'
      })
      .select()
      .single();

    if (errSiswaB || !siswaB) {
      fail('Admin B failed to insert student into School B', errSiswaB);
    }
    pass(`Admin B inserted student into School B: "${siswaB.nama_siswa}"`);

    // Admin A inserts config into School A's pengaturan
    const { data: cfgA, error: errCfgA } = await schoolAAdminClient
      .from('pengaturan')
      .insert({
        sekolah_id: schoolAId,
        key: 'secret_setting_alpha',
        value: 'CONFIDENTIAL_ALPHA_DATA'
      })
      .select()
      .single();

    if (errCfgA || !cfgA) {
      fail('Admin A failed to insert setting into School A', errCfgA);
    }
    pass('Admin A inserted confidential setting into School A');

    // Admin B inserts config into School B's pengaturan
    const { data: cfgB, error: errCfgB } = await schoolBAdminClient
      .from('pengaturan')
      .insert({
        sekolah_id: schoolBId,
        key: 'secret_setting_beta',
        value: 'CONFIDENTIAL_BETA_DATA'
      })
      .select()
      .single();

    if (errCfgB || !cfgB) {
      fail('Admin B failed to insert setting into School B', errCfgB);
    }
    pass('Admin B inserted confidential setting into School B');

    // Insert journal in School B
    const journalBId = randomUUID();
    const { data: jurnalB, error: errJurnalB } = await schoolBAdminClient
      .from('jurnal_pembelajaran')
      .insert({
        id: journalBId,
        sekolah_id: schoolBId,
        nama_guru: 'Siti Beta, S.Pd.',
        mapel: 'Fisika',
        kelas: 'X-B',
        tanggal: '2026-09-12',
        jam_ke: '1-2',
        pertemuan_ke: '1',
        materi_pembelajaran: 'Kinematika Gerak Lurus',
        kegiatan: 'Eksperimen GLB',
        kehadiran_murid: 'Hadir semua'
      })
      .select()
      .single();

    if (errJurnalB || !jurnalB) {
      fail('Admin B failed to insert journal into School B', errJurnalB);
    }
    pass(`Journal inserted in School B (ID: ${jurnalB.id})`);

    // Insert attendance in School B
    const presensiBId = randomUUID();
    const { data: presensiB, error: errPresensiB } = await schoolBAdminClient
      .from('presensi_guru')
      .insert({
        id: presensiBId,
        sekolah_id: schoolBId,
        nama_guru: 'Siti Beta, S.Pd.',
        tipe_absen: 'datang',
        jenis_presensi: 'Hadir',
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (errPresensiB || !presensiB) {
      fail('Admin B failed to insert attendance into School B', errPresensiB);
    }
    pass(`Attendance record inserted in School B (ID: ${presensiB.id})`);

    // =========================================================================
    // SECTION 4: CROSS-TENANT READ ISOLATION (SELECT ATTACK HARNESS)
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 4: Cross-Tenant Read Isolation (Adversarial SELECT Queries) ---${RESET}`);

    // 4.1 School A client queries data_guru specifically targeting School B's teacher ID
    const { data: leakGuruById, error: errLeakGuruById } = await schoolAAdminClient
      .from('data_guru')
      .select('*')
      .eq('id', guruB.id);

    if (leakGuruById && leakGuruById.length > 0) {
      fail('CRITICAL DATA LEAK: School A Admin was able to SELECT School B teacher by ID!', leakGuruById);
    }
    pass('Isolated: School A Admin cannot read School B teacher by ID (returned 0 rows)');

    // 4.2 School A client queries data_guru targeting School B's sekolah_id
    const { data: leakGuruBySchool, error: errLeakGuruBySchool } = await schoolAAdminClient
      .from('data_guru')
      .select('*')
      .eq('sekolah_id', schoolBId);

    if (leakGuruBySchool && leakGuruBySchool.length > 0) {
      fail('CRITICAL DATA LEAK: School A Admin read data_guru filtered by School B ID!', leakGuruBySchool);
    }
    pass('Isolated: School A Admin cannot read data_guru using School B sekolah_id filter (returned 0 rows)');

    // 4.3 School A client performs unfiltered SELECT on data_guru
    const { data: unfilteredGuru, error: errUnfilteredGuru } = await schoolAAdminClient
      .from('data_guru')
      .select('id, nama_guru, sekolah_id');

    if (errUnfilteredGuru) {
      fail('School A Admin failed to query data_guru', errUnfilteredGuru);
    }
    const containsSchoolBTeacher = unfilteredGuru?.some(g => g.sekolah_id === schoolBId || g.id === guruB.id);
    if (containsSchoolBTeacher) {
      fail('CRITICAL DATA LEAK: Unfiltered SELECT returned records belonging to School B!', unfilteredGuru);
    }
    pass('Isolated: Unfiltered SELECT on data_guru by School A client returned 0 records belonging to School B');

    // 4.4 School A client queries data_siswa targeting School B's student
    const { data: leakSiswa, error: errLeakSiswa } = await schoolAAdminClient
      .from('data_siswa')
      .select('*')
      .eq('id', siswaB.id);

    if (leakSiswa && leakSiswa.length > 0) {
      fail('CRITICAL DATA LEAK: School A Admin was able to read School B student!', leakSiswa);
    }
    pass('Isolated: School A Admin cannot read School B student records');

    // 4.5 School A client queries confidential pengaturan belonging to School B
    const { data: leakConfig, error: errLeakConfig } = await schoolAAdminClient
      .from('pengaturan')
      .select('*')
      .eq('sekolah_id', schoolBId);

    if (leakConfig && leakConfig.length > 0) {
      fail('CRITICAL DATA LEAK: School A Admin read confidential pengaturan of School B!', leakConfig);
    }
    pass('Isolated: School A Admin cannot read School B confidential settings');

    // 4.6 School A Guru queries School B's jurnal_pembelajaran
    const { data: leakJurnal, error: errLeakJurnal } = await schoolAGuruClient
      .from('jurnal_pembelajaran')
      .select('*')
      .eq('id', jurnalB.id);

    if (leakJurnal && leakJurnal.length > 0) {
      fail('CRITICAL DATA LEAK: School A Guru read School B journal record!', leakJurnal);
    }
    pass('Isolated: School A Guru cannot read School B learning journal records');

    // 4.7 School A Guru queries School B's presensi_guru
    const { data: leakPresensi, error: errLeakPresensi } = await schoolAGuruClient
      .from('presensi_guru')
      .select('*')
      .eq('id', presensiB.id);

    if (leakPresensi && leakPresensi.length > 0) {
      fail('CRITICAL DATA LEAK: School A Guru read School B attendance record!', leakPresensi);
    }
    pass('Isolated: School A Guru cannot read School B teacher attendance records');

    // =========================================================================
    // SECTION 5: CROSS-TENANT WRITE ISOLATION (INSERT ATTACK HARNESS)
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 5: Cross-Tenant Write Isolation (Adversarial INSERT Queries) ---${RESET}`);

    // 5.1 School A Admin attempts to inject teacher into School B's data_guru
    const { data: illegalInsertGuru, error: errIllegalInsertGuru } = await schoolAAdminClient
      .from('data_guru')
      .insert({
        sekolah_id: schoolBId,
        nama_guru: 'Trojan Teacher',
        nip: `19999999_${timestamp.toString().slice(-4)}`,
        mata_pelajaran: 'X-B_Trojan'
      })
      .select();

    if (!errIllegalInsertGuru && illegalInsertGuru && illegalInsertGuru.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin successfully inserted a teacher into School B!', illegalInsertGuru);
    }
    pass('Isolated: School A Admin cannot INSERT records into School B data_guru (RLS violation)');

    // 5.2 School A Guru attempts to inject journal into School B's jurnal_pembelajaran
    const { data: illegalInsertJurnal, error: errIllegalInsertJurnal } = await schoolAGuruClient
      .from('jurnal_pembelajaran')
      .insert({
        id: randomUUID(),
        sekolah_id: schoolBId,
        nama_guru: 'Budi Alpha, S.Pd.',
        mapel: 'Matematika',
        kelas: 'X-A',
        tanggal: '2026-09-12',
        jam_ke: '1-2',
        pertemuan_ke: '1',
        materi_pembelajaran: 'Injected Journal',
        kegiatan: 'Exploit attempt'
      })
      .select();

    if (!errIllegalInsertJurnal && illegalInsertJurnal && illegalInsertJurnal.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Guru inserted journal into School B!', illegalInsertJurnal);
    }
    pass('Isolated: School A Guru cannot INSERT records into School B jurnal_pembelajaran (RLS violation)');

    // 5.3 School A Admin attempts to inject configuration into School B's pengaturan
    const { data: illegalInsertConfig, error: errIllegalInsertConfig } = await schoolAAdminClient
      .from('pengaturan')
      .insert({
        sekolah_id: schoolBId,
        key: 'malicious_override',
        value: 'hacked'
      })
      .select();

    if (!errIllegalInsertConfig && illegalInsertConfig && illegalInsertConfig.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin inserted settings into School B!', illegalInsertConfig);
    }
    pass('Isolated: School A Admin cannot INSERT settings into School B pengaturan');

    // =========================================================================
    // SECTION 6: CROSS-TENANT TAMPERING ISOLATION (UPDATE ATTACK HARNESS)
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 6: Cross-Tenant Tampering Isolation (Adversarial UPDATE Queries) ---${RESET}`);

    // 6.1 School A Admin attempts to modify School B's teacher name
    const { data: illegalUpdateGuru, error: errIllegalUpdateGuru } = await schoolAAdminClient
      .from('data_guru')
      .update({ nama_guru: 'Defaced Teacher Name' })
      .eq('id', guruB.id)
      .select();

    if (!errIllegalUpdateGuru && illegalUpdateGuru && illegalUpdateGuru.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin modified School B teacher!', illegalUpdateGuru);
    }
    // Verify School B teacher was not modified
    const { data: checkGuruB } = await schoolBAdminClient.from('data_guru').select('nama_guru').eq('id', guruB.id).single();
    if (checkGuruB?.nama_guru === 'Defaced Teacher Name') {
      fail('CRITICAL VULNERABILITY: School B teacher data was altered by School A Admin!');
    }
    pass('Isolated: School A Admin cannot UPDATE School B teacher records (data remains unchanged)');

    // 6.2 School A Admin attempts to modify School B's settings
    const { data: illegalUpdateCfg, error: errIllegalUpdateCfg } = await schoolAAdminClient
      .from('pengaturan')
      .update({ value: 'TAMPERED_VALUE' })
      .eq('sekolah_id', schoolBId)
      .eq('key', 'secret_setting_beta')
      .select();

    if (!errIllegalUpdateCfg && illegalUpdateCfg && illegalUpdateCfg.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin modified School B settings!', illegalUpdateCfg);
    }
    // Verify School B config was not modified
    const { data: checkCfgB } = await schoolBAdminClient.from('pengaturan').select('value').eq('sekolah_id', schoolBId).eq('key', 'secret_setting_beta').single();
    if (checkCfgB?.value === 'TAMPERED_VALUE') {
      fail('CRITICAL VULNERABILITY: School B settings were altered by School A Admin!');
    }
    pass('Isolated: School A Admin cannot UPDATE School B settings in pengaturan');

    // 6.3 School A Guru attempts to modify School B's journal
    const { data: illegalUpdateJurnal, error: errIllegalUpdateJurnal } = await schoolAGuruClient
      .from('jurnal_pembelajaran')
      .update({ materi_pembelajaran: 'Tampered Lesson' })
      .eq('id', jurnalB.id)
      .select();

    if (!errIllegalUpdateJurnal && illegalUpdateJurnal && illegalUpdateJurnal.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Guru modified School B journal!', illegalUpdateJurnal);
    }
    pass('Isolated: School A Guru cannot UPDATE School B journal records');

    // =========================================================================
    // SECTION 7: CROSS-TENANT DELETION ISOLATION (DELETE ATTACK HARNESS)
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 7: Cross-Tenant Deletion Isolation (Adversarial DELETE Queries) ---${RESET}`);

    // 7.1 School A Admin attempts to DELETE School B's teacher
    const { data: illegalDeleteGuru, error: errIllegalDeleteGuru } = await schoolAAdminClient
      .from('data_guru')
      .delete()
      .eq('id', guruB.id)
      .select();

    if (!errIllegalDeleteGuru && illegalDeleteGuru && illegalDeleteGuru.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin deleted a teacher from School B!', illegalDeleteGuru);
    }
    // Verify teacher B still exists
    const { data: verifyGuruBStillExists } = await schoolBAdminClient.from('data_guru').select('id').eq('id', guruB.id).single();
    if (!verifyGuruBStillExists) {
      fail('CRITICAL VULNERABILITY: School B teacher was deleted by School A Admin!');
    }
    pass('Isolated: School A Admin cannot DELETE School B teacher records (teacher still exists)');

    // 7.2 School A Admin attempts to DELETE School B's students
    const { data: illegalDeleteSiswa, error: errIllegalDeleteSiswa } = await schoolAAdminClient
      .from('data_siswa')
      .delete()
      .eq('id', siswaB.id)
      .select();

    if (!errIllegalDeleteSiswa && illegalDeleteSiswa && illegalDeleteSiswa.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin deleted a student from School B!', illegalDeleteSiswa);
    }
    const { data: verifySiswaBStillExists } = await schoolBAdminClient.from('data_siswa').select('id').eq('id', siswaB.id).single();
    if (!verifySiswaBStillExists) {
      fail('CRITICAL VULNERABILITY: School B student was deleted by School A Admin!');
    }
    pass('Isolated: School A Admin cannot DELETE School B student records (student still exists)');

    // 7.3 School A Guru attempts to DELETE School B's journal
    const { data: illegalDeleteJurnal, error: errIllegalDeleteJurnal } = await schoolAGuruClient
      .from('jurnal_pembelajaran')
      .delete()
      .eq('id', jurnalB.id)
      .select();

    if (!errIllegalDeleteJurnal && illegalDeleteJurnal && illegalDeleteJurnal.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Guru deleted a journal from School B!', illegalDeleteJurnal);
    }
    const { data: verifyJurnalBStillExists } = await schoolBAdminClient.from('jurnal_pembelajaran').select('id').eq('id', jurnalB.id).single();
    if (!verifyJurnalBStillExists) {
      fail('CRITICAL VULNERABILITY: School B journal was deleted by School A Guru!');
    }
    pass('Isolated: School A Guru cannot DELETE School B journal records (journal still exists)');

    // 7.4 School A Admin attempts bulk DELETE on presensi_guru of School B
    const { data: illegalDeletePresensi, error: errIllegalDeletePresensi } = await schoolAAdminClient
      .from('presensi_guru')
      .delete()
      .eq('sekolah_id', schoolBId)
      .select();

    if (!errIllegalDeletePresensi && illegalDeletePresensi && illegalDeletePresensi.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin performed bulk delete on School B attendance!', illegalDeletePresensi);
    }
    const { data: verifyPresensiBStillExists } = await schoolBAdminClient.from('presensi_guru').select('id').eq('id', presensiB.id).single();
    if (!verifyPresensiBStillExists) {
      fail('CRITICAL VULNERABILITY: School B attendance was deleted by School A Admin!');
    }
    pass('Isolated: School A Admin cannot bulk DELETE School B attendance records');

    // 7.5 School A Admin attempts to UPDATE School B Admin user
    const { data: illegalUpdateUserB, error: errIllegalUpdateUserB } = await schoolAAdminClient
      .from('users')
      .update({ nama: 'Tampered Admin B' })
      .eq('username', userAdminB)
      .select();

    if (!errIllegalUpdateUserB && illegalUpdateUserB && illegalUpdateUserB.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin modified School B Admin user!', illegalUpdateUserB);
    }
    pass('Isolated: School A Admin cannot UPDATE School B user records');

    // 7.6 School A Admin attempts to DELETE School B Admin user
    const { data: illegalDeleteUserB, error: errIllegalDeleteUserB } = await schoolAAdminClient
      .from('users')
      .delete()
      .eq('username', userAdminB)
      .select();

    if (!errIllegalDeleteUserB && illegalDeleteUserB && illegalDeleteUserB.length > 0) {
      fail('CRITICAL VULNERABILITY: School A Admin deleted School B Admin user!', illegalDeleteUserB);
    }
    pass('Isolated: School A Admin cannot DELETE School B user records');

    // =========================================================================
    // SECTION 8: MULTI-TENANT COMPOSITE UNIQUE CONSTRAINTS VERIFICATION
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 8: Multi-Tenant Composite Unique Constraints Coexistence ---${RESET}`);

    // Both School A and School B insert identical setting key 'motto_sekolah' with different values
    const { error: errMottoA } = await schoolAAdminClient.from('pengaturan').insert({
      sekolah_id: schoolAId,
      key: 'motto_sekolah',
      value: 'Excellence in School A'
    });
    if (errMottoA) {
      fail('School A failed to insert shared key into pengaturan', errMottoA);
    }

    const { error: errMottoB } = await schoolBAdminClient.from('pengaturan').insert({
      sekolah_id: schoolBId,
      key: 'motto_sekolah',
      value: 'Innovation in School B'
    });
    if (errMottoB) {
      fail('School B failed to insert identical shared key into pengaturan (Composite unique broken)', errMottoB);
    }
    pass('Composite unique verified: Both schools successfully saved identical setting key "motto_sekolah" without conflict');

    // Verify School A reads its own value
    const { data: readMottoA } = await schoolAAdminClient.from('pengaturan').select('value').eq('key', 'motto_sekolah').single();
    if (readMottoA?.value !== 'Excellence in School A') {
      fail('School A read incorrect value for shared key', readMottoA);
    }
    // Verify School B reads its own value
    const { data: readMottoB } = await schoolBAdminClient.from('pengaturan').select('value').eq('key', 'motto_sekolah').single();
    if (readMottoB?.value !== 'Innovation in School B') {
      fail('School B read incorrect value for shared key', readMottoB);
    }
    pass('Tenant segregation verified: Both schools retrieve their respective values for shared key "motto_sekolah"');

    // =========================================================================
    // SECTION 9: SUPERADMIN PLATFORM-WIDE GOVERNANCE & TEARDOWN
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 9: Superadmin Governance & Teardown Verification ---${RESET}`);

    // Superadmin updates School A status from aktif to nonaktif
    const { data: updatedSchoolA, error: errUpdateSchoolA } = await superadminClient
      .from('sekolah')
      .update({ status: 'nonaktif' })
      .eq('id', schoolAId)
      .select()
      .single();

    if (errUpdateSchoolA || updatedSchoolA?.status !== 'nonaktif') {
      fail('Superadmin failed to update school status', errUpdateSchoolA);
    }
    pass('Superadmin successfully updated School status (aktif -> nonaktif)');

    console.log(`\n${YELLOW}--- Teardown: Cascading cleanup of test schools and users ---${RESET}`);
    // Cleanup users
    await superadminClient.from('users').delete().in('username', [userAdminA, userAdminB, userGuruA, userGuruB]);
    // Deleting schools triggers ON DELETE CASCADE across all 17 tables
    await superadminClient.from('sekolah').delete().in('id', [schoolAId, schoolBId]);

    // Verify cleanup
    const { data: lingeringSchools } = await superadminClient.from('sekolah').select('id').in('id', [schoolAId, schoolBId]);
    if (lingeringSchools && lingeringSchools.length > 0) {
      fail('Teardown verification failed: test schools still exist', lingeringSchools);
    }
    pass('Teardown verified: Test schools and cascaded records completely wiped');

    console.log(`\n${GREEN}================================================================${RESET}`);
    console.log(`${GREEN}  🎉 ALL ${totalChecks} ADVERSARIAL CHALLENGER TESTS PASSED EMPIRICALLY!  ${RESET}`);
    console.log(`${GREEN}================================================================${RESET}`);

    return { success: true, totalChecks, passedChecks };
  } catch (err: any) {
    console.error(`\n${RED}================================================================${RESET}`);
    console.error(`${RED}  EMERGENCY TEARDOWN ATTEMPT DUE TO TEST FAILURE  ${RESET}`);
    console.error(`${RED}================================================================${RESET}`);
    try {
      await superadminClient.from('users').delete().in('username', [userAdminA, userAdminB, userGuruA, userGuruB]);
      await superadminClient.from('sekolah').delete().in('id', [schoolAId, schoolBId]);
      console.log('Emergency cleanup succeeded.');
    } catch (cleanupErr) {
      console.error('Emergency cleanup failed:', cleanupErr);
    }
    throw err;
  }
}

runChallengerRlsTests().catch(err => {
  console.error(err);
  process.exit(1);
});
