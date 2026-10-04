# BRIEFING — 2026-10-04T07:26:00Z

## Mission
Implement Milestone 2 (R3): Hide AI Assistant / floating elements in print while strictly preserving .sipjam-print-watermark, standardize teacher DokumenView printing to match Admin standard, and standardize RekapJurnalView print layout and Wali Kelas signature autofill.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2
- Original parent: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Milestone: Milestone 2 (R3)

## 🔒 Key Constraints
- Exclusive write ownership files:
  - `src/app/globals.css`
  - `src/components/AIAssistant/AIAssistant.tsx`
  - `src/components/DokumenView.tsx`
  - `src/components/RekapJurnalView.tsx`
- DO NOT write to any other source files.
- Integrity mandate: genuine implementation only, zero hardcoded cheat results.
- Run `npx tsc --noEmit` and confirm 0 TypeScript errors.
- Ensure `.sipjam-print-watermark` has `display: flex !important;` in `@media print` and is never hidden by fixed element rules.
- Follow Git Workflow Rule at completion if applicable or report back to orchestrator.

## Current Parent
- Conversation ID: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Updated: 2026-10-04T07:26:00Z

## Task Summary
- **What to build**:
  1. Hide floating robot / AI Assistant and floating UI in print:
     - `src/components/AIAssistant/AIAssistant.tsx`
     - `src/app/globals.css`
  2. Preserve `.sipjam-print-watermark` in `src/app/globals.css`
  3. Standardize teacher document printing in `src/components/DokumenView.tsx`
  4. Standardize print styling & Wali Kelas autofill in `src/components/RekapJurnalView.tsx`
- **Success criteria**:
  - `npx tsc --noEmit` clean (0 errors)
  - Elements properly hidden/shown in print
  - Watermark preserved
  - DokumenView and RekapJurnalView comply with Admin print standard
- **Interface contracts**: PROJECT.md, survey handoff

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: Pending

## Loaded Skills
- None specified in dispatch
