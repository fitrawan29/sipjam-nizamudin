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
    console.warn('Superadmin auth warning:', err);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });

  const { data: users, error: errUsers } = await supabase.from('users').select('*');
  if (errUsers) console.error('errUsers', errUsers);
  console.log(`=== USERS (${users?.length || 0}) ===`);
  users?.forEach(u => console.log(`[${u.id}] username: "${u.username}", nama: "${u.nama}", role: "${u.role}"`));

  const { data: guru, error: errGuru } = await supabase.from('data_guru').select('*');
  if (errGuru) console.error('errGuru', errGuru);
  console.log(`\n=== DATA_GURU (${guru?.length || 0}) ===`);
  guru?.forEach(g => console.log(`[${g.id}] nip: "${g.nip}", nama: "${g.nama_guru}", status: "${g.status}", user_id: "${g.user_id}"`));

  const { data: siswa, error: errSiswa } = await supabase.from('data_siswa').select('*');
  console.log(`\n=== DATA_SISWA (${siswa?.length || 0}) ===`);
  siswa?.forEach(s => console.log(`[${s.id}] nis: "${s.nis}", nama: "${s.nama_siswa}", kelas: "${s.kelas}"`));
}

run();
