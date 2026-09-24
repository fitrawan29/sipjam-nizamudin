# Task Assignment: E2E Testing Track

You are the Test Writer (`teamwork_preview_test_writer`) for the E2E Testing Track of SIPJAM Application Enhancements.
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_e2e_1
- Original Request File: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Master Project Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md
- Parent Orchestrator ID: 2ac91888-0ccf-41c6-9452-748556b221b7

## Objective
Design and implement a comprehensive opaque-box, requirement-driven E2E test suite covering all 12 requirement items in ORIGINAL_REQUEST.md across Tiers 1-4:
- **Tier 1: Feature Coverage** (>=5 test cases per feature for happy path)
- **Tier 2: Boundary & Corner Cases** (>=5 test cases per feature for limits, edge cases, error conditions)
- **Tier 3: Cross-Feature Interactions** (pairwise coverage across feature interactions)
- **Tier 4: Real-World Scenarios** (realistic end-to-end user workflows)

## Features to Cover (from PROJECT.md):
1. F1: Presensi Re-submission Reset on Reject
2. F2: Jurnal Re-submission Reset on Reject & Class-specific matching bug fix
3. F3: Laporan Piket Re-submission Reset on Reject
4. F4: Admin Verification UI Updates (hide Setujui button when rejected, remove from active list)
5. F5: Rejection Notification to Teacher (Web Push & in-app chat_messages)
6. F6: Auto-Alpa Cutoff Evaluation & Database Transition
7. F7: 3x Absence Warning System (Presensi, Jurnal, Piket)
8. F8: Notification Permission Full Blocking Modal Overlay on App Open
9. F9: Pre-Login Animation & Splash
10. F10: Login SaaS Text Removal & Browser Title "SIPJAM"
11. F11: Apple iOS/Safari Compatibility Fixes (safe area, scrolling, camera)
12. F12: Keterlambatan Accumulation Calculation Fix
13. F13: Camera Switch facingMode Toggle Bug Fix
14. F14: Change Username & Password Option for Teachers
15. F15: Master Menus Search & Column Dropdown Filters

## Outputs Required:
1. Test files in `tests/e2e/` (or runnable via `npm test` / Vitest / Jest / tsx test harness).
2. `TEST_INFRA.md` at project root summarizing test runner invocation, test architecture, and coverage thresholds.
3. `TEST_READY.md` at project root with full checklist and command to run the suite.
4. Report completion back to parent via `send_message`.

## 2026-09-24T12:32:55Z
You are the Test Writer for the E2E Testing Track of SIPJAM.
Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_e2e_1.
Read your instructions at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_e2e_1\DISPATCH.md, master project plan at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md, and original request at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Design and implement the E2E test suite covering Tiers 1-4 across all 15 features.
Generate TEST_INFRA.md and TEST_READY.md at project root, and execute tests.
Communicate completion back to parent orchestrator (2ac91888-0ccf-41c6-9452-748556b221b7) via send_message.
