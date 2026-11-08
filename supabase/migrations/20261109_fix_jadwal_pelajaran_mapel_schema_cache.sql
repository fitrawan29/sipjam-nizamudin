-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE JADWAL PELAJARAN (mapel & mata_pelajaran)
-- File: supabase/migrations/20261109_fix_jadwal_pelajaran_mapel_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST204:
-- "Could not find the 'mapel' column of 'jadwal_pelajaran' in the schema cache"
-- Terjadi ketika kolom 'mapel' belum ditambahkan pada tabel jadwal_pelajaran
-- (misalnya pada instance yang dibuat dari template awal atau migrasi sebelumnya)
-- atau PostgREST belum memuat ulang skema database ke memori cache PostgREST.
--
-- SOLUSI:
-- 1. Pastikan kolom mapel TEXT tersedia secara idempotent di public.jadwal_pelajaran.
-- 2. Sinkronkan nilai dua arah (backfill) antara mata_pelajaran dan mapel.
-- 3. Pasang trigger otomatis untuk memastikan mata_pelajaran dan mapel selalu
--    sinkron pada setiap operasi INSERT atau UPDATE.
-- 4. Perbarui fungsi validasi check_jadwal_mapel_validity() agar aman dan tangguh.
-- 5. Jalankan NOTIFY pgrst, 'reload schema' untuk memuat ulang schema cache PostgREST.
-- ============================================================================

-- 1. Tambahkan kolom mapel ke public.jadwal_pelajaran jika belum ada (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jadwal_pelajaran') THEN
        ALTER TABLE public.jadwal_pelajaran ADD COLUMN IF NOT EXISTS mapel TEXT;
    END IF;
END $$;

-- 2. Backfill data yang sudah ada agar mata_pelajaran dan mapel saling terisi
UPDATE public.jadwal_pelajaran
SET mapel = mata_pelajaran
WHERE (mapel IS NULL OR trim(mapel) = '')
  AND (mata_pelajaran IS NOT NULL AND trim(mata_pelajaran) <> '');

UPDATE public.jadwal_pelajaran
SET mata_pelajaran = mapel
WHERE (mata_pelajaran IS NULL OR trim(mata_pelajaran) = '')
  AND (mapel IS NOT NULL AND trim(mapel) <> '');

-- 3. Trigger otomatis sinkronisasi dua arah antara mata_pelajaran dan mapel
CREATE OR REPLACE FUNCTION public.sync_jadwal_pelajaran_mapel()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.mata_pelajaran IS NOT NULL AND trim(NEW.mata_pelajaran) <> '')
       AND (NEW.mapel IS NULL OR trim(NEW.mapel) = '') THEN
        NEW.mapel := NEW.mata_pelajaran;
    ELSIF (NEW.mapel IS NOT NULL AND trim(NEW.mapel) <> '')
       AND (NEW.mata_pelajaran IS NULL OR trim(NEW.mata_pelajaran) <> '') THEN
        NEW.mata_pelajaran := NEW.mapel;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_jadwal_pelajaran_mapel ON public.jadwal_pelajaran;
CREATE TRIGGER trg_sync_jadwal_pelajaran_mapel
BEFORE INSERT OR UPDATE ON public.jadwal_pelajaran
FOR EACH ROW EXECUTE FUNCTION public.sync_jadwal_pelajaran_mapel();

-- 4. Perbarui fungsi validasi mata pelajaran agar aman menangani COALESCE
CREATE OR REPLACE FUNCTION public.check_jadwal_mapel_validity()
RETURNS TRIGGER AS $$
DECLARE
    v_mapel TEXT := COALESCE(NEW.mata_pelajaran, NEW.mapel, '');
BEGIN
    IF lower(trim(v_mapel)) ~* '\y(teknik|teknologi)\s+informasi\y|\yteknik\s+informatika\y|\ytek\s*info\y|\ytik\y' THEN
        RAISE EXCEPTION 'Mata pelajaran tidak valid: %. Gunakan mata pelajaran resmi seperti Informatika.', v_mapel;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_jadwal_mapel ON public.jadwal_pelajaran;
CREATE TRIGGER trg_validate_jadwal_mapel
BEFORE INSERT OR UPDATE ON public.jadwal_pelajaran
FOR EACH ROW EXECUTE FUNCTION public.check_jadwal_mapel_validity();

-- 5. REFRESH SCHEMA CACHE POSTGREST SECARA INSTAN
NOTIFY pgrst, 'reload schema';
