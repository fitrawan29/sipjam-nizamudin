-- ==============================================================================
-- Migration: 20260917_security_hardening.sql
-- Description: Security Hardening for Milestone 7
-- 
-- 1. HARDEN SECURITY DEFINER RPC update_user_profile:
--    - Verify caller authentication via public.get_auth_user_id().
--    - Strictly verify caller authorization:
--      * Callers can only update their own user profile (v_caller_id = p_user_id).
--      * Non-superadmin callers cannot modify Superadmin accounts.
--      * Superadmins can update any account.
--      * Role remains strictly immutable.
--    - Verify user exists and username uniqueness.
--
-- 2. HARDEN public.push_subscriptions RLS POLICIES:
--    - Remove permissive 'OR sekolah_id IS NULL' for tenant users.
--    - Restrict NULL sekolah_id subscriptions strictly to Superadmin.
--    - Enforce tenant isolation where sekolah_id = public.get_auth_user_sekolah_id().
--
-- 3. HARDEN public.wali_kelas RLS MUTATION POLICIES:
--    - Enforce role check: Only users with role 'Admin' or Superadmin can mutate
--      (INSERT, UPDATE, DELETE) homeroom assignments.
-- ==============================================================================

-- ==============================================================================
-- PART 1: Helper Function get_auth_user_id()
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID AS $$
DECLARE
  v_raw TEXT;
  v_user_id UUID;
BEGIN
  -- 1. Check auth.uid() (Supabase Auth)
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;

  -- 2. Check x-user-id header against public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-id';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      v_user_id := trim(v_raw)::uuid;
      IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
        RETURN v_user_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- PART 2: Harden update_user_profile RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_user_profile(
    p_user_id UUID,
    p_avatar TEXT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_password TEXT DEFAULT NULL,
    p_nama TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_caller_id UUID;
    v_is_sa BOOLEAN;
    v_target_user RECORD;
    v_existing_id UUID;
BEGIN
    -- 1. Require authentication
    v_caller_id := public.get_auth_user_id();
    IF v_caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Autentikasi diperlukan untuk memperbarui profil.');
    END IF;

    -- 2. Verify target user exists
    SELECT * INTO v_target_user FROM public.users WHERE id = p_user_id;
    IF v_target_user.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Pengguna tidak ditemukan.');
    END IF;

    -- 3. Authorization check: caller must be Superadmin or updating their own account
    v_is_sa := public.is_superadmin();
    IF NOT v_is_sa THEN
        -- Prevent arbitrary takeover of superadmin accounts
        IF v_target_user.role = 'Superadmin' THEN
            RETURN json_build_object('success', false, 'message', 'Tidak memiliki izin untuk memodifikasi akun Superadmin.');
        END IF;

        -- Prevent modifying other users' accounts
        IF v_caller_id <> p_user_id THEN
            RETURN json_build_object('success', false, 'message', 'Anda hanya diizinkan untuk memperbarui profil akun Anda sendiri.');
        END IF;
    END IF;

    -- 4. Check username uniqueness if changed
    IF p_username IS NOT NULL AND trim(p_username) <> '' THEN
        SELECT id INTO v_existing_id
        FROM public.users
        WHERE username = trim(p_username) AND id <> p_user_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            RETURN json_build_object('success', false, 'message', 'Username sudah digunakan oleh akun lain.');
        END IF;
    END IF;

    -- 5. Update user profile (role remains strictly untouched)
    UPDATE public.users
    SET 
        avatar = COALESCE(NULLIF(trim(p_avatar), ''), avatar),
        username = CASE WHEN p_username IS NOT NULL AND trim(p_username) <> '' THEN trim(p_username) ELSE username END,
        password = CASE WHEN p_password IS NOT NULL AND trim(p_password) <> '' THEN trim(p_password) ELSE password END,
        nama = CASE WHEN p_nama IS NOT NULL AND trim(p_nama) <> '' THEN trim(p_nama) ELSE nama END
    WHERE id = p_user_id;

    RETURN json_build_object('success', true, 'message', 'Profil berhasil diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- PART 3: Harden push_subscriptions RLS Policies (Remove permissive NULL fallback)
-- ==============================================================================
DROP POLICY IF EXISTS "push_subscriptions_tenant_select_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_tenant_select_policy" ON public.push_subscriptions FOR SELECT
USING (
    is_superadmin() 
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "push_subscriptions_tenant_insert_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_tenant_insert_policy" ON public.push_subscriptions FOR INSERT
WITH CHECK (
    is_superadmin() 
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "push_subscriptions_tenant_update_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_tenant_update_policy" ON public.push_subscriptions FOR UPDATE
USING (
    is_superadmin() 
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
)
WITH CHECK (
    is_superadmin() 
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "push_subscriptions_tenant_delete_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_tenant_delete_policy" ON public.push_subscriptions FOR DELETE
USING (
    is_superadmin() 
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
);

-- ==============================================================================
-- PART 4: Harden wali_kelas Mutation Policies (Enforce Admin/Superadmin role)
-- ==============================================================================
DROP POLICY IF EXISTS "wali_kelas_tenant_select_policy" ON public.wali_kelas;
CREATE POLICY "wali_kelas_tenant_select_policy" ON public.wali_kelas FOR SELECT
USING (
    is_superadmin() 
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "wali_kelas_tenant_insert_policy" ON public.wali_kelas;
CREATE POLICY "wali_kelas_tenant_insert_policy" ON public.wali_kelas FOR INSERT
WITH CHECK (
    is_superadmin() 
    OR (
        public.get_auth_user_role() = 'Admin' 
        AND public.get_auth_user_sekolah_id() IS NOT NULL 
        AND sekolah_id = public.get_auth_user_sekolah_id()
    )
);

DROP POLICY IF EXISTS "wali_kelas_tenant_update_policy" ON public.wali_kelas;
CREATE POLICY "wali_kelas_tenant_update_policy" ON public.wali_kelas FOR UPDATE
USING (
    is_superadmin() 
    OR (
        public.get_auth_user_role() = 'Admin' 
        AND public.get_auth_user_sekolah_id() IS NOT NULL 
        AND sekolah_id = public.get_auth_user_sekolah_id()
    )
)
WITH CHECK (
    is_superadmin() 
    OR (
        public.get_auth_user_role() = 'Admin' 
        AND public.get_auth_user_sekolah_id() IS NOT NULL 
        AND sekolah_id = public.get_auth_user_sekolah_id()
    )
);

DROP POLICY IF EXISTS "wali_kelas_tenant_delete_policy" ON public.wali_kelas;
CREATE POLICY "wali_kelas_tenant_delete_policy" ON public.wali_kelas FOR DELETE
USING (
    is_superadmin() 
    OR (
        public.get_auth_user_role() = 'Admin' 
        AND public.get_auth_user_sekolah_id() IS NOT NULL 
        AND sekolah_id = public.get_auth_user_sekolah_id()
    )
);

-- Grants
GRANT EXECUTE ON FUNCTION public.get_auth_user_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
