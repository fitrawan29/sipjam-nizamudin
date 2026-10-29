/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL AST & REGRESSION INVARIANTS TEST SUITE
 * Challenger 2: Milestone 1 (Regression and AST Invariants)
 * File: tests/adversarial_ast_invariants_challenger.test.ts
 *
 * Verifies that all code modifications made in Milestone 1:
 * 1. Strictly preserve all AST regex and string invariants expected by:
 *    - tests/kepsek_pengawas_rbac.test.ts
 *    - tests/dinas_pendidikan_monitoring.test.ts
 *    - tests/sistem_blok_verification.test.ts
 *    - tests/session_resilience_and_clean_rekap.test.ts
 * 2. Maintain 100% backward compatibility for URL query parameters & edge case tab values.
 * 3. Preserve in-memory DOM keep-alive and CSS display toggling across all normalized components.
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(desc: string, condition: boolean, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${desc}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✗ FAIL:${RESET} ${desc}`);
    if (detail) console.error(`    ${RED}↳ Detail: ${detail}${RESET}`);
  }
}

async function run() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}ADVERSARIAL AST & REGRESSION INVARIANTS CHALLENGER (MILESTONE 1)${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const root = path.resolve(__dirname, '..');
  const appScreenCode = fs.readFileSync(path.join(root, 'src/components/AppScreen.tsx'), 'utf-8');
  const guruJurnalCode = fs.readFileSync(path.join(root, 'src/components/GuruJurnal.tsx'), 'utf-8');
  const guruPresensiCode = fs.readFileSync(path.join(root, 'src/components/GuruPresensi.tsx'), 'utf-8');
  const adminRekapCode = fs.readFileSync(path.join(root, 'src/components/AdminRekapView.tsx'), 'utf-8');
  const historyCode = fs.readFileSync(path.join(root, 'src/components/HistoryView.tsx'), 'utf-8');
  const rekapJurnalCode = fs.readFileSync(path.join(root, 'src/components/RekapJurnalView.tsx'), 'utf-8');
  const clayTabsCode = fs.readFileSync(path.join(root, 'src/components/ClayTabs.tsx'), 'utf-8');

  // ==========================================================================
  // SECTION 1: KEPSEK & PENGAWAS RBAC AST INVARIANTS
  // ==========================================================================
  console.log(`${BOLD}━━━ SECTION 1: tests/kepsek_pengawas_rbac.test.ts Invariants ━━━${RESET}`);

  check(
    'R1.1: AppScreen wraps view-rekap-siswa in isWaliKelas condition',
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-rekap-siswa'") ||
    appScreenCode.includes("isWaliKelas ? [{ id: 'view-rekap-siswa'")
  );

  check(
    'R1.2: AppScreen wraps view-jurnal-kelas in isWaliKelas condition',
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-jurnal-kelas'")
  );

  check(
    'R1.3: AppScreen wraps view-rapor in isWaliKelas condition',
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-rapor'")
  );

  check(
    'R1.4: AppScreen handleNavigation guards view-rekap-siswa against non-wali',
    appScreenCode.includes("if (targetId === 'view-rekap-siswa') {") && appScreenCode.includes("!isWaliKelas")
  );

  check(
    'R1.5: AppScreen handleNavigation guards view-jurnal-kelas against non-wali',
    appScreenCode.includes("if (targetId === 'view-jurnal-kelas') {") && appScreenCode.includes("!isWaliKelas")
  );

  check(
    'R1.6: AppScreen handleNavigation guards view-rapor against non-wali',
    appScreenCode.includes("if (targetId === 'view-rapor') {") && appScreenCode.includes("!isWaliKelas")
  );

  check(
    'R2.5: AppScreen integrates useKepalaSekolah & assigns menuItemsKepalaSekolah',
    appScreenCode.includes('useKepalaSekolah') &&
    appScreenCode.includes('menuItemsKepalaSekolah') &&
    appScreenCode.includes('menuItems = menuItemsKepalaSekolah')
  );

  check(
    'R2.7: AppScreen passes isReadOnly flag to AdminVerifView & RekapSiswaView for Kepala Sekolah',
    appScreenCode.includes('isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}')
  );

  check(
    'R4.2: AppScreen passes isKepalaSekolah prop to RekapJurnalView',
    appScreenCode.includes('isKepalaSekolah={isKepalaSekolah}') || appScreenCode.includes('isKepalaSekolah={true}')
  );

  check(
    'R4.3: RekapJurnalView accepts isKepalaSekolah and allows inspecting class journals across school',
    rekapJurnalCode.includes('isKepalaSekolah') &&
    rekapJurnalCode.includes('!isAdmin && !isKepalaSekolah && !isWaliKelas') &&
    rekapJurnalCode.includes("isAdmin || isKepalaSekolah || tabMode === 'pribadi'")
  );

  check(
    'R4.5: PrintSignature in AdminRekapView passes user and sekolahId={user?.sekolah_id}',
    adminRekapCode.includes('<PrintSignature') &&
    adminRekapCode.includes('user={user}') &&
    adminRekapCode.includes('sekolahId={user?.sekolah_id}')
  );

  check(
    'R5.1: Strict regex guards for direct URL manipulation of admin views',
    /currentView === 'view-admin-config'\s*&&\s*\(\s*(?:isAdmin \|\| isSuperadmin)/.test(appScreenCode) &&
    /currentView === 'view-admin-data'\s*&&\s*\(\s*(?:isAdmin \|\| isSuperadmin)/.test(appScreenCode) &&
    /currentView === 'view-admin-backup'\s*&&\s*\(\s*(?:isAdmin \|\| isSuperadmin)/.test(appScreenCode) &&
    /currentView === 'view-admin-verif'\s*&&\s*\(\s*(?:isAdmin \|\| isSuperadmin \|\| isKepalaSekolah)/.test(appScreenCode) &&
    /currentView === 'view-admin-rekap'\s*&&\s*\(\s*(?:isAdmin \|\| isSuperadmin \|\| isKepalaSekolah)/.test(appScreenCode)
  );

  check(
    'R5.2: AppScreen propagates isKepalaSekolah state to personal rekap jurnal view',
    appScreenCode.includes("{currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />}")
  );

  check(
    'R5.5: PrintHeader in AdminRekapView and RekapJurnalView receives user and sekolahId',
    adminRekapCode.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id} />') &&
    rekapJurnalCode.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id} />')
  );

  check(
    'R5.7: RekapJurnalView dynamically resolves designated homeroom teacher (Wali Kelas)',
    rekapJurnalCode.includes('waliKelasMap') &&
    rekapJurnalCode.includes('signerName = waliKelasMap[kelas].nama_guru') &&
    rekapJurnalCode.includes('signerNip = waliKelasMap[kelas].nip')
  );

  // ==========================================================================
  // SECTION 2: DINAS PENDIDIKAN MONITORING AST INVARIANTS
  // ==========================================================================
  console.log(`\n${BOLD}━━━ SECTION 2: tests/dinas_pendidikan_monitoring.test.ts Invariants ━━━${RESET}`);

  check(
    'R4.3-01: AppScreen normalizes dinas role and lands on view-dinas-overview',
    appScreenCode.includes("isDinas = (baseUser?.role || '').toLowerCase().replace(/[\\s_-]+/g, '') === 'dinaspendidikan'") &&
    appScreenCode.includes("isDinas ? 'view-dinas-overview' : 'view-home'")
  );

  check(
    'R4.3-02: AppScreen navigation guard blocks administrative mutation views for dinas',
    appScreenCode.includes("'view-admin-data'") &&
    appScreenCode.includes("'view-admin-config'") &&
    appScreenCode.includes("'view-admin-backup'") &&
    appScreenCode.includes("'view-sistem-blok'") &&
    appScreenCode.includes("'view-admin-verif'") &&
    appScreenCode.includes('Akses Terblokir: Akun Dinas Pendidikan hanya memiliki wewenang monitoring read-only')
  );

  check(
    'R4.3-05: AppScreen propagates isReadOnly={isDinas} to AdminRekapView, RekapJurnalView, and RekapSiswaView',
    appScreenCode.includes('<AdminRekapView') &&
    appScreenCode.includes('isReadOnly={isDinas}') &&
    appScreenCode.includes('<RekapJurnalView') &&
    appScreenCode.includes('<RekapSiswaView')
  );

  check(
    'R4.3-05b: AdminRekapView & RekapJurnalView declare isReadOnly?: boolean prop contract',
    adminRekapCode.includes('isReadOnly?: boolean') &&
    rekapJurnalCode.includes('isReadOnly?: boolean')
  );

  check(
    'R4.5-03: AppScreen contains drilldown banner with return trigger resetting target school scope',
    appScreenCode.includes('clearActiveTargetSchool') &&
    appScreenCode.includes('Kembali ke Dashboard') &&
    appScreenCode.includes('activeTargetSchool')
  );

  check(
    'R4.6-02: AppScreen maps target school ID to effectiveUser.sekolah_id',
    appScreenCode.includes('sekolah_id: activeTargetSchool.id') ||
    appScreenCode.includes('sekolah_id: (activeTargetSchool as any).id')
  );

  // ==========================================================================
  // SECTION 3: SISTEM BLOK VERIFICATION AST INVARIANTS
  // ==========================================================================
  console.log(`\n${BOLD}━━━ SECTION 3: tests/sistem_blok_verification.test.ts Invariants ━━━${RESET}`);

  check(
    'R1.6: AppScreen handleNavigation explicitly guards view-sistem-blok against non-admin navigation',
    appScreenCode.includes("targetId === 'view-sistem-blok'") &&
    appScreenCode.includes("Akses Terblokir: Halaman Manajemen Sistem Blok secara eksklusif hanya dapat diakses oleh Administrator")
  );

  check(
    'R1.6b: AppScreen view router conditionally renders SistemBlokView only for Admin/Superadmin',
    appScreenCode.includes("{currentView === 'view-sistem-blok' && (")
  );

  check(
    'R3.1: GuruJurnal automatically switches mode to Jurnal Kegiatan when dailyState.isBlok is true',
    guruJurnalCode.includes("if (state.isBlok) {") &&
    guruJurnalCode.includes("setTipeJurnal('Jurnal Kegiatan')") &&
    guruJurnalCode.includes("setDateBlok(state.blokInfo)")
  );

  check(
    'R3.2: HistoryView includes item.keterangan in search filter and renders proper title',
    historyCode.includes("(item.keterangan || '').toLowerCase().includes(search.toLowerCase())") &&
    historyCode.includes("Reset pencarian") &&
    historyCode.includes("Tidak ada riwayat")
  );

  check(
    'R3.3: RekapJurnalView displays Kegiatan Khusus (Sistem Blok) in Mapel column',
    rekapJurnalCode.includes('Kegiatan Khusus (Sistem Blok)')
  );

  // ==========================================================================
  // SECTION 4: SESSION RESILIENCE & CLEAN REKAP AST INVARIANTS
  // ==========================================================================
  console.log(`\n${BOLD}━━━ SECTION 4: tests/session_resilience_and_clean_rekap.test.ts Invariants ━━━${RESET}`);

  check(
    'R2.1: AdminRekapView implements isTestGuruName filter helper',
    adminRekapCode.includes('isTestGuruName')
  );

  check(
    'R2.2: AdminRekapView filters out Test Guru from queries and aggregations',
    adminRekapCode.includes('!isTestGuruName(g.nama_guru)') ||
    adminRekapCode.includes('!isTestGuruName(nama)')
  );

  // ==========================================================================
  // SECTION 5: MILESTONE 1 FOUNDATION & KEEP-ALIVE CONTRACTS
  // ==========================================================================
  console.log(`\n${BOLD}━━━ SECTION 5: Milestone 1 Component Normalization & Keep-Alive Contracts ━━━${RESET}`);

  check(
    'ClayTabs is exported and available from src/components/ClayTabs.tsx',
    clayTabsCode.includes('export const ClayTabs: React.FC<ClayTabsProps>') &&
    clayTabsCode.includes('export function getNextTabId')
  );

  check(
    'GuruJurnal wraps input form in role="tabpanel" with CSS hidden toggle (Zero Draft Loss)',
    guruJurnalCode.includes('id="panel-input"') &&
    guruJurnalCode.includes('role="tabpanel"') &&
    guruJurnalCode.includes("className={activeTab === 'input' ? 'block' : 'hidden'}")
  );

  check(
    'GuruJurnal embeds RekapJurnalView for sub-tabs rekap-pribadi and supervisi-kelas',
    guruJurnalCode.includes("controlledMode=\"pribadi\"") &&
    guruJurnalCode.includes("controlledMode=\"kelas\"") &&
    guruJurnalCode.includes("hideTabSwitch={true}")
  );

  check(
    'GuruPresensi wraps live selfie camera in role="tabpanel" with CSS hidden toggle (Zero Stream Interruption)',
    guruPresensiCode.includes('id="panel-live"') &&
    guruPresensiCode.includes('role="tabpanel"') &&
    guruPresensiCode.includes("className={activeTab === 'live' ? 'block' : 'hidden'}")
  );

  check(
    'GuruPresensi embeds HistoryView for riwayat sub-tab with onlyTab="presensi"',
    guruPresensiCode.includes('<HistoryView') &&
    guruPresensiCode.includes('onlyTab="presensi"') &&
    guruPresensiCode.includes('hideTabSwitch={true}') &&
    guruPresensiCode.includes('hideSectionWrapper={true}')
  );

  check(
    'HistoryView preserves dynamic Wrapper element (div vs section) for sub-tab embedding',
    historyCode.includes("const Wrapper = hideSectionWrapper ? 'div' : 'section'") &&
    historyCode.includes("!hideTabSwitch && (")
  );

  check(
    'AdminRekapView preserves targetSchool and isReadOnly banner for Dinas Pendidikan',
    adminRekapCode.includes('targetSchool') &&
    adminRekapCode.includes('isReadOnly && (') &&
    adminRekapCode.includes('Dinas Pendidikan')
  );

  check(
    'AppScreen mounts GuruPresensi passing initialTab={(urlTab as any) || "live"}',
    appScreenCode.includes('<GuruPresensi') &&
    appScreenCode.includes("initialTab={(urlTab as any) || 'live'}")
  );

  check(
    'AppScreen mounts GuruJurnal passing initialTab={(urlTab as any) || "input"}',
    appScreenCode.includes('<GuruJurnal') &&
    appScreenCode.includes("initialTab={(urlTab as any) || 'input'}")
  );

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | ${GREEN}Passed: ${passedTests}${RESET} | ${failedTests > 0 ? RED : GREEN}Failed: ${failedTests}${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
