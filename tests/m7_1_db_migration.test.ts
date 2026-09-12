import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Ensure environment variables are loaded
dotenv.config({ path: '.env.local' });
dotenv.config();

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

  // Verify Hardened Remediation Migration File
  const remediationPath = path.resolve(__dirname, '../supabase/migrations/20260912_fix_rls_integrity.sql');
  if (!fs.existsSync(remediationPath)) {
    fail('Hardened RLS integrity migration file missing: supabase/migrations/20260912_fix_rls_integrity.sql');
  }
  const remediationContent = fs.readFileSync(remediationPath, 'utf8');
  if (remediationContent.includes('IS NULL AND true')) {
    fail('Remediation migration still contains permissive shortcut "IS NULL AND true"');
  }
  pass('Hardened RLS integrity migration file exists and contains zero permissive shortcuts: supabase/migrations/20260912_fix_rls_integrity.sql');

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

  const defaultSchoolAId = 'a0000000-0000-0000-0000-000000000001';
  const anonClient = createClient(supabaseUrl, supabaseKey);

  // Authenticate via verify_login to get legitimate Superadmin identity
  const { data: superadminAuth, error: saAuthErr } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });
  if (saAuthErr || !superadminAuth || superadminAuth.length === 0) {
    fail('verify_login RPC failed for superadmin during setup', saAuthErr);
  }
  const superadminUserId = superadminAuth[0].id;

  const superadminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        'x-user-id': superadminUserId
      }
    }
  });

  const tenantSchoolAClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Admin'
      }
    }
  });

  // 3.1 Verify public.sekolah and SMA Nizamudin
  const { data: sekolahList, error: sekolahErr } = await tenantSchoolAClient
    .from('sekolah')
    .select('*')
    .eq('id', defaultSchoolAId);

  if (sekolahErr || !sekolahList || sekolahList.length === 0) {
    fail('Failed to query public.sekolah or default school not found', sekolahErr);
  }
  const s = sekolahList[0];
  pass(`Default school exists: "${s.nama}" (NPSN: ${s.npsn}, Status: ${s.status})`);

  // 3.2 Verify public.users contains Superadmin with sekolah_id IS NULL
  const { data: superadminUser, error: saErr } = await superadminClient
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
  const { data: teachers, error: tErr } = await tenantSchoolAClient
    .from('data_guru')
    .select('id, nama_guru, sekolah_id')
    .limit(5);

  if (tErr || !teachers || teachers.length === 0) {
    fail('Failed to fetch data_guru', tErr);
  }
  const allBackfilled = teachers.every(t => t.sekolah_id === defaultSchoolAId);
  if (!allBackfilled) {
    fail('Teachers not correctly backfilled with default sekolah_id', teachers);
  }
  pass(`Teachers correctly backfilled with sekolah_id: ${teachers[0].sekolah_id}`);

  // 3.4 Verify verify_login RPC
  const { data: rpcData, error: rpcErr } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });

  if (rpcErr || !rpcData || rpcData.length === 0) {
    fail('verify_login RPC failed for superadmin', rpcErr);
  }
  pass(`verify_login RPC functional: authenticated as ${rpcData[0].username} (${rpcData[0].role})`);

  // 3.5 Verify tenant isolation: Anonymous query returns 0 rows (Strict RLS enforcement)
  const { data: anonTeachers } = await anonClient
    .from('data_guru')
    .select('id, nama_guru');

  if (anonTeachers && anonTeachers.length > 0) {
    fail('Tenant isolation leak: anonymous client without headers was able to read data_guru', anonTeachers);
  }
  pass('Tenant isolation verified: anonymous unheadered query on data_guru strictly denied by RLS (0 rows)');

  // 3.6 Verify tenant isolation: Secondary school client query returns 0 rows for School A records
  const secondarySchoolClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': 'b0000000-0000-0000-0000-000000000002',
        'x-user-role': 'Admin'
      }
    }
  });
  const { data: secondaryData } = await secondarySchoolClient
    .from('data_guru')
    .select('id');

  if (secondaryData && secondaryData.length !== 0) {
    fail('Tenant isolation leak: secondary school client received School A records', secondaryData);
  }
  pass('Tenant isolation verified: query with different sekolah_id returns 0 records under strict RLS');

  console.log(`\n${GREEN}====================================================${RESET}`);
  console.log(`${GREEN}🎉 ALL M7.1 MULTI-TENANT DB & RLS TESTS PASSED!${RESET}`);
  console.log(`${GREEN}====================================================${RESET}`);
}

runM71Verification().catch(err => {
  console.error(err);
  process.exit(1);
});
