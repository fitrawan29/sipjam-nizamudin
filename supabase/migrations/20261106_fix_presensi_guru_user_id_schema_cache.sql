-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE PRESENSI GURU (user_id & kolom terkait)
-- File: supabase/migrations/20261106_fix_presensi_guru_user_id_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST204:
-- "Could not find the 'user_id' column of 'presensi_guru' in the schema cache"
-- Terjadi ketika kolom user_id belum ditambahkan pada tabel presensi_guru
-- (misalnya pada instance yang dibuat dari template lama) atau PostgREST belum
-- memuat ulang skema database ke memori cache PostgREST.
-- ============================================================================

-- 1. Pastikan kolom user_id dan kolom ekstensi pada public.presensi_guru tersedia (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'presensi_guru') THEN
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS keterlambatan_detik INTEGER DEFAULT NULL;
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS durasi_hari INTEGER DEFAULT 1;
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS tanggal_mulai DATE;
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS tanggal_selesai DATE;
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS memerlukan_persetujuan_admin BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS is_auto_checkout BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;
        -- Pastikan kolom jarak mendukung format teks seperti "15 m" atau "Unknown"
        ALTER TABLE public.presensi_guru ALTER COLUMN jarak TYPE TEXT USING jarak::TEXT;
    END IF;
END $$;

-- 2. Pastikan kolom user_id tersedia pada tabel transaksional & master terkait (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jurnal_pembelajaran') THEN
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'laporan_piket') THEN
        ALTER TABLE public.laporan_piket ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.laporan_piket ADD COLUMN IF NOT EXISTS catatan_admin TEXT DEFAULT NULL;
        ALTER TABLE public.laporan_piket ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT DEFAULT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_guru') THEN
        ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jadwal_pelajaran') THEN
        ALTER TABLE public.jadwal_pelajaran ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Backfill user_id pada presensi_guru yang masih NULL berdasarkan nama_guru & sekolah_id
UPDATE public.presensi_guru pg
SET user_id = u.id
FROM public.users u
WHERE pg.user_id IS NULL
  AND (pg.sekolah_id IS NULL OR u.sekolah_id IS NULL OR pg.sekolah_id = u.sekolah_id)
  AND (
    pg.nama_guru = u.nama
    OR pg.nama_guru ILIKE (u.nama || '%')
    OR u.nama ILIKE (split_part(pg.nama_guru, ',', 1) || '%')
  );

-- 4. REFRESH SCHEMA CACHE POSTGREST SECARA INSTAN
NOTIFY pgrst, 'reload schema';
