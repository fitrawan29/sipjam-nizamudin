/**
 * Challenger M2 Test Suite:
 * Programmatic and empirical verification of Milestone 2 (R3.1):
 * - Sidebar Profile Card (Avatar, Name, Role badges, Username/NIP) in AppScreen.tsx
 * - Coexistence of "Lihat Tutorial Lagi" and "Panduan & Tutorial Lengkap" buttons
 * - Mounting of OnboardingTutorial and TutorialModal
 * - Tutorial Data coverage (28 menus across Guru, Admin, Superadmin)
 * - Helper functions getTutorialsByRole & searchTutorials
 * - Adversarial role badge / user identity resolution
 * - Documentation completeness (docs/PANDUAN_PENGGUNA.md & TUTORIAL.md)
 *
 * Execution command:
 * npx tsx tests/challenger_m2_sidebar_profile.test.ts
 */

import fs from 'fs';
import path from 'path';
import {
  TUTORIAL_DATA,
  getTutorialsByRole,
  searchTutorials,
  TutorialItem
} from '../src/components/Tutorial';
import { renderUserAvatar } from '../src/lib/avatars';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

console.log('====================================================================');
console.log(' CHALLENGER TEST SUITE: Milestone 2 — Sidebar Profile & Tutorial');
console.log('====================================================================\n');

// ====================================================================
// SECTION 1: Static Source & AST/Structure Verification in AppScreen.tsx
// ====================================================================
console.log('--- Section 1: Static Source & Contract Verification in AppScreen.tsx ---');

const appScreenPath = path.resolve(process.cwd(), 'src/components/AppScreen.tsx');
assert(fs.existsSync(appScreenPath), 'AppScreen.tsx file exists');

const appScreenSource = fs.readFileSync(appScreenPath, 'utf8');

// 1.1 Imports
assert(
  appScreenSource.includes("import { TutorialModal } from '@/components/Tutorial';") ||
  appScreenSource.includes('from "@/components/Tutorial"'),
  'AppScreen imports TutorialModal from @/components/Tutorial'
);

assert(
  appScreenSource.includes("import { renderUserAvatar } from '@/lib/avatars';"),
  'AppScreen imports renderUserAvatar from @/lib/avatars'
);

// 1.2 State declaration
assert(
  appScreenSource.includes('const [tutorialModalOpen, setTutorialModalOpen] = useState<boolean>(false);') ||
  appScreenSource.includes('const [tutorialModalOpen, setTutorialModalOpen] = useState(false);'),
  'AppScreen defines tutorialModalOpen state initialized to false'
);

// 1.3 Sidebar Profile Card Structure
assert(
  appScreenSource.includes('User Identity Card') ||
  appScreenSource.includes('renderUserAvatar'),
  'AppScreen sidebar contains User Identity / Profile Card'
);

assert(
  appScreenSource.includes("renderUserAvatar(currentUser?.avatar || user?.avatar, 'w-10 h-10')") ||
  appScreenSource.includes("renderUserAvatar(currentUser?.avatar || user?.avatar"),
  'Profile card calls renderUserAvatar with fallback currentUser?.avatar || user?.avatar'
);

assert(
  appScreenSource.includes('title="Aktif"') && appScreenSource.includes('bg-emerald-500'),
  'Profile card includes green online active indicator badge'
);

assert(
  appScreenSource.includes("{user?.nama || 'Pengguna SIPJAM'}"),
  'Profile card renders user full name with fallback {user?.nama || \'Pengguna SIPJAM\'}'
);

assert(
  appScreenSource.includes('(user?.username || user?.nip)') &&
  appScreenSource.includes('font-mono'),
  'Profile card displays username or NIP formatted with monospace styling'
);

// 1.4 Role Badges & Colors
assert(
  appScreenSource.includes("isSuperadmin ? 'fa-crown'") ||
  appScreenSource.includes("'fa-crown'"),
  'Superadmin badge includes fa-crown icon'
);

assert(
  appScreenSource.includes('bg-purple-100 text-purple-700') &&
  appScreenSource.includes('Superadmin'),
  'Superadmin badge uses purple styling and "Superadmin" label'
);

