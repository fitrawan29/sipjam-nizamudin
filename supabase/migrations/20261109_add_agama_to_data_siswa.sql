-- ============================================================================
-- SCRIPT PENAMBAHAN KOLOM AGAMA PADA DATA_SISWA & RELOAD SCHEMA CACHE
-- File: supabase/migrations/20261109_add_agama_to_data_siswa.sql
--
-- TUJUAN:
-- Mendukung pemisahan siswa berdasarkan status agama untuk mata pelajaran
-- Pendidikan Agama Islam (PAI) dan Pendidikan Agama Kristen (PAK) dalam satu kelas.
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_siswa') THEN
        ALTER TABLE public.data_siswa ADD COLUMN IF NOT EXISTS agama TEXT;
    END IF;
END $$;

-- Reload schema cache PostgREST agar kolom agama langsung dikenali
NOTIFY pgrst, 'reload schema';
