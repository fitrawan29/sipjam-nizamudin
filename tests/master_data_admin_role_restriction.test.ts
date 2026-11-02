/**
 * Automated Verification: Master Data Modification Role Restriction
 * 
 * Verifies that:
 * 1. Master data modification is strictly restricted to users with role 'Admin' / 'Superadmin'.
 * 2. Non-admin roles (Guru, Siswa, Piket, Kepala Sekolah, Dinas Pendidikan, Anon) are rejected (403 Forbidden / code 42501).
 * 3. Non-admin roles can still read master data (for teaching, attendance, schedule).
 * 4. Master data UI navigation (view-admin-data and view-sistem-blok) is blocked for non-admin.
 * 5. All master tables (data_siswa, data_guru, jadwal_pelajaran, data_kelas, kelas, guru_kelas, data_mapel, guru_mapel, wali_kelas, kalender_pendidikan, sistem_blok) are protected.
 * 6. Master data integrity is preserved without silent auto-alteration.
 */

import assert from 'node:assert';
import {
  isMasterDataEndpoint,
  isAdminRole,
  checkMasterDataMutationGuard,
  getTenantSupabaseClient,
  setServerTenantContext,
  clearServerTenantContext,
  MASTER_DATA_TABLES
} from '../src/lib/supabaseClient';
import {
  validateMasterDataModificationRole,
  isMasterDataModificationAllowed
} from '../src/lib/dataIntegrityGuard';
import { evaluateTabRBAC } from '../src/lib/navigation';

