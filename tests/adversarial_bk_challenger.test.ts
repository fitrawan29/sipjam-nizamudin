/**
 * tests/adversarial_bk_challenger.test.ts
 *
 * ADVERSARIAL STRESS TEST & BOUNDARY VERIFICATION HARNESS
 * Target: Role BK (Bimbingan Konseling) & Jurnal BK Navigation & RBAC
 * Challenger: challenger_bk_1 (Empirical Challenger)
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  evaluateTabRBAC,
  VIEW_ALIASES,
  SIDEBAR_TOUR_ALIASES
} from '../src/lib/navigation';
import { isAdminRole } from '../src/lib/supabaseClient';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails: string[] = [];

function challenge(cond: boolean, id: string, desc: string, detail?: string) {
  totalAssertions++;
  if (cond) {
    passedAssertions++;
    console.log(`  ${GREEN}✔ [PASS]${RESET} ${id} - ${desc}`);
  } else {
    failedAssertions++;
    const errMsg = `✖ [FAIL] ${id} - ${desc}${detail ? ` -> ${detail}` : ''}`;
    failureDetails.push(errMsg);
    console.error(`  ${RED}${errMsg}${RESET}`);
  }
}

async function runAdversarialChallenges() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🛡️ ADVERSARIAL CHALLENGER: ROLE BK & JURNAL BK RBAC & NAVIGATION${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // --------------------------------------------------------------------------
  // SECTION 1: Adversarial Role Normalization & Session Parsing Fuzzing
  // --------------------------------------------------------------------------
  console.log(`${BOLD}SECTION 1: Role Normalization & Session Parsing Fuzzing${RESET}`);

  const bkRoleVariations = [
    'bk',
    'BK',
    'Bk',
    'bK',
    '  bk  ',
    '\tbk\n',
    'guru_bk',
    'Guru BK',
    'GURU_BK',
    'Guru_BK',
    'gurubk',
    'GURUBK',
    'guru-bk',
    '  guru_bk  ',
    'bimbingan_konseling',
    'Bimbingan Konseling',
    'BIMBINGAN_KONSELING',
    'bimbingankonseling',
    'bimbingan-konseling',
    '  bimbingan_konseling  ',
    'bimbingan_dan_konseling',
    'Bimbingan dan Konseling',
    'bimbingandankonseling',
    'bimbingan-dan-konseling'
  ];

  for (const roleVariant of bkRoleVariations) {
    const rawRole = (roleVariant || '').toLowerCase();
    const normRole = rawRole.replace(/[\s_-]+/g, '');
    const isBk = normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling';
    
    challenge(
      isBk === true,
      `NORM-BK-${roleVariant.trim()}`,
      `Variant '${roleVariant.trim()}' correctly recognized as canonical BK`,
      `normRole: '${normRole}', isBk: ${isBk}`
    );

    // Verify it is NOT escalated to Admin
    challenge(
      isAdminRole(roleVariant) === false,
      `NO-ESCALATE-${roleVariant.trim()}`,
      `Variant '${roleVariant.trim()}' cannot escalate to admin`
    );
  }

  // Negative tests: roles that MUST NOT normalize to BK
  const nonBkRoles = [
    'guru',
    'Guru',
    'wali_kelas',
    'Wali Kelas',
    'piket',
    'Piket',
    'tata_usaha',
    'Tata Usaha',
    'siswa',
    'Siswa',
    'admin',
    'Admin',
    'superadmin',
    'kepala_sekolah',
    'Kepala Sekolah',
    'dinas_pendidikan',
    'Dinas Pendidikan',
    'guest',
    'unknown',
    'bk_palsu',
    'fake_bk',
    'bukan_bk',
    'guru_bukan_bk',
    'bimbingan_saja',
    'konseling_saja'
  ];

  for (const nonBk of nonBkRoles) {
    const rawRole = (nonBk || '').toLowerCase();
    const normRole = rawRole.replace(/[\s_-]+/g, '');
    const isBk = normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling';

    challenge(
      isBk === false,
      `NON-BK-${nonBk}`,
      `Role '${nonBk}' is strictly NOT recognized as BK`,
      `normRole: '${normRole}', isBk: ${isBk}`
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 2: Adversarial Menu Isolation (Miller's Law - Strictly 5 Items)
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}SECTION 2: Adversarial Menu Isolation & Tampering (Miller's Law)${RESET}`);

  const expectedBkIds = [
    'view-home',
    'view-guru-presensi',
    'view-jurnal-bk',
    'view-informasi',
    'view-pengaturan-akun'
  ];

  // Test across all BK variations
  for (const roleVariant of bkRoleVariations) {
    const items = getConsolidatedMenuItems({ role: roleVariant });
    const itemIds = items.map(i => i.id);

    challenge(
      items.length === 5,
      `MENU-LEN-${roleVariant.trim()}`,
      `Role variant '${roleVariant.trim()}' produces strictly 5 items (got: ${items.length})`
    );

    challenge(
      JSON.stringify(itemIds) === JSON.stringify(expectedBkIds),
      `MENU-ORDER-${roleVariant.trim()}`,
      `Role variant '${roleVariant.trim()}' produces exact ordered items [${expectedBkIds.join(', ')}]`,
      `got: [${itemIds.join(', ')}]`
    );
  }

  // Adversarial injection: what if role BK has isWaliKelas=true or isPiketHariIni=true injected?
  const tamperedParams = [
    { role: 'bk', isWaliKelas: true },
    { role: 'bk', isPiketHariIni: true },
    { role: 'bk', isWaliKelas: true, isPiketHariIni: true },
    { role: 'guru_bk', isWaliKelas: true, isPiketHariIni: true },
    { role: 'Guru BK', isWaliKelas: true, isPiketHariIni: true },
    { role: 'bimbingan_konseling', isWaliKelas: true, isPiketHariIni: true }
  ];

  for (const [idx, param] of tamperedParams.entries()) {
    const items = getConsolidatedMenuItems(param as any);
    const itemIds = items.map(i => i.id);

    challenge(
      items.length === 5,
      `TAMPER-LEN-${idx}`,
      `Tampered params {role: '${param.role}', isWali: ${param.isWaliKelas}, isPiket: ${param.isPiketHariIni}} still returns strictly 5 items (got: ${items.length})`
    );

    challenge(
      !itemIds.includes('view-rekap-siswa'),
      `TAMPER-NO-WALI-${idx}`,
      `Role BK cannot leak 'view-rekap-siswa' even when isWaliKelas=true`
    );

    challenge(
      !itemIds.includes('view-piket'),
      `TAMPER-NO-PIKET-${idx}`,
      `Role BK cannot leak 'view-piket' even when isPiketHariIni=true`
    );

    challenge(
      !itemIds.includes('view-guru-jurnal'),
      `TAMPER-NO-KBM-${idx}`,
      `Role BK cannot leak 'view-guru-jurnal'`
    );

    challenge(
      !itemIds.includes('view-dokumen'),
      `TAMPER-NO-DOKUMEN-${idx}`,
      `Role BK cannot leak 'view-dokumen'`
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 3: Adversarial RBAC on `view-jurnal-bk`
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}SECTION 3: RBAC Challenge on 'view-jurnal-bk' & 'view-bk-jurnal'${RESET}`);

  // Test 1: 100% of unauthorized roles MUST be denied access with confidentiality reason
  const unauthorizedUsers = [
    { desc: 'Regular Teacher (guru)', user: { role: 'guru' } },
    { desc: 'Teacher uppercase (GURU)', user: { role: 'GURU' } },
    { desc: 'Wali Kelas', user: { role: 'guru', isWaliKelas: true } },
    { desc: 'Wali Kelas explicit role', user: { role: 'wali_kelas' } },
    { desc: 'Wali Kelas mixed case', user: { role: 'Wali Kelas' } },
    { desc: 'Piket', user: { role: 'piket' } },
    { desc: 'Piket uppercase', user: { role: 'PIKET' } },
    { desc: 'Tata Usaha (tata_usaha)', user: { role: 'tata_usaha' } },
    { desc: 'Tata Usaha (Tata Usaha)', user: { role: 'Tata Usaha' } },
    { desc: 'Tata Usaha (tatausaha)', user: { role: 'tatausaha' } },
    { desc: 'Siswa (siswa)', user: { role: 'siswa' } },
    { desc: 'Siswa (SISWA)', user: { role: 'SISWA' } },
    { desc: 'Dinas Pendidikan (dinas_pendidikan)', user: { role: 'dinas_pendidikan' } },
    { desc: 'Dinas Pendidikan (Dinas Pendidikan)', user: { role: 'Dinas Pendidikan' } },
    { desc: 'Dinas Pendidikan (dinaspendidikan)', user: { role: 'dinaspendidikan' } },
    { desc: 'Guest / unknown role', user: { role: 'guest' } },
    { desc: 'Empty role string', user: { role: '' } },
    { desc: 'Null role', user: { role: null as any } },
    { desc: 'Undefined role', user: { role: undefined } },
    { desc: 'Empty user object', user: {} },
    { desc: 'Null user object', user: null as any },
    { desc: 'Undefined user object', user: undefined as any }
  ];

  for (const targetRoute of ['view-jurnal-bk', 'view-bk-jurnal']) {
    for (const [idx, item] of unauthorizedUsers.entries()) {
      const res = evaluateTabRBAC(targetRoute, '', item.user as any);
      
      challenge(
        res.allowed === false,
        `DENY-${targetRoute}-${idx}`,
        `Strictly DENIED access to '${targetRoute}' for ${item.desc}`,
        `res: ${JSON.stringify(res)}`
      );

      challenge(
        res.fallbackTab === 'view-home',
        `FALLBACK-${targetRoute}-${idx}`,
        `Fallback tab is 'view-home' for ${item.desc}`,
        `fallback: '${res.fallbackTab}'`
      );

      challenge(
        typeof res.reason === 'string' && res.reason.includes('Jurnal BK bersifat rahasia'),
        `REASON-${targetRoute}-${idx}`,
        `Confidentiality reason provided for ${item.desc}`,
        `reason: '${res.reason}'`
      );
    }
  }

  // Test 2: 100% of authorized roles MUST be allowed
  const authorizedUsers = [
    { desc: 'BK canonical', user: { role: 'bk' } },
    { desc: 'BK uppercase', user: { role: 'BK' } },
    { desc: 'BK with spaces', user: { role: '  bk  ' } },
    { desc: 'guru_bk', user: { role: 'guru_bk' } },
    { desc: 'Guru BK', user: { role: 'Guru BK' } },
    { desc: 'gurubk', user: { role: 'gurubk' } },
    { desc: 'bimbingan_konseling', user: { role: 'bimbingan_konseling' } },
    { desc: 'Bimbingan Konseling', user: { role: 'Bimbingan Konseling' } },
    { desc: 'bimbingankonseling', user: { role: 'bimbingankonseling' } },
    { desc: 'bimbingan_dan_konseling', user: { role: 'bimbingan_dan_konseling' } },
    { desc: 'bimbingandankonseling', user: { role: 'bimbingandankonseling' } },
    { desc: 'Admin canonical', user: { role: 'admin' } },
    { desc: 'Admin uppercase', user: { role: 'ADMIN' } },
    { desc: 'Superadmin', user: { role: 'superadmin' } },
    { desc: 'Kepala Sekolah (role: kepala_sekolah)', user: { role: 'kepala_sekolah' } },
    { desc: 'Kepala Sekolah (role: Kepala Sekolah)', user: { role: 'Kepala Sekolah' } },
    { desc: 'Kepala Sekolah (role: kepalasekolah)', user: { role: 'kepalasekolah' } },
    { desc: 'Kepala Sekolah (isKepalaSekolah: true)', user: { role: 'guru', isKepalaSekolah: true } },
    { desc: 'Kepala Sekolah (is_kepala_sekolah: true)', user: { role: 'guru', is_kepala_sekolah: true } },
    { desc: 'Plt Kepala Sekolah', user: { role: 'plt_kepala_sekolah' } },
    { desc: 'Plh Kepala Sekolah', user: { role: 'plh_kepala_sekolah' } }
  ];

  for (const targetRoute of ['view-jurnal-bk', 'view-bk-jurnal']) {
    for (const [idx, item] of authorizedUsers.entries()) {
      const res = evaluateTabRBAC(targetRoute, '', item.user as any);

      challenge(
        res.allowed === true,
        `ALLOW-${targetRoute}-${idx}`,
        `PERMITTED access to '${targetRoute}' for ${item.desc}`,
        `res: ${JSON.stringify(res)}`
      );
    }
  }

  // --------------------------------------------------------------------------
  // SECTION 4: Role BK Attempting to Access Unpermitted Routes
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}SECTION 4: RBAC Challenge: Role BK Accessing Forbidden Views${RESET}`);

  const forbiddenViewsForBk = [
    // Classroom KBM journals
    { view: 'view-guru-jurnal', tab: '' },
    { view: 'view-guru-jurnal', tab: 'input' },
    { view: 'view-guru-jurnal', tab: 'supervisi-kelas' },
    { view: 'view-guru-jurnal', tab: 'rekap-pribadi' },
    { view: 'view-guru-rekap-jurnal', tab: '' },
    { view: 'view-jurnal-kelas', tab: '' },
    { view: 'view-jurnal-kegiatan', tab: '' },
    // Teaching tools & documents
    { view: 'view-dokumen', tab: '' },
    // Assessment & Gradebook
    { view: 'view-gradebook', tab: '' },
    { view: 'view-gradebook', tab: 'gradebook' },
    { view: 'view-gradebook', tab: 'rapor' },
    { view: 'view-rapor', tab: '' },
    { view: 'view-asesmen', tab: '' },
    // Student Attendance by Wali Kelas
    { view: 'view-rekap-siswa', tab: '' },
    // Piket Module
    { view: 'view-piket', tab: '' },
    // Student Exam Module
    { view: 'view-ujian', tab: '' },
    // Admin Master Data
    { view: 'view-admin-data', tab: '' },
    { view: 'view-admin-data', tab: 'Pengguna' },
    { view: 'view-admin-data', tab: 'Data_Kelas' },
    { view: 'view-admin-data', tab: 'Data_Siswa' },
    { view: 'view-admin-data', tab: 'Data_Guru' },
    { view: 'view-admin-data', tab: 'blok' },
    { view: 'view-pengguna', tab: '' },
    { view: 'view-admin-pengguna', tab: '' },
    { view: 'view-admin-users', tab: '' },
    { view: 'view-admin-kelas', tab: '' },
    { view: 'view-kelas', tab: '' },
    { view: 'view-data-siswa', tab: '' },
    { view: 'view-siswa', tab: '' },
    { view: 'view-data-guru', tab: '' },
    { view: 'view-guru', tab: '' },
    { view: 'view-sistem-blok', tab: '' },
    // Admin System Config & Backup
    { view: 'view-admin-config', tab: '' },
    { view: 'view-admin-config', tab: 'backup' },
    { view: 'view-admin-backup', tab: '' },
    // Admin Verification Center
    { view: 'view-admin-verif', tab: '' },
    // Admin & Executive Analytics
    { view: 'view-admin-rekap', tab: '' },
    { view: 'view-admin-rekap', tab: 'analitik' },
    { view: 'view-admin-rekap', tab: 'tabel' },
    { view: 'view-analitik', tab: '' },
    { view: 'view-rekap-guru', tab: '' },
    // Superadmin views
    { view: 'view-superadmin-overview', tab: '' },
    { view: 'view-superadmin-jaringan', tab: '' },
    { view: 'view-superadmin-dinas', tab: '' },
    // Dinas views
    { view: 'view-dinas-overview', tab: '' },
    // Arbitrary unpermitted views
    { view: 'view-secret-admin', tab: '' },
    { view: 'view-super-secret', tab: '' }
  ];

  const bkUser = { role: 'bk' };

  for (const [idx, item] of forbiddenViewsForBk.entries()) {
    const res = evaluateTabRBAC(item.view, item.tab, bkUser);

    challenge(
      res.allowed === false,
      `BK-BLOCK-${item.view}-${item.tab || 'root'}`,
      `Role BK strictly BLOCKED from forbidden view '${item.view}' (tab: '${item.tab || 'none'}')`,
      `res: ${JSON.stringify(res)}`
    );

    challenge(
      res.fallbackTab === 'view-home',
      `BK-FALLBACK-${item.view}-${item.tab || 'root'}`,
      `Fallback for blocked BK view is 'view-home'`
    );

    challenge(
      res.reason === 'Role Guru BK tidak memiliki izin akses ke modul ini.',
      `BK-REASON-${item.view}-${item.tab || 'root'}`,
      `Appropriate permission denial reason returned for BK: "${res.reason}"`
    );
  }

  // Verify Permitted views for BK
  const permittedViewsForBk = [
    { view: 'view-home', tab: '' },
    { view: 'view-guru-presensi', tab: '' },
    { view: 'view-guru-presensi', tab: 'riwayat' },
    { view: 'view-history', tab: '' }, // alias to view-guru-presensi
    { view: 'view-jurnal-bk', tab: '' },
    { view: 'view-bk-jurnal', tab: '' }, // alias to view-jurnal-bk
    { view: 'view-informasi', tab: '' },
    { view: 'view-pengaturan-akun', tab: '' }
  ];

  for (const item of permittedViewsForBk) {
    const res = evaluateTabRBAC(item.view, item.tab, bkUser);

    challenge(
      res.allowed === true,
      `BK-ALLOW-${item.view}-${item.tab || 'root'}`,
      `Role BK strictly PERMITTED to access permitted view '${item.view}' (tab: '${item.tab || 'none'}')`,
      `res: ${JSON.stringify(res)}`
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 5: AST Preservation Comments Invariant Verification
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}SECTION 5: AST Preservation Comment Invariant Verification${RESET}`);

  const appScreenContent = fs.readFileSync(path.join(process.cwd(), 'src/components/AppScreen.tsx'), 'utf-8');
  challenge(
    appScreenContent.includes('{/* AST preservation: data-tour={item.id} */}'),
    'AST-APPSCREEN',
    "AppScreen.tsx preserves exact comment verbatim: {/* AST preservation: data-tour={item.id} */}"
  );

  const claySidebarContent = fs.readFileSync(path.join(process.cwd(), 'src/components/ClaySidebar.tsx'), 'utf-8');
  challenge(
    claySidebarContent.includes('{/* AST preservation: data-tour={item.id} */}'),
    'AST-CLAYSIDEBAR',
    "ClaySidebar.tsx preserves exact comment verbatim: {/* AST preservation: data-tour={item.id} */}"
  );

  // --------------------------------------------------------------------------
  // SECTION 6: Route Aliases and Tour Aliases Registry Invariants
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}SECTION 6: Route Aliases and Tour Aliases Registry Invariants${RESET}`);

  challenge(
    VIEW_ALIASES['view-jurnal-bk']?.view === 'view-jurnal-bk',
    'ALIAS-VIEW-JURNAL-BK',
    "VIEW_ALIASES['view-jurnal-bk'] maps to 'view-jurnal-bk'"
  );

  challenge(
    VIEW_ALIASES['view-bk-jurnal']?.view === 'view-jurnal-bk',
    'ALIAS-VIEW-BK-JURNAL',
    "VIEW_ALIASES['view-bk-jurnal'] maps to canonical 'view-jurnal-bk'"
  );

  challenge(
    SIDEBAR_TOUR_ALIASES['view-jurnal-bk']?.includes('view-bk-jurnal'),
    'TOUR-ALIAS-BK',
    "SIDEBAR_TOUR_ALIASES['view-jurnal-bk'] includes 'view-bk-jurnal'"
  );

  // Route resolution check
  const res1 = resolveCanonicalRoute('view-bk-jurnal');
  challenge(
    res1.canonicalView === 'view-jurnal-bk' && res1.isLegacyAlias === true,
    'RESOLVE-BK-ALIAS',
    "resolveCanonicalRoute('view-bk-jurnal') returns canonicalView 'view-jurnal-bk' with isLegacyAlias true"
  );

  const res2 = resolveCanonicalRoute('view-jurnal-bk');
  challenge(
    res2.canonicalView === 'view-jurnal-bk' && res2.isLegacyAlias === true,
    'RESOLVE-BK-CANONICAL',
    "resolveCanonicalRoute('view-jurnal-bk') returns canonicalView 'view-jurnal-bk'"
  );

  // --------------------------------------------------------------------------
  // SECTION 7: Summary & Verdict
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}📊 ADVERSARIAL CHALLENGE EXECUTION SUMMARY:${RESET}`);
  console.log(`   Total Assertions  : ${totalAssertions}`);
  console.log(`   Passed Assertions : ${GREEN}${passedAssertions}${RESET}`);
  console.log(`   Failed Assertions : ${failedAssertions > 0 ? RED : GREEN}${failedAssertions}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedAssertions > 0) {
    console.error(`${RED}${BOLD}FAILED ASSERTIONS DETAILS:${RESET}`);
    for (const fail of failureDetails) {
      console.error(`  - ${fail}`);
    }
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}🏆 ALL ${totalAssertions} ADVERSARIAL STRESS CHALLENGES PASSED EMPIRICALLY!${RESET}\n`);
    process.exit(0);
  }
}

runAdversarialChallenges().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
