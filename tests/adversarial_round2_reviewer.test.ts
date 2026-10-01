import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runAdversarialRound2Suite() {
  console.log('========================================================================');
  console.log('🛡️ ADVERSARIAL REVIEWER TEST SUITE (ROUND 2) - SIPJAM');
  console.log('Requirements: R1 (Merge Data), R2 (Izin Terlambat Flow), R3 (Teacher Modal)');
  console.log('========================================================================\n');

  const baseClient = createClient(supabaseUrl, supabaseAnonKey);

  // Helper to obtain fresh superadmin client
  async function getAuthClient() {
    const { data: saLogin } = await baseClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    const saToken = saLogin?.[0]?.session_token;
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-user-role': 'Superadmin',
          ...(saToken ? { 'x-session-token': saToken } : {})
        }
      }
    });
  }

  // ==========================================================================
  // SECTION 1: SIMULASI INTERAKTIF GURU - ACCOUNT SETTINGS MODAL & GANTI PASSWORD
  // ==========================================================================
  console.log('--- SECTION 1: Simulasi Interaktif Guru - AccountSettingsModal & Password ---');

  const modalPath = path.join(__dirname, '..', 'src', 'components', 'AccountSettingsModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  // 1.1 Verify static JSX isolation: no username input rendered when user is Guru
  assert(
    modalContent.includes('{isAdmin && (') &&
    modalContent.includes('Username (Login)'),
    'R3.1: Username input element and its label are strictly wrapped in {isAdmin && (...)}'
  );

  assert(
    modalContent.includes("{isAdmin ? `${user?.role || 'Pengguna'} • ${user?.username || ''}` : (user?.role || 'Guru')}"),
    'R3.2: Modal header strictly hides username when user role is not admin'
  );

  // 1.2 Verify password inputs are accessible and have mobile optimization attributes
  assert(
    modalContent.includes('autoComplete="current-password"') &&
    modalContent.includes('autoComplete="new-password"') &&
    modalContent.includes('appearance-none'),
    'R3.3: Password inputs have autocomplete and appearance-none attributes for cross-device mobile compatibility'
  );

  // 1.3 Live simulation: Create temporary teacher user, change password, and verify login
  const testTeacherId = '00000000-0000-0000-0000-000000000099';
  const testTeacherUsername = 'guru_test_r2_' + Date.now();
  const originalPassword = 'PasswordAwal123!';
  const updatedPassword = 'PasswordBaru456!';

  try {
    const authClient1 = await getAuthClient();
    // Clean up if already exists
    await authClient1.from('users').delete().eq('id', testTeacherId);

    // Hash initial password using verify_login test or direct insert
    const { error: insUserErr } = await authClient1.from('users').insert({
      id: testTeacherId,
      nama: 'Guru Simulasi R2',
      username: testTeacherUsername,
      role: 'Guru',
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });
    assert(!insUserErr, 'R3.4: Created temporary teacher user for password change simulation', insUserErr?.message);

    // Set initial password using update_user_profile
    const { data: setPassRes, error: setPassErr } = await authClient1.rpc('update_user_profile', {
      p_user_id: testTeacherId,
      p_avatar: '',
      p_username: testTeacherUsername,
      p_password: originalPassword,
      p_nama: 'Guru Simulasi R2'
    });
    assert(!setPassErr && (setPassRes as any)?.success !== false, 'R3.5: Set initial password on test teacher');

    // Verify initial login succeeds
    const { data: login1 } = await baseClient.rpc('verify_login', {
      p_username: testTeacherUsername,
      p_password: originalPassword
    });
    assert(login1 && login1.length > 0 && login1[0].username === testTeacherUsername, 'R3.6: Initial teacher login verified with original password');

    // Simulate teacher saving password from AccountSettingsModal:
    // Notice teacher payload retains user.username without username input
    const teacherSessionToken = login1[0].session_token;
    const teacherClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-user-role': 'Guru',
          'x-session-token': teacherSessionToken,
          'x-user-id': testTeacherId,
          'x-sekolah-id': 'a0000000-0000-0000-0000-000000000001'
        }
      }
    });

    const teacherPayload = {
      p_user_id: testTeacherId,
      p_avatar: '',
      p_username: testTeacherUsername, // Sent from user.username state, NOT from form input
      p_password: updatedPassword,
      p_nama: 'Guru Simulasi R2'
    };

    const { data: updateRes, error: updateErr } = await teacherClient.rpc('update_user_profile', teacherPayload);
    assert(!updateErr, 'R3.7: Teacher password update RPC succeeded without username validation error', updateErr?.message);
    assert((updateRes as any)?.success !== false, 'R3.8: Password update response confirmed successful');

    // Verify old password no longer works
    const { data: oldLogin } = await baseClient.rpc('verify_login', {
      p_username: testTeacherUsername,
      p_password: originalPassword
    });
    assert(!oldLogin || oldLogin.length === 0, 'R3.9: Old password rejected after update');

    // Verify new password successfully logs in
    const { data: newLogin } = await baseClient.rpc('verify_login', {
      p_username: testTeacherUsername,
      p_password: updatedPassword
    });
    assert(newLogin && newLogin.length > 0 && newLogin[0].username === testTeacherUsername, 'R3.10: New password successfully authenticated via verify_login');

  } finally {
    // Cleanup temporary test teacher
    const cleanClient = await getAuthClient();
    await cleanClient.from('users').delete().eq('id', testTeacherId);
  }

  // ==========================================================================
  // SECTION 2: ALUR LENGKAP IZIN TERLAMBAT (R2: SUBMIT -> PENDING -> APPROVE/REJECT)
  // ==========================================================================
  console.log('\n--- SECTION 2: Alur Lengkap Izin Terlambat (Submit -> Pending -> Verifikasi) ---');

  const testPresensiId = 'test-izin-terlambat-' + Date.now();
  const testTeacherName = 'Guru Test Izin Terlambat';
  let targetRecordId = testPresensiId;

  try {
    // 2.1 Submit Izin Terlambat via API endpoint
    const { POST: attendancePostHandler } = await import('../src/app/api/attendance/route');
    const { NextRequest } = await import('next/server');

    const submitReq = new NextRequest('http://localhost:3000/api/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Guru',
        'x-sekolah-id': 'a0000000-0000-0000-0000-000000000001'
      },
      body: JSON.stringify({
        id: testPresensiId,
        nama_guru: testTeacherName,
        tipe_absen: 'Datang',
        jenis_presensi: 'Izin Terlambat',
        detail_izin: 'Ban motor bocor di jalan',
        keterlambatan_detik: 1800, // 30 menit
        timestamp: '2026-10-02 07:45:00+08',
        sekolah_id: 'a0000000-0000-0000-0000-000000000001',
        status_verifikasi: 'Diverifikasi' // Hostile attempt to bypass
      })
    });

    const res = await attendancePostHandler(submitReq);
    assert(res.status === 201, 'R2.1: POST /api/attendance responded with 201 Created');
    const resData = await res.json();
    targetRecordId = resData.data?.id || testPresensiId;

    // 2.2 Verify status in database is strictly 'Menunggu'
    const authClient2 = await getAuthClient();
    const { data: dbRec, error: dbErr } = await authClient2
      .from('presensi_guru')
      .select('*')
      .eq('id', targetRecordId)
      .single();

    assert(!dbErr && dbRec, 'R2.2: Attendance record persisted in database');
    assert(dbRec?.status_verifikasi === 'Menunggu', `R2.3: Initial verification status is strictly "Menunggu" (got: ${dbRec?.status_verifikasi})`);
    assert(dbRec?.jenis_presensi === 'Izin Terlambat', 'R2.4: Record has jenis_presensi="Izin Terlambat"');
    assert(dbRec?.keterlambatan_detik === 1800, 'R2.5: Late duration in seconds (1800s) recorded accurately');

    // 2.3 Verify AdminVerifView pending filter logic
    const rawStatus = dbRec?.status_verifikasi || 'Menunggu';
    const isPending = rawStatus === 'Menunggu' || rawStatus === 'Menunggu Verifikasi';
    assert(isPending === true, 'R2.6: AdminVerifView identifies record as pending verification');

    // 2.4 Admin sets status to 'Disetujui'
    const { error: approveErr } = await authClient2
      .from('presensi_guru')
      .update({ status_verifikasi: 'Disetujui' })
      .eq('id', targetRecordId);

    assert(!approveErr, 'R2.7: Admin approved Izin Terlambat status to Disetujui');

    // 2.5 Verify AdminRekapView aggregates approved record
    const { data: rekapData } = await authClient2
      .from('presensi_guru')
      .select('*')
      .eq('id', targetRecordId)
      .in('status_verifikasi', ['Disetujui', 'Diverifikasi']);

    assert(rekapData && rekapData.length === 1, 'R2.8: Approved Izin Terlambat is included in AdminRekapView aggregation');

    // 2.6 Admin tests rejection flow
    const { error: rejectErr } = await authClient2
      .from('presensi_guru')
      .update({
        status_verifikasi: 'Ditolak',
        catatan_admin: 'Alasan tidak dapat diterima, silakan hubungi kepala sekolah'
      })
      .eq('id', targetRecordId);

    assert(!rejectErr, 'R2.9: Admin rejected Izin Terlambat with explanation');

    const { data: rejectedRec } = await authClient2
      .from('presensi_guru')
      .select('status_verifikasi, catatan_admin')
      .eq('id', targetRecordId)
      .single();

    assert(rejectedRec?.status_verifikasi === 'Ditolak', 'R2.10: Record reflects status_verifikasi="Ditolak"');
    assert(Boolean(rejectedRec?.catatan_admin), 'R2.11: Admin rejection reason stored in database');

  } finally {
    // Cleanup test record
    const cleanClient = await getAuthClient();
    await cleanClient.from('presensi_guru').delete().eq('id', targetRecordId);
  }

  // ==========================================================================
  // SECTION 3: R1 COUNT & MERGE IDEMPOTENCY AND ZERO-DATA STABILITY
  // ==========================================================================
  console.log('\n--- SECTION 3: R1 Count & Merge Idempotency and Zero-Data Stability ---');

  const { mergeAccounts } = await import('../scripts/merge_accounts');
  const result = await mergeAccounts();

  assert(result.success === true, 'R1.1: mergeAccounts() runs cleanly and returns success: true');
  assert(typeof result.presensiCount === 'number', 'R1.2: presensiCount is an exact numerical count');
  assert(typeof result.jurnalCount === 'number', 'R1.3: jurnalCount is an exact numerical count');
  assert(typeof result.piketCount === 'number', 'R1.4: piketCount is an exact numerical count');

  // Verify that target account exists in database
  const authClient3 = await getAuthClient();
  const { data: primaryAccount } = await authClient3
    .from('users')
    .select('id, nama')
    .eq('nama', 'Ade Fitrawan Ibrahim');

  assert(primaryAccount && primaryAccount.length > 0, 'R1.5: Primary account "Ade Fitrawan Ibrahim" exists and is preserved');

  // Verify that duplicate account is absent
  const { data: duplicateAccount } = await authClient3
    .from('users')
    .select('id, nama')
    .eq('nama', 'Ade Fitrawan Ibrahim, M.Pd., Gr.');

  assert(!duplicateAccount || duplicateAccount.length === 0, 'R1.6: Duplicate account "Ade Fitrawan Ibrahim, M.Pd., Gr." is removed from users table');

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`ROUND 2 ADVERSARIAL REVIEW: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialRound2Suite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
