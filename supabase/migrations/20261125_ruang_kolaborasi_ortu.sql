-- ============================================================================
-- MIGRATION: RUANG KOLABORASI GURU & ORANG TUA
-- File: supabase/migrations/20261125_ruang_kolaborasi_ortu.sql
-- Description: Tables for parent-student linking (orang_tua_siswa),
-- 2-way collaboration threads & messages (kolaborasi_topik, kolaborasi_pesan),
-- and online student leave requests (izin_siswa_ortu).
-- ============================================================================

-- 1. Relasi Akun Orang Tua <-> Data Siswa
CREATE TABLE IF NOT EXISTS public.orang_tua_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES public.data_siswa(id) ON DELETE CASCADE,
    hubungan TEXT NOT NULL DEFAULT 'Orang Tua' CHECK (hubungan IN ('Ayah', 'Ibu', 'Wali', 'Orang Tua')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, siswa_id)
);

CREATE INDEX IF NOT EXISTS idx_orang_tua_siswa_sekolah ON public.orang_tua_siswa(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_orang_tua_siswa_user ON public.orang_tua_siswa(user_id);
CREATE INDEX IF NOT EXISTS idx_orang_tua_siswa_siswa ON public.orang_tua_siswa(siswa_id);

-- 2. Topik Diskusi 2 Arah (Per Siswa)
CREATE TABLE IF NOT EXISTS public.kolaborasi_topik (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES public.data_siswa(id) ON DELETE CASCADE,
    kelas TEXT NOT NULL,
    judul TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'Umum' CHECK (kategori IN ('Akademik', 'Kehadiran', 'Perilaku & BK', 'Umum')),
    dibuat_oleh_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    dibuat_oleh_nama TEXT NOT NULL,
    dibuat_oleh_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Terbuka' CHECK (status IN ('Terbuka', 'Selesai')),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kolaborasi_topik_sekolah ON public.kolaborasi_topik(sekolah_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_kolaborasi_topik_siswa ON public.kolaborasi_topik(siswa_id);
CREATE INDEX IF NOT EXISTS idx_kolaborasi_topik_kelas ON public.kolaborasi_topik(sekolah_id, kelas);

-- 3. Pesan dalam Topik Diskusi
CREATE TABLE IF NOT EXISTS public.kolaborasi_pesan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    topik_id UUID NOT NULL REFERENCES public.kolaborasi_topik(id) ON DELETE CASCADE,
    pengirim_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    pengirim_nama TEXT NOT NULL,
    pengirim_role TEXT NOT NULL,
    isi TEXT NOT NULL,
    lampiran_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kolaborasi_pesan_topik ON public.kolaborasi_pesan(topik_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_kolaborasi_pesan_sekolah ON public.kolaborasi_pesan(sekolah_id);

-- 4. Pengajuan Izin Siswa Online oleh Orang Tua
CREATE TABLE IF NOT EXISTS public.izin_siswa_ortu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES public.data_siswa(id) ON DELETE CASCADE,
    nisn TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    orang_tua_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    orang_tua_nama TEXT NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jenis TEXT NOT NULL CHECK (jenis IN ('Izin', 'Sakit')),
    alasan TEXT NOT NULL,
    lampiran_url TEXT,
    status TEXT NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')),
    catatan_guru TEXT,
    diproses_oleh TEXT,
    diproses_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_izin_siswa_ortu_sekolah ON public.izin_siswa_ortu(sekolah_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_izin_siswa_ortu_siswa ON public.izin_siswa_ortu(siswa_id);
CREATE INDEX IF NOT EXISTS idx_izin_siswa_ortu_status ON public.izin_siswa_ortu(sekolah_id, status);

-- 5. Row Level Security (RLS)
ALTER TABLE public.orang_tua_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kolaborasi_topik ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kolaborasi_pesan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.izin_siswa_ortu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orang_tua_siswa_read_policy" ON public.orang_tua_siswa;
CREATE POLICY "orang_tua_siswa_read_policy" ON public.orang_tua_siswa FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "orang_tua_siswa_write_policy" ON public.orang_tua_siswa;
CREATE POLICY "orang_tua_siswa_write_policy" ON public.orang_tua_siswa FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "kolaborasi_topik_read_policy" ON public.kolaborasi_topik;
CREATE POLICY "kolaborasi_topik_read_policy" ON public.kolaborasi_topik FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "kolaborasi_topik_write_policy" ON public.kolaborasi_topik;
CREATE POLICY "kolaborasi_topik_write_policy" ON public.kolaborasi_topik FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "kolaborasi_pesan_read_policy" ON public.kolaborasi_pesan;
CREATE POLICY "kolaborasi_pesan_read_policy" ON public.kolaborasi_pesan FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "kolaborasi_pesan_write_policy" ON public.kolaborasi_pesan;
CREATE POLICY "kolaborasi_pesan_write_policy" ON public.kolaborasi_pesan FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "izin_siswa_ortu_read_policy" ON public.izin_siswa_ortu;
CREATE POLICY "izin_siswa_ortu_read_policy" ON public.izin_siswa_ortu FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "izin_siswa_ortu_write_policy" ON public.izin_siswa_ortu;
CREATE POLICY "izin_siswa_ortu_write_policy" ON public.izin_siswa_ortu FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
