## 2026-09-26T09:46:54Z

You are the Project Orchestrator (orchestrator_4).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_4
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

A new user request has been submitted:
"Investigate and fix a complex issue where admin and teacher (guru) accounts are unable to read their data following a recent update. This requires checking multiple parts of the application to resolve the issue.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

Requirements:
- R1. Root Cause Analysis: Identify the root cause of the issue preventing admin and teacher roles from retrieving or viewing their data (e.g., missing permissions, broken queries, or routing issues introduced in the recent update).
- R2. Implement Fix: Apply the necessary fixes across the application to restore data access for both admin and teacher accounts.
- R3. Regression Prevention: Ensure that the fix maintains data access security and does not break data retrieval for other existing roles (e.g., students/siswa).

Verification Resources:
No explicit test suite provided. The agent team must construct its own programmatic test or agent-as-judge verification based on the application's login and data retrieval flows.

Acceptance Criteria:
- An automated test or agent-judge verifies successful login as an Admin and subsequent successful data retrieval (e.g., dashboard data or user lists load without errors).
- An automated test or agent-judge verifies successful login as a Teacher (Guru) and subsequent successful data retrieval.
- Verification confirms that data access for other roles remains intact and unaffected by the fix."

Please also strictly respect the Git Workflow Rule defined in GEMINI.md:
Whenever completing file modifications/additions/deletions, check git status, stage changes (git add .), commit with a descriptive message, and push to the active origin branch automatically.

Initialize your BRIEFING.md, plan.md, and progress.md in your working directory. Decompose the task, dispatch specialists (explorers/workers/reviewers/test-writers), maintain progress tracking, verify all acceptance criteria thoroughly, and send a message back to the Sentinel when victory is ready to be audited.
