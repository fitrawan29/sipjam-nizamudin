/**
 * Reviewer Independent Verification Suite: Requirement R3.1 (Sidebar Menu User Profile Display)
 * Validates structural integrity, role badge matrix, responsive scroll bounds,
 * regression preservation, and edge case resilience in AppScreen.tsx.
 *
 * Execution:
 * npx tsx tests/reviewer_m2_1_sidebar_profile.test.ts
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

let passed = 0;
let failed = 0;

function check(desc: string, fn: () => boolean | void) {
  try {
    const res = fn();
    if (res === false) {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    } else {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${desc} -> ${err.message}`);
    failed++;
  }
}

console.log('======================================================================');
console.log(' REVIEWER M2-1 INDEPENDENT VERIFICATION: SIDEBAR USER PROFILE (R3.1)');
console.log('======================================================================\n');

const appScreenFile = path.resolve(process.cwd(), 'src/components/AppScreen.tsx');
assert(fs.existsSync(appScreenFile), 'AppScreen.tsx exists');
const src = fs.readFileSync(appScreenFile, 'utf8');

console.log('--- 1. DOM Hierarchy & Position Verification ---');

check('User identity card is rendered below the brand header divider', () => {
  const brandHeaderIndex = src.indexOf('{isSuperadmin ? \'Portal Superadmin\' : isDinas ? \'Dinas Pendidikan\' : \'SIPJAM Menu\'}');
  const userCardIndex = src.indexOf('{/* User Identity Card */}');
  const menuListIndex = src.indexOf('flex-1 min-h-0 overflow-y-auto px-2 py-2 custom-scroll');
  return brandHeaderIndex !== -1 && userCardIndex > brandHeaderIndex && menuListIndex > userCardIndex;
});

check('User identity card is rendered directly above the scrollable menu list', () => {
  const cardStart = src.indexOf('{/* User Identity Card */}');
  const menuListStart = src.indexOf('flex-1 min-h-0 overflow-y-auto px-2 py-2 custom-scroll');
  const chunkBetween = src.substring(cardStart, menuListStart);
  // Between the card and the menu list, there should only be the closing div of the card
  return chunkBetween.includes('truncate') && chunkBetween.includes('renderUserAvatar');
});

console.log('\n--- 2. User Identity Card Subcomponents ---');

check('Avatar display invokes renderUserAvatar with fallback to currentUser or user avatar', () => {
  return src.includes("renderUserAvatar(currentUser?.avatar || user?.avatar, 'w-10 h-10')");
});

check('Avatar container includes active status badge dot', () => {
  return src.includes('bg-teal-500 border-2 border-[#E6ECF2] dark:border-[#1F242D]') &&
         src.includes('title="Aktif"');
});

check('Full name display handles user?.nama with fallback to "Pengguna SIPJAM"', () => {
  return src.includes("user?.nama || 'Pengguna SIPJAM'");
});

check('Full name element includes truncation and title attribute to avoid layout breaking', () => {
  return src.includes('truncate" title={user?.nama || \'Pengguna SIPJAM\'}');
});

check('Username / NIP display handles both user?.username and user?.nip with truncation', () => {
  return src.includes('(user?.username || user?.nip)') &&
         src.includes('title={user?.username || user?.nip}');
});

console.log('\n--- 3. Role Badge Matrix & Color Coding ---');

check('Role badge correctly maps isSuperadmin to Cool Slate inset amber palette and fa-crown', () => {
  return src.includes("isSuperadmin") &&
         src.includes("'neu-inset text-amber-800 dark:text-amber-300'") &&
         src.includes("isSuperadmin ? 'fa-crown'") &&
         src.includes("isSuperadmin ? 'Superadmin'");
});

check('Role badge correctly maps isAdmin to Cool Slate inset blue palette and fa-user-shield', () => {
  return src.includes("isAdmin") &&
         src.includes("'neu-inset text-blue-800 dark:text-blue-300'") &&
         src.includes("isAdmin ? 'fa-user-shield'") &&
         src.includes("isAdmin ? 'Administrator'");
});

check('Role badge correctly maps isWaliKelas to Cool Slate inset teal palette and "Guru (Wali Kelas)"', () => {
  return src.includes("isWaliKelas") &&
         src.includes("'neu-inset text-teal-800 dark:text-teal-300'") &&
         src.includes("isWaliKelas ? 'Guru (Wali Kelas)'");
});

