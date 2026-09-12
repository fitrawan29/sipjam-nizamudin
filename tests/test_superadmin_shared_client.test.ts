import { supabase, setServerTenantContext, clearServerTenantContext } from '../src/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

async function runSuperadminSharedClientTest() {
  console.log('===============================================================');
  console.log('TEST: Superadmin Shared supabaseClient Verification');
  console.log('===============================================================');

  // 1. Get valid superadmin id via verify_login
  const anonClient = createClient(supabaseUrl, supabaseKey);
  const { data: saAuth, error: loginErr } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });

  if (loginErr || !saAuth || saAuth.length === 0) {
    console.error('Failed to authenticate as superadmin:', loginErr);
    process.exit(1);
  }

  const superadminUser = saAuth[0];
  console.log(`Authenticated Superadmin: ID=${superadminUser.id}, Role=${superadminUser.role}`);

  let passed = 0;
  let failed = 0;
  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // --- Scenario A: Browser-like environment with localStorage ---
  console.log('\n--- Scenario A: Browser LocalStorage Injection ---');
  // Mock localStorage in Node
  const mockStorage: Record<string, string> = {};
  (global as any).window = {
    localStorage: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      removeItem: (key: string) => { delete mockStorage[key]; }
    }
  };
  (global as any).localStorage = (global as any).window.localStorage;

  // Set Superadmin in localStorage exactly like LoginScreen / AppScreen does
  (global as any).localStorage.setItem(
    'sipjam_user',
    JSON.stringify({
      id: superadminUser.id,
      username: 'superadmin',
      role: 'Superadmin',
      sekolah_id: null
    })
  );

  // Query sekolah using shared supabase instance
  const { data: sekolahList, error: sekolahErr } = await supabase
    .from('sekolah')
    .select('*');

  assert(!sekolahErr, 'Superadmin can SELECT from sekolah via shared client');
  assert(Array.isArray(sekolahList) && sekolahList.length > 0, `Returned ${sekolahList?.length} schools`);

  // Query admin users
  const { data: adminList, error: adminErr } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'Admin');

  assert(!adminErr, 'Superadmin can SELECT from users (role=Admin) via shared client');
  assert(Array.isArray(adminList), `Returned ${adminList?.length} admin users`);

  // Insert a test school
  const testNpsn = `999${Date.now().toString().slice(-5)}`;
  const { data: newSchool, error: insertSchoolErr } = await supabase
    .from('sekolah')
    .insert([
      {
        nama: 'SMA Shared Client Test School',
        npsn: testNpsn,
        status: 'aktif'
      }
    ])
    .select()
    .single();

  assert(!insertSchoolErr && newSchool !== null, `Superadmin can INSERT new school: ${newSchool?.id}`);

  // Cleanup inserted school
  if (newSchool?.id) {
    const { error: delErr } = await supabase
      .from('sekolah')
      .delete()
      .eq('id', newSchool.id);
    assert(!delErr, 'Superadmin can DELETE / cleanup school');
  }

  // Clear mock localStorage and browser mock
  delete (global as any).window;
  delete (global as any).localStorage;

  // --- Scenario B: Node/SSR Environment with setServerTenantContext ---
  console.log('\n--- Scenario B: Server Tenant Context Injection ---');
  setServerTenantContext({
    userId: superadminUser.id,
    role: 'Superadmin',
    sekolahId: null
  });

  const { data: serverSekolah, error: serverSekolahErr } = await supabase
    .from('sekolah')
    .select('*');

  assert(!serverSekolahErr, 'Server context Superadmin can SELECT from sekolah');
  assert(Array.isArray(serverSekolah) && serverSekolah.length > 0, `Returned ${serverSekolah?.length} schools in server context`);

  clearServerTenantContext();

  console.log('\n===============================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuperadminSharedClientTest().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
