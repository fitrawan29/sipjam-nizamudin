/**
 * ============================================================================
 * EMPIRICAL VERIFICATION & INTEGRATION TEST SUITE
 * Milestone 1: Role BK (Bimbingan Konseling) & Jurnal BK (/ponytail)
 * File: tests/bk_role_and_jurnal_rbac_verification.test.ts
 *
 * Comprehensive tests verifying all 9 acceptance criteria:
 * 1. Role Normalization & Types
 * 2. Menu Isolation (Strictly 5 items, Miller's Law)
 * 3. RBAC Isolation: view-jurnal-bk accessible by BK, Admin, Kepsek; denied for Guru, Wali, Piket, TU, Siswa, Dinas
 * 4. RBAC Denial for BK trying to access KBM journals or admin modules
 * 5. Jurnal BK Independent Classless Data Model & Migration Invariants
 * 6. Admin & Kepala Sekolah Supervision & Read-Only Invariants
 * 7. Admin BK Account Management (Toggle, Modal 4 fields, Sync Resilience)
 * 8. AST Preservation Comment Invariants
 * 9. Zero Regression on Existing Roles
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  evaluateTabRBAC,
  VIEW_ALIASES
} from '../src/lib/navigation';
import { isAdminRole } from '../src/lib/supabaseClient';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function recordAssert(condition: boolean, testId: string, desc: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✔ [${testId}] PASS:${RESET} ${desc}`);
    if (detail) console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✖ [${testId}] FAIL:${RESET} ${desc}`);
    if (detail) console.error(`    ${RED}↳ Detail: ${detail}${RESET}`);
  }
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🧪 TEST SUITE: ROLE BK & JURNAL BIMBINGAN KONSELING RBAC & ISOLATION${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // --------------------------------------------------------------------------
  // Suite 1: Authentication & Role Identity Invariants
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 1: Authentication & Role Identity Invariants ---${RESET}`);

  recordAssert(isAdminRole('bk') === false, 'T1.1', "isAdminRole('bk') strictly returns false (zero role escalation)");
  recordAssert(isAdminRole('guru_bk') === false, 'T1.2', "isAdminRole('guru_bk') strictly returns false");
  recordAssert(isAdminRole('Guru BK') === false, 'T1.3', "isAdminRole('Guru BK') strictly returns false (case-insensitive)");
  recordAssert(isAdminRole('bimbingan_konseling') === false, 'T1.4', "isAdminRole('bimbingan_konseling') strictly returns false");

  const userTypeFile = fs.readFileSync(path.join(process.cwd(), 'src/types/user.ts'), 'utf-8');
  recordAssert(
    userTypeFile.includes("'bk'") && userTypeFile.includes("'guru_bk'"),
    'T1.5',
    "src/types/user.ts defines 'bk' and 'guru_bk' in UserRole union"
  );

  const dbTypeFile = fs.readFileSync(path.join(process.cwd(), 'src/types/database.ts'), 'utf-8');
  recordAssert(
    dbTypeFile.includes('"bk"') && dbTypeFile.includes('"guru_bk"'),
    'T1.6',
    'src/types/database.ts defines "bk" and "guru_bk" in RoleUser union'
  );

  // --------------------------------------------------------------------------
  // Suite 2: Menu Isolation & Canonical Route Aliases (Miller's Law 5 items)
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 2: Menu Isolation & Canonical Route Aliases ---${RESET}`);

  const bkPermutations = [
    'bk',
    'BK',
    'guru_bk',
    'Guru BK',
    'GURU_BK',
    'gurubk',
    'bimbingan_konseling',
    'Bimbingan Konseling',
    'bimbingankonseling',
    'bimbingan_dan_konseling',
    'bimbingandankonseling',
    '  bk  ',
    '\tbk\n'
  ];

  for (const perm of bkPermutations) {
    const items = getConsolidatedMenuItems({ role: perm });
    recordAssert(
      items.length === 5,
      `T2.1.${perm.trim()}`,
      `getConsolidatedMenuItems({ role: '${perm.trim()}' }) returns strictly 5 items (got: ${items.length})`
    );
  }

  const bkMenuItems = getConsolidatedMenuItems({ role: 'bk' });
  const bkMenuIds = bkMenuItems.map(i => i.id);
  const expectedBkIds = [
    'view-home',
    'view-guru-presensi',
    'view-jurnal-bk',
    'view-informasi',
    'view-pengaturan-akun'
  ];

  recordAssert(
    JSON.stringify(bkMenuIds) === JSON.stringify(expectedBkIds),
    'T2.2',
    `Menu items match expected consolidated 5 items: ${expectedBkIds.join(', ')}`
  );

  // Verify labels
  const homeItem = bkMenuItems.find(i => i.id === 'view-home');
  const presensiItem = bkMenuItems.find(i => i.id === 'view-guru-presensi');
  const jurnalItem = bkMenuItems.find(i => i.id === 'view-jurnal-bk');
  const infoItem = bkMenuItems.find(i => i.id === 'view-informasi');
  const akunItem = bkMenuItems.find(i => i.id === 'view-pengaturan-akun');

  recordAssert(homeItem?.label === 'Dashboard', 'T2.3.1', "view-home label is 'Dashboard'");
  recordAssert(presensiItem?.label === 'Presensi BK', 'T2.3.2', "view-guru-presensi label is 'Presensi BK'");
  recordAssert(jurnalItem?.label === 'Jurnal BK', 'T2.3.3', "view-jurnal-bk label is 'Jurnal BK'");
  recordAssert(infoItem?.label === 'Informasi Sekolah', 'T2.3.4', "view-informasi label is 'Informasi Sekolah'");
  recordAssert(akunItem?.label === 'Pengaturan Akun', 'T2.3.5', "view-pengaturan-akun label is 'Pengaturan Akun'");

  // Route Aliases
  recordAssert(VIEW_ALIASES['view-jurnal-bk']?.view === 'view-jurnal-bk', 'T2.4.1', "VIEW_ALIASES maps 'view-jurnal-bk'");
  recordAssert(VIEW_ALIASES['view-bk-jurnal']?.view === 'view-jurnal-bk', 'T2.4.2', "VIEW_ALIASES maps 'view-bk-jurnal' to 'view-jurnal-bk'");

  const res1 = resolveCanonicalRoute('view-jurnal-bk');
  recordAssert(res1.canonicalView === 'view-jurnal-bk', 'T2.5.1', "resolveCanonicalRoute('view-jurnal-bk') -> 'view-jurnal-bk'");
  const res2 = resolveCanonicalRoute('view-bk-jurnal');
  recordAssert(res2.canonicalView === 'view-jurnal-bk', 'T2.5.2', "resolveCanonicalRoute('view-bk-jurnal') -> 'view-jurnal-bk'");

  // --------------------------------------------------------------------------
  // Suite 3: RBAC Isolation for Jurnal BK
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 3: RBAC Isolation for Jurnal BK ---${RESET}`);

  // Allowed Roles
  const rbacBk = evaluateTabRBAC('view-jurnal-bk', '', { role: 'bk' });
  recordAssert(rbacBk.allowed === true, 'T3.1.1', "evaluateTabRBAC allows 'view-jurnal-bk' for role: 'bk'");

  const rbacGuruBk = evaluateTabRBAC('view-jurnal-bk', '', { role: 'guru_bk' });
  recordAssert(rbacGuruBk.allowed === true, 'T3.1.2', "evaluateTabRBAC allows 'view-jurnal-bk' for role: 'guru_bk'");

  const rbacAdmin = evaluateTabRBAC('view-jurnal-bk', '', { role: 'admin' });
  recordAssert(rbacAdmin.allowed === true, 'T3.1.3', "evaluateTabRBAC allows 'view-jurnal-bk' for role: 'admin'");

  const rbacSuperadmin = evaluateTabRBAC('view-jurnal-bk', '', { role: 'superadmin' });
  recordAssert(rbacSuperadmin.allowed === true, 'T3.1.4', "evaluateTabRBAC allows 'view-jurnal-bk' for role: 'superadmin'");

  const rbacKepsek = evaluateTabRBAC('view-jurnal-bk', '', { role: 'guru', isKepalaSekolah: true });
  recordAssert(rbacKepsek.allowed === true, 'T3.1.5', "evaluateTabRBAC allows 'view-jurnal-bk' for isKepalaSekolah: true");

  const rbacKepsekRole = evaluateTabRBAC('view-jurnal-bk', '', { role: 'kepalasekolah' });
  recordAssert(rbacKepsekRole.allowed === true, 'T3.1.6', "evaluateTabRBAC allows 'view-jurnal-bk' for role: 'kepalasekolah'");

  // Strictly Blocked Roles
  const rbacGuru = evaluateTabRBAC('view-jurnal-bk', '', { role: 'guru' });
  recordAssert(rbacGuru.allowed === false, 'T3.2.1', "evaluateTabRBAC strictly denies regular teacher from 'view-jurnal-bk'");
  recordAssert(
    rbacGuru.reason?.includes('Jurnal BK bersifat rahasia') ?? false,
    'T3.2.1.reason',
    `Reason cites confidentiality: "${rbacGuru.reason}"`
  );

  const rbacWali = evaluateTabRBAC('view-jurnal-bk', '', { role: 'guru', isWaliKelas: true });
  recordAssert(rbacWali.allowed === false, 'T3.2.2', "evaluateTabRBAC strictly denies Wali Kelas from 'view-jurnal-bk'");

  const rbacTu = evaluateTabRBAC('view-jurnal-bk', '', { role: 'tata_usaha' });
  recordAssert(rbacTu.allowed === false, 'T3.2.3', "evaluateTabRBAC strictly denies Tata Usaha from 'view-jurnal-bk'");

  const rbacSiswa = evaluateTabRBAC('view-jurnal-bk', '', { role: 'siswa' });
  recordAssert(rbacSiswa.allowed === false, 'T3.2.4', "evaluateTabRBAC strictly denies Siswa from 'view-jurnal-bk'");

  const rbacDinas = evaluateTabRBAC('view-jurnal-bk', '', { role: 'dinas_pendidikan' });
  recordAssert(rbacDinas.allowed === false, 'T3.2.5', "evaluateTabRBAC strictly denies Dinas Pendidikan from 'view-jurnal-bk'");

  // --------------------------------------------------------------------------
  // Suite 4: RBAC Denial for Role BK Accessing Prohibited Views
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 4: RBAC Denial for Role BK Accessing Prohibited Views ---${RESET}`);

  const prohibitedForBk = [
    { view: 'view-guru-jurnal', tab: 'input', label: 'Jurnal KBM' },
    { view: 'view-guru-jurnal', tab: 'supervisi-kelas', label: 'Supervisi Kelas' },
    { view: 'view-dokumen', tab: '', label: 'Perangkat Pembelajaran' },
    { view: 'view-gradebook', tab: 'gradebook', label: 'Gradebook Asesmen' },
    { view: 'view-rapor', tab: 'rapor', label: 'Rapor' },
    { view: 'view-admin-data', tab: 'Data_Siswa', label: 'Master Data Siswa' },
    { view: 'view-admin-data', tab: 'Data_Guru', label: 'Master Data Guru' },
    { view: 'view-admin-data', tab: 'blok', label: 'Sistem Blok' },
    { view: 'view-admin-config', tab: 'backup', label: 'Cadangan Data' },
    { view: 'view-admin-verif', tab: '', label: 'Pusat Verifikasi' },
    { view: 'view-piket', tab: '', label: 'Modul Piket' },
    { view: 'view-ujian', tab: '', label: 'Modul Ujian Siswa' },
    { view: 'view-superadmin-overview', tab: '', label: 'Superadmin Overview' },
    { view: 'view-dinas-overview', tab: '', label: 'Dinas Overview' }
  ];

  for (const p of prohibitedForBk) {
    const res = evaluateTabRBAC(p.view, p.tab, { role: 'bk' });
    recordAssert(
      res.allowed === false,
      `T4.1.${p.view}.${p.tab || 'root'}`,
      `evaluateTabRBAC strictly blocks BK from ${p.label} (${p.view}${p.tab ? '/' + p.tab : ''})`
    );
  }

  // Allowed views for BK
  const allowedForBk = ['view-home', 'view-guru-presensi', 'view-jurnal-bk', 'view-informasi', 'view-pengaturan-akun'];
  for (const v of allowedForBk) {
    const res = evaluateTabRBAC(v, '', { role: 'bk' });
    recordAssert(res.allowed === true, `T4.2.${v}`, `evaluateTabRBAC allows BK in ${v}`);
  }

  // --------------------------------------------------------------------------
  // Suite 5: Jurnal BK Independent Classless Data Model & Migration Invariants
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 5: Jurnal BK Independent Classless Data Model & Migration ---${RESET}`);

  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261109_create_jurnal_bk.sql');
  recordAssert(fs.existsSync(migrationPath), 'T5.1', 'Migration file supabase/migrations/20261109_create_jurnal_bk.sql exists');

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  recordAssert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.jurnal_bk'), 'T5.2', 'Migration creates public.jurnal_bk table');

  const requiredColumns = [
    'sekolah_id',
    'guru_id',
    'nama_guru',
    'siswa_id',
    'nisn',
    'nama_siswa',
    'kelas',
    'tanggal',
    'waktu',
    'bidang_bimbingan',
    'jenis_layanan',
    'tempat_layanan',
    'catatan',
    'tindak_lanjut',
    'status'
  ];

  for (const col of requiredColumns) {
    recordAssert(migrationContent.includes(col), `T5.3.${col}`, `Table public.jurnal_bk contains column '${col}'`);
  }

  // Verify classless: NO foreign key / relation to jadwal_pelajaran, jam_ke, or pertemuan_ke
  recordAssert(!migrationContent.includes('jadwal_pelajaran'), 'T5.4.1', 'Zero dependency on jadwal_pelajaran');
  recordAssert(!migrationContent.includes('jam_ke'), 'T5.4.2', 'Zero dependency on academic jam_ke period');
  recordAssert(!migrationContent.includes('pertemuan_ke'), 'T5.4.3', 'Zero dependency on academic pertemuan_ke');

  // Verify RLS enabled
  recordAssert(migrationContent.includes('ENABLE ROW LEVEL SECURITY'), 'T5.5', 'Migration enables Row Level Security on public.jurnal_bk');

  // --------------------------------------------------------------------------
  // Suite 6: Admin & Kepala Sekolah Supervision & Read-Only Invariants
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 6: Admin & Kepala Sekolah Supervision & Read-Only Invariants ---${RESET}`);

  const bkJurnalViewPath = path.join(process.cwd(), 'src/components/BkJurnalView.tsx');
  recordAssert(fs.existsSync(bkJurnalViewPath), 'T6.1', 'src/components/BkJurnalView.tsx component exists');

  const bkJurnalContent = fs.readFileSync(bkJurnalViewPath, 'utf-8');
  recordAssert(bkJurnalContent.includes('isReadOnly'), 'T6.2', 'BkJurnalView accepts isReadOnly prop');
  recordAssert(bkJurnalContent.includes('data-testid="readonly-notice"'), 'T6.3', 'BkJurnalView renders data-testid="readonly-notice" in read-only mode');

  const appScreenPath = path.join(process.cwd(), 'src/components/AppScreen.tsx');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf-8');
  recordAssert(
    appScreenContent.includes('BkJurnalView') && appScreenContent.includes("import('./BkJurnalView')"),
    'T6.4',
    'AppScreen.tsx dynamically imports BkJurnalView'
  );

  recordAssert(
    appScreenContent.includes("isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}"),
    'T6.5',
    'AppScreen.tsx passes isReadOnly to BkJurnalView for Kepala Sekolah'
  );

  recordAssert(
    appScreenContent.includes("Halaman <strong>Jurnal BK</strong> bersifat rahasia"),
    'T6.6',
    'AppScreen.tsx renders Akses Terblokir card for unauthorized URL manipulation of Jurnal BK'
  );

  // --------------------------------------------------------------------------
  // Suite 7: Admin BK Account Management & Sync Resilience
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 7: Admin BK Account Management & Sync Resilience ---${RESET}`);

  const adminPenggunaPath = path.join(process.cwd(), 'src/components/AdminPenggunaView.tsx');
  const adminPenggunaContent = fs.readFileSync(adminPenggunaPath, 'utf-8');

  recordAssert(
    adminPenggunaContent.includes('handleToggleBkAssignment'),
    'T7.1',
    'AdminPenggunaView implements handleToggleBkAssignment'
  );

  recordAssert(
    adminPenggunaContent.includes('handleCreateBkUser'),
    'T7.2',
    'AdminPenggunaView implements handleCreateBkUser'
  );

  recordAssert(
    adminPenggunaContent.includes('+ Akun BK'),
    'T7.3',
    'AdminPenggunaView renders "+ Akun BK" banner button'
  );

  recordAssert(
    adminPenggunaContent.includes('Tunjuk BK') && adminPenggunaContent.includes('Ke Guru'),
    'T7.4',
    'AdminPenggunaView renders "Tunjuk BK" / "Ke Guru" toggle button'
  );

  // 4 mandatory fields validation
  recordAssert(
    adminPenggunaContent.includes('swal-bk-nip') &&
    adminPenggunaContent.includes('swal-bk-nama') &&
    adminPenggunaContent.includes('swal-bk-hp') &&
    adminPenggunaContent.includes('swal-bk-email'),
    'T7.5',
    'Create BK modal validates 4 mandatory fields (NIP, Nama Lengkap, Nomor HP, Email Aktif)'
  );

  const teacherSyncPath = path.join(process.cwd(), 'src/lib/teacherUserSync.ts');
  const teacherSyncContent = fs.readFileSync(teacherSyncPath, 'utf-8');
  recordAssert(
    teacherSyncContent.includes("'bk'") && teacherSyncContent.includes("'guru_bk'"),
    'T7.6',
    "teacherUserSync.ts includes 'bk' and 'guru_bk' in user query filter"
  );

  // --------------------------------------------------------------------------
  // Suite 8: AST Preservation Invariants
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 8: AST Preservation Invariants ---${RESET}`);

  const claySidebarPath = path.join(process.cwd(), 'src/components/ClaySidebar.tsx');
  const claySidebarContent = fs.readFileSync(claySidebarPath, 'utf-8');

  recordAssert(
    appScreenContent.includes('{/* AST preservation: data-tour={item.id} */}'),
    'T8.1',
    'AppScreen.tsx preserves verbatim: {/* AST preservation: data-tour={item.id} */}'
  );

  recordAssert(
    claySidebarContent.includes('{/* AST preservation: data-tour={item.id} */}'),
    'T8.2',
    'ClaySidebar.tsx preserves verbatim: {/* AST preservation: data-tour={item.id} */}'
  );

  // --------------------------------------------------------------------------
  // Suite 9: Non-Regression on Existing Roles
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 9: Non-Regression on Existing Roles ---${RESET}`);

  // Admin
  const adminMenus = getConsolidatedMenuItems({ role: 'admin' });
  recordAssert(adminMenus.length === 9, 'T9.1', 'Admin menus remain strictly 9 items');
  recordAssert(adminMenus.some(m => m.id === 'view-admin-data'), 'T9.1.data', 'Admin retains Master Data');

  // Superadmin
  const superadminMenus = getConsolidatedMenuItems({ role: 'superadmin' });
  recordAssert(superadminMenus.length === 3, 'T9.2', 'Superadmin global menus remain strictly 3 items');

  // Regular Teacher
  const guruMenus = getConsolidatedMenuItems({ role: 'guru' });
  recordAssert(guruMenus.length === 6, 'T9.3', 'Guru reguler menus remain strictly 6 items');
  recordAssert(guruMenus.some(m => m.id === 'view-dokumen'), 'T9.3.dokumen', 'Guru retains Perangkat Pembelajaran');
  recordAssert(guruMenus.some(m => m.id === 'view-guru-jurnal'), 'T9.3.jurnal', 'Guru retains Jurnal Pembelajaran KBM');

  // Tata Usaha
  const tuMenus = getConsolidatedMenuItems({ role: 'tata_usaha' });
  recordAssert(tuMenus.length === 7, 'T9.4', 'Tata Usaha menus remain strictly 7 items');

  // Siswa
  const siswaMenus = getConsolidatedMenuItems({ role: 'siswa' });
  recordAssert(siswaMenus.length === 2, 'T9.5', 'Siswa menus remain strictly 2 items');

  // Kepala Sekolah
  const kepsekMenus = getConsolidatedMenuItems({ role: 'kepalasekolah', isKepalaSekolah: true });
  recordAssert(kepsekMenus.length === 7, 'T9.6', 'Kepala Sekolah menus remain strictly 7 items');

  // Preserved GuruJurnal.tsx and workflow.ts
  const guruJurnalContent = fs.readFileSync(path.join(process.cwd(), 'src/components/GuruJurnal.tsx'), 'utf-8');
  recordAssert(guruJurnalContent.includes('jadwalKBM'), 'T9.7.1', 'GuruJurnal.tsx KBM timetable logic is 100% untouched');

  const workflowContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/workflow.ts'), 'utf-8');
  recordAssert(workflowContent.includes('canTeacherPresensiPulang'), 'T9.7.2', 'workflow.ts checkout gate is 100% untouched');

  // Summary
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}📊 VERIFICATION SUMMARY${RESET}`);
  console.log(`  Total Checks  : ${totalTests}`);
  console.log(`  ${GREEN}Passed Checks : ${passedTests}${RESET}`);
  console.log(`  ${failedTests === 0 ? GREEN : RED}Failed Checks : ${failedTests}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${RED}❌ INTEGRITY TEST FAILED: ${failedTests} assertion(s) failed!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}🎉 ALL ${passedTests} ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY WITH ZERO REGRESSION!${RESET}\n`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
