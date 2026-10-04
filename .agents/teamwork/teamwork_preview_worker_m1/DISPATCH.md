# Dispatch: Worker M1 (Database Migration & Types)

## Role
You are a Worker agent (`teamwork_preview_worker`).

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m1`

## Reference Files
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md`
- Survey 1 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md`
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Exclusive File Ownership
You exclusively own and may edit/create:
1. `supabase/migrations/20261004_add_mode_presensi_siswa_to_sekolah.sql`
2. `src/types/database.ts`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks
1. Create the migration file `supabase/migrations/20261004_add_mode_presensi_siswa_to_sekolah.sql`:
   ```sql
   -- 1. Add mode_presensi_siswa column with default 'qr'
   ALTER TABLE public.sekolah 
     ADD COLUMN IF NOT EXISTS mode_presensi_siswa TEXT DEFAULT 'qr';

   -- 2. Backfill existing rows if any are null
   UPDATE public.sekolah 
     SET mode_presensi_siswa = 'qr' 
     WHERE mode_presensi_siswa IS NULL;

   -- 3. Enforce NOT NULL
   ALTER TABLE public.sekolah 
     ALTER COLUMN mode_presensi_siswa SET NOT NULL;

   -- 4. Add check constraint
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 
       FROM pg_constraint 
       WHERE conname = 'sekolah_mode_presensi_siswa_check'
     ) THEN
       ALTER TABLE public.sekolah 
         ADD CONSTRAINT sekolah_mode_presensi_siswa_check 
         CHECK (mode_presensi_siswa IN ('qr', 'manual'));
     END IF;
   END $$;
   ```
2. Apply the migration using Supabase MCP tool (`apply_migration` or `execute_sql` on project `jicvvqxjyzntdrccnuyz`).
3. Verify that the column and check constraint are active in Supabase.
4. Update `src/types/database.ts`:
   - In `Tables['sekolah']['Row']`: add `mode_presensi_siswa: 'qr' | 'manual' | string`
   - In `Tables['sekolah']['Insert']`: add `mode_presensi_siswa?: 'qr' | 'manual' | string`
   - In `Tables['sekolah']['Update']`: add `mode_presensi_siswa?: 'qr' | 'manual' | string`
   - Export type `export type ModePresensiSiswa = 'qr' | 'manual';`
5. Run verification:
   - Run `npx tsc --noEmit` and ensure 0 errors.

## Deliverable
Write your completion report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m1\handoff.md`
Include build/type check results and DB verification query results.
Then send a completion message back.


## 2026-10-04T01:23:11Z
From: 60f11d0f-3028-47d5-a4c0-af2902baf3f1
Content:
You are a Worker agent for Milestone M1 (Database Migration & Types).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m1
Read your task description in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m1\DISPATCH.md
Also read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
and PROJECT.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You exclusively own:
- supabase/migrations/20261004_add_mode_presensi_siswa_to_sekolah.sql
- src/types/database.ts

Implement the migration, apply it via Supabase MCP (or execute_sql on project jicvvqxjyzntdrccnuyz), update database.ts types, and run `npx tsc --noEmit` to verify 0 errors.
Write your handoff report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m1\handoff.md
Then send a completion message back.
