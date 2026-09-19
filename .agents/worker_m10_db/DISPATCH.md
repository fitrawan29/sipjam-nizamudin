## 2026-09-19T01:22:06Z
You are worker_m10_db. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m10_db.
Read the authoritative user request at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md (specifically under ## 2026-09-19T01:13:28Z).
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md for architecture and interface contracts.
Read survey reports:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r2\survey_r2.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r3r4\survey_r3r4.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You EXCLUSIVELY own:
1. `supabase/migrations/20260919_milestone10_schema.sql`
2. `src/types/database.ts`

Tasks:
1. Create `supabase/migrations/20260919_milestone10_schema.sql`:
   - Create table `public.syarat_perangkat_pembelajaran`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE`
     - `nama_mapel TEXT NOT NULL DEFAULT 'Semua Mapel'`
     - `kode_dokumen TEXT NOT NULL`
     - `nama_dokumen TEXT NOT NULL`
     - `format_dokumen TEXT NOT NULL DEFAULT 'PDF, DOCX'`
     - `wajib BOOLEAN NOT NULL DEFAULT TRUE`
     - `urutan INTEGER NOT NULL DEFAULT 0`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
     - Indexes on `(sekolah_id, nama_mapel)` and `(sekolah_id, kode_dokumen)`
     - Enable RLS with policies:
       - Select: authenticated users can view requirements for their `sekolah_id`
       - Insert/Update/Delete: authenticated users with admin/superadmin role (or matching `sekolah_id`) can manage requirements
   - Add column `catatan_admin TEXT DEFAULT NULL` to tables if not exists:
     - `public.presensi_guru`
     - `public.jurnal_pembelajaran`
     - `public.laporan_piket`
   - Seed default requirements for existing schools from `KURIKULUM_DOCS` (CP, ATP, RPE, Prota, Promes, RPM) with `nama_mapel = 'Semua Mapel'`.
2. Update `src/types/database.ts`:
   - Add TypeScript interface `SyaratPerangkatPembelajaran` and insert into `Database['public']['Tables']['syarat_perangkat_pembelajaran']`.
   - Update `PresensiGuru`, `JurnalPembelajaran`, and `LaporanPiket` table row/insert/update types to include `catatan_admin?: string | null`.
3. Verify type checking:
   - Run `npx tsc --noEmit` and ensure zero TypeScript errors.
4. Git commit & push (MANDATORY per GEMINI.md):
   - Check `git status`
   - `git add .`
   - `git commit -m "feat(m10): add syarat_perangkat_pembelajaran table and catatan_admin rejection columns"`
   - `git push origin main` (or active branch)
5. Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m10_db\handoff.md` and notify parent via `send_message`.
