/**
 * tests/adversarial_m3_coldstart_rbac_popstate_challenger.test.ts
 * 
 * EMPIRICAL CHALLENGER TEST SUITE: Milestone 3
 * Focus:
 * 1. Cold-start URL aliasing stress across all 8 legacy views & malformed queries
 * 2. RBAC direct deep-link defenses across roles (Guru, Wali, Piket, Kepsek, Dinas, Admin)
 * 3. Rapid view transitions and browser popstate back/forward state synchronization
 * 4. Compound tour token attribute resolution and DOM selector matching
 */

import {
  resolveCanonicalRoute,
  VIEW_ALIASES,
  SPEC_VIEW_ALIASES,
  evaluateTabRBAC,
  getConsolidatedMenuItems
} from '../src/lib/navigation';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    passed++;
    console.log(`  ✔ [PASS] ${desc}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${desc}`);
  }
}

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  EMPIRICAL CHALLENGER M3: ADVERSARIAL STRESS TEST & VERIFICATION    ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

// ==============================================================================
// SUITE 1: COLD-START URL ALIASING STRESS (ALL 8 LEGACY VIEWS + ADVERSARIAL QUERIES)
// ==============================================================================
console.log('━━━ [Suite 1] Cold-Start URL Aliasing Stress (All 8 Legacy Views) ━━━');

const LEGACY_8_VIEWS: Record<string, { expectedView: string; expectedTab: string }> = {
  'view-guru-rekap-jurnal': { expectedView: 'view-guru-jurnal', expectedTab: 'rekap-pribadi' },
  'view-jurnal-kelas':      { expectedView: 'view-guru-jurnal', expectedTab: 'supervisi-kelas' },
  'view-history':           { expectedView: 'view-guru-presensi', expectedTab: 'riwayat' },
  'view-rapor':             { expectedView: 'view-gradebook', expectedTab: 'rapor' },
  'view-analitik':          { expectedView: 'view-admin-rekap', expectedTab: 'analitik' },
  'view-rekap-guru':        { expectedView: 'view-admin-rekap', expectedTab: 'tabel' },
  'view-sistem-blok':       { expectedView: 'view-admin-data', expectedTab: 'blok' },
  'view-admin-backup':      { expectedView: 'view-admin-config', expectedTab: 'backup' }
};

for (const [legacyId, expected] of Object.entries(LEGACY_8_VIEWS)) {
  // 1. Clean cold start without explicit tab
  const resClean = resolveCanonicalRoute(legacyId);
  assert(resClean.isLegacyAlias === true, `[Cold-start] ${legacyId} is recognized as legacy alias`);
  assert(resClean.canonicalView === expected.expectedView, `[Cold-start] ${legacyId} maps to ${expected.expectedView}`);
  assert(resClean.defaultTab === expected.expectedTab, `[Cold-start] ${legacyId} sets default tab to ${expected.expectedTab}`);

  // 2. Cold start with explicit override tab
  const resOverride = resolveCanonicalRoute(legacyId, 'custom-tab-param');
  assert(resOverride.canonicalView === expected.expectedView, `[Cold-start override] ${legacyId} keeps canonical view ${expected.expectedView}`);
  assert(resOverride.defaultTab === 'custom-tab-param', `[Cold-start override] ${legacyId} respects explicit tab override`);

  // 3. Cold start with whitespace padding in view name
  const resPadded = resolveCanonicalRoute(`  ${legacyId}  `);
  assert(resPadded.canonicalView === expected.expectedView, `[Cold-start padded] '${legacyId}' trimmed safely to ${expected.expectedView}`);
  assert(resPadded.defaultTab === expected.expectedTab, `[Cold-start padded] '${legacyId}' tab safely resolved`);
}

// 4. Malformed and Boundary Cold-Start Queries
console.log('\n━━━ [Suite 1.2] Malformed & Boundary Cold-Start Queries ━━━');
const malformedQueries = [
  { raw: '', expected: 'view-home' },
  { raw: '   ', expected: 'view-home' },
  { raw: null, expected: 'view-home' },
  { raw: undefined, expected: 'view-home' },
  { raw: 'null', expected: 'view-home' },
  { raw: 'undefined', expected: 'view-home' }
];

