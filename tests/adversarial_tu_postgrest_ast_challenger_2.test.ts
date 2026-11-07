/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE: CHALLENGER 2
 * PostgREST Mutation Interception Security & AST String Invariants
 *
 * File: tests/adversarial_tu_postgrest_ast_challenger_2.test.ts
 *
 * Exhaustively stress-tests:
 * 1. Full Matrix of all 16 tables in MASTER_DATA_TABLES across POST, PUT, PATCH, DELETE:
 *    - 4 Permitted tables (data_siswa, siswa, data_guru, guru) must return null.
 *    - 12 Forbidden tables must return HTTP 403 Forbidden with PostgREST code 42501.
 * 2. URL variant permutations (public schema prefix, query params, trailing slash, full URL).
 * 3. Read method exemptions (GET, HEAD, OPTIONS).
 * 4. Substring and boundary collision security (guru_kelas, guru_mapel).
 * 5. Role normalization, case variants, and injection resilience (isAdminRole strictly false).
 * 6. AST string invariants (data-tour preservation in AppScreen & ClaySidebar; const tabs = [...] in AdminDataView).
 * 7. Runtime getTenantSupabaseClient client-level interception.
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import {
  MASTER_DATA_TABLES,
  checkMasterDataMutationGuard,
  isMasterDataEndpoint,
  isAdminRole,
  getTenantSupabaseClient
} from '../src/lib/supabaseClient';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(desc: string, condition: boolean, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✔ [PASS]${RESET} ${desc}`);
    if (detail) console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✖ [FAIL]${RESET} ${desc}`);
    if (detail) console.error(`    ${RED}↳ Detail: ${detail}${RESET}`);
  }
}

