-- ==============================================================================
-- Migration: 20261102_restrict_master_data_to_admin.sql
-- Description: Restrict Master Data mutation (INSERT, UPDATE, DELETE) strictly to
--              users with role Admin or Superadmin.
--              Non-admin users (Guru, Siswa, Piket, etc.) are strictly prohibited
--              from modifying master data (siswa, guru, jadwal, kelas, mapel).
-- ==============================================================================

-- Helper procedure to apply admin-only mutation policies on master tables
CREATE OR REPLACE PROCEDURE public.setup_master_data_admin_policies(p_table TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    -- 1. SELECT policy: Allow tenant users to read master data (for teaching, attendance, reporting)
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_select_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_select_policy" ON public.%I FOR SELECT ' ||
        'USING (is_superadmin() OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id()) OR public.get_auth_user_sekolah_id() IS NULL)',
        p_table, p_table
    );

    -- 2. INSERT policy: Strictly Admin & Superadmin only
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_insert_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_insert_policy" ON public.%I FOR INSERT ' ||
        'WITH CHECK (is_superadmin() OR (public.get_auth_user_role() = ''Admin'' AND public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id()))',
        p_table, p_table
    );

    -- 3. UPDATE policy: Strictly Admin & Superadmin only
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_update_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_update_policy" ON public.%I FOR UPDATE ' ||
        'USING (is_superadmin() OR (public.get_auth_user_role() = ''Admin'' AND public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())) ' ||
        'WITH CHECK (is_superadmin() OR (public.get_auth_user_role() = ''Admin'' AND public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id()))',
        p_table, p_table
    );

    -- 4. DELETE policy: Strictly Admin & Superadmin only
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_delete_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_delete_policy" ON public.%I FOR DELETE ' ||
        'USING (is_superadmin() OR (public.get_auth_user_role() = ''Admin'' AND public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id()))',
        p_table, p_table
    );
END;
$$;

-- Apply to all master data tables
CALL public.setup_master_data_admin_policies('data_siswa');
CALL public.setup_master_data_admin_policies('data_guru');
CALL public.setup_master_data_admin_policies('jadwal_pelajaran');
CALL public.setup_master_data_admin_policies('data_mapel');
CALL public.setup_master_data_admin_policies('guru_mapel');
CALL public.setup_master_data_admin_policies('wali_kelas');
CALL public.setup_master_data_admin_policies('kalender_pendidikan');
CALL public.setup_master_data_admin_policies('sistem_blok');

-- Cleanup procedure
DROP PROCEDURE IF EXISTS public.setup_master_data_admin_policies(TEXT);
