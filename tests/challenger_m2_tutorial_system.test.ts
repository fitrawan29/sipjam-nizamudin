/**
 * EMPIRICAL CHALLENGER TEST SUITE: Tutorial System Verification (R3.2)
 *
 * Programmatically and empirically verifies:
 * 1. Tutorial Data Integrity: Exactly 28 menus (11 Guru, 14 Admin, 3 Superadmin).
 * 2. Helper Functions: getTutorialsByRole and searchTutorials with various queries & edge cases.
 * 3. Component Structure: TutorialModal.tsx props, tabs, search, accordion, and navigation.
 * 4. Application Integration: AppScreen.tsx modal mounting, sidebar button, and user profile card.
 * 5. Comprehensive Documentation: docs/PANDUAN_PENGGUNA.md and TUTORIAL.md.
 *
 * Execution:
 * npx tsx tests/challenger_m2_tutorial_system.test.ts
 */

import fs from 'fs';
import path from 'path';
import {
  TUTORIAL_DATA,
  getTutorialsByRole,
  searchTutorials,
  TutorialItem
} from '../src/components/Tutorial/tutorialData';
import {
  TutorialModal,
  TUTORIAL_DATA as BARREL_DATA
} from '../src/components/Tutorial';

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

console.log('================================================================');
console.log(' EMPIRICAL TEST: Tutorial System & Documentation (Milestone 2)  ');
console.log('================================================================\n');

// ====================================================================
// SECTION 1: TUTORIAL DATA STRUCTURE & ROLES COUNT (R3.2)
// ====================================================================
console.log('--- Section 1: Tutorial Data Exact Counts & Role Distribution ---');

assert(Array.isArray(TUTORIAL_DATA), 'TUTORIAL_DATA is an array');
assert(TUTORIAL_DATA.length === 28, `TUTORIAL_DATA contains exactly 28 menus (got ${TUTORIAL_DATA.length})`);

const guruMenus = TUTORIAL_DATA.filter(item => item.role === 'guru');
const adminMenus = TUTORIAL_DATA.filter(item => item.role === 'admin');
const superadminMenus = TUTORIAL_DATA.filter(item => item.role === 'superadmin');

assert(guruMenus.length === 11, `Guru menus count is exactly 11 (got ${guruMenus.length})`);
assert(adminMenus.length === 14, `Admin menus count is exactly 14 (got ${adminMenus.length})`);
assert(superadminMenus.length === 3, `Superadmin menus count is exactly 3 (got ${superadminMenus.length})`);
assert(
  guruMenus.length + adminMenus.length + superadminMenus.length === 28,
  'Sum of guru + admin + superadmin matches total 28 menus exactly'
);

// Verify ID uniqueness
const ids = TUTORIAL_DATA.map(item => item.id);
const uniqueIds = new Set(ids);
assert(uniqueIds.size === 28, `All 28 menu IDs are unique (found ${uniqueIds.size} unique IDs)`);

// Verify essential fields for all 28 items
let allFieldsValid = true;
const invalidItems: string[] = [];

for (const item of TUTORIAL_DATA) {
  const hasValidId = typeof item.id === 'string' && item.id.trim().length > 0;
  const hasValidViewId = typeof item.viewId === 'string' && item.viewId.startsWith('view-');
  const hasValidTitle = typeof item.title === 'string' && item.title.trim().length > 0;
  const hasValidIcon = typeof item.icon === 'string' && item.icon.startsWith('fa-');
  const hasValidSummary = typeof item.summary === 'string' && item.summary.trim().length >= 15;
  const hasValidSteps = Array.isArray(item.steps) && item.steps.length >= 2 && item.steps.every(s => s.trim().length > 0);
  const hasValidTips = Array.isArray(item.keyTips) && item.keyTips.length >= 1 && item.keyTips.every(k => k.trim().length > 0);

  if (!hasValidId || !hasValidViewId || !hasValidTitle || !hasValidIcon || !hasValidSummary || !hasValidSteps || !hasValidTips) {
    allFieldsValid = false;
    invalidItems.push(item.id || 'unidentified');
  }
}

