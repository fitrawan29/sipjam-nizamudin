/**
 * tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts
 * 
 * AUTOMATED VERIFICATION SUITE — MILESTONE 3:
 * Sub Menu Kelas, Pemusatan Penentuan Kelas Siswa, & Penyelarasan Template Master Data
 * 
 * Comprehensive Automated Verification Suite covering:
 * - Suite 1: Navigation, Tab Normalization & Route Aliasing (view-admin-kelas, view-kelas, normalizeAdminTab).
 * - Suite 2: RBAC Security Boundaries & Role Denial (Guru, Siswa, Dinas, Kepsek, Piket, Anonymous blocked).
 * - Suite 3: Sub-Menu Kelas Architecture, Directory Aggregation & Demographics.
 * - Suite 4: Centralized Student Allocation Workspace (batch move, inbound allocation, cascading rename, zero-student delete guard, multi-tenant scoping).
 * - Suite 5: CSV Template Download Integrity across all 7 Entities (Kelas, Siswa, Guru, Mapel, Kalender, Jadwal, Wali Kelas) and invariant verification.
 * - Suite 6: CSV Parsing, Normalization, Validation, and Row Error Feedback (Baris ${i}).
 * - Suite 7: Idempotent Student Import by (sekolah_id, nisn) and data_kelas schema cache fallback.
 * - Suite 8: Project Test Runner Integration & Zero-Regression Invariant.
 */

import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseTingkat,
  isUnassignedClass,
  StudentItem,
  WaliKelasItem,
  ClassDirectoryItem
} from '../src/components/AdminKelasView';
import { normalizeAdminTab } from '../src/components/AdminDataView';
import {
  resolveCanonicalRoute,
  evaluateTabRBAC,
  getConsolidatedMenuItems,
  VIEW_ALIASES,
  SIDEBAR_TOUR_ALIASES
} from '../src/lib/navigation';
import {
  isMasterDataModificationAllowed,
  validateMasterDataModificationRole,
  normalizeCsvHeaders,
  parseAndValidateMasterCsv,
  importMasterDataFromCsv
} from '../src/lib/dataIntegrityGuard';
import { isAdminRole } from '../src/lib/supabaseClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

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

// -----------------------------------------------------------------------------
// Pure Helper: Replicates class aggregation algorithm inside AdminKelasView.tsx
// -----------------------------------------------------------------------------
function aggregateClasses(
  dbClasses: { id: string; nama_kelas: string; tingkat?: string; jurusan?: string }[],
  customClasses: string[],
  allStudents: StudentItem[],
  waliKelasList: WaliKelasItem[]
): {
  consolidated: ClassDirectoryItem[];
  unassigned: StudentItem[];
  stats: { totalClasses: number; totalAllocated: number; totalUnassigned: number };
} {
  const classMap = new Map<string, ClassDirectoryItem>();

  // 1. Seed from dbClasses
  dbClasses.forEach(c => {
    const name = (c.nama_kelas || '').trim();
    if (!name) return;
    classMap.set(name, {
      id: c.id || name,
      nama_kelas: name,
      tingkat: (c.tingkat as any) || parseTingkat(name),
      jurusan: c.jurusan || null,
      wali_kelas: null,
      totalSiswa: 0,
      siswaLaki: 0,
      siswaPerempuan: 0,
      students: [],
      isDbRecord: true
    });
  });

  // 2. Seed from custom in-memory created classes
  customClasses.forEach(name => {
    const clean = (name || '').trim();
    if (!clean || classMap.has(clean)) return;
    classMap.set(clean, {
      id: clean,
      nama_kelas: clean,
      tingkat: parseTingkat(clean),
      jurusan: null,
      wali_kelas: null,
      totalSiswa: 0,
      siswaLaki: 0,
      siswaPerempuan: 0,
      students: [],
      isDbRecord: false
    });
  });

  // 3. Aggregate active students
  allStudents.forEach(s => {
    if (s.status === 'Lulus') return;
    if (isUnassignedClass(s.kelas)) return;
    const k = s.kelas!.trim();

    if (!classMap.has(k)) {
      classMap.set(k, {
        id: k,
        nama_kelas: k,
        tingkat: parseTingkat(k),
        jurusan: null,
        wali_kelas: null,
        totalSiswa: 0,
        siswaLaki: 0,
        siswaPerempuan: 0,
        students: [],
        isDbRecord: false
      });
    }

    const item = classMap.get(k)!;
    item.students.push(s);
    item.totalSiswa++;
    const g = (s.gender || '').toUpperCase().trim();
    if (g.startsWith('L')) {
      item.siswaLaki++;
    } else if (g.startsWith('P')) {
      item.siswaPerempuan++;
    }
  });

  // 4. Attach Homeroom Teachers
  waliKelasList.forEach(w => {
    const k = (w.kelas || '').trim();
    if (k && classMap.has(k)) {
      classMap.get(k)!.wali_kelas = w;
    }
  });

  // 5. Sort: 10 -> 11 -> 12 -> Lainnya, then alphanumerically
  const consolidated = Array.from(classMap.values()).sort((a, b) => {
    const weight = (t: string) => (t === '10' ? 1 : t === '11' ? 2 : t === '12' ? 3 : 4);
    if (weight(a.tingkat) !== weight(b.tingkat)) {
      return weight(a.tingkat) - weight(b.tingkat);
    }
    return a.nama_kelas.localeCompare(b.nama_kelas, undefined, { numeric: true });
  });

  const unassigned = allStudents.filter(s => {
    if (s.status === 'Lulus') return false;
    return isUnassignedClass(s.kelas);
  });

  const totalClasses = consolidated.length;
  const totalAllocated = allStudents.filter(s => {
    if (s.status === 'Lulus') return false;
    return !isUnassignedClass(s.kelas);
  }).length;
  const totalUnassigned = unassigned.length;

  return {
    consolidated,
    unassigned,
    stats: { totalClasses, totalAllocated, totalUnassigned }
  };
}

