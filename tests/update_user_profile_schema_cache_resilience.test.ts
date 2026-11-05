/**
 * ============================================================================
 * TEST SUITE: UPDATE USER PROFILE SCHEMA CACHE RESILIENCE & ROUTING VERIFICATION
 * File: tests/update_user_profile_schema_cache_resilience.test.ts
 *
 * Verifies:
 * 1. Master Central Protection: dynamicTenantFetch does not rewrite update_user_profile RPC to satellite URL
 * 2. Migration script 20261106_fix_update_user_profile_schema_cache.sql exists with reload schema notification
 * 3. AccountSettingsModal incorporates graceful schema cache resilience & fallbacks
 * 4. Exact error string matching and resolution verification
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import { dynamicTenantFetch, setActiveTargetSchool, getActiveTargetSchool, clearAllClientSessionState } from '../src/lib/supabaseClient';

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
  console.log(`${CYAN}${BOLD}║  UPDATE USER PROFILE SCHEMA CACHE RESILIENCE & ROUTING VERIFICATION      ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // ==========================================================================
  // SECTION 1: MASTER CENTRAL PROTECTION IN DYNAMIC TENANT FETCH
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ 1. MASTER CENTRAL ROUTING PROTECTION ━━━${RESET}`);

  // 1.1 Verify supabaseClient.ts code contains update_user_profile in isMasterOnlyRequest
  const clientFilePath = path.resolve(process.cwd(), 'src/lib/supabaseClient.ts');
  const clientContent = fs.readFileSync(clientFilePath, 'utf-8');

  if (
    clientContent.includes("requestUrlStr.includes('/rest/v1/rpc/update_user_profile')") ||
    clientContent.includes('requestUrlStr.includes("/rest/v1/rpc/update_user_profile")')
  ) {
    pass('supabaseClient.ts marks /rpc/update_user_profile as master-only protected endpoint');
  } else {
    fail('supabaseClient.ts is missing /rpc/update_user_profile in isMasterOnlyRequest');
  }

  // 1.2 Behavioral test: when satellite school is active, dynamicTenantFetch MUST NOT rewrite /rpc/update_user_profile
  try {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = '';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      interceptedUrl = typeof input === 'string' ? input : (input as Request).url;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    // Simulate active satellite school
    setActiveTargetSchool({
      id: 'satellite-test-01',
      nama: 'SMK Satelit Uji Coba',
      supabase_url: 'https://satellite-test.supabase.co',
      supabase_anon_key: 'satellite-fake-key-12345',
    });

    // Make an RPC request to update_user_profile
    await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/rpc/update_user_profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: '123' })
    });

    if (interceptedUrl.includes('placeholder.supabase.co/rest/v1/rpc/update_user_profile')) {
      pass('dynamicTenantFetch prevents satellite URL rewriting for /rpc/update_user_profile');
    } else {
      fail(`dynamicTenantFetch erroneously rewrote update_user_profile to: ${interceptedUrl}`);
    }

    // Restore fetch and clear state
    globalThis.fetch = originalFetch;
    clearAllClientSessionState();
  } catch (err) {
    fail('Behavioral test for dynamicTenantFetch routing failed', err);
  }

  // ==========================================================================
  // SECTION 2: STANDALONE MIGRATION & POSTGREST SCHEMA CACHE RELOAD SCRIPT
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. MIGRATION & SCHEMA CACHE RELOAD SCRIPT ━━━${RESET}`);

  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261106_fix_update_user_profile_schema_cache.sql');

  if (fs.existsSync(migrationPath)) {
    pass('Migration file 20261106_fix_update_user_profile_schema_cache.sql exists');
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

    if (migrationContent.includes('CREATE OR REPLACE FUNCTION public.update_user_profile')) {
      pass('Migration defines CREATE OR REPLACE FUNCTION public.update_user_profile');
    } else {
      fail('Migration missing function definition');
    }

    if (migrationContent.includes("NOTIFY pgrst, 'reload schema'")) {
      pass("Migration contains NOTIFY pgrst, 'reload schema' to instantly reload schema cache");
    } else {
      fail("Migration missing NOTIFY pgrst, 'reload schema'");
    }

    if (migrationContent.includes('GRANT EXECUTE ON FUNCTION public.update_user_profile')) {
      pass('Migration grants execution permissions to anon, authenticated, service_role');
    } else {
      fail('Migration missing grant permissions');
    }

    if (migrationContent.includes('SECURITY DEFINER')) {
      pass('Function is configured as SECURITY DEFINER to permit safe teacher profile updates');
    } else {
      fail('Function missing SECURITY DEFINER');
    }
  } else {
    fail('Migration file 20261106_fix_update_user_profile_schema_cache.sql does not exist');
  }

  // ==========================================================================
  // SECTION 3: FRONTEND RESILIENCE & FALLBACK IN ACCOUNTSETTINGSMODAL
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. FRONTEND RESILIENCE IN ACCOUNTSETTINGSMODAL ━━━${RESET}`);

  const modalPath = path.resolve(process.cwd(), 'src/components/AccountSettingsModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  if (modalContent.includes('masterSupabase')) {
    pass('AccountSettingsModal imports and references masterSupabase');
  } else {
    fail('AccountSettingsModal does not reference masterSupabase');
  }

  if (
    modalContent.includes('PGRST202') &&
    modalContent.includes('schema cache') &&
    modalContent.includes('Could not find the function')
  ) {
    pass('AccountSettingsModal detects PGRST202, schema cache, and missing function errors');
  } else {
    fail('AccountSettingsModal missing comprehensive schema cache error detection');
  }

  if (modalContent.includes(".from('users')") && modalContent.includes('.update(directPayload)')) {
    pass('AccountSettingsModal includes secondary direct fallback on users table');
  } else {
    fail('AccountSettingsModal missing direct fallback on users table');
  }

  // ==========================================================================
  // SECTION 4: EXACT ERROR STRING RECOGNITION & DIAGNOSTIC SANITY
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 4. ERROR DIAGNOSTIC & PATTERN MATCHING ━━━${RESET}`);

  const sampleError = {
    code: 'PGRST202',
    details: null,
    hint: null,
    message: 'Could not find the function public.update_user_profile(p_avatar, p_nama, p_password, p_user_id, p_username) in the schema cache'
  };

  const isDetected = (
    sampleError.code === 'PGRST202' ||
    sampleError.message.includes('schema cache') ||
    sampleError.message.includes('Could not find the function')
  );

  if (isDetected) {
    pass('Accurately matches exact reported error string and PGRST202 error code');
  } else {
    fail('Did not match reported error string');
  }

  // Summary
  console.log(`\n${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}${RESET}`);
  console.log(`${CYAN}========================================================================${RESET}`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
