## 2026-11-18T15:44:42Z
The victory audit has rejected the milestone due to an integrity violation: the test `tests/navigation_consolidation_verification.test.ts` contains "self-certifying tests" that redefine application logic internally rather than testing the actual `src/lib/navigation.ts` implementation.

Your task:
1. Refactor `tests/navigation_consolidation_verification.test.ts` to delete the internal definitions of `resolveCanonicalRoute`, `getConsolidatedMenuItems`, `evaluateTabRBAC`, and `SubTabStateManager`.
2. Import these functions directly from `../src/lib/navigation` (or using the `@/lib/navigation` alias if supported).
3. Update the test assertions to use the imported functions to test the *actual* application logic.
4. Run the test (`npx tsx tests/navigation_consolidation_verification.test.ts`) to ensure it still passes against the real code.
5. Provide a handoff report confirming the integrity of the tests and the passing test result.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. Integrity is non-negotiable. Tests must test the real code.
