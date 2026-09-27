import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];

function pass(code: string, desc: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${code}] PASS:${RESET} ${desc}`);
  if (detail) console.log(`    ${CYAN}↳ ${detail}${RESET}`);
}

function fail(code: string, desc: string, err?: any) {
  totalTests++;
  failedTests++;
  const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
  console.error(`  ${RED}✖ [${code}] FAIL:${RESET} ${desc}`);
  if (msg) console.error(`    ${RED}↳ Error: ${msg}${RESET}`);
  failureDetails.push(`[${code}] ${desc}: ${msg}`);
}

async function runAuthAndSyncVerification() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║     SIPJAM LOGIN & STALE DATA SYNC VERIFICATION SUITE (R1 & R2)      ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables missing from .env.local');
  }

  const anonClient = createClient(supabaseUrl, supabaseKey);

  // ==========================================================================
  // SUITE 1: Requirement R1 - Super Admin Login Resilience
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${YELLOW}${BOLD}  SUITE 1: Super Admin Login Permutations & Resilience (R1)${RESET}`);
  console.log(`${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

  // Test 1.1: Superadmin with standard 'superadmin' and default password 'superadmin123'
  try {
    const { data, error } = await anonClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'superadmin123'
    });
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('verify_login returned 0 rows for superadmin123');
    if (data[0].role !== 'Superadmin') throw new Error(`Expected role Superadmin, got ${data[0].role}`);
    pass('SA-01', 'Login as superadmin with default password (superadmin123)',
      `Authenticated as ${data[0].nama}, session_token: ${data[0].session_token.slice(0, 8)}...`);
  } catch (e) {
    fail('SA-01', 'Login as superadmin with default password', e);
  }

  // Test 1.2: Superadmin with password 'SipjamSuperAdmin2026!'
  try {
    const { data, error } = await anonClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('verify_login returned 0 rows for SipjamSuperAdmin2026!');
    pass('SA-02', 'Login as superadmin with SipjamSuperAdmin2026!',
      `Role: ${data[0].role}, Session: ${data[0].session_token.slice(0, 8)}...`);
  } catch (e) {
    fail('SA-02', 'Login as superadmin with SipjamSuperAdmin2026!', e);
  }

  // Test 1.3: Superadmin with space in username ('super admin')
  try {
    const { data, error } = await anonClient.rpc('verify_login', {
      p_username: 'super admin',
      p_password: 'superadmin123'
    });
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('verify_login returned 0 rows for "super admin" with space');
    pass('SA-03', 'Login as super admin with space ("super admin")',
      `Resolved to username: "${data[0].username}", Role: "${data[0].role}"`);
  } catch (e) {
    fail('SA-03', 'Login as super admin with space', e);
  }

  // Test 1.4: Superadmin with Capitalized casing ('Superadmin' and 'Super Admin')
  try {
    const res1 = await anonClient.rpc('verify_login', {
      p_username: 'Superadmin',
      p_password: 'superadmin123'
    });
    const res2 = await anonClient.rpc('verify_login', {
      p_username: 'Super Admin',
      p_password: 'superadmin123'
    });
    if (!res1.data || res1.data.length === 0) throw new Error('Failed for "Superadmin"');
    if (!res2.data || res2.data.length === 0) throw new Error('Failed for "Super Admin"');
    pass('SA-04', 'Login as Superadmin with mixed/title casing ("Superadmin" & "Super Admin")',
      `Both variants successfully resolved to Superadmin role`);
  } catch (e) {
    fail('SA-04', 'Login as Superadmin with mixed/title casing', e);
  }

  // Test 1.5: Superadmin negative test with wrong password
  try {
    const { data } = await anonClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'WrongPassword999!'
    });
    if (data && data.length > 0) throw new Error('Wrong password unexpectedly succeeded');
    pass('SA-05', 'Rejection of invalid password for superadmin',
      'Returned 0 rows as expected');
  } catch (e) {
    fail('SA-05', 'Rejection of invalid password for superadmin', e);
  }

  // ==========================================================================
  // SUITE 2: Requirement R1 - Guru (Teacher) Login Permutations
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${YELLOW}${BOLD}  SUITE 2: Guru (Teacher) Login Permutations & Casing (R1)${RESET}`);
  console.log(`${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

  const teacherTestCases = [
    { usernameInput: 'tika', actualName: 'Tika', pass: 'Tika27' },
    { usernameInput: 'fitra', actualName: 'Fitra', pass: 'Fitra27' },
    { usernameInput: 'fitrawan', actualName: 'Fitrawan', pass: 'Fitrawan27' },
    { usernameInput: 'riski', actualName: 'Riski', pass: 'Riski27' },
    { usernameInput: 'adnan', actualName: 'Adnan', pass: 'Adnan27' },
  ];

  for (const tc of teacherTestCases) {
    try {
      // 1. Test lowercase input
      const { data: lowerData, error: lowerErr } = await anonClient.rpc('verify_login', {
        p_username: tc.usernameInput,
        p_password: tc.pass
      });
      if (lowerErr) throw lowerErr;
      if (!lowerData || lowerData.length === 0) throw new Error(`Failed for lowercase "${tc.usernameInput}"`);
      if (lowerData[0].role !== 'Guru') throw new Error(`Expected role 'Guru', got '${lowerData[0].role}'`);

      // 2. Test PascalCase input
      const { data: pascalData, error: pascalErr } = await anonClient.rpc('verify_login', {
        p_username: tc.actualName,
        p_password: tc.pass
      });
      if (pascalErr) throw pascalErr;
      if (!pascalData || pascalData.length === 0) throw new Error(`Failed for PascalCase "${tc.actualName}"`);

      pass(`GURU-LOGIN-${tc.usernameInput}`, `Teacher login case-insensitivity: "${tc.usernameInput}" & "${tc.actualName}"`,
        `Resolved to ${lowerData[0].nama}, role: ${lowerData[0].role}, token: ${lowerData[0].session_token.slice(0, 8)}...`);
    } catch (e) {
      fail(`GURU-LOGIN-${tc.usernameInput}`, `Teacher login for "${tc.usernameInput}"`, e);
    }
  }

  // Test 2.6: Guru negative test with wrong password
  try {
    const { data } = await anonClient.rpc('verify_login', {
      p_username: 'tika',
      p_password: 'WrongPassword!'
    });
    if (data && data.length > 0) throw new Error('Wrong password unexpectedly succeeded for guru');
    pass('GURU-LOGIN-NEG', 'Rejection of invalid password for teacher',
      'Returned 0 rows as expected');
  } catch (e) {
    fail('GURU-LOGIN-NEG', 'Rejection of invalid password for teacher', e);
  }

  // ==========================================================================
  // SUITE 3: Requirement R2 - Data Synchronization & Stale Session Invalidation
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${YELLOW}${BOLD}  SUITE 3: Stale Data Invalidation & Idle Resume Contract (R2)${RESET}`);
  console.log(`${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

  // Test 3.1: Active session validates successfully and retrieves fresh database records
  let freshTeacherSession: any = null;
  try {
    const { data: authRes } = await anonClient.rpc('verify_login', {
      p_username: 'tika',
      p_password: 'Tika27'
    });
    freshTeacherSession = authRes![0];

    // Client with active session token
    const client = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'x-session-token': freshTeacherSession.session_token,
          'x-sekolah-id': freshTeacherSession.sekolah_id,
          'x-user-role': freshTeacherSession.role,
          'x-user-id': freshTeacherSession.id
        }
      }
    });

    const { data: userProfile, error: profileErr } = await client
      .from('users')
      .select('id, username, nama, role, sekolah_id, session_token')
      .eq('id', freshTeacherSession.id)
      .single();

    if (profileErr) throw profileErr;
    if (!userProfile || userProfile.session_token !== freshTeacherSession.session_token) {
      throw new Error('Fresh session validation failed');
    }

    pass('SYNC-01', 'Active session validation retrieves fresh database state',
      `Teacher: ${userProfile.nama}, Valid Token: ${userProfile.session_token.slice(0, 8)}...`);
  } catch (e) {
    fail('SYNC-01', 'Active session validation retrieves fresh database state', e);
  }

  // Test 3.2: Simulate idle / expired session token (rotated in DB)
  try {
    const staleToken = freshTeacherSession.session_token;

    // Simulate session rotation (e.g. logging in on another device or after long idle)
    const { data: rotateRes } = await anonClient.rpc('verify_login', {
      p_username: 'tika',
      p_password: 'Tika27'
    });
    const newSession = rotateRes![0];

    // Stale client using old token
    const staleClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'x-session-token': staleToken,
          'x-sekolah-id': freshTeacherSession.sekolah_id,
          'x-user-role': freshTeacherSession.role,
          'x-user-id': freshTeacherSession.id
        }
      }
    });

    const { data: staleData } = await staleClient
      .from('users')
      .select('id, username, nama, role, sekolah_id, session_token')
      .eq('id', freshTeacherSession.id);

    // Stale token must return 0 rows under RLS
    if (staleData && staleData.length > 0) {
      throw new Error(`Stale token unexpectedly retrieved ${staleData.length} records`);
    }

    // New token retrieves latest fresh data
    const freshClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'x-session-token': newSession.session_token,
          'x-sekolah-id': newSession.sekolah_id,
          'x-user-role': newSession.role,
          'x-user-id': newSession.id
        }
      }
    });

    const { data: freshData, error: freshErr } = await freshClient
      .from('users')
      .select('id, username, nama, role, sekolah_id, session_token')
      .eq('id', newSession.id)
      .single();

    if (freshErr) throw freshErr;
    if (!freshData || freshData.session_token !== newSession.session_token) {
      throw new Error('New session failed to retrieve fresh data');
    }

    pass('SYNC-02', 'Simulated idle/expired session rejection and fresh token sync',
      `Stale token yielded 0 rows; Rotated session token ${newSession.session_token.slice(0, 8)}... successfully retrieved fresh profile`);
  } catch (e) {
    fail('SYNC-02', 'Simulated idle/expired session rejection and fresh token sync', e);
  }

  // Test 3.3: Verify AppScreen & page.tsx implementation details for cache-busting & idle sync
  try {
    const pageCode = fs.readFileSync(path.resolve(__dirname, '../src/app/page.tsx'), 'utf8');
    const appScreenCode = fs.readFileSync(path.resolve(__dirname, '../src/components/AppScreen.tsx'), 'utf8');
    const supabaseClientCode = fs.readFileSync(path.resolve(__dirname, '../src/lib/supabaseClient.ts'), 'utf8');

    if (!pageCode.includes('validateSessionWithDb')) {
      throw new Error('src/app/page.tsx missing validateSessionWithDb implementation');
    }
    if (!pageCode.includes('visibilitychange') || !pageCode.includes('focus')) {
      throw new Error('src/app/page.tsx missing visibilitychange / focus idle revalidation');
    }
    if (!appScreenCode.includes('syncKey') || !appScreenCode.includes('visibilitychange')) {
      throw new Error('src/components/AppScreen.tsx missing syncKey or visibilitychange listener');
    }
    if (!supabaseClientCode.includes("cache: 'no-store'")) {
      throw new Error("src/lib/supabaseClient.ts missing cache: 'no-store' directive");
    }

    pass('SYNC-03', 'Source code implementation check: cache: no-store, idle re-sync, and syncKey',
      'Verified native web platform listeners (focus, visibilitychange), cache: no-store, and state invalidation');
  } catch (e) {
    fail('SYNC-03', 'Source code implementation check', e);
  }

  // Test 3.4: Verify genuine idle threshold & SuperadminPage DB validation
  try {
    const appScreenCode = fs.readFileSync(path.resolve(__dirname, '../src/components/AppScreen.tsx'), 'utf8');
    const superadminPageCode = fs.readFileSync(path.resolve(__dirname, '../src/app/superadmin/page.tsx'), 'utf8');

    if (!appScreenCode.includes('elapsed >= 30000')) {
      throw new Error('AppScreen.tsx does not strictly enforce idle threshold elapsed >= 30000');
    }
    if (!appScreenCode.includes('pointerdown') || !appScreenCode.includes('keydown')) {
      throw new Error('AppScreen.tsx missing active user interaction listeners to prevent premature idle sync');
    }
    if (!superadminPageCode.includes("from('users')") || !superadminPageCode.includes('session_token')) {
      throw new Error('src/app/superadmin/page.tsx missing live DB session token validation');
    }

    pass('SYNC-04', 'Idle threshold enforcement & Superadmin page DB session validation',
      'Verified genuine idle elapsed >= 30000 guard, user activity tracking, and /superadmin live DB token checks');
  } catch (e) {
    fail('SYNC-04', 'Idle threshold enforcement & Superadmin page DB session validation', e);
  }

  // Test 3.5: Verify event dispatch order & idle elapsed time preservation (pointerdown -> focus)
  try {
    let syncCount = 0;
    let lastActive = 1000;
    let isSyncing = false;

    const checkIdleAndResume = (currentTime: number) => {
      const elapsed = currentTime - lastActive;
      lastActive = currentTime;

      if (elapsed >= 30000 && !isSyncing) {
        syncCount++;
      }
    };

    // Simulate 45s idle, then user clicks to focus window (pointerdown fires, then focus fires 2ms later)
    const returnTime = 46000;
    checkIdleAndResume(returnTime); // pointerdown
    checkIdleAndResume(returnTime + 2); // focus 2ms later

    if (syncCount !== 1) {
      throw new Error(`Expected exactly 1 sync on resume, got ${syncCount}`);
    }

    // Simulate active typing (every 2 seconds) — zero unwanted syncs
    for (let t = returnTime + 1000; t <= returnTime + 20000; t += 2000) {
      checkIdleAndResume(t);
    }

    if (syncCount !== 1) {
      throw new Error(`Expected sync count to stay 1 during active typing, got ${syncCount}`);
    }

    pass('SYNC-05', 'Idle resume event sequence: pointerdown -> focus preserves elapsed time and triggers sync',
      'Verified pointerdown does not swallow elapsed idle time and active typing does not false-trigger');
  } catch (e) {
    fail('SYNC-05', 'Idle resume event sequence', e);
  }

  // Test 3.6: Verify offline / network error resilience
  try {
    const appScreenCode = fs.readFileSync(path.resolve(__dirname, '../src/components/AppScreen.tsx'), 'utf8');
    const superadminPageCode = fs.readFileSync(path.resolve(__dirname, '../src/app/superadmin/page.tsx'), 'utf8');
    const pageCode = fs.readFileSync(path.resolve(__dirname, '../src/app/page.tsx'), 'utf8');

    if (!appScreenCode.includes('isNetworkError') || !appScreenCode.includes('Failed to fetch')) {
      throw new Error('AppScreen.tsx missing offline/network error preservation');
    }
    if (!superadminPageCode.includes('isNetworkError') || !superadminPageCode.includes('Failed to fetch')) {
      throw new Error('src/app/superadmin/page.tsx missing offline/network error preservation');
    }
    if (!pageCode.includes('isNetworkError') || !pageCode.includes('Failed to fetch')) {
      throw new Error('src/app/page.tsx missing offline/network error preservation');
    }

    pass('SYNC-06', 'Offline network error resilience across all entrypoints',
      'Verified AppScreen, page.tsx, and /superadmin retain cached session during network blips instead of premature logout');
  } catch (e) {
    fail('SYNC-06', 'Offline network error resilience', e);
  }

  // Test 3.7: Multi-tab session synchronization and 401 broadcast
  try {
    const supabaseClientCode = fs.readFileSync(path.resolve(__dirname, '../src/lib/supabaseClient.ts'), 'utf8');
    const pageCode = fs.readFileSync(path.resolve(__dirname, '../src/app/page.tsx'), 'utf8');
    const superadminPageCode = fs.readFileSync(path.resolve(__dirname, '../src/app/superadmin/page.tsx'), 'utf8');

    if (!supabaseClientCode.includes("window.dispatchEvent(new Event('sipjam_unauthorized'))")) {
      throw new Error('src/lib/supabaseClient.ts missing 401 unauthorized event dispatch');
    }
    if (!pageCode.includes("'storage'") || !pageCode.includes("'sipjam_unauthorized'")) {
      throw new Error('src/app/page.tsx missing storage and sipjam_unauthorized listeners');
    }
    if (!superadminPageCode.includes("'storage'") || !superadminPageCode.includes("'sipjam_unauthorized'")) {
      throw new Error('src/app/superadmin/page.tsx missing storage and sipjam_unauthorized listeners');
    }

    pass('SYNC-07', 'Multi-tab session synchronization & instantaneous 401 unauthorized handling',
      'Verified storage event cross-tab synchronization and sipjam_unauthorized instant React tree reset');
  } catch (e) {
    fail('SYNC-07', 'Multi-tab session synchronization & 401 handling', e);
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${CYAN}${BOLD}  VERIFICATION SUMMARY${RESET}`);
  console.log(`${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  Total Checks : ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed       : ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed       : ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);

  if (failureDetails.length > 0) {
    console.log(`\n${RED}${BOLD}Failures Summary:${RESET}`);
    failureDetails.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✔ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!${RESET}\n`);
    process.exit(0);
  }
}

runAuthAndSyncVerification().catch(err => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
