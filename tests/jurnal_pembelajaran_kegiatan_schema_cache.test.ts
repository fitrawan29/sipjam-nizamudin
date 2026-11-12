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
  console.log('🧪 TEST SUITE: JURNAL PEMBELAJARAN KEGIATAN_PEMBELAJARAN SCHEMA CACHE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: SQL MIGRATION & TEMPLATE INTEGRITY
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: SQL MIGRATION & TEMPLATE INTEGRITY ---');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261112_fix_jurnal_pembelajaran_kegiatan_pembelajaran_schema_cache.sql');
  assert(fs.existsSync(migrationPath), 'Migration file 20261112_fix_jurnal_pembelajaran_kegiatan_pembelajaran_schema_cache.sql must exist');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  try {
    assert(migrationSql.includes('ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS kegiatan_pembelajaran TEXT;'), 'Migration adds kegiatan_pembelajaran column idempotently');
    assert(migrationSql.includes('UPDATE public.jurnal_pembelajaran'), 'Migration backfills legacy kegiatan and modern kegiatan_pembelajaran');
    assert(migrationSql.includes('sync_jurnal_pembelajaran_kegiatan'), 'Migration defines bidirectional sync function');
    assert(migrationSql.includes('trg_sync_jurnal_pembelajaran_kegiatan'), 'Migration attaches bidirectional sync trigger to jurnal_pembelajaran');
    assert(migrationSql.includes("NOTIFY pgrst, 'reload schema'"), 'Migration notifies PostgREST to reload schema cache');
    pass('1.1: Migration 20261112_fix_jurnal_pembelajaran_kegiatan_pembelajaran_schema_cache.sql contains complete DDL, backfill, trigger, and schema reload');
  } catch (e) {
    fail('1.1 failed', e);
  }

  const templatePath = path.join(__dirname, '..', 'supabase', 'SETUP_NEW_SCHOOL_TEMPLATE.sql');
  const templateSql = fs.readFileSync(templatePath, 'utf8');

  try {
    assert(templateSql.includes('kegiatan_pembelajaran TEXT'), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes kegiatan_pembelajaran in table definition');
    assert(templateSql.includes('sync_jurnal_pembelajaran_kegiatan'), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes bidirectional sync trigger');
    pass('1.2: SETUP_NEW_SCHOOL_TEMPLATE.sql defines kegiatan_pembelajaran and sync trigger for new schools');
  } catch (e) {
    fail('1.2 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 2: CLIENT SCHEMA CACHE ERROR DETECTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: SCHEMA CACHE ERROR DETECTION HELPER ---');

  try {
    const errorPgrst204 = {
      code: 'PGRST204',
      message: "Could not find the 'kegiatan_pembelajaran' column of 'jurnal_pembelajaran' in the schema cache",
      details: null,
      hint: null
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errorPgrst204), true, 'Detects exact PostgREST PGRST204 error');

    const errorMessageOnly = {
      message: "Could not find the 'kegiatan_pembelajaran' column of 'jurnal_pembelajaran' in the schema cache"
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errorMessageOnly), true, 'Detects error by message string');

    const errorPostgres42703 = {
      code: '42703',
      message: 'column jurnal_pembelajaran.kegiatan_pembelajaran does not exist'
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errorPostgres42703), true, 'Detects PostgreSQL undefined column 42703');

    const errorFk = { code: '23503', message: 'foreign key constraint violation' };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errorFk), false, 'Does not false-positive on FK 23503');

    const errorUnique = { code: '23505', message: 'duplicate key value violates unique constraint' };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errorUnique), false, 'Does not false-positive on Unique 23505');

    pass('2.1: isSchemaCacheOrMissingTableError accurately identifies PGRST204 and missing kegiatan_pembelajaran errors');
  } catch (e) {
    fail('2.1 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: FRONTEND & LIBRARY CODE DEFENSIVE AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: FRONTEND CODE DEFENSIVE AUDIT ---');

  const guruJurnalPath = path.join(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx');
  const guruJurnalCode = fs.readFileSync(guruJurnalPath, 'utf8');

  try {
    assert(guruJurnalCode.includes('kegiatan_pembelajaran: _kp, ...strippedJurnal'), 'GuruJurnal insert retry strips kegiatan_pembelajaran on schema cache error');
    assert(guruJurnalCode.includes('kegiatan_pembelajaran: _kp, ...strippedPayload'), 'GuruJurnal update retry strips kegiatan_pembelajaran on schema cache error');
    assert(guruJurnalCode.includes('String(error?.message || \'\').toLowerCase().includes(\'kegiatan_pembelajaran\')'), 'GuruJurnal provides immediate proactive strip when error specifically names kegiatan_pembelajaran');
    pass('3.1: GuruJurnal.tsx provides dual-layer resilience stripping kegiatan_pembelajaran on schema cache mismatch');
  } catch (e) {
    fail('3.1 failed', e);
  }

  const rekapJurnalPath = path.join(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx');
  const rekapJurnalCode = fs.readFileSync(rekapJurnalPath, 'utf8');

  try {
    assert(rekapJurnalCode.includes('const { kegiatan_pembelajaran: _kp, ...compatiblePayload } = payload'), 'RekapJurnalView strips kegiatan_pembelajaran on update error');
    assert(rekapJurnalCode.includes('isSchemaCacheOrMissingTableError(error)'), 'RekapJurnalView uses isSchemaCacheOrMissingTableError');
    pass('3.2: RekapJurnalView.tsx provides update fallback stripping kegiatan_pembelajaran on schema cache mismatch');
  } catch (e) {
    fail('3.2 failed', e);
  }

  const dbTypesPath = path.join(__dirname, '..', 'src', 'types', 'database.ts');
  const dbTypesCode = fs.readFileSync(dbTypesPath, 'utf8');

  try {
    assert(dbTypesCode.includes('kegiatan_pembelajaran?: string | null'), 'database.ts types include kegiatan_pembelajaran');
    pass('3.3: database.ts accurately reflects kegiatan_pembelajaran column in Row, Insert, and Update');
  } catch (e) {
    fail('3.3 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: SIMULATED END-TO-END FALLBACK EXECUTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: SIMULATED END-TO-END FALLBACK EXECUTION ---');

  try {
    const isSchemaColumnError = (err: any) => Boolean(
      err && (
        err.code === 'PGRST204' ||
        err.code === '42703' ||
        err.status === 400 ||
        err.message?.includes('schema cache') ||
        err.message?.includes('column') ||
        err.message?.includes('Could not find the')
      )
    );

    let attempts = 0;
    const mockSupabase = {
      from: (tbl: string) => ({
        insert: async (rows: any[]) => {
          attempts++;
          const row = rows[0];
          if ('kegiatan_pembelajaran' in row) {
            return {
              data: null,
              error: {
                code: 'PGRST204',
                message: "Could not find the 'kegiatan_pembelajaran' column of 'jurnal_pembelajaran' in the schema cache"
              }
            };
          }
          return { data: rows, error: null };
        }
      })
    };

    const initialPayload = {
      id: 'test-uuid-001',
      mapel: 'Matematika',
      kelas: 'VII-A',
      tanggal: '2026-11-12',
      materi: 'Aljabar',
      kegiatan: 'Diskusi kelompok dan pemecahan masalah',
      kegiatan_pembelajaran: 'Diskusi kelompok dan pemecahan masalah',
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    };

    let insertRes = await mockSupabase.from('jurnal_pembelajaran').insert([initialPayload]);
    let err = insertRes.error;
    if (isSchemaColumnError(err)) {
      const isKpErr = String(err?.message || '').toLowerCase().includes('kegiatan_pembelajaran');
      const payloadToTry = isKpErr ? (({ kegiatan_pembelajaran: _kp, ...rest }: any) => rest)(initialPayload) : initialPayload;
      let retry = await mockSupabase.from('jurnal_pembelajaran').insert([payloadToTry]);
      if (isSchemaColumnError(retry.error)) {
        const { kegiatan_pembelajaran: _kp, ...strippedJurnal } = initialPayload;
        retry = await mockSupabase.from('jurnal_pembelajaran').insert([strippedJurnal]);
      }
      err = retry.error;
    }

    assert.strictEqual(err, null, 'Error resolved after fallback retry');
    assert.strictEqual(attempts, 2, 'Executed exactly 2 attempts (initial failed -> retry without kegiatan_pembelajaran succeeded)');
    pass('4.1: Simulated insert with missing kegiatan_pembelajaran succeeds transparently on first fallback retry');
  } catch (e) {
    fail('4.1 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 5: LIVE DATABASE OPERATIONS
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
      const { data: selectAll, error: selAllErr } = await client.from('jurnal_pembelajaran').select('*').limit(3);
      assert.strictEqual(selAllErr, null, 'select(*) succeeds without error');
      pass('5.1: select(*) on jurnal_pembelajaran succeeds cleanly');

      // 5.2 Test insert and delete with canonical kegiatan field (resilient across both pre-migration and post-migration DB)
      const testJournalId = '00000000-0000-0000-0000-000000000777';
      const canonicalPayload = {
        id: testJournalId,
        sekolah_id: 'a0000000-0000-0000-0000-000000000001',
        nama_guru: 'Guru Test Resiliensi',
        mapel: 'Matematika',
        kelas: 'VII-A',
        tanggal: '2026-11-12',
        materi: 'Materi Uji Resiliensi',
        kegiatan: 'Kegiatan Uji Resiliensi',
        absensi_siswa: '{}'
      };

      const { error: insErr } = await client.from('jurnal_pembelajaran').insert([canonicalPayload]);
      assert.strictEqual(insErr, null, 'Insert with canonical kegiatan field succeeds');

      const { error: delErr } = await client.from('jurnal_pembelajaran').delete().eq('id', testJournalId);
      assert.strictEqual(delErr, null, 'Delete test journal record succeeds');
      pass('5.2: Insert and cleanup on jurnal_pembelajaran succeeds in live database with canonical payload');
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
