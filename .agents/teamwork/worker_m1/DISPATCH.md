# Dispatch for worker_m1

- **Role**: Worker for Milestone 1 — Data Layer (DB Migration & TypeScript Types)
- **Working Directory**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1
- **Authoritative Request**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see entry at 2026-10-10T22:56:05Z)
- **Project Blueprint**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- **Reference Investigation**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md
- **Exclusive Write Ownership**:
  1. `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`
  2. `src/types/database.ts`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks
1. Create canonical SQL migration file `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`:
   - Table `public.capaian_pembelajaran` with columns: `id`, `sekolah_id`, `guru_mapel_id`, `nama_mapel`, `kelas`, `semester`, `tahun_ajaran`, `kode_cp`, `deskripsi`, `urutan`, timestamps.
   - Indexes: `(sekolah_id, nama_mapel, kelas)`, `(guru_mapel_id)`, `(sekolah_id, semester, tahun_ajaran)`.
   - `cp_id UUID REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL` on `public.tujuan_pembelajaran`.
   - `keterangan TEXT` on `public.asesmen_kolom`.
   - Partial unique index `uq_asesmen_tp_diagnostik` on `public.asesmen_kolom(tp_id) WHERE (kategori = 'Diagnostik')`.
   - RLS policies for `capaian_pembelajaran` with permissive select/modify policies for authenticated/anon.
   - Idempotent seed for `bobot_nilai_mapel` in `public.pengaturan`.
2. Update `src/types/database.ts`:
   - Define `capaian_pembelajaran` table in `Database['public']['Tables']` with Row, Insert, Update, and Relationships (linking to `guru_mapel` and `sekolah`).
   - Add `cp_id` to `tujuan_pembelajaran` Row, Insert, Update, and add relationship to `capaian_pembelajaran`.
   - Add `keterangan: string | null` to `asesmen_kolom` Row, Insert, Update.
   - Export type aliases: `CapaianPembelajaran`, `CapaianPembelajaranInsert`, `CapaianPembelajaranUpdate`.
   - Export `BobotNilaiMapel` interface and `DEFAULT_BOBOT_NILAI_MAPEL` constant.
3. Clean up/remove duplicate untracked draft `migrations/add_cp_and_gradebook_v2.sql` if needed so the tree is clean.
4. Verify changes follow Ponytail principle (minimal schema diff, backward compatibility).
5. Output detailed report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\handoff.md`.

## 2026-10-11T00:56:20Z
Message from Orchestrator:
You are Worker for Milestone 1 (Data Layer: Database Migration & TypeScript Types).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1
Read instructions in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\DISPATCH.md
Authoritative request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see entry at 2026-10-10T22:56:05Z)
Project Blueprint: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
Survey findings: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md

Exclusive Write Ownership:
1. `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`
2. `src/types/database.ts`

