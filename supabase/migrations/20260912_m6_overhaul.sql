-- Migration: 20260912_m6_overhaul.sql
-- Description: Milestone 6 overhaul database schema:
-- 1. Create public.penugasan_piket
-- 2. Create public.pengumuman
-- 3. Create public.pengumuman_tanggapan
-- 4. Add mapel and kelas columns to public.bank_dokumen
-- 5. Enable RLS and setup permissive policies
-- 6. Seed penugasan_piket from public.jadwal_piket and initial pengumuman data

-- ==============================================================================
-- 1. Table: public.penugasan_piket
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.penugasan_piket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hari TEXT NOT NULL,
    tipe_petugas TEXT NOT NULL DEFAULT 'Guru',
    guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
    guru_nama TEXT,
    guru_nip TEXT,
    siswa_nama TEXT,
    siswa_nisn TEXT,
    kelas TEXT,
    tahun_ajaran TEXT DEFAULT '2026/2027',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for penugasan_piket
CREATE INDEX IF NOT EXISTS idx_penugasan_piket_hari ON public.penugasan_piket(hari);
CREATE INDEX IF NOT EXISTS idx_penugasan_piket_tipe ON public.penugasan_piket(tipe_petugas);
CREATE INDEX IF NOT EXISTS idx_penugasan_piket_guru_id ON public.penugasan_piket(guru_id);
CREATE INDEX IF NOT EXISTS idx_penugasan_piket_guru_nama ON public.penugasan_piket(guru_nama);

-- ==============================================================================
-- 2. Table: public.pengumuman
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pengumuman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    konten TEXT NOT NULL,
    sasaran TEXT NOT NULL DEFAULT 'Semua',
    mode TEXT NOT NULL DEFAULT 'Satu Arah',
    penulis_nama TEXT NOT NULL,
    penulis_role TEXT NOT NULL DEFAULT 'Admin',
    is_pinned BOOLEAN DEFAULT false,
    lampiran_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for pengumuman
CREATE INDEX IF NOT EXISTS idx_pengumuman_sasaran ON public.pengumuman(sasaran);
CREATE INDEX IF NOT EXISTS idx_pengumuman_is_pinned ON public.pengumuman(is_pinned);
CREATE INDEX IF NOT EXISTS idx_pengumuman_created_at ON public.pengumuman(created_at DESC);

-- ==============================================================================
-- 3. Table: public.pengumuman_tanggapan
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pengumuman_tanggapan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pengumuman_id UUID NOT NULL REFERENCES public.pengumuman(id) ON DELETE CASCADE,
    user_nama TEXT NOT NULL,
    user_role TEXT NOT NULL,
    komentar TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for pengumuman_tanggapan
CREATE INDEX IF NOT EXISTS idx_pengumuman_tanggapan_pengumuman_id ON public.pengumuman_tanggapan(pengumuman_id);
CREATE INDEX IF NOT EXISTS idx_pengumuman_tanggapan_created_at ON public.pengumuman_tanggapan(created_at ASC);

-- ==============================================================================
-- 4. Alter public.bank_dokumen
-- ==============================================================================
ALTER TABLE public.bank_dokumen ADD COLUMN IF NOT EXISTS mapel TEXT;
ALTER TABLE public.bank_dokumen ADD COLUMN IF NOT EXISTS kelas TEXT;

-- ==============================================================================
-- 5. Row Level Security & Access Policies
-- ==============================================================================
ALTER TABLE public.penugasan_piket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengumuman_tanggapan ENABLE ROW LEVEL SECURITY;

-- Permissive policies for penugasan_piket
DROP POLICY IF EXISTS "Allow public read access on penugasan_piket" ON public.penugasan_piket;
CREATE POLICY "Allow public read access on penugasan_piket"
    ON public.penugasan_piket FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated or anon write access on penugasan_piket" ON public.penugasan_piket;
CREATE POLICY "Allow authenticated or anon write access on penugasan_piket"
    ON public.penugasan_piket FOR ALL
    USING (true)
    WITH CHECK (true);

-- Permissive policies for pengumuman
DROP POLICY IF EXISTS "Allow public read access on pengumuman" ON public.pengumuman;
CREATE POLICY "Allow public read access on pengumuman"
    ON public.pengumuman FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated or anon write access on pengumuman" ON public.pengumuman;
CREATE POLICY "Allow authenticated or anon write access on pengumuman"
    ON public.pengumuman FOR ALL
    USING (true)
    WITH CHECK (true);

