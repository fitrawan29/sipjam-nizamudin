## 2026-10-08T11:15:36Z
You are teamwork_preview_explorer_survey_o16_3.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_3

MANDATORY REQUIREMENT:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md first, specifically the latest user request under header '## 2026-10-08T11:11:29Z'.

Your task is to conduct an in-depth codebase survey for R3 (Student Attendance & Piket Flow), R4 (Academic Updates), and Testing Infrastructure:
1. Student attendance RBAC: Examine PiketView.tsx, RekapSiswaView.tsx, GuruJurnal.tsx, and AppScreen.tsx. How are roles (Mapel, Wali Kelas, Piket) differentiated and enforced for student attendance?
2. Gate to Mapel synchronization & Truancy detection: How does gate arrival attendance from Piket/Wali Kelas sync into GuruJurnal for Mapel teachers? How to automatically detect and flag truancy when Piket marks "Hadir" but Mapel marks "Alpa"?
3. Concurrency lock for Piket forms: How is student attendance currently edited/submitted in PiketView? How to implement concurrency locks (e.g. Supabase table locks, active session tracking, or optimistic locking) so that two Piket users accessing the student attendance form simultaneously lock one out?
4. Kurikulum Merdeka academic calculations: Examine DaftarNilaiView.tsx and related grade calculation logic. How are final grades and Capaian Pembelajaran descriptions computed? How should the Kurikulum Merdeka calculation logic and descriptions be structured?
5. Wali Kelas "Rapor" menu: Where are navigation menus configured in AppScreen.tsx? How should the "Rapor" menu be added specifically for teachers who are Wali Kelas?
6. In-app tutorials: Where are tutorials defined? How to update them for all new flows?
7. Testing suite & E2E infra: Inspect existing test files in tests/ and tests/e2e/, package.json test scripts, test setup, Playwright/Vitest/tsx configurations. How can programmatic and E2E tests be written to cover all Acceptance Criteria?

Deliver a comprehensive investigation report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_3\report.md and write a handoff.md in your working directory.
When done, notify the orchestrator (conversation ID 835d6ca7-b3e2-474a-acf0-423026614449) via send_message with a brief summary and the path to your report.
