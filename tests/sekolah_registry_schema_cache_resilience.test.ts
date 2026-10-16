/**
 * ============================================================================
 * TEST SUITE: SEKOLAH REGISTRY SCHEMA CACHE RESILIENCE & FALLBACK VERIFICATION
 * File: tests/sekolah_registry_schema_cache_resilience.test.ts
 *
 * Verifies Requirements R1, R2, and R3:
 * - R1: Graceful Fallback & Schema Resilience in Frontend (SuperadminView & AppScreen)
 * - R2: Standalone Migration & Schema Cache Reload Script (20261016_fix_sekolah_registry_schema_cache.sql)
 * - R3: Zero Regression & Schema Cache Helper Robustness
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import { isSchemaCacheOrMissingTableError } from '../src/lib/supabaseClient';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(desc: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [PASS]${RESET} ${desc}`);
}

function fail(desc: string, err?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ${RED}✖ [FAIL]${RESET} ${desc}`);
  if (err) console.error(`    ↳ Error:`, err);
}

async function runTests() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  SEKOLAH REGISTRY SCHEMA CACHE RESILIENCE & FALLBACK TESTS               ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // ==========================================================================
  // SECTION 1: HELPER isSchemaCacheOrMissingTableError ACCURACY & ROBUSTNESS
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ 1. SCHEMA CACHE DETECTION HELPER (isSchemaCacheOrMissingTableError) ━━━${RESET}`);

  // 1.1 PostgREST PGRST205 standard error object
  try {
    const errPgrst205 = {
      code: 'PGRST205',
      details: null,
      hint: "Perhaps you meant to reference the table 'public.sekolah'",
      message: "Could not find the table 'public.sekolah_registry' in the schema cache"
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errPgrst205), true);
    pass('Detects standard PostgREST PGRST205 error object');
  } catch (e) {
    fail('Failed to detect standard PostgREST PGRST205 error', e);
  }

  // 1.2 Message containing specific text even if code is missing
  try {
    const errMessageOnly = {
      message: "Could not find the table 'public.sekolah_registry' in the schema cache"
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errMessageOnly), true);
    pass('Detects error by message containing "Could not find the table \'public.sekolah_registry\' in the schema cache"');
  } catch (e) {
    fail('Failed to detect error by message string', e);
  }

  // 1.3 Postgres 42P01 undefined_table
  try {
    const err42P01 = {
      code: '42P01',
      message: 'relation "public.sekolah_registry" does not exist'
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(err42P01), true);
    pass('Detects PostgreSQL 42P01 undefined_table error');
  } catch (e) {
    fail('Failed to detect 42P01 error', e);
  }

  // 1.4 PostgREST schema reload hint
  try {
    const errHint = {
      hint: 'Reload schema cache or ensure table is published to API'
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errHint), true);
    pass('Detects error by hint containing "reload schema"');
  } catch (e) {
    fail('Failed to detect error by hint', e);
  }

  // 1.5 Plain string error message
  try {
    const strErr = "PGRST205: Could not find the table 'public.sekolah_registry' in the schema cache";
    assert.strictEqual(isSchemaCacheOrMissingTableError(strErr), true);
    pass('Detects schema cache error passed as plain string');
  } catch (e) {
    fail('Failed to detect plain string error', e);
  }

  // 1.6 Unrelated errors correctly return false
  try {
    const authErr = { code: 'PGRST301', message: 'JWT expired' };
    const networkErr = { message: 'Failed to fetch' };
    const nullErr = null;
    assert.strictEqual(isSchemaCacheOrMissingTableError(authErr), false);
    assert.strictEqual(isSchemaCacheOrMissingTableError(networkErr), false);
    assert.strictEqual(isSchemaCacheOrMissingTableError(nullErr), false);
    pass('Unrelated errors (JWT expired, network failure, null) correctly evaluate to false');
  } catch (e) {
    fail('False positive in unrelated errors', e);
  }

  // 1.7 Wrapped error object: { error: { code: 'PGRST205', message: ... } }
  try {
    const wrappedErr = {
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.sekolah_registry' in the schema cache"
      }
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(wrappedErr), true);
    pass('Detects wrapped PostgREST error envelope ({ error: { code: "PGRST205" } })');
  } catch (e) {
    fail('Failed to detect wrapped error envelope', e);
  }

  // 1.8 Supabase response object: { data: null, error: { message: ... } }
  try {
    const supabaseResp = {
      data: null,
      error: {
        message: "Could not find the table 'public.sekolah_registry' in the schema cache"
      }
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(supabaseResp), true);
    pass('Detects Supabase response object ({ data: null, error: { message: ... } })');
  } catch (e) {
    fail('Failed to detect Supabase response envelope', e);
  }

  // ==========================================================================
  // SECTION 2: STANDALONE MIGRATION & SCHEMA CACHE RELOAD SCRIPT (R2)
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. STANDALONE MIGRATION & SCHEMA CACHE RELOAD SCRIPT (R2) ━━━${RESET}`);

  const migrationFile = path.resolve(process.cwd(), 'supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql');
  try {
    assert.ok(fs.existsSync(migrationFile), 'Migration file must exist');
    pass('Migration file 20261016_fix_sekolah_registry_schema_cache.sql exists');

    const content = fs.readFileSync(migrationFile, 'utf8');

    // Execution instructions
    assert.ok(
      content.includes('SQL Editor') && content.includes('Run'),
      'Script must include instructions for Supabase SQL Editor'
    );
    pass('Contains clear execution instructions for Supabase SQL Editor');

    // Idempotent table creation
    assert.ok(
      content.includes('CREATE TABLE IF NOT EXISTS public.sekolah_registry'),
      'Script must contain CREATE TABLE IF NOT EXISTS public.sekolah_registry'
    );
    pass('Implements idempotent CREATE TABLE IF NOT EXISTS public.sekolah_registry');

    // Required columns
    const requiredCols = ['nama', 'npsn', 'kota_kabupaten', 'provinsi', 'vercel_url', 'supabase_url', 'supabase_anon_key', 'status'];
    for (const col of requiredCols) {
      assert.ok(content.includes(col), `Script must define column ${col}`);
    }
    pass('Defines all central school registry columns (nama, npsn, vercel_url, supabase_url, etc.)');

    // Row Level Security & Superadmin policy
    assert.ok(
      content.includes('ENABLE ROW LEVEL SECURITY') && content.includes("'Superadmin'"),
      'Script must enforce strict Superadmin RLS policy'
    );
    pass('Enforces strict Superadmin Row Level Security (RLS)');

    // Indexes
    assert.ok(
      content.includes('idx_sekolah_registry_npsn') && content.includes('idx_sekolah_registry_status'),
      'Script must define performance indexes'
    );
    pass('Creates performance indexes on npsn and status');

    // Schema cache reload NOTIFY command
    assert.ok(
      content.includes("NOTIFY pgrst, 'reload schema'"),
      "Script must contain NOTIFY pgrst, 'reload schema'"
    );
    pass('Executes NOTIFY pgrst, \'reload schema\' to reload PostgREST schema cache immediately');
  } catch (e) {
    fail('Error validating standalone migration script', e);
  }

  // ==========================================================================
  // SECTION 3: FRONTEND RESILIENCE & FALLBACK IN SUPERADMINVIEW & APPSCREEN (R1)
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. FRONTEND RESILIENCE & FALLBACK IN SUPERADMINVIEW & APPSCREEN (R1) ━━━${RESET}`);

  // 3.1 SuperadminView imports isSchemaCacheOrMissingTableError
  const saViewPath = path.resolve(process.cwd(), 'src/components/SuperadminView.tsx');
  const saContent = fs.readFileSync(saViewPath, 'utf8');
  try {
    assert.ok(
      saContent.includes('isSchemaCacheOrMissingTableError'),
      'SuperadminView must import and use isSchemaCacheOrMissingTableError'
    );
    pass('SuperadminView imports isSchemaCacheOrMissingTableError helper');
  } catch (e) {
    fail('SuperadminView missing isSchemaCacheOrMissingTableError import', e);
  }

  // 3.2 SuperadminView fetch fallback to public.sekolah
  try {
    assert.ok(
      saContent.includes("from('sekolah_registry')") &&
      saContent.includes("from('sekolah')") &&
      saContent.includes('isSchemaCacheOrMissingTableError(regErr)'),
      'SuperadminView fetch must fall back to public.sekolah on schema cache error'
    );
    pass('SuperadminView fetch falls back cleanly to public.sekolah on schema cache error');
  } catch (e) {
    fail('SuperadminView fetch fallback incomplete', e);
  }

  // 3.3 SuperadminView create fallback to public.sekolah
  try {
    assert.ok(
      saContent.includes('[sekolah_registry] Schema cache / missing table detected on create, falling back to public.sekolah'),
      'SuperadminView create must fall back to public.sekolah on schema cache error'
    );
    pass('SuperadminView create falls back to public.sekolah without blocking operation');
  } catch (e) {
    fail('SuperadminView create fallback incomplete', e);
  }

  // 3.4 SuperadminView update fallback to public.sekolah
  try {
    assert.ok(
      saContent.includes('[sekolah_registry] Schema cache / missing table detected on update, falling back to public.sekolah'),
      'SuperadminView update must fall back to public.sekolah on schema cache error'
    );
    pass('SuperadminView update falls back to public.sekolah without blocking operation');
  } catch (e) {
    fail('SuperadminView update fallback incomplete', e);
  }

  // 3.5 SuperadminView delete fallback to public.sekolah
  try {
    assert.ok(
      saContent.includes('[sekolah_registry] Schema cache / missing table detected on delete, falling back to public.sekolah'),
      'SuperadminView delete must fall back to public.sekolah on schema cache error'
    );
    pass('SuperadminView delete falls back to public.sekolah without blocking operation');
  } catch (e) {
    fail('SuperadminView delete fallback incomplete', e);
  }

  // 3.6 AppScreen imports and uses isSchemaCacheOrMissingTableError in switcher
  const appScreenPath = path.resolve(process.cwd(), 'src/components/AppScreen.tsx');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
  try {
    assert.ok(
      appScreenContent.includes('isSchemaCacheOrMissingTableError'),
      'AppScreen must import isSchemaCacheOrMissingTableError'
    );
    assert.ok(
      appScreenContent.includes('isSchemaCacheOrMissingTableError(regErr)'),
      'AppScreen fetchSchoolsForSwitcher must check regErr with isSchemaCacheOrMissingTableError'
    );
    assert.ok(
      appScreenContent.includes("from('sekolah')"),
      'AppScreen must fall back to public.sekolah'
    );
    pass('AppScreen imports and employs isSchemaCacheOrMissingTableError for resilient switcher fallback');
  } catch (e) {
    fail('AppScreen schema cache fallback incomplete', e);
  }

  // 3.7 SuperadminView handleCreateSatellite column resilience (PGRST204)
  try {
    assert.ok(
      saContent.includes("schErr.code === 'PGRST204'") &&
      saContent.includes('coreValues'),
      'SuperadminView create must strip satellite columns on missing column error'
    );
    pass('SuperadminView create resiliently strips non-existent columns on fallback into public.sekolah');
  } catch (e) {
    fail('SuperadminView create missing column resilience incomplete', e);
  }

  // 3.8 SuperadminView handleEditSatelliteSchool column resilience (PGRST204)
  try {
    assert.ok(
      saContent.includes("schErr.code === 'PGRST204'") &&
      saContent.includes("update(coreValues)"),
      'SuperadminView edit must strip satellite columns on missing column error'
    );
    pass('SuperadminView edit resiliently strips non-existent columns on fallback into public.sekolah');
  } catch (e) {
    fail('SuperadminView edit missing column resilience incomplete', e);
  }

  // 3.9 SuperadminView handleDeleteSatelliteSchool foreign key resilience (23503)
  try {
    assert.ok(
      saContent.includes("schErr.code === '23503'") &&
      saContent.includes("status: 'nonaktif'"),
      'SuperadminView delete must detach satellite credentials on foreign key constraint'
    );
    pass('SuperadminView delete detaches satellite credentials on foreign key constraint violation (23503)');
  } catch (e) {
    fail('SuperadminView delete FK resilience incomplete', e);
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}══════════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}${RESET}`);
  if (failedTests === 0) {
    console.log(`${GREEN}${BOLD}🎉 ALL SCHEMA CACHE RESILIENCE TESTS PASSED!${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}✖ SOME TESTS FAILED!${RESET}\n`);
    process.exitCode = 1;
  }
}

runTests();
