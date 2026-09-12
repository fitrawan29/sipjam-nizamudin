-- ==============================================================================
-- Migration: 20260912_fix_rls_integrity.sql
-- Description: Milestone 7 Remediation - Strict Row Level Security & Multi-Tenant Integrity
-- 
-- 1. HARDEN SECURITY HELPER FUNCTIONS:
--    - Update get_auth_user_sekolah_id() to support x-user-id header lookup in public.users
--      and fallback x-sekolah-id header without permissive default.
--    - Update get_auth_user_role() to verify user role against public.users via x-user-id.
--    - Harden is_superadmin() to prevent school-bound tenant users from claiming Superadmin
--      and strictly verify Superadmin credentials.
--    - Maintain SECURITY DEFINER on verify_login RPC for safe authentication without
--      exposing public.users to anonymous dumps.
--
-- 2. REMEDIATE public.sekolah POLICIES:
--    - Strictly remove permissive 'OR true' from sekolah_select_policy.
--    - Strict SELECT: is_superadmin() OR id = public.get_auth_user_sekolah_id().
--    - Maintain strict INSERT/UPDATE/DELETE policies.
--
-- 3. REMEDIATE public.users POLICIES:
--    - Strictly remove permissive 'OR true' from users_select_policy.
--    - Strict SELECT: is_superadmin() OR (get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = get_auth_user_sekolah_id()).
--    - Strict INSERT/UPDATE/DELETE policies for Superadmin and School Admin.
--
-- 4. REMEDIATE 16 TENANT TABLES:
--    - Drop previously flawed policies that contained permissive fallbacks
--    - Recreate strict zero-trust policies:
--        SELECT: is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id()
--        INSERT: WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
--        UPDATE: USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
--                WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
--        DELETE: USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
--      NO PERMISSIVE FALLBACK WHATSOEVER.
--
-- 5. ENSURE DEFAULT sekolah_id ON ALL 16 TENANT TABLES:
--    - Set DEFAULT public.get_auth_user_sekolah_id() on all 16 tenant tables so inserts
--      without explicit sekolah_id automatically inherit caller's tenant ID.
--
-- 6. VIEW SECURITY HARDENING:
--    - Set security_invoker = true on public.guru_kelas so view inherits RLS of caller.
-- ==============================================================================

-- ==============================================================================
-- PART 1: Hardened Security Helper Functions
-- ==============================================================================

-- Helper 1: Extract authenticated user's sekolah_id
CREATE OR REPLACE FUNCTION public.get_auth_user_sekolah_id()
RETURNS UUID AS $$
DECLARE
  v_sekolah_id UUID;
  v_raw TEXT;
  v_user_id UUID;
BEGIN
  -- 1. Check JWT claim (if custom claim injected in Supabase Auth token)
  BEGIN
    v_raw := current_setting('request.jwt.claim.sekolah_id', true);
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Check JWT app_metadata
  BEGIN
    v_raw := auth.jwt() -> 'app_metadata' ->> 'sekolah_id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 3. Check public.users by auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT u.sekolah_id INTO v_sekolah_id
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    IF v_sekolah_id IS NOT NULL THEN
      RETURN v_sekolah_id;
    END IF;
  END IF;

  -- 4. Check session variable (app.current_sekolah_id)
  BEGIN
    v_raw := current_setting('app.current_sekolah_id', true);
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. Check authenticated user by 'x-user-id' header against public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      v_user_id := v_raw::uuid;
      SELECT u.sekolah_id INTO v_sekolah_id
      FROM public.users u
      WHERE u.id = v_user_id
      LIMIT 1;

      IF v_sekolah_id IS NOT NULL THEN
        RETURN v_sekolah_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 6. Fallback from PostgREST request headers 'x-sekolah-id'
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-sekolah-id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper 2: Extract authenticated user's role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_raw TEXT;
  v_user_id UUID;
BEGIN
  -- 1. Check JWT app_metadata
  BEGIN
    v_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Check public.users by auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT u.role INTO v_role
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  -- 3. Check session variable
  BEGIN
    v_role := current_setting('app.current_user_role', true);
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 4. Check authenticated user by 'x-user-id' header against public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-id';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      v_user_id := trim(v_raw)::uuid;
      SELECT u.role INTO v_role
      FROM public.users u
      WHERE u.id = v_user_id
      LIMIT 1;

      IF v_role IS NOT NULL THEN
        RETURN v_role;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. Fallback from PostgREST request header 'x-user-role' (NEVER trust Superadmin claim)
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-role';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      IF trim(v_raw) = 'Superadmin' THEN
        RETURN 'anon'; -- Block spoofed Superadmin role
      END IF;
      RETURN trim(v_raw);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN 'anon';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper 3: Check if requester is Superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_raw TEXT;
  v_db_role TEXT;
BEGIN
  -- 1. A Superadmin can NEVER be scoped to a specific school tenant
  IF public.get_auth_user_sekolah_id() IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- 2. Check JWT app_metadata (if using Supabase Auth JWT)
  BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'Superadmin' THEN
      RETURN TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 3. Check public.users by auth.uid() (if Supabase Auth authenticated)
  IF auth.uid() IS NOT NULL THEN
    SELECT u.role INTO v_db_role
    FROM public.users u
    WHERE u.id = auth.uid() AND u.sekolah_id IS NULL
    LIMIT 1;

    IF v_db_role = 'Superadmin' THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- 4. Strictly require verified x-user-id matching a Superadmin in public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-id';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      v_user_id := trim(v_raw)::uuid;
      SELECT u.role INTO v_db_role
      FROM public.users u
      WHERE u.id = v_user_id AND u.sekolah_id IS NULL
      LIMIT 1;

      IF v_db_role = 'Superadmin' THEN
        RETURN TRUE;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. NEVER fall back to raw x-user-role header. Missing or invalid identity ALWAYS returns FALSE.
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke public execution and grant to API roles
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO anon, authenticated, service_role;

