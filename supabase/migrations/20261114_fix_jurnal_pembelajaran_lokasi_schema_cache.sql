-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE JURNAL PEMBELAJARAN (lokasi & lokasi_kbm)
-- File: supabase/migrations/20261114_fix_jurnal_pembelajaran_lokasi_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST204:
-- "Could not find the 'lokasi' column of 'jurnal_pembelajaran' in the schema cache"
-- Terjadi ketika kolom 'lokasi' atau 'lokasi_kbm' belum ditambahkan pada tabel public.jurnal_pembelajaran
-- (misalnya pada instance database sekolah yang diinisialisasi dari skema terdahulu)
-- atau ketika PostgREST belum memuat ulang skema database ke memori cache.
--
-- SOLUSI LENGKAP:
-- 1. Tambahkan kolom lokasi TEXT, lokasi_kbm TEXT, dan kolom pelengkap secara idempotent.
-- 2. Sinkronkan nilai dua arah (backfill) antara kolom lokasi dan lokasi_kbm.
-- 3. Pasang trigger otomatis sinkronisasi dua arah untuk menjamin konsistensi data.
-- 4. Berikan hak akses tabel (GRANT ALL).
-- 5. Jalankan NOTIFY pgrst, 'reload schema' untuk memuat ulang schema cache PostgREST seketika.
-- ============================================================================

-- 1. Pastikan kolom lokasi, lokasi_kbm, dan kolom pelengkap tersedia secara idempotent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jurnal_pembelajaran') THEN
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS lokasi TEXT;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS waktu_upload TEXT;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS kktp TEXT;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS konten TEXT;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS kegiatan_pembelajaran TEXT;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS catatan_khusus_siswa TEXT;
    END IF;
END $$;

-- 2. Backfill data historis: sinkronkan lokasi dan lokasi_kbm
UPDATE public.jurnal_pembelajaran
SET lokasi = lokasi_kbm
WHERE (lokasi IS NULL OR trim(lokasi) = '' OR trim(lokasi) = '-')
  AND (lokasi_kbm IS NOT NULL AND trim(lokasi_kbm) <> '' AND trim(lokasi_kbm) <> '-');

UPDATE public.jurnal_pembelajaran
SET lokasi_kbm = lokasi
WHERE (lokasi_kbm IS NULL OR trim(lokasi_kbm) = '' OR trim(lokasi_kbm) = '-')
  AND (lokasi IS NOT NULL AND trim(lokasi) <> '' AND trim(lokasi) <> '-');

-- 3. Trigger otomatis sinkronisasi dua arah antara lokasi dan lokasi_kbm
CREATE OR REPLACE FUNCTION public.sync_jurnal_pembelajaran_lokasi()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.lokasi_kbm IS NOT NULL AND trim(NEW.lokasi_kbm) <> '' AND trim(NEW.lokasi_kbm) <> '-')
       AND (NEW.lokasi IS NULL OR trim(NEW.lokasi) = '' OR trim(NEW.lokasi) = '-') THEN
        NEW.lokasi := NEW.lokasi_kbm;
    ELSIF (NEW.lokasi IS NOT NULL AND trim(NEW.lokasi) <> '' AND trim(NEW.lokasi) <> '-')
       AND (NEW.lokasi_kbm IS NULL OR trim(NEW.lokasi_kbm) = '' OR trim(NEW.lokasi_kbm) = '-') THEN
        NEW.lokasi_kbm := NEW.lokasi;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_jurnal_pembelajaran_lokasi ON public.jurnal_pembelajaran;
CREATE TRIGGER trg_sync_jurnal_pembelajaran_lokasi
BEFORE INSERT OR UPDATE ON public.jurnal_pembelajaran
FOR EACH ROW EXECUTE FUNCTION public.sync_jurnal_pembelajaran_lokasi();

-- 4. Hak akses tabel
GRANT ALL ON public.jurnal_pembelajaran TO anon, authenticated, service_role;

-- 5. Memuat ulang schema cache PostgREST seketika
NOTIFY pgrst, 'reload schema';
