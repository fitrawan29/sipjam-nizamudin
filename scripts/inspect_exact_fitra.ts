import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function run() {
  const baseClient = createClient(supabaseUrl, supabaseKey);

  let sessionToken: string | null = null;
  try {
    const { data: loginData } = await baseClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
    }
  } catch (err) {
    console.warn('Login fallback:', err);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });

  console.log('--- PRESENSI_GURU (Exact Fitra) ---');
  const { data: pUpper } = await supabase.from('presensi_guru').select('id, nama_guru, user_id, timestamp').eq('nama_guru', 'FITRA SURYAZANA MAMONTO');
  console.log('presensi_guru (FITRA SURYAZANA MAMONTO):', pUpper);
  const { data: pTitle } = await supabase.from('presensi_guru').select('id, nama_guru, user_id, timestamp').eq('nama_guru', 'Fitra Suryazana Mamonto');
  console.log('presensi_guru (Fitra Suryazana Mamonto):', pTitle);

  console.log('\n--- JURNAL_PEMBELAJARAN (Exact Fitra) ---');
  const { data: jUpper } = await supabase.from('jurnal_pembelajaran').select('id, nama_guru, user_id, timestamp').eq('nama_guru', 'FITRA SURYAZANA MAMONTO');
  console.log('jurnal_pembelajaran (FITRA SURYAZANA MAMONTO):', jUpper);
  const { data: jTitle } = await supabase.from('jurnal_pembelajaran').select('id, nama_guru, user_id, timestamp').eq('nama_guru', 'Fitra Suryazana Mamonto');
  console.log('jurnal_pembelajaran (Fitra Suryazana Mamonto):', jTitle);

  console.log('\n--- LAPORAN_PIKET (kehadiran_guru_piket or guru_pelapor containing Fitra) ---');
  const { data: allPiket } = await supabase.from('laporan_piket').select('id, guru_pelapor, kehadiran_guru_piket, timestamp');
  const piketUpper = allPiket?.filter(p => JSON.stringify(p).includes('FITRA SURYAZANA MAMONTO'));
  console.log('laporan_piket with FITRA SURYAZANA MAMONTO count:', piketUpper?.length);
  console.log(piketUpper);
  const piketTitle = allPiket?.filter(p => JSON.stringify(p).includes('Fitra Suryazana Mamonto'));
  console.log('laporan_piket with Fitra Suryazana Mamonto count:', piketTitle?.length);
  console.log(piketTitle);

  console.log('\n--- DRS. AHMAD DAHLAN, M.PD. CHECK ---');
  const { data: pAhmad } = await supabase.from('presensi_guru').select('*').ilike('nama_guru', '%Ahmad Dahlan%');
  console.log('presensi_guru (Ahmad Dahlan):', pAhmad);

  const { data: uAhmad } = await supabase.from('users').select('*').ilike('nama', '%Ahmad Dahlan%');
  console.log('users (Ahmad Dahlan):', uAhmad);

  const { data: gAhmad } = await supabase.from('data_guru').select('*').ilike('nama_guru', '%Ahmad Dahlan%');
  console.log('data_guru (Ahmad Dahlan):', gAhmad);

  const { data: jAhmad } = await supabase.from('jurnal_pembelajaran').select('*').ilike('nama_guru', '%Ahmad Dahlan%');
  console.log('jurnal_pembelajaran (Ahmad Dahlan):', jAhmad);

  const piketAhmad = allPiket?.filter(p => JSON.stringify(p).toLowerCase().includes('ahmad dahlan'));
  console.log('laporan_piket (Ahmad Dahlan):', piketAhmad);
}

run().catch(console.error);
