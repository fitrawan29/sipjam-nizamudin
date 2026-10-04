# Dispatch Instructions for Worker (worker_git_r1)

## Objective
Execute the mandatory Git Workflow per GEMINI.md and verify repository status.

## Instructions
1. Check `git status` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app`.
2. Stage modified/untracked files: `git add .`
3. If there are staged changes, commit with a descriptive message:
   `git commit -m "docs: codebase flow analysis, feature inventory, and architecture mapping"`
4. Push to active origin branch: `git push origin main` (or active branch).
5. Verify `npx tsc --noEmit` passes with 0 errors.

## Deliverables
Write your results and handoff report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_git_r1\report.md`
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_git_r1\handoff.md`

When done, send a message to orchestrator (`962492f1-3042-46e5-9074-fc7b66436c10`).


## 2026-10-04T14:13:21Z
You are worker_git_r1.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_git_r1
Read your dispatch instructions at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_git_r1\DISPATCH.md
Read the authoritative user request at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Run `git status` in c:\Users\Fitra\OneDrive\Documents\sipjam-app.
2. If there are changes or untracked files, run `git add .`
3. Commit with a descriptive message: `git commit -m "docs: codebase flow analysis, feature inventory, and architecture mapping"`
4. Push to active origin branch: `git push origin main` (or active branch).
5. Run `npx tsc --noEmit` and document the output.
6. Write your report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_git_r1\report.md and handoff.md, then send a message to orchestrator (962492f1-3042-46e5-9074-fc7b66436c10).