assert(allFieldsValid, 'All 28 tutorial items contain valid id, viewId, title, icon, summary, steps (>=2), and keyTips (>=1)', `Invalid items: ${invalidItems.join(', ')}`);

// Verify expected menu IDs per role
const expectedGuruIds = [
  'guru-dashboard', 'guru-presensi', 'guru-jurnal', 'guru-jurnal-kelas',
  'guru-piket', 'guru-dokumen', 'guru-gradebook', 'guru-informasi',
  'guru-history', 'guru-rekap-jurnal', 'guru-rekap-siswa'
];
const actualGuruIds = guruMenus.map(m => m.id);
const hasAllGuruIds = expectedGuruIds.every(id => actualGuruIds.includes(id));
assert(hasAllGuruIds, 'Contains all 11 required Guru menu IDs');

const expectedAdminIds = [
  'admin-dashboard', 'admin-verif', 'admin-sistem-blok', 'admin-jurnal-kelas',
  'admin-piket', 'admin-dokumen', 'admin-gradebook', 'admin-informasi',
  'admin-analitik', 'admin-rekap', 'admin-rekap-siswa', 'admin-data',
  'admin-backup', 'admin-config'
];
const actualAdminIds = adminMenus.map(m => m.id);
const hasAllAdminIds = expectedAdminIds.every(id => actualAdminIds.includes(id));
assert(hasAllAdminIds, 'Contains all 14 required Admin menu IDs');

const expectedSuperadminIds = ['superadmin-overview', 'superadmin-sekolah', 'superadmin-admins'];
const actualSuperadminIds = superadminMenus.map(m => m.id);
const hasAllSuperadminIds = expectedSuperadminIds.every(id => actualSuperadminIds.includes(id));
assert(hasAllSuperadminIds, 'Contains all 3 required Superadmin menu IDs');

// ====================================================================
// SECTION 2: getTutorialsByRole FUNCTION TESTS
// ====================================================================
console.log('\n--- Section 2: getTutorialsByRole Function & Robustness ---');

assert(getTutorialsByRole().length === 28, 'getTutorialsByRole() with no argument returns 28 items');
assert(getTutorialsByRole('semua').length === 28, 'getTutorialsByRole("semua") returns 28 items');
assert(getTutorialsByRole('all').length === 28, 'getTutorialsByRole("all") returns 28 items');
assert(getTutorialsByRole('guru').length === 11, 'getTutorialsByRole("guru") returns 11 items');
assert(getTutorialsByRole('admin').length === 14, 'getTutorialsByRole("admin") returns 14 items');
assert(getTutorialsByRole('superadmin').length === 3, 'getTutorialsByRole("superadmin") returns 3 items');

// Case insensitivity and whitespace handling
assert(getTutorialsByRole('GURU').length === 11, 'getTutorialsByRole("GURU") case-insensitive returns 11 items');
assert(getTutorialsByRole(' Admin ').length === 14, 'getTutorialsByRole(" Admin ") trimmed returns 14 items');
assert(getTutorialsByRole('SuperAdmin').length === 3, 'getTutorialsByRole("SuperAdmin") returns 3 items');

// Fallback behavior on invalid role
const fallbackResult = getTutorialsByRole('unknown-role');
assert(fallbackResult.length === 11, 'getTutorialsByRole("unknown-role") safely falls back to guru (11 items)');

// ====================================================================
// SECTION 3: searchTutorials FUNCTION TESTS
// ====================================================================
console.log('\n--- Section 3: searchTutorials Query Matching & Stress Cases ---');

// Test required queries from dispatch: 'piket', 'qr', 'jurnal', 'inval', 'blok', 'naik kelas'
const piketResults = searchTutorials('piket');
assert(piketResults.length >= 2, `searchTutorials('piket') finds ${piketResults.length} items (>= 2 expected: guru & admin piket)`);
assert(piketResults.some(i => i.id === 'guru-piket'), "searchTutorials('piket') includes guru-piket");
assert(piketResults.some(i => i.id === 'admin-piket'), "searchTutorials('piket') includes admin-piket");

