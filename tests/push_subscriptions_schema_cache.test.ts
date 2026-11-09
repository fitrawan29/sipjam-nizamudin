import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { isSchemaCacheOrMissingTableError } from '../src/lib/supabaseClient';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('PUSH SUBSCRIPTIONS SCHEMA CACHE & USER_AGENT TEST SUITE');
  console.log('================================================================\n');

  // 1. Verification of Migration SQL Script
  console.log('--- 1. Verification of Migration SQL Script ---');
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261109_fix_push_subscriptions_user_agent_schema_cache.sql');
  assert(fs.existsSync(migrationPath), 'Migration file 20261109_fix_push_subscriptions_user_agent_schema_cache.sql exists');

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  assert(
    migrationContent.includes('ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_agent TEXT'),
    'Migration idempotently adds user_agent column'
  );
  assert(
    migrationContent.includes("NOTIFY pgrst, 'reload schema'"),
    "Migration issues NOTIFY pgrst, 'reload schema' to reload schema cache"
  );
  assert(
    migrationContent.includes('push_subscriptions_endpoint_key'),
    'Migration guarantees unique constraint on endpoint for upsert support'
  );
  assert(
    migrationContent.includes('ALTER TABLE public.push_subscriptions ALTER COLUMN sekolah_id DROP NOT NULL'),
    'Migration allows nullable sekolah_id for Superadmin push subscriptions'
  );

  // 2. Verification of SETUP_NEW_SCHOOL_TEMPLATE.sql
  console.log('\n--- 2. Verification of SETUP_NEW_SCHOOL_TEMPLATE.sql ---');
  const templatePath = path.join(__dirname, '..', 'supabase', 'SETUP_NEW_SCHOOL_TEMPLATE.sql');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  assert(
    templateContent.includes('user_agent TEXT'),
    'SETUP_NEW_SCHOOL_TEMPLATE.sql includes user_agent column in push_subscriptions'
  );
  assert(
    templateContent.includes('endpoint TEXT NOT NULL UNIQUE'),
    'SETUP_NEW_SCHOOL_TEMPLATE.sql marks endpoint as UNIQUE in push_subscriptions'
  );

  // 3. Verification of isSchemaCacheOrMissingTableError Helper
  console.log('\n--- 3. Verification of isSchemaCacheOrMissingTableError Helper ---');
  const testErrorStr = "Could not find the 'user_agent' column of 'push_subscriptions' in the schema cache";
  assert(
    isSchemaCacheOrMissingTableError(testErrorStr),
    'isSchemaCacheOrMissingTableError recognizes exact error string'
  );

  const testErrorObj = {
    code: 'PGRST204',
    message: "Could not find the 'user_agent' column of 'push_subscriptions' in the schema cache",
    details: null,
    hint: null
  };
  assert(
    isSchemaCacheOrMissingTableError(testErrorObj),
    'isSchemaCacheOrMissingTableError recognizes PostgREST error object with code PGRST204'
  );

  const testWrappedError = {
    error: {
      message: "Could not find the 'user_agent' column of 'push_subscriptions' in the schema cache"
    }
  };
  assert(
    isSchemaCacheOrMissingTableError(testWrappedError),
    'isSchemaCacheOrMissingTableError recognizes wrapped error object'
  );

  const normalError = { code: '23505', message: 'duplicate key value violates unique constraint' };
  assert(
    !isSchemaCacheOrMissingTableError(normalError),
    'isSchemaCacheOrMissingTableError does not misclassify unrelated errors'
  );

  // 4. Verification of API Route Implementation
  console.log('\n--- 4. Verification of /api/push/subscribe Route Logic ---');
  const routePath = path.join(__dirname, '..', 'src', 'app', 'api', 'push', 'subscribe', 'route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf8');
  assert(
    routeContent.includes("isSchemaCacheOrMissingTableError"),
    'route.ts imports and uses isSchemaCacheOrMissingTableError'
  );
  assert(
    routeContent.includes("delete fallbackRow.user_agent"),
    'route.ts removes user_agent and retries upsert upon schema cache column error'
  );
  assert(
    routeContent.toLowerCase().includes("retrying without user_agent"),
    'route.ts logs warning and gracefully recovers from missing user_agent'
  );

  // 5. Test API Route Invocation with Incomplete Body
  console.log('\n--- 5. Verification of Input Validation in /api/push/subscribe ---');
  const { POST } = await import('../src/app/api/push/subscribe/route');

  const reqInvalid = new NextRequest('http://localhost:3000/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: null })
  });
  const resInvalid = await POST(reqInvalid);
  assert(resInvalid.status === 400, 'POST rejects empty subscription with 400 status');

  const reqMissingKeys = new NextRequest('http://localhost:3000/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: { endpoint: 'https://example.com' } })
  });
  const resMissingKeys = await POST(reqMissingKeys);
  assert(resMissingKeys.status === 400, 'POST rejects missing keys with 400 status');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
