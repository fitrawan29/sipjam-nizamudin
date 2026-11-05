-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE PENGATURAN (guru_hanya_mengajar)
-- File: supabase/migrations/20261106_fix_pengaturan_guru_hanya_mengajar_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST204:
-- "Could not find the 'guru_hanya_mengajar' column of 'pengaturan' in the schema cache"
-- Terjadi ketika kolom guru_hanya_mengajar belum ditambahkan pada tabel pengaturan
-- atau PostgREST belum memuat ulang skema database ke memori cache PostgREST.
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

-- 1. Pastikan kolom-kolom ekstensi pada public.pengaturan tersedia (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pengaturan') THEN
        ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS jam_pulang_jumat TEXT DEFAULT '11:00';
        ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS guru_hanya_mengajar TEXT DEFAULT '[]';
        ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS aturan_kehadiran_guru TEXT DEFAULT 'Semua_Hari';
        ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS email_tujuan_upload TEXT;
    END IF;
END $$;

-- 2. Pastikan kolom wajib_hadir_hanya_mengajar pada public.data_guru tersedia (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_guru') THEN
        ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Backfill nilai default untuk row pengaturan jika ada yang NULL
UPDATE public.pengaturan
SET guru_hanya_mengajar = '[]'
WHERE guru_hanya_mengajar IS NULL;

UPDATE public.pengaturan
SET jam_pulang_jumat = '11:00'
WHERE jam_pulang_jumat IS NULL;

-- 4. REFRESH SCHEMA CACHE POSTGREST SECARA INSTAN
-- Mengirimkan sinyal NOTIFY ke listener internal PostgREST Supabase
-- agar schema cache dimuat ulang segera tanpa downtime.
NOTIFY pgrst, 'reload schema';
