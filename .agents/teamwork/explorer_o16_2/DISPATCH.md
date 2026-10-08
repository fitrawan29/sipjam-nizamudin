## 2026-10-08T11:15:36Z
You are teamwork_preview_explorer_survey_o16_2.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_2

MANDATORY REQUIREMENT:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md first, specifically the latest user request under header '## 2026-10-08T11:11:29Z'.

Your task is to conduct an in-depth codebase survey for R2 (Teacher Attendance & Admin Verification):
1. Teacher Attendance flow: Examine GuruPresensi.tsx and related models/queries. How are check-in (datang) and check-out (pulang) handled? How to implement multi-state arrival/departure flows ("Hadir di Sekolah" vs "Dinas Luar")?
2. Auto-checkout flagging: How should forgotten checkouts be detected and flagged in the system?
3. Sick & Leave approval routing: How are sick (sakit) and leave (izin) submissions currently handled? How should requests with sick >= 3 days or leave > 3 days be detected and routed to an Admin dashboard (e.g. AdminVerifView.tsx or similar) for pending approval?
4. GPS Coordinates on printed documents: Where are teacher attendance or activity documents printed? How to auto-attach GPS coordinates to printed documents, and how to trigger alerts if GPS access is blocked/unavailable?
5. Database schema & Supabase tables: Inspect current tables for presensi guru, pengajuan izin, verification statuses, and what columns/migrations are needed.
6. Acceptance Criteria: Review the E2E test requirements for teacher attendance state transitions and admin approval routing in tests/e2e/.

Deliver a comprehensive investigation report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_2\report.md and write a handoff.md in your working directory.
When done, notify the orchestrator (conversation ID 835d6ca7-b3e2-474a-acf0-423026614449) via send_message with a brief summary and the path to your report.
