/**
 * ============================================================================
 * EMPIRICAL INTEGRATION & RBAC TEST SUITE
 * File: tests/tata_usaha_role_rbac_and_isolation.test.ts
 *
 * Verifies all Acceptance Criteria for Role Tata Usaha ('tata_usaha'):
 * 1. R1: Authentication & Role Identity (Types, Session, Normalization).
 * 2. R2: Menu Isolation (Strictly 2 items: Data Siswa & Data Guru, Miller's Law).
 * 3. R3: Tab RBAC & Routing Isolation (evaluateTabRBAC permits student & teacher
 *        master tabs while blocking all other master tabs, Bank Dokumen / Persuratan,
 *        system configuration, and superadmin modules).
 * 4. R4: PostgREST Mutation Interception Security (checkMasterDataMutationGuard
 *        allows mutations on data_siswa & data_guru while strictly rejecting
 *        all other master data tables with HTTP 403 Forbidden / code 42501).
 * 5. R5: Static AST & Component Invariants (AST comment preservation in
 *        AppScreen.tsx and ClaySidebar.tsx).
 * 6. R6: Zero Regression on Existing Roles (superadmin, admin, guru, siswa, dinas, kepsek).
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  evaluateTabRBAC,
  VIEW_ALIASES
} from '../src/lib/navigation';
import {
  isAdminRole,
  checkMasterDataMutationGuard,
  isMasterDataEndpoint
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

function recordAssert(condition: boolean, testId: string, desc: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✔ [${testId}] PASS:${RESET} ${desc}`);
    if (detail) console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✖ [${testId}] FAIL:${RESET} ${desc}`);
    if (detail) console.error(`    ${RED}↳ Detail: ${detail}${RESET}`);
  }
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🧪 TEST SUITE: ROLE TATA USAHA RBAC, ISOLATION & SECURITY GUARANTEES${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const projectRoot = path.resolve(__dirname, '..');

  // ==========================================================================
  // SUITE 1: Auth & Role Identity Invariants
  // ==========================================================================
  console.log(`${BOLD}--- Suite 1: Authentication & Role Identity Invariants ---${RESET}`);

  // Test 1.1: isAdminRole must strictly remain FALSE for Tata Usaha
  recordAssert(
    isAdminRole('tata_usaha') === false,
    'T1.1',
    "isAdminRole('tata_usaha') strictly returns false",
    'Prevents unintended role escalation'
  );
  recordAssert(
    isAdminRole('Tata Usaha') === false,
    'T1.2',
    "isAdminRole('Tata Usaha') strictly returns false (case-insensitive with space)",
    'Formatting safety'
  );
  recordAssert(
    isAdminRole('tatausaha') === false,
    'T1.3',
    "isAdminRole('tatausaha') strictly returns false",
    'Normalized form safety'
  );

  // Test 1.4: user types file inspection
  const userTypesPath = path.join(projectRoot, 'src', 'types', 'user.ts');
  const userTypesContent = fs.readFileSync(userTypesPath, 'utf8');
  recordAssert(
    userTypesContent.includes("'tata_usaha'"),
    'T1.4',
    "src/types/user.ts defines 'tata_usaha' in UserRole union",
    userTypesPath
  );

  // Test 1.5: database types file inspection
  const dbTypesPath = path.join(projectRoot, 'src', 'types', 'database.ts');
  const dbTypesContent = fs.readFileSync(dbTypesPath, 'utf8');
  recordAssert(
    dbTypesContent.includes('"tata_usaha"'),
    'T1.5',
    'src/types/database.ts defines "tata_usaha" in RoleUser union',
    dbTypesPath
  );

  // ==========================================================================
  // SUITE 2: Menu Isolation & Canonical Route Resolution
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 2: Menu Isolation & Canonical Route Aliases ---${RESET}`);

  const tuMenuItems = getConsolidatedMenuItems({ role: 'tata_usaha' });

  // Test 2.1: Exactly 7 menu items (including Dashboard)
  recordAssert(
    tuMenuItems.length === 7,
    'T2.1',
    `getConsolidatedMenuItems returns strictly 7 menu items for tata_usaha (got: ${tuMenuItems.length})`,
    'Satisfies Tata Usaha Dashboard specification'
  );

  // Test 2.2: The 7 menu items are Dashboard, Presensi TU, Jurnal Kegiatan, Asesmen, Rapor, Informasi Sekolah, Pengaturan Akun
  const expectedItems = [
    { id: 'view-home', label: 'Dashboard' },
    { id: 'view-guru-presensi', label: 'Presensi TU' },
    { id: 'view-guru-jurnal', label: 'Jurnal Kegiatan' },
    { id: 'view-gradebook', label: 'Asesmen' },
    { id: 'view-rapor', label: 'Rapor' },
    { id: 'view-informasi', label: 'Informasi Sekolah' },
    { id: 'view-pengaturan-akun', label: 'Pengaturan Akun' }
  ];
  const allItemsPresent = expectedItems.every(exp =>
    tuMenuItems.some(item => item.id === exp.id && item.label === exp.label)
  );
  recordAssert(
    allItemsPresent,
    'T2.2',
    'Menu items contain strictly Dashboard, Presensi TU, Jurnal Kegiatan, Asesmen, Rapor, Informasi Sekolah, and Pengaturan Akun',
    JSON.stringify(tuMenuItems.map(i => ({ id: i.id, label: i.label })))
  );

  // Test 2.3: Zero exposure of prohibited modules
  const exposedProhibited = tuMenuItems.filter(item =>
    [
      'view-admin-data',
      'view-dokumen',
      'view-admin-config',
      'view-admin-backup',
      'view-admin-verif',
      'view-admin-rekap',
      'view-piket',
      'view-ujian',
      'view-superadmin-overview',
      'view-superadmin-schools',
      'view-dinas-overview'
    ].includes(item.id)
  );
  recordAssert(
    exposedProhibited.length === 0,
    'T2.3',
    'Menu items strictly exclude view-admin-data, view-dokumen, view-admin-config, and administrative modules',
    `Exposed prohibited: ${exposedProhibited.length}`
  );

  // Test 2.4: Aliases in VIEW_ALIASES
  recordAssert(
    VIEW_ALIASES['view-presensi-tu']?.view === 'view-guru-presensi',
    'T2.4',
    "VIEW_ALIASES maps 'view-presensi-tu' -> { view: 'view-guru-presensi' }"
  );
  recordAssert(
    VIEW_ALIASES['view-jurnal-kegiatan']?.view === 'view-guru-jurnal',
    'T2.5',
    "VIEW_ALIASES maps 'view-jurnal-kegiatan' -> { view: 'view-guru-jurnal' }"
  );
  recordAssert(
    VIEW_ALIASES['view-asesmen']?.view === 'view-gradebook',
    'T2.6',
    "VIEW_ALIASES maps 'view-asesmen' -> { view: 'view-gradebook' }"
  );

  // Test 2.7: Canonical Route Resolution
  const resPresensi = resolveCanonicalRoute('view-presensi-tu');
  recordAssert(
    resPresensi.canonicalView === 'view-guru-presensi',
    'T2.7',
    "resolveCanonicalRoute('view-presensi-tu') resolves to view-guru-presensi"
  );
  const resJurnal = resolveCanonicalRoute('view-jurnal-kegiatan');
  recordAssert(
    resJurnal.canonicalView === 'view-guru-jurnal',
    'T2.8',
    "resolveCanonicalRoute('view-jurnal-kegiatan') resolves to view-guru-jurnal"
  );
  const resAsesmen = resolveCanonicalRoute('view-asesmen');
  recordAssert(
    resAsesmen.canonicalView === 'view-gradebook',
    'T2.9',
    "resolveCanonicalRoute('view-asesmen') resolves to view-gradebook"
  );

  // ==========================================================================
  // SUITE 3: Tab RBAC & Routing Isolation (evaluateTabRBAC)
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 3: Tab RBAC & Routing Isolation (evaluateTabRBAC) ---${RESET}`);

  // Test 3.1: Permitted Views
  const permittedViews = [
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-gradebook',
    'view-rapor',
    'view-informasi',
    'view-home'
  ];
  permittedViews.forEach((v, index) => {
    const res = evaluateTabRBAC(v, '', { role: 'tata_usaha' });
    recordAssert(
      res.allowed === true,
      `T3.1.${index + 1}`,
      `evaluateTabRBAC allows '${v}' for tata_usaha`
    );
  });

  // Test 3.2: Allowed Subtab under gradebook
  const rbacRaporSubtab = evaluateTabRBAC('view-gradebook', 'rapor', { role: 'tata_usaha' });
  recordAssert(
    rbacRaporSubtab.allowed === true,
    'T3.2',
    "evaluateTabRBAC allows 'view-gradebook' subtab 'rapor' for tata_usaha"
  );

  // Test 3.3: Strict Denial of view-admin-data (Data Siswa & Data Guru no longer accessible to TU)
  const rbacAdminData = evaluateTabRBAC('view-admin-data', '', { role: 'tata_usaha' });
  recordAssert(
    rbacAdminData.allowed === false,
    'T3.3',
    "evaluateTabRBAC strictly blocks 'view-admin-data' for tata_usaha (fallback: view-guru-presensi)",
    `Fallback: ${rbacAdminData.fallbackView}`
  );

  // Test 3.4: Strict Denial of Bank Dokumen / Persuratan
  const rbacDokumen = evaluateTabRBAC('view-dokumen', '', { role: 'tata_usaha' });
  recordAssert(
    rbacDokumen.allowed === false && rbacDokumen.reason?.includes('Bank Dokumen'),
    'T3.4',
    "evaluateTabRBAC strictly blocks 'view-dokumen' for tata_usaha with descriptive reason",
    `Reason: ${rbacDokumen.reason}`
  );

  // Test 3.5: Strict Denial of System Config & Superadmin & Administrative Views
  const disallowedViews = [
    'view-admin-config',
    'view-admin-backup',
    'view-sistem-blok',
    'view-admin-verif',
    'view-admin-rekap',
    'view-piket',
    'view-ujian',
    'view-superadmin-overview',
    'view-superadmin-schools',
    'view-dinas-overview'
  ];
  disallowedViews.forEach((v, index) => {
    const res = evaluateTabRBAC(v, '', { role: 'tata_usaha' });
    recordAssert(
      res.allowed === false,
      `T3.5.${index + 1}`,
      `evaluateTabRBAC strictly blocks '${v}' for tata_usaha`,
      `Fallback: ${res.fallbackView || res.fallbackTab}, Reason: ${res.reason}`
    );
  });

  // ==========================================================================
  // SUITE 4: PostgREST Mutation Interception Security (checkMasterDataMutationGuard)
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 4: Network & PostgREST Mutation Interception Security ---${RESET}`);

  // Test 4.1: Permitted Mutations for tata_usaha (Data Siswa & Data Guru)
  const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const permittedEndpoints = [
    '/rest/v1/data_siswa',
    '/rest/v1/public.data_siswa',
    'https://xyz.supabase.co/rest/v1/data_siswa?id=eq.1',
    '/rest/v1/data_guru',
    '/rest/v1/public.data_guru',
    'https://xyz.supabase.co/rest/v1/data_guru?id=eq.1'
  ];

  permittedEndpoints.forEach((url, i) => {
    methods.forEach((m) => {
      const guardRes = checkMasterDataMutationGuard(url, m, 'tata_usaha');
      recordAssert(
        guardRes === null,
        `T4.1.${i}.${m}`,
        `checkMasterDataMutationGuard allows ${m} on ${url} for tata_usaha`
      );
    });
  });

  // Test 4.2: Strictly Forbidden Mutations for tata_usaha (Other Master Data Tables)
  const forbiddenMasterEndpoints = [
    '/rest/v1/data_kelas',
    '/rest/v1/data_mapel',
    '/rest/v1/jadwal_pelajaran',
    '/rest/v1/wali_kelas',
    '/rest/v1/kalender_pendidikan',
    '/rest/v1/sistem_blok',
    '/rest/v1/guru_kelas',
    '/rest/v1/guru_mapel'
  ];

  forbiddenMasterEndpoints.forEach((url, i) => {
    const guardRes = checkMasterDataMutationGuard(url, 'POST', 'tata_usaha');
    recordAssert(
      guardRes !== null && guardRes.status === 403,
      `T4.2.${i}`,
      `checkMasterDataMutationGuard returns 403 Forbidden for POST on ${url} for tata_usaha`,
      `Status: ${guardRes?.status}`
    );
  });

  // Test 4.3: Non-mutating GET operations allowed on all endpoints
  forbiddenMasterEndpoints.forEach((url, i) => {
    const getRes = checkMasterDataMutationGuard(url, 'GET', 'tata_usaha');
    recordAssert(
      getRes === null,
      `T4.3.${i}`,
      `checkMasterDataMutationGuard permits GET read operation on ${url} for tata_usaha`
    );
  });

  // ==========================================================================
  // SUITE 5: Static AST & Component Invariants
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 5: Static AST & Component Invariants ---${RESET}`);

  // Test 5.1: AST comment preservation in AppScreen.tsx
  const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
  recordAssert(
    appScreenContent.includes('{/* AST preservation: data-tour={item.id} */}'),
    'T5.1',
    "AppScreen.tsx preserves verbatim: {/* AST preservation: data-tour={item.id} */}"
  );

  // Test 5.2: AST comment preservation in ClaySidebar.tsx
  const claySidebarPath = path.join(projectRoot, 'src', 'components', 'ClaySidebar.tsx');
  const claySidebarContent = fs.readFileSync(claySidebarPath, 'utf8');
  recordAssert(
    claySidebarContent.includes('{/* AST preservation: data-tour={item.id} */}'),
    'T5.2',
    "ClaySidebar.tsx preserves verbatim: {/* AST preservation: data-tour={item.id} */}"
  );

  // Test 5.3: AppScreen.tsx contains isTataUsaha logic and view-dokumen guard
  recordAssert(
    appScreenContent.includes('isTataUsaha'),
    'T5.3',
    'AppScreen.tsx implements isTataUsaha check'
  );
  recordAssert(
    appScreenContent.includes("currentView === 'view-dokumen'") &&
    appScreenContent.includes('!isTataUsaha'),
    'T5.4',
    "AppScreen.tsx guards 'view-dokumen' with !isTataUsaha check"
  );
  recordAssert(
    appScreenContent.includes("currentView === 'view-rapor'") &&
    appScreenContent.includes("isTataUsaha ? ("),
    'T5.5',
    "AppScreen.tsx allows view-rapor for isTataUsaha"
  );

  // Test 5.6: AdminDataView.tsx contains tabs filtering and canModify
  const adminDataViewPath = path.join(projectRoot, 'src', 'components', 'AdminDataView.tsx');
  const adminDataViewContent = fs.readFileSync(adminDataViewPath, 'utf8');
  recordAssert(
    adminDataViewContent.includes('isTataUsaha') &&
    adminDataViewContent.includes("visibleTabs = isTataUsaha ? tabs.filter(t => t.id === 'Data_Siswa' || t.id === 'Data_Guru') : tabs"),
    'T5.6',
    "AdminDataView.tsx strictly filters tabs to Data_Siswa & Data_Guru for isTataUsaha"
  );
  recordAssert(
    adminDataViewContent.includes('canModify = isAdmin || (isTataUsaha && (activeTab === \'Data_Siswa\' || activeTab === \'Data_Guru\'))'),
    'T5.7',
    "AdminDataView.tsx computes canModify authorizing CRUD for tata_usaha on Siswa & Guru tabs"
  );

  // Test 5.7: ClaySidebar.tsx contains Tata Usaha role label and icon
  recordAssert(
    claySidebarContent.includes("'Tata Usaha'") && claySidebarContent.includes("'fa-id-card-clip'"),
    'T5.8',
    "ClaySidebar.tsx renders 'Tata Usaha' label and 'fa-id-card-clip' icon"
  );

  // ==========================================================================
  // SUITE 6: Non-Regression on Existing Roles
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 6: Non-Regression on Existing Roles ---${RESET}`);

  // Test 6.1: Admin menu items preserved
  const adminItems = getConsolidatedMenuItems({ role: 'admin' });
  recordAssert(
    adminItems.length >= 8 && adminItems.some(i => i.id === 'view-admin-data') && adminItems.some(i => i.id === 'view-admin-config'),
    'T6.1',
    "Admin consolidated menu items remain fully intact with master data and config"
  );

  // Test 6.2: Superadmin menu items preserved
  const superadminItems = getConsolidatedMenuItems({ role: 'superadmin' });
  recordAssert(
    superadminItems.length === 3 && superadminItems.some(i => i.id === 'view-superadmin-overview'),
    'T6.2',
    "Superadmin menu items remain intact (Ringkasan Platform, Jaringan Sekolah, Akun Dinas)"
  );

  // Test 6.3: Guru menu items preserved
  const guruItems = getConsolidatedMenuItems({ role: 'guru' });
  recordAssert(
    guruItems.length === 6 && guruItems.some(i => i.id === 'view-dokumen') && guruItems.some(i => i.id === 'view-guru-jurnal'),
    'T6.3',
    "Guru menu items remain intact and continue to have access to Perangkat Pembelajaran (view-dokumen)"
  );

  // Test 6.4: Siswa menu items preserved
  const siswaItems = getConsolidatedMenuItems({ role: 'siswa' });
  recordAssert(
    siswaItems.length === 2 && siswaItems.some(i => i.id === 'view-ujian'),
    'T6.4',
    "Siswa menu items remain intact with Ujian and Informasi"
  );

  // Test 6.5: Guru evaluateTabRBAC for view-dokumen remains allowed
  const guruDokumenRBAC = evaluateTabRBAC('view-dokumen', '', { role: 'guru' });
  recordAssert(
    guruDokumenRBAC.allowed === true,
    'T6.5',
    "evaluateTabRBAC continues to allow view-dokumen for role: 'guru'"
  );

  // Test 6.6: Admin evaluateTabRBAC for all master tabs remains allowed
  const adminPenggunaRBAC = evaluateTabRBAC('view-admin-data', 'Pengguna', { role: 'admin' });
  recordAssert(
    adminPenggunaRBAC.allowed === true,
    'T6.6',
    "evaluateTabRBAC continues to allow view-admin-data tab 'Pengguna' for role: 'admin'"
  );

  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📊 SUMMARY: ${passedTests} passed, ${failedTests} failed out of ${totalTests} tests${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
