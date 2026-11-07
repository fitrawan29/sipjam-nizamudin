/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE: MILESTONE 2 (TU NAV, RBAC, AST, POSTGREST)
 * File: tests/adversarial_tu_nav_m2_challenger.test.ts
 *
 * Authored by: challenger_tu_nav_1 (EMPIRICAL CHALLENGER - critic, specialist)
 *
 * AGGRESSIVELY CHALLENGES:
 * 1. Comprehensive View RBAC Matrix for role `tata_usaha` in src/lib/navigation.ts:
 *    - Strict menu isolation: exactly 6 items in getConsolidatedMenuItems.
 *    - All allowed views (view-guru-presensi, view-guru-jurnal, view-gradebook, view-rapor, view-informasi, view-home, view-pengaturan-akun)
 *    - Exhaustive sweep of all unpermitted views (admin-data, dokumen, admin-config, admin-backup,
 *      sistem-blok, admin-verif, admin-rekap, piket, ujian, superadmin-*, dinas-*, arbitrary/tampered routes)
 *    - Subtab RBAC enforcement (supervisi-kelas blocked, rapor allowed under view-gradebook, master data tabs blocked)
 *    - Role string casing and whitespace normalization permutations.
 * 2. AST Invariant Verification:
 *    - Verbatim comment AST preservation: data-tour={item.id} in src/components/AppScreen.tsx
 *    - Verbatim comment AST preservation: data-tour={item.id} in src/components/ClaySidebar.tsx
 *    - Structural context: presence of data-tour button attribute.
 * 3. Network / PostgREST Mutation Guard Security in src/lib/supabaseClient.ts:
 *    - Mutating methods (POST, PUT, PATCH, DELETE) across all 4 assessment tables:
 *      (capaian_pembelajaran, tujuan_pembelajaran, asesmen_kolom, nilai_siswa)
 *    - Strict verification of HTTP 403 status and PostgREST error code '42501'
 *    - Read operations (GET, HEAD, OPTIONS) permitted (return null)
 *    - URL edge cases: trailing slashes, query parameters, uppercase paths, public schema prefixes, full vs relative URLs
 *    - Boundary and collision testing (non-matching prefix/suffix).
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  evaluateTabRBAC,
  VIEW_ALIASES,
  MenuItem
} from '../src/lib/navigation';
import {
  checkMasterDataMutationGuard,
  isAssessmentEndpoint,
  ASSESSMENT_TABLES,
  isAdminRole
} from '../src/lib/supabaseClient';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failureDetails: string[] = [];

