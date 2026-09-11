## 2026-09-11T13:03:19Z
You are Worker M2 implementing Milestone 2: Dynamic KBM Journal Filtering & Supabase Relational Mapping for sipjam-app.

CRITICAL INSTRUCTIONS & INTEGRITY WARNING:
- First read the authoritative user requirements in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md` (specifically ## 2026-09-11T12:54:07Z, Requirement R2).
- Also read the project specification in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`.
- Read the detailed survey, schema design, and query blueprint in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m2_survey\handoff.md`.
- Your working directory for coordination files is:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m2_kbm_schema`.
- Maintain `progress.md` and write your completion handoff report to:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m2_kbm_schema\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE & DATABASE OWNERSHIP:
You have exclusive write ownership of:
- Supabase Database relational execution (using supabase MCP tools: `execute_sql`, etc.)
- `supabase/migrations/20260911_guru_mapel_relational.sql` (create new migration file)
- `src/components/GuruJurnal.tsx`

Do NOT touch `AppScreen.tsx`, `layout.tsx`, `PrintHeader.tsx`, or `globals.css` (owned by other milestones).

IMPLEMENTATION REQUIREMENTS:
1. Database Schema & Migration:
   - Create migration file `supabase/migrations/20260911_guru_mapel_relational.sql`.
   - Use Supabase MCP tool `execute_sql` (or migration runner) to execute the SQL DDL on the Supabase project:
     * Create table `public.guru_mapel` (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `guru_id UUID REFERENCES public.data_guru(id) ON DELETE CASCADE`, `nip TEXT NOT NULL`, `nama_guru TEXT NOT NULL`, `mapel_id TEXT REFERENCES public.data_mapel(id) ON DELETE CASCADE`, `nama_mapel TEXT NOT NULL`, `mapel_singkat TEXT`, `kelas TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`, `CONSTRAINT uq_guru_mapel UNIQUE (nip, nama_mapel)`).
     * Create indexes on `nip`, `nama_guru`, `kelas`.
     * Enable RLS and add public read/write policies.
     * Seed `public.guru_mapel` by executing the seed INSERT from `data_guru` cross join unnested `mata_pelajaran` and `data_mapel` (verifying all 39 rows are seeded).
     * Create auto-sync trigger `trg_sync_guru_mapel` and function `sync_guru_mapel_from_data_guru()` on `data_guru`.
     * Create convenience view `public.guru_kelas`.
   - Query `public.guru_mapel` via `execute_sql` to verify rows are successfully seeded and count is 39.

2. Dynamic KBM Journal Form in `src/components/GuruJurnal.tsx`:
   - Update `fetchMasterData` to query `guru_mapel` filtered by the logged-in teacher (`user.username` matching `nip` or `user.nama` matching `nama_guru`).
   - If `user.role === 'Admin'`, allow full access to all mapel and kelas.
   - For teachers, populate `mapelList` only with the teacher's assigned subjects and `kelasList` only with the classes assigned to that teacher.
   - Implement cascading auto-sync: when a subject (e.g. `X Merdeka_B. Ing`) is selected, automatically set the corresponding `kelas` (`X Merdeka`).
   - Handle empty state gracefully if a teacher has no assignments (show informative guidance).

3. Verification:
   - Run `npm run build` to confirm TypeScript and Next.js compile cleanly with 0 errors.
   - Query `guru_mapel` in Supabase to confirm data integrity.
   - Document all changes, executed SQL, and verification output in your handoff report.
   - Notify parent via `send_message` when complete.
