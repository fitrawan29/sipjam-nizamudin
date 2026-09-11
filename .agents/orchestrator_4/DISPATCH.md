# Dispatch Log

## 2026-09-11T12:54:55Z

From Parent (ID: 494173fc-4585-4751-b942-5a2da2cb9036)

User Request:
Use a very large team of agents. 
Apply targeted UI/UX and database schema improvements, specifically enforcing Light Mode as default, correcting Google Drive image rendering, ensuring KBM journal mapel/kelas drop-downs are dynamically filtered per teacher, strictly standardizing print document headers, and conducting a broad quality-of-life audit.

Detailed Requirements:
1. R1. Default Theme & Image Rendering:
   - Make "Light Mode" the default theme for the application.
   - Implement a URL transformer or regex to convert standard Google Drive share links into direct-renderable image URLs (e.g., `drive.google.com/uc?id=`) so images display correctly within the application's UI.
2. R2. Dynamic KBM Journal Filtering:
   - Update the "Guru Jurnal" submission form so the "Mata Pelajaran" and "Kelas" dropdowns only display the specific subjects and classes assigned to the currently logged-in teacher.
   - You are explicitly authorized to create and manage new relational tables in the Supabase database (using supabase MCP tools or SQL migrations/scripts) to support this mapping if current schema is insufficient.
3. R3. Strict Print Formatting:
   - Enforce strict CSS print constraints on the `PrintHeader` component:
     * The school address line must remain on a single horizontal line (`white-space: nowrap`). If it overlaps with the left/right logos, its font size must dynamically shrink.
     * The line spacing (`line-height`) for the header text must be exactly `1`.
     * In the signature block, append the dynamic string "[Kabupaten/Kota], [Date]" immediately above the "Kepala Sekolah" designation (pulling the region dynamically from settings if available).
4. R4. Broad Quality-of-Life Audit:
   - Conduct a systematic sweep of the application to identify and resolve any other UI/UX flaws, missing states, or visual inconsistencies to polish the application.
   - Verify build and tests pass (`npm run build`).

Git Workflow Rule (GEMINI.md):
- git status
- git add .
- git commit -m "..."
- git push origin main
