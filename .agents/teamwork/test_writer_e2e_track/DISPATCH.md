## 2026-10-29T11:34:02Z
You are the E2E Test Suite Creator for the SIPJAM Menu and Feature Consolidation Project.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_e2e_track\
Before starting work, YOU MUST read ORIGINAL_REQUEST.md located at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\TEST_INFRA.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\docs\REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md

Your task is to build a comprehensive, opaque-box E2E automated test suite that independently verifies the requirements across all 4 Tiers:
- File to write: tests/navigation_consolidation_verification.test.ts (executed via npx tsx tests/navigation_consolidation_verification.test.ts)
- Methodology:
  - Tier 1: Feature Coverage (≥5 tests per feature: menu counts per role, sub-tabs rendering, canonical routes).
  - Tier 2: Boundary & Corner Cases (invalid view IDs, unauthorized direct sub-tab URL access, empty tabs, rapid switching, missing user props).
  - Tier 3: Pairwise combinations (URL query param vs popstate history, keep-alive form state preservation across tab switches, multi-tenant school switching).
  - Tier 4: Real-world workflow simulations (Guru arrival -> journal; Wali Kelas supervision; Admin master data & verif; Dinas monitoring).
- Do NOT modify any application implementation code in src/.
- Once your test suite is verified, create c:\Users\Fitra\OneDrive\Documents\sipjam-app\TEST_READY.md per the template in PROJECT.md.
- Write your complete handoff report to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_e2e_track\handoff.md
- Update progress in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_e2e_track\progress.md.
- Send a completion message to the orchestrator (conversation ID: 095792d8-1a85-4945-889d-abf25d3c7740).
