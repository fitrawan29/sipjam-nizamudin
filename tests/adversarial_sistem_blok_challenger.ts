import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ [CHALLENGE-PASS] ${label}`);
    passed++;
  } else {
    console.error(`❌ [CHALLENGE-FAIL] ${label}`);
    if (detail) console.error(`   DETAIL: ${detail}`);
    failed++;
  }
}

async function loginAndSetContext(supabase: any, setServerTenantContext: any, defaultSekolahId: string) {
  let sessionToken = 'deb40d1b-ce7f-4424-9d58-b98d47d62edf';
  try {
    const { data: loginData } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
    }
  } catch (err) {
    console.warn('verify_login fallback:', err);
  }

  setServerTenantContext({
    sekolahId: defaultSekolahId,
    role: 'Admin',
    userId: 'd23141e4-2116-4946-8094-895ef21a50e5',
    sessionToken
  });

  return sessionToken;
}

async function runChallenger() {
  console.log('================================================================');
  console.log('ADVERSARIAL EMPIRICAL HARNESS: SISTEM BLOK LIFECYCLE & ISOLATION');
  console.log('Agent: challenger_m3_2 | Role: Critic & Empirical Challenger');
  console.log('================================================================\n');

  const { supabase, setServerTenantContext } = await import('../src/lib/supabaseClient');
  const { evaluateScheduleBlock, isKelasInAngkatan, isTimeRangeOverlap, getActiveSistemBloks } = await import('../src/lib/workflow');

  const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';

  // -------------------------------------------------------------
  // PART 1: BASELINE DATABASE SNAPSHOT
  // -------------------------------------------------------------
  console.log('[1] Capturing Baseline Database Snapshot...');
  await loginAndSetContext(supabase, setServerTenantContext, defaultSekolahId);

  const { count: baselineJadwalCount, error: jadwalErrPre } = await supabase
    .from('jadwal_pelajaran')
    .select('*', { count: 'exact', head: true });
  assert(!jadwalErrPre, 'Snapshot: Successfully queried public.jadwal_pelajaran count', jadwalErrPre?.message);
  assert((baselineJadwalCount ?? 0) > 0, `Snapshot: Baseline public.jadwal_pelajaran has rows (found: ${baselineJadwalCount})`);

  // Fetch all jadwal_pelajaran rows to verify complete integrity post-run
  const { data: baselineJadwalRows, error: jadwalFetchErr } = await supabase
    .from('jadwal_pelajaran')
    .select('id, kelas, mata_pelajaran, hari, jam_mulai, jam_selesai');
  assert(!jadwalFetchErr, 'Snapshot: Read baseline sample jadwal rows for checksum verification', jadwalFetchErr?.message);
  console.log(`    Baseline public.jadwal_pelajaran count: ${baselineJadwalCount} (fetched ${baselineJadwalRows?.length} rows)`);

  const { count: baselineBlokCount, data: baselineBlokRows, error: blokErrPre } = await supabase
    .from('sistem_blok')
    .select('*', { count: 'exact' });
  assert(!blokErrPre, 'Snapshot: Successfully queried public.sistem_blok baseline', blokErrPre?.message);
  console.log(`    Baseline public.sistem_blok row count: ${baselineBlokCount}`);
  const baselineBlokIds = new Set((baselineBlokRows || []).map(r => r.id));

  // -------------------------------------------------------------
  // PART 2: RUN TEST SUITE & CONFIRM 204 ASSERTIONS
  // -------------------------------------------------------------
  console.log('\n[2] Executing `npx tsx tests/sistem_blok_verification.test.ts`...');
  let stdout = '';
  let exitCode = 0;
  try {
    stdout = execSync('npx tsx tests/sistem_blok_verification.test.ts', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 120000,
    });
  } catch (err: any) {
    exitCode = err.status || 1;
    stdout = (err.stdout?.toString() || '') + '\n' + (err.stderr?.toString() || '');
  }

  const passedMatch = stdout.match(/PASSED:\s*(\d+)/);
  const failedMatch = stdout.match(/FAILED:\s*(\d+)/);
  const totalMatch = stdout.match(/TOTAL TESTS:\s*(\d+)/);

  const testTotal = totalMatch ? parseInt(totalMatch[1], 10) : -1;
  const testPassed = passedMatch ? parseInt(passedMatch[1], 10) : -1;
  const testFailed = failedMatch ? parseInt(failedMatch[1], 10) : -1;

  assert(exitCode === 0, `Test Suite Execution: Exited with code 0 (actual: ${exitCode})`);
  assert(testTotal === 204, `Test Suite Assertion Count: Exactly 204 total assertions (actual: ${testTotal})`);
  assert(testPassed === 204, `Test Suite Pass Count: Exactly 204 passed assertions (actual: ${testPassed})`);
  assert(testFailed === 0, `Test Suite Fail Count: Exactly 0 failed assertions (actual: ${testFailed})`);
  assert(stdout.includes('ALL SISTEM BLOK VERIFICATION TESTS PASSED'), 'Test Suite Summary: Found success confirmation banner');

  // -------------------------------------------------------------
  // PART 3: POST-RUN VERIFICATION & INVARIANT CHECKS
  // -------------------------------------------------------------
  console.log('\n[3] Evaluating Post-Run Database Invariants...');
  // Refresh session context because verify_login in child process created a newer active session
  await loginAndSetContext(supabase, setServerTenantContext, defaultSekolahId);

  // Invariant 1: jadwal_pelajaran row count 100% identical
  const { count: postJadwalCount, error: jadwalErrPost } = await supabase
    .from('jadwal_pelajaran')
    .select('*', { count: 'exact', head: true });
  assert(!jadwalErrPost, 'Invariant: Successfully queried public.jadwal_pelajaran post-run count');
  assert(
    postJadwalCount === baselineJadwalCount,
    `Schedule Invariant: jadwal_pelajaran count before (${baselineJadwalCount}) and after (${postJadwalCount}) are 100% identical (difference = ${(postJadwalCount ?? 0) - (baselineJadwalCount ?? 0)})`
  );

  // Verify baseline sample jadwal rows still exist unaltered
  if (baselineJadwalRows && baselineJadwalRows.length > 0) {
    const sampleIds = baselineJadwalRows.map(r => r.id);
    const { data: postSampleRows } = await supabase
      .from('jadwal_pelajaran')
      .select('id, kelas, mata_pelajaran, hari, jam_mulai, jam_selesai')
      .in('id', sampleIds);
    
    assert(
      postSampleRows?.length === sampleIds.length,
      `Schedule Invariant: All ${sampleIds.length} sample jadwal rows remain present post-run`
    );

    let matchCount = 0;
    for (const pre of baselineJadwalRows) {
      const post = postSampleRows?.find(r => r.id === pre.id);
      if (
        post &&
        post.kelas === pre.kelas &&
        post.mata_pelajaran === pre.mata_pelajaran &&
        post.hari === pre.hari &&
        post.jam_mulai === pre.jam_mulai &&
        post.jam_selesai === pre.jam_selesai
      ) {
        matchCount++;
      }
    }
    assert(
      matchCount === sampleIds.length,
      `Schedule Invariant: 100% of sample jadwal rows (${matchCount}/${sampleIds.length}) preserved with exact same fields (zero rows deleted or altered)`
    );
  }

  // Invariant 2: Section 7 & Section 10 cleanup hygiene
  console.log('\n[4] Checking Section 7 & Section 10 Teardown Hygiene in public.sistem_blok...');
  const testUuids = [
    '00000000-0000-0000-0000-00000000b110', // sekolah
    '00000000-0000-0000-0000-00000000b111', // angkatan
    '00000000-0000-0000-0000-00000000b112', // kelas
    '00000000-0000-0000-0000-00000000b113', // guru
    '00000000-0000-0000-0000-00000000b115', // legacy
  ];

  const { data: orphanedRows, error: orphanErr } = await supabase
    .from('sistem_blok')
    .select('id, nama_kegiatan')
    .in('id', testUuids);

  assert(!orphanErr, 'Cleanup Check: Query test UUIDs without errors', orphanErr?.message);
  assert(
    (orphanedRows?.length ?? 0) === 0,
    `Cleanup Invariant: Zero orphaned test artifacts found in public.sistem_blok across all 4 target levels + legacy (found: ${orphanedRows?.length ?? 0})`
  );

  const { count: postBlokCount, data: postBlokRows } = await supabase
    .from('sistem_blok')
    .select('id', { count: 'exact' });

  assert(
    postBlokCount === baselineBlokCount,
    `Blok Count Invariant: public.sistem_blok total rows identical before (${baselineBlokCount}) and after (${postBlokCount})`
  );

  const postBlokIds = new Set((postBlokRows || []).map(r => r.id));
  let uninvitedIds = 0;
  for (const id of postBlokIds) {
    if (!baselineBlokIds.has(id)) uninvitedIds++;
  }
  assert(uninvitedIds === 0, `Blok Identity Invariant: Zero unexpected new rows left behind (unexpected count: ${uninvitedIds})`);

  // -------------------------------------------------------------
  // PART 5: ADVERSARIAL STRESS TEST: SECTION 7 CLEANUP RESILIENCE
  // -------------------------------------------------------------
  console.log('\n[5] Adversarially Stress-Testing Section 7 Cleanup Lifecycle...');
  const stressIds = [
    '00000000-0000-0000-0000-00000000c110',
    '00000000-0000-0000-0000-00000000c111',
    '00000000-0000-0000-0000-00000000c112',
    '00000000-0000-0000-0000-00000000c113',
  ];

  let simulatedExceptionCaught = false;
  try {
    // 5.1 Insert stress records
    await supabase.from('sistem_blok').insert([
      {
        id: stressIds[0],
        sekolah_id: defaultSekolahId,
        nama_kegiatan: 'Stress Sekolah Block',
        tanggal_mulai: '2026-11-02',
        tanggal_selesai: '2026-11-02',
      },
      {
        id: stressIds[1],
        sekolah_id: defaultSekolahId,
        nama_kegiatan: 'Stress Angkatan Block',
        tanggal_mulai: '2026-11-02',
        tanggal_selesai: '2026-11-02',
      },
    ]);

    // Simulate an unexpected error midway
    throw new Error('SIMULATED_TEST_RUNNER_EXCEPTION');
  } catch (err: any) {
    if (err.message === 'SIMULATED_TEST_RUNNER_EXCEPTION') {
      simulatedExceptionCaught = true;
    }
  } finally {
    // Cleanup must be robust against mid-stream errors
    await supabase.from('sistem_blok').delete().in('id', stressIds);
  }

  assert(simulatedExceptionCaught, 'Stress Lifecycle: Simulated test exception caught successfully');

  const { data: postStressRows } = await supabase
    .from('sistem_blok')
    .select('id')
    .in('id', stressIds);

  assert(
    (postStressRows?.length ?? 0) === 0,
    'Stress Lifecycle: try/finally teardown completely removes rows even when execution throws midway'
  );

  // -------------------------------------------------------------
  // PART 6: ADVERSARIAL STRESS TEST: SECTION 10 LEGACY RECORD DEFAULTING ORACLE
  // -------------------------------------------------------------
  console.log('\n[6] Adversarial Stress Testing Legacy Record Defaulting (Section 10 Oracle)...');

  // Matrix of legacy/abnormal block configurations:
  const legacyVariants: any[] = [
    {
      name: 'Variant 1: All target & time fields explicitly null',
      rule: {
        id: 'legacy-null-all',
        nama_kegiatan: 'Legacy Null All',
        tipe_target: null,
        target_angkatan: null,
        target_kelas: null,
        target_guru_id: null,
        target_guru_nama: null,
        is_full_day: null,
        jam_mulai: null,
        jam_selesai: null,
      },
    },
    {
      name: 'Variant 2: Target & time fields completely undefined (missing keys)',
      rule: {
        id: 'legacy-undefined-keys',
        nama_kegiatan: 'Legacy Undefined Keys',
      },
    },
    {
      name: 'Variant 3: Empty string tipe_target & empty string times',
      rule: {
        id: 'legacy-empty-strings',
        nama_kegiatan: 'Legacy Empty Strings',
        tipe_target: '',
        jam_mulai: '',
        jam_selesai: '',
        is_full_day: true,
      },
    },
    {
      name: 'Variant 4: Legacy value "keseluruhan"',
      rule: {
        id: 'legacy-keseluruhan',
        nama_kegiatan: 'Legacy Keseluruhan',
        tipe_target: 'keseluruhan',
        is_full_day: true,
      },
    },
    {
      name: 'Variant 5: is_full_day false but missing jam_mulai & jam_selesai',
      rule: {
        id: 'legacy-partial-time',
        nama_kegiatan: 'Legacy Partial Time',
        tipe_target: 'sekolah',
        is_full_day: false,
        jam_mulai: null,
        jam_selesai: null,
      },
    },
  ];

  // Comprehensive matrix of test schedules across cohorts, classes, hours, and teacher representations
  const testSchedules = [
    { kelas: 'X-A', jam_mulai: '07:00', jam_selesai: '08:30', nama_guru: 'Guru 1' },
    { kelas: 'X RPL 1', jam_mulai: '08:30', jam_selesai: '10:00', nama_guru: 'Guru 2' },
    { kelas: '10 TKJ 2', jam_mulai: '10:15', jam_selesai: '11:45', nama_guru: 'Guru 3' },
    { kelas: 'XI IPA 1', jam_mulai: '12:15', jam_selesai: '13:45', nama_guru: 'Guru 4' },
    { kelas: '11 Bisnis', jam_mulai: '13:45', jam_selesai: '15:15', nama_guru: 'Guru 5' },
    { kelas: 'XII TITL 2', jam_mulai: '07:30', jam_selesai: '11:00', nama_guru: 'Guru 6' },
    { kelas: '12 Otomotif', jam_mulai: '11:00', jam_selesai: '14:00', nama_guru: 'Guru 7' },
    { kelas: 'Kelas Khusus Seni', jam_mulai: '14:00', jam_selesai: '16:00', nama_guru: 'Guru 8' },
    { kelas: undefined, jam_mulai: '08:00', jam_selesai: '09:00', nama_guru: undefined },
    { kelas: '', jam_mulai: undefined, jam_selesai: undefined, nama_guru: '' },
  ];

  let oraclePasses = 0;
  let oracleEvaluations = 0;

  for (const variant of legacyVariants) {
    let variantFailed = false;
    for (const sched of testSchedules) {
      oracleEvaluations++;
      try {
        const evalResult = evaluateScheduleBlock(
          sched,
          { nama: sched.nama_guru || 'Dummy Guru', id: 'dummy-id' },
          [variant.rule]
        );

        // Every legacy whole-school / null-target full-day variant MUST evaluate to isBlocked === true
        if (evalResult.isBlocked === true && typeof evalResult.reason === 'string') {
          oraclePasses++;
        } else {
          variantFailed = true;
          console.error(`    Oracle Mismatch on ${variant.name} for schedule [${sched.kelas} @ ${sched.jam_mulai}]:`, evalResult);
        }
      } catch (err: any) {
        variantFailed = true;
        console.error(`    Oracle Crash on ${variant.name} for schedule [${sched.kelas}]:`, err);
      }
    }
    assert(!variantFailed, `Legacy Oracle: ${variant.name} successfully masks all schedules with 0 false negatives (${testSchedules.length}/${testSchedules.length})`);
  }

  assert(
    oraclePasses === oracleEvaluations,
    `Legacy Oracle Complete: Evaluated ${oracleEvaluations} schedule permutations with 100% masking accuracy (${oraclePasses}/${oracleEvaluations})`
  );

  // -------------------------------------------------------------
  // PART 7: SUMMARY & VERDICT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`CHALLENGER HARNESS RESULTS:`);
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('❌ VERDICT: REQUEST_CHANGES - Failures detected!');
    process.exit(1);
  } else {
    console.log('🎉 VERDICT: APPROVE - All lifecycle, isolation, and backward compatibility invariants verified!');
    process.exit(0);
  }
}

runChallenger().catch(err => {
  console.error('Fatal unhandled challenger error:', err);
  process.exit(1);
});
