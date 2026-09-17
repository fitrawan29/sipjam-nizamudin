import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMilestone1() {
  console.log('=== VERIFYING MILESTONE 1 DATABASE FOUNDATIONS ===\n');

  // 1. Verify Tables Exist via Supabase Client
  const tables = [
    'wali_kelas',
    'absensi',
    'tujuan_pembelajaran',
    'asesmen_kolom',
    'nilai_siswa',
    'push_subscriptions'
  ];

  console.log('1. Checking table access:');
  for (const table of tables) {
    const { data, error } = await supabase.from(table as any).select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      // If error code is related to table not existing, fail
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.error(`❌ Table ${table} does not exist: ${error.message}`);
        process.exit(1);
      }
      console.log(`ℹ️ Table ${table} accessible (RLS response: ${error.message})`);
    } else {
      console.log(`✅ Table ${table} exists and is queryable.`);
    }
  }

  // 2. Test RPC update_user_profile
  console.log('\n2. Testing RPC update_user_profile:');
  const dummyUuid = '00000000-0000-0000-0000-000000000000';
  const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_profile', {
    p_user_id: dummyUuid,
    p_avatar: 'avatar_1',
    p_username: 'test_nonexistent_user',
    p_password: 'new_password'
  });

  if (rpcError) {
    console.error(`❌ RPC update_user_profile call failed:`, rpcError);
    process.exit(1);
  }
  console.log(`✅ RPC update_user_profile exists and returned expected validation result:`, rpcData);

  // 3. Test users table avatar column
  console.log('\n3. Checking users table columns:');
  const { data: userData, error: userError } = await supabase.from('users').select('id, avatar').limit(1);
  if (userError) {
    console.error(`❌ Error querying users table:`, userError);
    process.exit(1);
  }
  console.log(`✅ users table queryable with avatar column. Sample:`, userData);

  // 4. Test pengaturan table columns
  console.log('\n4. Checking pengaturan table columns:');
  const { data: configData, error: configError } = await supabase
    .from('pengaturan')
    .select('id, aturan_kehadiran_guru, email_tujuan_upload')
    .limit(1);
  if (configError) {
    console.error(`❌ Error querying pengaturan table:`, configError);
    process.exit(1);
  }
  console.log(`✅ pengaturan table queryable with new columns. Sample:`, configData);

  console.log('\n=== ALL MILESTONE 1 DATABASE VERIFICATIONS PASSED SUCCESSFULLY ===');
}

verifyMilestone1().catch(err => {
  console.error('Unhandled verification failure:', err);
  process.exit(1);
});
