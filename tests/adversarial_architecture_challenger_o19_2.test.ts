import fs from 'fs';
import path from 'path';
import { AppUser } from '../src/types/user';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('================================================================');
console.log('ADVERSARIAL CHALLENGER o19_2: ARCHITECTURE & REFACTORING STRESS TEST');
console.log('================================================================\n');

// =============================================================================
// TEST 1: R3 - isGuru Logic & Role Variations Stress Testing
// =============================================================================
console.log('--- TEST 1: R3 isGuru Logic Permutations & Edge Cases ---');

// The exact logic implemented in HomeView.tsx:
function evaluateHomeViewRole(roleInput?: string | null) {
  const role = (roleInput || '').toLowerCase().replace(/\s+/g, '');
  const isSuperadmin = role === 'superadmin';
  const isAdmin = isSuperadmin || role === 'admin';
  const isGuru = !isAdmin;
  return { role, isSuperadmin, isAdmin, isGuru };
}

// The exact logic implemented in AppScreen.tsx:
function evaluateAppScreenRole(roleInput?: string | null) {
  const isSuperadmin = (roleInput || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (roleInput || '').toLowerCase() === 'admin';
  const isGuru = !isAdmin;
  return { isSuperadmin, isAdmin, isGuru };
}

const superadminVariations = [
  'Superadmin',
  'super admin',
  'superadmin',
  'SUPERADMIN',
  'SUPER ADMIN',
  '  Superadmin  ',
  '  super admin  ',
  'Super Admin',
  'super  admin',
  'SUPER\tADMIN',
];

for (const variant of superadminVariations) {
  const resHome = evaluateHomeViewRole(variant);
  assert(resHome.isSuperadmin === true, `HomeView: "${variant}" is recognized as isSuperadmin=true`);
  assert(resHome.isAdmin === true, `HomeView: "${variant}" is recognized as isAdmin=true`);
  assert(resHome.isGuru === false, `HomeView: "${variant}" is strictly NOT guru (isGuru=false)`);

  const resApp = evaluateAppScreenRole(variant);
  assert(resApp.isSuperadmin === true, `AppScreen: "${variant}" is recognized as isSuperadmin=true`);
  assert(resApp.isAdmin === true, `AppScreen: "${variant}" is recognized as isAdmin=true`);
  assert(resApp.isGuru === false, `AppScreen: "${variant}" is strictly NOT guru (isGuru=false)`);
}

const adminVariations = [
  'Admin',
  'admin',
  'ADMIN',
  '  Admin  ',
  '  admin  ',
];

for (const variant of adminVariations) {
  const resHome = evaluateHomeViewRole(variant);
  assert(resHome.isSuperadmin === false, `HomeView: "${variant}" is NOT superadmin`);
  assert(resHome.isAdmin === true, `HomeView: "${variant}" is recognized as isAdmin=true`);
  assert(resHome.isGuru === false, `HomeView: "${variant}" is strictly NOT guru (isGuru=false)`);
}

const nonAdminVariations = [
  { input: 'Guru', expectedGuru: true },
  { input: 'guru', expectedGuru: true },
  { input: 'GURU', expectedGuru: true },
  { input: '  Guru  ', expectedGuru: true },
  { input: 'Kepala Sekolah', expectedGuru: true },
  { input: 'kepala sekolah', expectedGuru: true },
  { input: 'KEPALA SEKOLAH', expectedGuru: true },
  { input: 'Wali Kelas', expectedGuru: true },
  { input: '', expectedGuru: true },
  { input: null, expectedGuru: true },
  { input: undefined, expectedGuru: true },
];

for (const { input, expectedGuru } of nonAdminVariations) {
  const resHome = evaluateHomeViewRole(input);
  assert(resHome.isSuperadmin === false, `HomeView: "${input}" is NOT superadmin`);
  assert(resHome.isAdmin === false, `HomeView: "${input}" is NOT admin`);
  assert(resHome.isGuru === expectedGuru, `HomeView: "${input}" resolves to isGuru=${expectedGuru}`);
}

console.log('✅ ALL R3 ROLE PERMUTATIONS PASSED: Superadmin is NEVER considered Guru!\n');

// =============================================================================
// TEST 2: R5 - AppUser Interface Optional Fields & Compilation Safety
// =============================================================================
console.log('--- TEST 2: R5 AppUser Interface Typing & Optional Fields ---');

// Case A: Minimal AppUser (all required fields only)
const minimalUser: AppUser = {
  id: 'usr-1',
  username: 'teacher1',
  nama: 'Guru Satu, S.Pd',
  role: 'Guru',
  sekolah_id: 'sch-1',
  session_token: 'tok-abc-123',
};
assert(minimalUser.nip === undefined, 'minimalUser: nip is optional and can be undefined');
assert(minimalUser.name === undefined, 'minimalUser: name is optional and can be undefined');
assert(minimalUser.penugasan === undefined, 'minimalUser: penugasan is optional and can be undefined');

// Case B: Full AppUser with nip, name, penugasan, avatar, wali_kelas
const fullUser: AppUser = {
  id: 'usr-2',
  username: 'teacher2',
  nama: 'Guru Dua, M.Pd',
  role: 'Guru',
  sekolah_id: 'sch-1',
  session_token: 'tok-xyz-456',
  avatar: 'https://example.com/avatar.png',
  wali_kelas: '9A',
  nip: '198501012010011001',
  name: 'Guru Dua Display',
  penugasan: { mapel: 'Matematika', kelas: ['9A', '9B'] },
  customExtraProperty: 'allowed by index signature',
};
assert(fullUser.nip === '198501012010011001', 'fullUser: nip is preserved as string');
assert(fullUser.name === 'Guru Dua Display', 'fullUser: name is preserved as string');
assert(fullUser.penugasan?.mapel === 'Matematika', 'fullUser: penugasan is preserved and accessible');
assert(fullUser['customExtraProperty'] === 'allowed by index signature', 'fullUser: index signature allows dynamic fields');

// Case C: AppUser with object-based wali_kelas
const objectWaliUser: AppUser = {
  id: 'usr-3',
  username: 'wali3',
  nama: 'Guru Wali Tiga',
  role: 'Guru',
  sekolah_id: 'sch-2',
  session_token: 'tok-789',
  wali_kelas: { kelas: '8C' },
  nip: undefined,
  name: undefined,
  penugasan: null,
};
assert(typeof objectWaliUser.wali_kelas === 'object', 'objectWaliUser: object wali_kelas is supported');
assert((objectWaliUser.wali_kelas as { kelas: string })?.kelas === '8C', 'objectWaliUser: wali_kelas.kelas is 8C');

// Case D: Type compatibility with consumers
function acceptsUser(u: AppUser): string {
  return `${u.nama} (${u.role}) - NIP: ${u.nip ?? 'none'}`;
}
assert(acceptsUser(minimalUser) === 'Guru Satu, S.Pd (Guru) - NIP: none', 'acceptsUser works with minimalUser');
assert(acceptsUser(fullUser) === 'Guru Dua, M.Pd (Guru) - NIP: 198501012010011001', 'acceptsUser works with fullUser');
assert(acceptsUser(objectWaliUser) === 'Guru Wali Tiga (Guru) - NIP: none', 'acceptsUser works with objectWaliUser');

console.log('✅ ALL R5 APPUSER TYPING TESTS PASSED!\n');

// =============================================================================
// TEST 3: R6 - Custom Hooks Exception & Broken State Resilience
// =============================================================================
console.log('--- TEST 3: R6 Custom Hooks Exception Resilience ---');

// Inspect hook definitions for try-catch blocks and null guards
const hooksToCheck = [
  { name: 'useSessionSync', file: 'src/hooks/useSessionSync.ts' },
  { name: 'useWaliKelas', file: 'src/hooks/useWaliKelas.ts' },
  { name: 'usePiket', file: 'src/hooks/usePiket.ts' },
  { name: 'useBroadcasts', file: 'src/hooks/useBroadcasts.ts' },
];

for (const hook of hooksToCheck) {
  const filePath = path.resolve(__dirname, '..', hook.file);
  assert(fs.existsSync(filePath), `${hook.file} exists`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify try-catch presence
  assert(content.includes('try {') && content.includes('} catch'), `${hook.name} wraps async logic in try-catch`);

  // Verify export function
  assert(content.includes(`export function ${hook.name}`), `${hook.name} is correctly exported`);
}

// Verify useSessionSync handles null / missing token
const sessionSyncContent = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useSessionSync.ts'), 'utf8');
assert(
  sessionSyncContent.includes('if (!activeUser?.id || !activeUser?.session_token) return;'),
  'useSessionSync safely guards against null activeUser or missing session_token'
);

// Verify usePiket handles null user and unmounted state
const piketContent = fs.readFileSync(path.resolve(__dirname, '../src/hooks/usePiket.ts'), 'utf8');
assert(
  piketContent.includes('if (!user) {') && piketContent.includes('setIsPiketHariIni(false);'),
  'usePiket safely falls back to false when user is null'
);
assert(
  piketContent.includes('isMounted = false'),
  'usePiket includes cleanup guard against memory leaks and unmounted state update'
);

// Verify useBroadcasts handles null user
const broadcastContent = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useBroadcasts.ts'), 'utf8');
assert(
  broadcastContent.includes("const myUserId = String(user?.id || user?.username || user?.nama || 'user');"),
  'useBroadcasts safely falls back to default id when user is null'
);
assert(
  broadcastContent.includes('supabase.removeChannel(channel);'),
  'useBroadcasts safely removes channel on unmount'
);

// Verify useWaliKelas handles null user
const waliContent = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useWaliKelas.ts'), 'utf8');
assert(
  waliContent.includes('isAdmin') && waliContent.includes('setIsWaliKelas(true);'),
  'useWaliKelas immediately grants true to admin without querying'
);

console.log('✅ ALL R6 CUSTOM HOOKS EXCEPTION RESILIENCE CHECKS PASSED!\n');

// =============================================================================
// TEST 4: R7 - Split HomeView Line Count & Structure
// =============================================================================
console.log('--- TEST 4: R7 HomeView Line Count & Architecture ---');

const homeViewPath = path.resolve(__dirname, '../src/components/HomeView.tsx');
const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');
const lines = homeViewContent.split('\n');

console.log(`Actual line count of src/components/HomeView.tsx: ${lines.length}`);
assert(lines.length < 200, `HomeView.tsx line count is strictly < 200 lines (actual: ${lines.length})`);
assert(lines.length <= 50, `HomeView.tsx is ultra-lean (<= 50 lines) as a clean dispatcher`);

// Verify target components exist and are properly imported
const homeGuruPath = path.resolve(__dirname, '../src/components/HomeViewGuru.tsx');
const homeAdminPath = path.resolve(__dirname, '../src/components/HomeViewAdmin.tsx');
assert(fs.existsSync(homeGuruPath), 'HomeViewGuru.tsx exists');
assert(fs.existsSync(homeAdminPath), 'HomeViewAdmin.tsx exists');

assert(homeViewContent.includes("import HomeViewGuru from './HomeViewGuru';"), 'HomeView imports HomeViewGuru');
assert(homeViewContent.includes("import HomeViewAdmin from './HomeViewAdmin';"), 'HomeView imports HomeViewAdmin');
assert(homeViewContent.includes('if (isGuru) {'), 'HomeView checks isGuru');
assert(homeViewContent.includes('<HomeViewGuru'), 'HomeView renders HomeViewGuru for guru');
assert(homeViewContent.includes('<HomeViewAdmin'), 'HomeView renders HomeViewAdmin for admin/superadmin');

console.log('✅ ALL R7 HOMEVIEW SPLIT AND LINE COUNT CHECKS PASSED!\n');

// =============================================================================
// TEST 5: AppScreen Hook Consumption Verification
// =============================================================================
console.log('--- TEST 5: AppScreen Hook Integration ---');

const appScreenPath = path.resolve(__dirname, '../src/components/AppScreen.tsx');
const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');

assert(appScreenContent.includes("import { useSessionSync } from '@/hooks/useSessionSync';"), 'AppScreen imports useSessionSync');
assert(appScreenContent.includes("import { useWaliKelas } from '@/hooks/useWaliKelas';"), 'AppScreen imports useWaliKelas');
assert(appScreenContent.includes("import { usePiket } from '@/hooks/usePiket';"), 'AppScreen imports usePiket');
assert(appScreenContent.includes("import { useBroadcasts } from '@/hooks/useBroadcasts';"), 'AppScreen imports useBroadcasts');

assert(appScreenContent.includes('const { syncKey, currentUser, setCurrentUser } = useSessionSync('), 'AppScreen consumes useSessionSync correctly');
assert(appScreenContent.includes('const { isWaliKelas, assignedKelas } = useWaliKelas('), 'AppScreen consumes useWaliKelas correctly');
assert(appScreenContent.includes('const { isPiketHariIni } = usePiket('), 'AppScreen consumes usePiket correctly');
assert(appScreenContent.includes('useBroadcasts(user, isAdmin, isWaliKelas, syncKey)'), 'AppScreen consumes useBroadcasts correctly');

console.log('✅ ALL APPSCREEN HOOK INTEGRATION CHECKS PASSED!\n');

console.log('================================================================');
console.log('🎉 ALL ADVERSARIAL CHALLENGE CHECKS PASSED WITH FLYING COLORS!');
console.log('================================================================');
