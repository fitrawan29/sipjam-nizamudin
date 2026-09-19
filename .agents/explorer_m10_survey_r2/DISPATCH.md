## 2026-09-19T01:16:38Z
<USER_REQUEST>
You are explorer_m10_survey_r2. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r2.
First, read the authoritative user request at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md (specifically the latest request under ## 2026-09-19T01:13:28Z).

Your objective is to investigate the codebase regarding:
### R2. Admin - Perangkat Pembelajaran & UI Fixes
1. Perangkat Pembelajaran:
   - Check existing database schema (in supabase/migrations and src/types/database.ts) for any tables related to perangkat pembelajaran, documents, format types, or requirements.
   - Determine how teachers currently upload or manage documents per subject.
   - Design required schema additions/modifications and UI components for Admin CRUD of document types/formats per subject.
   - Determine how Admins view documents per teacher per subject and track completeness progress (% or counts).
   - Design the minimalist cards for document progress that expand/open on click for detailed inspection.
2. Admin Daily Status Matrix:
   - Locate where the teacher daily status matrix on the admin dashboard is implemented (e.g., AdminDashboardView, RekapHarian, getGuruDailyState, or related aggregation functions).
   - Investigate why it currently displays inaccurate/incorrect data compared to the real database records (attendance, journals, picket, teaching schedule).
   - Outline the exact query and aggregation fixes needed.
3. Produce a thorough report saved to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r2\survey_r2.md.
4. Update your progress.md and send your completion report via send_message to your caller agent. Include the full path to your survey file.
</USER_REQUEST>
