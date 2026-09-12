import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const client = createClient(url, key);

async function testRlsBypass() {
  const testId = 'f0000000-0000-0000-0000-000000000001';
  console.log('--- TEST 1: INSERT with NO x-sekolah-id and NO auth token ---');
  const { data: ins, error: insErr } = await client.from('pengaturan').insert([{
    id: testId,
    sekolah_id: 'a0000000-0000-0000-0000-000000000001',
    key: 'test_rls_bypass_check',
    value: 'BYPASS_SUCCEEDED'
  }]).select();

  console.log('Insert Result:', ins);
  console.log('Insert Error:', insErr);

  console.log('\n--- TEST 2: DELETE with NO x-sekolah-id and NO auth token ---');
  const { data: del, error: delErr } = await client.from('pengaturan').delete().eq('id', testId).select();
  console.log('Delete Result:', del);
  console.log('Delete Error:', delErr);

  if (ins && ins.length > 0 && !insErr) {
    console.log('\n🚨 VERDICT: RLS POLICY WAS COMPLETELY BYPASSED! Anonymous client without headers successfully inserted and deleted rows.');
  } else {
    console.log('\n🛡️ RLS BLOCKED the unauthenticated write.');
  }
}

testRlsBypass().catch(console.error);
