import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('SIPJAM R1-R10 PONYTAIL VERIFICATION TEST SUITE');
console.log('====================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// Helper to recursively get all files in a directory
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

// ---------------------------------------------------------------------------
// R1. Security: Remove hardcoded credentials
// ---------------------------------------------------------------------------
console.log('--- R1: Security - Remove Hardcoded Credentials ---');
const srcDir = path.join(projectRoot, 'src');
const allSrcFiles = getAllFiles(srcDir);

let hardcodedCount = 0;
const forbiddenCredential = 'SipjamSuperAdmin';

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(forbiddenCredential)) {
    console.error(`Found "${forbiddenCredential}" in ${file}`);
    hardcodedCount++;
  }
}

assert(hardcodedCount === 0, `Zero occurrences of '${forbiddenCredential}' in src/ (found ${hardcodedCount})`);

const envPath = path.join(projectRoot, '.env.local');
assert(fs.existsSync(envPath), '.env.local file exists');
const envContent = fs.readFileSync(envPath, 'utf8');
assert(
  envContent.includes('SUPERADMIN_API_PASSWORD='),
  '.env.local contains SUPERADMIN_API_PASSWORD configuration'
);

const attendanceRoutePath = path.join(projectRoot, 'src', 'app', 'api', 'attendance', 'route.ts');
assert(fs.existsSync(attendanceRoutePath), 'src/app/api/attendance/route.ts exists');
const attendanceRouteContent = fs.readFileSync(attendanceRoutePath, 'utf8');
assert(
  attendanceRouteContent.includes('process.env.SUPERADMIN_API_PASSWORD'),
  'src/app/api/attendance/route.ts references process.env.SUPERADMIN_API_PASSWORD'
);
assert(
  attendanceRouteContent.includes('if (!superadminPassword) {\n    return null;') ||
  attendanceRouteContent.includes('if (!superadminPassword) {\r\n    return null;') ||
  attendanceRouteContent.includes('if (!superadminPassword) return null;'),
  'resolveSessionToken cleanly returns null when SUPERADMIN_API_PASSWORD is not set'
);

// ---------------------------------------------------------------------------
// R2. Remove duplicate auth state
// ---------------------------------------------------------------------------
console.log('\n--- R2: Remove Duplicate Auth State in page.tsx ---');
const pagePath = path.join(projectRoot, 'src', 'app', 'page.tsx');
assert(fs.existsSync(pagePath), 'src/app/page.tsx exists');
const pageContent = fs.readFileSync(pagePath, 'utf8');

assert(!pageContent.includes('supabase.auth'), 'Grep "supabase.auth" in src/app/page.tsx is 0');
assert(pageContent.includes('<MainApp />'), 'src/app/page.tsx renders MainApp directly');

// ---------------------------------------------------------------------------
// R3. Fix bug isGuru in HomeView
// ---------------------------------------------------------------------------
console.log('\n--- R3: Fix isGuru logic in HomeView ---');
const homeViewPath = path.join(projectRoot, 'src', 'components', 'HomeView.tsx');
assert(fs.existsSync(homeViewPath), 'src/components/HomeView.tsx exists');
const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');

assert(
  homeViewContent.includes("const isSuperadmin = role === 'superadmin';") &&
  homeViewContent.includes("const isAdmin = isSuperadmin || role === 'admin';") &&
  homeViewContent.includes("const isGuru = !isAdmin;"),
  'src/components/HomeView.tsx calculates isGuru = !isAdmin based on normalized role'
);

// ---------------------------------------------------------------------------
// R4. Scope Realtime Channel per Sekolah in AdminVerifView
// ---------------------------------------------------------------------------
console.log('\n--- R4: Scope Realtime Channel in AdminVerifView ---');
const adminVerifPath = path.join(projectRoot, 'src', 'components', 'AdminVerifView.tsx');
assert(fs.existsSync(adminVerifPath), 'src/components/AdminVerifView.tsx exists');
const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf8');

