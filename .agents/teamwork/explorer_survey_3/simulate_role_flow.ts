import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function simulateBrowserRoleFlow(username: string, pass: string, roleName: string) {
  console.log(`\n=== Testing Full Login & Retrieval Flow for: ${roleName} (${username}) ===`);
  const anonClient = createClient(supabaseUrl, supabaseKey);

  // 1. verify_login RPC
  const { data: rpcData, error: rpcErr } = await anonClient.rpc('verify_login', {
    p_username: username,
    p_password: pass
  });

  if (rpcErr || !rpcData || rpcData.length === 0) {
    console.error(`Login failed for ${username}:`, rpcErr || 'No user data returned');
    return;
  }

  const user = rpcData[0];
  console.log('Login success! User data:', {
    id: user.id,
    username: user.username,
    role: user.role,
    sekolah_id: user.sekolah_id,
    has_session_token: !!user.session_token,
    session_token: user.session_token
  });

  // 2. Client with dynamic headers exactly as dynamicTenantFetch injects:
  const client = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': user.sekolah_id || '',
        'x-user-role': user.role || '',
        'x-user-id': user.id || '',
        ...(user.session_token ? { 'x-session-token': user.session_token } : {})
      }
    }
  });

  // 3. Test queries
  const tables = [
    'sekolah',
    'users',
    'data_guru',
    'data_siswa',
    'data_mapel',
    'jadwal_pelajaran',
    'jadwal_piket',
    'penugasan_piket',
    'laporan_piket',
    'presensi_guru',
    'jurnal_pembelajaran',
    'pengaturan',
    'kalender_pendidikan',
    'wali_kelas',
    'chat_messages',
    'pengumuman',
    'bank_dokumen',
    'nilai_siswa'
  ];

  for (const table of tables) {
    let q = client.from(table).select('*');
    if (user.sekolah_id && table !== 'sekolah') {
      q = q.eq('sekolah_id', user.sekolah_id);
    } else if (table === 'sekolah' && user.sekolah_id) {
      q = q.eq('id', user.sekolah_id);
    }
    const { data, error } = await q.limit(5);
    if (error) {
      console.log(`❌ Table [${table}]: ERROR - ${error.code}: ${error.message}`);
    } else {
      console.log(`✅ Table [${table}]: OK - ${data?.length} rows`);
    }
  }
}

async function run() {
  await simulateBrowserRoleFlow('admin', 'QWerty1334#', 'Admin');
  await simulateBrowserRoleFlow('Riski', 'Riski27', 'Guru (Riski)');
  process.exit(0);
}

run();

