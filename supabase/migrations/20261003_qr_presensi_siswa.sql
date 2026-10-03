-- Migration: 20261003_qr_presensi_siswa.sql
-- Description: Add qr_code to data_siswa and create presensi_siswa table with multi-tenant RLS

-- 1. Add qr_code column to data_siswa
ALTER TABLE public.data_siswa 
  ADD COLUMN IF NOT EXISTS qr_code TEXT;

CREATE INDEX IF NOT EXISTS idx_data_siswa_qr_code 
  ON public.data_siswa(qr_code);

-- Update existing rows in data_siswa where qr_code IS NULL
UPDATE public.data_siswa 
SET qr_code = COALESCE(NULLIF(nisn, ''), id::text) 
WHERE qr_code IS NULL;

-- 2. Create table presensi_siswa
CREATE TABLE IF NOT EXISTS public.presensi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES public.data_siswa(id) ON DELETE CASCADE,
    nisn TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('datang', 'pulang')),
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id TEXT DEFAULT 'kiosk-default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presensi_siswa_status UNIQUE (sekolah_id, tanggal, siswa_id, status)
);

-- 3. Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_presensi_siswa_sekolah_tgl_kls 
  ON public.presensi_siswa(sekolah_id, tanggal, kelas);

CREATE INDEX IF NOT EXISTS idx_presensi_siswa_sekolah_siswa 
  ON public.presensi_siswa(sekolah_id, siswa_id);

CREATE INDEX IF NOT EXISTS idx_presensi_siswa_timestamp 
  ON public.presensi_siswa(timestamp DESC);

-- 4. Enable RLS
ALTER TABLE public.presensi_siswa ENABLE ROW LEVEL SECURITY;

-- 5. Multi-tenant RLS Policies
DROP POLICY IF EXISTS "presensi_siswa_tenant_select_policy" ON public.presensi_siswa;
CREATE POLICY "presensi_siswa_tenant_select_policy" ON public.presensi_siswa FOR SELECT
  USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "presensi_siswa_tenant_insert_policy" ON public.presensi_siswa;
CREATE POLICY "presensi_siswa_tenant_insert_policy" ON public.presensi_siswa FOR INSERT
  WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "presensi_siswa_tenant_update_policy" ON public.presensi_siswa;
CREATE POLICY "presensi_siswa_tenant_update_policy" ON public.presensi_siswa FOR UPDATE
  USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))
  WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

DROP POLICY IF EXISTS "presensi_siswa_tenant_delete_policy" ON public.presensi_siswa;
CREATE POLICY "presensi_siswa_tenant_delete_policy" ON public.presensi_siswa FOR DELETE
  USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

-- 6. Permissions
GRANT ALL ON TABLE public.presensi_siswa TO anon, authenticated, service_role;
