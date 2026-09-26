import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function testRiski() {
  const anonClient = createClient(supabaseUrl, supabaseKey);

  const { data: guruData } = await anonClient.rpc('verify_login', { p_username: 'Riski', p_password: 'Riski27' });
  const user = guruData[0];
  console.log('Guru user from RPC:', user);

  const guruClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-session-token': user.session_token,
        'x-sekolah-id': user.sekolah_id,
        'x-user-role': user.role,
        'x-user-id': user.id
      }
    }
  });

  const res1 = await guruClient.from('pengaturan').select('*');
  console.log('pengaturan without eq filter:', res1.data?.length, res1.error);

  const res2 = await guruClient.from('pengaturan').select('*').eq('sekolah_id', user.sekolah_id);
  console.log('pengaturan WITH eq filter:', res2.data?.length, res2.error);

  const res3 = await guruClient.from('presensi_guru').select('*').limit(5);
  console.log('presensi_guru without eq filter:', res3.data?.length, res3.error);

  const res4 = await guruClient.from('data_guru').select('*').limit(5);
  console.log('data_guru without eq filter:', res4.data?.length, res4.error);

  process.exit(0);
}

testRiski();
