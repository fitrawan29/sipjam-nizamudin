import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function getSuperadminClient() {
  const baseClient = createClient(supabaseUrl, supabaseKey);
  const { data: loginData } = await baseClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'SipjamSuperAdmin2026!'
  });
  const sessionToken = loginData?.[0]?.session_token;

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });
}

async function main() {
  console.log('========================================================================');
  console.log('PEMBERSIHAN DATA JADWAL KELIRU & VERIFIKASI KEUTUHAN DATA MASTER');
  console.log('========================================================================\n');

  const supabase = await getSuperadminClient();

  // 1. RECORD SNAPSHOT OF MASTER DATA BEFORE CLEANUP
  console.log('--- Step 1: Pre-cleanup Master Data Snapshot ---');
  const { data: siswaBefore } = await supabase.from('data_siswa').select('id, nama_siswa, kelas').order('id');
  const { data: guruBefore } = await supabase.from('data_guru').select('id, nama_guru, nip').order('id');
  const { data: mapelBefore } = await supabase.from('data_mapel').select('id, nama_mata_pelajaran').order('id');
  const { data: jadwalBefore } = await supabase.from('jadwal_pelajaran').select('id, hari, nama_guru, mata_pelajaran, kelas').order('id');

  console.log(`Pre-cleanup counts:`);
  console.log(`  data_siswa       : ${siswaBefore?.length} rows`);
  console.log(`  data_guru        : ${guruBefore?.length} rows`);
  console.log(`  data_mapel       : ${mapelBefore?.length} rows`);
  console.log(`  jadwal_pelajaran : ${jadwalBefore?.length} rows`);

  const masterJadwalBefore = (jadwalBefore || []).filter(j => j.id !== 'c0000000-0000-0000-0000-000000000001');
  console.log(`  master jadwal rows (uploaded CSV rows): ${masterJadwalBefore.length}`);

  const erroneousBefore = (jadwalBefore || []).filter(j => 
    j.id === 'c0000000-0000-0000-0000-000000000001' ||
    (j.mata_pelajaran || '').toLowerCase().includes('teknik') ||
    (j.mata_pelajaran || '').toLowerCase().includes('teknologi informasi')
  );
  console.log(`  erroneous schedule rows found: ${erroneousBefore.length}`);
  erroneousBefore.forEach(r => console.log('    ->', JSON.stringify(r)));

  // 2. CLEAN UP ERRONEOUS SCHEDULE ENTRY
  console.log('\n--- Step 2: Clean Up Erroneous Schedule Entry ---');
  if (erroneousBefore.length > 0) {
    for (const errRow of erroneousBefore) {
      const { data: delData, error: delErr } = await supabase
        .from('jadwal_pelajaran')
        .delete()
        .eq('id', errRow.id)
        .select();
      if (delErr) {
        console.error(`Failed to delete erroneous row ${errRow.id}:`, delErr);
      } else {
        console.log(`✅ Successfully deleted erroneous row ${errRow.id}:`, delData);
      }
    }
  } else {
    console.log('No erroneous schedule entries to delete.');
  }

  // 3. POST-CLEANUP VERIFICATION
  console.log('\n--- Step 3: Post-cleanup Verification ---');
  const { data: siswaAfter } = await supabase.from('data_siswa').select('id, nama_siswa, kelas').order('id');
  const { data: guruAfter } = await supabase.from('data_guru').select('id, nama_guru, nip').order('id');
  const { data: mapelAfter } = await supabase.from('data_mapel').select('id, nama_mata_pelajaran').order('id');
  const { data: jadwalAfter } = await supabase.from('jadwal_pelajaran').select('id, hari, nama_guru, mata_pelajaran, kelas').order('id');

  console.log(`Post-cleanup counts:`);
  console.log(`  data_siswa       : ${siswaAfter?.length} rows`);
  console.log(`  data_guru        : ${guruAfter?.length} rows`);
  console.log(`  data_mapel       : ${mapelAfter?.length} rows`);
  console.log(`  jadwal_pelajaran : ${jadwalAfter?.length} rows`);

  // Verify no erroneous rows remain
  const erroneousAfter = (jadwalAfter || []).filter(j => 
    (j.mata_pelajaran || '').toLowerCase().includes('teknik') ||
    (j.mata_pelajaran || '').toLowerCase().includes('teknologi informasi')
  );
  console.log(`Erroneous schedule rows after cleanup: ${erroneousAfter.length} (Expected: 0)`);

  // Verify valid subject "Informatika" exists
  const inforRows = (jadwalAfter || []).filter(j => (j.mata_pelajaran || '').toLowerCase() === 'informatika');
  console.log(`Valid "Informatika" schedule rows: ${inforRows.length} (Expected: >= 1)`);
  inforRows.forEach(r => console.log('  ->', JSON.stringify(r)));

  // Verify master data integrity (100% match)
  const siswaDiff = JSON.stringify(siswaBefore) === JSON.stringify(siswaAfter);
  const guruDiff = JSON.stringify(guruBefore) === JSON.stringify(guruAfter);
  const mapelDiff = JSON.stringify(mapelBefore) === JSON.stringify(mapelAfter);
  const masterJadwalAfter = (jadwalAfter || []).filter(j => j.id !== 'c0000000-0000-0000-0000-000000000001');
  const masterJadwalDiff = JSON.stringify(masterJadwalBefore) === JSON.stringify(masterJadwalAfter);

  console.log(`Master Data Integrity:`);
  console.log(`  data_siswa 100% unchanged       : ${siswaDiff ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  data_guru 100% unchanged        : ${guruDiff ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  data_mapel 100% unchanged       : ${mapelDiff ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  master_jadwal 100% unchanged    : ${masterJadwalDiff ? '✅ PASS' : '❌ FAIL'}`);

  if (!siswaDiff || !guruDiff || !mapelDiff || !masterJadwalDiff || erroneousAfter.length > 0) {
    console.error('❌ Verification failed!');
    process.exit(1);
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL CLEANUP AND INTEGRITY CHECKS PASSED SUCCESSFULLY!');
  console.log('========================================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