for (const testCase of malformedQueries) {
  const res = resolveCanonicalRoute(testCase.raw);
  assert(res.canonicalView === testCase.expected, `[Malformed query] raw='${testCase.raw}' safely fallbacks to ${testCase.expected}`);
  assert(res.isLegacyAlias === false, `[Malformed query] raw='${testCase.raw}' isLegacyAlias is false`);
}

// Canonical view cold-start with no alias mapping
const resCanonical = resolveCanonicalRoute('view-dokumen');
assert(resCanonical.canonicalView === 'view-dokumen', `[Canonical pass-through] 'view-dokumen' remains unchanged`);
assert(resCanonical.isLegacyAlias === false, `[Canonical pass-through] isLegacyAlias is false`);
assert(resCanonical.defaultTab === undefined, `[Canonical pass-through] defaultTab is undefined`);

const resCanonicalWithTab = resolveCanonicalRoute('view-admin-data', 'kalender');
assert(resCanonicalWithTab.canonicalView === 'view-admin-data', `[Canonical with tab] view is view-admin-data`);
assert(resCanonicalWithTab.defaultTab === 'kalender', `[Canonical with tab] defaultTab is preserved as 'kalender'`);

// ==============================================================================
// SUITE 2: RBAC DEFENSE-IN-DEPTH MATRIX (DIRECT DEEP LINKS & SUB-TABS)
// ==============================================================================
console.log('\n━━━ [Suite 2] RBAC Defense-in-Depth Matrix Stress ━━━');

// 1. Regular Teacher (No homeroom, not on duty, not kepsek, not admin)
const regularTeacher = { role: 'guru', isWaliKelas: false };

// 1a. Attempting Asesmen Rapor
const rbacGuruRapor = evaluateTabRBAC('view-gradebook', 'rapor', regularTeacher);
assert(rbacGuruRapor.allowed === false, `[RBAC Guru] Regular teacher denied access to view-gradebook -> tab 'rapor'`);
assert(rbacGuruRapor.fallbackTab === 'gradebook', `[RBAC Guru] Regular teacher fallback tab is 'gradebook'`);

// 1b. Attempting Supervisi Kelas
const rbacGuruSupervisi = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', regularTeacher);
assert(rbacGuruSupervisi.allowed === false, `[RBAC Guru] Regular teacher denied access to view-guru-jurnal -> tab 'supervisi-kelas'`);
assert(rbacGuruSupervisi.fallbackTab === 'input', `[RBAC Guru] Regular teacher fallback tab is 'input'`);

// 1c. Attempting Sistem Blok in Master Data
const rbacGuruBlok = evaluateTabRBAC('view-admin-data', 'blok', regularTeacher);
assert(rbacGuruBlok.allowed === false, `[RBAC Guru] Regular teacher denied access to view-admin-data -> tab 'blok'`);
assert(rbacGuruBlok.fallbackTab === 'Data_Siswa', `[RBAC Guru] Regular teacher fallback tab is 'Data_Siswa'`);

// 1d. Attempting Backup in Config
const rbacGuruBackup = evaluateTabRBAC('view-admin-config', 'backup', regularTeacher);
assert(rbacGuruBackup.allowed === false, `[RBAC Guru] Regular teacher denied access to view-admin-config -> tab 'backup'`);
assert(rbacGuruBackup.fallbackTab === 'profil', `[RBAC Guru] Regular teacher fallback tab is 'profil'`);

// 1e. Allowed Tabs for Regular Teacher
const rbacGuruInput = evaluateTabRBAC('view-guru-jurnal', 'input', regularTeacher);
assert(rbacGuruInput.allowed === true, `[RBAC Guru] Regular teacher allowed in view-guru-jurnal -> tab 'input'`);

const rbacGuruGradebook = evaluateTabRBAC('view-gradebook', 'gradebook', regularTeacher);
assert(rbacGuruGradebook.allowed === true, `[RBAC Guru] Regular teacher allowed in view-gradebook -> tab 'gradebook'`);

// 2. Homeroom Teacher (Wali Kelas)
const waliKelas = { role: 'guru', isWaliKelas: true };
const rbacWaliRapor = evaluateTabRBAC('view-gradebook', 'rapor', waliKelas);
assert(rbacWaliRapor.allowed === true, `[RBAC Wali] Wali Kelas granted access to view-gradebook -> tab 'rapor'`);

