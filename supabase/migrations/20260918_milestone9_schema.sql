-- ==============================================================================
-- Migration: 20260918_milestone9_schema.sql
-- Description: Milestone 9 Database Schema for Attendance Rules, Realtime Chat, & Read Tracking
--
-- 1. Alter public.pengaturan:
--    - jam_pulang_jumat TEXT DEFAULT '11:00'
--    - guru_hanya_mengajar TEXT DEFAULT '[]'
-- 2. Alter public.data_guru:
--    - wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE
-- 3. Create public.chat_messages (Realtime teacher-to-teacher chat):
--    - RLS enabled with tenant isolation policies
--    - Safe addition to publication supabase_realtime
-- 4. Create public.pengumuman_dibaca (Broadcast announcement read tracking):
--    - RLS enabled with tenant isolation policies
-- 5. Grant permissions to anon, authenticated, service_role
-- ==============================================================================

-- ==============================================================================
-- PART 1: Alter public.pengaturan
-- ==============================================================================
ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS jam_pulang_jumat TEXT DEFAULT '11:00';
ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS guru_hanya_mengajar TEXT DEFAULT '[]';

-- ==============================================================================
-- PART 2: Alter public.data_guru
-- ==============================================================================
ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE;

-- ==============================================================================
-- PART 3: Table public.chat_messages
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    sender_id TEXT NOT NULL,
    sender_nama TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    recipient_nama TEXT NOT NULL,
    pesan TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sekolah ON public.chat_messages(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_recipient ON public.chat_messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_tenant_select_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_tenant_select_policy" ON public.chat_messages FOR SELECT
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "chat_messages_tenant_insert_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_tenant_insert_policy" ON public.chat_messages FOR INSERT
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "chat_messages_tenant_update_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_tenant_update_policy" ON public.chat_messages FOR UPDATE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "chat_messages_tenant_delete_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_tenant_delete_policy" ON public.chat_messages FOR DELETE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

-- Safe addition to publication supabase_realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
END $$;

-- ==============================================================================
-- PART 4: Table public.pengumuman_dibaca
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pengumuman_dibaca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    pengumuman_id UUID NOT NULL REFERENCES public.pengumuman(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_pengumuman_dibaca_user UNIQUE(sekolah_id, pengumuman_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pengumuman_dibaca_sekolah ON public.pengumuman_dibaca(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_pengumuman_dibaca_user ON public.pengumuman_dibaca(user_id);
CREATE INDEX IF NOT EXISTS idx_pengumuman_dibaca_pengumuman ON public.pengumuman_dibaca(pengumuman_id);

ALTER TABLE public.pengumuman_dibaca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pengumuman_dibaca_tenant_select_policy" ON public.pengumuman_dibaca;
CREATE POLICY "pengumuman_dibaca_tenant_select_policy" ON public.pengumuman_dibaca FOR SELECT
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "pengumuman_dibaca_tenant_insert_policy" ON public.pengumuman_dibaca;
CREATE POLICY "pengumuman_dibaca_tenant_insert_policy" ON public.pengumuman_dibaca FOR INSERT
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "pengumuman_dibaca_tenant_update_policy" ON public.pengumuman_dibaca;
CREATE POLICY "pengumuman_dibaca_tenant_update_policy" ON public.pengumuman_dibaca FOR UPDATE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "pengumuman_dibaca_tenant_delete_policy" ON public.pengumuman_dibaca;
CREATE POLICY "pengumuman_dibaca_tenant_delete_policy" ON public.pengumuman_dibaca FOR DELETE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

-- ==============================================================================
-- PART 5: Grant Privileges
-- ==============================================================================
GRANT ALL ON TABLE public.chat_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pengumuman_dibaca TO anon, authenticated, service_role;
