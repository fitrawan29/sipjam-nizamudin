-- ==============================================================================
-- Migration: 20261011_capaian_pembelajaran_and_gradebook_v2.sql
-- Description: CP -> TP Hierarchy, Asesmen Keterangan, DB Diagnostik Limit, Bobot Pengaturan
-- Principle: Ponytail Minimal Schema Diff & Backward Compatibility
-- ==============================================================================

-- 1. Create capaian_pembelajaran table
CREATE TABLE IF NOT EXISTS public.capaian_pembelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    guru_mapel_id UUID REFERENCES public.guru_mapel(id) ON DELETE SET NULL,
    nama_mapel TEXT NOT NULL,
    kelas TEXT NOT NULL,
    semester TEXT NOT NULL DEFAULT 'Ganjil',
    tahun_ajaran TEXT NOT NULL DEFAULT '2024/2025',
    kode_cp TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    urutan INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for CP queries
CREATE INDEX IF NOT EXISTS idx_cp_sekolah_mapel_kelas 
    ON public.capaian_pembelajaran(sekolah_id, nama_mapel, kelas);
CREATE INDEX IF NOT EXISTS idx_cp_guru_mapel_id 
    ON public.capaian_pembelajaran(guru_mapel_id);
CREATE INDEX IF NOT EXISTS idx_cp_semester_tahun 
    ON public.capaian_pembelajaran(sekolah_id, semester, tahun_ajaran);

-- 2. Add cp_id to tujuan_pembelajaran (NULLABLE for full backward-compatibility)
ALTER TABLE public.tujuan_pembelajaran
    ADD COLUMN IF NOT EXISTS cp_id UUID REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tp_cp_id 
    ON public.tujuan_pembelajaran(cp_id);

-- 3. Add keterangan to asesmen_kolom
ALTER TABLE public.asesmen_kolom
    ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- 4. Enforce max 1 Diagnostik assessment per TP at the Database level
CREATE UNIQUE INDEX IF NOT EXISTS uq_asesmen_tp_diagnostik 
    ON public.asesmen_kolom(tp_id) 
    WHERE (kategori = 'Diagnostik');

-- 5. Row Level Security for capaian_pembelajaran
ALTER TABLE public.capaian_pembelajaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "capaian_pembelajaran_select_policy" ON public.capaian_pembelajaran;
CREATE POLICY "capaian_pembelajaran_select_policy" ON public.capaian_pembelajaran
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "capaian_pembelajaran_modify_policy" ON public.capaian_pembelajaran;
CREATE POLICY "capaian_pembelajaran_modify_policy" ON public.capaian_pembelajaran
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.capaian_pembelajaran TO anon, authenticated, service_role;

-- 6. Seed default bobot_nilai_mapel for all schools in pengaturan
INSERT INTO public.pengaturan (sekolah_id, key, value)
SELECT id, 'bobot_nilai_mapel', '{"kehadiran":40,"formatif":30,"sumatif":30}'
FROM public.sekolah
ON CONFLICT (sekolah_id, key) DO NOTHING;
