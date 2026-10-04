# Dispatch Instructions for Reviewer (reviewer_r1)

## Objective
Audit and verify the comprehensive analysis report produced in `orchestrator_14/report.md`.

## Context & Inputs
- Authoritative user request: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read this first!)
- Report to audit: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_14\report.md`
- Actual codebase: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Audit Criteria
1. **Mermaid Flowchart Validity & Completeness**:
   - Is the Mermaid flowchart syntactically valid?
   - Does it comprehensively map all accessible routes, pages, and menu hierarchies across Superadmin, Admin, Guru, Piket, and Wali Kelas?
2. **Feature Inventory Accuracy**:
   - Does every inventoried feature map directly to existing codebase files, components, and tables?
   - Are file paths verified against the filesystem?
3. **Actionable Improvement Suggestions**:
   - Are there at least 3 distinct, concrete, actionable improvement proposals across UX, architecture, and codebase structure?
   - Are the implementation steps feasible, grounded in the codebase, and detailed?
4. **Codebase Verification**:
   - Run `npx tsc --noEmit` to verify type integrity.
   - Run existing test suites (`npm test`) to confirm tests pass.

## Deliverables & Output
Write your audit findings to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1\report.md`
and write your handoff in:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1\handoff.md`

Provide a clear verdict: **APPROVE** or **REQUEST_CHANGES**.
When finished, send a message to orchestrator (`962492f1-3042-46e5-9074-fc7b66436c10`).


## 2026-10-04T14:06:27Z
You are the Quality and Verification Reviewer (reviewer_r1).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1
Read your dispatch instructions at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1\DISPATCH.md
Read the authoritative user request first at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-04T13:50:06Z).
Read the comprehensive report to audit at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_14\report.md

Audit the report according to the 4 acceptance criteria:
1. Syntactically valid Mermaid flowchart covering the full application flow, routes, roles (Superadmin, Admin, Guru, Piket, Wali Kelas), and menu hierarchies.
2. Comprehensive Feature Inventory mapping directly to existing codebase directories/files.
3. At least 3 distinct, actionable improvement suggestions (UX, architecture, codebase structure).
4. Run verification commands (tsc --noEmit, npm test) and confirm codebase integrity.

Write your findings to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1\report.md
Write your handoff to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1\handoff.md
With a clear verdict: APPROVE or REQUEST_CHANGES.
When finished, send a message to orchestrator (962492f1-3042-46e5-9074-fc7b66436c10).