const rbacWaliSupervisi = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', waliKelas);
assert(rbacWaliSupervisi.allowed === true, `[RBAC Wali] Wali Kelas granted access to view-guru-jurnal -> tab 'supervisi-kelas'`);

// Wali Kelas still cannot access admin blok or backup
const rbacWaliBlok = evaluateTabRBAC('view-admin-data', 'blok', waliKelas);
assert(rbacWaliBlok.allowed === false, `[RBAC Wali] Wali Kelas denied access to view-admin-data -> tab 'blok'`);

const rbacWaliBackup = evaluateTabRBAC('view-admin-config', 'backup', waliKelas);
assert(rbacWaliBackup.allowed === false, `[RBAC Wali] Wali Kelas denied access to view-admin-config -> tab 'backup'`);

// 3. Administrator & Superadmin
const adminUser = { role: 'admin' };
const superadminUser = { role: 'superadmin' };

for (const user of [adminUser, superadminUser]) {
  assert(evaluateTabRBAC('view-gradebook', 'rapor', user).allowed === true, `[RBAC Admin] ${user.role} allowed in rapor`);
  assert(evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', user).allowed === true, `[RBAC Admin] ${user.role} allowed in supervisi-kelas`);
  assert(evaluateTabRBAC('view-admin-data', 'blok', user).allowed === true, `[RBAC Admin] ${user.role} allowed in blok`);
  assert(evaluateTabRBAC('view-admin-config', 'backup', user).allowed === true, `[RBAC Admin] ${user.role} allowed in backup`);
}

// ==============================================================================
// SUITE 3: RAPID VIEW TRANSITIONS & POPSTATE HISTORY SIMULATOR
// ==============================================================================
console.log('\n━━━ [Suite 3] Rapid View Transitions & Popstate History Simulator ━━━');

/**
 * Emulate the browser navigation state machine from AppScreen.tsx:
 * - useState initial load from URL search
 * - window.history.replaceState for legacy alias URLs
 * - handleNavigation pushState
 * - window.onpopstate event handler
 */
class BrowserNavigationHarness {
  public historyStack: Array<{ view: string; tab?: string }> = [];
  public currentIndex = -1;
  public currentUrl = '';
  public currentView = '';
  public urlTab: string | null = null;
  public role: string;

  constructor(initialUrl: string, role = 'guru') {
    this.role = role;
    this.coldStart(initialUrl);
  }

  public coldStart(url: string) {
    this.currentUrl = url;
    const urlObj = new URL(`https://sipjam.app${url}`);
    const rawView = urlObj.searchParams.get('view');
    const rawTab = urlObj.searchParams.get('tab');

    if (rawView) {
      const resolution = resolveCanonicalRoute(rawView, rawTab);
      if (resolution.isLegacyAlias) {
        const newParams = new URLSearchParams();
        newParams.set('view', resolution.canonicalView);
        if (resolution.defaultTab) {
          newParams.set('tab', resolution.defaultTab);
        }
        this.currentUrl = `?${newParams.toString()}`;
      }
      this.currentView = resolution.canonicalView;
      this.urlTab = resolution.defaultTab || rawTab;
    } else {
      this.currentView = 'view-home';
      this.urlTab = null;
    }

    this.historyStack = [{ view: this.currentView, tab: this.urlTab || undefined }];
    this.currentIndex = 0;
  }

  public navigate(targetId: string, targetTab?: string) {
    const resolution = resolveCanonicalRoute(targetId, targetTab);
    const nextView = resolution.canonicalView;
    const nextTab = resolution.defaultTab;
    const nextUrl = nextTab ? `?view=${nextView}&tab=${nextTab}` : `?view=${nextView}`;

    // Truncate forward history if any, then push
    this.historyStack = this.historyStack.slice(0, this.currentIndex + 1);
    this.historyStack.push({ view: nextView, tab: nextTab });
    this.currentIndex++;
    this.currentUrl = nextUrl;
    this.currentView = nextView;
    this.urlTab = nextTab || null;
  }

  public popState(targetHistoryItem: { view: string; tab?: string }) {
    const searchParams = new URLSearchParams();
    searchParams.set('view', targetHistoryItem.view);
    if (targetHistoryItem.tab) {
      searchParams.set('tab', targetHistoryItem.tab);
    }
    const rawView = searchParams.get('view');
    const rawTab = searchParams.get('tab');

    if (rawView) {
      const resolution = resolveCanonicalRoute(rawView, rawTab);
      this.currentView = resolution.canonicalView;
      this.urlTab = resolution.defaultTab || null;
      if (resolution.isLegacyAlias) {
        const newParams = new URLSearchParams();
        newParams.set('view', resolution.canonicalView);
        if (resolution.defaultTab) {
          newParams.set('tab', resolution.defaultTab);
        }
        this.currentUrl = `?${newParams.toString()}`;
      } else {
        this.currentUrl = `?${searchParams.toString()}`;
      }
    } else {
      this.currentView = 'view-home';
      this.urlTab = null;
      this.currentUrl = '';
    }
  }

  public back() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.popState(this.historyStack[this.currentIndex]);
    }
  }

  public forward() {
    if (this.currentIndex < this.historyStack.length - 1) {
      this.currentIndex++;
      this.popState(this.historyStack[this.currentIndex]);
    }
  }
}

