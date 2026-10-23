import assert from 'assert';
import { 
  setServerTenantContext, 
  setServerActiveTargetSchool, 
  getActiveTargetSchool, 
  dynamicTenantFetch,
  masterFetch
} from '../../../src/lib/supabaseClient';

async function runForensicAudit() {
  console.log('--- TEST 1: Superadmin Target Scope ---');
  setServerTenantContext({ role: 'superadmin', kotaKabupaten: null });
  setServerActiveTargetSchool({ id: 'sch-1', nama: 'SMA 1 Kotamobagu', kota_kabupaten: 'Kota Kotamobagu' });
  assert.strictEqual(getActiveTargetSchool()?.id, 'sch-1', 'Superadmin must access target school in any region');
  console.log('PASS: Superadmin can access any region target school');

  console.log('--- TEST 2: Dinas Pendidikan Matching Region ---');
  setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });
  setServerActiveTargetSchool({ id: 'sch-1', nama: 'SMA 1 Kotamobagu', kota_kabupaten: 'Kota Kotamobagu' });
  assert.strictEqual(getActiveTargetSchool()?.id, 'sch-1', 'Dinas must access target school in assigned region');
  console.log('PASS: Dinas can access target school in matching region');

  console.log('--- TEST 3: Dinas Pendidikan Trimmed & Case-Insensitive Matching ---');
  setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: '  KOTA KOTAMOBAGU  ' });
  setServerActiveTargetSchool({ id: 'sch-1', nama: 'SMA 1 Kotamobagu', kota_kabupaten: 'kota kotamobagu' });
  assert.strictEqual(getActiveTargetSchool()?.id, 'sch-1', 'Dinas must match region case-insensitively with trim');
  console.log('PASS: Region match handles uppercase, lowercase, and surrounding whitespace');

  console.log('--- TEST 4: Dinas Pendidikan Different Region Blocked ---');
  setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });
  setServerActiveTargetSchool({ id: 'sch-2', nama: 'SMA 1 Boltim', kota_kabupaten: 'Kab. Bolaang Mongondow Timur' });
  assert.strictEqual(getActiveTargetSchool(), null, 'Dinas MUST NOT access target school outside assigned region');
  console.log('PASS: Target school in foreign region is blocked (returns null)');

  console.log('--- TEST 5: Dinas Pendidikan With Null User Region Blocked ---');
  setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: null });
  setServerActiveTargetSchool({ id: 'sch-1', nama: 'SMA 1 Kotamobagu', kota_kabupaten: 'Kota Kotamobagu' });
  assert.strictEqual(getActiveTargetSchool(), null, 'Dinas with null region must return null');
  console.log('PASS: Dinas with unassigned region is blocked from all target schools');

  console.log('--- TEST 6: Dinas Pendidikan With Null School Region Blocked ---');
  setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });
  setServerActiveTargetSchool({ id: 'sch-null', nama: 'SMA Without Region', kota_kabupaten: null });
  assert.strictEqual(getActiveTargetSchool(), null, 'Target school with null region must return null');
  console.log('PASS: Target school with null region is blocked');

  console.log('--- TEST 7: Local Admin and Guru Blocked from Target Scope ---');
  setServerTenantContext({ role: 'admin', kotaKabupaten: 'Kota Kotamobagu' });
  assert.strictEqual(getActiveTargetSchool(), null, 'Admin must not have target school scope');
  setServerTenantContext({ role: 'guru', kotaKabupaten: 'Kota Kotamobagu' });
  assert.strictEqual(getActiveTargetSchool(), null, 'Guru must not have target school scope');
  console.log('PASS: Admin and Guru roles strictly blocked from target school scope');

  console.log('--- TEST 8: Mutation Guard in dynamicTenantFetch & masterFetch ---');
  setServerTenantContext({ role: 'dinas_pendidikan', kotaKabupaten: 'Kota Kotamobagu' });

  // Test POST
  const resPost = await dynamicTenantFetch('https://example.supabase.co/rest/v1/data_guru', { method: 'POST' });
  assert.strictEqual(resPost.status, 403, 'POST must return 403 for dinas');
  const jsonPost = await resPost.json();
  assert.strictEqual(jsonPost.error, 'Role dinas_pendidikan is read-only. Data mutation prohibited.');
  console.log('PASS: POST method blocked with HTTP 403 and read-only error');

  // Test PUT
  const resPut = await dynamicTenantFetch('https://example.supabase.co/rest/v1/data_guru', { method: 'PUT' });
  assert.strictEqual(resPut.status, 403, 'PUT must return 403 for dinas');
  console.log('PASS: PUT method blocked with HTTP 403');

  // Test PATCH
  const resPatch = await dynamicTenantFetch('https://example.supabase.co/rest/v1/data_guru', { method: 'PATCH' });
  assert.strictEqual(resPatch.status, 403, 'PATCH must return 403 for dinas');
  console.log('PASS: PATCH method blocked with HTTP 403');

  // Test DELETE
  const resDelete = await dynamicTenantFetch('https://example.supabase.co/rest/v1/data_guru', { method: 'DELETE' });
  assert.strictEqual(resDelete.status, 403, 'DELETE must return 403 for dinas');
  console.log('PASS: DELETE method blocked with HTTP 403');

  // Test masterFetch mutation guard
  const resMasterPut = await masterFetch('https://example.supabase.co/rest/v1/users', { method: 'PUT' });
  assert.strictEqual(resMasterPut.status, 403, 'masterFetch PUT must return 403 for dinas');
  console.log('PASS: masterFetch PUT method blocked with HTTP 403');

  // Test verify_login RPC exemption (login must not be blocked)
  let verifyLoginCalled = false;
  const originalFetch = global.fetch;
  (global as any).fetch = async (url: any, init: any) => {
    verifyLoginCalled = true;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  try {
    const resLogin = await dynamicTenantFetch('https://example.supabase.co/rest/v1/rpc/verify_login', { method: 'POST' });
    assert.strictEqual(verifyLoginCalled, true, 'verify_login RPC must not be blocked by mutation guard');
    assert.strictEqual(resLogin.status, 200);
    console.log('PASS: verify_login RPC exempted from mutation guard');
  } finally {
    (global as any).fetch = originalFetch;
  }

  console.log('--- TEST 9: Mutation NOT blocked for Superadmin ---');
  setServerTenantContext({ role: 'superadmin' });
  let superadminPostCalled = false;
  (global as any).fetch = async () => {
    superadminPostCalled = true;
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  };
  try {
    const resSa = await dynamicTenantFetch('https://example.supabase.co/rest/v1/data_guru', { method: 'POST' });
    assert.strictEqual(superadminPostCalled, true, 'Superadmin POST must execute through to fetch');
    assert.strictEqual(resSa.status, 201);
    console.log('PASS: Superadmin mutations pass through unimpeded');
  } finally {
    (global as any).fetch = originalFetch;
  }

  console.log('\n======================================================');
  console.log('ALL 9 FORENSIC BEHAVIORAL CHECKS PASSED EMPIRICALLY!');
  console.log('======================================================');
}

runForensicAudit().catch(err => {
  console.error('FORENSIC AUDIT FAILED:', err);
  process.exit(1);
});
