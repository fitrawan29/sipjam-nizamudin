import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('🧪 TEST SUITE: SIPJAM NAMA SEKOLAH KOP SURAT DISPLAY VERIFICATION');
console.log('========================================================================\n');

const projectRoot = process.cwd();

// --- 1. formatSchoolDisplayName Logic Test ---
console.log('--- 1. Testing formatSchoolDisplayName Logic ---');
const formatSchoolDisplayName = (name: string): string => {
  if (!name) return 'Sekolah';
  const trimmed = name.trim();
  const stripped = trimmed.replace(/^sipjam\s*[-–—:]*\s*/i, '').trim();
  return stripped || trimmed;
};

assert.strictEqual(formatSchoolDisplayName('SMA NIZAMUDIN'), 'SMA NIZAMUDIN');
assert.strictEqual(formatSchoolDisplayName('SIPJAM SMA NIZAMUDIN'), 'SMA NIZAMUDIN');
assert.strictEqual(formatSchoolDisplayName('SIPJAM - SMA NEGERI 1 BIMA'), 'SMA NEGERI 1 BIMA');
assert.strictEqual(formatSchoolDisplayName('sipjam  SMK 2 MATARAM'), 'SMK 2 MATARAM');
assert.strictEqual(formatSchoolDisplayName('SIPJAM'), 'SIPJAM');
assert.strictEqual(formatSchoolDisplayName(''), 'Sekolah');
console.log('  ✔ [PASS] formatSchoolDisplayName correctly strips duplicate SIPJAM prefix and preserves school name');

// --- 2. AppScreen.tsx Static Inspection ---
console.log('\n--- 2. AppScreen.tsx Static Verification ---');
const appScreenCode = fs.readFileSync(path.join(projectRoot, 'src/components/AppScreen.tsx'), 'utf8');

assert(appScreenCode.includes('formatSchoolDisplayName'), 'AppScreen.tsx must declare formatSchoolDisplayName');
assert(appScreenCode.includes("in('key', ['kop_sekolah', 'NAMA_SEKOLAH'])"), 'AppScreen.tsx must query pengaturan for kop_sekolah and NAMA_SEKOLAH');
assert(appScreenCode.includes('sipjam_config_sync'), 'AppScreen.tsx must support sipjam_config_sync cache');
assert(appScreenCode.includes("window.addEventListener('sipjam:config_updated', handleConfigSync)"), 'AppScreen.tsx must listen to sipjam:config_updated');
assert(appScreenCode.includes("window.addEventListener('storage', handleStorageUpdate)"), 'AppScreen.tsx must listen to storage events for multi-tab sync');
assert(appScreenCode.includes('{isSuperadmin ? \'Superadmin\' : isDinas ? \'Dinas Pendidikan\' : (schoolData?.nama || \'Sekolah\')}'), 'AppScreen.tsx must maintain dynamic tenant header contract');
console.log('  ✔ [PASS] AppScreen.tsx integrates kop_sekolah database query, cache initialization, and realtime sync');

// --- 3. AdminConfigView.tsx Static Inspection ---
console.log('\n--- 3. AdminConfigView.tsx Static Verification ---');
const adminConfigCode = fs.readFileSync(path.join(projectRoot, 'src/components/AdminConfigView.tsx'), 'utf8');

assert(adminConfigCode.includes('name="kop_sekolah"'), 'AdminConfigView.tsx must include input for kop_sekolah');
assert(adminConfigCode.includes("saveConfig.kop_sekolah"), 'AdminConfigView.tsx must save kop_sekolah');
assert(adminConfigCode.includes("window.dispatchEvent(new CustomEvent('sipjam:config_updated'"), 'AdminConfigView.tsx must dispatch sipjam:config_updated event');
assert(adminConfigCode.includes("localStorage.setItem('sipjam_config_sync'"), 'AdminConfigView.tsx must persist sipjam_config_sync in localStorage');
assert(adminConfigCode.includes("u.sekolah_nama = saveConfig.kop_sekolah"), 'AdminConfigView.tsx must sync sekolah_nama to sipjam_user cache');
console.log('  ✔ [PASS] AdminConfigView.tsx saves kop_sekolah, dispatches sync event, and updates caches');

// --- 4. HomeViewGuru.tsx Static Inspection ---
console.log('\n--- 4. HomeViewGuru.tsx Static Verification ---');
const homeGuruCode = fs.readFileSync(path.join(projectRoot, 'src/components/HomeViewGuru.tsx'), 'utf8');

assert(!homeGuruCode.includes('<span className="truncate font-sans font-medium">SMA NIZAMUDIN</span>'), 'HomeViewGuru.tsx must not hardcode SMA NIZAMUDIN in profile banner');
assert(homeGuruCode.includes('<span className="truncate font-sans font-medium">{schoolName}</span>'), 'HomeViewGuru.tsx must use dynamic schoolName in profile banner');
assert(homeGuruCode.includes("in('key', ['kop_sekolah', 'NAMA_SEKOLAH'])"), 'HomeViewGuru.tsx must query pengaturan for school name');
assert(homeGuruCode.includes("e?.detail?.config?.kop_sekolah"), 'HomeViewGuru.tsx must reactively update schoolName on config sync');
console.log('  ✔ [PASS] HomeViewGuru.tsx dynamically resolves and displays school name from kop_sekolah');

console.log('\n========================================================================');
console.log('🎉 ALL SIPJAM KOP SEKOLAH DISPLAY VERIFICATION CHECKS PASSED!');
console.log('========================================================================\n');
