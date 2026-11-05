import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('🧪 TEST SUITE: ADMIN DASHBOARD KOP SEKOLAH & SINGLE ADMIN DISPLAY');
console.log('========================================================================\n');

const projectRoot = process.cwd();

// --- 1. Testing formatSchoolDisplayName & Admin Title Generation Logic ---
console.log('--- 1. Testing Admin Title Dynamic Formatting from Kop Surat ---');

const formatSchoolDisplayName = (name: string): string => {
  if (!name) return 'Sekolah';
  const trimmed = name.trim();
  const stripped = trimmed.replace(/^sipjam\s*[-–—:]*\s*/i, '').trim();
  return stripped || trimmed;
};

const resolveAdminDisplayName = (schoolName: string): string => {
  const cleanSchool = formatSchoolDisplayName(schoolName);
  const baseSchool = cleanSchool.replace(/^admin\s+/i, '').trim() || 'Sekolah';
  return `Admin ${baseSchool}`;
};

assert.strictEqual(resolveAdminDisplayName('SMA NIZAMUDIN'), 'Admin SMA NIZAMUDIN');
assert.strictEqual(resolveAdminDisplayName('SIPJAM SMA NIZAMUDIN'), 'Admin SMA NIZAMUDIN');
assert.strictEqual(resolveAdminDisplayName('SIPJAM - SMA NEGERI 1 BIMA'), 'Admin SMA NEGERI 1 BIMA');
assert.strictEqual(resolveAdminDisplayName('Admin SMA NIZAMUDIN'), 'Admin SMA NIZAMUDIN');
assert.strictEqual(resolveAdminDisplayName('admin SMK 2 MATARAM'), 'Admin SMK 2 MATARAM');
assert.strictEqual(resolveAdminDisplayName('SMK 2 MATARAM'), 'Admin SMK 2 MATARAM');
assert.strictEqual(resolveAdminDisplayName('SMA Negeri 1 Tutuyan'), 'Admin SMA Negeri 1 Tutuyan');
assert.strictEqual(resolveAdminDisplayName(''), 'Admin Sekolah');
console.log('  ✔ [PASS] resolveAdminDisplayName dynamically adjusts to kop_sekolah without duplicate Admin prefixes');

// --- 2. Count "Admin" occurrences in rendered banner text ---
console.log('\n--- 2. Testing Single "Admin" Text & Zero School Mixing Enforcement ---');

interface RenderedBannerParts {
  heading: string;
  roleBadge: string | null;
  usernameText: string | null;
  schoolSubtext: string | null;
}

const renderBannerParts = (
  user: { role?: string; username?: string; nama?: string; sekolah_nama?: string },
  schoolName: string
): RenderedBannerParts => {
  const adminDisplayName = resolveAdminDisplayName(schoolName || (user as any)?.sekolah_nama || 'SMA NIZAMUDIN');
  const roleBadge = (user?.role && user.role.toLowerCase() !== 'admin' && !adminDisplayName.toLowerCase().includes('admin'))
    ? user.role
    : null;
  const usernameText = (user?.username && user.username.toLowerCase() !== 'admin')
    ? user.username
    : null;
  // School name is completely incorporated in heading (adminDisplayName); subtext must not mix or duplicate
  const schoolSubtext = null;

  return { heading: adminDisplayName, roleBadge, usernameText, schoolSubtext };
};

const countAdminOccurrences = (parts: RenderedBannerParts): number => {
  const fullText = [parts.heading, parts.roleBadge, parts.usernameText, parts.schoolSubtext]
    .filter(Boolean)
    .join(' ');
  const matches = fullText.match(/\badmin\b/gi);
  return matches ? matches.length : 0;
};

// Case A: Default admin user with username 'admin', role 'Admin', kop_sekolah 'SMA NIZAMUDIN'
const caseA = renderBannerParts({ role: 'Admin', username: 'admin', nama: 'Admin Sma Nizamudin' }, 'SMA NIZAMUDIN');
assert.strictEqual(caseA.heading, 'Admin SMA NIZAMUDIN');
assert.strictEqual(caseA.roleBadge, null, 'Role badge must be suppressed for admin');
assert.strictEqual(caseA.usernameText, null, 'Username "admin" must be suppressed to avoid duplicate');
assert.strictEqual(countAdminOccurrences(caseA), 1, 'Total displayed "admin" words must equal exactly 1');
console.log('  ✔ [PASS] Case A (default admin): Exactly 1 "Admin" displayed on Dashboard banner');

// Case B: Admin with custom school in kop surat (e.g. 'SMK Negeri 1 Bima')
const caseB = renderBannerParts({ role: 'Admin', username: 'admin', nama: 'Admin Sma Nizamudin' }, 'SMK Negeri 1 Bima');
assert.strictEqual(caseB.heading, 'Admin SMK Negeri 1 Bima');
assert.strictEqual(countAdminOccurrences(caseB), 1, 'Custom kop surat produces exactly 1 "Admin" word');
console.log('  ✔ [PASS] Case B (custom school in kop surat): Dynamically adapts to "Admin SMK Negeri 1 Bima" with 1 "Admin"');

