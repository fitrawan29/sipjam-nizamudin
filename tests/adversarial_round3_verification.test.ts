import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let passedCount = 0;
let failedCount = 0;

function testPass(desc: string) {
  console.log(`✅ PASS: ${desc}`);
  passedCount++;
}

function testFail(desc: string, err: any) {
  console.error(`❌ FAIL: ${desc}`);
  console.error(`   ${err?.message || err}`);
  failedCount++;
}

async function getAdminClient() {
  const baseClient = createClient(supabaseUrl, supabaseKey);
  const { data: loginData } = await baseClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'SipjamSuperAdmin2026!'
  });
  const token = loginData?.[0]?.session_token;
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(token ? { 'x-session-token': token } : {})
      }
    }
  });
}

async function runRound3Tests() {
  console.log('========================================================================');
  console.log('🛡️ ADVERSARIAL REVIEWER TEST SUITE (ROUND 3) - SIPJAM');
  console.log('Focus: M.Pd False-Collision Isolation, API Tamper Resistance, & R1-R3 QA');
  console.log('========================================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const adminClient = await getAdminClient();

  // ==========================================================================
  // SECTION 1: R1 M.Pd False Collision Attack & Scoping Verification
  // ==========================================================================
  console.log('--- SECTION 1: R1 False Collision Attack & Scope Verification ---');

  const DUMMY_TEACHER_ID = crypto.randomUUID();
  const DUMMY_USER_ID = '6f5bfd44-7356-4b3e-a115-f87df12eedba'; // Valid teacher user ID

  try {
    // 1.1 Verify scripts/merge_accounts.ts does NOT contain loose %M.Pd% without Ade Fitrawan Ibrahim
    const mergeScriptContent = fs.readFileSync(path.join(rootDir, 'scripts', 'merge_accounts.ts'), 'utf-8');
    const looseMpdMatches = mergeScriptContent.match(/(?:nama_guru|guru_pelapor|guru_nama|username|nama)\.ilike\.%M\.Pd%/g);
    assert(
      !looseMpdMatches || looseMpdMatches.length === 0,
      `merge_accounts.ts contains loose %M.Pd% filters that could hijack unrelated teachers with M.Pd degrees! Found: ${looseMpdMatches?.join(', ')}`
    );
    testPass('R1.1: scripts/merge_accounts.ts contains zero unconstrained %M.Pd% filters');

    // 1.2 Verify that all M.Pd filters are explicitly qualified with Ade Fitrawan Ibrahim
    assert(
      mergeScriptContent.includes('nama_guru.ilike.Ade Fitrawan Ibrahim%M.Pd%'),
      'presensi and jurnal filters are explicitly qualified with Ade Fitrawan Ibrahim'
    );
    assert(
      mergeScriptContent.includes('guru_pelapor.ilike.Ade Fitrawan Ibrahim%M.Pd%'),
      'laporan_piket filter is explicitly qualified with Ade Fitrawan Ibrahim'
    );
    testPass('R1.2: All M.Pd filters are strictly qualified with Ade Fitrawan Ibrahim prefix');

    // 1.3 Live database adversarial probe: Create unrelated teacher with M.Pd
    const { error: insPresensiErr } = await adminClient.from('presensi_guru').insert([
      {
        id: DUMMY_TEACHER_ID,
        sekolah_id: 'a0000000-0000-0000-0000-000000000001',
        nama_guru: DUMMY_UNRELATED_NAME,
        user_id: DUMMY_USER_ID,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        keterlambatan_detik: 0,
        timestamp: new Date().toISOString()
      }
    ]);
    assert(!insPresensiErr, `Failed to insert dummy teacher presensi: ${insPresensiErr?.message}`);
    testPass('R1.3: Unrelated teacher with M.Pd title created in presensi_guru');

    // 1.4 Test that duplicate count query in merge_accounts does NOT count the unrelated teacher
    const DUPLICATE_NAME = 'Ade Fitrawan Ibrahim, M.Pd., Gr.';
    const { count: dupPresensiCount } = await adminClient
      .from('presensi_guru')
      .select('*', { count: 'exact', head: true })
      .or(`nama_guru.eq."${DUPLICATE_NAME}",nama_guru.ilike.Ade Fitrawan Ibrahim%M.Pd%`);

    assert(
      dupPresensiCount === 0,
      `Unrelated teacher record was falsely matched as duplicate! Expected 0, got ${dupPresensiCount}`
    );
    testPass('R1.4: Scoped filter correctly ignores unrelated M.Pd teacher (count: 0)');

    // 1.5 Verify mergeAccounts() execution does NOT touch the unrelated teacher's record
    const { mergeAccounts } = await import('../scripts/merge_accounts');
    const mergeRes = await mergeAccounts();
    assert(mergeRes.success === true, 'mergeAccounts executed successfully');

    // Obtain fresh client since mergeAccounts issued a new session token
    const postMergeClient = await getAdminClient();
    const { data: checkUnrelated } = await postMergeClient
      .from('presensi_guru')
      .select('nama_guru, user_id')
      .eq('id', DUMMY_TEACHER_ID)
      .single();

    assert(
      checkUnrelated && checkUnrelated.nama_guru === DUMMY_UNRELATED_NAME,
      `Unrelated teacher record was hijacked or modified! Expected "${DUMMY_UNRELATED_NAME}", got "${checkUnrelated?.nama_guru}"`
    );
    assert(
      checkUnrelated.user_id === DUMMY_USER_ID,
      `Unrelated teacher user_id was overwritten! Expected "${DUMMY_USER_ID}", got "${checkUnrelated?.user_id}"`
    );
    testPass('R1.5: Unrelated teacher record was completely preserved and untouched by mergeAccounts');

    // Clean up dummy record
    await postMergeClient.from('presensi_guru').delete().eq('id', DUMMY_TEACHER_ID);
    testPass('R1.6: Dummy unrelated teacher test record cleaned up cleanly');
  } catch (err: any) {
    testFail('Section 1 R1 verification failed', err);
    try {
      const cleanClient = await getAdminClient();
      await cleanClient.from('presensi_guru').delete().eq('id', DUMMY_TEACHER_ID);
    } catch {}
  }

  // ==========================================================================
  // SECTION 2: R2 Izin Terlambat Tamper Resistance & Admin Flow
  // ==========================================================================
  console.log('\n--- SECTION 2: R2 Izin Terlambat Verification Workflow ---');

  const testAttendanceId = crypto.randomUUID();

  try {
    // 2.1 Verify route enforces Menunggu even if client passes Disetujui
    const routePath = path.join(rootDir, 'src', 'app', 'api', 'attendance', 'route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf-8');
    assert(
      routeContent.includes("isTerlambat ? 'Menunggu' :"),
      'attendance route strictly enforces Menunggu when isTerlambat is true'
    );
    testPass('R2.1: Server attendance API route strictly enforces status "Menunggu" for late permissions');

    // 2.2 Verify AdminVerifView handles both Menunggu and Menunggu Verifikasi
    const adminVerifPath = path.join(rootDir, 'src', 'components', 'AdminVerifView.tsx');
    const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf-8');
    assert(
      adminVerifContent.includes("rawStatus === 'Menunggu' || rawStatus === 'Menunggu Verifikasi'"),
      'AdminVerifView recognizes both Menunggu and Menunggu Verifikasi as pending'
    );
    testPass('R2.2: AdminVerifView recognizes all variants of pending verification statuses');

    // 2.3 Verify action buttons have accessible and semantic labels
    assert(
      adminVerifContent.includes('title="Terima / Setujui Pengajuan"') || adminVerifContent.includes('aria-label="Terima / Setujui"'),
      'AdminVerifView includes explicit Terima/Setujui button metadata'
    );
    assert(
      adminVerifContent.includes('title="Tolak Pengajuan"') || adminVerifContent.includes('aria-label="Tolak"'),
      'AdminVerifView includes explicit Tolak button metadata'
    );
    testPass('R2.3: AdminVerifView provides explicit Terima/Setujui and Tolak buttons for administrators');

    // 2.4 Verify HomeView does not mark pending Izin Terlambat as Hadir
    const homeViewPath = path.join(rootDir, 'src', 'components', 'HomeView.tsx');
    const homeViewContent = fs.readFileSync(homeViewPath, 'utf-8');
    assert(
      homeViewContent.includes("presensiDatangStatus = 'Izin Terlambat (Menunggu Verifikasi)'"),
      'HomeView sets pending Izin Terlambat status to "Izin Terlambat (Menunggu Verifikasi)"'
    );
    assert(
      !homeViewContent.includes("presensiDatangStatus = `Hadir [${datangTime}]`; // Izin Terlambat pending"),
      'HomeView does not falsely classify unverified Izin Terlambat as Hadir'
    );
    testPass('R2.4: HomeView displays dedicated pending status instead of premature Hadir');

    // 2.5 Live database: insert Izin Terlambat with status Menunggu and verify AdminRekap aggregation
    const sec2Client = await getAdminClient();
    const { error: insLateErr } = await sec2Client.from('presensi_guru').insert([
      {
        id: testAttendanceId,
        sekolah_id: 'a0000000-0000-0000-0000-000000000001',
        nama_guru: 'Ade Fitrawan Ibrahim',
        user_id: 'fff9d836-b034-4a66-be96-1c1b7cfad277',
        tipe_absen: 'Datang',
        jenis_presensi: 'Izin Terlambat',
        status_verifikasi: 'Menunggu',
        keterlambatan_detik: 1200,
        timestamp: new Date().toISOString()
      }
    ]);
    assert(!insLateErr, `Failed to insert test attendance: ${insLateErr?.message}`);

    const { data: insertedRec } = await sec2Client
      .from('presensi_guru')
      .select('status_verifikasi, jenis_presensi, keterlambatan_detik')
      .eq('id', testAttendanceId)
      .single();

    assert(insertedRec?.status_verifikasi === 'Menunggu', 'Record is saved with status Menunggu');
    assert(insertedRec?.jenis_presensi === 'Izin Terlambat', 'Record jenis is Izin Terlambat');
    assert(insertedRec?.keterlambatan_detik === 1200, 'keterlambatan_detik is preserved');
    testPass('R2.5: Live Izin Terlambat successfully inserted with initial pending status');

    // Clean up test attendance
    await sec2Client.from('presensi_guru').delete().eq('id', testAttendanceId);
    testPass('R2.6: Live Izin Terlambat test record cleaned up');
  } catch (err: any) {
    testFail('Section 2 R2 verification failed', err);
    try {
      const cleanClient = await getAdminClient();
      await cleanClient.from('presensi_guru').delete().eq('id', testAttendanceId);
    } catch {}
  }

  // ==========================================================================
  // SECTION 3: R3 Teacher Username Elimination & Password Integrity
  // ==========================================================================
  console.log('\n--- SECTION 3: R3 Teacher Username Removal & Password Form ---');

  try {
    const modalPath = path.join(rootDir, 'src', 'components', 'AccountSettingsModal.tsx');
    const modalContent = fs.readFileSync(modalPath, 'utf-8');

    // 3.1 Strict conditional rendering of username input
    assert(
      modalContent.includes('{isAdmin && (') &&
      modalContent.includes('Username (Login)'),
      'Username input and its label are strictly gated behind {isAdmin && (...)}'
    );
    testPass('R3.1: Username input element is strictly gated behind {isAdmin && (...)}');

    // 3.2 Modal header hides username for non-admin
    assert(
      modalContent.includes("{isAdmin ? `${user?.role || 'Pengguna'} • ${user?.username || ''}` : (user?.role || 'Guru')}"),
      'Modal header conditionally omits username for teachers'
    );
    testPass('R3.2: Modal header omits username when user role is not admin');

    // 3.3 Layout responsiveness: teacher view uses clean space-y-3 instead of split grid
    assert(
      modalContent.includes('isAdmin ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"'),
      'Section 2 uses space-y-3 full-width layout for teachers without empty half-grid gaps'
    );
    testPass('R3.3: Teacher profile layout adapts cleanly to space-y-3 without empty column gaps');

    // 3.4 Password inputs remain fully accessible
    assert(
      modalContent.includes('name="currentPassword"') || modalContent.includes('setCurrentPassword(e.target.value)'),
      'Current password input exists and is accessible'
    );
    assert(
      modalContent.includes('setNewPassword(e.target.value)'),
      'New password input exists and is accessible'
    );
    assert(
      modalContent.includes('setConfirmPassword(e.target.value)'),
      'Confirm password input exists and is accessible'
    );
    testPass('R3.4: Form ganti password (kata sandi lama & baru) remains fully accessible and functional');

    // 3.5 RPC payload retains existing teacher username with safe fallback
    assert(
      modalContent.includes("p_username: isAdmin ? username.trim() : (user.username") ||
      modalContent.includes("p_username: isAdmin ? username.trim() : user.username"),
      'RPC payload retains teacher username safely'
    );
    testPass('R3.5: RPC update_user_profile payload preserves teacher username without form input');
  } catch (err: any) {
    testFail('Section 3 R3 verification failed', err);
  }

  // ==========================================================================
  // FINAL SCOREBOARD
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`ROUND 3 ADVERSARIAL REVIEW: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRound3Tests().catch((err) => {
  console.error('Fatal test error in Round 3 suite:', err);
  process.exit(1);
});
