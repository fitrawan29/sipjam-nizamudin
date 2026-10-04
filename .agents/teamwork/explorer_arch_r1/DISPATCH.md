# Dispatch Instructions for Explorer 3 (explorer_arch_r1)

## Objective
Analyze the codebase architecture, code quality, and User Experience (UX) of `sipjam-app`. Identify architectural bottlenecks, maintainability risks, code complexity, and UX frictions, and formulate at least 3 distinct, high-impact, actionable improvement proposals.

## Context & Inputs
- Authoritative user request: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read this first!)
- Key areas to investigate:
  - Architecture & Component Structure:
    - `src/components/AppScreen.tsx`: monolithic size, state management (is state centralized or scattered?), view switching logic, prop drilling.
    - Code duplication across components (`GuruPresensi`, `GuruJurnal`, `PiketView`, `RekapJurnalView`, `AdminDataView`, etc.).
    - Client vs Server Components (Next.js App router conventions vs client-heavy single-page architecture).
    - Database client usage (`src/lib/supabaseClient.ts`): error handling, security, RLS policies, connection handling, query patterns.
  - User Experience (UX) & Design:
    - Mobile responsiveness (forms, modals, tables, QR scanning, photo uploads).
    - Offline support and PWA capabilities: how does the app behave when offline or with spotty school Wi-Fi?
    - Form usability: complex forms like Jurnal KBM (required fields, validations, auto-save, feedback).
    - Loading states, skeleton loaders, and error boundaries.
  - Actionable Improvement Areas:
    - Formulate concrete, detailed proposals across:
      1. Architecture / Code Structure (e.g., modularizing AppScreen, state management/custom hooks, Next.js routing migration)
      2. UX / Interface Design (e.g., offline queue/sync for attendance in dead zones, enhanced feedback/skeleton states, streamlined multi-step forms)
      3. Performance / Reliability (e.g., image compression before upload, query optimization/caching, service worker caching strategies)

## Deliverables & Output
Write a comprehensive report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_arch_r1\report.md`
and write your handoff in:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_arch_r1\handoff.md`

Your report MUST include:
1. Architectural analysis: Component hierarchy, state flow, coupling, tech debt.
2. UX evaluation: Navigation clarity, feedback loops, mobile usability, edge cases.
3. At least 3 detailed, concrete, actionable improvement proposals, with:
   - Problem statement & current limitation
   - Proposed solution & architectural design
   - Concrete implementation steps (which files to touch, refactoring plan)
   - Expected benefits & trade-offs

When finished, send a message to orchestrator with your report location.


## 2026-10-04T13:53:51Z
You are Explorer 3 (explorer_arch_r1).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_arch_r1
Read your dispatch instructions at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_arch_r1\DISPATCH.md
Read the authoritative user request first at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-04T13:50:06Z).

Your mission is to analyze the codebase architecture, code structure, and User Experience (UX) of sipjam-app, identify technical debt, bottlenecks, and UX friction, and propose at least 3 distinct, actionable, high-impact improvements.
