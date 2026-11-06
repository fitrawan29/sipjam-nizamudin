-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE PRESENSI GURU (keterlambatan_detik)
-- File: supabase/migrations/20261106_fix_presensi_guru_keterlambatan_detik.sql
--
-- MASALAH:
-- Error PostgREST PGRST204:
-- "Could not find the 'keterlambatan_detik' column of 'presensi_guru' in the schema cache"
-- Terjadi ketika kolom keterlambatan_detik belum ditambahkan pada tabel presensi_guru
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

-- 1. Tambahkan kolom keterlambatan_detik pada public.presensi_guru (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'presensi_guru') THEN
        ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS keterlambatan_detik INTEGER DEFAULT NULL;
    END IF;
END $$;

-- 2. REFRESH SCHEMA CACHE POSTGREST SECARA INSTAN
-- Mengirimkan sinyal NOTIFY ke listener internal PostgREST Supabase
-- agar schema cache dimuat ulang segera tanpa downtime.
NOTIFY pgrst, 'reload schema';
