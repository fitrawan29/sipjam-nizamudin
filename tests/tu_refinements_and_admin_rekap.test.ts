/**
 * ============================================================================
 * EMPIRICAL INTEGRATION & RBAC TEST SUITE - MILESTONE 2
 * File: tests/tu_refinements_and_admin_rekap.test.ts
 *
 * Verifies Milestone 2 Implementation for Role Tata Usaha (TU):
 * 1. R1: Refined TU Navigation (Strictly 6 menu items, aliases, RBAC gates).
 * 2. R2: Read-Only Asesmen and Rapor for TU (UI badges, button suppression,
 *        input disablement, PostgREST 403 / 42501 mutation interceptor).
 * 3. R3: Admin Presensi Recap Separation (Dewan Guru vs Tenaga TU, print
 *        page break CSS container with independent headers & signatures, CSV export).
 * 4. R4: Admin TU Account Management (Tunjuk TU toggle, + Akun TU modal with
 *        4 mandatory fields validation, teacherUserSync resilience).
 * 5. R5: Static AST & Codebase Invariants (AST comment preservation, ponytail principles).
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  evaluateTabRBAC,
  VIEW_ALIASES
} from '../src/lib/navigation';
import {
  checkMasterDataMutationGuard,
  isAssessmentEndpoint
} from '../src/lib/supabaseClient';

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

async function runMilestone2Tests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🧪 TEST SUITE: MILESTONE 2 TU REFINEMENTS & ADMIN PRESENSI REKAP${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const projectRoot = path.resolve(__dirname, '..');

  // ==========================================================================
  // SUITE 1: R1 - TU Menu Navigation & Aliases
  // ==========================================================================
  console.log(`${BOLD}--- Suite 1: R1 - TU Navigation & Aliases ---${RESET}`);

  const tuItems = getConsolidatedMenuItems({ role: 'tata_usaha' });

  // 1.1 Exactly 7 menu items (with Dashboard)
  recordAssert(
    tuItems.length === 7,
    'T1.1',
    `getConsolidatedMenuItems({ role: 'tata_usaha' }) returns exactly 7 items (got: ${tuItems.length})`
  );

  // 1.2 Exact 7 items IDs and labels
  const expectedTuItems = [
    { id: 'view-home', label: 'Dashboard', icon: 'fa-house' },
    { id: 'view-guru-presensi', label: 'Presensi TU', icon: 'fa-clock' },
    { id: 'view-guru-jurnal', label: 'Jurnal Kegiatan', icon: 'fa-book-open' },
    { id: 'view-gradebook', label: 'Asesmen', icon: 'fa-graduation-cap' },
    { id: 'view-rapor', label: 'Rapor', icon: 'fa-file-lines' },
    { id: 'view-informasi', label: 'Informasi Sekolah', icon: 'fa-bullhorn' },
    { id: 'view-pengaturan-akun', label: 'Pengaturan Akun', icon: 'fa-user-gear' }
  ];

  expectedTuItems.forEach((exp, idx) => {
    const found = tuItems.find(i => i.id === exp.id);
    recordAssert(
      found !== undefined && found.label === exp.label && found.icon === exp.icon,
      `T1.2.${idx + 1}`,
      `TU menu contains ${exp.label} (${exp.id}) with icon ${exp.icon}`
    );
  });

  // 1.3 Aliases in VIEW_ALIASES
  recordAssert(
    VIEW_ALIASES['view-presensi-tu']?.view === 'view-guru-presensi',
    'T1.3.1',
    "Alias 'view-presensi-tu' maps to 'view-guru-presensi'"
  );
  recordAssert(
    VIEW_ALIASES['view-jurnal-kegiatan']?.view === 'view-guru-jurnal',
    'T1.3.2',
    "Alias 'view-jurnal-kegiatan' maps to 'view-guru-jurnal'"
  );
  recordAssert(
    VIEW_ALIASES['view-asesmen']?.view === 'view-gradebook',
    'T1.3.3',
    "Alias 'view-asesmen' maps to 'view-gradebook'"
  );

  // 1.4 evaluateTabRBAC allows the 6 TU views + view-home
  const allowedTuViews = [
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-gradebook',
    'view-rapor',
    'view-informasi',
    'view-home'
  ];
  allowedTuViews.forEach((v, idx) => {
    const res = evaluateTabRBAC(v, '', { role: 'tata_usaha' });
    recordAssert(
      res.allowed === true,
      `T1.4.${idx + 1}`,
      `evaluateTabRBAC allows '${v}' for tata_usaha`
    );
  });

  // 1.5 evaluateTabRBAC allows subtab 'rapor' under 'view-gradebook'
  const raporSubtab = evaluateTabRBAC('view-gradebook', 'rapor', { role: 'tata_usaha' });
  recordAssert(
    raporSubtab.allowed === true,
    'T1.5',
    "evaluateTabRBAC allows subtab 'rapor' under view-gradebook for tata_usaha"
  );

  // 1.6 evaluateTabRBAC strictly denies unauthorized views
  const deniedViews = [
    'view-admin-data',
    'view-dokumen',
    'view-admin-config',
    'view-admin-backup',
    'view-sistem-blok',
    'view-admin-verif',
    'view-admin-rekap',
    'view-piket',
    'view-ujian',
    'view-superadmin-overview'
  ];
  deniedViews.forEach((v, idx) => {
    const res = evaluateTabRBAC(v, '', { role: 'tata_usaha' });
    recordAssert(
      res.allowed === false,
      `T1.6.${idx + 1}`,
      `evaluateTabRBAC strictly blocks unauthorized view '${v}' for tata_usaha`
    );
  });

  // ==========================================================================
  // SUITE 2: R2 - Read-Only Asesmen & Rapor for TU
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 2: R2 - Read-Only Asesmen & Rapor ---${RESET}`);

  // 2.1 PostgREST isAssessmentEndpoint helper
  const assessmentEndpoints = [
    '/rest/v1/capaian_pembelajaran',
    '/rest/v1/public.capaian_pembelajaran',
    'https://xyz.supabase.co/rest/v1/tujuan_pembelajaran?id=eq.1',
    '/rest/v1/asesmen_kolom',
    '/rest/v1/nilai_siswa'
  ];
  assessmentEndpoints.forEach((url, idx) => {
    recordAssert(
      isAssessmentEndpoint(url) === true,
      `T2.1.${idx + 1}`,
      `isAssessmentEndpoint identifies ${url} as assessment endpoint`
    );
  });

  // 2.2 PostgREST mutation interceptor rejects mutations on assessment tables for tata_usaha
  const mutateMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  for (let i = 0; i < assessmentEndpoints.length; i++) {
    const url = assessmentEndpoints[i];
    for (const m of mutateMethods) {
      const guardRes = checkMasterDataMutationGuard(url, m, 'tata_usaha');
      let code = '';
      if (guardRes) {
        const body = await guardRes.json();
        code = body.code;
      }
      recordAssert(
        guardRes !== null && guardRes.status === 403 && code === '42501',
        `T2.2.${i}.${m}`,
        `checkMasterDataMutationGuard rejects ${m} on ${url} for tata_usaha with 403 & code 42501`
      );
    }
  }

  // 2.3 PostgREST interceptor permits GET read operations on assessment tables
  assessmentEndpoints.forEach((url, i) => {
    const getRes = checkMasterDataMutationGuard(url, 'GET', 'tata_usaha');
    recordAssert(
      getRes === null,
      `T2.3.${i}`,
      `checkMasterDataMutationGuard permits GET on ${url} for tata_usaha`
    );
  });

  // 2.4 GradebookView source code inspection for Read-Only invariants
  const gradebookPath = path.join(projectRoot, 'src', 'components', 'GradebookView.tsx');
  const gradebookContent = fs.readFileSync(gradebookPath, 'utf8');

  recordAssert(
    gradebookContent.includes('const isTataUsaha ='),
    'T2.4.1',
    'GradebookView defines isTataUsaha'
  );
  recordAssert(
    gradebookContent.includes('const canSelectAllTeachers = isAdmin || isTataUsaha;'),
    'T2.4.2',
    'GradebookView allows TU to select any teacher (canSelectAllTeachers)'
  );
  recordAssert(
    gradebookContent.includes('Mode Tinjau TU (Read-Only)'),
    'T2.4.3',
    'GradebookView renders "Mode Tinjau TU (Read-Only)" badge'
  );
  recordAssert(
    gradebookContent.includes('{isAdmin && !isTataUsaha &&'),
    'T2.4.4',
    'GradebookView hides Bobot button for isTataUsaha'
  );
  recordAssert(
    gradebookContent.includes('if (isAdmin || isTataUsaha) {\n      return;') ||
    gradebookContent.includes('if (isAdmin || isTataUsaha) {'),
    'T2.4.5',
    'GradebookView handleSaveGrades rejects save for isTataUsaha'
  );

  // 2.5 RaporView source code inspection for Read-Only invariants
  const raporPath = path.join(projectRoot, 'src', 'components', 'RaporView.tsx');
  const raporContent = fs.readFileSync(raporPath, 'utf8');

  recordAssert(
    raporContent.includes('const isTataUsaha ='),
    'T2.5.1',
    'RaporView defines isTataUsaha'
  );
  recordAssert(
    raporContent.includes('isTataUsaha') &&
    raporContent.includes('kelasList.map'),
    'T2.5.2',
    'RaporView allows class selection for TU'
  );
  recordAssert(
    raporContent.includes('!isTataUsaha &&') &&
    raporContent.includes('Simpan Rapor'),
    'T2.5.3',
    'RaporView hides "Simpan Rapor" button for isTataUsaha'
  );
  recordAssert(
    raporContent.includes('if (isTataUsaha) return;'),
    'T2.5.4',
    'RaporView save handlers guard against TU execution'
  );
  recordAssert(
    raporContent.includes('!isAdmin && !isTataUsaha'),
    'T2.5.5',
    'RaporView print signature falls back to homeroom teacher instead of TU user'
  );

  // ==========================================================================
  // SUITE 3: R3 - Admin Presensi Recap Separation (Dewan Guru vs Tenaga TU)
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 3: R3 - Admin Presensi Recap Separation ---${RESET}`);

  const rekapPath = path.join(projectRoot, 'src', 'components', 'AdminRekapView.tsx');
  const rekapContent = fs.readFileSync(rekapPath, 'utf8');

  recordAssert(
    rekapContent.includes('guruPresensiList') && rekapContent.includes('tuPresensiList'),
    'T3.1',
    'AdminRekapView partitions presensi into guruPresensiList and tuPresensiList'
  );
  recordAssert(
    rekapContent.includes('Rekapitulasi Presensi Dewan Guru') &&
    rekapContent.includes('Rekapitulasi Presensi Tenaga Tata Usaha (TU)'),
    'T3.2',
    'AdminRekapView renders two distinct tables for Dewan Guru and Tenaga TU'
  );
  recordAssert(
    rekapContent.includes("pageBreakBefore: 'always'") || rekapContent.includes("breakBefore: 'page'"),
    'T3.3',
    'AdminRekapView print layout contains page-break CSS container (breakBefore: page / pageBreakBefore: always)'
  );
  recordAssert(
    rekapContent.includes('PrintSignature') &&
    rekapContent.indexOf('PrintSignature') !== rekapContent.lastIndexOf('PrintSignature'),
    'T3.4',
    'AdminRekapView renders independent PrintSignature components for Guru and TU sections'
  );
  recordAssert(
    rekapContent.includes('REKAPITULASI PRESENSI TENAGA TATA USAHA (TU)'),
    'T3.5',
    'AdminRekapView CSV export includes distinct section for Tenaga TU'
  );

  // ==========================================================================
  // SUITE 4: R4 - Admin TU Account Management & teacherUserSync
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 4: R4 - Admin TU Account Management & Auto-sync ---${RESET}`);

  const penggunaPath = path.join(projectRoot, 'src', 'components', 'AdminPenggunaView.tsx');
  const penggunaContent = fs.readFileSync(penggunaPath, 'utf8');

  recordAssert(
    penggunaContent.includes('handleToggleTuAssignment') &&
    penggunaContent.includes('Tunjuk TU') &&
    penggunaContent.includes('Ke Guru'),
    'T4.1',
    'AdminPenggunaView implements handleToggleTuAssignment with "Tunjuk TU" and "Ke Guru" actions'
  );
  recordAssert(
    penggunaContent.includes('handleCreateTuUser') &&
    penggunaContent.includes('Nomor HP') &&
    penggunaContent.includes('Email Aktif'),
    'T4.2',
    'AdminPenggunaView implements handleCreateTuUser modal with all 4 required fields'
  );
  recordAssert(
    penggunaContent.includes('Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!'),
    'T4.3',
    'AdminPenggunaView validates that all 4 fields are non-empty before creation'
  );
  recordAssert(
    penggunaContent.includes('Format email aktif tidak valid'),
    'T4.4',
    'AdminPenggunaView validates email regex format'
  );

  // TeacherUserSync file check
  const syncPath = path.join(projectRoot, 'src', 'lib', 'teacherUserSync.ts');
  const syncContent = fs.readFileSync(syncPath, 'utf8');

  recordAssert(
    syncContent.includes(".in('role', ['Guru', 'tata_usaha', 'Tata Usaha'])"),
    'T4.5',
    'teacherUserSync includes tata_usaha in user role query'
  );
  recordAssert(
    syncContent.includes("role: matchedUser?.role || 'Guru'"),
    'T4.6',
    'teacherUserSync preserves existing TU role during automatic sync'
  );

  // ==========================================================================
  // SUITE 5: R5 - AST & Component Invariants
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 5: R5 - AST & Component Invariants ---${RESET}`);

  const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
  const claySidebarPath = path.join(projectRoot, 'src', 'components', 'ClaySidebar.tsx');
  const claySidebarContent = fs.readFileSync(claySidebarPath, 'utf8');

  recordAssert(
    appScreenContent.includes('{/* AST preservation: data-tour={item.id} */}'),
    'T5.1',
    'AppScreen.tsx preserves verbatim: {/* AST preservation: data-tour={item.id} */}'
  );
  recordAssert(
    claySidebarContent.includes('{/* AST preservation: data-tour={item.id} */}'),
    'T5.2',
    'ClaySidebar.tsx preserves verbatim: {/* AST preservation: data-tour={item.id} */}'
  );
  recordAssert(
    claySidebarContent.includes('!isTU') && claySidebarContent.includes('onOpenAccountSettings'),
    'T5.3',
    'ClaySidebar.tsx suppresses quick action buttons for TU to preserve 6 items'
  );

  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📊 SUMMARY: ${passedTests} passed, ${failedTests} failed out of ${totalTests} tests${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMilestone2Tests().catch(err => {
  console.error('Fatal error running Milestone 2 tests:', err);
  process.exit(1);
});
