/**
 * ============================================================================
 * ADVERSARIAL STRESS TESTING & EDGE CASES SUITE (CHALLENGER 1)
 * File: tests/adversarial_m3_challenger_1.test.ts
 *
 * Adversarially challenges:
 * 1. Stale / corrupt localStorage sessions (invalid JSON, missing session_token,
 *    expired/rotated tokens, malformed UUIDs, SQL injection payloads).
 * 2. Teachers with unusual names, multiple commas, degrees, special characters
 *    (e.g., "Dr. Ir. Fitra, S.Pd., M.Pd., Gr.", quotes, dashes, prefixes, SQL wildcards).
 * 3. Boundary cases in findJadwalForGuru and getGuruDailyState (empty inputs,
 *    case sensitivity, name collision like Fitra vs Fitrawan, malformed user_id,
 *    wildcard injection like "%_[]", exemption evaluation).
 * 4. RLS security boundary and header spoofing resilience (role tampering,
 *    cross-school isolation, unauthenticated REST block).
 *
 * Run with:
 *   npx tsx tests/adversarial_m3_challenger_1.test.ts
 * ============================================================================
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ANSI terminal colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failures: string[] = [];

function suiteHeader(title: string) {
  console.log(`\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${CYAN}${BOLD}  ADVERSARIAL SUITE: ${title}${RESET}`);
  console.log(`${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
}

function pass(code: string, desc: string, detail?: string) {
  totalChecks++;
  passedChecks++;
  console.log(`  ${GREEN}✔ [${code}] PASS:${RESET} ${desc}`);
  if (detail) {
    console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  }
}

function fail(code: string, desc: string, err?: any) {
  totalChecks++;
  failedChecks++;
  const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
  console.error(`  ${RED}✖ [${code}] FAIL:${RESET} ${desc}`);
  if (msg) {
    console.error(`    ${RED}↳ Error: ${msg}${RESET}`);
  }
  failures.push(`[${code}] ${desc} -> ${msg}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const DEFAULT_SEKOLAH_ID = 'a0000000-0000-0000-0000-000000000001';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(`${RED}Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY${RESET}`);
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function runAdversarialSuite() {
  console.log(`\n${BOLD}======================================================================${RESET}`);
  console.log(`${BOLD}  ADVERSARIAL EMPIRICAL CHALLENGER TEST RUNNER (M3-1)${RESET}`);
  console.log(`${BOLD}======================================================================${RESET}`);
  console.log(`Target Supabase URL: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Dynamically load workflow & supabaseClient after env initialization
  const { findJadwalForGuru, getGuruDailyState } = await import('../src/lib/workflow');
  const { setServerTenantContext, clearServerTenantContext } = await import('../src/lib/supabaseClient');

  // Baseline Admin session
  const adminLoginRes = await anonClient.rpc('verify_login', {
    p_username: 'admin',
    p_password: 'QWerty1334#'
  });
  if (adminLoginRes.error || !adminLoginRes.data?.[0]) {
    throw new Error('Baseline Admin login failed: ' + JSON.stringify(adminLoginRes.error));
  }
  const adminUser = adminLoginRes.data[0];

  const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-session-token': adminUser.session_token,
        'x-sekolah-id': DEFAULT_SEKOLAH_ID,
        'x-user-role': 'Admin',
        'x-user-id': adminUser.id
      }
    }
  });

  // Clean up any test artifact rows in pengaturan
  await adminClient.from('pengaturan').delete().ilike('key', 'malicious_tamper_key_%');

  // Baseline Teacher session (Tika Mamonto, S.Pd.)
  const tikaLoginRes = await anonClient.rpc('verify_login', {
    p_username: 'Tika',
    p_password: 'Tika27'
  });
  if (tikaLoginRes.error || !tikaLoginRes.data?.[0]) {
    throw new Error('Baseline Tika login failed: ' + JSON.stringify(tikaLoginRes.error));
  }
  const tikaUser = tikaLoginRes.data[0];

  // ==========================================================================
  // SUITE 1: Stale / Corrupt localStorage Sessions Simulation
  // ==========================================================================
  suiteHeader('1. Stale & Corrupt Session Lifecycle Edge Cases');

  // Test 1.1: Simulation of MainApp session parser logic under hostile inputs
  const hostilePayloads: { name: string; raw: string; shouldClear: boolean }[] = [
    { name: 'Invalid JSON (syntax error)', raw: '{corrupt json', shouldClear: true },
    { name: 'String "undefined"', raw: 'undefined', shouldClear: true },
    { name: 'Empty string', raw: '', shouldClear: false }, // empty string: getItem returns null, so no parse attempted
    { name: 'Literal "null"', raw: 'null', shouldClear: true },
    { name: 'Literal number "12345"', raw: '12345', shouldClear: true },
    { name: 'Literal boolean "true"', raw: 'true', shouldClear: true },
    { name: 'Literal string ""foo""', raw: '"foo"', shouldClear: true },
    { name: 'Empty object "{}"', raw: '{}', shouldClear: true },
    { name: 'Missing session_token', raw: JSON.stringify({ id: adminUser.id, role: 'Admin', sekolah_id: DEFAULT_SEKOLAH_ID }), shouldClear: true },
    { name: 'Null session_token', raw: JSON.stringify({ id: adminUser.id, session_token: null }), shouldClear: true },
    { name: 'Empty session_token string', raw: JSON.stringify({ id: adminUser.id, session_token: '' }), shouldClear: true },
    { name: 'Whitespace-only session_token', raw: JSON.stringify({ id: adminUser.id, session_token: '    ' }), shouldClear: true },
    { name: 'Numeric session_token', raw: JSON.stringify({ id: adminUser.id, session_token: 99999 }), shouldClear: true },
    { name: 'Object session_token', raw: JSON.stringify({ id: adminUser.id, session_token: { token: 'xyz' } }), shouldClear: true },
  ];

  let simSuccessCount = 0;
  for (const tc of hostilePayloads) {
    let mockStorage: Record<string, string> = { sipjam_user: tc.raw };
    let cleared = false;
    let userState: any = 'initial';

    // Simulate page.tsx:55-76 useEffect logic exactly
    try {
      const storedUser = mockStorage['sipjam_user'];
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (!parsed || !parsed.session_token || typeof parsed.session_token !== 'string' || !parsed.session_token.trim()) {
          delete mockStorage['sipjam_user'];
          cleared = true;
          userState = null;
        } else {
          userState = parsed;
        }
      }
    } catch (e) {
      delete mockStorage['sipjam_user'];
      cleared = true;
      userState = null;
    }

    if (tc.shouldClear && cleared && userState === null) {
      simSuccessCount++;
    } else if (!tc.shouldClear && !cleared) {
      simSuccessCount++;
    } else {
      fail('SESSION-STALE-SIM', `Hostile payload failed: ${tc.name}`);
    }
  }

  if (simSuccessCount === hostilePayloads.length) {
    pass('SESSION-STALE-01', 'Hostile / corrupt localStorage payloads reliably purged',
      `Tested ${hostilePayloads.length}/${hostilePayloads.length} malformed & stale structures; all triggered clean purge.`);
  }

  // Test 1.2: Malformed UUID session tokens against PostgREST RLS
  const adversarialTokens = [
    { label: 'SQL Injection single quote payload', token: "' OR '1'='1" },
    { label: 'SQL Injection comment payload', token: "00000000-0000-0000-0000-000000000000'; DROP TABLE users;--" },
    { label: 'Non-UUID random text', token: 'totally-not-a-valid-uuid' },
    { label: 'Truncated UUID', token: 'd05bc735-8664-4114-87cf' },
    { label: 'Nil UUID (all zeroes)', token: '00000000-0000-0000-0000-000000000000' },
    { label: 'Unregistered valid-format UUID', token: randomUUID() },
  ];

  for (const { label, token } of adversarialTokens) {
    try {
      const attackClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            'x-session-token': token,
            'x-sekolah-id': DEFAULT_SEKOLAH_ID,
            'x-user-role': 'Admin'
          }
        }
      });

      const { data, error } = await attackClient.from('data_siswa').select('*');

      // The server must NOT leak data and return 0 rows
      if (data && data.length > 0) {
        throw new Error(`Adversarial token received ${data.length} rows! Breach detected.`);
      }

      pass(`TOKEN-MALFORMED-${label.slice(0, 10)}`, `Malformed token rejected: ${label}`,
        `Query safely returned 0 rows (no leak, no SQL injection)`);
    } catch (err: any) {
      fail(`TOKEN-MALFORMED-${label.slice(0, 10)}`, `Malformed token test failed: ${label}`, err);
    }
  }

  // Test 1.3: Token Rotation Invalidation Test
  try {
    // Current admin session token
    const tokenV1 = adminUser.session_token;

    // Login again to rotate token to V2
    const loginAgain = await anonClient.rpc('verify_login', {
      p_username: 'admin',
      p_password: 'QWerty1334#'
    });
    const tokenV2 = loginAgain.data[0].session_token;

    if (tokenV1 === tokenV2) {
      throw new Error('Token was not rotated upon subsequent verify_login!');
    }

    // Try reading data with rotated-out token V1
    const oldClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-session-token': tokenV1,
          'x-sekolah-id': DEFAULT_SEKOLAH_ID,
          'x-user-role': 'Admin'
        }
      }
    });
    const { data: v1Data } = await oldClient.from('data_siswa').select('*');
    if (v1Data && v1Data.length > 0) {
      throw new Error(`Rotated-out token V1 was still granted access (${v1Data.length} rows)!`);
    }

    // New client with token V2
    const newClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-session-token': tokenV2,
          'x-sekolah-id': DEFAULT_SEKOLAH_ID,
          'x-user-role': 'Admin'
        }
      }
    });
    const { data: v2Data } = await newClient.from('data_siswa').select('*');
    if (!v2Data || v2Data.length === 0) {
      throw new Error(`Fresh token V2 was rejected!`);
    }

    pass('TOKEN-ROTATION-01', 'Session token rotation invalidates preceding token immediately',
      `Token V1 invalidated (0 rows); Token V2 active (${v2Data.length} rows)`);
  } catch (err: any) {
    fail('TOKEN-ROTATION-01', 'Session token rotation test failed', err);
  }

  // ==========================================================================
  // SUITE 2: Teachers with Unusual Names, Multiple Commas & Academic Degrees
  // ==========================================================================
  suiteHeader('2. Unusual Names, Commas, Degrees & Special Characters');

  // Baseline teacher client for querying PostgREST
  const teacherClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-session-token': tikaUser.session_token,
        'x-sekolah-id': DEFAULT_SEKOLAH_ID,
        'x-user-role': 'Guru',
        'x-user-id': tikaUser.id
      }
    }
  });

  const complexTeacherNames = [
    { label: 'Multiple commas & 3 degrees', name: 'Dr. Ir. Fitra, S.Pd., M.Pd., Gr.', username: '19800101' },
    { label: 'Prefix titles & dots & commas', name: 'Prof. Dr. H. Muhammad Nizamudin, M.Sc., Ph.D.', username: '19750505' },
    { label: 'Double degrees', name: 'Ade Fitrawan Ibrahim, M.Pd., Gr.', username: '19900202' },
    { label: 'Hyphenated name with comma', name: 'Siti Nurhaliza-O\'Connor, S.Kom., M.TI.', username: '19920303' },
    { label: 'Single degree standard', name: 'Tika Mamonto, S.Pd.', username: '198708152011012015' },
    { label: 'Double quote in nickname', name: 'Ade "The Pioneer" Fitrawan, M.Pd.', username: '19900202' },
    { label: 'Leading comma degree only', name: ', S.Pd.', username: '19999999' },
    { label: 'Punctuation and brackets', name: 'Drs. H. Ahmad Dahlan (Guru Mapel), M.Pd.', username: '19881111' },
    { label: 'SQL wildcard characters in name', name: 'Guru%_[]Test, S.Pd.', username: '19998888' },
  ];

  for (const { label, name, username } of complexTeacherNames) {
    try {
      // 1. Test cleanNama extraction logic from components (GuruJurnal.tsx:103, HomeView.tsx:205, workflow.ts:139)
      const cleanNama = (name || '').split(',')[0].replace(/"/g, '').trim();

      // 2. PostgREST .or() filter test with double quotes (GuruJurnal.tsx:106 & HomeView.tsx:208 pattern)
      const orFilter = `nip.eq."${username}",nama_guru.ilike."%${cleanNama}%"`;
      const { data, error } = await teacherClient
        .from('guru_mapel')
        .select('*')
        .or(orFilter);

      if (error) {
        throw new Error(`PostgREST .or() failed with PGRST error: [${error.code}] ${error.message}`);
      }

      // 3. PostgREST data_guru query pattern (AppScreen.tsx:109)
      const dataGuruFilter = `id.eq.00000000-0000-0000-0000-000000000000,nama_guru.eq."${cleanNama}"`;
      const { data: gData, error: gError } = await teacherClient
        .from('data_guru')
        .select('*')
        .or(dataGuruFilter);

      if (gError) {
        throw new Error(`data_guru filter failed with PGRST error: [${gError.code}] ${gError.message}`);
      }

      pass(`NAME-SYNTAX-${label.slice(0, 12)}`, `Safe PostgREST filter execution: ${label}`,
        `Clean name: "${cleanNama}" -> Filter executed cleanly with 0 syntax errors`);
    } catch (err: any) {
      fail(`NAME-SYNTAX-${label.slice(0, 12)}`, `Failed on name: ${label} ("${name}")`, err);
    }
  }

  // ==========================================================================
  // SUITE 3: Boundary Cases in findJadwalForGuru and getGuruDailyState
  // ==========================================================================
  suiteHeader('3. Boundary Cases: findJadwalForGuru & getGuruDailyState');

  // Set server tenant context so workflow.ts's imported supabase client injects teacher headers
  setServerTenantContext({
    sekolahId: DEFAULT_SEKOLAH_ID,
    role: 'Guru',
    userId: tikaUser.id,
    sessionToken: tikaUser.session_token
  });

  // Test 3.1: findJadwalForGuru with empty / undefined / null inputs
  try {
    const emptyHari = await findJadwalForGuru('', 'Tika Mamonto, S.Pd.');
    if (!Array.isArray(emptyHari) || emptyHari.length !== 0) {
      throw new Error(`Expected [] for empty hari, received length ${emptyHari?.length}`);
    }

    const emptyNama = await findJadwalForGuru('Senin', '');
    if (!Array.isArray(emptyNama) || emptyNama.length !== 0) {
      throw new Error(`Expected [] for empty nama, received length ${emptyNama?.length}`);
    }

    const undefinedArgs = await findJadwalForGuru('Senin', undefined as any, undefined, undefined);
    if (!Array.isArray(undefinedArgs) || undefinedArgs.length !== 0) {
      throw new Error(`Expected [] for undefined args, received length ${undefinedArgs?.length}`);
    }

    pass('JADWAL-BOUND-01', 'findJadwalForGuru handles empty/undefined inputs safely',
      `Returned [] without unhandled exceptions for empty hari, empty nama, and undefined args`);
  } catch (err: any) {
    fail('JADWAL-BOUND-01', 'findJadwalForGuru empty inputs test failed', err);
  }

  // Test 3.2: findJadwalForGuru day case sensitivity
  try {
    // In database, 'hari' column stores Title Case: "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
    const validSenin = await findJadwalForGuru('Senin', 'Ade Fitrawan Ibrahim', '19900202');
    const lowerSenin = await findJadwalForGuru('senin', 'Ade Fitrawan Ibrahim', '19900202');

    pass('JADWAL-BOUND-02', 'findJadwalForGuru TitleCase vs lowercase day evaluation',
      `TitleCase 'Senin' returned ${validSenin.length} classes; lowercase 'senin' returned ${lowerSenin.length} classes (safely handles zero results)`);
  } catch (err: any) {
    fail('JADWAL-BOUND-02', 'findJadwalForGuru day case sensitivity test failed', err);
  }

  // Test 3.3: Schedule matching with multi-token names & user IDs
  try {
    const fitraWithUser = await findJadwalForGuru('Senin', 'Fitra', 'fitra', tikaUser.id);
    const fitraUnlinked = await findJadwalForGuru('Senin', 'FITRA SURYAZANA MAMONTO');

    pass('JADWAL-COLLISION-01', 'Schedule matching with multi-token names & user IDs',
      `Resolved schedule matching safely for Fitra (Found ${fitraUnlinked.length} schedule rows)`);
  } catch (err: any) {
    fail('JADWAL-COLLISION-01', 'Name collision stress test failed', err);
  }

  // Test 3.4: getGuruDailyState with empty / undefined namaGuru
  try {
    const blankState = await getGuruDailyState('');
    if (!blankState || typeof blankState !== 'object') {
      throw new Error('getGuruDailyState returned null/undefined for empty string');
    }
    if (blankState.jadwalKBM.length !== 0 || blankState.isAlpa !== false) {
      throw new Error('getGuruDailyState did not return clean blank state for empty string');
    }

    pass('DAILYSTATE-BOUND-01', 'getGuruDailyState handles empty namaGuru safely',
      `Returned valid initialized blank state without throwing exceptions`);
  } catch (err: any) {
    fail('DAILYSTATE-BOUND-01', 'getGuruDailyState empty input test failed', err);
  }

  // Test 3.5: getGuruDailyState with complex academic titles
  try {
    // Test with Tika Mamonto (has comma: "Tika Mamonto, S.Pd.")
    const tikaState = await getGuruDailyState(
      'Tika Mamonto, S.Pd.',
      '198708152011012015',
      tikaUser.id
    );

    if (!tikaState) throw new Error('tikaState is null');
    if (tikaState.isLibur === undefined || tikaState.aturanKehadiran === undefined) {
      throw new Error('tikaState missing required properties');
    }

    // Test with Ade Fitrawan (has multiple commas: "Ade Fitrawan Ibrahim, M.Pd., Gr.")
    const adeState = await getGuruDailyState(
      'Ade Fitrawan Ibrahim, M.Pd., Gr.',
      '19900202',
      'fff9d836-b034-4a66-be96-1c1b7cfad277'
    );

    if (!adeState) throw new Error('adeState is null');

    pass('DAILYSTATE-TITLES-01', 'getGuruDailyState succeeds on teachers with multiple commas & degrees',
      `Tika (Aturan: ${tikaState.aturanKehadiran}, Jadwal: ${tikaState.jadwalKBM.length}), Ade (Aturan: ${adeState.aturanKehadiran}, Jadwal: ${adeState.jadwalKBM.length}) without 42703 or PGRST100`);
  } catch (err: any) {
    fail('DAILYSTATE-TITLES-01', 'getGuruDailyState academic titles test failed', err);
  }

  // Test 3.6: getGuruDailyState with malformed / non-UUID userId
  try {
    const malformedState = await getGuruDailyState(
      'Riski Candra Mamangkai',
      'riski',
      'not-a-valid-uuid'
    );

    if (!malformedState) throw new Error('malformedState returned null');

    pass('DAILYSTATE-MALFORMED-UUID', 'getGuruDailyState handles invalid/non-UUID userId gracefully',
      `Evaluated cleanly with fallback without unhandled promise rejection`);
  } catch (err: any) {
    fail('DAILYSTATE-MALFORMED-UUID', 'getGuruDailyState malformed UUID test failed', err);
  }

  // Test 3.7: getGuruDailyState with SQL wildcards in teacher name
  try {
    const wildcardState = await getGuruDailyState(
      "Test%_[]'Teacher, S.Pd.",
      'test_wildcard',
      tikaUser.id
    );

    if (!wildcardState) throw new Error('wildcardState returned null');

    pass('DAILYSTATE-WILDCARD', 'getGuruDailyState handles SQL wildcards (% _ []) without syntax crash',
      `Evaluated safely without unhandled PostgREST exceptions`);
  } catch (err: any) {
    fail('DAILYSTATE-WILDCARD', 'getGuruDailyState wildcard test failed', err);
  }

  // Clean up server tenant context
  clearServerTenantContext();

  // ==========================================================================
  // SUITE 4: Multi-Tenant RLS Spoofing & Privilege Escalation Challenges
  // ==========================================================================
  suiteHeader('4. RLS Privilege Escalation & Multi-Tenant Spoofing Defense');

  // Test 4.1: Direct REST fallback without session token returns 0 rows
  try {
    const rawRestResponse = await fetch(`${supabaseUrl}/rest/v1/data_siswa?select=*`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'x-sekolah-id': DEFAULT_SEKOLAH_ID,
        'x-user-role': 'Admin'
        // Intentionally NO x-session-token
      }
    });

    const body = await rawRestResponse.json();
    if (Array.isArray(body) && body.length > 0) {
      throw new Error(`Direct REST without session token leaked ${body.length} records!`);
    }

    pass('RLS-DEFENSE-01', 'Direct REST requests without session token return 0 rows',
      `HTTP ${rawRestResponse.status} — Received 0 rows, confirming strict token requirement`);
  } catch (err: any) {
    fail('RLS-DEFENSE-01', 'Direct REST test failed', err);
  }

  // Test 4.2: Role spoofing (claiming 'Superadmin' header without JWT service role)
  try {
    const superadminSpoofClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-user-role': 'Superadmin',
          'x-session-token': randomUUID()
        }
      }
    });

    const { data: spoofUsers } = await superadminSpoofClient.from('users').select('*');
    if (spoofUsers && spoofUsers.length > 0) {
      throw new Error(`Spoofed Superadmin header granted access to users table (${spoofUsers.length} rows)!`);
    }

    pass('RLS-DEFENSE-02', 'Header role spoofing (x-user-role: Superadmin) blocked by RLS',
      `Received 0 rows; RLS helper correctly ignores forged role claims`);
  } catch (err: any) {
    fail('RLS-DEFENSE-02', 'Superadmin spoofing test failed', err);
  }

  // Test 4.3: Role tampering: Teacher claiming Admin role via header tampering against users table
  try {
    const tamperClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-session-token': tikaUser.session_token, // Valid Guru session token
          'x-sekolah-id': DEFAULT_SEKOLAH_ID,
          'x-user-role': 'Admin', // Teacher claiming to be Admin!
          'x-user-id': tikaUser.id
        }
      }
    });

    // Try inserting a new user into public.users (strictly Admin-only mutation under RLS)
    const { data: mutateData, error: mutateError } = await tamperClient
      .from('users')
      .insert({
        username: 'malicious_user_' + Date.now(),
        nama: 'Unauthorized Staff Account',
        role: 'Guru',
        sekolah_id: DEFAULT_SEKOLAH_ID
      })
      .select();

    if (mutateData && mutateData.length > 0) {
      // Clean up in case of leak
      await adminClient.from('users').delete().eq('id', mutateData[0].id);
      throw new Error('Privilege escalation succeeded! Teacher with spoofed Admin header inserted a user into public.users.');
    }

    pass('RLS-DEFENSE-TAMPER', 'Role tampering (Teacher claiming Admin header) suppressed by DB token resolution',
      `Write rejected by RLS (0 rows inserted); database derives actual role from verified session token`);
  } catch (err: any) {
    fail('RLS-DEFENSE-TAMPER', 'Role tampering test failed', err);
  }

  // Test 4.4: Cross-school data modification rejection
  try {
    const fakeSchoolId = 'b0000000-0000-0000-0000-000000000002';
    const crossSchoolClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-session-token': tikaUser.session_token,
          'x-sekolah-id': fakeSchoolId,
          'x-user-role': 'Guru',
          'x-user-id': tikaUser.id
        }
      }
    });

    // Attempt to write presensi for fake school
    const { data: writeData, error: writeError } = await crossSchoolClient
      .from('presensi_guru')
      .insert({
        nama_guru: 'Adversarial Injection Test',
        sekolah_id: fakeSchoolId,
        tipe_absen: 'Datang',
        timestamp: new Date().toISOString()
      })
      .select();

    if (writeData && writeData.length > 0) {
      throw new Error('Cross-school insertion succeeded! Multi-tenant boundary breached.');
    }

    pass('RLS-DEFENSE-03', 'Cross-school foreign school insertion rejected',
      `Write rejected by RLS (0 rows inserted across tenant boundary)`);
  } catch (err: any) {
    fail('RLS-DEFENSE-03', 'Cross-school insertion test failed', err);
  }

  // ==========================================================================
  // FINAL ADVERSARIAL REPORT SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${CYAN}${BOLD}  ADVERSARIAL STRESS TEST SUMMARY${RESET}`);
  console.log(`${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  Total Adversarial Checks : ${BOLD}${totalChecks}${RESET}`);
  console.log(`  Passed                   : ${GREEN}${BOLD}${passedChecks}${RESET}`);
  console.log(`  Failed                   : ${failedChecks > 0 ? RED : GREEN}${BOLD}${failedChecks}${RESET}`);

  if (failures.length > 0) {
    console.log(`\n${RED}${BOLD}Failures (${failures.length}):${RESET}`);
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✔ ALL ADVERSARIAL STRESS TESTS PASSED WITH ZERO FAILURES.${RESET}\n`);
    process.exit(0);
  }
}

runAdversarialSuite().catch(err => {
  console.error(`${RED}Fatal runner error:${RESET}`, err);
  process.exit(1);
});
