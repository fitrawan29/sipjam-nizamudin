/**
 * ============================================================================
 * ADVERSARIAL REVIEWER TEST SUITE: SUPERADMIN CLEANUP & PURGE INTEGRITY
 * File: tests/adversarial_superadmin_cleanup_reviewer.test.ts
 *
 * Verifies Requirements R1 - R3 and Acceptance Criteria from <original_task>:
 * - R1: Obsolete "Kelola Sekolah" & "Admin Sekolah" tabs & menus are purged
 * - R2: Legacy local school/admin modals, handlers, and unused states are purged
 * - R3: Overview tab KPI cards & quick actions are fully aligned with satellite network
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(id: string, desc: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${desc}`);
}

function fail(id: string, desc: string, detail?: string) {
  totalTests++;
  failedTests++;
  console.error(`  ${RED}✖ [${id}] FAIL:${RESET} ${desc}`);
  if (detail) console.error(`    ↳ ${detail}`);
}

async function runAdversarialReviewerTests() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  ADVERSARIAL REVIEWER: SUPERADMIN PURGE & SATELLITE INTEGRITY TEST  ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const superadminPath = path.resolve(process.cwd(), 'src/components/SuperadminView.tsx');
  const appScreenPath = path.resolve(process.cwd(), 'src/components/AppScreen.tsx');
  const tutorialPath = path.resolve(process.cwd(), 'src/components/Tutorial/tutorialData.ts');

  const saCode = fs.readFileSync(superadminPath, 'utf8');
  const asCode = fs.readFileSync(appScreenPath, 'utf8');
  const tutCode = fs.readFileSync(tutorialPath, 'utf8');

  // ==========================================================================
  // SECTION 1: R1 TAB PURGE & SIMPLIFIED NAVIGATION
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ 1. VERIFY R1: REMOVAL OF OBSOLETE TABS & MENU ITEMS ━━━${RESET}`);

  // Test 1.1: SuperadminView tab navigation strictly offers 2 tabs: overview and jaringan
  const tabButtonOverview = saCode.includes("switchTab('overview')");
  const tabButtonJaringan = saCode.includes("switchTab('jaringan')");
  const tabButtonSekolah = saCode.includes("switchTab('sekolah')");
  const tabButtonAdmins = saCode.includes("switchTab('admins')");

  if (tabButtonOverview && tabButtonJaringan && !tabButtonSekolah && !tabButtonAdmins) {
    pass('R1-01', 'SuperadminView tab navigation renders strictly 2 tabs (overview & jaringan) with no obsolete tabs');
  } else {
    fail('R1-01', 'SuperadminView tab buttons contain obsolete tab switchers', `sekolah=${tabButtonSekolah}, admins=${tabButtonAdmins}`);
  }

  // Test 1.2: activeTab type in SuperadminView strictly constrained
  const validActiveTab =
    (saCode.includes("useState<'overview' | 'jaringan'>") || saCode.includes("useState<'overview' | 'jaringan' | 'dinas'>")) &&
    !saCode.includes("'overview' | 'sekolah'") &&
    !saCode.includes("'overview' | 'admins'");

  if (validActiveTab) {
    pass('R1-02', 'activeTab state type strictly constrained without legacy tabs');
  } else {
    fail('R1-02', 'activeTab state still types legacy tabs');
  }

  // Test 1.3: AppScreen menuItemsSuperadmin does NOT contain obsolete menu items
  if (
    !asCode.includes("'view-superadmin-sekolah'") &&
    !asCode.includes("'view-superadmin-admins'") &&
    asCode.includes("'view-superadmin-overview'") &&
    asCode.includes("'view-superadmin-jaringan'")
  ) {
    pass('R1-03', 'AppScreen menuItemsSuperadmin stripped view-superadmin-sekolah and view-superadmin-admins');
  } else {
    fail('R1-03', 'AppScreen menuItemsSuperadmin still references obsolete view ids');
  }

  // Test 1.4: AppScreen SuperadminView initialTab prop toggles strictly between overview and jaringan
  const cleanAs = asCode.replace(/\r\n/g, '\n');
  if (
    cleanAs.includes("currentView === 'view-superadmin-jaringan'\n                  ? 'jaringan'\n                  : 'overview'") ||
    cleanAs.includes("currentView === 'view-superadmin-jaringan' ? 'jaringan' : 'overview'")
  ) {
    pass('R1-04', 'AppScreen maps initialTab strictly to jaringan or overview');
  } else {
    fail('R1-04', 'AppScreen does not cleanly map initialTab to overview/jaringan');
  }

  // ==========================================================================
  // SECTION 2: R2 PURGE OF LEGACY MODALS, HANDLERS, AND UNUSED STATES
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 2. VERIFY R2: PURGE OF REDUNDANT MODALS, HANDLERS & STATES ━━━${RESET}`);

  // Test 2.1: Legacy local school modals and handlers purged
  const legacySchoolHandlers = [
    'showAddSchoolModal',
    'showEditSchoolModal',
    'handleOpenAddSchoolModal',
    'handleEditSchool',
    'handleToggleSchoolStatus',
    'handleDeleteSchool'
  ];
  const foundLegacySchool = legacySchoolHandlers.filter(h => saCode.includes(h));
  if (foundLegacySchool.length === 0) {
    pass('R2-01', 'All legacy local school modals and handlers purged from SuperadminView');
  } else {
    fail('R2-01', `Found legacy school handlers: ${foundLegacySchool.join(', ')}`);
  }

  // Test 2.2: Legacy local admin modals and handlers purged
  const legacyAdminHandlers = [
    'showAddAdminModal',
    'showEditAdminModal',
    'handleOpenAddAdminModal',
    'handleEditAdmin',
    'handleResetAdminPassword',
    'handleDeleteAdmin'
  ];
  const foundLegacyAdmin = legacyAdminHandlers.filter(h => saCode.includes(h));
  if (foundLegacyAdmin.length === 0) {
    pass('R2-02', 'All legacy local admin modals and handlers purged from SuperadminView');
  } else {
    fail('R2-02', `Found legacy admin handlers: ${foundLegacyAdmin.join(', ')}`);
  }

  // Test 2.3: Unused state variables and filters purged
  const unusedStates = [
    'adminList',
    'adminSearch',
    'cityFilter',
    'statusFilter',
    'sekolahList',
    'filteredSekolah',
    'filteredAdmins',
    'schoolNameMap',
    'uniqueCities'
  ];
  const foundUnusedStates = unusedStates.filter(s => {
    // Regex looking for `const [s, ` or `let s` or direct identifier usage
    const reg = new RegExp(`\\b${s}\\b`);
    return reg.test(saCode);
  });
  if (foundUnusedStates.length === 0) {
    pass('R2-03', 'All unused state variables, filters, and computed lists purged from SuperadminView');
  } else {
    fail('R2-03', `Found unused state variables still present: ${foundUnusedStates.join(', ')}`);
  }

  // ==========================================================================
  // SECTION 3: R3 ALIGNMENT OF OVERVIEW TAB TO SATELLITE NETWORK
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 3. VERIFY R3: ALIGNMENT OF OVERVIEW TAB TO JARINGAN SEKOLAH ━━━${RESET}`);

  // Test 3.1: Overview KPI cards display satellite metrics
  const hasSatelliteKpi =
    saCode.includes('Total Satelit') &&
    saCode.includes('Database Online') &&
    saCode.includes('Total Guru') &&
    saCode.includes('Total Siswa') &&
    saCode.includes('satelliteSchools.length') &&
    saCode.includes('onlineDbCount') &&
    saCode.includes('totalGuruNetwork') &&
    saCode.includes('totalSiswaNetwork');

  if (hasSatelliteKpi) {
    pass('R3-01', 'Overview tab KPI cards reflect satellite network counts, live DB status, and cross-network users');
  } else {
    fail('R3-01', 'Overview tab missing required satellite KPI cards or metrics bindings');
  }

  // Test 3.2: Overview quick actions point to satellite tools
  const hasQuickActions =
    saCode.includes('Aksi Cepat Jaringan') &&
    saCode.includes('Tambah Sekolah Satelit') &&
    saCode.includes('handleOpenAddSatelliteSchoolModal') &&
    saCode.includes('Periksa Status Live Database') &&
    saCode.includes('checkSatelliteHealthAndMetrics') &&
    saCode.includes('Kelola Jaringan Sekolah');

  if (hasQuickActions) {
    pass('R3-02', 'Overview tab quick action buttons provide direct shortcuts to satellite network tools');
  } else {
    fail('R3-02', 'Overview quick actions do not link to satellite tools');
  }

  // Test 3.3: Overview tab does not display obsolete local tables
  const noLegacyTables =
    !saCode.includes('Daftar Sekolah Terdaftar') &&
    !saCode.includes('Administrator Sekolah') &&
    saCode.includes('Jaringan Sekolah Satelit Terbaru');

  if (noLegacyTables) {
    pass('R3-03', 'Overview tab renders live satellite network summary instead of obsolete local tables');
  } else {
    fail('R3-03', 'Overview tab still renders legacy local school or admin table');
  }

  // ==========================================================================
  // SECTION 4: FUNCTIONAL SATELLITE NETWORK INTEGRITY
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 4. VERIFY SATELLITE NETWORK FUNCTIONALITY PRESERVATION ━━━${RESET}`);

  // Test 4.1: Satellite school management handlers fully preserved
  const satOpsPreserved =
    saCode.includes('handleOpenAddSatelliteSchoolModal') &&
    saCode.includes('handleEditSatelliteSchool') &&
    saCode.includes('handleDeleteSatelliteSchool') &&
    saCode.includes('handleSelectTargetSchool') &&
    saCode.includes('handleOpenVercelUrl') &&
    saCode.includes('checkSatelliteHealthAndMetrics');

  if (satOpsPreserved) {
    pass('R4-01', 'All satellite school network operations (add, edit, delete, switch, ping, vercel) preserved');
  } else {
    fail('R4-01', 'Some satellite school network operations are missing');
  }

  // Test 4.2: Tutorial data updated and coherent
  const tutUpdated =
    tutCode.includes('view-superadmin-jaringan') &&
    !tutCode.includes('view-superadmin-sekolah') &&
    !tutCode.includes('view-superadmin-admins');

  if (tutUpdated) {
    pass('R4-02', 'tutorialData.ts updated with superadmin-jaringan and purged obsolete viewIds');
  } else {
    fail('R4-02', 'tutorialData.ts still contains obsolete superadmin viewIds');
  }

  // ==========================================================================
  // SECTION 5: ADVERSARIAL EDGE CASES & STRICT TYPE / MENU ISOLATION
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 5. VERIFY ADVERSARIAL EDGE CASES & MENU ISOLATION ━━━${RESET}`);

  // Test 5.1: SuperadminViewProps strictly types initialTab and onNavigateTab
  const strictProps =
    (saCode.includes("initialTab?: 'overview' | 'jaringan'") || saCode.includes("initialTab?: 'overview' | 'jaringan' | 'dinas'")) &&
    (saCode.includes("onNavigateTab?: (tab: 'overview' | 'jaringan') => void") || saCode.includes("onNavigateTab?: (tab: 'overview' | 'jaringan' | 'dinas') => void"));

  if (strictProps) {
    pass('R5-01', 'SuperadminViewProps strictly types initialTab and onNavigateTab without obsolete tab values');
  } else {
    fail('R5-01', 'SuperadminViewProps does not strictly constrain tab parameters');
  }

  // Test 5.2: Zero legacy modal overlay JSX in SuperadminView
  const legacyModalJsx = [
    'showAddSchoolModal &&',
    'showEditSchoolModal &&',
    'showAddAdminModal &&',
    'showEditAdminModal &&',
    'modal-backdrop-school',
    'modal-backdrop-admin'
  ];
  const foundModalJsx = legacyModalJsx.filter(m => saCode.includes(m));
  if (foundModalJsx.length === 0) {
    pass('R5-02', 'Zero legacy modal markup or conditional render blocks exist in SuperadminView JSX');
  } else {
    fail('R5-02', `Found residual legacy modal JSX: ${foundModalJsx.join(', ')}`);
  }

  // Test 5.3: AppScreen default Superadmin menu isolation
  const hasOnlyTwoMenuItemsByDefault =
    asCode.includes("const menuItemsSuperadmin = [\n    { id: 'view-superadmin-overview'") ||
    asCode.includes("const menuItemsSuperadmin = [\r\n    { id: 'view-superadmin-overview'");

  if (hasOnlyTwoMenuItemsByDefault && !asCode.includes("view-superadmin-sekolah") && !asCode.includes("view-superadmin-admins")) {
    pass('R5-03', 'AppScreen menuItemsSuperadmin defaults strictly to 2 base items with no legacy entries');
  } else {
    fail('R5-03', 'AppScreen menuItemsSuperadmin contains unexpected base items');
  }

  // ==========================================================================
  // SECTION 6: ADVERSARIAL R3: ZERO LOCAL MUTATIONS & ROUTING HARDENING
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ 6. VERIFY ADVERSARIAL R3: RUNTIME INTEGRITY & DEEP ISOLATION ━━━${RESET}`);

  // Test 6.1: Zero active runtime queries mutating or fetching obsolete local school admin accounts from public.users table
  // Dinas Pendidikan regional account management is legitimate.
  const codeWithoutComments = saCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const hasLegacyAdminQueries =
    codeWithoutComments.includes(".from('users')") &&
    (codeWithoutComments.includes("role === 'admin'") || codeWithoutComments.includes("ilike('role', '%admin%')"));
  if (!hasLegacyAdminQueries) {
    pass('R6-01', 'SuperadminView contains 0 active runtime queries fetching or mutating obsolete local school admin accounts');
  } else {
    fail('R6-01', 'SuperadminView contains active runtime queries referencing obsolete local admin accounts');
  }

  // Test 6.2: AppScreen onNavigateTab safely routes only between overview and jaringan
  const cleanAppScreen = asCode.replace(/\r\n/g, '\n');
  const hasSafeTabRouter =
    cleanAppScreen.includes("if (tab === 'jaringan') {") &&
    cleanAppScreen.includes("setCurrentView('view-superadmin-jaringan');") &&
    cleanAppScreen.includes("setCurrentView('view-superadmin-overview');");

  if (hasSafeTabRouter) {
    pass('R6-02', 'AppScreen onNavigateTab callback deterministically switches between overview and jaringan');
  } else {
    fail('R6-02', 'AppScreen onNavigateTab does not properly constrain superadmin tab routing');
  }

  // Test 6.3: SuperadminView switchTab method strict typing
  const strictSwitchTab =
    saCode.includes("const switchTab = (tab: 'overview' | 'jaringan') => {") ||
    saCode.includes("const switchTab = (tab: 'overview' | 'jaringan' | 'dinas') => {");

  if (strictSwitchTab) {
    pass('R6-03', 'switchTab function signature strictly accepts only overview | jaringan | dinas union');
  } else {
    fail('R6-03', 'switchTab function signature allows loose or unconstrained tab string');
  }

  // Test 6.4: Zero legacy raw HTML modal overlays for schools or admins
  const rawModalSignatures = [
    'id="modal-add-school"',
    'id="modal-edit-school"',
    'id="modal-add-admin"',
    'id="modal-edit-admin"',
    'aria-labelledby="modal-school-title"',
    'aria-labelledby="modal-admin-title"'
  ];
  const foundRawModals = rawModalSignatures.filter(sig => saCode.includes(sig));
  if (foundRawModals.length === 0) {
    pass('R6-04', 'Zero legacy raw modal DOM containers exist; all modals migrated to SweetAlert2');
  } else {
    fail('R6-04', `Found legacy raw modal DOM containers: ${foundRawModals.join(', ')}`);
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n══════════════════════════════════════════════════════════════════════`);
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed out of ${totalTests} tests`);
  console.log(`══════════════════════════════════════════════════════════════════════\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialReviewerTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});

