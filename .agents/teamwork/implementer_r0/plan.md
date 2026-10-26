# Implementer Plan: Dead Code, Orphaned Utilities, and Dependency Pruning (swe_35)

## Objective
Clean up dead code, unreferenced / orphaned utilities (such as unreferenced `src/utils/textUtils.ts`, unused exports, obsolete helpers), and unused/obsolete dependencies in `package.json` following Ponytail minimalism (YAGNI, smallest diff, zero regression).

## Phase 1: Baseline Verification
- Run `npm test` to verify current test suite passes 100%.
- Run `npx tsc --noEmit` to verify TypeScript clean state.
- Run `npm run lint` to check existing lint warnings/errors.

## Phase 2: Dead Code & Orphaned Utility Audit
- Investigate `src/utils/textUtils.ts` and check all references in codebase.
- Audit `src/utils/`, `src/lib/`, `src/components/`, `src/hooks/` for unreferenced files or dead exports.
- Audit imports across `src/` for unused imports.
- Safely remove confirmed dead files and unused exports.

## Phase 3: Dependency Pruning Audit
- Inspect `package.json` dependencies and devDependencies.
- Cross-reference each package with imports and build/test configurations.
- Identify unused packages (e.g. leftover libraries, redundant packages).
- Remove unused dependencies carefully.
- Run `npm install` or test without them to ensure no runtime/build/test breakage.

## Phase 4: Full Verification & Zero Regression Check
- `npx tsc --noEmit` -> Must exit 0.
- `npm run lint` -> Must pass.
- `npm test` -> 100% passing.
- `npm run build` -> Verify Next.js production build succeeds.

## Phase 5: Documentation & Git Workflow
- Update `progress.md`.
- Generate comprehensive `handoff.md`.
- Stage changes, commit, and push.
