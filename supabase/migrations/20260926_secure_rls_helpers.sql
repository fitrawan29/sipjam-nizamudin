ALTER TABLE public.users ADD COLUMN IF NOT EXISTS session_token UUID DEFAULT gen_random_uuid();

CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  nama TEXT,
  role TEXT,
  sekolah_id UUID,
  session_token UUID
) AS $$
DECLARE
  v_user RECORD;
BEGIN
  UPDATE public.users 
  SET session_token = gen_random_uuid(),
      password = CASE 
        WHEN password = p_password THEN extensions.crypt(p_password, extensions.gen_salt('bf'))
        ELSE password
      END
  WHERE public.users.username = trim(p_username) 
    AND (password = extensions.crypt(p_password, password) OR password = p_password)
  RETURNING public.users.id, public.users.username, public.users.nama, public.users.role, public.users.sekolah_id, public.users.session_token INTO v_user;
  
  IF FOUND THEN
    id := v_user.id;
    username := v_user.username;
    nama := v_user.nama;
    role := v_user.role;
    sekolah_id := v_user.sekolah_id;
    session_token := v_user.session_token;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID AS $$
DECLARE
  v_raw TEXT;
  v_user_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;

  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-session-token';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      SELECT public.users.id INTO v_user_id FROM public.users WHERE public.users.session_token = v_raw::uuid;
      IF v_user_id IS NOT NULL THEN
        RETURN v_user_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_raw TEXT;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    v_raw := current_setting('request.headers', true)::json->>'x-user-role';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      RETURN v_raw;
    END IF;
    RETURN 'Superadmin';
  END IF;

  BEGIN
    v_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-session-token';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      SELECT public.users.role INTO v_role FROM public.users WHERE public.users.session_token = v_raw::uuid;
      IF v_role IS NOT NULL THEN
        RETURN v_role;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN 'Guest';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_auth_user_sekolah_id()
RETURNS UUID AS $$
DECLARE
  v_sekolah_id UUID;
  v_raw TEXT;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    v_raw := current_setting('request.headers', true)::json->>'x-sekolah-id';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      RETURN v_raw::uuid;
    END IF;
    RETURN NULL;
  END IF;

  BEGIN
    v_raw := current_setting('request.jwt.claim.sekolah_id', true);
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-session-token';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      SELECT public.users.sekolah_id INTO v_sekolah_id FROM public.users WHERE public.users.session_token = v_raw::uuid;
      IF v_sekolah_id IS NOT NULL THEN
        RETURN v_sekolah_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
  v_raw TEXT;
  v_db_role TEXT;
BEGIN
  -- Service role always has superadmin privileges
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN TRUE;
  END IF;

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

  -- 4. Check x-session-token matching a Superadmin in public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-session-token';
    IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
      SELECT u.role INTO v_db_role
      FROM public.users u
      WHERE u.session_token = v_raw::uuid AND u.sekolah_id IS NULL
      LIMIT 1;

      IF v_db_role = 'Superadmin' THEN
        RETURN TRUE;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. NEVER fall back to raw x-user-role or x-user-id header. Missing or invalid identity ALWAYS returns FALSE.
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO anon, authenticated, service_role;

