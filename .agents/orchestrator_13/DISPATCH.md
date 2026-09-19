## 2026-09-19T01:14:31Z

You are the Project Orchestrator for Milestone 10 of the SIPJAM project.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_13
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Original Request: Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md (specifically the latest request under ## 2026-09-19T01:13:28Z).

Summary of Requirements:
Implement 11 UI/UX improvements, feature additions, and bug fixes for the Next.js sipjam-app:

### R1. Print Layout & Document UI Adjustments
- Remove forced portrait/landscape CSS/JS settings; the print layout should rely purely on the user's browser print settings.
- Ensure tables in print preview fit the page responsively without getting cut off before the page is filled.
- Fix the left and right logos on the letterhead (kop surat) to render correctly and be readable without overlapping text.

### R2. Admin - Perangkat Pembelajaran & UI Fixes
- Implement CRUD operations for document types and formats that teachers must upload per subject.
- Create a view for admins to see documents per teacher per subject, and track completeness progress based on required documents per subject.
- Display the teacher's document progress using minimalist cards that can be clicked to open for details.
- Fix the teacher daily status matrix on the admin dashboard to display accurate and correct data aggregated from database.

### R3. Teacher Dashboard & Camera Location
- Reorder the teacher dashboard to strictly show: (1) Personal data statistics, (2) Today's task status, (3) Teaching schedule, in that order. Remove any other sections/widgets.
- When taking front and back camera photos for presensi, jurnal, and laporan piket, fetch and append the location name formatted as `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]`. Use OpenStreetMap (Nominatim) for reverse geocoding.
- Fix the student attendance percentage calculation to accurately reflect real data: formula `(total_present / total_students) * 100` and displays correctly on UI.

### R4. User Prompts & Feedback Flows
- Add a PWA install prompt at application start (hidden if already accepted, dismissed, or installed in standalone mode).
- When an admin rejects presensi, jurnal, or laporan piket, provide a required feedback text column to store the reason for rejection, blocking submission until populated and saving to backend.

Rules & Guidelines:
1. Initialize your BRIEFING.md, plan.md, and progress.md in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_13.
2. Regularly update progress.md so the Sentinel can monitor progress.
3. Git Workflow Rule (MANDATORY per GEMINI.md): Every time a modification/task is completed:
   - git status
   - git add .
   - git commit -m '...'
   - git push origin main (or current active branch)
   Do NOT ask for permission, execute git push automatically.
4. Next.js agent rules (AGENTS.md): Read relevant docs in node_modules/next/dist/docs/ if needed; beware of breaking changes and deprecations.
5. All tests and linting must pass before claiming completion.
6. When all requirements and acceptance criteria are met, report completion back to the Sentinel.
