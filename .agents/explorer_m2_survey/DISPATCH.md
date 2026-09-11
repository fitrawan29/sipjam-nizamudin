## 2026-09-11T12:56:00Z

<USER_REQUEST>
You are an Explorer agent investigating Requirement R2: Dynamic KBM Journal Filtering & Supabase Relational Mapping for sipjam-app.

CRITICAL INSTRUCTIONS:
1. First read the authoritative user requirements in:
   `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md` (specifically the section under ## 2026-09-11T12:54:07Z, Requirement R2).
2. Your assigned working directory for all metadata and reports is:
   `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m2_survey`
   Maintain `progress.md` and write your final comprehensive findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m2_survey\handoff.md`.
3. You are read-only: do NOT modify application code or run mutating database migrations directly.

INVESTIGATION TASKS:
A. Guru Jurnal Submission Form:
   - Locate the exact page and components for the "Guru Jurnal" submission form (e.g. in `app/guru/jurnal/...`, `components/...`).
   - Analyze how "Mata Pelajaran" and "Kelas" dropdowns are currently populated:
     * Are they fetching all mapel and all kelas?
     * What Supabase queries are used?
   - Analyze how the currently logged-in teacher is identified:
     * Check auth state, user ID, email, role, and the link to the `guru` table or profile table.

B. Supabase Database Schema Analysis:
   - Check existing schema and migrations (look in `supabase/migrations/`, `types/`, `lib/supabase`, or use supabase MCP tools like `list_tables` / `list_migrations` if applicable, or inspect TypeScript schema types).
   - Determine what tables exist for `guru`, `mata_pelajaran` / `mapel`, `kelas`, `jadwal_pelajaran` / `jadwal_kbm`, `guru_mapel`, `guru_kelas`, etc.
   - The user explicitly authorized: "You are explicitly authorized to create and manage new relational tables in the Supabase database to support this mapping if current schema is insufficient."
   - Design the exact schema needed:
     * Does a teacher-to-subject and teacher-to-class mapping table already exist?
     * If not, design the relational schema (e.g., `guru_mapel`, `guru_kelas`, or `jadwal_mengajar` / `guru_pengampu` linking `guru_id`, `mapel_id`, `kelas_id`).
     * Provide exact SQL DDL scripts to create or populate these tables if needed, along with RLS policies and indexes.
     * Explain how the Jurnal form should query these tables so when Guru X opens the form, only their assigned Mata Pelajaran and Kelas appear in the dropdowns.

DELIVERABLE:
Write a thorough, structured report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m2_survey\handoff.md` with:
- Exact file paths & line numbers for Guru Jurnal form and dropdowns
- Current query logic vs recommended filtered query logic
- Complete SQL DDL / migration script design for relational tables
- Concrete step-by-step instructions for the worker agent.
Notify parent via `send_message` when done.
</USER_REQUEST>