async function runAdversarialStressSuite() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║  EMPIRICAL ADVERSARIAL STRESS TEST: TATA USAHA POSTGREST & AST INVARIANTS ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const projectRoot = path.resolve(__dirname, '..');

  // ==========================================================================
  // SUITE 1: PostgREST Mutation Interception Matrix across all 16 MASTER_DATA_TABLES
  // ==========================================================================
  console.log(`${BOLD}--- Suite 1: Full 16-Table Matrix Mutation Security for 'tata_usaha' ---${RESET}`);

  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const permittedTables = ['data_siswa', 'siswa', 'data_guru', 'guru'];
  const forbiddenTables = MASTER_DATA_TABLES.filter(t => !permittedTables.includes(t));

  check(
    `MASTER_DATA_TABLES has exactly 16 registered tables (got ${MASTER_DATA_TABLES.length})`,
    MASTER_DATA_TABLES.length === 16,
    `Tables: ${MASTER_DATA_TABLES.join(', ')}`
  );

  check(
    `Permitted tables count is 4 and forbidden tables count is 12`,
    permittedTables.length === 4 && forbiddenTables.length === 12,
    `Permitted: ${permittedTables.join(', ')} | Forbidden: ${forbiddenTables.join(', ')}`
  );

  // 1.1 Permitted tables: POST, PUT, PATCH, DELETE must return null (allowed)
  for (const table of permittedTables) {
    for (const method of mutationMethods) {
      const endpoints = [
        `/rest/v1/${table}`,
        `/rest/v1/public.${table}`,
        `https://mock-supabase.co/rest/v1/${table}?id=eq.123`,
        `https://mock-supabase.co/rest/v1/public.${table}?select=*&limit=10`,
        `/rest/v1/${table}/`
      ];

      for (const ep of endpoints) {
        const guardRes = checkMasterDataMutationGuard(ep, method, 'tata_usaha');
        check(
          `Mutation ${method} on permitted table '${table}' via '${ep}' returns null (allowed)`,
          guardRes === null
        );
      }
    }
  }

  // 1.2 Forbidden tables: POST, PUT, PATCH, DELETE must return 403 Forbidden with code 42501
  for (const table of forbiddenTables) {
    for (const method of mutationMethods) {
      const endpoints = [
        `/rest/v1/${table}`,
        `/rest/v1/public.${table}`,
        `https://mock-supabase.co/rest/v1/${table}?id=eq.123`,
        `https://mock-supabase.co/rest/v1/public.${table}?select=*&limit=10`,
        `/rest/v1/${table}/`
      ];

      for (const ep of endpoints) {
        const guardRes = checkMasterDataMutationGuard(ep, method, 'tata_usaha');
        let isBlockedWith403 = false;
        let hasCode42501 = false;

        if (guardRes instanceof Response && guardRes.status === 403) {
          isBlockedWith403 = true;
          try {
            const clone = guardRes.clone();
            const body = await clone.json();
            if (body && body.code === '42501' && body.status === 403) {
              hasCode42501 = true;
            }
          } catch (_) {}
        }

        check(
          `Mutation ${method} on forbidden table '${table}' via '${ep}' strictly returns HTTP 403 & code 42501`,
          isBlockedWith403 && hasCode42501,
          `Status: ${guardRes?.status}`
        );
      }
    }
  }

  // ==========================================================================
  // SUITE 2: Non-mutating Methods (GET, HEAD, OPTIONS)
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 2: Read & Non-Mutating Methods Permitted for 'tata_usaha' ---${RESET}`);

  const readMethods = ['GET', 'HEAD', 'OPTIONS'];
  for (const table of MASTER_DATA_TABLES) {
    for (const rm of readMethods) {
      const ep = `/rest/v1/${table}`;
      const res = checkMasterDataMutationGuard(ep, rm, 'tata_usaha');
      check(
        `Read method ${rm} on table '${table}' returns null (not blocked)`,
        res === null
      );
    }
  }

  // ==========================================================================
  // SUITE 3: Substring & Boundary Collision Protection
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 3: Substring & Boundary Collision Protection ---${RESET}`);

  // Test that 'guru_kelas' and 'guru_mapel' are NOT mistakenly authorized as 'guru'
  for (const collisionTable of ['guru_kelas', 'guru_mapel']) {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const url = `/rest/v1/${collisionTable}`;
      const res = checkMasterDataMutationGuard(url, m, 'tata_usaha');
      check(
        `Boundary check: table '${collisionTable}' with ${m} is NOT permitted via 'guru' match`,
        res !== null && res.status === 403
      );
    }
  }

  // ==========================================================================
  // SUITE 4: Role Normalization & isAdminRole Invariant
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 4: Role Normalization & isAdminRole Invariants ---${RESET}`);

  const tuRoleVariants = [
    'tata_usaha',
    'tatausaha',
    'Tata Usaha',
    'TATA_USAHA',
    '  tata_usaha  ',
    'Tata-Usaha',
    'TATA-USAHA'
  ];

  for (const r of tuRoleVariants) {
    check(
      `isAdminRole('${r}') strictly returns false`,
      isAdminRole(r) === false
    );

    // Verify each variant behaves identically in checkMasterDataMutationGuard
    const resAllowed = checkMasterDataMutationGuard('/rest/v1/data_siswa', 'POST', r);
    check(
      `Role variant '${r}' permits mutation on 'data_siswa'`,
      resAllowed === null
    );

    const resForbidden = checkMasterDataMutationGuard('/rest/v1/data_kelas', 'POST', r);
    check(
      `Role variant '${r}' strictly blocks mutation on 'data_kelas' with 403`,
      resForbidden !== null && resForbidden.status === 403
    );
  }

  // Privilege escalation payloads
  const attackPayloads = [
    'tata_usaha; admin',
    'admin, tata_usaha',
    'tata_usaha_admin',
    'admin_tata_usaha',
    'tata_usaha superadmin',
    'role: admin',
    '',
    null,
    undefined,
    'guru',
    'siswa',
    'dinas_pendidikan',
    'kepala_sekolah',
    'pengawas'
  ];

  for (const atk of attackPayloads) {
    check(
      `isAdminRole(${JSON.stringify(atk)}) strictly returns false`,
      isAdminRole(atk) === false
    );
  }

  // Admin roles must confirm true
  check("isAdminRole('admin') returns true", isAdminRole('admin') === true);
  check("isAdminRole('superadmin') returns true", isAdminRole('superadmin') === true);
  check("isAdminRole('servicerole') returns true", isAdminRole('servicerole') === true);

  // ==========================================================================
  // SUITE 5: Static AST String Invariants
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 5: Static AST String Invariants ---${RESET}`);

  // 5.1 AppScreen.tsx: verbatim {/* AST preservation: data-tour={item.id} */}
  const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
  const appScreenSrc = fs.readFileSync(appScreenPath, 'utf8');
  const appScreenAstRegex = /\{\/\*\s*AST preservation:\s*data-tour=\{item\.id\}\s*\*\/\}/;
  check(
    `AppScreen.tsx matches AST preservation regex verbatim`,
    appScreenAstRegex.test(appScreenSrc),
    appScreenPath
  );
  check(
    `AppScreen.tsx contains exact verbatim string '{/* AST preservation: data-tour={item.id} */}'`,
    appScreenSrc.includes('{/* AST preservation: data-tour={item.id} */}'),
    appScreenPath
  );

  // 5.2 ClaySidebar.tsx: verbatim {/* AST preservation: data-tour={item.id} */}
  const claySidebarPath = path.join(projectRoot, 'src', 'components', 'ClaySidebar.tsx');
  const claySidebarSrc = fs.readFileSync(claySidebarPath, 'utf8');
  const claySidebarAstRegex = /\{\/\*\s*AST preservation:\s*data-tour=\{item\.id\}\s*\*\/\}/;
  check(
    `ClaySidebar.tsx matches AST preservation regex verbatim`,
    claySidebarAstRegex.test(claySidebarSrc),
    claySidebarPath
  );
  check(
    `ClaySidebar.tsx contains exact verbatim string '{/* AST preservation: data-tour={item.id} */}'`,
    claySidebarSrc.includes('{/* AST preservation: data-tour={item.id} */}'),
    claySidebarPath
  );

  // 5.3 AdminDataView.tsx: regex for const tabs = [...]
  const adminDataPath = path.join(projectRoot, 'src', 'components', 'AdminDataView.tsx');
  const adminDataSrc = fs.readFileSync(adminDataPath, 'utf8');
  const tabsMatch = adminDataSrc.match(/const\s+tabs\s*=\s*\[([\s\S]*?)\];/);
  check(
    `AdminDataView.tsx defines 'const tabs = [...]' matching AST regex`,
    tabsMatch !== null && tabsMatch[1].length > 0,
    adminDataPath
  );

  if (tabsMatch) {
    const tabsContent = tabsMatch[1];
    const expectedTabs = [
      'Data_Siswa',
      'Data_Kelas',
      'Data_Mapel',
      'Data_Guru',
      'Jadwal_Pelajaran',
      'Wali_Kelas',
      'Pengguna',
      'Kalender_Pendidikan',
      'sistem_blok'
    ];

    for (const t of expectedTabs) {
      check(
        `tabs array contains tab id '${t}'`,
        tabsContent.includes(`id: '${t}'`)
      );
    }
  }

  // 5.4 AdminDataView.tsx: visibleTabs filters for isTataUsaha
  check(
    `AdminDataView.tsx defines visibleTabs filtering for isTataUsaha`,
    adminDataSrc.includes('const visibleTabs = isTataUsaha ? tabs.filter(t => t.id === \'Data_Siswa\' || t.id === \'Data_Guru\') : tabs;')
  );

  // ==========================================================================
  // SUITE 6: Runtime Client Interception via getTenantSupabaseClient
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 6: Runtime getTenantSupabaseClient Interception ---${RESET}`);

  const testSekolahId = '00000000-0000-0000-0000-000000000001';

  // 6.1 Test client with role: 'tata_usaha'
  const tuClient = getTenantSupabaseClient(testSekolahId, 'tata_usaha');

  // Forbidden master tables must be intercepted by client guard without hitting network
  const sampleForbiddenTables = [
    'data_kelas',
    'data_mapel',
    'jadwal_pelajaran',
    'wali_kelas',
    'kalender_pendidikan',
    'sistem_blok',
    'guru_kelas',
    'guru_mapel'
  ];

  for (const table of sampleForbiddenTables) {
    // Insert
    const insertRes = await (tuClient.from(table) as any).insert([{ dummy: 'attack' }]);
    check(
      `Runtime tuClient.from('${table}').insert() intercepted with 403 Forbidden`,
      insertRes.status === 403 && insertRes.error?.code === '42501',
      `Error: ${insertRes.error?.message}`
    );

    // Update
    const updateRes = await (tuClient.from(table) as any).update({ dummy: 'attack' }).eq('id', '1');
    check(
      `Runtime tuClient.from('${table}').update() intercepted with 403 Forbidden`,
      updateRes.status === 403 && updateRes.error?.code === '42501'
    );

    // Delete
    const deleteRes = await (tuClient.from(table) as any).delete().eq('id', '1');
    check(
      `Runtime tuClient.from('${table}').delete() intercepted with 403 Forbidden`,
      deleteRes.status === 403 && deleteRes.error?.code === '42501'
    );
  }

  // 6.2 Permitted tables must NOT be blocked by client guard
  let siswaBackendReached = false;
  const mockTuClientSiswa = getTenantSupabaseClient(testSekolahId, 'tata_usaha', {
    global: {
      fetch: async () => {
        siswaBackendReached = true;
        return new Response(JSON.stringify([{ id: 'mock-id', nama_siswa: 'Siswa Test' }]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  });

  const siswaRes = await mockTuClientSiswa.from('data_siswa').insert([{ nama_siswa: 'Siswa Test' }]);
  check(
    `Runtime tuClient.from('data_siswa').insert() passes guard and reaches backend`,
    siswaBackendReached === true && siswaRes.status === 201 && siswaRes.error === null
  );

  let guruBackendReached = false;
  const mockTuClientGuru = getTenantSupabaseClient(testSekolahId, 'tata_usaha', {
    global: {
      fetch: async () => {
        guruBackendReached = true;
        return new Response(JSON.stringify([{ id: 'mock-id', nama_guru: 'Guru Test' }]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  });

  const guruRes = await mockTuClientGuru.from('data_guru').update({ nama_guru: 'Guru Test' }).eq('id', '1');
  check(
    `Runtime tuClient.from('data_guru').update() passes guard and reaches backend`,
    guruBackendReached === true && guruRes.status === 201 && guruRes.error === null
  );

  // ==========================================================================
  // FINAL REPORT
  // ==========================================================================
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${GREEN}${passedTests}${RESET} | Failed: ${failedTests === 0 ? GREEN : RED}${failedTests}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialStressSuite().catch(err => {
  console.error('Unhandled error during test run:', err);
  process.exit(1);
});
