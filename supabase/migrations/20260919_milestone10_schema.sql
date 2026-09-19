-- ==============================================================================
-- Migration: 20260919_milestone10_schema.sql
-- Description: Milestone 10 Database Schema
--   1. Create public.syarat_perangkat_pembelajaran table with tenant isolation & RLS
--   2. Add catatan_admin (and alasan_penolakan alias) rejection feedback columns
--      to public.presensi_guru, public.jurnal_pembelajaran, and public.laporan_piket
--   3. Add syarat_id to public.bank_dokumen
--   4. Seed default Kurikulum Merdeka requirements (CP, ATP, RPE, Prota, Promes, RPM)
--      for all existing schools
-- ==============================================================================

-- ==============================================================================
-- PART 1: Table public.syarat_perangkat_pembelajaran
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.syarat_perangkat_pembelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    nama_mapel TEXT NOT NULL DEFAULT 'Semua Mapel',
    kode_dokumen TEXT NOT NULL,
    nama_dokumen TEXT NOT NULL,
    format_dokumen TEXT NOT NULL DEFAULT 'PDF, DOCX',
    deskripsi TEXT DEFAULT NULL,
    wajib BOOLEAN NOT NULL DEFAULT TRUE,
    urutan INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for query performance and tenant scoping
CREATE INDEX IF NOT EXISTS idx_syarat_perangkat_sekolah_mapel 
    ON public.syarat_perangkat_pembelajaran(sekolah_id, nama_mapel);

CREATE INDEX IF NOT EXISTS idx_syarat_perangkat_sekolah_kode 
    ON public.syarat_perangkat_pembelajaran(sekolah_id, kode_dokumen);

CREATE INDEX IF NOT EXISTS idx_syarat_perangkat_urutan 
    ON public.syarat_perangkat_pembelajaran(sekolah_id, urutan);

-- ==============================================================================
-- PART 2: Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.syarat_perangkat_pembelajaran ENABLE ROW LEVEL SECURITY;

-- SELECT policy: authenticated users can view requirements for their sekolah_id
DROP POLICY IF EXISTS "syarat_perangkat_select_policy" ON public.syarat_perangkat_pembelajaran;
CREATE POLICY "syarat_perangkat_select_policy" ON public.syarat_perangkat_pembelajaran FOR SELECT
USING (
    is_superadmin() 
    OR sekolah_id = public.get_auth_user_sekolah_id() 
    OR (public.get_auth_user_sekolah_id() IS NULL AND true)
);

-- INSERT policy: authenticated users with admin/superadmin role (or matching sekolah_id) can manage requirements
DROP POLICY IF EXISTS "syarat_perangkat_insert_policy" ON public.syarat_perangkat_pembelajaran;
CREATE POLICY "syarat_perangkat_insert_policy" ON public.syarat_perangkat_pembelajaran FOR INSERT
WITH CHECK (
    is_superadmin() 
    OR (
        (public.get_auth_user_role() IN ('Admin', 'Superadmin') OR public.get_auth_user_role() IS NULL)
        AND (sekolah_id = public.get_auth_user_sekolah_id() OR public.get_auth_user_sekolah_id() IS NULL)
    )
);

-- UPDATE policy: authenticated users with admin/superadmin role (or matching sekolah_id) can manage requirements
DROP POLICY IF EXISTS "syarat_perangkat_update_policy" ON public.syarat_perangkat_pembelajaran;
CREATE POLICY "syarat_perangkat_update_policy" ON public.syarat_perangkat_pembelajaran FOR UPDATE
USING (
    is_superadmin() 
    OR (
        (public.get_auth_user_role() IN ('Admin', 'Superadmin') OR public.get_auth_user_role() IS NULL)
        AND (sekolah_id = public.get_auth_user_sekolah_id() OR public.get_auth_user_sekolah_id() IS NULL)
    )
)
WITH CHECK (
    is_superadmin() 
    OR (
        (public.get_auth_user_role() IN ('Admin', 'Superadmin') OR public.get_auth_user_role() IS NULL)
        AND (sekolah_id = public.get_auth_user_sekolah_id() OR public.get_auth_user_sekolah_id() IS NULL)
    )
);

-- DELETE policy: authenticated users with admin/superadmin role (or matching sekolah_id) can manage requirements
DROP POLICY IF EXISTS "syarat_perangkat_delete_policy" ON public.syarat_perangkat_pembelajaran;
CREATE POLICY "syarat_perangkat_delete_policy" ON public.syarat_perangkat_pembelajaran FOR DELETE
USING (
    is_superadmin() 
    OR (
        (public.get_auth_user_role() IN ('Admin', 'Superadmin') OR public.get_auth_user_role() IS NULL)
        AND (sekolah_id = public.get_auth_user_sekolah_id() OR public.get_auth_user_sekolah_id() IS NULL)
    )
);

-- Grant privileges
GRANT ALL ON TABLE public.syarat_perangkat_pembelajaran TO anon, authenticated, service_role;

-- ==============================================================================
-- PART 3: Add catatan_admin & alasan_penolakan Rejection Columns
-- ==============================================================================
ALTER TABLE public.presensi_guru 
    ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;
ALTER TABLE public.presensi_guru 
    ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;

ALTER TABLE public.jurnal_pembelajaran 
    ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;
ALTER TABLE public.jurnal_pembelajaran 
    ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;

ALTER TABLE public.laporan_piket 
    ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;
ALTER TABLE public.laporan_piket 
    ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;

-- Optional FK to syarat_perangkat_pembelajaran on bank_dokumen
ALTER TABLE public.bank_dokumen 
    ADD COLUMN IF NOT EXISTS syarat_id UUID REFERENCES public.syarat_perangkat_pembelajaran(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bank_dokumen_syarat_id ON public.bank_dokumen(syarat_id);

-- ==============================================================================
-- PART 4: Seed Default Kurikulum Merdeka Requirements for Existing Schools
-- ==============================================================================
INSERT INTO public.syarat_perangkat_pembelajaran (
    sekolah_id,
    nama_mapel,
    kode_dokumen,
    nama_dokumen,
    format_dokumen,
    wajib,
    urutan
)
SELECT 
    s.id,
    'Semua Mapel',
    item.kode,
    item.nama,
    'PDF, DOCX',
    true,
    item.urutan
FROM public.sekolah s
CROSS JOIN (
    VALUES 
        ('CP', 'Analisis Capaian Pembelajaran (CP)', 1),
        ('ATP', 'Alur Tujuan Pembelajaran (ATP)', 2),
        ('RPE', 'Rencana Pekan Efektif (RPE)', 3),
        ('Prota', 'Program Tahunan (Prota)', 4),
        ('Promes', 'Program Semester (Promes)', 5),
        ('RPM', 'Rencana Pembelajaran Mendalam / Modul Ajar (RPM)', 6)
) AS item(kode, nama, urutan)
WHERE NOT EXISTS (
    SELECT 1 FROM public.syarat_perangkat_pembelajaran sp
    WHERE sp.sekolah_id = s.id 
      AND sp.nama_mapel = 'Semua Mapel' 
      AND sp.kode_dokumen = item.kode
);
