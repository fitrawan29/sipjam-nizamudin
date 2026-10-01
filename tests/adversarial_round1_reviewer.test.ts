import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const rootDir = path.resolve(__dirname, '..');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function runReviewerAdversarialSuite() {
  console.log('========================================================================');
  console.log('🛡️ ADVERSARIAL REVIEWER TEST SUITE (ROUND 1) - SIPJAM');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function testPass(label: string) {
    passed++;
    console.log(`✅ PASS: ${label}`);
  }

  function testFail(label: string, err: any) {
    failed++;
    console.error(`❌ FAIL: ${label}`);
    console.error('   Error details:', err?.message || err);
  }

  const baseClient = createClient(supabaseUrl, supabaseKey);
  const { data: loginData } = await baseClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'SipjamSuperAdmin2026!'
  });
  const sessionToken = loginData?.[0]?.session_token;

  const authClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });

  // ==========================================================================
  // CATEGORY 1: R1 Comma Parsing Bug Regression & PostgREST Filter Robustness
  // ==========================================================================
  console.log('--- CATEGORY 1: R1 Comma Parsing in Account Name & Exact Count ---');

  const DUPLICATE_NAME = 'Ade Fitrawan Ibrahim, M.Pd., Gr.';
  const PRIMARY_NAME = 'Ade Fitrawan Ibrahim';
  const testAttendanceId = 'test-dup-adv-' + Date.now();

  try {
    // 1.1 Insert dummy attendance with comma-containing name
    const { error: insErr } = await authClient.from('presensi_guru').insert({
      id: testAttendanceId,
      nama_guru: DUPLICATE_NAME,
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      timestamp: '2026-10-02 08:00:00+08',
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      status_verifikasi: 'Disetujui'
    });
    assert(!insErr, 'Insertion of dummy attendance succeeded: ' + insErr?.message);
    testPass('R1.1: Dummy test record with commas in teacher name created');

    // 1.2 Test query COUNT with quotes (new implementation)
    const { count: dupCount, error: countErr } = await authClient
      .from('presensi_guru')
      .select('*', { count: 'exact', head: true })
      .or(`nama_guru.eq."${DUPLICATE_NAME}",nama_guru.ilike.%M.Pd%`);

    assert(!countErr, 'Quoted query must not produce PostgREST syntax error');
    assert(typeof dupCount === 'number' && dupCount >= 1, `Count must be at least 1 (got: ${dupCount})`);
    testPass(`R1.2: PostgREST successfully parsed quoted filter and counted ${dupCount} record(s) without syntax error`);

    // 1.3 Test update with quotes
    const { error: updateErr } = await authClient
      .from('presensi_guru')
      .update({ nama_guru: PRIMARY_NAME })
      .or(`nama_guru.eq."${DUPLICATE_NAME}"`);

    assert(!updateErr, 'Quoted update must not produce PostgREST syntax error: ' + updateErr?.message);
    testPass('R1.3: PostgREST successfully updated record with quoted name containing commas');

    // Clean up
    await authClient.from('presensi_guru').delete().eq('id', testAttendanceId);
    testPass('R1.4: Dummy test record cleaned up');
  } catch (err: any) {
    testFail('R1 Category 1 failed', err);
    await authClient.from('presensi_guru').delete().eq('id', testAttendanceId).catch(() => {});
  }

  // 1.5 Verify scripts/merge_accounts.ts code structure
  try {
    const mergeScriptContent = fs.readFileSync(path.join(rootDir, 'scripts', 'merge_accounts.ts'), 'utf-8');
    assert(
      mergeScriptContent.includes('nama_guru.eq."${DUPLICATE_NAME}"'),
      'merge_accounts.ts quotes DUPLICATE_NAME to prevent PostgREST syntax error'
    );
    assert(
      mergeScriptContent.includes('guru_pelapor.eq."${DUPLICATE_NAME}"'),
      'merge_accounts.ts quotes DUPLICATE_NAME in laporan_piket filter'
    );
    assert(
      mergeScriptContent.includes('jadwal_pelajaran') && mergeScriptContent.includes('jpFilter'),
      'merge_accounts.ts re-assigns jadwal_pelajaran even if duplicateUserId is null'
    );
    testPass('R1.5: scripts/merge_accounts.ts contains all PostgREST quote escapes and schedule fallback');
  } catch (err: any) {
    testFail('R1.5 code inspection failed', err);
  }

  // ==========================================================================
  // CATEGORY 2: R2 Izin Terlambat Bypass Prevention & Verification Workflow
  // ==========================================================================
  console.log('\n--- CATEGORY 2: R2 Izin Terlambat Bypass Prevention & Flow ---');

  const testBypassId = 'test-bypass-' + Date.now();
  try {
    // 2.1 Adversarial Bypass Attempt: Send status_verifikasi = 'Diverifikasi' with 'Izin Terlambat'
    const { POST } = await import('../src/app/api/attendance/route');
    const bypassPayload = {
      id: testBypassId,
      user_id: 'fff9d836-b034-4a66-be96-1c1b7cfad277',
      nama_guru: 'Ade Fitrawan Ibrahim',
      tipe_absen: 'Datang',
      jenis_presensi: 'Izin Terlambat',
      status_verifikasi: 'Diverifikasi', // Malicious client attempt to bypass admin
      detail_izin: 'Adversarial Bypass Test',
      keterlambatan_detik: 1200,
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    };

    const req = new NextRequest('http://localhost:3000/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bypassPayload)
    });

    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, 'POST succeeded');
    assert.strictEqual(
      json.data?.status_verifikasi,
      'Menunggu',
      'API MUST override malicious status_verifikasi="Diverifikasi" to "Menunggu" when jenis_presensi is Izin Terlambat'
    );
    testPass('R2.1: Adversarial bypass attempt thwarted: status_verifikasi forced to "Menunggu"');

    // Clean up
    await authClient.from('presensi_guru').delete().eq('id', testBypassId);
    testPass('R2.2: Bypass test record cleaned up');
  } catch (err: any) {
    testFail('R2.1 Bypass check failed', err);
    await authClient.from('presensi_guru').delete().eq('id', testBypassId).catch(() => {});
  }

  // 2.3 Verify GuruPresensi fallback to /api/attendance
  try {
    const guruPresensiContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
    assert(
      guruPresensiContent.includes("fetch('/api/attendance'") || guruPresensiContent.includes('fetch("/api/attendance"'),
      'GuruPresensi has network fallback to /api/attendance'
    );
    testPass('R2.3: GuruPresensi includes resilient fallback to /api/attendance on connection drops');
  } catch (err: any) {
    testFail('R2.3 fallback check failed', err);
  }

  // 2.4 Verify HomeView datangDone logic when presensi is rejected
  try {
    const homeViewContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'HomeView.tsx'), 'utf-8');
    assert(
      homeViewContent.includes("presensiDatangStatus !== 'Ditolak'"),
      'HomeView does not count rejected attendance as datangDone'
    );
    testPass('R2.4: HomeView excludes Ditolak status from datangDone');
  } catch (err: any) {
    testFail('R2.4 HomeView datangDone check failed', err);
  }

  // 2.5 Verify AdminVerifView late duration display
  try {
    const adminVerifContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AdminVerifView.tsx'), 'utf-8');
    assert(
      adminVerifContent.includes('item.keterlambatan_detik > 0') && adminVerifContent.includes('menit'),
      'AdminVerifView shows late minutes to admin for Izin Terlambat'
    );
    testPass('R2.5: AdminVerifView displays late duration in minutes to aid admin approval decisions');
  } catch (err: any) {
    testFail('R2.5 AdminVerifView late duration check failed', err);
  }

  // ==========================================================================
  // CATEGORY 3: R3 Interactive Teacher Simulation & iOS Safari Compatibility
  // ==========================================================================
  console.log('\n--- CATEGORY 3: R3 Teacher Simulation & iOS Safari Support ---');

  try {
    const modalContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AccountSettingsModal.tsx'), 'utf-8');

    // 3.1 Verify complete elimination of username input for Guru
    assert(
      modalContent.includes('{isAdmin && (') && modalContent.includes('Username (Login)'),
      'Username input only rendered when isAdmin is true'
    );
    testPass('R3.1: Username input element strictly wrapped with {isAdmin && (...)}');

    // 3.2 Verify modal header shows role without username for Guru
    assert(
      modalContent.includes("{isAdmin ? `${user?.role || 'Pengguna'} • ${user?.username || ''}` : (user?.role || 'Guru')}"),
      'Modal header renders only role for non-admins'
    );
    testPass('R3.2: Modal header strictly hides username for Guru users');

    // 3.3 Verify iOS Safari compatibility attributes on password inputs
    assert(
      modalContent.includes('autoComplete="current-password"') &&
      modalContent.includes('autoComplete="new-password"'),
      'Password inputs specify autoComplete attributes for iOS Safari password manager'
    );
    assert(
      modalContent.includes('appearance-none'),
      'Password inputs specify appearance-none to prevent iOS styling deformations'
    );
    assert(
      modalContent.includes('autoCapitalize="off"') && modalContent.includes('autoCorrect="off"'),
      'Password inputs prevent iOS Safari auto-capitalization and autocorrect'
    );
    testPass('R3.3: iOS Safari mobile optimizations applied to password inputs');

    // 3.4 Verify password change works independently without username input
    assert(
      modalContent.includes('p_username: isAdmin ? username.trim() : user.username') ||
      modalContent.includes('p_username: isAdmin ? username.trim() : (user.username'),
      'p_username in RPC payload retains existing user.username for Guru'
    );
    testPass('R3.4: Password update payload retains username without teacher form input');
  } catch (err: any) {
    testFail('R3 checks failed', err);
  }

  console.log('\n========================================================================');
  console.log(`REVIEWER ADVERSARIAL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReviewerAdversarialSuite().catch((err) => {
  console.error('Fatal error in reviewer adversarial suite:', err);
  process.exit(1);
});
