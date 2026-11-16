/**
 * Automated Verification Suite: Kepala Sekolah Asesmen & Rapor Navigation & RBAC
 * Tests Requirements R1 & R2 from the task specification:
 * - Menu "Asesmen" and "Rapor" visible for Kepala Sekolah
 * - Access permission and routing without blockage or unauthorized redirect
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  evaluateTabRBAC
} from '../src/lib/navigation';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(desc: string, condition: boolean, detail?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ${GREEN}✔ [PASS]${RESET} ${desc}`);
  } else {
    failedChecks++;
    console.error(`  ${RED}✖ [FAIL]${RESET} ${desc}`);
    if (detail) console.error(`    ↳ Detail: ${detail}`);
  }
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🧪 TEST SUITE: KEPALA SEKOLAH ASESMEN & RAPOR VISIBILITY & ACCESS${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // --------------------------------------------------------------------------
  // Suite 1: Menu Visibility in getConsolidatedMenuItems (R1)
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 1: Menu Visibility in getConsolidatedMenuItems (R1) ---${RESET}`);

  // Test 1.1: role: 'kepalasekolah' with isKepalaSekolah: true
  const kepsekMenus1 = getConsolidatedMenuItems({ role: 'kepalasekolah', isKepalaSekolah: true });
  const hasAsesmen1 = kepsekMenus1.some(m => m.id === 'view-gradebook' && m.label === 'Asesmen');
  const hasRapor1 = kepsekMenus1.some(m => m.id === 'view-rapor' && m.label === 'Rapor');
  check('1.1: role "kepalasekolah" includes menu "Asesmen" (view-gradebook)', hasAsesmen1);
  check('1.2: role "kepalasekolah" includes menu "Rapor" (view-rapor)', hasRapor1);

  // Test 1.3: Teacher account assigned as Kepala Sekolah (role: 'guru', isKepalaSekolah: true)
  const kepsekMenus2 = getConsolidatedMenuItems({ role: 'guru', isKepalaSekolah: true });
  const hasAsesmen2 = kepsekMenus2.some(m => m.id === 'view-gradebook' && m.label === 'Asesmen');
  const hasRapor2 = kepsekMenus2.some(m => m.id === 'view-rapor' && m.label === 'Rapor');
  check('1.3: Teacher assigned as Kepala Sekolah (isKepalaSekolah: true) includes menu "Asesmen"', hasAsesmen2);
  check('1.4: Teacher assigned as Kepala Sekolah (isKepalaSekolah: true) includes menu "Rapor"', hasRapor2);

  // Test 1.5: Role variations (Plt and Plh Kepala Sekolah)
  const pltMenus = getConsolidatedMenuItems({ role: 'pltkepalasekolah' });
  const plhMenus = getConsolidatedMenuItems({ role: 'plhkepalasekolah' });
  check('1.5: Plt Kepala Sekolah includes Asesmen and Rapor', pltMenus.some(m => m.id === 'view-gradebook') && pltMenus.some(m => m.id === 'view-rapor'));
  check('1.6: Plh Kepala Sekolah includes Asesmen and Rapor', plhMenus.some(m => m.id === 'view-gradebook') && plhMenus.some(m => m.id === 'view-rapor'));

  // --------------------------------------------------------------------------
  // Suite 2: Route & Sub-Tab RBAC Permissions (R2)
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 2: Route & Sub-Tab RBAC Permissions (R2) ---${RESET}`);

  // Test 2.1: Kepala Sekolah access to view-gradebook subtab gradebook
  const rbacGb = evaluateTabRBAC('view-gradebook', 'gradebook', { role: 'guru', isKepalaSekolah: true });
  check('2.1: evaluateTabRBAC allows view-gradebook (tab gradebook) for Kepala Sekolah', rbacGb.allowed);

  // Test 2.2: Kepala Sekolah access to view-gradebook subtab rapor
  const rbacRaporTab = evaluateTabRBAC('view-gradebook', 'rapor', { role: 'guru', isKepalaSekolah: true });
  check('2.2: evaluateTabRBAC allows view-gradebook (tab rapor) for Kepala Sekolah', rbacRaporTab.allowed);

  // Test 2.3: Kepala Sekolah access to legacy alias view-rapor
  const rbacRaporView = evaluateTabRBAC('view-rapor', '', { role: 'guru', isKepalaSekolah: true });
  check('2.3: evaluateTabRBAC allows view-rapor route for Kepala Sekolah', rbacRaporView.allowed);

  // Test 2.4: Kepala Sekolah access to legacy alias view-asesmen
  const rbacAsesmenView = evaluateTabRBAC('view-asesmen', '', { role: 'guru', isKepalaSekolah: true });
  check('2.4: evaluateTabRBAC allows view-asesmen route for Kepala Sekolah', rbacAsesmenView.allowed);

  // Test 2.5: User with is_kepala_sekolah: true snake_case flag
  const rbacSnakeCase = evaluateTabRBAC('view-gradebook', 'rapor', { role: 'guru', is_kepala_sekolah: true });
  check('2.5: evaluateTabRBAC supports is_kepala_sekolah: true property', rbacSnakeCase.allowed);

  // Test 2.6: Non-kepsek regular teacher without wali role is still blocked from rapor
  const rbacRegularTeacher = evaluateTabRBAC('view-gradebook', 'rapor', { role: 'guru', isWaliKelas: false, isKepalaSekolah: false });
  check('2.6: Non-wali, non-kepsek regular teacher is strictly blocked from rapor subtab', !rbacRegularTeacher.allowed);

  // --------------------------------------------------------------------------
  // Suite 3: Canonical Route Resolution Invariants
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 3: Canonical Route Resolution Invariants ---${RESET}`);

  const resAsesmen = resolveCanonicalRoute('view-asesmen');
  check('3.1: resolveCanonicalRoute("view-asesmen") resolves to canonicalView view-gradebook with tab gradebook',
    resAsesmen.canonicalView === 'view-gradebook' && resAsesmen.defaultTab === 'gradebook');

  const resRapor = resolveCanonicalRoute('view-rapor');
  check('3.2: resolveCanonicalRoute("view-rapor") resolves to canonicalView view-gradebook with tab rapor',
    resRapor.canonicalView === 'view-gradebook' && resRapor.defaultTab === 'rapor');

  // --------------------------------------------------------------------------
  // Suite 4: AST & Component Invariants
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}--- Suite 4: AST & Component Invariants ---${RESET}`);

  const appScreenCode = fs.readFileSync(path.join(process.cwd(), 'src/components/AppScreen.tsx'), 'utf-8');
  const gradebookCode = fs.readFileSync(path.join(process.cwd(), 'src/components/GradebookView.tsx'), 'utf-8');
  const raporCode = fs.readFileSync(path.join(process.cwd(), 'src/components/RaporView.tsx'), 'utf-8');

  // AppScreen router allows view-rapor for isKepalaSekolah
  check('4.1: AppScreen view router allows view-rapor for isKepalaSekolah',
    appScreenCode.includes('isAdmin || isSuperadmin || isWaliKelas || isKepalaSekolah'));

  // AppScreen passes isKepalaSekolah to RaporView
  check('4.2: AppScreen passes isKepalaSekolah prop to RaporView',
    appScreenCode.includes('isKepalaSekolah={isKepalaSekolah}'));

  // AppScreen passes isKepalaSekolah to evaluateTabRBAC
  check('4.3: AppScreen handleNavigation passes isKepalaSekolah to evaluateTabRBAC',
    appScreenCode.includes('is_kepala_sekolah: isKepalaSekolah'));

  // GradebookView canAccessRapor includes isKepalaSekolah
  check('4.4: GradebookView canAccessRapor permits isKepalaSekolah',
    gradebookCode.includes('canAccessRapor = isAdmin || isSuperadmin || isWaliKelas || isTataUsaha || isKepalaSekolah'));

  // GradebookView canAccessAllTeachers includes isKepalaSekolah
  check('4.5: GradebookView canAccessAllTeachers permits isKepalaSekolah',
    gradebookCode.includes('canAccessAllTeachers = canSelectAllTeachers || isKepalaSekolah'));

  // RaporView class selection permits isKepalaSekolah
  check('4.6: RaporView class selection dropdown permits isKepalaSekolah',
    raporCode.includes('isAdmin || isSuperadmin || isTataUsaha || isKepalaSekolah'));

  // RaporView role badge reflects Kepala Sekolah
  check('4.7: RaporView role badge formats Kepala Sekolah label',
    raporCode.includes('isKepalaSekolah ? formatKepalaSekolahLabel(effectiveStatus)'));

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}📊 TEST EXECUTION SUMMARY${RESET}`);
  console.log(`  Total Checks  : ${totalChecks}`);
  console.log(`  ${GREEN}Passed Checks : ${passedChecks}${RESET}`);
  console.log(`  ${failedChecks === 0 ? GREEN : RED}Failed Checks : ${failedChecks}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedChecks > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
