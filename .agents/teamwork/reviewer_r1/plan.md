# Reviewer Plan - SWE_35 (Round 1)

## Objectives
1. Verify prior attempt's claims and identify gaps / missed dead code / orphaned utilities / unused exports.
2. Conduct deep adversarial analysis on codebase for dead code, orphaned utilities, and unused imports.
3. Validate dependencies in `package.json` vs requirement R2.
4. Verify TypeScript compilation (`npx tsc --noEmit`), linting (`npm run lint`), test suite (`npm test`), and build (`npm run build`).
5. Ensure Ponytail minimalism: keep diff surgical, zero regressions, do not tamper with tests.
6. Record findings and compile handoff report.

## Audit Checklist
- [ ] Run test suite (`npm test`) -> confirm baseline.
- [ ] Run type checker (`npx tsc --noEmit`).
- [ ] Run linter (`npm run lint`).
- [ ] Audit `src/utils/` and `src/lib/` for orphaned files or unused functions.
- [ ] Check `src/types/` for dead types.
- [ ] Check `scripts/` or root directory for dead scripts/files.
- [ ] Check `package.json` for unused or obsolete dependencies/scripts.
- [ ] Re-run all tests after any cleanup.
