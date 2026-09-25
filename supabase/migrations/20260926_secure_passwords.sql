-- Enable pgcrypto extension for hashing passwords
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash all existing plaintext passwords in public.users
-- Only update if it doesn't already look like a bcrypt hash (starts with $2a$ or $2b$)
UPDATE public.users 
SET password = crypt(password, gen_salt('bf'))
WHERE password NOT LIKE '$2%';

-- Fix verify_login RPC to use crypt()
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
  WHERE u.username = trim(p_username) AND u.password = crypt(p_password, u.password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix update_user_profile RPC to hash passwords when updated
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
    v_old_nama TEXT;
    v_old_username TEXT;
    v_new_nama TEXT;
    v_new_username TEXT;
BEGIN
    -- 1. Require authentication
    v_caller_id := public.get_auth_user_id();
    IF v_caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Autentikasi diperlukan untuk memperbarui profil.');
    END IF;

    -- 2. Verify target user exists
    SELECT * INTO v_target_user FROM public.users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Pengguna tidak ditemukan.');
    END IF;

    -- 3. Check permissions (Superadmin or self)
    v_is_sa := public.is_superadmin();
    IF NOT v_is_sa AND v_caller_id <> p_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Anda tidak memiliki akses untuk mengubah profil ini.');
    END IF;

    -- Store old values
    v_old_nama := v_target_user.nama;
    v_old_username := v_target_user.username;

    -- Determine new names
    v_new_nama := COALESCE(NULLIF(trim(p_nama), ''), v_old_nama);
    v_new_username := COALESCE(NULLIF(trim(p_username), ''), v_old_username);

    -- 4. Check username uniqueness if changed
    IF v_new_username <> v_old_username THEN
        SELECT id INTO v_existing_id FROM public.users WHERE username = v_new_username;
        IF FOUND THEN
            RETURN json_build_object('success', false, 'message', 'Username sudah digunakan oleh pengguna lain.');
        END IF;
    END IF;

    -- 5. Update user profile
    UPDATE public.users
    SET 
        avatar = COALESCE(NULLIF(trim(p_avatar), ''), avatar),
        username = v_new_username,
        password = CASE WHEN p_password IS NOT NULL AND trim(p_password) <> '' THEN crypt(trim(p_password), gen_salt('bf')) ELSE password END,
        nama = v_new_nama
    WHERE id = p_user_id;

    -- 6. Cascade changes to tables that use string names/usernames for links
    IF v_old_nama <> v_new_nama OR v_old_username <> v_new_username THEN
        BEGIN
            UPDATE public.data_guru 
            SET nama_guru = v_new_nama, username = v_new_username 
            WHERE nama_guru = v_old_nama OR username = v_old_username;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN
            UPDATE public.presensi_guru 
            SET nama_guru = v_new_nama 
            WHERE nama_guru = v_old_nama;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN
            UPDATE public.jurnal_pembelajaran 
            SET nama_guru = v_new_nama 
            WHERE nama_guru = v_old_nama;
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Profil berhasil diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
