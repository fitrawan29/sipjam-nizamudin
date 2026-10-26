# Adversarial Review Plan - Round 2 (swe_35)

## Objective
Thoroughly audit and verify the dead code, orphaned utilities, and dependency pruning in SIPJAM, rejecting unverified claims, probing edge cases, finding any remaining dead code or regressions, and fixing any defects found.

## Audit Strategy
1. **Verification of Existing Claims**:
   - Run full test suite (`npm test`).
   - Run TypeScript type checker (`npx tsc --noEmit`).
   - Run Linter (`npm run lint`).
   - Run Next.js production build (`npm run build`).
2. **Commit History and Diff Audit**:
   - Audit `git diff 6b93004..HEAD` and `git diff f5b4924..659a2af`.
   - Check if any test was tampered with or skipped.
   - Check if any deleted files broke any un-tested scripts or flows.
3. **Deep Dead Code & Orphan Audit**:
   - Check root and subdirectories (`scripts/`, `src/utils/`, `src/lib/`, `src/hooks/`, `src/components/`, etc.) for unreferenced files.
   - Check `package.json` dependencies and `tests/four_ponytail_improvements.test.ts` constraints.
   - Check whether `scripts/google-drive-webhook.gs` or other files have issues.
   - Scan for unused exports using ts-prune or static analysis.
4. **Fix Any Identified Issues**:
   - Apply surgical fixes.
5. **Re-verification & Handoff**:
   - Run all verification commands.
   - Commit & push per GEMINI.md rule.
   - Write handoff report and notify parent.
