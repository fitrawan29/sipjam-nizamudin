-- ==============================================================================
-- Migration: 20260925_cascade_profile_updates.sql
-- Description: Update update_user_profile to cascade nama and username changes
-- to other tables that rely on string matching instead of UUIDs.
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
    IF v_target_user.id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Pengguna tidak ditemukan.');
    END IF;

    -- 3. Authorization check
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
    IF p_username IS NOT NULL AND trim(p_username) <> '' AND trim(p_username) <> v_target_user.username THEN
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
        password = CASE WHEN p_password IS NOT NULL AND trim(p_password) <> '' THEN trim(p_password) ELSE password END,
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

        BEGIN
            UPDATE public.laporan_piket 
            SET nama_guru = v_new_nama 
            WHERE nama_guru = v_old_nama;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN
            UPDATE public.jadwal_pelajaran 
            SET nama_guru = v_new_nama, username_guru = v_new_username 
            WHERE nama_guru = v_old_nama OR username_guru = v_old_username;
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Profil berhasil diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
