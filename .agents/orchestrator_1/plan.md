# Plan: Comprehensive UI/UX Audit & Refactoring

## Objectives
1. Enforce strict light/dark typography contrast via Tailwind CSS: pure black/dark legible in light mode, pure white (`dark:text-white`) in dark mode.
2. Implement clean, simple, mobile-first design with consistent, aesthetically pleasing icons without horizontal viewport overflow.
3. Strict rule: Modify ONLY CSS / className classes, zero changes to React component logic or state.
4. Fulfill GEMINI.md git workflow automatically.

## Execution Phases
- **Phase 0: Codebase Survey (Parallel Explorers)**
  - Explorer 1: App structure, layouts, navigation, shell, theme provider setup.
  - Explorer 2: Core feature pages and views.
  - Explorer 3: Shared UI components, typography, icon usage, Tailwind config.
- **Phase 1: Synthesis & Decomposition**
  - Create `PROJECT.md` with Feature/Component Inventory, Milestone Decomposition, Write Boundaries, and Interface Contracts.
- **Phase 2: Milestone Implementation & Verification**
  - Milestone workers execute CSS refactoring per write boundary.
  - Workers run build/typecheck to guarantee no syntax/type breaks.
  - Multi-agent independent reviews (2 reviewers, 2 challengers, 1 forensic auditor).
  - Gate evaluation.
- **Phase 3: Git Workflow & Final Validation**
  - Worker runs git status, git add ., git commit -m "...", and git push origin main.
- **Phase 4: Synthesis & Reporting to Sentinel**
  - Deliver final report to Sentinel with full evidence and verification summaries.
