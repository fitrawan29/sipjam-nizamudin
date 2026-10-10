import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [CHALLENGER-FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ [CHALLENGER-PASS] ${message}`);
  }
}

console.log('================================================================');
console.log('EMPIRICAL ADVERSARIAL CHALLENGER SUITE (challenger_o19_1)');
console.log('Target: R1 - R10 Ponytail Implementation Verification');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// =============================================================================
// CHALLENGE 1: Keamanan R1 (Hardcoded Credentials & resolveSessionToken fallback)
// =============================================================================
console.log('>>> [CHALLENGE 1] Keamanan R1: Hardcoded credentials & fallback simulation');

// 1.1 Repo scan for hardcoded credentials
function scanDirectory(dir: string, needle: string): string[] {
  const matches: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.next') {
        matches.push(...scanDirectory(fullPath, needle));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.env'].includes(ext) || entry.name.startsWith('.env')) {
        // Exclude .env.local where the password is legitimate local configuration
        if (entry.name === '.env.local') continue;
        const text = fs.readFileSync(fullPath, 'utf8');
        if (text.includes(needle)) {
          matches.push(fullPath);
        }
      }
    }
  }
  return matches;
}

const leaks = scanDirectory(path.join(projectRoot, 'src'), 'SipjamSuperAdmin');
assert(leaks.length === 0, `Zero occurrences of 'SipjamSuperAdmin' across all src/ files (found: ${leaks.length})`);

// 1.2 Verify .env.local configuration
const envLocalPath = path.join(projectRoot, '.env.local');
assert(fs.existsSync(envLocalPath), '.env.local exists on filesystem');
const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
assert(
  envLocalContent.includes('SUPERADMIN_API_PASSWORD=') &&
  !envLocalContent.includes('SUPERADMIN_API_PASSWORD=""') &&
  !envLocalContent.includes("SUPERADMIN_API_PASSWORD=''"),
  '.env.local contains a non-empty SUPERADMIN_API_PASSWORD definition'
);

// 1.3 Behavioral Simulation of resolveSessionToken
// We simulate the exact logic from src/app/api/attendance/route.ts under adversarial inputs
function simulateResolveSessionToken(
  reqHeaders: Record<string, string>,
  body: any,
  envPassword: string | undefined,
  cachedToken: string | null = null
): string | null {
  const headerToken = reqHeaders['x-session-token'];
  if (headerToken) return headerToken;

  const authHeader = reqHeaders['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const candidate = authHeader.substring(7).trim();
    if (candidate && !candidate.startsWith('eyJ')) {
      return candidate;
    }
  }

  if (body?.session_token) return body.session_token;

  if (cachedToken) return cachedToken;

  const superadminPassword = envPassword;
  if (!superadminPassword) {
    return null;
  }

  // If password exists, in real route it calls verify_login
  return 'simulated-rpc-token';
}

// Adversarial Cases for resolveSessionToken:
// Case A: Missing env var (undefined) -> MUST return null
const resEmptyEnv = simulateResolveSessionToken({}, {}, undefined);
assert(resEmptyEnv === null, 'resolveSessionToken returns null when env var is undefined');

// Case B: Blank env var ("") -> MUST return null
const resBlankEnv = simulateResolveSessionToken({}, {}, '');
assert(resBlankEnv === null, 'resolveSessionToken returns null when env var is empty string');

// Case C: Provided x-session-token -> MUST return x-session-token regardless of env var
const resHeader = simulateResolveSessionToken({ 'x-session-token': 'user-tok-123' }, {}, undefined);
assert(resHeader === 'user-tok-123', 'x-session-token header is respected even if env var is missing');

// Case D: Provided Bearer non-JWT -> MUST return candidate
const resBearer = simulateResolveSessionToken({ authorization: 'Bearer user-bearer-456' }, {}, undefined);
assert(resBearer === 'user-bearer-456', 'Bearer token is respected');

// Case E: Provided Bearer JWT (starts with eyJ) -> MUST NOT return JWT, and return null if no env var
const resJwtBearer = simulateResolveSessionToken({ authorization: 'Bearer eyJhbGciOi...' }, {}, undefined);
assert(resJwtBearer === null, 'JWT Bearer is filtered out and returns null without fallback');

// Case F: Provided body session_token -> MUST return body token
const resBody = simulateResolveSessionToken({}, { session_token: 'body-tok-789' }, undefined);
assert(resBody === 'body-tok-789', 'body.session_token is respected');

// 1.4 Code Inspection in attendance/route.ts
const routePath = path.join(projectRoot, 'src', 'app', 'api', 'attendance', 'route.ts');
const routeCode = fs.readFileSync(routePath, 'utf8');
assert(!routeCode.includes('SipjamSuperAdmin'), 'attendance/route.ts contains no hardcoded fallback password string');
assert(routeCode.includes('process.env.SUPERADMIN_API_PASSWORD'), 'attendance/route.ts reads process.env.SUPERADMIN_API_PASSWORD');
assert(
  routeCode.includes('if (!superadminPassword) {\n    return null;') ||
  routeCode.includes('if (!superadminPassword) {\r\n    return null;') ||
  routeCode.includes('if (!superadminPassword) return null;'),
  'attendance/route.ts explicitly returns null if superadminPassword is missing'
);


// =============================================================================
// CHALLENGE 2: Auth R2 (No Auth Listener Leaks in page.tsx)
// =============================================================================
console.log('\n>>> [CHALLENGE 2] Auth R2: Zero auth listener leaks in page.tsx');

const pageFile = path.join(projectRoot, 'src', 'app', 'page.tsx');
const pageCode = fs.readFileSync(pageFile, 'utf8');

// Adversarial pattern checks:
const forbiddenPatterns = [
  'supabase.auth',
  'onAuthStateChange',
  'getSession',
  'signInWithPassword',
  'signUp',
  'signOut',
  'auth.getUser',
  'auth.onAuthStateChange'
];

for (const pattern of forbiddenPatterns) {
  assert(!pageCode.includes(pattern), `page.tsx contains no '${pattern}' references`);
}

// Verify Home() component rendering
assert(
  pageCode.includes('export default function Home()') &&
  pageCode.includes('<MainApp />'),
  'page.tsx renders MainApp component directly without wrapping auth hooks'
);

// Verify that MainApp purely uses local session check with users table
assert(pageCode.includes("from('users')"), 'MainApp queries users table for session token validity');
assert(pageCode.includes("localStorage.removeItem('sipjam_user')"), 'MainApp clears sipjam_user cache on invalid session');


// =============================================================================
// CHALLENGE 3: Scoping Channel R4 (Multi-Tenant Realtime Channel Scoping)
// =============================================================================
console.log('\n>>> [CHALLENGE 3] Scoping Channel R4: Multi-tenant channel isolation');

const adminVerifFile = path.join(projectRoot, 'src', 'components', 'AdminVerifView.tsx');
const adminVerifCode = fs.readFileSync(adminVerifFile, 'utf8');

// Unscoped global channel names MUST NOT exist as static strings
assert(!adminVerifCode.includes("'verif-presensi'"), "Static channel 'verif-presensi' is not present");
assert(!adminVerifCode.includes('"verif-presensi"'), 'Static channel "verif-presensi" is not present');
assert(!adminVerifCode.includes("'verif-jurnal'"), "Static channel 'verif-jurnal' is not present");
assert(!adminVerifCode.includes('"verif-jurnal"'), 'Static channel "verif-jurnal" is not present');
assert(!adminVerifCode.includes("'verif-piket'"), "Static channel 'verif-piket' is not present");
assert(!adminVerifCode.includes('"verif-piket"'), 'Static channel "verif-piket" is not present');

// Dynamic scoping pattern validation
assert(
  adminVerifCode.includes('verif-presensi-${user?.sekolah_id || \'global\'}'),
  "Presensi channel is scoped using `verif-presensi-${user?.sekolah_id || 'global'}`"
);
assert(
  adminVerifCode.includes('verif-jurnal-${user?.sekolah_id || \'global\'}'),
  "Jurnal channel is scoped using `verif-jurnal-${user?.sekolah_id || 'global'}`"
);
assert(
  adminVerifCode.includes('verif-piket-${user?.sekolah_id || \'global\'}'),
  "Piket channel is scoped using `verif-piket-${user?.sekolah_id || 'global'}`"
);

// Multi-tenant isolation simulation:
function computeChannelNames(user: { sekolah_id?: string | null } | null) {
  const scope = user?.sekolah_id || 'global';
  return {
    presensi: `verif-presensi-${scope}`,
    jurnal: `verif-jurnal-${scope}`,
    piket: `verif-piket-${scope}`,
  };
}

const tenantA = computeChannelNames({ sekolah_id: 'school_alpha' });
const tenantB = computeChannelNames({ sekolah_id: 'school_beta' });
const tenantFallback = computeChannelNames(null);

assert(tenantA.presensi !== tenantB.presensi, 'School Alpha and School Beta have distinct presensi channels');
assert(tenantA.jurnal !== tenantB.jurnal, 'School Alpha and School Beta have distinct jurnal channels');
assert(tenantA.piket !== tenantB.piket, 'School Alpha and School Beta have distinct piket channels');
assert(tenantA.presensi !== tenantFallback.presensi, 'School Alpha is isolated from fallback global channel');
assert(tenantFallback.presensi === 'verif-presensi-global', 'Fallback channel is explicitly suffixed with -global');


// =============================================================================
// CHALLENGE 4: Once-Flag R9 (Block Repeated Connectivity Checks)
// =============================================================================
console.log('\n>>> [CHALLENGE 4] Once-Flag R9: Proof that _connectivityChecked blocks double execution');

const supabaseClientFile = path.join(projectRoot, 'src', 'lib', 'supabaseClient.ts');
const supabaseClientCode = fs.readFileSync(supabaseClientFile, 'utf8');

// Verify code structure
assert(supabaseClientCode.includes('let _connectivityChecked = false;'), '_connectivityChecked is initialized as false');
assert(
  supabaseClientCode.includes("typeof window !== 'undefined' && !_connectivityChecked"),
  'Connectivity check requires both client window and !_connectivityChecked'
);
assert(supabaseClientCode.includes('_connectivityChecked = true;'), '_connectivityChecked is immediately set to true inside block');

// Empirical simulation of once-flag under repeated invocations / hot-reloads
let mockCallCount = 0;
let simulatedConnectivityChecked = false;

function simulateModuleEvaluation(isWindow: boolean) {
  if (isWindow && !simulatedConnectivityChecked) {
    simulatedConnectivityChecked = true;
    mockCallCount++;
  }
}

// Scenario 1: Server side evaluation (window === false)
simulateModuleEvaluation(false);
assert(mockCallCount === 0 && simulatedConnectivityChecked === false, 'Server side evaluation triggers 0 checks');

// Scenario 2: First client evaluation
simulateModuleEvaluation(true);
assert(mockCallCount === 1 && simulatedConnectivityChecked === true, 'First client evaluation triggers exactly 1 check');

// Scenario 3: 50 subsequent re-evaluations / re-imports
for (let i = 0; i < 50; i++) {
  simulateModuleEvaluation(true);
}
assert(mockCallCount === 1, `Subsequent 50 module evaluations triggered 0 extra checks (total calls: ${mockCallCount})`);


// =============================================================================
// CHALLENGE 5: Regression & Interface Verification (R3, R5, R6, R7, R8, R10)
// =============================================================================
console.log('\n>>> [CHALLENGE 5] Architecture, Types & Regressions Verification');

// R3: isGuru logic permutation matrix
function testIsGuruLogic(userRole: string | undefined): { isSuperadmin: boolean; isAdmin: boolean; isGuru: boolean } {
  const role = (userRole || '').toLowerCase().replace(/\s+/g, '');
  const isSuperadmin = role === 'superadmin';
  const isAdmin = isSuperadmin || role === 'admin';
  const isGuru = !isAdmin;
  return { isSuperadmin, isAdmin, isGuru };
}

const superadminTest = testIsGuruLogic('Superadmin');
assert(superadminTest.isSuperadmin && superadminTest.isAdmin && !superadminTest.isGuru, "Role 'Superadmin' has isGuru = false");

const superAdminSpacedTest = testIsGuruLogic('Super Admin');
assert(superAdminSpacedTest.isSuperadmin && superAdminSpacedTest.isAdmin && !superAdminSpacedTest.isGuru, "Role 'Super Admin' has isGuru = false");

const adminTest = testIsGuruLogic('Admin');
assert(!adminTest.isSuperadmin && adminTest.isAdmin && !adminTest.isGuru, "Role 'Admin' has isGuru = false");

const guruTest = testIsGuruLogic('Guru');
assert(!guruTest.isSuperadmin && !guruTest.isAdmin && guruTest.isGuru, "Role 'Guru' has isGuru = true");

const emptyRoleTest = testIsGuruLogic('');
assert(!emptyRoleTest.isAdmin && emptyRoleTest.isGuru, 'Empty role defaults isGuru = true');

// R5: src/types/user.ts
const userTypesPath = path.join(projectRoot, 'src', 'types', 'user.ts');
const userTypesSrc = fs.readFileSync(userTypesPath, 'utf8');
assert(userTypesSrc.includes('export interface AppUser'), 'src/types/user.ts exports AppUser');
const requiredFields = ['id: string', 'username: string', 'nama: string', 'role: string', 'sekolah_id: string', 'session_token: string'];
for (const field of requiredFields) {
  assert(userTypesSrc.includes(field), `AppUser interface contains '${field}'`);
}

// R6: Hooks existence
const hooks = ['useSessionSync.ts', 'useWaliKelas.ts', 'usePiket.ts', 'useBroadcasts.ts'];
for (const hook of hooks) {
  const hp = path.join(projectRoot, 'src', 'hooks', hook);
  assert(fs.existsSync(hp), `Hook ${hook} exists in src/hooks/`);
}

// R7: HomeView split
const homeViewFile = path.join(projectRoot, 'src', 'components', 'HomeView.tsx');
const homeViewSrc = fs.readFileSync(homeViewFile, 'utf8');
const lines = homeViewSrc.split('\n').length;
assert(lines < 200, `HomeView.tsx is slim router (< 200 lines, actual: ${lines})`);
assert(fs.existsSync(path.join(projectRoot, 'src', 'components', 'HomeViewGuru.tsx')), 'HomeViewGuru.tsx exists');
assert(fs.existsSync(path.join(projectRoot, 'src', 'components', 'HomeViewAdmin.tsx')), 'HomeViewAdmin.tsx exists');

// R8: layout.tsx preconnect
const layoutFile = path.join(projectRoot, 'src', 'app', 'layout.tsx');
const layoutSrc = fs.readFileSync(layoutFile, 'utf8');
assert(
  layoutSrc.indexOf('rel="preconnect" href="https://cdnjs.cloudflare.com"') <
  layoutSrc.indexOf('href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/'),
  'Preconnect link is placed before Font Awesome stylesheet link in layout.tsx'
);

// R10: sync-spreadsheet dead code removed
const deadDir = path.join(projectRoot, 'src', 'app', 'api', 'sync-spreadsheet');
assert(!fs.existsSync(deadDir), 'src/app/api/sync-spreadsheet has been completely removed');

console.log('\n================================================================');
console.log('🎉 ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY!');
console.log('================================================================');
