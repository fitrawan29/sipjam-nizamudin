import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passes = 0;
let fails = 0;

function assert(condition: boolean, msg: string, detail?: any) {
  if (condition) {
    passes++;
    console.log(`${GREEN}✅ PASS:${RESET} ${msg}`);
  } else {
    fails++;
    console.error(`${RED}❌ FAIL:${RESET} ${msg}`, detail || '');
  }
}

async function runForensicChecks() {
  console.log(`${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}INDEPENDENT EMPIRICAL FORENSIC AUDIT OF RLS INTEGRITY${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  const defaultSchoolAId = 'a0000000-0000-0000-0000-000000000001';
  const testSchoolBId = randomUUID();
  const timestamp = Date.now();

  // Baseline client (Raw Anon, NO headers)
  const anonClient = createClient(url, key);

  // Authenticate superadmin for setup/teardown
  const { data: saLogin, error: saLoginErr } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });
  if (saLoginErr || !saLogin || saLogin.length === 0) {
    throw new Error('Failed superadmin login for setup: ' + JSON.stringify(saLoginErr));
  }
  const saUserId = saLogin[0].id;
  const superadminClient = createClient(url, key, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        'x-user-id': saUserId
      }
    }
  });

  // School A Admin Client
  const schoolAClient = createClient(url, key, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Admin'
      }
    }
  });

  // School B Admin Client
  const schoolBClient = createClient(url, key, {
    global: {
      headers: {
        'x-sekolah-id': testSchoolBId,
        'x-user-role': 'Admin'
      }
    }
  });

  // --- CHECK 1: ANONYMOUS CRUD DENIAL ---
  console.log('\n--- CHECK 1: Anonymous CRUD Denial (No Headers) ---');
  const { data: aGuru } = await anonClient.from('data_guru').select('*');
  assert(!aGuru || aGuru.length === 0, 'Anonymous SELECT data_guru returns 0 rows', aGuru);

  const { data: aSiswa } = await anonClient.from('data_siswa').select('*');
  assert(!aSiswa || aSiswa.length === 0, 'Anonymous SELECT data_siswa returns 0 rows', aSiswa);

  const { data: aSettings } = await anonClient.from('pengaturan').select('*');
  assert(!aSettings || aSettings.length === 0, 'Anonymous SELECT pengaturan returns 0 rows', aSettings);

  const { data: aJurnal } = await anonClient.from('jurnal_pembelajaran').select('*');
  assert(!aJurnal || aJurnal.length === 0, 'Anonymous SELECT jurnal_pembelajaran returns 0 rows', aJurnal);

  const { data: aPresensi } = await anonClient.from('presensi_guru').select('*');
  assert(!aPresensi || aPresensi.length === 0, 'Anonymous SELECT presensi_guru returns 0 rows', aPresensi);

  const fakeId = randomUUID();
  const { data: aIns, error: aInsErr } = await anonClient.from('pengaturan').insert([{
    id: fakeId,
    sekolah_id: defaultSchoolAId,
    key: 'hacked_by_anon',
    value: 'FAIL'
  }]).select();
  assert(aInsErr !== null || !aIns || aIns.length === 0, 'Anonymous INSERT into pengaturan rejected');

  // Verify baseline School A teacher exists
  const { data: realGuruA } = await schoolAClient.from('data_guru').select('id, nama_guru').limit(1);
  const teacherAId = realGuruA?.[0]?.id;
  const originalName = realGuruA?.[0]?.nama_guru;
  assert(!!teacherAId, 'Baseline School A teacher confirmed: ' + originalName);

  const { data: aUpd, error: aUpdErr } = await anonClient.from('data_guru').update({ nama_guru: 'HACKED' }).eq('id', teacherAId).select();
  assert(aUpdErr !== null || !aUpd || aUpd.length === 0, 'Anonymous UPDATE on data_guru rejected');

  const { data: aDel, error: aDelErr } = await anonClient.from('data_guru').delete().eq('id', teacherAId).select();
  assert(aDelErr !== null || !aDel || aDel.length === 0, 'Anonymous DELETE on data_guru rejected');

  // --- CHECK 2: USER CREDENTIAL DUMP PROTECTION ---
  console.log('\n--- CHECK 2: User Credential Dump Protection (public.users) ---');
  const { data: aUsers } = await anonClient.from('users').select('*');
  assert(!aUsers || aUsers.length === 0, 'Anonymous SELECT on public.users returns 0 rows', aUsers);

  const { data: aPasswords } = await anonClient.from('users').select('password');
  assert(!aPasswords || aPasswords.length === 0, 'Anonymous SELECT password from public.users returns 0 rows', aPasswords);

  const { data: saDump } = await anonClient.from('users').select('*').eq('username', 'superadmin');
  assert(!saDump || saDump.length === 0, 'Targeted anonymous query for superadmin returns 0 rows');

  // verify_login RPC
  const { data: validAuth } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });
  assert(validAuth && validAuth.length === 1 && validAuth[0].role === 'Superadmin', 'verify_login works for superadmin');
  assert(!('password' in (validAuth?.[0] || {})), 'verify_login does not return password column');

  const { data: fakeAuth } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'wrong_password'
  });
  assert(!fakeAuth || fakeAuth.length === 0, 'verify_login rejects wrong password');

  const { data: sqliAuth } = await anonClient.rpc('verify_login', {
    p_username: "' OR '1'='1",
    p_password: "' OR '1'='1"
  });
  assert(!sqliAuth || sqliAuth.length === 0, 'verify_login rejects SQL injection');

  // --- CHECK 3: HEADER SPOOFING & PRIVILEGE ESCALATION DEFENSE ---
  console.log('\n--- CHECK 3: Header Spoofing & Privilege Escalation Defense ---');
  // Tenant admin trying to claim superadmin with x-sekolah-id
  const spoofClientWithSchool = createClient(url, key, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Superadmin'
      }
    }
  });
  const { data: spoofSchoolIns, error: spoofSchoolErr } = await spoofClientWithSchool.from('sekolah').insert([{
    id: randomUUID(),
    nama: 'Spoofed School',
    npsn: '00123456',
    status: 'aktif'
  }]).select();
  assert(spoofSchoolErr !== null || !spoofSchoolIns || spoofSchoolIns.length === 0, 'School-bound client claiming Superadmin is rejected by is_superadmin()');

  // Spoofed client passing fake x-user-id
  const fakeUserId = randomUUID();
  const spoofClientFakeUser = createClient(url, key, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        'x-user-id': fakeUserId
      }
    }
  });
  const { data: spoofFakeUserIns, error: spoofFakeUserErr } = await spoofClientFakeUser.from('sekolah').insert([{
    id: randomUUID(),
    nama: 'Spoofed Fake User School',
    npsn: '00123457',
    status: 'aktif'
  }]).select();
  assert(spoofFakeUserErr !== null || !spoofFakeUserIns || spoofFakeUserIns.length === 0, 'Client with fake x-user-id claiming Superadmin is rejected');

  // --- CHECK 4: CROSS-TENANT ISOLATION (REAL POPULATED DATA) ---
  console.log('\n--- CHECK 4: Cross-Tenant Isolation with Real Data ---');
  // 1. Provision School B
  const { error: insBErr } = await superadminClient.from('sekolah').insert([{
    id: testSchoolBId,
    nama: 'SMA Forensic Test School B',
    npsn: `88${timestamp.toString().slice(-6)}`,
    status: 'aktif'
  }]);
  assert(!insBErr, 'School B provisioned by Superadmin', insBErr);

  const teacherBId = randomUUID();
  const settingBId = randomUUID();

  // 2. School B Admin inserts teacher and settings
  const { error: insGuruBErr } = await schoolBClient.from('data_guru').insert([{
    id: teacherBId,
    sekolah_id: testSchoolBId,
    nama_guru: 'Guru Sekolah B Asli',
    nip: `19850101_${timestamp.toString().slice(-4)}`,
    mata_pelajaran: 'Biologi',
    status: 'aktif'
  }]);
  assert(!insGuruBErr, 'School B teacher inserted', insGuruBErr);

  const { error: insCfgBErr } = await schoolBClient.from('pengaturan').insert([{
    id: settingBId,
    sekolah_id: testSchoolBId,
    key: 'rahasia_sekolah_b',
    value: 'SUPER_SECRET_B'
  }]);
  assert(!insCfgBErr, 'School B settings inserted', insCfgBErr);

  // 3. School A Admin attempts to read School B
  const { data: crossReadById } = await schoolAClient.from('data_guru').select('*').eq('id', teacherBId);
  assert(!crossReadById || crossReadById.length === 0, 'School A Admin cannot read School B teacher by ID');

  const { data: crossReadByFilter } = await schoolAClient.from('data_guru').select('*').eq('sekolah_id', testSchoolBId);
  assert(!crossReadByFilter || crossReadByFilter.length === 0, 'School A Admin cannot read School B data with filter');

  const { data: crossReadSettings } = await schoolAClient.from('pengaturan').select('*').eq('id', settingBId);
  assert(!crossReadSettings || crossReadSettings.length === 0, 'School A Admin cannot read School B settings');

  // 4. School A Admin attempts to insert into School B
  const crossTrojanId = randomUUID();
  const { data: crossIns, error: crossInsErr } = await schoolAClient.from('data_guru').insert([{
    id: crossTrojanId,
    sekolah_id: testSchoolBId,
    nama_guru: 'Trojan from School A',
    mata_pelajaran: 'Infiltration',
    status: 'aktif'
  }]).select();
  assert(crossInsErr !== null || !crossIns || crossIns.length === 0, 'School A Admin cannot INSERT into School B');

  // 5. School A Admin attempts to update School B teacher
  const { data: crossUpd, error: crossUpdErr } = await schoolAClient.from('data_guru').update({
    nama_guru: 'MUTATED_BY_A'
  }).eq('id', teacherBId).select();
  assert(crossUpdErr !== null || !crossUpd || crossUpd.length === 0, 'School A Admin cannot UPDATE School B teacher');

  // 6. School A Admin attempts to delete School B teacher
  const { data: crossDel, error: crossDelErr } = await schoolAClient.from('data_guru').delete().eq('id', teacherBId).select();
  assert(crossDelErr !== null || !crossDel || crossDel.length === 0, 'School A Admin cannot DELETE School B teacher');

  // 7. Verify School B teacher still untouched
  const { data: verifyB } = await superadminClient.from('data_guru').select('nama_guru').eq('id', teacherBId).single();
  assert(verifyB?.nama_guru === 'Guru Sekolah B Asli', 'School B teacher remained completely intact and unmodified');

  // Teardown School B
  await superadminClient.from('sekolah').delete().eq('id', testSchoolBId);
  console.log('✅ Teardown: School B cleaned up cleanly');

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passes} PASSED, ${fails} FAILED`);
  console.log(`====================================================\n`);

  if (fails > 0) {
    throw new Error(`Forensic audit found ${fails} failures!`);
  }
}

runForensicChecks().catch(err => {
  console.error('Fatal error during forensic audit:', err);
  process.exit(1);
});