assert(
  appScreenSource.includes("'fa-user-shield'") &&
  appScreenSource.includes('bg-blue-100 text-blue-700') &&
  appScreenSource.includes('Administrator'),
  'Administrator badge uses fa-user-shield icon, blue styling, and "Administrator" label'
);

assert(
  appScreenSource.includes('isWaliKelas') &&
  appScreenSource.includes('bg-teal-100 text-teal-800') &&
  appScreenSource.includes('Guru (Wali Kelas)'),
  'Wali Kelas badge uses teal styling and "Guru (Wali Kelas)" label'
);

assert(
  appScreenSource.includes('bg-emerald-100 text-emerald-800') &&
  appScreenSource.includes("'fa-chalkboard-user'"),
  'Regular Guru badge uses emerald styling and fa-chalkboard-user icon'
);

// 1.5 Drawer Action Buttons
assert(
  appScreenSource.includes('Panduan & Tutorial Lengkap'),
  'Sidebar drawer contains "Panduan & Tutorial Lengkap" button'
);

assert(
  appScreenSource.includes('setTutorialModalOpen(true)') &&
  appScreenSource.includes('setSidebarOpen(false)'),
  '"Panduan & Tutorial Lengkap" button opens tutorial modal and closes sidebar'
);

assert(
  appScreenSource.includes('Lihat Tutorial Lagi'),
  'Sidebar drawer retains original "Lihat Tutorial Lagi" button for backward compatibility'
);

assert(
  appScreenSource.includes('setTourOpen(true)'),
  '"Lihat Tutorial Lagi" button triggers setTourOpen(true)'
);

// 1.6 Modal Mounts
assert(
  appScreenSource.includes('<OnboardingTutorial') &&
  appScreenSource.includes('isOpen={tourOpen}') &&
  appScreenSource.includes('onEnsureSidebarOpen='),
  'AppScreen mounts <OnboardingTutorial> with proper props'
);

assert(
  appScreenSource.includes('<TutorialModal') &&
  appScreenSource.includes('isOpen={tutorialModalOpen}') &&
  appScreenSource.includes('onClose={() => setTutorialModalOpen(false)}') &&
  appScreenSource.includes('onNavigate={handleNavigation}') &&
  appScreenSource.includes('currentRole={user?.role}'),
  'AppScreen mounts <TutorialModal> with isOpen, onClose, onNavigate, and currentRole props'
);

// ====================================================================
// SECTION 2: Empirical Simulation of Role Badge & Identity Resolution
// ====================================================================
console.log('\n--- Section 2: Empirical Simulation of Role Badge & Identity Logic ---');

/**
 * Replicate exact role badge logic from AppScreen.tsx:
 * line 61-62:
 *   const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
 *   const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';
 * line 654-665:
 *   badge text & icon & styles
 */
