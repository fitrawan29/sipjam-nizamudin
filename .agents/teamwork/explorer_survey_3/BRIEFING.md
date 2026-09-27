# BRIEFING — 2026-09-28T05:52:40+08:00

## Mission
Survey all 19 main menu items in SIPJAM, map out 30+ Q&A pairs with context sensitivity for rule-based AI Assistant, analyze Font Awesome icons and Tailwind CSS styling patterns, and design the highlight overlay & tooltip positioning mechanism for interactive onboarding tutorial across mobile and desktop.

## 🔒 My Identity
- Archetype: explorer
- Roles: frontend investigator, role flow analyzer, evidence synthesizer, menu & knowledge base mapper, UI overlay architect
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3
- Original parent: f963fff1-816c-4a40-9daa-b44715a5d909
- Milestone: survey & root cause analysis
- New Parent: 3b364431-4af8-4ed9-9a8c-b79b77d58fbe (orchestrator_5)
- Milestone: AI Assistant FAQ Knowledge Base & Interactive Onboarding Highlight Architecture

## 🔒 Key Constraints
- Read-only investigation — do NOT implement fixes directly
- Investigate frontend pages, components, queries, API routes, server actions, and differences between roles
- Provide exact file paths, line numbers, and logic chain
- Output handoff report to `handoff.md` and keep `progress.md` updated
- 100% offline, rule-based keyword matching (no external AI/API dependencies)
- Pure native Tailwind CSS and Font Awesome 6 (no new npm packages)
- Strictly responsive across mobile (320px–428px) and desktop

## Current Parent
- Conversation ID: 3b364431-4af8-4ed9-9a8c-b79b77d58fbe
- Updated: 2026-09-28T05:52:40+08:00

## Investigation State
- **Explored paths**: `src/components/AppScreen.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/HomeView.tsx`, `GuruPresensi.tsx`, `GuruJurnal.tsx`, `PiketView.tsx`, `DokumenView.tsx`, `GradebookView.tsx`, `ChatView.tsx`, `InformasiView.tsx`, `HistoryView.tsx`, `RekapJurnalView.tsx`, `RekapSiswaView.tsx`, `AdminVerifView.tsx`, `SistemBlokView.tsx`, `AnalitikView.tsx`, `AdminRekapView.tsx`, `AdminDataView.tsx`, `AdminBackupView.tsx`, `AdminConfigView.tsx`, `package.json`.
- **Key findings**:
  1. All 19 main menu items identified, cataloged, and mapped to exact view IDs and components.
  2. 42 detailed Q&A pairs in Bahasa Indonesia created with keywords and active view context boost.
  3. Font Awesome 6.4.0 verified (`fa-solid fa-...`) with `fa-solid fa-wand-magic-sparkles` / `fa-solid fa-circle-question` recommended.
  4. Tailwind CSS v4 custom theme tokens (`nizamudin-green`, `nizamudin-gold`, `glass-card`, `btn-click`) and z-index ladder mapped.
  5. Non-intrusive box-shadow 9999px spotlight mechanism and collision-avoidant tooltip positioning architecture defined for mobile (320px–428px) and desktop.
- **Unexplored areas**: None. All objectives from prompt fulfilled.

## Key Decisions Made
- Used Box-Shadow `0 0 0 9999px rgba(0,0,0,0.72)` with CSS transition for smooth spotlight movements without DOM mutations.
- Synchronized tour with sidebar open/close state to ensure target elements are rendered and measured properly.
- On mobile (320px–428px), docked tooltips to bottom of viewport or positioned vertically relative to target to prevent horizontal clipping.

## Artifact Index
- `.agents/teamwork/explorer_survey_3/handoff.md` — Comprehensive 5-component handoff report
- `.agents/teamwork/explorer_survey_3/progress.md` — Progress tracker
- `.agents/teamwork/explorer_survey_3/DISPATCH.md` — Dispatch history