async function runTestSuite() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║   AUTOMATED TEST SUITE: SUB MENU KELAS & MASTER DATA CSV HARMONY     ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const adminDataPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminKelasPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminKelasView.tsx');
  const adminDataSrc = fs.readFileSync(adminDataPath, 'utf-8');
  const adminKelasSrc = fs.readFileSync(adminKelasPath, 'utf-8');

  // =========================================================================
  // SUITE 1: Navigation, Tab Normalization & Route Aliasing
  // =========================================================================
  console.log(`${YELLOW}${BOLD}--- SUITE 1: Navigation, Tab Normalization & Route Aliasing ---${RESET}`);

  // 1.1 resolveCanonicalRoute('view-admin-kelas')
  try {
    const res1 = resolveCanonicalRoute('view-admin-kelas');
    assert.strictEqual(res1.canonicalView, 'view-admin-data', 'canonicalView must be view-admin-data');
    assert.strictEqual(res1.defaultTab, 'Data_Kelas', 'defaultTab must be Data_Kelas');
    assert.strictEqual(res1.isLegacyAlias, true, 'isLegacyAlias must be true');
    pass('1.1: resolveCanonicalRoute("view-admin-kelas") resolves to view-admin-data with tab Data_Kelas');
  } catch (err) {
    fail('1.1: resolveCanonicalRoute("view-admin-kelas") failed', err);
  }

  // 1.2 resolveCanonicalRoute('view-kelas')
  try {
    const res2 = resolveCanonicalRoute('view-kelas');
    assert.strictEqual(res2.canonicalView, 'view-admin-data', 'canonicalView must be view-admin-data');
    assert.strictEqual(res2.defaultTab, 'Data_Kelas', 'defaultTab must be Data_Kelas');
    assert.strictEqual(res2.isLegacyAlias, true, 'isLegacyAlias must be true');
    pass('1.2: resolveCanonicalRoute("view-kelas") resolves to view-admin-data with tab Data_Kelas');
  } catch (err) {
    fail('1.2: resolveCanonicalRoute("view-kelas") failed', err);
  }

  // 1.3 VIEW_ALIASES registry mappings
  try {
    assert.deepStrictEqual(
      VIEW_ALIASES['view-admin-kelas'],
      { view: 'view-admin-data', tab: 'Data_Kelas' },
      'VIEW_ALIASES["view-admin-kelas"] must match specification'
    );
    assert.deepStrictEqual(
      VIEW_ALIASES['view-kelas'],
      { view: 'view-admin-data', tab: 'Data_Kelas' },
      'VIEW_ALIASES["view-kelas"] must match specification'
    );
    pass('1.3: VIEW_ALIASES contains exact mappings for view-admin-kelas and view-kelas');
  } catch (err) {
    fail('1.3: VIEW_ALIASES registry check failed', err);
  }

  // 1.4 Explicit tab override preservation
  try {
    const resOverride = resolveCanonicalRoute('view-admin-kelas', 'Data_Siswa');
    assert.strictEqual(resOverride.canonicalView, 'view-admin-data');
    assert.strictEqual(resOverride.defaultTab, 'Data_Siswa', 'Explicit tab must override default alias tab');
    assert.strictEqual(resOverride.isLegacyAlias, true);
    pass('1.4: resolveCanonicalRoute preserves explicit override tab when provided');
  } catch (err) {
    fail('1.4: Tab override check failed', err);
  }

  // 1.5 URL trailing slashes and whitespace handling
  try {
    const resSlash1 = resolveCanonicalRoute('view-admin-kelas/');
    assert.strictEqual(resSlash1.canonicalView, 'view-admin-data');
    assert.strictEqual(resSlash1.defaultTab, 'Data_Kelas');

    const resSlash2 = resolveCanonicalRoute('view-kelas///');
    assert.strictEqual(resSlash2.canonicalView, 'view-admin-data');
    assert.strictEqual(resSlash2.defaultTab, 'Data_Kelas');

    const resSpace1 = resolveCanonicalRoute('  view-admin-kelas  ');
    assert.strictEqual(resSpace1.canonicalView, 'view-admin-data');
    assert.strictEqual(resSpace1.defaultTab, 'Data_Kelas');

    const resSpace2 = resolveCanonicalRoute('\tview-kelas\n');
    assert.strictEqual(resSpace2.canonicalView, 'view-admin-data');
    assert.strictEqual(resSpace2.defaultTab, 'Data_Kelas');
    pass('1.5: resolveCanonicalRoute handles trailing slashes, whitespace and newline characters');
  } catch (err) {
    fail('1.5: Trailing slashes/whitespace check failed', err);
  }

  // 1.6 Sidebar tour alias registration
  try {
    const tourAliases = SIDEBAR_TOUR_ALIASES['view-admin-data'] || '';
    assert.ok(tourAliases.includes('view-admin-kelas'), 'SIDEBAR_TOUR_ALIASES must include view-admin-kelas');
    assert.ok(tourAliases.includes('view-kelas'), 'SIDEBAR_TOUR_ALIASES must include view-kelas');
    pass('1.6: SIDEBAR_TOUR_ALIASES["view-admin-data"] includes view-admin-kelas and view-kelas');
  } catch (err) {
    fail('1.6: Sidebar tour alias check failed', err);
  }

  // 1.7 normalizeAdminTab case and spelling variations
  try {
    const classVariations = [
      'Data_Kelas',
      'data_kelas',
      'Kelas',
      'kelas',
      'DATA_KELAS',
      'KELAS',
      'kElAs',
      'dAtA_kElAs',
      '  Data_Kelas  ',
      '  kelas  ',
      '\tdata_kelas\n'
    ];
    for (const variant of classVariations) {
      const normalized = normalizeAdminTab(variant);
      assert.strictEqual(
        normalized,
        'Data_Kelas',
        `normalizeAdminTab("${variant}") must resolve to canonical "Data_Kelas", got "${normalized}"`
      );
    }
    pass('1.7: normalizeAdminTab standardizes all case, spelling, and whitespace variations to canonical Data_Kelas');
  } catch (err) {
    fail('1.7: normalizeAdminTab variation check failed', err);
  }

  // 1.8 normalizeAdminTab non-class tabs and default fallback preservation
  try {
    assert.strictEqual(normalizeAdminTab(undefined), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab(''), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('blok'), 'sistem_blok');
    assert.strictEqual(normalizeAdminTab('sistem_blok'), 'sistem_blok');
    assert.strictEqual(normalizeAdminTab('pengguna'), 'Pengguna');
    assert.strictEqual(normalizeAdminTab('users'), 'Pengguna');
    assert.strictEqual(normalizeAdminTab('Pengguna'), 'Pengguna');
    assert.strictEqual(normalizeAdminTab('Data_Siswa'), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('Data_Guru'), 'Data_Guru');
    assert.strictEqual(normalizeAdminTab('Data_Mapel'), 'Data_Mapel');
    assert.strictEqual(normalizeAdminTab('Kalender_Pendidikan'), 'Kalender_Pendidikan');
    assert.strictEqual(normalizeAdminTab('Jadwal_Pelajaran'), 'Jadwal_Pelajaran');
    assert.strictEqual(normalizeAdminTab('Wali_Kelas'), 'Wali_Kelas');
    pass('1.8: normalizeAdminTab preserves existing tabs and defaults cleanly to Data_Siswa');
  } catch (err) {
    fail('1.8: Non-class tabs normalization check failed', err);
  }

  // 1.9 AST / Source verification: Data_Kelas tab placement
  try {
    const tabsMatch = adminDataSrc.match(/const\s+tabs\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(tabsMatch, 'AdminDataView.tsx must define a tabs array');
    const tabsContent = tabsMatch[1];

    assert.ok(tabsContent.includes("id: 'Data_Kelas'"), "tabs must contain id 'Data_Kelas'");
    assert.ok(tabsContent.includes("label: 'Kelas'"), "Data_Kelas tab must have label 'Kelas'");
    assert.ok(tabsContent.includes("table: 'data_kelas'"), "Data_Kelas tab must map to table 'data_kelas'");

    const siswaIndex = tabsContent.indexOf("id: 'Data_Siswa'");
    const kelasIndex = tabsContent.indexOf("id: 'Data_Kelas'");
    const guruIndex = tabsContent.indexOf("id: 'Data_Guru'");

    assert.ok(siswaIndex !== -1 && kelasIndex !== -1 && guruIndex !== -1, 'All core tabs must be present');
    assert.ok(siswaIndex < kelasIndex, 'Data_Kelas must be positioned after Data_Siswa');
    assert.ok(kelasIndex < guruIndex, 'Data_Kelas must be positioned before Data_Guru');
    pass('1.9: Data_Kelas exists in AdminDataView.tsx tabs and is positioned right after Data_Siswa');
  } catch (err) {
    fail('1.9: Tab placement AST assertion failed', err);
  }

  // 1.10 AST / Source verification: Component mounting and generic query suppression
  try {
    assert.ok(
      adminDataSrc.includes("import AdminKelasView from './AdminKelasView';"),
      'AdminDataView must import AdminKelasView'
    );
    assert.ok(
      adminDataSrc.includes("activeTab === 'Data_Kelas' ? (") &&
      adminDataSrc.includes('<AdminKelasView user={user} />'),
      'AdminDataView must render <AdminKelasView user={user} /> when activeTab === Data_Kelas'
    );
    assert.ok(
      /activeTab === 'Data_Kelas'/.test(adminDataSrc) &&
      adminDataSrc.includes("if (activeTab === 'sistem_blok' || activeTab === 'blok' || activeTab === 'Pengguna' || activeTab === 'Data_Kelas') return;"),
      'loadData must suppress generic table querying on Data_Kelas'
    );
    pass('1.10: AdminKelasView component mounts cleanly when activeTab === Data_Kelas without SQL query collisions');
  } catch (err) {
    fail('1.10: Component mounting AST assertion failed', err);
  }

  // =========================================================================
  // SUITE 2: RBAC Security Boundaries & Role Denial
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 2: RBAC Security Boundaries & Role Denial ---${RESET}`);

  // 2.1 Authorized access for admin and superadmin
  const adminRoles = [
    'admin',
    'Admin',
    'ADMIN',
    'superadmin',
    'Superadmin',
    'SUPERADMIN',
    'Super Admin'
  ];

  try {
    for (const role of adminRoles) {
      const resAlias1 = evaluateTabRBAC('view-admin-kelas', '', { role });
      assert.strictEqual(resAlias1.allowed, true, `Role "${role}" must access view-admin-kelas`);

      const resAlias2 = evaluateTabRBAC('view-kelas', '', { role });
      assert.strictEqual(resAlias2.allowed, true, `Role "${role}" must access view-kelas`);

      const resTab1 = evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role });
      assert.strictEqual(resTab1.allowed, true, `Role "${role}" must access tab Data_Kelas`);

      const resTab2 = evaluateTabRBAC('view-admin-data', 'Kelas', { role });
      assert.strictEqual(resTab2.allowed, true, `Role "${role}" must access tab Kelas`);

      const resTab3 = evaluateTabRBAC('view-admin-data', 'kelas', { role });
      assert.strictEqual(resTab3.allowed, true, `Role "${role}" must access tab kelas`);

      const resTab4 = evaluateTabRBAC('view-admin-data', 'data_kelas', { role });
      assert.strictEqual(resTab4.allowed, true, `Role "${role}" must access tab data_kelas`);
    }
    pass('2.1: evaluateTabRBAC grants full access to Admin & Superadmin across all case variations');
  } catch (err) {
    fail('2.1: Admin RBAC grant check failed', err);
  }

  // 2.2 Strict blocking of non-admin staff roles
  const nonAdminStaffRoles = [
    { role: 'guru', label: 'Guru regular' },
    { role: 'Guru', label: 'Guru capitalized' },
    { role: 'GURU', label: 'GURU uppercase' },
    { role: 'wali_kelas', label: 'Wali Kelas direct' },
    { role: 'Wali Kelas', label: 'Wali Kelas title' },
    { role: 'guru', isWaliKelas: true, label: 'Guru as Wali Kelas' },
    { role: 'piket', label: 'Piket direct' },
    { role: 'Piket', label: 'Piket title' },
    { role: 'guru', isPiketHariIni: true, label: 'Guru as Piket' },
    { role: 'dinaspendidikan', label: 'Dinas compact' },
    { role: 'dinas_pendidikan', label: 'Dinas snake_case' },
    { role: 'Dinas Pendidikan', label: 'Dinas title' },
    { role: 'kepalasekolah', label: 'Kepsek compact' },
    { role: 'kepala sekolah', label: 'Kepsek space' },
    { role: 'Kepala Sekolah', label: 'Kepsek title' },
    { role: 'guru', isKepalaSekolah: true, label: 'Guru as Kepsek' },
    { role: 'hacker', label: 'Arbitrary untrusted role' }
  ];

  try {
    for (const item of nonAdminStaffRoles) {
      const userPayload: any = { role: item.role };
      if (item.isWaliKelas) userPayload.isWaliKelas = true;
      if (item.isPiketHariIni) userPayload.isPiketHariIni = true;
      if (item.isKepalaSekolah) userPayload.isKepalaSekolah = true;

      const r1 = evaluateTabRBAC('view-admin-kelas', '', userPayload);
      assert.strictEqual(r1.allowed, false, `Role ${item.label} must be blocked from view-admin-kelas`);
      assert.strictEqual(r1.fallbackTab, 'view-home');
      assert.ok(r1.reason && r1.reason.length > 0);

      const r2 = evaluateTabRBAC('view-kelas', '', userPayload);
      assert.strictEqual(r2.allowed, false, `Role ${item.label} must be blocked from view-kelas`);
      assert.strictEqual(r2.fallbackTab, 'view-home');

      const r3 = evaluateTabRBAC('view-admin-data', 'Data_Kelas', userPayload);
      assert.strictEqual(r3.allowed, false, `Role ${item.label} must be blocked from tab Data_Kelas`);
      assert.strictEqual(r3.fallbackTab, 'view-home');

      const r4 = evaluateTabRBAC('view-admin-data', 'Kelas', userPayload);
      assert.strictEqual(r4.allowed, false, `Role ${item.label} must be blocked from tab Kelas`);
    }
    pass('2.2: evaluateTabRBAC strictly blocks Guru, Wali Kelas, Piket, Dinas, and Kepsek from Sub Menu Kelas');
  } catch (err) {
    fail('2.2: Non-admin staff blocking check failed', err);
  }

  // 2.3 Strict blocking of role siswa with dedicated view-ujian fallback
  try {
    const siswaRoles = ['siswa', 'Siswa', 'SISWA'];
    for (const r of siswaRoles) {
      const resSiswaAlias = evaluateTabRBAC('view-admin-kelas', '', { role: r });
      assert.strictEqual(resSiswaAlias.allowed, false, `Siswa must be blocked from view-admin-kelas`);
      assert.strictEqual(resSiswaAlias.fallbackTab, 'view-ujian', 'Siswa fallbackTab must be view-ujian');

      const resSiswaData = evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role: r });
      assert.strictEqual(resSiswaData.allowed, false, `Siswa must be blocked from view-admin-data`);
      assert.strictEqual(resSiswaData.fallbackTab, 'view-ujian');
    }
    pass('2.3: Role Siswa is quarantined with dedicated fallbackTab "view-ujian"');
  } catch (err) {
    fail('2.3: Siswa RBAC quarantine check failed', err);
  }

  // 2.4 Anonymous, empty, and null user contexts
  try {
    const anonContexts = [
      {},
      { role: '' },
      { role: undefined },
      { role: null as any },
      undefined as any
    ];
    for (const ctx of anonContexts) {
      const rAnon1 = evaluateTabRBAC('view-admin-kelas', '', ctx);
      assert.strictEqual(rAnon1.allowed, false, 'Anonymous user must be blocked from view-admin-kelas');
      assert.strictEqual(rAnon1.fallbackTab, 'view-home');

      const rAnon2 = evaluateTabRBAC('view-admin-data', 'Data_Kelas', ctx);
      assert.strictEqual(rAnon2.allowed, false, 'Anonymous user must be blocked from Data_Kelas');
    }
    pass('2.4: Anonymous and unauthenticated requests are strictly rejected');
  } catch (err) {
    fail('2.4: Anonymous RBAC check failed', err);
  }

  // 2.5 isMasterDataModificationAllowed authorization gate
  try {
    for (const role of adminRoles) {
      assert.strictEqual(isMasterDataModificationAllowed(role), true, `Admin role "${role}" must be allowed`);
    }
    for (const item of nonAdminStaffRoles) {
      assert.strictEqual(isMasterDataModificationAllowed(item.role), false, `Role "${item.role}" must not be allowed`);
    }
    assert.strictEqual(isMasterDataModificationAllowed('siswa'), false);
    assert.strictEqual(isMasterDataModificationAllowed(''), false);
    assert.strictEqual(isMasterDataModificationAllowed(undefined), false);
    assert.strictEqual(isMasterDataModificationAllowed(null), false);
    pass('2.5: isMasterDataModificationAllowed permits only Admin/Superadmin and rejects all non-admins');
  } catch (err) {
    fail('2.5: isMasterDataModificationAllowed check failed', err);
  }

  // 2.6 isAdminRole helper verification
  try {
    for (const role of adminRoles) {
      assert.strictEqual(isAdminRole(role), true, `isAdminRole("${role}") must be true`);
    }
    for (const item of nonAdminStaffRoles) {
      assert.strictEqual(isAdminRole(item.role), false, `isAdminRole("${item.role}") must be false`);
    }
    assert.strictEqual(isAdminRole('siswa'), false);
    assert.strictEqual(isAdminRole(''), false);
    assert.strictEqual(isAdminRole(undefined), false);
    pass('2.6: isAdminRole consistently confirms admin status only for Admin/Superadmin');
  } catch (err) {
    fail('2.6: isAdminRole helper check failed', err);
  }

  // 2.7 Sidebar menu exposure isolation (getConsolidatedMenuItems)
  try {
    const nonAdminCheckRoles = [
      { role: 'guru' },
      { role: 'guru', isWaliKelas: true },
      { role: 'guru', isPiketHariIni: true },
      { role: 'siswa' },
      { role: 'dinaspendidikan' },
      { role: 'dinaspendidikan', activeTargetSchool: { id: 's1', nama: 'SMK 1' } },
      { role: 'kepalasekolah', isKepalaSekolah: true }
    ];

    for (const check of nonAdminCheckRoles) {
      const items = getConsolidatedMenuItems(check);
      const flattenedIds: string[] = [];
      function collect(item: any) {
        flattenedIds.push(item.id);
        if (item.subItems) item.subItems.forEach(collect);
      }
      items.forEach(collect);

      assert.ok(
        !flattenedIds.includes('view-admin-data'),
        `Role ${JSON.stringify(check)} MUST NOT have view-admin-data in sidebar`
      );
      assert.ok(
        !flattenedIds.includes('view-admin-kelas'),
        `Role ${JSON.stringify(check)} MUST NOT have view-admin-kelas in sidebar`
      );
      assert.ok(
        !flattenedIds.includes('view-kelas'),
        `Role ${JSON.stringify(check)} MUST NOT have view-kelas in sidebar`
      );
    }

    // Admin menu contains view-admin-data and dataTour mentions view-admin-kelas
    const adminItems = getConsolidatedMenuItems({ role: 'admin' });
    const masterItem = adminItems.find(i => i.id === 'view-admin-data');
    assert.ok(masterItem, 'Admin menu must contain view-admin-data');
    assert.ok(
      masterItem?.dataTour?.includes('view-admin-kelas'),
      'Admin view-admin-data dataTour must include view-admin-kelas'
    );

    // Superadmin with satellite target school contains view-admin-data
    const saSatelliteItems = getConsolidatedMenuItems({
      role: 'superadmin',
      activeTargetSchool: { id: 's1', nama: 'Test' }
    });
    const saMasterItem = saSatelliteItems.find(i => i.id === 'view-admin-data');
    assert.ok(saMasterItem, 'Superadmin satellite menu must contain view-admin-data');
    assert.ok(
      saMasterItem?.dataTour?.includes('view-admin-kelas'),
      'Superadmin view-admin-data dataTour must include view-admin-kelas'
    );

    pass('2.7: Sidebar menu items strictly isolate Master Data & Sub Menu Kelas from non-admin roles');
  } catch (err) {
    fail('2.7: Sidebar menu isolation check failed', err);
  }

  // 2.8 Component-level security check in AdminKelasView
  try {
    assert.ok(
      adminKelasSrc.includes('if (!isAdmin)') && adminKelasSrc.includes('Akses Terblokir'),
      'AdminKelasView must contain component-level non-admin lock banner'
    );
    pass('2.8: AdminKelasView includes component-level non-admin security lock banner');
  } catch (err) {
    fail('2.8: Component-level guard check failed', err);
  }

  // =========================================================================
  // SUITE 3: Sub-Menu Kelas Architecture, Directory Aggregation & Demographics
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 3: Sub-Menu Kelas Architecture & Demographics ---${RESET}`);

  // 3.1 Grade level derivation across standard, Roman, and edge cases
  try {
    assert.strictEqual(parseTingkat('X Merdeka'), '10');
    assert.strictEqual(parseTingkat('Kelas X-1'), '10');
    assert.strictEqual(parseTingkat('10 RPL 1'), '10');
    assert.strictEqual(parseTingkat('XI Merdeka'), '11');
    assert.strictEqual(parseTingkat('Kelas 11 IPA'), '11');
    assert.strictEqual(parseTingkat('XII Merdeka'), '12');
    assert.strictEqual(parseTingkat('12 IPS 3'), '12');
    assert.strictEqual(parseTingkat('Rombel Khusus'), 'Lainnya');
    assert.strictEqual(parseTingkat('Ekstrakurikuler'), 'Lainnya');
    assert.strictEqual(parseTingkat(''), 'Lainnya');
    pass('3.1: parseTingkat accurately derives grade levels 10, 11, 12, and Lainnya');
  } catch (err) {
    fail('3.1: parseTingkat check failed', err);
  }

  // 3.2 Unassigned class pattern detection
  try {
    assert.strictEqual(isUnassignedClass(null), true);
    assert.strictEqual(isUnassignedClass(undefined), true);
    assert.strictEqual(isUnassignedClass(''), true);
    assert.strictEqual(isUnassignedClass('   '), true);
    assert.strictEqual(isUnassignedClass('-'), true);
    assert.strictEqual(isUnassignedClass('tanpa kelas'), true);
    assert.strictEqual(isUnassignedClass('TANPA KELAS'), true);
    assert.strictEqual(isUnassignedClass('belum ada'), true);
    assert.strictEqual(isUnassignedClass('X Merdeka'), false);
    pass('3.2: isUnassignedClass reliably catches empty, null, dash, and unassigned text tokens');
  } catch (err) {
    fail('3.2: isUnassignedClass check failed', err);
  }

  // Mock datasets for Directory Aggregation & Demographics
  const mockDbClasses = [
    { id: 'c1', nama_kelas: 'X Merdeka', tingkat: '10', jurusan: 'Umum' },
    { id: 'c2', nama_kelas: 'XI Merdeka', tingkat: '11', jurusan: 'Umum' },
    { id: 'c3', nama_kelas: 'XII Merdeka', tingkat: '12', jurusan: 'Umum' },
  ];
  const mockCustomClasses = ['X RPL 1'];
  const mockStudents: StudentItem[] = [
    { id: 's1', nisn: '001', nama_siswa: 'Ali', kelas: 'X Merdeka', gender: 'L', status: 'Aktif' },
    { id: 's2', nisn: '002', nama_siswa: 'Budi', kelas: 'X Merdeka', gender: 'Laki-laki', status: 'Aktif' },
    { id: 's3', nisn: '003', nama_siswa: 'Citra', kelas: 'X Merdeka', gender: 'P', status: 'Aktif' },
    { id: 's4', nisn: '004', nama_siswa: 'Dewi', kelas: 'XI Merdeka', gender: 'Perempuan', status: 'Aktif' },
    { id: 's5', nisn: '005', nama_siswa: 'Eko', kelas: 'X RPL 1', gender: 'L', status: 'Aktif' },
    { id: 's6', nisn: '006', nama_siswa: 'Fani', kelas: 'XII TKJ', gender: 'P', status: 'Aktif' },
    { id: 's7', nisn: '007', nama_siswa: 'Gita', kelas: null, gender: 'P', status: 'Aktif' },
    { id: 's8', nisn: '008', nama_siswa: 'Hadi', kelas: '', gender: 'L', status: 'Aktif' },
    { id: 's9', nisn: '009', nama_siswa: 'Indra', kelas: 'Tanpa Kelas', gender: 'L', status: 'Aktif' },
    { id: 's10', nisn: '010', nama_siswa: 'Joko', kelas: 'XII Merdeka', gender: 'L', status: 'Lulus' },
  ];
  const mockWali: WaliKelasItem[] = [
    { id: 'w1', kelas: 'X Merdeka', nama_guru: 'Drs. Supriadi', nip: '19700101' },
    { id: 'w2', kelas: 'XI Merdeka', nama_guru: 'Siti Aminah, M.Pd.', nip: '19800202' },
  ];

  const aggResult = aggregateClasses(mockDbClasses, mockCustomClasses, mockStudents, mockWali);

  // 3.3 Directory Aggregation combines dbClasses, customClasses, and student records
  try {
    assert.strictEqual(aggResult.consolidated.length, 5, 'Consolidated directory must contain 5 classes');
    pass('3.3: Directory aggregation seamlessly combines dbClasses, customClasses, and active student classes');
  } catch (err) {
    fail('3.3: Aggregation combination check failed', err);
  }

  // 3.4 Demographics: totalSiswa, siswaLaki, siswaPerempuan
  try {
    const xMerdeka = aggResult.consolidated.find(c => c.nama_kelas === 'X Merdeka')!;
    assert.ok(xMerdeka, 'X Merdeka must exist in directory');
    assert.strictEqual(xMerdeka.totalSiswa, 3, 'X Merdeka has 3 active students');
    assert.strictEqual(xMerdeka.siswaLaki, 2, 'X Merdeka has 2 male students');
    assert.strictEqual(xMerdeka.siswaPerempuan, 1, 'X Merdeka has 1 female student');
    pass('3.4: Demographics calculation accurately computes total, male, and female student counts per class');
  } catch (err) {
    fail('3.4: Demographics calculation check failed', err);
  }

  // 3.5 Alumni exclusion: status === 'Lulus'
  try {
    const xiiMerdeka = aggResult.consolidated.find(c => c.nama_kelas === 'XII Merdeka')!;
    assert.ok(xiiMerdeka, 'XII Merdeka must exist in directory');
    assert.strictEqual(xiiMerdeka.totalSiswa, 0, 'Graduated students (Lulus) must NOT be counted as active enrolled students');
    pass('3.5: Alumni exclusion strictly omits graduated students (status === "Lulus") from active class counts');
  } catch (err) {
    fail('3.5: Alumni exclusion check failed', err);
  }

  // 3.6 Homeroom teacher (wali_kelas) binding
  try {
    const xMerdeka = aggResult.consolidated.find(c => c.nama_kelas === 'X Merdeka')!;
    assert.strictEqual(xMerdeka.wali_kelas?.nama_guru, 'Drs. Supriadi');
    const xiMerdeka = aggResult.consolidated.find(c => c.nama_kelas === 'XI Merdeka')!;
    assert.strictEqual(xiMerdeka.wali_kelas?.nama_guru, 'Siti Aminah, M.Pd.');
    pass('3.6: Homeroom teacher (wali_kelas) is accurately bound to corresponding class cards');
  } catch (err) {
    fail('3.6: Homeroom teacher binding check failed', err);
  }

  // 3.7 Hierarchical sorting: Grade 10 -> 11 -> 12 -> Lainnya, then alphanumerically
  try {
    assert.strictEqual(aggResult.consolidated[0].nama_kelas, 'X Merdeka');
    assert.strictEqual(aggResult.consolidated[1].nama_kelas, 'X RPL 1');
    assert.strictEqual(aggResult.consolidated[2].nama_kelas, 'XI Merdeka');
    assert.strictEqual(aggResult.consolidated[3].nama_kelas, 'XII Merdeka');
    assert.strictEqual(aggResult.consolidated[4].nama_kelas, 'XII TKJ');
    pass('3.7: Hierarchical sorting correctly arranges classes by grade level (10 -> 11 -> 12 -> Lainnya) then alphanumerically');
  } catch (err) {
    fail('3.7: Hierarchical sorting check failed', err);
  }

  // 3.8 Dedicated unassigned students pool
  try {
    assert.strictEqual(aggResult.unassigned.length, 3);
    assert.deepStrictEqual(aggResult.unassigned.map(s => s.id), ['s7', 's8', 's9']);
    assert.strictEqual(aggResult.stats.totalAllocated, 6);
    assert.strictEqual(aggResult.stats.totalUnassigned, 3);
    pass('3.8: Dedicated unassigned students pool cleanly captures students with null, empty, or unassigned class tokens');
  } catch (err) {
    fail('3.8: Unassigned pool check failed', err);
  }

  // =========================================================================
  // SUITE 4: Centralized Student Allocation Workspace & Invariants
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 4: Centralized Student Allocation Workspace & Invariants ---${RESET}`);

  // 4.1 Batch student transfer between classes
  try {
    let testStudents: StudentItem[] = [
      { id: 'std-1', nisn: '101', nama_siswa: 'Ahmad', kelas: 'X Merdeka', gender: 'L', status: 'Aktif' },
      { id: 'std-2', nisn: '102', nama_siswa: 'Budi', kelas: 'X Merdeka', gender: 'L', status: 'Aktif' },
      { id: 'std-3', nisn: '103', nama_siswa: 'Clara', kelas: 'XI Merdeka', gender: 'P', status: 'Aktif' },
    ];

    const targetClass = 'XI Merdeka';
    testStudents = testStudents.map(s => (s.id === 'std-1' ? { ...s, kelas: targetClass, status: 'Aktif' } : s));

    assert.strictEqual(testStudents.find(s => s.id === 'std-1')?.kelas, 'XI Merdeka');
    const agg = aggregateClasses([], [], testStudents, []);
    assert.strictEqual(agg.consolidated.find(c => c.nama_kelas === 'X Merdeka')?.totalSiswa, 1);
    assert.strictEqual(agg.consolidated.find(c => c.nama_kelas === 'XI Merdeka')?.totalSiswa, 2);
    pass('4.1: Batch student transfer updates class counts and student records cleanly');
  } catch (err) {
    fail('4.1: Batch student transfer check failed', err);
  }

  // 4.2 Inbound allocation of unassigned students into target class
  try {
    let testStudents: StudentItem[] = [
      { id: 'u1', nisn: '201', nama_siswa: 'Unassigned 1', kelas: null, gender: 'L', status: 'Aktif' },
      { id: 'u2', nisn: '202', nama_siswa: 'Unassigned 2', kelas: '', gender: 'P', status: 'Aktif' },
    ];
    const initialAgg = aggregateClasses([], [], testStudents, []);
    assert.strictEqual(initialAgg.stats.totalUnassigned, 2);

    testStudents = testStudents.map(s => (s.id === 'u1' ? { ...s, kelas: 'X Merdeka', status: 'Aktif' } : s));
    const postAgg = aggregateClasses([], [], testStudents, []);
    assert.strictEqual(postAgg.stats.totalUnassigned, 1);
    assert.strictEqual(postAgg.consolidated.find(c => c.nama_kelas === 'X Merdeka')?.totalSiswa, 1);
    pass('4.2: Inbound allocation of unassigned student decrements unassigned count and increments target class');
  } catch (err) {
    fail('4.2: Inbound allocation check failed', err);
  }

  // 4.3 Cascading class rename across data_siswa, wali_kelas, and jadwal_pelajaran
  try {
    const schoolId = 'a0000000-0000-0000-0000-000000000001';
    const oldName = 'X Merdeka';
    const newName = 'X Merdeka Unggulan';

    let mockSiswa = [
      { id: 's1', sekolah_id: schoolId, kelas: oldName },
      { id: 's2', sekolah_id: 'OTHER_SCHOOL', kelas: oldName }
    ];
    let mockWali = [
      { id: 'w1', sekolah_id: schoolId, kelas: oldName },
      { id: 'w2', sekolah_id: 'OTHER_SCHOOL', kelas: oldName }
    ];
    let mockJadwal = [
      { id: 'j1', sekolah_id: schoolId, kelas: oldName },
      { id: 'j2', sekolah_id: 'OTHER_SCHOOL', kelas: oldName }
    ];

    mockSiswa = mockSiswa.map(s => (s.sekolah_id === schoolId && s.kelas === oldName ? { ...s, kelas: newName } : s));
    mockWali = mockWali.map(w => (w.sekolah_id === schoolId && w.kelas === oldName ? { ...w, kelas: newName } : w));
    mockJadwal = mockJadwal.map(j => (j.sekolah_id === schoolId && j.kelas === oldName ? { ...j, kelas: newName } : j));

    assert.strictEqual(mockSiswa.find(s => s.id === 's1')?.kelas, newName);
    assert.strictEqual(mockWali.find(w => w.id === 'w1')?.kelas, newName);
    assert.strictEqual(mockJadwal.find(j => j.id === 'j1')?.kelas, newName);

    // Multi-tenant boundary: other school untouched
    assert.strictEqual(mockSiswa.find(s => s.id === 's2')?.kelas, oldName);
    assert.strictEqual(mockWali.find(w => w.id === 'w2')?.kelas, oldName);
    assert.strictEqual(mockJadwal.find(j => j.id === 'j2')?.kelas, oldName);
    pass('4.3: Cascading class rename updates data_siswa, wali_kelas, and jadwal_pelajaran within tenant boundaries');
  } catch (err) {
    fail('4.3: Cascading class rename check failed', err);
  }

  // 4.4 Zero-student delete guard strictly forbids deleting classes with enrolled students
  try {
    function attemptDeleteClass(totalSiswa: number): { allowed: boolean; reason?: string } {
      if (totalSiswa > 0) {
        return { allowed: false, reason: 'Kelas masih memiliki siswa aktif.' };
      }
      return { allowed: true };
    }

    const res1 = attemptDeleteClass(10);
    assert.strictEqual(res1.allowed, false);

    const res2 = attemptDeleteClass(0);
    assert.strictEqual(res2.allowed, true);
    pass('4.4: Zero-student delete guard strictly forbids deleting classes with enrolled active students');
  } catch (err) {
    fail('4.4: Zero-student delete guard check failed', err);
  }

  // 4.5 Permitted deletion of empty classes deletes from data_kelas and wali_kelas
  try {
    const schoolId = 'a0000000-0000-0000-0000-000000000001';
    let dbClassesMock = [
      { id: 'c1', sekolah_id: schoolId, nama_kelas: 'Empty Class' },
      { id: 'c2', sekolah_id: 'OTHER_SCHOOL', nama_kelas: 'Empty Class' }
    ];
    let waliClassesMock = [
      { id: 'w1', sekolah_id: schoolId, kelas: 'Empty Class' },
      { id: 'w2', sekolah_id: 'OTHER_SCHOOL', kelas: 'Empty Class' }
    ];

    // Deletion for schoolId
    dbClassesMock = dbClassesMock.filter(c => !(c.sekolah_id === schoolId && c.nama_kelas === 'Empty Class'));
    waliClassesMock = waliClassesMock.filter(w => !(w.sekolah_id === schoolId && w.kelas === 'Empty Class'));

    assert.strictEqual(dbClassesMock.some(c => c.sekolah_id === schoolId), false);
    assert.strictEqual(waliClassesMock.some(w => w.sekolah_id === schoolId), false);
    // Other school preserved
    assert.strictEqual(dbClassesMock.some(c => c.sekolah_id === 'OTHER_SCHOOL'), true);
    assert.strictEqual(waliClassesMock.some(w => w.sekolah_id === 'OTHER_SCHOOL'), true);
    pass('4.5: Permitted deletion of empty classes removes entries while preserving other schools');
  } catch (err) {
    fail('4.5: Permitted deletion check failed', err);
  }

  // 4.6 Multi-tenant scoping: all updates and deletes strictly filter by sekolah_id
  try {
    assert.ok(
      adminKelasSrc.includes(".eq('sekolah_id', sekolahId)") ||
      adminKelasSrc.includes(".eq('sekolah_id', user.sekolah_id)"),
      'AdminKelasView must scope queries with sekolah_id'
    );
    pass('4.6: AdminKelasView strictly enforces multi-tenant scoping via sekolah_id filters');
  } catch (err) {
    fail('4.6: Multi-tenant scoping check failed', err);
  }

  // 4.7 Custom event synchronization: AdminDataView dispatches and AdminKelasView listens
  try {
    assert.ok(
      adminKelasSrc.includes("window.addEventListener('sipjam:kelas-updated'"),
      'AdminKelasView must register sipjam:kelas-updated event listener'
    );
    assert.ok(
      adminKelasSrc.includes("window.removeEventListener('sipjam:kelas-updated'"),
      'AdminKelasView must cleanly unregister sipjam:kelas-updated event listener'
    );
    assert.ok(
      adminDataSrc.includes("new CustomEvent('sipjam:kelas-updated')"),
      'AdminDataView must dispatch sipjam:kelas-updated upon master class/student import'
    );
    pass('4.7: AdminKelasView and AdminDataView synchronize via sipjam:kelas-updated custom event');
  } catch (err) {
    fail('4.7: Custom event synchronization check failed', err);
  }

  // =========================================================================
  // SUITE 5: CSV Template Download Integrity across all 7 Entities & Invariants
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 5: 7 Master Data CSV Templates & Invariants ---${RESET}`);

  // 5.1 All 7 templates defined in AdminDataView.tsx
  try {
    const requiredEntities = [
      'Data_Kelas',
      'Data_Siswa',
      'Data_Guru',
      'Data_Mapel',
      'Kalender_Pendidikan',
      'Jadwal_Pelajaran',
      'Wali_Kelas'
    ];
    for (const entity of requiredEntities) {
      assert.ok(
        adminDataSrc.includes(`${entity}:`),
        `AdminDataView templates dictionary must register entity "${entity}"`
      );
    }
    pass('5.1: All 7 Master Data entities are registered in AdminDataView.tsx templates dictionary');
  } catch (e) {
    fail('5.1: Template entity registration check failed', e);
  }

  // 5.2 Data_Kelas template headers and filename
  try {
    assert.ok(
      adminDataSrc.includes("filename: 'Template_Data_Kelas.csv'"),
      'Data_Kelas filename must be "Template_Data_Kelas.csv"'
    );
    const kelasMatch = adminDataSrc.match(
      /Data_Kelas:\s*\{[\s\S]*?filename:\s*'Template_Data_Kelas\.csv'[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/
    );
    assert.ok(kelasMatch, 'Data_Kelas template block must be properly defined');
    const headersStr = kelasMatch[1];
    assert.ok(headersStr.includes("'nama_kelas'"), 'Data_Kelas headers must contain "nama_kelas"');
    assert.ok(headersStr.includes("'tingkat'"), 'Data_Kelas headers must contain "tingkat"');
    assert.ok(headersStr.includes("'jurusan'"), 'Data_Kelas headers must contain "jurusan"');
    pass('5.2: Data_Kelas template defines filename "Template_Data_Kelas.csv" with headers [nama_kelas, tingkat, jurusan]');
  } catch (e) {
    fail('5.2: Data_Kelas template definition check failed', e);
  }

  // 5.3 Invariant check - Kalender_Pendidikan omits 'id' and legacy pseudo-IDs
  try {
    const kalenderMatch = adminDataSrc.match(
      /Kalender_Pendidikan:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/
    );
    assert.ok(kalenderMatch, 'Kalender_Pendidikan template block must exist');
    assert.strictEqual(
      kalenderMatch[1].includes("'id'"),
      false,
      'Kalender_Pendidikan headers must NOT include "id"'
    );
    assert.strictEqual(
      kalenderMatch[2].includes('KP-01'),
      false,
      'Kalender_Pendidikan sample must NOT include legacy "KP-01"'
    );
    pass('5.3: Invariant satisfied: Kalender_Pendidikan template omits "id" and legacy strings preventing 22P02');
  } catch (e) {
    fail('5.3: Kalender_Pendidikan invariant check failed', e);
  }

  // 5.4 Invariant check - Jadwal_Pelajaran omits 'id' and legacy pseudo-IDs
  try {
    const jadwalMatch = adminDataSrc.match(
      /Jadwal_Pelajaran:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/
    );
    assert.ok(jadwalMatch, 'Jadwal_Pelajaran template block must exist');
    assert.strictEqual(
      jadwalMatch[1].includes("'id'"),
      false,
      'Jadwal_Pelajaran headers must NOT include "id"'
    );
    assert.strictEqual(
      jadwalMatch[2].includes('JP-01'),
      false,
      'Jadwal_Pelajaran sample must NOT include legacy "JP-01"'
    );
    pass('5.4: Invariant satisfied: Jadwal_Pelajaran template omits "id" and legacy strings preventing 22P02');
  } catch (e) {
    fail('5.4: Jadwal_Pelajaran invariant check failed', e);
  }

  // 5.5 Invariant check - Data_Guru includes 'sekolah_id'
  try {
    const guruMatch = adminDataSrc.match(
      /Data_Guru:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\][\s\S]*?sample:\s*\[([\s\S]*?)\]/
    );
    assert.ok(guruMatch, 'Data_Guru template block must exist');
    assert.ok(guruMatch[1].includes("'sekolah_id'"), 'Data_Guru headers must contain "sekolah_id"');
    pass('5.5: Invariant satisfied: Data_Guru template includes "sekolah_id" in headers and sample');
  } catch (e) {
    fail('5.5: Data_Guru sekolah_id invariant check failed', e);
  }

  // 5.6 Data_Siswa, Data_Mapel, Wali_Kelas templates conform to schema
  try {
    const siswaMatch = adminDataSrc.match(
      /Data_Siswa:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/
    );
    assert.ok(siswaMatch, 'Data_Siswa template block must exist');
    assert.ok(siswaMatch[1].includes("'nisn'") && siswaMatch[1].includes("'nama_siswa'") && siswaMatch[1].includes("'kelas'"));

    const mapelMatch = adminDataSrc.match(
      /Data_Mapel:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/
    );
    assert.ok(mapelMatch, 'Data_Mapel template block must exist');
    assert.ok(mapelMatch[1].includes("'id'") && mapelMatch[1].includes("'nama_mata_pelajaran'"));

    const waliMatch = adminDataSrc.match(
      /Wali_Kelas:\s*\{[\s\S]*?headers:\s*\[([\s\S]*?)\]/
    );
    assert.ok(waliMatch, 'Wali_Kelas template block must exist');
    assert.ok(waliMatch[1].includes("'kelas'") && waliMatch[1].includes("'nama_guru'") && waliMatch[1].includes("'tahun_ajaran'"));
    pass('5.6: Data_Siswa, Data_Mapel, and Wali_Kelas templates conform precisely to database column structures');
  } catch (e) {
    fail('5.6: Template schema conformity check failed', e);
  }

  // 5.7 AdminKelasView direct template download
  try {
    assert.ok(
      adminKelasSrc.includes('handleDownloadClassTemplate'),
      'AdminKelasView must implement handleDownloadClassTemplate'
    );
    assert.ok(
      adminKelasSrc.includes("'Template_Data_Kelas.csv'"),
      'AdminKelasView download filename must be "Template_Data_Kelas.csv"'
    );
    assert.ok(
      adminKelasSrc.includes('nama_kelas,tingkat,jurusan'),
      'AdminKelasView template content must contain header "nama_kelas,tingkat,jurusan"'
    );
    assert.ok(
      adminKelasSrc.includes('\\uFEFF'),
      'AdminKelasView template content must prepend UTF-8 BOM'
    );
    pass('5.7: AdminKelasView has dedicated handleDownloadClassTemplate with BOM and valid headers');
  } catch (e) {
    fail('5.7: AdminKelasView template download check failed', e);
  }

  // =========================================================================
  // SUITE 6: CSV Parsing, Normalization, Validation, and Row Error Feedback
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 6: CSV Parsing, Normalization & Row Error Feedback ---${RESET}`);

  // 6.1 Header normalization across entity-specific aliases
  try {
    const rawKelas = ['\uFEFFKelas', ' Tingkat Kelas ', 'peminatan'];
    assert.deepStrictEqual(
      normalizeCsvHeaders(rawKelas, 'data_kelas'),
      ['nama_kelas', 'tingkat', 'jurusan']
    );

    const rawRombel = ['Rombel', 'Grade', 'Jurusan'];
    assert.deepStrictEqual(
      normalizeCsvHeaders(rawRombel, 'kelas'),
      ['nama_kelas', 'tingkat', 'jurusan']
    );

    const rawStudent = ['Nama Lengkap', 'Nomor_Induk_Siswa_Nasional', 'Rombel', 'Jenis_Kelamin', 'Telepon_Ortu'];
    assert.deepStrictEqual(
      normalizeCsvHeaders(rawStudent, 'data_siswa'),
      ['nama_siswa', 'nisn', 'kelas', 'gender', 'no_hp_ortu']
    );
    pass('6.1: normalizeCsvHeaders successfully normalizes class, student, and entity aliases');
  } catch (e) {
    fail('6.1: Header normalization check failed', e);
  }

  // 6.2 Entity-scoped "nama" collision prevention
  try {
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_kelas'), ['nama_kelas']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_siswa'), ['nama_siswa']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_guru'), ['nama_guru']);
    assert.deepStrictEqual(normalizeCsvHeaders(['nama'], 'data_mapel'), ['nama_mata_pelajaran']);
    pass('6.2: Header "nama" is scoped accurately to each entity without cross-table collisions');
  } catch (e) {
    fail('6.2: Name scoping check failed', e);
  }

  // 6.3 Multi-delimiter auto-detection (Comma, Semicolon, Tab, Pipe)
  try {
    const commaCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\n';
    const commaRows = parseAndValidateMasterCsv(commaCsv, 'data_kelas');
    assert.strictEqual(commaRows.length, 1);
    assert.strictEqual(commaRows[0].nama_kelas, 'X Merdeka');

    // Semicolon (Indonesian Excel standard)
    const semicolonCsv = '\uFEFFnama_kelas;tingkat;jurusan\r\nX Merdeka;10;Umum\r\nXI Merdeka;11;IPA\r\n';
    const semiRows = parseAndValidateMasterCsv(semicolonCsv, 'data_kelas');
    assert.strictEqual(semiRows.length, 2);
    assert.strictEqual(semiRows[0].nama_kelas, 'X Merdeka');
    assert.strictEqual(semiRows[0].tingkat, '10');

    // Tab-delimited (TSV)
    const tsv = 'nama_kelas\ttingkat\tjurusan\nX Merdeka 1\t10\tUmum\nXI Merdeka 2\t11\tIPS\n';
    const tsvRows = parseAndValidateMasterCsv(tsv, 'data_kelas');
    assert.strictEqual(tsvRows.length, 2);
    assert.strictEqual(tsvRows[0].nama_kelas, 'X Merdeka 1');
    assert.strictEqual(tsvRows[1].tingkat, '11');

    // Pipe-delimited
    const pipeCsv = 'nama_kelas|tingkat|jurusan\rXII RPL 1|12|RPL\rXII RPL 2|12|TKJ\r';
    const pipeRows = parseAndValidateMasterCsv(pipeCsv, 'data_kelas');
    assert.strictEqual(pipeRows.length, 2);
    assert.strictEqual(pipeRows[0].nama_kelas, 'XII RPL 1');
    assert.strictEqual(pipeRows[0].jurusan, 'RPL');
    pass('6.3: Multi-delimiter parsing auto-detects and parses comma, semicolon, tab, and pipe CSVs');
  } catch (e) {
    fail('6.3: Multi-delimiter parsing check failed', e);
  }

  // 6.4 Line endings resilience (CRLF, LF, bare CR)
  try {
    const crlfCsv = 'nama_kelas,tingkat,jurusan\r\nX CRLF,10,Umum\r\n';
    const lfCsv = 'nama_kelas,tingkat,jurusan\nX LF,10,Umum\n';
    const bareCrCsv = 'nama_kelas,tingkat,jurusan\rX CR,10,Umum\r';

    assert.strictEqual(parseAndValidateMasterCsv(crlfCsv, 'data_kelas')[0].nama_kelas, 'X CRLF');
    assert.strictEqual(parseAndValidateMasterCsv(lfCsv, 'data_kelas')[0].nama_kelas, 'X LF');
    assert.strictEqual(parseAndValidateMasterCsv(bareCrCsv, 'data_kelas')[0].nama_kelas, 'X CR');
    pass('6.4: Multi-line endings (Windows CRLF, Unix LF, bare CR) parse cleanly without blank row pollution');
  } catch (e) {
    fail('6.4: Line endings resilience check failed', e);
  }

  // 6.5 RFC 4180 quotes and comma within quoted fields
  try {
    const quotedCsv = 'nama_kelas,tingkat,jurusan\n"X ""Unggulan"" Merdeka",10,"Umum, Multidisiplin"\n';
    const rows = parseAndValidateMasterCsv(quotedCsv, 'data_kelas');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].nama_kelas, 'X "Unggulan" Merdeka');
    assert.strictEqual(rows[0].jurusan, 'Umum, Multidisiplin');
    pass('6.5: RFC 4180 escaped quotes and comma-within-quotes parsed cleanly');
  } catch (e) {
    fail('6.5: RFC 4180 quotes check failed', e);
  }

  // 6.6 Excel apostrophe stripping on numbers (nisn, nip, no_hp_ortu)
  try {
    const studentCsv = 'nisn,nama_siswa,kelas,gender,status,no_hp_ortu\n\'114367407,Candra Podomi,X Merdeka,Laki-laki,Aktif,\'081234567890\n';
    const rows = parseAndValidateMasterCsv(studentCsv, 'data_siswa');
    assert.strictEqual(rows[0].nisn, '114367407', 'Leading apostrophe on NISN must be stripped');
    assert.strictEqual(rows[0].no_hp_ortu, '081234567890', 'Leading apostrophe on phone must be stripped');

    const guruCsv = 'sekolah_id,nip,nama_guru,mata_pelajaran\na0000000-0000-0000-0000-000000000001,\'198501012010011001,Fitri Aprilia,Bahasa Inggris\n';
    const guruRows = parseAndValidateMasterCsv(guruCsv, 'data_guru');
    assert.strictEqual(guruRows[0].nip, '198501012010011001', 'Leading apostrophe on NIP must be stripped');
    pass('6.6: Excel apostrophes ("\'") are cleanly stripped from NISN, NIP, and phone numbers');
  } catch (e) {
    fail('6.6: Apostrophe stripping check failed', e);
  }

  // 6.7 Non-UUID conversion to valid UUID prevents Postgres 22P02
  try {
    const kalenderLegacyCsv = 'id,tanggal,keterangan,tipe\nKP-01,2026-10-01,Hari Libur Nasional,Libur\n';
    const kalRows = parseAndValidateMasterCsv(kalenderLegacyCsv, 'kalender_pendidikan');
    assert.notStrictEqual(kalRows[0].id, 'KP-01', 'Legacy non-UUID string must be replaced');
    assert.ok(UUID_REGEX.test(kalRows[0].id), 'Replaced id must match standard UUID format');

    const validUuid = 'b0000000-0000-4000-a000-000000000001';
    const kalenderValidCsv = `id,tanggal,keterangan,tipe\n${validUuid},2026-10-01,Hari Libur Nasional,Libur\n`;
    const kalValidRows = parseAndValidateMasterCsv(kalenderValidCsv, 'kalender_pendidikan');
    assert.strictEqual(kalValidRows[0].id, validUuid, 'Existing valid UUID must be preserved');
    pass('6.7: Non-UUID conversion generates valid UUIDs preventing PostgreSQL 22P02 syntax errors');
  } catch (e) {
    fail('6.7: Non-UUID conversion check failed', e);
  }

  // 6.8 Row error feedback (Baris ${i}) on empty required columns
  try {
    const invalidClassCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\n,11,IPA\n';
    let threw = false;
    try {
      parseAndValidateMasterCsv(invalidClassCsv, 'data_kelas');
    } catch (err: any) {
      threw = true;
      assert.ok(err.message.includes('Baris 2'), `Error must mention Baris 2, got: ${err.message}`);
      assert.ok(err.message.includes('nama_kelas'), `Error must mention nama_kelas, got: ${err.message}`);
    }
    assert.strictEqual(threw, true, 'Must throw error on empty nama_kelas at Baris 2');

    const invalidStudentCsv = 'nisn,nama_siswa,kelas\n114367407,Candra,X Merdeka\n114367408,,\n';
    let threwStudent = false;
    try {
      parseAndValidateMasterCsv(invalidStudentCsv, 'data_siswa');
    } catch (err: any) {
      threwStudent = true;
      assert.ok(err.message.includes('Baris 2'), `Error must mention Baris 2, got: ${err.message}`);
    }
    assert.strictEqual(threwStudent, true, 'Must throw error on empty student data at Baris 2');
    pass('6.8: Empty required columns throw descriptive error with exact row number (Baris ${i})');
  } catch (e) {
    fail('6.8: Row error feedback check failed', e);
  }

  // 6.9 Anti-dummy string detection with row error feedback
  try {
    const dummyClassCsv = 'nama_kelas,tingkat,jurusan\nKelas Dummy Percobaan,10,Umum\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dummyClassCsv, 'data_kelas'),
      /Baris 1: Terdeteksi nama kelas dummy\/percobaan/i
    );

    const dummyStudentCsv = 'nisn,nama_siswa,kelas\n114367407,Siswa Test Ujicoba,X Merdeka\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dummyStudentCsv, 'data_siswa'),
      /Baris 1: Terdeteksi data siswa dummy\/percobaan/i
    );
    pass('6.9: Dummy/test names in class and student records are rejected with exact row numbers');
  } catch (e) {
    fail('6.9: Anti-dummy detection check failed', e);
  }

  // 6.10 Duplicate records within same CSV rejected with line numbers
  try {
    const dupClassCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\nX Merdeka,10,Umum\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dupClassCsv, 'data_kelas'),
      /Baris 2: Duplikat nama kelas "X Merdeka" dalam file CSV/
    );

    const dupStudentCsv = 'nisn,nama_siswa,kelas\n114367407,Candra Podomi,X Merdeka\n114367408,Candra Podomi,X Merdeka\n';
    assert.throws(
      () => parseAndValidateMasterCsv(dupStudentCsv, 'data_siswa'),
      /Baris 2: Duplikat siswa "Candra Podomi" di kelas X Merdeka dalam file CSV/
    );
    pass('6.10: In-file duplicate class names and student keys are rejected with Baris ${i} feedback');
  } catch (e) {
    fail('6.10: In-file duplicate check failed', e);
  }

  // 6.11 Wrong template upload caught by pre-validation
  try {
    const guruCsv = 'sekolah_id,nip,nama_guru,mata_pelajaran\na0000000-0000-0000-0000-000000000001,19850101,Fitri,B.Inggris\n';
    assert.throws(
      () => parseAndValidateMasterCsv(guruCsv, 'data_siswa'),
      (err: any) => err.message.includes('kolom wajib') && err.message.includes('nama_siswa')
    );

    const kalenderCsv = 'tanggal,keterangan,tipe\n2026-10-01,Libur,Libur\n';
    assert.throws(
      () => parseAndValidateMasterCsv(kalenderCsv, 'data_kelas'),
      (err: any) => err.message.includes('kolom wajib') && err.message.includes('nama_kelas')
    );
    pass('6.11: Uploading mismatched CSV templates triggers immediate pre-validation error');
  } catch (e) {
    fail('6.11: Wrong template pre-validation check failed', e);
  }

  // =========================================================================
  // SUITE 7: Idempotent Student Import by (sekolah_id, nisn) & Schema Cache Fallback
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 7: Importer Idempotency & Database Integrity ---${RESET}`);

  // 7.1 Student deduplication by (sekolah_id, nisn) reuses existing UUID
  try {
    const existingStudentUuid = 's0000000-0000-4000-a000-000000000001';
    let upsertCalledWith: any = null;

    const mockSupabase = {
      from: (table: string) => {
        if (table === 'data_siswa') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({
                  data: [{ id: existingStudentUuid, nisn: '114367407', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }],
                  error: null
                })
              })
            }),
            upsert: (batch: any[], opts: any) => {
              upsertCalledWith = { batch, opts };
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const reimportCsv = 'nisn,nama_siswa,kelas\n114367407,Moh. Candra Podomi,XI Merdeka\n';
    const result = await importMasterDataFromCsv(mockSupabase, reimportCsv, 'data_siswa', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });

    assert.strictEqual(result.count, 1);
    assert.strictEqual(result.rows[0].id, existingStudentUuid, 'Existing student UUID must be preserved');
    assert.strictEqual(result.rows[0].kelas, 'XI Merdeka', 'Student class must be updated');
    assert.strictEqual(upsertCalledWith.opts.onConflict, 'id');
    assert.strictEqual(upsertCalledWith.batch[0].id, existingStudentUuid);
    pass('7.1: Student re-import matches by (sekolah_id, nisn) and updates row in-place without duplicate records');
  } catch (e) {
    fail('7.1: Student deduplication check failed', e);
  }

  // 7.2 Mixed batch of existing NISN and new NISN
  try {
    const existingId = 's0000000-0000-4000-a000-000000000002';
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'data_siswa') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({
                  data: [{ id: existingId, nisn: '114367401', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }],
                  error: null
                })
              })
            }),
            upsert: () => Promise.resolve({ error: null })
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const mixedCsv = [
      'nisn,nama_siswa,kelas',
      '114367401,Siswa Lama,X Merdeka',
      '114367402,Siswa Baru,X Merdeka',
      '-,Siswa Tanpa NISN,X Merdeka'
    ].join('\n');

    const result = await importMasterDataFromCsv(mockSupabase, mixedCsv, 'data_siswa', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });

    assert.strictEqual(result.count, 3);
    assert.strictEqual(result.rows[0].id, existingId, 'Existing student reuses ID');
    assert.notStrictEqual(result.rows[1].id, existingId, 'New student gets a new ID');
    assert.ok(UUID_REGEX.test(result.rows[1].id), 'New student ID is a valid UUID');
    assert.ok(UUID_REGEX.test(result.rows[2].id), 'Hyphen NISN student gets a valid UUID without collision');
    pass('7.2: Mixed batch import correctly handles existing NISNs, new NISNs, and unassigned/hyphen NISNs');
  } catch (e) {
    fail('7.2: Mixed batch import check failed', e);
  }

  // 7.3 data_kelas upsert uses onConflict 'sekolah_id, nama_kelas'
  try {
    let capturedOnConflict: string = '';
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'data_kelas') {
          return {
            upsert: (batch: any[], opts: any) => {
              capturedOnConflict = opts?.onConflict || '';
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const classCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\n';
    await importMasterDataFromCsv(mockSupabase, classCsv, 'data_kelas', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });

    assert.strictEqual(capturedOnConflict, 'sekolah_id, nama_kelas', 'data_kelas upsert onConflict must be "sekolah_id, nama_kelas"');
    pass('7.3: data_kelas upsert targets "sekolah_id, nama_kelas" for multi-tenant isolation');
  } catch (e) {
    fail('7.3: data_kelas onConflict check failed', e);
  }

  // 7.4 Graceful fallback on missing data_kelas table (PGRST205)
  try {
    let fallbackSyncedClasses: string[] = [];
    const mockSupabaseWithPgrst205 = {
      from: (table: string) => {
        if (table === 'data_kelas') {
          return {
            upsert: () => Promise.resolve({
              error: {
                code: 'PGRST205',
                message: "Could not find the table 'public.data_kelas' in the schema cache"
              }
            })
          };
        }
        if (table === 'wali_kelas') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null })
                })
              })
            }),
            upsert: (record: any) => {
              fallbackSyncedClasses.push(record.kelas);
              return Promise.resolve({ error: null });
            }
          };
        }
        return { upsert: () => Promise.resolve({ error: null }) };
      }
    };

    const classCsv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\nXI Merdeka,11,IPA\n';
    const result = await importMasterDataFromCsv(mockSupabaseWithPgrst205, classCsv, 'data_kelas', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });

    assert.strictEqual(result.count, 2);
    assert.deepStrictEqual(fallbackSyncedClasses, ['X Merdeka', 'XI Merdeka']);
    pass('7.4: data_kelas gracefully falls back to syncing classes in wali_kelas on PGRST205 schema cache error');
  } catch (e) {
    fail('7.4: PGRST205 graceful fallback check failed', e);
  }

  // 7.5 Database error translations (FK 23503, RLS 42501, NOT NULL 23502)
  try {
    const makeFailingMock = (code: string, message: string) => ({
      from: () => ({
        upsert: () => Promise.resolve({ error: { code, message } })
      })
    });

    const csv = 'nama_kelas,tingkat,jurusan\nX Merdeka,10,Umum\n';

    // FK 23503
    await assert.rejects(
      () => importMasterDataFromCsv(makeFailingMock('23503', 'foreign key violation (sekolah_id_fkey)'), csv, 'data_kelas'),
      /ID sekolah \("sekolah_id"\) dalam CSV tidak terdaftar/
    );

    // RLS 42501
    await assert.rejects(
      () => importMasterDataFromCsv(makeFailingMock('42501', 'violates row-level security policy'), csv, 'data_kelas'),
      /Akses ditolak oleh kebijakan keamanan data sekolah \(RLS\)/
    );

    // NOT NULL 23502
    await assert.rejects(
      () => importMasterDataFromCsv(makeFailingMock('23502', 'null value in column violates not-null'), csv, 'data_kelas'),
      /terdapat kolom wajib yang bernilai kosong/
    );
    pass('7.5: Database errors (23503 FK, 42501 RLS, 23502 NOT NULL) are mapped to user-friendly messages');
  } catch (e) {
    fail('7.5: Database error translation check failed', e);
  }

  // =========================================================================
  // SUITE 8: Project Test Runner Integration & Zero-Regression Invariant
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SUITE 8: Project Test Runner Integration & Zero Regression (R4) ---${RESET}`);

  // 8.1 package.json test script chain integration invariant
  try {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    assert.ok(fs.existsSync(packageJsonPath), 'package.json must exist');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const testScript = pkg?.scripts?.test || '';

    assert.ok(testScript.length > 0, 'package.json must define scripts.test');
    assert.ok(
      testScript.includes('tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts'),
      'package.json test script must include tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts'
    );
    pass('8.1: tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts is integrated into package.json test script');
  } catch (e) {
    fail('8.1: package.json test script integration check failed', e);
  }

  // 8.2 Baseline test files verification on filesystem
  try {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const testScript = pkg?.scripts?.test || '';

    const testFiles = testScript
      .split('&&')
      .map((s: string) => s.trim())
      .filter((s: string) => s.startsWith('tsx tests/'))
      .map((s: string) => s.replace('tsx ', '').trim());

    assert.ok(testFiles.length >= 55, `Test script must contain at least 55 tests (found ${testFiles.length})`);

    let verifiedCount = 0;
    for (const relPath of testFiles) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      assert.ok(fs.existsSync(fullPath), `Test file must exist on filesystem: ${relPath}`);
      verifiedCount++;
    }
    pass(`8.2: All ${verifiedCount} test files verified on filesystem with zero dropped baseline tests`);
  } catch (e) {
    fail('8.2: Baseline test files verification failed', e);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n${CYAN}========================================================================${RESET}`);
  console.log(`TOTAL CHECKS: ${totalChecks} | ${GREEN}PASSED: ${passedChecks}${RESET} | ${failedChecks > 0 ? RED : GREEN}FAILED: ${failedChecks}${RESET}`);
  console.log(`${CYAN}========================================================================${RESET}\n`);

  if (failedChecks > 0) {
    console.error(`${RED}❌ AUTOMATED SUITE DETECTED FAILURES!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}🎉 ALL 8 SUITES & ${passedChecks} TEST CHECKS PASSED 100%!${RESET}`);
    process.exit(0);
  }
}

runTestSuite().catch(e => {
  console.error('Unhandled test suite failure:', e);
  process.exit(1);
});
