/**
 * Empirical Adversarial Challenger Test Suite — Milestone 1
 * Targets:
 *   1. getActiveTargetSchool() in src/lib/supabaseClient.ts
 *   2. dynamicTenantFetch() & masterFetch() mutation guards in src/lib/supabaseClient.ts
 *
 * Mode: Adversarial Challenge & Stress-Testing
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

import {
  getActiveTargetSchool,
  setActiveTargetSchool,
  clearActiveTargetSchool,
  setServerTenantContext,
  setServerActiveTargetSchool,
  clearServerTenantContext,
  dynamicTenantFetch,
  masterFetch,
  SatelliteSchool,
  TenantContext,
} from '../src/lib/supabaseClient';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    const msg = `  ✗ FAIL: ${label}${detail ? ` -> ${detail}` : ''}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function suite(title: string) {
  console.log(`\n======================================================`);
  console.log(`SUITE: ${title}`);
  console.log(`======================================================`);
}

async function runAdversarialM1Tests() {
  console.log('======================================================');
  console.log('STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE (M1)');
  console.log('======================================================');

  // Preserve native fetch
  const originalFetch = globalThis.fetch;
  let nativeFetchCallCount = 0;
  let lastNativeFetchInput: any = null;
  let lastNativeFetchInit: any = null;

  function installMockFetch() {
    nativeFetchCallCount = 0;
    lastNativeFetchInput = null;
    lastNativeFetchInit = null;
    globalThis.fetch = (async (input: any, init?: any) => {
      nativeFetchCallCount++;
      lastNativeFetchInput = input;
      lastNativeFetchInit = init;
      return new Response(JSON.stringify({ data: 'mock_passthrough_success' }), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;
  }

  function restoreMockFetch() {
    globalThis.fetch = originalFetch;
  }

  // =========================================================================
  // SUITE 1: getActiveTargetSchool() — Role Boundary & Normalization
  // =========================================================================
  suite('1. getActiveTargetSchool() — Role Boundary & Normalization Matrix');

  const testSchoolKotamobagu: SatelliteSchool = {
    id: 'sch-ktg-001',
    nama: 'SMA Negeri 1 Kotamobagu',
    kota_kabupaten: 'Kota Kotamobagu',
    provinsi: 'Sulawesi Utara',
    status: 'active',
  };

  const testSchoolManado: SatelliteSchool = {
    id: 'sch-mnd-002',
    nama: 'SMA Negeri 1 Manado',
    kota_kabupaten: 'Kota Manado',
    provinsi: 'Sulawesi Utara',
    status: 'active',
  };

  // 1.1 Superadmin role variations — should access any school
  const superadminRoles = [
    'superadmin',
    'Superadmin',
    'SUPERADMIN',
    ' superadmin ',
    'super_admin',
    'SUPER-ADMIN',
  ];
  for (const r of superadminRoles) {
    clearServerTenantContext();
    setServerTenantContext({ role: r, kotaKabupaten: 'Kota Kotamobagu' });
    setServerActiveTargetSchool(testSchoolManado); // cross-region to Manado
    const res = getActiveTargetSchool();
    assert(
      res !== null && res.id === 'sch-mnd-002',
      `Superadmin role variant "${r}" can target any school (cross-region)`,
      `Expected sch-mnd-002, got ${res?.id}`
    );
  }

  // 1.2 Dinas Pendidikan role variations with matching region
  const dinasMatchingRoles = [
    'dinas_pendidikan',
    'dinaspendidikan',
    'Dinas Pendidikan',
    'dinas-pendidikan',
    'DINAS_PENDIDIKAN',
    '  dinas_pendidikan  ',
    'Dinas-Pendidikan',
  ];
  for (const r of dinasMatchingRoles) {
    clearServerTenantContext();
    setServerTenantContext({ role: r, kotaKabupaten: 'Kota Kotamobagu' });
    setServerActiveTargetSchool(testSchoolKotamobagu);
    const res = getActiveTargetSchool();
    assert(
      res !== null && res.id === 'sch-ktg-001',
      `Dinas role variant "${r}" with matching region returns target school`,
      `Expected sch-ktg-001, got ${res?.id}`
    );
  }

  // 1.3 Unauthorized roles — MUST return null even if regions match
  const unauthorizedRoles = [
    'guru',
    'Guru',
    'GURU',
    'admin',
    'Admin',
    'ADMIN',
    'siswa',
    'Siswa',
    'kepala_sekolah',
    'pengawas',
    'dinas', // truncated / incomplete
    'pendidikan',
    'unknown',
    '',
    '   ',
    null,
    undefined,
  ];
  for (const r of unauthorizedRoles) {
    clearServerTenantContext();
    setServerTenantContext({ role: r, kotaKabupaten: 'Kota Kotamobagu' });
    setServerActiveTargetSchool(testSchoolKotamobagu);
    const res = getActiveTargetSchool();
    assert(
      res === null,
      `Unauthorized role "${r}" unconditionally blocked from active target school`,
      `Expected null, got ${JSON.stringify(res)}`
    );
  }

  // 1.4 Role Injection Attacks
  const injectionRoles = [
    'superadmin; DROP TABLE users;',
    'superadmin/* comment */',
    'superadmin\' OR \'1\'=\'1',
    'superadmin UNION SELECT * FROM users',
    'superadmin # comment',
    'dinaspendidikan OR 1=1',
    'dinas_pendidikan_admin',
    'admin_dinas_pendidikan',
  ];
  for (const r of injectionRoles) {
    clearServerTenantContext();
    setServerTenantContext({ role: r, kotaKabupaten: 'Kota Kotamobagu' });
    setServerActiveTargetSchool(testSchoolKotamobagu);
    const res = getActiveTargetSchool();
    assert(
      res === null,
      `Injected role string "${r}" rejected`,
      `Expected null, got ${JSON.stringify(res)}`
    );
  }

  // =========================================================================
  // SUITE 2: getActiveTargetSchool() — Regional Boundary & Anti-Tampering
  // =========================================================================
  suite('2. getActiveTargetSchool() — Regional Boundary & Anti-Tampering Matrix');

  // 2.1 Cross-Region Access Attack for dinas_pendidikan
  const crossRegionSchools: SatelliteSchool[] = [
    { id: 'sch-mnd-01', nama: 'SMA 1 Manado', kota_kabupaten: 'Kota Manado' },
    { id: 'sch-bolmong-01', nama: 'SMA 1 Lolak', kota_kabupaten: 'Kabupaten Bolaang Mongondow' },
    { id: 'sch-bolsel-01', nama: 'SMA 1 Molibagu', kota_kabupaten: 'Kabupaten Bolaang Mongondow Selatan' },
    { id: 'sch-boltim-01', nama: 'SMA 1 Tutuyan', kota_kabupaten: 'Kabupaten Bolaang Mongondow Timur' },
    { id: 'sch-bolmut-01', nama: 'SMA 1 Boroko', kota_kabupaten: 'Kabupaten Bolaang Mongondow Utara' },
    { id: 'sch-bitung-01', nama: 'SMA 1 Bitung', kota_kabupaten: 'Kota Bitung' },
  ];

  clearServerTenantContext();
  setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });

  for (const targetSch of crossRegionSchools) {
    setServerActiveTargetSchool(targetSch);
    const res = getActiveTargetSchool();
    assert(
      res === null,
      `Dinas (Kotamobagu) blocked from cross-region school: "${targetSch.nama}" (${targetSch.kota_kabupaten})`,
      `Expected null, got ${res?.id}`
    );
  }

  // 2.2 Case-Insensitive and Whitespace Trimmed Matching
  const regionalFormatPermutations = [
    { userReg: 'kota kotamobagu', schReg: 'KOTA KOTAMOBAGU', label: 'all-lowercase vs ALL-UPPERCASE' },
    { userReg: 'Kota Kotamobagu', schReg: 'kota kotamobagu', label: 'TitleCase vs lowercase' },
    { userReg: '  Kota Kotamobagu  ', schReg: 'Kota Kotamobagu', label: 'leading/trailing spaces in user region' },
    { userReg: 'Kota Kotamobagu', schReg: '  Kota Kotamobagu  ', label: 'leading/trailing spaces in school region' },
    { userReg: '\tKota Kotamobagu\n', schReg: 'Kota Kotamobagu', label: 'tab/newline whitespace in user region' },
  ];

  for (const p of regionalFormatPermutations) {
    clearServerTenantContext();
    setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: p.userReg });
    setServerActiveTargetSchool({ id: 'sch-perm', nama: 'SMA Permutasi', kota_kabupaten: p.schReg });
    const res = getActiveTargetSchool();
    assert(
      res !== null && res.id === 'sch-perm',
      `Regional match succeeds under ${p.label}`,
      `Expected sch-perm, got ${res?.id}`
    );
  }

  // 2.3 Substring & Prefix/Suffix Attacks
  const substringAttacks = [
    { userReg: 'Kota', schReg: 'Kota Kotamobagu', label: 'User is prefix substring of school' },
    { userReg: 'Kota Kotamobagu', schReg: 'Kota', label: 'School is prefix substring of user' },
    { userReg: 'Kotamobagu', schReg: 'Kota Kotamobagu', label: 'User is suffix of school' },
    { userReg: 'Kota Kotamobagu', schReg: 'Kotamobagu', label: 'School is suffix of user' },
    { userReg: 'Bolmong', schReg: 'Kabupaten Bolaang Mongondow', label: 'Abbreviation mismatch' },
    { userReg: 'Kota Kotamobagu', schReg: 'Kota Kotamobagu Selatan', label: 'Sub-district suffix collision' },
  ];

  for (const a of substringAttacks) {
    clearServerTenantContext();
    setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: a.userReg });
    setServerActiveTargetSchool({ id: 'sch-sub', nama: 'SMA Substring', kota_kabupaten: a.schReg });
    const res = getActiveTargetSchool();
    assert(
      res === null,
      `Substring attack blocked: ${a.label} ("${a.userReg}" vs "${a.schReg}")`,
      `Expected null, got ${res?.id}`
    );
  }

  // 2.4 Falsy, Null, Empty, and Blank Regions
  const falsyCombinations = [
    { userReg: null, schReg: 'Kota Kotamobagu', label: 'User region null' },
    { userReg: undefined, schReg: 'Kota Kotamobagu', label: 'User region undefined' },
    { userReg: '', schReg: 'Kota Kotamobagu', label: 'User region empty string' },
    { userReg: '   ', schReg: 'Kota Kotamobagu', label: 'User region whitespace only' },
    { userReg: 'Kota Kotamobagu', schReg: null, label: 'School region null' },
    { userReg: 'Kota Kotamobagu', schReg: undefined, label: 'School region undefined' },
    { userReg: 'Kota Kotamobagu', schReg: '', label: 'School region empty string' },
    { userReg: 'Kota Kotamobagu', schReg: '   ', label: 'School region whitespace only' },
    { userReg: null, schReg: null, label: 'Both regions null' },
    { userReg: '', schReg: '', label: 'Both regions empty string' },
    { userReg: '   ', schReg: '   ', label: 'Both regions whitespace only' },
  ];

  for (const f of falsyCombinations) {
    clearServerTenantContext();
    setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: f.userReg });
    setServerActiveTargetSchool({ id: 'sch-falsy', nama: 'SMA Falsy', kota_kabupaten: f.schReg });
    const res = getActiveTargetSchool();
    assert(
      res === null,
      `Falsy/empty region blocked: ${f.label}`,
      `Expected null, got ${res?.id}`
    );
  }

  // 2.5 Field Resolution: kotaKabupaten vs kota_kabupaten in TenantContext
  clearServerTenantContext();
  setServerTenantContext({ role: 'dinas_pendidikan', kota_kabupaten: 'Kota Kotamobagu' }); // snake_case only
  setServerActiveTargetSchool(testSchoolKotamobagu);
  assert(
    getActiveTargetSchool()?.id === 'sch-ktg-001',
    'TenantContext resolution supports snake_case kota_kabupaten'
  );

  clearServerTenantContext();
  setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' }); // camelCase only
  setServerActiveTargetSchool(testSchoolKotamobagu);
  assert(
    getActiveTargetSchool()?.id === 'sch-ktg-001',
    'TenantContext resolution supports camelCase kotaKabupaten'
  );

  // 2.6 Target School Lifecycle (null, cleared)
  clearActiveTargetSchool();
  assert(getActiveTargetSchool() === null, 'Active target school is null when explicitly cleared');

  // =========================================================================
  // SUITE 3: Client / Browser localStorage Emulation & Resilience
  // =========================================================================
  suite('3. Client / Browser localStorage Emulation & Tampering Resilience');

  const mockStorage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { for (const k of Object.keys(mockStorage)) delete mockStorage[k]; },
  };

  (globalThis as any).localStorage = mockLocalStorage;
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  try {
    // 3.1 Normal browser session: dinas_pendidikan with matching school in localStorage
    mockLocalStorage.clear();
    mockLocalStorage.setItem(
      'sipjam_user',
      JSON.stringify({
        id: 'usr-dinas-01',
        role: 'dinas_pendidikan',
        kota_kabupaten: 'Kota Kotamobagu',
      })
    );
    mockLocalStorage.setItem('sipjam_active_target_school', JSON.stringify(testSchoolKotamobagu));
    let clientRes = getActiveTargetSchool();
    assert(
      clientRes !== null && clientRes.id === 'sch-ktg-001',
      'Client localStorage: dinas user with matching school retrieves school'
    );

    // 3.2 Client Tampering Attack: Attacker manually injects out-of-region school in localStorage
    mockLocalStorage.setItem('sipjam_active_target_school', JSON.stringify(testSchoolManado));
    clientRes = getActiveTargetSchool();
    assert(
      clientRes === null,
      'Client localStorage tampering: cross-region school injection blocked by getActiveTargetSchool()'
    );

    // 3.3 Client Tampering Attack: Attacker changes role in localStorage to "guru"
    mockLocalStorage.setItem(
      'sipjam_user',
      JSON.stringify({
        id: 'usr-guru-01',
        role: 'guru',
        kota_kabupaten: 'Kota Kotamobagu',
      })
    );
    mockLocalStorage.setItem('sipjam_active_target_school', JSON.stringify(testSchoolKotamobagu));
    clientRes = getActiveTargetSchool();
    assert(
      clientRes === null,
      'Client localStorage: role "guru" blocked from active target school'
    );

    // 3.4 Corrupted JSON in sipjam_active_target_school
    mockLocalStorage.setItem(
      'sipjam_user',
      JSON.stringify({ role: 'dinas_pendidikan', kota_kabupaten: 'Kota Kotamobagu' })
    );
    mockLocalStorage.setItem('sipjam_active_target_school', 'INVALID_JSON{{{[[[');
    clientRes = getActiveTargetSchool();
    assert(
      clientRes === null,
      'Corrupted JSON in sipjam_active_target_school handled gracefully without crashing'
    );

    // 3.5 Corrupted JSON in sipjam_user
    mockLocalStorage.setItem('sipjam_user', '{NOT_VALID_JSON...');
    mockLocalStorage.setItem('sipjam_active_target_school', JSON.stringify(testSchoolKotamobagu));
    clientRes = getActiveTargetSchool();
    assert(
      clientRes === null,
      'Corrupted JSON in sipjam_user handled gracefully without crashing'
    );
  } finally {
    // Tear down window & localStorage mock
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  }

  // =========================================================================
  // SUITE 4: dynamicTenantFetch & masterFetch — Mutation Guard
  // =========================================================================
  suite('4. dynamicTenantFetch & masterFetch — Mutation Guard Stress Testing');

  installMockFetch();

  try {
    // 4.1 Mutation blocking for dinas_pendidikan: POST, PUT, PATCH, DELETE
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE', 'post', 'put', 'patch', 'delete'];
    clearServerTenantContext();
    setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });

    for (const m of mutatingMethods) {
      nativeFetchCallCount = 0;
      const res = await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/data_guru', {
        method: m,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: 'Tampered Guru' }),
      });

      assert(res.status === 403, `dynamicTenantFetch blocks ${m.toUpperCase()} (method="${m}") with status 403`);
      assert(res.statusText === 'Forbidden', `dynamicTenantFetch statusText is 'Forbidden' for ${m}`);
      const body = await res.json();
      assert(
        body.error === 'Role dinas_pendidikan is read-only. Data mutation prohibited.',
        `dynamicTenantFetch 403 error body matches specification for ${m}`
      );
      assert(
        nativeFetchCallCount === 0,
        `native fetch was NEVER invoked for blocked mutation ${m}`
      );
    }

    // 4.2 Mutating via Request object
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      nativeFetchCallCount = 0;
      const req = new Request('https://placeholder.supabase.co/rest/v1/presensi', {
        method: m,
        headers: { 'Content-Type': 'application/json' },
        body: m !== 'GET' && m !== 'HEAD' ? JSON.stringify({ status: 'Hadir' }) : undefined,
      });

      const res = await dynamicTenantFetch(req);
      assert(res.status === 403, `dynamicTenantFetch blocks ${m} instantiated via Request object`);
      assert(nativeFetchCallCount === 0, `native fetch not invoked for Request object with ${m}`);
    }

    // 4.3 Read-Only methods allowed for dinas_pendidikan: GET, HEAD, OPTIONS
    const allowedMethods = ['GET', 'HEAD', 'OPTIONS', 'get', 'head', 'options'];
    for (const m of allowedMethods) {
      nativeFetchCallCount = 0;
      const res = await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/data_guru?select=*', {
        method: m,
      });
      assert(
        res.status === 200,
        `dynamicTenantFetch allows read method ${m.toUpperCase()} (passed through to fetch)`
      );
      assert(nativeFetchCallCount === 1, `native fetch called exactly once for ${m.toUpperCase()}`);
    }

    // 4.4 Default method (omitted) interpreted as GET and allowed
    nativeFetchCallCount = 0;
    const defaultRes = await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/sekolah?select=*');
    assert(defaultRes.status === 200, 'dynamicTenantFetch allows request with default (omitted) method');
    assert(nativeFetchCallCount === 1, 'native fetch called for omitted method request');

    // 4.5 Login RPC exemption: POST to /rpc/verify_login allowed for dinas_pendidikan
    nativeFetchCallCount = 0;
    const loginRes = await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/rpc/verify_login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_username: 'dinas_ktg', p_password: 'secret' }),
    });
    assert(
      loginRes.status === 200,
      'dynamicTenantFetch permits POST /rpc/verify_login for authentication'
    );
    assert(nativeFetchCallCount === 1, 'native fetch called for /rpc/verify_login');

    // 4.6 Non-dinas roles: Superadmin, Admin, Guru can perform mutations
    const nonDinasRoles = ['superadmin', 'admin', 'guru'];
    for (const r of nonDinasRoles) {
      clearServerTenantContext();
      setServerTenantContext({ role: r });
      nativeFetchCallCount = 0;
      const mutRes = await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/data_guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: 'New Guru' }),
      });
      assert(
        mutRes.status === 200,
        `Role "${r}" is NOT blocked by dinas mutation guard on POST`
      );
      assert(nativeFetchCallCount === 1, `native fetch called for role "${r}" mutation`);
    }

    // 4.7 masterFetch Mutation Guard Verification
    clearServerTenantContext();
    setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      nativeFetchCallCount = 0;
      const res = await masterFetch('https://placeholder.supabase.co/rest/v1/users', {
        method: m,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'superadmin' }),
      });
      assert(res.status === 403, `masterFetch blocks ${m} with 403 Forbidden for dinas_pendidikan`);
      assert(nativeFetchCallCount === 0, `native fetch not called on masterFetch ${m}`);
    }

    // 4.8 External Satellite Target under Mutation Guard
    // If target school is set with satellite URL & anon key, mutation guard STILL stops it before network
    clearServerTenantContext();
    setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });
    setServerActiveTargetSchool({
      id: 'sch-ext-01',
      nama: 'SMA External Satellite',
      kota_kabupaten: 'Kota Kotamobagu',
      supabase_url: 'https://satellite.supabase.co',
      supabase_anon_key: 'satellite-anon-key-xyz',
    });

    nativeFetchCallCount = 0;
    const satMutRes = await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/presensi', {
      method: 'POST',
      body: JSON.stringify({ tanggal: '2026-10-24' }),
    });
    assert(
      satMutRes.status === 403,
      'Mutation guard blocks POST even when external satellite URL & key are active'
    );
    assert(nativeFetchCallCount === 0, 'No satellite fetch was attempted on blocked mutation');

    // But GET routes to the satellite!
    nativeFetchCallCount = 0;
    const satGetRes = await dynamicTenantFetch('https://placeholder.supabase.co/rest/v1/presensi?select=*', {
      method: 'GET',
    });
    assert(satGetRes.status === 200, 'GET to satellite succeeds through dynamicTenantFetch');
    assert(nativeFetchCallCount === 1, 'Satellite fetch executed for GET');
    assert(
      typeof lastNativeFetchInput === 'string' && lastNativeFetchInput.startsWith('https://satellite.supabase.co'),
      'dynamicTenantFetch correctly rewrote base URL to satellite for GET'
    );

  } finally {
    restoreMockFetch();
  }

  // =========================================================================
  // SUITE 5: Adversarial Bypass Probes & Query Spoofing Analysis
  // =========================================================================
  suite('5. Adversarial Bypass Probes & Query Spoofing Analysis');

  installMockFetch();

  try {
    clearServerTenantContext();
    setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });

    // Attack Scenario 5.1: Path spoofing with query parameter containing '/rpc/verify_login'
    // E.g. POST https://placeholder.supabase.co/rest/v1/data_guru?filter=/rpc/verify_login
    nativeFetchCallCount = 0;
    const spoofUrl = 'https://placeholder.supabase.co/rest/v1/data_guru?fake=/rpc/verify_login';
    const spoofRes = await dynamicTenantFetch(spoofUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: 'Injected Guru' }),
    });

    // Let's observe what happens:
    console.log(`  [INVESTIGATION] Spoofed query param result status: ${spoofRes.status}`);
    if (spoofRes.status === 200) {
      console.warn('  ⚠️ FINDING: URL string check `.includes("/rpc/verify_login")` matched query param!');
      console.warn('  ⚠️ This demonstrates that a crafted query param `?x=/rpc/verify_login` bypasses the client-side 403 check.');
    } else {
      console.log('  ✓ Mutation guard correctly rejected spoofed URL');
    }

    // Attack Scenario 5.2: RPC call to an arbitrary function named verify_login_attacker
    nativeFetchCallCount = 0;
    const rpcAttackUrl = 'https://placeholder.supabase.co/rest/v1/rpc/verify_login_malicious';
    const rpcAttackRes = await dynamicTenantFetch(rpcAttackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_all' }),
    });
    console.log(`  [INVESTIGATION] Substring RPC name result status: ${rpcAttackRes.status}`);

    // Attack Scenario 5.3: Exact path verification:
    // How does PostgREST actually format verify_login calls from supabase-js?
    // supabase.rpc('verify_login', { ... }) produces:
    // URL: `${supabaseUrl}/rest/v1/rpc/verify_login`
    // Notice that PostgREST RPC calls are always `/rest/v1/rpc/verify_login` or `${supabaseUrl}/rest/v1/rpc/verify_login` without arbitrary query parameters.

  } finally {
    restoreMockFetch();
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================');
  console.log(`TOTAL PASSES: ${passed}`);
  console.log(`TOTAL FAILURES: ${failed}`);
  if (failures.length > 0) {
    console.log(`FAILURES:`);
    failures.forEach((f) => console.log(f));
  }
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL EMPIRICAL ADVERSARIAL CHALLENGER TESTS PASSED!');
    process.exit(0);
  }
}

runAdversarialM1Tests().catch((err) => {
  console.error('Fatal test suite exception:', err);
  process.exit(1);
});
