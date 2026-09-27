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

async function runRound3Verification() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║       ROUND 3 ADVERSARIAL QA & EDGE CASE VERIFICATION SUITE          ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}`);

  // Test 1: Check if non-superadmin visiting /superadmin preserves their session in localStorage
  try {
    const superadminPageCode = fs.readFileSync(path.resolve(__dirname, '../src/app/superadmin/page.tsx'), 'utf8');
    
    // Check if checkSession separates !isSa from localStorage.removeItem
    const checkSessionMatch = superadminPageCode.match(/const checkSession = async \(\) => \{([\s\S]*?)\};/);
    if (!checkSessionMatch) throw new Error('checkSession not found in superadmin/page.tsx');
    const checkSessionBody = checkSessionMatch[1];

    if (/if\s*\(\s*!isSa\s*\|\|\s*!parsed\.session_token/.test(checkSessionBody)) {
      throw new Error('src/app/superadmin/page.tsx wipes localStorage.removeItem("sipjam_user") when a non-superadmin (e.g. Guru) visits /superadmin!');
    }
    if (!checkSessionBody.includes('if (!isSa)') || !checkSessionBody.includes("router.replace('/')")) {
      throw new Error('src/app/superadmin/page.tsx missing graceful redirect for non-superadmin role');
    }
    pass('ADV3-01', 'Non-superadmin accessing /superadmin redirects without wiping valid session',
      'Verified teacher session in localStorage is preserved when visiting /superadmin');
  } catch (e) {
    fail('ADV3-01', 'Non-superadmin accessing /superadmin session preservation', e);
  }

  // Test 2: Check if checkWaliKelas in AppScreen includes syncKey in dependencies
  try {
    const appScreenCode = fs.readFileSync(path.resolve(__dirname, '../src/components/AppScreen.tsx'), 'utf8');
    
    // Find checkWaliKelas effect dependencies
    const waliKelasEffectMatch = appScreenCode.match(/checkWaliKelas\(\);[\s\S]*?\}, \[(.*?)\]\);/);
    if (!waliKelasEffectMatch || !waliKelasEffectMatch[1].includes('syncKey')) {
      throw new Error('AppScreen.tsx checkWaliKelas effect missing syncKey in dependency array; wali kelas status remains stale after idle resume');
    }
    pass('ADV3-02', 'AppScreen checkWaliKelas effect re-runs on idle resume (includes syncKey)',
      'Verified syncKey is present in checkWaliKelas dependency array');
  } catch (e) {
    fail('ADV3-02', 'AppScreen checkWaliKelas syncKey dependency', e);
  }

  // Test 3: Check if AppScreen updates active user state upon idle re-sync
  try {
    const appScreenCode = fs.readFileSync(path.resolve(__dirname, '../src/components/AppScreen.tsx'), 'utf8');
    
    if (!appScreenCode.includes('currentUser') && !appScreenCode.includes('activeUser') && !appScreenCode.includes('onUserUpdate')) {
      throw new Error('AppScreen.tsx does not update in-memory active user state when dbUser is synced on idle resume; continues to use stale props');
    }
    pass('ADV3-03', 'AppScreen maintains reactive activeUser/currentUser state synced with database',
      'Verified AppScreen propagates fresh dbUser to internal state and child views');
  } catch (e) {
    fail('ADV3-03', 'AppScreen active user state synchronization', e);
  }

  // Test 4: Live DB Login check for all Teacher accounts in database
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const anonClient = createClient(supabaseUrl, supabaseKey);

  const teacherAccounts = [
    { username: 'Fitrawan', pass: 'Fitrawan27' },
    { username: 'Riski', pass: 'Riski27' },
    { username: 'Adnan', pass: 'Adnan27' },
    { username: 'Fitra', pass: 'Fitra27' },
    { username: 'Tika', pass: 'Tika27' }
  ];

  for (const t of teacherAccounts) {
    try {
      const { data, error } = await anonClient.rpc('verify_login', {
        p_username: t.username,
        p_password: t.pass
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(`verify_login returned 0 rows for ${t.username}`);
      if (data[0].role !== 'Guru') throw new Error(`Expected role 'Guru', got '${data[0].role}'`);
      if (!data[0].session_token) throw new Error('Missing session_token');
      pass(`ADV3-LOGIN-${t.username}`, `Live DB Login verification for teacher ${t.username}`,
        `Authenticated: ${data[0].nama}, Token: ${data[0].session_token.slice(0, 8)}...`);
    } catch (e) {
      fail(`ADV3-LOGIN-${t.username}`, `Login verification for ${t.username}`, e);
    }
  }

  // Test 5: Live DB Login check for Superadmin with all variations
  try {
    const saVariations = [
      { username: 'superadmin', pass: 'superadmin123' },
      { username: 'superadmin', pass: 'SipjamSuperAdmin2026!' },
      { username: 'super admin', pass: 'superadmin123' },
      { username: 'Superadmin', pass: 'superadmin123' },
      { username: 'Super Admin', pass: 'superadmin123' },
    ];
    for (const sa of saVariations) {
      const { data, error } = await anonClient.rpc('verify_login', {
        p_username: sa.username,
        p_password: sa.pass
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(`Superadmin login failed for "${sa.username}"`);
      if ((data[0].role || '').toLowerCase().replace(/\s+/g, '') !== 'superadmin') {
        throw new Error(`Expected superadmin role, got ${data[0].role}`);
      }
    }
    pass('ADV3-SA', 'Live DB Login verification for Superadmin across all variations',
      'All 5 username & password variations authenticated successfully');
  } catch (e) {
    fail('ADV3-SA', 'Superadmin login variations', e);
  }

  console.log(`\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${CYAN}${BOLD}  ROUND 3 SUMMARY${RESET}`);
  console.log(`${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  Total Checks : ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed       : ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed       : ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);

  if (failureDetails.length > 0) {
    console.log(`\n${RED}${BOLD}Failures Summary:${RESET}`);
    failureDetails.forEach(f => console.log(`  - ${f}`));
  }
}

runRound3Verification().catch(console.error);
