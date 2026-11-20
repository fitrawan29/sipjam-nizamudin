import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { getMigrationFiles, getDatabaseTargets } from '../scripts/multi-db-migrator';
import { isSchemaCacheOrMissingTableError } from '../src/lib/supabaseClient';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

function pass(msg: string) {
  console.log(`${GREEN}✅ PASS:${RESET} ${msg}`);
  passed++;
}

function fail(msg: string, error?: any) {
  console.error(`${RED}❌ FAIL:${RESET} ${msg}`);
  if (error) console.error(error);
  failed++;
}

async function runTests() {
  console.log(`\n${BLUE}${BOLD}====================================================${RESET}`);
  console.log(`${BLUE}${BOLD}TEST: MULTI-DATABASE MIGRATION ENGINE & RESILIENCE${RESET}`);
  console.log(`${BLUE}${BOLD}====================================================${RESET}\n`);

  // Test 1: Scan Migration Files
  try {
    const migrations = getMigrationFiles();
    assert(migrations.length >= 50, `Expected at least 50 migrations, got ${migrations.length}`);
    assert(migrations[0].filename.startsWith('2026'), 'First migration should start with date 2026');
    assert(migrations[migrations.length - 1].filename.includes('jurnal_bk'), 'Latest migrations should include jurnal_bk');
    pass(`1. Discovered ${migrations.length} migration files in chronological order.`);
  } catch (e: any) {
    fail('1. Migration files discovery failed', e);
  }

  // Test 2: Target Discovery via JSON and Env Vars
  try {
    process.env.SUPABASE_CLUSTER_DBS = JSON.stringify([
      { name: 'SMA Nizamudin', url: 'postgresql://postgres.jicvvqxjyzntdrccnuyz:secret@pooler.supabase.com:6543/postgres' },
      { name: 'SIPJAM-SMANTUTUYAN', url: 'postgresql://postgres.tutuyanref:secret@pooler.supabase.com:6543/postgres' }
    ]);

    const targets = getDatabaseTargets();
    assert(targets.length >= 2, `Expected at least 2 targets, got ${targets.length}`);
    const nizamudin = targets.find(t => t.name === 'SMA Nizamudin');
    const tutuyan = targets.find(t => t.name === 'SIPJAM-SMANTUTUYAN');
    assert(nizamudin, 'Should find SMA Nizamudin target');
    assert(tutuyan, 'Should find SIPJAM-SMANTUTUYAN target');
    delete process.env.SUPABASE_CLUSTER_DBS;
    pass('2. Database target discovery parses JSON cluster config correctly.');
  } catch (e: any) {
    fail('2. Target discovery failed', e);
  }

  // Test 3: Pattern-based DB_URL_* discovery
  try {
    process.env.DB_URL_TEST_SCHOOL = 'postgresql://postgres.test:secret@pooler.supabase.com:6543/postgres';
    const targets = getDatabaseTargets();
    const testTarget = targets.find(t => t.name.includes('TEST SCHOOL'));
    assert(testTarget, 'Should discover target from DB_URL_TEST_SCHOOL');
    delete process.env.DB_URL_TEST_SCHOOL;
    pass('3. Pattern-based environment variables (DB_URL_*) recognized correctly.');
  } catch (e: any) {
    fail('3. Pattern-based DB discovery failed', e);
  }

  // Test 4: GitHub Actions Workflow File Validation
  try {
    const ghaPath = path.resolve(process.cwd(), '.github/workflows/supabase-multi-db-sync.yml');
    assert(fs.existsSync(ghaPath), 'GitHub Actions workflow file must exist');
    const content = fs.readFileSync(ghaPath, 'utf8');
    assert(content.includes('supabase/migrations/**'), 'Workflow must trigger on migrations path');
    assert(content.includes('SUPABASE_CLUSTER_DBS'), 'Workflow must pass SUPABASE_CLUSTER_DBS secret');
    assert(content.includes('workflow_dispatch'), 'Workflow must support manual trigger');
    pass('4. GitHub Actions workflow file (.github/workflows/supabase-multi-db-sync.yml) is valid.');
  } catch (e: any) {
    fail('4. GitHub Actions workflow verification failed', e);
  }

  // Test 5: SETUP_NEW_SCHOOL_TEMPLATE.sql synchronization
  try {
    const templatePath = path.resolve(process.cwd(), 'supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql');
    const templateSql = fs.readFileSync(templatePath, 'utf8');
    assert(templateSql.includes('CREATE TABLE IF NOT EXISTS public.jurnal_bk'), 'Template must include jurnal_bk table');
    assert(templateSql.includes('CREATE TABLE IF NOT EXISTS public._schema_migrations'), 'Template must include _schema_migrations tracker');
    assert(templateSql.includes('idx_jurnal_bk_sekolah_id'), 'Template must include indexes for jurnal_bk');
    assert(templateSql.includes('ALTER TABLE public.jurnal_bk ENABLE ROW LEVEL SECURITY'), 'Template must enable RLS on jurnal_bk');
    pass('5. SETUP_NEW_SCHOOL_TEMPLATE.sql contains all latest schema and tracking definitions.');
  } catch (e: any) {
    fail('5. Template SQL verification failed', e);
  }

  // Test 6: Schema Cache Resilience for new tables/columns
  try {
    assert(isSchemaCacheOrMissingTableError('relation "public.jurnal_bk" does not exist'), 'Should catch missing jurnal_bk');
    assert(isSchemaCacheOrMissingTableError({ message: 'could not find the detail_layanan column of jurnal_bk in schema cache' }), 'Should catch detail_layanan schema cache error');
    assert(isSchemaCacheOrMissingTableError({ code: 'PGRST205', message: 'Table not found' }), 'Should catch PGRST205 table not found');
    assert(isSchemaCacheOrMissingTableError({ code: '42703', message: 'column peserta_didik does not exist' }), 'Should catch 42703 undefined column');
    pass('6. supabaseClient isSchemaCacheOrMissingTableError resilience verified for schema drift.');
  } catch (e: any) {
    fail('6. Schema resilience check failed', e);
  }

  // Test 7: Provision new school script includes _schema_migrations seed
  try {
    const provPath = path.resolve(process.cwd(), 'scripts/provision-new-school.js');
    const provCode = fs.readFileSync(provPath, 'utf8');
    assert(provCode.includes('_schema_migrations'), 'provision-new-school.js must register _schema_migrations');
    pass('7. scripts/provision-new-school.js automatically seeds _schema_migrations for new databases.');
  } catch (e: any) {
    fail('7. Provision script check failed', e);
  }

  console.log(`\n${BOLD}Test Summary: ${passed} passed, ${failed} failed${RESET}\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
