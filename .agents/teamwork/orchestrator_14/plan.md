# Project Plan: Codebase Flow, Feature Inventory & Improvement Proposals for sipjam-app

## Objective
Analyze `sipjam-app`, map its application flow and menu hierarchy into a syntactically valid Mermaid diagram, produce a comprehensive feature inventory linked to source files, and propose at least 3 concrete, actionable architectural/UX improvements.

## Execution Phases

### Phase 1: Multidimensional Codebase Survey (Explorers)
- **Explorer 1 (`explorer_nav`)**: Map application flow, routing mechanism (Next.js app/pages router, `AppScreen.tsx`), role-based menu items (Superadmin, Admin, Guru, Piket, Wali Kelas), view switching, modals, and permission gates.
- **Explorer 2 (`explorer_features`)**: Enumerate all features and map them to concrete codebase directories/files (`src/components`, `src/lib`, `src/hooks`, Supabase tables, migrations, and scripts).
- **Explorer 3 (`explorer_arch_ux`)**: Analyze architectural quality, code health, monolithic component breakdown, UX workflows, camera/PWA/push notification subsystems, identifying high-impact improvement opportunities.

### Phase 2: Synthesis & Deliverable Construction
- Consolidate explorer findings.
- Draft syntactically valid Mermaid flowchart capturing routes, role gateways, menu hierarchy, and modals.
- Build detailed Feature Inventory table mapping features to codebase paths and database tables.
- Formulate at least 3 detailed, high-impact, actionable improvement proposals across UX, architecture, and code structure.
- Produce `report.md` in `orchestrator_14`.

### Phase 3: Verification & Review
- Dispatch Reviewer (`teamwork_preview_reviewer`) to audit Mermaid syntax, codebase mapping veracity, and proposal actionability.
- Resolve any discrepancies or gaps identified during review.

### Phase 4: Completion & Handoff
- Comply with GEMINI.md git workflow rules.
- Write `handoff.md` and update `progress.md`.
- Report completion to Sentinel.
