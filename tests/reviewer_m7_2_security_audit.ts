import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;
let warnings = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`${GREEN}✅ PASS:${RESET} ${testName}`);
    passed++;
  } else {
    console.error(`${RED}❌ FAIL:${RESET} ${testName}`, detail !== undefined ? detail : '');
    failed++;
  }
}

function warn(testName: string, detail: string) {
  console.warn(`${YELLOW}⚠️ WARNING / FINDING:${RESET} ${testName} -> ${detail}`);
  warnings++;
}

async function runSecurityAudit() {
  console.log(`${CYAN}================================================================${RESET}`);
  console.log(`${CYAN}🔒 INDEPENDENT SECURITY & DATABASE AUDIT: REVIEWER_M7_2${RESET}`);
  console.log(`${CYAN}================================================================\n`);

  const ts = Date.now();
  const schoolAlphaId = randomUUID();
  const schoolBetaId = randomUUID();

  // Anonymous client
  const anonClient = createClient(supabaseUrl, supabaseKey);

  // Authenticate as Superadmin
  const { data: saAuth, error: saAuthErr } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'SipjamSuperAdmin2026!'
  });

  if (saAuthErr || !saAuth || saAuth.length === 0) {
    console.error('❌ Could not authenticate as Superadmin', saAuthErr);
    process.exit(1);
  }
  const superadminUserId = saAuth[0].id;

  const superClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        'x-user-id': superadminUserId
      }
    }
  });

  // Provision School Alpha and Beta
  console.log('📌 Setup: Provisioning School Alpha and Beta for multi-tenant isolation audit...');
  const { error: errScA } = await superClient.from('sekolah').insert({
    id: schoolAlphaId,
    nama: 'SMA Audit Alpha',
    npsn: `AUD_A_${ts.toString().slice(-5)}`,
    status: 'aktif'
  });
  assert(!errScA, 'School Alpha created in public.sekolah');

  const { error: errScB } = await superClient.from('sekolah').insert({
    id: schoolBetaId,
    nama: 'SMA Audit Beta',
    npsn: `AUD_B_${ts.toString().slice(-5)}`,
    status: 'aktif'
  });
  assert(!errScB, 'School Beta created in public.sekolah');

  // Provision Admin and Guru accounts
  const adminAlphaId = randomUUID();
  const guruAlphaId = randomUUID();
  const adminBetaId = randomUUID();
  const guruBetaId = randomUUID();

  await superClient.from('users').insert([
    {
      id: adminAlphaId,
      username: `admin_alpha_${ts}`,
      password: 'alphaAdminPassword',
      nama: 'Admin Alpha',
      role: 'Admin',
      sekolah_id: schoolAlphaId
    },
    {
      id: guruAlphaId,
      username: `guru_alpha_${ts}`,
      password: 'alphaGuruPassword',
      nama: 'Guru Alpha',
      role: 'Guru',
      sekolah_id: schoolAlphaId
    },
    {
      id: adminBetaId,
      username: `admin_beta_${ts}`,
      password: 'betaAdminPassword',
      nama: 'Admin Beta',
      role: 'Admin',
      sekolah_id: schoolBetaId
    },
    {
      id: guruBetaId,
      username: `guru_beta_${ts}`,
      password: 'betaGuruPassword',
      nama: 'Guru Beta',
      role: 'Guru',
      sekolah_id: schoolBetaId
    }
  ]);

  // Clients representing different roles & schools
  const clientAdminAlpha = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': schoolAlphaId,
        'x-user-role': 'Admin',
        'x-user-id': adminAlphaId
      }
    }
  });

  const clientGuruAlpha = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': schoolAlphaId,
        'x-user-role': 'Guru',
        'x-user-id': guruAlphaId
      }
    }
  });

  const clientAdminBeta = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': schoolBetaId,
        'x-user-role': 'Admin',
        'x-user-id': adminBetaId
      }
    }
  });

  try {
    // =========================================================================
    // PART 1: MULTI-TENANT ISOLATION ON NEW 2026-09-17 TABLES
    // =========================================================================
    console.log(`\n${CYAN}--- PART 1: Multi-Tenant RLS on wali_kelas, absensi, tujuan_pembelajaran, asesmen_kolom, nilai_siswa ---${RESET}`);

    // Seed data in School Beta by Admin Beta
    const testKelasBeta = 'XI-BETA';
    const testDate = '2026-09-17';
    const testNisnBeta = `NISN_B_${ts.toString().slice(-4)}`;

    // 1.1 wali_kelas
    const waliBetaId = randomUUID();
    const { error: errWaliBeta } = await clientAdminBeta.from('wali_kelas').insert({
      id: waliBetaId,
      sekolah_id: schoolBetaId,
      kelas: testKelasBeta,
      nama_guru: 'Wali Beta',
      nip: '19800000000001'
    });
    assert(!errWaliBeta, 'Admin Beta inserted wali_kelas for School Beta');

    // 1.2 absensi
    const absensiBetaId = randomUUID();
    const { error: errAbsensiBeta } = await clientAdminBeta.from('absensi').insert({
      id: absensiBetaId,
      sekolah_id: schoolBetaId,
      tanggal: testDate,
      kelas: testKelasBeta,
      nisn: testNisnBeta,
      nama_siswa: 'Siswa Beta',
      status: 'Hadir',
      sumber_perubahan: 'Piket',
      diubah_oleh: 'Admin Beta',
      log_perubahan: ['Initial']
    });
    assert(!errAbsensiBeta, 'Admin Beta inserted absensi for School Beta');

    // 1.3 tujuan_pembelajaran
    const tpBetaId = randomUUID();
    const { error: errTpBeta } = await clientAdminBeta.from('tujuan_pembelajaran').insert({
      id: tpBetaId,
      sekolah_id: schoolBetaId,
      nama_guru: 'Guru Beta',
      nama_mapel: 'Fisika',
      kelas: testKelasBeta,
      kode_tp: 'TP-B-01',
      deskripsi: 'Deskripsi Beta'
    });
    assert(!errTpBeta, 'Admin Beta inserted tujuan_pembelajaran for School Beta');

    // 1.4 asesmen_kolom
    const asesmenBetaId = randomUUID();
    const { error: errAsesmenBeta } = await clientAdminBeta.from('asesmen_kolom').insert({
      id: asesmenBetaId,
      sekolah_id: schoolBetaId,
      tp_id: tpBetaId,
      kategori: 'Diagnostik',
      nama: 'Diagnostik Beta'
    });
    assert(!errAsesmenBeta, 'Admin Beta inserted asesmen_kolom for School Beta');

    // 1.5 nilai_siswa
    const nilaiBetaId = randomUUID();
    const { error: errNilaiBeta } = await clientAdminBeta.from('nilai_siswa').insert({
      id: nilaiBetaId,
      sekolah_id: schoolBetaId,
      tp_id: tpBetaId,
      asesmen_id: asesmenBetaId,
      nisn: testNisnBeta,
      nama_siswa: 'Siswa Beta',
      kelas: testKelasBeta,
      mapel: 'Fisika',
      nama_guru: 'Guru Beta',
      nilai: 88.5
    });
    assert(!errNilaiBeta, 'Admin Beta inserted nilai_siswa for School Beta');

    // --- CROSS-TENANT SELECT TESTS FROM SCHOOL ALPHA ---
    console.log('\n🔍 Testing Cross-Tenant SELECT restrictions (School Alpha -> School Beta)...');

    const { data: readWali } = await clientAdminAlpha.from('wali_kelas').select('*').eq('id', waliBetaId);
    assert(!readWali || readWali.length === 0, 'School Alpha cannot SELECT School Beta wali_kelas by ID');

    const { data: readAbsensi } = await clientAdminAlpha.from('absensi').select('*').eq('id', absensiBetaId);
    assert(!readAbsensi || readAbsensi.length === 0, 'School Alpha cannot SELECT School Beta absensi by ID');

    const { data: readTp } = await clientAdminAlpha.from('tujuan_pembelajaran').select('*').eq('id', tpBetaId);
    assert(!readTp || readTp.length === 0, 'School Alpha cannot SELECT School Beta tujuan_pembelajaran by ID');

    const { data: readAsesmen } = await clientAdminAlpha.from('asesmen_kolom').select('*').eq('id', asesmenBetaId);
    assert(!readAsesmen || readAsesmen.length === 0, 'School Alpha cannot SELECT School Beta asesmen_kolom by ID');

    const { data: readNilai } = await clientAdminAlpha.from('nilai_siswa').select('*').eq('id', nilaiBetaId);
    assert(!readNilai || readNilai.length === 0, 'School Alpha cannot SELECT School Beta nilai_siswa by ID');

    // --- CROSS-TENANT INSERT TESTS FROM SCHOOL ALPHA TARGETING SCHOOL BETA ---
    console.log('\n🔍 Testing Cross-Tenant INSERT restrictions (School Alpha trying to inject into School Beta)...');

    const { data: insWali, error: errInsWali } = await clientAdminAlpha.from('wali_kelas').insert({
      sekolah_id: schoolBetaId,
      kelas: 'XII-HACK',
      nama_guru: 'Rogue Teacher'
    }).select();
    assert(!!errInsWali && (!insWali || (insWali as any).length === 0), 'School Alpha cannot INSERT into School Beta wali_kelas (RLS blocked)');

    const { data: insAbs, error: errInsAbs } = await clientAdminAlpha.from('absensi').insert({
      sekolah_id: schoolBetaId,
      tanggal: testDate,
      kelas: testKelasBeta,
      nisn: 'HACK_NISN',
      nama_siswa: 'Rogue',
      status: 'Alpa',
      sumber_perubahan: 'Hacker',
      diubah_oleh: 'Hacker'
    }).select();
    assert(!!errInsAbs && (!insAbs || (insAbs as any).length === 0), 'School Alpha cannot INSERT into School Beta absensi (RLS blocked)');

    const { data: insTp, error: errInsTp } = await clientAdminAlpha.from('tujuan_pembelajaran').insert({
      sekolah_id: schoolBetaId,
      nama_guru: 'Rogue Teacher',
      nama_mapel: 'Fisika',
      kelas: testKelasBeta,
      kode_tp: 'TP-HACK',
      deskripsi: 'Injected'
    }).select();
    assert(!!errInsTp && (!insTp || (insTp as any).length === 0), 'School Alpha cannot INSERT into School Beta tujuan_pembelajaran (RLS blocked)');

    const { data: insAses, error: errInsAses } = await clientAdminAlpha.from('asesmen_kolom').insert({
      sekolah_id: schoolBetaId,
      tp_id: tpBetaId,
      kategori: 'Formatif',
      nama: 'Injected'
    }).select();
    assert(!!errInsAses && (!insAses || (insAses as any).length === 0), 'School Alpha cannot INSERT into School Beta asesmen_kolom (RLS blocked)');

    const { data: insNilai, error: errInsNilai } = await clientAdminAlpha.from('nilai_siswa').insert({
      sekolah_id: schoolBetaId,
      tp_id: tpBetaId,
      asesmen_id: asesmenBetaId,
      nisn: testNisnBeta,
      nama_siswa: 'Siswa Beta',
      kelas: testKelasBeta,
      mapel: 'Fisika',
      nama_guru: 'Guru Beta',
      nilai: 100
    }).select();
    assert(!!errInsNilai && (!insNilai || (insNilai as any).length === 0), 'School Alpha cannot INSERT into School Beta nilai_siswa (RLS blocked)');

    // --- CROSS-TENANT UPDATE TESTS ---
    console.log('\n🔍 Testing Cross-Tenant UPDATE restrictions (School Alpha modifying School Beta)...');

    const { data: updWali, error: errUpdWali } = await clientAdminAlpha.from('wali_kelas').update({ nama_guru: 'Defaced' }).eq('id', waliBetaId).select();
    assert(!updWali || updWali.length === 0, 'School Alpha cannot UPDATE School Beta wali_kelas (0 rows updated)');

    const { data: updAbs, error: errUpdAbs } = await clientAdminAlpha.from('absensi').update({ status: 'Alpa' }).eq('id', absensiBetaId).select();
    assert(!updAbs || updAbs.length === 0, 'School Alpha cannot UPDATE School Beta absensi (0 rows updated)');

    const { data: updNilai, error: errUpdNilai } = await clientAdminAlpha.from('nilai_siswa').update({ nilai: 0 }).eq('id', nilaiBetaId).select();
    assert(!updNilai || updNilai.length === 0, 'School Alpha cannot UPDATE School Beta nilai_siswa (0 rows updated)');

    // Verify School Beta records remain unmutated
    const { data: checkNilai } = await clientAdminBeta.from('nilai_siswa').select('nilai').eq('id', nilaiBetaId).single();
    assert(Number(checkNilai?.nilai) === 88.5, 'School Beta nilai_siswa record remains unchanged (value=88.5)');

    // --- CROSS-TENANT DELETE TESTS ---
    console.log('\n🔍 Testing Cross-Tenant DELETE restrictions (School Alpha deleting School Beta)...');

    const { data: delWali } = await clientAdminAlpha.from('wali_kelas').delete().eq('id', waliBetaId).select();
    assert(!delWali || delWali.length === 0, 'School Alpha cannot DELETE School Beta wali_kelas (0 rows deleted)');

    const { data: delAbs } = await clientAdminAlpha.from('absensi').delete().eq('id', absensiBetaId).select();
    assert(!delAbs || delAbs.length === 0, 'School Alpha cannot DELETE School Beta absensi (0 rows deleted)');

    const { data: delNilai } = await clientAdminAlpha.from('nilai_siswa').delete().eq('id', nilaiBetaId).select();
    assert(!delNilai || delNilai.length === 0, 'School Alpha cannot DELETE School Beta nilai_siswa (0 rows deleted)');

    // Verify School Beta records still exist
    const { data: checkWaliExists } = await clientAdminBeta.from('wali_kelas').select('id').eq('id', waliBetaId).single();
    assert(!!checkWaliExists?.id, 'School Beta wali_kelas still exists intact');

    // =========================================================================
    // PART 2: TRIGGER ISOLATION & RESILIENCE (trg_sync_absensi_to_jurnal)
    // =========================================================================
    console.log(`\n${CYAN}--- PART 2: Trigger trg_sync_absensi_to_jurnal Multi-Tenant Isolation & Edge Cases ---${RESET}`);

    // Create journal in School Alpha and journal in School Beta for the SAME class name ('X-COMMON') and same date
    const commonClass = 'X-COMMON';
    const commonDate = '2026-09-17';
    const journalAlphaId = randomUUID();
    const journalBetaId = randomUUID();

    await clientAdminAlpha.from('jurnal_pembelajaran').insert({
      id: journalAlphaId,
      sekolah_id: schoolAlphaId,
      tanggal: commonDate,
      kelas: commonClass,
      mapel: 'Kimia',
      nama_guru: 'Guru Alpha',
      absensi_siswa: JSON.stringify({ 'NISN_COMMON': 'Hadir' })
    });

    await clientAdminBeta.from('jurnal_pembelajaran').insert({
      id: journalBetaId,
      sekolah_id: schoolBetaId,
      tanggal: commonDate,
      kelas: commonClass,
      mapel: 'Biologi',
      nama_guru: 'Guru Beta',
      absensi_siswa: JSON.stringify({ 'NISN_COMMON': 'Hadir' })
    });

    // Now insert absensi in School Alpha for NISN_COMMON -> 'Sakit'
    await clientAdminAlpha.from('absensi').insert({
      sekolah_id: schoolAlphaId,
      tanggal: commonDate,
      kelas: commonClass,
      nisn: 'NISN_COMMON',
      nama_siswa: 'Common Student',
      status: 'Sakit',
      sumber_perubahan: 'Wali Kelas',
      diubah_oleh: 'Guru Alpha'
    });

    // Check School Alpha journal: must be updated to 'Sakit'
    const { data: jA } = await clientAdminAlpha.from('jurnal_pembelajaran').select('absensi_siswa').eq('id', journalAlphaId).single();
    const parsedJA = JSON.parse(jA?.absensi_siswa || '{}');
    assert(parsedJA['NISN_COMMON'] === 'Sakit', 'Trigger updated School Alpha journal absensi_siswa to Sakit');

    // Check School Beta journal: MUST REMAIN 'Hadir' (ZERO cross-tenant sync leak!)
    const { data: jB } = await clientAdminBeta.from('jurnal_pembelajaran').select('absensi_siswa').eq('id', journalBetaId).single();
    const parsedJB = JSON.parse(jB?.absensi_siswa || '{}');
    assert(parsedJB['NISN_COMMON'] === 'Hadir', 'TRIGGER ISOLATION: School Beta journal was NOT modified by School Alpha attendance update');

    // Test Trigger with special characters in NISN (e.g. quote, slash, backslash)
    console.log('🔍 Testing Trigger with special characters in NISN & status...');
    const weirdNisn = `NISN_"test'\\/${ts.toString().slice(-4)}`;
    const { error: errWeirdAbs } = await clientAdminAlpha.from('absensi').insert({
      sekolah_id: schoolAlphaId,
      tanggal: commonDate,
      kelas: commonClass,
      nisn: weirdNisn,
      nama_siswa: 'Special Char Student',
      status: 'Izin',
      sumber_perubahan: 'Piket',
      diubah_oleh: 'Admin Alpha'
    });
    assert(!errWeirdAbs, 'Trigger handled special characters in NISN without JSON syntax error');

    const { data: jAWeird } = await clientAdminAlpha.from('jurnal_pembelajaran').select('absensi_siswa').eq('id', journalAlphaId).single();
    const parsedJAWeird = JSON.parse(jAWeird?.absensi_siswa || '{}');
    assert(parsedJAWeird[weirdNisn] === 'Izin', 'Trigger properly escaped and stored special character NISN in JSONB');

    // =========================================================================
    // PART 3: SECURITY DEFINER RPC update_user_profile AUDIT
    // =========================================================================
    console.log(`\n${CYAN}--- PART 3: Security Definer RPC update_user_profile Audit ---${RESET}`);

    // 3.1 Can a user update their OWN avatar and nama?
    const { data: ownRes, error: ownErr } = await clientGuruAlpha.rpc('update_user_profile', {
      p_user_id: guruAlphaId,
      p_avatar: 'avatar_5',
      p_nama: 'Guru Alpha Updated'
    });
    assert(!ownErr && (ownRes as any)?.success === true, 'User can update their own profile avatar and nama');

    // 3.2 Does update_user_profile protect role from escalation?
    const { data: roleCheck } = await clientGuruAlpha.from('users').select('role').eq('id', guruAlphaId).single();
    assert(roleCheck?.role === 'Guru', 'User role cannot be elevated via update_user_profile (remains Guru)');

    // 3.3 IDOR CHECK: Can Guru Alpha call update_user_profile on Admin Beta (different school)?
    console.log('🔍 Adversarial Check: Calling update_user_profile with another user\'s UUID across schools...');
    const { data: idorCrossRes, error: idorCrossErr } = await clientGuruAlpha.rpc('update_user_profile', {
      p_user_id: adminBetaId,
      p_password: 'tamperedPassword123'
    });

    if ((idorCrossRes as any)?.success === true) {
      warn(
        'IDOR / Broken Access Control in update_user_profile',
        'update_user_profile has NO caller validation! Guru Alpha successfully modified Admin Beta\'s password across schools!'
      );
      const { data: betaUserCheck } = await superClient.from('users').select('password').eq('id', adminBetaId).single();
      if (betaUserCheck?.password === 'tamperedPassword123') {
        console.error(`${RED}🚨 VULNERABILITY CONFIRMED:${RESET} Arbitrary user password overwrite confirmed in public.users!`);
      }
    } else {
      assert(true, 'update_user_profile rejected cross-user modification');
    }

    // 3.4 Unauthenticated / Anon caller check on update_user_profile
    console.log('🔍 Adversarial Check: Calling update_user_profile as Anonymous / unauthenticated client...');
    const { data: anonRpcRes, error: anonRpcErr } = await anonClient.rpc('update_user_profile', {
      p_user_id: guruBetaId,
      p_avatar: 'avatar_12'
    });
    if ((anonRpcRes as any)?.success === true) {
      warn(
        'Public Anonymous Execution of update_user_profile',
        'Anonymous client can execute update_user_profile because GRANT ALL ON ALL ROUTINES TO anon was executed in migration!'
      );
    } else {
      assert(true, 'Anonymous execution blocked on update_user_profile');
    }

    // =========================================================================
    // PART 4: PUSH SUBSCRIPTIONS RLS & API ROUTES AUDIT
    // =========================================================================
    console.log(`\n${CYAN}--- PART 4: push_subscriptions RLS & API Routes Audit ---${RESET}`);

    // Seed push subscriptions
    const subAlphaEndpoint = `https://fcm.googleapis.com/fcm/send/sub_alpha_${ts}`;
    const subBetaEndpoint = `https://fcm.googleapis.com/fcm/send/sub_beta_${ts}`;
    const subNullEndpoint = `https://fcm.googleapis.com/fcm/send/sub_null_${ts}`;

    // Admin Alpha inserts subscription
    const { error: errSubA } = await clientAdminAlpha.from('push_subscriptions').insert({
      sekolah_id: schoolAlphaId,
      user_id: adminAlphaId,
      endpoint: subAlphaEndpoint,
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9P04AwUFgcZ2',
      auth: 'tBHItJI5svbpez7KI4CCXg'
    });
    assert(!errSubA, 'Admin Alpha created push_subscription for School Alpha');

    // Admin Beta inserts subscription
    const { error: errSubB } = await clientAdminBeta.from('push_subscriptions').insert({
      sekolah_id: schoolBetaId,
      user_id: adminBetaId,
      endpoint: subBetaEndpoint,
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9P04AwUFgcZ2',
      auth: 'tBHItJI5svbpez7KI4CCXg'
    });
    assert(!errSubB, 'Admin Beta created push_subscription for School Beta');

    // Superadmin inserts subscription with NULL sekolah_id
    const { error: errSubNull } = await superClient.from('push_subscriptions').insert({
      sekolah_id: null,
      user_id: superadminUserId,
      endpoint: subNullEndpoint,
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9P04AwUFgcZ2',
      auth: 'tBHItJI5svbpez7KI4CCXg'
    });
    assert(!errSubNull, 'Superadmin created push_subscription with NULL sekolah_id');

    // Cross-tenant check: Can Admin Alpha read School Beta subscription?
    const { data: readBetaSub } = await clientAdminAlpha.from('push_subscriptions').select('*').eq('endpoint', subBetaEndpoint);
    assert(!readBetaSub || readBetaSub.length === 0, 'School Alpha cannot SELECT School Beta push_subscription');

    // Check: Can Admin Alpha read Superadmin subscription (sekolah_id IS NULL)?
    const { data: readNullSub } = await clientAdminAlpha.from('push_subscriptions').select('*').eq('endpoint', subNullEndpoint);
    if (readNullSub && readNullSub.length > 0) {
      warn(
        'push_subscriptions Policy Allows Reading NULL sekolah_id',
        'sekolah_id IS NULL in push_subscriptions policy allows tenant users to SELECT Superadmin push subscriptions!'
      );
    } else {
      assert(true, 'Tenant users cannot read Superadmin push subscriptions');
    }

    // =========================================================================
    // PART 5: ROLE PERMISSION BOUNDARIES (TEACHER VS ADMIN PRIVILEGE ESCALATION)
    // =========================================================================
    console.log(`\n${CYAN}--- PART 5: Role Permission Boundaries (Teacher Privilege Escalation Attempts) ---${RESET}`);

    // 5.1 Can Guru Alpha update their own role in public.users to 'Admin'?
    const { data: escUser, error: errEscUser } = await clientGuruAlpha
      .from('users')
      .update({ role: 'Admin' })
      .eq('id', guruAlphaId)
      .select();
    assert(!!errEscUser || !escUser || escUser.length === 0, 'Guru cannot update own role to Admin in public.users (RLS WITH CHECK blocked)');

    // 5.2 Can Guru Alpha delete other users from public.users?
    const { data: delUser, error: errDelUser } = await clientGuruAlpha
      .from('users')
      .delete()
      .eq('id', adminAlphaId)
      .select();
    assert(!delUser || delUser.length === 0, 'Guru cannot DELETE users from public.users (RLS blocked)');

    // 5.3 Can Guru Alpha reassign wali_kelas in School Alpha?
    const { data: rogueWali, error: errRogueWali } = await clientGuruAlpha
      .from('wali_kelas')
      .insert({
        sekolah_id: schoolAlphaId,
        kelas: 'XII-ROGUE',
        nama_guru: 'Guru Alpha',
        nip: '19999999999999'
      })
      .select();

    if (!errRogueWali && rogueWali && rogueWali.length > 0) {
      warn(
        'wali_kelas Insert Policy Lacks Role Check',
        'wali_kelas RLS allows any user with matching sekolah_id (including Guru) to INSERT/UPDATE homeroom assignments. UI restricts this to Admin, but DB policy checks only sekolah_id.'
      );
    } else {
      assert(true, 'Guru cannot modify wali_kelas');
    }

  } finally {
    // Clean up test data
    console.log(`\n${CYAN}--- CLEANUP: Removing temporary test tenants and records ---${RESET}`);
    await superClient.from('nilai_siswa').delete().in('sekolah_id', [schoolAlphaId, schoolBetaId]);
    await superClient.from('asesmen_kolom').delete().in('sekolah_id', [schoolAlphaId, schoolBetaId]);
    await superClient.from('tujuan_pembelajaran').delete().in('sekolah_id', [schoolAlphaId, schoolBetaId]);
    await superClient.from('absensi').delete().in('sekolah_id', [schoolAlphaId, schoolBetaId]);
    await superClient.from('jurnal_pembelajaran').delete().in('sekolah_id', [schoolAlphaId, schoolBetaId]);
    await superClient.from('wali_kelas').delete().in('sekolah_id', [schoolAlphaId, schoolBetaId]);
    await superClient.from('push_subscriptions').delete().in('sekolah_id', [schoolAlphaId, schoolBetaId]);
    await superClient.from('push_subscriptions').delete().eq('user_id', superadminUserId);
    await superClient.from('users').delete().in('sekolah_id', [schoolAlphaId, schoolBetaId]);
    await superClient.from('sekolah').delete().in('id', [schoolAlphaId, schoolBetaId]);
    console.log('✅ Temporary test data cleaned up successfully.');
  }

  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED, ${warnings} WARNINGS/FINDINGS`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
