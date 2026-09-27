-- ==============================================================================
-- Migration: 20260927_sistem_blok_schema.sql
-- Description: Create public.sistem_blok table for managing blocked time periods
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sistem_blok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    nama_kegiatan TEXT NOT NULL,
    deskripsi TEXT DEFAULT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sistem_blok_sekolah_id ON public.sistem_blok(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_sistem_blok_dates ON public.sistem_blok(tanggal_mulai, tanggal_selesai);

ALTER TABLE public.sistem_blok ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'setup_tenant_table_policies') THEN
    CALL public.setup_tenant_table_policies('sistem_blok');
  ELSE
    DROP POLICY IF EXISTS "sistem_blok_tenant_select_policy" ON public.sistem_blok;
    CREATE POLICY "sistem_blok_tenant_select_policy" ON public.sistem_blok FOR SELECT
      USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

    DROP POLICY IF EXISTS "sistem_blok_tenant_insert_policy" ON public.sistem_blok;
    CREATE POLICY "sistem_blok_tenant_insert_policy" ON public.sistem_blok FOR INSERT
      WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

    DROP POLICY IF EXISTS "sistem_blok_tenant_update_policy" ON public.sistem_blok;
    CREATE POLICY "sistem_blok_tenant_update_policy" ON public.sistem_blok FOR UPDATE
      USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))
      WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

    DROP POLICY IF EXISTS "sistem_blok_tenant_delete_policy" ON public.sistem_blok;
    CREATE POLICY "sistem_blok_tenant_delete_policy" ON public.sistem_blok FOR DELETE
      USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));
  END IF;
END $$;
