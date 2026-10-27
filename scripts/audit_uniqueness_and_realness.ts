import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function audit() {
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

  const dummyRegex = /\b(test|testing|tester|dummy|fiktif|fake|sample|percobaan|uji coba|contoh|foo|bar|asdf)\b/i;
  
  // 1. users
  const { data: users } = await supabase.from('users').select('id, username, nama, role');
  const dummyUsers = users?.filter(u => dummyRegex.test(u.username) || dummyRegex.test(u.nama)) || [];
  console.log(`Users with dummy identity: ${dummyUsers.length}`, dummyUsers);

  // 2. data_guru
  const { data: guru } = await supabase.from('data_guru').select('id, nip, nama_guru');
  const dummyGuru = guru?.filter(g => dummyRegex.test(g.nama_guru) || (g.nip !== '-' && dummyRegex.test(g.nip))) || [];
  console.log(`Data Guru with dummy identity: ${dummyGuru.length}`, dummyGuru);

  // 3. data_siswa
  const { data: siswa } = await supabase.from('data_siswa').select('id, nama_siswa, kelas');
  const dummySiswa = siswa?.filter(s => dummyRegex.test(s.nama_siswa)) || [];
  console.log(`Data Siswa with dummy identity: ${dummySiswa.length}`, dummySiswa);

  // 4. presensi_guru
  const { data: presensi } = await supabase.from('presensi_guru').select('id, nama_guru');
  const dummyPresensi = presensi?.filter(p => dummyRegex.test(p.nama_guru)) || [];
  console.log(`Presensi Guru with dummy identity: ${dummyPresensi.length}`, dummyPresensi);

  // 5. jurnal_pembelajaran
  const { data: jurnal } = await supabase.from('jurnal_pembelajaran').select('id, nama_guru');
  const dummyJurnal = jurnal?.filter(j => dummyRegex.test(j.nama_guru)) || [];
  console.log(`Jurnal Pembelajaran with dummy identity: ${dummyJurnal.length}`, dummyJurnal);

  // 6. laporan_piket
  const { data: piket } = await supabase.from('laporan_piket').select('id, guru_pelapor');
  const dummyPiket = piket?.filter(p => dummyRegex.test(p.guru_pelapor || '')) || [];
  console.log(`Laporan Piket with dummy identity: ${dummyPiket.length}`, dummyPiket);
}

audit().catch(console.error);
