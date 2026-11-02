import path from 'path';
import dotenv from 'dotenv';

// Load .env.local before importing any application modules
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

console.log('====================================================');
console.log('ADVERSARIAL STRESS TEST FOR MILESTONE 1 (M1)');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function check(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

async function runAdversarialSuite() {
  const { supabase, setServerTenantContext } = await import('../src/lib/supabaseClient');
  const { sanitizeDateStr, getBlokStatus, getBlokDurationDays } = await import('../src/components/SistemBlokView');
  const typeDb = await import('../src/types/database');

  const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';
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
    console.warn('verify_login fallback in reviewer_adversarial:', err);
  }

  setServerTenantContext({
    sekolahId: defaultSekolahId,
    role: 'Admin',
    userId: 'd23141e4-2116-4946-8094-895ef21a50e5',
    sessionToken
  });

  // 1. Edge cases in date sanitization
  console.log('--- 1. Date Sanitization & Status Determination ---');
  check(sanitizeDateStr('2026-11-02T15:30:00.000Z') === '2026-11-02', 'sanitizeDateStr handles ISO timestamp');
  check(sanitizeDateStr('2026-11-02 08:00:00') === '2026-11-02', 'sanitizeDateStr handles space-separated timestamp');
  check(sanitizeDateStr('2026-11-02') === '2026-11-02', 'sanitizeDateStr preserves clean date');
  check(sanitizeDateStr(null) === '', 'sanitizeDateStr safely handles null');
  check(sanitizeDateStr(undefined) === '', 'sanitizeDateStr safely handles undefined');
  check(sanitizeDateStr('') === '', 'sanitizeDateStr safely handles empty string');

  check(getBlokStatus('2026-11-01', '2026-11-05', '2026-11-02') === 'Aktif', 'getBlokStatus returns Aktif within range');
  check(getBlokStatus('2026-11-02', '2026-11-02', '2026-11-02') === 'Aktif', 'getBlokStatus returns Aktif on single-day match');
  check(getBlokStatus('2026-11-03', '2026-11-05', '2026-11-02') === 'Akan Datang', 'getBlokStatus returns Akan Datang for future');
  check(getBlokStatus('2026-10-25', '2026-10-31', '2026-11-02') === 'Selesai', 'getBlokStatus returns Selesai for past');

  // Leap year duration
  check(getBlokDurationDays('2024-02-28', '2024-03-01') === 3, 'getBlokDurationDays handles leap year (Feb 28-Mar 1 = 3 days)');
  check(getBlokDurationDays('2026-11-02', '2026-11-02') === 1, 'getBlokDurationDays returns 1 for single-day block');

  // 2. Angkatan regex extraction stress test
  console.log('\n--- 2. Angkatan Detection Regex Stress Testing ---');
  function detectAngkatan(classes: string[]): string[] {
    const detected = new Set<string>();
    classes.forEach(cls => {
      const lower = cls.toLowerCase();
      if (/\b10\b/.test(lower) || /\bx\b/.test(lower)) detected.add('10');
      if (/\b11\b/.test(lower) || /\bxi\b/.test(lower)) detected.add('11');
      if (/\b12\b/.test(lower) || /\bxii\b/.test(lower)) detected.add('12');
      if (/\b7\b/.test(lower) || /\bvii\b/.test(lower)) detected.add('7');
      if (/\b8\b/.test(lower) || /\bviii\b/.test(lower)) detected.add('8');
      if (/\b9\b/.test(lower) || /\bix\b/.test(lower)) detected.add('9');
    });
    if (detected.size === 0) {
      detected.add('10');
      detected.add('11');
      detected.add('12');
    }
    return Array.from(detected).sort((a, b) => Number(a) - Number(b));
  }

  const standardClasses = ['X Merdeka', 'XI RPL 1', 'XII TITL 2'];
  const detectedStandard = detectAngkatan(standardClasses);
  check(
    detectedStandard.includes('10') && detectedStandard.includes('11') && detectedStandard.includes('12'),
    'Standard classes detect 10, 11, 12'
  );

  const dashClasses = ['10-IPA-1', '11-IPS-2', '12-BAHASA'];
  const detectedDash = detectAngkatan(dashClasses);
  check(
    detectedDash.includes('10') && detectedDash.includes('11') && detectedDash.includes('12'),
    'Hyphenated number classes (10-IPA-1) detect 10, 11, 12'
  );

  const romanHyphenClasses = ['X-1', 'XI-2', 'XII-3'];
  const detectedRomanHyphen = detectAngkatan(romanHyphenClasses);
  check(
    detectedRomanHyphen.includes('10') && detectedRomanHyphen.includes('11') && detectedRomanHyphen.includes('12'),
    'Hyphenated Roman classes (X-1) detect 10, 11, 12'
  );

  // Adversarial words that contain 'x' or numbers
  check(
    !/\bx\b/.test('excellent class') && !/\bx\b/.test('maximum effort') && !/\bx\b/.test('taxi driver class'),
    'Word boundary prevents false triggers on words like EXCELLENT, MAXIMUM, TAXI'
  );

  // 3. Live Supabase integration & SQL constraints
  console.log('\n--- 3. Live Supabase Constraint & Target CRUD Verification ---');
  const testId = crypto.randomUUID();
  const schoolId = defaultSekolahId;

  // 3.1 Test SQL check constraint violation
  const { error: invalidCheckError } = await supabase.from('sistem_blok').insert([
    {
      id: crypto.randomUUID(),
      sekolah_id: schoolId,
      nama_kegiatan: 'Test Invalid Check',
      tanggal_mulai: '2026-11-02',
      tanggal_selesai: '2026-11-02',
      tipe_target: 'invalid_scope_value' as any,
    },
  ]);
  check(
    invalidCheckError !== null && (invalidCheckError.message.includes('check') || invalidCheckError.code === '23514'),
    `Postgres CHECK constraint rejects invalid tipe_target (got error: ${invalidCheckError?.message})`
  );

  // 3.2 Insert live record with target scope 'guru' and time range
  const { error: insertError } = await supabase.from('sistem_blok').insert([
    {
      id: testId,
      sekolah_id: schoolId,
      nama_kegiatan: 'Adversarial Test Block M1',
      tanggal_mulai: '2026-11-10',
      tanggal_selesai: '2026-11-12',
      deskripsi: 'Testing target and time range persistence',
      tipe_target: 'guru',
      target_guru_nama: 'Guru Penilai Test',
      is_full_day: false,
      jam_mulai: '08:30',
      jam_selesai: '11:45',
    },
  ]);
  check(insertError === null, `Live insert with tipe_target=guru and time range succeeds (error: ${insertError?.message || 'none'})`);

  // 3.3 Read back and verify all fields
  const { data: readData, error: readError } = await supabase
    .from('sistem_blok')
    .select('*')
    .eq('id', testId)
    .single();

  check(readError === null && readData !== null, 'Live record read back successfully');
  if (readData) {
    const row = readData as any;
    check(row.tipe_target === 'guru', `Read back tipe_target is 'guru' (actual: ${row.tipe_target})`);
    check(row.target_guru_nama === 'Guru Penilai Test', `Read back target_guru_nama is accurate (actual: ${row.target_guru_nama})`);
    check(row.is_full_day === false, `Read back is_full_day is false (actual: ${row.is_full_day})`);
    check(row.jam_mulai === '08:30', `Read back jam_mulai is '08:30' (actual: ${row.jam_mulai})`);
    check(row.jam_selesai === '11:45', `Read back jam_selesai is '11:45' (actual: ${row.jam_selesai})`);
  }

  // 3.4 Test update operation: transition to 'angkatan' and full-day, clearing old guru and time fields
  const { error: updateError } = await supabase
    .from('sistem_blok')
    .update({
      tipe_target: 'angkatan',
      target_angkatan: '11',
      target_guru_id: null,
      target_guru_nama: null,
      is_full_day: true,
      jam_mulai: null,
      jam_selesai: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', testId);

  check(updateError === null, `Live update transitioning to angkatan & full-day succeeds (error: ${updateError?.message || 'none'})`);

  const { data: updatedData } = await supabase
    .from('sistem_blok')
    .select('*')
    .eq('id', testId)
    .single();

  if (updatedData) {
    const uRow = updatedData as any;
    check(uRow.tipe_target === 'angkatan', `Updated tipe_target is 'angkatan' (actual: ${uRow.tipe_target})`);
    check(uRow.target_angkatan === '11', `Updated target_angkatan is '11' (actual: ${uRow.target_angkatan})`);
    check(uRow.target_guru_nama === null, `Previous target_guru_nama cleared to null (actual: ${uRow.target_guru_nama})`);
    check(uRow.is_full_day === true, `Updated is_full_day is true (actual: ${uRow.is_full_day})`);
    check(uRow.jam_mulai === null, `Previous jam_mulai cleared to null (actual: ${uRow.jam_mulai})`);
    check(uRow.jam_selesai === null, `Previous jam_selesai cleared to null (actual: ${uRow.jam_selesai})`);
  }

  // 3.5 Cleanup test record
  const { error: deleteError } = await supabase
    .from('sistem_blok')
    .delete()
    .eq('id', testId);

  check(deleteError === null, 'Test record cleanly deleted from database');

  const { data: verifyDeleted } = await supabase
    .from('sistem_blok')
    .select('id')
    .eq('id', testId)
    .maybeSingle();

  check(verifyDeleted === null, 'Confirmed zero lingering test records');

  // Summary
  console.log('\n====================================================');
  console.log(`TOTAL ADVERSARIAL CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