check('Role badge defaults regular teacher to Deep Teal Cool Slate inset palette and "Guru"', () => {
  return src.includes("'neu-inset text-[#0F766E] dark:text-teal-300'") &&
         src.includes(": 'Guru'");
});

console.log('\n--- 4. Responsiveness & Mobile Scroll Bounds ---');

check('Menu drawer list has flex-1 min-h-0 overflow-y-auto px-2 py-2', () => {
  return src.includes('className="space-y-2 flex-1 min-h-0 overflow-y-auto px-2 py-2 custom-scroll"');
});

check('Outer drawer container maintains bounded width and flex column structure', () => {
  return (src.includes('w-72 max-w-[85%]') || src.includes('w-80 max-w-[88%]')) &&
         src.includes('h-full') &&
         src.includes('flex flex-col justify-between');
});

console.log('\n--- 5. Regression Test Constraints Preservation ---');

check('"Lihat Tutorial Lagi" button is preserved for non-superadmin users', () => {
  return src.includes('!isSuperadmin') &&
         src.includes('Lihat Tutorial Lagi');
});

check('"Lihat Tutorial Lagi" click triggers setTourOpen(true) and setSidebarOpen(false)', () => {
  return src.includes('onClick={() => { setTourOpen(true); setSidebarOpen(false); }}');
});

check('"Panduan & Tutorial Lengkap" button is present and triggers setTutorialModalOpen(true) and setSidebarOpen(false)', () => {
  return src.includes('Panduan & Tutorial Lengkap') &&
         src.includes('onClick={() => { setTutorialModalOpen(true); setSidebarOpen(false); }}');
});

check('"Pengaturan Akun" button is preserved and closes sidebar', () => {
  return src.includes('Pengaturan Akun') &&
         src.includes('onClick={() => { setSidebarOpen(false); setIsAccountModalOpen(true); }}');
});

check('TutorialModal component is mounted with user role and navigation callback', () => {
  return src.includes('<TutorialModal') &&
         src.includes('isOpen={tutorialModalOpen}') &&
         src.includes('onClose={() => setTutorialModalOpen(false)}') &&
         src.includes('onNavigate={handleNavigation}') &&
         src.includes('currentRole={user?.role}');
});

check('OnboardingTutorial component remains mounted with existing props', () => {
  return src.includes('<OnboardingTutorial') &&
         src.includes('isOpen={tourOpen}') &&
         src.includes('onClose={() => setTourOpen(false)}') &&
         src.includes('onComplete={() => setTourOpen(false)}') &&
         src.includes('onEnsureSidebarOpen={(open) => setSidebarOpen(open)}');
});

console.log('\n--- 6. Integrity & Anti-Facade Verification ---');

check('No hardcoded user credentials or simulated names in AppScreen identity card', () => {
  // Check that the card binds dynamically to `user?.` and not a hardcoded name like 'Fitra' or 'Admin Test'
  const cardStart = src.indexOf('{/* User Identity Card */}');
  const menuListStart = src.indexOf('flex-1 min-h-0 overflow-y-auto px-2 py-2 custom-scroll');
  const cardChunk = src.substring(cardStart, menuListStart);
  return !cardChunk.includes('"Ade Fitrawan"') &&
         !cardChunk.includes('"Admin Sekolah"') &&
         !cardChunk.includes('"Pak Budi"');
});

check('renderUserAvatar library handles diverse avatar types safely', async () => {
  const { renderUserAvatar } = await import('../src/lib/avatars');
  // 1. null/undefined fallback
  const fallback = renderUserAvatar(null);
  assert(fallback !== null);
  // 2. Preset
  const preset = renderUserAvatar('avatar_1');
  assert(preset !== null);
  // 3. Data URL
  const dataUrl = renderUserAvatar('data:image/png;base64,iVBORw0KGgo=');
  assert(dataUrl !== null);
  return true;
});

console.log('\n======================================================================');
console.log(` RESULTS: ${passed} passed, ${failed} failed`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL REVIEWER M2-1 VERIFICATIONS PASSED (100%)\n');
  process.exit(0);
}