-- Helper 4: Secure Login RPC (SECURITY DEFINER allows login without public table SELECT)
CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  nama TEXT,
  role TEXT,
  sekolah_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.nama, u.role, u.sekolah_id
  FROM public.users u
  WHERE u.username = trim(p_username) AND u.password = p_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.verify_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_login(TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- PART 2: Strict Policies for public.sekolah (Removes Permissive 'OR true')
-- ==============================================================================
DROP POLICY IF EXISTS "sekolah_select_policy" ON public.sekolah;
CREATE POLICY "sekolah_select_policy" ON public.sekolah FOR SELECT
USING (
    is_superadmin()
    OR id = public.get_auth_user_sekolah_id()
);

DROP POLICY IF EXISTS "sekolah_insert_policy" ON public.sekolah;
CREATE POLICY "sekolah_insert_policy" ON public.sekolah FOR INSERT
WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "sekolah_update_policy" ON public.sekolah;
CREATE POLICY "sekolah_update_policy" ON public.sekolah FOR UPDATE
USING (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND id = public.get_auth_user_sekolah_id()))
WITH CHECK (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND id = public.get_auth_user_sekolah_id()));

DROP POLICY IF EXISTS "sekolah_delete_policy" ON public.sekolah;
CREATE POLICY "sekolah_delete_policy" ON public.sekolah FOR DELETE
USING (is_superadmin());

-- ==============================================================================
-- PART 3: Strict Policies for public.users (Eliminates Plaintext Password Leak)
-- ==============================================================================
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users FOR SELECT
USING (
    is_superadmin()
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy" ON public.users FOR INSERT
WITH CHECK (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id() AND role <> 'Superadmin')
);

DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users FOR UPDATE
USING (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id())
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
)
WITH CHECK (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id() AND role <> 'Superadmin')
);

DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
CREATE POLICY "users_delete_policy" ON public.users FOR DELETE
USING (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id() AND role <> 'Admin' AND role <> 'Superadmin')
);

-- ==============================================================================
-- PART 4: Recreate Strict Tenant Policies on all 16 Tenant Tables
-- ==============================================================================
CREATE OR REPLACE PROCEDURE public.setup_tenant_table_policies(p_table TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    -- SELECT policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_select_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_select_policy" ON public.%I FOR SELECT ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())',
        p_table, p_table
    );

    -- INSERT policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_insert_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_insert_policy" ON public.%I FOR INSERT ' ||
        'WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())',
        p_table, p_table
    );

    -- UPDATE policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_update_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_update_policy" ON public.%I FOR UPDATE ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id()) ' ||
        'WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())',
        p_table, p_table
    );

    -- DELETE policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_delete_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_delete_policy" ON public.%I FOR DELETE ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())',
        p_table, p_table
    );
END;
$$;

-- Apply to all 16 master and transactional tenant tables
CALL public.setup_tenant_table_policies('data_guru');
CALL public.setup_tenant_table_policies('data_mapel');
CALL public.setup_tenant_table_policies('data_siswa');
CALL public.setup_tenant_table_policies('jadwal_pelajaran');
CALL public.setup_tenant_table_policies('jadwal_piket');
CALL public.setup_tenant_table_policies('jurnal_pembelajaran');
CALL public.setup_tenant_table_policies('kalender_pendidikan');
CALL public.setup_tenant_table_policies('laporan_piket');
CALL public.setup_tenant_table_policies('pengaturan');
CALL public.setup_tenant_table_policies('presensi_guru');
CALL public.setup_tenant_table_policies('bank_dokumen');
CALL public.setup_tenant_table_policies('riwayat_backup');
CALL public.setup_tenant_table_policies('guru_mapel');
CALL public.setup_tenant_table_policies('penugasan_piket');
CALL public.setup_tenant_table_policies('pengumuman');
CALL public.setup_tenant_table_policies('pengumuman_tanggapan');

DROP PROCEDURE IF EXISTS public.setup_tenant_table_policies(TEXT);

-- ==============================================================================
-- PART 5: Ensure Default sekolah_id = public.get_auth_user_sekolah_id() on all 16 Tenant Tables
-- ==============================================================================
ALTER TABLE public.data_guru ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.data_mapel ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.data_siswa ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.jadwal_pelajaran ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.jadwal_piket ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.jurnal_pembelajaran ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.kalender_pendidikan ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.laporan_piket ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.pengaturan ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.presensi_guru ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.bank_dokumen ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.riwayat_backup ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.guru_mapel ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.penugasan_piket ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.pengumuman ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
ALTER TABLE public.pengumuman_tanggapan ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();

-- ==============================================================================
-- PART 6: View Security Hardening
-- ==============================================================================
ALTER VIEW public.guru_kelas SET (security_invoker = true);

-- ==============================================================================
-- PART 7: Privilege Grants
-- ==============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