const qrResults = searchTutorials('qr');
assert(qrResults.length >= 2, `searchTutorials('qr') finds ${qrResults.length} items (>= 2 expected: piket scanner & cetak kartu QR)`);
assert(qrResults.some(i => i.id === 'guru-piket'), "searchTutorials('qr') matches guru-piket");
assert(qrResults.some(i => i.id === 'admin-data'), "searchTutorials('qr') matches admin-data");

const jurnalResults = searchTutorials('jurnal');
assert(jurnalResults.length >= 4, `searchTutorials('jurnal') finds ${jurnalResults.length} items (>= 4 expected)`);
assert(jurnalResults.some(i => i.id === 'guru-jurnal'), "searchTutorials('jurnal') includes guru-jurnal");
assert(jurnalResults.some(i => i.id === 'guru-rekap-jurnal'), "searchTutorials('jurnal') includes guru-rekap-jurnal");
assert(jurnalResults.some(i => i.id === 'admin-jurnal-kelas'), "searchTutorials('jurnal') includes admin-jurnal-kelas");

const invalResults = searchTutorials('inval');
assert(invalResults.length >= 1, `searchTutorials('inval') finds ${invalResults.length} items`);
assert(invalResults.some(i => i.id === 'guru-jurnal'), "searchTutorials('inval') correctly matches guru-jurnal (Guru Inval mode)");

const blokResults = searchTutorials('blok');
assert(blokResults.length >= 2, `searchTutorials('blok') finds ${blokResults.length} items`);
assert(blokResults.some(i => i.id === 'admin-sistem-blok'), "searchTutorials('blok') matches admin-sistem-blok");
assert(blokResults.some(i => i.id === 'guru-jurnal'), "searchTutorials('blok') matches guru-jurnal (Sistem Blok integration)");

const naikKelasResults = searchTutorials('naik kelas');
assert(naikKelasResults.length >= 1, `searchTutorials('naik kelas') finds ${naikKelasResults.length} items`);
assert(naikKelasResults.some(i => i.id === 'admin-data'), "searchTutorials('naik kelas') matches admin-data (Kenaikan Kelas massal)");

// Scoped search with role filter
const piketGuruOnly = searchTutorials('piket', 'guru');
assert(piketGuruOnly.length >= 1 && piketGuruOnly.every(i => i.role === 'guru'), 'searchTutorials("piket", "guru") returns only guru items');

const piketAdminOnly = searchTutorials('piket', 'admin');
assert(piketAdminOnly.length >= 1 && piketAdminOnly.every(i => i.role === 'admin'), 'searchTutorials("piket", "admin") returns only admin items');

const piketSuperadmin = searchTutorials('piket', 'superadmin');
assert(piketSuperadmin.length === 0, 'searchTutorials("piket", "superadmin") correctly returns 0 items');

// Edge cases
const emptyQuery = searchTutorials('');
assert(emptyQuery.length === 28, 'searchTutorials("") with empty query returns all 28 items');

const whitespaceQuery = searchTutorials('    ');
assert(whitespaceQuery.length === 28, 'searchTutorials("    ") with spaces returns all 28 items');

const caseInsensitiveQuery1 = searchTutorials('PIKET');
const caseInsensitiveQuery2 = searchTutorials('piket');
assert(caseInsensitiveQuery1.length === caseInsensitiveQuery2.length, 'searchTutorials is case-insensitive ("PIKET" vs "piket")');

const nonExistentQuery = searchTutorials('xyzzy_nonexistent_term_99999');
assert(Array.isArray(nonExistentQuery) && nonExistentQuery.length === 0, 'searchTutorials with non-existent query returns empty array');

const specialCharsQuery = searchTutorials('[INVAL]');
assert(!Array.isArray(specialCharsQuery) || specialCharsQuery.length >= 0, 'searchTutorials handles special characters like [INVAL] without throwing');

// ====================================================================
// SECTION 4: TutorialModal.tsx COMPONENT STRUCTURE
// ====================================================================
console.log('\n--- Section 4: TutorialModal.tsx Component Analysis ---');

