# BRIEFING — 2026-09-28T05:47:00Z

## Mission
Implement AI Assistant rule-based chatbot and Interactive Onboarding Tutorial for Guru and Admin in SIPJAM app, mount cleanly in AppScreen.tsx, verify with automated tests, ensure zero regressions and clean builds, push to git.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_5
- Original parent: parent (Sentinel)
- Original parent conversation ID: 1361ae95-f4be-4093-b105-2a00db476051

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_5\SCOPE.md
1. **Decompose**:
   - Milestone 0: Survey & Technical Exploration (Explorers map AppScreen.tsx, sidebar elements, targeting attributes, test runners)
   - Milestone 1: AI Assistant Rule-based Chatbot (Knowledge base with 30+ Q&As, context awareness, floating button, responsive panel)
   - Milestone 2: Interactive Onboarding Tutorial (Guru & Admin flows, UI highlight overlay, tooltips, localStorage persistence, re-run trigger in sidebar)
   - Milestone 3: Integration in AppScreen & E2E/Unit Automated Testing
   - Milestone 4: Verification, Review, Audit & Git Commit/Push
2. **Dispatch & Execute**:
   - Direct iteration loop: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor (1)
3. **On failure**:
   - Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate
4. **Succession**:
   - Self-succeed at 16 spawns if needed.
- **Work items**:
  1. Survey & Architecture Mapping [in-progress]
  2. AI Assistant Chatbot [pending]
  3. Interactive Onboarding Component [pending]
  4. AppScreen Integration & Automated Tests [pending]
  5. Verification, Audit & Git Push [pending]
- **Current phase**: 1
- **Current focus**: Survey & Architecture Mapping

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- File editing tools ONLY for metadata/state files (.md) in .agents/teamwork/
- Non-destructive integration in AppScreen.tsx.
- Pure rule-based chatbot (no external AI/API calls), 100% offline, >= 30 Q&A covering all menus.
- Real UI highlight overlay with tooltips for Guru (>=5 steps) and Admin (>=6 steps).
- LocalStorage persistence (`sipjam_onboarding_guru_done`, `sipjam_onboarding_admin_done`).
- Re-runnable from sidebar.
- No new npm packages.
- Strict TypeScript (`npx tsc --noEmit`) and build (`npm run build`).
- Automated tests written and passing.
- Strictly adhere to GEMINI.md git workflow (`git add .`, `git commit -m "..."`, `git push origin main`).

## Current Parent
- Conversation ID: 1361ae95-f4be-4093-b105-2a00db476051
- Updated: 2026-09-28T05:47:00Z

## Key Decisions Made
- Decompose into survey -> standalone components -> integration & tests -> review & git push.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_1 | teamwork_preview_explorer | AppScreen Architecture Mapping | completed | 9c3798cb-82ae-4466-a21a-97e8191032f2 |
| explorer_survey_2 | teamwork_preview_explorer | Test and Build Pipeline Setup | completed | e9b48269-80c2-450a-95b2-e50afd45fed6 |
| explorer_survey_3 | teamwork_preview_explorer | Knowledge Base & UI Spec Mapping | completed | b24ea824-624a-4e32-ad7b-52eb74bdd42e |
| worker_ai_assistant | teamwork_preview_worker | AI Assistant & Knowledge Base Implementation | in-progress | 9891428a-e75d-491c-b263-959fb008ddce |
| worker_onboarding | teamwork_preview_worker | Interactive Onboarding Tutorial Implementation | in-progress | e16b2836-f25a-4e22-bb65-9abafdcc231d |

## Succession Status
- Succession required: no
- Spawn count: 5 / 16
- Pending subagents: 9891428a-e75d-491c-b263-959fb008ddce, e16b2836-f25a-4e22-bb65-9abafdcc231d
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-16
- Safety timer: none

## Artifact Index
- .agents/teamwork/orchestrator_5/plan.md — Orchestration Plan
- .agents/teamwork/orchestrator_5/progress.md — Progress and heartbeat tracking
- .agents/teamwork/orchestrator_5/SCOPE.md — Milestone and scope definition