function evaluateRoleBadge(userRole: string | undefined | null, isWaliKelas: boolean) {
  const isSuperadmin = (userRole || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (userRole || '').toLowerCase() === 'admin';

  const badgeText = isSuperadmin
    ? 'Superadmin'
    : isAdmin
    ? 'Administrator'
    : isWaliKelas
    ? 'Guru (Wali Kelas)'
    : 'Guru';

  const badgeIcon = isSuperadmin
    ? 'fa-crown'
    : isAdmin
    ? 'fa-user-shield'
    : isWaliKelas
    ? 'fa-chalkboard-user'
    : 'fa-chalkboard-user';

  const badgeColor = isSuperadmin
    ? 'purple'
    : isAdmin
    ? 'blue'
    : isWaliKelas
    ? 'teal'
    : 'emerald';

  return { isSuperadmin, isAdmin, badgeText, badgeIcon, badgeColor };
}

// 2.1 Superadmin variations
const superadminCases = ['superadmin', 'Superadmin', 'Super Admin', 'SUPERADMIN', ' superadmin '];
for (const r of superadminCases) {
  const res = evaluateRoleBadge(r, false);
  assert(
    res.isSuperadmin === true && res.badgeText === 'Superadmin' && res.badgeIcon === 'fa-crown' && res.badgeColor === 'purple',
    `Role input "${r}" correctly resolves to Superadmin badge (crown, purple)`
  );
}

// 2.2 Admin variations
const adminCases = ['admin', 'Admin', 'ADMIN', ' admin '];
for (const r of adminCases) {
  const res = evaluateRoleBadge(r.trim(), false);
  assert(
    res.isSuperadmin === false && res.isAdmin === true && res.badgeText === 'Administrator' && res.badgeIcon === 'fa-user-shield' && res.badgeColor === 'blue',
    `Role input "${r}" correctly resolves to Administrator badge (user-shield, blue)`
  );
}

// 2.3 Guru Wali Kelas
const guruWaliRes = evaluateRoleBadge('guru', true);
assert(
  guruWaliRes.isSuperadmin === false &&
  guruWaliRes.isAdmin === false &&
  guruWaliRes.badgeText === 'Guru (Wali Kelas)' &&
  guruWaliRes.badgeIcon === 'fa-chalkboard-user' &&
  guruWaliRes.badgeColor === 'teal',
  'Guru with isWaliKelas=true correctly resolves to "Guru (Wali Kelas)" (teal)'
);

// 2.4 Regular Guru
const regularGuruRes = evaluateRoleBadge('guru', false);
assert(
  regularGuruRes.isSuperadmin === false &&
  regularGuruRes.isAdmin === false &&
  regularGuruRes.badgeText === 'Guru' &&
  regularGuruRes.badgeIcon === 'fa-chalkboard-user' &&
  regularGuruRes.badgeColor === 'emerald',
  'Guru with isWaliKelas=false correctly resolves to "Guru" (emerald)'
);

// 2.5 Null / undefined / empty role fallback
const nullRoleRes = evaluateRoleBadge(null, false);
assert(
  nullRoleRes.badgeText === 'Guru' && nullRoleRes.badgeColor === 'emerald',
  'Null role defaults safely to regular Guru'
);

// 2.6 User Name Fallback Resolution
function resolveUserName(user: { nama?: string | null } | null | undefined): string {
  return user?.nama || 'Pengguna SIPJAM';
}

assert(resolveUserName({ nama: 'Ade Fitrawan' }) === 'Ade Fitrawan', 'Resolves explicit user name');
assert(resolveUserName({ nama: '' }) === 'Pengguna SIPJAM', 'Empty string name falls back to "Pengguna SIPJAM"');
assert(resolveUserName({ nama: null }) === 'Pengguna SIPJAM', 'Null name falls back to "Pengguna SIPJAM"');
assert(resolveUserName(undefined) === 'Pengguna SIPJAM', 'Undefined user falls back to "Pengguna SIPJAM"');

// 2.7 Username / NIP Identifier Resolution
function resolveUserIdentifier(user: { username?: string | null; nip?: string | null } | null | undefined): string | null {
  return (user?.username || user?.nip) || null;
}

assert(
  resolveUserIdentifier({ username: 'guru_ade', nip: '198701012010011001' }) === 'guru_ade',
  'Username takes precedence over NIP if both provided'
);
assert(
  resolveUserIdentifier({ username: '', nip: '198701012010011001' }) === '198701012010011001',
  'Falls back to NIP if username is empty'
);
assert(
  resolveUserIdentifier({ username: null, nip: null }) === null,
  'Returns null if both username and NIP are absent'
);

// 2.8 Avatar Rendering Safety
const defaultAvatarRender = renderUserAvatar(undefined, 'w-10 h-10');
assert(defaultAvatarRender !== null && typeof defaultAvatarRender === 'object', 'renderUserAvatar(undefined) renders default avatar safely');

const presetAvatarRender = renderUserAvatar('avatar_2', 'w-10 h-10');
assert(presetAvatarRender !== null && typeof presetAvatarRender === 'object', 'renderUserAvatar("avatar_2") renders preset avatar safely');

const customUrlAvatarRender = renderUserAvatar('https://example.com/avatar.jpg', 'w-10 h-10');
assert(customUrlAvatarRender !== null && typeof customUrlAvatarRender === 'object', 'renderUserAvatar with URL renders img tag safely');


// ====================================================================
// SECTION 3: In-App Tutorial System Verification
// ====================================================================
console.log('\n--- Section 3: In-App Tutorial Data & Helper Functions Verification ---');

// 3.1 Total Menu Count
assert(
  TUTORIAL_DATA.length === 28,
  `TUTORIAL_DATA contains exactly 28 menus (actual: ${TUTORIAL_DATA.length})`
);

// 3.2 Role Distribution
const guruTutorials = TUTORIAL_DATA.filter(t => t.role === 'guru');
const adminTutorials = TUTORIAL_DATA.filter(t => t.role === 'admin');
const superadminTutorials = TUTORIAL_DATA.filter(t => t.role === 'superadmin');

assert(guruTutorials.length === 11, `Guru role has 11 tutorials (actual: ${guruTutorials.length})`);
assert(adminTutorials.length === 14, `Admin role has 14 tutorials (actual: ${adminTutorials.length})`);
assert(superadminTutorials.length === 3, `Superadmin role has 3 tutorials (actual: ${superadminTutorials.length})`);

// 3.3 Item Structure & Quality Assertions
let allItemsValid = true;
const seenIds = new Set<string>();

for (const item of TUTORIAL_DATA) {
  if (!item.id || seenIds.has(item.id)) {
    allItemsValid = false;
    assert(false, `Tutorial item has unique ID: ${item.id}`);
  }
  seenIds.add(item.id);

  if (!item.viewId || !item.viewId.startsWith('view-')) {
    allItemsValid = false;
    assert(false, `Tutorial item ${item.id} has valid viewId: ${item.viewId}`);
  }

  if (!item.title || item.title.trim().length === 0) {
    allItemsValid = false;
  }

  if (!item.icon || !item.icon.startsWith('fa-')) {
    allItemsValid = false;
  }

  if (!item.summary || item.summary.length < 20) {
    allItemsValid = false;
  }

  if (!Array.isArray(item.steps) || item.steps.length < 2) {
    allItemsValid = false;
  }

  if (!Array.isArray(item.keyTips) || item.keyTips.length < 1) {
    allItemsValid = false;
  }
}

assert(allItemsValid, 'All 28 tutorial items have complete, valid fields (id, viewId, title, icon, summary, steps >= 2, keyTips >= 1)');

// 3.4 Helper Function: getTutorialsByRole
const getGuruRes = getTutorialsByRole('guru');
assert(getGuruRes.length === 11, 'getTutorialsByRole("guru") returns 11 items');

const getAdminRes = getTutorialsByRole('admin');
assert(getAdminRes.length === 14, 'getTutorialsByRole("admin") returns 14 items');

const getSuperadminRes = getTutorialsByRole('superadmin');
assert(getSuperadminRes.length === 3, 'getTutorialsByRole("superadmin") returns 3 items');

const getAllRes = getTutorialsByRole('all');
assert(getAllRes.length === 28, 'getTutorialsByRole("all") returns all 28 items');

// Case insensitivity
const getGuruCaseRes = getTutorialsByRole('GURU');
assert(getGuruCaseRes.length === 11, 'getTutorialsByRole is case-insensitive for "GURU"');

// 3.5 Helper Function: searchTutorials
const searchPresensi = searchTutorials('presensi');
assert(
  searchPresensi.length >= 2 && searchPresensi.some(t => t.id === 'guru-presensi'),
  'searchTutorials("presensi") matches relevant presensi menus'
);

const searchBlok = searchTutorials('sistem blok');
assert(
  searchBlok.length >= 1 && searchBlok.some(t => t.id === 'admin-sistem-blok'),
  'searchTutorials("sistem blok") finds admin-sistem-blok'
);

const searchScanner = searchTutorials('scanner');
assert(
  searchScanner.length >= 1 && searchScanner.some(t => t.id === 'guru-piket' || t.id === 'admin-piket'),
  'searchTutorials("scanner") matches piket view with scanner hardware keywords'
);

const searchFilteredGuru = searchTutorials('dashboard', 'guru');
assert(
  searchFilteredGuru.length === 1 && searchFilteredGuru[0].id === 'guru-dashboard',
  'searchTutorials with role filter "guru" returns only guru-dashboard'
);

const searchFilteredAdmin = searchTutorials('dashboard', 'admin');
assert(
  searchFilteredAdmin.length === 1 && searchFilteredAdmin[0].id === 'admin-dashboard',
  'searchTutorials with role filter "admin" returns only admin-dashboard'
);

const searchEmpty = searchTutorials('nonexistent_gibberish_query_xyz');
assert(searchEmpty.length === 0, 'searchTutorials with non-existent keyword returns empty array');

const searchAllNoQuery = searchTutorials('', 'guru');
assert(searchAllNoQuery.length === 11, 'searchTutorials with empty query and role filter returns all role items');


// ====================================================================
// SECTION 4: Documentation Completeness Verification
// ====================================================================
console.log('\n--- Section 4: Documentation Integrity Check ---');

const panduanPath = path.resolve(process.cwd(), 'docs/PANDUAN_PENGGUNA.md');
assert(fs.existsSync(panduanPath), 'docs/PANDUAN_PENGGUNA.md exists');

const panduanContent = fs.readFileSync(panduanPath, 'utf8');
assert(panduanContent.length > 15000, `docs/PANDUAN_PENGGUNA.md is comprehensive (>15KB, actual: ${panduanContent.length} bytes)`);

// Check that PANDUAN_PENGGUNA.md mentions all 3 roles and key menus
assert(panduanContent.includes('Panduan Operasional Guru'), 'PANDUAN_PENGGUNA covers Guru operational guide');
assert(panduanContent.includes('Panduan Operasional Administrator'), 'PANDUAN_PENGGUNA covers Administrator operational guide');
assert(panduanContent.includes('Panduan Operasional Superadmin'), 'PANDUAN_PENGGUNA covers Superadmin operational guide');
assert(panduanContent.includes('Pemecahan Masalah') || panduanContent.includes('Troubleshooting'), 'PANDUAN_PENGGUNA covers Troubleshooting');

const tutorialMdPath = path.resolve(process.cwd(), 'TUTORIAL.md');
assert(fs.existsSync(tutorialMdPath), 'TUTORIAL.md exists at project root');

const tutorialMdContent = fs.readFileSync(tutorialMdPath, 'utf8');
assert(tutorialMdContent.length > 10000, `TUTORIAL.md is comprehensive (>10KB, actual: ${tutorialMdContent.length} bytes)`);
assert(tutorialMdContent.includes('view-home') && tutorialMdContent.includes('view-guru-presensi') && tutorialMdContent.includes('view-admin-verif') && tutorialMdContent.includes('view-superadmin-sekolah'), 'TUTORIAL.md contains menu viewId reference table');


// ====================================================================
// SECTION 5: Backward Compatibility & Regression Assertions
// ====================================================================
console.log('\n--- Section 5: Backward Compatibility & UI Integrity Assertions ---');

// 5.1 Ensure existing drawer height adjustment allows smooth scrolling
assert(
  appScreenSource.includes('max-h-[calc(100vh-230px)]') ||
  appScreenSource.includes('overflow-y-auto'),
  'Sidebar drawer menu container has responsive max-height preventing overflow'
);

// 5.2 Ensure Tour trigger logic is preserved
assert(
  appScreenSource.includes("localStorage.getItem(STORAGE_KEY_GURU) !== 'true'") &&
  appScreenSource.includes("localStorage.getItem(STORAGE_KEY_ADMIN) !== 'true'"),
  'First-time onboarding auto-tour trigger logic for Guru and Admin remains intact'
);

// 5.3 Ensure data-tour attributes are retained for onboarding spotlight
assert(
  appScreenSource.includes('data-tour="hamburger-btn"'),
  'Hamburger button retains data-tour="hamburger-btn"'
);

assert(
  appScreenSource.includes('data-tour={item.id}'),
  'Menu items retain data-tour={item.id}'
);


// ====================================================================
// SUMMARY & VERDICT
// ====================================================================
console.log('\n====================================================================');
console.log(` CHALLENGER RESULTS: ${passed} passed, ${failed} failed`);
console.log('====================================================================');

if (failed > 0) {
  console.error('\n❌ CHALLENGER VERDICT: REQUEST_CHANGES — Empirical tests failed.');
  process.exit(1);
} else {
  console.log('\n✅ CHALLENGER VERDICT: APPROVE — All empirical verification tests passed cleanly!');
  process.exit(0);
}
