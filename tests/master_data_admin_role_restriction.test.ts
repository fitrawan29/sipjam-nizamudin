/**
 * Automated Verification: Master Data Modification Role Restriction
 * 
 * Verifies that:
 * 1. Master data modification is strictly restricted to users with role 'Admin' / 'Superadmin'.
 * 2. Non-admin roles (Guru, Siswa, Piket, Kepala Sekolah, Dinas Pendidikan, Anon) are rejected (403 Forbidden).
 * 3. Non-admin roles can still read master data (for teaching, attendance, schedule).
 * 4. Master data UI navigation (view-admin-data) is blocked for non-admin.
 * 5. Master data integrity is preserved without silent auto-alteration.
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
  console.log('✓ Test 1 passed: Role validator functions behave correctly.');

  // Test 2: Master data endpoint detection
  console.log('[Test 2] Validating master data endpoint recognition...');
  for (const table of MASTER_DATA_TABLES) {
    assert.strictEqual(
      isMasterDataEndpoint(`https://placeholder.supabase.co/rest/v1/${table}`),
      true,
      `Table ${table} must be recognized as master data endpoint`
    );
    assert.strictEqual(
      isMasterDataEndpoint(`https://placeholder.supabase.co/rest/v1/${table}?select=*`),
      true,
      `Query URL for ${table} must be recognized as master data endpoint`
    );
    assert.strictEqual(
      isMasterDataEndpoint(`/rest/v1/${table}`),
      true,
      `Relative path for ${table} must be recognized`
    );
  }

  // Operational tables must NOT be matched
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/absensi'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/presensi_guru'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/jurnal_pembelajaran'), false);
  assert.strictEqual(isMasterDataEndpoint('https://placeholder.supabase.co/rest/v1/bank_dokumen'), false);
  console.log('✓ Test 2 passed: Endpoint matcher correctly distinguishes master data from operational tables.');

  // Test 3: Navigation Tab RBAC
  console.log('[Test 3] Validating Navigation Tab RBAC...');
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
  console.log('✓ Test 3 passed: evaluateTabRBAC strictly protects view-admin-data for non-admin users.');

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

  // Test 5: Client-level PostgREST interception via getTenantSupabaseClient
  console.log('[Test 5] Validating getTenantSupabaseClient role enforcement on master tables...');
  const testSekolahId = 'a0000000-0000-0000-0000-000000000001';

  // 5a: Non-admin client (Role: Guru)
  const guruClient = getTenantSupabaseClient(testSekolahId, 'Guru');

  // Insert on data_siswa
  const siswaInsert = await guruClient.from('data_siswa').insert([{ nama_siswa: 'Siswa Test', kelas: 'X' }]);
  assert.ok(siswaInsert.error, 'Guru insert to data_siswa must return error');
  assert.strictEqual(siswaInsert.status, 403, 'Guru insert status must be 403');
  assert.strictEqual(siswaInsert.error.code, '42501');

  // Update on data_guru
  const guruUpdate = await guruClient.from('data_guru').update({ nama_guru: 'Guru Baru' }).eq('id', '123');
  assert.ok(guruUpdate.error, 'Guru update to data_guru must return error');
  assert.strictEqual(guruUpdate.status, 403);
  assert.strictEqual(guruUpdate.error.code, '42501');

  // Delete on jadwal_pelajaran
  const jadwalDel = await guruClient.from('jadwal_pelajaran').delete().eq('id', '123');
  assert.ok(jadwalDel.error, 'Guru delete on jadwal_pelajaran must return error');
  assert.strictEqual(jadwalDel.status, 403);

  // Insert on data_mapel
  const mapelInsert = await guruClient.from('data_mapel').insert([{ nama_mata_pelajaran: 'Biologi' }]);
  assert.ok(mapelInsert.error, 'Guru insert to data_mapel must return error');
  assert.strictEqual(mapelInsert.status, 403);

  // Upsert on wali_kelas
  const waliUpsert = await guruClient.from('wali_kelas').upsert([{ kelas: 'X-1', nama_guru: 'Guru A' }]);
  assert.ok(waliUpsert.error, 'Guru upsert to wali_kelas must return error');
  assert.strictEqual(waliUpsert.status, 403);

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

  console.log('✓ Test 5 passed: Client correctly enforces 403 Forbidden on all master tables for non-admin.');

  // Test 6: In-memory Server Tenant Context enforcement
  console.log('[Test 6] Validating serverTenantContext with global supabase client...');
  setServerTenantContext({ role: 'Guru', sekolahId: testSekolahId });
  const teacherContextClient = getTenantSupabaseClient();
  const resContext = await teacherContextClient.from('data_siswa').insert([{ nama_siswa: 'Invalid' }]);
  assert.ok(resContext.error, 'Server context role Guru must reject master data insert');
  assert.strictEqual(resContext.status, 403);
  clearServerTenantContext();
  console.log('✓ Test 6 passed: serverTenantContext properly propagates role restrictions.');

  console.log('\n======================================================');
  console.log('ALL MASTER DATA ROLE RESTRICTION TESTS PASSED (6/6)');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
