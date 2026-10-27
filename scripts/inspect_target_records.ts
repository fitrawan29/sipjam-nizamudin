import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function run() {
  const baseClient = createClient(supabaseUrl, supabaseKey);

  // Authenticate as superadmin
  let sessionToken: string | null = null;
  try {
    const { data: loginData } = await baseClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
      console.log('Obtained superadmin session token');
    }
  } catch (err) {
    console.warn('Superadmin login fallback:', err);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });

  console.log('\n--- 1. USERS (Fitra) ---');
  const { data: usersFitra } = await supabase
    .from('users')
    .select('id, username, nama, role, sekolah_id')
    .or('username.ilike.%Fitra%,nama.ilike.%Fitra%');
  console.log(JSON.stringify(usersFitra, null, 2));

  console.log('\n--- 2. DATA_GURU (Fitra) ---');
  const { data: guruFitra } = await supabase
    .from('data_guru')
    .select('id, user_id, nip, nama_guru, mata_pelajaran, sekolah_id')
    .or('nip.ilike.%Fitra%,nama_guru.ilike.%Fitra%');
  console.log(JSON.stringify(guruFitra, null, 2));

  console.log('\n--- 3. PRESENSI_GURU (Fitra) ---');
  const { data: presensiFitra, error: errPresensi } = await supabase
    .from('presensi_guru')
    .select('*')
    .ilike('nama_guru', '%Fitra%');
  if (errPresensi) console.error('Error presensi_guru:', errPresensi);
  console.log(`Presensi Fitra count: ${presensiFitra?.length}`);
  console.log(JSON.stringify(presensiFitra, null, 2));

  console.log('\n--- 4. JURNAL_PEMBELAJARAN (Fitra) ---');
  const { data: jurnalFitra, error: errJurnal } = await supabase
    .from('jurnal_pembelajaran')
    .select('*')
    .ilike('nama_guru', '%Fitra%');
  if (errJurnal) console.error('Error jurnal_pembelajaran:', errJurnal);
  console.log(`Jurnal Fitra count: ${jurnalFitra?.length}`);
  console.log(JSON.stringify(jurnalFitra, null, 2));

  console.log('\n--- 5. LAPORAN_PIKET (Fitra) ---');
  const { data: piketFitra, error: errPiket } = await supabase
    .from('laporan_piket')
    .select('*');
  if (errPiket) console.error('Error laporan_piket:', errPiket);
  const matchingPiket = piketFitra?.filter(p => JSON.stringify(p).includes('FITRA') || JSON.stringify(p).includes('Fitra'));
  console.log(`Piket Fitra matching count: ${matchingPiket?.length}`);
  console.log(JSON.stringify(matchingPiket, null, 2));

  console.log('\n========================================');
  console.log('--- 6. Drs. Ahmad Dahlan, M.Pd. SEARCH ---');
  console.log('========================================');

  const tables = ['users', 'data_guru', 'presensi_guru', 'jurnal_pembelajaran', 'laporan_piket', 'data_siswa'];
  for (const table of tables) {
    let col = 'nama';
    if (table === 'data_guru' || table === 'presensi_guru' || table === 'jurnal_pembelajaran') col = 'nama_guru';
    if (table === 'laporan_piket') col = 'guru_piket';
    if (table === 'data_siswa') col = 'nama_siswa';

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .ilike(col, '%Ahmad Dahlan%');
    console.log(`Table ${table} (${col} ilike %Ahmad Dahlan%): count = ${data?.length || 0}`);
    if (data && data.length > 0) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  // Also check laporan_piket laporan_ketidakhadiran and catatan for Ahmad Dahlan
  const { data: piketKetidakhadiran } = await supabase
    .from('laporan_piket')
    .select('id, tanggal, guru_piket, laporan_ketidakhadiran')
    .ilike('laporan_ketidakhadiran', '%Ahmad Dahlan%');
  console.log(`Table laporan_piket (laporan_ketidakhadiran ilike %Ahmad Dahlan%): count = ${piketKetidakhadiran?.length || 0}`);
  if (piketKetidakhadiran && piketKetidakhadiran.length > 0) {
    console.log(JSON.stringify(piketKetidakhadiran, null, 2));
  }

  // Check specific ID e1144f72-2ec4-43f2-aebb-10a59063a906 in presensi_guru
  console.log('\n--- Specific ID e1144f72-2ec4-43f2-aebb-10a59063a906 in presensi_guru ---');
  const { data: specificRecord, error: specErr } = await supabase
    .from('presensi_guru')
    .select('*')
    .eq('id', 'e1144f72-2ec4-43f2-aebb-10a59063a906');
  console.log('Specific presensi record:', JSON.stringify(specificRecord, null, 2));
}

run().catch(console.error);
