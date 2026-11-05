-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE SUPABASE POSTGREST
-- File: supabase/migrations/20261106_fix_update_user_profile_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST202: 
-- "Could not find the function public.update_user_profile(p_avatar, p_nama, p_password, p_user_id, p_username) in the schema cache"
--
-- PENYEBAB:
-- Fungsi RPC `update_user_profile` belum terdaftar pada schema cache PostgREST instance Supabase,
-- atau instance belum dimuat ulang setelah migrasi fitur.
--
-- PANDUAN EKSEKUSI DI SUPABASE SQL EDITOR:
-- 1. Buka Supabase Dashboard proyek Anda (https://supabase.com/dashboard/project/<project-ref>).
-- 2. Pada panel navigasi sebelah kiri, klik menu "SQL Editor".
-- 3. Klik tombol "+ New Query".
-- 4. Salin (copy) seluruh isi file script SQL ini dan tempel (paste) ke editor.
-- 5. Klik tombol "Run" (atau tekan Ctrl + Enter).
-- 6. Pastikan status menunjukkan "Success. No rows returned".
-- 7. Perintah `NOTIFY pgrst, 'reload schema';` di baris terakhir akan secara otomatis
--    merefresh PostgREST schema cache tanpa perlu me-restart instance database.
-- ============================================================================

-- 1. Pastikan ekstensi pgcrypto tersedia untuk hashing password
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Pastikan kolom avatar tersedia di tabel users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;
    END IF;
END $$;

-- 3. Buat atau perbarui fungsi RPC public.update_user_profile (SECURITY DEFINER)
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
        password = CASE 
            WHEN p_password IS NOT NULL AND trim(p_password) <> '' 
            THEN extensions.crypt(trim(p_password), extensions.gen_salt('bf')) 
            ELSE password 
        END,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

-- 4. Berikan izin eksekusi kepada peran yang relevan
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. Perintahkan PostgREST untuk memuat ulang skema cache secara instan
NOTIFY pgrst, 'reload schema';