// Scenario 1: Cold start with legacy URL ?view=view-rapor
const harness1 = new BrowserNavigationHarness('?view=view-rapor');
assert(harness1.currentView === 'view-gradebook', `[Harness 1 Cold-Start] view resolved to 'view-gradebook'`);
assert(harness1.urlTab === 'rapor', `[Harness 1 Cold-Start] tab resolved to 'rapor'`);
assert(harness1.currentUrl === '?view=view-gradebook&tab=rapor', `[Harness 1 Cold-Start] replaceState transformed URL to canonical query`);

// Scenario 2: Rapid navigation sequence
harness1.navigate('view-guru-jurnal', 'input');
assert(harness1.currentView === 'view-guru-jurnal' && harness1.urlTab === 'input', `[Harness 1 Step 2] Navigated to view-guru-jurnal/input`);

harness1.navigate('view-guru-rekap-jurnal'); // Legacy navigation call
assert(harness1.currentView === 'view-guru-jurnal' && harness1.urlTab === 'rekap-pribadi', `[Harness 1 Step 3] Legacy view-guru-rekap-jurnal resolved to view-guru-jurnal/rekap-pribadi`);
assert(harness1.currentUrl === '?view=view-guru-jurnal&tab=rekap-pribadi', `[Harness 1 Step 3] PushState URL reflects canonical query`);

harness1.navigate('view-admin-data', 'kalender');
assert(harness1.currentView === 'view-admin-data' && harness1.urlTab === 'kalender', `[Harness 1 Step 4] Navigated to view-admin-data/kalender`);

harness1.navigate('view-sistem-blok'); // Legacy navigation call
assert(harness1.currentView === 'view-admin-data' && harness1.urlTab === 'blok', `[Harness 1 Step 5] Legacy view-sistem-blok resolved to view-admin-data/blok`);

// Scenario 3: Rapid Back buttons
harness1.back(); // Should return to step 4: view-admin-data / kalender
assert(harness1.currentView === 'view-admin-data' && harness1.urlTab === 'kalender', `[Harness 1 Back 1] Returned to view-admin-data/kalender`);

harness1.back(); // Should return to step 3: view-guru-jurnal / rekap-pribadi
assert(harness1.currentView === 'view-guru-jurnal' && harness1.urlTab === 'rekap-pribadi', `[Harness 1 Back 2] Returned to view-guru-jurnal/rekap-pribadi`);

harness1.back(); // Should return to step 2: view-guru-jurnal / input
assert(harness1.currentView === 'view-guru-jurnal' && harness1.urlTab === 'input', `[Harness 1 Back 3] Returned to view-guru-jurnal/input`);

harness1.back(); // Should return to step 1: view-gradebook / rapor
assert(harness1.currentView === 'view-gradebook' && harness1.urlTab === 'rapor', `[Harness 1 Back 4] Returned to initial cold-start view-gradebook/rapor`);

