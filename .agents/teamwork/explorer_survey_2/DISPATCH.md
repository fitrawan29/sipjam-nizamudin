# Dispatch for explorer_survey_2

- **Role**: Explorer 2 — Database Migrations, Schema Design, Types & Admin Settings
- **Working Directory**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2
- **Authoritative Request**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see entry at 2026-10-10T22:56:05Z)
- **Parent Conversation ID**: 1f15a155-9441-412f-8adc-6ac5519d6f4d

## Objective
Analyze database migrations, existing schema, TypeScript definitions, and Admin settings:
1. Examine `supabase/migrations/` and `src/types/database.ts` to see current tables: `guru_mapel`, `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`, `pengaturan`.
2. Design the SQL migration for:
   - New table `capaian_pembelajaran` with columns: `id`, `sekolah_id`, `guru_mapel_id`, `kode_cp`, `deskripsi`, `semester`, `tahun_ajaran`, timestamps, foreign keys, RLS policies. Check if `tujuan_pembelajaran` needs `capaian_pembelajaran_id` foreign key.
   - Column `keterangan TEXT` in `asesmen_kolom`.
   - Settings key `bobot_nilai_mapel` in `pengaturan` (JSON string or jsonb: `{ kehadiran: number, formatif: number, sumatif: number }`).
3. Check how Admin/Superadmin settings for `pengaturan` are stored and read across the app (in `GradebookView.tsx` or other admin components).
4. Outline TypeScript type updates for `src/types/database.ts` (interfaces for `CapaianPembelajaran`, updated `AsesmenKolom`, `BobotNilaiMapel`).
5. Ensure Ponytail principle: minimal schema diff, minimal bloat, backward compatibility.
6. Output detailed report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md`.

## 2026-10-11T00:42:19Z
You are Explorer 2 (Database & Admin Settings Explorer) for project orchestrator_21.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2
Read your instructions in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\DISPATCH.md
Authoritative request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see entry at 2026-10-10T22:56:05Z)

Investigate database schema, migrations, types, and admin settings:
- Review `supabase/migrations/` and `src/types/database.ts`.
- Design the SQL migration for:
  1. `capaian_pembelajaran` table: id, sekolah_id, guru_mapel_id, kode_cp, deskripsi, semester, tahun_ajaran, timestamps. Check if `tujuan_pembelajaran` needs `capaian_pembelajaran_id` (nullable or required).
  2. Column `keterangan` (TEXT nullable) in `asesmen_kolom`.
  3. Settings row in `pengaturan` for `bobot_nilai_mapel` (JSON `{ kehadiran, formatif, sumatif }`).
- Check how admin weight settings form should be added in GradebookView (or admin panel) and validated (total = 100%).
- Detail the TypeScript type changes for `src/types/database.ts`.
- Write your complete findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md` and message the orchestrator when finished.
