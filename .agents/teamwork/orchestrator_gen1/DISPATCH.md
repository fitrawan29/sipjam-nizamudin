## 2026-10-29T14:25:54Z

Implement the comprehensive consolidation of features and menus across all roles in sipjam-app according to the design and recommendations in docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md, while ensuring zero feature loss.

Integrity mode: development

## Requirements

### R1. Comprehensive Feature and Menu Consolidation
Consolidate all 7 feature clusters across all user roles (Guru Reguler, Wali Kelas, Guru Piket, Administrator, Kepala Sekolah, Pengawas Dinas, dan Superadmin) as specified in docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md, streamlining sidebar navigation, eliminating duplicate view rendering, and grouping related workflows into cohesive sub-tabs.

### R2. Zero Feature Loss Guarantee
Ensure all existing functionalities, forms, modals, action buttons, filters, exports, validations, and role-specific workflows across every user role remain 100% intact, fully accessible, and operative with zero regression.

### R3. Transparent Backward Compatibility and Aliasing
Provide transparent aliasing or route/view redirection for legacy view IDs and automated tour selectors (data-tour) so that existing links, bookmarks, and automated test selectors continue to function correctly alongside the consolidated sub-tab structure.

## Acceptance Criteria

### Menu Consolidation & Role Navigation
- [ ] All 7 clusters described in docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md are consolidated into their target menu structure for each role (Guru Reguler, Wali Kelas, Guru Piket, Administrator, Kepala Sekolah, Pengawas Dinas, dan Superadmin).
- [ ] Redundant top-level menu items are grouped into cohesive sub-tab views as specified in the recommendation document.

### Zero Feature Loss & Backward Compatibility
- [ ] All role-specific forms, modals, tables, actions, and features remain present and functional.
- [ ] Legacy view IDs and data-tour selectors resolve or alias seamlessly to their corresponding views or sub-tab without breaking existing references.

### Code Integrity & Verification
- [ ] TypeScript compilation (npx tsc --noEmit) completes with zero errors.
- [ ] Next.js production build (npm run build) completes successfully.
- [ ] Existing automated test suites (npm test) pass without failures.
- [ ] Regression tests covering the consolidated navigation and view transitions pass.

---
Successor Instructions:
You are the successor Project Orchestrator (Generation 1).
Read the comprehensive handoff report at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\handoff.md
And review:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\TEST_INFRA.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\TEST_READY.md

Status:
- Survey Phase: COMPLETED
- E2E Testing Track: COMPLETED (tests/navigation_consolidation_verification.test.ts passing 150/150)
- Milestone 1 (Foundation & Normalization): COMPLETED (Gate Passed 100%)
- Milestone 2 (Functional Consolidation & Sub-Tabs): COMPLETED (Gate Passed 100%)
- Milestone 3 (Navigation Restructuring, URL Aliasing & Onboarding): IN PROGRESS
- Milestone 4 (Full E2E Pass 100% & Final Verification): PLANNED

Resume execution from Milestone 3 through Milestone 4.
Working directory: .agents/teamwork/orchestrator_gen1/
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Parent Sentinel Conversation ID: 0759d8ae-8b5b-40f8-a4c3-fd7e7fee7312
