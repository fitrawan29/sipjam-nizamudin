-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE JURNAL PEMBELAJARAN (kegiatan_pembelajaran)
-- File: supabase/migrations/20261112_fix_jurnal_pembelajaran_kegiatan_pembelajaran_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST204:
-- "Could not find the 'kegiatan_pembelajaran' column of 'jurnal_pembelajaran' in the schema cache"
-- Terjadi ketika kolom 'kegiatan_pembelajaran' belum ditambahkan pada tabel public.jurnal_pembelajaran
-- (misalnya instance database Supabase yang dibuat dari skema awal / migrasi 8 kolom terdahulu
-- yang hanya memiliki kolom 'kegiatan') atau PostgREST belum memuat ulang skema database ke memori cache.
--
-- SOLUSI LENGKAP:
-- 1. Tambahkan kolom kegiatan_pembelajaran TEXT dan materi_kegiatan TEXT secara idempotent.
-- 2. Sinkronkan nilai dua arah (backfill) antara kolom kegiatan dan kegiatan_pembelajaran.
-- 3. Pasang trigger otomatis sinkronisasi dua arah untuk menjamin konsistensi data legacy & modern.
-- 4. Berikan hak akses tabel (GRANT ALL).
-- 5. Jalankan NOTIFY pgrst, 'reload schema' untuk memuat ulang schema cache PostgREST seketika.
--
-- PANDUAN EKSEKUSI DI SUPABASE SQL EDITOR:
-- 1. Buka Supabase Dashboard proyek Anda (https://supabase.com/dashboard/project/<project-ref>).
-- 2. Pada panel navigasi sebelah kiri, klik menu "SQL Editor".
-- 3. Klik tombol "+ New Query".
-- 4. Salin (copy) seluruh isi file script SQL ini dan tempel (paste) ke editor.
-- 5. Klik tombol "Run" (atau tekan Ctrl + Enter).
-- 6. Status akan menunjukkan "Success. No rows returned".
-- 7. Perintah NOTIFY pgrst, 'reload schema' di baris terakhir akan secara otomatis
--    merefresh PostgREST schema cache tanpa perlu me-restart instance database.
-- ============================================================================

-- 1. Pastikan kolom kegiatan_pembelajaran dan materi_kegiatan tersedia secara idempotent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jurnal_pembelajaran') THEN
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS kegiatan_pembelajaran TEXT;
        ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS materi_kegiatan TEXT;
    END IF;
END $$;

-- 2. Backfill data historis: sinkronkan kegiatan dan kegiatan_pembelajaran
UPDATE public.jurnal_pembelajaran
SET kegiatan_pembelajaran = kegiatan
WHERE (kegiatan_pembelajaran IS NULL OR trim(kegiatan_pembelajaran) = '')
  AND (kegiatan IS NOT NULL AND trim(kegiatan) <> '');

UPDATE public.jurnal_pembelajaran
SET kegiatan = kegiatan_pembelajaran
WHERE (kegiatan IS NULL OR trim(kegiatan) = '')
  AND (kegiatan_pembelajaran IS NOT NULL AND trim(kegiatan_pembelajaran) <> '');

-- 3. Trigger otomatis sinkronisasi dua arah antara kegiatan dan kegiatan_pembelajaran
CREATE OR REPLACE FUNCTION public.sync_jurnal_pembelajaran_kegiatan()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.kegiatan IS NOT NULL AND trim(NEW.kegiatan) <> '')
       AND (NEW.kegiatan_pembelajaran IS NULL OR trim(NEW.kegiatan_pembelajaran) = '') THEN
        NEW.kegiatan_pembelajaran := NEW.kegiatan;
    ELSIF (NEW.kegiatan_pembelajaran IS NOT NULL AND trim(NEW.kegiatan_pembelajaran) <> '')
       AND (NEW.kegiatan IS NULL OR trim(NEW.kegiatan) = '') THEN
        NEW.kegiatan := NEW.kegiatan_pembelajaran;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_jurnal_pembelajaran_kegiatan ON public.jurnal_pembelajaran;
CREATE TRIGGER trg_sync_jurnal_pembelajaran_kegiatan
BEFORE INSERT OR UPDATE ON public.jurnal_pembelajaran
FOR EACH ROW EXECUTE FUNCTION public.sync_jurnal_pembelajaran_kegiatan();

-- 4. Hak akses tabel
GRANT ALL ON public.jurnal_pembelajaran TO anon, authenticated, service_role;

-- 5. Memuat ulang schema cache PostgREST seketika
NOTIFY pgrst, 'reload schema';
