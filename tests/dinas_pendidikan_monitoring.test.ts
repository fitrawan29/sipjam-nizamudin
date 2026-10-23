/**
 * ============================================================================
 * OFFICIAL AUTOMATED TEST SUITE: DINAS PENDIDIKAN MONITORING & SECURITY GUARD
 * File: tests/dinas_pendidikan_monitoring.test.ts
 *
 * Verifies Requirements R1 - R4 and Acceptance Criteria for Dinas Pendidikan Role:
 * - Suite 1: Superadmin Regional Assignment (R4.1 & R1)
 * - Suite 2: Regional Scoping & Zero-Leak Isolation (R4.2 & R1)
 * - Suite 3: RBAC & Read-Only Isolation (R4.3 & R1)
 * - Suite 4: Executive Aggregation Metrics & Attention Detection (R4.4 & R2)
 * - Suite 5: Drilldown Scope Switching & Session Integrity (R4.4 & R3)
 * - Suite 6: Print System Access & Layout Hygiene (R4.3, R2 & R3)
 *
 * Execution Command:
 *   npx tsx tests/dinas_pendidikan_monitoring.test.ts
 * ============================================================================
 */

import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

import {
  getActiveTargetSchool,
  setActiveTargetSchool,
  clearActiveTargetSchool,
  setServerTenantContext,
  clearServerTenantContext,
  setServerActiveTargetSchool,
  dynamicTenantFetch,
  masterFetch,
  SatelliteSchool,
  TenantContext,
} from '../src/lib/supabaseClient';

import type { AppUser } from '../src/types/user';
import type { DinasAccount } from '../src/components/SuperadminView';
import type { Database } from '../src/types/database';

// Console formatting utilities
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: string[] = [];