assert(!adminVerifContent.includes("'verif-presensi'"), 'Grep "verif-presensi\'" in AdminVerifView.tsx is 0');
assert(!adminVerifContent.includes('"verif-presensi"'), 'Grep "\\"verif-presensi\\"" in AdminVerifView.tsx is 0');
assert(
  adminVerifContent.includes('verif-presensi-${user?.sekolah_id || \'global\'}'),
  'Realtime channel for presensi is scoped by user?.sekolah_id'
);
assert(
  adminVerifContent.includes('verif-jurnal-${user?.sekolah_id || \'global\'}'),
  'Realtime channel for jurnal is scoped by user?.sekolah_id'
);
assert(
  adminVerifContent.includes('verif-piket-${user?.sekolah_id || \'global\'}'),
  'Realtime channel for piket is scoped by user?.sekolah_id'
);

// ---------------------------------------------------------------------------
// R5. AppUser interface definition & consumption
// ---------------------------------------------------------------------------
console.log('\n--- R5: AppUser Interface ---');
const userTypesPath = path.join(projectRoot, 'src', 'types', 'user.ts');
assert(fs.existsSync(userTypesPath), 'src/types/user.ts exists');
const userTypesContent = fs.readFileSync(userTypesPath, 'utf8');

assert(userTypesContent.includes('export interface AppUser'), 'src/types/user.ts exports AppUser interface');
assert(userTypesContent.includes('session_token: string;'), 'AppUser interface contains session_token');
assert(userTypesContent.includes('sekolah_id: string;'), 'AppUser interface contains sekolah_id');

// Verify consumption in AppScreen, HomeView, LoginScreen, GuruPresensi
const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
assert(appScreenContent.includes("import { AppUser } from '@/types/user';"), 'AppScreen.tsx imports AppUser');
assert(appScreenContent.includes('user: AppUser;'), 'AppScreen.tsx types user prop as AppUser');

assert(homeViewContent.includes("import { AppUser } from '@/types/user';"), 'HomeView.tsx imports AppUser');
assert(homeViewContent.includes('user: AppUser;'), 'HomeView.tsx types user prop as AppUser');

const loginScreenPath = path.join(projectRoot, 'src', 'components', 'LoginScreen.tsx');
const loginScreenContent = fs.readFileSync(loginScreenPath, 'utf8');
assert(loginScreenContent.includes("import { AppUser } from '@/types/user';"), 'LoginScreen.tsx imports AppUser');
assert(loginScreenContent.includes('(user: AppUser) => void'), 'LoginScreen.tsx types callback with AppUser');

const guruPresensiPath = path.join(projectRoot, 'src', 'components', 'GuruPresensi.tsx');
const guruPresensiContent = fs.readFileSync(guruPresensiPath, 'utf8');
assert(guruPresensiContent.includes("import { AppUser } from '@/types/user';"), 'GuruPresensi.tsx imports AppUser');
assert(guruPresensiContent.includes('user: AppUser'), 'GuruPresensi.tsx types user prop as AppUser');

// ---------------------------------------------------------------------------
// R6. Extract 4 Hooks from AppScreen.tsx
// ---------------------------------------------------------------------------
console.log('\n--- R6: Extract Hooks from AppScreen ---');
const hooksDir = path.join(projectRoot, 'src', 'hooks');
assert(fs.existsSync(hooksDir), 'src/hooks directory exists');

const hookFiles = ['useSessionSync.ts', 'useWaliKelas.ts', 'usePiket.ts', 'useBroadcasts.ts'];
for (const hf of hookFiles) {
  const hp = path.join(hooksDir, hf);
  assert(fs.existsSync(hp), `src/hooks/${hf} exists`);
}

assert(appScreenContent.includes("import { useSessionSync } from '@/hooks/useSessionSync';"), 'AppScreen imports useSessionSync');
assert(appScreenContent.includes("import { useWaliKelas } from '@/hooks/useWaliKelas';"), 'AppScreen imports useWaliKelas');
assert(appScreenContent.includes("import { usePiket } from '@/hooks/usePiket';"), 'AppScreen imports usePiket');
assert(appScreenContent.includes("import { useBroadcasts } from '@/hooks/useBroadcasts';"), 'AppScreen imports useBroadcasts');

