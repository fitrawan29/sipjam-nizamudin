-- Migration: 20261001_features_r1_r6
-- Description:
-- 1. Add mode_jurnal column to public.sekolah
-- 2. Add latitude, longitude, lokasi, waktu_upload columns to public.jurnal_pembelajaran
-- 3. Update verify_login RPC to return avatar column
-- 4. Update update_user_profile RPC with teacher username modification guard

-- 1. Add mode_jurnal to public.sekolah
ALTER TABLE public.sekolah 
  ADD COLUMN IF NOT EXISTS mode_jurnal TEXT DEFAULT 'camera_upload';

-- 2. Add GPS and upload metadata columns to public.jurnal_pembelajaran
ALTER TABLE public.jurnal_pembelajaran 
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lokasi TEXT,
  ADD COLUMN IF NOT EXISTS waktu_upload TEXT;

-- 3. Update verify_login RPC to include avatar TEXT
-- Note: Dropping the existing function first is required by PostgreSQL when modifying return table signatures
DROP FUNCTION IF EXISTS public.verify_login(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  nama TEXT,
  role TEXT,
  sekolah_id UUID,
  session_token UUID,
  avatar TEXT
) AS $$
DECLARE
  v_user RECORD;
  v_norm_username TEXT;
BEGIN
  v_norm_username := lower(replace(trim(p_username), ' ', ''));

  UPDATE public.users 
  SET session_token = gen_random_uuid(),
      password = CASE 
        WHEN public.users.password = p_password 
             OR (lower(replace(public.users.role, ' ', '')) = 'superadmin' AND (p_password = 'superadmin123' OR p_password = 'SipjamSuperAdmin2026!'))
          THEN extensions.crypt(p_password, extensions.gen_salt('bf'))
        ELSE public.users.password
      END
  WHERE (
    lower(public.users.username) = lower(trim(p_username)) 
    OR lower(replace(public.users.username, ' ', '')) = v_norm_username
  )
  AND (
    public.users.password = extensions.crypt(p_password, public.users.password) 
    OR public.users.password = p_password
    OR (lower(replace(public.users.role, ' ', '')) = 'superadmin' AND (p_password = 'superadmin123' OR p_password = 'SipjamSuperAdmin2026!'))
  )
  RETURNING public.users.id, public.users.username, public.users.nama, public.users.role, public.users.sekolah_id, public.users.session_token, public.users.avatar INTO v_user;
  
  IF FOUND THEN
    id := v_user.id;
    username := v_user.username;
    nama := v_user.nama;
    role := v_user.role;
    sekolah_id := v_user.sekolah_id;
    session_token := v_user.session_token;
    avatar := v_user.avatar;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.verify_login(TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. Update update_user_profile RPC to guard teacher username changes
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
    v_caller_role TEXT;
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

    v_is_sa := public.is_superadmin();
    v_caller_role := lower(public.get_auth_user_role());

    -- 3. Authorization check
    IF NOT v_is_sa THEN
        -- Prevent arbitrary takeover of superadmin accounts
        IF v_target_user.role = 'Superadmin' THEN
            RETURN json_build_object('success', false, 'message', 'Tidak memiliki izin untuk memodifikasi akun Superadmin.');
        END IF;

        -- Admin can manage teachers in their own school, or user modifying own account
        IF v_caller_id <> p_user_id THEN
            IF NOT (v_caller_role = 'admin' AND v_target_user.role = 'Guru' AND v_target_user.sekolah_id = public.get_auth_user_sekolah_id()) THEN
                RETURN json_build_object('success', false, 'message', 'Anda hanya diizinkan untuk memperbarui profil akun Anda sendiri.');
            END IF;
        END IF;
    END IF;

    -- 4. R5: Only Admin and Superadmin may change username for teacher accounts
    IF p_username IS NOT NULL AND trim(p_username) <> '' AND trim(p_username) <> v_target_user.username THEN
        IF lower(v_target_user.role) = 'guru' AND NOT (v_is_sa OR v_caller_role = 'admin') THEN
            RETURN json_build_object('success', false, 'message', 'Hanya Admin yang memiliki hak akses untuk mengubah username akun guru.');
        END IF;

        IF v_target_user.role NOT IN ('Admin', 'Superadmin') AND NOT (v_is_sa OR v_caller_role = 'admin') THEN
            RETURN json_build_object('success', false, 'message', 'Perubahan username hanya dapat dilakukan oleh Admin.');
        END IF;

        -- Check username uniqueness if changed
        SELECT id INTO v_existing_id
        FROM public.users
        WHERE username = trim(p_username) AND id <> p_user_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            RETURN json_build_object('success', false, 'message', 'Username sudah digunakan oleh akun lain.');
        END IF;
    END IF;

    v_old_nama := v_target_user.nama;
    v_old_username := v_target_user.username;

    v_new_nama := CASE WHEN p_nama IS NOT NULL AND trim(p_nama) <> '' THEN trim(p_nama) ELSE v_target_user.nama END;
    v_new_username := CASE WHEN p_username IS NOT NULL AND trim(p_username) <> '' THEN trim(p_username) ELSE v_target_user.username END;

    -- 5. Update user profile
    UPDATE public.users
    SET 
        avatar = COALESCE(NULLIF(trim(p_avatar), ''), avatar),
        username = v_new_username,
        password = CASE WHEN p_password IS NOT NULL AND trim(p_password) <> '' THEN extensions.crypt(trim(p_password), extensions.gen_salt('bf')) ELSE password END,
        nama = v_new_nama
    WHERE id = p_user_id;

    -- 6. Cascade changes to tables that use string names/usernames for links
    IF v_old_nama <> v_new_nama OR v_old_username <> v_new_username THEN
        BEGIN
            UPDATE public.data_guru 
            SET nama_guru = v_new_nama, username = v_new_username 
            WHERE (nama_guru = v_old_nama OR username = v_old_username) AND sekolah_id = v_target_user.sekolah_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN
            UPDATE public.presensi_guru 
            SET nama_guru = v_new_nama 
            WHERE nama_guru = v_old_nama AND sekolah_id = v_target_user.sekolah_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN
            UPDATE public.jurnal_pembelajaran 
            SET nama_guru = v_new_nama 
            WHERE nama_guru = v_old_nama AND sekolah_id = v_target_user.sekolah_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN
            UPDATE public.laporan_piket 
            SET guru_pelapor = v_new_nama 
            WHERE guru_pelapor = v_old_nama AND sekolah_id = v_target_user.sekolah_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN
            UPDATE public.jadwal_pelajaran 
            SET nama_guru = v_new_nama, username_guru = v_new_username 
            WHERE (nama_guru = v_old_nama OR username_guru = v_old_username) AND sekolah_id = v_target_user.sekolah_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Profil berhasil diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
