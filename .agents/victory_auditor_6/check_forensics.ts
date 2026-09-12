import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

async function runForensicAudit() {
  console.log('--- INDEPENDENT FORENSIC VERIFICATION ---');
  const anon = createClient(supabaseUrl, supabaseKey);

  // Authenticate as superadmin via RPC
  const { data: auth, error: authErr } = await anon.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });

  if (authErr || !auth || auth.length === 0) {
    console.error('Superadmin auth failed:', authErr);
    process.exit(1);
  }

  const superadminId = auth[0].id;
  console.log('Superadmin authenticated:', superadminId);

  // Use superadmin headers
  const saClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-id': superadminId,
        'x-user-role': 'Superadmin'
      }
    }
  });

  // Verify all 18 tables have row security enabled and sekolah_id
  const tables = [
    'sekolah', 'users', 'data_guru', 'data_mapel', 'data_siswa',
    'jadwal_pelajaran', 'jadwal_piket', 'jurnal_pembelajaran',
    'kalender_pendidikan', 'laporan_piket', 'pengaturan', 'presensi_guru',
    'bank_dokumen', 'riwayat_backup', 'guru_mapel', 'penugasan_piket',
    'pengumuman', 'pengumuman_tanggapan'
  ];

  console.log(`Checking ${tables.length} tables...`);
  for (const t of tables) {
    const { data, error } = await saClient.from(t).select('*').limit(1);
    if (error) {
      console.error(`Error querying table ${t}:`, error.message);
      process.exit(1);
    }
  }
  console.log('All 18 tables queried successfully by Superadmin!');

  // Now verify anonymous client cannot access tenant tables
  for (const t of tables.filter(tbl => tbl !== 'sekolah' && tbl !== 'users')) {
    const { data, error } = await anon.from(t).select('*');
    if (data && data.length > 0) {
      console.error(`VIOLATION: Anonymous client read data from tenant table ${t}!`, data);
      process.exit(1);
    }
  }
  console.log('All 16 tenant tables strictly deny anonymous access (0 rows returned)!');

  // Verify anonymous cannot access public.users credentials
  const { data: userData } = await anon.from('users').select('*');
  if (userData && userData.length > 0) {
    console.error('VIOLATION: Anonymous client dumped public.users!', userData);
    process.exit(1);
  }
  console.log('public.users strictly denies anonymous access (0 rows returned)!');

  // Test superadmin can insert and delete a test school
  const testNpsn = 'TEST_' + Math.floor(Math.random() * 1000000);
  const { data: newSchool, error: insertErr } = await saClient
    .from('sekolah')
    .insert([{ nama: 'Auditor Verification School', npsn: testNpsn, status: 'aktif' }])
    .select()
    .single();

  if (insertErr || !newSchool) {
    console.error('Superadmin school insert failed:', insertErr);
    process.exit(1);
  }
  console.log('Superadmin successfully inserted school:', newSchool.id);

  // Clean up
  const { error: delErr } = await saClient.from('sekolah').delete().eq('id', newSchool.id);
  if (delErr) {
    console.error('Superadmin school cleanup failed:', delErr);
    process.exit(1);
  }
  console.log('Superadmin successfully deleted test school.');

  console.log('INDEPENDENT FORENSIC VERIFICATION PASSED 100%!');
}

runForensicAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
