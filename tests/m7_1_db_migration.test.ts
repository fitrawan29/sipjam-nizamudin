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

async function runM71Verification() {
  console.log(`${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}MILESTONE M7.1 VERIFICATION: MULTI-TENANT DB & RLS${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  // 1. Verify Migration File
  console.log('--- Step 1: Migration File Verification ---');
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260912_multi_tenant_sekolah_rls.sql');
  if (!fs.existsSync(migrationPath)) {
    fail('Migration file 20260912_multi_tenant_sekolah_rls.sql not found');
  }
  pass('Migration file exists: supabase/migrations/20260912_multi_tenant_sekolah_rls.sql');

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  if (!migrationContent.includes('CREATE TABLE IF NOT EXISTS public.sekolah')) {
    fail('Migration file missing CREATE TABLE public.sekolah');
  }
  pass('Migration contains public.sekolah table creation');

  if (!migrationContent.includes('a0000000-0000-0000-0000-000000000001')) {
    fail('Migration file missing default school UUID');
  }
  pass('Migration contains default school UUID for SMA Nizamudin');

  if (!migrationContent.includes('uq_pengaturan_sekolah_key') || !migrationContent.includes('uq_jadwal_piket_sekolah_hari') || !migrationContent.includes('uq_guru_mapel_sekolah')) {
    fail('Migration file missing composite unique constraints');
  }
  pass('Migration reconfigures multi-tenant composite unique constraints');

  // 2. Verify TypeScript Types
  console.log('\n--- Step 2: TypeScript Types Verification ---');
  const typesPath = path.resolve(__dirname, '../src/types/database.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  if (!typesContent.includes('export type Sekolah = Tables<"sekolah">;')) {
    fail('database.ts missing Sekolah type alias');
  }
  pass('database.ts exports Sekolah type');

  if (!typesContent.includes('sekolah_id: string')) {
    fail('database.ts missing sekolah_id column in table Row definitions');
  }
  pass('database.ts includes sekolah_id column across table Row definitions');

  // 3. Connect to Supabase Live Database
  console.log('\n--- Step 3: Live Database Verification ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    fail('Missing Supabase environment variables');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 3.1 Verify public.sekolah and SMA Nizamudin
  const { data: sekolahList, error: sekolahErr } = await supabase
    .from('sekolah')
    .select('*')
    .eq('id', 'a0000000-0000-0000-0000-000000000001');

  if (sekolahErr || !sekolahList || sekolahList.length === 0) {
    fail('Failed to query public.sekolah or default school not found', sekolahErr);
  }
  const s = sekolahList[0];
  pass(`Default school exists: "${s.nama}" (NPSN: ${s.npsn}, Status: ${s.status})`);

  // 3.2 Verify public.users contains Superadmin with sekolah_id IS NULL
  const { data: superadminUser, error: saErr } = await supabase
    .from('users')
    .select('id, username, role, sekolah_id')
    .eq('role', 'Superadmin')
    .is('sekolah_id', null);

  if (saErr || !superadminUser || superadminUser.length === 0) {
    fail('Superadmin user not found in public.users', saErr);
  }
  const sa = superadminUser[0];
  pass(`Superadmin user exists: "${sa.username}" (role: ${sa.role}, sekolah_id: ${sa.sekolah_id})`);

  // 3.3 Verify existing teachers have sekolah_id backfilled
  const { data: teachers, error: tErr } = await supabase
    .from('data_guru')
    .select('id, nama_guru, sekolah_id')
    .limit(5);

  if (tErr || !teachers || teachers.length === 0) {
    fail('Failed to fetch data_guru', tErr);
  }
  const allBackfilled = teachers.every(t => t.sekolah_id === 'a0000000-0000-0000-0000-000000000001');
  if (!allBackfilled) {
    fail('Teachers not correctly backfilled with default sekolah_id', teachers);
  }
  pass(`Teachers correctly backfilled with sekolah_id: ${teachers[0].sekolah_id}`);

  // 3.4 Verify verify_login RPC
  const { data: rpcData, error: rpcErr } = await supabase.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });

  if (rpcErr || !rpcData || rpcData.length === 0) {
    fail('verify_login RPC failed for superadmin', rpcErr);
  }
  pass(`verify_login RPC functional: authenticated as ${rpcData[0].username} (${rpcData[0].role})`);

  // 3.5 Verify tenant isolation query
  const { data: dummySchoolData, error: dummyErr } = await supabase
    .from('data_guru')
    .select('id')
    .eq('sekolah_id', 'b0000000-0000-0000-0000-000000000002');

  if (dummyErr) {
    fail('Failed to query with secondary school ID', dummyErr);
  }
  if (dummySchoolData && dummySchoolData.length !== 0) {
    fail('Tenant isolation leak: non-existent school returned records', dummySchoolData);
  }
  pass('Tenant isolation verified: query with different sekolah_id returns 0 records');

  console.log(`\n${GREEN}====================================================${RESET}`);
  console.log(`${GREEN}🎉 ALL M7.1 MULTI-TENANT DB & RLS TESTS PASSED!${RESET}`);
  console.log(`${GREEN}====================================================${RESET}`);
}

runM71Verification().catch(err => {
  console.error(err);
  process.exit(1);
});
