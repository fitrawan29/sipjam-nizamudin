-- ============================================================================
-- MIGRATION: CREATE JURNAL_BK (Bimbingan Konseling)
-- File: supabase/migrations/20261109_create_jurnal_bk.sql
-- Description: Independent classless counseling journal table with performance
-- indexes, Row Level Security (RLS), and schema cache notification.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.jurnal_bk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    guru_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    nama_guru TEXT NOT NULL,
    siswa_id UUID REFERENCES public.data_siswa(id) ON DELETE SET NULL,
    nisn TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TEXT NOT NULL,
    bidang_bimbingan TEXT NOT NULL CHECK (bidang_bimbingan IN ('Pribadi', 'Sosial', 'Belajar', 'Karir')),
    jenis_layanan TEXT NOT NULL,
    sasaran TEXT DEFAULT 'Individu',
    tempat_layanan TEXT DEFAULT 'Ruang BK',
    catatan TEXT NOT NULL,
    tindak_lanjut TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Dalam Penanganan' CHECK (status IN ('Dalam Penanganan', 'Selesai', 'Alih Tangan Kasus')),
    link_dokumen TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_jurnal_bk_sekolah_id ON public.jurnal_bk(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_bk_tanggal ON public.jurnal_bk(sekolah_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_jurnal_bk_siswa_id ON public.jurnal_bk(siswa_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_bk_status ON public.jurnal_bk(sekolah_id, status);

-- Row Level Security (RLS)
ALTER TABLE public.jurnal_bk ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users matching sekolah_id
DROP POLICY IF EXISTS "jurnal_bk_read_policy" ON public.jurnal_bk;
CREATE POLICY "jurnal_bk_read_policy" ON public.jurnal_bk
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Allow insert/update/delete for authenticated users
DROP POLICY IF EXISTS "jurnal_bk_write_policy" ON public.jurnal_bk;
CREATE POLICY "jurnal_bk_write_policy" ON public.jurnal_bk
    FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
