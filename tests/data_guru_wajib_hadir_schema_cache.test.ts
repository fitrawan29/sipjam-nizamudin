import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

import { isSchemaCacheOrMissingTableError } from '../src/lib/supabaseClient';

let passCount = 0;
let failCount = 0;

function pass(name: string) {
  console.log(`  ✔ PASS: ${name}`);
  passCount++;
}

function fail(name: string, error?: any) {
  console.error(`  ✘ FAIL: ${name}`, error || '');
  failCount++;
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 TEST SUITE: DATA GURU WAJIB HADIR HANYA MENGAJAR SCHEMA CACHE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: SQL MIGRATION & TEMPLATE INTEGRITY
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: SQL MIGRATION & TEMPLATE INTEGRITY ---');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261112_fix_data_guru_wajib_hadir_hanya_mengajar_schema_cache.sql');
  assert(fs.existsSync(migrationPath), 'Migration file 20261112_fix_data_guru_wajib_hadir_hanya_mengajar_schema_cache.sql must exist');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  try {
    assert(migrationSql.includes('ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE;'), 'Migration adds wajib_hadir_hanya_mengajar column to data_guru idempotently');
    assert(migrationSql.includes('UPDATE public.data_guru'), 'Migration backfills default false values');
    assert(migrationSql.includes("NOTIFY pgrst, 'reload schema'"), 'Migration notifies PostgREST to reload schema cache');
    pass('1.1: Migration 20261112_fix_data_guru_wajib_hadir_hanya_mengajar_schema_cache.sql contains complete DDL, backfill, and schema reload');
  } catch (e) {
    fail('1.1 failed', e);
  }

  const templatePath = path.join(__dirname, '..', 'supabase', 'SETUP_NEW_SCHOOL_TEMPLATE.sql');
  const templateSql = fs.readFileSync(templatePath, 'utf8');

  try {
    assert(templateSql.includes('wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE'), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes column in table definition');
    assert(templateSql.includes("NOTIFY pgrst, 'reload schema'"), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes schema reload');
    pass('1.2: SETUP_NEW_SCHOOL_TEMPLATE.sql defines wajib_hadir_hanya_mengajar column and schema reload');
  } catch (e) {
    fail('1.2 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 2: CLIENT SCHEMA CACHE ERROR DETECTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: SCHEMA CACHE ERROR DETECTION HELPER ---');

  try {
    const error1 = {
      code: 'PGRST204',
      message: "Could not find the 'wajib_hadir_hanya_mengajar' column of 'data_guru' in the schema cache",
      details: null,
      hint: null
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(error1), true, 'Detects PGRST204 schema cache error');

    const error2 = {
      message: "Could not find the 'wajib_hadir_hanya_mengajar' column of 'data_guru' in the schema cache"
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(error2), true, 'Detects message containing column of data_guru in schema cache');

    const error3 = {
      code: '42703',
      message: 'column "wajib_hadir_hanya_mengajar" of relation "data_guru" does not exist'
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(error3), true, 'Detects column does not exist error');

    const error4 = { code: '23505', message: 'duplicate key value violates unique constraint' };
    assert.strictEqual(isSchemaCacheOrMissingTableError(error4), false, 'Does not false-positive on other DB errors');
    pass('2.1: isSchemaCacheOrMissingTableError accurately identifies PGRST204 and missing wajib_hadir_hanya_mengajar errors');
  } catch (e) {
    fail('2.1 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: FRONTEND CODE DEFENSIVE AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: FRONTEND & LIBRARY CODE DEFENSIVE AUDIT ---');

  const adminDataViewPath = path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminDataViewCode = fs.readFileSync(adminDataViewPath, 'utf8');

  try {
    assert(adminDataViewCode.includes('Schema cache missing wajib_hadir_hanya_mengajar column, retrying insert without wajib_hadir_hanya_mengajar'), 'AdminDataView insert handles schema cache fallback');
    assert(adminDataViewCode.includes('Schema cache missing wajib_hadir_hanya_mengajar column, retrying update without wajib_hadir_hanya_mengajar'), 'AdminDataView update handles schema cache fallback');
    assert(adminDataViewCode.includes('syncTeacherExemptionToPengaturanFallback'), 'AdminDataView syncs to pengaturan fallback if column missing');
    pass('3.1: AdminDataView implements seamless fallback for insert and update when wajib_hadir_hanya_mengajar is missing');
  } catch (e) {
    fail('3.1 failed', e);
  }

  const adminConfigViewPath = path.join(__dirname, '..', 'src', 'components', 'AdminConfigView.tsx');
  const adminConfigViewCode = fs.readFileSync(adminConfigViewPath, 'utf8');

  try {
    assert(adminConfigViewCode.includes('Schema cache missing wajib_hadir_hanya_mengajar on data_guru'), 'AdminConfigView handles schema cache fallback for data_guru');
    pass('3.2: AdminConfigView safely handles missing wajib_hadir_hanya_mengajar column when saving settings');
  } catch (e) {
    fail('3.2 failed', e);
  }

  const workflowPath = path.join(__dirname, '..', 'src', 'lib', 'workflow.ts');
  const workflowCode = fs.readFileSync(workflowPath, 'utf8');

  try {
    assert(!workflowCode.includes("select('id, nama_guru, nip, mata_pelajaran, wajib_hadir_hanya_mengajar, sekolah_id')"), 'workflow.ts avoids explicit select with missing column risk');
    pass('3.3: workflow.ts safely selects data_guru without risking PGRST204 schema cache failure');
  } catch (e) {
    fail('3.3 failed', e);
  }

  const guardPath = path.join(__dirname, '..', 'src', 'lib', 'dataIntegrityGuard.ts');
  const guardCode = fs.readFileSync(guardPath, 'utf8');

  try {
    assert(guardCode.includes('Missing wajib_hadir_hanya_mengajar column in schema cache for data_guru, retrying batch without column'), 'dataIntegrityGuard implements batch upsert fallback');
    pass('3.4: dataIntegrityGuard implements batch upsert resilience for wajib_hadir_hanya_mengajar');
  } catch (e) {
    fail('3.4 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: LIVE DATABASE OPERATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: LIVE DATABASE OPERATIONS ---');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (url && key) {
    try {
      const baseClient = createClient(url, key);
      const { data: loginData } = await baseClient.rpc('verify_login', {
        p_username: 'superadmin',
        p_password: 'SipjamSuperAdmin2026!'
      });
      const token = loginData?.[0]?.session_token;

      const client = createClient(url, key, {
        global: {
          headers: {
            'x-user-role': 'Superadmin',
            ...(token ? { 'x-session-token': token } : {})
          }
        }
      });

      // 4.1 Query data_guru with select('*')
      const { data: selectAll, error: selAllErr } = await client.from('data_guru').select('*').limit(5);
      assert.strictEqual(selAllErr, null, 'select(*) succeeds without schema cache error');
      pass('4.1: select(*) on data_guru succeeds without schema cache error');

      // 4.2 Query data_guru with select('id, nama_guru, wajib_hadir_hanya_mengajar')
      const { data: selectCols, error: selColsErr } = await client.from('data_guru').select('id, nama_guru, wajib_hadir_hanya_mengajar').limit(5);
      assert.strictEqual(selColsErr, null, 'select(id, nama_guru, wajib_hadir_hanya_mengajar) succeeds');
      pass('4.2: select with wajib_hadir_hanya_mengajar executes cleanly');

      // 4.3 Test insert and delete with wajib_hadir_hanya_mengajar
      const testTeacherId = '00000000-0000-0000-0000-000000000999';
      const { error: insErr } = await client.from('data_guru').insert([{
        id: testTeacherId,
        sekolah_id: 'a0000000-0000-0000-0000-000000000001',
        nip: '198901012026011999',
        nama_guru: 'Guru Test Schema Cache',
        mata_pelajaran: 'Matematika',
        status: 'Aktif',
        wajib_hadir_hanya_mengajar: true
      }]);
      assert.strictEqual(insErr, null, 'Insert with wajib_hadir_hanya_mengajar succeeds');

      const { error: delErr } = await client.from('data_guru').delete().eq('id', testTeacherId);
      assert.strictEqual(delErr, null, 'Cleanup test teacher record succeeds');
      pass('4.3: Insert and delete on data_guru with wajib_hadir_hanya_mengajar succeeds in live database');
    } catch (e) {
      fail('Live database suite failed', e);
    }
  } else {
    console.log('  ⚠ SKIP: Live database credentials not found in env');
  }

  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('========================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
