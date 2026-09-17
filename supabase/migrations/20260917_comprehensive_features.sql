-- ==============================================================================
-- Migration: 20260917_comprehensive_features.sql
-- Description: Comprehensive feature additions & foundations for SIPJAM multi-tenant
--
-- 1. Table: public.wali_kelas (Homeroom teacher assignments per class)
-- 2. Table: public.absensi (Canonical daily student attendance records)
-- 3. Trigger & Function: sync_absensi_to_jurnal() on public.absensi -> public.jurnal_pembelajaran
-- 4. Tables for Gradebook (Daftar Nilai):
--    - public.tujuan_pembelajaran
--    - public.asesmen_kolom
--    - public.nilai_siswa
-- 5. Table: public.push_subscriptions (Native VAPID Web Push subscriptions)
-- 6. Schema enhancements:
--    - public.users: avatar column
--    - public.pengaturan: aturan_kehadiran_guru, email_tujuan_upload columns
-- 7. Security Definer RPC: public.update_user_profile()
-- 8. Row Level Security (RLS) & Multi-Tenant Policies for all new tables
-- ==============================================================================

-- ==============================================================================
-- PART 1: Table public.wali_kelas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wali_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    kelas TEXT NOT NULL,
    guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
    nama_guru TEXT NOT NULL,
    nip TEXT,
    tahun_ajaran TEXT DEFAULT '2024/2025',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas)
);

CREATE INDEX IF NOT EXISTS idx_wali_kelas_sekolah ON public.wali_kelas(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_wali_kelas_guru ON public.wali_kelas(guru_id);
CREATE INDEX IF NOT EXISTS idx_wali_kelas_kelas ON public.wali_kelas(sekolah_id, kelas);

-- ==============================================================================
-- PART 2: Table public.absensi (Canonical Student Attendance)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    tanggal DATE NOT NULL,
    kelas TEXT NOT NULL,
    siswa_id TEXT,
    nisn TEXT NOT NULL,
    nama_siswa TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
    keterangan TEXT,
    sumber_perubahan TEXT NOT NULL,
    diubah_oleh TEXT NOT NULL,
    log_perubahan TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_absensi_siswa_hari UNIQUE(sekolah_id, tanggal, nisn)
);

CREATE INDEX IF NOT EXISTS idx_absensi_sekolah_tgl_kelas ON public.absensi(sekolah_id, tanggal, kelas);
CREATE INDEX IF NOT EXISTS idx_absensi_nisn ON public.absensi(nisn);
CREATE INDEX IF NOT EXISTS idx_absensi_siswa_hari ON public.absensi(sekolah_id, tanggal, nisn);

-- ==============================================================================
-- PART 3: Trigger Function sync_absensi_to_jurnal()
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_absensi_to_jurnal()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchronize updated/inserted attendance status to all matching journals for the class on that date
    UPDATE public.jurnal_pembelajaran
    SET 
        absensi_siswa = CASE 
            WHEN absensi_siswa IS NOT NULL AND absensi_siswa ~ '^\s*\{' THEN
                (absensi_siswa::jsonb || jsonb_build_object(NEW.nisn, NEW.status))::text
            ELSE 
                jsonb_build_object(NEW.nisn, NEW.status)::text
        END
    WHERE sekolah_id = NEW.sekolah_id 
      AND (tanggal = NEW.tanggal::text OR tanggal = to_char(NEW.tanggal, 'YYYY-MM-DD'))
      AND kelas = NEW.kelas;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_absensi_to_jurnal ON public.absensi;
CREATE TRIGGER trg_sync_absensi_to_jurnal
AFTER INSERT OR UPDATE ON public.absensi
FOR EACH ROW EXECUTE FUNCTION public.sync_absensi_to_jurnal();

-- ==============================================================================
-- PART 4: Tables for Gradebook (Daftar Nilai)
-- ==============================================================================

-- 4.1 Tujuan Pembelajaran (TP)
CREATE TABLE IF NOT EXISTS public.tujuan_pembelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
    nama_guru TEXT NOT NULL,
    mapel_id TEXT,
    nama_mapel TEXT NOT NULL,
    kelas TEXT NOT NULL,
    kode_tp TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    semester TEXT NOT NULL DEFAULT 'Ganjil',
    tahun_ajaran TEXT NOT NULL DEFAULT '2024/2025',
    urutan INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_tp_guru_mapel_kelas_kode UNIQUE (sekolah_id, nama_guru, nama_mapel, kelas, kode_tp, semester, tahun_ajaran)
);

CREATE INDEX IF NOT EXISTS idx_tp_sekolah_guru ON public.tujuan_pembelajaran(sekolah_id, nama_guru);
CREATE INDEX IF NOT EXISTS idx_tp_mapel_kelas ON public.tujuan_pembelajaran(sekolah_id, nama_mapel, kelas);