// Scenario 4: Rapid Forward buttons
harness1.forward();
assert(harness1.currentView === 'view-guru-jurnal' && harness1.urlTab === 'input', `[Harness 1 Forward 1] Forward to view-guru-jurnal/input`);

harness1.forward();
assert(harness1.currentView === 'view-guru-jurnal' && harness1.urlTab === 'rekap-pribadi', `[Harness 1 Forward 2] Forward to view-guru-jurnal/rekap-pribadi`);

harness1.forward();
assert(harness1.currentView === 'view-admin-data' && harness1.urlTab === 'kalender', `[Harness 1 Forward 3] Forward to view-admin-data/kalender`);

harness1.forward();
assert(harness1.currentView === 'view-admin-data' && harness1.urlTab === 'blok', `[Harness 1 Forward 4] Forward to view-admin-data/blok`);

// ==============================================================================
// SUITE 4: ONBOARDING SELECTOR & COMPOUND TOUR ATTRIBUTE STRESS
// ==============================================================================
console.log('\n━━━ [Suite 4] Compound Tour Token Attribute & Selector Stress ━━━');

const appScreenSource = fs.readFileSync(path.join(__dirname, '../src/components/AppScreen.tsx'), 'utf-8');
const claySidebarSource = fs.readFileSync(path.join(__dirname, '../src/components/ClaySidebar.tsx'), 'utf-8');
const onboardingTutorialSource = fs.readFileSync(path.join(__dirname, '../src/components/Onboarding/OnboardingTutorial.tsx'), 'utf-8');

// Check OnboardingTutorial selector pattern
assert(
  onboardingTutorialSource.includes('[data-tour~="') || onboardingTutorialSource.includes('[data-tour~=\''),
  `[Onboarding] OnboardingTutorial uses CSS word-matching selector '[data-tour~="..."]'`
);

// Check compound data-tour attribute rendering in menus
const adminMenuItems = getConsolidatedMenuItems({ role: 'admin' });
const guruMenuItems = getConsolidatedMenuItems({ role: 'guru' });

// Verify Admin items have multi-token tour targets
const adminData = adminMenuItems.find(i => i.id === 'view-admin-data');
assert(!!adminData && (adminData.dataTour?.includes('view-sistem-blok') ?? false), `[Tour Tokens] Admin view-admin-data includes 'view-sistem-blok' in dataTour`);

const adminConfig = adminMenuItems.find(i => i.id === 'view-admin-config');
assert(!!adminConfig && (adminConfig.dataTour?.includes('view-admin-backup') ?? false), `[Tour Tokens] Admin view-admin-config includes 'view-admin-backup' in dataTour`);

const adminRekap = adminMenuItems.find(i => i.id === 'view-admin-rekap');
assert(!!adminRekap && (adminRekap.dataTour?.includes('view-analitik') ?? false), `[Tour Tokens] Admin view-admin-rekap includes 'view-analitik' in dataTour`);

// Verify Guru items have multi-token tour targets
const guruJurnal = guruMenuItems.find(i => i.id === 'view-guru-jurnal');
assert(!!guruJurnal && (guruJurnal.dataTour?.includes('view-guru-rekap-jurnal') ?? false), `[Tour Tokens] Guru view-guru-jurnal includes 'view-guru-rekap-jurnal' in dataTour`);
assert(!!guruJurnal && (guruJurnal.dataTour?.includes('view-jurnal-kelas') ?? false), `[Tour Tokens] Guru view-guru-jurnal includes 'view-jurnal-kelas' in dataTour`);

const guruPresensi = guruMenuItems.find(i => i.id === 'view-guru-presensi');
assert(!!guruPresensi && (guruPresensi.dataTour?.includes('view-history') ?? false), `[Tour Tokens] Guru view-guru-presensi includes 'view-history' in dataTour`);

const guruGradebook = guruMenuItems.find(i => i.id === 'view-gradebook');
assert(!!guruGradebook && (guruGradebook.dataTour?.includes('view-rapor') ?? false), `[Tour Tokens] Guru view-gradebook includes 'view-rapor' in dataTour`);

