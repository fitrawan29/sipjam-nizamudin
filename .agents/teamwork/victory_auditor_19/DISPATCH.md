# Dispatch Instructions for Victory Auditor (victory_auditor_19)

## Mission
Conduct an independent post-victory audit for the task completed by `orchestrator_14`.

## Source Requirements
Read the authoritative user request at:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically timestamp 2026-10-04T13:50:06Z).

## Orchestrator Deliverables
- Main Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_14\report.md`
- Orchestrator Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_14\handoff.md`
- Reviewer Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1\report.md`

## Audit Scope & Verification Rubric
1. **Mermaid Flowchart Validity & Completeness**:
   - Verify that the Mermaid flowchart is syntactically valid and compiles/renders without errors.
   - Verify that it fully covers accessible routes, pages, and menu hierarchies (Superadmin, Admin, Guru, Piket, Wali Kelas, overlays).
2. **Feature Inventory Codebase Mapping**:
   - Verify that the feature inventory accurately maps all major features directly to actual existing files/directories in the codebase.
   - Check that no phantom/fictitious paths are cited.
3. **Actionable Improvement Suggestions**:
   - Verify that at least 3 distinct, concrete, actionable suggestions for improving UX, architecture, or missing capabilities are provided.
4. **Codebase Integrity & Independent Test Execution**:
   - Verify `npx tsc --noEmit` and run `npm test`.
   - Verify git status and commit push per GEMINI.md.

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_19`

## Expected Output
Write your findings to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_19\handoff.md`
Provide a clear structured verdict: **VICTORY CONFIRMED** or **VICTORY REJECTED**.
Send a message back to Sentinel with your verdict and audit summary.


## 2026-10-04T14:17:29Z
[Message] timestamp=2026-10-04T14:17:29Z sender=6bc99929-f23a-4b52-9f54-bc319ff05580 priority=MESSAGE_PRIORITY_HIGH
You are the independent Victory Auditor (victory_auditor_19) for sipjam-app.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_19
Read your dispatch instructions at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_19\DISPATCH.md
Read the authoritative user request at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (entry timestamp 2026-10-04T13:50:06Z).
Read the orchestrator report to audit at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_14\report.md
Read the orchestrator handoff at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_14\handoff.md

Conduct a rigorous independent 3-phase audit:
1. Timeline and cheating detection (ensure no mock shortcuts or phantom files).
2. Verify Mermaid flowchart syntax validity and completeness against actual codebase routing/views.
3. Verify feature inventory maps 100% to actual codebase files/directories on disk.
4. Verify >=3 distinct, concrete, actionable improvement proposals.
5. Independent verification (tsc --noEmit, npm test) and git status check.

Write handoff.md in your working directory with a structured verdict: VICTORY CONFIRMED or VICTORY REJECTED.
Send a message back to Sentinel with your verdict.
