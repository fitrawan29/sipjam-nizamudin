## 2026-09-17T10:38:14Z

You are worker_m1_db, a dedicated database and backend worker.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1_db

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md before starting work.
Also read PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md and survey reports at:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r1r2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r3r4\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r5r6\handoff.md

FILE WRITE OWNERSHIP:
You exclusively own:
- supabase/migrations/20260917_comprehensive_features.sql
- src/types/database.ts
- scripts/ or execution scripts for database verification if needed

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

YOUR MISSION (Milestone 1 - Database Foundations & Migrations):
1. Write `supabase/migrations/20260917_comprehensive_features.sql` containing:
   - Table `public.wali_kelas`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE, kelas TEXT NOT NULL, guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL, nama_guru TEXT NOT NULL, nip TEXT, tahun_ajaran TEXT DEFAULT '2024/2025', created_at TIMESTAMPTZ DEFAULT now(), CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas))`
   - Table `public.absensi`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE, tanggal DATE NOT NULL, kelas TEXT NOT NULL, siswa_id TEXT, nisn TEXT NOT NULL, nama_siswa TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')), keterangan TEXT, sumber_perubahan TEXT NOT NULL, diubah_oleh TEXT NOT NULL, log_perubahan TEXT[] DEFAULT ARRAY[]::TEXT[], created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), CONSTRAINT uq_absensi_siswa_hari UNIQUE(sekolah_id, tanggal, nisn))`
   - Trigger function `sync_absensi_to_jurnal()` and trigger `trg_sync_absensi_to_jurnal`:
     When `absensi` is inserted or updated, find all `jurnal_pembelajaran` records where `sekolah_id = NEW.sekolah_id AND tanggal = NEW.tanggal AND kelas = NEW.kelas`. If `absensi_siswa` JSON exists, update the key `NEW.nisn` to `NEW.status`.
   - Tables for Gradebook:
     - `public.tujuan_pembelajaran`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE, guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL, nama_guru TEXT NOT NULL, mapel_id TEXT, nama_mapel TEXT NOT NULL, kelas TEXT NOT NULL, kode_tp TEXT NOT NULL, deskripsi TEXT NOT NULL, semester TEXT NOT NULL DEFAULT 'Ganjil', tahun_ajaran TEXT NOT NULL DEFAULT '2024/2025', urutan INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), CONSTRAINT uq_tp_guru_mapel_kelas_kode UNIQUE (sekolah_id, nama_guru, nama_mapel, kelas, kode_tp, semester, tahun_ajaran))`
     - `public.asesmen_kolom`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE, tp_id UUID NOT NULL REFERENCES public.tujuan_pembelajaran(id) ON DELETE CASCADE, kategori TEXT NOT NULL CHECK (kategori IN ('Diagnostik', 'Formatif', 'Sumatif')), nama TEXT NOT NULL, bobot NUMERIC DEFAULT 1, urutan INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`
     - `public.nilai_siswa`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE, tp_id UUID NOT NULL REFERENCES public.tujuan_pembelajaran(id) ON DELETE CASCADE, asesmen_id UUID NOT NULL REFERENCES public.asesmen_kolom(id) ON DELETE CASCADE, siswa_id TEXT, nisn TEXT NOT NULL, nama_siswa TEXT NOT NULL, kelas TEXT NOT NULL, mapel TEXT NOT NULL, nama_guru TEXT NOT NULL, nilai NUMERIC(5, 2) CHECK (nilai >= 0 AND nilai <= 100), catatan TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), CONSTRAINT uq_nilai_siswa_asesmen UNIQUE (sekolah_id, asesmen_id, nisn))`
   - Table `public.push_subscriptions`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE, user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, user_nama TEXT, user_role TEXT, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, user_agent TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`
   - Add columns to `users`: `avatar TEXT` (if not exists).
   - Add columns to `pengaturan`: `aturan_kehadiran_guru TEXT DEFAULT 'Semua_Hari'`, `email_tujuan_upload TEXT` (if not exists).
   - Security Definer RPC: `update_user_profile(p_user_id UUID, p_avatar TEXT, p_username TEXT, p_password TEXT)` so teachers and admins can update their profile safely.
   - Row Level Security (RLS) enabled and tenant policies created for all new tables with `is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id()`.

2. Apply the SQL migration to the Supabase database. You can execute SQL directly using Supabase tools (e.g. `call_mcp_tool(ServerName="supabase", ToolName="execute_sql", Arguments={query: "..."})`) or through node/ts scripts. Verify that all tables, columns, indexes, and triggers exist.
3. Update `src/types/database.ts` with type definitions for all new tables and columns.
4. Run `npx tsc --noEmit` and ensure zero TypeScript errors.
5. Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1_db\handoff.md`. Include SQL executed, verification queries, TypeScript build status, and send a message back to orchestrator_9 when done.