// Check AST preservation invariants for static analyzers
assert(appScreenSource.includes('{/* AST preservation: data-tour={item.id} */}'), `[AST Preservation] AppScreen contains '{/* AST preservation: data-tour={item.id} */}'`);
assert(claySidebarSource.includes('{/* AST preservation: data-tour={item.id} */}'), `[AST Preservation] ClaySidebar contains '{/* AST preservation: data-tour={item.id} */}'`);

// ==============================================================================
// SUITE 5: DINAS PENDIDIKAN & SUPERADMIN SECURITY CONFINEMENT STRESS
// ==============================================================================
console.log('\n━━━ [Suite 5] Dinas Pendidikan & Superadmin Confinement Stress ━━━');

// Dinas Pendidikan without satellite
const dinasOverviewMenus = getConsolidatedMenuItems({ role: 'dinaspendidikan' });
assert(dinasOverviewMenus.length === 1, `[Dinas Overview] Exactly 1 menu in regional overview mode`);
assert(dinasOverviewMenus[0].id === 'view-dinas-overview', `[Dinas Overview] Menu is 'view-dinas-overview'`);

// Dinas Pendidikan with active satellite school
const dinasSatelliteMenus = getConsolidatedMenuItems({ role: 'dinaspendidikan', activeTargetSchool: { id: 'sch-1', nama: 'SMP 1' } });
assert(dinasSatelliteMenus.length === 2, `[Dinas Satellite] Exactly 2 menus when target satellite is active`);
assert(dinasSatelliteMenus.some(m => m.id === 'view-dinas-overview'), `[Dinas Satellite] Has view-dinas-overview`);
assert(dinasSatelliteMenus.some(m => m.id === 'view-admin-rekap'), `[Dinas Satellite] Has view-admin-rekap`);
assert(!dinasSatelliteMenus.some(m => m.id === 'view-admin-data'), `[Dinas Satellite] Master data is strictly barred`);
assert(!dinasSatelliteMenus.some(m => m.id === 'view-admin-config'), `[Dinas Satellite] Config is strictly barred`);

// Superadmin without satellite
const superadminGlobalMenus = getConsolidatedMenuItems({ role: 'superadmin' });
assert(superadminGlobalMenus.length === 3, `[Superadmin Global] Exactly 3 platform management menus`);
assert(superadminGlobalMenus.some(m => m.id === 'view-superadmin-overview'), `[Superadmin Global] Has overview`);
assert(superadminGlobalMenus.some(m => m.id === 'view-superadmin-jaringan'), `[Superadmin Global] Has jaringan`);
assert(superadminGlobalMenus.some(m => m.id === 'view-superadmin-dinas'), `[Superadmin Global] Has dinas`);

// Superadmin with active satellite school
const superadminSatelliteMenus = getConsolidatedMenuItems({ role: 'superadmin', activeTargetSchool: { id: 'sch-1', nama: 'SMP 1' } });
assert(superadminSatelliteMenus.length === 5, `[Superadmin Satellite] Exactly 5 school administration menus`);
assert(superadminSatelliteMenus.some(m => m.id === 'view-admin-data'), `[Superadmin Satellite] Has master data`);
assert(superadminSatelliteMenus.some(m => m.id === 'view-admin-verif'), `[Superadmin Satellite] Has verifikasi`);
assert(superadminSatelliteMenus.some(m => m.id === 'view-admin-rekap'), `[Superadmin Satellite] Has rekap`);
assert(superadminSatelliteMenus.some(m => m.id === 'view-rekap-siswa'), `[Superadmin Satellite] Has rekap siswa`);
assert(superadminSatelliteMenus.some(m => m.id === 'view-admin-config'), `[Superadmin Satellite] Has config`);

// ==============================================================================
// VERDICT & SUMMARY
// ==============================================================================
console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  EMPIRICAL CHALLENGER EXECUTION SUMMARY                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log(`  Total Assertions Executed : ${passed + failed}`);
console.log(`  Passed                    : ${passed}`);
console.log(`  Failed                    : ${failed}`);
console.log(`  Pass Rate                 : ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n✅ EMPIRICAL VERDICT: APPROVE - All adversarial stress tests passed flawlessly!\n');
  process.exit(0);
} else {
  console.error(`\n❌ EMPIRICAL VERDICT: REQUEST_CHANGES - ${failed} assertion(s) failed!\n`);
  process.exit(1);
}
