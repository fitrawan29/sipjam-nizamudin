import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';

async function verifyFailureModes() {
  console.log('=== VERIFYING FAILURE MODES FOR ADMIN AND GURU ===\n');

  // Mode 1: Legacy Stored Session (Missing session_token)
  console.log('--- Mode 1: Legacy Stored Session in localStorage (No session_token) ---');
  const legacyAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSekolahId,
        'x-user-role': 'Admin',
        'x-user-id': 'd23141e4-2116-4946-8094-895ef21a50e5'
      }
    }
  });

  const { data: legUsers } = await legacyAdminClient.from('users').select('*');
  const { data: legGuru } = await legacyAdminClient.from('data_guru').select('*');
  const { data: legSiswa } = await legacyAdminClient.from('data_siswa').select('*');
  const { data: legPresensi } = await legacyAdminClient.from('presensi_guru').select('*');
  const { data: legPengaturan } = await legacyAdminClient.from('pengaturan').select('*');

  console.log('Legacy Admin results:');
  console.log('  users:', legUsers?.length ?? 0);
  console.log('  data_guru:', legGuru?.length ?? 0);
  console.log('  data_siswa:', legSiswa?.length ?? 0);
  console.log('  presensi_guru:', legPresensi?.length ?? 0);
  console.log('  pengaturan:', legPengaturan?.length ?? 0);

  // Mode 2: Fresh Login with session_token
  console.log('\n--- Mode 2: Fresh Login via verify_login RPC (Valid session_token) ---');
  const anonClient = createClient(supabaseUrl, supabaseKey);
  const { data: loginData } = await anonClient.rpc('verify_login', {
    p_username: 'admin',
    p_password: 'QWerty1334#'
  });
  const adminUser = loginData[0];

  const freshAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-session-token': adminUser.session_token,
        'x-sekolah-id': adminUser.sekolah_id,
        'x-user-role': adminUser.role,
        'x-user-id': adminUser.id
      }
    }
  });

  const { data: freshUsers } = await freshAdminClient.from('users').select('*');
  const { data: freshGuru } = await freshAdminClient.from('data_guru').select('*');
  const { data: freshSiswa } = await freshAdminClient.from('data_siswa').select('*');
  const { data: freshPresensi } = await freshAdminClient.from('presensi_guru').select('*');
  const { data: freshPengaturan } = await freshAdminClient.from('pengaturan').select('*');

  // Mode 3: Legacy Guru
  console.log('\n--- Mode 3: Legacy Guru in localStorage (No session_token) ---');
  const legacyGuruClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSekolahId,
        'x-user-role': 'Guru',
        'x-user-id': '6f5bfd44-7356-4b3e-a115-f87df12eedba'
      }
    }
  });
  const { data: legGGuru } = await legacyGuruClient.from('data_guru').select('*');
  const { data: legGSiswa } = await legacyGuruClient.from('data_siswa').select('*');
  const { data: legGPresensi } = await legacyGuruClient.from('presensi_guru').select('*');
  console.log('Legacy Guru results:');
  console.log('  data_guru:', legGGuru?.length ?? 0);
  console.log('  data_siswa:', legGSiswa?.length ?? 0);
  console.log('  presensi_guru:', legGPresensi?.length ?? 0);

  // Mode 4: Fresh Guru
  console.log('\n--- Mode 4: Fresh Guru via verify_login RPC ---');
  const { data: guruLoginData } = await anonClient.rpc('verify_login', {
    p_username: 'Riski',
    p_password: 'Riski27'
  });
  const guruUser = guruLoginData[0];
  const freshGuruClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-session-token': guruUser.session_token,
        'x-sekolah-id': guruUser.sekolah_id,
        'x-user-role': guruUser.role,
        'x-user-id': guruUser.id
      }
    }
  });
  const { data: freshGGuru } = await freshGuruClient.from('data_guru').select('*');
  const { data: freshGSiswa } = await freshGuruClient.from('data_siswa').select('*');
  const { data: freshGPresensi } = await freshGuruClient.from('presensi_guru').select('*');
  console.log('Fresh Guru results:');
  console.log('  data_guru:', freshGGuru?.length ?? 0);
  console.log('  data_siswa:', freshGSiswa?.length ?? 0);
  console.log('  presensi_guru:', freshGPresensi?.length ?? 0);

  process.exit(0);
}

verifyFailureModes();
