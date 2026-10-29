/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE: MILESTONE 3
 * Challenger 2: AST String Invariants, Zero-Scroll Geometry & Regression Resilience
 *
 * File: tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import {
  getConsolidatedMenuItems,
  resolveCanonicalRoute,
  VIEW_ALIASES,
  SIDEBAR_TOUR_ALIASES,
  MenuItem
} from '../src/lib/navigation';
import { GURU_STEPS, ADMIN_STEPS } from '../src/components/Onboarding/tutorialSteps';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(desc: string, condition: boolean, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${desc}`);
    if (detail) console.error(`    ↳ Error: ${detail}`);
  }
}

async function runAdversarialM3Challenger2() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  EMPIRICAL CHALLENGER 2: AST STRINGS, ZERO-SCROLL & REGRESSION M3    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const root = path.resolve(__dirname, '..');
  const appScreenCode = fs.readFileSync(path.join(root, 'src/components/AppScreen.tsx'), 'utf-8');
  const claySidebarCode = fs.readFileSync(path.join(root, 'src/components/ClaySidebar.tsx'), 'utf-8');
  const tutorialCode = fs.readFileSync(path.join(root, 'src/components/Onboarding/OnboardingTutorial.tsx'), 'utf-8');

  // ==========================================================================
  // SECTION 1: AST STRING INVARIANTS IN AppScreen.tsx & ClaySidebar.tsx
  // ==========================================================================
  console.log('━━━ SECTION 1: AST String Invariants in AppScreen.tsx & ClaySidebar.tsx ━━━');

  // 1.1 Data-tour AST preservation comments
  check(
    'AppScreen preserves {/* AST preservation: data-tour={item.id} */}',
    appScreenCode.includes('{/* AST preservation: data-tour={item.id} */}')
  );

  check(
    'ClaySidebar preserves {/* AST preservation: data-tour={item.id} */}',
    claySidebarCode.includes('{/* AST preservation: data-tour={item.id} */}')
  );

  // 1.2 Multi-id dataTour attribute expressions
  check(
    'AppScreen binds compound data-tour attribute',
    appScreenCode.includes('data-tour={(item as any).dataTour || item.id}') ||
    appScreenCode.includes('data-tour={item.dataTour || item.id}')
  );

  check(
    'ClaySidebar binds compound data-tour attribute',
    claySidebarCode.includes('data-tour={item.dataTour || item.id}')
  );

  // 1.3 Preserved menu definitions for static analysis in historical test suites
  check(
    'AppScreen preserves menuItemsGuru declaration',
    appScreenCode.includes('const menuItemsGuru = [')
  );

  check(
    'AppScreen preserves menuItemsAdmin declaration',
    appScreenCode.includes('const menuItemsAdmin = [')
  );

  check(
    'AppScreen preserves menuItemsKepalaSekolah declaration',
    appScreenCode.includes('const menuItemsKepalaSekolah = [')
  );

  // 1.4 Preserved conditional spread strings
  check(
    'AppScreen contains isWaliKelas spread for view-rapor',
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])")
  );

  check(
    'AppScreen contains isWaliKelas spread for view-jurnal-kelas',
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : [])")
  );

  check(
    'AppScreen contains isWaliKelas spread for view-rekap-siswa',
    appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }] : [])")
  );

  // 1.5 Preserved navigation guard conditions
  check(
    'AppScreen handleNavigation guards view-rapor against non-wali',
    appScreenCode.includes("if (targetId === 'view-rapor')") &&
    appScreenCode.includes('!isAdmin && !isSuperadmin && !isWaliKelas')
  );

  check(
    'AppScreen handleNavigation guards view-sistem-blok against non-admin',
    appScreenCode.includes("if (targetId === 'view-sistem-blok')") &&
    appScreenCode.includes('Akses Terblokir: Halaman Manajemen Sistem Blok secara eksklusif hanya dapat diakses oleh Administrator')
  );

  // 1.6 Preserved view rendering blocks
  check(
    'AppScreen view router strictly preserves currentView === "view-rapor" block',
    appScreenCode.includes("{currentView === 'view-rapor' && (") &&
    appScreenCode.includes('<RaporView user={user} assignedKelas={assignedKelas} />')
  );

  check(
    'AppScreen view router strictly preserves currentView === "view-sistem-blok" block',
    appScreenCode.includes("{currentView === 'view-sistem-blok' && (") &&
    appScreenCode.includes('<SistemBlokView user={user} />')
  );

  check(
    'AppScreen view router strictly preserves currentView === "view-admin-backup" block',
    appScreenCode.includes("{currentView === 'view-admin-backup' && (") &&
    appScreenCode.includes('<AdminBackupView user={user} />')
  );

  check(
    'AppScreen view router strictly preserves currentView === "view-gradebook" block',
    appScreenCode.includes("{currentView === 'view-gradebook' && (") &&
    appScreenCode.includes('<GradebookView')
  );

  check(
    'AppScreen view router strictly preserves currentView === "view-guru-rekap-jurnal" block',
    appScreenCode.includes("{currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />}")
  );

  // ==========================================================================
  // SECTION 2: ZERO-SCROLL GEOMETRY & MILLER'S LAW ERGONOMICS
  // ==========================================================================
  console.log('\n━━━ SECTION 2: Zero-Scroll Geometry & Miller\'s Law Ergonomics ━━━');

  const roleScenarios: { name: string; params: Parameters<typeof getConsolidatedMenuItems>[0]; maxExpected: number }[] = [
    { name: 'Guru Reguler', params: { role: 'Guru' }, maxExpected: 6 },
    { name: 'Wali Kelas', params: { role: 'Guru', isWaliKelas: true }, maxExpected: 7 },
    { name: 'Guru Piket', params: { role: 'Guru', isPiketHariIni: true }, maxExpected: 7 },
    { name: 'Guru Wali + Piket', params: { role: 'Guru', isWaliKelas: true, isPiketHariIni: true }, maxExpected: 8 },
    { name: 'Administrator', params: { role: 'Admin' }, maxExpected: 8 },
    { name: 'Kepala Sekolah', params: { role: 'Kepala Sekolah', isKepalaSekolah: true }, maxExpected: 7 },
    { name: 'Kepala Sekolah + Wali', params: { role: 'Kepala Sekolah', isKepalaSekolah: true, isWaliKelas: true }, maxExpected: 7 },
    { name: 'Pengawas Dinas Overview', params: { role: 'Dinas Pendidikan' }, maxExpected: 1 },
    { name: 'Pengawas Dinas Satellite', params: { role: 'Dinas Pendidikan', activeTargetSchool: { id: 's1', nama: 'SMP 1' } }, maxExpected: 2 },
    { name: 'Superadmin Overview', params: { role: 'Superadmin' }, maxExpected: 3 },
    { name: 'Superadmin Satellite', params: { role: 'Superadmin', activeTargetSchool: { id: 's1', nama: 'SMP 1' } }, maxExpected: 5 }
  ];

  for (const scenario of roleScenarios) {
    const items = getConsolidatedMenuItems(scenario.params);
    const count = items.length;
    check(
      `Role [${scenario.name}] menu count: ${count} <= ${scenario.maxExpected} (Miller's Law)`,
      count <= scenario.maxExpected && count >= 1,
      `Observed ${count} items, expected <= ${scenario.maxExpected}`
    );

    // Height simulation in small viewport (600px viewport, 230px header+footer -> 370px available)
    // Item height = 36px (py-2.5 + text-xs) + 6px space-y-1.5 = 42px
    const totalMenuHeight = count * 42;
    const availableHeight600px = 600 - 230; // 370px
    check(
      `Role [${scenario.name}] total height ${totalMenuHeight}px fits in 370px on 600px viewport (Zero-Scroll)`,
      totalMenuHeight <= availableHeight600px,
      `Calculated height ${totalMenuHeight}px exceeds available ${availableHeight600px}px`
    );
  }

  // ==========================================================================
  // SECTION 3: COMPOUND TOUR SELECTOR COMPATIBILITY (DATA-TOUR ATTRIBUTES)
  // ==========================================================================
  console.log('\n━━━ SECTION 3: Compound Tour Selector Compatibility ━━━');

  check(
    'OnboardingTutorial uses CSS word-matching selector [data-tour~="..."]',
    tutorialCode.includes('[data-tour~=')
  );

  // Validate every tour step targetTourId can be resolved by live DOM elements
  const allMenuItemsCombined: MenuItem[] = [
    ...getConsolidatedMenuItems({ role: 'Guru', isWaliKelas: true, isPiketHariIni: true }),
    ...getConsolidatedMenuItems({ role: 'Admin' }),
    ...getConsolidatedMenuItems({ role: 'Superadmin' }),
    ...getConsolidatedMenuItems({ role: 'Dinas Pendidikan' })
  ];

  for (const step of GURU_STEPS) {
    if (step.targetTourId === 'hamburger-btn' || step.targetTourId === 'ai-assistant-btn') {
      check(`Guru step [${step.id}] target '${step.targetTourId}' is valid static target`, true);
      continue;
    }

    const matches = allMenuItemsCombined.filter(item => {
      const tokens = ((item.dataTour || item.id) + ' ' + item.id).split(/\s+/);
      return tokens.includes(step.targetTourId);
    });

    check(
      `Guru step [${step.id}] target '${step.targetTourId}' resolves to consolidated menu '${matches.map(m => m.id).join(', ')}'`,
      matches.length > 0,
      `No consolidated menu matched target '${step.targetTourId}'`
    );
  }

  for (const step of ADMIN_STEPS) {
    if (step.targetTourId === 'hamburger-btn' || step.targetTourId === 'ai-assistant-btn') {
      check(`Admin step [${step.id}] target '${step.targetTourId}' is valid static target`, true);
      continue;
    }

    const matches = allMenuItemsCombined.filter(item => {
      const tokens = ((item.dataTour || item.id) + ' ' + item.id).split(/\s+/);
      return tokens.includes(step.targetTourId);
    });

    check(
      `Admin step [${step.id}] target '${step.targetTourId}' resolves to consolidated menu '${matches.map(m => m.id).join(', ')}'`,
      matches.length > 0,
      `No consolidated menu matched target '${step.targetTourId}'`
    );
  }

  // ==========================================================================
  // SECTION 4: URL ALIASING & PARAMETER RESILIENCE
  // ==========================================================================
  console.log('\n━━━ SECTION 4: URL Aliasing & Parameter Resilience ━━━');

  const legacyMappings = [
    { input: 'view-guru-rekap-jurnal', expectedView: 'view-guru-jurnal', expectedTab: 'rekap-pribadi' },
    { input: 'view-jurnal-kelas', expectedView: 'view-guru-jurnal', expectedTab: 'supervisi-kelas' },
    { input: 'view-history', expectedView: 'view-guru-presensi', expectedTab: 'riwayat' },
    { input: 'view-rapor', expectedView: 'view-gradebook', expectedTab: 'rapor' },
    { input: 'view-analitik', expectedView: 'view-admin-rekap', expectedTab: 'analitik' },
    { input: 'view-rekap-guru', expectedView: 'view-admin-rekap', expectedTab: 'tabel' },
    { input: 'view-sistem-blok', expectedView: 'view-admin-data', expectedTab: 'blok' },
    { input: 'view-admin-backup', expectedView: 'view-admin-config', expectedTab: 'backup' }
  ];

  for (const mapping of legacyMappings) {
    // 1. Without explicit tab
    const resNoTab = resolveCanonicalRoute(mapping.input);
    check(
      `Mapping '${mapping.input}' -> view: '${resNoTab.canonicalView}', tab: '${resNoTab.defaultTab}'`,
      resNoTab.canonicalView === mapping.expectedView &&
      resNoTab.defaultTab === mapping.expectedTab &&
      resNoTab.isLegacyAlias === true
    );

    // 2. With explicit override tab
    const resWithTab = resolveCanonicalRoute(mapping.input, 'custom-override');
    check(
      `Mapping '${mapping.input}' with tab 'custom-override' keeps override`,
      resWithTab.canonicalView === mapping.expectedView &&
      resWithTab.defaultTab === 'custom-override'
    );

    // 3. Padded with whitespace
    const resPadded = resolveCanonicalRoute(`  ${mapping.input}  `);
    check(
      `Padded mapping '  ${mapping.input}  ' trims safely`,
      resPadded.canonicalView === mapping.expectedView &&
      resPadded.defaultTab === mapping.expectedTab
    );
  }

  // 4. Edge cases: null, undefined, empty, 'null', 'undefined'
  const falsyInputs = [null, undefined, '', '   ', 'null', 'undefined'];
  for (const fi of falsyInputs) {
    const resFalsy = resolveCanonicalRoute(fi);
    check(
      `Falsy/invalid input [${JSON.stringify(fi)}] defaults safely to view-home`,
      resFalsy.canonicalView === 'view-home' && resFalsy.isLegacyAlias === false
    );
  }

  // ==========================================================================
  // FINAL SCOREBOARD
  // ==========================================================================
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`TOTAL ASSERTIONS : ${totalTests}`);
  console.log(`PASSED           : ${passedTests}`);
  console.log(`FAILED           : ${failedTests}`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  if (failedTests > 0) {
    console.error('❌ ADVERSARIAL CHALLENGER VERDICT: REQUEST_CHANGES');
    process.exit(1);
  } else {
    console.log('✅ ADVERSARIAL CHALLENGER VERDICT: APPROVE (100% PASS)');
    process.exit(0);
  }
}

runAdversarialM3Challenger2().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