-- Permissive policies for pengumuman_tanggapan
DROP POLICY IF EXISTS "Allow public read access on pengumuman_tanggapan" ON public.pengumuman_tanggapan;
CREATE POLICY "Allow public read access on pengumuman_tanggapan"
    ON public.pengumuman_tanggapan FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated or anon write access on pengumuman_tanggapan" ON public.pengumuman_tanggapan;
CREATE POLICY "Allow authenticated or anon write access on pengumuman_tanggapan"
    ON public.pengumuman_tanggapan FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions to anon, authenticated, service_role
GRANT ALL ON public.penugasan_piket TO anon, authenticated, service_role;
GRANT ALL ON public.pengumuman TO anon, authenticated, service_role;
GRANT ALL ON public.pengumuman_tanggapan TO anon, authenticated, service_role;
GRANT ALL ON public.bank_dokumen TO anon, authenticated, service_role;

-- ==============================================================================
-- 6. Seed Data for penugasan_piket from public.jadwal_piket & public.data_guru
-- ==============================================================================
INSERT INTO public.penugasan_piket (
    hari,
    tipe_petugas,
    guru_id,
    guru_nama,
    guru_nip,
    tahun_ajaran
)
SELECT 
    jp.hari,
    'Guru' AS tipe_petugas,
    g.id AS guru_id,
    g.nama_guru AS guru_nama,
    g.nip AS guru_nip,
    '2026/2027' AS tahun_ajaran
FROM public.jadwal_piket jp
JOIN public.data_guru g ON position(lower(split_part(g.nama_guru, ',', 1)) in lower(jp.daftar_guru)) > 0
WHERE NOT EXISTS (
    SELECT 1 FROM public.penugasan_piket pp 
    WHERE pp.hari = jp.hari AND pp.guru_id = g.id
);

-- Seed sample student piket if none exist
INSERT INTO public.penugasan_piket (
    hari,
    tipe_petugas,
    siswa_nama,
    siswa_nisn,
    kelas,
    tahun_ajaran
)
SELECT 
    'Senin' as hari,
    'Siswa' as tipe_petugas,
    s.nama_siswa as siswa_nama,
    s.nisn as siswa_nisn,
    s.kelas,
    '2026/2027' as tahun_ajaran
FROM public.data_siswa s
WHERE NOT EXISTS (
    SELECT 1 FROM public.penugasan_piket pp WHERE pp.tipe_petugas = 'Siswa'
)
ORDER BY s.nama_siswa
LIMIT 2;

-- Seed initial announcements
DO $$
DECLARE
    v_pengumuman_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.pengumuman LIMIT 1) THEN
        -- Pinned general announcement
        INSERT INTO public.pengumuman (
            judul,
            konten,
            sasaran,
            mode,
            penulis_nama,
            penulis_role,
            is_pinned
        ) VALUES (
            'Selamat Datang di Sistem Informasi SIPJAM Nizamudin',
            'Sistem Informasi dan Broadcast Pengumuman Terpadu SIPJAM Nizamudin telah aktif. Seluruh informasi kedinasan, kegiatan KBM, dan pengumuman resmi sekolah akan disampaikan melalui menu ini secara berkala.',
            'Semua',
            'Satu Arah',
            'Administrator SIPJAM',
            'Admin',
            true
        );

        -- Two-way discussion announcement
        INSERT INTO public.pengumuman (
            judul,
            konten,
            sasaran,
            mode,
            penulis_nama,
            penulis_role,
            is_pinned
        ) VALUES (
            'Koordinasi Pengisian Jurnal KBM & Perangkat Pembelajaran',
            'Bapak/Ibu Dewan Guru dimohon untuk memastikan pengisian jurnal KBM harian dan kelengkapan 6 perangkat pembelajaran Kurikulum Merdeka pada sistem SIPJAM. Silakan berikan tanggapan di bawah jika terdapat kendala.',
            'Guru',
            'Dua Arah',
            'Kepala Sekolah',
            'Admin',
            false
        ) RETURNING id INTO v_pengumuman_id;

        -- Initial response for two-way announcement
        IF v_pengumuman_id IS NOT NULL THEN
            INSERT INTO public.pengumuman_tanggapan (
                pengumuman_id,
                user_nama,
                user_role,
                komentar
            ) VALUES (
                v_pengumuman_id,
                'Setia Ambar Ningsih Mamonto',
                'Guru',
                'Siap, perangkat pembelajaran Bahasa Indonesia kelas X dan XI sudah lengkap diunggah. Terima kasih.'
            );
        END IF;
    END IF;
END $$;
