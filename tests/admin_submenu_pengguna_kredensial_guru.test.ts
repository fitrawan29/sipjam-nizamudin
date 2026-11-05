/**
 * tests/admin_submenu_pengguna_kredensial_guru.test.ts
 * 
 * Comprehensive Automated Verification Suite for:
 * - R1: Sub Menu Pengguna pada Menu Master Data dan Kalender
 * - R2: Penarikan Otomatis Akun dari Data Guru (Username NIP & Default Password NIP27)
 * - R3: Manajemen Kredensial Pengguna oleh Admin
 * - R4: Integritas dan Non-Regresi Fitur Eksisting
 */

import assert from 'node:assert';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  evaluateTabRBAC,
  VIEW_ALIASES
} from '../src/lib/navigation';
import {
  getDefaultTeacherPassword,
  resolveTeacherUsername,
  syncTeacherAccounts,
  updateTeacherCredentials,
  resetTeacherPasswordToDefault
} from '../src/lib/teacherUserSync';
import { isMasterDataModificationAllowed } from '../src/lib/dataIntegrityGuard';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function pass(desc: string, detail?: string) {
  totalChecks++;
  passedChecks++;
  console.log(`  ${GREEN}✔ [PASS]${RESET} ${desc}`);
  if (detail) console.log(`    ${CYAN}↳ ${detail}${RESET}`);
}

function fail(desc: string, err?: any) {
  totalChecks++;
  failedChecks++;
  console.error(`  ${RED}✖ [FAIL]${RESET} ${desc}`);
  if (err) console.error(`    ${RED}↳ Error: ${err.message || err}${RESET}`);
}

