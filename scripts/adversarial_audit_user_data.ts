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

  console.log('--- 1. AUDITING ALL KNOWN TABLES ---');
  const tables = [
    'users',
    'data_guru',
    'presensi_guru',
    'jurnal_pembelajaran',
    'laporan_piket',
    'jadwal_piket',
    'jadwal_pelajaran',
    'data_siswa',
    'presensi_siswa',
    'wali_kelas',
    'sekolah',
    'sekolah_registry',
    'tahun_ajaran',
    'superadmin_audit_logs'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.log(`[${table}] Query error or table not found:`, error.message);
        continue;
      }
      const raw = JSON.stringify(data || []);
      const upperFitra = (raw.match(/FITRA SURYAZANA MAMONTO/g) || []).length;
      const ahmadDahlan = (raw.match(/Ahmad Dahlan/gi) || []).length;
      console.log(`[${table}] Total rows: ${data?.length || 0} | 'FITRA SURYAZANA MAMONTO': ${upperFitra} | 'Ahmad Dahlan': ${ahmadDahlan}`);
    } catch (e: any) {
      console.error(`[${table}] Exception:`, e.message);
    }
  }

  const { data: jadwalPiketData } = await supabase.from('jadwal_piket').select('*');
  console.log('\n--- JADWAL PIKET ROWS ---');
  console.log(jadwalPiketData);

  console.log('\n--- 2. DETAILED FITRA CHECK ---');
  const { data: usersFitra } = await supabase.from('users').select('*').ilike('username', '%fitra%');
  console.log('users for username ~ fitra:', usersFitra);

  const { data: guruFitra } = await supabase.from('data_guru').select('*').ilike('nip', '%fitra%');
  console.log('data_guru for nip ~ fitra:', guruFitra);

  const { data: presFitra, error: errPres } = await supabase.from('presensi_guru').select('id, timestamp, nama_guru, jenis_presensi').ilike('nama_guru', '%fitra%');
  if (errPres) console.error('presFitra error:', errPres);
  console.log(`presensi_guru for nama_guru ~ fitra (${presFitra?.length} rows):`, presFitra?.slice(0, 5));

  const { data: jurFitra, error: errJur } = await supabase.from('jurnal_pembelajaran').select('id, tanggal, nama_guru, mapel').ilike('nama_guru', '%fitra%');
  if (errJur) console.error('jurFitra error:', errJur);
  console.log(`jurnal_pembelajaran for nama_guru ~ fitra (${jurFitra?.length} rows):`, jurFitra?.slice(0, 5));

  const { data: jPelajaranFitra, error: errJP } = await supabase.from('jadwal_pelajaran').select('*').ilike('nama_guru', '%fitra%');
  if (errJP) console.error('jPelajaranFitra error:', errJP);
  console.log(`jadwal_pelajaran for guru ~ fitra (${jPelajaranFitra?.length} rows):`, jPelajaranFitra);

  const { data: jPelajaranAhmad, error: errJPA } = await supabase.from('jadwal_pelajaran').select('*').ilike('nama_guru', '%ahmad%');
  if (errJPA) console.error('jPelajaranAhmad error:', errJPA);
  console.log(`jadwal_pelajaran for guru ~ ahmad (${jPelajaranAhmad?.length} rows):`, jPelajaranAhmad);

  console.log('\n--- 3. SPECIFIC ID CHECK e1144f72-2ec4-43f2-aebb-10a59063a906 ---');
  const { data: delRow, error: errDel } = await supabase.from('presensi_guru').select('*').eq('id', 'e1144f72-2ec4-43f2-aebb-10a59063a906');
  if (errDel) console.error('delRow error:', errDel);
  console.log('presensi_guru id e1144f72-2ec4-43f2-aebb-10a59063a906:', delRow);
}

audit().catch(console.error);
