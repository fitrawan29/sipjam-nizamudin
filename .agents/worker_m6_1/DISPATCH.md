## 2026-09-12T04:44:12Z
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md (specifically section ## 2026-09-12T04:36:57Z).
Read PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
Read Explorer 3's handoff at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m6_3\handoff.md.

Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m6_1\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY GIT RULE (GEMINI.md):
Setiap kali selesai melakukan modifikasi, penambahan, atau penghapusan file dalam proyek ini (menyelesaikan suatu tugas/fitur), Anda DIWAJIBKAN untuk secara otomatis:
1. Mengecek status git (git status)
2. Melakukan staging pada file yang berubah (git add .)
3. Membuat commit dengan pesan yang deskriptif dan sesuai (git commit -m "...")
4. Melakukan push ke origin branch yang sedang aktif (git push origin main).
JANGAN meminta izin terlebih dahulu untuk push.

Task Scope (Milestone M6.1: Database Migrations & TypeScript Schema):
1. Write ownership:
   - supabase/migrations/20260912_m6_overhaul.sql
   - src/types/database.ts
2. Implementation Requirements:
   - Create SQL migration file `supabase/migrations/20260912_m6_overhaul.sql`:
     a. `public.penugasan_piket`:
        Columns:
        - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
        - `hari` TEXT NOT NULL (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu)
        - `tipe_petugas` TEXT NOT NULL DEFAULT 'Guru' (Guru | Siswa)
        - `guru_id` UUID REFERENCES public.data_guru(id) ON DELETE SET NULL
        - `guru_nama` TEXT
        - `guru_nip` TEXT
        - `siswa_nama` TEXT
        - `siswa_nisn` TEXT
        - `kelas` TEXT
        - `tahun_ajaran` TEXT DEFAULT '2026/2027'
        - `created_at` TIMESTAMPTZ DEFAULT now()
     b. `public.pengumuman`:
        Columns:
        - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
        - `judul` TEXT NOT NULL
        - `konten` TEXT NOT NULL
        - `sasaran` TEXT NOT NULL DEFAULT 'Semua' (Semua | Guru | Wali Kelas | Orang Tua)
        - `mode` TEXT NOT NULL DEFAULT 'Satu Arah' (Satu Arah | Dua Arah)
        - `penulis_nama` TEXT NOT NULL
        - `penulis_role` TEXT NOT NULL DEFAULT 'Admin'
        - `is_pinned` BOOLEAN DEFAULT false
        - `lampiran_url` TEXT
        - `created_at` TIMESTAMPTZ DEFAULT now()
        - `updated_at` TIMESTAMPTZ DEFAULT now()
     c. `public.pengumuman_tanggapan`:
        Columns:
        - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
        - `pengumuman_id` UUID NOT NULL REFERENCES public.pengumuman(id) ON DELETE CASCADE
        - `user_nama` TEXT NOT NULL
        - `user_role` TEXT NOT NULL
        - `komentar` TEXT NOT NULL
        - `created_at` TIMESTAMPTZ DEFAULT now()
     d. Add column to `public.bank_dokumen`:
        `ALTER TABLE public.bank_dokumen ADD COLUMN IF NOT EXISTS mapel TEXT;`
     e. Enable RLS and add public permissive policies (or authenticated policies matching existing tables in the project).
     f. Seed default `penugasan_piket` rows derived from `public.jadwal_piket` if any exist, to ensure immediate data availability.
   - Execute the migration on the live database using Supabase MCP tools (execute_sql or apply_migration) or execute via supabase client script.
   - Update `src/types/database.ts` with the new tables and types matching the database schema so TypeScript has full type safety.
   - Run `npx tsc --noEmit` and confirm exit code 0.
   - Run git status, git add ., git commit, git push origin main.

Deliver a complete handoff report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m6_1\handoff.md`
Maintain progress.md in your working directory.
When done, notify orchestrator via send_message with a summary and report path.
