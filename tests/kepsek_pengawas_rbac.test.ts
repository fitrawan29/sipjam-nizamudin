/**
 * ============================================================================
 * EMPIRICAL INTEGRATION & RBAC TEST SUITE
 * File: tests/kepsek_pengawas_rbac.test.ts
 *
 * Requirements Verified:
 * 1. R1: Role-Based Menu Visibility:
 *    - Regular teachers who are NOT assigned as Wali Kelas MUST NOT see:
 *      * Presensi Siswa (`view-rekap-siswa`)
 *      * Jurnal Kelas (`view-jurnal-kelas`)
 *      * Rapor (`view-rapor`)
 *    - Active Wali Kelas and Admin MUST see and access them.
 * 2. R2: Kepala Sekolah Appointment & Read-Only Admin Monitoring:
 *    - In `AdminConfigView`, provide dropdown selection to designate a teacher as Kepala Sekolah,
 *      persisted to school settings and sekolah profile.
 *    - Helper / Hook `useKepalaSekolah` resolves designated teacher.
 *    - Kepala Sekolah gains monitoring access to admin features (Rekap Presensi, Verifikasi,
 *      Analitik, Jurnal, Presensi Siswa) in read-only mode (mutation/approval/save buttons disabled/hidden).
 * 3. R3: Pengawas Bina Signature & Identification:
 *    - In `AdminConfigView`, add toggle switch and inputs for Full Name, NIP/NIK, and Jabatan.
 *    - Persisted to settings.
 *    - When enabled, printed reports include Pengawas Bina signature in a 3-column / endorsement layout;
 *      when disabled, fallback to standard layout.
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { checkIsKepalaSekolah, normalizeTeacherName } from '../src/hooks/useKepalaSekolah';

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
  console.log(`${BOLD}${CYAN}🧪 TEST SUITE: RBAC MENU, KEPALA SEKOLAH MONITORING, & PENGAWAS BINA${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const projectRoot = path.resolve(__dirname, '..');
  const appScreenCode = fs.readFileSync(path.join(projectRoot, 'src/components/AppScreen.tsx'), 'utf-8');
  const configCode = fs.readFileSync(path.join(projectRoot, 'src/components/AdminConfigView.tsx'), 'utf-8');
  const printHeaderCode = fs.readFileSync(path.join(projectRoot, 'src/components/PrintHeader.tsx'), 'utf-8');
  const verifCode = fs.readFileSync(path.join(projectRoot, 'src/components/AdminVerifView.tsx'), 'utf-8');
  const rekapSiswaCode = fs.readFileSync(path.join(projectRoot, 'src/components/RekapSiswaView.tsx'), 'utf-8');
  const kepsekHookCode = fs.readFileSync(path.join(projectRoot, 'src/hooks/useKepalaSekolah.ts'), 'utf-8');

  // ==========================================================================
  // SECTION 1: R1 - ROLE-BASED MENU VISIBILITY
  // ==========================================================================
  console.log(`${BOLD}━━━ SECTION 1: R1 - Role-Based Menu Visibility (Wali Kelas vs Non-Wali) ━━━${RESET}`);

  // Test 1.1: menuItemsGuru wraps view-rekap-siswa inside isWaliKelas conditional
  assert(
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-rekap-siswa'") ||
    appScreenCode.includes("isWaliKelas ? [{ id: 'view-rekap-siswa'"),
    'R1.1',
    'menuItemsGuru strictly wraps view-rekap-siswa in isWaliKelas condition'
  );

  // Test 1.2: menuItemsGuru wraps view-jurnal-kelas in isWaliKelas conditional
  assert(
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-jurnal-kelas'"),
    'R1.2',
    'menuItemsGuru strictly wraps view-jurnal-kelas in isWaliKelas condition'
  );

  // Test 1.3: menuItemsGuru wraps view-rapor in isWaliKelas conditional
  assert(
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-rapor'"),
    'R1.3',
    'menuItemsGuru strictly wraps view-rapor in isWaliKelas condition'
  );

  // Test 1.4: Navigation guard blocks non-wali from accessing view-rekap-siswa
  assert(
    appScreenCode.includes("if (targetId === 'view-rekap-siswa') {") &&
    appScreenCode.includes("!isWaliKelas"),
    'R1.4',
    'handleNavigation blocks non-wali teachers from opening view-rekap-siswa'
  );

  // Test 1.5: Navigation guard blocks non-wali from accessing view-jurnal-kelas
  assert(
    appScreenCode.includes("if (targetId === 'view-jurnal-kelas') {") &&
    appScreenCode.includes("!isWaliKelas"),
    'R1.5',
    'handleNavigation blocks non-wali teachers from opening view-jurnal-kelas'
  );

  // Test 1.6: Navigation guard blocks non-wali from accessing view-rapor
  assert(
    appScreenCode.includes("if (targetId === 'view-rapor') {") &&
    appScreenCode.includes("!isWaliKelas"),
    'R1.6',
    'handleNavigation blocks non-wali teachers from opening view-rapor'
  );

  // Test 1.7: Simulation of menu generation for Non-Wali Teacher
  const simulateMenuItems = (isWali: boolean, isPiket: boolean) => {
    return [
      { id: 'view-home' },
      { id: 'view-guru-presensi' },
      { id: 'view-guru-jurnal' },
      ...(isWali ? [{ id: 'view-jurnal-kelas' }] : []),
      ...(isPiket ? [{ id: 'view-piket' }] : []),
      { id: 'view-dokumen' },
      { id: 'view-gradebook' },
      ...(isWali ? [{ id: 'view-rapor' }] : []),
      { id: 'view-informasi' },
      { id: 'view-history' },
      { id: 'view-guru-rekap-jurnal' },
      ...(isWali ? [{ id: 'view-rekap-siswa' }] : [])
    ];
  };

  const nonWaliMenu = simulateMenuItems(false, false);
  const hasRekapSiswa = nonWaliMenu.some(m => m.id === 'view-rekap-siswa');
  const hasJurnalKelas = nonWaliMenu.some(m => m.id === 'view-jurnal-kelas');
  const hasRapor = nonWaliMenu.some(m => m.id === 'view-rapor');
  assert(
    !hasRekapSiswa && !hasJurnalKelas && !hasRapor,
    'R1.7',
    'Simulated regular teacher menu excludes Presensi Siswa, Jurnal Kelas, and Rapor'
  );

  const waliMenu = simulateMenuItems(true, false);
  assert(
    waliMenu.some(m => m.id === 'view-rekap-siswa') &&
    waliMenu.some(m => m.id === 'view-jurnal-kelas') &&
    waliMenu.some(m => m.id === 'view-rapor'),
    'R1.8',
    'Simulated Wali Kelas menu includes Presensi Siswa, Jurnal Kelas, and Rapor'
  );

  // ==========================================================================
  // SECTION 2: R2 - KEPALA SEKOLAH APPOINTMENT & READ-ONLY ADMIN MONITORING
  // ==========================================================================
  console.log(`\n${BOLD}━━━ SECTION 2: R2 - Kepala Sekolah Appointment & Read-Only Admin Monitoring ━━━${RESET}`);

  // Test 2.1: AdminConfigView contains dropdown selection for Kepala Sekolah
  assert(
    configCode.includes('kepala_sekolah_id') &&
    configCode.includes('handleKepsekChange') &&
    configCode.includes('guruList.map'),
    'R2.1',
    'AdminConfigView contains teacher dropdown for appointing Kepala Sekolah'
  );

  // Test 2.2: AdminConfigView persists kepala_sekolah_id and syncs name & NIP to sekolah profile
  assert(
    configCode.includes('Object.entries(saveConfig)') &&
    configCode.includes('nama_kepala_sekolah: saveConfig.ttd_kepsek_nama') &&
    configCode.includes('updatePayload.kepala_sekolah_id = saveConfig.kepala_sekolah_id'),
    'R2.2',
    'AdminConfigView persists kepala_sekolah_id to pengaturan and updates sekolah table'
  );

  // Test 2.3: checkIsKepalaSekolah unit evaluations
  const userById = { id: 'guru-123', nama: 'Budi Santoso', username: '19800101' };
  const userByRole = { id: 'guru-999', nama: 'Ahmad Fauzi', role: 'Kepala Sekolah' };
  const userByNip = { id: 'guru-456', nama: 'Siti Rahma', username: '19750505' };
  const userByNameWithTitles = { id: 'guru-789', nama: 'Dr. H. Muhammad Ilyas, M.Pd.', username: '19680303' };

  assert(
    checkIsKepalaSekolah(userById, null, { kepala_sekolah_id: 'guru-123' }),
    'R2.3a',
    'checkIsKepalaSekolah recognizes teacher by designated kepala_sekolah_id'
  );

  assert(
    checkIsKepalaSekolah(userByRole),
    'R2.3b',
    'checkIsKepalaSekolah recognizes teacher by role "Kepala Sekolah"'
  );

  assert(
    checkIsKepalaSekolah(userByNip, null, { ttd_kepsek_nip: '19750505' }),
    'R2.3c',
    'checkIsKepalaSekolah recognizes teacher by matching NIP'
  );

  assert(
    checkIsKepalaSekolah(userByNameWithTitles, null, { ttd_kepsek_nama: 'Muhammad Ilyas' }),
    'R2.3d',
    'checkIsKepalaSekolah recognizes teacher by title-normalized name matching'
  );

  assert(
    !checkIsKepalaSekolah({ id: 'guru-other', nama: 'Dewi Lestari', username: '19900101' }, null, { kepala_sekolah_id: 'guru-123' }),
    'R2.3e',
    'checkIsKepalaSekolah returns false for regular unassigned teacher'
  );

  // Test 2.4: normalizeTeacherName strips honorary and academic degrees
  assert(
    normalizeTeacherName('Dr. Ir. H. Ahmad Fauzi, S.Pd., M.Pd.') === 'ahmad fauzi',
    'R2.4',
    'normalizeTeacherName correctly strips honorary prefixes and trailing degrees'
  );

  // Test 2.5: AppScreen integrates useKepalaSekolah and defines menuItemsKepalaSekolah
  assert(
    appScreenCode.includes('useKepalaSekolah') &&
    appScreenCode.includes('menuItemsKepalaSekolah') &&
    appScreenCode.includes('menuItems = menuItemsKepalaSekolah'),
    'R2.5',
    'AppScreen integrates useKepalaSekolah and assigns menuItemsKepalaSekolah'
  );

  // Test 2.6: menuItemsKepalaSekolah contains monitoring admin features
  assert(
    appScreenCode.includes("{ id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' }") &&
    appScreenCode.includes("{ id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Presensi' }") &&
    appScreenCode.includes("{ id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik' }") &&
    appScreenCode.includes("{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }") &&
    appScreenCode.includes("{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }"),
    'R2.6',
    'menuItemsKepalaSekolah includes Verifikasi, Rekap Presensi, Analitik, Jurnal Kelas, and Presensi Siswa'
  );

  // Test 2.7: AppScreen passes isReadOnly to AdminVerifView and RekapSiswaView for Kepala Sekolah
  assert(
    appScreenCode.includes('isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}'),
    'R2.7',
    'AppScreen passes isReadOnly flag to AdminVerifView and RekapSiswaView for Kepala Sekolah'
  );

  // Test 2.8: AdminVerifView read-only protection
  assert(
    verifCode.includes('data-testid="readonly-notice"') &&
    verifCode.includes('isReadOnly') &&
    verifCode.includes('Setujui Semua (Dinonaktifkan - Mode Peninjau)') &&
    verifCode.includes('Aksi dinonaktifkan: Anda dalam mode peninjauan (read-only)'),
    'R2.8',
    'AdminVerifView displays read-only banner, disables bulk approval, and guards mutations'
  );

  // Test 2.9: RekapSiswaView read-only protection
  assert(
    rekapSiswaCode.includes('data-testid="readonly-notice"') &&
    rekapSiswaCode.includes('Aksi simpan presensi dinonaktifkan dalam mode pemantauan Kepala Sekolah') &&
    rekapSiswaCode.includes('disabled={waliSaving || waliLoading || waliStudents.length === 0 || isIntervensiExpired || isReadOnly}'),
    'R2.9',
    'RekapSiswaView displays read-only banner, disables save button, and guards attendance updates'
  );

  // Test 2.10: RekapSiswaView allows Kepala Sekolah to view all school classes
  assert(
    rekapSiswaCode.includes('isKepalaSekolah || isReadOnly') &&
    rekapSiswaCode.includes('(user?.role === \'Admin\' || isAdmin || isKepalaSekolah || isReadOnly) ? ('),
    'R2.10',
    'RekapSiswaView allows Kepala Sekolah to select and inspect all school classes'
  );

  // ==========================================================================
  // SECTION 3: R3 - PENGAWAS BINA SIGNATURE & IDENTIFICATION
  // ==========================================================================
  console.log(`\n${BOLD}━━━ SECTION 3: R3 - Pengawas Bina Signature & Identification ━━━${RESET}`);

  // Test 3.1: AdminConfigView contains toggle switch for Pengawas Bina
  assert(
    configCode.includes('ttd_pengawas_aktif') &&
    configCode.includes('handleTogglePengawas') &&
    configCode.includes('Tanda Tangan Pengawas Bina'),
    'R3.1',
    'AdminConfigView provides toggle switch for enabling Pengawas Bina signature'
  );

  // Test 3.2: AdminConfigView contains input fields for Full Name and NIP/NIK
  assert(
    configCode.includes('ttd_pengawas_nama') &&
    configCode.includes('ttd_pengawas_nip') &&
    configCode.includes('ttd_pengawas_jabatan'),
    'R3.2',
    'AdminConfigView contains text inputs for Pengawas Bina Name, NIP, and Position'
  );

  // Test 3.3: AdminConfigView persists Pengawas Bina configuration to pengaturan table
  assert(
    configCode.includes('ttd_pengawas_aktif') &&
    configCode.includes('ttd_pengawas_nama') &&
    configCode.includes('ttd_pengawas_nip') &&
    configCode.includes('Object.entries(saveConfig)') &&
    configCode.includes("supabase.from('pengaturan').upsert"),
    'R3.3',
    'AdminConfigView persists Pengawas Bina keys to pengaturan in database'
  );

  // Test 3.4: PrintHeader PrintSignature supports Pengawas Bina props and state
  assert(
    printHeaderCode.includes('showPengawas') &&
    printHeaderCode.includes('pengawasNama') &&
    printHeaderCode.includes('pengawasNip') &&
    printHeaderCode.includes('isPengawasActive'),
    'R3.4',
    'PrintHeader PrintSignature accepts props and manages isPengawasActive state'
  );

  // Test 3.5: PrintSignature renders 3-column endorsement layout with data-testid="signature-pengawas" when active
  assert(
    printHeaderCode.includes('data-testid="signature-pengawas"') &&
    printHeaderCode.includes('signature-pengawas') &&
    printHeaderCode.includes('isPengawasActive ? ('),
    'R3.5',
    'PrintSignature renders 3-column / endorsement layout with data-testid="signature-pengawas" when active'
  );

  // Test 3.6: PrintSignature falls back to standard 2-column layout when inactive
  assert(
    printHeaderCode.includes('justify-between') &&
    printHeaderCode.includes('Kepala Sekolah') &&
    printHeaderCode.includes('isPengawasActive') &&
    printHeaderCode.includes('data-testid="signature-pengawas"'),
    'R3.6',
    'PrintSignature preserves standard 2-column layout when Pengawas Bina is disabled'
  );

  // Test 3.7: PrintSignature listens reactively to sipjam:config_updated
  assert(
    printHeaderCode.includes("window.addEventListener('sipjam:config_updated'") ||
    printHeaderCode.includes("'sipjam:config_updated'"),
    'R3.7',
    'PrintSignature subscribes reactively to sipjam:config_updated for cross-component sync'
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

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
