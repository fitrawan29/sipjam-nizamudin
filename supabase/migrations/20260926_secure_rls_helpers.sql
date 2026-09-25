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
  SET session_token = gen_random_uuid() 
  WHERE public.users.username = trim(p_username) AND password = crypt(p_password, password)
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
      RETURN v_user_id;
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
      RETURN v_role;
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
      RETURN v_sekolah_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
