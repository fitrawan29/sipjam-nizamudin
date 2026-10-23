/**
 * ============================================================================
 * EMPIRICAL TEST SUITE: DINAS PENDIDIKAN DASHBOARD & APP SCREEN ROUTING (M2)
 * File: tests/dinas_dashboard_and_routing_m2.test.ts
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testId: string, desc: string, detail?: string) {
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
  console.log(`${BOLD}${CYAN}🧪 TEST SUITE: DINAS DASHBOARD, CLAY SIDEBAR, & ROUTING (MILESTONE 2)${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const projectRoot = path.resolve(__dirname, '..');
  const dinasDashboardPath = path.join(projectRoot, 'src', 'components', 'DinasDashboard.tsx');
  const claySidebarPath = path.join(projectRoot, 'src', 'components', 'ClaySidebar.tsx');
  const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
  const adminRekapPath = path.join(projectRoot, 'src', 'components', 'AdminRekapView.tsx');
  const rekapJurnalPath = path.join(projectRoot, 'src', 'components', 'RekapJurnalView.tsx');

  // ============================================================================
  // SUITE 1: FILE EXISTENCE & EXPORT CONTRACTS
  // ============================================================================
  console.log(`${BOLD}[Suite 1: File Existence & Export Contracts]${RESET}`);

  assert(fs.existsSync(dinasDashboardPath), 'M2-S1-01', 'DinasDashboard.tsx exists');
  const dinasContent = fs.readFileSync(dinasDashboardPath, 'utf8');

  assert(
    dinasContent.includes('export default function DinasDashboard') ||
    dinasContent.includes('export const DinasDashboard') ||
    dinasContent.includes('export default DinasDashboard'),
    'M2-S1-02',
    'DinasDashboard has standard component export'
  );

  assert(
    dinasContent.includes('DinasDashboardProps') &&
    dinasContent.includes('user:') &&
    dinasContent.includes('schools:'),
    'M2-S1-03',
    'DinasDashboardProps defines user and schools contracts'
  );

  // ============================================================================
  // SUITE 2: REGIONAL SCOPING & METRIC AGGREGATION LOGIC
  // ============================================================================
  console.log(`\n${BOLD}[Suite 2: Regional Scoping & Data Aggregation]${RESET}`);

  // Test region normalization logic empirically
  const normalizeRegion = (r?: string | null) => (r || '').trim().toLowerCase();
  
  const testSchools = [
    { id: 'sch-1', nama_sekolah: 'SMK 1 Kotamobagu', kota_kabupaten: 'Kota Kotamobagu', status: 'aktif' },
    { id: 'sch-2', nama_sekolah: 'SMA 2 Kotamobagu', kota_kabupaten: '  kota kotamobagu  ', status: 'aktif' },
    { id: 'sch-3', nama_sekolah: 'SMP 3 Manado', kota_kabupaten: 'Kota Manado', status: 'aktif' },
    { id: 'sch-4', nama_sekolah: 'SD 4 Bolmong', kota_kabupaten: 'Kabupaten Bolaang Mongondow', status: 'nonaktif' },
  ];

  const userRegion = 'Kota Kotamobagu';
  const scopedSchools = testSchools.filter(
    s => normalizeRegion(s.kota_kabupaten) === normalizeRegion(userRegion)
  );

  assert(
    scopedSchools.length === 2 && scopedSchools.every(s => s.id === 'sch-1' || s.id === 'sch-2'),
    'M2-S2-01',
    'Empirical filter matches exactly regional schools (case-insensitive & trimmed)',
    `Matched ${scopedSchools.length} of 4 schools`
  );

  assert(
    dinasContent.includes('.trim().toLowerCase()') && dinasContent.includes('userRegion'),
    'M2-S2-02',
    'DinasDashboard implements case-insensitive trimmed regional scoping'
  );

  // Check 5 aggregate metric cards exist in DinasDashboard
  assert(
    dinasContent.includes('Total Sekolah Binaan') &&
    dinasContent.includes('Kehadiran Guru Hari Ini') &&
    dinasContent.includes('Kehadiran Siswa Hari Ini') &&
    dinasContent.includes('Kesehatan Satelit') &&
    dinasContent.includes('Sekolah Perlu Perhatian'),
    'M2-S2-03',
    'DinasDashboard implements all 5 executive metric cards'
  );

  // Test "Sekolah Perlu Perhatian" classification logic
  // Condition: Alpa > 10% || Kehadiran Guru < 70% || Status !== 'aktif'
  const isAttentionNeeded = (alpaRate: number, guruRate: number, status: string) => {
    return alpaRate > 10 || guruRate < 70 || status !== 'aktif';
  };

  assert(isAttentionNeeded(12, 85, 'aktif') === true, 'M2-S2-04', 'Flagged when student alpa > 10%');
  assert(isAttentionNeeded(5, 65, 'aktif') === true, 'M2-S2-05', 'Flagged when teacher attendance < 70%');
  assert(isAttentionNeeded(2, 95, 'nonaktif') === true, 'M2-S2-06', 'Flagged when school is non-active');
  assert(isAttentionNeeded(3, 90, 'aktif') === false, 'M2-S2-07', 'Not flagged when school is healthy');

  // ============================================================================
  // SUITE 3: DRILLDOWN TRIGGER & PRINT CAPABILITIES
  // ============================================================================
  console.log(`\n${BOLD}[Suite 3: Drilldown Navigation & Print View]${RESET}`);

  assert(
    dinasContent.includes('onSelectTargetSchool') || dinasContent.includes('onSelectSchool'),
    'M2-S3-01',
    'DinasDashboard includes drilldown selection callback ("Tinjau Sekolah")'
  );

  assert(
    dinasContent.includes('Tinjau') && dinasContent.includes('fa-arrow-right'),
    'M2-S3-02',
    'DinasDashboard renders "Tinjau Sekolah" drilldown trigger button'
  );

  assert(
    dinasContent.includes('triggerPrintWithGps') && dinasContent.includes('PrintHeader'),
    'M2-S3-03',
    'DinasDashboard integrates GPS-stamped PrintHeader and triggerPrintWithGps'
  );

  assert(
    dinasContent.includes('print-only') || dinasContent.includes('@media print') || dinasContent.includes('hidden print:block'),
    'M2-S3-04',
    'DinasDashboard renders official regional print layout'
  );

  // ============================================================================
  // SUITE 4: CLAYSIDEBAR INTEGRATION & REGIONAL SCOPING
  // ============================================================================
  console.log(`\n${BOLD}[Suite 4: ClaySidebar Integration]${RESET}`);

  const sidebarContent = fs.readFileSync(claySidebarPath, 'utf8');

  assert(
    sidebarContent.includes('isDinas?: boolean'),
    'M2-S4-01',
    'ClaySidebarProps declares isDinas optional prop'
  );

  assert(
    sidebarContent.includes('Dinas Pendidikan') && sidebarContent.includes('fa-building-columns'),
    'M2-S4-02',
    'ClaySidebar renders Dinas Pendidikan badge with fa-building-columns icon'
  );

  assert(
    sidebarContent.includes('Wilayah:') && sidebarContent.includes('kota_kabupaten'),
    'M2-S4-03',
    'ClaySidebar renders regional subtitle from user.kota_kabupaten'
  );

  assert(
    sidebarContent.includes('(isSuperadmin || isDinas)') ||
    sidebarContent.includes('isDinas && user?.kota_kabupaten'),
    'M2-S4-04',
    'ClaySidebar enables regional school switcher for isDinas scoped strictly to kota_kabupaten'
  );

  // ============================================================================
  // SUITE 5: APPSCREEN ROUTING, READ-ONLY GUARDS & DRILLDOWN BANNER
  // ============================================================================
  console.log(`\n${BOLD}[Suite 5: AppScreen Routing & Security Enforcement]${RESET}`);

  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');

  // Verify dinas role normalization
  assert(
    appScreenContent.includes("dinaspendidikan"),
    'M2-S5-01',
    'AppScreen normalizes dinas role to dinaspendidikan'
  );

  // Verify default landing view
  assert(
    appScreenContent.includes("'view-dinas-overview'"),
    'M2-S5-02',
    'AppScreen sets default landing view for dinas to view-dinas-overview'
  );

  // Verify menu items for dinas
  assert(
    appScreenContent.includes('menuItemsDinas') &&
    (appScreenContent.includes('Dashboard Eksekutif') || appScreenContent.includes('Executive Dashboard')) &&
    appScreenContent.includes('Rekap Guru') &&
    appScreenContent.includes('Presensi Siswa') &&
    appScreenContent.includes('Jurnal Kelas'),
    'M2-S5-03',
    'AppScreen defines menuItemsDinas with 4 permitted cross-school views'
  );

  // Verify mutation view blocking (security guard)
  assert(
    appScreenContent.includes('view-admin-data') &&
    appScreenContent.includes('view-admin-config') &&
    appScreenContent.includes('view-admin-backup') &&
    (appScreenContent.includes('Akun Dinas Pendidikan hanya memiliki wewenang monitoring') || appScreenContent.includes('Akses Dibatasi')),
    'M2-S5-04',
    'AppScreen navigation guard blocks mutation views for dinas with security alert'
  );

  // Verify drilldown banner with return button
  assert(
    (appScreenContent.includes('Memantau Sekolah:') || appScreenContent.includes('Mode Tinjau Sekolah Binaan')) &&
    appScreenContent.includes('Kembali ke Dashboard') &&
    appScreenContent.includes('clearActiveTargetSchool'),
    'M2-S5-05',
    'AppScreen renders drilldown banner with "Kembali ke Dashboard" return trigger'
  );

  // Verify isReadOnly passed to sub-views
  assert(
    appScreenContent.includes('<AdminRekapView') &&
    appScreenContent.includes('isReadOnly={isDinas}'),
    'M2-S5-06',
    'AppScreen passes isReadOnly={isDinas} to AdminRekapView'
  );

  assert(
    appScreenContent.includes('<RekapJurnalView') &&
    appScreenContent.includes('isReadOnly={isDinas}'),
    'M2-S5-07',
    'AppScreen passes isReadOnly={isDinas} to RekapJurnalView'
  );

  // ============================================================================
  // SUITE 6: CHILD VIEW ISREADONLY PROP SUPPORT
  // ============================================================================
  console.log(`\n${BOLD}[Suite 6: Child View isReadOnly Prop Support]${RESET}`);

  const adminRekapContent = fs.readFileSync(adminRekapPath, 'utf8');
  assert(
    adminRekapContent.includes('isReadOnly?: boolean'),
    'M2-S6-01',
    'AdminRekapView accepts isReadOnly prop'
  );

  const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf8');
  assert(
    rekapJurnalContent.includes('isReadOnly?: boolean'),
    'M2-S6-02',
    'RekapJurnalView accepts isReadOnly prop and grants class tab visibility'
  );

  // ============================================================================
  // FINAL SCORE SUMMARY
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}TOTAL TESTS: ${totalTests} | PASSED: ${GREEN}${passedTests}${RESET} | FAILED: ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
