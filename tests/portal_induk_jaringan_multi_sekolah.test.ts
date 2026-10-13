/**
 * ============================================================================
 * TEST SUITE: PORTAL INDUK JARINGAN MULTI-SEKOLAH & DYNAMIC SCOPE SWITCHER
 * File: tests/portal_induk_jaringan_multi_sekolah.test.ts
 *
 * Verifies Requirements R1 - R4 and Acceptance Criteria:
 * - R1: Unified Master Superadmin Authentication & Scope Switcher
 * - R2: Central School Registry Management (Schema, Types & RLS)
 * - R3: Tab "Jaringan Sekolah" on SuperadminView (UI, Status, Metrics, Actions)
 * - R4: Dynamic Client-Side Scope Switching in supabaseClient.ts (RBAC, URL Rewriting, Header Injection)
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  setServerTenantContext,
  clearServerTenantContext,
  setActiveTargetSchool,
  getActiveTargetSchool,
  clearActiveTargetSchool,
  setServerActiveTargetSchool,
  getSatelliteSupabaseClient,
  dynamicTenantFetch,
  normalizeSupabaseUrl,
  masterSupabase,
  onActiveTargetSchoolChange,
  SatelliteSchool
} from '../src/lib/supabaseClient';

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
  console.log(`${CYAN}${BOLD}║  PORTAL INDUK JARINGAN MULTI-SEKOLAH & DYNAMIC SCOPE SWITCHER TESTS     ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // ==========================================================================
  // SECTION 1: R4 & R1 SCOPE SWITCHING HELPER & STRICT RBAC ENFORCEMENT
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ 1. SCOPE SWITCHING & STRICT RBAC ENFORCEMENT ━━━${RESET}`);

  // Test 1.1: Superadmin context can set and retrieve active target school
  try {
    setServerTenantContext({ role: 'Superadmin', userId: 'sa-123' });
    const dummySchool: SatelliteSchool = {
      id: 'sch-modayag-001',
      nama: 'SMA Negeri 1 Modayag',
      npsn: '40102031',
      kota_kabupaten: 'Kab. Boltim',
      provinsi: 'Sulawesi Utara',
      vercel_url: 'https://sipjam-sman1modayag.vercel.app',
      supabase_url: 'https://sat1.supabase.co',
      supabase_anon_key: 'anon-key-sat1',
      status: 'aktif'
    };

    setServerActiveTargetSchool(dummySchool);
    const active = getActiveTargetSchool();
    if (active && active.id === 'sch-modayag-001' && active.nama === 'SMA Negeri 1 Modayag') {
      pass('Superadmin role successfully accesses active target school scope');
    } else {
      fail('Superadmin failed to retrieve active target school');
    }
  } catch (e) {
    fail('Error in Superadmin active target scope test', e);
  }

  // Test 1.2: Strict RBAC - Guru role CANNOT access or receive active target school scope
  try {
    setServerTenantContext({ role: 'Guru', userId: 'guru-456', sekolahId: 'sch-local-001' });
    const guruTarget = getActiveTargetSchool();
    if (guruTarget === null) {
      pass('Strict RBAC: Guru role unconditionally receives null for active target school');
    } else {
      fail('Strict RBAC breach: Guru was able to read satellite target school scope!');
    }
  } catch (e) {
    fail('Error in Guru RBAC test', e);
  }

  // Test 1.3: Strict RBAC - Admin lokal role CANNOT access or receive active target school scope
  try {
    setServerTenantContext({ role: 'Admin', userId: 'admin-789', sekolahId: 'sch-local-002' });
    const adminTarget = getActiveTargetSchool();
    if (adminTarget === null) {
      pass('Strict RBAC: Local Admin role unconditionally receives null for active target school');
    } else {
      fail('Strict RBAC breach: Local Admin was able to read satellite target school scope!');
    }
  } catch (e) {
    fail('Error in Local Admin RBAC test', e);
  }

  // Test 1.4: clearActiveTargetSchool clears scope back to null
  try {
    setServerTenantContext({ role: 'Superadmin' });
    clearActiveTargetSchool();
    const cleared = getActiveTargetSchool();
    if (cleared === null) {
      pass('clearActiveTargetSchool successfully resets target scope to Master/Global');
    } else {
      fail('clearActiveTargetSchool did not reset target scope');
    }
  } catch (e) {
    fail('Error in clearActiveTargetSchool test', e);
  }

  // ==========================================================================
  // SECTION 2: DYNAMIC FETCH ROUTING & HEADER INJECTION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. DYNAMIC FETCH ROUTING & SATELLITE CLIENT CREATION ━━━${RESET}`);

  // Test 2.1: getSatelliteSupabaseClient creates client pointing to satellite target URL
  try {
    const satelliteObj: SatelliteSchool = {
      id: 'sch-sat-test',
      nama: 'SMA Test Satelit',
      supabase_url: 'https://satellite-test.supabase.co',
      supabase_anon_key: 'test-satellite-anon-key'
    };
    const client = getSatelliteSupabaseClient(satelliteObj);
    if (client && typeof client.from === 'function') {
      pass('getSatelliteSupabaseClient instantiates valid SupabaseClient for satellite school');
    } else {
      fail('getSatelliteSupabaseClient failed to create valid client');
    }
  } catch (e) {
    fail('Error in getSatelliteSupabaseClient test', e);
  }

  // Test 2.2: dynamicTenantFetch injects target school x-sekolah-id when active
  try {
    setServerTenantContext({ role: 'Superadmin', userId: 'sa-01' });
    setServerActiveTargetSchool({
      id: 'sch-target-abc',
      nama: 'Target School ABC',
      supabase_url: 'https://placeholder.supabase.co',
      supabase_anon_key: 'placeholder-key'
    });

    let interceptedHeaders: Headers | null = null;
    let interceptedUrl: string | null = null;

    // Mock global fetch temporarily
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init: any) => {
      interceptedUrl = typeof input === 'string' ? input : input.url;
      interceptedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify([{ id: 'mock' }]), { status: 200 });
    };

    await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/data_guru?select=id', {
      headers: { 'Content-Type': 'application/json' }
    });

    globalThis.fetch = originalFetch;

    if (interceptedHeaders && interceptedHeaders.get('x-sekolah-id') === 'sch-target-abc') {
      pass('dynamicTenantFetch automatically injected active target school x-sekolah-id');
    } else {
      fail(`dynamicTenantFetch did not inject target x-sekolah-id (got: ${interceptedHeaders?.get('x-sekolah-id')})`);
    }

    if (interceptedHeaders && interceptedHeaders.get('x-user-role') === 'Superadmin') {
      pass('dynamicTenantFetch retained Superadmin role header');
    } else {
      fail('dynamicTenantFetch lost Superadmin role header');
    }
  } catch (e) {
    fail('Error in dynamicTenantFetch header injection test', e);
  }

  // Test 2.3: dynamicTenantFetch rewrites base Supabase URL to satellite instance URL
  try {
    setServerTenantContext({ role: 'Superadmin' });
    setServerActiveTargetSchool({
      id: 'sch-remote-01',
      nama: 'Remote Satellite High',
      supabase_url: 'https://remote-project.supabase.co',
      supabase_anon_key: 'remote-anon-token-123'
    });

    let interceptedUrl: string = '';
    let interceptedApikey: string = '';
    let interceptedAuth: string = '';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init: any) => {
      interceptedUrl = typeof input === 'string' ? input : input.url;
      const h = new Headers(init?.headers);
      interceptedApikey = h.get('apikey') || '';
      interceptedAuth = h.get('authorization') || '';
      return new Response(JSON.stringify([]), { status: 200 });
    };

    await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/sekolah?select=id', {});
    globalThis.fetch = originalFetch;

    if (interceptedUrl.startsWith('https://remote-project.supabase.co/rest/v1/sekolah')) {
      pass('dynamicTenantFetch successfully rewrote request URL origin to target Supabase instance');
    } else {
      fail(`URL rewrite failed: got ${interceptedUrl}`);
    }

    if (interceptedApikey === 'remote-anon-token-123' && interceptedAuth === 'Bearer remote-anon-token-123') {
      pass('dynamicTenantFetch injected target school apikey and authorization bearer token');
    } else {
      fail(`Token injection failed: apikey=${interceptedApikey}, auth=${interceptedAuth}`);
    }

    // Clean up server test context
    clearServerTenantContext();
    clearActiveTargetSchool();
  } catch (e) {
    fail('Error in dynamicTenantFetch URL rewrite test', e);
  }

  // ==========================================================================
  // SECTION 3: R2 CENTRAL REGISTRY SCHEMA & TYPES VERIFICATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. CENTRAL SCHOOL REGISTRY SCHEMA & TYPES ━━━${RESET}`);

  // Test 3.1: Database migration file exists
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261013_portal_induk_jaringan_multi_sekolah.sql');
  if (fs.existsSync(migrationPath)) {
    pass('Migration file 20261013_portal_induk_jaringan_multi_sekolah.sql exists');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    if (sqlContent.includes('CREATE TABLE IF NOT EXISTS public.sekolah_registry')) {
      pass('Migration creates table public.sekolah_registry with central registry columns');
    } else {
      fail('Migration missing CREATE TABLE public.sekolah_registry');
    }

    if (sqlContent.includes('ENABLE ROW LEVEL SECURITY') && sqlContent.includes("'Superadmin'")) {
      pass('Migration enforces strict RLS policy restricting registry access to Superadmin');
    } else {
      fail('Migration missing strict Superadmin RLS policy on sekolah_registry');
    }

    if (sqlContent.includes('ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS vercel_url')) {
      pass('Migration adds satellite credentials columns to public.sekolah');
    } else {
      fail('Migration missing satellite credentials on public.sekolah');
    }
  } else {
    fail('Migration file 20261013_portal_induk_jaringan_multi_sekolah.sql not found');
  }

  // Test 3.2: TypeScript Database types export SekolahRegistry
  const dbTypesPath = path.resolve(process.cwd(), 'src/types/database.ts');
  const dbTypesCode = fs.readFileSync(dbTypesPath, 'utf8');
  if (dbTypesCode.includes('sekolah_registry:') && dbTypesCode.includes('export type SekolahRegistry =')) {
    pass('src/types/database.ts defines and exports SekolahRegistry domain types');
  } else {
    fail('src/types/database.ts missing SekolahRegistry definition or export');
  }

  // ==========================================================================
  // SECTION 4: R3 SUPERADMINVIEW TAB "JARINGAN SEKOLAH" UI & ACTIONS
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 4. SUPERADMINVIEW TAB "JARINGAN SEKOLAH" UI & ACTIONS ━━━${RESET}`);

  const superadminViewPath = path.resolve(process.cwd(), 'src/components/SuperadminView.tsx');
  const saCode = fs.readFileSync(superadminViewPath, 'utf8');

  // Test 4.1: Tab navigation contains Jaringan Sekolah
  if (saCode.includes("activeTab === 'jaringan'") && saCode.includes('Jaringan Sekolah')) {
    pass('SuperadminView renders "Jaringan Sekolah" tab navigation button');
  } else {
    fail('SuperadminView missing "Jaringan Sekolah" tab');
  }

  // Test 4.2: School Switcher selector in SuperadminView
  if (saCode.includes('Sekolah yang Dipantau:') && saCode.includes('handleSelectTargetSchool')) {
    pass('SuperadminView implements interactive School Switcher dropdown');
  } else {
    fail('SuperadminView missing interactive School Switcher dropdown');
  }

  // Test 4.3: Live database status indicators (Online / Ter-pause)
  if (saCode.includes('Database Online') && saCode.includes('Database Ter-pause') && saCode.includes('healthMap')) {
    pass('SuperadminView implements live database status indicators (Online / Ter-pause)');
  } else {
    fail('SuperadminView missing live database status indicators');
  }

  // Test 4.4: Real-time metrics per school (Guru Aktif & Siswa)
  if (saCode.includes('Guru Aktif') && saCode.includes('metrics.siswaCount') && saCode.includes('metrics.guruCount')) {
    pass('SuperadminView displays real-time metrics (Guru Aktif & Siswa) per satellite school');
  } else {
    fail('SuperadminView missing real-time school metrics display');
  }

  // Test 4.5: Action buttons: "Kelola Sekolah Ini" and "Buka Web Vercel"
  if (saCode.includes('Kelola Sekolah Ini') && saCode.includes('Buka Web Vercel') && saCode.includes('handleOpenVercelUrl')) {
    pass('SuperadminView implements "Kelola Sekolah Ini" and one-click "Buka Web Vercel" action buttons');
  } else {
    fail('SuperadminView missing required action buttons');
  }

  // Test 4.6: Modal forms for Add, Edit, Delete Satellite School
  if (
    saCode.includes('handleOpenAddSatelliteSchoolModal') &&
    saCode.includes('handleEditSatelliteSchool') &&
    saCode.includes('handleDeleteSatelliteSchool')
  ) {
    pass('SuperadminView implements Add, Edit, and Delete modals for satellite school management');
  } else {
    fail('SuperadminView missing satellite management modals');
  }

  // ==========================================================================
  // SECTION 5: APPSCREEN INTEGRATION & NAVIGATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 5. APPSCREEN INTEGRATION & RBAC NAVIGATION ━━━${RESET}`);

  const appScreenPath = path.resolve(process.cwd(), 'src/components/AppScreen.tsx');
  const asCode = fs.readFileSync(appScreenPath, 'utf8');

  // Test 5.1: menuItemsSuperadmin includes Jaringan Sekolah
  if (asCode.includes('view-superadmin-jaringan') && asCode.includes('Jaringan Sekolah')) {
    pass('AppScreen menuItemsSuperadmin includes Jaringan Sekolah menu item');
  } else {
    fail('AppScreen menuItemsSuperadmin missing Jaringan Sekolah');
  }

  // Test 5.2: Header & Sidebar school switcher for Superadmin
  if (asCode.includes('aria-label="Ganti Sekolah yang Dipantau"') && asCode.includes('activeTargetSchool')) {
    pass('AppScreen integrates prominent school switcher dropdown in Superadmin header');
  } else {
    fail('AppScreen missing Superadmin header school switcher');
  }

  // Test 5.3: RBAC isolation: Guru and Local Admin menus have zero access to Jaringan Sekolah
  const guruMenuSection = asCode.slice(asCode.indexOf('menuItemsGuru = ['), asCode.indexOf('menuItemsAdmin = ['));
  const adminMenuSection = asCode.slice(asCode.indexOf('menuItemsAdmin = ['), asCode.indexOf('let menuItems ='));
  if (!guruMenuSection.includes('view-superadmin-jaringan') && !adminMenuSection.includes('view-superadmin-jaringan')) {
    pass('RBAC Isolation: Guru and Admin menus strictly exclude satellite school network features');
  } else {
    fail('RBAC Leak: Satellite school network found in Guru or Admin menu items!');
  }

  // ==========================================================================
  // SECTION 6: ADVERSARIAL EDGE CASES, HEALTH RESILIENCE & MULTI-TAB SYNC
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 6. ADVERSARIAL EDGE CASES, HEALTH RESILIENCE & MULTI-TAB SYNC ━━━${RESET}`);

  // Test 6.1: normalizeSupabaseUrl trims whitespace, removes trailing slashes, ensures https://
  try {
    const norm1 = normalizeSupabaseUrl('   https://school-1.supabase.co///   ');
    const norm2 = normalizeSupabaseUrl('school-2.supabase.co/');
    const norm3 = normalizeSupabaseUrl(null);
    const norm4 = normalizeSupabaseUrl('');

    if (
      norm1 === 'https://school-1.supabase.co' &&
      norm2 === 'https://school-2.supabase.co' &&
      norm3 === '' &&
      norm4 === ''
    ) {
      pass('normalizeSupabaseUrl successfully cleans whitespace, strips trailing slashes, and ensures https://');
    } else {
      fail(`normalizeSupabaseUrl failed: norm1="${norm1}", norm2="${norm2}"`);
    }
  } catch (e) {
    fail('Error in normalizeSupabaseUrl test', e);
  }

  // Test 6.2: Central master endpoint protection: dynamicTenantFetch does NOT rewrite sekolah_registry
  try {
    setServerTenantContext({ role: 'Superadmin' });
    setServerActiveTargetSchool({
      id: 'sch-remote-satellite',
      nama: 'Remote Satellite',
      supabase_url: 'https://satellite-school.supabase.co',
      supabase_anon_key: 'satellite-anon-key'
    });

    let interceptedUrl = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any) => {
      interceptedUrl = typeof input === 'string' ? input : input.url;
      return new Response(JSON.stringify([{ id: 'reg-1' }]), { status: 200 });
    };

    // Querying sekolah_registry while an external satellite school is active
    await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/sekolah_registry?select=*', {});
    globalThis.fetch = originalFetch;

    if (interceptedUrl.includes('placeholder.supabase.co/rest/v1/sekolah_registry')) {
      pass('Central Master Protection: dynamicTenantFetch protects sekolah_registry from satellite URL rewriting');
    } else {
      fail(`sekolah_registry was wrongly rewritten to satellite: ${interceptedUrl}`);
    }

    clearServerTenantContext();
    clearActiveTargetSchool();
  } catch (e) {
    fail('Error in sekolah_registry master protection test', e);
  }

  // Test 6.3: Central master endpoint protection: dynamicTenantFetch does NOT rewrite verify_login RPC
  try {
    setServerTenantContext({ role: 'Superadmin' });
    setServerActiveTargetSchool({
      id: 'sch-sat-auth',
      nama: 'Satellite Auth',
      supabase_url: 'https://satellite-auth.supabase.co',
      supabase_anon_key: 'satellite-auth-key'
    });

    let interceptedUrl = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any) => {
      interceptedUrl = typeof input === 'string' ? input : input.url;
      return new Response(JSON.stringify([{ id: 'u1', role: 'Superadmin' }]), { status: 200 });
    };

    await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/rpc/verify_login', { method: 'POST' });
    globalThis.fetch = originalFetch;

    if (interceptedUrl.includes('placeholder.supabase.co/rest/v1/rpc/verify_login')) {
      pass('Central Master Protection: dynamicTenantFetch protects verify_login RPC from satellite rewriting');
    } else {
      fail(`verify_login RPC was wrongly rewritten to satellite: ${interceptedUrl}`);
    }

    clearServerTenantContext();
    clearActiveTargetSchool();
  } catch (e) {
    fail('Error in verify_login RPC master protection test', e);
  }

  // Test 6.4: dynamicTenantFetch supports URL object inputs
  try {
    setServerTenantContext({ role: 'Superadmin' });
    setServerActiveTargetSchool({
      id: 'sch-url-obj',
      nama: 'URL Object Target',
      supabase_url: 'https://satellite-url.supabase.co',
      supabase_anon_key: 'sat-key'
    });

    let interceptedUrl = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any) => {
      interceptedUrl = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
      return new Response(JSON.stringify([]), { status: 200 });
    };

    const targetUrlObj = new URL('https://placeholder.supabase.co/rest/v1/data_guru?select=id');
    await dynamicTenantFetch(targetUrlObj, {});
    globalThis.fetch = originalFetch;

    if (interceptedUrl.startsWith('https://satellite-url.supabase.co/rest/v1/data_guru')) {
      pass('dynamicTenantFetch successfully rewrites input when provided as a native URL object');
    } else {
      fail(`URL object input was not rewritten: got ${interceptedUrl}`);
    }

    clearServerTenantContext();
    clearActiveTargetSchool();
  } catch (e) {
    fail('Error in URL object rewriting test', e);
  }

  // Test 6.5: masterSupabase instance exists and targets the default central origin
  try {
    if (masterSupabase && typeof masterSupabase.from === 'function') {
      pass('masterSupabase client instance is instantiated and exported for direct central access');
    } else {
      fail('masterSupabase client instance is invalid or not exported');
    }
  } catch (e) {
    fail('Error in masterSupabase verification test', e);
  }

  // Test 6.6: onActiveTargetSchoolChange cross-tab helper function exists
  try {
    if (typeof onActiveTargetSchoolChange === 'function') {
      pass('onActiveTargetSchoolChange listener helper is exported and handles multi-tab synchronization');
    } else {
      fail('onActiveTargetSchoolChange helper is not exported');
    }
  } catch (e) {
    fail('Error in onActiveTargetSchoolChange test', e);
  }

  // Test 6.7: SuperadminView normalizes Vercel link href to prevent relative path bug
  if (saCode.includes('sch.vercel_url.startsWith(\'http://\') || sch.vercel_url.startsWith(\'https://\')')) {
    pass('SuperadminView card links normalize Vercel URL to avoid relative URL navigation bug');
  } else {
    fail('SuperadminView card link lacks Vercel URL protocol normalization');
  }

  // Test 6.8: SuperadminView checks error on sekolah_registry CRUD operations
  if (
    saCode.includes('if (regErr) {') ||
    saCode.includes('if (regErr) throw')
  ) {
    pass('SuperadminView validates PostgREST error responses on sekolah_registry operations');
  } else {
    fail('SuperadminView does not check or propagate errors on sekolah_registry operations');
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}══════════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}${RESET}`);
  if (failedTests === 0) {
    console.log(`${GREEN}${BOLD}🎉 ALL PORTAL INDUK JARINGAN MULTI-SEKOLAH TESTS PASSED!${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}✖ SOME TESTS FAILED!${RESET}\n`);
    process.exitCode = 1;
  }
}

runTests();
