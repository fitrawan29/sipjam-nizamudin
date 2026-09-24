# Task Assignment for Explorer 3 (Survey R3)

You are Explorer 3 (`teamwork_preview_explorer`).
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3_1
- Original Request File: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Parent Orchestrator ID: 2ac91888-0ccf-41c6-9452-748556b221b7

## Objective
Survey and map the codebase specifically for Requirement R3: Fungsionalitas Tambahan & Bug Fixes.
1. Fix accumulation calculation of keterlambatan (late arrival) so it is correctly read and accumulated for each teacher account on teacher dashboard.
2. Fix camera bug when user toggles between front camera and back camera (facingMode switch bug / stream handling).
3. Add option for teachers to change username and password on their account page.
4. Add search bar (general text search) and column-specific dropdown filters on every master data menu.

## Scope & Instructions
1. READ `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` first.
2. Search and inspect the codebase (teacher dashboard pages/components, attendance calculation logic, camera component/hooks, account/profile page, Supabase auth/profile handling, master data pages under admin/guru/etc.).
3. Identify exact files, tables, columns, logic flow, bug causes, and missing filter components.
4. Provide concrete technical architecture recommendations for implementing R3.
5. Write your comprehensive survey report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3_1\survey_r3.md` and `handoff.md`.
6. Send a message to parent with the summary and path to your report.

## 2026-09-24T11:44:32Z
You are Explorer 3. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3_1.
Read your task instructions at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3_1\DISPATCH.md and original request at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Survey the codebase for Requirement R3 (Fungsionalitas Tambahan & Bug Fixes).
Identify exact files, components, logic, and necessary changes for:
- Keterlambatan accumulation calculation fix on teacher dashboard
- Camera switch facingMode bug fix (front <-> back toggle)
- Change username & password option on teacher account page
- Search bar & column dropdown filters across all master menus
Write your detailed report to survey_r3.md and handoff.md in your working directory.
Communicate completion back to parent (2ac91888-0ccf-41c6-9452-748556b221b7) via send_message.