async function runTests() {
  console.log('--- Starting Master Data Role Restriction Verification ---');

  // Test 1: Role validator unit tests
  console.log('[Test 1] Validating role checks...');
  assert.strictEqual(isAdminRole('Admin'), true, 'Admin should be authorized');
  assert.strictEqual(isAdminRole('admin'), true, 'admin lowercase should be authorized');
  assert.strictEqual(isAdminRole('Superadmin'), true, 'Superadmin should be authorized');
  assert.strictEqual(isAdminRole('superadmin'), true, 'superadmin lowercase should be authorized');
  assert.strictEqual(isAdminRole('Super Admin'), true, 'Super Admin with space should be authorized');
  assert.strictEqual(isAdminRole('service_role'), true, 'service_role should be authorized');

  assert.strictEqual(isAdminRole('Guru'), false, 'Guru must NOT be authorized');
  assert.strictEqual(isAdminRole('guru'), false, 'guru lowercase must NOT be authorized');
  assert.strictEqual(isAdminRole('Siswa'), false, 'Siswa must NOT be authorized');
  assert.strictEqual(isAdminRole('siswa'), false, 'siswa lowercase must NOT be authorized');
  assert.strictEqual(isAdminRole('Piket'), false, 'Piket must NOT be authorized');
  assert.strictEqual(isAdminRole('Kepala Sekolah'), false, 'Kepala Sekolah must NOT be authorized');
  assert.strictEqual(isAdminRole('dinas_pendidikan'), false, 'dinas_pendidikan must NOT be authorized');
  assert.strictEqual(isAdminRole(''), false, 'Empty role must NOT be authorized');
  assert.strictEqual(isAdminRole(null), false, 'Null role must NOT be authorized');
  assert.strictEqual(isAdminRole(undefined), false, 'Undefined role must NOT be authorized');

  const adminValidation = validateMasterDataModificationRole('Admin');
  assert.strictEqual(adminValidation.valid, true);

  const guruValidation = validateMasterDataModificationRole('Guru');
  assert.strictEqual(guruValidation.valid, false);
  assert.ok(guruValidation.message && guruValidation.message.includes('Admin'));

  const siswaValidation = validateMasterDataModificationRole('Siswa');
  assert.strictEqual(siswaValidation.valid, false);

  assert.strictEqual(isMasterDataModificationAllowed('Admin'), true);
  assert.strictEqual(isMasterDataModificationAllowed('Guru'), false);
  assert.strictEqual(isMasterDataModificationAllowed('Siswa'), false);
  assert.strictEqual(isMasterDataModificationAllowed('dinaspendidikan'), false);
  console.log('✓ Test 1 passed: Role validator functions behave correctly.');

  // Test 2: Master data endpoint detection across path variants
  console.log('[Test 2] Validating master data endpoint recognition across URL and path variants...');
  for (const table of MASTER_DATA_TABLES) {
    // 2a. Full URL
    assert.strictEqual(
      isMasterDataEndpoint(`https://placeholder.supabase.co/rest/v1/${table}`),
      true,
      `Full URL for table ${table} must be recognized`
    );
    // 2b. Full URL with query parameters
    assert.strictEqual(
      isMasterDataEndpoint(`https://placeholder.supabase.co/rest/v1/${table}?select=*`),
      true,
      `Query URL for ${table} must be recognized`
    );
    // 2c. Relative path with leading slash
    assert.strictEqual(
      isMasterDataEndpoint(`/rest/v1/${table}`),
      true,
      `Relative path /rest/v1/${table} must be recognized`
    );
    // 2d. Relative path without leading slash
    assert.strictEqual(
      isMasterDataEndpoint(`rest/v1/${table}`),
      true,
      `Relative path rest/v1/${table} must be recognized`
    );
    // 2e. Resource ID path
    assert.strictEqual(
      isMasterDataEndpoint(`/rest/v1/${table}/123`),
      true,
      `Resource ID path /rest/v1/${table}/123 must be recognized`
    );
    // 2f. Raw table name
    assert.strictEqual(
      isMasterDataEndpoint(table),
      true,
      `Raw table name ${table} must be recognized`
    );
    // 2g. Raw table name with query param
    assert.strictEqual(
      isMasterDataEndpoint(`${table}?select=*`),
      true,
      `Raw table name with query param ${table}?select=* must be recognized`
    );
  }

  // 2h. Public schema prefix paths
  assert.strictEqual(
    isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/public.data_siswa'),
    true,
    'public schema prefixed URL must be recognized'
  );
  assert.strictEqual(
    isMasterDataEndpoint('/rest/v1/public.data_guru'),
    true,
    'public schema prefixed relative path must be recognized'
  );

  // Operational tables must NOT be matched
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/absensi'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/presensi_guru'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/presensi_siswa'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/rekap_siswa'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/jurnal_pembelajaran'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/laporan_piket'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/penugasan_piket'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/bank_dokumen'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/pengumuman'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/riwayat_backup'), false);
  console.log('✓ Test 2 passed: Endpoint matcher correctly distinguishes all master data path variants.');

  // Test 3: Navigation Tab RBAC
  console.log('[Test 3] Validating Navigation Tab RBAC for canonical and alias routes...');
  // 3a. Canonical view-admin-data
  const adminRbac = evaluateTabRBAC('view-admin-data', 'Data_Siswa', { role: 'Admin' });
  assert.strictEqual(adminRbac.allowed, true, 'Admin must be allowed to access view-admin-data');

  const superadminRbac = evaluateTabRBAC('view-admin-data', 'Data_Guru', { role: 'Superadmin' });
  assert.strictEqual(superadminRbac.allowed, true, 'Superadmin must be allowed to access view-admin-data');

  const guruRbac = evaluateTabRBAC('view-admin-data', 'Data_Siswa', { role: 'Guru' });
  assert.strictEqual(guruRbac.allowed, false, 'Guru must be blocked from view-admin-data');
  assert.strictEqual(guruRbac.fallbackTab, 'view-home');

  const siswaRbac = evaluateTabRBAC('view-admin-data', 'Data_Mapel', { role: 'Siswa' });
  assert.strictEqual(siswaRbac.allowed, false, 'Siswa must be blocked from view-admin-data');

  const dinasRbac = evaluateTabRBAC('view-admin-data', 'Jadwal_Pelajaran', { role: 'dinas_pendidikan' });
  assert.strictEqual(dinasRbac.allowed, false, 'Dinas must be blocked from view-admin-data');

  // 3b. Legacy alias view-sistem-blok
  const adminBlokRbac = evaluateTabRBAC('view-sistem-blok', 'blok', { role: 'Admin' });
  assert.strictEqual(adminBlokRbac.allowed, true, 'Admin must be allowed to access view-sistem-blok');

  const guruBlokRbac = evaluateTabRBAC('view-sistem-blok', 'blok', { role: 'Guru' });
  assert.strictEqual(guruBlokRbac.allowed, false, 'Guru must be blocked from view-sistem-blok alias');
  assert.strictEqual(guruBlokRbac.fallbackTab, 'view-home');

  const siswaBlokRbac = evaluateTabRBAC('view-sistem-blok', 'blok', { role: 'Siswa' });
  assert.strictEqual(siswaBlokRbac.allowed, false, 'Siswa must be blocked from view-sistem-blok alias');
  console.log('✓ Test 3 passed: evaluateTabRBAC strictly protects view-admin-data & view-sistem-blok for non-admin users.');

  // Test 4: Direct Mutation Guard Response Check
  console.log('[Test 4] Validating direct checkMasterDataMutationGuard...');
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const nonAdminRoles = ['Guru', 'Siswa', 'Piket', 'Kepala Sekolah', 'dinaspendidikan', null];

  for (const method of mutatingMethods) {
    for (const role of nonAdminRoles) {
      const res = checkMasterDataMutationGuard('https://placeholder.supabase.co/rest/v1/data_siswa', method, role);
      assert.ok(res !== null, `Expected rejection for ${method} by role ${role}`);
      assert.strictEqual(res.status, 403, 'Must return 403 Forbidden');
      const body = await res.json();
      assert.strictEqual(body.code, '42501', 'Must return PostgreSQL permission denied code 42501');
      assert.ok(body.message.includes('Admin') || body.error.includes('Admin'), 'Message must reference Admin requirement');
    }

    // Admin must NOT be blocked
    const adminRes = checkMasterDataMutationGuard('https://placeholder.supabase.co/rest/v1/data_siswa', method, 'Admin');
    assert.strictEqual(adminRes, null, `Admin must not be blocked for ${method}`);

    const saRes = checkMasterDataMutationGuard('https://placeholder.supabase.co/rest/v1/data_siswa', method, 'Superadmin');
    assert.strictEqual(saRes, null, `Superadmin must not be blocked for ${method}`);
  }

  // GET / SELECT method must NOT be blocked for any role
  for (const role of nonAdminRoles) {
    const getRes = checkMasterDataMutationGuard('https://placeholder.supabase.co/rest/v1/data_siswa', 'GET', role);
    assert.strictEqual(getRes, null, `GET method must not be blocked for role ${role}`);
  }
  console.log('✓ Test 4 passed: Mutation guard rejects non-admin mutations and allows admin & read operations.');

  // Test 5: Client-level PostgREST interception via getTenantSupabaseClient across all master tables
  console.log('[Test 5] Validating getTenantSupabaseClient role enforcement across all protected master tables...');
  const testSekolahId = 'a0000000-0000-0000-0000-000000000001';

  // 5a: Non-admin client (Role: Guru)
  const guruClient = getTenantSupabaseClient(testSekolahId, 'Guru');

  // Comprehensive check across every single protected table
  for (const table of MASTER_DATA_TABLES) {
    const insertRes = await (guruClient.from(table) as any).insert([{ dummy_test: 'fail' }]);
    assert.ok(insertRes.error, `Guru insert to ${table} must return error`);
    assert.strictEqual(insertRes.status, 403, `Guru insert status on ${table} must be 403`);
    assert.strictEqual(insertRes.error.code, '42501', `Guru insert code on ${table} must be 42501`);

    const updateRes = await (guruClient.from(table) as any).update({ dummy_test: 'fail' }).eq('id', '123');
    assert.ok(updateRes.error, `Guru update to ${table} must return error`);
    assert.strictEqual(updateRes.status, 403, `Guru update status on ${table} must be 403`);

    const delRes = await (guruClient.from(table) as any).delete().eq('id', '123');
    assert.ok(delRes.error, `Guru delete to ${table} must return error`);
    assert.strictEqual(delRes.status, 403, `Guru delete status on ${table} must be 403`);
  }

  // 5b: Non-admin client (Role: Siswa)
  const siswaClient = getTenantSupabaseClient(testSekolahId, 'Siswa');
  const siswaMutate = await siswaClient.from('data_siswa').update({ nama_siswa: 'New' }).eq('id', '123');
  assert.ok(siswaMutate.error, 'Siswa mutation must return error');
  assert.strictEqual(siswaMutate.status, 403);

  // 5c: Unauthenticated / Anon
  const anonClient = getTenantSupabaseClient(testSekolahId, null);
  const anonMutate = await anonClient.from('data_guru').delete().eq('id', '123');
  assert.ok(anonMutate.error, 'Anon delete on data_guru must return error');
  assert.strictEqual(anonMutate.status, 403);

  console.log(`✓ Test 5 passed: Client correctly enforces 403 Forbidden on all ${MASTER_DATA_TABLES.length} master tables for non-admin.`);

  // Test 6: In-memory Server Tenant Context enforcement
  console.log('[Test 6] Validating serverTenantContext with global supabase client...');
  setServerTenantContext({ role: 'Guru', sekolahId: testSekolahId });
  const teacherContextClient = getTenantSupabaseClient();
  const resContext = await teacherContextClient.from('data_siswa').insert([{ nama_siswa: 'Invalid' }]);
  assert.ok(resContext.error, 'Server context role Guru must reject master data insert');
  assert.strictEqual(resContext.status, 403);
  clearServerTenantContext();
  console.log('✓ Test 6 passed: serverTenantContext properly propagates role restrictions.');

  // Test 7: Method whitespace trimming in checkMasterDataMutationGuard
  console.log('[Test 7] Validating HTTP method whitespace trimming...');
  const paddedRes = checkMasterDataMutationGuard('https://placeholder.supabase.co/rest/v1/data_siswa', '  post  ', 'Guru');
  assert.ok(paddedRes !== null, 'Padded method "  post  " must be properly recognized and rejected');
  assert.strictEqual(paddedRes.status, 403);
  console.log('✓ Test 7 passed: checkMasterDataMutationGuard safely trims method whitespace.');

  // Test 8: Component-level guard static assertions
  console.log('[Test 8] Validating component-level guards for master data...');
  const fs = await import('node:fs');
  const path = await import('node:path');

  const rootDir = process.cwd();
  const sistemBlokSrc = fs.readFileSync(path.join(rootDir, 'src/components/SistemBlokView.tsx'), 'utf8');
  assert.ok(sistemBlokSrc.includes('if (!isAdmin)'), 'SistemBlokView must use normalized isAdmin check');

  const adminConfigSrc = fs.readFileSync(path.join(rootDir, 'src/components/AdminConfigView.tsx'), 'utf8');
  assert.ok(
    adminConfigSrc.includes('isMasterDataModificationAllowed(user?.role)'),
    'AdminConfigView handleSave must guard against non-admin saving master data'
  );

  const naikKelasSrc = fs.readFileSync(path.join(rootDir, 'src/components/NaikKelasModal.tsx'), 'utf8');
  assert.ok(
    naikKelasSrc.includes('!isAdmin') && naikKelasSrc.includes('Mode Pratinjau'),
    'NaikKelasModal must disable actions and display warning banner for non-admin'
  );
  console.log('✓ Test 8 passed: Component files contain hardened authorization checks.');

  console.log('\n======================================================');
  console.log('ALL MASTER DATA ROLE RESTRICTION TESTS PASSED (8/8)');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
