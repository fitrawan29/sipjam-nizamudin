import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Exactly how SuperadminView.tsx lines 11-17 creates supabase client:
const superadminViewClient = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-role': 'Superadmin'
    }
  }
});

async function run() {
  console.log('Testing SuperadminView.tsx client instance:');
  const { data: sekolahData, error: sekolahErr } = await superadminViewClient.from('sekolah').select('*');
  console.log('sekolah select result count:', sekolahData?.length, 'error:', sekolahErr?.message);

  const { data: usersData, error: usersErr } = await superadminViewClient.from('users').select('*').eq('role', 'Admin');
  console.log('admin users select result count:', usersData?.length, 'error:', usersErr?.message);

  const { data: insData, error: insErr } = await superadminViewClient.from('sekolah').insert([{
    nama: 'Audit Test School',
    npsn: '12345678',
    status: 'aktif'
  }]).select();
  console.log('sekolah insert result:', insData, 'error:', insErr?.message);
}

run();