const modalPath = path.resolve(process.cwd(), 'src/components/Tutorial/TutorialModal.tsx');
assert(fs.existsSync(modalPath), 'TutorialModal.tsx exists at src/components/Tutorial/TutorialModal.tsx');

const modalSource = fs.readFileSync(modalPath, 'utf8');

assert(modalSource.includes("'use client'"), "TutorialModal has 'use client' directive");
assert(modalSource.includes('export interface TutorialModalProps'), 'Defines TutorialModalProps interface');
assert(modalSource.includes('isOpen: boolean'), 'TutorialModalProps requires isOpen');
assert(modalSource.includes('onClose: () => void'), 'TutorialModalProps requires onClose callback');
assert(modalSource.includes('onNavigate: (viewId: string) => void'), 'TutorialModalProps requires onNavigate callback');
assert(modalSource.includes('currentRole?: string'), 'TutorialModalProps accepts currentRole prop');

// Verify search input & controls
assert(modalSource.includes('searchQuery') && modalSource.includes('setSearchQuery'), 'Contains state for searchQuery');
assert(modalSource.includes('placeholder="Cari tutorial menu, langkah, fitur'), 'Contains informative search placeholder');
assert(modalSource.includes('fa-magnifying-glass'), 'Contains search magnifying glass icon');

// Verify role tabs
assert(
  modalSource.includes("activeTab === 'semua'") &&
  modalSource.includes("activeTab === 'guru'") &&
  modalSource.includes("activeTab === 'admin'") &&
  modalSource.includes("activeTab === 'superadmin'"),
  'Contains 4 role tabs: Semua, Guru, Admin, Superadmin'
);

// Verify accordion behavior
assert(modalSource.includes('expandedItems') && modalSource.includes('setExpandedItems'), 'Contains accordion expandedItems state');
assert(modalSource.includes('toggleExpand'), 'Contains toggleExpand function for individual items');
assert(modalSource.includes('expandAll') && modalSource.includes('collapseAll'), 'Contains expandAll and collapseAll controls');

// Verify "Buka Menu" navigation
assert(modalSource.includes('handleOpenMenu'), 'Contains handleOpenMenu function');
assert(modalSource.includes('onNavigate(viewId)'), 'Executes onNavigate(viewId) on menu selection');
assert(modalSource.includes('onClose()'), 'Closes modal upon menu navigation');
assert(modalSource.includes('Buka Menu'), 'Renders "Buka Menu" action button');

// Verify UX enhancements: Esc key & body scroll lock
assert(modalSource.includes("e.key === 'Escape'"), 'Listens for Escape key to dismiss modal');
assert(modalSource.includes("document.body.style.overflow = 'hidden'"), 'Locks background scrolling when modal is open');

// Verify barrel export
const barrelPath = path.resolve(process.cwd(), 'src/components/Tutorial/index.ts');
assert(fs.existsSync(barrelPath), 'Barrel index.ts exists at src/components/Tutorial/index.ts');
const barrelSource = fs.readFileSync(barrelPath, 'utf8');
assert(barrelSource.includes('TutorialModal') && barrelSource.includes('TUTORIAL_DATA'), 'Barrel export exposes TutorialModal and TUTORIAL_DATA');

// ====================================================================
// SECTION 5: APPLICATION INTEGRATION (AppScreen.tsx)
// ====================================================================
console.log('\n--- Section 5: Integration in AppScreen.tsx ---');

const appScreenPath = path.resolve(process.cwd(), 'src/components/AppScreen.tsx');
assert(fs.existsSync(appScreenPath), 'AppScreen.tsx exists');

const appScreenSource = fs.readFileSync(appScreenPath, 'utf8');

assert(
  appScreenSource.includes("import { TutorialModal } from '@/components/Tutorial';"),
  'AppScreen.tsx imports TutorialModal from @/components/Tutorial'
);

assert(
  appScreenSource.includes('const [tutorialModalOpen, setTutorialModalOpen] = useState<boolean>(false);') ||
  appScreenSource.includes('const [tutorialModalOpen, setTutorialModalOpen] = useState(false);'),
  'AppScreen.tsx initializes tutorialModalOpen state'
);

