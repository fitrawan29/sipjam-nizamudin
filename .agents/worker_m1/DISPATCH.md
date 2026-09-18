# Dispatch for Worker M1 (Database Schema & Types)

## Identity
- Role: Worker
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1
- Parent: orchestrator_10

## Scope: Milestone 1 - Database Schema & TypeScript Types
1. **Migration SQL**:
   Create `supabase/migrations/20260918_milestone9_schema.sql` with:
   - Columns in `public.pengaturan`:
     - `jam_pulang_jumat TEXT DEFAULT '11:00'`
     - `guru_hanya_mengajar TEXT DEFAULT '[]'`
   - Columns in `public.data_guru`:
     - `wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE`
   - Table `public.chat_messages`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE`
     - `sender_id TEXT NOT NULL`
     - `sender_nama TEXT NOT NULL`
     - `recipient_id TEXT NOT NULL`
     - `recipient_nama TEXT NOT NULL`
     - `pesan TEXT NOT NULL`
     - `is_read BOOLEAN DEFAULT FALSE`
     - `created_at TIMESTAMPTZ DEFAULT NOW()`
     - Enable RLS + Policies for authenticated users belonging to the same `sekolah_id`.
     - `ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;` (wrapped safely if already in publication).
   - Table `public.pengumuman_dibaca`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE`
     - `pengumuman_id UUID NOT NULL REFERENCES public.pengumuman(id) ON DELETE CASCADE`
     - `user_id TEXT NOT NULL`
     - `read_at TIMESTAMPTZ DEFAULT NOW()`
     - Enable RLS + Policies for authenticated users belonging to the same `sekolah_id`.
2. **Apply Migration**:
   Apply the SQL to Supabase.
3. **Update TypeScript Types**:
   Update `src/types/database.ts` so all new tables and columns are accurately typed in `Database['public']['Tables']`.
4. **Verification**:
   Run `npx tsc --noEmit` to ensure zero compilation errors.
5. **Git Workflow**:
   Run `git status`, `git add .`, `git commit -m "feat(db): add milestone 9 schema for attendance rules, chat, and read tracking"`, and `git push origin main`.

## References
Read:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_2\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_3\handoff.md`

## Output
Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1\handoff.md` and send a message when complete.

## 2026-09-18T08:05:03Z
You are Worker 1 for Milestone 1 (Database Schema & Types).
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1\DISPATCH.md before starting work.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Implement migration SQL file supabase/migrations/20260918_milestone9_schema.sql adding:
   - pengaturan columns: jam_pulang_jumat TEXT, guru_hanya_mengajar TEXT
   - data_guru column: wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE
   - chat_messages table with RLS and publication supabase_realtime
   - pengumuman_dibaca table with RLS
2. Apply the migration using Supabase MCP tools or migration runner / SQL execution.
3. Update src/types/database.ts to reflect all new tables and columns in Database['public']['Tables'].
4. Verify by running `npx tsc --noEmit`.
5. Comply with Git Workflow Rule: `git status`, `git add .`, `git commit -m "feat(db): add milestone 9 schema for attendance rules, chat, and read tracking"`, and `git push origin main`.
6. Write full handoff report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1\handoff.md and notify with send_message.