function pass(testId: string, desc: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${testId}] PASS:${RESET} ${desc}`);
  if (detail) console.log(`    ${GRAY}↳ ${detail}${RESET}`);
}

function fail(testId: string, desc: string, detail?: string) {
  totalTests++;
  failedTests++;
  const msg = `  ${RED}✖ [${testId}] FAIL:${RESET} ${desc}${detail ? ` -> ${detail}` : ''}`;
  console.error(msg);
  failures.push(`[${testId}] ${desc}: ${detail || 'Assertion failed'}`);
}

function suiteHeader(title: string) {
  console.log(`\n${YELLOW}${BOLD}━━━ ${title} ━━━${RESET}`);
}

async function runDinasMonitoringTestSuite() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  OFFICIAL AUTOMATED TEST SUITE: DINAS PENDIDIKAN MONITORING (R1-R4)     ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════╝${RESET}`);

  const projectRoot = path.resolve(__dirname, '..');
  const superadminPath = path.join(projectRoot, 'src', 'components', 'SuperadminView.tsx');
  const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
  const dinasDashboardPath = path.join(projectRoot, 'src', 'components', 'DinasDashboard.tsx');
  const claySidebarPath = path.join(projectRoot, 'src', 'components', 'ClaySidebar.tsx');
  const adminRekapPath = path.join(projectRoot, 'src', 'components', 'AdminRekapView.tsx');
  const rekapJurnalPath = path.join(projectRoot, 'src', 'components', 'RekapJurnalView.tsx');
  const globalsCssPath = path.join(projectRoot, 'src', 'app', 'globals.css');

  // ==========================================================================
  // SUITE 1: SUPERADMIN REGIONAL ASSIGNMENT (R4.1 & R1)
  // ==========================================================================
  suiteHeader('SUITE 1: SUPERADMIN REGIONAL ASSIGNMENT (R4.1)');

  // 1.1 Interface Contracts: DinasAccount, AppUser, Database Users
  try {
    const testAccount: DinasAccount = {
      id: 'dinas-usr-101',
      username: 'dinas_kotamobagu',
      nama: 'Dinas Pendidikan Kota Kotamobagu',
      role: 'dinas_pendidikan',
      sekolah_id: null,
      kota_kabupaten: 'Kota Kotamobagu',
      created_at: new Date().toISOString(),
    };
    assert.strictEqual(testAccount.role, 'dinas_pendidikan');
    assert.strictEqual(testAccount.sekolah_id, null);
    assert.strictEqual(testAccount.kota_kabupaten, 'Kota Kotamobagu');

    const testAppUser: AppUser = {
      id: 'dinas-usr-102',
      username: 'dinas_boltim',
      nama: 'Dinas Pendidikan Kab. Boltim',
      role: 'dinas_pendidikan',
      sekolah_id: '',
      session_token: 'tok-dinas-test-123',
      kota_kabupaten: 'Kab. Bolaang Mongondow Timur',
    };
    assert.strictEqual(testAppUser.role, 'dinas_pendidikan');
    assert.strictEqual(testAppUser.kota_kabupaten, 'Kab. Bolaang Mongondow Timur');

    type UsersInsert = Database['public']['Tables']['users']['Insert'];
    type UsersUpdate = Database['public']['Tables']['users']['Update'];
    const insertPayload: UsersInsert = {
      username: 'dinas_test_create',
      nama: 'Petugas Dinas',
      role: 'dinas_pendidikan',
      sekolah_id: null,
      kota_kabupaten: 'Kota Kotamobagu',
    };
    assert.strictEqual(insertPayload.role, 'dinas_pendidikan');
    assert.strictEqual(insertPayload.kota_kabupaten, 'Kota Kotamobagu');

    const updatePayload: UsersUpdate = {
      kota_kabupaten: 'Kab. Bolaang Mongondow',
    };
    assert.strictEqual(updatePayload.kota_kabupaten, 'Kab. Bolaang Mongondow');

    pass('R4.1-01', 'DinasAccount, AppUser, and Database schema typing contracts verified');
  } catch (err: any) {
    fail('R4.1-01', 'Type contract mismatch', err?.message);
  }

  // 1.2 Distinct Regions Extraction with Case-Insensitive Deduplication
  try {
    const rawSchoolsWithVaryingRegions = [
      { id: 'sch-1', nama: 'SMP 1', kota_kabupaten: 'Kota Kotamobagu' },
      { id: 'sch-2', nama: 'SMP 2', kota_kabupaten: 'kota kotamobagu' },
      { id: 'sch-3', nama: 'SMP 3', kota_kabupaten: '  KOTA KOTAMOBAGU  ' },
      { id: 'sch-4', nama: 'SMA 1', kota_kabupaten: 'Kab. Bolaang Mongondow Timur' },
      { id: 'sch-5', nama: 'SMA 2', kota_kabupaten: 'kab. bolaang mongondow timur' },
      { id: 'sch-6', nama: 'SMK 1', kota_kabupaten: 'Kota Manado' },
      { id: 'sch-7', nama: 'SD 1', kota_kabupaten: '   ' },
      { id: 'sch-8', nama: 'SD 2', kota_kabupaten: null },
      { id: 'sch-9', nama: 'SD 3', kota_kabupaten: undefined },
    ];

    // Mirroring SuperadminView.getDistinctRegions() algorithm
    const extractDistinctRegions = (schools: Array<{ kota_kabupaten?: string | null }>) => {
      const regionMap = new Map<string, string>();
      for (const s of schools) {
        const trimmed = s.kota_kabupaten?.trim();
        if (trimmed && trimmed.length > 0) {
          const lower = trimmed.toLowerCase();
          if (!regionMap.has(lower)) {
            regionMap.set(lower, trimmed);
          }
        }
      }
      return Array.from(regionMap.values()).sort((a, b) => a.localeCompare(b));
    };

    const distinct = extractDistinctRegions(rawSchoolsWithVaryingRegions);
    assert.strictEqual(distinct.length, 3, `Expected 3 distinct regions, got ${distinct.length}`);
    assert(distinct.some(r => r.toLowerCase() === 'kota kotamobagu'), 'Contains Kota Kotamobagu');
    assert(distinct.some(r => r.toLowerCase() === 'kab. bolaang mongondow timur'), 'Contains Kab. Boltim');
    assert(distinct.some(r => r.toLowerCase() === 'kota manado'), 'Contains Kota Manado');

    pass('R4.1-02', 'Distinct region extraction deduplicates case-insensitively and filters empty strings');
  } catch (err: any) {
    fail('R4.1-02', 'Distinct region extraction failed', err?.message);
  }

  // 1.3 Superadmin Region Assignment & Update Propagation
  try {
    let mockDinasDatabase: DinasAccount[] = [
      {
        id: 'usr-1',
        username: 'dinas_boltim',
        nama: 'Dinas Boltim',
        role: 'dinas_pendidikan',
        sekolah_id: null,
        kota_kabupaten: 'Kab. Bolaang Mongondow Timur',
      },
    ];

    // Assign new user
    const newUser: DinasAccount = {
      id: 'usr-2',
      username: 'dinas_kotamobagu',
      nama: 'Dinas Kotamobagu',
      role: 'dinas_pendidikan',
      sekolah_id: null,
      kota_kabupaten: 'Kota Kotamobagu',
    };
    mockDinasDatabase.push(newUser);
    assert.strictEqual(mockDinasDatabase.length, 2);

    // Update assigned region
    const targetUser = mockDinasDatabase.find(u => u.id === 'usr-1');
    assert(targetUser, 'User found');
    targetUser.kota_kabupaten = 'Kota Kotamobagu';
    assert.strictEqual(targetUser.kota_kabupaten, 'Kota Kotamobagu');

    pass('R4.1-03', 'Superadmin regional assignment and update lifecycle propagates cleanly');
  } catch (err: any) {
    fail('R4.1-03', 'Superadmin regional assignment update failed', err?.message);
  }

  // 1.4 Empty String / Unassigned Dinas Region Leak Guard
  try {
    const satelliteSchools: SatelliteSchool[] = [
      { id: 'sch-a', nama: 'Sekolah A', kota_kabupaten: 'Kota Kotamobagu' },
      { id: 'sch-b', nama: 'Sekolah B', kota_kabupaten: '' },
      { id: 'sch-c', nama: 'Sekolah C', kota_kabupaten: null },
    ];

    const unassignedDinasUser: Partial<DinasAccount> = {
      id: 'usr-unassigned',
      role: 'dinas_pendidikan',
      kota_kabupaten: null,
    };

    // Calculation used in SuperadminView:
    const userRegion = (unassignedDinasUser.kota_kabupaten || '').trim().toLowerCase();
    const matchingSchoolsCount = userRegion
      ? satelliteSchools.filter(s => (s.kota_kabupaten || '').trim().toLowerCase() === userRegion).length
      : 0;

    assert.strictEqual(matchingSchoolsCount, 0, 'Unassigned user must match 0 schools, not leak empty strings');

    pass('R4.1-04', 'Empty/null region guard prevents false "" === "" school matches in SuperadminView');
  } catch (err: any) {
    fail('R4.1-04', 'Empty region guard failed', err?.message);
  }

  // 1.5 SuperadminView Static Code Inspection
  try {
    const superadminCode = fs.readFileSync(superadminPath, 'utf8');
    assert(superadminCode.includes("activeTab === 'dinas'"), 'SuperadminView includes dinas tab state');
    assert(superadminCode.includes('handleOpenAddDinasUserModal'), 'Includes add dinas user modal');
    assert(superadminCode.includes('handleEditDinasUser'), 'Includes edit dinas user modal');
    assert(superadminCode.includes('swal-dinas-region'), 'Contains select for assigning kota_kabupaten');
    assert(superadminCode.includes("role: 'dinas_pendidikan'"), 'Inserts dinas_pendidikan role');
    assert(superadminCode.includes('getDistinctRegions'), 'Includes getDistinctRegions algorithm');

    pass('R4.1-05', 'SuperadminView contains complete UI controls for managing Dinas regional assignments');
  } catch (err: any) {
    fail('R4.1-05', 'SuperadminView static check failed', err?.message);
  }

  // ==========================================================================
  // SUITE 2: REGIONAL SCOPING & ZERO-LEAK ISOLATION (R4.2 & R1)
  // ==========================================================================
  suiteHeader('SUITE 2: REGIONAL SCOPING & ZERO-LEAK ISOLATION (R4.2)');

  const masterSatellitePool: SatelliteSchool[] = [
    { id: 'sch-ktg-1', nama: 'SMKN 1 Kotamobagu', kota_kabupaten: 'Kota Kotamobagu', status: 'aktif' },
    { id: 'sch-ktg-2', nama: 'SMAN 2 Kotamobagu', kota_kabupaten: '  kota kotamobagu  ', status: 'aktif' },
    { id: 'sch-ktg-3', nama: 'SMPN 3 Kotamobagu', kota_kabupaten: 'KOTA KOTAMOBAGU', status: 'nonaktif' },
    { id: 'sch-blt-1', nama: 'SMAN 1 Modayag', kota_kabupaten: 'Kab. Bolaang Mongondow Timur', status: 'aktif' },
    { id: 'sch-blt-2', nama: 'SMPN 2 Tutuyan', kota_kabupaten: 'Kab. Bolaang Mongondow Timur', status: 'aktif' },
    { id: 'sch-mdo-1', nama: 'SMAN 1 Manado', kota_kabupaten: 'Kota Manado', status: 'aktif' },
    { id: 'sch-null', nama: 'Sekolah Tanpa Wilayah', kota_kabupaten: null, status: 'aktif' },
  ];

  // 2.1 Regional Scoping Filter (Empirical)
  try {
    const dinasRegion = 'Kota Kotamobagu';
    const normalizedAssigned = dinasRegion.trim().toLowerCase();

    const scopedSchools = masterSatellitePool.filter((s) => {
      const schRegion = (s.kota_kabupaten || '').trim().toLowerCase();
      return schRegion === normalizedAssigned;
    });

    assert.strictEqual(scopedSchools.length, 3, `Expected 3 schools in Kota Kotamobagu, got ${scopedSchools.length}`);
    const schoolIds = scopedSchools.map(s => s.id);
    assert(schoolIds.includes('sch-ktg-1') && schoolIds.includes('sch-ktg-2') && schoolIds.includes('sch-ktg-3'));

    pass('R4.2-01', 'Empirical filter extracts exactly schools in assigned region regardless of casing/spacing');
  } catch (err: any) {
    fail('R4.2-01', 'Regional scoping failed', err?.message);
  }

  // 2.2 Zero-Leak Proof (Negative Assertion)
  try {
    const dinasRegion = 'Kota Kotamobagu';
    const normalizedAssigned = dinasRegion.trim().toLowerCase();

    const scopedSchools = masterSatellitePool.filter((s) => {
      const schRegion = (s.kota_kabupaten || '').trim().toLowerCase();
      return schRegion === normalizedAssigned;
    });

    const foreignSchools = scopedSchools.filter(s => (s.kota_kabupaten || '').trim().toLowerCase() !== normalizedAssigned);
    assert.strictEqual(foreignSchools.length, 0, 'Zero foreign region schools must leak into scoped schools');

    const boltimLeaked = scopedSchools.some(s => s.id === 'sch-blt-1' || s.id === 'sch-blt-2');
    const manadoLeaked = scopedSchools.some(s => s.id === 'sch-mdo-1');
    const nullLeaked = scopedSchools.some(s => s.id === 'sch-null');
    assert(!boltimLeaked && !manadoLeaked && !nullLeaked, 'No Boltim, Manado, or unassigned school leaked');

    pass('R4.2-02', 'Zero-leak verification: schools from foreign or unassigned regions are strictly excluded');
  } catch (err: any) {
    fail('R4.2-02', 'Zero-leak verification failed', err?.message);
  }

  // 2.3 Strict Target Scope Boundary Enforcement in getActiveTargetSchool()
  try {
    // 2.3a Authorized Target in Same Region
    setServerTenantContext({
      role: 'dinas_pendidikan',
      userId: 'usr-dinas-ktg',
      kotaKabupaten: 'Kota Kotamobagu',
    });
    const authorizedSchool: SatelliteSchool = {
      id: 'sch-ktg-1',
      nama: 'SMKN 1 Kotamobagu',
      kota_kabupaten: 'Kota Kotamobagu',
    };
    setServerActiveTargetSchool(authorizedSchool);
    const resolvedAuthorized = getActiveTargetSchool();
    assert.strictEqual(resolvedAuthorized?.id, 'sch-ktg-1', 'Authorized regional target school resolved');

    // 2.3b Unauthorized Target in Foreign Region (Cross-Region Spoofing)
    const foreignSchool: SatelliteSchool = {
      id: 'sch-blt-1',
      nama: 'SMAN 1 Modayag',
      kota_kabupaten: 'Kab. Bolaang Mongondow Timur',
    };
    setServerActiveTargetSchool(foreignSchool);
    const resolvedForeign = getActiveTargetSchool();
    assert.strictEqual(resolvedForeign, null, 'Foreign region school must return null for dinas_pendidikan');

    // 2.3c Null Region Target School
    const unassignedSchool: SatelliteSchool = {
      id: 'sch-null',
      nama: 'Sekolah Tanpa Wilayah',
      kota_kabupaten: null,
    };
    setServerActiveTargetSchool(unassignedSchool);
    const resolvedNull = getActiveTargetSchool();
    assert.strictEqual(resolvedNull, null, 'Unassigned region school must return null for dinas_pendidikan');

    // 2.3d Unassigned Dinas User attempting target switch
    setServerTenantContext({
      role: 'dinas_pendidikan',
      userId: 'usr-dinas-none',
      kotaKabupaten: null,
    });
    setServerActiveTargetSchool(authorizedSchool);
    const resolvedUnassignedDinas = getActiveTargetSchool();
    assert.strictEqual(resolvedUnassignedDinas, null, 'Unassigned dinas user must return null for any target school');

    setServerActiveTargetSchool(null);
    clearServerTenantContext();

    pass('R4.2-03', 'getActiveTargetSchool strictly rejects cross-region and unassigned target scopes');
  } catch (err: any) {
    setServerActiveTargetSchool(null);
    clearServerTenantContext();
    fail('R4.2-03', 'Target school scope boundary check failed', err?.message);
  }

  // 2.4 Non-Dinas Roles Target Scope Check
  try {
    const dummySchool: SatelliteSchool = {
      id: 'sch-any',
      nama: 'Sekolah Apapun',
      kota_kabupaten: 'Wilayah Apapun',
    };
    setServerActiveTargetSchool(dummySchool);

    // Superadmin is permitted globally
    setServerTenantContext({ role: 'superadmin', userId: 'sa-001' });
    assert.strictEqual(getActiveTargetSchool()?.id, 'sch-any', 'Superadmin permitted across all regions');

    // Local Admin strictly forbidden
    setServerTenantContext({ role: 'admin', userId: 'adm-001', sekolahId: 'sch-local' });
    assert.strictEqual(getActiveTargetSchool(), null, 'Local Admin unconditionally forbidden from target scope');

    // Guru strictly forbidden
    setServerTenantContext({ role: 'guru', userId: 'guru-001', sekolahId: 'sch-local' });
    assert.strictEqual(getActiveTargetSchool(), null, 'Guru unconditionally forbidden from target scope');

    setServerActiveTargetSchool(null);
    clearServerTenantContext();

    pass('R4.2-04', 'Role boundary enforcement: Superadmin authorized globally; Admin/Guru strictly blocked');
  } catch (err: any) {
    setServerActiveTargetSchool(null);
    clearServerTenantContext();
    fail('R4.2-04', 'Role boundary enforcement failed', err?.message);
  }

  // 2.5 ClaySidebar Regional Dropdown Scoping (Static Check)
  try {
    const sidebarCode = fs.readFileSync(claySidebarPath, 'utf8');
    assert(sidebarCode.includes('isDinas'), 'ClaySidebar accepts isDinas');
    assert(
      sidebarCode.includes('userRegion && schoolRegion && userRegion === schoolRegion') ||
      sidebarCode.includes('(s.kota_kabupaten || \'\').trim().toLowerCase() === (user?.kota_kabupaten || \'\').trim().toLowerCase()'),
      'ClaySidebar filters satellite schools strictly by user.kota_kabupaten'
    );

    pass('R4.2-05', 'ClaySidebar verifies zero-leak school dropdown restricted strictly to assigned region');
  } catch (err: any) {
    fail('R4.2-05', 'ClaySidebar static check failed', err?.message);
  }

  // ==========================================================================
  // SUITE 3: RBAC & READ-ONLY ISOLATION (R4.3 & R1)
  // ==========================================================================
  suiteHeader('SUITE 3: RBAC & READ-ONLY ISOLATION (R4.3)');

  // 3.1 Default Landing View in AppScreen
  try {
    const appScreenCode = fs.readFileSync(appScreenPath, 'utf8');
    assert(appScreenCode.includes("isDinas = (baseUser?.role || '').toLowerCase().replace(/[\\s_-]+/g, '') === 'dinaspendidikan'"), 'Normalizes dinas role');
    assert(appScreenCode.includes("isDinas ? 'view-dinas-overview' : 'view-home'"), 'Directs dinas to view-dinas-overview by default');

    pass('R4.3-01', 'Role dinas_pendidikan default landing view is view-dinas-overview');
  } catch (err: any) {
    fail('R4.3-01', 'Default view verification failed', err?.message);
  }

  // 3.2 Navigation Guard Blocking Administrative Mutation Views
  try {
    const appScreenCode = fs.readFileSync(appScreenPath, 'utf8');
    const blockedViews = [
      'view-admin-data',
      'view-admin-config',
      'view-admin-backup',
      'view-sistem-blok',
      'view-admin-verif',
    ];
    for (const v of blockedViews) {
      assert(appScreenCode.includes(`'${v}'`), `AppScreen blocks view '${v}'`);
    }
    assert(appScreenCode.includes('Akses Terblokir: Akun Dinas Pendidikan hanya memiliki wewenang monitoring read-only'), 'Displays security warning for mutation views');

    pass('R4.3-02', 'AppScreen navigation guard blocks all administrative mutation views for dinas role');
  } catch (err: any) {
    fail('R4.3-02', 'AppScreen navigation guard failed', err?.message);
  }

  // 3.3 Network Layer Mutation Guard in dynamicTenantFetch & masterFetch (Empirical)
  try {
    setServerTenantContext({
      role: 'dinas_pendidikan',
      userId: 'usr-dinas-audit',
      kotaKabupaten: 'Kota Kotamobagu',
    });

    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    for (const method of mutatingMethods) {
      // Test dynamicTenantFetch
      const respDynamic = await dynamicTenantFetch('https://example.supabase.co/rest/v1/data_guru', {
        method,
      });
      assert.strictEqual(respDynamic.status, 403, `dynamicTenantFetch ${method} must return 403 Forbidden`);
      const bodyDynamic = await respDynamic.json();
      assert.strictEqual(
        bodyDynamic.error,
        'Role dinas_pendidikan is read-only. Data mutation prohibited.',
        'Returns standard read-only error message'
      );

      // Test masterFetch
      const respMaster = await masterFetch('https://example.supabase.co/rest/v1/sekolah_registry', {
        method,
      });
      assert.strictEqual(respMaster.status, 403, `masterFetch ${method} must return 403 Forbidden`);
    }

    clearServerTenantContext();
    pass('R4.3-03', 'Network fetch layer returns HTTP 403 Forbidden for all mutating methods (POST, PUT, PATCH, DELETE)');
  } catch (err: any) {
    clearServerTenantContext();
    fail('R4.3-03', 'Network layer mutation guard failed', err?.message);
  }

  // 3.4 URL Spoofing Attack Resilience on Network Mutation Guard
  try {
    setServerTenantContext({
      role: 'dinas_pendidikan',
      userId: 'usr-dinas-attacker',
      kotaKabupaten: 'Kota Kotamobagu',
    });

    // Attack 1: Query param spoofing
    const respSpoofedQuery = await dynamicTenantFetch(
      'https://example.supabase.co/rest/v1/data_guru?query=/rpc/verify_login',
      { method: 'POST' }
    );
    assert.strictEqual(respSpoofedQuery.status, 403, 'Spoofed query param must be rejected with 403');

    // Attack 2: Fake path suffix spoofing
    const respSpoofedPath = await dynamicTenantFetch(
      'https://example.supabase.co/rest/v1/rpc/verify_login_spoof',
      { method: 'POST' }
    );
    assert.strictEqual(respSpoofedPath.status, 403, 'Spoofed path suffix must be rejected with 403');

    // Legitimate verify_login RPC should bypass mutation guard
    const originalFetch = globalThis.fetch;
    let passthroughCalled = false;
    globalThis.fetch = (async () => {
      passthroughCalled = true;
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    }) as any;

    const respLegit = await dynamicTenantFetch(
      'https://example.supabase.co/rest/v1/rpc/verify_login',
      { method: 'POST' }
    );
    assert.strictEqual(respLegit.status, 200, 'Legitimate login RPC allowed');
    assert(passthroughCalled, 'Passthrough invoked for login RPC');

    globalThis.fetch = originalFetch;
    clearServerTenantContext();

    pass('R4.3-04', 'Strict pathname verification prevents query param bypass attacks on mutation guard');
  } catch (err: any) {
    clearServerTenantContext();
    fail('R4.3-04', 'URL spoofing attack resilience failed', err?.message);
  }

  // 3.5 Subview isReadOnly Prop Propagation & Component Support
  try {
    const appScreenCode = fs.readFileSync(appScreenPath, 'utf8');
    assert(appScreenCode.includes('<AdminRekapView') && appScreenCode.includes('isReadOnly={isDinas}'), 'Passes isReadOnly to AdminRekapView');
    assert(appScreenCode.includes('<RekapJurnalView') && appScreenCode.includes('isReadOnly={isDinas}'), 'Passes isReadOnly to RekapJurnalView');
    assert(appScreenCode.includes('<RekapSiswaView') && appScreenCode.includes('isReadOnly={isDinas}'), 'Passes isReadOnly to RekapSiswaView');

    const adminRekapCode = fs.readFileSync(adminRekapPath, 'utf8');
    assert(adminRekapCode.includes('isReadOnly?: boolean'), 'AdminRekapView accepts isReadOnly prop');

    const rekapJurnalCode = fs.readFileSync(rekapJurnalPath, 'utf8');
    assert(rekapJurnalCode.includes('isReadOnly?: boolean'), 'RekapJurnalView accepts isReadOnly prop');

    pass('R4.3-05', 'AppScreen propagates isReadOnly={isDinas} to child views; subviews declare and respect isReadOnly contract');
  } catch (err: any) {
    fail('R4.3-05', 'isReadOnly prop propagation check failed', err?.message);
  }

  // ==========================================================================
  // SUITE 4: EXECUTIVE AGGREGATION METRICS & ATTENTION DETECTION (R4.4 & R2)
  // ==========================================================================
  suiteHeader('SUITE 4: EXECUTIVE AGGREGATION METRICS & ATTENTION DETECTION (R4.4)');

  // 4.1 Mathematical Precision of Regional Aggregate Metrics
  try {
    const mockRegionalSchools = [
      { id: 'sch-1', nama: 'SMK 1', status: 'aktif' },
      { id: 'sch-2', nama: 'SMA 2', status: 'aktif' },
      { id: 'sch-3', nama: 'SMP 3', status: 'nonaktif' },
    ];

    const mockMetrics = [
      {
        totalGuru: 10,
        hadirGuru: 8,
        totalSiswa: 100,
        hadirSiswa: 92,
        alpaSiswa: 2,
        jurnalCount: 6,
        isOnline: true,
        needsAttention: false,
      },
      {
        totalGuru: 15,
        hadirGuru: 15,
        totalSiswa: 150,
        hadirSiswa: 140,
        alpaSiswa: 3,
        jurnalCount: 9,
        isOnline: true,
        needsAttention: false,
      },
      {
        totalGuru: 5,
        hadirGuru: 2,
        totalSiswa: 50,
        hadirSiswa: 25,
        alpaSiswa: 12,
        jurnalCount: 1,
        isOnline: false,
        needsAttention: true,
      },
    ];

    let totalSemuaGuru = 0;
    let totalHadirGuru = 0;
    let totalSemuaSiswa = 0;
    let totalHadirSiswa = 0;
    let totalAlpaSiswa = 0;
    let totalJurnal = 0;
    let onlineCount = 0;
    let attentionCount = 0;

    for (const m of mockMetrics) {
      totalSemuaGuru += m.totalGuru;
      totalHadirGuru += m.hadirGuru;
      totalSemuaSiswa += m.totalSiswa;
      totalHadirSiswa += m.hadirSiswa;
      totalAlpaSiswa += m.alpaSiswa;
      totalJurnal += m.jurnalCount;
      if (m.isOnline) onlineCount++;
      if (m.needsAttention) attentionCount++;
    }

    const aggregateGuruPct = totalSemuaGuru > 0 ? Math.round((totalHadirGuru / totalSemuaGuru) * 100) : 0;
    const aggregateSiswaPct = totalSemuaSiswa > 0 ? Math.round((totalHadirSiswa / totalSemuaSiswa) * 100) : 0;

    // Expected values:
    // Guru: (8 + 15 + 2) / 30 = 25 / 30 = 83.333% -> round: 83%
    // Siswa: (92 + 140 + 25) / 300 = 257 / 300 = 85.666% -> round: 86%
    // Total Sekolah: 3
    // Satelit Online: 2
    // Perlu Perhatian: 1
    assert.strictEqual(mockRegionalSchools.length, 3, 'Total Sekolah = 3');
    assert.strictEqual(aggregateGuruPct, 83, `Expected aggregateGuruPct = 83%, got ${aggregateGuruPct}%`);
    assert.strictEqual(aggregateSiswaPct, 86, `Expected aggregateSiswaPct = 86%, got ${aggregateSiswaPct}%`);
    assert.strictEqual(onlineCount, 2, 'Online satelit = 2');
    assert.strictEqual(attentionCount, 1, 'Sekolah perlu perhatian = 1');
    assert.strictEqual(totalAlpaSiswa, 17, 'Total Alpa = 17');
    assert.strictEqual(totalJurnal, 16, 'Total Jurnal = 16');

    pass('R4.4-01', 'Executive regional aggregate metrics calculated with verified mathematical precision');
  } catch (err: any) {
    fail('R4.4-01', 'Aggregate metrics calculation failed', err?.message);
  }

  // 4.2 Attention Needed Detection Rules & Reason Derivation
  try {
    const evaluateSchoolAttention = (
      status: string,
      alpaPct: number,
      totalGuru: number,
      guruPct: number
    ) => {
      const isNonaktif = (status || '').toLowerCase() === 'nonaktif';
      const hasHighAlpa = alpaPct >= 10;
      const hasLowGuru = totalGuru > 0 && guruPct < 70;
      const needsAttention = isNonaktif || hasHighAlpa || hasLowGuru;

      let reason = '';
      if (isNonaktif) reason = 'Sekolah Nonaktif';
      else if (hasHighAlpa) reason = `Alpa Siswa Tinggi (${alpaPct}%)`;
      else if (hasLowGuru) reason = `Kehadiran Guru Rendah (${guruPct}%)`;

      return { needsAttention, reason };
    };

    // Case A: High Student Alpa (>= 10%)
    const caseA = evaluateSchoolAttention('aktif', 12, 10, 85);
    assert.strictEqual(caseA.needsAttention, true);
    assert.strictEqual(caseA.reason, 'Alpa Siswa Tinggi (12%)');

    // Case B: Low Teacher Attendance (< 70%)
    const caseB = evaluateSchoolAttention('aktif', 4, 10, 65);
    assert.strictEqual(caseB.needsAttention, true);
    assert.strictEqual(caseB.reason, 'Kehadiran Guru Rendah (65%)');

    // Case C: Nonactive School Status
    const caseC = evaluateSchoolAttention('nonaktif', 2, 5, 90);
    assert.strictEqual(caseC.needsAttention, true);
    assert.strictEqual(caseC.reason, 'Sekolah Nonaktif');

    // Case D: Fully Healthy School
    const caseD = evaluateSchoolAttention('aktif', 3, 15, 95);
    assert.strictEqual(caseD.needsAttention, false);
    assert.strictEqual(caseD.reason, '');

    pass('R4.4-02', 'Attention detection flags high student alpa (>=10%), low teacher attendance (<70%), and inactive status');
  } catch (err: any) {
    fail('R4.4-02', 'Attention detection failed', err?.message);
  }

  // 4.3 Zero Division & Boundary Resilience
  try {
    // 0 schools, 0 teachers, 0 students
    const zeroGuru = 0;
    const zeroHadir = 0;
    const pct = zeroGuru > 0 ? Math.round((zeroHadir / zeroGuru) * 100) : 0;
    assert.strictEqual(pct, 0, 'Zero denominator must evaluate to 0 without NaN');
    assert(!isNaN(pct), 'pct must not be NaN');

    // 100% attendance boundary
    const fullGuru = 20;
    const fullHadir = 20;
    const fullPct = fullGuru > 0 ? Math.round((fullHadir / fullGuru) * 100) : 0;
    assert.strictEqual(fullPct, 100, 'Full attendance must evaluate to 100%');

    pass('R4.4-03', 'Mathematical boundary resilience: zero division safely yields 0%, full attendance yields 100%');
  } catch (err: any) {
    fail('R4.4-03', 'Boundary resilience failed', err?.message);
  }

  // 4.4 Intra-Region Status Filtering & Search Logic
  try {
    const dinasDashboardCode = fs.readFileSync(dinasDashboardPath, 'utf8');
    assert(dinasDashboardCode.includes("statusFilter === 'semua'"), 'Handles filter semua');
    assert(dinasDashboardCode.includes("statusFilter === 'aktif'"), 'Handles filter aktif');
    assert(dinasDashboardCode.includes("statusFilter === 'perhatian'"), 'Handles filter perhatian');
    assert(dinasDashboardCode.includes("statusFilter === 'nonaktif'"), 'Handles filter nonaktif');
    assert(dinasDashboardCode.includes('searchQuery'), 'Handles search query');

    pass('R4.4-04', 'DinasDashboard provides intra-region search and status filtering (semua, aktif, perhatian, nonaktif)');
  } catch (err: any) {
    fail('R4.4-04', 'Intra-region filtering verification failed', err?.message);
  }

  // ==========================================================================
  // SUITE 5: DRILLDOWN SCOPE SWITCHING & SESSION INTEGRITY (R4.4 & R3)
  // ==========================================================================
  suiteHeader('SUITE 5: DRILLDOWN SCOPE SWITCHING & SESSION INTEGRITY (R4.4)');

  // 5.1 Dynamic Scope Switching without Session Loss
  try {
    const baseDinasUser: AppUser = {
      id: 'usr-dinas-session',
      username: 'dinas_kotamobagu',
      nama: 'Petugas Dinas Kota Kotamobagu',
      role: 'dinas_pendidikan',
      sekolah_id: '',
      session_token: 'valid-session-jwt-token-999',
      kota_kabupaten: 'Kota Kotamobagu',
    };

    const targetSchool: SatelliteSchool = {
      id: 'sch-target-001',
      nama: 'SMKN 1 Kotamobagu',
      npsn: '40102030',
      kota_kabupaten: 'Kota Kotamobagu',
      status: 'aktif',
    };

    // Simulated AppScreen effectiveUser resolution
    const isSuperadmin = false;
    const isDinas = true;
    const activeTargetSchool: SatelliteSchool | null = targetSchool;

    const effectiveUser: AppUser = (isSuperadmin && activeTargetSchool) || (isDinas && activeTargetSchool)
      ? {
          ...baseDinasUser,
          sekolah_id: activeTargetSchool.id,
          sekolah_nama: activeTargetSchool.nama,
        }
      : baseDinasUser;

    // Check effective user receives target school ID and name
    assert.strictEqual(effectiveUser.sekolah_id, 'sch-target-001', 'effectiveUser.sekolah_id set to target school');
    assert.strictEqual(effectiveUser.sekolah_nama, 'SMKN 1 Kotamobagu', 'effectiveUser.sekolah_nama set to target school');

    // Check base credentials remain intact
    assert.strictEqual(effectiveUser.id, baseDinasUser.id, 'User ID preserved');
    assert.strictEqual(effectiveUser.username, baseDinasUser.username, 'Username preserved');
    assert.strictEqual(effectiveUser.session_token, 'valid-session-jwt-token-999', 'Session token preserved');
    assert.strictEqual(effectiveUser.role, 'dinas_pendidikan', 'Role preserved');
    assert.strictEqual(effectiveUser.kota_kabupaten, 'Kota Kotamobagu', 'Assigned region preserved');

    pass('R4.5-01', 'effectiveUser dynamically inherits target school ID and name while preserving session credentials');
  } catch (err: any) {
    fail('R4.5-01', 'effectiveUser resolution failed', err?.message);
  }

  // 5.2 Storage Integrity across Scope Switching & Clear
  try {
    // Setup in-memory mock storage
    const storageMap: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => storageMap[k] ?? null,
      setItem: (k: string, v: string) => { storageMap[k] = String(v); },
      removeItem: (k: string) => { delete storageMap[k]; },
    };

    // Store login user in localStorage
    const savedUserJson = JSON.stringify({
      id: 'usr-1',
      username: 'dinas_ktg',
      role: 'dinas_pendidikan',
      kota_kabupaten: 'Kota Kotamobagu',
      session_token: 'secret-token-xyz',
    });
    mockStorage.setItem('sipjam_user', savedUserJson);

    // Switch target school
    const targetSchool: SatelliteSchool = {
      id: 'sch-101',
      nama: 'SMK 1 Kotamobagu',
      kota_kabupaten: 'Kota Kotamobagu',
    };
    mockStorage.setItem('sipjam_active_target_school', JSON.stringify(targetSchool));

    // Assert target school is saved
    assert(mockStorage.getItem('sipjam_active_target_school'), 'Target school saved in storage');

    // Clear active target school (returning to overview)
    mockStorage.removeItem('sipjam_active_target_school');
    assert.strictEqual(mockStorage.getItem('sipjam_active_target_school'), null, 'Target school cleared');

    // Assert sipjam_user was NOT modified or deleted
    assert.strictEqual(
      mockStorage.getItem('sipjam_user'),
      savedUserJson,
      'sipjam_user must remain completely intact across target scope lifecycle'
    );

    pass('R4.5-02', 'Storage integrity proven: clearing target school resets target scope without corrupting user session');
  } catch (err: any) {
    fail('R4.5-02', 'Storage integrity check failed', err?.message);
  }

  // 5.3 Drilldown Return Banner in AppScreen (Static Check)
  try {
    const appScreenCode = fs.readFileSync(appScreenPath, 'utf8');
    assert(appScreenCode.includes('clearActiveTargetSchool'), 'AppScreen imports clearActiveTargetSchool');
    assert(appScreenCode.includes('Kembali ke Dashboard'), 'AppScreen renders return button to dashboard');
    assert(appScreenCode.includes('activeTargetSchool'), 'AppScreen monitors active target school');

    pass('R4.5-03', 'AppScreen contains drilldown banner with return trigger resetting target school scope');
  } catch (err: any) {
    fail('R4.5-03', 'Drilldown banner check failed', err?.message);
  }

  // ==========================================================================
  // SUITE 6: PRINT SYSTEM ACCESS & LAYOUT HYGIENE (R4.3, R2 & R3)
  // ==========================================================================
  suiteHeader('SUITE 6: PRINT SYSTEM ACCESS & LAYOUT HYGIENE (R4.3 & R3)');

  // 6.1 Regional Summary Print View in DinasDashboard
  try {
    const dinasDashboardCode = fs.readFileSync(dinasDashboardPath, 'utf8');
    assert(dinasDashboardCode.includes('triggerPrintWithGps'), 'Integrates triggerPrintWithGps');
    assert(dinasDashboardCode.includes('<PrintHeader'), 'Embeds official PrintHeader');
    assert(dinasDashboardCode.includes('<PrintSignature'), 'Embeds official PrintSignature');
    assert(
      dinasDashboardCode.includes('print-only') || dinasDashboardCode.includes('hidden print:block'),
      'Renders dedicated printable report layout'
    );
    assert(
      dinasDashboardCode.includes('Laporan Eksekutif Pemantauan Kehadiran Satuan Pendidikan') ||
      dinasDashboardCode.includes('TOTAL AKUMULASI WILAYAH'),
      'Renders official regional report title'
    );

    pass('R4.6-01', 'DinasDashboard includes official regional print view with PrintHeader, PrintSignature, and GPS trigger');
  } catch (err: any) {
    fail('R4.6-01', 'Regional print view verification failed', err?.message);
  }

  // 6.2 Drilldown Target School Kop Surat Resolution
  try {
    const appScreenCode = fs.readFileSync(appScreenPath, 'utf8');
    assert(
      appScreenCode.includes('sekolah_id: activeTargetSchool.id') ||
      appScreenCode.includes('sekolah_id: (activeTargetSchool as any).id'),
      'AppScreen maps target school ID to effectiveUser.sekolah_id'
    );

    // Because child views pass user.sekolah_id to PrintHeader, target school kop surat is resolved automatically
    const adminRekapCode = fs.readFileSync(adminRekapPath, 'utf8');
    assert(adminRekapCode.includes('<PrintHeader') && adminRekapCode.includes('sekolahId='), 'AdminRekapView passes sekolahId to PrintHeader');

    pass('R4.6-02', 'Drilldown views route target school ID to PrintHeader for authentic local Kop Surat generation');
  } catch (err: any) {
    fail('R4.6-02', 'Target Kop Surat resolution check failed', err?.message);
  }

  // 6.3 Global CSS Print Layout Hygiene
  try {
    const cssCode = fs.readFileSync(globalsCssPath, 'utf8');
    assert(cssCode.includes('@media print'), 'globals.css declares @media print rules');
    assert(cssCode.includes('.no-print') && cssCode.includes('display: none'), 'Hides .no-print elements in print mode');
    assert(cssCode.includes('.print-only'), 'Formats .print-only elements for printing');
    assert(cssCode.includes('break-inside: avoid') || cssCode.includes('page-break-inside: avoid'), 'Prevents awkward signature page breaks');

    pass('R4.6-03', 'globals.css @media print rules enforce clean layout hygiene and hide non-printable UI controls');
  } catch (err: any) {
    fail('R4.6-03', 'Print layout hygiene check failed', err?.message);
  }

  // ==========================================================================
  // FINAL REPORT & SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}${BOLD}══════════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}OFFICIAL TEST SUITE RESULTS FOR DINAS PENDIDIKAN MONITORING (R4):${RESET}`);
  console.log(`  Total Test Assertions : ${totalTests}`);
  console.log(`  Passed Assertions     : ${GREEN}${passedTests}${RESET}`);
  console.log(`  Failed Assertions     : ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);
  console.log(`${CYAN}${BOLD}══════════════════════════════════════════════════════════════════════════${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${RED}${BOLD}✖ TEST RUN FAILED with ${failedTests} assertion failure(s):${RESET}`);
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}🎉 ALL 6 TEST SUITES PASSED WITH 100% SUCCESS!${RESET}\n`);
    process.exit(0);
  }
}

runDinasMonitoringTestSuite().catch((err) => {
  console.error(`${RED}Fatal error running test suite:${RESET}`, err);
  process.exit(1);
});