assert(
  appScreenSource.includes('Panduan & Tutorial Lengkap') &&
  appScreenSource.includes('setTutorialModalOpen(true);'),
  'AppScreen.tsx sidebar includes "Panduan & Tutorial Lengkap" button triggering tutorial modal'
);

assert(
  appScreenSource.includes('<TutorialModal') &&
  appScreenSource.includes('isOpen={tutorialModalOpen}') &&
  appScreenSource.includes('onClose={() => setTutorialModalOpen(false)}') &&
  appScreenSource.includes('onNavigate={handleNavigation}'),
  'AppScreen.tsx mounts TutorialModal with isOpen, onClose, and onNavigate'
);

// Backward compatibility check: Onboarding tour is preserved
assert(
  appScreenSource.includes('<OnboardingTutorial') &&
  appScreenSource.includes('Lihat Tutorial Lagi'),
  'Backward compatibility: OnboardingTutorial and "Lihat Tutorial Lagi" are preserved'
);

// Sidebar user profile card check
assert(
  appScreenSource.includes('{user?.nama || \'Pengguna SIPJAM\'}') &&
  appScreenSource.includes('renderUserAvatar'),
  'AppScreen.tsx displays user profile card with name and avatar in sidebar'
);

// ====================================================================
// SECTION 6: DOCUMENTATION COMPLETENESS
// ====================================================================
console.log('\n--- Section 6: User Guide & Tutorial Documentation ---');

const panduanPath = path.resolve(process.cwd(), 'docs/PANDUAN_PENGGUNA.md');
assert(fs.existsSync(panduanPath), 'docs/PANDUAN_PENGGUNA.md exists');
const panduanContent = fs.readFileSync(panduanPath, 'utf8');
assert(panduanContent.length > 10000, `PANDUAN_PENGGUNA.md has substantial content (${panduanContent.length} bytes > 10,000 bytes)`);

// Check required chapters in PANDUAN_PENGGUNA.md
assert(panduanContent.includes('1. Tentang SIPJAM'), 'PANDUAN_PENGGUNA.md includes Chapter 1: Tentang SIPJAM');
assert(panduanContent.includes('2. Hak Akses dan Peran Pengguna'), 'PANDUAN_PENGGUNA.md includes Chapter 2: Peran Pengguna');
assert(panduanContent.includes('Panduan Operasional Guru (11 Menu)'), 'PANDUAN_PENGGUNA.md includes Chapter 3: Guru (11 Menu)');
assert(panduanContent.includes('Panduan Operasional Administrator (14 Menu)'), 'PANDUAN_PENGGUNA.md includes Chapter 4: Administrator (14 Menu)');
assert(panduanContent.includes('Panduan Operasional Superadmin (3 Menu)'), 'PANDUAN_PENGGUNA.md includes Chapter 5: Superadmin (3 Menu)');
assert(panduanContent.includes('Tanya Jawab & Pemecahan Masalah'), 'PANDUAN_PENGGUNA.md includes Chapter 7: FAQ / Troubleshooting');

const tutorialMdPath = path.resolve(process.cwd(), 'TUTORIAL.md');
assert(fs.existsSync(tutorialMdPath), 'TUTORIAL.md exists in root directory');
const tutorialMdContent = fs.readFileSync(tutorialMdPath, 'utf8');
assert(tutorialMdContent.length > 8000, `TUTORIAL.md has substantial content (${tutorialMdContent.length} bytes > 8,000 bytes)`);
assert(tutorialMdContent.includes('TABEL MENU DAN HAK AKSES PERAN'), 'TUTORIAL.md contains menu & access rights reference table');
assert(tutorialMdContent.includes('ROLE GURU'), 'TUTORIAL.md contains Guru operational guide');
assert(tutorialMdContent.includes('ROLE ADMINISTRATOR'), 'TUTORIAL.md contains Administrator operational guide');
assert(tutorialMdContent.includes('ROLE SUPERADMIN'), 'TUTORIAL.md contains Superadmin operational guide');

// ====================================================================
// SUMMARY & EXIT CODE
// ====================================================================
console.log('\n================================================================');
console.log(` RESULTS: ${passed} passed, ${failed} failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
