# Reviewer Round 3 Plan (swe_35)

## 1. Independent Requirements Analysis
- **R1: Dead Code & Orphaned Utilities Removal**
  - Check `src/utils/textUtils.ts` and all files in `src/utils`, `src/lib`, `src/components`, `scripts/` to confirm whether unreferenced files or functions exist.
  - Check for dead exports, unused functions, dead components, and unused imports.
  - Eliminate dead code cleanly without leaving broken imports or dangling references.
- **R2: Dependency & Configuration Pruning**
  - Audit `package.json` dependencies and devDependencies using depcheck/ripgrep.
  - Determine if any dependencies are obsolete, unused, or bloated while preserving test runners (vitest, @testing-library, etc.) and build tooling.
  - Verify `package.json` and lockfile consistency.
- **R3: Zero Regression & Integrity Verification**
  - Run `npx tsc --noEmit` -> Must be exit code 0.
  - Run `npm run lint` -> Zero errors, check warnings.
  - Run `npm test` -> 100% pass rate across all suites.
  - Run production build `npm run build` -> Must succeed without SSR/build errors.
  - Verify core flows (Presensi, Jurnal, Piket, Rapor, Superadmin, Dinas).

## 2. Adversarial Evaluation Strategy
- Step 2.1: Run verification commands (`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`) against current codebase.
- Step 2.2: Scrutinize the prior attempt (Round 2 commit `502b124` and Round 1 commits `6b93004`, `659a2af`). Check for:
  - Did they miss any dead files (e.g., check `src/utils/textUtils.ts` mentioned specifically in the task prompt)?
  - Check if any packages in `package.json` can be pruned or if any unused packages remain.
  - Check if any test suite was tampered with, skipped (`test.skip`, `xit`, `it.skip`), or weakened.
  - Check whether `HomeViewGuru.tsx` or other modified views lost any functional edge cases or props.
  - Check if any broken references or runtime issues exist.
- Step 2.3: Fix any defects discovered.
- Step 2.4: Re-verify full test suite, tsc, lint, build.
- Step 2.5: Commit and push in accordance with mandatory rules.