function check(condition: boolean, code: string, message: string, extra?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ${GREEN}✔ [${code}] PASS:${RESET} ${message}`);
    if (extra) console.log(`    ${GRAY}↳ ${extra}${RESET}`);
  } else {
    failedChecks++;
    const errMsg = `✖ [${code}] FAIL: ${message}${extra ? ` (Detail: ${extra})` : ''}`;
    failureDetails.push(errMsg);
    console.error(`  ${RED}${errMsg}${RESET}`);
  }
}

async function runAdversarialM2ChallengeHarness() {
  console.log(`\n${BOLD}${CYAN}================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🔥 EMPIRICAL ADVERSARIAL CHALLENGE — MILESTONE 2 TU NAV, RBAC, AST, POSTGREST${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================================${RESET}\n`);

  const projectRoot = path.resolve(__dirname, '..');

  // ============================================================================
  // SUITE 1: Navigation Menu Isolation & Role String Permutations
  // ============================================================================
  console.log(`${BOLD}--- Suite 1: Menu Isolation & Role Permutations for Tata Usaha ---${RESET}`);

  const tuRolePermutations = [
    'tata_usaha',
    'tatausaha',
    'Tata Usaha',
    'TATA_USAHA',
    'tata-usaha',
    'TATA-USAHA',
    'tata usaha',
    'TATA USAHA',
    '  tata_usaha  ',
    '\ttata-usaha\n',
    'TaTa_UsAhA',
    'tata___usaha',
    'tata--usaha',
    'tata  usaha'
  ];

  const expectedTuMenuIds = [
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-gradebook',
    'view-rapor',
    'view-informasi',
    'view-pengaturan-akun'
  ];

  tuRolePermutations.forEach((perm, idx) => {
    const items = getConsolidatedMenuItems({ role: perm });
    const itemIds = items.map(i => i.id);
    const hasExact6 = items.length === 6;
    const matchesExpected = expectedTuMenuIds.every(id => itemIds.includes(id));
    const leakedItems = itemIds.filter(id => !expectedTuMenuIds.includes(id));

    check(
      hasExact6 && matchesExpected && leakedItems.length === 0,
      `S1.1.${idx + 1}`,
      `Role permutation "${perm.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}" receives strictly the 6 allowed menu items`,
      `Items: [${itemIds.join(', ')}], Leaked: ${leakedItems.length}`
    );
  });

  // Verify label and icon integrity for the 6 items
  const tuSampleMenu = getConsolidatedMenuItems({ role: 'tata_usaha' });
  const expectedLabelsAndIcons: Record<string, { label: string; icon: string }> = {
    'view-guru-presensi': { label: 'Presensi TU', icon: 'fa-clock' },
    'view-guru-jurnal': { label: 'Jurnal Kegiatan', icon: 'fa-book-open' },
    'view-gradebook': { label: 'Asesmen', icon: 'fa-graduation-cap' },
    'view-rapor': { label: 'Rapor', icon: 'fa-file-lines' },
    'view-informasi': { label: 'Informasi Sekolah', icon: 'fa-bullhorn' },
    'view-pengaturan-akun': { label: 'Pengaturan Akun', icon: 'fa-user-gear' }
  };

  tuSampleMenu.forEach(item => {
    const spec = expectedLabelsAndIcons[item.id];
    check(
      spec !== undefined && item.label === spec.label && item.icon === spec.icon,
      `S1.2.${item.id}`,
      `Menu item '${item.id}' has correct label "${item.label}" and icon "${item.icon}"`
    );
  });

  // ============================================================================
  // SUITE 2: Stress-Test evaluateTabRBAC across All View IDs
  // ============================================================================
  console.log(`\n${BOLD}--- Suite 2: Exhaustive View RBAC Matrix for Role Tata Usaha ---${RESET}`);

  const tuUser = { role: 'tata_usaha' };

  // 2.1: Allowed Views for Tata Usaha
  const allowedViews = [
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-gradebook',
    'view-rapor',
    'view-informasi',
    'view-home',
    'view-pengaturan-akun'
  ];

  allowedViews.forEach((viewId, idx) => {
    const res = evaluateTabRBAC(viewId, '', tuUser);
    check(
      res.allowed === true,
      `S2.1.${idx + 1}`,
      `evaluateTabRBAC permits allowed view '${viewId}' for Tata Usaha`,
      `allowed: ${res.allowed}`
    );
  });

  // Allowed aliases for Tata Usaha
  const allowedAliases = [
    { alias: 'view-presensi-tu', mapsTo: 'view-guru-presensi' },
    { alias: 'view-jurnal-kegiatan', mapsTo: 'view-guru-jurnal' },
    { alias: 'view-asesmen', mapsTo: 'view-gradebook' },
    { alias: 'view-history', mapsTo: 'view-guru-presensi' }
  ];

  allowedAliases.forEach(({ alias, mapsTo }, idx) => {
    const res = evaluateTabRBAC(alias, '', tuUser);
    check(
      res.allowed === true,
      `S2.2.${idx + 1}`,
      `evaluateTabRBAC permits alias '${alias}' (canonical: '${mapsTo}') for Tata Usaha`,
      `allowed: ${res.allowed}`
    );
  });

  // 2.2: Unpermitted Views (MUST be strictly blocked with allowed: false)
  const unpermittedViews = [
    { view: 'view-admin-data', label: 'Master Data & Kalender' },
    { view: 'view-dokumen', label: 'Bank Dokumen / Persuratan' },
    { view: 'view-admin-config', label: 'Pengaturan Sistem' },
    { view: 'view-admin-backup', label: 'Cadangan Database' },
    { view: 'view-sistem-blok', label: 'Sistem Blok' },
    { view: 'view-admin-verif', label: 'Pusat Verifikasi & Supervisi' },
    { view: 'view-admin-rekap', label: 'Laporan & Analitik' },
    { view: 'view-rekap-guru', label: 'Rekap Presensi Guru' },
    { view: 'view-analitik', label: 'Analitik Kinerja' },
    { view: 'view-piket', label: 'Modul Piket' },
    { view: 'view-ujian', label: 'Ujian Siswa' },
    { view: 'view-rekap-siswa', label: 'Presensi Siswa / Kesiswaan' },
    { view: 'view-superadmin-overview', label: 'Superadmin Overview' },
    { view: 'view-superadmin-jaringan', label: 'Superadmin Jaringan Sekolah' },
    { view: 'view-superadmin-dinas', label: 'Superadmin Akun Dinas' },
    { view: 'view-dinas-overview', label: 'Dashboard Dinas Wilayah' },
    { view: 'view-admin-pengguna', label: 'Master Pengguna' },
    { view: 'view-pengguna', label: 'Pengguna' },
    { view: 'view-admin-users', label: 'Users' },
    { view: 'view-admin-kelas', label: 'Master Kelas' },
    { view: 'view-kelas', label: 'Kelas' },
    { view: 'view-data-siswa', label: 'Master Data Siswa' },
    { view: 'view-siswa', label: 'Siswa' },
    { view: 'view-data-guru', label: 'Master Data Guru' },
    { view: 'view-guru', label: 'Guru' }
  ];

  unpermittedViews.forEach(({ view, label }, idx) => {
    const res = evaluateTabRBAC(view, '', tuUser);
    check(
      res.allowed === false,
      `S2.3.${idx + 1}`,
      `evaluateTabRBAC strictly DENIES unpermitted view '${view}' (${label}) for Tata Usaha`,
      `allowed: ${res.allowed}, fallbackTab: ${res.fallbackTab || 'none'}, reason: ${res.reason || 'none'}`
    );
  });

  // 2.3: Adversarial / Malformed / Injection View IDs
  const maliciousViews = [
    'view-superadmin-hacked',
    'view-dinas-wilayah-secret',
    'view-admin-secret-dump',
    '../../../etc/passwd',
    'view-admin-data/Data_Siswa',
    'view-admin-data?tab=Pengguna',
    '<script>alert(1)</script>',
    "view-admin' OR '1'='1",
    'view-nonexistent',
    'view-null',
    '__proto__'
  ];

  maliciousViews.forEach((badView, idx) => {
    const res = evaluateTabRBAC(badView, '', tuUser);
    check(
      res.allowed === false,
      `S2.4.${idx + 1}`,
      `evaluateTabRBAC strictly blocks malicious/unknown view '${badView.slice(0, 30)}' for Tata Usaha`,
      `allowed: ${res.allowed}`
    );
  });

  // 2.4: Subtab Granular RBAC Checks
  // A. view-guru-jurnal subtabs
  const jurnalInputRes = evaluateTabRBAC('view-guru-jurnal', 'input', tuUser);
  const jurnalRekapRes = evaluateTabRBAC('view-guru-jurnal', 'rekap-pribadi', tuUser);
  const jurnalSupervisiRes = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', tuUser);

  check(
    jurnalInputRes.allowed === true,
    'S2.5.1',
    "evaluateTabRBAC allows 'input' subtab under view-guru-jurnal for Tata Usaha",
    `allowed: ${jurnalInputRes.allowed}`
  );
  check(
    jurnalRekapRes.allowed === true,
    'S2.5.2',
    "evaluateTabRBAC allows 'rekap-pribadi' subtab under view-guru-jurnal for Tata Usaha",
    `allowed: ${jurnalRekapRes.allowed}`
  );
  check(
    jurnalSupervisiRes.allowed === false,
    'S2.5.3',
    "evaluateTabRBAC strictly blocks 'supervisi-kelas' subtab under view-guru-jurnal for Tata Usaha",
    `allowed: ${jurnalSupervisiRes.allowed}, fallback: ${jurnalSupervisiRes.fallbackTab}`
  );

  // B. view-gradebook subtabs
  const gradebookTabRes = evaluateTabRBAC('view-gradebook', 'gradebook', tuUser);
  const raporTabRes = evaluateTabRBAC('view-gradebook', 'rapor', tuUser);
  check(
    gradebookTabRes.allowed === true,
    'S2.6.1',
    "evaluateTabRBAC allows 'gradebook' subtab under view-gradebook for Tata Usaha",
    `allowed: ${gradebookTabRes.allowed}`
  );
  check(
    raporTabRes.allowed === true,
    'S2.6.2',
    "evaluateTabRBAC allows 'rapor' subtab under view-gradebook for Tata Usaha",
    `allowed: ${raporTabRes.allowed}`
  );

  // C. All master data subtabs under view-admin-data MUST be blocked for TU
  const masterDataSubtabs = [
    'Data_Siswa',
    'Data_Guru',
    'Data_Kelas',
    'Data_Mapel',
    'Jadwal_Pelajaran',
    'Wali_Kelas',
    'Pengguna',
    'Kalender_Pendidikan',
    'blok'
  ];

  masterDataSubtabs.forEach((tab, idx) => {
    const res = evaluateTabRBAC('view-admin-data', tab, tuUser);
    check(
      res.allowed === false,
      `S2.7.${idx + 1}`,
      `evaluateTabRBAC blocks view-admin-data subtab '${tab}' for Tata Usaha`,
      `allowed: ${res.allowed}`
    );
  });

  // ============================================================================
  // SUITE 3: AST Invariant Preservation Verification
  // ============================================================================
  console.log(`\n${BOLD}--- Suite 3: AST Invariant Preservation Verification ---${RESET}`);

  const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
  const claySidebarPath = path.join(projectRoot, 'src', 'components', 'ClaySidebar.tsx');

  const astTargetComment = '{/* AST preservation: data-tour={item.id} */}';

  // 3.1: AppScreen.tsx AST Invariant
  check(fs.existsSync(appScreenPath), 'S3.1.1', 'src/components/AppScreen.tsx exists');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
  const appScreenHasComment = appScreenContent.includes(astTargetComment);
  check(
    appScreenHasComment,
    'S3.1.2',
    `src/components/AppScreen.tsx contains verbatim AST comment: "${astTargetComment}"`,
    `Found verbatim: ${appScreenHasComment}`
  );

  // Check structural proximity: data-tour attribute right after comment
  const appScreenIdx = appScreenContent.indexOf(astTargetComment);
  const appScreenSnippet = appScreenIdx !== -1 ? appScreenContent.substring(appScreenIdx, appScreenIdx + 300) : '';
  const appScreenHasDataTourAttr = appScreenSnippet.includes('data-tour=');
  check(
    appScreenHasDataTourAttr,
    'S3.1.3',
    'AppScreen.tsx AST comment is immediately adjacent to button element with data-tour attribute',
    `Snippet preview: ${appScreenSnippet.replace(/\s+/g, ' ').slice(0, 80)}...`
  );

  // 3.2: ClaySidebar.tsx AST Invariant
  check(fs.existsSync(claySidebarPath), 'S3.2.1', 'src/components/ClaySidebar.tsx exists');
  const claySidebarContent = fs.readFileSync(claySidebarPath, 'utf8');
  const claySidebarHasComment = claySidebarContent.includes(astTargetComment);
  check(
    claySidebarHasComment,
    'S3.2.2',
    `src/components/ClaySidebar.tsx contains verbatim AST comment: "${astTargetComment}"`,
    `Found verbatim: ${claySidebarHasComment}`
  );

  const claySidebarIdx = claySidebarContent.indexOf(astTargetComment);
  const claySidebarSnippet = claySidebarIdx !== -1 ? claySidebarContent.substring(claySidebarIdx, claySidebarIdx + 300) : '';
  const claySidebarHasDataTourAttr = claySidebarSnippet.includes('data-tour=');
  check(
    claySidebarHasDataTourAttr,
    'S3.2.3',
    'ClaySidebar.tsx AST comment is immediately adjacent to button element with data-tour attribute',
    `Snippet preview: ${claySidebarSnippet.replace(/\s+/g, ' ').slice(0, 80)}...`
  );

  // ============================================================================
  // SUITE 4: PostgREST Mutation Guard Security & Edge Cases
  // ============================================================================
  console.log(`\n${BOLD}--- Suite 4: PostgREST Mutation Guard Security & Assessment Tables ---${RESET}`);

  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const readMethods = ['GET', 'HEAD', 'OPTIONS'];
  const assessmentTables = ['capaian_pembelajaran', 'tujuan_pembelajaran', 'asesmen_kolom', 'nilai_siswa'];

  check(
    ASSESSMENT_TABLES.length === 4 && assessmentTables.every(t => (ASSESSMENT_TABLES as readonly string[]).includes(t)),
    'S4.1.1',
    'ASSESSMENT_TABLES in supabaseClient.ts exports exactly the 4 required assessment tables',
    `Tables: ${ASSESSMENT_TABLES.join(', ')}`
  );

  // 4.1: Mutating methods strictly return HTTP 403 Forbidden with code 42501 for role 'tatausaha' / 'tata_usaha'
  for (const table of assessmentTables) {
    for (const method of mutatingMethods) {
      const url = `https://mock.supabase.co/rest/v1/${table}?id=eq.123`;
      const guardRes = checkMasterDataMutationGuard(url, method, 'tata_usaha');

      check(
        guardRes !== null && guardRes.status === 403,
        `S4.2.${table}.${method}`,
        `checkMasterDataMutationGuard rejects ${method} on '${table}' with HTTP 403 Forbidden for 'tata_usaha'`,
        `Status: ${guardRes?.status}`
      );

      if (guardRes) {
        // Read body clone and parse JSON
        const clone = guardRes.clone();
        const bodyText = await clone.text();
        let parsed: any = {};
        try {
          parsed = JSON.parse(bodyText);
        } catch (_) {}

        check(
          parsed.code === '42501' && parsed.status === 403,
          `S4.2.${table}.${method}.code`,
          `Response payload contains code '42501' and status 403`,
          `Code: ${parsed.code}, Status: ${parsed.status}, Message: ${parsed.message?.slice(0, 40)}...`
        );
      }
    }
  }

  // 4.2: Read methods (GET, HEAD, OPTIONS) MUST be permitted (return null)
  for (const table of assessmentTables) {
    for (const method of readMethods) {
      const url = `https://mock.supabase.co/rest/v1/${table}?select=*`;
      const guardRes = checkMasterDataMutationGuard(url, method, 'tata_usaha');
      check(
        guardRes === null,
        `S4.3.${table}.${method}`,
        `checkMasterDataMutationGuard permits read method ${method} on '${table}' for 'tata_usaha' (returns null)`,
        `Result: ${guardRes === null ? 'Allowed (null)' : 'Blocked'}`
      );
    }
  }

  // 4.3: URL Edge Cases Stress Testing
  console.log(`\n${BOLD}--- Suite 4.4: URL Edge Cases & Parsing Attacks ---${RESET}`);

  const edgeCaseUrls = [
    // Trailing slashes
    { url: '/rest/v1/nilai_siswa/', desc: 'Trailing slash relative path' },
    { url: 'https://mock.supabase.co/rest/v1/capaian_pembelajaran/', desc: 'Trailing slash full URL' },
    { url: '/rest/v1/tujuan_pembelajaran///', desc: 'Multiple trailing slashes' },

    // Query parameters
    { url: '/rest/v1/asesmen_kolom?select=*&kelas=eq.7A&order=id.asc', desc: 'Complex query string parameters' },
    { url: 'https://mock.supabase.co/rest/v1/nilai_siswa?id=eq.1#section', desc: 'URL fragment / hash with query' },

    // Uppercase and mixed case paths
    { url: '/rest/v1/NILAI_SISWA', desc: 'Uppercase table name' },
    { url: '/rest/v1/Capaian_Pembelajaran', desc: 'Mixed-case table name' },
    { url: '/REST/V1/TUJUAN_PEMBELAJARAN', desc: 'Uppercase REST path and table' },
    { url: 'https://mock.supabase.co/REST/V1/ASESMEN_KOLOM', desc: 'Full URL uppercase' },

    // Public schema prefix
    { url: '/rest/v1/public.nilai_siswa', desc: 'Public schema prefix' },
    { url: 'https://mock.supabase.co/rest/v1/public.capaian_pembelajaran?id=eq.1', desc: 'Public schema with full URL and query' },

    // Encoded characters
    { url: '/rest/v1/%6e%69%6c%61%69%5f%73%69%73%77%61', desc: 'URL percent-encoded table name (nilai_siswa)' }
  ];

  edgeCaseUrls.forEach(({ url, desc }, idx) => {
    const isDetected = isAssessmentEndpoint(url);
    const guardRes = checkMasterDataMutationGuard(url, 'POST', 'tata_usaha');

    check(
      isDetected === true,
      `S4.4.1.${idx + 1}`,
      `isAssessmentEndpoint detects edge case "${desc}": ${url}`,
      `Detected: ${isDetected}`
    );

    check(
      guardRes !== null && guardRes.status === 403,
      `S4.4.2.${idx + 1}`,
      `checkMasterDataMutationGuard blocks POST for edge case "${desc}"`,
      `Status: ${guardRes?.status}`
    );
  });

  // 4.4: Collision & Boundary Attacks (Ensure non-matching endpoints are NOT falsely classified)
  console.log(`\n${BOLD}--- Suite 4.5: Collision & False-Positive Boundary Stress ---${RESET}`);

  const boundaryUrls = [
    '/rest/v1/nilai_siswa_archive',
    '/rest/v1/capaian_pembelajaran_v2',
    '/rest/v1/tujuan_pembelajaran_history',
    '/rest/v1/asesmen_kolom_backup',
    '/rest/v1/my_nilai_siswa',
    '/rest/v1/nilai',
    '/rest/v1/siswa_nilai'
  ];

  boundaryUrls.forEach((url, idx) => {
    const isFalsePositive = isAssessmentEndpoint(url);
    check(
      isFalsePositive === false,
      `S4.5.${idx + 1}`,
      `Boundary URL '${url}' does NOT trigger false positive in isAssessmentEndpoint`,
      `isAssessmentEndpoint: ${isFalsePositive}`
    );
  });

  // 4.5: Role Isolation on Assessment Mutations (Admin vs Guru vs TU)
  const adminPostRes = checkMasterDataMutationGuard('/rest/v1/nilai_siswa', 'POST', 'admin');
  const guruPostRes = checkMasterDataMutationGuard('/rest/v1/nilai_siswa', 'POST', 'guru');
  const tuPostRes = checkMasterDataMutationGuard('/rest/v1/nilai_siswa', 'POST', 'tata_usaha');

  check(
    adminPostRes === null,
    'S4.6.1',
    "Role 'admin' is permitted to mutate assessment tables (guard returns null)",
    `Result: ${adminPostRes === null ? 'Allowed' : 'Blocked'}`
  );
  check(
    guruPostRes === null,
    'S4.6.2',
    "Role 'guru' is permitted to mutate assessment tables (guard returns null)",
    `Result: ${guruPostRes === null ? 'Allowed' : 'Blocked'}`
  );
  check(
    tuPostRes !== null && tuPostRes.status === 403,
    'S4.6.3',
    "Role 'tata_usaha' is STRICTLY blocked from mutating assessment tables (guard returns 403)",
    `Result: ${tuPostRes?.status}`
  );

  // ============================================================================
  // FINAL ADVERSARIAL VERDICT
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📊 ADVERSARIAL CHALLENGE SUMMARY${RESET}`);
  console.log(`${BOLD}TOTAL CHECKS  :${RESET} ${totalChecks}`);
  console.log(`${BOLD}${GREEN}PASSED CHECKS :${RESET} ${passedChecks}`);
  console.log(`${BOLD}${failedChecks > 0 ? RED : GREEN}FAILED CHECKS :${RESET} ${failedChecks}`);
  console.log(`${BOLD}${CYAN}================================================================================${RESET}\n`);

  if (failedChecks > 0) {
    console.error(`${BOLD}${RED}🚨 ADVERSARIAL CHALLENGE IDENTIFIED VULNERABILITIES / FAILURES:${RESET}`);
    failureDetails.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log(`${BOLD}${GREEN}🎉 ALL ${totalChecks} ADVERSARIAL STRESS CHECKS PASSED WITH ZERO FAILURES!${RESET}`);
    console.log(`${BOLD}${GREEN}VERDICT: APPROVE${RESET}\n`);
    process.exit(0);
  }
}

void runAdversarialM2ChallengeHarness();