-- 4.2 Asesmen Kolom (Diagnostik, Formatif, Sumatif)
CREATE TABLE IF NOT EXISTS public.asesmen_kolom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    tp_id UUID NOT NULL REFERENCES public.tujuan_pembelajaran(id) ON DELETE CASCADE,
    kategori TEXT NOT NULL CHECK (kategori IN ('Diagnostik', 'Formatif', 'Sumatif')),
    nama TEXT NOT NULL,
    bobot NUMERIC DEFAULT 1,
    urutan INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asesmen_tp_id ON public.asesmen_kolom(tp_id);
CREATE INDEX IF NOT EXISTS idx_asesmen_tp_kategori ON public.asesmen_kolom(tp_id, kategori);

-- 4.3 Nilai Siswa
CREATE TABLE IF NOT EXISTS public.nilai_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    tp_id UUID NOT NULL REFERENCES public.tujuan_pembelajaran(id) ON DELETE CASCADE,
    asesmen_id UUID NOT NULL REFERENCES public.asesmen_kolom(id) ON DELETE CASCADE,
    siswa_id TEXT,
    nisn TEXT NOT NULL,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    mapel TEXT NOT NULL,
    nama_guru TEXT NOT NULL,
    nilai NUMERIC(5, 2) CHECK (nilai >= 0 AND nilai <= 100),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_nilai_siswa_asesmen UNIQUE (sekolah_id, asesmen_id, nisn)
);

CREATE INDEX IF NOT EXISTS idx_nilai_siswa_tp_nisn ON public.nilai_siswa(tp_id, nisn);
CREATE INDEX IF NOT EXISTS idx_nilai_siswa_asesmen ON public.nilai_siswa(asesmen_id);
CREATE INDEX IF NOT EXISTS idx_nilai_siswa_sekolah ON public.nilai_siswa(sekolah_id);

-- ==============================================================================
-- PART 5: Table public.push_subscriptions (Native VAPID Web Push)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_nama TEXT,
    user_role TEXT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_sekolah ON public.push_subscriptions(sekolah_id);

-- ==============================================================================
-- PART 6: Alter Existing Tables (users, pengaturan)
-- ==============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'avatar_1';

ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS aturan_kehadiran_guru TEXT DEFAULT 'Semua_Hari';
ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS email_tujuan_upload TEXT;

-- ==============================================================================
-- PART 7: Security Definer RPC update_user_profile
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
    v_existing_id UUID;
