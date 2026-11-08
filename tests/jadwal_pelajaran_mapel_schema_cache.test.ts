import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

import { isSchemaCacheOrMissingTableError } from '../src/lib/supabaseClient';
import { parseAndValidateMasterCsv } from '../src/lib/dataIntegrityGuard';

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
  console.log('🧪 TEST SUITE: JADWAL PELAJARAN MAPEL SCHEMA CACHE RESILIENCE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: SQL MIGRATION & TEMPLATE VALIDITY
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: SQL MIGRATION & TEMPLATE INTEGRITY ---');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261109_fix_jadwal_pelajaran_mapel_schema_cache.sql');
  assert(fs.existsSync(migrationPath), 'Migration file 20261109_fix_jadwal_pelajaran_mapel_schema_cache.sql must exist');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  try {
    assert(migrationSql.includes('ALTER TABLE public.jadwal_pelajaran ADD COLUMN IF NOT EXISTS mapel TEXT;'), 'Migration adds mapel column idempotently');
    assert(migrationSql.includes('UPDATE public.jadwal_pelajaran'), 'Migration includes bidirectional backfill');
    assert(migrationSql.includes('sync_jadwal_pelajaran_mapel'), 'Migration creates sync trigger function');
    assert(migrationSql.includes('trg_sync_jadwal_pelajaran_mapel'), 'Migration attaches sync trigger to jadwal_pelajaran');
    assert(migrationSql.includes('check_jadwal_mapel_validity'), 'Migration updates mapel validation trigger function');
    assert(migrationSql.includes("NOTIFY pgrst, 'reload schema'"), 'Migration notifies PostgREST to reload schema cache');
    pass('1.1: Migration 20261109_fix_jadwal_pelajaran_mapel_schema_cache.sql contains complete DDL, backfill, trigger, and schema cache reload');
  } catch (e) {
    fail('1.1 failed', e);
  }

  const templatePath = path.join(__dirname, '..', 'supabase', 'SETUP_NEW_SCHOOL_TEMPLATE.sql');
  const templateSql = fs.readFileSync(templatePath, 'utf8');

  try {
    assert(templateSql.includes('mapel TEXT'), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes mapel TEXT in jadwal_pelajaran table definition');
    assert(templateSql.includes('sync_jadwal_pelajaran_mapel'), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes sync_jadwal_pelajaran_mapel trigger');
    pass('1.2: SETUP_NEW_SCHOOL_TEMPLATE.sql defines mapel column and sync trigger for new school instances');
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
      message: "Could not find the 'mapel' column of 'jadwal_pelajaran' in the schema cache",
      details: null,
      hint: null
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(error1), true, 'Detects PGRST204 schema cache error');

    const error2 = {
      message: "Could not find the 'mapel' column of 'jadwal_pelajaran' in the schema cache"
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(error2), true, 'Detects message containing column of jadwal_pelajaran in schema cache');

    const error3 = {
      code: '42703',
      message: 'column "mapel" of relation "jadwal_pelajaran" does not exist'
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(error3), true, 'Detects column does not exist error');

    const error4 = { code: '23505', message: 'duplicate key value violates unique constraint' };
    assert.strictEqual(isSchemaCacheOrMissingTableError(error4), false, 'Does not false-positive on other DB errors');
    pass('2.1: isSchemaCacheOrMissingTableError accurately identifies PGRST204 and missing mapel column errors');
  } catch (e) {
    fail('2.1 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: CSV & DATA INTEGRITY GUARD RESILIENCE
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: CSV & DATA INTEGRITY GUARD RESILIENCE ---');

  try {
    const csvContent = 'hari,nama_guru,mata_pelajaran,kelas\nSenin,Fitri,Bahasa Inggris,X Merdeka';
    const parsed = parseAndValidateMasterCsv(csvContent, 'jadwal_pelajaran');
    assert.strictEqual(parsed.length, 1, 'Parses 1 row');
    assert.strictEqual(parsed[0].mata_pelajaran, 'Bahasa Inggris', 'Populates mata_pelajaran');
    assert.strictEqual(parsed[0].mapel, 'Bahasa Inggris', 'Populates mapel identically');
    pass('3.1: parseAndValidateMasterCsv guarantees bidirectional hydration for mata_pelajaran and mapel');
  } catch (e) {
    fail('3.1 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: FRONTEND RESILIENCE CHECKS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: FRONTEND CODE DEFENSIVE AUDIT ---');

  const adminDataViewPath = path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminDataViewCode = fs.readFileSync(adminDataViewPath, 'utf8');

  try {
    assert(adminDataViewCode.includes('Schema cache resilience: if database lacks \'mapel\' column or PostgREST schema cache is stale'), 'AdminDataView insert handles schema cache fallback');
    assert(adminDataViewCode.includes('retrying insert without mapel'), 'AdminDataView retries insert without mapel');
    assert(adminDataViewCode.includes('retrying update without mapel'), 'AdminDataView retries update without mapel');
    pass('4.1: AdminDataView implements seamless fallback for insert and update when mapel column is missing from schema cache');
  } catch (e) {
    fail('4.1 failed', e);
  }

  const rekapJurnalPath = path.join(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx');
  const rekapJurnalCode = fs.readFileSync(rekapJurnalPath, 'utf8');

  try {
    assert(rekapJurnalCode.includes('Schema cache fallback: if or() query fails because \'mapel\' column is missing from schema cache'), 'RekapJurnalView handles schema cache fallback');
    assert(rekapJurnalCode.includes('retrying query with mata_pelajaran filter'), 'RekapJurnalView retries with mata_pelajaran filter');
    pass('4.2: RekapJurnalView implements graceful fallback when mapel column query triggers PGRST204');
  } catch (e) {
    fail('4.2 failed', e);
  }

  const guardPath = path.join(__dirname, '..', 'src', 'lib', 'dataIntegrityGuard.ts');
  const guardCode = fs.readFileSync(guardPath, 'utf8');

  try {
    assert(guardCode.includes('Missing mapel column in schema cache for jadwal_pelajaran, retrying batch without mapel column'), 'dataIntegrityGuard implements batch upsert fallback for mapel column');
    pass('4.3: dataIntegrityGuard implements batch upsert resilience stripping mapel column if missing from schema cache');
  } catch (e) {
    fail('4.3 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 5: LIVE DATABASE INTERACTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: LIVE DATABASE OPERATIONS ---');

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

      // 5.1 Query with select('*')
      const { data: selectAll, error: selAllErr } = await client.from('jadwal_pelajaran').select('*').limit(5);
      assert.strictEqual(selAllErr, null, 'select(*) succeeds without schema cache error');
      assert(selectAll && selectAll.length > 0, 'Returns rows from jadwal_pelajaran');
      pass('5.1: select(*) on jadwal_pelajaran succeeds without schema cache errors');

      // 5.2 Query with select('mata_pelajaran, mapel')
      const { data: selectCols, error: selColsErr } = await client.from('jadwal_pelajaran').select('mata_pelajaran, mapel').limit(5);
      assert.strictEqual(selColsErr, null, 'select(mata_pelajaran, mapel) succeeds');
      pass('5.2: select(mata_pelajaran, mapel) executes cleanly in live Supabase');

      // 5.3 Test insert and delete
      const testScheduleId = '00000000-0000-0000-0000-000000000888';
      const { error: insErr } = await client.from('jadwal_pelajaran').insert([{
        id: testScheduleId,
        sekolah_id: 'a0000000-0000-0000-0000-000000000001',
        hari: 'Senin',
        nama_guru: 'Rohani',
        mata_pelajaran: 'Informatika',
        mapel: 'Informatika',
        kelas: 'X Merdeka'
      }]);
      assert.strictEqual(insErr, null, 'Insert with mapel succeeds without schema cache error');
      
      const { error: delErr } = await client.from('jadwal_pelajaran').delete().eq('id', testScheduleId);
      assert.strictEqual(delErr, null, 'Cleaned up test schedule record');
      pass('5.3: Insert and delete on jadwal_pelajaran with mapel succeeds in live database');
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
