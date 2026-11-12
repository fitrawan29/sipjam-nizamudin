-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE DATA GURU (wajib_hadir_hanya_mengajar)
-- File: supabase/migrations/20261112_fix_data_guru_wajib_hadir_hanya_mengajar_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST204:
-- "Could not find the 'wajib_hadir_hanya_mengajar' column of 'data_guru' in the schema cache"
-- Terjadi ketika kolom wajib_hadir_hanya_mengajar belum ditambahkan pada tabel data_guru
-- (misalnya pada instance Supabase yang dibuat dari template awal atau migrasi sebelumnya)
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

-- 1. Pastikan kolom wajib_hadir_hanya_mengajar pada public.data_guru tersedia (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_guru') THEN
        ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE;
    END IF;
    -- Jika tabel public.guru juga tersedia (alias/legacy)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guru') THEN
        ALTER TABLE public.guru ADD COLUMN IF NOT EXISTS wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Pastikan kolom guru_hanya_mengajar pada public.pengaturan tersedia (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pengaturan') THEN
        ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS guru_hanya_mengajar TEXT DEFAULT '[]';
        ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS aturan_kehadiran_guru TEXT DEFAULT 'Semua_Hari';
    END IF;
END $$;

-- 3. Backfill nilai default agar tidak ada yang bernilai NULL
UPDATE public.data_guru
SET wajib_hadir_hanya_mengajar = FALSE
WHERE wajib_hadir_hanya_mengajar IS NULL;

-- 4. Sinkronisasi data awal dari pengaturan.guru_hanya_mengajar ke data_guru jika ada
DO $$
DECLARE
    r RECORD;
    t_id TEXT;
    ghm_json JSONB;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pengaturan') THEN
        FOR r IN SELECT value FROM public.pengaturan WHERE key = 'guru_hanya_mengajar' AND value IS NOT NULL AND trim(value) <> '' LOOP
            BEGIN
                ghm_json := r.value::jsonb;
                IF jsonb_typeof(ghm_json) = 'array' THEN
                    FOR t_id IN SELECT jsonb_array_elements_text(ghm_json) LOOP
                        -- Coba match ke data_guru berdasarkan id (UUID) atau nip atau nama
                        UPDATE public.data_guru
                        SET wajib_hadir_hanya_mengajar = TRUE
                        WHERE (id::text = t_id OR nip = t_id OR nama_guru = t_id);
                    END LOOP;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Abaikan jika JSON tidak valid
                NULL;
            END;
        END LOOP;
    END IF;
END $$;

-- 5. REFRESH SCHEMA CACHE POSTGREST SECARA INSTAN
-- Mengirimkan sinyal NOTIFY ke listener internal PostgREST Supabase
-- agar schema cache dimuat ulang segera tanpa downtime.
NOTIFY pgrst, 'reload schema';
