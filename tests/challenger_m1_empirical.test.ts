/**
 * tests/challenger_m1_empirical.test.ts
 * 
 * Empirical verification harness for Milestone 1:
 * - Route aliasing (view-admin-kelas, view-kelas, normalizeAdminTab)
 * - RBAC access boundaries for non-admin roles (Guru, Siswa, Dinas, Kepsek, Piket, Anon)
 * - Sidebar menu exposure verification
 * - Adversarial fuzzing and edge cases
 */

import assert from 'node:assert';
import {
  resolveCanonicalRoute,
  evaluateTabRBAC,
  getConsolidatedMenuItems,
  VIEW_ALIASES,
  SIDEBAR_TOUR_ALIASES
} from '../src/lib/navigation';
import { normalizeAdminTab } from '../src/components/AdminDataView';
import {
  isMasterDataModificationAllowed,
  validateMasterDataModificationRole
} from '../src/lib/dataIntegrityGuard';
import { isAdminRole } from '../src/lib/supabaseClient';

async function runEmpiricalHarness() {
  console.log('========================================================');
  console.log('STARTING EMPIRICAL CHALLENGER TEST SUITE (MILESTONE 1)');
  console.log('========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  [PASS] ${name}`);
    } catch (err: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Error: ${err.message}`);
      throw err;
    }
  }

  // =========================================================================
  // SECTION 1: ROUTE ALIASING EMPIRICAL TESTS
  // =========================================================================
  console.log('--- SECTION 1: Route Aliasing Verification ---');

  test('1.1: resolveCanonicalRoute("view-admin-kelas") resolves to view-admin-data with tab Data_Kelas', () => {
    const res = resolveCanonicalRoute('view-admin-kelas');
    assert.strictEqual(res.canonicalView, 'view-admin-data', 'canonicalView must be view-admin-data');
    assert.strictEqual(res.defaultTab, 'Data_Kelas', 'defaultTab must be Data_Kelas');
    assert.strictEqual(res.isLegacyAlias, true, 'isLegacyAlias must be true');
  });

  test('1.2: resolveCanonicalRoute("view-kelas") resolves to view-admin-data with tab Data_Kelas', () => {
    const res = resolveCanonicalRoute('view-kelas');
    assert.strictEqual(res.canonicalView, 'view-admin-data', 'canonicalView must be view-admin-data');
    assert.strictEqual(res.defaultTab, 'Data_Kelas', 'defaultTab must be Data_Kelas');
    assert.strictEqual(res.isLegacyAlias, true, 'isLegacyAlias must be true');
  });

  test('1.3: VIEW_ALIASES contains exact mappings for view-admin-kelas and view-kelas', () => {
    assert.deepStrictEqual(VIEW_ALIASES['view-admin-kelas'], { view: 'view-admin-data', tab: 'Data_Kelas' });
    assert.deepStrictEqual(VIEW_ALIASES['view-kelas'], { view: 'view-admin-data', tab: 'Data_Kelas' });
  });

  test('1.4: SIDEBAR_TOUR_ALIASES["view-admin-data"] includes view-admin-kelas and view-kelas', () => {
    const tourAliases = SIDEBAR_TOUR_ALIASES['view-admin-data'] || '';
    assert.ok(tourAliases.includes('view-admin-kelas'), 'Must include view-admin-kelas');
    assert.ok(tourAliases.includes('view-kelas'), 'Must include view-kelas');
  });

  test('1.5: resolveCanonicalRoute preserves explicit override tab when provided', () => {
    const res = resolveCanonicalRoute('view-admin-kelas', 'Data_Siswa');
    assert.strictEqual(res.canonicalView, 'view-admin-data');
    assert.strictEqual(res.defaultTab, 'Data_Siswa', 'Explicit tab must override default alias tab');
    assert.strictEqual(res.isLegacyAlias, true);
  });

  test('1.6: resolveCanonicalRoute handles trailing slash gracefully', () => {
    const res1 = resolveCanonicalRoute('view-admin-kelas/');
    assert.strictEqual(res1.canonicalView, 'view-admin-data');
    assert.strictEqual(res1.defaultTab, 'Data_Kelas');

    const res2 = resolveCanonicalRoute('view-kelas///');
    assert.strictEqual(res2.canonicalView, 'view-admin-data');
    assert.strictEqual(res2.defaultTab, 'Data_Kelas');
  });

  test('1.7: resolveCanonicalRoute handles whitespace in route name', () => {
    const res1 = resolveCanonicalRoute('  view-admin-kelas  ');
    assert.strictEqual(res1.canonicalView, 'view-admin-data');
    assert.strictEqual(res1.defaultTab, 'Data_Kelas');

    const res2 = resolveCanonicalRoute('\tview-kelas\n');
    assert.strictEqual(res2.canonicalView, 'view-admin-data');
    assert.strictEqual(res2.defaultTab, 'Data_Kelas');
  });

  // =========================================================================
  // SECTION 2: normalizeAdminTab EMPIRICAL TESTS
  // =========================================================================
  console.log('\n--- SECTION 2: normalizeAdminTab Verification ---');

  test('2.1: normalizeAdminTab handles Data_Kelas, data_kelas, Kelas, and kelas', () => {
    assert.strictEqual(normalizeAdminTab('Data_Kelas'), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('data_kelas'), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('Kelas'), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('kelas'), 'Data_Kelas');
  });

  test('2.2: normalizeAdminTab handles case variations and whitespace', () => {
    assert.strictEqual(normalizeAdminTab('  Data_Kelas  '), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('  kelas  '), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('DATA_KELAS'), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('kElAs'), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('\tdata_kelas\n'), 'Data_Kelas');
  });

  test('2.3: normalizeAdminTab preserves existing tabs and defaults correctly', () => {
    // Default fallback
    assert.strictEqual(normalizeAdminTab(undefined), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab(''), 'Data_Siswa');
    // Note: whitespace-only '   ' returns '   ' because (!tab) is false and clean is ''
    assert.strictEqual(normalizeAdminTab('   '), '   ');

    // Existing tab normalizations
    assert.strictEqual(normalizeAdminTab('blok'), 'sistem_blok');
    assert.strictEqual(normalizeAdminTab('sistem_blok'), 'sistem_blok');
    assert.strictEqual(normalizeAdminTab('pengguna'), 'Pengguna');
    assert.strictEqual(normalizeAdminTab('users'), 'Pengguna');
    assert.strictEqual(normalizeAdminTab('Pengguna'), 'Pengguna');

    // Other standard tabs untouched
    assert.strictEqual(normalizeAdminTab('Data_Guru'), 'Data_Guru');
    assert.strictEqual(normalizeAdminTab('Data_Mapel'), 'Data_Mapel');
    assert.strictEqual(normalizeAdminTab('Jadwal_Pelajaran'), 'Jadwal_Pelajaran');
    assert.strictEqual(normalizeAdminTab('Kalender_Pendidikan'), 'Kalender_Pendidikan');
    assert.strictEqual(normalizeAdminTab('Wali_Kelas'), 'Wali_Kelas');
  });

  // =========================================================================
  // SECTION 3: RBAC SECURITY BOUNDARIES FOR NON-ADMIN ROLES
  // =========================================================================
  console.log('\n--- SECTION 3: RBAC Security Boundary Verification ---');

  const nonAdminTestRoles = [
    { role: 'Guru', desc: 'Guru regular' },
    { role: 'guru', desc: 'guru lowercase' },
    { role: 'Siswa', desc: 'Siswa regular' },
    { role: 'siswa', desc: 'siswa lowercase' },
    { role: 'dinas_pendidikan', desc: 'Dinas pendidikan snake_case' },
    { role: 'dinaspendidikan', desc: 'dinaspendidikan compact' },
    { role: 'Dinas Pendidikan', desc: 'Dinas Pendidikan title case' },
    { role: 'Kepala Sekolah', desc: 'Kepala Sekolah title case' },
    { role: 'kepalasekolah', desc: 'kepalasekolah compact' },
    { role: 'kepala sekolah', desc: 'kepala sekolah lowercase' },
    { role: 'Piket', desc: 'Piket role' },
    { role: '', desc: 'Empty role string' },
    { role: undefined, desc: 'Undefined role' },
    { role: 'HackerRole', desc: 'Arbitrary untrusted role' }
  ];

  for (const item of nonAdminTestRoles) {
    test(`3.1: evaluateTabRBAC blocks ${item.desc} from view-admin-kelas alias`, () => {
      const res = evaluateTabRBAC('view-admin-kelas', '', { role: item.role });
      assert.strictEqual(res.allowed, false, `Role "${item.role}" must be blocked from view-admin-kelas`);
      assert.strictEqual(res.fallbackTab, item.role?.toLowerCase() === 'siswa' ? 'view-ujian' : 'view-home');
      assert.ok(res.reason && res.reason.length > 0, 'Must have descriptive rejection reason');
    });

    test(`3.2: evaluateTabRBAC blocks ${item.desc} from view-kelas alias`, () => {
      const res = evaluateTabRBAC('view-kelas', '', { role: item.role });
      assert.strictEqual(res.allowed, false, `Role "${item.role}" must be blocked from view-kelas`);
      assert.strictEqual(res.fallbackTab, item.role?.toLowerCase() === 'siswa' ? 'view-ujian' : 'view-home');
    });

    test(`3.3: evaluateTabRBAC blocks ${item.desc} from view-admin-data with tab Data_Kelas`, () => {
      const res = evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role: item.role });
      assert.strictEqual(res.allowed, false, `Role "${item.role}" must be blocked from Data_Kelas tab`);
      assert.strictEqual(res.fallbackTab, item.role?.toLowerCase() === 'siswa' ? 'view-ujian' : 'view-home');
    });

    test(`3.4: evaluateTabRBAC blocks ${item.desc} from view-admin-data with tab Kelas (and variants)`, () => {
      const variants = ['Kelas', 'kelas', 'data_kelas'];
      for (const v of variants) {
        const res = evaluateTabRBAC('view-admin-data', v, { role: item.role });
        assert.strictEqual(res.allowed, false, `Role "${item.role}" must be blocked from tab "${v}"`);
      }
    });

    test(`3.5: isMasterDataModificationAllowed rejects ${item.desc}`, () => {
      assert.strictEqual(isMasterDataModificationAllowed(item.role), false, `Role "${item.role}" must not be allowed master data modifications`);
    });

    test(`3.6: isAdminRole rejects ${item.desc}`, () => {
      assert.strictEqual(isAdminRole(item.role), false, `Role "${item.role}" must not be recognized as admin`);
    });
  }

  // =========================================================================
  // SECTION 4: ADMIN AND SUPERADMIN AUTHORIZED ACCESS
  // =========================================================================
  console.log('\n--- SECTION 4: Authorized Access for Admin & Superadmin ---');

  const adminRoles = [
    'Admin',
    'admin',
    'ADMIN',
    'Superadmin',
    'superadmin',
    'SUPERADMIN',
    'Super Admin'
  ];

  for (const role of adminRoles) {
    test(`4.1: evaluateTabRBAC permits ${role} to access view-admin-kelas`, () => {
      const res = evaluateTabRBAC('view-admin-kelas', '', { role });
      assert.strictEqual(res.allowed, true, `Role "${role}" must be permitted to access view-admin-kelas`);
    });

    test(`4.2: evaluateTabRBAC permits ${role} to access view-kelas`, () => {
      const res = evaluateTabRBAC('view-kelas', '', { role });
      assert.strictEqual(res.allowed, true, `Role "${role}" must be permitted to access view-kelas`);
    });

    test(`4.3: evaluateTabRBAC permits ${role} to access view-admin-data with tab Data_Kelas`, () => {
      const res = evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role });
      assert.strictEqual(res.allowed, true, `Role "${role}" must be permitted to access Data_Kelas`);
    });

    test(`4.4: evaluateTabRBAC permits ${role} to access view-admin-data with tab Kelas and data_kelas`, () => {
      assert.strictEqual(evaluateTabRBAC('view-admin-data', 'Kelas', { role }).allowed, true);
      assert.strictEqual(evaluateTabRBAC('view-admin-data', 'kelas', { role }).allowed, true);
      assert.strictEqual(evaluateTabRBAC('view-admin-data', 'data_kelas', { role }).allowed, true);
    });

    test(`4.5: isMasterDataModificationAllowed permits ${role}`, () => {
      assert.strictEqual(isMasterDataModificationAllowed(role), true, `Role "${role}" must be allowed master data modification`);
    });

    test(`4.6: isAdminRole permits ${role}`, () => {
      assert.strictEqual(isAdminRole(role), true, `Role "${role}" must be recognized as admin`);
    });
  }

  // =========================================================================
  // SECTION 5: SIDEBAR MENU ITEM ISOLATION
  // =========================================================================
  console.log('\n--- SECTION 5: Sidebar Menu Item Isolation ---');

  function checkMenusForUnauthorizedMasterData(role: string, extraParams = {}) {
    const items = getConsolidatedMenuItems({ role, ...extraParams });
    const flattenedIds: string[] = [];
    function collect(item: any) {
      flattenedIds.push(item.id);
      if (item.subItems) {
        item.subItems.forEach(collect);
      }
    }
    items.forEach(collect);

    const unauthorizedTargets = ['view-admin-data', 'view-admin-kelas', 'view-kelas', 'view-sistem-blok'];
    for (const target of unauthorizedTargets) {
      assert.ok(
        !flattenedIds.includes(target),
        `Role "${role}" sidebar menu MUST NOT include "${target}". Found items: ${flattenedIds.join(', ')}`
      );
    }
    return flattenedIds;
  }

  test('5.1: Guru sidebar menu does NOT leak view-admin-data or view-admin-kelas', () => {
    checkMenusForUnauthorizedMasterData('Guru');
    checkMenusForUnauthorizedMasterData('Guru', { isWaliKelas: true });
    checkMenusForUnauthorizedMasterData('Guru', { isPiketHariIni: true });
  });

  test('5.2: Siswa sidebar menu does NOT leak view-admin-data or view-admin-kelas', () => {
    const ids = checkMenusForUnauthorizedMasterData('Siswa');
    assert.deepStrictEqual(ids, ['view-ujian', 'view-informasi']);
  });

  test('5.3: Kepala Sekolah sidebar menu does NOT leak view-admin-data or view-admin-kelas', () => {
    checkMenusForUnauthorizedMasterData('Kepala Sekolah', { isKepalaSekolah: true });
  });

  test('5.4: Dinas Pendidikan sidebar menu does NOT leak view-admin-data or view-admin-kelas', () => {
    checkMenusForUnauthorizedMasterData('dinaspendidikan');
    checkMenusForUnauthorizedMasterData('dinaspendidikan', { activeTargetSchool: { id: 'sch-1', nama: 'SMK 1' } });
  });

  test('5.5: Admin and Superadmin menus properly include view-admin-data with dataTour', () => {
    const adminItems = getConsolidatedMenuItems({ role: 'Admin' });
    const masterItem = adminItems.find(i => i.id === 'view-admin-data');
    assert.ok(masterItem, 'Admin menu must include view-admin-data');
    assert.ok(
      masterItem?.dataTour?.includes('view-admin-kelas'),
      'Admin view-admin-data dataTour must include view-admin-kelas'
    );

    const saItems = getConsolidatedMenuItems({ role: 'Superadmin', activeTargetSchool: { id: 's1', nama: 'Test' } });
    const saMaster = saItems.find(i => i.id === 'view-admin-data');
    assert.ok(saMaster, 'Superadmin satellite menu must include view-admin-data');
    assert.ok(
      saMaster?.dataTour?.includes('view-admin-kelas'),
      'Superadmin view-admin-data dataTour must include view-admin-kelas'
    );
  });

  // =========================================================================
  // SECTION 6: ADVERSARIAL STRESS-TESTING & EDGE CASES
  // =========================================================================
  console.log('\n--- SECTION 6: Adversarial Stress-Testing & Edge Cases ---');

  test('6.1: Null, undefined, and garbage views in resolveCanonicalRoute', () => {
    assert.deepStrictEqual(resolveCanonicalRoute(null), { canonicalView: 'view-home', isLegacyAlias: false });
    assert.deepStrictEqual(resolveCanonicalRoute(undefined), { canonicalView: 'view-home', isLegacyAlias: false });
    assert.deepStrictEqual(resolveCanonicalRoute(''), { canonicalView: 'view-home', isLegacyAlias: false });
    assert.deepStrictEqual(resolveCanonicalRoute('null'), { canonicalView: 'view-home', isLegacyAlias: false });
    assert.deepStrictEqual(resolveCanonicalRoute('undefined'), { canonicalView: 'view-home', isLegacyAlias: false });
    assert.deepStrictEqual(resolveCanonicalRoute('unknown-route-123'), { canonicalView: 'unknown-route-123', defaultTab: undefined, isLegacyAlias: false });
  });

  test('6.2: Evasion attempts on evaluateTabRBAC (case tampering, tab spoofing)', () => {
    // Non-admin trying uppercase or mixed case route
    const nonAdminUser = { role: 'Guru' };
    
    // Tab spoofing
    const res1 = evaluateTabRBAC('view-admin-data', '  DATA_KELAS  ', nonAdminUser);
    assert.strictEqual(res1.allowed, false, 'Non-admin must be blocked even when tab is padded');

    const res2 = evaluateTabRBAC('view-admin-kelas', 'any_tab_name', nonAdminUser);
    assert.strictEqual(res2.allowed, false, 'Non-admin must be blocked from view-admin-kelas regardless of targetTab');

    const res3 = evaluateTabRBAC('view-kelas', 'any_tab_name', nonAdminUser);
    assert.strictEqual(res3.allowed, false, 'Non-admin must be blocked from view-kelas regardless of targetTab');
  });

  console.log('\n========================================================');
  console.log(`ALL EMPIRICAL CHALLENGER TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('========================================================\n');
}

runEmpiricalHarness().catch(err => {
  console.error('\nEMPIRICAL CHALLENGER HARNESS TERMINATED WITH FAILURE:');
  console.error(err);
  process.exit(1);
});
