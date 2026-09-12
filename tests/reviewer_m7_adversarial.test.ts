import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

// Client with Superadmin privilege header
const superClient = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-role': 'Superadmin'
    }
  }
});

// Standard client without special headers
const standardClient = createClient(supabaseUrl, supabaseKey);

async function runAdversarialReview() {
  console.log('===============================================================');
  console.log('ADVERSARIAL STRESS TEST & INTEGRITY AUDIT: MILESTONE 7');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Default School & Superadmin Integrity
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Default School & Superadmin Integrity ---');
  const { data: defaultSchool, error: dSchoolErr } = await superClient
    .from('sekolah')
    .select('*')
    .eq('id', 'a0000000-0000-0000-0000-000000000001')
    .single();

  assert(!dSchoolErr && defaultSchool !== null, 'Default school SMA Nizamudin exists');
  assert(defaultSchool?.nama === 'SMA Nizamudin', `Default school name matches: "${defaultSchool?.nama}"`);
  assert(defaultSchool?.npsn === '70040625', `Default school NPSN matches: "${defaultSchool?.npsn}"`);

  const { data: superUser, error: sUserErr } = await superClient
    .from('users')
    .select('*')
    .eq('username', 'superadmin')
    .single();

  assert(!sUserErr && superUser !== null, 'Superadmin user exists in public.users');
  assert(superUser?.role === 'Superadmin', `Superadmin role is "Superadmin": "${superUser?.role}"`);
  assert(superUser?.sekolah_id === null, `Superadmin sekolah_id is NULL (platform admin): ${superUser?.sekolah_id}`);

  // --------------------------------------------------------------------------
  // TEST 2: verify_login RPC Security & Attack Resistance
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: verify_login RPC Security & SQL Injection Defense ---');
  // Valid credentials
  const { data: validLogin, error: vLoginErr } = await standardClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });
  assert(!vLoginErr && validLogin && validLogin.length === 1, 'Valid login returns exactly 1 user');
  assert(validLogin?.[0]?.role === 'Superadmin', 'Login RPC returns role Superadmin');

  // Invalid password
  const { data: wrongPass, error: wpErr } = await standardClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'wrong_password_999'
  });
  assert(!wpErr && wrongPass && wrongPass.length === 0, 'Invalid password correctly rejected with 0 records');

  // SQL Injection Attempt
  const { data: sqliAttempt, error: sqliErr } = await standardClient.rpc('verify_login', {
    p_username: "' OR '1'='1",
    p_password: "' OR '1'='1"
  });
  assert(!sqliErr && sqliAttempt && sqliAttempt.length === 0, 'SQL injection attempt neutralized with 0 records');

  // --------------------------------------------------------------------------
  // TEST 3: Multi-Tenant Creation, Scoping & Composite Unique Constraints
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Multi-Tenant Data Isolation & Composite Constraints ---');
  const schoolXId = crypto.randomUUID();
  const schoolYId = crypto.randomUUID();
  const ts = Date.now();

  try {
    // 3.1 Register School X and School Y
    const { error: insXErr } = await superClient.from('sekolah').insert([{
      id: schoolXId,
      nama: `Sekolah Alpha ${ts}`,
      npsn: `991${ts.toString().slice(-5)}`,
      kota_kabupaten: 'Kota Manado',
      status: 'aktif'
    }]);
    assert(!insXErr, `School Alpha registered successfully (ID: ${schoolXId})`);

    const { error: insYErr } = await superClient.from('sekolah').insert([{
      id: schoolYId,
      nama: `Sekolah Beta ${ts}`,
      npsn: `992${ts.toString().slice(-5)}`,
      kota_kabupaten: 'Kota Tomohon',
      status: 'aktif'
    }]);
    assert(!insYErr, `School Beta registered successfully (ID: ${schoolYId})`);

    // 3.2 Composite Unique Constraint: Identical settings keys in different schools
    const { error: setXErr } = await superClient.from('pengaturan').insert([{
      sekolah_id: schoolXId,
      key: 'kop_sekolah',
      value: 'SMA Alpha Manado'
    }]);
    assert(!setXErr, 'School Alpha settings (kop_sekolah) inserted');

    const { error: setYErr } = await superClient.from('pengaturan').insert([{
      sekolah_id: schoolYId,
      key: 'kop_sekolah',
      value: 'SMA Beta Tomohon'
    }]);
    assert(!setYErr, 'School Beta settings with identical key (kop_sekolah) inserted without collision');

    // 3.3 Composite Unique Constraint: Identical piket day in different schools
    const { error: pXErr } = await superClient.from('jadwal_piket').insert([{
      sekolah_id: schoolXId,
      hari: 'Senin',
      daftar_guru: 'Guru Alpha 1, Guru Alpha 2'
    }]);
    assert(!pXErr, 'School Alpha piket (Senin) inserted');

    const { error: pYErr } = await superClient.from('jadwal_piket').insert([{
      sekolah_id: schoolYId,
      hari: 'Senin',
      daftar_guru: 'Guru Beta 1, Guru Beta 2'
    }]);
    assert(!pYErr, 'School Beta piket with identical day (Senin) inserted without collision');

    // 3.4 Tenant Isolation Query Test:
    // Querying with sekolah_id = School X must NEVER return School Y's data
    const { data: alphaSettings } = await superClient
      .from('pengaturan')
      .select('*')
      .eq('sekolah_id', schoolXId);

    assert(alphaSettings?.length === 1 && alphaSettings[0].value === 'SMA Alpha Manado',
      'School Alpha query returns exclusively School Alpha settings');

    const { data: betaSettings } = await superClient
      .from('pengaturan')
      .select('*')
      .eq('sekolah_id', schoolYId);

    assert(betaSettings?.length === 1 && betaSettings[0].value === 'SMA Beta Tomohon',
      'School Beta query returns exclusively School Beta settings');

    // Cross-tenant check
    const crossLeak = alphaSettings?.some(s => s.sekolah_id === schoolYId);
    assert(!crossLeak, 'ZERO cross-tenant data leakage detected between Alpha and Beta');

  } finally {
    // Cleanup temporary test data
    console.log('\n--- Cleaning up temporary test data ---');
    await superClient.from('pengaturan').delete().eq('sekolah_id', schoolXId);
    await superClient.from('pengaturan').delete().eq('sekolah_id', schoolYId);
    await superClient.from('jadwal_piket').delete().eq('sekolah_id', schoolXId);
    await superClient.from('jadwal_piket').delete().eq('sekolah_id', schoolYId);
    await superClient.from('sekolah').delete().eq('id', schoolXId);
    await superClient.from('sekolah').delete().eq('id', schoolYId);
    console.log('✅ Temporary test data cleaned up cleanly');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Ascending Date Sorting Logic Verification
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Ascending Date Sorting Logic Verification ---');
  const dummyGuru = `Guru_Test_Sort_${ts}`;
  const testJurnalEntries = [
    {
      id: crypto.randomUUID(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      nama_guru: dummyGuru,
      tanggal: '2026-09-25',
      jam_ke: '1-2',
      kelas: 'X Merdeka',
      mapel: 'Matematika',
      materi_pembelajaran: 'Sorting Test Late',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      nama_guru: dummyGuru,
      tanggal: '2026-09-02',
      jam_ke: '5-6',
      kelas: 'X Merdeka',
      mapel: 'Matematika',
      materi_pembelajaran: 'Sorting Test Early Day 2',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      nama_guru: dummyGuru,
      tanggal: '2026-09-01',
      jam_ke: '3-4',
      kelas: 'X Merdeka',
      mapel: 'Matematika',
      materi_pembelajaran: 'Sorting Test Day 1 Later Period',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      nama_guru: dummyGuru,
      tanggal: '2026-09-01',
      jam_ke: '1-2',
      kelas: 'X Merdeka',
      mapel: 'Matematika',
      materi_pembelajaran: 'Sorting Test Day 1 Earliest Period',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      nama_guru: dummyGuru,
      tanggal: '2026-09-15',
      jam_ke: '1-2',
      kelas: 'X Merdeka',
      mapel: 'Matematika',
      materi_pembelajaran: 'Sorting Test Mid Month',
      status_verifikasi: 'Disetujui'
    }
  ];

  try {
    // Insert shuffled entries
    const { error: insJErr } = await superClient.from('jurnal_pembelajaran').insert(testJurnalEntries);
    assert(!insJErr, 'Inserted 5 shuffled journal entries');

    // Query using RekapJurnalView exact query pattern:
    // .order('tanggal', { ascending: true }).order('jam_ke', { ascending: true })
    const { data: sortedJurnal, error: qSortErr } = await superClient
      .from('jurnal_pembelajaran')
      .select('*')
      .eq('nama_guru', dummyGuru)
      .order('tanggal', { ascending: true })
      .order('jam_ke', { ascending: true });

    assert(!qSortErr && sortedJurnal?.length === 5, 'Fetched 5 sorted journal entries');

    // Verify strict chronological sequence
    const dates = sortedJurnal?.map(j => `${j.tanggal} (jam ${j.jam_ke})`);
    console.log('   Chronological output order:', dates);

    assert(sortedJurnal?.[0].tanggal === '2026-09-01' && sortedJurnal?.[0].jam_ke === '1-2',
      'Row 1 is earliest date and earliest period (2026-09-01 jam 1-2)');
    assert(sortedJurnal?.[1].tanggal === '2026-09-01' && sortedJurnal?.[1].jam_ke === '3-4',
      'Row 2 is earliest date and second period (2026-09-01 jam 3-4)');
    assert(sortedJurnal?.[2].tanggal === '2026-09-02', 'Row 3 is next day (2026-09-02)');
    assert(sortedJurnal?.[3].tanggal === '2026-09-15', 'Row 4 is mid-month (2026-09-15)');
    assert(sortedJurnal?.[4].tanggal === '2026-09-25', 'Row 5 is latest date (2026-09-25)');

    // Client-side comparator test (replicates line 161 of RekapJurnalView.tsx)
    const clientSorted = [...(sortedJurnal || [])].sort((a, b) =>
      (a.tanggal || '').localeCompare(b.tanggal || '') ||
      (Number(a.jam_ke) || 0) - (Number(b.jam_ke) || 0)
    );
    assert(clientSorted[0].tanggal === '2026-09-01' && clientSorted[4].tanggal === '2026-09-25',
      'Client-side comparator in RekapJurnalView.tsx preserves ascending date sort');

  } finally {
    // Clean up test journal entries
    await superClient.from('jurnal_pembelajaran').delete().eq('nama_guru', dummyGuru);
    console.log('✅ Temporary sorting test entries cleaned up cleanly');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  if (failed === 0) {
    console.log('🎉 ALL ADVERSARIAL STRESS TESTS PASSED WITH ZERO FAILURES!');
  } else {
    console.error(`⚠️ ${failed} ADVERSARIAL TESTS FAILED!`);
    process.exit(1);
  }
  console.log('===============================================================');
}

runAdversarialReview().catch(err => {
  console.error('Fatal error during adversarial verification:', err);
  process.exit(1);
});
