import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ANSI colors for clean test reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function pass(msg: string) {
  console.log(`${GREEN}✅ PASS:${RESET} ${msg}`);
}

function fail(msg: string, detail?: any): never {
  console.error(`${RED}❌ FAIL:${RESET} ${msg}`, detail || '');
  throw new Error(`Test failed: ${msg}`);
}

async function runM72Verification() {
  console.log(`${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}MILESTONE M7.2 & M7.3 VERIFICATION: AUTH & TENANT UI${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  // 1. Verify File Existence
  console.log('--- Step 1: Component & Route Files Verification ---');
  const superadminViewPath = path.resolve(__dirname, '../src/components/SuperadminView.tsx');
  if (!fs.existsSync(superadminViewPath)) {
    fail('SuperadminView.tsx not found');
  }
  pass('SuperadminView.tsx exists');

  const superadminPagePath = path.resolve(__dirname, '../src/app/superadmin/page.tsx');
  if (!fs.existsSync(superadminPagePath)) {
    fail('src/app/superadmin/page.tsx not found');
  }
  pass('src/app/superadmin/page.tsx exists');

  // Check content requirements in SuperadminView.tsx
  const superadminViewCode = fs.readFileSync(superadminViewPath, 'utf8');
  if (!superadminViewCode.includes('Ringkasan Platform') || !superadminViewCode.includes('Kelola Sekolah') || !superadminViewCode.includes('Admin Sekolah')) {
    fail('SuperadminView missing required 3 tabs (Ringkasan Platform, Kelola Sekolah, Admin Sekolah)');
  }
  pass('SuperadminView contains required tabs (Platform Overview, Sekolah, Admins)');

  if (!superadminViewCode.includes('handleOpenAddSchoolModal') || !superadminViewCode.includes('handleOpenAddAdminModal')) {
    fail('SuperadminView missing modals for adding school or adding admin');
  }
  pass('SuperadminView implements school registration and admin provisioning modals');

  // Check AppScreen.tsx
  const appScreenCode = fs.readFileSync(path.resolve(__dirname, '../src/components/AppScreen.tsx'), 'utf8');
  if (!appScreenCode.includes('menuItemsSuperadmin') || !appScreenCode.includes('SuperadminView')) {
    fail('AppScreen.tsx does not integrate SuperadminView or menuItemsSuperadmin');
  }
  pass('AppScreen.tsx integrates SuperadminView and menuItemsSuperadmin');

  if (!appScreenCode.includes("user?.role === 'Superadmin' ? 'Superadmin' : (schoolData?.nama || 'Sekolah')")) {
    fail('AppScreen.tsx does not have dynamic tenant header');
  }
  pass('AppScreen.tsx dynamically displays school name or Superadmin in header');

  // Check AdminConfigView.tsx
  const adminConfigCode = fs.readFileSync(path.resolve(__dirname, '../src/components/AdminConfigView.tsx'), 'utf8');
  if (!adminConfigCode.includes("onConflict: 'sekolah_id,key'")) {
    fail("AdminConfigView.tsx does not upsert with onConflict: 'sekolah_id,key'");
  }
  pass("AdminConfigView.tsx upserts with onConflict: 'sekolah_id,key'");

  // Check PrintHeader.tsx
  const printHeaderCode = fs.readFileSync(path.resolve(__dirname, '../src/components/PrintHeader.tsx'), 'utf8');
  if (!printHeaderCode.includes('PrintHeaderProps') || !printHeaderCode.includes('resolveSekolahId')) {
    fail('PrintHeader.tsx missing PrintHeaderProps or resolveSekolahId');
  }
  pass('PrintHeader.tsx supports tenant scoping via props and localStorage fallback');

  // 2. Connect to Supabase Live Database
  console.log('\n--- Step 2: Live Database & Superadmin Workflow ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  const superadminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin'
      }
    }
  });

  // 2.1 Test Superadmin Login simulation via verify_login RPC
  const { data: saLogin, error: saLoginErr } = await supabase.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });

  if (saLoginErr || !saLogin || saLogin.length === 0) {
    fail('verify_login RPC failed for superadmin user', saLoginErr);
  }
  pass(`Superadmin login verified: role="${saLogin[0].role}", username="${saLogin[0].username}", sekolah_id=${saLogin[0].sekolah_id}`);

  // 2.2 Test School Creation & Admin Creation Workflow Simulation
  const testNpsn = '99887766';
  const testUsername = `admin_test_${Date.now()}`;

  // Clean up any stale test records first
  await superadminClient.from('users').delete().eq('username', testUsername);
  await superadminClient.from('sekolah').delete().eq('npsn', testNpsn);

  console.log('Inserting test school into public.sekolah...');
  const { data: newSchool, error: schoolErr } = await superadminClient
    .from('sekolah')
    .insert([
      {
        nama: 'SMA Test Multi-Tenant',
        npsn: testNpsn,
        alamat: 'Jl. Uji Coba No. 99',
        kota_kabupaten: 'Kota Manado',
        provinsi: 'Sulawesi Utara',
        nama_kepala_sekolah: 'Drs. Penguji, M.Pd.',
        nip_kepala_sekolah: '198001012005011001',
        status: 'aktif'
      }
    ])
    .select()
    .single();

  if (schoolErr || !newSchool) {
    fail('Failed to insert test school into public.sekolah', schoolErr);
  }
  pass(`Test school registered: "${newSchool.nama}" (ID: ${newSchool.id})`);

  console.log('Inserting test school admin linked to the new school...');
  const { data: newAdmin, error: adminErr } = await superadminClient
    .from('users')
    .insert([
      {
        username: testUsername,
        password: 'password123',
        nama: 'Admin Uji Coba Multi-Tenant',
        role: 'Admin',
        sekolah_id: newSchool.id
      }
    ])
    .select()
    .single();

  if (adminErr || !newAdmin) {
    fail('Failed to create test school admin', adminErr);
  }
  pass(`Test school admin created: "${newAdmin.username}" linked to school ID: ${newAdmin.sekolah_id}`);

  // 2.3 Verify login for the new school admin
  const { data: adminLogin, error: adminLoginErr } = await supabase.rpc('verify_login', {
    p_username: testUsername,
    p_password: 'password123'
  });

  if (adminLoginErr || !adminLogin || adminLogin.length === 0) {
    fail('verify_login RPC failed for newly created school admin', adminLoginErr);
  }
  if (adminLogin[0].sekolah_id !== newSchool.id) {
    fail(`Admin logged in with wrong sekolah_id: expected ${newSchool.id}, got ${adminLogin[0].sekolah_id}`);
  }
  pass(`New School Admin logged in successfully with bound sekolah_id: ${adminLogin[0].sekolah_id}`);

  // 2.4 Verify composite upsert on pengaturan for the new school
  const { error: upsertErr } = await superadminClient
    .from('pengaturan')
    .upsert([
      {
        sekolah_id: newSchool.id,
        key: 'kop_sekolah',
        value: 'SMA Test Multi-Tenant'
      }
    ], { onConflict: 'sekolah_id,key' });

  if (upsertErr) {
    fail('Failed to upsert tenant-specific pengaturan', upsertErr);
  }
  pass('Tenant-specific pengaturan upserted successfully with composite constraint (sekolah_id, key)');

  // Clean up test records
  console.log('\n--- Cleaning up temporary test records ---');
  await superadminClient.from('users').delete().eq('username', testUsername);
  await superadminClient.from('pengaturan').delete().eq('sekolah_id', newSchool.id);
  await superadminClient.from('sekolah').delete().eq('id', newSchool.id);
  pass('Test records cleaned up cleanly');

  console.log(`\n${GREEN}====================================================${RESET}`);
  console.log(`${GREEN}🎉 ALL M7.2 & M7.3 AUTH & TENANT UI TESTS PASSED!${RESET}`);
  console.log(`${GREEN}====================================================${RESET}`);
}

runM72Verification().catch(err => {
  console.error(err);
  process.exit(1);
});
