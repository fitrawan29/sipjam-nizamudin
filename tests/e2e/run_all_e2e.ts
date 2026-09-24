/**
 * Master E2E Test Suite Runner for SIPJAM Application Enhancements
 * Executes Tiers 1-4 covering all 15 project features.
 */

import { runTier1Tests } from './tier1_feature_coverage.test';
import { runTier2Tests } from './tier2_boundary_corner.test';
import { runTier3Tests } from './tier3_cross_feature.test';
import { runTier4Tests } from './tier4_real_world_scenarios.test';
import { BOLD, CYAN, GREEN, RED, RESET, YELLOW } from './helpers/testHarness';

async function main() {
  const startTime = Date.now();

  console.log(`\n${CYAN}${BOLD}==============================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}       SIPJAM APPLICATION ENHANCEMENTS — 4-TIER E2E TEST SUITE RUNNER         ${RESET}`);
  console.log(`${CYAN}${BOLD}==============================================================================${RESET}\n`);
  console.log(`Target: 15 Features across Tiers 1 to 4`);
  console.log(`Working Directory: ${process.cwd()}\n`);

  const results: { tier: string; passed: boolean }[] = [];

  // Tier 1
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}RUNNING TIER 1: FEATURE COVERAGE (HAPPY PATH >= 5 TEST CASES PER FEATURE)${RESET}`);
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  const t1Passed = await runTier1Tests();
  results.push({ tier: 'Tier 1: Feature Coverage (F1-F15 Happy Path)', passed: t1Passed });

  // Tier 2
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}RUNNING TIER 2: BOUNDARY & CORNER CASES (LIMITS, ERRORS, REGRESSIONS)${RESET}`);
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  const t2Passed = await runTier2Tests();
  results.push({ tier: 'Tier 2: Boundary & Corner Cases (F1-F15 Edge Cases)', passed: t2Passed });

  // Tier 3
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}RUNNING TIER 3: CROSS-FEATURE INTERACTIONS (PAIRWISE WORKFLOWS)${RESET}`);
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  const t3Passed = await runTier3Tests();
  results.push({ tier: 'Tier 3: Cross-Feature Interactions', passed: t3Passed });

  // Tier 4
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}RUNNING TIER 4: REAL-WORLD SCENARIOS (END-TO-END MULTI-ACTOR WORKFLOWS)${RESET}`);
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  const t4Passed = await runTier4Tests();
  results.push({ tier: 'Tier 4: Real-World Scenarios', passed: t4Passed });

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  const allPassed = results.every(r => r.passed);

  console.log(`\n${CYAN}${BOLD}==============================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                       FINAL E2E EXECUTION REPORT                             ${RESET}`);
  console.log(`${CYAN}${BOLD}==============================================================================${RESET}\n`);

  results.forEach(r => {
    const status = r.passed ? `${GREEN}PASSED${RESET}` : `${RED}FAILED${RESET}`;
    console.log(`  • ${r.tier.padEnd(55, '.')} [ ${status} ]`);
  });

  console.log(`\nExecution Time: ${totalDuration}s`);
  console.log(`Suite Status: ${allPassed ? `${GREEN}${BOLD}ALL TIERS PASSED (100%)${RESET}` : `${RED}${BOLD}SOME TIERS FAILED${RESET}`}`);
  console.log(`${CYAN}${BOLD}==============================================================================${RESET}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error(`${RED}Fatal error running E2E suite:${RESET}`, err);
  process.exit(1);
});