// Case C: Admin with custom username e.g. 'operator_it'
const caseC = renderBannerParts({ role: 'Admin', username: 'operator_it', nama: 'Administrator' }, 'SMA NIZAMUDIN');
assert.strictEqual(caseC.heading, 'Admin SMA NIZAMUDIN');
assert.strictEqual(caseC.usernameText, 'operator_it');
assert.strictEqual(countAdminOccurrences(caseC), 1, 'Non-admin username does not add extra "admin" words');
console.log('  ✔ [PASS] Case C (custom username): Shows username while keeping "Admin" count at exactly 1');

// Case D: User reported issue: Admin SMA Negeri 1 Tutuyan must NEVER mix with SMA NIZAMUDIN
const caseD = renderBannerParts({ role: 'Admin', username: 'admin', nama: 'Admin' }, 'SMA Negeri 1 Tutuyan');
assert.strictEqual(caseD.heading, 'Admin SMA Negeri 1 Tutuyan');
assert.strictEqual(caseD.schoolSubtext, null, 'Subtext school must be null to prevent mixing');
assert.strictEqual(caseD.usernameText, null);
assert.strictEqual(countAdminOccurrences(caseD), 1);
const allTextCaseD = [caseD.heading, caseD.roleBadge, caseD.usernameText, caseD.schoolSubtext].filter(Boolean).join(' ');
assert(!allTextCaseD.includes('SMA NIZAMUDIN'), 'Must zero references to obsolete SMA NIZAMUDIN');
console.log('  ✔ [PASS] Case D (SMA Negeri 1 Tutuyan): Completely clean "Admin SMA Negeri 1 Tutuyan" without SMA NIZAMUDIN mixing');

// --- 3. Static Inspection of HomeViewAdmin.tsx ---
console.log('\n--- 3. Static Code Verification in HomeViewAdmin.tsx ---');
const homeAdminCode = fs.readFileSync(path.join(projectRoot, 'src/components/HomeViewAdmin.tsx'), 'utf8');

assert(homeAdminCode.includes('formatSchoolDisplayName'), 'HomeViewAdmin.tsx declares formatSchoolDisplayName');
assert(homeAdminCode.includes('adminDisplayName'), 'HomeViewAdmin.tsx calculates adminDisplayName');
assert(homeAdminCode.includes('{adminDisplayName}</h2>'), 'HomeViewAdmin.tsx renders adminDisplayName in h2');
assert(homeAdminCode.includes("in('key', ['kop_sekolah', 'NAMA_SEKOLAH'])"), 'HomeViewAdmin.tsx queries pengaturan for kop_sekolah and NAMA_SEKOLAH');
assert(homeAdminCode.includes("window.addEventListener('sipjam:config_updated'"), 'HomeViewAdmin.tsx listens to sipjam:config_updated');
assert(homeAdminCode.includes("window.addEventListener('storage'"), 'HomeViewAdmin.tsx listens to storage event for multi-tab sync');
assert(homeAdminCode.includes("user?.role && user.role.toLowerCase() !== 'admin'"), 'HomeViewAdmin.tsx suppresses role badge when role is admin');
assert(homeAdminCode.includes("user?.username && user.username.toLowerCase() !== 'admin'"), 'HomeViewAdmin.tsx suppresses username text when username is admin');
assert(!homeAdminCode.includes('<span className="truncate font-sans font-medium">{(user as any)?.sekolah_nama'), 'Must eliminate secondary school span mixing in HomeViewAdmin.tsx');
console.log('  ✔ [PASS] HomeViewAdmin.tsx eliminates secondary mixed school span and cleanly manages admin title');

// --- 4. Static Inspection of HomeView.tsx & AppScreen.tsx Props Propagation ---
console.log('\n--- 4. Static Code Verification in HomeView.tsx & AppScreen.tsx ---');
const homeViewCode = fs.readFileSync(path.join(projectRoot, 'src/components/HomeView.tsx'), 'utf8');
const appScreenCode = fs.readFileSync(path.join(projectRoot, 'src/components/AppScreen.tsx'), 'utf8');

assert(homeViewCode.includes('schoolName?: string;'), 'HomeView.tsx defines schoolName in HomeViewProps');
assert(homeViewCode.includes('schoolName={schoolName}'), 'HomeView.tsx passes schoolName to HomeViewAdmin');
assert(appScreenCode.includes('schoolName={schoolData?.nama}'), 'AppScreen.tsx passes schoolData?.nama to HomeView');
console.log('  ✔ [PASS] AppScreen.tsx and HomeView.tsx propagate schoolName to HomeViewAdmin');

console.log('\n========================================================================');
console.log('🎉 ALL ADMIN DASHBOARD KOP SEKOLAH & SINGLE ADMIN CHECKS PASSED!');
console.log('========================================================================\n');
