/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE: TATA USAHA RBAC & ISOLATION
 * File: tests/adversarial_tu_stress_challenger_1.test.ts
 *
 * Authored by: challenger_tu_1 (EMPIRICAL CHALLENGER - critic, specialist)
 *
 * Aggressively stress-tests:
 * 1. Role string permutations, edge casing, and strict menu isolation in getConsolidatedMenuItems.
 * 2. Route and Tab RBAC matrix in evaluateTabRBAC across all application views and all 9 master tabs.
 * 3. URL, route aliasing, and parameter tampering attacks against resolveCanonicalRoute & evaluateTabRBAC.
 * 4. PostgREST mutation guard security stress against table confusion, URL tampering, and non-permitted tables.
 * 5. Complete non-regression proof for existing roles (admin, guru, siswa, dinas, superadmin, kepsek).
 * ============================================================================
 */

import assert from 'node:assert';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  evaluateTabRBAC,
  VIEW_ALIASES
} from '../src/lib/navigation';
import {
  isAdminRole,
  checkMasterDataMutationGuard,
  isMasterDataEndpoint,
  MASTER_DATA_TABLES
} from '../src/lib/supabaseClient';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failureDetails: string[] = [];

function check(condition: boolean, code: string, message: string, extra?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ${GREEN}✔ [${code}] PASS:${RESET} ${message}`);
    if (extra) console.log(`    ${GRAY}↳ ${extra}${RESET}`);
  } else {
    failedChecks++;
    const errMsg = `✖ [${code}] FAIL: ${message}${extra ? ` (Detail: ${extra})` : ''}`;
    failureDetails.push(errMsg);
    console.error(`  ${RED}${errMsg}${RESET}`);
  }
}

async function runAdversarialStressHarness() {
  console.log(`\n${BOLD}${CYAN}================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🔥 ADVERSARIAL STRESS TEST HARNESS — ROLE TATA USAHA (TU) ISOLATION & RBAC${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================================${RESET}\n`);

  // ============================================================================
  // SUITE 1: Role String Permutations & Menu Isolation
  // ============================================================================
  console.log(`${BOLD}--- Suite 1: Role String Permutations & Strict Menu Isolation ---${RESET}`);

  const tuRolePermutations = [
    'tata_usaha',
    'tatausaha',
    'Tata Usaha',
    'TATA_USAHA',
    'tata-usaha',
    'TATA-USAHA',
    'tata usaha',
    'TATA USAHA',
    '  tata_usaha  ',
    '\ttata-usaha\n',
    'TaTa_UsAhA',
    'tata___usaha',
    'tata--usaha',
    'tata  usaha'
  ];

  const prohibitedMenuIds = [
    'view-dokumen',
    'view-admin-config',
    'view-admin-backup',
    'view-admin-verif',
    'view-guru-jurnal',
    'view-guru-presensi',
    'view-gradebook',
    'view-piket',
    'view-superadmin-overview',
    'view-superadmin-jaringan',
    'view-superadmin-dinas',
    'view-admin-rekap',
    'view-rekap-guru',
    'view-sistem-blok',
    'view-history',
    'view-guru-rekap-jurnal',
    'view-jurnal-kelas',
    'view-rapor'
  ];

  tuRolePermutations.forEach((perm, idx) => {
    const items = getConsolidatedMenuItems({ role: perm });
    const hasExactlyTwo = items.length === 2;
    const itemIds = items.map(i => i.id);
    const hasSiswa = itemIds.includes('view-data-siswa');
    const hasGuru = itemIds.includes('view-data-guru');
    const leaked = itemIds.filter(id => prohibitedMenuIds.includes(id));

    check(
      hasExactlyTwo && hasSiswa && hasGuru && leaked.length === 0,
      `S1.1.${idx + 1}`,
      `Role permutation "${perm.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}" receives strictly [view-data-siswa, view-data-guru]`,
      `Got items: [${itemIds.join(', ')}], Leaked: ${leaked.length}`
    );
  });

  // Negative & Boundary Role Strings (should NOT be classified as Tata Usaha)
  const nonTuPermutations = [
    'tata_usaha_admin',
    'admin_tata_usaha',
    'tata_usaha;--',
    'tata_usaha<script>',
    'tata',
    'usaha',
    '',
    '   ',
    'tata_usaha_superadmin'
  ];

  nonTuPermutations.forEach((perm, idx) => {
    const items = getConsolidatedMenuItems({ role: perm });
    const itemIds = items.map(i => i.id);
    const falselyClassifiedAsTu = items.length === 2 && itemIds.includes('view-data-siswa') && itemIds.includes('view-data-guru');
    check(
      !falselyClassifiedAsTu,
      `S1.2.${idx + 1}`,
      `Negative role string "${perm}" does NOT falsely trigger Tata Usaha menu isolation`,
      `Item count: ${items.length}, first item: ${items[0]?.id || 'none'}`
    );
  });

  // ============================================================================
  // SUITE 2: Route and Tab RBAC Isolation (evaluateTabRBAC)
  // ============================================================================
  console.log(`\n${BOLD}--- Suite 2: Route and Tab RBAC Exhaustive Matrix ---${RESET}`);

  const tuUser = { role: 'tata_usaha' };

  // 2.1: Prohibited Application Views for Tata Usaha
  const prohibitedViews = [
    { view: 'view-dokumen', name: 'Bank Dokumen / Persuratan' },
    { view: 'view-admin-config', name: 'Pengaturan Sistem' },
    { view: 'view-admin-backup', name: 'Cadangan Database' },
    { view: 'view-sistem-blok', name: 'Sistem Blok' },
    { view: 'view-admin-verif', name: 'Pusat Verifikasi' },
    { view: 'view-admin-rekap', name: 'Laporan & Analitik' },
    { view: 'view-rekap-guru', name: 'Rekap Presensi Guru' },
    { view: 'view-analitik', name: 'Analitik Kinerja' },
    { view: 'view-guru-jurnal', name: 'Jurnal Pembelajaran' },
    { view: 'view-guru-presensi', name: 'Presensi Guru' },
    { view: 'view-history', name: 'Riwayat Presensi' },
    { view: 'view-guru-rekap-jurnal', name: 'Rekap Jurnal Pribadi' },
    { view: 'view-jurnal-kelas', name: 'Jurnal Kelas' },
    { view: 'view-piket', name: 'Modul Piket' },
    { view: 'view-gradebook', name: 'Asesmen & Gradebook' },
    { view: 'view-rapor', name: 'Rapor Siswa' },
    { view: 'view-rekap-siswa', name: 'Monitoring Kesiswaan' },
    { view: 'view-ujian', name: 'Ujian Siswa' },
    { view: 'view-superadmin-overview', name: 'Superadmin Overview' },
    { view: 'view-superadmin-jaringan', name: 'Superadmin Jaringan Sekolah' },
    { view: 'view-superadmin-dinas', name: 'Superadmin Akun Dinas' },
    { view: 'view-dinas-overview', name: 'Dashboard Dinas Wilayah' }
  ];

  prohibitedViews.forEach(({ view, name }, idx) => {
    const result = evaluateTabRBAC(view, '', tuUser);
    check(
      result.allowed === false,
      `S2.1.${idx + 1}`,
      `evaluateTabRBAC strictly denies "${view}" (${name}) for Tata Usaha`,
      `allowed: ${result.allowed}, reason: ${result.reason || 'none'}`
    );
  });

  // 2.2: Master Tabs within view-admin-data (9 master tabs)
  const masterTabs = [
    { tab: 'Data_Siswa', expectedAllowed: true },
    { tab: 'Data_Guru', expectedAllowed: true },
    { tab: 'Data_Kelas', expectedAllowed: false },
    { tab: 'Data_Mapel', expectedAllowed: false },
    { tab: 'Jadwal_Pelajaran', expectedAllowed: false },
    { tab: 'Wali_Kelas', expectedAllowed: false },
    { tab: 'Pengguna', expectedAllowed: false },
    { tab: 'Kalender_Pendidikan', expectedAllowed: false },
    { tab: 'sistem_blok', expectedAllowed: false }
  ];

  masterTabs.forEach(({ tab, expectedAllowed }, idx) => {
    const res = evaluateTabRBAC('view-admin-data', tab, tuUser);
    check(
      res.allowed === expectedAllowed,
      `S2.2.${idx + 1}`,
      `Tab "${tab}" in view-admin-data has expectedAllowed=${expectedAllowed} for Tata Usaha`,
      `allowed: ${res.allowed}, fallback: ${res.fallbackTab || 'none'}`
    );
  });

  // 2.3: Lowercase & Singular Aliases for Master Tabs
  const tabAliases = [
    { tab: 'data_siswa', expectedAllowed: true },
    { tab: 'siswa', expectedAllowed: true },
    { tab: 'data_guru', expectedAllowed: true },
    { tab: 'guru', expectedAllowed: true },
    { tab: 'data_kelas', expectedAllowed: false },
    { tab: 'kelas', expectedAllowed: false },
    { tab: 'data_mapel', expectedAllowed: false },
    { tab: 'mapel', expectedAllowed: false },
    { tab: 'jadwal_pelajaran', expectedAllowed: false },
    { tab: 'wali_kelas', expectedAllowed: false },
    { tab: 'users', expectedAllowed: false },
    { tab: 'pengguna', expectedAllowed: false },
    { tab: 'kalender_pendidikan', expectedAllowed: false },
    { tab: 'blok', expectedAllowed: false }
  ];

  tabAliases.forEach(({ tab, expectedAllowed }, idx) => {
    const res = evaluateTabRBAC('view-admin-data', tab, tuUser);
    check(
      res.allowed === expectedAllowed,
      `S2.3.${idx + 1}`,
      `Tab alias "${tab}" in view-admin-data has expectedAllowed=${expectedAllowed} for Tata Usaha`,
      `allowed: ${res.allowed}`
    );
  });

  // 2.4: Direct Route Aliases Evaluation
  const routeAliases = [
    { route: 'view-data-siswa', expectedAllowed: true },
    { route: 'view-data-guru', expectedAllowed: true },
    { route: 'view-siswa', expectedAllowed: true },
    { route: 'view-guru', expectedAllowed: true },
    { route: 'view-admin-kelas', expectedAllowed: false },
    { route: 'view-kelas', expectedAllowed: false },
    { route: 'view-admin-pengguna', expectedAllowed: false },
    { route: 'view-pengguna', expectedAllowed: false },
    { route: 'view-admin-users', expectedAllowed: false },
    { route: 'view-sistem-blok', expectedAllowed: false },
    { route: 'view-admin-backup', expectedAllowed: false },
    { route: 'view-analitik', expectedAllowed: false },
    { route: 'view-rekap-guru', expectedAllowed: false }
  ];

  routeAliases.forEach(({ route, expectedAllowed }, idx) => {
    const res = evaluateTabRBAC(route, '', tuUser);
    check(
      res.allowed === expectedAllowed,
      `S2.4.${idx + 1}`,
      `Direct route alias "${route}" has expectedAllowed=${expectedAllowed} for Tata Usaha`,
      `allowed: ${res.allowed}`
    );
  });

  // ============================================================================
  // SUITE 3: URL & Parameter Tampering Stress-Testing
  // ============================================================================
  console.log(`\n${BOLD}--- Suite 3: URL, Aliasing & Parameter Tampering Attacks ---${RESET}`);

  // Attack 3.1: Path Traversal in tab parameter
  const traversalTabs = [
    'Data_Siswa/../Pengguna',
    '../../etc/passwd',
    'Data_Siswa/..',
    'Data_Siswa/Data_Kelas',
    'Data_Guru/../Pengguna'
  ];

  traversalTabs.forEach((tab, idx) => {
    const res = evaluateTabRBAC('view-admin-data', tab, tuUser);
    check(
      res.allowed === false,
      `S3.1.${idx + 1}`,
      `Path traversal in tab "${tab}" is strictly blocked for Tata Usaha`,
      `allowed: ${res.allowed}`
    );
  });

  // Attack 3.2: SQL & XSS Injection Tokens in tab parameter
  const injectionTabs = [
    "Data_Siswa; DROP TABLE users; --",
    "Data_Siswa' OR '1'='1",
    "<script>alert(1)</script>",
    "Data_Siswa\x00Pengguna",
    "Data_Siswa\nPengguna"
  ];

  injectionTabs.forEach((tab, idx) => {
    const res = evaluateTabRBAC('view-admin-data', tab, tuUser);
    check(
      res.allowed === false,
      `S3.2.${idx + 1}`,
      `Injection token in tab "${tab.replace(/\n/g, '\\n')}" is strictly blocked for Tata Usaha`,
      `allowed: ${res.allowed}`
    );
  });

  // Attack 3.3: Parameter Tampering on Route Aliases (Overriding allowed route with forbidden tab)
  const tamperingPermutations = [
    { route: 'view-data-siswa', tab: 'Pengguna', expectedAllowed: false },
    { route: 'view-data-siswa', tab: 'Data_Kelas', expectedAllowed: false },
    { route: 'view-data-guru', tab: 'Jadwal_Pelajaran', expectedAllowed: false },
    { route: 'view-data-guru', tab: 'sistem_blok', expectedAllowed: false },
    { route: 'view-data-siswa', tab: 'Data_Siswa', expectedAllowed: true },
    { route: 'view-data-guru', tab: 'Data_Guru', expectedAllowed: true }
  ];

  tamperingPermutations.forEach(({ route, tab, expectedAllowed }, idx) => {
    const res = evaluateTabRBAC(route, tab, tuUser);
    check(
      res.allowed === expectedAllowed,
      `S3.3.${idx + 1}`,
      `Tampered combination route="${route}" + tab="${tab}" -> expectedAllowed=${expectedAllowed}`,
      `allowed: ${res.allowed}`
    );
  });

  // Attack 3.4: resolveCanonicalRoute resilience on malformed inputs
  const malformedInputs = [
    null,
    undefined,
    '',
    '   ',
    '///',
    'view-admin-data/',
    'view-admin-data///',
    '/view-admin-data',
    '../view-admin-config',
    'view-admin-data/../view-admin-config'
  ];

  malformedInputs.forEach((input, idx) => {
    const res = resolveCanonicalRoute(input as any);
    check(
      typeof res === 'object' && typeof res.canonicalView === 'string',
      `S3.4.${idx + 1}`,
      `resolveCanonicalRoute safely handles malformed input ${JSON.stringify(input)}`,
      `Resolved canonicalView: "${res.canonicalView}"`
    );

    // If evaluated with evaluateTabRBAC for Tata Usaha:
    const rbac = evaluateTabRBAC(res.canonicalView, '', tuUser);
    if (res.canonicalView !== 'view-admin-data' && res.canonicalView !== 'view-home') {
      check(
        rbac.allowed === false,
        `S3.4.${idx + 1}.rbac`,
        `Malformed route "${res.canonicalView}" evaluates to allowed=false for Tata Usaha`,
        `allowed: ${rbac.allowed}`
      );
    }
  });

  // ============================================================================
  // SUITE 4: PostgREST Mutation Interception Security Stress
  // ============================================================================
  console.log(`\n${BOLD}--- Suite 4: PostgREST Mutation Interception Security Stress ---${RESET}`);

  // Test permitted mutation tables for TU (data_siswa, data_guru, siswa, guru)
  const permittedTuTables = ['data_siswa', 'siswa', 'data_guru', 'guru'];
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  permittedTuTables.forEach((table, tIdx) => {
    mutationMethods.forEach((method, mIdx) => {
      const url = `https://xyz.supabase.co/rest/v1/${table}?id=eq.123`;
      const guardRes = checkMasterDataMutationGuard(url, method, 'tata_usaha');
      check(
        guardRes === null,
        `S4.1.${tIdx}.${mIdx}`,
        `Mutation ${method} on permitted table "${table}" is allowed for Tata Usaha (returns null)`,
        `guardRes: ${guardRes ? 'Blocked (403)' : 'Allowed (null)'}`
      );
    });
  });

  // Test prohibited mutation tables for TU (all other 12 master tables in MASTER_DATA_TABLES)
  const prohibitedTuTables = [
    'data_kelas',
    'kelas',
    'guru_kelas',
    'data_mapel',
    'mapel',
    'mata_pelajaran',
    'guru_mapel',
    'jadwal_pelajaran',
    'jadwal_pembelajaran',
    'wali_kelas',
    'kalender_pendidikan',
    'sistem_blok'
  ];

  prohibitedTuTables.forEach((table, tIdx) => {
    const url = `https://xyz.supabase.co/rest/v1/${table}?id=eq.123`;
    const guardRes = checkMasterDataMutationGuard(url, 'POST', 'tata_usaha');
    check(
      guardRes !== null && guardRes.status === 403,
      `S4.2.${tIdx}`,
      `Mutation POST on prohibited table "${table}" is strictly blocked with HTTP 403 for Tata Usaha`,
      `Status: ${guardRes?.status}`
    );
  });

  // Substring Confusion Attack: Ensure 'guru_kelas' or 'guru_mapel' doesn't trick 'guru' regex
  const trickUrls = [
    '/rest/v1/guru_kelas',
    '/rest/v1/guru_mapel',
    '/rest/v1/public.guru_kelas',
    '/rest/v1/public.guru_mapel',
    'https://xyz.supabase.co/rest/v1/guru_kelas?id=eq.1',
    'https://xyz.supabase.co/rest/v1/guru_mapel?id=eq.1'
  ];

  trickUrls.forEach((trickUrl, idx) => {
    const res = checkMasterDataMutationGuard(trickUrl, 'POST', 'tata_usaha');
    check(
      res !== null && res.status === 403,
      `S4.3.${idx + 1}`,
      `Master data table "${trickUrl}" cannot be bypassed via substring and returns HTTP 403`,
      `Status: ${res?.status}`
    );
  });

  // Read (GET) operations on master data must remain allowed for Tata Usaha
  prohibitedTuTables.forEach((table, tIdx) => {
    const url = `https://xyz.supabase.co/rest/v1/${table}?select=*`;
    const res = checkMasterDataMutationGuard(url, 'GET', 'tata_usaha');
    check(
      res === null,
      `S4.4.${tIdx}`,
      `GET read on master table "${table}" is permitted for Tata Usaha (returns null)`,
      `res: ${res === null ? 'Allowed (null)' : 'Blocked'}`
    );
  });

  // ============================================================================
  // SUITE 5: Zero Regression on Existing Roles
  // ============================================================================
  console.log(`\n${BOLD}--- Suite 5: Zero Regression on Existing Roles (Admin, Guru, Siswa, Superadmin, Dinas, Kepsek) ---${RESET}`);

  // 5.1: Admin
  const adminMenu = getConsolidatedMenuItems({ role: 'admin' });
  const adminMenuIds = adminMenu.map(i => i.id);
  const expectedAdminMenus = [
    'view-home',
    'view-admin-verif',
    'view-piket',
    'view-admin-rekap',
    'view-rekap-siswa',
    'view-gradebook',
    'view-informasi',
    'view-admin-data',
    'view-admin-config'
  ];
  check(
    expectedAdminMenus.every(m => adminMenuIds.includes(m)) && adminMenu.length === 9,
    'S5.1.1',
    'Admin retains all 9 consolidated menu items intact',
    `Found: ${adminMenuIds.length} items`
  );

  const adminTabsOk = masterTabs.every(({ tab }) => {
    return evaluateTabRBAC('view-admin-data', tab, { role: 'admin' }).allowed === true;
  });
  check(
    adminTabsOk,
    'S5.1.2',
    'Admin retains unrestricted access to all 9 master tabs in view-admin-data',
    `All 9 tabs allowed: ${adminTabsOk}`
  );

  check(
    isAdminRole('admin') === true && isAdminRole('superadmin') === true,
    'S5.1.3',
    'isAdminRole returns true for admin and superadmin',
    `admin: ${isAdminRole('admin')}, superadmin: ${isAdminRole('superadmin')}`
  );

  // 5.2: Guru
  const guruMenu = getConsolidatedMenuItems({ role: 'guru' });
  const guruMenuIds = guruMenu.map(i => i.id);
  const expectedGuruMenus = [
    'view-home',
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-dokumen',
    'view-gradebook',
    'view-informasi'
  ];
  check(
    expectedGuruMenus.every(m => guruMenuIds.includes(m)),
    'S5.2.1',
    'Guru retains all base menu items including view-dokumen (Perangkat Pembelajaran)',
    `Items: [${guruMenuIds.join(', ')}]`
  );

  const guruDokumenRbac = evaluateTabRBAC('view-dokumen', '', { role: 'guru' });
  check(
    guruDokumenRbac.allowed === true,
    'S5.2.2',
    'evaluateTabRBAC continues to permit view-dokumen for Guru',
    `allowed: ${guruDokumenRbac.allowed}`
  );

  const guruMasterDataBlocked = evaluateTabRBAC('view-admin-data', 'Pengguna', { role: 'guru' });
  check(
    guruMasterDataBlocked.allowed === false,
    'S5.2.3',
    'evaluateTabRBAC continues to block master data for regular Guru',
    `allowed: ${guruMasterDataBlocked.allowed}`
  );

  // Guru with Wali Kelas
  const waliMenu = getConsolidatedMenuItems({ role: 'guru', isWaliKelas: true });
  check(
    waliMenu.some(i => i.id === 'view-rekap-siswa'),
    'S5.2.4',
    'Wali Kelas receives view-rekap-siswa in menu',
    `Wali menu count: ${waliMenu.length}`
  );
  const waliSupervisi = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'guru', isWaliKelas: true });
  check(
    waliSupervisi.allowed === true,
    'S5.2.5',
    'Wali Kelas is allowed to access supervisi-kelas tab in view-guru-jurnal',
    `allowed: ${waliSupervisi.allowed}`
  );

  // Guru with Piket Hari Ini
  const piketMenu = getConsolidatedMenuItems({ role: 'guru', isPiketHariIni: true });
  check(
    piketMenu.some(i => i.id === 'view-piket'),
    'S5.2.6',
    'Guru on piket duty receives view-piket in menu',
    `Piket menu count: ${piketMenu.length}`
  );

  // 5.3: Siswa
  const siswaMenu = getConsolidatedMenuItems({ role: 'siswa' });
  const siswaMenuIds = siswaMenu.map(i => i.id);
  check(
    siswaMenu.length === 2 && siswaMenuIds.includes('view-ujian') && siswaMenuIds.includes('view-informasi'),
    'S5.3.1',
    'Siswa retains strictly 2 menu items: view-ujian and view-informasi',
    `Items: [${siswaMenuIds.join(', ')}]`
  );
  const siswaDokumen = evaluateTabRBAC('view-dokumen', '', { role: 'siswa' });
  const siswaJurnal = evaluateTabRBAC('view-guru-jurnal', '', { role: 'siswa' });
  const siswaMaster = evaluateTabRBAC('view-admin-data', 'Data_Siswa', { role: 'siswa' });
  check(
    siswaDokumen.allowed === false && siswaJurnal.allowed === false && siswaMaster.allowed === false,
    'S5.3.2',
    'Siswa is strictly blocked from teacher and admin views',
    `Dokumen: ${siswaDokumen.allowed}, Jurnal: ${siswaJurnal.allowed}, Master: ${siswaMaster.allowed}`
  );

  // 5.4: Superadmin
  const superMenuRoot = getConsolidatedMenuItems({ role: 'superadmin' });
  check(
    superMenuRoot.length === 3 &&
    superMenuRoot.some(i => i.id === 'view-superadmin-overview') &&
    superMenuRoot.some(i => i.id === 'view-superadmin-jaringan') &&
    superMenuRoot.some(i => i.id === 'view-superadmin-dinas'),
    'S5.4.1',
    'Superadmin in root mode retains 3 platform overview menu items',
    `Items: ${superMenuRoot.map(i => i.id).join(', ')}`
  );

  const superMenuSchool = getConsolidatedMenuItems({
    role: 'superadmin',
    activeTargetSchool: { id: 'sch-1', nama: 'Target School' }
  });
  check(
    superMenuSchool.length === 5 &&
    superMenuSchool.some(i => i.id === 'view-admin-data') &&
    superMenuSchool.some(i => i.id === 'view-admin-config'),
    'S5.4.2',
    'Superadmin with activeTargetSchool switches to 5 school management menu items',
    `Items: ${superMenuSchool.map(i => i.id).join(', ')}`
  );

  // 5.5: Dinas Pendidikan
  const dinasMenu = getConsolidatedMenuItems({ role: 'dinas_pendidikan' });
  check(
    dinasMenu.length === 1 && dinasMenu[0].id === 'view-dinas-overview',
    'S5.5.1',
    'Dinas Pendidikan without target school has Dashboard Wilayah',
    `Menu count: ${dinasMenu.length}`
  );
  const dinasSatelitMenu = getConsolidatedMenuItems({
    role: 'dinas_pendidikan',
    activeTargetSchool: { id: 'sch-1', nama: 'Satelit School' }
  });
  check(
    dinasSatelitMenu.length === 4 &&
    dinasSatelitMenu.some(i => i.id === 'view-admin-rekap') &&
    dinasSatelitMenu.some(i => i.id === 'view-jurnal-kelas'),
    'S5.5.2',
    'Dinas Pendidikan with target school receives 4 satellite overview items',
    `Items: ${dinasSatelitMenu.map(i => i.id).join(', ')}`
  );

  // 5.6: Kepala Sekolah
  const kepsekMenu = getConsolidatedMenuItems({ role: 'guru', isKepalaSekolah: true });
  const kepsekMenuIds = kepsekMenu.map(i => i.id);
  const expectedKepsekMenus = [
    'view-home',
    'view-admin-verif',
    'view-admin-rekap',
    'view-rekap-siswa',
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-informasi'
  ];
  check(
    expectedKepsekMenus.every(m => kepsekMenuIds.includes(m)) && kepsekMenu.length === 7,
    'S5.6.1',
    'Kepala Sekolah retains all 7 executive supervision menu items',
    `Items: [${kepsekMenuIds.join(', ')}]`
  );

  console.log(`\n${BOLD}${CYAN}================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📊 ADVERSARIAL STRESS TEST SUMMARY${RESET}`);
  console.log(`${BOLD}TOTAL CHECKS  :${RESET} ${totalChecks}`);
  console.log(`${BOLD}${GREEN}PASSED CHECKS :${RESET} ${passedChecks}`);
  console.log(`${BOLD}${failedChecks > 0 ? RED : GREEN}FAILED CHECKS :${RESET} ${failedChecks}`);
  console.log(`${BOLD}${CYAN}================================================================================${RESET}\n`);

  if (failedChecks > 0) {
    console.error(`${BOLD}${RED}🚨 ADVERSARIAL CHALLENGE IDENTIFIED VULNERABILITIES / FAILURES:${RESET}`);
    failureDetails.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log(`${BOLD}${GREEN}🎉 ALL ${totalChecks} ADVERSARIAL STRESS CHECKS PASSED WITH ZERO FAILURES!${RESET}\n`);
    process.exit(0);
  }
}

void runAdversarialStressHarness();