assert(appScreenContent.includes('useSessionSync('), 'AppScreen consumes useSessionSync');
assert(appScreenContent.includes('useWaliKelas('), 'AppScreen consumes useWaliKelas');
assert(appScreenContent.includes('usePiket('), 'AppScreen consumes usePiket');
assert(appScreenContent.includes('useBroadcasts('), 'AppScreen consumes useBroadcasts');

// ---------------------------------------------------------------------------
// R7. Split HomeView into HomeViewGuru & HomeViewAdmin
// ---------------------------------------------------------------------------
console.log('\n--- R7: Split HomeView into Separate Dashboards ---');
const homeGuruPath = path.join(projectRoot, 'src', 'components', 'HomeViewGuru.tsx');
const homeAdminPath = path.join(projectRoot, 'src', 'components', 'HomeViewAdmin.tsx');

assert(fs.existsSync(homeGuruPath), 'src/components/HomeViewGuru.tsx exists');
assert(fs.existsSync(homeAdminPath), 'src/components/HomeViewAdmin.tsx exists');

const homeLineCount = homeViewContent.split('\n').length;
assert(homeLineCount < 200, `HomeView.tsx line count is < 200 (actual: ${homeLineCount} lines)`);
assert(homeViewContent.includes('<HomeViewGuru'), 'HomeView.tsx delegates to HomeViewGuru');
assert(homeViewContent.includes('<HomeViewAdmin'), 'HomeView.tsx delegates to HomeViewAdmin');

// ---------------------------------------------------------------------------
// R8. Preconnect Font Awesome in layout.tsx
// ---------------------------------------------------------------------------
console.log('\n--- R8: Preconnect in layout.tsx ---');
const layoutPath = path.join(projectRoot, 'src', 'app', 'layout.tsx');
assert(fs.existsSync(layoutPath), 'src/app/layout.tsx exists');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

const preconnectIdx = layoutContent.indexOf('<link rel="preconnect" href="https://cdnjs.cloudflare.com" />');
const fontAwesomeIdx = layoutContent.indexOf('href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/');

assert(preconnectIdx !== -1, 'layout.tsx contains preconnect link for cdnjs.cloudflare.com');
assert(fontAwesomeIdx !== -1, 'layout.tsx contains Font Awesome stylesheet link');
assert(preconnectIdx < fontAwesomeIdx, 'preconnect link appears before Font Awesome stylesheet link');

// ---------------------------------------------------------------------------
// R9. Supabase Connectivity Test Once-Flag
// ---------------------------------------------------------------------------
console.log('\n--- R9: Supabase Connectivity Once-Flag ---');
const supabaseClientPath = path.join(projectRoot, 'src', 'lib', 'supabaseClient.ts');
assert(fs.existsSync(supabaseClientPath), 'src/lib/supabaseClient.ts exists');
const supabaseClientContent = fs.readFileSync(supabaseClientPath, 'utf8');

assert(
  supabaseClientContent.includes('_connectivityChecked') &&
  supabaseClientContent.includes('!_connectivityChecked') &&
  supabaseClientContent.includes('_connectivityChecked = true;'),
  'src/lib/supabaseClient.ts implements _connectivityChecked once-flag guard'
);

// ---------------------------------------------------------------------------
// R10. Clean dead code sync-spreadsheet
// ---------------------------------------------------------------------------
console.log('\n--- R10: Dead Code sync-spreadsheet Cleaned ---');
const deadDirPath = path.join(projectRoot, 'src', 'app', 'api', 'sync-spreadsheet');
assert(!fs.existsSync(deadDirPath), 'src/app/api/sync-spreadsheet directory does not exist (cleaned up)');

console.log('\n====================================================');
console.log('🎉 ALL R1-R10 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
console.log('====================================================');