async function runTestSuite() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║   SUB MENU PENGGUNA & KREDENSIAL GURU OTOMATIS VERIFICATION SUITE    ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}`);

  // ==========================================================================
  // SUITE 1: Navigation & RBAC Verification (R1)
  // ==========================================================================
  console.log(`\n${BOLD}--- SUITE 1: Navigasi dan Hak Akses Sub Menu Pengguna (R1) ---${RESET}`);

  // Test 1.1: Admin menu items contain sub menu Pengguna under Master Data & Kalender
  const adminMenus = getConsolidatedMenuItems({ role: 'admin' });
  const masterDataItem = adminMenus.find(m => m.id === 'view-admin-data');
  assert.ok(masterDataItem, 'Master Data & Kalender item must exist for admin');
  assert.ok(masterDataItem.subItems && masterDataItem.subItems.length > 0, 'view-admin-data must have subItems for admin');

  const subMenuPengguna = masterDataItem.subItems?.find(s => s.id === 'view-admin-pengguna' || s.label.toLowerCase().includes('pengguna'));
  assert.ok(subMenuPengguna, 'Sub menu Pengguna must be present under Master Data for admin');
  pass('1.1: Sub menu Pengguna muncul di bawah menu Master Data dan Kalender untuk role admin',
    `Found item: ${subMenuPengguna?.label} (${subMenuPengguna?.id})`);

  // Test 1.2: Superadmin menu items with satellite school contain sub menu Pengguna
  const saSatelliteMenus = getConsolidatedMenuItems({
    role: 'superadmin',
    activeTargetSchool: { id: 's1', nama: 'SMP Model' }
  });
  const saMasterItem = saSatelliteMenus.find(m => m.id === 'view-admin-data');
  assert.ok(saMasterItem?.subItems?.some(s => s.id === 'view-admin-pengguna'), 'Superadmin with activeTargetSchool must have sub menu Pengguna');
  pass('1.2: Superadmin dengan target sekolah memiliki sub menu Pengguna di bawah Master Data');

  // Test 1.3: Non-admin roles (Guru, Siswa, Dinas, Kepsek) do NOT have sub menu Pengguna
  const guruMenus = getConsolidatedMenuItems({ role: 'guru' });
  assert.strictEqual(guruMenus.some(m => m.id === 'view-admin-data' || m.id === 'view-admin-pengguna'), false);

  const siswaMenus = getConsolidatedMenuItems({ role: 'siswa' });
  assert.strictEqual(siswaMenus.some(m => m.id === 'view-admin-data' || m.id === 'view-admin-pengguna'), false);

  const dinasMenus = getConsolidatedMenuItems({ role: 'dinaspendidikan' });
  assert.strictEqual(dinasMenus.some(m => m.id === 'view-admin-data' || m.id === 'view-admin-pengguna'), false);

  const kepsekMenus = getConsolidatedMenuItems({ role: 'kepalasekolah', isKepalaSekolah: true });
  assert.strictEqual(kepsekMenus.some(m => m.id === 'view-admin-data' || m.id === 'view-admin-pengguna'), false);
  pass('1.3: Sub menu Pengguna tidak muncul dan tidak dapat dilihat oleh role non-admin (Guru, Siswa, Dinas, Kepsek)');

  // Test 1.4: Canonical Route Resolution for view-admin-pengguna and view-pengguna
  const route1 = resolveCanonicalRoute('view-admin-pengguna');
  assert.strictEqual(route1.canonicalView, 'view-admin-data');
  assert.strictEqual(route1.defaultTab, 'Pengguna');
  assert.strictEqual(route1.isLegacyAlias, true);

  const route2 = resolveCanonicalRoute('view-pengguna');
  assert.strictEqual(route2.canonicalView, 'view-admin-data');
  assert.strictEqual(route2.defaultTab, 'Pengguna');
  assert.strictEqual(route2.isLegacyAlias, true);

  const route3 = resolveCanonicalRoute('view-admin-users');
  assert.strictEqual(route3.canonicalView, 'view-admin-data');
  assert.strictEqual(route3.defaultTab, 'Pengguna');
  pass('1.4: resolveCanonicalRoute memetakan view-admin-pengguna ke view-admin-data dengan tab Pengguna');

  // Test 1.5: RBAC Authorization Guard for Sub Menu Pengguna
  const rbacAdmin = evaluateTabRBAC('view-admin-pengguna', 'Pengguna', { role: 'Admin' });
  assert.strictEqual(rbacAdmin.allowed, true, 'Admin must be authorized for sub menu Pengguna');

  const rbacGuru = evaluateTabRBAC('view-admin-pengguna', 'Pengguna', { role: 'Guru' });
  assert.strictEqual(rbacGuru.allowed, false, 'Guru must be blocked from sub menu Pengguna');
  assert.strictEqual(rbacGuru.fallbackTab, 'view-home');

  const rbacGuruTab = evaluateTabRBAC('view-admin-data', 'Pengguna', { role: 'Guru' });
  assert.strictEqual(rbacGuruTab.allowed, false, 'Guru must be blocked from view-admin-data with tab Pengguna');

  const rbacSiswa = evaluateTabRBAC('view-admin-pengguna', 'Pengguna', { role: 'Siswa' });
  assert.strictEqual(rbacSiswa.allowed, false, 'Siswa must be blocked from sub menu Pengguna');
  pass('1.5: evaluateTabRBAC memblokir akses langsung role non-admin ke sub menu Pengguna');

  // ==========================================================================
  // SUITE 2: Default Credentials & Teacher Account Auto-Pull (R2)
  // ==========================================================================
  console.log(`\n${BOLD}--- SUITE 2: Kredensial Default dan Penarikan Otomatis (R2) ---${RESET}`);

  // Test 2.1: Default Password Generation Rule (NIP27)
  const pwd1 = getDefaultTeacherPassword('198501012010011001');
  assert.strictEqual(pwd1, '19850101201001100127', 'Default password must be NIP + 27');

  const pwd2 = getDefaultTeacherPassword('Fitra');
  assert.strictEqual(pwd2, 'Fitra27', 'Default password must append 27 to username/NIP');

  const pwd3 = getDefaultTeacherPassword('199203152019032008');
  assert.strictEqual(pwd3, '19920315201903200827');
  pass('2.1: Password default guru secara konsisten mengikuti format NIP + 27 (NIP27)');

  // Test 2.2: Teacher Username Resolution
  const u1 = resolveTeacherUsername({ nip: '198501012010011001', nama_guru: 'Fitri Aprilia Dotulong' });
  assert.strictEqual(u1, '198501012010011001', 'Username must prioritize NIP');

  const u2 = resolveTeacherUsername({ nip: '  199002022015021002  ', nama_guru: 'Ahmad Podomi' });
  assert.strictEqual(u2, '199002022015021002', 'Username must trim whitespace around NIP');

  const u3 = resolveTeacherUsername({ nip: '-', nama_guru: 'Guru Honorer' });
  assert.strictEqual(u3, 'guruhonorer', 'Fallback username cleans nama when NIP is "-"');
  pass('2.2: resolveTeacherUsername mengutamakan NIP sebagai username resmi');

  // Test 2.3: Mock Synchronization of Teachers to Users Table
  const mockGurus = [
    {
      id: 'guru-001',
      sekolah_id: 'sch-001',
      nip: '198501012010011001',
      nama_guru: 'Fitri Aprilia Dotulong, S.Pd.',
      mata_pelajaran: 'Bahasa Inggris',
      status: 'Aktif'
    },
    {
      id: 'guru-002',
      sekolah_id: 'sch-001',
      nip: '199002022015021002',
      nama_guru: 'Moh. Candra Podomi, M.Pd.',
      mata_pelajaran: 'Matematika',
      status: 'Aktif'
    },
    {
      id: 'guru-003',
      sekolah_id: 'sch-001',
      nip: '199505052020051003',
      nama_guru: 'Fitra Suryazana Mamonto',
      mata_pelajaran: 'Informatika',
      status: 'Aktif'
    }
  ];

  const mockUsers: any[] = [
    // Suppose Fitra already has an account with a customized password
    {
      id: 'user-003',
      username: '199505052020051003',
      password: 'CustomSecretPassword123!',
      nama: 'Fitra Suryazana Mamonto',
      role: 'Guru',
      sekolah_id: 'sch-001'
    }
  ];

  const mockSupabase = {
    from: (table: string) => {
      let currentTable = table;
      let filterRole: string | null = null;
      let filterSekolah: string | null = null;
      let filterIlikeUsername: string | null = null;
      let excludeId: string | null = null;
      return {
        select: (cols: string) => {
          return {
            eq: function(field: string, val: string) {
              if (field === 'role') filterRole = val;
              if (field === 'sekolah_id') filterSekolah = val;
              if (field === 'username') filterIlikeUsername = val;
              return this;
            },
            ilike: function(field: string, val: string) {
              if (field === 'username') filterIlikeUsername = val;
              return this;
            },
            neq: function(field: string, val: string) {
              if (field === 'id') excludeId = val;
              return this;
            },
            maybeSingle: async function() {
              if (currentTable === 'users' && filterIlikeUsername) {
                const found = mockUsers.find(
                  u => (!excludeId || u.id !== excludeId) &&
                       u.username?.toLowerCase() === filterIlikeUsername?.toLowerCase()
                );
                return { data: found || null, error: null };
              }
              return { data: null, error: null };
            },
            then: function(resolve: any) {
              if (currentTable === 'data_guru') {
                resolve({ data: [...mockGurus], error: null });
              } else if (currentTable === 'users') {
                const filtered = mockUsers.filter(u => (!filterRole || u.role === filterRole));
                resolve({ data: [...filtered], error: null });
              } else {
                resolve({ data: [], error: null });
              }
            }
          };
        },
        insert: (rows: any[]) => {
          for (const r of rows) {
            mockUsers.push({ ...r });
          }
          return {
            select: () => ({ data: rows, error: null }),
            then: (resolve: any) => resolve({ data: rows, error: null })
          };
        },
        update: (payload: any) => {
          return {
            eq: function(field: string, val: string) {
              if (currentTable === 'users' && field === 'id') {
                const u = mockUsers.find(x => x.id === val);
                if (u) Object.assign(u, payload);
              }
              if (currentTable === 'data_guru' && field === 'id') {
                const g = mockGurus.find(x => x.id === val);
                if (g) Object.assign(g, payload);
              }
              return this;
            },
            then: (resolve: any) => resolve({ data: null, error: null })
          };
        }
      };
    }
  };

  const syncResult = await syncTeacherAccounts(mockSupabase, 'sch-001');
  assert.strictEqual(syncResult.success, true);
  assert.strictEqual(syncResult.totalTeachers, 3);
  assert.strictEqual(syncResult.createdCount, 2, 'Must create 2 accounts for teachers without accounts');

  // Verify created accounts have username = NIP and password default = NIP27
  const acc1 = syncResult.accounts.find(a => a.nip === '198501012010011001');
  assert.ok(acc1);
  assert.strictEqual(acc1.username, '198501012010011001');
  assert.strictEqual(acc1.defaultPassword, '19850101201001100127');
  assert.strictEqual(acc1.hasAccount, true);

  const acc2 = syncResult.accounts.find(a => a.nip === '199002022015021002');
  assert.ok(acc2);
  assert.strictEqual(acc2.username, '199002022015021002');
  assert.strictEqual(acc2.defaultPassword, '19900202201502100227');

  // Verify existing account (Fitra) preserved its custom password
  const fitraUserInDb = mockUsers.find(u => u.username === '199505052020051003');
  assert.strictEqual(fitraUserInDb?.password, 'CustomSecretPassword123!', 'Existing teacher password must not be overwritten by auto-sync');
  pass('2.3: syncTeacherAccounts secara otomatis mendaftarkan guru baru dengan username NIP dan password default NIP27 serta menjaga password lama');

  // ==========================================================================
  // SUITE 3: Credential Management by Admin (R3)
  // ==========================================================================
  console.log(`\n${BOLD}--- SUITE 3: Manajemen Kredensial Pengguna oleh Admin (R3) ---${RESET}`);

  // Test 3.1: Admin updates username and password for a teacher
  const user1 = mockUsers.find(u => u.username === '198501012010011001');
  assert.ok(user1, 'User 1 must exist');

  const updateRes1 = await updateTeacherCredentials(mockSupabase, {
    userId: user1.id,
    guruId: 'guru-001',
    oldUsername: '198501012010011001',
    newUsername: '198501012010011001_v2',
    newPassword: 'PasswordBaruGuru2026!'
  });

  assert.strictEqual(updateRes1.success, true);
  assert.strictEqual(user1.username, '198501012010011001_v2');
  assert.strictEqual(user1.password, 'PasswordBaruGuru2026!');
  pass('3.1: Admin dapat memperbarui username dan password akun guru melalui antarmuka');

  // Test 3.2: Empty username rejected
  const updateResEmpty = await updateTeacherCredentials(mockSupabase, {
    userId: user1.id,
    newUsername: '   '
  });
  assert.strictEqual(updateResEmpty.success, false);
  pass('3.2: Validasi menolak username kosong');

  // Test 3.3: Admin resets password to default NIP27
  const resetRes = await resetTeacherPasswordToDefault(mockSupabase, {
    userId: user1.id,
    username: user1.username,
    nip: '198501012010011001'
  });
  assert.strictEqual(resetRes.success, true);
  assert.strictEqual(resetRes.defaultPassword, '19850101201001100127');
  assert.strictEqual(user1.password, '19850101201001100127');
  pass('3.3: Admin dapat mereset kata sandi akun guru ke default NIP27');

  // Test 3.4: Verify login authentication logic compatibility
  // In Supabase verify_login: u.password = p_password OR u.password = crypt(p_password, u.password)
  function verifyLoginMock(userObj: any, inputUsername: string, inputPass: string) {
    if (userObj.username.toLowerCase() !== inputUsername.trim().toLowerCase()) return false;
    return userObj.password === inputPass;
  }
  assert.strictEqual(verifyLoginMock(user1, user1.username, '19850101201001100127'), true);
  pass('3.4: Kredensial yang diperbarui berhasil disimpan dan valid untuk autentikasi login');

  // Test 3.5: Reject dummy username
  const dummyRes = await updateTeacherCredentials(mockSupabase, {
    userId: user1.id,
    newUsername: 'testuser'
  });
  assert.strictEqual(dummyRes.success, false);
  assert.ok(dummyRes.message.includes('dummy') || dummyRes.message.includes('percobaan'));
  pass('3.5: Validasi menolak username dummy / percobaan (testuser)');

  // Test 3.6: Reject forbidden username
  const forbiddenRes = await updateTeacherCredentials(mockSupabase, {
    userId: user1.id,
    newUsername: 'ahmad_dahlan'
  });
  assert.strictEqual(forbiddenRes.success, false);
  assert.ok(forbiddenRes.message.includes('dinonaktifkan'));
  pass('3.6: Validasi menolak username terlarang / usang (ahmad_dahlan)');

  // Test 3.7: Prevent collision when updating to an existing username
  const collisionRes = await updateTeacherCredentials(mockSupabase, {
    userId: user1.id,
    newUsername: '199505052020051003' // belonging to Fitra
  });
  assert.strictEqual(collisionRes.success, false);
  assert.ok(collisionRes.message.includes('sudah digunakan'));
  pass('3.7: Validasi menolak pembaruan username yang bertabrakan dengan akun lain');

  // Test 3.8: Whitespace, Null & Fallback Tolerances
  const spacedNip = resolveTeacherUsername({ nip: ' 19850101 201001 1 001 ' });
  assert.strictEqual(spacedNip, '198501012010011001');
  const spacedPwd = getDefaultTeacherPassword(' 19850101 201001 1 001 ');
  assert.strictEqual(spacedPwd, '19850101201001100127');
  const nullPwd = getDefaultTeacherPassword('null');
  assert.strictEqual(nullPwd, 'guru27');
  const emptyPwd = getDefaultTeacherPassword('-');
  assert.strictEqual(emptyPwd, 'guru27');
  pass('3.8: Sanitasi toleran terhadap spasi internal, null, dash, dan menghasilkan default password NIP27 konsisten');

  // ==========================================================================
  // SUITE 4: Non-Regression & Master Data Integrity (R4)
  // ==========================================================================
  console.log(`\n${BOLD}--- SUITE 4: Integritas Sistem dan Non-Regresi (R4) ---${RESET}`);

  // Test 4.1: Master Data modification allowed only for Admin
  assert.strictEqual(isMasterDataModificationAllowed('Admin'), true);
  assert.strictEqual(isMasterDataModificationAllowed('Superadmin'), true);
  assert.strictEqual(isMasterDataModificationAllowed('Guru'), false);
  assert.strictEqual(isMasterDataModificationAllowed('Siswa'), false);
  assert.strictEqual(isMasterDataModificationAllowed('dinaspendidikan'), false);
  pass('4.1: isMasterDataModificationAllowed tetap melindungi hak akses modifikasi data master');

  // Test 4.2: Aliases preserve existing views
  assert.strictEqual(VIEW_ALIASES['view-sistem-blok'].view, 'view-admin-data');
  assert.strictEqual(VIEW_ALIASES['view-sistem-blok'].tab, 'blok');
  assert.strictEqual(VIEW_ALIASES['view-admin-pengguna'].view, 'view-admin-data');
  assert.strictEqual(VIEW_ALIASES['view-admin-pengguna'].tab, 'Pengguna');
  pass('4.2: VIEW_ALIASES terintegrasi tanpa regresi pada alias eksisting');

  console.log(`\n${CYAN}========================================================================${RESET}`);
  console.log(`${GREEN}${BOLD}TOTAL CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}${RESET}`);
  console.log(`${CYAN}========================================================================${RESET}`);

  if (failedChecks > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
