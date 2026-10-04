# Dispatch: Explorer 1 (Database & Supabase Schema Survey)

## Role
You are an Explorer agent (`teamwork_preview_explorer`).

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_1`

## Reference Files
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Objective
Investigate the Supabase database schema, migration setup, and client types for:
1. `public.sekolah` table structure, existing columns, constraints, and how migrations are managed (e.g. `supabase/migrations/` or SQL files in repo, or Supabase MCP).
2. `public.presensi_siswa` table structure, existing columns (`siswa_id`, `sekolah_id`, `tanggal`, `jam_datang`, `jam_pulang`, `status`, etc.), constraints, and how records are inserted/updated.
3. How `sekolah_id` is propagated and enforced across multi-tenant queries.
4. Provide recommendations for the SQL migration to add `mode_presensi_siswa` (TEXT with check constraint or enum: `'qr'` | `'manual'`, default `'qr'`) to `public.sekolah`.

## Deliverable
Write your findings to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md`
Then call `send_message` to report completion.

## 2026-10-04T01:15:26Z
You are an Explorer agent.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_1
Read your task description in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_1\DISPATCH.md
Also read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Investigate the Supabase database schema, migration setup, and client types for:
1. public.sekolah table structure, existing columns, constraints, and how migrations are managed in this project.
2. public.presensi_siswa table structure, existing columns, constraints, and how records are inserted/updated.
3. How sekolah_id is propagated and enforced across multi-tenant queries.
4. Recommend the exact SQL migration to add mode_presensi_siswa (TEXT with check constraint or enum: 'qr' | 'manual', default 'qr') to public.sekolah.
Write your detailed report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md
Then send a completion message back.