BEGIN
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Pengguna tidak ditemukan.');
    END IF;

    -- Check username uniqueness if changed
    IF p_username IS NOT NULL AND p_username <> '' THEN
        SELECT id INTO v_existing_id
        FROM public.users
        WHERE username = p_username AND id <> p_user_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            RETURN json_build_object('success', false, 'message', 'Username sudah digunakan oleh akun lain.');
        END IF;
    END IF;

    -- Update user profile
    UPDATE public.users
    SET 
        avatar = COALESCE(NULLIF(p_avatar, ''), avatar),
        username = CASE WHEN p_username IS NOT NULL AND p_username <> '' THEN p_username ELSE username END,
        password = CASE WHEN p_password IS NOT NULL AND p_password <> '' THEN p_password ELSE password END,
        nama = CASE WHEN p_nama IS NOT NULL AND p_nama <> '' THEN p_nama ELSE nama END
    WHERE id = p_user_id;

    RETURN json_build_object('success', true, 'message', 'Profil berhasil diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- PART 8: Row Level Security (RLS) & Multi-Tenant Policies
-- ==============================================================================

-- Enable RLS on all 6 new tables
ALTER TABLE public.wali_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tujuan_pembelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asesmen_kolom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 8.1 Policies for public.wali_kelas
DROP POLICY IF EXISTS "wali_kelas_tenant_select_policy" ON public.wali_kelas;
CREATE POLICY "wali_kelas_tenant_select_policy" ON public.wali_kelas FOR SELECT
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "wali_kelas_tenant_insert_policy" ON public.wali_kelas;
CREATE POLICY "wali_kelas_tenant_insert_policy" ON public.wali_kelas FOR INSERT
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "wali_kelas_tenant_update_policy" ON public.wali_kelas;
CREATE POLICY "wali_kelas_tenant_update_policy" ON public.wali_kelas FOR UPDATE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "wali_kelas_tenant_delete_policy" ON public.wali_kelas;
CREATE POLICY "wali_kelas_tenant_delete_policy" ON public.wali_kelas FOR DELETE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

-- 8.2 Policies for public.absensi
DROP POLICY IF EXISTS "absensi_tenant_select_policy" ON public.absensi;
CREATE POLICY "absensi_tenant_select_policy" ON public.absensi FOR SELECT
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "absensi_tenant_insert_policy" ON public.absensi;
CREATE POLICY "absensi_tenant_insert_policy" ON public.absensi FOR INSERT
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "absensi_tenant_update_policy" ON public.absensi;
CREATE POLICY "absensi_tenant_update_policy" ON public.absensi FOR UPDATE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "absensi_tenant_delete_policy" ON public.absensi;
CREATE POLICY "absensi_tenant_delete_policy" ON public.absensi FOR DELETE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

-- 8.3 Policies for public.tujuan_pembelajaran
DROP POLICY IF EXISTS "tujuan_pembelajaran_tenant_select_policy" ON public.tujuan_pembelajaran;
CREATE POLICY "tujuan_pembelajaran_tenant_select_policy" ON public.tujuan_pembelajaran FOR SELECT
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "tujuan_pembelajaran_tenant_insert_policy" ON public.tujuan_pembelajaran;
CREATE POLICY "tujuan_pembelajaran_tenant_insert_policy" ON public.tujuan_pembelajaran FOR INSERT
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "tujuan_pembelajaran_tenant_update_policy" ON public.tujuan_pembelajaran;
CREATE POLICY "tujuan_pembelajaran_tenant_update_policy" ON public.tujuan_pembelajaran FOR UPDATE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "tujuan_pembelajaran_tenant_delete_policy" ON public.tujuan_pembelajaran;
CREATE POLICY "tujuan_pembelajaran_tenant_delete_policy" ON public.tujuan_pembelajaran FOR DELETE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

-- 8.4 Policies for public.asesmen_kolom
DROP POLICY IF EXISTS "asesmen_kolom_tenant_select_policy" ON public.asesmen_kolom;
CREATE POLICY "asesmen_kolom_tenant_select_policy" ON public.asesmen_kolom FOR SELECT
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "asesmen_kolom_tenant_insert_policy" ON public.asesmen_kolom;
CREATE POLICY "asesmen_kolom_tenant_insert_policy" ON public.asesmen_kolom FOR INSERT
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "asesmen_kolom_tenant_update_policy" ON public.asesmen_kolom;
CREATE POLICY "asesmen_kolom_tenant_update_policy" ON public.asesmen_kolom FOR UPDATE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "asesmen_kolom_tenant_delete_policy" ON public.asesmen_kolom;
CREATE POLICY "asesmen_kolom_tenant_delete_policy" ON public.asesmen_kolom FOR DELETE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

-- 8.5 Policies for public.nilai_siswa
DROP POLICY IF EXISTS "nilai_siswa_tenant_select_policy" ON public.nilai_siswa;
CREATE POLICY "nilai_siswa_tenant_select_policy" ON public.nilai_siswa FOR SELECT
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "nilai_siswa_tenant_insert_policy" ON public.nilai_siswa;
CREATE POLICY "nilai_siswa_tenant_insert_policy" ON public.nilai_siswa FOR INSERT
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "nilai_siswa_tenant_update_policy" ON public.nilai_siswa;
CREATE POLICY "nilai_siswa_tenant_update_policy" ON public.nilai_siswa FOR UPDATE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "nilai_siswa_tenant_delete_policy" ON public.nilai_siswa;
CREATE POLICY "nilai_siswa_tenant_delete_policy" ON public.nilai_siswa FOR DELETE
USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

-- 8.6 Policies for public.push_subscriptions
DROP POLICY IF EXISTS "push_subscriptions_tenant_select_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_tenant_select_policy" ON public.push_subscriptions FOR SELECT
USING (is_superadmin() OR sekolah_id IS NULL OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "push_subscriptions_tenant_insert_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_tenant_insert_policy" ON public.push_subscriptions FOR INSERT
WITH CHECK (is_superadmin() OR sekolah_id IS NULL OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "push_subscriptions_tenant_update_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_tenant_update_policy" ON public.push_subscriptions FOR UPDATE
USING (is_superadmin() OR sekolah_id IS NULL OR sekolah_id = public.get_auth_user_sekolah_id())
WITH CHECK (is_superadmin() OR sekolah_id IS NULL OR sekolah_id = public.get_auth_user_sekolah_id());

DROP POLICY IF EXISTS "push_subscriptions_tenant_delete_policy" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_tenant_delete_policy" ON public.push_subscriptions FOR DELETE
USING (is_superadmin() OR sekolah_id IS NULL OR sekolah_id = public.get_auth_user_sekolah_id());

-- ==============================================================================
-- PART 9: Grant Privileges
-- ==============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
