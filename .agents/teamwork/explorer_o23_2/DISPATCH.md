# Dispatch for Explorer 2 (Executive Monitoring Dashboard & Aggregations)

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_2`

## Authoritative Request
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read the latest request at 2026-10-23T19:45:33Z)

## Objective
Investigate codebase regarding:
1. Navigation & Views: Inspect `src/components/AppScreen.tsx`, navigation menus (`menuItems...`), sidebar layout (`ClaySidebar`), and how views are mounted and switched.
2. Cross-school data fetching: How queries across schools or within a region can be performed cleanly with Supabase. How attendance data (guru presensi, siswa presensi, jurnal) is structured and queried.
3. Executive Dashboard design: How to structure the `DinasDashboard` / monitoring view:
   - Aggregates: Total active schools in the assigned region, overall teacher attendance % today, student attendance % today, school connectivity/satellite health, schools needing attention (high alpa).
   - Search & filters scoped strictly to the assigned region (`kota_kabupaten`).
   - Summary print feature for official reporting.
4. Output: Write findings and architectural recommendations to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_2\report.md` and complete `handoff.md`.


## 2026-10-23T19:48:52Z
[Message from b9c240a0-6ada-4834-ac97-9bf90cc14baf]
Read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Read your assignment at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_2\DISPATCH.md
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_2

Investigate navigation, layout, cross-school data querying, and executive dashboard design:
1. Inspect AppScreen.tsx, ClaySidebar, and how views are mounted and switched.
2. How cross-school attendance queries (guru presensi, siswa presensi, jurnal) work or should work with Supabase in a specific region (`kota_kabupaten`).
3. Design of the executive dashboard for `dinas_pendidikan`: aggregate cards (total schools, teacher attendance % today, student attendance % today, connectivity health, schools needing attention), search/filters scoped strictly to assigned region, and print summary layout.

Write your full detailed report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_2\report.md
Write your handoff report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_2\handoff.md
Update progress.md as your liveness heartbeat. When done, notify me via send_message with a summary.
